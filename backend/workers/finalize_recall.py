"""Step Functions task worker: Finalizes recall workflow execution and updates recall status."""

from datetime import datetime, timezone
from typing import Any, Dict
from backend.common.config import config
from backend.common.logger import get_logger
from backend.services.recall_service import RecallService

logger = get_logger("batchguard.workers.finalize_recall")
recall_service = RecallService()


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Finalizes workflow execution and updates the recall to AWAITING_ACKNOWLEDGEMENTS."""
    recall_id = event.get("recallId")
    org_id = event.get("orgId", config.default_org_id)
    now = datetime.now(timezone.utc).isoformat()

    logger.info(f"Step Functions task: Finalizing workflow execution for recall {recall_id}")

    # Transition through state machine sequence: APPROVED -> EXECUTING -> NOTIFICATION_DISPATCHED -> AWAITING_ACKNOWLEDGEMENTS
    try:
        recall_service.transition_recall_status(
            recall_id=recall_id,
            target_status="APPROVED",
            org_id=org_id,
            actor="SYSTEM_STEP_FUNCTIONS",
        )
    except Exception:
        pass

    try:
        recall_service.transition_recall_status(
            recall_id=recall_id,
            target_status="EXECUTING",
            org_id=org_id,
            actor="SYSTEM_STEP_FUNCTIONS",
        )
    except Exception:
        pass

    try:
        recall_service.transition_recall_status(
            recall_id=recall_id,
            target_status="NOTIFICATION_DISPATCHED",
            org_id=org_id,
            actor="SYSTEM_STEP_FUNCTIONS",
        )
    except Exception:
        pass

    updated = recall_service.transition_recall_status(
        recall_id=recall_id,
        target_status="AWAITING_ACKNOWLEDGEMENTS",
        org_id=org_id,
        actor="SYSTEM_STEP_FUNCTIONS",
        extra_attrs={
            "orchestratedAt": now,
            "containmentActive": True,
        },
    )

    return {
        **event,
        "workflowCompleted": True,
        "finalStatus": updated.get("status"),
        "orchestratedAt": now,
    }
