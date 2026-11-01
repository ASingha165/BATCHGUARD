"""Step Functions task worker: Calculates blast radius for targeted recall."""

from typing import Any, Dict
from backend.common.config import config
from backend.common.logger import get_logger
from backend.services.recall_service import RecallService

logger = get_logger("batchguard.workers.blast_radius")
recall_service = RecallService()


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Evaluates impacted facilities and units at risk via the Traceability Engine."""
    batch_id = event.get("batchId")
    org_id = event.get("orgId", config.default_org_id)
    hazard_class = event.get("hazardClass", "CLASS_I_CRITICAL")

    logger.info(f"Step Functions task: Computing blast radius for batch {batch_id} in org {org_id}")

    blast_result = recall_service.assess_blast_radius(batch_id, org_id=org_id, hazard_class=hazard_class)

    return {
        **event,
        "blastRadius": blast_result,
        "totalUnitsAtRisk": blast_result.get("totalUnitsAtRisk", 0),
        "impactedNodes": blast_result.get("impactedNodes", []),
        "impactedNodesCount": len(blast_result.get("impactedNodes", [])),
        "unconfirmedUnits": blast_result.get("unconfirmedUnits", 0),
        "knownRemainingUnits": blast_result.get("knownRemainingUnits", 0),
        "confirmedSoldUnits": blast_result.get("confirmedSoldUnits", 0),
    }
