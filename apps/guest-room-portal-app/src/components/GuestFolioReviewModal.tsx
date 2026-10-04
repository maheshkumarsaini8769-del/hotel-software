import React, { useState } from 'react';
import { FolioSummaryModel, LiveRoomOrder } from '../../../../packages/ui/src/guest-portal/types';
import { GuestPortalHelper } from '../../../../packages/ui/src/guest-portal/GuestPortalHelper';
import { formatCurrency } from '../../../../packages/ui/src/index';

export interface CheckoutInvoiceData {
  invoiceNumber: string;
  settledAt?: string;
  paymentMode?: string;
  totalPaid?: number;
  roomNumber?: string;
}

export interface GuestFolioReviewModalProps {
  folioSummary: FolioSummaryModel | null;
  activeOrder?: LiveRoomOrder | null;
  isCheckoutRequested?: boolean;
  isStayCheckedOut?: boolean;
  checkoutInvoice?: CheckoutInvoiceData | null;
  onExpressCheckout: (
    notes?: string,
    paymentMethod?: string,
    rating?: number,
    comment?: string
  ) => Promise<void> | void;
}

export const GuestFolioReviewModal: React.FC<GuestFolioReviewModalProps> = ({
  folioSummary,
  activeOrder,
  isCheckoutRequested = false,
  isStayCheckedOut = false,
  checkoutInvoice,
  onExpressCheckout,
}) => {
  const [showDepartureModal, setShowDepartureModal] = useState<boolean>(false);
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [feedbackComment, setFeedbackComment] = useState<string>('Exceptional 5-star luxury experience! Impeccable in-room dining and concierge services.');
  const [departureNotes, setDepartureNotes] = useState<string>('Luggage assistance requested at reception desk.');
  const [preferredPayment, setPreferredPayment] = useState<string>('UPI');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [localRequested, setLocalRequested] = useState<boolean>(false);
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

  const handleConfirmDeparture = async () => {
    try {
      setIsSubmitting(true);
      await onExpressCheckout(
        departureNotes.trim() || undefined,
        preferredPayment,
        selectedRating,
        feedbackComment.trim() || undefined
      );
      setLocalRequested(true);
      setShowDepartureModal(false);
      setCheckoutResult({
        success: true,
        message: '1-Tap Express Departure requested! Front Desk reception has been notified.',
      });
    } catch (err: any) {
      alert(err.message || 'Failed to submit departure request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasOutstandingBalance = folioSummary.dueAmount > 0;
  const isSettled = isStayCheckedOut || folioSummary.folioStatus === 'SETTLED';
  const checkoutActive = isCheckoutRequested || localRequested;

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

      {/* Post-Departure Completed Voucher (If Checked Out) */}
      {isSettled && (
        <div data-testid="departure-settled-voucher" className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-emerald-950/80 border border-emerald-500/50 shadow-2xl text-white space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-3xl">🌟</span>
              <div>
                <h3 className="text-base font-black text-emerald-300">Stay Completed & Folio Settled</h3>
                <p className="text-xs text-slate-400">Thank you for choosing Hotel Taj Gateway. We wish you safe travels!</p>
              </div>
            </div>
            <span className="px-3.5 py-1 rounded-full text-xs font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              Tax Invoice Issued
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-emerald-500/30 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-sans">Invoice Number</span>
              <span className="font-extrabold text-amber-300">{checkoutInvoice?.invoiceNumber || 'INV-2026-102-8842'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-sans">Settled Mode</span>
              <span className="font-bold text-white">{checkoutInvoice?.paymentMode || 'UPI / Instant'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-sans">Total Paid</span>
              <span className="font-extrabold text-emerald-400">{formatCurrency(folioSummary.netAmountPayable)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-sans">Balance Due</span>
              <span className="font-black text-emerald-300">₹0 (Clear)</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <span>🔑</span>
              <span><strong>Keycard Reminder:</strong> Please leave your RF keycard on the desk or drop it into the reception drop-box.</span>
            </span>
            <button
              onClick={() => window.print()}
              className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold rounded-lg transition"
            >
              Print Tax Invoice PDF
            </button>
          </div>
        </div>
      )}

      {/* In-Flight Departure Request Notification Banner */}
      {checkoutActive && !isSettled && (
        <div data-testid="departure-requested-banner" className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/70 via-slate-900 to-purple-950/70 border border-purple-500/40 text-purple-300 text-xs font-bold flex items-center justify-between shadow-xl">
          <div className="flex items-center space-x-3">
            <span className="text-xl animate-pulse">🚀</span>
            <div>
              <div className="font-extrabold text-white">1-Tap Express Departure Initiated</div>
              <div className="text-[11px] text-purple-300 font-normal mt-0.5">
                Front desk has been alerted. Your consolidated tax invoice is ready at the reception counter.
              </div>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-purple-500/20 border border-purple-500/40 animate-pulse">
            Reception Alerted
          </span>
        </div>
      )}

      {/* Active In-Room Dining Dispatch Tracker Banner (if order active) */}
      {activeOrder && (
        <div data-testid="folio-active-order-tracker" className="bg-gradient-to-r from-amber-950/70 via-slate-900 to-amber-950/70 border border-amber-500/40 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <span className="text-sm">⏱️</span>
              <span className="text-xs font-black text-amber-300 uppercase tracking-wider">
                Live In-Room Dining Dispatch: {activeOrder.orderNumber}
              </span>
            </div>
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] px-2.5 py-0.5 rounded-full font-extrabold uppercase animate-pulse">
              {GuestPortalHelper.getOrderStatusProgress(activeOrder.orderStatus).label}
            </span>
          </div>

          {/* Stepper bar */}
          <div className="relative flex items-center justify-between px-2 pt-1 pb-1">
            <div className="absolute top-1/2 left-4 right-4 h-1 bg-slate-800 -translate-y-1/2 z-0" />
            <div
              className="absolute top-1/2 left-4 h-1 bg-gradient-to-r from-amber-500 to-amber-400 -translate-y-1/2 z-0 transition-all duration-500"
              style={{
                width: `${((GuestPortalHelper.getOrderStatusProgress(activeOrder.orderStatus).step - 1) / 3) * 92}%`,
              }}
            />
            {[
              { num: 1, label: 'Received', icon: '📝' },
              { num: 2, label: 'Preparing', icon: '👨‍🍳' },
              { num: 3, label: 'On The Way', icon: '🛎️' },
              { num: 4, label: 'Delivered', icon: '🍽️' },
            ].map((st) => {
              const currentStep = GuestPortalHelper.getOrderStatusProgress(activeOrder.orderStatus).step;
              const isPassed = currentStep >= st.num;
              const isCurrent = currentStep === st.num;
              return (
                <div key={st.num} className="relative z-10 flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition shadow ${
                      isPassed
                        ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-500/30 font-black'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}
                  >
                    <span>{st.icon}</span>
                  </div>
                  <span
                    className={`text-[9px] font-bold mt-1 text-center ${
                      isCurrent ? 'text-amber-300' : isPassed ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    {st.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
      {!isSettled && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-sm font-extrabold text-white flex items-center space-x-1.5">
              <span>✨</span>
              <span>1-Tap Express Digital Departure</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {hasOutstandingBalance
                ? `Net remaining balance of ${formatCurrency(folioSummary.dueAmount)}. Settle online or at reception.`
                : 'Your folio is fully cleared. Tap to initiate instant keycard drop & departure.'}
            </p>
          </div>

          <button
            data-testid="request-express-checkout-btn"
            id="btn-open-express-checkout"
            onClick={() => setShowDepartureModal(true)}
            disabled={isSubmitting}
            className="py-3 px-6 rounded-xl font-extrabold text-xs shadow-lg transition active:scale-95 flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-950/40"
          >
            <span>🔑</span>
            <span>{checkoutActive ? 'Update Departure Details' : 'Request Express Check-Out'}</span>
          </button>
        </div>
      )}

      {/* Departure Review Modal */}
      {showDepartureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div data-testid="departure-review-modal" className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 text-white space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Title */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">🛎️</span>
                <div>
                  <h3 className="text-base font-extrabold text-white">1-Tap Express Digital Departure</h3>
                  <p className="text-xs text-slate-400">Review folio statement & schedule room departure</p>
                </div>
              </div>
              <button
                onClick={() => setShowDepartureModal(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl transition"
              >
                ✕
              </button>
            </div>

            {/* Folio Summary Breakdown Box */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Room Tariff (Subtotal + Tax)</span>
                <span className="font-mono text-white">{formatCurrency(folioSummary.totalRoomTariff)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>In-Room Dining (F&B)</span>
                <span className="font-mono text-white">{formatCurrency(folioSummary.totalFoodAndBeverage)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Paid Services / Laundry</span>
                <span className="font-mono text-white">{formatCurrency(folioSummary.totalLaundry || 0)}</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>Advance Paid Credit</span>
                <span className="font-mono">-{formatCurrency(folioSummary.advancePaid)}</span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between font-bold text-sm text-amber-300">
                <span>Net Balance Due at Departure:</span>
                <span className="font-mono font-black">{formatCurrency(folioSummary.dueAmount)}</span>
              </div>
            </div>

            {/* Preferred Payment Method */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Preferred Departure Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {['UPI', 'CARD', 'CASH'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    data-testid={`pay-method-${mode}`}
                    onClick={() => setPreferredPayment(mode)}
                    className={`py-2.5 rounded-xl font-bold border transition flex items-center justify-center space-x-1.5 ${
                      preferredPayment === mode
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 ring-1 ring-amber-500/30'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span>{mode === 'UPI' ? '📱' : mode === 'CARD' ? '💳' : '💵'}</span>
                    <span>{mode}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 5-Star Stay Rating */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Rate Your 5-Star Stay Experience
              </label>
              <div className="flex items-center space-x-2 py-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    data-testid={`star-rating-${star}`}
                    onClick={() => setSelectedRating(star)}
                    className="text-2xl transition hover:scale-125 focus:outline-none"
                  >
                    {star <= selectedRating ? '⭐' : '☆'}
                  </button>
                ))}
                <span className="text-xs text-amber-400 font-bold ml-2">
                  {selectedRating === 5 ? '5/5 Outstanding' : `${selectedRating}/5`}
                </span>
              </div>
            </div>

            {/* Feedback / Special Instructions */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Departure Notes / Feedback
              </label>
              <input
                type="text"
                data-testid="departure-notes-input"
                value={departureNotes}
                onChange={(e) => setDepartureNotes(e.target.value)}
                placeholder="e.g. Flight at 2:00 PM; luggage assistance requested"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:ring-1 focus:ring-amber-400 outline-none"
              />
            </div>

            {/* Buttons */}
            <div className="pt-2 flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setShowDepartureModal(false)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="btn-confirm-departure-request"
                id="confirm-departure-btn"
                onClick={handleConfirmDeparture}
                disabled={isSubmitting}
                className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-amber-950/40 transition active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? 'Notifying Desk...' : 'Confirm Express Departure'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
