import React from 'react';
import ReactDOM from 'react-dom/client';
import { CustomerMenuApp } from './CustomerMenuApp';
import { MenuCartStore } from '@spicehub/ui';
import { SpiceHubSocket, SpiceHubClient } from '@spicehub/api-client';

const store = MenuCartStore.getInstance();

// 1. Seed resilient offline-first initial menu items
const fallbackMenuItems = [
  {
    id: 'dish-1',
    hotelId: 'tenant-1',
    name: 'Paneer Tikka Angara',
    description: 'Charcoal grilled cottage cheese marinated in spiced yogurt and kasoori methi',
    price: 280,
    category: 'Starters',
    categoryId: 'Starters',
    foodType: 'VEG' as any,
    isAvailable: true,
    prepTimeMinutes: 12,
  },
  {
    id: 'dish-2',
    hotelId: 'tenant-1',
    name: 'Murgh Malai Tikka',
    description: 'Creamy chicken chunks spiced with cardamom and grilled to golden perfection',
    price: 340,
    category: 'Starters',
    categoryId: 'Starters',
    foodType: 'NON_VEG' as any,
    isAvailable: true,
    prepTimeMinutes: 14,
  },
  {
    id: 'dish-3',
    hotelId: 'tenant-1',
    name: 'Dal Makhani Bukhara',
    description: 'Slow-simmered black lentils overnight with fresh butter and dairy cream',
    price: 310,
    category: 'Main Course',
    categoryId: 'Main Course',
    foodType: 'VEG' as any,
    isAvailable: true,
    prepTimeMinutes: 8,
  },
  {
    id: 'dish-4',
    hotelId: 'tenant-1',
    name: 'Butter Chicken Aslam Style',
    description: 'Tender tandoori chicken cooked in rich velvety tomato makhani gravy',
    price: 420,
    category: 'Main Course',
    categoryId: 'Main Course',
    foodType: 'NON_VEG' as any,
    isAvailable: true,
    prepTimeMinutes: 12,
  },
  {
    id: 'dish-5',
    hotelId: 'tenant-1',
    name: 'Butter Garlic Naan',
    description: 'Clay-oven baked leavened bread brushed with garlic butter and fresh cilantro',
    price: 70,
    category: 'Breads',
    categoryId: 'Breads',
    foodType: 'VEG' as any,
    isAvailable: true,
    prepTimeMinutes: 6,
  },
  {
    id: 'dish-6',
    hotelId: 'tenant-1',
    name: 'Mint Lime Virgin Mojito',
    description: 'Fresh crushed mint leaves, lime chunks, simple syrup and chilled fizz',
    price: 180,
    category: 'Beverages',
    categoryId: 'Beverages',
    foodType: 'BEVERAGE' as any,
    isAvailable: true,
    prepTimeMinutes: 5,
  },
];

store.setMenuItems(fallbackMenuItems as any);

// 2. Initialize live SpiceHubClient for real HTTP API communication
const client = new SpiceHubClient({
  baseUrl: 'http://localhost:5000',
  hotelId: 'tenant-1',
});

// Asynchronously load real menu items from backend if available
async function syncLiveMenu() {
  try {
    const res = await client.pos.getMenu({ hotelId: 'tenant-1' });
    if (res && res.data && res.data.length > 0) {
      console.log(`✅ [CustomerTableApp] Synced ${res.data.length} live menu items from backend`);
      store.setMenuItems(res.data);
    }
  } catch (err) {
    console.warn('⚠️ [CustomerTableApp] Could not fetch live menu from backend, using resilient seed cache', err);
  }
}
syncLiveMenu();

// 3. Initialize realtime socket connection for customer table session
const socket = SpiceHubSocket.getInstance();
socket.connect({
  serverUrl: 'http://localhost:5000',
  hotelId: 'tenant-1',
  tableSessionId: 'table-session-4',
});

// Realtime Millisecond Item 86 Listener
socket.on('menu:item_86_toggled', (payload: any) => {
  console.log('⚡ [CustomerTableApp] Realtime 86 broadcast received:', payload);
  store.handleItem86Toggled(payload);
});
socket.on('menu:item:86', (payload: any) => {
  store.handleItem86Toggled(payload);
});

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <CustomerMenuApp
        store={store}
        tableNumber="4"
        section="Indoor AC Dining"
        onRequestService={async (type) => {
          console.log(`🛎️ [Customer] Requested service: ${type}`);
          try {
            await client.requests.create({
              hotelId: 'tenant-1',
              requestType: type as any,
              tableId: 'table-4',
              tableSessionId: 'table-session-4',
            });
          } catch (e) {
            console.warn('Service request via HTTP failed, falling back to socket only', e);
          }
          socket.emit('service:request', { type, table: 'Table 4', hotelId: 'tenant-1' });
        }}
        onPlaceOrder={async (idempotencyKey, instructions) => {
          console.log(`🍽️ [Customer] Order placed (${idempotencyKey}) with instructions: ${instructions}`);
          const cartItems = store.getCartItems();
          try {
            await client.pos.placeOrder({
              hotelId: 'tenant-1',
              tableId: 'table-4',
              sessionToken: 'sess_table_4_token',
              items: cartItems.map((ci) => ({ menuItemId: ci.menuItemId, quantity: ci.quantity })),
              idempotencyKey,
            });
          } catch (e) {
            console.warn('POS placeOrder via HTTP failed, notifying via socket', e);
          }
          socket.emit('order:placed', { table: 'Table 4', idempotencyKey, instructions });
        }}
      />
    </React.StrictMode>
  );
}
