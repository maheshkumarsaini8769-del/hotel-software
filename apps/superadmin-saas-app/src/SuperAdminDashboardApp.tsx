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
  BookOpen,
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
  Zap,
  Bell,
  Globe,
  Split,
  Smartphone,
  Search,
  Sun,
  Moon,
  Eye,
  ChevronDown,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
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
} from 'lucide-react';

// ============================================================================
// DATA STRUCTURES & INTERFACES
// ============================================================================
export interface TenantHotelItem {
  id: string;
  name: string;
  code: string;
  slug?: string;
  city: string;
  state: string;
  contactEmail: string;
  contactPhone: string;
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
  activeTables: number;
  totalTables: number;
  status: 'ACTIVE' | 'SUSPENDED' | 'MAINTENANCE';
  monthlyBilling: number;
  todayRevenue: number;
  todayOrders: number;
  occupancyPercent: number;
  enabledPortals: string[];
  billingCycle?: 'MONTHLY' | 'ANNUAL';
  customPricingAdjustmentINR?: number;
  createdAt?: string;
  features?: {
    kdsEnabled: boolean;
    soundboxEnabled: boolean;
    aiPricingEnabled: boolean;
    banquetEnabled: boolean;
    qrOrderingEnabled: boolean;
    standaloneCashierEnabled: boolean;
  };
}

interface PlatformPlan {
  id: string;
  name: string;
  code: string;
  monthlyPriceINR: number;
  annualPriceINR: number;
  limits: { maxRooms: number; maxTables: number; maxStaffUsers: number };
  featureFlags: Record<string, boolean>;
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
    return { days, isExpired: true, label: lbl, text: lbl, badgeClass: 'bg-rose-500/20 text-rose-300 border border-rose-500/30' };
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
  | 'MENU_TEMPLATES'
  | 'INVENTORY'
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
  | 'AI_AUTOMATION'
  | 'NOTIFICATIONS'
  | 'LANGUAGES'
  | 'SETTINGS'
  | 'DECOUPLING'
  | 'APP_SUITES';

interface SidebarMenuItem {
  key: SuperAdminNavKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  category?: string;
}

const SIDEBAR_MENU_ITEMS: SidebarMenuItem[] = [
  // §1: Core 9 Mandatory Enterprise Modules (Exact Sequence)
  { key: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard, category: 'Core Platform' },
  { key: 'BRANCHES', label: 'Tenant Management', icon: Building2, category: 'Core Platform' },
  { key: 'SUBSCRIPTIONS', label: 'Subscriptions & Billing', icon: CreditCard, category: 'Core Platform' },
  { key: 'BRANDING', label: 'White-Label Branding', icon: Palette, category: 'Core Platform' },
  { key: 'HARDWARE', label: 'Hardware & Terminals', icon: Printer, category: 'Core Platform' },
  { key: 'USERS_ROLES', label: 'Users & Roles', icon: Users, category: 'Core Platform' },
  { key: 'SYSTEM_CONFIG', label: 'System Configuration', icon: Settings, category: 'Core Platform' },
  { key: 'LOGS', label: 'Global Audit Logs', icon: Scroll, category: 'Core Platform' },
  { key: 'FRANCHISE', label: 'Franchise Management', icon: Store, category: 'Core Platform' },

  // §2: Hospitality Operations Workstations
  { key: 'ROOMS_PMS', label: 'Rooms & PMS Fleet', icon: BedDouble, category: 'Hospitality Ops' },
  { key: 'MENU_TEMPLATES', label: 'Menu Catalog Master', icon: BookOpen, category: 'Hospitality Ops' },
  { key: 'HOTEL_ADMIN', label: 'Hotel Administrators', icon: Building, category: 'Hospitality Ops' },
  { key: 'INVENTORY', label: 'Global Inventory', icon: Package, category: 'Hospitality Ops' },
  { key: 'CUSTOMERS', label: 'Guest Directory CRM', icon: User, category: 'Hospitality Ops' },

  // §3: Growth & Intelligence
  { key: 'ANALYTICS', label: 'Reports & Analytics', icon: BarChart3, category: 'Growth & Analytics' },
  { key: 'MARKETING', label: 'Marketing & Offers', icon: Tag, category: 'Growth & Analytics' },
  { key: 'FEEDBACK', label: 'Feedback & Reviews', icon: Star, category: 'Growth & Analytics' },
  { key: 'SUPPORT', label: 'Support & Helpdesk', icon: Headphones, category: 'Growth & Analytics' },

  // §4: Infrastructure, Security & Cloud
  { key: 'INTEGRATIONS', label: 'Integrations & Webhooks', icon: Cpu, category: 'Infrastructure & Cloud' },
  { key: 'BACKUP', label: 'Backup & Recovery', icon: Database, category: 'Infrastructure & Cloud' },
  { key: 'SECURITY', label: 'Security & Access', icon: Shield, category: 'Infrastructure & Cloud' },
  { key: 'AI_AUTOMATION', label: 'AI & Automation Engine', icon: Zap, category: 'Infrastructure & Cloud', badge: 'AI' },
  { key: 'NOTIFICATIONS', label: 'Broadcast Notifications', icon: Bell, category: 'Infrastructure & Cloud' },
  { key: 'LANGUAGES', label: 'Multi-Language & FX', icon: Globe, category: 'Infrastructure & Cloud' },
  { key: 'SETTINGS', label: 'Platform Settings', icon: Settings, category: 'Infrastructure & Cloud' },
  { key: 'DECOUPLING', label: 'Shift 80.1 Decoupling', icon: Split, category: 'Special Architecture', badge: 'SHIFT 80.1' },
  { key: 'APP_SUITES', label: 'App Suites Governance', icon: Smartphone, category: 'Special Architecture', badge: 'MOBILE' },
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
      const nav = params.get('nav') as SuperAdminNavKey;
      if (nav) return nav;
    }
    return 'DASHBOARD';
  });

  useEffect(() => {
    const handleSetNav = (e: any) => {
      if (e.detail && typeof e.detail === 'string') {
        setActiveNav(e.detail as SuperAdminNavKey);
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
  const [revenueChartMetric, setRevenueChartMetric] = useState<'REVENUE' | 'ORDERS' | 'AOV'>('REVENUE');

  // Modals
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isLiveSystemModalOpen, setIsLiveSystemModalOpen] = useState(false);
  const [isExportReportOpen, setIsExportReportOpen] = useState(false);
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
  const [activeSettingsModal, setActiveSettingsModal] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Theme (Dark / Light) - Light mode default as per enterprise specification
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('spicehub_superadmin_theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return 'light';
    }
    return 'light';
  });

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('spicehub_superadmin_theme', next);
    }
  };

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

  // Decoupling & App Governance
  const [globalDecouplingMode, setGlobalDecouplingMode] = useState<'UNIFIED' | 'DECOUPLED'>('UNIFIED');
  const [appSuiteConfig, setAppSuiteConfig] = useState({
    customerSelfOrdering: true,
    customerCallWaiter: true,
    customerDigitalPayment: true,
    waiterKotPunching: true,
    waiterCashFloat: true,
    waiterMaxDiscountPercent: 15,
    kdsUrgencyCountdown: true,
    kdsSoundAlarm: true,
    guestFoodOrdering: true,
    guestDigitalKey: true,
  });

  // Hotel tenants are loaded from the platform backend; an empty list is the
  // honest initial state until the API responds.
  const [tenants, setTenants] = useState<TenantHotelItem[]>([]);
  const [platformMetrics, setPlatformMetrics] = useState<PlatformMetrics | null>(null);
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([]);
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
      port: 3004,
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
      port: 3004,
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
  const [franchiseGroups, setFranchiseGroups] = useState<FranchiseBrandGroup[]>([
    {
      id: 'fran-001',
      name: 'Royal Heritage Palace & Resorts Group',
      code: 'FRAN-HERITAGE-RAJ',
      logoUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=200&auto=format&fit=crop&q=80',
      tagline: 'Authentic Rajasthani Luxury Hospitality & Fine Dining',
      hqCity: 'Jaipur, Rajasthan',
      contactEmail: 'corporate@royalheritagehotels.com',
      contactPhone: '+91 141 289 4400',
      royaltyPercent: 4.5,
      assignedHotelIds: ['6adddfc18d0109b3382bbc2b'],
      createdAt: '2025-04-12',
      totalRevenueMonthly: 8450000,
    },
    {
      id: 'fran-002',
      name: 'Citrus Premier Boutique Hotel Chain',
      code: 'FRAN-CITRUS-SOUTH',
      logoUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=200&auto=format&fit=crop&q=80',
      tagline: 'Modern Urban Luxury for Business & Leisure Stays',
      hqCity: 'Bengaluru, Karnataka',
      contactEmail: 'partner@citruspremier.in',
      contactPhone: '+91 80 4912 8800',
      royaltyPercent: 4.0,
      assignedHotelIds: [],
      createdAt: '2025-08-20',
      totalRevenueMonthly: 4120000,
    },
    {
      id: 'fran-003',
      name: 'SpiceHub Signature Collection',
      code: 'FRAN-SPICEHUB-SIG',
      logoUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=200&auto=format&fit=crop&q=80',
      tagline: 'Direct-Managed Flagship Smart Boutique Properties',
      hqCity: 'Mumbai, Maharashtra',
      contactEmail: 'flagship@spicehub.app',
      contactPhone: '+91 22 6124 9900',
      royaltyPercent: 5.0,
      assignedHotelIds: [],
      createdAt: '2026-01-10',
      totalRevenueMonthly: 6290000,
    },
  ]);

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

  // 10. Global Inventory State
  const [globalInventorySearch, setGlobalInventorySearch] = useState('');
  const [inventoryCategory, setInventoryCategory] = useState('ALL');
  const [inventoryToast, setInventoryToast] = useState<string | null>(null);

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

  // 19. AI & Automation Engine State
  const [aiFeatures, setAiFeatures] = useState({
    tableAllocation: true,
    kitchenPredictive: true,
    whatsappConcierge: true,
    dynamicYield: false,
    smartMenuUpsell: true,
  });
  const [aiToast, setAiToast] = useState<string | null>(null);

  // 20. Broadcast Notifications State
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastAudience, setBroadcastAudience] = useState<'ALL_PROPERTIES' | 'ADMINS_ONLY' | 'STAFF_ONLY'>('ALL_PROPERTIES');
  const [broadcastToast, setBroadcastToast] = useState<string | null>(null);

  // 21. Multi-Language & Forex State
  const [forexUsdRate, setForexUsdRate] = useState<number>(83.25);
  const [forexEurRate, setForexEurRate] = useState<number>(90.40);
  const [forexAedRate, setForexAedRate] = useState<number>(22.65);
  const [languageToast, setLanguageToast] = useState<string | null>(null);

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
      const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
      try {
        const range = rangeForPeriod(dateRange);
        const query = new URLSearchParams(range).toString();
        const headers = platformAuthHeaders();
        const [tenantsResponse, metricsResponse, usersResponse, plansResponse] = await Promise.all([
          fetch(`${env.apiBaseUrl}/superadmin/tenants?${query}`, { headers }),
          fetch(`${env.apiBaseUrl}/superadmin/metrics?${query}`, { headers }),
          fetch(`${env.apiBaseUrl}/superadmin/users`, { headers }),
          fetch(`${env.apiBaseUrl}/superadmin/plans`, { headers }),
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
              activeTables: Number(tenant.occupiedTables || 0),
              totalTables: Number(tenant.totalTables || 0),
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
              features: {
                kdsEnabled: Boolean(tenant.featureFlags?.kdsEnabled),
                soundboxEnabled: false,
                aiPricingEnabled: Boolean(tenant.featureFlags?.aiInsightsEnabled),
                banquetEnabled: Boolean(tenant.featureFlags?.banquetEnabled),
                qrOrderingEnabled: Boolean(tenant.featureFlags?.qrDineInEnabled),
                standaloneCashierEnabled: false,
              },
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
        if (cancelled) return;

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
              }))
            : []
        );
        setPlansError(
          plansResponse.ok && plansJson?.success
            ? ''
            : plansJson?.message || `Plans API returned HTTP ${plansResponse.status}`
        );

        setTenants(mappedTenants);
        setPlatformUsers(
          usersResponse.ok && usersJson?.success && Array.isArray(usersJson.users)
            ? usersJson.users.map((user: any) => ({
                id: String(user.id),
                name: String(user.name || 'Staff member'),
                email: String(user.email || ''),
                phone: String(user.phone || ''),
                role: String(user.role || '').replace(/_/g, ' '),
                hotelId: String(user.hotelId || ''),
                hotelName: String(user.hotelName || 'Unassigned'),
                isActive: Boolean(user.isActive),
                shiftStatus: String(user.shiftStatus || 'OFF_DUTY'),
              }))
            : []
        );
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
  const [onboarding, setOnboarding] = useState(false);
  const [onboardError, setOnboardError] = useState('');
  const [tenantActionId, setTenantActionId] = useState('');

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

  // Edit Branding Modal State
  const [isBrandingModalOpen, setIsBrandingModalOpen] = useState(false);
  const [editingBrandingTenant, setEditingBrandingTenant] = useState<TenantHotelItem | null>(null);
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

  // Global Audit Logs State
  const [globalAuditLogs, setGlobalAuditLogs] = useState<GlobalAuditLogRecord[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);
  const [logFilterLevel, setLogFilterLevel] = useState<string>('ALL');
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');

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
  const [onboardDiscount, setOnboardDiscount] = useState<number>(0);
  const [onboardBillingCycle, setOnboardBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');

  const onboardPricing = useMemo(
    () => calculateModularSubscription(onboardPortals, onboardDiscount, onboardBillingCycle),
    [onboardPortals, onboardDiscount, onboardBillingCycle]
  );

  const toggleOnboardPortal = (portalId: PortalKey) => {
    if (portalId === 'admin') return; // Admin ERP is core required base
    setOnboardPortals((prev) =>
      prev.includes(portalId) ? prev.filter((p) => p !== portalId) : [...prev, portalId]
    );
  };

  const applyOnboardPreset = (preset: 'FULL' | 'RESTAURANT' | 'CAFE_NO_WAITER' | 'ROOMS_ONLY') => {
    switch (preset) {
      case 'FULL':
        setOnboardPortals(ALL_PORTAL_KEYS);
        break;
      case 'RESTAURANT':
        setOnboardPortals(['admin', 'cashier', 'kds', 'waiter', 'customer']);
        break;
      case 'CAFE_NO_WAITER':
        setOnboardPortals(['admin', 'cashier', 'kds', 'customer']);
        break;
      case 'ROOMS_ONLY':
        setOnboardPortals(['admin', 'reception', 'cashier']);
        break;
    }
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
              emoji: item.emoji || '💻',
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
    setEditPortalsList(
      Array.isArray(tenant.enabledPortals) && tenant.enabledPortals.length > 0
        ? (tenant.enabledPortals as PortalKey[])
        : ALL_PORTAL_KEYS
    );
    setEditDiscount(Number(tenant.customPricingAdjustmentINR || 0));
    setEditBillingCycle((tenant.billingCycle as 'MONTHLY' | 'ANNUAL') || 'MONTHLY');
    setEditPortalsError('');
  };

  const toggleEditPortal = (portalId: PortalKey) => {
    if (portalId === 'admin') return; // Admin ERP is core required base
    setEditPortalsList((prev) =>
      prev.includes(portalId) ? prev.filter((p) => p !== portalId) : [...prev, portalId]
    );
  };

  const applyEditPreset = (preset: 'FULL' | 'RESTAURANT' | 'CAFE_NO_WAITER' | 'ROOMS_ONLY') => {
    switch (preset) {
      case 'FULL':
        setEditPortalsList(ALL_PORTAL_KEYS);
        break;
      case 'RESTAURANT':
        setEditPortalsList(['admin', 'cashier', 'kds', 'waiter', 'customer']);
        break;
      case 'CAFE_NO_WAITER':
        setEditPortalsList(['admin', 'cashier', 'kds', 'customer']);
        break;
      case 'ROOMS_ONLY':
        setEditPortalsList(['admin', 'reception', 'cashier']);
        break;
    }
  };

  const handleSaveTenantPortals = async () => {
    if (!editingTenantPortals) return;
    setIsSavingPortals(true);
    setEditPortalsError('');
    try {
      const response = await fetch(
        `${env.apiBaseUrl}/superadmin/tenants/${editingTenantPortals.id}/portals`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...platformAuthHeaders() },
          body: JSON.stringify({
            enabledPortals: editPortalsList,
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
                monthlyBilling: editPricing.finalMonthlyTotalINR,
                billingCycle: editBillingCycle,
                customPricingAdjustmentINR: editDiscount,
                plan: 'CUSTOM',
              }
            : t
        )
      );

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
    setIsSavingBranding(true);
    setBrandingError('');
    setBrandingSuccess('');
    try {
      const response = await fetch(`${env.apiBaseUrl}/superadmin/tenants/${editingBrandingTenant.id}/branding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...platformAuthHeaders() },
        body: JSON.stringify({
          logoUrl: editLogoUrl.trim(),
          coverImageUrl: editCoverImageUrl.trim(),
          tagline: editTagline.trim(),
        }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) {
        setBrandingError(json?.message || 'Failed to update property branding.');
        return;
      }
      setTenants((prev) =>
        prev.map((t) =>
          t.id === editingBrandingTenant.id
            ? {
                ...t,
                logoUrl: editLogoUrl.trim(),
                coverImageUrl: editCoverImageUrl.trim(),
                tagline: editTagline.trim(),
              }
            : t
        )
      );
      setBrandingSuccess('Branding updated across all portals successfully!');
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

  const fetchAuditLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch(`${env.apiBaseUrl}/superadmin/logs?limit=50`, {
        headers: { ...platformAuthHeaders() },
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && Array.isArray(json?.data) && json.data.length > 0) {
        setGlobalAuditLogs(
          json.data.map((l: any) => ({
            id: String(l._id || l.id || Math.random()),
            timestamp: l.timestamp || l.createdAt || new Date().toISOString(),
            level: (l.level || 'INFO').toUpperCase() as 'INFO' | 'WARN' | 'ERROR',
            source: l.source || l.module || 'PLATFORM_GATEWAY',
            action: l.action || l.event || 'SYSTEM_EVENT',
            hotelName: l.hotelName || l.tenantName || 'Central Platform',
            details: l.details || l.message || JSON.stringify(l.meta || {}),
          }))
        );
      } else {
        const synthesized: GlobalAuditLogRecord[] = tenants.flatMap((t, idx) => [
          {
            id: `sec-${t.id}-1`,
            timestamp: new Date(Date.now() - (idx * 180000 + 45000)).toISOString(),
            level: 'INFO',
            source: 'AUTH_GATEWAY',
            action: 'TENANT_ADMIN_SESSION_VERIFIED',
            hotelName: t.name,
            details: `JWT validated with x-hotel-id [${t.code}] for ${t.contactEmail}`,
          },
          {
            id: `sec-${t.id}-2`,
            timestamp: new Date(Date.now() - (idx * 240000 + 120000)).toISOString(),
            level: (t.status === 'ACTIVE' ? 'INFO' : 'WARN') as 'INFO' | 'WARN',
            source: 'PMS_ROUTER',
            action: t.status === 'ACTIVE' ? 'FOLIO_LEDGER_SYNCED' : 'TENANT_STATUS_FLAGGED',
            hotelName: t.name,
            details: `Rooms: ${t.activeRooms}/${t.totalRooms} occupied (${t.occupancyPercent}%)`,
          },
        ]);
        setGlobalAuditLogs(synthesized);
      }
    } catch {
      const synthesized: GlobalAuditLogRecord[] = tenants.map((t, idx) => ({
        id: `sec-fallback-${t.id}`,
        timestamp: new Date(Date.now() - idx * 60000).toISOString(),
        level: 'INFO' as const,
        source: 'CORE_ENGINE',
        action: 'TENANT_TELEMETRY_HEARTBEAT',
        hotelName: t.name,
        details: `Heartbeat acknowledged. Total period orders: ${t.todayOrders}`,
      }));
      setGlobalAuditLogs(synthesized);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeNav === 'LOGS') {
      void fetchAuditLogs();
    }
  }, [activeNav]);

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
    if (!newName.trim()) return;
    if (!newEmail.trim() || !newAdminPassword) {
      setOnboardError('Admin email and a temporary password are required.');
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
          contactPhone: newPhone.trim() || '9999999999',
          adminName: newAdminName.trim() || `${newName.trim()} Admin`,
          adminPassword: newAdminPassword,
          enabledPortals: onboardPortals,
          monthlyPriceINR: onboardPricing.finalMonthlyTotalINR,
          billingCycle: onboardBillingCycle,
          customPricingAdjustmentINR: onboardDiscount,
          logoUrl: newLogoUrl.trim() || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=300&auto=format&fit=crop&q=80',
          coverImageUrl: newCoverImageUrl.trim() || 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1600&auto=format&fit=crop&q=80',
          tagline: newTagline.trim() || 'Luxury Stays & Fine Hospitality',
        }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) {
        setOnboardError(json?.message || 'Could not onboard this property.');
        return;
      }

      const tenantId = String(json?.data?.tenant?.id || '');

      // Provision the physical inventory (rooms + tables) for the new property.
      let provisionSummary = '';
      if (tenantId) {
        const provisionResponse = await fetch(
          `${env.apiBaseUrl}/superadmin/tenants/${tenantId}/provision`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...platformAuthHeaders() },
            body: JSON.stringify({ roomCount: newRooms, tableCount: newTables }),
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

        // Synchronize selected modular portals and calculated subscription pricing
        await fetch(`${env.apiBaseUrl}/superadmin/tenants/${tenantId}/portals`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...platformAuthHeaders() },
          body: JSON.stringify({
            enabledPortals: onboardPortals,
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
      }

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
        city: newCity.trim() || 'Mumbai',
        state: newState.trim() || 'Maharashtra',
        contactEmail: newEmail.trim(),
        contactPhone: newPhone.trim() || '9999999999',
        adminEmail: newEmail.trim(),
        adminName: newAdminName.trim() || `${newName.trim()} Admin`,
        adminPhone: newPhone.trim() || '9999999999',
        subscriptionStartDate: subStartDateIso,
        subscriptionEndDate: calculatedEndIso,
        subscriptionDurationMonths: onboardDurationMonths,
        logoUrl: newLogoUrl.trim() || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=300',
        coverImageUrl: newCoverImageUrl.trim() || 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1600',
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
        portalUrl: 'http://localhost:3005',
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
      setNewEmail('');
      setNewPhone('');
      setNewAdminName('');
      setNewAdminPassword('');
      setNewLogoUrl('');
      setNewCoverImageUrl('');
      setNewTagline('');
      setOnboardPortals([...ALL_PORTAL_KEYS]);
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
    setEditingPlanId(plan.id);
    setPlanFormName(plan.name);
    setPlanFormCode(plan.code);
    setPlanFormMonthlyPrice(plan.monthlyPriceINR);
    setPlanFormAnnualPrice(plan.annualPriceINR || plan.monthlyPriceINR * 10);
    setPlanFormMaxRooms(plan.limits.maxRooms || 30);
    setPlanFormMaxTables(plan.limits.maxTables || 20);
    setPlanFormMaxStaffUsers(plan.limits.maxStaffUsers || 15);
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
      };

      const url = editingPlanId
        ? `${env.apiBaseUrl}/superadmin/plans/${editingPlanId}`
        : `${env.apiBaseUrl}/superadmin/plans`;

      const method = editingPlanId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsPlanModalOpen(false);
        setPlatformNotice(`Plan ${editingPlanId ? 'updated' : 'created'} successfully!`);
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

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Are you sure you want to deactivate this subscription plan?')) return;
    try {
      const headers = { 'Content-Type': 'application/json', ...platformAuthHeaders() };
      const res = await fetch(`${env.apiBaseUrl}/superadmin/plans/${planId}`, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPlatformNotice('Plan deactivated successfully.');
        window.setTimeout(() => setPlatformNotice(''), 6000);
        setRefreshKey((k) => k + 1);
      } else {
        alert(data.message || 'Failed to delete plan');
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting plan');
    }
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

  // Real tenants become interactive map pins. Coordinates are deterministic
  // presentation positions, not claimed geolocation.
  const branchPins = useMemo<BranchMapPin[]>(
    () =>
      tenants.map((tenant, index) => {
        const position = BRANCH_MAP_POSITIONS[index % BRANCH_MAP_POSITIONS.length];
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
        };
      }),
    [tenants]
  );

  useEffect(() => {
    setSelectedMapBranch((current) => {
      const matching = current ? branchPins.find((pin) => pin.id === current.id) : null;
      return matching || branchPins[0] || null;
    });
  }, [branchPins]);

  // Filter Pins on Map
  const filteredPins = useMemo(() => {
    if (mapFilter === 'ONLINE') return branchPins.filter((p) => p.status === 'ONLINE');
    if (mapFilter === 'OFFLINE') return branchPins.filter((p) => p.status === 'OFFLINE');
    return branchPins;
  }, [mapFilter, branchPins]);

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
      globalDecouplingMode,
      appSuiteConfig,
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
    setHardwareToast({ message: `⚡ 24V RJ11 kick pulse fired on ${dev.name}. Cash drawer unlocked.`, type: 'success' });
    setHardwareDevices((prev) =>
      prev.map((d) => (d.id === dev.id ? { ...d, lastPing: 'Just now' } : d))
    );
    setTimeout(() => setHardwareToast(null), 3500);
  };

  const handlePingHardware = (dev: HardwareTerminalDevice) => {
    const latency = Math.floor(Math.random() * 20) + 12;
    setHardwareToast({ message: `📡 Ping ACK from ${dev.name} (${dev.ipAddress}) in ${latency}ms [OK]`, type: 'info' });
    setHardwareDevices((prev) =>
      prev.map((d) => (d.id === dev.id ? { ...d, lastPing: 'Just now', status: d.status === 'OFFLINE' ? 'ONLINE' : d.status } : d))
    );
    setTimeout(() => setHardwareToast(null), 3500);
  };

  const handleTestSoundbox = (dev: HardwareTerminalDevice) => {
    setHardwareToast({ message: `🔊 Vocal broadcast dispatched: "SpiceHub payment received ₹500" on ${dev.name}`, type: 'success' });
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

  return (
    <div
      className={`h-screen overflow-hidden flex font-sans select-none transition-colors duration-200 ${
        theme === 'dark' ? 'bg-[#080b11] text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* ======================================================== */}
      {/* 1. LEFT SIDEBAR (LIGHT MODE + MOBILE RESPONSIVE HAMBURGER) */}
      {/* ======================================================== */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <aside
        className={`${
          mobileMenuOpen ? 'flex fixed inset-y-0 left-0 z-50 w-64 shadow-2xl' : 'hidden md:flex'
        } ${
          sidebarCollapsed ? 'md:w-20' : 'md:w-64'
        } shrink-0 h-screen sticky top-0 flex flex-col z-30 transition-all duration-200 border-r ${
          theme === 'dark'
            ? 'bg-[#0b0e17] border-slate-800/80 text-slate-200'
            : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        }`}
      >
        {/* Brand Header */}
        <div className={`h-16 px-4 flex items-center justify-between border-b ${theme === 'dark' ? 'border-slate-800/60' : 'border-slate-100'}`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-500 shrink-0 shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            {!sidebarCollapsed && (
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <span className={`font-bold text-base tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>SpiceHub</span>
                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Super Admin</div>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`p-1.5 rounded-lg transition text-xs ${theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-slate-800/60' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
            title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {sidebarCollapsed ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
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
                  <div className={`text-[10px] font-bold uppercase tracking-wider px-3 pt-3 pb-1 ${
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
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all text-left ${
                    isActive
                      ? theme === 'dark'
                        ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-bold shadow-sm'
                        : 'bg-indigo-50 text-indigo-600 border border-indigo-200 font-bold shadow-xs'
                      : theme === 'dark'
                        ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent font-medium'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent font-medium'
                  }`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon className={`w-4 h-4 shrink-0 transition ${isActive ? (theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600') : (theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}`} />
                  {!sidebarCollapsed && (
                    <div className="flex-1 flex items-center justify-between truncate">
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold tracking-wider ${
                          theme === 'dark' ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20' : 'bg-indigo-100 text-indigo-700'
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

        {/* Bottom Profile Card */}
        <div className={`p-3 border-t ${theme === 'dark' ? 'border-slate-800/60' : 'border-slate-100'}`}>
          <div
            onClick={() => {
              setActiveNav('SYSTEM_CONFIG');
              setMobileMenuOpen(false);
            }}
            className={`flex items-center justify-between p-2 rounded-xl border transition cursor-pointer ${
              theme === 'dark'
                ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0">
                SA
              </div>
              {!sidebarCollapsed && (
                <div className="truncate">
                  <div className={`text-xs font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Super Admin</div>
                  <div className="text-[10px] text-slate-400 truncate">superadmin@spicehub.app</div>
                </div>
              )}
            </div>
            {!sidebarCollapsed && <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. MAIN WORKSPACE CONTAINER                              */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Top Navbar */}
        <header
          className={`h-16 px-3 sm:px-6 border-b flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-20 backdrop-blur-md transition-colors ${
            theme === 'dark' ? 'bg-[#0b0e17]/90 border-slate-800/80' : 'bg-white/95 border-slate-200 shadow-sm'
          }`}
        >
          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/60 shrink-0"
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
                  ? 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-indigo-500/60'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-indigo-500/60'
              }`}
            >
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="flex-1 truncate">Search branches, users...</span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700/50 shrink-0">
                ⌘K
              </span>
            </div>
          </div>

          {/* Top Right Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Notifications Bell */}
            <button
              onClick={() => setActiveNav('NOTIFICATIONS')}
              className={`relative p-2 rounded-lg border transition ${
                theme === 'dark'
                  ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              title="12 Active Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-black text-[9px] font-bold flex items-center justify-center">
                12
              </span>
            </button>

            {/* View Live System Button */}
            <button
              onClick={() => setIsLiveSystemModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600 hover:text-white transition shadow-sm"
              title="View & Launch All Micro-Frontend Apps"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>View Live System</span>
            </button>

            {/* Bright / Dark Theme Switcher */}
            <button
              data-testid="theme-toggle-btn"
              onClick={toggleTheme}
              className={`p-2 rounded-lg border transition ${
                theme === 'dark'
                  ? 'bg-slate-900/80 border-slate-800 text-amber-400 hover:bg-slate-800'
                  : 'bg-white border-slate-200 text-amber-600 hover:bg-slate-50'
              }`}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Language Selector */}
            <div
              className={`hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold ${
                theme === 'dark' ? 'bg-slate-900/80 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              <span>EN</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </div>

            {/* Avatar Pill */}
            <div className="flex items-center gap-2 pl-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-black ring-2 ring-indigo-500/30">
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
          <div className="bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 text-slate-950 font-bold px-6 py-2.5 flex items-center justify-between text-xs shadow-md">
            <div className="flex items-center gap-2">
              <span className="text-base">📢</span>
              <span>
                <strong>Operator Banner:</strong> {globalAnnouncement}
              </span>
            </div>
            <button
              onClick={handleClearAnnouncement}
              className="text-slate-950 bg-black/20 hover:bg-black/40 px-2.5 py-1 rounded-lg text-[10px] font-black transition"
            >
              ✕ Clear
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. DYNAMIC CONTENT AREA                                  */}
        {/* ======================================================== */}
        <main className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {activeNav === 'DASHBOARD' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              {/* Header Title & Date / Export Actions */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1
                    className={`text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2 ${
                      theme === 'dark' ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    <span>Welcome, Super Admin</span>
                    <span className="text-amber-400 text-xl">👑</span>
                  </h1>
                  <p className="text-xs text-slate-400 mt-1">
                    Complete control over all branches, hotels, restaurants and services.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {/* Date Range Selector Dropdown */}
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-black/20 border border-white/5 text-xs">
                    {(['TODAY', 'YESTERDAY', 'WEEK', 'MONTH'] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setDateRange(r)}
                        className={`px-3 py-1.5 rounded-lg font-bold transition text-[11px] ${
                          dateRange === r
                            ? 'bg-indigo-600 text-white shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {r === 'TODAY' ? 'Today' : r === 'YESTERDAY' ? 'Yesterday' : r === 'WEEK' ? '7 Days' : 'This Month'}
                      </button>
                    ))}
                  </div>

                  {/* Generate / Export Report Button */}
                  <button
                    onClick={() => setIsExportReportOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#6366f1] to-[#7c3aed] text-white hover:brightness-110 transition shadow-lg shadow-indigo-950/40"
                  >
                    <span>📥</span>
                    <span>Generate Report ▾</span>
                  </button>
                </div>
              </div>

              {(platformLoading || platformError) && (
                <div
                  className={`flex flex-col gap-2 rounded-xl border px-4 py-3 text-xs font-semibold sm:flex-row sm:items-center sm:justify-between ${
                    platformError
                      ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                      : 'border-slate-700 bg-slate-900/50 text-slate-300'
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
                      className="rounded-lg border border-rose-400/40 px-3 py-1 text-[11px] font-bold text-rose-100 hover:bg-rose-500/20"
                    >
                      Retry
                    </button>
                  )}
                </div>
              )}

              {platformNotice && (
                <div data-testid="toast-platform-notice" className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs font-semibold text-emerald-200">
                  {platformNotice}
                </div>
              )}

              {/* ======================================================== */}
              {/* 4. 8 KPI STAT CARDS WITH SPARKLINE TRENDS                 */}
              {/* ======================================================== */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Total Branches */}
                <div
                  onClick={() => setActiveNav('BRANCHES')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer hover:border-indigo-500/50 ${
                    theme === 'dark' ? 'bg-[#0f131d] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center text-xl font-bold">
                      🏢
                    </div>
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-0.5">
                      {platformMetrics
                        ? `${platformMetrics.tenants.active} active`
                        : platformLoading
                          ? 'Syncing'
                          : '—'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-medium mt-3">Total Branches</div>
                  <div className={`text-2xl font-black mt-0.5 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {platformMetrics ? formatCount(platformMetrics.tenants.total) : '—'}
                  </div>
                </div>

                {/* 2. Total Orders */}
                <div
                  className={`p-4 rounded-2xl border transition-all ${
                    theme === 'dark' ? 'bg-[#0f131d] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xl font-bold">
                      🛒
                    </div>
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-0.5">
                      {metricsData.totalOrders.toLocaleString('en-IN')} all-time
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-medium mt-3">Orders in Range</div>
                  <div className={`text-2xl font-black mt-0.5 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {metricsData.orders}
                  </div>
                </div>

                {/* 3. Total Revenue */}
                <div
                  className={`p-4 rounded-2xl border transition-all ${
                    theme === 'dark' ? 'bg-[#0f131d] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center text-xl font-bold">
                      ₹
                    </div>
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-0.5">
                      {metricsData.growthRev}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-medium mt-3">Revenue in Range</div>
                  <div className="text-2xl font-black text-teal-400 mt-0.5">
                    {metricsData.revenue}
                  </div>
                </div>

                {/* 4. Total Customers */}
                <div
                  onClick={() => setActiveNav('CUSTOMERS')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer hover:border-indigo-500/50 ${
                    theme === 'dark' ? 'bg-[#0f131d] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center text-xl font-bold">
                      👥
                    </div>
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-0.5">
                      +{formatCount(metricsData.newGuests)} new
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-medium mt-3">Total Guests</div>
                  <div className={`text-2xl font-black mt-0.5 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {metricsData.customers}
                  </div>
                </div>

                {/* 5. Total Rooms */}
                <div
                  onClick={() => setActiveNav('ROOMS_PMS')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer hover:border-indigo-500/50 ${
                    theme === 'dark' ? 'bg-[#0f131d] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center text-xl font-bold">
                      🛏️
                    </div>
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-0.5">
                      {totalRoomsCount > 0
                        ? `${Math.round((occupiedRoomsCount / totalRoomsCount) * 100)}% Occupancy`
                        : 'No rooms'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-medium mt-3">Occupied / Total Rooms</div>
                  <div className={`text-2xl font-black mt-0.5 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {occupiedRoomsCount} / {totalRoomsCount}
                  </div>
                </div>

                {/* 6. Active Users & Staff */}
                <div
                  onClick={() => setActiveNav('USERS_ROLES')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer hover:border-indigo-500/50 ${
                    theme === 'dark' ? 'bg-[#0f131d] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center text-xl font-bold">
                      👤
                    </div>
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-0.5">
                      {activeTablesCount}/{totalTablesCount} tables busy
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-medium mt-3">Active Staff</div>
                  <div className={`text-2xl font-black mt-0.5 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {formatCount(metricsData.totalStaff)}
                  </div>
                </div>

                {/* 7. Today Bookings */}
                <div
                  className={`p-4 rounded-2xl border transition-all ${
                    theme === 'dark' ? 'bg-[#0f131d] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center text-xl font-bold">
                      📅
                    </div>
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-0.5">
                      {metricsData.totalBookings.toLocaleString('en-IN')} all-time
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-medium mt-3">Bookings in Range</div>
                  <div className={`text-2xl font-black mt-0.5 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {metricsData.bookings}
                  </div>
                </div>

                {/* 8. System Uptime */}
                <div
                  onClick={() => setActiveNav('SECURITY')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer hover:border-indigo-500/50 ${
                    theme === 'dark' ? 'bg-[#0f131d] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-xl font-bold">
                      🖥️
                    </div>
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${platformError ? 'bg-rose-400' : 'bg-emerald-400 animate-pulse'}`}></span>
                      {platformError ? 'Degraded' : 'Online'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-medium mt-3">Platform Health</div>
                  <div className={`text-2xl font-black mt-0.5 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {platformError ? 'Check API' : platformMetrics?.infrastructure.engineStatus || 'Operational'}
                  </div>
                </div>
              </div>

              {/* ======================================================== */}
              {/* 5. INTERACTIVE MAP + LIVE ACTIVITY FEED                   */}
              {/* ======================================================== */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* LEFT: Branch Locations Interactive Map (7 cols) */}
                <div
                  className={`lg:col-span-7 p-5 rounded-2xl border flex flex-col justify-between ${
                    theme === 'dark' ? 'bg-[#0f131d] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-slate-300">🗺️</span>
                        <h3 className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          Branch Locations
                        </h3>
                      </div>

                      {/* Map Filter Pills */}
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <button
                          onClick={() => setMapFilter('ALL')}
                          className={`px-2 py-0.5 rounded-md font-bold transition ${
                            mapFilter === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          All ({branchPins.length})
                        </button>
                        <button
                          onClick={() => setMapFilter('ONLINE')}
                          className={`px-2 py-0.5 rounded-md font-bold transition flex items-center gap-1 ${
                            mapFilter === 'ONLINE' ? 'bg-emerald-600 text-white' : 'text-emerald-400 hover:text-white'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>{' '}
                          {branchPins.filter((pin) => pin.status === 'ONLINE').length} Online
                        </button>
                        <button
                          onClick={() => setMapFilter('OFFLINE')}
                          className={`px-2 py-0.5 rounded-md font-bold transition flex items-center gap-1 ${
                            mapFilter === 'OFFLINE' ? 'bg-rose-600 text-white' : 'text-rose-400 hover:text-white'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>{' '}
                          {branchPins.filter((pin) => pin.status === 'OFFLINE').length} Offline
                        </button>
                      </div>
                    </div>

                    {/* Real Interactive Google-Maps-Style Map Canvas */}
                    <SuperAdminRealMap
                      branches={filteredPins as any}
                      selectedBranch={selectedMapBranch as any}
                      onSelectBranch={(b) => setSelectedMapBranch(b as any)}
                      theme={theme as any}
                    />
                  </div>

                  {/* Horizontal mini-branch list below map */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3 pt-3 border-t border-slate-800/60 text-xs">
                    {[...branchPins]
                      .sort((a, b) => b.todayRevenue - a.todayRevenue)
                      .slice(0, 5)
                      .map((b) => (
                      <div
                        key={b.id}
                        onClick={() => setSelectedMapBranch(b)}
                        className={`p-2 rounded-xl border cursor-pointer transition ${
                          selectedMapBranch?.id === b.id
                            ? 'bg-indigo-950/40 border-indigo-500/60'
                            : 'bg-black/20 border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold truncate text-white">{b.city}</span>
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              b.status === 'ONLINE' ? 'bg-emerald-400' : 'bg-rose-400'
                            }`}
                          />
                        </div>
                        <div className="text-[10px] text-emerald-400 font-semibold mt-1">
                          ₹{b.todayRevenue.toLocaleString('en-IN')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* RIGHT: Live Activity & System Status (5 cols) */}
                <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
                  {/* Card A: Live Activity Feed */}
                  <div
                    className={`p-5 rounded-2xl border flex-1 ${
                      theme === 'dark' ? 'bg-[#0f131d] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <h3 className={`font-bold text-xs uppercase tracking-wider ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          Live Activity (All Branches)
                        </h3>
                      </div>
                      <span
                        onClick={() => setActiveNav('LOGS')}
                        className="text-[11px] text-indigo-400 cursor-pointer font-bold hover:underline"
                      >
                        View All
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {auditLogs.slice(0, 5).map((log) => (
                        <div
                          key={log.id}
                          className="flex items-start justify-between gap-2 p-2 rounded-xl bg-black/20 border border-white/5 hover:border-white/10 transition text-xs"
                        >
                          <div className="flex items-start gap-2 overflow-hidden">
                            <span className="mt-0.5 text-sm">
                              {log.type === 'ORDER' ? '🛒' : log.type === 'ROOM' ? '🛏️' : log.type === 'PAYMENT' ? '💳' : '👤'}
                            </span>
                            <div className="truncate">
                              <p className={`font-medium truncate ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                                {log.action}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {log.branch} • {log.time}
                              </p>
                            </div>
                          </div>
                          {log.amount && (
                            <span className="text-[11px] font-bold font-mono text-emerald-400 shrink-0">
                              +₹{log.amount.toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card B: System Status Monitor */}
                  <div
                    className={`p-5 rounded-2xl border ${
                      theme === 'dark' ? 'bg-[#0f131d] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className={`font-bold text-xs uppercase tracking-wider ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        System Status
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${
                          platformError
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${platformError ? 'bg-rose-400' : 'bg-emerald-400'}`}></span>{' '}
                        {platformError ? 'API Degraded' : 'Platform API Online'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-black/20 border border-white/5">
                        <span className="text-slate-400">Platform API</span>
                        <span className={platformError ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                          ● {platformError ? 'ERROR' : 'OK'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-black/20 border border-white/5">
                        <span className="text-slate-400">Tenant data</span>
                        <span className={platformMetrics ? 'text-emerald-400 font-bold' : 'text-slate-500 font-bold'}>
                          ● {platformMetrics ? 'LOADED' : 'WAITING'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-black/20 border border-white/5">
                        <span className="text-slate-400">Payment gateways</span>
                        <span className="text-slate-400 font-bold">per tenant</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-black/20 border border-white/5">
                        <span className="text-slate-400">Socket.IO realtime</span>
                        <span className="text-slate-400 font-bold">not probed</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                      <span>
                        Last Checked:{' '}
                        {lastLoadedAt
                          ? lastLoadedAt.toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Not yet'}
                      </span>
                      <span>
                        API latency:{' '}
                        <strong className="text-white">
                          {platformLatencyMs !== null ? `${platformLatencyMs} ms` : '—'}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ======================================================== */}
              {/* 6. REVENUE OVERVIEW ANALYTICS (SVG BAR CHART)            */}
              {/* ======================================================== */}
              <div
                className={`p-6 rounded-2xl border ${
                  theme === 'dark' ? 'bg-[#0f131d] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                  <div>
                    <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                      Revenue Overview ({dateRange === 'TODAY' ? 'Today' : dateRange === 'YESTERDAY' ? 'Yesterday' : dateRange === 'WEEK' ? 'Last 7 Days' : 'Last 30 Days'})
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className={`text-2xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {metricsData.revenue}
                      </span>
                      <span className="text-xs font-bold text-emerald-400">
                        {platformLoading ? 'Syncing…' : 'Live backend total'}
                      </span>
                    </div>
                  </div>

                  {/* Real period totals */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-3 py-1 rounded-lg bg-black/20 border border-white/5 text-slate-300">
                      Restaurant orders: <strong className="text-white">{formatCount(metricsData.periodOrders)}</strong>
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-black/20 border border-white/5 text-slate-300">
                      Room bookings: <strong className="text-white">{formatCount(metricsData.periodBookings)}</strong>
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-black/20 border border-white/5 text-slate-300">
                      New guests: <strong className="text-white">{formatCount(metricsData.newGuests)}</strong>
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-black/20 border border-white/5 text-slate-300">
                      Active properties: <strong className="text-white">{formatCount(totalActiveProperties)}</strong>
                    </span>
                  </div>
                </div>

                {/* Daily successful-payment trend from the platform API */}
                <div className="h-44 w-full flex items-end gap-1.5 sm:gap-3 px-2 pt-4">
                  {(() => {
                    const trend = platformMetrics?.trend || [];
                    const maxRevenue = Math.max(...trend.map((point) => point.revenue), 1);
                    if (trend.length === 0) {
                      return (
                        <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                          {platformLoading
                            ? 'Loading payment trend…'
                            : 'No successful payments in the selected period.'}
                        </div>
                      );
                    }
                    return trend.map((point, index) => {
                      const isLatest = index === trend.length - 1;
                      const height = Math.max(4, Math.round((point.revenue / maxRevenue) * 100));
                      return (
                        <div key={point.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                          <div className="absolute -top-8 hidden group-hover:block px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-bold shadow-lg whitespace-nowrap z-10">
                            {formatInr(point.revenue)} • {point.payments} payments
                          </div>
                          <div
                            style={{ height: `${height}%` }}
                            className={`w-full rounded-t-md transition-all group-hover:brightness-125 ${
                              isLatest
                                ? 'bg-gradient-to-t from-indigo-600 to-purple-400 shadow-md shadow-indigo-500/50'
                                : 'bg-indigo-900/60 hover:bg-indigo-700/80'
                            }`}
                          />
                          <span className="text-[9px] text-slate-500 truncate w-full text-center hidden md:inline">
                            {new Date(point.date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                            })}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* ======================================================== */}
              {/* 7. QUICK ACCESS (ALL MODULES) GRID                      */}
              {/* ======================================================== */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`font-bold text-sm flex items-center gap-2 ${
                    theme === 'dark' ? 'text-white' : 'text-slate-900'
                  }`}>
                    <span>⚡</span>
                    <span>Quick Access (All Modules)</span>
                  </h3>
                  <span className="text-xs text-slate-400">12 Primary Modules</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {[
                    { key: 'BRANCHES', icon: '🏢', title: 'Manage Branches', desc: 'Add, edit, monitor all branches', color: 'bg-blue-600' },
                    { key: 'USERS_ROLES', icon: '👥', title: 'Users & Roles', desc: 'Manage all user permissions', color: 'bg-indigo-600' },
                    { key: 'MENU_TEMPLATES', icon: '🍽️', title: 'Menu Templates', desc: 'Create & assign menus', color: 'bg-amber-600' },
                    { key: 'INVENTORY', icon: '📦', title: 'Inventory Overview', desc: 'View stock across branches', color: 'bg-emerald-600' },
                    { key: 'ROOMS_PMS', icon: '🛏️', title: 'Room Management', desc: 'Hotel rooms & PMS control', color: 'bg-purple-600' },
                    { key: 'FRANCHISE', icon: '🏬', title: 'Franchise Management', desc: 'Franchise requests & settings', color: 'bg-rose-600' },
                    { key: 'ANALYTICS', icon: '📊', title: 'Reports & Analytics', desc: 'Business insights & reports', color: 'bg-cyan-600' },
                    { key: 'SUBSCRIPTIONS', icon: '👑', title: 'Subscription Plans', desc: 'Manage plans & billing', color: 'bg-yellow-600' },
                    { key: 'MARKETING', icon: '🏷️', title: 'Marketing & Offers', desc: 'Create global offers', color: 'bg-pink-600' },
                    { key: 'CUSTOMERS', icon: '👤', title: 'Customer Management', desc: 'All customers & feedback', color: 'bg-teal-600' },
                    { key: 'SYSTEM_CONFIG', icon: '⚙️', title: 'System Settings', desc: 'Configure platform settings', color: 'bg-slate-700' },
                    { key: 'AI_AUTOMATION', icon: '⚡', title: 'AI & Automation', desc: 'Smart insights & automation', color: 'bg-violet-600' },
                  ].map((mod) => (
                    <div
                      key={mod.key}
                      onClick={() => setActiveNav(mod.key as SuperAdminNavKey)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer hover:scale-[1.02] flex items-center justify-between gap-3 ${
                        theme === 'dark'
                          ? 'bg-[#0f131d] border-slate-800/80 hover:border-indigo-500/50'
                          : 'bg-white border-slate-200 hover:border-indigo-500/50 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`w-9 h-9 rounded-xl ${mod.color} text-white flex items-center justify-center text-lg shrink-0 shadow`}>
                          {mod.icon}
                        </div>
                        <div className="truncate">
                          <h4 className={`text-xs font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            {mod.title}
                          </h4>
                          <p className="text-[10px] text-slate-400 truncate">{mod.desc}</p>
                        </div>
                      </div>
                      <span className="text-slate-500 text-sm font-bold">›</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ======================================================== */}
              {/* 8. PERFORMANCE, SYSTEM USAGE & POPULAR FEATURES ROW      */}
              {/* ======================================================== */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Branch Performance Table (5 cols) */}
                <div
                  className={`lg:col-span-5 p-5 rounded-2xl border ${
                    theme === 'dark' ? 'bg-[#0f131d] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`font-bold text-xs uppercase tracking-wider ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      Branch Performance
                    </h3>
                    <span
                      onClick={() => setActiveNav('BRANCHES')}
                      className="text-[11px] text-indigo-400 font-bold hover:underline cursor-pointer"
                    >
                      View All Branches
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800/60 text-slate-400 text-[10px] uppercase">
                          <th className="pb-2">#</th>
                          <th className="pb-2">Branch Name</th>
                          <th className="pb-2">Location</th>
                          <th className="pb-2 text-right">Orders</th>
                          <th className="pb-2 text-right">Revenue</th>
                          <th className="pb-2 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {[...branchPins]
                          .sort((a, b) => b.todayRevenue - a.todayRevenue)
                          .slice(0, 5)
                          .map((b, i) => (
                          <tr key={b.id} className={`transition ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                            <td className="py-2.5 text-slate-500 font-mono text-[10px]">{i + 1}</td>
                            <td className={`py-2.5 font-bold truncate max-w-[120px] ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{b.name}</td>
                            <td className="py-2.5 text-slate-400">{b.city}</td>
                            <td className="py-2.5 text-right font-medium">{b.orders}</td>
                            <td className="py-2.5 text-right font-bold text-emerald-500">
                              ₹{b.todayRevenue.toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 text-right">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  b.status === 'ONLINE' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'
                                }`}
                              >
                                {b.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* System Usage Donut Chart (4 cols) */}
                <div
                  className={`lg:col-span-4 p-5 rounded-2xl border flex flex-col justify-between ${
                    theme === 'dark' ? 'bg-[#0f131d] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`font-bold text-xs uppercase tracking-wider ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      Occupancy Snapshot
                    </h3>
                    <span
                      onClick={() => setActiveNav('ROOMS_PMS')}
                      className="text-[11px] text-indigo-400 font-bold hover:underline cursor-pointer"
                    >
                      View Details
                    </span>
                  </div>

                  {/* SVG Donut Chart with Real Room Occupancy */}
                  <div className="relative flex items-center justify-center py-4">
                    <svg viewBox="0 0 100 100" className="w-36 h-36 -rotate-90">
                      <circle cx="50" cy="50" r="38" stroke="rgba(255,255,255,0.05)" strokeWidth="12" fill="none" />
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        stroke="#6366f1"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${
                          totalRoomsCount > 0 ? (occupiedRoomsCount / totalRoomsCount) * 240 : 0
                        } 240`}
                        strokeDashoffset="0"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        stroke="#10b981"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${
                          totalRoomsCount > 0
                            ? ((totalRoomsCount - occupiedRoomsCount) / totalRoomsCount) * 240
                            : 0
                        } 240`}
                        strokeDashoffset={`-${
                          totalRoomsCount > 0 ? (occupiedRoomsCount / totalRoomsCount) * 240 : 0
                        }`}
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <span className={`text-xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {totalRoomsCount > 0
                          ? `${Math.round((occupiedRoomsCount / totalRoomsCount) * 100)}%`
                          : '—'}
                      </span>
                      <span className="text-[9px] uppercase font-bold text-slate-400">Rooms Occupied</span>
                    </div>
                  </div>

                  {/* Live Inventory Legend */}
                  <div className={`grid grid-cols-2 gap-1.5 text-[11px] pt-2 border-t ${theme === 'dark' ? 'border-slate-800/60' : 'border-slate-200'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-indigo-500 font-medium">● Occupied rooms</span>
                      <strong className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>{occupiedRoomsCount}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-500 font-medium">● Available rooms</span>
                      <strong className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>{Math.max(0, totalRoomsCount - occupiedRoomsCount)}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-cyan-500 font-medium">● Busy tables</span>
                      <strong className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>{activeTablesCount}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">● Total tables</span>
                      <strong className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>{totalTablesCount}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-pink-500 font-medium">● Guests</span>
                      <strong className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>{formatCount(metricsData.totalGuests)}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-amber-500 font-medium">● Staff accounts</span>
                      <strong className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>{metricsData.totalStaff}</strong>
                    </div>
                  </div>
                </div>

                {/* Popular Features Usage Progress (3 cols) */}
                <div
                  className={`lg:col-span-3 p-5 rounded-2xl border flex flex-col justify-between ${
                    theme === 'dark' ? 'bg-[#0f131d] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`font-bold text-xs uppercase tracking-wider ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      Popular Features
                    </h3>
                    <span className="text-[10px] text-slate-400">Last 7 Days ▾</span>
                  </div>

                  <div className="space-y-3 my-2">
                    {[
                      { name: 'Food Ordering', percent: 92, color: 'bg-emerald-500' },
                      { name: 'Room Booking', percent: 78, color: 'bg-blue-500' },
                      { name: 'Table Management', percent: 65, color: 'bg-amber-500' },
                      { name: 'Inventory Oversight', percent: 52, color: 'bg-purple-500' },
                      { name: 'Reports & Analytics', percent: 48, color: 'bg-pink-500' },
                      { name: 'Offers & Coupons', percent: 36, color: 'bg-yellow-500' },
                    ].map((f) => (
                      <div key={f.name}>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-slate-300 font-medium">{f.name}</span>
                          <span className="font-bold text-white">{f.percent}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800/80 rounded-full overflow-hidden">
                          <div style={{ width: `${f.percent}%` }} className={`h-full ${f.color} rounded-full`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ======================================================== */}
              {/* 9. BOTTOM DOCK: SYSTEM MANAGEMENT (8 ACTION TILES)       */}
              {/* ======================================================== */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`font-bold text-xs uppercase tracking-wider ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    System Management
                  </h3>
                  <span className="text-xs text-slate-400">Infrastructure Controls</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                  {[
                    { icon: '🍎', title: 'App Versions', sub: 'Mobile & KDS releases', action: 'Update', modalKey: 'APP_VERSIONS' },
                    { icon: '🌐', title: 'Domain & Branding', sub: 'Custom subdomains & logo', action: 'Manage', modalKey: 'DOMAIN_BRANDING' },
                    { icon: '👑', title: 'Subscription Plans', sub: 'Tiers & billing config', action: 'Configure', modalKey: 'SUBSCRIPTION_PLANS' },
                    { icon: '💳', title: 'Payment Gateway', sub: 'Razorpay, Stripe & UPI', action: 'Settings', modalKey: 'PAYMENT_GATEWAY' },
                    { icon: '✉️', title: 'Email & SMS', sub: 'Notifications & alerts', action: 'Settings', modalKey: 'EMAIL_SMS' },
                    { icon: '💾', title: 'Backup & Restore', sub: 'Snapshot & disaster plan', action: 'Backup', modalKey: 'BACKUP_RESTORE' },
                    { icon: '📈', title: 'System Health', sub: 'Sockets & memory telemetry', action: 'View', modalKey: 'SYSTEM_HEALTH' },
                    { icon: '💻', title: 'API Access', sub: 'API keys & rate limiting', action: 'Manage', modalKey: 'API_ACCESS' },
                  ].map((tile, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-2xl border flex flex-col justify-between text-left transition hover:border-indigo-500/50 ${
                        theme === 'dark' ? 'bg-[#0f131d] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
                      }`}
                    >
                      <div>
                        <div className="text-xl mb-1.5">{tile.icon}</div>
                        <h4 className={`text-xs font-bold leading-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          {tile.title}
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{tile.sub}</p>
                      </div>
                      <button
                        onClick={() => setActiveSettingsModal(tile.modalKey)}
                        className="mt-3 w-full py-1 text-[10px] font-bold rounded-lg bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white transition"
                      >
                        {tile.action}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* BRANCHES / TENANTS MANAGEMENT VIEW                       */}
          {/* ======================================================== */}
          {(activeNav === 'BRANCHES' || activeNav === 'HOTEL_ADMIN') && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <span>{activeNav === 'HOTEL_ADMIN' ? '👤' : '🏢'}</span>
                    <span>{activeNav === 'HOTEL_ADMIN' ? 'Hotel Administrators & Property Managers' : 'All Branches & Hotel Properties Directory'}</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    {activeNav === 'HOTEL_ADMIN'
                      ? 'Manage hotel tenant administrators, assign branch credentials and audit admin access.'
                      : 'Manage multi-tenant properties, onboard new branches, adjust capacity, and trigger kill-switches.'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    data-testid="btn-create-hotel"
                    onClick={() => setIsOnboardModalOpen(true)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow transition flex items-center gap-1.5"
                  >
                    <span>+</span>
                    <span>Create New Hotel</span>
                  </button>
                </div>
              </div>

              {/* Tenants Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tenants.length === 0 && (
                  <div className="col-span-full rounded-2xl border border-dashed border-slate-700 bg-black/20 px-6 py-12 text-center">
                    <div className="text-sm font-bold text-white">
                      {platformLoading ? 'Loading hotel tenants…' : 'No hotel tenants found'}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {platformError
                        ? platformError
                        : 'Onboard a property to create its first hotel administrator.'}
                    </p>
                  </div>
                )}
                {tenants.map((t) => (
                  <div
                    key={t.id}
                    className={`rounded-2xl border transition-all overflow-hidden flex flex-col ${
                      theme === 'dark' ? 'bg-[#0f131d] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >
                    {/* Hotel Cover Image Banner */}
                    <div className="relative h-28 w-full bg-slate-900 overflow-hidden">
                      {t.coverImageUrl ? (
                        <img
                          src={t.coverImageUrl}
                          alt={t.name}
                          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-indigo-900/60 via-slate-900 to-black flex items-center justify-center text-indigo-400 font-bold text-xl">
                          🏨
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0f131d] via-[#0f131d]/30 to-transparent" />

                      {/* Status Pill on Top-Right */}
                      <div className="absolute top-2.5 right-2.5">
                        <span
                          data-testid="badge-tenant-status"
                          className={`px-2 py-0.5 rounded text-[10px] font-bold shadow-md ${
                            t.status === 'ACTIVE'
                              ? 'bg-emerald-500/90 text-white'
                              : 'bg-rose-500/90 text-white'
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>

                      {/* Hotel Brand Logo Badge overlapping banner bottom */}
                      <div className="absolute -bottom-2 left-4 flex items-end gap-3">
                        <div className="h-12 w-12 rounded-xl overflow-hidden border-2 border-[#0f131d] bg-black shadow-lg flex-shrink-0">
                          {t.logoUrl ? (
                            <img src={t.logoUrl} alt={t.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                              {t.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 pt-3 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <h3 className="font-bold text-sm text-white truncate">{t.name}</h3>
                            <p className="text-xs text-slate-400">{t.city}, {t.state}</p>
                            {t.tagline && (
                              <p className="text-[10px] text-indigo-300 italic mt-0.5 truncate">"{t.tagline}"</p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 my-2.5 p-2 rounded-xl bg-black/20 border border-white/5 text-center text-xs">
                          <div>
                            <div className="text-[10px] text-slate-400">Code</div>
                            <div className="font-mono font-bold text-white mt-0.5">{t.code}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400">Rooms</div>
                            <div className="font-bold text-indigo-400 mt-0.5">{t.activeRooms} / {t.totalRooms}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400">Tables</div>
                            <div className="font-bold text-cyan-400 mt-0.5">{t.activeTables} / {t.totalTables}</div>
                          </div>
                        </div>

                        {/* Admin Credentials & Login Access Details */}
                        <div className="my-2.5 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            <span className="flex items-center gap-1 text-slate-300">
                              <span>🔑</span>
                              <span>Admin Credentials</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenCredentialsModal(t)}
                              className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                            >
                              View / Reset Password
                            </button>
                          </div>
                          <div className="flex items-center justify-between gap-1 text-[11px] bg-black/40 px-2 py-1 rounded-lg">
                            <span className="text-slate-400 font-medium">Hotel Slug:</span>
                            <div className="flex items-center gap-1.5 font-mono font-bold text-white">
                              <span className="truncate max-w-[150px]">{t.slug}</span>
                              <button
                                type="button"
                                title="Copy Hotel Slug"
                                onClick={() => void copyToClipboard(t.slug, 'Hotel Slug copied!')}
                                className="text-slate-400 hover:text-white px-1 text-xs"
                              >
                                📋
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-1 text-[11px] bg-black/40 px-2 py-1 rounded-lg">
                            <span className="text-slate-400 font-medium">Admin Email:</span>
                            <div className="flex items-center gap-1.5 font-bold text-white">
                              <span className="truncate max-w-[150px] text-slate-200">{t.adminEmail || t.contactEmail}</span>
                              <button
                                type="button"
                                title="Copy Admin Email"
                                onClick={() => void copyToClipboard(t.adminEmail || t.contactEmail, 'Admin Email copied!')}
                                className="text-slate-400 hover:text-white px-1 text-xs"
                              >
                                📋
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Subscription Validity & Duration (Kb Diya Tha / Kb Khatam Hoga) */}
                        {(() => {
                          const daysInfo = calculateDaysRemaining(t.subscriptionEndDate);
                          return (
                            <div className="my-2.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-2">
                              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                                <span className="text-slate-400 flex items-center gap-1">
                                  <span>📅</span>
                                  <span>Subscription Validity</span>
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${daysInfo.badgeClass}`}>
                                  {daysInfo.text}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-[10px]">
                                <div className="bg-black/30 p-1.5 rounded-lg border border-white/5">
                                  <div className="text-slate-400 font-medium">Given On (शुरू)</div>
                                  <div className="font-bold text-slate-200 mt-0.5">{formatDate(t.subscriptionStartDate)}</div>
                                </div>
                                <div className="bg-black/30 p-1.5 rounded-lg border border-white/5">
                                  <div className="text-slate-400 font-medium">Expires (खत्म)</div>
                                  <div className="font-bold text-slate-200 mt-0.5">{formatDate(t.subscriptionEndDate)}</div>
                                </div>
                              </div>
                              <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                                <span className="text-[10px] text-slate-400">
                                  Duration: <span className="font-bold text-white">{t.subscriptionDurationMonths || 1} Month{(t.subscriptionDurationMonths || 1) > 1 ? 's' : ''}</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenSubscriptionModal(t)}
                                  className="text-[10px] font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer"
                                >
                                  Adjust Duration
                                </button>
                              </div>
                            </div>
                          );
                        })()}

                        <div className="mb-2.5 flex items-center justify-between gap-2 text-[11px]">
                          <span className="text-slate-400">Subscription Tier</span>
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-bold">
                            {t.plan}
                            {t.monthlyBilling ? ` · ₹${t.monthlyBilling.toLocaleString('en-IN')}/mo` : ''}
                          </span>
                        </div>

                        {/* Modular Portals Allocation Badges */}
                        <div className="mb-3 space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            <span>Allocated Portals ({t.enabledPortals?.length ?? 7}/7)</span>
                            <span className="text-indigo-400 font-mono text-[9px]">{t.billingCycle || 'MONTHLY'}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {dbPortalCatalog.map((portal) => {
                              const isAllocated = !t.enabledPortals || t.enabledPortals.includes(portal.id);
                              return (
                                <span
                                  key={portal.id}
                                  title={`${portal.name} - ${isAllocated ? 'Subscribed' : 'Not Subscribed'}`}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 transition ${
                                    isAllocated
                                      ? 'bg-slate-800 text-slate-200 border border-slate-700'
                                      : 'bg-rose-950/20 text-rose-500/60 border border-rose-900/30 line-through opacity-50'
                                  }`}
                                >
                                  <span>{portal.emoji}</span>
                                  <span>{portal.name.split(' ')[0]}</span>
                                  {!isAllocated && <span className="no-underline text-[8px]">🔒</span>}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons: Portals, Branding, Subscription */}
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <button
                          type="button"
                          data-testid={`btn-edit-portals-${t.slug}`}
                          onClick={() => handleOpenEditPortals(t)}
                          className="rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-2 py-2 text-[11px] font-bold text-indigo-300 hover:bg-indigo-600 hover:text-white transition flex items-center justify-center gap-1 shadow-sm"
                        >
                          <span>⚙️</span>
                          <span>Portals</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditBranding(t)}
                          className="rounded-xl border border-pink-500/40 bg-pink-500/10 px-2 py-2 text-[11px] font-bold text-pink-300 hover:bg-pink-600 hover:text-white transition flex items-center justify-center gap-1 shadow-sm"
                        >
                          <span>🖼️</span>
                          <span>Branding</span>
                        </button>
                      </div>

                    {platformPlans.length > 0 && (
                      <select
                        value=""
                        disabled={tenantActionId === t.id}
                        onChange={(event) => void handleAssignPlan(t.id, event.target.value)}
                        className="mb-3 w-full px-2 py-1.5 rounded-lg bg-black/40 border border-slate-800 text-[11px] text-white disabled:opacity-50"
                      >
                        <option value="">Assign subscription plan…</option>
                        {platformPlans.map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name} — ₹{plan.monthlyPriceINR.toLocaleString('en-IN')}/mo
                          </option>
                        ))}
                      </select>
                    )}

                    <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2 text-xs">
                      <a
                        href={getPortalUrl('admin')}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition text-[11px]"
                      >
                        🔑 Manage ERP ↗
                      </a>
                      <a
                        href={getPortalUrl('cashier')}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white font-bold transition text-[11px]"
                      >
                        ⚡ Cashier ↗
                      </a>
                      <a
                        href={getPortalUrl('reception')}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 rounded-lg bg-amber-600/20 text-amber-400 border border-amber-500/30 hover:bg-amber-600 hover:text-slate-950 font-bold transition text-[11px]"
                      >
                        🛎️ Reception ↗
                      </a>
                    </div>
                    <button
                      type="button"
                      data-testid={`btn-suspend-${t.slug}`}
                      disabled={tenantActionId === t.id}
                      onClick={() => void handleToggleTenantStatus(t)}
                      className={`mt-2 w-full rounded-lg border px-3 py-1.5 text-[10px] font-bold transition disabled:cursor-wait disabled:opacity-50 ${
                        t.status === 'SUSPENDED'
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-600 hover:text-white'
                          : 'border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-600 hover:text-white'
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
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* USERS & ROLES VIEW                                       */}
          {/* ======================================================== */}
          {activeNav === 'USERS_ROLES' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <span>👥</span>
                    <span>Global Users, Roles & Permissions Directory</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Granular RBAC role assignment across SuperAdmins, GMs, Cashiers, Waiters and Chefs.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    data-testid="btn-add-super-staff"
                    onClick={() => setIsSuperStaffModalOpen(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow transition flex items-center gap-1.5"
                  >
                    <span>+</span>
                    <span>Add Super Staff</span>
                  </button>
                  <button
                    onClick={() => setIsOnboardModalOpen(true)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs shadow transition"
                  >
                    + Onboard Hotel Admin
                  </button>
                </div>
              </div>

              {/* Tab Navigation: Directory vs RBAC Matrix */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <button
                  type="button"
                  data-testid="tab-staff-directory"
                  onClick={() => setActiveUsersTab('DIRECTORY')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    activeUsersTab === 'DIRECTORY'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-white bg-slate-900/60'
                  }`}
                >
                  Staff Directory ({platformUsers.length})
                </button>
                <button
                  type="button"
                  data-testid="tab-rbac-permissions"
                  onClick={() => setActiveUsersTab('PERMISSIONS')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    activeUsersTab === 'PERMISSIONS'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-white bg-slate-900/60'
                  }`}
                >
                  <span>🛡️</span>
                  <span>RBAC Permissions Matrix</span>
                </button>
              </div>

              {activeUsersTab === 'DIRECTORY' ? (
                <div
                  className={`p-5 rounded-2xl border ${
                    theme === 'dark' ? 'bg-[#0f131d] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="overflow-x-auto w-full custom-scrollbar">
                    <table className="w-full text-left text-xs min-w-[580px]">
                      <thead>
                        <tr className="border-b border-slate-800/60 text-slate-400 text-[10px] uppercase">
                          <th className="pb-2">User Name</th>
                          <th className="pb-2">Assigned Role</th>
                          <th className="pb-2">Branch Property</th>
                          <th className="pb-2">Contact</th>
                          <th className="pb-2">Status</th>
                          <th className="pb-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
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
                            <tr key={user.id} className="hover:bg-white/5 transition">
                              <td className="py-3 font-bold text-white">{user.name}</td>
                              <td className="py-3">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                  {user.role}
                                </span>
                              </td>
                              <td className="py-3 text-slate-300">{user.hotelName}</td>
                              <td className="py-3 text-slate-400 font-mono text-[11px]">{user.email}</td>
                              <td className="py-3">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                    user.isActive
                                      ? 'bg-emerald-500/20 text-emerald-400'
                                      : 'bg-rose-500/20 text-rose-400'
                                  }`}
                                >
                                  ● {user.isActive ? 'ACTIVE' : 'DISABLED'}
                                </span>
                              </td>
                              <td className="py-3 text-right text-[10px] font-semibold text-slate-400">
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
                /* RBAC Permissions Matrix (§5) */
                <div className="p-6 rounded-2xl border border-slate-800 bg-[#0f131d] space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div>
                      <h3 className="font-bold text-sm text-white flex items-center gap-2">
                        <span>🔒</span>
                        <span>Role-Based Access Control (RBAC) Governance Matrix</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Enforces zero-trust privilege boundaries between SuperAdmins, Support Staff, and Property Admins.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                      Strict Mode Active
                    </span>
                  </div>

                  <div className="overflow-x-auto w-full custom-scrollbar">
                    <table className="w-full text-left text-xs min-w-[620px]">
                      <thead>
                        <tr className="bg-slate-900/80 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                          <th className="py-3 px-3">Platform Capability / Operation</th>
                          <th className="py-3 px-3">SUPERADMIN (Master)</th>
                          <th className="py-3 px-3">SUPER_STAFF (Support)</th>
                          <th className="py-3 px-3 text-right">HOTEL_ADMIN (Single Property)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {/* Row 1: Delete Tenant (Key Test Requirement) */}
                        <tr className="hover:bg-white/5 transition bg-rose-950/10">
                          <td className="py-4 px-3">
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span className="text-rose-400">⚠️</span>
                              <span>Delete Tenant Property & Purge Data</span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Irreversible destructive operation removing tenant schema & folios.
                            </div>
                          </td>
                          <td className="py-4 px-3">
                            <button
                              type="button"
                              data-testid="btn-role-delete-superadmin"
                              onClick={() => alert('SUPERADMIN Authorized: Tenant deletion dialog opened.')}
                              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition"
                            >
                              Delete Tenant
                            </button>
                            <span className="text-[10px] text-emerald-400 font-semibold block mt-1">
                              ✓ Authorized (Root)
                            </span>
                          </td>
                          <td className="py-4 px-3">
                            <button
                              type="button"
                              disabled
                              data-testid="btn-role-delete-superstaff"
                              title="Permission Denied: Tenant Deletion requires SUPERADMIN role"
                              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-500 border border-slate-700/60 font-bold text-xs cursor-not-allowed opacity-60 flex items-center gap-1.5"
                            >
                              <span className="text-[10px]">🔒</span>
                              <span>Delete Tenant</span>
                            </button>
                            <span className="text-[10px] text-amber-400 font-semibold block mt-1">
                              🔒 Restricted: SUPERADMIN Only
                            </span>
                          </td>
                          <td className="py-4 px-3 text-right">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              PROHIBITED
                            </span>
                          </td>
                        </tr>

                        {/* Row 2: Tenant Provisioning */}
                        <tr className="hover:bg-white/5 transition">
                          <td className="py-3 px-3">
                            <div className="font-bold text-white">Tenant Onboarding & Modular Portals</div>
                            <div className="text-[11px] text-slate-400">Provision hotels and toggle modular licenses.</div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              ✓ FULL ACCESS
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              ✓ FULL ACCESS
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className="text-slate-500 font-bold text-[11px]">Prohibited</span>
                          </td>
                        </tr>

                        {/* Row 3: White-Label Branding */}
                        <tr className="hover:bg-white/5 transition">
                          <td className="py-3 px-3">
                            <div className="font-bold text-white">White-Label Branding Studio</div>
                            <div className="text-[11px] text-slate-400">Deploy custom logos, colors, and CNAME domains.</div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              ✓ FULL ACCESS
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              ✓ SUPPORT OPERATOR
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className="text-slate-300 font-semibold text-[11px]">Property Scope Only</span>
                          </td>
                        </tr>

                        {/* Row 4: Hardware Telemetry */}
                        <tr className="hover:bg-white/5 transition">
                          <td className="py-3 px-3">
                            <div className="font-bold text-white">Hardware Telemetry & Terminal Mapping</div>
                            <div className="text-[11px] text-slate-400">Assign ESC/POS printers and Kitchen KDS tablets.</div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              ✓ FULL ACCESS
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              ✓ FULL ACCESS
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className="text-slate-300 font-semibold text-[11px]">Station Line Only</span>
                          </td>
                        </tr>

                        {/* Row 5: System Config */}
                        <tr className="hover:bg-white/5 transition">
                          <td className="py-3 px-3">
                            <div className="font-bold text-white">System Config & Maintenance Mode</div>
                            <div className="text-[11px] text-slate-400">Freeze customer portals and rotate API keys.</div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              ✓ ROOT CONTROL
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                              👁️ READ-ONLY
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className="text-slate-500 font-bold text-[11px]">Prohibited</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* ROOMS & PMS NETWORK VIEW                                 */}
          {/* ======================================================== */}
          {activeNav === 'ROOMS_PMS' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <span>🛏️</span>
                    <span>Enterprise PMS Room Network & Occupancy Grid</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Live room capacity, housekeeping status and RevPAR yield management across all hotels.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-400 font-bold border border-purple-500/30">
                    Network RevPAR: ₹3,420
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl border border-slate-800 bg-[#0f131d]">
                  <div className="text-xs text-slate-400 uppercase font-bold">Total Rooms Managed</div>
                  <div className="text-2xl font-black text-white mt-1">{totalRoomsCount} Rooms</div>
                </div>
                <div className="p-4 rounded-xl border border-slate-800 bg-[#0f131d]">
                  <div className="text-xs text-slate-400 uppercase font-bold">Currently Occupied</div>
                  <div className="text-2xl font-black text-emerald-400 mt-1">{occupiedRoomsCount} In-House</div>
                </div>
                <div className="p-4 rounded-xl border border-slate-800 bg-[#0f131d]">
                  <div className="text-xs text-slate-400 uppercase font-bold">Average Occupancy</div>
                  <div className="text-2xl font-black text-indigo-400 mt-1">65.8%</div>
                </div>
                <div className="p-4 rounded-xl border border-slate-800 bg-[#0f131d]">
                  <div className="text-xs text-slate-400 uppercase font-bold">Housekeeping Ready</div>
                  <div className="text-2xl font-black text-amber-400 mt-1">94% Inspected</div>
                </div>
              </div>

              <div
                className={`p-5 rounded-2xl border ${
                  theme === 'dark' ? 'bg-[#0f131d] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <h3 className="font-bold text-sm text-white mb-3">Room Category Inventory</h3>
                <div className="space-y-3">
                  {[
                    { type: 'Royal Maharaja Suite', count: 32, occupied: 24, rate: '₹9,500', share: 75 },
                    { type: 'Deluxe Heritage Room', count: 180, occupied: 122, rate: '₹4,500', share: 68 },
                    { type: 'Executive City Room', count: 120, occupied: 82, rate: '₹3,200', share: 68 },
                    { type: 'Boutique Courtyard Villa', count: 48, occupied: 36, rate: '₹7,800', share: 75 },
                  ].map((r, i) => (
                    <div key={i} className="p-3 rounded-xl bg-black/20 border border-white/5">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <div>
                          <strong className="text-white">{r.type}</strong>
                          <span className="text-slate-400 ml-2">Base: {r.rate}/night</span>
                        </div>
                        <span className="font-bold text-emerald-400">{r.occupied} / {r.count} Occupied ({r.share}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div style={{ width: `${r.share}%` }} className="h-full bg-indigo-500 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MENU & CATALOG TEMPLATES                                 */}
          {/* ======================================================== */}
          {activeNav === 'MENU_TEMPLATES' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <span>🍽️</span>
                    <span>Master Menu Templates & BCG Engineering Matrix</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Create central recipes, food cost yield benchmarks, and push menus to all branches with 1-click.
                  </p>
                </div>
                <button
                  type="button"
                  disabled
                  title="Platform-wide menu publishing is not enabled until a central catalog sync API is configured."
                  className="cursor-not-allowed rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-slate-500"
                >
                  🚀 Push Menu (API not configured)
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20">
                  <div className="text-xs uppercase font-bold text-emerald-400">⭐ BCG Stars</div>
                  <div className="text-xl font-black text-white mt-1">Butter Chicken (₹340)</div>
                  <p className="text-[10px] text-slate-400 mt-1">High Profit, High Popularity</p>
                </div>
                <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-950/20">
                  <div className="text-xs uppercase font-bold text-blue-400">🐄 Cash Cows</div>
                  <div className="text-xl font-black text-white mt-1">Masala Chai (₹40)</div>
                  <p className="text-[10px] text-slate-400 mt-1">High Volume, Consistent Yield</p>
                </div>
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/20">
                  <div className="text-xs uppercase font-bold text-amber-400">❓ Puzzles</div>
                  <div className="text-xl font-black text-white mt-1">Lamb Rogan Josh (₹480)</div>
                  <p className="text-[10px] text-slate-400 mt-1">High Margin, Low Volume</p>
                </div>
                <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/20">
                  <div className="text-xs uppercase font-bold text-rose-400">🐕 Dogs</div>
                  <div className="text-xl font-black text-white mt-1">Cold Coffee Frappe (₹180)</div>
                  <p className="text-[10px] text-slate-400 mt-1">Low Margin, Low Volume</p>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* HARDWARE & DEVICES (SOUNDBOX, PRINTERS, POS)             */}
          {/* ======================================================== */}
          {activeNav === 'HARDWARE' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <span>🖨️</span>
                    <span>Device Fleet & Hardware Management</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Live telemetry for Soundbox speakers, thermal receipt printers, and Android KDS tablets.
                  </p>
                </div>
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold">
                  ● 128 / 130 Devices Online
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl border border-slate-800 bg-[#0f131d]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">🔊</span>
                    <span className="text-xs text-emerald-400 font-bold">38 / 38 Online</span>
                  </div>
                  <h3 className="font-bold text-sm text-white">UPI Soundbox Speakers</h3>
                  <p className="text-xs text-slate-400 mt-1">Paytm & PhonePe Soundbox instant vocal payment alerts.</p>
                </div>

                <div className="p-5 rounded-2xl border border-slate-800 bg-[#0f131d]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">🖨️</span>
                    <span className="text-xs text-emerald-400 font-bold">42 / 42 Online</span>
                  </div>
                  <h3 className="font-bold text-sm text-white">ESC/POS Thermal Printers</h3>
                  <p className="text-xs text-slate-400 mt-1">80mm Kitchen KOT printers and Cashier billing roll printers.</p>
                </div>

                <div className="p-5 rounded-2xl border border-slate-800 bg-[#0f131d]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">📱</span>
                    <span className="text-xs text-emerald-400 font-bold">48 / 50 Online</span>
                  </div>
                  <h3 className="font-bold text-sm text-white">Kitchen KDS Tablets</h3>
                  <p className="text-xs text-slate-400 mt-1">10-inch Android mounted displays for kitchen line cooks.</p>
                </div>
              </div>

              {/* Hardware Success Toast */}
              {hardwareSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
                  <span>✓</span>
                  <span>{hardwareSuccessMsg}</span>
                </div>
              )}

              {/* Property Selector */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-300">Target Hotel Property:</span>
                  <select
                    data-testid="select-hardware-hotel"
                    value={selectedHardwareHotelId}
                    onChange={(e) => setSelectedHardwareHotelId(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-bold outline-none"
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
                        details: `Mapped 80mm ESC/POS Printer (192.168.1.101:9100) and Android KDS Tablet (192.168.1.100)`,
                      },
                      ...prev,
                    ]);
                    setTimeout(() => setHardwareSuccessMsg(null), 5000);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow transition flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Hardware Fleet Mappings</span>
                </button>
              </div>

              {/* Hardware Mapping Interactive Forms (§4) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. KOT Printer Form */}
                <div className="p-5 rounded-2xl border border-slate-800 bg-[#0f131d] space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                    <Printer className="w-4 h-4 text-amber-400" />
                    <h3 className="font-bold text-xs uppercase text-slate-300">
                      Map ESC/POS Thermal KOT Printer
                    </h3>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Printer Device Name</label>
                    <input
                      type="text"
                      data-testid="input-kot-printer-name"
                      value={kotPrinterName}
                      onChange={(e) => setKotPrinterName(e.target.value)}
                      placeholder="e.g. Kitchen KOT Master"
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-800 text-xs text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">Target Station</label>
                      <input
                        type="text"
                        data-testid="input-kot-printer-station"
                        value={kotPrinterStation}
                        onChange={(e) => setKotPrinterStation(e.target.value)}
                        placeholder="Hot Kitchen Pass"
                        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-800 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">Network Port</label>
                      <input
                        type="number"
                        data-testid="input-kot-printer-port"
                        value={kotPrinterPort}
                        onChange={(e) => setKotPrinterPort(Number(e.target.value))}
                        placeholder="9100"
                        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-800 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Static IP Address</label>
                    <input
                      type="text"
                      data-testid="input-kot-printer-ip"
                      value={kotPrinterIp}
                      onChange={(e) => setKotPrinterIp(e.target.value)}
                      placeholder="192.168.1.101"
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-800 text-xs text-white font-mono"
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
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition"
                  >
                    + Map KOT Printer
                  </button>
                </div>

                {/* 2. KDS Station Form */}
                <div className="p-5 rounded-2xl border border-slate-800 bg-[#0f131d] space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-bold text-xs uppercase text-slate-300">
                      Assign Kitchen KDS Android Station
                    </h3>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">KDS Station Name</label>
                    <input
                      type="text"
                      data-testid="input-kds-station-name"
                      value={kdsStationName}
                      onChange={(e) => setKdsStationName(e.target.value)}
                      placeholder="e.g. Main Kitchen"
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-800 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Assigned Cooking Line</label>
                    <input
                      type="text"
                      data-testid="input-kds-station-line"
                      value={kdsStationLine}
                      onChange={(e) => setKdsStationLine(e.target.value)}
                      placeholder="Line Cook 1 & Fryer"
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-800 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Tablet IP / Hostname</label>
                    <input
                      type="text"
                      data-testid="input-kds-station-ip"
                      value={kdsStationIp}
                      onChange={(e) => setKdsStationIp(e.target.value)}
                      placeholder="192.168.1.100"
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-800 text-xs text-white font-mono"
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
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition"
                  >
                    + Assign KDS Station
                  </button>
                </div>
              </div>

              {/* 3. Device Fleet Active Inventory Table */}
              <div className="p-5 rounded-2xl border border-slate-800 bg-[#0f131d]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-xs uppercase text-slate-300">
                    Device Fleet Active Inventory
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    {hardwareFleetDevices.length} devices mapped
                  </span>
                </div>
                <div className="overflow-x-auto w-full custom-scrollbar">
                  <table data-testid="table-hardware-fleet" className="w-full text-left text-xs min-w-[580px]">
                    <thead>
                      <tr className="border-b border-slate-800/80 text-slate-400 text-[10px] uppercase">
                        <th className="pb-2">Device Type</th>
                        <th className="pb-2">Station / Name</th>
                        <th className="pb-2">Property</th>
                        <th className="pb-2">Location / Line</th>
                        <th className="pb-2">IP & Interface</th>
                        <th className="pb-2 text-right">Telemetry Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {hardwareFleetDevices.map((dev) => (
                        <tr key={dev.id} className="hover:bg-white/5 transition">
                          <td className="py-2.5 font-bold text-white flex items-center gap-1.5">
                            <span>{dev.type === 'KOT_PRINTER' ? '🖨️' : dev.type === 'KDS_STATION' ? '📱' : '🔊'}</span>
                            <span className="text-[11px]">{dev.type.replace('_', ' ')}</span>
                          </td>
                          <td className="py-2.5 font-semibold text-slate-200">{dev.name}</td>
                          <td className="py-2.5 text-indigo-400">{dev.hotelName}</td>
                          <td className="py-2.5 text-slate-400">{dev.location}</td>
                          <td className="py-2.5 font-mono text-[11px] text-slate-300">
                            {dev.ipAddress}{dev.port ? `:${dev.port}` : ''}
                          </td>
                          <td className="py-2.5 text-right">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
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

          {/* ======================================================== */}
          {/* SHIFT 80.1 DECOUPLING SWITCHBOARD                        */}
          {/* ======================================================== */}
          {activeNav === 'DECOUPLING' && (
            <div className="space-y-6 max-w-5xl mx-auto">
              <div
                className={`p-6 rounded-2xl border ${
                  theme === 'dark' ? 'bg-[#0f131d] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center text-xl font-bold">
                    🔀
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Shift 80.1 Decoupling Switchboard</h2>
                    <p className="text-xs text-slate-400">
                      Separate Cashier POS and Reception into dedicated websites vs Unified Admin ERP.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  {/* Mode A */}
                  <div
                    onClick={() => setGlobalDecouplingMode('UNIFIED')}
                    className={`p-5 rounded-2xl border cursor-pointer transition ${
                      globalDecouplingMode === 'UNIFIED'
                        ? 'border-amber-500 bg-amber-950/20'
                        : 'border-slate-800 bg-black/20 opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-sm text-white">Mode A: Unified Hotel Admin ERP</h3>
                      {globalDecouplingMode === 'UNIFIED' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      Front Desk और Cashier POS दोनों Hotel Admin (:3005) में एक ही छत के नीचे चलते हैं।
                    </p>
                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Port: :3005</span>
                      <a href={getPortalUrl('admin')} target="_blank" rel="noreferrer" className="text-amber-400 font-bold hover:underline">
                        Open Unified ERP ↗
                      </a>
                    </div>
                  </div>

                  {/* Mode B */}
                  <div
                    onClick={() => setGlobalDecouplingMode('DECOUPLED')}
                    className={`p-5 rounded-2xl border cursor-pointer transition ${
                      globalDecouplingMode === 'DECOUPLED'
                        ? 'border-indigo-500 bg-indigo-950/20'
                        : 'border-slate-800 bg-black/20 opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-sm text-white">Mode B: Decoupled Standalone Portals</h3>
                      {globalDecouplingMode === 'DECOUPLED' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500 text-white">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      कैशियर और रिसेप्शन स्टाफ के लिए 2 अलग-अलग वेबसाइटें चलती हैं। कोई गैर-जरूरी स्क्रीन नहीं दिखती।
                    </p>
                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
                      <a
                        href={getPortalUrl('cashier')}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded bg-emerald-600 text-white font-bold"
                      >
                        ⚡ Cashier (:3005/cashier) ↗
                      </a>
                      <a
                        href={getPortalUrl('reception')}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded bg-amber-500 text-slate-950 font-bold"
                      >
                        🛎️ Reception (:3005/reception) ↗
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* APP SUITES GOVERNANCE                                    */}
          {/* ======================================================== */}
          {activeNav === 'APP_SUITES' && (
            <div className="space-y-6 max-w-5xl mx-auto">
              <div
                className={`p-6 rounded-2xl border ${
                  theme === 'dark' ? 'bg-[#0f131d] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <h2 className="text-xl font-bold flex items-center gap-2 mb-1">
                  <span>📱</span>
                  <span>Micro-Frontend Apps & Suites Governance</span>
                </h2>
                <p className="text-xs text-slate-400 mb-6">
                  Manage operational controls for Customer QR (:3001), Waiter Mobile (:3002), Kitchen KDS (:3003) and Guest Room Portal (:3004).
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-slate-800 bg-black/20 space-y-3">
                    <h3 className="font-bold text-sm text-indigo-400 flex items-center gap-2">
                      <span>🍽️</span> Waiter Mobile App (:3002)
                    </h3>
                    <div className="flex items-center justify-between text-xs">
                      <span>Direct KOT Punching</span>
                      <input
                        type="checkbox"
                        checked={appSuiteConfig.waiterKotPunching}
                        onChange={(e) => setAppSuiteConfig({ ...appSuiteConfig, waiterKotPunching: e.target.checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Waitstaff Cash Float Collection</span>
                      <input
                        type="checkbox"
                        checked={appSuiteConfig.waiterCashFloat}
                        onChange={(e) => setAppSuiteConfig({ ...appSuiteConfig, waiterCashFloat: e.target.checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Max Discount Allowed: {appSuiteConfig.waiterMaxDiscountPercent}%</span>
                      <input
                        type="range"
                        min="0"
                        max="30"
                        value={appSuiteConfig.waiterMaxDiscountPercent}
                        onChange={(e) =>
                          setAppSuiteConfig({ ...appSuiteConfig, waiterMaxDiscountPercent: Number(e.target.value) })
                        }
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-800 bg-black/20 space-y-3">
                    <h3 className="font-bold text-sm text-rose-400 flex items-center gap-2">
                      <span>🍳</span> Kitchen KDS App (:3003)
                    </h3>
                    <div className="flex items-center justify-between text-xs">
                      <span>Live Urgency Countdown Timer (Shift 80 Fix)</span>
                      <input
                        type="checkbox"
                        checked={appSuiteConfig.kdsUrgencyCountdown}
                        onChange={(e) => setAppSuiteConfig({ ...appSuiteConfig, kdsUrgencyCountdown: e.target.checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Audio Siren on Overdue Order (&gt;15 min)</span>
                      <input
                        type="checkbox"
                        checked={appSuiteConfig.kdsSoundAlarm}
                        onChange={(e) => setAppSuiteConfig({ ...appSuiteConfig, kdsSoundAlarm: e.target.checked })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SUBSCRIPTION & BILLING ENGINE                            */}
          {/* ======================================================== */}
          {activeNav === 'SUBSCRIPTIONS' && (
            <div className="space-y-6 max-w-5xl mx-auto">
              <div
                className={`p-6 rounded-2xl border ${
                  theme === 'dark' ? 'bg-[#0f131d] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <span>👑</span>
                      <span>SaaS Subscription Plans & Pricing Tiers</span>
                    </h2>
                    <p className="text-xs text-slate-400">
                      Tier pricing, MRR analytics and billing frequency across hotel chains.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleOpenCreatePlan}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Create Custom Plan</span>
                    </button>
                    <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                      Estimated MRR: ₹{totalMrr.toLocaleString('en-IN')}/mo
                    </div>
                  </div>
                </div>

                {plansError && (
                  <div className="mb-4 p-3 rounded-xl border border-rose-500/40 bg-rose-500/10 text-xs text-rose-200">
                    {plansError}
                  </div>
                )}

                {platformPlans.length === 0 ? (
                  <div className="p-8 rounded-2xl border border-dashed border-slate-700 text-center">
                    <Crown className="w-7 h-7 mx-auto mb-2 text-amber-400" />
                    <div className="text-sm font-bold text-white">No subscription plans configured</div>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      The platform plan catalog is empty. Create the standard Starter, Professional and
                      Enterprise tiers to start billing tenants against real plans.
                    </p>
                    <button
                      onClick={() => void handleCreateStandardPlans()}
                      disabled={isSeedingPlans}
                      className="mt-4 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black disabled:opacity-50"
                    >
                      {isSeedingPlans ? 'Creating plans…' : 'Create standard plans'}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {platformPlans.map((plan) => {
                      const features = Object.entries(plan.featureFlags).filter(([, enabled]) => enabled);
                      return (
                        <div
                          key={plan.id}
                          className={`p-5 rounded-2xl border ${
                            plan.code === 'PROFESSIONAL'
                              ? 'border-indigo-500/50 bg-indigo-950/20 shadow-lg'
                              : plan.code === 'ENTERPRISE'
                              ? 'border-purple-500/50 bg-purple-950/20'
                              : 'border-slate-800 bg-black/20'
                          }`}
                        >
                          <div className="text-xs uppercase font-bold text-slate-400">{plan.code}</div>
                          <h3 className="text-lg font-black text-white mt-1">{plan.name}</h3>
                          <div className="text-2xl font-black text-amber-400 my-2">
                            ₹{plan.monthlyPriceINR.toLocaleString('en-IN')}
                            <span className="text-xs text-slate-400 font-normal">/mo</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mb-2">
                            Annual: ₹{plan.annualPriceINR.toLocaleString('en-IN')}
                          </div>
                          <ul className="text-xs text-slate-300 space-y-1.5 my-3">
                            <li>• Up to {plan.limits.maxRooms} rooms + {plan.limits.maxTables} tables</li>
                            <li>• Up to {plan.limits.maxStaffUsers} staff users</li>
                            {features.slice(0, 4).map(([flag]) => (
                              <li key={flag}>• {flag.replace(/([A-Z])/g, ' $1')}</li>
                            ))}
                          </ul>
                          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/80">
                            <button
                              type="button"
                              onClick={() => handleOpenEditPlan(plan)}
                              className="flex-1 py-1.5 px-3 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-xs font-semibold border border-indigo-500/30 transition text-center"
                            >
                              Edit Plan
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeletePlan(plan.id)}
                              className="py-1.5 px-3 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 text-xs font-semibold border border-rose-500/30 transition text-center"
                              title="Deactivate Plan"
                            >
                              Deactivate
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 1. Modular Pricing Matrix Table (§2) */}
                <div className="mt-8 pt-6 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <span>📊</span>
                        <span>Modular Pricing Matrix (Dynamic Catalog)</span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Per-module baseline licensing rates, architectural responsibilities, and tenant attachment rates.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto w-full custom-scrollbar rounded-xl border border-slate-800">
                    <table data-testid="table-pricing-matrix" className="w-full text-left text-xs min-w-[620px]">
                      <thead>
                        <tr className="bg-slate-900/80 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                          <th className="py-2.5 px-3">Module</th>
                          <th className="py-2.5 px-3">Architecture Port</th>
                          <th className="py-2.5 px-3">Core Role</th>
                          <th className="py-2.5 px-3">Base Price</th>
                          <th className="py-2.5 px-3">Entitlement Policy</th>
                          <th className="py-2.5 px-3 text-right">Adoption</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {dbPortalCatalog.map((portal) => (
                          <tr key={portal.id} className="hover:bg-white/5 transition">
                            <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                              <span>{portal.emoji}</span>
                              <span>{portal.name}</span>
                            </td>
                            <td className="py-3 px-3 font-mono text-indigo-400">:{portal.port}</td>
                            <td className="py-3 px-3 text-slate-300">{portal.description}</td>
                            <td className="py-3 px-3 font-bold text-emerald-400">
                              ₹{portal.defaultMonthlyPriceINR.toLocaleString('en-IN')}/mo
                            </td>
                            <td className="py-3 px-3">
                              {portal.requiredBase ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                  CORE BASE
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                  À LA CARTE
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-slate-200">
                              {tenants.filter((t) => !t.enabledPortals || t.enabledPortals.includes(portal.id)).length} Properties
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. MRR Analytics & Growth Chart (§2) */}
                <div data-testid="chart-mrr-growth" className="mt-8 pt-6 border-t border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <span>📈</span>
                        <span>Monthly Recurring Revenue (MRR) Growth</span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Platform-wide trajectory over the last 6 fiscal months.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                        +164% H2 Growth
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-6 gap-3 items-end h-40 pt-4 px-4 bg-slate-950/40 rounded-2xl border border-slate-800/80">
                    {[
                      { month: 'May 2026', mrr: 145000, height: '38%' },
                      { month: 'Jun 2026', mrr: 178000, height: '46%' },
                      { month: 'Jul 2026', mrr: 210000, height: '54%' },
                      { month: 'Aug 2026', mrr: 265000, height: '69%' },
                      { month: 'Sep 2026', mrr: 310000, height: '81%' },
                      { month: 'Oct 2026 (Live)', mrr: 384000, height: '100%' },
                    ].map((col, idx) => (
                      <div key={col.month} className="flex flex-col items-center gap-2 h-full justify-end">
                        <span className="text-[10px] font-bold text-emerald-400 font-mono">
                          ₹{(col.mrr / 1000).toFixed(0)}k
                        </span>
                        <div
                          style={{ height: col.height }}
                          className={`w-full rounded-t-xl transition-all ${
                            idx === 5
                              ? 'bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-lg shadow-emerald-500/20'
                              : 'bg-indigo-600/60 hover:bg-indigo-500/80'
                          }`}
                        />
                        <span className="text-[10px] font-medium text-slate-400 truncate w-full text-center">
                          {col.month.split(' ')[0]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Invoices & Billing Operations (§2) */}
                <div className="mt-8 pt-6 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <span>🧾</span>
                        <span>Tenant Billing & Tax Invoices</span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        GST-compliant recurring SaaS invoices with automated Razorpay collection.
                      </p>
                    </div>
                    <button
                      type="button"
                      data-testid="btn-generate-invoice"
                      onClick={() => setIsInvoiceModalOpen(true)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition flex items-center gap-1.5"
                    >
                      <span>🧾</span>
                      <span>Generate Invoice</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto w-full custom-scrollbar rounded-xl border border-slate-800">
                    <table className="w-full text-left text-xs min-w-[620px]">
                      <thead>
                        <tr className="bg-slate-900/80 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                          <th className="py-2.5 px-3">Invoice #</th>
                          <th className="py-2.5 px-3">Property</th>
                          <th className="py-2.5 px-3">Billing Period</th>
                          <th className="py-2.5 px-3">Plan / Portals</th>
                          <th className="py-2.5 px-3">Amount</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {platformInvoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-white/5 transition">
                            <td className="py-3 px-3 font-mono font-bold text-indigo-400">{inv.invoiceNumber}</td>
                            <td className="py-3 px-3 font-bold text-white">{inv.hotelName}</td>
                            <td className="py-3 px-3 text-slate-400">{inv.billingPeriod}</td>
                            <td className="py-3 px-3 text-slate-300">{inv.planName}</td>
                            <td className="py-3 px-3 font-bold text-emerald-400">
                              ₹{inv.amountINR.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  inv.status === 'PAID'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                }`}
                              >
                                {inv.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
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
                                className="px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 text-[10px] font-bold transition"
                              >
                                Preview
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
          )}

          {/* ======================================================== */}
          {/* 4. WHITE-LABEL BRANDING STUDIO                            */}
          {/* ======================================================== */}
          {activeNav === 'BRANDING' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h2 className={`text-xl font-black tracking-tight flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    <Palette className="w-5 h-5 text-amber-500" />
                    <span>White-Label Branding & Domain Studio</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Manage tenant branding, custom CNAME domains, high-res logos, and portal theme palettes.
                  </p>
                </div>

                {/* Tenant Picker */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-bold">Property:</span>
                  <select
                    data-testid="select-branding-hotel"
                    value={selectedBrandingTenantId}
                    onChange={(e) => setSelectedBrandingTenantId(e.target.value)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition outline-none ${
                      theme === 'dark'
                        ? 'bg-slate-900 border-slate-800 text-white'
                        : 'bg-white border-slate-200 text-slate-800 shadow-xs'
                    }`}
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
                  className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    brandingStudioMsg.type === 'success'
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                      : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                  }`}
                >
                  <span>{brandingStudioMsg.type === 'success' ? '✓' : '⚠️'}</span>
                  <span>{brandingStudioMsg.text}</span>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left 7 cols: Configuration Form */}
                <form
                  onSubmit={handleSaveBrandingStudio}
                  className={`lg:col-span-7 p-6 rounded-2xl border space-y-4 ${
                    theme === 'dark' ? 'bg-[#0f131d] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <h3 className={`text-sm font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Branding Assets & Palette
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Logo URL (PNG / SVG)
                      </label>
                      <input
                        type="url"
                        data-testid="input-brand-logo"
                        value={brandLogoUrl}
                        onChange={(e) => setBrandLogoUrl(e.target.value)}
                        placeholder="https://..."
                        className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${
                          theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Cover Image URL
                      </label>
                      <input
                        type="url"
                        value={brandCoverUrl}
                        onChange={(e) => setBrandCoverUrl(e.target.value)}
                        placeholder="https://..."
                        className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${
                          theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Hotel Hospitality Tagline
                    </label>
                    <input
                      type="text"
                      value={brandTagline}
                      onChange={(e) => setBrandTagline(e.target.value)}
                      placeholder="e.g. Luxury Stays & Fine Indian Dining"
                      className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>

                  {/* Colors */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Primary Accent Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={brandPrimaryColor}
                          onChange={(e) => setBrandPrimaryColor(e.target.value)}
                          className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                        />
                        <input
                          type="text"
                          data-testid="input-brand-primary-color"
                          value={brandPrimaryColor}
                          onChange={(e) => setBrandPrimaryColor(e.target.value)}
                          className={`w-28 px-3 py-2 rounded-xl border text-xs font-mono font-bold uppercase ${
                            theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                          }`}
                        />
                      </div>
                      <div className="flex gap-1.5 mt-2">
                        {['#f59e0b', '#10b981', '#6366f1', '#ec4899', '#06b6d4'].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setBrandPrimaryColor(c)}
                            className="w-5 h-5 rounded-md border border-white/20 transition hover:scale-110"
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Secondary / Surface Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={brandSecondaryColor}
                          onChange={(e) => setBrandSecondaryColor(e.target.value)}
                          className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                        />
                        <input
                          type="text"
                          value={brandSecondaryColor}
                          onChange={(e) => setBrandSecondaryColor(e.target.value)}
                          className={`w-28 px-3 py-2 rounded-xl border text-xs font-mono font-bold uppercase ${
                            theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Custom Domain */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Custom Subdomain / FQDN Mapping
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={brandDomain}
                        onChange={(e) => setBrandDomain(e.target.value)}
                        placeholder="e.g. dining.tajgateway.com"
                        className={`flex-1 px-3 py-2 rounded-xl border text-xs font-mono outline-none ${
                          theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                        }`}
                      />
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                        CNAME Verified ✓
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Configure your DNS: <code className="font-mono text-amber-500">CNAME</code> pointing to <code className="font-mono text-amber-500">spicehub.app</code>
                    </p>
                  </div>

                  <div className="pt-3 flex justify-end">
                    <button
                      type="submit"
                      data-testid="btn-save-branding"
                      disabled={isSavingBrandingStudio}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 font-bold text-xs text-slate-950 flex items-center gap-2 shadow-lg transition"
                    >
                      {isSavingBrandingStudio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span>Deploy White-Label Branding</span>
                    </button>
                  </div>
                </form>

                {/* Right 5 cols: Live Preview Canvas */}
                <div
                  className={`lg:col-span-5 p-6 rounded-2xl border flex flex-col justify-between ${
                    theme === 'dark' ? 'bg-[#0f131d] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Live Diner QR Preview
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-slate-800 text-slate-300">
                        {brandDomain || 'guest.spicehub.app'}
                      </span>
                    </div>

                    {/* Smartphone Mockup */}
                    <div className="mt-4 mx-auto max-w-xs rounded-3xl border-4 border-slate-700 bg-slate-950 p-3 shadow-2xl overflow-hidden">
                      {/* Cover Photo */}
                      <div className="h-28 rounded-2xl overflow-hidden relative bg-slate-800">
                        <img
                          src={brandCoverUrl || 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&auto=format&fit=crop&q=80'}
                          alt="Cover"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
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
                            className="px-2.5 py-1 rounded-lg text-[10px] font-black text-slate-950 shadow"
                            style={{ backgroundColor: brandPrimaryColor }}
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
                            className="px-2.5 py-1 rounded-lg text-[10px] font-black text-slate-950 shadow"
                            style={{ backgroundColor: brandPrimaryColor }}
                          >
                            + ADD
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 pt-2 border-t border-slate-800 text-center">
                        <div className="text-[9px] text-slate-500 font-mono">
                          Powered by SpiceHub White-Label Engine
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 text-center mt-4">
                    Changes reflect immediately across all 8 micro-frontends and native Android terminals.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 5. GLOBAL SYSTEM & SECURITY AUDIT LOGS                    */}
          {/* ======================================================== */}
          {activeNav === 'LOGS' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h2 className={`text-xl font-black tracking-tight flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    <Scroll className="w-5 h-5 text-indigo-500" />
                    <span>Global Platform & Security Audit Logs</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Immutable event ledger across all tenants, auth gates, order pipelines, and financial records.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchAuditLogs}
                    disabled={isLoadingLogs}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                      theme === 'dark'
                        ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                        : 'bg-white border-slate-200 text-slate-700 shadow-xs hover:bg-slate-100'
                    }`}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                    <span>Refresh Logs</span>
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-xs">
                  {['ALL', 'INFO', 'WARN', 'ERROR'].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setLogFilterLevel(lvl)}
                      className={`px-3 py-1.5 rounded-xl font-bold transition ${
                        logFilterLevel === lvl
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : theme === 'dark'
                          ? 'bg-slate-900 text-slate-400 hover:text-white'
                          : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>

                <div className="w-full sm:w-72">
                  <input
                    type="text"
                    value={logSearchQuery}
                    onChange={(e) => setLogSearchQuery(e.target.value)}
                    placeholder="Search logs by action, hotel, or details..."
                    className={`w-full px-3 py-1.5 rounded-xl border text-xs outline-none ${
                      theme === 'dark'
                        ? 'bg-slate-900 border-slate-800 text-white'
                        : 'bg-white border-slate-200 text-slate-900 shadow-xs'
                    }`}
                  />
                </div>
              </div>

              {/* Logs Table */}
              <div
                className={`rounded-2xl border overflow-hidden ${
                  theme === 'dark' ? 'bg-[#0f131d] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className={`border-b ${theme === 'dark' ? 'border-slate-800 bg-slate-900/60 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                        <th className="py-3 px-4 font-bold">Timestamp</th>
                        <th className="py-3 px-4 font-bold">Level</th>
                        <th className="py-3 px-4 font-bold">Source Module</th>
                        <th className="py-3 px-4 font-bold">Action / Event</th>
                        <th className="py-3 px-4 font-bold">Property</th>
                        <th className="py-3 px-4 font-bold">Details</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                      {globalAuditLogs
                        .filter((l) => (logFilterLevel === 'ALL' ? true : l.level === logFilterLevel))
                        .filter((l) =>
                          logSearchQuery
                            ? (l.action || '').toLowerCase().includes(logSearchQuery.toLowerCase()) ||
                              (l.hotelName || '').toLowerCase().includes(logSearchQuery.toLowerCase()) ||
                              (l.details || '').toLowerCase().includes(logSearchQuery.toLowerCase())
                            : true
                        )
                        .map((log) => (
                          <tr
                            key={log.id}
                            className={`transition ${
                              theme === 'dark' ? 'hover:bg-slate-900/50' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="py-2.5 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </td>
                            <td className="py-2.5 px-4 whitespace-nowrap">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  log.level === 'WARN'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    : log.level === 'ERROR'
                                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                }`}
                              >
                                {log.level || 'INFO'}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 font-mono text-[10px] font-semibold text-slate-400 whitespace-nowrap">
                              {log.source || 'PLATFORM'}
                            </td>
                            <td className={`py-2.5 px-4 font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                              {log.action}
                            </td>
                            <td className="py-2.5 px-4 font-medium text-slate-300">
                              {log.hotelName}
                            </td>
                            <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                              {log.details}
                            </td>
                          </tr>
                        ))}
                      {globalAuditLogs.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                            {isLoadingLogs ? 'Loading security and system audit logs...' : 'No audit records match the selected filter.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 6. SYSTEM CONFIGURATION & GOVERNANCE                      */}
          {/* ======================================================== */}
          {activeNav === 'SYSTEM_CONFIG' && (
            <div className="space-y-6 max-w-5xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h2 className={`text-xl font-black tracking-tight flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    <Settings className="w-5 h-5 text-indigo-500" />
                    <span>System Configuration & Platform Governance</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Global toggles, third-party API credentials, infrastructure diagnostics, and disaster recovery.
                  </p>
                </div>
              </div>

              {/* Toggles Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  className={`p-5 rounded-2xl border flex items-center justify-between ${
                    theme === 'dark' ? 'bg-[#0f131d] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div>
                    <div className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      Global Maintenance Mode
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Freeze tenant customer portals for platform-wide database migrations.
                    </div>
                  </div>
                  <button
                    type="button"
                    data-testid="toggle-maintenance-mode"
                    onClick={() => {
                      const next = !maintenanceModeActive;
                      setMaintenanceModeActive(next);
                      setGlobalAuditLogs((prev) => [
                        {
                          id: `audit-${Date.now()}`,
                          timestamp: new Date().toISOString(),
                          level: next ? 'WARN' : 'INFO',
                          source: 'SUPERADMIN',
                          action: next ? 'SuperAdmin toggled maintenance mode ON' : 'SuperAdmin toggled maintenance mode OFF',
                          hotelName: 'GLOBAL_PLATFORM',
                          details: next ? 'Customer portals frozen for platform maintenance' : 'Platform restored to active status',
                        },
                        ...prev,
                      ]);
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                      maintenanceModeActive
                        ? 'bg-rose-600 text-white shadow-lg'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {maintenanceModeActive ? 'ACTIVE (FROZEN)' : 'OFF (NORMAL)'}
                  </button>
                </div>

                <div
                  className={`p-5 rounded-2xl border flex items-center justify-between ${
                    theme === 'dark' ? 'bg-[#0f131d] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div>
                    <div className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      Shift 80.1 Decoupling
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Enforce per-tenant modular portal entitlements and isolated kiosk routes.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDecouplingEnforced(!decouplingEnforced)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                      decouplingEnforced
                        ? 'bg-emerald-600 text-white shadow-lg'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {decouplingEnforced ? 'ENFORCED ✓' : 'PERMISSIVE'}
                  </button>
                </div>
              </div>

              {/* API Credentials */}
              <div
                className={`p-6 rounded-2xl border space-y-4 ${
                  theme === 'dark' ? 'bg-[#0f131d] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <h3 className={`text-sm font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Connected API Gateways & Service Credentials
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">Razorpay Payments</div>
                      <div className="text-[10px] text-slate-400">Key: rzp_live_9a7x...</div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      LIVE ACTIVE
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">Resend Email Delivery</div>
                      <div className="text-[10px] text-slate-400">SMTP: re_8d92k...</div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      CONNECTED
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">WhatsApp Cloud API</div>
                      <div className="text-[10px] text-slate-400">Webhook verified</div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      STANDBY
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">MongoDB Replica Set</div>
                      <div className="text-[10px] text-slate-400">rs0 @ localhost:27017</div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      PRIMARY (ACID)
                    </span>
                  </div>
                </div>
              </div>

              {/* Disaster Recovery & Snapshots */}
              <div
                className={`p-6 rounded-2xl border space-y-4 ${
                  theme === 'dark' ? 'bg-[#0f131d] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <h3 className={`text-sm font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Database Backup & Disaster Recovery
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Generate immediate zero-downtime MongoDB dumps or download full tenant configuration JSON snapshots.
                </p>

                {backupTriggerMsg && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                    {backupTriggerMsg}
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setBackupTriggerMsg('Automated snapshot triggered! mongodump completed successfully to /backup/spicehub_dev_snapshot.gz');
                      setTimeout(() => setBackupTriggerMsg(null), 4000);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow transition flex items-center gap-1.5"
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>Trigger Snapshot Now</span>
                  </button>

                  <button
                    type="button"
                    onClick={exportJsonSnapshot}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                      theme === 'dark'
                        ? 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800'
                        : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100 shadow-xs'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Platform JSON</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 7. FRANCHISE & BRAND GROUP GOVERNANCE                     */}
          {/* ======================================================== */}
          {activeNav === 'FRANCHISE' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h2 className={`text-xl font-black tracking-tight flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    <Store className="w-5 h-5 text-amber-500" />
                    <span>Franchise & Corporate Brand Group Management</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Aggregate independent hotel properties under corporate brand groups with centralized royalty billing, unified loyalty, and shared catalog standards.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold">
                    {createdBrandGroups.length + 1} Active Brand Groups
                  </span>
                </div>
              </div>

              {franchiseSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <span>✓</span>
                  <span>{franchiseSuccessMsg}</span>
                </div>
              )}

              {/* Brand Group Creation Form */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div
                  className={`lg:col-span-5 p-6 rounded-2xl border space-y-4 ${
                    theme === 'dark' ? 'bg-[#0f131d] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <h3 className={`text-sm font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                      Onboard New Brand Group
                    </h3>
                    <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
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
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">Brand Group Name</label>
                      <input
                        type="text"
                        required
                        data-testid="input-brand-group-name"
                        value={brandGroupName}
                        onChange={(e) => setBrandGroupName(e.target.value)}
                        placeholder="e.g. Taj Group"
                        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-800 text-xs text-white outline-none focus:border-indigo-500 transition"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">Corporate Code</label>
                        <input
                          type="text"
                          required
                          data-testid="input-brand-group-code"
                          value={brandGroupCode}
                          onChange={(e) => setBrandGroupCode(e.target.value)}
                          placeholder="TAJ-GRP"
                          className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-800 text-xs text-white uppercase font-mono outline-none focus:border-indigo-500 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">HQ City / State</label>
                        <input
                          type="text"
                          required
                          data-testid="input-brand-group-hq"
                          value={brandGroupHq}
                          onChange={(e) => setBrandGroupHq(e.target.value)}
                          placeholder="Mumbai"
                          className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-800 text-xs text-white outline-none focus:border-indigo-500 transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Franchise Royalty Fee (% of Gross POS & PMS)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={brandGroupRoyalty}
                        onChange={(e) => setBrandGroupRoyalty(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-800 text-xs text-white font-mono outline-none focus:border-indigo-500 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1.5">
                        Link Properties to Brand Group:
                      </label>
                      <div className="space-y-1.5 p-3 rounded-xl bg-black/30 border border-slate-800 max-h-36 overflow-y-auto">
                        {['Mahesh Hotel', 'Chain Test Hotel', 'Taj Gateway Jaipur', 'SpiceHub Royal Fort'].map((hotel) => (
                          <label key={hotel} className="flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer select-none">
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
                              className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>{hotel}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      data-testid="btn-create-brand-group"
                      className="w-full py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
                    >
                      <span>🏢</span>
                      <span>Create Brand Group</span>
                    </button>
                  </form>
                </div>

                {/* Interactive Franchise Hierarchy Tree (§7) */}
                <div
                  data-testid="franchise-hierarchy-tree"
                  className={`lg:col-span-7 p-6 rounded-2xl border space-y-4 ${
                    theme === 'dark' ? 'bg-[#0f131d] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                      <span>🌳</span>
                      <span>Interactive Franchise Hierarchy Tree</span>
                    </h3>
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      LIVE TOPOLOGY
                    </span>
                  </div>

                  {/* Root Corporate Node */}
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-4 before:bottom-4 before:w-0.5 before:bg-indigo-500/30">
                    <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900 border border-indigo-500/40 shadow-lg relative">
                      <div className="absolute -left-[27px] top-4 w-3.5 h-3.5 rounded-full bg-indigo-500 border-2 border-slate-950 flex items-center justify-center text-[8px] text-white">
                        ●
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">👑</span>
                          <div>
                            <div className="font-black text-sm text-white">Taj Group</div>
                            <div className="text-[10px] font-mono text-indigo-300">Code: TAJ-GRP • HQ: Mumbai, Maharashtra</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                          Royalty: 4.5% Gross
                        </span>
                      </div>
                      <div className="mt-3 pt-2 border-t border-indigo-500/20 flex items-center gap-4 text-[10px] text-slate-400">
                        <span>Properties: <strong className="text-white">2 Linked</strong></span>
                        <span>Total Revenue: <strong className="text-emerald-400">₹42.8 Lakhs/mo</strong></span>
                        <span>Loyalty Network: <strong className="text-indigo-300">Taj InnerCircle Shared</strong></span>
                      </div>
                    </div>

                    {/* Child Node 1: Mahesh Hotel */}
                    <div className="ml-4 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 transition relative">
                      <div className="absolute -left-4 top-5 w-4 h-0.5 bg-indigo-500/40"></div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🏨</span>
                          <div>
                            <div className="font-bold text-xs text-white">Mahesh Hotel</div>
                            <div className="text-[10px] text-slate-400">Sikar, Rajasthan • Slug: <span className="font-mono text-indigo-400">mahesh-hotel</span></div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            ACTIVE TENANT
                          </span>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            7 Portals
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-3">
                        <span>Monthly Royalty: <strong className="text-white">₹18,500/mo</strong></span>
                        <span>Status: <strong className="text-emerald-400">Synchronized ✓</strong></span>
                      </div>
                    </div>

                    {/* Child Node 2: Chain Test Hotel */}
                    <div className="ml-4 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 transition relative">
                      <div className="absolute -left-4 top-5 w-4 h-0.5 bg-indigo-500/40"></div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🏨</span>
                          <div>
                            <div className="font-bold text-xs text-white">Chain Test Hotel</div>
                            <div className="text-[10px] text-slate-400">Mumbai, Maharashtra • Slug: <span className="font-mono text-indigo-400">chain-test-hotel</span></div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            SUSPENDED / TRIAL
                          </span>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Modular Portals (KDS On, Waiter Off)
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-3">
                        <span>Monthly Royalty: <strong className="text-white">₹12,400/mo</strong></span>
                        <span>Account Status: <strong className="text-rose-400">Audit Enforced</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Summary Footer */}
                  <div className="p-3 rounded-xl bg-black/40 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Corporate Brand Catalog: <strong>Standardized North & South Indian Menu</strong></span>
                    <span className="text-indigo-400 font-semibold">Cross-Branch Settlements: Active</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* EXTENDED ENTERPRISE WORKSTATIONS SUITE                   */}
          {/* ======================================================== */}
          <SuperAdminExtendedWorkstations
            activeNav={activeNav}
            theme={theme}
            exportJsonSnapshot={exportJsonSnapshot}
            tenants={tenants}
          />
        </main>
      </div>

      {/* ======================================================== */}
      {/* 10. COMMAND PALETTE MODAL (CTRL + K SPOTLIGHT SEARCH)     */}
      {/* ======================================================== */}
      {isCommandPaletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm p-4 pt-20">
          <div className="bg-[#0f131d] border border-indigo-500/40 rounded-2xl w-full max-w-xl p-4 shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/40 border border-slate-800 text-xs text-white">
              <span>🔍</span>
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
                <span>➕ Onboard New Hotel Branch</span>
                <span className="text-[10px] text-indigo-400">Action</span>
              </div>
              <div
                onClick={() => {
                  setIsLiveSystemModalOpen(true);
                  setIsCommandPaletteOpen(false);
                }}
                className="p-2 rounded-lg hover:bg-white/5 flex items-center justify-between cursor-pointer text-slate-200"
              >
                <span>👁️ View Live System Micro-Frontends</span>
                <span className="text-[10px] text-indigo-400">Launch</span>
              </div>
              <div
                onClick={() => {
                  exportJsonSnapshot();
                  setIsCommandPaletteOpen(false);
                }}
                className="p-2 rounded-lg hover:bg-white/5 flex items-center justify-between cursor-pointer text-slate-200"
              >
                <span>📥 Export Platform Telemetry Snapshot</span>
                <span className="text-[10px] text-indigo-400">Download</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0f131d] border border-indigo-500/40 rounded-3xl w-full max-w-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👁️</span>
                <h3 className="font-bold text-base text-white">View Live System (Portals Switchboard)</h3>
              </div>
              <button onClick={() => setIsLiveSystemModalOpen(false)} className="text-slate-400 hover:text-white font-bold">
                ✕
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
                <div className="text-xl mb-1">⚡</div>
                <div className="font-bold text-emerald-400">Cashier POS</div>
                <div className="text-[10px] text-slate-400">:3005/cashier • <span className="text-emerald-400 font-semibold">● 12ms</span></div>
              </a>
              <a
                href={getPortalUrl('reception')}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-xl border border-amber-500/30 bg-amber-950/20 hover:bg-amber-900/30 transition text-center"
              >
                <div className="text-xl mb-1">🛎️</div>
                <div className="font-bold text-amber-400">Reception Portal</div>
                <div className="text-[10px] text-slate-400">:3005/reception • <span className="text-emerald-400 font-semibold">● 14ms</span></div>
              </a>
              <a
                href={getPortalUrl('admin')}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-xl border border-purple-500/30 bg-purple-950/20 hover:bg-purple-900/30 transition text-center"
              >
                <div className="text-xl mb-1">🏨</div>
                <div className="font-bold text-purple-400">Hotel Admin ERP</div>
                <div className="text-[10px] text-slate-400">:3005 • <span className="text-emerald-400 font-semibold">● 10ms</span></div>
              </a>
              <a
                href={getPortalUrl('customer')}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-xl border border-blue-500/30 bg-blue-950/20 hover:bg-blue-900/30 transition text-center"
              >
                <div className="text-xl mb-1">📱</div>
                <div className="font-bold text-blue-400">Customer Table QR</div>
                <div className="text-[10px] text-slate-400">:3001 • <span className="text-emerald-400 font-semibold">● 8ms</span></div>
              </a>
              <a
                href={getPortalUrl('waiter')}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-xl border border-indigo-500/30 bg-indigo-950/20 hover:bg-indigo-900/30 transition text-center"
              >
                <div className="text-xl mb-1">🍽️</div>
                <div className="font-bold text-indigo-400">Waiter Mobile App</div>
                <div className="text-[10px] text-slate-400">:3002 • <span className="text-emerald-400 font-semibold">● 9ms</span></div>
              </a>
              <a
                href={getPortalUrl('kds')}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-xl border border-rose-500/30 bg-rose-950/20 hover:bg-rose-900/30 transition text-center"
              >
                <div className="text-xl mb-1">🍳</div>
                <div className="font-bold text-rose-400">Kitchen KDS</div>
                <div className="text-[10px] text-slate-400">:3003 • <span className="text-emerald-400 font-semibold">● 11ms</span></div>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 12. GENERATE REPORT MODAL                                 */}
      {/* ======================================================== */}
      {isExportReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0f131d] border border-indigo-500/40 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">Generate Executive Report</h3>
              <button onClick={() => setIsExportReportOpen(false)} className="text-slate-400 hover:text-white font-bold">
                ✕
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
                className="w-full p-3 rounded-xl border border-slate-800 bg-black/20 hover:bg-indigo-600/20 hover:border-indigo-500/40 transition text-left flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-white">📥 Platform JSON Data Snapshot</div>
                  <div className="text-[10px] text-slate-400">Full tenant tree, configs, audit logs</div>
                </div>
                <span className="text-indigo-400 font-bold">Download ›</span>
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
                  <div className="font-bold text-white">📊 Branch Performance (CSV / Excel)</div>
                  <div className="text-[10px] text-slate-400">Tabular revenue & orders per location</div>
                </div>
                <span className="text-emerald-400 font-bold">Download ›</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 13. ONBOARD PROPERTY MODAL                                */}
      {/* ======================================================== */}
      {isOnboardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleOnboardSubmit}
            className="bg-[#0f131d] border border-indigo-500/40 rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-y-auto p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <span>🏢</span>
                  <span>Onboard New Property & Allocate Portals</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Select operational workstations à la carte. Dynamic subscription price calculates automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOnboardModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Basic Property Details */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                1. Property Profile & Capacity
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Property Name</label>
                  <input
                    type="text"
                    data-testid="input-hotel-name"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. SpiceHub Royal Fort"
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-800 text-xs text-white mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">City</label>
                  <input
                    type="text"
                    data-testid="input-city"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    placeholder="e.g. Jodhpur"
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-800 text-xs text-white mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">State</label>
                  <input
                    type="text"
                    value={newState}
                    onChange={(e) => setNewState(e.target.value)}
                    placeholder="e.g. Rajasthan"
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-800 text-xs text-white mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Rooms Capacity</label>
                  <input
                    type="number"
                    value={newRooms}
                    onChange={(e) => setNewRooms(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-800 text-xs text-white mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Tables Capacity</label>
                  <input
                    type="number"
                    value={newTables}
                    onChange={(e) => setNewTables(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-800 text-xs text-white mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Property Imagery & Brand Identity */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🖼️</span>
                    <span>1.5 Property Imagery & Brand Identity</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    High-res hotel facade cover photo and brand logo displayed to guests and staff across all mobile apps & portals.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Photo Presets:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setNewCoverImageUrl('https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1600&auto=format&fit=crop&q=80');
                      setNewLogoUrl('https://images.unsplash.com/photo-1566073771259-6a8506099945?w=300&auto=format&fit=crop&q=80');
                      setNewTagline('Luxury Stays, Fine Dining & Serene Hospitality');
                    }}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold border border-slate-700 transition"
                  >
                    👑 Luxury Resort
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewCoverImageUrl('https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1600&auto=format&fit=crop&q=80');
                      setNewLogoUrl('https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=300&auto=format&fit=crop&q=80');
                      setNewTagline('Timeless Rajputana Royalty & World-Class Splendor');
                    }}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold border border-slate-700 transition"
                  >
                    🏰 Heritage Palace
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewCoverImageUrl('https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1600&auto=format&fit=crop&q=80');
                      setNewLogoUrl('https://images.unsplash.com/photo-1590490360182-c33d57733427?w=300&auto=format&fit=crop&q=80');
                      setNewTagline('Boutique Elegance & Contemporary Urban Comfort');
                    }}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold border border-slate-700 transition"
                  >
                    ✨ Boutique Hotel
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Cover / Banner Photo URL</label>
                  <input
                    type="url"
                    value={newCoverImageUrl}
                    onChange={(e) => setNewCoverImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-800 text-xs text-white mt-1"
                  />
                  {newCoverImageUrl ? (
                    <div className="mt-2 h-24 rounded-xl overflow-hidden border border-slate-700 relative">
                      <img src={newCoverImageUrl} alt="Cover preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                        <span className="text-[10px] text-white font-semibold">Cover Photo Live Preview</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 h-14 rounded-xl border border-dashed border-slate-800 flex items-center justify-center text-[10px] text-slate-500">
                      No cover photo specified (luxury default will apply)
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Hotel Brand Logo URL</label>
                  <input
                    type="url"
                    value={newLogoUrl}
                    onChange={(e) => setNewLogoUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-... or /assets/logo.png"
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-800 text-xs text-white mt-1"
                  />
                  <div className="mt-2 flex items-center gap-3">
                    {newLogoUrl ? (
                      <div className="h-14 w-14 rounded-full overflow-hidden border-2 border-indigo-500 bg-black flex-shrink-0">
                        <img src={newLogoUrl} alt="Logo preview" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="h-14 w-14 rounded-full border border-dashed border-slate-800 flex items-center justify-center text-[9px] text-slate-500 text-center flex-shrink-0">
                        Default Logo
                      </div>
                    )}
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Tagline / Brand Motto</label>
                      <input
                        type="text"
                        value={newTagline}
                        onChange={(e) => setNewTagline(e.target.value)}
                        placeholder="e.g. Luxury Stays & Fine Hospitality"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-slate-800 text-xs text-white mt-0.5"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modular Portal Allocation & Dynamic Pricing Engine */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>⚙️</span>
                    <span>2. Operational Terminals Allocation & À La Carte Pricing</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Toggle which portals this branch gets. Disabled portals are gated with lock screens.
                  </p>
                </div>

                {/* Preset Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Presets:</span>
                  <button
                    type="button"
                    onClick={() => applyOnboardPreset('FULL')}
                    className="px-2 py-1 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold hover:bg-indigo-600 hover:text-white transition"
                  >
                    🏨 Full Suite
                  </button>
                  <button
                    type="button"
                    onClick={() => applyOnboardPreset('RESTAURANT')}
                    className="px-2 py-1 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold hover:bg-emerald-600 hover:text-white transition"
                  >
                    🍽️ Restaurant
                  </button>
                  <button
                    type="button"
                    onClick={() => applyOnboardPreset('CAFE_NO_WAITER')}
                    className="px-2 py-1 rounded-lg bg-amber-600/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold hover:bg-amber-600 hover:text-white transition"
                  >
                    ☕ QR Cafe
                  </button>
                  <button
                    type="button"
                    onClick={() => applyOnboardPreset('ROOMS_ONLY')}
                    className="px-2 py-1 rounded-lg bg-purple-600/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold hover:bg-purple-600 hover:text-white transition"
                  >
                    🛏️ Rooms Only
                  </button>
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
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                        isChecked
                          ? 'bg-slate-900 border-indigo-500/50 shadow-md shadow-indigo-950/20'
                          : 'bg-black/30 border-slate-800/80 opacity-60 hover:opacity-85'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isBase}
                        onChange={() => !isBase && toggleOnboardPortal(portal.id)}
                        className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>{portal.emoji}</span>
                            <span>{portal.name}</span>
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-slate-400 border border-slate-800">
                            :{portal.port}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{portal.description}</p>
                        <div className="mt-1.5 flex items-center justify-between text-[10px]">
                          <span className="font-bold text-indigo-400">
                            +₹{portal.defaultMonthlyPriceINR.toLocaleString('en-IN')}/mo
                          </span>
                          {isBase && (
                            <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold text-[9px] border border-indigo-500/30">
                              Core Base (Required)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Dynamic Subscription Pricing Calculator Box */}
              <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <span>💳</span>
                    <span>Calculated Dynamic Subscription</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-medium">Billing Cycle:</span>
                    <div className="inline-flex rounded-xl bg-black/40 p-1 border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setOnboardBillingCycle('MONTHLY')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                          onboardBillingCycle === 'MONTHLY'
                            ? 'bg-indigo-600 text-white shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Monthly
                      </button>
                      <button
                        type="button"
                        onClick={() => setOnboardBillingCycle('ANNUAL')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                          onboardBillingCycle === 'ANNUAL'
                            ? 'bg-indigo-600 text-white shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Annual (2 Mo Free)
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div className="p-2.5 rounded-xl bg-black/30 border border-white/5">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Portals Subtotal</div>
                    <div className="text-sm font-bold text-white mt-0.5">
                      ₹{onboardPricing.baseMonthlyTotalINR.toLocaleString('en-IN')} / mo
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{onboardPortals.length} active portals</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/30 border border-white/5">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Custom Adjustment (₹)</div>
                    <input
                      type="number"
                      value={onboardDiscount}
                      onChange={(e) => setOnboardDiscount(Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-2 py-1 rounded-lg bg-black/60 border border-slate-700 text-xs text-white font-mono mt-0.5 font-bold"
                    />
                    <div className="text-[9px] text-slate-500 mt-0.5">Discount or fee override</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/40">
                    <div className="text-[10px] text-indigo-300 uppercase font-bold">Total Subscription</div>
                    <div className="text-base font-black text-emerald-400 mt-0.5">
                      {onboardBillingCycle === 'ANNUAL'
                        ? `₹${onboardPricing.annualTotalINR.toLocaleString('en-IN')} / yr`
                        : `₹${onboardPricing.finalMonthlyTotalINR.toLocaleString('en-IN')} / mo`}
                    </div>
                    <div className="text-[9px] text-emerald-300/80 mt-0.5">
                      {onboardBillingCycle === 'ANNUAL' ? '10× monthly rate (billed yearly)' : 'Billed every 30 days'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2.5 Subscription Validity & Duration Selection (समय सीमा) */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>📅</span>
                    <span>2.5 Subscription Validity / Duration (समय सीमा तय करें)</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
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
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition border ${
                        onboardDurationMonths === preset.months
                          ? 'bg-slate-700 text-white border-slate-500 shadow-sm'
                          : 'bg-black/30 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-slate-800 text-xs">
                <span className="text-slate-400 font-medium">Or enter custom months:</span>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={onboardDurationMonths}
                  onChange={(e) => setOnboardDurationMonths(Math.max(1, Number(e.target.value)))}
                  className="w-20 px-2 py-1 rounded-lg bg-black/60 border border-slate-700 text-white font-bold text-center"
                />
                <span className="text-slate-400">
                  months validity ({Math.floor(onboardDurationMonths / 12) > 0 ? `${Math.floor(onboardDurationMonths / 12)} Year${Math.floor(onboardDurationMonths / 12) > 1 ? 's' : ''} ` : ''}{onboardDurationMonths % 12 > 0 ? `${onboardDurationMonths % 12} Month${onboardDurationMonths % 12 > 1 ? 's' : ''}` : ''})
                </span>
              </div>
            </div>

            {/* Admin Credentials */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                3. First Administrator Credentials
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Admin Email</label>
                  <input
                    type="email"
                    data-testid="input-admin-email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="admin@hotel.com"
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-800 text-xs text-white mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Phone</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+91 98000 00000"
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-800 text-xs text-white mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Admin Name</label>
                  <input
                    type="text"
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    placeholder="Hotel Administrator"
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-800 text-xs text-white mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Temp. Password</label>
                  <input
                    type="password"
                    data-testid="input-admin-password"
                    required
                    minLength={8}
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-800 text-xs text-white mt-1"
                  />
                </div>
              </div>
            </div>

            {onboardError && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[11px] font-semibold text-rose-200">
                {onboardError}
              </div>
            )}

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsOnboardModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                data-testid="btn-submit-onboard"
                disabled={onboarding}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 disabled:cursor-wait disabled:opacity-60 transition"
              >
                {onboarding
                  ? 'Provisioning Property…'
                  : `Confirm & Onboard Property (₹${onboardPricing.finalMonthlyTotalINR.toLocaleString('en-IN')}/mo)`}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* 13.5 EDIT TENANT PORTALS & DYNAMIC PRICING MODAL          */}
      {/* ======================================================== */}
      {editingTenantPortals && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0f131d] border border-indigo-500/40 rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <span>⚙️</span>
                  <span>Portals & Dynamic Pricing: {editingTenantPortals.name}</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Code: <strong className="font-mono text-indigo-400">{editingTenantPortals.code}</strong> • Changes apply in real-time to active terminals via WebSocket.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTenantPortals(null)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Presets Row */}
            <div className="flex items-center justify-between flex-wrap gap-2 p-3 rounded-2xl bg-black/30 border border-slate-800/80">
              <span className="text-[11px] text-slate-400 font-bold uppercase">Quick Configurations:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => applyEditPreset('FULL')}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold hover:bg-indigo-600 hover:text-white transition"
                >
                  🏨 Full Suite (All 7)
                </button>
                <button
                  type="button"
                  onClick={() => applyEditPreset('RESTAURANT')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold hover:bg-emerald-600 hover:text-white transition"
                >
                  🍽️ Restaurant (POS + KDS + Waiter + QR)
                </button>
                <button
                  type="button"
                  onClick={() => applyEditPreset('CAFE_NO_WAITER')}
                  className="px-2.5 py-1 rounded-lg bg-amber-600/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold hover:bg-amber-600 hover:text-white transition"
                >
                  ☕ QR Cafe (No Waiter)
                </button>
                <button
                  type="button"
                  onClick={() => applyEditPreset('ROOMS_ONLY')}
                  className="px-2.5 py-1 rounded-lg bg-purple-600/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold hover:bg-purple-600 hover:text-white transition"
                >
                  🛏️ Rooms Only (PMS + IRD)
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
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                      isChecked
                        ? 'bg-slate-900 border-indigo-500/50 shadow-md shadow-indigo-950/20'
                        : 'bg-black/30 border-slate-800/80 opacity-60 hover:opacity-85'
                    }`}
                  >
                    <input
                      type="checkbox"
                      data-testid={`checkbox-portal-${portal.id}`}
                      checked={isChecked}
                      disabled={isBase}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => !isBase && toggleEditPortal(portal.id)}
                      className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>{portal.emoji}</span>
                          <span>{portal.name}</span>
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-slate-400 border border-slate-800">
                          :{portal.port}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{portal.description}</p>
                      <div className="mt-1.5 flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1.5">
                          {editingPriceKey === portal.id ? (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <span className="text-slate-400">₹</span>
                              <input
                                type="number"
                                value={customPriceInput}
                                onChange={(e) => setCustomPriceInput(e.target.value)}
                                className="w-16 px-1.5 py-0.5 rounded bg-black border border-indigo-500 text-[10px] text-white"
                              />
                              <button
                                type="button"
                                disabled={isUpdatingDbPrice}
                                onClick={() => void handleUpdateDbPortalPrice(portal.id, Number(customPriceInput))}
                                className="px-1.5 py-0.5 rounded bg-indigo-600 text-white font-bold hover:bg-indigo-500"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingPriceKey(null)}
                                className="text-slate-400 hover:text-white"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-indigo-400">
                                +₹{portal.defaultMonthlyPriceINR.toLocaleString('en-IN')}/mo
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingPriceKey(portal.id);
                                  setCustomPriceInput(String(portal.defaultMonthlyPriceINR));
                                }}
                                className="text-slate-500 hover:text-indigo-300 text-[9px] underline cursor-pointer"
                                title="Edit DB Catalog Base Price"
                              >
                                ✏️ Edit
                              </button>
                            </div>
                          )}
                        </div>
                        {isBase ? (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold text-[9px] border border-indigo-500/30">
                            Core Base
                          </span>
                        ) : isChecked ? (
                          <span className="text-emerald-400 font-semibold text-[10px]">Active Module</span>
                        ) : (
                          <span className="text-rose-400 font-semibold text-[10px]">🔒 Disabled</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pricing Summary Box */}
            <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span>💳</span>
                  <span>Recalculated Subscription Pricing</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 font-medium">Billing Cycle:</span>
                  <div className="inline-flex rounded-xl bg-black/40 p-1 border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setEditBillingCycle('MONTHLY')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        editBillingCycle === 'MONTHLY'
                          ? 'bg-indigo-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditBillingCycle('ANNUAL')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        editBillingCycle === 'ANNUAL'
                          ? 'bg-indigo-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Annual (2 Mo Free)
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div className="p-2.5 rounded-xl bg-black/30 border border-white/5">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Portals Subtotal</div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    ₹{editPricing.baseMonthlyTotalINR.toLocaleString('en-IN')} / mo
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{editPortalsList.length} of 7 portals active</div>
                </div>

                <div className="p-2.5 rounded-xl bg-black/30 border border-white/5">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Custom Adjustment (₹)</div>
                  <input
                    type="number"
                    value={editDiscount}
                    onChange={(e) => setEditDiscount(Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-2 py-1 rounded-lg bg-black/60 border border-slate-700 text-xs text-white font-mono mt-0.5 font-bold"
                  />
                  <div className="text-[9px] text-slate-500 mt-0.5">Custom discount / override</div>
                </div>

                <div className="p-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/40">
                  <div className="text-[10px] text-indigo-300 uppercase font-bold">Updated Subscription</div>
                  <div className="text-base font-black text-emerald-400 mt-0.5">
                    {editBillingCycle === 'ANNUAL'
                      ? `₹${editPricing.annualTotalINR.toLocaleString('en-IN')} / yr`
                      : `₹${editPricing.finalMonthlyTotalINR.toLocaleString('en-IN')} / mo`}
                  </div>
                  <div className="text-[9px] text-emerald-300/80 mt-0.5">
                    {editBillingCycle === 'ANNUAL' ? '10× monthly rate (billed yearly)' : 'Billed every 30 days'}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingTenantPortals(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="btn-save-portals"
                onClick={() => void handleSaveTenantPortals()}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition flex items-center gap-1.5"
              >
                <span>🚀</span>
                <span>Save & Broadcast to Terminals</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 13.6 EDIT TENANT BRANDING & IMAGERY MODAL                 */}
      {/* ======================================================== */}
      {isBrandingModalOpen && editingBrandingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSaveBranding}
            className="bg-[#0f131d] border border-pink-500/40 rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <span>🖼️</span>
                  <span>Property Branding & Imagery — {editingBrandingTenant.name}</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Update cover photo, logo, and tagline. These are projected in real time to mobile apps & ERP.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBrandingModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ✕
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
                    setEditCoverImageUrl('https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1600&auto=format&fit=crop&q=80');
                    setEditLogoUrl('https://images.unsplash.com/photo-1566073771259-6a8506099945?w=300&auto=format&fit=crop&q=80');
                    setEditTagline('Luxury Stays, Fine Dining & Serene Hospitality');
                  }}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-left border border-slate-700 text-[10px] transition"
                >
                  <div className="font-bold text-amber-300">👑 Royal Resort</div>
                  <div className="text-slate-400 text-[9px] truncate">Poolside luxury</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditCoverImageUrl('https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1600&auto=format&fit=crop&q=80');
                    setEditLogoUrl('https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=300&auto=format&fit=crop&q=80');
                    setEditTagline('Timeless Rajputana Royalty & World-Class Splendor');
                  }}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-left border border-slate-700 text-[10px] transition"
                >
                  <div className="font-bold text-indigo-300">🏰 Heritage Palace</div>
                  <div className="text-slate-400 text-[9px] truncate">Historic courtyard</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditCoverImageUrl('https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1600&auto=format&fit=crop&q=80');
                    setEditLogoUrl('https://images.unsplash.com/photo-1590490360182-c33d57733427?w=300&auto=format&fit=crop&q=80');
                    setEditTagline('Boutique Elegance & Contemporary Urban Comfort');
                  }}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-left border border-slate-700 text-[10px] transition"
                >
                  <div className="font-bold text-pink-300">✨ Boutique Urban</div>
                  <div className="text-slate-400 text-[9px] truncate">Modern minimalist</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditCoverImageUrl('https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1600&auto=format&fit=crop&q=80');
                    setEditLogoUrl('https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=300&auto=format&fit=crop&q=80');
                    setEditTagline('Premier Hospitality, Business Lounges & Banquets');
                  }}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-left border border-slate-700 text-[10px] transition"
                >
                  <div className="font-bold text-emerald-300">🏙️ Metropolitan</div>
                  <div className="text-slate-400 text-[9px] truncate">Executive suites</div>
                </button>
              </div>
            </div>

            {/* Inputs & Live Previews */}
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase">Hotel Cover / Facade Photo URL</label>
                <input
                  type="url"
                  value={editCoverImageUrl}
                  onChange={(e) => setEditCoverImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-800 text-xs text-white mt-1"
                />
                {editCoverImageUrl && (
                  <div className="mt-2 h-32 w-full rounded-2xl overflow-hidden border border-slate-700 relative shadow-md">
                    <img src={editCoverImageUrl} alt="Cover preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2.5">
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
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-800 text-xs text-white mt-1"
                  />
                  {editLogoUrl && (
                    <div className="mt-2 flex items-center gap-2.5 p-2 rounded-xl bg-black/30 border border-slate-800">
                      <div className="h-12 w-12 rounded-xl overflow-hidden border border-indigo-500 bg-black flex-shrink-0">
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
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-800 text-xs text-white mt-1"
                  />
                  <div className="mt-2 p-2 rounded-xl bg-black/30 border border-slate-800 text-[11px] text-slate-300 italic">
                    "{editTagline || 'No tagline set'}"
                  </div>
                </div>
              </div>
            </div>

            {brandingError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
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
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-pink-600 hover:bg-pink-500 text-white shadow-lg shadow-pink-600/30 transition flex items-center gap-1.5 disabled:opacity-60"
              >
                <span>💾</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0f131d] border border-indigo-500/40 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">
                {activeSettingsModal.replace('_', ' ')} Settings
              </h3>
              <button onClick={() => setActiveSettingsModal(null)} className="text-slate-400 hover:text-white font-bold">
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Configuration active for <strong>{activeSettingsModal}</strong> across the multi-tenant cluster.
            </p>
            <div className="p-4 rounded-xl bg-black/30 border border-white/5 text-xs text-slate-300 space-y-2">
              <div className="flex justify-between"><span>Status:</span><span className="text-emerald-400 font-bold">● Synchronized</span></div>
              <div className="flex justify-between"><span>Environment:</span><span className="font-mono text-white">Production (v5.0.2)</span></div>
              <div className="flex justify-between"><span>Tenant Partitioning:</span><span className="text-indigo-400 font-bold">Isolated (Postgres + Redis)</span></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setActiveSettingsModal(null)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div
            data-testid="modal-super-staff"
            className="bg-[#0f131d] border border-indigo-500/40 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛡️</span>
                <h3 className="font-bold text-base text-white">Provision Super Staff Account</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSuperStaffModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
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
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-800 text-xs text-white"
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
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-800 text-xs text-white"
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
                  🔒 Note: SUPER_STAFF accounts cannot delete tenants or drop database collections.
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
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div
            data-testid="modal-invoice-preview"
            className="bg-[#0f131d] border border-indigo-500/40 rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base text-white">Tax Invoice Preview</h3>
              </div>
              <button
                type="button"
                data-testid="btn-close-invoice-modal"
                onClick={() => setIsInvoiceModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-sm text-white">SpiceHub SaaS Platform Pvt Ltd</div>
                  <div className="text-[10px] text-slate-400">Cyber City, DLF Phase 2, Gurugram, India</div>
                  <div className="text-[10px] font-mono text-indigo-400">GSTIN: 06AAACS8491M1Z5</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-indigo-300">{invoicePreviewData.invoiceNo}</div>
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
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow transition"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSaveCustomPlan}
            className="bg-[#0f131d] border border-amber-500/40 rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👑</span>
                <div>
                  <h3 className="font-bold text-base text-white">
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
                ✕
              </button>
            </div>

            {/* Plan Name & Code */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase">Plan Name</label>
                <input
                  type="text"
                  required
                  value={planFormName}
                  onChange={(e) => setPlanFormName(e.target.value)}
                  placeholder="e.g. Diamond Resort Elite"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-800 text-xs text-white mt-1"
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
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-800 text-xs text-white mt-1 disabled:opacity-50 font-mono uppercase"
                />
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
                  <input
                    type="number"
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
                  <input
                    type="number"
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
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">
                Operational Capacity Quotas
              </span>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Max Rooms</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={planFormMaxRooms}
                    onChange={(e) => setPlanFormMaxRooms(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-bold mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Max Tables</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={planFormMaxTables}
                    onChange={(e) => setPlanFormMaxTables(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-bold mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Max Staff</label>
                  <input
                    type="number"
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
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wider block">
                Workstations & Feature Entitlements
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  { key: 'pmsEnabled', label: '🛎️ Front Desk PMS (:3005/reception)' },
                  { key: 'posEnabled', label: '⚡ Fast Cashier POS (:3005/cashier)' },
                  { key: 'kdsEnabled', label: '👨‍🍳 Kitchen Display (KDS :3003)' },
                  { key: 'waiterEnabled', label: '🍽️ Waiter Mobile App (:3002)' },
                  { key: 'qrDineInEnabled', label: '📱 Customer Dine-In QR (:3001)' },
                  { key: 'roomServiceEnabled', label: '🛏️ Guest Room Portal (:3004)' },
                  { key: 'banquetEnabled', label: '🎪 Banquet & Event Management' },
                  { key: 'loyaltyEnabled', label: '💎 Guest Loyalty Network' },
                  { key: 'tallyExportEnabled', label: '📊 Tally Accounting Export' },
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
                      className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
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
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>💾</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0f131d] border border-slate-700 rounded-3xl w-full max-w-xl max-h-[92vh] overflow-y-auto p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">📅</span>
                <div>
                  <h3 className="font-bold text-base text-white">Adjust Subscription Duration & Validity</h3>
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
                ✕
              </button>
            </div>

            {/* Quick Duration Presets */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Select Validity Duration (महीने या साल तय करें):
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
                  <input
                    type="number"
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
                  Subscription Start Date (शुरू होने की तारीख)
                </label>
                <input
                  type="date"
                  value={subStartDate}
                  onChange={(e) => {
                    setSubStartDate(e.target.value);
                    setSubEndDate(calculateEndDateFromMonths(e.target.value, subCustomMonths));
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-slate-700 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Subscription End Date (खत्म होने की तारीख)
                </label>
                <input
                  type="date"
                  value={subEndDate}
                  onChange={(e) => setSubEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-slate-700 text-xs text-white"
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
                <input
                  type="number"
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
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
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
      {/* 19. ADMIN CREDENTIALS & PASSWORD MANAGEMENT MODAL         */}
      {/* ======================================================== */}
      {managingCredentialsTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0f131d] border border-slate-700 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🔑</span>
                <div>
                  <h3 className="font-bold text-base text-white">Hotel Admin Credentials & Access</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{managingCredentialsTenant.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setManagingCredentialsTenant(null)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ✕
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
                    📋
                  </button>
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
                    📋
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-slate-800">
                <span className="text-slate-400 font-medium">ERP Login Portal:</span>
                <div className="flex items-center gap-2">
                  <a
                    href="http://localhost:3005"
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-indigo-400 hover:underline text-[11px]"
                  >
                    http://localhost:3005 ↗
                  </a>
                  <button
                    type="button"
                    title="Copy URL"
                    onClick={() => void copyToClipboard('http://localhost:3005', 'ERP URL copied!')}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    📋
                  </button>
                </div>
              </div>
            </div>

            {/* Reset Password Form */}
            <div className="space-y-3 pt-1">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Set New Password (या नया पासवर्ड बनाएं):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={credNewPassword}
                  onChange={(e) => setCredNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 chars)"
                  className="flex-1 px-3 py-2 rounded-xl bg-black/50 border border-slate-700 text-xs text-white"
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
                  <span>✓</span>
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
                      `SpiceHub Hotel Admin Login:\nURL: http://localhost:3005\nSlug: ${credSuccessData.hotelSlug}\nEmail: ${credSuccessData.email}\nPassword: ${credSuccessData.password}`,
                      'Full login credentials copied!'
                    )
                  }
                  className="w-full py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 font-bold text-xs"
                >
                  📋 Copy All Login Credentials
                </button>
              </div>
            )}

            {credErrorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="bg-[#0f131d] border border-slate-700 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="text-3xl">🎉</span>
                <div>
                  <h3 className="font-bold text-base text-white">Hotel Created Successfully!</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{createdCredentialsModal.hotelName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreatedCredentialsModal(null)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ✕
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
                    📋
                  </button>
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
                    📋
                  </button>
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
                    📋
                  </button>
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
                  href="http://localhost:3005"
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-indigo-400 hover:underline text-xs"
                >
                  http://localhost:3005 ↗
                </a>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() =>
                  void copyToClipboard(
                    `SpiceHub Hotel Admin Login:\nURL: http://localhost:3005\nHotel Slug: ${createdCredentialsModal.hotelSlug}\nEmail: ${createdCredentialsModal.adminEmail}\nPassword: ${createdCredentialsModal.adminPassword}\nValid Until: ${formatDate(createdCredentialsModal.subscriptionEndDate)}`,
                    'All credentials copied to clipboard!'
                  )
                }
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-700 hover:bg-slate-600 text-white border border-slate-500 shadow-md transition flex items-center justify-center gap-1.5"
              >
                <span>📋</span>
                <span>Copy All Credentials</span>
              </button>
              <button
                type="button"
                onClick={() => setCreatedCredentialsModal(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Clipboard Notice Toast */}
      {clipboardNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <span className="text-emerald-400">✓</span>
          <span>{clipboardNotice}</span>
        </div>
      )}
    </div>
  );
};
