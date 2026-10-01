import React, { useState } from 'react';
import { INewTransferPayload } from '@spicehub/ui';

interface InterKitchenTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: INewTransferPayload) => Promise<void>;
  loading: boolean;
}

export const InterKitchenTransferModal: React.FC<InterKitchenTransferModalProps> = ({
  isOpen,
  onClose,
  onSave,
  loading,
}) => {
  const [sourceLocation, setSourceLocation] = useState('Main Kitchen Walk-in Chiller');
  const [destinationLocation, setDestinationLocation] = useState('Banquet Kitchen');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<
    Array<{
      itemName: string;
      quantity: number;
      unit: string;
      unitCost: number;
    }>
  >([{ itemName: '', quantity: 5, unit: 'kg', unitCost: 100 }]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems((prev) => [...prev, { itemName: '', quantity: 5, unit: 'kg', unitCost: 100 }]);
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
      sourceLocation,
      destinationLocation,
      items: validItems,
      notes,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#0f131a] border-2 border-blue-500/40 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-[0_0_50px_rgba(59,130,246,0.25)] animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-[#10141e] px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🔄</span>
            <div>
              <h2 className="text-lg font-bold text-white">Inter-Kitchen Stock Transfer</h2>
              <p className="text-xs text-zinc-400">
                Move prepared sauces, marinades, or bulk ingredients between outlets
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                Source Location (From)
              </label>
              <input
                type="text"
                value={sourceLocation}
                onChange={(e) => setSourceLocation(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white outline-none focus:border-blue-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                Destination Location (To)
              </label>
              <input
                type="text"
                value={destinationLocation}
                onChange={(e) => setDestinationLocation(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white outline-none focus:border-blue-400"
                required
              />
            </div>
          </div>

          {/* Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                Transfer Items
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-blue-300 text-xs font-bold border border-blue-500/30 transition-all flex items-center gap-1"
              >
                <span>+</span>
                <span>Add Item</span>
              </button>
            </div>

            <div className="bg-zinc-950/70 border border-zinc-800 rounded-2xl overflow-hidden p-3 space-y-2">
              <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold text-zinc-400 uppercase pb-1 border-b border-zinc-800 px-2">
                <span className="col-span-6">Item / Prep Description</span>
                <span className="col-span-3 text-right">Transfer Qty</span>
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
                      placeholder="e.g. Prepared White Butter Gravy"
                      className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white outline-none focus:border-blue-400"
                      required
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={it.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                      className="w-full px-2 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white font-mono text-right outline-none focus:border-blue-400"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <select
                      value={it.unit}
                      onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                      className="w-full px-2 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white outline-none focus:border-blue-400"
                    >
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="l">l</option>
                      <option value="ml">ml</option>
                      <option value="portions">portions</option>
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

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
              Transfer Reason / Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Emergency gravy shortage at banquet station"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white placeholder:text-zinc-600 outline-none focus:border-blue-400"
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
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 text-white font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)]"
            >
              {loading ? 'Dispatching...' : 'Dispatch Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
