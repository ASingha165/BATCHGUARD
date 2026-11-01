import React from 'react';
import { BatchStatus, RecallStatus } from '../../types';

interface StatusBadgeProps {
  status: BatchStatus | RecallStatus | string;
  label?: string;
  pulse?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, pulse = false }) => {
  const normalized = status.toUpperCase();
  const displayLabel = label || status.replace(/_/g, ' ');

  // Critical / Recall / Quarantine
  if (normalized === 'RECALLED' || normalized === 'INITIATED' || normalized === 'CONTAINMENT_IN_PROGRESS' || normalized === 'QUARANTINED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-error-container border border-red-200 text-on-error-container font-label-sm text-label-sm uppercase font-bold tracking-wider">
        <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping" />
        <span>{displayLabel}</span>
      </span>
    );
  }

  // Hold / Warning / Under Review
  if (normalized === 'HOLD' || normalized === 'AUDIT_PENDING' || normalized === 'PENDING') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-200 text-amber-800 font-label-sm text-label-sm uppercase font-semibold tracking-wider">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
        <span>{displayLabel}</span>
      </span>
    );
  }

  // In Transit / Active Shipment
  if (normalized === 'IN_TRANSIT' || normalized === 'TRANSIT') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-tertiary-fixed border border-sky-200 text-tertiary font-label-sm text-label-sm uppercase font-semibold tracking-wider">
        <span className={`w-1.5 h-1.5 rounded-full bg-tertiary ${pulse ? 'animate-pulse' : ''}`} />
        <span>{displayLabel}</span>
      </span>
    );
  }

  // Compliant / Released / Verified / Contained
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary-fixed border border-emerald-200 text-on-secondary-fixed-variant font-label-sm text-label-sm uppercase font-semibold tracking-wider">
      <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
      <span>{displayLabel}</span>
    </span>
  );
};

