import { SpiceHubClient } from '@spicehub/api-client';
import { API_ORIGIN, getStoredHotelId, getStoredToken } from '../config/api';

const client = new SpiceHubClient({ baseUrl: API_ORIGIN });

/** Returns the shared client with the latest persisted staff/tenant context. */
export function getApiClient(): SpiceHubClient {
  client.setAuthToken(getStoredToken() || null);
  client.setHotelId(getStoredHotelId() || null);
  return client;
}
