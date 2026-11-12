import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';
import {
  normalizeHotelAccessCode,
  isValidHotelAccessCode,
  readHotelAccessHotelId,
  readHotelAccessToken,
  verifyHotelAccessCode,
  clearHotelAccessToken, NumericInput,
} from '@spicehub/ui';
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
  hasPin?: boolean;
  pinApprovedByAdmin?: boolean;
  pinStatus?: string;
}

const EMPTY_WAITER: WaiterStaffProfile = {
  staffId: '',
  name: '',
  role: 'Floor Steward',
  avatar: '',
  assignedSection: '',
  assignedTableStart: 0,
  assignedTableEnd: 0,
  assignedTableCount: 0,
  shift: '',
  permissions: [],
};

export const getHotelAdminAllocatedWaiters = (): WaiterStaffProfile[] => {
  return [];
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
  user?: {
    name?: string;
    role?: string;
    id?: string;
    avatar?: string;
    shift?: string;
    permissions?: string[];
    assignedSection?: string;
    assignedTableStart?: number;
    assignedTableEnd?: number;
  }
): WaiterStaffProfile {
  if (!user) return localProfile;
  const start = Number(user.assignedTableStart) || 0;
  const end = Number(user.assignedTableEnd) || 0;
  return {
    ...localProfile,
    staffId: user.id || localProfile.staffId,
    name: user.name || localProfile.name,
    avatar: user.avatar || localProfile.avatar,
    shift: user.shift || '',
    assignedSection: user.assignedSection || '',
    assignedTableStart: start,
    assignedTableEnd: end,
    assignedTableCount: start > 0 && end >= start ? end - start + 1 : 0,
    permissions: Array.isArray(user.permissions) ? user.permissions : [],
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
  hotelName = 'Staff Workstation',
  onLoginSuccess,
  onOpenPortalsSwitcher,
}) => {
  const [hotelCode, setHotelCode] = useState('');
  const [hotelAccessToken, setHotelAccessToken] = useState(() => readHotelAccessToken());
  const [hotelCodeStatus, setHotelCodeStatus] = useState<'idle' | 'verifying' | 'verified'>(() =>
    readHotelAccessToken() && readHotelAccessHotelId() ? 'verified' : 'idle'
  );
  const [hotelCodeError, setHotelCodeError] = useState('');
  const [verifiedHotelName, setVerifiedHotelName] = useState('');
  const [selectedHotelId, setSelectedHotelId] = useState(() =>
    readHotelAccessToken() ? readHotelAccessHotelId() : ''
  );
  const [rosterStatus, setRosterStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [rosterError, setRosterError] = useState('');
  const [rosterRefresh, setRosterRefresh] = useState(0);
  const [waitersList, setWaitersList] = useState<WaiterStaffProfile[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<WaiterStaffProfile>(EMPTY_WAITER);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [failedPinAttempts, setFailedPinAttempts] = useState(0);
  const [pinLockedUntil, setPinLockedUntil] = useState(0);

  useEffect(() => {
    if (selectedHotelId) localStorage.setItem('spicehub_hotel_id', selectedHotelId);
  }, [selectedHotelId]);

  const handleVerifyHotelCode = async () => {
    const normalized = normalizeHotelAccessCode(hotelCode);
    if (!isValidHotelAccessCode(normalized)) {
      setHotelCodeError('Enter the hotel code shared by your Hotel Admin (for example: MP2024).');
      return;
    }
    setHotelCodeStatus('verifying');
    setHotelCodeError('');
    setRosterError('');
    try {
      const verified = await verifyHotelAccessCode(API_BASE_URL, normalized);
      setSelectedHotelId(verified.hotel.id);
      setHotelAccessToken(verified.accessToken);
      setHotelCodeStatus('verified');
      setVerifiedHotelName(verified.hotel.name || '');
      setHotelCode('');
    } catch (error) {
      clearHotelAccessToken();
      setHotelAccessToken('');
      setSelectedHotelId('');
      setHotelCodeStatus('idle');
      setHotelCodeError(
        error instanceof Error ? error.message : 'Could not verify the hotel code.'
      );
    }
  };

  const handleChangeHotelCode = () => {
    clearHotelAccessToken();
    setHotelAccessToken('');
    setSelectedHotelId('');
    setHotelCodeStatus('idle');
    setVerifiedHotelName('');
    setHotelCode('');
    setHotelCodeError('');
    setWaitersList([]);
    setSelectedStaff(EMPTY_WAITER);
    setEnteredPin('');
    setPinError(null);
    setFailedPinAttempts(0);
    setPinLockedUntil(0);
    setRosterError('');
    setRosterStatus('idle');
    localStorage.removeItem('spicehub_hotel_id');
  };

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

  // Load only this property's public, PIN-safe roster; never merge placeholder staff into production.
  useEffect(() => {
    if (!selectedHotelId || !hotelAccessToken) {
      setWaitersList([]);
      setSelectedStaff(EMPTY_WAITER);
      setRosterStatus('idle');
      setRosterError('');
      return;
    }

    const controller = new AbortController();
    const fetchLiveStaff = async () => {
      setRosterStatus('loading');
      setRosterError('');
      try {
        const res = await fetch(
          `${API_BASE_URL}/auth/hotels/${encodeURIComponent(selectedHotelId)}/staff-roster?portal=waiter`,
          { signal: controller.signal, headers: { 'x-hotel-access-token': hotelAccessToken } }
        );
        const body = await res.json().catch(() => null);
        if (!res.ok || !body?.success || !Array.isArray(body.data)) {
          if (body?.errorCode === 'HOTEL_CODE_REQUIRED') {
            clearHotelAccessToken();
            setHotelAccessToken('');
            setSelectedHotelId('');
            setHotelCodeStatus('idle');
            setHotelCodeError('Your hotel code session expired. Enter the code again.');
            return;
          }
          throw new Error(body?.message || 'Could not load the staff roster.');
        }
        if (!controller.signal.aborted) {
          const liveWaiters: WaiterStaffProfile[] = body.data
            .filter((u: any) => ['WAITER', 'CAPTAIN', 'STEWARD'].includes(String(u.role).toUpperCase()))
            .map((u: any) => {
              return {
                staffId: u.id || u._id,
                name: u.name,
                email: u.email || '',
                role: (String(u.role).toUpperCase() === 'CAPTAIN' ? 'Captain' : 'Senior Waiter') as WaiterStaffProfile['role'],
                avatar: u.avatar || '',
                assignedSection: '',
                assignedTableStart: 0,
                assignedTableEnd: 0,
                assignedTableCount: 0,
                shift: u.shift || 'General Shift',
                permissions: [],
                hasPin: Boolean(u.hasPin),
                pinApprovedByAdmin: u.pinApprovedByAdmin !== false,
                pinStatus: String(u.pinStatus || 'NONE'),
              };
            });
          setWaitersList(liveWaiters);
          setSelectedStaff((current) =>
            liveWaiters.find((staff) => staff.staffId === current.staffId) || liveWaiters[0] || EMPTY_WAITER
          );
          setRosterStatus('ready');
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('Could not load live waiter roster:', error);
        setWaitersList([]);
        setSelectedStaff(EMPTY_WAITER);
        setRosterStatus('error');
        setRosterError('Could not load this hotel’s waiter roster. Retry or choose another property.');
      }
    };
    void fetchLiveStaff();
    return () => controller.abort();
  }, [hotelAccessToken, selectedHotelId, rosterRefresh]);

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
          text: 'PIN successfully reset and activated! Signing you in...',
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
      const hotelId =
        selectedHotelId ||
        localStorage.getItem('spicehub_hotel_id') ||
        localStorage.getItem('hotelId') ||
        '';
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
          hotelAccessToken,
        }),
      });
      const body = await response.json().catch(() => null);

      if (!response.ok || !body?.success) {
        if (body?.errorCode === 'HOTEL_CODE_REQUIRED') {
          clearHotelAccessToken();
          setHotelAccessToken('');
          setSelectedHotelId('');
          setHotelCodeStatus('idle');
          setHotelCodeError('Your hotel code session expired. Enter the code again.');
          setEnteredPin('');
          return;
        }
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
      const token = String(body.data?.token || '');
      if (!token) throw new Error('The server did not return a staff session. Please try again.');
      const profileResponse = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-hotel-id': hotelId,
        },
      });
      const profileBody = await profileResponse.json().catch(() => null);
      const authenticatedUser = profileBody?.data?.user;
      if (
        !profileResponse.ok ||
        !profileBody?.success ||
        String(authenticatedUser?.id || '') !== staff.staffId ||
        String(authenticatedUser?.role || '').toUpperCase() !== 'WAITER'
      ) {
        throw new Error(profileBody?.message || 'Could not verify this waiter account. Please sign in again.');
      }
      onLoginSuccess(
        resolveStaffProfile(staff, authenticatedUser),
        { ...body.data, user: body.data.user },
      );
    } catch (error) {
      setPinError(error instanceof Error ? error.message : 'Cannot reach the SpiceHub server. Check your connection and retry.');
      setEnteredPin('');
    } finally {
      setIsVerifying(false);
    }
  };

  const initials = String(selectedStaff.name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div
      className="w-full flex flex-col"
      style={{ minHeight: '100dvh', background: '#FFFFFF', color: '#0F172A' }}
    >
      {/* Masthead */}
      <header style={{ borderBottom: '1px solid #E2E8F0' }}>
        <div
          className="mx-auto flex w-full items-center justify-between gap-3 px-5 py-3.5"
          style={{ maxWidth: 440 }}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              style={{
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: '#0F172A',
              }}
            >
              SpiceHub
            </span>
            <span style={{ height: 12, width: 1, background: '#CBD5E1', flexShrink: 0 }} />
            <span
              className="truncate"
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#64748B',
              }}
            >
              {verifiedHotelName || hotelName}
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenPortalsSwitcher}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#94A3B8',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Portals →
          </button>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-8">
        <div className="w-full" style={{ maxWidth: 380 }}>
          <p
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: '#2563EB',
              margin: 0,
            }}
          >
            Floor Service
          </p>
          <h2
            style={{
              fontFamily: 'inherit',
              fontSize: 26,
              fontWeight: 600,
              lineHeight: 1.15,
              letterSpacing: '-0.01em',
              color: '#0F172A',
              margin: '8px 0 0',
            }}
          >
            Waiter Terminal
          </h2>

          <div style={{ marginTop: 18 }}>
            {hotelCodeStatus === 'verified' ? (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p
                    className="truncate"
                    style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0F172A' }}
                  >
                    {verifiedHotelName || hotelName}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748B' }}>
                    Hotel code verified
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleChangeHotelCode}
                  style={{
                    flexShrink: 0,
                    border: 0,
                    background: 'none',
                    padding: 0,
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#2563EB',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                  }}
                >
                  Change
                </button>
              </div>
            ) : (
              <div>
                <label
                  htmlFor="waiter-hotel-code"
                  style={{
                    display: 'block',
                    marginBottom: 7,
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: '#64748B',
                  }}
                >
                  Hotel Code
                </label>
                <input
                  id="waiter-hotel-code"
                  type="text"
                  inputMode="text"
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={10}
                  data-testid="waiter-hotel-code-input"
                  value={hotelCode}
                  onChange={(event) => {
                    setHotelCode(event.target.value.toUpperCase());
                    setHotelCodeError('');
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void handleVerifyHotelCode();
                    }
                  }}
                  placeholder="Write hotel code"
                  aria-invalid={Boolean(hotelCodeError)}
                  style={{
                    width: '100%',
                    minHeight: 46,
                    padding: '0 12px',
                    border: `1px solid ${hotelCodeError ? '#DC2626' : '#E2E8F0'}`,
                    borderRadius: 4,
                    background: '#FFFFFF',
                    color: '#0F172A',
                    fontSize: 15,
                    fontWeight: 600,
                    letterSpacing: '0.12em',
                  }}
                />
                {hotelCodeError && (
                  <div role="alert" style={{ marginTop: 8, color: '#B91C1C', fontSize: 12 }}>
                    {hotelCodeError}
                  </div>
                )}
                <button
                  type="button"
                  data-testid="waiter-verify-hotel-code"
                  onClick={() => void handleVerifyHotelCode()}
                  disabled={
                    hotelCodeStatus === 'verifying' ||
                    !isValidHotelAccessCode(hotelCode)
                  }
                  style={{
                    marginTop: 10,
                    width: '100%',
                    minHeight: 46,
                    border: 0,
                    borderRadius: 4,
                    background:
                      hotelCodeStatus === 'verifying' ||
                      !isValidHotelAccessCode(hotelCode)
                        ? '#E2E8F0'
                        : '#0F172A',
                    color:
                      hotelCodeStatus === 'verifying' ||
                      !isValidHotelAccessCode(hotelCode)
                        ? '#64748B'
                        : '#FFFFFF',
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    cursor:
                      hotelCodeStatus === 'verifying' ||
                      !isValidHotelAccessCode(hotelCode)
                        ? 'not-allowed'
                        : 'pointer',
                  }}
                >
                  {hotelCodeStatus === 'verifying' ? 'Verifying code…' : 'Verify hotel code'}
                </button>
              </div>
            )}
          </div>

          {selectedStaff.staffId ? (
            <>
          {/* Roster selector — underline tabs */}
          {waitersList.length > 1 && (
            <div
              className="flex flex-wrap items-center gap-x-3.5"
              data-testid="waiter-roster-tabs"
              style={{ borderBottom: '1px solid #E2E8F0', marginTop: 18 }}
            >
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
                    style={{
                      background: 'transparent',
                      border: 'none',
                      borderBottom: isSelected ? '2px solid #0F172A' : '2px solid transparent',
                      padding: '7px 0 8px',
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: isSelected ? '#0F172A' : '#64748B',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      minHeight: 32,
                    }}
                  >
                    {staff.name}
                  </button>
                );
              })}
            </div>
          )}

          {/* Identity */}
          <div className="flex items-center" style={{ gap: 12, marginTop: 20 }}>
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
                fontFamily: 'inherit',
                fontSize: 16,
                fontWeight: 600,
                color: '#0F172A',
              }}
            >
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: 'inherit',
                  fontSize: 19,
                  fontWeight: 600,
                  lineHeight: 1.2,
                  color: '#0F172A',
                }}
              >
                {selectedStaff.name}
              </div>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: '#2563EB',
                  marginTop: 3,
                }}
              >
                {selectedStaff.role}
              </div>
            </div>
          </div>

          <div style={{ fontSize: 11, color: '#475569', marginTop: 10, lineHeight: 1.5 }}>
            {selectedStaff.assignedTableStart > 0 && selectedStaff.assignedTableEnd >= selectedStaff.assignedTableStart
              ? `${selectedStaff.assignedSection ? `${selectedStaff.assignedSection} · ` : ''}Tables T-${String(selectedStaff.assignedTableStart).padStart(2, '0')}–T-${String(selectedStaff.assignedTableEnd).padStart(2, '0')}`
              : 'Your table assignment is loaded after sign-in.'}
            {selectedStaff.shift ? ` · ${selectedStaff.shift}` : ''}
          </div>

          <div style={{ height: 1, background: '#E2E8F0', marginTop: 16 }} />

          {/* PIN */}
          <div className="flex items-baseline justify-between" style={{ marginTop: 18 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: '#334155',
              }}
            >
              Staff PIN
            </span>
            <span style={{ fontSize: 10, color: '#94A3B8' }}>4 digits</span>
          </div>

          <div className="flex items-center" style={{ gap: 14, marginTop: 8 }}>
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = enteredPin.length > idx;
              const isCurrent = enteredPin.length === idx;
              return (
                <div
                  key={idx}
                  className="flex flex-1 items-center justify-center"
                  style={{
                    height: 44,
                    borderBottom: `2px solid ${
                      isFilled ? '#0F172A' : isCurrent ? '#2563EB' : '#E2E8F0'
                    }`,
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
          </div>

          {pinError && (
            <div
              role="alert"
              style={{
                marginTop: 14,
                borderLeft: '2px solid #B91C1C',
                background: '#FEF2F2',
                color: '#B91C1C',
                fontSize: 11.5,
                fontWeight: 600,
                lineHeight: 1.45,
                padding: '8px 12px',
              }}
            >
              {pinError}
            </div>
          )}

          {selectedStaff.hasPin === false && (
            <div
              role="status"
              style={{
                marginTop: 12,
                background: '#F1F5F9',
                color: '#1D4ED8',
                fontSize: 12,
                lineHeight: 1.45,
                padding: '10px 12px',
              }}
            >
              PIN is not set for this profile yet. Contact the hotel administrator to activate sign-in.
            </div>
          )}

          {selectedStaff.pinApprovedByAdmin === false && (
            <div
              role="status"
              style={{
                marginTop: 12,
                background: '#F1F5F9',
                color: '#1D4ED8',
                fontSize: 12,
                lineHeight: 1.45,
                padding: '10px 12px',
              }}
            >
              This staff PIN is awaiting hotel administrator approval.
            </div>
          )}

          {/* Numpad — hairline ledger grid */}
          <div
            className="grid grid-cols-3"
            style={{
              marginTop: 20,
              borderTop: '1px solid #E2E8F0',
              borderLeft: '1px solid #E2E8F0',
            }}
          >
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                data-testid={`btn-digit-${digit}`}
                onClick={() => handlePinDigit(digit)}
                style={{
                  height: 58,
                  background: 'transparent',
                  border: 'none',
                  borderRight: '1px solid #E2E8F0',
                  borderBottom: '1px solid #E2E8F0',
                  fontFamily: 'inherit',
                  fontSize: 21,
                  fontWeight: 500,
                  color: '#0F172A',
                  cursor: 'pointer',
                }}
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              data-testid="btn-digit-clear"
              onClick={() => setEnteredPin('')}
              style={{
                height: 58,
                background: 'transparent',
                border: 'none',
                borderRight: '1px solid #E2E8F0',
                borderBottom: '1px solid #E2E8F0',
                fontSize: 9.5,
                fontWeight: 800,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#64748B',
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
            <button
              type="button"
              data-testid="btn-digit-0"
              onClick={() => handlePinDigit('0')}
              style={{
                height: 58,
                background: 'transparent',
                border: 'none',
                borderRight: '1px solid #E2E8F0',
                borderBottom: '1px solid #E2E8F0',
                fontFamily: 'inherit',
                fontSize: 21,
                fontWeight: 500,
                color: '#0F172A',
                cursor: 'pointer',
              }}
            >
              0
            </button>
            <button
              type="button"
              data-testid="btn-digit-delete"
              onClick={handleBackspace}
              style={{
                height: 58,
                background: 'transparent',
                border: 'none',
                borderRight: '1px solid #E2E8F0',
                borderBottom: '1px solid #E2E8F0',
                fontSize: 16,
                color: '#64748B',
                cursor: 'pointer',
              }}
            >
              ⌫
            </button>
          </div>

          <button
            type="button"
            data-testid="btn-login-pin"
            onClick={() => verifyPin(enteredPin, selectedStaff)}
            disabled={enteredPin.length !== 4 || isVerifying || selectedStaff.hasPin === false || selectedStaff.pinApprovedByAdmin === false}
            style={{
              width: '100%',
              height: 48,
              marginTop: 18,
              background: enteredPin.length === 4 && !isVerifying && selectedStaff.hasPin !== false && selectedStaff.pinApprovedByAdmin !== false ? '#0F172A' : '#CBD5E1',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 3,
              fontSize: 11.5,
              fontWeight: 800,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              cursor: enteredPin.length === 4 && !isVerifying && selectedStaff.hasPin !== false && selectedStaff.pinApprovedByAdmin !== false ? 'pointer' : 'not-allowed',
            }}
          >
            {isVerifying ? 'Checking…' : 'Sign in'}
          </button>

          <div
            className="flex items-center justify-between"
            style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #E2E8F0' }}
          >
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
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                fontSize: 10.5,
                fontWeight: 700,
                color: '#475569',
                textDecoration: 'underline',
                textUnderlineOffset: 2,
                cursor: 'pointer',
              }}
            >
              Forgot PIN?
            </button>

            <button
              type="button"
              onClick={() => setIsAdminModalOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#94A3B8',
                cursor: 'pointer',
              }}
            >
              <SlidersHorizontal style={{ width: 12, height: 12 }} />
              <span>Set tables</span>
            </button>
          </div>
            </>
          ) : (
            <div
              role={rosterStatus === 'error' ? 'alert' : 'status'}
              aria-live="polite"
              style={{
                marginTop: 22,
                padding: '18px 14px',
                borderTop: '1px solid #E2E8F0',
                borderBottom: '1px solid #E2E8F0',
                color: '#475569',
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              {hotelCodeStatus !== 'verified' || !selectedHotelId
                ? 'Enter the hotel code from your Hotel Admin to load this property’s waiters.'
                : rosterStatus === 'loading'
                  ? 'Loading live staff…'
                  : rosterStatus === 'error'
                    ? (
                      <>
                        {rosterError}{' '}
                        <button
                          type="button"
                          onClick={() => setRosterRefresh((current) => current + 1)}
                          style={{ border: 0, background: 'none', color: '#2563EB', fontWeight: 700, textDecoration: 'underline' }}
                        >
                          Retry roster
                        </button>
                      </>
                    )
                    : rosterStatus === 'ready'
                      ? (
                        <div style={{ textAlign: 'center', padding: '16px 0' }}>
                          <div style={{ fontSize: 24, marginBottom: 6 }}>👥</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>
                            No staff members added yet
                          </div>
                          <div style={{ fontSize: 12, color: '#64748B' }}>
                            Please add waiters and staff members from your Hotel Admin ERP Console.
                          </div>
                        </div>
                      )
                      : 'Enter the hotel code to continue.'}
            </div>
          )}
        </div>
      </main>

      <footer style={{ borderTop: '1px solid #E2E8F0', padding: '12px 20px' }}>
        <div
          className="mx-auto flex w-full items-center justify-between"
          style={{
            maxWidth: 440,
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#94A3B8',
          }}
        >
          <span>Authorised staff only</span>
          <span>SpiceHub · Hospitality OS</span>
        </div>
      </footer>

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
                        <NumericInput
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
                        <NumericInput
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
              {selectedStaff.avatar ? (
                <img
                  src={selectedStaff.avatar}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-full border border-slate-200 object-cover"
                />
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-600">
                  {(selectedStaff.name || '?').charAt(0).toUpperCase()}
                </span>
              )}
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
                      placeholder="Write email"
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
                    placeholder="Write 6-digit code"
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
                      placeholder="Write new 4-digit PIN"
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
                      placeholder="Confirm 4-digit PIN"
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
