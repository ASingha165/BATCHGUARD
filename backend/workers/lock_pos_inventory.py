"""Step Functions task worker: Simulates automated POS scan-blocking and digital hold orders."""

from typing import Any, Dict
from backend.common.logger import get_logger

logger = get_logger("batchguard.workers.lock_pos")


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Locks POS barcode registers and applies EDI 940 warehouse hold commands."""
    recall_id = event.get("recallId")
    batch_id = event.get("batchId")

    logger.info(f"Broadcasted POS scan-block for batch {batch_id} (Recall {recall_id})")

    return {
        **event,
        "posScanBlockEnforced": True,
        "ediHoldOrdersDispatched": True,
    }

