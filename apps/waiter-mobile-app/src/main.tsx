import React from 'react';
import ReactDOM from 'react-dom/client';
import { WaiterMobileApp } from './WaiterMobileApp';
import { WaiterStore } from '@spicehub/ui';
import { SpiceHubSocket } from '@spicehub/api-client';

const store = WaiterStore.getInstance();

// Set simulated waiter profile
store.setProfile({
  userId: 'waiter-ramesh-1',
  name: 'Ramesh Kumar (Captain)',
  hotelId: 'tenant-1',
  shiftStatus: 'ON_DUTY' as any,
});

// Seed sample service calls
store.setRequests([
  {
    id: 'req-1',
    tableNumber: 'Table 4',
    type: 'WATER' as any,
    status: 'ASSIGNED' as any,
    createdAt: new Date().toISOString(),
    slaMinutes: 1,
    priority: 'HIGH' as any,
  },
  {
    id: 'req-2',
    tableNumber: 'Table 2',
    type: 'CALL_WAITER' as any,
    status: 'ASSIGNED' as any,
    createdAt: new Date(Date.now() - 30000).toISOString(),
    slaMinutes: 1,
    priority: 'HIGH' as any,
  },
]);

// Connect socket
const socket = SpiceHubSocket.getInstance();
socket.connect({
  serverUrl: 'http://localhost:5000',
  hotelId: 'tenant-1',
  userId: 'waiter-ramesh-1',
});

// Listen to live service requests from customer app
socket.on('service:request', (data: any) => {
  console.log(`🛎️ [Waiter] Incoming service request via socket:`, data);
  store.addRequest({
    id: `req-${Date.now()}`,
    tableNumber: data.table || 'Table 4',
    type: data.type || 'CALL_WAITER',
    status: 'ASSIGNED' as any,
    createdAt: new Date().toISOString(),
    slaMinutes: 1,
    priority: 'HIGH' as any,
  });
});

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <WaiterMobileApp
        store={store}
        onAcceptRequest={async (reqId) => {
          console.log(`✅ [Waiter] Accepted request: ${reqId}`);
          socket.emit('request:accepted', { reqId, waiter: 'Ramesh Kumar', hotelId: 'tenant-1' });
        }}
        onCompleteRequest={async (reqId) => {
          console.log(`🎉 [Waiter] Completed request: ${reqId}`);
          socket.emit('request:completed', { reqId, hotelId: 'tenant-1' });
        }}
        onFireKot={async (tableId, items, instructions) => {
          console.log(`🔥 [Waiter] Firing KOT for table ${tableId}:`, items);
          try {
            await fetch('http://localhost:5000/api/v1/pos/orders/place', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-hotel-id': 'tenant-1',
              },
              body: JSON.stringify({
                hotelId: 'tenant-1',
                tableId,
                items: items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity, specialInstructions: i.specialInstructions })),
                instructions,
                idempotencyKey: `kot-${Date.now()}-${Math.random().toString(36).substring(7)}`,
              }),
            });
            socket.emit('waiter:kot_fired', { tableId, items, instructions, hotelId: 'tenant-1' });
          } catch (err) {
            console.error('Failed to fire KOT:', err);
            socket.emit('waiter:kot_fired', { tableId, items, instructions, hotelId: 'tenant-1' });
          }
        }}
        onRequestCashDrop={async (actualCash, reason) => {
          console.log(`💵 [Waiter] Cash drop requested: ₹${actualCash} (${reason})`);
          socket.emit('waiter:cash_drop_requested', {
            waiterUserId: 'waiter-ramesh-1',
            waiterName: 'Ramesh Kumar',
            actualCash,
            reason,
            hotelId: 'tenant-1',
          });
        }}
        onGenerateUpiQr={async (tableNumber, amount) => {
          console.log(`📱 [Waiter] Generating Dynamic UPI QR for ${tableNumber}: ₹${amount}`);
          socket.emit('waiter:generate_upi_qr', {
            tableNumber,
            amount,
            waiterUserId: 'waiter-ramesh-1',
            hotelId: 'tenant-1',
          });
        }}
      />
    </React.StrictMode>
  );
}
