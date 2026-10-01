import React from 'react';
import ReactDOM from 'react-dom/client';
import { KitchenKdsApp } from './KitchenKdsApp';
import { KdsStore } from '@spicehub/ui';
import { SpiceHubSocket } from '@spicehub/api-client';

const store = KdsStore.getInstance();

// Seed initial stations and orders
store.setStations([
  { id: 'st-tandoor', stationName: 'Tandoor & Starters', isOnline: true },
  { id: 'st-curry', stationName: 'Main Curry Station', isOnline: true },
  { id: 'st-bar', stationName: 'Bar & Beverages', isOnline: true },
]);

store.setOrders([
  {
    id: 'ord-101',
    orderNumber: 'KOT #101',
    orderType: 'DINE_IN',
    tableNumber: 'Table 4',
    orderStatus: 'PREPARING',
    placedAt: new Date().toISOString(),
    elapsedMinutes: 4,
    urgencyLevel: 'NORMAL',
    items: [
      {
        itemId: 'item-1',
        menuItemId: 'mi-1',
        name: 'Paneer Tikka Angara',
        quantity: 2,
        unitPrice: 320,
        subtotal: 640,
        kitchenStationId: 'st-tandoor',
        itemStatus: 'PREPARING',
      },
      {
        itemId: 'item-2',
        menuItemId: 'mi-2',
        name: 'Butter Garlic Naan',
        quantity: 4,
        unitPrice: 60,
        subtotal: 240,
        kitchenStationId: 'st-tandoor',
        itemStatus: 'PREPARING',
      },
    ],
  },
  {
    id: 'ord-102',
    orderNumber: 'KOT #102',
    orderType: 'DINE_IN',
    tableNumber: 'Table 2',
    orderStatus: 'PLACED',
    placedAt: new Date().toISOString(),
    elapsedMinutes: 1,
    urgencyLevel: 'NORMAL',
    items: [
      {
        itemId: 'item-3',
        menuItemId: 'mi-3',
        name: 'Dal Makhani Bukhara',
        quantity: 1,
        unitPrice: 340,
        subtotal: 340,
        kitchenStationId: 'st-curry',
        itemStatus: 'PENDING',
      },
      {
        itemId: 'item-4',
        menuItemId: 'mi-4',
        name: 'Butter Chicken Aslam Style',
        quantity: 1,
        unitPrice: 420,
        subtotal: 420,
        kitchenStationId: 'st-curry',
        itemStatus: 'PENDING',
      },
    ],
  },
]);

const socket = SpiceHubSocket.getInstance();
socket.connect({
  serverUrl: 'http://localhost:5000',
  hotelId: 'tenant-1',
  station: 'KITCHEN_ALL',
});

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <KitchenKdsApp
        store={store}
        onStartPreparing={(orderId) => {
          console.log(`🍳 [KDS] Cooking started: ${orderId}`);
        }}
        onMarkReady={(orderId) => {
          console.log(`🔔 [KDS] Order ready: ${orderId}`);
          socket.emit('kds:order_ready', { orderId, hotelId: 'tenant-1' });
        }}
      />
    </React.StrictMode>
  );
}
