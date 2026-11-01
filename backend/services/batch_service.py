"""Batch and lineage business logic service."""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from backend.common.config import config
from backend.common.db import DynamoDBClient, db_client
from backend.common.exceptions import ResourceNotFoundError
from backend.common.logger import get_logger
from backend.models.schemas import CreateBatchRequest
from backend.services.traceability_engine import TraceabilityEngine, traceability_engine

logger = get_logger("batchguard.services.batch")


class BatchService:
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

    def get_batch(self, batch_id: str, org_id: str = config.default_org_id) -> Dict[str, Any]:
        """Fetches batch details from DynamoDB single table."""
        pk = f"ORG#{org_id}"
        sk = f"BATCH#{batch_id}"
        item = self.db.get_item(pk, sk)
        if not item:
            raise ResourceNotFoundError(f"Batch '{batch_id}' not found in organization '{org_id}'.")
        return item

    def list_batches(
        self,
        org_id: str = config.default_org_id,
        limit: int = 50,
        exclusive_start_key: Optional[Dict[str, Any]] = None,
    ) -> Tuple[List[Dict[str, Any]], Optional[Dict[str, Any]]]:
        """Queries all production batches for the organization with pagination support."""
        pk = f"ORG#{org_id}"
        return self.db.query_by_pk(
            pk=pk,
            sk_prefix="BATCH#",
            limit=limit,
            exclusive_start_key=exclusive_start_key,
        )

    def get_lineage(self, batch_id: str, org_id: str = config.default_org_id) -> Dict[str, Any]:
        """Reconstructs the full upstream and downstream lineage graph with KDE completeness scoring."""
        graph = self.engine.get_full_traceability(batch_id=batch_id, org_id=org_id)
        data = graph.model_dump()

        # Provide both flat lists for backward compatibility and full graph models
        return {
            "batchId": batch_id,
            "productName": data.get("productName"),
            "gtin": data.get("gtin"),
            "lotNumber": data.get("lotNumber"),
            "upstream": [
                {
                    "rawLotId": u["lotId"],
                    "ingredient": u["ingredientName"],
                    "supplier": u["supplierName"],
                    "supplierId": u["supplierId"],
                    "farmLocation": u["farmLocation"],
                    "facilityGln": u["facilityGln"],
                    "harvestTimestamp": u["harvestTimestamp"],
                    "quantityUsed": u["quantityUsed"],
                    "tests": u["tests"],
                    "depth": u["depth"],
                    "cycleDetected": u["cycleDetected"],
                }
                for u in data.get("upstreamTree", [])
            ],
            "downstream": [
                {
                    "nodeId": d["nodeId"],
                    "nodeName": d["nodeName"],
                    "nodeType": d["nodeType"],
                    "gln": d["gln"],
                    "location": d["location"],
                    "allocatedUnits": d["shippedUnits"],
                    "shippedUnits": d["shippedUnits"],
                    "receivedUnits": d["receivedUnits"],
                    "remainingUnits": d["remainingUnits"],
                    "quarantinedUnits": d["quarantinedUnits"],
                    "isInventoryConfirmed": d["isInventoryConfirmed"],
                    "status": "QUARANTINED" if d["quarantinedUnits"] > 0 else "IN_STORAGE",
                    "preCommandAction": d["preCommandAction"],
                }
                for d in data.get("downstreamNetwork", [])
            ],
            "eventsTimeline": data.get("eventsTimeline", []),
            "impactSummary": data.get("impactSummary"),
            "traceabilityCompleteness": data.get("traceabilityCompleteness"),
            "warnings": data.get("warnings", []),
            "paginationKey": data.get("paginationKey"),
        }

    def get_traceability(
        self,
        batch_id: str,
        org_id: str = config.default_org_id,
        limit: int = 50,
        exclusive_start_key: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Returns the complete, authoritative multi-tier graph dossier for the batch."""
        graph = self.engine.get_full_traceability(
            batch_id=batch_id,
            org_id=org_id,
            limit=limit,
            exclusive_start_key=exclusive_start_key,
        )
        return graph.model_dump()

    def create_batch(
        self,
        payload: CreateBatchRequest,
        org_id: str = config.default_org_id,
    ) -> Dict[str, Any]:
        """Registers a new batch record and associated ingredient events."""
        now = datetime.now(timezone.utc).isoformat()
        batch_id = f"BG-{datetime.now().year}-{uuid.uuid4().hex[:6].upper()}"

        batch_item = {
            "PK": f"ORG#{org_id}",
            "SK": f"BATCH#{batch_id}",
            "GSI1PK": f"GTIN#{payload.gtin}",
            "GSI1SK": f"BATCH#{now}",
            "GSI2PK": "STATUS#RELEASED",
            "GSI2SK": now,
            "batchId": batch_id,
            "lotNumber": payload.lotNumber,
            "gtin": payload.gtin,
            "productName": payload.productName,
            "initialQuantity": payload.initialQuantity,
            "currentQuantity": payload.initialQuantity,
            "unitOfMeasure": payload.unitOfMeasure,
            "supplierId": payload.supplierId,
            "facilityGln": payload.facilityGln,
            "harvestDate": payload.harvestDate,
            "productionDate": payload.productionDate,
            "expirationDate": payload.expirationDate,
            "status": "RELEASED",
            "coldChainOptimal": True,
            "currentTempCelsius": 3.2,
            "createdAt": now,
        }

        # Idempotency guard: ensure batch doesn't already exist
        self.db.conditional_put_item(
            item=batch_item,
            condition_expression="attribute_not_exists(PK) AND attribute_not_exists(SK)",
        )

        # Store upstream ingredient items if provided
        for ing in payload.ingredients or []:
            ing_item = {
                "PK": f"BATCH#{batch_id}",
                "SK": f"INGREDIENT#{ing.rawLotId}",
                "rawLotId": ing.rawLotId,
                "ingredient": ing.ingredient,
                "supplierId": ing.supplierId,
                "harvestDate": ing.harvestDate,
                "createdAt": now,
            }
            self.db.put_item(ing_item)

        return batch_item
