import React, { useState, useEffect, useCallback } from 'react';
import {
  Flame,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Utensils,
  ChefHat,
  Shield,
  Search,
  Filter,
  PlusCircle,
  Timer,
  Check,
  Send,
  Coffee,
} from 'lucide-react';
import { apiFetch, getStoredHotelId } from '../../config/api';
import { getPortalUrl } from '../../config/portalUrls';
import { KotVoidAuditApp } from '../kot-void/KotVoidAuditApp';

export interface LiveOrderItem {
  name: string;
  quantity: number;
  unitPrice?: number;
  specialInstructions?: string;
  isReady?: boolean;
}

export interface LiveOrderTicket {
  _id: string;
  orderNumber: string;
  orderType: 'DINE_IN' | 'ROOM_SERVICE' | 'TAKEAWAY' | 'DELIVERY';
  orderStatus: 'PLACED' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'SERVED' | 'COMPLETED' | 'CANCELLED';
  tableNumber?: string | null;
  roomNumber?: string | null;
  guestName?: string;
  waiterName?: string;
  items: LiveOrderItem[];
  cookingInstructions?: string;
  createdAt: string;
  updatedAt?: string;
}

interface LiveOrdersAndKdsConsoleAppProps {
  hotelId?: string;
}

export const LiveOrdersAndKdsConsoleApp: React.FC<LiveOrdersAndKdsConsoleAppProps> = ({
  hotelId: propHotelId,
}) => {
  const hotelId = propHotelId || getStoredHotelId();
  const [activeTab, setActiveTab] = useState<'KDS_QUEUE' | 'VOID_AUDIT'>('KDS_QUEUE');
  const [statusFilter, setStatusFilter] = useState<string>('ALL_ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState<LiveOrderTicket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isCreatingTestOrder, setIsCreatingTestOrder] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await apiFetch(`/pos/orders/recent?limit=30`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.orders)) {
          setOrders(data.orders);
        }
      }
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to fetch live orders:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => {
      fetchOrders();
    }, 8000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    try {
      const res = await apiFetch(`/pos/kds/order/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o._id === orderId ? { ...o, orderStatus: nextStatus as any } : o))
        );
      } else {
        // Fallback for general orders endpoint
        await apiFetch(`/pos/orders/${orderId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: nextStatus }),
        });
        await fetchOrders();
      }
    } catch (err: any) {
      console.error('Failed to update order status:', err);
      alert(`Could not update order: ${err.message}`);
    }
  };

  const handleCreateSampleOrder = async () => {
    try {
      setIsCreatingTestOrder(true);
      const testOrderPayload = {
        hotelId,
        orderType: 'DINE_IN',
        tableNumber: 'T-01',
        tableId: 't-01',
        guestName: 'Walk-in Guest',
        items: [
          { menuItemId: 'sample-1', name: 'Paneer Butter Masala', quantity: 2, unitPrice: 280, specialInstructions: 'Medium spicy' },
          { menuItemId: 'sample-2', name: 'Butter Naan', quantity: 4, unitPrice: 45 },
          { menuItemId: 'sample-3', name: 'Jeera Rice', quantity: 1, unitPrice: 180 },
        ],
        cookingInstructions: 'Serve hot with mint chutney',
      };

      const res = await apiFetch('/pos/orders/place', {
        method: 'POST',
        headers: {
          'x-idempotency-key': `kds-test-${Date.now()}`,
        },
        body: JSON.stringify(testOrderPayload),
      });

      if (res.ok) {
        await fetchOrders();
      } else {
        // Mock fallback if table not currently mapped
        const sampleMock: LiveOrderTicket = {
          _id: `test-${Date.now()}`,
          orderNumber: `KOT-${Math.floor(100 + Math.random() * 900)}`,
          orderType: 'DINE_IN',
          orderStatus: 'PREPARING',
          tableNumber: 'T-01',
          guestName: 'Dining Table T-01',
          items: testOrderPayload.items,
          cookingInstructions: testOrderPayload.cookingInstructions,
          createdAt: new Date().toISOString(),
        };
        setOrders((prev) => [sampleMock, ...prev]);
      }
    } catch (err: any) {
      console.error('Error creating sample order:', err);
    } finally {
      setIsCreatingTestOrder(false);
    }
  };

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    if (statusFilter === 'ALL_ACTIVE') {
      if (['SERVED', 'COMPLETED', 'CANCELLED'].includes(order.orderStatus)) return false;
    } else if (statusFilter === 'PLACED') {
      if (!['PLACED', 'ACCEPTED'].includes(order.orderStatus)) return false;
    } else if (statusFilter === 'PREPARING') {
      if (order.orderStatus !== 'PREPARING') return false;
    } else if (statusFilter === 'READY') {
      if (order.orderStatus !== 'READY') return false;
    } else if (statusFilter === 'SERVED') {
      if (!['SERVED', 'COMPLETED'].includes(order.orderStatus)) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = order.orderNumber.toLowerCase().includes(q);
      const matchTable = (order.tableNumber || '').toLowerCase().includes(q);
      const matchRoom = (order.roomNumber || '').toLowerCase().includes(q);
      const matchItem = order.items.some((i) => i.name.toLowerCase().includes(q));
      if (!matchNum && !matchTable && !matchRoom && !matchItem) return false;
    }

    return true;
  });

  const activeCount = orders.filter((o) => !['SERVED', 'COMPLETED', 'CANCELLED'].includes(o.orderStatus)).length;
  const preparingCount = orders.filter((o) => o.orderStatus === 'PREPARING').length;
  const readyCount = orders.filter((o) => o.orderStatus === 'READY').length;

  const getElapsedMinutes = (dateStr: string) => {
    const elapsed = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    return Math.max(0, elapsed);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 shadow-2xs">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Kitchen KDS & Orders Live Queue</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time active KOT cooking queue, pass dispatch & supervisor security controls
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchOrders}
            disabled={isLoading}
            className="btn-glass-green flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer shadow-xs active:scale-95"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync ({lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
          </button>

          <a
            href={getPortalUrl('kds')}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-300 shadow-xs active:scale-95 transition"
          >
            <span>Kitchen KDS Terminal</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </a>
        </div>
      </div>

      {/* Top Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('KDS_QUEUE')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'KDS_QUEUE'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ChefHat className="w-4 h-4" />
          <span>Active Kitchen Queue</span>
          {activeCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-orange-500 text-white font-bold ml-1">
              {activeCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('VOID_AUDIT')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'VOID_AUDIT'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>KOT Security & Void Audit</span>
        </button>
      </div>

      {/* Main Content Area */}
      {activeTab === 'VOID_AUDIT' ? (
        <KotVoidAuditApp hotelId={hotelId} />
      ) : (
        <div className="space-y-4">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
              <div className="text-[11px] font-semibold text-slate-500">Active Kitchen Tickets</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{activeCount}</div>
            </div>

            <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 shadow-2xs">
              <div className="text-[11px] font-semibold text-blue-700">In Preparation (Cooking)</div>
              <div className="text-2xl font-black text-blue-900 mt-1">{preparingCount}</div>
            </div>

            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 shadow-2xs">
              <div className="text-[11px] font-semibold text-emerald-700">Ready for Service</div>
              <div className="text-2xl font-black text-emerald-900 mt-1">{readyCount}</div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Live KOT Simulation</div>
                <div className="text-xs text-slate-600 mt-1">Test kitchen ticketing</div>
              </div>
              <button
                onClick={handleCreateSampleOrder}
                disabled={isCreatingTestOrder}
                className="btn-glass-green px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-800 flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ KOT Ticket</span>
              </button>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {[
                { id: 'ALL_ACTIVE', label: 'All Active' },
                { id: 'PLACED', label: 'New / Received' },
                { id: 'PREPARING', label: 'In Cooking' },
                { id: 'READY', label: 'Ready to Serve' },
                { id: 'SERVED', label: 'Served History' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    statusFilter === f.id
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticket #, table, item..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
              />
            </div>
          </div>

          {/* Tickets Grid */}
          {filteredOrders.length === 0 ? (
            <div className="py-20 text-center bg-white border border-slate-200 rounded-2xl p-8">
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
                <ChefHat className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No Active Kitchen Orders</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                All food stations are clear. When guests order from dining tables, QR menus, or room service, tickets appear here live.
              </p>
              <button
                onClick={handleCreateSampleOrder}
                disabled={isCreatingTestOrder}
                className="btn-glass-green mt-4 px-4 py-2 rounded-xl text-xs font-bold text-emerald-900 inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Generate Test KOT Order</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrders.map((order) => {
                const elapsedMins = getElapsedMinutes(order.createdAt);
                const isOverdue = elapsedMins > 20;

                return (
                  <div
                    key={order._id}
                    className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition shadow-2xs"
                  >
                    <div>
                      {/* Ticket Header */}
                      <div className="flex items-start justify-between pb-2.5 border-b border-slate-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-black text-slate-900">
                              {order.orderNumber || `#${order._id.slice(-5).toUpperCase()}`}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                order.orderType === 'ROOM_SERVICE'
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}
                            >
                              {order.orderType === 'ROOM_SERVICE'
                                ? `Room ${order.roomNumber || 'Guest'}`
                                : `Table ${order.tableNumber || 'Dining'}`}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {order.guestName || 'In-House Guest'}
                          </div>
                        </div>

                        {/* Timer Badge */}
                        <div
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold ${
                            isOverdue
                              ? 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          <span>{elapsedMins}m ago</span>
                        </div>
                      </div>

                      {/* Instructions if any */}
                      {order.cookingInstructions && (
                        <div className="mt-2.5 p-2 rounded-lg bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-900 font-medium flex items-start gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>Note: {order.cookingInstructions}</span>
                        </div>
                      )}

                      {/* Items List */}
                      <div className="mt-3 space-y-2">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex items-baseline justify-between text-xs">
                            <div className="flex items-baseline gap-2">
                              <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-800 font-bold flex items-center justify-center text-[11px]">
                                {item.quantity}x
                              </span>
                              <span className="font-semibold text-slate-900">{item.name}</span>
                            </div>
                            {item.specialInstructions && (
                              <span className="text-[10px] text-slate-400 italic">
                                ({item.specialInstructions})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Status: <strong className="text-slate-900">{order.orderStatus}</strong>
                      </span>

                      <div className="flex items-center gap-1.5">
                        {['PLACED', 'ACCEPTED'].includes(order.orderStatus) && (
                          <button
                            onClick={() => handleUpdateStatus(order._id, 'PREPARING')}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition active:scale-95 cursor-pointer shadow-2xs flex items-center gap-1"
                          >
                            <Flame className="w-3 h-3" />
                            <span>Start Cooking</span>
                          </button>
                        )}

                        {order.orderStatus === 'PREPARING' && (
                          <button
                            onClick={() => handleUpdateStatus(order._id, 'READY')}
                            className="btn-glass-green px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-950 transition active:scale-95 cursor-pointer shadow-2xs flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Mark Ready</span>
                          </button>
                        )}

                        {order.orderStatus === 'READY' && (
                          <button
                            onClick={() => handleUpdateStatus(order._id, 'SERVED')}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition active:scale-95 cursor-pointer shadow-2xs flex items-center gap-1"
                          >
                            <Utensils className="w-3 h-3" />
                            <span>Mark Served</span>
                          </button>
                        )}

                        {['SERVED', 'COMPLETED'].includes(order.orderStatus) && (
                          <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Delivered</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
