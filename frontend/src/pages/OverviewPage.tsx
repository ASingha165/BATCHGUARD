import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { Batch, OverviewSummary } from '../types';
import { MetricCard } from '../components/common/MetricCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { Button } from '../components/common/Button';

export const OverviewPage: React.FC = () => {
  const [summary, setSummary] = useState<OverviewSummary | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [sumRes, batchRes] = await Promise.all([
          apiService.getOverviewSummary(),
          apiService.getBatches(),
        ]);
        setSummary(sumRes);
        setBatches(batchRes);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="w-full px-space-lg py-space-lg flex flex-col gap-space-lg">
      {/* Page Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center gap-space-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse" />
            <span className="font-data-mono-sm text-data-mono-sm uppercase text-secondary font-semibold tracking-wider">
              GS1 &amp; Traceability Continuous Sentinel
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">
            Operational Overview
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
            Real-time enterprise food traceability, multi-node custody tracking, and active incident containment posture.
          </p>
        </div>

        <div className="flex items-center gap-space-sm flex-wrap">
          <Button variant="secondary" icon="file_download">
            Export Safety Audit
          </Button>
          <Button variant="primary" icon="add">
            Register New Batch
          </Button>
        </div>
      </div>

      {/* Regulatory Framework Sentinel Banner */}
      <div className="w-full bg-surface-container-low rounded-xl px-space-md py-space-sm flex items-center justify-between gap-space-md shadow-sm border border-surface-container">
        <div className="flex items-center gap-space-sm min-w-0">
          <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center shrink-0 text-secondary">
            <span className="material-symbols-outlined text-[20px]">verified_user</span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface truncate">
            <span className="font-semibold text-secondary">Automated KDE &amp; Critical Tracking Events active</span> across 14 manufacturing nodes. All manifests synced.
          </p>
        </div>
        <div className="flex items-center gap-space-md shrink-0">
          <span className="font-data-mono-sm text-data-mono-sm text-outline hidden sm:inline">Last verified 4 mins ago</span>
          <Link to="/audit-logs" className="text-secondary hover:underline font-label-sm text-label-sm font-semibold flex items-center gap-0.5">
            <span>Telemetry Ledger</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </Link>
        </div>
      </div>

      {/* 4 Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
        <MetricCard
          title="Total Registered Batches"
          value={summary?.totalBatches || 148920}
          subtitle="Active lifecycle: 42,180 • 99.8% on-spec"
          badge={{ text: '+12.4%', type: 'positive' }}
          sparkline
        />
        <MetricCard
          title="Active Verified Suppliers"
          value={summary?.activeSuppliers || 1248}
          subtitle="14 undergoing audit • Global Tier 1"
          icon="verified"
        />
        <MetricCard
          title="Monitored Distribution Nodes"
          value={summary?.monitoredDistributionNodes || 4821}
          subtitle="18 Countries • Real-time GPS"
          icon="hub"
        />
        <MetricCard
          title="Active Safety Recalls"
          value={summary?.activeRecallsCount || 2}
          subtitle="1 Class I Critical • 1 Class II"
          badge={{ text: 'ATTENTION', type: 'negative' }}
          icon="warning"
        />
      </div>

      {/* Batches Data Table */}
      <div className="bg-surface-container-lowest rounded-xl border border-surface-container shadow-sm overflow-hidden flex flex-col">
        <div className="p-space-md border-b border-surface-container flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-primary text-[22px]">inventory_2</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Active Production Lots</h2>
          </div>
          <Link to="/batches" className="text-secondary hover:underline font-label-sm text-label-sm font-semibold flex items-center gap-1">
            <span>View All Batches</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low font-label-sm text-label-sm text-outline uppercase tracking-wider border-b border-surface-container">
              <tr>
                <th className="py-3 px-4">Batch ID / Lot</th>
                <th className="py-3 px-4">Product Name &amp; SKU</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Cold-Chain Temp</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container font-body-sm text-body-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-outline">
                    Loading batch telemetry...
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-outline">
                    No active batches registered.
                  </td>
                </tr>
              ) : (
                batches.map((batch) => (
                  <tr key={batch.batchId} className="hover:bg-surface-container-low/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <Link to={`/batches/${batch.batchId}`} className="font-data-mono text-data-mono font-semibold text-primary hover:underline">
                          {batch.batchId}
                        </Link>
                        <span className="font-data-mono-sm text-data-mono-sm text-outline">Lot: {batch.lotNumber}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-on-surface">{batch.productName}</span>
                        <span className="font-data-mono-sm text-data-mono-sm text-outline">{batch.sku}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-on-surface-variant font-medium">
                      {batch.supplierName}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-data-mono text-data-mono font-medium ${batch.coldChainOptimal ? 'text-secondary' : 'text-error font-bold'}`}>
                        {batch.currentTempCelsius}°C
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={batch.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link to={`/batches/${batch.batchId}`}>
                        <Button variant="secondary" size="sm" icon="troubleshoot">
                          Trace
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

