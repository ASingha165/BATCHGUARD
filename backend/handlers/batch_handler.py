"""Lambda handler for Batch and Lineage API Gateway endpoints."""

import json
from typing import Any, Dict
from pydantic import ValidationError as PydanticValidationError
from backend.common.exceptions import BatchGuardException
from backend.common.logger import get_logger
from backend.common.response import error_response, success_response
from backend.models.schemas import CreateBatchRequest
from backend.services.batch_service import BatchService

logger = get_logger("batchguard.handlers.batch")
batch_service = BatchService()


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Routes incoming HTTP requests to Batch Service operations."""
    request_id = getattr(context, "aws_request_id", "local-dev")
    http_method = event.get("httpMethod", "GET")
    path = event.get("path", "/v1/batches")
    path_parameters = event.get("pathParameters") or {}

    logger.info(f"Incoming {http_method} request to {path}", extra={"request_id": request_id})

    try:
        # Route 1: GET /v1/batches/{batchId}/lineage (or /v1/batches/{batchId}/traceability)
        if http_method == "GET" and (path.endswith("/lineage") or path.endswith("/traceability")):
            batch_id = path_parameters.get("batchId") or path.split("/")[-2]
            lineage_data = batch_service.get_lineage(batch_id)
            return success_response(data=lineage_data, request_id=request_id)

        # Route 2: GET /v1/batches/{batchId}
        if http_method == "GET" and path_parameters.get("batchId"):
            batch_id = path_parameters["batchId"]
            batch_data = batch_service.get_batch(batch_id)
            return success_response(data=batch_data, request_id=request_id)

        # Route 3: GET /v1/batches
        if http_method == "GET":
            batches, last_key = batch_service.list_batches()
            return success_response(
                data={"batches": batches, "paginationKey": last_key},
                request_id=request_id,
            )

        # Route 4: POST /v1/batches
        if http_method == "POST":
            raw_body = json.loads(event.get("body") or "{}")
            req_model = CreateBatchRequest(**raw_body)
            created_batch = batch_service.create_batch(req_model)
            return success_response(data=created_batch, status_code=201, request_id=request_id)

        return error_response(
            code="METHOD_NOT_ALLOWED",
            message=f"HTTP method {http_method} not supported on {path}.",
            status_code=405,
            request_id=request_id,
        )

    except PydanticValidationError as e:
        return error_response(
            code="VALIDATION_ERROR",
            message="Request body failed schema validation.",
            details=e.errors(),
            status_code=400,
            request_id=request_id,
        )
    except BatchGuardException as e:
        return error_response(
            code=e.code,
            message=e.message,
            status_code=e.status_code,
            details=e.details,
            request_id=request_id,
        )
    except Exception as e:
        logger.error(f"Unhandled server error: {e}", exc_info=True)
        return error_response(
            code="INTERNAL_SERVER_ERROR",
            message="An unexpected server error occurred.",
            status_code=500,
            request_id=request_id,
        )
