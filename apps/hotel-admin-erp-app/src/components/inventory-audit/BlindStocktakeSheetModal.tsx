import React, { useState, useEffect } from 'react';
import { IInventoryAuditSessionUI, ISubmitCountsPayload } from '@spicehub/ui';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0f131a] border border-amber-500/30 w-full max-w-3xl rounded-2xl p-6 shadow-2xl text-zinc-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {session.auditNumber}
              </span>
              <h2 className="text-lg font-bold text-white">Physical Stocktake Sheet</h2>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Location: <span className="text-zinc-200 font-semibold">{session.storeLocation}</span> • Type:{' '}
              <span className="text-zinc-200">{session.auditType}</span>
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

        {/* Blind Count Notice */}
        {session.isBlindStocktake && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-center gap-2.5">
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
                  className="bg-zinc-900/90 border border-zinc-800 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-zinc-700 transition-all"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{item.itemName}</span>
                      {item.sku && (
                        <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                          {item.sku}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-3">
                      <span>Category: {item.category}</span>
                      <span>Unit: <strong className="text-zinc-300">{item.unit}</strong></span>
                      {!session.isBlindStocktake && (
                        <span className="text-zinc-500">
                          System Book: <strong className="text-amber-400">{item.systemBookQuantity}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-zinc-400">Physical Count:</label>
                    <div className="flex items-center">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        required
                        value={currentVal}
                        onChange={(e) => handleCountChange(item.itemName, Number(e.target.value))}
                        className="w-28 bg-zinc-800 border border-amber-500/50 rounded-lg px-3 py-1.5 text-sm font-bold text-amber-300 text-right focus:outline-none focus:ring-1 focus:ring-amber-400"
                      />
                      <span className="ml-2 text-xs text-zinc-400 font-medium">{item.unit}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
            <span className="text-xs text-zinc-400">
              Total Items in Sheet: <strong className="text-white">{session.items.length}</strong>
            </span>
            <div className="flex items-center gap-3">
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
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 shadow-lg shadow-amber-900/30"
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
