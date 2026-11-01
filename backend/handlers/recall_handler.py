"""Lambda handler for Recall Operations and Blast Radius API Gateway endpoints."""

import json
from typing import Any, Dict
from pydantic import ValidationError as PydanticValidationError
from backend.common.auth import enforce_tenant_boundary, extract_auth_context, require_role
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
    """Routes incoming HTTP requests to Recall Service operations with server-side authorization."""
    request_id = getattr(context, "aws_request_id", "local-dev")
    http_method = event.get("httpMethod", "POST")
    path = event.get("path", "/v1/recalls")
    path_parameters = event.get("pathParameters") or {}
    query_parameters = event.get("queryStringParameters") or {}

    logger.info(f"Incoming {http_method} request to {path}", extra={"request_id": request_id})

    try:
        # Extract and verify caller identity from trusted context
        auth = extract_auth_context(event)

        # Cross-tenant boundary check if client passed an orgId parameter
        client_org = query_parameters.get("orgId")
        enforce_tenant_boundary(auth, client_org)

        # Route 1: POST /v1/recalls/assess-blast-radius
        if http_method == "POST" and path.endswith("/assess-blast-radius"):
            raw_body = json.loads(event.get("body") or "{}")
            req = BlastRadiusRequest(**raw_body)
            blast_data = recall_service.assess_blast_radius(req.batchId, org_id=auth.org_id)
            return success_response(data=blast_data, request_id=request_id)

        # Route 2: POST /v1/recalls/initiate
        if http_method == "POST" and path.endswith("/initiate"):
            # Enforce server-side RBAC: Only authorized compliance officers or admins may initiate recalls
            require_role(auth, ["COMPLIANCE_OFFICER", "ADMIN"])

            raw_body = json.loads(event.get("body") or "{}")
            req = InitiateRecallRequest(**raw_body)
            new_recall = recall_service.initiate_recall(
                req,
                org_id=auth.org_id,
                user_email=auth.user_email,
            )
            return success_response(data=new_recall, status_code=201, request_id=request_id)

        # Route 3: POST /v1/recalls/{recallId}/acknowledge
        if http_method == "POST" and path.endswith("/acknowledge"):
            recall_id = path_parameters.get("recallId") or path.split("/")[-2]
            raw_body = json.loads(event.get("body") or "{}")
            req = AcknowledgeRecallRequest(**raw_body)
            ack_res = recall_service.acknowledge_recall(recall_id, req, org_id=auth.org_id)
            return success_response(data=ack_res, request_id=request_id)

        # Route 4: GET /v1/recalls/{recallId}/acknowledgements
        if http_method == "GET" and path.endswith("/acknowledgements"):
            recall_id = path_parameters.get("recallId") or path.split("/")[-2]
            acks = recall_service.get_acknowledgements(recall_id, org_id=auth.org_id)
            return success_response(data={"acknowledgements": acks}, request_id=request_id)

        # Route 5: GET /v1/recalls/{recallId}
        if http_method == "GET" and path_parameters.get("recallId"):
            recall_id = path_parameters["recallId"]
            recall = recall_service.get_recall(recall_id, org_id=auth.org_id)
            return success_response(data=recall, request_id=request_id)

        # Route 6: GET /v1/recalls
        if http_method == "GET":
            recalls = recall_service.list_recalls(org_id=auth.org_id)
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
