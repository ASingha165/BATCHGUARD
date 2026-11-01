import React from 'react';

interface HeaderProps {
  currentSection?: string;
}

export const Header: React.FC<HeaderProps> = ({ currentSection = 'Operations' }) => {
  return (
    <header className="fixed top-0 left-[260px] right-0 z-40 bg-surface/85 backdrop-blur-xl border-b border-surface-container/80 shadow-[0_1px_8px_rgba(0,0,0,0.02)]">
      <div className="h-16 w-full px-space-lg flex items-center justify-between gap-space-md">
        {/* Left: Breadcrumbs */}
        <div className="flex items-center gap-space-md">
          <div className="flex items-center gap-space-xs font-label-md text-label-md text-on-surface-variant">
            <span className="text-outline font-medium">BatchGuard</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="text-on-surface font-semibold">{currentSection}</span>
          </div>
        </div>

        {/* Center: Global Quick-Search Bar */}
        <div className="flex-1 max-w-xl hidden md:block">
          <div className="flex items-center gap-space-sm px-space-sm py-1.5 rounded-lg bg-surface-container-low border border-surface-container text-on-surface-variant focus-within:border-primary transition-colors">
            <span className="material-symbols-outlined text-[18px] text-outline">search</span>
            <input
              type="text"
              placeholder="Search batch ID, GTIN, supplier, or recall event..."
              className="bg-transparent border-none outline-none font-body-sm text-body-sm text-on-surface flex-1 placeholder:text-outline"
            />
            <span className="font-data-mono-sm text-data-mono-sm px-space-xs py-0.5 rounded bg-surface-container-high text-on-surface-variant border border-surface-container">
              ⌘K
            </span>
          </div>
        </div>

        {/* Right: Operational Environment Badge & Actions */}
        <div className="flex items-center gap-space-md">
          <div className="flex items-center gap-space-xs px-space-sm py-1 rounded-full bg-surface-container border border-surface-container-high">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            <span className="font-data-mono-sm text-data-mono-sm text-on-surface font-semibold tracking-wider">US-EAST PROD</span>
          </div>

          <button
            aria-label="Notifications"
            className="relative p-space-xs text-on-surface-variant hover:text-on-surface transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-error text-on-error font-label-sm text-label-sm flex items-center justify-center text-[10px] font-bold">
              3
            </span>
          </button>

          <button
            aria-label="Help Documentation"
            className="p-space-xs text-on-surface-variant hover:text-on-surface transition-colors hidden sm:block"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">help</span>
          </button>

          <div className="flex items-center gap-space-xs pl-space-xs cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary font-semibold flex items-center justify-center text-xs">
              EV
            </div>
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">expand_more</span>
          </div>
        </div>
      </div>
    </header>
  );
};

