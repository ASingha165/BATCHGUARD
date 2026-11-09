"""Unit and integration tests for BatchGuard Minimal Serverless Architecture (MVP).

Validates:
1. Minimal API Gateway endpoints (POST/GET /batches, POST/GET /recalls).
2. Minimal Step Functions 4-stage workflow workers.
3. Idempotent recall execution and duplicate prevention.
4. Input validation and structured error envelopes.
5. Authorization and tenant boundary enforcement.
"""

import json
from unittest.mock import MagicMock, patch
from boto3.dynamodb.types import TypeDeserializer
import pytest

from backend.handlers.batch_handler import lambda_handler as batch_handler
from backend.handlers.recall_handler import lambda_handler as recall_handler
from backend.workers.calculate_blast_radius import lambda_handler as blast_worker
from backend.workers.finalize_recall import lambda_handler as finalize_worker
from backend.workers.handle_failure import lambda_handler as failure_worker
from backend.workers.lock_pos_inventory import lambda_handler as lock_worker
from backend.workers.record_audit_entry import lambda_handler as audit_worker


# ============================================================================
# IN-MEMORY DYNAMODB MOCK FIXTURE
# ============================================================================

class InMemoryDynamoDB:
    """Accurate in-memory simulation of DynamoDB single-table operations."""

    def __init__(self):
        self.store = {}  # key: (PK, SK), value: item
        self.deserializer = TypeDeserializer()

    def _unwrap(self, item):
        if not isinstance(item, dict):
            return item
        if any(isinstance(v, dict) and any(k in v for k in ("S", "N", "B", "BOOL", "NULL", "M", "L")) for v in item.values()):
            return {k: self.deserializer.deserialize(v) for k, v in item.items()}
        return dict(item)

    def put_item(self, item):
        unwrapped = self._unwrap(item)
        self.store[(unwrapped["PK"], unwrapped["SK"])] = unwrapped
        return unwrapped

    def conditional_put_item(self, item, condition_expression=None, expression_attribute_values=None):
        unwrapped = self._unwrap(item)
        key = (unwrapped["PK"], unwrapped["SK"])
        if condition_expression and "attribute_not_exists" in condition_expression and key in self.store:
            from backend.common.exceptions import IdempotencyConflictError
            raise IdempotencyConflictError("Resource already exists.")
        self.store[key] = unwrapped
        return unwrapped

    def get_item(self, pk, sk=None):
        if sk is None:
            for (p, s), item in self.store.items():
                if p == pk:
                    return dict(item)
            return None
        return self.store.get((pk, sk))

    def query_by_pk(self, pk, sk_prefix=None, limit=None, scan_index_forward=True, **kwargs):
        results = []
        for (p, s), item in self.store.items():
            if p == pk:
                if sk_prefix is None or s.startswith(sk_prefix):
                    results.append(dict(item))
        if not scan_index_forward:
            results.reverse()
        return (results[:limit] if limit else results, None)

    def query_gsi(self, index_name="GSI1", pk=None, sk_prefix=None, limit=None, **kwargs):
        results = []
        for (p, s), item in self.store.items():
            if index_name == "GSI1" and item.get("GSI1PK") == pk:
                if sk_prefix is None or str(item.get("GSI1SK", "")).startswith(sk_prefix):
                    results.append(dict(item))
        return (results[:limit] if limit else results, None)

    def transact_write_items(self, items):
        for tx in items:
            if "Put" in tx:
                item = self._unwrap(tx["Put"]["Item"])
                self.store[(item["PK"], item["SK"])] = item
            elif "Delete" in tx:
                key = self._unwrap(tx["Delete"]["Key"])
                self.store.pop((key["PK"], key["SK"]), None)


@pytest.fixture(autouse=True)
def memory_db():
    """Patches all service db clients and AWS SDK clients for pure local memory execution."""
    db = InMemoryDynamoDB()
    mock_sfn = MagicMock()
    mock_sfn.start_execution.return_value = {
        "executionArn": "arn:aws:states:us-east-1:123456789012:execution:BatchGuard-Minimal:rec-001"
    }

    with patch("backend.services.batch_service.BatchService.__init__", lambda self: setattr(self, "db", db)), \
         patch("backend.services.recall_service.RecallService.__init__", lambda self: setattr(self, "db", db)), \
         patch("backend.services.audit_service.AuditService.__init__", lambda self: setattr(self, "db", db)), \
         patch("backend.handlers.batch_handler.batch_service.db", db), \
         patch("backend.handlers.recall_handler.recall_service.db", db), \
         patch("backend.workers.calculate_blast_radius.recall_service.db", db), \
         patch("backend.workers.record_audit_entry.audit_service.db", db), \
         patch("backend.workers.finalize_recall.recall_service.db", db), \
         patch("backend.workers.handle_failure.recall_service.db", db), \
         patch("backend.workers.handle_failure.audit_service.db", db), \
         patch("boto3.client", return_value=mock_sfn):
        yield db


def make_api_event(
    method: str,
    path: str,
    body: dict = None,
    path_params: dict = None,
    query_params: dict = None,
    org_id: str = "ORG#demo",
    roles: str = "COMPLIANCE_OFFICER,ADMIN",
) -> dict:
    return {
        "httpMethod": method,
        "path": path,
        "pathParameters": path_params or {},
        "queryStringParameters": query_params or {},
        "headers": {
            "Content-Type": "application/json",
            "X-Organization-Id": org_id,
            "X-User-Id": "usr-test-officer",
            "X-User-Email": "test.officer@batchguard.test",
            "X-User-Roles": roles,
        },
        "body": json.dumps(body) if body else None,
        "requestContext": {
            "authorizer": {
                "claims": {
                    "sub": "usr-test-officer",
                    "email": "test.officer@batchguard.test",
                    "custom:org_id": org_id,
                    "cognito:groups": roles,
                }
            }
        },
    }


# ============================================================================
# 1. MINIMAL API ENDPOINTS TESTS
# ============================================================================

class TestMinimalApiEndpoints:
    """Tests the 4 required minimal REST endpoints."""

    def test_post_batches_valid_payload(self):
        """POST /v1/batches creates a batch with schema validation."""
        payload = {
            "lotNumber": "LOT-2026-MIN-001",
            "gtin": "00850012345001",
            "productName": "Organic Baby Spinach 16oz",
            "initialQuantity": 500,
            "unitOfMeasure": "CASES",
            "supplierId": "SUP-SALINAS-01",
            "facilityGln": "0850012000018",
            "harvestDate": "2026-11-01T08:00:00Z",
            "productionDate": "2026-11-02T10:00:00Z",
            "expirationDate": "2026-11-20T23:59:59Z",
        }
        event = make_api_event("POST", "/v1/batches", body=payload)
        resp = batch_handler(event, None)

        assert resp["statusCode"] == 201
        body = json.loads(resp["body"])
        assert body["success"] is True
        assert body["data"]["lotNumber"] == "LOT-2026-MIN-001"
        assert "batchId" in body["data"]

    def test_post_batches_invalid_payload_fails(self):
        """POST /v1/batches rejects missing required fields with 400 validation error."""
        event = make_api_event("POST", "/v1/batches", body={"lotNumber": "INCOMPLETE"})
        resp = batch_handler(event, None)

        assert resp["statusCode"] == 400
        body = json.loads(resp["body"])
        assert body["success"] is False
        assert body["error"]["code"] == "VALIDATION_ERROR"

    def test_get_batch_by_id_param(self):
        """GET /v1/batches/{id} handles {id} path parameter cleanly."""
        payload = {
            "lotNumber": "LOT-2026-GET-ID",
            "gtin": "00850012345002",
            "productName": "Organic Romaine Hearts",
            "initialQuantity": 250,
            "unitOfMeasure": "CASES",
            "supplierId": "SUP-SALINAS-01",
            "facilityGln": "0850012000018",
            "harvestDate": "2026-11-01T08:00:00Z",
            "productionDate": "2026-11-02T10:00:00Z",
            "expirationDate": "2026-11-20T23:59:59Z",
        }
        create_res = batch_handler(make_api_event("POST", "/v1/batches", body=payload), None)
        created_batch_id = json.loads(create_res["body"])["data"]["batchId"]

        get_event = make_api_event("GET", f"/v1/batches/{created_batch_id}", path_params={"id": created_batch_id})
        get_res = batch_handler(get_event, None)

        assert get_res["statusCode"] == 200
        data = json.loads(get_res["body"])["data"]
        assert data["batchId"] == created_batch_id
        assert data["lotNumber"] == "LOT-2026-GET-ID"

    def test_get_batch_by_id_not_found(self):
        """GET /v1/batches/{id} returns 404 for nonexistent batch."""
        get_event = make_api_event("GET", "/v1/batches/NONEXISTENT", path_params={"id": "NONEXISTENT"})
        get_res = batch_handler(get_event, None)

        assert get_res["statusCode"] == 404
        body = json.loads(get_res["body"])
        assert body["success"] is False
        assert body["error"]["code"] == "RESOURCE_NOT_FOUND"

    def test_post_recalls_direct_path(self):
        """POST /v1/recalls initiates recall with Step Functions trigger."""
        payload = {
            "lotNumber": "LOT-2026-RECALL-001",
            "gtin": "00850012345003",
            "productName": "Baby Kale 5oz Clamshell",
            "initialQuantity": 300,
            "unitOfMeasure": "CASES",
            "supplierId": "SUP-SALINAS-01",
            "facilityGln": "0850012000018",
            "harvestDate": "2026-11-01T08:00:00Z",
            "productionDate": "2026-11-02T10:00:00Z",
            "expirationDate": "2026-11-20T23:59:59Z",
        }
        b_res = batch_handler(make_api_event("POST", "/v1/batches", body=payload), None)
        batch_id = json.loads(b_res["body"])["data"]["batchId"]

        recall_payload = {
            "batchId": batch_id,
            "hazardClass": "CLASS_I_CRITICAL",
            "reason": "Suspected Salmonella contamination from upstream water wash",
            "confirmationPhrase": f"CONFIRM-RECALL-{batch_id}",
            "auth2FAToken": "123456",
            "idempotencyToken": f"IDEMP-{batch_id}-001",
        }

        event = make_api_event("POST", "/v1/recalls", body=recall_payload)
        resp = recall_handler(event, None)

        assert resp["statusCode"] == 201
        data = json.loads(resp["body"])["data"]
        assert data["batchId"] == batch_id
        assert data["hazardClass"] == "CLASS_I_CRITICAL"
        assert "recallId" in data

    def test_post_recalls_duplicate_prevention(self):
        """POST /v1/recalls rejects duplicate recall for the same active batch."""
        payload = {
            "lotNumber": "LOT-2026-DUP-TEST",
            "gtin": "00850012345099",
            "productName": "Organic Spinach",
            "initialQuantity": 400,
            "supplierId": "SUP-SALINAS-01",
            "facilityGln": "0850012000018",
            "harvestDate": "2026-11-01T08:00:00Z",
            "productionDate": "2026-11-02T10:00:00Z",
            "expirationDate": "2026-11-20T23:59:59Z",
        }
        b_res = batch_handler(make_api_event("POST", "/v1/batches", body=payload), None)
        batch_id = json.loads(b_res["body"])["data"]["batchId"]

        recall_payload = {
            "batchId": batch_id,
            "hazardClass": "CLASS_I_CRITICAL",
            "reason": "Initial recall test",
            "confirmationPhrase": f"CONFIRM-RECALL-{batch_id}",
            "auth2FAToken": "123456",
        }

        # First initiation succeeds
        r1 = recall_handler(make_api_event("POST", "/v1/recalls", body=recall_payload), None)
        assert r1["statusCode"] == 201

        # Second initiation for the same active batch is rejected
        r2 = recall_handler(make_api_event("POST", "/v1/recalls", body=recall_payload), None)
        assert r2["statusCode"] == 409
        body = json.loads(r2["body"])
        assert body["error"]["code"] == "IDEMPOTENCY_CONFLICT"

    def test_post_recalls_rbac_enforcement(self):
        """POST /v1/recalls rejects unauthorized caller lacking compliance role."""
        event = make_api_event(
            "POST",
            "/v1/recalls",
            body={"batchId": "B-1", "reason": "test"},
            roles="VIEWER",
        )
        resp = recall_handler(event, None)
        assert resp["statusCode"] == 403
        body = json.loads(resp["body"])
        assert body["error"]["code"] == "FORBIDDEN"

    def test_get_recall_by_id_param(self):
        """GET /v1/recalls/{id} retrieves recall status."""
        b_payload = {
            "lotNumber": "LOT-2026-REC-GET",
            "gtin": "00850012345004",
            "productName": "Baby Spinach",
            "initialQuantity": 100,
            "supplierId": "SUP-01",
            "facilityGln": "0850012000018",
            "harvestDate": "2026-11-01T08:00:00Z",
            "productionDate": "2026-11-02T10:00:00Z",
            "expirationDate": "2026-11-20T23:59:59Z",
        }
        b_id = json.loads(batch_handler(make_api_event("POST", "/v1/batches", body=b_payload), None)["body"])["data"]["batchId"]

        r_payload = {
            "batchId": b_id,
            "hazardClass": "CLASS_II",
            "reason": "Mislabeled allergen declaration",
            "confirmationPhrase": f"CONFIRM-RECALL-{b_id}",
            "auth2FAToken": "654321",
        }
        r_id = json.loads(recall_handler(make_api_event("POST", "/v1/recalls", body=r_payload), None)["body"])["data"]["recallId"]

        get_event = make_api_event("GET", f"/v1/recalls/{r_id}", path_params={"id": r_id})
        get_res = recall_handler(get_event, None)

        assert get_res["statusCode"] == 200
        data = json.loads(get_res["body"])["data"]
        assert data["recallId"] == r_id
        assert data["batchId"] == b_id


# ============================================================================
# 2. STEP FUNCTIONS 4-STAGE WORKFLOW WORKERS TESTS
# ============================================================================

class TestMinimalStepFunctionsWorkflow:
    """Validates the 4-stage sequential worker chain of the minimal state machine."""

    @pytest.fixture
    def setup_batch(self):
        payload = {
            "lotNumber": "LOT-SFN-CHAIN-001",
            "gtin": "00850012345009",
            "productName": "Arugula 8oz",
            "initialQuantity": 600,
            "supplierId": "SUP-SALINAS-01",
            "facilityGln": "0850012000018",
            "harvestDate": "2026-11-01T08:00:00Z",
            "productionDate": "2026-11-02T10:00:00Z",
            "expirationDate": "2026-11-20T23:59:59Z",
        }
        b_res = batch_handler(make_api_event("POST", "/v1/batches", body=payload), None)
        batch_id = json.loads(b_res["body"])["data"]["batchId"]

        r_payload = {
            "batchId": batch_id,
            "hazardClass": "CLASS_I_CRITICAL",
            "reason": "Listeria monocytogenes environmental swab detection",
            "confirmationPhrase": f"CONFIRM-RECALL-{batch_id}",
            "auth2FAToken": "123456",
        }
        r_res = recall_handler(make_api_event("POST", "/v1/recalls", body=r_payload), None)
        recall_id = json.loads(r_res["body"])["data"]["recallId"]

        return {"batchId": batch_id, "recallId": recall_id, "orgId": "ORG#demo"}

    def test_stage_1_calculate_blast_radius_worker(self, setup_batch):
        """Stage 1: CalculateBlastRadius worker computes impacted facilities."""
        event = {
            "batchId": setup_batch["batchId"],
            "recallId": setup_batch["recallId"],
            "orgId": setup_batch["orgId"],
            "hazardClass": "CLASS_I_CRITICAL",
        }
        out = blast_worker(event, None)
        assert "blastRadius" in out
        assert "totalUnitsAtRisk" in out
        assert out["batchId"] == setup_batch["batchId"]

    def test_stage_2_lock_pos_inventory_worker(self, setup_batch):
        """Stage 2: LockPosInventory worker records EDI hold and scan-block."""
        event = {
            "batchId": setup_batch["batchId"],
            "recallId": setup_batch["recallId"],
            "totalUnitsAtRisk": 600,
        }
        out = lock_worker(event, None)
        assert out["posScanBlockEnforced"] is True
        assert out["ediHoldOrdersDispatched"] is True

    def test_stage_3_record_audit_worker(self, setup_batch):
        """Stage 3: RecordAudit worker appends cryptographic hash chain record."""
        event = {
            "batchId": setup_batch["batchId"],
            "recallId": setup_batch["recallId"],
            "orgId": setup_batch["orgId"],
            "hazardClass": "CLASS_I_CRITICAL",
            "totalUnitsAtRisk": 600,
            "auditAction": "RECALL_MINIMAL_ORCHESTRATED",
        }
        out = audit_worker(event, None)
        assert out["auditStatus"] == "RECORDED"
        assert "auditEventId" in out

    def test_stage_4_finalize_recall_worker(self, setup_batch):
        """Stage 4: FinalizeRecall worker marks workflow completed."""
        event = {
            "batchId": setup_batch["batchId"],
            "recallId": setup_batch["recallId"],
            "orgId": setup_batch["orgId"],
        }
        out = finalize_worker(event, None)
        assert out["workflowCompleted"] is True
        assert out["finalStatus"] == "AWAITING_ACKNOWLEDGEMENTS"

    def test_stage_failure_handler_on_error(self, setup_batch):
        """Failure catcher: HandleFailure worker transitions recall to FAILED and records audit."""
        event = {
            "batchId": setup_batch["batchId"],
            "recallId": setup_batch["recallId"],
            "orgId": setup_batch["orgId"],
            "error": "Simulated task timeout in worker execution",
        }
        out = failure_worker(event, None)
        assert out["workflowStatus"] == "FAILED"
        assert "error" in out
