import React, { useState } from 'react';
import {
  WaiterCashFloatDto,
  WaiterFloatStatus,
  WaiterCashFloatHelper,
} from '@spicehub/ui';

interface WaiterCashFloatCardProps {
  float: WaiterCashFloatDto;
  onRequestDrop: (actualCash: number, reason?: string) => Promise<void>;
  isLoading?: boolean;
}

export const WaiterCashFloatCard: React.FC<WaiterCashFloatCardProps> = ({
  float,
  onRequestDrop,
  isLoading = false,
}) => {
  const [isDropModalOpen, setIsDropModalOpen] = useState(false);
  const [actualCashInput, setActualCashInput] = useState<string>(
    float.expectedCashInHand ? String(float.expectedCashInHand) : ''
  );
  const [varianceReason, setVarianceReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const badge = WaiterCashFloatHelper.getStatusBadge(float.status);
  const parsedActual = Number(actualCashInput) || 0;
  const variance = parsedActual - float.expectedCashInHand;
  const varianceInfo = WaiterCashFloatHelper.formatVariance(variance);

  const handleSubmitDrop = async () => {
    if (parsedActual < 0) return;
    setIsSubmitting(true);
    try {
      await onRequestDrop(parsedActual, varianceReason);
      setIsDropModalOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full rounded-2xl bg-zinc-900 border border-zinc-800 p-5 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-xl">💼</span>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Pocket Cash Float
            </h3>
            <p className="text-xs text-zinc-400">Shift Running Balance</p>
          </div>
        </div>
        <span
          className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${badge.bg} ${badge.text} ${badge.border} flex items-center gap-1.5`}
        >
          <span>{badge.icon}</span>
          <span>{badge.label}</span>
        </span>
      </div>

      {/* Running Cash in Hand Display */}
      <div className="my-4 text-center">
        <p className="text-xs uppercase tracking-wider text-zinc-400 font-medium">
          Current Cash in Hand
        </p>
        <div className="text-3xl font-extrabold text-emerald-400 mt-1 tracking-tight">
          ₹{float.expectedCashInHand.toFixed(2)}
        </div>
        <p className="text-[11px] text-zinc-500 mt-0.5">
          Expected physical cash in your pouch
        </p>
      </div>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-3 gap-2 bg-zinc-950/60 rounded-xl p-3 border border-zinc-800/80 text-center">
        <div>
          <p className="text-[10px] text-zinc-500 uppercase font-semibold">Opening</p>
          <p className="text-xs font-bold text-zinc-300 mt-0.5">
            ₹{float.openingFloat.toFixed(0)}
          </p>
        </div>
        <div className="border-x border-zinc-800">
          <p className="text-[10px] text-zinc-500 uppercase font-semibold">Collected</p>
          <p className="text-xs font-bold text-emerald-400 mt-0.5">
            +₹{float.totalCashCollected.toFixed(0)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-zinc-500 uppercase font-semibold">Change Given</p>
          <p className="text-xs font-bold text-rose-400 mt-0.5">
            -₹{float.totalChangeGiven.toFixed(0)}
          </p>
        </div>
      </div>

      {/* Action Button: Min 48px Touch Target */}
      <div className="mt-4">
        {float.status === WaiterFloatStatus.OPEN ? (
          <button
            disabled={isLoading}
            onClick={() => setIsDropModalOpen(true)}
            className="w-full h-12 min-h-[48px] rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm transition-colors shadow-lg shadow-amber-950/40 flex items-center justify-center gap-2"
          >
            <span>📥</span>
            <span>Handover Cash to Cashier (End Shift)</span>
          </button>
        ) : float.status === WaiterFloatStatus.DROPPED_PENDING_APPROVAL ? (
          <div className="w-full p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center text-xs text-amber-300">
            ⏳ ₹{float.actualCashHandedOver?.toFixed(2)} handed over. Awaiting cashier count approval.
          </div>
        ) : (
          <div className="w-full p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-center text-xs text-sky-300">
            ✅ Shift Settled! Receipt: {float.receiptNumber || 'N/A'}
          </div>
        )}
      </div>

      {/* Cash Drop Modal */}
      {isDropModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl">
            <h4 className="text-base font-bold text-white mb-1">
              Cash Handover Drop
            </h4>
            <p className="text-xs text-zinc-400 mb-4">
              Count the physical cash in your pouch and enter the exact total.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-300 font-medium">
                  Expected Cash Balance
                </label>
                <div className="text-xl font-bold text-white mt-0.5">
                  ₹{float.expectedCashInHand.toFixed(2)}
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-300 font-medium">
                  Actual Physical Cash Count (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={actualCashInput}
                  onChange={(e) => setActualCashInput(e.target.value)}
                  className="w-full h-12 min-h-[48px] mt-1 rounded-xl bg-zinc-950 border border-zinc-700 px-4 text-white text-lg font-bold focus:border-amber-500 focus:outline-none"
                  placeholder="0.00"
                />
              </div>

              {/* Variance Indicator */}
              <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs">
                <span className="text-zinc-400">Variance:</span>
                <span className={`font-bold ${varianceInfo.color}`}>
                  {varianceInfo.text}
                </span>
              </div>

              {variance !== 0 && (
                <div>
                  <label className="text-xs text-zinc-300 font-medium">
                    Reason for Shortage / Surplus
                  </label>
                  <input
                    type="text"
                    value={varianceReason}
                    onChange={(e) => setVarianceReason(e.target.value)}
                    className="w-full h-10 min-h-[40px] mt-1 rounded-lg bg-zinc-950 border border-zinc-700 px-3 text-white text-xs focus:border-amber-500 focus:outline-none"
                    placeholder="e.g. ₹10 coin shortage or tip surplus"
                  />
                </div>
              )}
            </div>

            {/* Modal Buttons: Min 48px touch targets */}
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={() => setIsDropModalOpen(false)}
                className="flex-1 h-12 min-h-[48px] rounded-xl bg-zinc-800 text-zinc-300 font-semibold text-sm hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting || parsedActual < 0}
                onClick={handleSubmitDrop}
                className="flex-1 h-12 min-h-[48px] rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Confirm Drop'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
