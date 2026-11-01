"""Unit tests for BatchService business logic."""

import pytest
from backend.common.exceptions import ResourceNotFoundError
from backend.models.schemas import CreateBatchRequest
from backend.services.batch_service import BatchService


def test_list_batches(mock_db):
    service = BatchService(db=mock_db)
    batches, last_key = service.list_batches()
    assert len(batches) == 2
    assert last_key is None
    mock_db.query_by_pk.assert_called_once()


def test_get_batch_found(mock_db):
    mock_db.get_item.return_value = {
        "PK": "ORG#ORG-APEX-GLOBAL",
        "SK": "BATCH#BG-2024-8891-ORG",
        "batchId": "BG-2024-8891-ORG",
        "productName": "Organic Baby Spinach 16oz",
    }
    service = BatchService(db=mock_db)
    batch = service.get_batch("BG-2024-8891-ORG")
    assert batch["batchId"] == "BG-2024-8891-ORG"
    assert batch["productName"] == "Organic Baby Spinach 16oz"


def test_get_batch_not_found(mock_db):
    mock_db.get_item.return_value = None
    service = BatchService(db=mock_db)
    with pytest.raises(ResourceNotFoundError):
        service.get_batch("BG-NON-EXISTENT")


def test_create_batch_success(mock_db):
    service = BatchService(db=mock_db)
    req = CreateBatchRequest(
        lotNumber="LOT-TEST-99",
        gtin="00850012345678",
        productName="Organic Baby Spinach 16oz",
        initialQuantity=5000,
        unitOfMeasure="CASES",
        supplierId="SUP-882",
        facilityGln="0850012340019",
        harvestDate="2026-10-25",
        productionDate="2026-10-27",
        expirationDate="2026-11-15",
        ingredients=[
            {
                "rawLotId": "RAW-01",
                "ingredient": "Baby Spinach Leaves",
                "supplierId": "SUP-882",
                "harvestDate": "2026-10-25",
            }
        ],
    )
    result = service.create_batch(req)
    assert result["lotNumber"] == "LOT-TEST-99"
    assert result["status"] == "RELEASED"
    assert result["batchId"].startswith("BG-")
    assert mock_db.conditional_put_item.called
