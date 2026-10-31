import { API_BASE_URL } from '../config/api';

/** Latest persisted staff JWT. The login gate validates it before rendering KDS. */
export function getKdsToken(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem('spicehub_token') || window.localStorage.getItem('token') || '';
}

/** Tenant selected at staff login. Checks multiple storage keys and fallbacks. */
export function getKdsHotelId(): string {
  if (typeof window === 'undefined') return '';
  const direct =
    window.localStorage.getItem('spicehub_hotel_id') ||
    window.localStorage.getItem('hotelId') ||
    window.localStorage.getItem('x-hotel-id');
  if (direct && direct.trim()) return direct.trim();

  try {
    const userStr = window.localStorage.getItem('spicehub_auth_user');
    if (userStr) {
      const parsed = JSON.parse(userStr);
      if (parsed?.hotelId) return String(parsed.hotelId).trim();
    }
  } catch {}

  const params = new URLSearchParams(window.location.search);
  const qId = params.get('hotelId') || params.get('hotel');
  if (qId && qId.trim()) return qId.trim();

  return '';
}

/**
 * Authenticated KDS fetch. Adds the staff JWT and tenant header to every
 * request so production (bypass disabled) behaves exactly like local dev.
 */
export function kdsFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  const token = getKdsToken();
  const hotelId = getKdsHotelId();

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (hotelId && !headers.has('x-hotel-id')) {
    headers.set('x-hotel-id', hotelId);
  }

  return fetch(input, { ...init, headers });
}

export { API_BASE_URL };
