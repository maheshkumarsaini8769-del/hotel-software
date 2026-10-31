import React from 'react';
import { MatrixKpis } from '@spicehub/ui';

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
        <div className="flex items-center space-x-2 mr-2">
          <span className="text-2xl">🏨</span>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 tracking-wide uppercase">Room Matrix</h1>
            <p className="text-[10px] text-blue-600 font-semibold tracking-wider uppercase">Live PMS Calendar Grid</p>
          </div>
        </div>

        {/* Date Pager */}
        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1">
          <button
            onClick={() => onNavigate(-7)}
            title="Previous 7 Days"
            className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition active:scale-95"
          >
            ◀ 7d
          </button>
          <button
            onClick={() => onNavigate(-1)}
            title="Previous Day"
            className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition active:scale-95"
          >
            ◀
          </button>

          <button
            onClick={onJumpToToday}
            className="px-3 py-1 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 mx-1 transition active:scale-95"
          >
            Today
          </button>

          <button
            onClick={() => onNavigate(1)}
            title="Next Day"
            className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition active:scale-95"
          >
            ▶
          </button>
          <button
            onClick={() => onNavigate(7)}
            title="Next 7 Days"
            className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition active:scale-95"
          >
            7d ▶
          </button>
        </div>

        <span className="text-xs font-semibold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
          From {formattedStart}
        </span>

        {/* View Span Toggle (7 / 14 / 30 Days) */}
        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-0.5 text-xs font-semibold">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => onDaysChange(d)}
              className={`px-3 py-1 rounded-lg transition ${
                days === d
                  ? 'bg-white text-blue-600 border border-slate-200 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {d}D
            </button>
          ))}
        </div>
      </div>

      {/* KPI Chips & Action Button */}
      <div className="flex flex-wrap items-center gap-3">
        {kpis && (
          <div className="hidden lg:flex items-center space-x-3 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl text-xs">
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500">Occupancy:</span>
              <span className="font-extrabold text-blue-600">{kpis.occupancyRate}%</span>
            </div>
            <div className="h-3 w-px bg-slate-200" />
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500">Arrivals:</span>
              <span className="font-bold text-emerald-600">{kpis.arrivalsToday}</span>
            </div>
            <div className="h-3 w-px bg-slate-200" />
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
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition active:scale-95"
          >
            🔄
          </button>
        )}

        {/* Call-to-Action */}
        <button
          onClick={onNewReservation}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 flex items-center space-x-1.5"
        >
          <span>✨</span>
          <span>New Reservation</span>
        </button>
      </div>
    </div>
  );
};
