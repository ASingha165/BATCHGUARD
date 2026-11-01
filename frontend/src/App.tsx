import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PageShell } from './components/layout/PageShell';
import { OverviewPage } from './pages/OverviewPage';
import { BatchRegistryPage } from './pages/BatchRegistryPage';
import { BatchDetailsPage } from './pages/BatchDetailsPage';
import { SupplyChainPage } from './pages/SupplyChainPage';
import { RecallOpsPage } from './pages/RecallOpsPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { EvidenceVaultPage } from './pages/EvidenceVaultPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route
          path="/dashboard"
          element={
            <PageShell currentSection="Operations Overview">
              <OverviewPage />
            </PageShell>
          }
        />

        <Route
          path="/batches"
          element={
            <PageShell currentSection="Batch Registry">
              <BatchRegistryPage />
            </PageShell>
          }
        />

        <Route
          path="/batches/:batchId"
          element={
            <PageShell currentSection="Batch Profile & Traceability">
              <BatchDetailsPage />
            </PageShell>
          }
        />

        <Route
          path="/supply-chain"
          element={
            <PageShell currentSection="Supply Chain Mesh">
              <SupplyChainPage />
            </PageShell>
          }
        />

        <Route
          path="/recalls"
          element={
            <PageShell currentSection="Recall Operations Command">
              <RecallOpsPage />
            </PageShell>
          }
        />

        <Route
          path="/suppliers"
          element={
            <PageShell currentSection="Supplier Management">
              <SuppliersPage />
            </PageShell>
          }
        />

        <Route
          path="/evidence"
          element={
            <PageShell currentSection="Evidence Vault">
              <EvidenceVaultPage />
            </PageShell>
          }
        />

        <Route
          path="/audit-logs"
          element={
            <PageShell currentSection="Audit Logs">
              <AuditLogsPage />
            </PageShell>
          }
        />

        <Route
          path="/settings"
          element={
            <PageShell currentSection="Settings">
              <SettingsPage />
            </PageShell>
          }
        />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;

