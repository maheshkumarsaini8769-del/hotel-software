import { API_BASE_URL } from './config/api';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  LayoutDashboard,
  Grid,
  Flame,
  Clock,
  RotateCcw,
  Users,
  BookOpen,
  Receipt,
  Scissors,
  CreditCard,
  Coffee,
  ChefHat,
  Bell,
  User,
  Settings,
  HelpCircle,
  Search,
  Plus,
  ArrowRightLeft,
  ArrowLeft,
  Printer,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  CheckCircle2,
  Check,
  X,
  Smartphone,
  Banknote,
  DollarSign,
  AlertTriangle,
  Menu,
  Wifi,
  LogOut,
  Sparkles,
  Sun,
  ShieldCheck,
  Building2,
  Zap
} from 'lucide-react';
import {
  WaiterStore,
  WaiterServiceRequestModel,
  DraftOrderItem,
  WaiterCashFloatDto,
  DynamicUpiQrDto,
  FoodPickupTicketDTO,
  useTranslation,
  IMAGE_PLACEHOLDER, NumericInput,
} from '@spicehub/ui';
import { ShiftStatus, MenuItemDTO } from '@spicehub/shared-types';
import { QuickKotPunchSheet } from './components/QuickKotPunchSheet';
import { DynamicUpiQrModal } from './components/dynamic-upi/DynamicUpiQrModal';
import { WaiterCashFloatCard } from './components/cash-float/WaiterCashFloatCard';
import { WaiterStaffProfile } from './components/WaiterLoginScreen';
import { CrossTableAssistModal } from './components/CrossTableAssistModal';
import { TeaBreakModal } from './components/TeaBreakModal';
import { EndShiftHandoverModal } from './components/EndShiftHandoverModal';
import { VerifyPaxModal } from './components/VerifyPaxModal';
import { DelegateTaskModal, DelegatableTask } from './components/DelegateTaskModal';
import {
  NotificationCenterModal,
  AppNotificationItem,
} from './components/notifications/NotificationCenterModal';

import { MyTablesView } from './views/MyTablesView';
import { OtherTablesView } from './views/OtherTablesView';
import { LiveOrdersAndKotView } from './views/LiveOrdersAndKotView';
import { NewOrdersView } from './views/NewOrdersView';
import { ActiveOrdersView } from './views/ActiveOrdersView';
import { OrderHistoryView } from './views/OrderHistoryView';
import { TableTransferView } from './views/TableTransferView';
import { GuestRequestsView } from './views/GuestRequestsView';
import { MenuItemsView } from './views/MenuItemsView';
import { KotAndStatusView } from './views/KotAndStatusView';
import { SplitBillView } from './views/SplitBillView';
import { TableBillingView } from './views/TableBillingView';
import { RoomServiceView } from './views/RoomServiceView';
import type { RoomServiceOrder } from './views/RoomServiceView';
import { CallKitchenView } from './views/CallKitchenView';
import { NotificationsView } from './views/NotificationsView';
import { waiterFetch } from './lib/waiterApi';
import { MyProfileView } from './views/MyProfileView';
import { SettingsView } from './views/SettingsView';
import { HelpAndSupportView } from './views/HelpAndSupportView';
import {
  loadTableBill,
  calculateBill,
  fetchTableOrdersFromApi,
} from './utils/tableBillingService';
import { useTableBills } from './utils/useTableBills';
import {
  isOrderServed,
  markOrderServedInStorage,
  getTablesServedMap,
  getServedCountStorage,
  incrementServedCountStorage,
} from './utils/servedOrdersStorage';

export interface TableStatusItem {
  id: number;
  name: string;
  guests?: number;
  status: 'Available' | 'Occupied' | 'My Table' | 'Cleaning' | 'Reserved';
  isAssignedToMe?: boolean;
  assignedWaiterName?: string;
  assignedWaiterId?: string;
  section?: string;
  servedStatus?: 'NOT_SERVED' | 'READY' | 'SERVED';
  customerClaimedGuests?: number;
  actualGuests?: number;
  paxVerified?: boolean;
  paxDiscrepancyReason?: string;
}

export interface WaiterRecentOrder {
  id: string;
  orderNumber: string;
  location: string;
  total: number;
  orderStatus: string;
  updatedAt: string;
}

export interface WaiterMobileAppProps {
  store: WaiterStore;
  recentOrders?: WaiterRecentOrder[];
  menuItems?: MenuItemDTO[];
  waiterFloat?: WaiterCashFloatDto;
  onOpenFloat?: (amount: number) => Promise<void>;
  pickupTickets?: FoodPickupTicketDTO[];
  roomServiceOrders?: RoomServiceOrder[];
  roomServiceLoadState?: 'loading' | 'ready' | 'error';
  onRefreshRoomServiceOrders?: () => void;
  onRoomServiceOrderStatusChange?: (
    orderId: string,
    nextStatus: RoomServiceOrder['status']
  ) => Promise<boolean>;
  activeUpiQr?: DynamicUpiQrDto | null;
  tables?: TableStatusItem[];
  readyOrderAlert?: { orderNumber: string; tableNumber: string } | null;
  waiterSession?: WaiterStaffProfile | null;
  notifications?: AppNotificationItem[];
  onLogout?: () => void;
  onOpenPortalsSwitcher?: () => void;
  onRefreshTables?: () => void;
  onAcceptRequest?: (requestId: string) => Promise<void> | void;
  onCompleteRequest?: (requestId: string) => Promise<void> | void;
  onShiftChange?: (newStatus: ShiftStatus) => Promise<void> | void;
  onFireKot?: (tableId: string, items: DraftOrderItem[], instructions?: string) => Promise<void> | void;
  onRequestCashDrop?: (actualCash: number, reason?: string) => Promise<void>;
  onSnoozePickup?: (ticketId: string) => Promise<void> | void;
  onConfirmPickup?: (ticketId: string) => Promise<void> | void;
  onServeOrder?: (orderId: string, orderNumber: string, table: string) => Promise<void> | void;
  onGenerateUpiQr?: (tableNumber: string, amount: number) => Promise<void>;
  onCancelUpiQr?: (transactionRef: string) => Promise<void>;
  onCheckUpiStatus?: (transactionRef: string) => Promise<void>;
  onMarkNotificationRead?: (id: string) => void;
  onMarkAllNotificationsRead?: () => void;
  onClearAllNotifications?: () => void;
  onDismissNotification?: (id: string) => void;
  onSendTestAlert?: () => void;
  kitchenBuzzers?: any[];
  onSendKitchenBuzzer?: (buzzData: {
    station: string;
    table: string;
    message: string;
    priority?: string;
  }) => Promise<void> | void;
  onToggleItem86?: (itemId: string, isAvailable: boolean, reason?: string) => Promise<void> | void;
  onUpdateAvatar?: (newAvatarUrl: string) => void;
  onDelegateTask?: (data: {
    task: DelegatableTask;
    targetWaiter: WaiterStaffProfile;
    reason: string;
    fromWaiter: WaiterStaffProfile;
  }) => Promise<void> | void;
}

export interface KitchenPickupItem {
  id: string;
  orderNumber: string;
  destination: string;
  timeAgo: string;
  items: string[];
  station: string;
}

export interface KitchenCookingItem {
  id: string;
  orderNumber: string;
  destination: string;
  timeAgo: string;
  progress: number;
  items: string[];
  station: string;
}

// Tables are loaded from the live table-management API. No demo table rows are
// fabricated when the API has not answered yet.
const INITIAL_TABLES: TableStatusItem[] = [];

export const WaiterMobileApp: React.FC<WaiterMobileAppProps> = ({
  store,
  recentOrders = [],
  menuItems = [],
  waiterFloat,
  onOpenFloat,
  pickupTickets = [],
  roomServiceOrders = [],
  roomServiceLoadState = 'loading',
  onRefreshRoomServiceOrders,
  onRoomServiceOrderStatusChange,
  activeUpiQr,
  tables,
  readyOrderAlert,
  waiterSession,
  notifications: propNotifications,
  onLogout,
  onOpenPortalsSwitcher,
  onRefreshTables,
  onAcceptRequest,
  onCompleteRequest,
  onShiftChange,
  onFireKot,
  onRequestCashDrop,
  onSnoozePickup,
  onConfirmPickup,
  onServeOrder,
  onGenerateUpiQr,
  onCancelUpiQr,
  onCheckUpiStatus,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onClearAllNotifications,
  onDismissNotification,
  onSendTestAlert,
  kitchenBuzzers = [],
  onSendKitchenBuzzer,
  onToggleItem86,
  onDelegateTask,
  onUpdateAvatar,
}) => {
  const currentStaff: WaiterStaffProfile = waiterSession || {
    staffId: '',
    name: 'Staff member',
    role: 'Senior Waiter',
    pin: '',
    avatar: IMAGE_PLACEHOLDER,
    assignedSection: '',
    assignedTableStart: 0,
    assignedTableEnd: 0,
    assignedTableCount: 0,
    shift: '',
    permissions: [],
  };

  const [activeSidebarItem, setActiveSidebarItem] = useState(() => {
    if (typeof window !== 'undefined') {
      const raw = new URLSearchParams(window.location.search).get('tab');
      if (raw) return decodeURIComponent(raw.replace(/\+/g, ' '));
    }
    return 'Dashboard';
  });

  useEffect(() => {
    const handleSetTab = (e: any) => {
      if (e.detail && typeof e.detail === 'string') {
        setActiveSidebarItem(e.detail);
      }
    };
    window.addEventListener('waiter:set_tab', handleSetTab);
    return () => window.removeEventListener('waiter:set_tab', handleSetTab);
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [selectedLayoutArea, setSelectedLayoutArea] = useState('All Tables');
  const [activeOrdersFilter, setActiveOrdersFilter] = useState('All');
  const [dashboardTableFilter, setDashboardTableFilter] = useState<'All' | 'Available' | 'Occupied' | 'Cleaning'>('All');
  const [avatarError, setAvatarError] = useState(false);

  const waiterInitials = useMemo(() => {
    const n = (currentStaff.name || '').trim();
    if (!n) return 'W';
    const parts = n.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [currentStaff.name]);

  // Modals state
  const [isPunchKotOpen, setIsPunchKotOpen] = useState(false);
  const [isUpiModalOpen, setIsUpiModalOpen] = useState(false);
  const [isCashFloatModalOpen, setIsCashFloatModalOpen] = useState(false);
  const [floatAmountInput, setFloatAmountInput] = useState('');
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [selectedTableForOrder, setSelectedTableForOrder] = useState(() => `Table ${currentStaff.assignedTableStart}`);
  const [selectedTableForBilling, setSelectedTableForBilling] = useState<string | undefined>(undefined);
  const [isCrossTableAssistOpen, setIsCrossTableAssistOpen] = useState(false);
  const [crossTableCourtesyNote, setCrossTableCourtesyNote] = useState<string | undefined>(undefined);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    if (isProfileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileDropdownOpen]);

  // Mobile Back Navigation & History protection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      if (isProfileDropdownOpen) {
        setIsProfileDropdownOpen(false);
        return;
      }
      if (isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
        return;
      }
      if (isMobileSearchOpen) {
        setIsMobileSearchOpen(false);
        return;
      }
      if (isCrossTableAssistOpen) {
        setIsCrossTableAssistOpen(false);
        return;
      }
      if (activeSidebarItem !== 'Dashboard') {
        setActiveSidebarItem('Dashboard');
        return;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isProfileDropdownOpen, isMobileMenuOpen, isMobileSearchOpen, isCrossTableAssistOpen, activeSidebarItem]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.history.pushState({ tab: activeSidebarItem }, '');
    } catch {}
  }, [activeSidebarItem]);

  // Network State & Offline KOT Queue (localStorage with auto-sync)
  const [isNetworkOnline, setIsNetworkOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [offlineKotQueue, setOfflineKotQueue] = useState<any[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('spicehub_waiter_offline_orders');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Universal Hindi / English i18n State
  const { locale, setLocale, toggleLocale, t: translate } = useTranslation();
  const language: 'en' | 'hi' = locale === 'hi' ? 'hi' : 'en';
  const toggleLanguage = toggleLocale;

  const t = useCallback(
    (key: string, defaultText?: string): string => {
      return translate(key, defaultText);
    },
    [translate]
  );

  // Sync queued offline orders when online
  const syncOfflineOrders = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.onLine) return;
    const raw = localStorage.getItem('spicehub_waiter_offline_orders');
    if (!raw) return;
    let queue: any[] = [];
    try {
      queue = JSON.parse(raw);
    } catch {
      return;
    }
    if (!queue || queue.length === 0) return;

    let synced = 0;
    const remaining: any[] = [];

    for (const ord of queue) {
      try {
        if (onFireKot) {
          await onFireKot(ord.tableToUse, ord.items, ord.instructions);
          synced++;
        }
      } catch (err) {
        console.warn('Failed to sync offline KOT:', ord, err);
        remaining.push(ord);
      }
    }

    setOfflineKotQueue(remaining);
    localStorage.setItem('spicehub_waiter_offline_orders', JSON.stringify(remaining));

    if (synced > 0) {
      triggerToast(
        language === 'hi'
          ? `✅ ${synced} ऑफलाइन KOT सफलतापूर्वक सिंक हो गए!`
          : `✅ Synced ${synced} offline KOT orders to Kitchen KDS!`
      );
    }
  }, [onFireKot, language]);

  useEffect(() => {
    const handleOnline = () => {
      setIsNetworkOnline(true);
      triggerToast(language === 'hi' ? '🌐 नेटवर्क वापस आ गया - ऑनलाइन' : '🌐 Network restored - Online');
      syncOfflineOrders();
    };
    const handleOffline = () => {
      setIsNetworkOnline(false);
      triggerToast(
        language === 'hi'
          ? '⚠️ ऑफलाइन मोड सक्रिय - ऑर्डर स्थानीय रूप से सुरक्षित होंगे'
          : '⚠️ Offline mode active - orders will be queued locally'
      );
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial sync check on mount if online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      syncOfflineOrders();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [language, syncOfflineOrders]);

  // Dynamic Real Table Bill & UPI QR State (Zero Hardcoded Amounts)
  const [activeDynamicUpiQr, setActiveDynamicUpiQr] = useState<DynamicUpiQrDto | null>(null);
  const [selectedTableBillAmount, setSelectedTableBillAmount] = useState<number>(0);

  const handleOpenDynamicUpiModal = async (table: string, amount?: number) => {
    // The UPI request amount always comes from the live running bill.
    const calc = await loadTableBill(table);
    if (!calc.items.length && !(amount && amount > 0)) {
      triggerToast(`No running order on ${table}. Start the order before collecting payment.`);
      return;
    }
    const finalAmount = amount && amount > 0 ? Math.round(amount) : calc.grandTotal;
    if (finalAmount <= 0) {
      triggerToast(`Running bill on ${table} is ₹0. Nothing to collect yet.`);
      return;
    }
    setSelectedTableForOrder(table);
    setSelectedTableBillAmount(finalAmount);

    const cleanNum = table.replace(/[^0-9]/g, '') || '1';
    const dynamicBillId = `BILL-${cleanNum}-${Date.now().toString().slice(-4)}`;
    const dynamicTxRef = `TXN-UPI-${Date.now().toString().slice(-6)}`;

    const dynamicQr: DynamicUpiQrDto = {
      billId: dynamicBillId,
      transactionRef: dynamicTxRef,
      tableNumber: table,
      amount: finalAmount,
      currency: 'INR',
      merchantVpa: 'spicehub@icici',
      merchantName: 'SpiceHub Hotel & Dining',
      upiUri: `upi://pay?pa=spicehub@icici&pn=SpiceHub%20Hotel&am=${finalAmount}&cu=INR&tr=${dynamicTxRef}`,
      status: 'PENDING' as any,
      soundboxNotified: false,
      expiresAt: new Date(Date.now() + 300000).toISOString(),
    };

    setActiveDynamicUpiQr(dynamicQr);
    setIsUpiModalOpen(true);

    if (onGenerateUpiQr) {
      onGenerateUpiQr(table, finalAmount);
    }
  };

  // Tea Break & End Shift State
  const [isTeaBreakModalOpen, setIsTeaBreakModalOpen] = useState(false);
  const [isOnTeaBreak, setIsOnTeaBreak] = useState(false);
  const [breakTimerSeconds, setBreakTimerSeconds] = useState(15 * 60);
  const [breakTotalMinutes, setBreakTotalMinutes] = useState(15);
  const [breakNotes, setBreakNotes] = useState('');
  const [isEndShiftModalOpen, setIsEndShiftModalOpen] = useState(false);
  const [currentShiftStatus, setCurrentShiftStatus] = useState<ShiftStatus>(ShiftStatus.ON_DUTY);

  // Verify Pax Modal State
  const [isVerifyPaxModalOpen, setIsVerifyPaxModalOpen] = useState(false);
  const [paxSelectedTable, setPaxSelectedTable] = useState<TableStatusItem | null>(null);

  // Delegate Task Modal State (When waiter is busy)
  const [isDelegateModalOpen, setIsDelegateModalOpen] = useState(false);
  const [taskToDelegate, setTaskToDelegate] = useState<DelegatableTask | null>(null);

  // Mute audio chime state (persisted)
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('spicehub_waiter_muted') === 'true';
    }
    return false;
  });

  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('spicehub_waiter_muted', String(next));
      }
      return next;
    });
  };

  // No fabricated notifications: the notification centre is fed by the live
  // service-request and order-ready socket streams only.
  const getInitialNotificationsForStaff = (_start: number): AppNotificationItem[] => [];

  // Local notifications fallback if not provided by root
  const [localNotifications, setLocalNotifications] = useState<AppNotificationItem[]>(() =>
    getInitialNotificationsForStaff(currentStaff.assignedTableStart)
  );

  useEffect(() => {
    setSelectedTableForOrder(`Table ${currentStaff.assignedTableStart}`);
    setLocalNotifications(getInitialNotificationsForStaff(currentStaff.assignedTableStart));
  }, [currentStaff.assignedTableStart]);

  const activeNotifications = propNotifications ?? localNotifications;
  const unreadCount = activeNotifications.filter((n) => !n.isRead).length;

  const handleMarkRead = (id: string) => {
    if (onMarkNotificationRead) {
      onMarkNotificationRead(id);
    } else {
      setLocalNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    }
  };

  const handleMarkAllRead = () => {
    if (onMarkAllNotificationsRead) {
      onMarkAllNotificationsRead();
    } else {
      setLocalNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
    triggerToast('All notifications marked as read.');
  };

  const handleClearAll = () => {
    if (onClearAllNotifications) {
      onClearAllNotifications();
    } else {
      setLocalNotifications([]);
    }
    triggerToast('All notifications cleared.');
  };

  const handleDismiss = (id: string) => {
    if (onDismissNotification) {
      onDismissNotification(id);
    } else {
      setLocalNotifications((prev) => prev.filter((n) => n.id !== id));
    }
  };

  const handleNotificationAction = async (notif: AppNotificationItem) => {
    handleMarkRead(notif.id);
    if (notif.type === 'order_ready' && notif.orderNumber) {
      const pickup = kitchenPickups.find((p) => p.orderNumber === notif.orderNumber);
      if (pickup) {
        await handleServePickup(pickup.id, pickup.orderNumber, pickup.destination);
      } else {
        triggerToast(`Order ${notif.orderNumber} picked up & served to ${notif.tableNumber || 'table'}!`);
      }
      setIsNotificationCenterOpen(false);
    } else if (notif.type === 'guest_request') {
      const req = guestRequests.find((r) => r.table === notif.tableNumber);
      if (req) {
        await handleCompleteRequest(req.id, req.table, req.request);
      } else {
        triggerToast(`Service request attended for ${notif.tableNumber || 'table'}!`);
      }
      setIsNotificationCenterOpen(false);
    }
  };

  // Tables live state
  const [tablesList, setTablesList] = useState<TableStatusItem[]>(() => {
    const base = tables && tables.length > 0 ? tables : INITIAL_TABLES;
    const servedMap = getTablesServedMap();
    return base.map((t) => ({
      ...t,
      servedStatus: servedMap[String(t.id)] === 'SERVED' ? 'SERVED' : t.servedStatus,
    }));
  });

  // Live running bills for every table on the floor.
  const tableBills = useTableBills(
    tablesList.map((table) => `Table ${table.name}`)
  );

  // STRICT HOTEL ADMIN ASSIGNED TABLES: Waiter gets assigned range, or all floor tables if unzoned/captain!
  const myAssignedTables = useMemo(() => {
    const hasZone =
      Number.isFinite(currentStaff.assignedTableStart) &&
      Number.isFinite(currentStaff.assignedTableEnd) &&
      currentStaff.assignedTableEnd >= currentStaff.assignedTableStart &&
      currentStaff.assignedTableEnd > 0;
    if (!hasZone) return tablesList;
    const filtered = tablesList.filter(
      (t) => t.id >= currentStaff.assignedTableStart && t.id <= currentStaff.assignedTableEnd
    );
    return filtered.length > 0 ? filtered : tablesList;
  }, [tablesList, currentStaff.assignedTableStart, currentStaff.assignedTableEnd]);

  useEffect(() => {
    if (tables && tables.length > 0) {
      const servedMap = getTablesServedMap();
      setTablesList((prev) => {
        const prevServed = new Map(prev.map((p) => [p.id, p.servedStatus]));
        const prevActual = new Map(prev.map((p) => [p.id, p.actualGuests]));
        const prevClaimed = new Map(prev.map((p) => [p.id, p.customerClaimedGuests]));
        const prevVerified = new Map(prev.map((p) => [p.id, p.paxVerified]));
        return tables.map((t) => ({
          ...t,
          servedStatus: (servedMap[String(t.id)] === 'SERVED' || prevServed.get(t.id) === 'SERVED')
            ? 'SERVED'
            : (prevServed.get(t.id) || t.servedStatus || (t.status === 'Occupied' || t.status === 'My Table' ? 'NOT_SERVED' : undefined)),
          actualGuests: prevActual.get(t.id) ?? t.actualGuests,
          customerClaimedGuests: prevClaimed.get(t.id) ?? t.customerClaimedGuests,
          paxVerified: prevVerified.get(t.id) ?? t.paxVerified,
        }));
      });
    }
  }, [tables]);

  // SLA Alert state (60-sec Food Pickup Alert)
  const [slaCountdown, setSlaCountdown] = useState<number>(60);
  const [slaOrderTarget, setSlaOrderTarget] = useState<string>('No active pickup SLA');

  // 1-second interval timer for 60-second pickup SLA (paused during tea break)
  useEffect(() => {
    if (isOnTeaBreak) return;
    const timer = setInterval(() => {
      setSlaCountdown((prev) => (prev > 0 ? prev - 1 : 60));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOnTeaBreak]);

  // Audio chime player
  const playAudioChime = () => {
    if (isMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
      setTimeout(() => ctx.close().catch(() => {}), 500);
    } catch (_) {}
  };

  // Tea Break countdown timer
  useEffect(() => {
    let interval: any = null;
    if (isOnTeaBreak) {
      interval = setInterval(() => {
        setBreakTimerSeconds((prev) => {
          if (prev <= 1) {
            setIsOnTeaBreak(false);
            setCurrentShiftStatus(ShiftStatus.ON_DUTY);
            if (onShiftChange) onShiftChange(ShiftStatus.ON_DUTY);
            playAudioChime();
            triggerToast('☕ Tea break completed! Resumed floor duty.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOnTeaBreak, onShiftChange, isMuted]);

  // Update SLA when new food is ready from Kitchen
  useEffect(() => {
    if (readyOrderAlert) {
      setSlaCountdown(60);
      setSlaOrderTarget(`Order ${readyOrderAlert.orderNumber} on ${readyOrderAlert.tableNumber}`);
      setKitchenPickups((prev) => [
        {
          id: `kp-${Date.now()}`,
          orderNumber: readyOrderAlert.orderNumber,
          destination: readyOrderAlert.tableNumber,
          timeAgo: 'Just now',
          items: ['Dishes ready from kitchen hot pass'],
          station: 'Kitchen Hot Pass',
        },
        ...prev.filter((o) => o.orderNumber !== readyOrderAlert.orderNumber),
      ]);
      setKitchenCooking((prev) =>
        prev.filter((o) => o.orderNumber !== readyOrderAlert.orderNumber && o.destination !== readyOrderAlert.tableNumber)
      );
    }
  }, [readyOrderAlert]);

  // Check if a table or room is assigned to this waiter
  const isTableAssignedToMe = useCallback(
    (targetTable: string | number | undefined): boolean => {
      if (!targetTable) return false;
      const str = String(targetTable).trim();
      if (/room/i.test(str)) {
        // Room Service delivery requests are visible to on-duty stewards/waiters
        return true;
      }
      // If no specific table range restriction is configured, waiter has full floor access
      if (currentStaff.assignedTableStart === 0 && currentStaff.assignedTableEnd === 0) {
        return true;
      }
      const numOnly = parseInt(str.replace(/[^0-9]/g, ''), 10);
      if (isNaN(numOnly)) return true;
      return numOnly >= currentStaff.assignedTableStart && numOnly <= currentStaff.assignedTableEnd;
    },
    [currentStaff.assignedTableStart, currentStaff.assignedTableEnd]
  );

  // Kitchen Ready Food Pickups (Filtered to this Waiter's assigned tables)
  const [kitchenPickups, setKitchenPickups] = useState<KitchenPickupItem[]>([]);

  // Kitchen Cooking Status (Filtered to this Waiter's assigned tables)
  const [kitchenCooking, setKitchenCooking] = useState<KitchenCookingItem[]>([]);

  // Orders already served to the floor (live feed, never fabricated).
  const [servedTickets, setServedTickets] = useState<
    Array<{ id: string; orderNumber: string; destination: string; timeAgo: string; items: string[]; station: string }>
  >([]);

  // Guest Requests State — the backend/WaiterStore is the single source of
  // truth. Never seed fake assistance calls: a fresh terminal must honestly
  // show "no active calls" until a real guest request arrives.
  const [guestRequests, setGuestRequests] = useState<
    Array<{ id: string; table: string; timeAgo: string; request: string }>
  >([]);

  // Hot-pass pickup tickets arrive live from the kitchen socket stream.
  useEffect(() => {
    setKitchenPickups(
      (pickupTickets || []).map((ticket: any) => ({
        id: String(ticket.id || ticket._id),
        orderNumber: String(ticket.orderNumber || ''),
        destination: String(ticket.tableNumber || ''),
        timeAgo: ticket.readyAt
          ? new Date(ticket.readyAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
          : 'Just now',
        items: String(ticket.itemsSummary || '')
          .split(',')
          .map((item: string) => item.trim())
          .filter(Boolean),
        station: String(ticket.floorLevel || 'Kitchen Hot Pass'),
      }))
    );
    const livePickup = (pickupTickets || [])[0];
    if (livePickup) {
      setSlaOrderTarget(
        `Order ${livePickup.orderNumber || ''} on ${livePickup.tableNumber || ''}`.trim()
      );
    }
  }, [pickupTickets]);

  // Live kitchen cooking status for the tables this waiter owns.
  useEffect(() => {
    let cancelled = false;
    const loadCooking = async () => {
      try {
        const hotelId = localStorage.getItem('spicehub_hotel_id') || '';
        const hotelQuery = hotelId ? `&hotelId=${encodeURIComponent(hotelId)}` : '';

        const servedResponse = await waiterFetch(`${API_BASE_URL}/pos/kds/orders?status=SERVED${hotelQuery}`);
        if (servedResponse.ok) {
          const servedBody = await servedResponse.json();
          if (servedBody?.success && Array.isArray(servedBody.data)) {
            const servedRows = servedBody.data
              .map((order: any) => {
                const table = order.tableId?.tableNumber || order.tableNumber || '';
                const servedAt = order.servedAt || order.updatedAt;
                return {
                  id: String(order._id),
                  orderNumber: String(order.orderNumber || ''),
                  destination: table
                    ? `Table ${table}`
                    : order.roomId?.roomNumber
                      ? `Room ${order.roomId.roomNumber}`
                      : 'POS Counter',
                  timeAgo: servedAt
                    ? `${Math.max(0, Math.round((Date.now() - new Date(servedAt).getTime()) / 60000))} min ago`
                    : 'Served',
                  items: (order.items || []).map(
                    (item: any) => `${item.quantity || 1} x ${item.name || 'Dish'}`
                  ),
                  station: 'Dining Floor',
                };
              })
              .filter((row: any) => isTableAssignedToMe(row.destination));
            if (!cancelled) setServedTickets(servedRows.slice(0, 12));
          }
        }

        const response = await waiterFetch(`${API_BASE_URL}/pos/kds/orders?status=ALL${hotelQuery}`);
        if (!response.ok) return;
        const body = await response.json();
        if (!body.success || !Array.isArray(body.data)) return;

        // Populate ready pickups if no socket pickupTickets yet
        const readyRows = body.data
          .filter((order: any) => String(order.orderStatus || '').toUpperCase() === 'READY')
          .map((order: any) => {
            const table = order.tableId?.tableNumber || order.tableNumber || '';
            const readyAt = order.readyAt || order.updatedAt || order.createdAt;
            return {
              id: String(order._id),
              orderNumber: String(order.orderNumber || ''),
              destination: table ? `Table ${table}` : order.roomId?.roomNumber ? `Room ${order.roomId.roomNumber}` : 'Floor',
              timeAgo: readyAt ? `${Math.max(0, Math.round((Date.now() - new Date(readyAt).getTime()) / 60000))} min ago` : 'Just now',
              items: (order.items || []).map((item: any) => `${item.quantity || 1} x ${item.name || 'Dish'}`),
              station: order.stationName || 'Kitchen Hot Pass',
            };
          })
          .filter((row: any) => isTableAssignedToMe(row.destination));

        if (!cancelled && (!pickupTickets || pickupTickets.length === 0)) {
          setKitchenPickups(readyRows);
        }

        const rows = body.data
          .filter((order: any) =>
            ['PLACED', 'ACCEPTED', 'PREPARING', 'COOKING', 'IN_PROGRESS'].includes(
              String(order.orderStatus || '').toUpperCase()
            )
          )
          .map((order: any) => {
            const table = order.tableId?.tableNumber || order.tableNumber || '';
            const placedAt = order.placedAt || order.createdAt;
            const minutes = placedAt ? Math.max(0, Math.round((Date.now() - new Date(placedAt).getTime()) / 60000)) : 0;
            const totalItems = (order.items || []).reduce(
              (sum: number, item: any) => sum + Number(item.quantity || 0),
              0
            );
            return {
              id: String(order._id),
              orderNumber: String(order.orderNumber || ''),
              destination: table ? `Table ${table}` : `Room ${order.roomId?.roomNumber || ''}`,
              timeAgo: `${minutes} min ago`,
              progress:
                String(order.orderStatus || '').toUpperCase() === 'READY'
                  ? 100
                  : ['PREPARING', 'COOKING', 'IN_PROGRESS'].includes(String(order.orderStatus || '').toUpperCase())
                    ? 50
                    : 15,
              items: (order.items || []).map(
                (item: any) => `${item.quantity || 1} x ${item.name || 'Dish'}`
              ),
              station: 'Kitchen',
              totalItems,
            };
          })
          .filter((row: any) => isTableAssignedToMe(row.destination));
        if (!cancelled) setKitchenCooking(rows);
      } catch {
        // Keep the last known kitchen state when the API is unreachable.
      }
    };
    void loadCooking();
    const timer = window.setInterval(() => void loadCooking(), 20000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStaff.assignedTableStart, currentStaff.assignedTableEnd, currentStaff.staffId]);

  // STRICT FILTERING: Only show items belonging to tables assigned to this waiter
  const myKitchenPickups = useMemo(() => {
    return kitchenPickups.filter((kp) => isTableAssignedToMe(kp.destination));
  }, [kitchenPickups, isTableAssignedToMe]);

  const myKitchenCooking = useMemo(() => {
    return kitchenCooking.filter((kc) => isTableAssignedToMe(kc.destination));
  }, [kitchenCooking, isTableAssignedToMe]);

  const myGuestRequests = useMemo(() => {
    return guestRequests.filter((gr) => isTableAssignedToMe(gr.table));
  }, [guestRequests, isTableAssignedToMe]);

  // Busy Mode state & toggling
  const isBusy = currentShiftStatus === ShiftStatus.BUSY;

  const handleToggleBusy = () => {
    if (isOnTeaBreak) {
      triggerToast('⚠️ Please resume duty before changing status.');
      return;
    }
    const nextStatus = isBusy ? ShiftStatus.ON_DUTY : ShiftStatus.BUSY;
    setCurrentShiftStatus(nextStatus);
    if (onShiftChange) onShiftChange(nextStatus);
    playAudioChime();
    if (nextStatus === ShiftStatus.BUSY) {
      triggerToast('🟡 Status set to BUSY. You can delegate requests to colleagues.');
    } else {
      triggerToast('🟢 Status set to ON DUTY. Ready to take orders & serve tables.');
    }
  };

  const handleOpenDelegateModal = (task: DelegatableTask) => {
    setTaskToDelegate(task);
    setIsDelegateModalOpen(true);
  };

  const handleConfirmDelegation = (targetWaiter: WaiterStaffProfile, reason: string, task: DelegatableTask) => {
    setIsDelegateModalOpen(false);
    playAudioChime();

    // Remove task from active lists
    if (task.type === 'REQUEST' && task.id) {
      setGuestRequests((prev) => prev.filter((r) => r.id !== task.id));
    } else if (task.type === 'PICKUP' && task.id) {
      setKitchenPickups((prev) => prev.filter((p) => p.id !== task.id));
    }

    triggerToast(`✓ ${task.title} handed over to ${targetWaiter.name} (${targetWaiter.staffId})!`);

    if (onDelegateTask) {
      onDelegateTask({
        task,
        targetWaiter,
        reason,
        fromWaiter: currentStaff,
      });
    }
  };

  const [servedTodayCount, setServedTodayCount] = useState<number>(() => getServedCountStorage(14));

  // Sync with pickupTickets prop from socket if available
  useEffect(() => {
    if (pickupTickets && pickupTickets.length > 0) {
      setKitchenPickups((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const incoming = pickupTickets
          .filter((pt) => isTableAssignedToMe(pt.tableNumber))
          .map((pt) => ({
            id: (pt as any).id || pt._id,
            orderNumber: pt.orderNumber,
            destination: pt.tableNumber,
            timeAgo: 'Ready now',
            items: pt.itemsSummary ? pt.itemsSummary.split(',') : ['Kitchen ready dishes'],
            station: 'Kitchen Hot Pass',
          }))
          .filter((pt) => !existingIds.has(pt.id));
        return [...incoming, ...prev];
      });
    }
  }, [pickupTickets, isTableAssignedToMe]);

  // Sync with WaiterStore for live requests. When the last request is
  // resolved the list must become empty instead of reverting to demo data.
  useEffect(() => {
    if (!store) return;
    const formatAge = (createdAt?: string) => {
      const started = createdAt ? new Date(createdAt).getTime() : NaN;
      if (!Number.isFinite(started)) return 'Just now';
      const minutes = Math.max(0, Math.round((Date.now() - started) / 60000));
      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes} min ago`;
      const hours = Math.floor(minutes / 60);
      return `${hours}h ${minutes % 60}m ago`;
    };
    const formatType = (value?: string) =>
      String(value || 'CALL_WAITER')
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (character) => character.toUpperCase());

    const syncFromStore = () => {
      const active = store.getActiveRequests();
      const filtered = active.filter((r) => isTableAssignedToMe(r.tableNumber));
      setGuestRequests(
        filtered.map((r) => ({
          id: r.id,
          table: r.tableNumber || `Table ${currentStaff.assignedTableStart}`,
          timeAgo: formatAge(r.createdAt),
          request: (r as any).notes || formatType(r.requestType || (r as any).type),
        }))
      );
    };
    syncFromStore();
    return store.subscribe(syncFromStore);
  }, [store, isTableAssignedToMe, currentStaff.assignedTableStart]);

  // Trigger Toast
  const triggerToast = (msg: string) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 3500);
  };

  // Bright heritage theme only — dark mode retired, stale saved preference cleared.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.remove('dark');
    window.localStorage.setItem('spicehub_waiter_theme', 'light');
  }, []);

  // Waiter Actions
  const handleStartTeaBreak = (durationMinutes: number, notes?: string) => {
    setIsOnTeaBreak(true);
    setBreakTimerSeconds(durationMinutes * 60);
    setBreakTotalMinutes(durationMinutes);
    setBreakNotes(notes || '');
    setIsTeaBreakModalOpen(false);
    setCurrentShiftStatus(ShiftStatus.TEA_BREAK);
    if (onShiftChange) onShiftChange(ShiftStatus.TEA_BREAK);
    triggerToast(`☕ Tea break started (${durationMinutes} mins). Floor duty paused.`);
  };

  const handleResumeDuty = () => {
    setIsOnTeaBreak(false);
    setCurrentShiftStatus(ShiftStatus.ON_DUTY);
    if (onShiftChange) onShiftChange(ShiftStatus.ON_DUTY);
    playAudioChime();
    triggerToast(`🟢 Welcome back! Floor duty resumed for Tables T-${String(currentStaff.assignedTableStart).padStart(2, '0')}-T-${String(currentStaff.assignedTableEnd).padStart(2, '0')}.`);
  };

  const handleConfirmEndShift = (data: {
    buddyWaiter: string;
    handoverNotes: string;
    cashDropConfirmed: boolean;
  }) => {
    setIsEndShiftModalOpen(false);
    triggerToast(`Shift ended! Handover assigned to ${data.buddyWaiter}. Clocking out...`);
    if (onShiftChange) onShiftChange(ShiftStatus.OFFLINE);
    setTimeout(() => {
      if (onLogout) {
        onLogout();
      } else {
        triggerToast('Logged out successfully.');
      }
    }, 1000);
  };

  const handleMarkTableServed = async (tableId: number, tableName: string) => {
    const numOnly = parseInt(String(tableName).replace(/[^0-9]/g, ''), 10) || tableId;
    setTablesList((prev) =>
      prev.map((t) => (t.id === tableId || t.id === numOnly || t.name === String(numOnly) ? { ...t, servedStatus: 'SERVED' } : t))
    );
    const nextCount = incrementServedCountStorage(servedTodayCount);
    setServedTodayCount(nextCount);
    playAudioChime();
    triggerToast(`🎉 Table ${numOnly}: All food marked SERVED to guests!`);
    const targetPickup = kitchenPickups.find(
      (kp) => kp.destination === `Table ${tableName}` || kp.destination === tableName || kp.destination === `Table ${numOnly}`
    );
    const targetOrderId = targetPickup?.id || `tbl-${tableId}`;
    const targetOrderNum = targetPickup?.orderNumber || `#D102${tableId}`;
    markOrderServedInStorage(targetOrderId, targetOrderNum, `Table ${numOnly}`);
    if (targetPickup) {
      setKitchenPickups((prev) => prev.filter((kp) => kp.id !== targetPickup.id));
      if (onServeOrder) await onServeOrder(targetPickup.id, targetPickup.orderNumber, targetPickup.destination);
      if (onConfirmPickup) await onConfirmPickup(targetPickup.id);
    } else {
      if (onServeOrder) await onServeOrder(targetOrderId, targetOrderNum, `Table ${numOnly}`);
    }
  };

  const handleSavePax = (tableId: number, actualGuests: number, reason: string) => {
    setTablesList((prev) =>
      prev.map((t) =>
        t.id === tableId
          ? {
              ...t,
              actualGuests,
              guests: actualGuests,
              customerClaimedGuests: actualGuests,
              paxVerified: true,
              paxDiscrepancyReason: reason,
            }
          : t
      )
    );
    setIsVerifyPaxModalOpen(false);
    playAudioChime();
    const cleanName = paxSelectedTable ? paxSelectedTable.name : String(tableId);
    const claimed = paxSelectedTable?.customerClaimedGuests || 4;
    triggerToast(`✓ Table ${cleanName}: Seated count verified as ${actualGuests} Pax (Customer entered ${claimed}). POS synced!`);
  };

  const handleServePickup = async (id: string, orderNum: string, table: string) => {
    setKitchenPickups((prev) => prev.filter((p) => p.id !== id));
    const nextCount = incrementServedCountStorage(servedTodayCount);
    setServedTodayCount(nextCount);
    playAudioChime();
    markOrderServedInStorage(id, orderNum, table);
    // Also mark corresponding table as served
    const numOnly = parseInt(table.replace(/[^0-9]/g, ''), 10);
    if (numOnly) {
      setTablesList((prev) =>
        prev.map((t) => (t.id === numOnly ? { ...t, servedStatus: 'SERVED' } : t))
      );
    }
    triggerToast(`Order ${orderNum} picked up from Kitchen & served to ${table}! (60s SLA cleared)`);
    if (onServeOrder) await onServeOrder(id, orderNum, table);
    if (onConfirmPickup) await onConfirmPickup(id);
  };

  const handleCompleteRequest = async (id: string, table: string, req: string) => {
    setGuestRequests((prev) => prev.filter((r) => r.id !== id));
    triggerToast(`Completed request "${req}" for ${table}!`);
    if (store) store.markCompleted(id);
    if (onCompleteRequest) await onCompleteRequest(id);
  };

  const renderKpiCards = (isMobileLayout: boolean = false) => (
    <div className={
      isMobileLayout
        ? "grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5"
        : "grid grid-cols-5 gap-2.5 sm:gap-3"
    }>
      {/* Card 1: My Assigned Tables */}
      <div className={`p-3 rounded-2xl border flex items-center gap-3 transition-colors ${
 'bg-white border-orange-300 text-orange-950 shadow-2xs'
 }`}>
        <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-600 flex items-center justify-center font-black shrink-0">
          <Grid className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-[10px] sm:text-[11px] font-bold truncate ${'text-orange-900'}`}>Assigned Tables</div>
          <div className={`text-lg sm:text-xl font-black ${'text-slate-900'}`}>
            {myAssignedTables.length} / {currentStaff.assignedTableCount || tablesList.length}
          </div>
          <div className={`text-[9px] sm:text-[10px] font-bold truncate ${'text-orange-800'}`}>
            {currentStaff.assignedTableEnd > 0
              ? `T-${String(currentStaff.assignedTableStart).padStart(2, '0')}-T-${String(currentStaff.assignedTableEnd).padStart(2, '0')}`
              : 'Full Floor Access'}
          </div>
        </div>
      </div>

      {/* Card 2: Kitchen Food Pickups (Hot Pass) */}
      <div className={`p-3 rounded-2xl border flex items-center gap-3 transition-colors ${
 'bg-white border-emerald-300 text-emerald-950 shadow-2xs'
 }`}>
        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center font-black shrink-0">
          <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-[10px] sm:text-[11px] font-bold truncate ${'text-emerald-900'}`}>Kitchen Pickups</div>
          <div className={`text-lg sm:text-xl font-black ${'text-slate-900'}`}>{myKitchenPickups.length}</div>
          <div className={`text-[9px] sm:text-[10px] font-bold truncate ${'text-emerald-800'}`}>Hot Pass Ready</div>
        </div>
      </div>

      {/* Card 3: Kitchen Cooking */}
      <div className={`p-3 rounded-2xl border flex items-center gap-3 transition-colors ${
 'bg-white border-amber-300 text-slate-900 shadow-2xs'
 }`}>
        <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center font-black shrink-0">
          <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-[10px] sm:text-[11px] font-bold truncate ${'text-amber-900'}`}>Kitchen Cooking</div>
          <div className={`text-lg sm:text-xl font-black ${'text-slate-900'}`}>{myKitchenCooking.length}</div>
          <div className={`text-[9px] sm:text-[10px] font-bold truncate ${'text-amber-800'}`}>Chefs Preparing</div>
        </div>
      </div>

      {/* Card 4: Served to Table */}
      <div className={`p-3 rounded-2xl border flex items-center gap-3 transition-colors ${
 'bg-white border-[#CFE0D2] text-[#123C2B] shadow-2xs'
 }`}>
        <div className="w-9 h-9 rounded-xl bg-[#123C2B]/10 text-[#123C2B] flex items-center justify-center font-black shrink-0">
          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#123C2B]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-[10px] sm:text-[11px] font-bold truncate ${'text-[#123C2B]'}`}>Served to Table</div>
          <div className={`text-lg sm:text-xl font-black ${'text-blue-900'}`}>{servedTodayCount}</div>
          <div className={`text-[9px] sm:text-[10px] font-bold truncate ${'text-[#123C2B]'}`}>
            Served today
          </div>
        </div>
      </div>

      {/* Card 5: Guest Requests (col-span-2 on mobile so zero orphan empty space) */}
      <div className={`p-3 rounded-2xl border flex items-center gap-3 transition-colors ${
 isMobileLayout ? 'col-span-2 sm:col-span-1' : ''
 } ${
 'bg-white border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-2xs'
 }`}>
        <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-black shrink-0">
          <Users className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700 dark:text-slate-300" />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-[10px] sm:text-[11px] font-bold truncate ${'text-slate-700 dark:text-slate-300'}`}>Guest Requests</div>
          <div className={`text-lg sm:text-xl font-black ${'text-slate-900'}`}>{myGuestRequests.length}</div>
          <div className={`text-[9px] sm:text-[10px] font-bold truncate ${'text-slate-700 dark:text-slate-300'}`}>Water, Spoon, Bill</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`flex h-screen w-full max-w-full overflow-x-hidden font-sans select-none antialiased transition-colors duration-200 ${
 'bg-slate-50 text-slate-800'
 }`}>
      {/* Toast Notification */}
      {actionToast && (
        <div className="fixed top-5 right-5 z-50 bg-orange-600 text-white px-5 py-3 rounded-xl shadow-sm dark:shadow-none flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-6 h-6 text-orange-200" />
          <span className="font-bold text-sm">{actionToast}</span>
        </div>
      )}

      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 lg:hidden"
        />
      )}

      {/* ======================================================== */}
      {/* LEFT SIDEBAR: Responsive Drawer on Mobile, Fixed on Desktop */}
      {/* ======================================================== */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white text-slate-700 flex flex-col justify-between shrink-0 border-r border-[#E7DFCE] shadow-md transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 lg:flex lg:w-64 lg:flex-col ${
 isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
 }`}>
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo & Header */}
          <div className="p-4 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#123C2B] flex items-center justify-center shadow-xs ring-1 ring-[#E9C98A]/40">
                <ChefHat className="w-5 h-5 text-[#F3D79B]" />
              </div>
              <div>
                <div className="font-black text-lg text-[#123C2B] tracking-tight flex items-center gap-1.5">
                  SpiceHub
                </div>
                <p className="text-[9.5px] text-[#8A5A12] font-black tracking-[0.16em] uppercase">Waiter App</p>
              </div>
            </div>
            {/* Mobile close button */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-[#123C2B] hover:bg-[#F6F1E6]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Quick Controls Row: Language + Theme + Online Status */}
          <div className="px-4 py-2.5 border-b border-slate-100 bg-[#F6F1E6] flex items-center justify-between gap-2 text-xs">
            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="px-2.5 py-1 rounded-lg bg-white border border-[#E7DFCE] text-[#8A5A12] font-bold hover:bg-[#EFE8D9] transition"
              title="Toggle Language"
            >
              {language === 'en' ? '🇮🇳 हिन्दी' : '🌐 English'}
            </button>

            {/* Bright heritage badge */}
            <span
              data-testid="waiter-theme-badge"
              className="px-2.5 py-1 rounded-lg bg-[#F6F1E6] border border-[#E7DFCE] text-[#8A5A12] font-bold flex items-center gap-1.5"
              title="Bright Heritage Mode"
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Bright</span>
            </span>

            {/* Connection Status Pill */}
            <div className={`px-2 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1 ${
 isNetworkOnline
 ? 'bg-[#EDF4EC] border-[#CFE0D2] text-[#123C2B]'
 : 'bg-[#F9ECE7] border-[#EFC9BC] text-[#A93B21] animate-pulse'
 }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isNetworkOnline ? 'bg-emerald-400' : 'bg-red-500'}`} />
              <span>{isNetworkOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>

          {/* Nav Items List (Streamlined to 8 Essential Waiter Operations) */}
          <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-3 text-xs font-semibold custom-scrollbar">
            {[
              {
                category: 'Floor & Tables',
                items: [
                  { label: 'Dashboard', icon: LayoutDashboard },
                  { label: 'My Tables', icon: Grid, badge: `${myAssignedTables.length}` },
                  { label: 'Other Tables', icon: ArrowRightLeft, badge: `${(currentStaff.assignedTableEnd > 0) ? tablesList.filter(t => t.id < currentStaff.assignedTableStart || t.id > currentStaff.assignedTableEnd).length : 0}` },
                ]
              },
              {
                category: 'Kitchen & Orders',
                items: [
                  { label: 'Live Orders & KOT', icon: Flame, badge: `${kitchenPickups.length + kitchenCooking.length}` },
                  { label: 'Menu & Stock', icon: BookOpen },
                  { label: 'Call Kitchen', icon: ChefHat },
                ]
              },
              {
                category: 'Service & Billing',
                items: [
                  { label: 'Guest Requests', icon: Users, badge: guestRequests.length > 0 ? `${guestRequests.length}` : undefined },
                  { label: 'Notifications', icon: Bell, badge: unreadCount > 0 ? `${unreadCount}` : undefined },
                  { label: 'Table Billing', icon: CreditCard },
                ]
              },
              {
                category: 'Shift & Staff',
                items: [
                  { label: 'My Profile', icon: User },
                  { label: 'Settings', icon: Settings },
                  { label: 'Help & Support', icon: HelpCircle },
                ]
              }
            ].map((section) => (
              <div key={section.category} className="space-y-0.5">
                <div className="px-3 pt-1 pb-1 text-[10px] font-black tracking-wider text-slate-500 uppercase">
                  {section.category}
                </div>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSidebarItem === item.label;
                  return (
                    <button
                      key={item.label}
                      data-testid={`nav-item-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                      onClick={() => {
                        setActiveSidebarItem(item.label);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all ${
 isActive
 ? 'bg-[#123C2B] text-white font-black shadow-xs'
 : 'text-orange-600 hover:text-[#123C2B] hover:bg-[#F6F1E6]'
 }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#F3D79B]' : 'text-slate-500'}`} />
                      <span className="truncate">{t(item.label)}</span>
                      {item.badge && (
                        <span
                          className={`ml-auto px-1.5 py-0.5 min-w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${
 isActive ? 'bg-[#F3D79B] text-[#123C2B]' : 'bg-[#123C2B] text-white shadow-xs'
 }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Waiter User Profile Card with End Shift & Assigned Tables */}
          <div className="p-3 border-t border-slate-100 bg-[#FFFDF8]">
            <div className="flex items-center gap-3 mb-2.5">
              <div className="relative shrink-0">
                {currentStaff.avatar && !avatarError ? (
                  <img
                    src={currentStaff.avatar}
                    alt={currentStaff.name}
                    onError={() => setAvatarError(true)}
                    className="w-10 h-10 rounded-full object-cover border-2 border-orange-500/60 shadow-md"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-900 border-2 border-orange-300 flex items-center justify-center font-bold text-xs shadow-md">
                    {waiterInitials}
                  </div>
                )}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0c0d12]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-[#123C2B] truncate flex items-center gap-1.5">
                  <span className="truncate">{currentStaff.name}</span>
                </div>
                <div className="text-[10px] text-[#7C7566] flex items-center gap-1">
                  <span>{currentStaff.role}</span>
                  <span className={isOnTeaBreak ? 'text-[#8A5A12] font-bold' : 'text-[#123C2B] font-bold'}>
                    {isOnTeaBreak ? '● On Tea Break' : '● Online'}
                  </span>
                </div>
              </div>
            </div>

            {/* Prominent Assigned Table Range by Hotel Admin */}
            <div className="p-2 rounded-xl bg-[#F6F1E6] border border-[#E7DFCE] text-[10px] space-y-1 mb-2">
              <div className="flex items-center justify-between font-bold text-[#8A5A12]">
                <span className="flex items-center gap-1">
                  <Grid className="w-3 h-3 text-[#8A5A12]" />
                  <span>Assigned Tables:</span>
                </span>
                <span className="font-mono text-[#123C2B] bg-[#EDF4EC] border border-[#CFE0D2] px-1 rounded">
                  T-{String(currentStaff.assignedTableStart).padStart(2, '0')} - T-{String(currentStaff.assignedTableEnd).padStart(2, '0')}
                </span>
              </div>
              <div className="text-[#1B2A22] font-semibold truncate">
                {currentStaff.assignedTableCount} Tables ({currentStaff.assignedSection})
              </div>
              <div className="text-[9px] text-[#7C7566] flex items-center gap-1">
                <ShieldCheck className="w-2.5 h-2.5 text-[#123C2B]" />
                <span>Hotel Admin Allocated</span>
              </div>
            </div>

            {/* Action Buttons: Tea Break + End Shift */}
            <div className="space-y-1.5">
              <button
                onClick={() => {
                  if (isOnTeaBreak) {
                    handleResumeDuty();
                  } else {
                    setIsTeaBreakModalOpen(true);
                  }
                }}
                className={`w-full py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 ${
 isOnTeaBreak
 ? 'bg-[#8A5A12] text-white'
 : 'bg-[#F7E2B4] hover:bg-[#EFD79C] border border-[#E9C98A] text-[#8A5A12]'
 }`}
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>
                  {isOnTeaBreak
                    ? `☕ On Break (${Math.floor(breakTimerSeconds / 60)}:${String(breakTimerSeconds % 60).padStart(2, '0')})`
                    : '☕ Take Tea Break'}
                </span>
              </button>

              <button
                onClick={() => setIsEndShiftModalOpen(true)}
                className="w-full py-2 rounded-xl text-xs font-bold bg-[#123C2B] hover:bg-[#1B5138] text-white transition-all shadow-xs flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>End Shift & Handover</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* MAIN VIEWPORT: WAITER TERMINAL INTERFACE                 */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header Bar - Streamlined, Soft Typography & Low Clutter */}
        <header className={`px-3 sm:px-4 py-2 border-b flex items-center justify-between shrink-0 shadow-xs z-20 transition-colors ${
 'bg-white border-slate-200 text-slate-800'
 }`}>
          {/* Left Header: Contextual Back or Brand + Search */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 mr-2 sm:mr-3">
            {activeSidebarItem !== 'Dashboard' ? (
              <button
                onClick={() => setActiveSidebarItem('Dashboard')}
                className={`px-2.5 py-1.5 rounded-xl transition shrink-0 flex items-center gap-1.5 font-bold text-xs shadow-xs ${
 'text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200'
 }`}
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="font-bold text-xs">Dashboard</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-black text-sm text-amber-500 tracking-tight">SpiceHub</span>
                <span className="text-[11px] font-semibold text-slate-400">Waiter</span>
                <span className={`hidden sm:inline text-[10px] px-2 py-0.5 rounded-lg border font-mono font-bold ${
 'bg-slate-100 border-slate-200 text-slate-700'
 }`}>
                  T-{String(currentStaff.assignedTableStart).padStart(2, '0')}-T-{String(currentStaff.assignedTableEnd).padStart(2, '0')}
                </span>
              </div>
            )}

            {/* Tablet & Desktop Search Bar */}
            <div className="hidden sm:block relative w-full max-w-xs md:max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search table, item, order..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors ${
 'bg-slate-100/80 border-slate-200 text-slate-800 placeholder:text-slate-400'
 }`}
              />
            </div>
          </div>

          {/* Right Header: Streamlined Controls with Unified Profile Dropdown & Logout */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Quick Take Order (Tablet/Desktop) */}
            <button
              onClick={() => setIsPunchKotOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-amber-400 text-white font-bold text-xs transition shadow-xs"
              title="Punch New Order (Quick KOT)"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Take Order</span>
            </button>

            {/* Offline Alert (Shown only when disconnected) */}
            {!isNetworkOnline && (
              <div
                className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg border text-red-300 bg-red-950/80 border-red-800"
                title="Device offline - orders saved locally"
              >
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span>Offline</span>
              </div>
            )}

            {offlineKotQueue.length > 0 && isNetworkOnline && (
              <button
                onClick={syncOfflineOrders}
                className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-xl border text-amber-300 bg-slate-900/80 border-amber-700 hover:bg-amber-900 transition shadow-xs"
                title="Click to sync queued offline orders to Kitchen KDS"
              >
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                <span>Sync ({offlineKotQueue.length})</span>
              </button>
            )}

            {/* Notification Bell */}
            <button
              onClick={() => setIsNotificationCenterOpen(true)}
              className={`relative p-2 rounded-xl transition border ${
 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
 }`}
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Duty Status Badge Toggle */}
            <button
              data-testid="status-busy-toggle"
              onClick={handleToggleBusy}
              className={`px-2.5 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition ${
 isBusy
 ? 'bg-emerald-600/15 border-emerald-600/40 text-amber-400'
 : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
 }`}
              title={isBusy ? 'Status: Busy (Click for On Duty)' : 'Status: On Duty (Click for Busy)'}
            >
              <span className={`w-2 h-2 rounded-full ${isBusy ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
              <span className="hidden xs:inline">{isBusy ? 'Busy' : 'Duty'}</span>
            </button>

            {/* Profile Dropdown Trigger & Unified Logout Menu */}
            <div className="relative" ref={profileDropdownRef}>
              <button
                data-testid="navbar-profile-btn"
                onClick={() => setIsProfileDropdownOpen((prev) => !prev)}
                className={`flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-xl border transition ${
 isProfileDropdownOpen
 ? 'bg-slate-100 border-slate-300 text-slate-900'
 : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
 }`}
                title="Staff Profile & Logout"
              >
                <div className="relative shrink-0">
                  {currentStaff.avatar && !avatarError ? (
                    <img
                      src={currentStaff.avatar}
                      alt={currentStaff.name}
                      onError={() => setAvatarError(true)}
                      className="w-7 h-7 rounded-lg object-cover border border-slate-700/80"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-900 border border-orange-300 flex items-center justify-center font-bold text-[10px]">
                      {waiterInitials}
                    </div>
                  )}
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-slate-900 ${
                    isBusy ? 'bg-amber-400' : isOnTeaBreak ? 'bg-orange-400' : 'bg-emerald-400'
                  }`} />
                </div>
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-xs font-bold leading-tight truncate max-w-[100px]">{currentStaff.name}</span>
                  <span className="text-[10px] text-slate-400 leading-tight">{currentStaff.role}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>

              {/* Profile Dropdown Popup Menu */}
              {isProfileDropdownOpen && (
                <div className={`absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl border shadow-sm dark:shadow-none z-50 p-3.5 space-y-3 animate-in fade-in zoom-in-95 ${
                  'bg-white border-slate-200 text-slate-800 shadow-slate-300/40'
                }`}>
                  {/* User Profile Card */}
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-800/80">
                    {currentStaff.avatar && !avatarError ? (
                      <img
                        src={currentStaff.avatar}
                        alt={currentStaff.name}
                        onError={() => setAvatarError(true)}
                        className="w-11 h-11 rounded-xl object-cover border border-slate-700/80 shadow-xs shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-orange-100 text-orange-900 border border-orange-300 flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                        {waiterInitials}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-black text-sm truncate">{currentStaff.name}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-1.5">
                        <span>{currentStaff.role}</span>
                        <span>•</span>
                        <span className="font-mono text-[#8A5A12] font-bold">{currentStaff.staffId}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                        Zone: Tables T-{String(currentStaff.assignedTableStart).padStart(2, '0')}-T-{String(currentStaff.assignedTableEnd).padStart(2, '0')}
                      </div>
                    </div>
                  </div>

                  {/* Shift / Break Action */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        if (isOnTeaBreak) {
                          handleResumeDuty();
                        } else {
                          setIsTeaBreakModalOpen(true);
                        }
                      }}
                      className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition ${
 isOnTeaBreak
 ? 'bg-emerald-600/20 text-amber-300 border-emerald-600/40 animate-pulse'
 : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
 }`}
                    >
                      <Coffee className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isOnTeaBreak ? 'Resume Floor Duty' : 'Take Tea Break'}</span>
                    </button>
                  </div>

                  {/* Navigation Links */}
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setActiveSidebarItem('My Profile');
                        setIsProfileDropdownOpen(false);
                      }}
                      className="w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 hover:bg-slate-800/60 text-slate-300 hover:text-white transition"
                    >
                      <User className="w-4 h-4 text-amber-500" />
                      <span>My Profile & Change Photo</span>
                    </button>
                    <button
                      onClick={() => {
                        toggleLanguage();
                      }}
                      className="w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between hover:bg-slate-800/60 text-slate-300 hover:text-white transition"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="text-xs">🌐</span>
                        <span>Language</span>
                      </span>
                      <span className="text-xs font-bold text-amber-400">{language === 'en' ? 'हिन्दी' : 'English'}</span>
                    </button>
                    <div className="w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between text-slate-700">
                      <span className="flex items-center gap-2.5">
                        <Sun className="w-4 h-4 text-[#8A5A12]" />
                        <span>Theme</span>
                      </span>
                      <span className="text-xs font-bold text-[#123C2B]">Bright Heritage</span>
                    </div>
                  </div>

                  {/* Unified Logout Button */}
                  <div className="pt-2 border-t border-slate-800/80">
                    <button
                      data-testid="navbar-logout-btn"
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        if (onLogout) {
                          onLogout();
                        } else {
                          setIsEndShiftModalOpen(true);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 flex items-center justify-center gap-2 transition"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out / Conclude Shift</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Drawer Menu Toggle (Mobile Only) */}
            <button
              data-testid="btn-mobile-drawer-toggle"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className={`lg:hidden p-2 rounded-xl border transition ${
 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
 }`}
              title="Menu Drawer"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Busy Mode Banner with 1-Tap Task Delegation Action */}
        {isBusy && !isOnTeaBreak && (
          <div className="bg-amber-500/15 border-b border-amber-500/40 text-amber-300 px-3 sm:px-5 py-2 flex items-center justify-between text-xs shrink-0 z-20 animate-fadeIn">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
              <div className="truncate">
                <strong>Status: BUSY:</strong> Handling Tables T-{String(currentStaff.assignedTableStart).padStart(2, '0')}-T-{String(currentStaff.assignedTableEnd).padStart(2, '0')}. Need help with requests or pickups?
              </div>
            </div>
            <button
              data-testid="delegate-to-colleague-btn"
              onClick={() => handleOpenDelegateModal({
                type: 'GENERAL',
                tableNumber: `Tables T-${String(currentStaff.assignedTableStart).padStart(2, '0')}-T-${String(currentStaff.assignedTableEnd).padStart(2, '0')}`,
                title: 'Floor Workload Handover',
                details: `${currentStaff.name} is currently busy attending tables. Request assistance from colleague.`
              })}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-amber-400 text-white font-black text-[11px] transition shrink-0 shadow-sm ml-2"
            >
              Delegate to Colleague →
            </button>
          </div>
        )}

        {/* Persistent Tea Break Active Banner with Live Countdown */}
        {isOnTeaBreak && (
          <div className="bg-amber-600 text-white px-3 sm:px-5 py-2 sm:py-2.5 border-b border-amber-500/60 shadow-md flex items-center justify-between shrink-0 z-20 animate-fadeIn">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-base shrink-0 font-black animate-pulse shadow-inner">
                ☕
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-black text-xs sm:text-sm">Tea Break Active</span>
                  <span className="font-mono font-black text-xs px-2 py-0.5 rounded-full bg-white/25 shadow-2xs">
                    ⏳ {Math.floor(breakTimerSeconds / 60)}:{String(breakTimerSeconds % 60).padStart(2, '0')} remaining
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-amber-100 truncate">
                  Duty paused. Floor captains are covering your zone ({currentStaff.assignedSection}). Alerts silenced.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setBreakTimerSeconds((s) => s + 300)}
                className="hidden sm:inline-flex px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold transition"
              >
                +5m Extend
              </button>
              <button
                onClick={handleResumeDuty}
                className="px-3.5 sm:px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs shadow-md flex items-center gap-1.5 transition transform hover:scale-105"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Resume Floor Duty</span>
              </button>
            </div>
          </div>
        )}

        {/* Expandable Mobile Search Row */}
        {isMobileSearchOpen && (
          <div className={`sm:hidden p-2.5 border-b flex items-center gap-2 ${
 'bg-slate-100 border-slate-200'
 }`}>
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search table, item, order, guest..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className={`w-full pl-8 pr-7 py-1.5 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 ${
 'bg-white border-slate-300 text-slate-900'
 }`}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2 text-slate-400 text-xs">✕</button>
              )}
            </div>
            <button
              onClick={() => setIsMobileSearchOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white text-xs font-bold"
            >
              Cancel
            </button>
          </div>
        )}

        {/* 60-Second Food Pickup SLA Alert Banner */}
        {myKitchenPickups.length > 0 && !isOnTeaBreak && (
          <div className={`px-3 sm:px-5 py-1.5 border-b flex items-center justify-between text-xs transition-colors ${
 'bg-amber-50 border-amber-200 text-amber-900'
 }`}>
            <div className="flex items-center gap-2 font-bold min-w-0 flex-1 mr-2">
              <Zap className="w-4 h-4 text-orange-400 animate-pulse shrink-0" />
              <span className="truncate">
                Kitchen SLA: <strong className="text-orange-400">{myKitchenPickups[0]?.orderNumber} on {myKitchenPickups[0]?.destination}</strong> ready!
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`font-mono font-black px-2 py-0.5 rounded border ${
 'text-red-600 bg-white border-red-300'
 }`}>
                00:{slaCountdown < 10 ? `0${slaCountdown}` : slaCountdown}s
              </span>
              <button
                onClick={() => {
                  setSlaCountdown((prev) => prev + 60);
                  triggerToast('SLA Snoozed by 60 seconds (Kitchen alerted).');
                  if (onSnoozePickup) onSnoozePickup('active-pickup');
                }}
                className={`px-2 py-0.5 rounded font-bold text-[11px] transition ${
 'bg-orange-100 hover:bg-orange-200 text-orange-800'
 }`}
              >
                Snooze
              </button>
            </div>
          </div>
        )}

        {/* Top 5 KPI Metric Cards Row (Desktop Fixed) */}
        {activeSidebarItem === 'Dashboard' && (
          <div className="hidden lg:block px-3 sm:px-5 py-2.5 shrink-0">
            {renderKpiCards(false)}
          </div>
        )}

        {/* Scrollable Main Workspace: Streamlined Mobile & Desktop Dashboard */}
        {activeSidebarItem === 'Dashboard' && (
          <div className="flex-1 flex flex-col overflow-y-auto min-h-0 px-3 sm:px-4 lg:px-5 pb-32 lg:pb-6 gap-3 custom-scrollbar">
            
            {/* ======================================================== */}
            {/* MOBILE & TABLET LAYOUT (<lg): 100% OPERATIONAL FLOOR     */}
            {/* ======================================================== */}
            <div className="lg:hidden flex flex-col gap-3">
              {/* 1. Sleek Compact 1-Line Status Ribbon */}
              <div className="p-2.5 rounded-xl border bg-white border-slate-200 shadow-2xs flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Grid className="w-3.5 h-3.5 text-[#123C2B]" />
                  <span>
                    {currentStaff.assignedTableEnd > 0
                      ? `T-${String(currentStaff.assignedTableStart).padStart(2, '0')}-T-${String(currentStaff.assignedTableEnd).padStart(2, '0')}`
                      : 'All Tables'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">({myAssignedTables.length} tables)</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                    🟢 {myAssignedTables.filter(t => t.status === 'Available').length} Free
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-800 border border-red-200">
                    🔴 {myAssignedTables.filter(t => t.status === 'Occupied' || t.status === 'My Table').length} Busy
                  </span>
                  {myKitchenPickups.length > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-black animate-pulse shadow-xs">
                      🔔 {myKitchenPickups.length} Ready
                    </span>
                  )}
                  {myGuestRequests.length > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white font-black animate-pulse shadow-xs">
                      🙋 {myGuestRequests.length} Calls
                    </span>
                  )}
                </div>
              </div>

              {/* 2. URGENT HOT PASS PICKUPS (ONLY WHEN READY > 0) */}
              {myKitchenPickups.length > 0 && (
                <div className="p-3 rounded-2xl border bg-emerald-50/90 border-emerald-300 shadow-sm space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-black text-emerald-950">
                      <Bell className="w-4 h-4 text-emerald-600 animate-bounce" />
                      <span>Ready at Hot Pass ({myKitchenPickups.length})</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-600 text-white">
                      SERVE NOW
                    </span>
                  </div>
                  <div className="space-y-2">
                    {myKitchenPickups.map((kp) => (
                      <div key={kp.id} className="p-2.5 rounded-xl bg-white border border-emerald-200 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-xs text-slate-900">{kp.orderNumber}</span>
                            <span className="px-2 py-0.5 rounded text-[11px] font-black bg-blue-100 text-blue-900 border border-blue-200">
                              {kp.destination}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {kp.timeAgo}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-slate-800">
                          {kp.items.map((it, idx) => (
                            <div key={idx} className="flex items-center justify-between py-0.5">
                              <span>• {it}</span>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleOpenDelegateModal({
                              type: 'PICKUP',
                              id: kp.id,
                              tableNumber: kp.destination,
                              title: `${kp.orderNumber} for ${kp.destination}`,
                              details: `${kp.items.join(', ')} ready at ${kp.station}`,
                            })}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold border bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                          >
                            <ArrowRightLeft className="w-3 h-3 inline mr-1 text-slate-500" />
                            Delegate
                          </button>
                          <button
                            onClick={() => handleServePickup(kp.id, kp.orderNumber, kp.destination)}
                            className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>✓ Pick Up & Serve</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. URGENT GUEST CALLS (ONLY WHEN CALLS > 0) */}
              {myGuestRequests.length > 0 && (
                <div className="p-3 rounded-2xl border bg-amber-50 border-amber-300 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-black text-amber-950">
                      <Users className="w-4 h-4 text-amber-600" />
                      <span>Guest Assistance Calls ({myGuestRequests.length})</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {myGuestRequests.map((gr) => (
                      <div key={gr.id} className="p-2 rounded-xl bg-white border border-amber-200 flex items-center justify-between text-xs shadow-2xs">
                        <div className="min-w-0 flex-1 mr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-slate-900">{gr.table}</span>
                            <span className="text-[10px] text-slate-500">• {gr.timeAgo}</span>
                          </div>
                          <div className="text-[11px] font-semibold text-amber-900 truncate">{gr.request}</div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleCompleteRequest(gr.id, gr.table, gr.request)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-2xs"
                          >
                            ✓ Done
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. PRIMARY WORKSPACE: MY ASSIGNED TABLES GRID */}
              <div className="p-3 rounded-2xl border bg-white border-slate-200 shadow-2xs space-y-3">
                {/* Filter pills & other tables button */}
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                    {[
                      { id: 'All', label: `All (${myAssignedTables.length})` },
                      { id: 'Available', label: `🟢 Free (${myAssignedTables.filter(t => t.status === 'Available').length})` },
                      { id: 'Occupied', label: `🔴 Busy (${myAssignedTables.filter(t => t.status === 'Occupied' || t.status === 'My Table').length})` },
                    ].map((f) => {
                      const isActive = dashboardTableFilter === f.id;
                      return (
                        <button
                          key={f.id}
                          onClick={() => setDashboardTableFilter(f.id as any)}
                          className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition whitespace-nowrap ${
                            isActive
                              ? 'bg-[#123C2B] text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                          }`}
                        >
                          {f.label}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setActiveSidebarItem('Other Tables')}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg border bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300 shrink-0"
                  >
                    Other Tables →
                  </button>
                </div>

                {/* 2-Column Responsive Touch-Friendly Grid */}
                <div
                  data-testid="my-assigned-tables-grid"
                  className="grid grid-cols-2 gap-2.5 sm:gap-3"
                >
                  {myAssignedTables
                    .filter((t) => {
                      if (dashboardTableFilter === 'Available') return t.status === 'Available';
                      if (dashboardTableFilter === 'Occupied') return t.status === 'Occupied' || t.status === 'My Table';
                      if (dashboardTableFilter === 'Cleaning') return t.status === 'Cleaning';
                      return true;
                    })
                    .map((t) => {
                      const isAvailable = t.status === 'Available';
                      const isOccupied = t.status === 'Occupied' || t.status === 'My Table';
                      const isCleaning = t.status === 'Cleaning';
                      const bill = tableBills[`Table ${t.name}`];

                      return (
                        <div
                          key={t.id}
                          data-testid={`card-waiter-table-${t.name}`}
                          className={`p-3 rounded-2xl border transition shadow-2xs flex flex-col justify-between gap-2.5 ${
                            isAvailable
                              ? 'bg-emerald-50/40 border-emerald-300 hover:border-emerald-400'
                              : isOccupied
                              ? 'bg-[#FDF9F2] border-[#CFE0D2] hover:border-[#123C2B]/40'
                              : 'bg-blue-50/40 border-blue-200'
                          }`}
                        >
                          {/* Card Header: Table Number & Pax */}
                          <div className="flex items-center justify-between w-full">
                            <div>
                              <div className="text-base font-black text-slate-900 tracking-tight">
                                Table {t.name}
                              </div>
                              <div className="text-[10px] text-slate-500 font-medium">
                                {isAvailable
                                  ? `${t.guests || 4} Chairs`
                                  : `${t.actualGuests || t.guests || 2} Pax Seated`}
                              </div>
                            </div>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                              isAvailable
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : isOccupied
                                ? 'bg-red-100 text-red-800 border-red-300'
                                : 'bg-blue-100 text-blue-800 border-blue-300'
                            }`}>
                              {isAvailable ? '🟢 Free' : isOccupied ? '🔴 Busy' : '🟡 Clean'}
                            </span>
                          </div>

                          {/* Card Body: Bill & Details */}
                          <div className="py-1">
                            {isAvailable ? (
                              <div className="text-xs text-emerald-800 font-semibold flex items-center gap-1">
                                <span>Ready for Walk-in Guests</span>
                              </div>
                            ) : isOccupied ? (
                              <div className="space-y-0.5">
                                <div className="text-sm font-black text-slate-900">
                                  🧾 ₹{Number(bill?.grandTotal || 0).toLocaleString('en-IN')}
                                </div>
                                <div className="text-[10px] text-slate-600 font-medium flex items-center justify-between">
                                  <span>{bill?.items.length || 0} items ordered</span>
                                  <span className="text-emerald-700 font-bold">Active Order</span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-blue-800 font-semibold">
                                Table being sanitized
                              </div>
                            )}
                          </div>

                          {/* Card Actions: Big Touch-Friendly Buttons */}
                          <div className="pt-2 border-t border-slate-200/80">
                            {isAvailable ? (
                              <button
                                onClick={() => {
                                  setSelectedTableForOrder(`Table ${t.name}`);
                                  setIsPunchKotOpen(true);
                                }}
                                className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs flex items-center justify-center gap-1.5 transition active:scale-98"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>+ Take Order</span>
                              </button>
                            ) : isOccupied ? (
                              <div className="grid grid-cols-2 gap-1.5">
                                <button
                                  onClick={() => {
                                    setSelectedTableForOrder(`Table ${t.name}`);
                                    setIsPunchKotOpen(true);
                                  }}
                                  className="py-1.5 px-2 rounded-xl bg-[#123C2B] hover:bg-[#1B5138] text-white font-black text-[11px] shadow-xs flex items-center justify-center gap-1 transition"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>+ Order</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedTableForBilling(`Table ${t.name}`);
                                    setActiveSidebarItem('Table Billing');
                                  }}
                                  className="py-1.5 px-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-black text-[11px] shadow-2xs flex items-center justify-center gap-1 transition"
                                >
                                  <CreditCard className="w-3 h-3 text-[#123C2B]" />
                                  <span>🧾 Settle</span>
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setTablesList(prev => prev.map(tbl => tbl.id === t.id ? { ...tbl, status: 'Available' } : tbl));
                                  triggerToast(`Table ${t.name} is now Available.`);
                                }}
                                className="w-full py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                              >
                                Mark Ready
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* 5. KITCHEN COOKING PROGRESS (ONLY WHEN COOKING > 0) */}
              {myKitchenCooking.length > 0 && (
                <div className="p-3 rounded-2xl border bg-white border-slate-200 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                      <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
                      <span>Chefs Cooking ({myKitchenCooking.length})</span>
                    </div>
                    <button
                      onClick={() => setActiveSidebarItem('Live Orders & KOT')}
                      className="text-[10px] font-bold text-[#123C2B] hover:underline"
                    >
                      View All KOTs →
                    </button>
                  </div>
                  <div className="space-y-2">
                    {myKitchenCooking.map((kc) => (
                      <div key={kc.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-900">{kc.orderNumber}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900">
                              {kc.destination}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium">{kc.timeAgo}</span>
                        </div>
                        <div className="text-[11px] text-slate-700 font-medium truncate">
                          {kc.items.join(', ')}
                        </div>
                        <div className="space-y-1 pt-0.5">
                          <div className="flex items-center justify-between text-[9px] text-slate-500 font-semibold">
                            <span>Chef Station: {kc.station}</span>
                            <span className="text-amber-700 font-bold">{kc.progress}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                            <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${kc.progress}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ======================================================== */}
            {/* DESKTOP LAYOUT (>=lg): STREAMLINED 3-COLUMN WORKSPACE    */}
            {/* ======================================================== */}
            <div className="hidden lg:flex lg:flex-row gap-3 w-full lg:flex-1 lg:min-h-0">
              {/* DESKTOP COLUMN 1: KITCHEN PASS & COOKING */}
              <div className="lg:flex-1 lg:basis-0 lg:min-w-0 flex flex-col gap-3 lg:overflow-y-auto pr-1">
                {/* Hot Pass Ready */}
                <div className="p-3.5 rounded-2xl border bg-white border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                      <Bell className="w-4 h-4 text-emerald-500" />
                      <span>Kitchen Hot Pass ({myKitchenPickups.length})</span>
                    </div>
                    <span className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Ready to Serve
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {myKitchenPickups.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-500">
                        No food ready at Hot Pass currently.
                      </div>
                    ) : (
                      myKitchenPickups.map((kp) => (
                        <div key={kp.id} className="p-2.5 rounded-xl border bg-emerald-50/70 border-emerald-300 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-black text-xs text-slate-900">{kp.orderNumber}</span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-orange-800 border border-blue-200">{kp.destination}</span>
                            </div>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-600 text-white">HOT PASS</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-600 font-medium">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-500" />
                              <span>{kp.timeAgo}</span>
                            </span>
                            <span className="font-mono font-semibold text-slate-700">{kp.station}</span>
                          </div>
                          <div className="space-y-0.5 text-xs font-medium border-t pt-1.5 text-slate-800 border-emerald-200/80">
                            {kp.items.map((it, idx) => (
                              <div key={idx} className="truncate flex items-center justify-between text-[11px]">
                                <span>{it}</span>
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => handleOpenDelegateModal({
                                type: 'PICKUP',
                                id: kp.id,
                                tableNumber: kp.destination,
                                title: `${kp.orderNumber} for ${kp.destination}`,
                                details: `${kp.items.join(', ')} ready at ${kp.station}`,
                              })}
                              className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border bg-blue-50 border-blue-300 text-blue-800 hover:bg-blue-100"
                            >
                              <ArrowRightLeft className="w-3 h-3 text-amber-400 inline mr-1" />
                              Delegate
                            </button>
                            <button
                              onClick={() => handleServePickup(kp.id, kp.orderNumber, kp.destination)}
                              className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Pick Up & Serve</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Kitchen Cooking Status */}
                <div className="p-3.5 rounded-2xl border bg-white border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                      <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
                      <span>Chefs Cooking ({myKitchenCooking.length})</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-600">Live KOTs</span>
                  </div>
                  <div className="space-y-2.5">
                    {myKitchenCooking.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-500">
                        No orders currently cooking.
                      </div>
                    ) : (
                      myKitchenCooking.map((kc) => (
                        <div key={kc.id} className="p-3 rounded-xl border bg-slate-50/80 border-slate-200 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-xs text-slate-900">{kc.orderNumber}</span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-orange-800 border border-blue-200">{kc.destination}</span>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 flex items-center gap-1">
                              <Flame className="w-3 h-3 text-amber-500" />
                              <span>Preparing</span>
                            </span>
                          </div>
                          <div className="text-xs text-slate-800 font-medium">
                            {kc.items.join(', ')}
                          </div>
                          <div className="space-y-1 pt-1">
                            <div className="flex items-center justify-between text-[9px] font-semibold text-slate-600">
                              <span>Chef Station: {kc.station}</span>
                              <span className="font-bold text-emerald-700">{kc.progress}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                              <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${kc.progress}%` }} />
                            </div>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => triggerToast(`Kitchen alerted: Checking status for ${kc.orderNumber}`)}
                              className="flex-1 py-1 rounded-lg font-bold text-xs bg-blue-100 hover:bg-blue-200 text-blue-900 border border-blue-200"
                            >
                              Nudge Kitchen
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* DESKTOP COLUMN 2: PRIMARY TABLE LAYOUT GRID */}
              <div className="lg:flex-[1.4] lg:basis-0 lg:min-w-0 flex flex-col gap-3 lg:overflow-y-auto pr-1">
                <div className="p-3.5 rounded-2xl border bg-white border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                      <Grid className="w-4 h-4 text-emerald-500" />
                      <span>My Assigned Tables ({myAssignedTables.length})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 font-bold border border-emerald-500/30">
                        T-{String(currentStaff.assignedTableStart).padStart(2, '0')} - T-{String(currentStaff.assignedTableEnd).padStart(2, '0')}
                      </span>
                      <button
                        onClick={() => setActiveSidebarItem('Other Tables')}
                        className="text-[10px] font-black px-2 py-0.5 rounded border bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 flex items-center gap-1 transition"
                      >
                        <ArrowRightLeft className="w-2.5 h-2.5 text-slate-700" />
                        <span>Other Tables</span>
                      </button>
                    </div>
                  </div>

                  {/* Table Vacancy Filter Tabs */}
                  <div className="flex flex-wrap items-center gap-1.5 pb-0.5 text-[11px] font-bold">
                    {[
                      { id: 'All', label: `All (${myAssignedTables.length})` },
                      { id: 'Available', label: `🟢 Available (${myAssignedTables.filter(t => t.status === 'Available').length})` },
                      { id: 'Occupied', label: `🔴 Occupied (${myAssignedTables.filter(t => t.status === 'Occupied' || t.status === 'My Table').length})` },
                      { id: 'Cleaning', label: `🟡 Clean (${myAssignedTables.filter(t => t.status === 'Cleaning').length})` },
                    ].map((f) => {
                      const isActive = dashboardTableFilter === f.id;
                      return (
                        <button
                          key={f.id}
                          onClick={() => setDashboardTableFilter(f.id as any)}
                          className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition whitespace-nowrap ${
                            isActive
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                          }`}
                        >
                          {f.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Visual Grid: Assigned Tables */}
                  <div
                    data-testid="my-assigned-tables-grid-desktop"
                    className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 rounded-2xl border bg-slate-50 border-slate-200"
                  >
                    {myAssignedTables
                      .filter((t) => {
                        if (dashboardTableFilter === 'Available') return t.status === 'Available';
                        if (dashboardTableFilter === 'Occupied') return t.status === 'Occupied' || t.status === 'My Table';
                        if (dashboardTableFilter === 'Cleaning') return t.status === 'Cleaning';
                        return true;
                      })
                      .map((t) => {
                        const isAvailable = t.status === 'Available';
                        const isOccupied = t.status === 'Occupied' || t.status === 'My Table';
                        const isCleaning = t.status === 'Cleaning';
                        const bill = tableBills[`Table ${t.name}`];

                        return (
                          <div
                            key={t.id}
                            data-testid={`card-waiter-table-desktop-${t.name}`}
                            className={`p-3.5 rounded-xl border aspect-square text-left transition flex flex-col justify-between gap-1 shadow-sm ${
                              isAvailable
                                ? 'bg-white border-emerald-500/40 text-slate-900'
                                : isOccupied
                                ? 'bg-[#FDF9F2] border-red-500/40 text-slate-900'
                                : 'bg-white border-blue-400/40 text-slate-900'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                isAvailable
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isOccupied
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {isAvailable ? 'Available' : isOccupied ? 'Occupied' : 'Cleaning'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {t.actualGuests || t.guests || 4} Pax
                              </span>
                            </div>

                            <div className="text-center my-auto">
                              <div className="text-2xl font-bold text-slate-900 whitespace-nowrap">
                                T-{t.name}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
                                {isAvailable ? 'Ready for Guests' : isOccupied ? (bill?.grandTotal ? `₹${bill.grandTotal}` : 'Active Order') : 'Cleaning'}
                              </div>
                            </div>

                            <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between gap-1 w-full">
                              {isAvailable ? (
                                <button
                                  onClick={() => {
                                    setSelectedTableForOrder(`Table ${t.name}`);
                                    setIsPunchKotOpen(true);
                                  }}
                                  className="w-full py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                                >
                                  + Take Order
                                </button>
                              ) : isOccupied ? (
                                <div className="grid grid-cols-2 gap-1 w-full">
                                  <button
                                    onClick={() => {
                                      setSelectedTableForOrder(`Table ${t.name}`);
                                      setIsPunchKotOpen(true);
                                    }}
                                    className="py-1 rounded-lg bg-[#123C2B] text-white font-bold text-[10px]"
                                  >
                                    + KOT
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedTableForBilling(`Table ${t.name}`);
                                      setActiveSidebarItem('Table Billing');
                                    }}
                                    className="py-1 rounded-lg bg-white border border-slate-300 text-slate-800 font-bold text-[10px]"
                                  >
                                    Settle
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 text-center w-full">Cleaning</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* DESKTOP COLUMN 3: GUEST CALLS & QUICK ACTIONS */}
              <div className="lg:flex-1 lg:basis-0 lg:min-w-0 flex flex-col gap-3 lg:overflow-y-auto pl-1">
                {/* Guest Assistance Calls */}
                <div className="p-3.5 rounded-2xl border bg-white border-slate-200 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                      <Users className="w-3.5 h-3.5 text-slate-700" />
                      <span>Guest Calls ({myGuestRequests.length})</span>
                    </div>
                    <button
                      onClick={() => setActiveSidebarItem('Guest Requests')}
                      className="text-[10px] font-bold text-[#123C2B] hover:underline"
                    >
                      View All
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5 custom-scrollbar">
                    {myGuestRequests.length === 0 ? (
                      <div className="text-center py-4 text-xs text-slate-500">
                        No active guest calls.
                      </div>
                    ) : (
                      myGuestRequests.slice(0, 5).map((gr) => (
                        <div key={gr.id} className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 flex items-center justify-between text-xs">
                          <div className="min-w-0 flex-1 mr-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{gr.table}</span>
                              <span className="text-[10px] text-slate-500">{gr.timeAgo}</span>
                            </div>
                            <div className="font-semibold text-[11px] truncate text-slate-700">{gr.request}</div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleCompleteRequest(gr.id, gr.table, gr.request)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="p-3.5 rounded-2xl border bg-white border-slate-200 shadow-2xs space-y-2.5">
                  <h3 className="font-black text-xs text-slate-900">Floor Actions</h3>
                  <div className="space-y-1.5">
                    <button
                      onClick={() => {
                        setCrossTableCourtesyNote(undefined);
                        setIsPunchKotOpen(true);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-[#123C2B] hover:bg-[#1B5138] text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ New Order (KOT)</span>
                    </button>
                    <button
                      onClick={() => setIsCrossTableAssistOpen(true)}
                      className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 flex items-center justify-center gap-2 transition"
                    >
                      <Users className="w-4 h-4 text-slate-600" />
                      <span>🤝 Cross-Table Guest Assist</span>
                    </button>
                  </div>
                </div>

                {/* Recent Completed */}
                <div className="p-3 rounded-2xl border bg-white border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-xs text-slate-900">Recent Completed</h3>
                    <button
                      onClick={() => setActiveSidebarItem('Order History')}
                      className="text-[10px] font-bold text-[#123C2B] hover:underline"
                    >
                      View All
                    </button>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {recentOrders.length === 0 ? (
                      <div className="p-3 rounded-lg text-[10px] text-center bg-slate-50 border border-slate-200/60 text-slate-500">
                        No served orders yet.
                      </div>
                    ) : (
                      recentOrders.slice(0, 5).map((rc) => (
                        <div key={rc.id} className="p-1.5 rounded-lg flex items-center justify-between text-[11px] bg-slate-50 border border-slate-200/60">
                          <div>
                            <span className="font-bold text-slate-900">{rc.orderNumber}</span>
                            <span className="text-slate-600 text-[10px] ml-1 font-medium">{rc.location}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-slate-900">₹{Number(rc.total || 0).toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

      {/* DEDICATED SIDE PAGES / VIEWS */}
      {activeSidebarItem === 'My Tables' && (
        <MyTablesView
          tablesList={tablesList}
          waiterSession={currentStaff}
          onUpdateTableStatus={(id, st) => setTablesList((prev) => prev.map((t) => (t.id === id ? { ...t, status: st } : t)))}
          onTakeOrder={(tbl) => { setSelectedTableForOrder(tbl); setIsPunchKotOpen(true); }}
          onTransferTable={() => setActiveSidebarItem('Table Transfer')}
          onBillTable={(tbl) => {
            if (tbl) setSelectedTableForBilling(tbl);
            setActiveSidebarItem('Table Billing');
          }}
          onMarkTableServed={handleMarkTableServed}
          onOpenPaxModal={(tbl) => {
            setPaxSelectedTable(tbl);
            setIsVerifyPaxModalOpen(true);
          }}
          onOpenOtherTablesPage={() => setActiveSidebarItem('Other Tables')}
          triggerToast={triggerToast}
        />
      )}

      {activeSidebarItem === 'Other Tables' && (
        <OtherTablesView
          tablesList={tablesList}
          waiterSession={currentStaff}
          onSelectOtherTableForOrder={(tbl, colleagueName) => {
            setSelectedTableForOrder(tbl);
            setCrossTableCourtesyNote(
              `🤝 Cross-Table Order: ${currentStaff.name} (${currentStaff.staffId}) taking order for ${tbl} (Assigned to ${colleagueName}).`
            );
            setIsPunchKotOpen(true);
          }}
          onSelectOtherTableForBilling={(tbl, colleagueName) => {
            setSelectedTableForBilling(tbl);
            setActiveSidebarItem('Table Billing');
            triggerToast(`🧾 Opened Courtesy Billing for ${tbl} (Assigned to ${colleagueName})`);
          }}
          onOpenUpiForOtherTable={(tbl, amt) => {
            void handleOpenDynamicUpiModal(tbl, amt).catch(() => undefined);
          }}
          onNotifyAssignedWaiter={(tbl, colleagueName) => {
            triggerToast(`🔔 Instant alert sent to ${colleagueName}: Guest at ${tbl} needs assistance!`);
          }}
          onBackToMyTables={() => setActiveSidebarItem('My Tables')}
          triggerToast={triggerToast}
        />
      )}

      {(activeSidebarItem === 'Live Orders & KOT' || activeSidebarItem === 'New Orders' || activeSidebarItem === 'Active Orders' || activeSidebarItem === 'KOT & Status') && (
        <LiveOrdersAndKotView
          initialTab={
            activeSidebarItem === 'New Orders'
              ? 'All'
              : activeSidebarItem === 'Active Orders'
              ? 'Preparing'
              : activeSidebarItem === 'KOT & Status'
              ? 'Served'
              : 'Ready'
          }
          readyPickups={myKitchenPickups}
          cookingOrders={myKitchenCooking}
          servedOrders={servedTickets}
          onServeOrder={handleServePickup}
          onPunchKot={(dest) => { setSelectedTableForOrder(dest); setIsPunchKotOpen(true); }}
          triggerToast={triggerToast}
        />
      )}

      {activeSidebarItem === 'Order History' && (
        <OrderHistoryView
          triggerToast={triggerToast}
        />
      )}

      {activeSidebarItem === 'Table Transfer' && (
        <TableTransferView
          tablesList={tablesList}
          waiterName={currentStaff.name}
          onTransferSuccess={(src, dst, reason) => {
            const srcNum = src.replace(/Table\s*/i, '');
            const dstNum = dst.replace(/Table\s*/i, '');
            setTablesList((prev) =>
              prev.map((t) => {
                if (t.name === srcNum) return { ...t, status: 'Cleaning' };
                if (t.name === dstNum) return { ...t, status: 'My Table' };
                return t;
              })
            );
          }}
          triggerToast={triggerToast}
        />
      )}

      {activeSidebarItem === 'Guest Requests' && (
        <GuestRequestsView
          requests={myGuestRequests}
          onCompleteRequest={handleCompleteRequest}
          triggerToast={triggerToast}
        />
      )}

      {(activeSidebarItem === 'Menu & Stock' || activeSidebarItem === 'Menu Items') && (
        <MenuItemsView
          menuItems={menuItems}
          tablesList={myAssignedTables}
          selectedTable={selectedTableForOrder}
          onSelectTable={(tbl) => setSelectedTableForOrder(tbl)}
          onPunchKot={(tbl) => { setSelectedTableForOrder(tbl); setIsPunchKotOpen(true); }}
          onToggleItem86={onToggleItem86}
          triggerToast={triggerToast}
        />
      )}

      {activeSidebarItem === 'Split Bill' && (
        <SplitBillView
          onOpenUpiModal={(tbl, amt) => {
            void handleOpenDynamicUpiModal(tbl, amt).catch(() => undefined);
          }}
          triggerToast={triggerToast}
        />
      )}

      {activeSidebarItem === 'Table Billing' && (
        <TableBillingView
          assignedTables={myAssignedTables}
          allTables={tablesList}
          waiterSession={currentStaff}
          initialSelectedTable={selectedTableForBilling}
          onOpenUpiModal={(tbl, amt) => {
            void handleOpenDynamicUpiModal(tbl, amt).catch(() => undefined);
          }}
          onOpenCashFloatModal={() => setIsCashFloatModalOpen(true)}
          onOpenOtherTablesPage={() => setActiveSidebarItem('Other Tables')}
          onSettleTable={async (tbl, paymentMode, amount) => {
            const tNum = tbl.replace(/Table\s*/i, '');
            setTablesList((prev) => prev.map((t) => (t.name === tNum ? { ...t, status: 'Cleaning' } : t)));
            try {
              await waiterFetch(`${API_BASE_URL}/billing/payment/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  tableNumber: tbl,
                  paymentMode,
                  amount,
                }),
              }).catch(() => {});
            } catch (_) {}
            if (onRefreshTables) onRefreshTables();
          }}
          onSplitBill={() => setActiveSidebarItem('Split Bill')}
          triggerToast={triggerToast}
        />
      )}

      {activeSidebarItem === 'Room Service' && (
        <RoomServiceView
          triggerToast={triggerToast}
          orders={roomServiceOrders}
          loadState={roomServiceLoadState}
          onRetry={() => onRefreshRoomServiceOrders?.()}
          onStatusChange={async (orderId, nextStatus) => {
            if (!onRoomServiceOrderStatusChange) {
              triggerToast('Room-service updates are unavailable. Please reconnect and retry.');
              return false;
            }
            return onRoomServiceOrderStatusChange(orderId, nextStatus);
          }}
        />
      )}

      {activeSidebarItem === 'Call Kitchen' && (
        <CallKitchenView
          assignedTables={myAssignedTables}
          triggerToast={triggerToast}
          onSendKitchenBuzzer={onSendKitchenBuzzer}
          kitchenBuzzers={kitchenBuzzers}
        />
      )}

      {activeSidebarItem === 'Notifications' && (
        <NotificationsView
          triggerToast={triggerToast}
          notifications={activeNotifications}
          onMarkAllRead={handleMarkAllRead}
          onDismiss={handleDismiss}
          onAction={handleNotificationAction}
          onSendTestAlert={onSendTestAlert}
        />
      )}

      {activeSidebarItem === 'My Profile' && (
        <MyProfileView
          waiterSession={currentStaff}
          onLogout={onLogout}
          onOpenCashFloatModal={() => setIsCashFloatModalOpen(true)}
          triggerToast={triggerToast}
          onUpdateAvatar={onUpdateAvatar}
          waiterFloat={waiterFloat}
          liveMetrics={{
            runningBillValue: myAssignedTables.reduce(
              (sum, table) => sum + Number(tableBills[`Table ${table.name}`]?.grandTotal || 0),
              0
            ),
            tablesServed: myAssignedTables.filter((table) => table.servedStatus === 'SERVED').length,
            tablesAssigned: myAssignedTables.length,
            servedOrdersToday: recentOrders.length,
          }}
        />
      )}

      {activeSidebarItem === 'Settings' && (
        <SettingsView
          triggerToast={triggerToast}
        />
      )}

      {activeSidebarItem === 'Help & Support' && (
        <HelpAndSupportView
          triggerToast={triggerToast}
        />
      )}
    </div>

      {/* ======================================================== */}
      {/* MODALS: PUNCH KOT, DYNAMIC UPI, CASH FLOAT               */}
      {/* ======================================================== */}
      {isPunchKotOpen && (
        <QuickKotPunchSheet
          selectedTable={selectedTableForOrder}
          onSelectTable={(tbl) => setSelectedTableForOrder(tbl)}
          allTables={tablesList}
          currentStaff={currentStaff}
          menuItems={menuItems}
          courtesyNote={crossTableCourtesyNote}
          onOpenOtherTablesPage={() => {
            setIsPunchKotOpen(false);
            setActiveSidebarItem('Other Tables');
          }}
          onFireKot={async (targetTable, items, instructions) => {
            const tableToUse = targetTable || selectedTableForOrder;
            let fireSucceeded = false;

            if (isNetworkOnline && onFireKot) {
              try {
                await onFireKot(tableToUse, items, instructions);
                fireSucceeded = true;
              } catch (err) {
                console.warn('Network call failed, queueing KOT locally:', err);
              }
            }

            if (!fireSucceeded) {
              // Queue order in localStorage for auto-sync
              const queuedOrder = {
                id: `offline-kot-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                tableToUse,
                items,
                instructions,
                timestamp: new Date().toISOString(),
              };
              setOfflineKotQueue((prev) => {
                const nextQueue = [...prev, queuedOrder];
                localStorage.setItem('spicehub_waiter_offline_orders', JSON.stringify(nextQueue));
                return nextQueue;
              });
            }

            // Immediately create active cooking order in local state so Waiter Live Orders reflects it!
            const newOrderNum = `#D${Math.floor(1000 + Math.random() * 9000)}`;
            setKitchenCooking((prev) => [
              {
                id: `kc-${Date.now()}`,
                orderNumber: newOrderNum,
                destination: tableToUse,
                timeAgo: 'Just now',
                progress: 15,
                items: items.map((i) => `${i.quantity}x ${i.name}`),
                station: 'Kitchen Hot Pass',
              },
              ...prev,
            ]);

            // Update table status in tablesList
            setTablesList((prev) =>
              prev.map((t) => {
                const tName = `Table ${t.name}`;
                if (tName === tableToUse || String(t.id) === tableToUse.replace(/[^0-9]/g, '')) {
                  const isAssigned = t.id >= currentStaff.assignedTableStart && t.id <= currentStaff.assignedTableEnd;
                  return {
                    ...t,
                    status: isAssigned ? 'My Table' : 'Occupied',
                  };
                }
                return t;
              })
            );

            setIsPunchKotOpen(false);
            setCrossTableCourtesyNote(undefined);

            const tableNumOnly = parseInt(tableToUse.replace(/[^0-9]/g, ''), 10) || 1;
            const isAssigned = tableNumOnly >= currentStaff.assignedTableStart && tableNumOnly <= currentStaff.assignedTableEnd;
            const msg = fireSucceeded
              ? isAssigned
                ? `🔥 KOT fired for ${tableToUse}! Direct route to Kitchen KDS.`
                : `🤝 Courtesy KOT fired for ${tableToUse}! Sent to Kitchen KDS & assigned waiter notified.`
              : `📦 ${tableToUse} KOT queued in offline storage! Will auto-sync when online.`;
            triggerToast(msg);
          }}
          onCancel={() => {
            setIsPunchKotOpen(false);
            setCrossTableCourtesyNote(undefined);
          }}
        />
      )}

      {/* Cross-Table Guest Assistance Modal (For in-person/verbal calls on non-assigned tables) */}
      <CrossTableAssistModal
        isOpen={isCrossTableAssistOpen}
        onClose={() => setIsCrossTableAssistOpen(false)}
        currentStaff={currentStaff}
        tablesList={tablesList}
        onTakeOrderForTable={(table, isCourtesy, assignedTo) => {
          setSelectedTableForOrder(table);
          if (isCourtesy) {
            setCrossTableCourtesyNote(`Courtesy Order: ${table} (Assigned to ${assignedTo})`);
            triggerToast(`Taking verbal order for ${table} on behalf of ${assignedTo}`);
          } else {
            setCrossTableCourtesyNote(undefined);
          }
          setIsPunchKotOpen(true);
        }}
        onPageWaiterForTable={(table, assignedTo, reason) => {
          triggerToast(`🔔 Paged ${assignedTo}: "Guest at ${table} calling for ${reason}"`);
          setGuestRequests((prev) => [
            {
              id: `gr-${Date.now()}`,
              table,
              timeAgo: 'Just now',
              request: `In-Person Call: ${reason} (Paged to ${assignedTo})`,
            },
            ...prev,
          ]);
        }}
        onLogServiceForTable={(table, requestType) => {
          triggerToast(`Logged service "${requestType}" for ${table}!`);
          setGuestRequests((prev) => [
            {
              id: `gr-${Date.now()}`,
              table,
              timeAgo: 'Just now',
              request: requestType,
            },
            ...prev,
          ]);
        }}
        onOpenUpiModalForTable={(table, amount) => {
          void handleOpenDynamicUpiModal(table, amount).catch(() => undefined);
          triggerToast(`📱 Dynamic UPI QR generated for ${table} (₹${amount}) - Courtesy Assist`);
        }}
        onSettleBillForTable={async (table, amount, mode) => {
          const tNum = table.replace(/Table\s*/i, '');
          setTablesList((prev) => prev.map((t) => (t.name === tNum ? { ...t, status: 'Cleaning' } : t)));
          playAudioChime();
          triggerToast(`✓ Courtesy Bill for ${table} settled (₹${amount}) via ${mode} by ${currentStaff.name}!`);
          try {
            await waiterFetch(`${API_BASE_URL}/billing/payment/process`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                tableNumber: table,
                paymentMode: mode,
                amount,
                settledByStaffId: currentStaff.staffId,
                settledByStaffName: currentStaff.name,
                isCourtesyAssist: true,
              }),
            }).catch(() => {});
          } catch (_) {}
          if (onRefreshTables) onRefreshTables();
        }}
        onOpenTableBillingView={(table) => {
          setSelectedTableForBilling(table);
          setActiveSidebarItem('Table Billing');
        }}
      />

      {isUpiModalOpen && (
        <DynamicUpiQrModal
          isOpen={isUpiModalOpen}
          onClose={() => setIsUpiModalOpen(false)}
          qr={
            activeDynamicUpiQr ||
            activeUpiQr || {
              billId: `BILL-${selectedTableForOrder.replace(/[^0-9]/g, '') || '1'}-${Date.now().toString().slice(-4)}`,
              transactionRef: `TXN-UPI-${Date.now().toString().slice(-6)}`,
              tableNumber: selectedTableForOrder,
              amount: selectedTableBillAmount || tableBills[`Table ${selectedTableForOrder}`]?.grandTotal || 0,
              currency: 'INR',
              merchantVpa: 'spicehub@icici',
              merchantName: 'SpiceHub Hotel & Dining',
              upiUri: `upi://pay?pa=spicehub@icici&pn=SpiceHub%20Hotel&am=${selectedTableBillAmount || tableBills[`Table ${selectedTableForOrder}`]?.grandTotal || 0}&cu=INR&tr=TXN-UPI-${Date.now().toString().slice(-6)}`,
              status: 'PENDING' as any,
              soundboxNotified: false,
              expiresAt: new Date(Date.now() + 300000).toISOString(),
            }
          }
          onCheckStatus={async (tx) => {
            if (onCheckUpiStatus) await onCheckUpiStatus(tx);
          }}
          onCancelQr={async (tx) => {
            if (onCancelUpiQr) await onCancelUpiQr(tx);
            setIsUpiModalOpen(false);
          }}
        />
      )}

      {isCashFloatModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-sm dark:shadow-none border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                <Banknote className="w-5 h-5 text-emerald-600" />
                Waiter Cash Float & Shift Register
              </h3>
              <button onClick={() => setIsCashFloatModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            {waiterFloat ? (
              <WaiterCashFloatCard
                float={waiterFloat}
                onRequestDrop={async (amt, reason) => {
                  if (onRequestCashDrop) {
                    await onRequestCashDrop(amt, reason);
                  }
                  setIsCashFloatModalOpen(false);
                  triggerToast('Cash drop submitted for supervisor verification.');
                }}
              />
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
                  No cash float is open for your staff account. Open your shift float to start recording
                  table cash collections.
                </div>
                <div className="flex items-center gap-2">
                  <NumericInput
                    min="0"
                    step="1"
                    value={floatAmountInput}
                    onChange={(event) => setFloatAmountInput(event.target.value)}
                    placeholder="Opening float ₹"
                    className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button
                    onClick={async () => {
                      const amount = Number(floatAmountInput);
                      if (!amount || amount < 0) {
                        triggerToast('Enter the opening float amount.');
                        return;
                      }
                      try {
                        if (onOpenFloat) {
                          await onOpenFloat(amount);
                        }
                        setFloatAmountInput('');
                        setIsCashFloatModalOpen(false);
                        triggerToast(`Cash float of ₹${amount} opened for this shift.`);
                      } catch (error: any) {
                        triggerToast(error?.message || 'Could not open the cash float.');
                      }
                    }}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white"
                  >
                    Open Float
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tea Break Modal */}
      <TeaBreakModal
        isOpen={isTeaBreakModalOpen}
        onClose={() => setIsTeaBreakModalOpen(false)}
        onStartBreak={handleStartTeaBreak}
        currentStaffName={currentStaff.name}
        assignedTablesRange={`T-${String(currentStaff.assignedTableStart).padStart(2, '0')}-T-${String(currentStaff.assignedTableEnd).padStart(2, '0')}`}
      />

      {/* End Shift & Handover Modal */}
      <EndShiftHandoverModal
        isOpen={isEndShiftModalOpen}
        onClose={() => setIsEndShiftModalOpen(false)}
        onConfirmEndShift={handleConfirmEndShift}
        staffName={currentStaff.name}
        staffId={currentStaff.staffId}
        shiftName={currentStaff.shift}
        tablesServedCount={servedTodayCount}
        assignedTablesRange={`T-${String(currentStaff.assignedTableStart).padStart(2, '0')} to T-${String(currentStaff.assignedTableEnd).padStart(2, '0')}`}
        activeTablesCount={myAssignedTables.filter(t => t.status === 'Occupied' || t.status === 'My Table').length}
        cashFloatBalance={waiterFloat?.expectedCashInHand || 2450}
      />

      {/* Verify & Edit Table Guests (Pax / Covers) Modal */}
      <VerifyPaxModal
        isOpen={isVerifyPaxModalOpen}
        onClose={() => setIsVerifyPaxModalOpen(false)}
        table={paxSelectedTable}
        onSavePax={handleSavePax}
      />

      {/* Delegate Task Handover Modal (When Waiter is Busy) */}
      <DelegateTaskModal
        isOpen={isDelegateModalOpen}
        onClose={() => setIsDelegateModalOpen(false)}
        task={taskToDelegate}
        currentStaff={currentStaff}
        onConfirmDelegation={handleConfirmDelegation}
      />

      {/* Mobile Bottom Navigation Bar (Thumb-friendly, hidden on lg+ screens) */}
      <nav
        aria-label="Mobile Navigation"
        className={`fixed bottom-0 inset-x-0 z-40 lg:hidden border-t px-3 pt-2 pb-3 flex items-center justify-around shadow-sm dark:shadow-none backdrop-blur-xl transition-colors ${
 'bg-white/98 border-slate-200 text-slate-600'
 }`}
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 12px))' }}
      >
        <button
          data-testid="bottom-nav-dashboard"
          onClick={() => setActiveSidebarItem('Dashboard')}
          className={`min-h-[48px] min-w-[48px] flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
 activeSidebarItem === 'Dashboard'
 ? 'text-[#123C2B] font-semibold'
 : 'text-slate-500 hover:text-slate-800'
 }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[11px] mt-0.5 font-medium">{t('Dashboard')}</span>
        </button>

        <button
          data-testid="bottom-nav-tables"
          onClick={() => setActiveSidebarItem('My Tables')}
          className={`min-h-[48px] min-w-[48px] relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
 activeSidebarItem === 'My Tables'
 ? 'text-[#123C2B] font-semibold'
 : 'text-slate-500 hover:text-slate-800'
 }`}
        >
          <Grid className="w-5 h-5" />
          <span className="text-[11px] mt-0.5 font-medium">{t('Tables', 'Tables')}</span>
          {tablesList.filter(t => t.status === 'My Table').length > 0 && (
            <span className="absolute 1 right-1 px-1 min-w-3.5 h-3.5 rounded-full bg-[#123C2B] text-white text-[8px] font-bold flex items-center justify-center shadow-xs">
              {tablesList.filter(t => t.status === 'My Table').length}
            </span>
          )}
        </button>

        {/* Quick Order Center Action Button - CLEAN ROYAL BLUE ELEVATED */}
        <button
          data-testid="bottom-quick-order-btn"
          onClick={() => setIsPunchKotOpen(true)}
          className="-mt-6 flex flex-col items-center justify-center group focus:outline-none shrink-0"
          title="Take New Order (Quick KOT)"
        >
          <div
            className="w-13 h-13 rounded-full bg-[#123C2B] text-white flex items-center justify-center shadow-md ring-4 ring-white dark:ring-slate-900 group-active:scale-95 group-hover:bg-[#1B5138] transition-all"
          >
            <Plus className="w-6 h-6 stroke-[2.5] text-white" />
          </div>
          <span className="text-[11px] font-semibold mt-1 text-[#123C2B] dark:text-[#2E6B4C] tracking-tight whitespace-nowrap">
            {t('+ Take Order')}
          </span>
        </button>

        <button
          data-testid="bottom-nav-live-kot"
          onClick={() => setActiveSidebarItem('Live Orders & KOT')}
          className={`min-h-[48px] min-w-[48px] relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
 activeSidebarItem === 'Live Orders & KOT'
 ? 'text-[#123C2B] font-semibold'
 : 'text-slate-500 hover:text-slate-800'
 }`}
        >
          <Flame className="w-5 h-5" />
          <span className="text-[11px] mt-0.5 font-medium">{t('Live Orders & KOT', 'Live KOT')}</span>
          {(myKitchenPickups.length + myKitchenCooking.length) > 0 && (
            <span className="absolute 1 right-1 px-1 min-w-3.5 h-3.5 rounded-full bg-blue-600 text-white text-[8px] font-bold flex items-center justify-center shadow-xs">
              {myKitchenPickups.length + myKitchenCooking.length}
            </span>
          )}
        </button>

        <button
          data-testid="bottom-more-nav-btn"
          onClick={() => setIsMobileMenuOpen(true)}
          className={`min-h-[48px] min-w-[48px] relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
 'text-slate-500 hover:text-slate-800'
 }`}
          title="Open Full Navigation Drawer"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-bold">{t('More', 'More')}</span>
          {unreadCount > 0 ? (
            <span className="absolute -top-0.5 right-1 px-1 min-w-3.5 h-3.5 rounded-full bg-red-600 text-white text-[8px] font-black flex items-center justify-center animate-pulse shadow-xs">
              {unreadCount}
            </span>
          ) : myGuestRequests.length > 0 ? (
            <span className="absolute -top-0.5 right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-xs" />
          ) : null}
        </button>
      </nav>

      {/* Real-time Notification Center Modal */}
      <NotificationCenterModal
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
        notifications={activeNotifications}
        onMarkAsRead={handleMarkRead}
        onMarkAllAsRead={handleMarkAllRead}
        onClearAll={handleClearAll}
        onDismiss={handleDismiss}
        onAction={handleNotificationAction}
        onSendTestAlert={onSendTestAlert}
        isMuted={isMuted}
        onToggleMute={toggleMute}
      />
    </div>
  );
};
