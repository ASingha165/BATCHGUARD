"""Step Functions task worker: Calculates blast radius for targeted recall."""

from typing import Any, Dict
from backend.common.logger import get_logger
from backend.services.recall_service import RecallService

logger = get_logger("batchguard.workers.blast_radius")
recall_service = RecallService()


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Evaluates impacted facilities and units at risk."""
    batch_id = event.get("batchId")
    logger.info(f"Step Functions task: Computing blast radius for batch {batch_id}")

    blast_result = recall_service.assess_blast_radius(batch_id)
    return {
        **event,
        "blastRadius": blast_result,
        "totalUnitsAtRisk": blast_result["totalUnitsAtRisk"],
        "impactedNodesCount": len(blast_result["impactedNodes"]),
    }

