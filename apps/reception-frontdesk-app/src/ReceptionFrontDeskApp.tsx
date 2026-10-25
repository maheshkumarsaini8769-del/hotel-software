import React, { useState, useEffect, useCallback } from 'react';
import { getPortalUrl } from './config/env';
import {
  Bed,
  Users,
  DoorOpen,
  Sparkles,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  Phone,
  Mail,
  Car,
  Bell,
  MessageSquare,
  Settings,
  ChevronRight,
  Printer,
  ShieldCheck,
  CreditCard,
  UserCheck,
  HelpCircle,
  TrendingUp,
  X,
  Coffee,
  RotateCcw,
  Compass,
  Briefcase,
  Layers,
  Wrench,
  Package,
  Wifi,
  Tv,
  Eye,
  Grid,
  List,
  ChevronDown,
  Building,
  Menu,
  Check,
  Percent,
  CalendarDays,
  UserPlus,
  LogOut,
  Sun,
  Moon,
  Zap,
  Crown,
  ArrowUpRight,
  BookOpen
} from 'lucide-react';
import { FrontDeskCheckInApp } from './components/front-desk/FrontDeskCheckInApp';
import { PmsReservationMatrixApp } from './PmsReservationMatrixApp';
import { LiveReservationManagerApp } from './components/reservations/LiveReservationManagerApp';
import { HousekeepingTurnaroundApp } from './components/housekeeping/HousekeepingTurnaroundApp';
import { LostAndFoundVaultApp } from './components/lost-and-found/LostAndFoundVaultApp';
import { CorporateMasterFolioApp } from './components/corporate/CorporateMasterFolioApp';
import { NightAuditApp } from './components/night-audit/NightAuditApp';
import { RoomAllocationView } from './views/RoomAllocationView';
import { RoomStatusView } from './views/RoomStatusView';
import { RoomChargesView } from './views/RoomChargesView';
import { GuestManagementView } from './views/GuestManagementView';
import { RoomRatesView } from './views/RoomRatesView';
import { MaintenanceView } from './views/MaintenanceView';
import { ExtraServicesView } from './views/ExtraServicesView';
import { ReceptionSettingsView } from './views/ReceptionSettingsView';
import { MatrixStore } from '../../../packages/ui/src/pms/MatrixStore';
import { getApiClient } from './lib/apiClient';
import { QuickPolicyReferenceModal } from '../../../packages/ui/src/pms/QuickPolicyReferenceModal';

export interface ReceptionStandaloneAppProps {
  onNavigatePortal?: (portal: 'admin' | 'cashier' | 'reception') => void;
}

export interface RoomGridItem {
  number: string;
  category: string;
  price: number;
  status: 'Available' | 'Occupied' | 'Cleaning' | 'Maintenance' | 'Out of Service';
  floor: string;
  image: string;
  guestName?: string;
  specs: { guests: number; bed: string; view: string; size: string };
  amenities: string[];
  taskId?: string;
  taskType?: string;
  taskStatus?: string;
  taskPriority?: string;
}

const ROOM_IMAGES = [
  'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=400&auto=format&fit=crop&q=80',
];

function roomImageFor(roomNumber: string): string {
  const numeric = Number(roomNumber.replace(/\D/g, '')) || 0;
  return ROOM_IMAGES[numeric % ROOM_IMAGES.length];
}

function roomCategoryFor(name?: string): string {
  const value = (name || 'Room').toLowerCase();
  if (value.includes('suite')) return 'Suite';
  if (value.includes('deluxe')) return 'Deluxe';
  if (value.includes('family')) return 'Family';
  if (value.includes('standard')) return 'Standard';
  if (value.includes('dorm')) return 'Dormitory';
  return name || 'Room';
}

interface BoardRoomRow {
  roomId: string;
  roomNumber: string;
  floorNumber?: number;
  roomType?: { _id?: string; name?: string; code?: string };
  status: string;
  guestInfo?: { guestName?: string } | null;
  activeTask?: {
    _id?: string;
    status?: string;
    taskType?: string;
    priority?: string;
  } | null;
}

interface BookingRow {
  _id: string;
  bookingNumber?: string;
  guestName?: string;
  roomTypeId?: string | { _id?: string; name?: string };
  allocatedRoomId?: string | { _id?: string; roomNumber?: string };
  checkInDate?: string;
  checkOutDate?: string;
  bookingStatus?: string;
  createdAt?: string;
}

interface RoomTypeRow {
  _id: string;
  name?: string;
  maxPax?: number;
  maxCapacity?: number;
  basePrice?: number;
  basePriceOvernight?: number;
  amenities?: string[];
}

function floorLabel(floorNumber?: number): string {
  if (floorNumber === 0) return 'Ground Floor';
  if (typeof floorNumber === 'number') return `Floor ${floorNumber}`;
  return 'Unassigned Floor';
}

function roomStatus(status: string): RoomGridItem['status'] {
  if (status === 'OCCUPIED') return 'Occupied';
  if (status === 'DIRTY' || status === 'CLEANING') return 'Cleaning';
  if (status === 'OUT_OF_SERVICE') return 'Maintenance';
  if (status === 'INSPECTION') return 'Available';
  return 'Available';
}

export const ReceptionStandaloneApp: React.FC<ReceptionStandaloneAppProps> = ({ onNavigatePortal }) => {
  const [activeSidebarItem, setActiveSidebarItem] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('tab');
      if (p) return p;
    }
    return 'Room Dashboard';
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [roomFilterCategory, setRoomFilterCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [showRoomFolioModal, setShowRoomFolioModal] = useState(false);

  // Theme State (Dark / Light with persistence)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('spicehub_reception_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    }
    return 'light';
  });

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('spicehub_reception_theme', next);
    }
  };

  const isDark = theme === 'dark';

  // Live room inventory for the dashboard grid.
  const [rooms, setRooms] = useState<RoomGridItem[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [todayRevenue, setTodayRevenue] = useState<number | null>(null);
  const [revenueGrowth, setRevenueGrowth] = useState<number | null>(null);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);

  // Selected Room for Details Panel
  const [selectedRoom, setSelectedRoom] = useState<RoomGridItem | null>(null);

  // Operational Action Notice Toast
  const [toastNotice, setToastNotice] = useState<string | null>(null);
  const [clock, setClock] = useState(() => new Date());

  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('spicehub_token') || localStorage.getItem('token') || ''
      : '';
  const hotelId =
    typeof window !== 'undefined'
      ? localStorage.getItem('spicehub_hotel_id') || localStorage.getItem('hotelId') || ''
      : '';
  const matrixStore = MatrixStore.getInstance();

  const authUser = (() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw =
        window.localStorage.getItem('spicehub_auth_user') ||
        window.localStorage.getItem('auth_user');
      return raw ? (JSON.parse(raw) as { name?: string; role?: string }) : null;
    } catch {
      return null;
    }
  })();
  const operatorName = authUser?.name || 'Front Desk';
  const operatorRole = authUser?.role
    ? authUser.role.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
    : 'Front Desk';

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  // Allow programmatic tab & modal navigation for automated audits
  useEffect(() => {
    const handleSetTab = (e: any) => {
      if (e.detail && typeof e.detail === 'string') {
        setActiveSidebarItem(e.detail);
      }
    };
    const handleSetModal = (e: any) => {
      if (e.detail === 'policy') setIsPolicyModalOpen(true);
      else if (e.detail === 'folio') setShowRoomFolioModal(true);
      else if (e.detail === 'close_all') {
        setIsPolicyModalOpen(false);
        setShowRoomFolioModal(false);
      }
    };
    window.addEventListener('reception:set_tab', handleSetTab);
    window.addEventListener('reception:set_modal', handleSetModal);
    return () => {
      window.removeEventListener('reception:set_tab', handleSetTab);
      window.removeEventListener('reception:set_modal', handleSetModal);
    };
  }, []);

  const triggerToast = (msg: string) => {
    setToastNotice(msg);
    setTimeout(() => setToastNotice(null), 3500);
  };

  const loadRooms = useCallback(async () => {
    setRoomsLoading(true);
    setRoomsError(null);
    try {
      const client = getApiClient();
      const [boardResponse, typesResponse, arrivalsResponse, overviewResponse] = await Promise.all([
        client.request<{ success: boolean; board: BoardRoomRow[] }>(
          'GET',
          '/api/v1/housekeeping/board'
        ),
        client.request<{ success: boolean; roomTypes: RoomTypeRow[] }>(
          'GET',
          '/api/v1/pms/room-types'
        ),
        client.request<{ success: boolean; bookings: BookingRow[] }>(
          'GET',
          '/api/v1/pms/bookings/arrivals-board'
        ),
        client.request<{
          success: boolean;
          data: {
            kpis?: { totalRevenue?: number; revenueGrowthPct?: number };
          };
        }>('GET', '/api/v1/dashboard/overview'),
      ]);

      const typesById = new Map(
        (typesResponse.roomTypes || []).map((type) => [String(type._id), type])
      );
      const mapped = (boardResponse.board || []).map((room) => {
        const type = typesById.get(String(room.roomType?._id || ''));
        const typeName = type?.name || room.roomType?.name || room.roomType?.code || 'Room';
        const amenities = type?.amenities || [];
        return {
          number: room.roomNumber,
          category: roomCategoryFor(typeName),
          price: Number(type?.basePrice ?? type?.basePriceOvernight ?? 0),
          status: roomStatus(room.status),
          floor: floorLabel(room.floorNumber),
          image: roomImageFor(room.roomNumber),
          guestName: room.guestInfo?.guestName,
          specs: {
            guests: Number(type?.maxPax ?? type?.maxCapacity ?? 0),
            bed: amenities.find((item) => /bed/i.test(item)) || 'Not specified',
            view: 'Not specified',
            size: 'Not specified',
          },
          amenities,
          taskId: room.activeTask?._id,
          taskType: room.activeTask?.taskType,
          taskStatus: room.activeTask?.status,
          taskPriority: room.activeTask?.priority,
        } as RoomGridItem;
      });
      setRooms(mapped);
      setBookings(arrivalsResponse.bookings || []);
      setTodayRevenue(Number(overviewResponse.data?.kpis?.totalRevenue || 0));
      setRevenueGrowth(Number(overviewResponse.data?.kpis?.revenueGrowthPct || 0));
      setSelectedRoom((current) => current || mapped[0] || null);
    } catch (err: any) {
      setRooms([]);
      setRoomsError(err?.message || 'Live room inventory could not be loaded.');
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  const floorsList = Array.from(new Set(rooms.map((room) => room.floor))).sort((a, b) => {
    const order = (value: string) => {
      if (value === 'Ground Floor') return -1;
      const match = value.match(/\d+/);
      return match ? Number(match[0]) : 0;
    };
    return order(b) - order(a);
  });
  const roomCategories = Array.from(new Set(rooms.map((room) => room.category)));

  const totalRoomCount = rooms.length;
  const occupiedRoomCount = rooms.filter((room) => room.status === 'Occupied').length;
  const availableRoomCount = rooms.filter((room) => room.status === 'Available').length;
  const cleaningRoomCount = rooms.filter((room) => room.status === 'Cleaning').length;
  const maintenanceRoomCount = rooms.filter((room) => room.status === 'Maintenance').length;
  const roomPercent = (count: number) =>
    totalRoomCount > 0 ? Math.round((count / totalRoomCount) * 100) : 0;

  const todayKey = new Date().toDateString();
  const timeLabel = (value?: string) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? '—'
      : date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };
  const dateLabel = (value?: string) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? '—'
      : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };
  const bookingRoomNumber = (booking: BookingRow) =>
    typeof booking.allocatedRoomId === 'object'
      ? booking.allocatedRoomId?.roomNumber
      : undefined;
  const bookingRoomType = (booking: BookingRow) =>
    typeof booking.roomTypeId === 'object'
      ? booking.roomTypeId?.name
      : undefined;

  const todaysCheckIns = bookings
    .filter(
      (booking) =>
        booking.checkInDate &&
        new Date(booking.checkInDate).toDateString() === todayKey &&
        booking.bookingStatus !== 'CANCELLED'
    )
    .slice(0, 6);
  const todaysCheckOuts = bookings
    .filter(
      (booking) =>
        booking.checkOutDate &&
        new Date(booking.checkOutDate).toDateString() === todayKey &&
        booking.bookingStatus === 'CHECKED_IN'
    )
    .slice(0, 6);
  const activeHousekeepingTasks = rooms.filter((room) => room.taskId).slice(0, 6);
  const recentBookings = [...bookings]
    .sort(
      (a, b) =>
        new Date(b.createdAt || b.checkInDate || 0).getTime() -
        new Date(a.createdAt || a.checkInDate || 0).getTime()
    )
    .slice(0, 5);

  const getStatusColor = (status: RoomGridItem['status']) => {
    switch (status) {
      case 'Available':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'Occupied':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'Cleaning':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'Maintenance':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      case 'Out of Service':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
    }
  };

  return (
    <div className={`flex h-screen w-screen overflow-hidden font-sans select-none antialiased transition-colors duration-200 ${
      isDark ? 'bg-[#0f1118] text-slate-100' : 'bg-[#f4f6fa] text-slate-800'
    }`}>
      {/* Toast Notification */}
      {toastNotice && (
        <div className="fixed top-5 right-5 z-50 bg-blue-600 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-3 transition-all duration-200 border border-blue-400/30">
          <CheckCircle2 className="w-5 h-5 text-blue-200" />
          <span className="font-semibold text-sm">{toastNotice}</span>
        </div>
      )}

      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ======================================================== */}
      {/* LEFT SIDEBAR: DARK LUXURY BRANDED SHELL                  */}
      {/* ======================================================== */}
      <aside className={`${
        isMobileMenuOpen ? 'flex fixed inset-y-0 left-0 z-50 w-64 shadow-2xl' : 'hidden md:flex'
      } ${isSidebarCollapsed ? 'md:w-16' : 'md:w-60'} bg-[#111218] text-slate-300 flex-col justify-between shrink-0 border-r border-slate-800/80 shadow-2xl z-20 transition-all duration-200`}>
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo & Header */}
          <div className="p-4 flex items-center gap-3 border-b border-slate-800/80">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-500 flex items-center justify-center text-white shadow-md shadow-yellow-950/40 shrink-0">
              <Building className="w-5 h-5 text-white" />
            </div>
            {(!isSidebarCollapsed || isMobileMenuOpen) && (
              <div className="truncate">
                <div className="font-black text-lg text-white tracking-tight flex items-center gap-1.5">
                  SpiceHub
                </div>
                <p className="text-[11px] text-yellow-500 font-bold tracking-wider">Hotel & Restaurant</p>
              </div>
            )}
          </div>

          {/* Nav Items List (16 items matching image) */}
          <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 text-xs font-semibold custom-scrollbar">
            {[
              { label: 'Room Dashboard', icon: Bed },
              { label: 'Room Booking', icon: Calendar },
              { label: 'Walk-in Check-in', icon: DoorOpen },
              { label: 'Check-in / Check-out', icon: Clock },
              { label: 'Room Calendar', icon: CalendarDays },
              { label: 'Room Allocation', icon: Layers },
              { label: 'Room Status', icon: Sparkles },
              { label: 'Housekeeping', icon: Sparkles },
              { label: 'Room Charges (F&B)', icon: Coffee },
              { label: 'Guest Management', icon: Users },
              { label: 'Group Booking', icon: Users },
              { label: 'Room Types & Rates', icon: CreditCard },
              { label: 'Extra Services', icon: Plus },
              { label: 'Maintenance', icon: Wrench },
              { label: 'Lost & Found Vault', icon: Package },
              { label: 'Night Audit & Close', icon: TrendingUp },
              { label: 'Settings', icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
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
                      ? 'bg-blue-600 text-white font-black shadow-md shadow-blue-900/40'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  {(!isSidebarCollapsed || isMobileMenuOpen) && <span className="truncate">{item.label}</span>}
                  {(!isSidebarCollapsed || isMobileMenuOpen) && isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto text-blue-200" />}
                </button>
              );
            })}
          </nav>

          {/* Bottom Card: Hotel Photo Banner + Receptionist Profile */}
          <div className="p-3 border-t border-slate-800/80 bg-[#090b10] space-y-2.5">
            {/* SpiceHub Illuminated Building Preview */}
            <div className="relative rounded-xl overflow-hidden h-20 border border-amber-500/30 group">
              <img
                src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=300&auto=format&fit=crop&q=80"
                alt="SpiceHub Resort"
                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-end p-2">
                <span className="text-white font-black text-xs tracking-wider">SpiceHub Resort</span>
              </div>
            </div>

            {/* Neha Sharma Profile */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80"
                  alt="Front Desk"
                  className="w-8 h-8 rounded-full object-cover border border-blue-500/40"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#090b10]" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">{operatorName}</div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                  {operatorRole} <span className="text-emerald-400 font-bold">● Online</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* MAIN VIEWPORT: ROOM SYSTEM & FRONT DESK OPERATIONS       */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header Bar */}
        <header className={`px-3 sm:px-5 py-2.5 border-b flex items-center justify-between shrink-0 shadow-xs z-10 transition-colors ${
          isDark ? 'bg-[#141620] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-2 sm:gap-4 flex-1 max-w-xl min-w-0">
            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`md:hidden p-1.5 rounded-lg transition shrink-0 ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
              title="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            {/* Desktop Sidebar Collapse Toggle */}
            <button
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              className={`hidden md:flex p-1.5 rounded-lg transition shrink-0 ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
              title="Toggle Sidebar Collapse"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="relative w-full min-w-0">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search guest, booking, room number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return;
                  const query = searchQuery.trim().toLowerCase();
                  if (!query) return;
                  const matchedRoom = rooms.find(
                    (room) =>
                      room.number.toLowerCase() === query ||
                      room.number.toLowerCase().includes(query)
                  );
                  if (matchedRoom) {
                    setSelectedRoom(matchedRoom);
                    triggerToast(`Selected Room ${matchedRoom.number}.`);
                    return;
                  }
                  const matchedBooking = bookings.find(
                    (booking) =>
                      booking.guestName?.toLowerCase().includes(query) ||
                      booking.bookingNumber?.toLowerCase().includes(query)
                  );
                  if (matchedBooking) {
                    setActiveSidebarItem('Check-in / Check-out');
                    triggerToast(
                      `Found booking ${matchedBooking.bookingNumber || ''} for ${matchedBooking.guestName || 'guest'}.`
                    );
                    return;
                  }
                  triggerToast(`No room, booking or guest matched "${searchQuery.trim()}".`);
                }}
                className={`w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500'
                    : 'bg-slate-100 border-slate-200 text-slate-900'
                }`}
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Live Clock */}
            <div className={`hidden lg:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border ${
              isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-500'
            }`}>
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {clock.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                {' | '}
                {clock.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Quick Policies & Rules Guide Button */}
            <button
              onClick={() => setIsPolicyModalOpen(true)}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition"
              title="Open Quick Policy Reference & SOP Manual"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Policies & SOP</span>
            </button>

            {/* Bell with Badge 12 */}
            <button
              onClick={() =>
                triggerToast(
                  `Front Desk Alerts: ${rooms.filter((room) => room.status === 'Cleaning').length} rooms need cleaning, ${rooms.filter((room) => room.status === 'Maintenance').length} under maintenance.`
                )
              }
              className={`relative p-2 rounded-lg transition ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
              title={`${cleaningRoomCount + maintenanceRoomCount} rooms need attention`}
            >
              <Bell className="w-4 h-4" />
              {cleaningRoomCount + maintenanceRoomCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center">
                  {cleaningRoomCount + maintenanceRoomCount}
                </span>
              )}
            </button>

            {/* Settings Gear */}
            <button
              onClick={() => setActiveSidebarItem('Settings')}
              className={`hidden sm:flex p-2 rounded-lg transition ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
              title="Front Desk Terminal Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* User Profile Pill */}
            <div className={`hidden sm:flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border ${
              isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}>
              <div className="w-6 h-6 rounded-full bg-pink-500 text-white font-bold text-xs flex items-center justify-center">
                N
              </div>
              <span className="text-xs font-bold">Front Desk</span>
            </div>

            {/* Theme Toggle Button */}
            <button
              data-testid="theme-toggle-btn"
              onClick={toggleTheme}
              className={`p-2 rounded-lg border transition ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-200 text-amber-600 hover:bg-slate-200'
              }`}
              title={isDark ? 'Switch to Bright Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Outbound Quick Portals */}
            <button
              onClick={() => {
                window.location.href = getPortalUrl('cashier');
              }}
              className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold hover:bg-amber-600 hover:text-white transition shadow-sm"
            >
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span>Cashier POS</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
            <button
              onClick={() => {
                window.location.href = getPortalUrl('admin');
              }}
              className={`hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition shadow-sm ${
                isDark
                  ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                  : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-amber-500" />
              <span>Hotel Admin</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </header>

        {/* View Switcher for Sub-Apps */}
        {activeSidebarItem === 'Walk-in Check-in' ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-4 custom-scrollbar">
            <FrontDeskCheckInApp
              authToken={token}
              hotelId={hotelId}
              preselectedRoomNumber={selectedRoom?.number}
              onBackToMatrix={() => {
                setActiveSidebarItem('Room Dashboard');
                void loadRooms();
              }}
            />
          </div>
        ) : activeSidebarItem === 'Room Booking' || activeSidebarItem === 'Room Calendar' ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-4 custom-scrollbar">
            <PmsReservationMatrixApp
              store={matrixStore}
              onConfirmBooking={(b) => triggerToast(`Booking created for ${b.guestName}`)}
            />
          </div>
        ) : activeSidebarItem === 'Check-in / Check-out' ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-4 custom-scrollbar">
            <LiveReservationManagerApp hotelId={hotelId} />
          </div>
        ) : activeSidebarItem === 'Room Allocation' ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-4 custom-scrollbar">
            <RoomAllocationView isDark={isDark} onToast={triggerToast} />
          </div>
        ) : activeSidebarItem === 'Room Status' ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-4 custom-scrollbar">
            <RoomStatusView isDark={isDark} onToast={triggerToast} />
          </div>
        ) : activeSidebarItem === 'Housekeeping' ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-4 custom-scrollbar">
            <HousekeepingTurnaroundApp />
          </div>
        ) : activeSidebarItem === 'Room Charges (F&B)' ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-4 custom-scrollbar">
            <RoomChargesView isDark={isDark} onToast={triggerToast} />
          </div>
        ) : activeSidebarItem === 'Guest Management' ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-4 custom-scrollbar">
            <GuestManagementView isDark={isDark} onToast={triggerToast} />
          </div>
        ) : activeSidebarItem === 'Group Booking' ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-4 custom-scrollbar">
            <CorporateMasterFolioApp token={token} hotelId={hotelId} />
          </div>
        ) : activeSidebarItem === 'Room Types & Rates' ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-4 custom-scrollbar">
            <RoomRatesView isDark={isDark} onToast={triggerToast} />
          </div>
        ) : activeSidebarItem === 'Extra Services' ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-4 custom-scrollbar">
            <ExtraServicesView isDark={isDark} onToast={triggerToast} />
          </div>
        ) : activeSidebarItem === 'Maintenance' ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-4 custom-scrollbar">
            <MaintenanceView isDark={isDark} onToast={triggerToast} />
          </div>
        ) : activeSidebarItem === 'Lost & Found Vault' ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-4 custom-scrollbar">
            <LostAndFoundVaultApp authToken={token} hotelId={hotelId} />
          </div>
        ) : activeSidebarItem === 'Night Audit & Close' ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-4 custom-scrollbar">
            <NightAuditApp token={token} hotelId={hotelId} />
          </div>
        ) : activeSidebarItem === 'Settings' ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-4 custom-scrollbar">
            <ReceptionSettingsView isDark={isDark} onToast={triggerToast} />
          </div>
        ) : (
          /* Main Room Dashboard matching media_1791355525655.jpg */
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto min-h-0 p-4 custom-scrollbar">
            {/* Top 7 Metric KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 sm:gap-3 shrink-0">
              {/* Card 1: Total Rooms */}
              <div className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
                isDark ? 'bg-blue-950/40 border-blue-900/60 text-blue-200' : 'bg-[#eff6ff] border-blue-200'
              }`}>
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black">
                  <Bed className="w-5 h-5" />
                </div>
                <div>
                  <div className={`text-[10px] font-bold ${isDark ? 'text-blue-300' : 'text-blue-900'}`}>Total Rooms</div>
                  <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {roomsLoading ? '—' : totalRoomCount}
                  </div>
                </div>
              </div>

              {/* Card 2: Occupied */}
              <div className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
                isDark ? 'bg-rose-950/40 border-rose-900/60 text-rose-200' : 'bg-[#fef2f2] border-rose-200'
              }`}>
                <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center font-black">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className={`text-[10px] font-bold ${isDark ? 'text-rose-300' : 'text-rose-900'}`}>Occupied</div>
                  <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {roomsLoading ? '—' : `${occupiedRoomCount} (${roomPercent(occupiedRoomCount)}%)`}
                  </div>
                </div>
              </div>

              {/* Card 3: Available */}
              <div className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
                isDark ? 'bg-emerald-950/40 border-emerald-900/60 text-emerald-200' : 'bg-[#f0fdf4] border-emerald-200'
              }`}>
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black">
                  <DoorOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className={`text-[10px] font-bold ${isDark ? 'text-emerald-300' : 'text-emerald-900'}`}>Available</div>
                  <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {roomsLoading ? '—' : `${availableRoomCount} (${roomPercent(availableRoomCount)}%)`}
                  </div>
                </div>
              </div>

              {/* Card 4: Cleaning */}
              <div className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
                isDark ? 'bg-amber-950/40 border-amber-900/60 text-amber-200' : 'bg-[#fefce8] border-amber-200'
              }`}>
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className={`text-[10px] font-bold ${isDark ? 'text-amber-300' : 'text-amber-900'}`}>Cleaning</div>
                  <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {roomsLoading ? '—' : `${cleaningRoomCount} (${roomPercent(cleaningRoomCount)}%)`}
                  </div>
                </div>
              </div>

              {/* Card 5: Maintenance */}
              <div className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
                isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-[#f8fafc] border-slate-300'
              }`}>
                <div className="w-10 h-10 rounded-xl bg-slate-600 text-white flex items-center justify-center font-black">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <div className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Maintenance</div>
                  <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {roomsLoading ? '—' : `${maintenanceRoomCount} (${roomPercent(maintenanceRoomCount)}%)`}
                  </div>
                </div>
              </div>

              {/* Card 6: Today's Revenue */}
              <div className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
                isDark ? 'bg-emerald-950/40 border-emerald-900/60 text-emerald-200' : 'bg-[#f0fdf4] border-emerald-200'
              }`}>
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <div className={`text-[10px] font-bold ${isDark ? 'text-emerald-300' : 'text-emerald-900'}`}>Today's Revenue</div>
                  <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {todayRevenue === null ? '—' : `₹${todayRevenue.toLocaleString('en-IN')}`}
                  </div>
                  <div className={`text-[9px] font-bold ${revenueGrowth !== null && revenueGrowth < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {revenueGrowth === null
                      ? 'Live payments'
                      : `${revenueGrowth >= 0 ? '↑' : '↓'} ${Math.abs(revenueGrowth)}% vs prior day`}
                  </div>
                </div>
              </div>

              {/* Card 7: Action Button + New Booking */}
              <button
                onClick={() => setActiveSidebarItem('Walk-in Check-in')}
                className="p-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-900/30 flex items-center justify-center gap-2 transition"
              >
                <Plus className="w-5 h-5" />
                <span>+ New Booking</span>
              </button>
            </div>

            {/* Middle Section: Room Overview Floor Grid (Left) + Selected Room Details (Right) */}
            <div className="grid grid-cols-12 gap-3 shrink-0">
              {/* Left / Center Floor Grid (8 Cols) */}
              <div className={`col-span-8 p-4 rounded-2xl border shadow-2xs space-y-4 ${
                isDark ? 'bg-[#141620] border-slate-800' : 'bg-white border-slate-200'
              }`}>
                {/* Header, Filters & View Toggle */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <h3 className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Room Overview</h3>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs font-bold">
                    {[
                      { label: 'All', count: rooms.length },
                      ...roomCategories.map((category) => ({
                        label: category,
                        count: rooms.filter((room) => room.category === category).length,
                      })),
                    ].map((c) => (
                      <button
                        key={c.label}
                        onClick={() => setRoomFilterCategory(c.label)}
                        className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                          roomFilterCategory === c.label
                            ? 'bg-blue-600 text-white'
                            : isDark
                            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {c.label} ({c.count})
                      </button>
                    ))}
                  </div>

                  {/* View Mode Buttons */}
                  <div className="flex items-center gap-1.5">
                    <button className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
                      isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                    }`}>
                      <span>Floor View</span>
                      <ChevronDown className="w-3 h-3 text-slate-500" />
                    </button>
                    <div className={`flex p-0.5 rounded-lg border ${
                      isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'
                    }`}>
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`p-1 rounded-md text-xs font-bold flex items-center gap-1 ${
                          viewMode === 'grid' ? 'bg-blue-600 text-white' : isDark ? 'text-slate-400' : 'text-slate-600'
                        }`}
                      >
                        <Grid className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Grid View</span>
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`p-1 rounded-md text-xs font-bold flex items-center gap-1 ${
                          viewMode === 'list' ? 'bg-blue-600 text-white' : isDark ? 'text-slate-400' : 'text-slate-600'
                        }`}
                      >
                        <List className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">List View</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Status Legend */}
                <div className={`flex items-center gap-4 text-xs font-semibold border-b pb-2 ${
                  isDark ? 'text-slate-400 border-slate-800' : 'text-slate-600 border-slate-100'
                }`}>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Available
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Occupied
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Cleaning
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Maintenance
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600" /> Out of Service
                  </span>
                </div>

                {/* Floors Rows */}
                <div className="space-y-4">
                  {roomsLoading ? (
                    <div className="py-10 text-center text-xs font-semibold text-slate-400">
                      Loading live room inventory…
                    </div>
                  ) : roomsError ? (
                    <div className="py-8 text-center text-xs text-rose-400">{roomsError}</div>
                  ) : rooms.length === 0 ? (
                    <div className="py-10 text-center text-xs font-semibold text-slate-400">
                      No rooms configured for this hotel yet.
                    </div>
                  ) : floorsList.map((floorName) => {
                    const floorRooms = rooms.filter(
                      (r) =>
                        r.floor === floorName &&
                        (roomFilterCategory === 'All' || r.category === roomFilterCategory)
                    );

                    return (
                      <div key={floorName} className="space-y-1.5">
                        <div className={`flex items-center justify-between text-xs font-black ${
                          isDark ? 'text-slate-300' : 'text-slate-700'
                        }`}>
                          <span>
                            {floorName} ({floorRooms.length} room{floorRooms.length === 1 ? '' : 's'})
                          </span>
                        </div>

                        {/* 8 Room Cards Row */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                          {floorRooms.map((room) => {
                            const isSelected = selectedRoom?.number === room.number;
                            return (
                              <button
                                key={room.number}
                                data-testid={`room-card-${room.number}`}
                                onClick={() => setSelectedRoom(room)}
                                className={`p-1.5 rounded-xl border text-center transition hover:scale-105 flex flex-col justify-between ${
                                  isSelected ? 'ring-2 ring-blue-600 shadow-md' : 'shadow-2xs'
                                } ${
                                  isDark ? 'bg-[#1c1f2e] border-slate-800' : 'bg-white border-slate-200'
                                }`}
                              >
                                {/* Thumbnail Image */}
                                <div className={`relative w-full h-11 rounded-lg overflow-hidden mb-1 ${
                                  isDark ? 'bg-slate-800' : 'bg-slate-100'
                                }`}>
                                  <img
                                    src={room.image}
                                    alt={room.number}
                                    className="w-full h-full object-cover"
                                  />
                                </div>

                                <div>
                                  <div className={`flex items-center justify-between text-[11px] font-black ${
                                    isDark ? 'text-white' : 'text-slate-900'
                                  }`}>
                                    <span>{room.number}</span>
                                    <span className={`text-[9px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>₹{room.price}</span>
                                  </div>
                                  <div className="text-[9px] text-slate-400 font-semibold truncate text-left">
                                    {room.category}
                                  </div>
                                </div>

                                <div
                                  className={`mt-1 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${getStatusColor(
                                    room.status
                                  )}`}
                                >
                                  {room.status}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Quick Actions & Selected Room Details (4 Cols) */}
              <div className="col-span-4 flex flex-col gap-3">
                {/* Quick Actions (6 Tiles) */}
                <div className={`p-3.5 rounded-2xl border shadow-2xs space-y-2 ${
                  isDark ? 'bg-[#141620] border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <h3 className={`font-black text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>Quick Actions</h3>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setActiveSidebarItem('Walk-in Check-in')}
                      className={`p-2 rounded-xl border text-center transition ${
                        isDark
                          ? 'bg-blue-950/40 border-blue-900/60 hover:bg-blue-900/50 text-blue-200'
                          : 'bg-blue-50/70 border-blue-200 hover:bg-blue-100 text-blue-900'
                      }`}
                    >
                      <Plus className="w-4 h-4 mx-auto text-blue-500 mb-0.5" />
                      <div className="text-[10px] font-bold">New Booking</div>
                    </button>

                    <button
                      onClick={() => setActiveSidebarItem('Walk-in Check-in')}
                      className={`p-2 rounded-xl border text-center transition ${
                        isDark
                          ? 'bg-emerald-950/40 border-emerald-900/60 hover:bg-emerald-900/50 text-emerald-200'
                          : 'bg-emerald-50/70 border-emerald-200 hover:bg-emerald-100 text-emerald-900'
                      }`}
                    >
                      <DoorOpen className="w-4 h-4 mx-auto text-emerald-500 mb-0.5" />
                      <div className="text-[10px] font-bold">Walk-in Check-in</div>
                    </button>

                    <button
                      onClick={() => setActiveSidebarItem('Check-in / Check-out')}
                      className={`p-2 rounded-xl border text-center transition ${
                        isDark
                          ? 'bg-orange-950/40 border-orange-900/60 hover:bg-orange-900/50 text-orange-200'
                          : 'bg-orange-50/70 border-orange-200 hover:bg-orange-100 text-orange-900'
                      }`}
                    >
                      <LogOut className="w-4 h-4 mx-auto text-orange-500 mb-0.5" />
                      <div className="text-[10px] font-bold">Room Check-out</div>
                    </button>

                    <button
                      onClick={() => setActiveSidebarItem('Check-in / Check-out')}
                      className={`p-2 rounded-xl border text-center transition ${
                        isDark
                          ? 'bg-purple-950/40 border-purple-900/60 hover:bg-purple-900/50 text-purple-200'
                          : 'bg-purple-50/70 border-purple-200 hover:bg-purple-100 text-purple-900'
                      }`}
                    >
                      <Clock className="w-4 h-4 mx-auto text-purple-400 mb-0.5" />
                      <div className="text-[10px] font-bold">Extend Stay</div>
                    </button>

                    <button
                      onClick={() => setActiveSidebarItem('Room Calendar')}
                      className={`p-2 rounded-xl border text-center transition ${
                        isDark
                          ? 'bg-pink-950/40 border-pink-900/60 hover:bg-pink-900/50 text-pink-200'
                          : 'bg-pink-50/70 border-pink-200 hover:bg-pink-100 text-pink-900'
                      }`}
                    >
                      <CalendarDays className="w-4 h-4 mx-auto text-pink-500 mb-0.5" />
                      <div className="text-[10px] font-bold">Booking Calendar</div>
                    </button>

                    <button
                      onClick={() => setActiveSidebarItem('Guest Management')}
                      className={`p-2 rounded-xl border text-center transition ${
                        isDark
                          ? 'bg-sky-950/40 border-sky-900/60 hover:bg-sky-900/50 text-sky-200'
                          : 'bg-sky-50/70 border-sky-200 hover:bg-sky-100 text-sky-900'
                      }`}
                    >
                      <Search className="w-4 h-4 mx-auto text-sky-400 mb-0.5" />
                      <div className="text-[10px] font-bold">Guest Search</div>
                    </button>
                  </div>
                </div>

                {/* Selected Room Details Card */}
                {selectedRoom && (
                  <div
                    data-testid="selected-room-details-card"
                    className={`p-3.5 rounded-2xl border shadow-2xs space-y-3 ${
                    isDark ? 'bg-[#141620] border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <h3 className={`font-black text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>Selected Room Details</h3>

                    {/* Banner Image with Status Badge */}
                    <div className={`relative rounded-xl overflow-hidden h-36 ${
                      isDark ? 'bg-slate-800' : 'bg-slate-100'
                    }`}>
                      <img
                        src={selectedRoom.image}
                        alt={selectedRoom.number}
                        className="w-full h-full object-cover"
                      />
                      <span
                        className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          selectedRoom.status === 'Available'
                            ? 'bg-emerald-500 text-white'
                            : selectedRoom.status === 'Occupied'
                            ? 'bg-rose-500 text-white'
                            : 'bg-amber-500 text-white'
                        }`}
                      >
                        {selectedRoom.status}
                      </span>
                    </div>

                    {/* Room Title & Pricing */}
                    <div>
                      <div className="flex items-center justify-between">
                        <span className={`font-black text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          Room {selectedRoom.number}
                        </span>
                        <span className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          ₹{selectedRoom.price.toLocaleString('en-IN')}{' '}
                          <span className={`text-[10px] font-normal ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>/ night</span>
                        </span>
                      </div>
                      <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{selectedRoom.category} Room</p>
                    </div>

                    {/* Specs Pills */}
                    <div className={`grid grid-cols-2 gap-1.5 text-[11px] font-semibold p-2 rounded-xl ${
                      isDark ? 'bg-slate-800/60 text-slate-300' : 'bg-slate-50 text-slate-600'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-500" />
                        <span>{selectedRoom.specs.guests} Guests</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Bed className="w-3.5 h-3.5 text-blue-500" />
                        <span>{selectedRoom.specs.bed}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-blue-500" />
                        <span>{selectedRoom.specs.view}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-blue-500" />
                        <span>{selectedRoom.specs.size}</span>
                      </div>
                    </div>

                    {/* Amenities Icons */}
                    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 border-t text-[11px] ${
                      isDark ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-600'
                    }`}>
                      {selectedRoom.amenities.length > 0 ? (
                        selectedRoom.amenities.slice(0, 6).map((amenity) => (
                          <span key={amenity} className="flex items-center gap-1">
                            • {amenity}
                          </span>
                        ))
                      ) : (
                        <span>No amenities configured for this room type.</span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-1.5 pt-1">
                      {selectedRoom.status === 'Occupied' ? (
                        <button
                          data-testid="btn-view-room-folio"
                          onClick={() => setShowRoomFolioModal(true)}
                          className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-md shadow-blue-950/30 flex items-center justify-center gap-1.5 transition"
                        >
                          <FileText className="w-4 h-4" />
                          <span>View Master Folio Ledger (Room {selectedRoom.number})</span>
                        </button>
                      ) : (
                        <button
                          data-testid="btn-start-walkin-checkin"
                          onClick={() => {
                            setActiveSidebarItem('Walk-in Check-in');
                            triggerToast(`Initiating reservation for Room ${selectedRoom.number}`);
                          }}
                          className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md shadow-emerald-950/30 flex items-center justify-center gap-1.5 transition"
                        >
                          <Check className="w-4 h-4" />
                          <span>Create Booking (Room {selectedRoom.number})</span>
                        </button>
                      )}

                      <button
                        onClick={() =>
                          triggerToast(
                            `Room ${selectedRoom.number}: ${selectedRoom.category}, ${selectedRoom.specs.guests} guests, ₹${selectedRoom.price}/night.`
                          )
                        }
                        className={`w-full py-1.5 rounded-xl border font-bold text-xs transition ${
                          isDark
                            ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                            : 'border-slate-300 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        View Room Details
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom 4 Operational Tables */}
            <div className="grid grid-cols-4 gap-3 shrink-0">
              {/* Table 1: Today's Check-ins */}
              <div className={`p-3 rounded-2xl border shadow-2xs space-y-2 ${
                isDark ? 'bg-[#141620] border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className={`flex items-center gap-1.5 text-xs font-black ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}>
                    <DoorOpen className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Today's Check-ins ({todaysCheckIns.length})</span>
                  </div>
                  <button
                    onClick={() => setActiveSidebarItem('Check-in / Check-out')}
                    className="text-[10px] font-bold text-blue-500 hover:underline cursor-pointer"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-1 text-[11px]">
                  {roomsLoading ? (
                    <p className="py-3 text-center text-slate-500">Loading…</p>
                  ) : todaysCheckIns.length === 0 ? (
                    <p className="py-3 text-center text-slate-500">No arrivals scheduled today.</p>
                  ) : todaysCheckIns.map((booking) => {
                    const checkedIn = booking.bookingStatus === 'CHECKED_IN';
                    return (
                      <div key={booking._id} className={`flex items-center justify-between py-0.5 border-b ${
                        isDark ? 'border-slate-800/80' : 'border-slate-50'
                      }`}>
                        <div className="min-w-0">
                          <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{booking.guestName || 'Guest'}</span>
                          <span className="text-slate-400 text-[10px] ml-1">Rm {bookingRoomNumber(booking) || '—'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-slate-400 text-[9px]">{timeLabel(booking.checkInDate)}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            checkedIn
                              ? isDark ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60' : 'bg-emerald-100 text-emerald-800'
                              : isDark ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {checkedIn ? 'Checked-in' : 'Arriving'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Table 2: Today's Check-outs */}
              <div className={`p-3 rounded-2xl border shadow-2xs space-y-2 ${
                isDark ? 'bg-[#141620] border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className={`flex items-center gap-1.5 text-xs font-black ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}>
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    <span>Today's Check-outs ({todaysCheckOuts.length})</span>
                  </div>
                  <button
                    onClick={() => setActiveSidebarItem('Check-in / Check-out')}
                    className="text-[10px] font-bold text-blue-500 hover:underline cursor-pointer"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-1 text-[11px]">
                  {roomsLoading ? (
                    <p className="py-3 text-center text-slate-500">Loading…</p>
                  ) : todaysCheckOuts.length === 0 ? (
                    <p className="py-3 text-center text-slate-500">No departures due today.</p>
                  ) : todaysCheckOuts.map((booking) => (
                    <div key={booking._id} className={`flex items-center justify-between py-0.5 border-b ${
                      isDark ? 'border-slate-800/80' : 'border-slate-50'
                    }`}>
                      <div className="min-w-0">
                        <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{booking.guestName || 'Guest'}</span>
                        <span className="text-slate-400 text-[10px] ml-1">Rm {bookingRoomNumber(booking) || '—'}</span>
                      </div>
                      <button
                        onClick={() => setActiveSidebarItem('Check-in / Check-out')}
                        className={`px-2 py-0.5 rounded font-bold text-[9px] transition ${
                          isDark
                            ? 'bg-blue-950/60 text-blue-300 hover:bg-blue-600 hover:text-white'
                            : 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white'
                        }`}
                      >
                        Check-out
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Table 3: Housekeeping Tasks */}
              <div className={`p-3 rounded-2xl border shadow-2xs space-y-2 ${
                isDark ? 'bg-[#141620] border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className={`flex items-center gap-1.5 text-xs font-black ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}>
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Housekeeping Tasks ({activeHousekeepingTasks.length})</span>
                  </div>
                  <button
                    onClick={() => setActiveSidebarItem('Housekeeping')}
                    className="text-[10px] font-bold text-blue-500 hover:underline cursor-pointer"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-1 text-[11px]">
                  {roomsLoading ? (
                    <p className="py-3 text-center text-slate-500">Loading…</p>
                  ) : activeHousekeepingTasks.length === 0 ? (
                    <p className="py-3 text-center text-slate-500">No active housekeeping tasks.</p>
                  ) : activeHousekeepingTasks.map((room) => (
                    <div key={room.taskId} className={`flex items-center justify-between py-0.5 border-b ${
                      isDark ? 'border-slate-800/80' : 'border-slate-50'
                    }`}>
                      <div className="min-w-0">
                        <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>Rm {room.number}</span>
                        <span className="text-slate-400 text-[10px] ml-1">
                          {(room.taskType || 'Housekeeping').replace(/_/g, ' ').toLowerCase()}
                        </span>
                      </div>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                        room.taskStatus === 'COMPLETED'
                          ? isDark ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60' : 'bg-emerald-100 text-emerald-800'
                          : room.taskStatus === 'IN_PROGRESS'
                            ? isDark ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60' : 'bg-amber-100 text-amber-800'
                            : isDark ? 'bg-rose-950/60 text-rose-300 border border-rose-800/60' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {(room.taskStatus || 'PENDING').replace(/_/g, ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Table 4: Recent Bookings */}
              <div className={`p-3 rounded-2xl border shadow-2xs space-y-2 ${
                isDark ? 'bg-[#141620] border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className={`flex items-center gap-1.5 text-xs font-black ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}>
                    <Calendar className="w-3.5 h-3.5 text-purple-400" />
                    <span>Recent Bookings</span>
                  </div>
                  <button
                    onClick={() => setActiveSidebarItem('Room Booking')}
                    className="text-[10px] font-bold text-blue-500 hover:underline cursor-pointer"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-1 text-[11px]">
                  {roomsLoading ? (
                    <p className="py-3 text-center text-slate-500">Loading…</p>
                  ) : recentBookings.length === 0 ? (
                    <p className="py-3 text-center text-slate-500">No bookings recorded yet.</p>
                  ) : recentBookings.map((booking) => (
                    <div key={booking._id} className={`flex items-center justify-between py-0.5 border-b ${
                      isDark ? 'border-slate-800/80' : 'border-slate-50'
                    }`}>
                      <div className="min-w-0">
                        <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{booking.guestName || 'Guest'}</span>
                        <span className="text-slate-400 text-[10px] ml-1">{booking.bookingNumber || '—'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-slate-400 text-[9px]">{dateLabel(booking.checkInDate)}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          booking.bookingStatus === 'CHECKED_IN'
                            ? isDark ? 'bg-blue-950/60 text-blue-300 border border-blue-800/60' : 'bg-blue-100 text-blue-800'
                            : isDark ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {(booking.bookingStatus || 'CONFIRMED').replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Feature Directory: Key Features (Room System) */}
            <div className={`px-5 py-3 border rounded-2xl shadow-2xs shrink-0 ${
              isDark ? 'bg-[#141620] border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className={`text-xs font-black mb-2 flex items-center gap-1.5 ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <span>Key Features (Room System)</span>
              </div>

              <div className="grid grid-cols-8 gap-2 text-[10px]">
                {/* 1: Room Booking */}
                <div
                  onClick={() => setActiveSidebarItem('Room Booking')}
                  className={`p-2 rounded-xl border space-y-1 cursor-pointer transition-all hover:scale-102 hover:border-blue-500 ${
                    isDark ? 'bg-[#1c1f2e] border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className={`font-black flex items-center gap-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <span>🏨 Room Booking</span>
                  </div>
                  <ul className={`space-y-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    <li>• Online & Walk-in Booking</li>
                    <li>• Booking Calendar</li>
                    <li>• Group Booking</li>
                    <li>• Advance Payment</li>
                  </ul>
                </div>

                {/* 2: Check-in / Check-out */}
                <div
                  onClick={() => setActiveSidebarItem('Check-in / Check-out')}
                  className={`p-2 rounded-xl border space-y-1 cursor-pointer transition-all hover:scale-102 hover:border-blue-500 ${
                    isDark ? 'bg-[#1c1f2e] border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className={`font-black flex items-center gap-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <span>🚪 Check-in / Check-out</span>
                  </div>
                  <ul className={`space-y-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    <li>• Quick Check-in (KYC)</li>
                    <li>• Guest ID Verification</li>
                    <li>• Early Check-in / Late</li>
                    <li>• Auto Room Allocation</li>
                  </ul>
                </div>

                {/* 3: Room Management */}
                <div
                  onClick={() => setActiveSidebarItem('Room Allocation')}
                  className={`p-2 rounded-xl border space-y-1 cursor-pointer transition-all hover:scale-102 hover:border-blue-500 ${
                    isDark ? 'bg-[#1c1f2e] border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className={`font-black flex items-center gap-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <span>🛏️ Room Management</span>
                  </div>
                  <ul className={`space-y-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    <li>• Room Types & Rates</li>
                    <li>• Seasonal Pricing</li>
                    <li>• Room Status & Availability</li>
                    <li>• Block Rooms / Hold</li>
                  </ul>
                </div>

                {/* 4: Guest Management */}
                <div
                  onClick={() => setActiveSidebarItem('Guest Management')}
                  className={`p-2 rounded-xl border space-y-1 cursor-pointer transition-all hover:scale-102 hover:border-blue-500 ${
                    isDark ? 'bg-[#1c1f2e] border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className={`font-black flex items-center gap-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <span>👤 Guest Management</span>
                  </div>
                  <ul className={`space-y-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    <li>• Guest Profiles</li>
                    <li>• Stay History (Current)</li>
                    <li>• Special Requests</li>
                    <li>• VIP / Corporate Guests</li>
                  </ul>
                </div>

                {/* 5: Housekeeping */}
                <div
                  onClick={() => setActiveSidebarItem('Housekeeping')}
                  className={`p-2 rounded-xl border space-y-1 cursor-pointer transition-all hover:scale-102 hover:border-blue-500 ${
                    isDark ? 'bg-[#1c1f2e] border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className={`font-black flex items-center gap-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <span>🧹 Housekeeping</span>
                  </div>
                  <ul className={`space-y-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    <li>• Cleaning Status</li>
                    <li>• Task Assignment</li>
                    <li>• Linen Management</li>
                    <li>• Room Inspection</li>
                  </ul>
                </div>

                {/* 6: Room Charges (F&B) */}
                <div
                  onClick={() => setActiveSidebarItem('Room Charges (F&B)')}
                  className={`p-2 rounded-xl border space-y-1 cursor-pointer transition-all hover:scale-102 hover:border-blue-500 ${
                    isDark ? 'bg-[#1c1f2e] border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className={`font-black flex items-center gap-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <span>🍽️ Room Charges (F&B)</span>
                  </div>
                  <ul className={`space-y-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    <li>• In-Room Dining Orders</li>
                    <li>• Mini Bar Consumption</li>
                    <li>• Extra Services</li>
                    <li>• Room-wise Billing</li>
                  </ul>
                </div>

                {/* 7: Reports */}
                <div
                  onClick={() => setActiveSidebarItem('Reports & Analytics')}
                  className={`p-2 rounded-xl border space-y-1 cursor-pointer transition-all hover:scale-102 hover:border-blue-500 ${
                    isDark ? 'bg-[#1c1f2e] border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className={`font-black flex items-center gap-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <span>📊 Reports</span>
                  </div>
                  <ul className={`space-y-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    <li>• Occupancy Reports</li>
                    <li>• Revenue Reports</li>
                    <li>• Room-wise Reports</li>
                    <li>• Guest Analysis</li>
                  </ul>
                </div>

                {/* 8: Settings */}
                <div
                  onClick={() => setActiveSidebarItem('Settings')}
                  className={`p-2 rounded-xl border space-y-1 cursor-pointer transition-all hover:scale-102 hover:border-blue-500 ${
                    isDark ? 'bg-[#1c1f2e] border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className={`font-black flex items-center gap-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <span>⚙️ Settings</span>
                  </div>
                  <ul className={`space-y-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    <li>• Room Types</li>
                    <li>• Amenities</li>
                    <li>• Tax & Charges</li>
                    <li>• Policies & Check-in Rules</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* QuickPolicyReferenceModal */}
        <QuickPolicyReferenceModal
          isOpen={isPolicyModalOpen}
          onClose={() => setIsPolicyModalOpen(false)}
          isDark={isDark}
        />

        {/* Master Folio Preview Modal for Occupied Rooms (Step 082) */}
        {showRoomFolioModal && (
          <div
            data-testid="folio-preview-modal"
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className="bg-[#0e111a] border border-blue-500/40 rounded-3xl p-7 max-w-lg w-full shadow-2xl space-y-5 text-left">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">
                    Master Folio Ledger
                  </span>
                  <h3 className="text-xl font-black text-white">FOLIO-201-9871</h3>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Folio Status: OPEN
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800">
                  <span className="text-zinc-500 block text-[10px]">Guest Name</span>
                  <strong data-testid="folio-guest-name" className="text-white text-sm">Rohit Sharma</strong>
                </div>
                <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800">
                  <span className="text-zinc-500 block text-[10px]">Room Number</span>
                  <strong className="text-white text-sm">Room 201 (Royal Heritage Suite)</strong>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="p-4 bg-zinc-900/80 rounded-2xl border border-zinc-800 space-y-2 text-xs">
                <div className="flex justify-between text-zinc-300">
                  <span>Room Accommodation Tariff (2 Nights @ ₹4,500)</span>
                  <span className="font-mono font-bold text-white">₹9,000.00</span>
                </div>
                <div className="flex justify-between text-zinc-400 text-[11px]">
                  <span>Statutory CGST 6% (SAC 9963)</span>
                  <span className="font-mono">₹540.00</span>
                </div>
                <div className="flex justify-between text-zinc-400 text-[11px]">
                  <span>Statutory SGST 6% (SAC 9963)</span>
                  <span className="font-mono">₹540.00</span>
                </div>
                <div data-testid="folio-room-service-charge" className="flex justify-between text-amber-300 text-xs py-1 border-t border-zinc-800/60 font-semibold">
                  <span>🍽️ In-Room Dining (Order #RS-930345)</span>
                  <span className="font-mono font-bold text-amber-400">+ ₹577.50</span>
                </div>
                <div className="border-t border-zinc-800 pt-2 flex justify-between text-white font-bold text-sm">
                  <span>Total Master Folio Bill</span>
                  <span className="font-mono text-emerald-400">₹10,657.50</span>
                </div>
                <div className="flex justify-between text-emerald-400 text-xs pt-1 border-t border-zinc-800/60">
                  <span>Advance Deposit Paid (UPI)</span>
                  <span className="font-mono font-bold">- ₹5,000.00</span>
                </div>
                <div className="flex justify-between text-amber-300 text-sm font-black pt-2 border-t border-zinc-700">
                  <span>Balance Due at Check-out</span>
                  <span className="font-mono text-amber-400">₹5,657.50</span>
                </div>
              </div>

              <button
                type="button"
                data-testid="btn-close-folio-modal"
                onClick={() => setShowRoomFolioModal(false)}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider transition"
              >
                Close Folio View
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
