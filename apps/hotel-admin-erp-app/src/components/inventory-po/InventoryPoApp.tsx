import React, { useState, useEffect, useCallback } from 'react';
import {
  InventoryPoStore,
  IPurchaseOrderUI,
  IVendorUI,
  IGoodsReceivedNoteUI,
  IPoMetricsUI,
  INewPoPayload,
  INewGrnPayload,
  PurchaseOrderStatusUI,
} from '@spicehub/ui';
import { InventoryPoHeader } from './InventoryPoHeader';
import { PurchaseOrderList } from './PurchaseOrderList';
import { GrnHistoryTable } from './GrnHistoryTable';
import { NewPurchaseOrderModal } from './NewPurchaseOrderModal';
import { GrnReceivingModal } from './GrnReceivingModal';
import { VendorDirectoryModal } from './VendorDirectoryModal';

interface InventoryPoAppProps {
  apiBaseUrl?: string;
  token?: string;
}

export const InventoryPoApp: React.FC<InventoryPoAppProps> = ({
  apiBaseUrl = 'http://localhost:5000/api/v1',
  token,
}) => {
  const [store] = useState(() => new InventoryPoStore());
  const [orders, setOrders] = useState<IPurchaseOrderUI[]>([]);
  const [vendors, setVendors] = useState<IVendorUI[]>([]);
  const [grns, setGrns] = useState<IGoodsReceivedNoteUI[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<IPurchaseOrderUI | null>(null);
  const [metrics, setMetrics] = useState<IPoMetricsUI>({
    totalPoCount: 0,
    pendingApprovalCount: 0,
    totalOpenPoValue: 0,
    completedPoCount: 0,
  });
  const [activeTab, setActiveTab] = useState<'PURCHASE_ORDERS' | 'GRN_HISTORY' | 'VENDORS'>('PURCHASE_ORDERS');
  const [filterStatus, setFilterStatus] = useState<PurchaseOrderStatusUI | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModal, setActiveModal] = useState<'NEW_PO' | 'RECEIVE_GRN' | 'VIEW_PO' | 'NEW_VENDOR' | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = store.subscribe((state) => {
      setOrders(state.orders);
      setSelectedOrder(state.selectedOrder);
      setVendors(state.vendors);
      setGrns(state.grns);
      setMetrics(state.metrics);
      setActiveTab(state.activeTab);
      setFilterStatus(state.filterStatus);
      setSearchQuery(state.searchQuery);
      setActiveModal(state.activeModal);
      setLoading(state.loading);
    });
    return unsub;
  }, [store]);

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  // Fetch Purchase Orders
  const fetchOrders = useCallback(async () => {
    try {
      store.setLoading(true);
      const res = await fetch(`${apiBaseUrl}/inventory-po/orders?status=${filterStatus}`, {
        credentials: 'include',
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        store.setOrders(data.orders, data.metrics);
      }
    } catch {
      // Fallback
    } finally {
      store.setLoading(false);
    }
  }, [apiBaseUrl, authHeaders, filterStatus, store]);

  // Fetch Vendors
  const fetchVendors = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/inventory-po/vendors`, {
        credentials: 'include',
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        store.setVendors(data.vendors || []);
      }
    } catch {
      // Fallback
    }
  }, [apiBaseUrl, authHeaders, store]);

  // Fetch GRN History
  const fetchGrns = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/inventory-po/grn`, {
        credentials: 'include',
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        store.setGrns(data.grns || []);
      }
    } catch {
      // Fallback
    }
  }, [apiBaseUrl, authHeaders, store]);

  useEffect(() => {
    fetchOrders();
    fetchVendors();
    fetchGrns();
  }, [fetchOrders, fetchVendors, fetchGrns]);

  // Create PO
  const handleSavePo = async (payload: INewPoPayload) => {
    try {
      store.setLoading(true);
      const res = await fetch(`${apiBaseUrl}/inventory-po/orders`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        store.setActiveModal(null);
        fetchOrders();
      }
    } catch {
      store.setActiveModal(null);
    } finally {
      store.setLoading(false);
    }
  };

  // Approve PO
  const handleApprovePo = async (poId: string) => {
    try {
      store.setLoading(true);
      await fetch(`${apiBaseUrl}/inventory-po/orders/${poId}/approve`, {
        method: 'PATCH',
        headers: authHeaders(),
      });
      fetchOrders();
    } catch {
      // Fallback
    } finally {
      store.setLoading(false);
    }
  };

  // Create GRN
  const handleSaveGrn = async (payload: INewGrnPayload) => {
    try {
      store.setLoading(true);
      const res = await fetch(`${apiBaseUrl}/inventory-po/grn`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        store.setActiveModal(null);
        fetchOrders();
        fetchGrns();
      }
    } catch {
      store.setActiveModal(null);
    } finally {
      store.setLoading(false);
    }
  };

  // Create Vendor
  const handleSaveVendor = async (payload: Partial<IVendorUI>) => {
    try {
      store.setLoading(true);
      const res = await fetch(`${apiBaseUrl}/inventory-po/vendors`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        store.setActiveModal(null);
        fetchVendors();
      }
    } catch {
      store.setActiveModal(null);
    } finally {
      store.setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-zinc-100 flex flex-col font-sans select-none">
      {/* Header */}
      <InventoryPoHeader
        metrics={metrics}
        activeTab={activeTab}
        onTabChange={(tab) => store.setActiveTab(tab)}
        onNewPoClick={() => store.setActiveModal('NEW_PO')}
        onNewVendorClick={() => store.setActiveModal('NEW_VENDOR')}
        onRefreshClick={() => {
          fetchOrders();
          fetchVendors();
          fetchGrns();
        }}
        loading={loading}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 p-6 max-w-[1700px] w-full mx-auto">
        {activeTab === 'PURCHASE_ORDERS' && (
          <PurchaseOrderList
            orders={orders}
            selectedFilter={filterStatus}
            onFilterChange={(status) => store.setFilterStatus(status)}
            searchQuery={searchQuery}
            onSearchChange={(q) => store.setSearchQuery(q)}
            onApprovePo={handleApprovePo}
            onReceiveGrn={(po) => {
              store.setSelectedOrder(po);
              store.setActiveModal('RECEIVE_GRN');
            }}
            loading={loading}
          />
        )}

        {activeTab === 'GRN_HISTORY' && (
          <GrnHistoryTable grns={grns} loading={loading} />
        )}

        {activeTab === 'VENDORS' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <h2 className="text-base font-bold text-white">Registered Vendors & Suppliers</h2>
                <p className="text-xs text-zinc-400">Approved procurement sources with payment terms and rating</p>
              </div>
              <button
                type="button"
                onClick={() => store.setActiveModal('NEW_VENDOR')}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase"
              >
                + Add Supplier
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vendors.length === 0 ? (
                <div className="col-span-full py-16 text-center text-zinc-500 text-sm">
                  No suppliers registered yet
                </div>
              ) : (
                vendors.map((v) => (
                  <div
                    key={v._id}
                    className="p-5 rounded-2xl bg-[#0f131a] border border-zinc-800 hover:border-zinc-700 shadow-md flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-800/80">
                        <span className="font-mono text-xs font-bold text-blue-400">{v.vendorCode}</span>
                        <span className="text-xs text-amber-400">{'★'.repeat(v.rating || 5)}</span>
                      </div>
                      <h3 className="text-base font-bold text-white mt-2">{v.name}</h3>
                      <p className="text-xs text-zinc-400 mt-0.5">{v.contactPerson} • {v.phone}</p>
                      <p className="text-xs text-zinc-500 truncate">{v.email}</p>
                      {v.gstin && (
                        <div className="mt-2 text-[11px] font-mono text-zinc-400 bg-zinc-950 px-2 py-1 rounded inline-block">
                          GSTIN: {v.gstin}
                        </div>
                      )}
                    </div>
                    <div className="mt-4 pt-2 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
                      <span>Terms: <strong className="text-white">{v.paymentTerms}</strong></span>
                      <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300">
                        {v.category}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* New Purchase Order Modal */}
      <NewPurchaseOrderModal
        isOpen={activeModal === 'NEW_PO'}
        vendors={vendors}
        onClose={() => store.setActiveModal(null)}
        onSave={handleSavePo}
        loading={loading}
      />

      {/* GRN Receiving Modal */}
      <GrnReceivingModal
        isOpen={activeModal === 'RECEIVE_GRN'}
        order={selectedOrder}
        onClose={() => store.setActiveModal(null)}
        onSave={handleSaveGrn}
        loading={loading}
      />

      {/* Register Vendor Modal */}
      <VendorDirectoryModal
        isOpen={activeModal === 'NEW_VENDOR'}
        onClose={() => store.setActiveModal(null)}
        onSaveVendor={handleSaveVendor}
        loading={loading}
      />
    </div>
  );
};
