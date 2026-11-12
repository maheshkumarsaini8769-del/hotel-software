/**
 * Central resolver for links that leave the Hotel Admin ERP and open a sibling
 * SpiceHub portal. Production deployments should set the matching
 * VITE_PORTAL_<NAME>_URL environment variables (for example
 * VITE_PORTAL_KDS_URL=https://kds.spicehub.example).
 *
 * For local development/emulator runs we keep the familiar :3001-:3008
 * ports. Deployed builds never fall back to localhost: if no explicit URL is
 * configured they stay on the current origin instead of pointing at the
 * operator's machine.
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

const ENV_URLS: Record<PortalKey, string | undefined> = {
  customer: (import.meta as any).env?.VITE_PORTAL_CUSTOMER_URL,
  waiter: (import.meta as any).env?.VITE_PORTAL_WAITER_URL,
  kds: (import.meta as any).env?.VITE_PORTAL_KDS_URL,
  guest: (import.meta as any).env?.VITE_PORTAL_GUEST_URL,
  admin: (import.meta as any).env?.VITE_PORTAL_ADMIN_URL,
  cashier: (import.meta as any).env?.VITE_PORTAL_CASHIER_URL,
  reception: (import.meta as any).env?.VITE_PORTAL_RECEPTION_URL,
  superadmin: (import.meta as any).env?.VITE_PORTAL_SUPERADMIN_URL,
};

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

export async function fetchServerLanIp(): Promise<string> {
  if (typeof window === 'undefined') return '10.65.226.216';
  try {
    const res = await fetch('/api/v1/system/network-info');
    if (res.ok) {
      const data = await res.json();
      if (data?.lanIp) {
        localStorage.setItem('spicehub_lan_ip', data.lanIp);
        return data.lanIp;
      }
    }
  } catch {}
  return localStorage.getItem('spicehub_lan_ip') || '10.65.226.216';
}

/**
 * Sentinel QR host meaning "the deployed https portal". Only the hosted origin
 * can match the Android App Link / intent hand-off, so printed standees must
 * use it instead of a Wi-Fi IP.
 */
export const LIVE_QR_HOST = 'live';

const LIVE_CUSTOMER_PORTAL_URL = 'https://spicehub-customer-table.vercel.app';
const LIVE_GUEST_PORTAL_URL = 'https://spicehub-guest-portal.vercel.app';

const LIVE_PORTAL_URLS: Partial<Record<PortalKey, string>> = {
  customer: LIVE_CUSTOMER_PORTAL_URL,
  guest: LIVE_GUEST_PORTAL_URL,
};

export function isLiveQrHost(host?: string | null): boolean {
  return (host || '').trim().toLowerCase() === LIVE_QR_HOST;
}

/** Direct .apk download link for the QR standee. The LAN backend serves it at
 *  :5000, while the live-host mode points at the production download endpoint. */
export function getApkDownloadUrl(overrideHost?: string): string {
  const configured = (import.meta as any).env?.VITE_APK_DOWNLOAD_URL?.trim();
  if (configured) return trimTrailingSlash(configured);
  if (isLiveQrHost(overrideHost)) {
    return 'https://spicehub-backend.vercel.app/download/customer-apk';
  }
  const stored = typeof window !== 'undefined' ? localStorage.getItem('spicehub_qr_host') : null;
  const host = overrideHost?.trim() || stored || 'localhost';
  if (host.startsWith('http://') || host.startsWith('https://')) return trimTrailingSlash(host);
  return `http://${host}:5000/download/customer-apk`;
}

function resolveOrigin(portal: PortalKey, host: string): string {
  const cleanHost = trimTrailingSlash(host.trim());
  if (cleanHost.startsWith('http://') || cleanHost.startsWith('https://')) return cleanHost;
  return `http://${cleanHost}:${LOCAL_PORTS[portal]}`;
}

export function getPortalUrl(portal: PortalKey, path = '', overrideHost?: string): string {
  const configured = ENV_URLS[portal]?.trim();

  // A live-host QR always prefers the deployed portal, which is the only origin
  // the installed app can intercept.
  const liveOrigin = LIVE_PORTAL_URLS[portal];
  if (isLiveQrHost(overrideHost) && liveOrigin) {
    const origin = trimTrailingSlash(liveOrigin);
    if (!path) return origin;
    return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
  }

  if (configured) {
    const origin = trimTrailingSlash(configured);
    if (!path) return origin;
    return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
  }

  // 1. If an override host is explicitly supplied (e.g. from QR Center selector)
  if (overrideHost && overrideHost.trim()) {
    const origin = resolveOrigin(portal, overrideHost);
    if (!path) return origin;
    return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
  }

  // 2. Check localStorage for persistent QR host selection
  const storedQrHost = typeof window !== 'undefined' ? localStorage.getItem('spicehub_qr_host') : null;
  if (storedQrHost && storedQrHost.trim()) {
    const origin = resolveOrigin(portal, storedQrHost);
    if (!path) return origin;
    return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
  }

  // 3. If running on a LAN IP directly (e.g. 10.65.226.216 or 192.168.x.x)
  if (typeof window !== 'undefined' && window.location.hostname && !isLoopbackHost(window.location.hostname)) {
    const origin = `http://${window.location.hostname}:${LOCAL_PORTS[portal]}`;
    if (!path) return origin;
    return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
  }

  // 4. If running on loopback, check if cached LAN IP exists so phone QR scans work
  const cachedLanIp = typeof window !== 'undefined' ? localStorage.getItem('spicehub_lan_ip') : null;
  const targetHost = cachedLanIp || (typeof window !== 'undefined' ? window.location.hostname : 'localhost');
  const origin = `http://${targetHost}:${LOCAL_PORTS[portal]}`;

  if (!origin) return path || '#';
  if (!path) return origin;
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}
