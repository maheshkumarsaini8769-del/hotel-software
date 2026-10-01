import React, { useState } from 'react';
import { ILogWastePayload, WasteTypeUI, KitchenShiftUI, RecipeCostingHelper } from '@spicehub/ui';

interface FoodWasteLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: ILogWastePayload) => Promise<void>;
  loading: boolean;
}

export const FoodWasteLogModal: React.FC<FoodWasteLogModalProps> = ({
  isOpen,
  onClose,
  onSave,
  loading,
}) => {
  const [wasteType, setWasteType] = useState<WasteTypeUI>('SPOILED');
  const [shift, setShift] = useState<KitchenShiftUI>('DINNER');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('kg');
  const [unitCost, setUnitCost] = useState(100);
  const [reason, setReason] = useState('');
  const [preventiveAction, setPreventiveAction] = useState('');
  const [disposalMethod, setDisposalMethod] = useState('TRASH');

  if (!isOpen) return null;

  const totalLoss = Math.round(Number(quantity) * Number(unitCost) * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName || !reason) return;

    await onSave({
      wasteType,
      shift,
      itemName,
      quantity: Number(quantity),
      unit,
      unitCost: Number(unitCost),
      reason,
      preventiveAction,
      disposalMethod,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#0f131a] border-2 border-red-500/40 rounded-3xl w-full max-w-2xl flex flex-col overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.2)] animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-[#161316] px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🗑️</span>
            <div>
              <h2 className="text-lg font-bold text-white">Log Kitchen Spoilage / Food Waste</h2>
              <p className="text-xs text-zinc-400">
                Audit spoiled ingredients, overcooked prep, or guest returns
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                Waste Category
              </label>
              <select
                value={wasteType}
                onChange={(e) => setWasteType(e.target.value as WasteTypeUI)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white outline-none focus:border-red-400"
              >
                <option value="SPOILED">Spoiled / Rotten Prep</option>
                <option value="BURNT_OVERCOOKED">Burnt / Overcooked in Pan</option>
                <option value="EXPIRED">Expired Past Shelf Life</option>
                <option value="CUSTOMER_RETURN">Guest Return / Quality Issue</option>
                <option value="TRIMMING_LOSS">Excess Trimming / Peeling Loss</option>
                <option value="BUFFET_SURPLUS">Unconsumed Buffet Surplus</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                Kitchen Shift
              </label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value as KitchenShiftUI)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white outline-none focus:border-red-400"
              >
                <option value="BREAKFAST">Breakfast Shift</option>
                <option value="LUNCH">Lunch Shift</option>
                <option value="DINNER">Dinner Shift</option>
                <option value="MIDNIGHT">Midnight Shift</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
              Item / Preparation Description
            </label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g. Cooked Butter Chicken Gravy, Paneer Tikka Skewers..."
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white outline-none focus:border-red-400"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                Wasted Quantity
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white font-mono outline-none focus:border-red-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                Unit
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white outline-none focus:border-red-400"
              >
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="l">l</option>
                <option value="ml">ml</option>
                <option value="portions">portions</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                Cost Per Unit (₹)
              </label>
              <input
                type="number"
                min="0"
                value={unitCost}
                onChange={(e) => setUnitCost(Number(e.target.value))}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-amber-400 font-mono font-bold outline-none focus:border-red-400"
                required
              />
            </div>
          </div>

          {/* Direct Loss Calculation Display */}
          <div className="p-3 bg-red-950/40 border border-red-500/50 rounded-xl flex items-center justify-between font-mono">
            <span className="text-xs uppercase font-bold text-red-300 font-sans">
              Monetary Loss to Kitchen:
            </span>
            <span className="text-xl font-black text-rose-400">
              {RecipeCostingHelper.formatCurrency(totalLoss)}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
              Root Cause / Spoilage Reason
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Refrigerator temperature tripped overnight, or burnt due to high flame"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white placeholder:text-zinc-600 outline-none focus:border-red-400"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                Preventive Action
              </label>
              <input
                type="text"
                value={preventiveAction}
                onChange={(e) => setPreventiveAction(e.target.value)}
                placeholder="e.g. Calibrate chillers daily"
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white outline-none focus:border-red-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                Disposal Method
              </label>
              <select
                value={disposalMethod}
                onChange={(e) => setDisposalMethod(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white outline-none focus:border-red-400"
              >
                <option value="TRASH">Trash / Garbage</option>
                <option value="COMPOST">Organic Compost</option>
                <option value="STAFF_MEAL">Converted to Staff Meal</option>
                <option value="BIOGAS">Biogas Plant</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !itemName || !reason}
              className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 text-white font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)]"
            >
              {loading ? 'Logging Entry...' : 'Audit Spoilage Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
