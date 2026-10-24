# 🚀 SPICEHUB: ALL 6 WEBSITES COMPLETE LIVE API, WORKFLOWS & INTER-PORTAL ENGINE BLUEPRINT
**Master 16-Shift Granular Execution Plan (Shift 73 to Shift 88): Connecting All Features, APIs, Sockets & Database**

---

## 📌 Executive Status & Shift Audit
- **Last Officially Completed & Committed Shift:** **Shift #72** (`Front Desk Lost & Found Vault Workstation & Digital Custody Chain` - Commit `eaf3efc`).
- **Recent Completed Phase:** All 6 Applications Visual Overhaul & Responsive Polish (Customer `:3001`, Waiter `:3002`, KDS `:3003`, Guest Portal `:3004`, Admin/Cashier/Rooms `:3005`, SuperAdmin `:3006`).
- **Next Target (Shift 73 to Shift 88):** To eliminate any risk of large monolithic breaks, the end-to-end API wiring and cross-portal workflow synchronization is broken down into **16 safe, isolated, bite-sized shifts**.

---

## 🔄 The 5 Master Inter-Website Workflow Loops

```
========================================================================================================
LOOP 1: RESTAURANT DINE-IN ORDER-TO-KITCHEN-TO-BILLING LOOP
[Customer Table (:3001)] ──► POST /api/v1/pos/order ──► [Backend Engine (:5000)]
                                                              │
                                  ┌───────────────────────────┴───────────────────────────┐
                                  ▼                                                       ▼
                      [Kitchen KDS (:3003)]                                   [Waiter Mobile (:3002)]
                      • Live KOT Chime & Ticket                               • Table Status: "Order Placed"
                      • Chef Taps "Start Preparing"                           • 60s Pickup SLA Timer
                      • Chef Taps "Mark Ready" ─────────────────────────────► • Haptic Vibration / Sound
                                                                              • Waiter Taps "Mark Served"
                                                                                          │
                                                                                          ▼
                                                                              [Cashier POS (:3005/cashier)]
                                                                              • Bill Settle (Cash/UPI/Card)
                                                                              • Table Clean & Reset

========================================================================================================
LOOP 2: IN-ROOM GUEST DINING & SERVICE LOOP
[Guest Portal (:3004)] ──► POST /api/v1/pms/frontdesk/inroom-order ──► [Backend Engine (:5000)]
                                                                            │
                                  ┌─────────────────────────────────────────┴───────────────────────────┐
                                  ▼                                                                     ▼
                      [Kitchen KDS (:3003)]                                                 [Admin PMS (:3005)]
                      • Ticket: "[ROOM 305 - IN-ROOM DINING]"                               • Auto-posts to Master Folio
                      • Chef Prepares & Marks Ready                                           (Room Charges + F&B + GST)
                                  │                                                         • Live Folio Updates
                                  ▼                                                                     │
                      [Waiter / In-Room Butler (:3002)]                                                 ▼
                      • Trolley delivery dispatched to Room 305                             [Guest Portal (:3004)]
                      • Delivered & Confirmed                                               • Order Stepper: "Delivered"
                                                                                            • Live Folio reflects ₹9,019

========================================================================================================
LOOP 3: CONCIERGE, HOUSEKEEPING & MAINTENANCE LOOP
[Guest Portal (:3004)] ──► POST /api/v1/pms/frontdesk/concierge-request ──► [Backend Engine (:5000)]
(Water / Towel / Cleaning / AC)                                                     │
                                                                                    ▼
                                                                  [Reception / Rooms (:3005/reception)]
                                                                  • Incoming Request Board Flashes
                                                                  • Staff Assignment (Housekeeping/Tech)
                                                                  • Task Marked "In-Progress" ➔ "Done"
                                                                  • Guest Portal shows "Completed"

========================================================================================================
LOOP 4: FRONTDESK CHECK-IN, ROOM STATUS & NIGHT AUDIT LOOP
[Reception Desk (:3005/reception)] ──► Check-in Guest (Vikramaditya & Ananya)
                                       • Assign Room 305 Deluxe King
                                       • Open Folio #FOLIO-305-2026
                                       • Room Grid (:3005/rooms) turns RED (OCCUPIED)
                                       • Guest Portal (:3004) unblocks live access for Room 305
                                       • Night Audit (:3005) posts daily room tariff (₹3,500/night)

========================================================================================================
LOOP 5: SAAS TENANCY & GOVERNANCE LOOP
[SuperAdmin (:3006)] ──► Configures Hotel Subscription, Feature Flags, and Global Audit
                         • Enforced on Hotel Admin (:3005) and All Portals via JWT hotelId
```

---

## 📋 Granular 16-Shift Execution Plan (Shift 73 to Shift 88)

### 🔹 Shift 73: Central Real-Time Socket.IO Hub & Cross-App Event Bus
* **Target:** Zero-latency real-time synchronization bridge between Backend (:5000) and all 6 frontends.
* **Scope:**
  - Create standard room subscriptions: `hotel_global`, `kitchen_station`, `waiter_floor`, `room_305`, `cashier_pos`.
  - Wire authoritative event bus: `order:created`, `order:status_updated`, `request:created`, `table:status_changed`, `folio:updated`.
  - Automatic reconnection, token verification & heartbeat ping/pong.
* **Deliverable:** Live event emitted from backend instantly reaches all 6 applications without page refresh.

---

### 🔹 Shift 74: Customer Table App (`:3001`) — Live Ordering & Cart API Connection
* **Target:** Connect Table 5 QR dine-in cart to real MongoDB database.
* **Scope:**
  - Connect `handlePlaceOrder` to `POST /api/v1/pos/order` with ephemeral table session token and idempotency key.
  - Calculate authoritative GST (5%) & totals on backend.
  - Store order in MongoDB with status `PLACED`.
* **Deliverable:** Customer clicks "Place Order" on Table 5 ➔ Order ID generated and saved in MongoDB.

---

### 🔹 Shift 75: Kitchen KDS App (`:3003`) — Live KOT Ticket Ingestion & Cooking State Machine
* **Target:** Real-time kitchen ticket display with preparation timers and sound chimes.
* **Scope:**
  - Fetch active kitchen tickets via `GET /api/v1/pos/kds-orders`.
  - Listen for `order:created` socket event to prepend new ticket with Web Audio chime.
  - Wire "Start Preparing" (`PREPARING`) and "Mark Ready" (`READY`) to `PATCH /api/v1/pos/orders/:id/status`.
* **Deliverable:** Order placed on `:3001` pops up on KDS `:3003` with chime, chef strikes items and marks ready.

---

### 🔹 Shift 76: Waiter Mobile Terminal (`:3002`) — 16-Table Map Live Sync & Food Serving Loop
* **Target:** Waiter terminal real-time table occupancy, ready-food buzzers, and serving confirmation.
* **Scope:**
  - Hydrate 16 tables from `GET /api/v1/pos/tables` with live color states (Green: Available, Orange: Dining, Red: Bill Requested).
  - Listen for `kds:ticket_ready` event to trigger 60s pickup SLA buzzer and device vibration.
  - Connect "Mark Served" action to `PATCH /api/v1/pos/orders/:id/serve` (Status: `SERVED`).
* **Deliverable:** Chef marks food ready on KDS ➔ Waiter terminal alerts with 60s timer ➔ Waiter marks served ➔ Table updates.

---

### 🔹 Shift 77: Customer Table (`:3001`) & Waiter (`:3002`) — Service Requests Auto-Routing
* **Target:** Digital call waiter, water, and cutlery requests with priority routing.
* **Scope:**
  - Wire customer assistance buttons ("Call Waiter", "Water Bottle", "Cutlery") to `POST /api/v1/requests`.
  - Route request to waiter on duty for Table 5; fallback to floor supervisor after 45s.
  - Connect Waiter terminal "Accept" and "Complete" buttons to `PATCH /api/v1/requests/:id/status`.
* **Deliverable:** Customer taps "Call Waiter" ➔ Assigned waiter receives high-priority card ➔ Accepts and resolves.

---

### 🔹 Shift 78: Customer Table App (`:3001`) — Split Bill & Dynamic UPI QR Settlement
* **Target:** Complete in-app table payment settlement and bill download.
* **Scope:**
  - Connect Equal Split and Itemized Split calculations.
  - Wire dynamic UPI QR code generator with intent URL.
  - Connect payment confirmation to `POST /api/v1/billing/settle` (Status: `PAID`).
* **Deliverable:** Customer pays via UPI on phone ➔ Bill settled ➔ Table moves to cleaning status.

---

### 🔹 Shift 79: Guest Room Portal (`:3004`) — In-Room Dining Live Order & KDS Dispatch
* **Target:** In-Room dining orders from Room 305 with dual linkage to Kitchen KDS.
* **Scope:**
  - Connect "Place In-Room Order" to `POST /api/v1/pms/frontdesk/inroom-order`.
  - Creates ticket in KDS with badge `[ROOM 305 - IN-ROOM DINING]`.
  - Update Live Order Stepper on Room Portal (`Order Placed` ➔ `Preparing` ➔ `Out for Delivery` ➔ `Delivered`).
* **Deliverable:** Guest orders Paneer Butter Masala from Room 305 ➔ KDS receives ticket labeled Room 305.

---

### 🔹 Shift 80: Guest Room Portal (`:3004`) — Room 305 Master Folio Live Binding & Settle
* **Target:** Live room charges and dining charges posting to Master Folio #FOLIO-305-2026.
* **Scope:**
  - In-room dining bill (₹525) automatically posts to Folio line items.
  - Hydrate live folio breakdown from `GET /api/v1/pms/frontdesk/room-stay-details/305`.
  - Connect "Pay Now (₹9,019)" to `POST /api/v1/pms/frontdesk/settle-folio` (UPI / Card / Netbanking).
  - Connect "Download Bill" to print / export official GST Tax Invoice PDF.
* **Deliverable:** Guest views complete stay folio (₹9,019), pays online, and downloads tax invoice.

---

### 🔹 Shift 81: Guest Room Portal (`:3004`) — Concierge, Housekeeping & Maintenance Dispatch
* **Target:** In-room service requests dispatched to hotel operations teams.
* **Scope:**
  - Connect 10 quick requests (water, towel, pillow, toiletries, tissues, room cleaning, ice bucket, blanket) to `POST /api/v1/pms/frontdesk/concierge-request`.
  - Connect Stay Extension (+1, +2 nights) to `POST /api/v1/pms/frontdesk/extend-stay`.
  - Connect Express Checkout request to `POST /api/v1/pms/frontdesk/express-checkout-request`.
* **Deliverable:** Guest taps "Water Bottle" ➔ Housekeeping task created with Room 305 badge and SLA.

---

### 🔹 Shift 82: Standalone Cashier POS (`:3005/cashier`) — Fast KOT Punching & Menu Engine
* **Target:** High-speed commercial cashier terminal for restaurant counter.
* **Scope:**
  - Hydrate live menu items from `GET /api/v1/pos/menu` with category pills and search.
  - Connect 10-key numeric keypad, quick item add, portion selection, and cooking note.
  - Connect direct KOT dispatch to kitchen KDS and thermal receipt printer format.
* **Deliverable:** Cashier punches order in 5 seconds ➔ Ticket instantly prints / pops up in KDS.

---

### 🔹 Shift 83: Standalone Cashier POS (`:3005/cashier`) — Split Tender & Cash Drawer Float
* **Target:** Cashier shift handover, float balancing, and multi-tender settlement.
* **Scope:**
  - Connect Split Tender (Cash + UPI + Card) to `POST /api/v1/billing/create-invoice`.
  - Connect Cash Drawer Float In / Float Out tracking.
  - Connect Shift Handover & Blind Cash Reconciliation to `POST /api/v1/fast-cashier/reconcile`.
* **Deliverable:** Cashier settles bills with mixed payments, prints receipts, and reconciles cash drawer.

---

### 🔹 Shift 84: Hotel Frontdesk Reception (`:3005/reception`) — Check-In & Document Vault
* **Target:** Frontdesk guest reception workstation, check-in, and keycard release.
* **Scope:**
  - Wire booking lookup by mobile/ID to `GET /api/v1/pms/frontdesk/booking-lookup`.
  - Connect guest identity upload (Aadhaar / Passport) and physical room allotment to `POST /api/v1/pms/frontdesk/check-in`.
  - Connect live concierge request task board resolving Room 305 requests.
* **Deliverable:** Receptionist checks in guest ➔ Room 305 stay activated ➔ Folio opened.

---

### 🔹 Shift 85: Hotel Room Grid Matrix (`:3005/rooms`) — 4-Floor 32-Room State Cycle
* **Target:** Visual room management grid reflecting live physical room states.
* **Scope:**
  - Fetch 4 floors x 32 rooms from `GET /api/v1/pms/rooms`.
  - Connect status toggles (`AVAILABLE`, `OCCUPIED`, `DIRTY`, `CLEANING`, `INSPECTION`, `MAINTENANCE`) to `PATCH /api/v1/pms/rooms/:roomNumber/status`.
  - Link room state changes to Housekeeping task assignments.
* **Deliverable:** Receptionist or Housekeeping changes Room 305 to "Cleaning" ➔ Grid updates in real-time.

---

### 🔹 Shift 86: Hotel Admin ERP (`:3005`) — Executive KPIs & 1-Click Night Audit
* **Target:** General manager executive overview and daily financial day lock.
* **Scope:**
  - Connect live KPI metrics (`GET /api/v1/admin/dashboard-kpis`): Occupancy %, RevPAR, Gross Sales, Open KOTs.
  - Connect 1-Click Daily Night Audit (`POST /api/v1/night-audit/execute`): Resolves unbilled tables, auto-posts daily room tariff + GST, locks revenue.
* **Deliverable:** Manager views real-time hotel health and executes automated night audit.

---

### 🔹 Shift 87: SuperAdmin SaaS Platform (`:3006`) — Tenant Governance & Feature Flags
* **Target:** Multi-tenant SaaS administration and global health monitoring.
* **Scope:**
  - Connect hotel tenants registry to `GET /api/v1/superadmin/tenants`.
  - Connect subscription plan tier changes and feature flags (KDS on/off, Banquet on/off).
  - Connect system health diagnostics (DB latency, socket connections, error logs).
* **Deliverable:** SuperAdmin provisions hotels, manages subscriptions, and monitors system metrics.

---

### 🔹 Shift 88: Master End-to-End Cross-Portal Simulation & Zero-Defect Gate
* **Target:** Full system integration audit with 100% green verification.
* **Scope:**
  - Execute automated cross-portal test script (`scripts/verify_cross_portal_workflows.ts`):
    * Loop 1: Table QR Order ➔ KDS ➔ Waiter Serve ➔ Cashier Settle (Passed)
    * Loop 2: Room QR Order ➔ KDS ➔ Folio Posting ➔ Online Settle (Passed)
    * Loop 3: Concierge Request ➔ Reception Queue ➔ Resolution (Passed)
    * Loop 4: Frontdesk Check-in ➔ Room Grid Status ➔ Night Audit (Passed)
  - Execute Monorepo Health Gatekeeper (`npm run integrity:check`).
* **Deliverable:** 100% verified production-ready system across all 6 applications with zero defects.

---

## 🛑 Execution Status: Awaiting User Command
> **Current Status:** Blueprint fully defined. **No code modifications will begin until you give the command ("Start" / "काम शुरू करो")!**
