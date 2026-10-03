import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { WaiterMobileApp } from './WaiterMobileApp';
import { WaiterStore } from '@spicehub/ui';
import { SpiceHubSocket } from '@spicehub/api-client';

const store = WaiterStore.getInstance();
const socket = SpiceHubSocket.getInstance();

// Audio chime using browser Web Audio API
function playAlertChime(type: 'request' | 'ready' = 'request') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'ready') {
      // Pleasant double chime for food ready
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
    } else {
      // Urgent triple pulse for customer assistance
      osc.frequency.setValueAtTime(783.99, ctx.currentTime); // G5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12); // E5
      osc.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.24); // C6
    }

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.55);
    setTimeout(() => ctx.close().catch(() => {}), 600);
  } catch (e) {
    console.warn('Audio chime skipped:', e);
  }
}

export const WaiterAppRoot: React.FC = () => {
  const [hotelId, setHotelId] = useState<string>('6ac0c0012b6d940a98ae20c6');
  const [waiterUser, setWaiterUser] = useState<{ id: string; name: string }>({
    id: '6ac0c0012b6d940a98ae20ca',
    name: 'Ramesh Kumar (Captain)',
  });
  const [notification, setNotification] = useState<{ message: string; type: 'urgent' | 'success' } | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('http://localhost:5000/api/v1/pos/demo-context');
        if (res.ok) {
          const body = await res.json();
          if (body.success && body.data) {
            const d = body.data;
            setHotelId(d.hotel.id);
            if (d.waiter) {
              setWaiterUser({ id: d.waiter.id, name: d.waiter.name });
              store.setProfile({
                userId: d.waiter.id,
                name: d.waiter.name,
                hotelId: d.hotel.id,
                shiftStatus: 'ON_DUTY' as any,
              });
            }
          }
        }
      } catch (err) {
        console.warn('⚠️ [WaiterApp] Fallback to default credentials:', err);
      }
    }
    init();
  }, []);

  const [pickupTickets, setPickupTickets] = useState<any[]>([
    {
      id: 'pickup-init-1',
      orderNumber: 'KOT #101',
      tableNumber: 'Table 4',
      itemsCount: 3,
      readyAt: new Date(Date.now() - 60000).toISOString(),
      status: 'READY_FOR_PICKUP',
      urgency: 'URGENT',
    },
  ]);

  useEffect(() => {
    if (!hotelId) return;

    socket.connect({
      serverUrl: 'http://localhost:5000',
      hotelId,
      userId: waiterUser.id,
      station: 'waiters',
    });

    // Handle service requests (both 'service:request' and 'request:new')
    const handleIncomingRequest = (data: any) => {
      console.log('🛎️ [WaiterApp] Realtime service request arrived:', data);
      playAlertChime('request');

      const table = data.table || data.tableNumber || 'Table 4';
      const type = data.type || data.requestType || 'CALL_WAITER';

      store.addRequest({
        id: data.id || data.requestId || `req-${Date.now()}`,
        tableNumber: table,
        type: type as any,
        status: 'ASSIGNED' as any,
        createdAt: data.createdAt || new Date().toISOString(),
        slaMinutes: data.slaMinutes || 1,
        priority: data.priority || 'HIGH',
      });

      setNotification({
        message: `🚨 ASSISTANCE NEEDED: ${table} requested ${type.replace(/_/g, ' ')}!`,
        type: 'urgent',
      });
      setTimeout(() => setNotification(null), 7000);
    };

    const unbindServiceRequest = socket.on('service:request', handleIncomingRequest);
    const unbindRequestNew = socket.on('request:new', handleIncomingRequest);

    // Handle Food Ready notifications from Kitchen KDS
    const unbindOrderReady = socket.on('order:ready', (data: any) => {
      console.log('🔔 [WaiterApp] Order ready from Kitchen:', data);
      playAlertChime('ready');

      setPickupTickets((prev) => [
        {
          id: `pickup-${Date.now()}`,
          orderNumber: data.orderNumber || `KOT #${Date.now().toString().slice(-4)}`,
          tableNumber: data.tableNumber || 'Table 4',
          itemsCount: data.itemsCount || 2,
          readyAt: new Date().toISOString(),
          status: 'READY_FOR_PICKUP',
          urgency: 'URGENT',
        },
        ...prev,
      ]);

      setNotification({
        message: `🍽️ ORDER READY: Kitchen finished order for ${data.tableNumber || 'Table 4'}! Pickup ready.`,
        type: 'success',
      });
      setTimeout(() => setNotification(null), 8000);
    });

    const unbindOrderCreated = socket.on('order:created', (data: any) => {
      console.log('🍽️ [WaiterApp] New food order placed:', data);
    });

    const unbindStockLow = socket.on('stock:low_alert', (data: any) => {
      console.log('⚠️ [WaiterApp] Kitchen ingredient low stock alert:', data);
      playAlertChime('ready');
      setNotification({
        message: `⚠️ INVENTORY ALERT: Kitchen reports ${data.ingredientName} low (${data.remainingQuantity} ${data.unit} left)!`,
        type: 'urgent',
      });
      setTimeout(() => setNotification(null), 8000);
    });

    return () => {
      unbindServiceRequest();
      unbindRequestNew();
      unbindOrderReady();
      unbindOrderCreated();
      unbindStockLow();
    };
  }, [hotelId, waiterUser.id]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {notification && (
        <div className="fixed top-3 left-3 right-3 z-50 animate-bounce max-w-lg mx-auto">
          <div
            className={`p-4 rounded-2xl shadow-2xl border flex items-center justify-between gap-3 ${
              notification.type === 'urgent'
                ? 'bg-gradient-to-r from-rose-900 to-amber-900 border-amber-500 text-white'
                : 'bg-gradient-to-r from-emerald-900 to-teal-900 border-emerald-500 text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{notification.type === 'urgent' ? '🛎️' : '🍲'}</span>
              <p className="text-xs sm:text-sm font-bold tracking-tight">{notification.message}</p>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="px-2 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold"
            >
              OK
            </button>
          </div>
        </div>
      )}

      <WaiterMobileApp
        store={store}
        pickupTickets={pickupTickets}
        onConfirmPickup={(ticketId) => {
          setPickupTickets((prev) => prev.filter((t) => t.id !== ticketId));
          setNotification({
            message: '✅ Order marked as delivered to guest table!',
            type: 'success',
          });
          setTimeout(() => setNotification(null), 3000);
        }}
        onAcceptRequest={async (reqId) => {
          console.log(`✅ [Waiter] Accepted request: ${reqId}`);
          try {
            await fetch(`http://localhost:5000/api/v1/requests/${reqId}/accept`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ waiterId: waiterUser.id, hotelId }),
            });
          } catch (e) {
            console.warn('HTTP accept failed, using socket:', e);
          }
          socket.emit('request:accepted', { reqId, waiter: waiterUser.name, hotelId });
        }}
        onCompleteRequest={async (reqId) => {
          console.log(`🎉 [Waiter] Completed request: ${reqId}`);
          try {
            await fetch(`http://localhost:5000/api/v1/requests/${reqId}/resolve`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ resolutionNotes: 'Completed by floor captain', hotelId }),
            });
          } catch (e) {
            console.warn('HTTP resolve failed, using socket:', e);
          }
          socket.emit('request:completed', { reqId, hotelId });
        }}
        onFireKot={async (tableId, items, instructions) => {
          console.log(`🔥 [Waiter] Firing KOT for table ${tableId}:`, items);
          try {
            await fetch('http://localhost:5000/api/v1/pos/orders/place', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-idempotency-key': `kot-${Date.now()}-${Math.random().toString(36).substring(7)}`,
              },
              body: JSON.stringify({
                hotelId,
                tableId,
                items: items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity, specialInstructions: i.specialInstructions })),
                cookingInstructions: instructions,
              }),
            });
          } catch (err) {
            console.error('Failed to fire KOT via HTTP:', err);
          }
          socket.emit('waiter:kot_fired', { tableId, items, instructions, hotelId });
        }}
        onRequestCashDrop={async (actualCash, reason) => {
          console.log(`💵 [Waiter] Cash drop requested: ₹${actualCash} (${reason})`);
          socket.emit('waiter:cash_drop_requested', {
            waiterUserId: waiterUser.id,
            waiterName: waiterUser.name,
            actualCash,
            reason,
            hotelId,
          });
        }}
        onGenerateUpiQr={async (tableNumber, amount) => {
          console.log(`📱 [Waiter] Generating Dynamic UPI QR for ${tableNumber}: ₹${amount}`);
          socket.emit('waiter:generate_upi_qr', {
            tableNumber,
            amount,
            waiterUserId: waiterUser.id,
            hotelId,
          });
        }}
      />
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <WaiterAppRoot />
    </React.StrictMode>
  );
}
