import React from 'react';
import { IGroupSummaryUI, GroupBookingStatus } from '@spicehub/ui';

interface CorporateHeaderProps {
  summary: IGroupSummaryUI;
  filterStatus: string;
  onFilterChange: (status: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNewBookingClick: () => void;
  onRefreshClick: () => void;
  loading: boolean;
}

export const CorporateHeader: React.FC<CorporateHeaderProps> = ({
  summary,
  filterStatus,
  onFilterChange,
  searchQuery,
  onSearchChange,
  onNewBookingClick,
  onRefreshClick,
  loading,
}) => {
  const statusFilters = [
    { key: 'ALL', label: 'All Groups' },
    { key: GroupBookingStatus.CONFIRMED, label: 'Confirmed' },
    { key: GroupBookingStatus.PARTIALLY_CHECKED_IN, label: 'Partial Check-In' },
    { key: GroupBookingStatus.FULLY_CHECKED_IN, label: 'Fully In-House' },
    { key: GroupBookingStatus.COMPLETED, label: 'Completed' },
  ];

  return (
    <div className="bg-[#0b0e14] border-b border-amber-500/20 px-6 py-6 text-zinc-100">
      {/* Title & Primary Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-amber-400 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.8)]" />
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Corporate Bookings & Master Folio Split Engine
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
              Shift 21
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Enterprise group room blocks, corporate GST invoices, and automated incidental split routing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRefreshClick}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/60 text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50"
            title="Refresh groups"
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
            <span>+ New Group Booking</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#121721] p-4 rounded-xl border border-zinc-800/80 shadow-inner">
          <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-1">
            Total Group Bookings
          </div>
          <div className="text-2xl font-black text-amber-400">
            {summary.totalGroups}
          </div>
          <div className="text-xs text-zinc-500 mt-1">Active corporate accounts</div>
        </div>

        <div className="bg-[#121721] p-4 rounded-xl border border-zinc-800/80 shadow-inner">
          <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-1">
            Rooms Blocked
          </div>
          <div className="text-2xl font-black text-sky-400">
            {summary.totalRoomsBlocked}
          </div>
          <div className="text-xs text-zinc-500 mt-1">Across all group contracts</div>
        </div>

        <div className="bg-[#121721] p-4 rounded-xl border border-zinc-800/80 shadow-inner">
          <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-1">
            Rooms In-House
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {summary.totalRoomsCheckedIn}
            <span className="text-xs text-zinc-500 font-normal ml-1">
              ({summary.totalRoomsBlocked ? Math.round((summary.totalRoomsCheckedIn / summary.totalRoomsBlocked) * 100) : 0}%)
            </span>
          </div>
          <div className="text-xs text-zinc-500 mt-1">Checked-in & occupied</div>
        </div>

        <div className="bg-[#121721] p-4 rounded-xl border border-zinc-800/80 shadow-inner">
          <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-1">
            Corporate Outstanding
          </div>
          <div className="text-2xl font-black text-amber-300">
            ₹{summary.totalCorporateDue.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-amber-500/80 mt-1">Unsettled company folios</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 border-t border-zinc-800/60">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {statusFilters.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onFilterChange(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                filterStatus === tab.key
                  ? 'bg-amber-500 text-zinc-950 shadow-md'
                  : 'bg-zinc-900/90 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/90 border border-zinc-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[280px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search group code, company, guest..."
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
