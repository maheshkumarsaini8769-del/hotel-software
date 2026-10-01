import React from 'react';
import { TableStatus } from '@spicehub/shared-types';
import { FloorPlanFilterOptions } from '@spicehub/ui';

export interface FloorSectionTabsProps {
  sections: string[];
  currentFilters: FloorPlanFilterOptions;
  onFilterChange: (filters: Partial<FloorPlanFilterOptions>) => void;
  stats: {
    total: number;
    available: number;
    occupied: number;
    billing: number;
    dirty: number;
    reserved: number;
    occupancyRate: number;
  };
}

export const FloorSectionTabs: React.FC<FloorSectionTabsProps> = ({
  sections,
  currentFilters,
  onFilterChange,
  stats,
}) => {
  return (
    <div className="space-y-4">
      {/* Top Stat Summary Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <div className="bg-slate-100 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="text-xs text-slate-500">Total Tables</div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">{stats.total}</div>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800">
          <div className="text-xs text-emerald-600">Available</div>
          <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{stats.available}</div>
        </div>
        <div className="bg-rose-50 dark:bg-rose-950/30 p-3 rounded-xl border border-rose-200 dark:border-rose-800">
          <div className="text-xs text-rose-600">Occupied</div>
          <div className="text-xl font-bold text-rose-700 dark:text-rose-400">{stats.occupied}</div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-200 dark:border-amber-800">
          <div className="text-xs text-amber-600">Billing</div>
          <div className="text-xl font-bold text-amber-700 dark:text-amber-400">{stats.billing}</div>
        </div>
        <div className="bg-orange-50 dark:bg-orange-950/30 p-3 rounded-xl border border-orange-200 dark:border-orange-800">
          <div className="text-xs text-orange-600">Dirty / Cleaning</div>
          <div className="text-xl font-bold text-orange-700 dark:text-orange-400">{stats.dirty}</div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-950/30 p-3 rounded-xl border border-purple-200 dark:border-purple-800">
          <div className="text-xs text-purple-600">Occupancy</div>
          <div className="text-xl font-bold text-purple-700 dark:text-purple-400">{stats.occupancyRate}%</div>
        </div>
      </div>

      {/* Section Tabs and Search Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Section Tabs */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1">
          <button
            onClick={() => onFilterChange({ section: 'ALL' })}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors shrink-0 ${
              (currentFilters.section === 'ALL' || !currentFilters.section)
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            All Sections
          </button>
          {sections.map((sec) => (
            <button
              key={sec}
              onClick={() => onFilterChange({ section: sec })}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors shrink-0 ${
                currentFilters.section?.toUpperCase() === sec.toUpperCase()
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {sec}
            </button>
          ))}
        </div>

        {/* Filter Controls: Status Filter & Table Search */}
        <div className="flex items-center space-x-3">
          <select
            value={currentFilters.status || 'ALL'}
            onChange={(e) => onFilterChange({ status: e.target.value as TableStatus | 'ALL' })}
            className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
          >
            <option value="ALL">All Statuses</option>
            <option value={TableStatus.AVAILABLE}>Available</option>
            <option value={TableStatus.OCCUPIED}>Occupied</option>
            <option value={TableStatus.BILLING}>Billing</option>
            <option value={TableStatus.RESERVED}>Reserved</option>
            <option value={TableStatus.DIRTY}>Dirty</option>
          </select>

          <input
            type="text"
            placeholder="Search table..."
            value={currentFilters.searchQuery || ''}
            onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
            className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 w-44"
          />
        </div>
      </div>
    </div>
  );
};
