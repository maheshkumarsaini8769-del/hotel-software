import React, { useState } from 'react';

export interface CustomerPortalSwitcherBarProps {
  currentApp: 'customer' | 'guest';
  currentLocationName?: string;
  destinationUrl: string;
  destinationLabel?: string;
  onDismiss?: () => void;
}

const STORAGE_KEY = 'switcher_dismissed_at';
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export const CustomerPortalSwitcherBar: React.FC<CustomerPortalSwitcherBarProps> = ({
  currentApp,
  currentLocationName,
  destinationUrl,
  destinationLabel,
  onDismiss,
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const timestamp = parseInt(saved, 10);
        if (!isNaN(timestamp) && Date.now() - timestamp < TWENTY_FOUR_HOURS_MS) {
          return false;
        }
      }
    } catch {
      // Ignore storage read errors
    }
    return true;
  });

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    } catch {
      // Ignore storage write errors
    }
    if (onDismiss) onDismiss();
  };

  if (!isVisible) return null;

  const isCustomer = currentApp === 'customer';
  const defaultActionText = isCustomer
    ? 'Staying in a room? Switch to Room Service →'
    : 'Dining at our restaurant? Switch to Table Menu →';
  const actionText = destinationLabel || defaultActionText;

  return (
    <aside
      data-testid="customer-switcher-bar"
      aria-label="Portal Mode Switcher"
      className="w-full max-w-full box-border border-b border-slate-800 bg-slate-950/95 backdrop-blur-md text-slate-200 px-3 py-1.5 sm:px-4 z-40 relative flex items-center justify-between gap-2 overflow-x-hidden"
    >
      <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
        <span className="text-sm shrink-0">{isCustomer ? '🍽️' : '🛎️'}</span>
        <div className="flex items-center gap-x-2 min-w-0 flex-1 overflow-hidden">
          <span className="text-xs font-semibold text-slate-300 shrink-0">
            {isCustomer ? 'Dine-In' : 'In-Room'}
            {currentLocationName ? ` · ${currentLocationName}` : ''}
          </span>
          <span className="hidden sm:inline text-slate-600">|</span>
          <a
            data-testid="switcher-action-link"
            href={destinationUrl}
            className="min-h-[44px] inline-flex items-center text-xs font-bold text-amber-400 hover:text-amber-300 hover:underline transition truncate min-w-0 flex-1"
          >
            {actionText}
          </a>
        </div>
      </div>

      <button
        type="button"
        data-testid="switcher-dismiss-btn"
        onClick={handleDismiss}
        aria-label="Dismiss switcher banner"
        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition shrink-0"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="2.5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </aside>
  );
};
