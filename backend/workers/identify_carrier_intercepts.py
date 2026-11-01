"""Step Functions task worker: Identifies and flags in-transit shipments for urgent carrier interception."""

from datetime import datetime, timezone
from typing import Any, Dict
from backend.common.config import config
from backend.common.db import db_client
from backend.common.logger import get_logger

logger = get_logger("batchguard.workers.carrier_intercepts")


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Identifies carrier transit fleet nodes requiring emergency line-haul re-routing."""
    recall_id = event.get("recallId")
    batch_id = event.get("batchId")
    org_id = event.get("orgId", config.default_org_id)
    impacted_nodes = event.get("impactedNodes", [])

    carrier_nodes = [
        n for n in impacted_nodes
        if n.get("nodeType") in ["LOGISTICS_CARRIER", "TRANSIT_FLEET"]
    ]

    logger.info(f"Step Functions task: Flagging {len(carrier_nodes)} carrier intercepts for recall {recall_id}")

    now = datetime.now(timezone.utc).isoformat()
    for carrier in carrier_nodes:
        node_id = carrier.get("nodeId")
        intercept_item = {
            "PK": f"RECALL#{recall_id}",
            "SK": f"INTERCEPT#{node_id}",
            "recallId": recall_id,
            "batchId": batch_id,
            "carrierNodeId": node_id,
            "carrierName": carrier.get("nodeName", "Carrier Fleet"),
            "location": carrier.get("location", "In Transit"),
            "allocatedUnits": carrier.get("remainingUnits") or carrier.get("shippedUnits", 0),
            "status": "INTERCEPT_ORDERED",
            "orderedAt": now,
        }
        db_client.put_item(intercept_item)

    return {
        **event,
        "carrierInterceptsOrdered": len(carrier_nodes),
        "carrierInterceptNodeIds": [c.get("nodeId") for c in carrier_nodes],
    }
