import React, { useState, useEffect } from 'react';
import { API_ORIGIN } from '../config/api';
import {
  BedDouble,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  Wrench,
  UserCheck,
  ShieldCheck,
  MapPin,
  ChevronRight,
  Plus,
  Minus,
  KeyRound,
  Wifi,
  Phone,
  AlertCircle,
  FileText,
  Heart,
  Navigation,
  CreditCard,
  Building,
  RefreshCw,
  Sun,
  Moon,
  Tv,
  Coffee,
  Wind,
} from 'lucide-react';

export interface CatalogRoom {
  id: string;
  roomNumber: string;
  floorNumber: number;
  wing: string;
  rawStatus: string;
  displayStatus: 'AVAILABLE' | 'CLEANING' | 'MAINTENANCE' | 'OCCUPIED';
  statusBadge: string;
  isBookable: boolean;
  roomType: {
    id: string;
    name: string;
    code: string;
    basePriceOvernight: number;
    gstRate: number;
    amenities: string[];
    maxCapacity: number;
    photos?: string[];
  };
  photos?: string[];
}

export interface HotelMetadata {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  phone: string;
  logoUrl?: string;
  coverImageUrl?: string;
}

export interface RoomCatalogViewProps {
  hotelId?: string;
  apiBase?: string;
  onRoomBooked?: (roomNumber: string, sessionToken: string) => void;
  onCancelOrBack?: () => void;
  activeRoomNumber?: string;
  currentRoomNumber?: string;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

const ROOM_TYPE_PHOTOS: Record<string, string[]> = {
  DLX: [
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&auto=format&fit=crop&q=80',
  ],
  STE: [
    'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&auto=format&fit=crop&q=80',
  ],
  STD: [
    'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=800&auto=format&fit=crop&q=80',
  ],
};

const FALLBACK_ROOM_IMAGE = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
  <defs>
    <linearGradient id="roomBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="600" height="400" fill="url(#roomBg)"/>
  <rect x="150" y="80" width="300" height="150" rx="8" fill="#334155" opacity="0.6"/>
  <rect x="180" y="100" width="240" height="110" rx="4" fill="#475569" opacity="0.8"/>
  <rect x="160" y="210" width="280" height="120" rx="12" fill="#e2e8f0"/>
  <path d="M160 250 L440 250 L440 330 L160 330 Z" fill="#cbd5e1"/>
  <rect x="180" y="180" width="100" height="45" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
  <rect x="320" y="180" width="100" height="45" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
  <circle cx="110" cy="180" r="18" fill="#fef08a" opacity="0.8"/>
  <circle cx="490" cy="180" r="18" fill="#fef08a" opacity="0.8"/>
  <text x="300" y="375" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="16" font-weight="800" text-anchor="middle" letter-spacing="1">PREMIUM EXECUTIVE SUITE</text>
</svg>
`);

function getRoomPhoto(room: CatalogRoom, index: number): string {
  if (room.photos && room.photos.length > 0) return room.photos[0];
  if (room.roomType?.photos && room.roomType.photos.length > 0) return room.roomType.photos[0];
  const code = (room.roomType?.code || 'STD').toUpperCase();
  const list = ROOM_TYPE_PHOTOS[code] || ROOM_TYPE_PHOTOS.STD;
  return list[index % list.length];
}

export const RoomCatalogView: React.FC<RoomCatalogViewProps> = ({
  hotelId = '',
  apiBase = API_ORIGIN,
  onRoomBooked,
  onCancelOrBack,
  activeRoomNumber,
  currentRoomNumber,
  theme: themeProp,
  onToggleTheme,
}) => {
  // Theme state: defaults to clean light theme, can be toggled to dark
  const [localTheme, setLocalTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const urlTheme = new URLSearchParams(window.location.search).get('theme');
      if (urlTheme === 'dark' || urlTheme === 'light') return urlTheme;
      const saved = localStorage.getItem('spicehub_guest_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    }
    return 'light';
  });

  const activeTheme = themeProp || localTheme;
  const isDark = activeTheme === 'dark';

  const handleToggleTheme = () => {
    if (onToggleTheme) {
      onToggleTheme();
    } else {
      const next = activeTheme === 'dark' ? 'light' : 'dark';
      setLocalTheme(next);
      if (typeof window !== 'undefined') {
        localStorage.setItem('spicehub_guest_theme', next);
      }
    }
  };

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [hotel, setHotel] = useState<HotelMetadata | null>(null);
  const [rooms, setRooms] = useState<CatalogRoom[]>([]);
  const [counts, setCounts] = useState({
    total: 0,
    available: 0,
    cleaning: 0,
    maintenance: 0,
    occupied: 0,
  });

  // Default filter set to 'AVAILABLE' so guests immediately see ready rooms!
  const [filter, setFilter] = useState<'ALL' | 'AVAILABLE' | 'CLEANING' | 'MAINTENANCE' | 'OCCUPIED'>('AVAILABLE');
  const [selectedRoom, setSelectedRoom] = useState<CatalogRoom | null>(null);

  // Date and Duration State
  const [checkInDate, setCheckInDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [nights, setNights] = useState(1);

  // Location / GPS Distance State
  const [locating, setLocating] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [locationStatus, setLocationStatus] = useState<string>('Location not verified');

  // KYC and Guest Details State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('9820011223');
  const [guestEmail, setGuestEmail] = useState('');
  const [isCouple, setIsCouple] = useState(true);
  const [idType, setIdType] = useState<'AADHAAR' | 'PASSPORT' | 'DRIVING_LICENSE' | 'VOTER_ID'>('AADHAAR');
  const [idNumber, setIdNumber] = useState('1234 5678 9012');
  const [docVerified, setDocVerified] = useState(true);
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Calculate Check-Out Date dynamically based on nights
  const getCheckOutDate = () => {
    const d = new Date(checkInDate);
    if (isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + nights);
    return d.toISOString().split('T')[0];
  };

  const checkOutDate = getCheckOutDate();

  // Haversine Distance Calculation (km)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by your browser');
      return;
    }
    setLocating(true);
    setLocationStatus('Acquiring high-accuracy GPS coordinates...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const uLat = pos.coords.latitude;
        const uLng = pos.coords.longitude;
        setUserCoords({ lat: uLat, lng: uLng });

        const hLat = hotel?.latitude || 28.6139;
        const hLng = hotel?.longitude || 77.2090;

        const dist = calculateDistance(uLat, uLng, hLat, hLng);
        setDistanceKm(dist);

        if (dist <= 0.2) {
          setLocationStatus('Inside Property (Lobby / Guest Lounge Verified)');
        } else if (dist <= 1.0) {
          setLocationStatus(`At Property Boundary (${dist} km away)`);
        } else {
          setLocationStatus(`Remote Booking (${dist} km away from property)`);
        }
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setLocationStatus('GPS detection skipped (Defaulting to In-Hotel reception)');
        // Fallback distance calculation
        setDistanceKm(0.1);
      },
      { timeout: 8000 }
    );
  };

  const fetchRoomsCatalog = async () => {
    try {
      setError(null);
      const url = `${apiBase}/api/v1/guest-portal/rooms/catalog?hotelId=${hotelId}`;
      const res = await fetch(url, {
        headers: {
          'x-hotel-id': hotelId,
        },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setHotel(data.data.hotel);
        setRooms(data.data.rooms || []);
        setCounts(data.data.counts || { total: 0, available: 0, cleaning: 0, maintenance: 0, occupied: 0 });
      } else {
        setError(data.message || 'Failed to load room availability catalog');
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching rooms');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (hotelId) {
      fetchRoomsCatalog();
    }
  }, [hotelId]);

  const filteredRooms = rooms.filter((r) => {
    if (filter === 'ALL') return true;
    return r.displayStatus === filter;
  });

  // Dynamic price calculation
  const getPricingForRoom = (room: CatalogRoom) => {
    const basePerNight = room.roomType.basePriceOvernight || 2500;
    const subtotal = basePerNight * nights;
    const gstRate = basePerNight > 7500 ? 18 : 12;
    const gstAmount = Math.round(((subtotal * gstRate) / 100) * 100) / 100;
    const grandTotal = subtotal + gstAmount;
    return {
      basePerNight,
      nights,
      subtotal,
      gstRate,
      gstAmount,
      grandTotal,
    };
  };

  const handleOpenBooking = (room: CatalogRoom) => {
    setSelectedRoom(room);
    setIsBookingModalOpen(true);
    setBookingError(null);
  };

  const handleConfirmBooking = async () => {
    if (!selectedRoom) return;
    if (!guestName.trim()) {
      setBookingError('Please enter the primary guest name');
      return;
    }
    if (!guestPhone.trim() || guestPhone.trim().length < 8) {
      setBookingError('Please enter a valid mobile number');
      return;
    }

    try {
      setSubmittingBooking(true);
      setBookingError(null);

      const pricing = getPricingForRoom(selectedRoom);

      const payload = {
        hotelId,
        roomId: selectedRoom.id,
        checkInDate,
        checkOutDate,
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim(),
        guestEmail: guestEmail.trim() || `${guestPhone.trim()}@guest.spicehub.com`,
        isCouple,
        idType: idType || 'PHYSICAL_AT_RECEPTION',
        idNumber: idNumber.trim() || 'PENDING_AT_DESK',
        advancePaid: pricing.grandTotal, // Full instant payment in flow
        deviceLocation: userCoords
          ? {
              latitude: userCoords.lat,
              longitude: userCoords.lng,
              distanceKm,
              isRemote: (distanceKm || 0) > 0.5,
            }
          : undefined,
      };

      const res = await fetch(`${apiBase}/api/v1/guest-portal/rooms/book-and-checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hotel-id': hotelId,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const { sessionToken, roomNumber } = json.data;
        if (typeof window !== 'undefined' && sessionToken) {
          localStorage.setItem('spicehub_guest_session', sessionToken);
        }
        setIsBookingModalOpen(false);
        if (onRoomBooked) {
          onRoomBooked(roomNumber, sessionToken);
        }
      } else {
        setBookingError(json.message || 'Booking failed');
      }
    } catch (err: any) {
      setBookingError(err.message || 'Network error submitting booking');
    } finally {
      setSubmittingBooking(false);
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0b0e14] text-slate-100' : 'bg-slate-50 text-slate-900'} pb-32 transition-colors duration-200`}>
      {/* Top Banner / Hotel Identification with Theme Toggle */}
      <div
        className={`px-4 py-3.5 sticky top-0 z-20 backdrop-blur-md transition-colors ${
          isDark
            ? 'bg-[#121620]/95 border-b border-slate-800/90 shadow-md'
            : 'bg-white/95 border-b border-slate-200/90 shadow-sm'
        }`}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {hotel?.logoUrl ? (
              <img
                src={hotel.logoUrl}
                alt={hotel.name}
                className="w-10 h-10 rounded-xl object-cover border border-amber-500/40 shadow-sm"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Building className="w-5 h-5 text-amber-500" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-base sm:text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {hotel?.name || 'Luxury Hotel & Suites'}
                </h1>
              </div>
              <p className={`text-xs flex items-center gap-1 mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>{hotel?.city ? `${hotel.city}, ${hotel.state}` : 'Property Hub'}</span>
                <span className="text-amber-500 font-bold">• Live Room Matrix</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle Button */}
            <button
              onClick={handleToggleTheme}
              data-testid="guest-theme-toggle"
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 shadow-sm'
              }`}
              title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-700" />
                  <span className="hidden sm:inline">Dark Mode</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                setRefreshing(true);
                fetchRoomsCatalog();
              }}
              className={`p-2 rounded-xl border transition-all active:scale-95 ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 shadow-sm'
              }`}
              title="Refresh Room Statuses"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            {activeRoomNumber && onCancelOrBack && (
              <button
                onClick={onCancelOrBack}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all shadow-sm"
              >
                Room {activeRoomNumber} Stay →
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5 space-y-5">
        {/* Available Rooms Hero Callout */}
        <div
          className={`rounded-2xl p-4 sm:p-5 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border ${
            isDark
              ? 'bg-gradient-to-r from-emerald-950/50 via-slate-900 to-[#121620] border-emerald-500/30 shadow-lg'
              : 'bg-gradient-to-r from-emerald-50 via-teal-50 to-white border-emerald-200/90 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                isDark
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-emerald-100 border-emerald-300 text-emerald-800'
              }`}
            >
              <BedDouble className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    isDark
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}
                >
                  🟢 Live Reception Catalog
                </span>
                <span className={`text-xs font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                  • Instant Digital Check-In
                </span>
              </div>
              <h2 className={`text-sm sm:text-base font-black mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {counts.available > 0
                  ? `${counts.available} Verified Available Rooms Ready for Check-In`
                  : 'Checking Live Reception Availability...'}
              </h2>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Rooms shown below are sanitized, inspected by housekeeping, and ready for immediate keycard access.
              </p>
            </div>
          </div>
          <div className="shrink-0">
            <button
              onClick={() => setFilter('AVAILABLE')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all border ${
                filter === 'AVAILABLE'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                  : isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-sm'
              }`}
            >
              View Available Only ({counts.available})
            </button>
          </div>
        </div>

        {/* 1. Real-Time Status Counters KPI */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div
            onClick={() => setFilter('AVAILABLE')}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              filter === 'AVAILABLE'
                ? isDark
                  ? 'bg-emerald-950/60 border-emerald-500/70 shadow-lg shadow-emerald-950/40'
                  : 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/30 shadow-sm'
                : isDark
                ? 'bg-[#141926] border-slate-800 hover:border-emerald-500/40'
                : 'bg-white border-slate-200 hover:border-emerald-300 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-800'}`}>
                Available
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className={`text-2xl font-black mt-1 ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
              {counts.available}
            </div>
            <p className={`text-[11px] font-medium mt-0.5 ${isDark ? 'text-emerald-400/80' : 'text-emerald-700/80'}`}>
              Ready for Instant Check-In
            </p>
          </div>

          <div
            onClick={() => setFilter('CLEANING')}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              filter === 'CLEANING'
                ? isDark
                  ? 'bg-amber-950/60 border-amber-500/70 shadow-lg shadow-amber-950/40'
                  : 'bg-amber-50 border-amber-400 ring-2 ring-amber-500/30 shadow-sm'
                : isDark
                ? 'bg-[#141926] border-slate-800 hover:border-amber-500/40'
                : 'bg-white border-slate-200 hover:border-amber-300 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>
                In Cleaning
              </span>
              <Sparkles className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
            </div>
            <div className={`text-2xl font-black mt-1 ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
              {counts.cleaning}
            </div>
            <p className={`text-[11px] font-medium mt-0.5 ${isDark ? 'text-amber-400/80' : 'text-amber-700/80'}`}>
              Housekeeping Turn
            </p>
          </div>

          <div
            onClick={() => setFilter('MAINTENANCE')}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              filter === 'MAINTENANCE'
                ? isDark
                  ? 'bg-rose-950/60 border-rose-500/70 shadow-lg shadow-rose-950/40'
                  : 'bg-rose-50 border-rose-400 ring-2 ring-rose-500/30 shadow-sm'
                : isDark
                ? 'bg-[#141926] border-slate-800 hover:border-rose-500/40'
                : 'bg-white border-slate-200 hover:border-rose-300 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold ${isDark ? 'text-rose-400' : 'text-rose-800'}`}>
                Maintenance
              </span>
              <Wrench className={`w-3.5 h-3.5 ${isDark ? 'text-rose-400' : 'text-rose-600'}`} />
            </div>
            <div className={`text-2xl font-black mt-1 ${isDark ? 'text-rose-300' : 'text-rose-700'}`}>
              {counts.maintenance}
            </div>
            <p className={`text-[11px] font-medium mt-0.5 ${isDark ? 'text-rose-400/80' : 'text-rose-700/80'}`}>
              Engineering Out
            </p>
          </div>

          <div
            onClick={() => setFilter('OCCUPIED')}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              filter === 'OCCUPIED'
                ? isDark
                  ? 'bg-purple-950/60 border-purple-500/70 shadow-lg'
                  : 'bg-purple-50 border-purple-400 ring-2 ring-purple-500/30 shadow-sm'
                : isDark
                ? 'bg-[#141926] border-slate-800 hover:border-purple-500/40'
                : 'bg-white border-slate-200 hover:border-purple-300 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold ${isDark ? 'text-purple-400' : 'text-purple-800'}`}>
                Occupied
              </span>
              <UserCheck className={`w-3.5 h-3.5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
            </div>
            <div className={`text-2xl font-black mt-1 ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>
              {counts.occupied}
            </div>
            <p className={`text-[11px] font-medium mt-0.5 ${isDark ? 'text-purple-400/80' : 'text-purple-700/80'}`}>
              Guests In-House
            </p>
          </div>
        </div>

        {/* 2. Interactive Date Picker & Dynamic Stay Duration */}
        <div
          className={`border rounded-2xl p-4 shadow-sm transition-all ${
            isDark ? 'bg-[#141926] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-black">Select Stay Dates & Duration</h2>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 font-extrabold border border-amber-500/30">
              {nights} {nights === 1 ? 'Night' : 'Nights'} Stay
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`text-[11px] font-bold uppercase tracking-wider block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Check-In Date
              </label>
              <input
                type="date"
                value={checkInDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setCheckInDate(e.target.value)}
                className={`w-full rounded-xl px-3 py-2 text-sm font-semibold border transition-all focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  isDark
                    ? 'bg-[#0b0e14] border-slate-700 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
                }`}
              />
            </div>

            <div>
              <label className={`text-[11px] font-bold uppercase tracking-wider block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Nights Duration
              </label>
              <div
                className={`flex items-center border rounded-xl px-2 py-1 justify-between ${
                  isDark ? 'bg-[#0b0e14] border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <button
                  type="button"
                  data-testid="nights-minus-btn"
                  onClick={() => setNights((n) => Math.max(1, n - 1))}
                  className={`p-1 rounded-lg transition-all active:scale-95 ${
                    isDark ? 'bg-white/5 hover:bg-white/10 text-slate-300' : 'bg-white hover:bg-slate-200 text-slate-700 shadow-sm'
                  }`}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span data-testid="nights-count-display" className="font-black text-amber-500 text-sm">
                  {nights} {nights === 1 ? 'Night' : 'Nights'}
                </span>
                <button
                  type="button"
                  data-testid="nights-plus-btn"
                  onClick={() => setNights((n) => n + 1)}
                  className={`p-1 rounded-lg transition-all active:scale-95 ${
                    isDark ? 'bg-white/5 hover:bg-white/10 text-slate-300' : 'bg-white hover:bg-slate-200 text-slate-700 shadow-sm'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className={`text-[11px] font-bold uppercase tracking-wider block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Check-Out Date
              </label>
              <div
                className={`w-full border rounded-xl px-3 py-2 text-sm font-semibold flex items-center justify-between ${
                  isDark ? 'bg-[#0b0e14]/50 border-slate-700 text-amber-300' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <span>{checkOutDate}</span>
                <Clock className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Dynamic Tariff Multiplier Bar */}
          <div
            data-testid="date-picker-price-indicator"
            className={`mt-3 pt-2.5 border-t flex items-center justify-between text-xs ${
              isDark ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-600'
            }`}
          >
            <span>Calculated Tariff ({nights} {nights === 1 ? 'Night' : 'Nights'} Stay):</span>
            <span className="font-black text-amber-500">
              ₹{(2500 * nights).toLocaleString('en-IN')} + 12% GST = ₹
              {(2500 * nights + Math.round(2500 * nights * 0.12)).toLocaleString('en-IN')} Total
            </span>
          </div>
        </div>

        {/* 3. Distance & GPS Location Check */}
        <div
          className={`border rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm ${
            isDark ? 'bg-[#141926] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Navigation className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <div className="text-xs font-black flex items-center gap-1.5">
                Distance to Hotel Property
                {distanceKm !== null && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 font-bold border border-emerald-500/30">
                    {distanceKm} km away
                  </span>
                )}
              </div>
              <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {locationStatus}
              </p>
            </div>
          </div>

          <button
            data-testid="verify-distance-btn"
            onClick={handleDetectLocation}
            disabled={locating}
            className="w-full sm:w-auto px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 shadow-sm"
          >
            <MapPin className="w-3.5 h-3.5" />
            {locating ? 'Detecting GPS...' : 'Verify Distance'}
          </button>
        </div>

        {/* 4. Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {(['AVAILABLE', 'ALL', 'CLEANING', 'MAINTENANCE', 'OCCUPIED'] as const).map((tab) => (
            <button
              key={tab}
              data-testid={`filter-tab-${tab.toLowerCase()}`}
              onClick={() => setFilter(tab)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                filter === tab
                  ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-sm font-black'
                  : isDark
                  ? 'bg-[#141926] border-slate-800 text-slate-400 hover:text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 shadow-sm'
              }`}
            >
              {tab === 'AVAILABLE' && `🟢 Available (${counts.available})`}
              {tab === 'ALL' && `All Rooms (${counts.total})`}
              {tab === 'CLEANING' && `Cleaning (${counts.cleaning})`}
              {tab === 'MAINTENANCE' && `Maintenance (${counts.maintenance})`}
              {tab === 'OCCUPIED' && `Occupied (${counts.occupied})`}
            </button>
          ))}
        </div>

        {/* 5. Rooms Grid with Photos */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
            <p className="text-sm font-medium">Checking live room availability from reception...</p>
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            {error}
          </div>
        ) : filteredRooms.length === 0 ? (
          <div
            className={`p-12 text-center rounded-2xl border ${
              isDark ? 'bg-[#141926] border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500 shadow-sm'
            }`}
          >
            <BedDouble className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-base font-bold text-slate-700">No rooms found in this category.</p>
            <p className="text-xs text-slate-400 mt-1">Switch to "Available" or "All Rooms" to view the full inventory.</p>
            <button
              onClick={() => setFilter('AVAILABLE')}
              className="mt-4 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-sm hover:bg-amber-400"
            >
              Show Available Rooms ({counts.available})
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRooms.map((room, idx) => {
              const pricing = getPricingForRoom(room);
              const isAvailable = room.isBookable;
              const photoUrl = getRoomPhoto(room, idx);

              return (
                <div
                  key={room.id}
                  className={`rounded-3xl border transition-all overflow-hidden flex flex-col justify-between ${
                    isAvailable
                      ? isDark
                        ? 'bg-[#141926] border-emerald-500/40 hover:border-emerald-500/70 shadow-lg'
                        : 'bg-white border-slate-200/90 hover:border-emerald-500/50 hover:shadow-md shadow-sm'
                      : room.displayStatus === 'CLEANING'
                      ? isDark
                        ? 'bg-[#141926]/80 border-amber-500/20 opacity-90'
                        : 'bg-slate-50 border-amber-200 opacity-90'
                      : room.displayStatus === 'MAINTENANCE'
                      ? isDark
                        ? 'bg-[#141926]/80 border-rose-500/20 opacity-80'
                        : 'bg-slate-50 border-rose-200 opacity-80'
                      : isDark
                      ? 'bg-[#141926]/70 border-slate-800 opacity-75'
                      : 'bg-slate-50 border-slate-200 opacity-75'
                  }`}
                >
                  {/* Photo Header with Badges */}
                  <div className="relative h-44 sm:h-48 w-full bg-slate-900 overflow-hidden">
                    <img
                      src={photoUrl}
                      alt={room.roomType.name}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = FALLBACK_ROOM_IMAGE;
                      }}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                    {/* Room Number Badge & Status Pill */}
                    <div className="absolute top-3 inset-x-3 flex items-center justify-between">
                      <div className="px-3 py-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-white font-black text-xs flex items-center gap-1.5 shadow-md">
                        <BedDouble className="w-3.5 h-3.5 text-amber-400" />
                        <span>Room {room.roomNumber}</span>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-3 py-1 rounded-full shadow-md backdrop-blur-md border ${
                          isAvailable
                            ? 'bg-emerald-600/90 text-white border-emerald-400'
                            : room.displayStatus === 'CLEANING'
                            ? 'bg-amber-500/90 text-slate-950 border-amber-300'
                            : room.displayStatus === 'MAINTENANCE'
                            ? 'bg-rose-600/90 text-white border-rose-400'
                            : 'bg-purple-600/90 text-white border-purple-400'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        {room.statusBadge}
                      </span>
                    </div>

                    {/* Room Category Label on Image */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                      <div>
                        <h3 className="text-white font-black text-base sm:text-lg drop-shadow-md leading-tight">
                          {room.roomType.name}
                        </h3>
                        <p className="text-amber-200/90 text-xs font-semibold drop-shadow flex items-center gap-2 mt-0.5">
                          <span>Floor {room.floorNumber}</span>
                          <span>• Wing {room.wing || 'Main'}</span>
                          <span>• Max {room.roomType.maxCapacity || 2} Guests</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card Content & Details */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Amenities Pills */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {(room.roomType.amenities.length > 0
                          ? room.roomType.amenities
                          : ['Free High-Speed WiFi', 'Air Conditioning', 'King Bed', 'Room Service']
                        )
                          .slice(0, 4)
                          .map((amenity, idx2) => (
                            <span
                              key={idx2}
                              className={`text-[11px] px-2.5 py-1 rounded-lg font-medium border flex items-center gap-1 ${
                                isDark
                                  ? 'bg-slate-800/80 border-slate-700 text-slate-300'
                                  : 'bg-slate-100 border-slate-200 text-slate-700'
                              }`}
                            >
                              <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                              {amenity}
                            </span>
                          ))}
                      </div>

                      {/* Pricing Block */}
                      <div
                        className={`p-3 rounded-2xl border mb-3 flex items-center justify-between ${
                          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div>
                          <div className={`text-[11px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Tariff for {nights} {nights === 1 ? 'Night' : 'Nights'}
                          </div>
                          <div className={`text-lg font-black ${isDark ? 'text-amber-400' : 'text-slate-900'}`}>
                            ₹{pricing.grandTotal.toLocaleString('en-IN')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            ₹{pricing.basePerNight.toLocaleString('en-IN')}/nt
                          </div>
                          <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            + {pricing.gstRate}% GST (₹{pricing.gstAmount.toLocaleString('en-IN')})
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Instant Booking Action */}
                    <div>
                      {isAvailable ? (
                        <button
                          data-testid={`book-room-btn-${room.roomNumber}`}
                          onClick={() => handleOpenBooking(room)}
                          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-98 transition-all"
                        >
                          <KeyRound className="w-4 h-4 text-emerald-100" />
                          <span>
                            Book Room {room.roomNumber} Now ({nights} {nights === 1 ? 'Night' : 'Nights'}) • ₹
                            {pricing.grandTotal.toLocaleString('en-IN')}
                          </span>
                        </button>
                      ) : (
                        <div
                          className={`w-full py-2.5 px-3 rounded-xl text-center text-xs font-bold border ${
                            isDark
                              ? 'bg-slate-800/40 border-slate-800 text-slate-500'
                              : 'bg-slate-100 border-slate-200 text-slate-500'
                          } cursor-not-allowed`}
                        >
                          {room.displayStatus === 'CLEANING' && '🧹 Under Housekeeping Reclean'}
                          {room.displayStatus === 'MAINTENANCE' && '🛠️ Out-of-Service Maintenance'}
                          {room.displayStatus === 'OCCUPIED' && '👤 Currently Occupied by Guest'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. Guest KYC, Couple & ID Document Verification Modal */}
      {isBookingModalOpen && selectedRoom && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div
            className={`rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl space-y-4 border ${
              isDark
                ? 'bg-[#141926] border-slate-800 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Modal Header */}
            <div
              className={`flex items-start justify-between border-b pb-3 ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}
            >
              <div>
                <span className="text-xs font-extrabold text-amber-500 uppercase tracking-wider">
                  Guest Verification & Instant Check-In
                </span>
                <h3 className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Room {selectedRoom.roomNumber} • {selectedRoom.roomType.name}
                </h3>
              </div>
              <button
                onClick={() => setIsBookingModalOpen(false)}
                className={`p-1.5 rounded-xl border transition-all ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
                }`}
              >
                ✕
              </button>
            </div>

            {/* Dynamic Price Summary Box */}
            {(() => {
              const pricing = getPricingForRoom(selectedRoom);
              return (
                <div
                  className={`border rounded-2xl p-3.5 space-y-1.5 text-xs ${
                    isDark
                      ? 'bg-amber-950/30 border-amber-500/30 text-slate-300'
                      : 'bg-amber-50/80 border-amber-200 text-slate-700'
                  }`}
                >
                  <div className="flex justify-between">
                    <span>
                      Tariff ({nights} {nights === 1 ? 'night' : 'nights'} × ₹{pricing.basePerNight})
                    </span>
                    <span className="font-bold">₹{pricing.subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>GST Tax ({pricing.gstRate}%)</span>
                    <span>₹{pricing.gstAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="border-t border-amber-500/20 pt-1.5 flex justify-between font-black text-sm text-amber-600">
                    <span>Total Payable (Admin Tariff)</span>
                    <span>₹{pricing.grandTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              );
            })()}

            {/* Form Fields */}
            <div className="space-y-3">
              <div>
                <label className={`text-[11px] font-bold uppercase block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Primary Guest Full Name *
                </label>
                <input
                  type="text"
                  data-testid="input-guest-name"
                  placeholder="e.g. Vikramaditya Oberoi"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    isDark
                      ? 'bg-[#0b0e14] border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`text-[11px] font-bold uppercase block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    data-testid="input-guest-phone"
                    placeholder="9820011223"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      isDark
                        ? 'bg-[#0b0e14] border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                    }`}
                  />
                </div>

                <div>
                  <label className={`text-[11px] font-bold uppercase block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    data-testid="input-guest-email"
                    placeholder="guest@example.com"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      isDark
                        ? 'bg-[#0b0e14] border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                    }`}
                  />
                </div>
              </div>

              {/* Couple Stay Check-In Toggle */}
              <div
                className={`border rounded-xl p-3 flex items-center justify-between ${
                  isDark ? 'bg-[#0b0e14] border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Heart className={`w-4 h-4 ${isCouple ? 'text-rose-500 fill-rose-500' : 'text-slate-400'}`} />
                  <div>
                    <span className={`text-xs font-bold block ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Staying as a Couple?
                    </span>
                    <span className="text-[10px] text-slate-500">Couple-friendly verification supported</span>
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="toggle-couple-stay"
                  onClick={() => setIsCouple(!isCouple)}
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                    isCouple ? 'bg-rose-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${
                      isCouple ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Front Desk Reception Verification Notice (No KYC Upload in App!) */}
              <div
                className={`p-3 rounded-2xl border flex items-start gap-2.5 text-xs ${
                  isDark
                    ? 'bg-blue-950/20 border-blue-500/30 text-blue-200'
                    : 'bg-blue-50 border-blue-200 text-blue-900'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block">Front Desk ID Verification Upon Arrival</span>
                  <p className="text-[11px] opacity-90 leading-tight">
                    No document upload required in app. Please carry any government photo ID (Aadhaar / Passport / Driving License) to present to the reception desk during check-in.
                  </p>
                </div>
              </div>

              {bookingError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {bookingError}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsBookingModalOpen(false)}
                className={`w-1/3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Back
              </button>

              <button
                type="button"
                data-testid="btn-confirm-instant-checkin"
                onClick={handleConfirmBooking}
                disabled={submittingBooking}
                className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-98 disabled:opacity-50"
              >
                {submittingBooking ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Generating Keycard...
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    Confirm & Check In (Room {selectedRoom.roomNumber})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
