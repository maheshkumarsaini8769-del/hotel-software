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
    glow: 'from-amber-500 to-orange-600',
    button: 'bg-amber-500 text-slate-950 hover:bg-amber-400',
    ring: 'focus:border-amber-500/70 focus:ring-amber-500/20',
    badge: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  },
  emerald: {
    glow: 'from-emerald-500 to-teal-600',
    button: 'bg-emerald-500 text-slate-950 hover:bg-emerald-400',
    ring: 'focus:border-emerald-500/70 focus:ring-emerald-500/20',
    badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  },
  blue: {
    glow: 'from-blue-500 to-indigo-600',
    button: 'bg-blue-500 text-white hover:bg-blue-400',
    ring: 'focus:border-blue-500/70 focus:ring-blue-500/20',
    badge: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
  },
} as const;

function readFirst(keys: readonly string[]): string {
  if (typeof window === 'undefined') return '';
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

  const handleDemoSignIn = () => {
    if (!demoEmail || !demoPassword) return;
    setEmail(demoEmail);
    setPassword(demoPassword);
    void signIn(demoEmail, demoPassword, '');
  };

  if (token && user && verified && !booting) {
    if (notSubscribed) {
      return (
        <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#07090f] px-4 py-10 text-slate-100">
          <div className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-rose-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="relative w-full max-w-lg rounded-3xl border border-rose-500/30 bg-[#0e121b] p-8 shadow-2xl text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-3xl">
              🔒
            </div>
            <span className="inline-block px-3 py-1 mb-2 rounded-full border border-rose-500/30 bg-rose-500/10 text-xs font-bold text-rose-400">
              Module Not Subscribed
            </span>
            <h2 className="text-xl font-black text-white">{appName} Is Not Active</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Your property <strong className="text-white">{subscribedHotelName || 'Hotel'}</strong> does not have an active subscription for the <span className="font-semibold text-rose-300">{appName}</span> portal.
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
                className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-xs font-black text-white transition hover:bg-indigo-500"
              >
                Return to Hotel Admin ERP
              </button>
              <button
                type="button"
                onClick={() => expireSession('Signed out')}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-xs font-bold text-slate-400 transition hover:bg-slate-800 hover:text-white"
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

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#07090f] px-4 py-10 text-slate-100">
      <div className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="relative w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr ${palette.glow} text-lg font-black text-white shadow-lg shadow-black/30`}>
            S
          </div>
          <div>
            <div className="text-xl font-black tracking-tight text-white">SpiceHub</div>
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
              Hospitality Operating System
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-[#0e111a]/95 p-6 shadow-2xl shadow-black/50 backdrop-blur">
          <div className="mb-5">
            <div className={`mb-2 inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${palette.badge}`}>
              {requireHotel ? 'Protected Staff Terminal' : 'Platform Control Plane'}
            </div>
            <h1 className="text-xl font-black text-white">{appName}</h1>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              {appSubtitle || 'Sign in with your hotel staff account to continue.'}
            </p>
          </div>

          {booting ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12" data-testid="staff-session-check">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-amber-400" />
              <div className="text-xs font-semibold text-slate-400">Verifying staff session…</div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5" data-testid="staff-login-form">
              {error && (
                <div
                  role="alert"
                  data-testid="staff-login-error"
                  className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2.5 text-xs font-semibold leading-relaxed text-rose-200"
                >
                  {error}
                </div>
              )}

              <label className="block">
                <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {requireHotel ? 'Staff Email' : 'Platform Email'}
                </span>
                <input
                  data-testid="staff-login-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@hotel.com"
                  className={`w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 text-sm text-white outline-none transition focus:ring-2 ${palette.ring}`}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-400">
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
                    className={`w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 pr-16 text-sm text-white outline-none transition focus:ring-2 ${palette.ring}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-400 transition hover:bg-slate-800 hover:text-white"
                  >
                    {showPassword ? 'HIDE' : 'SHOW'}
                  </button>
                </div>
              </label>

              {requireHotel && (
                <label className="block">
                  <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Hotel Code <span className="font-medium normal-case tracking-normal text-slate-500">(optional)</span>
                  </span>
                  <input
                    data-testid="staff-login-hotel-slug"
                    type="text"
                    value={hotelSlug}
                    onChange={(event) => setHotelSlug(event.target.value)}
                    placeholder="e.g. taj-gateway"
                    className={`w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 text-sm text-white outline-none transition focus:ring-2 ${palette.ring}`}
                  />
                </label>
              )}

              <button
                data-testid="staff-login-submit"
                type="submit"
                disabled={submitting}
                className={`mt-1 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition disabled:cursor-wait disabled:opacity-60 ${palette.button}`}
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Signing in…
                  </>
                ) : requireHotel ? (
                  'Sign In to Terminal'
                ) : (
                  'Sign In to Control Plane'
                )}
              </button>
            </form>
          )}

          <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-3 text-[10px] font-semibold text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              {online
                ? requireHotel
                  ? 'Tenant-scoped JWT session'
                  : 'Global platform JWT session'
                : 'Offline — reconnect to sign in'}
            </span>
            <span>Session expires in 1 hour</span>
          </div>
        </div>

        <p className="mt-4 text-center text-[10px] leading-relaxed text-slate-600">
          {requireHotel
            ? 'Access is logged and tenant-scoped. Contact your hotel administrator if you cannot sign in.'
            : 'Platform access is audited. Contact the SpiceHub platform owner if you cannot sign in.'}
        </p>
      </div>
    </div>
  );
};
