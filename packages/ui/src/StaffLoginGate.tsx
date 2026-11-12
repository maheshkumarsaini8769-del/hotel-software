import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  clearHotelAccessToken,
  isValidHotelAccessCode,
  normalizeHotelAccessCode,
  readHotelAccessHotelId,
  readHotelAccessToken,
  verifyHotelAccessCode,
} from './staffHotelAccess';
import { installGlobalNumericInputGuard } from './components/NumericInput';

export interface StaffSessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  hotelId?: string;
}

export interface StaffLoginGateProps {
  /** Fully-qualified API prefix, e.g. http://localhost:5000/api/v1 */
  apiBaseUrl: string;
  appName: string;
  appSubtitle?: string;
  accent?: 'amber' | 'emerald' | 'blue';
  demoEmail?: string;
  demoPassword?: string;
  /**
   * Hotel terminals require a tenant-bound account. The platform control plane
   * uses the same gate with this disabled because superadmins are global.
   */
  requireHotel?: boolean;
  /** Portal identifier for modular subscription access control (e.g. 'cashier', 'reception', 'kds', 'admin') */
  portalId?: string;
  /** Protected endpoint used to validate a persisted JWT. */
  validatePath?: string;
  /**
   * Visual theme for the terminal lock screen.
   * `heritage` renders the cream/deep-green hospitality skin.
   */
  variant?: 'default' | 'heritage';
  children: ReactNode;
}

interface StaffPinProfile {
  id: string;
  name: string;
  role: string;
  shift: string;
  avatar: string;
}

const TOKEN_KEYS = ['spicehub_token', 'token'] as const;
const HOTEL_KEYS = ['spicehub_hotel_id', 'hotelId'] as const;
const HOTEL_SLUG_KEY = 'spicehub_hotel_slug';
const USER_KEY = 'spicehub_auth_user';
const ADMIN_LOGIN_BRANDING_CACHE_KEY = 'spicehub_admin_login_branding';
const ADMIN_LOGIN_BRANDING_EVENT = 'spicehub:admin-login-branding-updated';
const DEFAULT_ADMIN_LOGIN_IMAGE = '/images/hotel-login-default.jpg';
const DEFAULT_PLATFORM_LOGIN_IMAGE = '/images/platform-login-default.jpg';
const DEFAULT_STAFF_LOGIN_IMAGE = '/images/hotel-login-default.jpg';
const FALLBACK_ADMIN_LOGIN_IMAGE =
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1400&auto=format&fit=crop&q=85';
const DEFAULT_ADMIN_HERO_TITLE = 'Unified Hotel Operations & Revenue Management';
const DEFAULT_ADMIN_HERO_SUBTITLE =
  'Mission-critical administration hub for multi-floor PMS reservation matrix, dining operations, folio reconciliation, and automated night audit.';
const DEFAULT_ADMIN_FORM_TITLE = 'Hotel Admin Sign In';
const DEFAULT_ADMIN_FORM_SUBTITLE =
  'Sign in with your hotel administrator credentials to manage property operations.';

interface AdminLoginBrandingConfig {
  hotelId?: string;
  hotelName?: string;
  hotelSlug?: string;
  coverImageUrl?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroImageUrl?: string;
  formTitle?: string;
  formSubtitle?: string;
}

function readCachedAdminLoginBranding(): AdminLoginBrandingConfig {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(ADMIN_LOGIN_BRANDING_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as AdminLoginBrandingConfig) : {};
  } catch {
    return {};
  }
}

const PORTAL_STAFF_ROLES: Record<string, readonly string[]> = {
  admin: ['HOTEL_ADMIN', 'MANAGER'],
  cashier: ['CASHIER'],
  reception: ['RECEPTIONIST', 'HOUSEKEEPING', 'MAINTENANCE'],
  kds: ['CHEF'],
  waiter: ['WAITER'],
};

function isStaffRoleAllowed(portalId: string | undefined, role: string): boolean {
  if (!portalId || role === 'SUPERADMIN') return true;
  const allowedRoles = PORTAL_STAFF_ROLES[portalId];
  return !allowedRoles || allowedRoles.includes(role.toUpperCase());
}

const ACCENTS = {
  amber: {
    button: 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90',
    ring: 'focus:border-slate-400 focus:ring-slate-200',
    badge: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300',
  },
  emerald: {
    button: 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90',
    ring: 'focus:border-slate-400 focus:ring-slate-200',
    badge: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300',
  },
  blue: {
    button: 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90',
    ring: 'focus:border-slate-400 focus:ring-slate-200',
    badge: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300',
  },
} as const;

function readFirst(keys: readonly string[]): string {
  if (typeof window === 'undefined') return '';
  try {
    const params = new URLSearchParams(window.location.search);
    const isHotelKey = keys.some((k) => k.toLowerCase().includes('hotel'));
    if (isHotelKey) {
      const urlHotelId = params.get('hotelId');
      if (urlHotelId) {
        for (const k of keys) window.localStorage.setItem(k, urlHotelId);
        return urlHotelId;
      }
    } else {
      const urlToken = params.get('token');
      if (urlToken) {
        for (const k of keys) window.localStorage.setItem(k, urlToken);
        const urlHotelId = params.get('hotelId');
        if (urlHotelId) {
          window.localStorage.setItem('spicehub_hotel_id', urlHotelId);
          window.localStorage.setItem('hotelId', urlHotelId);
        }
        return urlToken;
      }
    }
  } catch {}
  for (const key of keys) {
    const value = window.localStorage.getItem(key);
    if (value) return value;
  }
  return '';
}

function readHotelSlug(): string {
  if (typeof window === 'undefined') return '';
  try {
    const params = new URLSearchParams(window.location.search);
    const urlHotelSlug = params.get('hotelSlug')?.trim();
    if (urlHotelSlug) {
      window.localStorage.setItem(HOTEL_SLUG_KEY, urlHotelSlug);
      return urlHotelSlug;
    }
    return window.localStorage.getItem(HOTEL_SLUG_KEY) || '';
  } catch {
    return '';
  }
}

function clearSessionStorage(): void {
  if (typeof window === 'undefined') return;
  for (const key of [...TOKEN_KEYS, ...HOTEL_KEYS, USER_KEY, 'spicehub_impersonation']) {
    window.localStorage.removeItem(key);
  }
}

function persistSession(token: string, user: StaffSessionUser): void {
  if (typeof window === 'undefined') return;
  for (const key of TOKEN_KEYS) window.localStorage.setItem(key, token);
  if (user.hotelId) {
    for (const key of HOTEL_KEYS) window.localStorage.setItem(key, user.hotelId);
  } else {
    for (const key of HOTEL_KEYS) window.localStorage.removeItem(key);
  }
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function readStoredUser(): StaffSessionUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(USER_KEY) || 'null');
    if (parsed && typeof parsed.email === 'string' && typeof parsed.role === 'string') {
      return parsed as StaffSessionUser;
    }
  } catch {
    // Ignore malformed legacy session and let /auth/me rebuild it.
  }
  return null;
}

function decodeJwtPayload(jwtStr: string): any {
  try {
    const parts = jwtStr.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function isLoopbackHost(): boolean {
  if (typeof window === 'undefined') return false;
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
}

/**
 * Server-backed staff authentication gate shared by the admin, cashier and
 * reception terminals. It validates the persisted JWT against the backend
 * before rendering protected screens, so a fresh browser can no longer fall
 * through to unauthenticated API calls (401s) or a misleading empty shell.
 */
export const StaffLoginGate: React.FC<StaffLoginGateProps> = ({
  apiBaseUrl,
  appName,
  appSubtitle,
  accent = 'amber',
  demoEmail,
  demoPassword,
  requireHotel = true,
  portalId,
  validatePath = '/auth/me',
  variant = 'default',
  children,
}) => {
  const base = useMemo(() => {
    if (typeof window !== 'undefined') {
      try {
        const p = new URLSearchParams(window.location.search);
        const qBase = p.get('apiBase') || p.get('backendUrl');
        if (qBase && qBase.trim()) {
          const trimmed = qBase.trim().replace(/\/+$/, '');
          return trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`;
        }
      } catch {}
    }
    return apiBaseUrl.replace(/\/+$/, '');
  }, [apiBaseUrl]);
  const palette = ACCENTS[accent];
  const initialToken = useMemo(() => readFirst(TOKEN_KEYS), []);
  const initialUser = useMemo(() => {
    const stored = readStoredUser();
    if (stored) return stored;
    if (initialToken) {
      const payload = decodeJwtPayload(initialToken);
      if (payload && payload.userId && payload.hotelId && (!payload.exp || payload.exp * 1000 > Date.now())) {
        return {
          id: String(payload.userId),
          name: payload.name || 'Staff Member',
          email: payload.email || '',
          role: payload.role || (portalId ? portalId.toUpperCase() : 'STAFF'),
          hotelId: String(payload.hotelId),
        } as StaffSessionUser;
      }
    }
    return null;
  }, [initialToken, portalId]);

  const [token, setToken] = useState(initialToken);
  const [user, setUser] = useState<StaffSessionUser | null>(initialUser);
  const [verified, setVerified] = useState(false);
  const [booting, setBooting] = useState(Boolean(initialToken));
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hotelSlug, setHotelSlug] = useState(readHotelSlug);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [online, setOnline] = useState(true);
  const [notSubscribed, setNotSubscribed] = useState(false);
  const [subscribedHotelName, setSubscribedHotelName] = useState('');
  const [availablePortals, setAvailablePortals] = useState<string[]>([]);
  const [staffPinProfiles, setStaffPinProfiles] = useState<StaffPinProfile[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [staffRosterLoading, setStaffRosterLoading] = useState(false);
  const [staffRosterError, setStaffRosterError] = useState('');
  const [staffHotelId, setStaffHotelId] = useState(() => readHotelAccessHotelId());
  const [hotelAccessToken, setHotelAccessToken] = useState(() =>
    readHotelAccessHotelId() ? readHotelAccessToken() : ''
  );
  const [hotelCodeStatus, setHotelCodeStatus] = useState<'idle' | 'verifying' | 'verified'>(
    () => (readHotelAccessHotelId() ? 'verified' : 'idle')
  );
  const [hotelCodeError, setHotelCodeError] = useState('');
  const [adminLoginBranding, setAdminLoginBranding] = useState<AdminLoginBrandingConfig>(readCachedAdminLoginBranding);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    installGlobalNumericInputGuard();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (portalId !== 'admin') return;

    const applyBranding = (next: AdminLoginBrandingConfig) => {
      if (!mountedRef.current) return;
      setAdminLoginBranding((prev) => ({
        ...prev,
        ...next,
      }));
      try {
        window.localStorage.setItem(ADMIN_LOGIN_BRANDING_CACHE_KEY, JSON.stringify(next));
      } catch {}
    };

    const controller = new AbortController();
    const trimmedSlug = hotelSlug.trim().toLowerCase();
    const storedHotelId = typeof window !== 'undefined'
      ? (window.localStorage.getItem('spicehub_hotel_id') || window.localStorage.getItem('hotelId') || '').trim()
      : '';

    const loadBranding = async () => {
      try {
        const query = new URLSearchParams();
        if (trimmedSlug) {
          query.set('hotelSlug', trimmedSlug);
        } else if (storedHotelId) {
          query.set('hotelId', storedHotelId);
        }
        const qs = query.toString();
        const response = await fetch(`${base}/auth/portal-login-branding${qs ? `?${qs}` : ''}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        const json = await response.json().catch(() => null);
        if (!mountedRef.current || !response.ok || !json?.success || !json?.matched || !json?.data) return;
        applyBranding(json.data);
      } catch {
        // Silently keep cached or default hero branding when offline
      }
    };

    const timer = window.setTimeout(() => {
      void loadBranding();
    }, trimmedSlug ? 250 : 0);

    const onBrandingUpdated = (event: Event) => {
      const detail = (event as CustomEvent<AdminLoginBrandingConfig>)?.detail;
      if (detail && typeof detail === 'object') {
        applyBranding(detail);
      } else {
        void loadBranding();
      }
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === ADMIN_LOGIN_BRANDING_CACHE_KEY) {
        setAdminLoginBranding(readCachedAdminLoginBranding());
      }
    };

    window.addEventListener(ADMIN_LOGIN_BRANDING_EVENT, onBrandingUpdated);
    window.addEventListener('storage', onStorage);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
      window.removeEventListener(ADMIN_LOGIN_BRANDING_EVENT, onBrandingUpdated);
      window.removeEventListener('storage', onStorage);
    };
  }, [portalId, base, hotelSlug]);

  useEffect(() => {
    if (!requireHotel || !portalId || portalId === 'admin') {
      setStaffPinProfiles([]);
      setSelectedStaffId('');
      setStaffHotelId('');
      setStaffRosterError('');
      return;
    }

    if (!hotelAccessToken || !staffHotelId) {
      setStaffPinProfiles([]);
      setSelectedStaffId('');
      setStaffRosterLoading(false);
      setStaffRosterError('');
      return;
    }

    const controller = new AbortController();
    const loadRoleRoster = async () => {
      setStaffRosterLoading(true);
      setStaffRosterError('');
      setStaffPinProfiles([]);
      setSelectedStaffId('');
      try {
        const rosterResponse = await fetch(
          `${base}/auth/hotels/${encodeURIComponent(staffHotelId)}/staff-roster?portal=${encodeURIComponent(portalId)}`,
          {
            signal: controller.signal,
            headers: { 'x-hotel-access-token': hotelAccessToken },
          }
        );
        const rosterBody = await rosterResponse.json().catch(() => null);
        if (!rosterResponse.ok || !rosterBody?.success || !Array.isArray(rosterBody.data)) {
          if (rosterBody?.errorCode === 'HOTEL_CODE_REQUIRED') {
            clearHotelAccessToken();
            if (mountedRef.current) {
              setHotelAccessToken('');
              setHotelCodeStatus('idle');
              setHotelCodeError('Your hotel code session expired. Enter the code again.');
            }
            return;
          }
          throw new Error(rosterBody?.message || 'Could not load the staff profiles for this portal.');
        }

        const profiles = rosterBody.data
          .filter((item: any) => item?.id && item?.name)
          .map((item: any) => ({
            id: String(item.id),
            name: String(item.name),
            role: String(item.role || ''),
            shift: String(item.shift || ''),
            avatar: String(item.avatar || ''),
          }));
        setStaffPinProfiles(profiles);
        if (profiles.length === 0) {
          setStaffRosterError(`No staff profiles have been created for the ${appName} portal.`);
          return;
        }
        setSelectedStaffId(profiles[0].id);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setStaffRosterError(
            loadError instanceof Error ? loadError.message : 'Could not load staff profiles.'
          );
        }
      } finally {
        if (!controller.signal.aborted) setStaffRosterLoading(false);
      }
    };

    void loadRoleRoster();
    return () => controller.abort();
  }, [appName, base, hotelAccessToken, portalId, requireHotel, staffHotelId]);

  const handleVerifyHotelCode = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const normalized = normalizeHotelAccessCode(hotelSlug);
    if (!isValidHotelAccessCode(normalized)) {
      setHotelCodeError('Enter the hotel code shared by your Hotel Admin (for example: MP2024).');
      return;
    }
    setHotelCodeStatus('verifying');
    setHotelCodeError('');
    setStaffRosterError('');
    try {
      const verified = await verifyHotelAccessCode(base, normalized);
      if (!mountedRef.current) return;
      setStaffHotelId(verified.hotel.id);
      setHotelAccessToken(verified.accessToken);
      setHotelCodeStatus('verified');
      setSubscribedHotelName(verified.hotel.name);
      if (
        portalId &&
        Array.isArray(verified.hotel.enabledPortals) &&
        verified.hotel.enabledPortals.length > 0 &&
        !verified.hotel.enabledPortals.includes(portalId)
      ) {
        setStaffRosterError(
          `The ${appName} portal is not enabled for ${verified.hotel.name || 'this hotel'}.`
        );
      }
    } catch (verifyError) {
      if (!mountedRef.current) return;
      clearHotelAccessToken();
      setHotelAccessToken('');
      setStaffHotelId('');
      setHotelCodeStatus('idle');
      setHotelCodeError(
        verifyError instanceof Error ? verifyError.message : 'Could not verify the hotel code.'
      );
    }
  };

  const handleChangeHotelCode = () => {
    clearHotelAccessToken();
    setHotelAccessToken('');
    setStaffHotelId('');
    setHotelCodeStatus('idle');
    setHotelCodeError('');
    setHotelSlug('');
    setStaffPinProfiles([]);
    setSelectedStaffId('');
    setStaffRosterError('');
    setEnteredPin('');
    setError('');
  };

  const expireSession = useCallback((message = '') => {
    clearSessionStorage();
    if (!mountedRef.current) return;
    setToken('');
    setUser(null);
    setVerified(false);
    setBooting(false);
    setError(message);
  }, []);

  const validateToken = useCallback(
    async (candidate: string, options: { silent?: boolean } = {}): Promise<boolean> => {
      try {
        const hotelId = readFirst(HOTEL_KEYS);
        const response = await fetch(`${base}${validatePath}`, {
          headers: {
            Authorization: `Bearer ${candidate}`,
            ...(hotelId ? { 'x-hotel-id': hotelId } : {}),
          },
        });
        if (response.status === 401 || response.status === 403) {
          const errJson = await response.json().catch(() => null);
          const isSuspended =
            errJson?.errorCode === 'TENANT_SUSPENDED' ||
            String(errJson?.message || '').toLowerCase().includes('suspend');
          const blockMsg = isSuspended
            ? (errJson?.message || 'This hotel property has been suspended by the platform administrator. Access blocked.')
            : 'Your staff session expired. Please sign in again.';
          expireSession(blockMsg);
          return false;
        }
        if (!response.ok) {
          if (mountedRef.current) setVerified(false);
          if (!options.silent) {
            const json = await response.json().catch(() => null);
            setError(json?.message || 'Could not verify your staff session. Please retry.');
          }
          return false;
        }
        const json = await response.json().catch(() => null);
        const nextUser: StaffSessionUser | null = json?.data?.user
          ? {
              id: String(json.data.user._id || json.data.user.id || ''),
              name: json.data.user.name || 'Staff Member',
              email: json.data.user.email || '',
              role: json.data.user.role || '',
              hotelId: String(json.data.user.hotelId || readFirst(HOTEL_KEYS) || ''),
            }
          : !requireHotel
            ? readStoredUser() || {
                id: 'platform-admin',
                name: 'Platform Admin',
                email: '',
                role: 'SUPERADMIN',
              }
            : null;
        if (requireHotel && (!nextUser || !isStaffRoleAllowed(portalId, nextUser.role))) {
          expireSession('This staff account is not authorized for this portal.');
          return false;
        }
        if (nextUser && mountedRef.current) {
          setUser(nextUser);
          window.localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
          if (nextUser.hotelId) {
            for (const key of HOTEL_KEYS) window.localStorage.setItem(key, nextUser.hotelId);
          }
        }

        const tenant = json?.data?.tenant;
        if (tenant && mountedRef.current) {
          setSubscribedHotelName(tenant.name || 'Your Hotel');
          if (Array.isArray(tenant.enabledPortals)) {
            setAvailablePortals(tenant.enabledPortals);
            window.localStorage.setItem('spicehub_enabled_portals', JSON.stringify(tenant.enabledPortals));
            if (portalId && !tenant.enabledPortals.includes(portalId) && nextUser?.role !== 'SUPERADMIN') {
              setNotSubscribed(true);
            } else {
              setNotSubscribed(false);
            }
          }
        }
        return true;
      } catch {
        if (mountedRef.current) setVerified(false);
        if (!options.silent) {
          setError('Cannot reach the SpiceHub server. Check your connection and retry.');
        }
        return false;
      }
    },
    [base, expireSession, portalId, requireHotel, validatePath]
  );

  useEffect(() => {
    if (!initialToken) {
      setBooting(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const valid = await validateToken(initialToken);
      if (cancelled) return;
      if (valid) {
        setToken(initialToken);
        setVerified(true);
      }
      setBooting(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [initialToken, validateToken]);

  // Keep the persisted session honest while the terminal stays open. This
  // catches 1-hour JWT expiry without waiting for a page refresh.
  useEffect(() => {
    if (!token) return;
    const check = () => {
      if (document.visibilityState === 'visible') {
        void validateToken(token, { silent: true });
      }
    };
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    const interval = window.setInterval(check, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [token, validateToken]);

  useEffect(() => {
    const onForcedLogout = () => expireSession('You have been signed out.');
    window.addEventListener('spicehub:logout', onForcedLogout);
    return () => window.removeEventListener('spicehub:logout', onForcedLogout);
  }, [expireSession]);

  const signIn = useCallback(
    async (loginEmail: string, loginPassword: string, slug: string) => {
      setError('');
      setSubmitting(true);
      try {
        const response = await fetch(`${base}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: loginEmail.trim(),
            password: loginPassword,
            ...(slug.trim() ? { slug: slug.trim() } : {}),
          }),
        });
        const json = await response.json().catch(() => null);
        if (!response.ok || !json?.success || !json?.data?.token) {
          setError(json?.message || 'Invalid email or password.');
          return;
        }
        const nextToken: string = json.data.token;
        const nextUser: StaffSessionUser = {
          id: String(json.data.user?.id || json.data.user?._id || ''),
          name: json.data.user?.name || 'Staff Member',
          email: json.data.user?.email || loginEmail.trim(),
          role: json.data.user?.role || '',
          hotelId: String(json.data.user?.hotelId || ''),
        };
        if (!isStaffRoleAllowed(portalId, nextUser.role)) {
          setError('This staff account is not authorized for this portal.');
          return;
        }
        if (requireHotel && !nextUser.hotelId) {
          setError('This account is not linked to a hotel. Please use a hotel staff account.');
          return;
        }
        persistSession(nextToken, nextUser);

        const tenant = json.data.tenant;
        const resolvedSlug = String(tenant?.slug || slug.trim() || '').trim();
        if (resolvedSlug) {
          try {
            window.localStorage.setItem(HOTEL_SLUG_KEY, resolvedSlug);
          } catch {}
        }
        if (tenant && mountedRef.current) {
          setSubscribedHotelName(tenant.name || 'Your Hotel');
          if (Array.isArray(tenant.enabledPortals)) {
            setAvailablePortals(tenant.enabledPortals);
            window.localStorage.setItem('spicehub_enabled_portals', JSON.stringify(tenant.enabledPortals));
          }
        }

        if (!mountedRef.current) return;
        setToken(nextToken);
        setUser(nextUser);
        setVerified(true);
        setPassword('');
      } catch {
        setError('Cannot reach the SpiceHub server. Check your connection and retry.');
      } finally {
        if (mountedRef.current) setSubmitting(false);
      }
    },
    [base, portalId, requireHotel]
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError('Enter your staff email and password.');
      return;
    }
    void signIn(email, password, hotelSlug);
  };

  const [usePinMode, setUsePinMode] = useState(() => {
    if (!requireHotel) return false;
    if (portalId === 'admin') return false;
    return true;
  });
  const [enteredPin, setEnteredPin] = useState('');
  const [currentDateTime, setCurrentDateTime] = useState(() => new Date().toLocaleString());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date().toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  /**
   * The terminal label shown before sign-in. It is deliberately generic: the
   * real staff name comes back from `verifyPin` and replaces this card.
   */
  const staffProfiles = useMemo(() => {
    const label =
      portalId === 'cashier'
        ? 'Cashier terminal'
        : portalId === 'kds'
        ? 'Kitchen display'
        : portalId === 'reception'
        ? 'Front desk terminal'
        : portalId === 'waiter'
        ? 'Floor service terminal'
        : 'Staff terminal';
    return {
      name: label,
      role: 'Sign in with your PIN',
      email: demoEmail || '',
      avatar: '',
    };
  }, [portalId, demoEmail]);

  const hotelCodePanel = (
    <div className="w-full text-left">
      {hotelCodeStatus === 'verified' ? (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-100 px-3 py-2.5 dark:bg-slate-800">
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-semibold text-slate-900 dark:text-white">
              {subscribedHotelName || 'Hotel verified'}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Hotel code verified</p>
          </div>
          <button
            type="button"
            onClick={handleChangeHotelCode}
            className="shrink-0 text-[12px] font-semibold text-emerald-600 underline underline-offset-2 dark:text-emerald-400"
          >
            Change
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-slate-600 dark:text-slate-400">
              Hotel code
            </span>
            <input
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              maxLength={10}
              data-testid="staff-login-hotel-slug"
              value={hotelSlug}
              onChange={(event) => {
                setHotelSlug(event.target.value.toUpperCase());
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
              aria-describedby={hotelCodeError ? 'staff-hotel-code-error' : undefined}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-[14px] font-semibold tracking-[0.12em] text-slate-900 outline-none transition placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </label>
          {hotelCodeError && (
            <p
              id="staff-hotel-code-error"
              role="alert"
              className="text-[12px] font-medium text-red-600 dark:text-red-400"
            >
              {hotelCodeError}
            </p>
          )}
          <button
            type="button"
            data-testid="verify-staff-hotel-code"
            onClick={() => void handleVerifyHotelCode()}
            disabled={
              hotelCodeStatus === 'verifying' || !isValidHotelAccessCode(hotelSlug)
            }
            className="h-11 w-full rounded-lg bg-slate-900 text-[13.5px] font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {hotelCodeStatus === 'verifying' ? 'Verifying code…' : 'Verify hotel code'}
          </button>
        </div>
      )}
    </div>
  );

  const staffProfileSelector = (
    <div className="w-full text-left">
      <span className="mb-1.5 block text-[12px] font-medium text-slate-600">Staff profile</span>
      <select
        data-testid="staff-profile-select"
        value={selectedStaffId}
        disabled={hotelCodeStatus !== 'verified' || staffRosterLoading || staffPinProfiles.length === 0}
        onChange={(event) => {
          setSelectedStaffId(event.target.value);
          setEnteredPin('');
          setError('');
        }}
        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-[14px] text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 disabled:bg-slate-100"
      >
        <option value="">
          {hotelCodeStatus === 'verifying'
            ? 'Verifying hotel code…'
            : hotelCodeStatus !== 'verified'
              ? 'Verify your hotel code first'
              : staffRosterLoading
                ? 'Loading staff profiles…'
                : staffPinProfiles.length
                  ? 'Choose your profile'
                  : 'No profiles available'}
        </option>
        {staffPinProfiles.map((profile) => (
          <option value={profile.id} key={profile.id}>
            {profile.name}{profile.shift ? ` · ${profile.shift}` : ''}
          </option>
        ))}
      </select>
      {staffRosterError && (
        <span className="mt-1.5 block text-[12px] leading-relaxed text-red-600" role="alert">
          {staffRosterError}
        </span>
      )}
    </div>
  );

  const handlePinDigit = (digit: string) => {
    if (enteredPin.length < 4) {
      const next = enteredPin + digit;
      setEnteredPin(next);
      setError('');
    }
  };

  const handleBackspace = () => {
    setEnteredPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleClearPin = () => {
    setEnteredPin('');
    setError('');
  };

  const verifyPin = useCallback(async (candidatePin: string) => {
    if (candidatePin.length !== 4) return;
    if (portalId !== 'admin' && !hotelAccessToken) {
      setError('Verify your hotel code before entering a PIN.');
      setEnteredPin('');
      return;
    }
    if (!selectedStaffId || !staffHotelId || !portalId) {
      setError(staffRosterError || 'Select a staff profile before entering your PIN.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${base}/auth/staff-pin-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pin: candidatePin,
          hotelId: staffHotelId,
          staffId: selectedStaffId,
          portal: portalId,
          hotelAccessToken,
        }),
      });
      const body = await res.json().catch(() => null);

      if (!res.ok || !body?.success || !body?.data?.token) {
        if (body?.errorCode === 'HOTEL_CODE_REQUIRED') {
          clearHotelAccessToken();
          setHotelAccessToken('');
          setHotelCodeStatus('idle');
          setHotelCodeError('Your hotel code session expired. Enter the code again.');
        }
        setError(body?.message || 'Invalid 4-digit staff PIN. Please try again.');
        setEnteredPin('');
        return;
      }

      const nextToken: string = body.data.token;
      const nextUser: StaffSessionUser = {
        id: String(body.data.user?.id || body.data.user?._id || ''),
        name: body.data.user?.name || 'Staff Member',
        email: body.data.user?.email || staffProfiles.email,
        role: body.data.user?.role || staffProfiles.role,
        hotelId: String(body.data.user?.hotelId || ''),
      };
      persistSession(nextToken, nextUser);
      if (mountedRef.current) {
        setToken(nextToken);
        setUser(nextUser);
        setVerified(true);
      }
    } catch {
      setError('Cannot reach the SpiceHub server. Check your connection.');
      setEnteredPin('');
    } finally {
      if (mountedRef.current) setSubmitting(false);
    }
  }, [base, portalId, selectedStaffId, staffHotelId, staffProfiles.email, staffProfiles.role, staffRosterError, hotelAccessToken]);

  if (token && user && verified && !booting) {
    if (notSubscribed) {
      return (
        <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-950 px-4 py-10 text-slate-900 dark:text-slate-100">
          <div className="relative w-full max-w-lg rounded-2xl border border-red-200 dark:border-red-900 bg-white dark:bg-slate-900 p-8 shadow-sm text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 text-3xl">
              🔒
            </div>
            <span className="inline-block px-3 py-1 mb-2 rounded-full border border-red-500/30 bg-red-500/10 text-xs font-bold text-red-400">
              Module Not Subscribed
            </span>
            <h2 className="text-xl font-black text-white">{appName} Is Not Active</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Your property <strong className="text-white">{subscribedHotelName || 'Hotel'}</strong> does not have an active subscription for the <span className="font-semibold text-red-300">{appName}</span> portal.
            </p>
            <div className="my-6 rounded-2xl border border-white/5 bg-black/40 p-4 text-left">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Active Portals For This Hotel:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {availablePortals.map((p) => (
                  <span
                    key={p}
                    className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-medium text-emerald-300"
                  >
                    ✓ {p.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.location.href = window.location.origin;
                  }
                }}
                className="w-full rounded-lg bg-white text-slate-900 px-4 py-3 text-xs font-black transition hover:bg-slate-100 shadow-sm"
              >
                Return to Hotel Admin ERP
              </button>
              <button
                type="button"
                onClick={() => expireSession('Signed out')}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-300 transition hover:bg-slate-700 hover:text-white"
              >
                Sign In With Another Account
              </button>
            </div>
            <p className="mt-4 text-[10px] text-slate-500">
              To add this workstation to your monthly plan, ask your Super Administrator to allocate the module.
            </p>
          </div>
        </div>
      );
    }
    return <>{children}</>;
  }

  if (booting) {
    return (
      <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-3 p-4 select-none">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900 dark:border-slate-700 dark:border-t-white" />
        <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">Verifying staff session…</div>
      </div>
    );
  }

  // ============================================================================
  // STAFF TERMINAL LOCK SCREEN (slate + blue, responsive split layout)
  // ============================================================================
  if (variant === 'heritage' && requireHotel && portalId !== 'admin') {
    const pinReady = enteredPin.length === 4;
    const portalLabel =
      portalId === 'cashier'
        ? 'Billing & Cash Office'
        : portalId === 'kds'
        ? 'Kitchen Display'
        : portalId === 'reception'
        ? 'Front Desk & Guest Operations'
        : portalId === 'waiter'
        ? 'Floor Service'
        : 'Staff Terminal';
    const portalBlurb =
      portalId === 'cashier'
        ? 'Take payments, split bills and close the shift.'
        : portalId === 'kds'
        ? 'Live order tickets, stations and prep tracking.'
        : portalId === 'reception'
        ? 'Rooms, check-in, folio charges and guest services.'
        : 'Tickets, tables and guest requests for your shift.';
    const clockLabel = currentDateTime.replace(/^[^,]+,?\s*/, '');

    return (
      <div className="flex min-h-[100dvh] w-full flex-col bg-white font-sans text-slate-900 select-none lg:flex-row">
        {/* Brand panel: compact strip on phones, half-image showcase panel on desktop web */}
        <aside className="relative flex w-full shrink-0 flex-col justify-between overflow-hidden bg-slate-900 px-5 py-5 text-white sm:px-8 lg:w-1/2 xl:w-7/12 lg:px-12 lg:py-10">
          <div className="absolute inset-0 hidden lg:block overflow-hidden">
            <img
              data-testid="staff-login-hero-image"
              src={
                adminLoginBranding.heroImageUrl?.trim() ||
                adminLoginBranding.coverImageUrl?.trim() ||
                DEFAULT_STAFF_LOGIN_IMAGE
              }
              alt={appName}
              onError={(e) => {
                const img = e.currentTarget;
                if (img.dataset.fallbackApplied === 'true') {
                  img.style.display = 'none';
                  return;
                }
                img.dataset.fallbackApplied = 'true';
                img.src = FALLBACK_ADMIN_LOGIN_IMAGE;
              }}
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/55 to-slate-950/30" />
          </div>

          <div className="relative z-10 flex items-center justify-between gap-3 lg:block">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-[13px] font-bold text-white shadow-sm">
                S
              </span>
              <span className="truncate text-[15px] font-semibold tracking-tight text-white">SpiceHub</span>
            </div>
            {subscribedHotelName && (
              <p className="truncate text-[11px] font-medium text-slate-300 lg:mt-6 lg:text-[13px]">
                {subscribedHotelName}
              </p>
            )}
          </div>

          <div className="relative z-10 hidden lg:block max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-400/30 bg-blue-500/10 text-blue-300 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm mb-4">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span>{portalLabel}</span>
            </div>
            <h1 className="text-3xl xl:text-4xl font-extrabold leading-[1.15] tracking-tight text-white">
              {appName}
            </h1>
            <p className="mt-3 text-sm xl:text-base leading-relaxed text-slate-200/90 font-normal">
              {portalBlurb}
            </p>
            <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 text-xs">
              <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-sm border border-white/10">
                <dt className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">Property code</dt>
                <dd className="mt-1 truncate font-bold text-white text-sm">
                  {hotelSlug.trim() || 'Not set'}
                </dd>
              </div>
              <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-sm border border-white/10">
                <dt className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">Terminal time</dt>
                <dd className="mt-1 font-bold tabular-nums text-white text-sm">{clockLabel}</dd>
              </div>
            </dl>
          </div>

          <div className="relative z-10 hidden border-t border-white/15 pt-4 text-xs text-slate-300/80 lg:flex items-center justify-between">
            <span>Authorised hotel staff only • Access is logged</span>
            <span className="font-medium text-emerald-400">Live Secure Gateway</span>
          </div>
        </aside>

        {/* Sign-in panel */}
        <main className="flex flex-1 items-center justify-center px-5 py-8 sm:px-8 lg:px-12 w-full lg:w-1/2 xl:w-5/12 bg-slate-50 dark:bg-slate-950 lg:min-h-screen">
          <div className="w-full max-w-[420px] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
            <div className="lg:hidden">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-600">
                {portalLabel}
              </p>
              <h1 className="mt-1.5 text-[22px] font-semibold leading-tight tracking-tight">
                {appName}
              </h1>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-500">{portalBlurb}</p>
            </div>

            <div className="mt-6 lg:mt-0">
              <h2 className="text-[15px] font-semibold text-slate-900">Unlock this terminal</h2>
              <p className="mt-1 text-[12.5px] text-slate-500">
                Enter the property code and your 4-digit PIN.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (pinReady) void verifyPin(enteredPin);
              }}
              className="mt-6 space-y-5"
            >
              {hotelCodePanel}

              {staffProfileSelector}

              <div>
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                  <span className="text-[12px] font-medium text-slate-600">Staff PIN</span>
                  <span className="shrink-0 text-[11px] text-slate-400">4 digits</span>
                </div>

                <div
                  className="relative flex cursor-text items-center gap-2.5"
                  onClick={() => {
                    const el = document.querySelector(
                      '[data-testid="native-staff-pin-input"]'
                    ) as HTMLInputElement | null;
                    el?.focus();
                  }}
                >
                  {[0, 1, 2, 3].map((idx) => {
                    const isFilled = enteredPin.length > idx;
                    const isCurrent = enteredPin.length === idx;
                    return (
                      <div
                        key={idx}
                        data-testid={`pin-box-${idx}`}
                        className={`flex h-12 flex-1 items-center justify-center rounded-lg border transition-colors ${
 isFilled
 ? 'border-slate-900 bg-slate-900'
 : isCurrent
 ? 'border-emerald-600 bg-white ring-2 ring-emerald-600/15'
 : 'border-slate-300 bg-slate-50'
 }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
 isFilled ? 'bg-white' : 'bg-transparent'
 }`}
                        />
                      </div>
                    );
                  })}
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    autoFocus
                    data-testid="native-staff-pin-input"
                    value={enteredPin}
                    disabled={hotelCodeStatus !== 'verified' || staffRosterLoading || staffPinProfiles.length === 0 || !selectedStaffId}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                      setEnteredPin(clean);
                      setError('');
                      if (clean.length === 4) void verifyPin(clean);
                    }}
                    className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
                  />
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  data-testid="staff-login-error"
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[12.5px] font-medium leading-snug text-red-700"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                data-testid="btn-login-pin"
                disabled={!pinReady || submitting || staffRosterLoading || !selectedStaffId || Boolean(staffRosterError)}
                className="h-11 w-full rounded-lg bg-emerald-600 text-[14px] font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
              >
                {submitting ? 'Checking…' : 'Unlock terminal'}
              </button>
            </form>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => expireSession('Signed out')}
                className="text-[12px] font-medium text-slate-500 underline underline-offset-2 transition hover:text-slate-900"
              >
                Switch account
              </button>
              <span className="text-[11px] text-slate-400">Access is logged</span>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ============================================================================
  // SPECIALIZED VIEW 1: SUPER ADMIN PLATFORM CONTROL PLANE (!requireHotel)
  // ============================================================================
  if (!requireHotel) {
    const handlePlatformImageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
      const img = event.currentTarget;
      if (img.dataset.fallbackApplied === 'true') {
        img.style.display = 'none';
        return;
      }
      img.dataset.fallbackApplied = 'true';
      img.src = FALLBACK_ADMIN_LOGIN_IMAGE;
    };

    return (
      <div className="min-h-screen w-full bg-slate-50 flex flex-col lg:flex-row font-sans select-none">
        {/* Mobile/Tablet Top Showcase Image Banner */}
        <div className="relative h-48 w-full overflow-hidden bg-slate-900 lg:hidden shrink-0">
          <img
            src={DEFAULT_PLATFORM_LOGIN_IMAGE}
            alt="SpiceHub Platform Control Plane"
            onError={handlePlatformImageError}
            className="h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-slate-950/15" />
          <div className="absolute inset-x-0 bottom-0 p-5">
            <span className="text-[10px] font-bold tracking-widest uppercase text-blue-400 block mb-1">
              Super Admin SaaS
            </span>
            <h1 className="text-xl font-bold tracking-tight text-white leading-snug">
              SpiceHub Platform Control Plane
            </h1>
          </div>
        </div>

        {/* Desktop Left Showcase Panel (Half-Width) */}
        <div className="hidden lg:flex lg:w-1/2 xl:w-7/12 bg-slate-950 text-white relative overflow-hidden flex-col justify-end">
          <img
            data-testid="superadmin-login-hero-image"
            src={DEFAULT_PLATFORM_LOGIN_IMAGE}
            alt="SpiceHub Platform Control Plane"
            onError={handlePlatformImageError}
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/50 to-slate-950/20" />

          <div className="relative z-10 p-10 xl:p-14 space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-400/30 bg-blue-500/10 text-blue-300 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span>Platform Control Plane</span>
            </div>

            <div className="space-y-2">
              <h1
                data-testid="superadmin-login-hero-title"
                className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight"
              >
                Enterprise Multi-Property SaaS Governance
              </h1>
              <p
                data-testid="superadmin-login-hero-subtitle"
                className="text-sm xl:text-base text-slate-200/90 leading-relaxed font-normal"
              >
                Centralized command console for global tenant orchestration, subscription lifecycle, database clusters, and platform-wide security audit telemetry.
              </p>
            </div>

            <div className="pt-6 border-t border-white/15 flex items-center justify-between text-xs text-slate-300/80">
              <span>© {new Date().getFullYear()} SpiceHub Enterprise Platform</span>
              <span className="font-medium tracking-wide">Global Superadmin Access</span>
            </div>
          </div>
        </div>

        {/* Right Form Card Panel */}
        <div className="w-full lg:w-1/2 xl:w-5/12 bg-slate-50 flex items-center justify-center p-6 sm:p-10 flex-1 lg:min-h-screen">
          <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-2xl p-8 sm:p-9 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
            <div className="mb-7">
              <h2
                data-testid="superadmin-login-form-title"
                className="text-2xl font-bold text-slate-900 tracking-tight"
              >
                Super Admin Sign In
              </h2>
              <p
                data-testid="superadmin-login-form-subtitle"
                className="mt-1.5 text-sm text-slate-600 leading-relaxed"
              >
                {appSubtitle || 'Enter master platform credentials to access the global control plane.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" data-testid="staff-login-form">
              {error && (
                <div
                  role="alert"
                  data-testid="staff-login-error"
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700"
                >
                  {error}
                </div>
              )}

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Superadmin Email
                </span>
                <input
                  data-testid="staff-login-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Write email"
                  className="w-full h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition placeholder:text-slate-400 font-medium"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Master Password
                </span>
                <div className="relative">
                  <input
                    data-testid="staff-login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Write password"
                    className="w-full h-11 rounded-lg border border-slate-300 bg-white px-4 pr-16 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition placeholder:text-slate-400 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800"
                  >
                    {showPassword ? 'HIDE' : 'SHOW'}
                  </button>
                </div>
              </label>

              <button
                data-testid="staff-login-submit"
                type="submit"
                disabled={submitting}
                className="h-12 w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition shadow-sm disabled:opacity-50 mt-2 cursor-pointer"
              >
                {submitting ? 'Authenticating Platform Access…' : 'Sign In to Control Plane'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // SPECIALIZED VIEW 2: HOTEL ADMIN ERP SPLIT-SCREEN (portalId === 'admin')
  // ============================================================================
  if (portalId === 'admin') {
    const resolvedHeroImage =
      adminLoginBranding.heroImageUrl?.trim() ||
      adminLoginBranding.coverImageUrl?.trim() ||
      DEFAULT_ADMIN_LOGIN_IMAGE;
    const resolvedHeroTitle = adminLoginBranding.heroTitle?.trim() || DEFAULT_ADMIN_HERO_TITLE;
    const resolvedHeroSubtitle = adminLoginBranding.heroSubtitle?.trim() || DEFAULT_ADMIN_HERO_SUBTITLE;
    const resolvedFormTitle = adminLoginBranding.formTitle?.trim() || DEFAULT_ADMIN_FORM_TITLE;
    const resolvedFormSubtitle = adminLoginBranding.formSubtitle?.trim() || DEFAULT_ADMIN_FORM_SUBTITLE;
    const resolvedBrandName = adminLoginBranding.hotelName?.trim() || 'SpiceHub Hospitality';

    const handleShowcaseImageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
      const img = event.currentTarget;
      if (img.dataset.fallbackApplied === 'true') {
        img.style.display = 'none';
        return;
      }
      img.dataset.fallbackApplied = 'true';
      img.src = FALLBACK_ADMIN_LOGIN_IMAGE;
    };

    return (
      <div className="min-h-screen w-full bg-slate-50 flex flex-col lg:flex-row font-sans">
        {/* Mobile/Tablet Top Showcase Image Banner */}
        <div className="relative h-48 w-full overflow-hidden bg-slate-900 lg:hidden">
          <img
            src={resolvedHeroImage}
            alt={resolvedHeroTitle}
            onError={handleShowcaseImageError}
            className="h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-slate-950/15" />
          <div className="absolute inset-x-0 bottom-0 p-5">
            <h1 className="text-xl font-bold tracking-tight text-white leading-snug">
              {resolvedHeroTitle}
            </h1>
          </div>
        </div>

        {/* Left Property Showcase Panel (Desktop/Laptop) */}
        <div className="hidden lg:flex lg:w-1/2 xl:w-7/12 bg-slate-950 text-white relative overflow-hidden flex-col justify-end">
          <img
            data-testid="admin-login-hero-image"
            src={resolvedHeroImage}
            alt={resolvedHeroTitle}
            onError={handleShowcaseImageError}
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-slate-950/15"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-slate-950/55 via-transparent to-transparent"
          />

          <div className="relative z-10 p-12 xl:p-14 space-y-6">
            <div className="max-w-xl space-y-3.5">
              <h1
                data-testid="admin-login-hero-title"
                className="text-3xl xl:text-4xl font-bold tracking-tight text-white leading-[1.15] drop-shadow-sm"
              >
                {resolvedHeroTitle}
              </h1>
              <p
                data-testid="admin-login-hero-subtitle"
                className="text-slate-200/90 text-base leading-relaxed max-w-lg"
              >
                {resolvedHeroSubtitle}
              </p>
            </div>

            <div className="border-t border-white/15 pt-5 flex items-center justify-between text-xs text-slate-300/85">
              <span>© {new Date().getFullYear()} {resolvedBrandName}</span>
              <span>Hotel Operations Console</span>
            </div>
          </div>
        </div>

        {/* Right Form Card Panel */}
        <div className="w-full lg:w-1/2 xl:w-5/12 bg-slate-50 flex items-center justify-center p-6 sm:p-10 flex-1 lg:min-h-screen">
          <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-2xl p-8 sm:p-9 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
            <div className="mb-7">
              <h2
                data-testid="admin-login-form-title"
                className="text-2xl font-bold text-slate-900 tracking-tight"
              >
                {resolvedFormTitle}
              </h2>
              <p
                data-testid="admin-login-form-subtitle"
                className="mt-1.5 text-sm text-slate-600 leading-relaxed"
              >
                {resolvedFormSubtitle}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" data-testid="staff-login-form">
              {error && (
                <div
                  role="alert"
                  data-testid="staff-login-error"
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700"
                >
                  {error}
                </div>
              )}

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  {portalId === 'admin' ? 'Admin Email' : 'Staff Email'}
                </span>
                <input
                  data-testid="staff-login-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={portalId === 'admin' ? 'Write admin email' : 'Write email'}
                  className="w-full h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition placeholder:text-slate-400 font-medium"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Password
                </span>
                <div className="relative">
                  <input
                    data-testid="staff-login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Write password"
                    className="w-full h-11 rounded-lg border border-slate-300 bg-white px-4 pr-16 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition placeholder:text-slate-400 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800"
                  >
                    {showPassword ? 'HIDE' : 'SHOW'}
                  </button>
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Hotel Slug / Property Code
                </span>
                <input
                  data-testid="staff-login-hotel-slug"
                  type="text"
                  value={hotelSlug}
                  onChange={(event) => setHotelSlug(event.target.value)}
                  placeholder="Write hotel slug or property code"
                  className="w-full h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition placeholder:text-slate-400 font-medium"
                />
              </label>

              <button
                data-testid="staff-login-submit"
                type="submit"
                disabled={submitting}
                className="h-12 w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition shadow-sm disabled:opacity-50 mt-2 cursor-pointer"
              >
                {submitting ? 'Verifying Admin Session…' : 'Sign In to Hotel ERP'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // SPECIALIZED VIEW 3: STANDARD STAFF PIN KEYPAD (Cashier, KDS, Reception, Waiter)
  // ============================================================================
  if (usePinMode) {
    const portalLabel =
      portalId === 'cashier'
        ? 'Billing & Cash Office'
        : portalId === 'kds'
        ? 'Kitchen Display'
        : portalId === 'reception'
        ? 'Front Desk & Guest Operations'
        : portalId === 'waiter'
        ? 'Floor Service'
        : 'Staff Workstation';
    const portalBlurb =
      portalId === 'cashier'
        ? 'Fast point-of-sale, split bills and shift control.'
        : portalId === 'kds'
        ? 'Live kitchen order tickets, stations and prep tracking.'
        : portalId === 'reception'
        ? 'Room inventory, check-in/out, folio charges and guest services.'
        : 'Table management, ordering and guest service.';

    return (
      <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col lg:flex-row font-sans select-none">
        {/* Left Showcase Panel for Desktop Web */}
        <div className="hidden lg:flex lg:w-1/2 xl:w-7/12 bg-slate-950 text-white relative overflow-hidden flex-col justify-between p-10 xl:p-14">
          <img
            data-testid="staff-login-hero-image"
            src={
              adminLoginBranding.heroImageUrl?.trim() ||
              adminLoginBranding.coverImageUrl?.trim() ||
              DEFAULT_STAFF_LOGIN_IMAGE
            }
            alt={appName}
            onError={(e) => {
              const img = e.currentTarget;
              if (img.dataset.fallbackApplied === 'true') {
                img.style.display = 'none';
                return;
              }
              img.dataset.fallbackApplied = 'true';
              img.src = FALLBACK_ADMIN_LOGIN_IMAGE;
            }}
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/50 to-slate-950/20" />

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white shadow-sm">
                S
              </span>
              <span className="text-base font-bold tracking-tight text-white">SpiceHub Hospitality</span>
            </div>
            {subscribedHotelName && (
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-slate-200 border border-white/10">
                {subscribedHotelName}
              </span>
            )}
          </div>

          <div className="relative z-10 max-w-xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-400/30 bg-blue-500/10 text-blue-300 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span>{portalLabel}</span>
            </div>
            <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {appName}
            </h1>
            <p className="text-sm xl:text-base text-slate-200/90 leading-relaxed font-normal">
              {portalBlurb}
            </p>
            <div className="pt-4 grid grid-cols-2 gap-4 text-xs">
              <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-sm border border-white/10">
                <span className="text-slate-400 font-medium uppercase tracking-wider text-[10px] block">Terminal Status</span>
                <span className="mt-1 font-bold text-white text-sm block">PIN Protected</span>
              </div>
              <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-sm border border-white/10">
                <span className="text-slate-400 font-medium uppercase tracking-wider text-[10px] block">Terminal Time</span>
                <span className="mt-1 font-bold tabular-nums text-white text-sm block">{currentDateTime}</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 border-t border-white/15 pt-4 text-xs text-slate-300/80 flex items-center justify-between">
            <span>Authorised staff access only • Access is logged</span>
            <span className="font-medium text-emerald-400">Live Secure Gateway</span>
          </div>
        </div>

        {/* Right PIN Card Panel */}
        <div className="w-full lg:w-1/2 xl:w-5/12 flex items-center justify-center p-6 sm:p-10 flex-1 lg:min-h-screen">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-[0_8px_30px_rgba(15,23,42,0.06)] flex flex-col items-center text-center">
            {/* Subtle live time/date display at top */}
            <div className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-3">
              {currentDateTime}
            </div>

          {/* Staff Card: Photo, Name, Role */}
          <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800">
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="4" y="10.5" width="16" height="10.5" rx="2.5" />
              <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
            </svg>
          </span>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {staffProfiles.name}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            {staffProfiles.role}
          </p>

          <div className="w-full mb-3 space-y-3">
            {hotelCodePanel}
            {staffProfileSelector}
          </div>

          {error && (
            <div
              role="alert"
              data-testid="staff-login-error"
              className="text-xs text-red-600 dark:text-red-400 font-semibold mb-3 max-w-xs"
            >
              {error}
            </div>
          )}

          {/* Single Unified 4-Box PIN Display with Native Keyboard */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (enteredPin.length === 4) {
                void verifyPin(enteredPin);
              }
            }}
            className="w-full flex flex-col items-center gap-4 mb-4"
          >
            <div
              className="relative w-full max-w-[240px] h-14 flex items-center justify-between cursor-text"
              onClick={() => {
                const el = document.querySelector('[data-testid="native-staff-pin-input"]') as HTMLInputElement;
                el?.focus();
              }}
            >
              {[0, 1, 2, 3].map((idx) => {
                const isFilled = enteredPin.length > idx;
                const isCurrent = enteredPin.length === idx;
                return (
                  <div
                    key={idx}
                    data-testid={`pin-box-${idx}`}
                    className={`w-12 h-14 rounded-xl flex items-center justify-center text-2xl font-black transition-all ${
 isFilled
 ? 'bg-blue-50 dark:bg-blue-950/40 border-2 border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400'
 : isCurrent
 ? 'bg-slate-50 dark:bg-slate-800 border-2 border-blue-500 text-slate-400'
 : 'bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-slate-300'
 }`}
                  >
                    {isFilled ? '●' : ''}
                  </div>
                );
              })}
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                autoFocus
                disabled={staffRosterLoading || staffPinProfiles.length === 0 || !selectedStaffId}
                data-testid="native-staff-pin-input"
                value={enteredPin}
                onChange={(e) => {
                  const clean = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                  setEnteredPin(clean);
                  setError('');
                  if (clean.length === 4) {
                    void verifyPin(clean);
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-text z-10"
              />
            </div>

            <button
              type="submit"
              data-testid="btn-login-pin"
              disabled={enteredPin.length !== 4 || submitting || staffRosterLoading || !selectedStaffId || Boolean(staffRosterError)}
              className="h-12 w-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl text-base font-bold hover:opacity-90 disabled:opacity-40 transition flex items-center justify-center cursor-pointer shadow-sm active:scale-95"
            >
              {submitting ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          {portalId === 'admin' && (
            <div className="mt-4 flex items-center justify-end w-full text-xs text-slate-500 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setUsePinMode(false)}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium underline"
              >
                Password Login
              </button>
            </div>
          )}
          </div>
        </div>
      </div>
    );
  }

  // Floor staff workstations (reception, cashier, kds, waiter) only authenticate via staff PIN.
  // Never show generic website email/password forms for operational terminals.
  if (requireHotel && portalId !== 'admin') {
    return (
      <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col lg:flex-row font-sans select-none">
        {/* Left Showcase Panel for Desktop Web */}
        <div className="hidden lg:flex lg:w-1/2 xl:w-7/12 bg-slate-950 text-white relative overflow-hidden flex-col justify-between p-10 xl:p-14">
          <img
            data-testid="staff-login-hero-image"
            src={DEFAULT_STAFF_LOGIN_IMAGE}
            alt={appName}
            onError={(e) => {
              const img = e.currentTarget;
              if (img.dataset.fallbackApplied === 'true') {
                img.style.display = 'none';
                return;
              }
              img.dataset.fallbackApplied = 'true';
              img.src = FALLBACK_ADMIN_LOGIN_IMAGE;
            }}
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/50 to-slate-950/20" />
          <div className="relative z-10 flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white shadow-sm">
              S
            </span>
            <span className="text-base font-bold tracking-tight text-white">SpiceHub Hospitality</span>
          </div>
          <div className="relative z-10 max-w-xl space-y-4">
            <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {appName}
            </h1>
            <p className="text-sm xl:text-base text-slate-200/90 leading-relaxed font-normal">
              {appSubtitle || 'Operational terminal access for frontline hotel staff.'}
            </p>
          </div>
          <div className="relative z-10 border-t border-white/15 pt-4 text-xs text-slate-300/80">
            <span>Authorised staff access only • Activity logged</span>
          </div>
        </div>

        {/* Right Unlock Card */}
        <div className="w-full lg:w-1/2 xl:w-5/12 flex items-center justify-center p-6 sm:p-10 flex-1 lg:min-h-screen">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-[0_8px_30px_rgba(15,23,42,0.06)] flex flex-col items-center text-center">
            <img
              src={staffProfiles.avatar}
              alt={staffProfiles.name}
              className="w-20 h-20 rounded-full border-2 border-slate-200 dark:border-slate-700 object-cover mb-3"
            />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{staffProfiles.name}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{staffProfiles.role}</p>
            <div className="text-xs text-red-600 dark:text-red-400 font-semibold mb-3">
              {error || 'Please enter your 4-digit staff PIN to unlock this workstation.'}
            </div>
            <button
              type="button"
              onClick={() => {
                setUsePinMode(true);
                setError('');
              }}
              className="h-12 w-full bg-blue-600 text-white rounded-xl text-base font-bold hover:bg-blue-700 transition cursor-pointer"
            >
              Enter 4-Digit PIN
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // STANDARD VIEW 4: GENERIC PASSWORD FORM
  // ============================================================================
  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col lg:flex-row font-sans select-none">
      {/* Left Showcase Panel for Desktop Web */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-7/12 bg-slate-950 text-white relative overflow-hidden flex-col justify-between p-10 xl:p-14">
        <img
          data-testid="staff-login-hero-image"
          src={DEFAULT_STAFF_LOGIN_IMAGE}
          alt={appName}
          onError={(e) => {
            const img = e.currentTarget;
            if (img.dataset.fallbackApplied === 'true') {
              img.style.display = 'none';
              return;
            }
            img.dataset.fallbackApplied = 'true';
            img.src = FALLBACK_ADMIN_LOGIN_IMAGE;
          }}
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/50 to-slate-950/20" />

        <div className="relative z-10 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white shadow-sm">
            S
          </span>
          <span className="text-base font-bold tracking-tight text-white">SpiceHub Hospitality</span>
        </div>

        <div className="relative z-10 max-w-xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-400/30 bg-blue-500/10 text-blue-300 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span>Staff Terminal Gateway</span>
          </div>
          <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
            {appName}
          </h1>
          <p className="text-sm xl:text-base text-slate-200/90 leading-relaxed font-normal">
            {appSubtitle || 'Sign in with your verified staff credentials to proceed.'}
          </p>
        </div>

        <div className="relative z-10 border-t border-white/15 pt-4 text-xs text-slate-300/80 flex items-center justify-between">
          <span>Authorised staff access only • Access is logged</span>
          <span className="font-medium text-emerald-400">Live Secure Gateway</span>
        </div>
      </div>

      {/* Right Form Card Panel */}
      <div className="w-full lg:w-1/2 xl:w-5/12 flex items-center justify-center p-6 sm:p-10 flex-1 lg:min-h-screen">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
          <div className="mb-5 text-center">
            <div className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              {requireHotel ? 'Protected Staff Terminal' : 'Platform Control Plane'}
            </div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{appName}</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {appSubtitle || 'Sign in with your hotel staff account to continue.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" data-testid="staff-login-form">
            {error && (
              <div
                role="alert"
                data-testid="staff-login-error"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
              >
                {error}
              </div>
            )}

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                {requireHotel ? 'Staff Email' : 'Platform Email'}
              </span>
              <input
                data-testid="staff-login-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Write email"
                className="w-full h-11 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-400 transition placeholder:text-slate-400 font-medium"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Password
              </span>
              <div className="relative">
                <input
                  data-testid="staff-login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Write password"
                  className="w-full h-11 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 pr-16 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-400 transition placeholder:text-slate-400 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white"
                >
                  {showPassword ? 'HIDE' : 'SHOW'}
                </button>
              </div>
            </label>

            {requireHotel && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Hotel Slug / Property Code
                </span>
                <input
                  data-testid="staff-login-hotel-slug"
                  type="text"
                  value={hotelSlug}
                  onChange={(event) => setHotelSlug(event.target.value)}
                  placeholder="Write hotel slug or property code"
                  className="w-full h-11 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-400 transition placeholder:text-slate-400 font-medium"
                />
              </label>
            )}

            <button
              data-testid="staff-login-submit"
              type="submit"
              disabled={submitting}
              className="h-12 w-full rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-base font-semibold hover:opacity-90 transition disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Signing in…' : 'Sign In to Terminal'}
            </button>

            <button
              type="button"
              onClick={() => setUsePinMode(true)}
              className="w-full text-center text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium underline pt-2 cursor-pointer"
            >
              ← Back to 4-Digit PIN Keypad
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
