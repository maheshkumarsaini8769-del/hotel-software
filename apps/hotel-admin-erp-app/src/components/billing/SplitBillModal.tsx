import React, { useState, useMemo } from 'react';
import { formatCurrency } from '../../../../../packages/ui/src/index';
import { BillingCalculatorHelper } from '../../../../../packages/ui/src/billing/BillingCalculatorHelper';
import { SplitPersonShare } from '../../../../../packages/ui/src/billing/types';

export interface SplitBillModalProps {
  billNumber: string;
  grandTotal: number;
  isOpen: boolean;
  onClose: () => void;
  onConfirmSplit: (splitType: 'EQUAL' | 'CUSTOM', splits: SplitPersonShare[]) => void | Promise<void>;
}

export const SplitBillModal: React.FC<SplitBillModalProps> = ({
  billNumber,
  grandTotal,
  isOpen,
  onClose,
  onConfirmSplit,
}) => {
  const [splitType, setSplitType] = useState<'EQUAL' | 'CUSTOM'>('EQUAL');
  const [splitCount, setSplitCount] = useState<number>(3);
  const [customShares, setCustomShares] = useState<SplitPersonShare[]>([
    { personNumber: 1, amount: Math.floor(grandTotal / 2) },
    { personNumber: 2, amount: grandTotal - Math.floor(grandTotal / 2) },
  ]);

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
    if (splitType === 'EQUAL') {
      onConfirmSplit('EQUAL', equalSplits);
    } else {
      if (!customValidation.isValid) return;
      onConfirmSplit('CUSTOM', customShares);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Split Bill • {billNumber}</h2>
            <p className="text-xs text-slate-500">Grand Total: {formatCurrency(grandTotal)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg text-lg">✕</button>
        </div>

        {/* Split Type Selector */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setSplitType('EQUAL')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
              splitType === 'EQUAL' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
            }`}
          >
            Equal Split
          </button>
          <button
            onClick={() => setSplitType('CUSTOM')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
              splitType === 'CUSTOM' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
            }`}
          >
            Custom Split
          </button>
        </div>

        {/* EQUAL SPLIT UI */}
        {splitType === 'EQUAL' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Number of Guests:</label>
              <div className="flex space-x-1.5">
                {[2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    onClick={() => setSplitCount(num)}
                    className={`w-9 h-9 rounded-lg font-bold text-xs transition ${
                      splitCount === num
                        ? 'bg-primary-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl space-y-2">
              <h4 className="text-xs font-semibold text-slate-400 uppercase">Equal Share Breakdown</h4>
              <div className="grid grid-cols-2 gap-2">
                {equalSplits.map((s) => (
                  <div key={s.personNumber} className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs flex justify-between">
                    <span className="text-slate-500">Guest #{s.personNumber}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(s.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CUSTOM SPLIT UI */}
        {splitType === 'CUSTOM' && (
          <div className="space-y-4">
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {customShares.map((s) => (
                <div key={s.personNumber} className="flex items-center space-x-3 text-xs">
                  <span className="w-16 text-slate-500 font-medium">Guest #{s.personNumber}:</span>
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-2 text-slate-400">₹</span>
                    <input
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
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={addCustomPerson}
              className="text-xs text-primary-600 font-bold hover:underline"
            >
              + Add Another Guest
            </button>

            {/* Validation Indicator */}
            <div className={`p-3 rounded-xl text-xs font-medium flex items-center justify-between ${
              customValidation.isValid
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
            }`}>
              <span>Total Allocated: {formatCurrency(customValidation.sum)}</span>
              <span>{customValidation.isValid ? '✅ Balanced' : `Difference: ${formatCurrency(customValidation.difference)}`}</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex space-x-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl"
          >
            Cancel
          </button>
          <button
            disabled={splitType === 'CUSTOM' && !customValidation.isValid}
            onClick={handleConfirm}
            className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-md transition"
          >
            Confirm Split
          </button>
        </div>
      </div>
    </div>
  );
};
