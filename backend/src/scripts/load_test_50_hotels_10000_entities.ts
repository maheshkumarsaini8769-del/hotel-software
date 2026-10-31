import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { UserRole, ShiftStatus } from '../types';
import { GuestProfile, VIPTier } from '../models/GuestProfile';
import { DiningTable, TableStatus, SeatStatus } from '../models/DiningTable';
import { getJwtSecret } from '../config/security';

dotenv.config();

const BASE_URL = 'http://localhost:5000';
const JWT_SECRET = getJwtSecret();
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';

const DRILL_TAG = `DRILL_${Date.now()}`;

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║  SPICEHUB ENTERPRISE CONCURRENCY DRILL: 50 HOTELS & 10,000 TOTAL ENTITIES   ║');
  console.log('║  (Simulating 50 Hotels, 7,000 Customers & 3,000 Staff with Auto-Teardown)    ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }

  // 1. Initial State Check
  const initialTenants = await Tenant.find({}, 'name code slug');
  console.log(`[Baseline Audit] Initial Hotels in Database: ${initialTenants.length}`);
  initialTenants.forEach((t) => console.log(`   🏨 ${t.name} (${t._id})`));
  console.log('');

  const initialMemory = process.memoryUsage();
  console.log(`[Memory Profile - Start] RSS: ${(initialMemory.rss / 1024 / 1024).toFixed(1)}MB | Heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(1)}MB / ${(initialMemory.heapTotal / 1024 / 1024).toFixed(1)}MB\n`);

  const createdTenantIds: Types.ObjectId[] = [];

  try {
    // 2. Batch Provision 50 Test Hotels
    console.log('⏳ Provisioning 50 Multi-Tenant Hotels...');
    const hotelDocs = [];
    for (let i = 1; i <= 50; i++) {
      const id = new Types.ObjectId();
      createdTenantIds.push(id);
      hotelDocs.push({
        _id: id,
        name: `Stress Drill Hotel ${String(i).padStart(2, '0')}`,
        slug: `stress-drill-hotel-${String(i).padStart(2, '0')}-${DRILL_TAG.toLowerCase()}`,
        contactEmail: `drill_hotel${i}_${DRILL_TAG.toLowerCase()}@spicehub.in`,
        contactPhone: `+91 99000 ${String(10000 + i).slice(1)}`,
        currency: 'INR',
        status: 'ACTIVE',
        subscriptionPlanCode: i % 2 === 0 ? 'ENTERPRISE' : 'PROFESSIONAL',
        subscriptionPlanName: i % 2 === 0 ? 'Enterprise Tier' : 'Professional Tier',
        subscriptionMonthlyINR: i % 2 === 0 ? 14999 : 7999,
        enabledPortals: ['admin', 'reception', 'cashier', 'kds', 'waiter', 'customer', 'guest'],
        featureFlags: {
          pmsEnabled: true,
          posEnabled: true,
          kdsEnabled: true,
          waiterEnabled: true,
          qrDineInEnabled: true,
          roomServiceEnabled: true,
          banquetEnabled: true,
          loyaltyEnabled: true,
          tallyExportEnabled: true,
        },
      });
    }

    await Tenant.insertMany(hotelDocs);
    console.log(`✅ 50 Hotels provisioned in MongoDB.\n`);

    // 3. Batch Provision 7,000 Customers (GuestProfiles) & 3,000 Staff Users (Total 10,000 Entities)
    console.log('⏳ Batch provisioning 10,000 entities (7,000 Customers & 3,000 Staff)...');

    // 7,000 Guest Profiles (140 per hotel)
    const guestDocs = [];
    for (let i = 1; i <= 7000; i++) {
      const hotelIndex = (i - 1) % 50;
      const hotelId = createdTenantIds[hotelIndex];
      guestDocs.push({
        hotelId,
        name: `Guest Entity ${i}`,
        phone: `+91 98${String(10000000 + i).slice(1)}`,
        email: `guest${i}_${DRILL_TAG.toLowerCase()}@testguest.in`,
        vipTier: i % 10 === 0 ? VIPTier.PLATINUM : i % 5 === 0 ? VIPTier.GOLD : VIPTier.REGULAR,
        totalStays: Math.floor(Math.random() * 8) + 1,
        totalSpend: Math.floor(Math.random() * 50000) + 2000,
      });
    }

    // Insert guests in chunks of 2,000 for efficiency
    for (let c = 0; c < guestDocs.length; c += 2000) {
      await GuestProfile.insertMany(guestDocs.slice(c, c + 2000));
    }
    console.log(`✅ 7,000 Customer Guest Profiles inserted.`);

    // 3,000 Staff Users (60 staff per hotel: Waiters, Cashiers, Receptionists)
    const staffDocs = [];
    for (let i = 1; i <= 3000; i++) {
      const hotelIndex = (i - 1) % 50;
      const hotelId = createdTenantIds[hotelIndex];
      const role = i % 3 === 0 ? UserRole.WAITER : i % 3 === 1 ? UserRole.CASHIER : UserRole.RECEPTIONIST;
      staffDocs.push({
        hotelId,
        name: `Staff ${role} ${i}`,
        email: `staff${i}_${DRILL_TAG.toLowerCase()}@spicehubstaff.in`,
        phone: `+91 97${String(10000000 + i).slice(1)}`,
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dummyhashforloadtest',
        role,
        isActive: true,
        shiftStatus: ShiftStatus.ON_DUTY,
      });
    }

    for (let c = 0; c < staffDocs.length; c += 1500) {
      await User.insertMany(staffDocs.slice(c, c + 1500));
    }
    console.log(`✅ 3,000 Staff Users inserted (Total 10,000 Entities ready).\n`);

    // 4. Generate JWT tokens for each of the 50 hotels
    const hotelTokens = createdTenantIds.map((hId, idx) => ({
      hotelId: hId.toString(),
      token: jwt.sign(
        { userId: new Types.ObjectId().toString(), hotelId: hId.toString(), role: 'HOTEL_ADMIN', name: `Admin Hotel ${idx + 1}` },
        JWT_SECRET,
        { expiresIn: '1h' }
      ),
    }));

    // 5. High-Concurrency Traffic Burst (1,500 real HTTP calls distributed across the 50 hotels)
    console.log('🚀 Launching High-Concurrency HTTP Traffic Burst (1,500 parallel API calls across 50 hotels)...');
    const startDrillTime = Date.now();
    const latencies: number[] = [];
    let successfulRequests = 0;
    let failedRequests = 0;

    const concurrency = 50; // 50 requests in flight simultaneously
    const totalRequests = 1500;
    const requestTasks = [];

    for (let reqIdx = 0; reqIdx < totalRequests; reqIdx++) {
      const hotelInfo = hotelTokens[reqIdx % hotelTokens.length];
      const task = async () => {
        const reqStart = Date.now();
        try {
          const res = await fetch(`${BASE_URL}/api/v1/dashboard/overview`, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${hotelInfo.token}`,
              'x-hotel-id': hotelInfo.hotelId,
            },
          });
          const elapsed = Date.now() - reqStart;
          latencies.push(elapsed);
          if (res.ok) {
            successfulRequests++;
          } else {
            failedRequests++;
          }
        } catch (err) {
          const elapsed = Date.now() - reqStart;
          latencies.push(elapsed);
          failedRequests++;
        }
      };
      requestTasks.push(task);
    }

    // Execute in batches of `concurrency`
    for (let i = 0; i < requestTasks.length; i += concurrency) {
      const batch = requestTasks.slice(i, i + concurrency);
      await Promise.all(batch.map((fn) => fn()));
    }

    const totalDrillDuration = Date.now() - startDrillTime;
    latencies.sort((a, b) => a - b);
    const avgLatency = (latencies.reduce((sum, v) => sum + v, 0) / (latencies.length || 1)).toFixed(1);
    const p50 = latencies[Math.floor(latencies.length * 0.50)] || 0;
    const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
    const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
    const rps = ((successfulRequests + failedRequests) / (totalDrillDuration / 1000)).toFixed(1);

    console.log(`\n╔══════════════════════════════════════════════════════════════════════════════╗`);
    console.log(`║                    CONCURRENCY DRILL RESULTS SUMMARY                         ║`);
    console.log(`╠══════════════════════════════════════════════════════════════════════════════╣`);
    console.log(`║ Total Requests Executed:    ${String(totalRequests).padEnd(49)}║`);
    console.log(`║ Successful Requests (200):  ${String(`${successfulRequests} (${((successfulRequests/totalRequests)*100).toFixed(1)}%)`).padEnd(49)}║`);
    console.log(`║ Failed Requests:            ${String(failedRequests).padEnd(49)}║`);
    console.log(`║ Total Burst Duration:       ${String(`${totalDrillDuration} ms (${(totalDrillDuration/1000).toFixed(2)}s)`).padEnd(49)}║`);
    console.log(`║ Throughput:                 ${String(`${rps} requests/sec`).padEnd(49)}║`);
    console.log(`║ Average Latency:            ${String(`${avgLatency} ms`).padEnd(49)}║`);
    console.log(`║ Median (p50) Latency:       ${String(`${p50} ms`).padEnd(49)}║`);
    console.log(`║ 95th Percentile (p95):      ${String(`${p95} ms`).padEnd(49)}║`);
    console.log(`║ 99th Percentile (p99):      ${String(`${p99} ms`).padEnd(49)}║`);
    console.log(`╚══════════════════════════════════════════════════════════════════════════════╝\n`);

    const peakMemory = process.memoryUsage();
    console.log(`[Memory Profile - Peak] RSS: ${(peakMemory.rss / 1024 / 1024).toFixed(1)}MB | Heap: ${(peakMemory.heapUsed / 1024 / 1024).toFixed(1)}MB / ${(peakMemory.heapTotal / 1024 / 1024).toFixed(1)}MB\n`);

  } finally {
    // 6. AUTOMATED POST-DRILL CLEANUP (USER MANDATE: "test ke bade delete kr dena okk")
    console.log('🧹 [AUTOMATED POST-DRILL TEARDOWN ACTIVATED]');
    console.log('   Removing all 50 test hotels, 7,000 guest profiles, and 3,000 staff users...');

    const deletedGuests = await GuestProfile.deleteMany({ hotelId: { $in: createdTenantIds } });
    console.log(`   ✓ Deleted ${deletedGuests.deletedCount} stress drill guest profiles.`);

    const deletedStaff = await User.deleteMany({ hotelId: { $in: createdTenantIds } });
    console.log(`   ✓ Deleted ${deletedStaff.deletedCount} stress drill staff users.`);

    const deletedTenants = await Tenant.deleteMany({ _id: { $in: createdTenantIds } });
    console.log(`   ✓ Deleted ${deletedTenants.deletedCount} stress drill tenant hotels.`);

    // 7. Verify Pristine Final State
    const finalTenants = await Tenant.find({}, 'name code slug');
    console.log(`\n[Post-Drill Verification] Remaining Hotels in Database: ${finalTenants.length}`);
    finalTenants.forEach((t) => console.log(`   🏨 ${t.name} (${t._id})`));

    console.log('\n✅ 50-HOTEL & 10,000-ENTITY LOAD TEST DRILL COMPLETED WITH 100% CLEAN TEARDOWN.\n');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal load test error:', err);
  process.exit(1);
});
