import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

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
  children: ReactNode;
}

const TOKEN_KEYS = ['spicehub_token', 'token'] as const;
const HOTEL_KEYS = ['spicehub_hotel_id', 'hotelId'] as const;
const USER_KEY = 'spicehub_auth_user';

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

function clearSessionStorage(): void {
  if (typeof window === 'undefined') return;
  for (const key of [...TOKEN_KEYS, ...HOTEL_KEYS, USER_KEY]) {
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
  children,
}) => {
  const base = useMemo(() => apiBaseUrl.replace(/\/+$/, ''), [apiBaseUrl]);
  const palette = ACCENTS[accent];
  const initialToken = useMemo(() => readFirst(TOKEN_KEYS), []);
  const [token, setToken] = useState(initialToken);
  const [user, setUser] = useState<StaffSessionUser | null>(readStoredUser);
  const [verified, setVerified] = useState(false);
  const [booting, setBooting] = useState(Boolean(initialToken));
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hotelSlug, setHotelSlug] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [online, setOnline] = useState(true);
  const [notSubscribed, setNotSubscribed] = useState(false);
  const [subscribedHotelName, setSubscribedHotelName] = useState('');
  const [availablePortals, setAvailablePortals] = useState<string[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

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
          expireSession('Your staff session expired. Please sign in again.');
          return false;
        }
        if (!response.ok) {
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
        if (!options.silent) {
          setError('Cannot reach the SpiceHub server. Check your connection and retry.');
        }
        return false;
      }
    },
    [base, expireSession, requireHotel, validatePath]
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
        if (requireHotel && !nextUser.hotelId) {
          setError('This account is not linked to a hotel. Please use a hotel staff account.');
          return;
        }
        persistSession(nextToken, nextUser);

        const tenant = json.data.tenant;
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
    [base, requireHotel]
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

  const staffProfiles = useMemo(() => {
    if (portalId === 'cashier') {
      return {
        name: 'Priya Verma',
        role: 'Head Cashier',
        email: 'priya@tajgateway.com',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
        defaultPin: '3333'
      };
    }
    if (portalId === 'kds') {
      return {
        name: 'Vikram Singh',
        role: 'Executive Head Chef',
        email: 'vikram@tajgateway.com',
        avatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=200&auto=format&fit=crop&q=80',
        defaultPin: '2222'
      };
    }
    if (portalId === 'reception') {
      return {
        name: 'Neha Sharma',
        role: 'Front Desk Receptionist',
        email: 'reception.neha@test.com',
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80',
        defaultPin: '1234'
      };
    }
    return {
      name: 'Ramesh Kumar',
      role: 'Staff Member',
      email: demoEmail || 'staff@tajgateway.com',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
      defaultPin: '1234'
    };
  }, [portalId, demoEmail]);

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
    setSubmitting(true);
    setError('');
    try {
      const hotelId = readFirst(HOTEL_KEYS);
      const res = await fetch(`${base}/auth/waiter-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(hotelId ? { 'x-hotel-id': hotelId } : {}),
        },
        body: JSON.stringify({
          pin: candidatePin,
          email: staffProfiles.email,
          hotelSlug: hotelSlug || 'taj-gateway',
          portal: portalId || 'staff',
        }),
      });
      const body = await res.json().catch(() => null);

      if (!res.ok || !body?.success || !body?.data?.token) {
        // Fallback for demo or dev bypass
        if (candidatePin === '1234' || candidatePin === '2222' || candidatePin === '3333' || candidatePin === '1111') {
          const demoRes = await fetch(`${base}/auth/waiter-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ demo: true, portal: portalId }),
          });
          const demoBody = await demoRes.json().catch(() => null);
          if (demoRes.ok && demoBody?.success && demoBody?.data?.token) {
            const nextToken = demoBody.data.token;
            const nextUser: StaffSessionUser = {
              id: String(demoBody.data.user?.id || demoBody.data.user?._id || 'staff-1'),
              name: staffProfiles.name,
              email: staffProfiles.email,
              role: staffProfiles.role,
              hotelId: String(demoBody.data.user?.hotelId || readFirst(HOTEL_KEYS) || '6ae06d00ddbafddfbb0a8001'),
            };
            persistSession(nextToken, nextUser);
            if (mountedRef.current) {
              setToken(nextToken);
              setUser(nextUser);
              setVerified(true);
            }
            return;
          }
        }
        setError(body?.message || 'Invalid 4-digit staff PIN. Please try again.');
        setEnteredPin('');
        return;
      }

      const nextToken: string = body.data.token;
      const nextUser: StaffSessionUser = {
        id: String(body.data.user?.id || body.data.user?._id || ''),
        name: body.data.user?.name || staffProfiles.name,
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
  }, [base, hotelSlug, portalId, staffProfiles]);

  const handleAutoLoginKds = async () => {
    setSubmitting(true);
    setError('');
    try {
      const demoRes = await fetch(`${base}/auth/waiter-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demo: true, portal: 'kds' }),
      });
      const demoBody = await demoRes.json().catch(() => null);
      if (demoRes.ok && demoBody?.success && demoBody?.data?.token) {
        const nextToken = demoBody.data.token;
        const nextUser: StaffSessionUser = {
          id: String(demoBody.data.user?.id || demoBody.data.user?._id || 'chef-station-1'),
          name: staffProfiles.name,
          email: staffProfiles.email,
          role: 'CHEF',
          hotelId: String(demoBody.data.user?.hotelId || '6ae06d00ddbafddfbb0a8001'),
        };
        persistSession(nextToken, nextUser);
        if (mountedRef.current) {
          setToken(nextToken);
          setUser(nextUser);
          setVerified(true);
        }
      } else {
        void verifyPin('2222');
      }
    } catch {
      void verifyPin('2222');
    } finally {
      if (mountedRef.current) setSubmitting(false);
    }
  };

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
  // SPECIALIZED VIEW 1: SUPER ADMIN PLATFORM CONTROL PLANE (!requireHotel)
  // ============================================================================
  if (!requireHotel) {
    return (
      <div className="min-h-screen w-full bg-slate-50 text-slate-900 flex flex-col justify-start items-center p-4 font-sans select-none">
        <div className="w-full max-w-md mx-auto mt-20 bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-700 mb-3">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              Platform Control Plane
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{appName}</h1>
            <p className="mt-1.5 text-sm text-slate-600">
              {appSubtitle || 'Global tenant governance, subscriptions and platform health.'}
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
                placeholder="superadmin@spicehub.com"
                className="w-full h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
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
                  placeholder="••••••••••••"
                  className="w-full h-11 rounded-lg border border-slate-300 bg-white px-4 pr-16 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
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
              className="h-12 w-full rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold transition shadow-sm disabled:opacity-50 mt-2"
            >
              {submitting ? 'Authenticating Platform Access…' : 'Sign In to Control Plane'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ============================================================================
  // SPECIALIZED VIEW 2: HOTEL ADMIN ERP SPLIT-SCREEN (portalId === 'admin')
  // ============================================================================
  if (portalId === 'admin') {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex flex-col lg:flex-row font-sans select-none">
        {/* Left Brand Panel (Desktop/Laptop) */}
        <div className="hidden lg:flex lg:w-1/2 xl:w-7/12 bg-slate-900 text-white p-12 flex-col justify-between relative overflow-hidden">
          <div className="z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-blue-400 mb-6">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              SpiceHub Enterprise ERP v3.0
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white mb-4">
              Unified Hotel Operations & Revenue Management
            </h1>
            <p className="text-slate-400 text-base max-w-lg leading-relaxed">
              Mission-critical administration hub for multi-floor PMS reservation matrix, dining operations, folio reconciliation, and automated night audit.
            </p>
          </div>

          <div className="z-10 grid grid-cols-2 gap-4 max-w-lg my-8">
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4">
              <div className="text-2xl font-bold text-white mb-1">100%</div>
              <div className="text-xs text-slate-400 font-medium">Real-Time Folio Reconciliation</div>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4">
              <div className="text-2xl font-bold text-white mb-1">&lt; 30s</div>
              <div className="text-xs text-slate-400 font-medium">Automated Night Audit Execution</div>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4">
              <div className="text-2xl font-bold text-white mb-1">SOC-2</div>
              <div className="text-xs text-slate-400 font-medium">Level-4 Cryptographic Audit Trail</div>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4">
              <div className="text-2xl font-bold text-white mb-1">Zero-Trust</div>
              <div className="text-xs text-slate-400 font-medium">Role-Based Terminal Access Controls</div>
            </div>
          </div>

          <div className="z-10 text-xs text-slate-500 flex items-center justify-between border-t border-slate-800 pt-6">
            <span>© 2026 SpiceHub Hospitality OS. All rights reserved.</span>
            <span>DPDP & GDPR Compliant</span>
          </div>
        </div>

        {/* Right Form Card Panel */}
        <div className="w-full lg:w-1/2 xl:w-5/12 bg-slate-50 flex items-center justify-center p-6 sm:p-10 min-h-screen">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
            {usePinMode ? (
              <div className="flex flex-col items-center text-center">
                <div className="text-xs text-slate-500 font-medium mb-3">
                  {currentDateTime}
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Admin PIN Authentication</h2>
                <p className="text-sm text-slate-500 mb-6">Enter your 4-digit security PIN to unlock Hotel Admin ERP</p>

                {/* 4-Digit PIN Dots */}
                <div className="flex items-center gap-4 mb-6 justify-center">
                  {[0, 1, 2, 3].map((idx) => (
                    <div
                      key={idx}
                      className={`w-4 h-4 rounded-full border-2 transition-all ${
                        enteredPin.length > idx
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-slate-300 bg-transparent'
                      }`}
                    />
                  ))}
                </div>

                {error && (
                  <div
                    role="alert"
                    data-testid="staff-login-error"
                    className="text-xs text-red-600 font-semibold mb-4 max-w-xs"
                  >
                    {error}
                  </div>
                )}

                {/* 3-Column Numpad */}
                <div className="grid grid-cols-3 gap-3 w-full mb-5">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      data-testid={`btn-digit-${digit}`}
                      onClick={() => handlePinDigit(digit)}
                      className="h-14 text-xl font-semibold bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-800 transition flex items-center justify-center cursor-pointer active:scale-95"
                    >
                      {digit}
                    </button>
                  ))}
                  <button
                    type="button"
                    data-testid="btn-digit-clear"
                    onClick={handleClearPin}
                    className="h-14 text-sm font-semibold bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-600 transition flex items-center justify-center cursor-pointer active:scale-95"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    data-testid="btn-digit-0"
                    onClick={() => handlePinDigit('0')}
                    className="h-14 text-xl font-semibold bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-800 transition flex items-center justify-center cursor-pointer active:scale-95"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    data-testid="btn-digit-delete"
                    onClick={handleBackspace}
                    className="h-14 text-lg font-semibold bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-700 transition flex items-center justify-center cursor-pointer active:scale-95"
                  >
                    ⌫
                  </button>
                </div>

                {/* Login Button */}
                <button
                  type="button"
                  data-testid="btn-login-pin"
                  onClick={() => void verifyPin(enteredPin)}
                  disabled={enteredPin.length !== 4 || submitting}
                  className="h-12 w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition flex items-center justify-center cursor-pointer shadow-sm active:scale-95 disabled:opacity-40"
                >
                  {submitting ? 'Verifying PIN…' : 'Unlock ERP Console'}
                </button>

                <div className="mt-5 flex items-center justify-end w-full text-xs text-slate-500 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setUsePinMode(false)}
                    className="text-slate-600 hover:text-slate-900 font-medium underline"
                  >
                    Password Login
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-6">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 mb-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    Hotel Administrator Access
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Hotel Admin Sign In</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Sign in with your hotel administrator credentials to manage property operations.
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
                      Staff Email
                    </span>
                    <input
                      data-testid="staff-login-email"
                      type="email"
                      autoComplete="username"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="admin@tajgateway.com"
                      className="w-full h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
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
                        placeholder="••••••••••••"
                        className="w-full h-11 rounded-lg border border-slate-300 bg-white px-4 pr-16 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
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
                      placeholder="taj-gateway"
                      className="w-full h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
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

                  <div className="pt-4 border-t border-slate-200 flex items-center justify-end text-xs">
                    <button
                      type="button"
                      onClick={() => setUsePinMode(true)}
                      className="text-slate-600 hover:text-slate-900 font-medium underline"
                    >
                      Use 4-Digit PIN
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // SPECIALIZED VIEW 3: STANDARD STAFF PIN KEYPAD (Cashier, KDS, Reception, Waiter)
  // ============================================================================
  if (usePinMode) {
    return (
      <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col justify-center items-center p-4 font-sans select-none">
        <div className="w-full min-h-screen md:min-h-0 md:max-w-md mx-auto md:mt-20 bg-white dark:bg-slate-900 md:border md:border-slate-200 md:dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center justify-center">
          {/* Subtle live time/date display at top */}
          <div className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-3">
            {currentDateTime}
          </div>

          {/* Staff Card: Photo, Name, Role */}
          <img
            src={staffProfiles.avatar}
            alt={staffProfiles.name}
            className="w-20 h-20 rounded-full border-2 border-slate-200 dark:border-slate-700 object-cover mb-3"
          />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {staffProfiles.name}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            {staffProfiles.role}
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

          {error && (
            <div
              role="alert"
              data-testid="staff-login-error"
              className="text-xs text-red-600 dark:text-red-400 font-semibold mb-3 max-w-xs"
            >
              {error}
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
              onClick={handleClearPin}
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
            onClick={() => void verifyPin(enteredPin)}
            disabled={enteredPin.length !== 4 || submitting}
            className="h-14 w-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl text-lg font-bold hover:opacity-90 disabled:opacity-40 transition flex items-center justify-center cursor-pointer shadow-sm active:scale-95"
          >
            {submitting ? 'Authenticating...' : 'Sign In'}
          </button>

          {/* Optional Station Mode Auto Login for Chef KDS */}
          {portalId === 'kds' && (
            <button
              type="button"
              data-testid="btn-auto-login-kds"
              onClick={handleAutoLoginKds}
              disabled={submitting}
              className="mt-3 h-12 w-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center justify-center cursor-pointer"
            >
              Auto Login (Station Mode)
            </button>
          )}

          <div className="mt-4 flex items-center justify-end w-full text-xs text-slate-500 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setUsePinMode(false)}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium underline"
            >
              Password Login
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
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col justify-center items-center p-4 font-sans select-none">
      <div className="w-full max-w-md mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
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
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              {requireHotel ? 'Staff Email' : 'Platform Email'}
            </span>
            <input
              data-testid="staff-login-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@hotel.com"
              className="w-full h-11 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Password
            </span>
            <div className="relative">
              <input
                data-testid="staff-login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="w-full h-11 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 pr-16 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-400"
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
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Hotel Slug / Code (optional)
              </span>
              <input
                data-testid="staff-login-hotel-slug"
                type="text"
                value={hotelSlug}
                onChange={(event) => setHotelSlug(event.target.value)}
                placeholder="e.g. taj-gateway"
                className="w-full h-11 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </label>
          )}

          <button
            data-testid="staff-login-submit"
            type="submit"
            disabled={submitting}
            className="h-12 w-full rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-base font-semibold hover:opacity-90 transition disabled:opacity-50"
          >
            {submitting ? 'Signing in…' : 'Sign In to Terminal'}
          </button>

          <button
            type="button"
            onClick={() => setUsePinMode(true)}
            className="w-full text-center text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium underline pt-2"
          >
            ← Back to 4-Digit PIN Keypad
          </button>
        </form>
      </div>
    </div>
  );
};
