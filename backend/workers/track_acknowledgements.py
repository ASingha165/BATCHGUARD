"""Step Functions task worker: Tracks facility acknowledgements and computes response ledger."""

from typing import Any, Dict
from backend.common.config import config
from backend.common.logger import get_logger
from backend.services.recall_service import RecallService

logger = get_logger("batchguard.workers.track_acknowledgements")
recall_service = RecallService()


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Evaluates acknowledgement status across all impacted facilities for the recall."""
    recall_id = event.get("recallId")
    org_id = event.get("orgId", config.default_org_id)

    summary = recall_service.get_acknowledgement_summary(recall_id, org_id=org_id)
    logger.info(
        f"Step Functions task: Recall {recall_id} acknowledgement status: "
        f"{summary['acknowledgedCount']}/{summary['totalImpactedFacilities']} acknowledged."
    )

    return {
        **event,
        "acknowledgementSummary": summary,
        "allAcknowledged": summary.get("allAcknowledged", False),
    }
