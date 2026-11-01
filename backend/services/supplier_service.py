"""Supplier management business logic service."""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from backend.common.config import config
from backend.common.db import DynamoDBClient, db_client
from backend.common.exceptions import ResourceNotFoundError
from backend.common.logger import get_logger
from backend.models.schemas import CreateSupplierRequest

logger = get_logger("batchguard.services.supplier")


class SupplierService:
    def __init__(self, db: Optional[DynamoDBClient] = None):
        self.db = db or db_client

    def list_suppliers(self, org_id: str = config.default_org_id) -> List[Dict[str, Any]]:
        """Queries all registered suppliers for the organization."""
        pk = f"ORG#{org_id}"
        items, _ = self.db.query_by_pk(pk=pk, sk_prefix="SUPPLIER#", limit=100)
        return items

    def get_supplier(self, supplier_id: str, org_id: str = config.default_org_id) -> Dict[str, Any]:
        """Retrieves a single supplier by ID."""
        pk = f"ORG#{org_id}"
        sk = f"SUPPLIER#{supplier_id}"
        item = self.db.get_item(pk, sk)
        if not item:
            raise ResourceNotFoundError(f"Supplier '{supplier_id}' not found.")
        return item

    def create_supplier(
        self,
        payload: CreateSupplierRequest,
        org_id: str = config.default_org_id,
    ) -> Dict[str, Any]:
        """Enrolls a new verified farm or processor in the single-table registry."""
        now = datetime.now(timezone.utc).isoformat()
        supplier_id = f"SUP-{uuid.uuid4().hex[:4].upper()}"

        supplier_item = {
            "PK": f"ORG#{org_id}",
            "SK": f"SUPPLIER#{supplier_id}",
            "GSI1PK": "TYPE#SUPPLIER",
            "GSI1SK": f"ACTIVE#{payload.supplierName}",
            "supplierId": supplier_id,
            "supplierName": payload.supplierName,
            "tier": payload.tier,
            "facilityLocation": payload.facilityLocation,
            "primaryCrop": payload.primaryCrop,
            "certifications": payload.certifications or ["GLOBAL_GAP"],
            "verificationStatus": "VERIFIED",
            "auditScore": 98.5,
            "contactEmail": payload.contactEmail,
            "createdAt": now,
        }

        self.db.conditional_put_item(
            item=supplier_item,
            condition_expression="attribute_not_exists(PK) AND attribute_not_exists(SK)",
        )

        return supplier_item

