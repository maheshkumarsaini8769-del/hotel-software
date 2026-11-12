import React from 'react';
import { IPoMetricsUI, InventoryPoHelper } from '@spicehub/ui';
import { ShoppingCart, RefreshCw, Building2, Plus, FileText, Truck, Users } from 'lucide-react';

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
    <div className="bg-white border-b border-slate-200 px-6 py-6 text-slate-900 shadow-xs">
      {/* Title & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shadow-xs">
              <ShoppingCart className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Central Store Purchase Orders & Procurement
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Live Procurement & Dock
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Vendor Supplier Directory, Multi-tier PO Approvals, 3-Way Invoice Matching & Dock Receiving Notes (GRN).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            type="button"
            onClick={onRefreshClick}
            disabled={loading}
            className="btn-glass-green-subtle p-2.5 rounded-xl text-emerald-800 text-xs transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={onNewVendorClick}
            className="btn-glass-green-subtle px-3.5 py-2.5 rounded-xl text-emerald-800 font-semibold text-xs tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Supplier Profile</span>
          </button>
          <button
            type="button"
            onClick={onNewPoClick}
            className="btn-glass-green text-white px-4 py-2.5 rounded-xl font-semibold text-xs tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Raise Purchase Order</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <span className="text-xs text-slate-500 uppercase font-semibold">Total Purchase Orders</span>
          <div className="text-2xl font-bold text-slate-900 font-mono mt-2">
            {metrics.totalPoCount}
          </div>
          <span className="text-[11px] text-slate-400 mt-1">Active procurement pipeline</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <span className="text-xs text-slate-500 uppercase font-semibold">Awaiting Approval</span>
          <div className={`text-2xl font-bold font-mono mt-2 ${metrics.pendingApprovalCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {metrics.pendingApprovalCount}
          </div>
          <span className="text-[11px] text-slate-400 mt-1">
            {metrics.pendingApprovalCount > 0 ? 'Action required by General Manager' : '✓ All orders approved'}
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <span className="text-xs text-slate-500 uppercase font-semibold">Open Committed Spend</span>
          <div className="text-2xl font-bold text-slate-900 font-mono mt-2">
            {InventoryPoHelper.formatCurrency(metrics.totalOpenPoValue)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1">Approved & in-transit shipments</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <span className="text-xs text-slate-500 uppercase font-semibold">Fulfilled / Completed</span>
          <div className="text-2xl font-bold text-emerald-600 font-mono mt-2">
            {metrics.completedPoCount}
          </div>
          <span className="text-[11px] text-slate-400 mt-1">100% delivered to receiving dock</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1 text-xs">
        <button
          type="button"
          onClick={() => onTabChange('PURCHASE_ORDERS')}
          className={`px-4 py-2 rounded-t-xl font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'PURCHASE_ORDERS'
              ? 'text-emerald-700 border-emerald-600 bg-emerald-50/70'
              : 'text-slate-500 border-transparent hover:text-slate-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Purchase Orders (PO)</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            {metrics.totalPoCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onTabChange('GRN_HISTORY')}
          className={`px-4 py-2 rounded-t-xl font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'GRN_HISTORY'
              ? 'text-emerald-700 border-emerald-600 bg-emerald-50/70'
              : 'text-slate-500 border-transparent hover:text-slate-800'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Dock Receiving Register (GRN)</span>
        </button>
        <button
          type="button"
          onClick={() => onTabChange('VENDORS')}
          className={`px-4 py-2 rounded-t-xl font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'VENDORS'
              ? 'text-emerald-700 border-emerald-600 bg-emerald-50/70'
              : 'text-slate-500 border-transparent hover:text-slate-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Supplier Directory</span>
        </button>
      </div>
    </div>
  );
};
