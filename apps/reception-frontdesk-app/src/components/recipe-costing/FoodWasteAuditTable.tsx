import React from 'react';
import { IFoodWasteLogUI, IFoodWasteSummaryUI, RecipeCostingHelper } from '@spicehub/ui';

interface FoodWasteAuditTableProps {
  logs: IFoodWasteLogUI[];
  summary: IFoodWasteSummaryUI;
  selectedFilter: string;
  onFilterChange: (type: string) => void;
  loading: boolean;
}

export const FoodWasteAuditTable: React.FC<FoodWasteAuditTableProps> = ({
  logs,
  summary,
  selectedFilter,
  onFilterChange,
  loading,
}) => {
  const wasteFilters = [
    { key: 'ALL', label: 'All Spoilage Types' },
    { key: 'SPOILED', label: 'Spoiled Prep' },
    { key: 'BURNT_OVERCOOKED', label: 'Burnt' },
    { key: 'EXPIRED', label: 'Expired' },
    { key: 'CUSTOMER_RETURN', label: 'Guest Returns' },
    { key: 'TRIMMING_LOSS', label: 'Trimming' },
    { key: 'BUFFET_SURPLUS', label: 'Buffet Surplus' },
  ];

  return (
    <div className="bg-[#0f131a] rounded-2xl border border-zinc-800 p-5 space-y-4 shadow-xl">
      {/* Table Header & Category Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-zinc-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>Kitchen Spoilage & Shrinkage Audit Log</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Monetary losses, root causes and disposal methods for food waste
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center flex-wrap gap-1.5">
          {wasteFilters.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onFilterChange(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                selectedFilter === tab.key
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-left text-xs text-zinc-300">
          <thead className="bg-[#121620] text-zinc-400 uppercase font-semibold text-[11px] border-b border-zinc-800">
            <tr>
              <th className="px-4 py-3">Waste #</th>
              <th className="px-4 py-3">Item / Prep</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Shift</th>
              <th className="px-4 py-3 text-right">Quantity</th>
              <th className="px-4 py-3 text-right">Direct Loss (₹)</th>
              <th className="px-4 py-3">Root Cause</th>
              <th className="px-4 py-3">Disposal</th>
              <th className="px-4 py-3">Audited At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/80 bg-zinc-950/40">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-zinc-500">
                  No food waste records logged for this filter
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const badge = RecipeCostingHelper.getWasteTypeBadge(log.wasteType);
                return (
                  <tr key={log._id} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-amber-400">
                      {log.wasteNumber}
                    </td>
                    <td className="px-4 py-3 font-medium text-white max-w-[180px] truncate">
                      {log.itemName}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-zinc-400">
                      {log.shift}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-zinc-200">
                      {log.quantity} {log.unit}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-black text-rose-400">
                      {RecipeCostingHelper.formatCurrency(log.totalLossAmount)}
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate text-zinc-300" title={log.reason}>
                      {log.reason}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-zinc-400">
                      {log.disposalMethod}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-zinc-500">
                      {new Date(log.loggedAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
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
