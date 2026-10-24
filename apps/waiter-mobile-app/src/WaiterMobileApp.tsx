import { API_BASE_URL } from './config/api';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Printer,
  ChevronRight,
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
  Moon,
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
  FoodPickupTicketDTO
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
    staffId: 'W-101',
    name: 'Ravi Kumar',
    role: 'Captain',
    pin: '',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    assignedSection: 'Indoor AC Dining Hall',
    assignedTableStart: 1,
    assignedTableEnd: 6,
    assignedTableCount: 6,
    shift: 'Morning Shift (09:00 AM - 05:00 PM)',
    permissions: ['KOT Punching', 'Food Pickup & Serving', 'Table Transfer', 'Bill Settle Request', 'Guest Calls'],
  };

  const [activeSidebarItem, setActiveSidebarItem] = useState('Dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [selectedLayoutArea, setSelectedLayoutArea] = useState('All Tables');
  const [activeOrdersFilter, setActiveOrdersFilter] = useState('All');
  const [dashboardTableFilter, setDashboardTableFilter] = useState<'All' | 'Available' | 'Occupied' | 'Cleaning'>('All');

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

  // STRICT HOTEL ADMIN ASSIGNED TABLES: Waiter only gets the tables assigned to him by Hotel Admin!
  const myAssignedTables = useMemo(() => {
    return tablesList.filter(
      (t) => t.id >= currentStaff.assignedTableStart && t.id <= currentStaff.assignedTableEnd
    );
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
          actualGuests: prevActual.get(t.id) ?? t.actualGuests ?? (t.id === 4 ? 2 : (t.guests || 2)),
          customerClaimedGuests: prevClaimed.get(t.id) ?? t.customerClaimedGuests ?? (t.id === 4 ? 4 : undefined),
          paxVerified: prevVerified.get(t.id) ?? t.paxVerified ?? (t.id === 4 ? false : true),
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

  // Check if a table is strictly assigned to this waiter
  const isTableAssignedToMe = useCallback(
    (targetTable: string | number | undefined): boolean => {
      if (!targetTable) return false;
      const numOnly = parseInt(String(targetTable).replace(/[^0-9]/g, ''), 10);
      if (isNaN(numOnly)) return false;
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
        const servedResponse = await waiterFetch(`${API_BASE_URL}/pos/kds/orders?status=SERVED`);
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

        const response = await waiterFetch(`${API_BASE_URL}/pos/kds/orders?status=ALL`);
        if (!response.ok) return;
        const body = await response.json();
        if (!body.success || !Array.isArray(body.data)) return;
        const rows = body.data
          .filter((order: any) =>
            ['PLACED', 'ACCEPTED', 'PREPARING', 'READY'].includes(
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
                  : String(order.orderStatus || '').toUpperCase() === 'PREPARING'
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
      triggerToast('🟡 Status set to BUSY (व्यस्त). You can delegate requests to colleagues.');
    } else {
      triggerToast('🟢 Status set to ON DUTY (उपलब्ध). Ready to take orders & serve tables.');
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
          request: formatType(r.requestType || (r as any).type),
        }))
      );
    };
    syncFromStore();
    return store.subscribe(syncFromStore);
  }, [store, isTableAssignedToMe, currentStaff.assignedTableStart]);

  // Room Service State
  const [roomServices, setRoomServices] = useState([
    { id: 'rs-1', room: 'Room 304', timeAgo: '5 min ago' },
    { id: 'rs-2', room: 'Room 201', timeAgo: '12 min ago' },
  ]);

  // Trigger Toast
  const triggerToast = (msg: string) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 3500);
  };

  // Theme State (Bright / Dark Mode)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('spicehub_waiter_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'dark';
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.body.classList.remove('bg-[#f4f5f8]', 'text-slate-900');
        document.body.classList.add('bg-[#090b10]', 'text-slate-100');
      } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('bg-[#090b10]', 'text-slate-100', 'bg-slate-950');
        document.body.classList.add('bg-[#f4f5f8]', 'text-slate-900');
      }
    }
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('spicehub_waiter_theme', next);
    }
  };

  const isDark = theme === 'dark';

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
        isDark ? 'bg-orange-950/20 border-orange-800/40 text-orange-300' : 'bg-[#fff7ed] border-orange-300 text-orange-950 shadow-2xs'
      }`}>
        <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-600 flex items-center justify-center font-black shrink-0">
          <Grid className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-[10px] sm:text-[11px] font-bold truncate ${isDark ? 'text-orange-300' : 'text-orange-900'}`}>Assigned Tables</div>
          <div className={`text-lg sm:text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {tablesList.filter(t => t.id >= currentStaff.assignedTableStart && t.id <= currentStaff.assignedTableEnd).length} / {currentStaff.assignedTableCount}
          </div>
          <div className={`text-[9px] sm:text-[10px] font-bold truncate ${isDark ? 'text-orange-400' : 'text-orange-800'}`}>
            T-{String(currentStaff.assignedTableStart).padStart(2, '0')}-T-{String(currentStaff.assignedTableEnd).padStart(2, '0')}
          </div>
        </div>
      </div>

      {/* Card 2: Kitchen Food Pickups (Hot Pass) */}
      <div className={`p-3 rounded-2xl border flex items-center gap-3 transition-colors ${
        isDark ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300' : 'bg-[#ecfdf5] border-emerald-300 text-emerald-950 shadow-2xs'
      }`}>
        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center font-black shrink-0">
          <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-[10px] sm:text-[11px] font-bold truncate ${isDark ? 'text-emerald-300' : 'text-emerald-900'}`}>Kitchen Pickups</div>
          <div className={`text-lg sm:text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{myKitchenPickups.length}</div>
          <div className={`text-[9px] sm:text-[10px] font-bold truncate ${isDark ? 'text-emerald-400' : 'text-emerald-800'}`}>Hot Pass Ready</div>
        </div>
      </div>

      {/* Card 3: Kitchen Cooking */}
      <div className={`p-3 rounded-2xl border flex items-center gap-3 transition-colors ${
        isDark ? 'bg-amber-950/20 border-amber-800/40 text-amber-300' : 'bg-[#fefce8] border-amber-300 text-amber-950 shadow-2xs'
      }`}>
        <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center font-black shrink-0">
          <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-[10px] sm:text-[11px] font-bold truncate ${isDark ? 'text-amber-300' : 'text-amber-900'}`}>Kitchen Cooking</div>
          <div className={`text-lg sm:text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{myKitchenCooking.length}</div>
          <div className={`text-[9px] sm:text-[10px] font-bold truncate ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>Chefs Preparing</div>
        </div>
      </div>

      {/* Card 4: Served to Table */}
      <div className={`p-3 rounded-2xl border flex items-center gap-3 transition-colors ${
        isDark ? 'bg-blue-950/20 border-blue-800/40 text-blue-300' : 'bg-[#eff6ff] border-blue-300 text-blue-950 shadow-2xs'
      }`}>
        <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-600 flex items-center justify-center font-black shrink-0">
          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-[10px] sm:text-[11px] font-bold truncate ${isDark ? 'text-blue-300' : 'text-blue-900'}`}>Served to Table</div>
          <div className={`text-lg sm:text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{servedTodayCount}</div>
          <div className={`text-[9px] sm:text-[10px] font-bold truncate ${isDark ? 'text-blue-400' : 'text-blue-800'}`}>
            Served on this device today
          </div>
        </div>
      </div>

      {/* Card 5: Guest Requests (col-span-2 on mobile so zero orphan empty space) */}
      <div className={`p-3 rounded-2xl border flex items-center gap-3 transition-colors ${
        isMobileLayout ? 'col-span-2 sm:col-span-1' : ''
      } ${
        isDark ? 'bg-purple-950/20 border-purple-800/40 text-purple-300' : 'bg-[#faf5ff] border-purple-300 text-purple-950 shadow-2xs'
      }`}>
        <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-600 flex items-center justify-center font-black shrink-0">
          <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-[10px] sm:text-[11px] font-bold truncate ${isDark ? 'text-purple-300' : 'text-purple-900'}`}>Guest Requests</div>
          <div className={`text-lg sm:text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{myGuestRequests.length}</div>
          <div className={`text-[9px] sm:text-[10px] font-bold truncate ${isDark ? 'text-purple-400' : 'text-purple-800'}`}>Water, Spoon, Bill</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`flex h-screen w-screen overflow-hidden font-sans select-none antialiased transition-colors duration-200 ${
      isDark ? 'bg-[#090b10] text-slate-100' : 'bg-[#f4f5f8] text-slate-800'
    }`}>
      {/* Toast Notification */}
      {actionToast && (
        <div className="fixed top-5 right-5 z-50 bg-orange-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
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
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#121319] text-slate-300 flex flex-col justify-between shrink-0 border-r border-slate-800/80 shadow-2xl transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo & Header */}
          <div className="p-4 flex items-center justify-between border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-950/40">
                <ChefHat className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-black text-lg text-white tracking-tight flex items-center gap-1.5">
                  SpiceHub
                </div>
                <p className="text-[11px] text-orange-400 font-bold uppercase tracking-wider">Waiter App</p>
              </div>
            </div>
            {/* Mobile close button */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Nav Items List (Streamlined to 8 Essential Waiter Operations) */}
          <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-3 text-xs font-semibold custom-scrollbar">
            {[
              {
                category: 'Floor & Tables',
                items: [
                  { label: 'Dashboard', icon: LayoutDashboard },
                  { label: 'My Tables', icon: Grid, badge: `${myAssignedTables.length}` },
                  { label: 'Other Tables', icon: ArrowRightLeft, badge: `${tablesList.filter(t => t.id < currentStaff.assignedTableStart || t.id > currentStaff.assignedTableEnd).length}` },
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
                      onClick={() => {
                        setActiveSidebarItem(item.label);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all ${
                        isActive
                          ? 'bg-orange-500 text-white font-black shadow-md shadow-orange-950/40'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span
                          className={`ml-auto px-1.5 py-0.5 min-w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${
                            isActive ? 'bg-white text-orange-600' : 'bg-red-600 text-white shadow-xs'
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
          <div className="p-3 border-t border-slate-800/80 bg-[#0c0d12]">
            <div className="flex items-center gap-3 mb-2.5">
              <div className="relative shrink-0">
                <img
                  src={currentStaff.avatar}
                  alt={currentStaff.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-orange-500/60 shadow-md"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0c0d12]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                  <span className="truncate">{currentStaff.name}</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-400 font-mono font-bold">
                    {currentStaff.staffId}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                  <span>{currentStaff.role}</span>
                  <span className={isOnTeaBreak ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                    {isOnTeaBreak ? '● On Tea Break' : '● Online'}
                  </span>
                </div>
              </div>
            </div>

            {/* Prominent Assigned Table Range by Hotel Admin */}
            <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/25 text-[10px] space-y-1 mb-2">
              <div className="flex items-center justify-between font-bold text-orange-300">
                <span className="flex items-center gap-1">
                  <Grid className="w-3 h-3 text-orange-400" />
                  <span>Assigned Tables:</span>
                </span>
                <span className="font-mono text-white bg-orange-500/30 px-1 rounded">
                  T-{String(currentStaff.assignedTableStart).padStart(2, '0')} - T-{String(currentStaff.assignedTableEnd).padStart(2, '0')}
                </span>
              </div>
              <div className="text-slate-300 font-semibold truncate">
                {currentStaff.assignedTableCount} Tables ({currentStaff.assignedSection})
              </div>
              <div className="text-[9px] text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
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
                    ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white animate-pulse'
                    : 'bg-amber-900/40 hover:bg-amber-800 border border-amber-700/60 text-amber-200'
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
                className="w-full py-2 rounded-xl text-xs font-bold bg-[#881337] hover:bg-rose-700 text-white transition-all shadow-sm flex items-center justify-center gap-1.5"
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
        {/* Top Header Bar */}
        <header className={`px-3 sm:px-5 py-2 sm:py-2.5 border-b flex items-center justify-between shrink-0 shadow-xs z-10 transition-colors ${
          isDark ? 'bg-[#10131d] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          {/* Left Header: Drawer Toggle + Mobile Brand + Desktop Search */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 mr-2 sm:mr-4">
            <button
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className={`p-1.5 sm:p-2 rounded-xl lg:hidden transition shrink-0 ${
                isDark ? 'text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700' : 'text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
              }`}
              title="Toggle Menu Drawer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile Brand Title */}
            <div className="flex sm:hidden items-center gap-1.5 truncate">
              <span className="font-black text-sm text-orange-500 tracking-tight">SpiceHub</span>
              <span className="text-[10px] font-bold text-slate-400">Waiter</span>
            </div>

            {/* Tablet & Desktop Search Bar */}
            <div className="hidden sm:block relative w-full max-w-xs md:max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search table, item, order, guest..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 transition-colors ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-800'
                }`}
              />
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Mobile Search Toggle Icon */}
            <button
              onClick={() => setIsMobileSearchOpen((prev) => !prev)}
              className={`sm:hidden p-2 rounded-xl transition ${
                isMobileSearchOpen
                  ? 'bg-orange-500 text-white'
                  : isDark ? 'bg-slate-800/80 text-slate-300 hover:text-white' : 'bg-slate-100 text-slate-700 hover:text-slate-900'
              }`}
              title="Search"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl transition ${
                isDark ? 'bg-slate-800/80 hover:bg-slate-700 text-amber-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
              title="Toggle Bright / Dark Mode"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Bell with Real-time Badge & Notification Center Trigger */}
            <button
              onClick={() => setIsNotificationCenterOpen(true)}
              className={`relative p-2 rounded-xl transition border ${
                isDark ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700/80' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
              title="Live Real-time Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center animate-pulse shadow-xs">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Wifi Online Status: Compact Dot on Mobile, Pill on Tablet/Desktop */}
            <div className={`flex items-center gap-1.5 text-xs font-bold px-2 sm:px-2.5 py-1.5 rounded-xl border ${
              isDark ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800' : 'text-emerald-700 bg-emerald-50 border-emerald-300'
            }`}>
              <Wifi className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Online</span>
            </div>

            {/* Live Clock (Desktop only) */}
            <div className={`hidden xl:flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-xl border ${
              isDark ? 'text-slate-300 bg-slate-800 border-slate-700' : 'text-slate-700 bg-slate-100 border-slate-200 font-medium'
            }`}>
              <Clock className={`w-3.5 h-3.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
              <span>Tue, 24 Oct 2026 | 02:15 PM</span>
            </div>

            {/* Assigned Tables Allocation Badge (Tablet/Desktop) */}
            <div className={`hidden md:flex items-center gap-2 px-3 py-1 rounded-xl border text-xs font-semibold ${
              isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-800'
            }`}>
              <Grid className="w-3.5 h-3.5 text-orange-500" />
              <span>Zone:</span>
              <strong className={`px-1.5 py-0.5 rounded font-mono ${isDark ? 'text-orange-300 bg-orange-500/20' : 'text-orange-800 bg-orange-100 border border-orange-200'}`}>
                T-{String(currentStaff.assignedTableStart).padStart(2, '0')}-T-{String(currentStaff.assignedTableEnd).padStart(2, '0')}
              </strong>
            </div>

            {/* Waiter Status: Busy (व्यस्त) / On Duty Toggle */}
            <button
              data-testid="status-busy-toggle"
              onClick={handleToggleBusy}
              className={`p-2 sm:px-2.5 sm:py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition ${
                isBusy
                  ? 'bg-amber-500/20 border-amber-500/80 text-amber-300 animate-pulse shadow-md shadow-amber-950/40'
                  : isDark
                  ? 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-300 hover:text-white'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 shadow-2xs'
              }`}
              title={isBusy ? 'Click to set status to On Duty' : 'Click to set status to Busy'}
            >
              <span className={`w-2 h-2 rounded-full ${isBusy ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
              <span className="hidden xs:inline">{isBusy ? 'Busy (व्यस्त)' : 'On Duty'}</span>
            </button>

            {/* Tea Break Button */}
            <button
              onClick={() => {
                if (isOnTeaBreak) {
                  handleResumeDuty();
                } else {
                  setIsTeaBreakModalOpen(true);
                }
              }}
              className={`p-2 sm:px-2.5 sm:py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition ${
                isOnTeaBreak
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 border-amber-400 text-white animate-pulse shadow-md shadow-amber-900/30'
                  : isDark
                  ? 'bg-amber-950/40 hover:bg-amber-900/60 border-amber-800/60 text-amber-300 hover:text-white'
                  : 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-800 hover:text-amber-900 shadow-2xs'
              }`}
              title={isOnTeaBreak ? 'Click to Resume Floor Duty' : 'Take a Tea Break'}
            >
              <Coffee className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {isOnTeaBreak
                  ? `☕ Break (${Math.floor(breakTimerSeconds / 60)}:${String(breakTimerSeconds % 60).padStart(2, '0')})`
                  : 'Tea Break'}
              </span>
            </button>

            {/* End Shift Button */}
            <button
              onClick={() => setIsEndShiftModalOpen(true)}
              className={`p-2 sm:px-2.5 sm:py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition ${
                isDark
                  ? 'bg-rose-950/40 hover:bg-rose-900/60 border-rose-800/60 text-rose-300 hover:text-white'
                  : 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700 hover:text-rose-900 shadow-2xs'
              }`}
              title="End Shift & Handover Protocol"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">End Shift</span>
            </button>
          </div>
        </header>

        {/* Busy Mode Banner with 1-Tap Task Delegation Action */}
        {isBusy && !isOnTeaBreak && (
          <div className="bg-amber-500/15 border-b border-amber-500/40 text-amber-300 px-3 sm:px-5 py-2 flex items-center justify-between text-xs shrink-0 z-20 animate-fadeIn">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
              <div className="truncate">
                <strong>Status: BUSY (व्यस्त):</strong> Handling Tables T-{String(currentStaff.assignedTableStart).padStart(2, '0')}-T-{String(currentStaff.assignedTableEnd).padStart(2, '0')}. Need help with requests or pickups?
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
              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] transition shrink-0 shadow-sm ml-2"
            >
              Delegate to Colleague →
            </button>
          </div>
        )}

        {/* Persistent Tea Break Active Banner with Live Countdown */}
        {isOnTeaBreak && (
          <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-3 sm:px-5 py-2 sm:py-2.5 border-b border-amber-500/60 shadow-md flex items-center justify-between shrink-0 z-20 animate-fadeIn">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-base shrink-0 font-black animate-pulse shadow-inner">
                ☕
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-black text-xs sm:text-sm">Tea Break Active (चाय ब्रेक चालू)</span>
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
                <span>Resume Floor Duty (ड्यूटी पर लौटें)</span>
              </button>
            </div>
          </div>
        )}

        {/* Expandable Mobile Search Row */}
        {isMobileSearchOpen && (
          <div className={`sm:hidden p-2.5 border-b flex items-center gap-2 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
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
                  isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900'
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
            isDark
              ? 'bg-amber-950/30 border-amber-800/60 text-amber-200'
              : 'bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border-orange-200 text-orange-950'
          }`}>
            <div className="flex items-center gap-2 font-bold min-w-0 flex-1 mr-2">
              <Zap className="w-4 h-4 text-orange-400 animate-pulse shrink-0" />
              <span className="truncate">
                Kitchen SLA: <strong className="text-orange-400">{myKitchenPickups[0]?.orderNumber} on {myKitchenPickups[0]?.destination}</strong> ready!
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`font-mono font-black px-2 py-0.5 rounded border ${
                isDark ? 'text-rose-400 bg-slate-900 border-rose-800' : 'text-rose-600 bg-white border-rose-300'
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
                  isDark ? 'bg-orange-900/60 hover:bg-orange-800 text-orange-200' : 'bg-orange-100 hover:bg-orange-200 text-orange-800'
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

        {/* Scrollable Main Workspace: 4 Columns (Responsive layout: stacks on mobile/tablet, 4 columns on desktop) */}
        {activeSidebarItem === 'Dashboard' && (
          <div className="flex-1 flex flex-col overflow-y-auto min-h-0 px-3 sm:px-4 lg:px-5 pb-24 lg:pb-3 gap-3 custom-scrollbar">
            {/* Mobile & Tablet KPI Cards (scrolls with content so it doesn't take 50% of screen height) */}
            <div className="lg:hidden shrink-0">
              {renderKpiCards(true)}
            </div>

            {/* 4 Dashboard Columns: 1-col on mobile (<md), 2-col on tablet (md), 4-col on desktop (lg) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:flex lg:flex-row gap-3 w-full lg:flex-1 lg:min-h-0">
          {/* ======================================================== */}
          {/* COLUMN 1: KITCHEN FOOD PICKUPS (HOT PASS) & MY TABLES    */}
          {/* ======================================================== */}
          <div className="w-full lg:w-80 flex flex-col gap-3 lg:overflow-y-auto pr-0 lg:pr-1 shrink-0">
            {/* Direct Routing Explanatory Notice */}
            <div className={`p-2.5 rounded-xl border text-[10.5px] leading-relaxed space-y-1 transition-colors ${
              isDark ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}>
              <div className="flex items-center gap-1.5 font-bold">
                <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Direct Kitchen Dispatch</span>
              </div>
              <p className="text-[10px] opacity-90">
                Customer QR orders go directly to Kitchen KDS. Food requests arrive here <strong>ONLY when Chef marks READY</strong> at Hot Pass.
              </p>
            </div>

            {/* Box 1: Kitchen Food Pickups (Hot Pass) */}
            <div className={`p-3.5 rounded-2xl border shadow-2xs space-y-3 transition-colors ${
              isDark ? 'bg-[#121520] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-2 text-xs font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <Bell className="w-4 h-4 text-emerald-500" />
                  <span>Kitchen Pickups ({myKitchenPickups.length})</span>
                </div>
                <span className={`text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded ${
                  isDark ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}>
                  Ready to Serve
                </span>
              </div>

              <div className="space-y-2.5">
                {myKitchenPickups.length === 0 ? (
                  <div className={`text-center py-6 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    No pending food pickups for your tables.
                  </div>
                ) : (
                  myKitchenPickups.map((kp) => (
                    <div key={kp.id} className={`p-2.5 rounded-xl border space-y-2 transition-colors ${
                      isDark ? 'bg-[#181c2b] border-emerald-500/30 shadow-xs' : 'bg-emerald-50/70 border-emerald-300 shadow-2xs'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-mono font-black text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>{kp.orderNumber}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            isDark ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-800 border border-orange-200'
                          }`}>{kp.destination}</span>
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-600 text-white shadow-2xs">
                          HOT PASS
                        </span>
                      </div>

                      <div className={`flex items-center justify-between text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>
                        <span className="flex items-center gap-1">
                          <Clock className={`w-3 h-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                          <span>{kp.timeAgo}</span>
                        </span>
                        <span className={`font-bold flex items-center gap-1 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                          <Zap className="w-3 h-3" />
                          <span>60s SLA Active</span>
                        </span>
                      </div>

                      <div className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 ${
                        isDark ? 'bg-slate-900/80 text-slate-300' : 'bg-white text-slate-800 border border-emerald-200 shadow-2xs'
                      }`}>
                        <ChefHat className="w-3 h-3 text-orange-500 shrink-0" />
                        <span className="truncate font-semibold">{kp.station}</span>
                      </div>

                      <div className={`space-y-0.5 text-xs font-medium border-t pt-1.5 ${
                        isDark ? 'text-slate-300 border-slate-700/60' : 'text-slate-800 border-emerald-200/80'
                      }`}>
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
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition flex items-center gap-1 ${
                            isDark
                              ? 'bg-amber-950/40 border-amber-700/60 text-amber-300 hover:bg-amber-900/60'
                              : 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
                          }`}
                          title="Delegate this food pickup to a colleague waiter"
                        >
                          <ArrowRightLeft className="w-3 h-3 text-amber-400" />
                          <span>Delegate</span>
                        </button>
                        <button
                          onClick={() => handleServePickup(kp.id, kp.orderNumber, kp.destination)}
                          className="flex-1 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
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

            {/* Box 2: My Tables Quick Status */}
            <div className={`p-3.5 rounded-2xl border shadow-2xs space-y-2.5 transition-colors ${
              isDark ? 'bg-[#121520] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-2 text-xs font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <Grid className="w-4 h-4 text-orange-500" />
                  <span>My Tables ({myAssignedTables.length})</span>
                </div>
                <button
                  onClick={() => setActiveSidebarItem('My Tables')}
                  className="text-[10px] font-bold text-blue-600 hover:underline"
                >
                  View All →
                </button>
              </div>

              {/* Status breakdown summary */}
              <div className="flex items-center gap-1.5 text-[10px] font-bold">
                <span className={`px-2 py-0.5 rounded-md border ${
                  isDark ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                }`}>
                  🟢 Khali: {myAssignedTables.filter(t => t.status === 'Available').length}
                </span>
                <span className={`px-2 py-0.5 rounded-md border ${
                  isDark ? 'bg-blue-950/40 border-blue-800/60 text-blue-300' : 'bg-blue-50 border-blue-300 text-blue-800'
                }`}>
                  🔴 Occupied: {myAssignedTables.filter(t => t.status === 'Occupied' || t.status === 'My Table').length}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {myAssignedTables.map((tbl) => {
                  const isBusy = tbl.status === 'Occupied' || tbl.status === 'My Table';
                  const isClean = tbl.status === 'Cleaning';
                  const isFree = tbl.status === 'Available';
                  const bill = tableBills[`Table ${tbl.name}`];

                  return (
                    <div
                      key={tbl.id}
                      onClick={() => {
                        setSelectedTableForOrder(`Table ${tbl.name}`);
                        setIsPunchKotOpen(true);
                      }}
                      className={`p-2 rounded-xl border flex items-center justify-between text-[11px] cursor-pointer transition ${
                        isFree
                          ? isDark
                            ? 'bg-emerald-950/20 hover:bg-emerald-900/30 border-emerald-800/40'
                            : 'bg-emerald-50/70 hover:bg-emerald-100/70 border-emerald-200'
                          : isBusy
                          ? isDark
                            ? 'bg-blue-950/20 hover:bg-blue-900/30 border-blue-800/40'
                            : 'bg-blue-50/70 hover:bg-blue-100/70 border-blue-200'
                          : isClean
                          ? isDark
                            ? 'bg-amber-950/20 hover:bg-amber-900/30 border-amber-800/40'
                            : 'bg-amber-50/70 hover:bg-amber-100/70 border-amber-200'
                          : isDark
                          ? 'bg-slate-900/60 hover:bg-slate-800 border-slate-800'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                      }`}
                    >
                      <div className="min-w-0 flex-1 mr-2">
                        <div className="flex items-center gap-2">
                          <span className={`font-black text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            Table {tbl.name}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wide ${
                            isFree
                              ? isDark ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : isBusy
                              ? isDark ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-blue-100 text-blue-800 border border-blue-300'
                              : isDark ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}>
                            {isFree ? '🟢 KHALI (Available)' : isBusy ? '🔴 OCCUPIED' : '🟡 CLEANING'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[10px]">
                          <span className={`font-medium flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            <Users className="w-3 h-3 text-orange-500" />
                            <span>{isFree ? `0 Seated • ${tbl.guests || 4} Chairs` : `${tbl.actualGuests || tbl.guests || 2} Pax Seated`}</span>
                          </span>
                          <span>•</span>
                          <span className={`font-bold ${isFree ? (isDark ? 'text-slate-400' : 'text-slate-500') : (isDark ? 'text-emerald-400' : 'text-emerald-700')}`}>
                            🧾{' '}
                            {isFree
                              ? '₹0'
                              : `₹${bill?.grandTotal || 0} (${bill?.items.length || 0} items)`}
                          </span>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-black shrink-0 ${
                        isFree
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xs'
                          : isBusy
                          ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-2xs'
                          : 'bg-amber-500 text-slate-950'
                      }`}>
                        {isFree ? '+ KOT' : 'Manage'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* COLUMN 2: KITCHEN COOKING STATUS (CHEF PROGRESS)         */}
          {/* ======================================================== */}
          <div className="w-full lg:w-80 flex flex-col gap-3 lg:overflow-y-auto pr-0 lg:pr-1 shrink-0">
            <div className={`p-3.5 rounded-2xl border shadow-2xs space-y-3 h-full transition-colors ${
              isDark ? 'bg-[#121520] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-2 text-xs font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
                  <span>Kitchen Cooking ({myKitchenCooking.length})</span>
                </div>
                <span className={`text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Live Chef KOTs</span>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] font-bold">
                {['All', 'My Tables', 'Dine-in'].map((tab) => {
                  const isActive = activeOrdersFilter === tab || (activeOrdersFilter === 'All' && tab === 'All');
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveOrdersFilter(tab)}
                      className={`px-2 py-1 rounded-lg whitespace-nowrap transition ${
                        isActive
                          ? 'bg-orange-500 text-white'
                          : isDark
                          ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>

              {/* Cards List */}
              <div className="space-y-3">
                {myKitchenCooking.map((kc) => (
                  <div key={kc.id} className={`p-3 rounded-xl border space-y-2 transition-colors ${
                    isDark ? 'bg-[#181c2b] border-slate-700/60' : 'bg-slate-50/80 border-slate-200 shadow-2xs'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-mono font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>{kc.orderNumber}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isDark ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-800 border border-orange-200'
                        }`}>{kc.destination}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                        isDark ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        <Flame className="w-3 h-3 text-amber-500" />
                        <span>Preparing</span>
                      </span>
                    </div>

                    <div className={`flex items-center justify-between text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>
                      <div className="flex items-center gap-1">
                        <Clock className={`w-3 h-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                        <span>{kc.timeAgo}</span>
                      </div>
                      <span className="font-mono font-semibold">{kc.station}</span>
                    </div>

                    <div className={`space-y-0.5 text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                      {kc.items.map((it, idx) => (
                        <div key={idx} className="truncate">{it}</div>
                      ))}
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1 pt-1">
                      <div className={`flex items-center justify-between text-[9px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        <span>Chef Progress</span>
                        <span className={`font-bold ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>{kc.progress}%</span>
                      </div>
                      <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                        <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${kc.progress}%` }} />
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => triggerToast(`Kitchen alerted: Checking status for ${kc.orderNumber}`)}
                        className={`flex-1 py-1 rounded-lg font-bold text-xs transition ${
                          isDark ? 'bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-800/40' : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-200'
                        }`}
                      >
                        Nudge Kitchen
                      </button>
                      <button
                        onClick={() => triggerToast(`Viewing KOT slip for ${kc.orderNumber}`)}
                        className={`px-3 py-1 rounded-lg font-bold text-xs transition border ${
                          isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        View KOT
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* COLUMN 3: TABLE LAYOUT & REQUESTS                        */}
          {/* ======================================================== */}
          <div className="w-full lg:flex-1 lg:min-w-[280px] flex flex-col gap-3 lg:overflow-y-auto pr-0 lg:pr-1 shrink-0">
            {/* Box 1: Table Layout Map (Strictly Hotel Admin Assigned Tables) */}
            <div className={`p-3.5 rounded-2xl border shadow-2xs space-y-3 transition-colors ${
              isDark ? 'bg-[#121520] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-2 text-xs font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <Grid className="w-4 h-4 text-orange-500" />
                  <span>My Assigned Tables ({myAssignedTables.length})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 font-bold border border-orange-500/30">
                    T-{String(currentStaff.assignedTableStart).padStart(2, '0')} - T-{String(currentStaff.assignedTableEnd).padStart(2, '0')}
                  </span>
                  <button
                    onClick={() => setActiveSidebarItem('Other Tables')}
                    className={`text-[10px] font-black px-2 py-0.5 rounded border flex items-center gap-1 transition cursor-pointer ${
                      isDark
                        ? 'bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border-purple-500/40'
                        : 'bg-purple-100 hover:bg-purple-200 text-purple-900 border-purple-300'
                    }`}
                  >
                    <ArrowRightLeft className="w-2.5 h-2.5 text-purple-400" />
                    <span>Other Tables</span>
                  </button>
                </div>
              </div>

              {/* Table Vacancy Filter Tabs (🟢 Khali vs 🔴 Occupied) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px] font-bold">
                {[
                  { id: 'All', label: `All (${myAssignedTables.length})` },
                  { id: 'Available', label: `🟢 Khali (${myAssignedTables.filter(t => t.status === 'Available').length})` },
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
                          ? 'bg-orange-500 text-white shadow-2xs'
                          : isDark
                          ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>

              {/* Strict Visual Grid: ONLY Waiter's Assigned Tables */}
              <div className={`grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-2.5 rounded-2xl border transition-colors ${
                isDark ? 'bg-[#181c2b] border-slate-800' : 'bg-slate-50/80 border-slate-200'
              }`}>
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
                      <button
                        key={t.id}
                        onClick={() => {
                          setSelectedTableForOrder(`Table ${t.name}`);
                          setIsPunchKotOpen(true);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition hover:scale-[1.02] flex flex-col justify-between gap-1 shadow-2xs relative ${
                          isAvailable
                            ? isDark
                              ? 'bg-emerald-950/30 text-emerald-300 border-emerald-700/60 hover:bg-emerald-900/40'
                              : 'bg-emerald-50/90 text-emerald-900 border-emerald-300 hover:bg-emerald-100 font-bold'
                            : isOccupied
                            ? isDark
                              ? 'bg-blue-950/30 text-blue-300 border-blue-700/60 hover:bg-blue-900/40'
                              : 'bg-blue-50/90 text-blue-950 border-blue-300 hover:bg-blue-100 font-bold'
                            : isCleaning
                            ? isDark
                              ? 'bg-amber-950/30 text-amber-300 border-amber-700/60 hover:bg-amber-900/40'
                              : 'bg-amber-50/90 text-amber-950 border-amber-300 hover:bg-amber-100 font-bold'
                            : isDark
                            ? 'bg-purple-950/30 text-purple-300 border-purple-700/60'
                            : 'bg-purple-50 text-purple-900 border-purple-300 font-bold'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-sm font-black leading-tight flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-emerald-500 animate-pulse' : isOccupied ? 'bg-blue-500' : 'bg-amber-500'}`} />
                            T-{t.name}
                          </span>
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded border ${
                            isAvailable
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                              : isOccupied
                              ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                              : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                          }`}>
                            {isAvailable ? '🟢 Khali' : isOccupied ? '🔴 Busy' : '🟡 Clean'}
                          </span>
                        </div>

                        {/* Seated Guests Count */}
                        <div className="flex items-center gap-1 text-[10px] font-semibold opacity-90 mt-0.5">
                          <Users className="w-3 h-3 text-orange-500 shrink-0" />
                          <span>
                            {isAvailable
                              ? `0 Seated • ${t.guests || 4} Chairs`
                              : `${t.actualGuests || t.guests || 2} Pax Seated`}
                          </span>
                        </div>

                        {/* Order Running Amount */}
                        <div className={`mt-1 pt-1 border-t text-[10.5px] font-black flex items-center justify-between w-full ${
                          isDark ? 'border-slate-700/40' : 'border-slate-200'
                        }`}>
                          <span className="text-[9px] font-semibold opacity-75">Order:</span>
                          <span className={isAvailable ? (isDark ? 'text-slate-400' : 'text-slate-500') : (isDark ? 'text-emerald-400' : 'text-emerald-700 font-extrabold')}>
                            {isAvailable ? '₹0 (Khali)' : `₹${bill?.grandTotal || 0}`}
                          </span>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Live Guest Assistance Calls */}
            <div className={`p-3.5 rounded-2xl border shadow-2xs space-y-2.5 transition-colors ${
              isDark ? 'bg-[#121520] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-1.5 text-xs font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <Users className="w-3.5 h-3.5 text-purple-600" />
                  <span>Guest Assistance Calls ({myGuestRequests.length})</span>
                </div>
                <button
                  onClick={() => setActiveSidebarItem('Guest Requests')}
                  className="text-[10px] font-bold text-blue-600 hover:underline"
                >
                  View All
                </button>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5 custom-scrollbar">
                {myGuestRequests.length === 0 ? (
                  <div className={`text-center py-4 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    No active calls for your tables.
                  </div>
                ) : (
                  myGuestRequests.slice(0, 5).map((gr) => (
                    <div key={gr.id} className={`p-2 rounded-xl flex items-center justify-between text-xs transition-colors ${
                      isDark ? 'bg-[#181c2b] text-slate-100' : 'bg-purple-50/70 border border-purple-200 text-slate-900'
                    }`}>
                      <div className="min-w-0 flex-1 mr-2">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{gr.table}</span>
                          <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{gr.timeAgo}</span>
                        </div>
                        <div className={`font-semibold text-[11px] truncate ${isDark ? 'text-slate-300' : 'text-purple-950'}`}>{gr.request}</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleOpenDelegateModal({
                            type: 'REQUEST',
                            id: gr.id,
                            tableNumber: gr.table,
                            title: `${gr.request} at ${gr.table}`,
                            details: `Guest at ${gr.table} requested ${gr.request}`,
                          })}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition flex items-center gap-1 ${
                            isDark
                              ? 'bg-amber-950/40 border-amber-700/60 text-amber-300 hover:bg-amber-900/60'
                              : 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
                          }`}
                          title="Transfer this request to colleague waiter"
                        >
                          <ArrowRightLeft className="w-2.5 h-2.5 text-amber-400" />
                          <span>Transfer</span>
                        </button>
                        <button
                          onClick={() => handleCompleteRequest(gr.id, gr.table, gr.request)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-2xs"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* COLUMN 4: QUICK ACTIONS & RECENT COMPLETED               */}
          {/* ======================================================== */}
          <div className="w-full lg:w-64 flex flex-col gap-3 lg:overflow-y-auto pl-0 lg:pl-1 shrink-0">
            {/* Box 1: Quick Actions */}
            <div className={`p-3.5 rounded-2xl border shadow-2xs space-y-2.5 transition-colors ${
              isDark ? 'bg-[#121520] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <h3 className={`font-black text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>Quick Actions</h3>

              <div className="space-y-1.5">
                <button
                  onClick={() => {
                    setCrossTableCourtesyNote(undefined);
                    setIsPunchKotOpen(true);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-900/30 flex items-center justify-center gap-2 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ New Order</span>
                </button>

                {/* Cross-Table Guest Assist for Non-Tech / Verbal Calls */}
                <button
                  onClick={() => setIsCrossTableAssistOpen(true)}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs shadow-md shadow-orange-950/40 flex items-center justify-center gap-2 transition"
                  title="Assist non-tech or walk-in guests at another table"
                >
                  <Users className="w-4 h-4 text-amber-200" />
                  <span>🤝 Cross-Table Guest Assist</span>
                </button>

                {[
                  { label: 'Live Orders & KOT', icon: Flame, action: () => setActiveSidebarItem('Live Orders & KOT') },
                  { label: 'Table Billing & Settle', icon: CreditCard, action: () => setActiveSidebarItem('Table Billing') },
                  { label: 'Call Kitchen Chef', icon: ChefHat, action: () => setActiveSidebarItem('Call Kitchen') },
                  { label: 'Guest Requests', icon: Users, action: () => setActiveSidebarItem('Guest Requests') },
                  { label: 'Menu & Stock 86', icon: BookOpen, action: () => setActiveSidebarItem('Menu & Stock') },
                  { label: 'Table Transfer', icon: ArrowRightLeft, action: () => setActiveSidebarItem('Table Transfer') },
                  { label: 'Split Bill', icon: Scissors, action: () => setActiveSidebarItem('Split Bill') },
                ].map((act) => {
                  const Icon = act.icon;
                  return (
                    <button
                      key={act.label}
                      onClick={act.action}
                      className={`w-full p-2 rounded-xl border font-bold text-xs flex items-center gap-2 transition text-left ${
                        isDark
                          ? 'bg-[#181c2b] border-slate-700/60 hover:bg-slate-800 text-slate-200'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800 shadow-2xs'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 text-blue-500" />
                      <span>{act.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Box 2: Recent Completed Orders */}
            <div className={`p-3 rounded-2xl border shadow-2xs space-y-2 transition-colors ${
              isDark ? 'bg-[#121520] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className="flex items-center justify-between">
                <h3 className={`font-black text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>Recent Completed</h3>
                <button
                  onClick={() => setActiveSidebarItem('Order History')}
                  className="text-[10px] font-bold text-blue-600 hover:underline"
                >
                  View All
                </button>
              </div>

              <div className="space-y-1.5 text-xs">
                {recentOrders.length === 0 ? (
                  <div className={`p-3 rounded-lg text-[10px] text-center ${
                    isDark ? 'bg-[#181c2b] text-slate-400' : 'bg-slate-50 border border-slate-200/60 text-slate-500'
                  }`}>
                    No served orders yet. Completed orders appear here as the kitchen serves them.
                  </div>
                ) : (
                  recentOrders.map((rc) => (
                    <div key={rc.id} className={`p-1.5 rounded-lg flex items-center justify-between text-[11px] transition-colors ${
                      isDark ? 'bg-[#181c2b]' : 'bg-slate-50 border border-slate-200/60'
                    }`}>
                      <div>
                        <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{rc.orderNumber}</span>
                        <span className={`${isDark ? 'text-slate-400' : 'text-slate-600'} text-[10px] ml-1 font-medium`}>{rc.location}</span>
                      </div>
                      <div className="text-right">
                        <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          ₹{Number(rc.total || 0).toLocaleString('en-IN')}
                        </span>
                        <div className={`text-[9px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {new Date(rc.updatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
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
          isDark={isDark}
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
          isDark={isDark}
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
          isDark={isDark}
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
          isDark={isDark}
          triggerToast={triggerToast}
        />
      )}

      {activeSidebarItem === 'Table Transfer' && (
        <TableTransferView
          isDark={isDark}
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
          isDark={isDark}
          requests={myGuestRequests}
          onCompleteRequest={handleCompleteRequest}
          triggerToast={triggerToast}
        />
      )}

      {(activeSidebarItem === 'Menu & Stock' || activeSidebarItem === 'Menu Items') && (
        <MenuItemsView
          isDark={isDark}
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
          isDark={isDark}
          onOpenUpiModal={(tbl, amt) => {
            void handleOpenDynamicUpiModal(tbl, amt).catch(() => undefined);
          }}
          triggerToast={triggerToast}
        />
      )}

      {activeSidebarItem === 'Table Billing' && (
        <TableBillingView
          isDark={isDark}
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
          isDark={isDark}
          triggerToast={triggerToast}
        />
      )}

      {activeSidebarItem === 'Call Kitchen' && (
        <CallKitchenView
          isDark={isDark}
          assignedTables={myAssignedTables}
          triggerToast={triggerToast}
          onSendKitchenBuzzer={onSendKitchenBuzzer}
          kitchenBuzzers={kitchenBuzzers}
        />
      )}

      {activeSidebarItem === 'Notifications' && (
        <NotificationsView
          isDark={isDark}
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
          isDark={isDark}
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
          isDark={isDark}
          onToggleTheme={toggleTheme}
          triggerToast={triggerToast}
        />
      )}

      {activeSidebarItem === 'Help & Support' && (
        <HelpAndSupportView
          isDark={isDark}
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
          isDark={isDark}
          onOpenOtherTablesPage={() => {
            setIsPunchKotOpen(false);
            setActiveSidebarItem('Other Tables');
          }}
          onFireKot={async (targetTable, items, instructions) => {
            const tableToUse = targetTable || selectedTableForOrder;
            if (onFireKot) {
              await onFireKot(tableToUse, items, instructions);
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
            const msg = isAssigned
              ? `🔥 KOT fired for ${tableToUse}! Direct route to Kitchen KDS.`
              : `🤝 Courtesy KOT fired for ${tableToUse}! Sent to Kitchen KDS & assigned waiter notified.`;
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
        isDark={isDark}
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
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
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
                  <input
                    type="number"
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
        isDark={isDark}
        currentStaffName={currentStaff.name}
        assignedTablesRange={`T-${String(currentStaff.assignedTableStart).padStart(2, '0')}-T-${String(currentStaff.assignedTableEnd).padStart(2, '0')}`}
      />

      {/* End Shift & Handover Modal */}
      <EndShiftHandoverModal
        isOpen={isEndShiftModalOpen}
        onClose={() => setIsEndShiftModalOpen(false)}
        onConfirmEndShift={handleConfirmEndShift}
        isDark={isDark}
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
        isDark={isDark}
        onSavePax={handleSavePax}
      />

      {/* Delegate Task Handover Modal (When Waiter is Busy) */}
      <DelegateTaskModal
        isOpen={isDelegateModalOpen}
        onClose={() => setIsDelegateModalOpen(false)}
        task={taskToDelegate}
        currentStaff={currentStaff}
        onConfirmDelegation={handleConfirmDelegation}
        isDark={isDark}
      />

      {/* Mobile Bottom Navigation Bar (Thumb-friendly, hidden on lg+ screens) */}
      <nav aria-label="Mobile Navigation" className={`fixed bottom-0 inset-x-0 z-30 lg:hidden border-t px-2 py-1.5 flex items-center justify-around shadow-lg transition-colors ${
        isDark
          ? 'bg-[#10131d]/95 backdrop-blur-md border-slate-800 text-slate-400'
          : 'bg-white/95 backdrop-blur-md border-slate-200 text-slate-600'
      }`}>
        <button
          onClick={() => setActiveSidebarItem('Dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
            activeSidebarItem === 'Dashboard'
              ? 'text-orange-500 font-bold'
              : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Dashboard</span>
        </button>

        <button
          onClick={() => setActiveSidebarItem('My Tables')}
          className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
            activeSidebarItem === 'My Tables'
              ? 'text-orange-500 font-bold'
              : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Grid className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Tables</span>
          {tablesList.filter(t => t.status === 'My Table').length > 0 && (
            <span className="absolute top-0 right-1 px-1 min-w-3.5 h-3.5 rounded-full bg-orange-500 text-white text-[8px] font-bold flex items-center justify-center">
              {tablesList.filter(t => t.status === 'My Table').length}
            </span>
          )}
        </button>

        {/* Quick Order Center Action Button */}
        <button
          onClick={() => setIsPunchKotOpen(true)}
          className="-mt-5 flex flex-col items-center justify-center group"
          title="Take New Order (Quick KOT)"
        >
          <div className="w-12 h-12 rounded-full bg-linear-to-tr from-orange-600 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/40 ring-4 ring-white dark:ring-[#10131d] group-active:scale-95 transition-transform">
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="text-[10px] font-black mt-0.5 text-orange-600 dark:text-orange-400 tracking-tight">
            + Order
          </span>
        </button>

        <button
          onClick={() => setActiveSidebarItem('Live Orders & KOT')}
          className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
            activeSidebarItem === 'Live Orders & KOT'
              ? 'text-orange-500 font-bold'
              : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Flame className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Live KOT</span>
          {(myKitchenPickups.length + myKitchenCooking.length) > 0 && (
            <span className="absolute top-0 right-1 px-1 min-w-3.5 h-3.5 rounded-full bg-red-600 text-white text-[8px] font-bold flex items-center justify-center">
              {myKitchenPickups.length + myKitchenCooking.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
            isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">More</span>
          {unreadCount > 0 ? (
            <span className="absolute top-0 right-1 px-1 min-w-3.5 h-3.5 rounded-full bg-red-600 text-white text-[8px] font-bold flex items-center justify-center animate-pulse">
              {unreadCount}
            </span>
          ) : myGuestRequests.length > 0 ? (
            <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
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
        isDark={isDark}
        isMuted={isMuted}
        onToggleMute={toggleMute}
      />
    </div>
  );
};
