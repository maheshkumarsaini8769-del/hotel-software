import React, { useState } from 'react';
import {
  IBanquetBookingUI,
  IPostBanquetExtraChargePayload, NumericInput,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl overflow-hidden text-xs text-slate-700">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">Post Extra Event Charge</h2>
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
          <div>
            <label className="block text-slate-600 font-medium mb-1">Charge Type / Item Description *</label>
            <input
              type="text"
              required
              placeholder="e.g. Additional 20 Pax Dinner / 2hr Extra Hall Overtime"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Unit Rate (₹) *</label>
              <NumericInput
                min="1"
                required
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Quantity *</label>
              <NumericInput
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">GST Tax Rate</label>
            <select
              value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white font-mono cursor-pointer"
            >
              <option value={0.18}>18% GST (Standard Hospitality & Hall)</option>
              <option value={0.05}>5% GST (Pure Food Service)</option>
              <option value={0}>0% (Exempt)</option>
            </select>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500">Subtotal: </span>
              <span className="text-slate-800 font-semibold font-mono">₹{subtotal.toLocaleString('en-IN')}</span>
              <span className="text-slate-400 ml-2">+ Tax: </span>
              <span className="text-slate-800 font-semibold font-mono">₹{taxAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 font-medium mr-1.5">Net Charge:</span>
              <span className="text-sm font-extrabold text-emerald-700 font-mono">
                ₹{netAmount.toLocaleString('en-IN')}
              </span>
            </div>
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
              disabled={loading}
              className="btn-glass-green px-6 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {loading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <span>Post to Event Master Folio</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
