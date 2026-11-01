"""Traceability domain models and schemas for BatchGuard Intelligence Engine.

Provides type-safe models for multi-level upstream ingredient lineage, forward
distribution tracking, inventory state categorization, confidence scoring, and recall impact.
"""

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class TestResult(BaseModel):
    microbial: Literal["CLEAR", "DETECTED", "PENDING"] = "CLEAR"
    pesticide: Literal["PASS", "FAIL", "NOT_TESTED"] = "PASS"
    heavyMetals: Optional[Literal["PASS", "FAIL"]] = "PASS"


class UpstreamNode(BaseModel):
    """Represents a node in the backward ingredient lineage graph."""
    nodeId: str
    lotId: str
    ingredientName: str
    supplierId: str
    supplierName: str
    facilityGln: str
    farmLocation: str
    harvestTimestamp: str
    quantityUsed: float
    unitOfMeasure: str = "KG"
    tests: TestResult = Field(default_factory=TestResult)
    depth: int = 1
    parentLotIds: List[str] = Field(default_factory=list)
    cycleDetected: bool = False
    verified: bool = True
    metadata: Dict[str, Any] = Field(default_factory=dict)


class DownstreamFacilityNode(BaseModel):
    """Represents a facility in the forward distribution graph."""
    nodeId: str
    nodeName: str
    nodeType: Literal["PRIMARY_DC", "SECONDARY_DC", "RETAIL_STORE", "LOGISTICS_CARRIER"]
    gln: str
    location: str
    shippedUnits: int = 0
    receivedUnits: int = 0
    soldUnits: int = 0
    remainingUnits: int = 0
    quarantinedUnits: int = 0
    isInventoryConfirmed: bool = True
    status: Literal["NORMAL", "HOLD_PENDING", "HOLD_VERIFIED", "DISPOSED"] = "NORMAL"
    preCommandAction: str = "Apply physical inventory hold"
    allocationTimestamp: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class TraceabilityCompleteness(BaseModel):
    """Evaluates KDE completeness and supply chain audit readiness."""
    completenessScore: float = Field(..., ge=0.0, le=100.0)
    confidenceLevel: Literal["HIGH", "MEDIUM", "LOW"]
    supplierVerified: bool = True
    ingredientLineageComplete: bool = True
    manufacturingEventsComplete: bool = True
    distributionHandoffsVerified: bool = True
    quantityReconciled: bool = True
    timestampsConsistent: bool = True
    missingEvidence: List[str] = Field(default_factory=list)
    brokenRelationships: List[str] = Field(default_factory=list)
    unverifiedHandoffs: List[str] = Field(default_factory=list)
    methodology: str = (
        "Weighted multi-dimensional audit score evaluating supplier verification (15%), "
        "ingredient lineage (20%), CTE events (20%), distribution handoffs (20%), "
        "quantity reconciliation (15%), and timestamp sequencing (10%). "
        "Not an independent regulatory certification."
    )


class RecallImpactMetrics(BaseModel):
    """Dedicated blast radius and inventory exposure metrics."""
    batchId: str
    organizationId: str
    hazardClass: Optional[str] = "CLASS_I_CRITICAL"
    totalDownstreamFacilities: int = 0
    affectedDistributionCentres: int = 0
    affectedRetailers: int = 0
    affectedLogisticsCarriers: int = 0
    totalUnitsDistributed: int = 0
    knownRemainingInventory: int = 0
    unknownInventoryQuantities: int = 0
    totalUnitsRequiringInvestigation: int = 0
    traceabilityCompleteness: TraceabilityCompleteness
    impactedNodes: List[Dict[str, Any]] = Field(default_factory=list)
    complianceChecklist: List[str] = Field(default_factory=list)
    missingRelationships: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    impactAssessmentTimestamp: str


class FullTraceabilityGraph(BaseModel):
    """Comprehensive graph response for batch lineage and traceability routes."""
    batchId: str
    organizationId: str
    productName: str
    gtin: str
    lotNumber: str
    initialQuantity: int
    currentQuantity: int
    unitOfMeasure: str
    status: str
    upstreamTree: List[UpstreamNode] = Field(default_factory=list)
    downstreamNetwork: List[DownstreamFacilityNode] = Field(default_factory=list)
    eventsTimeline: List[Dict[str, Any]] = Field(default_factory=list)
    impactSummary: RecallImpactMetrics
    traceabilityCompleteness: TraceabilityCompleteness
    warnings: List[str] = Field(default_factory=list)
    paginationKey: Optional[str] = None
