import { API_BASE_URL } from './config';
import type { ActiveHotel, StaffLoginResponse, StaffProfile, StaffRole } from './types';

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  errorCode?: string;
  data?: T;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new Error('Unable to connect to the hotel server. Check your connection and try again.');
  }

  let body: ApiEnvelope<T> | null = null;
  try {
    body = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new Error(`The hotel server returned an unreadable response (${response.status}).`);
  }

  if (!response.ok || !body?.success || body.data === undefined) {
    const error = new Error(body?.message || `Request failed (${response.status}).`);
    Object.assign(error, { code: body?.errorCode, status: response.status });
    throw error;
  }

  return body.data;
}

export async function fetchActiveHotels(signal?: AbortSignal): Promise<ActiveHotel[]> {
  const data = await request<ActiveHotel[]>('/auth/active-hotels', { signal });
  if (!Array.isArray(data)) throw new Error('The hotel server returned an invalid hotel list.');
  return data.map((hotel) => ({
    ...hotel,
    id: String(hotel.id),
    name: String(hotel.name || 'Hotel'),
    city: String(hotel.city || ''),
    enabledPortals: Array.isArray(hotel.enabledPortals) ? hotel.enabledPortals : [],
  }));
}

export async function fetchStaffRoster(
  hotelId: string,
  portal: string,
  signal?: AbortSignal,
): Promise<StaffProfile[]> {
  const data = await request<StaffProfile[]>(
    `/auth/hotels/${encodeURIComponent(hotelId)}/staff-roster?portal=${encodeURIComponent(portal)}`,
    { signal },
  );
  if (!Array.isArray(data)) throw new Error('The hotel server returned an invalid staff list.');
  return data.map((staff) => ({
    ...staff,
    id: String(staff.id),
    name: String(staff.name || 'Staff member'),
    role: String(staff.role || ''),
    shift: String(staff.shift || ''),
    avatar: String(staff.avatar || ''),
    hasPin: Boolean(staff.hasPin),
    pinApprovedByAdmin: staff.pinApprovedByAdmin !== false,
    pinStatus: staff.pinStatus || (staff.hasPin ? 'ACTIVE' : 'NONE'),
  }));
}

export async function loginWithStaffPin(
  staffId: string,
  hotelId: string,
  role: StaffRole,
  pin: string,
): Promise<StaffLoginResponse> {
  return request<StaffLoginResponse>('/auth/staff-pin-login', {
    method: 'POST',
    body: JSON.stringify({ staffId, hotelId, portal: role, pin }),
  });
}

export function getStaffLoginError(error: unknown): { message: string; invalidPin: boolean } {
  if (error instanceof Error) {
    const code = (error as Error & { code?: string }).code;
    if (code === 'INVALID_CREDENTIALS') {
      return { message: 'Invalid PIN. Try again.', invalidPin: true };
    }
    return { message: error.message, invalidPin: false };
  }
  return { message: 'Staff sign-in failed. Please try again.', invalidPin: false };
}
