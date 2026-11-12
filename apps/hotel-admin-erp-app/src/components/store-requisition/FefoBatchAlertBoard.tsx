import React from 'react';
import { IStockBatchUI, IFefoMetricsUI, StoreRequisitionHelper } from '@spicehub/ui';
import { Clock, MapPin } from 'lucide-react';

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
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shadow-xs">
              <Clock className="w-4 h-4 text-emerald-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              FEFO Inventory Expiry Control Board (First-Expired, First-Out)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Prioritize stock usage based on shelf life to minimize spoilage and food waste loss
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total At-Risk Value</span>
            <span className="text-lg font-bold font-mono text-rose-600">
              {StoreRequisitionHelper.formatCurrency(fefoMetrics.totalAtRiskValue)}
            </span>
          </div>
        </div>
      </div>

      {/* Batches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {batches.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200/80 shadow-xs">
            No stock batches registered in central store
          </div>
        ) : (
          batches.map((b) => {
            const badge = StoreRequisitionHelper.getFreshnessBadge(b.status, b.daysUntilExpiry);
            const batchVal = b.currentQuantity * b.unitCost;

            return (
              <div
                key={b._id}
                className={`p-5 rounded-2xl bg-white border transition-all shadow-xs flex flex-col justify-between ${
                  b.status === 'EXPIRING_SOON'
                    ? 'border-amber-300 ring-1 ring-amber-300/30'
                    : b.status === 'EXPIRED'
                    ? 'border-rose-300 ring-1 ring-rose-300/30'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  {/* Top Bar: Batch # & Freshness Pill */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <span className="font-mono text-xs font-bold text-slate-800">
                      {b.batchNumber}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.bg} ${badge.border} ${badge.text}`}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Item Name & Category */}
                  <div className="mt-3">
                    <h3 className="text-base font-bold text-slate-900 line-clamp-1">{b.itemName}</h3>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      <span>{b.category}</span>
                      <span>•</span>
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{b.location}</span>
                    </p>
                  </div>

                  {/* Stock Quantity & Value */}
                  <div className="mt-4 grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">In-Stock</span>
                      <span className="text-base font-bold font-mono text-slate-900">
                        {b.currentQuantity} {b.unit}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Stock Value</span>
                      <span className="text-sm font-bold font-mono text-emerald-700">
                        {StoreRequisitionHelper.formatCurrency(batchVal)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expiry Timestamp Details */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
                  <span>Expiry Date:</span>
                  <span className={`font-bold ${b.status === 'EXPIRED' ? 'text-rose-600' : b.status === 'EXPIRING_SOON' ? 'text-amber-600' : 'text-slate-800'}`}>
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
