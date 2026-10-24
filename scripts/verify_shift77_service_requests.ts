import { io as ioClient, Socket } from 'socket.io-client';

const BACKEND_URL = 'http://localhost:5000';

async function verifyShift77() {
  console.log('🧪 ========================================================');
  console.log('🧪 [VERIFICATION] SHIFT 77: Service Requests Auto-Routing Loop');
  console.log('🧪 ========================================================');

  // 1. Fetch demo context
  const contextRes = await fetch(`${BACKEND_URL}/api/v1/pos/demo-context`);
  const contextBody: any = await contextRes.json();
  const hotelId = contextBody.data.hotel.id;
  const table = contextBody.data.tables[0];
  console.log(`✅ Demo context loaded: Hotel ${contextBody.data.hotel.name} (${hotelId}), Table ${table.tableNumber}`);

  // 2. Connect Waiter socket
  const waiterSocket: Socket = ioClient(BACKEND_URL, {
    transports: ['websocket'],
    reconnection: false,
  });

  await new Promise<void>((resolve) => {
    waiterSocket.on('connect', () => {
      waiterSocket.emit('join_tenant_room', { hotelId, station: 'waiters' });
      console.log('🔌 Waiter Socket connected to hotel room');
      resolve();
    });
  });

  let serviceRequestReceived = false;
  let requestAcceptedReceived = false;
  let requestCompletedReceived = false;
  let capturedRequestId = '';

  waiterSocket.on('service:request', (data: any) => {
    console.log(`🛎️ [Waiter Socket] Service request arrived! Type: ${data.type || data.requestType}, Table: ${data.table || data.tableNumber}`);
    serviceRequestReceived = true;
    capturedRequestId = data.id || data.requestId;
  });

  waiterSocket.on('request:status_updated', (data: any) => {
    console.log(`📡 [Waiter Socket] Request status updated: ${data.status}`);
    if (data.status === 'ACCEPTED') requestAcceptedReceived = true;
    if (data.status === 'COMPLETED') requestCompletedReceived = true;
  });

  // 3. Customer calls waiter via POST /api/v1/requests
  console.log('📱 Customer on Table 5 taps "Call Waiter"...');
  const createRes = await fetch(`${BACKEND_URL}/api/v1/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hotelId,
      tableId: table.id,
      tableSessionId: table.activeSessionId,
      requestType: 'CALL_WAITER',
      priority: 'HIGH',
      notes: 'Customer requesting fresh cutlery and water',
    }),
  });

  const createData: any = await createRes.json();
  if (!createData.success) {
    throw new Error(`Failed to create service request: ${JSON.stringify(createData)}`);
  }
  const reqId = createData.data._id || createData.data.id;
  console.log(`✅ Service Request Created in DB: #${reqId} (Type: ${createData.data.requestType})`);

  // Wait 600ms for socket relay
  await new Promise((r) => setTimeout(r, 600));
  if (!serviceRequestReceived) {
    throw new Error('❌ Waiter terminal did not receive service:request event!');
  }
  console.log('✅ Waiter terminal received high-priority assistance alert!');

  // 4. Waiter accepts request via /accept
  const activeReqId = capturedRequestId || reqId;
  console.log(`🏃 Waiter taps "Accept" -> POST /api/v1/requests/${activeReqId}/accept...`);
  const acceptRes = await fetch(`${BACKEND_URL}/api/v1/requests/${activeReqId}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId },
    body: JSON.stringify({ hotelId }),
  });
  const acceptData: any = await acceptRes.json();
  if (!acceptData.success) {
    throw new Error(`Accept failed: ${JSON.stringify(acceptData)}`);
  }
  console.log(`✅ Request ${activeReqId} status transitioned to ACCEPTED`);

  await new Promise((r) => setTimeout(r, 600));
  if (!requestAcceptedReceived) {
    throw new Error('❌ Socket did not broadcast ACCEPTED status update!');
  }
  console.log('✅ ACCEPTED status update verified on socket bus!');

  // 5. Waiter resolves request via /resolve
  console.log(`🎉 Waiter completes assistance -> POST /api/v1/requests/${activeReqId}/resolve...`);
  const resolveRes = await fetch(`${BACKEND_URL}/api/v1/requests/${activeReqId}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId },
    body: JSON.stringify({ hotelId, resolutionNotes: 'Delivered cutlery and water to table' }),
  });
  const resolveData: any = await resolveRes.json();
  if (!resolveData.success) {
    throw new Error(`Resolve failed: ${JSON.stringify(resolveData)}`);
  }
  console.log(`✅ Request ${activeReqId} status transitioned to COMPLETED`);

  await new Promise((r) => setTimeout(r, 600));
  if (!requestCompletedReceived) {
    throw new Error('❌ Socket did not broadcast COMPLETED status update!');
  }
  console.log('✅ COMPLETED status update verified on socket bus!');

  // Clean up
  waiterSocket.disconnect();

  console.log('\n🎉 ========================================================');
  console.log('🎉 [SUCCESS] SHIFT 77 100% VERIFIED: SERVICE REQUESTS AUTO-ROUTING FULLY WORKING!');
  console.log('🎉 ========================================================\n');
}

verifyShift77().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
