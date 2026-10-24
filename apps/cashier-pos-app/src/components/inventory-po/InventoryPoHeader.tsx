import React from 'react';
import { IPoMetricsUI, InventoryPoHelper } from '@spicehub/ui';

interface InventoryPoHeaderProps {
  metrics: IPoMetricsUI;
  activeTab: 'PURCHASE_ORDERS' | 'GRN_HISTORY' | 'VENDORS';
  onTabChange: (tab: 'PURCHASE_ORDERS' | 'GRN_HISTORY' | 'VENDORS') => void;
  onNewPoClick: () => void;
  onNewVendorClick: () => void;
  onRefreshClick: () => void;
  loading: boolean;
}

export const InventoryPoHeader: React.FC<InventoryPoHeaderProps> = ({
  metrics,
  activeTab,
  onTabChange,
  onNewPoClick,
  onNewVendorClick,
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
              Central Store Purchase Orders & GRN Receiving
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
              Shift 25 • Procurement & Dock
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Vendor Supplier Directory, Multi-tier PO Approvals, 3-Way Invoice Matching & Dock Receiving Notes.
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
            onClick={onNewVendorClick}
            className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-300 font-bold text-xs uppercase tracking-wider border border-amber-500/30 transition-all flex items-center gap-2"
          >
            <span>🏢</span>
            <span>+ Vendor Profile</span>
          </button>
          <button
            type="button"
            onClick={onNewPoClick}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] flex items-center gap-2"
          >
            <span>+</span>
            <span>Raise Purchase Order</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-xs text-zinc-400 uppercase font-semibold">Total Purchase Orders</span>
          <div className="text-2xl font-black text-white font-mono mt-2">
            {metrics.totalPoCount}
          </div>
          <span className="text-[11px] text-zinc-500 mt-1">Active Procurement Pipeline</span>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-xs text-zinc-400 uppercase font-semibold">Awaiting Approval</span>
          <div className={`text-2xl font-black font-mono mt-2 ${metrics.pendingApprovalCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {metrics.pendingApprovalCount}
          </div>
          <span className="text-[11px] text-zinc-500 mt-1">
            {metrics.pendingApprovalCount > 0 ? 'Action required by Manager' : '✓ All orders approved'}
          </span>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-xs text-zinc-400 uppercase font-semibold">Open Committed Value</span>
          <div className="text-2xl font-black text-amber-400 font-mono mt-2">
            {InventoryPoHelper.formatCurrency(metrics.totalOpenPoValue)}
          </div>
          <span className="text-[11px] text-zinc-500 mt-1">Approved + In-transit shipments</span>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-xs text-zinc-400 uppercase font-semibold">Fulfilled / Completed</span>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-2">
            {metrics.completedPoCount}
          </div>
          <span className="text-[11px] text-emerald-500/80 mt-1">100% Stock Received at Dock</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-1">
        <button
          type="button"
          onClick={() => onTabChange('PURCHASE_ORDERS')}
          className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
            activeTab === 'PURCHASE_ORDERS'
              ? 'text-amber-400 border-amber-400 bg-amber-500/10'
              : 'text-zinc-400 border-transparent hover:text-zinc-200'
          }`}
        >
          📦 Purchase Orders (PO)
        </button>
        <button
          type="button"
          onClick={() => onTabChange('GRN_HISTORY')}
          className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
            activeTab === 'GRN_HISTORY'
              ? 'text-emerald-400 border-emerald-400 bg-emerald-500/10'
              : 'text-zinc-400 border-transparent hover:text-zinc-200'
          }`}
        >
          🚚 Dock Receiving Register (GRN)
        </button>
        <button
          type="button"
          onClick={() => onTabChange('VENDORS')}
          className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
            activeTab === 'VENDORS'
              ? 'text-blue-400 border-blue-400 bg-blue-500/10'
              : 'text-zinc-400 border-transparent hover:text-zinc-200'
          }`}
        >
          🏢 Supplier Directory
        </button>
      </div>
    </div>
  );
};
