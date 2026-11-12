import React from 'react';
import { IBanquetMetricsUI, BanquetBookingStatus, BanquetTimeSlot } from '@spicehub/ui';
import { PartyPopper, RefreshCw, Plus, Search, X } from 'lucide-react';

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
    <div className="bg-white border-b border-slate-200 px-6 py-6 text-slate-900 shadow-xs">
      {/* Top Title & CTA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shadow-xs">
              <PartyPopper className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Banquet & Event Operations Manager
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  BEO Operations Active
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Luxury ballroom bookings, Function Prospectus (BEO) coordination, catering packages, and event folios.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRefreshClick}
            disabled={loading}
            className="btn-glass-green-subtle px-3.5 py-2 rounded-xl text-emerald-800 text-sm font-semibold transition-all flex items-center gap-2 disabled:opacity-50"
            title="Refresh banquets"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={onNewBookingClick}
            className="btn-glass-green text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Book Event / Banquet</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">
            Total Events
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {metrics.totalEvents}
          </div>
          <div className="text-xs text-slate-400 mt-1">Booked contracts</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">
            Upcoming Functions
          </div>
          <div className="text-2xl font-bold text-sky-600">
            {metrics.upcomingEventsCount}
          </div>
          <div className="text-xs text-slate-400 mt-1">Next 30 days</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">
            Guaranteed Pax
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {metrics.totalPaxExpected.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-400 mt-1">Catering headcount</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">
            Contracted Revenue
          </div>
          <div className="text-2xl font-bold text-slate-900">
            ₹{metrics.totalRevenueContracted.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-400 mt-1">Hall + Catering + GST</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">
            Banquet Due Balance
          </div>
          <div className="text-2xl font-bold text-amber-600">
            ₹{metrics.totalBalanceDue.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-400 mt-1">Pending settlement</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t border-slate-100">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => onFilterChange(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  filterStatus === tab.key
                    ? 'btn-glass-green text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Time Slot Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {slotTabs.map((slot) => (
              <button
                key={slot.key}
                onClick={() => onSlotChange(slot.key)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all ${
                  filterSlot === slot.key
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
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
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 pl-9 pr-7 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
