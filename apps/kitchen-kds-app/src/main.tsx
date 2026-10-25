import './index.css';
import { API_BASE_URL, SOCKET_URL } from './config/api';
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { KitchenKdsApp, LowStockAlertItem } from './KitchenKdsApp';
import { Kds86DishItem } from './components/Kds86ManagerDrawer';
import { ErrorBoundary, KdsStore, KdsOrderCardModel, StaffLoginGate } from '@spicehub/ui';
import { SpiceHubSocket } from '@spicehub/api-client';
import { kdsFetch, getKdsHotelId } from './lib/kdsApi';

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

// Urgent warning buzzer sound for floor waiter requests
function playKitchenBuzzerSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // E5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3); // A5

    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.75);
    setTimeout(() => ctx.close().catch(() => {}), 800);
  } catch (e) {
    console.warn('Kitchen buzzer chime skipped:', e);
  }
}

export const KitchenKdsAppRoot: React.FC = () => {
  const [hotelId, setHotelId] = useState<string>(() => getKdsHotelId());
  const [stationName, setStationName] = useState<string>('All Stations');
  const [toast, setToast] = useState<string | null>(null);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlertItem[]>([]);
  const [kitchenBuzzers, setKitchenBuzzers] = useState<any[]>([]);
  const [dishes86, setDishes86] = useState<Kds86DishItem[]>([]);

  const fetchDishes86 = async () => {
    if (!hotelId) return;
    try {
      const res = await kdsFetch(`${API_BASE_URL}/menu-catalog/items?hotelId=${encodeURIComponent(hotelId)}`);
      if (res.ok) {
        const body = await res.json();
        if (body.success && Array.isArray(body.data)) {
          setDishes86(
            body.data.map((m: any) => ({
              id: m.id || m._id,
              name: m.name,
              category: m.category || 'Main Course',
              stationName: m.kitchenStationName || 'Kitchen Pass',
              isAvailable: m.isAvailable !== false,
              outOfStockReason: m.outOfStockReason,
            }))
          );
        }
      }
    } catch (err) {
      console.warn('Error fetching 86 dishes in KDS:', err);
    }
  };

  useEffect(() => {
    if (!hotelId) return;
    fetchDishes86();
    const unbind86 = socket.on('menu:item_86_toggled', () => fetchDishes86());
    const unbindCatalog = socket.on('menu:catalog_updated', () => fetchDishes86());
    return () => {
      unbind86();
      unbindCatalog();
    };
  }, [hotelId]);

  const handleToggleItem86 = async (itemId: string, isAvailable: boolean, reason?: string) => {
    try {
      setDishes86((prev) =>
        prev.map((d) => (d.id === itemId ? { ...d, isAvailable, outOfStockReason: reason } : d))
      );
      await kdsFetch(`${API_BASE_URL}/menu-catalog/items/${itemId}/toggle-86`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable, reason: reason || 'Kitchen Station Exhausted' }),
      });
      socket.emit('menu:item_86_toggled', { itemId, isAvailable, reason, hotelId });
      setToast(
        isAvailable
          ? `✅ Restocked item! Visible for customer & waiter ordering.`
          : `🚫 Item 86'd (OUT OF STOCK)! Blocked across dining apps.`
      );
      setTimeout(() => setToast(null), 4000);
      fetchDishes86();
    } catch (err) {
      console.error('Failed to toggle 86 item:', err);
    }
  };

  const handleBatchToggle86 = async (itemIds: string[], isAvailable: boolean, reason?: string) => {
    try {
      for (const id of itemIds) {
        await handleToggleItem86(id, isAvailable, reason);
      }
    } catch (err) {
      console.error('Batch toggle 86 failed:', err);
    }
  };

  // Fetch initial active buzzers
  useEffect(() => {
    if (!hotelId) return;
    kdsFetch(`${API_BASE_URL}/pos/kds/buzzers?hotelId=${hotelId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setKitchenBuzzers(res.data);
        }
      })
      .catch(() => {});
  }, [hotelId]);

  useEffect(() => {
    async function init() {
      const hId = getKdsHotelId();
      if (!hId) {
        console.warn('[KDSApp] No hotel context in the staff session.');
        return;
      }
      setHotelId(hId);

      // Load the tenant's real kitchen stations instead of demo station IDs.
      try {
        const stationsRes = await kdsFetch(`${API_BASE_URL}/pos/kds/stations?hotelId=${hId}`);
        if (stationsRes.ok) {
          const stationsBody = await stationsRes.json();
          if (stationsBody.success && Array.isArray(stationsBody.data)) {
            store.setStations(
              stationsBody.data.map((station: any) => ({
                id: String(station._id || station.id),
                stationName: formatStationLabel(station.stationName),
                isOnline: station.isOnline !== false,
                printerIp: station.printerIp,
                printerPort: station.printerPort,
              }))
            );
          }
        }
      } catch (stationError) {
        console.warn('KDS stations could not be loaded:', stationError);
      }

      // Fetch existing active KDS orders from backend.
      try {
        const ordersRes = await kdsFetch(`${API_BASE_URL}/pos/kds/orders?hotelId=${hId}`);
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
    init();
  }, []);

  // Periodic poll to refresh KDS orders resiliently
  useEffect(() => {
    if (!hotelId) return;
    const interval = setInterval(async () => {
      try {
        const ordersRes = await kdsFetch(`${API_BASE_URL}/pos/kds/orders?hotelId=${hotelId}`);
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

      try {
        const buzzerRes = await kdsFetch(`${API_BASE_URL}/pos/kds/buzzers?hotelId=${hotelId}`);
        if (buzzerRes.ok) {
          const buzzBody = await buzzerRes.json();
          if (buzzBody.success && Array.isArray(buzzBody.data)) {
            setKitchenBuzzers(buzzBody.data);
          }
        }
      } catch (e) {}
    }, 4000);
    return () => clearInterval(interval);
  }, [hotelId]);

  const formatStationLabel = (value: string) =>
    String(value || 'Kitchen Pass')
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());

  useEffect(() => {
    if (!hotelId) return;

    socket.connect({
      serverUrl: SOCKET_URL,
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

    const unbindWaiterSnooze = socket.on('waiter:snooze', (data: any) => {
      console.log('🏃 [KDSApp] Waiter on the way (+60s extended):', data);
      setToast(`🏃 WAITER ON THE WAY: ${data.waiter || 'Captain'} is en-route for pickup (+60s extended)!`);
      setTimeout(() => setToast(null), 6000);
    });

    const unbindOrderDelivered = socket.on('order:delivered', (data: any) => {
      console.log('✅ [KDSApp] Order delivered to guest table:', data);
      setToast(`✅ SERVED: Waiter ${data.waiter || ''} delivered order to table!`);
      setTimeout(() => setToast(null), 5000);
    });

    const unbindKitchenBuzzer = socket.on('kitchen:buzzer', (buzz: any) => {
      console.log('🚨 [KDSApp] Waiter buzzer alert received:', buzz);
      playKitchenBuzzerSound();
      setKitchenBuzzers((prev) => [buzz, ...prev.filter((b) => b.id !== buzz.id)]);
      const locationStr = buzz.tableNumber ? `Table ${buzz.tableNumber}` : (buzz.station || 'Dining Floor');
      setToast(`🚨 WAITER CALL (${buzz.priority || 'URGENT'}): ${locationStr} - "${buzz.message}"`);
      setTimeout(() => setToast(null), 8000);
    });

    const unbindKitchenBuzzerAck = socket.on('kitchen:buzzer_ack', (ackData: any) => {
      console.log('✅ [KDSApp] Waiter buzzer acknowledged:', ackData);
      setKitchenBuzzers((prev) =>
        prev.map((b) => (b.id === ackData.id ? { ...b, status: 'ACKNOWLEDGED', acknowledgedBy: ackData.acknowledgedBy } : b))
      );
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
      unbindWaiterSnooze();
      unbindOrderDelivered();
      unbindKitchenBuzzer();
      unbindKitchenBuzzerAck();
    };
  }, [hotelId]);

  const handleAcknowledgeBuzzer = async (id: string) => {
    try {
      setKitchenBuzzers((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: 'ACKNOWLEDGED', acknowledgedBy: 'Head Chef (KDS Pass)' } : b))
      );
      await kdsFetch(`${API_BASE_URL}/pos/kds/buzzer/${id}/acknowledge`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId },
        body: JSON.stringify({ acknowledgedBy: 'Head Chef (KDS Pass)' }),
      }).catch((err) => console.warn('Buzzer ack PATCH error:', err));

      socket.emit('kitchen:buzzer_ack', {
        id,
        hotelId,
        acknowledgedBy: 'Head Chef (KDS Pass)',
      });
      setToast(`✓ Waiter call acknowledged and notified to floor!`);
      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      console.error('Failed to acknowledge buzzer:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {toast && (
        <div data-testid="kds-alert-toast" className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-bounce max-w-lg w-11/12">
          <div className="p-3.5 bg-gradient-to-r from-amber-600 to-orange-600 rounded-2xl shadow-2xl border border-amber-400 text-white font-extrabold text-sm flex items-center justify-between">
            <span>{toast}</span>
            <button onClick={() => setToast(null)} className="text-white/80 hover:text-white font-bold ml-2">✕</button>
          </div>
        </div>
      )}

      <KitchenKdsApp
        store={store}
        dishes86={dishes86}
        onToggleItem86={handleToggleItem86}
        onBatchToggle86={handleBatchToggle86}
        lowStockAlerts={lowStockAlerts}
        onDismissStockAlert={(id) => setLowStockAlerts((prev) => prev.filter((a) => a.id !== id))}
        kitchenBuzzers={kitchenBuzzers}
        onAcknowledgeBuzzer={handleAcknowledgeBuzzer}
        onStartPreparing={async (orderId) => {
          console.log(`🍳 [KDS] Cooking started: ${orderId}`);
          try {
            const currentOrder = store.getOrders().find((o) => o.id === orderId);
            store.markOrderPreparing(orderId);
            await kdsFetch(`${API_BASE_URL}/pos/kds/order/${orderId}/status`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId },
              body: JSON.stringify({ status: 'PREPARING' }),
            }).catch((err) => console.warn('HTTP status patch failed:', err));

            const isRoom = currentOrder?.roomNumber || currentOrder?.orderType === 'ROOM_SERVICE' || (typeof orderId === 'string' && orderId.includes('RM'));
            if (isRoom) {
              await kdsFetch(`${API_BASE_URL}/pms/frontdesk/inroom-order-status/${orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId },
                body: JSON.stringify({ status: 'PREPARING' }),
              }).catch(() => {});
            }

            socket.emit('kds:order_preparing', { orderId, hotelId });
          } catch (e: any) {
            console.warn(e.message);
          }
        }}
        onMarkReady={async (orderId, orderDetails) => {
          console.log(`🔔 [KDS] Order ready: ${orderId}`, orderDetails);
          try {
            const currentOrder = store.getOrders().find((o) => o.id === orderId);
            store.markOrderReady(orderId);
            await kdsFetch(`${API_BASE_URL}/pos/kds/order/${orderId}/status`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId },
              body: JSON.stringify({ status: 'READY' }),
            }).catch((err) => console.warn('HTTP status patch failed:', err));

            const isRoom = orderDetails?.destination?.startsWith('Room') || currentOrder?.roomNumber || currentOrder?.orderType === 'ROOM_SERVICE' || (typeof orderId === 'string' && orderId.includes('RM'));
            if (isRoom) {
              await kdsFetch(`${API_BASE_URL}/pms/frontdesk/inroom-order-status/${orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId },
                body: JSON.stringify({ status: 'READY' }),
              }).catch(() => {});
            }

            const rawDestination = orderDetails?.destination || currentOrder?.tableNumber || '';
            const roomNumber = orderDetails?.roomNumber || currentOrder?.roomNumber || (isRoom ? rawDestination.replace(/[^0-9]/g, '') : undefined);
            const tableNumber = isRoom ? undefined : (orderDetails?.tableNumber || rawDestination);
            const orderNumber = orderDetails?.orderNumber || currentOrder?.orderNumber || orderId;

            socket.emit('kds:order_ready', {
              orderId,
              orderNumber,
              hotelId,
              tableNumber,
              roomNumber,
              items: orderDetails?.items || currentOrder?.items,
            });
            setToast(`✅ Order ${orderNumber} for ${tableNumber || `Room ${roomNumber}`} marked READY!`);
            setTimeout(() => setToast(null), 5000);
          } catch (e: any) {
            console.warn(e.message);
          }
        }}
        onMarkServed={async (orderId, orderDetails) => {
          console.log(`🍽️ [KDS] Order served: ${orderId}`, orderDetails);
          try {
            const currentOrder = store.getOrders().find((o) => o.id === orderId);
            store.markOrderServed(orderId);
            await kdsFetch(`${API_BASE_URL}/pos/orders/${orderId}/serve`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId },
              body: JSON.stringify({ status: 'SERVED' }),
            }).catch(() => {});

            await kdsFetch(`${API_BASE_URL}/pos/kds/order/${orderId}/status`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId },
              body: JSON.stringify({ status: 'SERVED' }),
            }).catch(() => {});

            const isRoom = orderDetails?.destination?.startsWith('Room') || currentOrder?.roomNumber || currentOrder?.orderType === 'ROOM_SERVICE' || (typeof orderId === 'string' && orderId.includes('RM'));
            if (isRoom) {
              await kdsFetch(`${API_BASE_URL}/pms/frontdesk/inroom-order-status/${orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId },
                body: JSON.stringify({ status: 'SERVED' }),
              }).catch(() => {});
            }

            const rawDestination = orderDetails?.destination || currentOrder?.tableNumber || '';
            const roomNumber = orderDetails?.roomNumber || currentOrder?.roomNumber || (isRoom ? rawDestination.replace(/[^0-9]/g, '') : undefined);
            const tableNumber = isRoom ? undefined : (orderDetails?.tableNumber || rawDestination);
            const orderNumber = orderDetails?.orderNumber || currentOrder?.orderNumber || orderId;

            socket.emit('order:served', {
              orderId,
              orderNumber,
              hotelId,
              tableNumber,
              roomNumber,
            });

            setToast(`🍽️ Order ${orderNumber} marked SERVED!`);
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
      <ErrorBoundary>
        <StaffLoginGate
          apiBaseUrl={`${API_BASE_URL}`}
          appName="Kitchen KDS Display"
          appSubtitle="Protected kitchen terminal for live order tickets, stations and prep tracking."
          accent="amber"
          demoEmail="priya@tajgateway.com"
          demoPassword="SpiceHub@123"
        >
          <KitchenKdsAppRoot />
        </StaffLoginGate>
      </ErrorBoundary>
    </React.StrictMode>
  );
}
