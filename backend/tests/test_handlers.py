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

