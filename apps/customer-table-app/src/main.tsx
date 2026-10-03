import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { CustomerMenuApp, CustomerRequestType } from './CustomerMenuApp';
import { MenuCartStore } from '@spicehub/ui';
import { SpiceHubSocket, SpiceHubClient } from '@spicehub/api-client';

const store = MenuCartStore.getInstance();
const socket = SpiceHubSocket.getInstance();

export const CustomerAppRoot: React.FC = () => {
  const [hotelId, setHotelId] = useState<string>('6ac0c0012b6d940a98ae20c6');
  const [hotelName, setHotelName] = useState<string>('Hotel Taj Gateway');
  const [tableId, setTableId] = useState<string>('6ac0c0012b6d940a98ae20d4');
  const [tableNumber, setTableNumber] = useState<string>('T-04');
  const [section, setSection] = useState<string>('Indoor AC Dining');
  const [tableSessionId, setTableSessionId] = useState<string>('6ac0c0012b6d940a98ae20d5');
  const [sessionToken, setSessionToken] = useState<string>('active_session_table_4_token_hash');
  const [isReady, setIsReady] = useState<boolean>(false);
  const [liveToast, setLiveToast] = useState<{ message: string; type: 'success' | 'info' | 'warn' } | null>(null);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const queryHotelId = urlParams.get('hotelId');
        const queryTableId = urlParams.get('tableId');

        // Fetch authoritative demo & system context from backend
        const res = await fetch('http://localhost:5000/api/v1/pos/demo-context');
        if (res.ok) {
          const body = await res.json();
          if (body.success && body.data) {
            const d = body.data;
            if (active) {
              setHotelId(queryHotelId || d.hotel.id);
              setHotelName(d.hotel.name);
              if (d.table) {
                setTableId(queryTableId || d.table.id);
                setTableNumber(d.table.tableNumber);
                setSection(d.table.section || 'Indoor AC Dining');
              }
              if (d.session) {
                setTableSessionId(d.session.id);
                setSessionToken(d.session.token);
              }
              if (d.menuItems && d.menuItems.length > 0) {
                store.setMenuItems(d.menuItems);
                console.log(`✅ [CustomerApp] Loaded ${d.menuItems.length} menu items from backend`);
              }
            }
          }
        }
      } catch (err) {
        console.warn('⚠️ [CustomerApp] Using resilient default session:', err);
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
      serverUrl: 'http://localhost:5000',
      hotelId,
      tableSessionId,
    });

    const unbind86 = socket.on('menu:item_86_toggled', (payload: any) => {
      console.log('⚡ [CustomerApp] Realtime 86 broadcast:', payload);
      store.handleItem86Toggled(payload);
    });

    const unbindOrderStatus = socket.on('order:status_updated', (payload: any) => {
      console.log('⚡ [CustomerApp] Order status updated:', payload);
      if (payload.orderStatus === 'PREPARING') {
        setLiveToast({ message: '🍳 Kitchen started cooking your order!', type: 'info' });
      } else if (payload.orderStatus === 'READY') {
        setLiveToast({ message: '🔔 Your order is ready! Waiter is bringing it to your table.', type: 'success' });
      }
      setTimeout(() => setLiveToast(null), 6000);
    });

    return () => {
      unbind86();
      unbindOrderStatus();
    };
  }, [hotelId, tableSessionId]);

  const handleRequestService = async (type: CustomerRequestType) => {
    console.log(`🛎️ [Customer] Requesting service: ${type} for table ${tableNumber}`);
    
    // 1. Send HTTP request to central engine
    try {
      const res = await fetch('http://localhost:5000/api/v1/requests/create', {
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

  const handlePlaceOrder = async (idempotencyKey: string, instructions?: string) => {
    console.log(`🍽️ [Customer] Placing order for ${tableNumber} (Key: ${idempotencyKey})`);
    const cartItems = store.getCartItems();

    if (cartItems.length === 0) return;

    const payload = {
      hotelId,
      tableId,
      tableSessionId,
      sessionToken,
      items: cartItems.map((ci) => ({
        menuItemId: ci.menuItemId,
        quantity: ci.quantity,
      })),
      cookingInstructions: instructions || '',
      idempotencyKey,
    };

    // 1. Send HTTP POST to Authoritative POS Order Placement API
    try {
      const res = await fetch('http://localhost:5000/api/v1/pos/orders/place', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      console.log('✅ POS Place Order HTTP response:', data);
      if (!res.ok && !data.success) {
        throw new Error(data.message || 'Order placement failed');
      }
    } catch (e) {
      console.warn('HTTP order failed, emitting socket fallback:', e);
    }

    // 2. Direct socket broadcast to KDS & Waiter
    socket.emit('order:placed', {
      hotelId,
      table: tableNumber,
      tableNumber,
      items: cartItems.map((ci) => ({
        menuItemId: ci.menuItemId,
        name: ci.name,
        quantity: ci.quantity,
        price: ci.unitPrice,
      })),
      instructions,
      idempotencyKey,
    });

    setLiveToast({
      message: `🎉 Order sent to Kitchen KDS! Table ${tableNumber}`,
      type: 'success',
    });
    setTimeout(() => setLiveToast(null), 5000);
  };

  if (!isReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-semibold tracking-wide text-amber-400">Connecting to Dining Session...</p>
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
        tableNumber={tableNumber}
        section={section}
        onRequestService={handleRequestService}
        onPlaceOrder={handlePlaceOrder}
      />
    </>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <CustomerAppRoot />
    </React.StrictMode>
  );
}
