import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { Batch } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/Toast';

export const BatchRegistryPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  // New batch registration state
  const [newProductName, setNewProductName] = useState('Organic Baby Spinach 16oz');
  const [newLotNumber, setNewLotNumber] = useState('L-904-C');
  const [newGtin, setNewGtin] = useState('00850012345678');
  const [newQuantity, setNewQuantity] = useState('12000');
  const [newSupplier, setNewSupplier] = useState('Salinas Valley Organics');

  useEffect(() => {
    async function loadBatches() {
      const data = await apiService.getBatches(selectedFilter);
      setBatches(data);
    }
    loadBatches();
  }, [selectedFilter]);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await apiService.createBatch({
        lotNumber: newLotNumber,
        gtin: newGtin,
        productName: newProductName,
        initialQuantity: parseInt(newQuantity) || 10000,
        unitOfMeasure: 'CASES',
        supplierId: 'SUP-882',
        facilityGln: '0850012340019',
        harvestDate: new Date().toISOString().split('T')[0],
        productionDate: new Date().toISOString().split('T')[0],
        expirationDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      });

      setBatches((prev) => [created, ...prev]);
      setIsRegisterModalOpen(false);
      addToast({
        type: 'success',
        title: 'Batch Successfully Registered',
        description: `New lot ${created.batchId} added to traceability ledger.`,
      });
    } catch {
      addToast({
        type: 'error',
        title: 'Registration Error',
        description: 'Failed to record batch lot.',
      });
    }
  };

  const filtered = batches.filter(
    (b) =>
      b.batchId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.lotNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.gtin.includes(searchQuery)
  );

  return (
    <div className="w-full px-space-md sm:px-space-lg py-space-lg flex flex-col gap-space-lg">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">Food Batch Registry</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Master repository of finished production lots, harvest metadata, and GS1 GTIN manifests.
          </p>
        </div>
        <Button variant="primary" icon="add" onClick={() => setIsRegisterModalOpen(true)}>
          Register New Batch
        </Button>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-space-sm bg-surface-container-lowest p-space-sm rounded-xl border border-surface-container shadow-sm">
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'RELEASED', 'IN_TRANSIT', 'HOLD', 'RECALLED'].map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedFilter(tab)}
              className={`px-3 py-1.5 rounded-lg font-label-md text-label-md font-medium transition-colors ${
                selectedFilter === tab
                  ? 'bg-primary-container text-on-primary font-semibold shadow-xs'
                  : 'text-on-surface-variant hover:bg-surface-container'
              }`}
              type="button"
            >
              {tab.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-80">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-surface-container bg-surface-container-low focus-within:border-primary">
            <span className="material-symbols-outlined text-[18px] text-outline">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search lot code, GTIN, SKU..."
              className="w-full bg-transparent text-on-surface font-body-sm text-body-sm outline-none placeholder:text-outline"
            />
          </div>
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-surface-container-lowest rounded-xl border border-surface-container shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low font-label-sm text-label-sm text-outline uppercase tracking-wider border-b border-surface-container">
              <tr>
                <th className="py-3 px-4 font-semibold">Batch ID / Lot</th>
                <th className="py-3 px-4 font-semibold">Product Description</th>
                <th className="py-3 px-4 font-semibold">GTIN / SKU</th>
                <th className="py-3 px-4 font-semibold">Lot Quantity</th>
                <th className="py-3 px-4 font-semibold">Cold Chain</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container font-body-sm text-body-sm">
              {filtered.map((batch) => (
                <tr key={batch.batchId} className="hover:bg-surface-container-low/60 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <Link to={`/batches/${batch.batchId}`} className="font-data-mono text-data-mono font-bold text-primary hover:underline">
                        {batch.batchId}
                      </Link>
                      <span className="font-data-mono-sm text-data-mono-sm text-outline">Lot: #{batch.lotNumber}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-on-surface">{batch.productName}</span>
                      <span className="font-body-sm text-body-sm text-outline">{batch.supplierName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-data-mono-sm text-data-mono-sm text-outline">
                    <div>GTIN: {batch.gtin}</div>
                    <div>SKU: {batch.sku}</div>
                  </td>
                  <td className="py-3 px-4 font-data-mono text-data-mono font-medium">
                    {batch.currentQuantity.toLocaleString()} {batch.unitOfMeasure}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`font-data-mono text-data-mono font-medium ${batch.coldChainOptimal ? 'text-secondary font-bold' : 'text-error font-bold'}`}>
                      {batch.currentTempCelsius}°C
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={batch.status} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="secondary" size="sm" icon="troubleshoot" onClick={() => navigate(`/batches/${batch.batchId}`)}>
                        Lineage
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Batch Modal Drawer */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-surface-container-lowest rounded-xl shadow-2xl border border-surface-container overflow-hidden flex flex-col">
            <div className="p-4 bg-surface-container-low border-b border-surface-container flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">add_box</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Register Production Batch</h3>
              </div>
              <button onClick={() => setIsRegisterModalOpen(false)} className="text-outline hover:text-on-surface" type="button">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="p-4 flex flex-col gap-3">
              <div>
                <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1">Product Title</label>
                <input
                  type="text"
                  required
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-surface-container bg-surface-container-lowest text-on-surface text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1">Lot Number</label>
                  <input
                    type="text"
                    required
                    value={newLotNumber}
                    onChange={(e) => setNewLotNumber(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-surface-container bg-surface-container-lowest font-data-mono text-on-surface text-sm outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1">GS1 GTIN-14</label>
                  <input
                    type="text"
                    required
                    value={newGtin}
                    onChange={(e) => setNewGtin(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-surface-container bg-surface-container-lowest font-data-mono text-on-surface text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1">Quantity (Cases)</label>
                  <input
                    type="number"
                    required
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-surface-container bg-surface-container-lowest text-on-surface text-sm outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1">Source Supplier</label>
                  <input
                    type="text"
                    required
                    value={newSupplier}
                    onChange={(e) => setNewSupplier(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-surface-container bg-surface-container-lowest text-on-surface text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-surface-container flex items-center justify-end gap-2">
                <Button variant="ghost" onClick={() => setIsRegisterModalOpen(false)} type="button">
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  Commit Lot to Ledger
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
