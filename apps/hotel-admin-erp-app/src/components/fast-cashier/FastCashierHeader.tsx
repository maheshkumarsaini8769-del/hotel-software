import React from 'react';
import { ITakeawayCallingQueueUI } from '@spicehub/ui';

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
    <div className="bg-[#0b0e14] border-b border-amber-500/20 px-6 py-4 text-zinc-100 shadow-lg">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Title and Badges */}
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-black text-xl shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
              <h1 className="text-xl font-bold tracking-tight text-white">
                Express Fast-Cashier POS
              </h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                Shift 23 • QSR Counter
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              10-Key Numpad & Barcode Scanner Fast Terminal • Auto Daily Token #
            </p>
          </div>
        </div>

        {/* Live Calling Queue Counters & Action Controls */}
        <div className="flex items-center flex-wrap gap-3">
          {/* Active Token Pill */}
          <div className="bg-zinc-900/90 border border-amber-500/30 rounded-lg px-3.5 py-1.5 flex items-center gap-2.5">
            <span className="text-[11px] uppercase font-bold text-zinc-400 tracking-wider">Next Token</span>
            <span className="text-lg font-black text-amber-400 tracking-wide font-mono">
              #{String(activeTokenNumber).padStart(3, '0')}
            </span>
          </div>

          {/* Kitchen Preparing Queue Badge */}
          <div className="bg-amber-950/40 border border-amber-500/40 rounded-lg px-3 py-1.5 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
            <span className="text-xs text-amber-300 font-medium">Cooking:</span>
            <span className="text-sm font-bold text-amber-300 font-mono">{preparingCount}</span>
          </div>

          {/* Ready for Pickup Queue Badge */}
          <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-lg px-3 py-1.5 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-xs text-emerald-300 font-medium">Ready:</span>
            <span className="text-sm font-bold text-emerald-300 font-mono">{readyCount}</span>
          </div>

          {/* Open TV Display Calling Board Button */}
          <button
            type="button"
            onClick={onOpenCallingBoard}
            className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-xs font-semibold border border-amber-500/30 transition-all flex items-center gap-1.5 hover:shadow-[0_0_12px_rgba(245,158,11,0.2)]"
          >
            <span>📺</span>
            <span>Calling Board</span>
          </button>

          {/* Refresh Queue Button */}
          <button
            type="button"
            onClick={onRefreshQueue}
            disabled={loading}
            className="p-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs border border-zinc-700 transition-all disabled:opacity-50"
            title="Refresh Queue"
          >
            🔄
          </button>

          {/* Clear Cart Button */}
          <button
            type="button"
            onClick={onClearCart}
            className="px-3 py-2 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 text-xs font-medium border border-red-500/30 transition-all"
          >
            Clear Cart
          </button>

          {/* Blind Shift Close Button (Shift 54) */}
          {onBlindShiftClose && (
            <button
              data-testid="blind-shift-close-btn"
              type="button"
              onClick={onBlindShiftClose}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] flex items-center gap-1.5"
            >
              <span>🔒</span>
              <span>Blind Shift Close</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
