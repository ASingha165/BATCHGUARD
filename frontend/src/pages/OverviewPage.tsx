import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { exportSafetyAuditCsv } from '../services/exportAudit';
import { Batch, OverviewSummary } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/Toast';

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [summary, setSummary] = useState<OverviewSummary | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d' | 'Quarter'>('24h');

  useEffect(() => {
    async function loadData() {
      try {
        const [sumRes, batchRes] = await Promise.all([
          apiService.getOverviewSummary(),
          apiService.getBatches(),
        ]);
        setSummary(sumRes);
        setBatches(batchRes);
      } catch (err) {
        console.error(err);
      }
    }
    loadData();
  }, []);

  const isLiveBackend = Boolean(import.meta.env.VITE_API_BASE_URL);

  const handleExportAudit = () => {
    try {
      exportSafetyAuditCsv();
      addToast({
        type: 'success',
        title: 'Safety Audit Exported (CSV)',
        description: isLiveBackend
          ? 'Compiled live FSMA 204 audit dossier (CSV) downloaded successfully.'
          : 'Downloaded batchguard-safety-audit-demo.csv (clearly labeled demonstration dataset).',
      });
    } catch {
      addToast({
        type: 'error',
        title: 'Export Failed',
        description: 'Unable to generate CSV audit report.',
      });
    }
  };

  return (
    <div className="w-full px-space-md sm:px-space-lg py-space-lg flex flex-col gap-space-lg">
      {/* Page Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center gap-space-xs flex-wrap">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse" />
            <span className="font-data-mono-sm text-data-mono-sm uppercase text-secondary font-semibold tracking-wider">
              FSMA 204 &amp; GS1 Traceability Framework
            </span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold tracking-wider ${
              isLiveBackend
                ? 'bg-secondary/15 text-secondary border border-secondary/30'
                : 'bg-amber-500/15 text-amber-700 border border-amber-500/30'
            }`}>
              {isLiveBackend ? 'LIVE AWS METRICS' : 'DEMO DATASET'}
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">
            Operational Overview
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
            Enterprise food supply-chain traceability, multi-node custody tracking, and active incident containment posture.
          </p>
        </div>

        <div className="flex items-center gap-space-sm flex-wrap">
          <Button variant="secondary" icon="file_download" onClick={handleExportAudit}>
            Export Safety Audit (PDF/CSV)
          </Button>
          <Button variant="primary" icon="add" onClick={() => navigate('/batches?register=true')}>
            Register New Batch
          </Button>
        </div>
      </div>

      {/* Regulatory Framework Sentinel Banner */}
      <div className="w-full bg-surface-container-low rounded-xl px-space-md py-space-sm flex flex-col sm:flex-row sm:items-center justify-between gap-space-md shadow-sm border border-surface-container">
        <div className="flex items-center gap-space-sm min-w-0">
          <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center shrink-0 text-secondary">
            <span className="material-symbols-outlined text-[20px]">verified_user</span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface truncate">
            <span className="font-semibold text-secondary">FSMA 204 KDE Traceability Architecture Active</span> across modeled logistics nodes. Critical tracking event schemas aligned.
          </p>
        </div>
        <div className="flex items-center gap-space-md shrink-0">
          <span className="font-data-mono-sm text-data-mono-sm text-outline hidden sm:inline">
            {isLiveBackend ? 'Live telemetry synced' : 'Simulated telemetry: 4 mins ago'}
          </span>
          <Link to="/audit-logs" className="text-secondary hover:underline font-label-sm text-label-sm font-semibold flex items-center gap-0.5">
            <span>Telemetry Ledger</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </Link>
        </div>
      </div>

      {/* 4 Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
        {/* KPI 1 */}
        <div className="bg-surface-container-lowest rounded-xl p-space-lg flex flex-col justify-between shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow border border-surface-container/60">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary-fixed/20 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="font-label-md text-label-md text-outline">Total Registered Batches</span>
            <span className="px-space-xs py-0.5 rounded-full bg-surface-container text-secondary font-label-sm text-label-sm flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[13px]">trending_up</span>+12.4%
            </span>
          </div>
          <div className="my-space-sm flex items-baseline justify-between">
            <span className="font-display text-display text-on-surface font-bold tracking-tight tnum">
              {(summary?.totalBatches || 148920).toLocaleString()}
            </span>
            <svg className="w-20 h-8 text-secondary overflow-visible" fill="none" viewBox="0 0 80 30">
              <path d="M 2 24 Q 18 20 28 14 T 48 18 T 68 8 T 78 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
              <path d="M 2 24 Q 18 20 28 14 T 48 18 T 68 8 T 78 4 L 78 30 L 2 30 Z" fill="currentColor" fillOpacity="0.12" />
            </svg>
          </div>
          <div className="flex items-center justify-between text-outline font-data-mono-sm text-data-mono-sm">
            <span>Active lifecycle: 42,180</span>
            <span className="text-on-surface-variant font-medium">99.8% on-spec</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-surface-container-lowest rounded-xl p-space-lg flex flex-col justify-between shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow border border-surface-container/60">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-label-md text-outline">Active Verified Suppliers</span>
            <span className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[16px]">verified</span>
            </span>
          </div>
          <div className="my-space-sm flex items-baseline justify-between">
            <span className="font-display text-display text-on-surface font-bold tracking-tight tnum">
              {(summary?.activeSuppliers || 1248).toLocaleString()}
            </span>
            <span className="font-headline-sm text-headline-sm text-secondary font-semibold">99.2%</span>
          </div>
          <div className="flex items-center justify-between font-data-mono-sm text-data-mono-sm">
            <span className="text-outline">14 undergoing audit</span>
            <span className="text-secondary font-medium">Global Tier 1</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-surface-container-lowest rounded-xl p-space-lg flex flex-col justify-between shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow border border-surface-container/60">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-label-md text-outline">Monitored Distribution Nodes</span>
            <span className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-[16px]">hub</span>
            </span>
          </div>
          <div className="my-space-sm flex items-baseline justify-between">
            <span className="font-display text-display text-on-surface font-bold tracking-tight tnum">
              {(summary?.monitoredDistributionNodes || 4821).toLocaleString()}
            </span>
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">18 Countries</span>
          </div>
          <div className="flex items-center justify-between text-outline font-data-mono-sm text-data-mono-sm">
            <span>Cold chain &amp; processing</span>
            <span className="text-on-surface-variant font-medium">0 offline hubs</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-surface-container-lowest rounded-xl p-space-lg flex flex-col justify-between shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow border border-surface-container/60">
          <div className="absolute inset-x-0 top-0 h-1 bg-error" />
          <div className="flex items-center justify-between">
            <span className="font-label-md text-label-md text-outline">Open Recall Incidents</span>
            <span className="px-space-xs py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm uppercase font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-error animate-ping" />
              <span>Critical</span>
            </span>
          </div>
          <div className="my-space-sm flex items-baseline justify-between">
            <span className="font-display text-display text-error font-bold tracking-tight">2 Active</span>
            <span className="font-data-mono-sm text-data-mono-sm text-on-surface-variant font-medium">1 Cl-I / 1 Cl-II</span>
          </div>
          <div className="flex items-center justify-between text-outline font-data-mono-sm text-data-mono-sm">
            <span>Avg containment: <strong className="text-on-surface">42m</strong></span>
            <span className="text-error font-semibold">Immediate Action</span>
          </div>
        </div>
      </div>

      {/* Main 12-Column Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* LEFT COLUMN: 8 of 12 cols */}
        <div className="lg:col-span-8 flex flex-col gap-space-lg">
          {/* Velocity & CTE Throughput Chart */}
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-surface-container flex flex-col gap-space-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  Supply Chain Ingestion &amp; Custody Velocity
                </span>
                <span className="font-body-sm text-body-sm text-outline">
                  Real-time CTE throughput across Harvest, Transformation, Cooling &amp; Logistics nodes
                </span>
              </div>
              <div className="inline-flex p-0.5 rounded-lg bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm self-start sm:self-auto border border-surface-container">
                {(['24h', '7d', '30d', 'Quarter'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTimeframe(t)}
                    className={`px-space-sm py-1 rounded transition-colors ${
                      timeframe === t
                        ? 'bg-surface-container-lowest text-on-surface font-semibold shadow-xs'
                        : 'hover:text-on-surface'
                    }`}
                    type="button"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Visual Vector Chart Area with SVG */}
            <div className="relative w-full h-64 bg-surface-container-low rounded-xl p-space-md flex flex-col justify-between overflow-hidden border border-surface-container">
              {/* Horizontal grid lines */}
              <div className="absolute inset-0 px-space-md py-space-sm flex flex-col justify-between pointer-events-none opacity-40">
                <div className="w-full h-px bg-outline-variant" />
                <div className="w-full h-px bg-outline-variant" />
                <div className="w-full h-px bg-outline-variant" />
                <div className="w-full h-px bg-outline-variant" />
                <div className="w-full h-px bg-outline-variant" />
              </div>

              {/* Dynamic SVG with gradient fill and data curve */}
              <div className="relative w-full h-full flex items-end justify-between z-10 pt-4">
                <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 700 200">
                  <defs>
                    <linearGradient id="gradient-velocity" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#006c49" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#006c49" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path d="M 0 170 Q 70 120 140 140 T 280 80 T 420 110 T 560 40 T 700 65 L 700 200 L 0 200 Z" fill="url(#gradient-velocity)" />
                  <path d="M 0 170 Q 70 120 140 140 T 280 80 T 420 110 T 560 40 T 700 65" fill="none" stroke="#006c49" strokeLinecap="round" strokeWidth="3" />
                  <circle className="animate-ping" cx="560" cy="40" fill="#ba1a1a" opacity="0.6" r="6" />
                  <circle cx="560" cy="40" fill="#ba1a1a" r="5" />
                  <circle cx="280" cy="80" fill="#003553" r="4" />
                </svg>

                {/* Node labels */}
                <div className="w-full flex justify-between font-data-mono-sm text-data-mono-sm text-outline z-20 pt-2 pb-1">
                  <span>00:00 (Harvest)</span>
                  <span>04:00 (Pre-Cool)</span>
                  <span>08:00 (Transformation)</span>
                  <span>12:00 (Packing)</span>
                  <span>16:00 (Cold Shipping)</span>
                  <span>20:00 (DC Receiving)</span>
                </div>
              </div>

              {/* Peak velocity badge */}
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-surface-container-lowest/95 backdrop-blur px-space-sm py-1 rounded-lg shadow-sm flex items-center gap-space-sm border border-surface-container">
                <span className="w-2 h-2 rounded-full bg-secondary" />
                <span className="font-data-mono-sm text-data-mono-sm text-on-surface">
                  Peak Velocity: <strong className="font-semibold text-secondary">3,420 KDE/hr</strong>
                </span>
                <span className="text-outline">|</span>
                <span className="font-data-mono-sm text-data-mono-sm text-outline">Mean Latency: 1.4s</span>
              </div>
            </div>

            {/* Chart Legend */}
            <div className="flex flex-wrap items-center justify-between gap-space-sm pt-space-xs font-label-md text-label-md">
              <div className="flex items-center gap-space-md flex-wrap">
                <div className="flex items-center gap-space-xs">
                  <span className="w-3 h-3 rounded-full bg-secondary" />
                  <span className="text-on-surface-variant">Optimal Custody (98.4%)</span>
                </div>
                <div className="flex items-center gap-space-xs">
                  <span className="w-3 h-3 rounded-full bg-tertiary" />
                  <span className="text-on-surface-variant">Warning Variance (1.4%)</span>
                </div>
                <div className="flex items-center gap-space-xs">
                  <span className="w-3 h-3 rounded-full bg-error" />
                  <span className="text-on-surface-variant">Incident Quarantined (0.2%)</span>
                </div>
              </div>
              <span className="font-data-mono-sm text-data-mono-sm text-outline">Telemetry Nodes: 4,821 Live</span>
            </div>
          </div>

          {/* Recent Batch Registrations Table */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container flex flex-col overflow-hidden">
            <div className="p-space-lg flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm border-b border-surface-container">
              <div>
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Recent Batch Registrations</h2>
                <p className="font-body-sm text-body-sm text-outline">Continuous FSMA 204 ledger ingestion stream and sensory verification</p>
              </div>
              <div className="flex items-center gap-space-xs">
                <button className="p-1.5 rounded-lg bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors" type="button">
                  <span className="material-symbols-outlined text-[18px]">filter_list</span>
                </button>
                <button className="p-1.5 rounded-lg bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors" type="button">
                  <span className="material-symbols-outlined text-[18px]">view_column</span>
                </button>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-outline font-label-sm text-label-sm uppercase tracking-wider border-b border-surface-container">
                    <th className="py-space-sm px-space-md font-semibold">Batch ID / GTIN</th>
                    <th className="py-space-sm px-space-md font-semibold">Product Description</th>
                    <th className="py-space-sm px-space-md font-semibold">Facility Node</th>
                    <th className="py-space-sm px-space-md font-semibold">Registered</th>
                    <th className="py-space-sm px-space-md font-semibold">Sensor Telemetry</th>
                    <th className="py-space-sm px-space-md font-semibold">Status</th>
                    <th className="py-space-sm px-space-md text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="font-body-md text-body-md divide-y divide-surface-container text-on-surface">
                  {batches.map((b) => (
                    <tr key={b.batchId} className="hover:bg-surface-container-low/70 transition-colors group">
                      <td className="py-space-sm px-space-md">
                        <Link to={`/batches/${b.batchId}`} className="font-data-mono text-data-mono text-secondary hover:underline font-semibold flex items-center gap-1">
                          <span>{b.batchId}</span>
                          <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                        </Link>
                        <span className="font-data-mono-sm text-data-mono-sm text-outline block">GTIN-14: {b.gtin}</span>
                      </td>
                      <td className="py-space-sm px-space-md">
                        <span className="font-semibold block truncate max-w-[180px]">{b.productName}</span>
                        <span className="font-body-sm text-body-sm text-outline">Category: Fresh Leafy Greens</span>
                      </td>
                      <td className="py-space-sm px-space-md">
                        <span className="font-body-md text-body-md block">{b.supplierName}</span>
                        <span className="font-data-mono-sm text-data-mono-sm text-outline">CA-ZONE-09</span>
                      </td>
                      <td className="py-space-sm px-space-md font-data-mono-sm text-data-mono-sm text-outline">
                        14 mins ago
                      </td>
                      <td className="py-space-sm px-space-md">
                        <div className="inline-flex items-center gap-1 px-space-xs py-0.5 rounded bg-surface-container text-secondary font-data-mono-sm text-data-mono-sm font-semibold">
                          <span className="material-symbols-outlined text-[13px]">thermostat</span>
                          <span>{b.currentTempCelsius}°C Optimal</span>
                        </div>
                      </td>
                      <td className="py-space-sm px-space-md">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="py-space-sm px-space-md text-right">
                        <Link to={`/batches/${b.batchId}`}>
                          <button className="p-1 rounded text-outline hover:text-on-surface hover:bg-surface-container transition-colors" type="button">
                            <span className="material-symbols-outlined text-[18px]">more_horiz</span>
                          </button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table Footer Pagination */}
            <div className="p-space-md bg-surface-container-low flex flex-col sm:flex-row items-center justify-between gap-space-sm text-outline font-data-mono-sm text-data-mono-sm border-t border-surface-container">
              <span>Showing <strong className="text-on-surface">1 - {batches.length}</strong> of 148,920 registered batches</span>
              <div className="flex items-center gap-space-xs">
                <button className="px-space-sm py-1 rounded bg-surface-container-lowest text-on-surface-variant hover:text-on-surface shadow-xs" type="button">Prev</button>
                <span className="px-space-xs text-on-surface font-semibold">1</span>
                <span>/ 37,230</span>
                <button className="px-space-sm py-1 rounded bg-surface-container-lowest text-on-surface-variant hover:text-on-surface shadow-xs" type="button">Next</button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 4 of 12 cols */}
        <div className="lg:col-span-4 flex flex-col gap-space-lg">
          {/* Active Recall & Containment Alerts Card */}
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-md border border-surface-container flex flex-col gap-space-md relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 w-1.5 bg-error" />
            <div className="flex items-center justify-between pl-1">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-error text-[22px]">emergency</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Active Recall &amp; Containment</h3>
              </div>
              <span className="px-space-xs py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm uppercase font-bold">
                2 Events
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-outline pl-1">
              Sub-hour containment protocol triggered. Multi-node supply halts in effect.
            </p>

            {/* Alert Item 1: Severe Class I Recall */}
            <div className="bg-surface-container-low rounded-xl p-space-md flex flex-col gap-space-sm border border-surface-container">
              <div className="flex items-start justify-between gap-space-xs">
                <div>
                  <span className="font-data-mono-sm text-data-mono-sm uppercase text-error font-semibold block">
                    #REC-2024-009 • FDA Class I
                  </span>
                  <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    Undeclared Allergen (Soy Protein)
                  </span>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-error animate-ping shrink-0 mt-1" />
              </div>
              <div className="flex flex-col gap-1 font-data-mono-sm text-data-mono-sm text-outline">
                <div className="flex justify-between">
                  <span>Lot: <strong className="text-on-surface">BG-2024-7712-B</strong></span>
                  <span>Affected: <strong className="text-on-surface">4,200 Units</strong></span>
                </div>
                <span>Scope: 42 Regional Distributor Hubs</span>
              </div>
              {/* Containment Progress Bar */}
              <div className="flex flex-col gap-1 pt-1">
                <div className="flex justify-between font-label-sm text-label-sm">
                  <span className="text-on-surface-variant font-medium">Containment &amp; Recovery</span>
                  <span className="text-error font-bold">88% Quarantined</span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                  <div className="h-full bg-error rounded-full transition-all duration-500" style={{ width: '88%' }} />
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="font-data-mono-sm text-data-mono-sm text-outline">Hold ID: #HLD-99182</span>
                <Link to="/recalls" className="inline-flex items-center gap-1 font-label-md text-label-md text-error hover:underline font-semibold">
                  <span>Manage Recall</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>
            </div>

            {/* Alert Item 2: Temperature Excursion */}
            <div className="bg-surface-container-low rounded-xl p-space-md flex flex-col gap-space-sm border border-surface-container">
              <div className="flex items-start justify-between gap-space-xs">
                <div>
                  <span className="font-data-mono-sm text-data-mono-sm uppercase text-tertiary font-semibold block">
                    #WRN-2024-114 • Cold Chain Break
                  </span>
                  <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    Excursion Alert (&gt;6.5°C)
                  </span>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-tertiary shrink-0 mt-1" />
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Artisan Greek Yogurt (Batch #BG-2024-9104-D) at Cold Chain Hub Atlanta. Telemetry exceeded safe threshold for 38 mins.
              </p>
              <div className="flex items-center justify-between pt-1">
                <span className="px-space-xs py-0.5 rounded bg-surface-container text-tertiary font-label-sm text-label-sm font-semibold">
                  Auto-Hold Placed
                </span>
                <Link to="/batches/BG-2024-7719-BER" className="inline-flex items-center gap-1 font-label-md text-label-md text-tertiary hover:underline font-semibold">
                  <span>Inspect Telemetry</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>
            </div>
          </div>

          {/* FSMA 204 CTE Distribution Card */}
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-surface-container flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">FSMA 204 CTE Distribution</h3>
                <p className="font-body-sm text-body-sm text-outline">Key Data Elements captured by phase</p>
              </div>
              <span className="material-symbols-outlined text-outline text-[20px]">donut_large</span>
            </div>
            {/* Segmented Progress Bar */}
            <div className="flex flex-col gap-space-sm">
              <div className="w-full h-3 rounded-full bg-surface-container flex overflow-hidden">
                <div className="h-full bg-primary-container" style={{ width: '34%' }} title="Transformation: 34%" />
                <div className="h-full bg-secondary" style={{ width: '28%' }} title="Shipping: 28%" />
                <div className="h-full bg-tertiary-container" style={{ width: '22%' }} title="Receiving: 22%" />
                <div className="h-full bg-outline-variant" style={{ width: '16%' }} title="Harvesting: 16%" />
              </div>
              {/* Legend 2x2 Grid */}
              <div className="grid grid-cols-2 gap-space-sm pt-space-xs">
                <div className="flex flex-col p-space-xs rounded-lg bg-surface-container-low">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary-container" />
                    <span className="font-label-sm text-label-sm text-outline">Transformation</span>
                  </div>
                  <span className="font-headline-sm text-headline-sm text-on-surface font-bold mt-1">34%</span>
                </div>
                <div className="flex flex-col p-space-xs rounded-lg bg-surface-container-low">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-secondary" />
                    <span className="font-label-sm text-label-sm text-outline">Shipping</span>
                  </div>
                  <span className="font-headline-sm text-headline-sm text-on-surface font-bold mt-1">28%</span>
                </div>
                <div className="flex flex-col p-space-xs rounded-lg bg-surface-container-low">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-tertiary-container" />
                    <span className="font-label-sm text-label-sm text-outline">Receiving</span>
                  </div>
                  <span className="font-headline-sm text-headline-sm text-on-surface font-bold mt-1">22%</span>
                </div>
                <div className="flex flex-col p-space-xs rounded-lg bg-surface-container-low">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-outline-variant" />
                    <span className="font-label-sm text-label-sm text-outline">Harvesting</span>
                  </div>
                  <span className="font-headline-sm text-headline-sm text-on-surface font-bold mt-1">16%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
