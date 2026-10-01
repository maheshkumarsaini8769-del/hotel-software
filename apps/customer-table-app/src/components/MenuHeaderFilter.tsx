import React from 'react';
import { FoodType } from '@spicehub/shared-types';
import { MenuFilterState } from '@spicehub/ui';

export interface MenuHeaderFilterProps {
  filter: MenuFilterState;
  onFilterChange: (updates: Partial<MenuFilterState>) => void;
}

export const MenuHeaderFilter: React.FC<MenuHeaderFilterProps> = ({ filter, onFilterChange }) => {
  return (
    <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 p-4 space-y-3">
      {/* Search Input */}
      <div>
        <input
          type="text"
          placeholder="Search favorite dishes, beverages..."
          value={filter.searchQuery}
          onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
          className="w-full px-3.5 py-2.5 text-sm bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Dietary Filter Pills & Stock Toggle */}
      <div className="flex items-center justify-between overflow-x-auto pb-1 gap-2">
        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            onClick={() => onFilterChange({ foodType: 'ALL' })}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              filter.foodType === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => onFilterChange({ foodType: FoodType.VEG })}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center space-x-1 ${
              filter.foodType === FoodType.VEG
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
            }`}
          >
            <span>🟢</span>
            <span>Veg</span>
          </button>
          <button
            onClick={() => onFilterChange({ foodType: FoodType.NON_VEG })}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center space-x-1 ${
              filter.foodType === FoodType.NON_VEG
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
            }`}
          >
            <span>🔴</span>
            <span>Non-Veg</span>
          </button>
          <button
            onClick={() => onFilterChange({ foodType: FoodType.BEVERAGE })}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center space-x-1 ${
              filter.foodType === FoodType.BEVERAGE
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300'
            }`}
          >
            <span>🔵</span>
            <span>Drinks</span>
          </button>
        </div>

        {/* In-Stock Only Switch */}
        <label className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={filter.inStockOnly}
            onChange={(e) => onFilterChange({ inStockOnly: e.target.checked })}
            className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 w-3.5 h-3.5"
          />
          <span>In-Stock Only</span>
        </label>
      </div>
    </div>
  );
};
