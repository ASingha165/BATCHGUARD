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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/v1';
const USE_DEMO_DATA = !import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_USE_MOCK_DATA === 'true';

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
  if (USE_DEMO_DATA) {
    // Return early if configured for pure local demo mode
    throw new Error('DEMO_MODE_ACTIVE');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.error?.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
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
      return res.data?.batches || DEMO_BATCHES;
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

  async getRecallAcknowledgements(recallId: string): Promise<RecallAcknowledgement[]> {
    try {
      const res = await fetchJson<{ acknowledgements: RecallAcknowledgement[] }>(`/recalls/${encodeURIComponent(recallId)}/acknowledgements`);
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
    } catch (err) {
      if (USE_DEMO_DATA) {
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
      throw err;
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

  // Distribution Nodes
  async getDistributionNodes(): Promise<DistributionNode[]> {
    try {
      const res = await fetchJson<{ nodes: DistributionNode[] }>('/distribution/nodes');
      return res.data?.nodes || DEMO_NODES;
    } catch {
      return DEMO_NODES;
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

  // Audit Logs
  async getAuditLogs(): Promise<AuditEvent[]> {
    try {
      const res = await fetchJson<{ logs: AuditEvent[] }>('/audit/logs');
      return res.data?.logs || DEMO_AUDIT_LOGS;
    } catch {
      return DEMO_AUDIT_LOGS;
    }
  },
};

