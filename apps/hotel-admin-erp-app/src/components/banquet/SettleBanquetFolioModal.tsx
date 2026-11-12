import React, { useState } from 'react';
import { IBanquetBookingUI, NumericInput } from '@spicehub/ui';

interface SettleBanquetFolioModalProps {
  booking: IBanquetBookingUI;
  initialDue: number;
  onClose: () => void;
  onSubmit: (amount: number, paymentMethod: string) => Promise<void>;
  loading: boolean;
}

export const SettleBanquetFolioModal: React.FC<SettleBanquetFolioModalProps> = ({
  booking,
  initialDue,
  onClose,
  onSubmit,
  loading,
}) => {
  const [amount, setAmount] = useState<number>(initialDue);
  const [paymentMethod, setPaymentMethod] = useState<string>('BANK_TRANSFER');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }
    await onSubmit(amount, paymentMethod);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl overflow-hidden text-xs text-slate-700">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">Settle Banquet Event Account</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {booking.eventName} ({booking.bookingCode})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              Current Outstanding Balance
            </div>
            <div className="text-2xl font-extrabold text-emerald-700 font-mono mt-1">
              ₹{initialDue.toLocaleString('en-IN')}
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Settlement Amount (₹) *</label>
            <NumericInput
              min="1"
              max={initialDue}
              required
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-sm focus:outline-none focus:border-emerald-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Payment Method *</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white font-medium cursor-pointer"
            >
              <option value="BANK_TRANSFER">RTGS / NEFT / Bank Transfer</option>
              <option value="UPI">Corporate UPI / Dynamic QR</option>
              <option value="CARD">Credit / Debit Card (Swipe)</option>
              <option value="CASH">Cash Deposit</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-medium text-xs transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || amount <= 0}
              className="btn-glass-green px-6 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {loading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <span>Confirm Payment ₹{amount.toLocaleString('en-IN')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
