import React from 'react';
import { IGroupSummaryUI, GroupBookingStatus } from '@spicehub/ui';
import { Briefcase, RefreshCw, Plus, Search, X } from 'lucide-react';

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
    <div className="bg-white border-b border-slate-200 px-6 py-6 text-slate-900 shadow-xs">
      {/* Title & Primary Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shadow-xs">
              <Briefcase className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Corporate Bookings & Master Folio Split Engine
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Split Folio Active
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Enterprise group room blocks, corporate GST invoices, and automated incidental split routing.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRefreshClick}
            disabled={loading}
            className="btn-glass-green-subtle px-3.5 py-2 rounded-xl text-emerald-800 text-sm font-semibold transition-all flex items-center gap-2 disabled:opacity-50"
            title="Refresh groups"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={onNewBookingClick}
            className="btn-glass-green text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Group Booking</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">
            Total Group Bookings
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {summary.totalGroups}
          </div>
          <div className="text-xs text-slate-400 mt-1">Active corporate accounts</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">
            Rooms Blocked
          </div>
          <div className="text-2xl font-bold text-sky-600">
            {summary.totalRoomsBlocked}
          </div>
          <div className="text-xs text-slate-400 mt-1">Across all group contracts</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">
            Rooms In-House
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {summary.totalRoomsCheckedIn}
            <span className="text-xs text-slate-400 font-normal ml-1">
              ({summary.totalRoomsBlocked ? Math.round((summary.totalRoomsCheckedIn / summary.totalRoomsBlocked) * 100) : 0}%)
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-1">Checked-in & occupied</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">
            Corporate Outstanding
          </div>
          <div className="text-2xl font-bold text-amber-600">
            ₹{summary.totalCorporateDue.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-400 mt-1">Unsettled company folios</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {statusFilters.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onFilterChange(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                filterStatus === tab.key
                  ? 'btn-glass-green text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-slate-200'
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
