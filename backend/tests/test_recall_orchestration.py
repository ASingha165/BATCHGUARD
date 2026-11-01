"""Comprehensive tests for AWS Step Functions recall orchestration, state transitions, and worker tasks."""

import copy
from unittest.mock import MagicMock, patch
import pytest
from backend.services.audit_service import AuditService
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

    def mock_transact(tx_items):
        from boto3.dynamodb.types import TypeDeserializer
        d = TypeDeserializer()
        for tx in tx_items:
            if "Put" in tx:
                item = tx["Put"].get("Item", {})
                if isinstance(item, dict) and any(isinstance(v, dict) for v in item.values()):
                    item = {k: d.deserialize(v) for k, v in item.items()}
                db.put_item(item)
            elif "Delete" in tx:
                key = tx["Delete"].get("Key", {})
                if isinstance(key, dict) and any(isinstance(v, dict) for v in key.values()):
                    key = {k: d.deserialize(v) for k, v in key.items()}
                db.delete_item(pk=key.get("PK"), sk=key.get("SK"))

    db.transact_write_items.side_effect = mock_transact
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


# ==============================================================================
# 6. STAGE 8A REMEDIATIONS: TOKEN SANITIZATION & AUTO-PROGRESSION
# ==============================================================================

def test_task_token_sanitization_in_public_endpoints(mock_orchestration_db):
    """Ensure stepFunctionsTaskToken is never exposed in public get_recall or list_recalls responses."""
    service = RecallService(db=mock_orchestration_db)

    # 1. get_recall must not expose token
    recall = service.get_recall(recall_id="REC-2026-TEST", org_id="ORG-APEX-GLOBAL")
    assert "stepFunctionsTaskToken" not in recall
    assert recall["recallId"] == "REC-2026-TEST"

    # 2. list_recalls must not expose token in items
    mock_orchestration_db.query_by_pk.return_value = (
        [
            {
                "PK": "ORG#ORG-APEX-GLOBAL",
                "SK": "RECALL#REC-2026-TEST",
                "recallId": "REC-2026-TEST",
                "stepFunctionsTaskToken": "SECRET-TOKEN-1234",
                "status": "EXECUTING",
            }
        ],
        None,
    )
    items = service.list_recalls(org_id="ORG-APEX-GLOBAL")
    assert len(items) == 1
    assert "stepFunctionsTaskToken" not in items[0]


def test_acknowledge_recall_auto_progression(mock_orchestration_db):
    """Ensure acknowledge_recall auto-progresses status and releases lock upon full quarantine completion."""
    recall_record = {
        "PK": "ORG#ORG-APEX-GLOBAL",
        "SK": "RECALL#REC-2026-TEST",
        "recallId": "REC-2026-TEST",
        "batchId": "BG-2024-8891-ORG",
        "orgId": "ORG-APEX-GLOBAL",
        "status": "AWAITING_ACKNOWLEDGEMENTS",
        "hazardClass": "CLASS_I_CRITICAL",
        "totalUnitsAtRisk": 1000,
        "affectedFacilities": ["DC-DENVER-01", "DC-DALLAS-02"],
        "createdAt": "2026-11-01T21:00:00Z",
    }

    ack1 = {
        "PK": "RECALL#REC-2026-TEST",
        "SK": "ACK#DC-DENVER-01",
        "nodeId": "DC-DENVER-01",
        "status": "PENDING",
        "unitsAllocated": 500,
        "unitsQuarantined": 0,
        "physicalHoldVerified": False,
    }
    ack2 = {
        "PK": "RECALL#REC-2026-TEST",
        "SK": "ACK#DC-DALLAS-02",
        "nodeId": "DC-DALLAS-02",
        "status": "PENDING",
        "unitsAllocated": 500,
        "unitsQuarantined": 0,
        "physicalHoldVerified": False,
    }

    def fake_get_item(pk, sk):
        if pk == "ORG#ORG-APEX-GLOBAL" and sk == "RECALL#REC-2026-TEST":
            return dict(recall_record)
        if pk == "RECALL#REC-2026-TEST" and sk == "ACK#DC-DENVER-01":
            return dict(ack1)
        if pk == "RECALL#REC-2026-TEST" and sk == "ACK#DC-DALLAS-02":
            return dict(ack2)
        return None

    mock_orchestration_db.get_item.side_effect = fake_get_item

    # When querying acks for DC-DENVER-01 alone
    mock_orchestration_db.query_by_pk.return_value = (
        [
            {"PK": "RECALL#REC-2026-TEST", "SK": "ACK#DC-DENVER-01", "nodeId": "DC-DENVER-01", "status": "HOLD_VERIFIED", "physicalHoldVerified": True, "unitsQuarantined": 500},
            {"PK": "RECALL#REC-2026-TEST", "SK": "ACK#DC-DALLAS-02", "nodeId": "DC-DALLAS-02", "status": "PENDING", "physicalHoldVerified": False, "unitsQuarantined": 0},
        ],
        None,
    )

    service = RecallService(db=mock_orchestration_db)
    req1 = AcknowledgeRecallRequest(
        nodeId="DC-DENVER-01",
        acknowledgedBy="ops.mgr@apex.internal",
        unitsQuarantined=500,
        posScanBlockApplied=True,
        physicalHoldVerified=True,
    )

    ack_res = service.acknowledge_recall(
        recall_id="REC-2026-TEST",
        payload=req1,
        org_id="ORG-APEX-GLOBAL",
    )
    assert ack_res["nodeId"] == "DC-DENVER-01"
    assert ack_res["status"] == "HOLD_VERIFIED"

    # Verify status transitioned to PARTIALLY_ACKNOWLEDGED
    put_recalls = [
        call[0][0] for call in mock_orchestration_db.put_item.call_args_list
        if isinstance(call[0][0], dict) and call[0][0].get("SK") == "RECALL#REC-2026-TEST"
    ]
    assert len(put_recalls) > 0
    assert put_recalls[-1]["status"] == "PARTIALLY_ACKNOWLEDGED"

    # Update recall_record status
    recall_record["status"] = "PARTIALLY_ACKNOWLEDGED"

    # Now simulate both nodes fully verified
    mock_orchestration_db.query_by_pk.return_value = (
        [
            {"PK": "RECALL#REC-2026-TEST", "SK": "ACK#DC-DENVER-01", "nodeId": "DC-DENVER-01", "status": "HOLD_VERIFIED", "physicalHoldVerified": True, "unitsQuarantined": 500},
            {"PK": "RECALL#REC-2026-TEST", "SK": "ACK#DC-DALLAS-02", "nodeId": "DC-DALLAS-02", "status": "HOLD_VERIFIED", "physicalHoldVerified": True, "unitsQuarantined": 500},
        ],
        None,
    )

    req2 = AcknowledgeRecallRequest(
        nodeId="DC-DALLAS-02",
        acknowledgedBy="ops.mgr2@apex.internal",
        unitsQuarantined=500,
        posScanBlockApplied=True,
        physicalHoldVerified=True,
    )
    service.acknowledge_recall(
        recall_id="REC-2026-TEST",
        payload=req2,
        org_id="ORG-APEX-GLOBAL",
    )

    # Verify status transitioned to COMPLETED and active recall lock released
    put_recalls_final = [
        call[0][0] for call in mock_orchestration_db.put_item.call_args_list
        if isinstance(call[0][0], dict) and call[0][0].get("SK") == "RECALL#REC-2026-TEST"
    ]
    assert put_recalls_final[-1]["status"] == "COMPLETED"

    # Verify atomic lock was deleted
    mock_orchestration_db.delete_item.assert_called_with(
        pk="ORG#ORG-APEX-GLOBAL", sk="ACTIVE_RECALL#BG-2024-8891-ORG"
    )


def test_acknowledge_recall_rejected_when_recall_in_terminal_state(mock_orchestration_db):
    """Attempting to acknowledge a recall in terminal state (e.g. REJECTED, COMPLETED) raises InvalidStateTransitionError."""
    mock_orchestration_db.get_item.return_value = {
        "PK": "ORG#ORG-APEX-GLOBAL",
        "SK": "RECALL#REC-2026-TEST",
        "recallId": "REC-2026-TEST",
        "batchId": "BG-2024-8891-ORG",
        "orgId": "ORG-APEX-GLOBAL",
        "status": "REJECTED",
    }
    service = RecallService(db=mock_orchestration_db)
    req = AcknowledgeRecallRequest(
        nodeId="DC-DENVER-01",
        acknowledgedBy="ops.mgr@apex.internal",
        unitsQuarantined=500,
        posScanBlockApplied=True,
        physicalHoldVerified=True,
    )
    with pytest.raises(InvalidStateTransitionError) as exc:
        service.acknowledge_recall(
            recall_id="REC-2026-TEST",
            payload=req,
            org_id="ORG-APEX-GLOBAL",
        )
    assert "Cannot record acknowledgement for recall 'REC-2026-TEST' in terminal state 'REJECTED'" in str(exc.value)


def test_recall_does_not_complete_without_physical_hold_verification(mock_orchestration_db):
    """All facilities acknowledging alert without physical hold verification must NOT complete the recall."""
    recall_record = {
        "PK": "ORG#ORG-APEX-GLOBAL",
        "SK": "RECALL#REC-2026-TEST",
        "recallId": "REC-2026-TEST",
        "batchId": "BG-2024-8891-ORG",
        "orgId": "ORG-APEX-GLOBAL",
        "status": "AWAITING_ACKNOWLEDGEMENTS",
        "hazardClass": "CLASS_I_CRITICAL",
        "totalUnitsAtRisk": 1000,
        "affectedFacilities": ["DC-DENVER-01", "DC-DALLAS-02"],
    }
    ack1 = {
        "PK": "RECALL#REC-2026-TEST",
        "SK": "ACK#DC-DENVER-01",
        "nodeId": "DC-DENVER-01",
        "status": "PENDING",
        "physicalHoldVerified": False,
    }

    def fake_get_item(pk, sk):
        if pk == "ORG#ORG-APEX-GLOBAL" and sk == "RECALL#REC-2026-TEST":
            return dict(recall_record)
        if pk == "RECALL#REC-2026-TEST" and sk == "ACK#DC-DENVER-01":
            return dict(ack1)
        return None

    mock_orchestration_db.get_item.side_effect = fake_get_item

    # Both facilities acknowledge receipt, but physicalHoldVerified is FALSE for both
    mock_orchestration_db.query_by_pk.return_value = (
        [
            {"PK": "RECALL#REC-2026-TEST", "SK": "ACK#DC-DENVER-01", "nodeId": "DC-DENVER-01", "status": "ACKNOWLEDGED", "physicalHoldVerified": False, "unitsQuarantined": 0},
            {"PK": "RECALL#REC-2026-TEST", "SK": "ACK#DC-DALLAS-02", "nodeId": "DC-DALLAS-02", "status": "ACKNOWLEDGED", "physicalHoldVerified": False, "unitsQuarantined": 0},
        ],
        None,
    )

    service = RecallService(db=mock_orchestration_db)
    req = AcknowledgeRecallRequest(
        nodeId="DC-DENVER-01",
        acknowledgedBy="ops.mgr@apex.internal",
        unitsQuarantined=0,
        posScanBlockApplied=True,
        physicalHoldVerified=False,  # Physical hold not yet confirmed in cooler
    )
    ack_res = service.acknowledge_recall(
        recall_id="REC-2026-TEST",
        payload=req,
        org_id="ORG-APEX-GLOBAL",
    )
    assert ack_res["status"] == "ACKNOWLEDGED"

    # Status must NOT transition to COMPLETED
    put_recalls = [
        call[0][0] for call in mock_orchestration_db.put_item.call_args_list
        if isinstance(call[0][0], dict) and call[0][0].get("SK") == "RECALL#REC-2026-TEST"
    ]
    if len(put_recalls) > 0:
        assert put_recalls[-1]["status"] != "COMPLETED"
        assert put_recalls[-1]["status"] == "PARTIALLY_ACKNOWLEDGED"

    # Lock must NOT be deleted
    delete_calls = [
        call for call in mock_orchestration_db.delete_item.call_args_list
        if call[1].get("sk", "").startswith("ACTIVE_RECALL#")
    ]
    assert len(delete_calls) == 0


def test_duplicate_acknowledgement_idempotent_update(mock_orchestration_db):
    """Submitting multiple acknowledgements for the same node idempotently updates the node status."""
    recall_record = {
        "PK": "ORG#ORG-APEX-GLOBAL",
        "SK": "RECALL#REC-2026-TEST",
        "recallId": "REC-2026-TEST",
        "batchId": "BG-2024-8891-ORG",
        "orgId": "ORG-APEX-GLOBAL",
        "status": "PARTIALLY_ACKNOWLEDGED",
        "hazardClass": "CLASS_I_CRITICAL",
        "totalUnitsAtRisk": 500,
    }
    ack_store = {
        ("RECALL#REC-2026-TEST", "ACK#DC-DENVER-01"): {
            "PK": "RECALL#REC-2026-TEST",
            "SK": "ACK#DC-DENVER-01",
            "nodeId": "DC-DENVER-01",
            "status": "ACKNOWLEDGED",
            "unitsQuarantined": 200,
            "physicalHoldVerified": False,
        }
    }

    def fake_get_item(pk, sk):
        if pk == "ORG#ORG-APEX-GLOBAL" and sk == "RECALL#REC-2026-TEST":
            return dict(recall_record)
        return ack_store.get((pk, sk))

    def fake_put_item(item):
        if item.get("SK", "").startswith("ACK#"):
            ack_store[(item["PK"], item["SK"])] = dict(item)
        return item

    mock_orchestration_db.get_item.side_effect = fake_get_item
    mock_orchestration_db.put_item.side_effect = fake_put_item
    mock_orchestration_db.query_by_pk.return_value = (list(ack_store.values()), None)

    service = RecallService(db=mock_orchestration_db)

    # First acknowledgement update: verified hold is still False
    req1 = AcknowledgeRecallRequest(
        nodeId="DC-DENVER-01",
        acknowledgedBy="supervisor@apex.internal",
        unitsQuarantined=200,
        posScanBlockApplied=True,
        physicalHoldVerified=False,
    )
    res1 = service.acknowledge_recall(recall_id="REC-2026-TEST", payload=req1, org_id="ORG-APEX-GLOBAL")
    assert res1["status"] == "ACKNOWLEDGED"
    assert res1["physicalHoldVerified"] is False

    # Second acknowledgement update: warehouse manager confirms physical cooler lock
    req2 = AcknowledgeRecallRequest(
        nodeId="DC-DENVER-01",
        acknowledgedBy="supervisor@apex.internal",
        unitsQuarantined=200,
        posScanBlockApplied=True,
        physicalHoldVerified=True,
    )
    res2 = service.acknowledge_recall(recall_id="REC-2026-TEST", payload=req2, org_id="ORG-APEX-GLOBAL")
    assert res2["status"] == "HOLD_VERIFIED"
    assert res2["physicalHoldVerified"] is True
    # The record key remains identical
    assert len(ack_store) == 1



def test_worker_dispatch_notifications_idempotent(monkeypatch):
    """Duplicate invocation of dispatch_notifications worker suppresses duplicate SNS broadcasts."""
    from backend.workers import dispatch_notifications
    stored_items = {}

    def mock_get(pk, sk):
        return stored_items.get((pk, sk))

    def mock_put(item):
        stored_items[(item["PK"], item["SK"])] = copy.deepcopy(item)
        return item

    monkeypatch.setattr(dispatch_notifications.db_client, "get_item", mock_get)
    monkeypatch.setattr(dispatch_notifications.db_client, "put_item", mock_put)

    event = {
        "recallId": "REC-2026-SNS-IDEMP",
        "batchId": "BG-2024-8891-ORG",
        "hazardClass": "CLASS_I_CRITICAL",
        "reason": "Undeclared allergen",
        "impactedNodesCount": 3,
    }

    # First invocation
    res1 = dispatch_notifications.lambda_handler(event, None)
    assert res1["notificationsDispatched"] is True
    assert res1["deduplicated"] is False
    assert (f"RECALL#REC-2026-SNS-IDEMP", "DISPATCH#EMERGENCY_BROADCAST") in stored_items

    # Second invocation (simulated Step Functions worker retry)
    res2 = dispatch_notifications.lambda_handler(event, None)
    assert res2["notificationsDispatched"] is True
    assert res2["deduplicated"] is True
    assert res2["dispatchId"] == res1["dispatchId"]


def test_worker_quarantine_tasks_idempotent(mock_orchestration_db):
    """Duplicate invocation of quarantine task creation preserves existing task status."""
    stored_tasks = {}

    def fake_get(pk, sk):
        return copy.deepcopy(stored_tasks.get((pk, sk)))

    def fake_put(item):
        stored_tasks[(item["PK"], item["SK"])] = copy.deepcopy(item)
        return item

    mock_orchestration_db.get_item.side_effect = fake_get
    mock_orchestration_db.put_item.side_effect = fake_put

    service = RecallService(db=mock_orchestration_db)
    impacted_nodes = [
        {"nodeId": "DC-NORTH", "nodeName": "North DC", "nodeType": "PRIMARY_DC", "lotAllocation": 500},
        {"nodeId": "CARRIER-1", "nodeName": "Transit Fleet 1", "nodeType": "LOGISTICS_CARRIER", "lotAllocation": 200},
    ]

    # First run
    tasks1 = service.create_quarantine_tasks("REC-IDEMP", "BG-1", impacted_nodes)
    assert len(tasks1) == 2
    task_id_north = tasks1[0]["taskId"]

    # Simulate facility updating hold verification
    stored_tasks[("RECALL#REC-IDEMP", "TASK#QUARANTINE#DC-NORTH")]["physicalHoldVerified"] = True
    stored_tasks[("RECALL#REC-IDEMP", "TASK#QUARANTINE#DC-NORTH")]["quarantineStatus"] = "HOLD_VERIFIED"

    # Second run (worker retry)
    tasks2 = service.create_quarantine_tasks("REC-IDEMP", "BG-1", impacted_nodes)
    assert len(tasks2) == 2
    assert tasks2[0]["taskId"] == task_id_north
    assert tasks2[0]["physicalHoldVerified"] is True, "Must preserve existing physical hold status"
    assert tasks2[0]["quarantineStatus"] == "HOLD_VERIFIED"


def test_worker_carrier_intercepts_idempotent(monkeypatch):
    """Duplicate invocation of carrier intercept worker does not overwrite existing records."""
    from backend.workers import identify_carrier_intercepts
    stored_intercepts = {}

    def mock_get(pk, sk):
        return stored_intercepts.get((pk, sk))

    def mock_put(item):
        stored_intercepts[(item["PK"], item["SK"])] = copy.deepcopy(item)
        return item

    monkeypatch.setattr(identify_carrier_intercepts.db_client, "get_item", mock_get)
    monkeypatch.setattr(identify_carrier_intercepts.db_client, "put_item", mock_put)

    event = {
        "recallId": "REC-CARRIER-TEST",
        "batchId": "BG-1",
        "impactedNodes": [
            {"nodeId": "CARRIER-99", "nodeName": "Speedy Fleet", "nodeType": "LOGISTICS_CARRIER", "remainingUnits": 100},
        ],
    }

    res1 = identify_carrier_intercepts.lambda_handler(event, None)
    assert res1["carrierInterceptsOrdered"] == 1
    ordered_time_1 = stored_intercepts[("RECALL#REC-CARRIER-TEST", "INTERCEPT#CARRIER-99")]["orderedAt"]

    # Second run
    res2 = identify_carrier_intercepts.lambda_handler(event, None)
    assert res2["carrierInterceptsOrdered"] == 1
    ordered_time_2 = stored_intercepts[("RECALL#REC-CARRIER-TEST", "INTERCEPT#CARRIER-99")]["orderedAt"]
    assert ordered_time_1 == ordered_time_2, "Timestamp must not be overwritten on retry"


def test_worker_record_audit_entry_idempotent(monkeypatch):
    """Worker retries do not create duplicate audit records in the hash chain."""
    from backend.workers import record_audit_entry
    service = AuditService()
    mock_record_event = MagicMock()
    mock_record_event.return_value = {"eventId": "AUD-TEST-EVENT", "recordHash": "0x123"}
    monkeypatch.setattr(record_audit_entry.audit_service, "record_event", mock_record_event)

    event = {
        "recallId": "REC-AUDIT-IDEMP",
        "batchId": "BG-1",
        "auditAction": "RECALL_WORKFLOW_ORCHESTRATED",
    }

    res = record_audit_entry.lambda_handler(event, None)
    assert res["auditStatus"] == "RECORDED"
    assert res["auditEventId"] == "AUD-TEST-EVENT"
    mock_record_event.assert_called_once()
    assert mock_record_event.call_args[1]["idempotency_key"] == "SFN#REC-AUDIT-IDEMP#RECALL_WORKFLOW_ORCHESTRATED"


def test_atomic_terminal_completion_and_lock_release_transaction(mock_orchestration_db):
    """Verifies transition to terminal state COMPLETED executes TransactWriteItems atomically."""
    recall_record = {
        "PK": "ORG#ORG-APEX-GLOBAL",
        "SK": "RECALL#REC-2026-TEST",
        "recallId": "REC-2026-TEST",
        "batchId": "BG-2024-8891-ORG",
        "orgId": "ORG-APEX-GLOBAL",
        "status": "PARTIALLY_ACKNOWLEDGED",
    }
    mock_orchestration_db.get_item.return_value = dict(recall_record)

    service = RecallService(db=mock_orchestration_db)
    service.transition_recall_status(
        recall_id="REC-2026-TEST",
        target_status="COMPLETED",
        org_id="ORG-APEX-GLOBAL",
        actor="compliance@apex.com",
    )

    # TransactWriteItems must have been called
    assert mock_orchestration_db.transact_write_items.called


def test_simultaneous_completion_requests_race_condition(mock_orchestration_db):
    """Concurrent completion attempts collide on condition and reject duplicate transitions."""
    recall_record = {
        "PK": "ORG#ORG-APEX-GLOBAL",
        "SK": "RECALL#REC-2026-TEST",
        "recallId": "REC-2026-TEST",
        "batchId": "BG-2024-8891-ORG",
        "orgId": "ORG-APEX-GLOBAL",
        "status": "PARTIALLY_ACKNOWLEDGED",
    }
    mock_orchestration_db.get_item.return_value = dict(recall_record)

    # Simulate transaction conflict on second simultaneous invocation
    def conflict_transact(tx_items):
        raise IdempotencyConflictError("DynamoDB transaction cancelled: TransactionCanceledException [ConditionalCheckFailed]")

    mock_orchestration_db.transact_write_items.side_effect = conflict_transact

    service = RecallService(db=mock_orchestration_db)
    with pytest.raises(InvalidStateTransitionError) as exc_info:
        service.transition_recall_status(
            recall_id="REC-2026-TEST",
            target_status="COMPLETED",
            org_id="ORG-APEX-GLOBAL",
            actor="compliance@apex.com",
        )

    assert "Concurrent status mutation or lock conflict" in str(exc_info.value)
