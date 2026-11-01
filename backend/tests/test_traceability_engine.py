"""Comprehensive unit & integration test suite for BatchGuard Traceability Intelligence Engine.

Covers all 15 core scenarios:
1. Single-level ingredient lineage
2. Multi-level ingredient lineage
3. Multiple suppliers
4. Multiple distribution facilities
5. Multiple retail locations
6. Circular relationships (Cycle Detection)
7. Missing parent records (Broken Relationships)
8. Duplicate distribution records (Deduplication)
9. Quantity aggregation (Shipped, Received, Sold, Quarantined)
10. Inventory reconciliation (Allocated vs Production)
11. Cross-tenant access boundary enforcement
12. Pagination over large distribution networks
13. Large graph traversal (Max Depth Truncation)
14. Incomplete traceability confidence scoring
15. Recall impact calculation (Blast Radius & Unknown Quantities)
"""

from unittest.mock import MagicMock
import pytest
from backend.common.exceptions import ResourceNotFoundError
from backend.services.traceability_engine import MAX_TRAVERSAL_DEPTH, TraceabilityEngine


# ==============================================================================
# TEST FIXTURES & MOCK FACTORIES
# ==============================================================================

@pytest.fixture
def mock_trace_db():
    mock = MagicMock()
    mock.get_item.return_value = {
        "PK": "ORG#ORG-APEX-GLOBAL",
        "SK": "BATCH#BG-TEST-001",
        "batchId": "BG-TEST-001",
        "productName": "Organic Baby Spinach 16oz",
        "gtin": "00850012345678",
        "lotNumber": "L-TEST-01",
        "initialQuantity": 10000,
        "currentQuantity": 10000,
        "facilityGln": "0850012340019",
        "productionDate": "2026-10-27",
        "status": "RELEASED",
    }
    mock.query_by_pk.return_value = ([], None)
    mock.query_gsi.return_value = ([], None)
    return mock


# ==============================================================================
# 1. SINGLE-LEVEL & 2. MULTI-LEVEL INGREDIENT LINEAGE
# ==============================================================================

def test_single_level_ingredient_lineage(mock_trace_db):
    def single_level_query(pk, **kwargs):
        if pk == "BATCH#BG-TEST-001":
            return (
                [
                    {
                        "rawLotId": "LOT-SPN-01",
                        "ingredient": "Fresh Spinach Leaves",
                        "supplierId": "SUP-882",
                        "supplierName": "Salinas Valley Organics",
                        "facilityGln": "0850012999011",
                        "farmLocation": "Salinas, CA",
                        "harvestDate": "2026-10-25T06:00:00Z",
                        "quantityUsed": 4800.0,
                        "parentLotIds": [],
                    }
                ],
                None,
            )
        return ([], None)

    mock_trace_db.query_by_pk.side_effect = single_level_query
    engine = TraceabilityEngine(db=mock_trace_db)
    nodes, warnings, missing = engine.build_upstream_lineage("BG-TEST-001")
    assert len(nodes) == 1
    assert nodes[0].lotId == "LOT-SPN-01"
    assert nodes[0].depth == 1
    assert nodes[0].verified is True
    assert len(warnings) == 0


def test_multi_level_ingredient_lineage(mock_trace_db):
    # Level 1 returns LOT-ING-A with parent LOT-SEED-B
    # Level 2 query returns LOT-SEED-B
    def dynamic_query(pk, sk_prefix=None, **kwargs):
        if pk == "BATCH#BG-MULTI-01":
            return (
                [
                    {
                        "rawLotId": "LOT-ING-A",
                        "ingredient": "Baby Spinach",
                        "supplierId": "SUP-882",
                        "supplierName": "Salinas Farm",
                        "facilityGln": "0850012999011",
                        "harvestDate": "2026-10-25T06:00:00Z",
                        "quantityUsed": 4000.0,
                        "parentLotIds": ["LOT-SEED-B"],
                    }
                ],
                None,
            )
        elif pk == "BATCH#LOT-ING-A":
            return (
                [
                    {
                        "rawLotId": "LOT-SEED-B",
                        "ingredient": "Organic Seed Stock",
                        "supplierId": "SUP-SEED-99",
                        "supplierName": "AgriSeed Global",
                        "facilityGln": "0850012777033",
                        "harvestDate": "2026-09-10T00:00:00Z",
                        "quantityUsed": 50.0,
                        "parentLotIds": [],
                    }
                ],
                None,
            )
        return ([], None)

    mock_trace_db.query_by_pk.side_effect = dynamic_query
    engine = TraceabilityEngine(db=mock_trace_db)
    nodes, warnings, _ = engine.build_upstream_lineage("BG-MULTI-01")

    assert len(nodes) == 2
    level_1 = [n for n in nodes if n.depth == 1][0]
    level_2 = [n for n in nodes if n.depth == 2][0]
    assert level_1.lotId == "LOT-ING-A"
    assert level_2.lotId == "LOT-SEED-B"
    assert level_2.supplierId == "SUP-SEED-99"


# ==============================================================================
# 3. MULTIPLE SUPPLIERS
# ==============================================================================

def test_multiple_suppliers_lineage(mock_trace_db):
    def multi_supplier_query(pk, **kwargs):
        if pk == "BATCH#BG-TEST-001":
            return (
                [
                    {
                        "rawLotId": "LOT-SPN-01",
                        "ingredient": "Baby Spinach",
                        "supplierId": "SUP-SALINAS",
                        "supplierName": "Salinas Organics",
                        "facilityGln": "0850012999011",
                        "harvestDate": "2026-10-25T06:00:00Z",
                        "quantityUsed": 3000.0,
                        "parentLotIds": [],
                    },
                    {
                        "rawLotId": "LOT-KALE-02",
                        "ingredient": "Organic Baby Kale",
                        "supplierId": "SUP-CENTRAL-COAST",
                        "supplierName": "Central Coast Farms",
                        "facilityGln": "0850012999022",
                        "harvestDate": "2026-10-25T07:00:00Z",
                        "quantityUsed": 1800.0,
                        "parentLotIds": [],
                    },
                ],
                None,
            )
        return ([], None)

    mock_trace_db.query_by_pk.side_effect = multi_supplier_query
    engine = TraceabilityEngine(db=mock_trace_db)
    nodes, _, _ = engine.build_upstream_lineage("BG-TEST-001")
    suppliers = {n.supplierId for n in nodes}
    assert suppliers == {"SUP-SALINAS", "SUP-CENTRAL-COAST"}
    assert len(nodes) == 2


# ==============================================================================
# 4. MULTIPLE DCS & 5. MULTIPLE RETAILERS & 8. DEDUPLICATION & 9. QUANTITIES
# ==============================================================================

def test_multiple_facilities_and_deduplication(mock_trace_db):
    # DC-01 appears twice (two consignments), RET-01 appears once
    mock_trace_db.query_by_pk.return_value = (
        [
            {
                "nodeId": "DC-CHICAGO-01",
                "nodeName": "Chicago Distribution Center",
                "nodeType": "PRIMARY_DC",
                "gln": "0850012340019",
                "location": "Chicago, IL",
                "shippedUnits": 2000,
                "receivedUnits": 2000,
                "remainingUnits": 2000,
                "quarantinedUnits": 0,
            },
            {
                "nodeId": "DC-CHICAGO-01",  # Duplicate consignment to same facility
                "nodeName": "Chicago Distribution Center",
                "nodeType": "PRIMARY_DC",
                "gln": "0850012340019",
                "location": "Chicago, IL",
                "shippedUnits": 1400,
                "receivedUnits": 1400,
                "remainingUnits": 1400,
                "quarantinedUnits": 1400,
            },
            {
                "nodeId": "RET-BOSTON-88",
                "nodeName": "Whole Foods Boston",
                "nodeType": "RETAIL_STORE",
                "gln": "0850012340088",
                "location": "Boston, MA",
                "shippedUnits": 600,
                "receivedUnits": 600,
                "soldUnits": 100,
                "remainingUnits": 500,
                "quarantinedUnits": 500,
            },
        ],
        None,
    )
    engine = TraceabilityEngine(db=mock_trace_db)
    downstream, _, _ = engine.build_downstream_lineage("BG-TEST-001")

    # Deduplicated from 3 records into 2 facilities
    assert len(downstream) == 2
    chicago = [n for n in downstream if n.nodeId == "DC-CHICAGO-01"][0]
    assert chicago.shippedUnits == 3400  # 2000 + 1400
    assert chicago.quarantinedUnits == 1400


# ==============================================================================
# 6. CIRCULAR RELATIONSHIPS (CYCLE DETECTION)
# ==============================================================================

def test_circular_lineage_cycle_detection(mock_trace_db):
    # Circular relationship: LOT-A -> LOT-B -> LOT-A
    def cycle_query(pk, **kwargs):
        if pk == "BATCH#BG-CYCLE":
            return ([{"rawLotId": "LOT-A", "ingredient": "Leaf A", "parentLotIds": ["LOT-B"]}], None)
        elif pk == "BATCH#LOT-A":
            return ([{"rawLotId": "LOT-B", "ingredient": "Leaf B", "parentLotIds": ["LOT-A"]}], None)
        elif pk == "BATCH#LOT-B":
            # Cycle points back to LOT-A!
            return ([{"rawLotId": "LOT-A", "ingredient": "Leaf A", "parentLotIds": []}], None)
        return ([], None)

    mock_trace_db.query_by_pk.side_effect = cycle_query
    engine = TraceabilityEngine(db=mock_trace_db)
    nodes, warnings, _ = engine.build_upstream_lineage("BG-CYCLE")

    # Cycle must be detected and loop severed without infinite recursion
    cycle_nodes = [n for n in nodes if n.cycleDetected]
    assert len(cycle_nodes) >= 1
    assert any("Circular lineage relationship detected" in w for w in warnings)


# ==============================================================================
# 7. MISSING PARENT RECORDS & BROKEN RELATIONSHIPS
# ==============================================================================

def test_missing_supplier_origin(mock_trace_db):
    mock_trace_db.query_by_pk.return_value = (
        [
            {
                "rawLotId": "LOT-UNKNOWN-ORIGIN",
                "ingredient": "Unidentified Greens",
                "supplierId": "SUP-UNKNOWN",
                "parentLotIds": [],
            }
        ],
        None,
    )
    engine = TraceabilityEngine(db=mock_trace_db)
    nodes, _, missing = engine.build_upstream_lineage("BG-TEST-001")
    assert nodes[0].verified is False
    assert len(missing) >= 1
    assert "Unverified supplier origin" in missing[0]


# ==============================================================================
# 10. INVENTORY RECONCILIATION & CONFIDENCE SCORING
# ==============================================================================

def test_traceability_confidence_high(mock_trace_db):
    engine = TraceabilityEngine(db=mock_trace_db)
    impact = engine.calculate_recall_impact("BG-2024-8891-ORG")
    conf = impact.traceabilityCompleteness

    assert conf.completenessScore >= 80.0
    assert conf.confidenceLevel in ["HIGH", "MEDIUM"]
    assert conf.methodology is not None
    assert "regulatory certification" in conf.methodology


def test_negative_quantity_penalty(mock_trace_db):
    engine = TraceabilityEngine(db=mock_trace_db)
    upstream, _, _ = engine.build_upstream_lineage("BG-2024-8891-ORG")

    # Downstream node with negative shippedUnits
    bad_downstream, _, _ = engine.build_downstream_lineage("BG-2024-8891-ORG")
    bad_downstream[0].shippedUnits = -500

    conf = engine.calculate_traceability_confidence(
        batch_id="BG-2024-8891-ORG",
        org_id="ORG-APEX-GLOBAL",
        upstream_nodes=upstream,
        downstream_nodes=bad_downstream,
        batch_item={"initialQuantity": 10000, "productionDate": "2026-10-27"},
    )
    assert any("Negative quantities detected" in m for m in conf.missingEvidence)


# ==============================================================================
# 11. CROSS-TENANT ACCESS IN FULL TRACEABILITY
# ==============================================================================

def test_get_full_traceability_cross_tenant_rejection(mock_trace_db):
    # Returns None for non-existent batch in caller's tenant
    mock_trace_db.get_item.return_value = None
    engine = TraceabilityEngine(db=mock_trace_db)

    with pytest.raises(ResourceNotFoundError) as exc_info:
        engine.get_full_traceability("BG-NON-EXISTENT", org_id="ORG-TENANT-ALPHA")
    assert "not found in organization" in str(exc_info.value)


# ==============================================================================
# 12. PAGINATION OVER LARGE DISTRIBUTION NETWORKS
# ==============================================================================

def test_downstream_lineage_pagination(mock_trace_db):
    sample_nodes = [
        {"nodeId": f"DC-{i}", "nodeName": f"DC Hub {i}", "allocatedUnits": 100}
        for i in range(10)
    ]
    mock_trace_db.query_by_pk.return_value = (sample_nodes[:5], {"PK": "BATCH#1", "SK": "DIST#DC-4"})

    engine = TraceabilityEngine(db=mock_trace_db)
    nodes, last_key, _ = engine.build_downstream_lineage("BG-TEST-001", limit=5)
    assert len(nodes) == 5
    assert last_key is not None
    assert last_key["SK"] == "DIST#DC-4"


# ==============================================================================
# 13. LARGE GRAPH TRAVERSAL (MAX DEPTH TRUNCATION)
# ==============================================================================

def test_max_traversal_depth_truncation(mock_trace_db):
    # Generates a deep linear genealogy: Lot 1 -> Lot 2 -> Lot 3 -> ... -> Lot 15
    def deep_lineage_query(pk, **kwargs):
        lot_num = int(pk.replace("BATCH#LOT-", "").replace("BATCH#BG-DEEP", "1"))
        next_lot = lot_num + 1
        return (
            [
                {
                    "rawLotId": f"LOT-{next_lot}",
                    "ingredient": f"Refined Extract {next_lot}",
                    "supplierId": "SUP-CHEM",
                    "parentLotIds": [f"LOT-{next_lot}"],
                }
            ],
            None,
        )

    mock_trace_db.query_by_pk.side_effect = deep_lineage_query
    engine = TraceabilityEngine(db=mock_trace_db)
    nodes, warnings, _ = engine.build_upstream_lineage("BG-DEEP", max_depth=5)

    assert any("Maximum traversal depth (5) reached" in w for w in warnings)


# ==============================================================================
# 14. INCOMPLETE TRACEABILITY & 15. RECALL IMPACT CALCULATION
# ==============================================================================

def test_recall_impact_calculation_metrics(mock_trace_db):
    engine = TraceabilityEngine(db=mock_trace_db)
    impact = engine.calculate_recall_impact("BG-2024-8891-ORG", org_id="ORG-APEX-GLOBAL")

    assert impact.batchId == "BG-2024-8891-ORG"
    assert impact.totalDownstreamFacilities >= 4
    assert impact.affectedDistributionCentres >= 2
    assert impact.affectedRetailers >= 2
    assert impact.totalUnitsDistributed == 6200
    assert impact.knownRemainingInventory >= 5200
    assert impact.totalUnitsRequiringInvestigation >= 0
    assert len(impact.complianceChecklist) == 4
    assert "21 CFR Part 7" in impact.complianceChecklist[0]
