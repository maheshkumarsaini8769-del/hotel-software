import React from 'react';
import { IStockBatchUI, IFefoMetricsUI, StoreRequisitionHelper } from '@spicehub/ui';

interface FefoBatchAlertBoardProps {
  batches: IStockBatchUI[];
  fefoMetrics: IFefoMetricsUI;
  loading: boolean;
}

export const FefoBatchAlertBoard: React.FC<FefoBatchAlertBoardProps> = ({
  batches,
  fefoMetrics,
  loading,
}) => {
  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-amber-950/40 via-red-950/30 to-zinc-900 border border-amber-500/40 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">⏱️</span>
            <h2 className="text-lg font-bold text-white">
              FEFO Inventory Expiry Control Board (First-Expired, First-Out)
            </h2>
          </div>
          <p className="text-xs text-zinc-300 mt-1">
            Prioritize stock usage based on shelf life to minimize spoilage and food waste loss
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-black/60 px-4 py-2 rounded-xl border border-zinc-800">
            <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Total At-Risk Value</span>
            <span className="text-lg font-black font-mono text-rose-400">
              {StoreRequisitionHelper.formatCurrency(fefoMetrics.totalAtRiskValue)}
            </span>
          </div>
        </div>
      </div>

      {/* Batches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {batches.length === 0 ? (
          <div className="col-span-full py-16 text-center text-zinc-500 text-sm">
            No stock batches registered in central store
          </div>
        ) : (
          batches.map((b) => {
            const badge = StoreRequisitionHelper.getFreshnessBadge(b.status, b.daysUntilExpiry);
            const batchVal = b.currentQuantity * b.unitCost;

            return (
              <div
                key={b._id}
                className={`p-5 rounded-2xl bg-[#0f131a] border transition-all shadow-md flex flex-col justify-between ${
                  b.status === 'EXPIRING_SOON'
                    ? 'border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                    : b.status === 'EXPIRED'
                    ? 'border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div>
                  {/* Top Bar: Batch # & Freshness Pill */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-zinc-800/80">
                    <span className="font-mono text-xs font-bold text-amber-400">
                      {b.batchNumber}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.bg} ${badge.border} ${badge.text}`}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Item Name & Category */}
                  <div className="mt-3">
                    <h3 className="text-base font-bold text-white line-clamp-1">{b.itemName}</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">{b.category} • 📍 {b.location}</p>
                  </div>

                  {/* Stock Quantity & Value */}
                  <div className="mt-4 grid grid-cols-2 gap-2 bg-zinc-950/70 p-3 rounded-xl border border-zinc-800/80">
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-semibold block">In-Stock</span>
                      <span className="text-base font-black font-mono text-white">
                        {b.currentQuantity} {b.unit}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Stock Value</span>
                      <span className="text-sm font-black font-mono text-amber-400">
                        {StoreRequisitionHelper.formatCurrency(batchVal)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expiry Timestamp Details */}
                <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400 font-mono">
                  <span>Expiry Date:</span>
                  <span className={`font-bold ${b.status === 'EXPIRED' ? 'text-red-400' : b.status === 'EXPIRING_SOON' ? 'text-amber-400' : 'text-zinc-200'}`}>
                    {new Date(b.expiryDate).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
