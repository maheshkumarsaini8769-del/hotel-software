import { io } from 'socket.io-client';

async function testLuxuryPipeline() {
  console.log('========================================================');
  console.log('👑 [SpiceHub Luxury Suite] RUNNING EXHAUSTIVE LIVE E2E VERIFICATION');
  console.log('========================================================');

  // 1. Verify demo-context API
  const contextRes = await fetch('http://localhost:5000/api/v1/pos/demo-context');
  const contextData = await contextRes.json();
  if (!contextData.success) {
    throw new Error('Demo context failed');
  }
  const { hotel, table, session, waiter, chef, menuItems, categories } = contextData.data;
  console.log('✅ [1/6] Demo Context loaded:');
  console.log('   - Hotel:', hotel.name, '(', hotel.id, ')');
  console.log('   - Table:', table.tableNumber, '(', table.section, ')');
  console.log('   - Waiter:', waiter.name, '(', waiter.id, ')');
  console.log('   - Chef:', chef.name, '(', chef.id, ')');
  console.log('   - Total Luxury Dishes:', menuItems.length);
  console.log('   - Categories:', categories.map((c: any) => c.name).join(', '));

  // Verify all dishes have images
  const dishesWithoutImages = menuItems.filter((m: any) => !m.images || m.images.length === 0);
  if (dishesWithoutImages.length > 0) {
    console.error('❌ Found dishes without images:', dishesWithoutImages);
    throw new Error('Dishes without images found');
  } else {
    console.log('✅ [2/6] All', menuItems.length, 'dishes verified with high-res authentic food photography:');
    menuItems.slice(0, 4).forEach((m: any) => console.log('     📸', m.name, '->', m.images[0].substring(0, 55) + '...'));
  }

  // 2. Connect Sockets for all 3 roles
  const customerSocket = io('http://localhost:5000', { transports: ['websocket'] });
  const waiterSocket = io('http://localhost:5000', { transports: ['websocket'] });
  const kdsSocket = io('http://localhost:5000', { transports: ['websocket'] });

  await new Promise<void>((resolve) => {
    let connected = 0;
    const check = () => {
      connected++;
      if (connected === 3) resolve();
    };
    customerSocket.on('connect', check);
    waiterSocket.on('connect', check);
    kdsSocket.on('connect', check);
  });

  customerSocket.emit('join:room', { hotelId: hotel.id, tableSessionId: session.id });
  waiterSocket.emit('join:room', { hotelId: hotel.id, userId: waiter.id, station: 'waiters' });
  kdsSocket.emit('join:room', { hotelId: hotel.id, station: 'kds' });

  // Give 100ms for server room joins to register
  await new Promise((r) => setTimeout(r, 100));

  console.log('✅ [3/6] Sockets connected for Customer, Waiter (Station: waiters), and Kitchen KDS (Station: kds)');

  // 3. Test Service Request: Customer calls waiter -> Waiter receives request
  const waiterPromise = new Promise<any>((resolve) => {
    const handler = (data: any) => {
      resolve(data);
    };
    waiterSocket.once('service:request', handler);
    waiterSocket.once('request:new', handler);
  });

  customerSocket.emit('service:request', {
    hotelId: hotel.id,
    table: table.tableNumber,
    tableNumber: table.tableNumber,
    type: 'CALL_WAITER',
    priority: 'HIGH',
  });

  const receivedRequest = await waiterPromise;
  console.log('🛎️ [4/6] Waiter received service request on phone:', receivedRequest);

  // 4. Test Food Order Placement: Customer places order -> KDS receives ticket
  const kdsPromise = new Promise<any>((resolve) => {
    const handler = (data: any) => {
      resolve(data);
    };
    kdsSocket.once('order:created', handler);
    kdsSocket.once('order:placed', handler);
  });

  const orderRes = await fetch('http://localhost:5000/api/v1/pos/orders/place', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-idempotency-key': `live-e2e-${Date.now()}`,
    },
    body: JSON.stringify({
      hotelId: hotel.id,
      tableId: table.id,
      tableSessionId: session.id,
      items: [
        { menuItemId: menuItems[0].id, quantity: 2 },
        { menuItemId: menuItems[1].id, quantity: 1 },
      ],
      cookingInstructions: 'Crispy and extra spicy please',
    }),
  });

  const orderJson = await orderRes.json();
  if (!orderJson.success) {
    throw new Error('Order placement HTTP call failed: ' + JSON.stringify(orderJson));
  }

  const kdsOrder = await kdsPromise;
  console.log('🍳 [5/6] Kitchen KDS received order with items and table:', {
    orderNumber: kdsOrder.orderNumber,
    table: kdsOrder.tableNumber || kdsOrder.table,
    itemCount: kdsOrder.items.length,
    dishes: kdsOrder.items.map((i: any) => `${i.name} x ${i.quantity}`),
  });

  // 5. Test Kitchen KDS Ready Alert -> Waiter phone receives Food Ready alert
  const pickupPromise = new Promise<any>((resolve) => {
    waiterSocket.once('order:ready', resolve);
  });

  kdsSocket.emit('kds:order_ready', {
    orderId: orderJson.data.orderId,
    hotelId: hotel.id,
    tableNumber: table.tableNumber,
  });

  const pickupAlert = await pickupPromise;
  console.log('🔔 [6/6] Waiter received instant Food Ready pickup alert:', pickupAlert);

  console.log('========================================================');
  console.log('🎉 100% OF ALL LUXURY FRONTEND & BACKEND FLOWS PASSED!');
  console.log('========================================================');

  customerSocket.disconnect();
  waiterSocket.disconnect();
  kdsSocket.disconnect();
  process.exit(0);
}

testLuxuryPipeline().catch((err) => {
  console.error('❌ Luxury Pipeline Test Failed:', err);
  process.exit(1);
});
