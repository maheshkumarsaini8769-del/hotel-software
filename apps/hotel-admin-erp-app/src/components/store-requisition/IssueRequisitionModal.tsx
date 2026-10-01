import React, { useState, useEffect } from 'react';
import { IStoreRequisitionUI, IIssueRequisitionPayload, StoreRequisitionHelper } from '@spicehub/ui';

interface IssueRequisitionModalProps {
  isOpen: boolean;
  requisition: IStoreRequisitionUI | null;
  onClose: () => void;
  onSave: (payload: IIssueRequisitionPayload) => Promise<void>;
  loading: boolean;
}

export const IssueRequisitionModal: React.FC<IssueRequisitionModalProps> = ({
  isOpen,
  requisition,
  onClose,
  onSave,
  loading,
}) => {
  const [issuedItems, setIssuedItems] = useState<
    Array<{
      itemName: string;
      requestedQuantity: number;
      issuedQuantity: number;
      unit: string;
      status: 'ISSUED' | 'OUT_OF_STOCK';
    }>
  >([]);

  useEffect(() => {
    if (requisition) {
      setIssuedItems(
        requisition.items.map((it) => ({
          itemName: it.itemName,
          requestedQuantity: it.requestedQuantity,
          issuedQuantity: it.requestedQuantity, // Default to full issue
          unit: it.unit,
          status: 'ISSUED',
        }))
      );
    }
  }, [requisition, isOpen]);

  if (!isOpen || !requisition) return null;

  const handleQtyChange = (index: number, val: number) => {
    setIssuedItems((prev) => {
      const updated = [...prev];
      const issuedQty = Math.max(0, val);
      updated[index] = {
        ...updated[index],
        issuedQuantity: issuedQty,
        status: issuedQty > 0 ? 'ISSUED' : 'OUT_OF_STOCK',
      };
      return updated;
    });
  };

  const urgencyBadge = StoreRequisitionHelper.getUrgencyBadge(requisition.urgency);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      issuedItems: issuedItems.map((it) => ({
        itemName: it.itemName,
        issuedQuantity: it.issuedQuantity,
        status: it.status,
      })),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#0f131a] border-2 border-emerald-500/40 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-[0_0_50px_rgba(52,211,153,0.25)] animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-[#10171a] px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">📦</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  Issue Stock to {requisition.requestingDepartment}
                </h2>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${urgencyBadge.bg} ${urgencyBadge.border} ${urgencyBadge.text}`}>
                  {urgencyBadge.label}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Requisition #{requisition.requisitionNumber} • Storekeeper Issue Verification
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
          {/* FEFO Warning Banner */}
          <div className="bg-amber-950/30 border border-amber-500/30 p-3 rounded-xl flex items-center gap-3 text-xs text-amber-300">
            <span className="text-lg">⏱️</span>
            <div>
              <strong className="block text-amber-200">FEFO Policy Enforced (First-Expired, First-Out):</strong>
              Please issue items from earliest expiring batches in cold room / racks first.
            </div>
          </div>

          {/* Items Fulfillment Table */}
          <div className="bg-zinc-950/70 border border-zinc-800 rounded-2xl overflow-hidden p-3 space-y-2">
            <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold text-zinc-400 uppercase pb-1 border-b border-zinc-800 px-2">
              <span className="col-span-6">Ingredient</span>
              <span className="col-span-3 text-right">Requested Qty</span>
              <span className="col-span-3 text-right">Issue Qty</span>
            </div>

            {issuedItems.map((it, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800/80">
                <div className="col-span-6">
                  <span className="text-xs font-semibold text-white block">{it.itemName}</span>
                  <span className="text-[10px] text-zinc-500">Unit: {it.unit}</span>
                </div>
                <div className="col-span-3 text-right font-mono text-xs text-zinc-400">
                  {it.requestedQuantity} {it.unit}
                </div>
                <div className="col-span-3">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max={it.requestedQuantity}
                    value={it.issuedQuantity}
                    onChange={(e) => handleQtyChange(idx, Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-emerald-400 font-mono font-bold text-right outline-none focus:border-emerald-400"
                    required
                  />
                </div>
              </div>
            ))}
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
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 text-black font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(52,211,153,0.3)]"
            >
              {loading ? 'Fulfilling...' : '✓ Confirm & Issue Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
