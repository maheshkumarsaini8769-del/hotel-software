const ACCESS_TOKEN_KEY = 'spicehub_hotel_access_token';
const ACCESS_HOTEL_KEY = 'spicehub_hotel_access_hotel';

export interface VerifiedHotelAccess {
  accessToken: string;
  hotel: {
    id: string;
    name: string;
    slug?: string;
    city?: string;
    state?: string;
    enabledPortals?: string[];
  };
}

export function normalizeHotelAccessCode(code: string): string {
  return String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function isValidHotelAccessCode(code: string): boolean {
  const normalized = normalizeHotelAccessCode(code);
  return /^[A-Z0-9_-]{3,30}$/.test(normalized);
}

export function readHotelAccessToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    return (
      window.localStorage.getItem(ACCESS_TOKEN_KEY) ||
      window.sessionStorage.getItem(ACCESS_TOKEN_KEY) ||
      ''
    );
  } catch {
    return '';
  }
}

export function readHotelAccessHotelId(): string {
  if (typeof window === 'undefined') return '';
  try {
    return (
      window.localStorage.getItem(ACCESS_HOTEL_KEY) ||
      window.sessionStorage.getItem(ACCESS_HOTEL_KEY) ||
      ''
    );
  } catch {
    return '';
  }
}

export function storeHotelAccessToken(accessToken: string, hotelId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    window.localStorage.setItem(ACCESS_HOTEL_KEY, hotelId);
    window.sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    window.sessionStorage.setItem(ACCESS_HOTEL_KEY, hotelId);
  } catch {
    // Session/local storage can be unavailable in hardened browsers; the token is
    // then only held in memory for the current sign-in.
  }
}

export function clearHotelAccessToken(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(ACCESS_HOTEL_KEY);
    window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    window.sessionStorage.removeItem(ACCESS_HOTEL_KEY);
  } catch {
    // Ignore storage failures.
  }
}

/**
 * Verifies a Hotel Admin issued staff code and keeps the short-lived scoped
 * token in session storage. The token only authorises this hotel's roster and
 * PIN sign-in; it is not a staff session.
 */
export async function verifyHotelAccessCode(
  apiBaseUrl: string,
  code: string
): Promise<VerifiedHotelAccess> {
  const base = apiBaseUrl.replace(/\/+$/, '');
  const response = await fetch(`${base}/auth/staff-hotel-code/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ code: normalizeHotelAccessCode(code) }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success || !body?.data?.accessToken || !body?.data?.hotel?.id) {
    const error = new Error(
      body?.message || 'The hotel code is invalid or has expired. Ask your Hotel Admin for the current code.'
    );
    Object.assign(error, { code: body?.errorCode, status: response.status });
    throw error;
  }
  const accessToken = String(body.data.accessToken);
  const hotelId = String(body.data.hotel.id);
  storeHotelAccessToken(accessToken, hotelId);
  return { accessToken, hotel: { ...body.data.hotel, id: hotelId } };
}

/**
 * Directly selects an active property and obtains a signed access token.
 */
export async function selectHotelDirect(
  apiBaseUrl: string,
  hotelId: string
): Promise<VerifiedHotelAccess> {
  const base = apiBaseUrl.replace(/\/+$/, '');
  const response = await fetch(`${base}/auth/active-hotels/select`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ hotelId }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success || !body?.data?.accessToken || !body?.data?.hotel?.id) {
    const error = new Error(body?.message || 'Could not verify property access.');
    Object.assign(error, { code: body?.errorCode, status: response.status });
    throw error;
  }
  const accessToken = String(body.data.accessToken);
  const targetHotelId = String(body.data.hotel.id);
  storeHotelAccessToken(accessToken, targetHotelId);
  return { accessToken, hotel: { ...body.data.hotel, id: targetHotelId } };
}

