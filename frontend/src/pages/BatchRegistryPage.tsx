import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { Batch } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Button } from '../components/common/Button';

export const BatchRegistryPage: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadBatches() {
      const data = await apiService.getBatches(selectedFilter);
      setBatches(data);
    }
    loadBatches();
  }, [selectedFilter]);

  const filtered = batches.filter((b) =>
    b.batchId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.lotNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full px-space-lg py-space-lg flex flex-col gap-space-lg">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">Food Batch Registry</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Master repository of finished production lots, harvest metadata, and GS1 GTIN manifests.
          </p>
        </div>
        <Button variant="primary" icon="add">
          Register New Batch
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-space-sm bg-surface-container-lowest p-space-sm rounded-xl border border-surface-container">
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'RELEASED', 'IN_TRANSIT', 'HOLD', 'RECALLED'].map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedFilter(tab)}
              className={`px-3 py-1.5 rounded-lg font-label-md text-label-md font-medium transition-colors ${
                selectedFilter === tab
                  ? 'bg-primary-container text-on-primary'
                  : 'text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              {tab.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search lot code, GTIN..."
            className="w-full h-9 px-3 rounded-lg border border-surface-container bg-surface-container-low text-on-surface font-body-sm text-body-sm outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-surface-container-lowest rounded-xl border border-surface-container shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface-container-low font-label-sm text-label-sm text-outline uppercase tracking-wider border-b border-surface-container">
            <tr>
              <th className="py-3 px-4">Batch ID</th>
              <th className="py-3 px-4">Product Details</th>
              <th className="py-3 px-4">Lot &amp; GTIN</th>
              <th className="py-3 px-4">Quantity</th>
              <th className="py-3 px-4">Cold Chain</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container font-body-sm text-body-sm">
            {filtered.map((batch) => (
              <tr key={batch.batchId} className="hover:bg-surface-container-low/60 transition-colors">
                <td className="py-3 px-4 font-data-mono text-data-mono font-semibold text-primary">
                  <Link to={`/batches/${batch.batchId}`} className="hover:underline">
                    {batch.batchId}
                  </Link>
                </td>
                <td className="py-3 px-4">
                  <div className="flex flex-col">
                    <span className="font-semibold text-on-surface">{batch.productName}</span>
                    <span className="font-body-sm text-body-sm text-outline">{batch.supplierName}</span>
                  </div>
                </td>
                <td className="py-3 px-4 font-data-mono-sm text-data-mono-sm text-outline">
                  <div>Lot: {batch.lotNumber}</div>
                  <div>GTIN: {batch.gtin}</div>
                </td>
                <td className="py-3 px-4 font-data-mono text-data-mono">
                  {batch.currentQuantity.toLocaleString()} {batch.unitOfMeasure}
                </td>
                <td className="py-3 px-4">
                  <span className={`font-data-mono text-data-mono font-medium ${batch.coldChainOptimal ? 'text-secondary' : 'text-error'}`}>
                    {batch.currentTempCelsius}°C
                  </span>
                </td>
                <td className="py-3 px-4">
                  <StatusBadge status={batch.status} />
                </td>
                <td className="py-3 px-4 text-right">
                  <Link to={`/batches/${batch.batchId}`}>
                    <Button variant="secondary" size="sm" icon="troubleshoot">
                      Lineage
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

