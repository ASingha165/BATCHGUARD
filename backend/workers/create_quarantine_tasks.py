"""Step Functions task worker: Generates facility-specific quarantine task records in DynamoDB."""

from typing import Any, Dict
from backend.common.config import config
from backend.common.logger import get_logger
from backend.services.recall_service import RecallService

logger = get_logger("batchguard.workers.quarantine_tasks")
recall_service = RecallService()


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Generates discrete quarantine tasks for each impacted facility node in the blast radius."""
    recall_id = event.get("recallId")
    batch_id = event.get("batchId")
    org_id = event.get("orgId", config.default_org_id)
    impacted_nodes = event.get("impactedNodes", [])

    logger.info(f"Step Functions task: Creating quarantine tasks for recall {recall_id} across {len(impacted_nodes)} facilities.")

    tasks = recall_service.create_quarantine_tasks(
        recall_id=recall_id,
        batch_id=batch_id,
        impacted_nodes=impacted_nodes,
        org_id=org_id,
    )

    return {
        **event,
        "quarantineTasksCreated": len(tasks),
        "quarantineTaskIds": [t["taskId"] for t in tasks],
    }
