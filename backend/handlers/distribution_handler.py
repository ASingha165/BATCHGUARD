"""Lambda handler for Distribution and Logistics Network API Gateway endpoints."""

import json
from typing import Any, Dict
from pydantic import ValidationError as PydanticValidationError
from backend.common.exceptions import BatchGuardException
from backend.common.logger import get_logger
from backend.common.response import error_response, success_response
from backend.models.schemas import CreateDistributionNodeRequest
from backend.services.distribution_service import DistributionService

logger = get_logger("batchguard.handlers.distribution")
distribution_service = DistributionService()


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Routes incoming HTTP requests to Distribution Service operations."""
    request_id = getattr(context, "aws_request_id", "local-dev")
    http_method = event.get("httpMethod", "GET")
    path = event.get("path", "/v1/distribution/nodes")
    path_parameters = event.get("pathParameters") or {}

    logger.info(f"Incoming {http_method} request to {path}", extra={"request_id": request_id})

    try:
        # Route 1: GET /v1/distribution/nodes/{nodeId}
        if http_method == "GET" and path_parameters.get("nodeId"):
            node_id = path_parameters["nodeId"]
            node = distribution_service.get_node(node_id)
            return success_response(data=node, request_id=request_id)

        # Route 2: GET /v1/distribution/nodes or /v1/distribution
        if http_method == "GET":
            nodes = distribution_service.list_nodes()
            return success_response(data={"nodes": nodes}, request_id=request_id)

        # Route 3: POST /v1/distribution/nodes
        if http_method == "POST":
            raw_body = json.loads(event.get("body") or "{}")
            req = CreateDistributionNodeRequest(**raw_body)
            created = distribution_service.create_node(req)
            return success_response(data=created, status_code=201, request_id=request_id)

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
