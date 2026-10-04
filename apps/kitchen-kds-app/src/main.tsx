import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { KitchenKdsApp, LowStockAlertItem } from './KitchenKdsApp';
import { KdsStore, KdsOrderCardModel } from '@spicehub/ui';
import { SpiceHubSocket } from '@spicehub/api-client';

const store = KdsStore.getInstance();
const socket = SpiceHubSocket.getInstance();

// Web Audio API chime for kitchen staff
function playKitchenChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Two-tone bell for chef order ticket arrival
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // E5

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.65);
    setTimeout(() => ctx.close().catch(() => {}), 700);
  } catch (e) {
    console.warn('Kitchen chime skipped:', e);
  }
}

// Warning chime for low stock ingredients
function playLowStockChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
    osc.frequency.setValueAtTime(349.23, ctx.currentTime + 0.15); // F4

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.55);
    setTimeout(() => ctx.close().catch(() => {}), 600);
  } catch (e) {
    console.warn('Low stock chime skipped:', e);
  }
}

export const KitchenKdsAppRoot: React.FC = () => {
  const [hotelId, setHotelId] = useState<string>('6ac0c0012b6d940a98ae20c6');
  const [stationName, setStationName] = useState<string>('All Stations');
  const [toast, setToast] = useState<string | null>(null);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlertItem[]>([]);

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('http://localhost:5000/api/v1/pos/demo-context');
        if (res.ok) {
          const body = await res.json();
          if (body.success && body.data) {
            const hId = body.data.hotel.id;
            setHotelId(hId);

            // Fetch existing active KDS orders from backend
            try {
              const ordersRes = await fetch(`http://localhost:5000/api/v1/pos/kds/orders?hotelId=${hId}`);
              if (ordersRes.ok) {
                const ordersBody = await ordersRes.json();
                if (ordersBody.success && Array.isArray(ordersBody.data)) {
                  ordersBody.data.forEach((ord: any) => {
                    const roomNumber = ord.roomId?.roomNumber || ord.roomNumber;
                    const tableNumber = ord.tableId?.tableNumber || ord.tableNumber || (roomNumber ? undefined : 'Table 4');
                    const orderType = ord.orderType || (roomNumber ? 'ROOM_SERVICE' : 'DINE_IN');
                    const items = (ord.items || []).map((it: any, idx: number) => ({
                      itemId: it._id?.toString() || `item-${idx}`,
                      menuItemId: it.menuItemId?.toString() || `mi-${idx}`,
                      name: it.name || 'Dish',
                      quantity: it.quantity || 1,
                      unitPrice: it.unitPrice || 200,
                      subtotal: it.subtotal || 200,
                      kitchenStationId: it.kitchenStationId?.toString() || 'st-curry',
                      itemStatus: it.itemStatus || 'PENDING',
                      specialInstructions: it.specialInstructions,
                      allergens: it.allergens || [],
                      hasAllergenAlert: it.hasAllergenAlert || false,
                    }));

                    const kdsOrder: KdsOrderCardModel = {
                      id: ord._id.toString(),
                      orderNumber: ord.orderNumber || `KOT #${ord._id.toString().slice(-4)}`,
                      orderType,
                      tableNumber,
                      roomNumber,
                      roomId: ord.roomId?._id?.toString() || ord.roomId?.toString(),
                      orderStatus: ord.orderStatus || 'PLACED',
                      placedAt: ord.placedAt || ord.createdAt || new Date().toISOString(),
                      elapsedMinutes: 0,
                      urgencyLevel: 'NORMAL',
                      items,
                      cookingInstructions: ord.cookingInstructions,
                    };
                    store.handleNewOrder(kdsOrder);
                  });
                }
              }
            } catch (err) {
              console.warn('Initial KDS orders fetch error:', err);
            }
          }
        }
      } catch (err) {
        console.warn('⚠️ [KDSApp] Using resilient default hotel:', err);
      }
    }
    init();
  }, []);

  // Periodic poll to refresh KDS orders resiliently
  useEffect(() => {
    if (!hotelId) return;
    const interval = setInterval(async () => {
      try {
        const ordersRes = await fetch(`http://localhost:5000/api/v1/pos/kds/orders?hotelId=${hotelId}`);
        if (ordersRes.ok) {
          const ordersBody = await ordersRes.json();
          if (ordersBody.success && Array.isArray(ordersBody.data)) {
            ordersBody.data.forEach((ord: any) => {
              const roomNumber = ord.roomId?.roomNumber || ord.roomNumber;
              const tableNumber = ord.tableId?.tableNumber || ord.tableNumber || (roomNumber ? undefined : 'Table 4');
              const orderType = ord.orderType || (roomNumber ? 'ROOM_SERVICE' : 'DINE_IN');
              const items = (ord.items || []).map((it: any, idx: number) => ({
                itemId: it._id?.toString() || `item-${idx}`,
                menuItemId: it.menuItemId?.toString() || `mi-${idx}`,
                name: it.name || 'Dish',
                quantity: it.quantity || 1,
                unitPrice: it.unitPrice || 200,
                subtotal: it.subtotal || 200,
                kitchenStationId: it.kitchenStationId?.toString() || 'st-curry',
                itemStatus: it.itemStatus || 'PENDING',
                specialInstructions: it.specialInstructions,
                allergens: it.allergens || [],
                hasAllergenAlert: it.hasAllergenAlert || false,
              }));

              const kdsOrder: KdsOrderCardModel = {
                id: ord._id.toString(),
                orderNumber: ord.orderNumber || `KOT #${ord._id.toString().slice(-4)}`,
                orderType,
                tableNumber,
                roomNumber,
                roomId: ord.roomId?._id?.toString() || ord.roomId?.toString(),
                orderStatus: ord.orderStatus || 'PLACED',
                placedAt: ord.placedAt || ord.createdAt || new Date().toISOString(),
                elapsedMinutes: 0,
                urgencyLevel: 'NORMAL',
                items,
                cookingInstructions: ord.cookingInstructions,
              };
              store.handleNewOrder(kdsOrder);
            });
          }
        }
      } catch (e) {}
    }, 4000);
    return () => clearInterval(interval);
  }, [hotelId]);

  // Seed sample initial kitchen stations if none
  useEffect(() => {
    store.setStations([
      { id: 'st-tandoor', stationName: 'Tandoor & Starters', isOnline: true },
      { id: 'st-curry', stationName: 'Main Curry Station', isOnline: true },
      { id: 'st-bar', stationName: 'Bar & Beverages', isOnline: true },
    ]);
  }, []);

  useEffect(() => {
    if (!hotelId) return;

    socket.connect({
      serverUrl: 'http://localhost:5000',
      hotelId,
      station: 'kds',
    });

    const handleNewOrder = (data: any) => {
      console.log('🍳 [KDSApp] Realtime incoming order received:', data);
      playKitchenChime();

      const orderId = data.id || data.orderId || `ord-${Date.now()}`;
      const orderNumber = data.orderNumber || `KOT #${Date.now().toString().slice(-4)}`;
      const roomNumber = data.roomNumber || (data.room ? String(data.room) : undefined);
      const tableNumber = data.tableNumber || data.table || (roomNumber ? undefined : 'Table 4');
      const orderType = data.orderType || (roomNumber ? 'ROOM_SERVICE' : 'DINE_IN');

      const items = (data.items || []).map((it: any, idx: number) => ({
        itemId: it.itemId || it._id || `item-${Date.now()}-${idx}`,
        menuItemId: it.menuItemId || `mi-${idx}`,
        name: it.name || 'Delicious Dish',
        quantity: it.quantity || 1,
        unitPrice: it.unitPrice || it.price || 200,
        subtotal: (it.unitPrice || it.price || 200) * (it.quantity || 1),
        kitchenStationId: it.kitchenStationId || 'st-curry',
        itemStatus: it.itemStatus || 'PENDING',
        specialInstructions: it.specialInstructions,
        allergens: it.allergens || [],
        hasAllergenAlert: it.hasAllergenAlert || false,
      }));

      const newKdsOrder: KdsOrderCardModel = {
        id: orderId,
        orderNumber,
        orderType,
        tableNumber,
        roomNumber,
        orderStatus: data.orderStatus || 'PLACED',
        placedAt: data.placedAt || new Date().toISOString(),
        elapsedMinutes: 0,
        urgencyLevel: 'NORMAL',
        items,
        cookingInstructions: data.cookingInstructions,
      };

      store.handleNewOrder(newKdsOrder);
      const locText = roomNumber ? `Room ${roomNumber}` : tableNumber;
      setToast(`🔥 NEW TICKET: ${orderNumber} for ${locText} (${items.length} dishes)!`);
      setTimeout(() => setToast(null), 6000);
    };

    const unbindCreated = socket.on('order:created', handleNewOrder);
    const unbindNewOrder = socket.on('new_order', handleNewOrder);
    const unbindKitchenNewOrder = socket.on('kitchen:new_order', handleNewOrder);
    const unbindOrderPlaced = socket.on('order:placed', handleNewOrder);
    const unbindInroomPlaced = socket.on('pms:inroom_order_placed', handleNewOrder);

    const unbindStatus = socket.on('order:status_updated', (payload: any) => {
      console.log('🔄 [KDSApp] Order status updated:', payload);
      store.handleStatusUpdated(payload);
    });

    const unbindLowStock = socket.on('stock:low_alert', (data: any) => {
      console.log('⚠️ [KDSApp] BOM Low Stock Alert received:', data);
      playLowStockChime();
      setLowStockAlerts((prev) => [
        {
          id: `alert-${Date.now()}-${Math.random()}`,
          ingredientName: data.ingredientName,
          remainingQuantity: data.remainingQuantity,
          unit: data.unit,
          triggeredByOrder: data.triggeredByOrder,
          timestamp: data.timestamp,
        },
        ...prev,
      ]);
      setToast(`⚠️ BOM ALERT: ${data.ingredientName} low stock (${data.remainingQuantity} ${data.unit} remaining)!`);
      setTimeout(() => setToast(null), 8000);
    });

    const unbindItem86 = socket.on('menu:item_86_toggled', (data: any) => {
      console.log('🚨 [KDSApp] Auto-86 dish toggled:', data);
      setToast(`🚨 DISH 86'd: ${data.dishName} marked unavailable (depleted raw material: ${data.ingredientName})`);
      setTimeout(() => setToast(null), 8000);
    });

    return () => {
      unbindCreated();
      unbindNewOrder();
      unbindKitchenNewOrder();
      unbindOrderPlaced();
      unbindInroomPlaced();
      unbindStatus();
      unbindLowStock();
      unbindItem86();
    };
  }, [hotelId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-bounce max-w-lg w-11/12">
          <div className="p-3.5 bg-gradient-to-r from-amber-600 to-orange-600 rounded-2xl shadow-2xl border border-amber-400 text-white font-extrabold text-sm flex items-center justify-between">
            <span>{toast}</span>
            <button onClick={() => setToast(null)} className="text-white/80 hover:text-white font-bold ml-2">✕</button>
          </div>
        </div>
      )}

      <KitchenKdsApp
        store={store}
        lowStockAlerts={lowStockAlerts}
        onDismissStockAlert={(id) => setLowStockAlerts((prev) => prev.filter((a) => a.id !== id))}
        onStartPreparing={async (orderId) => {
          console.log(`🍳 [KDS] Cooking started: ${orderId}`);
          try {
            store.markOrderPreparing(orderId);
            await fetch(`http://localhost:5000/api/v1/pos/kds/order/${orderId}/status`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId },
              body: JSON.stringify({ status: 'PREPARING' }),
            }).catch((err) => console.warn('HTTP status patch failed:', err));

            await fetch(`http://localhost:5000/api/v1/pms/frontdesk/inroom-order-status/${orderId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId },
              body: JSON.stringify({ status: 'PREPARING' }),
            }).catch(() => {});

            socket.emit('kds:order_preparing', { orderId, hotelId });
          } catch (e: any) {
            console.warn(e.message);
          }
        }}
        onMarkReady={async (orderId) => {
          console.log(`🔔 [KDS] Order ready: ${orderId}`);
          try {
            const currentOrder = store.getOrders().find((o) => o.id === orderId);
            store.markOrderReady(orderId);
            await fetch(`http://localhost:5000/api/v1/pos/kds/order/${orderId}/status`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId },
              body: JSON.stringify({ status: 'READY' }),
            }).catch((err) => console.warn('HTTP status patch failed:', err));

            await fetch(`http://localhost:5000/api/v1/pms/frontdesk/inroom-order-status/${orderId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId },
              body: JSON.stringify({ status: 'READY' }),
            }).catch(() => {});

            socket.emit('kds:order_ready', {
              orderId,
              hotelId,
              tableNumber: currentOrder?.tableNumber,
              roomNumber: currentOrder?.roomNumber,
            });
            setToast(`✅ Order ${currentOrder?.orderNumber || orderId} marked READY!`);
            setTimeout(() => setToast(null), 5000);
          } catch (e: any) {
            console.warn(e.message);
          }
        }}
        onMarkServed={async (orderId) => {
          console.log(`🍽️ [KDS] Order served: ${orderId}`);
          try {
            const currentOrder = store.getOrders().find((o) => o.id === orderId);
            store.markOrderServed(orderId);
            await fetch(`http://localhost:5000/api/v1/pos/kds/order/${orderId}/status`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId },
              body: JSON.stringify({ status: 'SERVED' }),
            }).catch(() => {});

            await fetch(`http://localhost:5000/api/v1/pms/frontdesk/inroom-order-status/${orderId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId },
              body: JSON.stringify({ status: 'SERVED' }),
            }).catch(() => {});

            setToast(`🍽️ Order ${currentOrder?.orderNumber || orderId} marked SERVED!`);
            setTimeout(() => setToast(null), 5000);
          } catch (e: any) {
            console.warn(e.message);
          }
        }}
      />
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <KitchenKdsAppRoot />
    </React.StrictMode>
  );
}
