"""Unit tests for Lambda handlers and API Gateway routing."""

import json
from unittest.mock import MagicMock, patch
from backend.handlers import (
    audit_handler,
    batch_handler,
    distribution_handler,
    evidence_handler,
    overview_handler,
    recall_handler,
    supplier_handler,
)


class DummyContext:
    aws_request_id = "test-request-id-12345"


def test_batch_handler_get_batches(mock_db):
    with patch("backend.handlers.batch_handler.batch_service.db", mock_db):
        event = {
            "httpMethod": "GET",
            "path": "/v1/batches",
        }
        res = batch_handler.lambda_handler(event, DummyContext())
        assert res["statusCode"] == 200
        body = json.loads(res["body"])
        assert body["success"] is True
        assert "batches" in body["data"]


def test_overview_handler_summary(mock_db):
    with patch("backend.handlers.overview_handler.db_client", mock_db):
        event = {
            "httpMethod": "GET",
            "path": "/v1/overview/summary",
        }
        res = overview_handler.lambda_handler(event, DummyContext())
        assert res["statusCode"] == 200
        body = json.loads(res["body"])
        assert body["success"] is True
        assert body["data"]["totalBatches"] >= 148920


def test_supplier_handler_get_suppliers(mock_db):
    with patch("backend.handlers.supplier_handler.supplier_service.db", mock_db):
        event = {
            "httpMethod": "GET",
            "path": "/v1/suppliers",
        }
        res = supplier_handler.lambda_handler(event, DummyContext())
        assert res["statusCode"] == 200
        body = json.loads(res["body"])
        assert body["success"] is True
        assert "suppliers" in body["data"]


def test_distribution_handler_get_nodes(mock_db):
    with patch("backend.handlers.distribution_handler.distribution_service.db", mock_db):
        event = {
            "httpMethod": "GET",
            "path": "/v1/distribution/nodes",
        }
        res = distribution_handler.lambda_handler(event, DummyContext())
        assert res["statusCode"] == 200
        body = json.loads(res["body"])
        assert body["success"] is True
        assert "nodes" in body["data"]


def test_audit_handler_get_logs(mock_db):
    with patch("backend.handlers.audit_handler.audit_service.db", mock_db):
        event = {
            "httpMethod": "GET",
            "path": "/v1/audit/logs",
        }
        res = audit_handler.lambda_handler(event, DummyContext())
        assert res["statusCode"] == 200
        body = json.loads(res["body"])
        assert body["success"] is True
        assert "logs" in body["data"]


def test_recall_handler_assess_blast_radius(mock_db):
    with patch("backend.handlers.recall_handler.recall_service.db", mock_db):
        event = {
            "httpMethod": "POST",
            "path": "/v1/recalls/assess-blast-radius",
            "body": json.dumps({"batchId": "BG-2024-8891-ORG"}),
        }
        res = recall_handler.lambda_handler(event, DummyContext())
        assert res["statusCode"] == 200
        body = json.loads(res["body"])
        assert body["success"] is True
        assert body["data"]["batchId"] == "BG-2024-8891-ORG"
        assert body["data"]["totalUnitsAtRisk"] == 4200


def test_recall_handler_approve_and_status(mock_db):
    mock_db.get_item.return_value = {
        "PK": "ORG#ORG-APEX-GLOBAL",
        "SK": "RECALL#REC-HANDLER-01",
        "recallId": "REC-HANDLER-01",
        "batchId": "BG-2024-8891-ORG",
        "orgId": "ORG-APEX-GLOBAL",
        "status": "PENDING_APPROVAL",
        "hazardClass": "CLASS_I_CRITICAL",
        "totalUnitsAtRisk": 4200,
        "createdAt": "2026-11-01T21:00:00Z",
    }
    with patch("backend.handlers.recall_handler.recall_service.db", mock_db):
        # 1. Approve
        approve_event = {
            "httpMethod": "POST",
            "path": "/v1/recalls/REC-HANDLER-01/approve",
            "pathParameters": {"recallId": "REC-HANDLER-01"},
            "headers": {"X-User-Roles": "COMPLIANCE_OFFICER"},
            "body": json.dumps({"notes": "Approved for emergency containment"}),
        }
        res = recall_handler.lambda_handler(approve_event, DummyContext())
        assert res["statusCode"] == 200
        body = json.loads(res["body"])
        assert body["success"] is True
        assert body["data"]["status"] == "APPROVED"

        # 2. Get Status
        status_event = {
            "httpMethod": "GET",
            "path": "/v1/recalls/REC-HANDLER-01/status",
            "pathParameters": {"recallId": "REC-HANDLER-01"},
        }
        res_status = recall_handler.lambda_handler(status_event, DummyContext())
        assert res_status["statusCode"] == 200
        body_status = json.loads(res_status["body"])
        assert body_status["success"] is True
        assert body_status["data"]["recallId"] == "REC-HANDLER-01"


