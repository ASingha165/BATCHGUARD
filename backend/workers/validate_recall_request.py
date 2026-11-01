"""Step Functions task worker: Validates recall request and verifies batch existence and tenant boundary."""

from typing import Any, Dict
from backend.common.config import config
from backend.common.exceptions import ResourceNotFoundError
from backend.common.logger import get_logger
from backend.services.batch_service import BatchService

logger = get_logger("batchguard.workers.validate_request")
batch_service = BatchService()


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Validates that the batch to be recalled exists and belongs to the caller's organization."""
    batch_id = event.get("batchId")
    org_id = event.get("orgId", config.default_org_id)
    recall_id = event.get("recallId")

    logger.info(f"Step Functions task: Validating recall request {recall_id} for batch {batch_id}")

    batch = batch_service.get_batch(batch_id, org_id=org_id)
    if not batch:
        raise ResourceNotFoundError(f"Batch '{batch_id}' not found in organization '{org_id}'.")

    return {
        **event,
        "batchValidated": True,
        "productName": batch.get("productName"),
        "lotNumber": batch.get("lotNumber"),
        "initialQuantity": batch.get("initialQuantity", 0),
        "status": "VALIDATED",
    }
