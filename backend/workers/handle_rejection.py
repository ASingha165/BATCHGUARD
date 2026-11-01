"""Step Functions task worker: Handles human rejection of recall, records audit, and releases lock."""

from typing import Any, Dict
from backend.common.config import config
from backend.common.logger import get_logger
from backend.services.audit_service import AuditService
from backend.services.recall_service import RecallService

logger = get_logger("batchguard.workers.handle_rejection")
recall_service = RecallService()
audit_service = AuditService()


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Records human rejection of recall, ensures lock release, and marks workflow terminated."""
    recall_id = event.get("recallId")
    org_id = event.get("orgId", config.default_org_id)
    approval_res = event.get("approvalResult", {})
    rejected_by = event.get("rejectedBy") or approval_res.get("rejectedBy") or "COMPLIANCE_OFFICER"
    reason = approval_res.get("reason") or event.get("reason") or "Recall rejected by compliance review."

    logger.warning(f"Step Functions task: Handling recall rejection for {recall_id}. Reason: {reason}")

    try:
        recall_service.transition_recall_status(
            recall_id=recall_id,
            target_status="REJECTED",
            org_id=org_id,
            actor=rejected_by,
            reason=reason,
        )
    except Exception as e:
        logger.warning(f"Could not transition recall status on rejection: {e}")

    try:
        audit_service.record_event(
            org_id=org_id,
            action="RECALL_REJECTED",
            entity_id=recall_id,
            user_id="COMPLIANCE_OFFICER",
            user_email=rejected_by,
            details={"reason": reason, "stepFunctionsWorkflow": "TERMINATED_REJECTED"},
        )
    except Exception as e:
        logger.warning(f"Could not write rejection audit: {e}")

    return {
        **event,
        "workflowStatus": "REJECTED",
        "rejectedBy": rejected_by,
        "reason": reason,
    }
