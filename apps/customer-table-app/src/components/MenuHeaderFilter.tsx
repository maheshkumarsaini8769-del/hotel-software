import React from 'react';
import { FoodType } from '@spicehub/shared-types';
import { MenuFilterState } from '@spicehub/ui';

export interface MenuHeaderFilterProps {
  filter: MenuFilterState;
  onFilterChange: (updates: Partial<MenuFilterState>) => void;
}

export const MenuHeaderFilter: React.FC<MenuHeaderFilterProps> = ({ filter, onFilterChange }) => {
  return (
    <div className="sticky top-[65px] z-10 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/90 px-4 py-3 space-y-2.5">
      {/* Search Input */}
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
        <input
          type="text"
          placeholder="Search royal dishes, tandoor, curries, drinks..."
          value={filter.searchQuery}
          onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
          className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-slate-900 border border-slate-700/80 rounded-xl focus:outline-none focus:border-amber-400 text-white placeholder-slate-500 shadow-inner"
        />
      </div>

      {/* Dietary Filter Pills & Stock Toggle */}
      <div className="flex items-center justify-between overflow-x-auto pb-0.5 gap-2 no-scrollbar">
        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            onClick={() => onFilterChange({ foodType: 'ALL' })}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
              filter.foodType === 'ALL'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
            }`}
          >
            All Menu
          </button>
          <button
            onClick={() => onFilterChange({ foodType: FoodType.VEG })}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition flex items-center space-x-1 border ${
              filter.foodType === FoodType.VEG
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20'
                : 'bg-slate-900 text-emerald-400 border-emerald-900/60 hover:bg-emerald-950/30'
            }`}
          >
            <span>🟢</span>
            <span>Pure Veg</span>
          </button>
          <button
            onClick={() => onFilterChange({ foodType: FoodType.NON_VEG })}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition flex items-center space-x-1 border ${
              filter.foodType === FoodType.NON_VEG
                ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/20'
                : 'bg-slate-900 text-rose-400 border-rose-900/60 hover:bg-rose-950/30'
            }`}
          >
            <span>🔴</span>
            <span>Non-Veg</span>
          </button>
          <button
            onClick={() => onFilterChange({ foodType: FoodType.BEVERAGE })}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition flex items-center space-x-1 border ${
              filter.foodType === FoodType.BEVERAGE
                ? 'bg-sky-600 text-white border-sky-500 shadow-md shadow-sky-600/20'
                : 'bg-slate-900 text-sky-400 border-sky-900/60 hover:bg-sky-950/30'
            }`}
          >
            <span>🔵</span>
            <span>Drinks</span>
          </button>
        </div>

        {/* In-Stock Only Switch */}
        <label className="flex items-center space-x-1.5 text-xs font-medium text-slate-400 cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={filter.inStockOnly}
            onChange={(e) => onFilterChange({ inStockOnly: e.target.checked })}
            className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500 w-3.5 h-3.5"
          />
          <span className="text-[11px]">Available</span>
        </label>
      </div>
    </div>
  );
};
