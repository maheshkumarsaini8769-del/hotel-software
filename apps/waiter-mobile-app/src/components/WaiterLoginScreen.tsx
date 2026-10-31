import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';
import {
  ChefHat,
  Lock,
  User,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Building2,
  Grid,
  Users,
  SlidersHorizontal,
  Save,
  X,
  Mail
} from 'lucide-react';

export interface WaiterStaffProfile {
  staffId: string;
  name: string;
  email?: string;
  role: 'Captain' | 'Senior Waiter' | 'Floor Steward';
  /** Never shipped to the browser — the PIN is verified by the server. */
  pin?: string;
  avatar: string;
  assignedSection: string;
  assignedTableStart: number;
  assignedTableEnd: number;
  assignedTableCount: number;
  shift: string;
  permissions: string[];
}

export const PRECONFIGURED_WAITERS: WaiterStaffProfile[] = [
  {
    staffId: '6ae06e27ddbafddfbb0a81f2',
    name: 'Mahesh',
    email: 'maheshkumarsaini8769@gmail.com',
    role: 'Floor Steward',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
    assignedSection: 'Indoor AC Hall',
    assignedTableStart: 1,
    assignedTableEnd: 6,
    assignedTableCount: 6,
    shift: 'Evening Shift (04:00 PM - 12:00 AM)',
    permissions: ['KOT Punching', 'Food Pickup & Serving', 'Table Transfer', 'Bill Settle Request', 'Guest Calls'],
  },
  {
    staffId: 'W-101',
    name: 'Ravi Kumar',
    email: 'maheshsaini10101@gmail.com',
    role: 'Captain',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    assignedSection: 'Indoor AC Dining Hall',
    assignedTableStart: 1,
    assignedTableEnd: 6,
    assignedTableCount: 6,
    shift: 'Morning Shift (09:00 AM - 05:00 PM)',
    permissions: ['KOT Punching', 'Food Pickup & Serving', 'Table Transfer', 'Bill Settle Request', 'Guest Calls'],
  },
  {
    staffId: 'W-102',
    name: 'Ramesh Kumar',
    email: 'ashishsaini8saini@gmail.com',
    role: 'Senior Waiter',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    assignedSection: 'AC Hall & Lounge',
    assignedTableStart: 7,
    assignedTableEnd: 12,
    assignedTableCount: 6,
    shift: 'Evening Shift (04:00 PM - 12:00 AM)',
    permissions: ['KOT Punching', 'Food Pickup & Serving', 'Table Transfer', 'Bill Settle Request', 'Guest Calls'],
  },
  {
    staffId: 'W-103',
    name: 'Amit Singh',
    email: 'praveensinghshekhawat43@gmail.com',
    role: 'Floor Steward',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    assignedSection: 'Lounge & Rooftop Terrace',
    assignedTableStart: 13,
    assignedTableEnd: 18,
    assignedTableCount: 6,
    shift: 'Night Shift (08:00 PM - 04:00 AM)',
    permissions: ['KOT Punching', 'Food Pickup & Serving', 'Table Transfer', 'Bill Settle Request', 'Guest Calls'],
  },
];

export const getHotelAdminAllocatedWaiters = (): WaiterStaffProfile[] => {
  try {
    const raw = localStorage.getItem('spicehub_admin_waiter_allocations');
    const customAvatarsRaw = localStorage.getItem('spicehub_custom_waiter_avatars');
    const createdStaffRaw = localStorage.getItem('spicehub_admin_created_staff');

    const parsed = raw ? JSON.parse(raw) : {};
    const customAvatars = customAvatarsRaw ? JSON.parse(customAvatarsRaw) : {};
    const createdStaffList = createdStaffRaw ? JSON.parse(createdStaffRaw) : [];

    const baseWaiters = PRECONFIGURED_WAITERS.map((w) => {
      const alloc = parsed[w.staffId];
      const start = alloc ? Number(alloc.start) || w.assignedTableStart : w.assignedTableStart;
      const end = alloc ? Number(alloc.end) || w.assignedTableEnd : w.assignedTableEnd;
      const section = alloc?.section || w.assignedSection;
      const avatar = customAvatars[w.staffId] || alloc?.avatar || w.avatar;
      return {
        ...w,
        assignedTableStart: start,
        assignedTableEnd: end,
        assignedTableCount: end - start + 1,
        assignedSection: section,
        avatar,
      };
    });

    if (Array.isArray(createdStaffList) && createdStaffList.length > 0) {
      const extraWaiters: WaiterStaffProfile[] = createdStaffList
        .filter((s: any) => s && String(s.role).toUpperCase().includes('WAITER'))
        .filter((s: any) => !baseWaiters.some((bw) => bw.staffId === s.id || bw.name === s.name))
        .map((s: any) => {
          const start = Number(s.assignedTableStart) || 1;
          const end = Number(s.assignedTableEnd) || 6;
          return {
            staffId: s.id || `W-${Math.floor(100 + Math.random() * 800)}`,
            name: s.name,
            role: 'Senior Waiter',
            avatar: customAvatars[s.id] || s.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
            assignedSection: s.assignedSection || 'Indoor AC Hall',
            assignedTableStart: start,
            assignedTableEnd: end,
            assignedTableCount: end - start + 1,
            shift: s.shift || 'Morning Shift (09:00 AM - 05:00 PM)',
            permissions: ['KOT Punching', 'Food Pickup & Serving', 'Table Transfer', 'Bill Settle Request', 'Guest Calls'],
          };
        });
      return [...extraWaiters, ...baseWaiters];
    }

    return baseWaiters;
  } catch (_) {}
  return PRECONFIGURED_WAITERS;
};

export interface WaiterAuthSession {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    hotelId: string;
    hotelName?: string;
  };
}


/** Maps the server-verified staff identity onto the local roster profile. */
function resolveStaffProfile(
  localProfile: WaiterStaffProfile,
  user?: { name?: string; role?: string; id?: string }
): WaiterStaffProfile {
  if (!user) return localProfile;
  return {
    ...localProfile,
    staffId: user.id || localProfile.staffId,
    name: user.name || localProfile.name,
    role: localProfile.role,
  };
}

function isLoopbackHost(): boolean {
  if (typeof window === 'undefined') return false;
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
}

interface WaiterLoginScreenProps {
  hotelName?: string;
  onLoginSuccess: (staff: WaiterStaffProfile, session?: WaiterAuthSession) => void;
  onOpenPortalsSwitcher: () => void;
}

export const WaiterLoginScreen: React.FC<WaiterLoginScreenProps> = ({
  hotelName = 'Hotel Taj Gateway & Luxury Dining',
  onLoginSuccess,
  onOpenPortalsSwitcher,
}) => {
  const [waitersList, setWaitersList] = useState<WaiterStaffProfile[]>(getHotelAdminAllocatedWaiters);
  const [selectedStaff, setSelectedStaff] = useState<WaiterStaffProfile>(waitersList[0]);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [failedPinAttempts, setFailedPinAttempts] = useState(0);
  const [pinLockedUntil, setPinLockedUntil] = useState(0);

  // Admin Table Allocation Settings Modal
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [editAllocations, setEditAllocations] = useState<{ [key: string]: { start: number; end: number; section: string } }>(() => {
    const map: any = {};
    waitersList.forEach((w) => {
      map[w.staffId] = { start: w.assignedTableStart, end: w.assignedTableEnd, section: w.assignedSection };
    });
    return map;
  });

  const handleSaveAdminAllocations = () => {
    try {
      localStorage.setItem('spicehub_admin_waiter_allocations', JSON.stringify(editAllocations));
    } catch (_) {}
    const updated = getHotelAdminAllocatedWaiters();
    setWaitersList(updated);
    const curr = updated.find((w) => w.staffId === selectedStaff.staffId) || updated[0];
    setSelectedStaff(curr);
    setIsAdminModalOpen(false);
  };

  const handlePinDigit = (digit: string) => {
    if (enteredPin.length < 4) {
      const next = enteredPin + digit;
      setEnteredPin(next);
      setPinError(null);
      if (next.length === 4 && selectedStaff) {
        verifyPin(next, selectedStaff);
      }
    }
  };

  const handleBackspace = () => {
    setEnteredPin((prev) => prev.slice(0, -1));
    setPinError(null);
  };

  // Resend Email OTP Modal State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newOtpPin, setNewOtpPin] = useState('');
  const [confirmOtpPin, setConfirmOtpPin] = useState('');
  const [otpStep, setOtpStep] = useState<'request' | 'verify'>('request');
  const [otpStatusMsg, setOtpStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isOtpSubmitting, setIsOtpSubmitting] = useState(false);

  // Fetch live staff roster from MongoDB backend
  useEffect(() => {
    const fetchLiveStaff = async () => {
      try {
        const hotelId = localStorage.getItem('spicehub_hotel_id') || localStorage.getItem('hotelId') || '';
        const res = await fetch(`${API_BASE_URL}/hotel-staff?hotelId=${hotelId}`);
        if (!res.ok) return;
        const body = await res.json().catch(() => null);
        if (body?.success && Array.isArray(body?.data)) {
          const liveWaiters: WaiterStaffProfile[] = body.data
            .filter((u: any) => ['WAITER', 'CAPTAIN', 'STEWARD', 'ADMIN'].includes(String(u.role).toUpperCase()))
            .map((u: any, idx: number) => {
              const start = Number(u.assignedTableStart) || (idx * 6 + 1);
              const end = Number(u.assignedTableEnd) || (start + 5);
              return {
                staffId: u.id || u._id,
                name: u.name,
                email: u.email || '',
                role: (String(u.role).toUpperCase() === 'CAPTAIN' ? 'Captain' : 'Senior Waiter') as WaiterStaffProfile['role'],
                avatar: u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
                assignedSection: u.assignedSection || 'Indoor AC Dining Hall',
                assignedTableStart: start,
                assignedTableEnd: end,
                assignedTableCount: end - start + 1,
                shift: u.shift || 'General Shift',
                permissions: ['KOT Punching', 'Food Pickup & Serving', 'Table Transfer', 'Bill Settle Request', 'Guest Calls'],
              };
            });
          if (liveWaiters.length > 0) {
            setWaitersList((prev) => {
              const ids = new Set(liveWaiters.map((w) => w.staffId));
              const nonDuplicatedPrev = prev.filter((p) => !ids.has(p.staffId) && !liveWaiters.some((lw) => lw.email && lw.email.toLowerCase() === (p.email || '').toLowerCase()));
              return [...liveWaiters, ...nonDuplicatedPrev];
            });
          }
        }
      } catch (_) {}
    };
    fetchLiveStaff();
  }, []);

  const handleSendPinOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!otpEmail) {
      setOtpStatusMsg({ type: 'error', text: 'Please enter your registered staff email address.' });
      return;
    }
    setIsOtpSubmitting(true);
    setOtpStatusMsg(null);
    try {
      const hotelId = localStorage.getItem('spicehub_hotel_id') || localStorage.getItem('hotelId') || '';
      const res = await fetch(`${API_BASE_URL}/auth/send-pin-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: otpEmail.trim().toLowerCase(),
          staffId: selectedStaff?.staffId,
          hotelId,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        const dest = data.data?.deliveredTo || data.data?.email || otpEmail;
        const isFwd = data.data?.forwarded;
        setOtpStatusMsg({
          type: 'success',
          text: isFwd
            ? `✅ OTP generated! Delivered to verified owner inbox (${dest}) for ${otpEmail}. Please check your email to retrieve your 6-digit code.`
            : `✅ 6-digit OTP code sent to your email inbox (${dest})! Check your email to retrieve your code.`,
        });
        setOtpStep('verify');
      } else {
        setOtpStatusMsg({ type: 'error', text: data?.message || 'Failed to send OTP email.' });
      }
    } catch {
      setOtpStatusMsg({ type: 'error', text: 'Network error connecting to OTP service.' });
    } finally {
      setIsOtpSubmitting(false);
    }
  };

  const handleVerifyPinOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || !newOtpPin) {
      setOtpStatusMsg({ type: 'error', text: 'Please enter both the OTP code and new PIN.' });
      return;
    }
    if (!/^\d{4}$/.test(newOtpPin)) {
      setOtpStatusMsg({ type: 'error', text: 'New PIN must be exactly 4 numeric digits.' });
      return;
    }
    if (newOtpPin !== confirmOtpPin) {
      setOtpStatusMsg({ type: 'error', text: 'New PIN and Confirm PIN do not match.' });
      return;
    }

    setIsOtpSubmitting(true);
    setOtpStatusMsg(null);
    try {
      const hotelId = localStorage.getItem('spicehub_hotel_id') || localStorage.getItem('hotelId') || '';
      const res = await fetch(`${API_BASE_URL}/auth/verify-pin-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: otpEmail.trim().toLowerCase(),
          staffId: selectedStaff?.staffId,
          otp: otpCode.trim(),
          newPin: newOtpPin.trim(),
          hotelId,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setOtpStatusMsg({
          type: 'success',
          text: '🎉 PIN successfully reset and activated! Signing you in...',
        });
        setEnteredPin(newOtpPin.trim());
        setTimeout(() => {
          setShowOtpModal(false);
          verifyPin(newOtpPin.trim(), selectedStaff);
        }, 1200);
      } else {
        setOtpStatusMsg({ type: 'error', text: data?.message || 'Invalid or expired OTP code.' });
      }
    } catch {
      setOtpStatusMsg({ type: 'error', text: 'Network error verifying OTP code.' });
    } finally {
      setIsOtpSubmitting(false);
    }
  };

  const [isVerifying, setIsVerifying] = useState(false);

  /**
   * The PIN is verified by the backend against the Argon2 hash stored for the
   * staff account. The browser never receives or stores a PIN list.
   */
  const verifyPin = async (pin: string, staff: WaiterStaffProfile) => {
    if (Date.now() < pinLockedUntil) {
      const seconds = Math.ceil((pinLockedUntil - Date.now()) / 1000);
      setPinError(`Too many attempts. Try again in ${seconds}s.`);
      setEnteredPin('');
      return;
    }

    setIsVerifying(true);
    try {
      const hotelId = localStorage.getItem('spicehub_hotel_id') || localStorage.getItem('hotelId') || '';
      const response = await fetch(`${API_BASE_URL}/auth/waiter-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(hotelId ? { 'x-hotel-id': hotelId } : {}),
        },
        body: JSON.stringify({
          pin,
          hotelId: hotelId || undefined,
          staffId: staff.staffId,
          email: staff.email,
          portal: 'waiter',
        }),
      });
      const body = await response.json().catch(() => null);

      if (!response.ok || !body?.success) {
        if (body?.errorCode === 'PORTAL_NOT_SUBSCRIBED') {
          setPinError(
            body?.message ||
              "The Waiter Mobile Handheld portal is not included in this hotel's subscription. Please contact your Super Administrator."
          );
          setEnteredPin('');
          return;
        }
        if (body?.errorCode === 'PIN_PENDING_ADMIN_APPROVAL') {
          setPinError('⏳ PIN Pending Approval: Your 4-digit PIN is awaiting Hotel Admin approval.');
          setEnteredPin('');
          return;
        }
        const next = failedPinAttempts + 1;
        setFailedPinAttempts(next);
        setEnteredPin('');
        setPinError(
          body?.message ||
            (next >= 5
              ? 'Account temporarily locked for 60 seconds.'
              : `Invalid staff PIN. ${5 - next} attempt${5 - next === 1 ? '' : 's'} remaining.`)
        );
        if (next >= 5) {
          setPinLockedUntil(Date.now() + 60_000);
        }
        return;
      }

      setFailedPinAttempts(0);
      setPinLockedUntil(0);
      setPinError(null);
      onLoginSuccess(resolveStaffProfile(staff, body.data?.user), body.data);
    } catch {
      setPinError('Cannot reach the SpiceHub server. Check your connection and retry.');
      setEnteredPin('');
    } finally {
      setIsVerifying(false);
    }
  };

  /** Local demo helper: the server issues a demo staff session (dev bypass only). */
  const handleQuickLogin = async (staff: WaiterStaffProfile) => {
    setIsVerifying(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/waiter-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demo: true }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success) {
        setPinError(body?.message || 'Demo login is not available on this server.');
        return;
      }
      setPinError(null);
      onLoginSuccess(resolveStaffProfile(staff, body.data?.user), body.data);
    } catch {
      setPinError('Cannot reach the SpiceHub server. Check your connection and retry.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col justify-center items-center p-0 md:p-4 font-sans select-none">
      {/* Centered Staff Login Card (Tablet/Desktop: max-w-md mx-auto mt-20, Mobile: full-screen white card) */}
      <div className="w-full min-h-screen md:min-h-0 md:max-w-md mx-auto md:mt-20 bg-white dark:bg-slate-900 md:border md:border-slate-200 md:dark:border-slate-800 md:rounded-2xl p-6 shadow-sm flex flex-col items-center text-center justify-center">
        {/* Optional Multi-Waiter Selector Bar if multiple profiles configured */}
        {waitersList.length > 1 && (
          <div className="w-full flex items-center justify-center gap-1.5 overflow-x-auto pb-3 mb-4 border-b border-slate-200 dark:border-slate-800 custom-scrollbar">
            {waitersList.map((staff) => {
              const isSelected = selectedStaff.staffId === staff.staffId;
              return (
                <button
                  key={staff.staffId}
                  type="button"
                  data-testid={`card-staff-${staff.name.toLowerCase()}`}
                  onClick={() => {
                    setSelectedStaff(staff);
                    setEnteredPin('');
                    setPinError(null);
                    setFailedPinAttempts(0);
                    setPinLockedUntil(0);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition border ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white'
                      : 'bg-white text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {staff.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Staff Card: Photo, Name, Role */}
        <img
          src={selectedStaff.avatar}
          alt={selectedStaff.name}
          className="w-20 h-20 rounded-full border-2 border-slate-200 dark:border-slate-700 object-cover mb-3"
        />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          {selectedStaff.name}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
          {selectedStaff.role}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-5">
          {selectedStaff.assignedSection} • Tables T-{String(selectedStaff.assignedTableStart).padStart(2, '0')} to T-{String(selectedStaff.assignedTableEnd).padStart(2, '0')}
        </p>

        {/* 4-Digit PIN Dots */}
        <div className="flex items-center gap-4 mb-5 justify-center">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full border-2 transition-all ${
                enteredPin.length > idx
                  ? 'bg-slate-900 border-slate-900 dark:bg-white dark:border-white'
                  : 'border-slate-300 dark:border-slate-700 bg-transparent'
              }`}
            />
          ))}
        </div>

        {pinError && (
          <div className="text-xs text-red-600 dark:text-red-400 font-semibold mb-3">
            {pinError}
          </div>
        )}

        {/* 3-Column Numpad */}
        <div className="grid grid-cols-3 gap-3 w-full mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              data-testid={`btn-digit-${digit}`}
              onClick={() => handlePinDigit(digit)}
              className="h-16 text-2xl font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white transition flex items-center justify-center cursor-pointer shadow-xs active:scale-95"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            data-testid="btn-digit-clear"
            onClick={() => setEnteredPin('')}
            className="h-16 text-base font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition flex items-center justify-center cursor-pointer active:scale-95"
          >
            Clear
          </button>
          <button
            type="button"
            data-testid="btn-digit-0"
            onClick={() => handlePinDigit('0')}
            className="h-16 text-2xl font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white transition flex items-center justify-center cursor-pointer shadow-xs active:scale-95"
          >
            0
          </button>
          <button
            type="button"
            data-testid="btn-digit-delete"
            onClick={handleBackspace}
            className="h-16 text-xl font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition flex items-center justify-center cursor-pointer active:scale-95"
          >
            ⌫
          </button>
        </div>

        {/* Login Button */}
        <button
          type="button"
          data-testid="btn-login-pin"
          onClick={() => verifyPin(enteredPin, selectedStaff)}
          disabled={enteredPin.length !== 4 || isVerifying}
          className="h-14 w-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl text-lg font-bold hover:opacity-90 disabled:opacity-40 transition flex items-center justify-center cursor-pointer shadow-sm active:scale-95 mb-3"
        >
          {isVerifying ? 'Authenticating...' : 'Sign In'}
        </button>

        {/* Reset via OTP & Admin Configuration Actions */}
        <div className="flex items-center justify-between w-full pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
          <button
            type="button"
            data-testid="btn-forgot-pin-otp"
            onClick={() => {
              setOtpEmail(selectedStaff.email || '');
              setOtpCode('');
              setNewOtpPin('');
              setConfirmOtpPin('');
              setOtpStep('request');
              setOtpStatusMsg(null);
              setShowOtpModal(true);
            }}
            className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white font-medium underline cursor-pointer"
          >
            Forgot PIN? Reset with OTP
          </button>

          <button
            type="button"
            onClick={() => setIsAdminModalOpen(true)}
            className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white font-medium flex items-center gap-1 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Set Tables</span>
          </button>
        </div>
      </div>

      {/* Hotel Admin Table Allocation Configuration Modal */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-sm space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold">
                  <SlidersHorizontal className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-slate-900 dark:text-white">Hotel Admin: Set Waiter Tables</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Configure which tables each waiter is assigned to handle</p>
                </div>
              </div>
              <button
                onClick={() => setIsAdminModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
              {waitersList.map((w) => {
                const alloc = editAllocations[w.staffId] || { start: w.assignedTableStart, end: w.assignedTableEnd, section: w.assignedSection };
                return (
                  <div
                    key={w.staffId}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img src={w.avatar} alt={w.name} className="w-7 h-7 rounded-full object-cover" />
                        <div>
                          <span className="font-semibold text-xs text-slate-900 dark:text-white">{w.name}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1.5">({w.role})</span>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono font-bold">
                        {w.staffId}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold block mb-1">
                          Start Table # (From)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={alloc.start}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            setEditAllocations((prev) => ({
                              ...prev,
                              [w.staffId]: { ...prev[w.staffId], start: val },
                            }));
                          }}
                          className="w-full p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-mono font-bold text-xs focus:outline-none focus:border-slate-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold block mb-1">
                          End Table # (To)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={alloc.end}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            setEditAllocations((prev) => ({
                              ...prev,
                              [w.staffId]: { ...prev[w.staffId], end: val },
                            }));
                          }}
                          className="w-full p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-mono font-bold text-xs focus:outline-none focus:border-slate-500"
                        />
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-600 dark:text-slate-400">
                      <span>Dining Section: </span>
                      <input
                        type="text"
                        value={alloc.section}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditAllocations((prev) => ({
                            ...prev,
                            [w.staffId]: { ...prev[w.staffId], section: val },
                          }));
                        }}
                        className="w-full mt-1 p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 text-xs focus:outline-none focus:border-slate-500"
                      />
                    </div>

                    <div className="text-[11px] text-slate-700 dark:text-slate-300 font-medium bg-slate-100 dark:bg-slate-700/50 px-2 py-1 rounded-lg">
                      Assigned: Tables T-{String(alloc.start).padStart(2, '0')} to T-{String(alloc.end).padStart(2, '0')} (Total {Math.max(1, alloc.end - alloc.start + 1)} Tables)
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setIsAdminModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAdminAllocations}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center gap-1.5 hover:opacity-90 transition shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Table Allocation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resend Email OTP Modal - PIN Reset via Email Only */}
      {showOtpModal && (
        <div
          data-testid="waiter-pin-otp-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-sm space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold">
                  <Mail className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-slate-900 dark:text-white">Reset Staff Workstation PIN</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Security code sent directly to your email inbox</p>
                </div>
              </div>
              <button
                onClick={() => setShowOtpModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selected staff preview */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <img
                src={selectedStaff.avatar}
                alt={selectedStaff.name}
                className="w-10 h-10 rounded-full object-cover border border-slate-300 dark:border-slate-600"
              />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">{selectedStaff.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <span>{selectedStaff.role}</span>
                  <span>•</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{selectedStaff.staffId}</span>
                </div>
              </div>
            </div>

            {/* Status notification banner */}
            {otpStatusMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold border ${
                  otpStatusMsg.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300'
                    : 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800/80 text-red-800 dark:text-red-300'
                }`}
              >
                {otpStatusMsg.text}
              </div>
            )}

            {otpStep === 'request' ? (
              <form onSubmit={handleSendPinOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Registered Staff Email Address:
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <input
                      type="email"
                      required
                      value={otpEmail}
                      onChange={(e) => setOtpEmail(e.target.value)}
                      placeholder="e.g. staff@hotel.com"
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-slate-500 transition"
                    />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                    A secure 6-digit OTP will be dispatched to your registered email address.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowOtpModal(false)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isOtpSubmitting || !otpEmail}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 disabled:opacity-50 flex items-center gap-1.5 transition hover:opacity-90 shadow-sm"
                  >
                    {isOtpSubmitting ? 'Sending Email...' : 'Send Verification OTP'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyPinOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    6-Digit OTP from Email:
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit code"
                    className="w-full px-3 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-center font-mono text-lg tracking-widest text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-slate-500 transition"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Check your email inbox at <span className="text-slate-900 dark:text-white font-medium">{otpEmail}</span>.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      New 4-Digit PIN:
                    </label>
                    <input
                      type="password"
                      required
                      maxLength={4}
                      value={newOtpPin}
                      onChange={(e) => setNewOtpPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-center font-mono text-base tracking-widest text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-slate-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Confirm PIN:
                    </label>
                    <input
                      type="password"
                      required
                      maxLength={4}
                      value={confirmOtpPin}
                      onChange={(e) => setConfirmOtpPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-center font-mono text-base tracking-widest text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-slate-500 transition"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep('request');
                      setOtpStatusMsg(null);
                    }}
                    className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                  >
                    ← Change Email / Resend
                  </button>
                  <button
                    type="submit"
                    disabled={isOtpSubmitting || otpCode.length !== 6 || newOtpPin.length !== 4}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                  >
                    {isOtpSubmitting ? 'Verifying...' : 'Set New PIN & Login'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
