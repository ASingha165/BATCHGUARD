import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { AuditEvent } from '../types';
import { Button } from '../components/common/Button';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [searchActor, setSearchActor] = useState('');

  useEffect(() => {
    async function loadLogs() {
      const data = await apiService.getAuditLogs();
      setLogs(data);
    }
    loadLogs();
  }, []);

  const filteredLogs = logs.filter(
    (l) =>
      l.userEmail.toLowerCase().includes(searchActor.toLowerCase()) ||
      l.action.toLowerCase().includes(searchActor.toLowerCase()) ||
      l.entityId.toLowerCase().includes(searchActor.toLowerCase())
  );

  return (
    <div className="w-full px-space-md sm:px-space-lg py-space-lg flex flex-col gap-space-lg">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">Immutable Audit Trail</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Cryptographically sealed event ledger capturing all critical changes, quarantine orders, and recall dispatches.
          </p>
        </div>
        <div className="w-full sm:w-72">
          <input
            type="text"
            value={searchActor}
            onChange={(e) => setSearchActor(e.target.value)}
            placeholder="Search action, actor, or entity..."
            className="w-full h-9 px-3 rounded-lg border border-surface-container bg-surface-container-lowest text-on-surface text-sm outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-surface-container shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low font-label-sm text-label-sm text-outline uppercase tracking-wider border-b border-surface-container">
              <tr>
                <th className="py-3 px-4 font-semibold">Timestamp (UTC)</th>
                <th className="py-3 px-4 font-semibold">Action / Event Type</th>
                <th className="py-3 px-4 font-semibold">Target Entity</th>
                <th className="py-3 px-4 font-semibold">Authorized Actor</th>
                <th className="py-3 px-4 font-semibold">Payload Manifest</th>
                <th className="py-3 px-4 text-right font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container font-body-sm text-body-sm">
              {filteredLogs.map((log) => (
                <tr key={log.eventId} className="hover:bg-surface-container-low/60 transition-colors">
                  <td className="py-3 px-4 font-mono text-xs text-outline">{log.timestamp}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-error-container text-on-error-container font-label-sm text-label-sm uppercase font-bold tracking-wider">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-data-mono text-data-mono font-bold text-primary">{log.entityId}</td>
                  <td className="py-3 px-4 text-on-surface font-medium">{log.userEmail}</td>
                  <td className="py-3 px-4 text-outline font-mono text-xs truncate max-w-xs">
                    {JSON.stringify(log.details)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button variant="secondary" size="sm" onClick={() => setSelectedEvent(log)}>
                      Inspect
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Payload JSON Inspector Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-surface-container-lowest rounded-xl shadow-2xl border border-surface-container overflow-hidden p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-surface-container pb-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">history_edu</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Audit Event Ledger Entry</h3>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="text-outline hover:text-on-surface" type="button">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-surface-container/50">
                <span className="text-outline font-sans">Event ID:</span>
                <span>{selectedEvent.eventId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-surface-container/50">
                <span className="text-outline font-sans">Action:</span>
                <span className="font-bold text-error">{selectedEvent.action}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-surface-container/50">
                <span className="text-outline font-sans">Timestamp:</span>
                <span>{selectedEvent.timestamp}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-surface-container/50">
                <span className="text-outline font-sans">Authorized By:</span>
                <span>{selectedEvent.userEmail} ({selectedEvent.userId})</span>
              </div>
              <div className="flex flex-col gap-1 pt-1">
                <span className="text-outline font-sans">Cryptographic Payload Seal:</span>
                <pre className="p-3 bg-slate-900 text-emerald-400 rounded-lg overflow-x-auto text-[11px] leading-relaxed">
                  {JSON.stringify(selectedEvent.details, null, 2)}
                </pre>
              </div>
            </div>

            <Button variant="primary" onClick={() => setSelectedEvent(null)}>
              Close Inspector
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
