"""Unit tests for EvidenceService and AuditService integrity verification."""

import copy
import json
from unittest.mock import MagicMock
from pydantic import ValidationError as PydanticValidationError
import pytest
from backend.common.exceptions import IdempotencyConflictError, ResourceNotFoundError, ValidationError
from backend.models.schemas import PresignedUrlRequest, RecordAuditLogRequest
from backend.services.audit_service import AuditService, GENESIS_HASH, compute_hash
from backend.services.evidence_service import EvidenceService, sanitize_filename


# ==============================================================================
# 1. EVIDENCE SERVICE TESTS
# ==============================================================================

def test_evidence_service_presigned_url(mock_db):
    mock_s3 = MagicMock()
    mock_s3.generate_presigned_post.return_value = {
        "url": "https://s3.amazonaws.com/test-presigned-url",
        "fields": {"key": "test-key"},
    }

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
    assert mock_db.conditional_put_item.called


def test_evidence_service_sanitizes_path_traversal(mock_db):
    """Filename containing directory traversal sequences must be sanitized."""
    mock_s3 = MagicMock()
    mock_s3.generate_presigned_post.return_value = {"url": "https://s3.amazonaws.com/bucket", "fields": {}}
    service = EvidenceService(db=mock_db, s3_client=mock_s3)

    clean = sanitize_filename("../../etc/passwd.pdf")
    assert ".." not in clean
    assert "/" not in clean
    assert clean == "passwd.pdf"

    clean_win = sanitize_filename("..\\..\\windows\\win.ini")
    assert ".." not in clean_win
    assert "\\" not in clean_win
    assert clean_win == "win.ini"

    req = PresignedUrlRequest(
        batchId="BG-2024-8891-ORG",
        documentType="LAB_TEST",
        fileName="../../traversal_attack.pdf",
        fileSizeBytes=100000,
        mimeType="application/pdf",
    )
    res = service.generate_presigned_upload_post(req, org_id="ORG-APEX-GLOBAL")
    assert ".." not in res["s3Key"]
    assert res["s3Key"].startswith("evidence/ORG-APEX-GLOBAL/BG-2024-8891-ORG/")


def test_evidence_service_rejects_disallowed_mime(mock_db):
    service = EvidenceService(db=mock_db)
    req = PresignedUrlRequest(
        batchId="BG-2024-8891-ORG",
        documentType="COA",
        fileName="malicious_script.sh",
        fileSizeBytes=2048,
        mimeType="application/x-sh",
    )
    with pytest.raises(ValidationError) as exc:
        service.generate_presigned_upload_post(req)
    assert "Unsupported MIME type" in str(exc.value)


def test_evidence_service_rejects_oversized_file(mock_db):
    """Pydantic and service validation must reject uploads exceeding 50 MB."""
    service = EvidenceService(db=mock_db)
    with pytest.raises((ValidationError, PydanticValidationError)):
        PresignedUrlRequest(
            batchId="BG-2024-8891-ORG",
            documentType="COA",
            fileName="giant_archive.pdf",
            fileSizeBytes=52428801,  # 50MB + 1 byte
            mimeType="application/pdf",
        )


def test_evidence_service_rejects_cross_tenant_download(mock_db):
    """Attempting to generate a download URL for a doc in another tenant raises ResourceNotFoundError."""
    mock_db.get_item.return_value = None  # Not found under caller's ORG#ORG-CALLER partition
    service = EvidenceService(db=mock_db)

    with pytest.raises(ResourceNotFoundError) as exc:
        service.generate_presigned_download_url(doc_id="DOC-COMPETITOR-1", org_id="ORG-CALLER")
    assert "not found in organization 'ORG-CALLER'" in str(exc.value)


# ==============================================================================
# 2. AUDIT SERVICE & SHA-256 HASH CHAIN INTEGRITY TESTS
# ==============================================================================

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
    assert result["recordHash"].startswith("0x")
    assert result["immutable"] is True
    assert mock_db.conditional_put_item.called or mock_db.put_item.called


def test_audit_hash_chain_sequential_linking(mock_db):
    """Verify that successive audit entries chain previousHash correctly."""
    stored_entries = []

    def mock_put(item, **kwargs):
        stored_entries.append(copy.deepcopy(item))
        return item

    def mock_query(pk, sk_prefix="", limit=50, scan_index_forward=False):
        sorted_entries = sorted(stored_entries, key=lambda x: x["SK"], reverse=not scan_index_forward)
        return copy.deepcopy(sorted_entries[:limit]), None

    mock_db.conditional_put_item.side_effect = mock_put
    mock_db.query_by_pk.side_effect = mock_query

    service = AuditService(db=mock_db)

    # 1. Record entry 1 (Genesis)
    e1 = service.record_audit_entry(
        RecordAuditLogRequest(
            eventType="BATCH_REGISTERED",
            actor="operator@apex.com",
            targetResource="BATCH#1",
            actionSummary="Batch 1 registered",
        ),
        org_id="ORG-TEST",
    )
    assert e1["previousHash"] == GENESIS_HASH

    # 2. Record entry 2 (Must link to e1.recordHash)
    e2 = service.record_audit_entry(
        RecordAuditLogRequest(
            eventType="RECALL_INITIATED",
            actor="compliance@apex.com",
            targetResource="BATCH#1",
            actionSummary="Recall initiated",
        ),
        org_id="ORG-TEST",
    )
    assert e2["previousHash"] == e1["recordHash"]

    # 3. Record entry 3 (Must link to e2.recordHash)
    e3 = service.record_audit_entry(
        RecordAuditLogRequest(
            eventType="HOLD_VERIFIED",
            actor="dc_mgr@apex.com",
            targetResource="NODE#DC-1",
            actionSummary="Physical hold verified",
        ),
        org_id="ORG-TEST",
    )
    assert e3["previousHash"] == e2["recordHash"]

    # 4. Verify clean chain
    is_valid, errors = service.verify_chain(org_id="ORG-TEST")
    assert is_valid is True
    assert len(errors) == 0


def test_audit_hash_chain_detects_modified_entry(mock_db):
    """Modifying any field in an audit entry must trigger an integrity tamper detection error."""
    stored_entries = []

    def mock_put(item, **kwargs):
        stored_entries.append(copy.deepcopy(item))
        return item

    def mock_query(pk, sk_prefix="", limit=50, scan_index_forward=False):
        sorted_entries = sorted(stored_entries, key=lambda x: x["SK"], reverse=not scan_index_forward)
        return copy.deepcopy(sorted_entries[:limit]), None

    mock_db.conditional_put_item.side_effect = mock_put
    mock_db.query_by_pk.side_effect = mock_query

    service = AuditService(db=mock_db)

    # Add 2 valid entries
    service.record_audit_entry(
        RecordAuditLogRequest(eventType="ACTION_1", actor="user1", targetResource="RES#1", actionSummary="Sum 1"),
        org_id="ORG-TEST",
    )
    service.record_audit_entry(
        RecordAuditLogRequest(eventType="ACTION_2", actor="user2", targetResource="RES#2", actionSummary="Sum 2"),
        org_id="ORG-TEST",
    )

    # Tamper with entry 0's actionSummary
    stored_entries[0]["actionSummary"] = "TAMPERED: Summary was secretly changed!"

    is_valid, errors = service.verify_chain(org_id="ORG-TEST")
    assert is_valid is False
    assert len(errors) >= 1
    assert any("Integrity tamper detected" in err for err in errors)


def test_audit_hash_chain_detects_deleted_entry(mock_db):
    """Deleting an entry from the ledger breaks the hash chain pointer of the next entry."""
    stored_entries = []

    def mock_put(item, **kwargs):
        stored_entries.append(copy.deepcopy(item))
        return item

    def mock_query(pk, sk_prefix="", limit=50, scan_index_forward=False):
        sorted_entries = sorted(stored_entries, key=lambda x: x["SK"], reverse=not scan_index_forward)
        return copy.deepcopy(sorted_entries[:limit]), None

    mock_db.conditional_put_item.side_effect = mock_put
    mock_db.query_by_pk.side_effect = mock_query

    service = AuditService(db=mock_db)

    # Add 3 entries
    service.record_audit_entry(
        RecordAuditLogRequest(eventType="ACTION_1", actor="user1", targetResource="RES#1", actionSummary="Sum 1"),
        org_id="ORG-TEST",
    )
    service.record_audit_entry(
        RecordAuditLogRequest(eventType="ACTION_2", actor="user2", targetResource="RES#2", actionSummary="Sum 2"),
        org_id="ORG-TEST",
    )
    service.record_audit_entry(
        RecordAuditLogRequest(eventType="ACTION_3", actor="user3", targetResource="RES#3", actionSummary="Sum 3"),
        org_id="ORG-TEST",
    )

    # Delete entry 1 (middle entry)
    del stored_entries[1]

    is_valid, errors = service.verify_chain(org_id="ORG-TEST")
    assert is_valid is False
    assert any("Hash chain broken" in err for err in errors)


def test_audit_hash_chain_detects_reordered_entries(mock_db):
    """Reordering entries in the audit ledger breaks the previousHash sequence."""
    stored_entries = []

    def mock_put(item, **kwargs):
        stored_entries.append(copy.deepcopy(item))
        return item

    def mock_query(pk, sk_prefix="", limit=50, scan_index_forward=False):
        sorted_entries = sorted(stored_entries, key=lambda x: x["SK"], reverse=not scan_index_forward)
        return copy.deepcopy(sorted_entries[:limit]), None

    mock_db.conditional_put_item.side_effect = mock_put
    mock_db.query_by_pk.side_effect = mock_query

    service = AuditService(db=mock_db)

    # Add 2 entries
    service.record_audit_entry(
        RecordAuditLogRequest(eventType="ACTION_1", actor="user1", targetResource="RES#1", actionSummary="Sum 1"),
        org_id="ORG-TEST",
    )
    service.record_audit_entry(
        RecordAuditLogRequest(eventType="ACTION_2", actor="user2", targetResource="RES#2", actionSummary="Sum 2"),
        org_id="ORG-TEST",
    )

    # Swap their SKs so when sorted by SK in forward order, they appear inverted
    stored_entries[0]["SK"], stored_entries[1]["SK"] = stored_entries[1]["SK"], stored_entries[0]["SK"]

    is_valid, errors = service.verify_chain(org_id="ORG-TEST")
    assert is_valid is False
    assert len(errors) > 0


def test_audit_hash_chain_serialization_round_trip():
    """Verify that canonical JSON encoding is perfectly deterministic and round-trip safe."""
    content = {
        "auditId": "AUD-TEST123",
        "orgId": "ORG-APEX-GLOBAL",
        "timestamp": "2026-11-02T10:00:00Z",
        "sequenceNumber": 1,
        "eventType": "RECALL_INITIATED",
        "actor": "officer@apex.com",
        "targetResource": "BATCH#BG-8891",
        "actionSummary": "Recall triggered",
        "details": {"keyB": 2, "keyA": 1},
        "previousHash": GENESIS_HASH,
    }
    hash_1 = compute_hash(content)

    # Re-order dict keys in memory
    content_reordered = {
        "previousHash": GENESIS_HASH,
        "details": {"keyA": 1, "keyB": 2},
        "actionSummary": "Recall triggered",
        "actor": "officer@apex.com",
        "targetResource": "BATCH#BG-8891",
        "sequenceNumber": 1,
        "eventType": "RECALL_INITIATED",
        "timestamp": "2026-11-02T10:00:00Z",
        "orgId": "ORG-APEX-GLOBAL",
        "auditId": "AUD-TEST123",
    }
    hash_2 = compute_hash(content_reordered)
    assert hash_1 == hash_2, "Canonical JSON hashing must be invariant to dict key insertion order"


def test_audit_ledger_head_tail_truncation_detection(mock_db):
    """Detects when an attacker deletes the most recent (tail) records while prefix remains intact."""
    stored_entries = []
    ledger_head = {}

    def mock_put_cond(item, **kwargs):
        stored_entries.append(copy.deepcopy(item))
        return item

    def mock_put(item, **kwargs):
        if item.get("SK") == "AUDIT_LEDGER_HEAD":
            ledger_head.update(copy.deepcopy(item))
        return item

    def mock_get(pk, sk):
        if sk == "AUDIT_LEDGER_HEAD" and ledger_head:
            return copy.deepcopy(ledger_head)
        return None

    def mock_query(pk, sk_prefix="", limit=50, scan_index_forward=False):
        sorted_entries = sorted(stored_entries, key=lambda x: x["SK"], reverse=not scan_index_forward)
        return copy.deepcopy(sorted_entries[:limit]), None

    mock_db.conditional_put_item.side_effect = mock_put_cond
    mock_db.put_item.side_effect = mock_put
    mock_db.get_item.side_effect = mock_get
    mock_db.query_by_pk.side_effect = mock_query

    service = AuditService(db=mock_db)

    # Record 3 entries
    e1 = service.record_audit_entry(
        RecordAuditLogRequest(eventType="ACTION_1", actor="user1", targetResource="RES#1", actionSummary="Sum 1"),
        org_id="ORG-TEST",
    )
    e2 = service.record_audit_entry(
        RecordAuditLogRequest(eventType="ACTION_2", actor="user2", targetResource="RES#2", actionSummary="Sum 2"),
        org_id="ORG-TEST",
    )
    e3 = service.record_audit_entry(
        RecordAuditLogRequest(eventType="ACTION_3", actor="user3", targetResource="RES#3", actionSummary="Sum 3"),
        org_id="ORG-TEST",
    )

    # Initial verification must pass
    is_valid, errors = service.verify_chain(org_id="ORG-TEST")
    assert is_valid is True
    assert len(errors) == 0

    # Simulate Tail Truncation: Attacker silently deletes the 3rd (tail) entry from the table
    # The remaining 2 entries are intact and form a valid sub-chain, but ledger head knows 3 exist
    stored_entries.pop()

    is_valid, errors = service.verify_chain(org_id="ORG-TEST")
    assert is_valid is False
    assert any("Tail truncation detected" in err for err in errors)
    assert any("Tail hash mismatch" in err for err in errors)


def test_audit_ledger_head_tail_hash_mismatch(mock_db):
    """Detects when the last entry's recordHash does not match the ledger head latestHash."""
    stored_entries = []
    ledger_head = {}

    def mock_put_cond(item, **kwargs):
        stored_entries.append(copy.deepcopy(item))
        return item

    def mock_put(item, **kwargs):
        if item.get("SK") == "AUDIT_LEDGER_HEAD":
            ledger_head.update(copy.deepcopy(item))
        return item

    def mock_get(pk, sk):
        if sk == "AUDIT_LEDGER_HEAD" and ledger_head:
            return copy.deepcopy(ledger_head)
        return None

    def mock_query(pk, sk_prefix="", limit=50, scan_index_forward=False):
        sorted_entries = sorted(stored_entries, key=lambda x: x["SK"], reverse=not scan_index_forward)
        return copy.deepcopy(sorted_entries[:limit]), None

    mock_db.conditional_put_item.side_effect = mock_put_cond
    mock_db.put_item.side_effect = mock_put
    mock_db.get_item.side_effect = mock_get
    mock_db.query_by_pk.side_effect = mock_query

    service = AuditService(db=mock_db)

    service.record_audit_entry(
        RecordAuditLogRequest(eventType="ACTION_1", actor="user1", targetResource="RES#1", actionSummary="Sum 1"),
        org_id="ORG-TEST",
    )

    # Tamper with ledger head latestHash
    ledger_head["latestHash"] = "0x" + "f" * 64

    is_valid, errors = service.verify_chain(org_id="ORG-TEST")
    assert is_valid is False
    assert any("Tail hash mismatch" in err for err in errors)


def test_audit_concurrent_write_contention_and_retry(mock_db):
    """Simulates optimistic concurrency collision and verifies jittered backoff retry succeeds."""
    attempts = 0
    stored_entries = []

    def mock_put_with_contention(item, **kwargs):
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            # First attempt collides with another Lambda writing concurrently
            raise IdempotencyConflictError("DynamoDB transaction cancelled: ConditionalCheckFailed")
        stored_entries.append(copy.deepcopy(item))
        return item

    mock_db.conditional_put_item.side_effect = mock_put_with_contention
    mock_db.get_item.return_value = None
    mock_db.query_by_pk.return_value = ([], None)

    service = AuditService(db=mock_db)
    result = service.record_audit_entry(
        RecordAuditLogRequest(
            eventType="CONCURRENT_ACTION",
            actor="worker@apex.com",
            targetResource="BATCH#100",
            actionSummary="Concurrent write test",
        ),
        org_id="ORG-TEST",
        max_retries=3,
    )

    assert result["auditId"].startswith("AUD-")
    assert attempts == 2, "Must succeed on the second attempt after retry"


def test_audit_retry_exhaustion_raises_conflict(mock_db):
    """Verifies that exceeding max_retries on persistent collision properly raises IdempotencyConflictError."""
    mock_db.conditional_put_item.side_effect = IdempotencyConflictError("Conditional check failed repeatedly")
    mock_db.get_item.return_value = None
    mock_db.query_by_pk.return_value = ([], None)

    service = AuditService(db=mock_db)
    with pytest.raises(IdempotencyConflictError) as exc_info:
        service.record_audit_entry(
            RecordAuditLogRequest(
                eventType="FAILING_ACTION",
                actor="worker@apex.com",
                targetResource="BATCH#100",
                actionSummary="Exhaustion test",
            ),
            org_id="ORG-TEST",
            max_retries=3,
        )

    assert "failed to atomically commit audit log entry" in str(exc_info.value).lower()

