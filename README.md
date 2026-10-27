# SpiceHub — Enterprise Hospitality ERP Monorepo

Multi-tenant hotel PMS + fine-dining restaurant POS platform built with Node.js/Express, MongoDB, Socket.IO, eight React micro-frontends, and native Android mobile apps (Customer & Staff).

---

## 🌐 Network Endpoints & Ports

| Service / App | Port | Command | Description |
| :--- | :--- | :--- | :--- |
| **Backend API + Socket.IO** | `5000` | `npm run dev:backend` | Multi-tenant core, DB models & event engine |
| **Customer QR Table App** | `3001` | `npm run dev:customer` | Standee QR ordering, Pax selector, live bill |
| **Waiter Mobile Workstation** | `3002` | `npm run dev:waiter` | Steward POS, KDS pickup alerts, table service |
| **Kitchen KDS Display** | `3003` | `npm run dev:kds` | Chef prep tickets, course timers, pickup buzzer |
| **Guest Room Portal** | `3004` | `npm run dev:guest` | Resident stay services, In-Room dining, folio |
| **Hotel Admin ERP** | `3005` | `npm run dev:admin` | PMS matrix, staff accounts, restaurant ops |
| **SuperAdmin SaaS** | `3006` | `npm run dev:superadmin` | Multi-tenant hotel onboarding, portal gating |
| **Cashier POS Terminal** | `3007` | `npm run dev:cashier` | Fast numpad, split billing, cash settlement |
| **Reception Front Desk** | `3008` | `npm run dev:reception` | KYC verification, check-in approval, keycards |

---

## 📱 Mobile APKs (Standalone Over Wi-Fi)

Both mobile applications operate **100% untethered over local Wi-Fi / hotspot** without requiring USB cables or `adb reverse`:

- **Customer App (`com.spicehub.customer`):** Guest room booking, Aadhaar/Passport KYC upload, hotel radius check, and Table QR standee scanner.
- **Staff Workstation App (`com.spicehub.staff`):** Dynamic hotel switcher, role-based staff picker, encrypted 4-digit PIN authentication, and embedded workstation iframes with hardware back-button navigation.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js 20+ (Node 22 recommended)
- Docker & Docker Compose (for MongoDB replica set + Redis)
- Android SDK & ADB (optional, for mobile APK builds)

### 2. First Run & Development Boot
```bash
# 1. Install dependencies
npm install

# 2. Boot MongoDB replica set & Redis
npm run docker:up

# 3. Seed demonstration hotels, staff, menu items, rooms, and tables
npm run seed

# 4. Start Central Backend
npm run dev:backend

# 5. Start Portals (open in separate terminals as needed)
npm run dev:customer     # Port 3001
npm run dev:waiter       # Port 3002
npm run dev:kds          # Port 3003
npm run dev:guest        # Port 3004
npm run dev:admin        # Port 3005
npm run dev:superadmin   # Port 3006
npm run dev:cashier      # Port 3007
npm run dev:reception    # Port 3008
```

Health check verification:
```bash
curl http://localhost:5000/health
```

---

## 📖 Operational User Guides

### A. Super Admin: How to Create a Hotel & Gate Portals
1. Open the Super Admin SaaS portal at `http://localhost:3006`.
2. Login with Master credentials:
   - **Email:** `superadmin@spicehub.com`
   - **Password:** `SpiceHub@123`
3. Click **"+ Onboard New Hotel"** in the top action bar.
4. Fill in hotel metadata: Property Name, City, Coordinates (Latitude/Longitude), Total Rooms, and Default Currency.
5. In the **Portal Entitlements** selector, choose which modules this hotel is allowed to use (`admin`, `cashier`, `reception`, `kds`, `waiter`, `customer`, `guest`).
   - *Note:* If a portal (e.g. `waiter`) is unticked, the Hotel Admin will be strictly restricted from creating staff accounts for that role.
6. Click **Save & Provision**. The tenant will appear in directory cards and become available across all apps.

### B. Hotel Admin: Staff Provisioning & 4-Digit PIN Setup
1. Open Hotel Admin ERP at `http://localhost:3005`.
2. Login with Hotel Administrator credentials:
   - **Email:** `admin@theamberheritage.com` (or your hotel admin email)
   - **Password:** `SpiceHub@123`
3. Navigate to **Staff & Access Management**.
4. Click **"+ Add Staff Member"**.
5. Fill in Full Name, Phone, Email, Department, and Select Role (`WAITER`, `CHEF`, `CASHIER`, `FRONT_DESK`, `HOUSEKEEPING`).
6. Set an encrypted **4-digit PIN** for fast terminal access.
7. Click **Create Staff Account**. The staff member will immediately be selectable in the Mobile Staff App.

### C. Mobile Staff Login & Workstation Navigation
1. Open the **SpiceHub Staff App** on Android.
2. Select your Hotel from the dynamic hotel directory.
3. Select the Workstation portal (e.g., Waiter Terminal or Kitchen KDS).
4. Tap your Profile / Name from the staff picker grid.
5. Enter your **4-Digit Security PIN** to unlock the workstation.
6. **Physical Back Button Behavior:** Pressing the device back button navigates backwards hierarchically (`Workstation -> Person Picker -> Portal Selector -> Hotel Picker -> Exit App`) without terminating the session unexpectedly.

### D. Guest Journey: Booking, Dining & Checkout
1. **Browse & Book:** Guest opens the Customer App, selects hotel, and browses real-time available rooms.
2. **KYC & Front Desk:** Guest submits booking with Aadhaar/Passport document. Request enters `PENDING_APPROVAL` status.
3. **Approval & Keycard:** Reception officer at Port 3008 reviews ID and clicks **Approve Check-In**. A digital keycard code (e.g. `4928`) and guest Wi-Fi credentials are automatically generated.
4. **In-Room Dining:** Resident guest opens the room portal (`:3004`), browses the kitchen menu, and places an order.
5. **Kitchen & Waiter:** Order appears on KDS (`:3003`) as `PREPARING`, chef marks it `READY` (buzzer triggers), and steward marks it `SERVED` at the room door.
6. **Folio Settle & Checkout:** Guest views charges on their folio, settles balance via UPI/Card, and completes Express Checkout.

---

## 🛡️ Security Architecture & Production Guardrails

- **Triple-Locked QR Verification:** Table QR access strictly requires a valid SHA256 hashed security token. The developer bypass is locked behind `(process.env.NODE_ENV !== 'production' && isDevAuthBypassEnabled())`.
- **Production Boot Assertion:** `assertProductionSecurityConfig()` automatically crashes the application on boot if `DEV_AUTH_BYPASS=true` is present in a production environment.
- **Tenant Isolation:** Every database query, socket channel, and cache key enforces tenant isolation via `hotelId` indexing.
- **Geofence Proximity Verification:** In-Room dining and Dine-In orders verify on-premises physical presence to prevent fraudulent remote orders.

---

## 🧪 Comprehensive Continuous Testing

To run the master automated end-to-end hospitality drill covering all 27 stages:

```bash
npm run test:e2e:hospitality
```

For individual test suites:
```bash
npm run test:backend     # 89 Jest test suites in backend
npm run typecheck:backend # Strict TypeScript validation
npm run build:all        # Production build verification across all workspaces
```
