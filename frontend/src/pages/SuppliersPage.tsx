import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { Supplier } from '../types';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/Toast';

export const SuppliersPage: React.FC = () => {
  const { addToast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newFacilityGln, setNewFacilityGln] = useState('');

  useEffect(() => {
    async function loadSuppliers() {
      const data = await apiService.getSuppliers();
      setSuppliers(data);
    }
    loadSuppliers();
  }, []);

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    const newSup: Supplier = {
      supplierId: `SUP-${Math.floor(100 + Math.random() * 900)}`,
      name: newSupplierName || 'New Agricultural Producer',
      tier: 'TIER_1',
      facilityCode: newFacilityGln || '0850012999011',
      certifications: ['USDA Organic', 'GLOBALG.A.P.'],
      auditScore: 98.0,
      status: 'VERIFIED',
      contactEmail: 'qa@partner-grower.internal',
      updatedAt: new Date().toISOString(),
    };

    setSuppliers((prev) => [newSup, ...prev]);
    setIsAddModalOpen(false);
    setNewSupplierName('');
    setNewFacilityGln('');
    addToast({
      type: 'success',
      title: 'Supplier Enrolled',
      description: `Partner ${newSup.name} onboarded into verified Tier 1 network.`,
    });
  };

  return (
    <div className="w-full px-space-md sm:px-space-lg py-space-lg flex flex-col gap-space-lg">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">Verified Supplier Directory</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Grower profiles, harvest certifications, farm GLNs, and food safety audit scores.
          </p>
        </div>
        <Button variant="primary" icon="add" onClick={() => setIsAddModalOpen(true)}>
          Add Supplier Partner
        </Button>
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-surface-container shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low font-label-sm text-label-sm text-outline uppercase tracking-wider border-b border-surface-container">
              <tr>
                <th className="py-3 px-4 font-semibold">Supplier / Farm</th>
                <th className="py-3 px-4 font-semibold">Facility GLN</th>
                <th className="py-3 px-4 font-semibold">Tier Status</th>
                <th className="py-3 px-4 font-semibold">Certifications</th>
                <th className="py-3 px-4 font-semibold">Audit Score</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container font-body-sm text-body-sm">
              {suppliers.map((sup) => (
                <tr key={sup.supplierId} className="hover:bg-surface-container-low/60 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-on-surface">{sup.name}</span>
                      <span className="font-data-mono-sm text-data-mono-sm text-outline">{sup.supplierId}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-data-mono text-data-mono">{sup.facilityCode}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-primary-fixed text-primary font-label-sm text-label-sm font-semibold">
                      {sup.tier}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {sup.certifications.map((c) => (
                        <span key={c} className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-label-sm text-label-sm">
                          {c}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-data-mono text-data-mono font-bold text-secondary">{sup.auditScore}%</span>
                      <div className="w-16 h-1.5 rounded-full bg-surface-container overflow-hidden">
                        <div className="h-full bg-secondary rounded-full" style={{ width: `${sup.auditScore}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-label-sm text-label-sm uppercase font-semibold">
                      {sup.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button variant="secondary" size="sm" onClick={() => setSelectedSupplier(sup)}>
                      Profile
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Supplier Profile Drawer */}
      {selectedSupplier && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-surface-container-lowest rounded-xl shadow-2xl border border-surface-container overflow-hidden p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-surface-container pb-3">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">{selectedSupplier.name}</h3>
                <span className="font-data-mono-sm text-xs text-primary">{selectedSupplier.supplierId}</span>
              </div>
              <button onClick={() => setSelectedSupplier(null)} className="text-outline hover:text-on-surface" type="button">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between py-1.5 border-b border-surface-container/50">
                <span className="text-outline">GS1 Facility GLN:</span>
                <span className="font-data-mono font-medium">{selectedSupplier.facilityCode}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-surface-container/50">
                <span className="text-outline">Quality Compliance Desk:</span>
                <span className="font-mono text-xs">{selectedSupplier.contactEmail}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-surface-container/50">
                <span className="text-outline">Last Sensory Audit:</span>
                <span className="font-bold text-secondary">{selectedSupplier.auditScore}% (Zero Critical Non-Conformities)</span>
              </div>
              <div className="py-2">
                <span className="text-outline text-xs block mb-1">Active Third-Party Food Safety Certifications:</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedSupplier.certifications.map((c) => (
                    <span key={c} className="px-2.5 py-1 rounded-md bg-surface-container text-on-surface text-xs font-semibold">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <Button variant="primary" onClick={() => setSelectedSupplier(null)}>
              Close Supplier Profile
            </Button>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-2xl border border-surface-container overflow-hidden p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-surface-container pb-2">
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Enroll Supplier Facility</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-outline hover:text-on-surface" type="button">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAddSupplier} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1">Supplier Entity Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Salinas Valley Organics"
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-surface-container text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1">GS1 Global Location Number (GLN)</label>
                <input
                  type="text"
                  required
                  placeholder="0850012000015"
                  value={newFacilityGln}
                  onChange={(e) => setNewFacilityGln(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-surface-container font-mono text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="mt-2 pt-2 border-t border-surface-container flex items-center justify-end gap-2">
                <Button variant="ghost" onClick={() => setIsAddModalOpen(false)} type="button">
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  Verify &amp; Enroll
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
