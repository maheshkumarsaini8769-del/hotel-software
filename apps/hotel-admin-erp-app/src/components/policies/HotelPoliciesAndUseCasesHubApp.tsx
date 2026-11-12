import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ClipboardList,
  CheckCircle2,
  Clock,
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
  Printer,
  Search,
  Filter,
  Sliders,
  Save,
  Building2,
  Lock,
  DoorOpen,
  Coffee,
  HelpCircle,
  FileText,
} from 'lucide-react';
import type { ErpModuleKey } from '../../types/erp';
import { API_BASE_URL, getStoredHotelId, getStoredToken } from '../../config/api';

interface HotelPoliciesAndUseCasesHubAppProps {
  isDark?: boolean;
  hotelId?: string;
  onNavigateModule?: (moduleKey: ErpModuleKey) => void;
}

export interface SopStandardItem {
  id: string;
  code: string;
  category: 'FRONT_DESK' | 'DINING' | 'BILLING_GST' | 'HOUSEKEEPING' | 'SAFETY';
  title: string;
  department: string;
  responsibleRoles: string[];
  summary: string;
  procedures: string[];
  complianceMandate: string;
  quickThreshold: string;
  targetModule?: ErpModuleKey;
  targetModuleLabel?: string;
}

const SOP_STANDARDS: SopStandardItem[] = [
  {
    id: 'sop-1',
    code: 'SOP-FD-01',
    category: 'FRONT_DESK',
    title: 'Standard Guest Check-In, Keycard Allocation & Grace Period SOP',
    department: 'Front Desk & PMS',
    responsibleRoles: ['Front Desk Executive', 'Duty Manager', 'Bell Desk'],
    summary: 'Governs standard guest arrival, room registration, RFID keycard issuance, and departure schedule grace periods.',
    procedures: [
      'Standard Check-In Time is 02:00 PM (14:00 hrs); Standard Check-Out Time is 11:00 AM (11:00 hrs).',
      'Complimentary Grace Period: Up to 60 minutes allowed post-11:00 AM upon verbal or digital confirmation with Reception.',
      'Early Arrival Charges: Arrival between 06:00 AM and 10:00 AM incurs 50% tariff (subject to room readiness); before 06:00 AM incurs 100% full prior night tariff.',
      'Late Departure Charges: Departure past 12:00 PM incurs 25% tariff; past 02:00 PM incurs 50% tariff; past 06:00 PM incurs 100% full night tariff.',
      'RFID Keycard Security: Issue maximum 2 RFID encoded keycards per room. Keycards auto-expire at 12:00 PM on departure date.',
    ],
    complianceMandate: 'Must be visibly published on booking confirmation vouchers and printed at the Reception desk.',
    quickThreshold: 'Check-In: 14:00 | Check-Out: 11:00 | Grace: 60 mins',
    targetModule: 'ROOM_MANAGEMENT',
    targetModuleLabel: 'Open Front Desk & PMS',
  },
  {
    id: 'sop-2',
    code: 'SOP-FD-02',
    category: 'FRONT_DESK',
    title: 'Mandatory Guest Identification, KYC & Form-C Statutory Compliance',
    department: 'Front Desk & PMS',
    responsibleRoles: ['Front Desk Executive', 'Night Auditor', 'General Manager'],
    summary: 'Strict statutory mandate to collect, scan, and archive valid government photo identification for every adult guest.',
    procedures: [
      'Every adult guest (Age 18+) must present original government-issued photo identity before physical keycard handover.',
      'Accepted Domestic Proofs: Aadhaar Card, Passport, Driving License, Voter ID Card.',
      'Strict Exclusion: PAN Card is legally NOT accepted as address/residence proof under Ministry of Tourism guidelines.',
      'Foreign National Guests: Mandatory original Passport, valid Indian Visa/OCI, and statutory Form-C submission to Bureau of Immigration (BOI) within 24 hours of arrival.',
      'Digital Registration: Capture digital or physical canvas signature on Guest Registration Card (GRC) agreeing to room tariff and property rules.',
    ],
    complianceMandate: 'Statutory legal requirement under Section 14 of Foreigners Act. Non-compliance results in operating license suspension.',
    quickThreshold: 'Aadhaar / Passport / Form C BOI Mandate',
    targetModule: 'ROOM_MANAGEMENT',
    targetModuleLabel: 'Verify Guest KYC',
  },
  {
    id: 'sop-3',
    code: 'SOP-FD-03',
    category: 'FRONT_DESK',
    title: 'Booking Guarantee, Advance Deposit & Cancellation Slabs Policy',
    department: 'Front Desk & Reservations',
    responsibleRoles: ['Reservations Executive', 'Finance Controller'],
    summary: 'Clear advance payment thresholds and tiered cancellation fee slabs to protect hotel room occupancy.',
    procedures: [
      'Standard Room Guarantee: 50% advance deposit required for confirmed reservations; 100% advance required for holiday peak dates.',
      'Cancellation > 48 Hours prior to check-in: 100% full refund processed (minus 3% payment gateway charges).',
      'Cancellation between 48 to 24 Hours prior: 50% cancellation fee deducted from deposit.',
      'Cancellation < 24 Hours or No-Show: 100% non-refundable deposit forfeiture.',
      'Refund Processing Timeline: Approved refunds credited back to original source account within 5 to 7 banking days.',
    ],
    complianceMandate: 'Printed on online guest booking engine confirmation and automated WhatsApp receipts.',
    quickThreshold: '>48h: 100% Refund | 24-48h: 50% Fee | <24h: 100% Fee',
    targetModule: 'REVENUE_MANAGER',
    targetModuleLabel: 'View Revenue & Pricing',
  },
  {
    id: 'sop-4',
    code: 'SOP-FNB-01',
    category: 'DINING',
    title: 'Dining Table Management, Digital KOT & Order Workflow SOP',
    department: 'Food & Beverage',
    responsibleRoles: ['Restaurant Captain', 'Service Steward', 'Head Chef'],
    summary: 'Standard operating sequence for guest table seating, order punching, digital Kitchen Order Ticket (KOT) firing, and order voids.',
    procedures: [
      'Table Seating: Greet diner within 45 seconds of arrival; allocate table on Waiter App (:3003) to mark table OCCUPIED.',
      'Order Punching: Punch all food and beverage selections digitally into POS. Never serve any item without an active system KOT.',
      'Kitchen Routing: Orders automatically fire to kitchen preparation stations (Curry, Tandoor, Bakery, Bar) via live KDS (:3002).',
      'Target Preparation SLA: Beverages within 6 minutes; starters within 12 minutes; main courses within 18 minutes.',
      'KOT Void & Cancellation Authorization: Any item cancellation requires Captain or Manager digital pin authorization with explicit void reason.',
    ],
    complianceMandate: 'Eliminates revenue leakage, ensures food hygiene tracking, and synchronizes real-time kitchen inventory 86.',
    quickThreshold: 'Max 45s Greeting | 18 min SLA | Manager Void Authorization',
    targetModule: 'TABLE_MANAGEMENT',
    targetModuleLabel: 'Open Dining Tables',
  },
  {
    id: 'sop-5',
    code: 'SOP-FNB-02',
    category: 'DINING',
    title: 'In-Room Dining (IRD) & Post-to-Room Folio Billing SOP',
    department: 'Food & Beverage / Front Desk',
    responsibleRoles: ['Room Service Captain', 'Cashier', 'Front Desk Receptionist'],
    summary: 'Standard procedure for guest room dining telephone/digital orders and posting dining charges directly onto the PMS stay bill.',
    procedures: [
      'Order Verification: Confirm guest surname, room number, and dietary allergies before confirming order.',
      'Service Delivery: Tray/trolley setup with sanitized cloche covers delivered within 30 minutes of order placement.',
      'Guest Acknowledgment: Present printed IRD receipt slip for guest physical signature confirming receipt of items.',
      'Post-to-Room (PMS Folio): Shift cashier posts bill to Room Number. System automatically validates guest status (must be ACTIVE_CHECKED_IN).',
      'Clearance Notification: Guest requests tray pickup via QR Portal or phone; Housekeeping/IRD clears tray within 20 minutes.',
    ],
    complianceMandate: 'Prevents disputed room checkout folios by retaining signed delivery vouchers.',
    quickThreshold: 'Active Check-In Validation | Signed Receipt Mandate',
    targetModule: 'ORDERS_KITCHEN',
    targetModuleLabel: 'View Live Kitchen Orders',
  },
  {
    id: 'sop-6',
    code: 'SOP-GST-01',
    category: 'BILLING_GST',
    title: 'Statutory Indian GST Invoicing, Tax Rates & B2B Compliance SOP',
    department: 'Accounts & Cashiering',
    responsibleRoles: ['Cashier', 'Finance Head', 'Night Auditor'],
    summary: 'Mandatory GST Council tax brackets for hotel stay tariffs and restaurant food & beverage billing.',
    procedures: [
      'Restaurant F&B Tax Rate: Flat 5% GST (2.5% CGST + 2.5% SGST) applied to all dining, takeaway, and room service food bills (Without ITC).',
      'Room Accommodation Tax Rates: Room tariff ≤ ₹7,500/night incurs 12% GST (6% CGST + 6% SGST); Tariff > ₹7,500/night incurs 18% GST (9% CGST + 9% SGST).',
      'Corporate B2B Invoicing: Mandatory 15-character recipient GSTIN and legal entity name on tax invoice for Input Tax Credit claim.',
      'e-Invoice IRN Generation: Outward B2B invoices automatically generate 64-character SHA-256 IRN hash for GSTR-1 Table 4A filing.',
      'Bill of Supply vs Tax Invoice: Sequential numbering must be continuous without gaps across the financial fiscal year.',
    ],
    complianceMandate: 'Direct compliance with Central Goods and Services Tax (CGST) Act 2017. Audit trails permanently stored.',
    quickThreshold: 'F&B: 5% GST | Room ≤₹7.5k: 12% GST | Room >₹7.5k: 18% GST',
    targetModule: 'REPORTS_ANALYTICS',
    targetModuleLabel: 'View Tax & GSTR-1 Reports',
  },
  {
    id: 'sop-7',
    code: 'SOP-GST-02',
    category: 'BILLING_GST',
    title: 'Daily Cashier Shift Drawer Handover & Night Audit Close SOP',
    department: 'Accounts & Cashiering',
    responsibleRoles: ['Shift Cashier', 'Night Auditor', 'General Manager'],
    summary: 'Shift-end physical cash drawer counting, electronic EDC card batch settlement, and PMS business day rollover.',
    procedures: [
      'Shift Changeover: Physical currency counted and matched with system cash collections; drawer discrepancy over ₹100 flagged immediately.',
      'EDC Card Batch Settlement: Terminal swipe machines settled every evening; batch slip stapled to daily cashier sheet.',
      'Open Table Clearance: All restaurant dining tables and room service orders must be fully settled prior to initiating Night Audit.',
      'Daily Room Tariff Posting: Night Audit engine automatically posts room tariff and GST to all occupied folios at 02:00 AM.',
      'Business Date Advance: Business date rolls forward by +1 day; Manager Flash Report automatically generated and dispatched to General Manager.',
    ],
    complianceMandate: 'Daily Z-Report and shift settlement sheets filed daily for annual financial and tax audits.',
    quickThreshold: '02:00 AM Audit Roll | Dual Cash Verification',
    targetModule: 'EXPENSES_ACCOUNTING',
    targetModuleLabel: 'Open Night Audit & Close',
  },
  {
    id: 'sop-8',
    code: 'SOP-HK-01',
    category: 'HOUSEKEEPING',
    title: 'Guest Room Turnaround, Sanitization & Inspection SOP',
    department: 'Housekeeping',
    responsibleRoles: ['Housekeeping Attendant', 'Floor Supervisor', 'Executive Housekeeper'],
    summary: 'Systematic 32-point procedure for cleaning departed rooms and certifying them clean and ready for arriving guests.',
    procedures: [
      'Checkout Notification: Front desk checkout immediately flags room as DIRTY on Housekeeping Board (:3005).',
      'Linen Change Protocol: Strip all bed linen, pillowcases, and bath towels. Replace with fresh laundry washed at minimum 70°C.',
      'Bathroom Sanitization: Sanitize wash basin, shower area, WC with hospital-grade disinfectant; restock complimentary guest toiletries.',
      'Do Not Disturb (DND): If DND sign is active past 02:00 PM, duty supervisor conducts a courtesy welfare phone call.',
      'Supervisor Release: Floor supervisor completes digital checklist and taps "Pass & Release" -> Room immediately transitions to INSPECTED (Green) on Front Desk.',
    ],
    complianceMandate: 'Certified pristine rooms ensure guest health, prevent hygiene complaints, and optimize turnaround times.',
    quickThreshold: 'Turnaround Target: 30 mins | 100% Linen Replacement',
    targetModule: 'HOUSEKEEPING',
    targetModuleLabel: 'Open Housekeeping Board',
  },
  {
    id: 'sop-9',
    code: 'SOP-SEC-01',
    category: 'SAFETY',
    title: 'Lost & Found Digital Custody, Storage & Guest Release SOP',
    department: 'Security & Housekeeping',
    responsibleRoles: ['Housekeeper', 'Security Officer', 'Front Desk Custodian'],
    summary: 'Standard protocol for logging, securing, and returning forgotten guest personal belongings.',
    procedures: [
      'Immediate Discovery: Housekeeper finding forgotten item turns it over to the Security Vault within 60 minutes of discovery.',
      'Digital Logging: Log item photo, room number, date, founder, and estimated value in the Lost & Found Vault App.',
      'Valuable Items: Cash, jewelry, laptops, and mobile phones placed in sealed tamper-evident envelopes inside the Master Safe.',
      'Guest Verification: Claimant must present valid government photo ID and device unlock passcode or purchase proof before release.',
      'Retention & Disposal: Valuables retained for 90 days; unclaimed non-valuables disbursed to hotel staff welfare fund post-90 days.',
    ],
    complianceMandate: 'Complete chain-of-custody audit trail archived in ERP database for 1 year.',
    quickThreshold: '60 min Vault Handover | 90-Day Retention Window',
    targetModule: 'MAINTENANCE',
    targetModuleLabel: 'Open Lost & Found Vault',
  },
  {
    id: 'sop-10',
    code: 'SOP-SEC-02',
    category: 'SAFETY',
    title: 'Emergency Evacuation, Fire Safety & Medical First-Aid SOP',
    department: 'Safety & Security',
    responsibleRoles: ['Chief Security Officer', 'Duty Manager', 'All Hotel Staff'],
    summary: 'Protocol for responding to fire alarms, guest medical emergencies, and orderly building evacuation.',
    procedures: [
      'Fire Alarm Response: Security duty officer investigates alarm trigger zone within 90 seconds.',
      'Guest Evacuation: Front Desk initiates guest evacuation announcement over Public Address (PA) system; assemble at Main Lawn.',
      'Fire Fighting Equipment: ABC Dry Powder and CO2 extinguishers inspected and certified on the 1st of every calendar month.',
      'Medical Emergencies: Reception maintains 24/7 First Aid kit and tie-up with nearest multispeciality hospital for emergency ambulance dispatch.',
      'Incident Log: All injuries, property damages, or safety alarms documented in Incident Logbook within 4 hours.',
    ],
    complianceMandate: 'Mandatory under National Building Code (NBC) & State Fire Safety Directorate regulations.',
    quickThreshold: '90s Investigation | Monthly Extinguisher Certification',
    targetModule: 'SETTINGS_CONFIGURATION',
    targetModuleLabel: 'Security & Operations Settings',
  },
];

export const HotelPoliciesAndUseCasesHubApp: React.FC<HotelPoliciesAndUseCasesHubAppProps> = ({
  isDark: _isDark = false,
  hotelId = getStoredHotelId(),
  onNavigateModule,
}) => {
  const [activeTab, setActiveTab] = useState<'SOPS' | 'PROPERTY_RULES'>('SOPS');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSopId, setExpandedSopId] = useState<string | null>('sop-1');

  // Policy Settings State
  const [policyConfig, setPolicyConfig] = useState({
    checkInTime: '14:00',
    checkOutTime: '11:00',
    gracePeriodMinutes: 60,
    cancellationWindowHours: 48,
    fullRefundHours: 48,
    partialRefundHours: 24,
    fnbGstPercent: 5,
    roomGstPercent: 12,
    wifiSsid: 'SHREE-SHYAM-GUEST',
    wifiTerms: 'Complimentary high-speed Wi-Fi available across all rooms and dining outlets.',
  });
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  useEffect(() => {
    const fetchPolicies = async () => {
      setLoadingConfig(true);
      try {
        const token = getStoredToken();
        const res = await axios.get(`${API_BASE_URL}/restaurant-operations/policies`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          params: hotelId ? { hotelId } : undefined,
        });
        if (res.data?.success && res.data?.data) {
          setPolicyConfig((prev) => ({
            ...prev,
            ...res.data.data,
          }));
        }
      } catch (err) {
        console.error('[Policies] Could not load backend policies:', err);
      } finally {
        setLoadingConfig(false);
      }
    };
    fetchPolicies();
  }, [hotelId]);

  const handleSavePolicyConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const token = getStoredToken();
      const res = await axios.put(
        `${API_BASE_URL}/restaurant-operations/policies`,
        policyConfig,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          params: hotelId ? { hotelId } : undefined,
        }
      );
      if (res.data?.success) {
        showToast('Property operational policies saved and synchronized successfully.');
      } else {
        showToast('Failed to save policies.');
      }
    } catch (err: any) {
      console.error('[Policies] Error saving policies:', err);
      showToast(err?.response?.data?.message || 'Error saving operational policies.');
    } finally {
      setSavingConfig(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Filtered SOPs
  const filteredSops = SOP_STANDARDS.filter((item) => {
    if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.department.toLowerCase().includes(q) ||
        item.procedures.some((p) => p.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 text-slate-900">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-xl shadow-lg font-bold text-xs animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                Hotel Operations Manual & SOP Center
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                Official Property Standards
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Standard Operating Procedures (SOPs), Guest KYC verification, Indian GST billing rules, and property compliance guidelines.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print SOP Manual</span>
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('SOPS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'SOPS'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Standard Operating Procedures ({SOP_STANDARDS.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PROPERTY_RULES')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'PROPERTY_RULES'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Property Operating Rules & Times</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: SOP OPERATIONS MANUAL                             */}
      {/* ======================================================== */}
      {activeTab === 'SOPS' && (
        <div className="space-y-6">
          {/* Search & Category Filter */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search procedures, KYC, GST..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
              {(
                [
                  { key: 'ALL', label: 'All SOPs' },
                  { key: 'FRONT_DESK', label: 'Front Desk' },
                  { key: 'DINING', label: 'F&B Dining' },
                  { key: 'BILLING_GST', label: 'GST & Invoicing' },
                  { key: 'HOUSEKEEPING', label: 'Housekeeping' },
                  { key: 'SAFETY', label: 'Safety & Security' },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setCategoryFilter(cat.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    categoryFilter === cat.key
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* SOP Cards Accordion */}
          <div className="space-y-4">
            {filteredSops.length === 0 ? (
              <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl">
                <p className="text-xs text-slate-500">No procedures match your search query.</p>
              </div>
            ) : (
              filteredSops.map((sop) => {
                const isExpanded = expandedSopId === sop.id;
                return (
                  <div
                    key={sop.id}
                    className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden transition-all"
                  >
                    {/* Header Bar */}
                    <div
                      onClick={() => setExpandedSopId(isExpanded ? null : sop.id)}
                      className="p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/60 transition select-none"
                    >
                      <div className="flex items-start sm:items-center gap-3.5">
                        <span className="px-2.5 py-1 rounded-xl font-mono font-bold text-xs bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                          {sop.code}
                        </span>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-sm text-slate-900">{sop.title}</h3>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                              {sop.department}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-1">{sop.summary}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="hidden md:inline-block text-[11px] font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                          {sop.quickThreshold}
                        </span>
                        <div className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="p-5 pt-0 border-t border-slate-100 space-y-4 text-xs bg-slate-50/30">
                        {/* Responsible Roles & Threshold */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
                          <div className="p-3 rounded-xl bg-white border border-slate-200">
                            <span className="font-bold text-slate-700 block mb-1">Responsible Roles</span>
                            <div className="flex flex-wrap gap-1.5">
                              {sop.responsibleRoles.map((role, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700"
                                >
                                  {role}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-white border border-slate-200">
                            <span className="font-bold text-slate-700 block mb-1">Key Operational Standards</span>
                            <span className="font-semibold text-blue-700">{sop.quickThreshold}</span>
                          </div>
                        </div>

                        {/* Step by Step Procedures */}
                        <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                          <span className="font-bold text-slate-900 block mb-2 text-xs uppercase tracking-wide">
                            Operating Procedure Steps
                          </span>
                          <ol className="space-y-2 list-decimal list-inside text-slate-700 leading-relaxed">
                            {sop.procedures.map((proc, pIdx) => (
                              <li key={pIdx} className="pl-1">
                                <span className="font-medium">{proc}</span>
                              </li>
                            ))}
                          </ol>
                        </div>

                        {/* Statutory Mandate Callout */}
                        <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 flex items-start gap-2.5 text-amber-900">
                          <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-xs block">Compliance & Legal Mandate</span>
                            <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                              {sop.complianceMandate}
                            </p>
                          </div>
                        </div>

                        {/* Direct Jump to Module */}
                        {sop.targetModule && onNavigateModule && (
                          <div className="flex justify-end pt-2">
                            <button
                              type="button"
                              onClick={() => onNavigateModule(sop.targetModule!)}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
                            >
                              <span>{sop.targetModuleLabel || 'Open Relevant ERP Module'}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: PROPERTY OPERATING RULES & TIMES                  */}
      {/* ======================================================== */}
      {activeTab === 'PROPERTY_RULES' && (
        <form onSubmit={handleSavePolicyConfig} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Property Policy Settings</h2>
              <p className="text-xs text-slate-500">Configure check-in/out times, grace windows, and tax rates for this property.</p>
            </div>
            <button
              type="submit"
              disabled={savingConfig}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-60 flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingConfig ? 'Saving...' : 'Save Policies'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Standard Check-In Time</label>
              <input
                type="text"
                value={policyConfig.checkInTime}
                onChange={(e) => setPolicyConfig({ ...policyConfig, checkInTime: e.target.value })}
                placeholder="14:00 (2:00 PM)"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Standard guest arrival threshold</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Standard Check-Out Time</label>
              <input
                type="text"
                value={policyConfig.checkOutTime}
                onChange={(e) => setPolicyConfig({ ...policyConfig, checkOutTime: e.target.value })}
                placeholder="11:00 (11:00 AM)"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Standard room departure threshold</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Complimentary Grace Period (Minutes)</label>
              <input
                type="number"
                min="0"
                max="180"
                value={policyConfig.gracePeriodMinutes}
                onChange={(e) =>
                  setPolicyConfig({ ...policyConfig, gracePeriodMinutes: Number(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Allowed checkout grace window</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Restaurant F&B GST Rate (%)</label>
              <input
                type="number"
                step="0.5"
                value={policyConfig.fnbGstPercent}
                onChange={(e) =>
                  setPolicyConfig({ ...policyConfig, fnbGstPercent: Number(e.target.value) || 5 })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Standard 5% F&B without ITC in India</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Room Accommodation GST Rate (%)</label>
              <input
                type="number"
                step="0.5"
                value={policyConfig.roomGstPercent}
                onChange={(e) =>
                  setPolicyConfig({ ...policyConfig, roomGstPercent: Number(e.target.value) || 12 })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Standard 12% for tariffs up to ₹7,500</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Guest Wi-Fi Network Name (SSID)</label>
              <input
                type="text"
                value={policyConfig.wifiSsid}
                onChange={(e) => setPolicyConfig({ ...policyConfig, wifiSsid: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Guest Wi-Fi & Property Terms Note</label>
              <textarea
                rows={3}
                value={policyConfig.wifiTerms}
                onChange={(e) => setPolicyConfig({ ...policyConfig, wifiTerms: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              disabled={savingConfig}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-60 flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingConfig ? 'Saving Changes...' : 'Save & Synchronize Policies'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
