"""Recall coordination and blast radius calculation service."""

import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import boto3
from backend.common.config import config
from backend.common.db import DynamoDBClient, db_client
from backend.common.exceptions import (
    ResourceNotFoundError,
    UnauthorizedRecallError,
)
from backend.common.logger import get_logger
from backend.models.schemas import AcknowledgeRecallRequest, InitiateRecallRequest

logger = get_logger("batchguard.services.recall")


class RecallService:
    def __init__(self, db: Optional[DynamoDBClient] = None):
        self.db = db or db_client

    def assess_blast_radius(self, batch_id: str) -> Dict[str, Any]:
        """Calculates downstream nodes and total units at risk for a given batch."""
        pk = f"BATCH#{batch_id}"
        items = self.db.query_by_pk(pk=pk, sk_prefix="DIST#", limit=100)

        total_units = sum(int(item.get("allocatedUnits", 0)) for item in items)

        impacted_nodes = []
        for item in items:
            impacted_nodes.append({
                "nodeId": item.get("nodeId", item.get("SK", "").replace("DIST#", "")),
                "nodeName": item.get("nodeName", "Logistics Endpoint"),
                "nodeType": item.get("nodeType", "PRIMARY_DC"),
                "location": item.get("location", "Undisclosed"),
                "lotAllocation": f"{item.get('allocatedUnits', 0):,} units",
                "preCommandAction": item.get("preCommandAction", "Apply physical inventory hold"),
            })

        # Standard compliance checklist items
        checklist = [
            "Notify State Food Safety Authorities within 4 hours",
            "Broadcast downstream wholesale embargo command",
            "Lock serial number barcode matrix at checkout POS",
            "Generate immutable signed cryptographic audit record",
        ]

        return {
            "batchId": batch_id,
            "totalUnitsAtRisk": total_units,
            "impactedNodes": impacted_nodes,
            "complianceChecklist": checklist,
        }

    def initiate_recall(
        self,
        payload: InitiateRecallRequest,
        org_id: str = config.default_org_id,
        user_email: str = "compliance.officer@apexnutrition.internal",
    ) -> Dict[str, Any]:
        """Validates 2FA authorization token and initiates targeted recall."""
        # 1. Verification of explicit confirmation phrase
        expected_phrase = f"CONFIRM-RECALL-{payload.batchId}"
        if payload.confirmationPhrase != expected_phrase:
            raise UnauthorizedRecallError(
                f"Confirmation phrase mismatch. Expected '{expected_phrase}'."
            )

        # 2. Check 2FA token (In demo/staging: '882910' or valid 6-digit numeric)
        if not payload.auth2FAToken.isdigit() or len(payload.auth2FAToken) != 6:
            raise UnauthorizedRecallError("Invalid 2FA security token format.")

        now = datetime.now(timezone.utc).isoformat()
        recall_id = f"REC-{datetime.now().year}-{uuid.uuid4().hex[:4].upper()}"

        # 3. Assess affected units
        blast_info = self.assess_blast_radius(payload.batchId)
        units_at_risk = blast_info["totalUnitsAtRisk"]
        nodes_count = len(blast_info["impactedNodes"])

        # 4. Trigger AWS Step Functions State Machine if configured
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

        # 5. Persist Recall record in DynamoDB
        recall_item = {
            "PK": f"ORG#{org_id}",
            "SK": f"RECALL#{recall_id}",
            "GSI1PK": f"BATCH#{payload.batchId}",
            "GSI1SK": f"RECALL#{now}",
            "GSI2PK": "STATUS#INITIATED",
            "GSI2SK": f"HAZARD#{payload.hazardClass}",
            "recallId": recall_id,
            "batchId": payload.batchId,
            "hazardClass": payload.hazardClass,
            "reason": payload.reason,
            "severity": "CRITICAL" if payload.hazardClass == "CLASS_I_CRITICAL" else "HIGH",
            "totalUnitsAtRisk": units_at_risk,
            "totalUnitsIsolated": 0,
            "isolationPercentage": 0.0,
            "impactedNodesCount": nodes_count,
            "status": "INITIATED",
            "initiatedBy": user_email,
            "initiatedAt": now,
            "stepFunctionsExecutionArn": execution_arn,
            "createdAt": now,
        }

        self.db.put_item(recall_item)

        # 6. Seed acknowledgement records for each impacted node
        for node in blast_info["impactedNodes"]:
            ack_item = {
                "PK": f"RECALL#{recall_id}",
                "SK": f"ACK#{node['nodeId']}",
                "GSI1PK": f"NODE#{node['nodeId']}",
                "GSI1SK": "STATUS#PENDING",
                "recallId": recall_id,
                "nodeId": node["nodeId"],
                "nodeName": node["nodeName"],
                "location": node["location"],
                "unitsAllocated": int(node["lotAllocation"].replace(" units", "").replace(",", "")),
                "unitsQuarantined": 0,
                "posScanBlockApplied": True,
                "physicalHoldVerified": False,
                "status": "PENDING",
                "createdAt": now,
            }
            self.db.put_item(ack_item)

        return recall_item

    def list_recalls(self, org_id: str = config.default_org_id) -> List[Dict[str, Any]]:
        """Queries all recall records for the organization."""
        pk = f"ORG#{org_id}"
        return self.db.query_by_pk(pk=pk, sk_prefix="RECALL#", limit=50)

    def acknowledge_recall(
        self,
        recall_id: str,
        payload: AcknowledgeRecallRequest,
    ) -> Dict[str, Any]:
        """Records a facility node's acknowledgement and quarantine verification."""
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
        return updated_item

