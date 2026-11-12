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
  Zap,
  Crown,
  ArrowUpRight,
  BookOpen,
  Camera,
  Upload
} from 'lucide-react';
import { LanguageToggle, I18nProvider, NumericInput } from '@spicehub/ui';
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
  roomId?: string;
  number: string;
  category: string;
  price: number;
  status: 'Available' | 'Booked' | 'Occupied' | 'Cleaning' | 'Maintenance' | 'Out of Service';
  floor: string;
  guestName?: string;
  specs: { guests: number; bed: string };
  amenities: string[];
  taskId?: string;
  taskType?: string;
  taskStatus?: string;
  taskPriority?: string;
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
  // Only statuses that actually exist on the room record are used here, so the
  // dashboard never invents a state: booked rooms show Booked, vacant rooms show
  // Available and rooms flagged for housekeeping show Cleaning.
  if (status === 'OCCUPIED') return 'Occupied';
  if (status === 'RESERVED' || status === 'BOOKED' || status === 'PENDING_APPROVAL') return 'Booked';
  if (status === 'DIRTY' || status === 'CLEANING' || status === 'INSPECTION') return 'Cleaning';
  if (status === 'OUT_OF_SERVICE') return 'Maintenance';
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
  const [rightPanelTab, setRightPanelTab] = useState<'checkin' | 'details' | 'folio'>('checkin');
  const [checkInName, setCheckInName] = useState('');
  const [checkInPhone, setCheckInPhone] = useState('');
  const [checkInId, setCheckInId] = useState('');
  const [checkInNights, setCheckInNights] = useState('1');
  const [checkInAdvance, setCheckInAdvance] = useState('');
  const [dpdpConsent, setDpdpConsent] = useState(true);
  const [checkInSubmitting, setCheckInSubmitting] = useState(false);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const isDark = false;

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
      await client.request<any>('PATCH', `/api/v1/pms/frontdesk/concierge-request/${requestId}/status`, {
        status: 'COMPLETED',
      });
      setGuestRequests((prev) =>
        prev.map((r) => (r.requestId === requestId ? { ...r, status: 'COMPLETED' } : r))
      );
      triggerToast('Guest service request marked completed.');
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
          triggerToast('Profile photo updated successfully!');
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
    if ((!showRoomFolioModal && rightPanelTab !== 'folio') || !selectedRoom?.number) return;
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
  }, [rightPanelTab, showRoomFolioModal, selectedRoom?.number]);

  const loadRooms = useCallback(async () => {
    setRoomsLoading(true);
    setRoomsError(null);
    try {
      const client = getApiClient();
      const [boardResponse, typesResponse, arrivalsResponse, overviewResponse, conciergeResponse] = await Promise.all([
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
        client.request<{ success: boolean; data: any[] }>(
          'GET',
          '/api/v1/pms/frontdesk/concierge-requests'
        ).catch(() => ({ success: false, data: [] })),
      ]);

      if (conciergeResponse && Array.isArray(conciergeResponse.data)) {
        setGuestRequests(
          conciergeResponse.data.map((item: any) => ({
            requestId: String(item.id || item.requestId || item._id),
            roomNumber: String(item.roomNumber || ''),
            guestName: item.guestName || 'In-House Guest',
            requestType: item.requestType || 'SERVICE',
            priority: item.priority || 'NORMAL',
            status: item.status || 'CREATED',
            notes: item.notes || '',
            createdAt: item.createdAt || new Date(),
          }))
        );
      }

      const typesById = new Map(
        (typesResponse.roomTypes || []).map((type) => [String(type._id), type])
      );
      const mapped = (boardResponse.board || []).map((room) => {
        const type = typesById.get(String(room.roomType?._id || ''));
        const typeName = type?.name || room.roomType?.name || room.roomType?.code || 'Room';
        const amenities = type?.amenities || [];
        return {
          roomId: room.roomId,
          number: room.roomNumber,
          category: roomCategoryFor(typeName),
          price: Number(type?.basePrice ?? type?.basePriceOvernight ?? 0),
          status: roomStatus(room.status),
          floor: floorLabel(room.floorNumber),
          guestName: room.guestInfo?.guestName,
          specs: {
            guests: Number(type?.maxPax ?? type?.maxCapacity ?? 0),
            bed: amenities.find((item) => /bed/i.test(item)) || 'Bed as per room type',
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

  // Hydrate the reservation matrix from the real PMS calendar API.
  const loadMatrix = useCallback(
    async (startDate?: string, days?: number, roomTypeId?: string) => {
      const from = startDate || matrixStore.getStartDate();
      const span = days || matrixStore.getDays();
      try {
        matrixStore.setIsLoading(true);
        const query = new URLSearchParams({ startDate: from, days: String(span) });
        if (roomTypeId && roomTypeId !== 'ALL') query.set('roomTypeId', roomTypeId);
        const res = await getApiClient().request<{ success: boolean; data: any }>(
          'GET',
          `/api/v1/pms/matrix/calendar?${query.toString()}`
        );
        if (res?.data) {
          matrixStore.setStartDate(res.data.window?.startDate || from);
          matrixStore.setDays(res.data.dates?.length || span);
          matrixStore.setData(res.data);
        }
      } catch (err: any) {
        triggerToast(err?.message || 'Reservation calendar could not be loaded.');
      } finally {
        matrixStore.setIsLoading(false);
      }
    },
    [matrixStore]
  );

  useEffect(() => {
    if (activeSidebarItem === 'Room Booking' || activeSidebarItem === 'Room Calendar') {
      void loadMatrix();
    }
  }, [activeSidebarItem, loadMatrix]);

  // Occupied rooms are shown with their live folio, vacant/booked rooms with the check-in form.
  useEffect(() => {
    setRightPanelTab(selectedRoom?.status === 'Occupied' ? 'folio' : 'checkin');
  }, [selectedRoom?.number, selectedRoom?.status]);

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
      setGuestRequests((prev) => [
        {
          requestId: String(payload.id || payload.requestId || payload._id),
          roomNumber: String(payload.roomNumber || ''),
          guestName: payload.guestName || 'In-House Guest',
          requestType: payload.requestType || 'SERVICE',
          priority: payload.priority || 'NORMAL',
          status: payload.status || 'CREATED',
          notes: payload.notes || '',
          createdAt: payload.createdAt || new Date(),
        },
        ...prev.filter((r) => r.requestId !== (payload.id || payload.requestId)),
      ]);
      triggerToast(`Room ${payload.roomNumber} (${payload.guestName}): ${payload.requestType}`);
    });

    socket.on('pms:concierge_request_updated', (payload: any) => {
      const targetId = String(payload.id || payload.requestId || payload._id || '');
      setGuestRequests((prev) =>
        prev.map((r) => (r.requestId === targetId ? { ...r, status: payload.status || 'COMPLETED' } : r))
      );
    });

    socket.on('reception:new_checkin_request', (payload: any) => {
      playNotificationChime();
      triggerToast(`New Check-In Request: Room ${payload.roomNumber} - ${payload.guestName}`);
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
  const bookedRoomCount = rooms.filter((room) => room.status === 'Booked').length;
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
  const pendingApprovals = bookings.filter((booking) => booking.bookingStatus === 'PENDING_APPROVAL');
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
        return 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
      case 'Occupied':
        return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700';
      case 'Booked':
        return 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
      case 'Cleaning':
        return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
      case 'Maintenance':
      case 'Out of Service':
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
    }
  };

  return (
    <div className={`heritage-app lux-page flex min-h-[100dvh] w-full overflow-x-hidden font-sans select-none antialiased transition-colors duration-200 ${
 isDark ? 'bg-slate-950 text-slate-100' : 'bg-[#F8FAFC] text-[#0F172A]'
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
            <div className="w-11 h-11 rounded-2xl bg-[#0F172A] flex items-center justify-center text-[#BFDBFE] shadow-sm shrink-0 ring-1 ring-[#93C5FD]/40">
              <Building className="w-5 h-5 text-[#BFDBFE]" />
            </div>
            {(!isSidebarCollapsed || isMobileMenuOpen) && (
              <div className="truncate">
                <div className={`text-[20px] font-semibold leading-tight tracking-tight ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>
                  SpiceHub
                </div>
                <p className="text-[9.5px] text-[#1D4ED8] font-black tracking-[0.16em] uppercase">Front Desk</p>
              </div>
            )}
          </div>

          {/* Nav Items List (16 items matching image) */}
          <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 text-xs font-semibold custom-scrollbar">
            {[
              { label: 'Room Dashboard', icon: Bed },
              { label: 'Room Booking', icon: Calendar },
              { label: 'Walk-in Check-in', icon: DoorOpen, badge: pendingApprovals.length > 0 ? `${pendingApprovals.length} Approval` : undefined },
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
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white font-medium shadow-2xs'
                      : isDark
                      ? 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                  {(!isSidebarCollapsed || isMobileMenuOpen) && <span className="truncate">{item.label}</span>}
                  {(!isSidebarCollapsed || isMobileMenuOpen) && item.badge && (
                    <span className="ml-auto px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-900 border border-amber-300">
                      {item.badge}
                    </span>
                  )}
                  {(!isSidebarCollapsed || isMobileMenuOpen) && isActive && !item.badge && <ChevronRight className="w-3.5 h-3.5 ml-auto text-slate-400" />}
                </button>
              );
            })}
          </nav>

          {/* Bottom Card: Receptionist Profile */}
          <div className={`p-3 border-t space-y-2.5 ${isDark ? 'border-slate-800/80 bg-slate-950' : 'border-slate-100 bg-slate-50'}`}>
            {/* Signed-in receptionist (real staff record, no placeholder photo) */}
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                {staffPhoto ? (
                  <img
                    src={staffPhoto}
                    alt={operatorName}
                    className="w-8 h-8 rounded-full object-cover border border-amber-500/40"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#0F172A] text-[#BFDBFE] flex items-center justify-center text-xs font-black border border-blue-500/40">
                    {operatorName.charAt(0).toUpperCase()}
                  </div>
                )}
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
        <header className={`h-14 px-3 sm:px-5 border-b flex items-center justify-between shrink-0 shadow-xs z-10 transition-colors ${
 isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
 }`}>
          <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-lg min-w-0">
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
            <div className="relative w-full max-w-sm min-w-0">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search rooms, guests..."
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

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Live Clock */}
            <div className={`hidden xl:flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${
 isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-500'
 }`}>
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {clock.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Quick Policies & Rules Guide Button */}
            <button
              onClick={() => setIsPolicyModalOpen(true)}
              className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30 hover:bg-amber-500/20 transition"
              title="Open Quick Policy Reference & SOP Manual"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-500" />
              <span>Policies</span>
            </button>

            {/* Bell with Badge */}
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

            {/* Live Guest Requests Button with Badge */}
            <button
              data-testid="concierge-requests-btn"
              onClick={() => setShowGuestRequestsDrawer(true)}
              className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition shadow-xs ${
 guestRequests.filter((r) => r.status !== 'COMPLETED').length > 0
 ? 'bg-amber-500/20 text-amber-600 border-amber-500/40 animate-pulse'
 : isDark
 ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
 : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
 }`}
              title="Open Live Guest Requests Panel"
            >
              <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Requests</span>
              {guestRequests.filter((r) => r.status !== 'COMPLETED').length > 0 && (
                <span className="min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center">
                  {guestRequests.filter((r) => r.status !== 'COMPLETED').length}
                </span>
              )}
            </button>

            {/* Bilingual English / Hindi Language Toggle */}
            <span className="hidden sm:inline-flex">
              <LanguageToggle isDark={isDark} />
            </span>

            {/* Staff Profile Button */}
            <button
              data-testid="staff-profile-btn"
              onClick={() => setShowProfileModal(true)}
              className={`flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full border transition hover:ring-2 hover:ring-amber-500/40 ${
 isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-700'
 }`}
              title="Open Staff Profile"
            >
              <div className="w-6 h-6 rounded-full overflow-hidden bg-amber-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                {staffPhoto ? (
                  <img src={staffPhoto} alt={operatorName} className="w-full h-full object-cover" />
                ) : (
                  operatorName.charAt(0).toUpperCase()
                )}
              </div>
              <span className="hidden sm:inline text-xs font-bold truncate max-w-[80px] sm:max-w-[110px]">{operatorName}</span>
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
              initialTab={pendingApprovals.length > 0 ? 'ARRIVALS' : 'CHECKIN'}
              onBackToMatrix={() => {
                setActiveSidebarItem('Room Dashboard');
                void loadRooms();
              }}
            />
          </div>
        ) : activeSidebarItem === 'Room Booking' || activeSidebarItem === 'Room Calendar' ? (
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
            <PmsReservationMatrixApp
              store={matrixStore}
              onFetchMatrixData={loadMatrix}
              onConfirmBooking={async (b) => {
                try {
                  await getApiClient().request('POST', '/api/v1/pms/matrix/quick-reserve', {
                    roomTypeId: b.roomTypeId,
                    roomId: b.roomId,
                    checkInDate: b.checkInDate,
                    checkOutDate: b.checkOutDate,
                    guestName: b.guestName,
                    guestPhone: b.guestPhone,
                    guestEmail: b.guestEmail,
                    adults: b.adults,
                    advancePaymentAmount: b.advancePaymentAmount,
                    specialRequests: b.specialRequests,
                  });
                  triggerToast(`Booking created for ${b.guestName}`);
                  await loadMatrix();
                  void loadRooms();
                } catch (err: any) {
                  triggerToast(err?.message || 'Booking could not be created.');
                }
              }}
            />
          </div>
        ) : activeSidebarItem === 'Check-in / Check-out' ? (
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
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
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
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
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
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
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
            <LostAndFoundVaultApp authToken={token} hotelId={hotelId} />
          </div>
        ) : activeSidebarItem === 'Night Audit & Close' ? (
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
            <NightAuditApp token={token} hotelId={hotelId} />
          </div>
        ) : activeSidebarItem === 'Settings' ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-4 custom-scrollbar">
            <ReceptionSettingsView isDark={isDark} onToast={triggerToast} />
          </div>
        ) : (
          /* Main Room Dashboard matching media_1791355525655.jpg */
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto min-h-0 p-4 custom-scrollbar">
            {/* Unified Metric Ribbon - Refined, Minimalist, High-Density Hotel PMS */}
            <div className="bg-white border border-slate-200/90 rounded-lg p-3.5 shadow-2xs">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 flex-1 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                  {/* Total Rooms */}
                  <div className="pt-1.5 sm:pt-0 sm:px-3 first:pl-0">
                    <span className="text-[10.5px] font-medium text-slate-500 uppercase tracking-wider block">Total Inventory</span>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-xl font-semibold text-slate-900 tabular-nums">{roomsLoading ? '—' : totalRoomCount}</span>
                      <span className="text-xs text-slate-500 font-normal">rooms</span>
                    </div>
                  </div>

                  {/* Available */}
                  <div className="pt-1.5 sm:pt-0 sm:px-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-[10.5px] font-medium text-slate-500 uppercase tracking-wider">Available</span>
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-xl font-semibold text-slate-900 tabular-nums">{roomsLoading ? '—' : availableRoomCount}</span>
                      <span className="text-xs text-slate-500 font-normal">({roomPercent(availableRoomCount)}%)</span>
                    </div>
                  </div>

                  {/* Occupied */}
                  <div className="pt-1.5 sm:pt-0 sm:px-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-900 shrink-0" />
                      <span className="text-[10.5px] font-medium text-slate-500 uppercase tracking-wider">Occupied</span>
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-xl font-semibold text-slate-900 tabular-nums">{roomsLoading ? '—' : occupiedRoomCount}</span>
                      <span className="text-xs text-slate-500 font-normal">({roomPercent(occupiedRoomCount)}%)</span>
                    </div>
                  </div>

                  {/* Reserved / Booked */}
                  <div className="pt-1.5 sm:pt-0 sm:px-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                      <span className="text-[10.5px] font-medium text-slate-500 uppercase tracking-wider">Booked</span>
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-xl font-semibold text-slate-900 tabular-nums">{roomsLoading ? '—' : bookedRoomCount}</span>
                      <span className="text-xs text-slate-500 font-normal">({roomPercent(bookedRoomCount)}%)</span>
                    </div>
                  </div>

                  {/* Cleaning / Maintenance */}
                  <div className="pt-1.5 sm:pt-0 sm:px-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      <span className="text-[10.5px] font-medium text-slate-500 uppercase tracking-wider">Cleaning</span>
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-xl font-semibold text-slate-900 tabular-nums">{roomsLoading ? '—' : cleaningRoomCount}</span>
                      {maintenanceRoomCount > 0 && (
                        <span className="text-xs text-slate-500 font-normal">· {maintenanceRoomCount} maint</span>
                      )}
                    </div>
                  </div>

                  {/* Today's Revenue */}
                  <div className="pt-1.5 sm:pt-0 sm:px-3">
                    <span className="text-[10.5px] font-medium text-slate-500 uppercase tracking-wider block">Today's Revenue</span>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-xl font-semibold text-slate-900 tabular-nums">
                        {todayRevenue === null ? '—' : `₹${Number(todayRevenue).toLocaleString('en-IN')}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Primary Action Button */}
                <div className="shrink-0 flex items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
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
                    className="w-full lg:w-auto px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs tracking-wide transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Booking</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Online Room Booking Approval Notification Banner */}
            {pendingApprovals.length > 0 && (
              <div
                data-testid="reception-pending-approvals-alert"
                className="p-3 rounded-lg border border-amber-300 bg-amber-50/70 text-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-amber-600 animate-pulse shrink-0" />
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900">
                      {pendingApprovals.length} Online Booking{pendingApprovals.length > 1 ? 's' : ''} Awaiting ID Verification
                    </h4>
                    <p className="text-[11px] text-slate-600">
                      Review attached documents in queue to issue digital room keycard.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="reception-review-approvals-btn"
                  onClick={() => {
                    setActiveSidebarItem('Walk-in Check-in');
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent('frontdesk:set_tab', { detail: 'ARRIVALS' }));
                    }, 50);
                  }}
                  className="px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition cursor-pointer shrink-0"
                >
                  Review Queue
                </button>
              </div>
            )}
            {/* Middle Section: Split-screen layout (Mobile stacked, Tablet/Laptop Split View) */}
            <div data-testid="pms-split-container" className="flex flex-col lg:flex lg:flex-row lg:h-screen lg:overflow-hidden gap-4 min-h-0">
              {/* Left Side (lg:w-1/2): PMS Room Matrix (grid) */}
              <div data-testid="pms-room-matrix" className={`w-full lg:w-1/2 p-4 rounded-2xl border shadow-sm space-y-4 overflow-y-auto custom-scrollbar ${
 isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
 }`}>
                {/* Header, Filters & View Toggle */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="shrink-0">
                    <h3 className={`font-black text-sm whitespace-nowrap ${isDark ? 'text-white' : 'text-slate-800'}`}>Room Overview</h3>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 text-xs font-bold max-w-full">
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
                        className={`px-2.5 py-1 rounded-md text-xs transition-colors whitespace-nowrap ${
                          roomFilterCategory === c.label
                            ? 'bg-slate-900 text-white font-medium'
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
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 ${
                      isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                    }`}>
                      <span>Floor View</span>
                      <ChevronDown className="w-3 h-3 text-slate-500" />
                    </button>
                    <div className={`flex p-0.5 rounded-md border ${
                      isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'
                    }`}>
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`p-1 rounded text-xs font-medium flex items-center gap-1 ${
                          viewMode === 'grid' ? 'bg-slate-900 text-white' : isDark ? 'text-slate-400' : 'text-slate-600'
                        }`}
                      >
                        <Grid className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Grid View</span>
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`p-1 rounded text-xs font-medium flex items-center gap-1 ${
                          viewMode === 'list' ? 'bg-slate-900 text-white' : isDark ? 'text-slate-400' : 'text-slate-600'
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
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Available
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Booked
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Occupied
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Cleaning
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Maintenance
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
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
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
                                className={`p-2.5 rounded-lg border text-left transition-colors flex flex-col justify-between gap-1.5 ${
                                  isSelected ? 'ring-2 ring-slate-900 border-slate-900' : 'border-slate-200/90 hover:border-slate-400'
                                } ${
                                  isDark ? 'bg-slate-800' : 'bg-white'
                                }`}
                              >
                                <div className="w-full flex items-start justify-between gap-1">
                                  <div>
                                    <div className={`text-sm font-semibold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                      {room.number}
                                    </div>
                                    <div className="text-[10.5px] text-slate-500 font-normal truncate">
                                      {room.category}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-xs font-semibold text-slate-900 tabular-nums">₹{room.price}</span>
                                  </div>
                                </div>

                                <div
                                  className={`py-0.5 px-1.5 rounded text-[9px] font-medium tracking-wide border text-center ${getStatusColor(
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
                          Allocated Room: <strong className={isDark ? 'text-white' : 'text-slate-900'}>{selectedRoom ? `Room ${selectedRoom.number}` : 'Select a room'}</strong> {selectedRoom ? `(${selectedRoom.category}) • ₹${selectedRoom.price}/night` : ''}
                        </p>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center font-bold">
                        <DoorOpen className="w-4 h-4" />
                      </div>
                    </div>

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!dpdpConsent) {
                          triggerToast('Please complete statutory DPDP Act 2023 consent checkbox.');
                          return;
                        }
                        if (!selectedRoom?.roomId) {
                          triggerToast('Select a room from the live inventory first.');
                          return;
                        }
                        if (checkInSubmitting) return;
                        setCheckInSubmitting(true);
                        try {
                          await getApiClient().request('POST', '/api/v1/pms/frontdesk/quick-checkin', {
                            roomId: selectedRoom.roomId,
                            guestName: checkInName.trim(),
                            guestPhone: checkInPhone.trim(),
                            idType: 'AADHAAR',
                            idNumber: checkInId.trim(),
                            advancePaid: Number(checkInAdvance) || 0,
                            verifiedByReceptionist: true,
                          });
                          triggerToast(`Guest ${checkInName} checked in to Room ${selectedRoom.number}.`);
                          setCheckInName('');
                          setCheckInPhone('');
                          setCheckInId('');
                          setCheckInAdvance('');
                          await loadRooms();
                          setRightPanelTab('folio');
                        } catch (err: any) {
                          triggerToast(err?.message || 'Check-in could not be saved. Please try again.');
                        } finally {
                          setCheckInSubmitting(false);
                        }
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
                          <NumericInput
                            data-testid="input-stay-nights"
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
                          <NumericInput
                            data-testid="input-advance-amount"
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
                        disabled={checkInSubmitting || !selectedRoom?.roomId || selectedRoom.status === 'Occupied'}
                        className="h-12 w-full rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Check className="w-4 h-4" />
                        <span>
                          {checkInSubmitting
                            ? 'Saving check-in…'
                            : selectedRoom
                              ? `Check-In Guest (Room ${selectedRoom.number})`
                              : 'Select a room to check in'}
                        </span>
                      </button>
                    </form>
                  </div>
                )}

                {/* VIEW 2: FOLIO LEDGER & ROOM DETAILS */}
                {rightPanelTab === 'folio' && (
                  <div className="space-y-4">
                    {/* Folio Ledger Card (live stay + folio data only) */}
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
                            {liveFolioLoading ? 'Loading…' : liveFolioData?.folio?.folioNumber || 'No active folio'}
                          </h4>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
 liveFolioData?.folio?.folioStatus === 'SETTLED'
 ? 'bg-emerald-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
 : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
 }`}>
                          {liveFolioData?.folio?.folioStatus || (liveFolioData?.stay ? 'No folio' : 'No stay')}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className={`p-2.5 rounded-lg border ${
 isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
 }`}>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Guest Name</span>
                          <strong className={isDark ? 'text-white' : 'text-slate-900'}>
                            {liveFolioData?.stay?.guestName || selectedRoom?.guestName || 'No guest in-house'}
                          </strong>
                        </div>
                        <div className={`p-2.5 rounded-lg border ${
 isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
 }`}>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Room Allocation</span>
                          <strong className={isDark ? 'text-white' : 'text-slate-900'}>
                            {selectedRoom ? `Room ${selectedRoom.number}` : 'No room selected'} ({selectedRoom?.category || '—'})
                          </strong>
                        </div>
                      </div>

                      {/* Line items posted against this stay */}
                      <div className="space-y-1.5 text-xs pt-1 border-t border-slate-200 dark:border-slate-800">
                        {liveFolioLoading ? (
                          <p className="py-2 text-center text-slate-400">Loading live folio…</p>
                        ) : !liveFolioData?.folio ? (
                          <p className="py-2 text-center text-slate-400">
                            {selectedRoom?.status === 'Occupied'
                              ? 'No folio found for this stay.'
                              : 'No in-house stay — charges appear here after check-in.'}
                          </p>
                        ) : (
                          <>
                            {(liveFolioData.folio.lineItems || []).length === 0 ? (
                              <p className="py-1 text-slate-400">No charges posted yet.</p>
                            ) : (
                              (liveFolioData.folio.lineItems || []).slice(0, 6).map((item: any) => (
                                <div key={item.id} className="flex justify-between gap-3 text-slate-600 dark:text-slate-400">
                                  <span className="truncate">{item.description}</span>
                                  <span className="font-semibold shrink-0 text-slate-900 dark:text-white">
                                    ₹{Number(item.netAmount || 0).toLocaleString('en-IN')}
                                  </span>
                                </div>
                              ))
                            )}
                            <div className="flex justify-between pt-1.5 border-t border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                              <span>Room tariff</span>
                              <span className="font-semibold text-slate-900 dark:text-white">
                                ₹{Number(liveFolioData.folio.totalRoomTariff || 0).toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div className="flex justify-between text-slate-600 dark:text-slate-400">
                              <span>Food &amp; beverage</span>
                              <span className="font-semibold text-slate-900 dark:text-white">
                                ₹{Number(liveFolioData.folio.totalFoodAndBeverage || 0).toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div className="flex justify-between text-slate-600 dark:text-slate-400">
                              <span>Laundry / other</span>
                              <span className="font-semibold text-slate-900 dark:text-white">
                                ₹{Number(liveFolioData.folio.totalLaundry || 0).toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div className="flex justify-between text-slate-600 dark:text-slate-400">
                              <span>Taxes</span>
                              <span className="font-semibold text-slate-900 dark:text-white">
                                ₹{Number(liveFolioData.folio.totalTaxes || 0).toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div className="flex justify-between text-slate-600 dark:text-slate-400">
                              <span>Advance / paid</span>
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                -₹{Number(liveFolioData.folio.paidAmount ?? liveFolioData.folio.advancePaid ?? 0).toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800 font-bold">
                              <span className={isDark ? 'text-white' : 'text-slate-900'}>Net payable</span>
                              <span className="text-base text-red-600 dark:text-red-400">
                                ₹{Number(liveFolioData.folio.dueAmount ?? liveFolioData.folio.netAmountPayable ?? 0).toLocaleString('en-IN')}
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="pt-2 flex flex-col sm:flex-row gap-2">
                        <button
                          data-testid="btn-folio-settle"
                          onClick={() => setShowRoomFolioModal(true)}
                          disabled={!liveFolioData?.folio}
                          className="flex-1 h-11 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <CreditCard className="w-4 h-4" />
                          <span>Settle Folio &amp; Check-out</span>
                        </button>
                        <button
                          onClick={() => triggerToast(`Receipt generated for ${selectedRoom ? `Room ${selectedRoom.number}` : 'the selected room'}`)}
                          disabled={!liveFolioData?.folio}
                          className={`px-4 h-11 rounded-lg border font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
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
                        <div className="flex items-center justify-between">
                          <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            Room {selectedRoom.number} ({selectedRoom.category})
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(selectedRoom.status)}`}>
                            {selectedRoom.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                            {selectedRoom.specs.guests > 0 ? `${selectedRoom.specs.guests} guests max` : 'Capacity not set'} · {selectedRoom.specs.bed}
                          </span>
                          <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            ₹{selectedRoom.price.toLocaleString('en-IN')}/night
                          </span>
                        </div>
                        {selectedRoom.guestName && (
                          <div className={`text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                            In-house guest: <span className="font-bold">{selectedRoom.guestName}</span>
                          </div>
                        )}
                        {selectedRoom.amenities.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {selectedRoom.amenities.slice(0, 6).map((amenity) => (
                              <span
                                key={amenity}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
 isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
 }`}
                              >
                                {amenity}
                              </span>
                            ))}
                          </div>
                        )}
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
                    {liveFolioData?.folio?.folioNumber || 'Not generated yet'}
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
                    {liveFolioData?.stay?.guestName || selectedRoom?.guestName || 'No guest in-house'}
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
                    {selectedRoom ? `Room ${selectedRoom.number}` : 'Room'} ({selectedRoom?.category || '—'})
                  </strong>
                </div>
              </div>

              {/* Financial Breakdown (live folio values) */}
              <div className={`p-4 rounded-2xl border space-y-2 text-xs ${
 isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-slate-50 border-slate-200/80'
 }`}>
                <div className={`flex justify-between ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                  <span>Room accommodation tariff</span>
                  <span className={`font-mono font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    ₹{Number(liveFolioData?.folio?.totalRoomTariff ?? 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className={`flex justify-between text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  <span>Food &amp; beverage</span>
                  <span className="font-mono">
                    ₹{Number(liveFolioData?.folio?.totalFoodAndBeverage ?? 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className={`flex justify-between text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  <span>Laundry &amp; other services</span>
                  <span className="font-mono">
                    ₹{Number(liveFolioData?.folio?.totalLaundry ?? 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className={`flex justify-between text-[11px] ${isDark ? 'text-amber-400' : 'text-slate-500'}`}>
                  <span>Taxes (CGST + SGST)</span>
                  <span className="font-mono">
                    ₹{Number(liveFolioData?.folio?.totalTaxes ?? 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className={`border-t pt-2 flex justify-between font-bold text-sm ${
 isDark ? 'border-zinc-800 text-white' : 'border-slate-200 text-slate-800'
 }`}>
                  <span>Total master folio</span>
                  <span className={`font-mono ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    ₹{Number(liveFolioData?.folio?.netAmountPayable ?? 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className={`flex justify-between text-xs pt-1 border-t ${
 isDark ? 'text-emerald-400 border-zinc-800/60' : 'text-emerald-700 border-slate-200/80'
 }`}>
                  <span>Advance / paid</span>
                  <span className="font-mono font-bold">
                    ₹{Number(liveFolioData?.folio?.paidAmount ?? liveFolioData?.folio?.advancePaid ?? 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className={`flex justify-between text-sm font-black pt-2 border-t ${
 isDark ? 'text-amber-300 border-zinc-700' : 'text-amber-900 border-amber-200 bg-amber-50/80 px-2 py-1 rounded-lg'
 }`}>
                  <span>Balance due at check-out</span>
                  <span className={`font-mono ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                    ₹{Number(liveFolioData?.folio?.dueAmount ?? 0).toLocaleString('en-IN')}
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
