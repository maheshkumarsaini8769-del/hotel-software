# SpiceHub — Portal / Page / Feature Inventory & Test Matrix

_Last updated: 21 Oct 2026 · Covers all 8 standalone portals + backend + shared packages_

This document lists **every page of every portal**, the **feature count per page**, whether the page is
**backend-live** (real API data) or **honest-placeholder** (explicitly states "not connected"), and the
**verification performed**.

Legend: ✅ live backend · 🟡 local-only / browser-persisted · ⛔ honestly not connected yet

---

## 1. Customer Table App (`:3001`) — 6 pages / 34 features

| # | Page | Features | Data | Verified |
|---|------|---------:|------|----------|
| 1 | Home | 6 | ✅ | menu + table session from POS |
| 2 | Menu (categories, veg/jain, 86-out) | 8 | ✅ | live `/pos/menu`, stock toggles blocked |
| 3 | Cart | 7 | ✅ | live order items, GST calc |
| 4 | Orders (tracking, live status) | 5 | ✅ | socket `order:*` + `/pos/orders` |
| 5 | Call Waiter (6 request types) | 6 | ✅ | `POST /requests/create` → waiter console |
| 6 | Pay Bill (UPI / Card / Cash / Room Folio) | 4 | ✅ | `/billing/payment/process` |

**Verified live**: *Fire Order to Kitchen* → `POST /api/v1/pos/orders/place` = **201**, order card visible
in Orders tab, 0 console errors.

---

## 2. Waiter Mobile App (`:3002`) — 16 pages / 61 features

| # | Page | Features | Data | Verified |
|---|------|---------:|------|----------|
| 1 | Login (server PIN auth) | 4 | ✅ | `POST /auth/waiter-login` (Argon2), 5-try lockout, dev-only 1-Tap demo |
| 2 | Dashboard | 9 | ✅ | live tables, KOT, requests, recent served orders |
| 3 | My Tables | 8 | ✅ | live `/table-management/tables` + live running bills |
| 4 | Other Tables | 6 | ✅ | same live tables (non-assigned) |
| 5 | Live Orders & KOT | 8 | ✅ | `/pos/kds/orders` READY/PREPARING + served feed |
| 6 | Order History | 4 | ✅ | served orders from API |
| 7 | Table Transfer | 7 | ✅ | live source/dest tables + live preview bill |
| 8 | Guest Requests | 5 | ✅ | `/requests/waiter/assigned` + accept/resolve |
| 9 | Notifications | 5 | ✅ | socket + request feed (no fabricated rows) |
| 10 | Table Billing | 12 | ✅ | live table orders, multi-tender settle |
| 11 | Split Bill | 8 | ✅ | live occupied tables, itemised/equal split |
| 12 | Room Service | 4 | ✅ | `/room-service` order placement |
| 13 | Call Kitchen | 4 | ✅ | `POST /pos/kitchen/buzzer` |
| 14 | Menu & Stock 86 | 4 | ✅ | `/pos/menu/86-items` + toggle-86 |
| 15 | My Profile | 9 | ✅/🟡 | live float register + live metrics, avatar persisted |
| 16 | Settings / Help | 4 | 🟡 | theme, mute, support copy |

**New in this pass**: the waiter terminal now has a **server-verified staff session** (no PIN list in the
bundle), every API call carries `Authorization` + `x-hotel-id`, and the **cash float register** is the real
`/waiter-cash-float` API (open / record / request-drop) instead of a hard-coded ₹6,500.

---

## 3. Kitchen KDS App (`:3003`) — 11 pages / 44 features

| # | Page | Features | Data | Verified |
|---|------|---------:|------|----------|
| 1 | Login (shared StaffLoginGate) | 4 | ✅ | JWT + tenant validation |
| 2 | Live Orders board | 12 | ✅ | `/pos/kds/orders`, socket tickets, Accept/Preparing/Ready/Served |
| 3 | Order Queue | 7 | ✅ | live tickets + search + priority |
| 4 | Kitchen Stations | 5 | ✅ | `/pos/kds/stations` (3 real stations) |
| 5 | Menu Items (86 manager) | 5 | ✅ | live catalog, delegated to hotel admin |
| 6 | Preparation Time | 5 | ✅ | live ticket timers |
| 7 | Inventory Alerts | 4 | ✅/⛔ | low-stock events from socket; no fake rows |
| 8 | Recipe Guide | 2 | ⛔ | "not connected" placeholder (no endpoint) |
| 9 | Production Plan | 2 | ⛔ | "not connected" placeholder |
| 10 | Staff Management | 4 | ✅ | live station roster |
| 11 | Reports & Analytics + Settings | 5 | ✅/⛔ | live session metrics, audio chime test, honest config note |

---

## 4. Guest Room Portal (`:3004`) — 8 pages / 37 features

| # | Page | Features | Data | Verified |
|---|------|---------:|------|----------|
| 1 | QR/Room Access | 3 | ✅ | signed `GUEST_SESSION` JWT, QR rotation |
| 2 | Overview & Stay | 6 | ✅ | live stay + folio |
| 3 | Food & In-Room Dining | 8 | ✅ | live in-room menu, order placement |
| 4 | Room Service | 6 | ✅ | live requests |
| 5 | Housekeeping & Laundry | 5 | ✅ | live requests |
| 6 | My Bill & Folio | 8 | ✅ | live folio lines, atomic settlement |
| 7 | Live Order Tracking | 6 | ✅ | socket order tracking |
| 8 | Hotel Info / Concierge / Offers | 5 | ✅/⛔ | live info, honest unconnected items |

**Verified**: folio `FOLIO-305-2026`, balance ₹9,801.25, tax-invoice download, double-pay protection.

---

## 5. Hotel Admin ERP (`:3005`) — 15 modules / 92 features

| # | Module | Features | Data | Verified |
|---|--------|---------:|------|----------|
| 1 | Dashboard | 10 | ✅ | `/dashboard/overview` KPIs, occupancy, revenue trend, live feed |
| 2 | Staff & Terminals | 7 | ✅ | live roster, avatars, shifts |
| 3 | Rooms & Front Desk (PMS matrix) | 10 | ✅ | live matrix, quick reserve/check-in/reassign/cancel |
| 4 | Dining Tables | 6 | ✅ | live tables |
| 5 | Live Orders & KDS | 7 | ✅ | live orders |
| 6 | POS & Billing (embedded cashier) | 9 | ✅ | real `FastCashierPosApp` (not demo data) |
| 7 | Menu & Stock 86 | 7 | ✅ | live catalog + 86 toggles |
| 8 | Inventory & Stock | 6 | ✅ | live stock/GRN |
| 9 | Purchases & Suppliers | 5 | ✅ | live POs/vendors |
| 10 | Housekeeping | 6 | ✅ | live board |
| 11 | Night Audit & Close | 6 | ✅ | live sessions |
| 12 | Policies & 15 SOPs | 4 | 🟡 | policy content + 15 SOP docs |
| 13 | Reports & Revenue | 6 | ✅ | live reports |
| 14 | Operations & Settings | 6 | ✅/🟡 | live config + local preferences |
| 15 | Notification Inbox (bell) | 5 | ✅ | **live** — service requests, orders, bookings, room inventory (no seeded rows) |

Embedded **Reception** module also renders the real `FrontDeskCheckInApp`.

---

## 6. SuperAdmin SaaS Control Plane (`:3006`) — 24 modules / 61 features

| # | Module | Features | Data | Verified |
|---|--------|---------:|------|----------|
| 1 | Dashboard | 12 | ✅ | live tenants, orders, revenue, guests, occupancy, activity |
| 2 | All Branches (Tenants) | 8 | ✅ | live tenants, plan badge, suspend/reactivate, plan assign |
| 3 | Brand Management | 1 | ⛔ | honest placeholder |
| 4 | Hotel Admin Management | 3 | ✅ | onboarding → tenant + admin + rooms/tables + plan |
| 5 | Users & Roles | 7 | ✅ | `/superadmin/users` cross-tenant directory |
| 6 | Subscription & Billing | 6 | ✅ | live `/superadmin/plans`, create standard tiers, live MRR |
| 7 | System Configuration | 4 | 🟡 | browser-only operator banner + JSON export |
| 8 | Menu & Catalog Templates | 2 | ⛔ | push button disabled until sync API exists |
| 9 | Inventory & Procurement | 2 | ⛔ | placeholder |
| 10 | Reports & Analytics | 2 | ⛔ | placeholder |
| 11 | Franchise Management | 2 | ⛔ | placeholder |
| 12 | Rooms & PMS | 2 | ⛔ | placeholder |
| 13 | Customer Management | 2 | ⛔ | placeholder |
| 14 | Marketing & Offers | 2 | ⛔ | placeholder |
| 15 | Feedback & Reviews | 2 | ⛔ | placeholder |
| 16 | Support & Helpdesk | 2 | ⛔ | placeholder |
| 17 | System Logs & Activity | 3 | ✅ | live activity feed |
| 18 | Device & Hardware | 3 | ✅ | live station/terminal status |
| 19 | Integrations | 2 | ⛔ | placeholder |
| 20 | Backup & Data | 2 | ⛔ | placeholder |
| 21 | Security & Permissions | 4 | ✅ | real JWT/tenant/PIN posture |
| 22 | AI & Automation | 2 | ⛔ | placeholder |
| 23 | Notifications | 2 | ⛔ | placeholder |
| 24 | Multi-language / Settings / Shift 80.1 | 6 | 🟡 | local preferences, honest notes |

---

## 7. Express Cashier POS (`:3007`) — 15 pages / 52 features

| # | Page | Features | Data | Verified |
|---|------|---------:|------|----------|
| 1 | Login (StaffLoginGate) | 4 | ✅ | JWT + tenant |
| 2 | POS / Billing | 10 | ✅ | live menu, cart, multi-tender, split, KOT |
| 3 | Open Bills | 5 | ✅ | `/fast-cashier/snapshot` (10 live bills) |
| 4 | Payment History | 5 | ✅ | live recent payments |
| 5 | Split Bills | 4 | ✅ | live bill selection |
| 6 | Refunds & Void | 3 | ✅ | refund/void flows |
| 7 | Cash Drawer | 9 | ✅ | live float, **cash-drop API**, denomination counter |
| 8 | Shift Management | 8 | ✅ | live shift, blind close (variance audit) |
| 9 | Receipts (GST register) | 7 | ✅ | live settled bills, thermal print + download |
| 10 | Daily Summary | 4 | ✅ | live day totals |
| 11 | Table Management | 7 | ✅ | live `/pos/tables` floor plan |
| 12 | Room Charges (F&B) | 7 | ✅ | live in-house folio transfer |
| 13 | Guest Folio Payment | 4 | ✅ | live folio payment |
| 14 | Expenses (Front Desk) | 6 | ✅ | **new** petty-cash voucher API + drawer impact |
| 15 | Reports / Settings | 7 | ✅/🟡 | live tender mix + CSV export, local terminal prefs |

**New backend endpoints added in this pass**: `GET/POST /fast-cashier/expenses`, `POST /fast-cashier/cash-drop`,
`GET /fast-cashier/receipts`, `GET /fast-cashier/snapshot` (extended with petty cash + expected cash).

---

## 8. Reception & Front Desk (`:3008`) — 17 pages / 58 features

| # | Page | Features | Data | Verified |
|---|------|---------:|------|----------|
| 1 | Login (StaffLoginGate) | 4 | ✅ | JWT + tenant |
| 2 | Room Dashboard | 12 | ✅ | live KPIs, room grid, arrivals, departures, housekeeping |
| 3 | Room Booking / Room Calendar | 8 | ✅ | live PMS matrix |
| 4 | Walk-in Check-in | 7 | ✅ | live walk-in flow |
| 5 | Check-in / Check-out | 8 | ✅ | live reservation manager |
| 6 | Room Allocation | 7 | ✅ | live arrivals board + room assign |
| 7 | Room Status | 7 | ✅ | live housekeeping board + actions |
| 8 | Housekeeping | 6 | ✅ | live turnaround board |
| 9 | Room Charges (F&B) | 8 | ✅ | live folio + charge posting + print |
| 10 | Guest Management | 7 | ✅ | live CRM search/create + guest 360 |
| 11 | Group Booking | 6 | ✅ | live corporate master folio |
| 12 | Room Types & Rates | 7 | ✅ | live tariff editor (**verified save + persist + restore**) |
| 13 | Extra Services | 6 | ✅ | live concierge booking + folio charge |
| 14 | Maintenance | 8 | ✅ | **new** live maintenance desk (raise / SLA / resolve) |
| 15 | Lost & Found Vault | 5 | ✅ | live vault |
| 16 | Night Audit & Close | 5 | ✅ | live night audit |
| 17 | Settings | 4 | 🟡 | browser-local terminal preferences |

---

## 9. Backend / platform features added or hardened in this pass

| Area | Change |
|------|--------|
| Waiter auth | `POST /api/v1/auth/waiter-login` — Argon2 PIN verification, 5-attempt/60s lockout, dev-only demo session, 1h JWT |
| Cashier petty cash | `PettyCashVoucher` model + `GET/POST /fast-cashier/expenses`; reduces the open shift's expected drawer cash |
| Cashier safe drop | `POST /fast-cashier/cash-drop` — reduces expected cash, issues drop receipt number |
| Cashier receipts | `GET /fast-cashier/receipts` — settled bill register with CGST/SGST split, thermal reprint |
| Order feed | `GET /pos/orders/recent` — live served/active order summaries (waiter + cashier dashboards) |
| Superadmin plans | Plans now persist on the tenant (`subscriptionPlanId/Code/Name/MonthlyINR`), MRR is computed per tenant, plan assignment UI added |
| Tenant provisioning | `POST /superadmin/tenants/:id/provision` — creates room type + rooms + dining tables at onboarding |
| MRR honesty | Estimated MRR is 0 when no plans exist (no invented ₹4,999 fallback) |
| KDS auth | KDS wrapped in the shared `StaffLoginGate`; every request sends `Authorization` + `x-hotel-id`; demo tenant fallback removed |

---

## 10. Test matrix (final run)

| Check | Command | Result |
|-------|---------|--------|
| Monorepo build | `npm run build:all` | ✅ all 8 apps + 4 packages |
| Backend types | `npx tsc --noEmit` (backend) | ✅ clean |
| Backend unit/integration | `npx jest` (backend) | ✅ 89 suites / 669 tests |
| Frontend deep audit | `npx tsx scripts/deep_frontend_and_workflow_audit.ts` | ✅ 0 crashes / 0 console errors / 0 failed requests (6 frontends) |
| 8-portal human E2E | `node scripts/human_life_real_browser_test_all_8_portals.cjs` | ✅ 0 console errors / 0 HTTP 4xx-5xx / 0 crashes (8 portals) |
| Device emulation | `npm run verify:emulator` | ✅ 8/8 portals pass |
| Reception maintenance flow | `node scripts/verify_reception_maintenance_desk.cjs` | ✅ raise → list → resolve, 0 console errors |
| Admin live notifications | browser (bell icon) | ✅ 15 live rows from `/dashboard/overview`, 0 console errors |
| Cashier petty cash + safe drop | `POST /fast-cashier/expenses`, `POST /fast-cashier/cash-drop` | ✅ voucher → drawer balance reduced → drop → shift close (variance ₹0) |
| Repo integrity gate | `npm run integrity:check` | ✅ zero defects |
| Production boot | `NODE_ENV=production PORT=5050`, bypass off | ✅ `/health` 200, DB connected, unauth 401, login 200, waiter PIN 200, demo-login rejected |

### Production security checks performed
- `DEV_AUTH_BYPASS=false` → unauthenticated `/superadmin/tenants` = **401**
- Waiter demo login in production = **`DEMO_LOGIN_DISABLED`**
- Wrong waiter PIN = **401 + attempt counter**
- Tenant scope enforced on every portal request (`x-hotel-id` + JWT)

---

## 11. Known honest gaps (not hidden, explicitly labelled in the UI)

1. Superadmin Branding / Inventory / Reports / Franchise / CRM / Marketing / Feedback / Support / Logs /
   Integrations / Backup / AI / Notifications / Languages — **no backend endpoints yet**, shown as
   "not connected yet" instead of fake data.
2. KDS Recipe Guide, Production Plan, station/printer configuration, historical reports — **no endpoints yet**.
3. Waiter "Avg Turnaround" and "Guest Rating" — no live source, rendered as `—` with an explanation.
4. KDS "Menu Items" 86-manager delegates to the hotel admin (no separate permission model yet).
5. Waiter table-zone allocation is still admin-local (`spicehub_admin_waiter_allocations`), not a persisted
   `WaiterZoneAssignment` yet.
6. Split-tender split bills are calculation-only in the waiter app; the cashier settlement is persisted.
7. `restaurantOperationsController` still keeps some module-level in-memory report state that is not
   tenant-scoped.
