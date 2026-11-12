import React from 'react';
import { IPurchaseOrderUI, PurchaseOrderStatusUI, InventoryPoHelper } from '@spicehub/ui';
import { PoStatusBadge } from './PoStatusBadge';
import { Search, MapPin, CheckCircle2, Truck, Package, FileText, ArrowRight } from 'lucide-react';

interface PurchaseOrderListProps {
  orders: IPurchaseOrderUI[];
  selectedFilter: PurchaseOrderStatusUI | 'ALL';
  onFilterChange: (status: PurchaseOrderStatusUI | 'ALL') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onApprovePo: (poId: string) => Promise<void>;
  onReceiveGrn: (order: IPurchaseOrderUI) => void;
  loading: boolean;
}

export const PurchaseOrderList: React.FC<PurchaseOrderListProps> = ({
  orders,
  selectedFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  onApprovePo,
  onReceiveGrn,
  loading,
}) => {
  const filterTabs: Array<{ key: PurchaseOrderStatusUI | 'ALL'; label: string }> = [
    { key: 'ALL', label: 'All Orders' },
    { key: 'PENDING_APPROVAL', label: 'Pending Approval' },
    { key: 'APPROVED', label: 'Approved (Awaiting Dock)' },
    { key: 'PARTIALLY_RECEIVED', label: 'Partially Received' },
    { key: 'COMPLETED', label: 'Completed' },
  ];

  const filteredOrders = orders.filter((o) => {
    if (selectedFilter !== 'ALL' && o.status !== selectedFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const vendorName = typeof o.vendorId === 'object' ? o.vendorId?.name?.toLowerCase() : '';
      return o.poNumber.toLowerCase().includes(q) || vendorName?.includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex items-center flex-wrap gap-1.5">
          {filterTabs.map((tab) => {
            const count = tab.key === 'ALL'
              ? orders.length
              : orders.filter((o) => o.status === tab.key).length;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onFilterChange(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 cursor-pointer ${
                  selectedFilter === tab.key
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    selectedFilter === tab.key
                      ? 'bg-emerald-700 text-emerald-100'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by PO # or supplier name..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all shadow-xs"
          />
        </div>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredOrders.length === 0 ? (
          <div className="col-span-full py-20 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col items-center justify-center p-8">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 mb-3 shadow-xs">
              <Package className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Purchase Orders Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              No procurement orders match your current filter or search criteria.
            </p>
          </div>
        ) : (
          filteredOrders.map((po) => {
            const vendorName = typeof po.vendorId === 'object' ? po.vendorId?.name : 'Supplier';
            const totalOrdered = po.items.reduce((s, it) => s + it.orderQuantity, 0);
            const totalReceived = po.items.reduce((s, it) => s + (it.receivedQuantity || 0), 0);
            const fulfillmentPct = totalOrdered > 0 ? Math.min(100, Math.round((totalReceived / totalOrdered) * 100)) : 0;

            return (
              <div
                key={po._id}
                className="bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all group"
              >
                <div>
                  {/* Top Bar: PO # & Status Badge */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono text-xs font-bold text-slate-900 tracking-wide">
                        {po.poNumber}
                      </span>
                    </div>
                    <PoStatusBadge status={po.status} />
                  </div>

                  {/* Vendor Name & Delivery Location */}
                  <div className="mt-3.5">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1">
                      {vendorName}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{po.deliveryLocation || 'Central Store Receiving Dock'}</span>
                    </p>
                  </div>

                  {/* Financial & Items Stats */}
                  <div className="mt-4 grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Grand Total</span>
                      <span className="text-base font-bold font-mono text-slate-900">
                        {InventoryPoHelper.formatCurrency(po.grandTotal)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Order Items</span>
                      <span className="text-sm font-semibold font-mono text-slate-700">
                        {po.items.length} {po.items.length === 1 ? 'line' : 'lines'}
                      </span>
                    </div>
                  </div>

                  {/* Dock Receiving Fulfillment Progress */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                      <span className="font-medium">Dock Received:</span>
                      <span className="font-mono font-bold text-emerald-700">{fulfillmentPct}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                        style={{ width: `${fulfillmentPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  {po.status === 'PENDING_APPROVAL' && (
                    <button
                      type="button"
                      onClick={() => onApprovePo(po._id)}
                      disabled={loading}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve Purchase Order</span>
                    </button>
                  )}

                  {(po.status === 'APPROVED' || po.status === 'PARTIALLY_RECEIVED') && (
                    <button
                      type="button"
                      onClick={() => onReceiveGrn(po)}
                      className="w-full py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    >
                      <Truck className="w-4 h-4 text-emerald-600" />
                      <span>Receive Stock at Dock (GRN)</span>
                    </button>
                  )}

                  {po.status === 'COMPLETED' && (
                    <div className="w-full py-2 rounded-xl bg-emerald-50/60 text-emerald-700 font-semibold text-xs text-center border border-emerald-200/60 flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>100% Received & Fulfilled</span>
                    </div>
                  )}

                  {po.status === 'CANCELLED' && (
                    <div className="w-full py-2 rounded-xl bg-rose-50 text-rose-700 font-semibold text-xs text-center border border-rose-200">
                      Cancelled Order
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
