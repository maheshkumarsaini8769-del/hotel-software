import React from 'react';
import { IRosterMetricsUI, StaffRosterHelper } from '@spicehub/ui';

interface StaffRosterHeaderProps {
  metrics: IRosterMetricsUI;
  activeTab: 'ROSTER' | 'ATTENDANCE' | 'TIP_POOL';
  onTabChange: (tab: 'ROSTER' | 'ATTENDANCE' | 'TIP_POOL') => void;
  onOpenClockTerminal: () => void;
  onOpenNewShiftModal: () => void;
  onOpenTipPoolModal: () => void;
  onRefresh: () => void;
  loading: boolean;
}

export const StaffRosterHeader: React.FC<StaffRosterHeaderProps> = ({
  metrics,
  activeTab,
  onTabChange,
  onOpenClockTerminal,
  onOpenNewShiftModal,
  onOpenTipPoolModal,
  onRefresh,
  loading,
}) => {
  return (
    <div className="bg-[#0b0e14] border-b border-cyan-500/20 px-6 py-6 text-zinc-100 shadow-xl">
      {/* Title & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_12px_rgba(6,182,212,0.8)]" />
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Staff Shift Rostering, Attendance & Tip Pool Engine
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              Shift 29 • Workforce & Tips
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Weekly Departmental Roster, PIN Clock-in/out Terminal, Overtime Tracking & FOH/BOH Gratuity Tip Pool.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-3">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs border border-zinc-700 transition-all disabled:opacity-50"
            title="Refresh"
          >
            🔄
          </button>
          <button
            type="button"
            onClick={onOpenClockTerminal}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-900/30 transition-all flex items-center gap-2"
          >
            <span>⏰</span> PIN Clock Terminal
          </button>
          <button
            type="button"
            onClick={onOpenTipPoolModal}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-900/30 transition-all flex items-center gap-2"
          >
            <span>💰</span> Tip Pool Split
          </button>
          <button
            type="button"
            onClick={onOpenNewShiftModal}
            className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs uppercase tracking-wider border border-zinc-700 transition-all flex items-center gap-2"
          >
            <span>+</span> Schedule Shift
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Scheduled Shifts</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-white">{metrics.totalScheduledShifts}</span>
            <span className="text-[10px] text-zinc-500">Today</span>
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-emerald-500/30 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Active Clocked-In</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-emerald-400">{metrics.activeClockedInCount}</span>
            <span className="text-[10px] text-emerald-500/80">On duty right now</span>
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-rose-500/30 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">Late Arrivals</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-rose-400">{metrics.lateArrivalsCount}</span>
            <span className="text-[10px] text-rose-500/80">&gt; 10 min grace</span>
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-blue-500/30 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Total Hours Today</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-blue-400">{metrics.totalHoursWorkedToday}h</span>
            <span className="text-[10px] text-blue-500/80">Accumulated</span>
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-amber-500/30 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Today's Tip Pool</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-amber-400">
              {StaffRosterHelper.formatCurrency(metrics.todayTipsPool)}
            </span>
            <span className="text-[10px] text-amber-500/80">Collected</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-0">
        <button
          type="button"
          onClick={() => onTabChange('ROSTER')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'ROSTER'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-500/10'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          📅 Shift Roster & Schedule Planner
        </button>
        <button
          type="button"
          onClick={() => onTabChange('ATTENDANCE')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'ATTENDANCE'
              ? 'border-blue-400 text-blue-400 bg-blue-500/10'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          ⏱️ Clock Attendance & Overtime Audit
        </button>
        <button
          type="button"
          onClick={() => onTabChange('TIP_POOL')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'TIP_POOL'
              ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          💰 Gratuity Tip Pool Distribution
        </button>
      </div>
    </div>
  );
};
