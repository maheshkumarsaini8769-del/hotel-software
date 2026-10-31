import React, { useState, useEffect, useRef } from 'react';
import { API_ORIGIN } from '../config/api';
import { SpiceHubSocket } from '@spicehub/api-client';
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
  Snowflake,
  Camera,
  Upload,
  Check,
  Lock,
  Unlock,
  Users,
  Eye,
  Home,
  CheckCircle,
  Radio,
} from 'lucide-react';

const compressImageToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.72);
        resolve(compressed);
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

const generateSampleAadhaarImage = (side: 'FRONT' | 'BACK', name: string, phone: string): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 380;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = side === 'FRONT' ? '#f8fafc' : '#f1f5f9';
    ctx.fillRect(0, 0, 600, 380);
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(0, 0, 600, 28);
    ctx.fillStyle = '#16a34a';
    ctx.fillRect(0, 352, 600, 28);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(
      side === 'FRONT' ? 'GOVERNMENT OF INDIA - AADHAAR CARD' : 'UNIQUE IDENTIFICATION AUTHORITY OF INDIA',
      24,
      64
    );
    ctx.font = '14px sans-serif';
    if (side === 'FRONT') {
      ctx.fillText(`Name: ${name || 'Resident Guest'}`, 170, 115);
      ctx.fillText(`DOB: 15/08/1990`, 170, 145);
      ctx.fillText(`Gender: MALE`, 170, 175);
      ctx.font = 'bold 22px monospace';
      ctx.fillText(`XXXX XXXX ${phone.slice(-4) || '9012'}`, 170, 230);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(24, 90, 120, 150);
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('ID PHOTO', 55, 170);
    } else {
      ctx.fillText(`Address: H-44, Civil Lines, Jaipur, Rajasthan - 302006`, 24, 115);
      ctx.fillText(`Guardian: K. S. Oberoi`, 24, 145);
      ctx.fillText(`UIDAI Official Helpline: 1947`, 24, 195);
      ctx.font = 'bold 22px monospace';
      ctx.fillText(`XXXX XXXX ${phone.slice(-4) || '9012'}`, 24, 250);
      ctx.fillStyle = '#334155';
      ctx.fillRect(440, 95, 130, 130);
      ctx.fillStyle = '#ffffff';
      ctx.font = '11px monospace';
      ctx.fillText('VERIFIED QR', 460, 165);
    }
  }
  return canvas.toDataURL('image/jpeg', 0.8);
};

export interface CatalogRoom {
  id: string;
  roomNumber: string;
  floorNumber: number;
  wing: string;
  rawStatus: string;
  displayStatus: 'AVAILABLE' | 'CLEANING' | 'MAINTENANCE' | 'OCCUPIED' | 'RESERVED';
  statusBadge: string;
  isBookable: boolean;
  isAc?: boolean;
  roomType: {
    id: string;
    name: string;
    code: string;
    basePriceOvernight: number;
    gstRate: number;
    amenities: string[];
    maxCapacity: number;
    photos?: string[];
    isAc?: boolean;
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
  hasNonAcRooms?: boolean;
  allRoomsAcOnly?: boolean;
  wifiSsid?: string;
  wifiPassword?: string;
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
  const [climateFilter, setClimateFilter] = useState<'ALL' | 'AC' | 'NON_AC'>('ALL');
  const [capacityFilter, setCapacityFilter] = useState<'ALL' | '1' | '2' | '3+'>('ALL');
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

  // KYC, Aadhaar & Location State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingLocationMode, setBookingLocationMode] = useState<'HOTEL' | 'HOME'>('HOTEL');
  const [estimatedArrivalTime, setEstimatedArrivalTime] = useState('14:00');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('9820011223');
  const [guestEmail, setGuestEmail] = useState('');
  const [isCouple, setIsCouple] = useState(true);

  // Mandatory Aadhaar Front & Back Photos
  const [aadhaarFront, setAadhaarFront] = useState<string | null>(null);
  const [aadhaarBack, setAadhaarBack] = useState<string | null>(null);
  const [aadhaarCompressing, setAadhaarCompressing] = useState<'FRONT' | 'BACK' | null>(null);

  // Phone OTP Verification (Mandatory for In-Hotel Bookings)
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtpVerified, setPhoneOtpVerified] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpSuccessMsg, setOtpSuccessMsg] = useState<string | null>(null);

  // 2-Room Maximum Limit & Secondary Guest Disclosure
  const [isSecondRoom, setIsSecondRoom] = useState(false);
  const [secondaryGuestName, setSecondaryGuestName] = useState('');
  const [secondaryGuestPhone, setSecondaryGuestPhone] = useState('');
  const [secondaryGuestRelationship, setSecondaryGuestRelationship] = useState('Spouse / Family Member');

  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Reception Approval Waiting State
  const [pendingBooking, setPendingBooking] = useState<any | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('spicehub_pending_approval_booking');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return null;
  });
  const [isWaitingForApproval, setIsWaitingForApproval] = useState(() => {
    if (typeof window !== 'undefined') {
      return Boolean(localStorage.getItem('spicehub_pending_approval_booking'));
    }
    return false;
  });
  const [isApprovalGranted, setIsApprovalGranted] = useState(false);

  // Real-Time Reception Approval Listener & Fallback Polling
  useEffect(() => {
    if (!isWaitingForApproval || !pendingBooking?.bookingNumber) return;

    const bNum = pendingBooking.bookingNumber;
    const socket = SpiceHubSocket.getInstance();
    const effectiveHotelId = hotelId || (hotel?.id ? String(hotel.id) : '');

    if (effectiveHotelId) {
      socket.connect({
        serverUrl: API_ORIGIN,
        hotelId: effectiveHotelId,
        station: 'guest-booking',
      });
    }

    const handleApproved = (data: any) => {
      if (
        data.bookingNumber === bNum ||
        (data.roomNumber === pendingBooking.roomNumber && data.guestPhone === pendingBooking.guestPhone)
      ) {
        console.log('🎉 [RoomCatalog] Booking approved by reception via Socket.io!', data);
        setIsApprovalGranted(true);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('spicehub_pending_approval_booking');
          if (data.sessionToken) {
            localStorage.setItem('spicehub_guest_session', data.sessionToken);
          }
        }
        setTimeout(() => {
          setIsWaitingForApproval(false);
          if (onRoomBooked) {
            onRoomBooked(data.roomNumber || pendingBooking.roomNumber, data.sessionToken);
          }
        }, 1200);
      }
    };

    socket.on('pms:booking_approved', handleApproved);

    // Fallback polling every 3s
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`${apiBase}/api/v1/guest-portal/rooms/booking-status/${bNum}?hotelId=${hotelId}`);
        if (!res.ok) return;
        const statusJson = await res.json();
        if (statusJson.success && statusJson.data?.isApproved) {
          console.log('🎉 [RoomCatalog] Booking approved by reception via poller!', statusJson.data);
          setIsApprovalGranted(true);
          clearInterval(pollInterval);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('spicehub_pending_approval_booking');
            if (statusJson.data.sessionToken) {
              localStorage.setItem('spicehub_guest_session', statusJson.data.sessionToken);
            }
          }
          setTimeout(() => {
            setIsWaitingForApproval(false);
            if (onRoomBooked) {
              onRoomBooked(statusJson.data.roomNumber || pendingBooking.roomNumber, statusJson.data.sessionToken);
            }
          }, 1200);
        }
      } catch (e) {
        // network glitch
      }
    }, 3000);

    return () => {
      socket.off('pms:booking_approved', handleApproved);
      clearInterval(pollInterval);
    };
  }, [isWaitingForApproval, pendingBooking, hotelId, hotel]);

  // Handlers for Phone OTP Verification
  const handleSendOtp = async () => {
    if (!guestPhone || guestPhone.trim().length < 8) {
      setBookingError('Please enter a valid mobile number first.');
      return;
    }
    setOtpSending(true);
    setBookingError(null);
    try {
      const res = await fetch(`${apiBase}/api/v1/guest-portal/rooms/send-phone-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotelId, phone: guestPhone.trim() }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setPhoneOtpSent(true);
        if (json.data?.devOtp) setPhoneOtp(json.data.devOtp);
        setOtpSuccessMsg(json.message || 'OTP sent successfully to your mobile number.');
      } else {
        setBookingError(json.message || 'Failed to send OTP.');
      }
    } catch (e: any) {
      setBookingError(e.message || 'Network error sending OTP.');
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!phoneOtp || phoneOtp.trim().length < 4) {
      setBookingError('Please enter the 4-digit OTP code.');
      return;
    }
    setOtpVerifying(true);
    setBookingError(null);
    try {
      const res = await fetch(`${apiBase}/api/v1/guest-portal/rooms/verify-phone-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotelId, phone: guestPhone.trim(), otp: phoneOtp.trim() }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setPhoneOtpVerified(true);
        setOtpSuccessMsg('✓ Mobile number successfully verified!');
      } else {
        setBookingError(json.message || 'Invalid or expired OTP.');
      }
    } catch (e: any) {
      setBookingError(e.message || 'Network error verifying OTP.');
    } finally {
      setOtpVerifying(false);
    }
  };

  // Handlers for Aadhaar Photo Upload & Compression
  const handleUploadAadhaar = async (e: React.ChangeEvent<HTMLInputElement>, side: 'FRONT' | 'BACK') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAadhaarCompressing(side);
    try {
      const base64 = await compressImageToBase64(file);
      if (side === 'FRONT') {
        setAadhaarFront(base64);
      } else {
        setAadhaarBack(base64);
      }
    } catch (err: any) {
      setBookingError('Error processing Aadhaar image: ' + err.message);
    } finally {
      setAadhaarCompressing(null);
    }
  };

  const handleAttachSampleAadhaar = (side: 'FRONT' | 'BACK') => {
    const uri = generateSampleAadhaarImage(side, guestName || 'Resident Guest', guestPhone || '9820011223');
    if (side === 'FRONT') setAadhaarFront(uri);
    else setAadhaarBack(uri);
  };

  // Resident Stay Unlock State
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      return p.get('unlock') === 'true' || p.get('unlock') === '1';
    }
    return false;
  });
  const [unlockRoomNumber, setUnlockRoomNumber] = useState('');
  const [unlockLastName, setUnlockLastName] = useState('');
  const [unlockOtp, setUnlockOtp] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const handleUnlockStay = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const rNum = unlockRoomNumber.trim();
    const nameOrPhone = unlockLastName.trim();
    if (!rNum) {
      setUnlockError('Please enter your room number');
      return;
    }
    if (!nameOrPhone) {
      setUnlockError('Please enter your last name or registered phone');
      return;
    }

    try {
      setIsUnlocking(true);
      setUnlockError(null);
      const isDigitsOnly = /^[0-9+\s()-]+$/.test(nameOrPhone);
      const effectiveHotelId = hotelId || (hotel?.id ? String(hotel.id) : '');
      const res = await fetch(`${apiBase}/api/v1/guest-portal/stay/verify-resident`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hotel-id': effectiveHotelId,
        },
        body: JSON.stringify({
          hotelId: effectiveHotelId || undefined,
          roomNumber: rNum,
          guestPhone: isDigitsOnly ? nameOrPhone : undefined,
          lastName: nameOrPhone,
          otp: unlockOtp.trim(),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success && json.data?.sessionToken) {
        const { sessionToken, roomNumber } = json.data;
        if (typeof window !== 'undefined' && sessionToken) {
          localStorage.setItem('spicehub_guest_session', sessionToken);
        }
        setIsUnlockModalOpen(false);
        if (onRoomBooked) {
          onRoomBooked(roomNumber || rNum, sessionToken);
        } else if (typeof window !== 'undefined') {
          const dest = new URL(window.location.href);
          dest.searchParams.set('room', roomNumber || rNum);
          dest.searchParams.set('tab', 'HOME');
          window.location.href = dest.toString();
        }
      } else {
        setUnlockError(json.message || 'Stay verification failed. Please check credentials or contact front desk.');
      }
    } catch (err: any) {
      setUnlockError(err.message || 'Network error verifying stay.');
    } finally {
      setIsUnlocking(false);
    }
  };

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

        if (dist <= 0.5) {
          setLocationStatus(`Verified on-site: within hotel premises (${Math.round(dist * 1000)}m away)`);
          setBookingLocationMode('HOTEL');
        } else {
          setLocationStatus(`Remote location: ${dist} km away from hotel. Switched to Home Booking.`);
          setBookingLocationMode('HOME');
        }
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setLocationStatus('GPS detection skipped or denied (Defaulting to In-Hotel reception)');
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

  const hasNonAcRooms = Boolean(
    hotel?.hasNonAcRooms ??
      rooms.some(
        (r) =>
          r.isAc === false ||
          r.roomType?.isAc === false ||
          /non[-\s]?ac/i.test(r.roomType?.name || '')
      )
  );
  const allRoomsAcOnly = Boolean(hotel?.allRoomsAcOnly ?? !hasNonAcRooms);

  const filteredRooms = rooms.filter((r) => {
    // 1. Status Filter
    if (filter !== 'ALL' && r.displayStatus !== filter) return false;

    // 2. Climate Filter (AC vs Non-AC)
    if (climateFilter !== 'ALL') {
      const isRoomAc =
        r.isAc !== false &&
        r.roomType?.isAc !== false &&
        !/non[-\s]?ac/i.test(r.roomType?.name || '');
      if (climateFilter === 'AC' && !isRoomAc) return false;
      if (climateFilter === 'NON_AC' && isRoomAc) return false;
    }

    // 3. Guest Capacity Filter
    if (capacityFilter !== 'ALL') {
      const cap = Number(r.roomType?.maxCapacity) || 2;
      if (capacityFilter === '1' && cap !== 1) return false;
      if (capacityFilter === '2' && cap !== 2) return false;
      if (capacityFilter === '3+' && cap < 3) return false;
    }

    return true;
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

    // Phone OTP validation for in-hotel booking
    if (bookingLocationMode === 'HOTEL' && !phoneOtpVerified) {
      setBookingError('Please verify your mobile number with OTP before booking on-site at hotel.');
      return;
    }

    // Aadhaar KYC validation
    if (!aadhaarFront || !aadhaarBack) {
      setBookingError('Both Front and Back photos of Aadhaar card are required. Please upload or tap "Use Sample ID".');
      return;
    }

    // Secondary guest validation for 2nd room
    if (isSecondRoom && !secondaryGuestName.trim()) {
      setBookingError('Please enter the Secondary Guest Name for your 2nd room booking.');
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
        nights,
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim(),
        guestEmail: guestEmail.trim() || `${guestPhone.trim()}@guest.spicehub.com`,
        isCouple,
        idType: 'AADHAAR',
        idNumber: `AADHAAR-${guestPhone.trim().slice(-4)}`,
        aadhaarFrontUrl: aadhaarFront,
        aadhaarBackUrl: aadhaarBack,
        estimatedArrivalTime: bookingLocationMode === 'HOME' ? estimatedArrivalTime : undefined,
        guestPhoneVerified: phoneOtpVerified,
        secondaryGuestName: isSecondRoom ? secondaryGuestName.trim() : undefined,
        secondaryGuestPhone: isSecondRoom ? secondaryGuestPhone.trim() : undefined,
        secondaryGuestRelationship: isSecondRoom ? secondaryGuestRelationship.trim() : undefined,
        bookingLocation: bookingLocationMode === 'HOTEL' ? 'HOTEL_RADIUS' : 'REMOTE_HOME',
        advancePaid: pricing.grandTotal,
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
      if (res.ok && json.success && json.data) {
        const bookingData = json.data;
        setPendingBooking(bookingData);
        setIsWaitingForApproval(true);
        setIsBookingModalOpen(false);
        if (typeof window !== 'undefined') {
          localStorage.setItem('spicehub_pending_approval_booking', JSON.stringify(bookingData));
        }
      } else {
        if (json.errorCode === 'BOOKING_LIMIT_EXCEEDED') {
          setBookingError(`🚫 ${json.message}`);
        } else if (json.errorCode === 'SECONDARY_GUEST_REQUIRED') {
          setIsSecondRoom(true);
          setBookingError(`⚠️ ${json.message}`);
        } else {
          setBookingError(json.message || 'Booking submission failed');
        }
      }
    } catch (err: any) {
      setBookingError(err.message || 'Network error submitting booking');
    } finally {
      setSubmittingBooking(false);
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} pb-32 transition-colors duration-200`}>
      {/* Top Banner / Hotel Identification with Theme Toggle */}
      <div
        className={`px-4 py-3.5 sticky top-0 z-20 backdrop-blur-md transition-colors ${
          isDark
            ? 'bg-slate-900/95 border-b border-slate-800/90 shadow-md'
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
              onClick={() => setIsUnlockModalOpen(true)}
              data-testid="btn-open-unlock-modal"
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
                isDark
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                  : 'bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200 shadow-sm'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-500" />
              <span>Unlock Room</span>
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
              ? 'bg-slate-900 border-emerald-500/30 shadow-sm'
              : 'bg-emerald-50 border-emerald-200 shadow-sm'
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
          <div className="shrink-0 flex items-center gap-2">
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
            <button
              onClick={() => setIsUnlockModalOpen(true)}
              data-testid="hero-unlock-room-btn"
              className="px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-400 shadow-md flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Unlock Room</span>
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
                ? 'bg-slate-900 border-slate-800 hover:border-emerald-500/40'
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
                ? 'bg-slate-900 border-slate-800 hover:border-amber-500/40'
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
                  ? 'bg-red-950/60 border-red-500/70 shadow-lg shadow-sm'
                  : 'bg-red-50 border-red-400 ring-2 ring-red-500/30 shadow-sm'
                : isDark
                ? 'bg-slate-900 border-slate-800 hover:border-red-500/40'
                : 'bg-white border-slate-200 hover:border-red-300 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold ${isDark ? 'text-red-400' : 'text-red-800'}`}>
                Maintenance
              </span>
              <Wrench className={`w-3.5 h-3.5 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
            </div>
            <div className={`text-2xl font-black mt-1 ${isDark ? 'text-red-300' : 'text-red-700'}`}>
              {counts.maintenance}
            </div>
            <p className={`text-[11px] font-medium mt-0.5 ${isDark ? 'text-red-400/80' : 'text-red-700/80'}`}>
              Engineering Out
            </p>
          </div>

          <div
            onClick={() => setFilter('OCCUPIED')}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              filter === 'OCCUPIED'
                ? isDark
                  ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800 shadow-lg'
                  : 'bg-slate-800 border-slate-200 dark:border-slate-800 ring-2 ring-blue-500/30 shadow-sm'
                : isDark
                ? 'bg-slate-900 border-slate-800 hover:border-slate-200 dark:border-slate-800'
                : 'bg-white border-slate-200 hover:border-slate-200 dark:border-slate-800 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold ${isDark ? 'text-slate-700 dark:text-slate-300' : 'text-slate-700 dark:text-slate-300'}`}>
                Occupied
              </span>
              <UserCheck className={`w-3.5 h-3.5 ${isDark ? 'text-slate-700 dark:text-slate-300' : 'text-slate-700 dark:text-slate-300'}`} />
            </div>
            <div className={`text-2xl font-black mt-1 ${isDark ? 'text-slate-700 dark:text-slate-300' : 'text-slate-700 dark:text-slate-300'}`}>
              {counts.occupied}
            </div>
            <p className={`text-[11px] font-medium mt-0.5 ${isDark ? 'text-slate-700 dark:text-slate-300/80' : 'text-slate-700 dark:text-slate-300/80'}`}>
              Guests In-House
            </p>
          </div>
        </div>

        {/* 2. Interactive Date Picker & Dynamic Stay Duration */}
        <div
          className={`border rounded-2xl p-4 shadow-sm transition-all ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
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
                    ? 'bg-slate-950 border-slate-700 text-white'
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
                  isDark ? 'bg-slate-950 border-slate-700' : 'bg-slate-50 border-slate-200'
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
                  isDark ? 'bg-slate-950/50 border-slate-700 text-amber-300' : 'bg-slate-50 border-slate-200 text-slate-800'
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
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
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

        {/* 4. Filter Controls (Status, Capacity, and Climate) */}
        <div className="space-y-2.5">
          {/* Primary Status Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {(['AVAILABLE', 'ALL', 'CLEANING', 'MAINTENANCE', 'OCCUPIED'] as const).map((tab) => (
              <button
                key={tab}
                data-testid={`filter-tab-${tab.toLowerCase()}`}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  filter === tab
                    ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-sm font-black'
                    : isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
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

          {/* Prominent 2-Option AC & Non-AC Climate Filter */}
          <div
            className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isDark
                ? 'bg-slate-900 border-slate-800 shadow-sm'
                : 'bg-slate-50 border-slate-200 shadow-xs'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                <span>❄️ AC & Non-AC Filter:</span>
              </span>
              <span className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {climateFilter === 'AC' ? 'Viewing AC Rooms Only' : climateFilter === 'NON_AC' ? 'Viewing Non-AC Rooms Only' : 'Showing All Climate Types'}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                data-testid="filter-ac-option"
                onClick={() => setClimateFilter((prev) => (prev === 'AC' ? 'ALL' : 'AC'))}
                className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 border ${
                  climateFilter === 'AC'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-white border-slate-200 dark:border-slate-800 shadow-md ring-2 ring-cyan-400/50 scale-[1.02]'
                    : isDark
                    ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:border-slate-200 dark:border-slate-800'
                    : 'bg-white border-slate-300 text-slate-700 hover:text-slate-950 hover:border-slate-200 dark:border-slate-800 shadow-xs'
                }`}
              >
                <Snowflake className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                <span>❄️ AC Rooms</span>
                {climateFilter === 'AC' && (
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.2 rounded-full font-bold">
                    SELECTED
                  </span>
                )}
              </button>

              <button
                type="button"
                data-testid="filter-non-ac-option"
                onClick={() => setClimateFilter((prev) => (prev === 'NON_AC' ? 'ALL' : 'NON_AC'))}
                className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 border ${
                  climateFilter === 'NON_AC'
                    ? 'bg-amber-600 text-white border-amber-400 shadow-md ring-2 ring-amber-400/50 scale-[1.02]'
                    : isDark
                    ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:border-amber-500/50'
                    : 'bg-white border-slate-300 text-slate-700 hover:text-slate-950 hover:border-amber-400 shadow-xs'
                }`}
              >
                <Wind className="w-3.5 h-3.5 text-amber-300" />
                <span>🌀 Non-AC Rooms</span>
                {climateFilter === 'NON_AC' && (
                  <span className="text-[10px] bg-amber-900/90 text-amber-200 px-1.5 py-0.2 rounded-full font-bold">
                    SELECTED
                  </span>
                )}
              </button>

              {climateFilter !== 'ALL' && (
                <button
                  type="button"
                  data-testid="filter-climate-all"
                  onClick={() => setClimateFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                    isDark
                      ? 'border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white'
                      : 'border-slate-300 bg-slate-100 text-slate-700 hover:text-slate-950'
                  }`}
                >
                  Show All Rooms
                </button>
              )}
            </div>
          </div>

          {/* Secondary Filter Bar: Guest Capacity */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            {/* Guest Capacity Filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Capacity:
              </span>
              {[
                { key: 'ALL', label: 'All Guests' },
                { key: '1', label: '1 Guest' },
                { key: '2', label: '2 Guests' },
                { key: '3+', label: '3+ Family' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  data-testid={`capacity-filter-${opt.key}`}
                  onClick={() => setCapacityFilter(opt.key as any)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition border ${
                    capacityFilter === opt.key
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-xs'
                      : isDark
                      ? 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 5. Rooms Grid with Photos (Compact High-Density Card Architecture) */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
            <p className="text-sm font-medium">Checking live room availability from reception...</p>
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs">
            {error}
          </div>
        ) : filteredRooms.length === 0 ? (
          <div
            className={`p-12 text-center rounded-2xl border ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500 shadow-sm'
            }`}
          >
            <BedDouble className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-base font-bold text-slate-700">No rooms found matching these filters.</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting filters to view all available inventory.</p>
            <button
              onClick={() => {
                setFilter('AVAILABLE');
                setClimateFilter('ALL');
                setCapacityFilter('ALL');
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-sm hover:bg-amber-400"
            >
              Reset Filters ({counts.available} Available)
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {filteredRooms.map((room, idx) => {
              const pricing = getPricingForRoom(room);
              const isAvailable = room.isBookable;
              const photoUrl = getRoomPhoto(room, idx);
              const isAc = room.isAc !== false && room.roomType?.isAc !== false && !/non[-\s]?ac/i.test(room.roomType?.name || '');

              return (
                <div
                  key={room.id}
                  className={`rounded-2xl border transition-all overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md ${
                    isAvailable
                      ? isDark
                        ? 'bg-slate-900 border-emerald-500/40 hover:border-emerald-500/70'
                        : 'bg-white border-slate-200 hover:border-emerald-500/50'
                      : room.displayStatus === 'CLEANING'
                      ? isDark
                        ? 'bg-slate-900/80 border-amber-500/20 opacity-90'
                        : 'bg-slate-50 border-amber-200 opacity-90'
                      : room.displayStatus === 'MAINTENANCE'
                      ? isDark
                        ? 'bg-slate-900/80 border-red-500/20 opacity-80'
                        : 'bg-slate-50 border-red-200 opacity-80'
                      : isDark
                      ? 'bg-slate-900/70 border-slate-800 opacity-75'
                      : 'bg-slate-50 border-slate-200 opacity-75'
                  }`}
                >
                  {/* Photo Header (Compact Height ~128px) */}
                  <div className="relative h-32 w-full bg-slate-900 overflow-hidden shrink-0">
                    <img
                      src={photoUrl}
                      alt={room.roomType.name}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = FALLBACK_ROOM_IMAGE;
                      }}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                    {/* Room Number & Status */}
                    <div className="absolute top-2 inset-x-2 flex items-center justify-between">
                      <div className="px-2.5 py-0.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/20 text-white font-black text-[11px] flex items-center gap-1 shadow-sm">
                        <BedDouble className="w-3 h-3 text-amber-400" />
                        <span>Room {room.roomNumber}</span>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-sm backdrop-blur-md border ${
                          isAvailable
                            ? 'bg-emerald-600/90 text-white border-emerald-400'
                            : room.displayStatus === 'CLEANING'
                            ? 'bg-amber-500/90 text-slate-950 border-amber-300'
                            : room.displayStatus === 'MAINTENANCE'
                            ? 'bg-red-600/90 text-white border-red-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-white border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        {room.statusBadge}
                      </span>
                    </div>

                    {/* Category & Capacity Badges */}
                    <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between">
                      <div className="truncate pr-1">
                        <h3 className="text-white font-black text-xs sm:text-sm drop-shadow leading-tight truncate">
                          {room.roomType.name}
                        </h3>
                        <p className="text-amber-200/90 text-[10px] font-semibold drop-shadow flex items-center gap-1.5 mt-0.5">
                          <span>Fl {room.floorNumber}</span>
                          <span>• {room.wing || 'Main'}</span>
                          <span>• 👤 {room.roomType.maxCapacity || 2} Pax</span>
                        </p>
                      </div>

                      {/* Climate pill - Prominent AC vs Non-AC Tag */}
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black shrink-0 border backdrop-blur-md shadow-xs ${
                          isAc
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                            : 'bg-amber-500/30 text-amber-200 border-amber-400/50'
                        }`}
                      >
                        {isAc ? '❄️ AC' : '🌀 Non-AC'}
                      </span>
                    </div>
                  </div>

                  {/* Card Content & Details (Compact Padding) */}
                  <div className="p-3 flex-1 flex flex-col justify-between gap-2.5">
                    {/* Pricing Block */}
                    <div
                      className={`p-2.5 rounded-xl border flex items-center justify-between ${
                        isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div>
                        <div className={`text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {nights} {nights === 1 ? 'Night' : 'Nights'} Total
                        </div>
                        <div className={`text-base font-black ${isDark ? 'text-amber-400' : 'text-slate-900'}`}>
                          ₹{pricing.grandTotal.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-[11px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          ₹{pricing.basePerNight.toLocaleString('en-IN')}/nt
                        </div>
                        <p className={`text-[9px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          + {pricing.gstRate}% GST (₹{pricing.gstAmount.toLocaleString('en-IN')})
                        </p>
                      </div>
                    </div>

                    {/* Instant Booking Action */}
                    <div>
                      {isAvailable ? (
                        <button
                          data-testid={`book-room-btn-${room.roomNumber}`}
                          onClick={() => handleOpenBooking(room)}
                          className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-emerald-100" />
                          <span>Book Room {room.roomNumber}</span>
                        </button>
                      ) : (
                        <div
                          className={`w-full py-2 px-2.5 rounded-xl text-center text-[11px] font-bold border ${
                            isDark
                              ? 'bg-slate-800/40 border-slate-800 text-red-300/80 bg-red-950/20'
                              : 'bg-red-50 border-red-200 text-red-700'
                          } cursor-not-allowed`}
                        >
                          {room.displayStatus === 'CLEANING' && '🧹 Not available at this time (Cleaning)'}
                          {room.displayStatus === 'MAINTENANCE' && '🛠️ Not available at this time (Maintenance)'}
                          {(room.displayStatus === 'OCCUPIED' || room.displayStatus === 'RESERVED') && '👤 Not available at this time (Booked)'}
                          {room.displayStatus !== 'CLEANING' && room.displayStatus !== 'MAINTENANCE' && room.displayStatus !== 'OCCUPIED' && room.displayStatus !== 'RESERVED' && '🚫 Not available at this time'}
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
            className={`rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-sm dark:shadow-none space-y-4 border ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-white'
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
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">
                      Tariff ({nights} {nights === 1 ? 'night' : 'nights'} × ₹{pricing.basePerNight.toLocaleString('en-IN')})
                    </span>
                    <span className="font-bold">₹{pricing.subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>GST Tax ({pricing.gstRate}%)</span>
                    <span>₹{pricing.gstAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Scheduled Check-Out</span>
                    <span className="font-mono font-bold text-amber-500">{checkOutDate} • 11:00 AM</span>
                  </div>
                  <div className="border-t border-amber-500/20 pt-1.5 flex justify-between font-black text-sm text-amber-600 dark:text-amber-400">
                    <span>Total Accommodation Tariff</span>
                    <span>₹{pricing.grandTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              );
            })()}

            {/* Form Fields */}
            <div className="space-y-4">
              {/* 1. Location / Booking Mode Selector */}
              <div>
                <label className={`text-[11px] font-bold uppercase block mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Booking Origin & GPS Geofence *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBookingLocationMode('HOTEL');
                      setBookingError(null);
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      bookingLocationMode === 'HOTEL'
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/20'
                        : isDark
                        ? 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                        : 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Building className="w-3.5 h-3.5" />
                    <span>At Hotel Reception</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setBookingLocationMode('HOME');
                      setBookingError(null);
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      bookingLocationMode === 'HOME'
                        ? 'bg-slate-800 dark:bg-slate-200 text-slate-950 border-slate-200 dark:border-slate-800 shadow-md shadow-sm'
                        : isDark
                        ? 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                        : 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Home className="w-3.5 h-3.5" />
                    <span>Book from Home</span>
                  </button>
                </div>

                {/* GPS Verification Row */}
                <div className="mt-2 flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-900/40 border border-slate-800 text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Navigation className="w-3 h-3 text-amber-500 shrink-0" />
                    <span className="truncate">{locationStatus}</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={locating}
                    className="shrink-0 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold hover:bg-amber-500/30 transition text-[10px]"
                  >
                    {locating ? 'Checking GPS...' : 'Verify GPS'}
                  </button>
                </div>
              </div>

              {/* If booking from home: Check-in date & Estimated Arrival Time */}
              {bookingLocationMode === 'HOME' && (
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                    Remote Advance Reservation Timing
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-300 block mb-1">Check-In Date</label>
                      <input
                        type="date"
                        value={checkInDate}
                        onChange={(e) => setCheckInDate(e.target.value)}
                        className={`w-full rounded-xl px-2.5 py-1.5 text-xs font-medium border ${
                          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-300 block mb-1">Estimated Arrival Time</label>
                      <select
                        value={estimatedArrivalTime}
                        onChange={(e) => setEstimatedArrivalTime(e.target.value)}
                        className={`w-full rounded-xl px-2.5 py-1.5 text-xs font-medium border ${
                          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      >
                        <option value="12:00">12:00 PM (Noon)</option>
                        <option value="14:00">02:00 PM (Standard Check-in)</option>
                        <option value="16:00">04:00 PM</option>
                        <option value="18:00">06:00 PM</option>
                        <option value="20:00">08:00 PM (Evening)</option>
                        <option value="22:00">10:00 PM (Late Night)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Primary Guest Name */}
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
                      ? 'bg-slate-950 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                  }`}
                />
              </div>

              {/* Phone Number + OTP Verification */}
              <div className="space-y-2">
                <label className={`text-[11px] font-bold uppercase block ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Mobile Number {bookingLocationMode === 'HOTEL' && '(OTP Verification Required)'} *
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    data-testid="input-guest-phone"
                    placeholder="9820011223"
                    value={guestPhone}
                    onChange={(e) => {
                      setGuestPhone(e.target.value);
                      setPhoneOtpVerified(false);
                      setPhoneOtpSent(false);
                    }}
                    className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      isDark
                        ? 'bg-slate-950 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                    }`}
                  />
                  {bookingLocationMode === 'HOTEL' && (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={otpSending || phoneOtpVerified}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
                        phoneOtpVerified
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                      }`}
                    >
                      {phoneOtpVerified ? '✓ Verified' : otpSending ? 'Sending...' : 'Send OTP'}
                    </button>
                  )}
                </div>

                {/* OTP Input Row if Sent and In Hotel */}
                {bookingLocationMode === 'HOTEL' && phoneOtpSent && !phoneOtpVerified && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl border border-amber-500/30 bg-amber-950/20">
                    <input
                      type="text"
                      maxLength={4}
                      value={phoneOtp}
                      onChange={(e) => setPhoneOtp(e.target.value)}
                      placeholder="4-digit OTP"
                      className="w-28 rounded-lg px-2.5 py-1.5 text-center font-mono font-bold text-sm tracking-widest bg-slate-900 border border-slate-700 text-amber-400"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={otpVerifying}
                      className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow"
                    >
                      {otpVerifying ? 'Verifying...' : 'Verify OTP'}
                    </button>
                  </div>
                )}

                {otpSuccessMsg && (
                  <p className="text-[11px] text-emerald-400 font-medium">{otpSuccessMsg}</p>
                )}
              </div>

              {/* Email Address */}
              <div>
                <label className={`text-[11px] font-bold uppercase block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  data-testid="input-guest-email"
                  placeholder="guest@example.com"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                  }`}
                />
              </div>

              {/* 2. Mandatory Aadhaar Card Photo Upload (Front & Back Only) */}
              <div className="p-3.5 rounded-2xl border border-amber-500/40 bg-amber-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                      Aadhaar Card Photo Upload (Mandatory)
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                    Front & Back Required
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Upload clear photos of your Aadhaar card. Front Desk reception will verify them before unlocking your room keycard.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Front Side Upload */}
                  <div className="border border-slate-700/80 rounded-xl p-2.5 bg-slate-900/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                        <span>🪪</span> Front Side (Photo & Name)
                      </span>
                      {aadhaarFront && <span className="text-[10px] text-emerald-400 font-bold">✓ Attached</span>}
                    </div>

                    {aadhaarFront ? (
                      <div className="relative rounded-lg overflow-hidden border border-emerald-500/40 bg-black h-24 flex items-center justify-center">
                        <img src={aadhaarFront} alt="Aadhaar Front" className="h-full w-full object-contain" />
                        <button
                          type="button"
                          onClick={() => setAadhaarFront(null)}
                          className="absolute top-1 right-1 bg-black/70 hover:bg-red-600 text-white p-1 rounded-md text-[10px]"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <label className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold cursor-pointer transition">
                          <Camera className="w-3.5 h-3.5" />
                          <span>{aadhaarCompressing === 'FRONT' ? 'Compressing...' : 'Upload Front Side'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => handleUploadAadhaar(e, 'FRONT')}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => handleAttachSampleAadhaar('FRONT')}
                          className="text-[10px] text-slate-400 hover:text-amber-400 underline transition text-center"
                        >
                          Use Sample Front ID
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Back Side Upload */}
                  <div className="border border-slate-700/80 rounded-xl p-2.5 bg-slate-900/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                        <span>🪪</span> Back Side (Address & QR)
                      </span>
                      {aadhaarBack && <span className="text-[10px] text-emerald-400 font-bold">✓ Attached</span>}
                    </div>

                    {aadhaarBack ? (
                      <div className="relative rounded-lg overflow-hidden border border-emerald-500/40 bg-black h-24 flex items-center justify-center">
                        <img src={aadhaarBack} alt="Aadhaar Back" className="h-full w-full object-contain" />
                        <button
                          type="button"
                          onClick={() => setAadhaarBack(null)}
                          className="absolute top-1 right-1 bg-black/70 hover:bg-red-600 text-white p-1 rounded-md text-[10px]"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <label className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold cursor-pointer transition">
                          <Camera className="w-3.5 h-3.5" />
                          <span>{aadhaarCompressing === 'BACK' ? 'Compressing...' : 'Upload Back Side'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => handleUploadAadhaar(e, 'BACK')}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => handleAttachSampleAadhaar('BACK')}
                          className="text-[10px] text-slate-400 hover:text-amber-400 underline transition text-center"
                        >
                          Use Sample Back ID
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. 2-Room Quota & Secondary Guest Disclosure */}
              <div className="p-3.5 rounded-2xl border border-slate-700 bg-slate-900/50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                    <div>
                      <span className="text-xs font-bold text-white block">2nd Room Booking / Accompanying Guest</span>
                      <span className="text-[10px] text-slate-400">Strict ceiling: Maximum 2 rooms per mobile number</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSecondRoom(!isSecondRoom)}
                    className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                      isSecondRoom ? 'bg-slate-800 dark:bg-slate-200' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${
                        isSecondRoom ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {isSecondRoom && (
                  <div className="pt-2 border-t border-slate-700/60 space-y-2">
                    <p className="text-[11px] text-slate-700 dark:text-slate-300">
                      Who is this 2nd room for? Please provide the secondary guest's name and relationship.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-300 block mb-1">Secondary Guest Full Name *</label>
                        <input
                          type="text"
                          placeholder="e.g. Radhika Sharma"
                          value={secondaryGuestName}
                          onChange={(e) => setSecondaryGuestName(e.target.value)}
                          className="w-full rounded-xl px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-700 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-300 block mb-1">Relationship to Primary Guest</label>
                        <select
                          value={secondaryGuestRelationship}
                          onChange={(e) => setSecondaryGuestRelationship(e.target.value)}
                          className="w-full rounded-xl px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-700 text-white"
                        >
                          <option value="Spouse">Spouse</option>
                          <option value="Child / Dependent">Child / Dependent</option>
                          <option value="Parents / Family">Parents / Family</option>
                          <option value="Colleague / Business Partner">Colleague / Business Partner</option>
                          <option value="Friend">Friend</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Couple Stay Check-In Toggle */}
              <div
                className={`border rounded-xl p-3 flex items-center justify-between ${
                  isDark ? 'bg-slate-950 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Heart className={`w-4 h-4 ${isCouple ? 'text-red-500 fill-rose-500' : 'text-slate-400'}`} />
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
                    isCouple ? 'bg-red-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${
                      isCouple ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {bookingError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{bookingError}</span>
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
                className="w-2/3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-98 disabled:opacity-50"
              >
                {submittingBooking ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Submitting Aadhaar...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Submit Aadhaar & Book Room {selectedRoom.roomNumber}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6.5 Real-Time Approval Waiting View (Unlocks automatically when reception approves) */}
      {isWaitingForApproval && pendingBooking && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="reception-approval-waiting-modal"
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            className={`w-full max-w-lg rounded-3xl p-6 shadow-sm dark:shadow-none border space-y-5 ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Header with status badge */}
            <div className="text-center space-y-2">
              <div
                className={`w-16 h-16 rounded-3xl mx-auto flex items-center justify-center shadow-lg transition-all ${
                  isApprovalGranted
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 scale-110'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse'
                }`}
              >
                {isApprovalGranted ? <CheckCircle className="w-8 h-8 text-emerald-400" /> : <Clock className="w-8 h-8 animate-spin" />}
              </div>
              <div>
                <span
                  className={`text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
                    isApprovalGranted
                      ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                      : 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                  }`}
                >
                  {isApprovalGranted ? '✓ Check-In Approved!' : '⏳ Waiting for Reception Approval'}
                </span>
                <h3 className="text-xl font-black mt-2">
                  {isApprovalGranted ? 'Digital Keycard Activated' : `Room ${pendingBooking.roomNumber} Reservation Submitted`}
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {isApprovalGranted
                    ? 'Reception verified your Aadhaar KYC. Unlocking room portal...'
                    : 'Your Aadhaar document photos were forwarded to Reception Desk for verification. As soon as Reception approves, your portal unlocks.'}
                </p>
              </div>
            </div>

            {/* Booking Voucher Summary */}
            <div
              className={`rounded-2xl p-4 border space-y-2.5 text-xs ${
                isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-700/30">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Booking Reference</span>
                <span className="font-mono font-black text-amber-500 text-sm" data-testid="pending-booking-ref">
                  {pendingBooking.bookingNumber}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 py-1">
                <div>
                  <span className="text-slate-400 text-[10px] block">Primary Guest</span>
                  <span className="font-bold">{pendingBooking.guestName}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Contact Number</span>
                  <span className="font-bold">{pendingBooking.guestPhone}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Stay Duration</span>
                  <span className="font-bold">{pendingBooking.nights} Night(s)</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Check-Out Departure</span>
                  <span className="font-bold text-amber-400">11:00 AM Departure</span>
                </div>
                {pendingBooking.secondaryGuestName && (
                  <div className="col-span-2 pt-1 border-t border-slate-700/20">
                    <span className="text-slate-400 text-[10px] block">Secondary Guest (2nd Room)</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {pendingBooking.secondaryGuestName} ({pendingBooking.secondaryGuestRelationship || 'Guest'})
                    </span>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-700/30">
                <span className="font-bold">Total Folio Tariff</span>
                <span className="font-black text-base text-emerald-500">
                  ₹{pendingBooking.grandTotal?.toLocaleString('en-IN') || '0'}
                </span>
              </div>
            </div>

            {/* Aadhaar Photo Thumbnails Preview */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Forwarded Aadhaar KYC Documents
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-slate-700 p-2 bg-black/40 text-center">
                  <span className="text-[9px] font-bold text-slate-400 block mb-1">Front Side</span>
                  {pendingBooking.aadhaarFrontUrl ? (
                    <img
                      src={pendingBooking.aadhaarFrontUrl}
                      alt="Aadhaar Front"
                      className="h-20 w-full object-contain rounded-lg"
                    />
                  ) : (
                    <div className="h-20 flex items-center justify-center text-xs text-slate-500 font-mono">
                      Front Uploaded
                    </div>
                  )}
                </div>
                <div className="rounded-xl border border-slate-700 p-2 bg-black/40 text-center">
                  <span className="text-[9px] font-bold text-slate-400 block mb-1">Back Side</span>
                  {pendingBooking.aadhaarBackUrl ? (
                    <img
                      src={pendingBooking.aadhaarBackUrl}
                      alt="Aadhaar Back"
                      className="h-20 w-full object-contain rounded-lg"
                    />
                  ) : (
                    <div className="h-20 flex items-center justify-center text-xs text-slate-500 font-mono">
                      Back Uploaded
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Polling & Live Socket Radar */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>Live Socket & Poller Synchronized</span>
              </span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    if (pendingBooking?.bookingNumber) {
                      await fetch(`${apiBase}/api/v1/guest-portal/rooms/cancel-booking`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          bookingNumber: pendingBooking.bookingNumber,
                          hotelId,
                        }),
                      });
                    }
                  } catch {}
                  setIsWaitingForApproval(false);
                  localStorage.removeItem('spicehub_pending_approval_booking');
                }}
                className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
              >
                Cancel / Return to Rooms
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Resident Guest Room Unlock Screen / Modal */}
      {isUnlockModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="resident-unlock-modal"
          className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in"
        >
          <div
            className="w-full max-w-md mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 shadow-sm flex flex-col md:mt-20 my-auto"
          >
            {/* Small hotel logo at top */}
            <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold text-2xl shadow-sm">
              🏨
            </div>

            <h2 className="text-xl font-bold text-slate-900 dark:text-white text-center">
              Welcome to Mahesh Palace
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center mt-1 mb-6">
              Enter your room number and last name to unlock your digital keycard and room services.
            </p>

            {unlockError && (
              <div className="mb-4 text-sm text-red-600 dark:text-red-400">
                ⚠️ {unlockError}
              </div>
            )}

            <form onSubmit={handleUnlockStay} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Room Number
                </label>
                <input
                  data-testid="input-unlock-room"
                  type="text"
                  placeholder="e.g. 101"
                  value={unlockRoomNumber}
                  onChange={(e) => setUnlockRoomNumber(e.target.value)}
                  className="h-12 w-full rounded-lg border border-slate-300 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white px-4 focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Last Name
                </label>
                <input
                  data-testid="input-unlock-name"
                  type="text"
                  placeholder="e.g. Saini"
                  value={unlockLastName}
                  onChange={(e) => setUnlockLastName(e.target.value)}
                  className="h-12 w-full rounded-lg border border-slate-300 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white px-4 focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
                  required
                />
              </div>

              <button
                type="submit"
                data-testid="btn-unlock-room"
                disabled={isUnlocking}
                className="h-12 w-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-lg text-base font-semibold hover:opacity-90 disabled:opacity-40 transition shadow-sm cursor-pointer flex items-center justify-center mt-2"
              >
                {isUnlocking ? 'Unlocking...' : 'Unlock Room'}
              </button>

              <button
                type="button"
                onClick={() => setIsUnlockModalOpen(false)}
                className="w-full text-center text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 pt-2 transition cursor-pointer"
              >
                Cancel / Return to Rooms
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
