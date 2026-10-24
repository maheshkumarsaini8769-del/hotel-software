import React from 'react';
import { ReservationTabMode, TableReservationSummary, RoomArrivalsSummary } from '@spicehub/ui';

interface ReservationHeaderProps {
  activeTab: ReservationTabMode;
  onTabChange: (tab: ReservationTabMode) => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  diningSummary: TableReservationSummary;
  roomsSummary: RoomArrivalsSummary;
  onOpenNewDiningModal: () => void;
  onRefresh: () => void;
}

export const ReservationHeader: React.FC<ReservationHeaderProps> = ({
  activeTab,
  onTabChange,
  selectedDate,
  onDateChange,
  searchQuery,
  onSearchChange,
  diningSummary,
  roomsSummary,
  onOpenNewDiningModal,
  onRefresh,
}) => {
  return (
    <header className="bg-slate-950/90 backdrop-blur-md border-b border-amber-500/20 px-6 py-4 sticky top-0 z-30 shadow-xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Brand & Dual Tab Selector */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-200 p-[1px] shadow-lg shadow-amber-500/10">
            <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
              <span className="text-xl">{activeTab === 'DINING' ? '🍽️' : '🛎️'}</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-wide">Live Reservation Manager</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30 uppercase">
                Dual Dispatch
              </span>
            </div>
            <p className="text-xs text-slate-400">Host Maitre d&apos; table seating & front-desk room arrivals</p>
          </div>
        </div>

        {/* Tab Switcher & Action Buttons */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex items-center gap-1 shadow-inner">
            <button
              onClick={() => onTabChange('DINING')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'DINING'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🍽️ Dining Seating
            </button>
            <button
              onClick={() => onTabChange('ROOMS')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'ROOMS'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🛎️ Room Arrivals
            </button>
          </div>

          {activeTab === 'DINING' && (
            <button
              onClick={onOpenNewDiningModal}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-950/40 transition-all cursor-pointer active:scale-95"
            >
              + New Table Booking
            </button>
          )}

          <button
            onClick={onRefresh}
            className="p-2 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-amber-500/40 text-slate-300 hover:text-white transition-all text-xs cursor-pointer active:scale-95"
            title="Refresh Live Data"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Dynamic Summary Cards Bar */}
      {activeTab === 'DINING' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 mt-4">
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-medium text-slate-400">Total Bookings</div>
            <div className="text-xl font-bold text-white mt-0.5">{diningSummary.totalReservations}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-medium text-amber-400">Expected Covers</div>
            <div className="text-xl font-bold text-amber-300 mt-0.5">{diningSummary.totalCovers} Guests</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-medium text-cyan-400 flex items-center justify-between">
              <span>Confirmed Upcoming</span>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            </div>
            <div className="text-xl font-bold text-cyan-300 mt-0.5">{diningSummary.confirmed}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-medium text-emerald-400 flex items-center justify-between">
              <span>Seated Active</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <div className="text-xl font-bold text-emerald-300 mt-0.5">{diningSummary.seated}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-medium text-rose-400 flex items-center justify-between">
              <span>No-Show / Cancel</span>
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            </div>
            <div className="text-xl font-bold text-rose-300 mt-0.5">
              {diningSummary.noShow + diningSummary.cancelled}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 mt-4">
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-medium text-amber-400">Today&apos;s Arrivals</div>
            <div className="text-xl font-bold text-amber-300 mt-0.5">{roomsSummary.totalArrivals}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-medium text-cyan-400 flex items-center justify-between">
              <span>Pending Arrival</span>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            </div>
            <div className="text-xl font-bold text-cyan-300 mt-0.5">{roomsSummary.pendingArrivals}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-medium text-rose-400 flex items-center justify-between">
              <span>Unassigned Rooms</span>
              {roomsSummary.unassignedCount > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
              )}
            </div>
            <div className="text-xl font-bold text-rose-400 mt-0.5">{roomsSummary.unassignedCount}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-medium text-emerald-400 flex items-center justify-between">
              <span>In-House Guests</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            </div>
            <div className="text-xl font-bold text-emerald-300 mt-0.5">{roomsSummary.inHouseCount}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-medium text-slate-400">Departures Today</div>
            <div className="text-xl font-bold text-white mt-0.5">{roomsSummary.totalDepartures}</div>
          </div>
        </div>
      )}

      {/* Date & Search Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-900">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 font-medium">Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/60"
          />
        </div>

        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={activeTab === 'DINING' ? 'Search guest, phone, table...' : 'Search guest, booking #, room #...'}
            className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
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
