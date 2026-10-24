import { io as ioClient, Socket } from 'socket.io-client';

const BACKEND_URL = 'http://localhost:5000';

async function verifyShift75() {
  console.log('🧪 ========================================================');
  console.log('🧪 [VERIFICATION] SHIFT 75: Kitchen KDS State Machine & Live Relay');
  console.log('🧪 ========================================================');

  // 1. Get demo context
  const contextRes = await fetch(`${BACKEND_URL}/api/v1/pos/demo-context`);
  const contextBody: any = await contextRes.json();
  const hotelId = contextBody.data.hotel.id;
  const table = contextBody.data.tables[0];
  console.log(`✅ Demo context loaded: Hotel ${contextBody.data.hotel.name} (${hotelId}), Table ${table.tableNumber}`);

  // 2. Connect KDS socket and Waiter socket
  const kdsSocket: Socket = ioClient(BACKEND_URL, {
    transports: ['websocket'],
    reconnection: false,
  });

  const waiterSocket: Socket = ioClient(BACKEND_URL, {
    transports: ['websocket'],
    reconnection: false,
  });

  await Promise.all([
    new Promise<void>((resolve) => {
      kdsSocket.on('connect', () => {
        kdsSocket.emit('join_tenant_room', { hotelId, station: 'kds' });
        console.log('🔌 KDS Socket connected and joined hotel room');
        resolve();
      });
    }),
    new Promise<void>((resolve) => {
      waiterSocket.on('connect', () => {
        waiterSocket.emit('join_tenant_room', { hotelId, station: 'waiter' });
        console.log('🔌 Waiter Socket connected and joined hotel room');
        resolve();
      });
    }),
  ]);

  // Set up event tracking
  let orderCreatedReceived = false;
  let orderPreparingReceived = false;
  let orderReadyReceived = false;
  let orderServedReceived = false;

  kdsSocket.on('order:created', (data: any) => {
    console.log(`🔔 [KDS Socket] Received order:created event! Order: ${data.orderNumber || data.id}`);
    orderCreatedReceived = true;
  });

  kdsSocket.on('new_order', (data: any) => {
    console.log(`🔔 [KDS Socket] Received new_order alias event! Order: ${data.orderNumber || data.id}`);
  });

  waiterSocket.on('order:status_updated', (data: any) => {
    console.log(`📡 [Waiter Socket] Order status updated: ${data.orderStatus}`);
    if (data.orderStatus === 'PREPARING') orderPreparingReceived = true;
  });

  waiterSocket.on('order:ready', (data: any) => {
    console.log(`🔔 [Waiter Socket] ORDER READY BUZZER TRIGGERED! Order: ${data.orderNumber || data.orderId}`);
    orderReadyReceived = true;
  });

  waiterSocket.on('order:served', (data: any) => {
    console.log(`🍽️ [Waiter Socket] ORDER SERVED EVENT RECEIVED! Order: ${data.orderNumber || data.orderId}`);
    orderServedReceived = true;
  });

  // 3. Place order via API
  console.log('📦 Placing live order via POST /api/v1/pos/orders/place...');
  const orderRes = await fetch(`${BACKEND_URL}/api/v1/pos/orders/place`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hotelId,
      tableSessionId: table.activeSessionId,
      tableId: table.id,
      items: [
        { name: 'Kadhai Paneer', quantity: 2, price: 320 },
        { name: 'Garlic Naan', quantity: 3, price: 75 },
      ],
      cookingInstructions: 'Chef special: extra garlic, medium spice',
      idempotencyKey: `shift75_test_${Date.now()}`,
    }),
  });

  const orderData: any = await orderRes.json();
  if (!orderData.success) {
    throw new Error(`Order placement failed: ${JSON.stringify(orderData)}`);
  }
  const order = orderData.data || orderData.order;
  console.log(`✅ Order Placed: #${order.orderNumber} (ID: ${order._id})`);

  // Wait 600ms for socket relay
  await new Promise((r) => setTimeout(r, 600));

  if (!orderCreatedReceived) {
    throw new Error('❌ KDS socket did not receive order:created event!');
  }
  console.log('✅ KDS received order:created event instantaneously!');

  // 4. Update status to PREPARING
  console.log(`🍳 Chef accepts ticket -> PATCH /api/v1/pos/orders/${order.orderNumber}/status to PREPARING...`);
  const prepRes = await fetch(`${BACKEND_URL}/api/v1/pos/orders/${order.orderNumber}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId },
    body: JSON.stringify({ status: 'PREPARING' }),
  });
  const prepData: any = await prepRes.json();
  if (!prepData.success) {
    throw new Error(`Prep status patch failed: ${JSON.stringify(prepData)}`);
  }
  console.log(`✅ Order ${order.orderNumber} transitioned to PREPARING in DB`);

  await new Promise((r) => setTimeout(r, 600));
  if (!orderPreparingReceived) {
    throw new Error('❌ Waiter socket did not receive PREPARING update!');
  }
  console.log('✅ Status update to PREPARING verified on Waiter terminal socket!');

  // 5. Update status to READY
  console.log(`🔔 Chef marks food ready -> PATCH /api/v1/pos/orders/${order.orderNumber}/status to READY...`);
  const readyRes = await fetch(`${BACKEND_URL}/api/v1/pos/orders/${order.orderNumber}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId },
    body: JSON.stringify({ status: 'READY' }),
  });
  const readyData: any = await readyRes.json();
  if (!readyData.success) {
    throw new Error(`Ready status patch failed: ${JSON.stringify(readyData)}`);
  }
  console.log(`✅ Order ${order.orderNumber} transitioned to READY in DB`);

  await new Promise((r) => setTimeout(r, 600));
  if (!orderReadyReceived) {
    throw new Error('❌ Waiter socket did not receive order:ready buzzer event!');
  }
  console.log('✅ Waiter terminal received order:ready buzzer event!');

  // 6. Mark SERVED via /serve endpoint
  console.log(`🍽️ Waiter marks food served -> PATCH /api/v1/pos/orders/${order.orderNumber}/serve...`);
  const serveRes = await fetch(`${BACKEND_URL}/api/v1/pos/orders/${order.orderNumber}/serve`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId },
    body: JSON.stringify({ status: 'SERVED' }),
  });
  const serveData: any = await serveRes.json();
  if (!serveData.success) {
    throw new Error(`Serve status patch failed: ${JSON.stringify(serveData)}`);
  }
  console.log(`✅ Order ${order.orderNumber} transitioned to SERVED in DB`);

  await new Promise((r) => setTimeout(r, 600));
  if (!orderServedReceived) {
    throw new Error('❌ Waiter socket did not receive order:served event!');
  }
  console.log('✅ Waiter socket confirmed order:served event!');

  // Clean up
  kdsSocket.disconnect();
  waiterSocket.disconnect();

  console.log('\n🎉 ========================================================');
  console.log('🎉 [SUCCESS] SHIFT 75 100% VERIFIED: KDS STATE MACHINE & LIVE RELAYS FULLY WORKING!');
  console.log('🎉 ========================================================\n');
}

verifyShift75().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
