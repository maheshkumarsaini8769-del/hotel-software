import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { env, getPortalUrl } from './config/env';
import { SuperAdminRealMap } from './components/SuperAdminRealMap';
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
} from 'lucide-react';

// ============================================================================
// DATA STRUCTURES & INTERFACES
// ============================================================================
export interface TenantHotelItem {
  id: string;
  name: string;
  code: string;
  city: string;
  state: string;
  contactEmail: string;
  contactPhone: string;
  logoUrl?: string;
  coverImageUrl?: string;
  photos?: string[];
  tagline?: string;
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
  features: {
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
  { key: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard, category: 'MAIN' },
  { key: 'BRANCHES', label: 'All Branches', icon: Building, category: 'MAIN' },
  { key: 'BRANDING', label: 'Brand Management', icon: Palette, category: 'CORE' },
  { key: 'HOTEL_ADMIN', label: 'Hotel Admin Management', icon: Building2, category: 'CORE' },
  { key: 'USERS_ROLES', label: 'Users & Roles', icon: Users, category: 'CORE' },
  { key: 'SUBSCRIPTIONS', label: 'Subscription & Billing', icon: CreditCard, category: 'FINANCE' },
  { key: 'SYSTEM_CONFIG', label: 'System Configuration', icon: Settings, category: 'SYSTEM' },
  { key: 'MENU_TEMPLATES', label: 'Menu & Catalog Templates', icon: BookOpen, category: 'OPERATIONS' },
  { key: 'INVENTORY', label: 'Inventory & Procurement', icon: Package, category: 'OPERATIONS' },
  { key: 'ANALYTICS', label: 'Reports & Analytics', icon: BarChart3, category: 'ANALYTICS' },
  { key: 'FRANCHISE', label: 'Franchise Management', icon: Store, category: 'EXPANSION' },
  { key: 'ROOMS_PMS', label: 'Rooms & PMS', icon: BedDouble, category: 'HOTEL_OPS' },
  { key: 'CUSTOMERS', label: 'Customer Management', icon: User, category: 'CRM' },
  { key: 'MARKETING', label: 'Marketing & Offers', icon: Tag, category: 'MARKETING' },
  { key: 'FEEDBACK', label: 'Feedback & Reviews', icon: Star, category: 'CRM' },
  { key: 'SUPPORT', label: 'Support & Helpdesk', icon: Headphones, category: 'SUPPORT' },
  { key: 'LOGS', label: 'System Logs & Activity', icon: Scroll, category: 'SYSTEM' },
  { key: 'HARDWARE', label: 'Device & Hardware', icon: Printer, category: 'HARDWARE' },
  { key: 'INTEGRATIONS', label: 'Integrations', icon: Cpu, category: 'ECOSYSTEM' },
  { key: 'BACKUP', label: 'Backup & Data', icon: Database, category: 'INFRA' },
  { key: 'SECURITY', label: 'Security & Permissions', icon: Shield, category: 'SECURITY' },
  { key: 'AI_AUTOMATION', label: 'AI & Automation', icon: Zap, category: 'INNOVATION', badge: 'AI' },
  { key: 'NOTIFICATIONS', label: 'Notifications', icon: Bell, category: 'SYSTEM' },
  { key: 'LANGUAGES', label: 'Multi-language', icon: Globe, category: 'GLOBAL' },
  { key: 'SETTINGS', label: 'Settings', icon: Settings, category: 'SYSTEM' },
  { key: 'DECOUPLING', label: 'Shift 80.1 Decoupling', icon: Split, category: 'SPECIAL', badge: 'SHIFT 80.1' },
  { key: 'APP_SUITES', label: 'App Suites Governance', icon: Smartphone, category: 'SPECIAL', badge: 'MOBILE' },
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

  // Theme (Dark / Light)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('spicehub_superadmin_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'dark';
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

  // Live Activities Feed is rebuilt from real platform orders/bookings.
  const [auditLogs, setAuditLogs] = useState<
    Array<{ id: string; time: string; branch: string; action: string; amount?: number; type: 'ORDER' | 'ROOM' | 'PAYMENT' | 'STAFF' | 'ALERT' }>
  >([]);

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
              city: String(tenant.city || '—'),
              state: String(tenant.state || '—'),
              contactEmail: String(tenant.contactEmail || ''),
              contactPhone: String(tenant.contactPhone || ''),
              logoUrl: String(tenant.logoUrl || ''),
              coverImageUrl: String(tenant.coverImageUrl || ''),
              photos: Array.isArray(tenant.photos) ? tenant.photos : [],
              tagline: String(tenant.tagline || ''),
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

  // Edit Branding Modal State
  const [isBrandingModalOpen, setIsBrandingModalOpen] = useState(false);
  const [editingBrandingTenant, setEditingBrandingTenant] = useState<TenantHotelItem | null>(null);
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [editCoverImageUrl, setEditCoverImageUrl] = useState('');
  const [editTagline, setEditTagline] = useState('');
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [brandingError, setBrandingError] = useState('');
  const [brandingSuccess, setBrandingSuccess] = useState('');

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
      }

      setPlatformNotice(
        `${newName.trim()} onboarded with ${onboardPortals.length} active portals (₹${onboardPricing.finalMonthlyTotalINR.toLocaleString('en-IN')}/mo). Admin login: ${newEmail.trim()} / the password you entered.${provisionSummary}`
      );
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
      setRefreshKey((value) => value + 1);
      window.setTimeout(() => setPlatformNotice(''), 8000);
    } catch (error: any) {
      setPlatformError(error?.message || 'Could not update tenant status.');
    } finally {
      setTenantActionId('');
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

  return (
    <div
      className={`h-screen overflow-hidden flex font-sans select-none transition-colors duration-200 ${
        theme === 'dark' ? 'bg-[#080b11] text-slate-100' : 'bg-[#f4f6fa] text-slate-800'
      }`}
    >
      {/* ======================================================== */}
      {/* 1. LEFT SIDEBAR (EXACT PIXEL-PERFECT REPRODUCTION)        */}
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
            : 'bg-[#0c101c] border-slate-900 text-slate-200'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/60">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shrink-0 shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            {!sidebarCollapsed && (
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-base tracking-tight text-white">SpiceHub</span>
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Super Admin</div>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition text-xs"
            title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {sidebarCollapsed ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Scrollable Navigation Items */}
        <div className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5 custom-scrollbar">
          {SIDEBAR_MENU_ITEMS.map((item) => {
            const isActive = activeNav === item.key;
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => {
                  setActiveNav(item.key);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all text-left ${
                  isActive
                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent font-medium'
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 transition ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                {!sidebarCollapsed && (
                  <div className="flex-1 flex items-center justify-between truncate">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold tracking-wider bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Profile Card */}
        <div className="p-3 border-t border-slate-800/60">
          <div
            onClick={() => {
              setActiveNav('SETTINGS');
              setMobileMenuOpen(false);
            }}
            className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition cursor-pointer"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 font-bold text-xs shrink-0">
                SA
              </div>
              {!sidebarCollapsed && (
                <div className="truncate">
                  <div className="text-xs font-semibold text-white truncate">Super Admin</div>
                  <div className="text-[10px] text-slate-400 truncate">superadmin@spicehub.com</div>
                </div>
              )}
            </div>
            {!sidebarCollapsed && <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
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
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs font-semibold text-emerald-200">
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
                    onClick={() => setIsOnboardModalOpen(true)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow transition"
                  >
                    + Onboard New Branch
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

                        <div className="mb-2.5 flex items-center justify-between gap-2 text-[11px]">
                          <span className="text-slate-400">Subscription Plan</span>
                          <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
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

                      {/* Dual Action Buttons: Portals & Dynamic Pricing + Branding / Imagery */}
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <button
                          type="button"
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
                <button
                  onClick={() => setIsOnboardModalOpen(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs self-start sm:self-auto shrink-0"
                >
                  + Onboard Hotel Admin
                </button>
              </div>

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
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                    Estimated MRR: ₹{totalMrr.toLocaleString('en-IN')}/mo
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
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* FALLBACK VIEW FOR REMAINING MODULES                      */}
          {/* ======================================================== */}
          {activeNav !== 'DASHBOARD' &&
            activeNav !== 'BRANCHES' &&
            activeNav !== 'HOTEL_ADMIN' &&
            activeNav !== 'USERS_ROLES' &&
            activeNav !== 'ROOMS_PMS' &&
            activeNav !== 'MENU_TEMPLATES' &&
            activeNav !== 'HARDWARE' &&
            activeNav !== 'DECOUPLING' &&
            activeNav !== 'APP_SUITES' &&
            activeNav !== 'SUBSCRIPTIONS' && (
              <div className="space-y-6 max-w-5xl mx-auto">
                <div
                  className={`p-6 rounded-2xl border ${
                    theme === 'dark' ? 'bg-[#0f131d] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <span>⚙️</span>
                        <span>{SIDEBAR_MENU_ITEMS.find((m) => m.key === activeNav)?.label}</span>
                      </h2>
                      <p className="text-xs text-slate-400">
                        Enterprise configuration & management panel for {activeNav}.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveNav('DASHBOARD')}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-200 hover:bg-slate-700"
                    >
                      ← Back to Dashboard
                    </button>
                  </div>

                  {activeNav === 'SYSTEM_CONFIG' && (
                    <div className="space-y-4">
                      <form onSubmit={handleSetAnnouncement} className="flex gap-2">
                        <input
                          type="text"
                          value={announcementInput}
                          onChange={(e) => setAnnouncementInput(e.target.value)}
                          placeholder="Set a local operator banner for this browser…"
                          className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-slate-800 text-xs text-white"
                        />
                        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs">
                          Save Banner
                        </button>
                      </form>
                      <p className="text-[10px] text-slate-500">
                        This banner is stored in this browser only. A cross-tenant broadcast
                        delivery API is not configured yet.
                      </p>
                      <button
                        onClick={exportJsonSnapshot}
                        className="px-4 py-2 bg-slate-800 text-slate-200 font-bold rounded-xl text-xs border border-slate-700"
                      >
                        📥 Export Platform JSON Snapshot
                      </button>
                    </div>
                  )}

                  {activeNav === 'SECURITY' && (
                    <div className="space-y-2 text-xs">
                      <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                        <span>Tenant boundary middleware:</span>
                        <span className="text-emerald-400 font-bold">JWT + x-hotel-id enforced</span>
                      </div>
                      <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                        <span>Production boot checks:</span>
                        <span className="text-emerald-400 font-bold">JWT secret & manager PIN required</span>
                      </div>
                      <p className="text-[10px] leading-relaxed text-slate-500">
                        Run the repository security audit for the current pass/fail matrix. This
                        panel does not claim a live vulnerability score.
                      </p>
                    </div>
                  )}

                  {activeNav !== 'SYSTEM_CONFIG' && activeNav !== 'SECURITY' && (
                    <div className="p-8 rounded-xl bg-black/20 border border-white/5 text-center text-xs text-slate-400">
                      <div className="font-bold text-slate-300">
                        This platform module is not connected yet.
                      </div>
                      <p className="mx-auto mt-2 max-w-md text-[10px] leading-relaxed">
                        No demo records are shown here. Use Dashboard, Branches, Users & Roles,
                        Rooms & PMS, Subscriptions, Hardware or App Suites for live backend data.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
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
              {SIDEBAR_MENU_ITEMS.slice(0, 8).map((m) => (
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
                      checked={isChecked}
                      disabled={isBase}
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
    </div>
  );
};
