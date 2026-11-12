import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  LayoutDashboard,
  Users,
  BedDouble,
  Armchair,
  Flame,
  Receipt,
  BookOpen,
  Package,
  Sparkles,
  BarChart3,
  Settings,
  Search,
  Bell,
  Sun,
  Moon,
  Download,
  Calendar,
  Building2,
  UtensilsCrossed,
  ArrowUpRight,
  TrendingUp,
  ShoppingBag,
  ShoppingCart,
  CreditCard,
  UserCheck,
  AlertTriangle,
  ClipboardList,
  Ticket,
  Wallet,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  ArrowLeft,
  Shield,
  ExternalLink,
  User,
  Zap,
  RefreshCw,
  Loader2,
  Clock,
  Radio,
  Menu,
  X,
  Wifi,
  CheckCircle2,
  LogOut,
  Camera,
  Upload,
  MessageCircle,
  Plus,
  ChefHat,
  MapPin,
  Navigation,
  Activity,
  Award,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from 'recharts';
import { MatrixStore, LanguageToggle, useTranslation } from '@spicehub/ui';
import { PmsReservationMatrixApp } from './PmsReservationMatrixApp';
import { RoomCatalogStudioApp } from './components/room-management/RoomCatalogStudioApp';
import { HousekeepingTurnaroundApp } from './components/housekeeping/HousekeepingTurnaroundApp';
import { LivePropertyAvailabilityApp } from './components/live-availability/LivePropertyAvailabilityApp';
import { FastCashierPosApp } from './components/fast-cashier/FastCashierPosApp';
import { InventoryPoApp } from './components/inventory-po/InventoryPoApp';
import { InventoryAuditApp } from './components/inventory-audit/InventoryAuditApp';
import { UnifiedInventoryHubApp } from './components/inventory-audit/UnifiedInventoryHubApp';
import { MenuCatalogManagerApp } from './components/menu-catalog/MenuCatalogManagerApp';
import { StaffUserManagementApp } from './components/staff-management/StaffUserManagementApp';
import { NightAuditApp } from './components/night-audit/NightAuditApp';
import { RevenueManagerApp } from './components/revenue-manager/RevenueManagerApp';
import { TableManagementStudioApp } from './components/table-management/TableManagementStudioApp';
import { KotVoidAuditApp } from './components/kot-void/KotVoidAuditApp';
import { LiveOrdersAndKdsConsoleApp } from './components/kds-orders/LiveOrdersAndKdsConsoleApp';
import { FrontDeskCheckInApp } from './components/front-desk/FrontDeskCheckInApp';
import { LostAndFoundVaultApp } from './components/lost-and-found/LostAndFoundVaultApp';
import { RestaurantOperationsHubApp, OperationsTab } from './components/operations-hub/RestaurantOperationsHubApp';
import { ErpMasterDirectoryModal, ErpMasterSystemItem } from './components/operations-hub/ErpMasterDirectoryModal';
import {
  AdminLoginBrandingEditor,
  AdminLoginBrandingValue,
  syncAdminLoginBrandingCache,
} from './components/operations-hub/AdminLoginBrandingEditor';
import { NotificationCenterView } from './components/notifications/NotificationCenterView';
import { HotelPoliciesAndUseCasesHubApp } from './components/policies/HotelPoliciesAndUseCasesHubApp';
import { HotelReportsAndAnalyticsView } from './components/reports/HotelReportsAndAnalyticsView';
import { CouponsAndVouchersStudioApp } from './components/coupons/CouponsAndVouchersStudioApp';
import { BanquetManagementApp } from './components/banquet/BanquetManagementApp';
import { CorporateMasterFolioApp } from './components/corporate/CorporateMasterFolioApp';
import { DiningReservationApp } from './components/dining-reservations/DiningReservationApp';
import { RecipeCostingApp } from './components/recipe-costing/RecipeCostingApp';
import { StoreRequisitionApp } from './components/store-requisition/StoreRequisitionApp';
import { FloorDutyMatrixView } from './components/floors/FloorDutyMatrixView';
import { PayrollDashboard } from './components/payroll/PayrollDashboard';
import { getApiClient } from './lib/apiClient';
import { apiFetch, getStoredHotelId, getStoredToken } from './config/api';
import { getPortalUrl } from './config/portalUrls';
import type { ErpModuleKey } from './types/erp';

export type { ErpModuleKey } from './types/erp';

interface ErpSidebarItem {
  key: ErpModuleKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const formatRangeDate = (date: Date) =>
  date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const startOfDay = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const addDays = (date: Date, days: number) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const buildDashboardDateRanges = () => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = addDays(todayStart, 1);
  const sevenDaysAgo = addDays(todayStart, -6);
  const thirtyDaysAgo = addDays(todayStart, -29);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  return [
    {
      value: formatRangeDate(now),
      label: 'Today',
      start: todayStart.toISOString(),
      end: tomorrowStart.toISOString(),
    },
    {
      value: `${formatRangeDate(sevenDaysAgo)} - ${formatRangeDate(now)}`,
      label: 'Last 7 Days',
      start: sevenDaysAgo.toISOString(),
      end: tomorrowStart.toISOString(),
    },
    {
      value: `${formatRangeDate(thirtyDaysAgo)} - ${formatRangeDate(now)}`,
      label: 'Last 30 Days',
      start: thirtyDaysAgo.toISOString(),
      end: tomorrowStart.toISOString(),
    },
    {
      value: `${formatRangeDate(startOfMonth)} - ${formatRangeDate(now)}`,
      label: 'This Month',
      start: startOfMonth.toISOString(),
      end: nextMonthStart.toISOString(),
    },
    {
      value: `${formatRangeDate(lastMonthStart)} - ${formatRangeDate(addDays(thisMonthStart, -1))}`,
      label: 'Last Month',
      start: lastMonthStart.toISOString(),
      end: thisMonthStart.toISOString(),
    },
  ];
};

const DASHBOARD_DATE_RANGES = buildDashboardDateRanges();

const SIDEBAR_ITEMS: ErpSidebarItem[] = [
  { key: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'LIVE_AVAILABILITY', label: 'Live Rooms & Tables', icon: Building2, badge: 'LIVE' },
  { key: 'ROOM_MANAGEMENT', label: 'Front Desk & PMS', icon: BedDouble },
  { key: 'STAFF_MANAGEMENT', label: 'Staff & Terminals', icon: Users },
  { key: 'PAYROLL', label: 'Payroll & Salaries', icon: Wallet },
  { key: 'TABLE_MANAGEMENT', label: 'Dining Tables', icon: Armchair },
  { key: 'ORDERS_KITCHEN', label: 'Live Orders & KDS', icon: Flame },
  { key: 'MENU_CATALOG', label: 'Menu & Stock 86', icon: BookOpen },
  { key: 'INVENTORY_STOCK', label: 'Inventory & Stock', icon: Package },
  { key: 'PURCHASES_SUPPLIERS', label: 'Purchases & Suppliers', icon: ShoppingCart },
  { key: 'HOUSEKEEPING', label: 'Housekeeping', icon: Sparkles },
  { key: 'DINING_RESERVATIONS', label: 'Dining Reservations', icon: UtensilsCrossed },
  { key: 'BANQUET', label: 'Banquet & Events', icon: Calendar },
  { key: 'CORPORATE', label: 'Corporate Accounts', icon: Building2 },
  { key: 'REVENUE_MANAGER', label: 'Revenue Manager', icon: TrendingUp },
  { key: 'EXPENSES_ACCOUNTING', label: 'Night Audit & Close', icon: Moon },
  { key: 'MAINTENANCE', label: 'Lost & Found Vault', icon: Shield },
  { key: 'POLICIES_AND_USECASES', label: 'Hotel SOP & Compliance', icon: ClipboardList },
  { key: 'COUPONS_VOUCHERS', label: 'Coupons & Vouchers', icon: Ticket, badge: 'PROMO' },
  { key: 'REPORTS_ANALYTICS', label: 'Reports & Revenue', icon: BarChart3 },
  { key: 'SETTINGS_CONFIGURATION', label: 'Operations & Settings', icon: Settings },
];

interface DashboardKpis {
  totalRevenue: number;
  revenueGrowthPct: number;
  todayTransactions: number;
  transactionGrowthPct: number;
  totalOrders: number;
  orderGrowthPct: number;
  occupiedRooms: number;
  totalRooms: number;
  occupancyRate: number;
  occupiedTables: number;
  totalTables: number;
  tableOccupancyRate: number;
  totalGuests: number;
  totalStaff: number;
  arrivalsToday: number;
  departuresToday: number;
  dineInOrders: number;
  takeawayOrders: number;
  roomServiceOrders: number;
}

interface DashboardOrderRow {
  id: string;
  orderNumber: string;
  orderType: string;
  status: string;
  tableNumber: string | null;
  roomNumber: string | null;
  guestName: string;
  itemCount: number;
  amount: number;
  placedAt: string;
}

interface DashboardBookingRow {
  id: string;
  bookingNumber: string;
  guestName: string;
  roomType: string;
  roomNumber: string | null;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  paymentStatus: string;
  grandTotal: number;
}

interface DashboardLiveOperation {
  id: string;
  type: string;
  status: string;
  priority: string;
  roomNumber: string | null;
  createdAt: string;
}

interface DashboardOverview {
  generatedAt: string;
  range: { start: string; end: string };
  kpis: DashboardKpis;
  revenueTrend: Array<{ date: string; label: string; revenue: number; orders: number }>;
  recentOrders: DashboardOrderRow[];
  recentBookings: DashboardBookingRow[];
  roomStatusBreakdown: Array<{ status: string; count: number }>;
  occupancyByRoomType: Array<{
    id: string;
    name: string;
    code: string;
    totalRooms: number;
    occupiedRooms: number;
    occupancyRate: number;
    basePrice: number;
  }>;
  liveOperations: DashboardLiveOperation[];
}

const formatInr = (value: number): string =>
  `₹${Math.round(Number(value) || 0).toLocaleString('en-IN')}`;

const formatCompactInr = (value: number): string => {
  const amount = Number(value) || 0;
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${Math.round(amount)}`;
};

const relativeTime = (iso: string): string => {
  const timestamp = new Date(iso).getTime();
  if (!Number.isFinite(timestamp)) return 'just now';
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const orderStatusClass = (status: string): string => {
  switch (status) {
    case 'SERVED':
      return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
    case 'READY':
      return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800';
    case 'PREPARING':
    case 'ACCEPTED':
      return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
    case 'CANCELLED':
      return 'bg-red-500/10 text-red-300 border-red-500/20';
    default:
      return 'bg-slate-800 text-slate-300 border-slate-700';
  }
};

const bookingStatusClass = (status: string): string => {
  switch (status) {
    case 'CHECKED_IN':
      return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
    case 'CONFIRMED':
      return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800';
    case 'CHECKED_OUT':
      return 'bg-slate-800 text-slate-300 border-slate-700';
    case 'CANCELLED':
    case 'NO_SHOW':
      return 'bg-red-500/10 text-red-300 border-red-500/20';
    default:
      return 'bg-slate-800 text-slate-300 border-slate-700';
  }
};

export interface AdminErpShellProps {
  onNavigatePortal?: (portal: 'admin' | 'cashier' | 'reception' | 'launcher') => void;
}

export const AdminErpShell: React.FC<AdminErpShellProps> = ({ onNavigatePortal }) => {
  const [activeModule, setActiveModuleState] = useState<ErpModuleKey>(() => {
    const params = new URLSearchParams(window.location.search);
    const mod = params.get('module') as ErpModuleKey;
    return mod || 'DASHBOARD';
  });

  const setActiveModule = useCallback((key: ErpModuleKey) => {
    setActiveModuleState(key);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('module', key);
      window.history.replaceState({}, '', url.toString());
    } catch {}
  }, []);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleSetModule = (e: any) => {
      if (e.detail && typeof e.detail === 'string') {
        setActiveModule(e.detail as ErpModuleKey);
      }
    };
    window.addEventListener('erp:set_module', handleSetModule);
    return () => window.removeEventListener('erp:set_module', handleSetModule);
  }, [setActiveModule]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [occupancyTab, setOccupancyTab] = useState<'ROOMS' | 'TABLES'>('ROOMS');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState(DASHBOARD_DATE_RANGES[0].value);
  const [currentOperationsTab, setCurrentOperationsTab] = useState<OperationsTab>('RESTAURANT_INFO');
  const [currentMenuCatalogTab, setCurrentMenuCatalogTab] = useState<'CATEGORIES' | 'ITEMS' | 'STOCK_86' | 'RECIPES'>('CATEGORIES');
  const [isMasterDirectoryOpen, setIsMasterDirectoryOpen] = useState(false);
  const [roomSubView, setRoomSubView] = useState<'STUDIO' | 'MATRIX' | 'FRONTDESK'>('STUDIO');
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(5);
  const [matrixError, setMatrixError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardOverview | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [chartViewMode, setChartViewMode] = useState<'HYBRID' | 'AREA' | 'BARS'>('HYBRID');
  const [selectedChartDayIndex, setSelectedChartDayIndex] = useState<number | null>(null);
  const [showSimulatedPreview, setShowSimulatedPreview] = useState(false);

  const handleSelectMasterSystem = (system: ErpMasterSystemItem) => {
    setActiveModule(system.targetModule as ErpModuleKey);
    if (system.targetModule === 'MENU_CATALOG' && system.targetTab) {
      setCurrentMenuCatalogTab(system.targetTab as any);
    }
    if (system.targetModule === 'SETTINGS_CONFIGURATION' && system.targetTab) {
      setCurrentOperationsTab(system.targetTab as OperationsTab);
    }
  };

  const [theme] = useState<'light'>('light');
  const isDark = false;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.remove('dark');
    try {
      localStorage.removeItem('spicehub_erp_theme');
    } catch {}
    document.body.className = 'bg-slate-50 text-slate-900 antialiased font-sans';
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    themeMeta?.setAttribute('content', '#f8fafc');
  }, []);

  const matrixStore = MatrixStore.getInstance();
  const token = getStoredToken();
  const hotelId = getStoredHotelId();

  const [propertyProfile, setPropertyProfile] = useState<{
    name: string;
    slug?: string;
    logoUrl?: string;
    coverImageUrl?: string;
    tagline?: string;
    contactPhone?: string;
    wifiSsid?: string;
    wifiPassword?: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
    latitude?: number;
    longitude?: number;
    googleMapUrl?: string;
    locationNotes?: string;
    adminLoginBranding?: AdminLoginBrandingValue;
  }>({
    name: '',
    slug: '',
    logoUrl: '',
    coverImageUrl: '',
    tagline: '',
    contactPhone: '',
    wifiSsid: '',
    wifiPassword: '',
    street: '',
    city: 'Jaipur',
    state: 'Rajasthan',
    country: 'India',
    pincode: '',
    latitude: 26.9124,
    longitude: 75.7873,
    googleMapUrl: '',
    locationNotes: '',
    adminLoginBranding: {},
  });

  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [propertyEditForm, setPropertyEditForm] = useState({
    name: '',
    tagline: '',
    contactPhone: '',
    wifiSsid: '',
    wifiPassword: '',
    coverImageUrl: '',
    logoUrl: '',
    street: '',
    city: 'Jaipur',
    state: 'Rajasthan',
    country: 'India',
    pincode: '',
    latitude: 26.9124,
    longitude: 75.7873,
    googleMapUrl: '',
    locationNotes: '',
    adminLoginBranding: {} as AdminLoginBrandingValue,
  });
  const [savingProperty, setSavingProperty] = useState(false);
  const [propertyToast, setPropertyToast] = useState<string | null>(null);
  const [impersonationInfo] = useState<{ hotelName: string; expiresAt?: string } | null>(() => {
    try {
      const value = localStorage.getItem('spicehub_impersonation');
      return value ? JSON.parse(value) as { hotelName: string; expiresAt?: string } : null;
    } catch {
      return null;
    }
  });
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [supportSubject, setSupportSubject] = useState('');
  const [supportDescription, setSupportDescription] = useState('');
  const [supportPriority, setSupportPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [supportError, setSupportError] = useState('');
  const [supportSuccess, setSupportSuccess] = useState('');

  const { t } = useTranslation();

  const [adminUser] = useState<{ id?: string; name?: string; role?: string; email?: string }>(() => {
    if (typeof window === 'undefined') return { name: 'Admin', role: 'Hotel Manager', email: 'admin@tajgateway.com' };
    try {
      const raw = localStorage.getItem('spicehub_auth_user') || localStorage.getItem('auth_user');
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          id: parsed.id || parsed._id,
          name: parsed.name || 'Admin',
          role: parsed.role || 'Hotel Manager',
          email: parsed.email || '',
        };
      }
    } catch {}
    return { name: 'Admin', role: 'Hotel Manager', email: '' };
  });

  const isGroupAdmin = String(adminUser.role || '').toUpperCase() === 'GROUP_ADMIN';
  const [selectedProperty, setSelectedProperty] = useState<'all' | 'mahesh' | 'taj'>('all');
  const propertySelectorOptions = [
    { value: 'all', label: 'All Properties' },
    { value: 'mahesh', label: 'Mahesh Palace' },
    { value: 'taj', label: 'Taj Hotel' },
  ] as const;

  const [adminAvatar, setAdminAvatar] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('spicehub_admin_avatar') || localStorage.getItem('spicehub_staff_avatar') || '';
  });

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          let sx = 0;
          let sy = 0;
          const sSize = Math.min(img.width, img.height);
          if (img.width > img.height) {
            sx = (img.width - img.height) / 2;
          } else {
            sy = (img.height - img.width) / 2;
          }
          ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, 400, 400);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.82);
          setAdminAvatar(compressedBase64);
          if (typeof window !== 'undefined') {
            localStorage.setItem('spicehub_admin_avatar', compressedBase64);
            localStorage.setItem('spicehub_staff_avatar', compressedBase64);
            try {
              const current = JSON.parse(localStorage.getItem('spicehub_auth_user') || '{}');
              localStorage.setItem('spicehub_auth_user', JSON.stringify({ ...current, avatarUrl: compressedBase64 }));
            } catch {}
          }
          setPropertyToast('✓ Profile photo updated & compressed (400x400 JPEG)');
          setTimeout(() => setPropertyToast(null), 3000);
        }
        setIsUploadingPhoto(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('spicehub_token');
      localStorage.removeItem('token');
      localStorage.removeItem('spicehub_hotel_id');
      localStorage.removeItem('hotelId');
      localStorage.removeItem('spicehub_auth_user');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('spicehub_impersonation');
      window.dispatchEvent(new Event('spicehub:logout'));
      window.location.reload();
    }
  };

  const handleExitImpersonation = () => {
    localStorage.removeItem('spicehub_token');
    localStorage.removeItem('token');
    localStorage.removeItem('spicehub_hotel_id');
    localStorage.removeItem('hotelId');
    localStorage.removeItem('spicehub_auth_user');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('spicehub_impersonation');
    window.location.href = getPortalUrl('superadmin');
  };

  const submitSupportTicket = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSupportSubmitting(true);
    setSupportError('');
    setSupportSuccess('');
    try {
      const response = await apiFetch('/support/tickets', {
        method: 'POST',
        body: JSON.stringify({
          subject: supportSubject,
          description: supportDescription,
          priority: supportPriority,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        throw new Error(result?.message || `Support request could not be sent (HTTP ${response.status}).`);
      }
      setSupportSuccess('Your support request has been submitted.');
      setSupportSubject('');
      setSupportDescription('');
      setSupportPriority('MEDIUM');
    } catch (error) {
      setSupportError(error instanceof Error ? error.message : 'Support request could not be sent.');
    } finally {
      setSupportSubmitting(false);
    }
  };

  const handleOpenPropertyModal = () => {
    setPropertyEditForm({
      name: propertyProfile.name || '',
      tagline: propertyProfile.tagline || '',
      contactPhone: propertyProfile.contactPhone || '',
      wifiSsid: propertyProfile.wifiSsid || '',
      wifiPassword: propertyProfile.wifiPassword || '',
      coverImageUrl: propertyProfile.coverImageUrl || '',
      logoUrl: propertyProfile.logoUrl || '',
      street: propertyProfile.street || '',
      city: propertyProfile.city || 'Jaipur',
      state: propertyProfile.state || 'Rajasthan',
      country: propertyProfile.country || 'India',
      pincode: propertyProfile.pincode || '',
      latitude: propertyProfile.latitude ?? 26.9124,
      longitude: propertyProfile.longitude ?? 75.7873,
      googleMapUrl: propertyProfile.googleMapUrl || '',
      locationNotes: propertyProfile.locationNotes || '',
      adminLoginBranding: {
        heroTitle: '',
        heroSubtitle: '',
        heroImageUrl: '',
        formTitle: '',
        formSubtitle: '',
        ...(propertyProfile.adminLoginBranding || {}),
      },
    });
    setIsPropertyModalOpen(true);
  };

  const handleSavePropertyProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingProperty(true);
      const res = await apiFetch('/restaurant-operations/info', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(propertyEditForm),
      });
      const json = await res.json().catch(() => null);
      if (json?.success) {
        const savedBranding = json.data?.adminLoginBranding || propertyEditForm.adminLoginBranding || {};
        setPropertyProfile((prev) => ({
          ...prev,
          ...propertyEditForm,
          slug: json.data?.slug || prev.slug,
          adminLoginBranding: savedBranding,
        }));
        syncAdminLoginBrandingCache(savedBranding, {
          hotelName: json.data?.name || propertyEditForm.name || propertyProfile.name,
          hotelSlug: json.data?.slug || propertyProfile.slug,
          coverImageUrl: json.data?.coverImageUrl || propertyEditForm.coverImageUrl,
        });
        setIsPropertyModalOpen(false);
        setPropertyToast('Hotel property, Wi-Fi & Admin Login settings updated live');
        setTimeout(() => setPropertyToast(null), 4000);
      } else {
        alert(json?.message || 'Failed to update property settings');
      }
    } catch (err: any) {
      alert(err.message || 'Network error saving property settings');
    } finally {
      setSavingProperty(false);
    }
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 512;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.88);
          setPropertyEditForm((prev) => ({
            ...prev,
            logoUrl: compressed,
          }));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleCoverFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.82);
          setPropertyEditForm((prev) => ({
            ...prev,
            coverImageUrl: compressed,
          }));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    let cancelled = false;
    const loadProfile = async () => {
      try {
        const res = await apiFetch('/restaurant-operations/info');
        const json = await res.json().catch(() => null);
        if (!cancelled && json?.success && json?.data) {
          const branding: AdminLoginBrandingValue = {
            heroTitle: '',
            heroSubtitle: '',
            heroImageUrl: '',
            formTitle: '',
            formSubtitle: '',
            ...(json.data.adminLoginBranding || {}),
          };
          const rawAddr = json.data.address;
          const addrObj = typeof rawAddr === 'object' && rawAddr ? rawAddr : {};
          const street = json.data.street || addrObj.street || '';
          const city = json.data.city || addrObj.city || 'Jaipur';
          const state = json.data.state || addrObj.state || 'Rajasthan';
          const country = json.data.country || addrObj.country || 'India';
          const pincode = json.data.pincode || addrObj.pincode || '';
          const lat = Number(json.data.coordinates?.latitude ?? json.data.latitude ?? 26.9124);
          const lng = Number(json.data.coordinates?.longitude ?? json.data.longitude ?? 75.7873);
          const gMap = json.data.googleMapUrl || `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

          setPropertyProfile({
            name: json.data.name || 'SpiceHub Hotel',
            slug: json.data.slug || '',
            logoUrl: json.data.logoUrl || '',
            coverImageUrl: json.data.coverImageUrl || '',
            tagline: json.data.tagline || '',
            contactPhone: json.data.contactPhone || '+91 98765 43210',
            wifiSsid: json.data.wifiSsid || 'TajGateway_HighSpeed',
            wifiPassword: json.data.wifiPassword || 'SpiceGuest@2026',
            street,
            city,
            state,
            country,
            pincode,
            latitude: lat,
            longitude: lng,
            googleMapUrl: gMap,
            locationNotes: json.data.locationNotes || '',
            adminLoginBranding: branding,
          });
          syncAdminLoginBrandingCache(branding, {
            hotelName: json.data.name || 'SpiceHub Hotel',
            hotelSlug: json.data.slug || '',
            coverImageUrl: json.data.coverImageUrl || '',
          });
        }
      } catch {}
    };
    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const loadMatrix = async (startDate: string, days: number, roomTypeId?: string) => {
    matrixStore.setIsLoading(true);
    try {
      const result = await getApiClient().pms.getCalendarMatrix({
        startDate,
        days,
        roomTypeId: roomTypeId && roomTypeId !== 'ALL' ? roomTypeId : undefined,
      });
      if (result?.success && result.data?.dates?.length) {
        matrixStore.setData(result.data);
        setMatrixError(null);
      } else {
        setMatrixError('Live reservation matrix returned no rooms or bookings.');
      }
    } catch (error: any) {
      setMatrixError(error?.message || 'Unable to synchronize the live reservation matrix.');
      throw error;
    } finally {
      matrixStore.setIsLoading(false);
    }
  };

  // Seed only in development so production never presents fabricated inventory.
  // Live PMS data replaces this as soon as the backend responds.
  useEffect(() => {
    if (!matrixStore.getData() && (import.meta as any).env?.DEV) {
      const dates: any[] = [];
      const base = new Date();
      for (let i = 0; i < 14; i++) {
        const d = new Date(base);
        d.setDate(base.getDate() + i);
        const dateStr = d.toISOString().slice(0, 10);
        const dayOfWeek = d.getDay();
        const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek];
        const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
        dates.push({
          date: dateStr,
          dayOfWeek,
          dayName,
          dayNumber: d.getDate(),
          monthName,
          isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        });
      }

      matrixStore.setData({
        window: {
          startDate: dates[0].date,
          endDate: dates[dates.length - 1].date,
          totalDays: 14,
        },
        dates,
        kpis: {
          totalRooms: 480,
          arrivalsToday: 18,
          departuresToday: 12,
          occupancyRate: 65,
          activeBookingsCount: 312,
        },
        roomTypes: [
          {
            id: 'rt-deluxe',
            name: 'Deluxe Heritage Room',
            code: 'DLX',
            basePrice: 4500,
            rooms: [
              { id: 'rm-101', roomNumber: '101', floorNumber: 1, wing: 'East Wing', status: 'OCCUPIED' },
              { id: 'rm-102', roomNumber: '102', floorNumber: 1, wing: 'East Wing', status: 'AVAILABLE' },
              { id: 'rm-103', roomNumber: '103', floorNumber: 1, wing: 'East Wing', status: 'DIRTY' },
            ],
          },
          {
            id: 'rt-suite',
            name: 'Royal Maharaja Suite',
            code: 'STE',
            basePrice: 9500,
            rooms: [
              { id: 'rm-201', roomNumber: '201', floorNumber: 2, wing: 'Royal Wing', status: 'OCCUPIED' },
              { id: 'rm-202', roomNumber: '202', floorNumber: 2, wing: 'Royal Wing', status: 'AVAILABLE' },
            ],
          },
        ],
        bookings: [
          {
            id: 'bk-1',
            bookingNumber: 'RES-8821',
            guestName: 'Rohit Khanna (VIP)',
            guestPhone: '+91 98230 11223',
            guestEmail: 'rohit.khanna@tcs.com',
            checkInDate: '2026-10-01',
            checkOutDate: '2026-10-06',
            bookingStatus: 'IN_HOUSE',
            allocatedRoomId: 'rm-101',
            roomTypeId: 'rt-deluxe',
            roomTypeName: 'Deluxe Heritage Room',
            grandTotal: 22500,
            advancePaymentAmount: 22500,
            paymentStatus: 'PAID',
          },
        ],
      });
    }
  }, [matrixStore]);

  useEffect(() => {
    // Synchronize the live PMS calendar immediately. Failures surface in the
    // module banner while the last known matrix remains visible.
    void loadMatrix(matrixStore.getStartDate(), matrixStore.getDays()).catch(() => undefined);
  }, [matrixStore]);

  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true);
    setDashboardError(null);
    const range = DASHBOARD_DATE_RANGES.find((item) => item.value === dateRange) || DASHBOARD_DATE_RANGES[0];
    try {
      const response = await apiFetch(
        `/dashboard/overview?startDate=${encodeURIComponent(range.start)}&endDate=${encodeURIComponent(range.end)}`
      );
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || `Could not load live dashboard (HTTP ${response.status})`);
      }
      setDashboard(json.data);
    } catch (error: any) {
      setDashboardError(error?.message || 'Could not load the live dashboard.');
    } finally {
      setDashboardLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    if (activeModule !== 'DASHBOARD') return;
    void loadDashboard();
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadDashboard();
    }, 30000);
    return () => window.clearInterval(interval);
  }, [activeModule, loadDashboard]);

  // Export Summary Function
  const handleExportReport = () => {
    const reportData = {
      hotel: 'SpiceHub Hotel & Resorts',
      dateRange,
      generatedAt: new Date().toISOString(),
      liveDashboard: dashboard,
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spicehub-hotel-admin-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ==========================================================================
  // RENDER MAIN DASHBOARD
  // ==========================================================================
  const renderDashboardView = () => {
    const isDark = false;
    const primaryText = 'text-slate-900';
    const rowText = 'text-slate-700';
    const mutedRowText = 'text-slate-500';
    const rowHover = 'hover:bg-slate-50';
    const tableDivide = 'divide-slate-200';
    // Direct, real live operational KPIs without artificial multiplier
    const kpis = dashboard?.kpis;
    const selectedRange =
      DASHBOARD_DATE_RANGES.find((item) => item.value === dateRange) || DASHBOARD_DATE_RANGES[0];
    const recentOrders = dashboard?.recentOrders || [];
    const recentBookings = dashboard?.recentBookings || [];
    const roomStatusCounts = new Map(
      (dashboard?.roomStatusBreakdown || []).map((row) => [row.status, row.count])
    );
    const totalRooms = kpis?.totalRooms || 0;
    const occupiedRoomCount = kpis?.occupiedRooms || 0;
    const availableRoomCount = roomStatusCounts.get('AVAILABLE') !== undefined
      ? (roomStatusCounts.get('AVAILABLE') || 0)
      : Math.max(0, totalRooms - occupiedRoomCount);
    const maintenanceRoomCount = roomStatusCounts.get('OUT_OF_SERVICE') || 0;
    const dirtyRoomCount = (roomStatusCounts.get('DIRTY') || 0) + (roomStatusCounts.get('CLEANING') || 0);

    const occupancySegments = [
      { label: 'Available', count: availableRoomCount, color: '#10b981' },
      { label: 'Occupied', count: occupiedRoomCount, color: '#2563eb' },
      { label: 'Cleaning', count: dirtyRoomCount, color: '#f59e0b' },
      { label: 'Maintenance', count: maintenanceRoomCount, color: '#ef4444' },
    ];
    const totalTables = kpis?.totalTables || 0;
    const occupiedTables = kpis?.occupiedTables || 0;
    const vacantTables = Math.max(0, totalTables - occupiedTables);
    const tableSegments = [
      { label: 'Available Tables', count: vacantTables, color: '#10b981' },
      { label: 'Occupied / Dining', count: occupiedTables, color: '#2563eb' },
    ];
    const activeSegments = occupancyTab === 'TABLES' ? tableSegments : occupancySegments;
    const activeTotal = occupancyTab === 'TABLES' ? totalTables : totalRooms;
    const activeRate = occupancyTab === 'TABLES'
      ? (totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0)
      : (kpis?.occupancyRate || 0);
    const donutCircumference = 2 * Math.PI * 38;
    let donutOffset = 0;

    const liveFeed = [
      ...recentOrders.slice(0, 3).map((order) => ({
        key: `order-${order.id}`,
        icon: UtensilsCrossed,
        color: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
        title: `Order #${order.orderNumber}`,
        subtitle: `${order.tableNumber ? `Table ${order.tableNumber}` : order.roomNumber ? `Room ${order.roomNumber}` : order.guestName} • ${relativeTime(order.placedAt)}`,
        trailing: formatInr(order.amount),
        trailingClass: 'tabular-nums font-semibold text-slate-900 text-xs',
      })),
      ...recentBookings.slice(0, 2).map((booking) => ({
        key: `booking-${booking.id}`,
        icon: BedDouble,
        color: 'bg-blue-50 text-blue-700 border border-blue-100',
        title: `Booking #${booking.bookingNumber}`,
        subtitle: `${booking.guestName} • ${booking.roomType} • Check-in ${new Date(booking.checkInDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`,
        trailing: formatInr(booking.grandTotal),
        trailingClass: 'tabular-nums font-semibold text-slate-900 text-xs',
      })),
      ...(dashboard?.liveOperations || []).slice(0, 2).map((request) => ({
        key: `request-${request.id}`,
        icon: ClipboardList,
        color: 'bg-amber-50 text-amber-700 border border-amber-100',
        title: `${String(request.type || 'SERVICE').replace(/_/g, ' ')} request`,
        subtitle: `${request.roomNumber ? `Room ${request.roomNumber}` : request.priority} • ${relativeTime(request.createdAt)}`,
        trailing: request.status,
        trailingClass:
          'text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200',
      })),
    ];

    const rawTrend = dashboard?.revenueTrend || [];
    const isAllZeroRevenue = rawTrend.length === 0 || rawTrend.every((pt) => Number(pt.revenue || 0) === 0);

    const sampleFigures = [
      { revenue: 38500, orders: 19 },
      { revenue: 54200, orders: 28 },
      { revenue: 49800, orders: 24 },
      { revenue: 27400, orders: 14 },
      { revenue: 31200, orders: 16 },
      { revenue: 42600, orders: 21 },
      { revenue: 36900, orders: 18 },
    ];

    const trendData = (rawTrend.length > 0 ? rawTrend : [
      { date: 'Day-1', label: 'Fri', revenue: 0, orders: 0 },
      { date: 'Day-2', label: 'Sat', revenue: 0, orders: 0 },
      { date: 'Day-3', label: 'Sun', revenue: 0, orders: 0 },
      { date: 'Day-4', label: 'Mon', revenue: 0, orders: 0 },
      { date: 'Day-5', label: 'Tue', revenue: 0, orders: 0 },
      { date: 'Day-6', label: 'Wed', revenue: 0, orders: 0 },
      { date: 'Day-7', label: 'Thu', revenue: 0, orders: 0 },
    ]).map((pt, i) => {
      if (showSimulatedPreview && isAllZeroRevenue) {
        const sample = sampleFigures[i % sampleFigures.length];
        return {
          ...pt,
          revenue: sample.revenue,
          orders: sample.orders,
          isSimulated: true,
        };
      }
      return {
        ...pt,
        revenue: Number(pt.revenue || 0),
        orders: Number(pt.orders || 0),
        isSimulated: false,
      };
    });

    const sum7DayRevenue = trendData.reduce((acc, pt) => acc + Number(pt.revenue || 0), 0);
    const sum7DayOrders = trendData.reduce((acc, pt) => acc + Number(pt.orders || 0), 0);
    const avgDailyRevenue = Math.round(sum7DayRevenue / Math.max(1, trendData.length));
    const avgTicketValue = sum7DayOrders > 0 ? Math.round(sum7DayRevenue / sum7DayOrders) : 0;

    let peakDay = trendData[0] || null;
    let peakIndex = 0;
    trendData.forEach((pt, i) => {
      if (Number(pt.revenue || 0) > Number(peakDay?.revenue || 0)) {
        peakDay = pt;
        peakIndex = i;
      }
    });

    return (
      <div className="space-y-5 max-w-7xl mx-auto pb-12">
        {/* Title Banner & Date / Export Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
                {propertyProfile.name || 'Hotel Command Center'}
              </h1>
              {propertyProfile.slug && (
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {propertyProfile.slug}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Property Operations • Sikar, Rajasthan • GSTIN: 08AABCS1429B1Z0 • 10 Guestrooms • 7 Dining Tables
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Date Selector */}
            <div className="relative flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium bg-white border-slate-200 text-slate-700 shadow-xs hover:border-slate-300 transition">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={dateRange}
                onChange={(event) => setDateRange(event.target.value)}
                aria-label="Dashboard date range"
                className="cursor-pointer appearance-none bg-transparent pr-5 text-xs font-medium text-slate-800 outline-none"
              >
                {DASHBOARD_DATE_RANGES.map((range) => (
                  <option key={range.label} value={range.value} className="bg-white text-slate-800">
                    {range.label} · {range.value}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 h-3 w-3 text-slate-400" />
            </div>

            {/* Export Report Button */}
            <button
              onClick={handleExportReport}
              className="btn-glass-green text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Report</span>
            </button>
          </div>
        </div>

        {/* QUICK OPERATIONS ACTION BAR */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 shrink-0 text-xs font-semibold text-slate-500 uppercase tracking-wide px-2">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Quick Actions:</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveModule('ROOM_MANAGEMENT');
                setRoomSubView('FRONTDESK');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold transition cursor-pointer"
            >
              <BedDouble className="w-3.5 h-3.5 text-blue-600" />
              <span>New Check-In</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveModule('LIVE_AVAILABILITY')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold transition cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Live Availability</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveModule('ORDERS_KITCHEN')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold transition cursor-pointer"
            >
              <Flame className="w-3.5 h-3.5 text-orange-600" />
              <span>Kitchen KDS</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveModule('ROOM_MANAGEMENT');
                setRoomSubView('MATRIX');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold transition cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Room Timeline Matrix</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveModule('STAFF_MANAGEMENT')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold transition cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-teal-600" />
              <span>Staff & Crew</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveModule('REPORTS_ANALYTICS')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold transition cursor-pointer"
            >
              <BarChart3 className="w-3.5 h-3.5 text-purple-600" />
              <span>Audits & Reports</span>
            </button>
          </div>
        </div>

        {(dashboardError || dashboardLoading) && (
          <div
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border px-4 py-3 text-xs font-semibold ${
 dashboardError
 ? 'border-red-200 bg-red-50 text-red-700'
 : 'border-slate-200 bg-slate-50 text-slate-700'
 }`}
          >
            <span className="flex items-center gap-2">
              {dashboardError ? (
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              ) : (
                <Loader2 className="w-4 h-4 shrink-0 animate-spin text-blue-600" />
              )}
              {dashboardError || 'Syncing live dashboard metrics…'}
            </span>
            <button
              type="button"
              onClick={() => void loadDashboard()}
              disabled={dashboardLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${dashboardLoading ? 'animate-spin' : ''}`} />
              Refresh live data
            </button>
          </div>
        )}

        {dashboard && (
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5 text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Live Synced
            </span>
            <span className="text-slate-300">•</span>
            <span>{selectedRange.label} ({selectedRange.value})</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-400">
              Updated {new Date(dashboard.generatedAt).toLocaleTimeString('en-IN')}
            </span>
          </div>
        )}

        {/* ================================================================== */}
        {/* ROW 1: 4 KPI STAT CARDS (EXACTLY 4 AS PER SPECIFICATION)          */}
        {/* ================================================================== */}
        {/* ROW 1: 4 CORE LIVE KPI STAT CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Revenue */}
          <div
            onClick={() => setActiveModule('REPORTS_ANALYTICS')}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Revenue</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border flex items-center gap-1 ${
                (kpis?.revenueGrowthPct || 0) >= 0
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                  : 'text-rose-700 bg-rose-50 border-rose-200'
              }`}>
                <ArrowUpRight className="w-3 h-3" />
                <span>{(kpis?.revenueGrowthPct || 0) >= 0 ? '+' : ''}{kpis?.revenueGrowthPct || 0}%</span>
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-slate-900">
                {formatInr(kpis?.totalRevenue || 0)}
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {kpis?.todayTransactions || 0} transactions settled
              </p>
            </div>
          </div>

          {/* Card 2: Room Occupancy */}
          <div
            onClick={() => setActiveModule('ROOM_MANAGEMENT')}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Room Occupancy</span>
              <span className="text-blue-700 bg-blue-50 text-[11px] px-2 py-0.5 rounded-full font-semibold border border-blue-200">
                {kpis?.occupancyRate || 0}% Occupied
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-slate-900">
                {occupiedRoomCount} <span className="text-base font-normal text-slate-400">/ {totalRooms}</span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-[11px] font-medium text-slate-500">
                <span className="text-emerald-600 font-semibold">● {availableRoomCount} Avail</span>
                <span>•</span>
                <span className="text-amber-600">● {dirtyRoomCount} Cleaning</span>
                {maintenanceRoomCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-rose-600">● {maintenanceRoomCount} Maint</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: Today's Front Desk Activity */}
          <div
            onClick={() => {
              setActiveModule('ROOM_MANAGEMENT');
              setRoomSubView('FRONTDESK');
            }}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Front Desk Flow</span>
              <span className="text-indigo-700 bg-indigo-50 text-[11px] px-2 py-0.5 rounded-full font-semibold border border-indigo-200">
                Today
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-slate-900">
                {kpis?.arrivalsToday || 0} <span className="text-sm font-semibold text-slate-500">Arrivals</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {kpis?.departuresToday || 0} departures • {kpis?.totalGuests || 0} in-house guests
              </p>
            </div>
          </div>

          {/* Card 4: Dining & Table Outlets */}
          <div
            onClick={() => setActiveModule('TABLE_MANAGEMENT')}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Dining & POS</span>
              <span className="text-emerald-700 bg-emerald-50 text-[11px] px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
                {kpis?.tableOccupancyRate || 0}% Seated
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-slate-900">
                {occupiedTables} <span className="text-base font-normal text-slate-400">/ {totalTables}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {kpis?.totalOrders || 0} orders ({kpis?.dineInOrders || 0} Dine-in, {kpis?.roomServiceOrders || 0} Room Svc)
              </p>
            </div>
          </div>
        </div>

        {/* ROW 2: EXECUTIVE REVENUE & DEMAND INTELLIGENCE GRAPH */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          {/* Top Header & View Controls */}
          <div className="p-5 md:p-6 pb-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200/60 shadow-xs">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm md:text-base tracking-tight text-slate-900">
                      Revenue & Demand Intelligence
                    </h3>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                      7-Day Flow
                    </span>
                    {showSimulatedPreview && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        Preview Mode Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real-time daily gross billing (₹), dining POS tickets & front desk room folios.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Metrics Bar & View Mode Switcher */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Peak Day Callout */}
              {peakDay && Number(peakDay.revenue) > 0 && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs font-semibold">
                  <Award className="w-3.5 h-3.5 text-amber-600" />
                  <span>
                    Peak: <strong className="text-slate-900 font-bold">{peakDay.label}</strong> ({formatInr(peakDay.revenue)})
                  </span>
                </div>
              )}

              {/* Run Rate */}
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs">
                <span className="text-slate-400">Run Rate:</span>
                <strong className="text-slate-900 font-semibold tabular-nums">{formatInr(avgDailyRevenue)}/d</strong>
              </div>

              {/* View Switcher: Hybrid | Area | Bars */}
              <div className="flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setChartViewMode('HYBRID')}
                  className={`px-3 py-1 rounded-md transition text-xs font-semibold flex items-center gap-1.5 ${
                    chartViewMode === 'HYBRID'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Combined Revenue Pillars & Order Flow Line"
                >
                  <Zap className="w-3 h-3 text-blue-600" />
                  <span>Hybrid</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChartViewMode('AREA')}
                  className={`px-3 py-1 rounded-md transition text-xs font-semibold flex items-center gap-1.5 ${
                    chartViewMode === 'AREA'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Smooth Revenue Stream Area"
                >
                  <TrendingUp className="w-3 h-3 text-blue-600" />
                  <span>Flow</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChartViewMode('BARS')}
                  className={`px-3 py-1 rounded-md transition text-xs font-semibold flex items-center gap-1.5 ${
                    chartViewMode === 'BARS'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="High-Contrast Daily Pillars"
                >
                  <BarChart3 className="w-3 h-3 text-blue-600" />
                  <span>Pillars</span>
                </button>
              </div>
            </div>
          </div>

          {/* Chart Display Canvas */}
          <div className="p-5 md:p-6 pt-4">
            <div className="h-72 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                {chartViewMode === 'HYBRID' ? (
                  <ComposedChart
                    data={trendData}
                    margin={{ top: 15, right: 12, left: -10, bottom: 0 }}
                    onClick={(state: any) => {
                      if (state && state.activeTooltipIndex !== undefined) {
                        setSelectedChartDayIndex(state.activeTooltipIndex);
                      }
                    }}
                  >
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity={0.92} />
                        <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.8} />
                      </linearGradient>
                      <linearGradient id="barGradActive" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity={0.95} />
                      </linearGradient>
                      <linearGradient id="areaSubtleGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity={0.12} />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#f1f5f9" strokeDasharray="4 4" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="#94a3b8"
                      fontSize={11}
                      fontWeight={500}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, (dataMax: number) => (dataMax > 0 ? 'auto' : 5000)]}
                      tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload || !payload.length) return null;
                        const pt = payload[0]?.payload;
                        const ptRev = Number(pt?.revenue || 0);
                        const ptOrders = Number(pt?.orders || 0);
                        const ticket = ptOrders > 0 ? Math.round(ptRev / ptOrders) : 0;
                        const diffPct = avgDailyRevenue > 0 ? Math.round(((ptRev - avgDailyRevenue) / avgDailyRevenue) * 100) : 0;
                        return (
                          <div className="rounded-xl border border-slate-200/90 bg-white/95 backdrop-blur-md p-3.5 shadow-xl text-xs min-w-[210px]">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                              <span className="font-bold text-slate-900">
                                {pt?.date ? new Date(pt.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }) : label}
                              </span>
                              {pt?.label === peakDay?.label && ptRev > 0 && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                  Peak Day
                                </span>
                              )}
                            </div>
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-slate-700">
                                <span className="flex items-center gap-1.5 font-medium">
                                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                                  Gross Billed:
                                </span>
                                <strong className="text-blue-600 tabular-nums font-bold">
                                  {formatInr(ptRev)}
                                </strong>
                              </div>
                              <div className="flex items-center justify-between text-slate-700">
                                <span className="flex items-center gap-1.5 font-medium">
                                  <span className="w-2 h-2 rounded-full bg-slate-700" />
                                  Total Orders / Folios:
                                </span>
                                <strong className="text-slate-800 tabular-nums font-bold">
                                  {ptOrders} bills
                                </strong>
                              </div>
                              <div className="flex items-center justify-between text-slate-500 text-[11px] pt-1 border-t border-slate-100">
                                <span>Avg Spend / Bill:</span>
                                <span className="tabular-nums font-semibold text-slate-800">
                                  {formatInr(ticket)}
                                </span>
                              </div>
                              {avgDailyRevenue > 0 && ptRev > 0 && (
                                <div className="text-[10px] text-right font-medium">
                                  <span className={diffPct >= 0 ? 'text-blue-600 font-semibold' : 'text-slate-500'}>
                                    {diffPct >= 0 ? `+${diffPct}%` : `${diffPct}%`} vs 7-day avg
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }}
                    />
                    {avgDailyRevenue > 0 && (
                      <ReferenceLine
                        yAxisId="left"
                        y={avgDailyRevenue}
                        stroke="#94a3b8"
                        strokeDasharray="4 4"
                        strokeWidth={1}
                        label={{
                          value: `Avg: ${formatInr(avgDailyRevenue)}`,
                          position: 'insideTopRight',
                          fill: '#64748b',
                          fontSize: 10,
                          fontWeight: 600,
                        }}
                      />
                    )}
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      fill="url(#areaSubtleGrad)"
                      stroke="none"
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="revenue"
                      name="Revenue"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={38}
                    >
                      {trendData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            selectedChartDayIndex === index || (selectedChartDayIndex === null && entry.label === peakDay?.label && Number(entry.revenue) > 0)
                              ? 'url(#barGradActive)'
                              : 'url(#barGrad)'
                          }
                          className="cursor-pointer transition-all hover:opacity-90"
                        />
                      ))}
                    </Bar>
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="orders"
                      name="Orders"
                      stroke="#0f172a"
                      strokeWidth={2.5}
                      dot={{ r: 3.5, fill: '#ffffff', stroke: '#0f172a', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: '#0f172a' }}
                    />
                  </ComposedChart>
                ) : chartViewMode === 'AREA' ? (
                  <AreaChart
                    data={trendData}
                    margin={{ top: 15, right: 12, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="areaFlowGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#f1f5f9" strokeDasharray="4 4" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="#94a3b8"
                      fontSize={11}
                      fontWeight={500}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, (dataMax: number) => (dataMax > 0 ? 'auto' : 5000)]}
                      tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload || !payload.length) return null;
                        const pt = payload[0]?.payload;
                        return (
                          <div className="rounded-xl border border-slate-200/90 bg-white/95 backdrop-blur-md p-3 shadow-lg text-xs min-w-[190px]">
                            <div className="font-bold text-slate-900 border-b border-slate-100 pb-1 mb-1.5">
                              {pt?.date ? new Date(pt.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }) : label}
                            </div>
                            <div className="flex items-center justify-between text-blue-600 font-semibold py-0.5">
                              <span>Revenue:</span>
                              <span className="tabular-nums font-bold">{formatInr(pt?.revenue || 0)}</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-700 font-medium py-0.5">
                              <span>Orders & Folios:</span>
                              <span className="tabular-nums font-bold">{pt?.orders || 0}</span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    {avgDailyRevenue > 0 && (
                      <ReferenceLine
                        yAxisId="left"
                        y={avgDailyRevenue}
                        stroke="#94a3b8"
                        strokeDasharray="4 4"
                        strokeWidth={1}
                        label={{
                          value: `Daily Avg: ${formatInr(avgDailyRevenue)}`,
                          position: 'insideTopRight',
                          fill: '#64748b',
                          fontSize: 10,
                          fontWeight: 600,
                        }}
                      />
                    )}
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#areaFlowGrad)"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="orders"
                      name="Orders"
                      stroke="#475569"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#475569' }}
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                ) : (
                  <BarChart
                    data={trendData}
                    margin={{ top: 15, right: 12, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid stroke="#f1f5f9" strokeDasharray="4 4" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="#94a3b8"
                      fontSize={11}
                      fontWeight={500}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload || !payload.length) return null;
                        const pt = payload[0]?.payload;
                        return (
                          <div className="rounded-xl border border-slate-200/90 bg-white/95 backdrop-blur-md p-3 shadow-lg text-xs min-w-[190px]">
                            <div className="font-bold text-slate-900 border-b border-slate-100 pb-1 mb-1.5">
                              {pt?.date ? new Date(pt.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }) : label}
                            </div>
                            <div className="flex items-center justify-between text-blue-600 font-semibold py-0.5">
                              <span>Revenue:</span>
                              <span className="tabular-nums font-bold">{formatInr(pt?.revenue || 0)}</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-600 font-medium py-0.5">
                              <span>Orders:</span>
                              <span className="tabular-nums font-bold">{pt?.orders || 0}</span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    {avgDailyRevenue > 0 && (
                      <ReferenceLine
                        y={avgDailyRevenue}
                        stroke="#94a3b8"
                        strokeDasharray="4 4"
                        strokeWidth={1}
                        label={{
                          value: `Avg: ${formatInr(avgDailyRevenue)}`,
                          position: 'insideTopRight',
                          fill: '#64748b',
                          fontSize: 10,
                          fontWeight: 600,
                        }}
                      />
                    )}
                    <Bar
                      dataKey="revenue"
                      name="Revenue"
                      fill="#2563eb"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={44}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Empty State Overlay when no transactions have occurred */}
            {sum7DayRevenue === 0 && !showSimulatedPreview && (
              <div className="mt-4 p-4 rounded-xl bg-slate-50/80 border border-slate-200/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-blue-600">
                    <Radio className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      Real-Time Revenue Ledger Active
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Zero transactions in this 7-day period. As guest check-ins or dining POS orders are settled, curves plot automatically.
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-500 font-medium shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Ledger Listening</span>
                </div>
              </div>
            )}

            {/* Bottom 7-Day Interactive Day Scrubber Strip */}
            <div className="mt-4 pt-3.5 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  7-Day Daily Ledger Breakdown
                </span>
                <span className="text-[11px] text-slate-400">
                  Click any day to inspect details
                </span>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {trendData.map((day, idx) => {
                  const isSelected = selectedChartDayIndex === idx;
                  const isPeak = day.label === peakDay?.label && Number(day.revenue) > 0;
                  return (
                    <div
                      key={`${day.date}-${idx}`}
                      onClick={() => setSelectedChartDayIndex(idx)}
                      className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/90 border-blue-500 shadow-xs ring-1 ring-blue-500 text-blue-900'
                          : isPeak
                          ? 'bg-amber-50/50 border-amber-200 hover:border-amber-300'
                          : 'bg-slate-50/60 border-slate-200/70 hover:bg-slate-100/80 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-[11px] font-bold text-slate-700">{day.label}</span>
                        {isPeak && <Award className="w-3 h-3 text-amber-600" />}
                      </div>
                      <div className="text-xs font-bold tabular-nums text-slate-900 mt-0.5">
                        {formatCompactInr(day.revenue)}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {day.orders} {day.orders === 1 ? 'order' : 'orders'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================== */}
        {/* ROW 2: MIDDLE SECTION (3 COLUMNS: LIVE OPS, TABLES, OCCUPANCY)      */}
        {/* ================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* COLUMN 1: LIVE OPERATIONS FEED (4 cols) */}
          <div className="lg:col-span-4 p-5 rounded-xl border bg-white border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-blue-600" />
                  <h3 className="font-semibold text-xs tracking-wide uppercase text-slate-900">
                    Live Operations
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Live
                  </span>
                </div>
                <span
                  onClick={() => setActiveModule('ORDERS_KITCHEN')}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                >
                  View All
                </span>
              </div>

              <div className="space-y-2.5">
                {dashboardLoading && liveFeed.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-xs font-medium text-slate-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading live operations…
                  </div>
                ) : liveFeed.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
                    <Radio className="mx-auto mb-2 h-5 w-5 text-slate-400" />
                    <div className="text-xs font-semibold text-slate-700">No live activity yet</div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      New orders, bookings and guest requests will appear here automatically.
                    </p>
                  </div>
                ) : (
                  liveFeed.slice(0, 6).map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.key}
                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs transition hover:border-slate-300"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.color}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-slate-900">{item.title}</div>
                            <div className="truncate text-[11px] text-slate-500">{item.subtitle}</div>
                          </div>
                        </div>
                        <span className={`shrink-0 ${item.trailingClass}`}>{item.trailing}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* COLUMN 2: RECENT ORDERS & RECENT ROOM BOOKINGS (4 cols) */}
          <div className="lg:col-span-4 space-y-4 flex flex-col justify-between">
            {/* Box A: Recent Orders (Restaurant) */}
            <div className="p-4 rounded-xl border bg-white border-slate-200 shadow-sm flex-1">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <UtensilsCrossed className="w-4 h-4 text-blue-600" />
                  <h3 className="font-semibold text-xs tracking-wide uppercase text-slate-900">
                    Recent Orders (Restaurant)
                  </h3>
                </div>
                <span
                  onClick={() => setActiveModule('ORDERS_KITCHEN')}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                >
                  View All
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <tbody className={`divide-y ${tableDivide}`}>
                    {recentOrders.length === 0 ? (
                      <tr>
                        <td colSpan={5} className={`py-8 text-center text-[11px] ${mutedRowText}`}>
                          {dashboardLoading ? 'Loading recent orders…' : 'No restaurant orders yet for this hotel.'}
                        </td>
                      </tr>
                    ) : (
                      recentOrders.slice(0, 5).map((row) => (
                        <tr key={row.id} className={`${rowHover} transition`}>
                          <td className={`py-2 tabular-nums font-semibold ${mutedRowText}`}>{row.orderNumber}</td>
                          <td className={`py-2 font-medium ${rowText}`}>
                            {row.tableNumber
                              ? `Table ${row.tableNumber}`
                              : row.roomNumber
                                ? `Room ${row.roomNumber}`
                                : row.orderType.replace(/_/g, ' ')}
                          </td>
                          <td className={`py-2 text-[11px] ${mutedRowText}`}>{row.itemCount} items</td>
                          <td className={`py-2 text-right font-semibold tabular-nums ${primaryText}`}>
                            {formatInr(row.amount)}
                          </td>
                          <td className="py-2 text-right">
                            <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${orderStatusClass(row.status)}`}>
                              {row.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Box B: Recent Room Bookings */}
            <div className="p-4 rounded-xl border bg-white border-slate-200 shadow-sm flex-1">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <h3 className="font-semibold text-xs tracking-wide uppercase text-slate-900">
                    Recent Room Bookings
                  </h3>
                </div>
                <span
                  onClick={() => setActiveModule('ROOM_MANAGEMENT')}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                >
                  View All
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <tbody className={`divide-y ${tableDivide}`}>
                    {recentBookings.length === 0 ? (
                      <tr>
                        <td colSpan={5} className={`py-8 text-center text-[11px] ${mutedRowText}`}>
                          {dashboardLoading ? 'Loading recent bookings…' : 'No room bookings yet for this hotel.'}
                        </td>
                      </tr>
                    ) : (
                      recentBookings.slice(0, 5).map((row) => {
                        const nights = Math.max(
                          1,
                          Math.round(
                            (new Date(row.checkOutDate).getTime() - new Date(row.checkInDate).getTime()) /
                              86400000
                          )
                        );
                        return (
                          <tr key={row.id} className={`${rowHover} transition`}>
                            <td className={`py-2 tabular-nums font-semibold ${mutedRowText}`}>{row.bookingNumber}</td>
                            <td className={`py-2 font-bold tabular-nums ${primaryText}`}>{row.roomNumber || '—'}</td>
                            <td className={`max-w-[90px] truncate py-2 ${rowText}`}>{row.guestName}</td>
                            <td className={`py-2 text-[11px] ${mutedRowText}`}>
                              {nights} Night{nights === 1 ? '' : 's'}
                            </td>
                            <td className="py-2 text-right">
                              <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${bookingStatusClass(row.status)}`}>
                                {row.status.replace(/_/g, ' ')}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* COLUMN 3: OCCUPANCY & REVENUE OVERVIEW (4 cols) */}
          <div className="lg:col-span-4 space-y-4 flex flex-col justify-between">
            {/* Box A: Occupancy Overview (Donut Chart) */}
            <div className="p-4 rounded-xl border bg-white border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <h3 className="font-semibold text-xs tracking-wide uppercase text-slate-900">
                    Occupancy Overview
                  </h3>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px]">
                  <button
                    onClick={() => setOccupancyTab('ROOMS')}
                    className={`px-2.5 py-1 rounded font-semibold transition ${
 occupancyTab === 'ROOMS' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60' : 'text-slate-600 hover:text-slate-900'
 }`}
                  >
                    Rooms
                  </button>
                  <button
                    onClick={() => setOccupancyTab('TABLES')}
                    className={`px-2.5 py-1 rounded font-semibold transition ${
 occupancyTab === 'TABLES' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60' : 'text-slate-600 hover:text-slate-900'
 }`}
                  >
                    Tables
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 py-2">
                {/* Donut Chart */}
                <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="38" stroke="#f1f5f9" strokeWidth="10" fill="none" />
                    {activeSegments.map((segment) => {
                      const length = activeTotal > 0 ? (segment.count / activeTotal) * donutCircumference : 0;
                      const circle = (
                        <circle
                          key={segment.label}
                          cx="50"
                          cy="50"
                          r="38"
                          stroke={segment.color}
                          strokeWidth="10"
                          fill="none"
                          strokeDasharray={`${length} ${donutCircumference - length}`}
                          strokeDashoffset={-donutOffset}
                        />
                      );
                      donutOffset += length;
                      return circle;
                    })}
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-base font-bold tabular-nums text-slate-900">
                      {activeRate}%
                    </span>
                    <span className="text-[9px] uppercase font-semibold text-slate-500">
                      {occupancyTab === 'TABLES' ? 'Dine In' : 'Occupied'}
                    </span>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex-1 space-y-1.5 text-xs">
                  {activeSegments.map((segment) => (
                    <div key={segment.label} className="flex items-center justify-between">
                      <span className="text-slate-600 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: segment.color }} />
                        {segment.label}
                      </span>
                      <strong className="tabular-nums text-slate-900">{segment.count}</strong>
                    </div>
                  ))}
                  <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{occupancyTab === 'TABLES' ? 'Total Tables' : 'Total Rooms'}</span>
                    <strong className="font-semibold tabular-nums text-slate-900">{activeTotal}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Box B: Outlets & Guest Activity (Actionable Operations) */}
            <div className="p-4 rounded-xl border bg-white border-slate-200 shadow-sm flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-blue-600" />
                    <h3 className="font-semibold text-xs tracking-wide uppercase text-slate-900">
                      Outlets & Guest Activity
                    </h3>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                    Live Activity
                  </span>
                </div>

                {/* 4 Channel Flow Cards */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div
                    onClick={() => setActiveModule('LIVE_AVAILABILITY')}
                    className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/70 hover:bg-blue-50/50 hover:border-blue-300 transition cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center text-blue-700">
                          <UtensilsCrossed className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-semibold text-slate-800">Dine-In</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
                    </div>
                    <div className="text-lg font-bold tabular-nums text-slate-900">
                      {kpis?.dineInOrders || 0}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {kpis ? `${kpis.occupiedTables} / ${kpis.totalTables} tables seated` : '0 tables active'}
                    </div>
                  </div>

                  <div
                    onClick={() => setActiveModule('ORDERS_KITCHEN')}
                    className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/70 hover:bg-indigo-50/50 hover:border-indigo-300 transition cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-md bg-indigo-100 flex items-center justify-center text-indigo-700">
                          <BedDouble className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-semibold text-slate-800">Room Service</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition" />
                    </div>
                    <div className="text-lg font-bold tabular-nums text-slate-900">
                      {kpis?.roomServiceOrders || 0}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Direct room deliveries
                    </div>
                  </div>

                  <div
                    onClick={() => setActiveModule('ORDERS_KITCHEN')}
                    className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/70 hover:bg-amber-50/50 hover:border-amber-300 transition cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-md bg-amber-100 flex items-center justify-center text-amber-700">
                          <ShoppingBag className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-semibold text-slate-800">Takeaway</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition" />
                    </div>
                    <div className="text-lg font-bold tabular-nums text-slate-900">
                      {kpis?.takeawayOrders || 0}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Pick-up & parcel orders
                    </div>
                  </div>

                  <div
                    onClick={() => setActiveModule('ROOM_MANAGEMENT')}
                    className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/70 hover:bg-slate-100/80 hover:border-slate-300 transition cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-md bg-slate-200 flex items-center justify-center text-slate-700">
                          <UserCheck className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-semibold text-slate-800">Front Desk</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition" />
                    </div>
                    <div className="text-lg font-bold tabular-nums text-slate-900">
                      {kpis?.arrivalsToday || 0}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {kpis ? `${kpis.departuresToday} departures today` : '0 departures'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Quick Action Strip */}
              <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[11px]">
                  Total orders today: <strong className="text-slate-900 font-semibold">{kpis?.todayTransactions || 0}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setActiveModule('LIVE_AVAILABILITY')}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700"
                >
                  Live Rooms & Tables
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    );
  };

  // ==========================================================================
  // RENDER DYNAMIC MODULE APPLICATION SCREENS
  // ==========================================================================
  const renderActiveModuleScreen = () => {
    switch (activeModule) {
      case 'DASHBOARD':
        return renderDashboardView();

      case 'ROOM_MANAGEMENT':
        return (
          <div className="h-full flex flex-col overflow-hidden">
            {/* Top Sub-Navigation Bar */}
            <div className="px-4 py-2 border-b border-slate-200 bg-white flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setRoomSubView('STUDIO')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
                    roomSubView === 'STUDIO'
                      ? 'btn-glass-green text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  <BedDouble className="w-3.5 h-3.5" />
                  <span>Rooms & Tariffs Studio</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRoomSubView('MATRIX')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
                    roomSubView === 'MATRIX'
                      ? 'btn-glass-green text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Timeline Matrix</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRoomSubView('FRONTDESK')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
                    roomSubView === 'FRONTDESK'
                      ? 'btn-glass-green text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Front Desk Check-in</span>
                </button>
              </div>

              <span className="text-xs text-slate-500 font-medium hidden md:inline">
                {roomSubView === 'STUDIO'
                  ? 'Room catalog, tariffs, capacity & climate controls'
                  : roomSubView === 'MATRIX'
                  ? 'Real-time reservation calendar & room allotment matrix'
                  : 'Front Desk guest arrivals, KYC verification & check-ins'}
              </span>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
              {roomSubView === 'STUDIO' && (
                <RoomCatalogStudioApp
                  onOpenMatrix={() => setRoomSubView('MATRIX')}
                  onOpenFrontDesk={() => setRoomSubView('FRONTDESK')}
                />
              )}
              {roomSubView === 'FRONTDESK' && (
                <FrontDeskCheckInApp authToken={token} hotelId={hotelId} isDark={false} />
              )}
              {roomSubView === 'MATRIX' && (
                <div className="h-full relative overflow-hidden">
                  {matrixError && (
                    <div className="absolute left-4 right-4 top-4 z-[60] flex items-center justify-between gap-3 rounded-xl border border-red-500/40 bg-red-950/95 px-4 py-3 text-xs text-red-100 shadow-sm dark:shadow-none">
                      <span className="font-semibold">PMS sync: {matrixError}</span>
                      <button
                        onClick={() => {
                          void loadMatrix(
                            matrixStore.getStartDate(),
                            matrixStore.getDays(),
                            matrixStore.getSelectedRoomTypeId()
                          ).catch(() => undefined);
                        }}
                        className="shrink-0 rounded-lg border border-red-400/40 bg-red-500/20 px-3 py-1.5 font-bold text-red-50 hover:bg-red-500/30"
                      >
                        Retry Sync
                      </button>
                    </div>
                  )}
                  <PmsReservationMatrixApp
                    store={matrixStore}
                    onFetchMatrixData={async (startDate, days, roomTypeId) => {
                      try {
                        await loadMatrix(startDate, days, roomTypeId);
                      } catch {
                        // Banner already reflects the failure.
                      }
                    }}
                    onConfirmBooking={async (data) => {
                      try {
                        await getApiClient().pms.quickReserve(data);
                        setMatrixError(null);
                      } catch (error: any) {
                        setMatrixError(error?.message || 'Reservation could not be created.');
                        throw error;
                      }
                    }}
                    onCheckInGuest={async (bookingId, physicalRoomId) => {
                      try {
                        await getApiClient().pms.checkIn({ bookingId, physicalRoomId });
                        setMatrixError(null);
                      } catch (error: any) {
                        setMatrixError(error?.message || 'Guest check-in failed.');
                        throw error;
                      }
                    }}
                    onReassignRoom={async (bookingId, targetRoomId) => {
                      try {
                        await getApiClient().pms.assignRoom(bookingId, targetRoomId);
                        setMatrixError(null);
                      } catch (error: any) {
                        setMatrixError(error?.message || 'Room reassignment failed.');
                        throw error;
                      }
                    }}
                    onCancelReservation={async (bookingId) => {
                      try {
                        await getApiClient().pms.updateBookingStatus(bookingId, 'CANCELLED');
                        setMatrixError(null);
                      } catch (error: any) {
                        setMatrixError(error?.message || 'Reservation cancellation failed.');
                        throw error;
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        );

      case 'GUESTS_BOOKINGS':
        return (
          <div className="h-full">
            <FrontDeskCheckInApp authToken={token} hotelId={hotelId} isDark={false} />
          </div>
        );

      case 'LIVE_AVAILABILITY':
      case 'POS_CASHIER':
        return (
          <div className="h-full">
            <LivePropertyAvailabilityApp
              token={token}
              hotelId={hotelId}
              onNavigateToFrontDesk={(roomNum) => {
                setActiveModule('ROOM_MANAGEMENT');
                setRoomSubView('FRONTDESK');
              }}
              onNavigateToTables={() => {
                setActiveModule('TABLE_MANAGEMENT');
              }}
              onNavigateToHousekeeping={() => {
                setActiveModule('HOUSEKEEPING');
              }}
            />
          </div>
        );

      case 'HOUSEKEEPING':
        return (
          <div className="h-full">
            <HousekeepingTurnaroundApp />
          </div>
        );

      case 'TABLE_MANAGEMENT':
        return (
          <div className="h-full">
            <TableManagementStudioApp isDark={false} hotelId={hotelId} mode="TABLES" />
          </div>
        );

      case 'RESTAURANTS_OUTLETS':
        return (
          <div className="h-full">
            <TableManagementStudioApp isDark={false} hotelId={hotelId} mode="OUTLETS" />
          </div>
        );

      case 'ORDERS_KITCHEN':
        return (
          <div className="h-full">
            <LiveOrdersAndKdsConsoleApp hotelId={hotelId} />
          </div>
        );

      case 'MENU_CATALOG':
        return (
          <div className="h-full">
            <MenuCatalogManagerApp
              key={currentMenuCatalogTab}
              isDark={false}
              hotelId={hotelId}
              initialTab={currentMenuCatalogTab}
            />
          </div>
        );

      case 'INVENTORY_STOCK':
        return (
          <div className="h-full overflow-y-auto">
            <UnifiedInventoryHubApp authToken={token} hotelId={hotelId} />
          </div>
        );

      case 'PURCHASES_SUPPLIERS':
        return (
          <div className="h-full">
            <InventoryPoApp token={token} />
          </div>
        );

      case 'EXPENSES_ACCOUNTING':
        return (
          <div className="h-full">
            <NightAuditApp token={token} hotelId={hotelId} />
          </div>
        );

      case 'REVENUE_MANAGER':
        return (
          <div className="h-full overflow-y-auto">
            <RevenueManagerApp token={token} hotelId={hotelId} />
          </div>
        );

      case 'REPORTS_ANALYTICS':
        return (
          <div className="h-full overflow-y-auto">
            <HotelReportsAndAnalyticsView
              isDark={false}
              hotelId={hotelId}
              token={token}
              onOpenNightAudit={() => setActiveModule('EXPENSES_ACCOUNTING')}
            />
          </div>
        );

      case 'STAFF_MANAGEMENT':
        return (
          <div className="h-full">
            <StaffUserManagementApp isDark={false} hotelId={hotelId} />
          </div>
        );

      case 'PAYROLL':
        return (
          <div className="h-full">
            <PayrollDashboard hotelId={hotelId} />
          </div>
        );

      case 'MAINTENANCE':
        return (
          <div className="h-full">
            <LostAndFoundVaultApp authToken={token} hotelId={hotelId} />
          </div>
        );

      case 'SETTINGS_CONFIGURATION':
        return (
          <div className="h-full">
            <RestaurantOperationsHubApp
              key={currentOperationsTab}
              isDark={false}
              hotelId={hotelId}
              initialTab={currentOperationsTab}
              onNavigateModule={(mod) => setActiveModule(mod as ErpModuleKey)}
            />
          </div>
        );

      case 'NOTIFICATIONS':
        return (
          <NotificationCenterView
            isDark={false}
            onNavigateModule={(mod) => setActiveModule(mod)}
            onBackToDashboard={() => setActiveModule('DASHBOARD')}
            onUnreadCountChange={(cnt) => setUnreadNotifCount(cnt)}
          />
        );

      case 'POLICIES_AND_USECASES':
        return (
          <HotelPoliciesAndUseCasesHubApp
            isDark={false}
            hotelId={hotelId}
            onNavigateModule={(mod) => setActiveModule(mod)}
          />
        );

      case 'COUPONS_VOUCHERS':
        return (
          <div className="h-full overflow-y-auto">
            <CouponsAndVouchersStudioApp hotelId={hotelId} />
          </div>
        );

      case 'BANQUET':
        return (
          <div className="h-full overflow-y-auto">
            <BanquetManagementApp hotelId={hotelId} token={token} />
          </div>
        );

      case 'CORPORATE':
        return (
          <div className="h-full overflow-y-auto">
            <CorporateMasterFolioApp hotelId={hotelId} token={token} />
          </div>
        );

      case 'DINING_RESERVATIONS':
        return (
          <div className="h-full overflow-y-auto">
            <DiningReservationApp hotelId={hotelId} authToken={token} />
          </div>
        );

      case 'KOT_VOID':
        return (
          <div className="h-full overflow-y-auto">
            <KotVoidAuditApp hotelId={hotelId} />
          </div>
        );

      case 'RECIPE_COSTING':
        return (
          <div className="h-full overflow-y-auto">
            <RecipeCostingApp token={token} />
          </div>
        );

      case 'STORE_REQUISITIONS':
        return (
          <div className="h-full overflow-y-auto">
            <StoreRequisitionApp token={token} />
          </div>
        );

      case 'FLOOR_DUTY':
        return (
          <div className="h-full overflow-y-auto p-4">
            <FloorDutyMatrixView
              floors={[
                {
                  floorName: 'Ground Floor Dining',
                  floorCode: 'FL-01',
                  supervisorName: 'Vikram Mehta',
                  shift: 'Morning Shift',
                  totalTables: 20,
                  totalCapacity: 80,
                  totalAssignedTables: 16,
                  totalAssignedPax: 64,
                  unassignedTablesCount: 4,
                  unassignedTables: ['T-17', 'T-18', 'T-19', 'T-20'],
                  activeWaitersCount: 4,
                  overloadedWaitersCount: 0,
                  overloadedWaiters: [],
                },
              ]}
            />
          </div>
        );
      default:
        return (
          <div className="p-8 text-center text-xs text-slate-400">
            Selected module {activeModule} is active and synchronized with SpiceHub Hotel Engine.
          </div>
        );
    }
  };

  return (
    <div className="h-screen overflow-hidden flex font-sans select-none bg-slate-50 text-slate-900">
      {/* ======================================================== */}
      {/* 1. LEFT SIDEBAR                                          */}
      {/* ======================================================== */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <aside
        className={`${
 mobileMenuOpen ? 'flex fixed inset-y-0 left-0 z-50 w-64 shadow-lg' : 'hidden md:flex'
 } ${
 sidebarCollapsed ? 'md:w-20' : 'md:w-64'
 } shrink-0 h-full flex flex-col transition-all duration-200 border-r bg-white border-slate-200 text-slate-700 select-none`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200">
          <div
            onClick={handleOpenPropertyModal}
            className="flex items-center gap-3 overflow-hidden cursor-pointer group"
            title="Click to customize Hotel Logo & Profile"
          >
            <div className="relative w-9 h-9 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center text-emerald-600 shrink-0 group-hover:border-emerald-500 transition-colors">
              {propertyProfile.logoUrl ? (
                <img src={propertyProfile.logoUrl} alt={propertyProfile.name} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-5 h-5 text-emerald-600" />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
            {!sidebarCollapsed && (
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors truncate" title={propertyProfile.name}>
                    {propertyProfile.name}
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-medium truncate flex items-center gap-1">
                  <span>{propertyProfile.tagline || 'Hotel Admin'}</span>
                  <span className="text-[10px] text-blue-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">• Edit</span>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition text-xs"
            title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {sidebarCollapsed ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Scrollable Navigation Items */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
          {SIDEBAR_ITEMS.map((item) => {
            const isActive = activeModule === item.key;
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => {
                  setActiveModule(item.key);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                  isActive
                    ? 'bg-blue-50 text-blue-900 font-semibold border-l-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                {!sidebarCollapsed && (
                  <div className="flex-1 flex items-center justify-between truncate">
                    <span className="truncate">{item.label}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Profile Card & Logout */}
        <div className="p-4 border-t border-slate-200 space-y-3">
          <div
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 transition cursor-pointer"
            title="View Admin Profile & Photo"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden">
                {adminAvatar ? (
                  <img src={adminAvatar} alt="Admin" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-slate-600" />
                )}
              </div>
              {!sidebarCollapsed && (
                <div className="truncate">
                  <div className="text-xs font-semibold text-slate-900 truncate">{adminUser.name}</div>
                  <div className="text-[11px] text-slate-500 truncate">{adminUser.role || 'Hotel Manager'}</div>
                </div>
              )}
            </div>
            {!sidebarCollapsed && <ChevronRight className="w-4 h-4 text-slate-400" />}
          </div>

          <button
            onClick={handleLogout}
            data-testid="sidebar-admin-logout-btn"
            title="Sign Out / Logout"
            className="w-full py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 border border-slate-200 bg-white text-slate-700 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            {!sidebarCollapsed && <span>{t('Logout')}</span>}
          </button>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. MAIN WORKSPACE CONTAINER                              */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col h-full min-w-0 min-h-0 overflow-hidden">
        {impersonationInfo && (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 bg-amber-100 px-4 py-2 text-sm text-amber-950">
            <p className="font-semibold">
              You are impersonating {impersonationInfo.hotelName}.
              {impersonationInfo.expiresAt && (
                <span className="ml-1 font-normal">
                  Temporary session expires {new Date(impersonationInfo.expiresAt).toLocaleTimeString()}.
                </span>
              )}
            </p>
            <button
              type="button"
              onClick={handleExitImpersonation}
              className="min-h-9 rounded-lg border border-amber-300 bg-white px-3 text-xs font-semibold text-amber-950 hover:bg-amber-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
            >
              Exit impersonation
            </button>
          </div>
        )}
        {/* Top Navbar */}
        <header className="min-h-16 shrink-0 px-3 sm:px-6 py-2 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-2 sm:gap-4 sticky top-0 z-20">
          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shrink-0"
            title="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          {/* Search Bar */}
          <div className="order-3 sm:order-none w-full sm:w-auto flex-1 max-w-xl min-w-0">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs focus-within:border-blue-600 focus-within:bg-white focus-within:ring-1 focus-within:ring-blue-600 transition-all">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search orders, guests, rooms..."
                className="bg-transparent border-none outline-none w-full text-xs placeholder:text-slate-400 font-normal truncate min-w-0 text-slate-900"
              />
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-100 border border-slate-200 shrink-0">
                ⌘K
              </span>
            </div>
          </div>

          {/* Top Right Controls */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {isGroupAdmin && (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <select
                  value={selectedProperty}
                  onChange={(e) => setSelectedProperty(e.target.value as 'all' | 'mahesh' | 'taj')}
                  className="bg-transparent text-xs font-semibold text-slate-700 outline-none min-w-[126px]"
                  aria-label="Select property"
                >
                  {propertySelectorOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Live Property & Logo Settings Quick Action */}
            <button
              onClick={handleOpenPropertyModal}
              data-testid="btn-hotel-profile-settings"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-xs font-medium transition-colors"
              title="Configure Hotel Brand Logo, Physical Location, GPS & Wi-Fi"
            >
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Hotel Profile & Location</span>
              {propertyProfile.city && (
                <span className="hidden lg:inline-flex items-center gap-1 text-[11px] text-slate-500 font-normal border-l border-slate-200 pl-2">
                  <MapPin className="w-3 h-3 text-blue-600" />
                  {propertyProfile.city}
                </span>
              )}
            </button>

            {/* Live Status Indicator */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>System Active</span>
            </div>

            {/* Quick Refresh Button */}
            <button
              onClick={() => loadDashboard()}
              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              title="Refresh Live Operations Data"
            >
              <RefreshCw className={`w-4 h-4 ${dashboardLoading ? 'animate-spin text-blue-600' : ''}`} />
            </button>

            {/* Notifications Bell */}
            <button
              onClick={() => setActiveModule('NOTIFICATIONS')}
              className="relative p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              title={`${unreadNotifCount} Active Notifications`}
            >
              <Bell className="w-4 h-4" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                  {unreadNotifCount}
                </span>
              )}
            </button>

            {/* Bilingual English / Hindi Language Toggle */}
            <LanguageToggle isDark={false} />

            {/* Admin Profile Trigger */}
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 transition-colors"
              title="Admin Profile & Controls"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 text-xs font-semibold overflow-hidden shrink-0">
                {adminAvatar ? (
                  <img src={adminAvatar} alt="Admin" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-3.5 h-3.5 text-slate-600" />
                )}
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-semibold text-slate-900 leading-tight">
                  {adminUser.name}
                </div>
                <div className="text-[10px] text-slate-500 leading-tight">
                  {adminUser.role || 'Hotel Manager'}
                </div>
              </div>
            </button>

            {/* Direct Navbar Logout Button */}
            <button
              onClick={handleLogout}
              data-testid="admin-logout-btn"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-xs font-medium transition-colors"
              title="Sign Out / Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('Logout')}</span>
            </button>
          </div>
        </header>

        {/* Workspace Body */}
        <main className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {renderActiveModuleScreen()}
        </main>


        {isSupportModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/40 p-4">
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="support-ticket-title"
              className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="support-ticket-title" className="text-lg font-semibold">Help &amp; Support</h2>
                  <p className="mt-1 text-sm text-slate-500">Send a request to the SpiceHub support team.</p>
                </div>
                <button
                  type="button"
                  aria-label="Close support form"
                  onClick={() => setIsSupportModalOpen(false)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {supportError && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{supportError}</p>}
              {supportSuccess ? (
                <div role="status" className="mt-5">
                  <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{supportSuccess}</p>
                  <button
                    type="button"
                    onClick={() => setIsSupportModalOpen(false)}
                    className="mt-4 min-h-11 w-full rounded-lg btn-glass-green px-4 text-sm font-semibold text-white"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={(event) => void submitSupportTicket(event)} className="mt-5 space-y-4">
                  <label className="block space-y-1.5 text-sm font-medium text-slate-700">
                    Subject
                    <input
                      required
                      minLength={4}
                      maxLength={160}
                      value={supportSubject}
                      onChange={(event) => setSupportSubject(event.target.value)}
                      className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    />
                  </label>
                  <label className="block space-y-1.5 text-sm font-medium text-slate-700">
                    Description
                    <textarea
                      required
                      minLength={10}
                      maxLength={4000}
                      rows={5}
                      value={supportDescription}
                      onChange={(event) => setSupportDescription(event.target.value)}
                      className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    />
                  </label>
                  <label className="block space-y-1.5 text-sm font-medium text-slate-700">
                    Priority
                    <select
                      value={supportPriority}
                      onChange={(event) => setSupportPriority(event.target.value as 'LOW' | 'MEDIUM' | 'HIGH')}
                      className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </label>
                  <button
                    type="submit"
                    disabled={supportSubmitting}
                    className="min-h-11 w-full rounded-lg btn-glass-green px-4 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60"
                  >
                    {supportSubmitting ? 'Submitting…' : 'Submit support request'}
                  </button>
                </form>
              )}
            </section>
          </div>
        )}

        {/* ErpMasterDirectoryModal */}
        <ErpMasterDirectoryModal
          isOpen={isMasterDirectoryOpen}
          onClose={() => setIsMasterDirectoryOpen(false)}
          onSelectSystem={handleSelectMasterSystem}
          isDark={isDark}
        />

        {/* Property & Wi-Fi Settings Modal */}
        {isPropertyModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-xl rounded-2xl border bg-white border-slate-200 text-slate-900 p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Hotel Identity, Brand Logo & Settings</h3>
                    <p className="text-xs text-slate-500">Live sync across staff workstations, customer menus & guest portals</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPropertyModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSavePropertyProfile} className="space-y-4 text-xs font-medium">
                {/* Hotel Brand Logo from Gallery / Device */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-slate-800 font-bold text-xs uppercase tracking-wider">
                        Hotel Brand Logo (From Gallery)
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Upload your hotel's official logo directly from your device photos or files.
                      </p>
                    </div>
                    {propertyEditForm.logoUrl && (
                      <button
                        type="button"
                        onClick={() => setPropertyEditForm((prev) => ({ ...prev, logoUrl: '' }))}
                        className="text-xs text-red-600 hover:text-red-700 font-semibold transition"
                      >
                        Remove Logo
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3.5 pt-1">
                    {/* Live Logo Preview Box */}
                    <div className="w-16 h-16 rounded-xl border-2 border-slate-300 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                      {propertyEditForm.logoUrl ? (
                        <img
                          src={propertyEditForm.logoUrl}
                          alt="Hotel Logo Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <Building2 className="w-6 h-6 text-slate-300" />
                          <span className="text-[9px] font-bold text-slate-400 mt-0.5">NO LOGO</span>
                        </div>
                      )}
                    </div>

                    {/* Gallery Action */}
                    <div className="flex-1 space-y-1.5">
                      <input
                        type="file"
                        id="hotel-logo-upload-input"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoFileUpload}
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <label
                          htmlFor="hotel-logo-upload-input"
                          data-testid="choose-logo-gallery-btn"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 font-semibold text-xs cursor-pointer shadow-xs transition"
                        >
                          <Upload className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Choose Logo from Gallery</span>
                        </label>
                        <span className="text-[11px] text-slate-400">or paste URL</span>
                      </div>

                      <input
                        type="text"
                        placeholder="Optional image URL (https://...)"
                        value={propertyEditForm.logoUrl.startsWith('data:') ? '' : propertyEditForm.logoUrl}
                        onChange={(e) => setPropertyEditForm({ ...propertyEditForm, logoUrl: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-emerald-500 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Hotel / Property Legal Name *</label>
                  <input
                    type="text"
                    required
                    value={propertyEditForm.name}
                    onChange={(e) => setPropertyEditForm({ ...propertyEditForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-blue-500 font-semibold text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Property Tagline & Subtitle</label>
                    <input
                      type="text"
                      value={propertyEditForm.tagline}
                      onChange={(e) => setPropertyEditForm({ ...propertyEditForm, tagline: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Front Desk Contact Phone *</label>
                    <input
                      type="text"
                      required
                      value={propertyEditForm.contactPhone}
                      onChange={(e) => setPropertyEditForm({ ...propertyEditForm, contactPhone: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>

                {/* Guest In-Room Wi-Fi Credentials */}
                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-3">
                  <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold text-xs text-blue-900 uppercase tracking-wider">
                      Guest In-Room Wi-Fi Credentials
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    These credentials automatically appear in guest keycard folios, WhatsApp confirmations, and customer portal screens.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Wi-Fi Network Name (SSID) *</label>
                      <input
                        type="text"
                        required
                        value={propertyEditForm.wifiSsid}
                        onChange={(e) => setPropertyEditForm({ ...propertyEditForm, wifiSsid: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-blue-500 font-semibold text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Wi-Fi Password / Passkey *</label>
                      <input
                        type="text"
                        required
                        value={propertyEditForm.wifiPassword}
                        onChange={(e) => setPropertyEditForm({ ...propertyEditForm, wifiPassword: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-blue-500 font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Verified Physical Location, Coordinates & Google Maps */}
                <div data-testid="hotel-location-section" className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-xs uppercase tracking-wider text-slate-900 block">
                          Verified Physical Location & Google Maps
                        </span>
                        <p className="text-[11px] text-slate-500">
                          Accurate address and GPS coordinates for Room Booking geofencing, customer directions & Table check-in.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      data-testid="detect-device-gps-btn"
                      onClick={() => {
                        if (!navigator.geolocation) {
                          alert('Geolocation is not supported by your browser.');
                          return;
                        }
                        navigator.geolocation.getCurrentPosition(
                          (pos) => {
                            const lat = Math.round(pos.coords.latitude * 10000) / 10000;
                            const lng = Math.round(pos.coords.longitude * 10000) / 10000;
                            setPropertyEditForm((prev) => ({
                              ...prev,
                              latitude: lat,
                              longitude: lng,
                              googleMapUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
                            }));
                          },
                          (err) => alert('Could not detect GPS location: ' + err.message),
                          { timeout: 8000 }
                        );
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-semibold text-xs flex items-center gap-1.5 transition shadow-2xs"
                    >
                      <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Detect Current GPS</span>
                    </button>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Street Address / Landmark</label>
                    <input
                      type="text"
                      data-testid="hotel-street-input"
                      placeholder="e.g. Plot 42, Civil Lines, Near Heritage Circle"
                      value={propertyEditForm.street}
                      onChange={(e) => setPropertyEditForm({ ...propertyEditForm, street: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-blue-500 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">City *</label>
                      <input
                        type="text"
                        required
                        data-testid="hotel-city-input"
                        placeholder="Jaipur"
                        value={propertyEditForm.city}
                        onChange={(e) => setPropertyEditForm({ ...propertyEditForm, city: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-blue-500 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">State *</label>
                      <input
                        type="text"
                        required
                        data-testid="hotel-state-input"
                        placeholder="Rajasthan"
                        value={propertyEditForm.state}
                        onChange={(e) => setPropertyEditForm({ ...propertyEditForm, state: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-blue-500 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Country</label>
                      <input
                        type="text"
                        data-testid="hotel-country-input"
                        placeholder="India"
                        value={propertyEditForm.country}
                        onChange={(e) => setPropertyEditForm({ ...propertyEditForm, country: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-blue-500 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Pincode *</label>
                      <input
                        type="text"
                        required
                        data-testid="hotel-pincode-input"
                        placeholder="302006"
                        maxLength={6}
                        value={propertyEditForm.pincode}
                        onChange={(e) => {
                          const digitsOnly = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                          setPropertyEditForm({ ...propertyEditForm, pincode: digitsOnly });
                        }}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-blue-500 font-mono text-xs font-bold"
                      />
                    </div>
                  </div>

                  {/* Coordinates & Quick Presets */}
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        GPS Coordinates (Latitude & Longitude)
                      </span>
                      <div className="flex items-center gap-1 text-[10px]">
                        <span className="text-slate-400">Quick Pins:</span>
                        {[
                          { city: 'Jaipur', lat: 26.9124, lng: 75.7873 },
                          { city: 'Delhi', lat: 28.6139, lng: 77.2090 },
                          { city: 'Mumbai', lat: 19.0760, lng: 72.8777 },
                          { city: 'Goa', lat: 15.2993, lng: 74.1240 },
                        ].map((pin) => (
                          <button
                            key={pin.city}
                            type="button"
                            onClick={() => {
                              setPropertyEditForm((prev) => ({
                                ...prev,
                                latitude: pin.lat,
                                longitude: pin.lng,
                                city: pin.city,
                                googleMapUrl: `https://www.google.com/maps/search/?api=1&query=${pin.lat},${pin.lng}`,
                              }));
                            }}
                            className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
                          >
                            {pin.city}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Latitude</label>
                        <input
                          type="number"
                          step="any"
                          data-testid="hotel-latitude-input"
                          value={propertyEditForm.latitude}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setPropertyEditForm({
                              ...propertyEditForm,
                              latitude: isNaN(val) ? 0 : val,
                              googleMapUrl: `https://www.google.com/maps/search/?api=1&query=${isNaN(val) ? 0 : val},${propertyEditForm.longitude}`,
                            });
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900 font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Longitude</label>
                        <input
                          type="number"
                          step="any"
                          data-testid="hotel-longitude-input"
                          value={propertyEditForm.longitude}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setPropertyEditForm({
                              ...propertyEditForm,
                              longitude: isNaN(val) ? 0 : val,
                              googleMapUrl: `https://www.google.com/maps/search/?api=1&query=${propertyEditForm.latitude},${isNaN(val) ? 0 : val}`,
                            });
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900 font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Google Maps Direct URL & Preview */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-slate-700 font-medium">Google Maps Directions URL</label>
                      {propertyEditForm.googleMapUrl && (
                        <a
                          href={propertyEditForm.googleMapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid="open-google-maps-btn"
                          className="text-xs text-blue-600 hover:text-blue-700 font-semibold underline flex items-center gap-1"
                        >
                          <span>Open in Maps</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <input
                      type="url"
                      data-testid="hotel-google-maps-input"
                      placeholder="https://www.google.com/maps/search/?api=1&query=26.9124,75.7873"
                      value={propertyEditForm.googleMapUrl}
                      onChange={(e) => setPropertyEditForm({ ...propertyEditForm, googleMapUrl: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-blue-500 font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Cover Banner Photo from Gallery */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-slate-800 font-bold text-xs uppercase tracking-wider">
                        Hotel Cover Banner Photo
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Wide photograph displayed as header backdrop on guest mobile menus and reception.
                      </p>
                    </div>
                    {propertyEditForm.coverImageUrl && (
                      <button
                        type="button"
                        onClick={() => setPropertyEditForm((prev) => ({ ...prev, coverImageUrl: '' }))}
                        className="text-xs text-red-600 hover:text-red-700 font-semibold transition"
                      >
                        Remove Banner
                      </button>
                    )}
                  </div>

                  <input
                    type="file"
                    id="hotel-cover-upload-input"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverFileUpload}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      htmlFor="hotel-cover-upload-input"
                      data-testid="choose-cover-gallery-btn"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 font-semibold text-xs cursor-pointer shadow-xs transition"
                    >
                      <Upload className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Choose Banner from Gallery</span>
                    </label>
                  </div>

                  {propertyEditForm.coverImageUrl && (
                    <div className="mt-2 h-24 w-full rounded-xl overflow-hidden border border-slate-200 shadow-xs">
                      <img src={propertyEditForm.coverImageUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <AdminLoginBrandingEditor
                  value={propertyEditForm.adminLoginBranding || {}}
                  onChange={(next) =>
                    setPropertyEditForm((prev) => ({ ...prev, adminLoginBranding: next }))
                  }
                  coverImageUrl={propertyEditForm.coverImageUrl}
                  hotelName={propertyEditForm.name || propertyProfile.name}
                  isDark={false}
                />

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsPropertyModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingProperty}
                    className="btn-glass-green px-5 py-2 text-sm"
                  >
                    {savingProperty ? 'Saving...' : 'Save & Publish Live'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Global Toast */}
        {propertyToast && (
          <div className="fixed top-6 right-6 z-[120] flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-sm dark:shadow-none font-bold text-xs animate-bounce">
            <CheckCircle2 className="w-4 h-4" />
            <span>{propertyToast}</span>
          </div>
        )}

        {/* Admin Staff Profile & Controls Modal */}
        {isProfileModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-md rounded-2xl border p-6 bg-white border-slate-200 text-slate-900 shadow-xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Hotel Administrator Profile</h3>
                    <p className="text-xs text-slate-500">Property manager credentials & session</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsProfileModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Photo Upload Section */}
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-100 flex items-center justify-center shadow-sm">
                    {adminAvatar ? (
                      <img src={adminAvatar} alt="Admin Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-slate-400" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 p-2 rounded-xl btn-glass-green shadow-md"
                    title="Upload or Take Photo"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 mx-auto"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingPhoto ? 'Compressing (400x400)...' : 'Upload / Change Photo'}</span>
                  </button>
                  <p className="text-[10px] text-slate-500 mt-1">Direct camera capture or gallery (Auto-compressed to ~40KB)</p>
                </div>
              </div>

              {/* Staff Details Card */}
              <div className="p-4 rounded-xl border bg-slate-50 border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <span className="text-slate-500">Name</span>
                  <span className="font-semibold text-slate-900">{adminUser.name}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <span className="text-slate-500">Email</span>
                  <span className="font-mono text-slate-700">{adminUser.email}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <span className="text-slate-500">Role</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    {adminUser.role}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <span className="text-slate-500">Property</span>
                  <span className="font-semibold text-slate-900 truncate max-w-[200px]">{propertyProfile.name}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500">Session Status</span>
                  <span className="flex items-center gap-1.5 text-emerald-600 font-semibold text-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Authenticated & Active
                  </span>
                </div>
              </div>

              {/* Actions: Sign Out */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  data-testid="profile-modal-logout-btn"
                  className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('Logout')} / Sign Out</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="w-full py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
