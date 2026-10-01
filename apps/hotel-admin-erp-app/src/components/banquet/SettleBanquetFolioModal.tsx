import React, { useState } from 'react';
import { IBanquetBookingUI } from '@spicehub/ui';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#121721] border border-amber-500/30 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-xs text-zinc-300">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-[#0b0e14]">
          <div>
            <h2 className="text-base font-bold text-white">Settle Banquet Event Account</h2>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {booking.eventName} ({booking.bookingCode})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 text-lg"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-[#0b0e14] p-4 rounded-xl border border-zinc-800 text-center">
            <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
              Current Outstanding Balance
            </div>
            <div className="text-2xl font-black text-amber-400 font-mono mt-1">
              ₹{initialDue.toLocaleString('en-IN')}
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 font-medium mb-1">Settlement Amount (₹) *</label>
            <input
              type="number"
              min="1"
              max={initialDue}
              required
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-zinc-400 font-medium mb-1">Payment Method *</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-medium"
            >
              <option value="BANK_TRANSFER">RTGS / NEFT / Bank Transfer</option>
              <option value="UPI">Corporate UPI / Dynamic QR</option>
              <option value="CARD">Credit / Debit Card (Swipe)</option>
              <option value="CASH">Cash Deposit</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-xs transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || amount <= 0}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
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
