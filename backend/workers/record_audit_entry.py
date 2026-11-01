"""Step Functions task worker: Appends immutable cryptographically signed audit log into DynamoDB."""

from typing import Any, Dict
from backend.common.config import config
from backend.common.logger import get_logger
from backend.services.audit_service import AuditService

logger = get_logger("batchguard.workers.audit")
audit_service = AuditService()


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Records Step Functions workflow transition event in the immutable audit log."""
    recall_id = event.get("recallId")
    batch_id = event.get("batchId")
    org_id = event.get("orgId", config.default_org_id)
    actor = event.get("initiatedBy", "SYSTEM_STEP_FUNCTIONS")
    action = event.get("auditAction", "RECALL_WORKFLOW_ORCHESTRATED")

    details = {
        "batchId": batch_id,
        "hazardClass": event.get("hazardClass"),
        "totalUnitsAtRisk": event.get("totalUnitsAtRisk", 0),
        "quarantineTasksCreated": event.get("quarantineTasksCreated", 0),
        "carrierInterceptsOrdered": event.get("carrierInterceptsOrdered", 0),
        "notificationsDispatched": event.get("notificationsDispatched", False),
        "approvalStatus": event.get("approvalDecision", event.get("approvalStatus", "APPROVED")),
    }

    try:
        audit_res = audit_service.record_event(
            org_id=org_id,
            action=action,
            entity_id=recall_id,
            user_id="STEP_FUNCTIONS",
            user_email=actor,
            details=details,
            idempotency_key=f"SFN#{recall_id}#{action}",
        )
        logger.info(f"Recorded workflow audit entry {audit_res['eventId']} for recall {recall_id}")
        return {
            **event,
            "auditEventId": audit_res["eventId"],
            "auditStatus": "RECORDED",
        }
    except Exception as e:
        logger.error(f"Failed to record workflow audit entry: {e}")
        return {
            **event,
            "auditStatus": "FAILED",
            "auditError": str(e),
        }
