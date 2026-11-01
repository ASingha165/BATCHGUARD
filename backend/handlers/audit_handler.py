"""Lambda handler for Immutable Audit Log API Gateway endpoints with tenant isolation."""

import json
from typing import Any, Dict
from pydantic import ValidationError as PydanticValidationError
from backend.common.auth import enforce_tenant_boundary, extract_auth_context, require_role
from backend.common.exceptions import BatchGuardException
from backend.common.logger import get_logger
from backend.common.response import error_response, success_response
from backend.models.schemas import RecordAuditLogRequest
from backend.services.audit_service import AuditService

logger = get_logger("batchguard.handlers.audit")
audit_service = AuditService()


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Routes incoming HTTP requests to Audit Service with strict tenant isolation."""
    request_id = getattr(context, "aws_request_id", "local-dev")
    http_method = event.get("httpMethod", "GET")
    path = event.get("path", "/v1/audit/logs")
    query_params = event.get("queryStringParameters") or {}

    logger.info(f"Incoming {http_method} request to {path}", extra={"request_id": request_id})

    try:
        # Extract and verify caller identity from trusted context
        auth = extract_auth_context(event)

        # Cross-tenant boundary check if client passed an orgId parameter
        client_org = query_params.get("orgId")
        enforce_tenant_boundary(auth, client_org)

        # Route 1: GET /v1/audit/verify or /v1/audit/logs/verify
        if http_method == "GET" and path.endswith("/verify"):
            # Enforce RBAC: Verification restricted to Compliance Officers, Auditors, and Admins
            require_role(auth, ["COMPLIANCE_OFFICER", "ADMIN", "AUDITOR", "QUALITY_ASSURANCE"])
            raw_limit = query_params.get("limit", 500)
            try:
                limit = min(max(int(raw_limit), 1), 1000)
            except (ValueError, TypeError):
                limit = 500

            is_valid, errors = audit_service.verify_chain(org_id=auth.org_id, limit=limit)
            return success_response(
                data={
                    "verified": is_valid,
                    "errors": errors,
                    "hashAlgorithm": "SHA-256",
                    "orgId": auth.org_id,
                    "entriesChecked": limit,
                },
                request_id=request_id,
            )

        # Route 2: GET /v1/audit/logs or /v1/audit-logs
        if http_method == "GET":
            raw_limit = query_params.get("limit", 50)
            try:
                limit = min(max(int(raw_limit), 1), 200)
            except (ValueError, TypeError):
                limit = 50
            logs = audit_service.list_audit_events(org_id=auth.org_id, limit=limit)
            return success_response(data={"logs": logs}, request_id=request_id)

        # Route 3: POST /v1/audit/logs
        if http_method == "POST":
            require_role(auth, ["COMPLIANCE_OFFICER", "ADMIN", "AUDITOR", "OPERATOR", "SYSTEM"])
            raw_body = json.loads(event.get("body") or "{}")
            req = RecordAuditLogRequest(**raw_body)
            # Enforce actor from authenticated context
            if req.actor != auth.user_email and req.actor != auth.user_id:
                req.actor = auth.user_email

            recorded = audit_service.record_audit_entry(req, org_id=auth.org_id)
            return success_response(data=recorded, status_code=201, request_id=request_id)

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
