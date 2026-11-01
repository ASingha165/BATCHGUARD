"""Unit tests for request schema validation."""

import pytest
from pydantic import ValidationError
from backend.models.schemas import BlastRadiusRequest, InitiateRecallRequest


def test_valid_blast_radius_request():
    req = BlastRadiusRequest(batchId="BG-2024-8891-ORG")
    assert req.batchId == "BG-2024-8891-ORG"


def test_invalid_blast_radius_request():
    with pytest.raises(ValidationError):
        BlastRadiusRequest(batchId="A")  # min_length=3


def test_valid_initiate_recall_request():
    req = InitiateRecallRequest(
        batchId="BG-2024-8891-ORG",
        hazardClass="CLASS_I_CRITICAL",
        reason="Listeria Monocytogenes Detection",
        confirmationPhrase="CONFIRM-RECALL-BG-2024-8891-ORG",
        auth2FAToken="882910",
    )
    assert req.hazardClass == "CLASS_I_CRITICAL"
    assert req.auth2FAToken == "882910"


def test_invalid_hazard_class():
    with pytest.raises(ValidationError):
        InitiateRecallRequest(
            batchId="BG-2024-8891-ORG",
            hazardClass="UNAPPROVED_HAZARD",
            reason="Sample reason",
            confirmationPhrase="CONFIRM-RECALL-BG-2024-8891-ORG",
            auth2FAToken="882910",
        )


def test_invalid_2fa_token():
    with pytest.raises(ValidationError):
        InitiateRecallRequest(
            batchId="BG-2024-8891-ORG",
            hazardClass="CLASS_I_CRITICAL",
            reason="Sample reason",
            confirmationPhrase="CONFIRM-RECALL-BG-2024-8891-ORG",
            auth2FAToken="123",  # Must be 6 characters
        )

