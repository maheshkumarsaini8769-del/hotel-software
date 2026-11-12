import React from 'react';
import { ReservationTabMode, TableReservationSummary, RoomArrivalsSummary } from '@spicehub/ui';
import { UtensilsCrossed, Bell, Plus, RefreshCw, Calendar, Search, X } from 'lucide-react';

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
    <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Brand & Dual Tab Selector */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-xs">
            {activeTab === 'DINING' ? <UtensilsCrossed className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">Live Reservation Manager</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                Dual Dispatch
              </span>
            </div>
            <p className="text-xs text-slate-500">Host Maitre d&apos; table seating & front-desk room arrivals</p>
          </div>
        </div>

        {/* Tab Switcher & Action Buttons */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200/80">
            <button
              onClick={() => onTabChange('DINING')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'DINING'
                  ? 'btn-glass-green text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>Dining Seating</span>
            </button>
            <button
              onClick={() => onTabChange('ROOMS')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ROOMS'
                  ? 'btn-glass-green text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Room Arrivals</span>
            </button>
          </div>

          {activeTab === 'DINING' && (
            <button
              onClick={onOpenNewDiningModal}
              className="btn-glass-green px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Table Booking</span>
            </button>
          )}

          <button
            onClick={onRefresh}
            className="p-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-all text-xs cursor-pointer active:scale-95 shadow-2xs"
            title="Refresh Live Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Dynamic Summary Cards Bar */}
      {activeTab === 'DINING' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 mt-4">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-medium text-slate-500">Total Bookings</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{diningSummary.totalReservations}</div>
          </div>
          <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200 shadow-2xs">
            <div className="text-[11px] font-medium text-amber-800">Expected Covers</div>
            <div className="text-xl font-bold text-amber-700 mt-0.5">{diningSummary.totalCovers} Guests</div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-medium text-slate-600 flex items-center justify-between">
              <span>Confirmed Upcoming</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{diningSummary.confirmed}</div>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200 shadow-2xs">
            <div className="text-[11px] font-medium text-emerald-800 flex items-center justify-between">
              <span>Seated Active</span>
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            </div>
            <div className="text-xl font-bold text-emerald-700 mt-0.5">{diningSummary.seated}</div>
          </div>
          <div className="p-3 rounded-2xl bg-rose-50/60 border border-rose-200 shadow-2xs">
            <div className="text-[11px] font-medium text-rose-800 flex items-center justify-between">
              <span>No-Show / Cancel</span>
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            </div>
            <div className="text-xl font-bold text-rose-700 mt-0.5">
              {diningSummary.noShow + diningSummary.cancelled}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 mt-4">
          <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200 shadow-2xs">
            <div className="text-[11px] font-medium text-amber-800">Today&apos;s Arrivals</div>
            <div className="text-xl font-bold text-amber-700 mt-0.5">{roomsSummary.totalArrivals}</div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-medium text-slate-600 flex items-center justify-between">
              <span>Pending Arrival</span>
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            </div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{roomsSummary.pendingArrivals}</div>
          </div>
          <div className="p-3 rounded-2xl bg-rose-50/60 border border-rose-200 shadow-2xs">
            <div className="text-[11px] font-medium text-rose-800 flex items-center justify-between">
              <span>Unassigned Rooms</span>
              {roomsSummary.unassignedCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              )}
            </div>
            <div className="text-xl font-bold text-rose-700 mt-0.5">{roomsSummary.unassignedCount}</div>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200 shadow-2xs">
            <div className="text-[11px] font-medium text-emerald-800 flex items-center justify-between">
              <span>In-House Guests</span>
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            </div>
            <div className="text-xl font-bold text-emerald-700 mt-0.5">{roomsSummary.inHouseCount}</div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-medium text-slate-500">Departures Today</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{roomsSummary.totalDepartures}</div>
          </div>
        </div>
      )}

      {/* Date & Search Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-200">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <label className="text-xs text-slate-600 font-semibold">Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-emerald-500 focus:bg-white transition"
          />
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={activeTab === 'DINING' ? 'Search guest, phone, table...' : 'Search guest, booking #, room #...'}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:bg-white transition"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
