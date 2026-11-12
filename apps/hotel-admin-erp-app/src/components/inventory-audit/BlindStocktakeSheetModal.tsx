import React, { useState, useEffect } from 'react';
import { IInventoryAuditSessionUI, ISubmitCountsPayload, NumericInput } from '@spicehub/ui';

interface BlindStocktakeSheetModalProps {
  session: IInventoryAuditSessionUI | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (auditId: string, payload: ISubmitCountsPayload) => Promise<void>;
  loading: boolean;
}

export const BlindStocktakeSheetModal: React.FC<BlindStocktakeSheetModalProps> = ({
  session,
  isOpen,
  onClose,
  onSubmit,
  loading,
}) => {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (session && session.items) {
      const initialCounts: Record<string, number> = {};
      session.items.forEach((it) => {
        initialCounts[it.itemName] = it.physicalCountQuantity || 0;
      });
      setCounts(initialCounts);
    }
  }, [session]);

  if (!isOpen || !session) return null;

  const handleCountChange = (itemName: string, val: number) => {
    setCounts((prev) => ({
      ...prev,
      [itemName]: Math.max(0, val),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const countedItems = Object.entries(counts).map(([itemName, physicalCountQuantity]) => ({
      itemName,
      physicalCountQuantity: Number(physicalCountQuantity) || 0,
    }));

    await onSubmit(session._id, { countedItems });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-amber-200 w-full max-w-3xl rounded-2xl p-6 shadow-sm text-slate-900 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-amber-50 text-amber-700 border border-amber-200">
                {session.auditNumber}
              </span>
              <h2 className="text-lg font-bold text-slate-900">Physical Stocktake Sheet</h2>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Location: <span className="text-slate-900 font-semibold">{session.storeLocation}</span> • Type:{' '}
              <span className="text-slate-900">{session.auditType}</span>
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

        {/* Blind Count Notice */}
        {session.isBlindStocktake && (
          <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700 flex items-center gap-2.5">
            <span className="text-base">🛡️</span>
            <div>
              <span className="font-bold">Blind Stocktake Protection Active:</span> System book balances are obscured from this counting sheet. Enter the exact physical shelf tally without bias.
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
          <div className="space-y-2">
            {session.items.map((item, idx) => {
              const currentVal = counts[item.itemName] ?? 0;
              return (
                <div
                  key={idx}
                  className="bg-white border border-slate-200 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-all"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{item.itemName}</span>
                      {item.sku && (
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {item.sku}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5 flex items-center gap-3">
                      <span>Category: {item.category}</span>
                      <span>Unit: <strong className="text-slate-700">{item.unit}</strong></span>
                      {!session.isBlindStocktake && (
                        <span className="text-slate-500">
                          System Book: <strong className="text-amber-700">{item.systemBookQuantity}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-slate-600">Physical Count:</label>
                    <div className="flex items-center">
                      <NumericInput
                        step="any"
                        min="0"
                        required
                        value={currentVal}
                        onChange={(e) => handleCountChange(item.itemName, Number(e.target.value))}
                        className="w-28 bg-slate-100 border border-amber-200 rounded-lg px-3 py-1.5 text-sm font-bold text-amber-700 text-right focus:outline-none focus:ring-1 focus:ring-amber-400"
                      />
                      <span className="ml-2 text-xs text-slate-600 font-medium">{item.unit}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-600">
              Total Items in Sheet: <strong className="text-slate-900">{session.items.length}</strong>
            </span>
            <div className="flex items-center gap-3">
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
                className="bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-xl text-white text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 shadow-lg shadow-xs"
              >
                {loading ? 'Submitting Counts...' : 'Submit Physical Counts'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
