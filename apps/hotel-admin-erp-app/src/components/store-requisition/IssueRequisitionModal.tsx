import React, { useState, useEffect } from 'react';
import { IStoreRequisitionUI, IIssueRequisitionPayload, StoreRequisitionHelper, NumericInput } from '@spicehub/ui';
import { PackageCheck, Clock, X } from 'lucide-react';

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
          issuedQuantity: it.requestedQuantity,
          unit: it.unit,
          status: 'ISSUED',
        }))
      );
    }
  }, [requisition, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-xl animate-in fade-in zoom-in-95 text-slate-900">
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shadow-xs">
              <PackageCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Issue Stock to {requisition.requestingDepartment}
                </h2>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${urgencyBadge.bg} ${urgencyBadge.border} ${urgencyBadge.text}`}>
                  {urgencyBadge.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Requisition #{requisition.requisitionNumber} • Storekeeper Issue Verification
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* FEFO Warning Banner */}
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center gap-3 text-xs text-amber-800">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <strong className="block text-amber-900 font-semibold">FEFO Policy Enforced (First-Expired, First-Out):</strong>
              Please issue items from earliest expiring batches in cold room / racks first.
            </div>
          </div>

          {/* Items Fulfillment Table */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden p-3 space-y-2">
            <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold text-slate-500 uppercase pb-1 border-b border-slate-200 px-2">
              <span className="col-span-6">Ingredient</span>
              <span className="col-span-3 text-right">Requested Qty</span>
              <span className="col-span-3 text-right">Issue Qty</span>
            </div>

            {issuedItems.map((it, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                <div className="col-span-6">
                  <span className="text-xs font-semibold text-slate-900 block">{it.itemName}</span>
                  <span className="text-[10px] text-slate-400">Unit: {it.unit}</span>
                </div>
                <div className="col-span-3 text-right font-mono text-xs text-slate-500">
                  {it.requestedQuantity} {it.unit}
                </div>
                <div className="col-span-3">
                  <NumericInput
                    step="0.1"
                    min="0"
                    max={it.requestedQuantity}
                    value={it.issuedQuantity}
                    onChange={(e) => handleQtyChange(idx, Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-emerald-700 font-mono font-bold text-right outline-none focus:border-emerald-500 focus:bg-white"
                    required
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
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
              className="btn-glass-green px-6 py-2.5 rounded-xl text-white font-semibold text-xs uppercase tracking-wider transition-all shadow-xs"
            >
              {loading ? 'Fulfilling...' : 'Confirm & Issue Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
