import React, { useState } from 'react';
import { StaffRosterHelper } from '@spicehub/ui';

interface TipPoolDistributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: any) => Promise<void>;
  loading: boolean;
}

export const TipPoolDistributionModal: React.FC<TipPoolDistributionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  loading,
}) => {
  const [totalTips, setTotalTips] = useState<number>(12000);
  const [fohPercentage, setFohPercentage] = useState<number>(60);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const bohPercentage = 100 - fohPercentage;
  const fohPool = Math.round(totalTips * (fohPercentage / 100));
  const bohPool = Math.round(totalTips * (bohPercentage / 100));

  const sampleStaffList = [
    { staffName: 'Rahul Verma (Head Captain)', department: 'FRONT_OF_HOUSE_SERVICE', hoursWorked: 8.5 },
    { staffName: 'Pooja Sharma (Senior Steward)', department: 'FRONT_OF_HOUSE_SERVICE', hoursWorked: 8.0 },
    { staffName: 'Karan Mehra (Bartender)', department: 'BAR_BEVERAGE', hoursWorked: 9.0 },
    { staffName: 'Chef Sanjeev (Sous Chef)', department: 'KITCHEN_CULINARY', hoursWorked: 9.0 },
    { staffName: 'Sunil Kumar (Commis I)', department: 'KITCHEN_CULINARY', hoursWorked: 8.5 },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      totalTipsCollected: totalTips,
      fohPercentage,
      bohPercentage,
      notes: notes.trim() || undefined,
      customStaffHours: sampleStaffList,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0f131a] border border-emerald-500/30 w-full max-w-2xl rounded-2xl p-6 shadow-2xl text-zinc-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400">💰</span> Daily Gratuity & Tip Pool Distribution
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Equitably distribute guest credit card & service charge tips across FOH waitstaff and BOH kitchen brigade.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 text-sm"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
          {/* Tip Amount Input */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
              Total Shift / Daily Tips Collected (₹)
            </label>
            <input
              type="number"
              min="100"
              step="100"
              required
              value={totalTips}
              onChange={(e) => setTotalTips(Number(e.target.value))}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-lg font-bold font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Department Ratio Slider */}
          <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-blue-400">
                Front-of-House (FOH): {fohPercentage}%
              </span>
              <span className="font-bold text-amber-400">
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
              className="w-full accent-emerald-500"
            />

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-2.5 rounded-xl bg-blue-950/20 border border-blue-500/30">
                <span className="text-[11px] text-blue-400 font-semibold uppercase block">FOH Pool Share</span>
                <span className="text-base font-bold text-white font-mono">
                  {StaffRosterHelper.formatCurrency(fohPool)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/30">
                <span className="text-[11px] text-amber-400 font-semibold uppercase block">BOH Pool Share</span>
                <span className="text-base font-bold text-white font-mono">
                  {StaffRosterHelper.formatCurrency(bohPool)}
                </span>
              </div>
            </div>
          </div>

          {/* Staff Hours Table Preview */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 block mb-2">
              Hours-Weighted Allocation Preview ({sampleStaffList.length} Staff)
            </span>
            <div className="space-y-2">
              {sampleStaffList.map((s, idx) => {
                const isFoh = s.department.includes('FRONT') || s.department.includes('BAR');
                const totalDeptHours = isFoh ? (8.5 + 8.0 + 9.0) : (9.0 + 8.5);
                const deptPool = isFoh ? fohPool : bohPool;
                const estShare = Math.round((deptPool / totalDeptHours) * s.hoursWorked);

                return (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-white">{s.staffName}</span>
                      <span className="text-[10px] text-zinc-500 ml-2">({isFoh ? 'FOH' : 'BOH'})</span>
                    </div>
                    <div className="flex items-center gap-4 font-mono">
                      <span className="text-zinc-400">{s.hoursWorked}h</span>
                      <strong className="text-emerald-400">{StaffRosterHelper.formatCurrency(estShare)}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
              Distribution Notes / Reason
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Saturday Night Dinner Service Tips. Approved by Shift Manager."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 shadow-lg shadow-emerald-900/30"
            >
              {loading ? 'Processing Split...' : 'Generate Tip Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
