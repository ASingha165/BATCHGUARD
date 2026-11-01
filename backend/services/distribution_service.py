"""Distribution network and logistics tracking service."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from backend.common.config import config
from backend.common.db import DynamoDBClient, db_client
from backend.common.exceptions import ResourceNotFoundError
from backend.common.logger import get_logger
from backend.models.schemas import CreateDistributionNodeRequest

logger = get_logger("batchguard.services.distribution")


class DistributionService:
    def __init__(self, db: Optional[DynamoDBClient] = None):
        self.db = db or db_client

    def list_nodes(self, org_id: str = config.default_org_id) -> List[Dict[str, Any]]:
        """Queries all distribution nodes (DCs, carriers, retailers) for the organization."""
        pk = f"ORG#{org_id}"
        items, _ = self.db.query_by_pk(pk=pk, sk_prefix="NODE#", limit=100)
        return items

    def get_node(self, node_id: str, org_id: str = config.default_org_id) -> Dict[str, Any]:
        """Retrieves single facility or carrier node details."""
        pk = f"ORG#{org_id}"
        sk = f"NODE#{node_id}"
        item = self.db.get_item(pk, sk)
        if not item:
            raise ResourceNotFoundError(f"Distribution node '{node_id}' not found.")
        return item

    def create_node(
        self,
        payload: CreateDistributionNodeRequest,
        org_id: str = config.default_org_id,
    ) -> Dict[str, Any]:
        """Registers a distribution center, carrier route, or retail destination."""
        now = datetime.now(timezone.utc).isoformat()

        node_item = {
            "PK": f"ORG#{org_id}",
            "SK": f"NODE#{payload.nodeId}",
            "GSI1PK": "TYPE#NODE",
            "GSI1SK": f"{payload.nodeType}#{payload.nodeName}",
            "nodeId": payload.nodeId,
            "nodeName": payload.nodeName,
            "nodeType": payload.nodeType,
            "location": payload.location,
            "status": payload.status,
            "coldChainCompliance": payload.coldChainCompliance,
            "createdAt": now,
        }

        self.db.conditional_put_item(
            item=node_item,
            condition_expression="attribute_not_exists(PK) AND attribute_not_exists(SK)",
        )

        return node_item

