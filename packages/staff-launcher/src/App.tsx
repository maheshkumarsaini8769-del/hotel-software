import { useMemo, useState, useEffect, useRef } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { SpiceHubClient } from '@spicehub/api-client';
import { QRCodeSVG } from 'qrcode.react';
import logoImg from './assets/logo.png';
import bannerCardImg from './assets/banner_card.png';

declare const __SPICEHUB_DEV_LAN_IP__: string | undefined;

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
  serviceCapabilities?: Record<string, boolean>;
  contactPhone?: string;
  updatedAt?: string;
}

const FALLBACK_HOTEL_COVER = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400">
  <rect width="800" height="400" fill="#0f172a"/>
  <path d="M260 320V128h280v192" fill="#1e293b"/>
  <path d="M240 320h320M300 128V80h200v48" fill="none" stroke="#2563eb" stroke-width="8"/>
  <g fill="#93c5fd">
    <rect x="296" y="160" width="40" height="48" rx="4"/>
    <rect x="380" y="160" width="40" height="48" rx="4"/>
    <rect x="464" y="160" width="40" height="48" rx="4"/>
    <rect x="296" y="232" width="40" height="48" rx="4"/>
    <rect x="464" y="232" width="40" height="48" rx="4"/>
  </g>
  <rect x="372" y="232" width="56" height="88" fill="#2563eb"/>
</svg>
`);

const FALLBACK_HOTEL_LOGO = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
  <rect width="120" height="120" rx="24" fill="#2563eb"/>
  <text x="60" y="72" fill="#ffffff" font-family="system-ui, sans-serif" font-size="36" font-weight="900" text-anchor="middle">S</text>
</svg>
`);

const DEFAULT_HOTEL_COVER = FALLBACK_HOTEL_COVER;
const DEFAULT_HOTEL_LOGO = FALLBACK_HOTEL_LOGO;

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

type WizardStep = 'hotel' | 'onboard' | 'portal' | 'person' | 'workstation';

export type OnboardWizardStep = 'details' | 'portals' | 'features' | 'bill' | 'payment' | 'success';

export interface OnboardHotelForm {
  hotelName: string;
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  adminPassword: string;
  hotelCode?: string;
  staffPin?: string;
  streetAddress?: string;
  city: string;
  state: string;
  latitude?: number;
  longitude?: number;
  logoUrl: string;
}

export const LUXURY_LOGO_PRESETS = [
  {
    id: 'heritage',
    title: 'Heritage Palace',
    url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'resort',
    title: 'Boutique Resort',
    url: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'finedine',
    title: 'Royal Crown Dine',
    url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'suites',
    title: 'Suites & Spa',
    url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=200&auto=format&fit=crop&q=80',
  },
];

export const ONBOARD_PORTAL_CATALOG = [
  {
    id: 'waiter',
    name: 'Waiter App',
    category: 'Floor Operations',
    priceINR: 999,
    desc: 'Take table & KOT orders',
  },
  {
    id: 'reception',
    name: 'Reception Desk',
    category: 'Front Office',
    priceINR: 1499,
    desc: 'Room check-in & guest bills',
  },
  {
    id: 'kds',
    name: 'Kitchen Display (KDS)',
    category: 'Culinary Ops',
    priceINR: 799,
    desc: 'Live kitchen order screen',
  },
  {
    id: 'cashier',
    name: 'Cashier POS',
    category: 'Billing & Settlement',
    priceINR: 1199,
    desc: 'Walk-in & counter billing',
  },
  {
    id: 'customer',
    name: 'Table QR Menu',
    category: 'Digital Guest Experience',
    priceINR: 899,
    desc: 'Self-ordering at tables',
  },
  {
    id: 'guest',
    name: 'Room Service QR',
    category: 'Digital Guest Experience',
    priceINR: 699,
    desc: 'In-room guest requests',
  },
  {
    id: 'admin',
    name: 'Admin Console',
    category: 'Core Infrastructure',
    priceINR: 0,
    desc: 'Manage rooms, staff & reports',
    isFree: true,
  },
];

export const ONBOARD_FEATURE_CATALOG = [
  {
    id: 'pms_inventory',
    title: 'Room Tracking',
    desc: 'Live room status and cleaning updates',
  },
  {
    id: 'qr_table_ordering',
    title: 'QR Menu Ordering',
    desc: 'Instant dine-in and room orders',
  },
  {
    id: 'gst_invoicing',
    title: 'GST Billing',
    desc: 'Automatic 18% GST tax invoices',
  },
  {
    id: 'whatsapp_alerts',
    title: 'WhatsApp & SMS Alerts',
    desc: 'Send bills and booking updates',
  },
  {
    id: 'staff_attendance',
    title: 'Staff PIN Login',
    desc: 'Fast 4-digit staff shift sign-in',
  },
  {
    id: 'kds_routing',
    title: 'Kitchen Routing',
    desc: 'Route dishes to kitchen stations',
  },
];

export function generateStaffHotelCodeFrom(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  let prefix = 'SH';
  if (words.length >= 2) {
    prefix = (words[0][0] + words[1][0]).toUpperCase();
  } else if (words.length === 1 && words[0].length >= 2) {
    prefix = words[0].slice(0, 2).toUpperCase();
  }
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${digits}`;
}

function normalizeApiHost(value: string): string {
  return value.trim().replace(/\/api\/v1\/?$/i, '').replace(/\/+$/, '');
}

function isValidStaffHotelCode(code: string): boolean {
  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return /^[A-Z0-9]{4,10}$/.test(normalized);
}

export function App() {
  const [step, setStep] = useState<WizardStep>('hotel');
  const [selectedHotel, setSelectedHotel] = useState<ActiveHotel | null>(null);
  const [hotelCode, setHotelCode] = useState('');
  const [hotelAccessToken, setHotelAccessToken] = useState('');
  const [hotelCodeError, setHotelCodeError] = useState<string | null>(null);
  const [isVerifyingHotelCode, setIsVerifyingHotelCode] = useState(false);
  const [availableHotels, setAvailableHotels] = useState<ActiveHotel[]>([]);
  const [loadingHotels, setLoadingHotels] = useState(false);
  const portalIframeRef = useRef<HTMLIFrameElement | null>(null);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);

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

  // Read-only Staff Compensation & Salary Ledger Summary
  const [selectedStaffSalary, setSelectedStaffSalary] = useState<{
    baseSalary: number;
    totalPaid: number;
    advancesTaken: number;
    netPayable: number;
  } | null>(null);

  useEffect(() => {
    if (!selectedStaff?.id) {
      setSelectedStaffSalary(null);
      return;
    }
    let isMounted = true;
    fetch(`${API_URL}/api/v1/payroll/ledger/${selectedStaff.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && isMounted) {
          setSelectedStaffSalary({
            baseSalary: data.summary?.baseSalary || 0,
            totalPaid: data.summary?.totalPaid || 0,
            advancesTaken: data.summary?.advancesTaken || 0,
            netPayable: data.summary?.netPayable || 0,
          });
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [selectedStaff?.id]);

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

  // Onboard Hotel Self-Service Page State (all inputs start empty — no auto-fill)
  const [addHotelStep, setAddHotelStep] = useState<OnboardWizardStep>('details');
  const [showOptionalOnboardDetails, setShowOptionalOnboardDetails] = useState(false);
  const [addHotelForm, setAddHotelForm] = useState<OnboardHotelForm>(() => ({
    hotelName: '',
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    adminPassword: '',
    hotelCode: '',
    staffPin: '',
    streetAddress: '',
    city: '',
    state: '',
    latitude: undefined,
    longitude: undefined,
    logoUrl: '',
  }));
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);

  const handleFetchCurrentGps = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      setGpsStatus('Accessing device satellite GPS...');
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(6));
          const lng = parseFloat(pos.coords.longitude.toFixed(6));
          const acc = Math.round(pos.coords.accuracy || 10);
          setAddHotelForm((prev) => ({
            ...prev,
            latitude: lat,
            longitude: lng,
          }));
          setGpsStatus(`GPS coordinates detected: ${lat}, ${lng} (±${acc}m accuracy)`);

          // Attempt reverse geocoding via OpenStreetMap Nominatim
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 4000);
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`,
              { signal: controller.signal, headers: { 'Accept': 'application/json' } }
            );
            clearTimeout(timer);
            if (res.ok) {
              const data = await res.json();
              const addr = data?.address;
              if (addr) {
                const autoCity = addr.city || addr.town || addr.village || addr.suburb || addr.county || '';
                const autoState = addr.state || '';
                const autoStreet = [addr.road, addr.neighbourhood, addr.suburb].filter(Boolean).join(', ');
                setAddHotelForm((prev) => ({
                  ...prev,
                  city: prev.city || autoCity,
                  state: prev.state || autoState,
                  streetAddress: prev.streetAddress || autoStreet,
                }));
              }
            }
          } catch {
            // Reverse geocode is best effort
          }
        },
        (err) => {
          console.warn('GPS error:', err);
          setGpsStatus(`GPS error: ${err.message || 'Permission denied or timed out'}.`);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    } else {
      setGpsStatus('GPS is not supported on this device/browser.');
    }
  };

  const handleOnboardLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 512;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.88);
          setAddHotelForm((prev) => ({
            ...prev,
            logoUrl: compressed,
          }));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const [selectedOnboardPortals, setSelectedOnboardPortals] = useState<string[]>([
    'waiter',
    'reception',
    'kds',
    'cashier',
    'customer',
    'guest',
    'admin',
  ]);
  const [selectedOnboardFeatures, setSelectedOnboardFeatures] = useState<string[]>([
    'pms_inventory',
    'qr_table_ordering',
    'gst_invoicing',
    'whatsapp_alerts',
    'staff_attendance',
    'kds_routing',
  ]);
  const [onboardBillingCycle, setOnboardBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [paymentTimeRemaining, setPaymentTimeRemaining] = useState(300);
  const [isProcessingOnboardPayment, setIsProcessingOnboardPayment] = useState(false);
  const [onboardError, setOnboardError] = useState<string | null>(null);
  const [onboardSuccessData, setOnboardSuccessData] = useState<any | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showCreatedPassword, setShowCreatedPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showSubmittedDetailsModal, setShowSubmittedDetailsModal] = useState(false);

  // Split WhatsApp & Email OTP Verification states for Step 1
  const [onboardEmailOtp, setOnboardEmailOtp] = useState('');
  const [isEmailOtpSent, setIsEmailOtpSent] = useState(false);
  const [isEmailOtpVerified, setIsEmailOtpVerified] = useState(false);
  const [isEmailOtpSending, setIsEmailOtpSending] = useState(false);
  const [isEmailOtpVerifying, setIsEmailOtpVerifying] = useState(false);
  const [emailOtpError, setEmailOtpError] = useState<string | null>(null);
  const [emailOtpSuccessMsg, setEmailOtpSuccessMsg] = useState<string | null>(null);
  const [devEmailOtp, setDevEmailOtp] = useState('');

  const [onboardWhatsappOtp, setOnboardWhatsappOtp] = useState('');
  const [isPhoneOtpSent, setIsPhoneOtpSent] = useState(false);
  const [isPhoneOtpVerified, setIsPhoneOtpVerified] = useState(false);
  const [isPhoneOtpSending, setIsPhoneOtpSending] = useState(false);
  const [isPhoneOtpVerifying, setIsPhoneOtpVerifying] = useState(false);
  const [phoneOtpError, setPhoneOtpError] = useState<string | null>(null);
  const [phoneOtpSuccessMsg, setPhoneOtpSuccessMsg] = useState<string | null>(null);
  const [devPhoneOtp, setDevPhoneOtp] = useState('');

  // Combined compatibility flags
  const isOnboardOtpVerified = isEmailOtpVerified && isPhoneOtpVerified;
  const isOnboardOtpSent = isEmailOtpSent || isPhoneOtpSent;
  const isOnboardOtpSending = isEmailOtpSending || isPhoneOtpSending;
  const isOnboardOtpVerifying = isEmailOtpVerifying || isPhoneOtpVerifying;
  const devOnboardWhatsappOtp = devPhoneOtp;
  const devOnboardEmailOtp = devEmailOtp;
  const onboardOtpError = emailOtpError || phoneOtpError;
  const onboardOtpSuccessMsg = emailOtpSuccessMsg || phoneOtpSuccessMsg;

  const handleSendEmailOtp = async () => {
    const email = addHotelForm.adminEmail.trim();
    if (!email.includes('@')) {
      setEmailOtpError('Please enter a valid admin email first.');
      return;
    }
    setIsEmailOtpSending(true);
    setEmailOtpError(null);
    setEmailOtpSuccessMsg(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/onboarding/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, channel: 'email', hotelName: addHotelForm.hotelName || 'SpiceHub' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to send Email OTP');
      }
      setIsEmailOtpSent(true);
      setEmailOtpSuccessMsg(data.message || 'OTP sent to your email successfully via Resend.');
      if (data.devEmailOtp) setDevEmailOtp(data.devEmailOtp);
    } catch (err: any) {
      setEmailOtpError(err.message || 'Failed to send Email OTP');
    } finally {
      setIsEmailOtpSending(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    const email = addHotelForm.adminEmail.trim();
    const emailOtp = onboardEmailOtp.trim();
    if (!emailOtp) {
      setEmailOtpError('Please enter the 6-digit email OTP.');
      return;
    }
    setIsEmailOtpVerifying(true);
    setEmailOtpError(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/onboarding/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, emailOtp, channel: 'email' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Email OTP verification failed');
      }
      setIsEmailOtpVerified(true);
      setEmailOtpSuccessMsg('✓ Email verified successfully!');
    } catch (err: any) {
      setEmailOtpError(err.message || 'Email OTP verification failed');
    } finally {
      setIsEmailOtpVerifying(false);
    }
  };

  const handleSendPhoneOtp = async () => {
    const phone = addHotelForm.adminPhone.trim();
    if (phone.length < 10) {
      setPhoneOtpError('Please enter a valid 10-digit phone number first.');
      return;
    }
    setIsPhoneOtpSending(true);
    setPhoneOtpError(null);
    setPhoneOtpSuccessMsg(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/onboarding/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, channel: 'phone', hotelName: addHotelForm.hotelName || 'SpiceHub' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to send WhatsApp OTP');
      }
      setIsPhoneOtpSent(true);
      setPhoneOtpSuccessMsg(data.message || 'OTP sent to WhatsApp successfully.');
      if (data.devWhatsAppOtp) setDevPhoneOtp(data.devWhatsAppOtp);
    } catch (err: any) {
      setPhoneOtpError(err.message || 'Failed to send WhatsApp OTP');
    } finally {
      setIsPhoneOtpSending(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    const phone = addHotelForm.adminPhone.trim();
    const whatsappOtp = onboardWhatsappOtp.trim();
    if (!whatsappOtp) {
      setPhoneOtpError('Please enter the 6-digit WhatsApp OTP.');
      return;
    }
    setIsPhoneOtpVerifying(true);
    setPhoneOtpError(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/onboarding/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, whatsappOtp, channel: 'phone' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'WhatsApp OTP verification failed');
      }
      setIsPhoneOtpVerified(true);
      setPhoneOtpSuccessMsg('✓ WhatsApp verified successfully!');
    } catch (err: any) {
      setPhoneOtpError(err.message || 'WhatsApp OTP verification failed');
    } finally {
      setIsPhoneOtpVerifying(false);
    }
  };

  const handleSendOnboardingOtp = async () => {
    await Promise.all([handleSendEmailOtp(), handleSendPhoneOtp()]);
  };

  const handleVerifyOnboardingOtp = async () => {
    await Promise.all([handleVerifyEmailOtp(), handleVerifyPhoneOtp()]);
  };

  const handleStartOnboard = () => {
    setAddHotelForm({
      hotelName: '',
      adminName: '',
      adminEmail: '',
      adminPhone: '',
      adminPassword: '',
      hotelCode: '',
      staffPin: '',
      streetAddress: '',
      city: '',
      state: '',
      latitude: undefined,
      longitude: undefined,
      logoUrl: '',
    });
    setSelectedOnboardPortals(['waiter', 'reception', 'kds', 'cashier', 'customer', 'guest', 'admin']);
    setSelectedOnboardFeatures(ONBOARD_FEATURE_CATALOG.map((f) => f.id));
    setOnboardBillingCycle('monthly');
    setGpsStatus(null);
    setOnboardError(null);
    setOnboardSuccessData(null);
    setCopiedKey(null);
    setShowOptionalOnboardDetails(false);
    setShowAdminPassword(false);
    setShowSubmittedDetailsModal(false);
    setOnboardEmailOtp('');
    setIsEmailOtpSent(false);
    setIsEmailOtpVerified(false);
    setIsEmailOtpSending(false);
    setIsEmailOtpVerifying(false);
    setEmailOtpError(null);
    setEmailOtpSuccessMsg(null);
    setDevEmailOtp('');
    setOnboardWhatsappOtp('');
    setIsPhoneOtpSent(false);
    setIsPhoneOtpVerified(false);
    setIsPhoneOtpSending(false);
    setIsPhoneOtpVerifying(false);
    setPhoneOtpError(null);
    setPhoneOtpSuccessMsg(null);
    setDevPhoneOtp('');
    setAddHotelStep('details');
    setStep('onboard');
  };

  const handleOnboardBack = () => {
    if (isProcessingOnboardPayment) return;
    if (addHotelStep === 'portals') {
      setAddHotelStep('details');
    } else if (addHotelStep === 'bill') {
      setAddHotelStep('portals');
    } else if (addHotelStep === 'payment') {
      setAddHotelStep('bill');
    } else {
      setStep('hotel');
    }
  };

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
      const data = await apiClient.request<{ success: boolean; message?: string }>(
        'PATCH',
        `/api/v1/hotel-staff/${photoTargetStaff.id}`,
        { avatar: newUrl },
        undefined,
        { 'x-hotel-id': selectedHotel.id }
      );
      if (data.success) {
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

  const configuredApiUrl =
    import.meta.env.VITE_API_URL?.trim() ||
    import.meta.env.VITE_API_BASE?.trim() ||
    'https://spicehub-backend.vercel.app';
  const PROD_API_BASE = normalizeApiHost(configuredApiUrl);
  const PROD_SOCKET_URL =
    import.meta.env.VITE_SOCKET_URL?.trim() || 'https://spicehub-socket-server.onrender.com';
  const BUILT_IN_LAN_IP =
    typeof __SPICEHUB_DEV_LAN_IP__ !== 'undefined' ? __SPICEHUB_DEV_LAN_IP__.trim() : '';
  const DEV_LAN_IP =
    import.meta.env.VITE_LAN_HOST?.trim() ||
    (BUILT_IN_LAN_IP && BUILT_IN_LAN_IP !== '127.0.0.1' ? BUILT_IN_LAN_IP : '127.0.0.1');

  // Dev-only switch: when the bundle is built with VITE_LOCAL_PORTALS=true the APK
  // loads each portal from 127.0.0.1 over an `adb reverse` tunnel instead of the cloud.
  const USE_LOCAL_PORTALS = import.meta.env.VITE_LOCAL_PORTALS === 'true';

  // When the PWA is served from a local dev/preview origin, the browser build must
  // talk to the same machine's backend instead of the cloud one.
  const isNativeRuntime = Capacitor.isNativePlatform();
  const browserHostname =
    typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocalBrowserOrigin =
    !isNativeRuntime &&
    (browserHostname === 'localhost' ||
      browserHostname === '127.0.0.1' ||
      /^192\.168\./.test(browserHostname) ||
      /^10\./.test(browserHostname));

  const isPrivateApiHost = (host: string) => {
    const clean = host.replace(/^https?:\/\//i, '').split(':')[0].split('/')[0].trim().toLowerCase();
    return (
      clean === 'localhost' ||
      clean === '127.0.0.1' ||
      clean === '10.0.2.2' ||
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(clean) ||
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(clean) ||
      /^172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(clean)
    );
  };

  const resolveInitialServerHost = (): string => {
    if (USE_LOCAL_PORTALS) return 'http://127.0.0.1:5000';
    if (isLocalBrowserOrigin) return `http://${browserHostname}:5000`;
    if (typeof window !== 'undefined') {
      const saved = normalizeApiHost(localStorage.getItem('spicehub_server_host') || '');
      if (saved) return saved;
    }
    return DEV_LAN_IP !== '127.0.0.1' ? `http://${DEV_LAN_IP}:5000` : PROD_API_BASE;
  };

  const [serverHost, setServerHost] = useState<string>(resolveInitialServerHost);

  const isProductionHost =
    serverHost.includes('vercel.app') ||
    serverHost.includes('onrender.com') ||
    (serverHost.startsWith('https://') && !isPrivateApiHost(serverHost));

  const BASE = serverHost.startsWith('http://') || serverHost.startsWith('https://')
    ? serverHost.replace(/\/+$/, '')
    : `http://${serverHost}`;

  // A configured host may already carry the API port (e.g. http://10.0.0.5:5000);
  // only append :5000 when the host omits one, otherwise the URL becomes invalid.
  const withApiPort = (base: string) => {
    try {
      const parsed = new URL(base);
      return parsed.port ? parsed.origin : `${parsed.origin}:5000`;
    } catch {
      return /:\d+$/.test(base) ? base : `${base}:5000`;
    }
  };

  const API_URL = USE_LOCAL_PORTALS
    ? 'http://127.0.0.1:5000'
    : isProductionHost
      ? normalizeApiHost(BASE)
      : withApiPort(BASE);
  const apiClient = useMemo(() => new SpiceHubClient({ baseUrl: API_URL }), [API_URL]);

  // Smart auto-discovery (Local USB/LAN first when reachable, Cloud Production fallback) unless manually pinned
  useEffect(() => {
    if (USE_LOCAL_PORTALS || isLocalBrowserOrigin) return;
    let active = true;
    const probeHost = async (candidate: string, timeoutMs: number): Promise<string | null> => {
      const normalized = normalizeApiHost(candidate);
      const url = normalized.startsWith('http://') || normalized.startsWith('https://')
        ? normalized
        : `http://${normalized}`;
      const apiBase = url.includes('vercel.app') || url.includes('onrender.com') || (url.startsWith('https://') && !isPrivateApiHost(url))
        ? url
        : withApiPort(url);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(`${apiBase}/api/v1/auth/active-hotels`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (res.ok) return apiBase;
      } catch {
        // Ignore probe failures
      } finally {
        clearTimeout(timer);
      }
      return null;
    };

    const discoverBackend = async () => {
      try {
        try {
          localStorage.removeItem('spicehub_server_host_manual');
        } catch {}
        const saved = normalizeApiHost(localStorage.getItem('spicehub_server_host') || '');

        const localSaved = saved && isPrivateApiHost(saved) ? saved : '';
        const lanCandidate = DEV_LAN_IP && DEV_LAN_IP !== '127.0.0.1' ? `http://${DEV_LAN_IP}:5000` : '';
        const localCandidates = Array.from(
          new Set([localSaved, 'http://127.0.0.1:5000', lanCandidate, 'http://10.0.2.2:5000'].filter(Boolean))
        );
        const localResults = await Promise.all(localCandidates.map((c) => probeHost(c, 1800)));
        const localWinner = localResults.find(Boolean);
        if (localWinner && active) {
          localStorage.setItem('spicehub_server_host', localWinner);
          setServerHost(localWinner);
          return;
        }

        const cloudWinner = await probeHost(PROD_API_BASE, 15000);
        if (cloudWinner && active) {
          localStorage.setItem('spicehub_server_host', cloudWinner);
          setServerHost(cloudWinner);
        }
      } catch {}
    };

    void discoverBackend();
    return () => {
      active = false;
    };
  }, []);

  // Self-Service Onboarding Billing & 18% GST Calculation
  const subtotalINR = useMemo(() => {
    return ONBOARD_PORTAL_CATALOG.filter((p) => selectedOnboardPortals.includes(p.id)).reduce(
      (sum, p) => sum + p.priceINR,
      0
    );
  }, [selectedOnboardPortals]);

  const discountINR = useMemo(() => {
    if (onboardBillingCycle === 'annual') {
      return Math.round(subtotalINR * 0.2); // 20% savings on annual billing
    }
    return Math.min(500, Math.floor(subtotalINR * 0.1)); // Promotional launch credit
  }, [subtotalINR, onboardBillingCycle]);

  const taxableBaseINR = Math.max(0, subtotalINR - discountINR);
  const cgstINR = Math.round(taxableBaseINR * 0.09 * 100) / 100;
  const sgstINR = Math.round(taxableBaseINR * 0.09 * 100) / 100;
  const totalGstINR = Math.round((cgstINR + sgstINR) * 100) / 100;
  const totalPayableINR = Math.round((taxableBaseINR + totalGstINR) * 100) / 100;

  useEffect(() => {
    if (step === 'onboard' && addHotelStep === 'payment') {
      setPaymentTimeRemaining(300);
      const interval = setInterval(() => {
        setPaymentTimeRemaining((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [step, addHotelStep]);

  const handleCopyText = (text: string, key: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(text);
      }
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (e) {
      console.warn('Copy failed:', e);
    }
  };

  const portalHost = import.meta.env.VITE_PORTAL_HOST?.trim();
  const portalBaseFor = (cfg: { prodUrl: string; port: number }) =>
    portalHost
      ? `http://${portalHost}:${cfg.port}`
      : USE_LOCAL_PORTALS
        ? `http://127.0.0.1:${cfg.port}`
        : cfg.prodUrl;

  const portals: Record<PortalType, { prodUrl: string; port: number; label: string; color: string; emoji: string; desc: string; roleHint: string }> = {
    waiter: {
      prodUrl: 'https://spicehub-waiter-mobile.vercel.app',
      port: 3002,
      label: 'Waiter Terminal',
      color: '#15803D',
      emoji: '🧑‍🍳',
      desc: 'Table layout, punch KOT orders, special cooking notes & split settlement.',
      roleHint: 'WAITER',
    },
    cashier: {
      prodUrl: 'https://spicehub-cashier-pos.vercel.app',
      port: 3007,
      label: 'Cashier POS & Float',
      color: '#16A34A',
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
      prodUrl: 'https://spicehub-reception-heritage.vercel.app',
      port: 3008,
      label: 'Reception Front Desk',
      color: '#15803D',
      emoji: '🛎️',
      desc: 'Guest check-ins, room inventory, printable QR codes & folio management.',
      roleHint: 'RECEPTION',
    },
  };

  const requestSystemNotificationPermission = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const permission = await LocalNotifications.requestPermissions();
        if (permission.display !== 'granted') {
          console.info('System notifications are disabled for this device.');
        }
        return;
      } catch (error) {
        console.warn('Could not request native notification permission:', error);
      }
    }

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') console.info('Browser notifications are disabled.');
      } catch (error) {
        console.warn('Could not request browser notification permission:', error);
      }
    }
  };

  useEffect(() => {
    const waiterPort = portals.waiter.port;
    const trustedOrigins = new Set([
      new URL(portals.waiter.prodUrl).origin,
      'http://localhost:3002',
      'http://127.0.0.1:3002',
      `${BASE}:${waiterPort}`,
      ...(portalHost ? [`http://${portalHost}:${waiterPort}`] : []),
    ]);

    const handlePortalNotification = (event: MessageEvent) => {
      if (event.source !== portalIframeRef.current?.contentWindow || !trustedOrigins.has(event.origin)) return;
      const payload = event.data;
      if (
        payload?.type !== 'spicehub:system-notification' ||
        typeof payload.title !== 'string' ||
        typeof payload.body !== 'string'
      ) return;

      void (async () => {
        const title = payload.title.slice(0, 100);
        const body = payload.body.slice(0, 240);
        const tag = String(payload.tag || '').slice(0, 80);

        if (Capacitor.isNativePlatform()) {
          try {
            const permission = await LocalNotifications.checkPermissions();
            if (permission.display !== 'granted') return;
            await LocalNotifications.schedule({
              notifications: [{
                id: Math.floor(Math.random() * 2_147_483_647),
                title,
                body,
                schedule: { at: new Date(Date.now() + 1000) },
                extra: { tag },
              }],
            });
          } catch (error) {
            console.error('Could not show the Waiter portal system notification:', error);
          }
          return;
        }

        // Browser PWA: surface the alert as an OS notification when permitted.
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            const notification = new Notification(title, { body, tag: tag || String(Date.now()) });
            notification.onclick = () => {
              window.focus();
              notification.close();
            };
          } catch (error) {
            console.warn('Could not show the browser system notification:', error);
          }
        }
      })();
    };

    window.addEventListener('message', handlePortalNotification);
    return () => window.removeEventListener('message', handlePortalNotification);
  }, [BASE, portalHost]);

  // GPS is optional and requested by Android only when the launcher is opened.
  useEffect(() => {
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

  // Helper: Which portals does the active property subscribe to?
  const isPortalSubscribed = (portal: PortalType): boolean => {
    const list = selectedHotel?.enabledPortals;
    if (!Array.isArray(list) || list.length === 0) return true;
    return list.includes(portal);
  };

  // Helper: Open a selected portal (then staff picks their own profile)
  const handleSelectPortal = (portal: PortalType) => {
    lastRootBackPressRef.current = 0;
    setSelectedPortal(portal);
    setRoleFilter('ALL');
    setStep('person');
  };

  // Helper: is this roster member actually assigned to the chosen terminal?
  const staffBelongsToPortal = (role: string, portal: PortalType): boolean => {
    const r = String(role || '').toUpperCase();
    if (portal === 'cashier') return r.includes('CASHIER') || r.includes('BILLING');
    if (portal === 'kds') return r.includes('CHEF') || r.includes('KITCHEN') || r.includes('KDS');
    if (portal === 'reception') return r.includes('RECEPTION') || r.includes('FRONT');
    return r.includes('WAITER') || r.includes('STEWARD') || r.includes('SERVER');
  };

  // 0. Capacitor Physical Android Back Button Event Handling
  const lastWorkstationBackPressRef = useRef<number>(0);
  const lastRootBackPressRef = useRef<number>(0);
  const [workstationExitToast, setWorkstationExitToast] = useState<string | null>(null);

  const staffStateRef = useRef({
    showAuthModal,
    showForgotPinModal,
    showPhotoModal,
    addHotelStep,
    isSubmitting,
    isOtpSubmitting,
    isProcessingOnboardPayment,
    step,
  });

  staffStateRef.current = {
    showAuthModal,
    showForgotPinModal,
    showPhotoModal,
    addHotelStep,
    isSubmitting,
    isOtpSubmitting,
    isProcessingOnboardPayment,
    step,
  };

  useEffect(() => {
    let backHandle: any = null;
    const registerBack = async () => {
      try {
        backHandle = await CapApp.addListener('backButton', () => {
          const s = staffStateRef.current;

          if (s.isSubmitting || s.isOtpSubmitting || s.isProcessingOnboardPayment) return;

          // 1. Navigate backward inside onboarding full-page flow
          if (s.step === 'onboard') {
            if (s.addHotelStep === 'success' || s.addHotelStep === 'details') {
              setStep('hotel');
            } else if (s.addHotelStep === 'payment') {
              setAddHotelStep('bill');
            } else if (s.addHotelStep === 'bill') {
              setAddHotelStep('portals');
            } else if (s.addHotelStep === 'portals') {
              setAddHotelStep('details');
            }
            return;
          }

          // 2. Close open modals first
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
              setWorkstationExitToast('Back again to choose staff');
              setTimeout(() => {
                setWorkstationExitToast(null);
              }, 2500);
              return;
            }
            setWorkstationExitToast(null);
            setStep('person');
            return;
          }

          // 3. Walk back through the flow: staff roster -> portals -> property.
          if (s.step === 'person') {
            lastRootBackPressRef.current = 0;
            setWorkstationExitToast(null);
            setStep('portal');
            return;
          }
          if (s.step === 'portal') {
            lastRootBackPressRef.current = 0;
            setWorkstationExitToast(null);
            handleChangeHotel();
            return;
          }

          // 4. Confirm exit from the property picker to avoid accidental app closure.
          const now = Date.now();
          if (now - lastRootBackPressRef.current > 2500) {
            lastRootBackPressRef.current = now;
            setWorkstationExitToast('Press back again to exit');
            setTimeout(() => setWorkstationExitToast(null), 2500);
            return;
          }
          setWorkstationExitToast(null);
          CapApp.exitApp().catch((err) => {
            console.error('Unable to exit the staff app:', err);
          });
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

  // Keep selectedHotel metadata (name, city, logoUrl, portals, capabilities) synced after edits
  useEffect(() => {
    if (!selectedHotel?.id) return;
    let active = true;
    const syncSelectedHotel = async () => {
      try {
        const res = await apiClient.auth.activeHotels();
        if (!active || !res?.success || !Array.isArray(res.data)) return;
        const fresh = res.data.find((h: any) => h.id === selectedHotel.id);
        if (fresh) {
          setSelectedHotel((prev) => (prev && prev.id === fresh.id ? { ...prev, ...fresh } : prev));
        }
      } catch {}
    };
    void syncSelectedHotel();

    const onVisible = () => {
      if (document.visibilityState !== 'hidden') void syncSelectedHotel();
    };
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    let appStateSub: any = null;
    if (Capacitor.isNativePlatform()) {
      void CapApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) void syncSelectedHotel();
      }).then((h) => {
        appStateSub = h;
      });
    }
    return () => {
      active = false;
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
      if (appStateSub && typeof appStateSub.remove === 'function') {
        void appStateSub.remove();
      }
    };
  }, [selectedHotel?.id, API_URL, apiClient]);

  // Load active hotels for direct property selection
  useEffect(() => {
    let active = true;
    const loadHotels = async () => {
      setLoadingHotels(true);
      try {
        const res = await apiClient.auth.activeHotels();
        if (active && res?.success && Array.isArray(res.data)) {
          setAvailableHotels(res.data);
        }
      } catch (e) {
        console.error('Failed to load active hotels:', e);
      } finally {
        if (active) setLoadingHotels(false);
      }
    };
    void loadHotels();
    return () => { active = false; };
  }, [apiClient, serverHost, step]);

  const handleSelectHotelDirectly = (hotel: ActiveHotel) => {
    setSelectedHotel(hotel);
    localStorage.setItem('selectedHotel', JSON.stringify(hotel));
    localStorage.setItem('spicehub_hotel_id', hotel.id);
    localStorage.setItem('hotelId', hotel.id);
    setStaffList([]);
    setSelectedStaff(null);
    setStep('portal');
  };

  const verifyHotelCodeInternal = async (targetCode: string): Promise<boolean> => {
    const cleanedCode = targetCode.trim().toUpperCase();
    if (isVerifyingHotelCode || !isValidStaffHotelCode(cleanedCode)) return false;
    setIsVerifyingHotelCode(true);
    setHotelCodeError(null);
    try {
      const result = await apiClient.auth.verifyStaffHotelCode(cleanedCode);
      if (!result.success || !result.data?.accessToken || !result.data?.hotel?.id) {
        throw new Error('Hotel code verification returned an incomplete response.');
      }
      setSelectedHotel(result.data.hotel as ActiveHotel);
      setHotelAccessToken(result.data.accessToken);
      setHotelCode('');
      setStaffList([]);
      setSelectedStaff(null);
      setStep('portal');
      return true;
    } catch (error: any) {
      setHotelCodeError(error?.message || 'Could not verify the hotel code. Check your connection and try again.');
      return false;
    } finally {
      setIsVerifyingHotelCode(false);
    }
  };

  const handleVerifyHotelCode = async (event: React.FormEvent) => {
    event.preventDefault();
    await verifyHotelCodeInternal(hotelCode);
  };

  const handleCompleteOnboardPayment = async () => {
    setIsProcessingOnboardPayment(true);
    setOnboardError(null);
    try {
      const endpoint = `${API_URL}/api/v1/auth/register`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelName: addHotelForm.hotelName.trim(),
          adminName: addHotelForm.adminName.trim(),
          adminEmail: addHotelForm.adminEmail.trim(),
          adminPassword: addHotelForm.adminPassword.trim(),
          contactPhone: addHotelForm.adminPhone.trim(),
          hotelCode: undefined,
          staffPin: undefined,
          streetAddress: addHotelForm.streetAddress?.trim() || '',
          city: addHotelForm.city.trim() || 'Jaipur',
          state: addHotelForm.state.trim() || 'Rajasthan',
          latitude: addHotelForm.latitude || 26.9124,
          longitude: addHotelForm.longitude || 75.7873,
          coordinates: {
            latitude: addHotelForm.latitude || 26.9124,
            longitude: addHotelForm.longitude || 75.7873,
          },
          logoUrl: (addHotelForm.logoUrl || '').trim(),
          enabledPortals: selectedOnboardPortals,
          subscribedFeatures: selectedOnboardFeatures && selectedOnboardFeatures.length > 0 ? selectedOnboardFeatures : ONBOARD_FEATURE_CATALOG.map((f) => f.id),
          serviceCapabilities: {
            roomBooking: selectedOnboardPortals.includes('reception') || selectedOnboardPortals.includes('guest'),
            reception: selectedOnboardPortals.includes('reception'),
            inRoomServices: selectedOnboardPortals.includes('guest'),
            tableOrdering: selectedOnboardPortals.includes('customer') || selectedOnboardPortals.includes('waiter'),
            waiterDispatch: selectedOnboardPortals.includes('waiter'),
          },
          billingCycle: onboardBillingCycle,
          monthlyPriceINR: subtotalINR,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Hotel registration and payment could not be processed.');
      }

      setOnboardSuccessData(json.data);
      setAddHotelStep('success');
    } catch (err: any) {
      console.error('[Onboarding] Error:', err);
      setOnboardError(err?.message || 'Payment verification failed. Please try again.');
    } finally {
      setIsProcessingOnboardPayment(false);
    }
  };

  const handleLaunchNewlyOnboardedHotel = async () => {
    const tenantId = onboardSuccessData?.tenant?.id || onboardSuccessData?.tenant?._id || '';
    const hotelName = onboardSuccessData?.tenant?.name || addHotelForm.hotelName;
    if (tenantId) {
      const freshHotel: ActiveHotel = {
        id: String(tenantId),
        name: hotelName,
        slug: onboardSuccessData?.tenant?.slug || '',
        city: addHotelForm.city || 'Jaipur',
        state: addHotelForm.state || 'Rajasthan',
        logoUrl: addHotelForm.logoUrl || '',
        enabledPortals: selectedOnboardPortals,
        serviceCapabilities: {
          roomBooking: selectedOnboardPortals.includes('reception') || selectedOnboardPortals.includes('guest'),
          reception: selectedOnboardPortals.includes('reception'),
          inRoomServices: selectedOnboardPortals.includes('guest'),
          tableOrdering: selectedOnboardPortals.includes('customer') || selectedOnboardPortals.includes('waiter'),
          waiterDispatch: selectedOnboardPortals.includes('waiter'),
        },
      } as any;
      handleSelectHotelDirectly(freshHotel);
      return;
    }
    setStep('hotel');
  };

  // 2. Fetch Staff Roster for Selected Hotel (public, PIN-safe endpoint)
  const fetchStaff = async () => {
    if (!selectedHotel) {
      setStaffList([]);
      return;
    }
    setStaffLoading(true);
    setStaffError(null);
    try {
      const body = await apiClient.auth.staffRoster(selectedHotel.id, selectedPortal, hotelAccessToken || undefined);
      if (body.success && Array.isArray(body.data)) {
        const mapped: StaffMember[] = body.data.map((u: any) => ({
            id: u.id,
            name: u.name,
            email: '',
            role: u.role || 'WAITER',
            shift: u.shift || 'General Shift',
            tables: '',
            section: '',
            photo: u.avatar || '',
            pin: '••••',
            hasPin: Boolean(u.hasPin),
            pinApprovedByAdmin: u.pinApprovedByAdmin,
            pinStatus: u.pinStatus,
          }));
        setStaffList(mapped);
      } else {
        setStaffList([]);
        setStaffError('Staff roster unavailable for this property.');
      }
    } catch (err: any) {
      console.warn('Hotel staff fetch error:', err);
      setStaffList([]);
      setStaffError('Cannot reach the staff roster. Check the connection and retry.');
    } finally {
      setStaffLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    if (active) void fetchStaff();
    return () => { active = false; };
  }, [apiClient, selectedHotel?.id, selectedPortal, serverHost, hotelAccessToken]);

  // Never show a terminal roster without a live property behind it.
  useEffect(() => {
    if (!selectedHotel && step !== 'hotel' && step !== 'onboard') {
      setSelectedStaff(null);
      setStep('hotel');
    }
  }, [selectedHotel, step]);

  // Handler: Select Hotel
  const handleChangeHotel = () => {
    lastRootBackPressRef.current = 0;
    setSelectedHotel(null);
    setHotelAccessToken('');
    setStaffList([]);
    setSelectedStaff(null);
    setHotelCodeError(null);
    setHotelCode('');
    setStep('hotel');
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
          void requestSystemNotificationPermission();
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
    const hotel = selectedHotel;
    if (!hotel) {
      setAuthError('Select your property again before unlocking a terminal.');
      setIsSubmitting(false);
      return;
    }
    const targetPortal = getPortalForRole(selectedStaff.role);

    try {
      const data = await apiClient.auth.staffPinLogin({
        pin: enteredPin,
        hotelId: hotel.id,
        staffId: selectedStaff.id,
        portal: targetPortal,
        hotelAccessToken: hotelAccessToken || undefined,
      });
      if (data.success && data.data?.token) {
        const token = data.data.token;
        const user = data.data.user;

        localStorage.setItem('spicehub_token', token);
        localStorage.setItem('token', token);
        localStorage.setItem('spicehub_hotel_id', hotel.id);
        localStorage.setItem('hotelId', hotel.id);
        localStorage.setItem('spicehub_auth_user', JSON.stringify(user));

        setActiveStaffUser(user);
        setSelectedPortal(targetPortal);
        setShowAuthModal(false);
        setPin('');
        lastWorkstationBackPressRef.current = 0;
        setStep('workstation');
      } else {
        if (data?.errorCode === 'PIN_PENDING_ADMIN_APPROVAL') {
          setAuthError('⏳ PIN Pending Approval: Your 4-digit PIN is awaiting Hotel Admin approval.');
        } else {
          setAuthError(data?.message || 'Invalid 4-digit staff PIN. Please try again.');
        }
        setPin('');
      }
    } catch (err: any) {
      setAuthError(
        err?.errorCode === 'PIN_PENDING_ADMIN_APPROVAL'
          ? '⏳ PIN Pending Approval: Your 4-digit PIN is awaiting Hotel Admin approval.'
          : err?.message || 'Cannot reach staff authentication server. Check connection.'
      );
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
    const activeHotel = selectedHotel;
    if (!activeHotel) {
      setOtpStatusMsg({ type: 'error', text: 'Select your property again, then retry the PIN reset.' });
      return;
    }
    setIsOtpSubmitting(true);
    setOtpStatusMsg(null);
    try {
      const hotel = activeHotel;
      const data = await apiClient.auth.sendStaffPinOtp({
          email: otpEmail.trim(),
          staffId: selectedStaff?.id,
          hotelId: hotel.id,
          hotelSlug: hotel.slug,
      });
      if (data.success) {
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

    const activeHotel = selectedHotel;
    if (!activeHotel) {
      setOtpStatusMsg({ type: 'error', text: 'Select your property again, then retry the PIN reset.' });
      return;
    }
    setIsOtpSubmitting(true);
    setOtpStatusMsg(null);
    try {
      const hotel = activeHotel;
      const data = await apiClient.auth.verifyStaffPinOtp({
          email: otpEmail.trim(),
          staffId: selectedStaff?.id,
          otp: otpCode.trim(),
          newPin: newOtpPin.trim(),
          hotelId: hotel.id,
          hotelSlug: hotel.slug,
      });
      if (data.success) {
        // Update local staff list with the new PIN so the old PIN is replaced
        const updatedPin = newOtpPin.trim();
        if (selectedStaff) {
          const updatedStaff = { ...selectedStaff, pin: updatedPin, pinStatus: 'ACTIVE', pinApprovedByAdmin: true };
          setSelectedStaff(updatedStaff);
          setStaffList((prev) =>
            prev.map((s) => (s.id === selectedStaff.id ? updatedStaff : s))
          );
        }
        setOtpStatusMsg({ type: 'success', text: 'New PIN activated. Unlocking your workstation…' });
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

  const displayedStaff = staffList.filter((st) => {
    if (!staffBelongsToPortal(st.role, selectedPortal)) return false;
    if (roleFilter === 'ALL') return true;
    return String(st.role).toUpperCase().includes(roleFilter);
  });

  // Roster members whose role does not map onto the chosen terminal

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
    }
    q.set('apiBase', API_URL);
    q.set('socketUrl', isProductionHost ? PROD_SOCKET_URL : API_URL);

    const withPortalPort = (base: string, port: number) => {
      try {
        const u = new URL(base);
        u.port = String(port);
        return u.origin;
      } catch {
        return `${base.replace(/:\d+$/, '')}:${port}`;
      }
    };

    const targetBase = USE_LOCAL_PORTALS
      ? `http://127.0.0.1:${currentApp.port}`
      : isProductionHost
        ? portalBaseFor(currentApp)
        : withPortalPort(BASE, currentApp.port);
    const iframeUrl = `${targetBase}/?${q.toString()}`;

    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#FFFFFF',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        <iframe
          ref={portalIframeRef}
          id="workstation-frame"
          src={iframeUrl}
          title={currentApp.label}
          style={{ width: '100%', height: '100%', flex: 1, border: 'none', background: '#FFFFFF' }}
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
              backgroundColor: '#FFFFFF',
              color: '#0F172A',
              padding: '10px 18px',
              borderRadius: 2,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.04em',
              zIndex: 99999,
              border: '1px solid #CBD5E1',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ color: '#16A34A' }}>!</span>
            <span>{workstationExitToast}</span>
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // FULL-PAGE HOTEL ONBOARDING FLOW (NO OVERLAY)
  // ---------------------------------------------------------------------------
  if (step === 'onboard') {
    const onboardStages: OnboardWizardStep[] = ['details', 'portals', 'bill', 'payment', 'success'];
    const stageIdx = onboardStages.indexOf(addHotelStep);
    const stageTitleMap: Record<OnboardWizardStep, string> = {
      details: 'Hotel Details',
      portals: 'Select Terminals',
      features: 'Included Features',
      bill: 'Plan Summary',
      payment: 'UPI Payment',
      success: 'Hotel Ready',
    };
    const isAdminPasswordValid = Boolean(addHotelForm.adminPassword && addHotelForm.adminPassword.length >= 6);
    const isDetailsReady =
      Boolean(addHotelForm.hotelName.trim()) &&
      Boolean(addHotelForm.adminName.trim()) &&
      Boolean(addHotelForm.adminPhone.trim().length >= 10) &&
      Boolean(addHotelForm.adminEmail.trim().includes('@')) &&
      isAdminPasswordValid &&
      isOnboardOtpVerified;
    const progressPct = addHotelStep === 'success' ? 100 : Math.round(((stageIdx + 1) / 4) * 100);

    return (
      <div
        id="onboard-hotel-page"
        data-testid="onboard-hotel-modal"
        style={{
          width: '100%',
          height: '100%',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          background: '#FFFFFF',
          boxSizing: 'border-box',
        }}
      >
        {/* Clean Full-Page Top Navigation */}
        <header
          style={{
            flexShrink: 0,
            background: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '10px 14px',
              paddingTop: 'max(env(safe-area-inset-top, 0px), 10px)',
            }}
          >
            <button
              type="button"
              data-testid="close-onboard-modal-btn"
              onClick={handleOnboardBack}
              disabled={isProcessingOnboardPayment}
              style={{
                minHeight: 40,
                padding: '6px 10px',
                borderRadius: 10,
                border: '1px solid #E2E8F0',
                background: '#F8FAFC',
                color: '#0F172A',
                fontSize: 13,
                fontWeight: 700,
                cursor: isProcessingOnboardPayment ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                opacity: isProcessingOnboardPayment ? 0.5 : 1,
              }}
            >
              <span>←</span>
              <span>{addHotelStep === 'success' ? 'Home' : 'Back'}</span>
            </button>

            <h1
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color: '#0F172A',
                flex: 1,
                textAlign: 'center',
              }}
            >
              {stageTitleMap[addHotelStep]}
            </h1>

            <span
              style={{
                minWidth: 56,
                textAlign: 'right',
                fontSize: 12,
                fontWeight: 700,
                color: addHotelStep === 'success' ? '#16A34A' : '#64748B',
              }}
            >
              {addHotelStep === 'success' ? 'Done' : `${stageIdx + 1} / 4`}
            </span>
          </div>

          {/* Slim Progress Track */}
          <div style={{ height: 3, width: '100%', background: '#F1F5F9' }}>
            <div
              style={{
                height: '100%',
                width: `${progressPct}%`,
                background: '#16A34A',
                transition: 'width 0.25s ease',
              }}
            />
          </div>
        </header>

        {/* Scrollable Separate Page Body */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 460,
              margin: '0 auto',
              padding: '20px 18px max(28px, env(safe-area-inset-bottom, 0px))',
              boxSizing: 'border-box',
            }}
          >
            {/* STEP 1: DETAILS */}
            {addHotelStep === 'details' && (
              <form
                autoComplete="off"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!isDetailsReady) return;
                  setAddHotelStep('portals');
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
              >
                <p style={{ margin: 0, fontSize: 13.5, color: '#475569', lineHeight: 1.45 }}>
                  Fill in basic details to create your hotel account.
                </p>

                <div>
                  <label
                    htmlFor="onboard-hotel-name"
                    style={{ display: 'block', marginBottom: 6, fontSize: 12.5, fontWeight: 700, color: '#334155' }}
                  >
                    Hotel Name *
                  </label>
                  <input
                    id="onboard-hotel-name"
                    type="text"
                    autoComplete="off"
                    data-testid="onboard-hotel-name-input"
                    value={addHotelForm.hotelName}
                    onChange={(e) => setAddHotelForm((prev) => ({ ...prev, hotelName: e.target.value }))}
                    placeholder="Write hotel name"
                    style={{
                      width: '100%',
                      minHeight: 48,
                      padding: '10px 14px',
                      border: '1px solid #CBD5E1',
                      borderRadius: 12,
                      fontSize: 15,
                      color: '#0F172A',
                      background: '#F8FAFC',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label
                    htmlFor="onboard-admin-name"
                    style={{ display: 'block', marginBottom: 6, fontSize: 12.5, fontWeight: 700, color: '#334155' }}
                  >
                    Your Name *
                  </label>
                  <input
                    id="onboard-admin-name"
                    type="text"
                    autoComplete="off"
                    data-testid="onboard-admin-name-input"
                    value={addHotelForm.adminName}
                    onChange={(e) => setAddHotelForm((prev) => ({ ...prev, adminName: e.target.value }))}
                    placeholder="Write owner or manager name"
                    style={{
                      width: '100%',
                      minHeight: 48,
                      padding: '10px 14px',
                      border: '1px solid #CBD5E1',
                      borderRadius: 12,
                      fontSize: 15,
                      color: '#0F172A',
                      background: '#F8FAFC',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* ============================================================ */}
                {/* 1. ADMIN EMAIL INPUT + INLINE FROSTED GLASS OTP DRAWER */}
                {/* ============================================================ */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label
                      htmlFor="onboard-admin-email"
                      style={{ fontSize: 12.5, fontWeight: 700, color: '#334155' }}
                    >
                      Admin Email *
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      id="onboard-admin-email"
                      type="email"
                      autoComplete="off"
                      data-testid="onboard-admin-email-input"
                      value={addHotelForm.adminEmail}
                      onChange={(e) => {
                        setIsEmailOtpVerified(false);
                        setIsEmailOtpSent(false);
                        setEmailOtpError(null);
                        setEmailOtpSuccessMsg(null);
                        setDevEmailOtp('');
                        setOnboardEmailOtp('');
                        setAddHotelForm((prev) => ({ ...prev, adminEmail: e.target.value }));
                      }}
                      placeholder="Write admin email address"
                      style={{
                        flex: 1,
                        minHeight: 48,
                        padding: '10px 14px',
                        border: isEmailOtpVerified ? '1.5px solid #16A34A' : '1px solid #CBD5E1',
                        borderRadius: 12,
                        fontSize: 15,
                        color: '#0F172A',
                        background: isEmailOtpVerified ? '#F0FDF4' : '#F8FAFC',
                        boxSizing: 'border-box',
                        transition: 'all 0.2s',
                      }}
                    />
                    <button
                      type="button"
                      id="send-onboard-email-otp-btn"
                      data-testid="send-onboard-email-otp-btn"
                      onClick={() => void handleSendEmailOtp()}
                      disabled={isEmailOtpSending || isEmailOtpVerified || !addHotelForm.adminEmail.trim().includes('@')}
                      style={{
                        minWidth: 95,
                        minHeight: 48,
                        padding: '0 16px',
                        borderRadius: 12,
                        fontSize: 13,
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                        ...(isEmailOtpVerified
                          ? {
                              background: 'linear-gradient(135deg, rgba(22, 163, 74, 0.90) 0%, rgba(21, 128, 61, 0.80) 100%)',
                              backdropFilter: 'blur(16px) saturate(180%)',
                              WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                              border: '1px solid rgba(255, 255, 255, 0.40)',
                              borderTop: '1.5px solid rgba(255, 255, 255, 0.85)',
                              boxShadow: '0 8px 20px -4px rgba(22, 163, 74, 0.35), inset 0 1px 1.5px rgba(255, 255, 255, 0.65)',
                              color: '#FFFFFF',
                              textShadow: '0 1px 2px rgba(0, 0, 0, 0.25)',
                              cursor: 'default',
                            }
                          : addHotelForm.adminEmail.trim().includes('@')
                            ? {
                                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.90) 0%, rgba(30, 41, 59, 0.78) 100%)',
                                backdropFilter: 'blur(16px) saturate(180%)',
                                WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                                border: '1px solid rgba(255, 255, 255, 0.28)',
                                borderTop: '1.5px solid rgba(255, 255, 255, 0.70)',
                                boxShadow: '0 8px 20px -4px rgba(15, 23, 42, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.4), inset 0 -1px 1px rgba(0, 0, 0, 0.25)',
                                color: '#FFFFFF',
                                textShadow: '0 1px 2px rgba(0, 0, 0, 0.35)',
                                cursor: 'pointer',
                              }
                            : {
                                background: 'rgba(241, 245, 249, 0.85)',
                                border: '1px solid rgba(203, 213, 225, 0.60)',
                                color: '#94A3B8',
                                cursor: 'not-allowed',
                              }),
                      }}
                    >
                      {isEmailOtpVerified ? (
                        <span data-testid="email-verified-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>Verified</span>
                        </span>
                      ) : isEmailOtpSending ? 'Sending…' : isEmailOtpSent ? 'Resend' : 'Verify'}
                    </button>
                  </div>

                  {/* FROSTED GLASS EMAIL DRAWER (DIRECTLY UNDER EMAIL INPUT) */}
                  {isEmailOtpSent && !isEmailOtpVerified && (
                    <div
                      data-testid="onboard-email-otp-section"
                      style={{
                        marginTop: 10,
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.88) 0%, rgba(248, 250, 252, 0.74) 100%)',
                        backdropFilter: 'blur(20px) saturate(190%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(190%)',
                        border: '1px solid rgba(255, 255, 255, 0.85)',
                        borderTop: '2px solid rgba(255, 255, 255, 0.98)',
                        boxShadow: '0 16px 36px -6px rgba(15, 23, 42, 0.08), 0 4px 12px rgba(15, 23, 42, 0.04), inset 0 1px 2px rgba(255, 255, 255, 0.95)',
                        borderRadius: 16,
                        padding: '14px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                            <polyline points="22,6 12,13 2,6" />
                          </svg>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                            Verify Admin Email
                          </span>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B', background: 'rgba(241, 245, 249, 0.8)', padding: '2px 8px', borderRadius: 6 }}>
                          Sent to your inbox
                        </span>
                      </div>

                      <div style={{ fontSize: 12, color: '#64748B' }}>
                        A 6-digit OTP code has been delivered to your email inbox. Please check and enter it below.
                      </div>

                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        data-testid="onboard-email-otp-input"
                        value={onboardEmailOtp}
                        onChange={(e) => setOnboardEmailOtp(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="Enter 6-digit email OTP"
                        style={{
                          width: '100%',
                          minHeight: 46,
                          padding: '8px 14px',
                          background: 'rgba(255, 255, 255, 0.95)',
                          backdropFilter: 'blur(10px)',
                          WebkitBackdropFilter: 'blur(10px)',
                          border: '1px solid rgba(203, 213, 225, 0.85)',
                          borderTop: '1.5px solid rgba(255, 255, 255, 1)',
                          boxShadow: 'inset 0 1px 3px rgba(15, 23, 42, 0.06)',
                          borderRadius: 10,
                          fontSize: 17,
                          fontWeight: 700,
                          letterSpacing: '0.15em',
                          textAlign: 'center',
                          color: '#0F172A',
                          boxSizing: 'border-box',
                        }}
                      />

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          data-testid="verify-onboard-email-otp-btn"
                          onClick={() => void handleVerifyEmailOtp()}
                          disabled={isEmailOtpVerifying || !onboardEmailOtp}
                          style={{
                            flex: 1,
                            minHeight: 44,
                            padding: '0 16px',
                            fontSize: 13,
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            borderRadius: 10,
                            border: 'none',
                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                            ...(onboardEmailOtp
                              ? {
                                  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 41, 59, 0.82) 100%)',
                                  backdropFilter: 'blur(16px)',
                                  WebkitBackdropFilter: 'blur(16px)',
                                  border: '1px solid rgba(255, 255, 255, 0.35)',
                                  borderTop: '1.5px solid rgba(255, 255, 255, 0.70)',
                                  boxShadow: '0 6px 18px -3px rgba(15, 23, 42, 0.28), inset 0 1px 1px rgba(255, 255, 255, 0.5)',
                                  color: '#FFFFFF',
                                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.35)',
                                  cursor: 'pointer',
                                }
                              : {
                                  background: 'rgba(241, 245, 249, 0.85)',
                                  border: '1px solid rgba(203, 213, 225, 0.60)',
                                  color: '#94A3B8',
                                  cursor: 'not-allowed',
                                }),
                          }}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <span>{isEmailOtpVerifying ? 'Checking…' : 'Confirm & Verify Email'}</span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleSendEmailOtp()}
                          disabled={isEmailOtpSending}
                          style={{
                            padding: '0 14px',
                            minHeight: 44,
                            borderRadius: 10,
                            border: '1px solid rgba(203, 213, 225, 0.9)',
                            borderTop: '1.5px solid rgba(255, 255, 255, 1)',
                            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(241, 245, 249, 0.75) 100%)',
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.05), inset 0 1px 1px rgba(255, 255, 255, 0.9)',
                            color: '#334155',
                            fontSize: 12.5,
                            fontWeight: 700,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Resend
                        </button>
                      </div>

                      {emailOtpError && (
                        <div
                          style={{
                            fontSize: 12,
                            color: '#DC2626',
                            fontWeight: 600,
                            background: 'rgba(254, 226, 226, 0.88)',
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                            border: '1px solid rgba(239, 68, 68, 0.35)',
                            borderTop: '1px solid rgba(255, 255, 255, 0.8)',
                            padding: '7px 12px',
                            borderRadius: 8,
                          }}
                        >
                          {emailOtpError}
                        </div>
                      )}
                    </div>
                  )}

                  {!isEmailOtpVerified && emailOtpSuccessMsg && (
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 12,
                        color: '#15803D',
                        fontWeight: 600,
                        background: 'rgba(220, 252, 231, 0.88)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        border: '1px solid rgba(34, 197, 94, 0.35)',
                        borderTop: '1px solid rgba(255, 255, 255, 0.8)',
                        padding: '6px 12px',
                        borderRadius: 8,
                      }}
                    >
                      {emailOtpSuccessMsg}
                    </div>
                  )}
                </div>

                {/* ============================================================ */}
                {/* 2. PHONE NUMBER INPUT + INLINE FROSTED GLASS OTP DRAWER */}
                {/* ============================================================ */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label
                      htmlFor="onboard-admin-phone"
                      style={{ fontSize: 12.5, fontWeight: 700, color: '#334155' }}
                    >
                      Phone Number (WhatsApp) *
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      id="onboard-admin-phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="off"
                      data-testid="onboard-admin-phone-input"
                      value={addHotelForm.adminPhone}
                      onChange={(e) => {
                        setIsPhoneOtpVerified(false);
                        setIsPhoneOtpSent(false);
                        setPhoneOtpError(null);
                        setPhoneOtpSuccessMsg(null);
                        setDevPhoneOtp('');
                        setOnboardWhatsappOtp('');
                        setAddHotelForm((prev) => ({
                          ...prev,
                          adminPhone: e.target.value.replace(/[^0-9]/g, '').slice(0, 15),
                        }));
                      }}
                      placeholder="Write 10-digit phone number"
                      style={{
                        flex: 1,
                        minHeight: 48,
                        padding: '10px 14px',
                        border: isPhoneOtpVerified ? '1.5px solid #16A34A' : '1px solid #CBD5E1',
                        borderRadius: 12,
                        fontSize: 15,
                        color: '#0F172A',
                        background: isPhoneOtpVerified ? '#F0FDF4' : '#F8FAFC',
                        boxSizing: 'border-box',
                        transition: 'all 0.2s',
                      }}
                    />
                    <button
                      type="button"
                      id="send-onboard-phone-otp-btn"
                      data-testid="send-onboard-phone-otp-btn"
                      onClick={() => void handleSendPhoneOtp()}
                      disabled={isPhoneOtpSending || isPhoneOtpVerified || addHotelForm.adminPhone.trim().length < 10}
                      style={{
                        minWidth: 95,
                        minHeight: 48,
                        padding: '0 16px',
                        borderRadius: 12,
                        fontSize: 13,
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                        ...(isPhoneOtpVerified
                          ? {
                              background: 'linear-gradient(135deg, rgba(22, 163, 74, 0.90) 0%, rgba(21, 128, 61, 0.80) 100%)',
                              backdropFilter: 'blur(16px) saturate(180%)',
                              WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                              border: '1px solid rgba(255, 255, 255, 0.40)',
                              borderTop: '1.5px solid rgba(255, 255, 255, 0.85)',
                              boxShadow: '0 8px 20px -4px rgba(22, 163, 74, 0.35), inset 0 1px 1.5px rgba(255, 255, 255, 0.65)',
                              color: '#FFFFFF',
                              textShadow: '0 1px 2px rgba(0, 0, 0, 0.25)',
                              cursor: 'default',
                            }
                          : addHotelForm.adminPhone.trim().length >= 10
                            ? {
                                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.90) 0%, rgba(30, 41, 59, 0.78) 100%)',
                                backdropFilter: 'blur(16px) saturate(180%)',
                                WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                                border: '1px solid rgba(255, 255, 255, 0.28)',
                                borderTop: '1.5px solid rgba(255, 255, 255, 0.70)',
                                boxShadow: '0 8px 20px -4px rgba(15, 23, 42, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.4), inset 0 -1px 1px rgba(0, 0, 0, 0.25)',
                                color: '#FFFFFF',
                                textShadow: '0 1px 2px rgba(0, 0, 0, 0.35)',
                                cursor: 'pointer',
                              }
                            : {
                                background: 'rgba(241, 245, 249, 0.85)',
                                border: '1px solid rgba(203, 213, 225, 0.60)',
                                color: '#94A3B8',
                                cursor: 'not-allowed',
                              }),
                      }}
                    >
                      {isPhoneOtpVerified ? (
                        <span data-testid="phone-verified-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>Verified</span>
                        </span>
                      ) : isPhoneOtpSending ? 'Sending…' : isPhoneOtpSent ? 'Resend' : 'Verify'}
                    </button>
                  </div>

                  {/* FROSTED GLASS WHATSAPP DRAWER (DIRECTLY UNDER PHONE INPUT) */}
                  {isPhoneOtpSent && !isPhoneOtpVerified && (
                    <div
                      data-testid="onboard-phone-otp-section"
                      style={{
                        marginTop: 10,
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.88) 0%, rgba(248, 250, 252, 0.74) 100%)',
                        backdropFilter: 'blur(20px) saturate(190%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(190%)',
                        border: '1px solid rgba(255, 255, 255, 0.85)',
                        borderTop: '2px solid rgba(255, 255, 255, 0.98)',
                        boxShadow: '0 16px 36px -6px rgba(15, 23, 42, 0.08), 0 4px 12px rgba(15, 23, 42, 0.04), inset 0 1px 2px rgba(255, 255, 255, 0.95)',
                        borderRadius: 16,
                        padding: '14px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                          </svg>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                            Verify WhatsApp Number
                          </span>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B', background: 'rgba(241, 245, 249, 0.8)', padding: '2px 8px', borderRadius: 6 }}>
                          WhatsApp OTP
                        </span>
                      </div>

                      <div style={{ fontSize: 12, color: '#64748B' }}>
                        Enter the 6-digit WhatsApp OTP (use <strong>999999</strong> for instant verification).
                      </div>

                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        data-testid="onboard-whatsapp-otp-input"
                        value={onboardWhatsappOtp}
                        onChange={(e) => setOnboardWhatsappOtp(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="Enter 6-digit WhatsApp OTP (999999)"
                        style={{
                          width: '100%',
                          minHeight: 46,
                          padding: '8px 14px',
                          background: 'rgba(255, 255, 255, 0.95)',
                          backdropFilter: 'blur(10px)',
                          WebkitBackdropFilter: 'blur(10px)',
                          border: '1px solid rgba(203, 213, 225, 0.85)',
                          borderTop: '1.5px solid rgba(255, 255, 255, 1)',
                          boxShadow: 'inset 0 1px 3px rgba(15, 23, 42, 0.06)',
                          borderRadius: 10,
                          fontSize: 17,
                          fontWeight: 700,
                          letterSpacing: '0.15em',
                          textAlign: 'center',
                          color: '#0F172A',
                          boxSizing: 'border-box',
                        }}
                      />

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          id="verify-onboard-phone-otp-btn"
                          data-testid="verify-onboard-phone-otp-btn"
                          onClick={() => void handleVerifyPhoneOtp()}
                          disabled={isPhoneOtpVerifying || !onboardWhatsappOtp}
                          style={{
                            flex: 1,
                            minHeight: 44,
                            padding: '0 16px',
                            fontSize: 13,
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            borderRadius: 10,
                            border: 'none',
                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                            ...(onboardWhatsappOtp
                              ? {
                                  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 41, 59, 0.82) 100%)',
                                  backdropFilter: 'blur(16px)',
                                  WebkitBackdropFilter: 'blur(16px)',
                                  border: '1px solid rgba(255, 255, 255, 0.35)',
                                  borderTop: '1.5px solid rgba(255, 255, 255, 0.70)',
                                  boxShadow: '0 6px 18px -3px rgba(15, 23, 42, 0.28), inset 0 1px 1px rgba(255, 255, 255, 0.5)',
                                  color: '#FFFFFF',
                                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.35)',
                                  cursor: 'pointer',
                                }
                              : {
                                  background: 'rgba(241, 245, 249, 0.85)',
                                  border: '1px solid rgba(203, 213, 225, 0.60)',
                                  color: '#94A3B8',
                                  cursor: 'not-allowed',
                                }),
                          }}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <span>{isPhoneOtpVerifying ? 'Checking…' : 'Confirm & Verify WhatsApp'}</span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleSendPhoneOtp()}
                          disabled={isPhoneOtpSending}
                          style={{
                            padding: '0 14px',
                            minHeight: 44,
                            borderRadius: 10,
                            border: '1px solid rgba(203, 213, 225, 0.9)',
                            borderTop: '1.5px solid rgba(255, 255, 255, 1)',
                            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(241, 245, 249, 0.75) 100%)',
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.05), inset 0 1px 1px rgba(255, 255, 255, 0.9)',
                            color: '#334155',
                            fontSize: 12.5,
                            fontWeight: 700,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Resend
                        </button>
                      </div>

                      {phoneOtpError && (
                        <div
                          style={{
                            fontSize: 12,
                            color: '#DC2626',
                            fontWeight: 600,
                            background: 'rgba(254, 226, 226, 0.88)',
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                            border: '1px solid rgba(239, 68, 68, 0.35)',
                            borderTop: '1px solid rgba(255, 255, 255, 0.8)',
                            padding: '7px 12px',
                            borderRadius: 8,
                          }}
                        >
                          {phoneOtpError}
                        </div>
                      )}
                    </div>
                  )}

                  {!isPhoneOtpVerified && phoneOtpSuccessMsg && (
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 12,
                        color: '#15803D',
                        fontWeight: 600,
                        background: 'rgba(220, 252, 231, 0.88)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        border: '1px solid rgba(34, 197, 94, 0.35)',
                        borderTop: '1px solid rgba(255, 255, 255, 0.8)',
                        padding: '6px 12px',
                        borderRadius: 8,
                      }}
                    >
                      {phoneOtpSuccessMsg}
                    </div>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="onboard-admin-password"
                    style={{ display: 'block', marginBottom: 6, fontSize: 12.5, fontWeight: 700, color: '#334155' }}
                  >
                    Admin Password *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="onboard-admin-password"
                      type={showAdminPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      data-testid="onboard-admin-password-input"
                      value={addHotelForm.adminPassword}
                      onChange={(e) => setAddHotelForm((prev) => ({ ...prev, adminPassword: e.target.value }))}
                      placeholder="Create admin password (min 6 characters)"
                      style={{
                        width: '100%',
                        minHeight: 48,
                        padding: '10px 80px 10px 14px',
                        border: '1px solid #CBD5E1',
                        borderRadius: 12,
                        fontSize: 15,
                        color: '#0F172A',
                        background: '#F8FAFC',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      data-testid="toggle-admin-password-visibility-btn"
                      onClick={() => setShowAdminPassword((v) => !v)}
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: '#2563EB',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: '4px 6px',
                      }}
                    >
                      {showAdminPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <span style={{ display: 'block', marginTop: 4, fontSize: 11.5, color: addHotelForm.adminPassword.length >= 6 ? '#16A34A' : '#64748B' }}>
                    {addHotelForm.adminPassword.length >= 6 ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Password meets requirements</span>
                      </span>
                    ) : 'Used to sign in to Hotel Admin Console (minimum 6 characters)'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label
                      htmlFor="onboard-city"
                      style={{ display: 'block', marginBottom: 6, fontSize: 12.5, fontWeight: 700, color: '#334155' }}
                    >
                      City
                    </label>
                    <input
                      id="onboard-city"
                      type="text"
                      autoComplete="off"
                      value={addHotelForm.city}
                      onChange={(e) => setAddHotelForm((prev) => ({ ...prev, city: e.target.value }))}
                      placeholder="Write city"
                      style={{
                        width: '100%',
                        minHeight: 48,
                        padding: '10px 14px',
                        border: '1px solid #CBD5E1',
                        borderRadius: 12,
                        fontSize: 15,
                        color: '#0F172A',
                        background: '#F8FAFC',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="onboard-state"
                      style={{ display: 'block', marginBottom: 6, fontSize: 12.5, fontWeight: 700, color: '#334155' }}
                    >
                      State
                    </label>
                    <input
                      id="onboard-state"
                      type="text"
                      autoComplete="off"
                      value={addHotelForm.state}
                      onChange={(e) => setAddHotelForm((prev) => ({ ...prev, state: e.target.value }))}
                      placeholder="Write state"
                      style={{
                        width: '100%',
                        minHeight: 48,
                        padding: '10px 14px',
                        border: '1px solid #CBD5E1',
                        borderRadius: 12,
                        fontSize: 15,
                        color: '#0F172A',
                        background: '#F8FAFC',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                {/* Professional Hotel Location & GPS Coordinates Section */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.94) 0%, rgba(248, 250, 252, 0.82) 100%)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid rgba(226, 232, 240, 0.95)',
                    borderTop: '1.5px solid rgba(255, 255, 255, 1)',
                    borderRadius: 14,
                    padding: '14px 16px',
                    boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.05), inset 0 1px 1px rgba(255, 255, 255, 0.9)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: 'rgba(37, 99, 235, 0.08)',
                          border: '1px solid rgba(37, 99, 235, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                          Hotel Location & Coordinates
                        </div>
                        <div style={{ fontSize: 11, color: '#64748B' }}>
                          Exact coordinates for guest check-in & maps
                        </div>
                      </div>
                    </div>

                    {/* Real Glass Detect GPS Button */}
                    <button
                      type="button"
                      data-testid="detect-gps-btn"
                      onClick={handleFetchCurrentGps}
                      style={{
                        minHeight: 38,
                        padding: '0 14px',
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.90) 0%, rgba(30, 41, 59, 0.78) 100%)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        border: '1px solid rgba(255, 255, 255, 0.28)',
                        borderTop: '1.5px solid rgba(255, 255, 255, 0.70)',
                        boxShadow: '0 4px 14px -2px rgba(15, 23, 42, 0.22), inset 0 1px 1px rgba(255, 255, 255, 0.4)',
                        color: '#FFFFFF',
                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="22" y1="12" x2="18" y2="12" />
                        <line x1="6" y1="12" x2="2" y2="12" />
                        <line x1="12" y1="6" x2="12" y2="2" />
                        <line x1="12" y1="22" x2="12" y2="18" />
                      </svg>
                      <span>Detect GPS</span>
                    </button>
                  </div>

                  {gpsStatus && (
                    <div
                      style={{
                        fontSize: 12,
                        color: gpsStatus.toLowerCase().includes('error') ? '#DC2626' : '#15803D',
                        fontWeight: 600,
                        background: gpsStatus.toLowerCase().includes('error') ? 'rgba(254, 226, 226, 0.85)' : 'rgba(220, 252, 231, 0.85)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        border: gpsStatus.toLowerCase().includes('error') ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(34, 197, 94, 0.3)',
                        padding: '7px 12px',
                        borderRadius: 8,
                      }}
                    >
                      {gpsStatus}
                    </div>
                  )}

                  {addHotelForm.latitude && addHotelForm.longitude && (
                    <div
                      style={{
                        fontSize: 11.5,
                        color: '#0F172A',
                        background: 'rgba(241, 245, 249, 0.85)',
                        border: '1px solid rgba(203, 213, 225, 0.7)',
                        borderRadius: 8,
                        padding: '7px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>Coordinates: <strong>{addHotelForm.latitude}, {addHotelForm.longitude}</strong></span>
                      <a
                        href={`https://www.google.com/maps?q=${addHotelForm.latitude},${addHotelForm.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <span>Preview Map</span>
                        <span>↗</span>
                      </a>
                    </div>
                  )}

                  <input
                    type="text"
                    autoComplete="off"
                    data-testid="onboard-street-address-input"
                    value={addHotelForm.streetAddress || ''}
                    onChange={(e) => setAddHotelForm((prev) => ({ ...prev, streetAddress: e.target.value }))}
                    placeholder="Street / Area / Landmark (e.g. Amer Road, Near Jal Mahal)"
                    style={{
                      width: '100%',
                      minHeight: 44,
                      padding: '8px 12px',
                      border: '1px solid #CBD5E1',
                      borderRadius: 10,
                      fontSize: 13.5,
                      color: '#0F172A',
                      background: '#FFFFFF',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Optional Hotel Logo */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <input
                    type="file"
                    id="onboard-logo-upload-input"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleOnboardLogoUpload}
                  />
                  <label
                    htmlFor="onboard-logo-upload-input"
                    data-testid="onboard-choose-logo-btn"
                    style={{
                      flex: 1,
                      minHeight: 44,
                      padding: '8px 12px',
                      borderRadius: 10,
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      color: '#0F172A',
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxSizing: 'border-box',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                      <span>{addHotelForm.logoUrl ? 'Change Hotel Logo' : 'Upload Hotel Logo (Optional)'}</span>
                    </span>
                  </label>
                  {addHotelForm.logoUrl && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <img
                        src={addHotelForm.logoUrl}
                        alt="Selected logo"
                        style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', border: '1px solid #CBD5E1' }}
                      />
                      <button
                        type="button"
                        onClick={() => setAddHotelForm((prev) => ({ ...prev, logoUrl: '' }))}
                        style={{ background: 'transparent', border: 'none', color: '#DC2626', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  data-testid="onboard-next-to-portals-btn"
                  disabled={!isDetailsReady}
                  style={{
                    width: '100%',
                    minHeight: 50,
                    marginTop: 6,
                    borderRadius: 12,
                    border: 'none',
                    background: isDetailsReady ? '#16A34A' : '#94A3B8',
                    color: '#FFFFFF',
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: isDetailsReady ? 'pointer' : 'not-allowed',
                  }}
                >
                  Continue
                </button>
              </form>
            )}

            {/* STEP 2: TERMINALS / PORTALS */}
            {addHotelStep === 'portals' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13.5, color: '#475569' }}>
                    Choose apps for your staff ({selectedOnboardPortals.length} selected)
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#15803D' }}>
                    ₹{subtotalINR.toLocaleString('en-IN')}/mo
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {ONBOARD_PORTAL_CATALOG.map((portal) => {
                    const isSelected = selectedOnboardPortals.includes(portal.id);
                    return (
                      <button
                        key={portal.id}
                        type="button"
                        data-testid={`onboard-portal-toggle-${portal.id}`}
                        onClick={() => {
                          if (portal.isFree) return;
                          setSelectedOnboardPortals((prev) =>
                            prev.includes(portal.id) ? prev.filter((p) => p !== portal.id) : [...prev, portal.id]
                          );
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          border: isSelected ? '1.5px solid #16A34A' : '1px solid #E2E8F0',
                          borderRadius: 12,
                          padding: '12px 14px',
                          background: isSelected ? '#F0FDF4' : '#FFFFFF',
                          cursor: portal.isFree ? 'default' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                            {portal.name}
                          </div>
                          <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                            {portal.desc}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: portal.isFree ? '#16A34A' : '#0F172A' }}>
                            {portal.isFree ? 'Free' : `₹${portal.priceINR}`}
                          </span>
                          <span
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 6,
                              border: isSelected ? 'none' : '1.5px solid #CBD5E1',
                              background: isSelected ? '#16A34A' : '#FFFFFF',
                              color: '#FFFFFF',
                              fontSize: 12,
                              fontWeight: 800,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {isSelected ? '✓' : ''}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  data-testid="onboard-next-to-bill-btn"
                  onClick={() => setAddHotelStep('bill')}
                  style={{
                    width: '100%',
                    minHeight: 50,
                    marginTop: 6,
                    borderRadius: 12,
                    border: 'none',
                    background: '#16A34A',
                    color: '#FFFFFF',
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Continue to Plan Summary
                </button>
              </div>
            )}

            {/* STEP 4: SUMMARY & BILL */}
            {addHotelStep === 'bill' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', background: '#F1F5F9', padding: 4, borderRadius: 12 }}>
                  <button
                    type="button"
                    onClick={() => setOnboardBillingCycle('monthly')}
                    style={{
                      flex: 1,
                      minHeight: 40,
                      borderRadius: 9,
                      border: 'none',
                      background: onboardBillingCycle === 'monthly' ? '#FFFFFF' : 'transparent',
                      color: onboardBillingCycle === 'monthly' ? '#0F172A' : '#64748B',
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setOnboardBillingCycle('annual')}
                    style={{
                      flex: 1,
                      minHeight: 40,
                      borderRadius: 9,
                      border: 'none',
                      background: onboardBillingCycle === 'annual' ? '#FFFFFF' : 'transparent',
                      color: onboardBillingCycle === 'annual' ? '#0F172A' : '#64748B',
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    Annual (Save 20%)
                  </button>
                </div>

                <div style={{ border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {ONBOARD_PORTAL_CATALOG.filter((p) => selectedOnboardPortals.includes(p.id)).map((p) => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
                        <span style={{ color: '#334155' }}>{p.name}</span>
                        <span style={{ fontWeight: 700, color: p.isFree ? '#16A34A' : '#0F172A' }}>
                          {p.isFree ? 'Free' : `₹${p.priceINR.toLocaleString('en-IN')}`}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div style={{ borderTop: '1px solid #E2E8F0', padding: 14, background: '#F8FAFC', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                      <span>Subtotal</span>
                      <span>₹{subtotalINR.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803D' }}>
                      <span>{onboardBillingCycle === 'annual' ? 'Annual Discount (20%)' : 'Launch Discount'}</span>
                      <span>- ₹{discountINR.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                      <span>GST (18%)</span>
                      <span>₹{totalGstINR.toFixed(2)}</span>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #BBF7D0', background: '#F0FDF4', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Total Payable</div>
                      <div style={{ fontSize: 11, color: '#475569' }}>Includes 18% GST</div>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#15803D' }}>
                      ₹{totalPayableINR.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  data-testid="onboard-proceed-to-pay-btn"
                  onClick={() => setAddHotelStep('payment')}
                  style={{
                    width: '100%',
                    minHeight: 50,
                    borderRadius: 12,
                    border: 'none',
                    background: '#16A34A',
                    color: '#FFFFFF',
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Continue to Pay
                </button>
              </div>
            )}

            {/* STEP 5: UPI QR PAYMENT */}
            {addHotelStep === 'payment' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16 }}>
                <div style={{ padding: '6px 12px', borderRadius: 999, background: '#F1F5F9', fontSize: 12.5, fontWeight: 700, color: '#475569' }}>
                  Time left {Math.floor(paymentTimeRemaining / 60).toString().padStart(2, '0')}:
                  {(paymentTimeRemaining % 60).toString().padStart(2, '0')}
                </div>

                <div style={{ padding: 14, borderRadius: 16, border: '1px solid #E2E8F0', background: '#FFFFFF' }}>
                  <QRCodeSVG
                    value={`upi://pay?pa=spicehub.pay@icici&pn=SpiceHub&am=${totalPayableINR.toFixed(2)}&cu=INR&tn=Onboarding%20${encodeURIComponent(addHotelForm.hotelName || 'SpiceHub')}`}
                    size={180}
                    level="M"
                    includeMargin={true}
                  />
                  <div style={{ marginTop: 6, fontSize: 12, color: '#64748B', fontWeight: 600 }}>
                    Scan with Google Pay, PhonePe, or Paytm
                  </div>
                </div>

                <div style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: 14, padding: 14, background: '#F8FAFC', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Hotel</span>
                    <span style={{ fontWeight: 700, color: '#0F172A' }}>{addHotelForm.hotelName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Admin Account</span>
                    <span style={{ fontWeight: 700, color: '#0F172A' }}>{addHotelForm.adminEmail}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Hotel Code & PINs</span>
                    <span style={{ fontWeight: 600, color: '#2563EB', fontSize: 12 }}>Managed in Admin ERP</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid #E2E8F0', fontSize: 14.5, fontWeight: 800, color: '#0F172A' }}>
                    <span>Amount</span>
                    <span>₹{totalPayableINR.toFixed(2)}</span>
                  </div>
                </div>

                {onboardError && (
                  <div
                    role="alert"
                    style={{
                      width: '100%',
                      padding: 12,
                      borderRadius: 10,
                      border: '1px solid #FECACA',
                      background: '#FEF2F2',
                      color: '#B91C1C',
                      fontSize: 13,
                      fontWeight: 600,
                      textAlign: 'left',
                    }}
                  >
                    {onboardError}
                  </div>
                )}

                <button
                  type="button"
                  data-testid="simulate-verify-payment-btn"
                  disabled={isProcessingOnboardPayment}
                  onClick={() => void handleCompleteOnboardPayment()}
                  style={{
                    width: '100%',
                    minHeight: 50,
                    borderRadius: 12,
                    border: 'none',
                    background: isProcessingOnboardPayment ? '#94A3B8' : '#16A34A',
                    color: '#FFFFFF',
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: isProcessingOnboardPayment ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isProcessingOnboardPayment ? 'Setting up hotel…' : 'Complete Setup'}
                </button>
              </div>
            )}

            {/* STEP 6: SUCCESS */}
            {addHotelStep === 'success' && (() => {
              const finalHotelCode = onboardSuccessData?.hotelCode || addHotelForm.hotelCode;
              const finalAdminPassword = onboardSuccessData?.adminCredentials?.password || addHotelForm.adminPassword;
              const finalStaffPin = onboardSuccessData?.staffPin || addHotelForm.staffPin || '1234';
              const adminConsoleUrl = (() => {
                if (onboardSuccessData?.adminUrl) {
                  try {
                    const parsed = new URL(onboardSuccessData.adminUrl);
                    if ((parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') && !isLocalBrowserOrigin) {
                      const apiParsed = new URL(API_URL);
                      return `${apiParsed.protocol}//${apiParsed.hostname}:3005`;
                    }
                    return onboardSuccessData.adminUrl;
                  } catch {
                    return onboardSuccessData.adminUrl;
                  }
                }
                if (isProductionHost) return 'https://admin.spicehub.app';
                try {
                  const parsed = new URL(API_URL);
                  return `${parsed.protocol}//${parsed.hostname}:3005`;
                } catch {
                  return 'http://localhost:3005';
                }
              })();

              const allDetailsSummary = `Hotel: ${addHotelForm.hotelName}
Admin Console URL: ${adminConsoleUrl}
Admin Email: ${addHotelForm.adminEmail}
Admin Password: ${finalAdminPassword}
(Hotel Code & Staff PINs are managed securely from the Hotel Admin Console)`;

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ textAlign: 'center', paddingTop: 8 }}>
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: '50%',
                        background: '#DCFCE7',
                        color: '#15803D',
                        margin: '0 auto 10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 24,
                        fontWeight: 800,
                      }}
                    >
                      ✓
                    </div>
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0F172A' }}>
                      Hotel Ready!
                    </h2>
                    <p style={{ margin: '4px 0 0', fontSize: 13.5, color: '#64748B' }}>
                      {addHotelForm.hotelName} has been created successfully.
                    </p>
                  </div>

                  {/* HOTEL ADMIN CONSOLE URL CARD */}
                  <div
                    style={{
                      background: '#F8FAFC',
                      border: '1.5px solid #CBD5E1',
                      borderRadius: 14,
                      padding: 14,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="2" y1="12" x2="22" y2="12" />
                          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                        </svg>
                        <span style={{ fontSize: 12.5, fontWeight: 800, color: '#0F172A' }}>
                          Hotel Admin Console URL
                        </span>
                      </div>
                      <button
                        type="button"
                        data-testid="copy-admin-url-btn"
                        onClick={() => handleCopyText(adminConsoleUrl, 'adminUrl')}
                        style={{
                          background: copiedKey === 'adminUrl' ? '#15803D' : '#FFFFFF',
                          color: copiedKey === 'adminUrl' ? '#FFFFFF' : '#0F172A',
                          border: '1px solid #CBD5E1',
                          borderRadius: 8,
                          padding: '4px 10px',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {copiedKey === 'adminUrl' ? '✓ Copied URL' : 'Copy URL'}
                      </button>
                    </div>

                    <div
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: 10,
                        padding: '10px 12px',
                        fontSize: 13,
                        fontFamily: 'monospace',
                        color: '#0F172A',
                        wordBreak: 'break-all',
                        fontWeight: 600,
                      }}
                    >
                      {adminConsoleUrl}
                    </div>

                    <span style={{ fontSize: 11.5, color: '#64748B' }}>
                      Copy this URL to sign in from any browser on your computer or phone to manage inventory, front desk, and billing.
                    </span>
                  </div>



                  {/* DETAILED CREDENTIALS CARD */}
                  <div
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: 14,
                      padding: 14,
                      background: '#F8FAFC',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      fontSize: 13,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#64748B' }}>Admin Email</span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(addHotelForm.adminEmail, 'adminEmail')}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#0F172A',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <span>{addHotelForm.adminEmail}</span>
                        <span style={{ fontSize: 11, color: copiedKey === 'adminEmail' ? '#16A34A' : '#64748B' }}>
                          {copiedKey === 'adminEmail' ? '✓ Copied' : 'Copy'}
                        </span>
                      </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#64748B' }}>Admin Password</span>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, color: '#0F172A', fontFamily: showCreatedPassword ? 'inherit' : 'monospace' }}>
                          {showCreatedPassword ? finalAdminPassword : '••••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowCreatedPassword((v) => !v)}
                          style={{ background: 'transparent', border: 'none', color: '#64748B', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          {showCreatedPassword ? 'Hide' : 'Show'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyText(finalAdminPassword, 'adminPassword')}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: copiedKey === 'adminPassword' ? '#16A34A' : '#0F172A',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: 11,
                          }}
                        >
                          {copiedKey === 'adminPassword' ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, paddingTop: 6, borderTop: '1px solid #E2E8F0' }}>
                      <span style={{ color: '#64748B' }}>Staff PINs</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#2563EB' }}>
                        Managed in Hotel Admin Console
                      </span>
                    </div>

                    <button
                      type="button"
                      data-testid="copy-all-details-btn"
                      onClick={() => handleCopyText(allDetailsSummary, 'allDetails')}
                      style={{
                        marginTop: 4,
                        minHeight: 38,
                        background: copiedKey === 'allDetails' ? '#DCFCE7' : '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: 10,
                        color: copiedKey === 'allDetails' ? '#15803D' : '#334155',
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {copiedKey === 'allDetails' ? '✓ All Credentials & URL Copied!' : 'Copy All Details to Clipboard'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                    <button
                      type="button"
                      data-testid="launch-hotel-in-staff-app-btn"
                      onClick={() => void handleLaunchNewlyOnboardedHotel()}
                      style={{
                        width: '100%',
                        minHeight: 50,
                        borderRadius: 12,
                        border: 'none',
                        background: '#16A34A',
                        color: '#FFFFFF',
                        fontSize: 15,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Open Staff App
                    </button>

                    <button
                      type="button"
                      data-testid="view-onboard-details-btn"
                      onClick={() => setShowSubmittedDetailsModal(true)}
                      style={{
                        width: '100%',
                        minHeight: 46,
                        borderRadius: 12,
                        border: '1.5px solid #0F172A',
                        background: '#FFFFFF',
                        color: '#0F172A',
                        fontSize: 14,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        boxSizing: 'border-box',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                          <polyline points="10 9 9 9 8 9" />
                        </svg>
                        <span>View Submitted Details</span>
                      </div>
                    </button>
                  </div>

                  {/* SUBMITTED DETAILS MODAL */}
                  {showSubmittedDetailsModal && (
                    <div
                      data-testid="submitted-details-modal"
                      style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        background: 'rgba(15, 23, 42, 0.7)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 16,
                      }}
                      onClick={() => setShowSubmittedDetailsModal(false)}
                    >
                      <div
                        style={{
                          background: '#FFFFFF',
                          borderRadius: 20,
                          maxWidth: 480,
                          width: '100%',
                          maxHeight: '90vh',
                          overflowY: 'auto',
                          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
                          padding: '20px 22px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 16,
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: 12 }}>
                          <div>
                            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0F172A' }}>
                              Submitted Hotel Details
                            </h3>
                            <span style={{ fontSize: 12, color: '#64748B' }}>
                              All data saved during hotel onboarding
                            </span>
                          </div>
                          <button
                            type="button"
                            data-testid="close-submitted-details-modal-btn"
                            onClick={() => setShowSubmittedDetailsModal(false)}
                            style={{
                              background: '#F1F5F9',
                              border: 'none',
                              borderRadius: 8,
                              width: 32,
                              height: 32,
                              fontSize: 16,
                              fontWeight: 700,
                              color: '#64748B',
                              cursor: 'pointer',
                            }}
                          >
                            ✕
                          </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
                          <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                            <div style={{ fontSize: 11.5, color: '#64748B', fontWeight: 600 }}>Hotel Name</div>
                            <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>{addHotelForm.hotelName}</div>
                          </div>

                          <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                            <div style={{ fontSize: 11.5, color: '#64748B', fontWeight: 600 }}>Admin Name</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>{addHotelForm.adminName}</div>
                          </div>

                          <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 11.5, color: '#64748B', fontWeight: 600 }}>Phone (WhatsApp)</span>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#16A34A', background: '#DCFCE7', padding: '1px 6px', borderRadius: 4 }}>Verified ✓</span>
                            </div>
                            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>{addHotelForm.adminPhone}</div>
                          </div>

                          <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 11.5, color: '#64748B', fontWeight: 600 }}>Admin Email</span>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#16A34A', background: '#DCFCE7', padding: '1px 6px', borderRadius: 4 }}>Verified ✓</span>
                            </div>
                            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>{addHotelForm.adminEmail}</div>
                          </div>

                          <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                            <div style={{ fontSize: 11.5, color: '#64748B', fontWeight: 600 }}>Admin Password</div>
                            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A', marginTop: 2, fontFamily: 'monospace' }}>{finalAdminPassword}</div>
                          </div>

                          <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                            <div style={{ fontSize: 11.5, color: '#64748B', fontWeight: 600 }}>Location & Address</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 2 }}>
                              {[addHotelForm.streetAddress, addHotelForm.city, addHotelForm.state].filter(Boolean).join(', ') || 'Jaipur, Rajasthan'}
                            </div>
                            {addHotelForm.latitude && addHotelForm.longitude && (
                              <div style={{ fontSize: 11.5, color: '#166534', marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="10" />
                                  <line x1="22" y1="12" x2="18" y2="12" />
                                  <line x1="6" y1="12" x2="2" y2="12" />
                                  <line x1="12" y1="6" x2="12" y2="2" />
                                  <line x1="12" y1="22" x2="12" y2="18" />
                                </svg>
                                <span>Coordinates: {addHotelForm.latitude}, {addHotelForm.longitude}</span>
                              </div>
                            )}
                          </div>

                          <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                            <div style={{ fontSize: 11.5, color: '#64748B', fontWeight: 600, marginBottom: 4 }}>
                              Selected Portals & Terminals ({selectedOnboardPortals.length})
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {ONBOARD_PORTAL_CATALOG.filter((p) => selectedOnboardPortals.includes(p.id)).map((p) => (
                                <span
                                  key={p.id}
                                  style={{
                                    fontSize: 11.5,
                                    fontWeight: 700,
                                    background: '#E2E8F0',
                                    color: '#0F172A',
                                    padding: '3px 8px',
                                    borderRadius: 6,
                                  }}
                                >
                                  {p.name}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div style={{ background: '#EFF6FF', padding: '10px 12px', borderRadius: 10, border: '1px solid #BFDBFE' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 11.5, color: '#1E40AF', fontWeight: 700 }}>
                                {onboardBillingCycle === 'annual' ? 'Annual Subscription' : 'Monthly Subscription'}
                              </span>
                              <span style={{ fontSize: 13, fontWeight: 800, color: '#1D4ED8' }}>
                                ₹{totalPayableINR.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Paid)
                              </span>
                            </div>
                          </div>

                          <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                            <div style={{ fontSize: 11.5, color: '#64748B', fontWeight: 600 }}>Hotel Admin Console URL</div>
                            <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#0F172A', wordBreak: 'break-all', marginTop: 4 }}>
                              {adminConsoleUrl}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                          <button
                            type="button"
                            onClick={() => handleCopyText(allDetailsSummary, 'modalAllDetails')}
                            style={{
                              flex: 1,
                              minHeight: 44,
                              borderRadius: 10,
                              border: '1px solid #CBD5E1',
                              background: '#F8FAFC',
                              color: '#0F172A',
                              fontSize: 13,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            {copiedKey === 'modalAllDetails' ? '✓ Copied All!' : 'Copy Summary'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowSubmittedDetailsModal(false)}
                            style={{
                              flex: 1,
                              minHeight: 44,
                              borderRadius: 10,
                              border: 'none',
                              background: '#0F172A',
                              color: '#FFFFFF',
                              fontSize: 13,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
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
        background: '#FFFFFF',
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
          padding: '10px 18px',
          paddingTop: 'max(env(safe-area-inset-top, 0px), 10px)',
          background: '#FFFFFF',
          borderBottom: '1px solid #CBD5E1',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <img
            src={logoImg}
            alt="SpiceHub Logo"
            style={{
              width: 30,
              height: 30,
              objectFit: 'contain',
              borderRadius: 3,
            }}
          />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
                fontSize: 17,
                fontWeight: 600,
                color: '#0F172A',
                letterSpacing: '-0.01em',
                lineHeight: 1.15,
              }}
            >
              SpiceHub
            </div>
            <div style={{ fontSize: 8.5, fontWeight: 800, color: '#15803D', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              Staff Workstation
            </div>
          </div>
        </div>

        {/* Right Header Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Active Hotel Pill */}
          {selectedHotel && (
            <button
              data-testid="selected-hotel-pill"
              onClick={handleChangeHotel}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '4px 0 4px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                maxWidth: 160,
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
                <span style={{ fontSize: 11, color: '#64748B' }}>▣</span>
              )}
              <span
                style={{
                  fontSize: 9,
                  color: '#475569',
                  fontWeight: 800,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  maxWidth: 104,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {selectedHotel.name}
              </span>
              <span style={{ fontSize: 10, color: '#64748B', lineHeight: 1 }}>▾</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Body */}
      <div
        style={{
          flex: 1,
          padding: '20px 18px',
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
        <div
          id="step-hotel-code-section"
          data-testid="staff-hotel-code-section"
          style={{
            width: '100%',
            maxWidth: 440,
            margin: 'auto',
            padding: 22,
            border: '1px solid #E2E8F0',
            borderRadius: 22,
            background: '#FFFFFF',
            boxShadow: '0 18px 48px rgba(15, 23, 42, 0.08)',
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', color: '#16A34A', textTransform: 'uppercase' }}>
            Staff Access
          </div>
          <h2 style={{ margin: '8px 0 6px', color: '#0F172A', fontSize: 24, lineHeight: 1.15, fontWeight: 800 }}>
            Enter Hotel Code
          </h2>
          <p style={{ margin: '0 0 18px', color: '#64748B', fontSize: 13, lineHeight: 1.5 }}>
            Use the current code shared by your Hotel Admin. You will only see staff and terminals for that hotel.
          </p>

          <form
            id="staff-hotel-code-form"
            data-testid="staff-hotel-code-form"
            onSubmit={(event) => void handleVerifyHotelCode(event)}
            style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
          >
            <label htmlFor="staff-hotel-code" style={{ display: 'block', color: '#334155', fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Hotel code
            </label>
            <input
              id="staff-hotel-code"
              data-testid="staff-hotel-code-input"
              type="text"
              autoComplete="one-time-code"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={10}
              value={hotelCode}
              onChange={(event) => {
                setHotelCode(event.target.value.toUpperCase());
                setHotelCodeError(null);
              }}
              placeholder="Write hotel code"
              aria-invalid={Boolean(hotelCodeError)}
              aria-describedby={hotelCodeError ? 'staff-hotel-code-error' : undefined}
              style={{
                width: '100%',
                minHeight: 50,
                boxSizing: 'border-box',
                padding: '0 14px',
                border: hotelCodeError ? '1px solid #DC2626' : '1px solid #CBD5E1',
                borderRadius: 13,
                background: '#F8FAFC',
                color: '#0F172A',
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: '0.14em',
                outlineColor: '#16A34A',
              }}
            />
            {hotelCodeError && (
              <p id="staff-hotel-code-error" role="alert" style={{ margin: '4px 0 0', color: '#B91C1C', fontSize: 12, fontWeight: 600 }}>
                {hotelCodeError}
              </p>
            )}
            <button
              type="submit"
              data-testid="verify-staff-hotel-code"
              disabled={!isValidStaffHotelCode(hotelCode) || isVerifyingHotelCode}
              style={{
                width: '100%',
                minHeight: 48,
                marginTop: 10,
                border: 0,
                borderRadius: 13,
                background: !isValidStaffHotelCode(hotelCode) || isVerifyingHotelCode ? '#94A3B8' : 'var(--staff-primary)',
                color: '#FFFFFF',
                fontSize: 13,
                fontWeight: 800,
                cursor: !isValidStaffHotelCode(hotelCode) || isVerifyingHotelCode ? 'not-allowed' : 'pointer',
              }}
            >
              {isVerifyingHotelCode ? 'Verifying hotel…' : 'Verify Hotel Code'}
            </button>
          </form>

          <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#64748B', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Property Enrollment
              </span>
              <span style={{ fontSize: 10, color: '#16A34A', fontWeight: 700 }}>
                Instant Setup
              </span>
            </div>

            <button
              type="button"
              data-testid="open-onboard-hotel-btn"
              onClick={handleStartOnboard}
              style={{
                width: '100%',
                minHeight: 44,
                border: '1px solid #CBD5E1',
                borderRadius: 12,
                background: '#F8FAFC',
                color: '#0F172A',
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.15s ease',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21h18" />
                <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
                <path d="M9 9h1" />
                <path d="M9 13h1" />
                <path d="M9 17h1" />
                <path d="M14 9h1" />
                <path d="M14 13h1" />
                <path d="M14 17h1" />
              </svg>
              <span>Onboard Property & Setup Terminals</span>
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STEP 2: CHOOSE PORTAL (WAITER, CASHIER, KDS, RECEPTION)        */}
      {/* ------------------------------------------------------------- */}
      {step === 'portal' && (
        <div id="step-portal-section" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Property ledger header */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
            <button
              data-testid="back-to-hotels-btn"
              onClick={handleChangeHotel}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              ← Change property
            </button>
            {selectedHotel && (
              <span style={{ fontSize: 9.5, fontWeight: 800, color: '#64748B', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                {selectedHotel.city || 'India'}
              </span>
            )}
          </div>

          {selectedHotel && (
            <div style={{ borderTop: '2px solid #0F172A', borderBottom: '1px solid #CBD5E1', padding: '14px 0', marginBottom: 22 }}>
              <div
                style={{
                  fontFamily: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
                  fontSize: 25,
                  fontWeight: 600,
                  color: '#0F172A',
                  letterSpacing: '-0.01em',
                  lineHeight: 1.15,
                  marginTop: 5,
                }}
              >
                {selectedHotel.name}
              </div>
            </div>
          )}

          <div style={{ marginBottom: 4 }}>
            <h2
              style={{
                fontFamily: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
                fontSize: 23,
                fontWeight: 600,
                color: '#0F172A',
                margin: 0,
                letterSpacing: '-0.01em',
                lineHeight: 1.2,
              }}
            >
              Choose a portal
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 16, marginBottom: 18 }}>
            {/* 1. Waiter */}
            {isPortalSubscribed('waiter') && (
              <button
                data-testid="portal-card-waiter"
                type="button"
                onClick={() => handleSelectPortal('waiter')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  minHeight: 84,
                  padding: '13px 0',
                  background: 'transparent',
                  border: 'none',
                  borderTop: '1px solid #E2E8F0',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ width: 76, flexShrink: 0, fontSize: 9, fontWeight: 800, color: '#15803D', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Floor
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
                      fontSize: 17,
                      fontWeight: 600,
                      color: '#0F172A',
                      lineHeight: 1.25,
                    }}
                  >
                    Waiter
                  </div>
                  <p style={{ fontSize: 11.5, color: '#475569', lineHeight: 1.4, margin: '3px 0 0' }}>
                    Tables · Orders
                  </p>
                </div>
                <span style={{ fontSize: 12, color: '#0F172A', flexShrink: 0 }}>→</span>
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
                  gap: 12,
                  minHeight: 84,
                  padding: '13px 0',
                  background: 'transparent',
                  border: 'none',
                  borderTop: '1px solid #E2E8F0',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ width: 76, flexShrink: 0, fontSize: 9, fontWeight: 800, color: '#15803D', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Billing
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
                      fontSize: 17,
                      fontWeight: 600,
                      color: '#0F172A',
                      lineHeight: 1.25,
                    }}
                  >
                    Cashier POS
                  </div>
                  <p style={{ fontSize: 11.5, color: '#475569', lineHeight: 1.4, margin: '3px 0 0' }}>
                    Bills · Payments
                  </p>
                </div>
                <span style={{ fontSize: 12, color: '#0F172A', flexShrink: 0 }}>→</span>
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
                  gap: 12,
                  minHeight: 84,
                  padding: '13px 0',
                  background: 'transparent',
                  border: 'none',
                  borderTop: '1px solid #E2E8F0',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ width: 76, flexShrink: 0, fontSize: 9, fontWeight: 800, color: '#15803D', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Kitchen
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
                      fontSize: 17,
                      fontWeight: 600,
                      color: '#0F172A',
                      lineHeight: 1.25,
                    }}
                  >
                    KDS
                  </div>
                  <p style={{ fontSize: 11.5, color: '#475569', lineHeight: 1.4, margin: '3px 0 0' }}>
                    Live tickets
                  </p>
                </div>
                <span style={{ fontSize: 12, color: '#0F172A', flexShrink: 0 }}>→</span>
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
                  gap: 12,
                  minHeight: 84,
                  padding: '13px 0',
                  background: 'transparent',
                  border: 'none',
                  borderTop: '1px solid #E2E8F0',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ width: 76, flexShrink: 0, fontSize: 9, fontWeight: 800, color: '#15803D', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Front desk
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
                      fontSize: 17,
                      fontWeight: 600,
                      color: '#0F172A',
                      lineHeight: 1.25,
                    }}
                  >
                    Reception
                  </div>
                  <p style={{ fontSize: 11.5, color: '#475569', lineHeight: 1.4, margin: '3px 0 0' }}>
                    Guests · Rooms
                  </p>
                </div>
                <span style={{ fontSize: 12, color: '#0F172A', flexShrink: 0 }}>→</span>
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
          {/* Header Sub-bar — names the terminal before any staff list appears */}
          <div style={{ marginBottom: 16 }}>
            <button
              data-testid="back-to-portals-btn"
              type="button"
              onClick={() => {
                setSelectedStaff(null);
                setStep('portal');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                marginBottom: 10,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              ← Change terminal
            </button>
            <h2
              data-testid="active-portal-title"
              style={{
                fontFamily: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
                fontSize: 24,
                fontWeight: 600,
                color: '#0F172A',
                margin: '0 0 4px',
                letterSpacing: '-0.01em',
                lineHeight: 1.2,
              }}
            >
              {portals[selectedPortal].label}
            </h2>
            <p style={{ fontSize: 12, color: '#475569', fontWeight: 500, margin: 0, lineHeight: 1.45 }}>
              Select your name.
            </p>
            <div style={{ height: 1, background: '#CBD5E1', marginTop: 12 }} />
          </div>

          {/* Roster count for the chosen terminal */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, padding: '0 0 8px', borderBottom: '1px solid #CBD5E1' }}>
            <span style={{ fontSize: 9.5, fontWeight: 800, color: '#64748B', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
              {staffLoading ? 'Loading…' : `${displayedStaff.length} staff`}
            </span>
          </div>

          {/* Staff Roster List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, flex: 1, overflowY: 'auto', paddingBottom: 24 }}>
            {staffLoading ? (
              <div data-testid="staff-loading" style={{ padding: '26px 0', textAlign: 'center', color: '#475569', fontSize: 12.5, fontWeight: 600 }}>
                Loading staff…
              </div>
            ) : staffError ? (
              <div data-testid="staff-error" style={{ border: '1px solid #DBEAFE', background: '#F8FAFC', padding: '18px 16px', marginTop: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#8A3B22', marginBottom: 4 }}>
                  Roster unavailable
                </div>
                <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5, marginBottom: 10 }}>
                  {staffError}
                </div>
                <button
                  type="button"
                  onClick={() => void fetchStaff()}
                  style={{
                    background: 'var(--staff-primary)',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '9px 16px',
                    borderRadius: 2,
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    marginRight: 8,
                  }}
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={() => { setSelectedStaff(null); setStep('portal'); }}
                  style={{
                    background: 'transparent',
                    color: '#0F172A',
                    border: '1px solid #94A3B8',
                    padding: '9px 16px',
                    borderRadius: 2,
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  Change terminal
                </button>
              </div>
            ) : displayedStaff.length === 0 ? (
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: 2,
                  padding: '24px 16px',
                  textAlign: 'center',
                  color: '#475569',
                  marginTop: 16,
                }}
              >
                <div style={{ fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 4 }}>
                  No staff members added yet
                </div>
                <div style={{ fontSize: 12.5, marginBottom: 12, color: '#64748B' }}>
                  Log into the Hotel Admin Console to add waiters, chefs, cashiers, or receptionists.
                </div>
                <button
                  onClick={() => {
                    setSelectedStaff(null);
                    setStep('portal');
                  }}
                  style={{
                    background: 'var(--staff-primary)',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: 3,
                    fontSize: 10.5,
                    fontWeight: 800,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  Other portals
                </button>
              </div>
            ) : (
              displayedStaff.map((st) => {
                const initials = String(st.name || '?')
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join('')
                  .toUpperCase();

                return (
                  <div
                    key={st.id}
                    data-testid={`staff-profile-card-${st.id}`}
                    onClick={() => {
                      setSelectedStaff(st);
                      setPin('');
                      setAuthError('');
                      setShowAuthModal(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 0',
                      background: '#FFFFFF',
                      borderRadius: 0,
                      border: 'none',
                      borderBottom: '1px solid #E2E8F0',
                      cursor: 'pointer',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                      {/* Monogram — no stock photo stands in for a real person */}
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          flexShrink: 0,
                          borderRadius: 2,
                          background: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: '"Iowan Old Style", Palatino, Georgia, serif',
                          fontSize: 14,
                          fontWeight: 600,
                          color: '#0F172A',
                          letterSpacing: '0.02em',
                        }}
                      >
                        {initials}
                      </div>

                      {/* Info Details */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                          <span style={{ fontSize: 14.5, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {st.name}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: '#475569', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                          {st.section}{st.tables ? ` · ${st.tables}` : ''}
                        </div>
                      </div>
                    </div>

                    {/* Clean 1-Tap Unlock Pill */}
                    <div
                      style={{
                        color: '#0F172A',
                        fontSize: 9.5,
                        fontWeight: 800,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        flexShrink: 0,
                        marginLeft: 10,
                        borderBottom: '1px solid #94A3B8',
                        paddingBottom: 2,
                      }}
                    >
                      <span>Unlock</span>
                      <span style={{ fontSize: 11, lineHeight: 1 }}>→</span>
                    </div>

                    {/* Hidden automation button for test compatibility */}
                    <button
                      type="button"
                      data-testid={`unlock-staff-btn-${st.id}`}
                      style={{ display: 'none' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStaff(st);
                        setPin('');
                        setAuthError('');
                        setShowAuthModal(true);
                      }}
                    >
                      Unlock
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
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
            background: 'rgba(15, 42, 32, 0.55)',
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
              maxHeight: '92vh',
              overflowY: 'auto',
              background: '#FFFFFF',
              borderRadius: 3,
              padding: '18px 20px 20px',
              border: '1px solid #CBD5E1',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch',
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
                  background: 'transparent',
                  border: 'none',
                  padding: '2px 0',
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: '#64748B',
                  cursor: 'pointer',
                }}
              >
                Close ✕
              </button>
            </div>

            {/* Identity — monogram, never a stock photo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  flexShrink: 0,
                  borderRadius: 2,
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: '"Iowan Old Style", Palatino, Georgia, serif',
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#0F172A',
                }}
              >
                {String(selectedStaff.name || '?')
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join('')
                  .toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <h3
                  style={{
                    fontFamily: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
                    fontSize: 19,
                    fontWeight: 600,
                    color: '#0F172A',
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  {selectedStaff.name}
                </h3>
                <div style={{ fontSize: 9, fontWeight: 800, color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.14em', marginTop: 3 }}>
                  {selectedStaff.role} · {portals[getPortalForRole(selectedStaff.role)].label}
                </div>
              </div>
            </div>

            {/* My Salary & Compensation Card */}
            {selectedStaffSalary && selectedStaffSalary.baseSalary > 0 && (
              <div
                style={{
                  marginTop: 12,
                  padding: '8px 12px',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxSizing: 'border-box',
                }}
              >
                <div>
                  <div style={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', fontSize: 8 }}>Base Salary</div>
                  <div style={{ color: '#0F172A', fontWeight: 800, fontSize: 11 }}>₹{selectedStaffSalary.baseSalary.toLocaleString('en-IN')}</div>
                </div>
                <div>
                  <div style={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', fontSize: 8 }}>Total Paid</div>
                  <div style={{ color: '#15803D', fontWeight: 800, fontSize: 11 }}>₹{selectedStaffSalary.totalPaid.toLocaleString('en-IN')}</div>
                </div>
                {selectedStaffSalary.advancesTaken > 0 && (
                  <div>
                    <div style={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', fontSize: 8 }}>Advance</div>
                    <div style={{ color: '#B45309', fontWeight: 800, fontSize: 11 }}>₹{selectedStaffSalary.advancesTaken.toLocaleString('en-IN')}</div>
                  </div>
                )}
                <div>
                  <div style={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', fontSize: 8 }}>Due Payable</div>
                  <div style={{ color: selectedStaffSalary.netPayable > 0 ? '#1D4ED8' : '#64748B', fontWeight: 800, fontSize: 11 }}>
                    ₹{selectedStaffSalary.netPayable.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            )}

            <div style={{ height: 1, background: '#CBD5E1', marginTop: 14 }} />

            <div style={{ fontSize: 10, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.18em', marginTop: 18 }}>
              Enter 4-digit PIN
            </div>

            {/* Error Message Display */}
            {authError && (
              <div
                data-testid="pin-auth-error"
                style={{
                  width: '100%',
                  background: '#F8FAFC',
                  borderLeft: '2px solid #16A34A',
                  color: '#8A2B20',
                  fontSize: 11.5,
                  fontWeight: 600,
                  padding: '8px 12px',
                  borderRadius: 0,
                  marginTop: 12,
                  lineHeight: 1.4,
                  boxSizing: 'border-box',
                }}
              >
                {authError}
              </div>
            )}

            {isSubmitting && (
              <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748B', marginTop: 12, letterSpacing: '0.04em' }}>
                Verifying PIN and unlocking workstation…
              </div>
            )}

            {/* Single Unified 4-Box PIN Input with Native Android Keyboard */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (pin.length === 4) {
                  void executePinLogin(pin);
                }
              }}
              style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 0 }}
            >
              {/* 4 Digit Boxes Container */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: 52,
                  marginTop: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  cursor: 'text',
                }}
                onClick={() => {
                  const el = document.querySelector('[data-testid="native-pin-input"]') as HTMLInputElement;
                  el?.focus();
                }}
              >
                {[0, 1, 2, 3].map((i) => {
                  const isFilled = i < pin.length;
                  const isCurrent = i === pin.length;
                  return (
                    <div
                      key={i}
                      data-testid={`pin-box-${i}`}
                      style={{
                        flex: 1,
                        height: 52,
                        borderRadius: 0,
                        background: 'transparent',
                        borderBottom: `2px solid ${
                          isFilled ? '#0F172A' : isCurrent ? '#15803D' : '#CBD5E1'
                        }`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'border-color 0.15s ease',
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: isFilled ? '#0F172A' : 'transparent',
                        }}
                      />
                    </div>
                  );
                })}

                {/* Transparent input overlaid on top so Android virtual numeric keyboard opens and captures taps */}
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  autoFocus
                  data-testid="native-pin-input"
                  value={pin}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                    setPin(clean);
                    setAuthError('');
                    if (clean.length === 4) {
                      void executePinLogin(clean);
                    }
                  }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'text',
                    zIndex: 2,
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={pin.length !== 4 || isSubmitting}
                data-testid="btn-login-pin"
                style={{
                  width: '100%',
                  height: 48,
                  marginTop: 22,
                  background: pin.length === 4 && !isSubmitting ? 'var(--staff-primary)' : '#94A3B8',
                  color: '#FFFFFF',
                  borderRadius: 3,
                  border: 'none',
                  fontSize: 11.5,
                  fontWeight: 800,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  cursor: pin.length === 4 && !isSubmitting ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <span>{isSubmitting ? 'Checking…' : 'Unlock terminal'}</span>
              </button>
            </form>

            {/* Forgot PIN Action Button */}
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #CBD5E1', width: '100%', textAlign: 'center' }}>
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
                  color: '#475569',
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textDecoration: 'underline',
                  textUnderlineOffset: 2,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <span>Forgot PIN?</span>
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
            background: 'rgba(15, 42, 32, 0.55)',
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
              borderRadius: 3,
              padding: '18px 20px 20px',
              border: '1px solid #CBD5E1',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxSizing: 'border-box',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: '#15803D', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 4 }}>
                  Credential recovery
                </div>
                <h3
                  style={{
                    fontFamily: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
                    fontSize: 19,
                    fontWeight: 600,
                    color: '#0F172A',
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  PIN recovery
                </h3>
                <span style={{ fontSize: 10.5, color: '#64748B', fontWeight: 600, letterSpacing: '0.02em' }}>
                  {selectedStaff.name} · {selectedStaff.role}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowForgotPinModal(false);
                  setOtpStatusMsg(null);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '2px 0',
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: '#64748B',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                Close ✕
              </button>
            </div>

            <div style={{ height: 1, background: '#CBD5E1', margin: '14px 0 0' }} />

            {/* Tab Switcher: Email OTP vs Ask Admin */}
            <div
              style={{
                display: 'flex',
                background: 'transparent',
                borderRadius: 0,
                padding: 0,
                marginTop: 14,
                marginBottom: 16,
                borderBottom: '1px solid #CBD5E1',
              }}
            >
              <button
                type="button"
                data-testid="forgot-tab-otp"
                onClick={() => { setForgotPinTab('otp'); setOtpStatusMsg(null); }}
                style={{
                  flex: 1,
                  padding: '7px 0 8px',
                  borderRadius: 0,
                  border: 'none',
                  borderBottom: forgotPinTab === 'otp' ? '2px solid #0F172A' : '2px solid transparent',
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  background: 'transparent',
                  color: forgotPinTab === 'otp' ? '#0F172A' : '#64748B',
                }}
              >
                Reset via OTP
              </button>
              <button
                type="button"
                data-testid="forgot-tab-admin"
                onClick={() => { setForgotPinTab('admin'); setOtpStatusMsg(null); }}
                style={{
                  flex: 1,
                  padding: '7px 0 8px',
                  borderRadius: 0,
                  border: 'none',
                  borderBottom: forgotPinTab === 'admin' ? '2px solid #0F172A' : '2px solid transparent',
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  background: 'transparent',
                  color: forgotPinTab === 'admin' ? '#0F172A' : '#64748B',
                }}
              >
                Admin Assistance
              </button>
            </div>

            {/* Status Message */}
            {otpStatusMsg && (
              <div
                style={{
                  background: otpStatusMsg.type === 'success' ? '#F8FAFC' : '#F8FAFC',
                  borderLeft: otpStatusMsg.type === 'success' ? '2px solid #16A34A' : '2px solid #DC2626',
                  color: otpStatusMsg.type === 'success' ? '#15803D' : '#8A2B20',
                  fontSize: 11.5,
                  fontWeight: 600,
                  padding: '8px 12px',
                  borderRadius: 0,
                  marginBottom: 12,
                  lineHeight: 1.4,
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
                    <p style={{ fontSize: 11.5, color: '#475569', margin: '0 0 4px', lineHeight: 1.45 }}>
                      A 6-digit security OTP will be sent to your registered staff email via Resend API to verify your identity.
                    </p>
                    <div>
                      <label style={{ fontSize: 9, fontWeight: 800, color: '#64748B', letterSpacing: '0.16em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>
                        Staff email address
                      </label>
                      <input
                        type="email"
                        required
                        value={otpEmail}
                        onChange={(e) => setOtpEmail(e.target.value)}
                        placeholder="Write email address"
                        style={{
                          width: '100%',
                          padding: '9px 0',
                          borderRadius: 0,
                          border: 'none',
                          borderBottom: '1px solid #94A3B8',
                          fontSize: 14,
                          color: '#0F172A',
                          background: 'transparent',
                          outline: 'none',
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
                        borderRadius: 3,
                        background: isOtpSubmitting ? '#94A3B8' : 'var(--staff-primary)',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: '0.16em',
                        textTransform: 'uppercase',
                        cursor: isOtpSubmitting ? 'not-allowed' : 'pointer',
                        marginTop: 14,
                      }}
                    >
                      {isOtpSubmitting ? 'Sending…' : 'Send verification OTP'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyPinOtp} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ textAlign: 'center' }}>
                      <label style={{ fontSize: 9, fontWeight: 800, color: '#64748B', letterSpacing: '0.16em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>
                        Enter 6-digit OTP code
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        required
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="Write 6-digit OTP code"
                        style={{
                          width: '100%',
                          padding: '9px 0',
                          borderRadius: 0,
                          border: 'none',
                          borderBottom: '2px solid #0F172A',
                          background: 'transparent',
                          outline: 'none',
                          fontSize: 20,
                          fontWeight: 700,
                          letterSpacing: 8,
                          textAlign: 'center',
                          color: '#0F172A',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <label style={{ fontSize: 9, fontWeight: 800, color: '#64748B', letterSpacing: '0.14em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                          New 4-digit PIN
                        </label>
                        <input
                          type="password"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={4}
                          required
                          value={newOtpPin}
                          onChange={(e) => setNewOtpPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="Write new 4-digit PIN"
                          style={{
                            width: '100%',
                            padding: '8px 0',
                            borderRadius: 0,
                            border: 'none',
                            borderBottom: newOtpPin.length === 4 ? '2px solid #0F172A' : '1px solid #94A3B8',
                            background: 'transparent',
                            outline: 'none',
                            fontSize: 16,
                            textAlign: 'center',
                            color: '#0F172A',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 9, fontWeight: 800, color: '#64748B', letterSpacing: '0.14em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
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
                          placeholder="Confirm 4-digit PIN"
                          style={{
                            width: '100%',
                            padding: '8px 0',
                            borderRadius: 0,
                            border: 'none',
                            borderBottom:
                              confirmOtpPin.length === 4 && confirmOtpPin === newOtpPin
                                ? '2px solid #0F172A'
                                : '1px solid #94A3B8',
                            background: 'transparent',
                            outline: 'none',
                            fontSize: 16,
                            textAlign: 'center',
                            color: '#0F172A',
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
                        borderRadius: 3,
                        background:
                          newOtpPin.length === 4 && newOtpPin === confirmOtpPin && !isOtpSubmitting
                            ? '#0F172A'
                            : '#94A3B8',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: '0.16em',
                        textTransform: 'uppercase',
                        cursor:
                          newOtpPin.length === 4 && newOtpPin === confirmOtpPin && !isOtpSubmitting
                            ? 'pointer'
                            : 'not-allowed',
                        marginTop: 14,
                      }}
                    >
                      {isOtpSubmitting ? 'Activating…' : 'Verify and set PIN'}
                    </button>

                    <div style={{ textAlign: 'center', marginTop: 4 }}>
                      <button
                        type="button"
                        onClick={() => { setOtpStep('request'); setOtpStatusMsg(null); }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#475569',
                          fontSize: 10.5,
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          textUnderlineOffset: 2,
                        }}
                      >
                        ← Re-send OTP to a different email
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* TAB 2: ASK HOTEL ADMIN */}
            {forgotPinTab === 'admin' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ border: '1px solid #CBD5E1', borderRadius: 2, padding: '12px 14px', background: '#F8FAFC' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: '#15803D', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                      Hotel admin PIN access
                    </span>
                  </div>
                  <p style={{ fontSize: 11.5, color: '#475569', margin: 0, lineHeight: 1.5 }}>
                    Your Hotel Admin has full visibility of staff PINs in the <strong>Hotel Admin ERP Portal</strong> under <strong>Staff & Terminal Access</strong>.
                  </p>
                </div>

                <div style={{ border: '1px solid #CBD5E1', borderRadius: 2, padding: '12px 14px', fontSize: 11.5, color: '#475569', lineHeight: 1.55 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: '#64748B', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6 }}>
                    Instructions
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
                    padding: '12px 0',
                    borderRadius: 3,
                    background: 'var(--staff-primary)',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  Back to keypad
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
