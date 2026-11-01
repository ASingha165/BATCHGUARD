import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { Supplier } from '../types';
import { Button } from '../components/common/Button';

export const SuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    async function loadSuppliers() {
      const data = await apiService.getSuppliers();
      setSuppliers(data);
    }
    loadSuppliers();
  }, []);

  return (
    <div className="w-full px-space-lg py-space-lg flex flex-col gap-space-lg">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">Verified Supplier Directory</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Grower profiles, harvest certifications, farm GLNs, and food safety audit scores.
          </p>
        </div>
        <Button variant="primary" icon="add">
          Add Supplier Partner
        </Button>
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-surface-container shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface-container-low font-label-sm text-label-sm text-outline uppercase tracking-wider border-b border-surface-container">
            <tr>
              <th className="py-3 px-4">Supplier / Farm</th>
              <th className="py-3 px-4">Facility GLN</th>
              <th className="py-3 px-4">Tier Status</th>
              <th className="py-3 px-4">Certifications</th>
              <th className="py-3 px-4">Audit Score</th>
              <th className="py-3 px-4">Status</th>
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
                <td className="py-3 px-4 font-data-mono text-data-mono font-bold text-secondary">
                  {sup.auditScore}%
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-label-sm text-label-sm uppercase font-semibold">
                    {sup.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

