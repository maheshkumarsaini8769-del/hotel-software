import jwt from 'jsonwebtoken';

const BASE_URL = 'http://localhost:5000';
const JWT_SECRET = 'spicehub_super_secret_jwt_key_2026_production_ready_9921';

const TENANT_A_ID = '6ac527f18c9b8c77c8537664';

const adminTokenA = jwt.sign(
  { userId: '6ac527f18c9b8c77c8537661', hotelId: TENANT_A_ID, role: 'HOTEL_ADMIN' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const waiterTokenA = jwt.sign(
  { userId: '6ac527f18c9b8c77c8537662', hotelId: TENANT_A_ID, role: 'WAITER' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

async function request(endpoint: string, options: any = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, options);
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, ok: res.ok, body: json };
}

interface TestResult {
  gateCategory: string;
  name: string;
  passed: boolean;
  status: number;
  details?: string;
}

async function runLiveApiDeepTests() {
  console.log('🚀 ========================================================');
  console.log('    SPICEHUB LIVE BACKEND & FRONTEND DEEP E2E TEST SUITE   ');
  console.log('========================================================\n');

  const results: TestResult[] = [];

  const record = (gateCategory: string, name: string, passed: boolean, status: number, details?: string) => {
    results.push({ gateCategory, name, passed, status, details });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`[${mark}] [${gateCategory}] ${name} (HTTP ${status}) ${details ? '-> ' + details : ''}`);
  };

  // --- 1. CORE HEALTH & TENANT ISOLATION (GATES 1-10) ---
  {
    const res = await request('/health');
    record('Gates 1-10', 'System Health Check', res.status === 200 && res.body?.status === 'HEALTHY', res.status);
  }

  {
    const res = await request('/api/v1/tenant/verify-isolation', {
      headers: { Authorization: `Bearer ${adminTokenA}` },
    });
    record('Gates 1-10', 'Tenant Isolation Verification', res.status === 200 && res.body?.hotelId === TENANT_A_ID, res.status);
  }

  // --- 2. POS TABLES & KDS DISPATCH (GATES 11-20) ---
  {
    const res = await request('/api/v1/pos/tables', {
      headers: { Authorization: `Bearer ${waiterTokenA}` },
    });
    record('Gates 11-20', 'POS Tables Query', res.status === 200, res.status);
  }

  {
    const res = await request(`/api/v1/pos/kds/orders?hotelId=${TENANT_A_ID}`, {
      headers: { Authorization: `Bearer ${adminTokenA}` },
    });
    record('Gates 11-20', 'Kitchen KDS Live Order Queue', res.status === 200, res.status);
  }

  // --- 3. REVENUE MANAGER & PRICING RULES (GATES 21-30) ---
  {
    const res = await request('/api/v1/revenue-manager/strategies', {
      headers: { Authorization: `Bearer ${adminTokenA}` },
    });
    record('Gates 21-30', 'Revenue Manager Dynamic Pricing Strategies API', res.status === 200, res.status);
  }

  // --- 4. WAITER ZONES & FLOOR MATRIX (GATES 31-40) ---
  {
    const res = await request(`/api/v1/waiter-zones/active?hotelId=${TENANT_A_ID}`, {
      headers: { Authorization: `Bearer ${adminTokenA}` },
    });
    record('Gates 31-40', 'Waiter Zones Configuration API', res.status === 200, res.status);
  }

  {
    const res = await request(`/api/v1/floor-matrix/overview?hotelId=${TENANT_A_ID}`, {
      headers: { Authorization: `Bearer ${adminTokenA}` },
    });
    record('Gates 31-40', 'Floor Duty Matrix API', res.status === 200, res.status);
  }

  // --- 5. CASH FLOAT & FAST CASHIER (GATES 41-50) ---
  {
    const res = await request('/api/v1/waiter-cash-float/active', {
      headers: { Authorization: `Bearer ${adminTokenA}` },
    });
    record('Gates 41-50', 'Waiter Cash Float Active Query API', res.status === 200, res.status);
  }

  // --- 6. PMS EXPECTED ARRIVALS & NIGHT AUDIT (GATES 51-60) ---
  {
    const res = await request('/api/v1/night-audit/pre-audit-status', {
      headers: { Authorization: `Bearer ${adminTokenA}` },
    });
    record('Gates 51-60', 'Night Audit Pre-Audit Status API', res.status === 200, res.status);
  }

  {
    const res = await request('/api/v1/pms/frontdesk/expected-arrivals', {
      headers: { Authorization: `Bearer ${adminTokenA}` },
    });
    record('Gates 51-60', 'PMS Expected Arrivals Queue API', res.status === 200, res.status);
  }

  // --- 7. HARDENED RECENT GATES (GATES 61-70) ---
  {
    const res = await request('/api/v1/pms/frontdesk/maintenance/tickets', {
      headers: { Authorization: `Bearer ${adminTokenA}` },
    });
    record('Gates 61-70', 'Room Maintenance OOS/OOO Tickets (Gate 63)', res.status === 200, res.status);
  }

  {
    const res = await request('/api/v1/housekeeping/lost-and-found/vault', {
      headers: { Authorization: `Bearer ${adminTokenA}` },
    });
    record('Gates 61-70', 'Lost & Found Digital Vault (Gate 66)', res.status === 200, res.status);
  }

  {
    const res = await request('/api/v1/pms/frontdesk/cashier/shift/active', {
      headers: { Authorization: `Bearer ${adminTokenA}` },
    });
    record('Gates 61-70', 'Cashier Shift Drawer Active State (Gate 68)', res.status === 200, res.status);
  }

  {
    const res = await request('/api/v1/pms/frontdesk/cashier/shift/history', {
      headers: { Authorization: `Bearer ${adminTokenA}` },
    });
    record('Gates 61-70', 'Cashier Shift Audit History (Gate 68)', res.status === 200, res.status);
  }

  {
    const res = await request('/api/v1/pms/frontdesk/sdb/boxes', {
      headers: { Authorization: `Bearer ${adminTokenA}` },
    });
    record('Gates 61-70', 'Safe Deposit Box (SDB) Locker Vault (Gate 69)', res.status === 200 && res.body?.success, res.status);
  }

  {
    const res = await request('/api/v1/pms/frontdesk/luggage/claims', {
      headers: { Authorization: `Bearer ${adminTokenA}` },
    });
    record('Gates 61-70', 'Left Luggage Cloakroom Claims (Gate 70)', res.status === 200 && res.body?.success, res.status);
  }

  // --- 8. FRONTEND WEB CLIENTS (6 APPS) ---
  const frontendApps = [
    { name: 'Customer Table App', port: 3001 },
    { name: 'Waiter Mobile App', port: 3002 },
    { name: 'Kitchen KDS App', port: 3003 },
    { name: 'Guest Room Portal App', port: 3004 },
    { name: 'Hotel Admin ERP App', port: 3005 },
    { name: 'Superadmin SaaS App', port: 3006 },
  ];

  console.log('\n🌐 Checking All 6 Frontend Web Portals...');
  for (const app of frontendApps) {
    try {
      const res = await fetch(`http://localhost:${app.port}`);
      const text = await res.text();
      const isOk = res.status === 200 && text.includes('<!DOCTYPE html>');
      record('Frontend Apps', `${app.name} (:${app.port})`, isOk, res.status, isOk ? 'HTML Document Served Cleanly' : 'Invalid Response');
    } catch (err: any) {
      record('Frontend Apps', `${app.name} (:${app.port})`, false, 0, err.message);
    }
  }

  console.log('\n========================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;
  console.log(`TOTAL LIVE CHECKS: ${total}`);
  console.log(`PASSED:            ${passed}`);
  console.log(`FAILED:            ${failed}`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runLiveApiDeepTests().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
