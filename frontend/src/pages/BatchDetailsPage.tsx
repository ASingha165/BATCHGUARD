import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { Batch, BatchLineage } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Button } from '../components/common/Button';

export const BatchDetailsPage: React.FC = () => {
  const { batchId = 'BG-2024-8891-ORG' } = useParams<{ batchId: string }>();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [lineage, setLineage] = useState<BatchLineage | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadBatch() {
      setIsLoading(true);
      try {
        const [batchRes, lineageRes] = await Promise.all([
          apiService.getBatchById(batchId),
          apiService.getBatchLineage(batchId),
        ]);
        setBatch(batchRes);
        setLineage(lineageRes);
      } finally {
        setIsLoading(false);
      }
    }
    loadBatch();
  }, [batchId]);

  if (isLoading || !batch) {
    return (
      <div className="p-margin text-center text-outline">
        Loading batch lineage and telemetry...
      </div>
    );
  }

  return (
    <div className="px-gutter py-space-lg flex flex-col gap-space-lg">
      {/* Top Breadcrumb & Action Banner */}
      <div className="flex flex-col gap-space-sm">
        <div className="flex items-center gap-space-xs font-label-md text-label-md text-outline">
          <Link to="/batches" className="hover:text-on-surface transition-colors">Batches</Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-on-surface-variant">{batch.productName}</span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="font-data-mono-sm text-data-mono-sm text-primary font-semibold">{batch.batchId}</span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md mt-space-xs">
          <div className="flex flex-col gap-space-xs">
            <div className="flex flex-wrap items-center gap-space-sm">
              <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">
                Batch Profile: {batch.batchId}
              </h1>
              <span className="font-data-mono-sm text-data-mono-sm px-space-sm py-0.5 rounded-full bg-surface-container-high text-on-surface font-medium flex items-center gap-1 border border-surface-container">
                <span className="material-symbols-outlined text-[14px] text-outline">qr_code_2</span>
                GTIN: {batch.gtin}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-space-xs pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                FSMA 204 Compliant
              </span>
              <StatusBadge status={batch.status} />
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-fixed text-primary font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                <span className="material-symbols-outlined text-[13px] text-secondary">device_thermostat</span>
                Cold Chain: {batch.currentTempCelsius}°C
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-data-mono-sm text-data-mono-sm">
                <span className="material-symbols-outlined text-[12px] text-secondary">verified</span>
                GS1 EPCIS v1.2 Ledger Synced
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-space-xs">
            <Button variant="secondary" icon="print">
              Print Placard
            </Button>
            <Button variant="secondary" icon="download">
              Traceability Dossier
            </Button>
            <Link to="/recalls">
              <Button variant="critical" icon="emergency_home">
                + Initiate Targeted Recall
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 4 Bento Cards Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-md">
        {/* Card 1: Product Identification */}
        <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm border border-surface-container flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-outline mb-space-sm">
              <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">Product Identification</span>
              <span className="material-symbols-outlined text-[20px] text-secondary">eco</span>
            </div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">{batch.productName}</h2>
            <div className="mt-space-md flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-body-sm font-body-sm">
                <span className="text-outline">SKU ID:</span>
                <span className="font-data-mono-sm text-data-mono-sm font-medium text-on-surface">{batch.sku}</span>
              </div>
              <div className="flex items-center justify-between text-body-sm font-body-sm">
                <span className="text-outline">Lot Code:</span>
                <span className="font-data-mono-sm text-data-mono-sm font-medium text-on-surface">{batch.lotNumber}</span>
              </div>
              <div className="flex items-center justify-between text-body-sm font-body-sm">
                <span className="text-outline">Batch Units:</span>
                <span className="font-data-mono-sm text-data-mono-sm font-semibold text-on-surface">{batch.initialQuantity.toLocaleString()} Cases</span>
              </div>
            </div>
          </div>
          <div className="mt-space-md pt-space-sm bg-surface-container-low rounded-lg p-space-xs flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-outline">Harvest: {batch.harvestDate}</span>
            <span className="font-label-sm text-label-sm text-secondary font-semibold">Exp: {batch.expirationDate}</span>
          </div>
        </div>

        {/* Card 2: Supplier Information */}
        <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm border border-surface-container flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-outline mb-space-sm">
              <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">Source Supplier</span>
              <span className="material-symbols-outlined text-[20px] text-primary">factory</span>
            </div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">{batch.supplierName}</h2>
            <div className="mt-space-md flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-body-sm font-body-sm">
                <span className="text-outline">Supplier ID:</span>
                <span className="font-data-mono-sm text-data-mono-sm font-medium text-on-surface">{batch.supplierId}</span>
              </div>
              <div className="flex items-center justify-between text-body-sm font-body-sm">
                <span className="text-outline">Facility GLN:</span>
                <span className="font-data-mono-sm text-data-mono-sm font-medium text-on-surface">{batch.facilityGln}</span>
              </div>
              <div className="flex items-center justify-between text-body-sm font-body-sm">
                <span className="text-outline">Tier Status:</span>
                <span className="font-data-mono-sm text-data-mono-sm font-semibold text-secondary">Global Tier 1</span>
              </div>
            </div>
          </div>
          <div className="mt-space-md pt-space-sm bg-surface-container-low rounded-lg p-space-xs flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-outline">Audit Score</span>
            <span className="font-label-sm text-label-sm text-secondary font-bold">99.2% Passed</span>
          </div>
        </div>

        {/* Card 3: Cold-Chain Telemetry */}
        <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm border border-surface-container flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-outline mb-space-sm">
              <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">Sensor Telemetry</span>
              <span className="material-symbols-outlined text-[20px] text-secondary">device_thermostat</span>
            </div>
            <div className="flex items-baseline gap-space-xs">
              <span className="font-display text-display text-on-surface font-bold tnum">{batch.currentTempCelsius}°C</span>
              <span className="font-label-sm text-label-sm text-secondary font-semibold">Target: 1.0 - 4.0°C</span>
            </div>
            <div className="mt-space-md flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-body-sm font-body-sm">
                <span className="text-outline">Excursion Flags:</span>
                <span className="font-data-mono-sm text-data-mono-sm font-semibold text-secondary">0 Detected</span>
              </div>
              <div className="flex items-center justify-between text-body-sm font-body-sm">
                <span className="text-outline">Logger Status:</span>
                <span className="font-data-mono-sm text-data-mono-sm text-on-surface">Active BLE Mesh</span>
              </div>
            </div>
          </div>
          <div className="mt-space-md pt-space-sm bg-surface-container-low rounded-lg p-space-xs flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-outline">Last ping</span>
            <span className="font-label-sm text-label-sm text-on-surface font-semibold">2 mins ago</span>
          </div>
        </div>

        {/* Card 4: Cryptographic Ledger */}
        <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm border border-surface-container flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-outline mb-space-sm">
              <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">Chain of Custody Hash</span>
              <span className="material-symbols-outlined text-[20px] text-secondary">enhanced_encryption</span>
            </div>
            <div className="font-data-mono text-data-mono font-bold text-primary truncate">
              {batch.blockchainTxHash}
            </div>
            <p className="font-body-sm text-body-sm text-outline mt-2">
              Cryptographically sealed CTE event trail. Verifiable append-only ledger on AWS.
            </p>
          </div>
          <div className="mt-space-md pt-space-sm bg-surface-container-low rounded-lg p-space-xs flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-secondary font-semibold">Tamper Proof</span>
            <span className="font-label-sm text-label-sm text-outline">12 CTEs logged</span>
          </div>
        </div>
      </div>

      {/* Upstream & Downstream Lineage Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
        {/* Upstream Ingredients */}
        <div className="bg-surface-container-lowest rounded-xl p-space-md border border-surface-container shadow-sm flex flex-col gap-space-md">
          <div className="flex items-center justify-between border-b border-surface-container pb-space-xs">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary text-[20px]">call_received</span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Upstream Ingredients &amp; Harvest</h3>
            </div>
            <span className="font-data-mono-sm text-data-mono-sm text-outline">{lineage?.upstream.length} Lots Linked</span>
          </div>

          <div className="flex flex-col gap-space-sm">
            {lineage?.upstream.map((ing) => (
              <div key={ing.rawLotId} className="p-space-sm rounded-lg bg-surface-container-low border border-surface-container flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-data-mono text-data-mono font-semibold text-primary">{ing.rawLotId}</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-label-sm text-label-sm uppercase font-semibold">
                    Microbial {ing.tests.microbial}
                  </span>
                </div>
                <span className="font-medium text-on-surface">{ing.ingredient}</span>
                <span className="font-body-sm text-body-sm text-outline">{ing.supplier} • {ing.farmLocation}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Downstream Distribution Nodes */}
        <div className="bg-surface-container-lowest rounded-xl p-space-md border border-surface-container shadow-sm flex flex-col gap-space-md">
          <div className="flex items-center justify-between border-b border-surface-container pb-space-xs">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-secondary text-[20px]">call_made</span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Downstream Distribution Custody</h3>
            </div>
            <span className="font-data-mono-sm text-data-mono-sm text-outline">{lineage?.downstream.length} Nodes Ingested</span>
          </div>

          <div className="flex flex-col gap-space-sm">
            {lineage?.downstream.map((node) => (
              <div key={node.nodeId} className="p-space-sm rounded-lg bg-surface-container-low border border-surface-container flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-data-mono text-data-mono font-semibold text-on-surface">{node.nodeId}</span>
                  <StatusBadge status={node.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-on-surface">{node.nodeName}</span>
                  <span className="font-data-mono text-data-mono font-bold text-primary">{node.allocatedUnits.toLocaleString()} units</span>
                </div>
                <span className="font-body-sm text-body-sm text-outline">{node.location}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

