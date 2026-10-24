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

export function getPortalUrl(portal: PortalKey, path = ''): string {
  const configured = ENV_URLS[portal]?.trim();
  const origin = configured
    ? trimTrailingSlash(configured)
    : typeof window !== 'undefined' && isLoopbackHost(window.location.hostname)
      ? `http://localhost:${LOCAL_PORTS[portal]}`
      : typeof window !== 'undefined'
        ? window.location.origin
        : '';

  if (!origin) return path || '#';
  if (!path) return origin;
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}
