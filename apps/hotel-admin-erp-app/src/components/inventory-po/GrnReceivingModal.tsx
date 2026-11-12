import React, { useState, useEffect } from 'react';
import { IPurchaseOrderUI, INewGrnPayload, InventoryPoHelper, NumericInput } from '@spicehub/ui';
import { Truck, X, Building2, Calendar, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';

interface GrnReceivingModalProps {
  isOpen: boolean;
  order: IPurchaseOrderUI | null;
  onClose: () => void;
  onSave: (payload: INewGrnPayload) => Promise<void>;
  loading: boolean;
}

export const GrnReceivingModal: React.FC<GrnReceivingModalProps> = ({
  isOpen,
  order,
  onClose,
  onSave,
  loading,
}) => {
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dockNotes, setDockNotes] = useState('');
  const [items, setItems] = useState<
    Array<{
      itemName: string;
      sku?: string;
      orderedQty: number;
      receivedQty: number;
      acceptedQty: number;
      rejectedQty: number;
      rejectionReason: string;
      unit: string;
      unitPrice: number;
      taxRate: number;
    }>
  >([]);

  useEffect(() => {
    if (order) {
      setInvoiceNumber('');
      setInvoiceDate(new Date().toISOString().split('T')[0]);
      setDockNotes('');
      setItems(
        order.items.map((it) => {
          const remaining = Math.max(0, it.orderQuantity - (it.receivedQuantity || 0));
          return {
            itemName: it.itemName,
            sku: it.sku,
            orderedQty: it.orderQuantity,
            receivedQty: remaining,
            acceptedQty: remaining,
            rejectedQty: 0,
            rejectionReason: '',
            unit: it.unit,
            unitPrice: it.unitPrice,
            taxRate: it.taxRate || 5,
          };
        })
      );
    }
  }, [order, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  const handleItemChange = (index: number, field: string, val: any) => {
    setItems((prev) => {
      const updated = [...prev];
      const current = { ...updated[index], [field]: val };
      if (field === 'receivedQty' || field === 'acceptedQty') {
        const rQty = field === 'receivedQty' ? Number(val) : current.receivedQty;
        const aQty = field === 'acceptedQty' ? Number(val) : current.acceptedQty;
        current.rejectedQty = Math.max(0, rQty - aQty);
      }
      updated[index] = current;
      return updated;
    });
  };

  let totalAccepted = 0;
  let totalTax = 0;
  let hasRejections = false;

  items.forEach((it) => {
    const sub = it.acceptedQty * it.unitPrice;
    const tax = sub * (it.taxRate / 100);
    totalAccepted += sub;
    totalTax += tax;
    if (it.rejectedQty > 0 || it.acceptedQty < it.orderedQty) hasRejections = true;
  });

  const finalInvoiceAmount = Math.round((totalAccepted + totalTax) * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber.trim()) return;

    await onSave({
      poId: order._id,
      invoiceNumber: invoiceNumber.trim(),
      invoiceDate: invoiceDate || undefined,
      receivedItems: items,
      dockNotes,
    });
  };

  const vendorName = typeof order.vendorId === 'object' ? order.vendorId?.name : 'Supplier';

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
              <Truck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Goods Received Note (GRN) • Dock Receiving
                </h2>
                <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {order.poNumber}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Physical dock verification, delivery inspection and accepted inventory value
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close GRN modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Supplier & Delivery Challan Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                Delivering Supplier
              </label>
              <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-slate-400" />
                <span>{vendorName}</span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Target: {order.deliveryLocation || 'Central Store Receiving Dock'}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Supplier Invoice / Challan #</span>
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g. INV-2026-9081"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-500 shadow-2xs font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Invoice / Delivery Date</span>
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-500 shadow-2xs"
                required
              />
            </div>
          </div>

          {/* Checklist Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Dock Physical Inspection & Verification
              </span>
              <span className="text-xs text-slate-500">
                Adjust received & accepted counts if goods were damaged
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
              <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold text-slate-500 uppercase pb-1 border-b border-slate-200 px-2">
                <span className="col-span-4">Item Name</span>
                <span className="col-span-2 text-right">PO Qty</span>
                <span className="col-span-2 text-right">Received</span>
                <span className="col-span-2 text-right">Accepted</span>
                <span className="col-span-2 text-right">Rejected</span>
              </div>

              {items.map((it, idx) => (
                <div
                  key={idx}
                  className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2"
                >
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4">
                      <span className="text-xs font-bold text-slate-900 block truncate">
                        {it.itemName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Rate: ₹{it.unitPrice}/{it.unit}
                      </span>
                    </div>

                    <div className="col-span-2 text-right font-mono text-xs font-semibold text-slate-600">
                      {it.orderedQty} {it.unit}
                    </div>

                    <div className="col-span-2">
                      <NumericInput
                        min="0"
                        step="0.1"
                        value={it.receivedQty}
                        onChange={(e) => handleItemChange(idx, 'receivedQty', e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-mono text-right outline-none focus:border-emerald-500 focus:bg-white"
                        required
                      />
                    </div>

                    <div className="col-span-2">
                      <NumericInput
                        min="0"
                        step="0.1"
                        value={it.acceptedQty}
                        onChange={(e) => handleItemChange(idx, 'acceptedQty', e.target.value)}
                        className="w-full px-2 py-1.5 bg-emerald-50/50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-mono text-right font-bold outline-none focus:border-emerald-500 focus:bg-white"
                        required
                      />
                    </div>

                    <div className="col-span-2 text-right">
                      <span
                        className={`text-xs font-mono font-bold ${
                          it.rejectedQty > 0 ? 'text-rose-600' : 'text-slate-400'
                        }`}
                      >
                        {it.rejectedQty} {it.unit}
                      </span>
                    </div>
                  </div>

                  {it.rejectedQty > 0 && (
                    <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <input
                        type="text"
                        value={it.rejectionReason}
                        onChange={(e) => handleItemChange(idx, 'rejectionReason', e.target.value)}
                        placeholder="Reason for dock rejection (e.g. broken seal, expired batch, crushed crates)..."
                        className="w-full px-2.5 py-1 bg-rose-50/50 border border-rose-200 rounded-lg text-xs text-rose-900 placeholder:text-rose-400 outline-none focus:border-rose-400"
                        required
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes and Total Accepted Value */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Dock Receiver Inspection Notes
              </label>
              <textarea
                value={dockNotes}
                onChange={(e) => setDockNotes(e.target.value)}
                placeholder="e.g. Delivery truck arrived at 10:15 AM. Packaging seals intact. Temperature 4°C verified."
                rows={3}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:bg-white resize-none"
              />
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between">
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Accepted Items Value:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {InventoryPoHelper.formatCurrency(totalAccepted)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Applicable GST Tax:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {InventoryPoHelper.formatCurrency(totalTax)}
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-base">
                <span className="font-bold text-slate-900">Final Accepted GRN Total:</span>
                <span className="font-mono font-extrabold text-emerald-700 text-lg">
                  {InventoryPoHelper.formatCurrency(finalInvoiceAmount)}
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
              className="btn-glass-green text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Generating GRN...' : 'Generate Official GRN'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
