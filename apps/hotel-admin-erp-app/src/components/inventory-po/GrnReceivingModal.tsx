import React, { useState, useEffect } from 'react';
import { IPurchaseOrderUI, INewGrnPayload, InventoryPoHelper } from '@spicehub/ui';

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#0f131a] border-2 border-emerald-500/40 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-[0_0_50px_rgba(52,211,153,0.2)] animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-[#10171a] px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🚚</span>
            <div>
              <h2 className="text-lg font-bold text-white">
                Goods Received Note (GRN) • Dock Receiving
              </h2>
              <p className="text-xs text-zinc-400">
                Inspect shipment against PO <span className="font-mono text-amber-400 font-bold">{order.poNumber}</span>
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
          {/* Vendor Invoice Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-zinc-950/60 p-4 rounded-2xl border border-zinc-800">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                Vendor / Supplier
              </label>
              <div className="text-sm font-bold text-white">
                {typeof order.vendorId === 'object' ? order.vendorId?.name : 'Vendor'}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                Vendor Physical Invoice #
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g. INV-2026-9810"
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white font-mono outline-none focus:border-emerald-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                Invoice Date
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          {/* Inspection Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Dock Physical Inspection & Verification
              </span>
              {hasRejections && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/70 text-rose-300 border border-rose-500/40 animate-pulse">
                  ⚠️ Discrepancy / Rejections Flagged
                </span>
              )}
            </div>

            <div className="bg-zinc-950/70 border border-zinc-800 rounded-2xl overflow-hidden p-3 space-y-2">
              <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold text-zinc-400 uppercase pb-1 border-b border-zinc-800 px-2">
                <span className="col-span-4">Item</span>
                <span className="col-span-2 text-right">Ordered</span>
                <span className="col-span-2 text-right">Received</span>
                <span className="col-span-2 text-right">Accepted</span>
                <span className="col-span-2 text-right">Rejected</span>
              </div>

              {items.map((it, idx) => (
                <div key={idx} className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800/80 space-y-2">
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4">
                      <span className="text-xs font-semibold text-white truncate block">{it.itemName}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">₹{it.unitPrice}/{it.unit}</span>
                    </div>
                    <div className="col-span-2 text-right font-mono text-xs text-zinc-400">
                      {it.orderedQty} {it.unit}
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={it.receivedQty}
                        onChange={(e) => handleItemChange(idx, 'receivedQty', Number(e.target.value))}
                        className="w-full px-2 py-1 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white font-mono text-right outline-none focus:border-emerald-400"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={it.acceptedQty}
                        onChange={(e) => handleItemChange(idx, 'acceptedQty', Number(e.target.value))}
                        className="w-full px-2 py-1 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-emerald-400 font-mono font-bold text-right outline-none focus:border-emerald-400"
                        required
                      />
                    </div>
                    <div className="col-span-2 text-right font-mono text-xs font-bold text-rose-400 pr-2">
                      {it.rejectedQty} {it.unit}
                    </div>
                  </div>

                  {/* Rejection Reason Row if any rejected */}
                  {it.rejectedQty > 0 && (
                    <div className="pt-1.5 border-t border-zinc-800/60 flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-rose-400 shrink-0">Reason:</span>
                      <input
                        type="text"
                        value={it.rejectionReason}
                        onChange={(e) => handleItemChange(idx, 'rejectionReason', e.target.value)}
                        placeholder="e.g. Torn bag, spoiled vegetable, leakage..."
                        className="flex-1 px-2 py-1 bg-red-950/30 border border-red-500/30 rounded text-[11px] text-rose-200 outline-none"
                        required
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Totals Summary */}
          <div className="bg-zinc-950 border border-emerald-500/30 p-4 rounded-2xl flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-zinc-400 block">Accepted Subtotal: {InventoryPoHelper.formatCurrency(totalAccepted)}</span>
              <span className="text-xs text-zinc-400 block">Accepted Tax: {InventoryPoHelper.formatCurrency(totalTax)}</span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-zinc-500 uppercase font-semibold block">Payable Invoice Amount</span>
              <span className="text-2xl font-black font-mono text-emerald-400">
                {InventoryPoHelper.formatCurrency(finalInvoiceAmount)}
              </span>
            </div>
          </div>

          {/* Inspector Notes */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
              Storekeeper / Receiving Dock Notes
            </label>
            <input
              type="text"
              value={dockNotes}
              onChange={(e) => setDockNotes(e.target.value)}
              placeholder="e.g. Delivered by refrigerated truck temp at 4°C. Weighed on dock scale."
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white placeholder:text-zinc-600 outline-none focus:border-emerald-400"
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
              disabled={loading || !invoiceNumber.trim()}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 text-black font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(52,211,153,0.3)]"
            >
              {loading ? 'Creating GRN...' : 'Verify & Generate GRN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
