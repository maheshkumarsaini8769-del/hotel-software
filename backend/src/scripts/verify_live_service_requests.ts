import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const port = process.env.PORT || 5000;
const baseUrl = `http://localhost:${port}`;

async function verifyLiveServiceRequests() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
  await mongoose.connect(mongoUri);

  const { Tenant } = await import('../models/Tenant');
  const { User } = await import('../models/User');
  const { DiningTable, TableStatus } = await import('../models/DiningTable');
  const { TableSession, SessionStatus } = await import('../models/TableSession');
  const { ServiceRequest, ServiceRequestStatus } = await import('../models/ServiceRequest');

  console.log('📡 [Service Request Test] Testing Live Service Request System on:', baseUrl);

  // 1. Get or create Tenant
  let tenant = await Tenant.findOne({ slug: 'live-kds-palace' });
  if (!tenant) {
    tenant = await Tenant.create({
      name: 'Live KDS Luxury Palace',
      slug: 'live-kds-palace',
      contactEmail: 'live_req@palace.com',
      contactPhone: '9888800099',
      status: 'ACTIVE',
    });
  }

  // 2. Get or create table & session
  let table = await DiningTable.findOne({ hotelId: tenant._id, tableNumber: 'Table 4' });
  if (!table) {
    table = await DiningTable.create({
      hotelId: tenant._id,
      tableNumber: 'Table 4',
      section: 'Indoor AC Dining',
      capacity: 4,
      currentStatus: TableStatus.OCCUPIED,
    });
  }

  let session = await TableSession.findOne({ tableId: table._id, status: SessionStatus.ACTIVE });
  if (!session) {
    session = await TableSession.create({
      hotelId: tenant._id,
      tableId: table._id,
      sessionTokenHash: 'hash_live_service_test',
      status: SessionStatus.ACTIVE,
      guestCount: 2,
      totalAmount: 0,
      finalAmount: 0,
    });
  }

  // 3. Test Service Request Types: WATER, CALL_WAITER, BILL, CUTLERY, CLEANING
  const requestTypes = ['WATER', 'CALL_WAITER', 'CUTLERY', 'CLEANING', 'BILL'];

  for (const type of requestTypes) {
    console.log(`🛎️ [Test] Sending customer service request: ${type}...`);
    const res = await fetch(`${baseUrl}/api/v1/requests/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hotelId: tenant._id.toString(),
        tableId: table._id.toString(),
        tableSessionId: session._id.toString(),
        requestType: type,
        notes: `Test live service request for ${type}`,
      }),
    });

    const json = (await res.json()) as any;
    console.log(`   Response Status: ${res.status}, Success: ${json.success}, RequestId: ${json.data?._id || json.data?.id}, Routing: ${json.data?.routingLevel}`);

    if (res.status !== 201 || !json.success) {
      throw new Error(`Failed to create service request for ${type}: ${JSON.stringify(json)}`);
    }

    // Verify persisted in DB
    const dbReq = await ServiceRequest.findById(json.data?._id || json.data?.id);
    if (!dbReq) {
      throw new Error(`Service request ${type} was not found in DB`);
    }
  }

  console.log('\n🎉 ALL 5 CUSTOMER SERVICE REQUEST TYPES VERIFIED LIVE OVER HTTP (100% WORKING)!');
  await mongoose.disconnect();
}

verifyLiveServiceRequests().catch((err) => {
  console.error('[Service Request Test Error]', err);
  process.exit(1);
});
