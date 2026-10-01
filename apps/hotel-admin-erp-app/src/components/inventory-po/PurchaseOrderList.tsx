import React from 'react';
import { IPurchaseOrderUI, PurchaseOrderStatusUI, InventoryPoHelper } from '@spicehub/ui';
import { PoStatusBadge } from './PoStatusBadge';

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
    { key: 'APPROVED', label: 'Approved (Awaiting Delivery)' },
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
    <div className="space-y-5">
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex items-center flex-wrap gap-1.5">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onFilterChange(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                selectedFilter === tab.key
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">
            🔍
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search PO # or vendor..."
            className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder:text-zinc-500 outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredOrders.length === 0 ? (
          <div className="col-span-full py-16 text-center text-zinc-500 text-sm flex flex-col items-center gap-2">
            <span className="text-3xl">📦</span>
            <span>No purchase orders found matching this filter</span>
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
                className="bg-[#0f131a] rounded-2xl border border-zinc-800 hover:border-zinc-700 p-5 flex flex-col justify-between shadow-lg transition-all group"
              >
                <div>
                  {/* Top Bar: PO # & Status */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-zinc-800/80">
                    <span className="font-mono text-xs font-bold text-amber-400 tracking-wide">
                      {po.poNumber}
                    </span>
                    <PoStatusBadge status={po.status} />
                  </div>

                  {/* Vendor Name */}
                  <div className="mt-3">
                    <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                      {vendorName}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {po.deliveryLocation}
                    </p>
                  </div>

                  {/* Financial & Items Stats */}
                  <div className="mt-4 grid grid-cols-2 gap-2 bg-zinc-950/70 p-3 rounded-xl border border-zinc-800/80">
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Grand Total</span>
                      <span className="text-base font-black font-mono text-white">
                        {InventoryPoHelper.formatCurrency(po.grandTotal)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Item Lines</span>
                      <span className="text-sm font-bold font-mono text-zinc-300">
                        {po.items.length} items
                      </span>
                    </div>
                  </div>

                  {/* Dock Receiving Fulfillment Progress */}
                  <div className="mt-3 pt-3 border-t border-zinc-800/60">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
                      <span>Dock Received:</span>
                      <span className="font-mono font-bold text-emerald-400">{fulfillmentPct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300"
                        style={{ width: `${fulfillmentPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between gap-2">
                  {po.status === 'PENDING_APPROVAL' && (
                    <button
                      type="button"
                      onClick={() => onApprovePo(po._id)}
                      disabled={loading}
                      className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider transition-all shadow-sm"
                    >
                      ✓ Approve PO
                    </button>
                  )}

                  {(po.status === 'APPROVED' || po.status === 'PARTIALLY_RECEIVED') && (
                    <button
                      type="button"
                      onClick={() => onReceiveGrn(po)}
                      className="w-full py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold text-xs border border-emerald-500/40 transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>🚚</span>
                      <span>Receive at Dock (GRN)</span>
                    </button>
                  )}

                  {po.status === 'COMPLETED' && (
                    <span className="w-full py-2 rounded-xl bg-zinc-900 text-zinc-400 font-medium text-xs text-center border border-zinc-800">
                      ✓ Fully Fulfilled
                    </span>
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
