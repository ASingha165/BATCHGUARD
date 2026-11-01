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
    # Default get_item return None
    mock.get_item.return_value = None
    # Default query return sample distribution records
    mock.query_by_pk.return_value = [
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
    return mock

