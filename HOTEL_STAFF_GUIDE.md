# SpiceHub Enterprise Hospitality Platform — Hotel Staff Operating Guide

**Welcome to SpiceHub!**  
This guide provides daily operational procedures for hotel staff, floor captains, cashiers, chefs, front desk agents, and general managers across all 8 hospitality portals.

---

## 1. Quick Reference & Port Directory

| Department / Role | Portal Name | Port / URL | Default Staff PIN / Credentials | Key Daily Responsibility |
| :--- | :--- | :--- | :--- | :--- |
| **SaaS Owner** | Super Admin | `http://localhost:3006` | `admin@tajgateway.com` / `SpiceHub@123` | Provision hotels, plan billing, tenant branding |
| **General Manager** | Hotel Admin ERP | `http://localhost:3005` | PIN `1111` or admin credentials | RevPAR & ADR metrics, Room PMS matrix, Staff PINs, Z-Report |
| **Front Desk** | Reception Desk | `http://localhost:3008` | Direct / Staff token | Guest Check-In, KYC verification, Room allocation, Folio checkout |
| **Billing Desk** | Cashier POS | `http://localhost:3007` | PIN `2222` | Table billing, 5% GST computation, Multi-tender settlement, Shift close |
| **Floor Captain** | Waiter Mobile App | `http://localhost:3002` | PIN `3333` | Table assignment, Punch KOT, Offline order queue auto-sync, i18n |
| **Kitchen Team** | Kitchen KDS | `http://localhost:3003` | Station display | 3-Column board (Placed -> Cooking -> Ready), 80mm KOT print, 86 toggle |
| **In-Room Guests** | Guest Room Portal | `http://localhost:3004` | Room No. + Mobile | In-room dining, Housekeeping requests, Running folio, Express checkout |
| **Dine-In Guests** | Customer Table App | `http://localhost:3001` | QR Scan (Camera) | Veg/Non-Veg menu, Cart with GST, Order status tracker, Call Waiter |

---

## 2. Floor Captain & Waiter Guide (Port `:3002`)

### 2.1 Starting Your Shift
1. Open the Waiter Mobile App at `http://localhost:3002` on your Android tablet or handheld terminal.
2. Enter your 4-digit Captain PIN (e.g. `3333`).
3. You will see your assigned tables with real-time status indicators (Green = Available, Amber = Occupied, Blue = Food Served).

### 2.2 Punching a KOT (Kitchen Order Ticket)
1. Tap an assigned table (e.g. **Table 4**).
2. Tap dishes from the catalog to add them to the ticket. Use category tabs (Starters, Main Course, Breads, Beverages).
3. If the guest requests custom preparation (e.g. *"Extra spicy"*, *"No onion/garlic"*), tap the dish and type special instructions.
4. Tap **Fire KOT**. The order is instantly transmitted over WebSocket to the Kitchen KDS screen.

### 2.3 Offline Mode & Auto-Sync
- If the restaurant Wi-Fi drops temporarily, an **Offline Mode** pill appears in the top header.
- You can continue punching orders without interruption! Orders are safely queued in terminal storage (`spicehub_waiter_offline_orders`).
- As soon as Wi-Fi reconnects, the app automatically replays all queued KOTs to the kitchen, and a green confirmation banner announces: `✅ Synced N offline KOT orders to Kitchen KDS!`.

### 2.4 Multilingual Switcher (Hindi / English)
- Tap the **हिन्दी / EN** toggle button in the top navigation header at any time to switch dish labels, buttons, and status alerts into Hindi or English.

---

## 3. Kitchen & Chef KDS Guide (Port `:3003`)

### 3.1 Managing the Live Ticket Board
The KDS screen organizes incoming tickets into 3 visual columns:
1. **New / Placed (Red Header):** Freshly punched orders awaiting cook assignment.
2. **Preparing / Cooking (Amber Header):** Dishes currently in wok, tandoor, or grill. Tap **Start Cooking** to advance the ticket.
3. **Ready to Serve (Green Header):** Dishes plated and ready for pickup. Tap **Mark Ready** to notify the floor captain.

### 3.2 Audio Buzzer Alerts & Intercom
- Whenever a new KOT arrives or an urgent service call is triggered, the KDS emits an audio sound alert.
- To summon a waiter to the pass, tap **Call Floor Captain** on the ticket.

### 3.3 Printing 80mm Thermal KOTs
- Tap the **Printer** icon on any order card.
- A print-ready 80mm thermal slip opens with the table number, server name, ticket time, item quantities, and cooking instructions.

### 3.4 86-Item Quick Toggle (Out of Stock)
- If an ingredient runs out during peak service, tap the **86 Items** button in the header.
- Toggle the unavailable dish to **OFF**. It instantly disappears or marks "Sold Out" across the Customer App, Waiter App, and Room Service portal.

---

## 4. Cashier POS Guide (Port `:3007`)

### 4.1 Generating a Dining Bill
1. Select the dining table requesting settlement (e.g. **Table 4**).
2. The bill summary displays all consumed KOT orders with automatic **5% GST** calculation (2.5% CGST + 2.5% SGST).
3. Tap **Generate Bill**. The bill snapshot is locked against further edits.

### 4.2 Settling Payment & Tender Types
1. Tap **Pay / Settle Bill**.
2. Select the customer's chosen payment method:
   - **Cash:** Enter the cash amount tendered. If the customer hands ₹2,000 for a ₹1,850 bill, the system clamps the settlement to ₹1,850 and displays **Change Due: ₹150.00**.
   - **Dynamic UPI QR:** Generates a real-time UPI payment string with merchant VPA and exact bill amount for instant smartphone scanning.
   - **Credit / Debit Card:** Enter the card authorization reference number.
3. Tap **Confirm Payment**. The table status turns Green (Vacant/Available) and the settlement is permanently recorded in the immutable audit log.

### 4.3 End-of-Day Shift Close & Daily Z-Report
1. At shift close, navigate to the **Z-Report & Shift Close** tab.
2. Verify total gross sales, discounts, taxes collected, and cash drawer balance against physical cash.
3. Tap **Print Z-Report** to produce an 80mm thermal audit slip summarizing the entire business day.

---

## 5. Front Desk & Reception PMS Guide (Port `:3008`)

### 5.1 Walk-In Guest Check-In
1. Open the Reception Desk at `http://localhost:3008`.
2. Tap **New Check-In**.
3. Enter guest personal details, contact phone, ID proof type (Aadhaar / Passport / Voter ID), and ID number.
4. Select room category (Deluxe, Executive Suite, Presidential) and assign an available room.
5. Tap **Confirm Check-In**. The PMS creates the active stay record and room key credentials.

### 5.2 Room Status Matrix
- **Clean / Vacant (Green):** Ready for immediate guest allocation.
- **Occupied (Blue):** In-house resident currently residing.
- **Dirty / Housekeeping Required (Amber):** Needs linen change and sanitization before re-booking.
- **Maintenance (Red):** Out of order for repairs.

### 5.3 Guest Folio & Checkout
1. Select the departing room (e.g. **Room 302**).
2. Review the consolidated guest folio containing room tariff nights, in-room dining orders, laundry, and mini-bar charges.
3. Tap **Settle & Express Checkout**. Once zero balance is confirmed, room status shifts to **Dirty (Amber)** to alert Housekeeping.

---

## 6. General Manager & Hotel Admin Guide (Port `:3005`)

### 6.1 Operations Dashboard & Hospitality KPIs
- **RevPAR (Revenue Per Available Room):** `Total Room Revenue ÷ Total Available Rooms`.
- **ADR (Average Daily Rate):** `Room Revenue ÷ Rooms Sold`.
- **Occupancy %:** Live percentage of rooms currently occupied.

### 6.2 Staff PIN Management
- Go to **Staff Management**.
- Add, update, or revoke 4-digit PINs for floor stewards, cashiers, chefs, and housekeeping supervisors.

### 6.3 Audit Logs & Security Oversight
- Go to **Audit Logs**.
- Every bill settlement, item void, discount override, and tenant configuration change is immutably logged with user email, timestamp, and IP address.

---

## 7. Super Admin SaaS Platform Guide (Port `:3006`)

### 7.1 Managing Hotel Tenants
1. Login to Super Admin at `http://localhost:3006` (`admin@tajgateway.com` / `SpiceHub@123`).
2. View active hotels, subscribed plan tiers, monthly recurring revenue, and active device count.
3. To onboard a new hotel property, tap **Provision Hotel Tenant**.

### 7.2 White-Label Custom Branding
1. Select any hotel property in **Tenant Management**.
2. Open **Branding & White-Label**.
3. Choose the hotel's brand color using the live Hex color picker (e.g. `#d97706` for Royal Amber or `#0f766e` for Emerald Teal).
4. Enter the hotel's custom logo image URL.
5. Tap **Save Branding**. All 8 portal frontends immediately adopt the hotel's custom colors and brand identity!

---

## 8. Emergency Escalation Contacts

In case of operational or technical difficulties:
- **Lead System Administrator:** `sysadmin@spicehub.in` (Ext. 101)
- **POS & Payment Gateway Escalation:** `billing-support@spicehub.in` (Ext. 102)
- **Emergency Restart Command:** `curl -s http://localhost:5000/api/v1/health`
