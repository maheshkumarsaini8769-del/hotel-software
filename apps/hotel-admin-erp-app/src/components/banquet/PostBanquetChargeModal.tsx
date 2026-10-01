import React, { useState } from 'react';
import {
  IBanquetBookingUI,
  IPostBanquetExtraChargePayload,
} from '@spicehub/ui';

interface PostBanquetChargeModalProps {
  booking: IBanquetBookingUI;
  onClose: () => void;
  onSubmit: (payload: IPostBanquetExtraChargePayload) => Promise<void>;
  loading: boolean;
}

export const PostBanquetChargeModal: React.FC<PostBanquetChargeModalProps> = ({
  booking,
  onClose,
  onSubmit,
  loading,
}) => {
  const [description, setDescription] = useState('');
  const [rate, setRate] = useState<number>(booking.perPlateRate || 1200);
  const [quantity, setQuantity] = useState<number>(20); // e.g. 20 extra pax
  const [taxRate, setTaxRate] = useState<number>(0.18);
  const [department, setDepartment] = useState('PAID_AMENITY');

  const subtotal = rate * quantity;
  const taxAmount = Math.round(subtotal * taxRate);
  const netAmount = subtotal + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || rate <= 0 || quantity <= 0) {
      alert('Please fill description, rate, and quantity.');
      return;
    }

    await onSubmit({
      department,
      description,
      rate: Number(rate),
      quantity: Number(quantity),
      taxRate: Number(taxRate),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#121721] border border-amber-500/30 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-xs text-zinc-300">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-[#0b0e14]">
          <div>
            <h2 className="text-base font-bold text-white">Post Extra Event Charge</h2>
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
          <div>
            <label className="block text-zinc-400 font-medium mb-1">Charge Type / Item Description *</label>
            <input
              type="text"
              required
              placeholder="e.g. Additional 20 Pax Dinner / 2hr Extra Hall Overtime"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 font-medium mb-1">Unit Rate (₹) *</label>
              <input
                type="number"
                min="1"
                required
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-zinc-400 font-medium mb-1">Quantity *</label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 font-medium mb-1">GST Tax Rate</label>
            <select
              value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value))}
              className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
            >
              <option value={0.18}>18% GST (Standard Hospitality & Hall)</option>
              <option value={0.05}>5% GST (Pure Food Service)</option>
              <option value={0}>0% (Exempt)</option>
            </select>
          </div>

          <div className="bg-[#0b0e14] p-3 rounded-xl border border-zinc-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-zinc-500">Subtotal: </span>
              <span className="text-zinc-300 font-mono">₹{subtotal.toLocaleString('en-IN')}</span>
              <span className="text-zinc-500 ml-2">+ Tax: </span>
              <span className="text-zinc-300 font-mono">₹{taxAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="text-right">
              <span className="text-zinc-400 font-medium mr-1.5">Net Charge:</span>
              <span className="text-sm font-black text-amber-400 font-mono">
                ₹{netAmount.toLocaleString('en-IN')}
              </span>
            </div>
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
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <span className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />}
              <span>Post to Event Master Folio</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
