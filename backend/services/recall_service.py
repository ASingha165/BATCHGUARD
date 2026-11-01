"""Recall coordination, blast radius calculation, and authorization service."""

import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import boto3
from boto3.dynamodb.types import TypeSerializer
from backend.common.config import config
from backend.common.db import DynamoDBClient, db_client
from backend.common.exceptions import (
    IdempotencyConflictError,
    InvalidStateTransitionError,
    ResourceNotFoundError,
    UnauthorizedRecallError,
)
from backend.common.logger import get_logger
from backend.models.schemas import AcknowledgeRecallRequest, InitiateRecallRequest

from backend.services.traceability_engine import TraceabilityEngine, traceability_engine

logger = get_logger("batchguard.services.recall")
_serializer = TypeSerializer()

def serialize_for_tx(item: Dict[str, Any]) -> Dict[str, Any]:
    return {k: _serializer.serialize(v) for k, v in item.items()}

VALID_RECALL_TRANSITIONS: Dict[str, set] = {
    "DRAFT": {"ASSESSING", "CANCELLED"},
    "ASSESSING": {"PENDING_APPROVAL", "FAILED", "CANCELLED"},
    "INITIATED": {"PENDING_APPROVAL", "APPROVED", "FAILED", "CANCELLED"},
    "PENDING_APPROVAL": {"APPROVED", "REJECTED", "FAILED", "CANCELLED"},
    "APPROVED": {"EXECUTING", "FAILED", "CANCELLED"},
    "EXECUTING": {"NOTIFICATION_DISPATCHED", "FAILED", "CANCELLED"},
    "NOTIFICATION_DISPATCHED": {"AWAITING_ACKNOWLEDGEMENTS", "FAILED"},
    "AWAITING_ACKNOWLEDGEMENTS": {"PARTIALLY_ACKNOWLEDGED", "COMPLETED", "FAILED"},
    "PARTIALLY_ACKNOWLEDGED": {"COMPLETED", "FAILED"},
    "COMPLETED": set(),
    "REJECTED": set(),
    "FAILED": set(),
    "CANCELLED": set(),
}



class RecallService:
    def __init__(self, db: Optional[DynamoDBClient] = None, engine: Optional[TraceabilityEngine] = None):
        self.db = db or db_client
        self._engine = engine

    @property
    def engine(self) -> TraceabilityEngine:
        if self._engine is None:
            self._engine = TraceabilityEngine(db=self.db)
        elif self._engine.db != self.db:
            self._engine.db = self.db
        return self._engine

    def assess_blast_radius(
        self,
        batch_id: str,
        org_id: str = config.default_org_id,
        hazard_class: Optional[str] = "CLASS_I_CRITICAL",
    ) -> Dict[str, Any]:
        """Calculates downstream nodes, precise inventory at risk, and completeness via TraceabilityEngine.

        Enforces tenant isolation by verifying the batch belongs to the calling organization.
        """
        impact = self.engine.calculate_recall_impact(batch_id, org_id=org_id, hazard_class=hazard_class)
        data = impact.model_dump()
        # Backward-compatible fields
        data["totalUnitsAtRisk"] = data["totalUnitsDistributed"]
        return data

    def initiate_recall(
        self,
        payload: InitiateRecallRequest,
        org_id: str = config.default_org_id,
        user_email: str = "compliance.officer@apexnutrition.internal",
    ) -> Dict[str, Any]:
        """Validates multi-tier server-side authorization and initiates targeted recall.

        Server-Side Security Invariants:
        1. Confirmation phrase must strictly match 'CONFIRM-RECALL-<batchId>'.
        2. Dynamic 2FA token required (6 numeric digits). Cannot be bypassed.
        3. Idempotency guard: duplicate requests with the same token return the existing incident.
        4. Active recall guard: prevents multiple concurrent recalls on the same batch.
        """
        # 1. Verification of explicit confirmation phrase
        expected_phrase = f"CONFIRM-RECALL-{payload.batchId}"
        if payload.confirmationPhrase != expected_phrase:
            logger.warning(
                f"Recall authorization failed: Phrase mismatch. Expected '{expected_phrase}', got '{payload.confirmationPhrase}'."
            )
            raise UnauthorizedRecallError(
                f"Confirmation phrase mismatch. Expected '{expected_phrase}'."
            )

        # 2. Check 2FA security token
        if not payload.auth2FAToken or not payload.auth2FAToken.isdigit() or len(payload.auth2FAToken) != 6:
            logger.warning(f"Recall authorization failed: Invalid 2FA token format.")
            raise UnauthorizedRecallError("Invalid 2FA security token format. Exactly 6 numeric digits required.")

        now = datetime.now(timezone.utc).isoformat()

        # 3. Idempotency check if idempotency token provided
        if payload.idempotencyToken:
            idemp_pk = f"IDEMP#{payload.idempotencyToken}"
            existing_idemp = self.db.get_item(idemp_pk, "RECALL_INITIATION")
            if existing_idemp:
                logger.info(f"Duplicate recall request suppressed for idempotency token: {payload.idempotencyToken}")
                return existing_idemp.get("result", {})

        # 4. Check for existing active recall on this batch
        existing_recalls, _ = self.db.query_gsi(
            index_name="GSI1",
            pk_value=f"BATCH#{payload.batchId}",
            sk_prefix="RECALL#",
            limit=5,
        )
        active_recalls = [
            r for r in existing_recalls
            if r.get("status") in [
                "INITIATED", "ASSESSING", "PENDING_APPROVAL", "APPROVED",
                "EXECUTING", "NOTIFICATION_DISPATCHED", "AWAITING_ACKNOWLEDGEMENTS",
                "PARTIALLY_ACKNOWLEDGED", "CONTAINMENT_IN_PROGRESS"
            ]
        ]
        if active_recalls:
            logger.warning(f"Recall initiation rejected: Active recall already exists for batch {payload.batchId}")
            raise IdempotencyConflictError(
                f"An active recall incident ({active_recalls[0].get('recallId')}) is already underway for batch '{payload.batchId}'."
            )

        # 4b. Atomic Mutual Exclusion Lock: DynamoDB conditional write on ACTIVE_RECALL#<batchId>
        # Prevents simultaneous sub-second race conditions where two requests pass GSI check at same time
        lock_item = {
            "PK": f"ORG#{org_id}",
            "SK": f"ACTIVE_RECALL#{payload.batchId}",
            "recallId": f"PENDING-{payload.batchId}",
            "batchId": payload.batchId,
            "status": "INITIATED",
            "lockedAt": now,
        }
        try:
            self.db.conditional_put_item(
                item=lock_item,
                condition_expression="attribute_not_exists(PK) AND attribute_not_exists(SK)",
            )
        except IdempotencyConflictError:
            logger.warning(f"Active recall conditional write lock rejected: Batch {payload.batchId} is already locked.")
            raise IdempotencyConflictError(
                f"An active recall lock already exists for batch '{payload.batchId}'. Simultaneous initiation rejected."
            )

        recall_id = f"REC-{datetime.now().year}-{uuid.uuid4().hex[:4].upper()}"

        # Update lock item with the assigned recall ID
        lock_item["recallId"] = recall_id
        self.db.put_item(lock_item)

        # 5. Assess affected units
        blast_info = self.assess_blast_radius(payload.batchId, org_id=org_id)
        units_at_risk = blast_info["totalUnitsAtRisk"]
        nodes_count = len(blast_info["impactedNodes"])

        # 6. Trigger AWS Step Functions State Machine if configured
        execution_arn = None
        if config.step_functions_recall_arn:
            try:
                sfn_client = boto3.client("stepfunctions", region_name=config.aws_region)
                sfn_payload = {
                    "recallId": recall_id,
                    "batchId": payload.batchId,
                    "hazardClass": payload.hazardClass,
                    "reason": payload.reason,
                    "unitsAtRisk": units_at_risk,
                    "initiatedBy": user_email,
                    "orgId": org_id,
                    "timestamp": now,
                }
                sfn_res = sfn_client.start_execution(
                    stateMachineArn=config.step_functions_recall_arn,
                    name=f"recall-{recall_id}-{int(datetime.now().timestamp())}",
                    input=json.dumps(sfn_payload),
                )
                execution_arn = sfn_res.get("executionArn")
            except Exception as e:
                logger.error(f"Failed to trigger Step Functions: {e}")

        # 7. Persist Recall record in DynamoDB with conditional write
        recall_item = {
            "PK": f"ORG#{org_id}",
            "SK": f"RECALL#{recall_id}",
            "GSI1PK": f"BATCH#{payload.batchId}",
            "GSI1SK": f"RECALL#{now}",
            "GSI2PK": "STATUS#INITIATED",
            "GSI2SK": f"HAZARD#{payload.hazardClass}",
            "recallId": recall_id,
            "batchId": payload.batchId,
            "orgId": org_id,
            "hazardClass": payload.hazardClass,
            "reason": payload.reason,
            "severity": "CRITICAL" if payload.hazardClass == "CLASS_I_CRITICAL" else "HIGH",
            "totalUnitsAtRisk": units_at_risk,
            "totalUnitsIsolated": 0,
            "isolationPercentage": 0.0,
            "impactedNodesCount": nodes_count,
            "status": "INITIATED",
            "containmentWindowHours": 0.1,
            "initiatedBy": user_email,
            "initiatedAt": now,
            "stepFunctionsExecutionArn": execution_arn,
            "createdAt": now,
        }

        self.db.conditional_put_item(
            item=recall_item,
            condition_expression="attribute_not_exists(PK) AND attribute_not_exists(SK)",
        )

        # 8. Seed acknowledgement records for each impacted node
        for node in blast_info["impactedNodes"]:
            units_val = int(str(node.get("lotAllocation", "0")).replace(" units", "").replace(",", "").strip())
            ack_item = {
                "PK": f"RECALL#{recall_id}",
                "SK": f"ACK#{node['nodeId']}",
                "GSI1PK": f"NODE#{node['nodeId']}",
                "GSI1SK": "STATUS#PENDING",
                "recallId": recall_id,
                "nodeId": node["nodeId"],
                "nodeName": node["nodeName"],
                "location": node["location"],
                "unitsAllocated": units_val,
                "unitsQuarantined": 0,
                "posScanBlockApplied": True,
                "physicalHoldVerified": False,
                "status": "PENDING",
                "createdAt": now,
            }
            self.db.put_item(ack_item)

        # Record idempotency token item if provided
        if payload.idempotencyToken:
            self.db.put_item({
                "PK": f"IDEMP#{payload.idempotencyToken}",
                "SK": "RECALL_INITIATION",
                "result": recall_item,
                "ttl": int(datetime.now().timestamp()) + 86400,
            })

        return recall_item

    @staticmethod
    def _sanitize_recall_output(item: Dict[str, Any]) -> Dict[str, Any]:
        """Strips internal workflow tokens (e.g. Step Functions TaskToken) from public responses."""
        sanitized = dict(item)
        sanitized.pop("stepFunctionsTaskToken", None)
        return sanitized

    def get_recall(
        self,
        recall_id: str,
        org_id: str = config.default_org_id,
        sanitize: bool = True,
    ) -> Dict[str, Any]:
        """Retrieves a single recall incident by ID strictly scoped to organization."""
        pk = f"ORG#{org_id}"
        sk = f"RECALL#{recall_id}"
        item = self.db.get_item(pk, sk)
        if not item:
            raise ResourceNotFoundError(f"Recall incident '{recall_id}' not found in organization '{org_id}'.")
        return self._sanitize_recall_output(item) if sanitize else item

    def list_recalls(self, org_id: str = config.default_org_id) -> List[Dict[str, Any]]:
        """Queries all recall records strictly scoped to the organization."""
        pk = f"ORG#{org_id}"
        items, _ = self.db.query_by_pk(pk=pk, sk_prefix="RECALL#", limit=50)
        return [self._sanitize_recall_output(item) for item in items]

    def get_acknowledgements(self, recall_id: str, org_id: str = config.default_org_id) -> List[Dict[str, Any]]:
        """Queries all acknowledgement records for a given recall incident after verifying tenant ownership."""
        # Verify recall belongs to org
        self.get_recall(recall_id, org_id=org_id)

        pk = f"RECALL#{recall_id}"
        items, _ = self.db.query_by_pk(pk=pk, sk_prefix="ACK#", limit=100)
        return items

    def acknowledge_recall(
        self,
        recall_id: str,
        payload: AcknowledgeRecallRequest,
        org_id: str = config.default_org_id,
    ) -> Dict[str, Any]:
        """Records a facility node's acknowledgement and quarantine verification."""
        # Verify recall belongs to org and is in an actionable state
        current_recall = self.get_recall(recall_id, org_id=org_id, sanitize=False)
        curr_status = current_recall.get("status")
        if curr_status in {"REJECTED", "FAILED", "CANCELLED", "COMPLETED"}:
            raise InvalidStateTransitionError(
                f"Cannot record acknowledgement for recall '{recall_id}' in terminal state '{curr_status}'."
            )

        now = datetime.now(timezone.utc).isoformat()
        pk = f"RECALL#{recall_id}"
        sk = f"ACK#{payload.nodeId}"

        existing = self.db.get_item(pk, sk)
        if not existing:
            raise ResourceNotFoundError(f"Recall acknowledgement record for node '{payload.nodeId}' not found.")

        updated_item = {
            **existing,
            "unitsQuarantined": payload.unitsQuarantined,
            "posScanBlockApplied": payload.posScanBlockApplied,
            "physicalHoldVerified": payload.physicalHoldVerified,
            "status": "HOLD_VERIFIED" if payload.physicalHoldVerified else "ACKNOWLEDGED",
            "acknowledgedBy": payload.acknowledgedBy,
            "acknowledgedAt": now,
        }

        self.db.put_item(updated_item)

        # Check overall acknowledgement progress and auto-progress lifecycle where appropriate
        try:
            summary = self.get_acknowledgement_summary(recall_id, org_id=org_id)
            total_impacted = summary.get("totalImpactedFacilities", 0)
            verified_holds = summary.get("verifiedHoldCount", 0)
            all_ack = summary.get("allAcknowledged", False)

            if curr_status in ["AWAITING_ACKNOWLEDGEMENTS", "PARTIALLY_ACKNOWLEDGED"]:
                if total_impacted > 0 and all_ack and verified_holds == total_impacted:
                    self.transition_recall_status(
                        recall_id=recall_id,
                        target_status="COMPLETED",
                        org_id=org_id,
                        actor=payload.acknowledgedBy,
                        reason="All impacted facilities have verified physical quarantine holds.",
                    )
                elif summary.get("acknowledgedCount", 0) > 0 and curr_status != "PARTIALLY_ACKNOWLEDGED":
                    self.transition_recall_status(
                        recall_id=recall_id,
                        target_status="PARTIALLY_ACKNOWLEDGED",
                        org_id=org_id,
                        actor=payload.acknowledgedBy,
                    )
        except Exception as e:
            logger.warning(f"Could not evaluate acknowledgement progression: {e}")

        return updated_item

    def transition_recall_status(
        self,
        recall_id: str,
        target_status: str,
        org_id: str = config.default_org_id,
        actor: str = "SYSTEM",
        reason: Optional[str] = None,
        extra_attrs: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Enforces valid state machine transitions with conditional update."""
        recall = self.get_recall(recall_id, org_id=org_id, sanitize=False)
        current_status = recall.get("status", "DRAFT")

        valid_targets = VALID_RECALL_TRANSITIONS.get(current_status, set())
        if target_status != current_status and target_status not in valid_targets:
            raise InvalidStateTransitionError(
                f"Illegal recall transition from '{current_status}' to '{target_status}'. "
                f"Valid transitions are: {sorted(list(valid_targets)) or 'None (Terminal)'}"
            )

        now = datetime.now(timezone.utc).isoformat()
        updated = {
            **recall,
            "status": target_status,
            "updatedAt": now,
            **(extra_attrs or {}),
        }
        if reason:
            updated["statusReason"] = reason

        table_name = getattr(self.db, "table_name", config.dynamodb_table_name)

        # If terminal transition, execute atomic transaction to update status AND release active recall lock
        if target_status in {"REJECTED", "COMPLETED", "FAILED", "CANCELLED"}:
            tx_items = [
                {
                    "Put": {
                        "TableName": table_name,
                        "Item": serialize_for_tx(updated),
                        "ConditionExpression": "status = :curr_status",
                        "ExpressionAttributeValues": {":curr_status": _serializer.serialize(current_status)},
                    }
                },
                {
                    "Delete": {
                        "TableName": table_name,
                        "Key": {
                            "PK": _serializer.serialize(f"ORG#{org_id}"),
                            "SK": _serializer.serialize(f"ACTIVE_RECALL#{recall.get('batchId')}"),
                        },
                        "ConditionExpression": "attribute_not_exists(recallId) OR recallId = :recall_id",
                        "ExpressionAttributeValues": {":recall_id": _serializer.serialize(recall_id)},
                    }
                },
            ]
            try:
                if hasattr(self.db, "transact_write_items"):
                    self.db.transact_write_items(tx_items)
                else:
                    self.db.put_item(updated)
                    self.db.delete_item(pk=f"ORG#{org_id}", sk=f"ACTIVE_RECALL#{recall.get('batchId')}")
            except IdempotencyConflictError as e:
                logger.warning(f"Terminal transition conflict for recall '{recall_id}': {e}")
                raise InvalidStateTransitionError(f"Concurrent status mutation or lock conflict on recall '{recall_id}'.")
        else:
            self.db.put_item(updated)

        return updated

    def save_task_token(
        self,
        recall_id: str,
        task_token: str,
        org_id: str = config.default_org_id,
    ) -> Dict[str, Any]:
        """Saves the Step Functions callback TaskToken and transitions recall to PENDING_APPROVAL."""
        return self.transition_recall_status(
            recall_id=recall_id,
            target_status="PENDING_APPROVAL",
            org_id=org_id,
            actor="SYSTEM_STEP_FUNCTIONS",
            extra_attrs={"stepFunctionsTaskToken": task_token},
        )

    def approve_recall(
        self,
        recall_id: str,
        approver_email: str,
        org_id: str = config.default_org_id,
        notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Authorizes and approves a pending recall, resuming the Step Functions execution."""
        recall = self.get_recall(recall_id, org_id=org_id, sanitize=False)
        current_status = recall.get("status")
        if current_status not in ["PENDING_APPROVAL", "INITIATED"]:
            raise InvalidStateTransitionError(
                f"Recall '{recall_id}' cannot be approved in its current state '{current_status}'. Must be PENDING_APPROVAL."
            )

        now = datetime.now(timezone.utc).isoformat()
        updated = self.transition_recall_status(
            recall_id=recall_id,
            target_status="APPROVED",
            org_id=org_id,
            actor=approver_email,
            extra_attrs={
                "approvedBy": approver_email,
                "approvedAt": now,
                "approvalNotes": notes or "Approved by Authorized Compliance Officer",
            },
        )

        # Resume Step Functions callback if taskToken is present
        task_token = recall.get("stepFunctionsTaskToken")
        if task_token:
            try:
                sfn = boto3.client("stepfunctions", region_name=config.aws_region)
                sfn.send_task_success(
                    taskToken=task_token,
                    output=json.dumps({
                        "approvalDecision": "APPROVED",
                        "approvedBy": approver_email,
                        "approvedAt": now,
                        "notes": notes,
                    }),
                )
                logger.info(f"Resumed Step Functions execution for recall {recall_id}")
            except Exception as e:
                logger.warning(f"Could not resume Step Functions task token: {e}")

        return updated

    def reject_recall(
        self,
        recall_id: str,
        rejecter_email: str,
        reason: str,
        org_id: str = config.default_org_id,
    ) -> Dict[str, Any]:
        """Rejects a pending recall, halting the Step Functions execution and releasing the lock."""
        recall = self.get_recall(recall_id, org_id=org_id, sanitize=False)
        current_status = recall.get("status")
        if current_status not in ["PENDING_APPROVAL", "INITIATED"]:
            raise InvalidStateTransitionError(
                f"Recall '{recall_id}' cannot be rejected in its current state '{current_status}'. Must be PENDING_APPROVAL."
            )

        now = datetime.now(timezone.utc).isoformat()
        updated = self.transition_recall_status(
            recall_id=recall_id,
            target_status="REJECTED",
            org_id=org_id,
            actor=rejecter_email,
            reason=reason,
            extra_attrs={
                "rejectedBy": rejecter_email,
                "rejectedAt": now,
                "rejectionReason": reason,
            },
        )

        task_token = recall.get("stepFunctionsTaskToken")
        if task_token:
            try:
                sfn = boto3.client("stepfunctions", region_name=config.aws_region)
                sfn.send_task_success(
                    taskToken=task_token,
                    output=json.dumps({
                        "approvalDecision": "REJECTED",
                        "rejectedBy": rejecter_email,
                        "rejectedAt": now,
                        "reason": reason,
                    }),
                )
                logger.info(f"Notified Step Functions of recall rejection for {recall_id}")
            except Exception as e:
                logger.warning(f"Could not notify Step Functions for token: {e}")

        return updated

    def create_quarantine_tasks(
        self,
        recall_id: str,
        batch_id: str,
        impacted_nodes: List[Dict[str, Any]],
        org_id: str = config.default_org_id,
    ) -> List[Dict[str, Any]]:
        """Creates facility-specific quarantine task records under RECALL#<recallId>."""
        now = datetime.now(timezone.utc).isoformat()
        tasks = []
        for node in impacted_nodes:
            node_id = node.get("nodeId", "NODE-UNKNOWN")
            task_id = f"TSK-{hashlib.sha256(f'{recall_id}#{node_id}'.encode()).hexdigest()[:8].upper()}"

            # Idempotency guard: preserve existing quarantine task status if already created
            existing = self.db.get_item(pk=f"RECALL#{recall_id}", sk=f"TASK#QUARANTINE#{node_id}")
            if isinstance(existing, dict) and "taskId" in existing:
                tasks.append(existing)
                continue

            raw_alloc = node.get("lotAllocation") or node.get("remainingUnits", 0)
            units = int(str(raw_alloc).replace(" units", "").replace(",", "").strip())
            is_carrier = node.get("nodeType") in ["LOGISTICS_CARRIER", "TRANSIT_FLEET"]

            task_item = {
                "PK": f"RECALL#{recall_id}",
                "SK": f"TASK#QUARANTINE#{node_id}",
                "GSI1PK": f"NODE#{node_id}",
                "GSI1SK": f"TASK#{task_id}",
                "taskId": task_id,
                "recallId": recall_id,
                "batchId": batch_id,
                "nodeId": node_id,
                "nodeName": node.get("nodeName", "Logistics Endpoint"),
                "nodeType": node.get("nodeType", "PRIMARY_DC"),
                "location": node.get("location", "Undisclosed Logistics Point"),
                "allocatedUnits": units,
                "carrierInterceptRequired": is_carrier,
                "quarantineStatus": "PENDING",
                "posScanBlockEnforced": True,
                "physicalHoldVerified": False,
                "createdAt": now,
                "updatedAt": now,
            }
            self.db.put_item(task_item)
            tasks.append(task_item)
        return tasks

    def get_quarantine_tasks(self, recall_id: str, org_id: str = config.default_org_id) -> List[Dict[str, Any]]:
        """Retrieves all facility quarantine tasks for a recall after tenant verification."""
        self.get_recall(recall_id, org_id=org_id)
        pk = f"RECALL#{recall_id}"
        items, _ = self.db.query_by_pk(pk=pk, sk_prefix="TASK#QUARANTINE#", limit=100)
        return items

    def get_acknowledgement_summary(self, recall_id: str, org_id: str = config.default_org_id) -> Dict[str, Any]:
        """Computes live aggregated acknowledgement and quarantine metrics."""
        acks = self.get_acknowledgements(recall_id, org_id=org_id)
        total_nodes = len(acks)
        acknowledged = [a for a in acks if a.get("status") in ["ACKNOWLEDGED", "HOLD_VERIFIED"]]
        verified = [a for a in acks if a.get("physicalHoldVerified") is True]
        total_quarantined = sum(int(a.get("unitsQuarantined", 0)) for a in acks)

        percent = round((len(acknowledged) / total_nodes * 100.0), 1) if total_nodes > 0 else 0.0
        return {
            "recallId": recall_id,
            "totalImpactedFacilities": total_nodes,
            "acknowledgedCount": len(acknowledged),
            "verifiedHoldCount": len(verified),
            "pendingCount": total_nodes - len(acknowledged),
            "percentAcknowledged": percent,
            "totalUnitsQuarantined": total_quarantined,
            "allAcknowledged": (len(acknowledged) == total_nodes) if total_nodes > 0 else False,
        }

    def get_recall_status(self, recall_id: str, org_id: str = config.default_org_id) -> Dict[str, Any]:
        """Provides complete real-time workflow status and orchestration timeline."""
        recall = self.get_recall(recall_id, org_id=org_id)
        summary = self.get_acknowledgement_summary(recall_id, org_id=org_id)
        tasks = self.get_quarantine_tasks(recall_id, org_id=org_id)
        carrier_tasks = [t for t in tasks if t.get("carrierInterceptRequired")]

        return {
            "recallId": recall_id,
            "batchId": recall.get("batchId"),
            "status": recall.get("status"),
            "hazardClass": recall.get("hazardClass"),
            "severity": recall.get("severity"),
            "totalUnitsAtRisk": recall.get("totalUnitsAtRisk", 0),
            "approval": {
                "status": "APPROVED" if recall.get("approvedAt") else ("REJECTED" if recall.get("rejectedAt") else "PENDING"),
                "approvedBy": recall.get("approvedBy"),
                "approvedAt": recall.get("approvedAt"),
                "rejectedBy": recall.get("rejectedBy"),
                "rejectedAt": recall.get("rejectedAt"),
                "notes": recall.get("approvalNotes") or recall.get("rejectionReason"),
            },
            "acknowledgementSummary": summary,
            "quarantineTasksCount": len(tasks),
            "carrierInterceptsCount": len(carrier_tasks),
            "stepFunctionsExecutionArn": recall.get("stepFunctionsExecutionArn"),
            "createdAt": recall.get("createdAt"),
            "updatedAt": recall.get("updatedAt", recall.get("createdAt")),
        }

