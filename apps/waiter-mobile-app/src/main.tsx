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
          socket.emit('request:accepted', { reqId, waiter: 'Ramesh Kumar' });
        }}
        onCompleteRequest={async (reqId) => {
          console.log(`🎉 [Waiter] Completed request: ${reqId}`);
          socket.emit('request:completed', { reqId });
        }}
      />
    </React.StrictMode>
  );
}
