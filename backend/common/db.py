"""Amazon DynamoDB Single-Table Access Layer for BatchGuard.

Implements reusable query, mutation, and serialization utilities adhering to the single-table schema.
"""

from decimal import Decimal
from typing import Any, Dict, List, Optional
import boto3
from botocore.exceptions import ClientError
from backend.common.config import config
from backend.common.exceptions import BatchGuardException
from backend.common.logger import get_logger

logger = get_logger("batchguard.db")


def decimal_to_native(obj: Any) -> Any:
    """Recursively converts DynamoDB Decimal types to native int or float."""
    if isinstance(obj, list):
        return [decimal_to_native(i) for i in obj]
    elif isinstance(obj, dict):
        return {k: decimal_to_native(v) for k, v in obj.items()}
    elif isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    return obj


class DynamoDBClient:
    """Wrapper client for Amazon DynamoDB single-table operations."""

    def __init__(self, table_name: Optional[str] = None, region_name: Optional[str] = None):
        self.table_name = table_name or config.dynamodb_table_name
        self.region_name = region_name or config.aws_region
        self._table = None

    @property
    def table(self):
        if self._table is None:
            dynamodb = boto3.resource("dynamodb", region_name=self.region_name)
            self._table = dynamodb.Table(self.table_name)
        return self._table

    def get_item(self, pk: str, sk: str) -> Optional[Dict[str, Any]]:
        """Retrieves a single item by PK and SK."""
        try:
            response = self.table.get_item(Key={"PK": pk, "SK": sk})
            item = response.get("Item")
            return decimal_to_native(item) if item else None
        except ClientError as e:
            logger.error(f"Error fetching item PK={pk}, SK={sk}: {e}")
            raise BatchGuardException(f"DynamoDB query failed: {e.response['Error']['Message']}")

    def put_item(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Inserts or overwrites an item in the single table."""
        try:
            self.table.put_item(Item=item)
            return item
        except ClientError as e:
            logger.error(f"Error writing item PK={item.get('PK')}: {e}")
            raise BatchGuardException(f"DynamoDB put failed: {e.response['Error']['Message']}")

    def query_by_pk(
        self,
        pk: str,
        sk_prefix: Optional[str] = None,
        limit: int = 50,
        scan_index_forward: bool = True,
    ) -> List[Dict[str, Any]]:
        """Queries items sharing a partition key, optionally filtering by SK prefix."""
        try:
            key_condition = boto3.dynamodb.conditions.Key("PK").eq(pk)
            if sk_prefix:
                key_condition = key_condition & boto3.dynamodb.conditions.Key("SK").begins_with(sk_prefix)

            params = {
                "KeyConditionExpression": key_condition,
                "Limit": limit,
                "ScanIndexForward": scan_index_forward,
            }
            response = self.table.query(**params)
            items = response.get("Items", [])
            return [decimal_to_native(item) for item in items]
        except ClientError as e:
            logger.error(f"Error querying PK={pk}, prefix={sk_prefix}: {e}")
            raise BatchGuardException(f"DynamoDB query failed: {e.response['Error']['Message']}")

    def query_gsi(
        self,
        index_name: str,
        pk_value: str,
        sk_prefix: Optional[str] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Queries items using a Global Secondary Index (e.g. GSI1 or GSI2)."""
        try:
            pk_attr = f"{index_name}PK"
            sk_attr = f"{index_name}SK"

            key_condition = boto3.dynamodb.conditions.Key(pk_attr).eq(pk_value)
            if sk_prefix:
                key_condition = key_condition & boto3.dynamodb.conditions.Key(sk_attr).begins_with(sk_prefix)

            params = {
                "IndexName": index_name,
                "KeyConditionExpression": key_condition,
                "Limit": limit,
            }
            response = self.table.query(**params)
            items = response.get("Items", [])
            return [decimal_to_native(item) for item in items]
        except ClientError as e:
            logger.error(f"Error querying GSI {index_name} PK={pk_value}: {e}")
            raise BatchGuardException(f"DynamoDB GSI query failed: {e.response['Error']['Message']}")


# Singleton instance for re-use across warm Lambda invocations
db_client = DynamoDBClient()

