import React, { useState, useMemo } from 'react';
import { formatCurrency } from '@spicehub/ui';
import { BillingCalculatorHelper } from '@spicehub/ui';
import { SplitPersonShare, NumericInput } from '@spicehub/ui';
import { CheckCircle2, AlertCircle, X, Plus, Trash2 } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Split Bill • {billNumber}</h2>
            <p className="text-xs text-slate-500">Grand Total: {formatCurrency(grandTotal)}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Split Type Selector */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setSplitType('EQUAL')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
              splitType === 'EQUAL'
                ? 'bg-white text-emerald-700 shadow-xs border border-emerald-200/50'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Equal Split
          </button>
          <button
            onClick={() => setSplitType('CUSTOM')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
              splitType === 'CUSTOM'
                ? 'bg-white text-emerald-700 shadow-xs border border-emerald-200/50'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Custom Split
          </button>
        </div>

        {/* EQUAL SPLIT UI */}
        {splitType === 'EQUAL' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <label className="text-xs font-semibold text-slate-700">Number of Guests:</label>
              <div className="flex space-x-1.5">
                {[2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    onClick={() => setSplitCount(num)}
                    className={`w-9 h-9 rounded-xl font-bold text-xs transition ${
                      splitCount === num
                        ? 'btn-glass-green text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Equal Share Breakdown
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {equalSplits.map((s) => (
                  <div
                    key={s.personNumber}
                    className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs flex justify-between shadow-xs"
                  >
                    <span className="text-slate-500">Guest #{s.personNumber}</span>
                    <span className="font-bold text-slate-900">{formatCurrency(s.amount)}</span>
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
                  <span className="w-16 text-slate-700 font-medium">Guest #{s.personNumber}:</span>
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-2 text-slate-400 font-bold">₹</span>
                    <NumericInput
                      min={0}
                      value={s.amount}
                      onChange={(e) => handleCustomAmountChange(s.personNumber, Number(e.target.value))}
                      className="w-full pl-7 pr-3 py-1.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-semibold focus:border-emerald-500 focus:bg-white outline-none transition"
                    />
                  </div>
                  {customShares.length > 2 && (
                    <button
                      onClick={() => removeCustomPerson(s.personNumber)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={addCustomPerson}
              className="btn-glass-green-subtle px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Another Guest</span>
            </button>

            {/* Validation Indicator */}
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between border ${
                customValidation.isValid
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              <span>Total Allocated: {formatCurrency(customValidation.sum)}</span>
              <span className="flex items-center gap-1">
                {customValidation.isValid ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Balanced</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>Difference: {formatCurrency(customValidation.difference)}</span>
                  </>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex space-x-3 pt-2 border-t border-slate-200">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold rounded-xl transition"
          >
            Cancel
          </button>
          <button
            disabled={splitType === 'CUSTOM' && !customValidation.isValid}
            onClick={handleConfirm}
            className="btn-glass-green flex-1 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold uppercase tracking-wider rounded-xl transition"
          >
            Confirm Split
          </button>
        </div>
      </div>
    </div>
  );
};
