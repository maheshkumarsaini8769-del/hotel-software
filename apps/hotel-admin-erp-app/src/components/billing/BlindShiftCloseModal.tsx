import React, { useState, useMemo } from 'react';
import { formatCurrency } from '../../../../../packages/ui/src/index';
import { BillingCalculatorHelper } from '../../../../../packages/ui/src/billing/BillingCalculatorHelper';
import { CurrencyDenomination, DenominationItem } from '../../../../../packages/ui/src/billing/types';

export interface BlindShiftCloseModalProps {
  cashierName: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmitShiftClose: (data: {
    openingFloatCash: number;
    noteCounts: DenominationItem[];
    notes?: string;
  }) => Promise<{
    certificateNumber: string;
    systemExpectedCash: number;
    actualCountedCash: number;
    varianceAmount: number;
    status: string;
  }>;
}

export const BlindShiftCloseModal: React.FC<BlindShiftCloseModalProps> = ({
  cashierName,
  isOpen,
  onClose,
  onSubmitShiftClose,
}) => {
  const [openingFloat, setOpeningFloat] = useState<number>(2000);
  const [notesRecord, setNotesRecord] = useState<Record<CurrencyDenomination, number>>({
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0,
    5: 0,
    1: 0,
  });
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);

  const denominationSummary = useMemo(() => {
    return BillingCalculatorHelper.calculateDenominationsTotal(notesRecord);
  }, [notesRecord]);

  if (!isOpen) return null;

  const handleCountChange = (denom: CurrencyDenomination, count: number) => {
    setNotesRecord((prev) => ({
      ...prev,
      [denom]: Math.max(0, count),
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await onSubmitShiftClose({
        openingFloatCash: openingFloat,
        noteCounts: denominationSummary.breakdown,
        notes,
      });
      setResult(res);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Cashier Blind Shift Close</h2>
            <p className="text-xs text-slate-500">Cashier: {cashierName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg text-lg">✕</button>
        </div>

        {!result ? (
          <>
            {/* Opening Float */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">Shift Opening Float Cash:</label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-2 text-slate-400 text-sm">₹</span>
                <input
                  type="number"
                  min={0}
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-1.5 text-sm font-bold border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            {/* Blind Physical Denomination Note Counter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">Physical Note Breakdown:</span>
                <span className="text-xs text-slate-400 font-medium">(Blind Count)</span>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                {([500, 200, 100, 50, 20, 10] as CurrencyDenomination[]).map((denom) => (
                  <div key={denom} className="flex items-center space-x-2 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs">
                    <span className="w-12 font-bold text-slate-700 dark:text-slate-300">₹{denom} ×</span>
                    <input
                      type="number"
                      min={0}
                      value={notesRecord[denom] || ''}
                      placeholder="0"
                      onChange={(e) => handleCountChange(denom, Number(e.target.value))}
                      className="w-14 px-1.5 py-1 text-center font-bold border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                    />
                    <span className="flex-1 text-right font-semibold text-slate-500">
                      ={formatCurrency(denom * (notesRecord[denom] || 0))}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Counted Physical Cash Highlight */}
            <div className="p-4 bg-primary-50 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-800 rounded-2xl flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-primary-700 dark:text-primary-300 uppercase">Total Physical Counted Cash</div>
                <div className="text-[11px] text-slate-500">System expected cash will be audited upon submit</div>
              </div>
              <div className="text-2xl font-black text-primary-700 dark:text-primary-300">
                {formatCurrency(denominationSummary.total)}
              </div>
            </div>

            {/* Shift Close Notes */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">Shift Handover Notes:</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any discrepancy or remarks for manager..."
                className="w-full mt-1 p-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
              />
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                disabled={isSubmitting || denominationSummary.total === 0}
                onClick={handleSubmit}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-md transition"
              >
                {isSubmitting ? 'Auditing Shift...' : '🔒 Blind Close Shift'}
              </button>
            </div>
          </>
        ) : (
          /* Shift Close Result & Certificate */
          <div className="space-y-4 py-2">
            <div className="text-center">
              <span className="text-4xl block mb-1">📜</span>
              <h3 className="font-bold text-base text-slate-800 dark:text-white">Shift Reconciliation Complete</h3>
              <p className="text-xs font-mono text-slate-500 mt-0.5">{result.certificateNumber}</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">System Expected Cash:</span>
                <span className="font-bold">{formatCurrency(result.systemExpectedCash)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Physical Counted Cash:</span>
                <span className="font-bold">{formatCurrency(result.actualCountedCash)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-sm font-black">
                <span>Variance:</span>
                <span className={result.varianceAmount === 0 ? 'text-emerald-600' : result.varianceAmount < 0 ? 'text-rose-600' : 'text-blue-600'}>
                  {result.varianceAmount > 0 ? `+${formatCurrency(result.varianceAmount)}` : formatCurrency(result.varianceAmount)}
                </span>
              </div>
            </div>

            <div className={`p-3 rounded-xl text-center text-xs font-bold uppercase tracking-wider ${
              result.status === 'BALANCED'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : result.status === 'SHORTAGE'
                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
            }`}>
              Audit Status: {result.status}
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white text-xs font-bold rounded-xl"
            >
              Done & Logout Shift
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
