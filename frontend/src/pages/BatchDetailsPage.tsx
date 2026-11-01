import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { Batch, BatchLineage } from '../types';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/Toast';

export const BatchDetailsPage: React.FC = () => {
  const { batchId = 'BG-2024-8891-ORG' } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [lineage, setLineage] = useState<BatchLineage | null>(null);
  const [timelineTab, setTimelineTab] = useState<'detailed' | 'audit' | 'map'>('detailed');
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

  const handlePrintPlacard = () => {
    addToast({
      type: 'info',
      title: 'GS1-128 Pallet Placard Generated',
      description: `Thermal barcode manifest for ${batchId} dispatched to printer queue.`,
    });
  };

  const handleDownloadDossier = () => {
    addToast({
      type: 'success',
      title: 'Traceability Dossier Downloaded',
      description: 'Complete FSMA 204 KDE compliance package archived with cryptographic signatures.',
    });
  };

  if (isLoading || !batch) {
    return (
      <div className="p-margin text-center text-outline">
        Loading batch lineage and telemetry...
      </div>
    );
  }

  return (
    <div className="px-gutter py-space-lg flex flex-col gap-space-lg">
      {/* Top Action & Navigation Banner */}
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
                {lineage?.traceabilityCompleteness ? `Traceability Score: ${lineage.traceabilityCompleteness.completenessScore}% (${lineage.traceabilityCompleteness.confidenceLevel})` : 'FSMA 204 Framework Aligned'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-tertiary-container font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
                Status: In Transit
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-fixed text-primary font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                <span className="material-symbols-outlined text-[13px] text-secondary">device_thermostat</span>
                Cold Chain: Optimal {batch.currentTempCelsius}°C
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-data-mono-sm text-data-mono-sm">
                <span className="material-symbols-outlined text-[12px] text-secondary">verified</span>
                GS1 EPCIS v1.2 Ledger Synced
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-space-xs">
            <Button variant="secondary" icon="print" onClick={handlePrintPlacard}>
              Print GS1-128 Placard
            </Button>
            <Button variant="secondary" icon="download" onClick={handleDownloadDossier}>
              Traceability Dossier (PDF)
            </Button>
            <Button variant="secondary" icon="flag" onClick={() => addToast({ type: 'warning', title: 'Quality Review Flagged', description: 'Batch flagged for supervisory organoleptic inspection.' })}>
              Flag Safety Review
            </Button>
            <Button variant="critical" icon="emergency_home" onClick={() => navigate('/recalls')}>
              + Initiate Targeted Recall
            </Button>
          </div>
        </div>
      </div>

      {/* Top Overview Grid (4 Bento Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-md">
        {/* Card 1: Product Identification */}
        <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm border border-surface-container flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
          <div>
            <div className="flex items-center justify-between text-outline mb-space-sm">
              <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">Product Identification</span>
              <span className="material-symbols-outlined text-[20px] text-secondary">eco</span>
            </div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold leading-snug">{batch.productName}</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">16oz Clamshell Package</p>
            <div className="mt-space-md flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-body-sm font-body-sm">
                <span className="text-outline">SKU ID:</span>
                <span className="font-data-mono-sm text-data-mono-sm font-medium text-on-surface">{batch.sku}</span>
              </div>
              <div className="flex items-center justify-between text-body-sm font-body-sm">
                <span className="text-outline">Lot Code:</span>
                <span className="font-data-mono-sm text-data-mono-sm font-medium text-on-surface">#{batch.lotNumber}</span>
              </div>
              <div className="flex items-center justify-between text-body-sm font-body-sm">
                <span className="text-outline">Batch Units:</span>
                <span className="font-data-mono-sm text-data-mono-sm font-medium text-on-surface">{batch.initialQuantity.toLocaleString()} Cases</span>
              </div>
            </div>
          </div>
          <div className="mt-space-md pt-space-sm bg-surface-container-low rounded-lg p-space-xs flex items-center justify-between border border-surface-container">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-outline">Harvest Date</span>
              <span className="font-data-mono-sm text-data-mono-sm font-semibold text-on-surface">{batch.harvestDate}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-label-sm text-label-sm text-outline">Expiration</span>
              <span className="font-data-mono-sm text-data-mono-sm font-semibold text-error">{batch.expirationDate}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Origin & Harvest Site */}
        <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm border border-surface-container flex flex-col justify-between relative overflow-hidden group">
          <div>
            <div className="flex items-center justify-between text-outline mb-space-sm">
              <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">Origin &amp; Agricultural Site</span>
              <span className="material-symbols-outlined text-[20px] text-tertiary">agriculture</span>
            </div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold leading-snug">Green Valley Organics</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Plot Field 14B · Salinas, CA</p>
            <div className="mt-space-md flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-body-sm font-body-sm">
                <span className="text-outline">Farm GPS:</span>
                <span className="font-data-mono-sm text-data-mono-sm font-medium text-primary">36.6777° N, 121.6555° W</span>
              </div>
              <div className="flex items-center justify-between text-body-sm font-body-sm">
                <span className="text-outline">Crew Supervisor:</span>
                <span className="font-body-sm text-body-sm text-on-surface">Crew #44 (M. Hernandez)</span>
              </div>
              <div className="flex items-center justify-between text-body-sm font-body-sm">
                <span className="text-outline">Seed Lot Code:</span>
                <span className="font-data-mono-sm text-data-mono-sm text-on-surface">#SD-098-SPN</span>
              </div>
            </div>
          </div>
          <div className="mt-space-md pt-space-sm bg-surface-container-low rounded-lg p-space-xs flex items-center justify-between border border-surface-container">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-secondary" />
              <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">Soil &amp; Water Matrix</span>
            </div>
            <span className="font-data-mono-sm text-data-mono-sm text-secondary font-semibold">Pass (#WQ-9921)</span>
          </div>
        </div>

        {/* Card 3: Processing & Packaging */}
        <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm border border-surface-container flex flex-col justify-between relative overflow-hidden group">
          <div>
            <div className="flex items-center justify-between text-outline mb-space-sm">
              <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">Processing &amp; Packaging</span>
              <span className="material-symbols-outlined text-[20px] text-tertiary">precision_manufacturing</span>
            </div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold leading-snug">Apex Fresh Processing #2</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Sanitary Line 3 · Gilroy, CA</p>
            <div className="mt-space-md flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-body-sm font-body-sm">
                <span className="text-outline">Sanitizer:</span>
                <span className="font-data-mono-sm text-data-mono-sm text-on-surface">Ozonated H₂O (4.1 ppm)</span>
              </div>
              <div className="flex items-center justify-between text-body-sm font-body-sm">
                <span className="text-outline">Optical Sort:</span>
                <span className="font-body-sm text-body-sm text-secondary font-medium">99.88% Defect Free</span>
              </div>
              <div className="flex items-center justify-between text-body-sm font-body-sm">
                <span className="text-outline">MAP Gas Mix:</span>
                <span className="font-data-mono-sm text-data-mono-sm text-on-surface">3.2% O₂, 9.8% CO₂</span>
              </div>
            </div>
          </div>
          <div className="mt-space-md pt-space-sm bg-surface-container-low rounded-lg p-space-xs flex items-center justify-between border border-surface-container">
            <span className="font-label-sm text-label-sm text-outline">Pack Seal Timestamp</span>
            <span className="font-data-mono-sm text-data-mono-sm font-semibold text-on-surface">Oct 13 · 04:30:18 AM</span>
          </div>
        </div>

        {/* Card 4: Chain of Custody & Telemetry */}
        <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm border border-surface-container flex flex-col justify-between relative overflow-hidden group">
          <div>
            <div className="flex items-center justify-between text-outline mb-space-sm">
              <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">Custody &amp; Telemetry</span>
              <span className="material-symbols-outlined text-[20px] text-secondary">local_shipping</span>
            </div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold leading-snug">Apex Pacific Logistics</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Reefer Trailer #402 · Driver 18</p>
            <div className="mt-space-md flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-body-sm font-body-sm">
                <span className="text-outline">Destination Hub:</span>
                <span className="font-body-sm text-body-sm text-on-surface font-medium truncate max-w-[120px]">Midwest Central (IL)</span>
              </div>
              <div className="flex items-center justify-between text-body-sm font-body-sm">
                <span className="text-outline">Temp Range:</span>
                <span className="font-data-mono-sm text-data-mono-sm text-on-surface">Min 2.8°C · Max 4.1°C</span>
              </div>
              <div className="flex items-center justify-between text-body-sm font-body-sm">
                <span className="text-outline">Mean Setpoint:</span>
                <span className="font-data-mono-sm text-data-mono-sm text-secondary font-bold">3.4°C (Target 3.0-4.0)</span>
              </div>
            </div>
          </div>
          <div className="mt-space-md pt-space-sm bg-surface-container-low rounded-lg p-space-xs flex items-center justify-between border border-surface-container">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-outline">Thermal Variance</span>
              <span className="font-data-mono-sm text-data-mono-sm text-secondary font-medium">±0.4°C Standard Dev</span>
            </div>
            <svg className="w-16 h-6 text-secondary" fill="none" viewBox="0 0 64 20">
              <path d="M0 12 L10 10 L20 14 L30 8 L40 9 L50 6 L64 8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
            </svg>
          </div>
        </div>
      </div>

      {/* Middle Section: GS1 Critical Tracking Events (CTE) Timeline */}
      <div className="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm border border-surface-container flex flex-col gap-space-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
          <div>
            <div className="flex items-center gap-space-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-secondary" />
              <h2 className="font-headline-md text-headline-md text-on-surface font-bold">GS1 Critical Tracking Events (CTE) Timeline</h2>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
              End-to-end Key Data Elements (KDE) captured under FSMA 204 Rule 1.1325 verification framework
            </p>
          </div>
          <div className="flex items-center gap-space-xs bg-surface-container rounded-lg p-1 border border-surface-container-high">
            <button
              onClick={() => setTimelineTab('detailed')}
              className={`px-space-sm py-1 rounded font-label-md text-label-md transition-colors ${
                timelineTab === 'detailed' ? 'bg-surface-container-lowest text-on-surface shadow-sm font-semibold' : 'text-on-surface-variant hover:text-on-surface'
              }`}
              type="button"
            >
              Detailed Flow
            </button>
            <button
              onClick={() => setTimelineTab('audit')}
              className={`px-space-sm py-1 rounded font-label-md text-label-md transition-colors ${
                timelineTab === 'audit' ? 'bg-surface-container-lowest text-on-surface shadow-sm font-semibold' : 'text-on-surface-variant hover:text-on-surface'
              }`}
              type="button"
            >
              Audit Digest
            </button>
            <button
              onClick={() => setTimelineTab('map')}
              className={`px-space-sm py-1 rounded font-label-md text-label-md transition-colors ${
                timelineTab === 'map' ? 'bg-surface-container-lowest text-on-surface shadow-sm font-semibold' : 'text-on-surface-variant hover:text-on-surface'
              }`}
              type="button"
            >
              Sensor Map
            </button>
          </div>
        </div>

        {/* Linear Stepper with 6 Nodes */}
        <div className="relative overflow-x-auto pb-space-sm">
          <div className="min-w-[940px] flex flex-col gap-space-lg">
            {/* Node 1: Harvest CTE */}
            <div className="flex items-start gap-space-md group">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md">
                  <span className="material-symbols-outlined text-[20px]">potted_plant</span>
                </div>
                <div className="w-0.5 h-24 bg-secondary" />
              </div>
              <div className="flex-1 bg-surface-container-low rounded-xl p-space-md transition-all hover:bg-surface-container border border-surface-container">
                <div className="flex flex-wrap items-center justify-between gap-space-xs mb-space-xs">
                  <div className="flex items-center gap-space-xs">
                    <span className="font-data-mono-sm text-data-mono-sm px-2 py-0.5 rounded bg-primary-container text-on-primary font-semibold">
                      CTE-01: HARVEST
                    </span>
                    <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                      Green Valley Organics · Field 14B
                    </span>
                  </div>
                  <div className="flex items-center gap-space-xs text-outline font-data-mono-sm text-data-mono-sm">
                    <span className="material-symbols-outlined text-[16px]">schedule</span>
                    <span>2024-10-12 05:45:00 PDT</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-space-sm pt-space-xs">
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-outline">KDE: Geographic Coordinate</span>
                    <span className="font-data-mono-sm text-data-mono-sm text-on-surface font-medium">36.6777° N, 121.6555° W</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-outline">KDE: Harvesting Crew / GLN</span>
                    <span className="font-data-mono-sm text-data-mono-sm text-on-surface font-medium">GLN 0850012000015 (Crew 44)</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-outline">KDE: Agricultural Water Test</span>
                    <span className="font-data-mono-sm text-data-mono-sm text-secondary font-medium">&lt;1 CFU/100mL (Clean)</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-outline">Field Ambient Temp</span>
                    <span className="font-data-mono-sm text-data-mono-sm text-on-surface font-medium">14.2°C (Clear skies)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Node 2: Initial Cooling CTE */}
            <div className="flex items-start gap-space-md group">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md">
                  <span className="material-symbols-outlined text-[20px]">ac_unit</span>
                </div>
                <div className="w-0.5 h-24 bg-secondary" />
              </div>
              <div className="flex-1 bg-surface-container-low rounded-xl p-space-md transition-all hover:bg-surface-container border border-surface-container">
                <div className="flex flex-wrap items-center justify-between gap-space-xs mb-space-xs">
                  <div className="flex items-center gap-space-xs">
                    <span className="font-data-mono-sm text-data-mono-sm px-2 py-0.5 rounded bg-primary-container text-on-primary font-semibold">
                      CTE-02: INITIAL COOLING
                    </span>
                    <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                      Salinas Rapid Chill Post-Harvest Hub
                    </span>
                  </div>
                  <div className="flex items-center gap-space-xs text-outline font-data-mono-sm text-data-mono-sm">
                    <span className="material-symbols-outlined text-[16px]">schedule</span>
                    <span>2024-10-12 07:15:22 PDT</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-space-sm pt-space-xs">
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-outline">KDE: Cooling Method</span>
                    <span className="font-body-sm text-body-sm text-on-surface font-medium">Forced-air vacuum hydro-cool</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-outline">KDE: Target Pull-Down Time</span>
                    <span className="font-data-mono-sm text-data-mono-sm text-secondary font-medium">42 Minutes (Threshold &lt;60m)</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-outline">KDE: Core Pulp Temp Achieved</span>
                    <span className="font-data-mono-sm text-data-mono-sm text-on-surface font-medium">3.2°C Stabilized</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-outline">Hydro Safe Residual</span>
                    <span className="font-data-mono-sm text-data-mono-sm text-on-surface font-medium">Free Cl: 2.1 mg/L</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Node 3: Transformation CTE */}
            <div className="flex items-start gap-space-md group">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md">
                  <span className="material-symbols-outlined text-[20px]">filter_vintage</span>
                </div>
                <div className="w-0.5 h-24 bg-secondary" />
              </div>
              <div className="flex-1 bg-surface-container-low rounded-xl p-space-md transition-all hover:bg-surface-container border border-surface-container">
                <div className="flex flex-wrap items-center justify-between gap-space-xs mb-space-xs">
                  <div className="flex items-center gap-space-xs">
                    <span className="font-data-mono-sm text-data-mono-sm px-2 py-0.5 rounded bg-primary-container text-on-primary font-semibold">
                      CTE-03: TRANSFORMATION
                    </span>
                    <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                      Gilroy Apex Processing Facility · Unit 2
                    </span>
                  </div>
                  <div className="flex items-center gap-space-xs text-outline font-data-mono-sm text-data-mono-sm">
                    <span className="material-symbols-outlined text-[16px]">schedule</span>
                    <span>2024-10-13 04:30:18 PDT</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-space-sm pt-space-xs">
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-outline">KDE: Input Lot Genealogy</span>
                    <span className="font-data-mono-sm text-data-mono-sm text-primary font-medium">SD-098 → SPN-RAW-8821</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-outline">KDE: Sanitation Protocol</span>
                    <span className="font-body-sm text-body-sm text-on-surface font-medium">Triple Ozonated Rinse + UV</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-outline">KDE: Output Lot Code Generated</span>
                    <span className="font-data-mono-sm text-data-mono-sm text-on-surface font-medium">L-8891-A (14,400 Units)</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-outline">Optical Foreign Object Check</span>
                    <span className="font-data-mono-sm text-data-mono-sm text-secondary font-medium">Clean · 0 Rejections</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Node 4: Shipping CTE */}
            <div className="flex items-start gap-space-md group">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md">
                  <span className="material-symbols-outlined text-[20px]">outbox</span>
                </div>
                <div className="w-0.5 h-24 bg-secondary" />
              </div>
              <div className="flex-1 bg-surface-container-low rounded-xl p-space-md transition-all hover:bg-surface-container border border-surface-container">
                <div className="flex flex-wrap items-center justify-between gap-space-xs mb-space-xs">
                  <div className="flex items-center gap-space-xs">
                    <span className="font-data-mono-sm text-data-mono-sm px-2 py-0.5 rounded bg-primary-container text-on-primary font-semibold">
                      CTE-04: SHIPPING
                    </span>
                    <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                      Apex Dispatch Gilroy Dock Door #07
                    </span>
                  </div>
                  <div className="flex items-center gap-space-xs text-outline font-data-mono-sm text-data-mono-sm">
                    <span className="material-symbols-outlined text-[16px]">schedule</span>
                    <span>2024-10-13 11:20:00 PDT</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-space-sm pt-space-xs">
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-outline">KDE: Bill of Lading (eBOL)</span>
                    <span className="font-data-mono-sm text-data-mono-sm text-on-surface font-medium">#BOL-99281-GLR</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-outline">KDE: Carrier &amp; Reefer ID</span>
                    <span className="font-data-mono-sm text-data-mono-sm text-on-surface font-medium">Apex Logistics #TRK-402</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-outline">KDE: Departure Temp Verification</span>
                    <span className="font-data-mono-sm text-data-mono-sm text-secondary font-medium">3.0°C (Pre-cooled container)</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-outline">Digital Seal Lock</span>
                    <span className="font-data-mono-sm text-data-mono-sm text-on-surface font-medium">SEAL-908284-SEC</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Node 5: In-Transit Live Telemetry (Active radar pulse) */}
            <div className="flex items-start gap-space-md group">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-secondary text-surface-container-lowest flex items-center justify-center shadow-lg relative">
                  <span className="absolute -inset-1 rounded-full bg-secondary/30 animate-ping" />
                  <span className="material-symbols-outlined text-[20px] relative z-10 text-white">navigation</span>
                </div>
                <div className="w-0.5 h-24 bg-surface-container-high" />
              </div>
              <div className="flex-1 bg-surface-container rounded-xl p-space-md shadow-sm border border-secondary/30">
                <div className="flex flex-wrap items-center justify-between gap-space-xs mb-space-xs">
                  <div className="flex items-center gap-space-xs">
                    <span className="font-data-mono-sm text-data-mono-sm px-2 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed-variant font-bold animate-pulse">
                      ACTIVE CTE: IN-TRANSIT TELEMETRY
                    </span>
                    <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                      I-80 Eastbound · Salt Lake City Corridor
                    </span>
                  </div>
                  <div className="flex items-center gap-space-xs text-secondary font-data-mono-sm text-data-mono-sm font-semibold">
                    <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                    <span>Live Ping: 2 mins ago</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-space-sm pt-space-xs">
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-outline">GPS Coordinate</span>
                    <span className="font-data-mono-sm text-data-mono-sm text-on-surface font-medium">40.7608° N, 111.8910° W</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-outline">Cargo Temp Probe Avg</span>
                    <span className="font-data-mono-sm text-data-mono-sm text-secondary font-bold">3.2°C (Optimal)</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-outline">Door Sensors State</span>
                    <span className="font-data-mono-sm text-data-mono-sm text-secondary font-medium">Sealed / Closed (0 Events)</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-outline">Remaining Distance</span>
                    <span className="font-data-mono-sm text-data-mono-sm text-on-surface font-medium">1,210 Miles to Midwest Hub</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Node 6: Scheduled Receiving */}
            <div className="flex items-start gap-space-md opacity-75 group">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-surface-container-high text-outline flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">warehouse</span>
                </div>
              </div>
              <div className="flex-1 bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-surface-container">
                <div className="flex flex-wrap items-center justify-between gap-space-xs mb-space-xs">
                  <div className="flex items-center gap-space-xs">
                    <span className="font-data-mono-sm text-data-mono-sm px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-semibold">
                      CTE-05 (SCHEDULED): RECEIVING
                    </span>
                    <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                      Midwest Central Distribution Center · Joliet, IL
                    </span>
                  </div>
                  <div className="flex items-center gap-space-xs text-outline font-data-mono-sm text-data-mono-sm">
                    <span className="material-symbols-outlined text-[16px]">event</span>
                    <span>ETA: Oct 15, 2024 · 06:00 CST</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-space-sm pt-space-xs">
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-outline">Destination GLN</span>
                    <span className="font-data-mono-sm text-data-mono-sm text-on-surface">GLN 0085001994821</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-outline">Intake Protocol</span>
                    <span className="font-body-sm text-body-sm text-on-surface">Automated Dock Scan + RFID Handshake</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-outline">Assigned Inbound Bay</span>
                    <span className="font-data-mono-sm text-data-mono-sm text-on-surface">Cold Dock Bay #14</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-outline">Downstream Allocation</span>
                    <span className="font-body-sm text-body-sm text-on-surface">3 Regional Retail Chains</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Two-Column Grid: Compliance Docs & Component Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-start">
        {/* Left Column: Linked Supporting Compliance Documents (7 Cols) */}
        <div className="lg:col-span-7 rounded-xl bg-surface-container-lowest p-space-md shadow-sm border border-surface-container flex flex-col gap-space-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-[20px] text-primary">verified_user</span>
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                Linked Supporting Compliance Documents
              </h2>
            </div>
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
              4 Verified Records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low text-outline font-label-sm text-label-sm uppercase tracking-wider border-b border-surface-container">
                  <th className="py-2.5 px-space-md rounded-l-lg font-semibold">Document / Specification</th>
                  <th className="py-2.5 px-space-sm font-semibold">Issuer / Entity</th>
                  <th className="py-2.5 px-space-sm font-semibold">Status</th>
                  <th className="py-2.5 px-space-md text-right rounded-r-lg font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container text-body-sm font-body-sm">
                <tr className="hover:bg-surface-container-low transition-colors">
                  <td className="py-3 px-space-md">
                    <div className="flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-[18px] text-error">picture_as_pdf</span>
                      <div className="flex flex-col">
                        <span className="font-label-md text-label-md font-semibold text-on-surface">
                          Microbiological Pathogen Screen
                        </span>
                        <span className="font-data-mono-sm text-data-mono-sm text-outline">
                          Negative: E. coli O157:H7 &amp; Salmonella spp.
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-space-sm text-on-surface-variant font-data-mono-sm text-data-mono-sm">
                    BioCert Analytical Labs
                  </td>
                  <td className="py-3 px-space-sm">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-label-sm font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                      Verified
                    </span>
                  </td>
                  <td className="py-3 px-space-md text-right">
                    <button
                      onClick={() => addToast({ type: 'info', title: 'Opening Lab Certificate', description: 'Viewing BioCert verified microbiological report (PDF).' })}
                      className="font-label-md text-label-md text-primary font-semibold hover:underline"
                      type="button"
                    >
                      View PDF
                    </button>
                  </td>
                </tr>

                <tr className="hover:bg-surface-container-low transition-colors">
                  <td className="py-3 px-space-md">
                    <div className="flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-[18px] text-secondary">verified</span>
                      <div className="flex flex-col">
                        <span className="font-label-md text-label-md font-semibold text-on-surface">
                          USDA NOP Organic Certification
                        </span>
                        <span className="font-data-mono-sm text-data-mono-sm text-outline">
                          Certificate #ORG-2024-881 (Salinas Valley)
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-space-sm text-on-surface-variant font-data-mono-sm text-data-mono-sm">
                    CCOF Certified Organic
                  </td>
                  <td className="py-3 px-space-sm">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm font-semibold">
                      Valid Dec 2025
                    </span>
                  </td>
                  <td className="py-3 px-space-md text-right">
                    <button
                      onClick={() => addToast({ type: 'info', title: 'USDA Certificate Valid', description: 'Inspecting CCOF organic compliance attestation.' })}
                      className="font-label-md text-label-md text-primary font-semibold hover:underline"
                      type="button"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>

                <tr className="hover:bg-surface-container-low transition-colors">
                  <td className="py-3 px-space-md">
                    <div className="flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-[18px] text-tertiary">table_chart</span>
                      <div className="flex flex-col">
                        <span className="font-label-md text-label-md font-semibold text-on-surface">
                          Continuous Reefer Telemetry Log
                        </span>
                        <span className="font-data-mono-sm text-data-mono-sm text-outline">
                          2,400 raw readings (60-sec intervals)
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-space-sm text-on-surface-variant font-data-mono-sm text-data-mono-sm">
                    ThermoKing Sentrac Telematics
                  </td>
                  <td className="py-3 px-space-sm">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-label-sm font-semibold">
                      Streaming
                    </span>
                  </td>
                  <td className="py-3 px-space-md text-right">
                    <button
                      onClick={() => addToast({ type: 'success', title: 'Exported Telemetry Data', description: 'Downloaded 2,400 sensor data points (CSV).' })}
                      className="font-label-md text-label-md text-primary font-semibold hover:underline"
                      type="button"
                    >
                      Raw CSV
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Component Inputs & BOM (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-space-md">
          <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm border border-surface-container flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-[20px] text-secondary">account_tree</span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  Component Inputs &amp; BOM
                </h2>
              </div>
              <span className="font-data-mono-sm text-data-mono-sm text-outline">100% Sourced</span>
            </div>

            <div className="flex flex-col gap-space-sm">
              {/* Ingredient Leaf */}
              <div className="flex items-center justify-between p-space-sm bg-surface-container-low rounded-lg border border-surface-container">
                <div className="flex items-center gap-space-sm">
                  <span className="w-8 h-8 rounded-lg bg-primary-container text-on-primary font-bold text-xs flex items-center justify-center">
                    95%
                  </span>
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md text-on-surface font-semibold">Spinach Leaves (Raw)</span>
                    <span className="font-data-mono-sm text-data-mono-sm text-outline">100% Field 14B · Lot #SD-098</span>
                  </div>
                </div>
                <span className="font-label-sm text-label-sm text-secondary font-semibold">Tier 1 Pure</span>
              </div>

              {/* Packaging Clamshell */}
              <div className="flex items-center justify-between p-space-sm bg-surface-container-low rounded-lg border border-surface-container">
                <div className="flex items-center gap-space-sm">
                  <span className="w-8 h-8 rounded-lg bg-surface-container text-on-surface font-bold text-xs flex items-center justify-center">
                    PKG
                  </span>
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md text-on-surface font-semibold">Recycled PET Clamshell 16oz</span>
                    <span className="font-data-mono-sm text-data-mono-sm text-outline">Batch #PK-4491 · Amcor Eco</span>
                  </div>
                </div>
                <span className="font-label-sm text-label-sm text-outline font-semibold">Food Grade</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
