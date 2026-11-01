// ============================================================================
// BatchGuard Domain TypeScript Definitions
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: unknown[];
  } | null;
  meta: {
    requestId: string;
    timestamp: string;
  };
}

export type BatchStatus = 'RELEASED' | 'IN_TRANSIT' | 'HOLD' | 'RECALLED' | 'DESTROYED';
export type HazardClass = 'CLASS_I_CRITICAL' | 'CLASS_II' | 'CLASS_III';
export type RecallStatus = 'INITIATED' | 'CONTAINMENT_IN_PROGRESS' | 'CONTAINED' | 'CLOSED';
export type NodeType = 'PRIMARY_DC' | 'TRANSIT_FLEET' | 'RETAIL_STORE' | 'CROSS_DOCK';
export type SupplierTier = 'TIER_1' | 'TIER_2';
export type SupplierStatus = 'VERIFIED' | 'AUDIT_PENDING' | 'FLAGGED';

export interface Batch {
  batchId: string;
  lotNumber: string;
  gtin: string;
  productName: string;
  sku: string;
  initialQuantity: number;
  currentQuantity: number;
  unitOfMeasure: string;
  supplierId: string;
  supplierName: string;
  facilityGln: string;
  harvestDate: string;
  productionDate: string;
  expirationDate: string;
  status: BatchStatus;
  coldChainOptimal: boolean;
  currentTempCelsius: number;
  blockchainTxHash: string;
  createdAt: string;
}

export interface UpstreamIngredient {
  rawLotId: string;
  ingredient: string;
  supplier: string;
  farmLocation: string;
  harvestTimestamp: string;
  tests: {
    microbial: 'CLEAR' | 'DETECTED';
    pesticide: 'PASS' | 'FAIL';
  };
}

export interface DownstreamNodeAllocation {
  nodeId: string;
  nodeName: string;
  nodeType: NodeType;
  location: string;
  allocatedUnits: number;
  status: 'IN_STORAGE' | 'IN_TRANSIT' | 'DELIVERED' | 'QUARANTINED' | 'DESTROYED';
  preCommandAction?: string;
  lotAllocation?: string;
}

export interface TraceabilityCompleteness {
  completenessScore: number;
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  supplierVerified: boolean;
  ingredientLineageComplete: boolean;
  manufacturingEventsComplete: boolean;
  distributionHandoffsVerified: boolean;
  quantityReconciled: boolean;
  timestampsConsistent: boolean;
  missingEvidence: string[];
  brokenRelationships: string[];
  unverifiedHandoffs: string[];
  methodology: string;
}

export interface BatchLineage {
  batchId: string;
  productName?: string;
  gtin?: string;
  lotNumber?: string;
  upstream: UpstreamIngredient[];
  downstream: DownstreamNodeAllocation[];
  eventsTimeline?: Array<{
    stepNumber: string;
    title: string;
    timestamp: string;
    location: string;
    description: string;
    status: string;
    kdeRecord: string;
  }>;
  traceabilityCompleteness?: TraceabilityCompleteness;
  warnings?: string[];
  paginationKey?: string;
}

export interface ImpactedNode {
  nodeId: string;
  nodeName: string;
  nodeType: NodeType;
  location: string;
  lotAllocation: string;
  preCommandAction: string;
  remainingUnits?: number;
  quarantinedUnits?: number;
  isInventoryConfirmed?: boolean;
}

export interface BlastRadiusAssessment {
  batchId: string;
  totalUnitsAtRisk: number;
  totalDownstreamFacilities?: number;
  affectedDistributionCentres?: number;
  affectedRetailers?: number;
  affectedLogisticsCarriers?: number;
  totalUnitsDistributed?: number;
  knownRemainingInventory?: number;
  unknownInventoryQuantities?: number;
  totalUnitsRequiringInvestigation?: number;
  traceabilityCompleteness?: TraceabilityCompleteness;
  impactedNodes: ImpactedNode[];
  complianceChecklist: string[];
  missingRelationships?: string[];
  warnings?: string[];
  impactAssessmentTimestamp?: string;
}

export interface RecallIncident {
  recallId: string;
  batchId: string;
  lotNumber: string;
  gtin: string;
  productName: string;
  hazardClass: HazardClass;
  reason: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  totalUnitsAtRisk: number;
  totalUnitsIsolated: number;
  isolationPercentage: number;
  impactedNodesCount: number;
  status: RecallStatus;
  containmentWindowHours: number;
  initiatedBy: string;
  initiatedAt: string;
  stepFunctionsExecutionArn?: string;
}

export interface RecallAcknowledgement {
  nodeId: string;
  nodeName: string;
  location: string;
  unitsAllocated: number;
  unitsQuarantined: number;
  posScanBlockApplied: boolean;
  physicalHoldVerified: boolean;
  status: 'PENDING' | 'ACKNOWLEDGED' | 'HOLD_VERIFIED' | 'DISPOSED';
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

export interface Supplier {
  supplierId: string;
  name: string;
  tier: SupplierTier;
  facilityCode: string;
  certifications: string[];
  auditScore: number;
  status: SupplierStatus;
  contactEmail: string;
  updatedAt: string;
}

export interface DistributionNode {
  nodeId: string;
  name: string;
  nodeType: NodeType;
  gln: string;
  location: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  contactEmail: string;
  activeShipmentCount: number;
}

export interface EvidenceDocument {
  evidenceId: string;
  batchId: string;
  documentType: 'COA' | 'LAB_TEST' | 'BILL_OF_LADING' | 'DISPOSAL_ORDER';
  fileName: string;
  s3Key: string;
  fileSizeBytes: number;
  mimeType: string;
  uploadedBy: string;
  createdAt: string;
}

export interface AuditEvent {
  eventId: string;
  action: string;
  entityId: string;
  userId: string;
  userEmail: string;
  timestamp: string;
  details: Record<string, unknown>;
}

export interface OverviewSummary {
  totalBatches: number;
  activeLifecycleBatches: number;
  activeSuppliers: number;
  monitoredDistributionNodes: number;
  activeRecallsCount: number;
  complianceLedgerStatus: string;
  lastAuditTimestamp: string;
}

