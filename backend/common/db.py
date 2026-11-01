"""Amazon DynamoDB Single-Table Access Layer for BatchGuard.

Implements reusable query, mutation, pagination, conditional writes, and serialization
adhering to the single-table schema.
"""

from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple
import boto3
from boto3.dynamodb.conditions import Key, Attr
from botocore.exceptions import ClientError
from backend.common.config import config
from backend.common.exceptions import BatchGuardException, IdempotencyConflictError
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


def native_to_decimal(obj: Any) -> Any:
    """Recursively converts float types to Decimal for DynamoDB storage."""
    if isinstance(obj, list):
        return [native_to_decimal(i) for i in obj]
    elif isinstance(obj, dict):
        return {k: native_to_decimal(v) for k, v in obj.items()}
    elif isinstance(obj, float):
        return Decimal(str(obj))
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
            prepared_item = native_to_decimal(item)
            self.table.put_item(Item=prepared_item)
            return item
        except ClientError as e:
            logger.error(f"Error writing item PK={item.get('PK')}: {e}")
            raise BatchGuardException(f"DynamoDB put failed: {e.response['Error']['Message']}")

    def conditional_put_item(
        self,
        item: Dict[str, Any],
        condition_expression: str,
        expression_attribute_names: Optional[Dict[str, str]] = None,
        expression_attribute_values: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Inserts an item only if the specified condition passes (e.g. idempotency guard)."""
        try:
            prepared_item = native_to_decimal(item)
            params: Dict[str, Any] = {
                "Item": prepared_item,
                "ConditionExpression": condition_expression,
            }
            if expression_attribute_names:
                params["ExpressionAttributeNames"] = expression_attribute_names
            if expression_attribute_values:
                params["ExpressionAttributeValues"] = native_to_decimal(expression_attribute_values)

            self.table.put_item(**params)
            return item
        except ClientError as e:
            code = e.response["Error"]["Code"]
            if code == "ConditionalCheckFailedException":
                logger.warning(f"Conditional write failed for PK={item.get('PK')}, SK={item.get('SK')}")
                raise IdempotencyConflictError(
                    f"Resource with PK='{item.get('PK')}' already exists or failed precondition."
                )
            logger.error(f"Error in conditional put for PK={item.get('PK')}: {e}")
            raise BatchGuardException(f"DynamoDB conditional put failed: {e.response['Error']['Message']}")

    def update_item(
        self,
        pk: str,
        sk: str,
        update_expression: str,
        expression_attribute_names: Optional[Dict[str, str]] = None,
        expression_attribute_values: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Updates attributes of an existing item in the single table."""
        try:
            params: Dict[str, Any] = {
                "Key": {"PK": pk, "SK": sk},
                "UpdateExpression": update_expression,
                "ReturnValues": "ALL_NEW",
            }
            if expression_attribute_names:
                params["ExpressionAttributeNames"] = expression_attribute_names
            if expression_attribute_values:
                params["ExpressionAttributeValues"] = native_to_decimal(expression_attribute_values)

            res = self.table.update_item(**params)
            return decimal_to_native(res.get("Attributes", {}))
        except ClientError as e:
            logger.error(f"Error updating item PK={pk}, SK={sk}: {e}")
            raise BatchGuardException(f"DynamoDB update failed: {e.response['Error']['Message']}")

    def delete_item(self, pk: str, sk: str) -> None:
        """Deletes an item by PK and SK."""
        try:
            self.table.delete_item(Key={"PK": pk, "SK": sk})
        except ClientError as e:
            logger.error(f"Error deleting item PK={pk}, SK={sk}: {e}")
            raise BatchGuardException(f"DynamoDB delete failed: {e.response['Error']['Message']}")

    def query_by_pk(
        self,
        pk: str,
        sk_prefix: Optional[str] = None,
        limit: int = 50,
        scan_index_forward: bool = True,
        exclusive_start_key: Optional[Dict[str, Any]] = None,
    ) -> Tuple[List[Dict[str, Any]], Optional[Dict[str, Any]]]:
        """Queries items sharing a partition key, optionally filtering by SK prefix and supporting pagination."""
        try:
            key_condition = Key("PK").eq(pk)
            if sk_prefix:
                key_condition = key_condition & Key("SK").begins_with(sk_prefix)

            params: Dict[str, Any] = {
                "KeyConditionExpression": key_condition,
                "Limit": limit,
                "ScanIndexForward": scan_index_forward,
            }
            if exclusive_start_key:
                params["ExclusiveStartKey"] = exclusive_start_key

            response = self.table.query(**params)
            items = response.get("Items", [])
            last_evaluated_key = response.get("LastEvaluatedKey")
            return [decimal_to_native(item) for item in items], last_evaluated_key
        except ClientError as e:
            logger.error(f"Error querying PK={pk}, prefix={sk_prefix}: {e}")
            raise BatchGuardException(f"DynamoDB query failed: {e.response['Error']['Message']}")

    def query_gsi(
        self,
        index_name: str,
        pk_value: str,
        sk_prefix: Optional[str] = None,
        limit: int = 50,
        exclusive_start_key: Optional[Dict[str, Any]] = None,
    ) -> Tuple[List[Dict[str, Any]], Optional[Dict[str, Any]]]:
        """Queries items using a Global Secondary Index (e.g. GSI1 or GSI2) with pagination."""
        try:
            pk_attr = f"{index_name}PK"
            sk_attr = f"{index_name}SK"

            key_condition = Key(pk_attr).eq(pk_value)
            if sk_prefix:
                key_condition = key_condition & Key(sk_attr).begins_with(sk_prefix)

            params: Dict[str, Any] = {
                "IndexName": index_name,
                "KeyConditionExpression": key_condition,
                "Limit": limit,
            }
            if exclusive_start_key:
                params["ExclusiveStartKey"] = exclusive_start_key

            response = self.table.query(**params)
            items = response.get("Items", [])
            last_evaluated_key = response.get("LastEvaluatedKey")
            return [decimal_to_native(item) for item in items], last_evaluated_key
        except ClientError as e:
            logger.error(f"Error querying GSI {index_name} PK={pk_value}: {e}")
            raise BatchGuardException(f"DynamoDB GSI query failed: {e.response['Error']['Message']}")


# Singleton instance for re-use across warm Lambda invocations
db_client = DynamoDBClient()
