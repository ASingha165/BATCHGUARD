"""Comprehensive Security, Tenant Isolation, and Hardening Tests for BatchGuard.

Validates:
1. Cross-tenant access attempts (IDOR).
2. Unauthorized recall initiation & server-side RBAC.
3. Invalid authentication context handling.
4. Duplicate idempotency token suppression.
5. S3 Evidence Vault file size and MIME-type restrictions.
6. Concurrent write collision & conditional check failures.
7. Audit record SHA-256 tamper-evident integrity.
"""

import hashlib
import json
import os
from unittest.mock import MagicMock, patch
import pytest
from botocore.exceptions import ClientError
from backend.common.auth import (
    AuthContext,
    ForbiddenError,
    UnauthorizedError,
    enforce_tenant_boundary,
    extract_auth_context,
    require_role,
)
from backend.common.db import DynamoDBClient
from backend.common.exceptions import (
    IdempotencyConflictError,
    ResourceNotFoundError,
    UnauthorizedRecallError,
    ValidationError,
)
from backend.handlers import batch_handler, recall_handler
from backend.models.schemas import (
    InitiateRecallRequest,
    PresignedUrlRequest,
    RecordAuditLogRequest,
)
from backend.services.audit_service import AuditService
from backend.services.evidence_service import EvidenceService
from backend.services.recall_service import RecallService


class DummyContext:
    aws_request_id = "test-sec-req-889"


# ==============================================================================
# 1. TENANT ISOLATION & CROSS-TENANT ACCESS TESTS
# ==============================================================================

def test_cross_tenant_boundary_enforcement():
    auth = AuthContext(
        org_id="ORG-TENANT-ALPHA",
        user_id="usr-123",
        user_email="auditor@alpha.internal",
        roles=["QUALITY_MANAGER"],
    )

    # Allowed: accessing own tenant
    enforce_tenant_boundary(auth, "ORG-TENANT-ALPHA")

    # Forbidden: attempting cross-tenant access to BETA
    with pytest.raises(ForbiddenError) as exc_info:
        enforce_tenant_boundary(auth, "ORG-TENANT-BETA")
    assert "Cross-tenant access forbidden" in str(exc_info.value)


def test_batch_handler_cross_tenant_rejection(mock_db):
    event = {
        "httpMethod": "GET",
        "path": "/v1/batches",
        "queryStringParameters": {"orgId": "ORG-COMPETITOR-INC"},
        "headers": {"X-Organization-Id": "ORG-TENANT-ALPHA"},
    }
    res = batch_handler.lambda_handler(event, DummyContext())
    assert res["statusCode"] == 403
    body = json.loads(res["body"])
    assert body["success"] is False
    assert body["error"]["code"] == "FORBIDDEN"


# ==============================================================================
# 2. AUTHENTICATION CONTEXT & RBAC TESTS
# ==============================================================================

def test_production_missing_authorizer_rejected():
    with patch.dict(os.environ, {"ENVIRONMENT": "production"}):
        event = {
            "httpMethod": "GET",
            "path": "/v1/batches",
            "requestContext": {},  # Missing authorizer
            "headers": {"X-Organization-Id": "ORG-SPOOFED"},
        }
        with pytest.raises(UnauthorizedError):
            extract_auth_context(event)


def test_cognito_authorizer_claims_extraction():
    event = {
        "requestContext": {
            "authorizer": {
                "claims": {
                    "sub": "user-cognito-uuid-999",
                    "email": "lead.qa@apexnutrition.internal",
                    "custom:org_id": "ORG-APEX-ENTERPRISE",
                    "cognito:groups": "ComplianceOfficer,Admin",
                }
            }
        }
    }
    auth = extract_auth_context(event)
    assert auth.org_id == "ORG-APEX-ENTERPRISE"
    assert auth.user_id == "user-cognito-uuid-999"
    assert "ComplianceOfficer" in auth.roles
    assert "Admin" in auth.roles


def test_require_role_enforcement():
    auth_viewer = AuthContext(
        org_id="ORG-TEST",
        user_id="usr-viewer",
        user_email="viewer@test.internal",
        roles=["VIEWER"],
    )
    with pytest.raises(ForbiddenError) as exc_info:
        require_role(auth_viewer, ["COMPLIANCE_OFFICER", "ADMIN"])
    assert "Operation requires one of the following roles" in str(exc_info.value)

    auth_officer = AuthContext(
        org_id="ORG-TEST",
        user_id="usr-officer",
        user_email="officer@test.internal",
        roles=["COMPLIANCE_OFFICER"],
    )
    # Should pass without exception
    require_role(auth_officer, ["COMPLIANCE_OFFICER", "ADMIN"])


# ==============================================================================
# 3. RECALL AUTHORIZATION & 2FA SECURITY TESTS
# ==============================================================================

def test_recall_handler_rejects_unauthorized_role(mock_db):
    event = {
        "httpMethod": "POST",
        "path": "/v1/recalls/initiate",
        "headers": {
            "X-Organization-Id": "ORG-APEX-GLOBAL",
            "X-User-Roles": "VIEWER,OPERATOR",  # Missing COMPLIANCE_OFFICER or ADMIN
        },
        "body": json.dumps({
            "batchId": "BG-2024-8891-ORG",
            "hazardClass": "CLASS_I_CRITICAL",
            "reason": "Pathogen Detection",
            "confirmationPhrase": "CONFIRM-RECALL-BG-2024-8891-ORG",
            "auth2FAToken": "123456",
        }),
    }
    res = recall_handler.lambda_handler(event, DummyContext())
    assert res["statusCode"] == 403
    body = json.loads(res["body"])
    assert body["error"]["code"] == "FORBIDDEN"


def test_recall_service_rejects_phrase_mismatch(mock_db):
    service = RecallService(db=mock_db)
    req = InitiateRecallRequest(
        batchId="BG-2024-8891-ORG",
        hazardClass="CLASS_I_CRITICAL",
        reason="Listeria Monocytogenes",
        confirmationPhrase="CANCEL-RECALL-BG-2024-8891-ORG",  # Wrong phrase
        auth2FAToken="882910",
    )
    with pytest.raises(UnauthorizedRecallError) as exc_info:
        service.initiate_recall(req)
    assert "Confirmation phrase mismatch" in str(exc_info.value)


def test_recall_service_rejects_invalid_2fa(mock_db):
    from pydantic import ValidationError as PydanticValError
    with pytest.raises(PydanticValError):
        InitiateRecallRequest(
            batchId="BG-2024-8891-ORG",
            hazardClass="CLASS_I_CRITICAL",
            reason="Listeria Monocytogenes",
            confirmationPhrase="CONFIRM-RECALL-BG-2024-8891-ORG",
            auth2FAToken="ABCDEF",  # Non-numeric
        )


def test_prevent_concurrent_active_recalls(mock_db):
    # Mock GSI query returning an already active recall on the same batch
    mock_db.query_gsi.return_value = (
        [{"recallId": "REC-EXISTING-01", "status": "INITIATED", "batchId": "BG-2024-8891-ORG"}],
        None,
    )
    service = RecallService(db=mock_db)
    req = InitiateRecallRequest(
        batchId="BG-2024-8891-ORG",
        hazardClass="CLASS_I_CRITICAL",
        reason="Listeria Monocytogenes",
        confirmationPhrase="CONFIRM-RECALL-BG-2024-8891-ORG",
        auth2FAToken="882910",
    )
    with pytest.raises(IdempotencyConflictError) as exc_info:
        service.initiate_recall(req)
    assert "An active recall incident" in str(exc_info.value)


def test_duplicate_idempotency_token_suppression(mock_db):
    cached_recall = {
        "recallId": "REC-CACHED-88",
        "batchId": "BG-2024-8891-ORG",
        "status": "INITIATED",
    }
    # Mock that idempotency record exists
    mock_db.get_item.return_value = {"result": cached_recall}

    service = RecallService(db=mock_db)
    req = InitiateRecallRequest(
        batchId="BG-2024-8891-ORG",
        hazardClass="CLASS_I_CRITICAL",
        reason="Listeria Monocytogenes",
        confirmationPhrase="CONFIRM-RECALL-BG-2024-8891-ORG",
        auth2FAToken="882910",
        idempotencyToken="idemp-token-uuid-112233",
    )
    res = service.initiate_recall(req)
    assert res["recallId"] == "REC-CACHED-88"
    # DynamoDB conditional write should NOT have been called again
    assert not mock_db.conditional_put_item.called


# ==============================================================================
# 4. S3 EVIDENCE VAULT SECURITY & PRE-SIGNED POST TESTS
# ==============================================================================

def test_evidence_service_rejects_unsupported_mime(mock_db):
    service = EvidenceService(db=mock_db)
    req = PresignedUrlRequest(
        batchId="BG-2024-8891-ORG",
        documentType="LAB_TEST",
        fileName="malware.exe",
        fileSizeBytes=500000,
        mimeType="application/x-msdownload",  # Disallowed
    )
    with pytest.raises(ValidationError) as exc_info:
        service.generate_presigned_upload_post(req)
    assert "Unsupported MIME type" in str(exc_info.value)


def test_evidence_service_enforces_max_size(mock_db):
    with pytest.raises(Exception):
        # 60MB exceeds 50MB (52,428,800 bytes) schema limit
        PresignedUrlRequest(
            batchId="BG-2024-8891-ORG",
            documentType="LAB_TEST",
            fileName="huge_archive.pdf",
            fileSizeBytes=60000000,
            mimeType="application/pdf",
        )


def test_evidence_service_presigned_post_conditions(mock_db):
    mock_s3 = MagicMock()
    mock_s3.generate_presigned_post.return_value = {
        "url": "https://s3.amazonaws.com/test-bucket",
        "fields": {"key": "evidence/ORG-APEX-GLOBAL/BG-2024-8891-ORG/DOC-123_lab.pdf"},
    }
    service = EvidenceService(db=mock_db, s3_client=mock_s3)
    req = PresignedUrlRequest(
        batchId="BG-2024-8891-ORG",
        documentType="COA",
        fileName="lab_analysis.pdf",
        fileSizeBytes=250000,
        mimeType="application/pdf",
    )
    result = service.generate_presigned_upload_post(req, org_id="ORG-APEX-GLOBAL")
    assert result["uploadUrl"] == "https://s3.amazonaws.com/test-bucket"
    assert result["maxFileSizeBytes"] == 52428800
    assert result["expiresInSeconds"] == 900

    # Verify S3 was called with content-length-range condition
    mock_s3.generate_presigned_post.assert_called_once()
    _, kwargs = mock_s3.generate_presigned_post.call_args
    conditions = kwargs.get("Conditions", [])
    assert ["content-length-range", 1, 52428800] in conditions


# ==============================================================================
# 5. CONCURRENT WRITES & AUDIT TAMPER-EVIDENCE
# ==============================================================================

def test_conditional_write_race_condition_raises_conflict():
    mock_table = MagicMock()
    mock_table.put_item.side_effect = ClientError(
        {"Error": {"Code": "ConditionalCheckFailedException", "Message": "The conditional request failed"}},
        "PutItem",
    )

    client = DynamoDBClient(table_name="TestTable")
    client._table = mock_table

    with pytest.raises(IdempotencyConflictError):
        client.conditional_put_item(
            item={"PK": "ORG#1", "SK": "BATCH#1"},
            condition_expression="attribute_not_exists(PK)",
        )


def test_audit_log_cryptographic_tamper_detection(mock_db):
    service = AuditService(db=mock_db)
    req = RecordAuditLogRequest(
        eventType="EMERGENCY_RECALL_INITIATED",
        actor="compliance.officer@apexnutrition.internal",
        targetResource="BATCH#BG-2024-8891-ORG",
        actionSummary="Recall authorized across 4 hubs.",
        details={"unitsAtRisk": 6200},
    )
    entry = service.record_audit_entry(req, org_id="ORG-APEX-GLOBAL")
    original_signature = entry["cryptographicSignature"]

    # Recompute SHA-256 over exact canonical JSON
    from backend.services.audit_service import compute_hash
    audit_content = {
        "auditId": entry["auditId"],
        "orgId": "ORG-APEX-GLOBAL",
        "timestamp": entry["timestamp"],
        "sequenceNumber": entry.get("sequenceNumber"),
        "eventType": req.eventType,
        "actor": req.actor,
        "targetResource": req.targetResource,
        "actionSummary": req.actionSummary,
        "details": req.details,
        "previousHash": entry.get("previousHash"),
    }
    recomputed = compute_hash(audit_content)
    assert recomputed == original_signature

    # Tampering simulation: alter unitsAtRisk in details
    tampered_content = dict(audit_content)
    tampered_content["details"] = {"unitsAtRisk": 0}  # Altered data!
    tampered_hash = compute_hash(tampered_content)

    # Hash mismatch proves tamper-evident property
    assert tampered_hash != original_signature


def test_audit_verify_unauthenticated_rejected_in_prod(monkeypatch):
    """In production environment, unauthenticated audit verification requests return 401."""
    from backend.handlers import audit_handler
    monkeypatch.setenv("ENVIRONMENT", "production")

    event = {
        "httpMethod": "GET",
        "path": "/v1/audit/verify",
        "headers": {},
        "requestContext": {},
    }
    res = audit_handler.lambda_handler(event, None)
    assert res["statusCode"] == 401
    body = json.loads(res["body"])
    assert body["error"]["code"] == "UNAUTHORIZED"


def test_audit_verify_unauthorized_role_rejected(monkeypatch):
    """Callers without auditor or compliance roles are rejected with 403 FORBIDDEN."""
    from backend.handlers import audit_handler
    monkeypatch.setenv("ENVIRONMENT", "production")

    event = {
        "httpMethod": "GET",
        "path": "/v1/audit/verify",
        "headers": {},
        "requestContext": {
            "authorizer": {
                "claims": {
                    "sub": "user-guest",
                    "email": "guest@apex.com",
                    "custom:org_id": "ORG-APEX-GLOBAL",
                    "cognito:groups": "WAREHOUSE_STAFF,GUEST",
                }
            }
        },
    }
    res = audit_handler.lambda_handler(event, None)
    assert res["statusCode"] == 403
    body = json.loads(res["body"])
    assert body["error"]["code"] == "FORBIDDEN"


def test_audit_verify_authorized_compliance_officer_success(monkeypatch):
    """Callers with COMPLIANCE_OFFICER or AUDITOR role succeed."""
    from backend.handlers import audit_handler
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setattr(audit_handler.audit_service, "verify_chain", lambda org_id, limit: (True, []))

    event = {
        "httpMethod": "GET",
        "path": "/v1/audit/verify",
        "headers": {},
        "requestContext": {
            "authorizer": {
                "claims": {
                    "sub": "user-officer",
                    "email": "officer@apex.com",
                    "custom:org_id": "ORG-APEX-GLOBAL",
                    "cognito:groups": "COMPLIANCE_OFFICER",
                }
            }
        },
    }
    res = audit_handler.lambda_handler(event, None)
    assert res["statusCode"] == 200
    body = json.loads(res["body"])
    assert body["data"]["verified"] is True
    assert body["data"]["orgId"] == "ORG-APEX-GLOBAL"


def test_audit_verify_cross_tenant_rejected(monkeypatch):
    """Cross-tenant query parameter tampering is rejected with 403 FORBIDDEN."""
    from backend.handlers import audit_handler
    monkeypatch.setenv("ENVIRONMENT", "production")

    event = {
        "httpMethod": "GET",
        "path": "/v1/audit/verify",
        "queryStringParameters": {"orgId": "ORG-ATTACKER-TENANT"},
        "headers": {},
        "requestContext": {
            "authorizer": {
                "claims": {
                    "sub": "user-officer",
                    "email": "officer@apex.com",
                    "custom:org_id": "ORG-APEX-GLOBAL",
                    "cognito:groups": "COMPLIANCE_OFFICER",
                }
            }
        },
    }
    res = audit_handler.lambda_handler(event, None)
    assert res["statusCode"] == 403
    body = json.loads(res["body"])
    assert body["error"]["code"] == "FORBIDDEN"
    assert "Cross-tenant access forbidden" in body["error"]["message"]


def test_audit_verify_bounded_limit_enforced(monkeypatch):
    """Verification limit parameter is strictly bounded to prevent resource exhaustion."""
    from backend.handlers import audit_handler
    monkeypatch.setenv("ENVIRONMENT", "production")
    passed_limit = None

    def fake_verify_chain(org_id, limit):
        nonlocal passed_limit
        passed_limit = limit
        return True, []

    monkeypatch.setattr(audit_handler.audit_service, "verify_chain", fake_verify_chain)

    event = {
        "httpMethod": "GET",
        "path": "/v1/audit/verify",
        "queryStringParameters": {"limit": "9999999"},
        "headers": {},
        "requestContext": {
            "authorizer": {
                "claims": {
                    "sub": "user-auditor",
                    "email": "auditor@apex.com",
                    "custom:org_id": "ORG-APEX-GLOBAL",
                    "cognito:groups": "AUDITOR",
                }
            }
        },
    }
    res = audit_handler.lambda_handler(event, None)
    assert res["statusCode"] == 200
    assert passed_limit == 1000, "Limit must be capped at 1000 to prevent denial-of-service"
