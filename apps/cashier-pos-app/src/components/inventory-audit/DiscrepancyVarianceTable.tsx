import React, { useState } from 'react';
import { IAuditItemUI, InventoryAuditHelper } from '@spicehub/ui';

interface DiscrepancyVarianceTableProps {
  items: IAuditItemUI[];
  auditNumber?: string;
  storeLocation?: string;
}

export const DiscrepancyVarianceTable: React.FC<DiscrepancyVarianceTableProps> = ({
  items,
  auditNumber,
  storeLocation,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = items.filter(
    (it) =>
      it.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (it.sku && it.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      it.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="p-4 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>⚖️</span> Item Variance & Stocktake Reconciliation Breakdown
            {auditNumber && <span className="text-xs text-emerald-400 font-mono">({auditNumber})</span>}
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            {storeLocation ? `Store: ${storeLocation} • ` : ''}Showing {filteredItems.length} of{' '}
            {items.length} items
          </p>
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Search item, sku or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0e121a] text-zinc-400 font-semibold border-b border-zinc-800 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="px-4 py-3">Item Details</th>
              <th className="px-4 py-3 text-right">System Book</th>
              <th className="px-4 py-3 text-right">Physical Count</th>
              <th className="px-4 py-3 text-right">Variance Qty</th>
              <th className="px-4 py-3 text-right">Unit Cost</th>
              <th className="px-4 py-3 text-right">Variance Impact</th>
              <th className="px-4 py-3">Audited Reason</th>
              <th className="px-4 py-3">Action Taken</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                  No inventory items match search criteria
                </td>
              </tr>
            ) : (
              filteredItems.map((item, idx) => {
                const pill = InventoryAuditHelper.getVariancePill(
                  item.varianceQuantity,
                  item.varianceValue
                );

                return (
                  <tr key={idx} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-white">{item.itemName}</div>
                      <div className="text-[10px] text-zinc-500 flex items-center gap-2 mt-0.5">
                        <span>{item.category}</span>
                        {item.sku && <span>• SKU: {item.sku}</span>}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-medium text-zinc-300">
                      {item.systemBookQuantity} {item.unit}
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-bold text-amber-300">
                      {item.physicalCountQuantity} {item.unit}
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-bold">
                      <span
                        className="px-2 py-0.5 rounded text-[11px]"
                        style={{ backgroundColor: pill.badge, color: pill.color }}
                      >
                        {item.varianceQuantity > 0 ? `+${item.varianceQuantity}` : item.varianceQuantity}{' '}
                        {item.unit}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right font-mono text-zinc-400">
                      {InventoryAuditHelper.formatCurrency(item.unitCost)}
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-bold">
                      <span style={{ color: pill.color }}>
                        {item.varianceValue > 0 ? `+` : ''}
                        {InventoryAuditHelper.formatCurrency(item.varianceValue)}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-zinc-300 text-[11px]">
                      {InventoryAuditHelper.getVarianceReasonLabel(item.varianceReason)}
                    </td>

                    <td className="px-4 py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono">
                        {item.actionTaken || 'ADJUST_BOOK_STOCK'}
                      </span>
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
