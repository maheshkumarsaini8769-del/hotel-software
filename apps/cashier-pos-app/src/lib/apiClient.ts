import { SpiceHubClient } from '@spicehub/api-client';
import { API_ORIGIN } from '../config/api';

const client = new SpiceHubClient({ baseUrl: API_ORIGIN });

/**
 * Shared cashier API client with the latest persisted staff JWT and tenant
 * context. Components must use this instead of constructing a client against
 * window.location.origin (which caused 401s and hit the static portal host).
 */
export function getApiClient(): SpiceHubClient {
  if (typeof window !== 'undefined') {
    client.setAuthToken(
      window.localStorage.getItem('spicehub_token') ||
        window.localStorage.getItem('token') ||
        null
    );
    client.setHotelId(
      window.localStorage.getItem('spicehub_hotel_id') ||
        window.localStorage.getItem('hotelId') ||
        null
    );
  }
  return client;
}
