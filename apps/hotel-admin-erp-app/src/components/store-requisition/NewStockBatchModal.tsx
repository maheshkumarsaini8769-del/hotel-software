import React, { useEffect, useState } from 'react';

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

interface NewStockBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: INewStockBatchPayload) => Promise<void>;
  loading: boolean;
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

const UNIT_OPTIONS = ['kg', 'g', 'l', 'ml', 'pcs', 'box', 'dozen'];

export const NewStockBatchModal: React.FC<NewStockBatchModalProps> = ({
  isOpen,
  onClose,
  onSave,
  loading,
}) => {
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [currentQuantity, setCurrentQuantity] = useState(1);
  const [unit, setUnit] = useState('kg');
  const [unitCost, setUnitCost] = useState(0);
  const [location, setLocation] = useState('Central Cold Room');
  const [mfgDate, setMfgDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setItemName('');
    setCategory(CATEGORY_OPTIONS[0]);
    setCurrentQuantity(1);
    setUnit('kg');
    setUnitCost(0);
    setLocation('Central Cold Room');
    setMfgDate('');
    setExpiryDate('');
    setError(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!itemName.trim()) {
      setError('Ingredient / item name is required.');
      return;
    }
    if (!expiryDate) {
      setError('Expiry date is mandatory for FEFO tracking.');
      return;
    }
    if (mfgDate && new Date(expiryDate) <= new Date(mfgDate)) {
      setError('Expiry date must be after the manufacturing date.');
      return;
    }
    if (currentQuantity <= 0 || unitCost < 0) {
      setError('Quantity must be positive and unit cost cannot be negative.');
      return;
    }

    try {
      await onSave({
        itemName: itemName.trim(),
        category,
        currentQuantity: Number(currentQuantity),
        unit,
        unitCost: Number(unitCost),
        location: location.trim() || 'Central Cold Room',
        mfgDate: mfgDate || undefined,
        expiryDate,
      });
    } catch (err: any) {
      setError(err?.message || 'Unable to create the stock batch.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-blue-500/30 bg-[#0f131a] text-zinc-100 shadow-2xl">
        <div className="flex items-start justify-between border-b border-zinc-800 bg-[#121620] px-6 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-black text-white">
              <span>📦</span> Receive New Stock Batch
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              Capture batch cost and expiry so FEFO alerts stay accurate.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-zinc-800 p-1.5 text-zinc-400 hover:text-white"
            aria-label="Close new batch form"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-950/60 px-3 py-2 text-xs font-semibold text-rose-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-1 block text-[10px] font-bold uppercase text-zinc-400">Item / Ingredient Name</span>
              <input
                value={itemName}
                onChange={(event) => setItemName(event.target.value)}
                placeholder="e.g. Fresh Paneer"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                required
              />
            </label>

            <label>
              <span className="mb-1 block text-[10px] font-bold uppercase text-zinc-400">Category</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1 block text-[10px] font-bold uppercase text-zinc-400">Storage Location</span>
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
              />
            </label>

            <label>
              <span className="mb-1 block text-[10px] font-bold uppercase text-zinc-400">Quantity</span>
              <input
                type="number"
                min="0.001"
                step="0.001"
                value={currentQuantity}
                onChange={(event) => setCurrentQuantity(Number(event.target.value))}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-white outline-none focus:border-blue-500"
                required
              />
            </label>

            <label>
              <span className="mb-1 block text-[10px] font-bold uppercase text-zinc-400">Unit</span>
              <select
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
              >
                {UNIT_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1 block text-[10px] font-bold uppercase text-zinc-400">Unit Cost (₹)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={unitCost}
                onChange={(event) => setUnitCost(Number(event.target.value))}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-amber-300 outline-none focus:border-blue-500"
                required
              />
            </label>

            <label>
              <span className="mb-1 block text-[10px] font-bold uppercase text-zinc-400">Manufactured On</span>
              <input
                type="date"
                value={mfgDate}
                onChange={(event) => setMfgDate(event.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
              />
            </label>

            <label>
              <span className="mb-1 block text-[10px] font-bold uppercase text-zinc-400">Expiry Date</span>
              <input
                type="date"
                value={expiryDate}
                onChange={(event) => setExpiryDate(event.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                required
              />
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl bg-zinc-800 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-black uppercase tracking-wide text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Create Batch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
