import React, { useState } from 'react';
import {
  Users,
  ArrowRightLeft,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Send,
  ShieldCheck,
  Check
} from 'lucide-react';
import { WaiterStaffProfile, getHotelAdminAllocatedWaiters } from './WaiterLoginScreen';

export interface DelegatableTask {
  type: 'REQUEST' | 'PICKUP' | 'TABLE' | 'GENERAL';
  id?: string;
  title: string;
  tableNumber: string;
  details?: string;
}

export interface DelegateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: DelegatableTask | null;
  currentStaff: WaiterStaffProfile;
  isDark: boolean;
  onConfirmDelegation: (targetWaiter: WaiterStaffProfile, reason: string, task: DelegatableTask) => void;
}

export const DelegateTaskModal: React.FC<DelegateTaskModalProps> = ({
  isOpen,
  onClose,
  task,
  currentStaff,
  isDark,
  onConfirmDelegation,
}) => {
  const allWaiters = getHotelAdminAllocatedWaiters();
  // Filter out the current waiter so only colleague waiters are displayed
  const colleagues = allWaiters.filter((w) => w.staffId !== currentStaff.staffId);

  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    colleagues[0]?.staffId || 'W-101'
  );

  const [reason, setReason] = useState<string>(
    'Currently busy serving another table (दूसरी टेबल अटेंड कर रहा हूँ)'
  );
  const [customNote, setCustomNote] = useState<string>('');

  if (!isOpen || !task) return null;

  const selectedColleague = colleagues.find((c) => c.staffId === selectedStaffId) || colleagues[0];

  const presetReasons = [
    'Currently busy serving another table (दूसरी टेबल अटेंड कर रहा हूँ)',
    'Taking long food order on table (ऑर्डर लेने में व्यस्त हूँ)',
    'High guest rush in assigned zone (भीड़ ज्यादा है)',
    'Guest requested quick assistance (तुरंत सहायता चाहिए)',
  ];

  const handleConfirm = () => {
    if (!selectedColleague) return;
    const finalReason = customNote.trim() ? `${reason} - ${customNote.trim()}` : reason;
    onConfirmDelegation(selectedColleague, finalReason, task);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
      <div
        className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden transition-all duration-200 transform scale-100 ${
          isDark
            ? 'bg-[#121520] border-orange-500/40 text-slate-100'
            : 'bg-white border-orange-300 text-slate-800'
        }`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 p-4 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-xl shadow-inner">
              <ArrowRightLeft className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  Delegate Request (दूसरे वेटर को सौंपें)
                </h2>
              </div>
              <p className="text-xs text-amber-100">
                You are busy: pass this task to an on-duty colleague waiter
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
          {/* Active Task Info Card */}
          <div
            className={`p-3.5 rounded-xl border space-y-1.5 ${
              isDark
                ? 'bg-slate-900/80 border-slate-800 text-slate-200'
                : 'bg-orange-50/70 border-orange-200 text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-orange-500 uppercase tracking-wider font-mono">
                {task.type === 'REQUEST' ? '🛎️ Guest Call' : task.type === 'PICKUP' ? '🍲 Food Ready Pickup' : '🪑 Table Task'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-black">
                {task.tableNumber}
              </span>
            </div>
            <div className="text-sm font-black text-white">
              {task.title}
            </div>
            {task.details && (
              <div className="text-[11px] text-slate-400">
                {task.details}
              </div>
            )}
            <div className="text-[10px] text-amber-400 font-semibold flex items-center gap-1 pt-0.5">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>Assigned to {currentStaff.name} (Tables {currentStaff.assignedTableStart}-{currentStaff.assignedTableEnd})</span>
            </div>
          </div>

          {/* Select Colleague Waiter */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-2 text-slate-400 flex items-center justify-between">
              <span>Choose Available Colleague (उपलब्ध सहयोगी वेटर)</span>
              <span className="text-emerald-400 text-[10px]">🟢 On Duty Staff</span>
            </label>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {colleagues.map((colleague) => {
                const isSelected = colleague.staffId === selectedStaffId;
                return (
                  <div
                    key={colleague.staffId}
                    onClick={() => setSelectedStaffId(colleague.staffId)}
                    className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                      isSelected
                        ? isDark
                          ? 'bg-orange-500/15 border-orange-500/80 text-white shadow-sm'
                          : 'bg-orange-50 border-orange-500 text-orange-950 shadow-xs'
                        : isDark
                        ? 'bg-slate-900/50 border-slate-800 hover:bg-slate-800/60 text-slate-300'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={colleague.avatar}
                        alt={colleague.name}
                        className="w-9 h-9 rounded-full object-cover border border-white/10"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-xs">{colleague.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                            {colleague.staffId}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                          <span>{colleague.role}</span>
                          <span>•</span>
                          <span className="text-orange-400 font-bold">Tables {colleague.assignedTableStart}-{colleague.assignedTableEnd}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="On Duty" />
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-slate-700" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reason for Reassignment */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-1.5 text-slate-400">
              Handover Reason (सौंपने का कारण)
            </label>
            <div className="space-y-1.5">
              {presetReasons.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition ${
                    reason === r
                      ? isDark
                        ? 'bg-amber-500/20 border-amber-500/70 text-amber-300'
                        : 'bg-amber-100 border-amber-400 text-amber-900'
                      : isDark
                      ? 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  • {r}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Optional custom note (e.g. Guest in hurry, take care)..."
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              className={`w-full mt-2 px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 transition ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-white placeholder:text-slate-600'
                  : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
              }`}
            />
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
            onClick={handleConfirm}
            className="px-5 py-2.5 rounded-xl font-black text-xs text-white bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 hover:from-orange-500 hover:to-amber-500 shadow-md shadow-orange-950/40 flex items-center gap-1.5 transition transform hover:scale-102"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Request to {selectedColleague?.name || 'Colleague'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
