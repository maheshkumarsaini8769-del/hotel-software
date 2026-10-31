import React, { useState, useMemo } from 'react';
import { formatCurrency } from '../../../../../packages/ui/src/index';
import { BillingCalculatorHelper } from '../../../../../packages/ui/src/billing/BillingCalculatorHelper';
import { SplitPersonShare } from '../../../../../packages/ui/src/billing/types';

export type SplitMode = 'Equal' | 'By Item' | 'Custom %' | 'By Seat' | 'Custom Amount';

export interface SplitBillModalProps {
  billNumber: string;
  grandTotal: number;
  isOpen: boolean;
  onClose: () => void;
  onConfirmSplit: (splitType: string, splits: SplitPersonShare[]) => void | Promise<void>;
  onSettleShare?: (personNumber: number, method: 'UPI' | 'Card' | 'Cash', amount: number) => Promise<void> | void;
}

export const SplitBillModal: React.FC<SplitBillModalProps> = ({
  billNumber,
  grandTotal,
  isOpen,
  onClose,
  onConfirmSplit,
  onSettleShare,
}) => {
  const [splitMode, setSplitMode] = useState<SplitMode>('Equal');
  const [splitCount, setSplitCount] = useState<number>(2);
  const [customShares, setCustomShares] = useState<SplitPersonShare[]>([
    { personNumber: 1, amount: Math.floor(grandTotal / 2) },
    { personNumber: 2, amount: grandTotal - Math.floor(grandTotal / 2) },
  ]);
  const [settledShares, setSettledShares] = useState<Record<number, { method: string; amount: number }>>({});
  const [showingUpiQrFor, setShowingUpiQrFor] = useState<number | null>(null);

  const equalSplits = useMemo(() => {
    return BillingCalculatorHelper.calculateEqualSplit(grandTotal, splitCount);
  }, [grandTotal, splitCount]);

  const customValidation = useMemo(() => {
    return BillingCalculatorHelper.validateCustomSplit(grandTotal, customShares);
  }, [grandTotal, customShares]);

  if (!isOpen) return null;

  const handleCustomAmountChange = (personNum: number, amount: number) => {
    setCustomShares((prev) =>
      prev.map((s) => (s.personNumber === personNum ? { ...s, amount } : s))
    );
  };

  const addCustomPerson = () => {
    setCustomShares((prev) => [
      ...prev,
      { personNumber: prev.length + 1, amount: 0 },
    ]);
  };

  const removeCustomPerson = (personNum: number) => {
    if (customShares.length <= 2) return;
    const filtered = customShares.filter((s) => s.personNumber !== personNum);
    const reindexed = filtered.map((s, idx) => ({ ...s, personNumber: idx + 1 }));
    setCustomShares(reindexed);
  };

  const handleConfirm = () => {
    if (splitMode === 'Equal') {
      onConfirmSplit('Equal', equalSplits);
    } else {
      if (!customValidation.isValid) return;
      onConfirmSplit(splitMode, customShares);
    }
    onClose();
  };

  const MODES: SplitMode[] = ['Equal', 'By Item', 'Custom %', 'By Seat', 'Custom Amount'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full shadow-sm dark:shadow-none p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Split Bill • {billNumber}</h2>
            <p className="text-xs text-slate-500">Grand Total: {formatCurrency(grandTotal)}</p>
          </div>
          <button data-testid="btn-close-split-modal" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg text-lg">✕</button>
        </div>

        {/* 5 Split Modes Selector */}
        <div>
          <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
            Select Split Mode (5 Modes Available)
          </div>
          <div className="grid grid-cols-5 gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {MODES.map((mode) => (
              <button
                key={mode}
                onClick={() => setSplitMode(mode)}
                className={`py-2 px-1 text-xs font-bold rounded-lg text-center transition ${
                  splitMode === mode
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* EQUAL SPLIT UI */}
        {splitMode === 'Equal' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Number of Ways:</label>
              <div className="flex space-x-1.5">
                {[2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    onClick={() => setSplitCount(num)}
                    className={`w-9 h-9 rounded-lg font-bold text-xs transition ${
                      splitCount === num
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                ({splitCount} Ways Equal)
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl space-y-2 border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">
                  Equal Split Breakdown ({splitCount} Guests)
                </h4>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(grandTotal / splitCount)} / person
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {equalSplits.map((s) => {
                  const isSettled = Boolean(settledShares[s.personNumber]);
                  const settledInfo = settledShares[s.personNumber];
                  const isShowingQr = showingUpiQrFor === s.personNumber;

                  return (
                    <div
                      key={s.personNumber}
                      data-testid={`split-card-guest-${s.personNumber}`}
                      className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2 shadow-xs"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200">Guest #{s.personNumber}</span>
                          <span className="block text-[10px] text-slate-400">1/{splitCount} Equal Share</span>
                        </div>
                        <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                          {formatCurrency(s.amount)}
                        </span>
                      </div>

                      {isSettled ? (
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-lg text-emerald-700 dark:text-emerald-300 font-bold text-[11px] flex items-center justify-between">
                          <span>✓ Settled via {settledInfo.method}</span>
                          <span className="font-mono">₹{settledInfo.amount}</span>
                        </div>
                      ) : (
                        <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-700">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              data-testid={`btn-split-cash-${s.personNumber}`}
                              onClick={async () => {
                                setSettledShares((prev) => ({
                                  ...prev,
                                  [s.personNumber]: { method: 'Cash', amount: s.amount },
                                }));
                                if (onSettleShare) {
                                  await onSettleShare(s.personNumber, 'Cash', s.amount);
                                }
                              }}
                              className="flex-1 py-1 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition shadow-xs"
                            >
                              <span>💵</span>
                              <span>Settle Cash</span>
                            </button>
                            <button
                              type="button"
                              data-testid={`btn-split-upi-${s.personNumber}`}
                              onClick={() => setShowingUpiQrFor(isShowingQr ? null : s.personNumber)}
                              className="flex-1 py-1 px-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition shadow-xs"
                            >
                              <span>📱</span>
                              <span>{isShowingQr ? 'Hide UPI QR' : 'Settle UPI'}</span>
                            </button>
                            <button
                              type="button"
                              data-testid={`btn-split-card-${s.personNumber}`}
                              onClick={async () => {
                                setSettledShares((prev) => ({
                                  ...prev,
                                  [s.personNumber]: { method: 'Card', amount: s.amount },
                                }));
                                if (onSettleShare) {
                                  await onSettleShare(s.personNumber, 'Card', s.amount);
                                }
                              }}
                              className="flex-1 py-1 px-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition shadow-xs"
                            >
                              <span>💳</span>
                              <span>Settle Card</span>
                            </button>
                          </div>

                          {isShowingQr && (
                            <div className="p-2.5 bg-slate-800 dark:bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 dark:border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="w-14 h-14 bg-white p-1 rounded-lg border border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-center">
                                  {/* Dynamic UPI QR Pattern representation */}
                                  <div className="w-full h-full bg-slate-900 rounded-xs grid grid-cols-4 gap-0.5 p-0.5">
                                    <div className="bg-white rounded-xs"></div>
                                    <div className="bg-transparent"></div>
                                    <div className="bg-white rounded-xs"></div>
                                    <div className="bg-white rounded-xs"></div>
                                    <div className="bg-transparent"></div>
                                    <div className="bg-white rounded-xs"></div>
                                    <div className="bg-transparent"></div>
                                    <div className="bg-white rounded-xs"></div>
                                    <div className="bg-white rounded-xs"></div>
                                    <div className="bg-transparent"></div>
                                    <div className="bg-white rounded-xs"></div>
                                    <div className="bg-white rounded-xs"></div>
                                    <div className="bg-white rounded-xs"></div>
                                    <div className="bg-white rounded-xs"></div>
                                    <div className="bg-transparent"></div>
                                    <div className="bg-white rounded-xs"></div>
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-extrabold text-[11px] text-slate-700 dark:text-slate-300 dark:text-slate-700 dark:text-slate-300 truncate">
                                    Dynamic UPI QR
                                  </div>
                                  <div className="text-[10px] text-slate-700 dark:text-slate-300 dark:text-slate-700 dark:text-slate-300 font-mono">
                                    hotel@upi • ₹{s.amount}
                                  </div>
                                  <div className="text-[9px] text-slate-500">
                                    Scan with GPay / PhonePe / Paytm
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                data-testid={`btn-confirm-split-upi-${s.personNumber}`}
                                onClick={async () => {
                                  setSettledShares((prev) => ({
                                    ...prev,
                                    [s.personNumber]: { method: 'UPI', amount: s.amount },
                                  }));
                                  setShowingUpiQrFor(null);
                                  if (onSettleShare) {
                                    await onSettleShare(s.personNumber, 'UPI', s.amount);
                                  }
                                }}
                                className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black shadow-xs transition"
                              >
                                ✓ Confirm UPI Received (₹{s.amount})
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* BY ITEM SPLIT UI */}
        {splitMode === 'By Item' && (
          <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
            <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Item-by-Item Assignment</h4>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">1x Paneer Tikka Test</span>
                  <span className="block text-[10px] text-slate-400">Assigned to: Guest #1</span>
                </div>
                <span className="font-black text-slate-900 dark:text-white">₹336.00 (incl. GST)</span>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">1x Paneer Tikka Test</span>
                  <span className="block text-[10px] text-slate-400">Assigned to: Guest #2</span>
                </div>
                <span className="font-black text-slate-900 dark:text-white">₹336.00 (incl. GST)</span>
              </div>
            </div>
          </div>
        )}

        {/* CUSTOM % SPLIT UI */}
        {splitMode === 'Custom %' && (
          <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
            <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Custom Percentage Allocation</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex justify-between">
                <span>Guest #1 (50%)</span>
                <span className="font-black text-emerald-600">{formatCurrency(grandTotal * 0.5)}</span>
              </div>
              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex justify-between">
                <span>Guest #2 (50%)</span>
                <span className="font-black text-emerald-600">{formatCurrency(grandTotal * 0.5)}</span>
              </div>
            </div>
          </div>
        )}

        {/* BY SEAT SPLIT UI */}
        {splitMode === 'By Seat' && (
          <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
            <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">By Seat Assignment</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex justify-between">
                <span>Seat A (Chair 1)</span>
                <span className="font-black text-slate-800 dark:text-slate-200">{formatCurrency(grandTotal / 2)}</span>
              </div>
              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex justify-between">
                <span>Seat B (Chair 2)</span>
                <span className="font-black text-slate-800 dark:text-slate-200">{formatCurrency(grandTotal / 2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* CUSTOM AMOUNT SPLIT UI */}
        {splitMode === 'Custom Amount' && (
          <div className="space-y-4">
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {customShares.map((s) => {
                const isSettled = Boolean(settledShares[s.personNumber]);
                const settledInfo = settledShares[s.personNumber];
                const isShowingQr = showingUpiQrFor === s.personNumber;
                return (
                  <div key={s.personNumber} data-testid={`custom-split-card-${s.personNumber}`} className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2 shadow-xs">
                    <div className="flex items-center space-x-3 text-xs">
                      <span className="w-16 text-slate-500 font-bold">Guest #{s.personNumber}:</span>
                      <div className="flex-1 relative">
                        <span className="absolute left-3 top-2 text-slate-400">₹</span>
                        <input
                          data-testid={`custom-share-input-${s.personNumber}`}
                          type="number"
                          min={0}
                          value={s.amount}
                          onChange={(e) => handleCustomAmountChange(s.personNumber, Number(e.target.value))}
                          className="w-full pl-7 pr-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 font-semibold"
                        />
                      </div>
                      {customShares.length > 2 && (
                        <button
                          onClick={() => removeCustomPerson(s.personNumber)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    {isSettled ? (
                      <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-lg text-emerald-700 dark:text-emerald-300 font-bold text-[11px] flex items-center justify-between">
                        <span>✓ Settled via {settledInfo.method}</span>
                        <span className="font-mono">₹{settledInfo.amount}</span>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-700">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            data-testid={`btn-custom-split-cash-${s.personNumber}`}
                            onClick={async () => {
                              setSettledShares((prev) => ({
                                ...prev,
                                [s.personNumber]: { method: 'Cash', amount: s.amount },
                              }));
                              if (onSettleShare) {
                                await onSettleShare(s.personNumber, 'Cash', s.amount);
                              }
                            }}
                            className="flex-1 py-1 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition shadow-xs"
                          >
                            <span>💵</span>
                            <span>Settle Cash</span>
                          </button>
                          <button
                            type="button"
                            data-testid={`btn-custom-split-upi-${s.personNumber}`}
                            onClick={() => setShowingUpiQrFor(isShowingQr ? null : s.personNumber)}
                            className="flex-1 py-1 px-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition shadow-xs"
                          >
                            <span>📱</span>
                            <span>{isShowingQr ? 'Hide UPI QR' : 'Settle UPI'}</span>
                          </button>
                          <button
                            type="button"
                            data-testid={`btn-custom-split-card-${s.personNumber}`}
                            onClick={async () => {
                              setSettledShares((prev) => ({
                                ...prev,
                                [s.personNumber]: { method: 'Card', amount: s.amount },
                              }));
                              if (onSettleShare) {
                                await onSettleShare(s.personNumber, 'Card', s.amount);
                              }
                            }}
                            className="flex-1 py-1 px-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition shadow-xs"
                          >
                            <span>💳</span>
                            <span>Settle Card</span>
                          </button>
                        </div>
                        {isShowingQr && (
                          <div className="p-2.5 bg-slate-800 dark:bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 dark:border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="w-14 h-14 bg-white p-1 rounded-lg border border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-center">
                                <div className="w-full h-full bg-slate-900 rounded-xs grid grid-cols-4 gap-0.5 p-0.5">
                                  <div className="bg-white rounded-xs"></div>
                                  <div className="bg-transparent"></div>
                                  <div className="bg-white rounded-xs"></div>
                                  <div className="bg-white rounded-xs"></div>
                                  <div className="bg-transparent"></div>
                                  <div className="bg-white rounded-xs"></div>
                                  <div className="bg-transparent"></div>
                                  <div className="bg-white rounded-xs"></div>
                                  <div className="bg-white rounded-xs"></div>
                                  <div className="bg-transparent"></div>
                                  <div className="bg-white rounded-xs"></div>
                                  <div className="bg-white rounded-xs"></div>
                                  <div className="bg-white rounded-xs"></div>
                                  <div className="bg-white rounded-xs"></div>
                                  <div className="bg-transparent"></div>
                                  <div className="bg-white rounded-xs"></div>
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-extrabold text-[11px] text-slate-700 dark:text-slate-300 dark:text-slate-700 dark:text-slate-300 truncate">
                                  Dynamic UPI QR
                                </div>
                                <div className="text-[10px] text-slate-700 dark:text-slate-300 dark:text-slate-700 dark:text-slate-300 font-mono">
                                  hotel@upi • ₹{s.amount}
                                </div>
                                <div className="text-[9px] text-slate-500">
                                  Scan with GPay / PhonePe / Paytm
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              data-testid={`btn-confirm-custom-split-upi-${s.personNumber}`}
                              onClick={async () => {
                                setSettledShares((prev) => ({
                                  ...prev,
                                  [s.personNumber]: { method: 'UPI', amount: s.amount },
                                }));
                                setShowingUpiQrFor(null);
                                if (onSettleShare) {
                                  await onSettleShare(s.personNumber, 'UPI', s.amount);
                                }
                              }}
                              className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black shadow-xs transition"
                            >
                              ✓ Confirm UPI Received (₹{s.amount})
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={addCustomPerson}
              className="text-xs text-emerald-600 font-bold hover:underline"
            >
              + Add Another Guest
            </button>

            {/* Validation Indicator */}
            <div className={`p-3 rounded-xl text-xs font-medium flex items-center justify-between ${
              customValidation.isValid
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
            }`}>
              <span>Total Allocated: {formatCurrency(customValidation.sum)}</span>
              <span>{customValidation.isValid ? '✅ Balanced' : `Difference: ${formatCurrency(customValidation.difference)}`}</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex space-x-3 pt-2">
          <button
            data-testid="btn-cancel-split"
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Cancel Split
          </button>
          <button
            disabled={splitMode === 'Custom Amount' && !customValidation.isValid}
            onClick={handleConfirm}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-md transition"
          >
            Confirm Split
          </button>
        </div>
      </div>
    </div>
  );
};
