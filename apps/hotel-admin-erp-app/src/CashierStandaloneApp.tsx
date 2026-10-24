import React from 'react';
import { ArrowUpRight, Crown, Monitor, ReceiptText, ShieldCheck } from 'lucide-react';
import { FastCashierPosApp } from './components/fast-cashier/FastCashierPosApp';
import { getPortalUrl } from './config/portalUrls';
import { getStoredHotelId, getStoredToken } from './config/api';

export interface CashierStandaloneAppProps {
  onNavigatePortal?: (portal: 'admin' | 'cashier' | 'reception') => void;
}

/**
 * Embedded cashier surface for the Hotel Admin application.
 *
 * The real Express Cashier terminal is FastCashierPosApp: it reads the live
 * menu, writes orders/bills/payments to the backend, and performs blind shift
 * closing. The previous standalone screen kept its catalogue, open bills and
 * payment history in module-level demo arrays, so it was never safe to use in
 * production.
 */
export const CashierStandaloneApp: React.FC<CashierStandaloneAppProps> = ({
  onNavigatePortal,
}) => {
  const token = getStoredToken();
  const hotelId = getStoredHotelId();

  return (
    <div className="flex h-screen min-h-screen flex-col bg-[#07090e] text-zinc-100">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-[#0b0f17] px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-slate-950">
            <ReceiptText className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-white">
              Express Cashier POS
            </div>
            <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
              <ShieldCheck className="h-3 w-3" />
              <span>Live menu · backend bills · shift close</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={getPortalUrl('cashier')}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-[11px] font-bold text-slate-200 transition hover:bg-slate-700"
          >
            <Monitor className="h-3.5 w-3.5" />
            Full Cashier App
            <ArrowUpRight className="h-3 w-3" />
          </a>
          <button
            onClick={() => {
              if (onNavigatePortal) onNavigatePortal('reception');
              else window.location.href = '/reception';
            }}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-[11px] font-bold text-slate-200 transition hover:bg-slate-700"
          >
            Front Desk
          </button>
          <button
            onClick={() => {
              if (onNavigatePortal) onNavigatePortal('admin');
              else window.location.href = '/';
            }}
            className="flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-[11px] font-bold text-amber-300 transition hover:bg-amber-500/20"
          >
            <Crown className="h-3.5 w-3.5" />
            Hotel Admin
          </button>
        </div>
      </header>

      {(token || hotelId) && (
        <div className="sr-only">
          Tenant context loaded for cashier terminal {hotelId || 'from signed token'}
        </div>
      )}

      <main className="min-h-0 flex-1 overflow-auto">
        <FastCashierPosApp token={token} />
      </main>
    </div>
  );
};
