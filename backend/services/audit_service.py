"""Immutable audit trail logging and cryptographic ledger service."""

import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from backend.common.config import config
from backend.common.db import DynamoDBClient, db_client
from backend.common.logger import get_logger
from backend.models.schemas import RecordAuditLogRequest

logger = get_logger("batchguard.services.audit")


class AuditService:
    def __init__(self, db: Optional[DynamoDBClient] = None):
        self.db = db or db_client

    def record_audit_entry(
        self,
        payload: RecordAuditLogRequest,
        org_id: str = config.default_org_id,
    ) -> Dict[str, Any]:
        """Appends an immutable audit log record to DynamoDB with a SHA-256 integrity hash."""
        now = datetime.now(timezone.utc).isoformat()
        audit_id = f"AUD-{uuid.uuid4().hex[:6].upper()}"

        audit_content = {
            "auditId": audit_id,
            "orgId": org_id,
            "timestamp": now,
            "eventType": payload.eventType,
            "actor": payload.actor,
            "targetResource": payload.targetResource,
            "actionSummary": payload.actionSummary,
            "details": payload.details or {},
        }

        # Compute deterministic SHA-256 signature of canonical JSON
        canonical_str = json.dumps(audit_content, sort_keys=True)
        record_hash = "0x" + hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()

        audit_item = {
            "PK": f"ORG#{org_id}",
            "SK": f"AUDIT#{now}#{audit_id}",
            "GSI1PK": f"USER#{payload.actor}",
            "GSI1SK": f"AUDIT#{now}",
            **audit_content,
            "cryptographicSignature": record_hash,
            "immutable": True,
            "createdAt": now,
        }

        self.db.put_item(audit_item)
        return audit_item

    def list_audit_events(
        self,
        org_id: str = config.default_org_id,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Queries recent immutable audit events in reverse-chronological order."""
        pk = f"ORG#{org_id}"
        items, _ = self.db.query_by_pk(
            pk=pk,
            sk_prefix="AUDIT#",
            limit=limit,
            scan_index_forward=False,
        )
        return items
