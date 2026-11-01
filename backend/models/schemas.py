"""Pydantic data models and request validators for BatchGuard API."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class IngredientInput(BaseModel):
    rawLotId: str = Field(..., min_length=2)
    ingredient: str = Field(..., min_length=2)
    supplierId: str = Field(..., min_length=2)
    harvestDate: str = Field(..., min_length=10)


class CreateBatchRequest(BaseModel):
    lotNumber: str = Field(..., min_length=2)
    gtin: str = Field(..., min_length=8, max_length=14)
    productName: str = Field(..., min_length=2)
    initialQuantity: int = Field(..., gt=0)
    unitOfMeasure: str = Field(default="CASES")
    supplierId: str = Field(..., min_length=2)
    facilityGln: str = Field(..., min_length=10)
    harvestDate: str = Field(..., min_length=10)
    productionDate: str = Field(..., min_length=10)
    expirationDate: str = Field(..., min_length=10)
    ingredients: Optional[List[IngredientInput]] = []


class BlastRadiusRequest(BaseModel):
    batchId: str = Field(..., min_length=3)


class InitiateRecallRequest(BaseModel):
    batchId: str = Field(..., min_length=3)
    hazardClass: str = Field(..., pattern="^(CLASS_I_CRITICAL|CLASS_II|CLASS_III)$")
    reason: str = Field(..., min_length=5)
    confirmationPhrase: str = Field(..., min_length=10)
    auth2FAToken: str = Field(..., pattern=r"^\d{6}$")
    idempotencyToken: Optional[str] = None


class AcknowledgeRecallRequest(BaseModel):
    nodeId: str = Field(..., min_length=2)
    unitsQuarantined: int = Field(..., ge=0)
    posScanBlockApplied: bool = True
    physicalHoldVerified: bool = True
    acknowledgedBy: str = Field(..., min_length=2)


class CreateSupplierRequest(BaseModel):
    supplierName: str = Field(..., min_length=2)
    tier: str = Field(default="TIER_1", pattern="^(TIER_1|TIER_2)$")
    facilityLocation: str = Field(..., min_length=2)
    primaryCrop: str = Field(..., min_length=2)
    certifications: Optional[List[str]] = ["GLOBAL_GAP", "USDA_ORGANIC"]
    contactEmail: str = Field(..., min_length=5)


class CreateDistributionNodeRequest(BaseModel):
    nodeId: str = Field(..., min_length=3)
    nodeName: str = Field(..., min_length=2)
    nodeType: str = Field(..., pattern="^(PRIMARY_DC|SECONDARY_DC|RETAIL_STORE|LOGISTICS_CARRIER)$")
    location: str = Field(..., min_length=2)
    status: str = Field(default="NORMAL")
    coldChainCompliance: float = Field(default=99.5, ge=0.0, le=100.0)


class PresignedUrlRequest(BaseModel):
    batchId: str = Field(..., min_length=3)
    documentType: str = Field(..., pattern="^(COA|LAB_TEST|BILL_OF_LADING|DISPOSAL_ORDER)$")
    fileName: str = Field(..., min_length=3)
    fileSizeBytes: int = Field(..., gt=0, le=52428800)  # Max 50MB
    mimeType: str = Field(..., min_length=3)


class RecordAuditLogRequest(BaseModel):
    eventType: str = Field(..., min_length=3)
    actor: str = Field(..., min_length=3)
    targetResource: str = Field(..., min_length=3)
    actionSummary: str = Field(..., min_length=3)
    details: Optional[Dict[str, Any]] = None
