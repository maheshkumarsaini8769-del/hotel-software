import React, { useState } from 'react';
import { FolioSummaryModel } from '../../../../packages/ui/src/guest-portal/types';
import { formatCurrency } from '../../../../packages/ui/src/index';

export interface GuestFolioReviewModalProps {
  folioSummary: FolioSummaryModel | null;
  onExpressCheckout: (notes?: string) => Promise<void> | void;
}

export const GuestFolioReviewModal: React.FC<GuestFolioReviewModalProps> = ({
  folioSummary,
  onExpressCheckout,
}) => {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [checkoutResult, setCheckoutResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!folioSummary) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center text-slate-500">
        <span className="text-5xl block mb-3">🧾</span>
        <h3 className="text-base font-bold text-slate-300">Master Folio Initializing</h3>
        <p className="text-xs text-slate-500 mt-1">Your itemized folio statement will appear here shortly.</p>
      </div>
    );
  }

  const handleRequestCheckout = async () => {
    try {
      setIsSubmitting(true);
      setCheckoutResult(null);
      await onExpressCheckout();
      setCheckoutResult({
        success: true,
        message: 'Express checkout requested successfully! Front desk and housekeeping have been alerted.',
      });
    } catch (err: any) {
      setCheckoutResult({
        success: false,
        message: err.message || 'Express checkout request failed',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasOutstandingBalance = folioSummary.dueAmount > 0;

  return (
    <div className="max-w-4xl mx-auto p-5 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-extrabold text-white flex items-center space-x-2">
          <span>🧾</span>
          <span>My Live Room Folio & Statement</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Real-time itemized billing for room tariff, dining, and incidental charges.
        </p>
      </div>

      {checkoutResult && (
        <div
          className={`p-4 rounded-xl border text-xs font-bold flex items-center space-x-2 ${
            checkoutResult.success
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
          }`}
        >
          <span>{checkoutResult.success ? '✅' : '⚠️'}</span>
          <span>{checkoutResult.message}</span>
        </div>
      )}

      {/* Financial Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Room Charges</span>
          <span className="font-mono text-sm font-extrabold text-white">
            {formatCurrency(folioSummary.totalRoomTariff)}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Dining / F&B</span>
          <span className="font-mono text-sm font-extrabold text-white">
            {formatCurrency(folioSummary.totalFoodAndBeverage)}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Advance Deposit</span>
          <span className="font-mono text-sm font-extrabold text-emerald-400">
            {formatCurrency(folioSummary.advancePaid)}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Net Balance Due</span>
          <span
            className={`font-mono text-sm font-extrabold ${
              hasOutstandingBalance ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {formatCurrency(folioSummary.dueAmount)}
          </span>
        </div>
      </div>

      {/* Itemized Line Items Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-amber-300 uppercase tracking-wider font-mono">
            {folioSummary.folioNumber}
          </span>
          <span className="text-xs text-slate-400 font-semibold">
            Status: <span className="text-emerald-400 font-bold uppercase">{folioSummary.folioStatus}</span>
          </span>
        </div>

        <div className="divide-y divide-slate-800/60 max-h-72 overflow-y-auto">
          {folioSummary.lineItems.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">No incidental charges posted yet.</div>
          ) : (
            folioSummary.lineItems.map((item) => (
              <div key={item.id} className="px-5 py-3 flex items-center justify-between text-xs hover:bg-slate-850/40 transition">
                <div>
                  <div className="font-bold text-white">{item.description}</div>
                  <div className="text-[10px] text-slate-400 flex items-center space-x-2 mt-0.5">
                    <span className="uppercase font-semibold text-amber-400/80">{item.department}</span>
                    <span>•</span>
                    <span>{new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
                <span className="font-mono font-bold text-slate-100">{formatCurrency(item.netAmount)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Express Checkout Action Bar */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-sm font-extrabold text-white flex items-center space-x-1.5">
            <span>✨</span>
            <span>1-Tap Express Digital Departure</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {hasOutstandingBalance
              ? `Please settle remaining balance of ${formatCurrency(folioSummary.dueAmount)} at Front Desk prior to departure.`
              : 'Your folio is fully settled. Tap to request express digital check-out.'}
          </p>
        </div>

        <button
          onClick={handleRequestCheckout}
          disabled={hasOutstandingBalance || isSubmitting}
          className={`py-3 px-6 rounded-xl font-extrabold text-xs shadow-lg transition active:scale-95 flex items-center justify-center space-x-2 ${
            hasOutstandingBalance
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-950/40'
          }`}
        >
          <span>🔑</span>
          <span>{isSubmitting ? 'Requesting...' : 'Request Express Check-Out'}</span>
        </button>
      </div>
    </div>
  );
};
