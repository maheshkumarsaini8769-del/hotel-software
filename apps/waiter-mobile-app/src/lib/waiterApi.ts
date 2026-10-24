/**
 * Authenticated fetch for the waiter floor terminal.
 *
 * The waiter authenticates with the staff PIN (server verified) and receives a
 * short-lived JWT. Every API call carries that token plus the tenant context so
 * the same code works with the dev bypass and in production.
 */
export function getWaiterToken(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem('spicehub_token') || window.localStorage.getItem('token') || '';
}

export function getWaiterHotelId(): string {
  if (typeof window === 'undefined') return '';
  return (
    window.localStorage.getItem('spicehub_hotel_id') ||
    window.localStorage.getItem('hotelId') ||
    ''
  );
}

export function waiterFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  const token = getWaiterToken();
  const hotelId = getWaiterHotelId();

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (hotelId && !headers.has('x-hotel-id')) {
    headers.set('x-hotel-id', hotelId);
  }

  return fetch(input, { ...init, headers });
}
