"""Step Functions task worker: Handles approval timeout, fails workflow, and releases lock."""

from typing import Any, Dict
from backend.common.config import config
from backend.common.logger import get_logger
from backend.services.audit_service import AuditService
from backend.services.recall_service import RecallService

logger = get_logger("batchguard.workers.handle_timeout")
recall_service = RecallService()
audit_service = AuditService()


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handles Step Functions approval timeout. Does NOT auto-approve; marks recall FAILED."""
    recall_id = event.get("recallId")
    org_id = event.get("orgId", config.default_org_id)
    error = event.get("error", "Recall approval window expired without human sign-off.")

    logger.warning(f"Step Functions task: Recall {recall_id} approval window timed out. Marking FAILED.")

    try:
        recall_service.transition_recall_status(
            recall_id=recall_id,
            target_status="FAILED",
            org_id=org_id,
            actor="SYSTEM_STEP_FUNCTIONS",
            reason="APPROVAL_WINDOW_EXPIRED",
        )
    except Exception as e:
        logger.warning(f"Could not transition recall status on timeout: {e}")

    try:
        audit_service.record_event(
            org_id=org_id,
            action="RECALL_APPROVAL_TIMED_OUT",
            entity_id=recall_id,
            user_id="SYSTEM",
            user_email="system@batchguard.internal",
            details={"error": error, "workflowStatus": "TIMED_OUT"},
        )
    except Exception as e:
        logger.warning(f"Could not record timeout audit: {e}")

    return {
        **event,
        "workflowStatus": "TIMED_OUT",
        "error": "APPROVAL_TIMED_OUT",
    }
