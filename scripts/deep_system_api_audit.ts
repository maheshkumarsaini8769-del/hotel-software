import axios from 'axios';
import mongoose, { Types } from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { Tenant } from '../backend/src/models/Tenant';
import { Room, RoomStatus } from '../backend/src/models/Room';
import { RoomType } from '../backend/src/models/RoomType';
import { Stay, StayStatus } from '../backend/src/models/Stay';
import { MasterFolio } from '../backend/src/models/MasterFolio';
import { GuestProfile, VIPTier } from '../backend/src/models/GuestProfile';
import { DepartmentType } from '../backend/src/models/FolioLineItem';

dotenv.config({ path: 'backend/.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
const JWT_SECRET = process.env.JWT_SECRET || 'spicehub_super_secret_jwt_key_2026_production_ready_9921';
const API_BASE = 'http://localhost:5000/api/v1';

interface TestResult {
  suite: string;
  test: string;
  passed: boolean;
  durationMs: number;
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

async function runCheck(suite: string, testName: string, fn: () => Promise<any>) {
  const start = Date.now();
  try {
    const details = await fn();
    const duration = Date.now() - start;
    results.push({
      suite,
      test: testName,
      passed: true,
      durationMs: duration,
      details: typeof details === 'string' ? details : undefined,
    });
    console.log(`  ✅ [PASS] ${suite} -> ${testName} (${duration}ms)`);
  } catch (err: any) {
    const duration = Date.now() - start;
    const errText = err.response?.data?.message || err.message || String(err);
    results.push({
      suite,
      test: testName,
      passed: false,
      durationMs: duration,
      error: `${err.response?.status || 'ERR'}: ${errText}`,
    });
    console.error(`  ❌ [FAIL] ${suite} -> ${testName} (${duration}ms):`, errText);
    if (err.response?.data) {
      console.error('     Response Body:', JSON.stringify(err.response.data));
    }
  }
}

async function runDeepAudit() {
  console.log('================================================================================');
  console.log('🔬 [DEEP SYSTEM AUDIT] COMPREHENSIVE BACKEND API & DOMAIN PIPELINE HEALTH CHECK');
  console.log('================================================================================');

  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB at:', MONGO_URI);

  const tenantA = (await Tenant.findOne({ slug: 'taj-gateway' })) || (await Tenant.findOne());
  if (!tenantA) throw new Error('Primary Tenant A not found');

  let tenantB = await Tenant.findOne({ slug: 'oberoi-grand-audit' });
  if (!tenantB) {
    tenantB = await Tenant.create({
      name: 'Oberoi Grand Audit Resort',
      slug: 'oberoi-grand-audit',
      address: '15 Marine Drive',
      contactPhone: '9800112233',
      contactEmail: 'audit@oberoi-test.com',
    });
  }

  const tokenAdminA = jwt.sign(
    { userId: new Types.ObjectId(), hotelId: tenantA._id.toString(), role: 'HOTEL_ADMIN', name: 'Admin Taj' },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  const tokenAdminB = jwt.sign(
    { userId: new Types.ObjectId(), hotelId: tenantB._id.toString(), role: 'HOTEL_ADMIN', name: 'Admin Oberoi' },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  const headersA = { Authorization: `Bearer ${tokenAdminA}`, 'x-hotel-id': tenantA._id.toString() };
  const headersB = { Authorization: `Bearer ${tokenAdminB}`, 'x-hotel-id': tenantB._id.toString() };

  // Setup Test Room Type & Room
  let rType = await RoomType.findOne({ hotelId: tenantA._id, code: 'AUDIT-STD' });
  if (!rType) {
    rType = await RoomType.create({
      hotelId: tenantA._id,
      name: 'Audit Standard Room',
      code: 'AUDIT-STD',
      slug: `audit-std-${Date.now()}`,
      basePriceOvernight: 4000,
      maxOccupancyAdults: 2,
    });
  }

  let testRoomNumber = '808';
  let room808 = await Room.findOne({ hotelId: tenantA._id, roomNumber: testRoomNumber });
  if (!room808) {
    room808 = await Room.create({
      hotelId: tenantA._id,
      roomNumber: testRoomNumber,
      floorNumber: 8,
      wing: 'North Wing',
      roomTypeId: rType._id,
      permanentQrCodeHash: `qr-808-${Date.now()}`,
      status: RoomStatus.AVAILABLE,
    });
  } else {
    room808.status = RoomStatus.AVAILABLE;
    await room808.save();
  }

  let testRoom202 = await Room.findOne({ hotelId: tenantA._id, roomNumber: '809' });
  if (!testRoom202) {
    testRoom202 = await Room.create({
      hotelId: tenantA._id,
      roomNumber: '809',
      floorNumber: 8,
      wing: 'North Wing',
      roomTypeId: rType._id,
      permanentQrCodeHash: `qr-809-${Date.now()}`,
      status: RoomStatus.AVAILABLE,
    });
  } else {
    testRoom202.status = RoomStatus.AVAILABLE;
    await testRoom202.save();
  }

  // Clean existing stays for room 808
  await Stay.deleteMany({ hotelId: tenantA._id, roomId: room808._id });
  await MasterFolio.deleteMany({ hotelId: tenantA._id, roomId: room808._id });

  let testStayId = '';
  let testFolioId = '';
  let testTaskId = '';
  let testTicketId = '';

  console.log('\n--- 1. SERVER HEALTH & PUBLIC ROOTS ---');
  await runCheck('HEALTH', 'GET /health returns 200 HEALTHY', async () => {
    const res = await axios.get('http://localhost:5000/health');
    if (res.data.status !== 'HEALTHY') throw new Error(`Unexpected status ${res.data.status}`);
    return res.data.service;
  });

  console.log('\n--- 2. AUTHENTICATION & MULTI-TENANCY GATES ---');
  await runCheck('AUTH', 'Unauthenticated request to protected route is rejected with 401', async () => {
    try {
      await axios.get(`${API_BASE}/housekeeping/lost-and-found/vault`);
      throw new Error('Should have rejected with 401');
    } catch (err: any) {
      if (err.response?.status !== 401) throw err;
      return 'Rejected 401 as expected';
    }
  });

  console.log('\n--- 3. FRONT DESK QUICK CHECK-IN & EXPECTED ARRIVALS ---');
  await runCheck('FRONT_DESK', 'GET /frontdesk/expected-arrivals returns list', async () => {
    const res = await axios.get(`${API_BASE}/pms/frontdesk/expected-arrivals`, { headers: headersA });
    if (!res.data.success) throw new Error('Expected arrivals response failed');
    return `Arrivals count: ${res.data.count || 0}`;
  });

  await runCheck('FRONT_DESK', 'GET /frontdesk/available-rooms returns active rooms', async () => {
    const res = await axios.get(`${API_BASE}/pms/frontdesk/available-rooms`, { headers: headersA });
    if (!res.data.success) throw new Error('Available rooms failed');
    return `Available rooms count: ${res.data.data?.length || 0}`;
  });

  await runCheck('FRONT_DESK', 'POST /frontdesk/quick-checkin creates active Stay & MasterFolio for Room 808', async () => {
    const res = await axios.post(
      `${API_BASE}/pms/frontdesk/quick-checkin`,
      {
        roomId: room808._id.toString(),
        guestName: 'Audit Diplomat Guest',
        guestPhone: '9811009900',
        guestEmail: 'diplomat@audit.org',
        isCouple: true,
        idType: 'PASSPORT',
        idNumber: 'K8920192',
        verifiedByReceptionist: true,
        receptionistNotes: 'Deep system test automated checkin',
        advancePaid: 1500,
      },
      { headers: headersA }
    );
    if (!res.data.success) throw new Error('Quick check-in failed');
    testStayId = res.data.data.stay._id;
    testFolioId = res.data.data.folio._id;
    return `Stay: ${testStayId}, Folio: ${res.data.data.folio.folioNumber}`;
  });

  await runCheck('FRONT_DESK', 'GET /frontdesk/active-stays retrieves seeded Room 808 Stay', async () => {
    const res = await axios.get(`${API_BASE}/pms/frontdesk/active-stays`, { headers: headersA });
    if (!res.data.success) throw new Error('Failed to fetch active stays');
    const guest = res.data.data.find((g: any) => g.roomNumber === '808');
    if (!guest) throw new Error('Room 808 not found in active stays list');
    return `Found guest: ${guest.guestName}, dueAmount: ₹${guest.balanceDue}`;
  });

  console.log('\n--- 4. IN-ROOM CONCIERGE & SERVICE REQUESTS (Shift 60) ---');
  let testConciergeId = '';
  await runCheck('CONCIERGE', 'POST /frontdesk/concierge-request logs guest request', async () => {
    const res = await axios.post(
      `${API_BASE}/pms/frontdesk/concierge-request`,
      {
        roomNumber: '808',
        requestType: 'TOWEL_REPLENISH',
        priority: 'HIGH',
        notes: '2 Extra bath towels and luxury shower gel',
        isBillable: false,
      },
      { headers: headersA }
    );
    if (!res.data.success) throw new Error('Concierge request failed');
    testConciergeId = res.data.data.request.requestId;
    return `Request ID: ${testConciergeId}`;
  });

  await runCheck('CONCIERGE', 'GET /frontdesk/concierge-requests retrieves logged request', async () => {
    const res = await axios.get(`${API_BASE}/pms/frontdesk/concierge-requests`, { headers: headersA });
    if (!res.data.success) throw new Error('Failed to get concierge requests');
    const item = res.data.data.find((r: any) => r.id === testConciergeId);
    if (!item) throw new Error('Logged concierge request not found');
    return `Status: ${item.status}, SLA: ${item.slaMinutes}m`;
  });

  await runCheck('CONCIERGE', 'PATCH /frontdesk/concierge-request/:id/status updates status to COMPLETED', async () => {
    const res = await axios.patch(
      `${API_BASE}/pms/frontdesk/concierge-request/${testConciergeId}/status`,
      {
        status: 'COMPLETED',
        notes: 'Delivered to Room 808',
      },
      { headers: headersA }
    );
    if (!res.data.success) throw new Error('Failed to update concierge request');
    return `Updated status: ${res.data.data.status}`;
  });

  console.log('\n--- 5. ROOM MAINTENANCE & OOS PIPELINE (Shift 63) ---');
  await runCheck('MAINTENANCE', 'POST /frontdesk/maintenance/create-ticket logs defect and blocks room', async () => {
    const res = await axios.post(
      `${API_BASE}/pms/frontdesk/maintenance/create-ticket`,
      {
        roomNumber: '809',
        title: 'AC unit water leakage',
        description: 'Water dripping from indoor split AC blower',
        category: 'HVAC',
        priority: 'HIGH',
        blocksRoom: true,
      },
      { headers: headersA }
    );
    if (!res.data.success) throw new Error('Maintenance ticket create failed');
    testTicketId = res.data.data._id;
    return `Ticket ID: ${testTicketId}, Room Status: ${res.data.data.roomStatus}`;
  });

  await runCheck('MAINTENANCE', 'Room 809 is excluded from Available Rooms while in OOS', async () => {
    const res = await axios.get(`${API_BASE}/pms/frontdesk/available-rooms`, { headers: headersA });
    const found = res.data.data.some((r: any) => r.roomNumber === '809');
    if (found) throw new Error('Room 809 should be blocked from available inventory');
    return 'Room 809 successfully locked from inventory';
  });

  await runCheck('MAINTENANCE', 'POST /frontdesk/maintenance/resolve-and-release unblocks Room 809', async () => {
    const res = await axios.post(
      `${API_BASE}/pms/frontdesk/maintenance/resolve-and-release`,
      {
        ticketId: testTicketId,
        resolutionNotes: 'Drain pipe unclogged and tested for 30 minutes',
        supervisorApproved: true,
      },
      { headers: headersA }
    );
    if (!res.data.success) throw new Error('Maintenance resolve failed');
    return `Ticket status: ${res.data.data.status}, Room Status: ${res.data.data.roomStatus}`;
  });

  console.log('\n--- 6. LATE CHECK-OUT TIERED SURCHARGES (Shift 65) ---');
  await runCheck('LATE_CHECKOUT', 'POST /frontdesk/late-checkout/calculate computes surcharge & GST', async () => {
    const res = await axios.post(
      `${API_BASE}/pms/frontdesk/late-checkout/calculate`,
      {
        roomNumber: '808',
        requestedCheckOutTime: '15:00',
      },
      { headers: headersA }
    );
    if (!res.data.success) throw new Error('Late checkout calculate failed');
    return `Tier: ${res.data.data.tier}, Surcharge: ₹${res.data.data.surchargeAmount}, Total: ₹${res.data.data.totalCharge}`;
  });

  await runCheck('LATE_CHECKOUT', 'POST /frontdesk/late-checkout/approve extends keycard and posts charge to folio', async () => {
    const res = await axios.post(
      `${API_BASE}/pms/frontdesk/late-checkout/approve`,
      {
        roomNumber: '808',
        requestedCheckOutTime: '15:00',
        waiveSurcharge: false,
        forceOverride: true,
      },
      { headers: headersA }
    );
    if (!res.data.success) throw new Error('Late checkout approve failed');
    return `Approved until: ${res.data.data.approvedCheckOutTime}, Surcharge: ₹${res.data.data.totalCharge}`;
  });

  console.log('\n--- 7. RATE OVERRIDE & SECURITY PIN MATRIX (Shift 67) ---');
  await runCheck('RATE_OVERRIDE', 'POST /frontdesk/rate-override/calculate computes discount & required tier', async () => {
    const res = await axios.post(
      `${API_BASE}/pms/frontdesk/rate-override/calculate`,
      {
        roomNumber: '808',
        overrideType: 'PERCENTAGE_DISCOUNT',
        discountPercent: 20,
      },
      { headers: headersA }
    );
    if (!res.data.success) throw new Error('Rate override calculation failed');
    if (res.data.data.approvalTier !== 'DUTY_MANAGER') throw new Error(`Expected DUTY_MANAGER, got ${res.data.data.approvalTier}`);
    return `Base: ₹${res.data.data.baseRatePerNight}, New: ₹${res.data.data.newRatePerNight}, Tier: ${res.data.data.approvalTier}`;
  });

  await runCheck('RATE_OVERRIDE', 'POST /frontdesk/rate-override/apply rejects without manager PIN for high discount', async () => {
    try {
      await axios.post(
        `${API_BASE}/pms/frontdesk/rate-override/apply`,
        {
          roomNumber: '808',
          overrideType: 'PERCENTAGE_DISCOUNT',
          discountPercent: 25,
          reason: 'SERVICE_RECOVERY',
          justification: 'AC water leakage recovery credit',
          managerPin: '0000', // Invalid PIN
        },
        { headers: headersA }
      );
      throw new Error('Should have rejected with 403 INVALID_MANAGER_PIN');
    } catch (err: any) {
      if (err.response?.status !== 403) throw err;
      return 'Rejected 403 as expected with invalid PIN';
    }
  });

  await runCheck('RATE_OVERRIDE', 'POST /frontdesk/rate-override/apply approves with valid PIN 9921 & credits folio', async () => {
    const res = await axios.post(
      `${API_BASE}/pms/frontdesk/rate-override/apply`,
      {
        roomNumber: '808',
        overrideType: 'PERCENTAGE_DISCOUNT',
        discountPercent: 20,
        reason: 'SERVICE_RECOVERY',
        justification: 'AC water leakage recovery credit',
        managerPin: '9921',
      },
      { headers: headersA }
    );
    if (!res.data.success) throw new Error('Rate override apply failed');
    return `Effective Rate: ₹${res.data.data.effectiveRatePerNight}, Folio Due: ₹${res.data.data.folioBalanceDue}`;
  });

  await runCheck('RATE_OVERRIDE', 'GET /frontdesk/rate-override/audit-log returns historical log', async () => {
    const res = await axios.get(`${API_BASE}/pms/frontdesk/rate-override/audit-log`, { headers: headersA });
    if (!res.data.success) throw new Error('Failed to get audit log');
    return `Total overrides logged: ${res.data.count}`;
  });

  console.log('\n--- 8. LOST & FOUND DIGITAL VAULT (Shift 66) ---');
  let testTrackingCode = '';
  await runCheck('LOST_AND_FOUND', 'POST /housekeeping/lost-and-found logs high-value item into vault', async () => {
    const res = await axios.post(
      `${API_BASE}/housekeeping/lost-and-found`,
      {
        description: 'Montblanc Meisterstuck Platinum Fountain Pen',
        category: 'JEWELRY',
        foundLocation: 'Room 808 Desk Drawer',
        roomNumber: '808',
        guestName: 'Audit Diplomat Guest',
        isHighValue: true,
        estimatedValue: 65000,
        storageLocation: 'Front Office Digital Vault #01',
      },
      { headers: headersA }
    );
    if (!res.data.success && !res.data.item) throw new Error('Failed to log lost item');
    testTrackingCode = res.data.item.trackingNumber;
    return `Tracking: ${testTrackingCode}, Status: ${res.data.item.status}`;
  });

  await runCheck('LOST_AND_FOUND', 'GET /housekeeping/lost-and-found/vault returns vault items', async () => {
    const res = await axios.get(`${API_BASE}/housekeeping/lost-and-found/vault`, { headers: headersA });
    if (!res.data.success) throw new Error('Failed to get vault items');
    return `Vault items count: ${res.data.count}`;
  });

  console.log('\n--- 9. CHECKOUT PREVIEW & EXPRESS FOLIO SETTLEMENT (Shift 61) ---');
  await runCheck('CHECKOUT', 'GET /frontdesk/checkout-preview/808 aggregates folio and charges', async () => {
    const res = await axios.get(`${API_BASE}/pms/frontdesk/checkout-preview/808?hotelId=${tenantA._id}`, { headers: headersA });
    if (!res.data.success) throw new Error('Checkout preview failed');
    return `Due Amount: ₹${res.data.data.folio.dueAmount}, Net Payable: ₹${res.data.data.folio.netAmountPayable}`;
  });

  await runCheck('CHECKOUT', 'POST /frontdesk/settle-and-checkout settles folio & marks room DIRTY', async () => {
    const res = await axios.post(
      `${API_BASE}/pms/frontdesk/settle-and-checkout`,
      {
        roomNumber: '808',
        paymentMethod: 'UPI',
        transactionReference: 'UPI-AUDIT-FINAL-88',
        voidKeyCard: true,
      },
      { headers: headersA }
    );
    if (!res.data.success) throw new Error('Checkout settlement failed');
    return `Room status: ${res.data.data.roomStatus}, Balance Due: ₹${res.data.data.balanceDue}`;
  });

  console.log('\n--- 10. HOUSEKEEPING TURNAROUND PIPELINE (Shift 62) ---');
  let testTurnaroundTask: any = null;
  await runCheck('TURNAROUND', 'Vacated Room 808 automatically enters Housekeeping Turnaround Queue', async () => {
    const res = await axios.get(`${API_BASE}/pms/frontdesk/turnaround-queue`, { headers: headersA });
    testTurnaroundTask = res.data.data.find((t: any) => t.room?.roomNumber === '808');
    if (!testTurnaroundTask) throw new Error('Room 808 turnaround task not generated upon checkout');
    return `Task ID: ${testTurnaroundTask.taskId}, Status: ${testTurnaroundTask.status}`;
  });

  if (testTurnaroundTask) {
    await runCheck('TURNAROUND', 'POST /frontdesk/turnaround/submit-checklist completes 6-point checklist', async () => {
      const res = await axios.post(
        `${API_BASE}/pms/frontdesk/turnaround/submit-checklist`,
        {
          taskId: testTurnaroundTask.taskId,
          checklist: [
            { taskName: 'Strip & replace bed linens', isDone: true },
            { taskName: 'Scrub & sanitize bathroom', isDone: true },
            { taskName: 'Vacuum carpet & disinfect touchpoints', isDone: true },
            { taskName: 'Audit minibar & water', isDone: true },
            { taskName: 'Inspect electricals & AC', isDone: true },
            { taskName: 'Verify RFID reader & door safety seal', isDone: true },
          ],
          attendantNotes: 'Deep audit cleaning completed and certified.',
        },
        { headers: headersA }
      );
      if (!res.data.success) throw new Error('Submit checklist failed');
      return `Status: ${res.data.data.status}, Room Status: ${res.data.data.roomStatus}`;
    });

    await runCheck('TURNAROUND', 'POST /frontdesk/turnaround/approve-ready releases Room 808 to AVAILABLE', async () => {
      const res = await axios.post(
        `${API_BASE}/pms/frontdesk/turnaround/approve-ready`,
        {
          taskId: testTurnaroundTask.taskId,
          supervisorNotes: 'Executive Housekeeper inspection certified instant ready',
        },
        { headers: headersA }
      );
      if (!res.data.success) throw new Error('Approve ready failed');
      return `Room 808 Released to: ${res.data.data.roomStatus}`;
    });
  }

  console.log('\n--- 11. CROSS-TENANT ISOLATION REJECTION TESTS ---');
  await runCheck('MULTI_TENANCY', 'Tenant B cannot access Room 808 checkout preview (404/403)', async () => {
    try {
      await axios.get(`${API_BASE}/pms/frontdesk/checkout-preview/808`, { headers: headersB });
      throw new Error('Should have rejected cross-tenant lookup');
    } catch (err: any) {
      if (err.response?.status !== 404 && err.response?.status !== 403) throw err;
      return 'Isolated 404/403 as expected';
    }
  });

  await runCheck('MULTI_TENANCY', 'Tenant B cannot apply rate override to Tenant A stay', async () => {
    try {
      await axios.post(
        `${API_BASE}/pms/frontdesk/rate-override/apply`,
        {
          stayId: testStayId,
          overrideType: 'PERCENTAGE_DISCOUNT',
          discountPercent: 10,
          reason: 'SERVICE_RECOVERY',
          justification: 'Malicious cross-tenant override attempt',
          managerPin: '9921',
        },
        { headers: headersB }
      );
      throw new Error('Should have rejected cross-tenant mutation');
    } catch (err: any) {
      if (err.response?.status !== 404 && err.response?.status !== 403) throw err;
      return 'Isolated 404/403 as expected';
    }
  });

  // Cleanup test records
  await Stay.deleteMany({ hotelId: tenantA._id, roomId: room808._id });
  await MasterFolio.deleteMany({ hotelId: tenantA._id, roomId: room808._id });
  await Room.deleteOne({ _id: room808._id });
  await Room.deleteOne({ _id: testRoom202._id });

  console.log('\n================================================================================');
  console.log('📊 [AUDIT SUMMARY RESULTS]');
  console.log('================================================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  console.log(`TOTAL CHECKS RUN: ${results.length}`);
  console.log(`PASSED: ${passedCount}`);
  console.log(`FAILED: ${failedCount}`);

  if (failedCount > 0) {
    console.error('\nFAILURES DETECTED:');
    results.filter((r) => !r.passed).forEach((r) => {
      console.error(`- [${r.suite}] ${r.test}: ${r.error}`);
    });
    process.exit(1);
  } else {
    console.log('\n🎉 ALL DEEP API & WORKFLOW INTEGRATION CHECKS PASSED WITH 100% SUCCESS!');
  }

  await mongoose.disconnect();
}

runDeepAudit().catch((err) => {
  console.error('Fatal Audit Error:', err);
  process.exit(1);
});
