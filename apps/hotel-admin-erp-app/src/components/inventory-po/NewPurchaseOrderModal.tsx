import React, { useState, useEffect } from 'react';
import { IVendorUI, INewPoPayload, InventoryPoHelper } from '@spicehub/ui';

interface NewPurchaseOrderModalProps {
  isOpen: boolean;
  vendors: IVendorUI[];
  onClose: () => void;
  onSave: (payload: INewPoPayload) => Promise<void>;
  loading: boolean;
}

export const NewPurchaseOrderModal: React.FC<NewPurchaseOrderModalProps> = ({
  isOpen,
  vendors,
  onClose,
  onSave,
  loading,
}) => {
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('Central Store Receiving Dock');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<
    Array<{
      itemName: string;
      sku?: string;
      category?: string;
      orderQuantity: number;
      unit: string;
      unitPrice: number;
      taxRate: number;
    }>
  >([
    { itemName: '', orderQuantity: 10, unit: 'kg', unitPrice: 100, taxRate: 5 },
  ]);

  useEffect(() => {
    if (vendors.length > 0 && !selectedVendorId) {
      setSelectedVendorId(vendors[0]._id);
    }
  }, [vendors, selectedVendorId]);

  if (!isOpen) return null;

  const handleAddItemRow = () => {
    setItems((prev) => [
      ...prev,
      { itemName: '', orderQuantity: 10, unit: 'kg', unitPrice: 100, taxRate: 5 },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, val: any) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const { subtotal, taxAmount, grandTotal } = InventoryPoHelper.calculatePoTotals(items);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorId) return;

    const validItems = items.filter((it) => it.itemName.trim());
    if (validItems.length === 0) return;

    await onSave({
      vendorId: selectedVendorId,
      items: validItems,
      deliveryLocation,
      expectedDeliveryDate: expectedDeliveryDate || undefined,
      notes,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#0f131a] border-2 border-amber-500/40 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.25)] animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-[#121620] px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">📦</span>
            <div>
              <h2 className="text-lg font-bold text-white">Raise Official Purchase Order (PO)</h2>
              <p className="text-xs text-zinc-400">
                Generate procurement order with item specifications, tax breakup, and vendor terms
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
          {/* Vendor & Delivery Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                Select Supplier / Vendor
              </label>
              <select
                value={selectedVendorId}
                onChange={(e) => setSelectedVendorId(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white outline-none focus:border-amber-400"
                required
              >
                {vendors.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.name} ({v.vendorCode} • {v.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                Expected Delivery Date
              </label>
              <input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                Receiving Dock / Location
              </label>
              <input
                type="text"
                value={deliveryLocation}
                onChange={(e) => setDeliveryLocation(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white outline-none focus:border-amber-400"
                required
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Procurement Items
              </span>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-xs font-bold border border-amber-500/30 transition-all flex items-center gap-1"
              >
                <span>+</span>
                <span>Add Item</span>
              </button>
            </div>

            <div className="bg-zinc-950/70 border border-zinc-800 rounded-2xl overflow-hidden p-3 space-y-2">
              <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold text-zinc-400 uppercase pb-1 border-b border-zinc-800 px-2">
                <span className="col-span-5">Item Description & SKU</span>
                <span className="col-span-2 text-right">Order Qty</span>
                <span className="col-span-2">Unit</span>
                <span className="col-span-2 text-right">Unit Rate (₹)</span>
                <span className="col-span-1 text-center">Del</span>
              </div>

              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-zinc-900/60 p-2 rounded-xl border border-zinc-800/80">
                  <div className="col-span-5">
                    <input
                      type="text"
                      value={it.itemName}
                      onChange={(e) => handleItemChange(idx, 'itemName', e.target.value)}
                      placeholder="e.g. Aged Basmati Rice 25kg Bag"
                      className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={it.orderQuantity}
                      onChange={(e) => handleItemChange(idx, 'orderQuantity', Number(e.target.value))}
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
                      <option value="crates">crates</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={it.unitPrice}
                      onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                      className="w-full px-2 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-amber-400 font-mono text-right outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                  <div className="col-span-1 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveItemRow(idx)}
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

          {/* Financial Totals Display */}
          <div className="bg-zinc-950 border border-amber-500/30 p-4 rounded-2xl flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-zinc-400 block">Subtotal: {InventoryPoHelper.formatCurrency(subtotal)}</span>
              <span className="text-xs text-zinc-400 block">GST / Taxes: {InventoryPoHelper.formatCurrency(taxAmount)}</span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-zinc-500 uppercase font-semibold block">Total Committed Amount</span>
              <span className="text-2xl font-black font-mono text-amber-400">
                {InventoryPoHelper.formatCurrency(grandTotal)}
              </span>
            </div>
          </div>

          {/* Special Instructions / Notes */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
              Terms & Delivery Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Delivery required before 08:00 AM at dock. Batch certificate required."
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
              disabled={loading || !selectedVendorId}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 text-black font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)]"
            >
              {loading ? 'Submitting PO...' : 'Raise Purchase Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
