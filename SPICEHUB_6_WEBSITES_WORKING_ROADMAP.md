# SPICEHUB: 6 WEBSITES MASTER WORKING ROADMAP & INTER-PORTAL ARCHITECTURE
Consolidated Reference for Multi-Tenant SaaS Hospitality ERP (PMS + POS + KDS + Online Booking + Guest Portal)

---

## 🏗️ 1. Master System Structure
* **6 Dedicated React Frontends:**
  1. `Website #1`: Customer / Table Dine-in App
  2. `Website #2`: Waiter Smart Mobile Terminal
  3. `Website #3`: Kitchen Display System (KDS)
  4. `Website #4`: Room Booking & Guest Self-Service Portal
  5. `Website #5`: Hotel & Restaurant Admin ERP (PMS + POS)
  6. `Website #6`: SuperAdmin SaaS Control Platform
* **1 Unified Backend:** Node.js + Express + Socket.IO (Authoritative for pricing, taxes, stock, auth, and state)
* **1 Central Database:** MongoDB + Mongoose (Tenant-isolated queries via `hotelId`)
* **Real-time Pipeline:** Socket.IO with automatic reconnection and authoritative state resynchronization

---

## 🔄 2. The 4 Core Inter-Website Pipelines

### 🍜 Pipeline 1: Restaurant Dine-In Order-to-Kitchen Loop
```
[Customer (Website #1)]
        │
        ├─► Scans Table QR (Ephemeral token validated by Backend)
        ├─► Browses Menu, selects portions/addons, adds cooking instructions
        └─► Taps "Place Order" (with Idempotency key)
                │
                ▼
        [Unified Backend API]
                ├─► Validates live prices, active coupons, and 5% GST
                ├─► Enforces concurrency locks (no double submission)
                └─► Creates Order record with status 'PLACED'
                        │
                        ├──────────────────────────────────────────┐
                        ▼                                          ▼
        [Kitchen KDS (Website #3)]                 [Waiter App (Website #2)]
                │                                          │
                ├─► Audio chime plays                      ├─► Table status changes to "Order Placed"
                ├─► Appears in 'NEW' column                │
                ├─► Chef taps 'Start Preparing'            │
                │   (Status = 'PREPARING')                 │
                └─► Chef finishes & taps 'Ready'           │
                    (Status = 'READY')                     │
                        │                                  │
                        └───────────────────┬──────────────┘
                                            ▼
                                   [Waiter Notification]
                                            │
                                            ├─► Device vibrates & chimes: "Table T-12 Ready"
                                            ├─► Waiter picks up food from counter
                                            ├─► Serves food & taps 'Mark Served'
                                            │   (Status = 'SERVED')
                                            ▼
                               [Bill Request & Payment]
                                            │
                                            ├─► Option A: Customer pays on phone via UPI/Gateway
                                            ├─► Option B: Waiter collects Cash & confirms change
                                            │   (Status = 'PAID')
                                            ▼
                                   [Physical Table Reset]
                                            │
                                            ├─► Waiter physically inspects & taps 'Close Table'
                                            ├─► Table status = 'DIRTY' ➔ 'CLEANING' ➔ 'AVAILABLE'
                                            └─► Ephemeral Table QR token is permanently expired
```

---

### 🛎️ Pipeline 2: Smart Service Request Auto-Routing (2.5.1)
```
[Customer on Website #1 OR In-Room Guest on Website #4]
        │
        └─► Taps "Call Waiter", "Water", "Cutlery", or "Assistance"
                │
                ▼
        [Backend Smart Routing Engine]
                │
                ├─► Priority 1: Check Waiter assigned to this Table/Room
                │     └── If On-Duty and Workload < Threshold ➔ ASSIGN!
                │
                ├─► Priority 2: Check Other Waiters in the Same Section
                │     └── Pick on-duty waiter with lowest active requests ➔ ASSIGN!
                │
                ├─► Priority 3: Check Any On-Duty Waiter in Entire Hotel
                │     └── Pick waiter with least workload ➔ ASSIGN!
                │
                └─► Priority 4 (45s Fallback / Timeout):
                      └── 🚨 RED ALARM flashes on Admin Incident Center (Website #5)
                      └── Supervisor manually reassigns or attends directly
```

---

### 🛏️ Pipeline 3: Hotel Room Booking ➔ Check-In ➔ Folio ➔ Checkout Loop
```
[Public Guest (Website #4 - Public Mode)]
        │
        ├─► Selects Dates + Room Type (Deluxe Room) + Add-ons (Breakfast)
        ├─► Pays advance via Gateway
        └─► Receives unguessable 8-digit Booking ID & WhatsApp voucher
                │
                ▼ (Arrival Day at Hotel)
[Front Desk Receptionist (Website #5 - Admin PMS)]
        │
        ├─► Searches Booking ID / Mobile
        ├─► Scans & uploads Guest Aadhaar / Passport
        ├─► Checks visual Room Tape Chart & assigns physical room (e.g., Room 304)
        └─► Taps 'Check-In'
                │
                ├─► System creates 'Active Stay' record
                └─► Opens Master Folio #F-304
                        │
                        ▼ (During Stay)
        [In-Room Dining (Website #4 - Guest Portal)]
                │
                ├─► Guest scans permanent Room QR pasted in Room 304
                ├─► Backend validates active Stay (Browser session restored)
                ├─► Guest orders food from shared restaurant menu
                └─► Selects "Charge to Room"
                        │
                        ├──────────────────────────┬──────────────────────────┐
                        ▼                          ▼                          ▼
               [Kitchen KDS (Web #3)]     [Waiter App (Web #2)]      [Admin Folio (Web #5)]
                        │                          │                          │
                 Ticket shows:              Waiter receives            Food bill (₹450 + GST)
                 "[ROOM 304 - ROOM SERVICE]" delivery task,             automatically posted
                 Prepares & marks Ready     delivers to room           to Master Folio #F-304
                        │                          │                          │
                        └──────────────────────────┴──────────────────────────┘
                                                   │
                                                   ▼ (Departure Day)
                                         [Guest Checkout]
                                                   │
                                                   ├─► Guest taps 'Request Checkout' on phone
                                                   ├─► Receptionist reviews Folio (Room rent + Food + Laundry)
                                                   ├─► Collects final balance, generates GST Invoice PDF
                                                   ├─► Stay status = 'CHECKED_OUT'
                                                   └─► Room status = 'DIRTY' ➔ 'CLEANING' ➔ 'INSPECTION' ➔ 'AVAILABLE'
```

---

### 🏢 Pipeline 4: Multi-Tenant SaaS Control & Night Audit Loop
```
[SuperAdmin (Website #6)]
        │
        ├─► Onboards new Hotel Tenant (Slug, custom domain, subscription plan)
        ├─► Configures Feature Flags (Enable/Disable PMS, Banquet, KDS, AI)
        └─► Monitors system health, error logs, and DB performance
                │
                ▼
[Hotel Admin (Website #5)]
        │
        ├─► Configures staff accounts, menu items, room types, and floor layout
        ├─► Manages daily billing, purchases, and guest reservations
        └─► Executes Daily Night Audit (12:00 AM):
                ├─► Resolves all open tables and unbilled orders
                ├─► Performs Blind Cash Drawer Reconciliation (Actual vs Expected)
                ├─► Auto-posts room night rent + GST into active room folios
                └─► Activates 1-Click Day Lock (records become immutable)
```

---

## 🛠️ Step-by-Step Implementation Roadmap

```
PHASE 1: Foundation (Backend & Architecture)
 ├── Multi-tenant Node.js + Express API setup (hotelId scoping)
 ├── 42 MongoDB Mongoose Schemas & Indexes
 ├── Authentication (JWT + Refresh Tokens + RBAC Middleware)
 └── Centralized Socket.IO Real-time Server

PHASE 2: Restaurant & Kitchen Engines
 ├── Website #1: Customer QR Dine-in (Menu, Cart, Orders, Split Bill)
 ├── Website #3: Kitchen Display System (KDS) & Stations
 ├── Website #2: Waiter Terminal (Smart Routing & Table Management)
 └── Website #5: Restaurant POS & Floor Designer

PHASE 3: Hotel PMS & Guest Experience
 ├── Website #4: Public Room Booking & Guest Self-Service Portal
 ├── Website #5: Front Desk PMS (Tape Chart, Check-in/out, Master Folio)
 ├── Dual-Link In-Room Dining (Shared KDS ➔ Room Folio Billing)
 └── Housekeeping & Room Cleanliness Cycle

PHASE 4: SaaS Platform, Enterprise Suites & Hardening
 ├── Website #6: SuperAdmin SaaS Switchboard & Subscription Engine
 ├── 13 Gap-Closure Suites (Banquet, Fast POS, Multi-Payment, Tally XML)
 └── Concurrency verification, stress testing, and Docker deployment
```
