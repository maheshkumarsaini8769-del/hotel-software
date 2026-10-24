import React, { useState } from 'react';
import { Coffee, Clock, ShieldCheck, CheckCircle2, X, AlertTriangle } from 'lucide-react';

export interface TeaBreakModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartBreak: (durationMinutes: number, reason?: string) => void;
  isDark: boolean;
  currentStaffName: string;
  assignedTablesRange: string;
}

export const TeaBreakModal: React.FC<TeaBreakModalProps> = ({
  isOpen,
  onClose,
  onStartBreak,
  isDark,
  currentStaffName,
  assignedTablesRange,
}) => {
  const [selectedMinutes, setSelectedMinutes] = useState<number>(15);
  const [notes, setNotes] = useState<string>('');

  if (!isOpen) return null;

  const breakOptions = [
    {
      minutes: 10,
      title: 'Quick Chai',
      description: '10 Mins express tea break',
      icon: '☕',
      badge: 'Quick',
    },
    {
      minutes: 15,
      title: 'Chai & Snacks',
      description: '15 Mins standard tea break',
      icon: '🫖',
      badge: 'Standard',
      recommended: true,
    },
    {
      minutes: 30,
      title: 'Meal / Lunch',
      description: '30 Mins meal & refreshments',
      icon: '🍱',
      badge: 'Full',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div
        className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden transition-all duration-200 transform scale-100 ${
          isDark
            ? 'bg-[#121520] border-amber-500/40 text-slate-100'
            : 'bg-white border-amber-300 text-slate-800'
        }`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-xl shadow-inner">
              ☕
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                Take a Tea Break (चाय ब्रेक)
              </h2>
              <p className="text-xs text-amber-100">
                Pause floor duty with automatic team cover & timer
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

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4 text-xs">
          {/* Status info pill */}
          <div
            className={`p-3 rounded-xl border flex items-center gap-2.5 ${
              isDark
                ? 'bg-amber-950/20 border-amber-800/50 text-amber-300'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
            <div className="text-[11px] leading-tight">
              Staff: <strong>{currentStaffName}</strong> • Tables {assignedTablesRange} will be covered by floor captains. Urgent alerts paused.
            </div>
          </div>

          {/* Duration Selector */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-2 text-slate-400">
              Select Break Duration
            </label>
            <div className="grid grid-cols-3 gap-2">
              {breakOptions.map((opt) => {
                const isSelected = selectedMinutes === opt.minutes;
                return (
                  <button
                    key={opt.minutes}
                    type="button"
                    onClick={() => setSelectedMinutes(opt.minutes)}
                    className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-between gap-1 relative ${
                      isSelected
                        ? 'bg-gradient-to-b from-amber-500/20 to-orange-500/30 border-orange-500 text-orange-400 shadow-sm'
                        : isDark
                        ? 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {opt.recommended && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-orange-500 text-white shadow-xs">
                        Popular
                      </span>
                    )}
                    <span className="text-xl">{opt.icon}</span>
                    <span className="font-black text-xs">{opt.title}</span>
                    <span className="text-[10px] opacity-75 font-mono font-bold">
                      {opt.minutes} Mins
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional notes */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-1.5 text-slate-400">
              Break Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Taking 15m chai break near staff pantry"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 transition ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500'
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          {/* Quick Notice */}
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
            <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>You can click "Resume Duty" at any moment to return early.</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          className={`p-4 border-t flex items-center justify-end gap-2.5 ${
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
            onClick={() => onStartBreak(selectedMinutes, notes)}
            className="px-5 py-2 rounded-xl font-black text-xs text-white bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 shadow-md shadow-orange-950/40 flex items-center gap-1.5 transition transform hover:scale-102"
          >
            <Coffee className="w-4 h-4" />
            <span>Start {selectedMinutes}m Tea Break</span>
          </button>
        </div>
      </div>
    </div>
  );
};
