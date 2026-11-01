import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { EvidenceDocument } from '../types';
import { Button } from '../components/common/Button';

export const EvidenceVaultPage: React.FC = () => {
  const [docs, setDocs] = useState<EvidenceDocument[]>([]);

  useEffect(() => {
    async function loadEvidence() {
      const data = await apiService.getEvidenceDocuments();
      setDocs(data);
    }
    loadEvidence();
  }, []);

  return (
    <div className="w-full px-space-lg py-space-lg flex flex-col gap-space-lg">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">Evidence Vault (Amazon S3)</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Tamper-proof compliance repository for lab assays, certificates of analysis, and bills of lading.
          </p>
        </div>
        <Button variant="primary" icon="upload_file">
          Upload Certificate (Pre-signed S3)
        </Button>
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-surface-container shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface-container-low font-label-sm text-label-sm text-outline uppercase tracking-wider border-b border-surface-container">
            <tr>
              <th className="py-3 px-4">Document Title</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Associated Batch</th>
              <th className="py-3 px-4">File Size</th>
              <th className="py-3 px-4">Uploaded By</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container font-body-sm text-body-sm">
            {docs.map((doc) => (
              <tr key={doc.evidenceId} className="hover:bg-surface-container-low/60 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-error text-[20px]">picture_as_pdf</span>
                    <span className="font-semibold text-on-surface">{doc.fileName}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-label-sm text-label-sm font-semibold">
                    {doc.documentType}
                  </span>
                </td>
                <td className="py-3 px-4 font-data-mono text-data-mono font-semibold text-primary">{doc.batchId}</td>
                <td className="py-3 px-4 font-data-mono-sm text-data-mono-sm text-outline">
                  {(doc.fileSizeBytes / 1024).toFixed(1)} KB
                </td>
                <td className="py-3 px-4 text-outline font-body-sm text-body-sm">{doc.uploadedBy}</td>
                <td className="py-3 px-4 text-right">
                  <Button variant="secondary" size="sm" icon="download">
                    Download
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

