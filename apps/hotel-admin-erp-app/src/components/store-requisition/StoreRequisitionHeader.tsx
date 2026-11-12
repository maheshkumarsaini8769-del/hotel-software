import React from 'react';
import { IRequisitionMetricsUI, IFefoMetricsUI, StoreRequisitionHelper } from '@spicehub/ui';
import { Boxes, RefreshCw, ArrowLeftRight, Tag, Plus } from 'lucide-react';

interface StoreRequisitionHeaderProps {
  metrics: IRequisitionMetricsUI;
  fefoMetrics: IFefoMetricsUI;
  activeTab: 'REQUISITIONS' | 'TRANSFERS' | 'FEFO_ALERTS';
  onTabChange: (tab: 'REQUISITIONS' | 'TRANSFERS' | 'FEFO_ALERTS') => void;
  onNewRequisitionClick: () => void;
  onNewTransferClick: () => void;
  onNewBatchClick: () => void;
  onRefreshClick: () => void;
  loading: boolean;
}

export const StoreRequisitionHeader: React.FC<StoreRequisitionHeaderProps> = ({
  metrics,
  fefoMetrics,
  activeTab,
  onTabChange,
  onNewRequisitionClick,
  onNewTransferClick,
  onNewBatchClick,
  onRefreshClick,
  loading,
}) => {
  return (
    <div className="bg-white border-b border-slate-200 px-6 py-4 text-slate-900 shadow-2xs">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>Store Requisitions & Material Batches</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              Kitchen Store
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kitchen indents, issue fulfillment & FIFO/FEFO expiry tracking
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            type="button"
            onClick={onRefreshClick}
            disabled={loading}
            className="btn-glass-green-subtle p-2.5 rounded-xl text-emerald-800 text-xs transition-all disabled:opacity-50 flex items-center justify-center"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={onNewTransferClick}
            className="btn-glass-green-subtle px-3.5 py-2.5 rounded-xl text-emerald-800 font-semibold text-xs tracking-wider transition-all flex items-center gap-1.5"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Inter-Kitchen Transfer</span>
          </button>
          <button
            type="button"
            onClick={onNewBatchClick}
            className="btn-glass-green-subtle px-3.5 py-2.5 rounded-xl text-emerald-800 font-semibold text-xs tracking-wider transition-all flex items-center gap-1.5"
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Stock Batch</span>
          </button>
          <button
            type="button"
            onClick={onNewRequisitionClick}
            className="btn-glass-green text-white px-4 py-2.5 rounded-xl font-semibold text-xs tracking-wider transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Raise Kitchen Indent</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <span className="text-xs text-slate-500 uppercase font-semibold">Pending Indents</span>
          <div className="text-2xl font-bold text-slate-900 font-mono mt-2">
            {metrics.totalPendingCount}
          </div>
          <span className="text-[11px] text-slate-400 mt-1">Awaiting storekeeper issue</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <span className="text-xs text-slate-500 uppercase font-semibold">Critical Blockers</span>
          <div className={`text-2xl font-bold font-mono mt-2 ${metrics.criticalCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {metrics.criticalCount}
          </div>
          <span className="text-[11px] text-slate-400 mt-1">
            {metrics.criticalCount > 0 ? 'Immediate kitchen block' : 'No critical delays'}
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <span className="text-xs text-slate-500 uppercase font-semibold">FEFO Expiry Risk</span>
          <div className={`text-2xl font-bold font-mono mt-2 ${fefoMetrics.expiringSoonCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {fefoMetrics.expiringSoonCount} batches
          </div>
          <span className="text-[11px] text-slate-400 mt-1">
            {StoreRequisitionHelper.formatCurrency(fefoMetrics.totalAtRiskValue)} value at risk
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <span className="text-xs text-slate-500 uppercase font-semibold">Fulfilled Today</span>
          <div className="text-2xl font-bold text-emerald-600 font-mono mt-2">
            {metrics.fulfilledTodayCount}
          </div>
          <span className="text-[11px] text-slate-400 mt-1">Stock issued to stations</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1 text-xs">
        <button
          type="button"
          onClick={() => onTabChange('REQUISITIONS')}
          className={`px-4 py-2 rounded-t-xl font-bold transition-all border-b-2 ${
            activeTab === 'REQUISITIONS'
              ? 'text-emerald-700 border-emerald-600 bg-emerald-50/70'
              : 'text-slate-500 border-transparent hover:text-slate-800'
          }`}
        >
          Kitchen Indents ({metrics.totalPendingCount} Pending)
        </button>
        <button
          type="button"
          onClick={() => onTabChange('TRANSFERS')}
          className={`px-4 py-2 rounded-t-xl font-bold transition-all border-b-2 ${
            activeTab === 'TRANSFERS'
              ? 'text-emerald-700 border-emerald-600 bg-emerald-50/70'
              : 'text-slate-500 border-transparent hover:text-slate-800'
          }`}
        >
          Inter-Kitchen Transfers
        </button>
        <button
          type="button"
          onClick={() => onTabChange('FEFO_ALERTS')}
          className={`px-4 py-2 rounded-t-xl font-bold transition-all border-b-2 ${
            activeTab === 'FEFO_ALERTS'
              ? 'text-rose-700 border-rose-500 bg-rose-50'
              : 'text-slate-500 border-transparent hover:text-slate-800'
          }`}
        >
          FEFO Expiry Timeline ({fefoMetrics.expiringSoonCount + fefoMetrics.expiredCount} Alerts)
        </button>
      </div>
    </div>
  );
};
