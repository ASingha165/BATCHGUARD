"""Comprehensive tests for AWS Step Functions recall orchestration, state transitions, and worker tasks."""

from unittest.mock import MagicMock, patch
import pytest
from backend.common.exceptions import (
    IdempotencyConflictError,
    InvalidStateTransitionError,
    ResourceNotFoundError,
    UnauthorizedRecallError,
)
from backend.models.schemas import (
    AcknowledgeRecallRequest,
    ApproveRecallRequest,
    InitiateRecallRequest,
    RejectRecallRequest,
)
from backend.services.recall_service import RecallService
from backend.workers import (
    await_approval,
    calculate_blast_radius,
    create_quarantine_tasks,
    dispatch_notifications,
    evaluate_recall_risk,
    finalize_recall,
    handle_failure,
    handle_rejection,
    handle_timeout,
    identify_carrier_intercepts,
    record_audit_entry,
    track_acknowledgements,
    validate_recall_request,
)


@pytest.fixture
def mock_orchestration_db():
    db = MagicMock()
    # Default item store
    db.get_item.return_value = {
        "PK": "ORG#ORG-APEX-GLOBAL",
        "SK": "RECALL#REC-2026-TEST",
        "recallId": "REC-2026-TEST",
        "batchId": "BG-2024-8891-ORG",
        "orgId": "ORG-APEX-GLOBAL",
        "status": "PENDING_APPROVAL",
        "hazardClass": "CLASS_I_CRITICAL",
        "totalUnitsAtRisk": 4200,
        "stepFunctionsTaskToken": "MOCK-TASK-TOKEN-XYZ",
        "createdAt": "2026-11-01T21:00:00Z",
    }
    db.query_gsi.return_value = ([], None)
    db.query_by_pk.return_value = ([], None)
    return db


# ==============================================================================
# 1. STATE MACHINE TRANSITIONS & CONCURRENCY
# ==============================================================================

def test_valid_recall_state_transitions(mock_orchestration_db):
    service = RecallService(db=mock_orchestration_db)

    # PENDING_APPROVAL -> APPROVED
    res_approved = service.transition_recall_status(
        recall_id="REC-2026-TEST",
        target_status="APPROVED",
        org_id="ORG-APEX-GLOBAL",
    )
    assert res_approved["status"] == "APPROVED"

    # Mock updated status to APPROVED for next transition
    mock_orchestration_db.get_item.return_value["status"] = "APPROVED"

    # APPROVED -> EXECUTING
    res_exec = service.transition_recall_status(
        recall_id="REC-2026-TEST",
        target_status="EXECUTING",
        org_id="ORG-APEX-GLOBAL",
    )
    assert res_exec["status"] == "EXECUTING"


def test_invalid_recall_state_transition_raises_error(mock_orchestration_db):
    service = RecallService(db=mock_orchestration_db)

    # PENDING_APPROVAL directly to COMPLETED is invalid
    with pytest.raises(InvalidStateTransitionError) as exc_info:
        service.transition_recall_status(
            recall_id="REC-2026-TEST",
            target_status="COMPLETED",
            org_id="ORG-APEX-GLOBAL",
        )
    assert "Illegal recall transition" in str(exc_info.value)


def test_concurrent_active_recall_atomic_lock_rejection(mock_orchestration_db):
    # Simulate that conditional_put_item on ACTIVE_RECALL raises IdempotencyConflictError
    mock_orchestration_db.conditional_put_item.side_effect = IdempotencyConflictError(
        "Resource already exists"
    )
    service = RecallService(db=mock_orchestration_db)
    req = InitiateRecallRequest(
        batchId="BG-2024-8891-ORG",
        hazardClass="CLASS_I_CRITICAL",
        reason="E. coli O157:H7 contamination",
        confirmationPhrase="CONFIRM-RECALL-BG-2024-8891-ORG",
        auth2FAToken="882910",
    )

    with pytest.raises(IdempotencyConflictError) as exc_info:
        service.initiate_recall(req, org_id="ORG-APEX-GLOBAL")
    assert "An active recall lock already exists" in str(exc_info.value)


# ==============================================================================
# 2. HUMAN APPROVAL & REJECTION GATES
# ==============================================================================

@patch("boto3.client")
def test_approve_recall_resumes_step_functions(mock_boto, mock_orchestration_db):
    mock_sfn = MagicMock()
    mock_boto.return_value = mock_sfn

    service = RecallService(db=mock_orchestration_db)
    approved = service.approve_recall(
        recall_id="REC-2026-TEST",
        approver_email="vp.compliance@apexnutrition.internal",
        org_id="ORG-APEX-GLOBAL",
        notes="Lab assays confirmed contamination.",
    )

    assert approved["status"] == "APPROVED"
    assert approved["approvedBy"] == "vp.compliance@apexnutrition.internal"
    mock_sfn.send_task_success.assert_called_once()
    args, kwargs = mock_sfn.send_task_success.call_args
    assert kwargs["taskToken"] == "MOCK-TASK-TOKEN-XYZ"
    assert "APPROVED" in kwargs["output"]


@patch("boto3.client")
def test_reject_recall_halts_step_functions_and_releases_lock(mock_boto, mock_orchestration_db):
    mock_sfn = MagicMock()
    mock_boto.return_value = mock_sfn

    service = RecallService(db=mock_orchestration_db)
    rejected = service.reject_recall(
        recall_id="REC-2026-TEST",
        rejecter_email="vp.compliance@apexnutrition.internal",
        reason="False positive re-test cleared.",
        org_id="ORG-APEX-GLOBAL",
    )

    assert rejected["status"] == "REJECTED"
    assert rejected["rejectionReason"] == "False positive re-test cleared."
    mock_sfn.send_task_success.assert_called_once()
    # Must delete atomic lock item
    mock_orchestration_db.delete_item.assert_called_with(
        pk="ORG#ORG-APEX-GLOBAL",
        sk="ACTIVE_RECALL#BG-2024-8891-ORG",
    )


def test_approve_recall_in_invalid_state_rejected(mock_orchestration_db):
    mock_orchestration_db.get_item.return_value["status"] = "REJECTED"
    service = RecallService(db=mock_orchestration_db)

    with pytest.raises(InvalidStateTransitionError):
        service.approve_recall(
            recall_id="REC-2026-TEST",
            approver_email="vp.compliance@apexnutrition.internal",
            org_id="ORG-APEX-GLOBAL",
        )


# ==============================================================================
# 3. QUARANTINE TASKS & CARRIER INTERCEPTS
# ==============================================================================

def test_create_quarantine_tasks_and_carrier_flags(mock_orchestration_db):
    service = RecallService(db=mock_orchestration_db)
    impacted_nodes = [
        {
            "nodeId": "DC-CHICAGO-01",
            "nodeName": "Chicago Distribution Center",
            "nodeType": "PRIMARY_DC",
            "lotAllocation": "2,800 units",
        },
        {
            "nodeId": "CARRIER-FLEET-99",
            "nodeName": "Line-Haul Fleet 99",
            "nodeType": "LOGISTICS_CARRIER",
            "lotAllocation": "1,400 units",
        },
    ]

    tasks = service.create_quarantine_tasks(
        recall_id="REC-2026-TEST",
        batch_id="BG-2024-8891-ORG",
        impacted_nodes=impacted_nodes,
        org_id="ORG-APEX-GLOBAL",
    )

    assert len(tasks) == 2
    dc_task = [t for t in tasks if t["nodeId"] == "DC-CHICAGO-01"][0]
    carrier_task = [t for t in tasks if t["nodeId"] == "CARRIER-FLEET-99"][0]

    assert dc_task["allocatedUnits"] == 2800
    assert dc_task["carrierInterceptRequired"] is False
    assert carrier_task["carrierInterceptRequired"] is True


def test_acknowledgement_summary_metrics(mock_orchestration_db):
    # Mock two acknowledgements, one verified and one pending
    mock_orchestration_db.query_by_pk.return_value = (
        [
            {
                "nodeId": "DC-CHICAGO-01",
                "unitsQuarantined": 2800,
                "status": "HOLD_VERIFIED",
                "physicalHoldVerified": True,
            },
            {
                "nodeId": "RET-BOSTON-01",
                "unitsQuarantined": 0,
                "status": "PENDING",
                "physicalHoldVerified": False,
            },
        ],
        None,
    )
    service = RecallService(db=mock_orchestration_db)
    summary = service.get_acknowledgement_summary("REC-2026-TEST", org_id="ORG-APEX-GLOBAL")

    assert summary["totalImpactedFacilities"] == 2
    assert summary["acknowledgedCount"] == 1
    assert summary["verifiedHoldCount"] == 1
    assert summary["pendingCount"] == 1
    assert summary["percentAcknowledged"] == 50.0
    assert summary["allAcknowledged"] is False


# ==============================================================================
# 4. STEP FUNCTIONS TASK WORKERS VERIFICATION
# ==============================================================================

@patch("backend.services.batch_service.BatchService.get_batch")
def test_worker_validate_recall_request(mock_get_batch):
    mock_get_batch.return_value = {
        "batchId": "BG-2024-8891-ORG",
        "productName": "Organic Baby Spinach 16oz",
        "lotNumber": "LOT-8891-A",
        "initialQuantity": 10000,
    }

    event = {
        "recallId": "REC-2026-TEST",
        "batchId": "BG-2024-8891-ORG",
        "orgId": "ORG-APEX-GLOBAL",
    }
    out = validate_recall_request.lambda_handler(event, None)
    assert out["batchValidated"] is True
    assert out["productName"] == "Organic Baby Spinach 16oz"


def test_worker_evaluate_recall_risk():
    event = {
        "hazardClass": "CLASS_I_CRITICAL",
        "unconfirmedUnits": 1200,
        "impactedNodes": [
            {"nodeId": "NODE-CARRIER-1", "nodeType": "LOGISTICS_CARRIER"},
            {"nodeId": "DC-1", "nodeType": "PRIMARY_DC"},
        ],
    }
    out = evaluate_recall_risk.lambda_handler(event, None)
    assert out["criticality"] == "CRITICAL"
    assert out["carrierInterceptRequired"] is True
    assert out["carrierNodesCount"] == 1
    assert out["requiresImmediatePOSLock"] is True


def test_worker_await_approval(mock_orchestration_db):
    event = {
        "recallId": "REC-2026-TEST",
        "orgId": "ORG-APEX-GLOBAL",
        "taskToken": "TASK-TOKEN-NEW-123",
    }
    with patch.object(await_approval, "recall_service", RecallService(db=mock_orchestration_db)):
        out = await_approval.lambda_handler(event, None)
        assert out["approvalStatus"] == "PENDING_APPROVAL"


def test_worker_handle_timeout(mock_orchestration_db):
    event = {
        "recallId": "REC-2026-TEST",
        "orgId": "ORG-APEX-GLOBAL",
        "error": "Task timed out after 86400 seconds.",
    }
    with patch.object(handle_timeout, "recall_service", RecallService(db=mock_orchestration_db)):
        out = handle_timeout.lambda_handler(event, None)
        assert out["workflowStatus"] == "TIMED_OUT"
        assert out["error"] == "APPROVAL_TIMED_OUT"


def test_worker_handle_failure(mock_orchestration_db):
    event = {
        "recallId": "REC-2026-TEST",
        "orgId": "ORG-APEX-GLOBAL",
        "error": "SNS Service Unavailable",
    }
    with patch.object(handle_failure, "recall_service", RecallService(db=mock_orchestration_db)):
        out = handle_failure.lambda_handler(event, None)
        assert out["workflowStatus"] == "FAILED"
        assert out["error"] == "SNS Service Unavailable"


# ==============================================================================
# 5. SECURITY & TENANT ISOLATION
# ==============================================================================

def test_cross_tenant_recall_approval_rejected(mock_orchestration_db):
    # If caller org is ORG-COMPETITOR, get_item returns None because partition key is ORG#ORG-COMPETITOR
    mock_orchestration_db.get_item.return_value = None
    service = RecallService(db=mock_orchestration_db)

    with pytest.raises(ResourceNotFoundError) as exc_info:
        service.approve_recall(
            recall_id="REC-2026-TEST",
            approver_email="hacker@competitor.com",
            org_id="ORG-COMPETITOR",
        )
    assert "not found in organization 'ORG-COMPETITOR'" in str(exc_info.value)
