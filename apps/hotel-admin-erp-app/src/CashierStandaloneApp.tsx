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
  const [showBanner, setShowBanner] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      return localStorage.getItem('spicehub_dismiss_cashier_embed_banner') !== 'true';
    } catch {
      return true;
    }
  });

  const handleDismissBanner = () => {
    setShowBanner(false);
    try {
      localStorage.setItem('spicehub_dismiss_cashier_embed_banner', 'true');
    } catch {}
  };

  return (
    <div className="flex h-screen min-h-screen flex-col bg-[#07090e] text-zinc-100">
      {showBanner && (
        <div
          data-testid="cashier-embed-banner"
          className="h-10 max-h-[48px] shrink-0 border-b border-emerald-500/30 bg-emerald-950/80 px-4 py-1 text-emerald-200 flex items-center justify-between gap-3 text-xs overflow-hidden"
        >
          <div className="flex items-center gap-2 min-w-0 truncate">
            <span className="text-sm shrink-0">💳</span>
            <span className="truncate">
              You are viewing the embedded cashier widget. For high-volume POS, cash drawers & shift management:
            </span>
            <a
              data-testid="cashier-standalone-link"
              href={getPortalUrl('cashier')}
              target="_blank"
              rel="noreferrer"
              className="font-bold text-emerald-400 hover:text-emerald-300 underline shrink-0 inline-flex items-center gap-1 min-h-[32px]"
            >
              <span>Launch Dedicated Terminal (:3007)</span>
              <span>↗</span>
            </a>
          </div>
          <button
            type="button"
            data-testid="cashier-banner-close-btn"
            onClick={handleDismissBanner}
            aria-label="Close cashier standalone banner"
            className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded text-emerald-400/70 hover:text-emerald-200 hover:bg-emerald-900/50 shrink-0 transition"
          >
            ✕
          </button>
        </div>
      )}
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
