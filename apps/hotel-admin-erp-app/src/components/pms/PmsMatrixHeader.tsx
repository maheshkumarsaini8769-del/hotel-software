import React from 'react';
import { MatrixKpis } from '@spicehub/ui';
import { Building2, RefreshCw, CalendarPlus } from 'lucide-react';

export interface PmsMatrixHeaderProps {
  startDate: string;
  days: number;
  kpis?: MatrixKpis;
  onNavigate: (deltaDays: number) => void;
  onJumpToToday: () => void;
  onDaysChange: (days: number) => void;
  onNewReservation: () => void;
  onRefresh?: () => void;
}

export const PmsMatrixHeader: React.FC<PmsMatrixHeaderProps> = ({
  startDate,
  days,
  kpis,
  onNavigate,
  onJumpToToday,
  onDaysChange,
  onNewReservation,
  onRefresh,
}) => {
  const formattedStart = new Date(startDate).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 select-none shadow-xs">
      {/* Brand & Date Navigation Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center space-x-2.5 mr-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight uppercase">Room Matrix</h1>
            <p className="text-[10px] text-emerald-700 font-semibold tracking-wider uppercase">Live PMS Calendar Grid</p>
          </div>
        </div>

        {/* Date Pager */}
        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1">
          <button
            onClick={() => onNavigate(-7)}
            title="Previous 7 Days"
            className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition active:scale-95 cursor-pointer font-medium"
          >
            ◀ 7d
          </button>
          <button
            onClick={() => onNavigate(-1)}
            title="Previous Day"
            className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition active:scale-95 cursor-pointer font-medium"
          >
            ◀
          </button>
          <span className="px-3 text-xs font-semibold text-slate-800 tracking-wide font-mono">
            {formattedStart}
          </span>
          <button
            onClick={() => onNavigate(1)}
            title="Next Day"
            className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition active:scale-95 cursor-pointer font-medium"
          >
            ▶
          </button>
          <button
            onClick={() => onNavigate(7)}
            title="Next 7 Days"
            className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition active:scale-95 cursor-pointer font-medium"
          >
            7d ▶
          </button>
        </div>

        {/* Jump to Today */}
        <button
          onClick={onJumpToToday}
          className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
        >
          Today
        </button>

        {/* Time Span Picker (7, 14, 30 Days) */}
        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 text-xs font-semibold">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => onDaysChange(d)}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                days === d
                  ? 'btn-glass-green'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Live KPIs Ribbon & Action Button */}
      <div className="flex flex-wrap items-center gap-3">
        {kpis && (
          <div className="hidden lg:flex items-center space-x-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-1.5 text-xs">
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500">Occupancy:</span>
              <span className="font-bold text-emerald-700">{kpis.occupancyRate}%</span>
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500">In-House:</span>
              <span className="font-bold text-slate-800">{(kpis as any).occupiedRooms ?? kpis.activeBookingsCount ?? 0}</span>
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500">Arrivals:</span>
              <span className="font-bold text-emerald-700">{kpis.arrivalsToday}</span>
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500">Departures:</span>
              <span className="font-bold text-slate-700">{kpis.departuresToday}</span>
            </div>
          </div>
        )}

        {onRefresh && (
          <button
            onClick={onRefresh}
            title="Refresh Grid"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}

        {/* Call-to-Action */}
        <button
          onClick={onNewReservation}
          className="btn-glass-green px-4 py-2 font-bold text-xs rounded-xl shadow-xs transition active:scale-95 flex items-center space-x-1.5 cursor-pointer"
        >
          <CalendarPlus className="w-4 h-4" />
          <span>New Reservation</span>
        </button>
      </div>
    </div>
  );
};
