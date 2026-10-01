import React from 'react';
import { HousekeepingSummary } from '@spicehub/ui';
import { RoomStatus } from '@spicehub/shared-types';

interface HousekeepingHeaderProps {
  summary: HousekeepingSummary;
  floors: number[];
  selectedFloor: number | 'ALL';
  selectedStatus: RoomStatus | 'ALL';
  searchQuery: string;
  ecoWaterSavedLiters: number;
  onSelectFloor: (floor: number | 'ALL') => void;
  onSelectStatus: (status: RoomStatus | 'ALL') => void;
  onSearchChange: (query: string) => void;
  onRefresh: () => void;
}

export const HousekeepingHeader: React.FC<HousekeepingHeaderProps> = ({
  summary,
  floors,
  selectedFloor,
  selectedStatus,
  searchQuery,
  ecoWaterSavedLiters,
  onSelectFloor,
  onSelectStatus,
  onSearchChange,
  onRefresh,
}) => {
  return (
    <header className="bg-slate-950/90 backdrop-blur-md border-b border-amber-500/20 px-6 py-4 sticky top-0 z-30 shadow-xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Brand / Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-200 p-[1px] shadow-lg shadow-amber-500/10">
            <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
              <span className="text-xl">✨</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-wide">Housekeeping & Room Turnaround</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30 uppercase">
                Live Operations
              </span>
            </div>
            <p className="text-xs text-slate-400">Real-time room sanitization, attendant timers & luxury minibar audit</p>
          </div>
        </div>

        {/* Eco Badge & Refresh */}
        <div className="flex items-center gap-3">
          {ecoWaterSavedLiters > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs shadow-inner">
              <span>🌿</span>
              <span>
                <strong className="font-semibold text-emerald-200">{ecoWaterSavedLiters}L</strong> Water Saved (Eco Tidy)
              </span>
            </div>
          )}
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-amber-500/40 text-slate-300 hover:text-white transition-all text-xs font-medium cursor-pointer shadow-sm active:scale-95"
            title="Refresh Housekeeping Board"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Sync Board
          </button>
        </div>
      </div>

      {/* Metric Counters Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 mt-4">
        <div
          onClick={() => onSelectStatus('ALL')}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            selectedStatus === 'ALL'
              ? 'bg-amber-500/10 border-amber-500/50 shadow-md shadow-amber-500/5'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-[11px] font-medium text-slate-400">Total Rooms</div>
          <div className="text-xl font-bold text-white mt-0.5">{summary.total}</div>
        </div>

        <div
          onClick={() => onSelectStatus(RoomStatus.AVAILABLE)}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            selectedStatus === RoomStatus.AVAILABLE
              ? 'bg-emerald-500/15 border-emerald-500/50 shadow-md shadow-emerald-500/5'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-[11px] font-medium text-emerald-400 flex items-center justify-between">
            <span>Ready Clean</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          </div>
          <div className="text-xl font-bold text-emerald-300 mt-0.5">{summary.clean}</div>
        </div>

        <div
          onClick={() => onSelectStatus(RoomStatus.DIRTY)}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            selectedStatus === RoomStatus.DIRTY
              ? 'bg-orange-500/15 border-orange-500/50 shadow-md shadow-orange-500/5'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-[11px] font-medium text-orange-400 flex items-center justify-between">
            <span>Dirty / Turnaround</span>
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
          </div>
          <div className="text-xl font-bold text-orange-300 mt-0.5">{summary.dirty}</div>
        </div>

        <div
          onClick={() => onSelectStatus(RoomStatus.CLEANING)}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            selectedStatus === RoomStatus.CLEANING
              ? 'bg-cyan-500/15 border-cyan-500/50 shadow-md shadow-cyan-500/5'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-[11px] font-medium text-cyan-400 flex items-center justify-between">
            <span>In Cleaning</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
          </div>
          <div className="text-xl font-bold text-cyan-300 mt-0.5">{summary.cleaning}</div>
        </div>

        <div
          onClick={() => onSelectStatus(RoomStatus.INSPECTION)}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            selectedStatus === RoomStatus.INSPECTION
              ? 'bg-amber-500/15 border-amber-500/50 shadow-md shadow-amber-500/5'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-[11px] font-medium text-amber-400 flex items-center justify-between">
            <span>Awaiting Inspect</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          </div>
          <div className="text-xl font-bold text-amber-300 mt-0.5">{summary.inspection}</div>
        </div>

        <div
          onClick={() => onSelectStatus(RoomStatus.OUT_OF_SERVICE)}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            selectedStatus === RoomStatus.OUT_OF_SERVICE
              ? 'bg-rose-500/15 border-rose-500/50 shadow-md shadow-rose-500/5'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-[11px] font-medium text-rose-400 flex items-center justify-between">
            <span>Out of Order</span>
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
          </div>
          <div className="text-xl font-bold text-rose-300 mt-0.5">{summary.outOfService}</div>
        </div>
      </div>

      {/* Filters Bar: Floor selector & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-900">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => onSelectFloor('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              selectedFloor === 'ALL'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            All Floors
          </button>
          {floors.map((floor) => (
            <button
              key={floor}
              onClick={() => onSelectFloor(floor)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedFloor === floor
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Floor {floor}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search room #, guest..."
            className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
