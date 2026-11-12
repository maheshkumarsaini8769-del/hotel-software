import React from 'react';
import { IRosterMetricsUI, StaffRosterHelper } from '@spicehub/ui';
import { RefreshCw, Clock, Coins, Plus, CalendarDays, Timer } from 'lucide-react';

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
    <div className="bg-white border-b border-slate-200 px-6 py-6 text-slate-900 shadow-xs">
      {/* Title & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              Staff Shift Rostering, Attendance & Tip Pool Engine
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Shift 29 • Workforce & Tips
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Weekly Departmental Roster, PIN Clock-in/out Terminal, Overtime Tracking & FOH/BOH Gratuity Tip Pool.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs border border-slate-200 transition-all disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={onOpenClockTerminal}
            className="btn-glass-green px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2"
          >
            <Clock className="w-4 h-4" />
            <span>PIN Clock Terminal</span>
          </button>
          <button
            type="button"
            onClick={onOpenTipPoolModal}
            className="btn-glass-green-subtle px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2"
          >
            <Coins className="w-4 h-4" />
            <span>Tip Pool Split</span>
          </button>
          <button
            type="button"
            onClick={onOpenNewShiftModal}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider border border-slate-200 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Shift</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col justify-between shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Scheduled Shifts</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-slate-900">{metrics.totalScheduledShifts}</span>
            <span className="text-[10px] text-slate-400">Today</span>
          </div>
        </div>

        <div className="bg-emerald-50/60 border border-emerald-200 p-4 rounded-2xl flex flex-col justify-between shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Active Clocked-In</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-emerald-700">{metrics.activeClockedInCount}</span>
            <span className="text-[10px] text-emerald-600">On duty right now</span>
          </div>
        </div>

        <div className="bg-rose-50/60 border border-rose-200 p-4 rounded-2xl flex flex-col justify-between shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-800">Late Arrivals</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-rose-600">{metrics.lateArrivalsCount}</span>
            <span className="text-[10px] text-rose-500">&gt; 10 min grace</span>
          </div>
        </div>

        <div className="bg-sky-50/60 border border-sky-200 p-4 rounded-2xl flex flex-col justify-between shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-sky-800">Total Hours Today</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-sky-700">{metrics.totalHoursWorkedToday}h</span>
            <span className="text-[10px] text-sky-600">Accumulated</span>
          </div>
        </div>

        <div className="bg-amber-50/60 border border-amber-200 p-4 rounded-2xl flex flex-col justify-between shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">Today's Tip Pool</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-amber-700">
              {StaffRosterHelper.formatCurrency(metrics.todayTipsPool)}
            </span>
            <span className="text-[10px] text-amber-600">Collected</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-0">
        <button
          type="button"
          onClick={() => onTabChange('ROSTER')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'ROSTER'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>Shift Roster & Schedule Planner</span>
        </button>
        <button
          type="button"
          onClick={() => onTabChange('ATTENDANCE')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'ATTENDANCE'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Timer className="w-4 h-4" />
          <span>Clock Attendance & Overtime Audit</span>
        </button>
        <button
          type="button"
          onClick={() => onTabChange('TIP_POOL')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'TIP_POOL'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Gratuity Tip Pool Distribution</span>
        </button>
      </div>
    </div>
  );
};
