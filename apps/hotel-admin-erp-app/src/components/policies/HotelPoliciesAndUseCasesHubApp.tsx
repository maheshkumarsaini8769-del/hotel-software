import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  BookOpen,
  FileText,
  Sliders,
  CheckCircle2,
  Clock,
  Shield,
  ShieldCheck,
  AlertTriangle,
  Flame,
  BedDouble,
  Receipt,
  Users,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Save,
  Check,
  Copy,
  Layers,
  Building2,
  Lock,
  DoorOpen,
  Coffee,
  Zap,
} from 'lucide-react';
import type { ErpModuleKey } from '../../types/erp';
import { API_BASE_URL, getStoredHotelId } from '../../config/api';
import { getPortalUrl } from '../../config/portalUrls';

interface HotelPoliciesAndUseCasesHubAppProps {
  isDark: boolean;
  hotelId?: string;
  onNavigateModule?: (moduleKey: ErpModuleKey) => void;
}

interface PolicyItem {
  id: string;
  code: string;
  category: 'PMS' | 'FNB' | 'BILLING' | 'HOUSEKEEPING' | 'SAFETY';
  title: string;
  badge: string;
  summary: string;
  rules: string[];
  complianceNote: string;
  activeThresholdDisplay: string;
}

interface UseCaseItem {
  id: string;
  code: string;
  roleCategory: 'GUEST_PMS' | 'DINING_WAITER' | 'KITCHEN_KDS' | 'CASHIER_BILLING' | 'HOUSEKEEPING_STORE' | 'SAAS_ADMIN';
  title: string;
  primaryActor: string;
  supportingActors: string[];
  trigger: string;
  preconditions: string;
  steps: { stepNo: number; actor: string; action: string }[];
  postconditions: string;
  edgeCase: string;
  targetModule?: ErpModuleKey;
  externalPortUrl?: string;
}

const STATIC_POLICIES: PolicyItem[] = [
  {
    id: 'pol-1',
    code: 'POL-01',
    category: 'PMS',
    title: 'Standard Check-In, Check-Out & Grace Period Policy',
    badge: 'Front Desk PMS',
    summary: 'Governs standard room arrival and departure schedules, complimentary grace windows, and early/late occupancy penalty billing.',
    rules: [
      'Standard Check-In Time is 02:00 PM (14:00 hrs); Check-Out Time is 11:00 AM (11:00 hrs).',
      'Complimentary Grace Period of up to 60 minutes permitted upon prior front desk registration.',
      'Early arrival before 06:00 AM incurs 100% full prior night tariff; between 06:00 AM – 10:00 AM incurs 50% tariff.',
      'Late departure past 12:00 PM incurs 25% tariff; past 02:00 PM incurs 50% tariff; past 06:00 PM incurs 100% full night tariff.',
      'Maximum of 2 RFID smart keycards issued per room; keycards auto-expire at 12:00 PM on departure date.',
    ],
    complianceNote: 'Mandatory display at Front Desk counter and digital booking confirmation vouchers.',
    activeThresholdDisplay: 'Check-in: 02:00 PM | Check-out: 11:00 AM | Grace: 60 mins',
  },
  {
    id: 'pol-2',
    code: 'POL-02',
    category: 'PMS',
    title: 'Mandatory Guest Identification & KYC Compliance Policy',
    badge: 'Legal & KYC',
    summary: 'Strict regulatory requirement to collect government-approved photo identity documents for all resident guests.',
    rules: [
      'Every adult guest (Age 18+) must furnish valid physical/original Government Photo ID before room allocation.',
      'Accepted domestic IDs: Aadhaar Card, Passport, Driving License, Voter ID Card.',
      'PAN Card is strictly NOT accepted as proof of residence/identity under Ministry of Tourism regulations.',
      'Foreign National Guests: Mandatory original Passport, valid Indian Visa/OCI, and online Form C submission within 24 hours.',
      'Mandatory physical or digital canvas signature on Guest Registration Card (GRC) confirming billing liability.',
    ],
    complianceNote: 'Failure to record valid KYC invokes immediate hotel operating license suspension.',
    activeThresholdDisplay: 'Aadhaar / Passport / Form C Statutory Mandate',
  },
  {
    id: 'pol-3',
    code: 'POL-03',
    category: 'PMS',
    title: 'Booking Guarantee, Advance Deposit & Cancellation Slabs Policy',
    badge: 'Revenue & Refunds',
    summary: 'Clear cancellation penalty thresholds and advance security deposit collection to protect hotel room inventory.',
    rules: [
      'Standard reservations require 50% advance deposit to guarantee room inventory.',
      'Cancellation > 48 hours prior to arrival: 100% full refund (less 3% payment gateway fee).',
      'Cancellation between 48 – 24 hours prior: 50% cancellation penalty applied.',
      'Cancellation < 24 hours or No-Show: 100% non-refundable deposit forfeiture.',
      'Approved refunds processed back to source account within 5–7 banking business days.',
    ],
    complianceNote: 'Slabs printed on automated booking confirmations and guest reservation portal.',
    activeThresholdDisplay: '>48h: Free | 48-24h: 50% | <24h: Non-Refundable',
  },
  {
    id: 'pol-4',
    code: 'POL-04',
    category: 'BILLING',
    title: 'Statutory Indian GST Taxation & Incidental Security Deposit Policy',
    badge: 'Taxation & Accounting',
    summary: 'Authoritative tax slabs applicable across room accommodation and food & beverage services.',
    rules: [
      'Room Tariff up to ₹7,500/night: 12% GST (6% CGST + 6% SGST).',
      'Room Tariff exceeding ₹7,500/night: 18% GST (9% CGST + 9% SGST).',
      'F&B Restaurant Dine-in and Takeaway: Flat 5% GST without Input Tax Credit (ITC).',
      'Refundable Incidental Security Deposit of ₹2,000 per night collected upon check-in to cover in-room incidentals.',
    ],
    complianceNote: 'HSN/SAC 9963 statutory compliance on all generated computerized tax invoices.',
    activeThresholdDisplay: 'Rooms: 12% / 18% | F&B: 5% GST | Deposit: ₹2,000/night',
  },
  {
    id: 'pol-5',
    code: 'POL-05',
    category: 'FNB',
    title: 'Restaurant Dine-In Turnover & Outside Food Restriction Policy',
    badge: 'Restaurant Dining',
    summary: 'Operating standards for dining hall seating, rush-hour table turnover, and food hygiene liability.',
    rules: [
      'Maximum table seating duration during peak rush: 90 minutes per dining party.',
      'Minimum ordering threshold: At least 1 main course or beverage item per adult seated.',
      'Outside food, commercial food delivery (Swiggy/Zomato), and outside beverages strictly prohibited in public areas.',
      'Service waiters assigned strict table stations (maximum 6 tables per waiter).',
      'PAX headcount must be verified upon seating guests to eliminate unbilled dining.',
    ],
    complianceNote: 'FSSAI Hygiene and Public Health compliance.',
    activeThresholdDisplay: 'Max Seating: 90 mins | Outside Food: Prohibited | Station: 6 Tables',
  },
  {
    id: 'pol-6',
    code: 'POL-06',
    category: 'FNB',
    title: 'In-Room Dining (IRD) Butler Service & Tray Clearance Policy',
    badge: 'Room Service & IRD',
    summary: 'SLA benchmarks for guest in-room food delivery, order packaging, and used service tray clearance.',
    rules: [
      'In-Room Dining available 24 hours daily with minimum order value of ₹300.',
      'Target Delivery SLA: Standard items 25–35 minutes; Gourmet platters 35–45 minutes.',
      'Delivery butler presents trolley, confirms guest identity, and obtains digital signature on tablet.',
      'F&B charges automatically posted directly to PMS room folio in real time.',
      'Mandatory tray clearance retrieval SLA: within 30 minutes of guest notification.',
    ],
    complianceNote: 'Continuous thermal temperature preservation in hot-box service trolleys.',
    activeThresholdDisplay: 'Min Order: ₹300 | SLA: 25-35 mins | Tray Clearance: 30 mins',
  },
  {
    id: 'pol-7',
    code: 'POL-07',
    category: 'FNB',
    title: 'KOT Void, Wastage Audit & Manager Discount Authorization Policy',
    badge: 'Kitchen & KOT',
    summary: 'Strict anti-leakage controls for voiding cooked or fired kitchen order tickets.',
    rules: [
      'Waiters cannot directly void or delete fired KOT tickets.',
      'Void request must cite mandatory reason code: WRONG_PUNCH, KITCHEN_DELAY, GUEST_DISLIKE, or OUT_OF_STOCK.',
      'Void items exceeding ₹500 require 4-digit Manager PIN approval.',
      'Discounts strictly governed: Waiter 0%, Floor Captain/Cashier up to 10%, GM approval for >10%.',
      'All void items logged into Night Audit Void Journal categorized as Food Wastage or Stock Reversal.',
    ],
    complianceNote: 'Prevents unauthorized kitchen pilferage and revenue leakage.',
    activeThresholdDisplay: 'Void PIN Threshold: ₹500 | Waiter Disc: 0% | Manager Disc: 10%',
  },
  {
    id: 'pol-8',
    code: 'POL-08',
    category: 'BILLING',
    title: 'Cashier Float, Blind Cash Count & Variance Investigation Policy',
    badge: 'Cashier POS',
    summary: 'Rigorous end-of-shift cash drawer balance protocols and tender reconciliation.',
    rules: [
      'Every cashier opens shift with a verified standard float of ₹5,000.',
      'Mid-shift petty cash disbursements require signed vouchers with duty manager co-signature.',
      'Blind Shift Handover: Cashier physically inputs note counts before POS displays expected figures.',
      'Acceptable Cash Variance: ₹0.00. Variance exceeding ₹100 triggers automated manager audit alert.',
      'Cash drawers locked between transactions; keys retained under dual custody.',
    ],
    complianceNote: 'Mandatory daily X-Report and Z-Report archiving.',
    activeThresholdDisplay: 'Float: ₹5,000 | Variance Limit: ₹0 | Alert Threshold: >₹100',
  },
  {
    id: 'pol-9',
    code: 'POL-09',
    category: 'HOUSEKEEPING',
    title: 'Housekeeping Turnaround SLA & Digital Room Release Policy',
    badge: 'Housekeeping',
    summary: 'SLA parameters for room turnaround, sanitary inspection, and frontdesk PMS release.',
    rules: [
      'Standard Room Turnaround SLA: 25 minutes; Deluxe/Suites: 40 minutes.',
      'Lifecycle: DIRTY -> CLEANING_IN_PROGRESS -> CLEAN_NEEDS_INSPECTION -> INSPECTED_AVAILABLE.',
      'Room cannot be assigned to walk-in guest until Housekeeping Supervisor completes 32-point inspection.',
      'Full linen and towel replacement between guest occupancies.',
      'Real-time color status synchronization with Front Desk Room Matrix.',
    ],
    complianceNote: 'ISO Hospitality Hygiene and Ozone Sanitation Standard.',
    activeThresholdDisplay: 'Turnaround: 25 mins | Mandatory Supervisor Sign-off',
  },
  {
    id: 'pol-10',
    code: 'POL-10',
    category: 'SAFETY',
    title: 'Lost & Found Digital Vault Custody & 90-Day Retention Policy',
    badge: 'Security Vault',
    summary: 'Custody protocols for guest belongings left in guestrooms or dining areas.',
    rules: [
      'All found items must be turned in and logged into the Digital Vault within 60 minutes of discovery.',
      'Log must record high-res photo, location, timestamp, and founder employee details.',
      'Standard items (clothing, chargers, books) retained for 90 days; High-value items (passports, cash, jewelry) for 180 days.',
      'Claim release requires matching government photo ID, stay verification, and signature.',
      'Unclaimed items disposed of through staff welfare auction or charity donation post retention.',
    ],
    complianceNote: 'Complete digital chain of custody with tamper-evident serial barcode labels.',
    activeThresholdDisplay: 'Log Window: 60 mins | Standard: 90 Days | Valuables: 180 Days',
  },
  {
    id: 'pol-11',
    code: 'POL-11',
    category: 'SAFETY',
    title: '100% Non-Smoking Enforcement & Hotel Property Damage Penalty Policy',
    badge: 'House Rules',
    summary: 'Protects room air quality, fire safety, and property assets from guest damage.',
    rules: [
      'All bedrooms, bathrooms, and indoor dining venues are 100% Non-Smoking.',
      'Smoking violation incurs a non-negotiable ₹5,000 Deep-Cleaning & Ozone Sanitation fine posted to room folio.',
      'Pet policy: Allowed only in designated garden suites with prior pet registration and ₹1,500/night sanitation fee.',
      'Property damage charged as per master price schedule: Stained linen ₹1,200, Broken TV replacement cost, Lost keycard ₹300.',
    ],
    complianceNote: 'National Fire Safety and Tobacco Control Act compliance.',
    activeThresholdDisplay: 'Smoking Fine: ₹5,000 | Pet Fee: ₹1,500/night',
  },
  {
    id: 'pol-12',
    code: 'POL-12',
    category: 'BILLING',
    title: 'Day-End PMS Night Audit & Daily Business Date Rollover Policy',
    badge: 'Night Audit',
    summary: 'Daily financial close procedure executed between 02:00 AM – 04:00 AM.',
    rules: [
      'Mandatory pre-condition: All dining tables closed and all cashier shifts reconciled.',
      'Night audit engine posts daily room tariff and room GST to all occupied guest folios.',
      'Reconciles cash, card EDC terminals, UPI batches, and corporate credit ledgers.',
      'Advances PMS business date by +1 calendar day.',
      'Generates automated Daily Manager Flash Report and Void Journal.',
    ],
    complianceNote: 'Audited financial reconciliation required before opening morning shift.',
    activeThresholdDisplay: 'Audit Window: 02:00 AM - 04:00 AM Daily',
  },
];

const STATIC_USE_CASES: UseCaseItem[] = [
  {
    id: 'uc-1',
    code: 'UC-01',
    roleCategory: 'GUEST_PMS',
    title: 'Advance & Walk-In Guest Reservation & Express Check-In',
    primaryActor: 'Front Desk Receptionist',
    supportingActors: ['Guest', 'Housekeeping Supervisor'],
    trigger: 'Guest arrives at hotel reception for walk-in or advance booking.',
    preconditions: 'PMS Matrix running; room in Inspected / Ready status; keycard encoder ready.',
    steps: [
      { stepNo: 1, actor: 'Receptionist', action: 'Searches booking by name/phone or clicks "Walk-in Check-in".' },
      { stepNo: 2, actor: 'Receptionist', action: 'Inspects room matrix grid and selects clean, inspected room.' },
      { stepNo: 3, actor: 'Receptionist', action: 'Scans & records Government Photo ID (Aadhaar / Passport) and mobile number.' },
      { stepNo: 4, actor: 'Guest', action: 'Signs Digital Registration Card (GRC) confirming house rules and billing.' },
      { stepNo: 5, actor: 'Receptionist', action: 'Collects advance payment or ₹2,000 incidental security deposit.' },
      { stepNo: 6, actor: 'Receptionist', action: 'Clicks "Assign & Check-In" -> PMS room changes to OCCUPIED (Red).' },
      { stepNo: 7, actor: 'System', action: 'Encodes RFID keycard and activates digital Guest Room Portal session.' },
    ],
    postconditions: 'Room marked occupied in PMS, Master Folio active, keycards issued, welcome link sent.',
    edgeCase: 'No clean room ready: System alerts Housekeeping for priority express turnaround.',
    targetModule: 'ROOM_MANAGEMENT',
    externalPortUrl: getPortalUrl('reception'),
  },
  {
    id: 'uc-2',
    code: 'UC-02',
    roleCategory: 'GUEST_PMS',
    title: 'Guest Digital Room Portal In-Room Dining & Concierge Flow',
    primaryActor: 'In-House Resident Guest',
    supportingActors: ['Kitchen Chef', 'Room Service Butler'],
    trigger: 'Guest opens mobile portal (:3004/?room=305) and orders food or housekeeping items.',
    preconditions: 'Guest checked into active room; smartphone connected to hotel Wi-Fi.',
    steps: [
      { stepNo: 1, actor: 'Guest', action: 'Browses digital In-Room Dining menu, selects items (min ₹300), and customizes dietary notes.' },
      { stepNo: 2, actor: 'Guest', action: 'Clicks "Place In-Room Order" -> KOT #IRD created and socket fired.' },
      { stepNo: 3, actor: 'Kitchen Chef', action: 'KDS sounds chime; Chef views ticket "[ROOM 305 - IRD]" and taps "Start Cooking".' },
      { stepNo: 4, actor: 'Kitchen Chef', action: 'Arranges meal on hot-box trolley and taps "Mark Ready".' },
      { stepNo: 5, actor: 'Butler', action: 'Receives pickup alert, rolls trolley to Room 305, and delivers meal.' },
      { stepNo: 6, actor: 'System', action: 'Order total (Food + 5% GST) automatically posted to Room 305 Master Folio.' },
      { stepNo: 7, actor: 'Guest', action: 'Portal order tracker updates to "Delivered & Charged to Room".' },
    ],
    postconditions: 'Meal served hot; charged to room folio without doorstep cash exchange; tray clearance scheduled.',
    edgeCase: 'Room folio flagged Cash-Only: System prompts guest to pay via online UPI before kitchen fires ticket.',
    targetModule: 'ROOM_MANAGEMENT',
    externalPortUrl: getPortalUrl('guest', '/?room=305'),
  },
  {
    id: 'uc-3',
    code: 'UC-03',
    roleCategory: 'DINING_WAITER',
    title: 'Customer QR Table Dine-In Ordering & Kitchen Dispatch',
    primaryActor: 'Dining Customer',
    supportingActors: ['Kitchen Chef', 'Station Waiter'],
    trigger: 'Customer scans QR code on dining table (:3001/?table=5).',
    preconditions: 'Dining table active and assigned to floor plan.',
    steps: [
      { stepNo: 1, actor: 'Customer', action: 'Browses interactive digital menu with photos, descriptions, and spices.' },
      { stepNo: 2, actor: 'Customer', action: 'Adds dishes to cart, specifies cooking notes, and clicks "Confirm Order".' },
      { stepNo: 3, actor: 'System', action: 'Generates Order ID, calculates 5% GST, and creates order with status PLACED.' },
      { stepNo: 4, actor: 'System', action: 'Emits socket event order:created to Kitchen KDS and Waiter terminal.' },
      { stepNo: 5, actor: 'Customer', action: 'Screen shows real-time progress stepper ("Chef is preparing your food").' },
    ],
    postconditions: 'Order saved in DB, KOT visible on KDS screen, station waiter alert triggered.',
    edgeCase: 'Customer orders item marked 86: System immediately warns "Item just sold out" and removes from cart.',
    targetModule: 'TABLE_MANAGEMENT',
    externalPortUrl: getPortalUrl('customer', '/?table=5'),
  },
  {
    id: 'uc-4',
    code: 'UC-04',
    roleCategory: 'DINING_WAITER',
    title: 'Waiter Station Management, Order Taking & Live Ready Food Serving',
    primaryActor: 'Station Waiter',
    supportingActors: ['Kitchen Chef', 'Dining Guest'],
    trigger: 'Guest requests order assistance or Kitchen marks order ready.',
    preconditions: 'Waiter logged in with PIN; tables T-07 to T-12 assigned.',
    steps: [
      { stepNo: 1, actor: 'Waiter', action: 'Logs into Waiter App (:3002) with 4-digit PIN; views assigned 6 tables.' },
      { stepNo: 2, actor: 'Waiter', action: 'Taps table -> confirms PAX headcount -> punches items -> fires KOT.' },
      { stepNo: 3, actor: 'Kitchen Chef', action: 'Taps "Mark Ready" on KDS when cooking is complete.' },
      { stepNo: 4, actor: 'Waiter', action: 'Phone sounds audio chime & flashes banner: "Table 7 Order #402 READY".' },
      { stepNo: 5, actor: 'Waiter', action: 'Collects platter from kitchen pass and serves to Table 7.' },
      { stepNo: 6, actor: 'Waiter', action: 'Taps "Mark Served" -> pickup SLA timer stops; table status updates.' },
    ],
    postconditions: 'Food served hot within SLA; running table bill updated with new items.',
    edgeCase: 'Guest at Table 2 (different waiter) calls: Waiter uses Cross-Table Assist modal to punch order safely.',
    targetModule: 'TABLE_MANAGEMENT',
    externalPortUrl: getPortalUrl('waiter'),
  },
  {
    id: 'uc-5',
    code: 'UC-05',
    roleCategory: 'KITCHEN_KDS',
    title: 'Kitchen KDS Order Lifecycle & Multi-Station Routing',
    primaryActor: 'Kitchen Chef / Expediter',
    supportingActors: ['Line Cooks', 'Waiters'],
    trigger: 'New KOT arrives in kitchen via Socket.IO.',
    preconditions: 'Kitchen KDS terminal active at cook station.',
    steps: [
      { stepNo: 1, actor: 'KDS Engine', action: 'Splits KOT by category: Tandoor items to KDS-1, Curries to KDS-2.' },
      { stepNo: 2, actor: 'Chef', action: 'Reviews ticket details and taps "Start Cooking" (turns Amber, timer runs).' },
      { stepNo: 3, actor: 'System', action: 'If cooking exceeds 15 mins: timer turns Orange; at 25 mins: pulses Red.' },
      { stepNo: 4, actor: 'Chef', action: 'Plates dish and taps "Mark Ready" (turns Emerald Green).' },
      { stepNo: 5, actor: 'System', action: 'Dispatches targeted push notification to assigned waiter terminal.' },
      { stepNo: 6, actor: 'System', action: 'When waiter serves food, ticket archives to Completed Orders.' },
    ],
    postconditions: 'Cooking velocity accurately logged for ERP kitchen analytics.',
    edgeCase: 'Kitchen runs out of paneer: Chef taps "Mark 86" on paneer items -> immediately disables on all menus.',
    targetModule: 'ORDERS_KITCHEN',
    externalPortUrl: getPortalUrl('kds'),
  },
  {
    id: 'uc-6',
    code: 'UC-06',
    roleCategory: 'DINING_WAITER',
    title: 'Table Transfer, Table Merging & Multi-Split Billing',
    primaryActor: 'Floor Captain / Cashier',
    supportingActors: ['Dining Guests'],
    trigger: 'Guests ask to move tables (e.g. from AC Hall to Terrace) or split bill among 3 people.',
    preconditions: 'Active running order on source table; destination table available.',
    steps: [
      { stepNo: 1, actor: 'Captain', action: 'Taps Table 4 -> selects "Transfer Table" -> selects destination Table 12.' },
      { stepNo: 2, actor: 'System', action: 'Migrates all active KOT items and elapsed order time to Table 12.' },
      { stepNo: 3, actor: 'System', action: 'Resets Table 4 to VACANT_CLEAN and marks Table 12 OCCUPIED.' },
      { stepNo: 4, actor: 'Cashier', action: 'When guests pay: taps "Split Bills" -> divides by items or equal shares.' },
      { stepNo: 5, actor: 'Cashier', action: 'Settles Bill #A (₹450 Cash) and Bill #B (₹600 UPI) independently.' },
    ],
    postconditions: 'Accurate tender tracking per sub-party; audit trail maintained.',
    edgeCase: 'Merged tables: Two large groups combine tables -> System merges running tickets into one master bill.',
    targetModule: 'POS_CASHIER',
    externalPortUrl: getPortalUrl('cashier'),
  },
  {
    id: 'uc-7',
    code: 'UC-07',
    roleCategory: 'CASHIER_BILLING',
    title: 'KOT Void Request, Wastage Audit & Manager Approval Workflow',
    primaryActor: 'Waiter (Requester), Floor Manager (Approver)',
    supportingActors: ['Kitchen Chef'],
    trigger: 'Customer cancels dish after KOT fired or waiter made a punch error.',
    preconditions: 'KOT already fired to kitchen; item appears on active order.',
    steps: [
      { stepNo: 1, actor: 'Waiter', action: 'Selects item to void (e.g. 1x Garlic Bread ₹180) and taps "Request Void".' },
      { stepNo: 2, actor: 'Waiter', action: 'Selects mandatory reason: WRONG_PUNCH, KITCHEN_DELAY, or GUEST_DISLIKE.' },
      { stepNo: 3, actor: 'System', action: 'Flags item as VOID_PENDING; notifies Manager ERP & Cashier POS.' },
      { stepNo: 4, actor: 'Manager', action: 'Inspects void queue, enters 4-digit PIN, and classifies as Food Wastage.' },
      { stepNo: 5, actor: 'Manager', action: 'Clicks "Approve Void" -> item deducted from bill and struck on KDS.' },
      { stepNo: 6, actor: 'System', action: 'Logs void entry to Night Audit Void Journal with timestamps and user IDs.' },
    ],
    postconditions: 'POS running total corrected; wastage cost recorded in food cost ledger.',
    edgeCase: 'Manager rejects void: Item remains on bill; message sent to waiter terminal.',
    targetModule: 'ORDERS_KITCHEN',
    externalPortUrl: getPortalUrl('cashier'),
  },
  {
    id: 'uc-8',
    code: 'UC-08',
    roleCategory: 'CASHIER_BILLING',
    title: 'Cashier POS Billing, Multi-Tender Settlement & Tax Invoice Print',
    primaryActor: 'Cashier',
    supportingActors: ['Customer'],
    trigger: 'Customer finishes meal and requests the bill.',
    preconditions: 'Table order completed; Cashier POS (:3007) active.',
    steps: [
      { stepNo: 1, actor: 'Cashier', action: 'Selects Table 5 -> reviews items, subtotal, 2.5% CGST, 2.5% SGST, Total.' },
      { stepNo: 2, actor: 'Cashier', action: 'Applies valid promo voucher or authorized manager discount if applicable.' },
      { stepNo: 3, actor: 'Customer', action: 'Chooses tender mode: Cash, dynamic UPI QR code, Card EDC, or Split.' },
      { stepNo: 4, actor: 'Cashier', action: 'Inputs payment received (e.g. ₹1,000 for ₹840 bill) -> system shows change due.' },
      { stepNo: 5, actor: 'Cashier', action: 'Clicks "Settle Bill & Print" -> generates tax invoice #INV-2026-1042.' },
      { stepNo: 6, actor: 'Thermal Printer', action: 'Prints itemized 80mm tax receipt; table released in POS and PMS.' },
    ],
    postconditions: 'Bill settled; inventory deducted; cash drawer updated; table cleared.',
    edgeCase: 'UPI payment pending: POS displays QR; webhook verifies bank transaction before invoice prints.',
    targetModule: 'POS_CASHIER',
    externalPortUrl: getPortalUrl('cashier'),
  },
  {
    id: 'uc-9',
    code: 'UC-09',
    roleCategory: 'CASHIER_BILLING',
    title: 'Posting F&B Bill Directly to PMS Guest Room Folio',
    primaryActor: 'Cashier / Waiter',
    supportingActors: ['In-House Resident Guest'],
    trigger: 'In-house resident guest requests to charge restaurant meal to room.',
    preconditions: 'Guest has active checked-in room with valid credit status; bill ready.',
    steps: [
      { stepNo: 1, actor: 'Cashier', action: 'Selects "Room Charges (F&B)" tab on Cashier POS.' },
      { stepNo: 2, actor: 'Cashier', action: 'Enters Room 305 -> system fetches guest name: Vikram Singhania.' },
      { stepNo: 3, actor: 'Cashier', action: 'Verifies surname with guest and inputs meal bill amount (₹1,420).' },
      { stepNo: 4, actor: 'Guest', action: 'Provides signature on terminal screen.' },
      { stepNo: 5, actor: 'Cashier', action: 'Clicks "Post Charge to Room" -> POS settles bill via tender ROOM_CHARGE.' },
      { stepNo: 6, actor: 'PMS Engine', action: 'Instantly posts line item to Room 305 Master Folio with KOT reference.' },
    ],
    postconditions: 'PMS master folio balance incremented; POS balanced with zero cash discrepancy.',
    edgeCase: 'Room folio has zero deposit or is flagged No-Post: System blocks posting and prompts for cash/card.',
    targetModule: 'POS_CASHIER',
    externalPortUrl: getPortalUrl('cashier'),
  },
  {
    id: 'uc-10',
    code: 'UC-10',
    roleCategory: 'CASHIER_BILLING',
    title: 'Cashier Shift Handover, Blind Cash Count & Petty Cash Audit',
    primaryActor: 'Outgoing Cashier, Incoming Cashier, Duty Manager',
    supportingActors: [],
    trigger: 'Cashier shift period ends (e.g. 03:00 PM shift change).',
    preconditions: 'All open bills on current shift settled or handed over.',
    steps: [
      { stepNo: 1, actor: 'Outgoing Cashier', action: 'Taps "End Shift & Blind Close" on POS (:3007).' },
      { stepNo: 2, actor: 'Outgoing Cashier', action: 'Physically counts and inputs count of ₹500, ₹200, ₹100, ₹50, ₹20, ₹10 notes.' },
      { stepNo: 3, actor: 'Outgoing Cashier', action: 'Inputs total petty cash vouchers disbursed during shift.' },
      { stepNo: 4, actor: 'System', action: 'Calculates System Expected vs Counted Cash; displays variance.' },
      { stepNo: 5, actor: 'Incoming Cashier', action: 'Verifies the ₹5,000 opening float for the next shift.' },
      { stepNo: 6, actor: 'Both Cashiers', action: 'Enter PINs to finalize shift handover; thermal printer prints X-Report.' },
    ],
    postconditions: 'Shift session locked; audit trail committed; fresh shift opened for next cashier.',
    edgeCase: 'Cash variance > ₹100: System requires joint manager authorization PIN and explanation memo.',
    targetModule: 'POS_CASHIER',
    externalPortUrl: getPortalUrl('cashier'),
  },
  {
    id: 'uc-11',
    code: 'UC-11',
    roleCategory: 'CASHIER_BILLING',
    title: 'PMS Daily Night Audit, Daily Room Posting & Business Date Roll',
    primaryActor: 'Night Auditor / Duty Manager',
    supportingActors: [],
    trigger: 'Daily scheduled audit time (02:00 AM) reached.',
    preconditions: 'All restaurant dining tables closed; shift drawers reconciled.',
    steps: [
      { stepNo: 1, actor: 'Auditor', action: 'Opens Night Audit App on ERP (:3005) and verifies pre-audit checks.' },
      { stepNo: 2, actor: 'Auditor', action: 'Clicks "Start Daily Room Tariff Posting".' },
      { stepNo: 3, actor: 'Night Audit Engine', action: 'Posts room tariff + 12%/18% GST to all occupied folios.' },
      { stepNo: 4, actor: 'Night Audit Engine', action: 'Reconciles total cash, credit card EDC batches, UPI QR, and folios.' },
      { stepNo: 5, actor: 'Auditor', action: 'Clicks "Roll Business Date" -> PMS date advances by +1 day.' },
      { stepNo: 6, actor: 'System', action: 'Generates Manager Flash Report, Tax Summary, and emails to GM & Controller.' },
    ],
    postconditions: 'Business date advanced; folios updated for new calendar day; financial lock established.',
    edgeCase: 'An open table remains unbilled: Audit stops and alerts auditor with table number to resolve.',
    targetModule: 'EXPENSES_ACCOUNTING',
    externalPortUrl: getPortalUrl('admin'),
  },
  {
    id: 'uc-12',
    code: 'UC-12',
    roleCategory: 'HOUSEKEEPING_STORE',
    title: 'Housekeeping Room Turnaround, Digital Inspection & Auto-Release',
    primaryActor: 'Housekeeper, Housekeeping Supervisor',
    supportingActors: ['Front Desk Receptionist'],
    trigger: 'Guest checks out; room flagged DIRTY on housekeeping board.',
    preconditions: 'Room in DIRTY status; cleaning supplies prepared.',
    steps: [
      { stepNo: 1, actor: 'Housekeeper', action: 'Views Room 204 highlighted Red on Housekeeping Turnaround App.' },
      { stepNo: 2, actor: 'Housekeeper', action: 'Taps "Start Cleaning" -> status changes to CLEANING_IN_PROGRESS.' },
      { stepNo: 3, actor: 'Housekeeper', action: 'Replaces linen, sanitizes bathroom, restocks amenities, vacuums floor.' },
      { stepNo: 4, actor: 'Housekeeper', action: 'Taps "Turnaround Complete" -> status changes to CLEAN_NEEDS_INSPECTION.' },
      { stepNo: 5, actor: 'Supervisor', action: 'Conducts 32-point digital checklist and taps "Pass Inspection & Release".' },
      { stepNo: 6, actor: 'PMS Engine', action: 'Room transitions to INSPECTED_AVAILABLE (Green) on Front Desk Matrix.' },
    ],
    postconditions: 'Room certified pristine; turnaround duration logged; available for guest check-in.',
    edgeCase: 'Housekeeper finds forgotten item: Taps "Log Lost & Found" -> triggers UC-14 custody workflow.',
    targetModule: 'HOUSEKEEPING',
    externalPortUrl: getPortalUrl('admin'),
  },
  {
    id: 'uc-13',
    code: 'UC-13',
    roleCategory: 'HOUSEKEEPING_STORE',
    title: 'Store Requisition, Stock Out-of-Stock (86) & Supplier Purchase Order',
    primaryActor: 'Head Chef, Store Manager, Purchasing Officer',
    supportingActors: ['Food Supplier'],
    trigger: 'Kitchen raw material stock drops below reorder threshold.',
    preconditions: 'Inventory catalog tracked in ERP database.',
    steps: [
      { stepNo: 1, actor: 'Head Chef', action: 'Notices Basmati Rice at 14 kg (min threshold 50 kg) -> submits Store Requisition.' },
      { stepNo: 2, actor: 'Purchasing Officer', action: 'Opens Inventory PO App on ERP (:3005).' },
      { stepNo: 3, actor: 'Purchasing Officer', action: 'Selects supplier, inputs quantity (200 kg @ ₹85/kg), generates PO #PO-2026-88.' },
      { stepNo: 4, actor: 'Purchasing Officer', action: 'Dispatches computerized PO PDF to supplier.' },
      { stepNo: 5, actor: 'Storekeeper', action: 'When goods arrive at dock: creates Goods Received Note (GRN) and verifies weight.' },
      { stepNo: 6, actor: 'System', action: 'Automatically increments current store stock by +200 kg and updates AP ledger.' },
    ],
    postconditions: 'Stock levels replenished; supplier accounts payable updated.',
    edgeCase: 'Immediate ingredient exhaustion before delivery: Chef flags item 86 on KDS to protect guest orders.',
    targetModule: 'PURCHASES_SUPPLIERS',
    externalPortUrl: getPortalUrl('admin'),
  },
  {
    id: 'uc-14',
    code: 'UC-14',
    roleCategory: 'HOUSEKEEPING_STORE',
    title: 'Lost & Found Digital Vault Custody Chain & Secure Guest Claim Release',
    primaryActor: 'Housekeeper (Founder), Vault Custodian, Guest (Claimant)',
    supportingActors: ['Front Desk Receptionist'],
    trigger: 'Housekeeper finds forgotten item (e.g. iPad) in Room 305 post checkout.',
    preconditions: 'Item discovered on hotel property.',
    steps: [
      { stepNo: 1, actor: 'Housekeeper', action: 'Turns item over to Front Desk/Security Vault within 60 minutes.' },
      { stepNo: 2, actor: 'Vault Custodian', action: 'Opens Lost & Found Vault App on ERP (:3005) and clicks "Log Found Item".' },
      { stepNo: 3, actor: 'Vault Custodian', action: 'Captures photo, logs category (ELECTRONICS), serial number, location, founder.' },
      { stepNo: 4, actor: 'System', action: 'Assigns unique Vault Tag #LF-2026-402 and prints barcode label.' },
      { stepNo: 5, actor: 'Guest', action: 'Calls hotel inquiring about iPad -> Receptionist searches vault and verifies item.' },
      { stepNo: 6, actor: 'Vault Custodian', action: 'Verifies guest photo ID and device passcode unlock proof.' },
      { stepNo: 7, actor: 'Vault Custodian', action: 'Taps "Release Item" -> records guest signature and closes vault ticket.' },
    ],
    postconditions: 'Item returned safely; complete digital custody audit trail archived for 1 year.',
    edgeCase: 'Unclaimed after 90/180 days: System flags ticket for Management Disposal / Welfare Auction review.',
    targetModule: 'MAINTENANCE',
    externalPortUrl: getPortalUrl('admin'),
  },
  {
    id: 'uc-15',
    code: 'UC-15',
    roleCategory: 'SAAS_ADMIN',
    title: 'SuperAdmin Multi-Tenant Provisioning & Property Policy Customization',
    primaryActor: 'SuperAdmin / Platform Owner',
    supportingActors: ['Hotel General Manager'],
    trigger: 'New hotel client subscribes to SpiceHub Hospitality Suite.',
    preconditions: 'SuperAdmin SaaS portal (:3006) active.',
    steps: [
      { stepNo: 1, actor: 'SuperAdmin', action: 'Logs into SaaS Portal (:3006) -> clicks "Provision New Hotel Property".' },
      { stepNo: 2, actor: 'SuperAdmin', action: 'Inputs hotel details: Name, Subdomain, GSTIN, Total Rooms (48), Tables (20).' },
      { stepNo: 3, actor: 'SuperAdmin', action: 'Selects Enterprise Suite (PMS, KDS, POS, IRD, Guest Portal, Multi-Inventory).' },
      { stepNo: 4, actor: 'SuperAdmin', action: 'Configures property policy defaults (Check-in 14:00, GST slabs, currency INR).' },
      { stepNo: 5, actor: 'System', action: 'Provisions isolated database schema, tenant ID, and Hotel Manager credentials.' },
      { stepNo: 6, actor: 'Hotel Manager', action: 'Logs into Hotel Admin ERP (:3005); all 8 portals reflect tenant policies.' },
    ],
    postconditions: 'Fully isolated multi-tenant property operational on live platform.',
    edgeCase: 'Hotel subscription expires: System sets read-only grace mode with automated renewal invoices.',
    targetModule: 'DASHBOARD',
    externalPortUrl: getPortalUrl('admin'),
  },
];

export const HotelPoliciesAndUseCasesHubApp: React.FC<HotelPoliciesAndUseCasesHubAppProps> = ({
  isDark,
  hotelId = getStoredHotelId(),
  onNavigateModule,
}) => {
  const [activeTab, setActiveTab] = useState<'POLICIES' | 'USE_CASES' | 'SETTINGS'>('POLICIES');
  const [policyCategoryFilter, setPolicyCategoryFilter] = useState<string>('ALL');
  const [useCaseRoleFilter, setUseCaseRoleFilter] = useState<string>('ALL');
  const [expandedPolicyId, setExpandedPolicyId] = useState<string | null>('pol-1');
  const [expandedUseCaseId, setExpandedUseCaseId] = useState<string | null>('uc-1');
  const [searchQuery, setSearchQuery] = useState('');

  // Live Policy Settings State
  const [policiesData, setPoliciesData] = useState<any>({
    checkInTime: '14:00',
    checkOutTime: '11:00',
    gracePeriodMinutes: 60,
    earlyCheckInChargePercent: 50,
    lateCheckOutChargePercent: 50,
    cancellationFreeHours: 48,
    cancellationPenaltyPercent: 50,
    cancellationStrictHours: 24,
    securityDepositPerNight: 2000,
    maxKeycardsPerRoom: 2,
    roomGstUnderThresholdPercent: 12,
    roomGstAboveThresholdPercent: 18,
    roomGstTariffThreshold: 7500,
    restaurantGstPercent: 5,
    serviceChargePercent: 5,
    minInRoomDiningOrderAmount: 300,
    inRoomDiningDeliverySlaMinutes: 30,
    tableTurnoverLimitMinutes: 90,
    kotVoidManagerPinThreshold: 500,
    waiterMaxDiscountPercent: 0,
    managerMaxDiscountPercent: 10,
    openingCashFloatAmount: 5000,
    cashierVarianceToleranceAmount: 0,
    cashierVarianceAlertThreshold: 100,
    nightAuditExecutionWindow: '02:00 AM - 04:00 AM',
    housekeepingTurnaroundSlaMinutes: 25,
    lostAndFoundStandardRetentionDays: 90,
    lostAndFoundValuableRetentionDays: 180,
    nonSmokingFineAmount: 5000,
    petSanitationFeePerNight: 1500,
    maxTablesPerWaiter: 6,
    updatedAt: new Date().toISOString(),
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const tenantQuery = hotelId ? { hotelId } : undefined;
  const tenantHeaders = hotelId ? { 'x-hotel-id': hotelId } : undefined;

  const fetchPolicies = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/restaurant-operations/policies`, {
        headers: tenantHeaders,
        params: tenantQuery,
      });
      if (res.data?.success && res.data?.data) {
        setPoliciesData(res.data.data);
      }
    } catch (err) {
      console.warn('Using default fallback policies:', err);
    }
  };

  // Load Policies from backend API for the active hotel only.
  useEffect(() => {
    void fetchPolicies();
  }, [hotelId]);

  const handleSavePolicies = async () => {
    setIsSaving(true);
    try {
      const res = await axios.put(
        `${API_BASE_URL}/restaurant-operations/policies`,
        policiesData,
        { headers: tenantHeaders, params: tenantQuery }
      );
      if (res.data?.success) {
        setSaveToast('Hotel operational policies successfully updated & deployed across all 8 portals!');
        setTimeout(() => setSaveToast(null), 4000);
      }
    } catch (err: any) {
      setSaveToast(
        err?.response?.data?.message ||
          err?.message ||
          'Policy update failed. No changes were saved.'
      );
      setTimeout(() => setSaveToast(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered Policies
  const filteredPolicies = STATIC_POLICIES.filter((p) => {
    if (policyCategoryFilter !== 'ALL' && p.category !== policyCategoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q) ||
        p.rules.some((r) => r.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Filtered Use Cases
  const filteredUseCases = STATIC_USE_CASES.filter((u) => {
    if (useCaseRoleFilter !== 'ALL' && u.roleCategory !== useCaseRoleFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        u.title.toLowerCase().includes(q) ||
        u.code.toLowerCase().includes(q) ||
        u.primaryActor.toLowerCase().includes(q) ||
        u.trigger.toLowerCase().includes(q) ||
        u.steps.some((s) => s.action.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const getCategoryColor = (category: PolicyItem['category']) => {
    switch (category) {
      case 'PMS':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'FNB':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'BILLING':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'HOUSEKEEPING':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      case 'SAFETY':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed top-6 right-6 z-50 px-4 py-3 rounded-xl bg-emerald-600 text-white shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div
        className={`p-6 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden shadow-sm ${
          isDark
            ? 'bg-gradient-to-r from-slate-900 via-[#0e121e] to-slate-900 border-slate-800'
            : 'bg-gradient-to-r from-white via-amber-50/40 to-white border-slate-200'
        }`}
      >
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
              SpiceHub Governance & SOP Studio
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
              v2.8 Enterprise
            </span>
          </div>
          <h1 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Operational Policies & 15 End-to-End Use-Cases
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Authoritative hotel and restaurant operating procedures, statutory Indian GST compliance guidelines,
            and real-world workflow lifecycle simulations across Front Desk, KDS, POS, Waiter, and Housekeeping.
          </p>
        </div>

        <div className="flex items-center gap-2 z-10">
          <button
            onClick={fetchPolicies}
            className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
            title="Reload from API"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <a
            href={`${API_BASE_URL}/restaurant-operations/policies`}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2.5 rounded-xl bg-amber-500 text-black hover:bg-amber-400 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Policy JSON API</span>
          </a>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('POLICIES')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition ${
              activeTab === 'POLICIES'
                ? 'bg-amber-500 text-black shadow-md'
                : isDark
                ? 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>1. Policy Manual & SOP ({STATIC_POLICIES.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('USE_CASES')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition ${
              activeTab === 'USE_CASES'
                ? 'bg-amber-500 text-black shadow-md'
                : isDark
                ? 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>2. 15 Use-Cases Studio</span>
          </button>

          <button
            onClick={() => setActiveTab('SETTINGS')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition ${
              activeTab === 'SETTINGS'
                ? 'bg-amber-500 text-black shadow-md'
                : isDark
                ? 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>3. Live Rules Engine Config</span>
          </button>
        </div>

        {/* Global Search Input */}
        {activeTab !== 'SETTINGS' && (
          <div className="w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rules, keywords, actors..."
              className={`w-full px-3 py-2 rounded-xl text-xs border outline-none font-medium transition ${
                isDark
                  ? 'bg-slate-900/80 border-slate-800 text-slate-200 placeholder:text-slate-500 focus:border-amber-500'
                  : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-amber-500'
              }`}
            />
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: POLICY MANUAL & SOP RULES                                      */}
      {/* ===================================================================== */}
      {activeTab === 'POLICIES' && (
        <div className="space-y-4">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'ALL', label: 'All Operating Policies' },
              { id: 'PMS', label: 'Front Desk & Rooms' },
              { id: 'FNB', label: 'F&B & Dining' },
              { id: 'BILLING', label: 'POS & Billing' },
              { id: 'HOUSEKEEPING', label: 'Housekeeping' },
              { id: 'SAFETY', label: 'Safety & Vault' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setPolicyCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                  policyCategoryFilter === cat.id
                    ? 'bg-amber-500 text-black shadow-sm'
                    : isDark
                    ? 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Policy Cards Grid */}
          <div className="space-y-3">
            {filteredPolicies.map((policy) => {
              const isExpanded = expandedPolicyId === policy.id;
              const catColor = getCategoryColor(policy.category);

              return (
                <div
                  key={policy.id}
                  className={`rounded-2xl border transition-all ${
                    isExpanded
                      ? isDark
                        ? 'bg-slate-900/90 border-slate-700 shadow-md ring-1 ring-amber-500/20'
                        : 'bg-white border-slate-300 shadow-md ring-1 ring-amber-500/20'
                      : isDark
                      ? 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900/70'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div
                    onClick={() => setExpandedPolicyId(isExpanded ? null : policy.id)}
                    className="p-4 flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-black font-mono border ${catColor}`}>
                        {policy.code}
                      </span>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <h3 className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {policy.title}
                          </h3>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border hidden sm:inline ${catColor}`}>
                            {policy.badge}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">{policy.summary}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="hidden md:inline-block px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-slate-800/80 text-amber-400 border border-slate-700">
                        {policy.activeThresholdDisplay}
                      </span>
                      <button className="text-slate-400 hover:text-white p-1">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Body */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 border-t border-slate-800/60 space-y-4 text-xs">
                      <div className="space-y-2">
                        <h4 className="font-bold text-slate-300 uppercase text-[10px] tracking-wider">
                          Official Standard Operating Rules:
                        </h4>
                        <ul className="space-y-1.5">
                          {policy.rules.map((rule, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-slate-400 leading-relaxed">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <span>{rule}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-2.5 text-amber-300">
                        <Shield className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                        <div>
                          <span className="font-bold">Compliance Note: </span>
                          <span className="text-slate-300">{policy.complianceNote}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: 15 END-TO-END USE CASES STUDIO                                 */}
      {/* ===================================================================== */}
      {activeTab === 'USE_CASES' && (
        <div className="space-y-4">
          {/* Role Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'ALL', label: 'All 15 Workflows' },
              { id: 'GUEST_PMS', label: 'Front Desk & Guest (2)' },
              { id: 'DINING_WAITER', label: 'Dining & Waiter (3)' },
              { id: 'KITCHEN_KDS', label: 'Kitchen & KDS (1)' },
              { id: 'CASHIER_BILLING', label: 'Cashier & Night Audit (4)' },
              { id: 'HOUSEKEEPING_STORE', label: 'Housekeeping & Stores (3)' },
              { id: 'SAAS_ADMIN', label: 'SaaS SuperAdmin (1)' },
            ].map((role) => (
              <button
                key={role.id}
                onClick={() => setUseCaseRoleFilter(role.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                  useCaseRoleFilter === role.id
                    ? 'bg-amber-500 text-black shadow-sm'
                    : isDark
                    ? 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {role.label}
              </button>
            ))}
          </div>

          {/* Use-Cases Accordion List */}
          <div className="space-y-3">
            {filteredUseCases.map((uc) => {
              const isExpanded = expandedUseCaseId === uc.id;

              return (
                <div
                  key={uc.id}
                  className={`rounded-2xl border transition-all ${
                    isExpanded
                      ? isDark
                        ? 'bg-slate-900/90 border-slate-700 shadow-md ring-1 ring-amber-500/20'
                        : 'bg-white border-slate-300 shadow-md ring-1 ring-amber-500/20'
                      : isDark
                      ? 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900/70'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div
                    onClick={() => setExpandedUseCaseId(isExpanded ? null : uc.id)}
                    className="p-4 flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-black font-mono border text-amber-400 bg-amber-500/10 border-amber-500/30">
                        {uc.code}
                      </span>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <h3 className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {uc.title}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span>Primary Actor: <strong className="text-slate-200">{uc.primaryActor}</strong></span>
                          <span>•</span>
                          <span className="truncate">Trigger: {uc.trigger}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {uc.targetModule && onNavigateModule && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateModule(uc.targetModule!);
                          }}
                          className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-black hover:bg-amber-400 transition"
                        >
                          <span>Open Module</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                      <button className="text-slate-400 hover:text-white p-1">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Lifecycle Steps */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 border-t border-slate-800/60 space-y-4 text-xs">
                      {/* Preconditions & Trigger Banner */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Preconditions:</span>
                          <p className="text-slate-200 mt-0.5">{uc.preconditions}</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Trigger Event:</span>
                          <p className="text-slate-200 mt-0.5">{uc.trigger}</p>
                        </div>
                      </div>

                      {/* Sequential Workflow Steps */}
                      <div className="space-y-2">
                        <h4 className="font-bold text-slate-300 uppercase text-[10px] tracking-wider">
                          Sequential Execution Lifecycle (Step-by-Step):
                        </h4>
                        <div className="space-y-2">
                          {uc.steps.map((st) => (
                            <div
                              key={st.stepNo}
                              className={`p-3 rounded-xl border flex items-start gap-3 ${
                                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                              }`}
                            >
                              <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-bold text-xs shrink-0">
                                {st.stepNo}
                              </div>
                              <div className="space-y-0.5">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                                  {st.actor}
                                </span>
                                <p className="text-slate-300 leading-relaxed text-xs">{st.action}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Postconditions & Edge Case */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/40 text-emerald-300">
                          <span className="font-bold block text-[10px] uppercase tracking-wider">Postconditions:</span>
                          <span className="text-slate-300 mt-0.5 block">{uc.postconditions}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-900/40 text-rose-300">
                          <span className="font-bold block text-[10px] uppercase tracking-wider">Edge-Case Handling:</span>
                          <span className="text-slate-300 mt-0.5 block">{uc.edgeCase}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: LIVE POLICY PARAMETER RULES ENGINE                             */}
      {/* ===================================================================== */}
      {activeTab === 'SETTINGS' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div>
              <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Operational Thresholds & Live Rules Engine
              </h2>
              <p className="text-xs text-slate-400">
                Adjust numeric and policy thresholds. Changes are committed to the backend database and propagated across portals.
              </p>
            </div>

            <button
              onClick={handleSavePolicies}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 text-black hover:bg-amber-400 transition shadow-md disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Deploying...' : 'Save & Deploy Policies'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* 1. PMS Front Desk Schedulers */}
            <div
              className={`p-5 rounded-2xl border space-y-4 ${
                isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider">
                <DoorOpen className="w-4 h-4" />
                <span>PMS & Room Schedulers</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Standard Check-In Time</label>
                  <input
                    type="time"
                    value={policiesData.checkInTime}
                    onChange={(e) => setPoliciesData({ ...policiesData, checkInTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Standard Check-Out Time</label>
                  <input
                    type="time"
                    value={policiesData.checkOutTime}
                    onChange={(e) => setPoliciesData({ ...policiesData, checkOutTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Complimentary Grace Period (Minutes)</label>
                  <input
                    type="number"
                    value={policiesData.gracePeriodMinutes}
                    onChange={(e) => setPoliciesData({ ...policiesData, gracePeriodMinutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Incidental Security Deposit (₹ / night)</label>
                  <input
                    type="number"
                    value={policiesData.securityDepositPerNight}
                    onChange={(e) => setPoliciesData({ ...policiesData, securityDepositPerNight: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            {/* 2. Cancellation & Refunds */}
            <div
              className={`p-5 rounded-2xl border space-y-4 ${
                isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4" />
                <span>Cancellation & Refunds</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Free Cancellation Window (Hours prior)</label>
                  <input
                    type="number"
                    value={policiesData.cancellationFreeHours}
                    onChange={(e) => setPoliciesData({ ...policiesData, cancellationFreeHours: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Cancellation Penalty (48h–24h) (%)</label>
                  <input
                    type="number"
                    value={policiesData.cancellationPenaltyPercent}
                    onChange={(e) => setPoliciesData({ ...policiesData, cancellationPenaltyPercent: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Late Check-Out Charge (%)</label>
                  <input
                    type="number"
                    value={policiesData.lateCheckOutChargePercent}
                    onChange={(e) => setPoliciesData({ ...policiesData, lateCheckOutChargePercent: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Non-Smoking Fine (₹)</label>
                  <input
                    type="number"
                    value={policiesData.nonSmokingFineAmount}
                    onChange={(e) => setPoliciesData({ ...policiesData, nonSmokingFineAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            {/* 3. F&B, KOT & In-Room SLAs */}
            <div
              className={`p-5 rounded-2xl border space-y-4 ${
                isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                <Coffee className="w-4 h-4" />
                <span>F&B, KOT & Room Dining</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Min. In-Room Dining Order (₹)</label>
                  <input
                    type="number"
                    value={policiesData.minInRoomDiningOrderAmount}
                    onChange={(e) => setPoliciesData({ ...policiesData, minInRoomDiningOrderAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">In-Room Dining SLA Target (Mins)</label>
                  <input
                    type="number"
                    value={policiesData.inRoomDiningDeliverySlaMinutes}
                    onChange={(e) => setPoliciesData({ ...policiesData, inRoomDiningDeliverySlaMinutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">KOT Void Manager PIN Threshold (₹)</label>
                  <input
                    type="number"
                    value={policiesData.kotVoidManagerPinThreshold}
                    onChange={(e) => setPoliciesData({ ...policiesData, kotVoidManagerPinThreshold: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Max Manager Discount Limit (%)</label>
                  <input
                    type="number"
                    value={policiesData.managerMaxDiscountPercent}
                    onChange={(e) => setPoliciesData({ ...policiesData, managerMaxDiscountPercent: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            {/* 4. Cashier & Financial Reconciliation */}
            <div
              className={`p-5 rounded-2xl border space-y-4 ${
                isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                <Receipt className="w-4 h-4" />
                <span>Cashier & Reconciliation</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Daily Opening Cash Float (₹)</label>
                  <input
                    type="number"
                    value={policiesData.openingCashFloatAmount}
                    onChange={(e) => setPoliciesData({ ...policiesData, openingCashFloatAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Drawer Variance Alert Trigger (₹)</label>
                  <input
                    type="number"
                    value={policiesData.cashierVarianceAlertThreshold}
                    onChange={(e) => setPoliciesData({ ...policiesData, cashierVarianceAlertThreshold: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">F&B GST Rate (%)</label>
                  <input
                    type="number"
                    value={policiesData.restaurantGstPercent}
                    onChange={(e) => setPoliciesData({ ...policiesData, restaurantGstPercent: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Night Audit Window</label>
                  <input
                    type="text"
                    value={policiesData.nightAuditExecutionWindow}
                    onChange={(e) => setPoliciesData({ ...policiesData, nightAuditExecutionWindow: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            {/* 5. Housekeeping & Vault Custody */}
            <div
              className={`p-5 rounded-2xl border space-y-4 ${
                isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Housekeeping & Vault Custody</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Room Turnaround SLA (Minutes)</label>
                  <input
                    type="number"
                    value={policiesData.housekeepingTurnaroundSlaMinutes}
                    onChange={(e) => setPoliciesData({ ...policiesData, housekeepingTurnaroundSlaMinutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Lost & Found Standard Retention (Days)</label>
                  <input
                    type="number"
                    value={policiesData.lostAndFoundStandardRetentionDays}
                    onChange={(e) => setPoliciesData({ ...policiesData, lostAndFoundStandardRetentionDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Lost & Found Valuables Retention (Days)</label>
                  <input
                    type="number"
                    value={policiesData.lostAndFoundValuableRetentionDays}
                    onChange={(e) => setPoliciesData({ ...policiesData, lostAndFoundValuableRetentionDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Max Tables per Waiter Station</label>
                  <input
                    type="number"
                    value={policiesData.maxTablesPerWaiter}
                    onChange={(e) => setPoliciesData({ ...policiesData, maxTablesPerWaiter: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
