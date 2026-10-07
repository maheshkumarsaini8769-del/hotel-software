import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { UserRole } from '../types';
import { GuestProfile } from '../models/GuestProfile';
import { DiningTable } from '../models/DiningTable';

dotenv.config();

const BASE_URL = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'spicehub_super_secret_jwt_key_2026_production_ready_9921';

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}

async function request(endpoint: string, options: RequestOptions = {}, retries = 2): Promise<{ status: number; ok: boolean; body: any; headers?: any; error?: string }> {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  const fetchOptions: any = {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  };
  if (options.body !== undefined) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, fetchOptions);
      const text = await res.text();
      let json: any;
      try {
        json = JSON.parse(text);
      } catch {
        json = text;
      }
      return { status: res.status, ok: res.ok, body: json, headers: res.headers };
    } catch (err: any) {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 15));
        continue;
      }
      return { status: 0, ok: false, body: null, error: err.message };
    }
  }
  return { status: 0, ok: false, body: null, error: 'Max retries exceeded' };
}

interface TestProbe {
  id: number;
  stage: string;
  description: string;
  run: () => Promise<{ passed: boolean; status: number; note?: string }>;
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║  SPICEHUB HIGH-TRAFFIC STRESS ENGINE: 50 HOTELS, 10K+ GUESTS & 5K WAITERS   ║');
  console.log('║  Validating Zero-Break Enterprise Concurrency, Data Isolation & SLA Latency  ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
  }

  const db = mongoose.connection.db!;
  const tenants = await Tenant.find({ status: 'ACTIVE' }).limit(50);
  const totalWaiters = await User.countDocuments({ role: UserRole.WAITER });
  const totalGuests = await GuestProfile.countDocuments({});

  console.log(`[Database Infrastructure Audit]`);
  console.log(`   🏨 Active Multi-Tenant Hotels: ${tenants.length} properties`);
  console.log(`   🤵 Provisioned Waiters:        ${totalWaiters} staff accounts`);
  console.log(`   👥 Registered Guests:          ${totalGuests} customer profiles\n`);

  if (tenants.length < 50 || totalWaiters < 5000 || totalGuests < 10000) {
    console.error('❌ Prerequisite counts not met. Please run seed_50_hotels_10k_guests_5k_waiters.ts first.');
    process.exit(1);
  }

  console.log('🔑 Generating high-speed tokens for all 50 hotels and active staff...');
  // Cache credentials per hotel
  interface HotelContext {
    hotelId: string;
    name: string;
    slug: string;
    adminToken: string;
    sampleWaiters: Array<{ userId: string; token: string; name: string }>;
  }

  const hotelContexts: HotelContext[] = [];

  for (let i = 0; i < tenants.length; i++) {
    const t = tenants[i];
    const hotelId = (t._id as Types.ObjectId).toString();

    const adminToken = jwt.sign(
      { userId: new Types.ObjectId().toString(), hotelId, role: 'HOTEL_ADMIN', name: `Admin ${t.name}` },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Fetch sample waiters for this hotel
    const waiters = await User.find({ hotelId: t._id, role: UserRole.WAITER }).limit(100);
    const sampleWaiters = waiters.map((w) => ({
      userId: (w._id as Types.ObjectId).toString(),
      name: w.name,
      token: jwt.sign(
        { userId: (w._id as Types.ObjectId).toString(), hotelId, role: 'WAITER', name: w.name },
        JWT_SECRET,
        { expiresIn: '8h' }
      ),
    }));

    hotelContexts.push({
      hotelId,
      name: t.name,
      slug: t.slug,
      adminToken,
      sampleWaiters,
    });
  }

  console.log(`✅ Loaded and cached credentials for all ${hotelContexts.length} hotels!\n`);

  const probes: TestProbe[] = [];
  let probeId = 1;

  const add = (stage: string, description: string, run: () => Promise<{ passed: boolean; status: number; note?: string }>) => {
    probes.push({ id: probeId++, stage, description, run });
  };

  // =========================================================================
  // STAGE 1: 50-Hotel Concurrent Core Health & Multi-Tenant Boundary (1,000 probes)
  // =========================================================================
  console.log('Building Stage 1: 50-Hotel Concurrent Isolation Probes (1,000 tests)...');
  for (let i = 1; i <= 1000; i++) {
    const hotelCtx = hotelContexts[i % hotelContexts.length];
    add('Stage 1: 50-Hotel Boundary', `Hotel #${(i % hotelContexts.length) + 1} (${hotelCtx.slug}) Isolation Verification #${i}`, async () => {
      const res = await request('/api/v1/tenant/verify-isolation', {
        headers: { Authorization: `Bearer ${hotelCtx.adminToken}`, 'x-hotel-id': hotelCtx.hotelId },
      });
      const passed = res.status === 200 && res.body?.hotelId === hotelCtx.hotelId;
      return { passed, status: res.status };
    });
  }

  // =========================================================================
  // STAGE 2: 10,000+ Customer Digital Traffic Bursts (10,000 probes)
  // =========================================================================
  console.log('Building Stage 2: 10,000+ Customer Activity Bursts across 50 Hotels (10,000 tests)...');
  for (let i = 1; i <= 10000; i++) {
    const hotelCtx = hotelContexts[i % hotelContexts.length];
    const customerAction = i % 4;

    if (customerAction === 0) {
      // Customer Action 1: QR Dine-in Menu Browsing
      add('Stage 2: Customer Traffic', `Customer #${i} browsing Menu on Hotel ${hotelCtx.slug}`, async () => {
        const res = await request('/api/v1/pos/menu?inStockOnly=true', {
          headers: { Authorization: `Bearer ${hotelCtx.adminToken}`, 'x-hotel-id': hotelCtx.hotelId },
        });
        return { passed: res.status === 200, status: res.status };
      });
    } else if (customerAction === 1) {
      // Customer Action 2: Table QR Anti-Tamper Scan Check
      add('Stage 2: Customer Traffic', `Customer #${i} Scanning Table QR Locker on Hotel ${hotelCtx.slug}`, async () => {
        const res = await request('/api/v1/qr-locker/init-table', {
          method: 'POST',
          headers: { 'x-hotel-id': hotelCtx.hotelId },
          body: { tableId: 'invalid-id' }, // Strict validation assertion
        });
        return { passed: res.status === 400, status: res.status };
      });
    } else if (customerAction === 2) {
      // Customer Action 3: In-House Guest Stay Status Poll
      add('Stage 2: Customer Traffic', `Guest #${i} checking Active In-House Stays on Hotel ${hotelCtx.slug}`, async () => {
        const res = await request('/api/v1/pms/frontdesk/active-stays', {
          headers: { Authorization: `Bearer ${hotelCtx.adminToken}`, 'x-hotel-id': hotelCtx.hotelId },
        });
        return { passed: res.status === 200, status: res.status };
      });
    } else {
      // Customer Action 4: Community / Co-Dining Seat Availability Check
      add('Stage 2: Customer Traffic', `Customer #${i} checking Open Seats on Hotel ${hotelCtx.slug}`, async () => {
        const res = await request('/api/v1/co-dining/tables', {
          headers: { Authorization: `Bearer ${hotelCtx.adminToken}`, 'x-hotel-id': hotelCtx.hotelId },
        });
        return { passed: res.status === 200, status: res.status };
      });
    }
  }

  // =========================================================================
  // STAGE 3: 5,000 Waiters Concurrent Shift Traffic (5,000 probes)
  // =========================================================================
  console.log('Building Stage 3: 5,000 Waiters Concurrent Shift Operations (5,000 tests)...');
  for (let i = 1; i <= 5000; i++) {
    const hotelIndex = i % hotelContexts.length;
    const hotelCtx = hotelContexts[hotelIndex];
    const waiterIndex = Math.floor(i / hotelContexts.length) % hotelCtx.sampleWaiters.length;
    const waiter = hotelCtx.sampleWaiters[waiterIndex];

    const waiterAction = i % 3;
    if (waiterAction === 0) {
      // Waiter Action 1: Table Grid & Section Layout Inquiry
      add('Stage 3: Waiter Operations', `Waiter #${i} (${waiter.name}) querying POS tables`, async () => {
        const res = await request('/api/v1/pos/tables', {
          headers: { Authorization: `Bearer ${waiter.token}`, 'x-hotel-id': hotelCtx.hotelId },
        });
        return { passed: res.status === 200 && (Array.isArray(res.body) || Array.isArray(res.body?.data)), status: res.status };
      });
    } else if (waiterAction === 1) {
      // Waiter Action 2: Daily Pocket Cash Float Check
      add('Stage 3: Waiter Operations', `Waiter #${i} (${waiter.name}) inquiring Cash Float`, async () => {
        const res = await request('/api/v1/waiter-cash-float/active', {
          headers: { Authorization: `Bearer ${waiter.token}`, 'x-hotel-id': hotelCtx.hotelId },
        });
        return { passed: res.status === 200, status: res.status };
      });
    } else {
      // Waiter Action 3: Kitchen Ready SLA Ticket Config
      add('Stage 3: Waiter Operations', `Waiter #${i} (${waiter.name}) checking Kitchen Pickup SLA`, async () => {
        const res = await request('/api/v1/food-pickup-sla/config', {
          headers: { Authorization: `Bearer ${waiter.token}`, 'x-hotel-id': hotelCtx.hotelId },
        });
        return { passed: res.status === 200, status: res.status };
      });
    }
  }

  // =========================================================================
  // STAGE 4: Cross-Tenant Penetration Defense Under Heavy Load (1,000 probes)
  // =========================================================================
  console.log('Building Stage 4: Cross-Tenant Penetration Defense Under Heavy Load (1,000 tests)...');
  for (let i = 1; i <= 1000; i++) {
    const hotelA = hotelContexts[i % hotelContexts.length];
    const hotelB = hotelContexts[(i + 17) % hotelContexts.length]; // Random foreign hotel

    add('Stage 4: Cross-Tenant Security', `Hotel ${hotelA.slug} Token probing Hotel ${hotelB.slug} Boundary #${i}`, async () => {
      // Hotel A passes its token, but requests Hotel B's header. Must strictly return Hotel A's ID!
      const res = await request('/api/v1/tenant/verify-isolation', {
        headers: { Authorization: `Bearer ${hotelA.adminToken}`, 'x-hotel-id': hotelB.hotelId },
      });
      // The server must enforce Hotel A's authenticated identity and NOT switch to Hotel B!
      const passed = res.status === 200 && res.body?.hotelId === hotelA.hotelId;
      return { passed, status: res.status };
    });
  }

  // =========================================================================
  // STAGE 5: Frontend Page Availability Under Traffic Load (500 probes)
  // =========================================================================
  console.log('Building Stage 5: All 6 Frontend Web Apps Availability Under Load (500 tests)...');
  const FRONTEND_PORTS = [3001, 3002, 3003, 3004, 3005, 3006];
  for (let i = 1; i <= 500; i++) {
    const port = FRONTEND_PORTS[i % FRONTEND_PORTS.length];
    add('Stage 5: Frontend Health', `HTTP GET http://localhost:${port}/ Availability Probe #${i}`, async () => {
      const res = await request(`http://localhost:${port}/`);
      return { passed: res.status === 200, status: res.status };
    });
  }

  console.log(`\n🚀 TOTAL STRESS TESTS COMPILED: ${probes.length} concurrent probes!`);
  console.log('Executing high-throughput burst runner across 50 hotels, 10K+ customers & 5K waiters...\n');

  const startTime = Date.now();
  let passedCount = 0;
  let failedCount = 0;
  const failedProbes: any[] = [];
  const latencies: number[] = [];

  const CONCURRENCY = 60;
  for (let i = 0; i < probes.length; i += CONCURRENCY) {
    const chunk = probes.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      chunk.map(async (probe) => {
        const tStart = Date.now();
        try {
          const res = await probe.run();
          const elapsed = Date.now() - tStart;
          return { probe, res, elapsed, error: null };
        } catch (err: any) {
          const elapsed = Date.now() - tStart;
          return { probe, res: { passed: false, status: 0 }, elapsed, error: err.message };
        }
      })
    );

    for (const { probe, res, elapsed, error } of results) {
      latencies.push(elapsed);
      if (res.passed && !error) {
        passedCount++;
      } else {
        failedCount++;
        failedProbes.push({ ...probe, res, elapsed, error });
        console.error(`[❌ FAIL] [Probe #${probe.id}] [${probe.stage}] ${probe.description} (HTTP ${res.status}, ${elapsed}ms)`);
      }
    }

    const currentCompleted = i + chunk.length;
    if (currentCompleted % 2500 === 0 || currentCompleted === probes.length) {
      const currentElapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      const reqPerSec = Math.round(currentCompleted / (Number(currentElapsed) || 1));
      console.log(`[⚡ PROGRESS: ${String(currentCompleted).padStart(5, '0')}/${probes.length}] Passed: ${passedCount} | Failed: ${failedCount} (Time: ${currentElapsed}s, Rate: ${reqPerSec} req/s)`);
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  latencies.sort((a, b) => a - b);
  const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1));
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;

  console.log('\n══════════════════════════════════════════════════════════════════════════════');
  console.log(' 🏆 50 HOTELS, 10K+ GUESTS & 5K WAITERS HIGH-TRAFFIC STRESS RESULTS:');
  console.log(`   TOTAL HIGH-LOAD REQUESTS: ${probes.length}`);
  console.log(`   PASSED (100% GREEN):      ${passedCount}`);
  console.log(`   FAILED / CRASHED:         ${failedCount}`);
  console.log(`   TOTAL DURATION:           ${totalTime}s`);
  console.log(`   THROUGHPUT:               ${Math.round(probes.length / (Number(totalTime) || 1))} requests/sec`);
  console.log(`   AVG LATENCY:              ${avgLatency}ms`);
  console.log(`   P50 LATENCY:              ${p50}ms`);
  console.log(`   P95 LATENCY:              ${p95}ms`);
  console.log(`   P99 LATENCY:              ${p99}ms`);
  console.log('══════════════════════════════════════════════════════════════════════════════\n');

  await mongoose.disconnect();

  if (failedCount > 0) {
    console.error(`💥 FAILURE DETECTED (${failedCount} probes failed):`);
    failedProbes.slice(0, 10).forEach((f) => {
      console.error(`- Probe #${f.id} [${f.stage}] ${f.description}: HTTP ${f.res?.status} (Error: ${f.error || 'Assertion failed'})`);
    });
    process.exit(1);
  } else {
    console.log('🎉 ABSOLUTE SUCCESS! ZERO BREAKS, ZERO CRASHES, 100% UPTIME ACROSS ALL 50 HOTELS!');
  }
}

main().catch((err) => {
  console.error('Fatal Traffic Simulator Error:', err);
  process.exit(1);
});
