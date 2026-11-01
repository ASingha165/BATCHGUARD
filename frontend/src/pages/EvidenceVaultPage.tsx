import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { EvidenceDocument } from '../types';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/Toast';

export const EvidenceVaultPage: React.FC = () => {
  const { addToast } = useToast();
  const [docs, setDocs] = useState<EvidenceDocument[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadType, setUploadType] = useState<'COA' | 'LAB_TEST' | 'BILL_OF_LADING' | 'DISPOSAL_ORDER'>('LAB_TEST');
  const [uploadBatchId, setUploadBatchId] = useState('BG-2024-8891-ORG');

  useEffect(() => {
    async function loadEvidence() {
      const data = await apiService.getEvidenceDocuments();
      setDocs(data);
    }
    loadEvidence();
  }, []);

  const handleSimulateUpload = (e: React.FormEvent) => {
    e.preventDefault();
    const newDoc: EvidenceDocument = {
      evidenceId: `EVD-${Math.floor(10000 + Math.random() * 90000)}-A`,
      batchId: uploadBatchId,
      documentType: uploadType,
      fileName: uploadFileName || `Assay_Verification_${uploadBatchId}.pdf`,
      s3Key: `batches/${uploadBatchId}/${uploadFileName || 'Assay.pdf'}`,
      fileSizeBytes: Math.floor(150000 + Math.random() * 200000),
      mimeType: 'application/pdf',
      uploadedBy: 'elena.vance@apexnutrition.internal',
      createdAt: new Date().toISOString(),
    };

    setDocs((prev) => [newDoc, ...prev]);
    setIsUploadModalOpen(false);
    setUploadFileName('');
    addToast({
      type: 'success',
      title: 'Evidence Upload Completed',
      description: `Document securely vaulted to S3 (AES-256 encrypted) with SHA-256 checksum seal.`,
    });
  };

  const filteredDocs = selectedCategory === 'ALL'
    ? docs
    : docs.filter((d) => d.documentType === selectedCategory);

  return (
    <div className="w-full px-space-md sm:px-space-lg py-space-lg flex flex-col gap-space-lg">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">Evidence Vault (Amazon S3)</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Tamper-proof compliance repository for lab assays, certificates of analysis, and bills of lading.
          </p>
        </div>
        <Button variant="primary" icon="upload_file" onClick={() => setIsUploadModalOpen(true)}>
          Upload Certificate (Pre-signed S3)
        </Button>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {['ALL', 'LAB_TEST', 'COA', 'BILL_OF_LADING', 'DISPOSAL_ORDER'].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg font-label-md text-label-md font-medium transition-colors ${
              selectedCategory === cat
                ? 'bg-primary-container text-on-primary font-semibold shadow-xs'
                : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container border border-surface-container'
            }`}
            type="button"
          >
            {cat.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Evidence Table */}
      <div className="bg-surface-container-lowest rounded-xl border border-surface-container shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low font-label-sm text-label-sm text-outline uppercase tracking-wider border-b border-surface-container">
              <tr>
                <th className="py-3 px-4 font-semibold">Document Title &amp; Checksum</th>
                <th className="py-3 px-4 font-semibold">Type</th>
                <th className="py-3 px-4 font-semibold">Associated Batch</th>
                <th className="py-3 px-4 font-semibold">File Size</th>
                <th className="py-3 px-4 font-semibold">Vaulted By</th>
                <th className="py-3 px-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container font-body-sm text-body-sm">
              {filteredDocs.map((doc) => (
                <tr key={doc.evidenceId} className="hover:bg-surface-container-low/60 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-error text-[20px]">picture_as_pdf</span>
                      <div className="flex flex-col">
                        <span className="font-semibold text-on-surface">{doc.fileName}</span>
                        <span className="font-data-mono-sm text-[11px] text-outline truncate max-w-xs">{doc.s3Key}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-label-sm text-label-sm font-semibold uppercase">
                      {doc.documentType.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-data-mono text-data-mono font-bold text-primary">{doc.batchId}</td>
                  <td className="py-3 px-4 font-data-mono-sm text-data-mono-sm text-outline">
                    {(doc.fileSizeBytes / 1024).toFixed(1)} KB
                  </td>
                  <td className="py-3 px-4 text-outline font-body-sm text-body-sm">{doc.uploadedBy}</td>
                  <td className="py-3 px-4 text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon="download"
                      onClick={() => addToast({ type: 'info', title: 'Pre-signed Download Active', description: `S3 GET URL generated for ${doc.fileName} (15m expiry).` })}
                    >
                      Download
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* S3 Pre-signed Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-2xl border border-surface-container overflow-hidden p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-surface-container pb-2">
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Upload to S3 Evidence Vault</h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-outline hover:text-on-surface" type="button">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSimulateUpload} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1">Target Food Batch</label>
                <select
                  value={uploadBatchId}
                  onChange={(e) => setUploadBatchId(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-surface-container font-mono text-sm outline-none focus:border-primary"
                >
                  <option value="BG-2024-8891-ORG">BG-2024-8891-ORG (Spinach 16oz)</option>
                  <option value="BG-2024-9022-ROM">BG-2024-9022-ROM (Romaine Hearts)</option>
                  <option value="BG-2024-7719-BER">BG-2024-7719-BER (Strawberries 1lb)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1">Document Classification</label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value as any)}
                  className="w-full h-9 px-3 rounded-lg border border-surface-container text-sm outline-none focus:border-primary"
                >
                  <option value="LAB_TEST">Microbiological Lab Assay Report</option>
                  <option value="COA">Certificate of Analysis (COA)</option>
                  <option value="BILL_OF_LADING">Electronic Bill of Lading (eBOL)</option>
                  <option value="DISPOSAL_ORDER">Witnessed Bio-Destruction Manifest</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1">File Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BioCert_Salmonella_Lot_8891A.pdf"
                  value={uploadFileName}
                  onChange={(e) => setUploadFileName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-surface-container text-sm outline-none focus:border-primary"
                />
              </div>

              {/* Drag and drop simulation area */}
              <div className="border-2 border-dashed border-surface-container rounded-lg p-4 text-center flex flex-col items-center gap-1 bg-surface-container-low/50">
                <span className="material-symbols-outlined text-[28px] text-outline">cloud_upload</span>
                <span className="text-xs font-semibold text-on-surface">Drag and drop PDF report or click to browse</span>
                <span className="text-[10px] text-outline">Max size: 50MB · Encrypted with SSE-S3</span>
              </div>

              <div className="mt-2 pt-2 border-t border-surface-container flex items-center justify-end gap-2">
                <Button variant="ghost" onClick={() => setIsUploadModalOpen(false)} type="button">
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  Generate Pre-signed URL &amp; Vault
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
