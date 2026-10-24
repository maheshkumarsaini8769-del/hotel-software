import React from 'react';
import { IAuditMetricsUI, InventoryAuditHelper } from '@spicehub/ui';

interface InventoryAuditHeaderProps {
  metrics: IAuditMetricsUI;
  activeTab: 'SESSIONS' | 'BLIND_ENTRY' | 'RECONCILE';
  onTabChange: (tab: 'SESSIONS' | 'BLIND_ENTRY' | 'RECONCILE') => void;
  onNewSessionClick: () => void;
  onRefreshClick: () => void;
  loading: boolean;
}

export const InventoryAuditHeader: React.FC<InventoryAuditHeaderProps> = ({
  metrics,
  activeTab,
  onTabChange,
  onNewSessionClick,
  onRefreshClick,
  loading,
}) => {
  return (
    <div className="bg-[#0b0e14] border-b border-emerald-500/20 px-6 py-6 text-zinc-100 shadow-xl">
      {/* Title & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Physical Stock Audit & Discrepancy Reconciliation
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Shift 27 • Stocktake Engine
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Blind Stocktakes, Variance Tallying, Anti-Pilferage Shrinkage Audit & General Ledger Reconciliation.
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
            onClick={onNewSessionClick}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-900/30 transition-all flex items-center gap-2"
          >
            <span>+</span> Start New Audit Session
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Total Audits</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-white">{metrics.totalAuditsCount}</span>
            <span className="text-[10px] text-zinc-500">All locations</span>
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-amber-500/30 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">In Progress / Active</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-amber-400">{metrics.openAuditsCount}</span>
            <span className="text-[10px] text-amber-500/80">Pending completion</span>
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-rose-500/30 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">Net Shortage Loss</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-rose-400">
              {InventoryAuditHelper.formatCurrency(metrics.totalNetShortageLoss)}
            </span>
            <span className="text-[10px] text-rose-500/80">Shrinkage / Waste</span>
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-emerald-500/30 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Reconciled & Balanced</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-emerald-400">{metrics.reconciledCount}</span>
            <span className="text-[10px] text-emerald-500/80">Adjusted in Ledger</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-0">
        <button
          type="button"
          onClick={() => onTabChange('SESSIONS')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'SESSIONS'
              ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          📋 Audit Sessions & History ({metrics.totalAuditsCount})
        </button>
        <button
          type="button"
          onClick={() => onTabChange('BLIND_ENTRY')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'BLIND_ENTRY'
              ? 'border-amber-400 text-amber-400 bg-amber-500/10'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          📝 Blind Stocktake Count Sheet
        </button>
        <button
          type="button"
          onClick={() => onTabChange('RECONCILE')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'RECONCILE'
              ? 'border-teal-400 text-teal-400 bg-teal-500/10'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          ⚖️ Discrepancy Reconciliation Board
        </button>
      </div>
    </div>
  );
};
