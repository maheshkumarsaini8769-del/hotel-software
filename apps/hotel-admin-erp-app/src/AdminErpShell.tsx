import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { MatrixStore } from '@spicehub/ui';
import { PmsReservationMatrixApp } from './PmsReservationMatrixApp';
import { HousekeepingTurnaroundApp } from './components/housekeeping/HousekeepingTurnaroundApp';
import { FastCashierPosApp } from './components/fast-cashier/FastCashierPosApp';
import { InventoryPoApp } from './components/inventory-po/InventoryPoApp';
import { InventoryAuditApp } from './components/inventory-audit/InventoryAuditApp';
import { MenuCatalogManagerApp } from './components/menu-catalog/MenuCatalogManagerApp';
import { StaffUserManagementApp } from './components/staff-management/StaffUserManagementApp';
import { NightAuditApp } from './components/night-audit/NightAuditApp';
import { RevenueManagerApp } from './components/revenue-manager/RevenueManagerApp';
import { TableManagementStudioApp } from './components/table-management/TableManagementStudioApp';
import { KotVoidAuditApp } from './components/kot-void/KotVoidAuditApp';
import { FrontDeskCheckInApp } from './components/front-desk/FrontDeskCheckInApp';
import { LostAndFoundVaultApp } from './components/lost-and-found/LostAndFoundVaultApp';
import { RestaurantOperationsHubApp, OperationsTab } from './components/operations-hub/RestaurantOperationsHubApp';
import { ErpMasterDirectoryModal, ErpMasterSystemItem } from './components/operations-hub/ErpMasterDirectoryModal';
import { NotificationCenterView } from './components/notifications/NotificationCenterView';
import { HotelPoliciesAndUseCasesHubApp } from './components/policies/HotelPoliciesAndUseCasesHubApp';
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
  { key: 'STAFF_MANAGEMENT', label: 'Staff & Terminals', icon: Users, badge: 'LIVE' },
  { key: 'ROOM_MANAGEMENT', label: 'Rooms & Frontdesk', icon: BedDouble },
  { key: 'TABLE_MANAGEMENT', label: 'Dining Tables', icon: Armchair },
  { key: 'ORDERS_KITCHEN', label: 'Live Orders & KDS', icon: Flame },
  { key: 'POS_CASHIER', label: 'POS & Billing', icon: Receipt },
  { key: 'MENU_CATALOG', label: 'Menu & Stock 86', icon: BookOpen },
  { key: 'INVENTORY_STOCK', label: 'Inventory & Stock', icon: Package },
  { key: 'PURCHASES_SUPPLIERS', label: 'Purchases & Suppliers', icon: ShoppingCart },
  { key: 'HOUSEKEEPING', label: 'Housekeeping', icon: Sparkles },
  { key: 'EXPENSES_ACCOUNTING', label: 'Night Audit & Close', icon: Moon, badge: 'SOP' },
  { key: 'POLICIES_AND_USECASES', label: 'Policies & 15 SOPs', icon: Shield, badge: 'v2.8' },
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
      return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20';
    case 'PREPARING':
    case 'ACCEPTED':
      return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
    case 'CANCELLED':
      return 'bg-rose-500/10 text-rose-300 border-rose-500/20';
    default:
      return 'bg-slate-800 text-slate-300 border-slate-700';
  }
};

const bookingStatusClass = (status: string): string => {
  switch (status) {
    case 'CHECKED_IN':
      return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
    case 'CONFIRMED':
      return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20';
    case 'CHECKED_OUT':
      return 'bg-slate-800 text-slate-300 border-slate-700';
    case 'CANCELLED':
    case 'NO_SHOW':
      return 'bg-rose-500/10 text-rose-300 border-rose-500/20';
    default:
      return 'bg-slate-800 text-slate-300 border-slate-700';
  }
};

export interface AdminErpShellProps {
  onNavigatePortal?: (portal: 'admin' | 'cashier' | 'reception') => void;
}

export const AdminErpShell: React.FC<AdminErpShellProps> = ({ onNavigatePortal }) => {
  const [activeModule, setActiveModule] = useState<ErpModuleKey>('DASHBOARD');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [occupancyTab, setOccupancyTab] = useState<'ROOMS' | 'TABLES'>('ROOMS');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState(DASHBOARD_DATE_RANGES[0].value);
  const [currentOperationsTab, setCurrentOperationsTab] = useState<OperationsTab>('RESTAURANT_INFO');
  const [currentMenuCatalogTab, setCurrentMenuCatalogTab] = useState<'CATEGORIES' | 'ITEMS' | 'STOCK_86' | 'RECIPES'>('CATEGORIES');
  const [isMasterDirectoryOpen, setIsMasterDirectoryOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(5);
  const [matrixError, setMatrixError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardOverview | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const handleSelectMasterSystem = (system: ErpMasterSystemItem) => {
    setActiveModule(system.targetModule as ErpModuleKey);
    if (system.targetModule === 'MENU_CATALOG' && system.targetTab) {
      setCurrentMenuCatalogTab(system.targetTab as any);
    }
    if (system.targetModule === 'SETTINGS_CONFIGURATION' && system.targetTab) {
      setCurrentOperationsTab(system.targetTab as OperationsTab);
    }
  };

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('spicehub_erp_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'dark';
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('spicehub_erp_theme', nextTheme);
    }
  };

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const isDarkTheme = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDarkTheme);
    document.body.className = isDarkTheme
      ? 'bg-slate-950 text-slate-100 antialiased font-sans'
      : 'bg-[#f6f8fb] text-slate-800 antialiased font-sans';
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    themeMeta?.setAttribute('content', isDarkTheme ? '#090b10' : '#f6f8fb');
  }, [theme]);

  const matrixStore = MatrixStore.getInstance();
  const token = getStoredToken();
  const hotelId = getStoredHotelId();

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
    const isDark = theme === 'dark';
    const primaryText = isDark ? 'text-white' : 'text-slate-900';
    const rowText = isDark ? 'text-slate-200' : 'text-slate-700';
    const mutedRowText = isDark ? 'text-slate-400' : 'text-slate-500';
    const rowHover = isDark ? 'hover:bg-slate-900/40' : 'hover:bg-slate-50';
    const tableDivide = isDark ? 'divide-slate-800/50' : 'divide-slate-200';
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
    const availableRoomCount = roomStatusCounts.get('AVAILABLE') || 0;
    const maintenanceRoomCount = roomStatusCounts.get('OUT_OF_SERVICE') || 0;
    const otherRoomCount = Math.max(
      0,
      totalRooms - occupiedRoomCount - availableRoomCount - maintenanceRoomCount
    );
    const occupancySegments = [
      { label: 'Occupied', count: occupiedRoomCount, color: '#06b6d4' },
      { label: 'Available', count: availableRoomCount, color: '#10b981' },
      { label: 'Maintenance', count: maintenanceRoomCount, color: '#f59e0b' },
      { label: 'Other', count: otherRoomCount, color: '#ec4899' },
    ];
    const donutCircumference = 2 * Math.PI * 38;
    let donutOffset = 0;
    const liveFeed = [
      ...recentOrders.slice(0, 3).map((order) => ({
        key: `order-${order.id}`,
        icon: UtensilsCrossed,
        color: 'bg-emerald-500/10 text-emerald-400',
        title: `Order ${order.orderNumber}`,
        subtitle: `${order.tableNumber ? `Table ${order.tableNumber}` : order.roomNumber ? `Room ${order.roomNumber}` : order.guestName} • ${relativeTime(order.placedAt)}`,
        trailing: formatInr(order.amount),
        trailingClass: 'tabular-nums font-semibold text-white text-xs',
      })),
      ...recentBookings.slice(0, 2).map((booking) => ({
        key: `booking-${booking.id}`,
        icon: BedDouble,
        color: 'bg-indigo-500/10 text-indigo-400',
        title: `Booking ${booking.bookingNumber}`,
        subtitle: `${booking.guestName} • ${booking.roomType} • Check-in ${new Date(booking.checkInDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`,
        trailing: formatInr(booking.grandTotal),
        trailingClass: 'tabular-nums font-semibold text-white text-xs',
      })),
      ...(dashboard?.liveOperations || []).slice(0, 1).map((request) => ({
        key: `request-${request.id}`,
        icon: ClipboardList,
        color: 'bg-amber-500/10 text-amber-400',
        title: `${String(request.type || 'SERVICE').replace(/_/g, ' ')} request`,
        subtitle: `${request.roomNumber ? `Room ${request.roomNumber}` : request.priority} • ${relativeTime(request.createdAt)}`,
        trailing: request.status,
        trailingClass:
          'text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20',
      })),
    ];
    const maxTrendRevenue = Math.max(
      1,
      ...(dashboard?.revenueTrend || []).map((point) => Number(point.revenue || 0))
    );

    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Title Banner & Date / Export Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800/60">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" />
              <h1 className={`text-xl md:text-2xl font-bold tracking-tight ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                Command Center & Overview
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              Enterprise management across front desk, dining outlets, kitchen dispatch, staffing and finances.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Date Selector */}
            <div
              className={`relative flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition ${
                isDark
                  ? 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700'
                  : 'bg-white border-slate-200 text-slate-700 shadow-sm hover:border-slate-300'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={dateRange}
                onChange={(event) => setDateRange(event.target.value)}
                aria-label="Dashboard date range"
                className="cursor-pointer appearance-none bg-transparent pr-5 text-xs font-medium outline-none"
              >
                {DASHBOARD_DATE_RANGES.map((range) => (
                  <option key={range.label} value={range.value} className="bg-slate-900 text-slate-100">
                    {range.label} · {range.value}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 h-3 w-3 text-slate-500" />
            </div>

            {/* Export Report Button */}
            <button
              onClick={handleExportReport}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition border ${
                isDark
                  ? 'bg-slate-800/90 hover:bg-slate-700 border-slate-700 text-slate-100 hover:border-slate-600'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-900 text-white shadow-sm'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Report</span>
            </button>
          </div>
        </div>

        {(dashboardError || dashboardLoading) && (
          <div
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border px-4 py-3 text-xs font-semibold ${
              dashboardError
                ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                : 'border-slate-800 bg-slate-900/50 text-slate-300'
            }`}
          >
            <span className="flex items-center gap-2">
              {dashboardError ? (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              ) : (
                <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
              )}
              {dashboardError || 'Syncing live dashboard metrics…'}
            </span>
            <button
              type="button"
              onClick={() => void loadDashboard()}
              disabled={dashboardLoading}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold transition disabled:opacity-50 ${
                isDark
                  ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              <RefreshCw className={`w-3 h-3 ${dashboardLoading ? 'animate-spin' : ''}`} />
              Refresh live data
            </button>
          </div>
        )}

        {dashboard && (
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-400">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">
              <Radio className="w-3 h-3" /> Live backend
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/60 px-2.5 py-1">
              <Clock className="w-3 h-3" /> Auto-refresh 30s
            </span>
            <span className="rounded-full border border-slate-800 bg-slate-900/60 px-2.5 py-1">
              {selectedRange.label} • {selectedRange.value}
            </span>
            <span className="text-slate-500">
              Updated {new Date(dashboard.generatedAt).toLocaleTimeString('en-IN')}
            </span>
          </div>
        )}

        {/* ================================================================== */}
        {/* ROW 1: 6 KPI STAT CARDS (CLEAN CRAFT TILES)                         */}
        {/* ================================================================== */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Card 1: Total Revenue */}
          <div
            className={`p-4 rounded-xl border transition-all duration-150 ${
              isDark
                ? 'bg-[#0e121b] border-slate-800/80 hover:border-slate-700 hover:bg-[#121622]'
                : 'bg-white border-slate-200/90 shadow-sm hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">Total Revenue</span>
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className={`text-xl font-bold tracking-tight tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {kpis ? formatInr(kpis.totalRevenue) : '—'}
              </div>
              <div
                className={`text-[10px] font-semibold mt-1 flex items-center gap-1 ${
                  (kpis?.revenueGrowthPct || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                <ArrowUpRight className={`w-3 h-3 ${(kpis?.revenueGrowthPct || 0) < 0 ? 'rotate-90' : ''}`} />
                <span>
                  {kpis ? `${kpis.revenueGrowthPct >= 0 ? '+' : ''}${kpis.revenueGrowthPct}% vs previous period` : 'Awaiting live data'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Total Orders */}
          <div
            onClick={() => setActiveModule('ORDERS_KITCHEN')}
            className={`p-4 rounded-xl border transition-all duration-150 cursor-pointer ${
              isDark
                ? 'bg-[#0e121b] border-slate-800/80 hover:border-slate-700 hover:bg-[#121622]'
                : 'bg-white border-slate-200/90 shadow-sm hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">Total Orders</span>
              <div className="w-7 h-7 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
                <ShoppingBag className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className={`text-xl font-bold tracking-tight tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {kpis ? kpis.totalOrders.toLocaleString('en-IN') : '—'}
              </div>
              <div
                className={`text-[10px] font-semibold mt-1 flex items-center gap-1 ${
                  (kpis?.orderGrowthPct || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                <ArrowUpRight className={`w-3 h-3 ${(kpis?.orderGrowthPct || 0) < 0 ? 'rotate-90' : ''}`} />
                <span>{kpis ? `${kpis.orderGrowthPct >= 0 ? '+' : ''}${kpis.orderGrowthPct}% vs previous period` : 'Awaiting live data'}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Room Bookings */}
          <div
            onClick={() => setActiveModule('ROOM_MANAGEMENT')}
            className={`p-4 rounded-xl border transition-all duration-150 cursor-pointer ${
              isDark
                ? 'bg-[#0e121b] border-slate-800/80 hover:border-slate-700 hover:bg-[#121622]'
                : 'bg-white border-slate-200/90 shadow-sm hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">Room Bookings</span>
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <BedDouble className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className={`text-xl font-bold tracking-tight tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {kpis ? kpis.occupiedRooms.toLocaleString('en-IN') : '—'}{' '}
                <span className="text-xs font-normal text-slate-500">/ {kpis ? kpis.totalRooms.toLocaleString('en-IN') : '—'}</span>
              </div>
              <div className="text-[10px] font-semibold text-indigo-400 mt-1">
                {kpis ? `${kpis.occupancyRate}% Occupancy` : 'Awaiting live data'}
              </div>
            </div>
          </div>

          {/* Card 4: Dine-in Tables */}
          <div
            onClick={() => setActiveModule('TABLE_MANAGEMENT')}
            className={`p-4 rounded-xl border transition-all duration-150 cursor-pointer ${
              isDark
                ? 'bg-[#0e121b] border-slate-800/80 hover:border-slate-700 hover:bg-[#121622]'
                : 'bg-white border-slate-200/90 shadow-sm hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">Dine-in Tables</span>
              <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                <Armchair className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className={`text-xl font-bold tracking-tight tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {kpis ? kpis.occupiedTables.toLocaleString('en-IN') : '—'}{' '}
                <span className="text-xs font-normal text-slate-500">/ {kpis ? kpis.totalTables.toLocaleString('en-IN') : '—'}</span>
              </div>
              <div className="text-[10px] font-semibold text-cyan-400 mt-1">
                {kpis ? `${kpis.tableOccupancyRate}% Active` : 'Awaiting live data'}
              </div>
            </div>
          </div>

          {/* Card 5: Total Guests */}
          <div
            onClick={() => setActiveModule('GUESTS_BOOKINGS')}
            className={`p-4 rounded-xl border transition-all duration-150 cursor-pointer ${
              isDark
                ? 'bg-[#0e121b] border-slate-800/80 hover:border-slate-700 hover:bg-[#121622]'
                : 'bg-white border-slate-200/90 shadow-sm hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">Total Guests</span>
              <div className="w-7 h-7 rounded-lg bg-pink-500/10 text-pink-400 flex items-center justify-center">
                <Users className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className={`text-xl font-bold tracking-tight tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {kpis ? kpis.totalGuests.toLocaleString('en-IN') : '—'}
              </div>
              <div className="text-[10px] font-semibold text-emerald-400 mt-1 flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-emerald-400" />
                <span>{kpis ? `${kpis.arrivalsToday} arrivals in range` : 'Awaiting live data'}</span>
              </div>
            </div>
          </div>

          {/* Card 6: Total Staff */}
          <div
            onClick={() => setActiveModule('STAFF_MANAGEMENT')}
            className={`p-4 rounded-xl border transition-all duration-150 cursor-pointer ${
              isDark
                ? 'bg-[#0e121b] border-slate-800/80 hover:border-slate-700 hover:bg-[#121622]'
                : 'bg-white border-slate-200/90 shadow-sm hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">Total Staff</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Shield className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className={`text-xl font-bold tracking-tight tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {kpis ? kpis.totalStaff.toLocaleString('en-IN') : '—'}
              </div>
              <div className="text-[10px] font-semibold text-emerald-400 mt-1 flex items-center gap-1">
                <Shield className="w-3 h-3 text-emerald-400" />
                <span>Active hotel staff</span>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================== */}
        {/* ROW 2: MIDDLE SECTION (3 COLUMNS: LIVE OPS, TABLES, OCCUPANCY)      */}
        {/* ================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* COLUMN 1: LIVE OPERATIONS FEED (4 cols) */}
          <div
            className={`lg:col-span-4 p-5 rounded-xl border flex flex-col justify-between ${
              isDark ? 'bg-[#0e121b] border-slate-800/80' : 'bg-white border-slate-200/90 shadow-sm'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-500" />
                  <h3 className={`font-semibold text-xs tracking-wide uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Live Operations
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Live
                  </span>
                </div>
                <span
                  onClick={() => setActiveModule('ORDERS_KITCHEN')}
                  className="text-[11px] text-slate-400 hover:text-amber-400 transition font-medium cursor-pointer"
                >
                  View All
                </span>
              </div>

              <div className="space-y-2.5">
                {dashboardLoading && liveFeed.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-[11px] font-semibold text-slate-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading live operations…
                  </div>
                ) : liveFeed.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/30 px-4 py-10 text-center">
                    <Radio className="mx-auto mb-2 h-5 w-5 text-slate-600" />
                    <div className="text-xs font-semibold text-slate-300">No live activity yet</div>
                    <p className="mt-1 text-[10px] text-slate-500">
                      New orders, bookings and guest requests will appear here automatically.
                    </p>
                  </div>
                ) : (
                  liveFeed.slice(0, 6).map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.key}
                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-800/70 bg-slate-900/40 p-2.5 text-xs transition hover:border-slate-700"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.color}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-slate-100">{item.title}</div>
                            <div className="truncate text-[11px] text-slate-400">{item.subtitle}</div>
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
            <div
              className={`p-4 rounded-xl border flex-1 ${
                isDark ? 'bg-[#0e121b] border-slate-800/80' : 'bg-white border-slate-200/90 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                  <UtensilsCrossed className="w-4 h-4 text-amber-500" />
                  <h3 className={`font-semibold text-xs tracking-wide uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Recent Orders (Restaurant)
                  </h3>
                </div>
                <span
                  onClick={() => setActiveModule('ORDERS_KITCHEN')}
                  className="text-[11px] text-slate-400 hover:text-amber-400 transition font-medium cursor-pointer"
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
            <div
              className={`p-4 rounded-xl border flex-1 ${
                isDark ? 'bg-[#0e121b] border-slate-800/80' : 'bg-white border-slate-200/90 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  <h3 className={`font-semibold text-xs tracking-wide uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Recent Room Bookings
                  </h3>
                </div>
                <span
                  onClick={() => setActiveModule('ROOM_MANAGEMENT')}
                  className="text-[11px] text-slate-400 hover:text-amber-400 transition font-medium cursor-pointer"
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
            <div
              className={`p-4 rounded-xl border ${
                isDark ? 'bg-[#0e121b] border-slate-800/80' : 'bg-white border-slate-200/90 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-cyan-400" />
                  <h3 className={`font-semibold text-xs tracking-wide uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Occupancy Overview
                  </h3>
                </div>
                <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                  <button
                    onClick={() => setOccupancyTab('ROOMS')}
                    className={`px-2.5 py-0.5 rounded font-semibold transition ${
                      occupancyTab === 'ROOMS' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Rooms
                  </button>
                  <button
                    onClick={() => setOccupancyTab('TABLES')}
                    className={`px-2.5 py-0.5 rounded font-semibold transition ${
                      occupancyTab === 'TABLES' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
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
                    <circle cx="50" cy="50" r="38" stroke="rgba(255,255,255,0.06)" strokeWidth="10" fill="none" />
                    {occupancySegments.map((segment) => {
                      const length = totalRooms > 0 ? (segment.count / totalRooms) * donutCircumference : 0;
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
                    <span className={`text-base font-bold tabular-nums ${primaryText}`}>
                      {kpis ? `${kpis.occupancyRate}%` : '—'}
                    </span>
                    <span className="text-[9px] uppercase font-semibold text-slate-400">Occupied</span>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex-1 space-y-1.5 text-xs">
                  {occupancySegments.map((segment) => (
                    <div key={segment.label} className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: segment.color }} />
                        {segment.label}
                      </span>
                      <strong className={`tabular-nums ${primaryText}`}>{segment.count}</strong>
                    </div>
                  ))}
                  <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Total Rooms</span>
                    <strong className={`font-semibold tabular-nums ${primaryText}`}>{totalRooms}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Box B: Revenue Overview & Today's Summary */}
            <div
              className={`p-4 rounded-xl border ${
                isDark ? 'bg-[#0e121b] border-slate-800/80' : 'bg-white border-slate-200/90 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className={`font-semibold text-xs tracking-wide uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Revenue Trend
                </h3>
                <span className="text-[10px] text-slate-400">Last 7 Days</span>
              </div>

              <div className="flex items-baseline justify-between mb-2">
                <span className={`text-lg font-bold tabular-nums ${primaryText}`}>
                  {kpis ? formatInr(kpis.totalRevenue) : '—'}
                </span>
                <span
                  className={`text-[10px] font-semibold ${
                    (kpis?.revenueGrowthPct || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {kpis
                    ? `${kpis.revenueGrowthPct >= 0 ? '+' : ''}${kpis.revenueGrowthPct}% vs previous period`
                    : 'Awaiting live data'}
                </span>
              </div>

              {/* Refined Bar Chart */}
              <div className="h-20 w-full flex items-end gap-1 px-1 pt-2">
                {(dashboard?.revenueTrend || []).map((point, i, points) => {
                  const height =
                    maxTrendRevenue > 0
                      ? Math.max(4, Math.round((Number(point.revenue || 0) / maxTrendRevenue) * 100))
                      : 4;
                  const isLatest = i === points.length - 1;
                  return (
                    <div
                      key={`${point.date}-${i}`}
                      className="flex-1 flex flex-col items-center gap-1 group relative"
                      title={`${point.label}: ${formatInr(point.revenue)} (${point.orders} payments)`}
                    >
                      <div
                        style={{ height: `${height}%` }}
                        className={`w-full rounded-t-sm transition-all ${
                          isLatest ? 'bg-amber-500' : 'bg-slate-700 hover:bg-slate-600'
                        }`}
                      />
                    </div>
                  );
                })}
                {(!dashboard?.revenueTrend || dashboard.revenueTrend.length === 0) && (
                  <div className="flex w-full items-center justify-center text-[10px] text-slate-500">
                    No payment history in the last 7 days.
                  </div>
                )}
              </div>

              {/* Today's Summary (4 Panels) */}
              <div className="mt-3 pt-3 border-t border-slate-800/60">
                <div className="text-[10px] uppercase font-semibold text-slate-400 mb-2">
                  {selectedRange.label} Breakdown
                </div>
                <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
                  <div className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800">
                    <div className="text-slate-400 text-[9px]">Dine-in</div>
                    <div className="font-semibold text-white mt-0.5 tabular-nums">
                      {kpis ? kpis.dineInOrders : '—'}
                    </div>
                    <div className="text-[9px] text-emerald-400 font-medium">orders</div>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800">
                    <div className="text-slate-400 text-[9px]">Room Service</div>
                    <div className="font-semibold text-white mt-0.5 tabular-nums">
                      {kpis ? kpis.roomServiceOrders : '—'}
                    </div>
                    <div className="text-[9px] text-indigo-400 font-medium">orders</div>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800">
                    <div className="text-slate-400 text-[9px]">Takeaway</div>
                    <div className="font-semibold text-white mt-0.5 tabular-nums">
                      {kpis ? kpis.takeawayOrders : '—'}
                    </div>
                    <div className="text-[9px] text-cyan-400 font-medium">orders</div>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800">
                    <div className="text-slate-400 text-[9px]">Arrivals</div>
                    <div className="font-semibold text-white mt-0.5 tabular-nums">
                      {kpis ? kpis.arrivalsToday : '—'}
                    </div>
                    <div className="text-[9px] text-slate-400 font-medium">guests</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================== */}
        {/* ROW 3: QUICK ACCESS (ALL MODULES)                                   */}
        {/* ================================================================== */}
        <div
          className={`p-4 rounded-xl border ${
            isDark ? 'bg-[#0e121b] border-slate-800/80' : 'bg-white border-slate-200/90 shadow-sm'
          }`}
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Operational Modules & Shortcuts</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2 text-xs">
            {[
              { key: 'STAFF_MANAGEMENT', icon: Users, label: 'Staff & Roles' },
              { key: 'POS_CASHIER', icon: Receipt, label: 'POS & Cashier' },
              { key: 'ORDERS_KITCHEN', icon: Flame, label: 'Orders & KDS' },
              { key: 'ROOM_MANAGEMENT', icon: BedDouble, label: 'Rooms & PMS' },
              { key: 'TABLE_MANAGEMENT', icon: Armchair, label: 'Dining Tables' },
              { key: 'MENU_CATALOG', icon: BookOpen, label: 'Menu & Stock 86' },
              { key: 'INVENTORY_STOCK', icon: Package, label: 'Inventory' },
              { key: 'HOUSEKEEPING', icon: Sparkles, label: 'Housekeeping' },
              { key: 'REPORTS_ANALYTICS', icon: BarChart3, label: 'Reports' },
              { key: 'SETTINGS_CONFIGURATION', icon: Settings, label: 'Settings' },
            ].map((p) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.key}
                  onClick={() => setActiveModule(p.key as ErpModuleKey)}
                  className="p-2.5 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 transition text-center flex flex-col items-center justify-center gap-1.5 group"
                >
                  <Icon className="w-4 h-4 text-slate-400 group-hover:text-amber-400 transition" />
                  <span className="text-[11px] font-medium text-slate-300 truncate w-full group-hover:text-white">
                    {p.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ================================================================== */}
        {/* 19 MASTER ERP MODULES QUICK COMMAND CENTER BANNER                  */}
        {/* ================================================================== */}
        <div
          onClick={() => setIsMasterDirectoryOpen(true)}
          className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 border border-amber-500/35 hover:border-amber-500/60 transition cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition shadow-sm">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-amber-300">
                  ERP Master Operations Suite: 19 Core Systems
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                  ALL 19 SYSTEMS CONFIGURED & LIVE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Restaurant Info • Settings • Kitchen Sections • Categories • Tables • Menu Items • 86 Stock • Payments • Vouchers • Recipes • Suppliers • Stock Issues • Purchases • Accounts • Wallets • Warehouses • Work Periods • Registration • Logs
              </p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMasterDirectoryOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shrink-0 flex items-center gap-1.5 shadow-md transition group-hover:translate-x-0.5 cursor-pointer"
          >
            <span>Browse All 19 Systems</span>
            <span>→</span>
          </button>
        </div>

        {/* ================================================================== */}
        {/* ROW 4: ESSENTIAL OPERATIONAL MODULE DIRECTORY (CLEAN 8 TILES)        */}
        {/* ================================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Staff & Terminal Passwords */}
          <div
            onClick={() => setActiveModule('STAFF_MANAGEMENT')}
            className={`p-4 rounded-xl border transition-all cursor-pointer hover:border-amber-500/40 relative overflow-hidden group ${
              isDark ? 'bg-[#0e121b] border-slate-800/80' : 'bg-white border-slate-200/90 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                <Users className="w-4 h-4 text-amber-500" />
                <span>Staff & Terminals</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                ACTIVE
              </span>
            </div>
            <ul className="text-[11px] text-slate-300 space-y-1.5">
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500/60" /> Cashier POS Setup (:3007)</li>
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500/60" /> Waiter App & Table Alloc (:3002)</li>
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500/60" /> Kitchen Chef Stations (:3003)</li>
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500/60" /> Reception Frontdesk (:3008)</li>
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500/60" /> 4-Digit Quick PIN Login</li>
            </ul>
          </div>

          {/* 2. Room Management */}
          <div
            onClick={() => setActiveModule('ROOM_MANAGEMENT')}
            className={`p-4 rounded-xl border transition-all cursor-pointer hover:border-blue-500/40 relative overflow-hidden group ${
              isDark ? 'bg-[#0e121b] border-slate-800/80' : 'bg-white border-slate-200/90 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs">
                <BedDouble className="w-4 h-4 text-blue-400" />
                <span>Room PMS & Frontdesk</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                PMS
              </span>
            </div>
            <ul className="text-[11px] text-slate-300 space-y-1.5">
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-400/60" /> Room Availability Calendar</li>
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-400/60" /> Express Check-in / Check-out</li>
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-400/60" /> Guest Folio & In-House Billing</li>
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-400/60" /> Floor / Wing Occupancy</li>
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-400/60" /> Housekeeping Clean Status</li>
            </ul>
          </div>

          {/* 3. Dining Tables & Outlets */}
          <div
            onClick={() => setActiveModule('TABLE_MANAGEMENT')}
            className={`p-4 rounded-xl border transition-all cursor-pointer hover:border-emerald-500/40 relative overflow-hidden group ${
              isDark ? 'bg-[#0e121b] border-slate-800/80' : 'bg-white border-slate-200/90 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                <Armchair className="w-4 h-4 text-emerald-400" />
                <span>Dining Tables & Layout</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                F&B
              </span>
            </div>
            <ul className="text-[11px] text-slate-300 space-y-1.5">
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" /> AC, Garden & Rooftop Zones</li>
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" /> Live Occupied / Vacant State</li>
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" /> Dynamic QR Menu Codes</li>
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" /> Waiter Table Allocation</li>
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" /> Running KOT / Active Orders</li>
            </ul>
          </div>

          {/* 4. Live Orders & Kitchen KDS */}
          <div
            onClick={() => setActiveModule('ORDERS_KITCHEN')}
            className={`p-4 rounded-xl border transition-all cursor-pointer hover:border-rose-500/40 relative overflow-hidden group ${
              isDark ? 'bg-[#0e121b] border-slate-800/80' : 'bg-white border-slate-200/90 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs">
                <Flame className="w-4 h-4 text-rose-400" />
                <span>Live Orders & Kitchen</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20">
                KDS
              </span>
            </div>
            <ul className="text-[11px] text-slate-300 space-y-1.5">
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-400/60" /> Live KOT Display Screen (:3003)</li>
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-400/60" /> Station Dispatch (Tandoor/Curry)</li>
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-400/60" /> Waiter Kitchen Intercom</li>
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-400/60" /> KOT Void & Cancellation Audit</li>
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-400/60" /> Order Preparation Timers</li>
            </ul>
          </div>

          {/* 5. POS & Fast Cashier */}
          <div
            onClick={() => setActiveModule('POS_CASHIER')}
            className={`p-4 rounded-xl border transition-all cursor-pointer hover:border-orange-500/40 relative overflow-hidden group ${
              isDark ? 'bg-[#0e121b] border-slate-800/80' : 'bg-white border-slate-200/90 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2 text-orange-400 font-semibold text-xs">
                <Receipt className="w-4 h-4 text-orange-400" />
                <span>POS & Cashier Billing</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-orange-500/10 text-orange-300 border border-orange-500/20">
                POS
              </span>
            </div>
            <ul className="text-[11px] text-slate-300 space-y-1.5">
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-orange-400/60" /> Dine-in & Takeaway Billing</li>
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-orange-400/60" /> Split Bill (Item & Equal)</li>
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-orange-400/60" /> Cash, Card, UPI & Room Folio</li>
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-orange-400/60" /> 80mm GST Thermal Invoice Print</li>
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-orange-400/60" /> Standalone POS Portal (:3007)</li>
            </ul>
          </div>

          {/* 6. Menu & 86 Item Catalog */}
          <div
            onClick={() => setActiveModule('MENU_CATALOG')}
            className={`p-4 rounded-xl border transition-all cursor-pointer hover:border-amber-500/40 relative overflow-hidden group ${
              isDark ? 'bg-[#0e121b] border-slate-800/80' : 'bg-white border-slate-200/90 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>Menu & 86 Stock Catalog</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                CATALOG
              </span>
            </div>
            <ul className="text-[11px] text-slate-300 space-y-1.5">
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400/60" /> Categories & Item Variants</li>
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400/60" /> 1-Click 86 Out of Stock Toggle</li>
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400/60" /> Dynamic Price & GST % Edit</li>
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400/60" /> Multi-Course Course Tags</li>
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400/60" /> Real-Time Sync to QR & Waiter</li>
            </ul>
          </div>

          {/* 7. Inventory & Stock */}
          <div
            onClick={() => setActiveModule('INVENTORY_STOCK')}
            className={`p-4 rounded-xl border transition-all cursor-pointer hover:border-purple-500/40 relative overflow-hidden group ${
              isDark ? 'bg-[#0e121b] border-slate-800/80' : 'bg-white border-slate-200/90 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs">
                <Package className="w-4 h-4 text-purple-400" />
                <span>Inventory & Stock</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                STOCK
              </span>
            </div>
            <ul className="text-[11px] text-slate-300 space-y-1.5">
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-purple-400/60" /> Kitchen Raw Material Stock</li>
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-purple-400/60" /> Low Stock Reorder Thresholds</li>
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-purple-400/60" /> Goods Inward & Purchase Orders</li>
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-purple-400/60" /> Wastage & Spoilage Audits</li>
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-purple-400/60" /> Store Requisitions</li>
            </ul>
          </div>

          {/* 8. Reports & Revenue */}
          <div
            onClick={() => setActiveModule('REPORTS_ANALYTICS')}
            className={`p-4 rounded-xl border transition-all cursor-pointer hover:border-cyan-500/40 relative overflow-hidden group ${
              isDark ? 'bg-[#0e121b] border-slate-800/80' : 'bg-white border-slate-200/90 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <span>Reports & Revenue</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                ANALYTICS
              </span>
            </div>
            <ul className="text-[11px] text-slate-300 space-y-1.5">
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400/60" /> Today's Sales & Collection</li>
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400/60" /> Outlet & Room Revenue Split</li>
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400/60" /> Night Audit Daily Closing</li>
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400/60" /> GST Tax Summary Sheet</li>
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400/60" /> 1-Click Excel / JSON Export</li>
            </ul>
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
          <div className="h-full relative">
            {matrixError && (
              <div className="absolute left-4 right-4 top-4 z-[60] flex items-center justify-between gap-3 rounded-xl border border-rose-500/40 bg-rose-950/95 px-4 py-3 text-xs text-rose-100 shadow-2xl">
                <span className="font-semibold">PMS sync: {matrixError}</span>
                <button
                  onClick={() => {
                    void loadMatrix(
                      matrixStore.getStartDate(),
                      matrixStore.getDays(),
                      matrixStore.getSelectedRoomTypeId()
                    ).catch(() => undefined);
                  }}
                  className="shrink-0 rounded-lg border border-rose-400/40 bg-rose-500/20 px-3 py-1.5 font-bold text-rose-50 hover:bg-rose-500/30"
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
        );

      case 'GUESTS_BOOKINGS':
        return (
          <div className="h-full">
            <FrontDeskCheckInApp authToken={token} hotelId={hotelId} />
          </div>
        );

      case 'POS_CASHIER':
        return (
          <div className="h-full">
            <FastCashierPosApp token={token} />
          </div>
        );

      case 'HOUSEKEEPING':
        return (
          <div className="h-full">
            <HousekeepingTurnaroundApp />
          </div>
        );

      case 'TABLE_MANAGEMENT':
      case 'RESTAURANTS_OUTLETS':
        return (
          <div className="h-full">
            <TableManagementStudioApp isDark={theme === 'dark'} hotelId={hotelId} />
          </div>
        );

      case 'ORDERS_KITCHEN':
        return (
          <div className="p-6 max-w-5xl mx-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className={`flex items-center gap-2 text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                <Flame className="w-5 h-5 text-amber-500" />
                <span>Kitchen KDS & Orders Live Queue</span>
              </h2>
              <a
                href={getPortalUrl('kds')}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition"
              >
                <span>Open Kitchen KDS App</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <KotVoidAuditApp hotelId={hotelId} />
          </div>
        );

      case 'MENU_CATALOG':
        return (
          <div className="h-full">
            <MenuCatalogManagerApp
              key={currentMenuCatalogTab}
              isDark={theme === 'dark'}
              hotelId={hotelId}
              initialTab={currentMenuCatalogTab}
            />
          </div>
        );

      case 'INVENTORY_STOCK':
        return (
          <div className="h-full">
            <InventoryAuditApp />
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

      case 'REPORTS_ANALYTICS':
        return (
          <div className="h-full">
            <RevenueManagerApp token={token} hotelId={hotelId} />
          </div>
        );

      case 'STAFF_MANAGEMENT':
        return (
          <div className="h-full">
            <StaffUserManagementApp isDark={theme === 'dark'} hotelId={hotelId} />
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
              isDark={theme === 'dark'}
              hotelId={hotelId}
              initialTab={currentOperationsTab}
              onNavigateModule={(mod) => setActiveModule(mod as ErpModuleKey)}
            />
          </div>
        );

      case 'NOTIFICATIONS':
        return (
          <NotificationCenterView
            isDark={theme === 'dark'}
            onNavigateModule={(mod) => setActiveModule(mod)}
            onBackToDashboard={() => setActiveModule('DASHBOARD')}
            onUnreadCountChange={(cnt) => setUnreadNotifCount(cnt)}
          />
        );

      case 'POLICIES_AND_USECASES':
        return (
          <HotelPoliciesAndUseCasesHubApp
            isDark={theme === 'dark'}
            hotelId={hotelId}
            onNavigateModule={(mod) => setActiveModule(mod)}
          />
        );

      default:
        return (
          <div className="p-8 text-center text-xs text-slate-400">
            Selected module {activeModule} is active and synchronized with SpiceHub Hotel Engine.
          </div>
        );
    }
  };

  const isDark = theme === 'dark';

  return (
    <div
      className={`h-screen overflow-hidden flex font-sans select-none transition-colors duration-200 ${
        isDark ? 'bg-[#090b10] text-slate-100' : 'bg-[#f6f8fb] text-slate-800'
      }`}
    >
      {/* ======================================================== */}
      {/* 1. LEFT SIDEBAR                                          */}
      {/* ======================================================== */}
      <aside
        className={`${
          sidebarCollapsed ? 'w-20' : 'w-64'
        } shrink-0 h-full flex flex-col z-30 transition-all duration-200 border-r ${
          isDark
            ? 'bg-[#0c0e15] border-slate-800/80 text-slate-300'
            : 'bg-white border-slate-200 text-slate-700 shadow-sm'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/60">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            {!sidebarCollapsed && (
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <span className={`font-bold text-base tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>SpiceHub</span>
                </div>
                <div className="text-[10px] text-amber-400 font-semibold tracking-wide uppercase">Hotel Admin</div>
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
          {SIDEBAR_ITEMS.map((item) => {
            const isActive = activeModule === item.key;
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => setActiveModule(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs transition-all text-left ${
                  isActive
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent font-medium'
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 transition ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                {!sidebarCollapsed && (
                  <div className="flex-1 flex items-center justify-between truncate">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
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
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition cursor-pointer">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center text-xs font-semibold shrink-0 border border-slate-700">
                <User className="w-4 h-4" />
              </div>
              {!sidebarCollapsed && (
                <div className="truncate">
                  <div className="text-xs font-semibold text-white truncate">Administrator</div>
                  <div className="text-[10px] text-slate-400 truncate">Hotel Manager</div>
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
      <div className="flex-1 flex flex-col h-full min-w-0 min-h-0 overflow-hidden">
        {/* Top Navbar */}
        <header
          className={`h-16 shrink-0 px-6 border-b flex items-center justify-between gap-4 sticky top-0 z-20 backdrop-blur-md transition-colors ${
            isDark ? 'bg-[#0c0e15]/95 border-slate-800/80' : 'bg-white/95 border-slate-200 shadow-sm'
          }`}
        >
          {/* Search Bar */}
          <div className="flex-1 max-w-xl">
            <div
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs transition-all ${
                isDark
                  ? 'bg-slate-900/70 border-slate-800 text-slate-200 focus-within:border-amber-500/60'
                  : 'bg-slate-50 border-slate-200 text-slate-800 focus-within:border-amber-500/60'
              }`}
            >
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search orders, guests, rooms, staff, invoices..."
                className="bg-transparent border-none outline-none w-full text-xs placeholder:text-slate-500 font-normal"
              />
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700/60 shrink-0">
                ⌘K
              </span>
            </div>
          </div>

          {/* Top Right Controls */}
          <div className="flex items-center gap-2">
            {/* Dedicated 19 Systems Master Navigator Hub Button */}
            <button
              onClick={() => setIsMasterDirectoryOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/40 hover:from-amber-500/30 hover:to-orange-500/30 transition shadow-sm"
              title="Explore all 19 ERP Master Modules"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>⚡ 19 Systems Hub</span>
            </button>

            {/* Dedicated Cashier & Reception Launch Buttons */}
            <button
              onClick={() => {
                if (onNavigatePortal) onNavigatePortal('cashier');
                else window.location.href = '/cashier';
              }}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/20 transition"
              title="Open Standalone Cashier POS (:3005/cashier)"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cashier POS</span>
              <ArrowUpRight className="w-3 h-3 text-emerald-400" />
            </button>

            <button
              onClick={() => {
                if (onNavigatePortal) onNavigatePortal('reception');
                else window.location.href = '/reception';
              }}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/25 hover:bg-amber-500/20 transition"
              title="Open Standalone Reception Portal (:3005/reception)"
            >
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Reception</span>
              <ArrowUpRight className="w-3 h-3 text-amber-400" />
            </button>

            {/* Notifications Bell */}
            <button
              onClick={() => setActiveModule('NOTIFICATIONS')}
              className={`relative p-2 rounded-lg border transition ${
                isDark
                  ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              title={`${unreadNotifCount} Active Notifications`}
            >
              <Bell className="w-4 h-4" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-black text-[9px] font-bold flex items-center justify-center">
                  {unreadNotifCount}
                </span>
              )}
            </button>

            {/* Bright / Dark Theme Switcher */}
            <button
              data-testid="theme-toggle-btn"
              onClick={toggleTheme}
              className={`p-2 rounded-lg border transition ${
                isDark
                  ? 'bg-slate-900/80 border-slate-800 text-amber-400 hover:bg-slate-800 hover:border-slate-700'
                  : 'bg-white border-slate-200 text-amber-600 hover:bg-slate-50'
              }`}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Language Selector */}
            <div
              className={`hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium ${
                isDark ? 'bg-slate-900/80 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              <span>EN</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </div>

            {/* Avatar Pill */}
            <div className="flex items-center gap-2 pl-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xs font-bold">
                <User className="w-4 h-4" />
              </div>
              <div className="hidden lg:block text-left">
                <div className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Admin</div>
                <div className="text-[10px] text-slate-400">Hotel Manager</div>
              </div>
            </div>
          </div>
        </header>

        {/* Workspace Body */}
        <main className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {renderActiveModuleScreen()}
        </main>

        {/* ErpMasterDirectoryModal */}
        <ErpMasterDirectoryModal
          isOpen={isMasterDirectoryOpen}
          onClose={() => setIsMasterDirectoryOpen(false)}
          onSelectSystem={handleSelectMasterSystem}
          isDark={isDark}
        />
      </div>
    </div>
  );
};
