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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#0b0f17] border border-amber-500/30 text-zinc-100 rounded-3xl max-w-lg w-full shadow-[0_0_50px_rgba(0,0,0,0.9)] p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-xl font-bold shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              🔒
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                <h2 className="text-lg font-bold text-white tracking-tight">Cashier Blind Shift Close</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  Shift 54
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">Cashier: {cashierName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-white rounded-lg text-lg transition">✕</button>
        </div>

        {!result ? (
          <>
            {/* Opening Float */}
            <div>
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Shift Opening Float Cash:</label>
              <div className="relative mt-1">
                <span className="absolute left-3.5 top-2.5 text-zinc-500 text-sm font-bold">₹</span>
                <input
                  type="number"
                  min={0}
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-2 text-sm font-bold border border-zinc-800 rounded-xl bg-[#131822] text-white focus:border-amber-500 outline-none transition"
                />
              </div>
            </div>

            {/* Blind Physical Denomination Note Counter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Physical Note Breakdown:</span>
                <span className="text-[11px] text-amber-400/80 font-semibold">(Blind Physical Count)</span>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-[#131822] p-3 rounded-2xl border border-zinc-800">
                {([2000, 500, 200, 100, 50, 20, 10, 5, 1] as CurrencyDenomination[]).map((denom) => (
                  <div key={denom} className="flex items-center space-x-2 bg-[#0b0f17] p-2 rounded-xl border border-zinc-800 text-xs">
                    <span className="w-12 font-bold text-amber-300">₹{denom} ×</span>
                    <input
                      type="number"
                      min={0}
                      value={notesRecord[denom] || ''}
                      placeholder="0"
                      onChange={(e) => handleCountChange(denom, Number(e.target.value))}
                      className="w-14 px-1.5 py-1 text-center font-bold border rounded-lg bg-[#161d2b] border-zinc-700 text-white focus:border-amber-400 outline-none"
                    />
                    <span className="flex-1 text-right font-semibold text-zinc-400">
                      ={formatCurrency(denom * (notesRecord[denom] || 0))}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Counted Physical Cash Highlight */}
            <div className="p-4 bg-gradient-to-r from-amber-950/30 to-amber-900/20 border border-amber-500/40 rounded-2xl flex items-center justify-between">
              <div>
                <div className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest">Total Physical Counted Cash</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">System expected cash will be audited upon submit</div>
              </div>
              <div className="text-2xl font-black text-amber-400 font-mono tracking-tight shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                {formatCurrency(denominationSummary.total)}
              </div>
            </div>

            {/* Shift Close Notes */}
            <div>
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Shift Handover Remarks:</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any discrepancy or remarks for manager..."
                className="w-full mt-1 p-2.5 text-xs border border-zinc-800 rounded-xl bg-[#131822] text-white focus:border-amber-500 outline-none placeholder-zinc-600"
              />
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs font-bold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="blind-close-submit-btn"
                disabled={isSubmitting || denominationSummary.total === 0}
                onClick={handleSubmit}
                className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-amber-950/40 transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                <span>🔒</span>
                <span>{isSubmitting ? 'Auditing Shift...' : 'Blind Close Shift'}</span>
              </button>
            </div>
          </>
        ) : (
          /* Shift Close Result & Certificate */
          <div className="space-y-4 py-2">
            <div className="text-center">
              <span className="text-4xl block mb-1">📜</span>
              <h3 className="font-extrabold text-lg text-white">Shift Reconciliation Complete</h3>
              <div className="inline-block mt-1 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold">
                {result.certificateNumber}
              </div>
            </div>

            <div className="bg-[#131822] border border-zinc-800 p-4 rounded-2xl space-y-2.5 text-xs text-zinc-300">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">System Expected Cash:</span>
                <span className="font-bold text-white font-mono text-sm">{formatCurrency(result.systemExpectedCash)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Physical Counted Cash:</span>
                <span className="font-bold text-amber-400 font-mono text-sm">{formatCurrency(result.actualCountedCash)}</span>
              </div>
              <div className="flex justify-between items-center pt-2.5 border-t border-zinc-800 text-sm font-black">
                <span>Variance:</span>
                <span className={result.varianceAmount === 0 ? 'text-emerald-400' : result.varianceAmount < 0 ? 'text-rose-400' : 'text-sky-400'}>
                  {result.varianceAmount > 0 ? `+${formatCurrency(result.varianceAmount)}` : formatCurrency(result.varianceAmount)}
                </span>
              </div>
            </div>

            <div className={`p-3 rounded-xl text-center text-xs font-extrabold uppercase tracking-wider border ${
              result.status === 'BALANCED'
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                : result.status === 'SHORTAGE'
                ? 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                : 'bg-sky-950/60 text-sky-300 border-sky-500/40'
            }`}>
              Audit Status: {result.status}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-950/40 transition active:scale-95"
            >
              Done & Logout Shift
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
