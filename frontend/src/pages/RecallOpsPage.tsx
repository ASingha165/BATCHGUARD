import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import {
  RecallIncident,
  RecallAcknowledgement,
  BlastRadiusAssessment,
  QuarantineTask,
  AcknowledgementSummary,
  RecallWorkflowStatus,
} from '../types';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/Toast';

export const RecallOpsPage: React.FC = () => {
  const { addToast } = useToast();
  const [recalls, setRecalls] = useState<RecallIncident[]>([]);
  const [acknowledgements, setAcknowledgements] = useState<RecallAcknowledgement[]>([]);
  const [quarantineTasks, setQuarantineTasks] = useState<QuarantineTask[]>([]);
  const [workflowStatus, setWorkflowStatus] = useState<RecallWorkflowStatus | null>(null);
  const [ackSummary, setAckSummary] = useState<AcknowledgementSummary | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [blastRadius, setBlastRadius] = useState<BlastRadiusAssessment | null>(null);

  // Form states for Wizard
  const [selectedBatchId, setSelectedBatchId] = useState('BG-2024-8891-ORG');
  const [selectedHazardClass, setSelectedHazardClass] = useState('CLASS_I_CRITICAL');
  const [incidentReason, setIncidentReason] = useState('Listeria Monocytogenes Detection in Lot 902-A');
  const [confirmationInput, setConfirmationInput] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notificationSuccess, setNotificationSuccess] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [isApproving, setIsApproving] = useState(false);

  // Live Containment Timer simulation
  const [secondsElapsed, setSecondsElapsed] = useState(6135); // ~1h 42m 15s

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${h}h : ${m}m : ${s}s elapsed`;
  };

  useEffect(() => {
    async function loadRecallData() {
      const [recList, blastData] = await Promise.all([
        apiService.getRecalls(),
        apiService.assessBlastRadius(selectedBatchId),
      ]);
      setRecalls(recList);
      setBlastRadius(blastData);
      if (recList.length > 0) {
        const activeRecId = recList[0].recallId;
        const [acks, statusData, tasks, summary] = await Promise.all([
          apiService.getRecallAcknowledgements(activeRecId),
          apiService.getRecallStatus(activeRecId),
          apiService.getQuarantineTasks(activeRecId),
          apiService.getAcknowledgementSummary(activeRecId),
        ]);
        setAcknowledgements(acks);
        setWorkflowStatus(statusData);
        setQuarantineTasks(tasks);
        setAckSummary(summary);
      }
    }
    loadRecallData();
  }, [selectedBatchId]);

  const handleApproveRecall = async () => {
    if (!activeRecall) return;
    setIsApproving(true);
    try {
      await apiService.approveRecall(activeRecall.recallId, approvalNotes || 'Approved by Quality Assurance Director');
      setRecalls((prev) => prev.map((r) => (r.recallId === activeRecall.recallId ? { ...r, status: 'APPROVED' } : r)));
      if (workflowStatus) {
        setWorkflowStatus({
          ...workflowStatus,
          status: 'APPROVED',
          approval: {
            ...workflowStatus.approval,
            status: 'APPROVED',
            approvedBy: 'elena.vance@apexnutrition.internal',
            approvedAt: new Date().toISOString(),
          },
        });
      }
      addToast({
        type: 'success',
        title: 'Recall Authorized & Step Functions Resumed',
        description: `Emergency hold orders and SNS alerts released for incident ${activeRecall.recallId}.`,
      });
    } catch {
      addToast({
        type: 'error',
        title: 'Approval Failed',
        description: 'Unable to approve recall incident.',
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectRecall = async () => {
    if (!activeRecall) return;
    setIsApproving(true);
    try {
      await apiService.rejectRecall(activeRecall.recallId, 'Sample re-test returned negative; containment aborted.');
      setRecalls((prev) => prev.map((r) => (r.recallId === activeRecall.recallId ? { ...r, status: 'REJECTED' } : r)));
      if (workflowStatus) {
        setWorkflowStatus({
          ...workflowStatus,
          status: 'REJECTED',
          approval: {
            ...workflowStatus.approval,
            status: 'REJECTED',
            rejectedBy: 'elena.vance@apexnutrition.internal',
            rejectedAt: new Date().toISOString(),
          },
        });
      }
      addToast({
        type: 'warning',
        title: 'Recall Aborted & Lock Released',
        description: `Incident ${activeRecall.recallId} was rejected. All digital locks cleared.`,
      });
    } catch {
      addToast({
        type: 'error',
        title: 'Rejection Failed',
        description: 'Unable to reject recall incident.',
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleSimulateBroadcast = async () => {
    const expectedPhrase = `CONFIRM-RECALL-${selectedBatchId}`;
    if (confirmationInput.trim() !== expectedPhrase) {
      addToast({
        type: 'error',
        title: 'Confirmation Phrase Mismatch',
        description: `Please enter '${expectedPhrase}' exactly to authorize recall.`,
      });
      return;
    }

    if (!/^\d{6}$/.test(otpToken)) {
      addToast({
        type: 'error',
        title: 'Invalid 2FA Token',
        description: 'Please enter a valid 6-digit numeric security token.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const initiatedRecall = await apiService.initiateRecall({
        batchId: selectedBatchId,
        hazardClass: selectedHazardClass,
        reason: incidentReason,
        confirmationPhrase: confirmationInput,
        auth2FAToken: otpToken,
      });

      setRecalls((prev) => [initiatedRecall, ...prev]);
      setNotificationSuccess(true);
      addToast({
        type: 'success',
        title: 'Targeted Recall Broadcasted',
        description: `AWS Step Functions state machine execution started for ${selectedBatchId}.`,
      });

      setTimeout(() => {
        setIsModalOpen(false);
        setNotificationSuccess(false);
        setWizardStep(1);
        setConfirmationInput('');
        setOtpToken('');
      }, 2500);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeRecall = recalls[0];

  return (
    <div className="flex flex-col w-full">
      {/* Sub-Header Command Bar */}
      <div className="px-space-md sm:px-margin py-space-lg bg-surface-container-low shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-space-md border-b border-surface-container">
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
          <Button
            variant="secondary"
            icon="support_agent"
            onClick={() => addToast({ type: 'info', title: 'Emergency Bridge Active', description: 'Conference bridge dialed: +1 (800) 555-SAFE (ID: 902-A).' })}
          >
            Emergency Hotline Bridge
          </Button>
          <Button
            variant="critical"
            icon="gpp_maybe"
            onClick={() => {
              setWizardStep(1);
              setIsModalOpen(true);
            }}
          >
            + Initiate Targeted Recall
          </Button>
        </div>
      </div>

      <div className="p-space-md sm:p-margin flex flex-col gap-space-lg">
        {/* Critical Incident Alert Banner */}
        {activeRecall && (
          <div className="rounded-xl p-space-md bg-error text-on-error shadow-md flex flex-col md:flex-row md:items-center justify-between gap-space-md relative overflow-hidden">
            <div className="absolute -right-6 -bottom-8 opacity-10 pointer-events-none">
              <span className="material-symbols-outlined text-[160px]">shield_with_heart</span>
            </div>
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
                <span className="font-data-mono text-data-mono font-bold">{formatTimer(secondsElapsed)}</span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon="receipt_long"
                onClick={() => addToast({ type: 'info', title: 'Audit Ledger Stream', description: 'Displaying real-time cryptographic audit trail on Amazon CloudWatch.' })}
              >
                Live Audit Log
              </Button>
            </div>
          </div>
        )}

        {/* Human Approval Gate Card (AWS Step Functions .waitForTaskToken) */}
        {activeRecall && (activeRecall.status === 'PENDING_APPROVAL' || workflowStatus?.approval.status === 'PENDING') && (
          <div className="rounded-xl p-space-md bg-amber-50 border border-amber-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md">
            <div className="flex items-start gap-space-sm">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">verified_user</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-space-xs">
                  <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                    Human Approval Gate Required
                  </span>
                  <span className="font-data-mono-sm text-data-mono-sm text-amber-800">
                    Step Functions Task: AwaitRecallApproval
                  </span>
                </div>
                <span className="font-headline-sm text-headline-sm text-amber-950 font-bold mt-1">
                  Compliance Officer Authorization Pending
                </span>
                <p className="font-body-sm text-body-sm text-amber-800 max-w-2xl mt-0.5">
                  State machine execution has halted pending cryptographic verification. Authorizing will resume Step Functions execution, release automated EDI 940 hold commands, and publish emergency SNS alerts.
                </p>
                <div className="mt-space-xs flex items-center gap-space-sm">
                  <input
                    type="text"
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    placeholder="Optional authorization remarks (e.g. Confirmed by QA Director)..."
                    className="px-3 py-1.5 text-xs rounded border border-amber-300 bg-white text-slate-800 w-80 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-space-sm shrink-0">
              <Button
                variant="secondary"
                size="sm"
                icon="cancel"
                disabled={isApproving}
                onClick={handleRejectRecall}
              >
                Reject &amp; Abort
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon="check_circle"
                disabled={isApproving}
                onClick={handleApproveRecall}
              >
                {isApproving ? 'Authorizing...' : 'Authorize & Resume Workflow'}
              </Button>
            </div>
          </div>
        )}

        {/* Step Functions Orchestration Lifecycle Timeline */}
        <div className="bg-surface-container-lowest rounded-xl border border-surface-container shadow-sm p-space-md flex flex-col gap-space-sm">
          <div className="flex items-center justify-between border-b border-surface-container pb-space-xs">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary text-[20px]">account_tree</span>
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                AWS Step Functions Orchestration Pipeline
              </h2>
            </div>
            <div className="flex items-center gap-space-xs">
              <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                STANDARD WORKFLOW
              </span>
              <span className="font-data-mono-sm text-data-mono-sm text-outline">
                STATE: {workflowStatus?.status || activeRecall?.status || 'AWAITING_ACKNOWLEDGEMENTS'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-space-sm pt-space-xs">
            {/* Step 1 */}
            <div className="p-2.5 rounded-lg bg-surface-container-low border border-surface-container flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm font-bold text-secondary flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span> 1. Validation
                </span>
                <span className="font-data-mono-sm text-[10px] text-outline">DONE</span>
              </div>
              <span className="text-xs text-on-surface-variant font-medium">Batch GTIN &amp; Lot Verified</span>
            </div>

            {/* Step 2 */}
            <div className="p-2.5 rounded-lg bg-surface-container-low border border-surface-container flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm font-bold text-secondary flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span> 2. Blast Radius
                </span>
                <span className="font-data-mono-sm text-[10px] text-outline">DONE</span>
              </div>
              <span className="text-xs text-on-surface-variant font-medium">Traceability Graph Evaluated</span>
            </div>

            {/* Step 3 */}
            <div className="p-2.5 rounded-lg bg-surface-container-low border border-surface-container flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm font-bold text-secondary flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span> 3. Risk Scored
                </span>
                <span className="font-data-mono-sm text-[10px] text-outline">DONE</span>
              </div>
              <span className="text-xs text-on-surface-variant font-medium">Class I Criticality Enforced</span>
            </div>

            {/* Step 4 */}
            <div className={`p-2.5 rounded-lg border flex flex-col gap-1 ${
              workflowStatus?.approval.status === 'APPROVED'
                ? 'bg-surface-container-low border-surface-container'
                : 'bg-amber-50 border-amber-300'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`font-label-sm text-label-sm font-bold flex items-center gap-1 ${
                  workflowStatus?.approval.status === 'APPROVED' ? 'text-secondary' : 'text-amber-800'
                }`}>
                  <span className="material-symbols-outlined text-[14px]">
                    {workflowStatus?.approval.status === 'APPROVED' ? 'check_circle' : 'pending'}
                  </span>
                  4. Approval Gate
                </span>
                <span className="font-data-mono-sm text-[10px] text-outline">
                  {workflowStatus?.approval.status === 'APPROVED' ? 'APPROVED' : 'WAITING'}
                </span>
              </div>
              <span className="text-xs text-on-surface-variant font-medium">2FA &amp; Role Gate Enforced</span>
            </div>

            {/* Step 5 */}
            <div className="p-2.5 rounded-lg bg-surface-container-low border border-surface-container flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm font-bold text-secondary flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span> 5. Quarantine
                </span>
                <span className="font-data-mono-sm text-[10px] text-outline">ACTIVE</span>
              </div>
              <span className="text-xs text-on-surface-variant font-medium">EDI 940 &amp; POS Scan-Blocks</span>
            </div>

            {/* Step 6 */}
            <div className="p-2.5 rounded-lg bg-surface-container-low border border-surface-container flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm font-bold text-secondary flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span> 6. Broadcast
                </span>
                <span className="font-data-mono-sm text-[10px] text-outline">DISPATCHED</span>
              </div>
              <span className="text-xs text-on-surface-variant font-medium">Amazon SNS Alerts Sent</span>
            </div>
          </div>
        </div>

        {/* Carrier Intercept Urgent Alert Banner (if carrier tasks present) */}
        {quarantineTasks.some((t) => t.carrierInterceptRequired) && (
          <div className="p-space-md rounded-xl bg-orange-50 border border-orange-200 shadow-sm flex items-start gap-space-sm">
            <span className="material-symbols-outlined text-orange-600 text-[24px] shrink-0 mt-0.5">local_shipping</span>
            <div className="flex flex-col flex-1">
              <div className="flex items-center gap-space-xs">
                <span className="font-label-sm text-label-sm font-bold text-orange-900 uppercase">
                  Active Transit Intercept Ordered
                </span>
                <span className="font-data-mono-sm text-data-mono-sm text-orange-700">
                  {quarantineTasks.filter((t) => t.carrierInterceptRequired).length} In-Transit Line-Haul Shipments
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-orange-800 mt-0.5">
                Urgent re-route order issued to carrier dispatchers. En route trucks are instructed to bypass standard retail delivery docks and divert to Secure Quarantine Depot C.
              </p>
            </div>
          </div>
        )}

        {/* KPI Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
          {/* KPI 1 */}
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

          {/* KPI 2 */}
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

          {/* KPI 3 */}
          <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm border border-surface-container flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-outline">Node Acknowledgment Rate</span>
              <span className="w-8 h-8 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">fact_check</span>
              </span>
            </div>
            <div className="my-space-sm flex items-baseline gap-space-xs">
              <span className="font-headline-lg text-headline-lg text-on-surface font-bold tnum">
                {ackSummary ? `${ackSummary.percentAcknowledged}%` : '91.7%'}
              </span>
              <span className="font-label-sm text-label-sm text-secondary font-semibold">
                {ackSummary ? `${ackSummary.acknowledgedCount} of ${ackSummary.totalImpactedFacilities} nodes` : '44 of 48 nodes'}
              </span>
            </div>
            <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-secondary h-full rounded-full transition-all duration-500"
                style={{ width: `${ackSummary?.percentAcknowledged ?? 91.7}%` }}
              />
            </div>
          </div>

          {/* KPI 4 */}
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

        {/* Crisis Command Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
          <button
            onClick={() => addToast({ type: 'warning', title: 'Emergency SMS/Webhook Re-Dispatched', description: '10 non-responsive facility managers pinged with high-priority hold commands.' })}
            className="p-space-md rounded-xl bg-surface-container-lowest border border-surface-container hover:bg-surface-container-low text-left flex items-start gap-space-sm transition-all shadow-sm"
            type="button"
          >
            <div className="w-10 h-10 rounded-lg bg-error-container text-on-error-container flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">cell_tower</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-on-surface font-bold">Broadcast SMS / Webhook Blast</span>
              <span className="font-body-sm text-body-sm text-outline mt-0.5">Re-ping 10 non-responsive facility managers</span>
            </div>
          </button>

          <button
            onClick={() => addToast({ type: 'info', title: 'Field Auditor Assigned', description: 'Third-party FDA compliance auditor dispatched to Northeast Logistics Hub.' })}
            className="p-space-md rounded-xl bg-surface-container-lowest border border-surface-container hover:bg-surface-container-low text-left flex items-start gap-space-sm transition-all shadow-sm"
            type="button"
          >
            <div className="w-10 h-10 rounded-lg bg-surface-container-high text-tertiary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">person_pin_circle</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-on-surface font-bold">Dispatch Field Inspector</span>
              <span className="font-body-sm text-body-sm text-outline mt-0.5">Assign certified quality auditor to Scranton DC</span>
            </div>
          </button>

          <button
            onClick={() => addToast({ type: 'success', title: 'Bio-Disposal Order Approved', description: 'Witnessed bio-destruction protocol scheduled for quarantined spinach cases.' })}
            className="p-space-md rounded-xl bg-surface-container-lowest border border-surface-container hover:bg-surface-container-low text-left flex items-start gap-space-sm transition-all shadow-sm"
            type="button"
          >
            <div className="w-10 h-10 rounded-lg bg-primary-fixed text-on-primary-fixed flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">delete_forever</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-on-surface font-bold">Approve Bio-Disposal Order</span>
              <span className="font-body-sm text-body-sm text-outline mt-0.5">Schedule witnessed destruction and incineration</span>
            </div>
          </button>
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

      {/* 4-Step Targeted Recall Wizard Modal */}
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
                    {wizardStep === 1 && 'Select Target Food Batch & Production Lot'}
                    {wizardStep === 2 && 'Classify Safety Hazard Severity & Pathogen'}
                    {wizardStep === 3 && 'Review Downstream Blast Radius & Automated EDI Commands'}
                    {wizardStep === 4 && 'Authorize with Cryptographic Signature & Two-Factor Authentication'}
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
              <div className={`flex items-center gap-space-xs cursor-pointer ${wizardStep === 1 ? 'font-bold' : ''}`} onClick={() => setWizardStep(1)}>
                <div className={`w-6 h-6 rounded-full ${wizardStep >= 1 ? 'bg-secondary text-on-secondary' : 'bg-surface-container-high'} font-label-sm text-label-sm flex items-center justify-center font-bold`}>
                  {wizardStep > 1 ? '✓' : '1'}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-sm text-label-sm font-semibold text-on-surface truncate">1. Batch Select</span>
                  <span className="font-data-mono-sm text-data-mono-sm text-secondary truncate">{selectedBatchId}</span>
                </div>
              </div>

              <div className={`flex items-center gap-space-xs cursor-pointer ${wizardStep === 2 ? 'font-bold' : ''}`} onClick={() => setWizardStep(2)}>
                <div className={`w-6 h-6 rounded-full ${wizardStep >= 2 ? 'bg-secondary text-on-secondary' : 'bg-surface-container-high'} font-label-sm text-label-sm flex items-center justify-center font-bold`}>
                  {wizardStep > 2 ? '✓' : '2'}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-sm text-label-sm font-semibold text-on-surface truncate">2. Hazard Class</span>
                  <span className="font-data-mono-sm text-data-mono-sm text-error truncate">Class I (Bio)</span>
                </div>
              </div>

              <div className={`flex items-center gap-space-xs cursor-pointer ${wizardStep === 3 ? 'font-bold' : ''}`} onClick={() => setWizardStep(3)}>
                <div className={`w-6 h-6 rounded-full ${wizardStep >= 3 ? 'bg-primary text-on-primary' : 'bg-surface-container-high'} font-label-sm text-label-sm flex items-center justify-center font-bold`}>
                  {wizardStep > 3 ? '✓' : '3'}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-sm text-label-sm font-bold text-primary truncate">3. Impacted Nodes</span>
                  <span className="font-data-mono-sm text-data-mono-sm text-on-surface truncate">48 Endpoints</span>
                </div>
              </div>

              <div className={`flex items-center gap-space-xs cursor-pointer ${wizardStep === 4 ? 'opacity-100 font-bold' : 'opacity-50'}`} onClick={() => setWizardStep(4)}>
                <div className={`w-6 h-6 rounded-full ${wizardStep === 4 ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'} font-label-sm text-label-sm flex items-center justify-center font-bold`}>
                  4
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-sm text-label-sm font-semibold text-on-surface truncate">4. Crypto Auth</span>
                  <span className="font-data-mono-sm text-data-mono-sm text-outline truncate">MFA Required</span>
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
              ) : wizardStep === 1 ? (
                /* Step 1: Batch Select */
                <div className="flex flex-col gap-space-md">
                  <div className="flex flex-col gap-1">
                    <label className="font-label-md text-label-md font-semibold text-on-surface">Target Food Batch</label>
                    <select
                      value={selectedBatchId}
                      onChange={(e) => setSelectedBatchId(e.target.value)}
                      className="h-10 px-3 rounded-lg border border-surface-container bg-surface-container-lowest font-data-mono text-on-surface outline-none focus:border-primary"
                    >
                      <option value="BG-2024-8891-ORG">BG-2024-8891-ORG (Organic Baby Spinach 16oz)</option>
                      <option value="BG-2024-9022-ROM">BG-2024-9022-ROM (Crisp Romaine Hearts 3pk)</option>
                      <option value="BG-2024-7719-BER">BG-2024-7719-BER (Fresh Organic Strawberries 1lb)</option>
                    </select>
                  </div>

                  <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-on-surface">Batch Details Preview</span>
                      <span className="font-data-mono-sm text-xs text-primary font-bold">GTIN: 00850012345678</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-outline">
                      <div>Product: <strong className="text-on-surface">Organic Baby Spinach 16oz</strong></div>
                      <div>Lot Code: <strong className="text-on-surface">L-8891-A</strong></div>
                      <div>Initial Harvest: <strong className="text-on-surface">Oct 12, 2024</strong></div>
                      <div>Custody Status: <strong className="text-secondary">In Transit (Reefer #402)</strong></div>
                    </div>
                  </div>
                </div>
              ) : wizardStep === 2 ? (
                /* Step 2: Hazard Severity Classification */
                <div className="flex flex-col gap-space-md">
                  <div className="flex flex-col gap-2">
                    <label className="font-label-md text-label-md font-semibold text-on-surface">Hazard Severity Classification</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm">
                      <div
                        onClick={() => setSelectedHazardClass('CLASS_I_CRITICAL')}
                        className={`p-3 rounded-xl border cursor-pointer flex flex-col gap-1 transition-all ${
                          selectedHazardClass === 'CLASS_I_CRITICAL'
                            ? 'bg-error-container/40 border-error text-error'
                            : 'bg-surface-container-lowest border-surface-container text-on-surface'
                        }`}
                      >
                        <span className="font-bold text-xs uppercase">Class I Critical</span>
                        <span className="text-xs opacity-90">Microbial / Pathogen (Life-threatening)</span>
                      </div>

                      <div
                        onClick={() => setSelectedHazardClass('CLASS_II')}
                        className={`p-3 rounded-xl border cursor-pointer flex flex-col gap-1 transition-all ${
                          selectedHazardClass === 'CLASS_II'
                            ? 'bg-amber-100 border-amber-600 text-amber-900'
                            : 'bg-surface-container-lowest border-surface-container text-on-surface'
                        }`}
                      >
                        <span className="font-bold text-xs uppercase">Class II Moderate</span>
                        <span className="text-xs opacity-90">Temporary or medically reversible</span>
                      </div>

                      <div
                        onClick={() => setSelectedHazardClass('CLASS_III')}
                        className={`p-3 rounded-xl border cursor-pointer flex flex-col gap-1 transition-all ${
                          selectedHazardClass === 'CLASS_III'
                            ? 'bg-sky-100 border-sky-600 text-sky-900'
                            : 'bg-surface-container-lowest border-surface-container text-on-surface'
                        }`}
                      >
                        <span className="font-bold text-xs uppercase">Class III Advisory</span>
                        <span className="text-xs opacity-90">Labeling or technical packaging defect</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-label-md text-label-md font-semibold text-on-surface">Incident Description &amp; Lab Report Summary</label>
                    <textarea
                      rows={3}
                      value={incidentReason}
                      onChange={(e) => setIncidentReason(e.target.value)}
                      className="p-3 rounded-lg border border-surface-container bg-surface-container-lowest text-on-surface font-body-sm outline-none focus:border-primary"
                    />
                  </div>
                </div>
              ) : wizardStep === 3 ? (
                /* Step 3: Blast Radius Review */
                <>
                  <div className="p-space-md rounded-xl bg-error-container/30 border border-error-container flex items-start gap-space-md">
                    <span className="material-symbols-outlined text-error text-[28px] shrink-0 mt-0.5">report_problem</span>
                    <div className="flex flex-col">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                          {blastRadius?.totalUnitsAtRisk.toLocaleString()} Finished Consumer Units At Risk
                        </span>
                        {blastRadius?.traceabilityCompleteness && (
                          <span className="font-label-sm text-xs px-2.5 py-0.5 rounded-full bg-secondary-fixed text-primary font-bold">
                            Completeness: {blastRadius.traceabilityCompleteness.completenessScore}% ({blastRadius.traceabilityCompleteness.confidenceLevel})
                          </span>
                        )}
                      </div>
                      <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                        Identified across <strong>{blastRadius?.affectedDistributionCentres ?? 6} Distribution Centers</strong> and <strong>{blastRadius?.affectedRetailers ?? 42} Retail Endpoints</strong>.
                        {blastRadius?.knownRemainingInventory !== undefined && (
                          <span> ({blastRadius.knownRemainingInventory.toLocaleString()} units confirmed in warehouse inventory; {blastRadius.unknownInventoryQuantities?.toLocaleString() || 0} units pending retail POS verification).</span>
                        )} Automated <code>EDI 940 / Warehouse Hold</code> instructions are pre-compiled and primed for immediate broadcast transmission upon authorization.
                      </p>
                    </div>
                  </div>

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
                /* Step 4: Cryptographic Confirmation & Two-Factor Authentication */
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
                      Confirmation Phrase: <span className="font-data-mono font-bold text-error">CONFIRM-RECALL-{selectedBatchId}</span>
                    </label>
                    <input
                      type="text"
                      value={confirmationInput}
                      onChange={(e) => setConfirmationInput(e.target.value)}
                      placeholder={`Type CONFIRM-RECALL-${selectedBatchId} exactly...`}
                      className="h-[38px] px-space-sm rounded-lg border border-surface-container bg-surface-container-lowest font-data-mono text-on-surface focus:border-error focus:ring-1 focus:ring-error outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-space-xs">
                    <label className="font-label-md text-label-md font-semibold text-on-surface">
                      Security Multi-Factor Authentication Token (6 digits)
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpToken}
                      onChange={(e) => setOtpToken(e.target.value)}
                      placeholder="e.g. 123456"
                      className="h-[38px] px-space-sm rounded-lg border border-surface-container bg-surface-container-lowest font-data-mono text-on-surface focus:border-primary outline-none"
                    />
                    <span className="font-body-sm text-xs text-outline mt-1">
                      [Integration Placeholder: In production, a cryptographically signed MFA token is verified via AWS Cognito. Enter any 6-digit numeric code to simulate authorization.]
                    </span>
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
                {wizardStep > 1 && (
                  <Button
                    variant="secondary"
                    onClick={() => setWizardStep((prev) => prev - 1)}
                  >
                    Back
                  </Button>
                )}

                {wizardStep < 4 ? (
                  <Button
                    variant="primary"
                    icon="arrow_forward"
                    onClick={() => setWizardStep((prev) => prev + 1)}
                  >
                    Proceed to Step {wizardStep + 1}
                  </Button>
                ) : (
                  <Button
                    variant="critical"
                    icon="emergency"
                    isLoading={isSubmitting}
                    disabled={confirmationInput !== `CONFIRM-RECALL-${selectedBatchId}` || otpToken.length !== 6}
                    onClick={handleSimulateBroadcast}
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
