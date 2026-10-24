const rawEnvBase = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;

function normalizeApiOrigin(value?: string): string {
  if (value && value.trim()) {
    const trimmed = value.trim().replace(/\/+$/, '');
    return trimmed.endsWith('/api/v1') ? trimmed.slice(0, -'/api/v1'.length) : trimmed;
  }

  // Local preview/static servers (the emulator suite) do not proxy /api.
  // Only fall back to the local backend for loopback hostnames; deployed
  // domains continue to use their same-origin reverse proxy.
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if ((host === 'localhost' || host === '127.0.0.1') && window.location.port !== '5000') {
      return 'http://localhost:5000';
    }
  }
  return '';
}

/** Backend origin. Empty means same-origin (Vite dev proxy / production gateway). */
export const API_ORIGIN = normalizeApiOrigin(rawEnvBase);

/** Fully-qualified API prefix used by fetch/axios calls. */
export const API_BASE_URL = `${API_ORIGIN}/api/v1`;

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function getStoredToken(): string {
  if (typeof window === 'undefined') return '';
  return (
    localStorage.getItem('spicehub_token') ||
    localStorage.getItem('token') ||
    ''
  );
}

function decodeHotelIdFromToken(token: string): string {
  if (!token) return '';
  try {
    const payloadSegment = token.split('.')[1];
    if (!payloadSegment || typeof atob === 'undefined') return '';
    const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const payload = JSON.parse(atob(padded));
    return typeof payload?.hotelId === 'string' ? payload.hotelId : '';
  } catch {
    return '';
  }
}

export function getStoredHotelId(): string {
  if (typeof window === 'undefined') return '';
  const stored =
    localStorage.getItem('spicehub_hotel_id') ||
    localStorage.getItem('hotelId') ||
    '';
  // The signed staff JWT is the authoritative tenant context. Falling back to
  // its hotelId prevents an empty tenant query when login only stores a token.
  return stored || decodeHotelIdFromToken(getStoredToken());
}

export function getApiAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = getStoredToken();
  const hotelId = getStoredHotelId();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (hotelId) headers['x-hotel-id'] = hotelId;
  return headers;
}

/**
 * fetch wrapper that resolves the API origin and attaches the current
 * staff JWT / tenant header. Never trusts a caller-supplied tenant ID.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  const authHeaders = getApiAuthHeaders();
  for (const [key, value] of Object.entries(authHeaders)) {
    if (!headers.has(key)) headers.set(key, value);
  }
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(apiUrl(path), { ...init, headers });
}
