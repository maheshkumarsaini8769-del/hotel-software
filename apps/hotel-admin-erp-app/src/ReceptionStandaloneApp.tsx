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

  return (
    <div className="flex h-screen min-h-screen flex-col bg-[#07090e] text-zinc-100">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-[#0b0f17] px-4 py-2.5">
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
