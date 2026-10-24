# 📜 SpiceHub Hospitality Suite: Authoritative Operational Policies & End-to-End Use-Cases Specification

---

## 🏛️ PART 1: HOTEL & RESTAURANT STANDARD OPERATING POLICIES (SOP)

### 1.1 PMS Front Desk, Check-In/Check-Out & Keycard Policy
* **Standard Schedules:**
  - Standard Check-In Time: `02:00 PM (14:00 hrs)`.
  - Standard Check-Out Time: `11:00 AM (11:00 hrs)`.
  - Complimentary Grace Period: `60 minutes` (until 12:00 PM) upon prior request.
* **Early Check-In Slabs:**
  - Before 06:00 AM: 100% full prior night room tariff applied.
  - Between 06:00 AM – 10:00 AM: 50% standard room tariff applied (subject to room availability).
  - Between 10:00 AM – 02:00 PM: Complimentary early check-in if clean/inspected room is ready.
* **Late Check-Out Slabs:**
  - Between 12:00 PM – 02:00 PM: Flat nominal fee or 25% room tariff.
  - Between 02:00 PM – 06:00 PM: 50% standard room tariff applied.
  - After 06:00 PM: 100% full night room tariff applied.
* **Keycard Security Policy:**
  - Maximum of 2 active RFID smart keycards issued per room.
  - Re-encoding or replacement keys require government photo ID matching PMS folio guest name.
  - Keycards automatically deactivate at 12:00 PM on the designated checkout date.

### 1.2 Mandatory Guest KYC & Identification Policy
* **Domestic Indian Guests:**
  - Mandatory government-issued photo ID required for every adult guest (Age 18+).
  - Accepted IDs: **Aadhaar Card, Passport, Driving License, Voter ID Card**.
  - PAN Card is strictly **NOT** accepted as proof of residence/identity for hotel stay (Govt. compliance).
* **International / Foreign National Guests:**
  - Mandatory original valid **Passport** and valid **Indian Visa / OCI card**.
  - Mandatory statutory online **Form C** submission to FRRO within 24 hours of guest arrival.
* **Digital Guest Registration Card (GRC):**
  - Mandatory physical or digital canvas signature confirming acceptance of house rules and billing liability.
  - Mandatory mobile phone number & email address for digital folio and GST invoice dispatch.

### 1.3 Reservation Guarantee, Advance Deposit & Cancellation Policy
* **Advance Deposit Requirement:**
  - Standard reservations require a minimum **50% advance deposit** or valid pre-authorized corporate credit guarantee to lock room inventory.
  - Peak season / Holiday blackout dates require **100% non-refundable advance deposit**.
* **Cancellation & Refund Slabs:**
  - **> 48 Hours prior to arrival:** 100% full refund (less 3% payment gateway processing charges).
  - **Between 48 Hours – 24 Hours prior to arrival:** 50% cancellation penalty; remaining 50% refunded or credited to hotel voucher.
  - **< 24 Hours prior to arrival or No-Show:** 100% non-refundable forfeiture of advance deposit.
* **Refund Processing Time:**
  - Approved refunds credited back to original source payment method within 5–7 banking business days.

### 1.4 Room Tariff, GST Invoicing & Incidental Security Deposit
* **Statutory Indian GST Slabs on Accommodation:**
  - Room Tariff up to ₹7,500 per unit/night: **12% GST** (6% CGST + 6% SGST).
  - Room Tariff exceeding ₹7,500 per unit/night: **18% GST** (9% CGST + 9% SGST).
* **Incidental Security Deposit:**
  - A pre-authorization hold or refundable deposit of ₹2,000 per night collected upon check-in to cover minibar, telephone, laundry, and room dining charges.
  - Released in full upon final room inspection during checkout.

### 1.5 Restaurant Dine-In, Table Turnover & Outside Food Policy
* **Table Occupancy & Turnover Guidelines:**
  - Peak Dining Rush Hours: Lunch (12:30 PM – 03:30 PM), Dinner (07:30 PM – 11:00 PM).
  - Maximum seating duration during peak rush: `90 minutes` per table.
  - Minimum ordering threshold: At least 1 main course or beverage item per adult seated.
* **Outside Food & Beverage Prohibition:**
  - Outside food, cooked meals, and commercial deliveries (e.g. Swiggy/Zomato) strictly prohibited in the restaurant dining hall and public lobby areas for food safety & FSSAI hygiene liability.
  - Birthday cakes permitted with prior manager clearance.

### 1.6 In-Room Dining (IRD) & Butler Service Policy
* **Operational SLA:**
  - IRD available 24 hours daily.
  - Minimum order value: **₹300** net.
  - Delivery Target SLA: Standard items `25–35 minutes`; Gourmet/Tandoor platters `35–45 minutes`.
  - Delivery Notification: Waiter / Butler sounds chime, delivers trolley inside room upon guest permission, and collects digital signature on tablet.
* **Tray & Trolley Clearance:**
  - Guests request tray clearance via Guest Room Portal or Speed Dial 4.
  - Mandatory retrieval SLA: Housekeeping/Butler must collect used trays within `30 minutes` of notification.

### 1.7 KOT Void, Item Return & Discount Authorization Policy
* **KOT Voiding Authorization Hierarchy:**
  - Waiters and Service Captains are **strictly prohibited** from directly voiding or deleting a punched KOT item.
  - A void request must specify a mandatory reason code:
    1. `WRONG_PUNCH` (Staff punching error)
    2. `KITCHEN_DELAY` (Order delayed past SLA threshold)
    3. `GUEST_DISLIKE` (Guest returned due to taste/temperature)
    4. `OUT_OF_STOCK` (Ingredient ran out post punch)
  - Voids up to ₹500: Floor Manager PIN approval required.
  - Voids exceeding ₹500: Cashier / Restaurant Manager authorization required and automatically logged into the Night Audit Void Journal.
* **Discount Matrix:**
  - Waiter: `0%` (No discounting authority).
  - Cashier / Floor Captain: Up to `10%` for service recovery or promo vouchers.
  - General Manager: `> 10%` up to 100% full managerial comp.

### 1.8 Menu 86 (Out-of-Stock) Policy
* Once an item or critical recipe ingredient is exhausted, the Head Chef marks the item as **86** on the Kitchen KDS terminal.
* The system instantly propagates an event to:
  1. Hide or mark "Sold Out" on Customer Table QR Menus (`:3001`).
  2. Flag "Temporarily Unavailable" on Guest In-Room Dining Portals (`:3004`).
  3. Disable order punching for that item on Waiter Mobile Terminals (`:3002`) and Cashier POS (`:3007`).

### 1.9 Cashier Shift Open, Float & Blind Cash Reconciliation Policy
* **Daily Cash Float:**
  - Every cashier starts each morning shift with a fixed opening float of **₹5,000** in verified standard currency denominations.
* **Mid-Shift Petty Cash:**
  - All petty cash withdrawals (e.g., local grocery emergency, delivery tip, gas cylinder) require a dual-signed Petty Cash Voucher.
* **Blind Shift Close & Handover Protocol:**
  - At shift end, the cashier must perform a **Blind Cash Count** (physically entering count of ₹500, ₹200, ₹100, ₹50, ₹20, ₹10 notes) **before** the POS reveals the expected system cash figure.
  - Acceptable Cash Variance: **₹0.00**.
  - Any variance exceeding **₹100** requires an immediate written explanation and joint sign-off with the Duty Manager.

### 1.10 Room Folio Credit Transfer (F&B to Room) Policy
* A restaurant dine-in or room service bill can be transferred to a guest's room folio only under the following conditions:
  1. Guest must have an active, validated check-in status in the PMS.
  2. Room folio must not be flagged "Cash-Only / No-Post" or exceed the guest's approved credit limit.
  3. Waiter/Cashier must enter Room Number, verify the displayed Guest Surname on screen, and obtain guest physical/digital signature.
  4. The posted amount immediately updates the PMS master folio in real-time.

### 1.11 Daily Night Audit & Business Date Rollover Policy
* **Audit Execution Window:** Daily between **02:00 AM – 04:00 AM**.
* **Pre-Audit Checklist:**
  - All restaurant dining tables must be closed and settled.
  - All open shift drawers must be reconciled and handed over.
  - All room status updates (Dirty/Clean/Inspected) must be verified.
* **Automated Audit Tasks:**
  - Automatically posts daily room tariffs and room GST to all occupied folios.
  - Reconciles total cash, credit card EDC batches, UPI QR collections, and company ledger debits.
  - Rolls the PMS business date by +1 day.
  - Generates Manager Flash Report, Tax Summary, and Void Journal.

### 1.12 Housekeeping Turnaround SLA & Room Release Policy
* **Room Status Lifecycle:** `DIRTY ➔ CLEANING ➔ INSPECTED ➔ AVAILABLE/READY`.
* **Standard Turnaround SLA:**
  - Standard Room Turnaround: `25 minutes`.
  - Deluxe & Suite Turnaround: `40 minutes`.
* **Inspection Protocol:**
  - A room cleaned by a housekeeper cannot be assigned to an incoming guest until a Housekeeping Supervisor conducts the 32-point digital checklist and changes status to **INSPECTED**.
  - The PMS frontdesk matrix reflects real-time status color changes instantly.

### 1.13 Lost & Found Vault Custody & Retention Policy
* **Found Item Logging SLA:** All items left behind by guests must be turned over to Housekeeping / Front Desk and logged into the Digital Lost & Found Vault within **60 minutes** of discovery.
* **Custody Details:** High-resolution photograph, discovery location (Room No./Table No.), date/time, and founder staff name.
* **Retention Timeline:**
  - Standard items (clothing, shoes, chargers, books): **90 days**.
  - High-value items (passports, cash, gold/jewelry, smartphones, laptops): **180 days** in the dual-custody safe.
  - Unclaimed perishable food/beverages: Discarded after 24 hours.
* **Claim Verification:** Claimant must provide matching identity proof, proof of stay, and precise item description before release.

### 1.14 Pet, Non-Smoking & Property Damage Penalty Policy
* **Strict Non-Smoking Policy:** All guest bedrooms, suites, and indoor public zones are 100% smoke-free. Violation incurs a non-negotiable **₹5,000 Deep-Cleaning & Ozone Sanitation Fine** posted to the room folio.
* **Pet Policy:** Pets permitted only in designated Garden Ground-Floor Suites with prior pet registration and ₹1,500/night sanitation fee.
* **Property Damage Sheet:** Linen burn/stain (₹1,200), TV screen damage (Market replacement cost), Broken glassware (₹250), Keycard loss (₹300).

### 1.15 Waiter Stationing, PAX Verification & Handoff Policy
* **Station Limits:** Each service waiter is assigned a maximum of **6 dining tables** per shift (e.g. Tables 01–06, Tables 07–12) to ensure high-touch hospitality.
* **Mandatory PAX Headcount:** Waiter must verify and confirm actual seated guest count (PAX) when seating guests or taking orders to prevent revenue leakage.
* **Assisted Cross-Table Orders:** If a guest at another waiter's table calls for service, the waiter uses the "Cross-Table Assist" workflow to punch items with proper station accountability.

---

## 🔄 PART 2: COMPLETE END-TO-END USE CASES (UC-01 TO UC-15)

```
========================================================================================================
USE CASE DIRECTORY
========================================================================================================
UC-01: Advance & Walk-In Guest Reservation & Express Check-In
UC-02: Guest Digital Room Portal In-Room Dining & Concierge Flow
UC-03: Customer QR Table Dine-In Ordering & Kitchen Dispatch
UC-04: Waiter Station Management, Order Taking & Live Ready Food Serving
UC-05: Kitchen KDS Order Lifecycle & Station Routing (Prep -> Ready -> Served)
UC-06: Table Transfer, Table Merging & Multi-Split Billing
UC-07: KOT Void Request, Wastage Audit & Manager Approval Workflow
UC-08: Cashier POS Dine-In / Takeaway Billing, Tender Settlement & Tax Invoice Print
UC-09: Direct F&B In-Room Charge Posting to PMS Guest Room Folio
UC-10: Cashier Shift Handover, Blind Cash Reconciliation & Petty Cash Audit
UC-11: PMS Daily Night Audit, Daily Room Posting & Business Date Rollover
UC-12: Housekeeping Room Turnaround, Digital Inspection & Auto-Release
UC-13: Store Requisition, Stock Out-of-Stock (86) & Supplier Purchase Order
UC-14: Lost & Found Digital Vault Custody Chain & Secure Guest Claim Release
UC-15: SuperAdmin Multi-Tenant Provisioning, Feature Flags & Property Policy Customization
========================================================================================================
```

### UC-01: Advance & Walk-In Guest Reservation & Express Check-In
* **Primary Actor:** Front Desk Receptionist / Guest
* **Supporting Actors:** Housekeeping Supervisor, Cashier
* **Preconditions:** Hotel PMS running; rooms configured in PMS Matrix; room in "Inspected / Ready" status.
* **Trigger:** Guest arrives at hotel reception for walk-in or booked reservation.
* **Main Success Scenario:**
  1. Receptionist searches reservation by Guest Name, Mobile Number, or Booking ID. If walk-in, receptionist clicks "Walk-in Check-in" and selects dates and room category.
  2. Receptionist inspects PMS Room Matrix grid for clean, inspected room matching guest preference.
  3. Receptionist collects Government Photo ID (Aadhaar/Passport) and records ID number and expiry.
  4. Guest signs Digital Registration Card (GRC) on front desk terminal.
  5. Receptionist collects advance payment or pre-authorization deposit (via Cash/UPI/Card).
  6. Receptionist clicks "Assign & Check-In".
  7. System transitions Room status from `VACANT_CLEAN` to `OCCUPIED`.
  8. Master Folio `#FOLIO-<Room>-<Year>` is automatically opened.
  9. RFID Keycard encoder writes room access data to smartcard.
  10. Guest Portal (`:3004`) unlocks authenticated guest session for the room.
* **Postconditions:** Room is marked occupied in PMS, folio active, keycards issued, welcome SMS/WhatsApp dispatched with room portal link.
* **Edge Cases:**
  - *No clean room available:* System alerts receptionist with dirty room turnaround priority; notifies Housekeeping for express turnaround.
  - *Guest arrives before 10:00 AM:* System automatically prompts for early check-in tariff charge approval.

---

### UC-02: Guest Digital Room Portal In-Room Dining & Concierge Flow
* **Primary Actor:** In-House Resident Guest
* **Supporting Actors:** Head Chef, Butler / Room Service Waiter, Front Desk
* **Preconditions:** Guest checked into active room; smartphone connected to Hotel Wi-Fi or QR scanned.
* **Trigger:** Guest opens Guest Room Portal (`:3004/?room=305`).
* **Main Success Scenario:**
  1. Guest views personalized greeting, WiFi password, stay details, and active folio balance.
  2. Guest taps "Food & Dining" to browse digital room service menu.
  3. Guest customizes items (e.g. "Club Sandwich - Extra Cheese, Brown Bread"), adds items to cart (min order ₹300 met), and clicks "Place In-Room Order".
  4. Backend generates KOT `#IRD-<OrderNo>` and emits real-time socket alert `order:created`.
  5. Kitchen KDS terminal sounds high-priority chime and displays ticket highlighted in purple: `[ROOM 305 - IN-ROOM DINING]`.
  6. Chef taps "Start Cooking" (Timer starts).
  7. Chef completes cooking, arranges platter on service trolley, and taps "Mark Ready".
  8. Room Service Waiter receives push alert on mobile terminal (`:3002`) with trolley delivery ticket.
  9. Waiter delivers order to Room 305, requests guest acknowledgment, and taps "Mark Delivered".
  10. Order total (Food + 5% GST) is automatically posted to Room 305 Master Folio.
  11. Guest portal order stepper updates to "Delivered & Charged to Room".
* **Postconditions:** Meal delivered to room; charge posted to PMS folio without cash transaction at door; tray pickup timer scheduled.

---

### UC-03: Customer QR Table Dine-In Ordering & Kitchen Dispatch
* **Primary Actor:** Dining Customer
* **Supporting Actors:** Kitchen Chef, Station Waiter
* **Preconditions:** Customer seated at dining table (e.g., Table 5); Table QR scanned.
* **Trigger:** Customer browses menu on smartphone (`:3001/?table=5`) and places order.
* **Main Success Scenario:**
  1. Customer adds items (e.g. 1x Paneer Butter Masala, 2x Butter Naan) to mobile cart.
  2. Customer inputs dietary instructions ("Make it spicy, no onion") and taps "Confirm & Place Order".
  3. System assigns unique Order ID and calculates 5% GST.
  4. Order is saved in MongoDB with status `PLACED`.
  5. Real-time event dispatched to Kitchen KDS (`:3003`) and Waiter Terminal (`:3002`).
  6. KDS printer/screen displays KOT ticket for Table 5.
  7. Customer screen shows live order tracking status ("Received by Chef").
* **Postconditions:** Order locked in DB, KDS ticket active, waiter station notified of new table order.

---

### UC-04: Waiter Station Management, Order Taking & Live Ready Food Serving
* **Primary Actor:** Waiter / Station Captain
* **Supporting Actors:** Kitchen Chef, Dining Customer
* **Preconditions:** Waiter logged in with Station PIN; assigned tables (e.g. T-07 to T-12).
* **Trigger:** Customer calls waiter for ordering or chef marks order ready.
* **Main Success Scenario:**
  1. Waiter logs into Waiter Mobile App (`:3002`) using 4-digit PIN (e.g. `1234`).
  2. App displays assigned tables with live status color codes (Green = Empty, Red = Running Order, Blue = Ready for Pickup).
  3. If punching order: Waiter taps Table 7 -> verifies PAX headcount -> taps items -> taps "Fire KOT to Kitchen".
  4. When Chef taps "Mark Ready" on KDS: Waiter phone sounds audio chime and displays high-priority banner: `"Table 7 Order #402 READY FOR PICKUP"`.
  5. Waiter walks to Kitchen pass, inspects items against ticket, and collects food.
  6. Waiter serves food to Table 7 guests.
  7. Waiter taps "Mark Served" on terminal.
  8. Pickup SLA timer stops; table status updates to "Dining / Served" across all systems.
* **Postconditions:** Food served hot within target SLA; table running bill reflects ordered items.

---

### UC-05: Kitchen KDS Order Lifecycle & Station Routing
* **Primary Actor:** Kitchen Chef / Line Cook
* **Supporting Actors:** Waiter, Cashier
* **Preconditions:** Kitchen KDS screen (`:3003`) active at kitchen expediter counter.
* **Trigger:** New KOT ticket arrives via Socket.IO from QR menu or Waiter terminal.
* **Main Success Scenario:**
  1. KDS plays incoming order bell and flashes ticket with elapsed timer `00:00`.
  2. Chef reviews items, quantities, and guest preparation notes.
  3. Chef taps "Start Cooking" -> ticket background turns Amber, status transitions to `PREPARING`.
  4. If cooking exceeds 15 minutes, timer color shifts to warning orange; at 25 minutes, it pulses red (SLA breach).
  5. Once ready, Chef taps "Mark Ready" -> ticket turns emerald green, status becomes `READY`.
  6. Instant websocket event notifies the specific assigned waiter terminal.
  7. When waiter picks up and marks served, ticket moves to KDS "Completed Orders" tab.
* **Postconditions:** Accurate cooking velocity metrics logged in ERP reports; waiter dispatch synchronized.

---

### UC-06: Table Transfer, Table Merging & Multi-Split Billing
* **Primary Actor:** Service Captain / Cashier
* **Supporting Actors:** Guests
* **Preconditions:** Running order exists on source table; destination table is available or needs merge.
* **Trigger:** Guests request to change tables (e.g., Table 4 to Table 12 on terrace) or split bill among friends.
* **Main Success Scenario:**
  - **Scenario A: Table Transfer**
    1. Waiter taps Table 4 -> selects "Table Options" -> taps "Transfer Table".
    2. Waiter picks destination Table 12.
    3. System migrates all running items, active KOTs, and elapsed time to Table 12.
    4. Table 4 is reset to `VACANT_CLEAN`; Table 12 becomes `OCCUPIED`.
  - **Scenario B: Split Billing**
    1. Cashier taps "Split Bills" on POS (`:3007`).
    2. Cashier selects split mode: "Split by Items" or "Split Equally (e.g. 3 ways)".
    3. System generates distinct sub-invoices: Bill #A (₹450), Bill #B (₹600).
    4. Each sub-invoice is settled independently via cash, card, or UPI.
* **Postconditions:** Accurate accounting per sub-party; audit trail maintained for transferred KOTs.

---

### UC-07: KOT Void Request, Wastage Audit & Manager Approval Workflow
* **Primary Actor:** Waiter (Requester), Floor Manager / Cashier (Approver)
* **Supporting Actors:** Kitchen Chef
* **Preconditions:** KOT already fired to kitchen; customer cancels dish or staff punched wrong item.
* **Trigger:** Waiter taps "Request Void" for an item on active table.
* **Main Success Scenario:**
  1. Waiter selects item to cancel (e.g., 1x Garlic Bread ₹180).
  2. System prompts for mandatory reason code: `WRONG_PUNCH`, `KITCHEN_DELAY`, `GUEST_DISLIKE`, or `OUT_OF_STOCK`.
  3. Waiter enters explanation notes and submits.
  4. Item status enters `VOID_PENDING`.
  5. Manager receives high-priority notification on Hotel Admin ERP / Cashier POS.
  6. Manager enters 4-digit Manager PIN, chooses whether to record item as "Food Wastage / Kitchen Discard" or "Raw Stock Reversal", and clicks "Approve Void".
  7. Item is struck through on KDS and deducted from POS running bill.
  8. Void log is committed to database audit table with timestamp, waiter ID, and manager ID.
* **Postconditions:** Running bill total corrected; voided item logged in Night Audit void journal.

---

### UC-08: Cashier POS Dine-In / Takeaway Billing, Tender Settlement & Tax Invoice Print
* **Primary Actor:** Cashier
* **Supporting Actors:** Guest / Customer
* **Preconditions:** Table order complete; guest requests final check.
* **Trigger:** Cashier opens POS (`:3007`) and selects table or takeaway bill.
* **Main Success Scenario:**
  1. Cashier reviews items, quantities, subtotal, 2.5% CGST, 2.5% SGST, and total payable.
  2. If applicable, cashier applies authorized promotional discount voucher.
  3. Guest specifies payment method:
     - **Cash:** Cashier inputs tender received (e.g. ₹1,000 for ₹840 bill); system displays change due (₹160).
     - **UPI:** POS displays dynamic UPI QR code on customer-facing terminal; payment confirmation webhook verifies transaction.
     - **Card:** Cashier punches EDC batch reference number.
     - **Split Tender:** (e.g. ₹500 Cash + ₹340 UPI).
  4. Cashier taps "Settle Bill & Print".
  5. System generates permanent GST Tax Invoice `#INV-<Year>-<Seq>`.
  6. Connected thermal receipt printer (80mm) cuts itemized tax receipt.
  7. Table status in PMS/POS transitions to `DIRTY_WAITING_BUSBOY` and then `VACANT_CLEAN`.
* **Postconditions:** Revenue added to cashier daily sales; inventory deducted; table released for next guest.

---

### UC-09: Direct F&B In-Room Charge Posting to PMS Guest Room Folio
* **Primary Actor:** Cashier / Waiter
* **Supporting Actors:** In-House Resident Guest
* **Preconditions:** Guest has active checked-in room with open credit line; F&B bill ready.
* **Trigger:** Guest requests to charge restaurant meal or room dining to room folio.
* **Main Success Scenario:**
  1. Cashier taps "Room Charges (F&B)" tab on POS.
  2. Cashier enters Room Number (e.g., `305`).
  3. System calls PMS API and returns: `Room 305 - Deluxe King - Guest: Vikram Singhania - Status: Active Stay - Folio: #FOLIO-305-2026`.
  4. Cashier verifies guest name matches and enters bill amount (₹1,420).
  5. Guest provides signature on terminal screen.
  6. Cashier clicks "Post Charge to Room".
  7. PMS master folio updates immediately:
     - `Line Item: F&B Restaurant Dine-in (KOT #412) - ₹1,352.38 + ₹67.62 GST = ₹1,420.00`.
  8. POS bill marked settled via tender type: `ROOM_CHARGE`.
* **Postconditions:** POS reconciled with ₹0 cash variance; PMS folio balance updated in real-time.

---

### UC-09: Cashier Shift Handover, Blind Cash Reconciliation & Petty Cash Audit
* **Primary Actor:** Outgoing Cashier, Incoming Cashier, Duty Manager
* **Preconditions:** Shift cycle ended (e.g., Morning Shift 07:00 AM – 03:00 PM).
* **Trigger:** Outgoing cashier taps "End Shift & Blind Close" on POS (`:3007`).
* **Main Success Scenario:**
  1. Outgoing cashier opens physical cash drawer and enters denomination count (number of ₹500, ₹200, ₹100, ₹50, ₹20, ₹10 notes and coins).
  2. Outgoing cashier enters total petty cash vouchers disbursed during shift.
  3. Cashier taps "Submit Blind Count".
  4. System computes:
     - `System Expected Cash = Opening Float (₹5,000) + Cash Sales - Petty Cash Disbursed`.
     - `Cash Variance = Actual Counted Cash - System Expected Cash`.
  5. If variance is ₹0: System displays green banner "Shift Perfectly Balanced".
  6. Incoming cashier verifies the ₹5,000 opening float for the next shift.
  7. Both cashiers and Duty Manager input PINs to finalize shift handover.
  8. Summary X-Report printed on thermal printer.
* **Postconditions:** Shift archived in DB; tender breakdown locked; new shift created for incoming cashier.

---

### UC-11: PMS Daily Night Audit, Daily Room Posting & Business Date Rollover
* **Primary Actor:** Night Auditor / Front Office Manager
* **Preconditions:** Business hour 02:00 AM reached; all POS terminals closed.
* **Trigger:** Auditor clicks "Execute Night Audit" on Hotel Admin ERP (`:3005`).
* **Main Success Scenario:**
  1. Night Audit engine verifies pre-requisites:
     - 0 unclosed restaurant tables (checks POS database).
     - All cashier shift drawers closed and reconciled.
     - All in-house rooms accounted for.
  2. Auditor clicks "Start Daily Room Tariff Posting".
  3. System iterates over all `OCCUPIED` rooms in PMS:
     - Posts room tariff line item (e.g., ₹4,500).
     - Posts statutory room GST (12% or 18%).
     - Increments room nights stayed counter.
  4. System generates Day-End Financial Summary (Gross Accommodation, F&B Revenue, Taxes, Payments Collected).
  5. Auditor clicks "Roll Business Date".
  6. System advances PMS Business Date from `24 Oct 2026` to `25 Oct 2026`.
  7. Automated Night Audit PDF report generated and emailed to General Manager & Financial Controller.
* **Postconditions:** Business date advanced; daily revenue finalized; folios updated for new calendar day.

---

### UC-12: Housekeeping Room Turnaround, Digital Inspection & Auto-Release
* **Primary Actor:** Housekeeper, Housekeeping Supervisor
* **Supporting Actors:** Front Desk Receptionist
* **Preconditions:** Guest checked out; Front Desk changed room status to `DIRTY`.
* **Trigger:** Housekeeper receives cleaning task on mobile or housekeeping board.
* **Main Success Scenario:**
  1. Room 204 appears highlighted in Red (`DIRTY`) on Housekeeping Turnaround App.
  2. Housekeeper taps "Start Cleaning" -> status changes to `CLEANING_IN_PROGRESS` (timer starts).
  3. Housekeeper completes turnaround: stripped linen replacement, sanitizing bathroom, restocking tea/coffee amenities, vacuuming floor.
  4. Housekeeper taps "Turnaround Complete" -> status changes to `CLEAN_NEEDS_INSPECTION`.
  5. Housekeeping Supervisor visits Room 204, opens digital inspection checklist (32 checkpoints: AC functioning, clean linen, spotless mirrors, keycard lock working).
  6. Supervisor taps "Pass Inspection & Release Room".
  7. Room status transitions to `INSPECTED_AVAILABLE` (Green).
  8. Reception Frontdesk PMS Matrix instantly reflects Room 204 as available for new walk-in or check-in.
* **Postconditions:** Room certified pristine; turnaround time logged; available for guest check-in.

---

### UC-13: Store Requisition, Stock Out-of-Stock (86) & Supplier Purchase Order
* **Primary Actor:** Head Chef, Store Manager, Purchasing Officer
* **Preconditions:** Inventory tracked in ERP Store Database.
* **Trigger:** Raw material stock drops below reorder threshold.
* **Main Success Scenario:**
  1. Chef notices Basmati Rice is running low (14 kg remaining, min threshold is 50 kg).
  2. Chef creates Store Requisition `#REQ-104` requesting 100 kg Basmati Royal Rice.
  3. Store Manager inspects main dry warehouse; if central store has stock, manager issues goods to Kitchen.
  4. If central store is also low: Purchasing Officer opens Inventory PO App on ERP.
  5. Officer selects approved supplier (`Royal Grain Wholesalers Ltd.`), inputs quantity (200 kg), unit price (₹85/kg), and payment terms (30 Days Credit).
  6. Officer clicks "Generate Purchase Order `#PO-2026-88`".
  7. PO PDF sent to supplier.
  8. When goods arrive at receiving dock: Storekeeper enters Goods Received Note (GRN), verifies weight, and system automatically increments current stock by +200 kg.
* **Postconditions:** Stock levels replenished; supplier accounts payable updated.

---

### UC-14: Lost & Found Digital Vault Custody Chain & Secure Guest Claim Release
* **Primary Actor:** Founder Staff (Housekeeper/Waiter), Vault Custodian, Guest (Claimant)
* **Preconditions:** Item found in guest room or dining hall.
* **Trigger:** Housekeeper discovers forgotten item (e.g., Apple iPad) in Room 305 after checkout.
* **Main Success Scenario:**
  1. Housekeeper brings item to Front Desk / Security Vault within 60 minutes.
  2. Vault Custodian opens Lost & Found Vault App on ERP (`:3005`).
  3. Custodian clicks "Log Found Item", captures photograph using terminal camera, logs category (`ELECTRONICS`), serial number, exact location (`Room 305 - bedside drawer`), and founder details.
  4. System assigns unique Vault Tag `#LF-2026-402` and generates tamper-evident barcode label.
  5. Item placed in secure dual-custody safe.
  6. Two days later, guest calls hotel inquiring about forgotten iPad.
  7. Receptionist searches vault by Room 305 -> locates `#LF-2026-402`.
  8. Guest visits hotel or sends authorized courier.
  9. Receptionist verifies guest photo ID, device passcode unlock proof, and collects signature.
  10. Custodian taps "Release Item" -> records claim release details and closes vault ticket.
* **Postconditions:** Item safely returned; full digital audit trail with photos and signatures archived for 1 year.

---

### UC-15: SuperAdmin Multi-Tenant Provisioning, Feature Flags & Property Policy Customization
* **Primary Actor:** SuperAdmin / Platform Owner
* **Supporting Actors:** Hotel General Manager
* **Preconditions:** SpiceHub SaaS multi-tenant platform active (`:3006`).
* **Trigger:** New hotel client signs contract (e.g. "The Heritage Grand Hotel").
* **Main Success Scenario:**
  1. SuperAdmin logs into SaaS Dashboard (`:3006`).
  2. Clicks "Create Hotel Property" -> inputs Hotel Name, Subdomain (`heritage.spicehub.in`), GSTIN, Total Rooms (60), Dining Tables (25).
  3. Selects Subscription Tier: `ENTERPRISE_SUITE` (includes PMS, KDS, POS, IRD, Guest Portal, Multi-Inventory).
  4. Configures Property Policy Defaults:
     - Check-in Time: 02:00 PM | Check-out Time: 11:00 AM.
     - Default Currency: `INR (₹)`.
     - GSTIN & Tax Slabs: 5% F&B, 12% / 18% PMS.
  5. System provisions isolated tenant database schema and creates Superuser Admin credentials.
  6. Hotel Manager logs into `:3005` using provisioned tenant credentials; all 8 portals automatically adhere to the configured tenant policies.
* **Postconditions:** Fully operational multi-tenant property live on the platform with isolated data and customized policies.

---
*End of Operational Policies and Use-Cases Specification.*
