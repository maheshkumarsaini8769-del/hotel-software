import React from 'react';
import { ITakeawayCallingQueueUI } from '@spicehub/ui';
import { Receipt, Tv, RefreshCw, Trash2, Lock } from 'lucide-react';

interface FastCashierHeaderProps {
  callingQueue: ITakeawayCallingQueueUI;
  activeTokenNumber: number;
  onOpenCallingBoard: () => void;
  onClearCart: () => void;
  onRefreshQueue: () => void;
  onBlindShiftClose?: () => void;
  loading: boolean;
}

export const FastCashierHeader: React.FC<FastCashierHeaderProps> = ({
  callingQueue,
  activeTokenNumber,
  onOpenCallingBoard,
  onClearCart,
  onRefreshQueue,
  onBlindShiftClose,
  loading,
}) => {
  const preparingCount = callingQueue.preparingQueue?.length || 0;
  const readyCount = callingQueue.readyQueue?.length || 0;

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-4 text-slate-900 shadow-xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Title and Badges */}
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-xs">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Express Fast-Cashier POS
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Shift 23 • QSR Counter
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              10-Key Numpad & Barcode Scanner Fast Terminal • Auto Daily Token #
            </p>
          </div>
        </div>

        {/* Live Calling Queue Counters & Action Controls */}
        <div className="flex items-center flex-wrap gap-3">
          {/* Active Token Pill */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 flex items-center gap-2.5">
            <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Next Token</span>
            <span className="text-lg font-black text-emerald-700 tracking-wide font-mono">
              #{String(activeTokenNumber).padStart(3, '0')}
            </span>
          </div>

          {/* Kitchen Preparing Queue Badge */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
            <span className="text-xs text-amber-800 font-medium">Cooking:</span>
            <span className="text-sm font-bold text-amber-900 font-mono">{preparingCount}</span>
          </div>

          {/* Ready for Pickup Queue Badge */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-emerald-800 font-medium">Ready:</span>
            <span className="text-sm font-bold text-emerald-900 font-mono">{readyCount}</span>
          </div>

          {/* Open TV Display Calling Board Button */}
          <button
            type="button"
            onClick={onOpenCallingBoard}
            className="btn-glass-green-subtle"
          >
            <Tv className="w-3.5 h-3.5 text-emerald-700" />
            <span>Calling Board</span>
          </button>

          {/* Refresh Queue Button */}
          <button
            type="button"
            onClick={onRefreshQueue}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs border border-slate-200 transition-all disabled:opacity-50"
            title="Refresh Queue"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>

          {/* Clear Cart Button */}
          <button
            type="button"
            onClick={onClearCart}
            className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium border border-rose-200 transition-all flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Cart</span>
          </button>

          {/* Blind Shift Close Button */}
          {onBlindShiftClose && (
            <button
              data-testid="blind-shift-close-btn"
              type="button"
              onClick={onBlindShiftClose}
              className="btn-glass-green"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Blind Shift Close</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
