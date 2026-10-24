import React, { useState, useEffect } from 'react';
import {
  Users,
  X,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Smartphone,
  Info,
  Check
} from 'lucide-react';
import { TableStatusItem } from '../WaiterMobileApp';

export interface VerifyPaxModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: TableStatusItem | null;
  isDark: boolean;
  onSavePax: (tableId: number, actualGuests: number, reason: string) => void;
}

export const VerifyPaxModal: React.FC<VerifyPaxModalProps> = ({
  isOpen,
  onClose,
  table,
  isDark,
  onSavePax,
}) => {
  const [actualPax, setActualPax] = useState<number>(2);
  const [reason, setReason] = useState<string>('Customer entered excess count by mistake / intentionally');

  useEffect(() => {
    if (table) {
      setActualPax(table.actualGuests || table.guests || 2);
      if (table.customerClaimedGuests && table.customerClaimedGuests !== (table.actualGuests || table.guests)) {
        setReason('Customer entered excess count by mistake / intentionally');
      } else {
        setReason('Physical headcount verified by waiter');
      }
    }
  }, [table]);

  if (!isOpen || !table) return null;

  const customerClaimed = table.customerClaimedGuests || 4;
  const tableCapacity = table.guests || 4;
  const hasDiscrepancy = actualPax !== customerClaimed;

  const reasonOptions = [
    'Customer entered excess count by mistake / intentionally',
    `Only ${actualPax} guests physically seated at the table`,
    'Guests arrived / joined late',
    'Physical headcount verified by floor captain',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
      <div
        className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden transition-all duration-200 transform scale-100 ${
          isDark
            ? 'bg-[#121520] border-amber-500/40 text-slate-100'
            : 'bg-white border-amber-300 text-slate-800'
        }`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 p-4 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-xl shadow-inner">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  Verify Table Guests (Pax)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/25 text-white">
                  Table {table.name}
                </span>
              </div>
              <p className="text-xs text-amber-100">
                Check and correct actual customers seated vs QR entry
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 text-xs">
          {/* Table Capacity & Customer Selection Comparison */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Box 1: Customer Claimed via QR */}
            <div
              className={`p-3 rounded-xl border flex flex-col justify-between ${
                isDark
                  ? 'bg-purple-950/20 border-purple-800/40 text-purple-300'
                  : 'bg-purple-50 border-purple-200 text-purple-900'
              }`}
            >
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                <Smartphone className="w-3.5 h-3.5 text-purple-400" />
                <span>Customer Entered on QR</span>
              </div>
              <div className="my-1">
                <span className="text-2xl font-black text-purple-400">{customerClaimed}</span>
                <span className="text-xs ml-1 font-bold text-slate-400">Guests</span>
              </div>
              <div className="text-[10px] text-purple-400 font-medium">
                Entered on mobile menu
              </div>
            </div>

            {/* Box 2: Table Max Capacity */}
            <div
              className={`p-3 rounded-xl border flex flex-col justify-between ${
                isDark
                  ? 'bg-slate-900/60 border-slate-800 text-slate-300'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>Table Chair Capacity</span>
              </div>
              <div className="my-1">
                <span className="text-2xl font-black text-white">{tableCapacity}</span>
                <span className="text-xs ml-1 font-bold text-slate-400">Chairs</span>
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                Max seating layout
              </div>
            </div>
          </div>

          {/* Actual Seated Guests (Pax / Covers) Stepper */}
          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Actual Customers Physically Seated (वास्तविक संख्या)</span>
              <span className="text-orange-500 font-bold font-mono">{actualPax} Pax</span>
            </label>

            {/* Stepper buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActualPax((p) => Math.max(1, p - 1))}
                className={`w-11 h-11 rounded-xl text-lg font-black border transition flex items-center justify-center ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                }`}
              >
                -
              </button>

              <div
                className={`flex-1 h-11 rounded-xl border flex items-center justify-center font-black text-lg gap-2 ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              >
                <Users className="w-5 h-5 text-orange-500" />
                <span>{actualPax} Guests Seated</span>
              </div>

              <button
                type="button"
                onClick={() => setActualPax((p) => Math.min(12, p + 1))}
                className={`w-11 h-11 rounded-xl text-lg font-black border transition flex items-center justify-center ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                }`}
              >
                +
              </button>
            </div>

            {/* Quick 1-tap pills */}
            <div className="grid grid-cols-6 gap-1.5 pt-1">
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setActualPax(num)}
                  className={`py-1.5 rounded-lg font-black text-xs transition border ${
                    actualPax === num
                      ? 'bg-orange-500 text-white border-orange-400 shadow-sm'
                      : isDark
                      ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {num} {num === 1 ? 'Guest' : 'Pax'}
                </button>
              ))}
            </div>
          </div>

          {/* Discrepancy Alert Banner */}
          {hasDiscrepancy ? (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                isDark
                  ? 'bg-amber-950/30 border-amber-500/50 text-amber-200'
                  : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
              <div className="text-[11px] leading-relaxed">
                <strong className="block text-amber-400 font-bold mb-0.5">
                  ⚠️ Pax Discrepancy Detected (संख्या मिसमैच):
                </strong>
                Customer entered <strong>{customerClaimed} guests</strong> on mobile, but you are verifying <strong>{actualPax} guests</strong>. Setting {actualPax} will correct billing covers, thali counts, and service charges.
              </div>
            </div>
          ) : (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                isDark
                  ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-900'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <div className="text-[11px]">
                <strong>✓ Count Matches:</strong> Actual physical seating ({actualPax} Pax) matches customer entry.
              </div>
            </div>
          )}

          {/* Reason Selection */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-1.5 text-slate-400">
              Correction Reason (सुधार का कारण)
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 transition cursor-pointer ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-white'
                  : 'bg-white border-slate-300 text-slate-900'
              }`}
            >
              {reasonOptions.map((r, i) => (
                <option key={i} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          className={`p-4 border-t flex items-center justify-between gap-3 ${
            isDark ? 'bg-[#0f121b] border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition border ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSavePax(table.id, actualPax, reason)}
            className="px-5 py-2.5 rounded-xl font-black text-xs text-white bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 hover:from-orange-500 hover:to-amber-500 shadow-md shadow-orange-950/40 flex items-center gap-1.5 transition transform hover:scale-102"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirm & Update {actualPax} Seated Guests</span>
          </button>
        </div>
      </div>
    </div>
  );
};
