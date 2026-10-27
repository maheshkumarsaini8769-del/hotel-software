/**
 * Central runtime configuration for SpiceHub frontend applications.
 *
 * Vite exposes variables prefixed with VITE_ at build time. When no explicit
 * API URL is configured, loopback development uses the local backend and
 * deployed builds use the same origin (the recommended reverse-proxy setup).
 */

type PortalKey =
  | 'customer'
  | 'waiter'
  | 'kds'
  | 'guest'
  | 'admin'
  | 'cashier'
  | 'reception'
  | 'superadmin';

const rawEnv = ((import.meta as any).env || {}) as Record<string, string | undefined>;

const LOCAL_PORTS: Record<PortalKey, number> = {
  customer: 3001,
  waiter: 3002,
  kds: 3003,
  guest: 3004,
  admin: 3005,
  superadmin: 3006,
  cashier: 3007,
  reception: 3008,
};

function readString(key: string, fallback = ''): string {
  const value = rawEnv[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function readNumber(key: string, fallback: number): number {
  const value = Number(rawEnv[key]);
  return Number.isFinite(value) ? value : fallback;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

const browserHost = typeof window !== 'undefined' ? window.location.hostname : '';
const browserOrigin = typeof window !== 'undefined' ? window.location.origin : '';

function normalizeApiOrigin(value?: string): string {
  if (!value || !value.trim()) return '';
  const trimmed = trimTrailingSlash(value.trim());
  return trimmed.endsWith('/api/v1') ? trimmed.slice(0, -'/api/v1'.length) : trimmed;
}

const configuredApiOrigin = normalizeApiOrigin(readString('VITE_API_BASE_URL'));
// On LAN IP (e.g. 10.208.156.216 or 192.168.x.x), fallback to port 5000 on that same host so API calls don't collapse to ''
const fallbackApiOrigin = isLoopbackHost(browserHost)
  ? 'http://localhost:5000'
  : (browserHost ? `http://${browserHost}:5000` : 'http://localhost:5000');

const apiOrigin = configuredApiOrigin || fallbackApiOrigin;

const configuredSocketUrl = trimTrailingSlash(readString('VITE_SOCKET_URL'));
const socketUrl = configuredSocketUrl || fallbackApiOrigin;

function resolvePortalUrl(portal: PortalKey): string {
  const upper = portal.toUpperCase();
  const configured =
    readString(`VITE_PORTAL_${upper}_URL`) || readString(`VITE_PORTAL_${upper}`);
  if (configured) return trimTrailingSlash(configured);

  const targetHost = browserHost || 'localhost';
  return `http://${targetHost}:${LOCAL_PORTS[portal]}`;
}

export function getPortalUrl(portal: PortalKey, path = ''): string {
  const origin = resolvePortalUrl(portal);
  if (!origin) return path || '#';
  if (!path) return origin;
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

export const env = {
  apiOrigin,
  apiBaseUrl: `${apiOrigin}/api/v1`,
  apiTimeoutMs: readNumber('VITE_API_TIMEOUT_MS', 15000),
  socketUrl,
  hotelId: readString('VITE_HOTEL_ID'),
  hotelName: readString('VITE_HOTEL_NAME', 'SpiceHub Hotel'),
  enablePwa: readString('VITE_ENABLE_PWA') === 'true',
  enableDebugLogs: readString('VITE_ENABLE_DEBUG_LOGS') === 'true',
} as const;
