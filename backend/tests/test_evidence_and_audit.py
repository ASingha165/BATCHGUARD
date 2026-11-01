"""Unit tests for EvidenceService and AuditService."""

from unittest.mock import MagicMock
from backend.models.schemas import PresignedUrlRequest, RecordAuditLogRequest
from backend.services.audit_service import AuditService
from backend.services.evidence_service import EvidenceService


def test_evidence_service_presigned_url(mock_db):
    mock_s3 = MagicMock()
    mock_s3.generate_presigned_url.return_value = "https://s3.amazonaws.com/test-presigned-url"

    service = EvidenceService(db=mock_db, s3_client=mock_s3)
    req = PresignedUrlRequest(
        batchId="BG-2024-8891-ORG",
        documentType="COA",
        fileName="certificate-of-analysis.pdf",
        fileSizeBytes=1450000,
        mimeType="application/pdf",
    )
    res = service.generate_presigned_upload_url(req)
    assert res["uploadUrl"] == "https://s3.amazonaws.com/test-presigned-url"
    assert res["expiresInSeconds"] == 900
    assert "evidence/ORG-APEX-GLOBAL/BG-2024-8891-ORG/" in res["s3Key"]
    assert mock_db.put_item.called


def test_audit_service_record_and_list(mock_db):
    service = AuditService(db=mock_db)
    req = RecordAuditLogRequest(
        eventType="EMERGENCY_RECALL_INITIATED",
        actor="compliance.officer@apexnutrition.internal",
        targetResource="BATCH#BG-2024-8891-ORG",
        actionSummary="Targeted recall initiated across 4 distribution hubs.",
        details={"unitsAtRisk": 6200, "hazardClass": "CLASS_I_CRITICAL"},
    )
    result = service.record_audit_entry(req)
    assert result["eventType"] == "EMERGENCY_RECALL_INITIATED"
    assert result["cryptographicSignature"].startswith("0x")
    assert result["immutable"] is True
    assert mock_db.put_item.called

    logs = service.list_audit_events()
    assert len(logs) == 2
