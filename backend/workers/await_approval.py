"""Step Functions task worker: Stores the Step Functions callback TaskToken and awaits human approval."""

from typing import Any, Dict
from backend.common.config import config
from backend.common.logger import get_logger
from backend.services.recall_service import RecallService

logger = get_logger("batchguard.workers.await_approval")
recall_service = RecallService()


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Saves the Step Functions TaskToken on the recall record and pauses workflow pending human sign-off."""
    recall_id = event.get("recallId")
    task_token = event.get("taskToken")
    org_id = event.get("orgId", config.default_org_id)

    logger.info(f"Step Functions task: Pausing workflow for recall {recall_id} awaiting human approval.")

    if task_token:
        recall_service.save_task_token(
            recall_id=recall_id,
            task_token=task_token,
            org_id=org_id,
        )

    return {
        **event,
        "approvalStatus": "PENDING_APPROVAL",
    }
