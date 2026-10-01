import React from 'react';
import { IRequisitionMetricsUI, IFefoMetricsUI, StoreRequisitionHelper } from '@spicehub/ui';

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
    <div className="bg-[#0b0e14] border-b border-amber-500/20 px-6 py-6 text-zinc-100 shadow-xl">
      {/* Title & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-amber-400 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.8)]" />
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Departmental Store Requisitions & FEFO Expiry Engine
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
              Shift 26 • Kitchen Indents & Stock
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Kitchen Indents, Storekeeper Fulfillment, Inter-Outlet Transfers & First-Expired, First-Out (FEFO) Alerts.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-3">
          <button
            type="button"
            onClick={onRefreshClick}
            disabled={loading}
            className="p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs border border-zinc-700 transition-all disabled:opacity-50"
            title="Refresh"
          >
            🔄
          </button>
          <button
            type="button"
            onClick={onNewTransferClick}
            className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs uppercase tracking-wider border border-zinc-700 transition-all flex items-center gap-2"
          >
            <span>🔄</span>
            <span>Inter-Kitchen Transfer</span>
          </button>
          <button
            type="button"
            onClick={onNewBatchClick}
            className="px-4 py-2.5 rounded-xl bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 font-bold text-xs uppercase tracking-wider border border-amber-500/30 transition-all flex items-center gap-2"
          >
            <span>🏷️</span>
            <span>+ Stock Batch</span>
          </button>
          <button
            type="button"
            onClick={onNewRequisitionClick}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] flex items-center gap-2"
          >
            <span>+</span>
            <span>Raise Kitchen Indent</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-xs text-zinc-400 uppercase font-semibold">Pending Indents</span>
          <div className="text-2xl font-black text-amber-400 font-mono mt-2">
            {metrics.totalPendingCount}
          </div>
          <span className="text-[11px] text-zinc-500 mt-1">Awaiting storekeeper issue</span>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-xs text-zinc-400 uppercase font-semibold">Critical Blockers</span>
          <div className={`text-2xl font-black font-mono mt-2 ${metrics.criticalCount > 0 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
            {metrics.criticalCount}
          </div>
          <span className="text-[11px] text-zinc-500 mt-1">
            {metrics.criticalCount > 0 ? '🚨 Immediate kitchen block' : '✓ No critical delays'}
          </span>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-xs text-zinc-400 uppercase font-semibold">FEFO Expiry Risk</span>
          <div className={`text-2xl font-black font-mono mt-2 ${fefoMetrics.expiringSoonCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {fefoMetrics.expiringSoonCount} batches
          </div>
          <span className="text-[11px] text-zinc-500 mt-1">
            {StoreRequisitionHelper.formatCurrency(fefoMetrics.totalAtRiskValue)} value at risk
          </span>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-xs text-zinc-400 uppercase font-semibold">Fulfilled Today</span>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-2">
            {metrics.fulfilledTodayCount}
          </div>
          <span className="text-[11px] text-emerald-500/80 mt-1">Stock issued to stations</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-1">
        <button
          type="button"
          onClick={() => onTabChange('REQUISITIONS')}
          className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
            activeTab === 'REQUISITIONS'
              ? 'text-amber-400 border-amber-400 bg-amber-500/10'
              : 'text-zinc-400 border-transparent hover:text-zinc-200'
          }`}
        >
          📋 Kitchen Indents ({metrics.totalPendingCount} Pending)
        </button>
        <button
          type="button"
          onClick={() => onTabChange('TRANSFERS')}
          className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
            activeTab === 'TRANSFERS'
              ? 'text-blue-400 border-blue-400 bg-blue-500/10'
              : 'text-zinc-400 border-transparent hover:text-zinc-200'
          }`}
        >
          🔄 Inter-Kitchen Transfers
        </button>
        <button
          type="button"
          onClick={() => onTabChange('FEFO_ALERTS')}
          className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
            activeTab === 'FEFO_ALERTS'
              ? 'text-rose-400 border-rose-400 bg-rose-500/10'
              : 'text-zinc-400 border-transparent hover:text-zinc-200'
          }`}
        >
          ⏱️ FEFO Expiry Timeline ({fefoMetrics.expiringSoonCount + fefoMetrics.expiredCount} Alerts)
        </button>
      </div>
    </div>
  );
};
