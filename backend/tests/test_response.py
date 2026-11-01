"""Unit tests for response envelope utilities."""

import json
from backend.common.response import error_response, success_response


def test_success_response():
    sample_data = {"batchId": "BG-2024-8891-ORG", "status": "RELEASED"}
    res = success_response(data=sample_data, status_code=200, request_id="req-123")

    assert res["statusCode"] == 200
    assert "Access-Control-Allow-Origin" in res["headers"]

    body = json.loads(res["body"])
    assert body["success"] is True
    assert body["data"]["batchId"] == "BG-2024-8891-ORG"
    assert body["error"] is None
    assert body["meta"]["requestId"] == "req-123"
    assert "timestamp" in body["meta"]


def test_error_response():
    res = error_response(
        code="VALIDATION_ERROR",
        message="Invalid batch ID provided.",
        status_code=400,
        details=["batchId must not be empty"],
        request_id="req-error-456",
    )

    assert res["statusCode"] == 400
    body = json.loads(res["body"])
    assert body["success"] is False
    assert body["data"] is None
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert body["error"]["message"] == "Invalid batch ID provided."
    assert len(body["error"]["details"]) == 1
    assert body["meta"]["requestId"] == "req-error-456"

