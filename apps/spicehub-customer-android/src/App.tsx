import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { App as CapApp } from '@capacitor/app';
import jsQR from 'jsqr';

export interface ActiveHotel {
  id: string;
  name: string;
  slug: string;
  city?: string;
  state?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  stayImageUrl?: string;
  diningImageUrl?: string;
  coordinates?: {
    latitude?: number;
    longitude?: number;
  };
  photos?: string[];
  tagline?: string;
  enabledPortals?: string[];
  contactPhone?: string;
  wifiSsid?: string;
  wifiPassword?: string;
}

export interface CatalogRoom {
  id: string;
  roomNumber: string;
  floorNumber: number;
  wing: string;
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

export interface ActiveReservation {
  bookingNumber: string;
  roomNumber: string;
  roomTypeName: string;
  guestName: string;
  guestPhone: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  grandTotal: number;
  sessionToken?: string;
  wifiSsid?: string;
  wifiPassword?: string;
  bookingStatus?: string;
  receptionApprovedAt?: string;
}

export interface PendingApprovalBooking {
  bookingNumber: string;
  roomNumber: string;
  roomTypeName: string;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  guestCount: number;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  grandTotal: number;
  idType: string;
  idNumberMasked: string;
  bookingLocation: string;
  status: 'PENDING_APPROVAL' | 'APPROVED';
  sessionToken?: string;
  wifiPassword?: string;
  hotelId: string;
}

// Resilient Offline-Safe SVG Fallbacks
const FALLBACK_HOTEL_COVER = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400">
  <defs>
    <linearGradient id="hotelBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="50%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
  </defs>
  <rect width="800" height="400" fill="url(#hotelBg)"/>
  <circle cx="400" cy="180" r="140" fill="#d97706" opacity="0.08"/>
  <path d="M260 280 L260 160 L330 110 L400 160 L400 280 Z" fill="#334155" opacity="0.6"/>
  <path d="M400 280 L400 130 L470 80 L540 130 L540 280 Z" fill="#1e293b" opacity="0.8"/>
  <path d="M330 280 L330 140 L400 90 L470 140 L470 280 Z" fill="#475569" opacity="0.8"/>
  <g fill="#fbbf24" opacity="0.75">
    <rect x="355" y="160" width="16" height="20" rx="3"/>
    <rect x="390" y="160" width="16" height="20" rx="3"/>
    <rect x="425" y="160" width="16" height="20" rx="3"/>
    <rect x="355" y="200" width="16" height="20" rx="3"/>
    <rect x="390" y="200" width="16" height="20" rx="3"/>
    <rect x="425" y="200" width="16" height="20" rx="3"/>
    <rect x="355" y="240" width="16" height="20" rx="3"/>
    <rect x="390" y="240" width="16" height="20" rx="3"/>
    <rect x="425" y="240" width="16" height="20" rx="3"/>
  </g>
  <text x="400" y="340" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="22" font-weight="800" text-anchor="middle" letter-spacing="2">SPICEHUB LUXURY RESORT</text>
  <text x="400" y="365" fill="#f59e0b" font-family="system-ui, sans-serif" font-size="12" font-weight="600" text-anchor="middle" letter-spacing="4">HERITAGE HOSPITALITY &amp; SUITES</text>
</svg>
`);

const FALLBACK_HOTEL_LOGO = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
  <defs>
    <linearGradient id="logoBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
  </defs>
  <rect width="120" height="120" rx="30" fill="url(#logoBg)"/>
  <circle cx="60" cy="60" r="46" fill="none" stroke="#fef3c7" stroke-width="2" stroke-dasharray="4,4"/>
  <text x="60" y="72" fill="#ffffff" font-family="system-ui, sans-serif" font-size="36" font-weight="900" text-anchor="middle">S</text>
  <circle cx="60" cy="24" r="3.5" fill="#fbbf24"/>
</svg>
`);

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

// ============================================================================
// CRAFTED SVG ICON SYSTEM (Consistent 24x24 luxury vector icons)
// ============================================================================
const Icons = {
  Home: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  Bed: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 4v16" />
      <path d="M2 8h18a2 2 0 0 1 2 2v10" />
      <path d="M2 17h20" />
      <path d="M6 8v9" />
    </svg>
  ),
  Utensils: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2" />
      <path d="M15 11v11" />
      <path d="M5 2v8a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V2" />
      <path d="M7 12v10" />
    </svg>
  ),
  Key: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3L22 7l-3-3" />
    </svg>
  ),
  User: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Switch: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m16 3 4 4-4 4" />
      <path d="M20 7H4" />
      <path d="m8 21-4-4 4-4" />
      <path d="M4 17h16" />
    </svg>
  ),
  Location: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  QrCode: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="6" height="6" x="3" y="3" rx="1" />
      <rect width="6" height="6" x="15" y="3" rx="1" />
      <rect width="6" height="6" x="3" y="15" rx="1" />
      <path d="M15 15h2v2h-2z" />
      <path d="M19 15h2v6h-6v-2h4z" />
      <path d="M15 19h2v2h-2z" />
    </svg>
  ),
  Sun: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  ),
  Moon: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  ),
  Check: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  CheckCircle: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  Shield: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Camera: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  ),
  ArrowRight: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  ),
  ArrowLeft: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  ),
  Phone: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  Wifi: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 20h.01" />
      <path d="M2 8.82a15 15 0 0 1 20 0" />
      <path d="M5 12.86a10 10 0 0 1 14 0" />
      <path d="M8.5 16.43a5 5 0 0 1 7 0" />
    </svg>
  ),
  Sparkles: ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
    </svg>
  ),
  Trash: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  ),
  Refresh: ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  ),
  Clock: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Search: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  ),
  Building: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
      <path d="M12 14h.01" />
      <path d="M16 10h.01" />
      <path d="M16 14h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
    </svg>
  ),
  Star: ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" className={className}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
};

const DEV_LAN_HOST = '10.208.156.216';

const resolveInitialServerHost = (): string => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('spicehub_server_host');
    if (saved && saved !== '10.163.112.94') return saved;
    if (window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return window.location.hostname;
    }
  }
  return DEV_LAN_HOST;
};

export const App: React.FC = () => {
  // Configurable Host: Local Wi-Fi LAN IP (Standalone APK) vs USB Direct (adb reverse)
  const [serverHost, setServerHost] = useState<string>(resolveInitialServerHost);
  const DEFAULT_API_BASE = `http://${serverHost}:5000`;
  const TABLE_PORTAL_BASE = `http://${serverHost}:3001`;
  const ROOM_PORTAL_BASE = `http://${serverHost}:3004`;

  // Theme state: Clean light theme by default as explicitly requested!
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('spicehub_customer_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'light';
  });

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('spicehub_customer_theme', next);
    }
  };

  const isDark = theme === 'dark';

  // Synchronize HTML element & body background with active theme
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.body.style.backgroundColor = '#070b12';
        document.body.style.color = '#f1f5f9';
      } else {
        document.documentElement.classList.remove('dark');
        document.body.style.backgroundColor = '#f8fafc';
        document.body.style.color = '#0f172a';
      }
    }
  }, [isDark]);

  // Navigation state: 'home' is the clean landing page with Hotel Selection & exactly 2 big cards!
  const [customerView, setCustomerView] = useState<'home' | 'rooms' | 'table_scan' | 'resident_verify' | 'profile'>('home');

  // Hotels State
  const [hotels, setHotels] = useState<ActiveHotel[]>([]);
  const [selectedHotel, setSelectedHotel] = useState<ActiveHotel | null>(null);
  const [loadingHotels, setLoadingHotels] = useState(true);
  const [isHotelModalOpen, setIsHotelModalOpen] = useState(false);
  const [hotelSearch, setHotelSearch] = useState('');

  // Live Available Rooms & Catalog for Selected Hotel
  const [availableRoomCount, setAvailableRoomCount] = useState<number | null>(null);
  const [catalogRooms, setCatalogRooms] = useState<CatalogRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // Dining Table Selection & Standee QR
  const [tableInput, setTableInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Room Booking & Radius Check
  const [selectedRoomForBooking, setSelectedRoomForBooking] = useState<CatalogRoom | null>(null);
  const [showLocationRadiusCheck, setShowLocationRadiusCheck] = useState(false);
  const [bookingLocationType, setBookingLocationType] = useState<'HOTEL_RADIUS' | 'REMOTE_HOME'>('HOTEL_RADIUS');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingNights, setBookingNights] = useState(1);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestCount, setGuestCount] = useState(2);
  const [documentType, setDocumentType] = useState('AADHAAR');
  const [documentNumber, setDocumentNumber] = useState('');
  const [receptionNotes, setReceptionNotes] = useState('');
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Reception Document Approval Gating State
  const [pendingApprovalBooking, setPendingApprovalBooking] = useState<PendingApprovalBooking | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('spicehub_pending_approval_booking');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return null;
  });
  const [isApprovingAtReception, setIsApprovingAtReception] = useState(false);

  // Active Reservation & Digital Booking Voucher
  const [activeReservation, setActiveReservation] = useState<ActiveReservation | null>(null);
  const [bookingConfirmation, setBookingConfirmation] = useState<ActiveReservation | null>(null);

  // Resident Room Verification
  const [roomNumberInput, setRoomNumberInput] = useState('');
  const [guestPhoneInput, setGuestPhoneInput] = useState('');
  const [isVerifyingStay, setIsVerifyingStay] = useState(false);
  const [stayVerifyError, setStayVerifyError] = useState<string | null>(null);

  // Scanner state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Active embedded portal iframe
  const [activePortalUrl, setActivePortalUrl] = useState<string | null>(null);
  const [activeSessionLabel, setActiveSessionLabel] = useState<string>('');

  // Real-time Socket Connection for Reception Approval Events
  const socketRef = useRef<Socket | null>(null);

  // 0. Capacitor Physical Android Back Button Event Handling
  const backStackRef = useRef({
    activePortalUrl,
    bookingConfirmation,
    isBookingModalOpen,
    showLocationRadiusCheck,
    isHotelModalOpen,
    isCameraActive,
    customerView,
  });

  useEffect(() => {
    backStackRef.current = {
      activePortalUrl,
      bookingConfirmation,
      isBookingModalOpen,
      showLocationRadiusCheck,
      isHotelModalOpen,
      isCameraActive,
      customerView,
    };
  }, [
    activePortalUrl,
    bookingConfirmation,
    isBookingModalOpen,
    showLocationRadiusCheck,
    isHotelModalOpen,
    isCameraActive,
    customerView,
  ]);

  useEffect(() => {
    let backHandle: any = null;
    const registerBack = async () => {
      try {
        backHandle = await CapApp.addListener('backButton', () => {
          const s = backStackRef.current;
          if (s.activePortalUrl) {
            setActivePortalUrl(null);
            return;
          }
          if (s.bookingConfirmation) {
            setBookingConfirmation(null);
            return;
          }
          if (s.isBookingModalOpen) {
            setIsBookingModalOpen(false);
            return;
          }
          if (s.showLocationRadiusCheck) {
            setShowLocationRadiusCheck(false);
            return;
          }
          if (s.isHotelModalOpen) {
            setIsHotelModalOpen(false);
            return;
          }
          if (s.isCameraActive) {
            stopCamera();
            return;
          }
          if (s.customerView !== 'home') {
            setCustomerView('home');
            return;
          }
          // On Home view with no active layer -> exit app cleanly
          CapApp.exitApp().catch(() => {});
        });
      } catch (e) {
        console.warn('CapApp backButton registration note:', e);
      }
    };
    registerBack();
    return () => {
      if (backHandle && typeof backHandle.remove === 'function') {
        backHandle.remove();
      }
    };
  }, []);

  // 1. Fetch Active Hotels on Mount
  useEffect(() => {
    let isMounted = true;
    async function fetchHotels() {
      try {
        setLoadingHotels(true);
        const res = await fetch(`${DEFAULT_API_BASE}/api/v1/auth/active-hotels`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            if (!isMounted) return;
            setHotels(json.data);
            setSelectedHotel(json.data[0]);
            return;
          }
        }
      } catch (err) {
        console.warn('⚠️ [CustomerAndroid] Primary host failed, probing fallback candidates:', err);
      }

      // Fallback candidate probe
      try {
        const candidates = [DEV_LAN_HOST, 'localhost'].filter((c) => c !== serverHost);
        for (const alt of candidates) {
          const res = await fetch(`http://${alt}:5000/api/v1/auth/active-hotels`);
          if (res.ok) {
            const json = await res.json();
            if (json.success && Array.isArray(json.data) && json.data.length > 0) {
              if (!isMounted) return;
              setServerHost(alt);
              localStorage.setItem('spicehub_server_host', alt);
              setHotels(json.data);
              setSelectedHotel(json.data[0]);
              return;
            }
          }
        }
      } catch (e) {
        console.warn('⚠️ [CustomerAndroid] Candidate probe note:', e);
      } finally {
        if (isMounted) setLoadingHotels(false);
      }

      if (isMounted) {
        const fallbackHotel: ActiveHotel = {
          id: '6adddfc18d0109b3382bbc2b',
          name: 'The Royal Palm Resort & Suites',
          slug: 'royal-palm-suites',
          city: 'Jaipur',
          state: 'Rajasthan',
          tagline: 'Luxury Heritage Hotel & Fine Dining Resort',
          coverImageUrl: FALLBACK_HOTEL_COVER,
          logoUrl: FALLBACK_HOTEL_LOGO,
          stayImageUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200&auto=format&fit=crop&q=80',
          diningImageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80',
        };
        setHotels([fallbackHotel]);
        setSelectedHotel(fallbackHotel);
      }
    }
    fetchHotels();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch Live Room Availability Catalog for Selected Hotel
  const refreshRoomsCatalog = async (hotel = selectedHotel) => {
    if (!hotel) return;
    try {
      setLoadingRooms(true);
      const resRooms = await fetch(`${DEFAULT_API_BASE}/api/v1/guest-portal/rooms/catalog?hotelId=${hotel.id}`);
      if (resRooms.ok) {
        const json = await resRooms.json();
        if (json.success && json.data) {
          setAvailableRoomCount(json.data.counts?.available ?? 0);
          setCatalogRooms(json.data.rooms || []);
        }
      }
    } catch (err) {
      console.warn('⚠️ [CustomerAndroid] Rooms catalog load note:', err);
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    refreshRoomsCatalog(selectedHotel);
  }, [selectedHotel]);

  // 3. Connect Socket.IO for Real-time Reception Document Approval Listeners
  useEffect(() => {
    if (!selectedHotel?.id) return;

    try {
      const s = io(DEFAULT_API_BASE, {
        transports: ['websocket', 'polling'],
        query: { hotelId: selectedHotel.id },
      });
      socketRef.current = s;

      s.on('connect', () => {
        s.emit('join:room', { room: `${selectedHotel.id}_frontdesk` });
        s.emit('join:room', { room: `${selectedHotel.id}_global` });
      });

      // PMS Booking Approval Broadcast (Unlocks Keycard and In-Room Dining!)
      s.on('pms:booking_approved', (data: any) => {
        if (pendingApprovalBooking && (data.bookingNumber === pendingApprovalBooking.bookingNumber || data.roomNumber === pendingApprovalBooking.roomNumber)) {
          const approvedReservation: ActiveReservation = {
            bookingNumber: data.bookingNumber || pendingApprovalBooking.bookingNumber,
            roomNumber: data.roomNumber || pendingApprovalBooking.roomNumber,
            roomTypeName: pendingApprovalBooking.roomTypeName,
            guestName: data.guestName || pendingApprovalBooking.guestName,
            guestPhone: pendingApprovalBooking.guestPhone,
            checkInDate: pendingApprovalBooking.checkInDate,
            checkOutDate: pendingApprovalBooking.checkOutDate,
            nights: pendingApprovalBooking.nights,
            grandTotal: pendingApprovalBooking.grandTotal,
            sessionToken: data.sessionToken,
            wifiSsid: data.wifiSsid || selectedHotel?.wifiSsid || 'TajGateway_HighSpeed',
            wifiPassword: data.wifiPassword || selectedHotel?.wifiPassword || `TajGuest@${data.roomNumber || pendingApprovalBooking.roomNumber}`,
            bookingStatus: 'CHECKED_IN',
            receptionApprovedAt: new Date().toISOString(),
          };

          setActiveReservation(approvedReservation);
          setPendingApprovalBooking(null);
          try {
            localStorage.setItem('spicehub_active_guest_reservation', JSON.stringify(approvedReservation));
            localStorage.removeItem('spicehub_pending_approval_booking');
          } catch {}
          setBookingConfirmation(approvedReservation);
          refreshRoomsCatalog(selectedHotel);
        }
      });

      return () => {
        s.disconnect();
      };
    } catch (e) {
      console.warn('Socket connect error:', e);
    }
  }, [selectedHotel, pendingApprovalBooking]);

  // Real-Time Frame-by-Frame jsQR Decoding Loop
  const handleQrDetected = (rawData: string) => {
    try {
      let targetTable = '';
      let targetHotel = selectedHotel;

      // 1. If it's a URL like http://...:3001/?table=T-02&hotelId=...
      if (rawData.includes('?') || rawData.startsWith('http')) {
        try {
          const parsedUrl = new URL(rawData);
          const tableParam = parsedUrl.searchParams.get('table') || parsedUrl.searchParams.get('tableNumber');
          const hotelIdParam = parsedUrl.searchParams.get('hotelId');
          if (tableParam) targetTable = tableParam;
          if (hotelIdParam) {
            const matchedHotel = hotels.find((h) => h.id === hotelIdParam || h.slug === hotelIdParam);
            if (matchedHotel) targetHotel = matchedHotel;
          }
        } catch {
          const matchTable = rawData.match(/table=([^&]+)/i);
          if (matchTable) targetTable = decodeURIComponent(matchTable[1]);
        }
      } else if (rawData.startsWith('{') && rawData.endsWith('}')) {
        try {
          const parsed = JSON.parse(rawData);
          if (parsed.table || parsed.tableNumber) targetTable = parsed.table || parsed.tableNumber;
          if (parsed.hotelId) {
            const matchedHotel = hotels.find((h) => h.id === parsed.hotelId);
            if (matchedHotel) targetHotel = matchedHotel;
          }
        } catch {}
      }

      if (!targetTable) {
        targetTable = rawData.trim();
      }

      if (targetTable) {
        stopCamera();
        setTableNumberInput(targetTable);
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }
        launchTable(targetTable, targetHotel);
      }
    } catch (e) {
      console.warn('QR parse note:', e);
    }
  };

  const scanVideoFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && video.readyState >= 2 && canvas) {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data) {
            console.log('✅ [jsQR] Live continuous video frame decoded:', code.data);
            handleQrDetected(code.data);
            return;
          }
        }
      }
    }
    if (isCameraActive) {
      animFrameRef.current = requestAnimationFrame(scanVideoFrame);
    }
  };

  useEffect(() => {
    if (isCameraActive) {
      animFrameRef.current = requestAnimationFrame(scanVideoFrame);
    } else {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isCameraActive]);

  const startCamera = async () => {
    setIsCameraActive(true);
    setCameraError('');
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      } else {
        setCameraError('Camera API not accessible in this environment.');
      }
    } catch (err: any) {
      setCameraError(err.message || 'Camera permission denied or camera not found.');
    }
  };

  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setCameraError('');
  };

  // Launch Table Menu Flow
  const launchTable = (tbl: string, hotel = selectedHotel) => {
    if (!hotel) return;
    const finalTable = tbl.trim();
    if (!finalTable) {
      setValidationError('Please enter a valid Table Number (e.g. T-02).');
      return;
    }
    setValidationError(null);

    const numOnly = finalTable.replace(/[^0-9]/g, '');
    const formatted = finalTable.toUpperCase().startsWith('T-')
      ? finalTable.toUpperCase()
      : numOnly
      ? `T-${numOnly.padStart(2, '0')}`
      : finalTable;

    const url = new URL(TABLE_PORTAL_BASE);
    url.searchParams.set('hotelId', hotel.id);
    url.searchParams.set('table', formatted);
    url.searchParams.set('theme', theme);

    try {
      localStorage.setItem('spicehub_customer_table', formatted);
      localStorage.setItem('spicehub_customer_hotel', hotel.name);
    } catch {}

    setActiveSessionLabel(`${hotel.name} • Table ${formatted}`);
    setActivePortalUrl(url.toString());
  };

  // Launch Resident In-Room Services (Supports tab='DINING' for direct food ordering!)
  const launchResidentPortal = (
    rm: string,
    hotel = selectedHotel,
    token?: string,
    tab: string = 'HOME'
  ) => {
    if (!hotel) return;
    const formatted = rm.trim();
    if (!formatted) {
      setValidationError('Please enter your Room Number.');
      return;
    }
    setValidationError(null);

    const url = new URL(ROOM_PORTAL_BASE);
    url.searchParams.set('hotelId', hotel.id);
    url.searchParams.set('room', formatted);
    url.searchParams.set('tab', tab);
    url.searchParams.set('theme', theme);
    if (token) {
      url.searchParams.set('token', token);
      url.searchParams.set('sessionToken', token);
    }

    const labelSuffix = tab === 'DINING' ? `Room ${formatted} • In-Room Food Menu` : `Room ${formatted} • Guest Services`;
    setActiveSessionLabel(`${hotel.name} • ${labelSuffix}`);
    setActivePortalUrl(url.toString());
  };

  // Step 1 of Booking: User clicks an available room -> Location & Radius Check Dialog
  const handleSelectRoomForBooking = (room: CatalogRoom) => {
    setSelectedRoomForBooking(room);
    setBookingNights(1);
    setBookingError(null);
    setShowLocationRadiusCheck(true);
  };

  // Step 2 of Booking: User confirms location -> Proceed to Guest Details & Reception Documents Form
  const handleProceedToBookingForm = (locationType: 'HOTEL_RADIUS' | 'REMOTE_HOME') => {
    setBookingLocationType(locationType);
    setShowLocationRadiusCheck(false);
    setIsBookingModalOpen(true);
  };

  // Step 3 of Booking: Submit Guest Details and Reception Documents for Approval Gate
  const handleSubmitBookingForApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHotel || !selectedRoomForBooking) return;

    if (!guestName.trim()) {
      setBookingError('Please enter the primary guest full name.');
      return;
    }
    if (!guestPhone.trim() || guestPhone.trim().length < 8) {
      setBookingError('Please enter a valid mobile number for booking confirmation.');
      return;
    }
    if (!documentNumber.trim()) {
      setBookingError('Please enter your government ID number for reception document approval.');
      return;
    }

    try {
      setIsSubmittingBooking(true);
      setBookingError(null);

      const checkInDate = new Date();
      const checkOutDate = new Date(checkInDate.getTime() + bookingNights * 24 * 60 * 60 * 1000);

      const basePrice = selectedRoomForBooking.roomType.basePriceOvernight || 2500;
      const gstRate = basePrice > 7500 ? 18 : 12;
      const subtotal = basePrice * bookingNights;
      const taxAmount = Math.round(((subtotal * gstRate) / 100) * 100) / 100;
      const grandTotal = subtotal + taxAmount;

      const maskedId = documentNumber.length > 4
        ? `${'X'.repeat(documentNumber.length - 4)}${documentNumber.slice(-4)}`
        : documentNumber;

      const payload = {
        hotelId: selectedHotel.id,
        roomId: selectedRoomForBooking.id,
        checkInDate: checkInDate.toISOString(),
        checkOutDate: checkOutDate.toISOString(),
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim(),
        guestEmail: guestEmail.trim() || `${guestPhone.trim()}@guest.spicehub.com`,
        isCouple: guestCount === 2,
        idType: documentType,
        idNumber: documentNumber.trim(),
        advancePaid: grandTotal,
        bookingLocation: bookingLocationType,
        requiresReceptionApproval: true,
      };

      const res = await fetch(`${DEFAULT_API_BASE}/api/v1/guest-portal/rooms/book-and-checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hotel-id': selectedHotel.id,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success && json.data) {
        const generatedBookingNum = json.data.bookingNumber || json.data.folioNumber || `BK-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

        const pendingData: PendingApprovalBooking = {
          bookingNumber: generatedBookingNum,
          roomNumber: selectedRoomForBooking.roomNumber,
          roomTypeName: selectedRoomForBooking.roomType.name,
          guestName: guestName.trim(),
          guestPhone: guestPhone.trim(),
          guestEmail: guestEmail.trim() || `${guestPhone.trim()}@guest.spicehub.com`,
          guestCount,
          checkInDate: checkInDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
          checkOutDate: checkOutDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
          nights: bookingNights,
          grandTotal,
          idType: documentType,
          idNumberMasked: maskedId,
          bookingLocation: bookingLocationType === 'HOTEL_RADIUS' ? 'Hotel Premises (On-Site Radius)' : 'Remote / Home Booking',
          status: 'PENDING_APPROVAL',
          hotelId: selectedHotel.id,
        };

        try {
          localStorage.setItem('spicehub_pending_approval_booking', JSON.stringify(pendingData));
        } catch {}

        setPendingApprovalBooking(pendingData);
        setIsBookingModalOpen(false);
        refreshRoomsCatalog(selectedHotel);
      } else {
        setBookingError(json.message || 'Failed to submit room reservation documents. Please try again.');
      }
    } catch (err: any) {
      setBookingError(err.message || 'Network error while submitting documents to reception.');
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  // Front Desk Instant Document Approval Action (Approve Keycard)
  const handleApproveByReception = async () => {
    if (!pendingApprovalBooking || !selectedHotel) return;
    try {
      setIsApprovingAtReception(true);
      const res = await fetch(`${DEFAULT_API_BASE}/api/v1/guest-portal/rooms/approve-checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hotel-id': selectedHotel.id,
        },
        body: JSON.stringify({
          hotelId: selectedHotel.id,
          bookingNumber: pendingApprovalBooking.bookingNumber,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success && json.data) {
        const activeRes: ActiveReservation = {
          bookingNumber: pendingApprovalBooking.bookingNumber,
          roomNumber: pendingApprovalBooking.roomNumber,
          roomTypeName: pendingApprovalBooking.roomTypeName,
          guestName: pendingApprovalBooking.guestName,
          guestPhone: pendingApprovalBooking.guestPhone,
          checkInDate: pendingApprovalBooking.checkInDate,
          checkOutDate: pendingApprovalBooking.checkOutDate,
          nights: pendingApprovalBooking.nights,
          grandTotal: pendingApprovalBooking.grandTotal,
          sessionToken: json.data.sessionToken,
          wifiSsid: json.data?.wifiSsid || selectedHotel?.wifiSsid || 'TajGateway_HighSpeed',
          wifiPassword: json.data?.wifiPassword || selectedHotel?.wifiPassword || `TajGuest@${pendingApprovalBooking.roomNumber}`,
          bookingStatus: 'CHECKED_IN',
          receptionApprovedAt: new Date().toISOString(),
        };

        try {
          localStorage.setItem('spicehub_active_guest_reservation', JSON.stringify(activeRes));
          localStorage.removeItem('spicehub_pending_approval_booking');
        } catch {}

        setActiveReservation(activeRes);
        setPendingApprovalBooking(null);
        setBookingConfirmation(activeRes);
        setCustomerView('home');
        refreshRoomsCatalog(selectedHotel);
      } else {
        alert(json.message || 'Reception approval failed');
      }
    } catch (err: any) {
      alert(err.message || 'Reception approval network error');
    } finally {
      setIsApprovingAtReception(false);
    }
  };

  // Verify Resident Stay (For guests who checked in at reception counter)
  const handleVerifyResidentStay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHotel) return;

    const rNum = roomNumberInput.trim();
    const phone = guestPhoneInput.trim();

    if (!rNum) {
      setStayVerifyError('Please enter your Room Number.');
      return;
    }
    if (!phone) {
      setStayVerifyError('Please enter your registered phone number.');
      return;
    }

    try {
      setIsVerifyingStay(true);
      setStayVerifyError(null);

      const res = await fetch(`${DEFAULT_API_BASE}/api/v1/guest-portal/stay/verify-resident`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hotel-id': selectedHotel.id,
        },
        body: JSON.stringify({
          hotelId: selectedHotel.id,
          roomNumber: rNum,
          guestPhone: phone,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success && json.data) {
        launchResidentPortal(json.data.roomNumber || rNum, selectedHotel, json.data.sessionToken);
      } else {
        setStayVerifyError(
          json.message ||
            `No active check-in found for Room ${rNum} with mobile ${phone}. If you need a room, please explore available rooms from our catalog.`
        );
      }
    } catch (err: any) {
      setStayVerifyError(err.message || 'Verification network error.');
    } finally {
      setIsVerifyingStay(false);
    }
  };

  const filteredHotels = hotels.filter(
    (h) =>
      h.name.toLowerCase().includes(hotelSearch.toLowerCase()) ||
      (h.city && h.city.toLowerCase().includes(hotelSearch.toLowerCase()))
  );

  // If a portal is active (e.g. In-Room Dining or Dine-In Table Menu), render embedded portal
  if (activePortalUrl) {
    return (
      <div className={`w-full h-full flex flex-col ${isDark ? 'bg-[#070b12] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        <div
          className={`border-b px-3.5 py-2.5 flex items-center justify-between text-xs z-20 shadow-sm ${
            isDark ? 'bg-[#0c1322] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className={`font-black truncate max-w-[180px] sm:max-w-md ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {activeSessionLabel}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-2 rounded-xl border text-xs font-bold transition flex items-center justify-center ${
                isDark ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
              title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
            >
              {isDark ? <Icons.Sun className="w-4 h-4 text-amber-400" /> : <Icons.Moon className="w-4 h-4 text-slate-700" />}
            </button>
            <button
              type="button"
              onClick={() => {
                const ifr = document.getElementById('portal-frame') as HTMLIFrameElement;
                if (ifr) ifr.src = activePortalUrl;
              }}
              className={`px-3 py-1.5 rounded-xl font-bold border flex items-center gap-1.5 transition ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              <Icons.Refresh className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => setActivePortalUrl(null)}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1.5 transition shadow-sm active:scale-95"
            >
              <Icons.Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </button>
          </div>
        </div>
        <div className="flex-1 w-full relative">
          <iframe
            id="portal-frame"
            src={activePortalUrl}
            title="Customer Portal"
            className="w-full h-full border-none"
            allow="camera; microphone; payment; geolocation"
          />
        </div>
      </div>
    );
  }

  const availableRoomsList = catalogRooms.filter((r) => r.displayStatus === 'AVAILABLE');

  return (
    <div className={`min-h-full flex flex-col ${isDark ? 'bg-[#070b12] text-slate-100' : 'bg-slate-50 text-slate-900'} overflow-y-auto transition-colors duration-200`}>
      {/* Top Header with Property Identity & Theme Switcher */}
      <header
        className={`sticky top-0 z-30 backdrop-blur-md px-4 py-2.5 flex items-center justify-between transition-colors border-b ${
          isDark ? 'bg-[#0d1424]/90 border-slate-800/80 text-white' : 'bg-white/95 border-slate-200/90 text-slate-900 shadow-sm'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl overflow-hidden border border-amber-500/30 shadow-sm bg-slate-900 shrink-0">
            <img
              src={selectedHotel?.logoUrl || FALLBACK_HOTEL_LOGO}
              alt={selectedHotel?.name || 'Hotel Logo'}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = FALLBACK_HOTEL_LOGO;
              }}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-black tracking-tight truncate">
                {selectedHotel?.name || 'SpiceHub Luxury Guest'}
              </h1>
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-500">
                <Icons.Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              </span>
            </div>
            <p className={`text-[11px] truncate font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {selectedHotel?.city ? `${selectedHotel.city}, ${selectedHotel.state || 'India'}` : 'Heritage Hospitality & Suites'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Host Toggle (USB vs Wi-Fi) */}
          <button
            type="button"
            data-testid="customer-network-host-btn"
            onClick={() => {
              const next = serverHost === 'localhost' ? DEV_LAN_HOST : 'localhost';
              setServerHost(next);
              localStorage.setItem('spicehub_server_host', next);
            }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition active:scale-95 ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 shadow-sm'
            }`}
            title="Toggle between Wi-Fi LAN IP and USB Direct"
          >
            <span>{serverHost === 'localhost' ? '⚡' : '📶'}</span>
            <span>{serverHost === 'localhost' ? 'USB' : 'Wi-Fi'}</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            type="button"
            data-testid="customer-theme-toggle"
            onClick={toggleTheme}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition active:scale-95 ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 shadow-sm'
            }`}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
          >
            {isDark ? (
              <>
                <Icons.Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Icons.Moon className="w-3.5 h-3.5 text-slate-700" />
                <span>Dark</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4 flex flex-col gap-4 pb-28">

        {/* ======================================================== */}
        {/* RECEPTION APPROVAL GATE BANNER (IF BOOKING PENDING)      */}
        {/* ======================================================== */}
        {pendingApprovalBooking && (
          <div
            data-testid="reception-approval-gate-banner"
            className={`rounded-2xl border p-4 shadow-md flex flex-col gap-3 relative overflow-hidden animate-in fade-in ${
              isDark ? 'bg-amber-950/40 border-amber-500/50 text-white' : 'bg-amber-50/90 border-amber-300 text-slate-900'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xl shadow-md animate-pulse shrink-0">
                  <Icons.Clock className="w-6 h-6 text-slate-950" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      Front Desk Verification
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40">
                      Pending Approval
                    </span>
                  </div>
                  <h3 className="text-sm font-black mt-0.5">
                    Room {pendingApprovalBooking.roomNumber} • {pendingApprovalBooking.roomTypeName}
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    Guest: {pendingApprovalBooking.guestName} • Ref: {pendingApprovalBooking.bookingNumber}
                  </p>
                </div>
              </div>
            </div>

            {/* Document Verification Notice */}
            <div className={`p-3 rounded-xl border text-xs space-y-1 ${isDark ? 'bg-black/30 border-amber-500/20' : 'bg-white/80 border-amber-200'}`}>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Document ID:</span>
                <span className="font-bold uppercase text-amber-600 dark:text-amber-400">
                  {pendingApprovalBooking.idType} ({pendingApprovalBooking.idNumberMasked})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Check-In Location:</span>
                <span className="font-bold">{pendingApprovalBooking.bookingLocation}</span>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-300/90 pt-1 leading-snug">
                Digital Keycard & In-Room Dining unlock automatically once Front Desk approves your ID.
              </p>
            </div>

            {/* Front Desk Reception Instant Keycard Action Button */}
            <div className="pt-0.5 flex flex-col gap-2">
              <button
                type="button"
                data-testid="approve-by-reception-btn"
                disabled={isApprovingAtReception}
                onClick={handleApproveByReception}
                className="min-h-[44px] rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition active:scale-98 disabled:opacity-50"
              >
                <Icons.Check className="w-4 h-4" />
                <span>{isApprovingAtReception ? 'Approving at Front Desk...' : 'Approve by Reception Desk (Instant Keycard)'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 1: CLEAN HOME LANDING PAGE WITH EXACTLY 2 BIG CARDS */}
        {/* ======================================================== */}
        {customerView === 'home' && (
          <div className="flex flex-col gap-4">
            {/* Authoritative Property Showcase Hero Card */}
            <div
              className="rounded-2xl border border-amber-500/30 shadow-lg relative overflow-hidden min-h-[175px] flex flex-col justify-end p-4 group"
            >
              <img
                src={selectedHotel?.coverImageUrl || 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1600&auto=format&fit=crop&q=80'}
                alt={selectedHotel?.name || 'Hotel'}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = FALLBACK_HOTEL_COVER;
                }}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/25" />

              {/* Banner Content */}
              <div className="relative z-10 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-black/60 text-amber-300 border border-amber-500/30 backdrop-blur-md flex items-center gap-1">
                      <Icons.Location className="w-3 h-3 text-amber-400" />
                      <span>{selectedHotel?.city || 'Jaipur'}, {selectedHotel?.state || 'Rajasthan'}</span>
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 backdrop-blur-md flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Verified Property</span>
                    </span>
                  </div>

                  {/* Single Consolidated Authoritative Switch Hotel Action Button */}
                  <button
                    type="button"
                    data-testid="select-hotel-pill-btn"
                    onClick={() => setIsHotelModalOpen(true)}
                    className="text-[11px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold border border-amber-300 shadow-md transition active:scale-95 flex items-center gap-1.5 shrink-0"
                  >
                    <Icons.Switch className="w-3.5 h-3.5 text-slate-950" />
                    <span>Switch Hotel</span>
                  </button>
                </div>

                <div className="flex items-center gap-3 pt-0.5">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-amber-400 shadow-md bg-white shrink-0">
                    <img
                      src={selectedHotel?.logoUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=300&auto=format&fit=crop&q=80'}
                      alt=""
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = FALLBACK_HOTEL_LOGO;
                      }}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base sm:text-lg font-black text-white truncate drop-shadow">
                      {selectedHotel?.name || 'Select Hotel Property'}
                    </h2>
                    <p className="text-[11px] text-amber-200/90 truncate font-semibold">
                      {selectedHotel?.tagline || 'Experience luxury hospitality & fine dining'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Guest Services & Experience Section */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h2 className={`text-sm font-black uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                    Guest Experiences
                  </h2>
                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Choose your personalized hospitality service
                  </p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  2 Options
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3.5">
                {/* OPTION 1: BOOK A ROOM (STAY) WITH ROOM PHOTO */}
                <button
                  type="button"
                  data-testid="home-book-room-card"
                  onClick={() => setCustomerView('rooms')}
                  className="rounded-2xl border border-blue-500/40 relative overflow-hidden min-h-[175px] text-left group shadow-md flex flex-col justify-between p-4 transition active:scale-98"
                >
                  <img
                    src={selectedHotel?.stayImageUrl || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200&auto=format&fit=crop&q=80'}
                    alt="Book a Room"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-950/25" />

                  {/* Card Header Badges */}
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-md flex items-center gap-1">
                        <Icons.Bed className="w-3.5 h-3.5" />
                        <span>Stay & Suites</span>
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 backdrop-blur-md">
                        {availableRoomCount !== null ? `${availableRoomCount} Available Rooms` : 'Verified Rooms'}
                      </span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-blue-600/90 text-white flex items-center justify-center text-sm font-black shadow-md group-hover:translate-x-1 transition-transform">
                      <Icons.ArrowRight className="w-4 h-4 text-white" />
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="relative z-10 space-y-1">
                    <h3 className="text-lg font-black text-white drop-shadow-md flex items-center gap-2">
                      <Icons.Bed className="w-5 h-5 text-blue-400" />
                      <span>Book a Room</span>
                    </h3>
                    <p className="text-xs text-slate-200 line-clamp-2 drop-shadow font-normal">
                      Browse verified available rooms, hotel radius check & instant Front Desk check-in
                    </p>
                    <div className="pt-1.5 flex items-center gap-3 text-[11px] font-bold text-blue-300">
                      <span className="flex items-center gap-1">
                        <Icons.Check className="w-3.5 h-3.5 text-blue-400" />
                        <span>Instant ID Check-in</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Icons.Key className="w-3.5 h-3.5 text-blue-400" />
                        <span>Digital Keycard</span>
                      </span>
                    </div>
                  </div>
                </button>

                {/* OPTION 2: DINE-IN / TABLE SCAN (DINING) WITH RESTAURANT PHOTO */}
                <button
                  type="button"
                  data-testid="home-table-scan-card"
                  onClick={() => setCustomerView('table_scan')}
                  className="rounded-2xl border border-amber-500/40 relative overflow-hidden min-h-[175px] text-left group shadow-md flex flex-col justify-between p-4 transition active:scale-98"
                >
                  <img
                    src={selectedHotel?.diningImageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80'}
                    alt="Dine-In Table Scan"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-950/25" />

                  {/* Card Header Badges */}
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 shadow-md flex items-center gap-1">
                        <Icons.Utensils className="w-3.5 h-3.5 text-slate-950" />
                        <span>Dining</span>
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/30 text-amber-300 border border-amber-500/40 backdrop-blur-md">
                        Table QR Standee
                      </span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-sm font-black shadow-md group-hover:translate-x-1 transition-transform">
                      <Icons.ArrowRight className="w-4 h-4 text-slate-950" />
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="relative z-10 space-y-1">
                    <h3 className="text-lg font-black text-white drop-shadow-md flex items-center gap-2">
                      <Icons.Utensils className="w-5 h-5 text-amber-400" />
                      <span>Dine-In / Table Scan</span>
                    </h3>
                    <p className="text-xs text-slate-200 line-clamp-2 drop-shadow font-normal">
                      Scan your dining table standee QR to unlock the digital food menu & live waiter service
                    </p>
                    <div className="pt-1.5 flex items-center gap-3 text-[11px] font-bold text-amber-300">
                      <span className="flex items-center gap-1">
                        <Icons.QrCode className="w-3.5 h-3.5 text-amber-400" />
                        <span>Camera QR Scan</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Icons.Check className="w-3.5 h-3.5 text-amber-400" />
                        <span>Live Kitchen KDS</span>
                      </span>
                    </div>
                  </div>
                </button>
              </div>

              {/* Active Stay Card (Only shown if guest has an active approved reservation) */}
              {activeReservation && !pendingApprovalBooking && (
                <div
                  data-testid="active-stay-card"
                  className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-950 border border-emerald-500/40 shadow-lg space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                        Active Stay Verified • Room {activeReservation.roomNumber}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-300">
                      {activeReservation.bookingNumber}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-bold">{activeReservation.guestName}</span>
                    <span className="text-slate-400">{activeReservation.roomTypeName}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      data-testid="enter-active-room-btn"
                      onClick={() =>
                        launchResidentPortal(
                          activeReservation.roomNumber,
                          selectedHotel,
                          activeReservation.sessionToken,
                          'HOME'
                        )
                      }
                      className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md transition active:scale-98"
                    >
                      <Icons.Key className="w-4 h-4 text-white" />
                      <span>Digital Keycard</span>
                    </button>

                    <button
                      type="button"
                      data-testid="room-in-room-dining-btn"
                      onClick={() =>
                        launchResidentPortal(
                          activeReservation.roomNumber,
                          selectedHotel,
                          activeReservation.sessionToken,
                          'DINING'
                        )
                      }
                      className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md transition active:scale-98"
                    >
                      <Icons.Utensils className="w-4 h-4 text-slate-950" />
                      <span>Order Food</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Resident Verification Subtle Link */}
            <div className="pt-1 text-center">
              <button
                type="button"
                data-testid="home-resident-verify-link"
                onClick={() => setCustomerView('resident_verify')}
                className={`text-xs font-semibold hover:underline flex items-center justify-center gap-1.5 mx-auto ${
                  isDark ? 'text-slate-400 hover:text-amber-400' : 'text-slate-600 hover:text-amber-600'
                }`}
              >
                <span>Already checked in at Front Desk? Verify Room Stay</span>
                <Icons.ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 2: AVAILABLE ROOMS CATALOG                          */}
        {/* ======================================================== */}
        {customerView === 'rooms' && (
          <div className="flex flex-col gap-3.5">
            {/* Header & Back Button */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                data-testid="rooms-back-home-btn"
                onClick={() => setCustomerView('home')}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700 shadow-sm'
                }`}
              >
                <Icons.ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Home</span>
              </button>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                  <span>{availableRoomsList.length} Rooms Ready</span>
                </span>
                <button
                  type="button"
                  onClick={() => refreshRoomsCatalog()}
                  className={`text-[10px] font-bold px-2 py-1 rounded-lg border flex items-center gap-1 transition ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-700 shadow-sm'
                  }`}
                >
                  <Icons.Refresh className="w-3 h-3" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            <div>
              <h2 className="text-base font-black">
                Available Rooms at {selectedHotel?.name}
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Select an available room below to check booking radius and proceed to check-in.
              </p>
            </div>

            {loadingRooms && (
              <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
                Loading live room availability catalog...
              </div>
            )}

            {!loadingRooms && availableRoomsList.length === 0 && (
              <div
                className={`rounded-2xl border p-6 text-center space-y-2 ${
                  isDark ? 'border-slate-800 bg-slate-900/40 text-slate-400' : 'border-slate-200 bg-white text-slate-600 shadow-sm'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                  <Icons.Bed className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-black">All Rooms Currently Occupied</h4>
                <p className="text-[11px]">
                  Housekeeping is preparing the next batch of rooms. Please check back shortly or speak with the reception desk.
                </p>
              </div>
            )}

            {/* Room Cards Grid */}
            {!loadingRooms &&
              availableRoomsList.map((room) => {
                const photo =
                  room.photos?.[0] ||
                  room.roomType?.photos?.[0] ||
                  FALLBACK_ROOM_IMAGE;
                const basePrice = room.roomType.basePriceOvernight || 2500;
                const gstRate = basePrice > 7500 ? 18 : 12;
                const gstAmt = Math.round((basePrice * gstRate) / 100);

                return (
                  <div
                    key={room.id}
                    data-testid={`room-card-${room.roomNumber}`}
                    className={`rounded-2xl border overflow-hidden transition shadow-sm flex flex-col ${
                      isDark
                        ? 'bg-slate-900/80 border-slate-800 text-white'
                        : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  >
                    {/* Room Photo */}
                    <div className="h-44 w-full relative overflow-hidden bg-slate-950">
                      <img
                        src={photo}
                        alt={room.roomType.name}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = FALLBACK_ROOM_IMAGE;
                        }}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

                      {/* Room Number Pill & Live Status */}
                      <div className="absolute top-3 inset-x-3 flex items-center justify-between">
                        <div className="px-3 py-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-white font-black text-xs flex items-center gap-1.5 shadow-md">
                          <Icons.Bed className="w-3.5 h-3.5 text-amber-400" />
                          <span>Room {room.roomNumber}</span>
                        </div>

                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-600/95 text-white border border-emerald-400 shadow-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          <span>Ready for Check-In</span>
                        </span>
                      </div>

                      {/* Title on Image */}
                      <div className="absolute bottom-2.5 left-3 right-3">
                        <h3 className="text-white font-black text-base drop-shadow-md leading-tight">
                          {room.roomType.name}
                        </h3>
                        <p className="text-amber-300 text-[11px] font-semibold drop-shadow flex items-center gap-2 mt-0.5">
                          <span>Floor {room.floorNumber}</span>
                          <span>• Wing {room.wing || 'Main'}</span>
                          <span>• Max {room.roomType.maxCapacity || 2} Guests</span>
                        </p>
                      </div>
                    </div>

                    {/* Room Amenities & Pricing Details */}
                    <div className="p-4 flex flex-col gap-3">
                      {/* Amenities Tags */}
                      <div className="flex flex-wrap gap-1.5">
                        {(room.roomType.amenities?.length > 0
                          ? room.roomType.amenities
                          : ['Free High-Speed WiFi', 'Air Conditioning', 'King Bed', 'Room Service']
                        )
                          .slice(0, 4)
                          .map((amenity, idx) => (
                            <span
                              key={idx}
                              className={`text-[10px] px-2.5 py-0.5 rounded-lg font-medium border flex items-center gap-1 ${
                                isDark
                                  ? 'bg-slate-800/80 border-slate-700 text-slate-300'
                                  : 'bg-slate-100 border-slate-200 text-slate-700'
                              }`}
                            >
                              <Icons.Sparkles className="w-3 h-3 text-amber-400" />
                              <span>{amenity}</span>
                            </span>
                          ))}
                      </div>

                      {/* Pricing Row */}
                      <div
                        className={`p-3 rounded-xl border flex items-center justify-between ${
                          isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div>
                          <div className={`text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Overnight Rate
                          </div>
                          <div className={`text-base font-black ${isDark ? 'text-amber-400' : 'text-slate-900'}`}>
                            ₹{basePrice.toLocaleString('en-IN')}{' '}
                            <span className="text-[11px] font-normal text-slate-500">/ night</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            Digital Keycard Included
                          </div>
                          <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            + {gstRate}% GST (₹{gstAmt})
                          </p>
                        </div>
                      </div>

                      {/* Action Button: Opens Location Radius Check Dialog */}
                      <button
                        type="button"
                        data-testid={`book-room-btn-${room.roomNumber}`}
                        onClick={() => handleSelectRoomForBooking(room)}
                        className="min-h-[44px] rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-98 transition"
                      >
                        <Icons.Bed className="w-4 h-4 text-white" />
                        <span>Book Room {room.roomNumber}</span>
                        <Icons.ArrowRight className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 3: DINE-IN TABLE STAND-EE SCANNER ("Table Scan")    */}
        {/* ======================================================== */}
        {customerView === 'table_scan' && (
          <div className="flex flex-col gap-3.5">
            {/* Header & Back Button */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                data-testid="table-back-home-btn"
                onClick={() => {
                  stopCamera();
                  setCustomerView('home');
                }}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700 shadow-sm'
                }`}
              >
                <Icons.ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Home</span>
              </button>
              <span className="text-xs font-bold text-amber-500 flex items-center gap-1">
                <Icons.Utensils className="w-3.5 h-3.5" />
                <span>Table QR Ordering</span>
              </span>
            </div>

            {/* Camera QR Scanner */}
            <div
              className={`rounded-2xl border p-4 sm:p-5 flex flex-col gap-3.5 shadow-sm ${
                isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
                    <Icons.Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Scan Table Standee QR Code
                    </h3>
                    <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Point camera at the QR code standee on your dining table
                    </p>
                  </div>
                </div>
                {isCameraActive && (
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="text-xs font-bold text-rose-500 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 hover:bg-rose-100"
                  >
                    Close Camera
                  </button>
                )}
              </div>

              {isCameraActive ? (
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border-2 border-emerald-500/60 shadow-lg">
                  <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_rgba(52,211,153,0.9)] animate-pulse pointer-events-none" />
                  <div className="absolute inset-0 border-2 border-dashed border-emerald-400/80 m-6 rounded-2xl pointer-events-none" />
                  <p className="absolute bottom-2.5 text-[10px] text-white/90 bg-black/75 backdrop-blur-xs px-3 py-1 rounded-full flex items-center gap-1.5 shadow">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Live video stream active • Point at Table QR standee
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  data-testid="open-camera-scanner-btn"
                  onClick={startCamera}
                  className="rounded-2xl border-2 border-dashed border-amber-500/40 hover:border-amber-500 p-6 flex flex-col items-center justify-center gap-2 bg-amber-500/5 transition group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow group-hover:scale-105 transition">
                    <Icons.Camera className="w-6 h-6 text-slate-950" />
                  </div>
                  <span className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                    Open Live Video QR Scanner
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 text-center">
                    Continuously scans physical dining table standee QR codes via live camera feed
                  </span>
                </button>
              )}

              {/* Direct QR Simulation Trigger for Rapid Testing */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-bold text-slate-400">Test Standee QRs:</span>
                {['T-01', 'T-02', 'T-03', 'T-05'].map((testTbl) => (
                  <button
                    key={testTbl}
                    type="button"
                    onClick={() => handleQrDetected(`http://localhost:3001/?hotelId=${selectedHotel?.id || ''}&table=${testTbl}`)}
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 transition"
                  >
                    Scan {testTbl}
                  </button>
                ))}
              </div>

              {cameraError && (
                <p className="text-[10px] text-rose-500 text-center font-semibold">
                  ⚠️ {cameraError}
                </p>
              )}
            </div>

            {/* Quick Preset Table Chips & Manual Input */}
            <div
              className={`rounded-2xl border p-4 flex flex-col gap-3 shadow-sm ${
                isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Quick Select or Enter Table:
                </span>
                <span className="text-[10px] text-slate-400">Indoor & Rooftop</span>
              </div>

              {/* Table Quick Preset Pills */}
              <div className="grid grid-cols-4 gap-2">
                {['T-01', 'T-02', 'T-03', 'T-04', 'T-05', 'T-06', 'T-08', 'Rooftop 1'].map((tbl) => (
                  <button
                    key={tbl}
                    type="button"
                    onClick={() => launchTable(tbl)}
                    className={`py-2 px-1 rounded-xl text-xs font-black border transition active:scale-95 text-center ${
                      isDark
                        ? 'bg-slate-800/80 hover:bg-amber-500 hover:text-slate-950 border-slate-700 text-slate-200'
                        : 'bg-slate-50 hover:bg-amber-500 hover:text-slate-950 border-slate-200 text-slate-800 shadow-sm'
                    }`}
                  >
                    {tbl}
                  </button>
                ))}
              </div>

              {validationError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                  ⚠️ {validationError}
                </div>
              )}

              {/* Manual Table Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  launchTable(tableInput);
                }}
                className="flex items-center gap-2 pt-1"
              >
                <input
                  type="text"
                  data-testid="customer-manual-input"
                  value={tableInput}
                  onChange={(e) => setTableInput(e.target.value)}
                  placeholder="e.g. T-02, 4, Rooftop 1"
                  className={`flex-1 min-h-[42px] rounded-xl border px-3.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white'
                  }`}
                />
                <button
                  type="submit"
                  data-testid="customer-manual-submit-btn"
                  className="min-h-[42px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-sm shrink-0 flex items-center justify-center gap-1.5"
                >
                  <Icons.ArrowRight className="w-3.5 h-3.5 text-slate-950" />
                  <span>Open Menu</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 4: RESIDENT STAY VERIFICATION                       */}
        {/* ======================================================== */}
        {customerView === 'resident_verify' && (
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCustomerView('home')}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700 shadow-sm'
                }`}
              >
                <Icons.ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Home</span>
              </button>
              <span className="text-xs font-bold text-blue-500 flex items-center gap-1">
                <Icons.Key className="w-3.5 h-3.5" />
                <span>Resident Stay</span>
              </span>
            </div>

            <div
              className={`rounded-2xl border p-4 sm:p-5 flex flex-col gap-3 shadow-sm ${
                isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'
              }`}
            >
              <div>
                <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Verify Checked-In Stay
                </h3>
                <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Enter your room number and registered phone number to open your in-room services portal
                </p>
              </div>

              {stayVerifyError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex flex-col gap-1.5">
                  <span className="font-semibold">⚠️ {stayVerifyError}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerView('rooms');
                      setStayVerifyError(null);
                    }}
                    className="self-start text-[11px] font-black text-amber-600 underline hover:text-amber-700"
                  >
                    👉 Explore available rooms from catalog instead
                  </button>
                </div>
              )}

              <form onSubmit={handleVerifyResidentStay} className="flex flex-col gap-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className={`block text-[10px] font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Room Number
                    </label>
                    <input
                      type="text"
                      data-testid="resident-room-input"
                      value={roomNumberInput}
                      onChange={(e) => setRoomNumberInput(e.target.value)}
                      placeholder="e.g. 101, 204"
                      className={`w-full min-h-[42px] rounded-xl border px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDark
                          ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500'
                          : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-[10px] font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Registered Mobile Number
                    </label>
                    <input
                      type="tel"
                      data-testid="resident-phone-input"
                      value={guestPhoneInput}
                      onChange={(e) => setGuestPhoneInput(e.target.value)}
                      placeholder="e.g. 9820011223"
                      className={`w-full min-h-[42px] rounded-xl border px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDark
                          ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500'
                          : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white'
                      }`}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isVerifyingStay}
                  data-testid="resident-verify-stay-btn"
                  className="min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider transition shadow-sm flex items-center justify-center gap-2 mt-1 active:scale-98"
                >
                  <Icons.Key className="w-4 h-4 text-white" />
                  {isVerifyingStay ? (
                    <span>Verifying with Front Desk...</span>
                  ) : (
                    <span>Verify Stay & Open Portal</span>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 5: MODERN CUSTOMER PROFILE SECTION                  */}
        {/* ======================================================== */}
        {customerView === 'profile' && (
          <div className="flex flex-col gap-4 animate-in fade-in">
            {/* Profile Identity Card */}
            <div className={`p-5 rounded-2xl border shadow-sm relative overflow-hidden flex flex-col gap-3.5 ${
              isDark ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-[#0d1424] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 font-black text-xl flex items-center justify-center shadow-md border-2 border-amber-400 shrink-0">
                  {activeReservation?.guestName ? activeReservation.guestName.slice(0, 2).toUpperCase() : <Icons.User className="w-7 h-7 text-slate-950" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black truncate">
                      {activeReservation?.guestName || pendingApprovalBooking?.guestName || 'Valued Guest'}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 flex items-center gap-0.5">
                      <Icons.Check className="w-2.5 h-2.5 text-emerald-500" />
                      <span>Verified</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">
                    {activeReservation?.guestPhone || pendingApprovalBooking?.guestPhone || '+91 98765 43210'}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {activeReservation?.guestEmail || pendingApprovalBooking?.guestEmail || 'guest@spicehub.com'}
                  </p>
                </div>
              </div>

              {/* KYC & Verification Status Bar */}
              <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                isDark ? 'bg-black/30 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center gap-2">
                  <Icons.Shield className="w-4 h-4 text-emerald-500" />
                  <div>
                    <span className="font-bold text-[11px] block">Front Desk KYC Verification</span>
                    <span className="text-[10px] text-slate-400">
                      {activeReservation ? 'Aadhaar ID Verified & Checked-In' : 'Standard Guest Profile'}
                    </span>
                  </div>
                </div>
                <span className="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                  ACTIVE
                </span>
              </div>
            </div>

            {/* Active Stay Details (If staying at hotel) */}
            {activeReservation && (
              <div className={`p-4 rounded-2xl border shadow-sm space-y-3 ${
                isDark ? 'bg-emerald-950/40 border-emerald-500/40 text-white' : 'bg-emerald-50/80 border-emerald-300 text-slate-900'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-500">
                      Active In-House Stay
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    Room #{activeReservation.roomNumber}
                  </span>
                </div>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Room Category:</span>
                    <span className="font-bold">{activeReservation.roomTypeName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Booking Reference:</span>
                    <span className="font-mono font-bold text-amber-500">{activeReservation.bookingNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Dates:</span>
                    <span className="font-medium">{activeReservation.checkInDate} ➔ {activeReservation.checkOutDate}</span>
                  </div>
                </div>

                {/* Dynamic Hotel Wi-Fi Credentials */}
                <div className="flex justify-between items-center bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 text-[11px]">
                  <span className="font-bold flex items-center gap-1.5 text-emerald-400">
                    <Icons.Wifi className="w-3.5 h-3.5" />
                    <span>In-Room Wi-Fi:</span>
                  </span>
                  <div className="text-right">
                    <span className="block font-bold">{activeReservation.wifiSsid || selectedHotel?.wifiSsid || 'TajGateway_HighSpeed'}</span>
                    <span className="block font-mono text-[10px] text-amber-400">
                      Pass: {activeReservation.wifiPassword || selectedHotel?.wifiPassword || 'SpiceGuest@2026'}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => launchResidentPortal(activeReservation.roomNumber, selectedHotel, activeReservation.sessionToken, 'HOME')}
                    className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow"
                  >
                    <Icons.Key className="w-3.5 h-3.5 text-white" />
                    <span>Digital Key</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => launchResidentPortal(activeReservation.roomNumber, selectedHotel, activeReservation.sessionToken, 'DINING')}
                    className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow"
                  >
                    <Icons.Utensils className="w-3.5 h-3.5 text-slate-950" />
                    <span>Order Food</span>
                  </button>
                </div>
              </div>
            )}

            {/* App Settings & Preferences */}
            <div className={`p-4 rounded-2xl border shadow-sm space-y-3 ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Preferences & Geofencing
              </h3>

              {/* Theme Preference */}
              <div className="flex items-center justify-between py-1 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Icons.Sun className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-semibold">Appearance Theme</span>
                </div>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className={`px-3 py-1 rounded-xl text-xs font-bold border transition ${
                    isDark ? 'bg-slate-800 border-slate-700 text-amber-400' : 'bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  {isDark ? '🌙 Dark Mode' : '☀️ Light Mode'}
                </button>
              </div>

              {/* GPS Geofence Proximity Status */}
              <div className="flex items-center justify-between py-1 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Icons.Location className="w-4 h-4 text-emerald-500" />
                  <div>
                    <span className="text-xs font-semibold block">GPS Location Guard</span>
                    <span className="text-[10px] text-slate-400">On-premises dining verified</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                  Verified &lt;500m
                </span>
              </div>

              {/* Front Desk Phone */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <Icons.Phone className="w-4 h-4 text-amber-500" />
                  <div>
                    <span className="text-xs font-semibold block">Reception Helpline</span>
                    <span className="text-[10px] text-slate-400">{selectedHotel?.name || 'Hotel Front Desk'}</span>
                  </div>
                </div>
                <a
                  href={`tel:${selectedHotel?.contactPhone || '+91 141 2345678'}`}
                  className="px-3 py-1 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1.5"
                >
                  <Icons.Phone className="w-3 h-3" />
                  <span>Call Desk</span>
                </a>
              </div>
            </div>

            {/* Account & Cache Reset Action */}
            <div className={`p-4 rounded-2xl border shadow-sm space-y-2 text-center ${
              isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <button
                type="button"
                data-testid="clear-customer-cache-btn"
                onClick={() => {
                  if (confirm('Clear local stay cache and active reservation on this device?')) {
                    localStorage.removeItem('spicehub_active_guest_reservation');
                    localStorage.removeItem('spicehub_pending_approval_booking');
                    setActiveReservation(null);
                    setPendingApprovalBooking(null);
                    setCustomerView('home');
                    alert('Local session cache cleared successfully.');
                  }
                }}
                className="w-full py-2.5 rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 font-bold text-xs transition flex items-center justify-center gap-1.5"
              >
                <Icons.Trash className="w-4 h-4 text-rose-500" />
                <span>Clear App Cache & Active Stay Session</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* FIXED UNIFIED BOTTOM NAVIGATION BAR                      */}
      {/* ======================================================== */}
      <nav
        data-testid="customer-bottom-nav"
        className={`fixed bottom-0 left-0 right-0 z-40 max-w-lg mx-auto border-t backdrop-blur-lg px-2 py-1.5 flex items-center justify-around transition-colors ${
          isDark ? 'bg-[#0d1424]/95 border-slate-800 text-slate-400' : 'bg-white/95 border-slate-200 text-slate-600 shadow-lg'
        }`}
      >
        {/* 1. Home */}
        <button
          type="button"
          data-testid="nav-tab-home"
          onClick={() => setCustomerView('home')}
          className={`flex flex-col items-center py-1.5 px-3 rounded-xl transition font-bold text-[10px] gap-0.5 ${
            customerView === 'home'
              ? isDark ? 'text-amber-400 bg-amber-500/15' : 'text-amber-600 bg-amber-50'
              : 'hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Icons.Home className="w-5 h-5" />
          <span>Home</span>
        </button>

        {/* 2. Rooms / Stay */}
        <button
          type="button"
          data-testid="nav-tab-rooms"
          onClick={() => setCustomerView('rooms')}
          className={`flex flex-col items-center py-1.5 px-3 rounded-xl transition font-bold text-[10px] gap-0.5 ${
            customerView === 'rooms'
              ? isDark ? 'text-blue-400 bg-blue-500/15' : 'text-blue-600 bg-blue-50'
              : 'hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Icons.Bed className="w-5 h-5" />
          <span>Stay</span>
        </button>

        {/* 3. Dine-In / Scan */}
        <button
          type="button"
          data-testid="nav-tab-dining"
          onClick={() => setCustomerView('table_scan')}
          className={`flex flex-col items-center py-1.5 px-3 rounded-xl transition font-bold text-[10px] gap-0.5 ${
            customerView === 'table_scan'
              ? isDark ? 'text-amber-400 bg-amber-500/15' : 'text-amber-600 bg-amber-50'
              : 'hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Icons.Utensils className="w-5 h-5" />
          <span>Dine-In</span>
        </button>

        {/* 4. My Stay / Keycard */}
        <button
          type="button"
          data-testid="nav-tab-mystay"
          onClick={() => setCustomerView('resident_verify')}
          className={`flex flex-col items-center py-1.5 px-3 rounded-xl transition font-bold text-[10px] gap-0.5 relative ${
            customerView === 'resident_verify'
              ? isDark ? 'text-emerald-400 bg-emerald-500/15' : 'text-emerald-600 bg-emerald-50'
              : 'hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          {activeReservation && (
            <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
          <Icons.Key className="w-5 h-5" />
          <span>My Room</span>
        </button>

        {/* 5. Profile */}
        <button
          type="button"
          data-testid="nav-tab-profile"
          onClick={() => setCustomerView('profile')}
          className={`flex flex-col items-center py-1.5 px-3 rounded-xl transition font-bold text-[10px] gap-0.5 ${
            customerView === 'profile'
              ? isDark ? 'text-amber-400 bg-amber-500/15' : 'text-amber-600 bg-amber-50'
              : 'hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Icons.User className="w-5 h-5" />
          <span>Profile</span>
        </button>
      </nav>

      {/* ======================================================== */}
      {/* LOCATION & RADIUS CHECK DIALOG                           */}
      {/* ======================================================== */}
      {showLocationRadiusCheck && selectedRoomForBooking && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
        >
          <div
            className={`w-full max-w-sm rounded-2xl border p-5 shadow-2xl flex flex-col gap-4 text-center ${
              isDark ? 'border-amber-500/40 bg-[#0d1424] text-white' : 'border-amber-300 bg-white text-slate-900'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border-2 border-blue-500 text-blue-400 flex items-center justify-center mx-auto shadow-md">
              <Icons.Location className="w-6 h-6 text-blue-400" />
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Location & Radius Verification
              </span>
              <h3 className="text-base font-black mt-1">
                Booking Room {selectedRoomForBooking.roomNumber}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Are you currently within hotel premises or booking remotely from home?
              </p>
            </div>

            <div className="flex flex-col gap-2.5 py-1">
              {/* Option 1: At Hotel Premises */}
              <button
                type="button"
                data-testid="radius-option-hotel-premises"
                onClick={() => handleProceedToBookingForm('HOTEL_RADIUS')}
                className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 active:scale-98 ${
                  isDark
                    ? 'border-emerald-500/50 bg-emerald-950/30 hover:bg-emerald-950/50'
                    : 'border-emerald-400 bg-emerald-50 hover:bg-emerald-100/70 shadow-sm'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0 mt-0.5">
                  <Icons.Building className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                      At Hotel (Within Hotel Radius)
                    </h4>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
                      On-Site
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                    In the hotel lobby, lounge or grounds. Submit ID documents to reception for instant approval & keycard.
                  </p>
                </div>
              </button>

              {/* Option 2: Remote / Home Booking */}
              <button
                type="button"
                data-testid="radius-option-remote-home"
                onClick={() => handleProceedToBookingForm('REMOTE_HOME')}
                className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 active:scale-98 ${
                  isDark
                    ? 'border-slate-800 bg-slate-900/60 hover:bg-slate-800'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 shadow-sm'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-500 shrink-0 mt-0.5">
                  <Icons.Home className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-black text-slate-900 dark:text-slate-200">
                      Booking from Home / Remote
                    </h4>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-600 dark:text-blue-300">
                      Advance
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Pre-reserve room from home. Documents will be validated at reception upon arrival.
                  </p>
                </div>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowLocationRadiusCheck(false)}
              className={`w-full py-2.5 rounded-xl border text-xs font-semibold transition ${
                isDark ? 'border-slate-800 text-slate-400 hover:text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* GUEST DETAILS & RECEPTION DOCUMENT FORM MODAL            */}
      {/* ======================================================== */}
      {isBookingModalOpen && selectedRoomForBooking && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in"
        >
          <div
            className={`w-full max-w-md rounded-2xl border p-5 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto ${
              isDark ? 'border-slate-800 bg-[#0d1424] text-white' : 'border-slate-200 bg-white text-slate-900'
            }`}
          >
            {/* Modal Header */}
            <div className={`flex items-start justify-between pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Icons.Location className="w-3 h-3 text-emerald-500" />
                  <span>{bookingLocationType === 'HOTEL_RADIUS' ? 'On-Premises Guest Check-In' : 'Remote Advance Reservation'}</span>
                </span>
                <h3 className="text-base font-black mt-0.5">
                  Room {selectedRoomForBooking.roomNumber} • {selectedRoomForBooking.roomType.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBookingModalOpen(false)}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                  isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                ✕
              </button>
            </div>

            {/* Error Banner */}
            {bookingError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                ⚠️ {bookingError}
              </div>
            )}

            {/* Transparent Tariff Calculation */}
            {(() => {
              const basePrice = selectedRoomForBooking.roomType.basePriceOvernight || 2500;
              const gstRate = basePrice > 7500 ? 18 : 12;
              const subtotal = basePrice * bookingNights;
              const taxAmount = Math.round(((subtotal * gstRate) / 100) * 100) / 100;
              const grandTotal = subtotal + taxAmount;

              return (
                <div
                  className={`p-3.5 rounded-xl border space-y-1.5 text-xs ${
                    isDark ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-300' : 'bg-emerald-50/70 border-emerald-200 text-slate-700'
                  }`}
                >
                  <div className="flex justify-between font-medium">
                    <span>
                      Room Tariff ({bookingNights} {bookingNights === 1 ? 'Night' : 'Nights'} × ₹{basePrice.toLocaleString('en-IN')})
                    </span>
                    <span className="font-bold">₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>GST ({gstRate}%)</span>
                    <span>₹{taxAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="border-t border-emerald-500/30 pt-1.5 flex justify-between font-black text-sm text-emerald-600 dark:text-emerald-400">
                    <span>Total Estimated Tariff</span>
                    <span>₹{grandTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              );
            })()}

            {/* Guest Booking Form */}
            <form onSubmit={handleSubmitBookingForApproval} className="flex flex-col gap-3">
              {/* Stay Duration Selector */}
              <div>
                <label className={`block text-[11px] font-bold uppercase mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Stay Duration (Nights)
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setBookingNights(Math.max(1, bookingNights - 1))}
                    className={`w-10 h-10 rounded-xl border font-black text-base flex items-center justify-center ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-800'
                    }`}
                  >
                    -
                  </button>
                  <span className="text-sm font-black px-4">
                    {bookingNights} {bookingNights === 1 ? 'Night' : 'Nights'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setBookingNights(Math.min(30, bookingNights + 1))}
                    className={`w-10 h-10 rounded-xl border font-black text-base flex items-center justify-center ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-800'
                    }`}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Guest Details */}
              <div>
                <label className={`block text-[11px] font-bold uppercase mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Primary Guest Full Name *
                </label>
                <input
                  type="text"
                  required
                  data-testid="input-guest-name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="e.g. Vikramaditya Sharma"
                  className={`w-full min-h-[42px] rounded-xl border px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`block text-[11px] font-bold uppercase mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    data-testid="input-guest-phone"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="e.g. 9820011223"
                    className={`w-full min-h-[42px] rounded-xl border px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDark
                        ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-[11px] font-bold uppercase mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Guests Count
                  </label>
                  <select
                    value={guestCount}
                    onChange={(e) => setGuestCount(Number(e.target.value))}
                    className={`w-full min-h-[42px] rounded-xl border px-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDark
                        ? 'bg-slate-950 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                    }`}
                  >
                    <option value={1}>1 Guest</option>
                    <option value={2}>2 Guests</option>
                    <option value={3}>3 Guests</option>
                    <option value={4}>4 Guests</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={`block text-[11px] font-bold uppercase mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  data-testid="input-guest-email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="e.g. vikram@example.com"
                  className={`w-full min-h-[42px] rounded-xl border px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white'
                  }`}
                />
              </div>

              {/* ID Document Details for Reception Desk Approval */}
              <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Icons.Shield className="w-4 h-4 text-amber-500" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    ID Document for Reception Verification *
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={`block text-[10px] font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Document Type
                    </label>
                    <select
                      data-testid="select-doc-type"
                      value={documentType}
                      onChange={(e) => setDocumentType(e.target.value)}
                      className={`w-full min-h-[40px] rounded-xl border px-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                        isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="AADHAAR">Aadhaar Card</option>
                      <option value="PASSPORT">Passport</option>
                      <option value="DRIVING_LICENSE">Driving License</option>
                      <option value="VOTER_ID">Voter ID</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-[10px] font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Document / ID Number *
                    </label>
                    <input
                      type="text"
                      required
                      data-testid="input-doc-number"
                      value={documentNumber}
                      onChange={(e) => setDocumentNumber(e.target.value)}
                      placeholder="e.g. 5432-8765-1234"
                      className={`w-full min-h-[40px] rounded-xl border px-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                        isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  Front Desk reception will review your document to approve room check-in and issue the digital keycard.
                </p>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmittingBooking}
                data-testid="submit-reception-docs-btn"
                className="min-h-[46px] rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition active:scale-98 disabled:opacity-50 mt-1"
              >
                {isSubmittingBooking ? (
                  <span>Submitting Documents to Reception...</span>
                ) : (
                  <>
                    <Icons.Check className="w-4 h-4 text-white" />
                    <span>Submit Documents to Reception</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DIGITAL BOOKING VOUCHER MODAL (WHEN APPROVED)            */}
      {/* ======================================================== */}
      {bookingConfirmation && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in"
        >
          <div
            className={`w-full max-w-sm rounded-2xl border p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-center ${
              isDark ? 'border-amber-500/40 bg-[#0d1424] text-white' : 'border-amber-300 bg-white text-slate-900'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500 text-emerald-500 flex items-center justify-center mx-auto shadow-md">
              <Icons.Check className="w-6 h-6 text-emerald-500" />
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Reception Verified & Keycard Active
              </span>
              <h3 className="text-lg font-black mt-0.5">Room {bookingConfirmation.roomNumber}</h3>
              <p className="text-xs text-slate-500 font-semibold">{bookingConfirmation.roomTypeName}</p>
            </div>

            {/* Voucher Reference Box */}
            <div
              className={`p-3.5 rounded-xl border text-left space-y-2 text-xs ${
                isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-[10px] uppercase font-bold">Booking Ref:</span>
                <span className="font-mono font-black text-amber-600 dark:text-amber-400">
                  {bookingConfirmation.bookingNumber}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-[10px] uppercase font-bold">Primary Guest:</span>
                <span className="font-bold">{bookingConfirmation.guestName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-[10px] uppercase font-bold">Stay Dates:</span>
                <span className="font-medium text-[11px]">
                  {bookingConfirmation.checkInDate} ➔ {bookingConfirmation.checkOutDate} ({bookingConfirmation.nights} nt)
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-200 dark:border-slate-800 pt-1.5">
                <span className="text-slate-500 text-[10px] uppercase font-bold">Total Tariff:</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400">
                  ₹{bookingConfirmation.grandTotal.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between items-center bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 text-[11px]">
                <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Icons.Wifi className="w-3.5 h-3.5" />
                  <span>Hotel Wi-Fi:</span>
                </span>
                <div className="text-right">
                  <span className="block font-bold">{bookingConfirmation.wifiSsid || selectedHotel?.wifiSsid || 'TajGateway_HighSpeed'}</span>
                  <span className="block font-mono text-[10px] text-amber-700 dark:text-amber-300">
                    Pass: {bookingConfirmation.wifiPassword || selectedHotel?.wifiPassword || 'SpiceGuest@2026'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                data-testid="voucher-order-food-btn"
                onClick={() => {
                  setBookingConfirmation(null);
                  launchResidentPortal(
                    bookingConfirmation.roomNumber,
                    selectedHotel,
                    bookingConfirmation.sessionToken,
                    'DINING'
                  );
                }}
                className="min-h-[44px] rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition active:scale-98"
              >
                <Icons.Utensils className="w-4 h-4 text-slate-950" />
                <span>Order Food to Room {bookingConfirmation.roomNumber}</span>
              </button>

              <button
                type="button"
                data-testid="voucher-open-resident-btn"
                onClick={() => {
                  setBookingConfirmation(null);
                  launchResidentPortal(
                    bookingConfirmation.roomNumber,
                    selectedHotel,
                    bookingConfirmation.sessionToken,
                    'HOME'
                  );
                }}
                className={`min-h-[42px] rounded-xl border font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition ${
                  isDark
                    ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                    : 'border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200'
                }`}
              >
                <Icons.Key className="w-4 h-4" />
                <span>Room Services & Digital Key</span>
              </button>

              <button
                type="button"
                data-testid="voucher-close-btn"
                onClick={() => setBookingConfirmation(null)}
                className={`min-h-[38px] rounded-xl border font-semibold text-xs transition ${
                  isDark ? 'border-slate-800 bg-slate-900/60 text-slate-400' : 'border-slate-200 bg-white text-slate-500'
                }`}
              >
                Close Voucher
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* HOTEL SELECTION MODAL                                    */}
      {/* ======================================================== */}
      {isHotelModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in"
        >
          <div
            className={`w-full max-w-sm rounded-2xl border p-5 shadow-2xl flex flex-col gap-3.5 max-h-[80vh] ${
              isDark ? 'border-slate-800 bg-[#0d1424] text-white' : 'border-slate-200 bg-white text-slate-900'
            }`}
          >
            <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <h3 className="text-sm font-black">Select Hotel Property</h3>
              <button
                type="button"
                onClick={() => setIsHotelModalOpen(false)}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                  isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                ✕
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                value={hotelSearch}
                onChange={(e) => setHotelSearch(e.target.value)}
                placeholder="Search hotel or city..."
                className={`w-full min-h-[40px] rounded-xl border pl-9 pr-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white'
                }`}
              />
              <Icons.Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-0.5">
              {filteredHotels.map((h) => {
                const isSelected = selectedHotel?.id === h.id;
                const cover = h.coverImageUrl || FALLBACK_HOTEL_COVER;
                const logo = h.logoUrl || FALLBACK_HOTEL_LOGO;

                return (
                  <button
                    key={h.id}
                    type="button"
                    data-testid={`hotel-select-option-${h.id}`}
                    onClick={() => {
                      setSelectedHotel(h);
                      setIsHotelModalOpen(false);
                      setValidationError(null);
                      setStayVerifyError(null);
                    }}
                    className={`rounded-xl border text-left transition overflow-hidden flex flex-col ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 shadow-sm'
                        : isDark
                        ? 'border-slate-800 bg-slate-900/60 hover:bg-slate-800/80'
                        : 'border-slate-200 bg-white hover:bg-slate-50 shadow-sm'
                    }`}
                  >
                    <div className="h-16 w-full relative overflow-hidden bg-slate-950">
                      <img
                        src={cover}
                        alt=""
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = FALLBACK_HOTEL_COVER;
                        }}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                      <div className="absolute top-2 right-2">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-black/60 text-white border border-white/20 flex items-center gap-1">
                          <Icons.Location className="w-2.5 h-2.5 text-amber-400" />
                          <span>{h.city || 'India'}</span>
                        </span>
                      </div>
                      <div className="absolute bottom-1.5 left-2.5 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg overflow-hidden border border-white shadow bg-white shrink-0">
                          <img
                            src={logo}
                            alt=""
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = FALLBACK_HOTEL_LOGO;
                            }}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-xs font-black text-white truncate max-w-[200px] drop-shadow">
                          {h.name}
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 flex items-center justify-between">
                      <p className={`text-[10px] truncate max-w-[220px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {h.tagline || 'SpiceHub Hospitality Property'}
                      </p>
                      {isSelected ? (
                        <span className="text-[10px] font-black text-amber-500 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30 flex items-center gap-1">
                          <Icons.Check className="w-3 h-3 text-amber-500" />
                          <span>ACTIVE</span>
                        </span>
                      ) : (
                        <Icons.ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
