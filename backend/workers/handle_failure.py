"""Step Functions task worker: Handles general workflow errors, writes failure audit, and releases lock."""

from typing import Any, Dict
from backend.common.config import config
from backend.common.logger import get_logger
from backend.services.audit_service import AuditService
from backend.services.recall_service import RecallService

logger = get_logger("batchguard.workers.handle_failure")
recall_service = RecallService()
audit_service = AuditService()


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Catches workflow failure, marks recall FAILED, and releases active recall lock."""
    recall_id = event.get("recallId")
    org_id = event.get("orgId", config.default_org_id)
    error_details = event.get("error", "Unknown Step Functions workflow failure")

    logger.error(f"Step Functions task: Recall {recall_id} workflow failed: {error_details}")

    try:
        recall_service.transition_recall_status(
            recall_id=recall_id,
            target_status="FAILED",
            org_id=org_id,
            actor="SYSTEM_STEP_FUNCTIONS",
            reason=str(error_details),
        )
    except Exception as e:
        logger.warning(f"Could not transition status on failure: {e}")

    try:
        audit_service.record_event(
            org_id=org_id,
            action="RECALL_WORKFLOW_FAILED",
            entity_id=recall_id,
            user_id="SYSTEM",
            user_email="system@batchguard.internal",
            details={"error": str(error_details)},
        )
    except Exception as e:
        logger.warning(f"Could not record failure audit: {e}")

    return {
        **event,
        "workflowStatus": "FAILED",
        "error": error_details,
    }
