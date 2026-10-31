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
  BookOpen,
  Camera,
  Upload
} from 'lucide-react';
import { LanguageToggle, I18nProvider } from '@spicehub/ui';
import { io } from 'socket.io-client';
import { env } from './config/env';
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

export interface ConciergeRequestItem {
  requestId: string;
  roomNumber: string;
  guestName: string;
  requestType: string;
  priority: string;
  status: string;
  notes?: string;
  createdAt?: string | Date;
}

function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;
    
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0.2, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch {}
}

export interface RoomGridItem {
  number: string;
  category: string;
  price: number;
  status: 'Available' | 'Occupied' | 'Cleaning' | 'Maintenance' | 'Out of Service' | 'DIRTY' | 'Reserved';
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
  if (status === 'RESERVED' || status === 'BOOKED' || status === 'PENDING_APPROVAL') return 'Reserved';
  if (status === 'DIRTY') return 'DIRTY';
  if (status === 'CLEANING') return 'Cleaning';
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
  const [liveFolioData, setLiveFolioData] = useState<any | null>(null);
  const [liveFolioLoading, setLiveFolioLoading] = useState(false);

  // Interactive Right Panel (Split View) States
  const [rightPanelTab, setRightPanelTab] = useState<'checkin' | 'details' | 'folio'>('details');
  const [checkInName, setCheckInName] = useState('Sunil Gavaskar');
  const [checkInPhone, setCheckInPhone] = useState('+91 98765 43210');
  const [checkInId, setCheckInId] = useState('9876 5432 1098');
  const [checkInNights, setCheckInNights] = useState('1');
  const [checkInAdvance, setCheckInAdvance] = useState('3500');
  const [dpdpConsent, setDpdpConsent] = useState(true);

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

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

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
      return raw ? (JSON.parse(raw) as { id?: string; _id?: string; name?: string; role?: string; avatarUrl?: string; email?: string }) : null;
    } catch {
      return null;
    }
  })();
  const operatorName = authUser?.name || 'Front Desk';
  const operatorRole = authUser?.role
    ? authUser.role.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
    : 'Front Desk';

  // Guest Concierge Requests State
  const [guestRequests, setGuestRequests] = useState<ConciergeRequestItem[]>([]);
  const [showGuestRequestsDrawer, setShowGuestRequestsDrawer] = useState(false);

  // Staff Profile Drawer State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [staffPhoto, setStaffPhoto] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('spicehub_staff_avatar') || authUser?.avatarUrl || '';
    }
    return '';
  });
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handleResolveConciergeRequest = async (requestId: string) => {
    try {
      const client = getApiClient();
      await client.request<any>('PATCH', `/api/v1/pms/frontdesk/concierge-requests/${requestId}`, {
        status: 'COMPLETED',
      });
      setGuestRequests((prev) =>
        prev.map((r) => (r.requestId === requestId ? { ...r, status: 'COMPLETED' } : r))
      );
      triggerToast('✅ Guest service request marked completed.');
    } catch {
      setGuestRequests((prev) =>
        prev.map((r) => (r.requestId === requestId ? { ...r, status: 'COMPLETED' } : r))
      );
      triggerToast('Guest service request updated.');
    }
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 400;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.82);
          setStaffPhoto(compressedBase64);
          if (typeof window !== 'undefined') {
            localStorage.setItem('spicehub_staff_avatar', compressedBase64);
            try {
              const current = JSON.parse(localStorage.getItem('spicehub_auth_user') || '{}');
              localStorage.setItem('spicehub_auth_user', JSON.stringify({ ...current, avatarUrl: compressedBase64 }));
            } catch {}
          }
          triggerToast('✅ Profile photo updated successfully!');
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
      localStorage.removeItem('spicehub_auth_user');
      localStorage.removeItem('auth_user');
      window.location.reload();
    }
  };

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

  useEffect(() => {
    if (!showRoomFolioModal || !selectedRoom?.number) return;
    let isCancelled = false;
    setLiveFolioLoading(true);
    getApiClient()
      .request<any>('GET', `/api/v1/pms/frontdesk/room-stay-details/${encodeURIComponent(selectedRoom.number)}`)
      .then((res) => {
        if (!isCancelled && res?.data) {
          setLiveFolioData(res.data);
        }
      })
      .catch(() => {
        if (!isCancelled) setLiveFolioData(null);
      })
      .finally(() => {
        if (!isCancelled) setLiveFolioLoading(false);
      });
    return () => {
      isCancelled = true;
    };
  }, [showRoomFolioModal, selectedRoom?.number]);

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
  }, [loadRooms, activeSidebarItem]);

  // Real-time Socket.IO Connection for Instant Status Sync & Concierge Chimes
  useEffect(() => {
    const effectiveHotelId = hotelId || env.hotelId || '';
    const socket = io(env.socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      timeout: 10000,
    });

    socket.on('connect', () => {
      if (effectiveHotelId) {
        socket.emit('join:room', `${effectiveHotelId}_pms`);
        socket.emit('join:room', `${effectiveHotelId}_frontdesk`);
        socket.emit('join:room', `${effectiveHotelId}_global`);
      }
    });

    socket.on('pms:concierge_request_created', (payload: any) => {
      playNotificationChime();
      setGuestRequests((prev) => [payload, ...prev.filter((r) => r.requestId !== payload.requestId)]);
      triggerToast(`🛎️ Room ${payload.roomNumber} (${payload.guestName}): ${payload.requestType}`);
    });

    socket.on('reception:new_checkin_request', (payload: any) => {
      playNotificationChime();
      triggerToast(`🔔 New Check-In Request: Room ${payload.roomNumber} - ${payload.guestName}`);
      void loadRooms();
    });

    socket.on('pms:room_status_changed', (payload: any) => {
      triggerToast(`Room ${payload.roomNumber} status: ${payload.status}`);
      void loadRooms();
    });

    socket.on('pms:booking_approved', (payload: any) => {
      triggerToast(`Room ${payload.roomNumber} Check-In Approved for ${payload.guestName}`);
      void loadRooms();
    });

    socket.on('pms:room_tariff_updated', (payload: any) => {
      triggerToast(`Tariff updated for ${payload.name || 'Room'}: ₹${payload.basePriceOvernight}/nt`);
      void loadRooms();
    });

    socket.on('staff:avatar_updated', (payload: any) => {
      if ((payload.userId === authUser?.id || payload.userId === authUser?._id) && payload.avatarUrl) {
        setStaffPhoto(payload.avatarUrl);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [hotelId, loadRooms, authUser?.id, authUser?._id]);

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
  const cleaningRoomCount = rooms.filter((room) => room.status === 'Cleaning' || room.status === 'DIRTY').length;
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
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800';
      case 'Occupied':
        return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800';
      case 'DIRTY':
      case 'Cleaning':
        return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800';
      case 'Reserved':
      case 'Maintenance':
        return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800';
      case 'Out of Service':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  return (
    <div className={`flex min-h-[100dvh] w-full overflow-x-hidden font-sans select-none antialiased transition-colors duration-200 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'
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
      {/* LEFT SIDEBAR: RESPONSIVE LUXURY BRANDED SHELL            */}
      {/* ======================================================== */}
      <aside className={`${
        isMobileMenuOpen ? 'flex fixed inset-y-0 left-0 z-50 w-64 shadow-sm dark:shadow-none' : 'hidden md:flex'
      } ${isSidebarCollapsed ? 'md:w-16' : 'md:w-60'} ${
        isDark ? 'bg-slate-950 text-slate-300 border-slate-800/80 shadow-sm dark:shadow-none' : 'bg-white text-slate-700 border-slate-200 shadow-md'
      } flex-col justify-between shrink-0 border-r z-20 transition-all duration-200`}>
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo & Header */}
          <div className={`p-4 flex items-center gap-3 border-b ${isDark ? 'border-slate-800/80' : 'border-slate-100'}`}>
            <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <Building className="w-5 h-5 text-white" />
            </div>
            {(!isSidebarCollapsed || isMobileMenuOpen) && (
              <div className="truncate">
                <div className={`font-black text-lg tracking-tight flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  SpiceHub
                </div>
                <p className="text-[11px] text-amber-600 font-bold tracking-wider">Hotel & Restaurant</p>
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
                      : isDark
                      ? 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                  {(!isSidebarCollapsed || isMobileMenuOpen) && <span className="truncate">{item.label}</span>}
                  {(!isSidebarCollapsed || isMobileMenuOpen) && isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto text-blue-200" />}
                </button>
              );
            })}
          </nav>

          {/* Bottom Card: Hotel Photo Banner + Receptionist Profile */}
          <div className={`p-3 border-t space-y-2.5 ${isDark ? 'border-slate-800/80 bg-slate-950' : 'border-slate-100 bg-slate-50'}`}>
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
                <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ${isDark ? 'ring-[#090b10]' : 'ring-white'}`} />
              </div>
              <div className="min-w-0">
                <div className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{operatorName}</div>
                <div className={`text-[10px] flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {operatorRole} <span className="text-emerald-500 font-bold">● Online</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* MAIN VIEWPORT: ROOM SYSTEM & FRONT DESK OPERATIONS       */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col min-h-0 w-full overflow-y-auto">
        {/* Top Header Bar */}
        <header className={`px-3 sm:px-5 py-2.5 border-b flex items-center justify-between shrink-0 shadow-xs z-10 transition-colors ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
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
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center">
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

            {/* Live Guest Requests Button with Badge */}
            <button
              data-testid="concierge-requests-btn"
              onClick={() => setShowGuestRequestsDrawer(true)}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition shadow-xs ${
                guestRequests.filter((r) => r.status !== 'COMPLETED').length > 0
                  ? 'bg-amber-500/20 text-amber-500 border-amber-500/40 animate-pulse'
                  : isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
              title="Open Live Guest Requests Panel"
            >
              <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Guest Requests</span>
              {guestRequests.filter((r) => r.status !== 'COMPLETED').length > 0 && (
                <span className="min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center">
                  {guestRequests.filter((r) => r.status !== 'COMPLETED').length}
                </span>
              )}
            </button>

            {/* Bilingual English / Hindi Language Toggle */}
            <LanguageToggle isDark={isDark} />

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

            {/* Staff Profile Button */}
            <button
              data-testid="staff-profile-btn"
              onClick={() => setShowProfileModal(true)}
              className={`flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border transition hover:ring-2 hover:ring-amber-500/40 ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}
              title="Open Staff Profile & Camera Photo Upload"
            >
              <div className="w-6 h-6 rounded-full overflow-hidden bg-amber-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                {staffPhoto ? (
                  <img src={staffPhoto} alt={operatorName} className="w-full h-full object-cover" />
                ) : (
                  operatorName.charAt(0).toUpperCase()
                )}
              </div>
              <span className="text-xs font-bold truncate max-w-[90px] sm:max-w-none">{operatorName}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
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
              isDark={isDark}
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
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-7 gap-2.5 sm:gap-3 shrink-0">
              {/* Card 1: Total Rooms */}
              <div className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-colors ${
                isDark ? 'bg-blue-950/40 border-blue-900/60 text-blue-200' : 'bg-blue-50/70 border-blue-100 text-blue-950 shadow-2xs'
              }`}>
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shrink-0">
                  <Bed className="w-5 h-5" />
                </div>
                <div>
                  <div className={`text-[10px] font-bold ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>Total Rooms</div>
                  <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    {roomsLoading ? '—' : totalRoomCount}
                  </div>
                </div>
              </div>

              {/* Card 2: Occupied */}
              <div className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-colors ${
                isDark ? 'bg-red-950/40 border-red-900/60 text-red-200' : 'bg-red-50/70 border-red-100 text-red-950 shadow-2xs'
              }`}>
                <div className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center font-black shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className={`text-[10px] font-bold ${isDark ? 'text-red-300' : 'text-red-700'}`}>Occupied</div>
                  <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    {roomsLoading ? '—' : `${occupiedRoomCount} (${roomPercent(occupiedRoomCount)}%)`}
                  </div>
                </div>
              </div>

              {/* Card 3: Available */}
              <div className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-colors ${
                isDark ? 'bg-emerald-950/40 border-emerald-900/60 text-emerald-200' : 'bg-emerald-50/70 border-emerald-100 text-emerald-950 shadow-2xs'
              }`}>
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0">
                  <DoorOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className={`text-[10px] font-bold ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>Available</div>
                  <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    {roomsLoading ? '—' : `${availableRoomCount} (${roomPercent(availableRoomCount)}%)`}
                  </div>
                </div>
              </div>

              {/* Card 4: Cleaning */}
              <div className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-colors ${
                isDark ? 'bg-amber-950/40 border-amber-900/60 text-amber-200' : 'bg-amber-50/70 border-amber-100 text-amber-950 shadow-2xs'
              }`}>
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className={`text-[10px] font-bold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>Cleaning</div>
                  <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    {roomsLoading ? '—' : `${cleaningRoomCount} (${roomPercent(cleaningRoomCount)}%)`}
                  </div>
                </div>
              </div>

              {/* Card 5: Maintenance */}
              <div className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-colors ${
                isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200/80 text-slate-900 shadow-2xs'
              }`}>
                <div className="w-10 h-10 rounded-xl bg-slate-600 text-white flex items-center justify-center font-black shrink-0">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <div className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Maintenance</div>
                  <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    {roomsLoading ? '—' : `${maintenanceRoomCount} (${roomPercent(maintenanceRoomCount)}%)`}
                  </div>
                </div>
              </div>

              {/* Card 6: Today's Revenue */}
              <div className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-colors ${
                isDark ? 'bg-emerald-950/40 border-emerald-900/60 text-emerald-200' : 'bg-emerald-50/70 border-emerald-100 text-emerald-950 shadow-2xs'
              }`}>
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <div className={`text-[10px] font-bold ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>Today's Revenue</div>
                  <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    {todayRevenue === null ? '—' : `₹${todayRevenue.toLocaleString('en-IN')}`}
                  </div>
                  <div className={`text-[9px] font-bold ${revenueGrowth !== null && revenueGrowth < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                    {revenueGrowth === null
                      ? 'Live payments'
                      : `${revenueGrowth >= 0 ? '↑' : '↓'} ${Math.abs(revenueGrowth)}% vs prior day`}
                  </div>
                </div>
              </div>

              {/* Card 7: Action Button + New Booking (Full width on mobile 2-col) */}
              <button
                data-testid="btn-new-booking-top"
                onClick={() => {
                  setRightPanelTab('checkin');
                  if (!selectedRoom || selectedRoom.status !== 'Available') {
                    const firstAvailable = rooms.find((r) => r.status === 'Available');
                    if (firstAvailable) setSelectedRoom(firstAvailable);
                  }
                  triggerToast('Opening Check-In Form in the interactive booking panel');
                }}
                className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                <span>+ New Booking</span>
              </button>
            </div>

            {/* Middle Section: Split-screen layout (Mobile stacked, Tablet/Laptop Split View) */}
            <div data-testid="pms-split-container" className="flex flex-col lg:flex lg:flex-row lg:h-screen lg:overflow-hidden gap-4 min-h-0">
              {/* Left Side (lg:w-1/2): PMS Room Matrix (grid) */}
              <div data-testid="pms-room-matrix" className={`w-full lg:w-1/2 p-4 rounded-2xl border shadow-sm space-y-4 overflow-y-auto custom-scrollbar ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                {/* Header, Filters & View Toggle */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <h3 className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>Room Overview</h3>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs font-bold max-w-full">
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
                            ? 'bg-blue-600 text-white shadow-xs'
                            : isDark
                            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80'
                        }`}
                      >
                        {c.label} ({c.count})
                      </button>
                    ))}
                  </div>

                  {/* View Mode Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
                      isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100/80 text-slate-700'
                    }`}>
                      <span>Floor View</span>
                      <ChevronDown className="w-3 h-3 text-slate-500" />
                    </button>
                    <div className={`flex p-0.5 rounded-lg border ${
                      isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100/80 border-slate-200/80'
                    }`}>
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`p-1 rounded-md text-xs font-bold flex items-center gap-1 ${
                          viewMode === 'grid' ? 'bg-blue-600 text-white shadow-xs' : isDark ? 'text-slate-400' : 'text-slate-600'
                        }`}
                      >
                        <Grid className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Grid View</span>
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`p-1 rounded-md text-xs font-bold flex items-center gap-1 ${
                          viewMode === 'list' ? 'bg-blue-600 text-white shadow-xs' : isDark ? 'text-slate-400' : 'text-slate-600'
                        }`}
                      >
                        <List className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">List View</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Status Legend */}
                <div className={`flex items-center gap-4 text-xs font-semibold border-b pb-2 flex-wrap ${
                  isDark ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-200'
                }`}>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Green = Available
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Red = Occupied
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Yellow = Dirty
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Blue = Clean / Reserved
                  </span>
                </div>

                {/* Floors Rows */}
                <div className="space-y-4">
                  {roomsLoading ? (
                    <div className="py-10 text-center text-xs font-semibold text-slate-400">
                      Loading live room inventory…
                    </div>
                  ) : roomsError ? (
                    <div className="py-8 text-center text-xs text-red-400">{roomsError}</div>
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

                        {/* Responsive Room Cards Row: 3 cols on mobile/tablet, 4 cols on desktop */}
                        <div className="grid grid-cols-3 lg:grid-cols-4 gap-3">
                          {floorRooms.map((room) => {
                            const isSelected = selectedRoom?.number === room.number;
                            return (
                              <button
                                key={room.number}
                                data-testid={`room-card-${room.number}`}
                                onClick={() => {
                                  setSelectedRoom(room);
                                  if (room.status === 'Occupied') {
                                    setRightPanelTab('folio');
                                  } else {
                                    setRightPanelTab('checkin');
                                  }
                                }}
                                className={`p-1.5 rounded-xl border text-center transition hover:scale-105 flex flex-col justify-between ${
                                  isSelected ? 'ring-2 ring-slate-900 dark:ring-white shadow-md' : 'shadow-2xs'
                                } ${
                                  isDark ? 'bg-slate-800 border-slate-800' : 'bg-white border-slate-200/90 hover:border-slate-300'
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
                                    isDark ? 'text-white' : 'text-slate-800'
                                  }`}>
                                    <span>{room.number}</span>
                                    <span className={`text-[9px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>₹{room.price}</span>
                                  </div>
                                  <div className="text-[9px] text-slate-400 font-medium truncate text-left">
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

              {/* Right Side (lg:w-1/2): Interactive Details / Booking Panel (border-l border-slate-200 dark:border-slate-800 p-4 overflow-y-auto) */}
              <div
                data-testid="pms-interactive-panel"
                className={`w-full lg:w-1/2 flex flex-col gap-4 overflow-y-auto custom-scrollbar border-l border-slate-200 dark:border-slate-800 p-4 rounded-2xl ${
                  isDark ? 'bg-slate-900/60' : 'bg-slate-50/70'
                }`}
              >
                {/* Header Switcher Tabs */}
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <button
                      data-testid="tab-right-checkin"
                      onClick={() => setRightPanelTab('checkin')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        rightPanelTab === 'checkin'
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                          : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Check-In Form {selectedRoom ? `(Room ${selectedRoom.number})` : ''}
                    </button>
                    <button
                      data-testid="tab-right-folio"
                      onClick={() => setRightPanelTab('folio')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        rightPanelTab === 'folio'
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                          : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Folio Ledger & Details
                    </button>
                  </div>
                  {selectedRoom && (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(selectedRoom.status)}`}>
                      {selectedRoom.status}
                    </span>
                  )}
                </div>

                {/* VIEW 1: CHECK-IN FORM (When + New Booking or Available Room is clicked) */}
                {rightPanelTab === 'checkin' && (
                  <div
                    data-testid="pms-checkin-form"
                    className="p-4 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          Express Guest Check-In
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Allocated Room: <strong className={isDark ? 'text-white' : 'text-slate-900'}>Room {selectedRoom?.number || '101'}</strong> ({selectedRoom?.category || 'Deluxe Room'}) • ₹{selectedRoom?.price || 3500}/night
                        </p>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center font-bold">
                        <DoorOpen className="w-4 h-4" />
                      </div>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!dpdpConsent) {
                          triggerToast('Please complete statutory DPDP Act 2023 consent checkbox.');
                          return;
                        }
                        const targetRoomNum = selectedRoom?.number || '101';
                        setRooms((prev) =>
                          prev.map((r) =>
                            r.number === targetRoomNum
                              ? { ...r, status: 'Occupied', guestName: checkInName }
                              : r
                          )
                        );
                        if (selectedRoom) {
                          setSelectedRoom({
                            ...selectedRoom,
                            status: 'Occupied',
                            guestName: checkInName,
                          });
                        }
                        triggerToast(`Guest ${checkInName} checked in to Room ${targetRoomNum} successfully!`);
                        setRightPanelTab('folio');
                      }}
                      className="space-y-3"
                    >
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Guest Full Name *
                        </label>
                        <input
                          data-testid="input-guest-name"
                          type="text"
                          required
                          value={checkInName}
                          onChange={(e) => setCheckInName(e.target.value)}
                          placeholder="e.g. Sunil Gavaskar"
                          className={`w-full h-11 rounded-lg border border-slate-300 dark:border-slate-700 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 transition ${
                            isDark ? 'bg-slate-800 text-white placeholder-slate-500' : 'bg-white text-slate-900 placeholder-slate-400'
                          }`}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Phone Number *
                          </label>
                          <input
                            data-testid="input-guest-phone"
                            type="tel"
                            required
                            value={checkInPhone}
                            onChange={(e) => setCheckInPhone(e.target.value)}
                            placeholder="+91 98765 43210"
                            className={`w-full h-11 rounded-lg border border-slate-300 dark:border-slate-700 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 transition ${
                              isDark ? 'bg-slate-800 text-white placeholder-slate-500' : 'bg-white text-slate-900 placeholder-slate-400'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Aadhaar / ID Number *
                          </label>
                          <input
                            data-testid="input-guest-id"
                            type="text"
                            required
                            value={checkInId}
                            onChange={(e) => setCheckInId(e.target.value)}
                            placeholder="XXXX XXXX 1098"
                            className={`w-full h-11 rounded-lg border border-slate-300 dark:border-slate-700 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 transition ${
                              isDark ? 'bg-slate-800 text-white placeholder-slate-500' : 'bg-white text-slate-900 placeholder-slate-400'
                            }`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Number of Nights
                          </label>
                          <input
                            data-testid="input-stay-nights"
                            type="number"
                            min="1"
                            max="30"
                            value={checkInNights}
                            onChange={(e) => setCheckInNights(e.target.value)}
                            className={`w-full h-11 rounded-lg border border-slate-300 dark:border-slate-700 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 transition ${
                              isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Advance Amount Paid (₹)
                          </label>
                          <input
                            data-testid="input-advance-amount"
                            type="number"
                            min="0"
                            value={checkInAdvance}
                            onChange={(e) => setCheckInAdvance(e.target.value)}
                            className={`w-full h-11 rounded-lg border border-slate-300 dark:border-slate-700 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 transition ${
                              isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'
                            }`}
                          />
                        </div>
                      </div>

                      {/* DPDP Act 2023 Statutory Consent Checkbox */}
                      <div className={`p-3 rounded-lg border flex items-start gap-2.5 ${
                        isDark ? 'bg-slate-800/60 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}>
                        <input
                          data-testid="checkbox-dpdp-consent"
                          id="dpdpConsentCheck"
                          type="checkbox"
                          checked={dpdpConsent}
                          onChange={(e) => setDpdpConsent(e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500 cursor-pointer"
                        />
                        <label htmlFor="dpdpConsentCheck" className="text-xs leading-relaxed cursor-pointer select-none">
                          I declare that guest identity & Aadhaar/Govt ID have been verified under the{' '}
                          <strong>Digital Personal Data Protection (DPDP) Act 2023</strong> for statutory guest registry and hotel safety compliance.
                        </label>
                      </div>

                      {/* Check-In Action Button */}
                      <button
                        type="submit"
                        data-testid="btn-checkin-submit"
                        className="h-12 w-full rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>Check-In Guest (Room {selectedRoom?.number || '101'})</span>
                      </button>
                    </form>
                  </div>
                )}

                {/* VIEW 2: FOLIO LEDGER & ROOM DETAILS */}
                {rightPanelTab === 'folio' && (
                  <div className="space-y-4">
                    {/* Folio Ledger Card */}
                    <div
                      data-testid="folio-ledger-card"
                      className="p-4 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Master Folio Ledger
                          </span>
                          <h4 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {liveFolioData?.folio?.folioNumber || `FOLIO-${selectedRoom?.number || '101'}-9871`}
                          </h4>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
                          Status: OPEN
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className={`p-2.5 rounded-lg border ${
                          isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Guest Name</span>
                          <strong className={isDark ? 'text-white' : 'text-slate-900'}>
                            {selectedRoom?.guestName || 'Rahul Verma'}
                          </strong>
                        </div>
                        <div className={`p-2.5 rounded-lg border ${
                          isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Room Allocation</span>
                          <strong className={isDark ? 'text-white' : 'text-slate-900'}>
                            Room {selectedRoom?.number || '101'} ({selectedRoom?.category || 'Deluxe Room'})
                          </strong>
                        </div>
                      </div>

                      {/* Line Items */}
                      <div className="space-y-1.5 text-xs pt-1 border-t border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                          <span>Room Tariff (1 Night)</span>
                          <span className="font-semibold text-slate-900 dark:text-white">₹{selectedRoom?.price || 3500}</span>
                        </div>
                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                          <span>Statutory GST (12%)</span>
                          <span className="font-semibold text-slate-900 dark:text-white">₹{((selectedRoom?.price || 3500) * 0.12).toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                          <span>In-Room Dining / KOT Charges</span>
                          <span className="font-semibold text-slate-900 dark:text-white">₹450</span>
                        </div>
                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                          <span>Advance Deposit Credited</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">-₹{selectedRoom?.price || 3500}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800 font-bold">
                          <span className={isDark ? 'text-white' : 'text-slate-900'}>Net Balance Due</span>
                          <span className="text-base text-red-600 dark:text-red-400">
                            ₹{(((selectedRoom?.price || 3500) * 0.12) + 450).toFixed(0)}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 flex flex-col sm:flex-row gap-2">
                        <button
                          data-testid="btn-folio-settle"
                          onClick={() => setShowRoomFolioModal(true)}
                          className="flex-1 h-11 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
                        >
                          <CreditCard className="w-4 h-4" />
                          <span>Settle Folio & Check-out</span>
                        </button>
                        <button
                          onClick={() => triggerToast(`Receipt generated for Room ${selectedRoom?.number || '101'}`)}
                          className={`px-4 h-11 rounded-lg border font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                            isDark ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <FileText className="w-4 h-4" />
                          <span>Print Folio</span>
                        </button>
                      </div>
                    </div>

                    {/* Room Details & Amenities */}
                    {selectedRoom && (
                      <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                        <div className="relative rounded-lg overflow-hidden h-32 bg-slate-100 dark:bg-slate-800">
                          <img
                            src={selectedRoom.image}
                            alt={selectedRoom.number}
                            className="w-full h-full object-cover"
                          />
                          <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(selectedRoom.status)}`}>
                            {selectedRoom.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            Room {selectedRoom.number} ({selectedRoom.category})
                          </span>
                          <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            ₹{selectedRoom.price.toLocaleString('en-IN')}/night
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600 dark:text-slate-400">
                          <div>• {selectedRoom.specs.guests} Guests Max</div>
                          <div>• {selectedRoom.specs.bed}</div>
                          <div>• {selectedRoom.specs.view}</div>
                          <div>• {selectedRoom.specs.size}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom 4 Operational Tables */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {/* Table 1: Today's Check-ins */}
              <div className={`p-3 rounded-2xl border shadow-2xs space-y-2 ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'
              }`}>
                <div className="flex items-center justify-between">
                  <div className={`flex items-center gap-1.5 text-xs font-black ${
                    isDark ? 'text-white' : 'text-slate-800'
                  }`}>
                    <DoorOpen className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Today's Check-ins ({todaysCheckIns.length})</span>
                  </div>
                  <button
                    onClick={() => setActiveSidebarItem('Check-in / Check-out')}
                    className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-1 text-[11px]">
                  {roomsLoading ? (
                    <p className="py-3 text-center text-slate-400">Loading…</p>
                  ) : todaysCheckIns.length === 0 ? (
                    <p className="py-3 text-center text-slate-400">No arrivals scheduled today.</p>
                  ) : todaysCheckIns.map((booking) => {
                    const checkedIn = booking.bookingStatus === 'CHECKED_IN';
                    return (
                      <div key={booking._id} className={`flex items-center justify-between py-1 border-b ${
                        isDark ? 'border-slate-800/80' : 'border-slate-100'
                      }`}>
                        <div className="min-w-0">
                          <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{booking.guestName || 'Guest'}</span>
                          <span className="text-slate-500 text-[10px] ml-1">Rm {bookingRoomNumber(booking) || '—'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-slate-400 text-[9px]">{timeLabel(booking.checkInDate)}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            checkedIn
                              ? isDark ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                              : isDark ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60' : 'bg-amber-50 text-amber-700 border border-amber-200/80'
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
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'
              }`}>
                <div className="flex items-center justify-between">
                  <div className={`flex items-center gap-1.5 text-xs font-black ${
                    isDark ? 'text-white' : 'text-slate-800'
                  }`}>
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    <span>Today's Check-outs ({todaysCheckOuts.length})</span>
                  </div>
                  <button
                    onClick={() => setActiveSidebarItem('Check-in / Check-out')}
                    className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-1 text-[11px]">
                  {roomsLoading ? (
                    <p className="py-3 text-center text-slate-400">Loading…</p>
                  ) : todaysCheckOuts.length === 0 ? (
                    <p className="py-3 text-center text-slate-400">No departures due today.</p>
                  ) : todaysCheckOuts.map((booking) => (
                    <div key={booking._id} className={`flex items-center justify-between py-1 border-b ${
                      isDark ? 'border-slate-800/80' : 'border-slate-100'
                    }`}>
                      <div className="min-w-0">
                        <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{booking.guestName || 'Guest'}</span>
                        <span className="text-slate-500 text-[10px] ml-1">Rm {bookingRoomNumber(booking) || '—'}</span>
                      </div>
                      <button
                        onClick={() => setActiveSidebarItem('Check-in / Check-out')}
                        className={`px-2 py-0.5 rounded font-bold text-[9px] transition ${
                          isDark
                            ? 'bg-blue-950/60 text-blue-300 hover:bg-blue-600 hover:text-white'
                            : 'bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200/80'
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
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'
              }`}>
                <div className="flex items-center justify-between">
                  <div className={`flex items-center gap-1.5 text-xs font-black ${
                    isDark ? 'text-white' : 'text-slate-800'
                  }`}>
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Housekeeping Tasks ({activeHousekeepingTasks.length})</span>
                  </div>
                  <button
                    onClick={() => setActiveSidebarItem('Housekeeping')}
                    className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-1 text-[11px]">
                  {roomsLoading ? (
                    <p className="py-3 text-center text-slate-400">Loading…</p>
                  ) : activeHousekeepingTasks.length === 0 ? (
                    <p className="py-3 text-center text-slate-400">No active housekeeping tasks.</p>
                  ) : activeHousekeepingTasks.map((room) => (
                    <div key={room.taskId} className={`flex items-center justify-between py-1 border-b ${
                      isDark ? 'border-slate-800/80' : 'border-slate-100'
                    }`}>
                      <div className="min-w-0">
                        <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Rm {room.number}</span>
                        <span className="text-slate-500 text-[10px] ml-1">
                          {(room.taskType || 'Housekeeping').replace(/_/g, ' ').toLowerCase()}
                        </span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        room.taskStatus === 'COMPLETED'
                          ? isDark ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                          : room.taskStatus === 'IN_PROGRESS'
                            ? isDark ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60' : 'bg-amber-50 text-amber-700 border border-amber-200/80'
                            : isDark ? 'bg-red-950/60 text-red-300 border border-red-800/60' : 'bg-red-50 text-red-700 border border-red-200/80'
                      }`}>
                        {(room.taskStatus || 'PENDING').replace(/_/g, ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Table 4: Recent Bookings */}
              <div className={`p-3 rounded-2xl border shadow-2xs space-y-2 ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'
              }`}>
                <div className="flex items-center justify-between">
                  <div className={`flex items-center gap-1.5 text-xs font-black ${
                    isDark ? 'text-white' : 'text-slate-800'
                  }`}>
                    <Calendar className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                    <span>Recent Bookings</span>
                  </div>
                  <button
                    onClick={() => setActiveSidebarItem('Room Booking')}
                    className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-1 text-[11px]">
                  {roomsLoading ? (
                    <p className="py-3 text-center text-slate-400">Loading…</p>
                  ) : recentBookings.length === 0 ? (
                    <p className="py-3 text-center text-slate-400">No bookings recorded yet.</p>
                  ) : recentBookings.map((booking) => (
                    <div key={booking._id} className={`flex items-center justify-between py-1 border-b ${
                      isDark ? 'border-slate-800/80' : 'border-slate-100'
                    }`}>
                      <div className="min-w-0">
                        <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{booking.guestName || 'Guest'}</span>
                        <span className="text-slate-500 text-[10px] ml-1">{booking.bookingNumber || '—'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-slate-400 text-[9px]">{dateLabel(booking.checkInDate)}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          booking.bookingStatus === 'CHECKED_IN'
                            ? isDark ? 'bg-blue-950/60 text-blue-300 border border-blue-800/60' : 'bg-blue-50 text-blue-700 border border-blue-200/80'
                            : isDark ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
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
            <div className={`px-4 sm:px-5 py-3 border rounded-2xl shadow-2xs shrink-0 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'
            }`}>
              <div className={`text-xs font-black mb-2 flex items-center gap-1.5 ${
                isDark ? 'text-white' : 'text-slate-800'
              }`}>
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <span>Key Features (Room System)</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-[10px]">
                {/* 1: Room Booking */}
                <div
                  onClick={() => setActiveSidebarItem('Room Booking')}
                  className={`p-2 rounded-xl border space-y-1 cursor-pointer transition-all hover:scale-102 hover:border-blue-500 ${
                    isDark ? 'bg-slate-800 border-slate-800' : 'bg-slate-50/80 border-slate-200/70 hover:bg-slate-100/70'
                  }`}
                >
                  <div className={`font-black flex items-center gap-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>
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
                    isDark ? 'bg-slate-800 border-slate-800' : 'bg-slate-50/80 border-slate-200/70 hover:bg-slate-100/70'
                  }`}
                >
                  <div className={`font-black flex items-center gap-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>
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
                    isDark ? 'bg-slate-800 border-slate-800' : 'bg-slate-50/80 border-slate-200/70 hover:bg-slate-100/70'
                  }`}
                >
                  <div className={`font-black flex items-center gap-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>
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
                    isDark ? 'bg-slate-800 border-slate-800' : 'bg-slate-50/80 border-slate-200/70 hover:bg-slate-100/70'
                  }`}
                >
                  <div className={`font-black flex items-center gap-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>
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
                    isDark ? 'bg-slate-800 border-slate-800' : 'bg-slate-50/80 border-slate-200/70 hover:bg-slate-100/70'
                  }`}
                >
                  <div className={`font-black flex items-center gap-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>
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
                    isDark ? 'bg-slate-800 border-slate-800' : 'bg-slate-50/80 border-slate-200/70 hover:bg-slate-100/70'
                  }`}
                >
                  <div className={`font-black flex items-center gap-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>
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
                    isDark ? 'bg-slate-800 border-slate-800' : 'bg-slate-50/80 border-slate-200/70 hover:bg-slate-100/70'
                  }`}
                >
                  <div className={`font-black flex items-center gap-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>
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
                    isDark ? 'bg-slate-800 border-slate-800' : 'bg-slate-50/80 border-slate-200/70 hover:bg-slate-100/70'
                  }`}
                >
                  <div className={`font-black flex items-center gap-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>
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
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
          >
            <div className={`border rounded-3xl p-5 sm:p-7 max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-sm dark:shadow-none space-y-4 sm:space-y-5 text-left transition-colors ${
              isDark ? 'bg-slate-900 border-blue-500/40 text-white' : 'bg-white border-slate-200/80 text-slate-800 shadow-xl'
            }`}>
              <div className={`flex items-center justify-between border-b pb-3 ${
                isDark ? 'border-zinc-800' : 'border-slate-100'
              }`}>
                <div>
                  <span className={`text-[10px] font-black uppercase tracking-wider ${
                    isDark ? 'text-blue-400' : 'text-blue-600'
                  }`}>
                    Master Folio Ledger
                  </span>
                  <h3 className={`text-xl font-black ${
                    isDark ? 'text-white' : 'text-slate-800'
                  }`}>
                    {liveFolioData?.folio?.folioNumber || `FOLIO-${selectedRoom?.number || '101'}-9871`}
                  </h3>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  isDark
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  Folio Status: {liveFolioData?.folio?.folioStatus || 'OPEN'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 text-xs">
                <div className={`p-3 rounded-xl border ${
                  isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-slate-50 border-slate-200/80'
                }`}>
                  <span className={`block text-[10px] font-bold ${
                    isDark ? 'text-zinc-500' : 'text-slate-500'
                  }`}>Guest Name</span>
                  <strong data-testid="folio-guest-name" className={`text-sm ${
                    isDark ? 'text-white' : 'text-slate-800'
                  }`}>
                    {liveFolioData?.stay?.guestName || selectedRoom?.guestName || 'Rahul Verma'}
                  </strong>
                </div>
                <div className={`p-3 rounded-xl border ${
                  isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-slate-50 border-slate-200/80'
                }`}>
                  <span className={`block text-[10px] font-bold ${
                    isDark ? 'text-zinc-500' : 'text-slate-500'
                  }`}>Room Number</span>
                  <strong className={`text-sm ${
                    isDark ? 'text-white' : 'text-slate-800'
                  }`}>
                    Room {selectedRoom?.number || '101'} ({selectedRoom?.category || 'Deluxe Room'})
                  </strong>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className={`p-4 rounded-2xl border space-y-2 text-xs ${
                isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-slate-50 border-slate-200/80'
              }`}>
                <div className={`flex justify-between ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                  <span>Room Accommodation Tariff (Room {selectedRoom?.number || '101'})</span>
                  <span className={`font-mono font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    ₹{Number(liveFolioData?.folio?.totalRoomTariff ?? selectedRoom?.price ?? 2800).toLocaleString('en-IN')}.00
                  </span>
                </div>
                <div className={`flex justify-between text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  <span>Statutory CGST (SAC 9963 Accommodation)</span>
                  <span className="font-mono">
                    ₹{Number((liveFolioData?.folio?.totalTaxes ? (liveFolioData.folio.totalTaxes / 2) : 168)).toFixed(2)}
                  </span>
                </div>
                <div className={`flex justify-between text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  <span>Statutory SGST (SAC 9963 Accommodation)</span>
                  <span className="font-mono">
                    ₹{Number((liveFolioData?.folio?.totalTaxes ? (liveFolioData.folio.totalTaxes / 2) : 168)).toFixed(2)}
                  </span>
                </div>
                <div data-testid="folio-room-service-charge" className={`flex justify-between text-xs py-1.5 border-t font-semibold ${
                  isDark ? 'text-amber-300 border-zinc-800/60' : 'text-amber-800 border-slate-200/80 bg-amber-50/70 px-2 rounded-lg'
                }`}>
                  <span>🍽️ In-Room Dining (Club Sandwich + 5% GST)</span>
                  <span className={`font-mono font-bold ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                    + ₹231.00 (₹220 + ₹11 GST)
                  </span>
                </div>
                <div className={`border-t pt-2 flex justify-between font-bold text-sm ${
                  isDark ? 'border-zinc-800 text-white' : 'border-slate-200 text-slate-800'
                }`}>
                  <span>Total Master Folio Bill</span>
                  <span className={`font-mono ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    ₹{Number(liveFolioData?.folio?.netAmountPayable ?? 3682).toLocaleString('en-IN')}.00
                  </span>
                </div>
                <div className={`flex justify-between text-xs pt-1 border-t ${
                  isDark ? 'text-emerald-400 border-zinc-800/60' : 'text-emerald-700 border-slate-200/80'
                }`}>
                  <span>Advance Deposit Paid (Cash/UPI)</span>
                  <span className="font-mono font-bold">
                    - ₹{Number(liveFolioData?.folio?.advancePaid ?? 2000).toLocaleString('en-IN')}.00
                  </span>
                </div>
                <div className={`flex justify-between text-sm font-black pt-2 border-t ${
                  isDark ? 'text-amber-300 border-zinc-700' : 'text-amber-900 border-amber-200 bg-amber-50/80 px-2 py-1 rounded-lg'
                }`}>
                  <span>Balance Due at Check-out</span>
                  <span className={`font-mono ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                    ₹{Number(liveFolioData?.folio?.dueAmount ?? 1682).toLocaleString('en-IN')}.00
                  </span>
                </div>
              </div>

              <button
                type="button"
                data-testid="btn-close-folio-modal"
                onClick={() => setShowRoomFolioModal(false)}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider transition shadow-md shadow-blue-900/20"
              >
                Close Folio View
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* LIVE GUEST SERVICE REQUESTS DRAWER (Concierge Chimes)    */}
        {/* ======================================================== */}
        {showGuestRequestsDrawer && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end">
            <div
              className={`w-full max-w-md h-full flex flex-col shadow-sm dark:shadow-none border-l transition-all animate-in slide-in-from-right duration-200 ${
                isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              {/* Drawer Header */}
              <div className="p-4 border-b flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-black">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black">Guest Service Requests</h3>
                    <p className="text-[11px] text-slate-400">Cleaner, Towels, Repairs & Concierge</p>
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="close-guest-requests-drawer"
                  onClick={() => setShowGuestRequestsDrawer(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-800/20 transition"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {guestRequests.length === 0 ? (
                  <div className="py-16 text-center space-y-2 text-slate-400">
                    <MessageSquare className="w-10 h-10 mx-auto text-slate-500 opacity-40" />
                    <p className="text-xs font-semibold">No active guest service requests right now.</p>
                    <p className="text-[10px] text-slate-500">
                      When in-house guests request housekeeping, fresh towels, or repairs, alerts chime here automatically.
                    </p>
                  </div>
                ) : (
                  guestRequests.map((req) => (
                    <div
                      key={req.requestId}
                      className={`p-3.5 rounded-2xl border transition space-y-2.5 ${
                        req.status === 'COMPLETED'
                          ? 'opacity-60 bg-slate-900/40 border-slate-800'
                          : isDark
                          ? 'bg-slate-900/90 border-amber-500/30 shadow-md'
                          : 'bg-amber-50/60 border-amber-200/80 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500 text-slate-950">
                              Room {req.roomNumber}
                            </span>
                            <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                              {req.requestType}
                            </span>
                          </div>
                          <h4 className="text-xs font-black mt-1">{req.guestName}</h4>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                            req.status === 'COMPLETED'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>

                      {req.notes && (
                        <p className={`text-xs p-2 rounded-xl border font-medium ${
                          isDark ? 'bg-black/30 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                        }`}>
                          "{req.notes}"
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>
                          {req.createdAt
                            ? new Date(req.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                            : 'Just now'}
                        </span>
                        {req.status !== 'COMPLETED' && (
                          <button
                            type="button"
                            onClick={() => handleResolveConciergeRequest(req.requestId)}
                            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-xs transition"
                          >
                            <Check className="w-3 h-3" />
                            <span>Mark Resolved</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STAFF PROFILE DRAWER / MODAL (Real Camera / Gallery Upload) */}
        {/* ======================================================== */}
        {showProfileModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div
              className={`w-full max-w-md rounded-3xl p-6 shadow-sm dark:shadow-none border space-y-5 text-left ${
                isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200/80 text-slate-800'
              }`}
            >
              {/* Header */}
              <div className={`flex items-center justify-between border-b pb-3 ${
                isDark ? 'border-slate-800/80' : 'border-slate-100'
              }`}>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">
                    Front Desk Staff Profile
                  </span>
                  <h3 className="text-lg font-black">{operatorName}</h3>
                </div>
                <button
                  type="button"
                  data-testid="close-profile-modal-btn"
                  onClick={() => setShowProfileModal(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-800/40 text-slate-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Photo Section with Direct Camera / Gallery Input */}
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="relative group">
                  <div className="w-28 h-28 rounded-full overflow-hidden border-3 border-amber-500/40 shadow-xl bg-slate-900 flex items-center justify-center">
                    {staffPhoto ? (
                      <img src={staffPhoto} alt={operatorName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl font-black text-amber-500">
                        {operatorName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-[#141620]" />
                </div>

                {/* Direct Device Camera / Gallery Upload Button */}
                <label className="cursor-pointer px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-md transition active:scale-98">
                  <Camera className="w-4 h-4" />
                  <span>{isUploadingPhoto ? 'Compressing Photo...' : 'Capture / Upload Photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoFileChange}
                    className="hidden"
                  />
                </label>
                <p className="text-[10px] text-slate-400 text-center">
                  Live device camera capture or photo gallery. Compressed cleanly to ~40KB.
                </p>
              </div>

              {/* Operational Metadata */}
              <div className={`p-3.5 rounded-2xl border text-xs space-y-2 ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Designation:</span>
                  <strong className="font-bold">{operatorRole}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Duty Terminal:</span>
                  <strong className="font-bold">Reception PMS Front Desk</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Duty Status:</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Active Shift</span>
                  </span>
                </div>
              </div>

              {/* Logout Button */}
              <div className="pt-2">
                <button
                  type="button"
                  data-testid="staff-logout-btn"
                  onClick={handleLogout}
                  className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition active:scale-98"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out / End Shift</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
