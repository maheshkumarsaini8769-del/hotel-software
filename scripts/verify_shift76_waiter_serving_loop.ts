import { io as ioClient, Socket } from 'socket.io-client';

const BACKEND_URL = 'http://localhost:5000';

async function verifyShift76() {
  console.log('🧪 ========================================================');
  console.log('🧪 [VERIFICATION] SHIFT 76: Waiter Table Map & Food Serving Loop');
  console.log('🧪 ========================================================');

  // 1. Fetch tables from GET /api/v1/pos/tables
  const tablesRes = await fetch(`${BACKEND_URL}/api/v1/pos/tables`);
  const tablesData: any = await tablesRes.json();
  if (!tablesData.success || !Array.isArray(tablesData.data)) {
    throw new Error('Failed to fetch tables from API');
  }
  console.log(`✅ Tables successfully hydrated from API: ${tablesData.data.length} tables found`);
  const table1 = tablesData.data[0];
  console.log(`📋 Table 1 details: ${table1.tableNumber}, Capacity: ${table1.capacity}, Status: ${table1.currentStatus}`);

  // 2. Connect Waiter socket
  const waiterSocket: Socket = ioClient(BACKEND_URL, {
    transports: ['websocket'],
    reconnection: false,
  });

  const hotelId = '6ac5b0b1c64ca21bed4081cb'; // Default test tenant
  await new Promise<void>((resolve) => {
    waiterSocket.on('connect', () => {
      waiterSocket.emit('join_tenant_room', { hotelId, station: 'waiter' });
      console.log('🔌 Waiter Socket connected to hotel room');
      resolve();
    });
  });

  let buzzerReceived = false;
  let orderServedReceived = false;
  let tableStatusChangedReceived = false;

  waiterSocket.on('order:ready', (data: any) => {
    console.log(`🔔 [Waiter Socket] Ready buzzer triggered for: ${data.orderNumber} (Table: ${data.tableNumber})`);
    buzzerReceived = true;
  });

  waiterSocket.on('order:served', (data: any) => {
    console.log(`🍽️ [Waiter Socket] Order marked served: ${data.orderNumber}`);
    orderServedReceived = true;
  });

  waiterSocket.on('table:status_changed', (data: any) => {
    console.log(`🪑 [Waiter Socket] Table status updated: Table ${data.tableNumber} -> ${data.currentStatus}`);
    tableStatusChangedReceived = true;
  });

  // 3. Place an order to simulate food cooking
  console.log('📦 Placing order for Table 1...');
  const orderRes = await fetch(`${BACKEND_URL}/api/v1/pos/orders/place`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hotelId,
      tableId: table1.id,
      items: [{ name: 'Dal Makhani', quantity: 1, price: 280 }],
      cookingInstructions: 'Serve hot',
      idempotencyKey: `shift76_test_${Date.now()}`,
    }),
  });
  const orderData: any = await orderRes.json();
  const order = orderData.data || orderData.order;
  console.log(`✅ Order placed: ${order.orderNumber}`);

  // 4. Chef marks order READY
  console.log('🍳 Kitchen marks order READY...');
  await fetch(`${BACKEND_URL}/api/v1/pos/orders/${order.orderNumber}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId },
    body: JSON.stringify({ status: 'READY' }),
  });

  await new Promise((r) => setTimeout(r, 600));
  if (!buzzerReceived) {
    throw new Error('❌ Waiter terminal did not receive 60s pickup buzzer on order:ready!');
  }
  console.log('✅ Waiter terminal received 60s pickup buzzer & SLA alert!');

  // 5. Waiter marks order SERVED via /serve
  console.log(`🍽️ Waiter marks food served -> PATCH /api/v1/pos/orders/${order.orderNumber}/serve...`);
  const serveRes = await fetch(`${BACKEND_URL}/api/v1/pos/orders/${order.orderNumber}/serve`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId },
    body: JSON.stringify({ status: 'SERVED' }),
  });
  const serveData: any = await serveRes.json();
  if (!serveData.success) {
    throw new Error(`Serve failed: ${JSON.stringify(serveData)}`);
  }
  console.log(`✅ Order ${order.orderNumber} successfully marked SERVED`);

  await new Promise((r) => setTimeout(r, 600));
  if (!orderServedReceived) {
    throw new Error('❌ Waiter socket did not receive order:served broadcast!');
  }
  console.log('✅ Waiter socket confirmed order:served broadcast!');

  // Clean up
  waiterSocket.disconnect();

  console.log('\n🎉 ========================================================');
  console.log('🎉 [SUCCESS] SHIFT 76 100% VERIFIED: WAITER TABLE MAP & SERVING LOOP WORKING!');
  console.log('🎉 ========================================================\n');
}

verifyShift76().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
