"""Immutable audit trail logging and cryptographic ledger service.

Implements a content-addressable SHA-256 hash chain with DynamoDB atomic
concurrency control and tamper/tail-truncation detection.
"""

import hashlib
import json
import random
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from boto3.dynamodb.types import TypeSerializer
from backend.common.config import config
from backend.common.db import DynamoDBClient, db_client
from backend.common.exceptions import IdempotencyConflictError
from backend.common.logger import get_logger
from backend.models.schemas import RecordAuditLogRequest

logger = get_logger("batchguard.services.audit")

GENESIS_HASH = "0x" + "0" * 64
_serializer = TypeSerializer()


def canonical_json_bytes(data: Dict[str, Any]) -> bytes:
    """Produces a deterministic, canonical UTF-8 JSON representation for hashing."""
    return json.dumps(data, sort_keys=True, separators=(",", ":")).encode("utf-8")


def compute_hash(data: Dict[str, Any]) -> str:
    """Computes a hex-encoded SHA-256 hash digest with a 0x prefix."""
    return "0x" + hashlib.sha256(canonical_json_bytes(data)).hexdigest()


def serialize_for_tx(item: Dict[str, Any]) -> Dict[str, Any]:
    """Converts a standard Python dictionary to low-level DynamoDB typed format."""
    return {k: _serializer.serialize(v) for k, v in item.items()}


class AuditService:
    def __init__(self, db: Optional[DynamoDBClient] = None):
        self.db = db or db_client

    def _get_ledger_head(self, org_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves the atomic audit ledger head for the tenant."""
        item = self.db.get_item(pk=f"ORG#{org_id}", sk="AUDIT_LEDGER_HEAD")
        if isinstance(item, dict):
            return item
        return None

    def _get_latest_audit_hash(self, org_id: str) -> Tuple[int, str]:
        """Retrieves the current sequenceNumber and recordHash for the tenant."""
        head = self._get_ledger_head(org_id)
        if head and "latestHash" in head:
            return int(head.get("latestSequenceNumber", 0)), str(head.get("latestHash", GENESIS_HASH))

        # Fallback: check if audit entries already exist
        recent_entries = self.list_audit_events(org_id=org_id, limit=1, scan_index_forward=False)
        if recent_entries and len(recent_entries) > 0:
            latest = recent_entries[0]
            seq = int(latest.get("sequenceNumber", 1))
            h = latest.get("recordHash") or latest.get("cryptographicSignature") or GENESIS_HASH
            return seq, h

        return 0, GENESIS_HASH

    def record_audit_entry(
        self,
        payload: RecordAuditLogRequest,
        org_id: str = config.default_org_id,
        max_retries: int = 5,
    ) -> Dict[str, Any]:
        """Appends an immutable audit log record to DynamoDB with atomic sequencing and retry on collision."""
        last_error = None

        for attempt in range(max_retries):
            current_seq, expected_prev_hash = self._get_latest_audit_hash(org_id)
            next_seq = current_seq + 1

            now = datetime.now(timezone.utc).isoformat()
            audit_id = f"AUD-{uuid.uuid4().hex[:6].upper()}"

            audit_content = {
                "auditId": audit_id,
                "orgId": org_id,
                "timestamp": now,
                "sequenceNumber": next_seq,
                "eventType": payload.eventType,
                "actor": payload.actor,
                "targetResource": payload.targetResource,
                "actionSummary": payload.actionSummary,
                "details": payload.details or {},
                "previousHash": expected_prev_hash,
            }

            # Deterministic SHA-256 integrity hash over canonical content
            record_hash = compute_hash(audit_content)

            audit_item = {
                "PK": f"ORG#{org_id}",
                "SK": f"AUDIT#{now}#{next_seq:08d}#{audit_id}",
                "GSI1PK": f"USER#{payload.actor}",
                "GSI1SK": f"AUDIT#{now}",
                **audit_content,
                "recordHash": record_hash,
                "cryptographicSignature": record_hash,
                "hashAlgorithm": "SHA-256",
                "immutable": True,
                "createdAt": now,
            }

            new_head = {
                "PK": f"ORG#{org_id}",
                "SK": "AUDIT_LEDGER_HEAD",
                "latestSequenceNumber": next_seq,
                "latestHash": record_hash,
                "latestAuditId": audit_id,
                "latestTimestamp": now,
                "updatedAt": now,
            }

            try:
                # Attempt atomic write using transact_write_items if real DynamoDBClient
                if isinstance(self.db, DynamoDBClient):
                    tx_items = [
                        {
                            "Put": {
                                "TableName": self.db.table_name,
                                "Item": serialize_for_tx(audit_item),
                                "ConditionExpression": "attribute_not_exists(PK) AND attribute_not_exists(SK)",
                            }
                        },
                        {
                            "Put": {
                                "TableName": self.db.table_name,
                                "Item": serialize_for_tx(new_head),
                                "ConditionExpression": (
                                    "attribute_not_exists(latestHash)"
                                    if expected_prev_hash == GENESIS_HASH
                                    else "latestHash = :prev_hash"
                                ),
                                **(
                                    {}
                                    if expected_prev_hash == GENESIS_HASH
                                    else {"ExpressionAttributeValues": {":prev_hash": _serializer.serialize(expected_prev_hash)}}
                                ),
                            }
                        },
                    ]
                    self.db.transact_write_items(tx_items)
                else:
                    # Standard conditional put + head update (supported across mocks)
                    self.db.conditional_put_item(
                        item=audit_item,
                        condition_expression="attribute_not_exists(PK) AND attribute_not_exists(SK)",
                    )
                    self.db.put_item(new_head)

                return audit_item

            except IdempotencyConflictError as e:
                # Concurrent write collided on HEAD or SK: back off with jitter and retry
                last_error = e
                logger.warning(
                    f"Concurrent audit write collision for org '{org_id}' on seq {next_seq} "
                    f"(attempt {attempt + 1}/{max_retries}). Retrying..."
                )
                time.sleep(0.01 * (2 ** attempt) + random.uniform(0.005, 0.015))
                continue

        raise IdempotencyConflictError(
            f"Failed to atomically commit audit log entry after {max_retries} attempts: {last_error}"
        )

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
        """Verifies the complete SHA-256 hash chain and validates against the atomic ledger head.

        Detects:
        - Modified entry: Hash of canonical contents does not match stored recordHash.
        - Deleted entry: Chain discontinuity where entry's previousHash doesn't match predecessor.
        - Reordered entries: Broken previousHash pointer.
        - Tail truncation: Discrepancy between ledger head sequence/hash and actual records.
        """
        entries = self.list_audit_events(org_id=org_id, limit=500, scan_index_forward=True)
        head = self._get_ledger_head(org_id)

        errors: List[str] = []

        if not entries:
            if head and head.get("latestSequenceNumber", 0) > 0:
                errors.append(
                    f"Tail truncation detected: ledger head records {head.get('latestSequenceNumber')} "
                    f"entries, but table contains 0 entries."
                )
                return False, errors
            return True, []

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

        # 3. Verify against atomic ledger head (Tail Truncation Detection)
        if head:
            head_seq = head.get("latestSequenceNumber")
            head_hash = head.get("latestHash")
            if head_seq is not None and len(entries) != head_seq:
                errors.append(
                    f"Tail truncation detected: ledger head indicates {head_seq} entries, "
                    f"but only {len(entries)} entries exist in ledger."
                )
            if head_hash is not None and entries[-1].get("recordHash") != head_hash:
                errors.append(
                    f"Tail hash mismatch: ledger head expects '{head_hash}', "
                    f"but last record has '{entries[-1].get('recordHash')}'."
                )

        return len(errors) == 0, errors
