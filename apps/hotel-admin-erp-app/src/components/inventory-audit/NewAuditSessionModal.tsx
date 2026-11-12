import React, { useState } from 'react';
import { AuditTypeUI, INewAuditSessionPayload, NumericInput } from '@spicehub/ui';

interface NewAuditSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: INewAuditSessionPayload) => Promise<void>;
  loading: boolean;
}

interface ItemRow {
  itemName: string;
  sku: string;
  category: string;
  unit: string;
  systemBookQuantity: number;
  unitCost: number;
}

export const NewAuditSessionModal: React.FC<NewAuditSessionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  loading,
}) => {
  const [auditType, setAuditType] = useState<AuditTypeUI>('WEEKLY_SPOT_CHECK');
  const [storeLocation, setStoreLocation] = useState('Central Dry Store');
  const [isBlindStocktake, setIsBlindStocktake] = useState(true);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ItemRow[]>([
    {
      itemName: 'Basmati Rice (Royal A-Grade)',
      sku: 'RIC-001',
      category: 'Grains & Pulses',
      unit: 'kg',
      systemBookQuantity: 100,
      unitCost: 110,
    },
    {
      itemName: 'Extra Virgin Olive Oil',
      sku: 'OIL-002',
      category: 'Oils & Condiments',
      unit: 'ltr',
      systemBookQuantity: 30,
      unitCost: 650,
    },
    {
      itemName: 'Imported Truffle Butter',
      sku: 'DAI-003',
      category: 'Dairy Products',
      unit: 'kg',
      systemBookQuantity: 12,
      unitCost: 1400,
    },
  ]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        itemName: '',
        sku: '',
        category: 'Food Supplies',
        unit: 'kg',
        systemBookQuantity: 10,
        unitCost: 100,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof ItemRow, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter((it) => it.itemName.trim().length > 0);
    if (validItems.length === 0) {
      alert('Please add at least one valid item to audit');
      return;
    }

    await onSubmit({
      auditType,
      storeLocation,
      isBlindStocktake,
      items: validItems,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-emerald-200 w-full max-w-3xl rounded-2xl p-6 shadow-sm text-slate-900 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="text-emerald-700">📋</span> Initiate Stocktake Audit Session
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Launch physical stock count with optional Blind Count protection against inventory collusion.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-200 text-sm"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Audit Type
              </label>
              <select
                value={auditType}
                onChange={(e) => setAuditType(e.target.value as AuditTypeUI)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
              >
                <option value="WEEKLY_SPOT_CHECK">Weekly Spot Audit</option>
                <option value="FULL_MONTH_END">Full Month-End Wall-to-Wall</option>
                <option value="HIGH_VALUE_CYCLIC">High-Value Cyclic (Liquor/Meat)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Store / Cellar Location
              </label>
              <input
                type="text"
                value={storeLocation}
                onChange={(e) => setStoreLocation(e.target.value)}
                placeholder="e.g. Central Dry Store, Main Bar Cellar"
                required
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Blind Count Toggle */}
          <div className="bg-white border border-amber-200 rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-amber-700 block">
                🛡️ Blind Stocktake Mode (Recommended)
              </span>
              <span className="text-[11px] text-slate-600">
                Hides system book quantities from counting staff to prevent pencil-whipping and force authentic physical counts.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isBlindStocktake}
                onChange={(e) => setIsBlindStocktake(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Items Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Audit Scope Items ({items.length})
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200"
              >
                + Add Item
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="bg-white border border-slate-200 p-2.5 rounded-xl grid grid-cols-1 md:grid-cols-6 gap-2 items-center"
                >
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      placeholder="Item Name"
                      value={item.itemName}
                      onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
                      required
                      className="w-full bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="SKU"
                      value={item.sku}
                      onChange={(e) => handleItemChange(index, 'sku', e.target.value)}
                      className="w-full bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Unit (kg/ltr)"
                      value={item.unit}
                      onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                      required
                      className="w-full bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700"
                    />
                  </div>
                  <div>
                    <NumericInput
                      placeholder="Book Qty"
                      value={item.systemBookQuantity}
                      onChange={(e) =>
                        handleItemChange(index, 'systemBookQuantity', Number(e.target.value))
                      }
                      required
                      min={0}
                      className="w-full bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <NumericInput
                      placeholder="Cost (₹)"
                      value={item.unitCost}
                      onChange={(e) => handleItemChange(index, 'unitCost', Number(e.target.value))}
                      required
                      min={0}
                      className="w-full bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700"
                    />
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-700 hover:text-red-300 p-1.5 rounded-lg hover:bg-slate-200 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Audit Notes & Special Instructions
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. End of Month September 2026 Audit. Physical tags verified."
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
            >
              {loading ? 'Creating Session...' : 'Start Audit Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
