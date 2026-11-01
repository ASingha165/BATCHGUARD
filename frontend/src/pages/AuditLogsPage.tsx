import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { AuditEvent } from '../types';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditEvent[]>([]);

  useEffect(() => {
    async function loadLogs() {
      const data = await apiService.getAuditLogs();
      setLogs(data);
    }
    loadLogs();
  }, []);

  return (
    <div className="w-full px-space-lg py-space-lg flex flex-col gap-space-lg">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">Immutable Audit Trail</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Cryptographically sealed event ledger capturing all critical changes, quarantine orders, and recall dispatches.
        </p>
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-surface-container shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface-container-low font-label-sm text-label-sm text-outline uppercase tracking-wider border-b border-surface-container">
            <tr>
              <th className="py-3 px-4">Timestamp (UTC)</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Target Entity</th>
              <th className="py-3 px-4">Authorized User / Process</th>
              <th className="py-3 px-4">Payload Metadata</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container font-body-sm text-body-sm font-data-mono">
            {logs.map((log) => (
              <tr key={log.eventId} className="hover:bg-surface-container-low/60 transition-colors">
                <td className="py-3 px-4 text-outline">{log.timestamp}</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded bg-error-container text-on-error-container font-label-sm text-label-sm uppercase font-bold">
                    {log.action}
                  </span>
                </td>
                <td className="py-3 px-4 font-semibold text-on-surface">{log.entityId}</td>
                <td className="py-3 px-4 text-outline font-sans">{log.userEmail}</td>
                <td className="py-3 px-4 text-outline text-xs truncate max-w-xs font-sans">
                  {JSON.stringify(log.details)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

