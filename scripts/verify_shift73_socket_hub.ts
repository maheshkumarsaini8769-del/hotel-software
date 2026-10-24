import { io, Socket } from 'socket.io-client';

async function testShift73SocketHub() {
  console.log('🧪 [Shift 73] Testing Central Socket.IO Hub & Cross-App Event Bus...');
  const serverUrl = 'http://localhost:5000';
  const hotelId = '6ac0b4e71840625417d4c7a1';

  const kdsClient: Socket = io(serverUrl, { transports: ['websocket'] });
  const waiterClient: Socket = io(serverUrl, { transports: ['websocket'] });
  const guestClient: Socket = io(serverUrl, { transports: ['websocket'] });
  const cashierClient: Socket = io(serverUrl, { transports: ['websocket'] });

  await new Promise<void>((resolve) => {
    let connected = 0;
    const check = () => {
      connected++;
      if (connected === 4) resolve();
    };
    kdsClient.on('connect', check);
    waiterClient.on('connect', check);
    guestClient.on('connect', check);
    cashierClient.on('connect', check);
  });

  console.log('✅ All 4 simulated station sockets connected to :5000');

  // Join rooms
  kdsClient.emit('join_tenant_room', { hotelId, station: 'kds' });
  waiterClient.emit('join_tenant_room', { hotelId, station: 'waiters' });
  guestClient.emit('join_tenant_room', { hotelId, station: 'guest_room_305' });
  cashierClient.emit('join_tenant_room', { hotelId, station: 'cashier' });

  await new Promise((r) => setTimeout(r, 600));

  let kdsReceivedOrder = false;
  let waiterReceivedOrder = false;
  let guestReceivedPreparing = false;
  let waiterReceivedReady = false;

  kdsClient.on('order:created', (data) => {
    console.log('   🍳 KDS received order:created:', data.orderNumber);
    kdsReceivedOrder = true;
  });

  waiterClient.on('order:created', (data) => {
    console.log('   🧑‍💼 Waiter received order:created:', data.orderNumber);
    waiterReceivedOrder = true;
  });

  guestClient.on('order:status_updated', (data) => {
    console.log('   🏨 Room 305 received status update:', data.orderStatus);
    if (data.orderStatus === 'PREPARING') guestReceivedPreparing = true;
  });

  waiterClient.on('order:ready', (data) => {
    console.log('   🔔 Waiter received order:ready alert for table/room:', data.tableNumber);
    waiterReceivedReady = true;
  });

  // 1. Emit Customer Order Placed
  cashierClient.emit('order:placed', {
    hotelId,
    orderId: 'test-ord-73',
    orderNumber: 'KOT #7301',
    tableNumber: 'Table 5',
    roomNumber: '305',
    items: [{ name: 'Paneer Butter Masala', quantity: 1, price: 280 }],
  });

  await new Promise((r) => setTimeout(r, 600));

  // 2. Emit KDS Preparing
  kdsClient.emit('kds:order_preparing', {
    hotelId,
    orderId: 'test-ord-73',
    roomNumber: '305',
    tableNumber: 'Table 5',
  });

  await new Promise((r) => setTimeout(r, 600));

  // 3. Emit KDS Ready
  kdsClient.emit('kds:order_ready', {
    hotelId,
    orderId: 'test-ord-73',
    roomNumber: '305',
    tableNumber: 'Table 5',
  });

  await new Promise((r) => setTimeout(r, 600));

  // Disconnect
  kdsClient.disconnect();
  waiterClient.disconnect();
  guestClient.disconnect();
  cashierClient.disconnect();

  if (kdsReceivedOrder && waiterReceivedOrder && guestReceivedPreparing && waiterReceivedReady) {
    console.log('🎉 [Shift 73 VERIFIED] Socket.IO Multi-Station Event Hub 100% OPERATIONAL!');
    process.exit(0);
  } else {
    console.error('❌ [Shift 73 FAILURE] Some events were not received:', {
      kdsReceivedOrder,
      waiterReceivedOrder,
      guestReceivedPreparing,
      waiterReceivedReady,
    });
    process.exit(1);
  }
}

testShift73SocketHub().catch((err) => {
  console.error('Error in Shift 73 verification:', err);
  process.exit(1);
});
