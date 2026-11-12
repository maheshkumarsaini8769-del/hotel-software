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
    <div className="bg-white border-b border-emerald-200 px-6 py-6 text-slate-900 shadow-xl">
      {/* Title & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse shadow-sm" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              Physical Stock Audit & Discrepancy Reconciliation
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Shift 27 • Stocktake Engine
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Blind Stocktakes, Variance Tallying, Anti-Pilferage Shrinkage Audit & General Ledger Reconciliation.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-3">
          <button
            type="button"
            onClick={onRefreshClick}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs border border-slate-300 transition-all disabled:opacity-50"
            title="Refresh"
          >
            🔄
          </button>
          <button
            type="button"
            onClick={onNewSessionClick}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-xl text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-xs transition-all flex items-center gap-2"
          >
            <span>+</span> Start New Audit Session
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Total Audits</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-slate-900">{metrics.totalAuditsCount}</span>
            <span className="text-[10px] text-slate-500">All locations</span>
          </div>
        </div>

        <div className="bg-white border border-amber-200 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">In Progress / Active</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-amber-700">{metrics.openAuditsCount}</span>
            <span className="text-[10px] text-amber-700">Pending completion</span>
          </div>
        </div>

        <div className="bg-white border border-red-200 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-red-700">Net Shortage Loss</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-red-700">
              {InventoryAuditHelper.formatCurrency(metrics.totalNetShortageLoss)}
            </span>
            <span className="text-[10px] text-red-500/80">Shrinkage / Waste</span>
          </div>
        </div>

        <div className="bg-white border border-emerald-200 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Reconciled & Balanced</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-emerald-700">{metrics.reconciledCount}</span>
            <span className="text-[10px] text-emerald-700">Adjusted in Ledger</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-0">
        <button
          type="button"
          onClick={() => onTabChange('SESSIONS')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
 activeTab === 'SESSIONS'
 ? 'border-emerald-400 text-emerald-700 bg-emerald-50'
 : 'border-transparent text-slate-600 hover:text-slate-900'
 }`}
        >
          📋 Audit Sessions & History ({metrics.totalAuditsCount})
        </button>
        <button
          type="button"
          onClick={() => onTabChange('BLIND_ENTRY')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
 activeTab === 'BLIND_ENTRY'
 ? 'border-amber-400 text-amber-700 bg-emerald-50'
 : 'border-transparent text-slate-600 hover:text-slate-900'
 }`}
        >
          📝 Blind Stocktake Count Sheet
        </button>
        <button
          type="button"
          onClick={() => onTabChange('RECONCILE')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
 activeTab === 'RECONCILE'
 ? 'border-slate-200 text-slate-700 bg-slate-100'
 : 'border-transparent text-slate-600 hover:text-slate-900'
 }`}
        >
          ⚖️ Discrepancy Reconciliation Board
        </button>
      </div>
    </div>
  );
};
