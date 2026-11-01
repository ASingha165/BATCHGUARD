"""Immutable audit trail logging and cryptographic ledger service.

Implements a content-addressable SHA-256 hash chain where every audit log
entry cryptographically commits to the canonical JSON of its content and the
hash of the immediately preceding record in the organization's audit ledger.
"""

import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from backend.common.config import config
from backend.common.db import DynamoDBClient, db_client
from backend.common.logger import get_logger
from backend.models.schemas import RecordAuditLogRequest

logger = get_logger("batchguard.services.audit")

GENESIS_HASH = "0x" + "0" * 64
_seq_counter = 0


def canonical_json_bytes(data: Dict[str, Any]) -> bytes:
    """Produces a deterministic, canonical UTF-8 JSON representation for hashing."""
    return json.dumps(data, sort_keys=True, separators=(",", ":")).encode("utf-8")


def compute_hash(data: Dict[str, Any]) -> str:
    """Computes a hex-encoded SHA-256 hash digest with a 0x prefix."""
    return "0x" + hashlib.sha256(canonical_json_bytes(data)).hexdigest()


class AuditService:
    def __init__(self, db: Optional[DynamoDBClient] = None):
        self.db = db or db_client

    def _get_latest_audit_hash(self, org_id: str) -> str:
        """Retrieves the recordHash of the most recent audit entry for the tenant."""
        recent_entries = self.list_audit_events(org_id=org_id, limit=1, scan_index_forward=False)
        if recent_entries and len(recent_entries) > 0:
            latest = recent_entries[0]
            return latest.get("recordHash") or latest.get("cryptographicSignature") or GENESIS_HASH
        return GENESIS_HASH

    def record_audit_entry(
        self,
        payload: RecordAuditLogRequest,
        org_id: str = config.default_org_id,
    ) -> Dict[str, Any]:
        """Appends an immutable audit log record to DynamoDB linked to the previous record hash."""
        global _seq_counter
        _seq_counter += 1
        now = datetime.now(timezone.utc).isoformat()
        audit_id = f"AUD-{uuid.uuid4().hex[:6].upper()}"

        previous_hash = self._get_latest_audit_hash(org_id)

        audit_content = {
            "auditId": audit_id,
            "orgId": org_id,
            "timestamp": now,
            "sequenceNumber": _seq_counter,
            "eventType": payload.eventType,
            "actor": payload.actor,
            "targetResource": payload.targetResource,
            "actionSummary": payload.actionSummary,
            "details": payload.details or {},
            "previousHash": previous_hash,
        }

        # Deterministic SHA-256 integrity hash over canonical content
        record_hash = compute_hash(audit_content)

        audit_item = {
            "PK": f"ORG#{org_id}",
            "SK": f"AUDIT#{now}#{_seq_counter:08d}#{audit_id}",
            "GSI1PK": f"USER#{payload.actor}",
            "GSI1SK": f"AUDIT#{now}",
            **audit_content,
            "recordHash": record_hash,
            "cryptographicSignature": record_hash,  # Backward-compatible attribute name
            "hashAlgorithm": "SHA-256",
            "immutable": True,
            "createdAt": now,
        }

        self.db.conditional_put_item(
            item=audit_item,
            condition_expression="attribute_not_exists(PK) AND attribute_not_exists(SK)",
        )
        return audit_item

    def record_event(
        self,
        org_id: str,
        action: str,
        entity_id: str,
        user_id: str,
        user_email: str,
        details: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Appends an audit entry from internal workflows (e.g. Step Functions task workers)."""
        req = RecordAuditLogRequest(
            eventType=action,
            actor=user_email or user_id,
            targetResource=entity_id,
            actionSummary=f"{action} on {entity_id} by {user_email or user_id}",
            details=details or {},
        )
        item = self.record_audit_entry(req, org_id=org_id)
        return {
            "eventId": item["auditId"],
            "recordHash": item["recordHash"],
            "timestamp": item["timestamp"],
            **item,
        }

    def list_audit_events(
        self,
        org_id: str = config.default_org_id,
        limit: int = 50,
        scan_index_forward: bool = False,
    ) -> List[Dict[str, Any]]:
        """Queries immutable audit events in specified chronological order."""
        pk = f"ORG#{org_id}"
        items, _ = self.db.query_by_pk(
            pk=pk,
            sk_prefix="AUDIT#",
            limit=limit,
            scan_index_forward=scan_index_forward,
        )
        return items

    def verify_chain(self, org_id: str = config.default_org_id) -> Tuple[bool, List[str]]:
        """Verifies the complete SHA-256 hash chain for the given tenant organization.

        Detects:
        - Modified entry: Hash of canonical contents does not match stored recordHash.
        - Deleted entry: Chain discontinuity where entry's previousHash doesn't match predecessor.
        - Reordered entries: Broken previousHash pointer.
        - Invalid previous hash: Predecessor hash mismatch.
        """
        # Fetch entries in forward chronological order (oldest to newest)
        entries = self.list_audit_events(org_id=org_id, limit=500, scan_index_forward=True)
        if not entries:
            return True, []

        errors: List[str] = []
        expected_prev_hash = GENESIS_HASH

        for idx, entry in enumerate(entries):
            audit_id = entry.get("auditId", f"entry-{idx}")
            stored_hash = entry.get("recordHash") or entry.get("cryptographicSignature")
            actual_prev = entry.get("previousHash")

            # 1. Verify previous hash pointer
            if actual_prev != expected_prev_hash:
                errors.append(
                    f"Hash chain broken at index {idx} ({audit_id}): "
                    f"expected previousHash '{expected_prev_hash}', got '{actual_prev}'."
                )

            # 2. Re-compute hash from content fields
            reconstructed_content = {
                "auditId": entry.get("auditId"),
                "orgId": entry.get("orgId"),
                "timestamp": entry.get("timestamp"),
                "sequenceNumber": entry.get("sequenceNumber"),
                "eventType": entry.get("eventType"),
                "actor": entry.get("actor"),
                "targetResource": entry.get("targetResource"),
                "actionSummary": entry.get("actionSummary"),
                "details": entry.get("details", {}),
                "previousHash": actual_prev,
            }
            computed = compute_hash(reconstructed_content)
            if computed != stored_hash:
                errors.append(
                    f"Integrity tamper detected at index {idx} ({audit_id}): "
                    f"computed hash '{computed}' does not match stored hash '{stored_hash}'."
                )

            expected_prev_hash = stored_hash

        return len(errors) == 0, errors
