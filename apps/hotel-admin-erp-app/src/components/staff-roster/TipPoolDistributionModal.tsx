import React, { useState } from 'react';
import { StaffRosterHelper, NumericInput } from '@spicehub/ui';
import { Coins, X } from 'lucide-react';

export interface TipStaffAllocationItem {
  staffName: string;
  department: string;
  hoursWorked: number;
}

interface TipPoolDistributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: any) => Promise<void>;
  loading: boolean;
  staffList?: TipStaffAllocationItem[];
}

export const TipPoolDistributionModal: React.FC<TipPoolDistributionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  loading,
  staffList = [],
}) => {
  const [totalTips, setTotalTips] = useState<number>(0);
  const [fohPercentage, setFohPercentage] = useState<number>(60);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const bohPercentage = 100 - fohPercentage;
  const fohPool = Math.round(totalTips * (fohPercentage / 100));
  const bohPool = Math.round(totalTips * (bohPercentage / 100));

  const activeStaffList = Array.isArray(staffList) ? staffList : [];
  const fohStaff = activeStaffList.filter(s => s.department.includes('FRONT') || s.department.includes('BAR'));
  const bohStaff = activeStaffList.filter(s => !s.department.includes('FRONT') && !s.department.includes('BAR'));
  const totalFohHours = fohStaff.reduce((acc, s) => acc + (s.hoursWorked || 0), 0) || 1;
  const totalBohHours = bohStaff.reduce((acc, s) => acc + (s.hoursWorked || 0), 0) || 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      totalTipsCollected: totalTips,
      fohPercentage,
      bohPercentage,
      notes: notes.trim() || undefined,
      customStaffHours: activeStaffList,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-3xl p-6 shadow-2xl text-slate-900 max-h-[90vh] flex flex-col animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-xs">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Daily Gratuity & Tip Pool Distribution
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Equitably distribute guest credit card & service charge tips across FOH waitstaff and BOH kitchen brigade.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
          {/* Tip Amount Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Total Shift / Daily Tips Collected (₹)
            </label>
            <NumericInput
              min="100"
              step="100"
              required
              value={totalTips}
              onChange={(e) => setTotalTips(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-lg font-bold font-mono text-emerald-700 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
            />
          </div>

          {/* Department Ratio Slider */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-sky-700">
                Front-of-House (FOH): {fohPercentage}%
              </span>
              <span className="font-bold text-amber-700">
                Kitchen Brigade (BOH): {bohPercentage}%
              </span>
            </div>

            <input
              type="range"
              min="30"
              max="80"
              step="5"
              value={fohPercentage}
              onChange={(e) => setFohPercentage(Number(e.target.value))}
              className="w-full accent-emerald-600"
            />

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <span className="text-[11px] text-sky-700 font-semibold uppercase block">FOH Pool Share</span>
                <span className="text-base font-bold text-slate-900 font-mono">
                  {StaffRosterHelper.formatCurrency(fohPool)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <span className="text-[11px] text-amber-700 font-semibold uppercase block">BOH Pool Share</span>
                <span className="text-base font-bold text-slate-900 font-mono">
                  {StaffRosterHelper.formatCurrency(bohPool)}
                </span>
              </div>
            </div>
          </div>

          {/* Staff Hours Table Preview */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
              Hours-Weighted Allocation Preview ({activeStaffList.length} Staff)
            </span>
            {activeStaffList.length === 0 ? (
              <div className="p-4 rounded-xl bg-white border border-slate-200 text-center text-xs text-slate-500 shadow-2xs">
                No active attendance clock-in logs recorded for today's shift. Tip pool will distribute automatically when staff clock out.
              </div>
            ) : (
              <div className="space-y-2">
                {activeStaffList.map((s, idx) => {
                  const isFoh = s.department.includes('FRONT') || s.department.includes('BAR');
                  const deptPool = isFoh ? fohPool : bohPool;
                  const totalDeptHours = isFoh ? totalFohHours : totalBohHours;
                  const estShare = Math.round((deptPool / totalDeptHours) * s.hoursWorked);

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs shadow-2xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900">{s.staffName}</span>
                        <span className="text-[10px] text-slate-500 ml-2 font-medium">({isFoh ? 'FOH' : 'BOH'})</span>
                      </div>
                      <div className="flex items-center gap-4 font-mono">
                        <span className="text-slate-500">{s.hoursWorked}h</span>
                        <strong className="text-emerald-700">{StaffRosterHelper.formatCurrency(estShare)}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Distribution Notes / Reason
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Saturday Night Dinner Service Tips. Approved by Shift Manager."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-glass-green px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
            >
              {loading ? 'Processing Split...' : 'Generate Tip Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
