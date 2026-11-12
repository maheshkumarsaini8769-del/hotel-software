import React, { useState, useEffect } from 'react';
import { Boxes, X } from 'lucide-react';
import { NumericInput } from '@spicehub/ui';

export interface INewStockBatchPayload {
  itemName: string;
  category: string;
  currentQuantity: number;
  unit: string;
  unitCost: number;
  location: string;
  mfgDate?: string;
  expiryDate: string;
}

const CATEGORY_OPTIONS = [
  'General Supplies',
  'Meat & Poultry',
  'Seafood',
  'Dairy',
  'Fresh Produce',
  'Dry Groceries',
  'Bakery',
  'Beverages',
];

const UNIT_OPTIONS = ['kg', 'g', 'l', 'ml', 'pcs', 'packs', 'cans'];

interface NewStockBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (payload: INewStockBatchPayload) => Promise<void>;
  onSave?: (payload: INewStockBatchPayload) => Promise<void>;
  loading: boolean;
}

export const NewStockBatchModal: React.FC<NewStockBatchModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onSave,
  loading,
}) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 3);

  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState<string>('Dairy');
  const [location, setLocation] = useState('Central Cold Store');
  const [currentQuantity, setCurrentQuantity] = useState<number>(10);
  const [unit, setUnit] = useState('kg');
  const [unitCost, setUnitCost] = useState<number>(320);
  const [mfgDate, setMfgDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState(tomorrow.toISOString().split('T')[0]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!itemName.trim()) {
      setError('Item name is required.');
      return;
    }
    if (currentQuantity <= 0) {
      setError('Quantity must be greater than zero.');
      return;
    }
    if (unitCost <= 0) {
      setError('Unit cost must be positive.');
      return;
    }
    if (!expiryDate) {
      setError('Expiry date is mandatory for FEFO tracking.');
      return;
    }

    const saveFn = onSave || onSubmit;
    if (!saveFn) return;

    try {
      await saveFn({
        itemName: itemName.trim(),
        category,
        location: location.trim() || 'Central Store',
        currentQuantity: Number(currentQuantity),
        unit,
        unitCost: Number(unitCost),
        mfgDate,
        expiryDate,
      });
    } catch (err: any) {
      setError(err?.message || 'Unable to create the stock batch.');
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Receive New Stock Batch
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Capture batch cost and expiry so FEFO alerts stay accurate.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            aria-label="Close new batch form"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6 text-slate-700">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-1 block text-[10px] font-bold uppercase text-slate-600">Item / Ingredient Name</span>
              <input
                value={itemName}
                onChange={(event) => setItemName(event.target.value)}
                placeholder="e.g. Fresh Paneer"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-500 focus:bg-white"
                required
              />
            </label>

            <label>
              <span className="mb-1 block text-[10px] font-bold uppercase text-slate-600">Category</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-500 focus:bg-white cursor-pointer"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1 block text-[10px] font-bold uppercase text-slate-600">Storage Location</span>
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-500 focus:bg-white"
              />
            </label>

            <label>
              <span className="mb-1 block text-[10px] font-bold uppercase text-slate-600">Quantity</span>
              <NumericInput
                min="0.001"
                step="0.001"
                value={currentQuantity}
                onChange={(event) => setCurrentQuantity(Number(event.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900 outline-none focus:border-emerald-500 focus:bg-white"
                required
              />
            </label>

            <label>
              <span className="mb-1 block text-[10px] font-bold uppercase text-slate-600">Unit</span>
              <select
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-500 focus:bg-white cursor-pointer"
              >
                {UNIT_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1 block text-[10px] font-bold uppercase text-slate-600">Unit Cost (₹)</span>
              <NumericInput
                min="0"
                step="0.01"
                value={unitCost}
                onChange={(event) => setUnitCost(Number(event.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-emerald-700 font-bold outline-none focus:border-emerald-500 focus:bg-white"
                required
              />
            </label>

            <label>
              <span className="mb-1 block text-[10px] font-bold uppercase text-slate-600">Manufactured On</span>
              <input
                type="date"
                value={mfgDate}
                onChange={(event) => setMfgDate(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-500 focus:bg-white"
              />
            </label>

            <label>
              <span className="mb-1 block text-[10px] font-bold uppercase text-slate-600">Expiry Date</span>
              <input
                type="date"
                value={expiryDate}
                onChange={(event) => setExpiryDate(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-500 focus:bg-white"
                required
              />
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-glass-green rounded-xl px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Saving…' : 'Create Batch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
