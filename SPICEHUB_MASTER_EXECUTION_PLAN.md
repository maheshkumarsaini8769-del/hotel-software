# SPICEHUB ULTIMATE MASTER IMPLEMENTATION BLUEPRINT
**Complete 735 Features & 607 UI Screens — Full Traceability, Schemas, State Machines, Hardware, Security & Build Engine**

---

## 🏛️ PART 1: MASTER RECONCILIATION & STRUCTURAL METRICS

| Scope Metric | Exact Count | Engineering Definition |
| :--- | :---: | :--- |
| **Dedicated React Frontends** | **6 Websites** | 6 isolated, standalone React SPAs (Customer, Waiter, KDS, Guest Portal, Admin ERP, SuperAdmin). |
| **Unified Backend Engine** | **1 Backend** | 1 Centralized Node.js + Express API + Socket.IO real-time server (Multi-Tenant enforced via `hotelId`). |
| **Primary Database** | **1 Database** | MongoDB + Mongoose with 48 production schemas and compound indexes. |
| **Main Core Modules** | **70 Modules** | Distributed across Restaurant POS, Hotel PMS, Kitchen KDS, Staff, Inventory, and SaaS governance. |
| **Listed Feature Entries** | **735 Features** | Exact source-consolidated feature entries across all 6 websites and core backend layers. |
| **Base UI Planning Items** | **525 Items** | 521 original screen/UI inventory items + 4 Room Portal persistence/recovery states. |
| **Gap-Closure Audit Additions**| **82 Items** | Dedicated enterprise UI suites added during the master audit (Suites A through M). |
| **Total UI Planning Inventory**| **607 UI Items** | Grand total planning inventory (dedicated views, forms, drawers, modals, workflows, and states). |

---

## 🔒 PART 2: THE 10 NON-NEGOTIABLE ARCHITECTURAL BOUNDARIES

1. **TableSession ≠ HotelStay:** Restaurant dining table session is completely separate from a Hotel Room Stay. They are distinct database identities and must never be merged.
2. **3 Independent QR Systems:**
   * `Table QR`: Ephemeral cryptographic token; permanently expires and invalidates upon table session closure.
   * `Permanent Room QR`: Fixed sticker inside physical room; resolves dynamically ONLY to the currently active Hotel Stay.
   * `Hotel Booking QR`: Public-facing QR directing guests to the room booking engine.
3. **Room Type Booking vs Physical Room Assignment:** Public online booking reserves a *Room Type* (inventory counter). Physical room assignment (e.g., Room 302) is performed by Front Desk reception at check-in via the visual Tape Chart.
4. **Payment ≠ Table Closure:** A bill marked as `PAID` does NOT close a dining table. The table moves to `PAYMENT_SETTLED`, and requires physical waiter confirmation to transition through `DIRTY` ➔ `CLEANING` ➔ `AVAILABLE`.
5. **Shared Kitchen KDS with Dual Linkage:** Room Service orders utilize the same restaurant menu and shared kitchen KDS. In-Room Dining tickets display a `[ROOM 304 - In-Room Dining]` badge, and charges are automatically posted to the guest's active **Master Room Folio**.
6. **Zero-Trust Frontend:** Backend is the sole authority for item prices, dynamic taxes (CGST/SGST/IGST), active coupons, discounts, and inventory. Screenshots are strictly rejected as payment proof.
7. **Strict Multi-Tenancy Scoping:** Every query and mutation is filtered by `hotelId` derived from authenticated JWT sessions. Client-supplied `hotelId` is never trusted blindly.
8. **Optional/Configured BOM Deduction:** Raw material inventory consumption is linked to recipe Bill of Materials (BOM) based on hotel configuration, rather than forcing rigid mandatory gram-level barriers.
9. **Graceful Presence & Geofencing:** Waiter GPS/network drops transition accounts to `Location Rechecking` rather than abruptly logging them out or deleting accounts.
10. **Advisory AI Boundary:** AI assistant provides business insights, sales trends, and inventory suggestions only. Autonomous refunds, deletions, tax edits, or permission modifications are strictly prohibited.

---

## 🖥️ PART 3: GRANULAR UI SCREEN-BY-SCREEN MASTER INVENTORY (607 ITEMS)

### 🍽️ WEBSITE #1: CUSTOMER / TABLE DINE-IN (10 Modules | 53 UI Items)
* **1.1 QR Entry & Session (3):** 1. QR Landing / Session Validation, 2. Session Error / Expired QR, 3. Join Existing Table Session.
* **1.2 Home / Menu (7):** 4. Menu Home, 5. Category View, 6. Search Results, 7. Popular / Recommended, 8. Offers, 9. Out-of-Stock State, 10. Language Selection.
* **1.3 Product Details (5):** 11. Product Details, 12. Variant Selection, 13. Add-ons Selection, 14. Special Instructions, 15. Allergen / Customization Info.
* **1.4 Cart & Ordering (5):** 16. Cart Drawer, 17. Person/Seat Assignment, 18. Shared Item Allocation, 19. Order Confirmation, 20. Order Success / Failure.
* **1.5 Orders & Tracking (5):** 21. Current Orders List, 22. Order Details, 23. Live Order Tracking Timeline, 24. Order Modification Request, 25. Order Cancellation Request.
* **1.6 Request Center (3):** 26. Request Center Hub, 27. Request Type Selection (Water, Waiter, Cutlery, Tissue, Chair), 28. Request Status / Timeline.
* **1.7 Billing (9):** 29. Bill Request, 30. Bill Preview, 31. Individual Bill, 32. Full Table Bill, 33. Split Bill Calculator, 34. Item-wise Split, 35. Equal Split, 36. Custom Split, 37. Shared Item Allocation View.
* **1.8 Payment (7):** 38. Payment Method Selection, 39. UPI/Card/Online Processing Modal, 40. Payment Success Voucher, 41. Payment Failed Screen, 42. Payment Cancelled Screen, 43. Payment Retry Prompt, 44. Cash/Pending State Screen.
* **1.9 Feedback (4):** 45. Feedback Form, 46. Multi-Criteria Rating, 47. Complaint Submission Box, 48. Feedback Success Confirmation.
* **1.10 System States (5):** 49. Shimmer Loading State, 50. Empty State, 51. Offline/Reconnecting Banner, 52. Safe Error Fallback, 53. Session Closed Screen.

---

### 🧑‍💼 WEBSITE #2: WAITER MOBILE TERMINAL (11 Modules | 65 UI Items)
* **2.1 Auth & Account (5):** 54. Waiter PIN Login, 55. Forgot Password, 56. Reset Password, 57. Session Expired Screen, 58. Force Logout Screen.
* **2.2 Dashboard (3):** 59. Waiter Shift Dashboard, 60. Attention Center, 61. Real-time Notifications Drawer.
* **2.3 My Tables (4):** 62. My Assigned Tables List, 63. Table Details, 64. Table Members/Seats View, 65. Table Session Timeline.
* **2.4 Orders (8):** 66. New Orders Alert, 67. Order Details, 68. Rapid Manual Order Taker, 69. Manual Order Cart, 70. Edit/Modification Request, 71. Cancellation Request with Reason, 72. Ready Orders Buzzer, 73. One-Tap Serve Confirmation.
* **2.5 Requests (5):** 74. Incoming Requests List, 75. Request Context Details, 76. Accept Request, 77. Complete Request Confirmation, 78. Unassigned/Fallback Request Escalation Board.
* **2.6 Table Operations (8):** 79. Transfer Table Modal, 80. Merge Tables Tool, 81. Split Table Tool, 82. Add Member/Seat, 83. Remove Member/Seat, 84. Close Table Verification, 85. Cleaning State Toggle, 86. Available State Confirmation.
* **2.7 Billing (9):** 87. Pending Bills List, 88. Bill Details, 89. Individual Bill View, 90. Full Table Bill View, 91. Split Bill View, 92. Item-wise Split View, 93. Shared Item Bill View, 94. Discount Request Modal (Manager PIN), 95. Refund Request Modal.
* **2.8 Payments (6):** 96. Cash Received Entry, 97. Tender Change Calculation (Notes/Coins), 98. UPI/Card Verification Modal, 99. Payment Pending Screen, 100. Payment Success Screen, 101. Payment Failure Screen.
* **2.9 Shift & Handover (7):** 102. Shift Clock-in Screen, 103. On Break State, 104. Shift Clock-out Screen, 105. Handover Checklist, 106. Handover Accept Modal, 107. Handover Complete Receipt, 108. Audited Handover Log.
* **2.10 Presence & Geofence (6):** 109. On Duty Status, 110. Busy Mode, 111. Do Not Assign Status, 112. Location Rechecking State, 113. Out of Area Grace Screen, 114. Offline Mode.
* **2.11 Profile & Security (4):** 115. Waiter Profile, 116. Account Status, 117. Security PIN Settings, 118. Logout All Devices Confirmation.

---

### 👨‍🍳 WEBSITE #3: KITCHEN DISPLAY SYSTEM (KDS) (6 Modules | 29 UI Items)
* **3.1 Access & Stations (2):** 119. Kitchen Station Login, 120. Station Scope Selection (Curry, Tandoor, Chinese, Bakery, Bar).
* **3.2 Main KDS Board (5):** 121. Master KDS Dashboard, 122. NEW Orders Queue, 123. PREPARING Orders Queue, 124. READY Orders Queue, 125. DELAYED / Overdue Red Queue.
* **3.3 Order Card / Detail (8):** 126. KOT Order Card (Table vs Room Service Badge), 127. KOT Detailed View, 128. Item Cooking Instructions, 129. Priority / VIP Badge, 130. Preparation SLA Timer, 131. One-Tap Mark Preparing, 132. One-Tap Mark Ready, 133. Delayed Food Alert.
* **3.4 Kitchen Operations (6):** 134. Station Routing Filter, 135. Kitchen Load Barometer, 136. Rush Hour Mode Toggle, 137. Course Management (Hold Starters / Fire Main Course), 138. Kitchen-to-Waiter Instant Notification, 139. Completed Orders Recall Screen.
* **3.5 Printer / Network Reliability (5):** 140. Thermal Printer Network Status, 141. Print Failed Error Banner, 142. KOT Retry Required Queue, 143. Audited Duplicate KOT Reprint Screen, 144. Offline/Reconnecting View.
* **3.6 Stock Management (3):** 145. Kitchen Stock Status, 146. Kitchen Stock Request Form, 147. Instant Item 86 (Out of Stock) Toggle.

---

### 🛏️ WEBSITE #4: ROOM BOOKING & GUEST PORTAL (8 Modules | 68 UI Items)
* **4.1 Public Room Booking (16):** 148. Booking Landing Hero, 149. Check-in/Check-out Selection, 150. Guest & Children Count, 151. Live Availability Search Results, 152. Room Type List (Deluxe, Executive, Suite), 153. Room Type Details, 154. Room Gallery & Amenities, 155. Add-ons Selection (Breakfast buffet, Airport cab), 156. Guest Details Form, 157. Authoritative Price Breakdown, 158. Razorpay/Stripe Payment Screen, 159. Booking Success Screen, 160. Random 8-Digit Booking ID Voucher, 161. WhatsApp Confirmation Card, 162. Booking Recovery Screen, 163. Recovery Verification Modal.
* **4.2 Guest Portal & Continuity (8):** 164. Guest Portal Home, 165. Current Stay Summary, 166. Room Details View, 167. Persistent Session / Continue Stay Screen, 168. Session Restore / Backend Revalidation Modal, 169. Last Valid Page Restore View, 170. Browser Storage Cleared Recovery Modal, 171. Expired / Checked-Out Stay Redirect Screen.
* **4.3 In-Room Dining (7):** 172. Shared Restaurant Digital Menu, 173. Dish Customization Modal, 174. Room Service Cart Drawer, 175. Room Service Checkout, 176. Room Service Order Success, 177. Room Service Live Tracker, 178. Room Service Order Details.
* **4.4 Guest Service Requests (10):** 179. Request Center Hub, 180. Call Waiter, 181. Water Refill, 182. Housekeeping Daily Clean, 183. Extra Pillow/Blanket/Chair, 184. Toiletries Kit, 185. AC/Maintenance Complaint, 186. Urgent Assistance, 187. Request Status Tracker, 188. Request Timeline.
* **4.5 Laundry Management (4):** 189. Laundry Services Rate Card, 190. Laundry Item Selection Bag, 191. Laundry Order Confirmation, 192. Laundry Processing Status (Picked ➔ In Wash ➔ Returned).
* **4.6 Folio / Billing (8):** 193. My Master Room Bill, 194. Detailed Folio Breakdown, 195. Room Rent Charges Ledger, 196. Restaurant Dining Charges, 197. Room Service Charges, 198. Laundry Charges, 199. Tax & Discount Breakdown, 200. Advance Payments Credit Ledger.
* **4.7 Stay Extensions & Checkout (9):** 201. Extend Stay Screen, 202. Extension Options (+1h, +2h, Full Night), 203. Availability Check Modal, 204. Extension Confirmation, 205. Early Checkout Request & Policy, 206. Checkout Review Screen, 207. Final Master Folio Statement, 208. Final Payment Gateway, 209. Checkout Success & Invoice PDF.
* **4.8 System States & Safeguards (6):** 210. No Active Stay Screen, 211. Invalid Room QR Warning, 212. Session Expired Notice, 213. Payment Failed Screen, 214. Offline/Reconnecting View, 215. Safe Error Fallback.

---

### 🏢 WEBSITE #5: HOTEL ADMIN ERP & PMS (25 Modules | 245 UI Items)
* **5.1 Command Center (5):** 216. Admin Login, 217. Dashboard, 218. Live Command Center, 219. System Notifications Center, 220. Attention Center.
* **5.2 Orders (11):** 221. All Orders Register, 222. Pending Orders, 223. Preparing Orders, 224. Ready Orders, 225. Served Orders, 226. Cancelled Orders, 227. Delayed Orders, 228. Order Details, 229. Order Audit Timeline, 230. Order Item Modification, 231. Cancellation Approval Modal.
* **5.3 Tables & Floor Plan (14):** 232. Table List, 233. Add Table, 234. Edit Table, 235. Table Details, 236. QR Management, 237. QR Print Layout, 238. Floor/Section List, 239. Interactive Visual Floor Plan Designer, 240. Active Table Sessions, 241. Table Merge Tool, 242. Table Transfer Tool, 243. Table Split Tool, 244. Force Close Table, 245. Mark Table Cleaning.
* **5.4 Menu Master (16):** 246. Menu Dashboard, 247. Categories List, 248. Add Category, 249. Edit Category, 250. Category Details, 251. Products List, 252. Add Product, 253. Edit Product, 254. Product Details, 255. Variants Builder, 256. Add-ons Group Builder, 257. Stock Availability Toggle, 258. Offers & Combos, 259. Dynamic Discounts, 260. Availability Scheduling, 261. Image Management Vault.
* **5.5 Kitchen Master (8):** 262. Kitchen Dashboard, 263. Stations List, 264. Add/Edit Station, 265. Product-to-Station Routing Matrix, 266. KDS Monitor, 267. Printer Network Registry, 268. Printer Details & Config, 269. Kitchen Load Analytics.
* **5.6 Staff & RBAC (12):** 270. Staff List, 271. Add Staff, 272. Staff Details, 273. Edit Staff, 274. Roles Directory, 275. Permissions Matrix, 276. Waiter Table Assignments, 277. Section Assignments, 278. Shift Rosters, 279. Attendance Register, 280. Live Staff Presence Board, 281. Force Logout Single/All Devices.
* **5.7 Inventory & BOM (9):** 282. Inventory Dashboard, 283. Inventory Items List, 284. Item Details, 285. Stock Status Board, 286. Kitchen Stock Request Center, 287. Stock Approval Modal, 288. Restock Inward Purchase Entry, 289. Kitchen Wastage Register, 290. Wastage Details & Spoilage Log.
* **5.8 Suppliers & Purchases (9):** 291. Supplier List, 292. Supplier Details, 293. Add/Edit Supplier, 294. Purchase Orders List, 295. Create Purchase Order, 296. Purchase Details, 297. Supplier Invoice Register, 298. Pending Supplier Payments, 299. Supplier Performance Metrics.
* **5.9 Billing & Payments (9):** 300. Master Bills Register, 301. Bill Details & Line Items, 302. Split Bill Settle Screen, 303. Authorized Discounts Ledger, 304. Refund Authorization Register, 305. Cancelled Bills Log, 306. Master Payments Log, 307. Payment Details Card, 308. Payment Gateway Reconciliation.
* **5.10 Daily Closing & Night Audit (12):** 309. Closing Dashboard, 310. Open Tables Check, 311. Unpaid Restaurant Bills Review, 312. Pending Room Payments Review, 313. Pending Room Service Orders Clearance, 314. Open Requests Clearance, 315. Room Overstay Exceptions, 316. Cash Reconciliation (Actual vs Expected), 317. Refund Review Audit, 318. Day-End Stock Actions, 319. 1-Click Close Hotel Day & Day-Lock, 320. Post-Close Audited Adjustments.
* **5.11 Front Desk PMS (15):** 321. Front Desk Dashboard, 322. Today's Expected Arrivals, 323. Today's Expected Departures, 324. Walk-in Instant Booking, 325. Find Booking (ID/Mobile/Name), 326. Booking Details Card, 327. Guest Verification & Aadhaar Upload, 328. Assign Physical Room, 329. Check-in Action, 330. Check-in Welcome Confirmation, 331. Room Transfer Tool, 332. Key/Key Card Issue, 333. Express Check-out, 334. Checkout Confirmation, 335. Guest Tax Invoice PDF Generator.
* **5.12 Rooms & Tape Chart (11):** 336. Room List, 337. Room Details, 338. Add/Edit Room, 339. Live Room Status Board, 340. Room QR Generator, 341. Bulk Room QR Print Layout, 342. Room Types Master, 343. Add/Edit Room Type, 344. Room Type Details, 345. Visual Interactive Room Tape Chart / Calendar, 346. Overbooking Prevention Blocker.
* **5.13 Reservations (7):** 347. Reservation List, 348. Reservation Details, 349. Create Reservation, 350. Edit Reservation, 351. Cancellation Fee Calculator, 352. Mark No-Show, 353. Reservation Audit Timeline.
* **5.14 Guests / CRM (4):** 354. Guest Master Directory, 355. Guest Detailed Profile, 356. KYC Documents Verification, 357. Guest Authorized Stay History.
* **5.15 Housekeeping (6):** 358. Housekeeping Status Dashboard, 359. Dirty Rooms Queue, 360. Cleaning Queue Attendant Assignment, 361. Cleaning Task Checklist, 362. Room Inspection Checklist, 363. Maintenance/Out of Service Block.
* **5.16 Room Service (5):** 364. Room Service Dashboard, 365. Room Service Orders Board, 366. Room Service Details & KOT, 367. Delivery Timeline Tracker, 368. Delay Escalation Alert.
* **5.17 Room Requests (5):** 369. Room Requests Dashboard, 370. Request Details Context Card, 371. Staff Assignment Modal, 372. Priority Tagging, 373. Request Completion Log.
* **5.18 Laundry (4):** 374. Laundry Dashboard, 375. Laundry Orders Register, 376. Laundry Order Details & Pieces, 377. Laundry Pricing Setup.
* **5.19 Maintenance & Assets (10):** 378. Maintenance Dashboard, 379. Room Issues Register, 380. Issue Details Ticket, 381. Technician Assignment, 382. Status Timeline, 383. Preventive Maintenance Scheduler, 384. Hotel Equipment/Assets Registry, 385. Asset Repair History, 386. Equipment Maintenance Cost Tracker, 387. Out of Service Asset Log.
* **5.20 Master Folio (12):** 388. Active Folios List, 389. Folio Master View, 390. Room Tariff Line Items, 391. Restaurant Dining Charges, 392. Room Service Line Items, 393. Laundry Line Items, 394. Minibar Line Items, 395. Other Incidentals & Damage Penalties, 396. Discount Line Items, 397. Tax & GST Line Items, 398. Advance Payment Credits, 399. Final Master Folio Statement.
* **5.21 Pricing Engine (11):** 400. Pricing Dashboard, 401. Base Rates, 402. Seasonal Rates, 403. Weekend Rates, 404. Date Overrides Calendar, 405. Day Use Tariff Rules, 406. Hourly Pricing Rules, 407. Extra Guest/Bed Charges, 408. Breakfast/Add-ons Pricing, 409. Late Checkout Penalty Policy, 410. Early Checkout Refund Policy.
* **5.22 Reports & BI (21):** 411. Master Revenue Analytics, 412. Restaurant Sales Report, 413. Product Performance (Stars & Dogs Matrix), 414. Discounts & Complimentary Report, 415. Tax & GSTR-1 Summary Report, 416. Staff Sales & Commission Report, 417. Table Utilization & Turnover Report, 418. Kitchen Prep Time & SLA Report, 419. Raw Material Inventory Report, 420. Wastage & Spoilage Report, 421. Hotel Occupancy (RevPAR & ADR) Report, 422. Room Revenue Report, 423. Booking Channels & No-Shows Report, 424. Room Type Performance Report, 425. Housekeeping Turnaround Report, 426. Room Service Sales Report, 427. Laundry Department Report, 428. Folio Reconciliation Report, 429. Comprehensive Combined Analytics, 430. Tally XML Export Center, 431. Scheduled Automated Reports Dispatcher.
* **5.23 Approvals & Incidents (8):** 432. Central Approval Inbox, 433. Order Modification Approval, 434. Cancellation Approval, 435. Discount Approval (>10%), 436. Cash Refund Approval, 437. Table Transfer Approval, 438. Room/Stay Correction Approval, 439. Incident Center (Operational Alarms).
* **5.24 AI Assistant (4):** 440. AI Assistant Dashboard, 441. AI Demand Forecasting Insights, 442. AI Recommendation Detail, 443. Human Confirmation Approval Modal.
* **5.25 Settings (5):** 444. Hotel Identity & Branding, 445. GSTIN & Tax Configuration, 446. Operational Timings, 447. Payment Gateway Credentials, 448. WhatsApp & SMS Notification Templates.

---

### 🌐 WEBSITE #6: SUPERADMIN SAAS PLATFORM (10 Modules | 65 UI Items)
* **6.1 Auth & Platform Security (4):** 449. SuperAdmin Login, 450. Mandatory 2FA OTP Screen, 451. Platform Session Security, 452. Root Password Reset.
* **6.2 Platform Dashboard (5):** 453. Global SaaS Command Center, 454. Active/Suspended Tenants Ticker, 455. Platform MRR & ARR Ticker, 456. System Health Barometer, 457. Platform Security Alerts Drawer.
* **6.3 Hotel / Tenant Management (8):** 458. Master Hotels Directory, 459. Onboard Hotel Wizard, 460. Hotel Deep-Dive Profile, 461. Approve Hotel Registration, 462. Suspend Hotel (Non-Payment), 463. Reactivate Hotel, 464. Archive Hotel, 465. Scoped Hotel Admin Impersonation Console.
* **6.4 Subscription Management (8):** 466. SaaS Subscription Plans Builder, 467. Plan Details & Feature Quotas, 468. Trial Accounts Manager, 469. Subscription Renewals, 470. Expired Subscriptions Queue, 471. SaaS Invoices Register, 472. Collect Subscription Payment, 473. Feature Plan Access Matrix.
* **6.5 Feature Switchboard (5):** 474. Master Feature Flags List, 475. Per-Hotel Feature Toggles (PMS, KDS, AI, QR), 476. Global Beta Feature Rollout, 477. Instant Feature Rollback Switch, 478. Feature Deprecation Manager.
* **6.6 Platform Analytics (6):** 479. Multi-Tenant Sales Benchmarking, 480. Daily Orders & Booking Volume, 481. Active Hotels Activity Map, 482. API Usage & Quota Monitor, 483. Platform Revenue Analytics, 484. Tenant Churn Analytics.
* **6.7 Security & Audit (6):** 485. Global Audit Trail, 486. Failed Login Attempts Monitor, 487. Active Sessions Kill-Board, 488. High-Risk Actions Log, 489. Security Exception Alerts, 490. Scoped Support Access Log.
* **6.8 Support & Communications (6):** 491. Multi-Tenant Support Tickets, 492. Ticket Details & Chat, 493. Internal Support Notes, 494. Broadcast Platform Announcement, 495. Scheduled Maintenance Notice, 496. View-Only Hotel Impersonation Console.
* **6.9 System Health (8):** 497. Node.js API Latency & Load, 498. MongoDB Connection Pool & Health, 499. Redis & Socket.IO Connections, 500. Payment Webhook Gateways Status, 501. File/Object Storage Quota, 502. KDS & Printer Socket Health, 503. Real-Time Error Logger, 504. High Latency Pager Alerts.
* **6.10 Emergency Controls (9):** 505. Platform Emergency Controls, 506. Global Hotel Disable, 507. Feature Kill Switch, 508. Safe Rollback Trigger, 509. Emergency Audit Sign-off, 510. Automated Database Backup Trigger, 511. Restore Test Drill Screen, 512. Cloud Snapshot Validator, 513. Disaster Recovery Status Board.

---

### ⚡ GAP-CLOSURE AUDIT ADDITIONS (13 Suites | 82 UI Items)
* **Suite A: Gift Vouchers (8):** 514. Voucher Dashboard, 515. Voucher List, 516. Create Voucher, 517. Voucher Details, 518. Redeem Voucher, 519. Redemption History, 520. Voucher Sales & Payments, 521. Voucher Settings.
* **Suite B: Banquet & Event Management (15):** 522. Banquet Dashboard, 523. Event Calendar, 524. Event Bookings List, 525. Create Event / Enquiry, 526. Event Details, 527. Banquet Hall / Venue List, 528. Venue Details & Seating Setup, 529. Per-Plate Menu Packages, 530. Package Details, 531. Event Organizer Details, 532. Quotation / Proposal Builder, 533. Token Advance Payment, 534. Function Prospectus (FP) Checklist, 535. Event Master Folio, 536. Banquet Revenue Report.
* **Suite C: Dedicated Fast Cashier POS (10):** 537. High-Speed POS Counter, 538. Barcode Scanner / Instant Search, 539. POS Speed Cart, 540. Walk-in Customer Selection, 541. Hold Order Button, 542. Held Orders Drawer, 543. Quick Cash / UPI Settle, 544. Thermal POS Receipt (80mm/58mm), 545. POS Shift Open / Close, 546. POS Daily Sales Register.
* **Suite D: Multi-Payment Settlement (5):** 547. Multi-Payment Settlement Screen, 548. Add Payment Method (Cash + UPI + Card), 549. Payment Amount Allocation, 550. Settlement Summary, 551. Multi-Payment Audit Reconciliation.
* **Suite E: Branch & Kitchen Stock Transfer (6):** 552. Stock Transfer Dashboard, 553. Transfer Requests List, 554. Create Transfer Request, 555. Transfer Outward Dispatch, 556. Transfer Inward Receive & Verify, 557. Stock Transfer History.
* **Suite F: Customer Ticketing & Support (8):** 558. Ticket Dashboard, 559. Tickets List, 560. Create Guest Ticket, 561. Ticket Details, 562. Staff Assignment, 563. Issue Status Timeline, 564. Internal Staff Notes, 565. Resolution & Guest Response.
* **Suite G: Review & Reputation Management (6):** 566. Reviews Dashboard, 567. Guest Reviews List, 568. Review Details, 569. Hotel Public Response Form, 570. Review Visibility Action (Publish / Hide / Flag), 571. Customer Sentiment Analytics.
* **Suite H: Secure Document Management (10):** 572. Documents Dashboard, 573. Documents Directory, 574. Guest ID / Passport Vault, 575. Invoice Documents Vault, 576. Booking Contracts Vault, 577. Supplier Tax Invoices Vault, 578. Upload Document Modal, 579. Document Secure Preview, 580. Signed Temporary Share URL, 581. Document Retention / Deletion Policy.
* **Suite I: Tally / Accounting Export (6):** 582. Accounting Dashboard, 583. Tally Gateway Config, 584. Ledger & Tax Mapping, 585. 1-Click Tally XML Sync, 586. Export History, 587. Sync Error & Reconciliation.
* **Suite J: Digital Invoice Sharing (2):** 588. WhatsApp / Email Invoice Share Modal, 589. Delivery Status & Share History.
* **Suite K: Advanced Saved Filters (2):** 590. Filter Configuration Panel, 591. Saved Presets Manager.
* **Suite L: Scheduled Automated Reports (4):** 592. Scheduled Reports List, 593. Schedule Frequency Setup, 594. Schedule Details & Recipients, 595. Report Run & Dispatch Logs.
* **Suite M: Room Browser Session Persistence & Recovery (12):** 596. Browser Session Handshake View, 597. Active Stay Token Authenticator, 598. Last Route Auto-Resume Guard, 599. Storage Cleared Mobile Recovery, 600. Booking ID Recovery Modal, 601. WhatsApp Verification PIN Screen, 602. Expired Stay Redirection Warning, 603. Cross-Tenant Rejection Screen, 604. Reconnect State Resync Barometer, 605. Storage Tampering Lockout Screen, 606. Safe Eviction & Storage Purge View, 607. Multi-Tab Session Synchronizer.

---

## 📋 PART 4: THE 735 DOCUMENTED FEATURE ENTRIES (LINE-BY-LINE AUDIT & SCOPE)

### 0. Final Product Structure (14 Features)
1. Exactly 6 separate React websites/frontends.
2. ONE common Node.js + Express backend/API.
3. MongoDB + Mongoose as primary database.
4. Socket.IO for real-time communication.
5. Docker/Docker Compose for deployment.
6. Object/file storage for images, documents, and invoices.
7. Payment gateway + webhook signature verification.
8. WhatsApp/email/in-app notifications where enabled.
9. Every hotel is a separate tenant with data isolated by `hotelId`.
10. Table Session and Hotel Stay are distinct identities.
11. Table QR, Room QR, and Hotel Booking QR are separate QR systems.
12. Customer booking reserves room type; reception assigns physical room at check-in.
13. ROOM_SERVICE uses restaurant menu/shared KDS, linked to `stayId`, `roomId`, and `folioId`.
14. Backend is authoritative for price, tax, availability, payment, permissions, and tenant access.

### 1. Website #1 — Customer / Table Website (54 Features)
15. Secure table QR entry using a random token.
16. Validate hotel, table, token, and active Table Session on the backend.
17. Join existing active session instead of creating duplicate sessions.
18. Only current active session data is visible.
19. Close session and invalidate/expire table session token.
20. Prevent previous occupants' orders, bills, and requests from leaking to new customers.
21. Server-side enforcement of one active session per table.
22. Hotel logo/identity and table number display.
23. Search, categories, popular/recommended items, and offers.
24. Veg/non-veg filters and configured dietary information.
25. Availability/out-of-stock real-time state.
26. Hindi/English and configured language switching.
27. Menu announcements and special offers display.
28. Dish images, name, description, and authoritative backend price.
29. Variants, add-ons, and quantity selector.
30. Special cooking instructions.
31. Allergens, ingredients, and spice level customization info.
32. Backend revalidates price and availability before order confirmation.
33. Quantity, variants, add-ons, and instructions validation in cart.
34. Subtotal, tax, discount, and total calculation.
35. Person/seat assignment.
36. Shared item support across seats.
37. Order confirmation preview before submission.
38. Idempotency key prevents duplicate order submission.
39. Current-session orders display only.
40. Order lifecycle tracking: Placed ➔ Accepted ➔ Preparing ➔ Ready ➔ Served.
41. Real-time updates via Socket.IO.
42. Order modification/cancellation rules based on cooking state.
43. Visual order timeline.
44. Call Waiter request.
45. Water request.
46. Spoon/Fork request.
47. Plates request.
48. Tissue request.
49. Extra Chair request.
50. General Assistance request.
51. Request Bill action.
52. Request status lifecycle: Waiting ➔ Accepted ➔ Completed.
53. Priority handling for urgent service requests.
54. Request timeline and status notifications.
55. Individual seat bill calculation.
56. Full table bill calculation.
57. Equal split calculator.
58. Item-wise split calculator.
59. Custom amount split calculator.
60. Shared-item tax and total allocation.
61. Final bill snapshot locking price/tax/discount values.
62. Cash payment option.
63. UPI payment option.
64. Card payment option.
65. Online gateway payment option.
66. Server-side payment verification.
67. Webhook signature validation.
68. Payment states: Pending, Processing, Paid, Failed, Cancelled, Refund.
69. Payment retry on failure.
70. Strict prohibition: Never accept screenshot as payment proof.
71. Food quality rating.
72. Service quality rating.
73. Waiting-time rating.
74. Overall dining rating.
75. Customer complaint submission box.
76. Feedback success confirmation.
77. Responsive mobile-first interface.
78. Accessibility-friendly controls.
79. Shimmer loading state.
80. Empty cart/order state.
81. Offline/reconnecting socket banner.
82. Safe reconnect and authoritative state resynchronization.
83. Zero customer account/profile barrier (frictionless entry).

### 2. Website #2 — Waiter Mobile Terminal (114 Features)
84. Waiter secure login.
85. Forgot/reset password.
86. No public signup (Admin-created accounts only).
87. Admin-created waiter accounts.
88. Session expiry enforcement.
89. Logout all devices command.
90. Active device and session tracking.
91. My Tables overview.
92. New Orders notification feed.
93. Ready Orders buzzer.
94. Active Requests feed.
95. Pending Bills list.
96. Attention Center.
97. Real-time system notifications.
98. Assigned table list view.
99. Real-time table status.
100. Table members/seats count.
101. Current active orders display.
102. Table pending requests.
103. Current running table bill.
104. Table session timeline.
105. Processing QR orders.
106. Taking manual table orders.
107. Order details view.
108. Order modification request.
109. Order cancellation request.
110. Reason capture for cancellations.
111. Manager approval where configured.
112. One-tap "Mark Served" confirmation.
113. Water request handling.
114. Call Waiter request handling.
115. Bill request handling.
116. Plates request handling.
117. Spoon/Fork request handling.
118. Extra Chair request handling.
119. Assistance request handling.
120. Accept/arrive/complete workflow.
121. Smart automated waiter assignment.
122. Backend Request record linked to `hotelId` and active session/stay.
123. Dynamic request types support.
124. Backend authoritative assignee selection.
125. Priority 1: Table-assigned waiter routing.
126. Priority 2: Same-section free waiter routing.
127. Priority 3: Global on-duty waiter with lowest workload.
128. Priority 4: Supervisor/Admin fallback escalation.
129. Waiter active On-Duty verification.
130. Workload calculation based on open requests, tables, and orders.
131. Exclusion of Do Not Assign, Offline, and Out of Area staff.
132. Geofence presence verification with grace period.
133. GPS failure location rechecking state.
134. Continuity preference for table-assigned waiters.
135. Idempotent request assignment preventing duplicate alerts.
136. Audited reassignment logs.
137. Re-evaluation if selected waiter becomes unavailable.
138. Unassigned fallback routing to Admin Attention Center.
139. Manual supervisor reassignment without losing request history.
140. Real-time Socket.IO notifications for request events.
141. Request lifecycle: Created ➔ Assigned ➔ Accepted ➔ In Progress ➔ Completed.
142. Urgent request SLA escalation.
143. Tenant-scoped assignment engine.
144. Requests List UI with SLA age.
145. Request Details context UI.
146. One-tap Accept Request.
147. Complete Request confirmation.
148. Fallback request view for supervisors.
149. Admin reassignment picker.
150. Hotel Admin assignment priority configuration.
151. Section fallback and workload threshold configuration.
152. Temporary Do Not Assign staff flag.
153. Audited assignment policy changes.
154. Table transfer operation.
155. Merge tables operation.
156. Split table operation.
157. Add member/seat.
158. Remove member/seat.
159. Close table session physically.
160. Table cleaning state.
161. Table available state.
162. Session preservation during waiter reassignment.
163. Individual bill presentation.
164. Full table bill presentation.
165. Split bill presentation.
166. Item-wise bill presentation.
167. Shared-item bill calculation.
168. Cash received recording.
169. Change tender calculation.
170. UPI/Card verification.
171. Discount request to manager.
172. Refund request to manager.
173. Print receipt / PDF sharing.
174. Waiter shift clock-in.
175. Shift break status.
176. Shift clock-out.
177. Shift handover pending orders list.
178. Shift handover pending requests list.
179. Shift handover ready orders list.
180. Shift handover bill requests list.
181. Shift handover payment-pending tables list.
182. Shift handover notes.
183. Audited shift handover acceptance.
184. Staff presence: On Duty.
185. Staff presence: Busy.
186. Staff presence: Do Not Assign.
187. Staff presence: Location Rechecking.
188. Staff presence: Out of Area.
189. Staff presence: Offline.
190. Geofence grace period before status change.
191. Admin presence alerts.
192. Automatic reassignment on confirmed staff absence.
193. RBAC security boundary: Cannot edit food prices or GST.
194. RBAC security boundary: Cannot modify inventory or raw profits.
195. RBAC security boundary: Cannot grant admin permissions.
196. Mandatory PIN/manager approval for discounts and cancellations.
197. Profile and active shift performance tracking.

### 3. Website #3 — Kitchen Display System (KDS) (47 Features)
198. Kitchen station login.
199. Authorized station scope filtering.
200. Session management and auto-reconnect.
201. NEW orders queue display.
202. PREPARING orders queue display.
203. READY orders queue display.
204. DELAYED / overdue red alert queue display.
205. Large touch-friendly ticket cards.
206. Visual and audio chime alerts on new orders.
207. Unique Order ID display.
208. Order Type badge (DINE_IN / ROOM_SERVICE / TAKEAWAY).
209. Table or Room number prominent badge.
210. Item list with quantities and variants.
211. Special cooking instructions highlighting.
212. Priority / VIP ticket highlighting.
213. Elapsed SLA timer.
214. Estimated preparation time (ETA).
215. One-tap "Mark Preparing".
216. One-tap "Mark Ready".
217. Station-wise kitchen routing (Curry, Tandoor, Chinese, Bakery, Bar).
218. Multi-station order item aggregation.
219. Real-time kitchen load barometer.
220. Production bottleneck visibility.
221. Rush hour mode toggle.
222. Hold and Fire course management (Hold Starters / Fire Main Course).
223. Course-by-course kitchen dispatch.
224. Kitchen-to-waiter direct intercom messages.
225. Automated delay detection engine.
226. Visual kitchen warning on SLA breach.
227. Waiter push alert on delayed orders.
228. Manager escalation on critical food delay.
229. Delay incident timeline recording.
230. Kitchen stock status monitor (Available / Low / Critical).
231. In-kitchen raw material stock request.
232. Instant Item 86 (Out-of-Stock) toggle.
233. Automatic menu update upon Item 86 toggle.
234. Thermal printer online/offline status monitoring.
235. Print failure detection.
236. Automatic print retry queue.
237. Audited duplicate KOT reprint with watermark.
238. Anti-duplicate print lock.
239. Fallback backup printer routing.
240. Full audit log of all manual reprints.
241. Today's completed orders history.
242. Average preparation time analytics.
243. Average delay time analytics.
244. Station-by-station performance breakdown.

### 4. Website #4 — Room Booking & Guest Self-Service (130 Features)
245. Public booking landing page.
246. Check-in and check-out date picker.
247. Adult and child guest counters.
248. Live inventory availability search.
249. Room type catalog (Deluxe, Executive, Suite).
250. Room type details and descriptions.
251. Room photo gallery and 360-degree virtual tour.
252. Amenities checklist display.
253. Add-on services selection (Breakfast buffet, Airport pickup).
254. Guest details and contact form.
255. Authoritative price breakdown.
256. Secure payment gateway checkout.
257. Instant booking confirmation screen.
258. Random unguessable 8-digit Booking ID generation.
259. Automated WhatsApp booking voucher.
260. Booking self-recovery flow.
261. Mobile + OTP verification for booking recovery.
262. Overnight booking mode.
263. Day-use booking mode.
264. Hourly booking mode.
265. Dynamic base pricing calculation.
266. Duration and number of nights multiplier.
267. Extra adult and child tariff calculation.
268. Extra bed / mattress tariff calculation.
269. Breakfast and package add-on calculations.
270. Weekend pricing multipliers.
271. Seasonal pricing overrides.
272. Date-specific tariff overrides.
273. Promo codes and dynamic discounts engine.
274. Dynamic GST calculation (12% vs 18% based on ₹7,500 threshold).
275. Late checkout penalty calculation.
276. Early checkout refund policy calculation.
277. Authoritative backend price snapshot.
278. Pre-arrival booking details view.
279. Pre-arrival modification/cancellation rules.
280. Pre-check-in digital registration.
281. Hotel directions and front desk contact.
282. Security barrier: No room-specific services before active Stay.
283. Permanent Room QR sticker in physical room.
284. Backend resolution of currently checked-in Active Stay.
285. Safe redirect to booking/reception if no active stay exists.
286. Reusability of permanent Room QR across successive guests.
287. Zero data leakage: Previous guest history never visible.
288. Active stay summary dashboard.
289. Room details and facilities view.
290. In-room dining entry point.
291. Digital Call Waiter request.
292. Digital Water refill request.
293. Housekeeping daily cleaning request.
294. Laundry service request.
295. Extra Pillow, Blanket, and Chair requests.
296. Toiletries kit request.
297. Room maintenance and AC complaint log.
298. Live Master Room Bill / Folio review.
299. Reception call / chat.
300. Urgent Assistance emergency button.
301. Stay extension request.
302. Express checkout request.
303. Shared restaurant digital food menu.
304. ROOM_SERVICE order type assignment.
305. Automatic linkage to `stayId`, `roomId`, and `masterFolioId`.
306. Shared Kitchen KDS routing with `[ROOM_SERVICE]` badge.
307. In-room dining tracking: Placed ➔ Accepted ➔ Preparing ➔ Ready ➔ Delivered.
308. Dual payment: "Charge to Room" vs "Pay Now".
309. Delivery timestamp recording.
310. Guest service requests routing engine.
311. Request lifecycle: Created ➔ Assigned ➔ In Progress ➔ Completed.
312. Request SLA timers and escalation.
313. Laundry rate card display.
314. Itemized laundry bag creator.
315. Laundry order placement.
316. Laundry order tracking.
317. Automatic laundry charges posting to Master Folio.
318. Room maintenance issue categorization (Plumbing, Electrical, AC).
319. Severity and priority assignment for maintenance.
320. Maintenance issue description and photo upload.
321. Technician assignment and timeline tracking.
322. Maintenance completion verification.
323. Real-time Master Folio overview.
324. Itemized room charges ledger.
325. Itemized restaurant dining charges ledger.
326. Itemized room service charges ledger.
327. Itemized laundry charges ledger.
328. Minibar consumption ledger.
329. Incidentals and damage penalties ledger.
330. Discounts and promotional credits ledger.
331. Itemized GST and taxes ledger.
332. Advance payment deduction ledger.
333. Stay extension selection (+1h, +2h, Full Night).
334. Real-time next-booking availability conflict check.
335. Stay extension policy charges calculation.
336. Continuity: Same Stay ID maintained across extensions.
337. Early checkout penalty/refund calculation.
338. Manager approval for early checkout refund.
339. Express checkout initiation.
340. Final clearance check (pending orders, laundry, minibar).
341. Final Master Folio presentation.
342. Final balance settlement.
343. GST tax invoice generation.
344. Transition of Stay to `CHECKED_OUT`.
345. Transition of Room to `DIRTY` ➔ `CLEANING` ➔ `INSPECTION` ➔ `AVAILABLE`.
346. Secure opaque guest session token generation.
347. Authoritative backend session validation.
348. Zero sensitive payment/identity data in browser storage.
349. Fallback recovery via Mobile + Booking ID + WhatsApp OTP.
350. Session revalidation on tab/browser resume.
351. Browser session continuity tied to `hotelId` + `roomId` + `stayId`.
352. Local storage restricted to non-sensitive session reference and last route.
353. Single Page Application (SPA) last route auto-persistence.
354. Backend revalidation before restoring last valid route.
355. Route allowlisting preventing open redirects.
356. Fresh data re-fetch on sensitive workflows (Cart, Folio).
357. Immediate redirection to safe recovery if stay is checked out.
358. Recovery path for Incognito / cleared browser storage.
359. Frequent route saving surviving browser crashes.
360. Session purge on checkout or manual sign-out.
361. Multi-tab session synchronization and revalidation.
362. Socket.IO reconnect state resynchronization.
363. Safe error screens without leaking server stack traces.
364. Invalid room QR warning screens.

### 5. Website #5 — Hotel Admin ERP & PMS (326 Features)
365. Admin secure authentication and MFA.
366. Executive live analytics dashboard.
367. Real-time floor occupancy and sales command center.
368. System notifications center.
369. Attention Center for operational alarms.
370. All orders master register.
371. Pending orders filter.
372. Preparing orders filter.
373. Ready orders filter.
374. Served orders filter.
375. Cancelled orders filter.
376. Delayed orders filter.
377. Order details and items breakdown.
378. Order audit timeline.
379. Order item modification.
380. Order cancellation approval.
381. Dining tables master list.
382. Add new dining table.
383. Edit dining table details.
384. Table configuration (Capacity, section).
385. Table QR code generator.
386. Bulk QR code print sheet.
387. Floor and section manager.
388. Interactive visual floor plan designer.
389. Active table sessions monitor.
390. Admin table merge tool.
391. Admin table transfer tool.
392. Table split tool.
393. Force close table session.
394. Mark table cleaning status.
395. Food menu master dashboard.
396. Menu categories list.
397. Add new menu category.
398. Edit menu category.
399. Category display reordering.
400. Products / dishes master list.
401. Add new product / dish.
402. Edit product / dish.
403. Dish details view.
404. Variants builder (Half, Full).
405. Add-ons groups builder.
406. Stock availability toggle (Item 86).
407. Special offers and combo meals.
408. Dynamic discount configuration.
409. Menu availability scheduling (Breakfast, Happy Hours).
410. Food image management.
411. HSN/SAC tax code mapping.
412. Restaurant reservation calendar.
413. Reservation time slot and guest count picker.
414. Table allocation for reservations.
415. Customer reservation details.
416. Advance cover deposit collection.
417. Reservation confirmation dispatch.
418. Arrival and check-in to active Table Session.
419. Cancellation and no-show policy handling.
420. Reservation history ledger.
421. Kitchen management dashboard.
422. Kitchen stations directory.
423. Add/edit kitchen station.
424. Product-to-station routing matrix.
425. Live KDS monitor.
426. Thermal printer network registry.
427. Printer status and ping monitor.
428. Kitchen load and SLA analytics.
429. Staff directory.
430. Add new staff account.
431. Staff profile details.
432. Edit staff details.
433. Staff roles manager.
434. Granular RBAC permissions matrix.
435. Waiter-to-table/section assignments.
436. Staff shift rosters and scheduling.
437. Daily staff attendance register.
438. Live staff presence and geofence board.
439. Force logout single or all devices.
440. Staff audit log.
441. Raw material inventory master dashboard.
442. Stock items catalog.
443. Add/edit raw material item.
444. Real-time stock status board.
445. Kitchen stock requests center.
446. Stock request approval modal.
447. Restock inward purchase entry.
448. Kitchen wastage and spoilage register.
449. Stock consumption history (Recipe BOM deductions).
450. Supplier / vendor directory.
451. Supplier profile and bank details.
452. Add/edit supplier.
453. Purchase Orders (PO) master list.
454. Create new Purchase Order.
455. PO status and goods receipt verification.
456. Supplier invoices register.
457. Pending supplier payments ledger.
458. Supplier performance metrics.
459. Master bills register.
460. Bill details and itemized breakdown.
461. Split bill settlement screen.
462. Authorized discounts ledger.
463. Refund authorization register.
464. Cancelled bills log.
465. Master payments log.
466. Payment transaction verification.
467. Payment gateways reconciliation.
468. Cash drawer opening float entry.
469. Blind shift close entry.
470. Cash discrepancy report (Excess vs Shortage).
471. Waiter cash handover acceptance.
472. Audited shift settlement certificate.
473. Night audit closing dashboard.
474. Open dining tables force settle.
475. Unpaid restaurant bills review.
476. Pending room charges review.
477. Open room service orders clearance.
478. Open service requests clearance.
479. Room overstay exceptions handling.
480. Master cash drawer physical reconciliation.
481. High-risk refunds and discounts audit.
482. Day-end inventory stock-take check.
483. 1-Click Close Hotel Day & Day-Lock.
484. Post-closing audited adjustments.
485. Front Desk command center.
486. Today's expected arrivals list.
487. Today's expected departures list.
488. Walk-in instant booking wizard.
489. Booking search engine (ID, Phone, Name).
490. Booking details card.
491. Guest ID verification and Aadhaar/Passport upload.
492. Physical room assignment.
493. 1-Click Check-in action.
494. Check-in welcome registration slip.
495. Room transfer tool (Preserves Stay ID and Folio).
496. Key card / RFID issue.
497. Express check-out action.
498. Checkout confirmation.
499. Guest GST invoice PDF generator.
500. Rooms master list.
501. Room profile card.
502. Add/edit physical room.
503. Live room status board.
504. Room QR code generator.
505. Bulk room QR print layout.
506. Room types master list.
507. Add/edit room type.
508. Room type configuration.
509. Visual interactive room tape chart / calendar.
510. Overbooking prevention blocker.
511. Master reservations register.
512. Reservation details card.
513. Create new reservation.
514. Edit reservation details.
515. Reservation cancellation fee calculator.
516. Mark reservation no-show.
517. Reservation audit timeline.
518. Group and multi-room booking wizard.
519. Multi-room assignment.
520. Group master folio management.
521. Guest CRM directory.
522. Guest detailed profile.
523. KYC documents vault.
524. Guest authorized stay history.
525. Guest preferences and dietary tags.
526. VIP guest tags and repeat guest recognition.
527. Internal staff notes on guests.
528. Guest communication timeline.
529. Housekeeping status dashboard.
530. Dirty rooms queue.
531. Housekeeper cleaning task assignment.
532. Room inspection checklist.
533. Mark room available status.
534. Out of Order / maintenance room block.
535. Do Not Disturb (DND) status monitor.
536. Linen and laundry inventory tracking.
537. Lost & Found register with photo upload.
538. Room service operations dashboard.
539. In-room dining orders queue.
540. Room service delivery timeline.
541. Room service delay escalation alert.
542. Delivery staff assignment.
543. Master room requests board.
544. Request details context card.
545. Staff assignment and escalation.
546. Priority tagging for requests.
547. Request completion audit log.
548. Laundry dashboard.
549. Laundry orders register.
550. Laundry order details and item count.
551. Laundry pricing configuration.
552. Maintenance operations dashboard.
553. Room maintenance issues register.
554. Maintenance ticket details.
555. Technician assignment.
556. Maintenance issue timeline.
557. Preventive maintenance scheduler.
558. Hotel assets and equipment registry.
559. Asset repair history.
560. Equipment maintenance cost tracker.
561. Out of service asset log.
562. Active Master Folios list.
563. Master Folio view.
564. Room tariff line items ledger.
565. Restaurant dining charges ledger.
566. Room service line items ledger.
567. Laundry line items ledger.
568. Minibar and incidentals line items ledger.
569. Damage penalties line items ledger.
570. Discounts line items ledger.
571. Tax and GST line items ledger.
572. Advance payment credits ledger.
573. Split folio (Company billing vs Personal).
574. Final Master Folio statement.
575. Dynamic pricing dashboard.
576. Base room rates setup.
577. Seasonal room rates setup.
578. Weekend surge pricing setup.
579. Date-specific override calendar.
580. Day use tariff rules.
581. Hourly room pricing rules.
582. Extra guest and bed charges.
583. Breakfast and package pricing.
584. Late checkout penalty policy.
585. Early checkout refund policy.
586. Promotional offers and discounts.
587. Hotel expenses dashboard.
588. Expense categories manager.
589. Record new expense.
590. Vendor invoice expense log.
591. Petty cash expenses log.
592. Expense approval modal.
593. Expense analytics report.
594. Master revenue analytics report.
595. Restaurant sales report.
596. Menu engineering matrix (Stars & Dogs).
597. Discounts and complimentary food report.
598. Tax and GSTR-1 summary report.
599. Staff sales and commission report.
600. Table utilization and turnover report.
601. Kitchen preparation and SLA delay report.
602. Raw material inventory report.
603. Wastage and spoilage report.
604. Hotel occupancy (RevPAR & ADR) report.
605. Room revenue report.
606. Booking channels and no-shows report.
607. Room type performance report.
608. Housekeeping turnaround report.
609. Room service sales report.
610. Laundry department report.
611. Folio and payment reconciliation report.
612. Comprehensive combined BI analytics.
613. Tally XML export center.
614. Scheduled automated reports dispatcher.
615. Central approval inbox.
616. Order modification approval.
617. Cancellation approval.
618. Discount approval (>10%).
619. Cash refund approval.
620. Table transfer approval.
621. Room/stay correction approval.
622. Stock adjustment approval.
623. Expense approval.
624. Incident Center for operational alarms.
625. AI assistant dashboard.
626. AI demand forecasting insights.
627. AI menu pricing suggestions.
628. Human confirmation required for AI advice.
629. Feedback and complaints register.
630. Complaint ticket assignment and resolution.
631. Customer response dispatcher.
632. Feedback analytics.
633. Hotel identity and branding settings.
634. GSTIN, FSSAI, and tax settings.
635. Operational timings settings.
636. Multi-language support settings.
637. Table QR settings.
638. Room QR settings.
639. Thermal printer network settings.
640. Payment gateway credentials setup.
641. WhatsApp, SMS, and email notification templates.

### 6. Website #6 — Super Admin Website (64 Features)
642. SuperAdmin secure login.
643. Mandatory 2FA OTP verification.
644. Global session security enforcement.
645. Root password reset.
646. Global SaaS command center dashboard.
647. Active, suspended, and trial hotels count.
648. Platform MRR and ARR ticker.
649. Global system health barometer.
650. Platform security alerts drawer.
651. Master hotels / tenants directory.
652. Onboard new hotel wizard.
653. Hotel deep-dive profile.
654. Approve hotel registration.
655. Suspend hotel account.
656. Reactivate suspended hotel.
657. Archive hotel account.
658. Scoped Hotel Admin impersonation console.
659. SaaS subscription plans builder.
660. Plan details and feature quotas.
661. Trial accounts manager.
662. Subscription renewals tracker.
663. Expired subscriptions queue.
664. SaaS invoices register.
665. Collect subscription payment.
666. Feature plan access matrix.
667. Master feature flags list.
668. Per-hotel feature toggles (PMS, KDS, AI, QR).
669. Global beta feature rollout.
670. Instant feature rollback switch.
671. Feature deprecation manager.
672. Multi-tenant sales benchmarking.
673. Daily orders and booking volume analytics.
674. Active hotels geographical activity map.
675. API usage and quota monitor.
676. Platform revenue analytics.
677. Tenant churn analytics.
678. Global immutable audit trail.
679. Failed login attempts monitor.
680. Active sessions kill-board.
681. High-risk actions log.
682. Security exception alerts.
683. Scoped support access log.
684. Multi-tenant support tickets.
685. Ticket details and chat.
686. Internal support notes.
687. Broadcast platform announcement.
688. Scheduled maintenance notice.
689. View-only hotel impersonation console.
690. Node.js API latency and load monitor.
691. MongoDB connection pool and health monitor.
692. Redis and Socket.IO connections monitor.
693. Payment gateway webhooks status.
694. File/object storage quota monitor.
695. KDS and printer socket health monitor.
696. Real-time application error logger.
697. High latency pager alerts.
698. Platform emergency controls.
699. Global hotel emergency disable.
700. Global feature kill switch.
701. Safe system rollback trigger.
702. Emergency audit sign-off.
703. Automated database backup trigger.
704. Restore test drill execution.
705. Cloud snapshot validator.

### 7. Common Backend, Real-Time & Security Core (30 Features)
706. Tenant-aware service and repository layer (`hotelId` scoping).
707. Centralized schema validation (Zod/Joi).
708. Centralized error handling and safe error messages.
709. Centralized authorization and RBAC middleware.
710. MongoDB transactions and atomic operations.
711. Historical audit snapshots.
712. Database backup and restore testing procedures.
713. Real-time order events pipeline.
714. Real-time KDS state synchronization.
715. Real-time waiter request routing and alerts.
716. Real-time staff presence updates.
717. Real-time payment verification broadcasts.
718. Real-time table reassignment updates.
719. Real-time booking and front desk arrival alerts.
720. Real-time room service status updates.
721. Real-time guest request updates.
722. Real-time housekeeping task transitions.
723. Real-time maintenance escalation alerts.
724. Real-time room transfer synchronization.
725. Real-time express checkout alerts.
726. Strict finite state machine guards.
727. Optimistic concurrency and version locking.
728. Idempotency keys engine preventing duplicate mutations.
729. Server-side price, tax, and availability validation.
730. Atomic table, session, payment, and room mutations.
731. Argon2 / Bcrypt password hashing.
732. Short-lived access JWTs with secure refresh tokens.
733. Cryptographic QR session token generation and hashing.
734. HMAC SHA-256 webhook signature validation.
735. Ephemeral table session token expiration upon checkout.

---

## 🗄️ PART 5: THE 48 MONGODB SCHEMAS & ATTRIBUTE ARCHITECTURE

1. **`Tenants`:** `_id`, `name`, `slug`, `domain`, `logoUrl`, `address`, `gstin`, `fssai`, `contactEmail`, `contactPhone`, `currency` (INR), `status` (ACTIVE, SUSPENDED, TRIAL), `subscriptionPlanId`, `featureFlags` (Object), `createdAt`.
2. **`Branches`:** `_id`, `hotelId`, `branchName`, `code`, `address`, `phone`, `isActive`.
3. **`Users`:** `_id`, `hotelId`, `branchId`, `name`, `email`, `phone`, `passwordHash` (Argon2), `pinCode` (Hashed), `role` (SUPERADMIN, HOTEL_ADMIN, MANAGER, CASHIER, WAITER, CHEF, HOUSEKEEPING, MAINTENANCE), `permissions` (Array), `shiftStatus` (ON_DUTY, BUSY, DO_NOT_ASSIGN, LOCATION_RECHECKING, OUT_OF_AREA, OFFLINE), `activeDeviceId`, `mfaSecret`, `isMfaEnabled`, `isActive`.
4. **`Roles`:** `_id`, `hotelId`, `roleName`, `modulePermissions` (Map), `isCustom`.
5. **`AuditLogs`:** `_id`, `hotelId`, `actorId`, `actorRole`, `action`, `entityName`, `entityId`, `oldValues`, `newValues`, `reason`, `ipAddress`, `userAgent`, `timestamp`.
6. **`Subscriptions`:** `_id`, `hotelId`, `planName`, `billingCycle`, `price`, `startDate`, `endDate`, `status`, `paymentMethod`, `invoiceUrl`.
7. **`FeatureFlags`:** `_id`, `hotelId`, `flags` (Object: pmsEnabled, kdsEnabled, qrDineInEnabled, roomServiceEnabled, banquetEnabled, loyaltyEnabled, aiInsightsEnabled, tallyExportEnabled).
8. **`DiningTables`:** `_id`, `hotelId`, `branchId`, `tableNumber`, `section`, `capacity`, `currentStatus`, `activeSessionId`, `assignedWaiterId`, `qrTokenHash`, `coordinates` (x, y).
9. **`TableSessions`:** `_id`, `hotelId`, `tableId`, `sessionTokenHash`, `openedAt`, `closedAt`, `guestCount`, `customerName`, `customerPhone`, `status`, `totalAmount`, `discountAmount`, `taxAmount`, `finalAmount`.
10. **`MenuCategories`:** `_id`, `hotelId`, `name`, `slug`, `displayOrder`, `kitchenStationId`, `isActive`, `imageUrl`.
11. **`MenuItems`:** `_id`, `hotelId`, `categoryId`, `kitchenStationId`, `name`, `description`, `foodType`, `basePrice`, `hasVariants`, `variants` (Array), `addonGroups` (Array), `isAvailable`, `prepTimeMinutes`, `taxes` (Array), `images` (Array), `recipeId`, `hsnCode`.
12. **`ItemVariants`:** `_id`, `hotelId`, `menuItemId`, `name`, `priceDiff`.
13. **`ItemAddons`:** `_id`, `hotelId`, `groupName`, `minSelection`, `maxSelection`, `options` (Array).
14. **`KitchenStations`:** `_id`, `hotelId`, `stationName`, `screenToken`, `assignedChefIds`, `printerIp`, `printerPort`, `printerType`.
15. **`RestaurantOrders`:** `_id`, `hotelId`, `orderNumber`, `orderType`, `tableSessionId`, `tableId`, `stayId`, `roomId`, `folioId`, `waiterId`, `items` (Array of { menuItemId, variantId, quantity, itemStatus: PENDING/PREPARING/READY/SERVED/CANCELLED }), `cookingInstructions`, `orderStatus`, `placedAt`, `preparedAt`, `readyAt`, `servedAt`, `cancelledAt`, `cancellationReason`, `approvedBy`, `idempotencyKey`.
16. **`RestaurantBills`:** `_id`, `hotelId`, `billNumber`, `tableSessionId`, `orderIds` (Array), `subTotal`, `discountType`, `discountValue`, `discountApprovedBy`, `discountReason`, `taxBreakup` (Array), `serviceCharge`, `grandTotal`, `roundOff`, `billStatus`, `generatedAt`, `settledAt`.
17. **`Payments`:** `_id`, `hotelId`, `billId`, `folioId`, `paymentMode`, `amount`, `currency`, `gatewayTransactionId`, `gatewaySignature`, `utrNumber`, `status` (INITIATED, PROCESSING, SUCCESS, FAILED, EXPIRED, REFUNDED), `refundDetails`, `cashReceived`, `cashChangeReturned`, `collectedByUserId`, `timestamp`, `idempotencyKey`.
18. **`InventoryItems`:** `_id`, `hotelId`, `name`, `category`, `stockUnit`, `currentStockQuantity`, `minimumThreshold`, `costPerUnit`, `storageLocation`.
19. **`Recipes (BOM)`:** `_id`, `hotelId`, `menuItemId`, `variantId`, `ingredients` (Array of { inventoryItemId, quantityRequired, unit }), `isBOMDeductionEnabled`.
20. **`StockMovements`:** `_id`, `hotelId`, `inventoryItemId`, `movementType`, `quantity`, `unit`, `reason`, `performedByUserId`, `referenceOrderId`, `timestamp`.
21. **`StockRequests`:** `_id`, `hotelId`, `kitchenStationId`, `requestedByUserId`, `items` (Array), `status`, `approvedByUserId`, `fulfilledAt`.
22. **`Suppliers`:** `_id`, `hotelId`, `name`, `contactPerson`, `phone`, `email`, `gstin`, `address`, `paymentTermsDays`, `bankDetails`.
23. **`Purchases`:** `_id`, `hotelId`, `supplierId`, `poNumber`, `items` (Array), `totalAmount`, `invoiceNumber`, `invoiceFileUrl`, `paymentStatus`, `receivedDate`.
24. **`WastageLogs`:** `_id`, `hotelId`, `inventoryItemId`, `quantityWasted`, `unit`, `lossValue`, `wasteReason`, `loggedByUserId`, `approvedByUserId`.
25. **`RoomTypes`:** `_id`, `hotelId`, `name`, `code`, `baseCapacityAdults`, `baseCapacityChildren`, `maxCapacity`, `basePriceOvernight`, `basePriceDayUse`, `basePriceHourly`, `amenities`, `images`, `description`, `totalRoomsCount`.
26. **`Rooms`:** `_id`, `hotelId`, `roomNumber`, `roomTypeId`, `floorNumber`, `wing`, `status` (AVAILABLE, RESERVED, OCCUPIED, DIRTY, CLEANING, INSPECTION, OUT_OF_SERVICE), `currentStayId`, `keyCardNumber`, `permanentQrCodeHash`.
27. **`Bookings`:** `_id`, `hotelId`, `bookingNumber`, `bookingSource`, `guestId`, `checkInDate`, `checkOutDate`, `bookingMode`, `roomTypeId`, `allocatedRoomId` (Nullable until Check-In), `guestCountAdults`, `guestCountChildren`, `extraBedsCount`, `addOnsSelected`, `totalTariff`, `taxAmount`, `advancePaymentAmount`, `paymentStatus`, `bookingStatus`.
28. **`Guests`:** `_id`, `hotelId`, `fullName`, `phone`, `email`, `idProofType`, `idProofNumber`, `idProofDocumentUrl`, `isVip`, `vipTags`, `preferences`, `totalStaysCount`, `totalLifetimeSpend`, `internalStaffNotes`.
29. **`Stays`:** `_id`, `hotelId`, `bookingId`, `guestId`, `roomId`, `checkInTimestamp`, `expectedCheckOutTimestamp`, `actualCheckOutTimestamp`, `stayStatus`, `masterFolioId`, `keyCardIssued`, `checkedInByUserId`, `checkedOutByUserId`.
30. **`GuestSessions`:** `_id`, `hotelId`, `stayId`, `roomId`, `sessionTokenHash`, `lastKnownRoute`, `language`, `expiresAt`, `isActive`.
31. **`MasterFolios`:** `_id`, `hotelId`, `stayId`, `bookingId`, `roomId`, `folioNumber`, `totalRoomTariff`, `totalFoodAndBeverage`, `totalLaundry`, `totalPaidServices`, `totalDamageCharges`, `totalDiscounts`, `totalTaxes`, `advancePaid`, `netAmountPayable`, `folioStatus`.
32. **`FolioLineItems`:** `_id`, `hotelId`, `folioId`, `department`, `description`, `referenceId`, `rate`, `quantity`, `taxRate`, `taxAmount`, `netAmount`, `postedAt`, `postedByUserId`.
33. **`HousekeepingTasks`:** `_id`, `hotelId`, `roomId`, `taskType`, `priority`, `assignedAttendantId`, `status`, `checklistCompleted`, `startedAt`, `completedAt`, `inspectedByUserId`.
34. **`ServiceRequests`:** `_id`, `hotelId`, `sourceType`, `tableId`, `tableSessionId`, `roomId`, `stayId`, `requestType`, `priority`, `assignedUserId`, `routingLevel`, `status`, `slaMinutes`, `createdAt`, `acceptedAt`, `completedAt`.
35. **`LaundryOrders`:** `_id`, `hotelId`, `stayId`, `roomId`, `items` (Array), `totalAmount`, `status`, `folioLineItemId`.
36. **`MaintenanceRequests`:** `_id`, `hotelId`, `roomId`, `assetId`, `category`, `description`, `severity`, `assignedTechnicianId`, `status`, `sparePartsCost`, `externalVendorInvoice`.
37. **`Banquets`:** `_id`, `hotelId`, `eventName`, `hallName`, `eventDate`, `timeSlot`, `guestCount`, `perPlatePackageId`, `pricingType`, `totalEstimatedAmount`, `advanceDeposit`, `depositReceived`, `organizerDetails`, `status`, `eventFolioId`.
38. **`RestaurantReservations`:** `_id`, `hotelId`, `customerName`, `customerPhone`, `guestCount`, `reservationDate`, `timeSlot`, `allocatedTableIds`, `coverDepositAmount`, `depositStatus`, `reservationStatus`.
39. **`GiftVouchers`:** `_id`, `hotelId`, `voucherCode`, `initialValue`, `remainingBalance`, `validFrom`, `validTill`, `customerPhone`, `status`.
40. **`LoyaltyAccounts`:** `_id`, `hotelId`, `guestId`, `customerPhone`, `tier`, `pointsBalance`, `lifetimePointsEarned`, `history` (Array).
41. **`MarketingCampaigns`:** `_id`, `hotelId`, `campaignTitle`, `channel`, `targetSegment`, `messageTemplate`, `couponCodeAttached`, `scheduledAt`, `deliveryStatus`, `conversionCount`.
42. **`ShiftReconciliations`:** `_id`, `hotelId`, `cashierUserId`, `shiftStartTime`, `shiftEndTime`, `openingFloatCash`, `systemExpectedCash`, `actualCountedCash`, `varianceAmount`, `waiterCashHandovers`, `isApprovedByManager`, `reconciliationCertificateNumber`.
43. **`TaxRules`:** `_id`, `hotelId`, `taxName`, `rate`, `hsnSacCode`, `applicabilityType` (DINE_IN, ROOM_BELOW_7500, ROOM_ABOVE_7500, LIQUOR), `cgstRate`, `sgstRate`, `igstRate`, `isActive`.
44. **`RoomPricingRules`:** `_id`, `hotelId`, `roomTypeId`, `basePrice`, `weekendMultiplier`, `seasonalOverrides` (Array), `dayUseRate`, `hourlyRules` (Array), `extraBedRate`.
45. **`NotificationOutbox`:** `_id`, `hotelId`, `channel` (WHATSAPP, SMS, EMAIL), `recipient`, `payload`, `attempts`, `status` (QUEUED, DISPATCHED, FAILED), `retryAfter`, `providerResponse`.
46. **`DocumentsVault`:** `_id`, `hotelId`, `ownerType` (GUEST, VENDOR, HOTEL), `ownerId`, `documentType` (AADHAAR, PASSPORT, INVOICE, CONTRACT), `fileKey`, `mimeType`, `signedUrlExpiresAt`, `retentionPolicyDays`.
47. **`HotelAssets`:** `_id`, `hotelId`, `assetName`, `category`, `serialNumber`, `locationRoomId`, `warrantyTill`, `lastServiceDate`, `status` (OPERATIONAL, UNDER_MAINTENANCE).
48. **`IdempotencyKeys`:** `_id`, `hotelId`, `key`, `requestPath`, `responsePayload`, `lockedAt`, `expiresAt` (24h TTL).

---

## ⚡ PART 6: COMPLETE FINITE STATE MACHINES (WITH GUARDS & INVALID ACTIONS)

### 1. Restaurant Order FSM
```
[PLACED] ──(Chef accepts)──► [ACCEPTED] ──(Cooking starts)──► [PREPARING]
    │                                                               │
    │ (Allowed before prep)                                        ▼
    └──(Cancelled)──► [CANCELLED]                             [READY]
                                                                    │ (Waiter serves)
                                                                    ▼
                                                                [SERVED]
```
* **Guard:** Cancellation allowed by customer only while `PLACED`. Once `PREPARING`, requires Manager PIN.
* **Invalid Action:** Moving from `PLACED` directly to `SERVED` without kitchen acceptance.

### 2. Dining Table Lifecycle FSM
```
[AVAILABLE] ──(QR Scan / Guest sits)──► [OCCUPIED]
                                            │
                                            ▼ (Customer requests bill)
                                        [BILLING]
                                            │
                                            ▼ (Payment marked PAID)
                                   [PAYMENT_SETTLED]  <-- Table is NOT Available yet!
                                            │
                                            ▼ (Waiter physically closes table)
                                         [DIRTY]
                                            │
                                            ▼ (Cleaning in progress)
                                       [CLEANING] ──(Cleaned & inspected)──► [AVAILABLE]
```
* **Guard:** Transition to `DIRTY` requires waiter physical confirmation.
* **Invalid Action:** Marking table `AVAILABLE` immediately upon payment.

### 3. Hotel Room Lifecycle FSM
```
[AVAILABLE] ──(Checked-in)──► [OCCUPIED]
                                  │
                                  ▼ (Guest checks out)
                               [DIRTY]
                                  │ (Attendant starts cleaning)
                                  ▼
                              [CLEANING]
                                  │ (Cleaning finished)
                                  ▼
                             [INSPECTION]
                                  ├──(Inspection Passes)──► [AVAILABLE]
                                  └──(Inspection Fails)──► [CLEANING] (Re-clean loop)
```
* **Guard:** Front Desk can only assign rooms with status `AVAILABLE`.
* **Invalid Action:** Assigning a `DIRTY` or `CLEANING` room to a check-in guest.

### 4. Smart Waiter Request Auto-Routing FSM
```
[CREATED] ──(Smart Engine)──► [ASSIGNED] ──(Waiter Accepts)──► [ACCEPTED] ──► [IN_PROGRESS] ──► [COMPLETED]
                                   │
                                   ├──(Waiter Rejects)────────┐
                                   │                          ▼
                                   └──(SLA Timeout Breach)──► [ESCALATED_FALLBACK] ──► [ADMIN_INCIDENT_CENTER]
```
* **Guard:** SLA escalates automatically to Admin Incident Center if unaccepted.
* **Invalid Action:** Request completion without being accepted by assigned staff.

### 5. Payment Transaction FSM
```
[INITIATED] ──(Gateway processing)──► [PROCESSING]
                                           ├──(HMAC Webhook Verified)──► [SUCCESS / PAID]
                                           ├──(Gateway Reject/Timeout)──► [FAILED]
                                           ├──(Customer exits gateway)──► [EXPIRED]
                                           └──(Manager PIN Refund)────► [REFUND_PENDING] ──► [REFUNDED]
```
* **Guard:** Status `SUCCESS` is granted strictly upon HMAC SHA-256 signature verification.
* **Invalid Action:** Trusting client-side payment success callbacks.

---

## 🛠️ PART 7: THE 12 GRANULAR ENGINEERING PHASES

```
PHASE 1A: Project Scaffolding & Core Contracts
 ├── Monorepo setup (npm workspaces), TypeScript base configs
 ├── Docker Compose (Node backend, MongoDB replica set, Redis cluster)
 └── Shared Types & DTO contracts

PHASE 1B: Security, Auth & Multi-Tenancy Middleware
 ├── Argon2 password hashing, short-lived JWT & refresh tokens
 ├── Strict tenant isolation middleware (`req.hotelId`)
 └── Granular RBAC permissions engine

PHASE 1C: MongoDB 48 Schemas & Compound Indexes
 ├── Schema definitions with validation rules
 ├── Compound indexes (`hotelId` + unique fields)
 └── Comprehensive seed data generator (`npm run seed:demo`)

PHASE 1D: API Engine, Idempotency & Real-Time Socket Contract
 ├── Centralized error handling & audit logger
 ├── Distributed Idempotency lock engine
 └── Socket.IO server with authenticated tenant rooms

PHASE 2: Hotel Admin Restaurant Foundation (Website #5)
 ├── Menu Categories, Dishes, Variants & Addons Master
 ├── Visual Interactive Floor Plan & Dining Table Designer
 └── Staff Directory, Roles & Shift Rosters

PHASE 3: Frontline Restaurant Operations (Websites #1, #2, #3)
 ├── Website #1: Customer QR Dine-in (Menu, Cart, Seat allocation, Live tracker)
 ├── Website #3: Kitchen Display System (Stations, Hold/Fire, Item 86 toggle)
 └── Website #2: Waiter Terminal (Smart Routing, Floor Grid, Serve Confirmation)

PHASE 4: Billing, Payments & Testing Gate #1
 ├── Split Billing engine (Equal, Item-wise, Custom)
 ├── Cashier Blind Shift Close & Cash Drawer Reconciliation
 ├── Gateway webhook HMAC verification & No-Screenshot enforcement
 └── Testing Gate #1: Concurrency stress tests (double orders, table closure race)

PHASE 5: Hotel PMS Core & Public Room Booking (Websites #4 & #5)
 ├── Website #4: Public Direct Room Booking (Room Type availability, advance pay)
 ├── Website #5: Front Desk Visual Room Tape Chart & Room Allocation
 └── Check-in ID Verification (Aadhaar upload) & Active Stay creation

PHASE 6: In-Room Guest Portal & Dual-Link Room Service
 ├── Permanent Room QR & Browser Session Auto-Restore (Last-Page Reopen)
 ├── Shared Kitchen KDS Room Service ticket routing (`[ROOM_SERVICE]` badge)
 └── Dual-Link Folio Engine: In-Room dining charges posted to Master Folio

PHASE 7: Advanced PMS Operations (Housekeeping & Maintenance)
 ├── Housekeeping Priority Queue (`DIRTY ➔ CLEANING ➔ INSPECTION ➔ AVAILABLE`)
 ├── Linen tracking & Lost & Found digital vault
 └── Preventive Maintenance Scheduler, SLA Escalations & Equipment Costing

PHASE 8: Priority Business Extensions
 ├── Dedicated Restaurant Table Reservations Engine
 ├── Group & Multi-Room Corporate Bookings with Master Folio
 ├── Advanced CRM with VIP tagging & Guest preferences
 ├── Loyalty & Membership Points Ledger
 └── Marketing Campaign Broadcast Suite (WhatsApp/SMS/Email)

PHASE 9: Enterprise Gap-Closure Suites
 ├── Banquet & Event Management (Hall booking, FP prospectus, event folio)
 ├── Dedicated Fast Cashier POS Mode (Barcode scan, 10-key numpad shortcuts)
 ├── Multi-Payment Settlement (Split across Cash + UPI + Card)
 ├── Branch & Kitchen Raw Material Stock Transfer
 ├── Secure Document Management Vault
 └── Tally XML / GSTR-1 Tax Export Center

PHASE 10: SuperAdmin SaaS Control Platform (Website #6)
 ├── Multi-Tenant Hotel Provisioning Wizard
 ├── Per-Hotel Feature Flags Switchboard
 ├── Scoped View-Only Impersonation Console
 └── Emergency Platform Kill Switch & Safe Rollback

PHASE 11: Security Penetration & Load Testing Gate #2
 ├── Cross-tenant data leakage penetration tests
 ├── Concurrency tests: Last-room booking race condition
 ├── Socket reconnect resynchronization tests
 └── Disaster Recovery Restore Drills (RPO < 5 min, RTO < 15 min)

PHASE 12: Production Orchestration & Handover
 ├── Docker Compose production optimization
 ├── Health monitoring pagers & logging dashboards
 └── Final Operational Handover
```
