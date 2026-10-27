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

type WizardStep = 'hotel' | 'portal' | 'person' | 'workstation';

export function App() {
  // Wizard State - Defaults to 'hotel' on app open
  const [step, setStep] = useState<WizardStep>('hotel');
  const [hotels, setHotels] = useState<ActiveHotel[]>([]);
  const [selectedHotel, setSelectedHotel] = useState<ActiveHotel | null>(null);
  const [hotelSearch, setHotelSearch] = useState('');

  // Portal State
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

  // Auth Modal State (PIN vs Email/Password)
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'pin' | 'email'>('pin');
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Resend Email OTP Modal State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newOtpPin, setNewOtpPin] = useState('');
  const [confirmOtpPin, setConfirmOtpPin] = useState('');
  const [otpStep, setOtpStep] = useState<'request' | 'verify'>('request');
  const [otpStatusMsg, setOtpStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [otpPreviewHint, setOtpPreviewHint] = useState<string>('');
  const [isOtpSubmitting, setIsOtpSubmitting] = useState(false);

  // Waiter & Staff Self-Service Profile Photo Modal State
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoTargetStaff, setPhotoTargetStaff] = useState<StaffMember | null>(null);
  const [customPhotoUrl, setCustomPhotoUrl] = useState('');
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const [photoSaveSuccess, setPhotoSaveSuccess] = useState(false);

  const PRESET_AVATARS = [
    { label: 'Steward Formal', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80' },
    { label: 'Concierge Head', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80' },
    { label: 'Senior Butler', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80' },
    { label: 'Executive Host', url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=300&auto=format&fit=crop&q=80' },
  ];

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

  // Configurable Host: USB Localhost (Reverse) vs LAN Wi-Fi
  const DEV_LAN_IP = '10.208.156.216';

  const [serverHost, setServerHost] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('spicehub_server_host');
      if (saved && saved !== '10.163.112.94') return saved;
      if (window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        return window.location.hostname;
      }
    }
    return DEV_LAN_IP;
  });

  const BASE = `http://${serverHost}`;
  const API_URL = `${BASE}:5000`;

  const portals: Record<PortalType, { port: number; label: string; color: string; emoji: string; desc: string; roleHint: string }> = {
    waiter: {
      port: 3002,
      label: 'Waiter Terminal',
      color: '#f59e0b',
      emoji: '🧑‍🍳',
      desc: 'Table layout, punch KOT orders, special cooking notes & split settlement.',
      roleHint: 'WAITER',
    },
    cashier: {
      port: 3007,
      label: 'Cashier POS & Float',
      color: '#10b981',
      emoji: '💰',
      desc: 'Direct walk-in punching, bill settlement & waiter cash float reconciliation.',
      roleHint: 'CASHIER',
    },
    kds: {
      port: 3003,
      label: 'Kitchen KDS Display',
      color: '#ef4444',
      emoji: '🔥',
      desc: 'Live kitchen order tickets (KOT), dish timers & chef dispatch management.',
      roleHint: 'CHEF',
    },
    reception: {
      port: 3008,
      label: 'Reception Front Desk',
      color: '#3b82f6',
      emoji: '🛎️',
      desc: 'Guest check-ins, room inventory, printable QR codes & folio management.',
      roleHint: 'RECEPTION',
    },
  };

  // 0. Capacitor Physical Android Back Button Event Handling
  const staffStateRef = useRef({
    showAuthModal,
    showOtpModal,
    showPhotoModal,
    step,
  });

  useEffect(() => {
    staffStateRef.current = {
      showAuthModal,
      showOtpModal,
      showPhotoModal,
      step,
    };
  }, [showAuthModal, showOtpModal, showPhotoModal, step]);

  useEffect(() => {
    let backHandle: any = null;
    const registerBack = async () => {
      try {
        backHandle = await CapApp.addListener('backButton', () => {
          const s = staffStateRef.current;
          if (s.showPhotoModal) {
            setShowPhotoModal(false);
            return;
          }
          if (s.showOtpModal) {
            setShowOtpModal(false);
            return;
          }
          if (s.showAuthModal) {
            setShowAuthModal(false);
            return;
          }
          if (s.step === 'workstation') {
            setStep('person');
            return;
          }
          if (s.step === 'person') {
            setStep('portal');
            return;
          }
          if (s.step === 'portal') {
            setStep('hotel');
            return;
          }
          // On root hotel selection step -> exit app cleanly
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

  // 1. Fetch Active Hotels on Mount
  const fetchHotels = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/active-hotels`);
      if (res.ok) {
        const body = await res.json();
        if (body.success && Array.isArray(body.data) && body.data.length > 0) {
          setHotels(body.data);
          const saved = localStorage.getItem('spicehub_staff_hotel');
          const matched = saved ? body.data.find((h: ActiveHotel) => h.id === saved || h.slug === saved) : null;
          setSelectedHotel(matched || body.data[0]);
          // Always begin on 'hotel' selection step when opening the app fresh
          setStep('hotel');
          return;
        }
      }
    } catch (err) {
      console.warn('Active hotels fetch fallback probe:', err);
    }

    // Auto-probe secondary host if default failed
    try {
      const fallbackHost = serverHost === 'localhost' ? DEV_LAN_IP : 'localhost';
      const res = await fetch(`http://${fallbackHost}:5000/api/v1/auth/active-hotels`);
      if (res.ok) {
        const body = await res.json();
        if (body.success && Array.isArray(body.data) && body.data.length > 0) {
          setHotels(body.data);
          setSelectedHotel(body.data[0]);
          setServerHost(fallbackHost);
          localStorage.setItem('spicehub_server_host', fallbackHost);
        }
      }
    } catch {}
  };

  useEffect(() => {
    let active = true;
    if (active) void fetchHotels();
    return () => { active = false; };
  }, [serverHost]);

  // 2. Fetch Staff Roster for Selected Hotel
  const fetchStaff = async () => {
    if (!selectedHotel) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/hotel-staff?hotelId=${selectedHotel.id}`);
      if (res.ok) {
        const body = await res.json();
        if (body.success && Array.isArray(body.data)) {
          const photos = [raviPhoto, rameshPhoto, amitPhoto];
          const mapped: StaffMember[] = body.data.map((u: any, idx: number) => {
            const start = Number(u.assignedTableStart) || (idx * 6 + 1);
            const end = Number(u.assignedTableEnd) || (start + 5);
            return {
              id: u.id || u._id,
              name: u.name,
              email: u.email || '',
              role: u.role || 'WAITER',
              shift: u.shift || 'General Shift',
              tables: `T-${String(start).padStart(2, '0')} to T-${String(end).padStart(2, '0')}`,
              section: u.assignedSection || (u.role === 'CASHIER' ? 'Billing Counter' : 'Main Dining Hall'),
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
    } catch (err) {
      console.warn('Hotel staff fetch error:', err);
    }
  };

  useEffect(() => {
    let active = true;
    if (active) void fetchStaff();
    return () => { active = false; };
  }, [selectedHotel, serverHost]);

  // Handler: Select Hotel (Step 1 -> Step 2)
  const handleSelectHotel = (h: ActiveHotel) => {
    setSelectedHotel(h);
    localStorage.setItem('spicehub_staff_hotel', h.id);
    setStep('portal');
  };

  // Check if a portal is subscribed in the selected hotel
  const isPortalSubscribed = (p: PortalType) => {
    if (!selectedHotel?.enabledPortals || !Array.isArray(selectedHotel.enabledPortals)) return true;
    return selectedHotel.enabledPortals.includes(p);
  };

  // Handler: Select Portal (Step 2 -> Step 3)
  const handleSelectPortal = (p: PortalType) => {
    if (!isPortalSubscribed(p)) {
      alert(`The ${portals[p].label} workstation is not subscribed for ${selectedHotel?.name || 'this hotel'}.`);
      return;
    }
    setSelectedPortal(p);
    // Auto-set the role filter to match the selected portal
    const hint = portals[p].roleHint;
    setRoleFilter(hint || 'ALL');
    setStep('person');
  };

  // Handler: Select Person (Step 3 -> Step 4 Auth Modal)
  const handleSelectPerson = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setPin('');
    setEmail(staff.email);
    setPassword('');
    setAuthError('');
    setAuthMode('pin');
    setShowAuthModal(true);
  };

  // Handler: PIN Digit Tap
  const handlePinDigit = (digit: string) => {
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

  // Handler: Execute PIN Login
  const executePinLogin = async (enteredPin: string) => {
    if (!selectedHotel || !selectedStaff) return;
    setIsSubmitting(true);
    setAuthError('');
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/waiter-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: enteredPin,
          hotelSlug: selectedHotel.slug,
          hotelId: selectedHotel.id,
          staffId: selectedStaff.id,
          email: selectedStaff.email,
          portal: selectedPortal,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.data?.token) {
        const token = data.data.token;
        const user = data.data.user;

        localStorage.setItem('spicehub_token', token);
        localStorage.setItem('token', token);
        localStorage.setItem('spicehub_hotel_id', selectedHotel.id);
        localStorage.setItem('hotelId', selectedHotel.id);
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
        setShowAuthModal(false);
        setStep('workstation');
      } else {
        if (data.errorCode === 'PIN_PENDING_ADMIN_APPROVAL') {
          setAuthError('⏳ PIN Pending Approval: Your 4-digit PIN is awaiting Hotel Admin approval.');
        } else {
          setAuthError(data.message || 'Invalid 4-digit staff PIN. Please try again.');
        }
        setPin('');
      }
    } catch (err: any) {
      setAuthError('Network error connecting to login service.');
      setPin('');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: Execute Email & Password Login
  const executeEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHotel || !email || !password) return;
    setIsSubmitting(true);
    setAuthError('');
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          hotelSlug: selectedHotel.slug,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.data?.token) {
        const token = data.data.token;
        const user = data.data.user;

        localStorage.setItem('spicehub_token', token);
        localStorage.setItem('token', token);
        localStorage.setItem('spicehub_hotel_id', selectedHotel.id);
        localStorage.setItem('hotelId', selectedHotel.id);
        localStorage.setItem('spicehub_auth_user', JSON.stringify(user));

        setActiveStaffUser(user);
        setShowAuthModal(false);
        setStep('workstation');
      } else {
        setAuthError(data.message || 'Invalid email or password.');
      }
    } catch (err: any) {
      setAuthError('Network error during email login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend Email OTP: Step A - Send OTP
  const handleSendPinOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedHotel || !otpEmail) return;
    setIsOtpSubmitting(true);
    setOtpStatusMsg(null);
    setOtpPreviewHint('');
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/send-pin-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId: selectedHotel.id,
          hotelSlug: selectedHotel.slug,
          email: otpEmail.trim().toLowerCase(),
          staffId: selectedStaff?.id,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOtpStatusMsg({
          type: 'success',
          text: `✅ 6-digit OTP code sent to ${data.data?.email || otpEmail}! Check your inbox.`,
        });
        if (data.data?.otpPreview) {
          setOtpPreviewHint(data.data.otpPreview);
        }
        setOtpStep('verify');
      } else {
        setOtpStatusMsg({ type: 'error', text: data.message || 'Failed to send OTP email.' });
      }
    } catch (err: any) {
      setOtpStatusMsg({ type: 'error', text: 'Network error connecting to Resend OTP service.' });
    } finally {
      setIsOtpSubmitting(false);
    }
  };

  // Resend Email OTP: Step B - Verify OTP & Activate New PIN
  const handleVerifyPinOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHotel || !otpCode || !newOtpPin) return;

    if (newOtpPin !== confirmOtpPin) {
      setOtpStatusMsg({ type: 'error', text: 'New PIN and Confirm PIN do not match.' });
      return;
    }

    if (!/^\d{4,6}$/.test(newOtpPin)) {
      setOtpStatusMsg({ type: 'error', text: 'PIN must be exactly 4 to 6 numeric digits.' });
      return;
    }

    setIsOtpSubmitting(true);
    setOtpStatusMsg(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/verify-pin-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId: selectedHotel.id,
          hotelSlug: selectedHotel.slug,
          email: otpEmail.trim().toLowerCase(),
          staffId: selectedStaff?.id,
          otp: otpCode.trim(),
          newPin: newOtpPin.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOtpStatusMsg({
          type: 'success',
          text: '🎉 PIN verified & activated successfully! Unlocking your workstation...',
        });
        setTimeout(() => {
          setShowOtpModal(false);
          setOtpStatusMsg(null);
          setOtpCode('');
          setNewOtpPin('');
          setConfirmOtpPin('');
          setOtpStep('request');
          setPin('');
          void fetchStaff();
          // Auto-login directly with verified PIN
          void executePinLogin(newOtpPin);
        }, 1200);
      } else {
        setOtpStatusMsg({ type: 'error', text: data.message || 'Incorrect or expired OTP code.' });
      }
    } catch (err: any) {
      setOtpStatusMsg({ type: 'error', text: 'Network error verifying OTP code.' });
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

    const iframeUrl = `${BASE}:${currentApp.port}/?${q.toString()}`;

    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            padding: '10px 14px',
            background: currentApp.color,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {selectedHotel?.logoUrl ? (
              <img
                src={selectedHotel.logoUrl}
                alt={selectedHotel.name}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = FALLBACK_HOTEL_LOGO;
                }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  objectFit: 'cover',
                  border: '1.5px solid rgba(255,255,255,0.7)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  flexShrink: 0,
                  background: '#FFFFFF',
                }}
              />
            ) : (
              <span style={{ fontSize: 22 }}>{currentApp.emoji}</span>
            )}
            <div>
              <span style={{ fontWeight: '800', color: '#fff', fontSize: 14 }}>
                {currentApp.label}
              </span>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>🏨 {selectedHotel?.name}</span>
                {selectedStaff && (
                  <span style={{ background: 'rgba(255,255,255,0.25)', padding: '1px 6px', borderRadius: 4, fontWeight: '700' }}>
                    👤 {selectedStaff.name} ({selectedStaff.role})
                  </span>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => {
                const ifr = document.getElementById('workstation-frame') as HTMLIFrameElement;
                if (ifr) ifr.src = ifr.src;
              }}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.5)',
                color: '#fff',
                borderRadius: 8,
                padding: '6px 10px',
                fontSize: 12,
                fontWeight: '700',
                cursor: 'pointer',
              }}
              title="Reload Station"
            >
              🔄
            </button>
            <button
              data-testid="waiter-self-profile-btn"
              onClick={() => {
                const target = selectedStaff || {
                  id: activeStaffUser?._id || activeStaffUser?.id || 'waiter-1',
                  name: activeStaffUser?.name || 'Senior Waiter',
                  email: activeStaffUser?.email || '',
                  role: activeStaffUser?.role || 'WAITER',
                  photo: activeStaffUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
                  shift: 'Morning',
                  tables: 'T1-T10',
                  section: 'Indoor Fine Dining',
                  pin: '',
                };
                setPhotoTargetStaff(target);
                setCustomPhotoUrl(target.photo);
                setShowPhotoModal(true);
              }}
              style={{
                background: 'rgba(245, 158, 11, 0.4)',
                border: '1px solid rgba(245, 158, 11, 0.8)',
                color: '#fff',
                borderRadius: 8,
                padding: '6px 10px',
                fontSize: 11.5,
                fontWeight: '800',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span>📸</span>
              <span>My Photo</span>
            </button>
            <button
              data-testid="switch-station-btn"
              onClick={() => setStep('portal')}
              style={{
                background: 'rgba(255,255,255,0.25)',
                border: '1px solid rgba(255,255,255,0.7)',
                color: '#fff',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 11.5,
                fontWeight: '800',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              ✕ Switch Station
            </button>
          </div>
        </div>
        <iframe
          id="workstation-frame"
          src={iframeUrl}
          title={currentApp.label}
          style={{ width: '100%', flex: 1, border: 'none', background: '#0F172A' }}
          allow="camera; microphone; geolocation; clipboard-read; clipboard-write"
        />
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
        padding: '16px 16px 24px',
        background: '#FAF6EF',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src={logoImg}
            alt="SpiceHub Logo"
            style={{
              width: 44,
              height: 44,
              objectFit: 'contain',
              borderRadius: 12,
              filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.08))',
            }}
          />
          <div>
            <div style={{ fontSize: 22, fontWeight: '800', color: '#1E293B', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              SpiceHub
            </div>
            <div style={{ fontSize: 10.5, fontWeight: '800', color: '#D97706', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              STAFF WORKSTATION APP
            </div>
          </div>
        </div>

        {/* Right Header Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
          {/* Host Toggle (USB vs Wi-Fi) */}
          <button
            data-testid="network-host-toggle-btn"
            onClick={() => {
              const next = serverHost === 'localhost' ? DEV_LAN_IP : 'localhost';
              setServerHost(next);
              localStorage.setItem('spicehub_server_host', next);
            }}
            style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: 8,
              padding: '3px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <span style={{ fontSize: 10 }}>{serverHost === 'localhost' ? '⚡' : '📶'}</span>
            <span style={{ fontSize: 10.5, fontWeight: '700', color: '#0F172A' }}>
              {serverHost === 'localhost' ? 'USB Direct' : 'Wi-Fi Network'}
            </span>
          </button>

          {/* Active Hotel Pill */}
          {selectedHotel && (
            <button
              data-testid="selected-hotel-pill"
              onClick={() => setStep('hotel')}
              style={{
                background: '#FFFFFF',
                border: '1px solid #FDE68A',
                padding: '4px 8px',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
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
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    objectFit: 'cover',
                    border: '1px solid #E2E8F0',
                    background: '#FFFFFF',
                  }}
                />
              ) : (
                <span style={{ fontSize: 13 }}>🏨</span>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 8.5, color: '#B45309', fontWeight: '800', textTransform: 'uppercase' }}>
                  Change Hotel ▼
                </span>
                <span style={{ fontSize: 11, color: '#1E293B', fontWeight: '700', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedHotel.name}
                </span>
              </div>
            </button>
          )}
        </div>
      </div>

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
      {/* STEP 3: CHOOSE PERSON ("DEKO TUM KON HO: RAJESH, SURESH...")   */}
      {/* ------------------------------------------------------------- */}
      {step === 'person' && (
        <div id="step-person-section" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Back Button & Selected Portal Pill */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <button
              data-testid="back-to-portals-btn"
              onClick={() => setStep('portal')}
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
              ← Back to Portals
            </button>

            <span
              style={{
                fontSize: 11.5,
                fontWeight: '800',
                color: portals[selectedPortal].color,
                background: '#FFFFFF',
                border: `1.5px solid ${portals[selectedPortal].color}`,
                padding: '4px 10px',
                borderRadius: 10,
              }}
            >
              {portals[selectedPortal].emoji} {portals[selectedPortal].label}
            </span>
          </div>

          <div style={{ marginBottom: 12 }}>
            <h2 style={{ fontSize: 19, fontWeight: '800', color: '#0F172A', margin: '0 0 3px', letterSpacing: '-0.02em' }}>
              👤 Who are you today?
            </h2>
            <p style={{ fontSize: 12.5, color: '#64748B', fontWeight: '500', margin: 0 }}>
              Select your profile to unlock this workstation:
            </p>
          </div>

          {/* Role Filter Chips */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, marginBottom: 12 }}>
            {['ALL', 'WAITER', 'CASHIER', 'CHEF', 'RECEPTION'].map((rf) => (
              <button
                key={rf}
                onClick={() => setRoleFilter(rf)}
                style={{
                  background: roleFilter === rf ? '#1E293B' : '#FFFFFF',
                  color: roleFilter === rf ? '#FFFFFF' : '#64748B',
                  border: roleFilter === rf ? '1px solid #1E293B' : '1px solid #E2E8F0',
                  padding: '5px 11px',
                  borderRadius: 16,
                  fontSize: 11,
                  fontWeight: '700',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {rf === 'ALL' ? '🌟 All Staff' : rf}
              </button>
            ))}
          </div>

          {/* Staff Roster List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, flex: 1, overflowY: 'auto' }}>
            {displayedStaff.length === 0 ? (
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1.5px dashed #CBD5E1',
                  borderRadius: 14,
                  padding: '20px 16px',
                  textAlign: 'center',
                  color: '#64748B',
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 4 }}>📋</div>
                <div style={{ fontSize: 13.5, fontWeight: '700', color: '#1E293B', marginBottom: 2 }}>
                  No Staff Found in this Category
                </div>
                <div style={{ fontSize: 11.5, marginBottom: 12 }}>
                  Switch filter to "All Staff" or log in manually with your corporate email.
                </div>
                <button
                  onClick={() => setRoleFilter('ALL')}
                  style={{
                    background: '#D97706',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '8px 14px',
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
              displayedStaff.map((st) => (
                <button
                  key={st.id}
                  data-testid={`staff-profile-card-${st.id}`}
                  onClick={() => handleSelectPerson(st)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '11px 13px',
                    background: selectedStaff?.id === st.id ? '#FFFBEB' : '#FFFFFF',
                    borderRadius: 16,
                    border: selectedStaff?.id === st.id ? '2px solid #F59E0B' : '1px solid #E2E8F0',
                    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.03)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                  }}
                >
                  <div style={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}>
                    <img
                      src={st.photo}
                      alt={st.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: 12,
                        border: '1.5px solid #E2E8F0',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: -2,
                        right: -2,
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        background: '#10B981',
                        border: '2px solid #FFFFFF',
                      }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
                        {st.name}
                      </span>
                      <span
                        style={{
                          fontSize: 9.5,
                          fontWeight: '800',
                          color: st.role === 'WAITER' ? '#D97706' : st.role === 'CASHIER' ? '#059669' : '#2563EB',
                          background: st.role === 'WAITER' ? '#FEF3C7' : st.role === 'CASHIER' ? '#D1FAE5' : '#DBEAFE',
                          padding: '2px 6px',
                          borderRadius: 6,
                          textTransform: 'uppercase',
                        }}
                      >
                        {st.role}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>
                      {st.section} · {st.tables}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
                        padding: '4px 7px',
                        fontSize: 11,
                        fontWeight: '700',
                        color: '#475569',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                      }}
                    >
                      <span>📷</span>
                      <span>Photo</span>
                    </button>
                    <div style={{ fontSize: 12, color: '#D97706', fontWeight: '800' }}>
                      Unlock ➔
                    </div>
                  </div>
                </button>
              ))
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
          background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 55%, #4338CA 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          boxShadow: '0 6px 18px rgba(30, 27, 75, 0.18)',
          marginTop: 'auto',
          border: '1px solid rgba(255, 255, 255, 0.15)',
        }}
      >
        <div style={{ zIndex: 2, flex: 1, paddingRight: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 8.5, fontWeight: '800', color: '#C7D2FE', letterSpacing: '0.08em', textTransform: 'uppercase', background: 'rgba(255,255,255,0.12)', padding: '2px 6px', borderRadius: 4 }}>
              ⚡ SPICEHUB WORKFORCE
            </span>
            <span style={{ fontSize: 10, color: '#34D399', fontWeight: '700' }}>● Secure Terminal</span>
          </div>
          <div style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF', lineHeight: 1.3 }}>
            Hotel ➔ Portal ➔ Person ➔ Workstation
          </div>
          <div style={{ fontSize: 10, color: '#E0E7FF', marginTop: 2 }}>
            Instant authenticated session · Zero secondary login
          </div>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(255,255,255,0.25)', overflow: 'hidden' }}>
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

      {/* ------------------------------------------------------------- */}
      {/* STEP 4: AUTHENTICATION MODAL (PIN vs EMAIL/PASSWORD)           */}
      {/* ------------------------------------------------------------- */}
      {showAuthModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(4px)',
            zIndex: 110,
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
              padding: '20px 18px',
              boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
              maxHeight: '92vh',
              overflowY: 'auto',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {selectedStaff?.photo ? (
                  <img
                    src={selectedStaff.photo}
                    alt={selectedStaff.name}
                    style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover', border: '1.5px solid #F59E0B' }}
                  />
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                    👤
                  </div>
                )}
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', margin: 0 }}>
                    {selectedStaff?.name}
                  </h2>
                  <span style={{ fontSize: 11, color: '#B45309', fontWeight: '700' }}>
                    {selectedStaff?.role} · {portals[selectedPortal].label}
                  </span>
                </div>
              </div>
              <button
                data-testid="close-auth-modal-btn"
                onClick={() => {
                  setShowAuthModal(false);
                  setPin('');
                  setAuthError('');
                }}
                style={{ background: 'none', border: 'none', fontSize: 20, color: '#64748B', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Mode Switcher */}
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
                data-testid="auth-mode-pin-tab"
                onClick={() => { setAuthMode('pin'); setAuthError(''); }}
                style={{
                  flex: 1,
                  padding: '7px 0',
                  borderRadius: 10,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: '700',
                  cursor: 'pointer',
                  background: authMode === 'pin' ? '#FFFFFF' : 'transparent',
                  color: authMode === 'pin' ? '#D97706' : '#64748B',
                  boxShadow: authMode === 'pin' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                🔢 4-Digit PIN
              </button>
              <button
                type="button"
                data-testid="auth-mode-email-tab"
                onClick={() => { setAuthMode('email'); setAuthError(''); }}
                style={{
                  flex: 1,
                  padding: '7px 0',
                  borderRadius: 10,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: '700',
                  cursor: 'pointer',
                  background: authMode === 'email' ? '#FFFFFF' : 'transparent',
                  color: authMode === 'email' ? '#D97706' : '#64748B',
                  boxShadow: authMode === 'email' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                📧 Email & Password
              </button>
            </div>

            {/* Error Message */}
            {authError && (
              <div
                style={{
                  background: authError.includes('Pending') ? '#FEF3C7' : '#FEE2E2',
                  border: authError.includes('Pending') ? '1px solid #FCD34D' : '1px solid #FCA5A5',
                  color: authError.includes('Pending') ? '#92400E' : '#B91C1C',
                  fontSize: 11.5,
                  fontWeight: '700',
                  padding: '8px 12px',
                  borderRadius: 10,
                  marginBottom: 12,
                  lineHeight: 1.35,
                }}
              >
                {authError}
              </div>
            )}

            {/* MODE 1: 4-DIGIT PIN */}
            {authMode === 'pin' ? (
              <div>
                <p style={{ textAlign: 'center', color: '#64748B', fontSize: 11.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                  Enter 4-Digit Staff PIN
                </p>

                {/* PIN Dots */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 16 }}>
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: i < pin.length ? '#F59E0B' : '#FFFFFF',
                        border: i < pin.length ? '2px solid #D97706' : '2px solid #CBD5E1',
                        transition: 'all 0.15s ease',
                        boxShadow: i < pin.length ? '0 0 10px rgba(245, 158, 11, 0.35)' : 'none',
                      }}
                    />
                  ))}
                </div>

                {/* Numpad */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 8,
                    marginBottom: 14,
                  }}
                >
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Clr', '0', '⌫'].map((k) => (
                    <button
                      key={k}
                      type="button"
                      data-testid={`numpad-key-${k}`}
                      disabled={isSubmitting}
                      onClick={() => {
                        if (k === 'Clr') setPin('');
                        else if (k === '⌫') setPin((p) => p.slice(0, -1));
                        else handlePinDigit(k);
                      }}
                      style={{
                        padding: '12px 0',
                        fontSize: k === 'Clr' || k === '⌫' ? 14 : 20,
                        fontWeight: '800',
                        color: k === 'Clr' ? '#DC2626' : '#1E293B',
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: 12,
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      }}
                    >
                      {k}
                    </button>
                  ))}
                </div>

                {/* Resend Email OTP Reset Link */}
                <div style={{ textAlign: 'center', marginTop: 10 }}>
                  <button
                    type="button"
                    data-testid="resend-otp-trigger-btn"
                    onClick={() => {
                      setOtpEmail(selectedStaff?.email || '');
                      setOtpCode('');
                      setNewOtpPin('');
                      setConfirmOtpPin('');
                      setOtpStep('request');
                      setOtpStatusMsg(null);
                      setOtpPreviewHint('');
                      setShowOtpModal(true);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#4F46E5',
                      fontSize: 12,
                      fontWeight: '700',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    🔐 Set / Reset PIN with Email OTP (Resend)
                  </button>
                </div>
              </div>
            ) : (
              /* MODE 2: EMAIL & PASSWORD */
              <form onSubmit={executeEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                    Staff Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. raju.waiter@royalpalm.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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

                <div>
                  <label style={{ fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                  disabled={isSubmitting}
                  style={{
                    background: '#D97706',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '12px 0',
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: '700',
                    cursor: 'pointer',
                    marginTop: 6,
                    boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)',
                  }}
                >
                  {isSubmitting ? 'Verifying...' : '🔓 Sign In to Workstation'}
                </button>
              </form>
            )}

            {/* Quick Demo Bypass Button */}
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed #E2E8F0', textAlign: 'center' }}>
              <button
                type="button"
                data-testid="demo-quick-launch-btn"
                onClick={() => {
                  if (selectedStaff) {
                    setActiveStaffUser({
                      id: selectedStaff.id,
                      name: selectedStaff.name,
                      role: selectedStaff.role,
                      email: selectedStaff.email,
                    });
                    setShowAuthModal(false);
                    setStep('workstation');
                  }
                }}
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  color: '#475569',
                  padding: '8px 12px',
                  borderRadius: 10,
                  fontSize: 11.5,
                  fontWeight: '700',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                ⚡ Instant Launch (Demo Active Session)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* RESEND EMAIL OTP MODAL (PIN VERIFICATION & RESET)              */}
      {/* ------------------------------------------------------------- */}
      {showOtpModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(5px)',
            zIndex: 120,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 390,
              background: '#FFFFFF',
              borderRadius: 24,
              padding: '22px 20px',
              boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 24 }}>🔐</span>
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: '800', color: '#0F172A', margin: 0 }}>
                    Email OTP Verification
                  </h2>
                  <span style={{ fontSize: 11, color: '#4F46E5', fontWeight: '700' }}>
                    Powered by Resend API Security
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowOtpModal(false);
                  setOtpStatusMsg(null);
                  setOtpPreviewHint('');
                }}
                style={{ background: 'none', border: 'none', fontSize: 20, color: '#64748B', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.4, margin: '0 0 14px' }}>
              To verify identity and prevent unauthorized PIN creation, a 6-digit OTP is sent to your registered email via Resend.
            </p>

            {/* Status Message */}
            {otpStatusMsg && (
              <div
                style={{
                  background: otpStatusMsg.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                  border: otpStatusMsg.type === 'success' ? '1px solid #A7F3D0' : '1px solid #FECACA',
                  color: otpStatusMsg.type === 'success' ? '#065F46' : '#B91C1C',
                  fontSize: 12,
                  fontWeight: '700',
                  padding: '9px 12px',
                  borderRadius: 10,
                  marginBottom: 14,
                  lineHeight: 1.35,
                }}
              >
                {otpStatusMsg.text}
              </div>
            )}

            {/* Dev Mode OTP Hint */}
            {otpPreviewHint && (
              <div
                style={{
                  background: '#EEF2FF',
                  border: '1.5px dashed #6366F1',
                  color: '#3730A3',
                  fontSize: 12,
                  fontWeight: '800',
                  padding: '8px 12px',
                  borderRadius: 10,
                  marginBottom: 14,
                  textAlign: 'center',
                }}
              >
                🔑 Development Code: <span style={{ letterSpacing: 3, fontSize: 14 }}>{otpPreviewHint}</span>
              </div>
            )}

            {/* STEP 1: REQUEST OTP */}
            {otpStep === 'request' ? (
              <form onSubmit={handleSendPinOtp} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                    Registered Staff Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. raju.waiter@royalpalm.com"
                    value={otpEmail}
                    onChange={(e) => setOtpEmail(e.target.value)}
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
                    background: '#4F46E5',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '12px 0',
                    borderRadius: 12,
                    fontSize: 13.5,
                    fontWeight: '700',
                    cursor: 'pointer',
                    marginTop: 6,
                    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
                  }}
                >
                  {isOtpSubmitting ? 'Sending via Resend...' : '📩 Send 6-Digit Verification OTP'}
                </button>
              </form>
            ) : (
              /* STEP 2: VERIFY OTP & SET PIN */
              <form onSubmit={handleVerifyPinOtp} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                    Enter 6-Digit OTP Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1.5px solid #4F46E5',
                      fontSize: 18,
                      fontWeight: '800',
                      letterSpacing: 4,
                      textAlign: 'center',
                      boxSizing: 'border-box',
                      color: '#1E1B4B',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 10.5, fontWeight: '700', color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                      New 4-Digit PIN
                    </label>
                    <input
                      type="password"
                      required
                      maxLength={6}
                      placeholder="••••"
                      value={newOtpPin}
                      onChange={(e) => setNewOtpPin(e.target.value.replace(/\D/g, ''))}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: '1px solid #CBD5E1',
                        fontSize: 16,
                        textAlign: 'center',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 10.5, fontWeight: '700', color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                      Confirm PIN
                    </label>
                    <input
                      type="password"
                      required
                      maxLength={6}
                      placeholder="••••"
                      value={confirmOtpPin}
                      onChange={(e) => setConfirmOtpPin(e.target.value.replace(/\D/g, ''))}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: '1px solid #CBD5E1',
                        fontSize: 16,
                        textAlign: 'center',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isOtpSubmitting}
                  style={{
                    background: '#10B981',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '12px 0',
                    borderRadius: 12,
                    fontSize: 13.5,
                    fontWeight: '700',
                    cursor: 'pointer',
                    marginTop: 6,
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                  }}
                >
                  {isOtpSubmitting ? 'Verifying...' : '🚀 Verify OTP & Activate PIN'}
                </button>

                <div style={{ textAlign: 'center', marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => setOtpStep('request')}
                    style={{ background: 'none', border: 'none', color: '#64748B', fontSize: 11.5, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    ← Re-send OTP to different email
                  </button>
                </div>
              </form>
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

            {/* Quick Preset Avatars */}
            <div>
              <label style={{ fontSize: 10.5, fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
                Choose Luxury Steward Photo Preset:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {PRESET_AVATARS.map((pa, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCustomPhotoUrl(pa.url)}
                    style={{
                      border: customPhotoUrl === pa.url ? '2px solid #F59E0B' : '1px solid #CBD5E1',
                      borderRadius: 12,
                      overflow: 'hidden',
                      padding: 2,
                      background: '#FFFFFF',
                      cursor: 'pointer',
                      aspectRatio: '1/1',
                    }}
                  >
                    <img src={pa.url} alt={pa.label} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} />
                  </button>
                ))}
              </div>
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
                placeholder="https://images.unsplash.com/..."
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
                background: photoSaveSuccess
                  ? '#10B981'
                  : 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: '800',
                fontSize: 13,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(217, 119, 6, 0.25)',
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
