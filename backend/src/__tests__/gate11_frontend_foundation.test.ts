import mongoose from 'mongoose';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { UserRole, RoomStatus, FoodType } from '../../../packages/shared-types/src/index';
import { SpiceHubClient, ApiClientError } from '../../../packages/api-client/src/index';
import {
  formatCurrency,
  TableStatusColorMap,
  RoomStatusColorMap,
  FoodTypeBadge,
  StatCardCalculator,
  KitchenKdsChimePattern,
  WaiterAlertChimePattern,
} from '../../../packages/ui/src/index';

describe('--- SHIFT 11 / GATE 11: FRONTEND FOUNDATION, API CLIENT & SHARED UI UTILITIES ---', () => {
  let tenantId: string;
  let client: SpiceHubClient;
  let testServerUrl: string;
  let tableId: string;
  const userPassword = 'TestPassword123!';
  const userEmail = `client_test_${Date.now()}@spicehub.com`;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const port = 5091;
    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        testServerUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    // 1. Setup Tenant
    const tenant = await Tenant.create({
      name: 'SpiceHub Grand Foundation Hotel',
      slug: `foundation-${Date.now()}`,
      contactEmail: `foundation_${Date.now()}@spicehub.com`,
      contactPhone: '9888877799',
      status: 'ACTIVE',
    });
    tenantId = tenant._id.toString();

    // 2. Setup User
    const argon2 = require('argon2');
    const hash = await argon2.hash(userPassword);
    await User.create({
      hotelId: tenant._id,
      name: 'Client Test Admin',
      email: userEmail,
      phone: '9888877798',
      passwordHash: hash,
      role: UserRole.HOTEL_ADMIN,
      isActive: true,
    });

    // 3. Setup Dining Table
    const table = await DiningTable.create({
      hotelId: tenant._id,
      tableNumber: 'T-10',
      section: 'MAIN_HALL',
      capacity: 4,
      currentStatus: TableStatus.AVAILABLE,
    });
    tableId = table._id.toString();

    // Initialize SpiceHubClient pointing to test server
    client = new SpiceHubClient({
      baseUrl: testServerUrl,
      hotelId: tenantId,
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await Tenant.deleteMany({ _id: tenantId });
    await User.deleteMany({ hotelId: tenantId });
    await DiningTable.deleteMany({ hotelId: tenantId });
    await mongoose.connection.close();
  });

  // TEST 1: SpiceHubClient Configuration & Token Storage
  test('1. SpiceHubClient correctly initializes, sets, gets, and clears Auth Token and Hotel ID', () => {
    expect(client.getHotelId()).toBe(tenantId);
    expect(client.getAuthToken()).toBeNull();

    client.setAuthToken('mock_sample_jwt_token_123');
    expect(client.getAuthToken()).toBe('mock_sample_jwt_token_123');

    client.clearAuthToken();
    expect(client.getAuthToken()).toBeNull();
  });

  // TEST 2: SpiceHubClient Login & Live JWT Injection on Subsequent Requests
  test('2. Client logs in via auth.login, acquires real JWT, and passes authenticated calls with Authorization Bearer header', async () => {
    // 2a. Successful Login
    const loginRes = await client.auth.login({
      email: userEmail,
      password: userPassword,
      hotelId: tenantId,
    });

    expect(loginRes.success).toBe(true);
    expect(loginRes.data.token).toBeDefined();

    // Inject token into client
    client.setAuthToken(loginRes.data.token);
    expect(client.getAuthToken()).toBe(loginRes.data.token);

    // 2b. Make authenticated request via client
    const verifyRes = await client.auth.verifyIsolation();
    expect(verifyRes.success).toBe(true);
    expect(verifyRes.hotelId).toBe(tenantId);
    expect(verifyRes.tenantVerified).toBe(true);
  });

  // TEST 3: SpiceHubClient Query Parameter Formatting & Domain Route Calling
  test('3. Client correctly formats URL query parameters and calls POS table QR entry endpoint', async () => {
    const tableRes = await client.pos.getTableByQr(tenantId, tableId);
    expect(tableRes.success).toBe(true);
    expect(tableRes.data.tableNumber).toBe('T-10');
    expect(tableRes.data.status).toBe('ACTIVE');
  });

  // TEST 4: SpiceHubClient Error Handling & ApiClientError Parsing
  test('4. Client properly parses server error responses and throws structured ApiClientError', async () => {
    try {
      await client.auth.login({
        email: userEmail,
        password: 'WrongPassword999',
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiClientError);
      expect(err.status).toBe(401);
      expect(err.errorCode).toBe('INVALID_CREDENTIALS');
      expect(err.message).toBeDefined();
    }
  });

  // TEST 5: UI Utility - formatCurrency (INR & USD)
  test('5. UI Utility: formatCurrency correctly formats numbers into INR and international currency strings', () => {
    const inrResult = formatCurrency(25000, 'INR');
    expect(inrResult).toContain('25,000');

    const usdResult = formatCurrency(150, 'USD');
    expect(usdResult).toContain('150');
  });

  // TEST 6: UI Utility - Table & Room Status Visual Color Mappings
  test('6. UI Utility: Color maps cover all statuses with valid Tailwind CSS class names', () => {
    // Table Status Color Map
    for (const status of Object.values(TableStatus)) {
      const colorToken = TableStatusColorMap[status];
      expect(colorToken).toBeDefined();
      expect(colorToken.bg).toContain('bg-');
      expect(colorToken.text).toContain('text-');
      expect(colorToken.label).toBeDefined();
    }

    // Room Status Color Map
    for (const status of Object.values(RoomStatus)) {
      const colorToken = RoomStatusColorMap[status as RoomStatus];
      expect(colorToken).toBeDefined();
      expect(colorToken.bg).toContain('bg-');
      expect(colorToken.text).toContain('text-');
    }

    // Food Type Badges
    for (const type of Object.values(FoodType)) {
      const badge = FoodTypeBadge[type as FoodType];
      expect(badge).toBeDefined();
      expect(badge.icon).toBeDefined();
    }
  });

  // TEST 7: UI Utility - StatCard Growth Percentage Calculator
  test('7. UI Utility: StatCardCalculator accurately calculates positive, negative, and zero percentage trends', () => {
    // Positive growth: 120 vs 100 -> +20%
    const pos = StatCardCalculator.calculateGrowth(120, 100);
    expect(pos.percentage).toBe(20);
    expect(pos.isPositive).toBe(true);

    // Negative drop: 75 vs 100 -> -25%
    const neg = StatCardCalculator.calculateGrowth(75, 100);
    expect(neg.percentage).toBe(25);
    expect(neg.isPositive).toBe(false);

    // Initial baseline: 50 vs 0 -> +100%
    const init = StatCardCalculator.calculateGrowth(50, 0);
    expect(init.percentage).toBe(100);
    expect(init.isPositive).toBe(true);
  });

  // TEST 8: UI Utility - Audio Chime Synthesizer Tone Patterns
  test('8. UI Utility: Kitchen KDS and Waiter audio patterns contain valid musical frequencies and durations', () => {
    expect(KitchenKdsChimePattern.length).toBeGreaterThan(0);
    KitchenKdsChimePattern.forEach((tone) => {
      expect(tone.frequency).toBeGreaterThan(100);
      expect(tone.durationMs).toBeGreaterThan(0);
    });

    expect(WaiterAlertChimePattern.length).toBeGreaterThan(0);
    WaiterAlertChimePattern.forEach((tone) => {
      expect(tone.frequency).toBeGreaterThan(100);
      expect(tone.durationMs).toBeGreaterThan(0);
    });
  });
});
