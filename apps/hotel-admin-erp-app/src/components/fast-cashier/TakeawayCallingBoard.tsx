import React from 'react';
import { ITakeawayCallingQueueUI, ITakeawayOrderUI } from '@spicehub/ui';

interface TakeawayCallingBoardProps {
  queue: ITakeawayCallingQueueUI;
  isOpen: boolean;
  onClose: () => void;
  onMarkPickedUp: (orderId: string) => Promise<void>;
  loading: boolean;
}

export const TakeawayCallingBoard: React.FC<TakeawayCallingBoardProps> = ({
  queue,
  isOpen,
  onClose,
  onMarkPickedUp,
  loading,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="bg-[#0b0e14] border-2 border-amber-500/40 rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.9)] animate-in fade-in zoom-in-95 duration-200">
        {/* Calling Board Top Banner */}
        <div className="bg-[#121620] border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-4 w-4 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500" />
            </span>
            <div>
              <h2 className="text-xl font-black tracking-wide text-white flex items-center gap-2">
                TAKEAWAY ORDER CALLING BOARD
              </h2>
              <p className="text-xs text-zinc-400">
                Live Kitchen Status • Guest Pickup Screen
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold">
              {queue.totalActiveTakeaways} Active Tokens
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Two Columns: Left = Preparing (Amber), Right = Ready (Emerald) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-800 overflow-y-auto">
          {/* NOW PREPARING */}
          <div className="p-6 flex flex-col gap-4 bg-amber-950/10">
            <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-amber-400 animate-pulse" />
                <h3 className="text-sm font-black uppercase tracking-wider text-amber-400">
                  Now Preparing in Kitchen
                </h3>
              </div>
              <span className="text-xs font-mono text-amber-300/80 font-bold">
                {queue.preparingQueue?.length || 0} orders
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-[55vh] pr-1">
              {!queue.preparingQueue || queue.preparingQueue.length === 0 ? (
                <div className="col-span-full py-16 text-center text-zinc-600 text-sm italic">
                  No orders currently preparing
                </div>
              ) : (
                queue.preparingQueue.map((ord: ITakeawayOrderUI) => (
                  <div
                    key={ord._id}
                    className="p-4 rounded-2xl bg-zinc-900/90 border-2 border-amber-500/30 flex flex-col items-center justify-center gap-1 shadow-md hover:border-amber-400 transition-all"
                  >
                    <span className="text-[11px] text-zinc-400 uppercase font-bold tracking-wider">
                      Token
                    </span>
                    <span className="text-3xl font-black font-mono text-amber-400">
                      #{String(ord.tokenNumber).padStart(3, '0')}
                    </span>
                    <span className="text-[10px] text-zinc-500 mt-1">
                      {ord.items?.length || 0} items
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* READY FOR PICKUP */}
          <div className="p-6 flex flex-col gap-4 bg-emerald-950/10">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-400 animate-ping" />
                <h3 className="text-sm font-black uppercase tracking-wider text-emerald-400">
                  Ready for Pickup 🔔
                </h3>
              </div>
              <span className="text-xs font-mono text-emerald-300/80 font-bold">
                {queue.readyQueue?.length || 0} orders
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-[55vh] pr-1">
              {!queue.readyQueue || queue.readyQueue.length === 0 ? (
                <div className="col-span-full py-16 text-center text-zinc-600 text-sm italic">
                  No orders waiting for pickup
                </div>
              ) : (
                queue.readyQueue.map((ord: ITakeawayOrderUI) => (
                  <div
                    key={ord._id}
                    className="p-4 rounded-2xl bg-zinc-900/90 border-2 border-emerald-500/60 flex flex-col items-center justify-center gap-2 shadow-[0_0_20px_rgba(52,211,153,0.2)] animate-pulse"
                  >
                    <span className="text-[11px] text-emerald-400 uppercase font-black tracking-wider">
                      READY TO COLLECT
                    </span>
                    <span className="text-3xl font-black font-mono text-emerald-300">
                      #{String(ord.tokenNumber).padStart(3, '0')}
                    </span>
                    <span className="text-xs text-zinc-300 font-medium truncate max-w-[120px]">
                      {ord.customerName || 'Guest'}
                    </span>
                    <button
                      type="button"
                      onClick={() => onMarkPickedUp(ord._id)}
                      disabled={loading}
                      className="w-full mt-1 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wide transition-all shadow-md active:scale-95"
                    >
                      ✓ Hand Over
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#121620] border-t border-zinc-800 px-6 py-3 flex items-center justify-between text-xs text-zinc-500">
          <span>SpiceHub Express KDS Sync Active</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs"
          >
            Close Display
          </button>
        </div>
      </div>
    </div>
  );
};
