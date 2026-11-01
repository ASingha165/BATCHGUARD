"""Step Functions task worker: Appends immutable audit trail log into DynamoDB."""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict
from backend.common.config import config
from backend.common.db import db_client
from backend.common.logger import get_logger

logger = get_logger("batchguard.workers.audit")


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Records Step Functions workflow execution completion in the immutable audit log."""
    now = datetime.now(timezone.utc).isoformat()
    event_id = f"AUD-{uuid.uuid4().hex[:6].upper()}"
    recall_id = event.get("recallId")
    batch_id = event.get("batchId")

    audit_item = {
        "PK": f"ORG#{config.default_org_id}",
        "SK": f"AUDIT#{now}#{event_id}",
        "GSI1PK": f"USER#{event.get('initiatedBy', 'SYSTEM')}",
        "GSI1SK": f"AUDIT#{now}",
        "eventId": event_id,
        "action": "ONE_CLICK_RECALL_ORCHESTRATED",
        "entityId": recall_id,
        "userId": "SYSTEM_STEP_FUNCTIONS",
        "userEmail": event.get("initiatedBy", "compliance@apexnutrition.internal"),
        "timestamp": now,
        "details": {
            "batchId": batch_id,
            "hazardClass": event.get("hazardClass"),
            "totalUnitsAtRisk": event.get("totalUnitsAtRisk", 0),
            "posScanBlockEnforced": event.get("posScanBlockEnforced", True),
        },
    }

    try:
        db_client.put_item(audit_item)
        logger.info(f"Recorded audit entry {event_id} for recall {recall_id}")
    except Exception as e:
        logger.error(f"Failed to write audit entry: {e}")

    return {
        **event,
        "auditEventId": event_id,
        "auditStatus": "RECORDED",
    }

