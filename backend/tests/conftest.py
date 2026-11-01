"""Pytest configuration and shared fixtures for BatchGuard tests."""

import os
import sys
from unittest.mock import MagicMock
import pytest

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))


@pytest.fixture
def mock_db():
    """Provides a mocked DynamoDB client for testing services in isolation."""
    mock = MagicMock()
    # Default get_item returns None
    mock.get_item.return_value = None

    sample_items = [
        {
            "PK": "BATCH#BG-2024-8891-ORG",
            "SK": "DIST#NODE-DC-01",
            "nodeId": "NODE-DC-01",
            "nodeName": "Northeast Logistics Hub 01",
            "nodeType": "PRIMARY_DC",
            "location": "Newark, NJ",
            "allocatedUnits": 2800,
            "preCommandAction": "Auto-quarantine pallet racks 41-48",
        },
        {
            "PK": "BATCH#BG-2024-8891-ORG",
            "SK": "DIST#NODE-CARRIER-204",
            "nodeId": "NODE-CARRIER-204",
            "nodeName": "ColdRoute Fleet Carrier #204",
            "nodeType": "TRANSIT_FLEET",
            "location": "En route I-87",
            "allocatedUnits": 1400,
            "preCommandAction": "Re-route to Secure Depot C",
        },
    ]

    # query_by_pk and query_gsi return (items, last_evaluated_key)
    mock.query_by_pk.return_value = (sample_items, None)
    mock.query_gsi.return_value = (sample_items, None)
    mock.conditional_put_item.side_effect = lambda item, **kwargs: item
    mock.put_item.side_effect = lambda item, **kwargs: item
    mock.delete_item.side_effect = lambda pk, sk, **kwargs: {"PK": pk, "SK": sk}

    def mock_transact(tx_items):
        from boto3.dynamodb.types import TypeDeserializer
        d = TypeDeserializer()
        for tx in tx_items:
            if "Put" in tx:
                put_op = tx["Put"]
                item = put_op.get("Item", {})
                cond = put_op.get("ConditionExpression")
                vals = put_op.get("ExpressionAttributeValues", {})
                if isinstance(item, dict) and any(isinstance(v, dict) and any(k in v for k in ("S", "N", "B", "BOOL", "NULL", "M", "L")) for v in item.values()):
                    item = {k: d.deserialize(v) for k, v in item.items()}
                mock.conditional_put_item(item=item, condition_expression=cond, expression_attribute_values=vals)
            elif "Delete" in tx:
                del_op = tx["Delete"]
                key = del_op.get("Key", {})
                if isinstance(key, dict) and any(isinstance(v, dict) for v in key.values()):
                    key = {k: d.deserialize(v) for k, v in key.items()}
                mock.delete_item(pk=key.get("PK"), sk=key.get("SK"))

    mock.transact_write_items.side_effect = mock_transact
    return mock
