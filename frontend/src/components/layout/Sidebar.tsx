import React from 'react';
import { NavLink } from 'react-router-dom';

interface NavItem {
  name: string;
  path: string;
  icon: string;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Overview', path: '/dashboard', icon: 'dashboard' },
  { name: 'Batch Registry', path: '/batches', icon: 'inventory_2' },
  { name: 'Batch Details', path: '/batches/BG-2024-8891-ORG', icon: 'troubleshoot' },
  { name: 'Supply Chain', path: '/supply-chain', icon: 'hub' },
  { name: 'Recall Management', path: '/recalls', icon: 'warning', badge: '2 Active' },
  { name: 'Suppliers', path: '/suppliers', icon: 'factory' },
  { name: 'Evidence Vault', path: '/evidence', icon: 'verified_user' },
  { name: 'Audit Logs', path: '/audit-logs', icon: 'history' },
  { name: 'Settings', path: '/settings', icon: 'settings' },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="fixed left-0 top-0 h-full w-[260px] bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between">
      <div className="flex flex-col flex-1 overflow-y-auto">
        {/* Brand Header */}
        <div className="p-space-md flex items-center gap-space-sm border-b border-surface-container/60">
          <div className="w-9 h-9 rounded-lg bg-primary-container flex items-center justify-center text-on-primary shadow-sm shrink-0">
            <svg className="w-5 h-5 text-secondary-container" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-headline-sm text-headline-sm text-primary font-bold leading-none">BatchGuard</span>
            <span className="font-data-mono-sm text-data-mono-sm text-outline tracking-wider uppercase mt-1">Traceability &amp; Recall</span>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex flex-col gap-space-xs px-space-sm mt-space-sm">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-space-sm py-space-sm rounded-xl transition-colors font-label-md text-label-md ${
                  isActive
                    ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`
              }
            >
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="px-space-xs py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm uppercase font-bold tracking-wider">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Operational Mesh Health & User Profile */}
      <div className="p-space-sm flex flex-col gap-space-sm bg-surface-container-low border-t border-surface-container/60">
        <div className="flex items-center justify-between px-space-xs py-space-xs bg-surface-container rounded-lg">
          <div className="flex items-center gap-space-xs">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">Mesh: 99.99% Operational</span>
          </div>
        </div>
        <div className="flex items-center gap-space-sm p-space-xs rounded-xl bg-surface-container-lowest shadow-sm">
          <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary font-semibold flex items-center justify-center shrink-0 text-xs">
            EV
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-label-md text-label-md text-on-surface truncate font-semibold">Elena Vance</span>
            <span className="font-body-sm text-body-sm text-outline truncate">Dir. Quality &amp; Traceability</span>
            <span className="font-label-sm text-label-sm text-secondary truncate font-medium">Apex Nutrition Global</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

