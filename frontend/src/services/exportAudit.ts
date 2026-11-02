// ============================================================================
// BatchGuard Safety Audit CSV Exporter
// Generates a structured, valid CSV audit manifest for compliance review.
// Clearly labels demonstration data in accordance with transparency directives.
// ============================================================================

import { DEMO_BATCHES, DEMO_AUDIT_LOGS } from './mockData';

export function exportSafetyAuditCsv(): void {
  const isLive = Boolean(import.meta.env.VITE_API_BASE_URL);
  const now = new Date().toISOString();

  const lines: string[] = [
    '# ============================================================================',
    '# BATCHGUARD COMPREHENSIVE SAFETY AUDIT & TRACEABILITY REPORT',
    `# OPERATIONAL MODE: ${isLive ? 'LIVE AWS PRODUCTION LEDGER' : 'LOCAL DEMONSTRATION DATASET (SIMULATED)'}`,
    `# REPORT GENERATED: ${now}`,
    '# REGULATORY CONTEXT: FSMA 204 TRACEABILITY ALIGNMENT FRAMEWORK',
    '# DISCLOSURE: All records represent simulated test lots unless verified in live AWS.',
    '# ============================================================================',
    '',
    '# SECTION 1: MASTER BATCH LOTS & TELEMETRY',
    'BatchID,LotNumber,GTIN,ProductName,Quantity,UOM,Supplier,FacilityGLN,ProductionDate,Status,ColdChainTempCelsius,BlockchainTxHash',
  ];

  for (const b of DEMO_BATCHES) {
    const row = [
      b.batchId,
      b.lotNumber,
      b.gtin,
      `"${b.productName.replace(/"/g, '""')}"`,
      b.currentQuantity,
      b.unitOfMeasure,
      `"${b.supplierName.replace(/"/g, '""')}"`,
      b.facilityGln,
      b.productionDate,
      b.status,
      b.currentTempCelsius,
      b.blockchainTxHash,
    ].join(',');
    lines.push(row);
  }

  lines.push('');
  lines.push('# SECTION 2: AUDIT LOG LEDGER ENTRIES');
  lines.push('EventID,Timestamp,Action,UserID,UserEmail,EntityID,DetailNotes');

  for (const a of DEMO_AUDIT_LOGS) {
    const detailsSummary = JSON.stringify(a.details || {}).replace(/"/g, '""');
    const row = [
      a.eventId,
      a.timestamp,
      a.action,
      `"${a.userId.replace(/"/g, '""')}"`,
      `"${a.userEmail.replace(/"/g, '""')}"`,
      `"${a.entityId.replace(/"/g, '""')}"`,
      `"${detailsSummary}"`,
    ].join(',');
    lines.push(row);
  }

  const csvContent = lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `batchguard-safety-audit-${isLive ? 'prod' : 'demo'}-${now.split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
