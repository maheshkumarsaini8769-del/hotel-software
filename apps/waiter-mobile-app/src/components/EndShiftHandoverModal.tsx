import React, { useState } from 'react';
import {
  LogOut,
  X,
  CheckCircle2,
  Users,
  Grid,
  CreditCard,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Receipt,
  Banknote,
  Flame,
  Award
} from 'lucide-react';

export interface EndShiftHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmEndShift: (data: {
    buddyWaiter: string;
    handoverNotes: string;
    cashDropConfirmed: boolean;
  }) => void;
  isDark: boolean;
  staffName: string;
  staffId: string;
  shiftName: string;
  tablesServedCount: number;
  assignedTablesRange: string;
  activeTablesCount: number;
  cashFloatBalance?: number;
}

export const EndShiftHandoverModal: React.FC<EndShiftHandoverModalProps> = ({
  isOpen,
  onClose,
  onConfirmEndShift,
  isDark,
  staffName,
  staffId,
  shiftName,
  tablesServedCount,
  assignedTablesRange,
  activeTablesCount,
  cashFloatBalance = 2450,
}) => {
  const [buddyWaiter, setBuddyWaiter] = useState('Amit Sharma (W-102 - Evening Floor Lead)');
  const [handoverNotes, setHandoverNotes] = useState('');
  const [cashDropConfirmed, setCashDropConfirmed] = useState(true);

  if (!isOpen) return null;

  const buddyOptions = [
    { id: 'w-102', name: 'Amit Sharma (W-102 - Evening Floor Lead)' },
    { id: 'w-103', name: 'Suresh Patel (W-103 - Section B Captain)' },
    { id: 'w-104', name: 'Pooja Verma (W-104 - Bar & Lounge Captain)' },
    { id: 'desk', name: 'Floor Manager / Cashier Desk' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
      <div
        className={`w-full max-w-lg rounded-2xl border shadow-sm dark:shadow-none overflow-hidden transition-all duration-200 transform scale-100 ${
          isDark
            ? 'bg-slate-900 border-red-500/40 text-slate-100'
            : 'bg-white border-red-200 text-slate-800'
        }`}
      >
        {/* Header */}
        <div className="bg-slate-900 p-4 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center font-black text-xl">
              <LogOut className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  End Shift & Handover
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-500/30 text-red-300 border border-red-500/40">
                  Clock-Out
                </span>
              </div>
              <p className="text-xs text-red-200/80">
                Shift conclusion & buddy handover protocol
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

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar text-xs">
          {/* Staff Profile Bar */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between ${
              isDark
                ? 'bg-slate-900/80 border-slate-800 text-slate-300'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black flex items-center justify-center text-xs shadow-xs">
                {staffName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="font-black text-sm text-white">
                  {staffName} <span className="text-slate-400 text-xs">({staffId})</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  {shiftName} • Tables {assignedTablesRange}
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                <Clock className="w-3.5 h-3.5" /> Shift Active: ~6h 15m
              </span>
            </div>
          </div>

          {/* Today's Performance Metrics Cards */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-2 text-slate-400 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span>Shift Performance Summary</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Metric 1: Tables Served */}
              <div
                className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                  isDark
                    ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                <div className="text-[10px] font-bold text-slate-400">Tables Served</div>
                <div className="text-xl font-black text-emerald-400 my-0.5">
                  {tablesServedCount}
                </div>
                <div className="text-[10px] font-medium text-emerald-500 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> All Dishes OK
                </div>
              </div>

              {/* Metric 2: KOTs Handled */}
              <div
                className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                  isDark
                    ? 'bg-orange-950/20 border-orange-800/40 text-orange-300'
                    : 'bg-orange-50 border-orange-200 text-orange-900'
                }`}
              >
                <div className="text-[10px] font-bold text-slate-400">KOTs Fired</div>
                <div className="text-xl font-black text-orange-400 my-0.5">
                  28
                </div>
                <div className="text-[10px] font-medium text-orange-500 flex items-center gap-1">
                  <Flame className="w-3 h-3" /> Dispatched
                </div>
              </div>

              {/* Metric 3: Active Tables */}
              <div
                className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                  isDark
                    ? 'bg-blue-950/20 border-blue-800/40 text-blue-300'
                    : 'bg-blue-50 border-blue-200 text-blue-900'
                }`}
              >
                <div className="text-[10px] font-bold text-slate-400">Active Tables</div>
                <div className="text-xl font-black text-blue-400 my-0.5">
                  {activeTablesCount}
                </div>
                <div className="text-[10px] font-medium text-blue-400 flex items-center gap-1">
                  <Grid className="w-3 h-3" /> Need Handover
                </div>
              </div>

              {/* Metric 4: Cash Float */}
              <div
                className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                  isDark
                    ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    : 'bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="text-[10px] font-bold text-slate-400">Cash Float</div>
                <div className="text-xl font-black text-slate-700 dark:text-slate-300 my-0.5">
                  ₹{cashFloatBalance}
                </div>
                <div className="text-[10px] font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Banknote className="w-3 h-3" /> Ready for Drop
                </div>
              </div>
            </div>
          </div>

          {/* Handover Buddy Selection */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-1.5 text-slate-400">
              Select Handover Buddy
            </label>
            <select
              value={buddyWaiter}
              onChange={(e) => setBuddyWaiter(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-red-500 transition cursor-pointer ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-white'
                  : 'bg-white border-slate-300 text-slate-900'
              }`}
            >
              {buddyOptions.map((opt) => (
                <option key={opt.id} value={opt.name}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>

          {/* Handover Notes */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-1.5 text-slate-400">
              Handover Remarks / Table Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Table 2 waiting for dessert, Table 3 requested split bill. All guests satisfied."
              value={handoverNotes}
              onChange={(e) => setHandoverNotes(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-red-500 transition ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500'
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          {/* Cash Settlement Checkbox */}
          <div
            className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer ${
              cashDropConfirmed
                ? isDark
                  ? 'bg-emerald-950/20 border-emerald-800/60 text-emerald-300'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : isDark
                ? 'bg-slate-900 border-slate-800 text-slate-400'
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
            onClick={() => setCashDropConfirmed(!cashDropConfirmed)}
          >
            <input
              type="checkbox"
              checked={cashDropConfirmed}
              onChange={(e) => setCashDropConfirmed(e.target.checked)}
              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
            />
            <div className="text-[11px] leading-snug">
              <strong>Cash Float Handover Confirmed:</strong> I confirm submitting cash float of <strong>₹{cashFloatBalance}</strong> to the Cashier / Safe with no discrepancies.
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          className={`p-4 border-t flex items-center justify-between gap-3 ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
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
            Cancel / Back to Duty
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirmEndShift({
                buddyWaiter,
                handoverNotes: handoverNotes || 'Shift concluded smoothly with no pending alerts.',
                cashDropConfirmed,
              });
            }}
            className="px-5 py-2.5 rounded-xl font-black text-xs text-white bg-red-600 hover:bg-red-700 shadow-sm flex items-center gap-2 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Confirm End Shift & Clock Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
