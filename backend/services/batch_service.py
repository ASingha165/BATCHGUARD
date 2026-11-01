"""Batch and lineage business logic service."""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from backend.common.config import config
from backend.common.db import DynamoDBClient, db_client
from backend.common.exceptions import ResourceNotFoundError
from backend.common.logger import get_logger
from backend.models.schemas import CreateBatchRequest

logger = get_logger("batchguard.services.batch")


class BatchService:
    def __init__(self, db: Optional[DynamoDBClient] = None):
        self.db = db or db_client

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
    ) -> List[Dict[str, Any]]:
        """Queries all production batches for the organization."""
        pk = f"ORG#{org_id}"
        return self.db.query_by_pk(pk=pk, sk_prefix="BATCH#", limit=limit)

    def get_lineage(self, batch_id: str) -> Dict[str, Any]:
        """Queries upstream ingredient events and downstream distribution records."""
        pk = f"BATCH#{batch_id}"
        raw_items = self.db.query_by_pk(pk=pk, limit=100)

        upstream = [i for i in raw_items if i.get("SK", "").startswith("INGREDIENT#")]
        downstream = [i for i in raw_items if i.get("SK", "").startswith("DIST#")]

        return {
            "batchId": batch_id,
            "upstream": upstream,
            "downstream": downstream,
        }

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

        self.db.put_item(batch_item)

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

