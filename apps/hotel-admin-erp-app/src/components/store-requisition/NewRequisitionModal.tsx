import React, { useState, useEffect } from 'react';
import {
  INewRequisitionPayload,
  RequisitionDepartmentUI,
  RequisitionUrgencyUI, NumericInput,
} from '@spicehub/ui';
import { ClipboardList, X, Plus, Trash2 } from 'lucide-react';

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

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Raise Kitchen Store Indent (Requisition)</h2>
              <p className="text-xs text-slate-500">
                Request raw materials & ingredients from central store for your station
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Department & Urgency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Requesting Department / Station
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value as RequisitionDepartmentUI)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-500 focus:bg-white transition-colors"
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
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Service Urgency
              </label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as RequisitionUrgencyUI)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-500 focus:bg-white transition-colors"
              >
                <option value="NORMAL">Normal Indent (Routine Restock)</option>
                <option value="HIGH">High Priority (Lunch/Dinner Rush)</option>
                <option value="CRITICAL_SERVICE_BLOCKER">Critical Blocker (Stockout Imminent)</option>
              </select>
            </div>
          </div>

          {/* Requested Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Requested Store Items
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="btn-glass-green-subtle px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden p-3 space-y-2">
              <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold text-slate-500 uppercase pb-1 border-b border-slate-200 px-2">
                <span className="col-span-6">Ingredient / Raw Material</span>
                <span className="col-span-3 text-right">Requested Qty</span>
                <span className="col-span-2">Unit</span>
                <span className="col-span-1 text-center">Del</span>
              </div>

              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-xl border border-slate-200">
                  <div className="col-span-6">
                    <input
                      type="text"
                      value={it.itemName}
                      onChange={(e) => handleItemChange(idx, 'itemName', e.target.value)}
                      placeholder="e.g. Amul Butter 500g, All-Purpose Flour..."
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:border-emerald-500 focus:bg-white transition-colors"
                      required
                    />
                  </div>
                  <div className="col-span-3">
                    <NumericInput
                      step="0.1"
                      min="0.1"
                      value={it.requestedQuantity}
                      onChange={(e) => handleItemChange(idx, 'requestedQuantity', Number(e.target.value))}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-mono text-right outline-none focus:border-emerald-500 focus:bg-white transition-colors"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <select
                      value={it.unit}
                      onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:border-emerald-500 focus:bg-white transition-colors"
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
                      className="text-slate-400 hover:text-rose-500 disabled:opacity-30 p-1 text-xs transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 mx-auto" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Purpose / Station Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Needed for evening 200 pax banquet prep"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:bg-white transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-glass-green px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-50"
            >
              {loading ? 'Submitting Indent...' : 'Raise Indent to Store'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
