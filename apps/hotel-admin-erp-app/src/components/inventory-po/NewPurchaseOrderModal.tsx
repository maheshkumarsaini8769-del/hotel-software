import React, { useState, useEffect } from 'react';
import { IVendorUI, INewPoPayload, InventoryPoHelper, NumericInput } from '@spicehub/ui';
import { FilePlus, X, Plus, Trash2, Building2, MapPin, Calendar, DollarSign } from 'lucide-react';

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

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAddItemRow = () => {
    setItems((prev) => [
      ...prev,
      { itemName: '', orderQuantity: 10, unit: 'kg', unitPrice: 100, taxRate: 5 },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length <= 1) return;
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

  const selectedVendor = vendors.find((v) => v._id === selectedVendorId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorId) return;

    const validItems = items.filter((it) => it.itemName.trim() && it.orderQuantity > 0);
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
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl text-slate-800 animate-in zoom-in-95">
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
              <FilePlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Raise Purchase Order (PO)</h2>
              <p className="text-xs text-slate-500">
                Generate procurement order with item specifications, tax breakup, and supplier terms
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close purchase order modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Fields: Vendor, Location, Expected Date */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Supplier / Vendor</span>
              </label>
              <select
                value={selectedVendorId}
                onChange={(e) => setSelectedVendorId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-500 focus:bg-white cursor-pointer"
                required
              >
                {vendors.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.name} ({v.paymentTerms})
                  </option>
                ))}
              </select>
              {selectedVendor && (
                <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-2">
                  <span>{selectedVendor.category}</span>
                  <span>•</span>
                  <span>Terms: {selectedVendor.paymentTerms}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Receiving Dock / Location</span>
              </label>
              <input
                type="text"
                value={deliveryLocation}
                onChange={(e) => setDeliveryLocation(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-500 focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Expected Delivery Date</span>
              </label>
              <input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Procurement Items & Bill of Quantities
              </span>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="btn-glass-green-subtle px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item Line</span>
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
              <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold text-slate-500 uppercase pb-1 border-b border-slate-200 px-2">
                <span className="col-span-4">Item Name / Description</span>
                <span className="col-span-2 text-right">Order Qty</span>
                <span className="col-span-1">Unit</span>
                <span className="col-span-2 text-right">Unit Rate (₹)</span>
                <span className="col-span-1 text-center">GST %</span>
                <span className="col-span-1 text-right">Line Total</span>
                <span className="col-span-1 text-center">Del</span>
              </div>

              {items.map((it, idx) => {
                const lineBase = it.orderQuantity * it.unitPrice;
                const lineTotal = lineBase + lineBase * (it.taxRate / 100);

                return (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-xl border border-slate-200 shadow-2xs"
                  >
                    <div className="col-span-4">
                      <input
                        type="text"
                        value={it.itemName}
                        onChange={(e) => handleItemChange(idx, 'itemName', e.target.value)}
                        placeholder="e.g. Basmati Rice (A-Grade)"
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:border-emerald-500 focus:bg-white"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <NumericInput
                        min="0.1"
                        step="0.1"
                        value={it.orderQuantity}
                        onChange={(e) => handleItemChange(idx, 'orderQuantity', Number(e.target.value))}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-mono text-right outline-none focus:border-emerald-500 focus:bg-white"
                        required
                      />
                    </div>
                    <div className="col-span-1">
                      <select
                        value={it.unit}
                        onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                        className="w-full px-1.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:border-emerald-500 focus:bg-white cursor-pointer"
                      >
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                        <option value="l">l</option>
                        <option value="ml">ml</option>
                        <option value="pcs">pcs</option>
                        <option value="packs">packs</option>
                        <option value="boxes">boxes</option>
                        <option value="cans">cans</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <NumericInput
                        min="0"
                        step="0.5"
                        value={it.unitPrice}
                        onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-mono text-right outline-none focus:border-emerald-500 focus:bg-white"
                        required
                      />
                    </div>
                    <div className="col-span-1">
                      <select
                        value={it.taxRate}
                        onChange={(e) => handleItemChange(idx, 'taxRate', Number(e.target.value))}
                        className="w-full px-1 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:border-emerald-500 focus:bg-white cursor-pointer text-center"
                      >
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </div>
                    <div className="col-span-1 text-right font-mono font-bold text-xs text-slate-900">
                      ₹{lineTotal.toFixed(0)}
                    </div>
                    <div className="col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        disabled={items.length <= 1}
                        className="text-slate-400 hover:text-rose-600 disabled:opacity-30 p-1 text-xs cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 mx-auto" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Financial Totals Card & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Order Notes / Supplier Terms
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Standard temperature-controlled delivery required at back dock."
                rows={3}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:bg-white resize-none"
              />
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 flex flex-col justify-between">
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Subtotal (Base Value):</span>
                  <span className="font-mono font-bold text-slate-800">
                    {InventoryPoHelper.formatCurrency(subtotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Estimated GST Tax:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {InventoryPoHelper.formatCurrency(taxAmount)}
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-base">
                <span className="font-bold text-slate-900">Grand Total PO:</span>
                <span className="font-mono font-extrabold text-emerald-700 text-lg">
                  {InventoryPoHelper.formatCurrency(grandTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-glass-green text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {loading ? 'Generating PO...' : 'Raise Official PO'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
