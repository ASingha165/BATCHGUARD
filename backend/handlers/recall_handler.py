"""Lambda handler for Recall Operations and Blast Radius API Gateway endpoints."""

import json
from typing import Any, Dict
from pydantic import ValidationError as PydanticValidationError
from backend.common.exceptions import BatchGuardException
from backend.common.logger import get_logger
from backend.common.response import error_response, success_response
from backend.models.schemas import (
    AcknowledgeRecallRequest,
    BlastRadiusRequest,
    InitiateRecallRequest,
)
from backend.services.recall_service import RecallService

logger = get_logger("batchguard.handlers.recall")
recall_service = RecallService()


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Routes incoming HTTP requests to Recall Service operations."""
    request_id = getattr(context, "aws_request_id", "local-dev")
    http_method = event.get("httpMethod", "POST")
    path = event.get("path", "/v1/recalls")
    path_parameters = event.get("pathParameters") or {}

    logger.info(f"Incoming {http_method} request to {path}", extra={"request_id": request_id})

    try:
        # Route 1: POST /v1/recalls/assess-blast-radius
        if http_method == "POST" and path.endswith("/assess-blast-radius"):
            raw_body = json.loads(event.get("body") or "{}")
            req = BlastRadiusRequest(**raw_body)
            blast_data = recall_service.assess_blast_radius(req.batchId)
            return success_response(data=blast_data, request_id=request_id)

        # Route 2: POST /v1/recalls/initiate
        if http_method == "POST" and path.endswith("/initiate"):
            raw_body = json.loads(event.get("body") or "{}")
            req = InitiateRecallRequest(**raw_body)
            new_recall = recall_service.initiate_recall(req)
            return success_response(data=new_recall, status_code=201, request_id=request_id)

        # Route 3: POST /v1/recalls/{recallId}/acknowledge
        if http_method == "POST" and path.endswith("/acknowledge"):
            recall_id = path_parameters.get("recallId") or path.split("/")[-2]
            raw_body = json.loads(event.get("body") or "{}")
            req = AcknowledgeRecallRequest(**raw_body)
            ack_res = recall_service.acknowledge_recall(recall_id, req)
            return success_response(data=ack_res, request_id=request_id)

        # Route 4: GET /v1/recalls
        if http_method == "GET":
            recalls = recall_service.list_recalls()
            return success_response(data={"recalls": recalls}, request_id=request_id)

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

