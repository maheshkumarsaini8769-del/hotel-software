import React from 'react';
import { ArrowUpRight, BedDouble, Monitor, ReceiptText, ShieldCheck } from 'lucide-react';
import { FrontDeskCheckInApp } from './components/front-desk/FrontDeskCheckInApp';
import { getPortalUrl } from './config/portalUrls';
import { getStoredHotelId, getStoredToken } from './config/api';

export interface ReceptionStandaloneAppProps {
  onNavigatePortal?: (portal: 'admin' | 'cashier' | 'reception') => void;
}

/**
 * Embedded front-desk surface for the Hotel Admin application.
 *
 * FrontDeskCheckInApp already owns the live PMS flows (arrivals, in-house,
 * check-in/out, cashier handover, luggage, parcels, maintenance, etc). The old
 * standalone room grid rendered a hard-coded ROOMS_DATA_BY_FLOOR mock and
 * could show rooms/guests that did not exist in the PMS, so it has been
 * replaced with the authoritative front-desk application.
 */
export const ReceptionStandaloneApp: React.FC<ReceptionStandaloneAppProps> = ({
  onNavigatePortal,
}) => {
  const token = getStoredToken();
  const hotelId = getStoredHotelId();
  const [showBanner, setShowBanner] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      return localStorage.getItem('spicehub_dismiss_reception_embed_banner') !== 'true';
    } catch {
      return true;
    }
  });

  const handleDismissBanner = () => {
    setShowBanner(false);
    try {
      localStorage.setItem('spicehub_dismiss_reception_embed_banner', 'true');
    } catch {}
  };

  return (
    <div className="flex h-screen min-h-screen flex-col bg-slate-950 text-zinc-100">
      {showBanner && (
        <div
          data-testid="reception-embed-banner"
          className="h-10 max-h-[48px] shrink-0 border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 px-4 py-1 text-slate-700 dark:text-slate-300 flex items-center justify-between gap-3 text-xs overflow-hidden"
        >
          <div className="flex items-center gap-2 min-w-0 truncate">
            <span className="text-sm shrink-0">🏨</span>
            <span className="truncate">
              You are viewing the embedded reception widget. For complete PMS Reservation Matrix, Room Allocation & Lost & Found:
            </span>
            <a
              data-testid="reception-standalone-link"
              href={getPortalUrl('reception')}
              target="_blank"
              rel="noreferrer"
              className="font-bold text-slate-700 dark:text-slate-300 hover:text-slate-700 dark:text-slate-300 underline shrink-0 inline-flex items-center gap-1 min-h-[32px]"
            >
              <span>Launch Dedicated Terminal (:3008)</span>
              <span>↗</span>
            </a>
          </div>
          <button
            type="button"
            data-testid="reception-banner-close-btn"
            onClick={handleDismissBanner}
            aria-label="Close reception standalone banner"
            className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded text-slate-700 dark:text-slate-300/70 hover:text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800 shrink-0 transition"
          >
            ✕
          </button>
        </div>
      )}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 text-white">
            <BedDouble className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-white">
              Front Desk & Reception PMS
            </div>
            <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
              <ShieldCheck className="h-3 w-3" />
              <span>Live arrivals · in-house folios · room status</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={getPortalUrl('reception')}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-[11px] font-bold text-slate-200 transition hover:bg-slate-700"
          >
            <Monitor className="h-3.5 w-3.5" />
            Full Reception App
            <ArrowUpRight className="h-3 w-3" />
          </a>
          <button
            onClick={() => {
              if (onNavigatePortal) onNavigatePortal('cashier');
              else window.location.href = '/cashier';
            }}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold text-emerald-300 transition hover:bg-emerald-500/20"
          >
            <ReceiptText className="h-3.5 w-3.5" />
            Cashier POS
          </button>
          <button
            onClick={() => {
              if (onNavigatePortal) onNavigatePortal('admin');
              else window.location.href = '/';
            }}
            className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-[11px] font-bold text-amber-300 transition hover:bg-amber-500/20"
          >
            Hotel Admin
          </button>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-auto">
        <FrontDeskCheckInApp authToken={token} hotelId={hotelId} />
      </main>
    </div>
  );
};
