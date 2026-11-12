import React, { useState } from 'react';
import { X } from 'lucide-react';

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
      className="relative z-40 box-border w-full border-b border-slate-800 bg-slate-950 px-3 py-1.5 text-slate-200 sm:px-4"
    >
      <div className="mx-auto flex w-full max-w-md md:max-w-3xl items-center justify-between gap-2 overflow-x-hidden">
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
          <div className="flex items-center gap-x-2 min-w-0 flex-1 overflow-hidden">
            <span className="shrink-0 text-xs font-semibold text-slate-200">
              {isCustomer ? 'Dine-In' : 'In-Room'}
              {currentLocationName ? ` · ${currentLocationName}` : ''}
            </span>
            <span className="hidden sm:inline text-slate-600">|</span>
            <a
              data-testid="switcher-action-link"
              href={destinationUrl}
              className="inline-flex min-h-[44px] min-w-0 flex-1 items-center truncate text-xs font-semibold text-emerald-300 transition hover:text-emerald-200 hover:underline"
            >
              <span className="hidden sm:inline">{actionText}</span>
              <span className="sm:hidden truncate">
                {isCustomer ? 'Room Service →' : 'Table Menu →'}
              </span>
            </a>
          </div>
        </div>

        <button
          type="button"
          data-testid="switcher-dismiss-btn"
          onClick={handleDismiss}
          aria-label="Dismiss switcher banner"
          className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
