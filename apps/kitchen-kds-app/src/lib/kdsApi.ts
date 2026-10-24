import { API_BASE_URL } from '../config/api';

/** Latest persisted staff JWT. The login gate validates it before rendering KDS. */
export function getKdsToken(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem('spicehub_token') || window.localStorage.getItem('token') || '';
}

/** Tenant selected at staff login. No hardcoded demo tenant is used. */
export function getKdsHotelId(): string {
  if (typeof window === 'undefined') return '';
  return (
    window.localStorage.getItem('spicehub_hotel_id') ||
    window.localStorage.getItem('hotelId') ||
    ''
  );
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
