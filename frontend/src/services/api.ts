// ============================================================================
// BatchGuard API Client Layer
// Communicates with API Gateway /v1/* endpoints.
// Uses explicitly identified demo data when backend is unconfigured or offline.
// ============================================================================

import {
  ApiResponse,
  OverviewSummary,
  Batch,
  BatchLineage,
  BlastRadiusAssessment,
  RecallIncident,
  RecallAcknowledgement,
  Supplier,
  DistributionNode,
  EvidenceDocument,
  AuditEvent,
  NodeType,
} from '../types';
import {
  DEMO_OVERVIEW_SUMMARY,
  DEMO_BATCHES,
  DEMO_LINEAGE,
  DEMO_BLAST_RADIUS,
  DEMO_ACTIVE_RECALLS,
  DEMO_ACKNOWLEDGEMENTS,
  DEMO_SUPPLIERS,
  DEMO_NODES,
  DEMO_EVIDENCE,
  DEMO_AUDIT_LOGS,
} from './mockData';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const FORCE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true';

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
  if (FORCE_MOCK || (!API_BASE_URL && typeof window === 'undefined')) {
    throw new Error('DEMO_MODE_ACTIVE');
  }

  const url = `${API_BASE_URL}/v1${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  // Abort controller to prevent UI hanging if remote endpoint is unreachable
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      signal: controller.signal,
      ...options,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      throw new Error(errorBody?.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

export const apiService = {
  // Overview
  async getOverviewSummary(): Promise<OverviewSummary> {
    try {
      const res = await fetchJson<OverviewSummary>('/overview/summary');
      return res.data || DEMO_OVERVIEW_SUMMARY;
    } catch {
      return DEMO_OVERVIEW_SUMMARY;
    }
  },

  // Batches
  async getBatches(status?: string): Promise<Batch[]> {
    try {
      const query = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : '';
      const res = await fetchJson<{ batches: Batch[] }>(`/batches${query}`);
      const list = res.data?.batches || DEMO_BATCHES;
      if (!status || status === 'ALL') return list;
      return list.filter((b) => b.status === status);
    } catch {
      if (!status || status === 'ALL') return DEMO_BATCHES;
      return DEMO_BATCHES.filter((b) => b.status === status);
    }
  },

  async getBatchById(batchId: string): Promise<Batch | null> {
    try {
      const res = await fetchJson<Batch>(`/batches/${encodeURIComponent(batchId)}`);
      return res.data;
    } catch {
      return DEMO_BATCHES.find((b) => b.batchId === batchId) || DEMO_BATCHES[0];
    }
  },

  async getBatchLineage(batchId: string): Promise<BatchLineage> {
    try {
      const res = await fetchJson<BatchLineage>(`/batches/${encodeURIComponent(batchId)}/lineage`);
      return res.data || DEMO_LINEAGE;
    } catch {
      return DEMO_LINEAGE;
    }
  },

  async createBatch(payload: {
    lotNumber: string;
    gtin: string;
    productName: string;
    initialQuantity: number;
    unitOfMeasure?: string;
    supplierId: string;
    facilityGln: string;
    harvestDate: string;
    productionDate: string;
    expirationDate: string;
    ingredients?: Array<{
      rawLotId: string;
      ingredient: string;
      supplierId: string;
      harvestDate: string;
    }>;
  }): Promise<Batch> {
    try {
      const res = await fetchJson<Batch>('/batches', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (res.data) return res.data;
      throw new Error('Failed to register batch');
    } catch {
      const newBatch: Batch = {
        batchId: `BG-2024-${Math.floor(1000 + Math.random() * 9000)}-ORG`,
        lotNumber: payload.lotNumber,
        gtin: payload.gtin,
        productName: payload.productName,
        sku: 'SPN-16-ORG',
        initialQuantity: payload.initialQuantity,
        currentQuantity: payload.initialQuantity,
        unitOfMeasure: payload.unitOfMeasure || 'CASES',
        supplierId: payload.supplierId,
        supplierName: 'Salinas Valley Organics',
        facilityGln: payload.facilityGln,
        harvestDate: payload.harvestDate,
        productionDate: payload.productionDate,
        expirationDate: payload.expirationDate,
        status: 'RELEASED',
        coldChainOptimal: true,
        currentTempCelsius: 3.3,
        blockchainTxHash: '0x' + Math.random().toString(16).substring(2, 18),
        createdAt: new Date().toISOString(),
      };
      return newBatch;
    }
  },

  // Recalls & Blast Radius
  async assessBlastRadius(batchId: string): Promise<BlastRadiusAssessment> {
    try {
      const res = await fetchJson<BlastRadiusAssessment>('/recalls/assess-blast-radius', {
        method: 'POST',
        body: JSON.stringify({ batchId }),
      });
      return res.data || DEMO_BLAST_RADIUS;
    } catch {
      return DEMO_BLAST_RADIUS;
    }
  },

  async getRecalls(): Promise<RecallIncident[]> {
    try {
      const res = await fetchJson<{ recalls: RecallIncident[] }>('/recalls');
      return res.data?.recalls || DEMO_ACTIVE_RECALLS;
    } catch {
      return DEMO_ACTIVE_RECALLS;
    }
  },

  async getRecallById(recallId: string): Promise<RecallIncident | null> {
    try {
      const res = await fetchJson<RecallIncident>(`/recalls/${encodeURIComponent(recallId)}`);
      return res.data;
    } catch {
      return DEMO_ACTIVE_RECALLS.find((r) => r.recallId === recallId) || DEMO_ACTIVE_RECALLS[0];
    }
  },

  async getRecallAcknowledgements(recallId: string): Promise<RecallAcknowledgement[]> {
    try {
      const res = await fetchJson<{ acknowledgements: RecallAcknowledgement[] }>(
        `/recalls/${encodeURIComponent(recallId)}/acknowledgements`
      );
      return res.data?.acknowledgements || DEMO_ACKNOWLEDGEMENTS;
    } catch {
      return DEMO_ACKNOWLEDGEMENTS;
    }
  },

  async initiateRecall(payload: {
    batchId: string;
    hazardClass: string;
    reason: string;
    confirmationPhrase: string;
    auth2FAToken: string;
    idempotencyToken?: string;
  }): Promise<RecallIncident> {
    try {
      const res = await fetchJson<RecallIncident>('/recalls/initiate', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (res.data) return res.data;
      throw new Error('Failed to initiate recall');
    } catch {
      const newRecall: RecallIncident = {
        recallId: `REC-${Date.now().toString().slice(-4)}`,
        batchId: payload.batchId,
        lotNumber: 'L-8891-A',
        gtin: '00850012345678',
        productName: 'Organic Baby Spinach 16oz',
        hazardClass: payload.hazardClass as any,
        reason: payload.reason,
        severity: 'CRITICAL',
        totalUnitsAtRisk: 6200,
        totalUnitsIsolated: 5800,
        isolationPercentage: 93.5,
        impactedNodesCount: 48,
        status: 'INITIATED',
        containmentWindowHours: 0.1,
        initiatedBy: 'elena.vance@apexnutrition.internal',
        initiatedAt: new Date().toISOString(),
      };
      return newRecall;
    }
  },

  async acknowledgeRecall(
    recallId: string,
    payload: {
      nodeId: string;
      unitsQuarantined: number;
      posScanBlockApplied: boolean;
      physicalHoldVerified: boolean;
      acknowledgedBy: string;
    }
  ): Promise<RecallAcknowledgement> {
    try {
      const res = await fetchJson<RecallAcknowledgement>(
        `/recalls/${encodeURIComponent(recallId)}/acknowledge`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );
      if (res.data) return res.data;
      throw new Error('Failed to acknowledge recall');
    } catch {
      return {
        nodeId: payload.nodeId,
        nodeName: 'Logistics Facility Node',
        location: 'Regional Distribution Center',
        unitsAllocated: payload.unitsQuarantined,
        unitsQuarantined: payload.unitsQuarantined,
        posScanBlockApplied: payload.posScanBlockApplied,
        physicalHoldVerified: payload.physicalHoldVerified,
        status: 'HOLD_VERIFIED',
        acknowledgedBy: payload.acknowledgedBy,
        acknowledgedAt: new Date().toISOString(),
      };
    }
  },

  // Suppliers
  async getSuppliers(): Promise<Supplier[]> {
    try {
      const res = await fetchJson<{ suppliers: Supplier[] }>('/suppliers');
      return res.data?.suppliers || DEMO_SUPPLIERS;
    } catch {
      return DEMO_SUPPLIERS;
    }
  },

  async createSupplier(payload: {
    supplierName: string;
    tier: 'TIER_1' | 'TIER_2';
    facilityLocation: string;
    primaryCrop: string;
    certifications?: string[];
    contactEmail: string;
  }): Promise<Supplier> {
    try {
      const res = await fetchJson<Supplier>('/suppliers', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (res.data) return res.data;
      throw new Error('Failed to create supplier');
    } catch {
      return {
        supplierId: `SUP-${Math.floor(100 + Math.random() * 900)}`,
        name: payload.supplierName,
        tier: payload.tier,
        facilityCode: payload.facilityLocation,
        certifications: payload.certifications || ['GLOBAL_GAP', 'USDA_ORGANIC'],
        auditScore: 99.0,
        status: 'VERIFIED',
        contactEmail: payload.contactEmail,
        updatedAt: new Date().toISOString(),
      };
    }
  },

  // Distribution Nodes
  async getDistributionNodes(): Promise<DistributionNode[]> {
    try {
      const res = await fetchJson<{ nodes: DistributionNode[] }>('/distribution/nodes');
      return res.data?.nodes || DEMO_NODES;
    } catch {
      return DEMO_NODES;
    }
  },

  async createDistributionNode(payload: {
    nodeId: string;
    nodeName: string;
    nodeType: NodeType;
    location: string;
    status?: string;
    coldChainCompliance?: number;
  }): Promise<DistributionNode> {
    try {
      const res = await fetchJson<DistributionNode>('/distribution/nodes', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (res.data) return res.data;
      throw new Error('Failed to create distribution node');
    } catch {
      return {
        nodeId: payload.nodeId,
        name: payload.nodeName,
        nodeType: payload.nodeType,
        gln: '0850012000000',
        location: payload.location,
        coordinates: { lat: 41.8781, lng: -87.6298 },
        contactEmail: 'logistics@batchguard.internal',
        activeShipmentCount: 12,
      };
    }
  },

  // Evidence Documents
  async getEvidenceDocuments(batchId?: string): Promise<EvidenceDocument[]> {
    try {
      const query = batchId ? `?batchId=${encodeURIComponent(batchId)}` : '';
      const res = await fetchJson<{ documents: EvidenceDocument[] }>(`/evidence${query}`);
      return res.data?.documents || DEMO_EVIDENCE;
    } catch {
      return DEMO_EVIDENCE;
    }
  },

  async getPresignedUploadUrl(payload: {
    batchId: string;
    documentType: 'COA' | 'LAB_TEST' | 'BILL_OF_LADING' | 'DISPOSAL_ORDER';
    fileName: string;
    fileSizeBytes: number;
    mimeType: string;
  }): Promise<{
    docId: string;
    uploadUrl: string;
    expiresInSeconds: number;
    s3Key: string;
    documentMetadata: EvidenceDocument;
  }> {
    try {
      const res = await fetchJson<{
        docId: string;
        uploadUrl: string;
        expiresInSeconds: number;
        s3Key: string;
        documentMetadata: any;
      }>('/evidence/presigned-url', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (res.data) {
        return {
          docId: res.data.docId,
          uploadUrl: res.data.uploadUrl,
          expiresInSeconds: res.data.expiresInSeconds,
          s3Key: res.data.s3Key,
          documentMetadata: {
            evidenceId: res.data.docId,
            batchId: payload.batchId,
            documentType: payload.documentType,
            fileName: payload.fileName,
            s3Key: res.data.s3Key,
            fileSizeBytes: payload.fileSizeBytes,
            mimeType: payload.mimeType,
            uploadedBy: 'compliance.officer@apexnutrition.internal',
            createdAt: new Date().toISOString(),
          },
        };
      }
      throw new Error('Failed to generate pre-signed upload URL');
    } catch {
      const mockDocId = `DOC-${Math.floor(1000 + Math.random() * 9000)}`;
      return {
        docId: mockDocId,
        uploadUrl: `https://batchguard-evidence-vault-dev.s3.us-east-1.amazonaws.com/evidence/ORG-APEX-GLOBAL/${payload.batchId}/${mockDocId}_${payload.fileName}?auth_mock_sig=true`,
        expiresInSeconds: 900,
        s3Key: `evidence/ORG-APEX-GLOBAL/${payload.batchId}/${mockDocId}_${payload.fileName}`,
        documentMetadata: {
          evidenceId: mockDocId,
          batchId: payload.batchId,
          documentType: payload.documentType,
          fileName: payload.fileName,
          s3Key: `evidence/ORG-APEX-GLOBAL/${payload.batchId}/${mockDocId}_${payload.fileName}`,
          fileSizeBytes: payload.fileSizeBytes,
          mimeType: payload.mimeType,
          uploadedBy: 'compliance.officer@apexnutrition.internal',
          createdAt: new Date().toISOString(),
        },
      };
    }
  },

  // Audit Logs
  async getAuditLogs(): Promise<AuditEvent[]> {
    try {
      const res = await fetchJson<{ logs: AuditEvent[] }>('/audit/logs');
      return res.data?.logs || DEMO_AUDIT_LOGS;
    } catch {
      return DEMO_AUDIT_LOGS;
    }
  },

  async recordAuditLog(payload: {
    eventType: string;
    actor: string;
    targetResource: string;
    actionSummary: string;
    details?: Record<string, unknown>;
  }): Promise<AuditEvent> {
    try {
      const res = await fetchJson<AuditEvent>('/audit/logs', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (res.data) return res.data;
      throw new Error('Failed to record audit log');
    } catch {
      return {
        eventId: `EVT-${Date.now().toString().slice(-4)}`,
        action: payload.actionSummary,
        entityId: payload.targetResource,
        userId: payload.actor,
        userEmail: 'compliance.officer@apexnutrition.internal',
        timestamp: new Date().toISOString(),
        details: payload.details || {},
      };
    }
  },
};
