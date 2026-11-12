import React from 'react';
import { HousekeepingSummary } from '@spicehub/ui';
import { RoomStatus } from '@spicehub/shared-types';
import { Sparkles, RefreshCw, Droplets, CheckCircle2, Clock, AlertTriangle, AlertOctagon, Brush } from 'lucide-react';

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
  onOpenNewTaskModal?: () => void;
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
  onOpenNewTaskModal,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Brand / Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">Housekeeping & Room Turnaround</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                Live Operations
              </span>
            </div>
            <p className="text-xs text-slate-500">Real-time room sanitization, attendant timers & luxury minibar audit</p>
          </div>
        </div>

        {/* Eco Badge, New Task & Refresh */}
        <div className="flex items-center gap-2.5">
          {ecoWaterSavedLiters > 0 && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs shadow-xs">
              <Droplets className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                <strong className="font-semibold text-emerald-900">{ecoWaterSavedLiters}L</strong> Water Saved
              </span>
            </div>
          )}
          {onOpenNewTaskModal && (
            <button
              onClick={onOpenNewTaskModal}
              id="btn-new-cleaning-task"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm active:scale-95 transition-all cursor-pointer"
              title="Create New Cleaning Task"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>+ New Task</span>
            </button>
          )}
          <button
            onClick={onRefresh}
            className="btn-glass-green flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer shadow-sm active:scale-95"
            title="Refresh Housekeeping Board"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Board</span>
          </button>
        </div>
      </div>

      {/* Metric Counters Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 mt-4">
        <div
          onClick={() => onSelectStatus('ALL')}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            selectedStatus === 'ALL'
              ? 'bg-emerald-50 border-emerald-400 text-emerald-950 shadow-xs ring-1 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="text-[11px] font-medium text-slate-500">Total Rooms</div>
          <div className="text-xl font-bold text-slate-900 mt-0.5">{summary.total}</div>
        </div>

        <div
          onClick={() => onSelectStatus(RoomStatus.AVAILABLE)}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            selectedStatus === RoomStatus.AVAILABLE
              ? 'bg-emerald-50 border-emerald-400 text-emerald-950 shadow-xs ring-1 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="text-[11px] font-medium text-emerald-700 flex items-center justify-between">
            <span>Ready Clean</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-700 mt-0.5">{summary.clean}</div>
        </div>

        <div
          onClick={() => onSelectStatus(RoomStatus.DIRTY)}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            selectedStatus === RoomStatus.DIRTY
              ? 'bg-amber-50 border-amber-400 text-amber-950 shadow-xs ring-1 ring-amber-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="text-[11px] font-medium text-amber-700 flex items-center justify-between">
            <span>Dirty / Turnaround</span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-amber-800 mt-0.5">{summary.dirty}</div>
        </div>

        <div
          onClick={() => onSelectStatus(RoomStatus.CLEANING)}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            selectedStatus === RoomStatus.CLEANING
              ? 'bg-blue-50 border-blue-400 text-blue-950 shadow-xs ring-1 ring-blue-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="text-[11px] font-medium text-blue-700 flex items-center justify-between">
            <span>In Cleaning</span>
            <Brush className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-blue-800 mt-0.5">{summary.cleaning}</div>
        </div>

        <div
          onClick={() => onSelectStatus(RoomStatus.INSPECTION)}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            selectedStatus === RoomStatus.INSPECTION
              ? 'bg-sky-50 border-sky-400 text-sky-950 shadow-xs ring-1 ring-sky-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="text-[11px] font-medium text-sky-700 flex items-center justify-between">
            <span>Awaiting Inspect</span>
            <AlertTriangle className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <div className="text-xl font-bold text-sky-900 mt-0.5">{summary.inspection}</div>
        </div>

        <div
          onClick={() => onSelectStatus(RoomStatus.OUT_OF_SERVICE)}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            selectedStatus === RoomStatus.OUT_OF_SERVICE
              ? 'bg-rose-50 border-rose-400 text-rose-950 shadow-xs ring-1 ring-rose-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="text-[11px] font-medium text-rose-700 flex items-center justify-between">
            <span>Out of Order</span>
            <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-xl font-bold text-rose-800 mt-0.5">{summary.outOfService}</div>
        </div>
      </div>

      {/* Filters Bar: Floor selector & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-200">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => onSelectFloor('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              selectedFloor === 'ALL'
                ? 'btn-glass-green'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            All Floors
          </button>
          {floors.map((floor) => (
            <button
              key={floor}
              onClick={() => onSelectFloor(floor)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedFloor === floor
                  ? 'btn-glass-green'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-slate-200'
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
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
