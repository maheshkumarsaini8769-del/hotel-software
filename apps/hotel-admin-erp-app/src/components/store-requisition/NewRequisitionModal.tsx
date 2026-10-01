import React, { useState } from 'react';
import {
  INewRequisitionPayload,
  RequisitionDepartmentUI,
  RequisitionUrgencyUI,
} from '@spicehub/ui';

interface NewRequisitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: INewRequisitionPayload) => Promise<void>;
  loading: boolean;
}

export const NewRequisitionModal: React.FC<NewRequisitionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  loading,
}) => {
  const [department, setDepartment] = useState<RequisitionDepartmentUI>('MAIN_KITCHEN');
  const [urgency, setUrgency] = useState<RequisitionUrgencyUI>('NORMAL');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<
    Array<{
      itemName: string;
      requestedQuantity: number;
      unit: string;
      unitCost: number;
    }>
  >([{ itemName: '', requestedQuantity: 5, unit: 'kg', unitCost: 0 }]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems((prev) => [...prev, { itemName: '', requestedQuantity: 5, unit: 'kg', unitCost: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, val: any) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter((it) => it.itemName.trim());
    if (validItems.length === 0) return;

    await onSave({
      requestingDepartment: department,
      urgency,
      items: validItems,
      notes,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#0f131a] border-2 border-amber-500/40 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.25)] animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-[#121620] px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">📋</span>
            <div>
              <h2 className="text-lg font-bold text-white">Raise Kitchen Store Indent (Requisition)</h2>
              <p className="text-xs text-zinc-400">
                Request raw materials & ingredients from central store for your station
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

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Department & Urgency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                Requesting Department / Station
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value as RequisitionDepartmentUI)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white outline-none focus:border-amber-400"
              >
                <option value="MAIN_KITCHEN">Main Curry / Hot Kitchen</option>
                <option value="BAKERY">Bakery & Pastry Kitchen</option>
                <option value="BANQUET_KITCHEN">Banquet Production Kitchen</option>
                <option value="BAR_BEVERAGES">Bar & Beverage Cellar</option>
                <option value="HOUSEKEEPING">Housekeeping Supplies</option>
                <option value="FRONT_OFFICE">Front Office Desk</option>
                <option value="MAINTENANCE">Engineering & Maintenance</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                Service Urgency
              </label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as RequisitionUrgencyUI)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white outline-none focus:border-amber-400"
              >
                <option value="NORMAL">Normal Indent (Routine Restock)</option>
                <option value="HIGH">High Priority (Lunch/Dinner Rush)</option>
                <option value="CRITICAL_SERVICE_BLOCKER">🚨 Critical Blocker (Stockout Imminent)</option>
              </select>
            </div>
          </div>

          {/* Requested Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Requested Store Items
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-xs font-bold border border-amber-500/30 transition-all flex items-center gap-1"
              >
                <span>+</span>
                <span>Add Item</span>
              </button>
            </div>

            <div className="bg-zinc-950/70 border border-zinc-800 rounded-2xl overflow-hidden p-3 space-y-2">
              <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold text-zinc-400 uppercase pb-1 border-b border-zinc-800 px-2">
                <span className="col-span-6">Ingredient / Raw Material</span>
                <span className="col-span-3 text-right">Requested Qty</span>
                <span className="col-span-2">Unit</span>
                <span className="col-span-1 text-center">Del</span>
              </div>

              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-zinc-900/60 p-2 rounded-xl border border-zinc-800/80">
                  <div className="col-span-6">
                    <input
                      type="text"
                      value={it.itemName}
                      onChange={(e) => handleItemChange(idx, 'itemName', e.target.value)}
                      placeholder="e.g. Amul Butter 500g, All-Purpose Flour..."
                      className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={it.requestedQuantity}
                      onChange={(e) => handleItemChange(idx, 'requestedQuantity', Number(e.target.value))}
                      className="w-full px-2 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white font-mono text-right outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <select
                      value={it.unit}
                      onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                      className="w-full px-2 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white outline-none focus:border-amber-400"
                    >
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="l">l</option>
                      <option value="ml">ml</option>
                      <option value="pcs">pcs</option>
                      <option value="boxes">boxes</option>
                      <option value="tins">tins</option>
                    </select>
                  </div>
                  <div className="col-span-1 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={items.length <= 1}
                      className="text-zinc-500 hover:text-red-400 disabled:opacity-30 p-1 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
              Purpose / Station Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Needed for evening 200 pax banquet prep"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white placeholder:text-zinc-600 outline-none focus:border-amber-400"
            />
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
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 text-black font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)]"
            >
              {loading ? 'Submitting Indent...' : 'Raise Indent to Store'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
