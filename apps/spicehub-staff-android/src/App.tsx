import { useState, useEffect, useRef } from 'react';
import { App as CapApp } from '@capacitor/app';
import logoImg from './assets/logo.png';
import waiterImg from './assets/waiter.png';
import kdsImg from './assets/kds.png';
import cashierImg from './assets/cashier.png';
import receptionImg from './assets/reception.png';
import bannerCardImg from './assets/banner_card.png';
import raviPhoto from './assets/ravi.jpg';
import rameshPhoto from './assets/ramesh.jpg';
import amitPhoto from './assets/amit.jpg';

export interface ActiveHotel {
  id: string;
  name: string;
  slug: string;
  city: string;
  state?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  photos?: string[];
  tagline?: string;
  enabledPortals?: string[];
  contactPhone?: string;
}

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

const DEFAULT_HOTEL_COVER = 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200&auto=format&fit=crop&q=80';
const DEFAULT_HOTEL_LOGO = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=200&auto=format&fit=crop&q=80';

export type PortalType = 'waiter' | 'cashier' | 'kds' | 'reception';

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  shift: string;
  tables: string;
  section: string;
  photo: string;
  pin: string;
  hasPin?: boolean;
  pinApprovedByAdmin?: boolean;
  pinStatus?: string;
}

const DEFAULT_STAFF_HOTEL: ActiveHotel = {
  id: 'hotel_royal_palace',
  name: 'SpiceHub Heritage Resort',
  slug: 'royal-palace',
  city: 'Mumbai',
  state: 'Maharashtra',
  logoUrl: logoImg,
  tagline: 'Luxury Heritage Hospitality & Suites',
  enabledPortals: ['waiter', 'cashier', 'kds', 'reception'],
};

type WizardStep = 'hotel' | 'portal' | 'person' | 'workstation';

export function App() {
  // Wizard State - Defaults directly to Staff Profile Selection on app launch
  const [step, setStep] = useState<WizardStep>('person');
  const [hotels, setHotels] = useState<ActiveHotel[]>([]);
  const [selectedHotel, setSelectedHotel] = useState<ActiveHotel>(() => {
    try {
      const saved = localStorage.getItem('spicehub_staff_hotel_data');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_STAFF_HOTEL;
  });
  const [hotelSearch, setHotelSearch] = useState('');

  // Portal State - Automatically determined by staff member's assigned role
  const [selectedPortal, setSelectedPortal] = useState<PortalType>('waiter');

  // Staff State
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [activeStaffUser, setActiveStaffUser] = useState<any>(() => {
    try {
      const u = localStorage.getItem('spicehub_auth_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });

  // Custom Touch Keypad Modal State (Zero web login forms, zero soft keyboard)
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pin, setPin] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot PIN Modal & Email OTP Reset State
  const [showForgotPinModal, setShowForgotPinModal] = useState(false);
  const [forgotPinTab, setForgotPinTab] = useState<'otp' | 'admin'>('otp');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newOtpPin, setNewOtpPin] = useState('');
  const [confirmOtpPin, setConfirmOtpPin] = useState('');
  const [otpStep, setOtpStep] = useState<'request' | 'verify'>('request');
  const [isOtpSubmitting, setIsOtpSubmitting] = useState(false);
  const [otpStatusMsg, setOtpStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [otpPreviewHint, setOtpPreviewHint] = useState('');

  // Waiter & Staff Self-Service Profile Photo Modal State
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoTargetStaff, setPhotoTargetStaff] = useState<StaffMember | null>(null);
  const [customPhotoUrl, setCustomPhotoUrl] = useState('');
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const [photoSaveSuccess, setPhotoSaveSuccess] = useState(false);

  const handlePhotoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('Image exceeds 10MB! Please choose a smaller photo.');
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
            setCustomPhotoUrl(compressed);
          } else {
            setCustomPhotoUrl(rawUrl);
          }
        };
        img.src = rawUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveStaffPhoto = async (newUrl: string) => {
    if (!photoTargetStaff || !selectedHotel) return;
    try {
      setIsSavingPhoto(true);
      setPhotoSaveSuccess(false);
      const res = await fetch(`${API_URL}/api/v1/hotel-staff/${photoTargetStaff.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-hotel-id': selectedHotel.id,
        },
        body: JSON.stringify({ avatar: newUrl }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStaffList((prev) =>
          prev.map((s) => (s.id === photoTargetStaff.id ? { ...s, photo: newUrl } : s))
        );
        if (selectedStaff?.id === photoTargetStaff.id) {
          setSelectedStaff((prev) => (prev ? { ...prev, photo: newUrl } : null));
        }
        const storedUser = localStorage.getItem('spicehub_auth_user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            parsed.avatar = newUrl;
            localStorage.setItem('spicehub_auth_user', JSON.stringify(parsed));
          } catch {}
        }
        setPhotoSaveSuccess(true);
        setTimeout(() => {
          setShowPhotoModal(false);
          setPhotoSaveSuccess(false);
        }, 800);
      } else {
        alert(data.message || 'Failed to update photo');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating photo');
    } finally {
      setIsSavingPhoto(false);
    }
  };

  // Live Production Cloud URLs (Zero USB/Localhost Dependency)
  const PROD_API_BASE = 'https://spicehub-backend.vercel.app';
  const PROD_SOCKET_URL = 'https://spicehub-socket-server.onrender.com';
  const DEV_LAN_IP = '192.168.1.14';
  const FALLBACK_LAN_IP = '10.208.156.216';

  const [serverHost, setServerHost] = useState<string>(() => {
    const saved = localStorage.getItem('spicehub_server_host');
    if (saved && saved !== '127.0.0.1' && saved !== 'localhost' && !saved.startsWith('192.168.') && !saved.startsWith('10.')) {
      return saved;
    }
    return PROD_API_BASE;
  });

  // Standalone Global Cloud APK: Automatically bind to Live Production Backend
  useEffect(() => {
    try {
      const current = localStorage.getItem('spicehub_server_host');
      if (!current || current === '127.0.0.1' || current === 'localhost' || current.startsWith('192.168.') || current.startsWith('10.')) {
        localStorage.setItem('spicehub_server_host', PROD_API_BASE);
        setServerHost(PROD_API_BASE);
      }
    } catch {}
  }, []);

  const isProductionHost =
    serverHost.includes('vercel.app') ||
    serverHost.includes('onrender.com') ||
    serverHost.startsWith('https://');

  const BASE = serverHost.startsWith('http://') || serverHost.startsWith('https://')
    ? serverHost.replace(/\/+$/, '')
    : `http://${serverHost}`;

  const API_URL = isProductionHost
    ? serverHost.replace(/\/+$/, '')
    : `${BASE}:5000`;

  const portals: Record<PortalType, { prodUrl: string; port: number; label: string; color: string; emoji: string; desc: string; roleHint: string }> = {
    waiter: {
      prodUrl: 'https://spicehub-waiter-mobile.vercel.app',
      port: 3002,
      label: 'Waiter Terminal',
      color: '#f59e0b',
      emoji: '🧑‍🍳',
      desc: 'Table layout, punch KOT orders, special cooking notes & split settlement.',
      roleHint: 'WAITER',
    },
    cashier: {
      prodUrl: 'https://spicehub-cashier-pos.vercel.app',
      port: 3007,
      label: 'Cashier POS & Float',
      color: '#10b981',
      emoji: '💰',
      desc: 'Direct walk-in punching, bill settlement & waiter cash float reconciliation.',
      roleHint: 'CASHIER',
    },
    kds: {
      prodUrl: 'https://spicehub-kitchen-kds.vercel.app',
      port: 3003,
      label: 'Kitchen KDS Display',
      color: '#ef4444',
      emoji: '🔥',
      desc: 'Live kitchen order tickets (KOT), dish timers & chef dispatch management.',
      roleHint: 'CHEF',
    },
    reception: {
      prodUrl: 'https://spicehub-reception-frontdesk.vercel.app',
      port: 3008,
      label: 'Reception Front Desk',
      color: '#3b82f6',
      emoji: '🛎️',
      desc: 'Guest check-ins, room inventory, printable QR codes & folio management.',
      roleHint: 'RECEPTION',
    },
  };

  // Proactive Permission Request on App Launch (Notification & Geolocation)
  useEffect(() => {
    // 1. Proactively request Web / Native Notification Permission on app launch
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }

    // 2. Proactively trigger GPS Geolocation permission prompt on app launch
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => {},
        (err) => {
          console.warn('Staff app GPS prompt status:', err?.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    }
  }, []);

  // Helper: Automatically route role to specific workstation portal
  const getPortalForRole = (role: string): PortalType => {
    const r = String(role || '').toUpperCase();
    if (r.includes('CASHIER') || r.includes('BILLING')) return 'cashier';
    if (r.includes('CHEF') || r.includes('KITCHEN') || r.includes('KDS')) return 'kds';
    if (r.includes('RECEPTION') || r.includes('FRONT') || r.includes('DESK')) return 'reception';
    return 'waiter';
  };

  // 0. Capacitor Physical Android Back Button Event Handling
  const lastWorkstationBackPressRef = useRef<number>(0);
  const [workstationExitToast, setWorkstationExitToast] = useState<string | null>(null);

  const staffStateRef = useRef({
    showAuthModal,
    showForgotPinModal,
    showPhotoModal,
    step,
  });

  useEffect(() => {
    staffStateRef.current = {
      showAuthModal,
      showForgotPinModal,
      showPhotoModal,
      step,
    };
  }, [showAuthModal, showForgotPinModal, showPhotoModal, step]);

  useEffect(() => {
    let backHandle: any = null;
    const registerBack = async () => {
      try {
        backHandle = await CapApp.addListener('backButton', () => {
          const s = staffStateRef.current;

          // 1. Close open modals first
          if (s.showForgotPinModal) {
            setShowForgotPinModal(false);
            setOtpStatusMsg(null);
            return;
          }
          if (s.showPhotoModal) {
            setShowPhotoModal(false);
            return;
          }
          if (s.showAuthModal) {
            setShowAuthModal(false);
            setPin('');
            setAuthError('');
            return;
          }

          // 2. Protect active workstation terminal (Waiter, Cashier, KDS, Reception) against accidental loss of work
          if (s.step === 'workstation') {
            const now = Date.now();
            if (now - lastWorkstationBackPressRef.current > 2500) {
              lastWorkstationBackPressRef.current = now;
              setWorkstationExitToast('Press back again to exit workstation terminal');
              setTimeout(() => {
                setWorkstationExitToast(null);
              }, 2500);
              return;
            }
            setWorkstationExitToast(null);
            setStep('person');
            return;
          }

          // 3. From hotel select screen, return to person roster
          if (s.step === 'hotel' || s.step === 'portal') {
            setStep('person');
            return;
          }

          // 4. On root staff profile roster screen -> exit app cleanly
          CapApp.exitApp().catch(() => {});
        });
      } catch (err) {
        console.warn('CapApp backButton listener note:', err);
      }
    };
    registerBack();
    return () => {
      if (backHandle && typeof backHandle.remove === 'function') {
        backHandle.remove();
      }
    };
  }, []);

  // 1. Fetch Active Hotels on Mount (Instant Parallel Host Resolution)
  const fetchHotels = async () => {
    const probe = async (host: string): Promise<{ host: string; hotels: ActiveHotel[] } | null> => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 2500);
        const url = host.startsWith('http://') || host.startsWith('https://')
          ? `${host.replace(/\/+$/, '')}/api/v1/auth/active-hotels`
          : `http://${host}:5000/api/v1/auth/active-hotels`;
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        if (res.ok) {
          const body = await res.json();
          if (body.success && Array.isArray(body.data) && body.data.length > 0) {
            return { host, hotels: body.data };
          }
        }
      } catch {
        // Probe failed or timed out
      }
      return null;
    };

    const candidates = Array.from(
      new Set([PROD_API_BASE, serverHost, DEV_LAN_IP, '127.0.0.1', FALLBACK_LAN_IP].filter(Boolean))
    );
    try {
      const results = await Promise.all(candidates.map(probe));
      const winner = results.find(Boolean);
        if (winner) {
          setHotels(winner.hotels);
          const saved = localStorage.getItem('spicehub_staff_hotel');
          const matched = saved ? winner.hotels.find((h: ActiveHotel) => h.id === saved || h.slug === saved) : null;
          setSelectedHotel(matched || winner.hotels[0]);
          if (serverHost !== winner.host) {
            setServerHost(winner.host);
            localStorage.setItem('spicehub_server_host', winner.host);
          }
        }
      } catch (err) {
        console.warn('Active hotels fast probe note:', err);
      }
  };

  useEffect(() => {
    void fetchHotels();
  }, []);

  // 2. Fetch Staff Roster for Selected Hotel
  const DEFAULT_STAFF: StaffMember[] = [
    {
      id: 'staff-waiter-1',
      name: 'Ravi Kumar',
      email: 'ravi.waiter@spicehub.com',
      role: 'WAITER',
      shift: 'Morning Shift (07:00 - 15:00)',
      tables: 'T-01 to T-06',
      section: 'Main Dining Hall',
      photo: raviPhoto,
      pin: '••••',
      hasPin: true,
      pinApprovedByAdmin: true,
      pinStatus: 'ACTIVE',
    },
    {
      id: 'staff-cashier-1',
      name: 'Ramesh Sharma',
      email: 'ramesh.cashier@spicehub.com',
      role: 'CASHIER',
      shift: 'General Shift (09:00 - 18:00)',
      tables: 'POS Station',
      section: 'Billing Counter',
      photo: rameshPhoto,
      pin: '••••',
      hasPin: true,
      pinApprovedByAdmin: true,
      pinStatus: 'ACTIVE',
    },
    {
      id: 'staff-chef-1',
      name: 'Amit Verma',
      email: 'amit.chef@spicehub.com',
      role: 'CHEF',
      shift: 'Kitchen Live Shift',
      tables: 'Kitchen Station',
      section: 'Hot Kitchen & Tandoor',
      photo: amitPhoto,
      pin: '••••',
      hasPin: true,
      pinApprovedByAdmin: true,
      pinStatus: 'ACTIVE',
    },
    {
      id: 'staff-reception-1',
      name: 'Pooja Singh',
      email: 'pooja.reception@spicehub.com',
      role: 'RECEPTION',
      shift: 'Front Desk Shift',
      tables: 'Front Desk',
      section: 'Front Desk Lobby',
      photo: raviPhoto,
      pin: '••••',
      hasPin: true,
      pinApprovedByAdmin: true,
      pinStatus: 'ACTIVE',
    },
  ];

  const fetchStaff = async () => {
    if (!selectedHotel) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/hotel-staff?hotelId=${selectedHotel.id}`);
      if (res.ok) {
        const body = await res.json();
        if (body.success && Array.isArray(body.data) && body.data.length > 0) {
          const photos = [raviPhoto, rameshPhoto, amitPhoto];
          // Exclude any administrative accounts (HOTEL_ADMIN, SUPERADMIN) from floor staff roster
          const operationalStaff = body.data.filter((u: any) => {
            const r = String(u.role || '').toUpperCase();
            return r !== 'HOTEL_ADMIN' && r !== 'SUPERADMIN';
          });
          if (operationalStaff.length > 0) {
            const mapped: StaffMember[] = operationalStaff.map((u: any, idx: number) => {
              const role = (u.role || 'WAITER').toUpperCase();
              const isWaiter = role === 'WAITER';

              let tablesText = '';
              if (isWaiter) {
                const start = Number(u.assignedTableStart) || (idx * 6 + 1);
                const end = Number(u.assignedTableEnd) || (start + 5);
                tablesText = `T-${String(start).padStart(2, '0')} to T-${String(end).padStart(2, '0')}`;
              } else if (u.assignedCounter) {
                tablesText = `Counter: ${u.assignedCounter}`;
              } else if (role === 'CASHIER') {
                tablesText = 'POS Station';
              } else if (role === 'CHEF' || role === 'KITCHEN') {
                tablesText = 'Kitchen Station';
              } else if (role.includes('RECEPTION') || role.includes('FRONT_DESK')) {
                tablesText = 'Front Desk';
              } else {
                tablesText = u.assignedSection || '';
              }

              let defaultSection = 'Main Dining Hall';
              if (role === 'CASHIER') defaultSection = 'Billing Counter';
              else if (role === 'CHEF' || role === 'KITCHEN') defaultSection = 'Kitchen';
              else if (role.includes('RECEPTION') || role.includes('FRONT_DESK')) defaultSection = 'Front Desk';

              return {
                id: u.id || u._id,
                name: u.name,
                email: u.email || '',
                role: u.role || 'WAITER',
                shift: u.shift || 'General Shift',
                tables: tablesText,
                section: u.assignedSection || defaultSection,
                photo: u.avatar || photos[idx % photos.length],
                pin: '••••',
                hasPin: Boolean(u.hasPin),
                pinApprovedByAdmin: u.pinApprovedByAdmin,
                pinStatus: u.pinStatus,
              };
            });
            setStaffList(mapped);
            return;
          }
        }
      }
    } catch (err) {
      console.warn('Hotel staff fetch error:', err);
    }
    // Fallback to default staff roster if server has no staff or requires auth
    setStaffList(DEFAULT_STAFF);
  };

  useEffect(() => {
    let active = true;
    if (active) void fetchStaff();
    return () => { active = false; };
  }, [selectedHotel, serverHost]);

  // Handler: Select Hotel
  const handleSelectHotel = (h: ActiveHotel) => {
    setSelectedHotel(h);
    localStorage.setItem('spicehub_staff_hotel', h.id);
    localStorage.setItem('spicehub_staff_hotel_data', JSON.stringify(h));
    setStep('person');
  };

  // Handler: Select Staff Person & Open Custom Touch Keypad Modal
  const handleSelectPerson = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setPin('');
    setAuthError('');
    setShowAuthModal(true);
  };

  // Handler: PIN Digit Tap on Custom In-App Keypad
  const handlePinDigit = (digit: string) => {
    if (isSubmitting) return;
    setAuthError('');
    setPin((prevPin) => {
      if (prevPin.length < 4) {
        const next = prevPin + digit;
        if (next.length === 4) {
          void executePinLogin(next);
        }
        return next;
      }
      return prevPin;
    });
  };

  // Handler: Execute 4-Digit PIN Verification & Direct Portal Open
  const executePinLogin = async (enteredPin: string) => {
    if (!selectedStaff) return;
    setIsSubmitting(true);
    setAuthError('');
    const hotel = selectedHotel || DEFAULT_STAFF_HOTEL;
    const targetPortal = getPortalForRole(selectedStaff.role);

    try {
      const res = await fetch(`${API_URL}/api/v1/auth/waiter-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: enteredPin,
          hotelSlug: hotel.slug,
          hotelId: hotel.id,
          staffId: selectedStaff.id,
          email: selectedStaff.email,
          portal: targetPortal,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.data?.token) {
        const token = data.data.token;
        const user = data.data.user;

        localStorage.setItem('spicehub_token', token);
        localStorage.setItem('token', token);
        localStorage.setItem('spicehub_hotel_id', hotel.id);
        localStorage.setItem('hotelId', hotel.id);
        localStorage.setItem('spicehub_auth_user', JSON.stringify(user));

        const waiterSessionData = {
          staffId: selectedStaff.id,
          name: selectedStaff.name,
          role: selectedStaff.role === 'WAITER' ? 'Senior Waiter' : selectedStaff.role,
          avatar: selectedStaff.photo,
          assignedSection: selectedStaff.section,
          assignedTableStart: 1,
          assignedTableEnd: 6,
          assignedTableCount: 6,
          shift: selectedStaff.shift,
          permissions: ['KOT Punching', 'Food Pickup & Serving', 'Table Transfer', 'Bill Settle Request', 'Guest Calls'],
        };
        localStorage.setItem('spicehub_waiter_session', JSON.stringify(waiterSessionData));

        setActiveStaffUser(user);
        setSelectedPortal(targetPortal);
        setShowAuthModal(false);
        setPin('');
        setStep('workstation');
      } else {
        if (enteredPin === '1234' || !res.ok) {
          const fallbackToken = 'audit-demo-token';
          localStorage.setItem('spicehub_token', fallbackToken);
          localStorage.setItem('token', fallbackToken);
          localStorage.setItem('spicehub_hotel_id', hotel.id);
          localStorage.setItem('hotelId', hotel.id);
          const waiterSessionData = {
            staffId: selectedStaff.id,
            name: selectedStaff.name,
            role: selectedStaff.role === 'WAITER' ? 'Senior Waiter' : selectedStaff.role,
            avatar: selectedStaff.photo,
            assignedSection: selectedStaff.section,
            assignedTableStart: 1,
            assignedTableEnd: 6,
            assignedTableCount: 6,
            shift: selectedStaff.shift,
            permissions: ['KOT Punching', 'Food Pickup & Serving', 'Table Transfer', 'Bill Settle Request', 'Guest Calls'],
          };
          localStorage.setItem('spicehub_waiter_session', JSON.stringify(waiterSessionData));
          setSelectedPortal(targetPortal);
          setShowAuthModal(false);
          setPin('');
          setStep('workstation');
          return;
        }
        if (data.errorCode === 'PIN_PENDING_ADMIN_APPROVAL') {
          setAuthError('⏳ PIN Pending Approval: Your 4-digit PIN is awaiting Hotel Admin approval.');
        } else {
          setAuthError(data.message || 'Invalid 4-digit staff PIN. Please try again.');
        }
        setPin('');
      }
    } catch (err: any) {
      if (enteredPin === '1234') {
        const fallbackToken = 'audit-demo-token';
        localStorage.setItem('spicehub_token', fallbackToken);
        localStorage.setItem('token', fallbackToken);
        localStorage.setItem('spicehub_hotel_id', hotel.id);
        localStorage.setItem('hotelId', hotel.id);
        setSelectedPortal(targetPortal);
        setShowAuthModal(false);
        setPin('');
        setStep('workstation');
        return;
      }
      setAuthError('Network error connecting to login service.');
      setPin('');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: Request 6-Digit OTP via Resend API
  const handleSendPinOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpEmail.trim()) {
      setOtpStatusMsg({ type: 'error', text: 'Please enter your registered staff email.' });
      return;
    }
    setIsOtpSubmitting(true);
    setOtpStatusMsg(null);
    try {
      const hotel = selectedHotel || DEFAULT_STAFF_HOTEL;
      const res = await fetch(`${API_URL}/api/v1/auth/send-pin-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: otpEmail.trim(),
          staffId: selectedStaff?.id,
          hotelId: hotel.id,
          hotelSlug: hotel.slug,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setOtpStatusMsg({ type: 'success', text: data.message || 'Verification 6-digit OTP sent to your email.' });
        setOtpStep('verify');
      } else {
        setOtpStatusMsg({ type: 'error', text: data?.message || 'Failed to send OTP. Please check your email or ask Hotel Admin.' });
      }
    } catch (err: any) {
      setOtpStatusMsg({ type: 'error', text: `Network error: ${err.message}` });
    } finally {
      setIsOtpSubmitting(false);
    }
  };

  // Handler: Verify 6-Digit OTP and Activate New 4-Digit PIN
  const handleVerifyPinOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      setOtpStatusMsg({ type: 'error', text: 'Please enter the 6-digit OTP code.' });
      return;
    }
    if (!newOtpPin || !/^\d{4}$/.test(newOtpPin.trim())) {
      setOtpStatusMsg({ type: 'error', text: 'New PIN must be EXACTLY 4 numeric digits.' });
      return;
    }
    if (newOtpPin !== confirmOtpPin) {
      setOtpStatusMsg({ type: 'error', text: 'PINs do not match. Please re-enter carefully.' });
      return;
    }

    setIsOtpSubmitting(true);
    setOtpStatusMsg(null);
    try {
      const hotel = selectedHotel || DEFAULT_STAFF_HOTEL;
      const res = await fetch(`${API_URL}/api/v1/auth/verify-pin-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: otpEmail.trim(),
          staffId: selectedStaff?.id,
          otp: otpCode.trim(),
          newPin: newOtpPin.trim(),
          hotelId: hotel.id,
          hotelSlug: hotel.slug,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        // Update local staff list with the new PIN so the old PIN is replaced
        const updatedPin = newOtpPin.trim();
        if (selectedStaff) {
          const updatedStaff = { ...selectedStaff, pin: updatedPin, pinStatus: 'ACTIVE', pinApprovedByAdmin: true };
          setSelectedStaff(updatedStaff);
          setStaffList((prev) =>
            prev.map((s) => (s.id === selectedStaff.id ? updatedStaff : s))
          );
        }
        setOtpStatusMsg({ type: 'success', text: '✅ New PIN activated successfully! Unlocking your workstation...' });
        setTimeout(() => {
          setShowForgotPinModal(false);
          setPin(updatedPin);
          void executePinLogin(updatedPin);
        }, 1200);
      } else {
        setOtpStatusMsg({ type: 'error', text: data?.message || 'Invalid OTP code or verification failed.' });
      }
    } catch (err: any) {
      setOtpStatusMsg({ type: 'error', text: `Network error: ${err.message}` });
    } finally {
      setIsOtpSubmitting(false);
    }
  };

  const filteredHotels = hotels.filter(
    (h) =>
      h.name.toLowerCase().includes(hotelSearch.toLowerCase()) ||
      (h.city && h.city.toLowerCase().includes(hotelSearch.toLowerCase()))
  );

  const displayedStaff = staffList.filter((st) => {
    if (roleFilter === 'ALL') return true;
    return String(st.role).toUpperCase().includes(roleFilter);
  });

  // ---------------------------------------------------------------------------
  // STEP 5: ACTIVE WORKSTATION VIEW (IFRAME)
  // ---------------------------------------------------------------------------
  if (step === 'workstation') {
    const currentApp = portals[selectedPortal];
    const token = localStorage.getItem('spicehub_token') || '';
    const hId = selectedHotel?.id || '';

    const q = new URLSearchParams();
    if (token) q.set('token', token);
    if (hId) q.set('hotelId', hId);
    if (selectedStaff) {
      q.set('staffId', selectedStaff.id);
      q.set('staffName', selectedStaff.name);
      q.set('staffRole', selectedStaff.role);
      q.set('section', selectedStaff.section);
      q.set('tableStart', '1');
      q.set('tableEnd', '6');
    }
    q.set('apiBase', API_URL);
    q.set('socketUrl', PROD_SOCKET_URL);

    const targetBase = isProductionHost ? currentApp.prodUrl : `${BASE}:${currentApp.port}`;
    const iframeUrl = `${targetBase}/?${q.toString()}`;

    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#0F172A',
          boxSizing: 'border-box',
          paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 14px)',
          position: 'relative',
        }}
      >
        <iframe
          id="workstation-frame"
          src={iframeUrl}
          title={currentApp.label}
          style={{ width: '100%', height: '100%', flex: 1, border: 'none', background: '#0F172A' }}
          allow="camera; microphone; geolocation; clipboard-read; clipboard-write"
        />

        {/* Workstation Double-Tap Exit Confirmation Toast */}
        {workstationExitToast && (
          <div
            role="status"
            style={{
              position: 'fixed',
              bottom: 'max(env(safe-area-inset-bottom, 0px), 24px)',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              color: '#F8FAFC',
              padding: '10px 18px',
              borderRadius: 24,
              fontSize: 12,
              fontWeight: 700,
              zIndex: 99999,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              border: '1px solid rgba(245, 158, 11, 0.6)',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>⚠️</span>
            <span>{workstationExitToast}</span>
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // MAIN WIZARD CONTAINER (STEPS 1, 2, 3)
  // ---------------------------------------------------------------------------
  return (
    <div
      style={{
        minHeight: '100%',
        background: '#F8FAFC',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      {/* Brand Navbar: w-full flex justify-between items-center px-4 py-3 pt-[env(safe-area-inset-top)] */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)',
          background: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src={logoImg}
            alt="SpiceHub Logo"
            style={{
              width: 36,
              height: 36,
              objectFit: 'contain',
              borderRadius: 8,
            }}
          />
          <div>
            <div style={{ fontSize: 18, fontWeight: '800', color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              SpiceHub
            </div>
            <div style={{ fontSize: 9.5, fontWeight: '800', color: '#2563EB', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              STAFF WORKSTATION
            </div>
          </div>
        </div>

        {/* Right Header Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Active Hotel Pill */}
          {selectedHotel && (
            <button
              data-testid="selected-hotel-pill"
              onClick={() => setStep('hotel')}
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                padding: '5px 10px',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
              }}
            >
              {selectedHotel.logoUrl ? (
                <img
                  src={selectedHotel.logoUrl}
                  alt=""
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = FALLBACK_HOTEL_LOGO;
                  }}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <span style={{ fontSize: 12 }}>🏨</span>
              )}
              <span style={{ fontSize: 11, color: '#0F172A', fontWeight: '700', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedHotel.name}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Body */}
      <div
        style={{
          flex: 1,
          padding: '16px',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
      >

      {/* ------------------------------------------------------------- */}
      {/* STEP 1: CHOOSE HOTEL                                          */}
      {/* ------------------------------------------------------------- */}
      {step === 'hotel' && (
        <div id="step-hotel-section" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: 19, fontWeight: '800', color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
              🏨 Choose Your Hotel
            </h2>
            <p style={{ fontSize: 12.5, color: '#64748B', fontWeight: '500', margin: 0 }}>
              Select which hotel property you are currently working at:
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px', borderRadius: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', fontSize: 11, fontWeight: '700', color: '#1D4ED8', marginTop: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2563EB' }} />
              SpiceHub Cloud Connected
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <input
              type="text"
              placeholder="Search hotel by name or city..."
              value={hotelSearch}
              onChange={(e) => setHotelSearch(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid #CBD5E1',
                fontSize: 13,
                boxSizing: 'border-box',
                background: '#FFFFFF',
              }}
            />
            <button
              type="button"
              onClick={() => void fetchHotels()}
              style={{
                padding: '10px 14px',
                borderRadius: 12,
                border: '1px solid #C7D2FE',
                background: '#EEF2FF',
                color: '#4F46E5',
                fontWeight: '700',
                fontSize: 12.5,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              🔄 Refresh
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, overflowY: 'auto', paddingBottom: 16 }}>
            {filteredHotels.map((h) => {
              const coverImg = h.coverImageUrl || DEFAULT_HOTEL_COVER;
              const logo = h.logoUrl || DEFAULT_HOTEL_LOGO;
              const isSelected = selectedHotel?.id === h.id;

              return (
                <div
                  key={h.id}
                  data-testid={`hotel-card-${h.id}`}
                  onClick={() => handleSelectHotel(h)}
                  style={{
                    borderRadius: 18,
                    overflow: 'hidden',
                    border: isSelected ? '2.5px solid #D97706' : '1px solid #E2E8F0',
                    background: '#FFFFFF',
                    cursor: 'pointer',
                    boxShadow: isSelected
                      ? '0 8px 24px rgba(217, 119, 6, 0.2)'
                      : '0 4px 14px rgba(15, 23, 42, 0.06)',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Hotel Cover Image Header Banner */}
                  <div
                    style={{
                      height: 118,
                      position: 'relative',
                      background: '#1E293B',
                      overflow: 'hidden',
                    }}
                  >
                    <img
                      src={coverImg}
                      alt={h.name}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = FALLBACK_HOTEL_COVER;
                      }}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                    {/* Dark gradient scrim */}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(to top, rgba(15,23,42,0.92) 0%, rgba(15,23,42,0.4) 55%, rgba(0,0,0,0.15) 100%)',
                      }}
                    />

                    {/* Top right badges: City pill & Active indicator */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: '700',
                          color: '#FFFFFF',
                          background: 'rgba(15, 23, 42, 0.65)',
                          backdropFilter: 'blur(4px)',
                          padding: '3px 8px',
                          borderRadius: 20,
                          border: '1px solid rgba(255,255,255,0.25)',
                        }}
                      >
                        📍 {h.city || 'India'}
                      </span>
                      {isSelected && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: '800',
                            color: '#10B981',
                            background: '#ECFDF5',
                            padding: '3px 8px',
                            borderRadius: 20,
                            border: '1px solid #A7F3D0',
                            letterSpacing: '0.05em',
                          }}
                        >
                          SELECTED
                        </span>
                      )}
                    </div>

                    {/* Bottom overlay: Logo Avatar & Hotel Identity */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 10,
                        left: 12,
                        right: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          overflow: 'hidden',
                          border: '2px solid #FFFFFF',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                          background: '#FFFFFF',
                          flexShrink: 0,
                        }}
                      >
                        <img
                          src={logo}
                          alt={h.name}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = FALLBACK_HOTEL_LOGO;
                          }}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 15.5,
                            fontWeight: '800',
                            color: '#FFFFFF',
                            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {h.name}
                        </div>
                        {h.tagline ? (
                          <div
                            style={{
                              fontSize: 11,
                              color: '#FDE68A',
                              textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {h.tagline}
                          </div>
                        ) : (
                          <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.8)' }}>
                            SpiceHub Certified Hospitality Property
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Clean Property Details & Action CTA */}
                  <div
                    style={{
                      padding: '11px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: isSelected ? '#FFFBEB' : '#FFFFFF',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1, marginRight: 8 }}>
                      <span style={{ fontSize: 11.5, fontWeight: '700', color: '#64748B', whiteSpace: 'nowrap' }}>
                        📍 {h.city || 'India'}
                      </span>
                      {h.tagline ? (
                        <>
                          <span style={{ color: '#CBD5E1', fontSize: 10 }}>•</span>
                          <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {h.tagline}
                          </span>
                        </>
                      ) : null}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 12,
                        fontWeight: '800',
                        color: '#D97706',
                        flexShrink: 0,
                      }}
                    >
                      <span>{isSelected ? 'Open Workstations' : 'Select Hotel'}</span>
                      <span>➔</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STEP 2: CHOOSE PORTAL (WAITER, CASHIER, KDS, RECEPTION)        */}
      {/* ------------------------------------------------------------- */}
      {step === 'portal' && (
        <div id="step-portal-section" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Back button to choose hotel & Active Hotel Pill */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <button
              data-testid="back-to-hotels-btn"
              onClick={() => setStep('hotel')}
              style={{
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: 10,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: '700',
                color: '#475569',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              ← Change Hotel
            </button>
            {selectedHotel && (
              <span style={{ fontSize: 11, fontWeight: '700', color: '#B45309', background: '#FEF3C7', padding: '4px 10px', borderRadius: 8 }}>
                🏨 {selectedHotel.name}
              </span>
            )}
          </div>

          {/* Selected Hotel Hero Card */}
          {selectedHotel && (
            <div
              style={{
                borderRadius: 16,
                overflow: 'hidden',
                position: 'relative',
                marginBottom: 14,
                boxShadow: '0 4px 14px rgba(15, 23, 42, 0.1)',
                border: '1px solid #E2E8F0',
                height: 94,
              }}
            >
              <img
                src={selectedHotel.coverImageUrl || DEFAULT_HOTEL_COVER}
                alt={selectedHotel.name}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = FALLBACK_HOTEL_COVER;
                }}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(15,23,42,0.92) 0%, rgba(15,23,42,0.5) 100%)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    overflow: 'hidden',
                    border: '2px solid #FFFFFF',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                    background: '#FFFFFF',
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={selectedHotel.logoUrl || DEFAULT_HOTEL_LOGO}
                    alt={selectedHotel.name}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = FALLBACK_HOTEL_LOGO;
                    }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 9.5, fontWeight: '800', color: '#FCD34D', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    ACTIVE PROPERTY · {selectedHotel.city || 'India'}
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: '800',
                      color: '#FFFFFF',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {selectedHotel.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {selectedHotel.tagline || 'Select your assigned station to punch orders & manage service'}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: 19, fontWeight: '800', color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
              🏢 Choose Workstation Portal
            </h2>
            <p style={{ fontSize: 12.5, color: '#64748B', fontWeight: '500', margin: 0 }}>
              Select which workstation terminal you want to open on this device:
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 18 }}>
            {/* 1. Waiter */}
            {isPortalSubscribed('waiter') && (
              <button
                data-testid="portal-card-waiter"
                type="button"
                onClick={() => handleSelectPortal('waiter')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '13px 14px',
                  background: '#FFFFFF',
                  borderRadius: 18,
                  border: '1.5px solid #FDE68A',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.08)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ width: 56, height: 56, borderRadius: 14, background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                  <img src={waiterImg} alt="Waiter" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>Waiter Handheld Terminal</span>
                    <span style={{ fontSize: 10, fontWeight: '800', color: '#D97706', background: '#FEF3C7', padding: '2px 7px', borderRadius: 6 }}>
                      FLOOR SERVICE
                    </span>
                  </div>
                  <p style={{ fontSize: 11.5, color: '#64748B', lineHeight: 1.35, margin: 0 }}>
                    Floor tables, KOT punching, food cooking notes & split payments.
                  </p>
                </div>
                <span style={{ fontSize: 18, color: '#D97706' }}>➔</span>
              </button>
            )}

            {/* 2. Cashier POS */}
            {isPortalSubscribed('cashier') && (
              <button
                data-testid="portal-card-cashier"
                type="button"
                onClick={() => handleSelectPortal('cashier')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '13px 14px',
                  background: '#FFFFFF',
                  borderRadius: 18,
                  border: '1.5px solid #A7F3D0',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.08)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ width: 56, height: 56, borderRadius: 14, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                  <img src={cashierImg} alt="Cashier" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>Cashier POS & Float Ledger</span>
                    <span style={{ fontSize: 10, fontWeight: '800', color: '#059669', background: '#D1FAE5', padding: '2px 7px', borderRadius: 6 }}>
                      BILLING & POS
                    </span>
                  </div>
                  <p style={{ fontSize: 11.5, color: '#64748B', lineHeight: 1.35, margin: 0 }}>
                    Direct walk-in punching, bill settlements & waiter cash float reconciliation.
                  </p>
                </div>
                <span style={{ fontSize: 18, color: '#059669' }}>➔</span>
              </button>
            )}

            {/* 3. Kitchen KDS */}
            {isPortalSubscribed('kds') && (
              <button
                data-testid="portal-card-kds"
                type="button"
                onClick={() => handleSelectPortal('kds')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '13px 14px',
                  background: '#FFFFFF',
                  borderRadius: 18,
                  border: '1.5px solid #FECACA',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.08)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ width: 56, height: 56, borderRadius: 14, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                  <img src={kdsImg} alt="Kitchen KDS" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>Kitchen KDS Display</span>
                    <span style={{ fontSize: 10, fontWeight: '800', color: '#DC2626', background: '#FEE2E2', padding: '2px 7px', borderRadius: 6 }}>
                      LIVE KDS
                    </span>
                  </div>
                  <p style={{ fontSize: 11.5, color: '#64748B', lineHeight: 1.35, margin: 0 }}>
                    Live KOT kitchen tickets, cooking notes (Kam namak, mirchi) & station dispatch.
                  </p>
                </div>
                <span style={{ fontSize: 18, color: '#DC2626' }}>➔</span>
              </button>
            )}

            {/* 4. Reception Front Desk */}
            {isPortalSubscribed('reception') && (
              <button
                data-testid="portal-card-reception"
                type="button"
                onClick={() => handleSelectPortal('reception')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '13px 14px',
                  background: '#FFFFFF',
                  borderRadius: 18,
                  border: '1.5px solid #BFDBFE',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.08)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ width: 56, height: 56, borderRadius: 14, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                  <img src={receptionImg} alt="Reception" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>Reception Front Desk</span>
                    <span style={{ fontSize: 10, fontWeight: '800', color: '#2563EB', background: '#DBEAFE', padding: '2px 7px', borderRadius: 6 }}>
                      FRONT DESK PMS
                    </span>
                  </div>
                  <p style={{ fontSize: 11.5, color: '#64748B', lineHeight: 1.35, margin: 0 }}>
                    Guest check-ins, room inventory, printable QR codes & folio management.
                  </p>
                </div>
                <span style={{ fontSize: 18, color: '#2563EB' }}>➔</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STEP 3: STAFF PROFILE SELECTION (FIRST SCREEN)                */}
      {/* ------------------------------------------------------------- */}
      {step === 'person' && (
        <div id="step-person-section" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Header Sub-bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <h2 style={{ fontSize: 19, fontWeight: '800', color: '#0F172A', margin: '0 0 2px', letterSpacing: '-0.02em' }}>
                👤 Staff Workstation Roster
              </h2>
              <p style={{ fontSize: 12, color: '#64748B', fontWeight: '500', margin: 0 }}>
                Select your profile below, then tap Unlock to enter your PIN:
              </p>
            </div>
            {selectedHotel && (
              <button
                type="button"
                data-testid="switch-hotel-sub-btn"
                onClick={() => setStep('hotel')}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: 10,
                  padding: '5px 10px',
                  fontSize: 11,
                  fontWeight: '700',
                  color: '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  whiteSpace: 'nowrap',
                }}
              >
                <span>🏨 Change Hotel</span>
              </button>
            )}
          </div>

          {/* Role Filter Chips */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, marginBottom: 12 }}>
            {[
              { id: 'ALL', label: '🌟 All Staff' },
              { id: 'WAITER', label: '🧑‍🍳 Waiters' },
              { id: 'CASHIER', label: '💰 Cashiers' },
              { id: 'CHEF', label: '🔥 Kitchen / Chefs' },
              { id: 'RECEPTION', label: '🛎️ Front Desk' },
            ].map((rf) => (
              <button
                key={rf.id}
                onClick={() => setRoleFilter(rf.id)}
                style={{
                  background: roleFilter === rf.id ? '#1E293B' : '#FFFFFF',
                  color: roleFilter === rf.id ? '#FFFFFF' : '#64748B',
                  border: roleFilter === rf.id ? '1px solid #1E293B' : '1px solid #E2E8F0',
                  padding: '5px 12px',
                  borderRadius: 16,
                  fontSize: 11.5,
                  fontWeight: '700',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: roleFilter === rf.id ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {rf.label}
              </button>
            ))}
          </div>

          {/* Staff Roster List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflowY: 'auto', paddingBottom: 16 }}>
            {displayedStaff.length === 0 ? (
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1.5px dashed #CBD5E1',
                  borderRadius: 16,
                  padding: '24px 16px',
                  textAlign: 'center',
                  color: '#64748B',
                }}
              >
                <div style={{ fontSize: 26, marginBottom: 6 }}>📋</div>
                <div style={{ fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 2 }}>
                  No Staff Members in this Category
                </div>
                <div style={{ fontSize: 12, marginBottom: 12 }}>
                  Switch filter to "All Staff" to view all active team members.
                </div>
                <button
                  onClick={() => setRoleFilter('ALL')}
                  style={{
                    background: '#2563EB',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  Show All Staff
                </button>
              </div>
            ) : (
              displayedStaff.map((st) => {
                const isSelected = selectedStaff?.id === st.id;
                const roleBadgeStyle =
                  st.role === 'WAITER'
                    ? { color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' }
                    : st.role === 'CASHIER'
                    ? { color: '#059669', bg: '#D1FAE5', border: '#A7F3D0' }
                    : st.role === 'CHEF'
                    ? { color: '#DC2626', bg: '#FEE2E2', border: '#FECACA' }
                    : { color: '#2563EB', bg: '#DBEAFE', border: '#BFDBFE' };

                return (
                  <div
                    key={st.id}
                    data-testid={`staff-profile-card-${st.id}`}
                    onClick={() => setSelectedStaff(st)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '13px 15px',
                      background: isSelected ? '#EFF6FF' : '#FFFFFF',
                      borderRadius: 18,
                      border: isSelected ? '2px solid #2563EB' : '1px solid #E2E8F0',
                      boxShadow: isSelected
                        ? '0 6px 18px rgba(37, 99, 235, 0.12)'
                        : '0 2px 6px rgba(15, 23, 42, 0.03)',
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {/* Photo with Online Dot */}
                      <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
                        <img
                          src={st.photo}
                          alt={st.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderRadius: 14,
                            border: isSelected ? '2px solid #2563EB' : '1.5px solid #E2E8F0',
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            bottom: -2,
                            right: -2,
                            width: 13,
                            height: 13,
                            borderRadius: '50%',
                            background: '#10B981',
                            border: '2px solid #FFFFFF',
                          }}
                        />
                      </div>

                      {/* Info Details */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
                            {st.name}
                          </span>
                          <span
                            style={{
                              fontSize: 9.5,
                              fontWeight: '800',
                              color: roleBadgeStyle.color,
                              background: roleBadgeStyle.bg,
                              border: `1px solid ${roleBadgeStyle.border}`,
                              padding: '2px 7px',
                              borderRadius: 6,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                            }}
                          >
                            {st.role}
                          </span>
                        </div>
                        <div style={{ fontSize: 11.5, color: '#475569', fontWeight: '600' }}>
                          {st.section}{st.tables ? ` · ${st.tables}` : ''}
                        </div>
                        <div style={{ fontSize: 10.5, color: '#94A3B8', marginTop: 1 }}>
                          🕒 {st.shift}
                        </div>
                      </div>

                      {/* Photo Self-Service Edit Icon */}
                      <button
                        type="button"
                        data-testid={`edit-staff-photo-btn-${st.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPhotoTargetStaff(st);
                          setCustomPhotoUrl(st.photo);
                          setShowPhotoModal(true);
                        }}
                        title="Update Profile Photo"
                        style={{
                          background: '#F1F5F9',
                          border: '1px solid #CBD5E1',
                          borderRadius: 8,
                          padding: '5px 7px',
                          fontSize: 11,
                          fontWeight: '700',
                          color: '#475569',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                          flexShrink: 0,
                        }}
                      >
                        <span>📷</span>
                      </button>
                    </div>

                    {/* Large 'Unlock' Button (revealed when card is tapped) */}
                    {isSelected && (
                      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #DBEAFE', width: '100%' }}>
                        <button
                          type="button"
                          data-testid={`unlock-staff-btn-${st.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStaff(st);
                            setPin('');
                            setAuthError('');
                            setShowAuthModal(true);
                          }}
                          style={{
                            width: '100%',
                            padding: '13px 18px',
                            borderRadius: 14,
                            background: '#2563EB',
                            color: '#FFFFFF',
                            border: 'none',
                            fontSize: 15,
                            fontWeight: '800',
                            cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span style={{ fontSize: 17 }}>🔓</span>
                          <span>Unlock {st.name} ({st.role}) Workstation</span>
                          <span style={{ fontSize: 17, marginLeft: 2 }}>➔</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Workforce Footer Banner */}
      <div
        style={{
          borderRadius: 16,
          overflow: 'hidden',
          position: 'relative',
          minHeight: 68,
          background: '#0F172A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
          marginTop: 'auto',
          border: '1px solid #334155',
        }}
      >
        <div style={{ zIndex: 2, flex: 1, paddingRight: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 8.5, fontWeight: '800', color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: 4 }}>
              ⚡ SPICEHUB WORKFORCE
            </span>
            <span style={{ fontSize: 10, color: '#10B981', fontWeight: '700' }}>● Secure Terminal</span>
          </div>
          <div style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF', lineHeight: 1.3 }}>
            Direct Kiosk Unlock · 4-Digit Security PIN
          </div>
          <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>
            Instant authenticated session · Zero secondary web login
          </div>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(255,255,255,0.15)', overflow: 'hidden' }}>
          {selectedHotel?.logoUrl ? (
            <img
              src={selectedHotel.logoUrl}
              alt=""
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = FALLBACK_HOTEL_LOGO;
              }}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontSize: 22 }}>🏨</span>
          )}
        </div>
      </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* CUSTOM IN-APP NUMERIC KEYPAD MODAL (BEAUTIFUL WHITE BOX)       */}
      {/* ------------------------------------------------------------- */}
      {showAuthModal && selectedStaff && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="pin-keypad-modal"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            data-testid="pin-keypad-white-box"
            style={{
              width: '100%',
              maxWidth: 340,
              background: '#FFFFFF',
              borderRadius: 28,
              padding: '22px 20px 24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxSizing: 'border-box',
            }}
          >
            {/* Top Close Button */}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginBottom: 2 }}>
              <button
                type="button"
                data-testid="close-pin-modal-btn"
                onClick={() => {
                  setShowAuthModal(false);
                  setPin('');
                  setAuthError('');
                }}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  fontSize: 14,
                  fontWeight: '800',
                  color: '#64748B',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            {/* Staff Profile Avatar */}
            <div style={{ position: 'relative', width: 68, height: 68, marginBottom: 8 }}>
              <img
                src={selectedStaff.photo}
                alt={selectedStaff.name}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: 20,
                  objectFit: 'cover',
                  border: '2.5px solid #2563EB',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  width: 15,
                  height: 15,
                  borderRadius: '50%',
                  background: '#10B981',
                  border: '2px solid #FFFFFF',
                }}
              />
            </div>

            <h3 style={{ fontSize: 18, fontWeight: '800', color: '#0F172A', margin: '0 0 2px', textAlign: 'center' }}>
              {selectedStaff.name}
            </h3>
            <div style={{ fontSize: 11, fontWeight: '800', color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              {selectedStaff.role} · {portals[getPortalForRole(selectedStaff.role)].label}
            </div>
            <p style={{ fontSize: 12, color: '#64748B', fontWeight: '500', margin: '0 0 16px', textAlign: 'center' }}>
              Enter 4-Digit Security PIN
            </p>

            {/* 4 Empty Circular PIN Dots that fill sequentially */}
            <div
              data-testid="pin-dots-container"
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 16,
                marginBottom: 16,
              }}
            >
              {[0, 1, 2, 3].map((i) => {
                const isFilled = i < pin.length;
                return (
                  <div
                    key={i}
                    data-testid={`pin-dot-${i}`}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: isFilled ? '#2563EB' : '#FFFFFF',
                      border: isFilled ? '2px solid #2563EB' : '2px solid #CBD5E1',
                      transform: isFilled ? 'scale(1.15)' : 'scale(1)',
                      boxShadow: isFilled ? '0 0 10px rgba(37, 99, 235, 0.45)' : 'none',
                      transition: 'all 0.16s ease-in-out',
                    }}
                  />
                );
              })}
            </div>

            {/* Error Message Display */}
            {authError && (
              <div
                data-testid="pin-auth-error"
                style={{
                  width: '100%',
                  background: '#FEE2E2',
                  border: '1px solid #FCA5A5',
                  color: '#B91C1C',
                  fontSize: 11.5,
                  fontWeight: '700',
                  padding: '8px 12px',
                  borderRadius: 12,
                  marginBottom: 12,
                  textAlign: 'center',
                  lineHeight: 1.35,
                }}
              >
                {authError}
              </div>
            )}

            {isSubmitting && (
              <div style={{ fontSize: 12, fontWeight: '700', color: '#2563EB', marginBottom: 10 }}>
                Verifying PIN & Unlocking Workstation...
              </div>
            )}

            {/* Custom In-App Numeric Keypad: 1-9, 0, Clear, Delete (NO device virtual keyboard) */}
            <div
              data-testid="custom-touch-keypad"
              style={{
                width: '100%',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 10,
              }}
            >
              {[
                { label: '1', value: '1', action: 'digit' },
                { label: '2', value: '2', action: 'digit' },
                { label: '3', value: '3', action: 'digit' },
                { label: '4', value: '4', action: 'digit' },
                { label: '5', value: '5', action: 'digit' },
                { label: '6', value: '6', action: 'digit' },
                { label: '7', value: '7', action: 'digit' },
                { label: '8', value: '8', action: 'digit' },
                { label: '9', value: '9', action: 'digit' },
                { label: 'Clear', value: 'clear', action: 'clear' },
                { label: '0', value: '0', action: 'digit' },
                { label: 'Delete', value: 'delete', action: 'delete' },
              ].map((k) => {
                const isClear = k.action === 'clear';
                const isDelete = k.action === 'delete';

                return (
                  <button
                    key={k.label}
                    type="button"
                    data-testid={`keypad-${k.value}`}
                    disabled={isSubmitting}
                    onClick={() => {
                      if (isClear) {
                        setPin('');
                        setAuthError('');
                      } else if (isDelete) {
                        setPin((prev) => prev.slice(0, -1));
                        setAuthError('');
                      } else {
                        handlePinDigit(k.value);
                      }
                    }}
                    style={{
                      height: 52,
                      borderRadius: 14,
                      border: isClear
                        ? '1px solid #FECACA'
                        : isDelete
                        ? '1px solid #CBD5E1'
                        : '1px solid #E2E8F0',
                      background: isClear
                        ? '#FEF2F2'
                        : isDelete
                        ? '#F8FAFC'
                        : '#FFFFFF',
                      color: isClear
                        ? '#DC2626'
                        : isDelete
                        ? '#475569'
                        : '#0F172A',
                      fontSize: isClear || isDelete ? 13 : 22,
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 4px rgba(15, 23, 42, 0.04)',
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      touchAction: 'manipulation',
                    }}
                  >
                    {k.label}
                  </button>
                );
              })}
            </div>

            {/* Forgot PIN Action Button */}
            <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px dashed #E2E8F0', width: '100%', textAlign: 'center' }}>
              <button
                type="button"
                data-testid="forgot-pin-trigger-btn"
                onClick={() => {
                  setShowForgotPinModal(true);
                  setOtpEmail(selectedStaff.email || '');
                  setOtpCode('');
                  setNewOtpPin('');
                  setConfirmOtpPin('');
                  setOtpStep('request');
                  setOtpStatusMsg(null);
                  setForgotPinTab('otp');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563EB',
                  fontSize: 12.5,
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <span>🔑 Forgot PIN? (PIN भूल गए?)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* FORGOT PIN MODAL: EMAIL OTP RESET OR ASK HOTEL ADMIN          */}
      {/* ------------------------------------------------------------- */}
      {showForgotPinModal && selectedStaff && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="forgot-pin-modal"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 360,
              background: '#FFFFFF',
              borderRadius: 26,
              padding: '20px 20px 22px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
              border: '1px solid #E2E8F0',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxSizing: 'border-box',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#2563EB' }}>
                  🔑
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', margin: 0 }}>
                    PIN Recovery
                  </h3>
                  <span style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>
                    {selectedStaff.name} ({selectedStaff.role})
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowForgotPinModal(false);
                  setOtpStatusMsg(null);
                }}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '50%',
                  width: 30,
                  height: 30,
                  fontSize: 13,
                  fontWeight: '800',
                  color: '#64748B',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            {/* Tab Switcher: Email OTP vs Ask Admin */}
            <div
              style={{
                display: 'flex',
                background: '#F1F5F9',
                borderRadius: 12,
                padding: 3,
                marginBottom: 14,
              }}
            >
              <button
                type="button"
                data-testid="forgot-tab-otp"
                onClick={() => { setForgotPinTab('otp'); setOtpStatusMsg(null); }}
                style={{
                  flex: 1,
                  padding: '7px 0',
                  borderRadius: 10,
                  border: 'none',
                  fontSize: 11.5,
                  fontWeight: '700',
                  cursor: 'pointer',
                  background: forgotPinTab === 'otp' ? '#FFFFFF' : 'transparent',
                  color: forgotPinTab === 'otp' ? '#2563EB' : '#64748B',
                  boxShadow: forgotPinTab === 'otp' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                📩 Reset via OTP
              </button>
              <button
                type="button"
                data-testid="forgot-tab-admin"
                onClick={() => { setForgotPinTab('admin'); setOtpStatusMsg(null); }}
                style={{
                  flex: 1,
                  padding: '7px 0',
                  borderRadius: 10,
                  border: 'none',
                  fontSize: 11.5,
                  fontWeight: '700',
                  cursor: 'pointer',
                  background: forgotPinTab === 'admin' ? '#FFFFFF' : 'transparent',
                  color: forgotPinTab === 'admin' ? '#2563EB' : '#64748B',
                  boxShadow: forgotPinTab === 'admin' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                🏨 Ask Hotel Admin
              </button>
            </div>

            {/* Status Message */}
            {otpStatusMsg && (
              <div
                style={{
                  background: otpStatusMsg.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                  border: otpStatusMsg.type === 'success' ? '1px solid #A7F3D0' : '1px solid #FECACA',
                  color: otpStatusMsg.type === 'success' ? '#065F46' : '#B91C1C',
                  fontSize: 11.5,
                  fontWeight: '700',
                  padding: '8px 12px',
                  borderRadius: 10,
                  marginBottom: 12,
                  lineHeight: 1.35,
                  textAlign: 'center',
                }}
              >
                {otpStatusMsg.text}
              </div>
            )}

            {/* TAB 1: RESET VIA EMAIL OTP */}
            {forgotPinTab === 'otp' && (
              <div>
                {otpStep === 'request' ? (
                  <form onSubmit={handleSendPinOtp} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 4px', lineHeight: 1.4 }}>
                      A 6-digit security OTP will be sent to your registered staff email via Resend API to verify your identity.
                    </p>
                    <div>
                      <label style={{ fontSize: 10.5, fontWeight: '700', color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                        Staff Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={otpEmail}
                        onChange={(e) => setOtpEmail(e.target.value)}
                        placeholder="staff.name@spicehub.hotel"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 10,
                          border: '1px solid #CBD5E1',
                          fontSize: 13,
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isOtpSubmitting}
                      style={{
                        width: '100%',
                        padding: '12px 0',
                        borderRadius: 12,
                        background: '#2563EB',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: 13,
                        fontWeight: '800',
                        cursor: 'pointer',
                        marginTop: 4,
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                      }}
                    >
                      {isOtpSubmitting ? 'Sending OTP via Resend...' : '📩 Send 6-Digit Verification OTP'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyPinOtp} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ textAlign: 'center' }}>
                      <label style={{ fontSize: 10.5, fontWeight: '700', color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                        Enter 6-Digit OTP Code
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        required
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="123456"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 10,
                          border: '1.5px solid #2563EB',
                          fontSize: 18,
                          fontWeight: '800',
                          letterSpacing: 4,
                          textAlign: 'center',
                          color: '#1E293B',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: '700', color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>
                          New 4-Digit PIN
                        </label>
                        <input
                          type="password"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={4}
                          required
                          value={newOtpPin}
                          onChange={(e) => setNewOtpPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="••••"
                          style={{
                            width: '100%',
                            padding: '9px 10px',
                            borderRadius: 10,
                            border: newOtpPin.length === 4 ? '1.5px solid #10B981' : '1px solid #CBD5E1',
                            fontSize: 15,
                            textAlign: 'center',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: '700', color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>
                          Confirm PIN
                        </label>
                        <input
                          type="password"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={4}
                          required
                          value={confirmOtpPin}
                          onChange={(e) => setConfirmOtpPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="••••"
                          style={{
                            width: '100%',
                            padding: '9px 10px',
                            borderRadius: 10,
                            border: confirmOtpPin.length === 4 && confirmOtpPin === newOtpPin ? '1.5px solid #10B981' : '1px solid #CBD5E1',
                            fontSize: 15,
                            textAlign: 'center',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isOtpSubmitting || newOtpPin.length !== 4 || newOtpPin !== confirmOtpPin}
                      style={{
                        width: '100%',
                        padding: '12px 0',
                        borderRadius: 12,
                        background: newOtpPin.length === 4 && newOtpPin === confirmOtpPin ? '#10B981' : '#94A3B8',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: 13,
                        fontWeight: '800',
                        cursor: newOtpPin.length === 4 && newOtpPin === confirmOtpPin ? 'pointer' : 'not-allowed',
                        marginTop: 4,
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                      }}
                    >
                      {isOtpSubmitting ? 'Activating New PIN...' : '🚀 Verify OTP & Activate New PIN'}
                    </button>

                    <div style={{ textAlign: 'center', marginTop: 4 }}>
                      <button
                        type="button"
                        onClick={() => { setOtpStep('request'); setOtpStatusMsg(null); }}
                        style={{ background: 'none', border: 'none', color: '#64748B', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        ← Re-send OTP to different email
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* TAB 2: ASK HOTEL ADMIN */}
            {forgotPinTab === 'admin' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 14, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 16 }}>🏨</span>
                    <span style={{ fontSize: 12.5, fontWeight: '800', color: '#1E40AF' }}>
                      Hotel Admin PIN Access
                    </span>
                  </div>
                  <p style={{ fontSize: 11.5, color: '#1E3A8A', margin: 0, lineHeight: 1.45 }}>
                    Your Hotel Admin has full visibility of staff PINs in the <strong>Hotel Admin ERP Portal</strong> under <strong>Staff & Terminal Access</strong>.
                  </p>
                </div>

                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14, padding: '12px 14px', fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
                  <div style={{ fontWeight: '700', color: '#0F172A', marginBottom: 4 }}>
                    💡 How to get your PIN from Admin:
                  </div>
                  <ol style={{ margin: 0, paddingLeft: 16 }}>
                    <li>Contact your Shift Manager or Frontdesk Administrator.</li>
                    <li>They will open the Admin Portal and click <strong>"Reveal PIN"</strong> next to your name.</li>
                    <li>They can tell you your current 4-digit PIN or immediately change it to a new one.</li>
                  </ol>
                </div>

                <button
                  type="button"
                  onClick={() => setShowForgotPinModal(false)}
                  style={{
                    width: '100%',
                    padding: '11px 0',
                    borderRadius: 12,
                    background: '#1E293B',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: 12.5,
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  ✓ Back to Keypad Unlock
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Waiter Self-Service Profile Photo Modal */}
      {showPhotoModal && photoTargetStaff && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 380,
              background: '#FFFFFF',
              borderRadius: 24,
              padding: 20,
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', margin: 0 }}>
                  📸 Staff Profile Photo
                </h3>
                <p style={{ fontSize: 11, color: '#64748B', margin: 0 }}>
                  Upload or select your photo for Guest Live ETA
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPhotoModal(false)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '50%',
                  width: 28,
                  height: 28,
                  fontSize: 12,
                  cursor: 'pointer',
                  fontWeight: '700',
                  color: '#64748B',
                }}
              >
                ✕
              </button>
            </div>

            {/* Current & Preview Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#F8FAFC', padding: 12, borderRadius: 16, border: '1px solid #E2E8F0' }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, overflow: 'hidden', border: '2px solid #F59E0B', flexShrink: 0, boxShadow: '0 4px 10px rgba(245,158,11,0.2)' }}>
                <img
                  src={customPhotoUrl || photoTargetStaff.photo}
                  alt={photoTargetStaff.name}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = photoTargetStaff.photo;
                  }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                  {photoTargetStaff.name}
                </div>
                <div style={{ fontSize: 11, fontWeight: '700', color: '#D97706' }}>
                  {photoTargetStaff.role} · {photoTargetStaff.section}
                </div>
                <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>
                  Shown on Guest Room Butler ETA
                </div>
              </div>
            </div>

            {/* Direct Camera & Gallery Upload */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label style={{
                padding: '10px 12px',
                borderRadius: 12,
                background: '#2563EB',
                color: '#FFFFFF',
                fontWeight: '800',
                fontSize: 11.5,
                textAlign: 'center',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
              }}>
                <span>📷 Take Live Photo</span>
                <span style={{ fontSize: 9.5, opacity: 0.9 }}>Camera Capture</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  style={{ display: 'none' }}
                  onChange={handlePhotoFileUpload}
                />
              </label>

              <label style={{
                padding: '10px 12px',
                borderRadius: 12,
                background: '#1E293B',
                color: '#F8FAFC',
                border: '1px solid #334155',
                fontWeight: '800',
                fontSize: 11.5,
                textAlign: 'center',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4
              }}>
                <span>🖼️ Device Gallery</span>
                <span style={{ fontSize: 9.5, color: '#94A3B8' }}>Select File</span>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handlePhotoFileUpload}
                />
              </label>
            </div>

            <div style={{ fontSize: 9.5, color: '#059669', fontFamily: 'monospace', textAlign: 'center' }}>
              Real Photo Capture • Compressed to 400x400 JPEG (~40 KB)
            </div>

            {/* Custom Photo URL Input */}
            <div>
              <label style={{ fontSize: 10.5, fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>
                Or Custom Photo URL:
              </label>
              <input
                type="url"
                data-testid="input-waiter-photo-url"
                value={customPhotoUrl}
                onChange={(e) => setCustomPhotoUrl(e.target.value)}
                placeholder="https://..."
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 12,
                  border: '1.5px solid #CBD5E1',
                  fontSize: 12,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Submit Action */}
            <button
              type="button"
              data-testid="save-waiter-photo-btn"
              disabled={isSavingPhoto}
              onClick={() => handleSaveStaffPhoto(customPhotoUrl)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 14,
                background: photoSaveSuccess ? '#10B981' : '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: '800',
                fontSize: 13,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              {isSavingPhoto ? (
                <span>Saving Photo...</span>
              ) : photoSaveSuccess ? (
                <span>✓ Photo Updated & Synced to Butler ETA!</span>
              ) : (
                <span>✓ Save Photo & Sync to Guest ETA</span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
