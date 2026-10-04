import React from 'react';
import ReactDOM from 'react-dom/client';
import { GuestRoomPortalApp } from './GuestRoomPortalApp';
import { GuestPortalStore, LiveRoomOrder } from '@spicehub/ui';
import { SpiceHubSocket } from '@spicehub/api-client';

const store = GuestPortalStore.getInstance();
const socket = SpiceHubSocket.getInstance();

// 1. Resolve Target Room from URL parameters
const urlParams = new URLSearchParams(window.location.search);
const targetRoom = urlParams.get('room') || '102';

// 2. Default Seed Stay Details
store.setStayDetails({
  roomNumber: targetRoom,
  guestName: 'Vikramaditya & Ananya Singhania',
  checkInDate: new Date().toISOString(),
  checkOutDate: new Date(Date.now() + 86400000).toISOString(),
  wifiPassword: `TajGuest@${targetRoom}`,
  wifiSsid: 'TajGateway_HighSpeed',
  activeOrdersCount: 0,
  totalFolioAmount: 4368,
});

store.setFolioSummary({
  folioNumber: `FOLIO-${targetRoom}-${Date.now().toString().slice(-4)}`,
  totalRoomTariff: 3900,
  totalFoodAndBeverage: 0,
  totalTaxes: 468,
  advancePaid: 3000,
  paidAmount: 3000,
  netAmountPayable: 4368,
  dueAmount: 1368,
  folioStatus: 'OPEN',
  lineItems: [
    {
      id: 'li-base-room',
      department: 'ROOM_RENT',
      description: `Heritage Room ${targetRoom} Accommodation Tariff`,
      rate: 3900,
      taxAmount: 468,
      netAmount: 4368,
      createdAt: new Date().toISOString(),
    },
  ],
});

// 3. Connect to live PMS API to hydrate real-time stay & folio
async function hydrateLiveRoomStay() {
  try {
    const res = await fetch(`http://localhost:5000/api/v1/pms/frontdesk/room-stay-details/${targetRoom}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data?.stay) {
        const { room, stay, folio } = json.data;
        store.setStayDetails({
          roomNumber: room.roomNumber,
          guestName: stay.guestName,
          checkInDate: stay.checkInTimestamp,
          checkOutDate: stay.expectedCheckOutTimestamp,
          wifiPassword: stay.wifiPassword || `TajGuest@${room.roomNumber}`,
          wifiSsid: stay.wifiSsid || 'TajGateway_HighSpeed',
          activeOrdersCount: store.getActiveOrdersCount(),
          totalFolioAmount: folio?.netAmountPayable || 0,
        });

        if (folio) {
          store.setFolioSummary({
            folioNumber: folio.folioNumber,
            totalRoomTariff: folio.totalRoomTariff || 0,
            totalFoodAndBeverage: folio.totalFoodAndBeverage || 0,
            totalTaxes: folio.totalTaxes || 0,
            advancePaid: folio.advancePaid || 0,
            paidAmount: folio.paidAmount || 0,
            netAmountPayable: folio.netAmountPayable || 0,
            dueAmount: folio.dueAmount || 0,
            folioStatus: folio.folioStatus || 'OPEN',
            lineItems: (folio.lineItems || []).map((li: any) => ({
              id: li.id || li._id || `li-${Date.now()}`,
              department: li.department || 'INCIDENTAL',
              description: li.description || 'Charge',
              rate: li.rate || 0,
              taxAmount: li.taxAmount || 0,
              netAmount: li.netAmount || 0,
              createdAt: li.postedAt || li.createdAt || new Date().toISOString(),
            })),
          });
        }
      }
    }
  } catch (err) {
    console.warn(`[Guest Portal] Stay hydration note:`, err);
  }
}

// 4. Hydrate existing in-room orders
async function hydrateInRoomOrders() {
  try {
    const res = await fetch(`http://localhost:5000/api/v1/pms/frontdesk/inroom-orders/${targetRoom}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        const liveOrders: LiveRoomOrder[] = json.data.map((ord: any) => ({
          id: ord.id,
          orderNumber: ord.orderNumber,
          orderStatus: ord.orderStatus,
          placedAt: ord.placedAt,
          preparedAt: ord.preparedAt,
          readyAt: ord.readyAt,
          servedAt: ord.servedAt,
          cookingInstructions: ord.cookingInstructions,
          items: (ord.items || []).map((it: any) => ({
            menuItemId: it.menuItemId,
            name: it.name,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            subtotal: it.subtotal,
            specialInstructions: it.specialInstructions,
          })),
          grandTotal: ord.grandTotal,
        }));
        store.setLiveOrders(liveOrders);
        if (liveOrders.length > 0 && !store.getSelectedLiveOrder()) {
          store.openOrderTracker(liveOrders[0]);
        }
      }
    }
  } catch (err) {
    console.warn(`[Guest Portal] In-room orders hydration note:`, err);
  }
}

hydrateLiveRoomStay();
hydrateInRoomOrders();

// 5. Real-Time Socket Connection & Periodic Polling
try {
  socket.connect({
    serverUrl: 'http://localhost:5000',
    hotelId: 'global',
    station: `guest_room_${targetRoom}`,
  });

  socket.on('order:status_updated', (data: any) => {
    console.log('🔄 [GuestPortal] Order status updated via socket:', data);
    store.handleOrderStatusUpdated({
      orderId: data.orderId,
      orderStatus: data.orderStatus,
      readyAt: data.readyAt,
    });
  });

  socket.on('pms:folio_updated', (data: any) => {
    if (data.roomNumber === targetRoom) {
      hydrateLiveRoomStay();
    }
  });
} catch (e) {
  console.warn('Socket init note:', e);
}

// Resilient polling for order status updates
setInterval(async () => {
  try {
    const res = await fetch(`http://localhost:5000/api/v1/pms/frontdesk/inroom-orders/${targetRoom}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        json.data.forEach((ord: any) => {
          store.handleOrderStatusUpdated({
            orderId: ord.id,
            orderStatus: ord.orderStatus,
            readyAt: ord.readyAt,
          });
        });
      }
    }
  } catch (e) {}
}, 2500);

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <GuestRoomPortalApp
        store={store}
        onConciergeRequest={async (requestType, notes) => {
          try {
            await fetch('http://localhost:5000/api/v1/pms/frontdesk/concierge-request', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ roomNumber: targetRoom, requestType, notes }),
            });
          } catch (e) {
            console.warn('Concierge request error:', e);
          }
        }}
        onInRoomOrderPlaced={async (items) => {
          try {
            const res = await fetch('http://localhost:5000/api/v1/pms/frontdesk/inroom-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                roomNumber: targetRoom,
                items: items.map((it) => ({
                  dishId: it.dishId,
                  name: it.name,
                  quantity: it.quantity,
                  price: it.price,
                })),
                cookingInstructions: 'Freshly prepared for Guest In-Room Dining',
              }),
            });
            const json = await res.json();
            if (json.success && json.data) {
              const { order, folio } = json.data;
              if (order) {
                const liveOrd: LiveRoomOrder = {
                  id: order.id,
                  orderNumber: order.orderNumber,
                  orderStatus: order.orderStatus,
                  placedAt: order.placedAt,
                  cookingInstructions: order.cookingInstructions,
                  items: (order.items || []).map((it: any) => ({
                    menuItemId: it.menuItemId,
                    name: it.name,
                    quantity: it.quantity,
                    unitPrice: it.unitPrice,
                    subtotal: it.subtotal,
                    specialInstructions: it.specialInstructions,
                  })),
                  grandTotal: order.grandTotal,
                };
                store.addLiveOrder(liveOrd);
                store.openOrderTracker(liveOrd);
                store.setActiveTab('ORDERS');
              }

              if (folio) {
                store.setFolioSummary({
                  folioNumber: folio.folioNumber,
                  totalRoomTariff: folio.totalRoomTariff || 0,
                  totalFoodAndBeverage: folio.totalFoodAndBeverage || 0,
                  totalTaxes: folio.totalTaxes || 0,
                  advancePaid: folio.advancePaid || 0,
                  paidAmount: folio.paidAmount || 0,
                  netAmountPayable: folio.netAmountPayable || 0,
                  dueAmount: folio.dueAmount || 0,
                  folioStatus: folio.folioStatus || 'OPEN',
                  lineItems: (folio.lineItems || []).map((li: any) => ({
                    id: li.id || li._id || `li-${Date.now()}`,
                    department: li.department || 'INCIDENTAL',
                    description: li.description || 'Charge',
                    rate: li.rate || 0,
                    taxAmount: li.taxAmount || 0,
                    netAmount: li.netAmount || 0,
                    createdAt: li.postedAt || li.createdAt || new Date().toISOString(),
                  })),
                });

                const cur = store.getSession();
                if (cur) {
                  store.setStayDetails({
                    ...cur,
                    totalFolioAmount: folio.netAmountPayable,
                    activeOrdersCount: store.getActiveOrdersCount(),
                  });
                }
              }
            }
          } catch (e) {
            console.warn('In-room order placement error:', e);
          }
        }}
        onRefreshOrders={hydrateInRoomOrders}
        onRefreshFolio={hydrateLiveRoomStay}
        onExpressCheckout={async (notes) => {
          console.log(`💳 [Guest Room ${targetRoom}] Express checkout requested`, notes);
        }}
      />
    </React.StrictMode>
  );
}
