# SpiceHub Hospitality Platform — Autonomous Agent Handoff & Architecture Playbook

> **Target Audience:** Autonomous AI Agents, Senior Full-Stack Engineers, and Technical Leads  
> **Document Purpose:** Complete, self-contained architectural and operational blueprint explaining how SpiceHub works, how to navigate the codebase, how to run and test it, and how to safely extend or debug any part of the system.

---

## 1. Executive Summary & Domain Overview

**SpiceHub** is an enterprise-grade, multi-tenant hospitality management ecosystem designed for luxury hotels, resorts, fine-dining restaurants, and multi-property chains. It unifies **Property Management System (PMS)**, **Point of Sale (POS)**, **Kitchen Display System (KDS)**, **Guest Digital Concierge**, **Staff Mobile Dispatch**, and **SaaS Multi-Tenant Fleet Management** into a single cohesive platform.

### Core Architectural Pillars
1. **Single Centralized Backend Engine (`:5000`)**: Powered by Node.js, Express, TypeScript, MongoDB 7.0+ (Replica Set `rs0` for multi-document ACID transactions), Redis 7.2+ (caching and pub/sub), and Socket.IO (bidirectional real-time event distribution).
2. **Eight Dedicated Micro-Frontends (`:3001` - `:3008`)**: Built with React 18, Vite, Tailwind CSS, Lucide icons, and shared design tokens.
3. **Native Mobile Shells**: Capacitor Android applications (`spicehub-customer-android` and `spicehub-staff-android`) operating untethered over Wi-Fi with camera QR scanning, encrypted 4-digit PIN authentication, and physical back-button navigation.
4. **Strict Multi-Tenancy**: Every entity, order, booking, folio, and socket room is isolated by `hotelId` (Tenant ID), with portal-level licensing enforced by SuperAdmin.

---

## 2. Network Topology & Port Mapping

| Service / Portal | Port | Workspace / Package | Primary Actors | Key Responsibilities |
| :--- | :--- | :--- | :--- | :--- |
| **Central Backend API** | `:5000` | `backend` | Microservices, System, All Portals | Auth, Multi-tenant routing, Socket.IO rooms, Sentry observability, Winston logging, REST API |
| **Customer Table App** | `:3001` | `@spicehub/customer-table-app` | In-Restaurant Diners | Table QR scan, Pax selector, Veg/Non-Veg catalog, Live cart with 5% GST, Call Waiter, KOT placement |
| **Waiter Mobile App** | `:3002` | `@spicehub/waiter-mobile-app` | Floor Captains, Stewards | 4-Digit PIN login, Assigned table isolation (e.g. T-07 to T-12), Punch KOT, Offline queue auto-sync, Food ready buzzer alert, Serve action |
| **Kitchen KDS App** | `:3003` | `@spicehub/kitchen-kds-app` | Executive Chef, Line Cooks | 3-Column board (Placed -> Cooking -> Ready), SLA timers, 80mm thermal KOT printing, 86-Item stockout toggle, Kitchen buzzer intercom |
| **Guest Room Portal** | `:3004` | `@spicehub/guest-room-portal-app` | Hotel Room Residents | In-Room Dining (charged to Room Folio), Concierge/Housekeeping requests (Towels, Laundry), Live stay overview, Express checkout |
| **Hotel Admin ERP** | `:3005` | `@spicehub/hotel-admin-erp-app` | General Manager, Operations Leads | 19-System PMS Operations Hub, Staff PIN manager, Room status matrix, Menu pricing, Active complaints, Daily Z-Report, RevPAR/ADR KPIs |
| **SuperAdmin SaaS** | `:3006` | `@spicehub/superadmin-saas-app` | SaaS Platform Owner | Multi-hotel onboarding, Inventory auto-provisioning (rooms & tables), Subscription tiers, Portal gating, White-label branding |
| **Cashier Fast POS** | `:3007` | `@spicehub/cashier-pos-app` | Head Cashier, Billing Desk | Table billing, 5% GST computation (2.5% CGST + 2.5% SGST), Multi-tender (Cash/Card/Dynamic UPI QR), Cash clamping & change due, Shift float close |
| **Reception Front Desk** | `:3008` | `@spicehub/reception-frontdesk-app` | Front Desk Agents, Night Auditor | Room Matrix (Clean/Dirty/Occupied/Maintenance), Walk-in Check-In with Aadhaar/Passport KYC, RFID keycard assignment, Folio settlement, Night Audit |

---

## 3. Monorepo Structure & File Layout

```
Hotel-Software/
├── package.json                   # Root monorepo workspace definition (npm workspaces)
├── docker-compose.yml             # MongoDB 7 (rs0) & Redis 7 container orchestration
├── README.md                      # General documentation & quick-start guide
├── PRODUCTION_RUNBOOK.md          # Cloud production runbook, Sentry, Winston, Backup cron
├── HOTEL_STAFF_GUIDE.md           # Operational handbook for floor staff, cashiers, chefs
├── packages/
│   ├── shared-types/              # Core TypeScript interfaces & DTOs (@spicehub/shared-types)
│   ├── ui/                        # Reusable React components (StaffLoginGate, ErrorBoundary, etc.)
│   └── api-client/                # Typed Axios/Fetch HTTP client for portals
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts               # Express app, Socket.IO server, Sentry init, middleware chain
│       ├── config/                # Database connections, Redis, security flags (isDevAuthBypassEnabled)
│       ├── controllers/           # Business logic (pos, billing, pms, frontdesk, auth, superAdmin, etc.)
│       ├── models/                # 70+ Mongoose schemas (Tenant, Order, Stay, Bill, Folio, Room, etc.)
│       ├── routes/                # 45+ Express router files grouped by domain
│       ├── middlewares/           # auth.ts, rateLimiter.ts, errorHandler.ts, tenantEnforcement
│       ├── services/              # RevPAR, Razorpay, OTA channels, loyalty CRM, dynamic pricing
│       └── utils/                 # Winston structured logger, math utilities, receipt formatters
├── apps/
│   ├── customer-table-app/        # Port 3001 (React + Vite)
│   ├── waiter-mobile-app/         # Port 3002 (React + Vite)
│   ├── kitchen-kds-app/           # Port 3003 (React + Vite)
│   ├── guest-room-portal-app/     # Port 3004 (React + Vite)
│   ├── hotel-admin-erp-app/       # Port 3005 (React + Vite)
│   ├── superadmin-saas-app/       # Port 3006 (React + Vite)
│   ├── cashier-pos-app/           # Port 3007 (React + Vite)
│   ├── reception-frontdesk-app/   # Port 3008 (React + Vite)
│   ├── spicehub-customer-android/ # Capacitor native Android shell for customer app
│   └── spicehub-staff-android/    # Capacitor native Android shell for staff terminals
├── scripts/                       # E2E test suites, load test, DB backup, seeding utilities
└── docs/                          # Architectural specifications, operational policies, and guides
```

---

## 4. Database Architecture & Key Data Models

The database uses MongoDB 7.0+ configured as a single-node replica set (`rs0`) to support multi-document ACID transactions.

### Key Data Entities & Relationships
1. **`Tenant` (`backend/src/models/Tenant.ts`)**:
   - Represents a hotel property.
   - Fields: `name`, `slug`, `contactEmail`, `contactPhone`, `plan`, `status` (`ACTIVE`, `TRIAL`, `SUSPENDED`), `portalEntitlements` (array gating module access: `['admin', 'cashier', 'reception', 'kds', 'waiter', 'customer', 'guest']`), `branding` (hex colors, logo).
2. **`User` & `HotelStaff` (`backend/src/models/User.ts`, `backend/src/models/HotelStaff.ts`)**:
   - Staff roles: `SUPERADMIN`, `HOTEL_ADMIN`, `MANAGER`, `WAITER`, `CHEF`, `CASHIER`, `FRONT_DESK`, `HOUSEKEEPING`.
   - Security: Hashed passwords for back-office logins, encrypted **4-digit PINs** for fast frontline touchscreen terminals.
3. **`DiningTable` & `RestaurantOrder` (`backend/src/models/DiningTable.ts`, `backend/src/models/RestaurantOrder.ts`)**:
   - `DiningTable`: `tableNumber`, `capacity`, `section` (Indoor AC, Lawn, Rooftop), `status` (`AVAILABLE`, `OCCUPIED`, `BILLING`, `RESERVED`).
   - `RestaurantOrder`: `orderNumber` (KOT), `tableNumber`, `guestCount`, `source` (`TABLE_QR`, `WAITER_POS`, `IN_ROOM_DINING`), `items` (`name`, `quantity`, `price`, `cookingInstructions`), `status` (`PLACED`, `PREPARING`, `READY`, `SERVED`, `BILLED`, `CANCELLED`).
4. **`RestaurantBill` & `MultiTenderSettlement` (`backend/src/models/RestaurantBill.ts`, `backend/src/models/MultiTenderSettlement.ts`)**:
   - Computes Subtotal + 2.5% CGST + 2.5% SGST = Total with 5% GST.
   - Payment modes: `CASH`, `UPI_DYNAMIC`, `CARD`, `POST_TO_ROOM` (folio).
   - Generates immutable 80mm thermal receipt payload and frees table back to `AVAILABLE`.
5. **`Room`, `RoomType`, `Stay` & `MasterFolio` (`backend/src/models/Room.ts`, `backend/src/models/Stay.ts`, `backend/src/models/MasterFolio.ts`)**:
   - `Room`: `roomNumber`, `floor`, `roomTypeId`, `status` (`CLEAN`, `DIRTY`, `INSPECTED`, `OCCUPIED`, `OUT_OF_SERVICE`).
   - `Stay`: Guest identity (Name, Phone, Email, ID proof type: Aadhaar/Passport, ID number, verification flag), check-in/out timestamps, keycard code.
   - `MasterFolio`: Consolidates room tariffs, In-Room dining orders, mini-bar, laundry, and advance deposits into an ACID ledger with tax invoice generation.
6. **`HousekeepingTask` & `MaintenanceRequest` (`backend/src/models/HousekeepingTask.ts`, `backend/src/models/MaintenanceRequest.ts`)**:
   - Manages room turnaround cycle (`DIRTY` -> `IN_PROGRESS` -> `INSPECTED` -> `CLEAN`) with a 10-point luxury sanitization checklist and engineering work orders.

---

## 5. End-to-End Operational Lifecycles & State Machines

### 5.1 The Table Dine-In / KOT Workflow
```
[Customer Scans Table QR (:3001)] 
       │ 
       ▼ 
[Selects Items & Special Instructions] ──▶ (Optional: Taps "Call Waiter" ──▶ Waiter Mobile Popup)
       │
       ▼
[Places Order / Generates KOT] ──(Socket.IO)──▶ [Kitchen KDS Display (:3003)]
                                                        │
                                                        ▼
                                             [Chef Sets: PREPARING]
                                                        │
                                                        ▼
                                             [Chef Sets: READY] ──▶ (Audio Buzzer Dispatched)
                                                        │
                                                        ▼
                                             [Waiter Mobile (:3002): Pick Up & Mark SERVED]
                                                        │
                                                        ▼
                                             [Cashier POS (:3007): Generate Bill with 5% GST]
                                                        │
                                                        ▼
                                             [Multi-Tender Settlement: Cash / Dynamic UPI QR]
                                                        │
                                                        ▼
                                             [Thermal Receipt Printed & Table Freed to Khali]
```

### 5.2 In-Room Dining & Master Folio Posting
1. Resident guest in Room 101 opens `:3004`.
2. Selects culinary items and adds delivery notes.
3. Order is submitted with billing option `Charge to Room Master Folio`.
4. Backend atomically appends a debit line item to `MasterFolio` for Room 101.
5. Ticket appears on Kitchen KDS with an prominent `ROOM 101` badge and high priority.
6. When plated, steward delivers the order and marks it `SERVED`.

### 5.3 Front Desk Walk-In Check-In & Departure Pipeline
1. Reception agent at `:3008` inspects visual 24/48-room floor matrix.
2. Selects an available room (e.g. Room 102).
3. Enters guest metadata + Govt ID Proof (Aadhaar or Passport).
4. Receptionist approves KYC verification, collects advance deposit, and issues digital/RFID keycard.
5. Room status transitions immediately to `OCCUPIED`.
6. On departure, guest or receptionist triggers **Express Checkout**:
   - System aggregates room tariff + restaurant charges + incidentals - advance deposit.
   - Balance is cleared via UPI/Card/Cash.
   - Keycard is revoked.
   - Room status automatically transitions to `DIRTY` (Housekeeping queue).

### 5.4 Housekeeping Turnaround & Room Release Pipeline
1. Room marked `DIRTY` appears on the Housekeeping Queue in Admin ERP (`:3005`) and Frontdesk (`:3008`).
2. Attendant (e.g. Anita Roy) is assigned.
3. Attendant submits the **10-Point Sanitization Checklist**:
   - Bed linen changed, pillows fluffed, bathroom sanitized, mini-bar restocked, toiletries refilled, carpet vacuumed, windows wiped, AC calibrated, electronics tested, room freshener applied.
4. Housekeeping supervisor reviews score and clicks **Approve & Release Room**.
5. Room status updates to `CLEAN & INSPECTED`, becoming instantly available for new walk-in arrivals.

### 5.5 Cross-App Realtime Alert Bridges
- **Call Waiter**: Customer taps "Call Waiter" -> Waiter Mobile receives instant sound + vibration + banner popup with Table #.
- **Room Butler Assistance**: In-room guest requests towels/cutlery -> Waiter Mobile receives room service popup alert.
- **Waiter Kitchen Intercom**: Waiter taps "Call Kitchen" with priority (`NORMAL`, `URGENT`, `VIP`) -> KDS flashes audio buzzer alert.
- **86 Item Stockout**: Kitchen marks item out of stock -> Customer Table App, Waiter App, and Room Service Menu dynamically grey out the dish in real-time.
- **Customer Food Complaint**: Guest logs 2★ review -> Hotel Admin Operations Hub triggers immediate Service Recovery alert for the Duty Manager.

---

## 6. How to Start, Run, and Develop This Project

### 6.1 Prerequisites
- **Node.js**: v20 or v22 LTS
- **Docker & Docker Compose**: For MongoDB (Replica Set `rs0`) and Redis
- **Host Memory Recommendation**: At least 8 GB RAM (see resource constraints below)

### 6.2 Initial Boot Sequence
```bash
# 1. Start MongoDB and Redis containers
npm run docker:up

# 2. Seed database with demonstration hotels, menu items, rooms, and staff
npm run seed

# 3. Start Central Backend Engine (Port 5000)
npm run dev:backend
```

Verify backend health:
```bash
curl -s http://localhost:5000/health
# Expected: {"status":"HEALTHY","service":"SpiceHub Central Backend Engine","database":"CONNECTED","multiTenancy":"ENFORCED"}
```

---

### 6.3 CRITICAL SYSTEM RESOURCE WARNING: Portals & Memory Management

> [!CAUTION]
> **Host Memory Limit & Out-Of-Memory (OOM Code 137) Prevention**
> - The monorepo has 8 individual Vite applications.
> - Running all 8 Vite dev servers simultaneously (`npm run dev:customer`, `npm run dev:waiter`, etc.) consumes **over 3.2 GB RAM**. On a developer system with 7–8 GB total RAM, running 8 concurrent Vite dev servers alongside Node backend, MongoDB, and Docker WILL trigger Linux OOM Killer (process terminated with code 137).
> 
> **Safe Operational Patterns:**
> 1. **Single Portal Development Mode**: Run only the backend and the specific portal you are working on:
>    ```bash
>    npm run dev:admin       # If modifying Hotel Admin (:3005)
>    npm run dev:cashier     # If modifying Cashier POS (:3007)
>    ```
> 2. **Full System Production Serving Mode**: Pre-compile all 8 apps (`npm run build:all`) and serve via a lightweight single-process gateway. This serves all 8 static apps on ports 3001–3008 with reverse API proxying to port 5000 using **less than 50 MB total RAM**.

---

## 7. Authentication, Credentials & Gating Defaults

| Role / User | Login URL | Default Username / Email | Default Password / PIN |
| :--- | :--- | :--- | :--- |
| **SuperAdmin** | `http://localhost:3006` | `superadmin@spicehub.com` | `SpiceHub@123` |
| **Hotel Admin** | `http://localhost:3005` | `admin@theamberheritage.com` | `SpiceHub@123` or PIN `1111` / `1234` |
| **Head Cashier** | `http://localhost:3007` | Sunil Verma | PIN `2222` or `1234` |
| **Floor Waiter** | `http://localhost:3002` | Ramesh Sharma | PIN `3333` or `1234` |
| **Executive Chef** | `http://localhost:3003` | Chef Ranveer Brar | Direct Station / PIN `1234` |
| **Front Desk** | `http://localhost:3008` | Priya Singh | Frontdesk Terminal Token / PIN `1234` |

### Dual Authentication Strategy
- **Strict JWT**: Enforced in production cloud deployments (`authenticateJWT, requireTenant`).
- **Terminal Kiosk Auth (`authenticateFrontDeskTerminal`)**: Used on shared touchscreens (Front Desk, Cashier, Waiter, KDS). Allows seamless operation using terminal session cookies/headers (`x-hotel-id`) with fallbacks during local development.

---

## 8. Verification Scripts & Testing Toolkit

SpiceHub comes equipped with automated audit scripts in the `scripts/` directory:

1. **Monorepo Health Gate**:
   ```bash
   npm run integrity:check
   # Verifies tsconfig references, shared-types exports, and package boundaries.
   ```
2. **Stress & High Concurrency Benchmark**:
   ```bash
   npm run test:load
   # Simulates 100 concurrent diners placing orders over 60 seconds (benchmark: 275+ req/sec, 0% error rate).
   ```
3. **Continuous Hospitality Drill**:
   ```bash
   npm run test:e2e:hospitality
   # Comprehensive end-to-end multi-shift operational audit script.
   ```
4. **Automated Database Backup**:
   ```bash
   ./scripts/backup_db.sh
   # Dumps MongoDB database with gzip compression into /var/backups/spicehub.
   ```

---

## 9. Crucial Rules & Quirks for Another Agent

1. **Never Break `@spicehub/shared-types`**:
   - The package `packages/shared-types/package.json` must always specify `"main": "src/index.ts"` and `"types": "src/index.ts"`.
   - Complex nested build targets (`dist/esm`) will break Vite's fast HMR and lead to infinite reload loops.
2. **Always Pass Multi-Tenant Context**:
   - Any manual HTTP call made to the backend must include the hotel identifier in either the headers (`x-hotel-id: <id>`), query string (`?hotelId=<id>`), or request body (`{ hotelId: "<id>" }`).
3. **Preserve Existing Comments & Docstrings**:
   - When modifying controllers, components, or models, maintain all existing comments, docstrings, and type annotations.
4. **Do Not Propose `cd` Commands**:
   - Use the `Cwd` parameter on tool executions rather than issuing bash `cd` commands.
5. **Use `file:///` Markdown Links**:
   - Whenever referring to files or line numbers in responses, always format them as GitHub-style file URI links (e.g. `[filename](file:///absolute/path/to/file)`).
