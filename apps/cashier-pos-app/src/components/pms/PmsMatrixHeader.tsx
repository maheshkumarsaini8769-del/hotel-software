import React from 'react';
import { MatrixKpis } from '../../../../../packages/ui/src/pms/types';

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
    <div className="bg-slate-950 border-b border-slate-850 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 select-none">
      {/* Brand & Date Navigation Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center space-x-2 mr-2">
          <span className="text-2xl">🏨</span>
          <div>
            <h1 className="text-base font-extrabold text-white tracking-wide uppercase">Room Matrix</h1>
            <p className="text-[10px] text-amber-400 font-semibold tracking-wider uppercase">Live PMS Calendar Grid</p>
          </div>
        </div>

        {/* Date Pager */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-inner">
          <button
            onClick={() => onNavigate(-7)}
            title="Previous 7 Days"
            className="px-2.5 py-1 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition active:scale-95"
          >
            ◀ 7d
          </button>
          <button
            onClick={() => onNavigate(-1)}
            title="Previous Day"
            className="px-2 py-1 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition active:scale-95"
          >
            ◀
          </button>

          <button
            onClick={onJumpToToday}
            className="px-3 py-1 text-xs font-bold text-amber-300 hover:bg-amber-500/10 rounded-lg border border-amber-500/30 mx-1 transition active:scale-95"
          >
            Today
          </button>

          <button
            onClick={() => onNavigate(1)}
            title="Next Day"
            className="px-2 py-1 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition active:scale-95"
          >
            ▶
          </button>
          <button
            onClick={() => onNavigate(7)}
            title="Next 7 Days"
            className="px-2.5 py-1 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition active:scale-95"
          >
            7d ▶
          </button>
        </div>

        <span className="text-xs font-semibold text-slate-300 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
          From {formattedStart}
        </span>

        {/* View Span Toggle (7 / 14 / 30 Days) */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-xs font-semibold">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => onDaysChange(d)}
              className={`px-3 py-1 rounded-lg transition ${
                days === d
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {d}D
            </button>
          ))}
        </div>
      </div>

      {/* KPI Chips & Luxury Golden Action Button */}
      <div className="flex flex-wrap items-center gap-3">
        {kpis && (
          <div className="hidden lg:flex items-center space-x-3 bg-slate-900/90 border border-slate-800 px-3.5 py-1.5 rounded-xl shadow-inner text-xs">
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400">Occupancy:</span>
              <span className="font-extrabold text-amber-400">{kpis.occupancyRate}%</span>
            </div>
            <div className="h-3 w-px bg-slate-700" />
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400">Arrivals:</span>
              <span className="font-bold text-emerald-400">{kpis.arrivalsToday}</span>
            </div>
            <div className="h-3 w-px bg-slate-700" />
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400">Departures:</span>
              <span className="font-bold text-sky-400">{kpis.departuresToday}</span>
            </div>
          </div>
        )}

        {onRefresh && (
          <button
            onClick={onRefresh}
            title="Refresh Grid"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl border border-slate-800 transition active:scale-95"
          >
            🔄
          </button>
        )}

        {/* Luxury Gold Call-to-Action */}
        <button
          onClick={onNewReservation}
          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-amber-950/40 transition active:scale-95 flex items-center space-x-1.5"
        >
          <span>✨</span>
          <span>New Reservation</span>
        </button>
      </div>
    </div>
  );
};
