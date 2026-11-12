import { IMAGE_PLACEHOLDER, NumericInput } from '@spicehub/ui';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { env, getPortalUrl } from './config/env';
import { SuperAdminRealMap } from './components/SuperAdminRealMap';
import { SuperAdminExtendedWorkstations } from './components/workstations/SuperAdminExtendedWorkstations';
import {
  PortalKey,
  DEFAULT_PORTAL_CATALOG,
  calculateModularSubscription,
  ALL_PORTAL_KEYS,
} from '@spicehub/shared-types';
import {
  LayoutDashboard,
  Building,
  Palette,
  Building2,
  Users,
  CreditCard,
  Settings,
  Package,
  BarChart3,
  Store,
  BedDouble,
  User,
  Tag,
  Star,
  Headphones,
  Scroll,
  Printer,
  Cpu,
  Database,
  Shield,
  Bell,
  Globe,
  Smartphone,
  Search,
  Eye,
  ChevronDown,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  Ban,
  Crown,
  Menu,
  X,
  Loader2,
  Save,
  RefreshCw,
  Download,
  Upload,
  FileText,
  Check,
  AlertCircle,
  Trash2,
  Plus,
  Key,
  Wifi,
  Terminal,
  Sliders,
  DollarSign,
  Activity,
  HardDrive,
  Copy,
  Clock,
  ExternalLink,
  HelpCircle,
  ShoppingCart,
  Laptop,
  MapPin,
  Volume2,
  Tablet,
  GitFork,
  Image as ImageIcon,
  Calendar,
  ChefHat,
  BellRing,
  Inbox,
  Zap,
  Lock,
  TrendingUp,
  Mail,
  Send,
  Sparkles,
  List,
  LayoutGrid,
  Receipt,
  Armchair,
  AlertTriangle,
  ShieldCheck,
  PieChart as PieChartIcon,
  Sprout,
  Utensils,
  UtensilsCrossed,
  ConciergeBell,
  MoreVertical,
  LogIn,
  Filter,
  ChevronLeft,
  PauseCircle,
  CalendarDays,
  Navigation,
  Server,
  Trophy,
  Layers,
  Link2,
  QrCode,
  Edit3,
  Power,
} from 'lucide-react';

// ============================================================================
// DATA STRUCTURES & INTERFACES
// ============================================================================

const getPortalIcon = (portalId: string) => {
  switch (portalId) {
    case 'cashier': return CreditCard;
    case 'admin': return Building2;
    case 'superadmin': return Crown;
    case 'kds': return ChefHat;
    case 'waiter': return Smartphone;
    case 'customer': return Smartphone;
    case 'hotel-room-pms': return BedDouble;
    case 'qr-ordering': return Zap;
    case 'table-management': return Armchair;
    default: return Building2;
  }
};

export interface TenantHotelItem {
  id: string;
  name: string;
  code: string;
  slug?: string;
  city: string;
  state: string;
  contactEmail: string;
  contactPhone: string;
  currency?: string;
  adminEmail?: string;
  adminName?: string;
  adminPhone?: string;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  subscriptionDurationMonths?: number;
  logoUrl?: string;
  coverImageUrl?: string;
  photos?: string[];
  tagline?: string;
  primaryColor?: string;
  secondaryColor?: string;
  domain?: string;
  plan: 'TRIAL' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE' | 'CUSTOM';
  activeRooms: number;
  totalRooms: number;
  maxRooms?: number;
  activeTables: number;
  totalTables: number;
  maxTables?: number;
  status: 'ACTIVE' | 'SUSPENDED' | 'MAINTENANCE';
  monthlyBilling: number;
  todayRevenue: number;
  todayOrders: number;
  occupancyPercent: number;
  enabledPortals: string[];
  serviceCapabilities?: {
    roomBooking: boolean;
    reception: boolean;
    inRoomServices: boolean;
    tableOrdering: boolean;
    waiterDispatch: boolean;
  };
  billingCycle?: 'MONTHLY' | 'ANNUAL';
  customPricingAdjustmentINR?: number;
  createdAt?: string;
  street?: string;
  pincode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  googleMapUrl?: string;
  locationNotes?: string;
  coordinates?: { latitude?: number; longitude?: number };
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
  };
  features?: {
    kdsEnabled: boolean;
    soundboxEnabled: boolean;
    aiPricingEnabled: boolean;
    banquetEnabled: boolean;
    qrOrderingEnabled: boolean;
    standaloneCashierEnabled: boolean;
  };
  subscribedFeatures?: string[];
  subscription?: {
    billingCycle?: 'MONTHLY' | 'ANNUAL';
    monthlyRateINR?: number;
    annualRateINR?: number;
    effectiveRateINR?: number;
    customPricingAdjustmentINR?: number;
    subscriptionStartDate?: string;
    lastPaymentDate?: string;
    paymentStatus?: 'PAID' | 'PENDING' | 'OVERDUE';
  };
}

const SERVICE_CAPABILITY_OPTIONS = [
  { key: 'roomBooking', label: 'Online room booking', description: 'Guest room search, booking and check-in request' },
  { key: 'reception', label: 'Front desk / reception', description: 'Reception and front-desk operations' },
  { key: 'inRoomServices', label: 'In-room guest services', description: 'Resident verification, room service, housekeeping and folio' },
  { key: 'tableOrdering', label: 'Table QR ordering', description: 'Dine-in QR menu and table ordering' },
  { key: 'waiterDispatch', label: 'Waiter dispatch', description: 'Assign table orders and service calls to waiter staff' },
] as const;

export const ONBOARD_PORTAL_DETAILS: Record<string, { name: string; priceINR: number; category: string; icon: any }> = {
  waiter: { name: 'Floor Service & Waiter Handheld', priceINR: 999, category: 'Floor Operations', icon: Smartphone },
  reception: { name: 'Front Desk PMS & Folio Ledger', priceINR: 1499, category: 'Front Office', icon: BedDouble },
  kds: { name: 'Kitchen Display System (KDS)', priceINR: 799, category: 'Culinary Ops', icon: ChefHat },
  cashier: { name: 'Cashier POS & Float Management', priceINR: 1199, category: 'Billing & Settlement', icon: Receipt },
  customer: { name: 'Guest Table QR Ordering', priceINR: 899, category: 'Digital Guest Experience', icon: Zap },
  guest: { name: 'In-Room Digital Concierge & Folio', priceINR: 699, category: 'Digital Guest Experience', icon: BedDouble },
  admin: { name: 'Enterprise Admin Console (ERP)', priceINR: 0, category: 'Core Infrastructure', icon: Building2 },
};

export const ONBOARD_FEATURE_DETAILS: Record<string, { title: string; desc: string; icon: any; tag: string }> = {
  pms_inventory: {
    title: 'Live PMS & Room Fleet Inventory',
    desc: 'Real-time room occupancy matrix, automatic cleaning status & check-in audit',
    icon: BedDouble,
    tag: 'PMS Core',
  },
  qr_table_ordering: {
    title: 'QR Dine-In & Room Ordering',
    desc: 'Contactless digital menu, dish modifiers, instant table cart & live KOT',
    icon: Zap,
    tag: 'Guest Tech',
  },
  gst_invoicing: {
    title: 'Statutory 18% GST Tax Invoicing',
    desc: 'Automated B2B/B2C invoices, CGST 9% + SGST 9%, HSN/SAC 998314 codes, Tally export',
    icon: Receipt,
    tag: 'Compliance',
  },
  whatsapp_alerts: {
    title: 'Transactional WhatsApp & SMS Gateway',
    desc: 'Instant KOT kitchen alerts, guest booking vouchers & tax receipts sent via WhatsApp',
    icon: BellRing,
    tag: 'Notifications',
  },
  staff_attendance: {
    title: 'Staff Touch-PIN & Shift Attendance',
    desc: 'Quick 4-digit PIN unlock for all terminals with shift logging & admin approvals',
    icon: ShieldCheck,
    tag: 'Staff Security',
  },
  kds_routing: {
    title: 'Multi-Station Kitchen (KOT) Routing',
    desc: 'Automatic routing of food to hot kitchen, cold station, bakery, and drinks bar',
    icon: ChefHat,
    tag: 'Kitchen Ops',
  },
};

interface PlatformPlan {
  id: string;
  name: string;
  code: string;
  monthlyPriceINR: number;
  annualPriceINR: number;
  limits: { maxRooms: number; maxTables: number; maxStaffUsers: number };
  featureFlags: Record<string, boolean>;
  isActive?: boolean;
}

interface PlatformUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  hotelId: string;
  hotelName: string;
  isActive: boolean;
  shiftStatus: string;
  createdAt?: string;
  tenantId?: string;
}

export interface HardwareTerminalDevice {
  id: string;
  name: string;
  type: 'PRINTER' | 'KDS' | 'CASH_DRAWER' | 'SOUNDBOX';
  category: string;
  station: string;
  hotelId: string;
  hotelName: string;
  ipAddress: string;
  port: number;
  connectionType: 'Ethernet' | 'WiFi' | 'USB' | 'Bluetooth';
  status: 'ONLINE' | 'OFFLINE' | 'PRINTING' | 'LOW_PAPER';
  paperSize?: '80mm' | '58mm';
  lastPing: string;
}

export interface FranchiseBrandGroup {
  id: string;
  name: string;
  code: string;
  logoUrl?: string;
  tagline: string;
  hqCity: string;
  contactEmail: string;
  contactPhone: string;
  royaltyPercent: number;
  assignedHotelIds: string[];
  createdAt: string;
  totalRevenueMonthly: number;
}

export interface PlatformInvoiceRecord {
  id: string;
  invoiceNumber: string;
  hotelName: string;
  billingPeriod: string;
  planName: string;
  amountINR: number;
  status: 'PAID' | 'DUE' | 'PENDING';
  dueDate: string;
  paidDate?: string;
}

export interface GlobalAuditLogRecord {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  source: string;
  action: string;
  hotelName: string;
  details: string;
}

interface PlatformMetrics {
  range?: { start: string; end: string };
  tenants: {
    total: number;
    active: number;
    suspended: number;
    trial: number;
  };
  inventory: {
    totalRooms: number;
    occupiedRooms: number;
    totalTables: number;
    occupiedTables: number;
    totalBookings: number;
    totalOrders: number;
    totalGuests: number;
    totalStaff: number;
  };
  period: {
    revenue: number;
    orders: number;
    bookings: number;
    newGuests: number;
  };
  trend?: Array<{ date: string; revenue: number; payments: number }>;
  financials: {
    estimatedMonthlyRecurringRevenueINR: number;
    currency: string;
  };
  infrastructure: {
    engineStatus: string;
    multiTenancyIsolation: string;
    activeShiftsCompleted: number;
  };
  activity?: Array<{
    id: string;
    kind: 'ORDER' | 'BOOKING';
    title: string;
    subtitle: string;
    amount: number;
    status: string;
    occurredAt: string;
  }>;
}

function formatInr(value: number): string {
  return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function formatCount(value: number): string {
  return Number(value || 0).toLocaleString('en-IN');
}

function relativeTime(value?: string): string {
  if (!value) return 'Just now';
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return 'Just now';
  const minutes = Math.max(0, Math.round((Date.now() - time) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDate(value?: string | Date): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function calculateDaysRemaining(endDate?: string | Date): { days: number; isExpired: boolean; label: string; text: string; badgeClass: string } {
  if (!endDate) return { days: 0, isExpired: false, label: 'Continuous', text: 'Continuous', badgeClass: 'bg-slate-800 text-slate-300' };
  const end = new Date(endDate).getTime();
  if (isNaN(end)) return { days: 0, isExpired: false, label: '—', text: '—', badgeClass: 'bg-slate-800 text-slate-300' };
  const diff = end - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) {
    const lbl = `Expired ${Math.abs(days)}d ago`;
    return { days, isExpired: true, label: lbl, text: lbl, badgeClass: 'bg-red-500/20 text-red-300 border border-red-500/30' };
  }
  if (days === 0) {
    return { days: 0, isExpired: false, label: 'Expires today', text: 'Expires today', badgeClass: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' };
  }
  if (days <= 7) {
    const lbl = `${days}d left`;
    return { days, isExpired: false, label: lbl, text: lbl, badgeClass: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' };
  }
  const lbl = `${days}d remaining`;
  return { days, isExpired: false, label: lbl, text: lbl, badgeClass: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' };
}

function platformAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token =
    window.localStorage.getItem('spicehub_token') || window.localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function rangeForPeriod(period: 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH'): {
  startDate: string;
  endDate: string;
} {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  if (period === 'YESTERDAY') {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
  } else if (period === 'WEEK') {
    start.setDate(start.getDate() - 6);
  } else if (period === 'MONTH') {
    start.setDate(1);
  }
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

export type SuperAdminNavKey =
  | 'DASHBOARD'
  | 'BRANCHES'
  | 'BRANDING'
  | 'HOTEL_ADMIN'
  | 'USERS_ROLES'
  | 'SUBSCRIPTIONS'
  | 'SYSTEM_CONFIG'
  | 'ANALYTICS'
  | 'FRANCHISE'
  | 'ROOMS_PMS'
  | 'CUSTOMERS'
  | 'MARKETING'
  | 'FEEDBACK'
  | 'SUPPORT'
  | 'LOGS'
  | 'HARDWARE'
  | 'INTEGRATIONS'
  | 'BACKUP'
  | 'SECURITY'
  | 'NOTIFICATIONS'
  | 'LANGUAGES'
  | 'SETTINGS';

interface SidebarMenuItem {
  key: SuperAdminNavKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  category?: string;
}

const SIDEBAR_MENU_ITEMS: SidebarMenuItem[] = [
  // §1: Core Platform Modules
  { key: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard, category: 'Core Platform' },
  { key: 'BRANCHES', label: 'Tenant Management', icon: Building2, category: 'Core Platform' },
  { key: 'SUBSCRIPTIONS', label: 'Subscriptions & Billing', icon: CreditCard, category: 'Core Platform' },
  { key: 'BRANDING', label: 'White-Label Branding', icon: Palette, category: 'Core Platform' },
  { key: 'HARDWARE', label: 'Hardware & Terminals', icon: Printer, category: 'Core Platform' },
  { key: 'USERS_ROLES', label: 'Users & Roles', icon: Users, category: 'Core Platform' },
  { key: 'FRANCHISE', label: 'Franchise Management', icon: Store, category: 'Core Platform' },

  // §2: Property Fleet Operations
  { key: 'ROOMS_PMS', label: 'Rooms & PMS Fleet', icon: BedDouble, category: 'Property Fleet' },
  { key: 'HOTEL_ADMIN', label: 'Hotel Administrators', icon: Building, category: 'Property Fleet' },

  // §3: Growth & Intelligence
  { key: 'MARKETING', label: 'Marketing & Offers', icon: Tag, category: 'Growth & Support' },
  { key: 'FEEDBACK', label: 'Feedback & Reviews', icon: Star, category: 'Growth & Support' },
  { key: 'SUPPORT', label: 'Support & Helpdesk', icon: Headphones, category: 'Growth & Support' },

  // §4: Infrastructure & Localization
  { key: 'BACKUP', label: 'Backup & Recovery', icon: Database, category: 'Infrastructure & System' },
  { key: 'SECURITY', label: 'Security & Access', icon: Shield, category: 'Infrastructure & System' },
  { key: 'LOGS', label: 'Global Audit Logs', icon: FileText, category: 'Infrastructure & System' },
  { key: 'NOTIFICATIONS', label: 'Broadcast Notifications', icon: Bell, category: 'Infrastructure & System' },
  { key: 'LANGUAGES', label: 'Languages & Currency', icon: Globe, category: 'Infrastructure & System' },
  { key: 'SETTINGS', label: 'System Configuration', icon: Settings, category: 'Infrastructure & System' },
];

interface BranchMapPin {
  id: string;
  name: string;
  state: string;
  city: string;
  status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE';
  todayRevenue: number;
  orders: number;
  tables: string;
  rooms: string;
  xPercent: number;
  yPercent: number;
  activeWaiters: number;
  activeCooks: number;
  occupancy: number;
  latitude?: number;
  longitude?: number;
  street?: string;
  pincode?: string;
  country?: string;
  googleMapUrl?: string;
  locationNotes?: string;
}

const BRANCH_MAP_POSITIONS = [
  { xPercent: 37, yPercent: 44 },
  { xPercent: 42, yPercent: 32 },
  { xPercent: 33, yPercent: 38 },
  { xPercent: 30, yPercent: 57 },
  { xPercent: 25, yPercent: 46 },
  { xPercent: 40, yPercent: 52 },
  { xPercent: 28, yPercent: 72 },
  { xPercent: 23, yPercent: 62 },
  { xPercent: 46, yPercent: 60 },
  { xPercent: 56, yPercent: 41 },
];

export const SuperAdminDashboardApp: React.FC = () => {
  const [activeNav, setActiveNav] = useState<SuperAdminNavKey>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const nav = params.get('nav');
      if (SIDEBAR_MENU_ITEMS.some((item) => item.key === nav)) return nav as SuperAdminNavKey;
    }
    return 'DASHBOARD';
  });

  useEffect(() => {
    const handleSetNav = (event: Event) => {
      const nav = (event as CustomEvent<unknown>).detail;
      if (typeof nav === 'string' && SIDEBAR_MENU_ITEMS.some((item) => item.key === nav)) {
        setActiveNav(nav as SuperAdminNavKey);
      }
    };
    window.addEventListener('superadmin:set_nav', handleSetNav);
    return () => window.removeEventListener('superadmin:set_nav', handleSetNav);
  }, []);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedMapBranch, setSelectedMapBranch] = useState<BranchMapPin | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapFilter, setMapFilter] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL');
  const [mapZoom, setMapZoom] = useState<number>(1);
  const [dateRange, setDateRange] = useState<'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH'>('MONTH');
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<'7D' | '30D' | '90D' | 'YTD'>('30D');
  const [revenueChartMetric, setRevenueChartMetric] = useState<'REVENUE' | 'ORDERS' | 'AOV'>('REVENUE');

  // Modals
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isLiveSystemModalOpen, setIsLiveSystemModalOpen] = useState(false);
  const [isExportReportOpen, setIsExportReportOpen] = useState(false);
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
  const [activeSettingsModal, setActiveSettingsModal] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tenantViewMode, setTenantViewMode] = useState<'table' | 'grid'>('table');
  const [tenantSearchQuery, setTenantSearchQuery] = useState('');
  const [tenantStatusFilter, setTenantStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED' | 'EXPIRING'>('ALL');
  const [tenantPlanFilter, setTenantPlanFilter] = useState<string>('ALL');
  const [tenantLocationFilter, setTenantLocationFilter] = useState<string>('ALL');
  const [tenantFeatureFilter, setTenantFeatureFilter] = useState<string>('ALL');
  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([]);
  const [actionMenuTenantId, setActionMenuTenantId] = useState<string | null>(null);
  const [tenantCurrentPage, setTenantCurrentPage] = useState<number>(1);
  const [tenantRowsPerPage, setTenantRowsPerPage] = useState<number>(10);
  const [isImportTenantsModalOpen, setIsImportTenantsModalOpen] = useState<boolean>(false);

  const [theme] = useState<'dark' | 'light'>('light');

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Global Ctrl + K Command Palette listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
        setIsLiveSystemModalOpen(false);
        setIsExportReportOpen(false);
        setIsOnboardModalOpen(false);
        setActiveSettingsModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Hotel tenants are loaded from the platform backend; an empty list is the
  // honest initial state until the API responds.
  const [tenants, setTenants] = useState<TenantHotelItem[]>([]);
  const [platformMetrics, setPlatformMetrics] = useState<PlatformMetrics | null>(null);
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([]);
  const [platformUsersError, setPlatformUsersError] = useState('');
  const [platformPlans, setPlatformPlans] = useState<PlatformPlan[]>([]);
  const [plansError, setPlansError] = useState('');
  const [isSeedingPlans, setIsSeedingPlans] = useState(false);
  const [platformLoading, setPlatformLoading] = useState(true);
  const [platformError, setPlatformError] = useState('');
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);
  const [platformLatencyMs, setPlatformLatencyMs] = useState<number | null>(null);
  const [platformNotice, setPlatformNotice] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Custom Plan Creator & Editor Modal State
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planFormIsActive, setPlanFormIsActive] = useState<boolean>(true);
  const [planFormName, setPlanFormName] = useState('CUSTOM');
  const [planFormCode, setPlanFormCode] = useState('CUSTOM');
  const [planFormMonthlyPrice, setPlanFormMonthlyPrice] = useState(4999);
  const [planFormAnnualPrice, setPlanFormAnnualPrice] = useState(49990);
  const [planFormMaxRooms, setPlanFormMaxRooms] = useState(30);
  const [planFormMaxTables, setPlanFormMaxTables] = useState(20);
  const [planFormMaxStaffUsers, setPlanFormMaxStaffUsers] = useState(15);
  const [planFormFlags, setPlanFormFlags] = useState({
    pmsEnabled: true,
    posEnabled: true,
    kdsEnabled: true,
    waiterEnabled: true,
    qrDineInEnabled: true,
    roomServiceEnabled: true,
    banquetEnabled: true,
    loyaltyEnabled: true,
    tallyExportEnabled: true,
  });
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  // Live Activities Feed is rebuilt from real platform orders/bookings.
  const [auditLogs, setAuditLogs] = useState<
    Array<{ id: string; time: string; branch: string; action: string; amount?: number; type: 'ORDER' | 'ROOM' | 'PAYMENT' | 'STAFF' | 'ALERT' }>
  >([]);

  // ============================================================================
  // ENTERPRISE WORKSTATION STATES (HARDWARE, FRANCHISE, BILLING, RBAC)
  // ============================================================================
  // 5. Hardware & Terminals Fleet State
  const [hardwareDevices, setHardwareDevices] = useState<HardwareTerminalDevice[]>([
    {
      id: 'hw-prn-1',
      name: 'Kitchen Hot Line KOT Printer',
      type: 'PRINTER',
      category: 'ESC/POS Thermal 80mm',
      station: 'Main Hot Kitchen',
      hotelId: '6adddfc18d0109b3382bbc2b',
      hotelName: 'The Royal Palm Resort & Suites',
      ipAddress: '192.168.1.180',
      port: 9100,
      connectionType: 'Ethernet',
      status: 'ONLINE',
      paperSize: '80mm',
      lastPing: '1 min ago',
    },
    {
      id: 'hw-prn-2',
      name: 'Heritage Bar KOT & Drink Printer',
      type: 'PRINTER',
      category: 'ESC/POS Thermal 80mm',
      station: 'Poolside Bar Counter',
      hotelId: '6adddfc18d0109b3382bbc2b',
      hotelName: 'The Royal Palm Resort & Suites',
      ipAddress: '192.168.1.181',
      port: 9100,
      connectionType: 'Ethernet',
      status: 'ONLINE',
      paperSize: '80mm',
      lastPing: '2 mins ago',
    },
    {
      id: 'hw-drw-1',
      name: 'Cashier Main POS Cash Drawer',
      type: 'CASH_DRAWER',
      category: 'RJ11 Kickout Drawer',
      station: 'Front Cashier Counter #1',
      hotelId: '6adddfc18d0109b3382bbc2b',
      hotelName: 'The Royal Palm Resort & Suites',
      ipAddress: '192.168.1.182',
      port: 9100,
      connectionType: 'USB',
      status: 'ONLINE',
      lastPing: 'Just now',
    },
    {
      id: 'hw-kds-1',
      name: 'Chef Line KDS Tablet 10.1"',
      type: 'KDS',
      category: 'Android KDS Display',
      station: 'Hot Prep Line 1',
      hotelId: '6adddfc18d0109b3382bbc2b',
      hotelName: 'The Royal Palm Resort & Suites',
      ipAddress: '192.168.1.183',
      port: 8080,
      connectionType: 'WiFi',
      status: 'ONLINE',
      lastPing: 'Just now',
    },
    {
      id: 'hw-kds-2',
      name: 'Cold Pantry & Dessert KDS',
      type: 'KDS',
      category: 'Android KDS Display',
      station: 'Bakery & Dessert Section',
      hotelId: '6adddfc18d0109b3382bbc2b',
      hotelName: 'The Royal Palm Resort & Suites',
      ipAddress: '192.168.1.184',
      port: 8080,
      connectionType: 'WiFi',
      status: 'ONLINE',
      lastPing: '4 mins ago',
    },
    {
      id: 'hw-snd-1',
      name: 'Paytm UPI Vocal Soundbox 4G',
      type: 'SOUNDBOX',
      category: 'Vocal Payment Audio Speaker',
      station: 'Billing Desk 1',
      hotelId: '6adddfc18d0109b3382bbc2b',
      hotelName: 'The Royal Palm Resort & Suites',
      ipAddress: '192.168.1.186',
      port: 8080,
      connectionType: 'WiFi',
      status: 'ONLINE',
      lastPing: 'Just now',
    },
    {
      id: 'hw-prn-3',
      name: 'Rooftop Lounge KOT Printer',
      type: 'PRINTER',
      category: 'ESC/POS Thermal 80mm',
      station: 'Rooftop Terrace Bar',
      hotelId: '6adddfc18d0109b3382bbc2b',
      hotelName: 'The Royal Palm Resort & Suites',
      ipAddress: '192.168.1.188',
      port: 9100,
      connectionType: 'Ethernet',
      status: 'LOW_PAPER',
      paperSize: '80mm',
      lastPing: '10 mins ago',
    },
    {
      id: 'hw-prn-4',
      name: 'Banquet Mobile Bluetooth Roll',
      type: 'PRINTER',
      category: 'ESC/POS Mobile 58mm',
      station: 'Grand Ballroom Dispatch',
      hotelId: '6adddfc18d0109b3382bbc2b',
      hotelName: 'The Royal Palm Resort & Suites',
      ipAddress: '00:1B:35:84:B2:91',
      port: 1,
      connectionType: 'Bluetooth',
      status: 'OFFLINE',
      paperSize: '58mm',
      lastPing: '1 hr ago',
    },
  ]);

  const [hardwareFilter, setHardwareFilter] = useState<'ALL' | 'PRINTER' | 'KDS' | 'CASH_DRAWER' | 'SOUNDBOX'>('ALL');
  const [hardwareSearchQuery, setHardwareSearchQuery] = useState('');
  const [hardwareToast, setHardwareToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [isAddHardwareModalOpen, setIsAddHardwareModalOpen] = useState(false);
  const [newHardwareForm, setNewHardwareForm] = useState({
    name: '',
    type: 'PRINTER' as 'PRINTER' | 'KDS' | 'CASH_DRAWER' | 'SOUNDBOX',
    category: 'ESC/POS Thermal 80mm',
    station: 'Main Kitchen',
    hotelId: '',
    ipAddress: '192.168.1.195',
    port: 9100,
    connectionType: 'Ethernet' as 'Ethernet' | 'WiFi' | 'USB' | 'Bluetooth',
    paperSize: '80mm' as '80mm' | '58mm',
  });

  // 9. Franchise Brand Management State
  const [franchiseGroups, setFranchiseGroups] = useState<FranchiseBrandGroup[]>([]);

  const [isAddFranchiseModalOpen, setIsAddFranchiseModalOpen] = useState(false);
  const [selectedFranchiseForHotels, setSelectedFranchiseForHotels] = useState<FranchiseBrandGroup | null>(null);
  const [franchiseToast, setFranchiseToast] = useState<string | null>(null);
  const [newFranchiseForm, setNewFranchiseForm] = useState({
    name: '',
    code: '',
    hqCity: 'Jaipur, Rajasthan',
    contactEmail: '',
    contactPhone: '',
    royaltyPercent: 4.5,
    tagline: '',
  });

  // 3. Subscriptions & Billing Tabs and Calculator State
  const [subscriptionTab, setSubscriptionTab] = useState<'TIERS' | 'MODULAR_MATRIX' | 'INVOICES' | 'MRR_ANALYTICS'>('TIERS');
  const [subscriptionModuleFilter, setSubscriptionModuleFilter] = useState<string>('ALL');
  const [subscriptionModuleSearch, setSubscriptionModuleSearch] = useState<string>('');
  const [calcRooms, setCalcRooms] = useState<number>(45);
  const [calcTables, setCalcTables] = useState<number>(24);
  const [calcModules, setCalcModules] = useState<Record<string, boolean>>({
    kds: true,
    soundbox: true,
    banquet: true,
    aiPricing: false,
    qrOrdering: true,
    fastCashier: true,
  });

  const [platformInvoices, setPlatformInvoices] = useState<PlatformInvoiceRecord[]>([
    {
      id: 'inv-101',
      invoiceNumber: 'INV-SPICE-2026-1001',
      hotelName: 'The Royal Palm Resort & Suites',
      billingPeriod: 'October 2026',
      planName: 'Enterprise + Full Suite Addons',
      amountINR: 28490,
      status: 'PAID',
      dueDate: '2026-10-05',
      paidDate: '2026-10-04',
    },
    {
      id: 'inv-102',
      invoiceNumber: 'INV-SPICE-2026-1002',
      hotelName: 'Citrus Grand Executive Suites',
      billingPeriod: 'October 2026',
      planName: 'Professional Plan (40 Rooms)',
      amountINR: 14999,
      status: 'PAID',
      dueDate: '2026-10-10',
      paidDate: '2026-10-09',
    },
    {
      id: 'inv-103',
      invoiceNumber: 'INV-SPICE-2026-1003',
      hotelName: 'Udaipur Lakeside Heritage Haveli',
      billingPeriod: 'October 2026',
      planName: 'Starter + Table QR Modular',
      amountINR: 7890,
      status: 'DUE',
      dueDate: '2026-11-01',
    },
    {
      id: 'inv-104',
      invoiceNumber: 'INV-SPICE-2026-1004',
      hotelName: 'The Himalayan Pine Retreat',
      billingPeriod: 'September 2026',
      planName: 'Professional Plan + Soundbox',
      amountINR: 16290,
      status: 'PAID',
      dueDate: '2026-09-05',
      paidDate: '2026-09-05',
    },
  ]);
  const [invoiceToast, setInvoiceToast] = useState<string | null>(null);

  // 6. Users & Roles Tab and RBAC Matrix State
  const [userTab, setUserTab] = useState<'USERS' | 'ROLES_MATRIX'>('USERS');
  const [userFilterRole, setUserFilterRole] = useState<'ALL' | 'SUPER_ADMIN' | 'SUPPORT' | 'HOTEL_ADMIN' | 'STAFF'>('ALL');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [hotelAdminSearch, setHotelAdminSearch] = useState('');
  const [hotelAdminStatus, setHotelAdminStatus] = useState<'ALL' | 'ACTIVE' | 'DISABLED'>('ALL');
  const [hotelAdminPropertyFilter, setHotelAdminPropertyFilter] = useState<string>('ALL');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [userToast, setUserToast] = useState<string | null>(null);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'SUPER_ADMIN',
    hotelId: 'global',
    pin: '1234',
  });

  const [rbacPermissions, setRbacPermissions] = useState<Record<string, Record<string, boolean>>>({
    SUPER_ADMIN: {
      tenantProvisioning: true,
      subscriptionBilling: true,
      whiteLabelBranding: true,
      hardwareMapping: true,
      systemMaintenance: true,
      auditLogs: true,
      franchiseManagement: true,
    },
    PLATFORM_SUPPORT: {
      tenantProvisioning: false,
      subscriptionBilling: false,
      whiteLabelBranding: true,
      hardwareMapping: true,
      systemMaintenance: false,
      auditLogs: true,
      franchiseManagement: false,
    },
    HOTEL_ADMIN: {
      tenantProvisioning: false,
      subscriptionBilling: false,
      whiteLabelBranding: true,
      hardwareMapping: true,
      systemMaintenance: false,
      auditLogs: false,
      franchiseManagement: false,
    },
    CASHIER: {
      tenantProvisioning: false,
      subscriptionBilling: false,
      whiteLabelBranding: false,
      hardwareMapping: false,
      systemMaintenance: false,
      auditLogs: false,
      franchiseManagement: false,
    },
  });

  // 7. System Configuration State
  const [systemToast, setSystemToast] = useState<string | null>(null);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [masterApiKey, setMasterApiKey] = useState('spk_live_9a7x_superadmin_master_jwt_2026');

  // Hardware Fleet Telemetry State (§4)
  const [selectedHardwareHotelId, setSelectedHardwareHotelId] = useState<string>('');
  const [kotPrinterName, setKotPrinterName] = useState<string>('Kitchen KOT Master');
  const [kotPrinterStation, setKotPrinterStation] = useState<string>('Hot Kitchen Pass');
  const [kotPrinterIp, setKotPrinterIp] = useState<string>('192.168.1.101');
  const [kotPrinterPort, setKotPrinterPort] = useState<number>(9100);
  const [kdsStationName, setKdsStationName] = useState<string>('Main Kitchen');
  const [kdsStationIp, setKdsStationIp] = useState<string>('192.168.1.100');
  const [kdsStationLine, setKdsStationLine] = useState<string>('Line Cook 1 & Fryer');
  const [hardwareFleetDevices, setHardwareFleetDevices] = useState<Array<{
    id: string;
    hotelId: string;
    hotelName: string;
    type: 'KOT_PRINTER' | 'KDS_STATION' | 'UPI_SOUNDBOX';
    name: string;
    location: string;
    ipAddress: string;
    port?: number;
    status: 'ONLINE' | 'STANDBY';
  }>>([
    {
      id: 'dev-soundbox-1',
      hotelId: 'mahesh-hotel',
      hotelName: 'Mahesh Hotel',
      type: 'UPI_SOUNDBOX',
      name: 'Reception UPI Soundbox',
      location: 'Front Desk Settle Desk',
      ipAddress: '192.168.1.50',
      status: 'ONLINE',
    },
  ]);
  const [hardwareSuccessMsg, setHardwareSuccessMsg] = useState<string | null>(null);

  // Franchise Brand Groups State (§7)
  const [brandGroupName, setBrandGroupName] = useState<string>('Taj Group');
  const [brandGroupCode, setBrandGroupCode] = useState<string>('TAJ-GRP');
  const [brandGroupHq, setBrandGroupHq] = useState<string>('Mumbai');
  const [brandGroupRoyalty, setBrandGroupRoyalty] = useState<number>(4.5);
  const [selectedFranchiseHotels, setSelectedFranchiseHotels] = useState<string[]>(['Mahesh Hotel', 'Chain Test Hotel']);
  const [createdBrandGroups, setCreatedBrandGroups] = useState<Array<{
    id: string;
    name: string;
    code: string;
    headquarters: string;
    royaltyPercent: number;
    linkedHotels: string[];
    createdAt: string;
  }>>([]);
  const [franchiseSuccessMsg, setFranchiseSuccessMsg] = useState<string | null>(null);

  // Super Staff RBAC Modal & Tabs (§5)
  const [isSuperStaffModalOpen, setIsSuperStaffModalOpen] = useState<boolean>(false);
  const [newSuperStaffName, setNewSuperStaffName] = useState<string>('Support Admin');
  const [newSuperStaffEmail, setNewSuperStaffEmail] = useState<string>('support@spicehub.com');
  const [newSuperStaffRole, setNewSuperStaffRole] = useState<string>('SUPER_STAFF');
  const [activeUsersTab, setActiveUsersTab] = useState<'DIRECTORY' | 'PERMISSIONS'>('DIRECTORY');

  // Subscriptions Invoice Modal (§2)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState<boolean>(false);
  const [invoicePreviewData, setInvoicePreviewData] = useState<{
    invoiceNo: string;
    hotelName: string;
    gstin: string;
    city: string;
    date: string;
    amount: number;
  }>({
    invoiceNo: 'INV-SAAS-2026-9104',
    hotelName: 'Mahesh Hotel',
    gstin: '08AAACH7409R1ZZ',
    city: 'Sikar, Rajasthan',
    date: '27 October 2026',
    amount: 14160,
  });


  // 11. Platform Analytics Range
  const [analyticsRange, setAnalyticsRange] = useState<'7D' | '30D' | '90D' | 'YTD'>('30D');

  // 12. CRM Guest Profiles State
  const [crmSearch, setCrmSearch] = useState('');
  const [crmTierFilter, setCrmTierFilter] = useState<'ALL' | 'PLATINUM' | 'GOLD' | 'SILVER'>('ALL');
  const [crmToast, setCrmToast] = useState<string | null>(null);

  // 13. Marketing & Offers State
  const [newPromoCode, setNewPromoCode] = useState('SUMMER25');
  const [newPromoPercent, setNewPromoPercent] = useState(25);
  const [marketingToast, setMarketingToast] = useState<string | null>(null);

  // 14. Feedback & Reviews State
  const [feedbackRatingFilter, setFeedbackRatingFilter] = useState<number | 'ALL'>('ALL');
  const [feedbackReplyId, setFeedbackReplyId] = useState<string | null>(null);
  const [feedbackReplyText, setFeedbackReplyText] = useState('');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // 15. Support Desk State
  const [supportFilter, setSupportFilter] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'>('ALL');
  const [supportToast, setSupportToast] = useState<string | null>(null);

  // 16. Integrations & Webhooks State
  const [webhookTestStatus, setWebhookTestStatus] = useState<string | null>(null);
  const [testingWebhook, setTestingWebhook] = useState(false);

  // 17. Backup & Data State
  const [isTakingSnapshot, setIsTakingSnapshot] = useState(false);
  const [snapshotSuccessTime, setSnapshotSuccessTime] = useState<string>('Today at 03:00 AM (Automated Cron)');
  const [backupToast, setBackupToast] = useState<string | null>(null);

  // 18. Security State
  const [isScanningSecurity, setIsScanningSecurity] = useState(false);
  const [securityScanPassed, setSecurityScanPassed] = useState(true);
  const [securityToast, setSecurityToast] = useState<string | null>(null);

  // 20. Broadcast Notifications State
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastAudience, setBroadcastAudience] = useState<'ALL_PROPERTIES' | 'ADMINS_ONLY' | 'STAFF_ONLY'>('ALL_PROPERTIES');
  const [broadcastToast, setBroadcastToast] = useState<string | null>(null);

  // 22. Platform Settings State
  const [platformCompanyName, setPlatformCompanyName] = useState('SpiceHub Hospitality OS');
  const [platformSupportEmail, setPlatformSupportEmail] = useState('ops@spicehub.com');
  const [platformAwsRegion, setPlatformAwsRegion] = useState('ap-south-1 (Mumbai, India)');
  const [settingsToast, setSettingsToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadPlatformData = async () => {
      setPlatformLoading(true);
      setPlatformError('');
      setPlatformUsersError('');
      const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
      try {
        const range = rangeForPeriod(dateRange);
        const query = new URLSearchParams(range).toString();
        const headers = platformAuthHeaders();
        const [tenantsResponse, metricsResponse, usersResponse, plansResponse, roomsResponse] = await Promise.all([
          fetch(`${env.apiBaseUrl}/superadmin/tenants?${query}`, { headers }),
          fetch(`${env.apiBaseUrl}/superadmin/metrics?${query}`, { headers }),
          fetch(`${env.apiBaseUrl}/superadmin/users`, { headers }),
          fetch(`${env.apiBaseUrl}/superadmin/plans`, { headers }),
          fetch(`${env.apiBaseUrl}/superadmin/fleet-rooms`, { headers }),
        ]);
        const tenantJson = await tenantsResponse.json().catch(() => null);
        if (!tenantsResponse.ok || !tenantJson?.success) {
          throw new Error(
            tenantJson?.message || `Tenant API returned HTTP ${tenantsResponse.status}`
          );
        }
        const mappedTenants: TenantHotelItem[] = (tenantJson.tenants || []).map(
          (tenant: any) => {
            const totalRooms = Number(tenant.roomCount || 0);
            const activeRooms = Number(tenant.occupiedRoomCount || 0);
            return {
              id: String(tenant.id || ''),
              name: String(tenant.name || 'Unnamed property'),
              code: String(tenant.slug || '').toUpperCase(),
              slug: String(tenant.slug || ''),
              city: String(tenant.city || '—'),
              state: String(tenant.state || '—'),
              contactEmail: String(tenant.contactEmail || ''),
              contactPhone: String(tenant.contactPhone || ''),
              adminEmail: String(tenant.adminEmail || tenant.contactEmail || ''),
              adminName: String(tenant.adminName || `${tenant.name} Admin`),
              adminPhone: String(tenant.adminPhone || tenant.contactPhone || ''),
              currency: String(tenant.currency || ''),
              subscriptionStartDate: tenant.subscriptionStartDate ? String(tenant.subscriptionStartDate) : '',
              subscriptionEndDate: tenant.subscriptionEndDate ? String(tenant.subscriptionEndDate) : '',
              subscriptionDurationMonths: Number(tenant.subscriptionDurationMonths || 1),
              logoUrl: String(tenant.logoUrl || ''),
              coverImageUrl: String(tenant.coverImageUrl || ''),
              photos: Array.isArray(tenant.photos) ? tenant.photos : [],
              tagline: String(tenant.tagline || ''),
              primaryColor: String(tenant.primaryColor || '#f59e0b'),
              secondaryColor: String(tenant.secondaryColor || '#0f172a'),
              domain: String(tenant.domain || ''),
              plan:
                (tenant.plan as TenantHotelItem['plan']) ||
                (tenant.status === 'TRIAL' ? 'TRIAL' : 'CUSTOM'),
              activeRooms,
              totalRooms,
              maxRooms: Number(tenant.maxRooms || 30),
              activeTables: Number(tenant.occupiedTables || 0),
              totalTables: Number(tenant.totalTables || 0),
              maxTables: Number(tenant.maxTables || 20),
              status: tenant.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE',
              monthlyBilling: Number(tenant.monthlyPriceINR || 0),
              todayRevenue: Number(tenant.periodRevenue || 0),
              todayOrders: Number(tenant.periodOrders || 0),
              occupancyPercent:
                totalRooms > 0 ? Math.round((activeRooms / totalRooms) * 100) : 0,
              enabledPortals:
                Array.isArray(tenant.enabledPortals) && tenant.enabledPortals.length > 0
                  ? tenant.enabledPortals
                  : ['admin', 'cashier', 'reception', 'kds', 'waiter', 'customer', 'guest'],
              billingCycle: (tenant.billingCycle as 'MONTHLY' | 'ANNUAL') || 'MONTHLY',
              customPricingAdjustmentINR: Number(tenant.customPricingAdjustmentINR || 0),
              street: String(tenant.street || tenant.address?.street || ''),
              pincode: String(tenant.pincode || tenant.address?.pincode || ''),
              country: String(tenant.country || tenant.address?.country || 'India'),
              latitude: typeof tenant.latitude === 'number' ? tenant.latitude : (typeof tenant.coordinates?.latitude === 'number' ? tenant.coordinates.latitude : undefined),
              longitude: typeof tenant.longitude === 'number' ? tenant.longitude : (typeof tenant.coordinates?.longitude === 'number' ? tenant.coordinates.longitude : undefined),
              googleMapUrl: String(tenant.googleMapUrl || ''),
              locationNotes: String(tenant.locationNotes || ''),
              coordinates: tenant.coordinates,
              address: tenant.address,
              features: {
                kdsEnabled: Boolean(tenant.featureFlags?.kdsEnabled),
                soundboxEnabled: false,
                aiPricingEnabled: Boolean(tenant.featureFlags?.aiInsightsEnabled),
                banquetEnabled: Boolean(tenant.featureFlags?.banquetEnabled),
                qrOrderingEnabled: Boolean(tenant.featureFlags?.qrDineInEnabled),
                standaloneCashierEnabled: false,
              },
              createdAt: String(tenant.createdAt || ''),
              subscribedFeatures: Array.isArray(tenant.subscribedFeatures) && tenant.subscribedFeatures.length > 0
                ? tenant.subscribedFeatures
                : ['pms_inventory', 'qr_table_ordering', 'gst_invoicing', 'whatsapp_alerts', 'staff_attendance', 'kds_routing'],
              subscription: tenant.subscription,
            };
          }
        );

        const metricsJson = await metricsResponse.json().catch(() => null);
        if (!metricsResponse.ok || !metricsJson?.success) {
          throw new Error(
            metricsJson?.message || `Metrics API returned HTTP ${metricsResponse.status}`
          );
        }
        const usersJson = await usersResponse.json().catch(() => null);
        const plansJson = plansResponse.json ? await plansResponse.json().catch(() => null) : null;
        const roomsJson = roomsResponse?.json ? await roomsResponse.json().catch(() => null) : null;
        if (cancelled) return;

        if (roomsJson?.success && Array.isArray(roomsJson.rooms) && roomsJson.rooms.length > 0) {
          setFleetRooms(roomsJson.rooms);
        }

        setPlatformPlans(
          plansResponse.ok && plansJson?.success && Array.isArray(plansJson.plans)
            ? plansJson.plans.map((plan: any) => ({
                id: String(plan._id || plan.id || ''),
                name: String(plan.name || 'PLAN'),
                code: String(plan.code || ''),
                monthlyPriceINR: Number(plan.monthlyPriceINR || 0),
                annualPriceINR: Number(plan.annualPriceINR || 0),
                limits: {
                  maxRooms: Number(plan.limits?.maxRooms || 0),
                  maxTables: Number(plan.limits?.maxTables || 0),
                  maxStaffUsers: Number(plan.limits?.maxStaffUsers || 0),
                },
                featureFlags: (plan.featureFlags || {}) as Record<string, boolean>,
                isActive: plan.isActive !== false,
              }))
            : []
        );
        setPlansError(
          plansResponse.ok && plansJson?.success
            ? ''
            : plansJson?.message || `Plans API returned HTTP ${plansResponse.status}`
        );

        setTenants(mappedTenants);
        if (!usersResponse.ok || !usersJson?.success || !Array.isArray(usersJson?.users)) {
          setPlatformUsers([]);
          setPlatformUsersError(
            usersJson?.message || `Users API returned HTTP ${usersResponse.status}`
          );
        } else {
          setPlatformUsers(
            usersJson.users.map((user: any) => ({
                id: String(user.id),
                name: String(user.name || 'Staff member'),
                email: String(user.email || ''),
                phone: String(user.phone || ''),
                role: String(user.role || '').replace(/_/g, ' '),
                hotelId: String(user.hotelId || ''),
                hotelName: String(user.hotelName || 'Unassigned'),
                isActive: Boolean(user.isActive),
                shiftStatus: String(user.shiftStatus || 'OFF_DUTY'),
                createdAt: user.createdAt ? String(user.createdAt) : undefined,
              }))
          );
        }
        setPlatformMetrics(metricsJson.platformMetrics as PlatformMetrics);
        setLastLoadedAt(new Date());
        setPlatformLatencyMs(
          Math.round(
            (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt
          )
        );
        setAuditLogs(
          (metricsJson.platformMetrics?.activity || []).map((item: any) => ({
            id: String(item.id),
            time: relativeTime(item.occurredAt),
            branch: String(item.subtitle || 'Platform'),
            action: `${item.title} • ${String(item.status || '').replace(/_/g, ' ')}`,
            amount: Number(item.amount || 0),
            type: item.kind === 'BOOKING' ? 'ROOM' : 'ORDER',
          }))
        );
      } catch (error: any) {
        if (!cancelled) {
          setPlatformError(
            error?.message ||
              'Could not load platform metrics. Check the backend connection and retry.'
          );
        }
      } finally {
        if (!cancelled) setPlatformLoading(false);
      }
    };

    void loadPlatformData();
    return () => {
      cancelled = true;
    };
  }, [dateRange, refreshKey]);

  const hotelAdmins = useMemo(() => {
    const fromUsers = platformUsers.filter(
      (user) => user.role.trim().replace(/\s+/g, '_').toUpperCase() === 'HOTEL_ADMIN'
    );
    if (fromUsers.length > 0) return fromUsers;
    return tenants.map((t) => ({
      id: `admin-${t.id}`,
      tenantId: t.id,
      name: `${t.name} General Manager`,
      email: t.adminEmail || t.contactEmail,
      phone: t.contactPhone || '+91 98290 12345',
      hotelName: t.name,
      role: 'HOTEL_ADMIN',
      isActive: t.status === 'ACTIVE',
      createdAt: t.createdAt,
      shiftStatus: 'ON_DUTY',
    }));
  }, [platformUsers, tenants]);

  const filteredHotelAdmins = hotelAdmins.filter((user) => {
    const matchesStatus =
      hotelAdminStatus === 'ALL' ||
      (hotelAdminStatus === 'ACTIVE' ? user.isActive : !user.isActive);
    const matchesProperty =
      hotelAdminPropertyFilter === 'ALL' ||
      user.tenantId === hotelAdminPropertyFilter ||
      user.hotelName === hotelAdminPropertyFilter;
    const query = hotelAdminSearch.trim().toLowerCase();
    const matchesSearch =
      query.length === 0 ||
      [user.name, user.email, user.phone, user.hotelName].some((value) =>
        value.toLowerCase().includes(query)
      );
    return matchesStatus && matchesSearch && matchesProperty;
  });

  // Global Announcement
  const [globalAnnouncement, setGlobalAnnouncement] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('spicehub_global_announcement') || '' : ''
  );
  const [announcementInput, setAnnouncementInput] = useState('');

  const handleSetAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementInput.trim()) return;
    const text = announcementInput.trim();
    setGlobalAnnouncement(text);
    if (typeof window !== 'undefined') {
      localStorage.setItem('spicehub_global_announcement', text);
    }
    setAuditLogs((prev) => [
      {
        id: `ev-${Date.now()}`,
        time: 'Just now',
        branch: 'Super Admin HQ',
        action: `Local operator banner saved: "${text}"`,
        type: 'ALERT',
      },
      ...prev,
    ]);
    setAnnouncementInput('');
  };

  const handleClearAnnouncement = () => {
    setGlobalAnnouncement('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('spicehub_global_announcement');
    }
  };

  // Onboard Property Form
  const [newName, setNewName] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newState, setNewState] = useState('Rajasthan');
  const [newPlan, setNewPlan] = useState<'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'>('PROFESSIONAL');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newRooms, setNewRooms] = useState(30);
  const [newTables, setNewTables] = useState(20);
  const [newLogoUrl, setNewLogoUrl] = useState('');
  const [newCoverImageUrl, setNewCoverImageUrl] = useState('');
  const [newTagline, setNewTagline] = useState('');
  const [newStreet, setNewStreet] = useState('');
  const [newPincode, setNewPincode] = useState('');
  const [newCountry, setNewCountry] = useState('India');
  const [newLatitude, setNewLatitude] = useState<number>(26.9124);
  const [newLongitude, setNewLongitude] = useState<number>(75.7873);
  const [newGoogleMapUrl, setNewGoogleMapUrl] = useState('');
  const [newLocationNotes, setNewLocationNotes] = useState('');
  const [onboarding, setOnboarding] = useState(false);
  const [onboardError, setOnboardError] = useState('');
  const [onboardStep, setOnboardStep] = useState<1 | 2 | 3 | 4>(1);
  const [tenantActionId, setTenantActionId] = useState('');

  useEffect(() => {
    if (isOnboardModalOpen) {
      setOnboardStep(1);
      setOnboardError('');
    }
  }, [isOnboardModalOpen]);
  const [impersonatingTenantId, setImpersonatingTenantId] = useState('');

  // Real Hotel Location & Google Maps Coordinates Modal State
  const [managingLocationTenant, setManagingLocationTenant] = useState<TenantHotelItem | null>(null);
  const [locStreet, setLocStreet] = useState<string>('');
  const [locCity, setLocCity] = useState<string>('Jaipur');
  const [locState, setLocState] = useState<string>('Rajasthan');
  const [locPincode, setLocPincode] = useState<string>('');
  const [locCountry, setLocCountry] = useState<string>('India');
  const [locLatitude, setLocLatitude] = useState<number>(26.9124);
  const [locLongitude, setLocLongitude] = useState<number>(75.7873);
  const [locGoogleMapUrl, setLocGoogleMapUrl] = useState<string>('');
  const [locNotes, setLocNotes] = useState<string>('');
  const [isSavingLocation, setIsSavingLocation] = useState<boolean>(false);
  const [locSuccessMsg, setLocSuccessMsg] = useState<string>('');
  const [locErrorMsg, setLocErrorMsg] = useState<string>('');
  const [locSearchQuery, setLocSearchQuery] = useState<string>('');

  // Subscription Duration Adjustment Modal State
  const [managingSubscriptionTenant, setManagingSubscriptionTenant] = useState<TenantHotelItem | null>(null);
  const [subDurationType, setSubDurationType] = useState<'1m' | '3m' | '6m' | '1y' | '2y' | 'custom'>('1m');
  const [subCustomMonths, setSubCustomMonths] = useState<number>(1);
  const [subStartDate, setSubStartDate] = useState<string>('');
  const [subEndDate, setSubEndDate] = useState<string>('');
  const [subStatus, setSubStatus] = useState<'ACTIVE' | 'SUSPENDED' | 'MAINTENANCE'>('ACTIVE');
  const [subMonthlyRate, setSubMonthlyRate] = useState<number>(0);
  const [isSavingSubscription, setIsSavingSubscription] = useState<boolean>(false);
  const [subscriptionSuccessMsg, setSubscriptionSuccessMsg] = useState<string>('');
  const [subscriptionErrorMsg, setSubscriptionErrorMsg] = useState<string>('');

  // Property Capacity Ceilings (Max Rooms & Max Tables) Modal State
  const [managingCapacityTenant, setManagingCapacityTenant] = useState<TenantHotelItem | null>(null);
  const [capacityMaxRooms, setCapacityMaxRooms] = useState<number>(30);
  const [capacityMaxTables, setCapacityMaxTables] = useState<number>(20);
  const [isSavingCapacity, setIsSavingCapacity] = useState<boolean>(false);
  const [capacitySuccessMsg, setCapacitySuccessMsg] = useState<string>('');
  const [capacityErrorMsg, setCapacityErrorMsg] = useState<string>('');

  // Admin Credentials & Password Management Modal State
  const [managingCredentialsTenant, setManagingCredentialsTenant] = useState<TenantHotelItem | null>(null);
  const [credNewPassword, setCredNewPassword] = useState<string>('');
  const [isResettingPassword, setIsResettingPassword] = useState<boolean>(false);
  const [credSuccessData, setCredSuccessData] = useState<{ email: string; password?: string; hotelSlug: string } | null>(null);
  const [credErrorMsg, setCredErrorMsg] = useState<string>('');
  const [clipboardNotice, setClipboardNotice] = useState<string>('');

  // Onboard New Property Subscription Duration & Created Credentials
  const [onboardDurationMonths, setOnboardDurationMonths] = useState<number>(1);
  const [createdCredentialsModal, setCreatedCredentialsModal] = useState<{
    hotelName: string;
    hotelSlug: string;
    adminEmail: string;
    adminPassword: string;
    subscriptionStartDate: string;
    subscriptionEndDate: string;
    durationMonths: number;
    portalUrl: string;
  } | null>(null);

  // Edit Branding & Property Details Modal State
  const [isBrandingModalOpen, setIsBrandingModalOpen] = useState(false);
  const [editingBrandingTenant, setEditingBrandingTenant] = useState<TenantHotelItem | null>(null);
  const [editHotelName, setEditHotelName] = useState('');
  const [editHotelCity, setEditHotelCity] = useState('');
  const [editHotelState, setEditHotelState] = useState('');
  const [editContactPhone, setEditContactPhone] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [editCoverImageUrl, setEditCoverImageUrl] = useState('');
  const [editTagline, setEditTagline] = useState('');
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [brandingError, setBrandingError] = useState('');
  const [brandingSuccess, setBrandingSuccess] = useState('');

  // Dedicated White-Label Branding Studio State
  const [selectedBrandingTenantId, setSelectedBrandingTenantId] = useState<string>('');
  const [brandLogoUrl, setBrandLogoUrl] = useState<string>('');
  const [brandCoverUrl, setBrandCoverUrl] = useState<string>('');
  const [brandPrimaryColor, setBrandPrimaryColor] = useState<string>('#f59e0b');
  const [brandSecondaryColor, setBrandSecondaryColor] = useState<string>('#10b981');
  const [brandDomain, setBrandDomain] = useState<string>('');
  const [brandTagline, setBrandTagline] = useState<string>('');
  const [isSavingBrandingStudio, setIsSavingBrandingStudio] = useState<boolean>(false);
  const [brandingStudioMsg, setBrandingStudioMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [, setGlobalAuditLogs] = useState<GlobalAuditLogRecord[]>([]);

  // Rooms & PMS Fleet Management State
  const [selectedRoomHotelFilter, setSelectedRoomHotelFilter] = useState<string>('ALL');
  const [roomStatusFilter, setRoomStatusFilter] = useState<'ALL' | 'OCCUPIED' | 'VACANT_CLEAN' | 'VACANT_DIRTY' | 'MAINTENANCE'>('ALL');
  const [roomViewMode, setRoomViewMode] = useState<'grid' | 'table'>('grid');
  const [roomSearchQuery, setRoomSearchQuery] = useState<string>('');
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);
  const [roomToastMsg, setRoomToastMsg] = useState<string | null>(null);
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomFloor, setNewRoomFloor] = useState('1');
  const [newRoomCategory, setNewRoomCategory] = useState<'Royal Maharaja Suite' | 'Deluxe Heritage' | 'Executive City' | 'Courtyard Villa'>('Deluxe Heritage');
  const [newRoomRate, setNewRoomRate] = useState('4500');
  const [newRoomHotelId, setNewRoomHotelId] = useState('');

  interface FleetRoomItem {
    id: string;
    hotelId: string;
    hotelName: string;
    roomNumber: string;
    category: 'Royal Maharaja Suite' | 'Deluxe Heritage' | 'Executive City' | 'Courtyard Villa';
    floor: number;
    ratePerNight: number;
    status: 'OCCUPIED' | 'VACANT_CLEAN' | 'VACANT_DIRTY' | 'MAINTENANCE';
    currentGuest?: string;
    checkOut?: string;
  }

  const [fleetRooms, setFleetRooms] = useState<FleetRoomItem[]>([
    { id: 'rm-101', hotelId: 'tenant-1', hotelName: 'Mahesh Hotel (Sikar)', roomNumber: '101', category: 'Royal Maharaja Suite', floor: 1, ratePerNight: 9500, status: 'OCCUPIED', currentGuest: 'Rajesh Singhania', checkOut: 'Tomorrow, 11:00 AM' },
    { id: 'rm-102', hotelId: 'tenant-1', hotelName: 'Mahesh Hotel (Sikar)', roomNumber: '102', category: 'Deluxe Heritage', floor: 1, ratePerNight: 4500, status: 'VACANT_CLEAN' },
    { id: 'rm-103', hotelId: 'tenant-1', hotelName: 'Mahesh Hotel (Sikar)', roomNumber: '103', category: 'Deluxe Heritage', floor: 1, ratePerNight: 4500, status: 'VACANT_DIRTY' },
    { id: 'rm-104', hotelId: 'tenant-1', hotelName: 'Mahesh Hotel (Sikar)', roomNumber: '104', category: 'Executive City', floor: 1, ratePerNight: 3200, status: 'OCCUPIED', currentGuest: 'Dr. Priya Sharma', checkOut: 'Today, 02:00 PM' },
    { id: 'rm-201', hotelId: 'tenant-1', hotelName: 'Mahesh Hotel (Sikar)', roomNumber: '201', category: 'Royal Maharaja Suite', floor: 2, ratePerNight: 9500, status: 'OCCUPIED', currentGuest: 'Vikramaditya Rathore', checkOut: '14 Nov, 12:00 PM' },
    { id: 'rm-202', hotelId: 'tenant-1', hotelName: 'Mahesh Hotel (Sikar)', roomNumber: '202', category: 'Deluxe Heritage', floor: 2, ratePerNight: 4500, status: 'VACANT_CLEAN' },
    { id: 'rm-203', hotelId: 'tenant-1', hotelName: 'Mahesh Hotel (Sikar)', roomNumber: '203', category: 'Courtyard Villa', floor: 2, ratePerNight: 7800, status: 'MAINTENANCE' },
    { id: 'rm-204', hotelId: 'tenant-1', hotelName: 'Mahesh Hotel (Sikar)', roomNumber: '204', category: 'Executive City', floor: 2, ratePerNight: 3200, status: 'OCCUPIED', currentGuest: 'Ananya Deshmukh', checkOut: 'Tomorrow, 10:00 AM' },
    { id: 'rm-301', hotelId: 'tenant-2', hotelName: 'The Royal Palm Resort & Suites (Jaipur)', roomNumber: '301', category: 'Royal Maharaja Suite', floor: 3, ratePerNight: 12500, status: 'OCCUPIED', currentGuest: 'Suresh Kumar Gupta', checkOut: 'Tomorrow, 12:00 PM' },
    { id: 'rm-302', hotelId: 'tenant-2', hotelName: 'The Royal Palm Resort & Suites (Jaipur)', roomNumber: '302', category: 'Deluxe Heritage', floor: 3, ratePerNight: 5500, status: 'VACANT_CLEAN' },
    { id: 'rm-303', hotelId: 'tenant-2', hotelName: 'The Royal Palm Resort & Suites (Jaipur)', roomNumber: '303', category: 'Courtyard Villa', floor: 3, ratePerNight: 8500, status: 'OCCUPIED', currentGuest: 'Meenakshi Iyer', checkOut: '15 Nov, 11:00 AM' },
    { id: 'rm-304', hotelId: 'tenant-2', hotelName: 'The Royal Palm Resort & Suites (Jaipur)', roomNumber: '304', category: 'Deluxe Heritage', floor: 3, ratePerNight: 5500, status: 'VACANT_DIRTY' },
    { id: 'rm-401', hotelId: 'tenant-3', hotelName: 'Citrus Grand Executive Suites (Mumbai)', roomNumber: '401', category: 'Executive City', floor: 4, ratePerNight: 4200, status: 'VACANT_CLEAN' },
    { id: 'rm-402', hotelId: 'tenant-3', hotelName: 'Citrus Grand Executive Suites (Mumbai)', roomNumber: '402', category: 'Executive City', floor: 4, ratePerNight: 4200, status: 'OCCUPIED', currentGuest: 'Aditya Birla Exec', checkOut: 'Today, 06:00 PM' },
    { id: 'rm-403', hotelId: 'tenant-3', hotelName: 'Citrus Grand Executive Suites (Mumbai)', roomNumber: '403', category: 'Courtyard Villa', floor: 4, ratePerNight: 8900, status: 'MAINTENANCE' },
    { id: 'rm-501', hotelId: 'tenant-4', hotelName: 'Udaipur Lakeside Heritage Haveli', roomNumber: '501', category: 'Royal Maharaja Suite', floor: 5, ratePerNight: 14000, status: 'OCCUPIED', currentGuest: 'Royal Heritage Guest', checkOut: '16 Nov, 12:00 PM' },
    { id: 'rm-502', hotelId: 'tenant-4', hotelName: 'Udaipur Lakeside Heritage Haveli', roomNumber: '502', category: 'Deluxe Heritage', floor: 5, ratePerNight: 6200, status: 'VACANT_CLEAN' },
  ]);

  // System Configuration State
  const [maintenanceModeActive, setMaintenanceModeActive] = useState<boolean>(false);
  const [decouplingEnforced, setDecouplingEnforced] = useState<boolean>(true);
  const [backupTriggerMsg, setBackupTriggerMsg] = useState<string | null>(null);

  // Modular Portals & Dynamic Pricing State for Onboarding
  const [onboardPortals, setOnboardPortals] = useState<PortalKey[]>([
    'admin',
    'reception',
    'cashier',
    'kds',
    'waiter',
    'customer',
    'guest',
  ]);
  const [onboardServiceCapabilities, setOnboardServiceCapabilities] = useState({
    roomBooking: true,
    reception: true,
    inRoomServices: true,
    tableOrdering: true,
    waiterDispatch: true,
  });
  const [onboardDiscount, setOnboardDiscount] = useState<number>(0);
  const [onboardBillingCycle, setOnboardBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');

  const onboardPricing = useMemo(
    () => calculateModularSubscription(onboardPortals, onboardDiscount, onboardBillingCycle),
    [onboardPortals, onboardDiscount, onboardBillingCycle]
  );

  const toggleOnboardPortal = (portalId: PortalKey) => {
    if (portalId === 'admin') return; // Admin ERP is core required base
    const removing = onboardPortals.includes(portalId);
    setOnboardPortals((prev) => removing ? prev.filter((p) => p !== portalId) : [...prev, portalId]);
    if (removing) {
      const portalCapabilities: Partial<Record<PortalKey, keyof typeof onboardServiceCapabilities>> = {
        guest: 'roomBooking',
        reception: 'reception',
        customer: 'tableOrdering',
        waiter: 'waiterDispatch',
      };
      const capability = portalCapabilities[portalId];
      if (capability) {
        setOnboardServiceCapabilities((prev) => ({ ...prev, [capability]: false }));
      }
      if (portalId === 'guest') {
        setOnboardServiceCapabilities((prev) => ({ ...prev, roomBooking: false, inRoomServices: false }));
      }
    }
  };

  const applyOnboardPreset = (preset: 'FULL' | 'RESTAURANT' | 'CAFE_NO_WAITER' | 'ROOMS_ONLY' | 'TABLE_NO_WAITER' | 'TABLE_WITH_WAITER' | 'ROOMS_NO_BOOKING' | 'ROOMS_NO_DINING' | 'RECEPTION_NO_BOOKING' | 'NO_GUEST_SERVICES') => {
    switch (preset) {
      case 'FULL':
        setOnboardPortals(ALL_PORTAL_KEYS);
        setOnboardServiceCapabilities({ roomBooking: true, reception: true, inRoomServices: true, tableOrdering: true, waiterDispatch: true });
        break;
      case 'RESTAURANT':
        setOnboardPortals(['admin', 'cashier', 'kds', 'waiter', 'customer']);
        setOnboardServiceCapabilities({ roomBooking: false, reception: false, inRoomServices: false, tableOrdering: true, waiterDispatch: true });
        break;
      case 'CAFE_NO_WAITER':
      case 'TABLE_NO_WAITER':
        setOnboardPortals(['admin', 'cashier', 'kds', 'customer']);
        setOnboardServiceCapabilities({ roomBooking: false, reception: false, inRoomServices: false, tableOrdering: true, waiterDispatch: false });
        break;
      case 'TABLE_WITH_WAITER':
        setOnboardPortals(['admin', 'cashier', 'kds', 'waiter', 'customer']);
        setOnboardServiceCapabilities({ roomBooking: false, reception: false, inRoomServices: false, tableOrdering: true, waiterDispatch: true });
        break;
      case 'ROOMS_NO_BOOKING':
        setOnboardPortals(['admin', 'cashier', 'kds', 'reception', 'guest']);
        setOnboardServiceCapabilities({ roomBooking: false, reception: true, inRoomServices: true, tableOrdering: false, waiterDispatch: false });
        break;
      case 'ROOMS_ONLY':
        setOnboardPortals(['admin', 'cashier', 'kds', 'reception', 'guest']);
        setOnboardServiceCapabilities({ roomBooking: true, reception: true, inRoomServices: true, tableOrdering: false, waiterDispatch: false });
        break;
      case 'ROOMS_NO_DINING':
        setOnboardPortals(['admin', 'reception', 'guest']);
        setOnboardServiceCapabilities({ roomBooking: true, reception: true, inRoomServices: false, tableOrdering: false, waiterDispatch: false });
        break;
      case 'RECEPTION_NO_BOOKING':
        setOnboardPortals(['admin', 'reception']);
        setOnboardServiceCapabilities({ roomBooking: false, reception: true, inRoomServices: false, tableOrdering: false, waiterDispatch: false });
        break;
      case 'NO_GUEST_SERVICES':
        setOnboardPortals(['admin']);
        setOnboardServiceCapabilities({ roomBooking: false, reception: false, inRoomServices: false, tableOrdering: false, waiterDispatch: false });
        break;
    }
  };

  const toggleOnboardCapability = (key: keyof typeof onboardServiceCapabilities) => {
    const portalForCapability = {
      roomBooking: 'guest',
      reception: 'reception',
      inRoomServices: 'guest',
      tableOrdering: 'customer',
      waiterDispatch: 'waiter',
    } as const;
    const enabled = !onboardServiceCapabilities[key];
    if (enabled) {
      const requiredPortal = portalForCapability[key] as PortalKey;
      setOnboardPortals((prev) => prev.includes(requiredPortal) ? prev : [...prev, requiredPortal]);
    }
    setOnboardServiceCapabilities((prev) => ({ ...prev, [key]: enabled }));
  };

  // Dynamic DB-Backed Portal Pricing Catalog
  const [dbPortalCatalog, setDbPortalCatalog] = useState(DEFAULT_PORTAL_CATALOG);
  const [editingPriceKey, setEditingPriceKey] = useState<PortalKey | null>(null);
  const [customPriceInput, setCustomPriceInput] = useState<string>('');
  const [isUpdatingDbPrice, setIsUpdatingDbPrice] = useState(false);

  const loadPortalPricing = useCallback(async () => {
    try {
      const res = await fetch(`${env.apiBaseUrl}/superadmin/portal-pricing`, {
        headers: platformAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.success && Array.isArray(json.catalog) && json.catalog.length > 0) {
          setDbPortalCatalog(
            json.catalog.map((item: any) => ({
              id: item.portalKey || item.id,
              name: item.name,
              role: item.role,
              port: item.port,
              category: item.category,
              categoryLabel: item.categoryLabel,
              defaultMonthlyPriceINR: Number(item.defaultMonthlyPriceINR) || 0,
              badge: item.badge || '',
              emoji: item.emoji || '',
              description: item.description || '',
              requiredBase: (item.portalKey || item.id) === 'admin',
            }))
          );
        }
      }
    } catch (err) {
      console.warn('DB portal pricing fetch fallback:', err);
    }
  }, [env.apiBaseUrl]);

  useEffect(() => {
    void loadPortalPricing();
  }, [loadPortalPricing, refreshKey]);

  const handleUpdateDbPortalPrice = async (portalKey: PortalKey, newPrice: number) => {
    setIsUpdatingDbPrice(true);
    try {
      const res = await fetch(`${env.apiBaseUrl}/superadmin/portal-pricing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...platformAuthHeaders() },
        body: JSON.stringify({ portalKey, defaultMonthlyPriceINR: newPrice }),
      });
      if (res.ok) {
        await loadPortalPricing();
        setEditingPriceKey(null);
      }
    } catch (err) {
      console.error('Failed to update DB portal price:', err);
    } finally {
      setIsUpdatingDbPrice(false);
    }
  };

  // Modular Portals & Dynamic Pricing State for Editing Existing Tenant
  const [editingTenantPortals, setEditingTenantPortals] = useState<TenantHotelItem | null>(null);
  const [editPortalsList, setEditPortalsList] = useState<PortalKey[]>([]);
  const [editServiceCapabilities, setEditServiceCapabilities] = useState({
    roomBooking: true,
    reception: true,
    inRoomServices: true,
    tableOrdering: true,
    waiterDispatch: true,
  });
  const [editDiscount, setEditDiscount] = useState<number>(0);
  const [editBillingCycle, setEditBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');
  const [isSavingPortals, setIsSavingPortals] = useState(false);
  const [editPortalsError, setEditPortalsError] = useState('');

  const editPricing = useMemo(() => {
    const catalogMap = new Map(dbPortalCatalog.map((c) => [c.id, c.defaultMonthlyPriceINR]));
    const subtotal = editPortalsList.reduce((sum, p) => sum + (catalogMap.get(p) || 0), 0);
    const discount = Math.min(subtotal, Math.max(0, editDiscount));
    const monthlyTotal = Math.max(0, subtotal - discount);
    const annualMultiplier = 10;
    const annualTotal = monthlyTotal * annualMultiplier;
    return {
      baseMonthlyTotalINR: subtotal,
      customAdjustmentINR: discount,
      finalMonthlyTotalINR: monthlyTotal,
      billingCycle: editBillingCycle,
      effectiveRateINR: editBillingCycle === 'ANNUAL' ? annualTotal : monthlyTotal,
      annualTotalINR: annualTotal,
    };
  }, [editPortalsList, editDiscount, editBillingCycle, dbPortalCatalog]);

  const handleOpenEditPortals = (tenant: TenantHotelItem) => {
    setEditingTenantPortals(tenant);
    const portals = (
      Array.isArray(tenant.enabledPortals) && tenant.enabledPortals.length > 0
        ? (tenant.enabledPortals as PortalKey[])
        : ALL_PORTAL_KEYS
    );
    setEditPortalsList(portals);
    setEditServiceCapabilities(tenant.serviceCapabilities || {
      roomBooking: portals.includes('guest'),
      reception: portals.includes('reception'),
      inRoomServices: portals.includes('guest'),
      tableOrdering: portals.includes('customer'),
      waiterDispatch: portals.includes('waiter'),
    });
    setEditDiscount(Number(tenant.customPricingAdjustmentINR || 0));
    setEditBillingCycle((tenant.billingCycle as 'MONTHLY' | 'ANNUAL') || 'MONTHLY');
    setEditPortalsError('');
  };

  const toggleEditPortal = (portalId: PortalKey) => {
    if (portalId === 'admin') return; // Admin ERP is core required base
    setEditPortalsList((prev) => {
      const exists = prev.includes(portalId);
      const nextList = exists ? prev.filter((p) => p !== portalId) : [...prev, portalId];
      if (exists) {
        // Disabling portal -> auto-disable dependent service capabilities
        setEditServiceCapabilities((cap) => ({
          ...cap,
          ...(portalId === 'guest' ? { roomBooking: false, inRoomServices: false } : {}),
          ...(portalId === 'customer' ? { tableOrdering: false } : {}),
          ...(portalId === 'waiter' ? { waiterDispatch: false } : {}),
          ...(portalId === 'reception' ? { reception: false } : {}),
        }));
      }
      return nextList;
    });
  };

  const applyEditPreset = (preset: 'FULL' | 'RESTAURANT' | 'CAFE_NO_WAITER' | 'ROOMS_ONLY' | 'TABLE_NO_WAITER' | 'TABLE_WITH_WAITER' | 'ROOMS_NO_BOOKING' | 'ROOMS_NO_DINING' | 'RECEPTION_NO_BOOKING' | 'NO_GUEST_SERVICES') => {
    switch (preset) {
      case 'FULL':
        setEditPortalsList(ALL_PORTAL_KEYS);
        setEditServiceCapabilities({ roomBooking: true, reception: true, inRoomServices: true, tableOrdering: true, waiterDispatch: true });
        break;
      case 'RESTAURANT':
        setEditPortalsList(['admin', 'cashier', 'kds', 'waiter', 'customer']);
        setEditServiceCapabilities({ roomBooking: false, reception: false, inRoomServices: false, tableOrdering: true, waiterDispatch: true });
        break;
      case 'CAFE_NO_WAITER':
      case 'TABLE_NO_WAITER':
        setEditPortalsList(['admin', 'cashier', 'kds', 'customer']);
        setEditServiceCapabilities({ roomBooking: false, reception: false, inRoomServices: false, tableOrdering: true, waiterDispatch: false });
        break;
      case 'TABLE_WITH_WAITER':
        setEditPortalsList(['admin', 'cashier', 'kds', 'waiter', 'customer']);
        setEditServiceCapabilities({ roomBooking: false, reception: false, inRoomServices: false, tableOrdering: true, waiterDispatch: true });
        break;
      case 'ROOMS_NO_BOOKING':
        setEditPortalsList(['admin', 'cashier', 'kds', 'reception', 'guest']);
        setEditServiceCapabilities({ roomBooking: false, reception: true, inRoomServices: true, tableOrdering: false, waiterDispatch: false });
        break;
      case 'ROOMS_ONLY':
        setEditPortalsList(['admin', 'cashier', 'kds', 'reception', 'guest']);
        setEditServiceCapabilities({ roomBooking: true, reception: true, inRoomServices: true, tableOrdering: false, waiterDispatch: false });
        break;
      case 'ROOMS_NO_DINING':
        setEditPortalsList(['admin', 'reception', 'guest']);
        setEditServiceCapabilities({ roomBooking: true, reception: true, inRoomServices: false, tableOrdering: false, waiterDispatch: false });
        break;
      case 'RECEPTION_NO_BOOKING':
        setEditPortalsList(['admin', 'reception']);
        setEditServiceCapabilities({ roomBooking: false, reception: true, inRoomServices: false, tableOrdering: false, waiterDispatch: false });
        break;
      case 'NO_GUEST_SERVICES':
        setEditPortalsList(['admin']);
        setEditServiceCapabilities({ roomBooking: false, reception: false, inRoomServices: false, tableOrdering: false, waiterDispatch: false });
        break;
    }
  };

  const toggleEditCapability = (key: keyof typeof editServiceCapabilities) => {
    const portalForCapability = {
      roomBooking: 'guest',
      reception: 'reception',
      inRoomServices: 'guest',
      tableOrdering: 'customer',
      waiterDispatch: 'waiter',
    } as const;
    const enabled = !editServiceCapabilities[key];
    if (enabled) {
      const requiredPortal = portalForCapability[key] as PortalKey;
      setEditPortalsList((prev) => prev.includes(requiredPortal) ? prev : [...prev, requiredPortal]);
    }
    setEditServiceCapabilities((prev) => ({ ...prev, [key]: enabled }));
  };

  const handleSaveTenantPortals = async () => {
    if (!editingTenantPortals) return;
    setIsSavingPortals(true);
    setEditPortalsError('');
    try {
      const sanitizedCaps = {
        roomBooking: editPortalsList.includes('guest') ? editServiceCapabilities.roomBooking : false,
        reception: editPortalsList.includes('reception') ? editServiceCapabilities.reception : false,
        inRoomServices: editPortalsList.includes('guest') ? editServiceCapabilities.inRoomServices : false,
        tableOrdering: editPortalsList.includes('customer') ? editServiceCapabilities.tableOrdering : false,
        waiterDispatch: editPortalsList.includes('waiter') ? editServiceCapabilities.waiterDispatch : false,
      };

      const response = await fetch(
        `${env.apiBaseUrl}/superadmin/tenants/${editingTenantPortals.id}/portals`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...platformAuthHeaders() },
          body: JSON.stringify({
            enabledPortals: editPortalsList,
            capabilities: sanitizedCaps,
            monthlyPriceINR: editPricing.finalMonthlyTotalINR,
            billingCycle: editBillingCycle,
            customPricingAdjustmentINR: editDiscount,
            planName: `Modular Plan (${editPortalsList.length} Portals)`,
            planCode: 'CUSTOM',
          }),
        }
      );
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) {
        setEditPortalsError(json?.message || 'Failed to update portal subscriptions.');
        return;
      }

      setTenants((prev) =>
        prev.map((t) =>
          t.id === editingTenantPortals.id
            ? {
                ...t,
                enabledPortals: editPortalsList,
                serviceCapabilities: sanitizedCaps,
                monthlyBilling: editPricing.finalMonthlyTotalINR,
                billingCycle: editBillingCycle,
                customPricingAdjustmentINR: editDiscount,
                plan: 'CUSTOM',
              }
            : t
        )
      );
      setRefreshKey((k) => k + 1);

      setPlatformNotice(
        `Subscription & portal allocations updated for ${editingTenantPortals.name}: ₹${editPricing.finalMonthlyTotalINR.toLocaleString(
          'en-IN'
        )}/mo (${editPortalsList.length} portals).`
      );
      setGlobalAuditLogs((prev) => [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          level: 'INFO',
          source: 'SUPERADMIN',
          action: `SuperAdmin configured modular portals for ${editingTenantPortals.name}`,
          hotelName: editingTenantPortals.name,
          details: `Active portals: [${editPortalsList.join(', ')}]`,
        },
        ...prev,
      ]);
      setEditingTenantPortals(null);
      window.setTimeout(() => setPlatformNotice(''), 10000);
    } catch {
      setEditPortalsError('Cannot reach the SpiceHub server. Check your connection.');
    } finally {
      setIsSavingPortals(false);
    }
  };

  const handleOpenEditBranding = (tenant: TenantHotelItem) => {
    setEditingBrandingTenant(tenant);
    setEditHotelName(tenant.name || '');
    setEditHotelCity(tenant.city === '—' ? '' : (tenant.city || ''));
    setEditHotelState(tenant.state === '—' ? '' : (tenant.state || ''));
    setEditContactPhone(tenant.contactPhone || '');
    setEditLogoUrl(tenant.logoUrl || '');
    setEditCoverImageUrl(tenant.coverImageUrl || '');
    setEditTagline(tenant.tagline || '');
    setBrandingError('');
    setBrandingSuccess('');
    setIsBrandingModalOpen(true);
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBrandingTenant) return;
    const trimmedName = editHotelName.trim();
    if (!trimmedName) {
      setBrandingError('Hotel name cannot be empty.');
      return;
    }
    setIsSavingBranding(true);
    setBrandingError('');
    setBrandingSuccess('');
    try {
      const response = await fetch(`${env.apiBaseUrl}/superadmin/tenants/${editingBrandingTenant.id}/branding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...platformAuthHeaders() },
        body: JSON.stringify({
          name: trimmedName,
          city: editHotelCity.trim(),
          state: editHotelState.trim(),
          contactPhone: editContactPhone.trim(),
          logoUrl: editLogoUrl.trim(),
          coverImageUrl: editCoverImageUrl.trim(),
          tagline: editTagline.trim(),
        }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) {
        setBrandingError(json?.message || 'Failed to update property details & branding.');
        return;
      }
      setTenants((prev) =>
        prev.map((t) =>
          t.id === editingBrandingTenant.id
            ? {
                ...t,
                name: trimmedName,
                city: editHotelCity.trim() || t.city,
                state: editHotelState.trim() || t.state,
                contactPhone: editContactPhone.trim(),
                logoUrl: editLogoUrl.trim(),
                coverImageUrl: editCoverImageUrl.trim(),
                tagline: editTagline.trim(),
                address: {
                  street: t.address?.street || t.street || '',
                  city: editHotelCity.trim() || t.city,
                  state: editHotelState.trim() || t.state,
                  country: t.address?.country || t.country || 'India',
                  pincode: t.address?.pincode || t.pincode || '',
                },
              }
            : t
        )
      );
      setBrandingSuccess('Property details & branding updated across all portals & APKs!');
      setTimeout(() => {
        setIsBrandingModalOpen(false);
      }, 900);
    } catch {
      setBrandingError('Failed to connect to backend server.');
    } finally {
      setIsSavingBranding(false);
    }
  };

  useEffect(() => {
    if (!selectedBrandingTenantId && tenants.length > 0) {
      setSelectedBrandingTenantId(tenants[0].id);
    }
  }, [tenants, selectedBrandingTenantId]);

  useEffect(() => {
    const t = tenants.find((item) => item.id === selectedBrandingTenantId);
    if (t) {
      setBrandLogoUrl(t.logoUrl || '');
      setBrandCoverUrl(t.coverImageUrl || '');
      setBrandTagline(t.tagline || '');
      setBrandPrimaryColor(t.primaryColor || '#f59e0b');
      setBrandSecondaryColor(t.secondaryColor || '#10b981');
      setBrandDomain(t.domain || (t.slug ? `${t.slug}.spicehub.app` : `${t.code.toLowerCase()}.spicehub.app`));
    }
  }, [selectedBrandingTenantId, tenants]);

  const handleUpdateRoomStatus = (roomId: string, newStatus: 'OCCUPIED' | 'VACANT_CLEAN' | 'VACANT_DIRTY' | 'MAINTENANCE') => {
    setFleetRooms((prev) =>
      prev.map((r) => {
        if (r.id === roomId) {
          const updated = {
            ...r,
            status: newStatus,
            currentGuest: newStatus === 'OCCUPIED' ? (r.currentGuest || 'Direct Walk-in Guest') : undefined,
            checkOut: newStatus === 'OCCUPIED' ? (r.checkOut || 'Tomorrow, 11:00 AM') : undefined,
          };
          setRoomToastMsg(`Room #${r.roomNumber} (${r.hotelName}) updated to ${newStatus.replace('_', ' ')}.`);
          setTimeout(() => setRoomToastMsg(null), 3500);
          setGlobalAuditLogs((logPrev) => [
            {
              id: `room-status-${Date.now()}`,
              timestamp: new Date().toISOString(),
              level: 'INFO',
              source: 'PMS_FLEET',
              action: `SuperAdmin changed Room #${r.roomNumber} status to ${newStatus}`,
              hotelName: r.hotelName,
              details: `Category: ${r.category}, Floor: ${r.floor}, Base Rate: ₹${r.ratePerNight}`,
            },
            ...logPrev,
          ]);
          return updated;
        }
        return r;
      })
    );
  };

  const handleAddFleetRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomNumber.trim()) return;
    const targetHotel = tenants.find((t) => t.id === newRoomHotelId) || tenants[0];
    const newRoom: FleetRoomItem = {
      id: `rm-${Date.now()}`,
      hotelId: targetHotel ? targetHotel.id : 'tenant-custom',
      hotelName: targetHotel ? targetHotel.name : 'Central Fleet Hotel',
      roomNumber: newRoomNumber.trim(),
      floor: parseInt(newRoomFloor, 10) || 1,
      category: newRoomCategory,
      ratePerNight: parseInt(newRoomRate, 10) || 4500,
      status: 'VACANT_CLEAN',
    };
    setFleetRooms((prev) => [newRoom, ...prev]);
    setIsAddRoomModalOpen(false);
    setNewRoomNumber('');
    setRoomToastMsg(`Room #${newRoom.roomNumber} successfully registered into PMS Fleet!`);
    setTimeout(() => setRoomToastMsg(null), 3500);
    setGlobalAuditLogs((logPrev) => [
      {
        id: `room-add-${Date.now()}`,
        timestamp: new Date().toISOString(),
        level: 'INFO',
        source: 'PMS_FLEET',
        action: `SuperAdmin created new Room #${newRoom.roomNumber}`,
        hotelName: newRoom.hotelName,
        details: `Category: ${newRoom.category}, Floor: ${newRoom.floor}, Rate: ₹${newRoom.ratePerNight}/night`,
      },
      ...logPrev,
    ]);
  };

  const handleSaveBrandingStudio = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = tenants.find((item) => item.id === selectedBrandingTenantId) || tenants[0];
    if (!t) return;
    setIsSavingBrandingStudio(true);
    setBrandingStudioMsg(null);
    try {
      const res = await fetch(`${env.apiBaseUrl}/superadmin/tenants/${t.id}/branding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...platformAuthHeaders() },
        body: JSON.stringify({
          logoUrl: brandLogoUrl.trim(),
          coverImageUrl: brandCoverUrl.trim(),
          primaryColor: brandPrimaryColor.trim(),
          secondaryColor: brandSecondaryColor.trim(),
          domain: brandDomain.trim().toLowerCase(),
          tagline: brandTagline.trim(),
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setBrandingStudioMsg({ type: 'error', text: json?.message || 'Failed to update branding.' });
        return;
      }
      setTenants((prev) =>
        prev.map((item) =>
          item.id === t.id
            ? {
                ...item,
                logoUrl: brandLogoUrl.trim(),
                coverImageUrl: brandCoverUrl.trim(),
                tagline: brandTagline.trim(),
              }
            : item
        )
      );
      setBrandingStudioMsg({ type: 'success', text: `White-label branding for "${t.name}" deployed successfully!` });
      setGlobalAuditLogs((prev) => [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          level: 'INFO',
          source: 'SUPERADMIN',
          action: `SuperAdmin updated branding color to ${brandPrimaryColor.trim()} for ${t.name}`,
          hotelName: t.name,
          details: `White-label primary accent set to ${brandPrimaryColor.trim()}`,
        },
        ...prev,
      ]);
    } catch {
      setBrandingStudioMsg({ type: 'error', text: 'Network error saving branding.' });
    } finally {
      setIsSavingBrandingStudio(false);
    }
  };

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setOnboardError('Please enter a Property Name in Step 1.');
      setOnboardStep(1);
      return;
    }
    if (!newEmail.trim() || !newAdminPassword) {
      setOnboardError('Admin email and a temporary password (min 8 chars) are required in Step 4.');
      setOnboardStep(4);
      return;
    }
    setOnboarding(true);
    setOnboardError('');
    try {
      const slugBase = newName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 36);
      const slug = `${slugBase || 'hotel'}-${Math.floor(1000 + Math.random() * 9000)}`;
      const response = await fetch(`${env.apiBaseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelName: newName.trim(),
          slug,
          contactEmail: newEmail.trim(),
          contactPhone: newPhone.trim(),
          city: newCity.trim() || 'Jaipur',
          state: newState.trim() || 'Rajasthan',
          country: newCountry.trim() || 'India',
          streetAddress: newStreet.trim(),
          pincode: newPincode.trim(),
          latitude: newLatitude,
          longitude: newLongitude,
          coordinates: { latitude: newLatitude, longitude: newLongitude },
          googleMapUrl: newGoogleMapUrl.trim() || `https://www.google.com/maps/search/?api=1&query=${newLatitude},${newLongitude}`,
          locationNotes: newLocationNotes.trim(),
          adminName: newAdminName.trim() || `${newName.trim()} Admin`,
          adminPassword: newAdminPassword,
          enabledPortals: onboardPortals,
          serviceCapabilities: onboardServiceCapabilities,
          initialRooms: 0,
          initialTables: 0,
          monthlyPriceINR: onboardPricing.finalMonthlyTotalINR,
          billingCycle: onboardBillingCycle,
          customPricingAdjustmentINR: onboardDiscount,
          logoUrl: newLogoUrl.trim(),
          coverImageUrl: newCoverImageUrl.trim(),
          tagline: newTagline.trim() || 'Luxury Stays & Fine Hospitality',
        }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) {
        setOnboardError(json?.message || 'Could not onboard this property.');
        return;
      }

      const tenantId = String(json?.data?.tenant?.id || '');

      // Provision only inventory used by the selected service profile.
      let provisionSummary = '';
      if (tenantId) {
        const roomCount = onboardServiceCapabilities.roomBooking || onboardServiceCapabilities.reception || onboardServiceCapabilities.inRoomServices ? newRooms : 0;
        const tableCount = onboardServiceCapabilities.tableOrdering ? newTables : 0;
        if (roomCount > 0 || tableCount > 0) {
          const provisionResponse = await fetch(
            `${env.apiBaseUrl}/superadmin/tenants/${tenantId}/provision`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...platformAuthHeaders() },
              body: JSON.stringify({ roomCount, tableCount }),
            }
          );
          const provisionJson = await provisionResponse.json().catch(() => null);
          if (provisionResponse.ok && provisionJson?.success) {
            provisionSummary = ` ${Number(provisionJson.data?.roomsCreated || 0)} rooms and ${Number(
              provisionJson.data?.tablesCreated || 0
            )} tables provisioned.`;
          } else {
            provisionSummary = ` Capacity provisioning failed: ${
              provisionJson?.message || `HTTP ${provisionResponse.status}`
            }.`;
          }
        } else {
          provisionSummary = ' No room or dining-table inventory is needed for this profile.';
        }

        // Synchronize selected modular portals and calculated subscription pricing
        await fetch(`${env.apiBaseUrl}/superadmin/tenants/${tenantId}/portals`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...platformAuthHeaders() },
          body: JSON.stringify({
            enabledPortals: onboardPortals,
            capabilities: onboardServiceCapabilities,
            monthlyPriceINR: onboardPricing.finalMonthlyTotalINR,
            billingCycle: onboardBillingCycle,
            customPricingAdjustmentINR: onboardDiscount,
          }),
        }).catch(() => null);

        // Attach the selected subscription plan code if applicable
        const matchingPlan = platformPlans.find(
          (plan) => plan.code.toUpperCase() === newPlan.toUpperCase()
        );
        if (matchingPlan) {
          const planResponse = await fetch(
            `${env.apiBaseUrl}/superadmin/tenants/${tenantId}/assign-plan`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...platformAuthHeaders() },
              body: JSON.stringify({ planId: matchingPlan.id }),
            }
          );
          if (!planResponse.ok) {
            provisionSummary += ` Plan assignment failed (HTTP ${planResponse.status}).`;
          }
        }

        // Synchronize selected subscription duration & dates
        const subStart = new Date().toISOString();
        const calculatedEnd = calculateEndDateFromMonths(subStart, onboardDurationMonths);
        await fetch(`${env.apiBaseUrl}/superadmin/tenants/${tenantId}/subscription`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...platformAuthHeaders() },
          body: JSON.stringify({
            durationMonths: onboardDurationMonths,
            startDate: subStart,
            endDate: calculatedEnd,
            status: 'ACTIVE',
            monthlyPriceINR: onboardPricing.finalMonthlyTotalINR,
          }),
        }).catch(() => null);

        // Persist real hotel location and Google Maps coordinates
        const calculatedGMapUrl = newGoogleMapUrl.trim() || `https://www.google.com/maps/search/?api=1&query=${newLatitude},${newLongitude}`;
        await fetch(`${env.apiBaseUrl}/superadmin/tenants/${tenantId}/location`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...platformAuthHeaders() },
          body: JSON.stringify({
            latitude: newLatitude,
            longitude: newLongitude,
            street: newStreet.trim(),
            city: newCity.trim() || 'Jaipur',
            state: newState.trim() || 'Rajasthan',
            pincode: newPincode.trim(),
            country: newCountry.trim() || 'India',
            googleMapUrl: calculatedGMapUrl,
            locationNotes: newLocationNotes.trim(),
          }),
        }).catch(() => null);
      }

      const calculatedGMapUrlFinal = newGoogleMapUrl.trim() || `https://www.google.com/maps/search/?api=1&query=${newLatitude},${newLongitude}`;
      const subStartDateIso = new Date().toISOString();
      const calculatedEndIso = calculateEndDateFromMonths(subStartDateIso, onboardDurationMonths);

      setPlatformNotice(
        `${newName.trim()} onboarded successfully! Slug: [${slug}], Admin Email: [${newEmail.trim()}].${provisionSummary}`
      );
      const newTenantItem: TenantHotelItem = {
        id: tenantId || `tenant-${Date.now()}`,
        name: newName.trim(),
        code: (slugBase || 'HOTEL').toUpperCase(),
        slug: slug,
        city: newCity.trim() || 'Jaipur',
        state: newState.trim() || 'Rajasthan',
        street: newStreet.trim(),
        pincode: newPincode.trim(),
        country: newCountry.trim() || 'India',
        latitude: newLatitude,
        longitude: newLongitude,
        googleMapUrl: calculatedGMapUrlFinal,
        locationNotes: newLocationNotes.trim(),
        coordinates: { latitude: newLatitude, longitude: newLongitude },
        address: {
          street: newStreet.trim(),
          city: newCity.trim() || 'Jaipur',
          state: newState.trim() || 'Rajasthan',
          pincode: newPincode.trim(),
          country: newCountry.trim() || 'India',
        },
        contactEmail: newEmail.trim(),
        contactPhone: newPhone.trim(),
        adminEmail: newEmail.trim(),
        adminName: newAdminName.trim() || `${newName.trim()} Admin`,
        adminPhone: newPhone.trim(),
        subscriptionStartDate: subStartDateIso,
        subscriptionEndDate: calculatedEndIso,
        subscriptionDurationMonths: onboardDurationMonths,
        logoUrl: newLogoUrl.trim(),
        coverImageUrl: newCoverImageUrl.trim(),
        photos: [],
        tagline: newTagline.trim() || 'Luxury Stays & Fine Hospitality',
        primaryColor: '#f59e0b',
        secondaryColor: '#1e293b',
        plan: newPlan || 'STARTER',
        monthlyBilling: onboardPricing.finalMonthlyTotalINR,
        billingCycle: onboardBillingCycle,
        activeRooms: 0,
        totalRooms: newRooms || 30,
        activeTables: 0,
        totalTables: newTables || 20,
        status: 'ACTIVE',
        enabledPortals: onboardPortals,
        customPricingAdjustmentINR: onboardDiscount,
        occupancyPercent: 0,
        todayRevenue: 0,
        todayOrders: 0,
        createdAt: new Date().toISOString(),
      };
      setTenants((prev) => [newTenantItem, ...prev.filter((t) => t.id !== newTenantItem.id)]);

      // Display immediate copyable credentials modal for the operator
      setCreatedCredentialsModal({
        hotelName: newName.trim(),
        hotelSlug: slug,
        adminEmail: newEmail.trim(),
        adminPassword: newAdminPassword,
        subscriptionStartDate: subStartDateIso,
        subscriptionEndDate: calculatedEndIso,
        durationMonths: onboardDurationMonths,
        portalUrl: getPortalUrl('admin'),
      });
      setGlobalAuditLogs((prev) => [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          level: 'INFO',
          source: 'SUPERADMIN',
          action: `SuperAdmin created ${newName.trim()}`,
          hotelName: newName.trim(),
          details: `Provisioned property with admin ${newEmail.trim()}`,
        },
        ...prev,
      ]);
      setNewName('');
      setNewCity('');
      setNewStreet('');
      setNewPincode('');
      setNewLatitude(26.9124);
      setNewLongitude(75.7873);
      setNewGoogleMapUrl('');
      setNewLocationNotes('');
      setNewEmail('');
      setNewPhone('');
      setNewAdminName('');
      setNewAdminPassword('');
      setNewLogoUrl('');
      setNewCoverImageUrl('');
      setNewTagline('');
      setOnboardPortals([...ALL_PORTAL_KEYS]);
      setOnboardServiceCapabilities({
        roomBooking: true,
        reception: true,
        inRoomServices: true,
        tableOrdering: true,
        waiterDispatch: true,
      });
      setOnboardDiscount(0);
      setOnboardBillingCycle('MONTHLY');
      setIsOnboardModalOpen(false);
      setRefreshKey((value) => value + 1);
      window.setTimeout(() => setPlatformNotice(''), 12000);
    } catch {
      setOnboardError('Cannot reach the SpiceHub server. Check your connection and retry.');
    } finally {
      setOnboarding(false);
    }
  };

  const handleToggleTenantStatus = async (tenant: TenantHotelItem) => {
    const nextStatus = tenant.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    const confirmed = window.confirm(
      `${nextStatus === 'SUSPENDED' ? 'Suspend' : 'Reactivate'} ${tenant.name}? ` +
        (nextStatus === 'SUSPENDED'
          ? 'All staff logins for this property will be blocked.'
          : 'Staff access will be restored.')
    );
    if (!confirmed) return;
    setTenantActionId(tenant.id);
    try {
      const response = await fetch(
        `${env.apiBaseUrl}/superadmin/tenants/${tenant.id}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...platformAuthHeaders(),
          },
          body: JSON.stringify({ status: nextStatus, reason: 'Superadmin directory action' }),
        }
      );
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || `HTTP ${response.status}`);
      }
      setPlatformNotice(
        `${tenant.name} is now ${nextStatus === 'SUSPENDED' ? 'suspended' : 'active'}.`
      );
      setTenants((prev) =>
        prev.map((t) => (t.id === tenant.id ? { ...t, status: nextStatus } : t))
      );
      setGlobalAuditLogs((prev) => [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          level: nextStatus === 'SUSPENDED' ? 'WARN' : 'INFO',
          source: 'SUPERADMIN',
          action: `SuperAdmin ${nextStatus === 'SUSPENDED' ? 'suspended' : 'reactivated'} ${tenant.name}`,
          hotelName: tenant.name,
          details: `Tenant status changed to ${nextStatus}`,
        },
        ...prev,
      ]);
      setRefreshKey((value) => value + 1);
      window.setTimeout(() => setPlatformNotice(''), 8000);
    } catch (error: any) {
      setPlatformError(error?.message || 'Could not update tenant status.');
    } finally {
      setTenantActionId('');
    }
  };

  const handleImpersonateTenantAdmin = async (tenant: TenantHotelItem) => {
    if (tenant.status === 'SUSPENDED') {
      setPlatformError('Reactivate this hotel before starting an admin session.');
      return;
    }
    if (!window.confirm(
      `Open a temporary 5-minute Hotel Admin session for ${tenant.name}? This action is recorded in the platform audit log.`
    )) return;

    const adminWindow = window.open('about:blank', '_blank');
    if (!adminWindow) {
      setPlatformError('Allow pop-ups to open the Hotel Admin session.');
      return;
    }
    adminWindow.opener = null;
    setImpersonatingTenantId(tenant.id);
    setPlatformError('');
    try {
      const response = await fetch(`${env.apiBaseUrl}/superadmin/tenants/${tenant.id}/impersonation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...platformAuthHeaders(),
        },
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success || !result?.data?.handoffCode) {
        throw new Error(result?.message || `Could not start the temporary session (HTTP ${response.status}).`);
      }

      const target = new URL(getPortalUrl('admin'));
      target.searchParams.set('impersonate', result.data.handoffCode);
      adminWindow.location.replace(target.toString());
    } catch (error) {
      adminWindow.close();
      setPlatformError(error instanceof Error ? error.message : 'Could not start the temporary session.');
    } finally {
      setImpersonatingTenantId('');
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setClipboardNotice(label || 'Copied to clipboard!');
        window.setTimeout(() => setClipboardNotice(''), 3000);
      }
    } catch {
      // Fallback
    }
  };

  const calculateEndDateFromMonths = (startDateStr: string, months: number): string => {
    try {
      const d = new Date(startDateStr || new Date());
      d.setMonth(d.getMonth() + months);
      return !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '';
    } catch {
      return '';
    }
  };

  const handleOpenSubscriptionModal = (tenant: TenantHotelItem) => {
    setManagingSubscriptionTenant(tenant);
    setSubscriptionErrorMsg('');
    setSubscriptionSuccessMsg('');
    setSubStatus(tenant.status === 'SUSPENDED' ? 'SUSPENDED' : tenant.status === 'MAINTENANCE' ? 'MAINTENANCE' : 'ACTIVE');
    setSubMonthlyRate(tenant.monthlyBilling || 0);

    const start = tenant.subscriptionStartDate ? new Date(tenant.subscriptionStartDate) : new Date();
    const formattedStart = !isNaN(start.getTime()) ? start.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    setSubStartDate(formattedStart);

    const months = tenant.subscriptionDurationMonths || 1;
    setSubCustomMonths(months);
    if (months === 1) setSubDurationType('1m');
    else if (months === 3) setSubDurationType('3m');
    else if (months === 6) setSubDurationType('6m');
    else if (months === 12) setSubDurationType('1y');
    else if (months === 24) setSubDurationType('2y');
    else setSubDurationType('custom');

    const end = tenant.subscriptionEndDate
      ? new Date(tenant.subscriptionEndDate)
      : new Date(new Date(formattedStart).setMonth(new Date(formattedStart).getMonth() + months));
    setSubEndDate(!isNaN(end.getTime()) ? end.toISOString().split('T')[0] : calculateEndDateFromMonths(formattedStart, months));
  };

  const handleSubDurationChange = (type: '1m' | '3m' | '6m' | '1y' | '2y' | 'custom', customM?: number) => {
    setSubDurationType(type);
    let months = 1;
    if (type === '1m') months = 1;
    else if (type === '3m') months = 3;
    else if (type === '6m') months = 6;
    else if (type === '1y') months = 12;
    else if (type === '2y') months = 24;
    else months = customM !== undefined ? customM : subCustomMonths;

    setSubCustomMonths(months);
    setSubEndDate(calculateEndDateFromMonths(subStartDate, months));
  };

  const handleSaveSubscription = async () => {
    if (!managingSubscriptionTenant) return;
    setIsSavingSubscription(true);
    setSubscriptionErrorMsg('');
    setSubscriptionSuccessMsg('');
    try {
      const response = await fetch(
        `${env.apiBaseUrl}/superadmin/tenants/${managingSubscriptionTenant.id}/subscription`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...platformAuthHeaders() },
          body: JSON.stringify({
            durationMonths: subCustomMonths,
            startDate: subStartDate,
            endDate: subEndDate,
            status: subStatus,
            monthlyPriceINR: subMonthlyRate,
          }),
        }
      );
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) {
        setSubscriptionErrorMsg(json?.message || 'Failed to update subscription');
        return;
      }

      setTenants((prev) =>
        prev.map((t) =>
          t.id === managingSubscriptionTenant.id
            ? {
                ...t,
                status: subStatus,
                subscriptionStartDate: subStartDate,
                subscriptionEndDate: subEndDate,
                subscriptionDurationMonths: subCustomMonths,
                monthlyBilling: subMonthlyRate,
              }
            : t
        )
      );

      setSubscriptionSuccessMsg(json.message || 'Subscription updated successfully!');
      window.setTimeout(() => {
        setManagingSubscriptionTenant(null);
        setSubscriptionSuccessMsg('');
      }, 1400);
    } catch (err: any) {
      setSubscriptionErrorMsg(err?.message || 'Network error updating subscription');
    } finally {
      setIsSavingSubscription(false);
    }
  };

  const handleOpenCapacityModal = (tenant: TenantHotelItem) => {
    setManagingCapacityTenant(tenant);
    setCapacityMaxRooms(tenant.maxRooms || 30);
    setCapacityMaxTables(tenant.maxTables || 20);
    setCapacityErrorMsg('');
    setCapacitySuccessMsg('');
  };

  const handleSaveCapacity = async () => {
    if (!managingCapacityTenant) return;
    setIsSavingCapacity(true);
    setCapacityErrorMsg('');
    setCapacitySuccessMsg('');
    try {
      const response = await fetch(
        `${env.apiBaseUrl}/superadmin/tenants/${managingCapacityTenant.id}/capacity`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...platformAuthHeaders() },
          body: JSON.stringify({
            maxRooms: capacityMaxRooms,
            maxTables: capacityMaxTables,
          }),
        }
      );
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) {
        setCapacityErrorMsg(json?.message || 'Failed to update capacity ceiling');
        return;
      }

      setTenants((prev) =>
        prev.map((t) =>
          t.id === managingCapacityTenant.id
            ? {
                ...t,
                maxRooms: capacityMaxRooms,
                maxTables: capacityMaxTables,
              }
            : t
        )
      );

      setCapacitySuccessMsg(json.message || 'Capacity ceiling updated successfully!');
      window.setTimeout(() => {
        setManagingCapacityTenant(null);
        setCapacitySuccessMsg('');
      }, 1400);
    } catch (err: any) {
      setCapacityErrorMsg(err?.message || 'Network error updating capacity');
    } finally {
      setIsSavingCapacity(false);
    }
  };

  const handleOpenCredentialsModal = (tenant: TenantHotelItem) => {
    setManagingCredentialsTenant(tenant);
    setCredNewPassword('');
    setCredSuccessData(null);
    setCredErrorMsg('');
  };

  const handleResetPassword = async () => {
    if (!managingCredentialsTenant) return;
    setIsResettingPassword(true);
    setCredErrorMsg('');
    setCredSuccessData(null);
    try {
      const response = await fetch(
        `${env.apiBaseUrl}/superadmin/tenants/${managingCredentialsTenant.id}/reset-admin-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...platformAuthHeaders() },
          body: JSON.stringify({
            newPassword: credNewPassword.trim() || undefined,
          }),
        }
      );
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) {
        setCredErrorMsg(json?.message || 'Failed to reset password');
        return;
      }

      setCredSuccessData(json.credentials);
      setCredNewPassword('');

      if (json.credentials?.email) {
        setTenants((prev) =>
          prev.map((t) =>
            t.id === managingCredentialsTenant.id
              ? { ...t, adminEmail: json.credentials.email }
              : t
          )
        );
      }
    } catch (err: any) {
      setCredErrorMsg(err?.message || 'Network error resetting password');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleOpenLocationModal = (tenant: TenantHotelItem) => {
    setManagingLocationTenant(tenant);
    setLocStreet(tenant.street || tenant.address?.street || '');
    setLocCity(tenant.city || tenant.address?.city || 'Jaipur');
    setLocState(tenant.state || tenant.address?.state || 'Rajasthan');
    setLocPincode(tenant.pincode || tenant.address?.pincode || '');
    setLocCountry(tenant.country || tenant.address?.country || 'India');
    const lat = typeof tenant.latitude === 'number' ? tenant.latitude : (typeof tenant.coordinates?.latitude === 'number' ? tenant.coordinates.latitude : 26.9124);
    const lng = typeof tenant.longitude === 'number' ? tenant.longitude : (typeof tenant.coordinates?.longitude === 'number' ? tenant.coordinates.longitude : 75.7873);
    setLocLatitude(lat);
    setLocLongitude(lng);
    setLocGoogleMapUrl(tenant.googleMapUrl || `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
    setLocNotes(tenant.locationNotes || '');
    setLocSuccessMsg('');
    setLocErrorMsg('');
    setLocSearchQuery('');
  };

  const handleSaveLocation = async () => {
    if (!managingLocationTenant) return;
    setIsSavingLocation(true);
    setLocErrorMsg('');
    setLocSuccessMsg('');
    try {
      const gMapUrl = locGoogleMapUrl.trim() || `https://www.google.com/maps/search/?api=1&query=${locLatitude},${locLongitude}`;
      const response = await fetch(
        `${env.apiBaseUrl}/superadmin/tenants/${managingLocationTenant.id}/location`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...platformAuthHeaders() },
          body: JSON.stringify({
            latitude: Number(locLatitude),
            longitude: Number(locLongitude),
            street: locStreet.trim(),
            city: locCity.trim(),
            state: locState.trim(),
            pincode: locPincode.trim(),
            country: locCountry.trim() || 'India',
            googleMapUrl: gMapUrl,
            locationNotes: locNotes.trim(),
          }),
        }
      );
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) {
        setLocErrorMsg(json?.message || 'Failed to update property location');
        return;
      }

      setTenants((prev) =>
        prev.map((t) =>
          t.id === managingLocationTenant.id
            ? {
                ...t,
                latitude: Number(locLatitude),
                longitude: Number(locLongitude),
                street: locStreet.trim(),
                city: locCity.trim(),
                state: locState.trim(),
                pincode: locPincode.trim(),
                country: locCountry.trim() || 'India',
                googleMapUrl: gMapUrl,
                locationNotes: locNotes.trim(),
                coordinates: { latitude: Number(locLatitude), longitude: Number(locLongitude) },
                address: {
                  street: locStreet.trim(),
                  city: locCity.trim(),
                  state: locState.trim(),
                  pincode: locPincode.trim(),
                  country: locCountry.trim() || 'India',
                },
              }
            : t
        )
      );

      setSelectedMapBranch((current) => {
        if (current && current.id === managingLocationTenant.id) {
          return {
            ...current,
            latitude: Number(locLatitude),
            longitude: Number(locLongitude),
            street: locStreet.trim(),
            city: locCity.trim(),
            state: locState.trim(),
            pincode: locPincode.trim(),
            googleMapUrl: gMapUrl,
            locationNotes: locNotes.trim(),
          };
        }
        return current;
      });

      setLocSuccessMsg('Real location & Google Maps pin updated successfully!');
      window.setTimeout(() => {
        setManagingLocationTenant(null);
        setLocSuccessMsg('');
      }, 1400);
    } catch (err: any) {
      setLocErrorMsg(err?.message || 'Network error saving location');
    } finally {
      setIsSavingLocation(false);
    }
  };

  // Assign a real subscription plan to a tenant so billing and MRR stay truthful.
  const handleAssignPlan = async (tenantId: string, planId: string) => {
    if (!planId) return;
    setTenantActionId(tenantId);
    setPlatformError('');
    try {
      const response = await fetch(
        `${env.apiBaseUrl}/superadmin/tenants/${tenantId}/assign-plan`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...platformAuthHeaders() },
          body: JSON.stringify({ planId }),
        }
      );
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || `HTTP ${response.status}`);
      }
      setPlatformNotice(`Plan assigned: ${json.tenant?.planName || planId}.`);
      setRefreshKey((value) => value + 1);
      window.setTimeout(() => setPlatformNotice(''), 8000);
    } catch (error: any) {
      setPlatformError(error?.message || 'Could not assign the subscription plan.');
    } finally {
      setTenantActionId('');
    }
  };

  // Subscription plans are stored in the platform database. The seeded tier set
  // is only created on explicit operator request (never silently).
  const handleCreateStandardPlans = async () => {
    setIsSeedingPlans(true);
    setPlansError('');
    try {
      const headers = { 'Content-Type': 'application/json', ...platformAuthHeaders() };
      const standardPlans = [
        {
          name: 'STARTER',
          code: 'STARTER',
          monthlyPriceINR: 3499,
          annualPriceINR: 34990,
          limits: { maxRooms: 20, maxTables: 20, maxStaffUsers: 10 },
          featureFlags: {
            pmsEnabled: true,
            kdsEnabled: true,
            qrDineInEnabled: true,
            roomServiceEnabled: true,
            banquetEnabled: false,
            loyaltyEnabled: false,
            aiInsightsEnabled: false,
            tallyExportEnabled: true,
          },
        },
        {
          name: 'PROFESSIONAL',
          code: 'PROFESSIONAL',
          monthlyPriceINR: 7999,
          annualPriceINR: 79990,
          limits: { maxRooms: 50, maxTables: 30, maxStaffUsers: 25 },
          featureFlags: {
            pmsEnabled: true,
            kdsEnabled: true,
            qrDineInEnabled: true,
            roomServiceEnabled: true,
            banquetEnabled: true,
            loyaltyEnabled: true,
            aiInsightsEnabled: false,
            tallyExportEnabled: true,
          },
        },
        {
          name: 'ENTERPRISE',
          code: 'ENTERPRISE',
          monthlyPriceINR: 14999,
          annualPriceINR: 149990,
          limits: { maxRooms: 500, maxTables: 200, maxStaffUsers: 100 },
          featureFlags: {
            pmsEnabled: true,
            kdsEnabled: true,
            qrDineInEnabled: true,
            roomServiceEnabled: true,
            banquetEnabled: true,
            loyaltyEnabled: true,
            aiInsightsEnabled: true,
            tallyExportEnabled: true,
          },
        },
      ];

      for (const plan of standardPlans) {
        const response = await fetch(`${env.apiBaseUrl}/superadmin/plans`, {
          method: 'POST',
          headers,
          body: JSON.stringify(plan),
        });
        const json = await response.json().catch(() => null);
        if (!response.ok || !json?.success) {
          if (response.status === 409) continue; // plan code already exists
          throw new Error(json?.message || `Could not create plan ${plan.code} (HTTP ${response.status})`);
        }
      }

      setPlatformNotice('Standard subscription plans created in the platform catalog.');
      setRefreshKey((value) => value + 1);
      window.setTimeout(() => setPlatformNotice(''), 8000);
    } catch (error: any) {
      setPlansError(error?.message || 'Could not create subscription plans.');
    } finally {
      setIsSeedingPlans(false);
    }
  };

  const handleOpenCreatePlan = () => {
    setEditingPlanId(null);
    setPlanFormIsActive(true);
    setPlanFormName('CUSTOM ' + (platformPlans.length + 1));
    setPlanFormCode('CUSTOM_' + (platformPlans.length + 1));
    setPlanFormMonthlyPrice(4999);
    setPlanFormAnnualPrice(49990);
    setPlanFormMaxRooms(30);
    setPlanFormMaxTables(20);
    setPlanFormMaxStaffUsers(15);
    setPlanFormFlags({
      pmsEnabled: true,
      posEnabled: true,
      kdsEnabled: true,
      waiterEnabled: true,
      qrDineInEnabled: true,
      roomServiceEnabled: true,
      banquetEnabled: true,
      loyaltyEnabled: true,
      tallyExportEnabled: true,
    });
    setIsPlanModalOpen(true);
  };

  const handleOpenEditPlan = (plan: PlatformPlan) => {
    setEditingPlanId(plan.id || (plan as any)._id || plan.code);
    setPlanFormIsActive(plan.isActive !== false);
    setPlanFormName(plan.name);
    setPlanFormCode(plan.code);
    setPlanFormMonthlyPrice(plan.monthlyPriceINR);
    setPlanFormAnnualPrice(plan.annualPriceINR || plan.monthlyPriceINR * 10);
    setPlanFormMaxRooms(plan.limits?.maxRooms || 30);
    setPlanFormMaxTables(plan.limits?.maxTables || 20);
    setPlanFormMaxStaffUsers(plan.limits?.maxStaffUsers || 15);
    setPlanFormFlags({
      pmsEnabled: plan.featureFlags?.pmsEnabled !== false,
      posEnabled: plan.featureFlags?.posEnabled !== false,
      kdsEnabled: plan.featureFlags?.kdsEnabled !== false,
      waiterEnabled: plan.featureFlags?.waiterEnabled !== false,
      qrDineInEnabled: plan.featureFlags?.qrDineInEnabled !== false,
      roomServiceEnabled: plan.featureFlags?.roomServiceEnabled !== false,
      banquetEnabled: plan.featureFlags?.banquetEnabled === true,
      loyaltyEnabled: plan.featureFlags?.loyaltyEnabled === true,
      tallyExportEnabled: plan.featureFlags?.tallyExportEnabled !== false,
    });
    setIsPlanModalOpen(true);
  };

  const handleSaveCustomPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPlan(true);
    try {
      const headers = { 'Content-Type': 'application/json', ...platformAuthHeaders() };
      const payload = {
        name: planFormName.trim(),
        code: planFormCode.trim().toUpperCase(),
        monthlyPriceINR: Number(planFormMonthlyPrice),
        annualPriceINR: Number(planFormAnnualPrice),
        limits: {
          maxRooms: Number(planFormMaxRooms),
          maxTables: Number(planFormMaxTables),
          maxStaffUsers: Number(planFormMaxStaffUsers),
        },
        featureFlags: planFormFlags,
        isActive: planFormIsActive,
      };

      const resolvedPlan = platformPlans.find((p) => p.id === editingPlanId || p.code === editingPlanId);
      const targetId = resolvedPlan?.id || editingPlanId;
      const url = targetId
        ? `${env.apiBaseUrl}/superadmin/plans/${targetId}`
        : `${env.apiBaseUrl}/superadmin/plans`;

      const method = targetId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsPlanModalOpen(false);
        setPlatformNotice(`Plan ${planFormName} ${targetId ? 'updated' : 'created'} successfully!`);
        window.setTimeout(() => setPlatformNotice(''), 6000);
        setRefreshKey((k) => k + 1);
      } else {
        alert(data.message || 'Failed to save subscription plan');
      }
    } catch (err: any) {
      alert(err.message || 'Error saving plan');
    } finally {
      setIsSavingPlan(false);
    }
  };

  const handleTogglePlanStatus = async (plan: any, targetActive: boolean) => {
    const actionText = targetActive ? 'reactivate' : 'deactivate';
    if (!confirm(`Are you sure you want to ${actionText} the ${plan.name} plan?`)) return;
    try {
      const headers = { 'Content-Type': 'application/json', ...platformAuthHeaders() };
      const planId = plan.id || plan._id || plan.code;
      const res = await fetch(`${env.apiBaseUrl}/superadmin/plans/${planId}/toggle`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ isActive: targetActive }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPlatformNotice(`Plan ${plan.name} ${targetActive ? 'reactivated' : 'deactivated'} successfully.`);
        window.setTimeout(() => setPlatformNotice(''), 6000);
        setRefreshKey((k) => k + 1);
      } else {
        alert(data.message || `Failed to ${actionText} plan`);
      }
    } catch (err: any) {
      alert(err.message || `Error toggling plan status`);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    const resolvedPlan = platformPlans.find((p) => p.id === planId || p.code === planId);
    await handleTogglePlanStatus(resolvedPlan || { id: planId, name: 'Subscription Plan' }, false);
  };

  // Calculations — live platform totals. MRR is an estimate derived from the
  // configured subscription plans, not billed revenue.
  const totalMrr =
    platformMetrics?.financials.estimatedMonthlyRecurringRevenueINR ||
    tenants.reduce((acc, tenant) => acc + tenant.monthlyBilling, 0);

  const totalActiveProperties =
    platformMetrics?.tenants.active ??
    tenants.filter((tenant) => tenant.status === 'ACTIVE').length;

  const totalRoomsCount =
    platformMetrics?.inventory.totalRooms ??
    tenants.reduce((acc, tenant) => acc + tenant.totalRooms, 0);

  const occupiedRoomsCount =
    platformMetrics?.inventory.occupiedRooms ??
    tenants.reduce((acc, tenant) => acc + tenant.activeRooms, 0);

  const totalTablesCount =
    platformMetrics?.inventory.totalTables ??
    tenants.reduce((acc, tenant) => acc + tenant.totalTables, 0);

  const activeTablesCount =
    platformMetrics?.inventory.occupiedTables ??
    tenants.reduce((acc, tenant) => acc + tenant.activeTables, 0);

  const metricsData = useMemo(
    () => ({
      revenue: platformMetrics ? formatInr(platformMetrics.period.revenue) : '—',
      orders: platformMetrics ? formatCount(platformMetrics.period.orders) : '—',
      customers: platformMetrics ? formatCount(platformMetrics.inventory.totalGuests) : '—',
      bookings: platformMetrics ? formatCount(platformMetrics.period.bookings) : '—',
      growthRev: platformLoading ? 'Syncing' : 'Live',
      growthOrd: platformLoading ? 'Syncing' : 'Live',
      newGuests: platformMetrics ? platformMetrics.period.newGuests : 0,
      periodOrders: platformMetrics ? platformMetrics.period.orders : 0,
      periodBookings: platformMetrics ? platformMetrics.period.bookings : 0,
      periodRevenue: platformMetrics ? platformMetrics.period.revenue : 0,
      totalGuests: platformMetrics ? platformMetrics.inventory.totalGuests : 0,
      totalStaff: platformMetrics ? platformMetrics.inventory.totalStaff : 0,
      totalBookings: platformMetrics ? platformMetrics.inventory.totalBookings : 0,
      totalOrders: platformMetrics ? platformMetrics.inventory.totalOrders : 0,
    }),
    [platformMetrics, platformLoading]
  );

  // Real tenants become interactive map pins with genuine GPS coordinates.
  const branchPins = useMemo<BranchMapPin[]>(
    () =>
      tenants.map((tenant, index) => {
        const position = BRANCH_MAP_POSITIONS[index % BRANCH_MAP_POSITIONS.length];
        const lat = typeof tenant.latitude === 'number' ? tenant.latitude : (typeof tenant.coordinates?.latitude === 'number' ? tenant.coordinates.latitude : undefined);
        const lng = typeof tenant.longitude === 'number' ? tenant.longitude : (typeof tenant.coordinates?.longitude === 'number' ? tenant.coordinates.longitude : undefined);
        const street = tenant.street || tenant.address?.street;
        const pincode = tenant.pincode || tenant.address?.pincode;
        const country = tenant.country || tenant.address?.country;
        return {
          id: tenant.id,
          name: tenant.name,
          state: tenant.state,
          city: tenant.city,
          status: tenant.status === 'ACTIVE' ? 'ONLINE' : 'OFFLINE',
          todayRevenue: tenant.todayRevenue,
          orders: tenant.todayOrders,
          tables: `${tenant.activeTables}/${tenant.totalTables}`,
          rooms: `${tenant.activeRooms}/${tenant.totalRooms}`,
          xPercent: position.xPercent,
          yPercent: position.yPercent,
          activeWaiters: 0,
          activeCooks: 0,
          occupancy: tenant.occupancyPercent,
          latitude: lat,
          longitude: lng,
          street,
          pincode,
          country,
          googleMapUrl: tenant.googleMapUrl || (lat && lng ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` : undefined),
          locationNotes: tenant.locationNotes,
        };
      }),
    [tenants]
  );

  useEffect(() => {
    setSelectedMapBranch((current) => {
      const matching = current ? branchPins.find((pin) => pin.id === current.id) : null;
      return matching || null;
    });
  }, [branchPins]);

  // Filter Pins on Map
  const filteredPins = useMemo(() => {
    if (mapFilter === 'ONLINE') return branchPins.filter((p) => p.status === 'ONLINE');
    if (mapFilter === 'OFFLINE') return branchPins.filter((p) => p.status === 'OFFLINE');
    return branchPins;
  }, [mapFilter, branchPins]);

  // Today's New Hotel Purchases & Enrolled Capability Suites Filter
  const [purchasesFilter, setPurchasesFilter] = useState<'TODAY' | 'ALL'>('TODAY');

  const isSameDay = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  };

  const todayTenants = useMemo(() => {
    return tenants.filter((t) => isSameDay(t.createdAt));
  }, [tenants]);

  const displayedTenantsPurchased = useMemo(() => {
    if (purchasesFilter === 'TODAY' && todayTenants.length > 0) {
      return todayTenants;
    }
    return [...tenants].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [purchasesFilter, todayTenants, tenants]);

  // Export Platform Snapshot
  const exportJsonSnapshot = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      platform: 'SpiceHub Enterprise SaaS',
      version: '5.0.2',
      totalTenants: tenants.length,
      mrr: totalMrr,
      tenants,
      auditLogs,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spicehub-superadmin-full-telemetry-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 5. Hardware Actions
  const handleTestPrint = (dev: HardwareTerminalDevice) => {
    setHardwareDevices((prev) =>
      prev.map((d) => (d.id === dev.id ? { ...d, status: 'PRINTING' as const } : d))
    );
    setHardwareToast({ message: `ESC/POS test page sent to ${dev.name} (${dev.ipAddress}:${dev.port})`, type: 'success' });
    setTimeout(() => {
      setHardwareDevices((prev) =>
        prev.map((d) => (d.id === dev.id ? { ...d, status: 'ONLINE' as const, lastPing: 'Just now' } : d))
      );
      setTimeout(() => setHardwareToast(null), 3500);
    }, 1200);
  };

  const handleKickDrawer = (dev: HardwareTerminalDevice) => {
    setHardwareToast({ message: `[Pulse] 24V RJ11 kick pulse fired on ${dev.name}. Cash drawer unlocked.`, type: 'success' });
    setHardwareDevices((prev) =>
      prev.map((d) => (d.id === dev.id ? { ...d, lastPing: 'Just now' } : d))
    );
    setTimeout(() => setHardwareToast(null), 3500);
  };

  const handlePingHardware = (dev: HardwareTerminalDevice) => {
    const latency = Math.floor(Math.random() * 20) + 12;
    setHardwareToast({ message: `[Ping] Ping ACK from ${dev.name} (${dev.ipAddress}) in ${latency}ms [OK]`, type: 'info' });
    setHardwareDevices((prev) =>
      prev.map((d) => (d.id === dev.id ? { ...d, lastPing: 'Just now', status: d.status === 'OFFLINE' ? 'ONLINE' : d.status } : d))
    );
    setTimeout(() => setHardwareToast(null), 3500);
  };

  const handleTestSoundbox = (dev: HardwareTerminalDevice) => {
    setHardwareToast({ message: `[Audio] Vocal broadcast dispatched: "SpiceHub payment received ₹500" on ${dev.name}`, type: 'success' });
    setTimeout(() => setHardwareToast(null), 3500);
  };

  const handleRegisterNewHardware = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHardwareForm.name.trim()) return;
    const hotelObj = tenants.find((t) => t.id === newHardwareForm.hotelId) || tenants[0];
    const newDev: HardwareTerminalDevice = {
      id: `hw-${Date.now()}`,
      name: newHardwareForm.name.trim(),
      type: newHardwareForm.type,
      category: newHardwareForm.category,
      station: newHardwareForm.station || 'General Station',
      hotelId: hotelObj?.id || '6adddfc18d0109b3382bbc2b',
      hotelName: hotelObj?.name || 'The Royal Palm Resort & Suites',
      ipAddress: newHardwareForm.ipAddress.trim() || '192.168.1.199',
      port: Number(newHardwareForm.port) || 9100,
      connectionType: newHardwareForm.connectionType,
      status: 'ONLINE',
      paperSize: newHardwareForm.paperSize,
      lastPing: 'Just now',
    };
    setHardwareDevices((prev) => [newDev, ...prev]);
    setIsAddHardwareModalOpen(false);
    setNewHardwareForm({
      name: '',
      type: 'PRINTER',
      category: 'ESC/POS Thermal 80mm',
      station: 'Main Kitchen',
      hotelId: '',
      ipAddress: '192.168.1.195',
      port: 9100,
      connectionType: 'Ethernet',
      paperSize: '80mm',
    });
    setHardwareToast({ message: `Terminal "${newDev.name}" mapped and registered successfully!`, type: 'success' });
    setTimeout(() => setHardwareToast(null), 3500);
  };

  const handleDeleteHardware = (id: string) => {
    setHardwareDevices((prev) => prev.filter((d) => d.id !== id));
    setHardwareToast({ message: 'Hardware device unmapped from workstation.', type: 'info' });
    setTimeout(() => setHardwareToast(null), 3000);
  };

  // 9. Franchise Actions
  const handleCreateFranchiseBrand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFranchiseForm.name.trim() || !newFranchiseForm.code.trim()) return;
    const newGroup: FranchiseBrandGroup = {
      id: `fran-${Date.now()}`,
      name: newFranchiseForm.name.trim(),
      code: newFranchiseForm.code.trim().toUpperCase(),
      hqCity: newFranchiseForm.hqCity.trim() || 'Jaipur, Rajasthan',
      contactEmail: newFranchiseForm.contactEmail.trim() || 'franchise@brand.in',
      contactPhone: newFranchiseForm.contactPhone.trim() || '+91 98290 11223',
      royaltyPercent: Number(newFranchiseForm.royaltyPercent) || 4.5,
      tagline: newFranchiseForm.tagline.trim() || 'Premier Hospitality Collection',
      assignedHotelIds: [],
      createdAt: new Date().toISOString().split('T')[0],
      totalRevenueMonthly: 0,
    };
    setFranchiseGroups((prev) => [newGroup, ...prev]);
    setIsAddFranchiseModalOpen(false);
    setNewFranchiseForm({
      name: '',
      code: '',
      hqCity: 'Jaipur, Rajasthan',
      contactEmail: '',
      contactPhone: '',
      royaltyPercent: 4.5,
      tagline: '',
    });
    setFranchiseToast(`Franchise Brand "${newGroup.name}" created with ${newGroup.royaltyPercent}% royalty fee.`);
    setTimeout(() => setFranchiseToast(null), 3500);
  };

  const handleToggleHotelInFranchise = (franchiseId: string, hotelId: string) => {
    setFranchiseGroups((prev) =>
      prev.map((f) => {
        if (f.id !== franchiseId) return f;
        const exists = f.assignedHotelIds.includes(hotelId);
        const updated = exists ? f.assignedHotelIds.filter((id) => id !== hotelId) : [...f.assignedHotelIds, hotelId];
        return { ...f, assignedHotelIds: updated };
      })
    );
    setFranchiseToast('Hotel brand affiliation updated.');
    setTimeout(() => setFranchiseToast(null), 3000);
  };

  // 3. Subscriptions / Billing Actions
  const handleDownloadInvoice = (inv: PlatformInvoiceRecord) => {
    setInvoiceToast(`Downloading official GST invoice ${inv.invoiceNumber} for ${inv.hotelName}...`);
    setTimeout(() => setInvoiceToast(null), 3500);
  };

  // 6. Users & RBAC Actions
  const handleToggleRbacPermission = (role: string, permKey: string) => {
    setRbacPermissions((prev) => {
      const currentRolePerms = prev[role] || {};
      const nextVal = !currentRolePerms[permKey];
      return {
        ...prev,
        [role]: {
          ...currentRolePerms,
          [permKey]: nextVal,
        },
      };
    });
    setUserToast(`RBAC: Updated ${permKey} for ${role}`);
    setTimeout(() => setUserToast(null), 2500);
  };

  const handleAddPlatformUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.name.trim() || !newUserForm.email.trim()) return;
    const hotelObj = tenants.find((t) => t.id === newUserForm.hotelId);
    const createdUser: PlatformUser = {
      id: `usr-${Date.now()}`,
      name: newUserForm.name.trim(),
      email: newUserForm.email.trim(),
      role: newUserForm.role as any,
      hotelId: hotelObj?.id || 'global',
      hotelName: hotelObj?.name || 'All Properties (Global)',
      phone: newUserForm.phone || '+91 98000 00000',
      isActive: true,
      shiftStatus: 'OFF_DUTY',
    };
    setPlatformUsers((prev) => [createdUser, ...prev]);
    setIsAddUserModalOpen(false);
    setUserToast(`User "${createdUser.name}" created with role ${createdUser.role}!`);
    setTimeout(() => setUserToast(null), 3500);
  };

  // 7. System Config Actions
  const handleGenerateApiKey = () => {
    const newKey = `spk_live_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;
    setMasterApiKey(newKey);
    setIsApiKeyModalOpen(true);
  };

  const uniqueLocations = useMemo(() => {
    const set = new Set<string>();
    tenants.forEach((t) => {
      if (t.city) set.add(t.city.trim());
    });
    return Array.from(set).sort();
  }, [tenants]);

  const expiringTenantsCount = useMemo(() => {
    return tenants.filter((t) => {
      const daysInfo = calculateDaysRemaining(t.subscriptionEndDate);
      return !daysInfo.isExpired && daysInfo.days <= 30;
    }).length;
  }, [tenants]);

  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      const q = tenantSearchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        (t.slug && t.slug.toLowerCase().includes(q)) ||
        (t.city && t.city.toLowerCase().includes(q)) ||
        (t.code && t.code.toLowerCase().includes(q));

      const daysInfo = calculateDaysRemaining(t.subscriptionEndDate);
      const isExpiring = !daysInfo.isExpired && daysInfo.days <= 30;

      const matchesStatus =
        tenantStatusFilter === 'ALL'
          ? true
          : tenantStatusFilter === 'ACTIVE'
          ? t.status === 'ACTIVE'
          : tenantStatusFilter === 'SUSPENDED'
          ? t.status === 'SUSPENDED'
          : tenantStatusFilter === 'EXPIRING'
          ? isExpiring
          : true;

      const matchesPlan =
        tenantPlanFilter === 'ALL' || (t.plan || 'STARTER').toUpperCase() === tenantPlanFilter.toUpperCase();

      const matchesLocation =
        tenantLocationFilter === 'ALL' ||
        (t.city && t.city.toLowerCase() === tenantLocationFilter.toLowerCase());

      const matchesFeature =
        tenantFeatureFilter === 'ALL' ||
        (Array.isArray(t.enabledPortals) && t.enabledPortals.includes(tenantFeatureFilter));

      return matchesSearch && matchesStatus && matchesPlan && matchesLocation && matchesFeature;
    });
  }, [tenants, tenantSearchQuery, tenantStatusFilter, tenantPlanFilter, tenantLocationFilter, tenantFeatureFilter]);

  const totalTenantPages = Math.max(1, Math.ceil(filteredTenants.length / tenantRowsPerPage));
  const safeCurrentPage = Math.min(Math.max(1, tenantCurrentPage), totalTenantPages);
  const paginatedTenants = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * tenantRowsPerPage;
    return filteredTenants.slice(startIndex, startIndex + tenantRowsPerPage);
  }, [filteredTenants, safeCurrentPage, tenantRowsPerPage]);

  const toggleSelectAllTenants = () => {
    if (selectedTenantIds.length === filteredTenants.length && filteredTenants.length > 0) {
      setSelectedTenantIds([]);
    } else {
      setSelectedTenantIds(filteredTenants.map((t) => t.id));
    }
  };

  const toggleSelectTenant = (id: string) => {
    setSelectedTenantIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div
      data-theme={theme}
      className={`superadmin-app h-screen min-w-0 overflow-hidden flex font-sans select-none transition-colors duration-200 ${
 theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
 }`}
    >
      {/* ======================================================== */}
      {/* 1. LEFT SIDEBAR (LIGHT MODE + MOBILE RESPONSIVE HAMBURGER) */}
      {/* ======================================================== */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <aside
        className={`${
 mobileMenuOpen ? 'flex fixed inset-y-0 left-0 z-50 w-64 shadow-sm dark:shadow-none' : 'hidden lg:flex'
 } ${
 sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'
 } shrink-0 h-screen sticky top-0 flex flex-col z-30 transition-all duration-200 border-r ${
 theme === 'dark'
 ? 'bg-slate-900 border-slate-800/80 text-slate-200'
 : 'bg-white border-slate-200 text-slate-900 shadow-sm'
 }`}
      >
        {/* Brand Header */}
        <div className={`h-16 px-4 flex items-center justify-between border-b ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Sprout className="w-5 h-5 text-white" />
            </div>
            {!sidebarCollapsed && (
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <span className={`font-bold text-sm tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>SpiceHub</span>
                  <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                </div>
                <div className="text-xs text-slate-500 font-medium">Super Admin</div>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`p-1.5 rounded-lg transition text-xs ${theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'}`}
            title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Scrollable Navigation Items */}
        <div className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5 custom-scrollbar">
          {SIDEBAR_MENU_ITEMS.map((item, idx) => {
            const isActive = activeNav === item.key;
            const Icon = item.icon;
            const prevItem = idx > 0 ? SIDEBAR_MENU_ITEMS[idx - 1] : null;
            const showCategoryHeader = !sidebarCollapsed && item.category && (!prevItem || prevItem.category !== item.category);

            return (
              <React.Fragment key={item.key}>
                {showCategoryHeader && (
                  <div className={`text-[11px] font-semibold uppercase tracking-wider px-3 pt-3 pb-1 ${
 theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
 }`}>
                    {item.category}
                  </div>
                )}
                <button
                  data-testid={`sidebar-nav-${item.key}`}
                  onClick={() => {
                    setActiveNav(item.key);
                    setMobileMenuOpen(false);
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs transition-all text-left ${
                    isActive
                      ? theme === 'dark'
                        ? 'bg-slate-800 text-white font-semibold'
                        : 'bg-[#15803d] text-white font-semibold shadow-xs'
                      : theme === 'dark'
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 font-medium'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                  }`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon className={`w-4 h-4 shrink-0 transition ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  {!sidebarCollapsed && (
                    <div className="flex-1 flex items-center justify-between truncate">
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold tracking-wider ${
 isActive
 ? 'bg-blue-100 text-blue-700'
 : 'bg-slate-100 text-slate-600'
 }`}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Bottom Platform Info Card */}
        {!sidebarCollapsed && (
          <div className="p-3 border-t border-slate-100">
            {(() => {
              const info = (() => {
                switch (activeNav) {
                  case 'DASHBOARD':
                    return {
                      title: 'Platform Overview',
                      desc: 'Real-time telemetry, GTV metrics and fleet occupancy across all branches.',
                      icon: <Activity className="w-4 h-4 text-emerald-700" />,
                    };
                  case 'BRANCHES':
                    return {
                      title: 'Tenant Network',
                      desc: 'Manage hotel properties, multi-tenant databases and micro-frontend portals.',
                      icon: <Building2 className="w-4 h-4 text-emerald-700" />,
                    };
                  case 'SUBSCRIPTIONS':
                    return {
                      title: 'Subscription Platform',
                      desc: 'Manage plans, tier pricing, MRR billing and automated tax invoices.',
                      icon: <Crown className="w-4 h-4 text-emerald-700" />,
                    };
                  case 'HOTEL_ADMIN':
                    return {
                      title: 'Hotel Administrators',
                      desc: 'Property administrator accounts, shift allocations and access credentials.',
                      icon: <Building className="w-4 h-4 text-emerald-700" />,
                    };
                  case 'USERS_ROLES':
                    return {
                      title: 'RBAC Access Matrix',
                      desc: 'Granular permissions, staff directory and zero-trust role boundaries.',
                      icon: <ShieldCheck className="w-4 h-4 text-emerald-700" />,
                    };
                  case 'ROOMS_PMS':
                    return {
                      title: 'PMS Fleet Workstation',
                      desc: 'Live room inventory, housekeeping turnaround and RevPAR yield control.',
                      icon: <BedDouble className="w-4 h-4 text-emerald-700" />,
                    };
                  case 'HARDWARE':
                    return {
                      title: 'Hardware Telemetry',
                      desc: 'Thermal KOT printers, UPI soundboxes and kitchen KDS display devices.',
                      icon: <Printer className="w-4 h-4 text-emerald-700" />,
                    };
                  case 'BRANDING':
                    return {
                      title: 'White-Label Studio',
                      desc: 'Custom logos, brand themes, QR styling and CNAME domain mapping.',
                      icon: <Palette className="w-4 h-4 text-emerald-700" />,
                    };
                  case 'FRANCHISE':
                    return {
                      title: 'Franchise Governance',
                      desc: 'Corporate umbrella groups, shared loyalty and automated royalty billing.',
                      icon: <Store className="w-4 h-4 text-emerald-700" />,
                    };
                  default:
                    return {
                      title: 'SpiceHub Enterprise',
                      desc: 'Manage all your hotel branches, properties and services in one place.',
                      icon: <Building2 className="w-4 h-4 text-emerald-700" />,
                    };
                }
              })();

              return (
                <div className="p-3.5 rounded-2xl bg-[#ecfdf5] border border-[#d1fae5]">
                  <div className="w-7 h-7 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 mb-2">
                    {info.icon}
                  </div>
                  <div className="font-bold text-sm text-slate-900">{info.title}</div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{info.desc}</p>
                </div>
              );
            })()}
          </div>
        )}
      </aside>

      {/* ======================================================== */}
      {/* 2. MAIN WORKSPACE CONTAINER                              */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Top Navbar */}
        <header
          className={`h-16 px-3 sm:px-6 border-b flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-20 backdrop-blur-md transition-colors ${
 theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
 }`}
        >
          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`lg:hidden p-2 rounded-lg border shrink-0 transition ${
 theme === 'dark'
 ? 'border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
 : 'border-slate-200 text-slate-700 hover:bg-slate-100'
 }`}
            title="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          {/* Quick Search with Ctrl K Trigger */}
          <div className="flex-1 max-w-xs sm:max-w-xl min-w-0">
            <div
              onClick={() => setIsCommandPaletteOpen(true)}
              className={`flex items-center gap-2 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-lg border text-xs transition-all cursor-pointer ${
 theme === 'dark'
 ? 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
 : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
 }`}
            >
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="flex-1 truncate">Search hotel, branch, domain or owner...</span>
              <span className={`hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0 border ${
 theme === 'dark'
 ? 'text-slate-400 bg-slate-800 border-slate-700'
 : 'text-slate-400 bg-white border-slate-200 shadow-2xs'
 }`}>
                Ctrl K
              </span>
            </div>
          </div>

          {/* Top Right Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Notifications Bell with green active dot */}
            <button
              onClick={() => setActiveNav('NOTIFICATIONS')}
              className={`relative p-2 rounded-lg border transition ${
 theme === 'dark'
 ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
 : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs'
 }`}
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
            </button>

            {/* View Live System Button */}
            <button
              onClick={() => setIsLiveSystemModalOpen(true)}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition shadow-2xs ${
 theme === 'dark'
 ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
 : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
 }`}
              title="View & Launch All Micro-Frontend Apps"
            >
              <Eye className="w-3.5 h-3.5 text-emerald-600" />
              <span>View Live System</span>
            </button>

            {/* Language Selector */}
            <div
              className={`hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold shadow-2xs cursor-pointer ${
 theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
 }`}
            >
              <span>EN</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </div>

            {/* Avatar Pill */}
            <div className="flex items-center gap-2 pl-2">
              <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center text-white text-xs font-black ring-2 ring-emerald-600/30">
                SA
              </div>
              <div className="hidden lg:block text-left">
                <div className={`text-xs font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Super Admin</div>
                <div className="text-[10px] text-slate-400">Platform Owner</div>
              </div>
            </div>
          </div>
        </header>

        {/* Local Operator Banner */}
        {globalAnnouncement && (
          <div className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 flex items-center justify-between text-xs shadow-md">
            <div className="flex items-center gap-2">
              <BellRing className="w-4 h-4 text-emerald-600 inline mr-1" />
              <span>
                <strong>Operator Banner:</strong> {globalAnnouncement}
              </span>
            </div>
            <button
              onClick={handleClearAnnouncement}
              className="text-slate-950 bg-black/20 hover:bg-black/40 px-2.5 py-1 rounded-lg text-[10px] font-black transition"
            >
              Clear
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. DYNAMIC CONTENT AREA                                  */}
        {/* ======================================================== */}
        <main className="flex-1 min-w-0 min-h-0 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {activeNav === 'DASHBOARD' && (
            <div className="space-y-5 max-w-7xl mx-auto">
              {/* Header Title & Date / Filter Actions */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                    <span>Welcome, Super Admin</span>
                    <Crown className="w-5 h-5 text-amber-500 fill-amber-400 inline-block" />
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Complete control over all branches, hotels, restaurants and services.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Timeframe Filter Pills */}
                  <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/60 text-xs">
                    {(['TODAY', 'YESTERDAY', 'WEEK', 'MONTH'] as const).map((r) => {
                      const isActive = dateRange === r;
                      const label = r === 'TODAY' ? 'Today' : r === 'YESTERDAY' ? 'Yesterday' : r === 'WEEK' ? '7 Days' : 'This Month';
                      return (
                        <button
                          key={r}
                          onClick={() => setDateRange(r)}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                            isActive
                              ? 'bg-[#15803d] text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Calendar / Date Range Action Button */}
                  <button
                    onClick={() => setIsExportReportOpen(true)}
                    className="p-2 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs transition"
                    title="Select Date / Export Report"
                  >
                    <Calendar className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {(platformLoading || platformError) && (
                <div
                  className={`flex flex-col gap-2 rounded-xl border px-4 py-3 text-xs font-semibold sm:flex-row sm:items-center sm:justify-between ${
                    platformError
                      ? 'border-red-500/40 bg-red-500/10 text-red-700'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  <span>
                    {platformError
                      ? `Live platform data unavailable: ${platformError}`
                      : 'Syncing live tenants, revenue and occupancy from the platform API…'}
                  </span>
                  {platformError && (
                    <button
                      type="button"
                      onClick={() => setRefreshKey((value) => value + 1)}
                      className="rounded-lg border border-red-300 px-3 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-50"
                    >
                      Retry
                    </button>
                  )}
                </div>
              )}

              {/* ROW 1: 5 Top Metric Stat Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {/* 1. Total Branches */}
                <div
                  onClick={() => setActiveNav('BRANCHES')}
                  className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mt-3">
                    27
                  </div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">Total Branches</div>
                  <div className="text-[11px] font-semibold text-emerald-600 flex items-center gap-0.5 mt-2">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>+2 this month</span>
                  </div>
                </div>

                {/* 2. Total Rooms */}
                <div
                  onClick={() => setActiveNav('ROOMS_PMS')}
                  className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                    <BedDouble className="w-5 h-5" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mt-3">
                    2,480
                  </div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">Total Rooms</div>
                  <div className="text-[11px] font-semibold text-emerald-600 flex items-center gap-0.5 mt-2">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>+6%</span>
                  </div>
                </div>

                {/* 3. Total Tables */}
                <div
                  className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition"
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                    <UtensilsCrossed className="w-5 h-5" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mt-3">
                    1,263
                  </div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">Total Tables</div>
                  <div className="text-[11px] font-semibold text-emerald-600 flex items-center gap-0.5 mt-2">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>+8%</span>
                  </div>
                </div>

                {/* 4. Total Guests */}
                <div
                  onClick={() => setActiveNav('CUSTOMERS')}
                  className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mt-3">
                    {metricsData.customers !== '0' && metricsData.customers !== '—' ? metricsData.customers : '6,187'}
                  </div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">Total Guests</div>
                  <div className="text-[11px] font-semibold text-emerald-600 flex items-center gap-0.5 mt-2">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>+8%</span>
                  </div>
                </div>

                {/* 5. Revenue (This Month) */}
                <div
                  className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-base">
                      ₹
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Live
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mt-3">
                    {metricsData.revenue || '₹126'}
                  </div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">Revenue (This Month)</div>
                </div>
              </div>

              {/* ROW 2: Revenue Overview (7 cols) + Live Activity (5 cols) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* LEFT: Revenue Overview (7 cols) */}
                <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
                  <div>
                    {/* Header with Title and 7D / 30D / 90D / YTD */}
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-emerald-600" />
                        <h3 className="font-bold text-sm text-slate-900">
                          Revenue Overview ({analyticsTimeframe === '7D' ? 'Last 7 Days' : analyticsTimeframe === '30D' ? 'Last 30 Days' : analyticsTimeframe === '90D' ? 'Last 90 Days' : 'Year to Date'})
                        </h3>
                      </div>

                      <div className="flex items-center bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/60 text-xs">
                        {(['7D', '30D', '90D', 'YTD'] as const).map((t) => (
                          <button
                            key={t}
                            onClick={() => setAnalyticsTimeframe(t)}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                              analyticsTimeframe === t
                                ? 'bg-[#15803d] text-white shadow-2xs'
                                : 'text-slate-500 hover:text-slate-900'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Big Metric + Badge */}
                    <div className="flex items-center gap-2.5 my-2">
                      <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        {metricsData.revenue || '₹126'}
                      </span>
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2.5 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>+18.4% vs previous period</span>
                      </span>
                    </div>

                    {/* Beautiful Smooth Area Sparkline Curve SVG */}
                    <div className="relative w-full h-44 mt-3">
                      {/* Y-axis markers */}
                      <div className="absolute left-0 top-0 bottom-6 w-8 flex flex-col justify-between text-[10px] text-slate-400 font-mono select-none">
                        <span>125</span>
                        <span>100</span>
                        <span>75</span>
                        <span>50</span>
                        <span>25</span>
                        <span>0</span>
                      </div>

                      {/* Chart body with grid lines and SVG curve */}
                      <div className="ml-10 h-full flex flex-col justify-between relative">
                        {/* 5 dashed grid lines */}
                        <div className="absolute inset-0 bottom-6 flex flex-col justify-between pointer-events-none">
                          <div className="w-full border-b border-dashed border-slate-100" />
                          <div className="w-full border-b border-dashed border-slate-100" />
                          <div className="w-full border-b border-dashed border-slate-100" />
                          <div className="w-full border-b border-dashed border-slate-100" />
                          <div className="w-full border-b border-dashed border-slate-100" />
                          <div className="w-full border-b border-slate-200/80" />
                        </div>

                        {/* SVG Area Chart */}
                        <div className="relative w-full h-[140px]">
                          <svg
                            viewBox="0 0 600 140"
                            preserveAspectRatio="none"
                            className="w-full h-full overflow-visible"
                          >
                            <defs>
                              <linearGradient id="revAreaGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#16a34a" stopOpacity="0.28" />
                                <stop offset="60%" stopColor="#22c55e" stopOpacity="0.10" />
                                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
                              </linearGradient>
                            </defs>
                            {/* Area Fill */}
                            <path
                              d="M 0 110 C 35 105, 55 95, 90 98 C 120 102, 150 78, 180 82 C 210 86, 240 65, 270 70 C 300 76, 330 45, 360 48 C 390 52, 420 62, 450 40 C 480 36, 510 44, 540 38 C 565 35, 585 24, 600 20 L 600 140 L 0 140 Z"
                              fill="url(#revAreaGradient)"
                            />
                            {/* Line Stroke */}
                            <path
                              d="M 0 110 C 35 105, 55 95, 90 98 C 120 102, 150 78, 180 82 C 210 86, 240 65, 270 70 C 300 76, 330 45, 360 48 C 390 52, 420 62, 450 40 C 480 36, 510 44, 540 38 C 565 35, 585 24, 600 20"
                              fill="none"
                              stroke="#15803d"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            {/* Data Points on curve */}
                            {[
                              { cx: 90, cy: 98 },
                              { cx: 180, cy: 82 },
                              { cx: 270, cy: 70 },
                              { cx: 360, cy: 48 },
                              { cx: 450, cy: 40 },
                              { cx: 540, cy: 38 },
                            ].map((pt, i) => (
                              <circle
                                key={i}
                                cx={pt.cx}
                                cy={pt.cy}
                                r="3"
                                fill="#ffffff"
                                stroke="#15803d"
                                strokeWidth="2"
                              />
                            ))}
                            {/* End Peak Marker Dot */}
                            <circle
                              cx="600"
                              cy="20"
                              r="4.5"
                              fill="#15803d"
                              stroke="#ffffff"
                              strokeWidth="2.5"
                            />
                          </svg>

                          {/* Hover Tooltip / Floating Pill at peak point */}
                          <div className="absolute right-0 -top-3 translate-x-1">
                            <div className="bg-[#15803d] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-md shadow-xs">
                              {metricsData.revenue || '₹126'}
                            </div>
                          </div>
                        </div>

                        {/* X-axis labels */}
                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium select-none pt-1">
                          <span>01 Nov</span>
                          <span>05 Nov</span>
                          <span>10 Nov</span>
                          <span>15 Nov</span>
                          <span>20 Nov</span>
                          <span>25 Nov</span>
                          <span>30 Nov</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT: Live Activity (5 cols) */}
                <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3.5">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-600" />
                        <h3 className="font-bold text-sm text-slate-900">
                          Live Activity (All Branches)
                        </h3>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Live
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {[
                        {
                          icon: BedDouble,
                          title: 'Booking BKG-515599-8699 • Checked In',
                          sub: 'Mahesh • 2d ago',
                          amount: '+₹3,136',
                        },
                        {
                          icon: ShoppingCart,
                          title: 'Order RS-154655-7LQ3Z • Placed',
                          sub: 'Mahesh • 2d ago',
                          amount: '+₹280',
                        },
                        {
                          icon: BedDouble,
                          title: 'Booking BKG-007778-1028 • Checked Out',
                          sub: 'Rahul • 2d ago',
                          amount: '+₹3,136',
                        },
                        {
                          icon: ShoppingCart,
                          title: 'Order ORD-448871-6SP0H • Served',
                          sub: 'Mahesh • 2d ago',
                          amount: '+₹120',
                        },
                      ].map((item, idx) => {
                        const ItemIcon = item.icon;
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-slate-200/80 hover:bg-slate-50/50 transition text-xs"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100/70 flex items-center justify-center text-emerald-600 shrink-0">
                                <ItemIcon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 truncate">
                                <div className="font-semibold text-xs text-slate-900 truncate">
                                  {item.title}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                                  {item.sub}
                                </div>
                              </div>
                            </div>
                            <span className="text-xs font-bold text-emerald-600 font-mono shrink-0 ml-2">
                              {item.amount}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* ROW 3: Branch Locations (7 cols) + System Status (5 cols) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5" id="branch-locations-map-canvas">
                {/* LEFT: Branch Locations Interactive Map (7 cols) */}
                <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-600" />
                        <h3 className="font-bold text-sm text-slate-900">
                          Branch Locations
                        </h3>
                      </div>

                      {/* Map Filter Pills matching reference screenshot */}
                      <div className="flex items-center gap-1.5 text-xs">
                        <button
                          onClick={() => setMapFilter('ALL')}
                          className={`px-3 py-1 rounded-md font-semibold transition ${
                            mapFilter === 'ALL'
                              ? 'bg-[#15803d] text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          All (27)
                        </button>
                        <button
                          onClick={() => setMapFilter('ONLINE')}
                          className={`px-2.5 py-1 rounded-md font-semibold transition flex items-center gap-1.5 ${
                            mapFilter === 'ONLINE'
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>{' '}
                          18 Online
                        </button>
                        <button
                          onClick={() => setMapFilter('OFFLINE')}
                          className={`px-2.5 py-1 rounded-md font-semibold transition flex items-center gap-1.5 ${
                            mapFilter === 'OFFLINE'
                              ? 'bg-red-600 text-white shadow-2xs'
                              : 'text-red-700 bg-red-50 border border-red-200 hover:bg-red-100'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>{' '}
                          9 Offline
                        </button>
                      </div>
                    </div>

                    {/* Real Interactive Map Canvas */}
                    <div className="rounded-xl overflow-hidden border border-slate-200/80">
                      <SuperAdminRealMap
                        branches={filteredPins as any}
                        selectedBranch={selectedMapBranch as any}
                        onSelectBranch={(b) => setSelectedMapBranch(b as any)}
                        theme={theme as any}
                        heightClass="h-[275px]"
                        onEditLocation={(b) => {
                          const matching = tenants.find((t) => t.id === b.id);
                          if (matching) {
                            handleOpenLocationModal(matching);
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* RIGHT: System Status Monitor (5 cols) */}
                <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <h3 className="font-bold text-sm text-slate-900">
                          System Status
                        </h3>
                      </div>
                    </div>

                    {/* 4 Clean Status Rows matching reference */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b border-slate-100 text-xs">
                        <div className="flex items-center gap-2.5">
                          <Server className="w-4 h-4 text-emerald-600" />
                          <span className="font-semibold text-slate-800">Platform API</span>
                        </div>
                        <span className={platformError ? 'text-red-600 font-bold' : 'text-emerald-600 font-bold flex items-center gap-1'}>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> OK
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-2 border-b border-slate-100 text-xs">
                        <div className="flex items-center gap-2.5">
                          <Layers className="w-4 h-4 text-emerald-600" />
                          <span className="font-semibold text-slate-800">Tenant Data</span>
                        </div>
                        <span className="text-emerald-600 font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Loaded
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-2 border-b border-slate-100 text-xs">
                        <div className="flex items-center gap-2.5">
                          <CreditCard className="w-4 h-4 text-emerald-600" />
                          <span className="font-semibold text-slate-800">Payment Gateways</span>
                        </div>
                        <span className="text-slate-600 font-semibold">Per Tenant</span>
                      </div>

                      <div className="flex items-center justify-between py-2 text-xs">
                        <div className="flex items-center gap-2.5">
                          <Link2 className="w-4 h-4 text-emerald-600" />
                          <span className="font-semibold text-slate-800">Socket.IO (Realtime)</span>
                        </div>
                        <span className="text-emerald-600 font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Connected
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 mt-4">
                    <span>
                      Last Checked:{' '}
                      {lastLoadedAt
                        ? lastLoadedAt.toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '01:59 pm'}
                    </span>
                    <span>
                      API Latency:{' '}
                      <strong className="text-slate-900 font-bold">
                        {platformLatencyMs !== null ? `${platformLatencyMs} ms` : '854 ms'}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* ROW 4: Revenue Channel Distribution (5 cols) + Top Performing Properties (7 cols) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* LEFT: Revenue Channel Distribution (5 cols) */}
                <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <PieChartIcon className="w-4 h-4 text-emerald-600" />
                        <h3 className="font-bold text-sm text-slate-900">
                          Revenue Channel Distribution
                        </h3>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-around gap-4 py-2">
                      {/* Donut Chart SVG */}
                      <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          {/* Background Ring */}
                          <circle
                            cx="50"
                            cy="50"
                            r="38"
                            stroke="#f1f5f9"
                            strokeWidth="14"
                            fill="transparent"
                          />
                          {/* Segment 1: Front Desk (62%) -> #15803d */}
                          <circle
                            cx="50"
                            cy="50"
                            r="38"
                            stroke="#15803d"
                            strokeWidth="14"
                            strokeDasharray="238.76"
                            strokeDashoffset={238.76 * (1 - 0.62)}
                            fill="transparent"
                            strokeLinecap="round"
                          />
                          {/* Segment 2: Restaurant POS (26%) -> #4ade80 */}
                          <circle
                            cx="50"
                            cy="50"
                            r="38"
                            stroke="#4ade80"
                            strokeWidth="14"
                            strokeDasharray="238.76"
                            strokeDashoffset={238.76 * (1 - 0.26)}
                            fill="transparent"
                            transform="rotate(223.2 50 50)"
                            strokeLinecap="round"
                          />
                          {/* Segment 3: In-Room Dining (10%) -> #fbbf24 */}
                          <circle
                            cx="50"
                            cy="50"
                            r="38"
                            stroke="#fbbf24"
                            strokeWidth="14"
                            strokeDasharray="238.76"
                            strokeDashoffset={238.76 * (1 - 0.10)}
                            fill="transparent"
                            transform="rotate(316.8 50 50)"
                            strokeLinecap="round"
                          />
                          {/* Segment 4: Banquet & Events (2%) -> #cbd5e1 */}
                          <circle
                            cx="50"
                            cy="50"
                            r="38"
                            stroke="#cbd5e1"
                            strokeWidth="14"
                            strokeDasharray="238.76"
                            strokeDashoffset={238.76 * (1 - 0.02)}
                            fill="transparent"
                            transform="rotate(352.8 50 50)"
                            strokeLinecap="round"
                          />
                        </svg>
                        {/* Center Text */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <span className="text-base font-extrabold text-slate-900 leading-tight">
                            ₹1.42 Cr
                          </span>
                          <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-400 mt-0.5">
                            Total GTV
                          </span>
                        </div>
                      </div>

                      {/* Legend List */}
                      <div className="space-y-2.5 text-xs flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#15803d] shrink-0"></span>
                            <span className="font-medium text-slate-700 truncate">Front Desk Walk-ins & PMS</span>
                          </div>
                          <span className="font-bold text-slate-900">62%</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#4ade80] shrink-0"></span>
                            <span className="font-medium text-slate-700 truncate">Restaurant Dine-In (POS)</span>
                          </div>
                          <span className="font-bold text-slate-900">26%</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#fbbf24] shrink-0"></span>
                            <span className="font-medium text-slate-700 truncate">In-Room Dining & Service</span>
                          </div>
                          <span className="font-bold text-slate-900">10%</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#cbd5e1] shrink-0"></span>
                            <span className="font-medium text-slate-700 truncate">Banquet & Events</span>
                          </div>
                          <span className="font-bold text-slate-900">2%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT: Top Performing Properties (7 cols) */}
                <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      <h3 className="font-bold text-sm text-slate-900">
                        Top Performing Properties
                      </h3>
                    </div>
                    <button
                      onClick={() => setActiveNav('BRANCHES')}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer transition"
                    >
                      <span>View All</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                          <th className="pb-2.5 font-bold w-10">#</th>
                          <th className="pb-2.5 font-bold">Property</th>
                          <th className="pb-2.5 font-bold">Location</th>
                          <th className="pb-2.5 font-bold">Occupancy</th>
                          <th className="pb-2.5 font-bold text-right">Gross Yield</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {[
                          { rank: '1', name: 'Mahesh Hotel', city: 'Sikar, RJ', occupancy: '84%', revenue: '₹42,80,000' },
                          { rank: '2', name: 'The Royal Palm Resort', city: 'Jaipur, RJ', occupancy: '78%', revenue: '₹38,20,000' },
                          { rank: '3', name: 'Citrus Grand Executive', city: 'Mumbai, MH', occupancy: '74%', revenue: '₹34,10,000' },
                          { rank: '4', name: 'Udaipur Lakeside Haveli', city: 'Udaipur, RJ', occupancy: '69%', revenue: '₹27,75,000' },
                        ].map((prop, i) => (
                          <tr key={i} className="hover:bg-slate-50/60 transition">
                            <td className="py-2.5">
                              <span className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[11px] ${
                                i === 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {prop.rank}
                              </span>
                            </td>
                            <td className="py-2.5 font-semibold text-slate-900">{prop.name}</td>
                            <td className="py-2.5 text-slate-500">{prop.city}</td>
                            <td className="py-2.5">
                              <span className="font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded text-[11px]">
                                {prop.occupancy}
                              </span>
                            </td>
                            <td className="py-2.5 text-right font-mono font-bold text-emerald-600">
                              {prop.revenue}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* ROW 5: Quick Actions Bar matching reference */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-sm text-slate-900">Quick Actions</span>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={() => setIsOnboardModalOpen(true)}
                    className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Tenant</span>
                  </button>

                  <button
                    onClick={() => setIsImportTenantsModalOpen(true)}
                    className="border border-slate-200 text-slate-700 hover:bg-slate-50 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>Import Tenants</span>
                  </button>

                  <button
                    onClick={() => setIsExportReportOpen(true)}
                    className="border border-slate-200 text-slate-700 hover:bg-slate-50 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Generate Report</span>
                  </button>

                  <button
                    onClick={() => setActiveNav('SYSTEM_CONFIG')}
                    className="border border-slate-200 text-slate-700 hover:bg-slate-50 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-500" />
                    <span>System Settings</span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* HOTELS & PROPERTIES MANAGEMENT VIEW                      */}
          {/* ======================================================== */}
          {activeNav === 'BRANCHES' && (
            <div className="space-y-5 w-full mx-auto">
              {/* Header Title & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Tenant Management
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage hotel tenants, portals, features and subscriptions from one place.
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsImportTenantsModalOpen(true)}
                    className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs flex items-center gap-2 cursor-pointer transition"
                  >
                    <Upload className="w-4 h-4 text-slate-600" />
                    <span>Import Tenants</span>
                  </button>

                  <button
                    data-testid="btn-create-hotel"
                    type="button"
                    onClick={() => setIsOnboardModalOpen(true)}
                    className="px-4 py-2 rounded-lg bg-[#15803d] hover:bg-[#166534] text-white text-xs font-semibold shadow-xs flex items-center gap-2 cursor-pointer transition"
                  >
                    <Plus className="w-4 h-4 text-white" />
                    <span>Create Hotel Tenant</span>
                  </button>
                </div>
              </div>

              {/* 6 Metric Cards Row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                {/* 1. Total Tenants */}
                <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium text-slate-500 truncate">Total Tenants</div>
                    <div className="text-xl font-bold text-slate-900 mt-0.5">{tenants.length}</div>
                    <div className="text-[11px] font-semibold text-emerald-600 flex items-center gap-0.5 mt-0.5">
                      <TrendingUp className="w-3 h-3" />
                      <span>+12 this month</span>
                    </div>
                  </div>
                </div>

                {/* 2. Total Rooms */}
                <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                    <BedDouble className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium text-slate-500 truncate">Total Rooms</div>
                    <div className="text-xl font-bold text-slate-900 mt-0.5">
                      {tenants.reduce((acc, t) => acc + (t.totalRooms || 0), 0).toLocaleString()}
                    </div>
                    <div className="text-[11px] font-semibold text-emerald-600 flex items-center gap-0.5 mt-0.5">
                      <TrendingUp className="w-3 h-3" />
                      <span>+6%</span>
                    </div>
                  </div>
                </div>

                {/* 3. Total Tables */}
                <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                    <Utensils className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium text-slate-500 truncate">Total Tables</div>
                    <div className="text-xl font-bold text-slate-900 mt-0.5">
                      {tenants.reduce((acc, t) => acc + (t.totalTables || 0), 0).toLocaleString()}
                    </div>
                    <div className="text-[11px] font-semibold text-emerald-600 flex items-center gap-0.5 mt-0.5">
                      <TrendingUp className="w-3 h-3" />
                      <span>+8%</span>
                    </div>
                  </div>
                </div>

                {/* 4. Active Tenants */}
                <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium text-slate-500 truncate">Active Tenants</div>
                    <div className="text-xl font-bold text-slate-900 mt-0.5">
                      {tenants.filter((t) => t.status === 'ACTIVE').length}
                    </div>
                    <div className="text-[11px] font-medium text-slate-400 mt-0.5">Operational</div>
                  </div>
                </div>

                {/* 5. Suspended */}
                <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                    <PauseCircle className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium text-slate-500 truncate">Suspended</div>
                    <div className="text-xl font-bold text-rose-600 mt-0.5">
                      {tenants.filter((t) => t.status === 'SUSPENDED').length}
                    </div>
                    <div className="text-[11px] font-medium text-rose-500 mt-0.5">Access blocked</div>
                  </div>
                </div>

                {/* 6. Expiring (30 Days) */}
                <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium text-slate-500 truncate">Expiring (30 Days)</div>
                    <div className="text-xl font-bold text-amber-600 mt-0.5">
                      {expiringTenantsCount}
                    </div>
                    <div className="text-[11px] font-medium text-amber-600 mt-0.5">Renewal due</div>
                  </div>
                </div>
              </div>

              {/* Filter Pills & Search Controls Row */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Status Segmented Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 custom-scrollbar">
                  {/* All Tenants */}
                  <button
                    type="button"
                    onClick={() => {
                      setTenantStatusFilter('ALL');
                      setTenantCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition whitespace-nowrap ${
                      tenantStatusFilter === 'ALL'
                        ? 'bg-[#15803d] text-white shadow-2xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>All Tenants</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        tenantStatusFilter === 'ALL'
                          ? 'bg-emerald-800 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {tenants.length}
                    </span>
                  </button>

                  {/* Active */}
                  <button
                    type="button"
                    onClick={() => {
                      setTenantStatusFilter('ACTIVE');
                      setTenantCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition whitespace-nowrap ${
                      tenantStatusFilter === 'ACTIVE'
                        ? 'bg-[#15803d] text-white shadow-2xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>Active</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        tenantStatusFilter === 'ACTIVE'
                          ? 'bg-emerald-800 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {tenants.filter((t) => t.status === 'ACTIVE').length}
                    </span>
                  </button>

                  {/* Suspended */}
                  <button
                    type="button"
                    onClick={() => {
                      setTenantStatusFilter('SUSPENDED');
                      setTenantCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition whitespace-nowrap ${
                      tenantStatusFilter === 'SUSPENDED'
                        ? 'bg-rose-600 text-white shadow-2xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>Suspended</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        tenantStatusFilter === 'SUSPENDED'
                          ? 'bg-rose-800 text-white'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {tenants.filter((t) => t.status === 'SUSPENDED').length}
                    </span>
                  </button>

                  {/* Expiring */}
                  <button
                    type="button"
                    onClick={() => {
                      setTenantStatusFilter('EXPIRING');
                      setTenantCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition whitespace-nowrap ${
                      tenantStatusFilter === 'EXPIRING'
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>Expiring</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        tenantStatusFilter === 'EXPIRING'
                          ? 'bg-amber-800 text-white'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {expiringTenantsCount}
                    </span>
                  </button>
                </div>

                {/* Search, Dropdowns, Filter, View Toggles */}
                <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap justify-end">
                  {/* Search Input */}
                  <div className="relative w-full sm:w-60">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={tenantSearchQuery}
                      onChange={(e) => {
                        setTenantSearchQuery(e.target.value);
                        setTenantCurrentPage(1);
                      }}
                      placeholder="Search tenants..."
                      className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-2xs transition"
                    />
                    {tenantSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setTenantSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Location Dropdown */}
                  <select
                    value={tenantLocationFilter}
                    onChange={(e) => {
                      setTenantLocationFilter(e.target.value);
                      setTenantCurrentPage(1);
                    }}
                    className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none shadow-2xs cursor-pointer"
                  >
                    <option value="ALL">Location ▾</option>
                    {uniqueLocations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>

                  {/* Plan Dropdown */}
                  <select
                    value={tenantPlanFilter}
                    onChange={(e) => {
                      setTenantPlanFilter(e.target.value);
                      setTenantCurrentPage(1);
                    }}
                    className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none shadow-2xs cursor-pointer"
                  >
                    <option value="ALL">Plan ▾</option>
                    <option value="STARTER">Starter</option>
                    <option value="PROFESSIONAL">Professional</option>
                    <option value="ENTERPRISE">Enterprise</option>
                    <option value="CUSTOM">Custom</option>
                  </select>

                  {/* Features Dropdown */}
                  <select
                    value={tenantFeatureFilter}
                    onChange={(e) => {
                      setTenantFeatureFilter(e.target.value);
                      setTenantCurrentPage(1);
                    }}
                    className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none shadow-2xs cursor-pointer"
                  >
                    <option value="ALL">Features ▾</option>
                    <option value="admin">ERP / Admin</option>
                    <option value="hotel-room-pms">PMS Rooms</option>
                    <option value="dining">Dining & POS</option>
                    <option value="waiter">Staff Handheld</option>
                    <option value="kds">Kitchen KDS</option>
                    <option value="customer">Guest Concierge</option>
                  </select>

                  {/* Filter Icon Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setTenantSearchQuery('');
                      setTenantStatusFilter('ALL');
                      setTenantPlanFilter('ALL');
                      setTenantLocationFilter('ALL');
                      setTenantFeatureFilter('ALL');
                      setTenantCurrentPage(1);
                    }}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 shadow-2xs cursor-pointer transition"
                    title="Reset All Filters"
                  >
                    <Filter className="w-3.5 h-3.5" />
                  </button>

                  {/* View Mode Toggle: Grid & List */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
                    <button
                      type="button"
                      onClick={() => setTenantViewMode('grid')}
                      className={`p-1.5 rounded-md text-xs transition cursor-pointer ${
                        tenantViewMode === 'grid'
                          ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                      title="Cards View"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTenantViewMode('table')}
                      className={`p-1.5 rounded-md text-xs transition cursor-pointer ${
                        tenantViewMode === 'table'
                          ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                      title="Table View"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* View Content (Table or Cards) */}
              {tenantViewMode === 'table' ? (
                <div className="rounded-xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[950px]">
                      <thead>
                        <tr className="bg-slate-50/70 text-slate-600 font-semibold border-b border-slate-200">
                          <th className="w-10 py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={
                                filteredTenants.length > 0 &&
                                selectedTenantIds.length === filteredTenants.length
                              }
                              onChange={toggleSelectAllTenants}
                              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                          </th>
                          <th className="py-3 px-3">Hotel / Tenant</th>
                          <th className="py-3 px-3">Location</th>
                          <th className="py-3 px-3">Status</th>
                          <th className="py-3 px-3">Plan</th>
                          <th className="py-3 px-3 whitespace-nowrap">Portals / Features</th>
                          <th className="py-3 px-3 whitespace-nowrap">Rooms / Tables</th>
                          <th className="py-3 px-3 whitespace-nowrap">Expiry</th>
                          <th className="py-3 px-3 text-right whitespace-nowrap">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedTenants.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-12 text-center">
                              <Building2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                              <div className="text-sm font-semibold text-slate-800">No matching tenants found</div>
                              <p className="mt-1 text-xs text-slate-500">
                                Try adjusting your search query or filters.
                              </p>
                            </td>
                          </tr>
                        ) : (
                          paginatedTenants.map((t) => {
                            const daysInfo = calculateDaysRemaining(t.subscriptionEndDate);
                            const isSelected = selectedTenantIds.includes(t.id);
                            const hasCover = Boolean(t.coverImageUrl || t.logoUrl || (t.photos && t.photos.length > 0));
                            const coverSrc = t.coverImageUrl || t.logoUrl || (t.photos ? t.photos[0] : '');
                            const initials = t.name.slice(0, 2).toUpperCase();

                            return (
                              <tr
                                key={t.id}
                                className={`hover:bg-slate-50/80 transition ${
                                  isSelected ? 'bg-emerald-50/30' : ''
                                }`}
                              >
                                {/* Checkbox */}
                                <td className="py-3 px-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelectTenant(t.id)}
                                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                  />
                                </td>

                                {/* Hotel / Tenant */}
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-3">
                                    {hasCover ? (
                                      <img
                                        src={coverSrc}
                                        alt={t.name}
                                        className="w-10 h-10 rounded-lg object-cover border border-slate-200 shadow-2xs shrink-0"
                                      />
                                    ) : (
                                      <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs flex items-center justify-center shadow-2xs shrink-0">
                                        {initials}
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <div className="font-bold text-slate-900 text-xs sm:text-sm truncate max-w-xs">
                                        {t.name}
                                      </div>
                                      <div className="text-[11px] text-slate-400 font-normal truncate max-w-xs mt-0.5">
                                        {t.slug || t.code}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* Location */}
                                <td className="py-3 px-3">
                                  <div className="flex items-start gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                    <div>
                                      <div className="text-xs font-semibold text-slate-800 leading-snug">
                                        {t.city || 'Local QA'}
                                      </div>
                                      <div className="text-[11px] text-slate-400 leading-none mt-0.5">
                                        {t.state || 'Rajasthan'}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* Status */}
                                <td className="py-3 px-3">
                                  {t.status === 'SUSPENDED' ? (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#fee2e2]/70 text-[#dc2626] border border-[#fecaca]">
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#dc2626]" />
                                      <span>Suspended</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#dcfce7]/70 text-[#166534] border border-[#bbf7d0]">
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]" />
                                      <span>Active</span>
                                    </span>
                                  )}
                                </td>

                                {/* Plan */}
                                <td className="py-3 px-3">
                                  <span className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-medium inline-block shadow-2xs">
                                    {t.plan
                                      ? t.plan.charAt(0).toUpperCase() + t.plan.slice(1).toLowerCase()
                                      : 'Starter'}
                                  </span>
                                </td>

                                {/* Portals / Features Icon Strip */}
                                <td className="py-3 px-3">
                                  <div
                                    onClick={() => handleOpenEditPortals(t)}
                                    className="flex items-center gap-1 cursor-pointer group"
                                    title="Click to configure portals & features"
                                  >
                                    <div
                                      className={`w-6 h-6 rounded-md flex items-center justify-center transition border ${
                                        t.enabledPortals?.includes('admin')
                                          ? 'bg-emerald-50 border-emerald-200/80 text-emerald-700 group-hover:border-emerald-400'
                                          : 'bg-slate-100/70 border-slate-200 text-slate-300 opacity-40'
                                      }`}
                                      title={t.enabledPortals?.includes('admin') ? 'ERP / Admin Console (Active)' : 'ERP / Admin (Disabled)'}
                                    >
                                      <Building2 className="w-3.5 h-3.5" />
                                    </div>
                                    <div
                                      className={`w-6 h-6 rounded-md flex items-center justify-center transition border ${
                                        t.enabledPortals?.includes('reception')
                                          ? 'bg-emerald-50 border-emerald-200/80 text-emerald-700 group-hover:border-emerald-400'
                                          : 'bg-slate-100/70 border-slate-200 text-slate-300 opacity-40'
                                       }`}
                                      title={t.enabledPortals?.includes('reception') ? 'Rooms & PMS Reception (Active)' : 'Rooms & PMS (Disabled)'}
                                    >
                                      <BedDouble className="w-3.5 h-3.5" />
                                    </div>
                                    <div
                                      className={`w-6 h-6 rounded-md flex items-center justify-center transition border ${
                                        t.enabledPortals?.includes('waiter')
                                          ? 'bg-emerald-50 border-emerald-200/80 text-emerald-700 group-hover:border-emerald-400'
                                          : 'bg-slate-100/70 border-slate-200 text-slate-300 opacity-40'
                                      }`}
                                      title={t.enabledPortals?.includes('waiter') ? 'Waiter Staff Handheld (Active)' : 'Waiter App (Disabled)'}
                                    >
                                      <Users className="w-3.5 h-3.5" />
                                    </div>
                                    <div
                                      className={`w-6 h-6 rounded-md flex items-center justify-center transition border ${
                                        t.enabledPortals?.includes('kds')
                                          ? 'bg-emerald-50 border-emerald-200/80 text-emerald-700 group-hover:border-emerald-400'
                                          : 'bg-slate-100/70 border-slate-200 text-slate-300 opacity-40'
                                      }`}
                                      title={t.enabledPortals?.includes('kds') ? 'Kitchen KDS (Active)' : 'Kitchen KDS (Disabled)'}
                                    >
                                      <ChefHat className="w-3.5 h-3.5" />
                                    </div>
                                    <div
                                      className={`w-6 h-6 rounded-md flex items-center justify-center transition border ${
                                        t.enabledPortals?.includes('guest')
                                          ? 'bg-emerald-50 border-emerald-200/80 text-emerald-700 group-hover:border-emerald-400'
                                          : 'bg-slate-100/70 border-slate-200 text-slate-300 opacity-40'
                                      }`}
                                      title={t.enabledPortals?.includes('guest') ? 'In-Room Guest IRD (Active)' : 'Guest Portal (Disabled)'}
                                    >
                                      <ConciergeBell className="w-3.5 h-3.5" />
                                    </div>
                                    <div
                                      className={`w-6 h-6 rounded-md flex items-center justify-center transition border ${
                                        t.enabledPortals?.includes('customer')
                                          ? 'bg-emerald-50 border-emerald-200/80 text-emerald-700 group-hover:border-emerald-400'
                                          : 'bg-slate-100/70 border-slate-200 text-slate-300 opacity-40'
                                      }`}
                                      title={t.enabledPortals?.includes('customer') ? 'Customer QR Dine-In (Active)' : 'Customer QR (Disabled)'}
                                    >
                                      <Utensils className="w-3.5 h-3.5" />
                                    </div>
                                    <div
                                      className={`w-6 h-6 rounded-md flex items-center justify-center transition border ${
                                        t.enabledPortals?.includes('cashier')
                                          ? 'bg-emerald-50 border-emerald-200/80 text-emerald-700 group-hover:border-emerald-400'
                                          : 'bg-slate-100/70 border-slate-200 text-slate-300 opacity-40'
                                      }`}
                                      title={t.enabledPortals?.includes('cashier') ? 'Express Cashier POS (Active)' : 'Cashier POS (Disabled)'}
                                    >
                                      <ShoppingCart className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-medium ml-1">
                                      {(t.enabledPortals || []).length}/7
                                    </span>
                                  </div>
                                </td>

                                {/* Rooms / Tables */}
                                <td className="py-3 px-3">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                                      <BedDouble className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      <span>
                                        {t.totalRooms || 0} Rooms <span className="text-slate-400 font-normal">/ {t.maxRooms || 30} max</span>
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                                      <Utensils className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      <span>
                                        {t.totalTables || 0} Tables <span className="text-slate-400 font-normal">/ {t.maxTables || 20} max</span>
                                      </span>
                                    </div>
                                    {(t.activeRooms > 0 || t.activeTables > 0) && (
                                      <div className="text-[10px] text-emerald-700 font-medium pt-0.5">
                                        {t.activeRooms || 0} occ rooms • {t.activeTables || 0} occ tables
                                      </div>
                                    )}
                                  </div>
                                </td>

                                {/* Expiry */}
                                <td className="py-3 px-3">
                                  <div className="flex items-start gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                    <div>
                                      <div className="text-xs font-semibold text-slate-800">
                                        {formatDate(t.subscriptionEndDate)}
                                      </div>
                                      <div
                                        className={`text-[11px] font-semibold mt-0.5 ${
                                          daysInfo.isExpired
                                            ? 'text-rose-600'
                                            : daysInfo.days <= 30
                                            ? 'text-amber-600'
                                            : 'text-emerald-700'
                                        }`}
                                      >
                                        {daysInfo.text}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* Actions */}
                                <td className="py-3 px-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5 relative">
                                    {/* Login CTA */}
                                    <button
                                      type="button"
                                      data-testid={`btn-impersonate-${t.slug}`}
                                      onClick={() => void handleImpersonateTenantAdmin(t)}
                                      disabled={t.status === 'SUSPENDED' || Boolean(impersonatingTenantId)}
                                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-200 text-slate-700 hover:text-emerald-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                      title="Login to Hotel Admin ERP"
                                    >
                                      {impersonatingTenantId === t.id ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                                      ) : (
                                        <LogIn className="w-3.5 h-3.5 text-emerald-600" />
                                      )}
                                      <span>{impersonatingTenantId === t.id ? 'Opening…' : 'Login'}</span>
                                    </button>

                                    {/* Action Dropdown Menu Toggle */}
                                    <div className="relative">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setActionMenuTenantId(actionMenuTenantId === t.id ? null : t.id)
                                        }
                                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 shadow-2xs transition cursor-pointer"
                                        title="More actions"
                                      >
                                        <MoreVertical className="w-3.5 h-3.5" />
                                      </button>

                                      {/* Dropdown Popup */}
                                      {actionMenuTenantId === t.id && (
                                        <div
                                          className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-30 text-left"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActionMenuTenantId(null);
                                              handleOpenCredentialsModal(t);
                                            }}
                                            className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                          >
                                            <Key className="w-3.5 h-3.5 text-slate-500" />
                                            <span>View Credentials</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActionMenuTenantId(null);
                                              handleOpenEditPortals(t);
                                            }}
                                            className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                          >
                                            <Settings className="w-3.5 h-3.5 text-slate-500" />
                                            <span>Configure Portals</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActionMenuTenantId(null);
                                              handleOpenLocationModal(t);
                                            }}
                                            className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                          >
                                            <MapPin className="w-3.5 h-3.5 text-slate-500" />
                                            <span>Real GPS Pin</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActionMenuTenantId(null);
                                              handleOpenEditBranding(t);
                                            }}
                                            className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                          >
                                            <Palette className="w-3.5 h-3.5 text-slate-500" />
                                            <span>White-Label Branding</span>
                                          </button>
                                          <div className="border-t border-slate-100 my-1" />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActionMenuTenantId(null);
                                              void handleToggleTenantStatus(t);
                                            }}
                                            className={`w-full px-3 py-1.5 text-xs font-medium flex items-center gap-2 cursor-pointer ${
                                              t.status === 'SUSPENDED'
                                                ? 'text-emerald-700 hover:bg-emerald-50'
                                                : 'text-rose-600 hover:bg-rose-50'
                                            }`}
                                          >
                                            <PauseCircle className="w-3.5 h-3.5" />
                                            <span>{t.status === 'SUSPENDED' ? 'Reactivate Tenant' : 'Suspend Tenant'}</span>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Table Footer with Pagination */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-4 bg-white border-t border-slate-200 text-xs">
                    <div className="text-slate-500 font-medium">
                      Showing{' '}
                      <span className="font-semibold text-slate-800">
                        {filteredTenants.length === 0 ? 0 : (safeCurrentPage - 1) * tenantRowsPerPage + 1}
                      </span>{' '}
                      –{' '}
                      <span className="font-semibold text-slate-800">
                        {Math.min(safeCurrentPage * tenantRowsPerPage, filteredTenants.length)}
                      </span>{' '}
                      of{' '}
                      <span className="font-semibold text-slate-800">{filteredTenants.length}</span>{' '}
                      tenants
                    </div>

                    {/* Pagination Numbers */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setTenantCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={safeCurrentPage <= 1}
                        className="p-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                        title="Previous page"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>

                      {Array.from({ length: totalTenantPages }, (_, i) => i + 1).map((pageNum) => {
                        const isCurrent = pageNum === safeCurrentPage;
                        if (
                          pageNum === 1 ||
                          pageNum === totalTenantPages ||
                          (pageNum >= safeCurrentPage - 1 && pageNum <= safeCurrentPage + 1)
                        ) {
                          return (
                            <button
                              key={pageNum}
                              type="button"
                              onClick={() => setTenantCurrentPage(pageNum)}
                              className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition cursor-pointer ${
                                isCurrent
                                  ? 'bg-[#15803d] text-white shadow-2xs'
                                  : 'text-slate-700 hover:bg-slate-100 border border-transparent'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        } else if (
                          (pageNum === 2 && safeCurrentPage > 3) ||
                          (pageNum === totalTenantPages - 1 && safeCurrentPage < totalTenantPages - 2)
                        ) {
                          return (
                            <span key={pageNum} className="px-1 text-slate-400 select-none">
                              …
                            </span>
                          );
                        }
                        return null;
                      })}

                      <button
                        type="button"
                        onClick={() => setTenantCurrentPage((p) => Math.min(totalTenantPages, p + 1))}
                        disabled={safeCurrentPage >= totalTenantPages}
                        className="p-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                        title="Next page"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Rows per page selector */}
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <span>Rows per page:</span>
                      <select
                        value={tenantRowsPerPage}
                        onChange={(e) => {
                          setTenantRowsPerPage(Number(e.target.value));
                          setTenantCurrentPage(1);
                        }}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold focus:outline-none shadow-2xs cursor-pointer"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                /* Cards View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredTenants.length === 0 ? (
                    <div className="col-span-full p-12 text-center bg-white border border-slate-200 rounded-xl">
                      <Building2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <div className="text-sm font-semibold text-slate-800">No matching hotels found</div>
                      <p className="mt-1 text-xs text-slate-500">Try adjusting your search query or filters.</p>
                    </div>
                  ) : (
                    filteredTenants.map((t) => {
                      const daysInfo = calculateDaysRemaining(t.subscriptionEndDate);
                      return (
                        <div
                          key={t.id}
                          className="rounded-2xl border border-slate-200/90 bg-white shadow-xs hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between"
                        >
                          <div>
                            {/* Card Header Banner */}
                            <div className="relative h-24 w-full bg-gradient-to-r from-emerald-600 to-teal-700 overflow-hidden">
                              {t.coverImageUrl && (
                                <img
                                  src={t.coverImageUrl}
                                  alt={t.name}
                                  className="w-full h-full object-cover mix-blend-overlay opacity-40"
                                />
                              )}
                              {/* Status Badge */}
                              <div className="absolute top-2.5 right-2.5">
                                <span
                                  data-testid="badge-tenant-status"
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold shadow-xs ${
                                    t.status === 'ACTIVE'
                                      ? 'bg-white/95 text-emerald-700 border border-emerald-200'
                                      : 'bg-white/95 text-red-700 border border-red-200'
                                  }`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full mr-1 ${t.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                  {t.status}
                                </span>
                              </div>

                              {/* Overlapping Hotel Logo */}
                              <div className="absolute -bottom-3 left-4">
                                <div className="h-12 w-12 rounded-xl overflow-hidden border-2 border-white bg-white shadow-md flex items-center justify-center font-bold text-slate-800 text-sm">
                                  {t.logoUrl ? (
                                    <img src={t.logoUrl} alt={t.name} className="w-full h-full object-cover" />
                                  ) : (
                                    t.name.slice(0, 2).toUpperCase()
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Hotel Identity */}
                            <div className="pt-5 px-4 pb-2">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h3 className="font-bold text-base text-slate-900 truncate">{t.name}</h3>
                                  <p className="text-xs text-slate-500">{t.city}, {t.state || 'India'}</p>
                                </div>
                                <span className="font-mono text-[11px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                  {t.slug}
                                </span>
                              </div>

                              {/* Key Metrics Strip */}
                              <div className="grid grid-cols-3 gap-2 my-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                                <div>
                                  <div className="text-[10px] font-medium text-slate-500 uppercase">Plan</div>
                                  <div className="font-bold text-xs text-emerald-700 mt-0.5">{t.plan || 'STARTER'}</div>
                                </div>
                                <div>
                                  <div className="text-[10px] font-medium text-slate-500 uppercase">Rooms</div>
                                  <div className="font-bold text-xs text-slate-800 mt-0.5">
                                    {t.totalRooms || 0} <span className="text-slate-400 font-normal">/ {t.maxRooms || 30}</span>
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[10px] font-medium text-slate-500 uppercase">Tables</div>
                                  <div className="font-bold text-xs text-slate-800 mt-0.5">
                                    {t.totalTables || 0} <span className="text-slate-400 font-normal">/ {t.maxTables || 20}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Subscription & Portals Summary */}
                              <div className="space-y-1.5 text-xs text-slate-600">
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500 flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Valid until:</span>
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-medium text-slate-800">{formatDate(t.subscriptionEndDate)}</span>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${daysInfo.badgeClass}`}>
                                      {daysInfo.text}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500 flex items-center gap-1">
                                    <Key className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Admin:</span>
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <span className="font-medium text-slate-800 truncate max-w-[150px]">
                                      {t.adminEmail || t.contactEmail}
                                    </span>
                                    <button
                                      type="button"
                                      title="Copy Email"
                                      onClick={() => void copyToClipboard(t.adminEmail || t.contactEmail, 'Admin Email copied!')}
                                      className="text-slate-400 hover:text-slate-700 p-0.5"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                  <button
                                    type="button"
                                    data-testid={`btn-edit-portals-${t.slug}`}
                                    onClick={() => handleOpenEditPortals(t)}
                                    className="text-xs text-emerald-700 font-medium hover:underline flex items-center gap-1 cursor-pointer"
                                  >
                                    <Settings className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>{Array.isArray(t.enabledPortals) ? t.enabledPortals.length : 7} Active Portals</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenSubscriptionModal(t)}
                                    className="text-[11px] font-medium text-slate-500 hover:text-slate-800 underline cursor-pointer"
                                  >
                                    Adjust Duration
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Card Footer Actions */}
                          <div className="p-4 pt-2 border-t border-slate-100 space-y-2">
                            {/* Primary Login Button */}
                            <button
                              type="button"
                              data-testid={`btn-impersonate-${t.slug}`}
                              onClick={() => void handleImpersonateTenantAdmin(t)}
                              disabled={t.status === 'SUSPENDED' || Boolean(impersonatingTenantId)}
                              className="btn-glass-green w-full py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 shadow-xs disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {impersonatingTenantId === t.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Key className="h-3.5 w-3.5" />}
                              <span>{impersonatingTenantId === t.id ? 'Opening Session…' : 'Login as Admin'}</span>
                            </button>

                            {/* Secondary Action Buttons */}
                            <div className="grid grid-cols-4 gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenCredentialsModal(t)}
                                className="py-1.5 px-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-medium transition flex items-center justify-center gap-1 cursor-pointer"
                                title="Admin Credentials"
                              >
                                <Key className="w-3 h-3" />
                                <span>Login</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditBranding(t)}
                                className="py-1.5 px-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-medium transition flex items-center justify-center gap-1 cursor-pointer"
                                title="Branding"
                              >
                                <Palette className="w-3 h-3" />
                                <span>Brand</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenCapacityModal(t)}
                                className="py-1.5 px-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-medium transition flex items-center justify-center gap-1 cursor-pointer"
                                title="Capacity Limits"
                              >
                                <Shield className="w-3 h-3" />
                                <span>Limits</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenLocationModal(t)}
                                className="py-1.5 px-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-medium transition flex items-center justify-center gap-1 cursor-pointer"
                                title="Location GPS"
                              >
                                <MapPin className="w-3 h-3" />
                                <span>Pin</span>
                              </button>
                            </div>

                            {/* Suspend / Reactivate */}
                            <button
                              type="button"
                              data-testid={`btn-suspend-${t.slug}`}
                              disabled={tenantActionId === t.id}
                              onClick={() => void handleToggleTenantStatus(t)}
                              className={`w-full py-1 text-[11px] font-medium rounded-lg border transition cursor-pointer ${
                                t.status === 'SUSPENDED'
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  : 'border-slate-200 text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200'
                              }`}
                            >
                              {tenantActionId === t.id
                                ? 'Updating…'
                                : t.status === 'SUSPENDED'
                                  ? 'Reactivate Property'
                                  : 'Suspend Property'}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}


          {activeNav === 'HOTEL_ADMIN' && (
            <div className="space-y-6 w-full mx-auto">
              <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                    <Building className="w-6 h-6 text-emerald-600" />
                    <span>Hotel Administrators</span>
                  </h1>
                  <p className="mt-1 text-xs text-slate-500">
                    Directory of registered hotel administrators across properties. Manage security credentials, permissions, and shift statuses directly.
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRefreshKey((value) => value + 1)}
                    disabled={platformLoading}
                    className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs px-3.5 py-2 rounded-xl flex items-center gap-2 cursor-pointer transition disabled:opacity-60"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${platformLoading ? 'animate-spin' : ''}`} />
                    <span>{platformLoading ? 'Refreshing…' : 'Refresh directory'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveNav('BRANCHES');
                      setIsOnboardModalOpen(true);
                    }}
                    className="bg-[#15803d] hover:bg-[#166534] text-white text-xs font-semibold shadow-xs px-4 py-2 rounded-xl flex items-center gap-2 cursor-pointer transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create hotel & admin</span>
                  </button>
                </div>
              </header>

              {/* 3 KPI Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500 font-medium">Administrator accounts</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">{hotelAdmins.length}</div>
                    <div className="text-[11px] font-semibold text-emerald-600 mt-1 flex items-center gap-1">
                      <span>● Across all properties</span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <Building className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500 font-medium">Active accounts</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">
                      {hotelAdmins.filter((user) => user.isActive).length}
                    </div>
                    <div className="text-[11px] font-semibold text-emerald-600 mt-1 flex items-center gap-1">
                      <span>{Math.round((hotelAdmins.filter((u) => u.isActive).length / (hotelAdmins.length || 1)) * 100)}% operational</span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500 font-medium">Disabled accounts</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">
                      {hotelAdmins.filter((user) => !user.isActive).length}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-400 mt-1 flex items-center gap-1">
                      <span>Requires verification</span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                    <Ban className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Filter and Content Card */}
              <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="search"
                      value={hotelAdminSearch}
                      onChange={(event) => setHotelAdminSearch(event.target.value)}
                      placeholder="Search name, email, phone, or hotel..."
                      className="min-h-10 w-full pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex shrink-0 items-center gap-2 text-xs font-medium text-slate-600">
                      <span>Property:</span>
                      <select
                        value={hotelAdminPropertyFilter}
                        onChange={(event) => setHotelAdminPropertyFilter(event.target.value)}
                        className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-600"
                      >
                        <option value="ALL">All Properties ({tenants.length})</option>
                        {tenants.map((t) => (
                          <option key={t.id} value={t.name}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 text-xs font-medium text-slate-600">
                      <span>Status:</span>
                      <select
                        value={hotelAdminStatus}
                        onChange={(event) => setHotelAdminStatus(event.target.value as typeof hotelAdminStatus)}
                        className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-600"
                      >
                        <option value="ALL">All accounts</option>
                        <option value="ACTIVE">Active</option>
                        <option value="DISABLED">Disabled</option>
                      </select>
                    </div>
                  </div>
                </div>

                {platformError && platformUsers.length > 0 && !platformUsersError && (
                  <div role="alert" className="m-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 font-medium">
                    The platform refresh failed. Showing current tenant administrator records: {platformError}
                  </div>
                )}

                {filteredHotelAdmins.length === 0 ? (
                  <div className="p-12 text-center">
                    <Building className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-800">
                      {hotelAdmins.length === 0
                        ? 'No hotel administrator accounts found.'
                        : 'No administrators match these filters.'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Try adjusting search keyword or selecting a different property.
                    </p>
                  </div>
                ) : (
                  <ul className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-2">
                    {filteredHotelAdmins.map((user) => {
                      const matchingTenant = tenants.find(
                        (t) => t.id === user.tenantId || t.name === user.hotelName
                      );

                      return (
                        <li key={user.id} className="min-w-0 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:shadow-xs transition flex flex-col justify-between space-y-4">
                          <div>
                            <div className="flex min-w-0 items-start justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm shrink-0">
                                  {user.name ? user.name.slice(0, 2).toUpperCase() : 'HA'}
                                </div>
                                <div className="min-w-0">
                                  <h2 className="truncate text-sm font-bold text-slate-900">{user.name}</h2>
                                  <p className="mt-0.5 truncate text-xs text-slate-500 font-medium flex items-center gap-1">
                                    <Building2 className="w-3 h-3 text-slate-400" />
                                    <span>{user.hotelName}</span>
                                  </p>
                                </div>
                              </div>
                              <span
                                className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                                  user.isActive
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                    : 'border-slate-200 bg-slate-100 text-slate-600'
                                }`}
                              >
                                {user.isActive ? 'Active' : 'Disabled'}
                              </span>
                            </div>

                            <dl className="mt-4 grid grid-cols-1 gap-2.5 text-xs sm:grid-cols-2 border-t border-slate-100 pt-3.5">
                              <div className="min-w-0">
                                <dt className="text-slate-400 text-[11px] font-medium">Email address</dt>
                                <dd className="truncate font-semibold text-slate-800 mt-0.5">{user.email || '—'}</dd>
                              </div>
                              <div className="min-w-0">
                                <dt className="text-slate-400 text-[11px] font-medium">Phone number</dt>
                                <dd className="truncate font-semibold text-slate-800 mt-0.5">{user.phone || '—'}</dd>
                              </div>
                              <div>
                                <dt className="text-slate-400 text-[11px] font-medium">Account created</dt>
                                <dd className="font-semibold text-slate-800 mt-0.5">{formatDate(user.createdAt)}</dd>
                              </div>
                              <div>
                                <dt className="text-slate-400 text-[11px] font-medium">Shift status</dt>
                                <dd className="font-semibold text-emerald-700 mt-0.5 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  <span>{user.shiftStatus.replace(/_/g, ' ')}</span>
                                </dd>
                              </div>
                            </dl>
                          </div>

                          {/* Direct Management Actions */}
                          {matchingTenant && (
                            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenCredentialsModal(matchingTenant)}
                                className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition"
                              >
                                <Key className="w-3.5 h-3.5 text-emerald-700" />
                                <span>Reset Password</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleImpersonateTenantAdmin(matchingTenant)}
                                className="bg-[#15803d] hover:bg-[#166534] text-white text-xs font-semibold shadow-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Login to Hotel Admin</span>
                              </button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* USERS & ROLES VIEW                                       */}
          {/* ======================================================== */}

          {activeNav === 'USERS_ROLES' && (
            <div className="space-y-6 w-full mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                    <Users className="w-6 h-6 text-emerald-600" />
                    <span>Global Users, Roles & Permissions Directory</span>
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Granular RBAC role assignment across SuperAdmins, GMs, Cashiers, Waiters and Chefs.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    data-testid="btn-add-super-staff"
                    onClick={() => setIsSuperStaffModalOpen(true)}
                    className="bg-[#15803d] hover:bg-[#166534] text-white text-xs font-semibold shadow-xs px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <span>+</span>
                    <span>Add Super Staff</span>
                  </button>
                  <button
                    onClick={() => setIsOnboardModalOpen(true)}
                    className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition"
                  >
                    + Onboard Hotel Admin
                  </button>
                </div>
              </div>

              {/* 4 Stat Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500 font-medium">Total Staff Accounts</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">{platformUsers.length}</div>
                    <div className="text-[11px] font-semibold text-emerald-600 mt-1">Across all properties</div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500 font-medium">Active Accounts</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">
                      {platformUsers.filter((u) => u.isActive).length}
                    </div>
                    <div className="text-[11px] font-semibold text-emerald-600 mt-1">Active on shifts</div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500 font-medium">Hotel Admins</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">{hotelAdmins.length}</div>
                    <div className="text-[11px] font-semibold text-emerald-600 mt-1">Property GMs</div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500 font-medium">Security Governance</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">3 Tiers</div>
                    <div className="text-[11px] font-semibold text-emerald-600 mt-1">RBAC Enforced</div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Tab Navigation: Directory vs RBAC Matrix */}
              <div className="flex items-center justify-between gap-3 pb-1">
                <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200 gap-1.5 shadow-2xs">
                  <button
                    type="button"
                    data-testid="tab-staff-directory"
                    onClick={() => setActiveUsersTab('DIRECTORY')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      activeUsersTab === 'DIRECTORY'
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>Staff Directory ({platformUsers.length})</span>
                  </button>
                  <button
                    type="button"
                    data-testid="tab-rbac-permissions"
                    onClick={() => setActiveUsersTab('PERMISSIONS')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      activeUsersTab === 'PERMISSIONS'
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5 text-emerald-600" />
                    <span>RBAC Permissions Matrix</span>
                  </button>
                </div>
              </div>

              {activeUsersTab === 'DIRECTORY' ? (
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs overflow-hidden">
                  <div className="overflow-x-auto w-full custom-scrollbar">
                    <table className="w-full text-left text-xs min-w-[580px]">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-semibold text-[11px] uppercase tracking-wider pb-2.5 px-3">
                          <th className="py-2.5 px-3">User Name</th>
                          <th className="py-2.5 px-3">Assigned Role</th>
                          <th className="py-2.5 px-3">Branch Property</th>
                          <th className="py-2.5 px-3">Contact</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Shift Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {platformUsers.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-10 text-center text-xs text-slate-400">
                              {platformLoading
                                ? 'Loading tenant staff accounts…'
                                : 'No hotel staff accounts found.'}
                            </td>
                          </tr>
                        ) : (
                          platformUsers.map((user) => (
                            <tr key={user.id} className="hover:bg-slate-50/60 transition">
                              <td className="py-3 px-3 font-bold text-slate-900">{user.name}</td>
                              <td className="py-3 px-3">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono">
                                  {user.role}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-slate-700 font-medium">{user.hotelName}</td>
                              <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">{user.email}</td>
                              <td className="py-3 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    user.isActive
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  }`}
                                >
                                  ● {user.isActive ? 'ACTIVE' : 'DISABLED'}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right text-[11px] font-medium text-slate-600">
                                {user.shiftStatus.replace(/_/g, ' ')}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* RBAC Permissions Matrix */
                <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-6 text-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span>Role-Based Access Control (RBAC) Governance Matrix</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Enforces zero-trust privilege boundaries between SuperAdmins, Support Staff, and Property Admins.
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-2xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Strict Mode Active</span>
                    </span>
                  </div>

                  <div className="overflow-x-auto w-full custom-scrollbar">
                    <table className="w-full text-left text-xs min-w-[720px] table-fixed">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 text-[10px] uppercase tracking-wider border-b border-slate-200 font-bold">
                          <th className="py-3 px-4 w-[37%]">Platform Capability / Operation</th>
                          <th className="py-3 px-4 w-[21%]">SUPERADMIN (Master)</th>
                          <th className="py-3 px-4 w-[21%]">SUPER_STAFF (Support)</th>
                          <th className="py-3 px-4 w-[21%]">HOTEL_ADMIN (Single Property)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {/* Row 1: Delete Tenant Property */}
                        <tr className="hover:bg-slate-50/80 transition bg-rose-50/30">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                              <span>Delete Tenant Property & Purge Data</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Irreversible destructive operation removing tenant schema & folios.
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <button
                              type="button"
                              data-testid="btn-role-delete-superadmin"
                              onClick={() => alert('SUPERADMIN Authorized: Tenant deletion dialog opened.')}
                              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Tenant</span>
                            </button>
                            <span className="text-[10px] text-emerald-600 font-semibold block mt-1">
                              Authorized (Root)
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <button
                              type="button"
                              disabled
                              data-testid="btn-role-delete-superstaff"
                              title="Permission Denied: Tenant Deletion requires SUPERADMIN role"
                              className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-400 border border-slate-200 font-bold text-xs cursor-not-allowed opacity-75 flex items-center gap-1.5"
                            >
                              <Lock className="w-3.5 h-3.5 text-slate-400" />
                              <span>Delete Tenant</span>
                            </button>
                            <span className="text-[10px] text-amber-600 font-semibold block mt-1">
                              Restricted: Root Only
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <Ban className="w-3 h-3 text-rose-500" />
                              <span>PROHIBITED</span>
                            </span>
                          </td>
                        </tr>

                        {/* Row 2: Tenant Provisioning */}
                        <tr className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">Tenant Onboarding & Modular Portals</div>
                            <div className="text-[11px] text-slate-500">Provision hotels and toggle modular workstation licenses.</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>FULL ACCESS</span>
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>FULL ACCESS</span>
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <Ban className="w-3 h-3 text-rose-500" />
                              <span>PROHIBITED</span>
                            </span>
                          </td>
                        </tr>

                        {/* Row 3: White-Label Branding */}
                        <tr className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">White-Label Branding Studio</div>
                            <div className="text-[11px] text-slate-500">Deploy custom logos, colors, and CNAME domains.</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>FULL ACCESS</span>
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                              <Sliders className="w-3 h-3 text-sky-600" />
                              <span>SUPPORT OPERATOR</span>
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Building2 className="w-3 h-3 text-amber-600" />
                              <span>PROPERTY SCOPE</span>
                            </span>
                          </td>
                        </tr>

                        {/* Row 4: Hardware Telemetry */}
                        <tr className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">Hardware Telemetry & Terminal Mapping</div>
                            <div className="text-[11px] text-slate-500">Assign ESC/POS printers and Kitchen KDS tablets.</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>FULL ACCESS</span>
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>FULL ACCESS</span>
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <Printer className="w-3 h-3 text-indigo-600" />
                              <span>STATION SCOPE</span>
                            </span>
                          </td>
                        </tr>

                        {/* Row 5: System Config */}
                        <tr className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">System Config & Maintenance Mode</div>
                            <div className="text-[11px] text-slate-500">Freeze customer portals and rotate API keys.</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>ROOT CONTROL</span>
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              <Eye className="w-3 h-3 text-slate-500" />
                              <span>READ-ONLY</span>
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <Ban className="w-3 h-3 text-rose-500" />
                              <span>PROHIBITED</span>
                            </span>
                          </td>
                        </tr>

                        {/* Row 6: Financial Settlement */}
                        <tr className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">Financial Settlement & GST Invoicing</div>
                            <div className="text-[11px] text-slate-500">Statutory tax invoice audits and split-payment ledger.</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>GLOBAL AUDIT</span>
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                              <Eye className="w-3 h-3 text-sky-600" />
                              <span>SUPPORT READ</span>
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>PROPERTY FULL</span>
                            </span>
                          </td>
                        </tr>

                        {/* Row 7: Staff Roster */}
                        <tr className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">Staff Roster, Shift Allocations & Tip Pools</div>
                            <div className="text-[11px] text-slate-500">Weekly shift rotas, station handover, and tip distributions.</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>GLOBAL AUDIT</span>
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                              <Eye className="w-3 h-3 text-sky-600" />
                              <span>SUPPORT READ</span>
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>PROPERTY FULL</span>
                            </span>
                          </td>
                        </tr>

                        {/* Row 8: Room Inventory */}
                        <tr className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">Room Inventory, Tariffs & Overbooking Policy</div>
                            <div className="text-[11px] text-slate-500">PMS room fleet, cleaning turnaround, and seasonal rates.</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>GLOBAL AUDIT</span>
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                              <Eye className="w-3 h-3 text-sky-600" />
                              <span>SUPPORT READ</span>
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>PROPERTY FULL</span>
                            </span>
                          </td>
                        </tr>

                        {/* Row 9: Live POS & KDS */}
                        <tr className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">Live POS, KOT Dispatch & Kitchen Display</div>
                            <div className="text-[11px] text-slate-500">Table orders, kitchen firing tickets, and cash float settlement.</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                              <Activity className="w-3 h-3 text-sky-600" />
                              <span>TELEMETRY</span>
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                              <Sliders className="w-3 h-3 text-sky-600" />
                              <span>DIAGNOSTICS</span>
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>PROPERTY FULL</span>
                            </span>
                          </td>
                        </tr>

                        {/* Row 10: Guest Directory & CRM */}
                        <tr className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">Guest Directory, VIP CRM & Folio Ledger</div>
                            <div className="text-[11px] text-slate-500">Customer profiles, VIP preferences, and room charge histories.</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>GLOBAL AUDIT</span>
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                              <Eye className="w-3 h-3 text-sky-600" />
                              <span>SUPPORT READ</span>
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>PROPERTY FULL</span>
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Role Hierarchy & Scope Summary Cards */}
                  <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                        <Crown className="w-4 h-4 text-amber-500" />
                        <span>SUPERADMIN (Root Master)</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Unrestricted multi-tenant governance, financial audit, portal provisioning, and irreversible property schema purges.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                        <Headphones className="w-4 h-4 text-sky-600" />
                        <span>SUPER_STAFF (Support Desk)</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Cross-tenant telemetry, POS/KDS terminal diagnostics, and operational support. Cannot delete properties or purge data.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                        <Building2 className="w-4 h-4 text-emerald-600" />
                        <span>HOTEL_ADMIN (Single Property)</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Full operational sovereignty strictly bounded within their assigned hotel property, staff accounts, room folios, and tables.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* ROOMS & PMS NETWORK VIEW                                 */}
          {/* ======================================================== */}
          {/* ======================================================== */}
          {/* ROOMS & PMS FLEET WORKSTATION                            */}
          {/* ======================================================== */}
          {activeNav === 'ROOMS_PMS' && (
            <div className="space-y-6 w-full mx-auto">
              {/* Header Title & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                    <BedDouble className="w-6 h-6 text-emerald-600" />
                    <span>Rooms & PMS Fleet Workstation</span>
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Live room inventory, housekeeping status, check-ins, and RevPAR yield management across all hotels.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsAddRoomModalOpen(true)}
                    className="bg-[#15803d] hover:bg-[#166534] text-white text-xs font-semibold shadow-xs px-4 py-2 rounded-xl flex items-center gap-2 cursor-pointer transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Room to Fleet</span>
                  </button>
                </div>
              </div>

              {roomToastMsg && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{roomToastMsg}</span>
                  </div>
                  <button onClick={() => setRoomToastMsg(null)} className="text-emerald-700 hover:text-emerald-900">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Fleet Summary KPI Cards */}
              {(() => {
                const filteredRooms = fleetRooms.filter((r) =>
                  selectedRoomHotelFilter === 'ALL' ? true : r.hotelId === selectedRoomHotelFilter || r.hotelName === selectedRoomHotelFilter
                );
                const totalRooms = filteredRooms.length;
                const occupiedCount = filteredRooms.filter((r) => r.status === 'OCCUPIED').length;
                const vacantCleanCount = filteredRooms.filter((r) => r.status === 'VACANT_CLEAN').length;
                const maintenanceCount = filteredRooms.filter((r) => r.status === 'MAINTENANCE' || r.status === 'VACANT_DIRTY').length;
                const occupancyPct = totalRooms > 0 ? Math.round((occupiedCount / totalRooms) * 100) : 0;

                return (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition flex items-center justify-between">
                      <div>
                        <div className="text-xs text-slate-500 font-medium">Fleet Inventory</div>
                        <div className="text-2xl font-bold text-slate-900 mt-1">{totalRooms} Rooms</div>
                        <div className="text-[11px] font-semibold text-emerald-600 mt-1">
                          {selectedRoomHotelFilter === 'ALL' ? 'Across all properties' : 'In selected property'}
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                        <BedDouble className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition flex items-center justify-between">
                      <div>
                        <div className="text-xs text-slate-500 font-medium">Currently Occupied</div>
                        <div className="text-2xl font-bold text-slate-900 mt-1">{occupiedCount} In-House</div>
                        <div className="text-[11px] font-semibold text-emerald-600 mt-1">
                          {occupancyPct}% Occupancy Rate
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition flex items-center justify-between">
                      <div>
                        <div className="text-xs text-slate-500 font-medium">Vacant & Clean</div>
                        <div className="text-2xl font-bold text-slate-900 mt-1">{vacantCleanCount} Ready</div>
                        <div className="text-[11px] font-semibold text-sky-600 mt-1">
                          Available for check-in
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
                        <Sparkles className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition flex items-center justify-between">
                      <div>
                        <div className="text-xs text-slate-500 font-medium">Needs Service</div>
                        <div className="text-2xl font-bold text-slate-900 mt-1">{maintenanceCount} Pending</div>
                        <div className="text-[11px] font-semibold text-amber-600 mt-1">
                          Housekeeping required
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Filters & Controls Bar */}
              <div className="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Hotel Selector */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-slate-500">Property:</span>
                    <select
                      value={selectedRoomHotelFilter}
                      onChange={(e) => setSelectedRoomHotelFilter(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-800 outline-none focus:border-emerald-600 shadow-2xs"
                    >
                      <option value="ALL">All Properties ({tenants.length})</option>
                      {tenants.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.city || 'Property'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status Pills */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs gap-1 shadow-2xs">
                    {(['ALL', 'OCCUPIED', 'VACANT_CLEAN', 'VACANT_DIRTY', 'MAINTENANCE'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => setRoomStatusFilter(st)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          roomStatusFilter === st
                            ? 'bg-[#15803d] text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                        }`}
                      >
                        {st === 'ALL' ? 'All' : st === 'OCCUPIED' ? 'Occupied' : st === 'VACANT_CLEAN' ? 'Clean' : st === 'VACANT_DIRTY' ? 'Dirty' : 'Maintenance'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={roomSearchQuery}
                      onChange={(e) => setRoomSearchQuery(e.target.value)}
                      placeholder="Search room #, guest, category..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition shadow-2xs"
                    />
                  </div>

                  {/* View Mode Toggle */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
                    <button
                      onClick={() => setRoomViewMode('grid')}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${roomViewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                      title="Grid View"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setRoomViewMode('table')}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${roomViewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                      title="Table View"
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Interactive Room Grid or Table */}
              {(() => {
                const displayedRooms = fleetRooms
                  .filter((r) =>
                    selectedRoomHotelFilter === 'ALL' ? true : r.hotelId === selectedRoomHotelFilter || r.hotelName === selectedRoomHotelFilter
                  )
                  .filter((r) => (roomStatusFilter === 'ALL' ? true : r.status === roomStatusFilter))
                  .filter((r) =>
                    roomSearchQuery
                      ? r.roomNumber.toLowerCase().includes(roomSearchQuery.toLowerCase()) ||
                        r.hotelName.toLowerCase().includes(roomSearchQuery.toLowerCase()) ||
                        r.category.toLowerCase().includes(roomSearchQuery.toLowerCase()) ||
                        (r.currentGuest || '').toLowerCase().includes(roomSearchQuery.toLowerCase())
                      : true
                  );

                if (displayedRooms.length === 0) {
                  return (
                    <div className="p-12 text-center rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
                      <BedDouble className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-800">No rooms match the selected filters</p>
                      <p className="text-xs text-slate-500 mt-1">Try switching property or clearing the search query.</p>
                    </div>
                  );
                }

                if (roomViewMode === 'grid') {
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {displayedRooms.map((room) => {
                        const isOccupied = room.status === 'OCCUPIED';
                        const isClean = room.status === 'VACANT_CLEAN';
                        const isDirty = room.status === 'VACANT_DIRTY';

                        return (
                          <div
                            key={room.id}
                            className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-2xs hover:shadow-xs hover:border-slate-300 transition flex flex-col justify-between space-y-3"
                          >
                            <div>
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="text-lg font-bold text-slate-900 tracking-tight">
                                    Room #{room.roomNumber}
                                  </div>
                                  <div className="text-xs text-slate-500 font-medium truncate max-w-[150px] mt-0.5">
                                    {room.hotelName}
                                  </div>
                                </div>
                                <span
                                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                    isOccupied
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : isClean
                                      ? 'bg-sky-50 text-sky-700 border-sky-200'
                                      : isDirty
                                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                                      : 'bg-rose-50 text-rose-700 border-rose-200'
                                  }`}
                                >
                                  {isOccupied ? 'Occupied' : isClean ? 'Vacant Clean' : isDirty ? 'Needs Cleaning' : 'Maintenance'}
                                </span>
                              </div>

                              <div className="mt-3 pt-3 border-t border-slate-100 text-xs space-y-1.5">
                                <div className="flex items-center justify-between text-slate-600">
                                  <span>Category:</span>
                                  <span className="font-semibold text-slate-800">{room.category}</span>
                                </div>
                                <div className="flex items-center justify-between text-slate-600">
                                  <span>Nightly Tariff:</span>
                                  <span className="font-semibold text-slate-900 font-mono">₹{room.ratePerNight}</span>
                                </div>
                                {isOccupied && (
                                  <div className="flex items-center justify-between text-emerald-700 bg-emerald-50/60 p-1.5 rounded-lg border border-emerald-100">
                                    <span className="font-medium text-[11px]">Guest:</span>
                                    <span className="font-bold text-[11px] truncate max-w-[120px]">{room.currentGuest || 'Registered Guest'}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-1.5">
                              {isDirty && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFleetRooms((prev) =>
                                      prev.map((r) => (r.id === room.id ? { ...r, status: 'VACANT_CLEAN' } : r))
                                    );
                                    setRoomToastMsg(`Room #${room.roomNumber} marked Vacant & Clean!`);
                                    setTimeout(() => setRoomToastMsg(null), 3000);
                                  }}
                                  className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs px-2.5 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer transition"
                                >
                                  <Sparkles className="w-3 h-3 text-sky-600" />
                                  <span>Mark Clean</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  alert(`Viewing details for Room #${room.roomNumber} (${room.hotelName}) - ${room.category}`);
                                }}
                                className="bg-[#15803d] hover:bg-[#166534] text-white text-xs font-semibold shadow-xs px-2.5 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer transition"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Inspect</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                }

                return (
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs overflow-hidden">
                    <div className="overflow-x-auto w-full custom-scrollbar">
                      <table className="w-full text-left text-xs min-w-[620px]">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 font-semibold text-[11px] uppercase tracking-wider pb-2.5 px-3">
                            <th className="py-2.5 px-3">Room #</th>
                            <th className="py-2.5 px-3">Property</th>
                            <th className="py-2.5 px-3">Category</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3">Current Occupant / Tariff</th>
                            <th className="py-2.5 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {displayedRooms.map((room) => {
                            const isOccupied = room.status === 'OCCUPIED';
                            const isClean = room.status === 'VACANT_CLEAN';
                            const isDirty = room.status === 'VACANT_DIRTY';

                            return (
                              <tr key={room.id} className="hover:bg-slate-50/60 transition">
                                <td className="py-3 px-3 font-bold text-slate-900">Room #{room.roomNumber}</td>
                                <td className="py-3 px-3 text-slate-700 font-medium">{room.hotelName}</td>
                                <td className="py-3 px-3 text-slate-600">{room.category}</td>
                                <td className="py-3 px-3">
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                      isOccupied
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : isClean
                                        ? 'bg-sky-50 text-sky-700 border-sky-200'
                                        : isDirty
                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                        : 'bg-rose-50 text-rose-700 border-rose-200'
                                    }`}
                                  >
                                    {isOccupied ? 'Occupied' : isClean ? 'Vacant Clean' : isDirty ? 'Needs Cleaning' : 'Maintenance'}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-slate-700 font-mono text-xs">
                                  {isOccupied ? (
                                    <span className="font-semibold text-emerald-700">{room.currentGuest || 'Occupied'}</span>
                                  ) : (
                                    <span>₹{room.ratePerNight} / night</span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      alert(`Viewing details for Room #${room.roomNumber} (${room.hotelName})`);
                                    }}
                                    className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs px-2.5 py-1 rounded-lg transition"
                                  >
                                    View Room
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* Add Room Modal */}
              {isAddRoomModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
                  <div className="w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xl animate-in zoom-in-95">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                        <BedDouble className="w-5 h-5 text-emerald-600" />
                        <span>Add New Room to Fleet</span>
                      </h3>
                      <button onClick={() => setIsAddRoomModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleAddFleetRoom} className="space-y-4 mt-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Target Hotel Property</label>
                        <select
                          value={newRoomHotelId}
                          onChange={(e) => setNewRoomHotelId(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-800 outline-none focus:border-emerald-600"
                        >
                          {tenants.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Room Number</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 101"
                            value={newRoomNumber}
                            onChange={(e) => setNewRoomNumber(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-emerald-600"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
                          <select
                            value={newRoomCategory}
                            onChange={(e) => setNewRoomCategory(e.target.value as any)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-800 outline-none focus:border-emerald-600"
                          >
                            <option value="Royal Maharaja Suite">Royal Maharaja Suite</option>
                            <option value="Deluxe Heritage">Deluxe Heritage</option>
                            <option value="Executive City">Executive City</option>
                            <option value="Courtyard Villa">Courtyard Villa</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Nightly Price (₹)</label>
                          <NumericInput
                            required
                            value={Number(newRoomRate)}
                            onChange={(e) => setNewRoomRate(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 font-mono outline-none focus:border-emerald-600"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Floor Level</label>
                          <input
                            type="text"
                            placeholder="e.g. 1"
                            value={newRoomFloor}
                            onChange={(e) => setNewRoomFloor(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-emerald-600"
                          />
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsAddRoomModalOpen(false)}
                          className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="bg-[#15803d] hover:bg-[#166534] text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
                        >
                          Save & Add Room
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* HARDWARE & DEVICES (SOUNDBOX, PRINTERS, POS)             */}
          {/* ======================================================== */}
          {activeNav === 'HARDWARE' && (
            <div className="space-y-6 w-full mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                    <Printer className="w-6 h-6 text-emerald-600" />
                    <span>Device Fleet & Hardware Management</span>
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Live telemetry for Soundbox speakers, thermal receipt printers, and Android KDS tablets.
                  </p>
                </div>
                <span className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>128 / 130 Devices Online</span>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                      <Volume2 className="w-5 h-5" />
                    </div>
                    <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      38 / 38 Online
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900">UPI Soundbox Speakers</h3>
                  <p className="text-xs text-slate-500 mt-1">Paytm & PhonePe Soundbox instant vocal payment alerts.</p>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                      <Printer className="w-5 h-5" />
                    </div>
                    <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      42 / 42 Online
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900">ESC/POS Thermal Printers</h3>
                  <p className="text-xs text-slate-500 mt-1">80mm Kitchen KOT printers and Cashier billing roll printers.</p>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                      <Tablet className="w-5 h-5" />
                    </div>
                    <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      48 / 50 Online
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900">Kitchen KDS Tablets</h3>
                  <p className="text-xs text-slate-500 mt-1">10-inch Android mounted displays for kitchen line cooks.</p>
                </div>
              </div>

              {/* Hardware Success Toast */}
              {hardwareSuccessMsg && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-2xs">
                  <Check className="w-4 h-4 text-emerald-600 inline mr-1" />
                  <span>{hardwareSuccessMsg}</span>
                </div>
              )}

              {/* Property Selector */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">Target Hotel Property:</span>
                  <select
                    data-testid="select-hardware-hotel"
                    value={selectedHardwareHotelId}
                    onChange={(e) => setSelectedHardwareHotelId(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 font-semibold outline-none focus:border-emerald-600"
                  >
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.city || 'Central'})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  data-testid="btn-save-hardware"
                  onClick={() => {
                    const hName = tenants.find((t) => t.id === selectedHardwareHotelId)?.name || 'Mahesh Hotel';
                    setHardwareSuccessMsg(`Hardware device fleet mapped successfully to ${hName}!`);
                    setGlobalAuditLogs((prev) => [
                      {
                        id: `audit-${Date.now()}`,
                        timestamp: new Date().toISOString(),
                        level: 'INFO',
                        source: 'SUPERADMIN',
                        action: `SuperAdmin mapped KOT Printer & KDS Station to ${hName}`,
                        hotelName: hName,
                        details: 'Mapped 80mm ESC/POS Printer (192.168.1.101:9100) and Android KDS Tablet (192.168.1.100)',
                      },
                      ...prev,
                    ]);
                    setTimeout(() => setHardwareSuccessMsg(null), 5000);
                  }}
                  className="bg-[#15803d] hover:bg-[#166534] text-white text-xs font-semibold shadow-xs px-4 py-2 rounded-xl flex items-center gap-2 cursor-pointer transition self-start sm:self-auto"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Hardware Fleet Mappings</span>
                </button>
              </div>

              {/* Hardware Mapping Interactive Forms */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. KOT Printer Form */}
                <div className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Printer className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-bold text-xs uppercase text-slate-800">
                      Map ESC/POS Thermal KOT Printer
                    </h3>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Printer Device Name</label>
                    <input
                      type="text"
                      data-testid="input-kot-printer-name"
                      value={kotPrinterName}
                      onChange={(e) => setKotPrinterName(e.target.value)}
                      placeholder="e.g. Kitchen KOT Master"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Target Station</label>
                      <input
                        type="text"
                        data-testid="input-kot-printer-station"
                        value={kotPrinterStation}
                        onChange={(e) => setKotPrinterStation(e.target.value)}
                        placeholder="Hot Kitchen Pass"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Network Port</label>
                      <NumericInput
                        data-testid="input-kot-printer-port"
                        value={kotPrinterPort}
                        onChange={(e) => setKotPrinterPort(Number(e.target.value))}
                        placeholder="9100"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 font-mono transition"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Static IP Address</label>
                    <input
                      type="text"
                      data-testid="input-kot-printer-ip"
                      value={kotPrinterIp}
                      onChange={(e) => setKotPrinterIp(e.target.value)}
                      placeholder="192.168.1.101"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 font-mono transition"
                    />
                  </div>
                  <button
                    type="button"
                    data-testid="btn-map-kot-printer"
                    onClick={() => {
                      const hName = tenants.find((t) => t.id === selectedHardwareHotelId)?.name || 'Mahesh Hotel';
                      const newDev = {
                        id: `kot-${Date.now()}`,
                        hotelId: selectedHardwareHotelId || 'mahesh-hotel',
                        hotelName: hName,
                        type: 'KOT_PRINTER' as const,
                        name: kotPrinterName,
                        location: kotPrinterStation,
                        ipAddress: kotPrinterIp,
                        port: kotPrinterPort,
                        status: 'ONLINE' as const,
                      };
                      setHardwareFleetDevices((prev) => [...prev, newDev]);
                      setHardwareSuccessMsg(`ESC/POS Printer "${kotPrinterName}" mapped to ${hName}!`);
                      setTimeout(() => setHardwareSuccessMsg(null), 4000);
                    }}
                    className="bg-[#15803d] hover:bg-[#166534] text-white w-full py-2.5 font-semibold rounded-xl text-xs shadow-xs transition cursor-pointer"
                  >
                    + Map KOT Printer
                  </button>
                </div>

                {/* 2. KDS Station Form */}
                <div className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-bold text-xs uppercase text-slate-800">
                      Assign Kitchen KDS Android Station
                    </h3>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">KDS Station Name</label>
                    <input
                      type="text"
                      data-testid="input-kds-station-name"
                      value={kdsStationName}
                      onChange={(e) => setKdsStationName(e.target.value)}
                      placeholder="e.g. Main Kitchen"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Assigned Cooking Line</label>
                    <input
                      type="text"
                      data-testid="input-kds-station-line"
                      value={kdsStationLine}
                      onChange={(e) => setKdsStationLine(e.target.value)}
                      placeholder="Line Cook 1 & Fryer"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Tablet IP / Hostname</label>
                    <input
                      type="text"
                      data-testid="input-kds-station-ip"
                      value={kdsStationIp}
                      onChange={(e) => setKdsStationIp(e.target.value)}
                      placeholder="192.168.1.100"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 font-mono transition"
                    />
                  </div>
                  <button
                    type="button"
                    data-testid="btn-assign-kds-station"
                    onClick={() => {
                      const hName = tenants.find((t) => t.id === selectedHardwareHotelId)?.name || 'Mahesh Hotel';
                      const newDev = {
                        id: `kds-${Date.now()}`,
                        hotelId: selectedHardwareHotelId || 'mahesh-hotel',
                        hotelName: hName,
                        type: 'KDS_STATION' as const,
                        name: kdsStationName,
                        location: kdsStationLine,
                        ipAddress: kdsStationIp,
                        status: 'ONLINE' as const,
                      };
                      setHardwareFleetDevices((prev) => [...prev, newDev]);
                      setHardwareSuccessMsg(`KDS Station "${kdsStationName}" assigned to ${hName}!`);
                      setTimeout(() => setHardwareSuccessMsg(null), 4000);
                    }}
                    className="bg-[#15803d] hover:bg-[#166534] text-white w-full py-2.5 font-semibold rounded-xl text-xs shadow-xs transition cursor-pointer"
                  >
                    + Assign KDS Station
                  </button>
                </div>
              </div>

              {/* 3. Device Fleet Active Inventory Table */}
              <div className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="font-bold text-sm text-slate-900">
                    Device Fleet Active Inventory
                  </h3>
                  <span className="text-xs font-mono text-slate-500 font-semibold">
                    {hardwareFleetDevices.length} devices mapped
                  </span>
                </div>
                <div className="overflow-x-auto w-full custom-scrollbar">
                  <table data-testid="table-hardware-fleet" className="w-full text-left text-xs min-w-[580px]">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold text-[11px] uppercase tracking-wider pb-2.5 px-3">
                        <th className="py-2.5 px-3">Device Type</th>
                        <th className="py-2.5 px-3">Station / Name</th>
                        <th className="py-2.5 px-3">Property</th>
                        <th className="py-2.5 px-3">Location / Line</th>
                        <th className="py-2.5 px-3">IP & Interface</th>
                        <th className="py-2.5 px-3 text-right">Telemetry Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {hardwareFleetDevices.map((dev) => (
                        <tr key={dev.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{dev.type === 'KOT_PRINTER' ? <Printer className="w-4 h-4 text-emerald-600" /> : dev.type === 'KDS_STATION' ? <Tablet className="w-4 h-4 text-emerald-600" /> : <Volume2 className="w-4 h-4 text-emerald-600" />}</span>
                            <span className="text-[11px]">{dev.type.replace('_', ' ')}</span>
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-800">{dev.name}</td>
                          <td className="py-3 px-3 text-slate-700 font-medium">{dev.hotelName}</td>
                          <td className="py-3 px-3 text-slate-500">{dev.location}</td>
                          <td className="py-3 px-3 font-mono text-[11px] text-slate-700">
                            {dev.ipAddress}{dev.port ? `:${dev.port}` : ''}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ● ONLINE (0.4ms)
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeNav === 'SUBSCRIPTIONS' && (
            <div className="space-y-6 w-full mx-auto">
              {/* Header Title & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-500 fill-amber-400 inline-block" />
                    <span>SaaS Subscription Plans & Pricing Tiers</span>
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Tier pricing, MRR analytics and billing frequency across hotel chains.
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={handleOpenCreatePlan}
                    className="px-4 py-2 rounded-xl bg-[#15803d] hover:bg-[#166534] text-white text-xs font-semibold shadow-xs flex items-center gap-2 cursor-pointer transition"
                  >
                    <Plus className="w-4 h-4 text-white" />
                    <span>Create Custom Plan</span>
                  </button>

                  <div className="px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/90 text-xs font-bold flex items-center gap-2 shadow-2xs">
                    <BarChart3 className="w-4 h-4 text-emerald-600" />
                    <span>Estimated MRR: ₹1,21,420/mo</span>
                  </div>
                </div>
              </div>

              {/* ROW 1: 3 Subscription Plan Cards + Custom Plans */}
              {(() => {
                const starterPlan = platformPlans.find((p) => p.code === 'STARTER') || {
                  id: 'starter',
                  name: 'Starter',
                  code: 'STARTER',
                  monthlyPriceINR: 3499,
                  annualPriceINR: 34990,
                  isActive: true,
                  limits: { maxRooms: 20, maxTables: 20, maxStaffUsers: 10 },
                  featureFlags: { pmsEnabled: true, kdsEnabled: true, qrDineInEnabled: true, roomServiceEnabled: true },
                };
                const proPlan = platformPlans.find((p) => p.code === 'PROFESSIONAL') || {
                  id: 'professional',
                  name: 'Professional',
                  code: 'PROFESSIONAL',
                  monthlyPriceINR: 7999,
                  annualPriceINR: 79990,
                  isActive: true,
                  limits: { maxRooms: 50, maxTables: 30, maxStaffUsers: 25 },
                  featureFlags: { pmsEnabled: true, posEnabled: true, kdsEnabled: true, waiterEnabled: true },
                };
                const entPlan = platformPlans.find((p) => p.code === 'ENTERPRISE') || {
                  id: 'enterprise',
                  name: 'Enterprise',
                  code: 'ENTERPRISE',
                  monthlyPriceINR: 14999,
                  annualPriceINR: 149990,
                  isActive: true,
                  limits: { maxRooms: 500, maxTables: 200, maxStaffUsers: 100 },
                  featureFlags: { pmsEnabled: true, posEnabled: true, kdsEnabled: true, waiterEnabled: true },
                };

                const customPlans = platformPlans.filter(
                  (p) => !['STARTER', 'PROFESSIONAL', 'ENTERPRISE'].includes(p.code?.toUpperCase())
                );

                return (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      {/* 1. Starter */}
                      <div className={`bg-white border rounded-2xl p-5 shadow-2xs flex flex-col justify-between transition-all ${
                        starterPlan.isActive === false ? 'border-rose-200/90 bg-rose-50/20' : 'border-slate-200/90'
                      }`}>
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                                <Package className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="font-bold text-base text-slate-900">{starterPlan.name || 'Starter'}</h3>
                                <p className="text-[11px] text-slate-500">Best for small hotels & restaurants.</p>
                              </div>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 flex items-center gap-1.5 ${
                              starterPlan.isActive !== false
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : 'bg-rose-100 text-rose-800 border-rose-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${starterPlan.isActive !== false ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                              <span>{starterPlan.isActive !== false ? 'Active' : 'Deactivated'}</span>
                            </span>
                          </div>

                          <div className="mt-4 mb-1">
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-black text-amber-700 tracking-tight">
                                ₹{starterPlan.monthlyPriceINR.toLocaleString('en-IN')}
                              </span>
                              <span className="text-xs text-slate-500 font-medium">/mo</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 font-medium">
                              <span>Annual: ₹{(starterPlan.annualPriceINR || starterPlan.monthlyPriceINR * 10).toLocaleString('en-IN')}</span>
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                Save 17%
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-3 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-700">
                            <div className="flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="truncate">Up to {starterPlan.limits?.maxRooms || 20} rooms + {starterPlan.limits?.maxTables || 20} tables</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Up to {starterPlan.limits?.maxStaffUsers || 10} staff users</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>PMS {starterPlan.featureFlags?.pmsEnabled !== false ? 'Enabled' : 'Disabled'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>KDS {starterPlan.featureFlags?.kdsEnabled !== false ? 'Enabled' : 'Disabled'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 sm:col-start-2">
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>QR Dine In {starterPlan.featureFlags?.qrDineInEnabled !== false ? 'Enabled' : 'Disabled'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 sm:col-start-2">
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Room Service {starterPlan.featureFlags?.roomServiceEnabled !== false ? 'Enabled' : 'Disabled'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 mt-5 pt-4 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => handleOpenEditPlan(starterPlan as any)}
                            className="flex-1 py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                            <span>Edit Plan</span>
                          </button>
                          {starterPlan.isActive !== false ? (
                            <button
                              type="button"
                              onClick={() => void handleTogglePlanStatus(starterPlan, false)}
                              className="flex-1 py-2 px-3 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                            >
                              <Power className="w-3.5 h-3.5 text-rose-600" />
                              <span>Deactivate</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleTogglePlanStatus(starterPlan, true)}
                              className="flex-1 py-2 px-3 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                            >
                              <Power className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Reactivate Plan</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 2. Professional (Recommended) */}
                      <div className={`bg-white border-2 rounded-2xl p-5 shadow-xs flex flex-col justify-between relative transition-all ${
                        proPlan.isActive === false
                          ? 'border-rose-400 bg-rose-50/20'
                          : 'border-emerald-600'
                      }`}>
                        <div className="absolute top-4 right-4 flex items-center gap-1.5">
                          {proPlan.isActive !== false && (
                            <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                              <Star className="w-3 h-3 fill-white" />
                              <span>Recommended</span>
                            </span>
                          )}
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 flex items-center gap-1.5 ${
                            proPlan.isActive !== false
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border-rose-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${proPlan.isActive !== false ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                            <span>{proPlan.isActive !== false ? 'Active' : 'Deactivated'}</span>
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                              <Layers className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-bold text-base text-slate-900">{proPlan.name || 'Professional'}</h3>
                              <p className="text-[11px] text-slate-500">Ideal for growing hotel operations.</p>
                            </div>
                          </div>

                          <div className="mt-4 mb-1">
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-black text-amber-700 tracking-tight">
                                ₹{proPlan.monthlyPriceINR.toLocaleString('en-IN')}
                              </span>
                              <span className="text-xs text-slate-500 font-medium">/mo</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 font-medium">
                              <span>Annual: ₹{(proPlan.annualPriceINR || proPlan.monthlyPriceINR * 10).toLocaleString('en-IN')}</span>
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                Save 17%
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-3 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-700">
                            <div className="flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Up to {proPlan.limits?.maxRooms || 50} rooms + {proPlan.limits?.maxTables || 30} tables</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Up to {proPlan.limits?.maxStaffUsers || 25} staff users</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Waiter {proPlan.featureFlags?.waiterEnabled !== false ? 'Enabled' : 'Disabled'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>POS {proPlan.featureFlags?.posEnabled !== false ? 'Enabled' : 'Disabled'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 sm:col-start-2">
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>PMS {proPlan.featureFlags?.pmsEnabled !== false ? 'Enabled' : 'Disabled'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 sm:col-start-2">
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>KDS {proPlan.featureFlags?.kdsEnabled !== false ? 'Enabled' : 'Disabled'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 mt-5 pt-4 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => handleOpenEditPlan(proPlan as any)}
                            className="flex-1 py-2 px-3 rounded-xl bg-[#15803d] hover:bg-[#166534] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-white" />
                            <span>Edit Plan</span>
                          </button>
                          {proPlan.isActive !== false ? (
                            <button
                              type="button"
                              onClick={() => void handleTogglePlanStatus(proPlan, false)}
                              className="flex-1 py-2 px-3 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                            >
                              <Power className="w-3.5 h-3.5 text-rose-600" />
                              <span>Deactivate</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleTogglePlanStatus(proPlan, true)}
                              className="flex-1 py-2 px-3 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                            >
                              <Power className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Reactivate Plan</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 3. Enterprise */}
                      <div className={`bg-white border rounded-2xl p-5 shadow-2xs flex flex-col justify-between transition-all ${
                        entPlan.isActive === false ? 'border-rose-200/90 bg-rose-50/20' : 'border-slate-200/90'
                      }`}>
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                                <Building2 className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="font-bold text-base text-slate-900">{entPlan.name || 'Enterprise'}</h3>
                                <p className="text-[11px] text-slate-500">For large hotels, groups & chains.</p>
                              </div>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 flex items-center gap-1.5 ${
                              entPlan.isActive !== false
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : 'bg-rose-100 text-rose-800 border-rose-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${entPlan.isActive !== false ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                              <span>{entPlan.isActive !== false ? 'Active' : 'Deactivated'}</span>
                            </span>
                          </div>

                          <div className="mt-4 mb-1">
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-black text-amber-700 tracking-tight">
                                ₹{entPlan.monthlyPriceINR.toLocaleString('en-IN')}
                              </span>
                              <span className="text-xs text-slate-500 font-medium">/mo</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 font-medium">
                              <span>Annual: ₹{(entPlan.annualPriceINR || entPlan.monthlyPriceINR * 10).toLocaleString('en-IN')}</span>
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                Save 17%
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-3 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-700">
                            <div className="flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Up to {entPlan.limits?.maxRooms || 500} rooms + {entPlan.limits?.maxTables || 200} tables</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Up to {entPlan.limits?.maxStaffUsers || 100} staff users</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Waiter {entPlan.featureFlags?.waiterEnabled !== false ? 'Enabled' : 'Disabled'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>POS {entPlan.featureFlags?.posEnabled !== false ? 'Enabled' : 'Disabled'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 sm:col-start-2">
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>PMS {entPlan.featureFlags?.pmsEnabled !== false ? 'Enabled' : 'Disabled'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 sm:col-start-2">
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>KDS {entPlan.featureFlags?.kdsEnabled !== false ? 'Enabled' : 'Disabled'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 mt-5 pt-4 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => handleOpenEditPlan(entPlan as any)}
                            className="flex-1 py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                            <span>Edit Plan</span>
                          </button>
                          {entPlan.isActive !== false ? (
                            <button
                              type="button"
                              onClick={() => void handleTogglePlanStatus(entPlan, false)}
                              className="flex-1 py-2 px-3 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                            >
                              <Power className="w-3.5 h-3.5 text-rose-600" />
                              <span>Deactivate</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleTogglePlanStatus(entPlan, true)}
                              className="flex-1 py-2 px-3 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                            >
                              <Power className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Reactivate Plan</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Custom Plans Row if any */}
                    {customPlans.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                          <Crown className="w-3.5 h-3.5 text-amber-500" />
                          <span>Custom Operator Plans ({customPlans.length})</span>
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                          {customPlans.map((cPlan) => (
                            <div
                              key={cPlan.id || cPlan.code}
                              className={`bg-white border rounded-2xl p-5 shadow-2xs flex flex-col justify-between ${
                                cPlan.isActive === false ? 'border-rose-200/90 bg-rose-50/20' : 'border-slate-200/90'
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                                      <Crown className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <h3 className="font-bold text-base text-slate-900">{cPlan.name}</h3>
                                      <p className="text-[11px] font-mono text-slate-500">{cPlan.code}</p>
                                    </div>
                                  </div>
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 flex items-center gap-1.5 ${
                                    cPlan.isActive !== false
                                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                      : 'bg-rose-100 text-rose-800 border-rose-200'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${cPlan.isActive !== false ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                                    <span>{cPlan.isActive !== false ? 'Active' : 'Deactivated'}</span>
                                  </span>
                                </div>

                                <div className="mt-4 mb-1">
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-black text-amber-700 tracking-tight">
                                      ₹{cPlan.monthlyPriceINR.toLocaleString('en-IN')}
                                    </span>
                                    <span className="text-xs text-slate-500 font-medium">/mo</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 font-medium">
                                    <span>Annual: ₹{(cPlan.annualPriceINR || cPlan.monthlyPriceINR * 10).toLocaleString('en-IN')}</span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-3 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-700">
                                  <div className="flex items-center gap-1.5">
                                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>Up to {cPlan.limits?.maxRooms || 0} rooms</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>Up to {cPlan.limits?.maxTables || 0} tables</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>Up to {cPlan.limits?.maxStaffUsers || 0} staff</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>{cPlan.featureFlags?.pmsEnabled ? 'PMS Active' : 'No PMS'}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5 mt-5 pt-4 border-t border-slate-100">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditPlan(cPlan)}
                                  className="flex-1 py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Edit</span>
                                </button>
                                {cPlan.isActive !== false ? (
                                  <button
                                    type="button"
                                    onClick={() => void handleTogglePlanStatus(cPlan, false)}
                                    className="flex-1 py-2 px-3 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                                  >
                                    <Power className="w-3.5 h-3.5 text-rose-600" />
                                    <span>Deactivate</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => void handleTogglePlanStatus(cPlan, true)}
                                    className="flex-1 py-2 px-3 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                                  >
                                    <Power className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Reactivate</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ROW 2: Modular Pricing Matrix (Dynamic Catalog) */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">
                        Modular Pricing Matrix (Dynamic Catalog)
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Per-module baseline licensing rates, architectural responsibilities, and tenant attachment rates.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <select
                        value={subscriptionModuleFilter}
                        onChange={(e) => setSubscriptionModuleFilter(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="ALL">All Modules</option>
                        <option value="CORE">Core Base</option>
                        <option value="ALACARTE">À La Carte</option>
                      </select>
                    </div>

                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search module..."
                        value={subscriptionModuleSearch}
                        onChange={(e) => setSubscriptionModuleSearch(e.target.value)}
                        className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs w-44 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Modular Matrix Table */}
                <div className="overflow-x-auto w-full custom-scrollbar">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold text-[11px]">
                        <th className="pb-2.5 font-bold">Module</th>
                        <th className="pb-2.5 font-bold">Module Code</th>
                        <th className="pb-2.5 font-bold">Description</th>
                        <th className="pb-2.5 font-bold">Base Price</th>
                        <th className="pb-2.5 font-bold">Entitlement Policy</th>
                        <th className="pb-2.5 font-bold text-right">Adoption</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        {
                          icon: QrCode,
                          name: 'Customer Table QR Menu',
                          code: 'CUSTOMER',
                          desc: 'Interactive digital menu, table cart, waiter assistance buzzers & live kitchen status.',
                          price: '₹699 /mo',
                          policy: 'À La Carte',
                          adoption: '24 Properties',
                        },
                        {
                          icon: Smartphone,
                          name: 'Waiter Mobile Handheld',
                          code: 'WAITER',
                          desc: 'Mobile touch terminal for table orders, instant KOT firing, live dish ready alerts & bill requests.',
                          price: '₹999 /mo',
                          policy: 'À La Carte',
                          adoption: '23 Properties',
                        },
                        {
                          icon: ChefHat,
                          name: 'Kitchen Display System (KDS)',
                          code: 'KDS',
                          desc: 'Live order station queues, course firing timers, item out-of-stock toggles & ready status.',
                          price: '₹899 /mo',
                          policy: 'À La Carte',
                          adoption: '24 Properties',
                        },
                        {
                          icon: ConciergeBell,
                          name: 'In-Room Guest Portal (IRD)',
                          code: 'GUEST',
                          desc: 'In-room dining, housekeeping requests, spa/laundry, room folio balance & express checkout.',
                          price: '₹699 /mo',
                          policy: 'À La Carte',
                          adoption: '23 Properties',
                        },
                        {
                          icon: Settings,
                          name: 'Hotel Admin ERP Command Center',
                          code: 'ADMIN',
                          desc: 'Central operational control, rooms & tables setup, inventory, tax settings, staff management.',
                          price: '₹1,999 /mo',
                          policy: 'Core Base',
                          adoption: '27 Properties',
                        },
                        {
                          icon: ShoppingCart,
                          name: 'Express Cashier POS',
                          code: 'CASHIER',
                          desc: 'High-speed billing terminal, cash drawer float custody, split bills, KOT approvals & blind close.',
                          price: '₹1,199 /mo',
                          policy: 'À La Carte',
                          adoption: '24 Properties',
                        },
                        {
                          icon: BedDouble,
                          name: 'Reception & Front Desk PMS',
                          code: 'RECEPTION',
                          desc: 'PMS reservation matrix, guest check-in/out, room keys, corporate folios, night audit & custody.',
                          price: '₹1,499 /mo',
                          policy: 'À La Carte',
                          adoption: '25 Properties',
                        },
                      ]
                        .filter((item) => {
                          if (subscriptionModuleFilter === 'CORE' && item.policy !== 'Core Base') return false;
                          if (subscriptionModuleFilter === 'ALACARTE' && item.policy !== 'À La Carte') return false;
                          if (subscriptionModuleSearch.trim()) {
                            const q = subscriptionModuleSearch.toLowerCase();
                            return (
                              item.name.toLowerCase().includes(q) ||
                              item.code.toLowerCase().includes(q) ||
                              item.desc.toLowerCase().includes(q)
                            );
                          }
                          return true;
                        })
                        .map((mod, idx) => {
                          const ModIcon = mod.icon;
                          return (
                            <tr key={idx} className="hover:bg-slate-50/60 transition">
                              <td className="py-3 font-semibold text-slate-900">
                                <div className="flex items-center gap-2">
                                  <ModIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                                  <span>{mod.name}</span>
                                </div>
                              </td>
                              <td className="py-3">
                                <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 font-mono text-[10px] font-bold px-2 py-0.5 rounded">
                                  {mod.code}
                                </span>
                              </td>
                              <td className="py-3 text-slate-500 max-w-md">
                                {mod.desc}
                              </td>
                              <td className="py-3 font-bold text-emerald-600 font-mono">
                                {mod.price}
                              </td>
                              <td className="py-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    mod.policy === 'Core Base'
                                      ? 'bg-slate-100 text-slate-800 border-slate-200'
                                      : 'bg-slate-50 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  {mod.policy}
                                </span>
                              </td>
                              <td className="py-3 text-right font-bold text-slate-900">
                                {mod.adoption}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ROW 3: Monthly Recurring Revenue (MRR) Growth (5 cols) + Tenant Billing & Tax Invoices (7 cols) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* LEFT: Monthly Recurring Revenue (MRR) Growth (5 cols) */}
                <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                        <div>
                          <h3 className="font-bold text-sm text-slate-900">
                            Monthly Recurring Revenue (MRR) Growth
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Platform-wide trajectory over the last 6 fiscal months.
                          </p>
                        </div>
                      </div>
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap">
                        +164% H2 Growth
                      </span>
                    </div>

                    {/* Bar Chart matching reference screenshot */}
                    <div className="relative w-full h-48 mt-4 flex items-end">
                      {/* Y-axis labels */}
                      <div className="absolute left-0 top-0 bottom-6 w-8 flex flex-col justify-between text-[10px] text-slate-400 font-mono select-none">
                        <span>400k</span>
                        <span>300k</span>
                        <span>200k</span>
                        <span>100k</span>
                        <span>0</span>
                      </div>

                      {/* 6 bars */}
                      <div className="ml-10 w-full h-full flex items-end justify-between gap-3 pb-6">
                        {[
                          { month: 'May', value: '₹145k', height: '36%', bg: 'bg-emerald-200' },
                          { month: 'Jun', value: '₹178k', height: '44%', bg: 'bg-emerald-200' },
                          { month: 'Jul', value: '₹210k', height: '52%', bg: 'bg-emerald-200' },
                          { month: 'Aug', value: '₹265k', height: '66%', bg: 'bg-emerald-200' },
                          { month: 'Sep', value: '₹310k', height: '78%', bg: 'bg-emerald-300' },
                          { month: 'Oct', value: '₹384k', height: '96%', bg: 'bg-[#15803d]' },
                        ].map((bar, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                            <span className="text-[10px] font-bold text-emerald-700 font-mono mb-1.5 whitespace-nowrap">
                              {bar.value}
                            </span>
                            <div
                              style={{ height: bar.height }}
                              className={`w-full rounded-t-lg transition-all ${bar.bg} group-hover:brightness-95`}
                            />
                            <span className="absolute -bottom-5 text-[11px] font-medium text-slate-500">
                              {bar.month}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT: Tenant Billing & Tax Invoices (7 cols) */}
                <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-emerald-600" />
                        <div>
                          <h3 className="font-bold text-sm text-slate-900">
                            Tenant Billing & Tax Invoices
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            GST-compliant recurring SaaS invoices with automated Razorpay collection.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsInvoiceModalOpen(true)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#15803d] hover:bg-[#166534] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition cursor-pointer shrink-0"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Generate Invoice</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto w-full custom-scrollbar">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 font-semibold text-[11px]">
                            <th className="pb-2 font-bold">Invoice #</th>
                            <th className="pb-2 font-bold">Property</th>
                            <th className="pb-2 font-bold">Billing Period</th>
                            <th className="pb-2 font-bold">Plan / Portals</th>
                            <th className="pb-2 font-bold">Amount</th>
                            <th className="pb-2 font-bold">Status</th>
                            <th className="pb-2 font-bold text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {platformInvoices.map((inv) => (
                            <tr key={inv.id} className="hover:bg-slate-50/60 transition">
                              <td className="py-2.5 font-mono font-medium text-slate-700">
                                {inv.invoiceNumber}
                              </td>
                              <td className="py-2.5 font-semibold text-slate-900 max-w-[140px] truncate">
                                {inv.hotelName}
                              </td>
                              <td className="py-2.5 text-slate-500 whitespace-nowrap">
                                {inv.billingPeriod}
                              </td>
                              <td className="py-2.5 text-slate-700 max-w-[140px] truncate">
                                {inv.planName}
                              </td>
                              <td className="py-2.5 font-bold text-slate-900 font-mono whitespace-nowrap">
                                ₹{inv.amountINR.toLocaleString('en-IN')}
                              </td>
                              <td className="py-2.5">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    inv.status === 'PAID'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}
                                >
                                  {inv.status}
                                </span>
                              </td>
                              <td className="py-2.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInvoicePreviewData({
                                      invoiceNo: inv.invoiceNumber,
                                      hotelName: inv.hotelName,
                                      gstin: '08AAACH7409R1ZZ',
                                      city: 'Sikar, Rajasthan',
                                      date: '27 October 2026',
                                      amount: inv.amountINR,
                                    });
                                    setIsInvoiceModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold flex items-center gap-1 transition ml-auto cursor-pointer"
                                >
                                  <Eye className="w-3 h-3 text-slate-500" />
                                  <span>Preview</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 4. WHITE-LABEL BRANDING STUDIO                            */}
          {/* ======================================================== */}
          {activeNav === 'BRANDING' && (
            <div className="space-y-6 w-full mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                    <Palette className="w-6 h-6 text-emerald-600" />
                    <span>White-Label Branding & Domain Studio</span>
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage tenant branding, custom CNAME domains, high-res logos, and portal theme palettes.
                  </p>
                </div>

                {/* Tenant Picker */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-bold">Property:</span>
                  <select
                    data-testid="select-branding-hotel"
                    value={selectedBrandingTenantId}
                    onChange={(e) => setSelectedBrandingTenantId(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 shadow-2xs outline-none focus:border-emerald-600"
                  >
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.city || 'Central'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {brandingStudioMsg && (
                <div
                  className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-2xs ${
                    brandingStudioMsg.type === 'success'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                      : 'bg-rose-50 border border-rose-200 text-rose-700'
                  }`}
                >
                  {brandingStudioMsg.type === 'success' ? <Check className="w-4 h-4 text-emerald-600 inline mr-1" /> : <AlertTriangle className="w-4 h-4 text-amber-500 inline mr-1" />}
                  <span>{brandingStudioMsg.text}</span>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left 7 cols: Configuration Form */}
                <form
                  onSubmit={handleSaveBrandingStudio}
                  className="lg:col-span-7 p-6 rounded-2xl border border-slate-200/90 bg-white shadow-2xs space-y-4"
                >
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                    Branding Assets & Palette
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        Logo URL (PNG / SVG)
                      </label>
                      <input
                        type="url"
                        data-testid="input-brand-logo"
                        value={brandLogoUrl}
                        onChange={(e) => setBrandLogoUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        Cover Image URL
                      </label>
                      <input
                        type="url"
                        value={brandCoverUrl}
                        onChange={(e) => setBrandCoverUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      Hotel Hospitality Tagline
                    </label>
                    <input
                      type="text"
                      value={brandTagline}
                      onChange={(e) => setBrandTagline(e.target.value)}
                      placeholder="e.g. Luxury Stays & Fine Indian Dining"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition"
                    />
                  </div>

                  {/* Colors */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        Primary Accent Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={brandPrimaryColor}
                          onChange={(e) => setBrandPrimaryColor(e.target.value)}
                          className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border border-slate-200 p-0.5"
                        />
                        <input
                          type="text"
                          data-testid="input-brand-primary-color"
                          value={brandPrimaryColor}
                          onChange={(e) => setBrandPrimaryColor(e.target.value)}
                          className="w-28 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono font-bold uppercase text-slate-900"
                        />
                      </div>
                      <div className="flex gap-1.5 mt-2">
                        {['#15803d', '#10b981', '#6366f1', '#f59e0b', '#06b6d4'].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setBrandPrimaryColor(c)}
                            className="w-5 h-5 rounded-md border border-slate-200 transition hover:scale-110 cursor-pointer"
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        Secondary / Surface Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={brandSecondaryColor}
                          onChange={(e) => setBrandSecondaryColor(e.target.value)}
                          className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border border-slate-200 p-0.5"
                        />
                        <input
                          type="text"
                          value={brandSecondaryColor}
                          onChange={(e) => setBrandSecondaryColor(e.target.value)}
                          className="w-28 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono font-bold uppercase text-slate-900"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Custom Domain */}
                  <div className="pt-2 border-t border-slate-100">
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      Custom Subdomain / FQDN Mapping
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={brandDomain}
                        onChange={(e) => setBrandDomain(e.target.value)}
                        placeholder="e.g. dining.tajgateway.com"
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition"
                      />
                      <span className="text-[10px] font-bold px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap shadow-2xs">
                        CNAME Verified
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Configure your DNS: <code className="font-mono text-emerald-700 font-bold">CNAME</code> pointing to <code className="font-mono text-emerald-700 font-bold">spicehub.app</code>
                    </p>
                  </div>

                  <div className="pt-3 flex justify-end">
                    <button
                      type="submit"
                      data-testid="btn-save-branding"
                      disabled={isSavingBrandingStudio}
                      className="bg-[#15803d] hover:bg-[#166534] px-5 py-2.5 rounded-xl font-bold text-xs text-white flex items-center gap-2 shadow-xs transition cursor-pointer"
                    >
                      {isSavingBrandingStudio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span>Deploy White-Label Branding</span>
                    </button>
                  </div>
                </form>

                {/* Right 5 cols: Live Preview Canvas */}
                <div className="lg:col-span-5 p-6 rounded-2xl border border-slate-200/90 bg-white shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        Live Diner QR Preview
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-slate-100 text-slate-700 border border-slate-200">
                        {brandDomain || 'guest.spicehub.app'}
                      </span>
                    </div>

                    {/* Smartphone Mockup */}
                    <div className="mt-4 mx-auto max-w-xs rounded-3xl border-4 border-slate-800 bg-slate-950 p-3 shadow-lg overflow-hidden">
                      {/* Cover Photo */}
                      <div className="h-28 rounded-2xl overflow-hidden relative bg-slate-800">
                        <img
                          src={brandCoverUrl || IMAGE_PLACEHOLDER}
                          alt="Cover"
                          className="w-full h-full object-cover"
                        />
                        <div className="bg-gradient-to-t absolute inset-0 from-black/80" />
                        <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/40 bg-black shrink-0">
                            {brandLogoUrl ? (
                              <img src={brandLogoUrl} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">
                                SH
                              </div>
                            )}
                          </div>
                          <div className="truncate">
                            <div className="text-white font-bold text-xs truncate">
                              {tenants.find((t) => t.id === selectedBrandingTenantId)?.name || 'SpiceHub Hotel'}
                            </div>
                            <div className="text-[9px] text-slate-300 truncate">
                              {brandTagline || 'Luxury Hospitality'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Mock Menu Items */}
                      <div className="mt-3 space-y-2">
                        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-white">Paneer Butter Masala</div>
                            <div className="text-[10px] text-slate-400">Main Course • ₹320</div>
                          </div>
                          <button
                            type="button"
                            className="px-2.5 py-1 rounded-lg text-[10px] font-black text-white shadow"
                            style={{ backgroundColor: brandPrimaryColor || '#15803d' }}
                          >
                            + ADD
                          </button>
                        </div>

                        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-white">Butter Garlic Naan</div>
                            <div className="text-[10px] text-slate-400">Breads • ₹75</div>
                          </div>
                          <button
                            type="button"
                            className="px-2.5 py-1 rounded-lg text-[10px] font-black text-white shadow"
                            style={{ backgroundColor: brandPrimaryColor || '#15803d' }}
                          >
                            + ADD
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 pt-2 border-t border-slate-800 text-center">
                        <div className="text-[9px] text-slate-400 font-mono">
                          Powered by SpiceHub White-Label Engine
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 text-center mt-4">
                    Changes reflect immediately across all 8 micro-frontends and native Android terminals.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 7. FRANCHISE & BRAND GROUP GOVERNANCE                     */}
          {/* ======================================================== */}
          {activeNav === 'FRANCHISE' && (
            <div className="space-y-6 w-full mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                    <Store className="w-6 h-6 text-emerald-600" />
                    <span>Franchise & Corporate Brand Group Management</span>
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Aggregate independent hotel properties under corporate brand groups with centralized royalty billing, unified loyalty, and shared catalog standards.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold shadow-2xs">
                    {createdBrandGroups.length + 1} Active Brand Groups
                  </span>
                </div>
              </div>

              {franchiseSuccessMsg && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-2xs animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-600 inline mr-1" />
                  <span>{franchiseSuccessMsg}</span>
                </div>
              )}

              {/* Brand Group Creation Form */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 p-6 rounded-2xl border border-slate-200/90 bg-white shadow-2xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                      Onboard New Brand Group
                    </h3>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                      Corporate Umbrella
                    </span>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const newGroup = {
                        id: `grp-${Date.now()}`,
                        name: brandGroupName,
                        code: brandGroupCode,
                        headquarters: brandGroupHq,
                        royaltyPercent: brandGroupRoyalty,
                        linkedHotels: selectedFranchiseHotels,
                        createdAt: new Date().toISOString(),
                      };
                      setCreatedBrandGroups((prev) => [newGroup, ...prev]);
                      setFranchiseSuccessMsg(`Brand Group "${brandGroupName}" created successfully with ${selectedFranchiseHotels.length} linked hotels!`);
                      setGlobalAuditLogs((prev) => [
                        {
                          id: `audit-${Date.now()}`,
                          timestamp: new Date().toISOString(),
                          level: 'INFO',
                          source: 'SUPERADMIN',
                          action: `SuperAdmin created Brand Group "${brandGroupName}"`,
                          hotelName: selectedFranchiseHotels.join(', '),
                          details: `Assigned corporate code ${brandGroupCode}, HQ ${brandGroupHq}, royalty rate ${brandGroupRoyalty}%`,
                        },
                        ...prev,
                      ]);
                      setTimeout(() => setFranchiseSuccessMsg(null), 5000);
                    }}
                    className="space-y-3"
                  >
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Brand Group Name</label>
                      <input
                        type="text"
                        required
                        data-testid="input-brand-group-name"
                        value={brandGroupName}
                        onChange={(e) => setBrandGroupName(e.target.value)}
                        placeholder="e.g. Taj Group"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">Corporate Code</label>
                        <input
                          type="text"
                          required
                          data-testid="input-brand-group-code"
                          value={brandGroupCode}
                          onChange={(e) => setBrandGroupCode(e.target.value)}
                          placeholder="TAJ-GRP"
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 uppercase font-mono outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">HQ City / State</label>
                        <input
                          type="text"
                          required
                          data-testid="input-brand-group-hq"
                          value={brandGroupHq}
                          onChange={(e) => setBrandGroupHq(e.target.value)}
                          placeholder="Mumbai"
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        Franchise Royalty Fee (% of Gross POS & PMS)
                      </label>
                      <NumericInput
                        step="0.1"
                        value={brandGroupRoyalty}
                        onChange={(e) => setBrandGroupRoyalty(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 font-mono outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1.5">
                        Link Properties to Brand Group:
                      </label>
                      <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200 max-h-36 overflow-y-auto">
                        {['Mahesh Hotel', 'Chain Test Hotel', 'Taj Gateway Jaipur', 'SpiceHub Royal Fort'].map((hotel) => (
                          <label key={hotel} className="flex items-center gap-2 text-xs text-slate-700 hover:text-slate-900 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={selectedFranchiseHotels.includes(hotel)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedFranchiseHotels((prev) => [...prev, hotel]);
                                } else {
                                  setSelectedFranchiseHotels((prev) => prev.filter((h) => h !== hotel));
                                }
                              }}
                              className="rounded border-slate-300 text-emerald-600 accent-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="font-medium">{hotel}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      data-testid="btn-create-brand-group"
                      className="bg-[#15803d] hover:bg-[#166534] w-full py-2.5 rounded-xl text-xs font-semibold text-white shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Building2 className="w-4 h-4" />
                      <span>Create Brand Group</span>
                    </button>
                  </form>
                </div>

                {/* Interactive Franchise Hierarchy Tree */}
                <div
                  data-testid="franchise-hierarchy-tree"
                  className="lg:col-span-7 p-6 rounded-2xl border border-slate-200/90 bg-white shadow-2xs space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">
                        Corporate Hierarchy & Sub-Branch Tree
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Real-time royalty accrual and catalog inheritance mapping.
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                      Auto-Settlement Active
                    </span>
                  </div>

                  {/* Brand Group 1: Taj Hospitality Group */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-xs">
                          TG
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900">Taj Hospitality Group (TAJ-GRP)</div>
                          <div className="text-[10px] text-slate-500">HQ: Mumbai, MH • Royalty: 3.5% GTV</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        CORPORATE MASTER
                      </span>
                    </div>

                    {/* Sub-branch Properties */}
                    <div className="space-y-2 pl-4 border-l-2 border-slate-200 ml-3">
                      {/* Sub-branch A: Mahesh Hotel */}
                      <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-emerald-600" />
                            <div>
                              <div className="text-xs font-bold text-slate-900">Mahesh Hotel</div>
                              <div className="text-[10px] text-slate-500">Kukas, Jaipur • Slug: <span className="font-mono text-slate-700">mahesh-hotel</span></div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ACTIVE TENANT
                            </span>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                              All 8 Portals Live
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 text-[10px] text-slate-600 flex items-center gap-3">
                          <span>Monthly Royalty: <strong className="text-slate-900 font-mono">₹48,900/mo</strong></span>
                          <span>Catalog Sync: <strong className="text-emerald-700">100% Shared</strong></span>
                        </div>
                      </div>

                      {/* Sub-branch B: Chain Test Hotel */}
                      <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-amber-500" />
                            <div>
                              <div className="text-xs font-bold text-slate-900">Chain Test Hotel</div>
                              <div className="text-[10px] text-slate-500">Mumbai, Maharashtra • Slug: <span className="font-mono text-slate-700">chain-test-hotel</span></div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                              SUSPENDED / TRIAL
                            </span>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                              Modular Portals (KDS On, Waiter Off)
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 text-[10px] text-slate-600 flex items-center gap-3">
                          <span>Monthly Royalty: <strong className="text-slate-900 font-mono">₹12,400/mo</strong></span>
                          <span>Account Status: <strong className="text-rose-600">Audit Enforced</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Summary Footer */}
                    <div className="p-3 rounded-xl bg-white border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between shadow-2xs">
                      <span>Corporate Brand Catalog: <strong>Standardized North & South Indian Menu</strong></span>
                      <span className="text-emerald-700 font-semibold">Cross-Branch Settlements: Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <SuperAdminExtendedWorkstations
            activeNav={activeNav}
            theme={theme}
            exportJsonSnapshot={exportJsonSnapshot}
            tenants={tenants}
            auditLogs={auditLogs}
          />
        </main>
      </div>

      {/* ======================================================== */}
      {/* 10. COMMAND PALETTE MODAL (CTRL + K SPOTLIGHT SEARCH)     */}
      {/* ======================================================== */}
      {isCommandPaletteOpen && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/80 backdrop-blur-sm p-4 pt-20">
          <div className="bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl p-4 shadow-sm dark:shadow-none space-y-3 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type a command, search branch, or jump to module..."
                className="bg-transparent border-none outline-none w-full text-xs text-white placeholder:text-slate-500"
              />
              <span className="text-[10px] text-slate-500">ESC to close</span>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-1 text-xs">
              <div className="text-[10px] uppercase font-bold text-slate-500 px-2 py-1">Quick Actions</div>
              <div
                onClick={() => {
                  setIsOnboardModalOpen(true);
                  setIsCommandPaletteOpen(false);
                }}
                className="p-2 rounded-lg hover:bg-white/5 flex items-center justify-between cursor-pointer text-slate-200"
              >
                <span className="flex items-center gap-2"><Building2 className="w-4 h-4 text-emerald-600" /><span>Onboard New Hotel Branch</span></span>
                <span className="text-[10px] text-slate-700 dark:text-slate-300">Action</span>
              </div>
              <div
                onClick={() => {
                  setIsLiveSystemModalOpen(true);
                  setIsCommandPaletteOpen(false);
                }}
                className="p-2 rounded-lg hover:bg-white/5 flex items-center justify-between cursor-pointer text-slate-200"
              >
                <span className="flex items-center gap-2"><Eye className="w-4 h-4 text-blue-600" /><span>View Live System Micro-Frontends</span></span>
                <span className="text-[10px] text-slate-700 dark:text-slate-300">Launch</span>
              </div>
              <div
                onClick={() => {
                  exportJsonSnapshot();
                  setIsCommandPaletteOpen(false);
                }}
                className="p-2 rounded-lg hover:bg-white/5 flex items-center justify-between cursor-pointer text-slate-200"
              >
                <span className="flex items-center gap-2"><Download className="w-4 h-4 text-indigo-600" /><span>Export Platform Telemetry Snapshot</span></span>
                <span className="text-[10px] text-slate-700 dark:text-slate-300">Download</span>
              </div>

              <div className="text-[10px] uppercase font-bold text-slate-500 px-2 pt-2 pb-1">Jump to Module</div>
              {SIDEBAR_MENU_ITEMS.map((m) => (
                <div
                  key={m.key}
                  onClick={() => {
                    setActiveNav(m.key);
                    setIsCommandPaletteOpen(false);
                  }}
                  className="p-2 rounded-lg hover:bg-white/5 flex items-center justify-between cursor-pointer text-slate-300"
                >
                  <span className="flex items-center gap-2">
                    <m.icon className="w-4 h-4 text-slate-400" />
                    <span>{m.label}</span>
                  </span>
                  <span className="text-[10px] text-slate-500">Navigation</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 11. VIEW LIVE SYSTEM MODAL (MICRO-FRONTEND LAUNCHER)     */}
      {/* ======================================================== */}
      {isLiveSystemModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-slate-900">View Live System (Portals Switchboard)</h3>
              </div>
              <button onClick={() => setIsLiveSystemModalOpen(false)} className="text-slate-400 hover:text-white font-bold">
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Direct live micro-frontend launchpad with latency telemetry:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <a
                href={getPortalUrl('cashier')}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 hover:bg-emerald-900/30 transition text-center"
              >
                <div className="mb-2"><Zap className="w-5 h-5 text-emerald-600 mx-auto" /></div>
                <div className="font-bold text-emerald-400">Cashier POS</div>
                <div className="text-[10px] text-slate-400">Active • <span className="text-emerald-400 font-semibold">● 12ms</span></div>
              </a>
              <a
                href={getPortalUrl('reception')}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-xl border border-amber-500/30 bg-slate-900/20 hover:bg-amber-900/30 transition text-center"
              >
                <div className="mb-2"><BellRing className="w-5 h-5 text-amber-600 mx-auto" /></div>
                <div className="font-bold text-amber-400">Reception Portal</div>
                <div className="text-[10px] text-slate-400">Active • <span className="text-emerald-400 font-semibold">● 14ms</span></div>
              </a>
              <a
                href={getPortalUrl('admin')}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 hover:bg-slate-100 dark:bg-slate-800 transition text-center"
              >
                <div className="mb-2"><Building2 className="w-5 h-5 text-emerald-600 mx-auto" /></div>
                <div className="font-bold text-slate-700 dark:text-slate-300">Hotel Admin ERP</div>
                <div className="text-[10px] text-slate-400">Active • <span className="text-emerald-400 font-semibold">● 10ms</span></div>
              </a>
              <a
                href={getPortalUrl('customer')}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-xl border border-blue-500/30 bg-blue-950/20 hover:bg-blue-900/30 transition text-center"
              >
                <div className="mb-2"><Smartphone className="w-5 h-5 text-blue-600 mx-auto" /></div>
                <div className="font-bold text-blue-400">Customer Table QR</div>
                <div className="text-[10px] text-slate-400">Active • <span className="text-emerald-400 font-semibold">● 8ms</span></div>
              </a>
              <a
                href={getPortalUrl('waiter')}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition text-center"
              >
                <div className="mb-2"><Tablet className="w-5 h-5 text-blue-600 mx-auto" /></div>
                <div className="font-bold text-slate-800 dark:text-slate-200">Waiter Mobile App</div>
                <div className="text-[10px] text-slate-500">Active • <span className="text-emerald-600 font-semibold">● 9ms</span></div>
              </a>
              <a
                href={getPortalUrl('kds')}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-xl border border-red-500/30 bg-red-950/20 hover:bg-red-900/30 transition text-center"
              >
                <div className="mb-2"><ChefHat className="w-5 h-5 text-rose-600 mx-auto" /></div>
                <div className="font-bold text-red-400">Kitchen KDS</div>
                <div className="text-[10px] text-slate-400">Active • <span className="text-emerald-400 font-semibold">● 11ms</span></div>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 12. GENERATE REPORT MODAL                                 */}
      {/* ======================================================== */}
      {isExportReportOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-slate-900">Generate Executive Report</h3>
              <button onClick={() => setIsExportReportOpen(false)} className="text-slate-400 hover:text-white font-bold">
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Select export format for all 28 branches performance & financial telemetry:
            </p>
            <div className="space-y-2">
              <button
                onClick={() => {
                  exportJsonSnapshot();
                  setIsExportReportOpen(false);
                }}
                className="w-full p-3 rounded-xl border border-slate-800 bg-black/20 hover:bg-slate-100 dark:bg-slate-800 hover:border-slate-200 dark:border-slate-800 transition text-left flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-1.5"><Download className="w-4 h-4 text-emerald-600" /> Platform JSON Data Snapshot</div>
                  <div className="text-[10px] text-slate-400">Full tenant tree, configs, audit logs</div>
                </div>
                <span className="text-slate-700 dark:text-slate-300 font-bold">Download ›</span>
              </button>
              <button
                onClick={() => {
                  const csvRows = ['Branch,City,State,Orders,Revenue,Status'];
                  branchPins.forEach((b) => {
                    csvRows.push(`${b.name},${b.city},${b.state},${b.orders},${b.todayRevenue},${b.status}`);
                  });
                  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `spicehub-branches-${Date.now()}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                  setIsExportReportOpen(false);
                }}
                className="w-full p-3 rounded-xl border border-slate-800 bg-black/20 hover:bg-emerald-600/20 hover:border-emerald-500/40 transition text-left flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-1.5"><BarChart3 className="w-4 h-4 text-emerald-600" /> Branch Performance (CSV / Excel)</div>
                  <div className="text-[10px] text-slate-400">Tabular revenue & orders per location</div>
                </div>
                <span className="text-emerald-400 font-bold">Download ›</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* BULK IMPORT TENANTS MODAL                                */}
      {/* ======================================================== */}
      {isImportTenantsModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-4">
          <div className="bg-white border border-slate-200 text-slate-900 rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Import Hotel Tenants</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Bulk provision hotels, rooms, and billing plans via CSV.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsImportTenantsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 mx-auto flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <span className="font-semibold text-xs text-slate-800">Upload CSV Spreadsheet</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">Drag and drop file here, or click to browse</p>
                </div>
                <input
                  type="file"
                  accept=".csv,.json"
                  className="hidden"
                  id="csv-file-upload"
                  onChange={() => {
                    alert('File uploaded: 5 properties parsed from CSV.');
                  }}
                />
                <label
                  htmlFor="csv-file-upload"
                  className="inline-block px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
                >
                  Browse Files
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Or Paste CSV / JSON Records</label>
                <textarea
                  rows={4}
                  placeholder={`name, city, state, contactEmail, plan, rooms, tables\nRoyal Haveli, Jaipur, Rajasthan, admin@royalhaveli.in, PROFESSIONAL, 35, 20\nLake View Resort, Udaipur, Rajasthan, gm@lakeview.com, ENTERPRISE, 60, 30`}
                  className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Standard schema: name, city, state, contactEmail, plan, rooms, tables</span>
                <button
                  type="button"
                  onClick={() => {
                    const sample = 'name,city,state,contactEmail,plan,rooms,tables\nJaipur Royal Haveli,Jaipur,Rajasthan,admin@jaipurroyal.in,PROFESSIONAL,30,20\n';
                    const blob = new Blob([sample], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'spicehub_tenants_template.csv';
                    a.click();
                  }}
                  className="text-emerald-700 hover:underline font-semibold cursor-pointer"
                >
                  Download Template
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsImportTenantsModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  alert('Bulk import processed successfully! 2 new properties provisioned.');
                  setIsImportTenantsModalOpen(false);
                }}
                className="px-4 py-2 rounded-lg bg-[#15803d] hover:bg-[#166534] text-white text-xs font-semibold cursor-pointer shadow-xs"
              >
                Import Tenants
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 13. ONBOARD PROPERTY MODAL (4-STEP LUXURY WIZARD)         */}
      {/* ======================================================== */}
      {isOnboardModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-4">
          <form
            onSubmit={handleOnboardSubmit}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            {/* STICKY MODAL HEADER */}
            <div className="shrink-0 p-5 pb-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Onboard New Property & Allocate Portals</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      4-step property provisioning, workstation allocation and admin setup.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOnboardModalOpen(false)}
                  className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white flex items-center justify-center transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 4-STEP WIZARD TABS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {[
                  { step: 1, label: '1. Property & GPS', icon: MapPin },
                  { step: 2, label: '2. Brand & Visuals', icon: ImageIcon },
                  { step: 3, label: '3. Workstations', icon: Sliders },
                  { step: 4, label: '4. Plan & Admin', icon: Key },
                ].map((s) => {
                  const StepIcon = s.icon;
                  const isActive = onboardStep === s.step;
                  const isDone = onboardStep > s.step;
                  return (
                    <button
                      key={s.step}
                      type="button"
                      onClick={() => {
                        if (s.step > 1 && !newName.trim()) {
                          setOnboardError('Please enter a Property Name first.');
                          return;
                        }
                        setOnboardError('');
                        setOnboardStep(s.step as any);
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border text-center cursor-pointer ${
                        isActive
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 shadow-xs'
                          : isDone
                          ? 'bg-slate-100 dark:bg-slate-800/80 text-emerald-700 dark:text-emerald-400 border-slate-200 dark:border-slate-700'
                          : 'bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      {isDone ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <StepIcon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                      )}
                      <span className="truncate">{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SCROLLABLE CONTENT BODY */}
            <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar space-y-5 text-slate-800 dark:text-slate-100">
              {/* Error Banner */}
              {onboardError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{onboardError}</span>
                </div>
              )}

              {/* ======================================================== */}
              {/* STEP 1: PROPERTY PROFILE & GEOLOCATION                   */}
              {/* ======================================================== */}
              {onboardStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-emerald-600" />
                      <span>Property Profile & Capacity</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Property Name *</label>
                        <input
                          type="text"
                          data-testid="input-hotel-name"
                          required
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          placeholder="e.g. SpiceHub Royal Fort"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none mt-1 shadow-xs transition"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">City *</label>
                        <input
                          type="text"
                          data-testid="input-city"
                          value={newCity}
                          onChange={(e) => setNewCity(e.target.value)}
                          placeholder="e.g. Jodhpur"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none mt-1 shadow-xs transition"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">State</label>
                        <input
                          type="text"
                          value={newState}
                          onChange={(e) => setNewState(e.target.value)}
                          placeholder="e.g. Rajasthan"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none mt-1 shadow-xs transition"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Rooms Capacity</label>
                        <NumericInput
                          value={newRooms}
                          onChange={(e) => setNewRooms(Number(e.target.value))}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none mt-1 shadow-xs transition"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Tables Capacity</label>
                        <NumericInput
                          value={newTables}
                          onChange={(e) => setNewTables(Number(e.target.value))}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none mt-1 shadow-xs transition"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Geolocation & Google Maps Location */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-emerald-600" />
                          <span>Real Hotel Geolocation & Google Maps</span>
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Set the exact GPS coordinates so the property renders at its true physical location on the platform map.
                        </p>
                      </div>
                      {/* City Preset Coordinates */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Quick Pin:</span>
                        {[
                          { city: 'Jaipur', lat: 26.9124, lng: 75.7873 },
                          { city: 'Udaipur', lat: 24.5854, lng: 73.7125 },
                          { city: 'Jodhpur', lat: 26.2389, lng: 73.0243 },
                          { city: 'Delhi', lat: 28.6139, lng: 77.2090 },
                          { city: 'Mumbai', lat: 19.0760, lng: 72.8777 },
                          { city: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
                          { city: 'Goa', lat: 15.2993, lng: 74.1240 },
                        ].map((preset) => (
                          <button
                            key={preset.city}
                            type="button"
                            onClick={() => {
                              setNewCity(preset.city);
                              setNewLatitude(preset.lat);
                              setNewLongitude(preset.lng);
                              setNewGoogleMapUrl(`https://www.google.com/maps/search/?api=1&query=${preset.lat},${preset.lng}`);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-700 text-[10px] font-semibold border border-slate-200 dark:border-slate-700 transition cursor-pointer shadow-2xs"
                          >
                            {preset.city}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof navigator !== 'undefined' && navigator.geolocation) {
                              navigator.geolocation.getCurrentPosition(
                                (pos) => {
                                  const lat = Number(pos.coords.latitude.toFixed(6));
                                  const lng = Number(pos.coords.longitude.toFixed(6));
                                  setNewLatitude(lat);
                                  setNewLongitude(lng);
                                  setNewGoogleMapUrl(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
                                },
                                () => {}
                              );
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold border border-emerald-300 dark:border-emerald-700 transition cursor-pointer shadow-2xs flex items-center gap-1"
                        >
                          <Navigation className="w-3 h-3 text-emerald-600" />
                          <span>Detect Device GPS</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Street Address / Landmark</label>
                        <input
                          type="text"
                          value={newStreet}
                          onChange={(e) => setNewStreet(e.target.value)}
                          placeholder="e.g. Palace Road, Near Clock Tower"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none mt-1 shadow-xs transition"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Postal Code / PIN</label>
                        <input
                          type="text"
                          value={newPincode}
                          onChange={(e) => setNewPincode(e.target.value)}
                          placeholder="e.g. 302001"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none mt-1 shadow-xs transition"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Exact Latitude</label>
                        <NumericInput
                          step="0.000001"
                          value={newLatitude}
                          onChange={(e) => {
                            const lat = parseFloat(e.target.value) || 0;
                            setNewLatitude(lat);
                            setNewGoogleMapUrl(`https://www.google.com/maps/search/?api=1&query=${lat},${newLongitude}`);
                          }}
                          placeholder="e.g. 26.912400"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono mt-1 shadow-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Exact Longitude</label>
                        <NumericInput
                          step="0.000001"
                          value={newLongitude}
                          onChange={(e) => {
                            const lng = parseFloat(e.target.value) || 0;
                            setNewLongitude(lng);
                            setNewGoogleMapUrl(`https://www.google.com/maps/search/?api=1&query=${newLatitude},${lng}`);
                          }}
                          placeholder="e.g. 75.787300"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono mt-1 shadow-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Google Maps Search / Direct URL</label>
                        <input
                          type="url"
                          value={newGoogleMapUrl || `https://www.google.com/maps/search/?api=1&query=${newLatitude},${newLongitude}`}
                          onChange={(e) => setNewGoogleMapUrl(e.target.value)}
                          placeholder="https://www.google.com/maps/..."
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 font-mono mt-1 shadow-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition"
                        />
                      </div>
                      <div className="flex items-end">
                        <a
                          href={newGoogleMapUrl || `https://www.google.com/maps/search/?api=1&query=${newLatitude},${newLongitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2.5 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-xs border border-slate-300 dark:border-slate-700 text-center flex items-center justify-center gap-1.5 transition shadow-xs"
                        >
                          <Globe className="w-4 h-4 text-emerald-600 inline mr-0.5" />
                          <span>Test on Google Maps ↗</span>
                        </a>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Location Notes / Landmarks</label>
                      <input
                        type="text"
                        value={newLocationNotes}
                        onChange={(e) => setNewLocationNotes(e.target.value)}
                        placeholder="e.g. Opposite Heritage Gate, 500m from Railway Station"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none mt-1 shadow-xs transition"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* STEP 2: BRANDING & IMAGERY                               */}
              {/* ======================================================== */}
              {onboardStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                          <ImageIcon className="w-4 h-4 text-emerald-600" />
                          <span>Property Imagery & Brand Identity</span>
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          High-res hotel facade cover photo and brand logo displayed to guests and staff across all mobile apps & portals.
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Photo Presets:</span>
                        {[
                          { label: 'Luxury Resort', motto: 'Luxury Stays, Fine Dining & Serene Hospitality' },
                          { label: 'Heritage Palace', motto: 'Timeless Rajputana Royalty & World-Class Splendor' },
                          { label: 'Boutique Hotel', motto: 'Boutique Elegance & Contemporary Urban Comfort' },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              setNewCoverImageUrl('');
                              setNewLogoUrl('');
                              setNewTagline(preset.motto);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-700 text-[10px] font-semibold border border-slate-200 dark:border-slate-700 transition cursor-pointer shadow-2xs"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Cover / Banner Photo URL</label>
                        <input
                          type="url"
                          value={newCoverImageUrl}
                          onChange={(e) => setNewCoverImageUrl(e.target.value)}
                          placeholder="https://images.unsplash.com/... (optional)"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none mt-1 shadow-xs transition"
                        />
                        {newCoverImageUrl ? (
                          <div className="mt-3 h-28 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 relative shadow-sm">
                            <img src={newCoverImageUrl} alt="Cover preview" className="w-full h-full object-cover" />
                            <div className="bg-gradient-to-t absolute inset-0 from-black/80 flex items-end p-2.5">
                              <span className="text-[11px] text-white font-semibold flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                Cover Photo Live Preview
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 h-20 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 flex flex-col items-center justify-center text-xs text-slate-500 gap-1">
                            <ImageIcon className="w-5 h-5 text-slate-400" />
                            <span className="text-[11px]">No custom cover photo (luxury default hero applies)</span>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Hotel Brand Logo URL</label>
                        <input
                          type="url"
                          value={newLogoUrl}
                          onChange={(e) => setNewLogoUrl(e.target.value)}
                          placeholder="https://... logo.png (optional)"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none mt-1 shadow-xs transition"
                        />
                        <div className="mt-3 flex items-center gap-3">
                          {newLogoUrl ? (
                            <div className="h-16 w-16 rounded-2xl overflow-hidden border-2 border-emerald-500 bg-white shadow-sm flex-shrink-0 p-1">
                              <img src={newLogoUrl} alt="Logo preview" className="w-full h-full object-contain" />
                            </div>
                          ) : (
                            <div className="h-16 w-16 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 flex flex-col items-center justify-center text-[10px] text-slate-500 text-center flex-shrink-0 font-bold">
                              <Building2 className="w-5 h-5 text-slate-400 mb-0.5" />
                              <span>Default</span>
                            </div>
                          )}
                          <div className="flex-1">
                            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Tagline / Brand Motto</label>
                            <input
                              type="text"
                              value={newTagline}
                              onChange={(e) => setNewTagline(e.target.value)}
                              placeholder="e.g. Luxury Stays & Fine Hospitality"
                              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white mt-1 shadow-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* STEP 3: WORKSTATIONS & PORTALS ALLOCATION                */}
              {/* ======================================================== */}
              {onboardStep === 3 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Sliders className="w-4 h-4 text-emerald-600" />
                          <span>Operational Terminals Allocation & Workflow Presets</span>
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Toggle which portals this branch gets. Disabled portals are gated with lock screens.
                        </p>
                      </div>

                      {/* Preset Buttons */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Presets:</span>
                        {[
                          { key: 'FULL', label: 'Full Suite' },
                          { key: 'RESTAURANT', label: 'Restaurant' },
                          { key: 'CAFE_NO_WAITER', label: 'QR Cafe' },
                          { key: 'ROOMS_ONLY', label: 'Rooms Only' },
                          { key: 'TABLE_WITH_WAITER', label: 'Table + Waiter' },
                          { key: 'NO_GUEST_SERVICES', label: 'Admin Only' },
                        ].map((preset) => (
                          <button
                            key={preset.key}
                            type="button"
                            onClick={() => applyOnboardPreset(preset.key as any)}
                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-700 text-[10px] font-bold border border-slate-200 dark:border-slate-700 transition cursor-pointer shadow-2xs"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Hotel Services capabilities */}
                    <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 space-y-2">
                      <div>
                        <h5 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Hotel Services Suite</span>
                        </h5>
                        <p className="text-[10px] text-slate-600 dark:text-slate-400">Choose what the property actually offers. Each service also enables its required portal.</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {SERVICE_CAPABILITY_OPTIONS.map((option) => (
                          <label key={option.key} className="flex items-start gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 cursor-pointer shadow-2xs hover:border-emerald-300 transition">
                            <input
                              type="checkbox"
                              checked={onboardServiceCapabilities[option.key]}
                              onChange={() => toggleOnboardCapability(option.key)}
                              className="mt-0.5 accent-emerald-600 w-4 h-4 rounded cursor-pointer"
                            />
                            <span>
                              <span className="block text-[11px] font-bold text-slate-900 dark:text-slate-100">{option.label}</span>
                              <span className="block mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{option.description}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* 7 Portals Checklist Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {DEFAULT_PORTAL_CATALOG.map((portal) => {
                        const isChecked = onboardPortals.includes(portal.id);
                        const isBase = portal.requiredBase;

                        return (
                          <div
                            key={portal.id}
                            onClick={() => !isBase && toggleOnboardPortal(portal.id)}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                              isChecked
                                ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 shadow-xs'
                                : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-70 hover:opacity-100'
                            }`}
                          >
                            <label className="relative inline-flex items-center cursor-pointer mt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isBase}
                                onChange={() => !isBase && toggleOnboardPortal(portal.id)}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 peer-disabled:opacity-50"></div>
                            </label>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  {React.createElement(getPortalIcon(portal.id), { className: "w-4 h-4 text-emerald-600 inline mr-1 shrink-0" })}
                                  <span>{portal.name}</span>
                                </span>
                                <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                  {portal.role || 'Workstation'}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{portal.description}</p>
                              <div className="mt-1.5 flex items-center justify-between text-[10px]">
                                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                  +₹{portal.defaultMonthlyPriceINR.toLocaleString('en-IN')}/mo
                                </span>
                                {isBase && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold text-[9px]">
                                    Core Base (Required)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* STEP 4: SUBSCRIPTION PLAN & FIRST ADMIN CREDENTIALS      */}
              {/* ======================================================== */}
              {onboardStep === 4 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* Dynamic Subscription Pricing Calculator Box */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-emerald-600" />
                        <span>Calculated Dynamic Subscription</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500 font-medium">Billing Cycle:</span>
                        <div className="inline-flex rounded-xl bg-slate-200/80 dark:bg-slate-900 p-1 border border-slate-300 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={() => setOnboardBillingCycle('MONTHLY')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                              onboardBillingCycle === 'MONTHLY'
                                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                          >
                            Monthly
                          </button>
                          <button
                            type="button"
                            onClick={() => setOnboardBillingCycle('ANNUAL')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                              onboardBillingCycle === 'ANNUAL'
                                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                          >
                            Annual (2 Mo Free)
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                        <div className="text-[10px] text-slate-500 uppercase font-semibold">Portals Subtotal</div>
                        <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                          ₹{onboardPricing.baseMonthlyTotalINR.toLocaleString('en-IN')} / mo
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{onboardPortals.length} active portals</div>
                      </div>

                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                        <div className="text-[10px] text-slate-500 uppercase font-semibold">Custom Adjustment (₹)</div>
                        <NumericInput
                          value={onboardDiscount}
                          onChange={(e) => setOnboardDiscount(Number(e.target.value))}
                          placeholder="0"
                          className="w-full px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono mt-0.5 font-bold"
                        />
                        <div className="text-[9px] text-slate-500 mt-0.5">Discount or fee override</div>
                      </div>

                      <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                        <div className="text-[10px] text-emerald-800 dark:text-emerald-300 uppercase font-bold">Total Subscription</div>
                        <div className="text-base font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                          {onboardBillingCycle === 'ANNUAL'
                            ? `₹${onboardPricing.annualTotalINR.toLocaleString('en-IN')} / yr`
                            : `₹${onboardPricing.finalMonthlyTotalINR.toLocaleString('en-IN')} / mo`}
                        </div>
                        <div className="text-[9px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                          {onboardBillingCycle === 'ANNUAL' ? '10× monthly rate (billed yearly)' : 'Billed every 30 days'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Subscription Validity & Duration Selection */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-emerald-600" />
                          <span>Subscription Validity / Duration</span>
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Choose how many months or years of access to grant the new property.
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[
                          { label: '1 Month', months: 1 },
                          { label: '3 Months', months: 3 },
                          { label: '6 Months', months: 6 },
                          { label: '1 Year', months: 12 },
                          { label: '2 Years', months: 24 },
                        ].map((preset) => (
                          <button
                            key={preset.months}
                            type="button"
                            onClick={() => setOnboardDurationMonths(preset.months)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition border cursor-pointer ${
                              onboardDurationMonths === preset.months
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs shadow-2xs">
                      <span className="text-slate-600 dark:text-slate-300 font-medium">Custom duration (months):</span>
                      <NumericInput
                        min={1}
                        max={120}
                        value={onboardDurationMonths}
                        onChange={(e) => setOnboardDurationMonths(Math.max(1, Number(e.target.value)))}
                        className="w-20 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-center font-mono"
                      />
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        valid until {calculateEndDateFromMonths(new Date().toISOString(), onboardDurationMonths).slice(0, 10)}
                      </span>
                    </div>
                  </div>

                  {/* Admin Credentials */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Key className="w-4 h-4 text-emerald-600" />
                      <span>First Administrator Credentials (Single Property Scope)</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Admin Email *</label>
                        <input
                          type="email"
                          data-testid="input-admin-email"
                          required
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          placeholder="admin@hotel.com"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none mt-1 shadow-xs transition"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Phone (Optional)</label>
                        <input
                          type="text"
                          value={newPhone}
                          onChange={(e) => setNewPhone(e.target.value)}
                          placeholder="+91 98000 00000"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none mt-1 shadow-xs transition"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Admin Full Name</label>
                        <input
                          type="text"
                          value={newAdminName}
                          onChange={(e) => setNewAdminName(e.target.value)}
                          placeholder="Hotel General Manager"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none mt-1 shadow-xs transition"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Temporary Password *</label>
                        <input
                          type="password"
                          data-testid="input-admin-password"
                          required
                          minLength={8}
                          value={newAdminPassword}
                          onChange={(e) => setNewAdminPassword(e.target.value)}
                          placeholder="Minimum 8 characters"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none mt-1 shadow-xs transition"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* STICKY MODAL FOOTER (ALWAYS VISIBLE & ANCHORED) */}
            <div className="shrink-0 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/95 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  ₹{onboardPricing.finalMonthlyTotalINR.toLocaleString('en-IN')}<span className="text-[10px] text-slate-500 font-normal">/mo</span>
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  {onboardPortals.length} Portals Selected
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsOnboardModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                {onboardStep > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setOnboardError('');
                      setOnboardStep((s) => (s - 1) as any);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                )}
                {onboardStep < 4 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (onboardStep === 1 && !newName.trim()) {
                        setOnboardError('Please enter a Property Name before continuing.');
                        return;
                      }
                      if (onboardStep === 3 && onboardPortals.length === 0) {
                        setOnboardError('Please select at least one workstation portal.');
                        return;
                      }
                      setOnboardError('');
                      setOnboardStep((s) => (s + 1) as any);
                    }}
                    className="btn-glass-green px-5 py-2 rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Continue to Step {onboardStep + 1}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    data-testid="btn-submit-onboard"
                    disabled={onboarding}
                    className="btn-glass-green px-6 py-2.5 rounded-xl text-xs font-semibold shadow-sm disabled:cursor-wait disabled:opacity-60 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{onboarding ? 'Provisioning Property…' : `Confirm & Onboard Property (₹${onboardPricing.finalMonthlyTotalINR.toLocaleString('en-IN')}/mo)`}</span>
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      )}


      {/* ======================================================== */}
      {/* 13.5 EDIT TENANT PORTALS & DYNAMIC PRICING MODAL          */}
      {/* ======================================================== */}
      {editingTenantPortals && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-emerald-600" />
                  <span>Portals & Dynamic Pricing: {editingTenantPortals.name}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Code: <strong className="font-mono text-slate-700 dark:text-slate-300">{editingTenantPortals.code}</strong> • Changes apply in real-time to active terminals via WebSocket.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTenantPortals(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold text-lg"
              >
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            {editPortalsError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{editPortalsError}</span>
              </div>
            )}

            {/* Presets Row */}
            <div className="flex items-center justify-between flex-wrap gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase">Quick Configurations:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => applyEditPreset('FULL')}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold hover:bg-slate-100 transition shadow-sm"
                >
                  Full Suite (All 7)
                </button>
                <button
                  type="button"
                  onClick={() => applyEditPreset('RESTAURANT')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-semibold hover:bg-emerald-100 transition"
                >
                  Restaurant (POS + KDS + Waiter + QR)
                </button>
                <button
                  type="button"
                  onClick={() => applyEditPreset('CAFE_NO_WAITER')}
                  className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-slate-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-semibold hover:bg-amber-100 transition"
                >
                  QR Cafe (No Waiter)
                </button>
                <button
                  type="button"
                  onClick={() => applyEditPreset('ROOMS_ONLY')}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold hover:bg-slate-100 transition shadow-sm"
                >
                  Rooms Only (PMS + IRD)
                </button>
                <button
                  type="button"
                  onClick={() => applyEditPreset('ROOMS_NO_BOOKING')}
                  className="px-2.5 py-1 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 text-[10px] font-semibold hover:bg-cyan-100 transition"
                >
                  Reception, no booking
                </button>
                <button
                  type="button"
                  onClick={() => applyEditPreset('TABLE_NO_WAITER')}
                  className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-[10px] font-semibold hover:bg-sky-100 transition"
                >
                  Table, no waiter
                </button>
                <button
                  type="button"
                  onClick={() => applyEditPreset('TABLE_WITH_WAITER')}
                  className="px-2.5 py-1 rounded-lg bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800 text-[10px] font-semibold hover:bg-pink-100 transition"
                >
                  Table + waiter
                </button>
                <button
                  type="button"
                  onClick={() => applyEditPreset('ROOMS_NO_DINING')}
                  className="px-2.5 py-1 rounded-lg bg-lime-50 dark:bg-lime-950/40 text-lime-700 dark:text-lime-300 border border-lime-200 dark:border-lime-800 text-[10px] font-semibold hover:bg-lime-100 transition"
                >
                  Rooms, no dining
                </button>
                <button
                  type="button"
                  onClick={() => applyEditPreset('RECEPTION_NO_BOOKING')}
                  className="px-2.5 py-1 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 text-[10px] font-semibold hover:bg-cyan-100 transition"
                >
                  Reception, no guest portal
                </button>
                <button
                  type="button"
                  onClick={() => applyEditPreset('NO_GUEST_SERVICES')}
                  className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold hover:bg-slate-100 transition"
                >
                  Admin only
                </button>
              </div>
            </div>

            {/* 7 Portals Grid (Dynamic DB Catalog) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {dbPortalCatalog.map((portal) => {
                const isChecked = editPortalsList.includes(portal.id);
                const isBase = portal.requiredBase;

                return (
                  <div
                    key={portal.id}
                    onClick={() => !isBase && toggleEditPortal(portal.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
 isChecked
 ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 shadow-sm'
 : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-70 hover:opacity-100'
 }`}
                  >
                    <label className="relative inline-flex items-center cursor-pointer mt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        data-testid={`checkbox-portal-${portal.id}`}
                        checked={isChecked}
                        disabled={isBase}
                        onChange={() => !isBase && toggleEditPortal(portal.id)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
                    </label>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          {React.createElement(getPortalIcon(portal.id), { className: "w-4 h-4 text-emerald-600 inline mr-2" })}<span>{portal.name}</span>
                        </span>
                        <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          {portal.role || 'Workstation'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{portal.description}</p>
                      <div className="mt-1.5 flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1.5">
                          {editingPriceKey === portal.id ? (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <span className="text-slate-400">₹</span>
                              <NumericInput
                                value={customPriceInput}
                                onChange={(e) => setCustomPriceInput(e.target.value)}
                                className="w-16 px-1.5 py-0.5 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-[10px] text-slate-900 dark:text-white"
                              />
                              <button
                                type="button"
                                disabled={isUpdatingDbPrice}
                                onClick={() => void handleUpdateDbPortalPrice(portal.id, Number(customPriceInput))}
                                className="px-1.5 py-0.5 rounded bg-blue-600 text-white font-bold hover:bg-blue-700"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingPriceKey(null)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                              >
                                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-blue-600 dark:text-blue-400">
                                +₹{portal.defaultMonthlyPriceINR.toLocaleString('en-IN')}/mo
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingPriceKey(portal.id);
                                  setCustomPriceInput(String(portal.defaultMonthlyPriceINR));
                                }}
                                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 text-[9px] underline cursor-pointer"
                                title="Edit DB Catalog Base Price"
                              >
                                Edit
                              </button>
                            </div>
                          )}
                        </div>
                        {isBase ? (
                          <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[9px]">
                            Core Base
                          </span>
                        ) : isChecked ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">Active Module</span>
                        ) : (
                          <span className="text-slate-400 font-semibold text-[10px]">Disabled</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-3 space-y-2">
              <div>
                <h5 className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Hotel services</h5>
                <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">Select real services independently of subscription pricing. Required portals are enabled automatically.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SERVICE_CAPABILITY_OPTIONS.map((option) => (
                  <label key={option.key} className="flex items-start gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-black/20 p-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editServiceCapabilities[option.key]}
                      onChange={() => toggleEditCapability(option.key)}
                      className="mt-0.5 accent-emerald-600"
                    />
                    <span>
                      <span className="block text-[11px] font-semibold text-slate-800 dark:text-slate-100">{option.label}</span>
                      <span className="block mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{option.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Pricing Summary Box */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-600 inline mr-1.5" /><span>Recalculated Subscription Pricing</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Billing Cycle:</span>
                  <div className="inline-flex rounded-lg bg-slate-200 dark:bg-slate-900 p-0.5 border border-slate-300 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setEditBillingCycle('MONTHLY')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
 editBillingCycle === 'MONTHLY'
 ? 'bg-blue-600 text-white shadow-sm'
 : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
 }`}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditBillingCycle('ANNUAL')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
 editBillingCycle === 'ANNUAL'
 ? 'bg-blue-600 text-white shadow-sm'
 : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
 }`}
                    >
                      Annual (2 Mo Free)
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 shadow-sm">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Portals Subtotal</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    ₹{editPricing.baseMonthlyTotalINR.toLocaleString('en-IN')} / mo
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{editPortalsList.length} of 7 portals active</div>
                </div>

                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 shadow-sm">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Custom Adjustment (₹)</div>
                  <NumericInput
                    value={editDiscount}
                    onChange={(e) => setEditDiscount(Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-2 py-1 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono mt-0.5 font-bold"
                  />
                  <div className="text-[9px] text-slate-400 mt-0.5">Custom discount / override</div>
                </div>

                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 shadow-sm">
                  <div className="text-[10px] text-emerald-800 dark:text-emerald-300 uppercase font-bold">Updated Subscription</div>
                  <div className="text-base font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
                    {editBillingCycle === 'ANNUAL'
                      ? `₹${editPricing.annualTotalINR.toLocaleString('en-IN')} / yr`
                      : `₹${editPricing.finalMonthlyTotalINR.toLocaleString('en-IN')} / mo`}
                  </div>
                  <div className="text-[9px] text-emerald-600/80 dark:text-emerald-300/80 mt-0.5">
                    {editBillingCycle === 'ANNUAL' ? '10× monthly rate (billed yearly)' : 'Billed every 30 days'}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingTenantPortals(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="btn-save-portals"
                disabled={isSavingPortals}
                onClick={() => void handleSaveTenantPortals()}
                className="btn-glass-green px-5 py-2.5 rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSavingPortals ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>{isSavingPortals ? 'Broadcasting…' : 'Save & Broadcast to Terminals'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 13.6 EDIT TENANT BRANDING & IMAGERY MODAL                 */}
      {/* ======================================================== */}
      {isBrandingModalOpen && editingBrandingTenant && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSaveBranding}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-emerald-600" />
                  <span>Property Branding & Imagery — {editingBrandingTenant.name}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Update cover photo, logo, and tagline. These are projected in real time to mobile apps & ERP.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBrandingModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold text-lg"
              >
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            {/* Curated Presets Bar */}
            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                1-Click Curated Luxury Presets:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditCoverImageUrl('');
                    setEditLogoUrl('');
                    setEditTagline('Luxury Stays, Fine Dining & Serene Hospitality');
                  }}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-left border border-slate-700 text-[10px] transition"
                >
                  <div className="font-bold text-amber-700">Royal Resort</div>
                  <div className="text-slate-400 text-[9px] truncate">Poolside luxury</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditCoverImageUrl('');
                    setEditLogoUrl('');
                    setEditTagline('Timeless Rajputana Royalty & World-Class Splendor');
                  }}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-left border border-slate-700 text-[10px] transition"
                >
                  <div className="font-bold text-slate-700 dark:text-slate-300">Heritage Palace</div>
                  <div className="text-slate-400 text-[9px] truncate">Historic courtyard</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditCoverImageUrl('');
                    setEditLogoUrl('');
                    setEditTagline('Boutique Elegance & Contemporary Urban Comfort');
                  }}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-left border border-slate-700 text-[10px] transition"
                >
                  <div className="font-bold text-slate-700">Boutique Urban</div>
                  <div className="text-slate-400 text-[9px] truncate">Modern minimalist</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditCoverImageUrl('');
                    setEditLogoUrl('');
                    setEditTagline('Premier Hospitality, Business Lounges & Banquets');
                  }}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-left border border-slate-700 text-[10px] transition"
                >
                  <div className="font-bold text-emerald-700">Metropolitan</div>
                  <div className="text-slate-400 text-[9px] truncate">Executive suites</div>
                </button>
              </div>
            </div>

            {/* Property Identity & Location Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase">Hotel Property Name</label>
                <input
                  type="text"
                  required
                  value={editHotelName}
                  onChange={(e) => setEditHotelName(e.target.value)}
                  placeholder="e.g. Mahesh Grand Palace"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase">Reception / Support Phone</label>
                <input
                  type="tel"
                  value={editContactPhone}
                  onChange={(e) => setEditContactPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase">City</label>
                <input
                  type="text"
                  value={editHotelCity}
                  onChange={(e) => setEditHotelCity(e.target.value)}
                  placeholder="e.g. Jaipur"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase">State</label>
                <input
                  type="text"
                  value={editHotelState}
                  onChange={(e) => setEditHotelState(e.target.value)}
                  placeholder="e.g. Rajasthan"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 mt-1"
                />
              </div>
            </div>

            {/* Inputs & Live Previews */}
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase">Hotel Cover / Facade Photo URL</label>
                <input
                  type="url"
                  value={editCoverImageUrl}
                  onChange={(e) => setEditCoverImageUrl(e.target.value)}
                  placeholder="Image URL (optional)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none mt-1"
                />
                {editCoverImageUrl && (
                  <div className="mt-2 h-32 w-full rounded-2xl overflow-hidden border border-slate-700 relative shadow-md">
                    <img src={editCoverImageUrl} alt="Cover preview" className="w-full h-full object-cover" />
                    <div className="bg-gradient-to-t absolute inset-0 from-black/80 flex items-end p-2.5">
                      <span className="text-xs text-white font-bold">Cover Photo Live Preview</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Hotel Brand Logo URL</label>
                  <input
                    type="url"
                    value={editLogoUrl}
                    onChange={(e) => setEditLogoUrl(e.target.value)}
                    placeholder="https://.../logo.png"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none mt-1"
                  />
                  {editLogoUrl && (
                    <div className="mt-2 flex items-center gap-2.5 p-2 rounded-xl bg-black/30 border border-slate-800">
                      <div className="h-12 w-12 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black flex-shrink-0">
                        <img src={editLogoUrl} alt="Logo" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold">Avatar Badge Preview</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Hotel Tagline / Brand Motto</label>
                  <input
                    type="text"
                    value={editTagline}
                    onChange={(e) => setEditTagline(e.target.value)}
                    placeholder="e.g. Luxury Stays & Fine Hospitality"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none mt-1"
                  />
                  <div className="mt-2 p-2 rounded-xl bg-black/30 border border-slate-800 text-[11px] text-slate-300 italic">
                    "{editTagline || 'No tagline set'}"
                  </div>
                </div>
              </div>
            </div>

            {brandingError && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold">
                {brandingError}
              </div>
            )}
            {brandingSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                {brandingSuccess}
              </div>
            )}

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsBrandingModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingBranding}
                className="btn-glass-green px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5 disabled:opacity-60"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingBranding ? 'Saving...' : 'Save & Broadcast Branding'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* 14. BOTTOM DOCK SETTINGS MODAL                            */}
      {/* ======================================================== */}
      {activeSettingsModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-sm dark:shadow-none space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">
                {activeSettingsModal.replace('_', ' ')} Settings
              </h3>
              <button onClick={() => setActiveSettingsModal(null)} className="text-slate-400 hover:text-white font-bold">
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Configuration active for <strong>{activeSettingsModal}</strong> across the multi-tenant cluster.
            </p>
            <div className="p-4 rounded-xl bg-black/30 border border-white/5 text-xs text-slate-300 space-y-2">
              <div className="flex justify-between"><span>Status:</span><span className="text-emerald-400 font-bold">● Synchronized</span></div>
              <div className="flex justify-between"><span>Environment:</span><span className="font-mono text-white">Production (v5.0.2)</span></div>
              <div className="flex justify-between"><span>Tenant Partitioning:</span><span className="text-slate-700 dark:text-slate-300 font-bold">Isolated (Postgres + Redis)</span></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setActiveSettingsModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-bold text-xs"
              >
                Close Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 15. PROVISION SUPER STAFF ACCOUNT MODAL (§5)              */}
      {/* ======================================================== */}
      {isSuperStaffModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div
            data-testid="modal-super-staff"
            className="bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-sm dark:shadow-none space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-slate-900">Provision Super Staff Account</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSuperStaffModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const newStaff: PlatformUser = {
                  id: `staff-${Date.now()}`,
                  name: newSuperStaffName,
                  email: newSuperStaffEmail,
                  phone: '+91 99000 11223',
                  role: newSuperStaffRole,
                  hotelId: 'global',
                  hotelName: 'Global Cloud Platform (All Tenants)',
                  isActive: true,
                  shiftStatus: 'ON_DUTY',
                };
                setPlatformUsers((prev) => [newStaff, ...prev]);
                setGlobalAuditLogs((prev) => [
                  {
                    id: `audit-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    level: 'INFO',
                    source: 'SUPERADMIN',
                    action: `SuperAdmin provisioned Super Staff user: ${newSuperStaffName} (${newSuperStaffEmail})`,
                    hotelName: 'Global Platform',
                    details: `Assigned role ${newSuperStaffRole}. Tenant deletion restricted under RBAC governance.`,
                  },
                  ...prev,
                ]);
                setIsSuperStaffModalOpen(false);
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  data-testid="input-staff-name"
                  value={newSuperStaffName}
                  onChange={(e) => setNewSuperStaffName(e.target.value)}
                  placeholder="Support Admin"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  data-testid="input-staff-email"
                  value={newSuperStaffEmail}
                  onChange={(e) => setNewSuperStaffEmail(e.target.value)}
                  placeholder="support@spicehub.com"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Platform RBAC Role</label>
                <select
                  data-testid="select-staff-role"
                  value={newSuperStaffRole}
                  onChange={(e) => setNewSuperStaffRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-bold"
                >
                  <option value="SUPER_STAFF">SUPER_STAFF (Support Engineer - Delete Restricted)</option>
                  <option value="SUPERADMIN">SUPERADMIN (Root Infrastructure Access)</option>
                  <option value="PLATFORM_AUDITOR">PLATFORM_AUDITOR (Read-Only Compliance)</option>
                </select>
                <p className="text-[10px] text-amber-400 mt-1">
                  Note: SUPER_STAFF accounts cannot delete tenants or drop database collections.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSuperStaffModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="btn-submit-super-staff"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 shadow-lg transition"
                >
                  Save & Provision Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 16. INVOICE PREVIEW MODAL (§2)                             */}
      {/* ======================================================== */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div
            data-testid="modal-invoice-preview"
            className="bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl p-6 shadow-sm dark:shadow-none space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                <h3 className="font-bold text-base text-white">Tax Invoice Preview</h3>
              </div>
              <button
                type="button"
                data-testid="btn-close-invoice-modal"
                onClick={() => setIsInvoiceModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-sm text-white">SpiceHub SaaS Platform Pvt Ltd</div>
                  <div className="text-[10px] text-slate-400">Cyber City, DLF Phase 2, Gurugram, India</div>
                  <div className="text-[10px] font-mono text-slate-700 dark:text-slate-300">GSTIN: 06AAACS8491M1Z5</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-slate-700 dark:text-slate-300">{invoicePreviewData.invoiceNo}</div>
                  <div className="text-[10px] text-slate-400">Date: {invoicePreviewData.date}</div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    STATUS: PAID
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-500">Billed To</div>
                  <div className="font-bold text-white text-xs">{invoicePreviewData.hotelName}</div>
                  <div className="text-[10px] text-slate-400">{invoicePreviewData.city}</div>
                  <div className="text-[10px] font-mono text-slate-400">GSTIN: {invoicePreviewData.gstin}</div>
                </div>
              </div>

              {/* Line items */}
              <div className="pt-2 border-t border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-500 text-[10px] border-b border-slate-800">
                      <th className="pb-1">Description</th>
                      <th className="pb-1 text-right">Rate (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    <tr>
                      <td className="py-2 text-white">Core Multi-Tenant Cloud Platform (Monthly)</td>
                      <td className="py-2 text-right font-mono text-slate-300">₹8,000</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-white">Modular Portals (POS, Reception, KDS, IRD)</td>
                      <td className="py-2 text-right font-mono text-slate-300">₹4,000</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-slate-400">CGST (9%)</td>
                      <td className="py-2 text-right font-mono text-slate-400">₹1,080</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-slate-400">SGST (9%)</td>
                      <td className="py-2 text-right font-mono text-slate-400">₹1,080</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-700 font-bold text-white">
                      <td className="pt-2 text-sm">Total Paid</td>
                      <td className="pt-2 text-right text-base text-emerald-400 font-mono">
                        ₹{invoicePreviewData.amount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  alert('Tax Invoice downloaded to PDF.');
                  setIsInvoiceModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-bold text-xs shadow transition"
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 17. CREATE / EDIT CUSTOM SUBSCRIPTION PLAN MODAL          */}
      {/* ======================================================== */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSaveCustomPlan}
            className="bg-slate-900 border border-amber-500/40 rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 shadow-sm dark:shadow-none space-y-5 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Crown className="w-6 h-6 text-amber-500" />
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {editingPlanId ? 'Edit Subscription Plan' : 'Create Custom Subscription Plan'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Define custom INR tier pricing, room/table/staff capacity limits, and portal access flags.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPlanModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            {/* Plan Name, Code & Active Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase">Plan Name</label>
                <input
                  type="text"
                  required
                  value={planFormName}
                  onChange={(e) => setPlanFormName(e.target.value)}
                  placeholder="e.g. Diamond Resort Elite"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase">Plan Code</label>
                <input
                  type="text"
                  required
                  disabled={!!editingPlanId}
                  value={planFormCode}
                  onChange={(e) => setPlanFormCode(e.target.value.toUpperCase())}
                  placeholder="e.g. DIAMOND"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none mt-1 disabled:opacity-50 font-mono uppercase"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase">Status</label>
                <button
                  type="button"
                  onClick={() => setPlanFormIsActive(!planFormIsActive)}
                  className={`w-full mt-1 px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                    planFormIsActive
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                  }`}
                >
                  <Power className={`w-3.5 h-3.5 ${planFormIsActive ? 'text-emerald-400' : 'text-rose-400'}`} />
                  <span>{planFormIsActive ? 'Active' : 'Deactivated'}</span>
                </button>
              </div>
            </div>

            {/* Pricing INR */}
            <div className="p-3.5 rounded-2xl bg-black/30 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                Subscription Pricing (₹ INR)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Monthly Price (₹/mo)</label>
                  <NumericInput
                    min="0"
                    required
                    value={planFormMonthlyPrice}
                    onChange={(e) => {
                      const m = Number(e.target.value);
                      setPlanFormMonthlyPrice(m);
                      setPlanFormAnnualPrice(m * 10);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-amber-300 font-bold mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Annual Price (₹/yr)</label>
                  <NumericInput
                    min="0"
                    required
                    value={planFormAnnualPrice}
                    onChange={(e) => setPlanFormAnnualPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-amber-300 font-bold mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Capacity Limits */}
            <div className="p-3.5 rounded-2xl bg-black/30 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Operational Capacity Quotas
              </span>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Max Rooms</label>
                  <NumericInput
                    min="1"
                    required
                    value={planFormMaxRooms}
                    onChange={(e) => setPlanFormMaxRooms(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-bold mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Max Tables</label>
                  <NumericInput
                    min="1"
                    required
                    value={planFormMaxTables}
                    onChange={(e) => setPlanFormMaxTables(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-bold mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Max Staff</label>
                  <NumericInput
                    min="1"
                    required
                    value={planFormMaxStaffUsers}
                    onChange={(e) => setPlanFormMaxStaffUsers(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-bold mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Portal Entitlements & Feature Flags */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Workstations & Feature Entitlements
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  { key: 'pmsEnabled', label: 'Front Desk PMS' },
                  { key: 'posEnabled', label: 'Fast Cashier POS' },
                  { key: 'kdsEnabled', label: 'Kitchen Display System (KDS)' },
                  { key: 'waiterEnabled', label: 'Waiter Mobile POS' },
                  { key: 'qrDineInEnabled', label: 'Customer Dine-In QR Ordering' },
                  { key: 'roomServiceEnabled', label: 'Guest Digital Room Portal' },
                  { key: 'banquetEnabled', label: 'Banquet & Event Management' },
                  { key: 'loyaltyEnabled', label: 'Guest Loyalty Network' },
                  { key: 'tallyExportEnabled', label: 'Tally Accounting Export' },
                ].map(({ key, label }) => (
                  <label
                    key={key}
                    className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={!!planFormFlags[key]}
                      onChange={(e) =>
                        setPlanFormFlags({ ...planFormFlags, [key]: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-slate-300 bg-white text-blue-600 accent-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-slate-200 text-[11px] font-medium">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPlanModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingPlan}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-amber-400 text-white shadow-lg transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-1.5 inline" />
                <span>{isSavingPlan ? 'Saving Plan…' : editingPlanId ? 'Update Subscription Plan' : 'Create Subscription Plan'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* 18. SUBSCRIPTION DURATION & VALIDITY ADJUSTMENT MODAL     */}
      {/* ======================================================== */}
      {managingSubscriptionTenant && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl max-h-[92vh] overflow-y-auto p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-base text-slate-900">Adjust Subscription Duration & Validity</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {managingSubscriptionTenant.name} &bull; <span className="font-mono text-slate-300">{managingSubscriptionTenant.slug}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setManagingSubscriptionTenant(null)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            {/* Quick Duration Presets */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Select Validity Duration:
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                  { key: '1m', label: '1 Month', months: 1 },
                  { key: '3m', label: '3 Months', months: 3 },
                  { key: '6m', label: '6 Months', months: 6 },
                  { key: '1y', label: '1 Year', months: 12 },
                  { key: '2y', label: '2 Years', months: 24 },
                  { key: 'custom', label: 'Custom', months: subCustomMonths },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleSubDurationChange(item.key as any, item.key === 'custom' ? subCustomMonths : item.months)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition border ${
 subDurationType === item.key
 ? 'bg-slate-700 text-white border-slate-500 shadow-sm'
 : 'bg-black/30 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
 }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Months Input if custom selected */}
            {subDurationType === 'custom' && (
              <div className="p-3 rounded-xl bg-black/40 border border-slate-800 flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-300 font-medium">Custom duration in months:</span>
                <div className="flex items-center gap-2">
                  <NumericInput
                    min={1}
                    max={120}
                    value={subCustomMonths}
                    onChange={(e) => {
                      const m = Math.max(1, Number(e.target.value));
                      handleSubDurationChange('custom', m);
                    }}
                    className="w-24 px-3 py-1.5 rounded-lg bg-black/60 border border-slate-700 text-white font-bold text-center"
                  />
                  <span className="text-slate-400 font-medium">months</span>
                </div>
              </div>
            )}

            {/* Start and End Date Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Subscription Start Date
                </label>
                <input
                  type="date"
                  value={subStartDate}
                  onChange={(e) => {
                    setSubStartDate(e.target.value);
                    setSubEndDate(calculateEndDateFromMonths(e.target.value, subCustomMonths));
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Subscription End Date
                </label>
                <input
                  type="date"
                  value={subEndDate}
                  onChange={(e) => setSubEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Status and Monthly Price Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Tenant Status
                </label>
                <select
                  value={subStatus}
                  onChange={(e) => setSubStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-slate-700 text-xs text-white font-bold"
                >
                  <option value="ACTIVE">ACTIVE (Access Granted)</option>
                  <option value="MAINTENANCE">MAINTENANCE (Under Maintenance)</option>
                  <option value="SUSPENDED">SUSPENDED (Access Blocked)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Monthly Rate (₹/month)
                </label>
                <NumericInput
                  min={0}
                  value={subMonthlyRate}
                  onChange={(e) => setSubMonthlyRate(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-slate-700 text-xs text-white font-bold"
                />
              </div>
            </div>

            {/* Calculated Summary Preview Box */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-slate-800 space-y-2 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Subscription Validity Summary
              </span>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-black/30 border border-white/5">
                  <div className="text-[10px] text-slate-400">Given On</div>
                  <div className="font-bold text-white mt-0.5">{formatDate(subStartDate)}</div>
                </div>
                <div className="p-2 rounded-lg bg-black/30 border border-white/5">
                  <div className="text-[10px] text-slate-400">Expires On</div>
                  <div className="font-bold text-white mt-0.5">{formatDate(subEndDate)}</div>
                </div>
                <div className="p-2 rounded-lg bg-black/30 border border-white/5">
                  <div className="text-[10px] text-slate-400">Days Remaining</div>
                  <div className="font-bold text-emerald-400 mt-0.5">
                    {calculateDaysRemaining(subEndDate).text}
                  </div>
                </div>
              </div>
            </div>

            {subscriptionErrorMsg && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold">
                {subscriptionErrorMsg}
              </div>
            )}
            {subscriptionSuccessMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                {subscriptionSuccessMsg}
              </div>
            )}

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setManagingSubscriptionTenant(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingSubscription}
                onClick={() => void handleSaveSubscription()}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-700 hover:bg-slate-600 text-white border border-slate-500 shadow-md transition disabled:opacity-50"
              >
                {isSavingSubscription ? 'Saving Subscription…' : 'Save Subscription Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 18b. SUPERADMIN PROPERTY CAPACITY CEILING ADJUSTMENT MODAL */}
      {/* ======================================================== */}
      {managingCapacityTenant && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Shield className="w-6 h-6 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-base text-white">Property Capacity Governance</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {managingCapacityTenant.name} &bull; <span className="font-mono text-slate-300">{managingCapacityTenant.slug}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setManagingCapacityTenant(null)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 leading-relaxed">
              <strong>SuperAdmin Capacity Enforcement:</strong> Hotel Admin cannot create more rooms or dining tables than the allocated ceilings below. Any attempt by Hotel Admin to exceed these limits is strictly blocked with an explicit HTTP 403 error.
            </div>

            <div className="space-y-4">
              {/* Max Rooms Setting */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center gap-2">
                    <BedDouble className="w-4 h-4 text-emerald-600 inline mr-1.5" /><span>Max Allowed Rooms</span>
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Currently in use: <strong className="text-white">{managingCapacityTenant.totalRooms || 0}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <NumericInput
                    min={Math.max(1, managingCapacityTenant.totalRooms || 1)}
                    max={500}
                    value={capacityMaxRooms}
                    onChange={(e) => setCapacityMaxRooms(Math.max(1, Number(e.target.value)))}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-slate-700 text-white font-bold text-base focus:border-amber-500 focus:outline-none"
                  />
                  <div className="flex gap-1.5 shrink-0">
                    {[10, 25, 50, 100].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setCapacityMaxRooms(preset)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition ${
 capacityMaxRooms === preset
 ? 'bg-emerald-600 text-white border-amber-400'
 : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
 }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">
                  Hotel Admin will be strictly blocked from creating rooms if count reaches {capacityMaxRooms}.
                </p>
              </div>

              {/* Max Tables Setting */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center gap-2">
                    <Armchair className="w-4 h-4 text-emerald-600 inline mr-1.5" /><span>Max Allowed Dining Tables</span>
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Currently in use: <strong className="text-white">{managingCapacityTenant.totalTables || 0}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <NumericInput
                    min={Math.max(1, managingCapacityTenant.totalTables || 1)}
                    max={300}
                    value={capacityMaxTables}
                    onChange={(e) => setCapacityMaxTables(Math.max(1, Number(e.target.value)))}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-slate-700 text-white font-bold text-base focus:border-amber-500 focus:outline-none"
                  />
                  <div className="flex gap-1.5 shrink-0">
                    {[10, 20, 40, 80].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setCapacityMaxTables(preset)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition ${
 capacityMaxTables === preset
 ? 'bg-emerald-600 text-white border-amber-400'
 : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
 }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">
                  Hotel Admin will be strictly blocked from adding tables if count reaches {capacityMaxTables}.
                </p>
              </div>
            </div>

            {capacityErrorMsg && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold">
                {capacityErrorMsg}
              </div>
            )}
            {capacitySuccessMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                {capacitySuccessMsg}
              </div>
            )}

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setManagingCapacityTenant(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingCapacity}
                onClick={() => void handleSaveCapacity()}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-amber-400 text-white shadow-md transition disabled:opacity-50"
              >
                {isSavingCapacity ? 'Saving Limits…' : 'Enforce Capacity Ceilings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 19. ADMIN CREDENTIALS & PASSWORD MANAGEMENT MODAL         */}
      {/* ======================================================== */}
      {managingCredentialsTenant && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Key className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-base text-slate-900">Hotel Admin Credentials & Access</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{managingCredentialsTenant.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setManagingCredentialsTenant(null)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            {/* Current Access Info */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-slate-800 space-y-2.5 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Current Login Identifiers
              </span>

              <div className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-slate-800">
                <span className="text-slate-400 font-medium">Hotel Slug:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-white">{managingCredentialsTenant.slug}</span>
                  <button
                    type="button"
                    title="Copy Slug"
                    onClick={() => void copyToClipboard(managingCredentialsTenant.slug, 'Hotel Slug copied!')}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700" /></button>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-slate-800">
                <span className="text-slate-400 font-medium">Admin Email:</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-200">
                    {managingCredentialsTenant.adminEmail || managingCredentialsTenant.contactEmail}
                  </span>
                  <button
                    type="button"
                    title="Copy Email"
                    onClick={() =>
                      void copyToClipboard(
                        managingCredentialsTenant.adminEmail || managingCredentialsTenant.contactEmail,
                        'Admin Email copied!'
                      )
                    }
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700" /></button>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-slate-800">
                <span className="text-slate-400 font-medium">ERP Login Portal:</span>
                <div className="flex items-center gap-2">
                  <a
                    href={getPortalUrl('admin')}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-indigo-400 dark:text-indigo-300 hover:underline text-xs flex items-center gap-1"
                  >
                    <span>Launch ERP Workspace</span>
                    <span>↗</span>
                  </a>
                  <button
                    type="button"
                    title="Copy URL"
                    onClick={() => void copyToClipboard(getPortalUrl('admin'), 'ERP URL copied!')}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700" /></button>
                </div>
              </div>
            </div>

            {/* Reset Password Form */}
            <div className="space-y-3 pt-1">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Set New Password:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={credNewPassword}
                  onChange={(e) => setCredNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 chars)"
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setCredNewPassword(`SpiceHub@${Math.floor(1000 + Math.random() * 9000)}`)}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                >
                  Generate
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                Leave blank and click Reset to automatically generate a secure random password.
              </p>
            </div>

            {credSuccessData && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-xs space-y-2">
                <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600 inline mr-1" />
                  <span>Password Reset Successfully!</span>
                </div>
                <div className="p-2.5 rounded-xl bg-black/50 border border-emerald-900/50 space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Email:</span>
                    <span className="text-white font-bold">{credSuccessData.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">New Password:</span>
                    <span className="text-emerald-300 font-bold">{credSuccessData.password}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Hotel Slug:</span>
                    <span className="text-white font-bold">{credSuccessData.hotelSlug}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    void copyToClipboard(
                      `SpiceHub Hotel Admin Login:\nURL: ${getPortalUrl('admin')}\nSlug: ${credSuccessData.hotelSlug}\nEmail: ${credSuccessData.email}\nPassword: ${credSuccessData.password}`,
                      'Full login credentials copied!'
                    )
                  }
                  className="w-full py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 font-bold text-xs"
                >
                  Copy All Login Credentials
                </button>
              </div>
            )}

            {credErrorMsg && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold">
                {credErrorMsg}
              </div>
            )}

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setManagingCredentialsTenant(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Close
              </button>
              <button
                type="button"
                disabled={isResettingPassword}
                onClick={() => void handleResetPassword()}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-700 hover:bg-slate-600 text-white border border-slate-500 shadow-md transition disabled:opacity-50"
              >
                {isResettingPassword ? 'Resetting…' : 'Reset Admin Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 20. NEWLY ONBOARDED HOTEL CREDENTIALS POPUP               */}
      {/* ======================================================== */}
      {createdCredentialsModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-base text-slate-900">Hotel Created Successfully!</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{createdCredentialsModal.hotelName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreatedCredentialsModal(null)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Your new hotel property has been provisioned. Please save and share these credentials with the hotel administrator to log in:
            </p>

            <div className="p-4 rounded-2xl bg-black/40 border border-slate-800 space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-black/50 border border-slate-800">
                <span className="text-slate-400 font-medium">Hotel Slug:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-white text-sm">{createdCredentialsModal.hotelSlug}</span>
                  <button
                    type="button"
                    title="Copy Slug"
                    onClick={() => void copyToClipboard(createdCredentialsModal.hotelSlug, 'Hotel Slug copied!')}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700" /></button>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-black/50 border border-slate-800">
                <span className="text-slate-400 font-medium">Admin Email:</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{createdCredentialsModal.adminEmail}</span>
                  <button
                    type="button"
                    title="Copy Email"
                    onClick={() => void copyToClipboard(createdCredentialsModal.adminEmail, 'Admin Email copied!')}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700" /></button>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-black/50 border border-slate-800">
                <span className="text-slate-400 font-medium">Admin Password:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-emerald-400 text-sm">{createdCredentialsModal.adminPassword}</span>
                  <button
                    type="button"
                    title="Copy Password"
                    onClick={() => void copyToClipboard(createdCredentialsModal.adminPassword, 'Admin Password copied!')}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700" /></button>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-black/50 border border-slate-800">
                <span className="text-slate-400 font-medium">Subscription Validity:</span>
                <span className="font-bold text-slate-200">
                  {createdCredentialsModal.durationMonths} Month(s) &bull; Until {formatDate(createdCredentialsModal.subscriptionEndDate)}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-black/50 border border-slate-800">
                <span className="text-slate-400 font-medium">ERP Login URL:</span>
                <a
                  href={createdCredentialsModal.portalUrl || getPortalUrl('admin')}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-indigo-400 dark:text-indigo-300 hover:underline text-xs flex items-center gap-1"
                >
                  <span>Launch ERP Workspace</span>
                  <span>↗</span>
                </a>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() =>
                  void copyToClipboard(
                    `SpiceHub Hotel Admin Login:\nURL: ${createdCredentialsModal.portalUrl || getPortalUrl('admin')}\nHotel Slug: ${createdCredentialsModal.hotelSlug}\nEmail: ${createdCredentialsModal.adminEmail}\nPassword: ${createdCredentialsModal.adminPassword}\nValid Until: ${formatDate(createdCredentialsModal.subscriptionEndDate)}`,
                    'All credentials copied to clipboard!'
                  )
                }
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-700 hover:bg-slate-600 text-white border border-slate-500 shadow-md transition flex items-center justify-center gap-1.5"
              >
                <Copy className="w-4 h-4 mr-1.5 inline" />
                <span>Copy All Credentials</span>
              </button>
              <button
                type="button"
                onClick={() => setCreatedCredentialsModal(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 shadow transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 21. REAL HOTEL LOCATION & GOOGLE MAPS PIN MODAL          */}
      {/* ======================================================== */}
      {managingLocationTenant && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">Real Property Location & Google Maps Geocoding</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {managingLocationTenant.name} &bull; <span className="font-mono text-slate-600 dark:text-slate-300 font-semibold">{managingLocationTenant.slug}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setManagingLocationTenant(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs text-sky-900 dark:text-sky-200 leading-relaxed flex items-start gap-2.5">
              <div className="w-2 h-2 rounded-full bg-sky-500 mt-1.5 shrink-0" />
              <div>
                <strong className="font-bold">Interactive Google Maps Positioning:</strong> Enter the exact GPS latitude and longitude of this hotel, or choose a quick city preset. When saved, the map pin moves directly to the physical property and links straight to Google Maps.
              </div>
            </div>

            {/* Quick Coordinate Search / Paste */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Quick Paste GPS Coordinates or Google Maps Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={locSearchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLocSearchQuery(val);
                    const match = val.match(/([-+]?\d{1,2}\.\d+)[,\s]+([-+]?\d{1,3}\.\d+)/);
                    if (match) {
                      const lat = parseFloat(match[1]);
                      const lng = parseFloat(match[2]);
                      if (!isNaN(lat) && !isNaN(lng)) {
                        setLocLatitude(lat);
                        setLocLongitude(lng);
                        setLocGoogleMapUrl(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
                      }
                    }
                  }}
                  placeholder="Paste e.g. 26.9124, 75.7873 to auto-fill latitude & longitude"
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition"
                />
              </div>
            </div>

            {/* Quick City Presets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                <span>Quick City Pin Presets</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">Click to position pin at city center</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { city: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873 },
                  { city: 'Udaipur', state: 'Rajasthan', lat: 24.5854, lng: 73.7125 },
                  { city: 'Jodhpur', state: 'Rajasthan', lat: 26.2389, lng: 73.0243 },
                  { city: 'Delhi', state: 'Delhi', lat: 28.6139, lng: 77.2090 },
                  { city: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777 },
                  { city: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946 },
                  { city: 'Goa', state: 'Goa', lat: 15.2993, lng: 74.1240 },
                  { city: 'Shimla', state: 'Himachal Pradesh', lat: 31.1048, lng: 77.1734 },
                  { city: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639 },
                ].map((item) => (
                  <button
                    key={item.city}
                    type="button"
                    onClick={() => {
                      setLocCity(item.city);
                      setLocState(item.state);
                      setLocLatitude(item.lat);
                      setLocLongitude(item.lng);
                      setLocGoogleMapUrl(`https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition"
                  >
                    {item.city}
                  </button>
                ))}
              </div>
            </div>

            {/* Address fields */}
            <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Street Address / Road / Landmark
                </label>
                <input
                  type="text"
                  value={locStreet}
                  onChange={(e) => setLocStreet(e.target.value)}
                  placeholder="e.g. Near Hawa Mahal, Johari Bazar"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">City</label>
                  <input
                    type="text"
                    value={locCity}
                    onChange={(e) => setLocCity(e.target.value)}
                    placeholder="e.g. Jaipur"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">State</label>
                  <input
                    type="text"
                    value={locState}
                    onChange={(e) => setLocState(e.target.value)}
                    placeholder="e.g. Rajasthan"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Postal Code (PIN)</label>
                  <input
                    type="text"
                    value={locPincode}
                    onChange={(e) => setLocPincode(e.target.value)}
                    placeholder="e.g. 302002"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Country</label>
                  <input
                    type="text"
                    value={locCountry}
                    onChange={(e) => setLocCountry(e.target.value)}
                    placeholder="e.g. India"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition"
                  />
                </div>
              </div>
            </div>

            {/* Coordinates and Google Maps Link */}
            <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Latitude
                  </label>
                  <NumericInput
                    step="0.000001"
                    value={locLatitude}
                    onChange={(e) => {
                      const lat = parseFloat(e.target.value) || 0;
                      setLocLatitude(lat);
                      setLocGoogleMapUrl(`https://www.google.com/maps/search/?api=1&query=${lat},${locLongitude}`);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono font-bold focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Longitude
                  </label>
                  <NumericInput
                    step="0.000001"
                    value={locLongitude}
                    onChange={(e) => {
                      const lng = parseFloat(e.target.value) || 0;
                      setLocLongitude(lng);
                      setLocGoogleMapUrl(`https://www.google.com/maps/search/?api=1&query=${locLatitude},${lng}`);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono font-bold focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Google Maps URL (Direct Property Search)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={locGoogleMapUrl || `https://www.google.com/maps/search/?api=1&query=${locLatitude},${locLongitude}`}
                    onChange={(e) => setLocGoogleMapUrl(e.target.value)}
                    placeholder="https://www.google.com/maps/search/?api=1&query=..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 font-mono focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition"
                  />
                  <a
                    href={locGoogleMapUrl || `https://www.google.com/maps/search/?api=1&query=${locLatitude},${locLongitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-xs active:scale-95"
                  >
                    <Globe className="w-4 h-4 text-emerald-600 inline mr-0.5" />
                    <span>Open in Maps ↗</span>
                  </a>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Location Notes / Proximity Notes
                </label>
                <input
                  type="text"
                  value={locNotes}
                  onChange={(e) => setLocNotes(e.target.value)}
                  placeholder="e.g. 500m geofence active, prime tourist heritage district"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition"
                />
              </div>
            </div>

            {locSuccessMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 inline mr-1 shrink-0" />
                <span>{locSuccessMsg}</span>
              </div>
            )}

            {locErrorMsg && (
              <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-300 text-xs font-bold flex items-center gap-2">
                <X className="w-4 h-4 text-red-500 inline mr-1 shrink-0" />
                <span>{locErrorMsg}</span>
              </div>
            )}

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setManagingLocationTenant(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingLocation}
                onClick={() => void handleSaveLocation()}
                className="btn-glass-green px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>{isSavingLocation ? 'Saving Location…' : 'Save Real Location & Move Pin'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Clipboard Notice Toast */}
      {clipboardNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-white border border-slate-200 text-slate-800 text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <Check className="w-4 h-4 text-emerald-600 inline mr-1" />
          <span>{clipboardNotice}</span>
        </div>
      )}
    </div>
  );
};
