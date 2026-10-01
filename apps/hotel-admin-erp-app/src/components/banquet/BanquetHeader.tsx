import React from 'react';
import { IBanquetMetricsUI, BanquetBookingStatus, BanquetTimeSlot } from '@spicehub/ui';

interface BanquetHeaderProps {
  metrics: IBanquetMetricsUI;
  filterStatus: string;
  onFilterChange: (status: string) => void;
  filterSlot: string;
  onSlotChange: (slot: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onNewBookingClick: () => void;
  onRefreshClick: () => void;
  loading: boolean;
}

export const BanquetHeader: React.FC<BanquetHeaderProps> = ({
  metrics,
  filterStatus,
  onFilterChange,
  filterSlot,
  onSlotChange,
  searchQuery,
  onSearchChange,
  onNewBookingClick,
  onRefreshClick,
  loading,
}) => {
  const statusTabs = [
    { key: 'ALL', label: 'All Functions' },
    { key: BanquetBookingStatus.CONFIRMED, label: 'Confirmed' },
    { key: BanquetBookingStatus.IN_PROGRESS, label: 'Live In-Progress' },
    { key: BanquetBookingStatus.PROVISIONAL, label: 'Provisional' },
    { key: BanquetBookingStatus.COMPLETED, label: 'Completed' },
  ];

  const slotTabs = [
    { key: 'ALL', label: 'All Slots' },
    { key: BanquetTimeSlot.MORNING, label: 'Morning' },
    { key: BanquetTimeSlot.EVENING, label: 'Evening' },
    { key: BanquetTimeSlot.FULL_DAY, label: 'Full Day' },
  ];

  return (
    <div className="bg-[#0b0e14] border-b border-amber-500/20 px-6 py-6 text-zinc-100">
      {/* Top Title & CTA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-amber-400 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.8)]" />
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Banquet & Event Operations Manager
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
              Shift 22
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Luxury ballroom bookings, Function Prospectus (BEO) coordination, catering packages, and event folios.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRefreshClick}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/60 text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <svg
              className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : 'text-zinc-400'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            onClick={onNewBookingClick}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-sm shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>+ Book Event / Banquet</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mb-6">
        <div className="bg-[#121721] p-4 rounded-xl border border-zinc-800/80 shadow-inner">
          <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-1">
            Total Events
          </div>
          <div className="text-2xl font-black text-amber-400">
            {metrics.totalEvents}
          </div>
          <div className="text-xs text-zinc-500 mt-1">Booked contracts</div>
        </div>

        <div className="bg-[#121721] p-4 rounded-xl border border-zinc-800/80 shadow-inner">
          <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-1">
            Upcoming Functions
          </div>
          <div className="text-2xl font-black text-sky-400">
            {metrics.upcomingEventsCount}
          </div>
          <div className="text-xs text-zinc-500 mt-1">Next 30 days</div>
        </div>

        <div className="bg-[#121721] p-4 rounded-xl border border-zinc-800/80 shadow-inner">
          <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-1">
            Guaranteed Pax
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {metrics.totalPaxExpected.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-zinc-500 mt-1">Catering headcount</div>
        </div>

        <div className="bg-[#121721] p-4 rounded-xl border border-zinc-800/80 shadow-inner">
          <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-1">
            Contracted Revenue
          </div>
          <div className="text-2xl font-black text-zinc-200">
            ₹{metrics.totalRevenueContracted.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-zinc-500 mt-1">Hall + Catering + GST</div>
        </div>

        <div className="bg-[#121721] p-4 rounded-xl border border-zinc-800/80 shadow-inner">
          <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-1">
            Banquet Due Balance
          </div>
          <div className="text-2xl font-black text-amber-300">
            ₹{metrics.totalBalanceDue.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-amber-500/80 mt-1">Pending settlement</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 border-t border-zinc-800/60">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-[#121721] p-1 rounded-xl border border-zinc-800">
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => onFilterChange(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  filterStatus === tab.key
                    ? 'bg-amber-500 text-zinc-950 shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Time Slot Filter */}
          <div className="flex items-center gap-1 bg-[#121721] p-1 rounded-xl border border-zinc-800">
            {slotTabs.map((slot) => (
              <button
                key={slot.key}
                onClick={() => onSlotChange(slot.key)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all ${
                  filterSlot === slot.key
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {slot.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative min-w-[280px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search code, event, organizer, venue..."
            className="w-full bg-[#121721] border border-zinc-700/60 rounded-xl px-3.5 py-1.5 pl-9 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/60"
          />
          <svg
            className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-2 text-zinc-500 hover:text-zinc-300 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
