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
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl">
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>⚖️</span> Item Variance & Stocktake Reconciliation Breakdown
            {auditNumber && <span className="text-xs text-emerald-700 font-mono">({auditNumber})</span>}
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
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
            className="w-full bg-slate-100 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-white text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
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
          <tbody className="divide-y divide-slate-200 text-slate-900">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
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
                  <tr key={idx} className="hover:bg-slate-200 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{item.itemName}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>{item.category}</span>
                        {item.sku && <span>• SKU: {item.sku}</span>}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-medium text-slate-700">
                      {item.systemBookQuantity} {item.unit}
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-bold text-amber-700">
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

                    <td className="px-4 py-3 text-right font-mono text-slate-600">
                      {InventoryAuditHelper.formatCurrency(item.unitCost)}
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-bold">
                      <span style={{ color: pill.color }}>
                        {item.varianceValue > 0 ? `+` : ''}
                        {InventoryAuditHelper.formatCurrency(item.varianceValue)}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-slate-700 text-[11px]">
                      {InventoryAuditHelper.getVarianceReasonLabel(item.varianceReason)}
                    </td>

                    <td className="px-4 py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300 font-mono">
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
