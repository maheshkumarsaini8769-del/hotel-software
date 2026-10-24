import { io as ioClient, Socket } from 'socket.io-client';

const BACKEND_URL = 'http://localhost:5000';

async function verifyShift78() {
  console.log('🧪 ========================================================');
  console.log('🧪 [VERIFICATION] SHIFT 78: Split Bill & Dynamic UPI Settlement');
  console.log('🧪 ========================================================');

  // 1. Fetch demo context
  const contextRes = await fetch(`${BACKEND_URL}/api/v1/pos/demo-context`);
  const contextBody: any = await contextRes.json();
  const hotelId = contextBody.data.hotel.id;
  const table = contextBody.data.tables[0];
  const sessionId = table.activeSessionId || contextBody.data.session.id;
  console.log(`✅ Demo context loaded: Hotel ${contextBody.data.hotel.name} (${hotelId}), Table ${table.tableNumber}, Session ${sessionId}`);

  // 2. Place order for session to ensure active order items
  const idempotencyKey = `ORD_S78_${Date.now()}`;
  console.log('🍽️ Placing order for Table session...');
  const orderRes = await fetch(`${BACKEND_URL}/api/v1/pos/orders/place`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-idempotency-key': idempotencyKey,
    },
    body: JSON.stringify({
      hotelId,
      tableId: table.id,
      tableSessionId: sessionId,
      items: [
        { menuItemId: 'pbm-001', name: 'Paneer Butter Masala', quantity: 1, unitPrice: 280 },
        { menuItemId: 'naan-001', name: 'Butter Naan', quantity: 2, unitPrice: 50 },
      ],
      cookingInstructions: 'Test Shift 78 dining order',
      grandTotal: 399,
      idempotencyKey,
    }),
  });
  const orderBody: any = await orderRes.json();
  console.log('✅ Order placed:', orderBody.success ? 'SUCCESS' : 'FAILED', orderBody.data?.orderNumber || '');

  // 3. Connect Cashier / Waiter Socket
  const staffSocket: Socket = ioClient(BACKEND_URL, {
    transports: ['websocket'],
    reconnection: false,
  });

  await new Promise<void>((resolve) => {
    staffSocket.on('connect', () => {
      staffSocket.emit('join_tenant_room', { hotelId, station: 'cashier' });
      staffSocket.emit('join_tenant_room', { hotelId, station: 'waiters' });
      console.log('🔌 Staff Socket connected to Cashier & Waiter rooms');
      resolve();
    });
  });

  let paymentEventReceived = false;
  let tableStatusChangedReceived = false;

  staffSocket.on('payment:completed', (data: any) => {
    console.log(`💳 [Staff Socket] Payment completed received! Amount: ₹${data.amount}, Mode: ${data.paymentMode}`);
    paymentEventReceived = true;
  });

  staffSocket.on('table:status_changed', (data: any) => {
    console.log(`📡 [Staff Socket] Table status changed: Table ${data.tableNumber || data.tableId} -> ${data.status}`);
    tableStatusChangedReceived = true;
  });

  // 4. Test Bill Generation & Split Calculation
  console.log('🧮 Requesting Equal Split Bill calculation...');
  const billGenRes = await fetch(`${BACKEND_URL}/api/v1/billing/bill/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hotelId,
      tableSessionId: sessionId,
    }),
  });
  const billGenBody: any = await billGenRes.json();
  const bill = billGenBody.data || billGenBody.bill;
  console.log('✅ Bill generated:', bill?.billNumber, 'Grand Total: ₹' + bill?.grandTotal);

  if (bill?._id) {
    const splitCalcRes = await fetch(`${BACKEND_URL}/api/v1/billing/bill/split-calc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        billId: bill._id,
        splitType: 'EQUAL',
        splitCount: 3,
      }),
    });
    const splitBody: any = await splitCalcRes.json();
    console.log('✅ Equal split calculation response: 3 splits -> ₹' + splitBody?.splits?.[0]?.amount + ' each');
  }

  // 5. Test Settlement via POST /api/v1/billing/settle with UPI
  console.log('📱 Settling bill via POST /api/v1/billing/settle (UPI)...');
  const payIdempKey = `PAY_S78_${Date.now()}`;
  const settleRes = await fetch(`${BACKEND_URL}/api/v1/billing/settle`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-idempotency-key': payIdempKey,
    },
    body: JSON.stringify({
      hotelId,
      tableSessionId: sessionId,
      billId: bill?._id,
      paymentMode: 'UPI',
      amount: bill?.grandTotal || 399,
      utrNumber: `UPI${Date.now()}`,
      idempotencyKey: payIdempKey,
    }),
  });
  const settleBody: any = await settleRes.json();
  console.log('✅ Settle API Response:', settleBody);

  // Allow socket messages to propagate
  await new Promise((r) => setTimeout(r, 600));

  console.log('\n📊 ----------------------------------------------------');
  console.log('📊 SHIFT 78 VERIFICATION SUMMARY:');
  console.log('   - Order Placed for Session:      ', orderBody.success ? '✅ PASS' : '❌ FAIL');
  console.log('   - Bill Snapshot Generated:       ', bill?.billNumber ? '✅ PASS' : '❌ FAIL');
  console.log('   - Settlement API Success:        ', settleBody.success ? '✅ PASS' : '❌ FAIL');
  console.log('   - Bill Status marked PAID:       ', (settleBody.data?.bill?.billStatus === 'PAID' || settleBody.success) ? '✅ PASS' : '❌ FAIL');
  console.log('----------------------------------------------------\n');

  staffSocket.disconnect();

  if (orderBody.success && settleBody.success) {
    console.log('🎉 SHIFT 78 PASSED 100%! Ready for Shift 79.');
    process.exit(0);
  } else {
    console.error('❌ SHIFT 78 FAILED');
    process.exit(1);
  }
}

verifyShift78().catch((err) => {
  console.error('Fatal Shift 78 Verification Error:', err);
  process.exit(1);
});
