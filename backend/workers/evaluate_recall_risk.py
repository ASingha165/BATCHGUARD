"""Step Functions task worker: Evaluates recall risk tier, unconfirmed stock risk, and carrier intercept requirements."""

from typing import Any, Dict
from backend.common.logger import get_logger

logger = get_logger("batchguard.workers.evaluate_risk")


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Analyzes blast radius metrics to determine operational criticality and required intercepts."""
    hazard_class = event.get("hazardClass", "CLASS_I_CRITICAL")
    unconfirmed = int(event.get("unconfirmedUnits", 0))
    impacted_nodes = event.get("impactedNodes", [])

    is_class_1 = hazard_class == "CLASS_I_CRITICAL"
    carrier_nodes = [
        n for n in impacted_nodes
        if n.get("nodeType") in ["LOGISTICS_CARRIER", "TRANSIT_FLEET"]
    ]

    criticality = "CRITICAL" if is_class_1 or unconfirmed > 1000 else "HIGH"

    logger.info(
        f"Step Functions task: Evaluated recall risk. Criticality: {criticality}, "
        f"Carrier nodes to intercept: {len(carrier_nodes)}, Unconfirmed units: {unconfirmed}"
    )

    return {
        **event,
        "criticality": criticality,
        "carrierInterceptRequired": len(carrier_nodes) > 0,
        "carrierNodesCount": len(carrier_nodes),
        "requiresImmediatePOSLock": is_class_1,
        "riskEvaluationComplete": True,
    }
