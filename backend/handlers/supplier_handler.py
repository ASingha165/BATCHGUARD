"""Lambda handler for Supplier Directory API Gateway endpoints."""

import json
from typing import Any, Dict
from pydantic import ValidationError as PydanticValidationError
from backend.common.exceptions import BatchGuardException
from backend.common.logger import get_logger
from backend.common.response import error_response, success_response
from backend.models.schemas import CreateSupplierRequest
from backend.services.supplier_service import SupplierService

logger = get_logger("batchguard.handlers.supplier")
supplier_service = SupplierService()


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Routes incoming HTTP requests to Supplier Service operations."""
    request_id = getattr(context, "aws_request_id", "local-dev")
    http_method = event.get("httpMethod", "GET")
    path = event.get("path", "/v1/suppliers")
    path_parameters = event.get("pathParameters") or {}

    logger.info(f"Incoming {http_method} request to {path}", extra={"request_id": request_id})

    try:
        # Route 1: GET /v1/suppliers/{supplierId}
        if http_method == "GET" and path_parameters.get("supplierId"):
            supplier_id = path_parameters["supplierId"]
            supplier = supplier_service.get_supplier(supplier_id)
            return success_response(data=supplier, request_id=request_id)

        # Route 2: GET /v1/suppliers
        if http_method == "GET":
            suppliers = supplier_service.list_suppliers()
            return success_response(data={"suppliers": suppliers}, request_id=request_id)

        # Route 3: POST /v1/suppliers
        if http_method == "POST":
            raw_body = json.loads(event.get("body") or "{}")
            req = CreateSupplierRequest(**raw_body)
            created = supplier_service.create_supplier(req)
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
