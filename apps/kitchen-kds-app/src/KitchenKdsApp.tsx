import React, { useState, useEffect, useCallback } from 'react';
import { getPortalUrl } from './config/env';
import {
  Flame,
  ChefHat,
  Clock,
  Bell,
  AlertTriangle,
  BookOpen,
  Calendar,
  Users,
  TrendingUp,
  Settings,
  ChevronDown,
  Search,
  Plus,
  Play,
  Pause,
  CheckCircle2,
  Check,
  Coffee,
  UtensilsCrossed,
  Filter,
  LogOut,
  Layers,
  Sparkles,
  ExternalLink,
  X,
  Volume2,
  VolumeX,
  Menu,
  FileText,
  Sun,
  Moon,
  Radio,
  User,
  Camera,
  Upload,
} from 'lucide-react';
import { KdsStore, LanguageToggle } from '@spicehub/ui';
import { Kds86ManagerDrawer, Kds86DishItem } from './components/Kds86ManagerDrawer';
import { KitchenViewsHub } from './components/KitchenViewsHub';


function readStaffIdentity(): { name: string; role: string; initials: string } {
  if (typeof window === 'undefined') {
    return { name: 'Kitchen Staff', role: 'KDS Terminal', initials: 'KS' };
  }
  try {
    const parsed = JSON.parse(window.localStorage.getItem('spicehub_auth_user') || 'null');
    const name = String(parsed?.name || 'Kitchen Staff');
    const role = String(parsed?.role || 'KDS Terminal').replace(/_/g, ' ');
    const initials = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) => part[0]?.toUpperCase())
      .join('') || 'KS';
    return { name, role, initials };
  } catch {
    return { name: 'Kitchen Staff', role: 'KDS Terminal', initials: 'KS' };
  }
}

export interface LowStockAlertItem {
  id: string;
  ingredientName: string;
  remainingQuantity: number;
  unit: string;
  triggeredByOrder?: string;
  timestamp?: string;
}

export interface KitchenKdsAppProps {
  store: KdsStore;
  dishes86?: Kds86DishItem[];
  lowStockAlerts?: LowStockAlertItem[];
  onDismissStockAlert?: (id: string) => void;
  onStartPreparing?: (orderId: string, orderDetails?: any) => Promise<void> | void;
  onMarkReady?: (orderId: string, orderDetails?: any) => Promise<void> | void;
  onMarkServed?: (orderId: string, orderDetails?: any) => Promise<void> | void;
  onToggleItemStatus?: (orderId: string, itemId: string) => Promise<void> | void;
  onRefresh?: () => Promise<void> | void;
  onToggleItem86?: (itemId: string, isAvailable: boolean, reason?: string) => Promise<void> | void;
  onBatchToggle86?: (itemIds: string[], isAvailable: boolean, reason?: string) => Promise<void> | void;
  kitchenBuzzers?: any[];
  onAcknowledgeBuzzer?: (id: string) => Promise<void> | void;
  waiterEnabled?: boolean;
}

interface KdsItemDisplay {
  id: string;
  orderNumber: string;
  destination: string;
  orderType: 'Dine-in' | 'Room Service' | 'Takeaway' | 'Online';
  items: { name: string; qty: number; image?: string; isDone?: boolean; stationName?: string }[];
  note?: string;
  timeAgo: string;
  status: 'NEW' | 'PREPARING' | 'READY' | 'COMPLETED';
  chef?: string;
  prepProgress?: number;
  isPaused?: boolean;
  timerMinutes?: number;
  completedAt?: string;
}

const INITIAL_NEW_ORDERS: KdsItemDisplay[] = [];
const INITIAL_PREPARING_ORDERS: KdsItemDisplay[] = [];
const INITIAL_READY_ORDERS: KdsItemDisplay[] = [];
const INITIAL_COMPLETED_ORDERS: KdsItemDisplay[] = [];

export const KitchenKdsApp: React.FC<KitchenKdsAppProps> = ({
  store,
  dishes86 = [],
  lowStockAlerts = [],
  onDismissStockAlert,
  onStartPreparing,
  onMarkReady,
  onMarkServed,
  onToggleItem86,
  onBatchToggle86,
  kitchenBuzzers = [],
  onAcknowledgeBuzzer,
  waiterEnabled = true,
}) => {
  const [activeSidebarItem, setActiveSidebarItem] = useState(() => {
    if (typeof window !== 'undefined') {
      const raw = new URLSearchParams(window.location.search).get('tab');
      if (raw) return decodeURIComponent(raw.replace(/\+/g, ' '));
    }
    return 'Live Orders';
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1200;
    }
    return false;
  });
  const [sortByTime, setSortByTime] = useState<'OLDEST_FIRST' | 'NEWEST_FIRST'>('OLDEST_FIRST');
  const [groupByTable, setGroupByTable] = useState(false);

  // Allow tab switching via custom events for comprehensive testing
  useEffect(() => {
    const handleSetTab = (e: any) => {
      if (e.detail && typeof e.detail === 'string') {
        setActiveSidebarItem(e.detail);
      }
    };
    window.addEventListener('kds:set_tab', handleSetTab);
    return () => window.removeEventListener('kds:set_tab', handleSetTab);
  }, []);
  const [selectedOutlet, setSelectedOutlet] = useState('All Outlets');
  const [isOutletDropdownOpen, setIsOutletDropdownOpen] = useState(false);
  const [selectedStation, setSelectedStation] = useState<string>('Main Kitchen');
  const [selectedViewMode, setSelectedViewMode] = useState<'Kitchen View' | 'Expediter View' | 'Pass View'>('Kitchen View');
  const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);
  const [kdsToast, setKdsToast] = useState<string | null>(null);
  const [activeTypeFilter, setActiveTypeFilter] = useState<'All' | 'Dine-in' | 'Takeaway' | 'Room Service' | 'Online'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isIntercomModalOpen, setIsIntercomModalOpen] = useState(false);
  const [clock, setClock] = useState(() => new Date());

  const playDingChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.65);
      setTimeout(() => ctx.close().catch(() => {}), 700);
    } catch {}
  };

  const triggerKdsToast = (msg: string) => {
    setKdsToast(msg);
    setTimeout(() => setKdsToast(null), 4000);
  };

  // Staff Profile & Photo State
  const [profileOpen, setProfileOpen] = useState(false);
  const chefUser = (() => {
    if (typeof window === 'undefined') return { name: 'Head Chef', email: '', role: 'Kitchen Chef', avatar: '' };
    try {
      const raw = localStorage.getItem('spicehub_auth_user');
      if (!raw) return { name: 'Head Chef', email: '', role: 'Kitchen Chef', avatar: '' };
      const parsed = JSON.parse(raw);
      return {
        id: parsed?.id || parsed?._id || '',
        name: parsed?.name || parsed?.email || 'Head Chef',
        email: parsed?.email || '',
        role: parsed?.role || 'Kitchen Chef',
        avatar: parsed?.avatar || parsed?.photo || '',
      };
    } catch {
      return { name: 'Head Chef', email: '', role: 'Kitchen Chef', avatar: '' };
    }
  })();
  const [chefAvatar, setChefAvatar] = useState(chefUser.avatar);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        triggerKdsToast('⚠️ Image exceeds 10MB! Please choose a smaller photo.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const rawUrl = event.target?.result as string;
        if (!rawUrl) return;
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 400;
          canvas.height = 400;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const minSide = Math.min(img.width, img.height);
            const sx = (img.width - minSide) / 2;
            const sy = (img.height - minSide) / 2;
            ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, 400, 400);
            const compressed = canvas.toDataURL('image/jpeg', 0.82);
            setChefAvatar(compressed);
            try {
              const raw = localStorage.getItem('spicehub_auth_user');
              if (raw) {
                const u = JSON.parse(raw);
                u.avatar = compressed;
                localStorage.setItem('spicehub_auth_user', JSON.stringify(u));
              }
            } catch (_) {}
            triggerKdsToast('✓ Real photo saved & compressed to 400x400 JPEG (~40KB)!');
          }
        };
        img.src = rawUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('spicehub_token');
    localStorage.removeItem('token');
    localStorage.removeItem('spicehub_auth_user');
    window.location.href = '/login';
  };
  const unackBuzzers = kitchenBuzzers.filter((b: any) => b.status !== 'ACKNOWLEDGED');

  // Theme State (Dark / Bright Light Mode)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('spicehub_kds_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'dark';
  });

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('spicehub_kds_theme', next);
    }
  };

  const isDark = theme === 'dark';

  const getKdsCompletedOrdersStorage = (): KdsItemDisplay[] => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('spicehub_kds_completed_orders');
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  };

  const getServedIdsStorage = (): Set<string> => {
    const set = new Set<string>();
    if (typeof window === 'undefined') return set;
    try {
      const kdsRaw = localStorage.getItem('spicehub_kds_completed_orders');
      if (kdsRaw) {
        const parsed: KdsItemDisplay[] = JSON.parse(kdsRaw);
        parsed.forEach((o) => {
          if (o.id) set.add(o.id);
          if (o.orderNumber) set.add(o.orderNumber);
        });
      }
      const waiterRaw = localStorage.getItem('spicehub_waiter_served_orders');
      if (waiterRaw) {
        const parsed: any[] = JSON.parse(waiterRaw);
        parsed.forEach((o) => {
          if (o.orderId) set.add(o.orderId);
          if (o.orderNumber) set.add(o.orderNumber);
        });
      }
    } catch (_) {}
    return set;
  };

  // Orders State by Stage
  const [newOrders, setNewOrders] = useState<KdsItemDisplay[]>(INITIAL_NEW_ORDERS);
  const [preparingOrders, setPreparingOrders] = useState<KdsItemDisplay[]>(INITIAL_PREPARING_ORDERS);
  const [readyOrders, setReadyOrders] = useState<KdsItemDisplay[]>(() => {
    const servedIds = getServedIdsStorage();
    return INITIAL_READY_ORDERS.filter((o) => !servedIds.has(o.id) && !servedIds.has(o.orderNumber));
  });
  const [completedOrders, setCompletedOrders] = useState<KdsItemDisplay[]>(() => {
    const saved = getKdsCompletedOrdersStorage();
    const existing = new Set(saved.map((o) => o.id));
    return [...saved, ...INITIAL_COMPLETED_ORDERS.filter((o) => !existing.has(o.id))];
  });

  // 86 Out of Stock Drawer
  const [is86DrawerOpen, setIs86DrawerOpen] = useState(false);
  const [isManualOrderModalOpen, setIsManualOrderModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [manualTable, setManualTable] = useState('Table 9');
  const [manualDish, setManualDish] = useState('Paneer Tikka');
  const [mobileKdsTab, setMobileKdsTab] = useState<'all' | 'new' | 'preparing' | 'ready'>('all');

  // Item completion strike-through toggle by chef
  const handleToggleItemDone = (orderId: string, itemIdx: number) => {
    const updateList = (prev: KdsItemDisplay[]) =>
      prev.map((ord) => {
        if (ord.id !== orderId) return ord;
        const newItems = ord.items.map((it, idx) => (idx === itemIdx ? { ...it, isDone: !it.isDone } : it));
        return { ...ord, items: newItems };
      });

    setNewOrders(updateList);
    setPreparingOrders(updateList);
    setReadyOrders(updateList);
    setCompletedOrders(updateList);
  };

  // Sync real-time store orders if added via sockets or polled
  useEffect(() => {
    const syncOrders = () => {
      const incoming = store.getOrders();
      if (!incoming || incoming.length === 0) return;

      incoming.forEach((io) => {
        const mapped: KdsItemDisplay = {
          id: io.id,
          orderNumber: io.orderNumber,
          destination: io.roomNumber ? `Room ${io.roomNumber}` : io.tableNumber || 'Table 4',
          orderType: io.orderType === 'ROOM_SERVICE' ? 'Room Service' : 'Dine-in',
          timeAgo: 'Just now',
          status: io.orderStatus === 'PREPARING' ? 'PREPARING' : io.orderStatus === 'READY' ? 'READY' : io.orderStatus === 'SERVED' ? 'COMPLETED' : 'NEW',
          items: io.items.map((it) => ({
            name: it.name,
            qty: it.quantity,
            stationName: it.kitchenStationName || it.kitchenStationId || 'Kitchen Pass',
          })),
          note: io.cookingInstructions,
          timerMinutes: io.orderStatus === 'PREPARING' ? 12 : undefined,
          prepProgress: io.orderStatus === 'PREPARING' ? 50 : undefined,
        };

        const targetStatus = mapped.status;

        setNewOrders((prev) => {
          const filtered = prev.filter((o) => o.id !== mapped.id && o.orderNumber !== mapped.orderNumber);
          return targetStatus === 'NEW' ? [mapped, ...filtered] : filtered;
        });

        setPreparingOrders((prev) => {
          const filtered = prev.filter((o) => o.id !== mapped.id && o.orderNumber !== mapped.orderNumber);
          return targetStatus === 'PREPARING' ? [mapped, ...filtered] : filtered;
        });

        setReadyOrders((prev) => {
          const filtered = prev.filter((o) => o.id !== mapped.id && o.orderNumber !== mapped.orderNumber);
          return targetStatus === 'READY' ? [mapped, ...filtered] : filtered;
        });

        setCompletedOrders((prev) => {
          const filtered = prev.filter((o) => o.id !== mapped.id && o.orderNumber !== mapped.orderNumber);
          return targetStatus === 'COMPLETED' ? [mapped, ...filtered] : filtered;
        });
      });
    };

    // Run on initial mount
    syncOrders();

    // Subscribe to store updates
    const unsubscribe = store.subscribe(syncOrders);
    return () => unsubscribe();
  }, [store]);

  // Actions
  const handleAcceptOrder = async (order: KdsItemDisplay) => {
    setNewOrders((prev) => prev.filter((o) => o.id !== order.id));
    setPreparingOrders((prev) => [
      {
        ...order,
        status: 'PREPARING',
        prepProgress: 20,
        chef: 'Chef: Suresh',
        timerMinutes: 15,
      },
      ...prev.filter((o) => o.id !== order.id),
    ]);
    if (onStartPreparing) await onStartPreparing(order.id);
  };

  const handleHoldOrder = (id: string) => {
    alert(`Order #${id} placed on hold by Chef`);
  };

  const handleTogglePause = (id: string) => {
    setPreparingOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, isPaused: !o.isPaused } : o))
    );
  };

  const handleMarkReady = async (order: KdsItemDisplay) => {
    playDingChime();
    triggerKdsToast(`🔔 Order ${order.orderNumber} marked READY! Audio chime played.`);
    setPreparingOrders((prev) => prev.filter((o) => o.id !== order.id));
    setReadyOrders((prev) => [
      {
        ...order,
        status: 'READY',
      },
      ...prev.filter((o) => o.id !== order.id),
    ]);
    if (onMarkReady) {
      await onMarkReady(order.id, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        destination: order.destination,
        tableNumber: order.destination.startsWith('Room') ? undefined : order.destination,
        roomNumber: order.destination.startsWith('Room') ? order.destination.replace(/[^0-9]/g, '') : undefined,
        items: order.items,
        orderType: order.orderType,
      });
    }
  };

  const handleMarkServed = async (order: KdsItemDisplay) => {
    const completedItem: KdsItemDisplay = {
      ...order,
      status: 'COMPLETED',
      completedAt: `Completed at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    };
    setReadyOrders((prev) => prev.filter((o) => o.id !== order.id && o.orderNumber !== order.orderNumber));
    setCompletedOrders((prev) => [
      completedItem,
      ...prev.filter((o) => o.id !== order.id && o.orderNumber !== order.orderNumber),
    ]);

    if (typeof window !== 'undefined') {
      try {
        const saved = getKdsCompletedOrdersStorage();
        if (!saved.some((s) => s.id === order.id || s.orderNumber === order.orderNumber)) {
          saved.unshift(completedItem);
          localStorage.setItem('spicehub_kds_completed_orders', JSON.stringify(saved));
        }

        const waiterRaw = localStorage.getItem('spicehub_waiter_served_orders');
        const waiterList = waiterRaw ? JSON.parse(waiterRaw) : [];
        if (!waiterList.some((w: any) => w.orderId === order.id || w.orderNumber === order.orderNumber)) {
          waiterList.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            table: order.destination,
            servedAt: new Date().toISOString(),
          });
          localStorage.setItem('spicehub_waiter_served_orders', JSON.stringify(waiterList));
        }

        const cleanNum = order.destination.replace(/[^0-9]/g, '');
        if (cleanNum) {
          const mapRaw = localStorage.getItem('spicehub_tables_served_map');
          const map = mapRaw ? JSON.parse(mapRaw) : {};
          map[cleanNum] = 'SERVED';
          localStorage.setItem('spicehub_tables_served_map', JSON.stringify(map));
        }
      } catch (_) {}
    }

    if (onMarkServed) {
      await onMarkServed(order.id, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        destination: order.destination,
        tableNumber: order.destination.startsWith('Room') ? undefined : order.destination,
        roomNumber: order.destination.startsWith('Room') ? order.destination.replace(/[^0-9]/g, '') : undefined,
      });
    }
  };

  const handleCreateManualOrder = () => {
    if (!manualDish.trim()) return;
    const newOrd: KdsItemDisplay = {
      id: `ord-man-${Date.now()}`,
      orderNumber: `#M${Math.floor(1000 + Math.random() * 9000)}`,
      destination: `${manualTable} (Manual)`,
      orderType: 'Dine-in',
      timeAgo: 'Just now',
      status: 'NEW',
      items: [{ name: manualDish, qty: 1 }],
    };
    setNewOrders((prev) => [newOrd, ...prev]);
    setIsManualOrderModalOpen(false);
  };

  // Filter helper
  const filterList = (list: KdsItemDisplay[]) => {
    return list.filter((o) => {
      const matchType = activeTypeFilter === 'All' || o.orderType === activeTypeFilter;
      const matchSearch =
        o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.items.some((it) => it.name.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchType && matchSearch;
    });
  };

  const filteredNew = filterList(newOrders);
  const filteredPreparing = filterList(preparingOrders);
  const filteredReady = filterList(readyOrders);
  const filteredCompleted = filterList(completedOrders);
  const allActiveOrders = [...newOrders, ...preparingOrders, ...readyOrders];
  const liveOrderCount = allActiveOrders.length;
  const activeTypeCount = (label: string) =>
    label === 'All'
      ? allActiveOrders.length
      : allActiveOrders.filter((order) => order.orderType === label).length;
  const delayedOrderCount = allActiveOrders.filter(
    (order) => Number(order.timerMinutes || 0) >= 15
  ).length;
  const averagePrepMinutes =
    completedOrders.length > 0
      ? Math.round(
          completedOrders.reduce(
            (sum, order) => sum + Number(order.timerMinutes || 0),
            0
          ) / completedOrders.length
        )
      : 0;
  const kitchenLoadPct = Math.min(100, liveOrderCount * 10);
  const popularItems = (() => {
    const counts = new Map<string, number>();
    [...allActiveOrders, ...completedOrders].forEach((order) => {
      order.items.forEach((item) => {
        counts.set(item.name, (counts.get(item.name) || 0) + Number(item.qty || 0));
      });
    });
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  })();
  const configuredStations = store.getStations();
  const knownStationIdentifiers = new Set(
    configuredStations.flatMap((station) => [station.id, station.stationName])
  );
  const stationWidgets = configuredStations.map((station) => {
    const tickets = allActiveOrders.filter((order) =>
      order.items.some(
        (item) =>
          item.stationName === station.stationName ||
          item.stationName === station.id ||
          (!knownStationIdentifiers.has(item.stationName || '') &&
            station.id === configuredStations[0]?.id)
      )
    );
    return {
      name: station.stationName,
      count: tickets.length,
      pct: Math.min(100, tickets.length * 20),
    };
  });
  const liveAlerts = [
    ...lowStockAlerts.slice(0, 2).map((alert) => ({
      title: 'Low Stock Alert',
      desc: `${alert.ingredientName} — ${alert.remainingQuantity} ${alert.unit} left`,
      time: alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Live',
      icon: AlertTriangle,
      color: 'text-red-500',
    })),
    ...allActiveOrders
      .filter((order) => Number(order.timerMinutes || 0) >= 15)
      .slice(0, 2)
      .map((order) => ({
        title: 'Preparation Delay',
        desc: `${order.orderNumber} has been waiting ${order.timeAgo}`,
        time: 'Delayed',
        icon: Clock,
        color: 'text-amber-500',
      })),
    ...(waiterEnabled && unackBuzzers.length > 0
      ? [
          {
            title: 'Waiter Call',
            desc: `${unackBuzzers[0].station || 'Floor'} — ${unackBuzzers[0].table || 'table'}`,
            time: 'Live',
            icon: Radio,
            color: 'text-slate-700 dark:text-slate-300',
          },
        ]
      : []),
  ];

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className={`flex h-screen w-full max-w-full overflow-x-hidden font-sans antialiased touch-pan-y transition-colors duration-200 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'
    }`}>
      {/* Toast Notification */}
      {kdsToast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{kdsToast}</span>
        </div>
      )}

      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ======================================================== */}
      {/* LEFT SIDEBAR: DARK KITCHEN KDS SHELL                     */}
      {/* ======================================================== */}
      <aside className={`${
        isMobileMenuOpen ? 'flex fixed inset-y-0 left-0 z-50 w-64 shadow-sm dark:shadow-none' : 'hidden md:flex'
      } ${
        isSidebarCollapsed ? 'md:w-16' : 'md:w-60'
      } bg-slate-900 text-slate-300 flex-col justify-between shrink-0 border-r border-slate-800/80 shadow-sm dark:shadow-none z-20 transition-all duration-200`}>
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo & Header */}
          <div className="p-4 flex items-center gap-3 border-b border-slate-800/80">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center shadow-xs shrink-0 border border-slate-700">
              <ChefHat className="w-5 h-5" />
            </div>
            {(!isSidebarCollapsed || isMobileMenuOpen) && (
              <div className="truncate">
                <div className="font-black text-lg text-white tracking-tight flex items-center gap-1.5">
                  SpiceHub
                </div>
                <p className="text-[11px] text-red-500 font-bold uppercase tracking-wider">Kitchen KDS</p>
              </div>
            )}
          </div>

          {/* Nav Items List */}
          <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1 text-xs font-semibold custom-scrollbar">
            {[
              { label: 'Live Orders', icon: Flame, badge: liveOrderCount > 0 ? String(liveOrderCount) : undefined },
              { label: 'Order Queue', icon: Layers },
              { label: 'Kitchen Stations', icon: UtensilsCrossed },
              { label: 'Menu Items', icon: BookOpen },
              { label: 'Preparation Time', icon: Clock },
              { label: 'Inventory Alerts', icon: AlertTriangle, badge: lowStockAlerts.length > 0 ? String(lowStockAlerts.length) : undefined, badgeColor: 'bg-red-600' },
              { label: 'Recipe Guide', icon: FileText },
              { label: 'Production Plan', icon: Calendar },
              { label: 'Staff Management', icon: Users },
              { label: 'Reports & Analytics', icon: TrendingUp },
              { label: 'Settings', icon: Settings },
            ].map((item) => {
              const Icon = item.icon as any;
              const isActive = activeSidebarItem === item.label;
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    setActiveSidebarItem(item.label);
                    setIsMobileMenuOpen(false);
                  }}
                  title={item.label}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all ${
                    isActive
                      ? 'bg-red-600 text-white font-black shadow-lg shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                  {!isSidebarCollapsed && item.badge && (
                    <span
                      className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-black ${
                        isActive ? 'bg-white text-red-600' : item.badgeColor || 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Kitchen Chef User Profile Box with Log Out */}
          <div className="p-3 border-t border-slate-800/80 bg-slate-950">
            {!isSidebarCollapsed ? (
              <div className="flex items-center gap-3 mb-2.5">
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 flex items-center justify-center text-xs font-black">
                    {readStaffIdentity().initials}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0a0c12]" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">{readStaffIdentity().name}</div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    {readStaffIdentity().role} <span className="text-emerald-400 font-bold">● Online</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex justify-center mb-2">
                <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center font-black text-xs">
                  K1
                </div>
              </div>
            )}

            <button
              onClick={() => {
                window.dispatchEvent(new Event('spicehub:logout'));
              }}
              className="w-full py-1.5 rounded-lg text-xs font-bold bg-red-700 hover:bg-red-700 text-white transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              {!isSidebarCollapsed && <span>Log Out</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* MAIN VIEWPORT: KITCHEN DISPLAY SCREEN (KDS)              */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header Bar */}
        <header className={`px-3 sm:px-5 py-2.5 border-b flex items-center justify-between shrink-0 shadow-md z-10 transition-colors ${
          isDark ? 'bg-slate-900 border-slate-800/80 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && window.innerWidth < 768) {
                  setIsMobileMenuOpen((prev) => !prev);
                } else {
                  setIsSidebarCollapsed((prev) => !prev);
                }
              }}
              className={`p-1.5 rounded-lg transition ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
              title="Toggle Sidebar Collapse"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Chef Profile Badge in Header */}
            <div
              data-testid="kds-header-chef"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-bold shadow-xs shrink-0 ${
                isDark
                  ? 'bg-red-500/15 border-red-500/30 text-red-300'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              <ChefHat className={`w-4 h-4 ${isDark ? 'text-red-400' : 'text-red-700'}`} />
              <span>{readStaffIdentity().name} (Head Chef)</span>
            </div>

            {/* KDS Station Selector in Header */}
            <div data-testid="kds-station-selector-wrapper" className="flex items-center gap-1.5 shrink-0">
              <span className={`text-[10px] font-bold uppercase tracking-wider hidden md:inline ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Station:</span>
              <select
                data-testid="select-kds-station"
                value={selectedStation}
                onChange={(e) => {
                  setSelectedStation(e.target.value);
                  triggerKdsToast(`Switched KDS Station to: ${e.target.value}`);
                }}
                className={`px-2.5 py-1 rounded-lg border text-xs font-bold focus:outline-none transition ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-800'
                }`}
              >
                <option value="Main Kitchen">Main Kitchen</option>
                <option value="Tandoor Station">Tandoor Station</option>
                <option value="Curry Station">Curry Station</option>
                <option value="Chinese & Wok">Chinese & Wok</option>
                <option value="Executive Chef Pass">Executive Chef Pass</option>
                <option value="All Stations">All Stations</option>
              </select>
            </div>

            <span className={`text-[11px] font-black px-2 py-0.5 rounded-md border hidden sm:inline ${
              isDark ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              {activeSidebarItem}
            </span>
            <div data-testid="kds-header-time" className={`hidden sm:flex text-xs font-bold items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {clock.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Bilingual English / Hindi Language Toggle */}
            <LanguageToggle isDark={isDark} />

            {/* Theme Toggle Button */}
            <button
              data-testid="theme-toggle-btn"
              onClick={toggleTheme}
              className={`p-2 rounded-lg border text-xs flex items-center justify-center transition ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-200 text-amber-600 hover:bg-slate-200'
              }`}
              title={isDark ? 'Switch to Bright Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Bell with Badge 5 */}
            <button
              onClick={() => setIsIntercomModalOpen(true)}
              className={`relative p-2 rounded-lg transition ${
                isDark ? 'bg-slate-800/60 hover:bg-slate-800 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
              title={`${unackBuzzers.length} unacknowledged waiter calls`}
            >
              <Bell className="w-4 h-4" />
              {unackBuzzers.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center">
                  {unackBuzzers.length}
                </span>
              )}
            </button>

            {/* Waiter Calls / Intercom Buzzer Button */}
            {waiterEnabled && (
              <button
                data-testid="btn-waiter-calls-header"
                onClick={() => setIsIntercomModalOpen(true)}
                className={`relative px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-black flex items-center gap-1.5 transition ${
                  unackBuzzers.length > 0
                    ? 'bg-red-600 border-red-500 text-white shadow-md shadow-sm animate-pulse'
                    : isDark
                    ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
                title="Waiter Intercom & Urgent Call Buzzers"
              >
                <Radio className={`w-4 h-4 ${unackBuzzers.length > 0 ? 'text-amber-300 animate-spin' : 'text-amber-500'}`} />
                <span className="hidden lg:inline">Waiter Calls</span>
                {unackBuzzers.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-white text-red-600 text-[10px] font-black">
                    {unackBuzzers.length}
                  </span>
                )}
              </button>
            )}

            {/* 86 Kitchen Stock Control Button */}
            <button
              data-testid="btn-86-manager"
              onClick={() => setIs86DrawerOpen(true)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-black flex items-center gap-1.5 transition ${
                dishes86.filter((d) => !d.isAvailable).length > 0
                  ? 'bg-red-950/80 border-red-600/70 text-red-300 hover:bg-red-900/60'
                  : isDark
                  ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
              title="86 Kitchen Stock Manager"
            >
              <span>🚫</span>
              <span className="hidden lg:inline">86 Stock</span>
              {dishes86.filter((d) => !d.isAvailable).length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px] font-black">
                  {dishes86.filter((d) => !d.isAvailable).length}
                </span>
              )}
            </button>

            {/* View Dropdown */}
            <div className="relative hidden xl:block">
              <button
                onClick={() => setIsViewDropdownOpen((prev) => !prev)}
                className={`px-3 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition ${
                  isDark ? 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <UtensilsCrossed className="w-3.5 h-3.5 text-slate-400" />
                <span>{selectedViewMode}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
              {isViewDropdownOpen && (
                <div className={`absolute top-full left-0 mt-1 w-40 rounded-xl border shadow-xl z-50 p-1 space-y-0.5 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}>
                  {(['Kitchen View', 'Expediter View', 'Pass View'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        setSelectedViewMode(mode);
                        setIsViewDropdownOpen(false);
                        triggerKdsToast(`Switched view to ${mode}`);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-500/20 hover:text-red-400 transition ${
                        selectedViewMode === mode ? 'text-red-400 font-black' : ''
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Outlets Dropdown */}
            <div className="relative hidden lg:block">
              <button
                onClick={() => setIsOutletDropdownOpen((prev) => !prev)}
                className={`px-3 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition ${
                  isDark ? 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{selectedOutlet}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
              {isOutletDropdownOpen && (
                <div className={`absolute top-full left-0 mt-1 w-48 rounded-xl border shadow-xl z-50 p-1 space-y-0.5 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}>
                  {['All Outlets', 'Main Restaurant', 'Rooftop Lounge', 'Room Service Express'].map((outlet) => (
                    <button
                      key={outlet}
                      onClick={() => {
                        setSelectedOutlet(outlet);
                        setIsOutletDropdownOpen(false);
                        triggerKdsToast(`Filtered by ${outlet}`);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-500/20 hover:text-red-400 transition ${
                        selectedOutlet === outlet ? 'text-red-400 font-black' : ''
                      }`}
                    >
                      {outlet}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Online Status Pill */}
            <div className={`hidden md:flex px-3 py-1 rounded-lg border font-bold text-xs items-center gap-1.5 ${
              isDark ? 'bg-emerald-950/60 border-emerald-600/40 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
            }`}>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Online</span>
            </div>

            {/* Chef Profile Trigger */}
            <button
              onClick={() => setProfileOpen(true)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition shadow-sm ${
                isDark
                  ? 'bg-slate-800/90 border-slate-700 text-slate-200 hover:bg-slate-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              title="Chef Profile & Kitchen Station Controls"
            >
              <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-200 border border-slate-300 dark:border-slate-600 flex items-center justify-center shrink-0">
                {chefAvatar ? (
                  <img src={chefAvatar} alt={chefUser.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-3.5 h-3.5 text-slate-500" />
                )}
              </div>
              <span className="hidden sm:inline max-w-[120px] truncate">{chefUser.name}</span>
            </button>
          </div>
        </header>

        {/* Urgent Live Waiter Intercom Banner */}
        {waiterEnabled && unackBuzzers.length > 0 && (
          <div data-testid="urgent-waiter-banner" className="bg-slate-900 text-white dark:bg-slate-900 border-b border-slate-800 px-5 py-2 flex items-center justify-between shadow-xs shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center animate-pulse">
                <Radio className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="font-semibold text-xs uppercase tracking-wider bg-slate-800 text-slate-200 border border-slate-700 px-2 py-0.5 rounded-md mr-2">
                  🚨 URGENT WAITER CALL: {unackBuzzers[0].station} ({unackBuzzers[0].table})
                </span>
                <span className="text-xs font-medium text-slate-300">
                  "{unackBuzzers[0].message}" • Sent by {unackBuzzers[0].waiterName}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                data-testid="btn-ack-buzzer"
                onClick={() => {
                  if (onAcknowledgeBuzzer) onAcknowledgeBuzzer(unackBuzzers[0].id);
                }}
                className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs shadow-md transition flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Acknowledge</span>
              </button>
              <button
                onClick={() => setIsIntercomModalOpen(true)}
                className="px-3 py-1 rounded-lg bg-black/30 hover:bg-black/50 text-white font-bold text-xs transition"
              >
                View All ({unackBuzzers.length})
              </button>
            </div>
          </div>
        )}

        {/* Top 7 Metric Cards Row & Filter Toolbar (Only shown on Live Orders so other views have full viewport) */}
        {activeSidebarItem === 'Live Orders' && (
          <>
            <div className={`flex overflow-x-auto sm:grid sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3 px-3 sm:px-5 py-2.5 border-b shrink-0 transition-colors custom-scrollbar ${
              isDark ? 'border-slate-800/80 bg-slate-950' : 'border-slate-200 bg-white'
            }`}>
              {/* Card 1: Total Orders */}
              <div className={`min-w-[130px] sm:min-w-0 shrink-0 p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                isDark ? 'bg-slate-900 border-slate-800/80' : 'bg-blue-50/50 border-blue-200'
              }`}>
                <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-black">
                  <UtensilsCrossed className="w-4 h-4" />
                </div>
                <div>
                  <div className={`text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Orders</div>
                  <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {liveOrderCount + completedOrders.length}
                  </div>
                  <div className="text-[9px] text-emerald-500 font-semibold">this session</div>
                </div>
              </div>

              {/* Card 2: New Orders */}
              <div className={`min-w-[130px] sm:min-w-0 shrink-0 p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                isDark ? 'bg-slate-900 border-red-900/60' : 'bg-red-50 border-red-200'
              }`}>
                <div className="w-9 h-9 rounded-lg bg-red-600 text-white flex items-center justify-center font-black shadow-md shadow-sm">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <div className={`text-[10px] font-bold ${isDark ? 'text-red-300' : 'text-red-800'}`}>New Orders</div>
                  <div className={`text-xl font-black ${isDark ? 'text-red-100' : 'text-red-950'}`}>{newOrders.length}</div>
                </div>
              </div>

              {/* Card 3: Preparing */}
              <div className={`min-w-[130px] sm:min-w-0 shrink-0 p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                isDark ? 'bg-slate-900 border-amber-900/60' : 'bg-amber-50 border-amber-200'
              }`}>
                <div className="w-9 h-9 rounded-lg bg-amber-600 text-white flex items-center justify-center font-black shadow-md shadow-amber-950/60">
                  <ChefHat className="w-4 h-4" />
                </div>
                <div>
                  <div className={`text-[10px] font-bold ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>Preparing</div>
                  <div className={`text-xl font-black ${isDark ? 'text-amber-100' : 'text-amber-950'}`}>{preparingOrders.length}</div>
                </div>
              </div>

              {/* Card 4: Ready */}
              <div className={`min-w-[130px] sm:min-w-0 shrink-0 p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                isDark ? 'bg-slate-900 border-emerald-900/60' : 'bg-emerald-50 border-emerald-200'
              }`}>
                <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black shadow-md shadow-emerald-950/60">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className={`text-[10px] font-bold ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>Ready</div>
                  <div className={`text-xl font-black ${isDark ? 'text-emerald-100' : 'text-emerald-950'}`}>{readyOrders.length}</div>
                </div>
              </div>

              {/* Card 5: Delayed */}
              <div className={`min-w-[130px] sm:min-w-0 shrink-0 p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                isDark ? 'bg-slate-900 border-red-900/60' : 'bg-red-50 border-red-200'
              }`}>
                <div className="w-9 h-9 rounded-lg bg-red-600 text-white flex items-center justify-center font-black shadow-md shadow-red-950/60">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className={`text-[10px] font-bold ${isDark ? 'text-red-300' : 'text-red-800'}`}>Delayed</div>
                  <div className={`text-xl font-black ${isDark ? 'text-red-100' : 'text-red-950'}`}>{delayedOrderCount}</div>
                </div>
              </div>

              {/* Card 6: Avg Prep Time */}
              <div className={`min-w-[130px] sm:min-w-0 shrink-0 p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                isDark ? 'bg-slate-900 border-slate-800/80' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800'
              }`}>
                <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-black">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className={`text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Avg Prep Time</div>
                  <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {completedOrders.length > 0 ? `${averagePrepMinutes} min` : '—'}
                  </div>
                  <div className={`text-[9px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Target: 15 min</div>
                </div>
              </div>

              {/* Card 7: Kitchen Load */}
              <div className={`min-w-[130px] sm:min-w-0 shrink-0 p-3 rounded-xl border flex flex-col justify-between transition-colors ${
                isDark ? 'bg-slate-900 border-slate-800/80' : 'bg-amber-50/50 border-amber-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Kitchen Load</span>
                  <span className={`text-base font-black ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>{kitchenLoadPct}%</span>
                </div>
                <div className={`w-full h-1.5 rounded-full overflow-hidden mt-2 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                  <div className="bg-amber-400 h-full rounded-full" style={{ width: `${kitchenLoadPct}%` }} />
                </div>
              </div>
            </div>

            {/* Filter Tabs & Action Toolbar */}
            <div className={`px-3 sm:px-5 py-2.5 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0 transition-colors ${
              isDark ? 'bg-slate-900 border-slate-800/80' : 'bg-slate-100 border-slate-200'
            }`}>
              {/* Order Type Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full custom-scrollbar pb-1">
                {[
                  { label: 'All', count: activeTypeCount('All') },
                  { label: 'Dine-in', count: activeTypeCount('Dine-in') },
                  { label: 'Takeaway', count: activeTypeCount('Takeaway') },
                  { label: 'Room Service', count: activeTypeCount('Room Service') },
                  { label: 'Online', count: activeTypeCount('Online') },
                ].map((t) => (
                  <button
                    key={t.label}
                    onClick={() => setActiveTypeFilter(t.label as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                      activeTypeFilter === t.label
                        ? 'bg-red-600 text-white shadow-md shadow-sm'
                        : isDark
                          ? 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                          : 'bg-white text-slate-700 hover:bg-slate-200 hover:text-slate-900 shadow-xs border border-slate-200'
                    }`}
                  >
                    {t.label} ({t.count})
                  </button>
                ))}
              </div>

              {/* Search, Manual Order & View Dropdowns */}
              <div className="flex items-center gap-2 overflow-x-auto max-w-full custom-scrollbar pb-1 shrink-0">
                <div className="relative w-44 sm:w-56 shrink-0">
                  <Search className={`w-3.5 h-3.5 absolute left-3 top-2.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                  <input
                    type="text"
                    placeholder="Search order..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-red-500 ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <button
                  onClick={() => setIsManualOrderModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow-md shadow-sm flex items-center gap-1.5 transition shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">+ Manual Order</span>
                  <span className="sm:hidden">+ Order</span>
                </button>

                <button
                  onClick={() => {
                    const next = sortByTime === 'OLDEST_FIRST' ? 'NEWEST_FIRST' : 'OLDEST_FIRST';
                    setSortByTime(next);
                    triggerKdsToast(`Sorting: ${next === 'OLDEST_FIRST' ? 'Oldest Orders First' : 'Newest Orders First'}`);
                  }}
                  className={`hidden sm:flex px-3 py-1.5 rounded-xl border text-xs font-semibold items-center gap-1 transition shrink-0 ${
                    sortByTime === 'NEWEST_FIRST'
                      ? 'bg-red-500/20 text-red-300 border-red-500/50'
                      : isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-white border-slate-300 text-slate-700 shadow-xs'
                  }`}
                >
                  <span>{sortByTime === 'OLDEST_FIRST' ? 'Sort: Oldest First' : 'Sort: Newest First'}</span>
                  <ChevronDown className={`w-3 h-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                </button>

                <button
                  onClick={() => {
                    setGroupByTable((prev) => !prev);
                    triggerKdsToast(`Table Grouping: ${!groupByTable ? 'Grouped by Table' : 'Chronological'}`);
                  }}
                  className={`hidden md:flex px-3 py-1.5 rounded-xl border text-xs font-semibold items-center gap-1 transition shrink-0 ${
                    groupByTable
                      ? 'bg-red-500/20 text-red-300 border-red-500/50'
                      : isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-white border-slate-300 text-slate-700 shadow-xs'
                  }`}
                >
                  <span>{groupByTable ? 'Group: By Table (Active)' : 'Group: By Time'}</span>
                  <ChevronDown className={`w-3 h-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                </button>

                <div className={`hidden lg:flex items-center p-0.5 rounded-xl border shrink-0 ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-200 border-slate-300'
                }`}>
                  <button
                    onClick={() => triggerKdsToast('Display density toggled')}
                    className={`p-1 rounded-lg ${isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-800 shadow-xs'}`}
                  >
                    <UtensilsCrossed className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Dynamic Workspace Viewport */}
        {activeSidebarItem !== 'Live Orders' ? (
          <KitchenViewsHub
            activeView={activeSidebarItem}
            isDark={isDark}
            liveOrders={allActiveOrders}
            completedOrders={completedOrders}
            stations={store.getStations()}
            dishes={dishes86}
            onToggleItem86={onToggleItem86}
            onBatchToggle86={onBatchToggle86}
            onBackToLiveOrders={() => setActiveSidebarItem('Live Orders')}
            onOpen86Manager={() => setIs86DrawerOpen(true)}
            onTriggerToast={triggerKdsToast}
          />
        ) : (
          <>
            {/* Main Area: Mobile 1 column vertical scroll, Tablet/Laptop 3 Kanban columns expand side-by-side */}
            <div className="flex-1 flex flex-col md:h-screen md:overflow-hidden p-3 sm:p-4 gap-4 min-h-0">
              {/* Mobile View Switcher (Tabs: Placed, Preparing, Ready, All) */}
              <div data-testid="kds-mobile-tabs" className="md:hidden flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 overflow-x-auto border border-slate-200 dark:border-slate-700">
                <button
                  data-testid="tab-mobile-all"
                  onClick={() => setMobileKdsTab('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 ${
                    mobileKdsTab === 'all'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({filteredNew.length + filteredPreparing.length + filteredReady.length})
                </button>
                <button
                  data-testid="tab-mobile-new"
                  onClick={() => setMobileKdsTab('new')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${
                    mobileKdsTab === 'new'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Placed</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold">{filteredNew.length}</span>
                </button>
                <button
                  data-testid="tab-mobile-preparing"
                  onClick={() => setMobileKdsTab('preparing')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${
                    mobileKdsTab === 'preparing'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Preparing</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold">{filteredPreparing.length}</span>
                </button>
                <button
                  data-testid="tab-mobile-ready"
                  onClick={() => setMobileKdsTab('ready')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${
                    mobileKdsTab === 'ready'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Ready</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold">{filteredReady.length}</span>
                </button>
              </div>

              {/* 3 KANBAN COLUMNS (Placed, Preparing, Ready) */}
              <div data-testid="kds-kanban-grid" className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 md:h-full md:overflow-hidden min-h-0">
                {/* ======================================================== */}
                {/* COLUMN 1: PLACED / NEW ORDERS                            */}
                {/* ======================================================== */}
                <div data-testid="column-new" className={`flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm transition-colors h-full ${
                  mobileKdsTab !== 'all' && mobileKdsTab !== 'new' ? 'hidden md:flex' : 'flex'
                }`}>
                  {/* Column Header */}
                  <div className="py-3 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
                    <div className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                      <Flame className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                      <span>Placed</span>
                      <span className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs rounded-full px-2 py-0.5 font-bold ml-1">
                        {filteredNew.length}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Oldest First ▾</span>
                  </div>

                  {/* Cards List */}
                  <div className="flex-1 p-3 space-y-3 overflow-y-auto custom-scrollbar">
                    {filteredNew.length === 0 && (
                      <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                        No new kitchen tickets. Incoming orders appear here in real time.
                      </div>
                    )}
                    {filteredNew.map((ord) => (
                      <div
                        key={ord.id}
                        data-testid={`ticket-card-${ord.id}`}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-sm space-y-2 hover:border-slate-400 dark:hover:border-slate-600 transition"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-lg font-bold text-slate-900 dark:text-white">
                              {ord.destination}
                            </span>
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                              {ord.orderNumber}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{ord.timeAgo || `${ord.timerMinutes || 15}m`}</span>
                          </span>
                        </div>

                        {/* Items List */}
                        <div className="space-y-1.5 pt-1 border-t border-slate-200 dark:border-slate-800">
                          {ord.items.map((it, i) => (
                            <div key={i} className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-300">
                              <div className="flex items-center gap-2 truncate">
                                <button
                                  type="button"
                                  onClick={() => handleToggleItemDone(ord.id, i)}
                                  className={`w-4 h-4 rounded flex items-center justify-center border text-[9px] font-bold transition shrink-0 ${
                                    it.isDone
                                      ? 'bg-emerald-600 border-emerald-500 text-white'
                                      : 'border-slate-300 dark:border-slate-600 text-transparent hover:border-slate-400'
                                  }`}
                                  title="Strike item"
                                >
                                  ✓
                                </button>
                                <span className={`font-semibold ${it.isDone ? 'line-through text-slate-400' : ''}`}>
                                  {it.name}
                                </span>
                              </div>
                              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2 shrink-0">
                                × {it.qty}
                              </span>
                            </div>
                          ))}
                        </div>

                        {ord.note && (
                          <div className="p-2 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 font-medium">
                            Note: {ord.note}
                          </div>
                        )}

                        {/* Action: Start Preparing */}
                        <div className="pt-1">
                          <button
                            data-testid="btn-start-preparing"
                            onClick={() => handleAcceptOrder(ord)}
                            className="w-full h-10 rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 font-semibold text-sm flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            <Play className="w-4 h-4" />
                            <span>Start Preparing</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ======================================================== */}
                {/* COLUMN 2: PREPARING                                      */}
                {/* ======================================================== */}
                <div data-testid="column-preparing" className={`flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm transition-colors h-full ${
                  mobileKdsTab !== 'all' && mobileKdsTab !== 'preparing' ? 'hidden md:flex' : 'flex'
                }`}>
                  {/* Column Header */}
                  <div className="py-3 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
                    <div className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                      <ChefHat className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                      <span>Preparing</span>
                      <span className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs rounded-full px-2 py-0.5 font-bold ml-1">
                        {filteredPreparing.length}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Oldest First ▾</span>
                  </div>

                  {/* Cards List */}
                  <div className="flex-1 p-3 space-y-3 overflow-y-auto custom-scrollbar">
                    {filteredPreparing.length === 0 && (
                      <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                        No tickets are currently being prepared.
                      </div>
                    )}
                    {filteredPreparing.map((ord) => (
                      <div
                        key={ord.id}
                        data-testid={`ticket-card-${ord.id}`}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-sm space-y-2 hover:border-slate-400 dark:hover:border-slate-600 transition"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-lg font-bold text-slate-900 dark:text-white">
                              {ord.destination}
                            </span>
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                              {ord.orderNumber}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{ord.timeAgo || `${ord.timerMinutes || 10}m`}</span>
                          </span>
                        </div>

                        {/* Items List */}
                        <div className="space-y-1.5 pt-1 border-t border-slate-200 dark:border-slate-800">
                          {ord.items.map((it, i) => (
                            <div key={i} className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-300">
                              <div className="flex items-center gap-2 truncate">
                                <button
                                  type="button"
                                  onClick={() => handleToggleItemDone(ord.id, i)}
                                  className={`w-4 h-4 rounded flex items-center justify-center border text-[9px] font-bold transition shrink-0 ${
                                    it.isDone
                                      ? 'bg-emerald-600 border-emerald-500 text-white'
                                      : 'border-slate-300 dark:border-slate-600 text-transparent hover:border-slate-400'
                                  }`}
                                  title="Strike item"
                                >
                                  ✓
                                </button>
                                <span className={`font-semibold ${it.isDone ? 'line-through text-slate-400' : ''}`}>
                                  {it.name}
                                </span>
                              </div>
                              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2 shrink-0">
                                × {it.qty}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Progress */}
                        <div className="space-y-1 pt-1">
                          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                            <span>Preparing... {ord.prepProgress || 50}%</span>
                            <button
                              onClick={() => handleTogglePause(ord.id)}
                              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                            >
                              {ord.isPaused ? <Play className="w-3.5 h-3.5 text-emerald-600" /> : <Pause className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                            <div
                              className="bg-slate-900 dark:bg-white h-full rounded-full transition-all duration-300"
                              style={{ width: `${ord.prepProgress || 50}%` }}
                            />
                          </div>
                        </div>

                        {/* Action: Mark Ready */}
                        <div className="pt-1">
                          <button
                            data-testid="btn-mark-ready"
                            onClick={() => handleMarkReady(ord)}
                            className="w-full h-10 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 font-semibold text-sm flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            <span>Mark Ready</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ======================================================== */}
                {/* COLUMN 3: READY                                          */}
                {/* ======================================================== */}
                <div data-testid="column-ready" className={`flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm transition-colors h-full ${
                  mobileKdsTab !== 'all' && mobileKdsTab !== 'ready' ? 'hidden md:flex' : 'flex'
                }`}>
                  {/* Column Header */}
                  <div className="py-3 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
                    <div className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                      <Bell className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                      <span>Ready</span>
                      <span className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs rounded-full px-2 py-0.5 font-bold ml-1">
                        {filteredReady.length}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Oldest First ▾</span>
                  </div>

                  {/* Cards List */}
                  <div className="flex-1 p-3 space-y-3 overflow-y-auto custom-scrollbar">
                    {filteredReady.length === 0 && (
                      <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                        No ready tickets waiting at the pass.
                      </div>
                    )}
                    {filteredReady.map((ord) => (
                      <div
                        key={ord.id}
                        data-testid={`ticket-card-${ord.id}`}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-sm space-y-2 hover:border-slate-400 dark:hover:border-slate-600 transition"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-lg font-bold text-slate-900 dark:text-white">
                              {ord.destination}
                            </span>
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                              {ord.orderNumber}
                            </span>
                          </div>
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
                            Ready
                          </span>
                        </div>

                        {/* Items List */}
                        <div className="space-y-1.5 pt-1 border-t border-slate-200 dark:border-slate-800">
                          {ord.items.map((it, i) => (
                            <div key={i} className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-300">
                              <div className="flex items-center gap-2 truncate">
                                <button
                                  type="button"
                                  onClick={() => handleToggleItemDone(ord.id, i)}
                                  className={`w-4 h-4 rounded flex items-center justify-center border text-[9px] font-bold transition shrink-0 ${
                                    it.isDone
                                      ? 'bg-emerald-600 border-emerald-500 text-white'
                                      : 'border-slate-300 dark:border-slate-600 text-transparent hover:border-slate-400'
                                  }`}
                                  title="Strike item"
                                >
                                  ✓
                                </button>
                                <span className={`font-semibold ${it.isDone ? 'line-through text-slate-400' : ''}`}>
                                  {it.name}
                                </span>
                              </div>
                              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2 shrink-0">
                                × {it.qty}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Action: Mark as Served */}
                        <div className="pt-1">
                          <button
                            data-testid="btn-mark-served"
                            onClick={() => handleMarkServed(ord)}
                            className="w-full h-10 rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 font-semibold text-sm flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Mark as Served</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

            {/* COLUMN 4: COMPLETED (Available in History & Past Orders view) */}
            <div data-testid="column-completed" className="hidden">
              {/* Header */}
              <div className="px-3 py-2 bg-blue-600 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 font-black text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Completed ({filteredCompleted.length})</span>
                </div>
                <span className="text-[10px] text-blue-200 font-semibold">Latest First ▾</span>
              </div>

              {/* Cards List */}
              <div className="flex-1 p-2.5 space-y-2.5 overflow-y-auto custom-scrollbar">
                {filteredCompleted.length === 0 && (
                  <div className={`p-6 text-center text-xs rounded-xl border border-dashed ${
                    isDark ? 'text-slate-500 border-slate-700' : 'text-slate-500 border-slate-300'
                  }`}>
                    No completed tickets in this session.
                  </div>
                )}
                {filteredCompleted.map((ord) => (
                  <div
                    key={ord.id}
                    data-testid={`ticket-card-${ord.id}`}
                    className={`p-3 rounded-xl border space-y-2 shadow-md opacity-90 transition-colors ${
                      isDark ? 'bg-slate-800 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`font-black text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>{ord.orderNumber}</span>
                        {ord.orderType === 'Room Service' || ord.destination.toLowerCase().includes('room') ? (
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${
                            isDark
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                              : 'bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                          }`}>
                            [{ord.destination.toUpperCase()} - IN-ROOM DINING]
                          </span>
                        ) : (
                          <span className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{ord.destination}</span>
                        )}
                      </div>
                      <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                        ✓
                      </div>
                    </div>

                    <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      <span>{ord.timeAgo}</span>
                    </div>

                    {/* Items */}
                    <div className={`space-y-1.5 pt-1 border-t ${isDark ? 'border-slate-800/60' : 'border-slate-200'}`}>
                      {ord.items.map((it, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          {it.image && (
                            <img
                              src={it.image}
                              alt={it.name}
                              className={`w-7 h-7 rounded-md object-cover border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}
                            />
                          )}
                          <span className={`font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{it.qty} x</span>
                          <span className={`font-semibold truncate ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>{it.name}</span>
                        </div>
                      ))}
                    </div>

                    <div className={`text-[10px] pt-1 border-t ${isDark ? 'border-slate-800/40 text-slate-500' : 'border-slate-200 text-slate-500'}`}>
                      {ord.completedAt}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR WIDGETS (Timers, Stations, Alerts) */}
          <div className="hidden">
            {/* Widget 1: Order Timers */}
            <div className={`p-3.5 rounded-2xl border shadow-md space-y-2.5 transition-colors ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-2 text-xs font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <Clock className="w-4 h-4 text-red-500" />
                  <span>Order Timers</span>
                </div>
                <button
                  onClick={() => setActiveSidebarItem('Preparation Time')}
                  className="text-[10px] font-bold text-blue-500 hover:underline"
                >
                  View All
                </button>
              </div>

              <div className="space-y-1.5 text-xs">
                {allActiveOrders.length === 0 ? (
                  <p className="text-[11px] text-slate-500 py-3 text-center">No active order timers.</p>
                ) : (
                  [...allActiveOrders]
                    .sort((a, b) => Number(b.timerMinutes || 0) - Number(a.timerMinutes || 0))
                    .slice(0, 5)
                    .map((order) => {
                      const minutes = Number(order.timerMinutes || 0);
                      const color = minutes >= 15 ? 'bg-red-500' : minutes >= 8 ? 'bg-amber-500' : 'bg-emerald-500';
                      const remaining = Math.max(0, 15 - minutes);
                      return (
                        <div
                          key={order.id}
                          className={`p-2 rounded-xl flex items-center justify-between border transition-colors ${
                            isDark ? 'bg-slate-800 border-slate-800/60' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${color}`} />
                            <div>
                              <div className={`font-bold text-[11px] ${isDark ? 'text-white' : 'text-slate-900'}`}>{order.orderNumber}</div>
                              <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{order.destination}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-[11px] font-black ${minutes >= 15 ? 'text-red-400' : minutes >= 8 ? 'text-amber-400' : 'text-emerald-400'}`}>
                              {minutes} min
                            </div>
                            <div className="text-[9px] text-slate-500">
                              {remaining > 0 ? `Due in ${remaining} min` : 'Delayed'}
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            {/* Widget 2: Kitchen Stations */}
            <div className={`p-3.5 rounded-2xl border shadow-md space-y-2.5 transition-colors ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-2 text-xs font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <UtensilsCrossed className="w-4 h-4 text-amber-500" />
                  <span>Kitchen Stations</span>
                </div>
                <button
                  onClick={() => setIs86DrawerOpen(true)}
                  className="text-[10px] font-bold text-blue-500 hover:underline"
                >
                  Manage
                </button>
              </div>

              <div className="space-y-2 text-xs">
                {stationWidgets.length === 0 ? (
                  <p className="text-[11px] text-slate-500 py-3 text-center">No stations configured.</p>
                ) : (
                  stationWidgets.map((station) => (
                    <div key={station.name} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{station.name}</span>
                        <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {station.count} ticket{station.count === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                        <div
                          className={`${station.pct >= 70 ? 'bg-red-500' : 'bg-slate-800 dark:bg-slate-200'} h-full rounded-full`}
                          style={{ width: `${station.pct}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Widget 3: Alerts & Notifications */}
            <div className={`p-3.5 rounded-2xl border shadow-md space-y-2.5 transition-colors ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-2 text-xs font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span>Alerts & Notifications</span>
                </div>
                <button
                  onClick={() => setIsIntercomModalOpen(true)}
                  className="text-[10px] font-bold text-blue-500 hover:underline"
                >
                  View All
                </button>
              </div>

              <div className="space-y-2 text-xs">
                {liveAlerts.length === 0 ? (
                  <p className="text-[11px] text-slate-500 py-3 text-center">No active alerts.</p>
                ) : (
                  liveAlerts.map((alert, index) => {
                    const Icon = alert.icon;
                    return (
                      <div key={`${alert.title}-${index}`} className={`p-2 rounded-xl flex items-start gap-2.5 border transition-colors ${
                        isDark ? 'bg-slate-800 border-slate-800/60' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <Icon className={`w-4 h-4 ${alert.color} shrink-0 mt-0.5`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className={`font-bold text-[11px] ${isDark ? 'text-white' : 'text-slate-900'}`}>{alert.title}</span>
                            <span className="text-[9px] text-slate-500">{alert.time}</span>
                          </div>
                          <p className={`text-[10px] truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{alert.desc}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* BOTTOM SECTION: 3 SUMMARY CARDS                          */}
        {/* ======================================================== */}
        <div className={`grid grid-cols-3 gap-3 px-5 py-3 border-t shrink-0 transition-colors ${
          isDark ? 'bg-slate-950 border-slate-800/80' : 'bg-slate-100 border-slate-200'
        }`}>
          {/* Card 1: Today's Summary */}
          <div className={`p-3 rounded-xl border shadow-sm space-y-2 transition-colors ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-black flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                Today's Summary
              </span>
              <button
                onClick={() => setActiveSidebarItem('Reports & Analytics')}
                className="text-[10px] font-bold text-blue-500 hover:underline"
              >
                View Details
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className={`p-2 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-slate-50 border border-slate-200'}`}>
                <div className={`text-[9px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Orders</div>
                <div className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{liveOrderCount + completedOrders.length}</div>
                <div className="text-[9px] text-emerald-500 font-bold">session</div>
              </div>
              <div className={`p-2 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-slate-50 border border-slate-200'}`}>
                <div className={`text-[9px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Completed</div>
                <div className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{completedOrders.length}</div>
                <div className={`text-[9px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {liveOrderCount + completedOrders.length > 0
                    ? Math.round((completedOrders.length / (liveOrderCount + completedOrders.length)) * 100)
                    : 0}%
                </div>
              </div>
              <div className={`p-2 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-slate-50 border border-slate-200'}`}>
                <div className={`text-[9px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Avg Prep Time</div>
                <div className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {completedOrders.length > 0 ? `${averagePrepMinutes} min` : '—'}
                </div>
                <div className="text-[9px] text-slate-400 font-bold">session</div>
              </div>
              <div className={`p-2 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-slate-50 border border-slate-200'}`}>
                <div className={`text-[9px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Delayed</div>
                <div className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{delayedOrderCount}</div>
                <div className="text-[9px] text-red-500 font-bold">
                  {liveOrderCount > 0 ? Math.round((delayedOrderCount / liveOrderCount) * 100) : 0}%
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Popular Items Today */}
          <div className={`p-3 rounded-xl border shadow-sm space-y-1.5 transition-colors ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <span className={`text-xs font-black flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <UtensilsCrossed className="w-3.5 h-3.5 text-amber-500" />
              Popular Items Today
            </span>
            <div className="space-y-1 text-[11px]">
              {popularItems.length === 0 ? (
                <p className="text-slate-500 py-3 text-center">No dishes ordered yet in this session.</p>
              ) : (
                popularItems.map((item) => (
                  <div key={item.name} className="flex items-center justify-between gap-2">
                    <span className={`truncate w-36 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{item.name}</span>
                    <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                      <div
                        className="bg-slate-800 dark:bg-slate-200 h-full rounded-full"
                        style={{ width: `${(item.count / Math.max(1, popularItems[0].count)) * 100}%` }}
                      />
                    </div>
                    <span className={`font-bold text-[10px] w-6 text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.count}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Card 3: Recent Completed Orders */}
          <div className={`p-3 rounded-xl border shadow-sm space-y-1.5 transition-colors ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-black flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Recent Completed Orders
              </span>
              <button
                onClick={() => triggerKdsToast(`${completedOrders.length} orders completed in this KDS session.`)}
                className="text-[10px] font-bold text-blue-500 hover:underline"
              >
                View All
              </button>
            </div>
            <div className="space-y-1 text-[11px]">
              {completedOrders.length === 0 ? (
                <p className="text-slate-500 py-3 text-center">No completed orders in this session.</p>
              ) : (
                completedOrders.slice(0, 5).map((c) => (
                <div key={c.id} className={`flex items-center justify-between py-0.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{c.orderNumber}</span>
                    <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{c.destination}</span>
                  </div>
                  <span className="text-slate-500 text-[10px]">{c.completedAt || c.timeAgo}</span>
                </div>
              )))}
            </div>
          </div>
        </div>
      </>
    )}
  </div>

      {/* Manual Order Modal */}
      {isManualOrderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`rounded-2xl max-w-sm w-full p-6 shadow-sm dark:shadow-none border space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
          }`}>
            <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <h3 className={`text-base font-black flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <Flame className="w-5 h-5 text-red-500" />
                Manual Kitchen Order
              </h3>
              <button onClick={() => setIsManualOrderModalOpen(false)} className={`${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className={`block font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Table or Room</label>
                <input
                  type="text"
                  value={manualTable}
                  onChange={(e) => setManualTable(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border font-semibold ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Dish Name</label>
                <input
                  type="text"
                  value={manualDish}
                  onChange={(e) => setManualDish(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border font-semibold ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={handleCreateManualOrder}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs transition"
              >
                Send to Kitchen
              </button>
              <button
                onClick={() => setIsManualOrderModalOpen(false)}
                className={`px-4 py-2 rounded-xl font-bold text-xs ${
                  isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700 border border-slate-300'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 86 Out of Stock Manager Drawer */}
      <Kds86ManagerDrawer
        isOpen={is86DrawerOpen}
        onClose={() => setIs86DrawerOpen(false)}
        dishes={dishes86}
        onToggleItem86={async (id, avail, reason) => {
          if (onToggleItem86) {
            await onToggleItem86(id, avail, reason);
          }
        }}
        onBatchToggle86={async (ids, avail, reason) => {
          if (onBatchToggle86) {
            await onBatchToggle86(ids, avail, reason);
          }
        }}
      />

      {/* Waiter Calls & Intercom Modal */}
      {isIntercomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className={`w-full max-w-xl rounded-2xl border shadow-sm dark:shadow-none overflow-hidden flex flex-col max-h-[85vh] ${
            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`p-4 border-b flex items-center justify-between ${
              isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-500 flex items-center justify-center font-bold">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-black text-base">Kitchen Intercom & Waiter Calls</h3>
                  <p className="text-xs text-slate-400">Direct urgent priority buzzers from floor captains & waiters</p>
                </div>
              </div>
              <button
                onClick={() => setIsIntercomModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1 custom-scrollbar">
              {kitchenBuzzers.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  <Radio className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No active buzzer alerts. All kitchen stations clear!
                </div>
              ) : (
                kitchenBuzzers.map((buzz: any, idx: number) => {
                  const isAck = buzz.status === 'ACKNOWLEDGED';
                  return (
                    <div
                      key={buzz.id || idx}
                      className={`p-4 rounded-xl border flex flex-col gap-2 transition-all ${
                        isAck
                          ? isDark ? 'bg-slate-900/40 border-slate-800/80 opacity-75' : 'bg-slate-50 border-slate-200 opacity-80'
                          : isDark ? 'bg-red-950/20 border-red-600/40 shadow-lg' : 'bg-red-50/80 border-red-300 shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-orange-500">{buzz.station}</span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-orange-500/20 text-orange-400">
                            {buzz.table}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                            buzz.priority === 'URGENT' ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'
                          }`}>
                            {buzz.priority || 'HIGH'}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">
                          {buzz.createdAt ? new Date(buzz.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                        </span>
                      </div>

                      <div className="font-bold text-sm">
                        {buzz.message}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-700/30 text-xs">
                        <span className="text-slate-400">
                          Waiter: <strong>{buzz.waiterName || 'Floor Captain'}</strong>
                        </span>
                        {isAck ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            Acknowledged by {buzz.acknowledgedBy || 'Chef'}
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              if (onAcknowledgeBuzzer) onAcknowledgeBuzzer(buzz.id);
                            }}
                            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md transition"
                          >
                            <Check className="w-4 h-4" />
                            <span>Acknowledge Call</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className={`p-3 border-t flex justify-end ${
              isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'
            }`}>
              <button
                onClick={() => setIsIntercomModalOpen(false)}
                className={`px-4 py-2 rounded-xl text-xs font-bold ${
                  isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chef Staff Profile & Controls Modal */}
      {profileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className={`w-full max-w-md rounded-2xl shadow-sm dark:shadow-none border overflow-hidden transition-all ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center font-bold">
                  <ChefHat className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Kitchen Staff Profile</h3>
                  <p className="text-[11px] text-slate-400">KDS Station Terminal Session</p>
                </div>
              </div>
              <button
                onClick={() => setProfileOpen(false)}
                className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-5">
              {/* Profile Card & Avatar */}
              <div className={`p-4 rounded-xl border flex items-center gap-4 ${isDark ? 'bg-slate-800/50 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-red-500/40 bg-slate-200 shrink-0 flex items-center justify-center shadow-inner">
                  {chefAvatar ? (
                    <img src={chefAvatar} alt={chefUser.name} className="w-full h-full object-cover" />
                  ) : (
                    <ChefHat className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-base font-bold truncate">{chefUser.name}</h4>
                  <p className="text-xs text-red-500 font-semibold">{chefUser.role}</p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{chefUser.email || 'kitchen@hotel.com'}</p>
                </div>
              </div>

              {/* Photo Upload: Camera & Gallery */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Update Chef Photo
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <label className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-dashed cursor-pointer transition text-center ${
                    isDark ? 'border-slate-700 hover:border-red-500 bg-slate-800/40' : 'border-slate-300 hover:border-red-500 bg-slate-50/50'
                  }`}>
                    <Camera className="w-5 h-5 text-red-500" />
                    <span className="text-xs font-semibold">Live Camera</span>
                    <span className="text-[10px] text-slate-400">Capture Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="user"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>

                  <label className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-dashed cursor-pointer transition text-center ${
                    isDark ? 'border-slate-700 hover:border-red-500 bg-slate-800/40' : 'border-slate-300 hover:border-red-500 bg-slate-50/50'
                  }`}>
                    <Upload className="w-5 h-5 text-sky-500" />
                    <span className="text-xs font-semibold">Device Gallery</span>
                    <span className="text-[10px] text-slate-400">Pick from Storage</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-[10px] text-slate-400 text-center">
                  Auto-compressed to 400x400 JPEG (~40KB) for kitchen ETA and waiter intercom.
                </p>
              </div>

              {/* Station Information */}
              <div className={`p-3.5 rounded-xl border space-y-1.5 text-xs ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Kitchen Station:</span>
                  <span className="font-semibold text-red-400">{selectedStation}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">View Mode:</span>
                  <span className="font-medium text-slate-300">{selectedViewMode}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Active Outlet:</span>
                  <span className="font-medium text-slate-300">{selectedOutlet}</span>
                </div>
              </div>

              {/* Action Buttons: Logout */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout from KDS</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
