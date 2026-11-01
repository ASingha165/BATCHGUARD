import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  badge?: {
    text: string;
    type?: 'positive' | 'negative' | 'neutral';
  };
  icon?: string;
  sparkline?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  badge,
  icon,
  sparkline = false,
}) => {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-space-lg flex flex-col justify-between shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow border border-surface-container/60">
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary-fixed/20 rounded-full blur-xl pointer-events-none" />
      <div className="flex items-center justify-between">
        <span className="font-label-md text-label-md text-outline font-medium">{title}</span>
        {icon && (
          <span className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[18px]">{icon}</span>
          </span>
        )}
        {badge && !icon && (
          <span
            className={`px-space-xs py-0.5 rounded-full font-label-sm text-label-sm flex items-center gap-0.5 font-semibold ${
              badge.type === 'positive'
                ? 'bg-emerald-50 text-emerald-700'
                : badge.type === 'negative'
                ? 'bg-rose-50 text-rose-700'
                : 'bg-surface-container text-secondary'
            }`}
          >
            {badge.text}
          </span>
        )}
      </div>

      <div className="my-space-sm flex items-baseline justify-between">
        <span className="font-display text-display text-on-surface font-bold tracking-tight tnum">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {sparkline && (
          <svg className="w-20 h-8 text-secondary overflow-visible" fill="none" viewBox="0 0 80 30">
            <path
              d="M 2 24 Q 18 20 28 14 T 48 18 T 68 8 T 78 4"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
            />
            <path
              d="M 2 24 Q 18 20 28 14 T 48 18 T 68 8 T 78 4 L 78 30 L 2 30 Z"
              fill="currentColor"
              fillOpacity="0.12"
            />
          </svg>
        )}
      </div>

      {subtitle && (
        <div className="flex items-center justify-between text-outline font-data-mono-sm text-data-mono-sm pt-1 border-t border-surface-container/50">
          <span>{subtitle}</span>
        </div>
      )}
    </div>
  );
};

