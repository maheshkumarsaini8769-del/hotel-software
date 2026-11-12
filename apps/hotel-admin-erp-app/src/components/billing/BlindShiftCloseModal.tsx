import React, { useState, useMemo } from 'react';
import { formatCurrency } from '@spicehub/ui';
import { BillingCalculatorHelper } from '@spicehub/ui';
import { CurrencyDenomination, DenominationItem, NumericInput } from '@spicehub/ui';
import { Lock, FileCheck, X } from 'lucide-react';

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
    2000: 0,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 text-slate-900 rounded-3xl max-w-lg w-full shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-xs">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Cashier Blind Shift Close</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Shift 54
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Cashier: {cashierName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!result ? (
          <>
            {/* Opening Float */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Shift Opening Float Cash:
              </label>
              <div className="relative mt-1">
                <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm font-bold">₹</span>
                <NumericInput
                  min={0}
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-2 text-sm font-bold border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:border-emerald-500 focus:bg-white outline-none transition"
                />
              </div>
            </div>

            {/* Blind Physical Denomination Note Counter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Physical Note Breakdown:
                </span>
                <span className="text-[11px] text-emerald-700 font-semibold">(Blind Physical Count)</span>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                {([2000, 500, 200, 100, 50, 20, 10, 5, 1] as CurrencyDenomination[]).map((denom) => (
                  <div
                    key={denom}
                    className="flex items-center space-x-2 bg-white p-2 rounded-xl border border-slate-200 text-xs shadow-xs"
                  >
                    <span className="w-12 font-bold text-slate-700">₹{denom} ×</span>
                    <NumericInput
                      min={0}
                      value={notesRecord[denom] || ''}
                      placeholder="0"
                      onChange={(e) => handleCountChange(denom, Number(e.target.value))}
                      className="w-14 px-1.5 py-1 text-center font-bold border rounded-lg bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500 focus:bg-white outline-none"
                    />
                    <span className="flex-1 text-right font-semibold text-slate-500">
                      ={formatCurrency(denom * (notesRecord[denom] || 0))}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Counted Physical Cash Highlight */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between">
              <div>
                <div className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-widest">
                  Total Physical Counted Cash
                </div>
                <div className="text-[11px] text-emerald-600 mt-0.5">System expected cash will be audited upon submit</div>
              </div>
              <div className="text-2xl font-black text-emerald-700 font-mono tracking-tight">
                {formatCurrency(denominationSummary.total)}
              </div>
            </div>

            {/* Shift Close Notes */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Shift Handover Remarks:
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any discrepancy or remarks for manager..."
                className="w-full mt-1 p-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:border-emerald-500 focus:bg-white outline-none placeholder:text-slate-400"
              />
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="blind-close-submit-btn"
                disabled={isSubmitting || denominationSummary.total === 0}
                onClick={handleSubmit}
                className="btn-glass-green flex-1 py-3 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5"
              >
                <Lock className="w-4 h-4" />
                <span>{isSubmitting ? 'Auditing Shift...' : 'Blind Close Shift'}</span>
              </button>
            </div>
          </>
        ) : (
          /* Shift Close Result & Certificate */
          <div className="space-y-4 py-2">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
                <FileCheck className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-lg text-slate-900">Shift Reconciliation Complete</h3>
              <div className="inline-block mt-1 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-mono text-xs font-bold">
                {result.certificateNumber}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2.5 text-xs text-slate-700">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">System Expected Cash:</span>
                <span className="font-bold text-slate-900 font-mono text-sm">{formatCurrency(result.systemExpectedCash)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Physical Counted Cash:</span>
                <span className="font-bold text-emerald-700 font-mono text-sm">{formatCurrency(result.actualCountedCash)}</span>
              </div>
              <div className="flex justify-between items-center pt-2.5 border-t border-slate-200 text-sm font-black">
                <span>Variance:</span>
                <span className={result.varianceAmount === 0 ? 'text-emerald-600' : result.varianceAmount < 0 ? 'text-rose-600' : 'text-sky-600'}>
                  {result.varianceAmount > 0 ? `+${formatCurrency(result.varianceAmount)}` : formatCurrency(result.varianceAmount)}
                </span>
              </div>
            </div>

            <div className={`p-3 rounded-xl text-center text-xs font-extrabold uppercase tracking-wider border ${
              result.status === 'BALANCED'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : result.status === 'SHORTAGE'
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-sky-50 text-sky-700 border-sky-200'
            }`}>
              Audit Status: {result.status}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="btn-glass-green w-full py-3 text-xs font-bold uppercase tracking-wider rounded-xl"
            >
              Done & Logout Shift
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
