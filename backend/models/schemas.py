"""Pydantic data models and request validators for BatchGuard API."""

from typing import List, Optional
from pydantic import BaseModel, Field


class IngredientInput(BaseModel):
    rawLotId: str
    ingredient: str
    supplierId: str
    harvestDate: str


class CreateBatchRequest(BaseModel):
    lotNumber: str = Field(..., min_length=2)
    gtin: str = Field(..., min_length=8, max_length=14)
    productName: str = Field(..., min_length=2)
    initialQuantity: int = Field(..., gt=0)
    unitOfMeasure: str = Field(default="CASES")
    supplierId: str
    facilityGln: str
    harvestDate: str
    productionDate: str
    expirationDate: str
    ingredients: Optional[List[IngredientInput]] = []


class BlastRadiusRequest(BaseModel):
    batchId: str = Field(..., min_length=3)


class InitiateRecallRequest(BaseModel):
    batchId: str = Field(..., min_length=3)
    hazardClass: str = Field(..., pattern="^(CLASS_I_CRITICAL|CLASS_II|CLASS_III)$")
    reason: str = Field(..., min_length=5)
    confirmationPhrase: str = Field(..., min_length=10)
    auth2FAToken: str = Field(..., min_length=6, max_length=6)
    idempotencyToken: Optional[str] = None


class AcknowledgeRecallRequest(BaseModel):
    nodeId: str
    unitsQuarantined: int = Field(..., ge=0)
    posScanBlockApplied: bool = True
    physicalHoldVerified: bool = True
    acknowledgedBy: str = Field(..., min_length=2)


class PresignedUrlRequest(BaseModel):
    batchId: str
    documentType: str = Field(..., pattern="^(COA|LAB_TEST|BILL_OF_LADING|DISPOSAL_ORDER)$")
    fileName: str
    fileSizeBytes: int = Field(..., gt=0, le=52428800)  # Max 50MB
    mimeType: str

