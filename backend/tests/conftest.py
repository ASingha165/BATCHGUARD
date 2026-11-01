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
    return mock
