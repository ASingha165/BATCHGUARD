import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEMO_BATCHES, DEMO_SUPPLIERS } from '../../services/mockData';

interface HeaderProps {
  currentSection?: string;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentSection = 'Operations', onToggleSidebar }) => {
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Filter items for quick Cmd+K search
  const filteredBatches = searchQuery
    ? DEMO_BATCHES.filter(
        (b) =>
          b.batchId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.gtin.includes(searchQuery)
      )
    : DEMO_BATCHES.slice(0, 3);

  const filteredSuppliers = searchQuery
    ? DEMO_SUPPLIERS.filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : DEMO_SUPPLIERS.slice(0, 2);

  const handleSelectResult = (path: string) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    navigate(path);
  };

  return (
    <>
      <header className="fixed top-0 left-0 md:left-[260px] right-0 z-40 bg-surface/85 backdrop-blur-xl border-b border-surface-container/80 shadow-[0_1px_8px_rgba(0,0,0,0.02)]">
        <div className="h-16 w-full px-space-md md:px-space-lg flex items-center justify-between gap-space-md">
          {/* Left: Mobile Toggle & Breadcrumbs */}
          <div className="flex items-center gap-space-sm md:gap-space-md">
            <button
              onClick={onToggleSidebar}
              className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container md:hidden"
              type="button"
              aria-label="Toggle navigation"
            >
              <span className="material-symbols-outlined text-[22px]">menu</span>
            </button>

            <div className="flex items-center gap-space-xs font-label-md text-label-md text-on-surface-variant">
              <span className="text-outline font-medium">BatchGuard</span>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              <span className="text-on-surface font-semibold truncate max-w-[140px] sm:max-w-none">
                {currentSection}
              </span>
            </div>
          </div>

          {/* Center: Global Search Bar Trigger */}
          <div className="flex-1 max-w-xl hidden sm:block">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-full flex items-center gap-space-sm px-space-sm py-1.5 rounded-lg bg-surface-container-low border border-surface-container text-on-surface-variant hover:border-primary/50 transition-colors text-left"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px] text-outline">search</span>
              <span className="font-body-sm text-body-sm text-outline flex-1 truncate">
                Search batch ID, GTIN, supplier, or recall event...
              </span>
              <span className="font-data-mono-sm text-data-mono-sm px-space-xs py-0.5 rounded bg-surface-container-high text-on-surface-variant border border-surface-container">
                ⌘K
              </span>
            </button>
          </div>

          {/* Right: Operational Status, Notifications & Profile */}
          <div className="flex items-center gap-space-xs sm:gap-space-md">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 rounded-lg text-outline hover:text-on-surface sm:hidden"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">search</span>
            </button>

            <div className="hidden sm:flex items-center gap-space-xs px-space-sm py-1 rounded-full bg-surface-container border border-surface-container-high">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              <span className="font-data-mono-sm text-data-mono-sm text-on-surface font-semibold tracking-wider">
                US-EAST PROD
              </span>
            </div>

            {/* Notifications Popover */}
            <div className="relative">
              <button
                aria-label="Notifications"
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative p-space-xs text-on-surface-variant hover:text-on-surface transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-error text-on-error font-label-sm text-label-sm flex items-center justify-center text-[10px] font-bold">
                  3
                </span>
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 top-12 w-80 bg-surface-container-lowest rounded-xl shadow-xl border border-surface-container p-3 flex flex-col gap-2 z-50">
                  <div className="flex items-center justify-between pb-2 border-b border-surface-container">
                    <span className="font-semibold text-xs uppercase tracking-wider text-outline">Active Alerts</span>
                    <span className="text-xs text-secondary font-semibold">Mark read</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div
                      onClick={() => {
                        setIsNotificationsOpen(false);
                        navigate('/recalls');
                      }}
                      className="p-2 rounded-lg bg-error-container/30 hover:bg-error-container/50 cursor-pointer flex flex-col gap-0.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-error">Class I Recall Active</span>
                        <span className="text-[10px] text-outline">12m ago</span>
                      </div>
                      <span className="text-xs text-on-surface">Listeria detected in Lot BG-2024-8891-ORG</span>
                    </div>
                    <div
                      onClick={() => {
                        setIsNotificationsOpen(false);
                        navigate('/batches/BG-2024-8891-ORG');
                      }}
                      className="p-2 rounded-lg bg-surface-container-low hover:bg-surface-container cursor-pointer flex flex-col gap-0.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-primary">BLE Telemetry Synced</span>
                        <span className="text-[10px] text-outline">28m ago</span>
                      </div>
                      <span className="text-xs text-outline">ColdRoute Carrier #204 reported optimal 3.2°C</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-space-xs pl-space-xs">
              <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary font-semibold flex items-center justify-center text-xs">
                EV
              </div>
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant hidden sm:inline">
                expand_more
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Global Quick-Search Modal (Cmd+K) */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-xs flex items-start justify-center pt-24 px-4">
          <div className="w-full max-w-xl bg-surface-container-lowest rounded-xl shadow-2xl border border-surface-container overflow-hidden flex flex-col">
            <div className="p-3 border-b border-surface-container flex items-center gap-2">
              <span className="material-symbols-outlined text-outline text-[20px]">search</span>
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search batches, GTINs, suppliers, or recalls..."
                className="flex-1 bg-transparent border-none outline-none font-body-md text-on-surface placeholder:text-outline"
              />
              <button
                onClick={() => setIsSearchOpen(false)}
                className="text-outline hover:text-on-surface p-1"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-2 flex flex-col gap-1">
              <span className="px-2 py-1 text-[11px] font-semibold text-outline uppercase tracking-wider">
                Batches &amp; Products
              </span>
              {filteredBatches.map((b) => (
                <div
                  key={b.batchId}
                  onClick={() => handleSelectResult(`/batches/${b.batchId}`)}
                  className="px-3 py-2 rounded-lg hover:bg-surface-container cursor-pointer flex items-center justify-between"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm text-on-surface">{b.productName}</span>
                    <span className="font-data-mono-sm text-xs text-primary">{b.batchId} • GTIN: {b.gtin}</span>
                  </div>
                  <span className="text-xs text-outline font-medium">{b.status}</span>
                </div>
              ))}

              <span className="px-2 pt-2 pb-1 text-[11px] font-semibold text-outline uppercase tracking-wider">
                Suppliers
              </span>
              {filteredSuppliers.map((s) => (
                <div
                  key={s.supplierId}
                  onClick={() => handleSelectResult('/suppliers')}
                  className="px-3 py-2 rounded-lg hover:bg-surface-container cursor-pointer flex items-center justify-between"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm text-on-surface">{s.name}</span>
                    <span className="text-xs text-outline">GLN: {s.facilityCode}</span>
                  </div>
                  <span className="text-xs text-secondary font-bold">{s.auditScore}% Audit</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
