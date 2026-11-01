"""Unit tests for SupplierService and DistributionService."""

import pytest
from backend.common.exceptions import ResourceNotFoundError
from backend.models.schemas import CreateDistributionNodeRequest, CreateSupplierRequest
from backend.services.distribution_service import DistributionService
from backend.services.supplier_service import SupplierService


def test_supplier_service_list_and_create(mock_db):
    service = SupplierService(db=mock_db)
    suppliers = service.list_suppliers()
    assert len(suppliers) == 2

    req = CreateSupplierRequest(
        supplierName="Sun Valley Growers",
        tier="TIER_1",
        facilityLocation="Salinas, CA",
        primaryCrop="Organic Greens",
        certifications=["USDA_ORGANIC", "GLOBAL_GAP"],
        contactEmail="contact@sunvalley.internal",
    )
    new_sup = service.create_supplier(req)
    assert new_sup["supplierName"] == "Sun Valley Growers"
    assert new_sup["verificationStatus"] == "VERIFIED"
    assert new_sup["supplierId"].startswith("SUP-")


def test_distribution_service_list_and_create(mock_db):
    service = DistributionService(db=mock_db)
    nodes = service.list_nodes()
    assert len(nodes) == 2

    req = CreateDistributionNodeRequest(
        nodeId="DC-CENTRAL-09",
        nodeName="Denver Regional Distribution Depot",
        nodeType="PRIMARY_DC",
        location="Denver, CO",
        status="NORMAL",
        coldChainCompliance=99.8,
    )
    new_node = service.create_node(req)
    assert new_node["nodeId"] == "DC-CENTRAL-09"
    assert new_node["coldChainCompliance"] == 99.8

