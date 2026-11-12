import React from 'react';
import { ITakeawayCallingQueueUI, ITakeawayOrderUI } from '@spicehub/ui';
import { Bell, Clock, Check, X } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
        {/* Calling Board Top Banner */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-3.5 w-3.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500" />
            </span>
            <div>
              <h2 className="text-lg font-black tracking-wide text-slate-900">
                TAKEAWAY ORDER CALLING BOARD
              </h2>
              <p className="text-xs text-slate-500">
                Live Kitchen Status • Guest Pickup Screen
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-xs font-bold">
              {queue.totalActiveTakeaways} Active Tokens
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Two Columns: Left = Preparing (Amber), Right = Ready (Emerald) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 overflow-y-auto">
          {/* NOW PREPARING */}
          <div className="p-6 flex flex-col gap-4 bg-amber-50/20">
            <div className="flex items-center justify-between pb-3 border-b border-amber-200/60">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-black uppercase tracking-wider text-amber-800">
                  Now Preparing in Kitchen
                </h3>
              </div>
              <span className="text-xs font-mono text-amber-700 font-bold">
                {queue.preparingQueue?.length || 0} orders
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-[55vh] pr-1">
              {!queue.preparingQueue || queue.preparingQueue.length === 0 ? (
                <div className="col-span-full py-16 text-center text-slate-400 text-sm italic">
                  No orders currently preparing
                </div>
              ) : (
                queue.preparingQueue.map((ord: ITakeawayOrderUI) => (
                  <div
                    key={ord._id}
                    className="p-4 rounded-2xl bg-white border border-amber-200 flex flex-col items-center justify-center gap-1 shadow-xs hover:border-amber-400 transition-all"
                  >
                    <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
                      Token
                    </span>
                    <span className="text-3xl font-black font-mono text-amber-600">
                      #{String(ord.tokenNumber).padStart(3, '0')}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1">
                      {ord.items?.length || 0} items
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* READY FOR PICKUP */}
          <div className="p-6 flex flex-col gap-4 bg-emerald-50/20">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-200/60">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-black uppercase tracking-wider text-emerald-800">
                  Ready for Pickup
                </h3>
              </div>
              <span className="text-xs font-mono text-emerald-700 font-bold">
                {queue.readyQueue?.length || 0} orders
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-[55vh] pr-1">
              {!queue.readyQueue || queue.readyQueue.length === 0 ? (
                <div className="col-span-full py-16 text-center text-slate-400 text-sm italic">
                  No orders waiting for pickup
                </div>
              ) : (
                queue.readyQueue.map((ord: ITakeawayOrderUI) => (
                  <div
                    key={ord._id}
                    className="p-4 rounded-2xl bg-white border-2 border-emerald-300 flex flex-col items-center justify-center gap-1.5 shadow-xs"
                  >
                    <span className="text-[10px] text-emerald-800 uppercase font-black tracking-wider">
                      READY TO COLLECT
                    </span>
                    <span className="text-3xl font-black font-mono text-emerald-600">
                      #{String(ord.tokenNumber).padStart(3, '0')}
                    </span>
                    <span className="text-xs text-slate-600 font-medium truncate max-w-[120px]">
                      {ord.customerName || 'Guest'}
                    </span>
                    <button
                      type="button"
                      onClick={() => onMarkPickedUp(ord._id)}
                      disabled={loading}
                      className="btn-glass-green w-full mt-1 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 shadow-2xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Hand Over</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between text-xs text-slate-500">
          <span>SpiceHub Express KDS Sync Active</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs transition"
          >
            Close Display
          </button>
        </div>
      </div>
    </div>
  );
};
