"""Standardized API Gateway proxy integration response utilities."""

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token",
}


def build_response(
    status_code: int,
    data: Optional[Any] = None,
    error: Optional[Dict[str, Any]] = None,
    request_id: str = "local-dev",
    custom_headers: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    """Formats an API Gateway proxy response adhering to AGENTS.md envelope standards."""
    headers = {**CORS_HEADERS, **(custom_headers or {})}

    body = {
        "success": 200 <= status_code < 300,
        "data": data,
        "error": error,
        "meta": {
            "requestId": request_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    }

    return {
        "statusCode": status_code,
        "headers": headers,
        "body": json.dumps(body, default=str),
    }


def success_response(data: Any, status_code: int = 200, request_id: str = "local-dev") -> Dict[str, Any]:
    """Helper for successful responses."""
    return build_response(status_code=status_code, data=data, error=None, request_id=request_id)


def error_response(
    code: str,
    message: str,
    status_code: int = 400,
    details: Optional[List[Any]] = None,
    request_id: str = "local-dev",
) -> Dict[str, Any]:
    """Helper for structured error responses."""
    error = {
        "code": code,
        "message": message,
        "details": details or [],
    }
    return build_response(status_code=status_code, data=None, error=error, request_id=request_id)

