import React, { useState } from 'react';
import { AuditTypeUI, INewAuditSessionPayload } from '@spicehub/ui';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0f131a] border border-emerald-500/30 w-full max-w-3xl rounded-2xl p-6 shadow-2xl text-zinc-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400">📋</span> Initiate Stocktake Audit Session
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Launch physical stock count with optional Blind Count protection against inventory collusion.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 text-sm"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                Audit Type
              </label>
              <select
                value={auditType}
                onChange={(e) => setAuditType(e.target.value as AuditTypeUI)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="WEEKLY_SPOT_CHECK">Weekly Spot Audit</option>
                <option value="FULL_MONTH_END">Full Month-End Wall-to-Wall</option>
                <option value="HIGH_VALUE_CYCLIC">High-Value Cyclic (Liquor/Meat)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                Store / Cellar Location
              </label>
              <input
                type="text"
                value={storeLocation}
                onChange={(e) => setStoreLocation(e.target.value)}
                placeholder="e.g. Central Dry Store, Main Bar Cellar"
                required
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Blind Count Toggle */}
          <div className="bg-zinc-900/80 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-amber-300 block">
                🛡️ Blind Stocktake Mode (Recommended)
              </span>
              <span className="text-[11px] text-zinc-400">
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
              <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {/* Items Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                Audit Scope Items ({items.length})
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-emerald-400 text-xs font-semibold rounded-lg border border-emerald-500/30"
              >
                + Add Item
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="bg-zinc-900/90 border border-zinc-800 p-2.5 rounded-xl grid grid-cols-1 md:grid-cols-6 gap-2 items-center"
                >
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      placeholder="Item Name"
                      value={item.itemName}
                      onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
                      required
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="SKU"
                      value={item.sku}
                      onChange={(e) => handleItemChange(index, 'sku', e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Unit (kg/ltr)"
                      value={item.unit}
                      onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                      required
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      placeholder="Book Qty"
                      value={item.systemBookQuantity}
                      onChange={(e) =>
                        handleItemChange(index, 'systemBookQuantity', Number(e.target.value))
                      }
                      required
                      min={0}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      placeholder="Cost (₹)"
                      value={item.unitCost}
                      onChange={(e) => handleItemChange(index, 'unitCost', Number(e.target.value))}
                      required
                      min={0}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300"
                    />
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-rose-400 hover:text-rose-300 p-1.5 rounded-lg hover:bg-zinc-800 text-xs"
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
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
              Audit Notes & Special Instructions
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. End of Month September 2026 Audit. Physical tags verified."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
            >
              {loading ? 'Creating Session...' : 'Start Audit Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
