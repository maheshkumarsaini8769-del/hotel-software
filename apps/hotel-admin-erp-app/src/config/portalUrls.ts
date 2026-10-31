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

export function getPortalUrl(portal: PortalKey, path = '', overrideHost?: string): string {
  const configured = ENV_URLS[portal]?.trim();
  if (configured) {
    const origin = trimTrailingSlash(configured);
    if (!path) return origin;
    return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
  }

  // 1. If an override host is explicitly supplied (e.g. from QR Center selector)
  if (overrideHost && overrideHost.trim()) {
    const cleanHost = overrideHost.trim();
    const port = LOCAL_PORTS[portal];
    const origin = cleanHost.startsWith('http://') || cleanHost.startsWith('https://')
      ? trimTrailingSlash(cleanHost)
      : `http://${cleanHost}:${port}`;
    if (!path) return origin;
    return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
  }

  // 2. Check localStorage for persistent QR host selection
  const storedQrHost = typeof window !== 'undefined' ? localStorage.getItem('spicehub_qr_host') : null;
  if (storedQrHost && storedQrHost.trim()) {
    const cleanHost = storedQrHost.trim();
    const port = LOCAL_PORTS[portal];
    const origin = cleanHost.startsWith('http://') || cleanHost.startsWith('https://')
      ? trimTrailingSlash(cleanHost)
      : `http://${cleanHost}:${port}`;
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
