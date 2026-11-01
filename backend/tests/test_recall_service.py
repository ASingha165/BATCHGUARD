"""Unit tests for recall service logic and blast radius computation."""

import pytest
from backend.common.exceptions import UnauthorizedRecallError
from backend.models.schemas import InitiateRecallRequest
from backend.services.recall_service import RecallService


def test_assess_blast_radius(mock_db):
    service = RecallService(db=mock_db)
    result = service.assess_blast_radius("BG-2024-8891-ORG")

    assert result["batchId"] == "BG-2024-8891-ORG"
    # From conftest mock: 2800 + 1400 = 4200 units
    assert result["totalUnitsAtRisk"] == 4200
    assert len(result["impactedNodes"]) == 2
    assert len(result["complianceChecklist"]) == 4


def test_initiate_recall_with_invalid_confirmation_phrase(mock_db):
    service = RecallService(db=mock_db)
    req = InitiateRecallRequest(
        batchId="BG-2024-8891-ORG",
        hazardClass="CLASS_I_CRITICAL",
        reason="Listeria Monocytogenes Detection",
        confirmationPhrase="WRONG_CONFIRMATION_PHRASE",
        auth2FAToken="882910",
    )

    with pytest.raises(UnauthorizedRecallError) as exc_info:
        service.initiate_recall(req)
    assert "Confirmation phrase mismatch" in str(exc_info.value)


def test_initiate_recall_success(mock_db):
    service = RecallService(db=mock_db)
    req = InitiateRecallRequest(
        batchId="BG-2024-8891-ORG",
        hazardClass="CLASS_I_CRITICAL",
        reason="Listeria Monocytogenes Detection",
        confirmationPhrase="CONFIRM-RECALL-BG-2024-8891-ORG",
        auth2FAToken="882910",
    )

    recall = service.initiate_recall(req)
    assert recall["batchId"] == "BG-2024-8891-ORG"
    assert recall["status"] == "INITIATED"
    assert recall["totalUnitsAtRisk"] == 4200
    assert mock_db.put_item.call_count >= 1

