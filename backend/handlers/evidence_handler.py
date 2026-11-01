"""Lambda handler for S3 Evidence Vault pre-signed URL and retrieval endpoints."""

import json
from typing import Any, Dict
from pydantic import ValidationError as PydanticValidationError
from backend.common.exceptions import BatchGuardException
from backend.common.logger import get_logger
from backend.common.response import error_response, success_response
from backend.models.schemas import PresignedUrlRequest
from backend.services.evidence_service import EvidenceService

logger = get_logger("batchguard.handlers.evidence")
evidence_service = EvidenceService()


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Routes incoming HTTP requests to Evidence Service operations."""
    request_id = getattr(context, "aws_request_id", "local-dev")
    http_method = event.get("httpMethod", "GET")
    path = event.get("path", "/v1/evidence")
    query_params = event.get("queryStringParameters") or {}

    logger.info(f"Incoming {http_method} request to {path}", extra={"request_id": request_id})

    try:
        # Route 1: POST /v1/evidence/presigned-url
        if http_method == "POST" and path.endswith("/presigned-url"):
            raw_body = json.loads(event.get("body") or "{}")
            req = PresignedUrlRequest(**raw_body)
            result = evidence_service.generate_presigned_upload_url(req)
            return success_response(data=result, status_code=200, request_id=request_id)

        # Route 2: GET /v1/evidence
        if http_method == "GET":
            batch_id = query_params.get("batchId")
            docs = evidence_service.list_evidence(batch_id=batch_id)
            return success_response(data={"documents": docs}, request_id=request_id)

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
