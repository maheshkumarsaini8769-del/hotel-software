import React, { useState } from 'react';
import {
  IMenuEngineeringItemUI,
  MenuQuadrantUI,
  MenuEngineeringHelper,
} from '@spicehub/ui';

interface MenuItemMatrixTableProps {
  items: IMenuEngineeringItemUI[];
  onSimulateItem: (item: IMenuEngineeringItemUI) => void;
}

export const MenuItemMatrixTable: React.FC<MenuItemMatrixTableProps> = ({
  items,
  onSimulateItem,
}) => {
  const [quadrantFilter, setQuadrantFilter] = useState<MenuQuadrantUI | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = items.filter((it) => {
    const matchesQuadrant = quadrantFilter === 'ALL' || it.quadrant === quadrantFilter;
    const matchesSearch =
      it.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (it.category && it.category.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesQuadrant && matchesSearch;
  });

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl">
      {/* Filter & Search Bar */}
      <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Quadrant Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setQuadrantFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
 quadrantFilter === 'ALL'
 ? 'bg-slate-100 text-slate-900'
 : 'bg-slate-100 text-slate-600 hover:text-slate-900'
 }`}
          >
            All Items ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setQuadrantFilter('STAR')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
 quadrantFilter === 'STAR'
 ? 'bg-blue-600 text-slate-900'
 : 'bg-emerald-50 text-amber-700 hover:bg-emerald-100'
 }`}
          >
            ⭐ Stars
          </button>
          <button
            type="button"
            onClick={() => setQuadrantFilter('PLOWHORSE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
 quadrantFilter === 'PLOWHORSE'
 ? 'bg-blue-500 text-white'
 : 'bg-blue-50 text-blue-700 hover:bg-blue-500/20'
 }`}
          >
            🐎 Plowhorses
          </button>
          <button
            type="button"
            onClick={() => setQuadrantFilter('PUZZLE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
 quadrantFilter === 'PUZZLE'
 ? 'bg-blue-600 text-white'
 : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
 }`}
          >
            🧩 Puzzles
          </button>
          <button
            type="button"
            onClick={() => setQuadrantFilter('DOG')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
 quadrantFilter === 'DOG'
 ? 'bg-red-500 text-white'
 : 'bg-red-50 text-red-700 hover:bg-red-500/20'
 }`}
          >
            🐕 Dogs
          </button>
        </div>

        {/* Search */}
        <div className="w-full md:w-64">
          <input
            type="text"
            placeholder="Search dish or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-100 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-white text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="px-4 py-3">Menu Item</th>
              <th className="px-4 py-3">Quadrant</th>
              <th className="px-4 py-3 text-right">Selling Price</th>
              <th className="px-4 py-3 text-right">Food Cost</th>
              <th className="px-4 py-3 text-right">Cost %</th>
              <th className="px-4 py-3 text-right">Margin / Unit</th>
              <th className="px-4 py-3 text-right">Units Sold</th>
              <th className="px-4 py-3 text-right">Total Profit</th>
              <th className="px-4 py-3">Engineering Strategy</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-900">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                  No menu items found matching the selected criteria
                </td>
              </tr>
            ) : (
              filteredItems.map((item, idx) => {
                const badge = MenuEngineeringHelper.getQuadrantBadge(item.quadrant);
                const costHealth = MenuEngineeringHelper.getFoodCostHealth(item.foodCostPercentage);

                return (
                  <tr key={idx} className="hover:bg-slate-200 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{item.itemName}</div>
                      <div className="text-[10px] text-slate-500">{item.category}</div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1"
                        style={{
                          backgroundColor: badge.bg,
                          color: badge.text,
                          border: badge.border,
                        }}
                      >
                        <span>{badge.icon}</span> {badge.label}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-medium text-slate-700">
                      {MenuEngineeringHelper.formatCurrency(item.sellingPrice)}
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-medium text-slate-600">
                      {MenuEngineeringHelper.formatCurrency(item.foodCost)}
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-bold">
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px]"
                        style={{ backgroundColor: costHealth.bg, color: costHealth.color }}
                      >
                        {item.foodCostPercentage}%
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                      {MenuEngineeringHelper.formatCurrency(item.contributionMargin)}
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-bold text-amber-700">
                      {item.quantitySold}
                      <span className="text-[10px] text-slate-500 ml-1">({item.menuSharePercentage}%)</span>
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                      {MenuEngineeringHelper.formatCurrency(item.totalContributionMargin)}
                    </td>

                    <td className="px-4 py-3 max-w-xs text-[11px] text-slate-700">
                      {item.actionStrategy}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => onSimulateItem(item)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold border border-slate-300 hover:border-slate-300 transition-all"
                      >
                        🔮 Test
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
