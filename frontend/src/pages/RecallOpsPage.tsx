import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { RecallIncident, RecallAcknowledgement, BlastRadiusAssessment } from '../types';
import { Button } from '../components/common/Button';

export const RecallOpsPage: React.FC = () => {
  const [recalls, setRecalls] = useState<RecallIncident[]>([]);
  const [acknowledgements, setAcknowledgements] = useState<RecallAcknowledgement[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(3);
  const [blastRadius, setBlastRadius] = useState<BlastRadiusAssessment | null>(null);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notificationSuccess, setNotificationSuccess] = useState(false);

  useEffect(() => {
    async function loadRecallData() {
      const [recList, blastData] = await Promise.all([
        apiService.getRecalls(),
        apiService.assessBlastRadius('BG-2024-8891-ORG'),
      ]);
      setRecalls(recList);
      setBlastRadius(blastData);
      if (recList.length > 0) {
        const acks = await apiService.getRecallAcknowledgements(recList[0].recallId);
        setAcknowledgements(acks);
      }
    }
    loadRecallData();
  }, []);

  const handleInitiateRecall = async () => {
    if (confirmationInput !== 'CONFIRM-RECALL-BG-2024-8891-ORG') {
      alert('Please type the exact confirmation phrase to proceed.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newRecall = await apiService.initiateRecall({
        batchId: 'BG-2024-8891-ORG',
        hazardClass: 'CLASS_I_CRITICAL',
        reason: 'Listeria Monocytogenes Detection in Lot 902-A',
        confirmationPhrase: confirmationInput,
        auth2FAToken: '882910',
      });
      setRecalls((prev) => [newRecall, ...prev]);
      setNotificationSuccess(true);
      setTimeout(() => {
        setIsModalOpen(false);
        setNotificationSuccess(false);
        setConfirmationInput('');
      }, 2500);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeRecall = recalls[0];

  return (
    <div className="flex flex-col w-full">
      {/* Sub-Header Command Bar */}
      <div className="px-margin py-space-lg bg-surface-container-low shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-space-md border-b border-surface-container">
        <div className="flex flex-col">
          <div className="flex items-center gap-space-xs mb-space-xs">
            <span className="px-space-xs py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm tracking-widest uppercase flex items-center gap-1.5 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping" />
              DEFCON 1 ACTIVE RESPONSE
            </span>
            <span className="text-outline font-data-mono-sm text-data-mono-sm">REF: SEC-REC-902-A</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">
            Recall Operations Command Center
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl">
            Fast containment, automated partner notification, and cryptographic chain-of-custody enforcement across downstream distribution chains.
          </p>
        </div>

        <div className="flex items-center gap-space-sm flex-wrap sm:flex-nowrap">
          <Button variant="secondary" icon="support_agent">
            Emergency Hotline Bridge
          </Button>
          <Button
            variant="critical"
            icon="gpp_maybe"
            onClick={() => setIsModalOpen(true)}
          >
            + Initiate Targeted Recall
          </Button>
        </div>
      </div>

      <div className="p-margin flex flex-col gap-space-lg">
        {/* Critical Incident Alert Banner */}
        {activeRecall && (
          <div className="rounded-xl p-space-md bg-error text-on-error shadow-md flex flex-col md:flex-row md:items-center justify-between gap-space-md relative overflow-hidden">
            <div className="flex items-start md:items-center gap-space-md z-10">
              <div className="w-10 h-10 rounded-full bg-on-error/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">crisis_alert</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-space-sm">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider bg-on-error/25 px-2 py-0.5 rounded text-on-error font-bold">
                    {activeRecall.hazardClass.replace(/_/g, ' ')}
                  </span>
                  <span className="font-data-mono text-data-mono font-bold tracking-tight">{activeRecall.recallId}</span>
                </div>
                <span className="font-headline-sm text-headline-sm mt-0.5 font-bold">{activeRecall.reason}</span>
                <span className="font-body-sm text-body-sm opacity-90 mt-0.5">
                  {activeRecall.isolationPercentage}% of total distributed units are confirmed located and physically isolated under automated digital chain-of-custody lock.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-space-sm z-10 shrink-0">
              <div className="bg-black/20 px-space-md py-1.5 rounded-lg flex flex-col items-end">
                <span className="font-label-sm text-label-sm uppercase tracking-wider opacity-80">Containment Window</span>
                <span className="font-data-mono text-data-mono font-bold">01h : 42m elapsed</span>
              </div>
              <Button variant="secondary" size="sm" icon="receipt_long">
                Live Audit Log
              </Button>
            </div>
          </div>
        )}

        {/* KPI Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
          <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm border border-surface-container flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-outline">Active Recalls</span>
              <span className="w-8 h-8 rounded-lg bg-error-container text-on-error-container flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">warning</span>
              </span>
            </div>
            <div className="my-space-sm">
              <span className="font-headline-lg text-headline-lg text-on-surface font-bold">2 Active</span>
            </div>
            <div className="flex items-center gap-space-xs font-body-sm text-body-sm">
              <span className="px-1.5 py-0.5 rounded bg-error-container text-on-error-container font-label-sm text-label-sm font-semibold">1 Class I Critical</span>
              <span className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-label-sm text-label-sm">1 Class II</span>
            </div>
          </div>

          <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm border border-surface-container flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-outline">Units at Risk</span>
              <span className="w-8 h-8 rounded-lg bg-surface-container-high text-tertiary flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">inventory</span>
              </span>
            </div>
            <div className="my-space-sm">
              <span className="font-headline-lg text-headline-lg text-on-surface font-bold tnum">18,450</span>
            </div>
            <div className="flex items-center justify-between font-body-sm text-body-sm text-on-surface-variant">
              <span>Across 3 affected SKUs</span>
              <span className="font-data-mono-sm text-data-mono-sm text-secondary font-semibold">96.2% accounted</span>
            </div>
          </div>

          <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm border border-surface-container flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-outline">Node Acknowledgment Rate</span>
              <span className="w-8 h-8 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">fact_check</span>
              </span>
            </div>
            <div className="my-space-sm flex items-baseline gap-space-xs">
              <span className="font-headline-lg text-headline-lg text-on-surface font-bold tnum">91.7%</span>
              <span className="font-label-sm text-label-sm text-secondary font-semibold">44 of 48 nodes</span>
            </div>
            <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
              <div className="bg-secondary h-full rounded-full" style={{ width: '91.7%' }} />
            </div>
          </div>

          <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm border border-surface-container flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-outline">Containment Velocity</span>
              <span className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[18px]">timer</span>
              </span>
            </div>
            <div className="my-space-sm flex items-baseline gap-space-xs">
              <span className="font-headline-lg text-headline-lg text-on-surface font-bold tnum">48.2m</span>
              <span className="font-label-sm text-label-sm text-secondary font-semibold">Mean Time to Quarantine</span>
            </div>
            <div className="flex items-center justify-between text-outline font-data-mono-sm text-data-mono-sm">
              <span>Benchmark: &lt; 2h 00m</span>
              <span className="text-secondary font-semibold">60% Faster</span>
            </div>
          </div>
        </div>

        {/* Facility Quarantine Ledger Table */}
        <div className="bg-surface-container-lowest rounded-xl border border-surface-container shadow-sm overflow-hidden flex flex-col">
          <div className="p-space-md border-b border-surface-container flex items-center justify-between">
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-primary text-[20px]">fact_check</span>
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                Facility Quarantine &amp; POS Lock Status Ledger
              </h2>
            </div>
            <span className="font-data-mono-sm text-data-mono-sm text-outline">
              Incident Ref: {activeRecall?.recallId}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low font-label-sm text-label-sm text-outline uppercase tracking-wider border-b border-surface-container">
                <tr>
                  <th className="py-3 px-4">Node / Facility Name</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Allocated Units</th>
                  <th className="py-3 px-4">Quarantine Verified</th>
                  <th className="py-3 px-4">POS Scan-Block</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Acknowledgement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container font-body-sm text-body-sm">
                {acknowledgements.map((ack) => (
                  <tr key={ack.nodeId} className="hover:bg-surface-container-low/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-on-surface">{ack.nodeName}</span>
                        <span className="font-data-mono-sm text-data-mono-sm text-outline">{ack.nodeId}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-outline">{ack.location}</td>
                    <td className="py-3 px-4 font-data-mono text-data-mono">{ack.unitsAllocated.toLocaleString()} units</td>
                    <td className="py-3 px-4">
                      <span className="font-data-mono text-data-mono font-semibold text-secondary">
                        {ack.unitsQuarantined.toLocaleString()} units
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {ack.posScanBlockApplied ? (
                        <span className="inline-flex items-center gap-1 text-secondary font-semibold text-xs">
                          <span className="material-symbols-outlined text-[16px]">lock</span>
                          LOCKED
                        </span>
                      ) : (
                        <span className="text-outline text-xs">N/A</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-label-sm text-label-sm uppercase font-semibold">
                        {ack.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-data-mono-sm text-data-mono-sm text-outline">
                      {ack.acknowledgedBy || 'Pending'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4-Step Targeted Recall Wizard Modal (Exact Stitch Design) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-sm flex items-center justify-center p-space-md sm:p-margin transition-opacity">
          <div className="w-full max-w-4xl bg-surface-container-lowest rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-surface-container">
            {/* Modal Header */}
            <div className="px-space-lg py-space-md bg-surface-container-low border-b border-surface-container flex items-center justify-between">
              <div className="flex items-center gap-space-sm">
                <div className="w-9 h-9 rounded-lg bg-error-container text-on-error-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">emergency</span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-space-xs">
                    <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                      Initiate Targeted Recall Protocol
                    </span>
                    <span className="px-2 py-0.5 rounded bg-error text-on-error font-label-sm text-label-sm uppercase font-bold">
                      Step {wizardStep} of 4
                    </span>
                  </div>
                  <span className="font-body-sm text-body-sm text-outline">
                    Review Downstream Blast Radius &amp; Automated EDI Commands
                  </span>
                </div>
              </div>
              <button
                className="w-8 h-8 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container flex items-center justify-center transition-colors"
                onClick={() => setIsModalOpen(false)}
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* 4-Step Process Progress Bar */}
            <div className="px-space-lg py-space-sm bg-surface-container-lowest grid grid-cols-4 gap-space-xs border-b border-surface-container">
              <div className="flex items-center gap-space-xs">
                <div className="w-6 h-6 rounded-full bg-secondary text-on-secondary font-label-sm text-label-sm flex items-center justify-center font-bold">✓</div>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-sm text-label-sm font-semibold text-on-surface truncate">1. Batch Select</span>
                  <span className="font-data-mono-sm text-data-mono-sm text-secondary truncate">BG-8891-ORG</span>
                </div>
              </div>
              <div className="flex items-center gap-space-xs">
                <div className="w-6 h-6 rounded-full bg-secondary text-on-secondary font-label-sm text-label-sm flex items-center justify-center font-bold">✓</div>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-sm text-label-sm font-semibold text-on-surface truncate">2. Hazard Class</span>
                  <span className="font-data-mono-sm text-data-mono-sm text-error truncate">Class I (Bio)</span>
                </div>
              </div>
              <div className="flex items-center gap-space-xs">
                <div className={`w-6 h-6 rounded-full ${wizardStep === 3 ? 'bg-primary text-on-primary' : 'bg-secondary text-on-secondary'} font-label-sm text-label-sm flex items-center justify-center font-bold`}>
                  {wizardStep === 4 ? '✓' : '3'}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-sm text-label-sm font-bold text-primary truncate">3. Impacted Nodes</span>
                  <span className="font-data-mono-sm text-data-mono-sm text-on-surface truncate">48 Endpoints</span>
                </div>
              </div>
              <div className={`flex items-center gap-space-xs ${wizardStep === 4 ? 'opacity-100' : 'opacity-40'}`}>
                <div className={`w-6 h-6 rounded-full ${wizardStep === 4 ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'} font-label-sm text-label-sm flex items-center justify-center font-bold`}>
                  4
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-sm text-label-sm font-semibold text-on-surface truncate">4. Crypto Auth</span>
                  <span className="font-data-mono-sm text-data-mono-sm text-outline truncate">2FA Required</span>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-space-lg flex-1 overflow-y-auto flex flex-col gap-space-md">
              {notificationSuccess ? (
                <div className="p-space-lg rounded-xl bg-emerald-50 border border-emerald-200 text-center flex flex-col items-center gap-space-sm">
                  <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                    <span className="material-symbols-outlined text-[28px]">check_circle</span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-emerald-900 font-bold">
                    Targeted Recall Successfully Broadcast!
                  </h3>
                  <p className="font-body-md text-body-md text-emerald-800 max-w-lg">
                    AWS Step Functions execution initiated. 48 facilities notified via SNS fan-out, POS scan-block active, and immutable audit record sealed.
                  </p>
                </div>
              ) : wizardStep === 3 ? (
                <>
                  {/* Impact Summary Callout */}
                  <div className="p-space-md rounded-xl bg-error-container/30 border border-error-container flex items-start gap-space-md">
                    <span className="material-symbols-outlined text-error text-[28px] shrink-0 mt-0.5">report_problem</span>
                    <div className="flex flex-col">
                      <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                        {blastRadius?.totalUnitsAtRisk.toLocaleString()} Finished Consumer Units At Risk
                      </span>
                      <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                        Identified across <strong>6 Distribution Centers</strong> and <strong>42 Retail Endpoints</strong>. Automated <code>EDI 940 / Warehouse Hold</code> instructions are pre-compiled and primed for immediate broadcast transmission upon authorization.
                      </p>
                    </div>
                  </div>

                  {/* Impacted Nodes Table */}
                  <div className="flex flex-col gap-space-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-label-md text-label-md font-semibold text-on-surface">
                        Target Distribution Nodes (Lineage Blast Radius)
                      </span>
                      <span className="font-data-mono-sm text-data-mono-sm text-outline">GTIN-14: 00850012345678</span>
                    </div>
                    <div className="rounded-lg border border-surface-container overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-surface-container-low font-label-sm text-label-sm text-outline uppercase tracking-wider">
                          <tr>
                            <th className="py-2 px-3">Node Type</th>
                            <th className="py-2 px-3">Facility Name</th>
                            <th className="py-2 px-3">Location</th>
                            <th className="py-2 px-3">Lot Allocation</th>
                            <th className="py-2 px-3">Pre-Command Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-container font-body-sm text-body-sm">
                          {blastRadius?.impactedNodes.map((node) => (
                            <tr key={node.nodeId}>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-label-sm text-label-sm font-semibold">
                                  {node.nodeType.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-on-surface">{node.nodeName}</td>
                              <td className="py-2.5 px-3 text-outline">{node.location}</td>
                              <td className="py-2.5 px-3 font-data-mono text-data-mono font-medium">{node.lotAllocation}</td>
                              <td className="py-2.5 px-3 text-secondary font-medium">{node.preCommandAction}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Compliance Verification Checklist */}
                  <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-space-xs border border-surface-container">
                    <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">Compliance Assurance Checks</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm pt-space-xs">
                      {blastRadius?.complianceChecklist.map((check, idx) => (
                        <label key={idx} className="flex items-center gap-space-xs cursor-pointer">
                          <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-primary focus:ring-secondary accent-primary" />
                          <span className="font-body-sm text-body-sm text-on-surface">{check}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                /* Step 4: Cryptographic Confirmation & 2FA */
                <div className="flex flex-col gap-space-md">
                  <div className="p-space-md rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-space-md">
                    <span className="material-symbols-outlined text-amber-700 text-[28px] shrink-0">verified_user</span>
                    <div className="flex flex-col">
                      <span className="font-headline-sm text-headline-sm text-amber-900 font-bold">
                        Two-Factor Authorization Required
                      </span>
                      <p className="font-body-md text-body-md text-amber-800 mt-1">
                        Initiating a product recall locks inventory across physical facilities, alters register barcodes, and notifies state authorities. Type the confirmation phrase below to unlock execution.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-space-xs">
                    <label className="font-label-md text-label-md font-semibold text-on-surface">
                      Confirmation Phrase: <span className="font-data-mono font-bold text-error">CONFIRM-RECALL-BG-2024-8891-ORG</span>
                    </label>
                    <input
                      type="text"
                      value={confirmationInput}
                      onChange={(e) => setConfirmationInput(e.target.value)}
                      placeholder="Type confirmation phrase exactly..."
                      className="h-[38px] px-space-sm rounded-lg border border-surface-container bg-surface-container-lowest font-data-mono text-on-surface focus:border-error focus:ring-1 focus:ring-error outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-space-xs">
                    <label className="font-label-md text-label-md font-semibold text-on-surface">
                      Emergency 2FA Security Token (Demo: 882910)
                    </label>
                    <input
                      type="text"
                      defaultValue="882910"
                      className="h-[38px] px-space-sm rounded-lg border border-surface-container bg-surface-container-low font-data-mono text-outline"
                      readOnly
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Bar */}
            <div className="px-space-lg py-space-md bg-surface-container-low border-t border-surface-container flex flex-col sm:flex-row items-center justify-between gap-space-md">
              <Button
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
              >
                Abort / Save Draft
              </Button>

              <div className="flex items-center gap-space-sm">
                {wizardStep === 4 && (
                  <Button
                    variant="secondary"
                    onClick={() => setWizardStep(3)}
                  >
                    Back to Blast Radius
                  </Button>
                )}
                {wizardStep === 3 ? (
                  <Button
                    variant="critical"
                    icon="notification_important"
                    onClick={() => setWizardStep(4)}
                  >
                    Proceed to Authorization &amp; 2FA
                  </Button>
                ) : (
                  <Button
                    variant="critical"
                    icon="emergency"
                    isLoading={isSubmitting}
                    disabled={confirmationInput !== 'CONFIRM-RECALL-BG-2024-8891-ORG'}
                    onClick={handleInitiateRecall}
                  >
                    Broadcast Emergency Recall
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

