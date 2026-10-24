import './index.css';
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { CustomerMenuApp, CustomerRequestType } from './CustomerMenuApp';
import { ErrorBoundary, MenuCartStore } from '@spicehub/ui';
import { SpiceHubSocket, SpiceHubClient } from '@spicehub/api-client';
import { API_ORIGIN, SOCKET_URL } from './config/api';

const store = MenuCartStore.getInstance();
const socket = SpiceHubSocket.getInstance();
const API_BASE = API_ORIGIN;

export interface PlacedOrderItem {
  id?: string;
  menuItemId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  itemStatus?: string;
  specialInstructions?: string;
}

export interface PlacedOrder {
  id?: string;
  orderId?: string;
  orderNumber: string;
  orderStatus: 'PLACED' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';
  items: PlacedOrderItem[];
  cookingInstructions?: string;
  placedAt?: string | Date;
  totalAmount?: number;
}

export const CustomerAppRoot: React.FC = () => {
  const [hotelId, setHotelId] = useState<string>('');
  const [hotelName, setHotelName] = useState<string>('SpiceHub Hotel');
  const [tableId, setTableId] = useState<string>('');
  const [tableNumber, setTableNumber] = useState<string>('');
  const [section, setSection] = useState<string>('Dining');
  const [tableSessionId, setTableSessionId] = useState<string>('');
  const [sessionToken, setSessionToken] = useState<string>('');
  const [guestCount, setGuestCount] = useState<number>(2);
  const [bootstrapError, setBootstrapError] = useState<string>('');
  const [isReady, setIsReady] = useState<boolean>(false);
  const [liveToast, setLiveToast] = useState<{ message: string; type: 'success' | 'info' | 'warn' } | null>(null);
  const [activeOrders, setActiveOrders] = useState<PlacedOrder[]>(() => {
    try {
      const saved = localStorage.getItem('spicehub_customer_active_orders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const fetchSessionOrders = async (sId: string) => {
    try {
      const ordersRes = await fetch(`${API_BASE}/api/v1/pos/table-session/${sId}/orders`);
      if (ordersRes.ok) {
        const body = await ordersRes.json();
        if (body.success && Array.isArray(body.data)) {
          setActiveOrders(body.data);
          try {
            localStorage.setItem('spicehub_customer_active_orders', JSON.stringify(body.data));
          } catch {}
          return body.data;
        }
      }
    } catch (err) {
      console.warn('⚠️ [CustomerApp] Could not fetch session orders:', err);
    }
    return null;
  };

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const queryHotelId = urlParams.get('hotelId');
        const queryTableId = urlParams.get('tableId');
        const qrToken = urlParams.get('qrToken') || urlParams.get('token');
        const isQrEntry = Boolean(queryHotelId && queryTableId);

        // Real QR entry is authoritative. Demo context is a local-only fallback.
        if (isQrEntry) {
          const qrUrl = new URL(`${API_BASE}/api/v1/pos/table/qr-entry`);
          qrUrl.searchParams.set('hotelId', String(queryHotelId));
          qrUrl.searchParams.set('tableId', String(queryTableId));
          if (qrToken) qrUrl.searchParams.set('token', qrToken);

          const qrRes = await fetch(qrUrl.toString());
          const qrBody = await qrRes.json().catch(() => null);
          if (!qrRes.ok || !qrBody?.success || !qrBody?.data?.sessionToken) {
            throw new Error(qrBody?.message || 'This table QR code is invalid or has expired.');
          }

          const d = qrBody.data;
          if (!active) return;
          setHotelId(String(d.hotelId || queryHotelId));
          setHotelName(d.hotelName || 'SpiceHub Hotel');
          setTableId(String(d.tableId));
          setTableNumber(d.tableNumber);
          setSection(d.section || 'Dining');
          setTableSessionId(String(d.sessionId));
          setSessionToken(String(d.sessionToken));
          setGuestCount(Number(d.guestCount) > 0 ? Number(d.guestCount) : 2);

          if (d.sessionId) {
            await fetchSessionOrders(String(d.sessionId));
          }
          return;
        }

        // Local development / emulator bootstrap without QR query params.
        const res = await fetch(`${API_BASE}/api/v1/pos/demo-context`);
        const body = await res.json().catch(() => null);
        if (!res.ok || !body?.success || !body?.data) {
          throw new Error(body?.message || 'Unable to initialize a dining session.');
        }

        const d = body.data;
        if (!active) return;
        setHotelId(d.hotel.id);
        setHotelName(d.hotel.name);
        if (d.table) {
          setTableId(d.table.id);
          setTableNumber(d.table.tableNumber);
          setSection(d.table.section || 'Indoor AC Dining');
        }
        if (d.session) {
          setTableSessionId(d.session.id);
          setSessionToken(d.session.token);
          setGuestCount(Number(d.session.guestCount) > 0 ? Number(d.session.guestCount) : 2);
        }
        if (d.orders && Array.isArray(d.orders) && d.orders.length > 0) {
          setActiveOrders(d.orders);
          try {
            localStorage.setItem('spicehub_customer_active_orders', JSON.stringify(d.orders));
          } catch {}
        } else if (d.session?.id) {
          await fetchSessionOrders(d.session.id);
        }
        if (d.menuItems && d.menuItems.length > 0) {
          store.setMenuItems(d.menuItems);
          console.log(`✅ [CustomerApp] Loaded ${d.menuItems.length} menu items from backend`);
        }
      } catch (err: any) {
        console.warn('⚠️ [CustomerApp] Session bootstrap failed:', err);
        if (active) {
          setBootstrapError(err?.message || 'Unable to connect to this dining table.');
        }
      } finally {
        if (active) setIsReady(true);
      }
    }

    bootstrap();
    return () => {
      active = false;
    };
  }, []);

  // Connect socket once hotel and session are initialized
  useEffect(() => {
    if (!hotelId) return;

    socket.connect({
      serverUrl: SOCKET_URL,
      hotelId,
      tableSessionId,
      token: sessionToken || undefined,
    });

    const unbind86 = socket.on('menu:item_86_toggled', (payload: any) => {
      console.log('⚡ [CustomerApp] Realtime 86 broadcast:', payload);
      store.handleItem86Toggled(payload);
      window.dispatchEvent(new CustomEvent('spicehub:menu_updated', { detail: payload }));
    });

    const unbindCatalogUpdated = socket.on('menu:catalog_updated', (payload: any) => {
      console.log('⚡ [CustomerApp] Realtime menu catalog updated:', payload);
      window.dispatchEvent(new CustomEvent('spicehub:menu_updated', { detail: payload }));
    });

    const unbindCategoryCreated = socket.on('menu:category_created', () => {
      window.dispatchEvent(new CustomEvent('spicehub:menu_updated'));
    });
    const unbindCategoryDeleted = socket.on('menu:category_deleted', () => {
      window.dispatchEvent(new CustomEvent('spicehub:menu_updated'));
    });
    const unbindCategoryUpdated = socket.on('menu:category_updated', () => {
      window.dispatchEvent(new CustomEvent('spicehub:menu_updated'));
    });
    const unbindItemCreated = socket.on('menu:item_created', () => {
      window.dispatchEvent(new CustomEvent('spicehub:menu_updated'));
    });
    const unbindItemDeleted = socket.on('menu:item_deleted', () => {
      window.dispatchEvent(new CustomEvent('spicehub:menu_updated'));
    });

    const unbindOrderStatus = socket.on('order:status_updated', (payload: any) => {
      console.log('⚡ [CustomerApp] Order status updated:', payload);
      setActiveOrders((prev) => {
        const updated = prev.map((o) => {
          if (
            o.orderNumber === payload.orderNumber ||
            o.id === payload.orderId ||
            o.orderId === payload.orderId ||
            (payload.order && payload.order.orderNumber === o.orderNumber)
          ) {
            return { ...o, orderStatus: payload.orderStatus };
          }
          return o;
        });
        try {
          localStorage.setItem('spicehub_customer_active_orders', JSON.stringify(updated));
        } catch {}
        return updated;
      });

      if (payload.orderStatus === 'PREPARING') {
        setLiveToast({ message: '🍳 Kitchen started cooking your order!', type: 'info' });
      } else if (payload.orderStatus === 'READY') {
        setLiveToast({ message: '🔔 Your order is ready! Waiter is bringing it to your table.', type: 'success' });
      } else if (payload.orderStatus === 'SERVED') {
        setLiveToast({ message: '🍽️ Your order has been served! Enjoy your meal.', type: 'success' });
      }
      setTimeout(() => setLiveToast(null), 6000);
    });

    return () => {
      unbind86();
      unbindCatalogUpdated();
      unbindCategoryCreated();
      unbindCategoryDeleted();
      unbindCategoryUpdated();
      unbindItemCreated();
      unbindItemDeleted();
      unbindOrderStatus();
    };
  }, [hotelId, tableSessionId, sessionToken]);

  const handleRequestService = async (type: CustomerRequestType) => {
    console.log(`🛎️ [Customer] Requesting service: ${type} for table ${tableNumber}`);
    
    // 1. Send HTTP request to central engine
    try {
      const res = await fetch(`${API_BASE}/api/v1/requests/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId,
          tableId,
          tableSessionId,
          requestType: type,
          priority: 'HIGH',
        }),
      });
      const data = await res.json();
      console.log('✅ Service request HTTP response:', data);
    } catch (e) {
      console.warn('HTTP request fallback to socket:', e);
    }

    // 2. Direct socket emission for 0ms millisecond sync to all on-duty waiters
    socket.emit('service:request', {
      hotelId,
      table: tableNumber,
      tableNumber,
      type,
      requestType: type,
      priority: 'HIGH',
    });

    setLiveToast({
      message: `🛎️ ${type.replace(/_/g, ' ')} call sent! Waiter notified.`,
      type: 'success',
    });
    setTimeout(() => setLiveToast(null), 4000);
  };

  const handlePlaceOrder = async (idempotencyKey: string, instructions?: string, clientItems?: any[], requestedGuestCount?: number): Promise<boolean> => {
    const cartItems = clientItems && clientItems.length > 0 ? clientItems : store.getCartItems();
    if (!cartItems || cartItems.length === 0) return false;

    if (!hotelId || !tableSessionId || !sessionToken) {
      setLiveToast({ message: 'Dining session is not ready. Please rescan the table QR code.', type: 'warn' });
      setTimeout(() => setLiveToast(null), 5000);
      return false;
    }

    const effectiveGuestCount =
      Number(requestedGuestCount) > 0 ? Number(requestedGuestCount) : guestCount;

    if (effectiveGuestCount !== guestCount) setGuestCount(effectiveGuestCount);

    const payload = {
      hotelId,
      tableId,
      tableSessionId,
      sessionToken,
      guestCount: effectiveGuestCount,
      items: cartItems.map((ci: any) => ({
        menuItemId: ci.id || ci.menuItemId,
        name: ci.name,
        price: ci.price || ci.unitPrice,
        quantity: ci.qty || ci.quantity || 1,
      })),
      cookingInstructions: instructions || '',
      idempotencyKey,
    };

    let serverOrderData: any = null;

    // Authoritative POS order placement. Never show an order that the server rejected.
    try {
      const res = await fetch(`${API_BASE}/api/v1/pos/orders/place`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success || !(data?.data || data?.order)) {
        setLiveToast({
          message: data?.message || 'Order could not be sent to the kitchen. Please try again.',
          type: 'warn',
        });
        setTimeout(() => setLiveToast(null), 6000);
        return false;
      }
      serverOrderData = data.data || data.order;
    } catch (err: any) {
      setLiveToast({
        message: err?.message || 'Kitchen is unreachable. Your order was not placed.',
        type: 'warn',
      });
      setTimeout(() => setLiveToast(null), 6000);
      return false;
    }

    const placeOrderId = serverOrderData._id
      ? serverOrderData._id.toString()
      : (serverOrderData.id ? String(serverOrderData.id) : '');

    const placedOrder: PlacedOrder = {
      id: placeOrderId,
      orderId: placeOrderId,
      orderNumber: serverOrderData.orderNumber,
      orderStatus: (serverOrderData.orderStatus as any) || 'PLACED',
      items: Array.isArray(serverOrderData.items) && serverOrderData.items.length > 0
        ? serverOrderData.items.map((item: any) => ({
            id: item._id ? String(item._id) : item.id,
            menuItemId: item.menuItemId ? String(item.menuItemId) : undefined,
            name: item.name,
            quantity: Number(item.quantity) || 1,
            unitPrice: Number(item.unitPrice) || 0,
            subtotal: Number(item.subtotal) || 0,
            itemStatus: item.itemStatus,
            specialInstructions: item.specialInstructions,
          }))
        : cartItems.map((ci: any) => ({
            id: ci.id || ci.menuItemId,
            menuItemId: ci.id || ci.menuItemId,
            name: ci.name,
            quantity: ci.qty || ci.quantity || 1,
            unitPrice: ci.price || ci.unitPrice || 0,
            subtotal: (ci.price || ci.unitPrice || 0) * (ci.qty || ci.quantity || 1),
          })),
      cookingInstructions: instructions || '',
      placedAt: serverOrderData.placedAt || new Date().toISOString(),
      totalAmount: Number(serverOrderData.totalAmount) || cartItems.reduce(
        (acc: number, ci: any) => acc + (ci.price || ci.unitPrice || 0) * (ci.qty || ci.quantity || 1),
        0
      ),
    };

    setActiveOrders((prev) => {
      if (prev.some((order) => order.id === placedOrder.id && order.id)) return prev;
      const updated = [...prev, placedOrder];
      try {
        localStorage.setItem('spicehub_customer_active_orders', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Guest-count updates are persisted by the backend together with the order.
    setLiveToast({
      message: `🎉 Order ${placedOrder.orderNumber} sent to Kitchen KDS! Table ${tableNumber}`,
      type: 'success',
    });
    setTimeout(() => setLiveToast(null), 5000);
    return true;
  };

  const handleSettleBill = async (paymentMode: 'UPI' | 'CARD' | 'CASH' | 'ROOM', amount: number, utr?: string) => {
    console.log(`💳 [Customer] Settling bill for table ${tableNumber} (Mode: ${paymentMode}, Amount: ${amount})`);
    const idempotencyKey = `PAY_T5_${Date.now()}`;
    const payload = {
      hotelId,
      tableSessionId,
      paymentMode,
      amount,
      utrNumber: utr || (paymentMode === 'UPI' ? `UPI${Date.now()}` : undefined),
      idempotencyKey,
    };

    let result: any = null;
    try {
      const res = await fetch(`${API_BASE}/api/v1/billing/settle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': idempotencyKey,
          'x-session-token': sessionToken,
        },
        body: JSON.stringify(payload),
      });
      result = await res.json().catch(() => null);
      if (!res.ok || !result?.success) {
        setLiveToast({
          message: result?.message || 'Payment could not be completed. Please retry or call a cashier.',
          type: 'warn',
        });
        setTimeout(() => setLiveToast(null), 6000);
        return result;
      }
    } catch (err: any) {
      setLiveToast({
        message: err?.message || 'Payment gateway unreachable. No payment was recorded.',
        type: 'warn',
      });
      setTimeout(() => setLiveToast(null), 6000);
      return null;
    }

    // Only broadcast and clear after the backend has recorded the payment.
    socket.emit('payment:completed', {
      hotelId,
      tableNumber,
      tableSessionId,
      amount,
      paymentMode,
    });

    socket.emit('table:status_changed', {
      hotelId,
      tableNumber,
      status: 'NEEDS_CLEANING',
    });

    setActiveOrders([]);
    try {
      localStorage.removeItem('spicehub_customer_active_orders');
    } catch {}

    setLiveToast({
      message: `🎉 Bill ₹${amount} settled via ${paymentMode}! Table marked for cleaning.`,
      type: 'success',
    });
    setTimeout(() => setLiveToast(null), 5000);
    return result;
  };

  if (!isReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-semibold tracking-wide text-amber-400">Connecting to Dining Session...</p>
      </div>
    );
  }

  if (bootstrapError) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6 text-center text-white">
        <div className="text-4xl mb-4">⚠️</div>
        <h1 className="text-xl font-black text-amber-400">Dining session unavailable</h1>
        <p className="mt-2 max-w-md text-sm text-slate-300">{bootstrapError}</p>
        <p className="mt-1 text-xs text-slate-500">Please rescan the QR code on your table or ask a waiter for help.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      {liveToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md animate-bounce">
          <div
            className={`px-4 py-3 rounded-2xl shadow-2xl border text-sm font-bold flex items-center justify-between gap-2 ${
              liveToast.type === 'success'
                ? 'bg-emerald-950 text-emerald-200 border-emerald-600'
                : 'bg-amber-950 text-amber-200 border-amber-600'
            }`}
          >
            <span>{liveToast.message}</span>
            <button onClick={() => setLiveToast(null)} className="text-white/60 hover:text-white">✕</button>
          </div>
        </div>
      )}
      <CustomerMenuApp
        store={store}
        hotelName={hotelName}
        tableNumber={tableNumber}
        section={section}
        onRequestService={handleRequestService}
        onPlaceOrder={handlePlaceOrder}
        onSettleBill={handleSettleBill}
        activeOrders={activeOrders}
        initialGuestCount={guestCount}
        hotelId={hotelId}
        onRefreshOrders={() => {
          if (tableSessionId) fetchSessionOrders(tableSessionId);
        }}
      />
    </>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <CustomerAppRoot />
      </ErrorBoundary>
    </React.StrictMode>
  );
}
