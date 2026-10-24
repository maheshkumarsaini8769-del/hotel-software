import { env } from './env';

/** Backend origin. Empty means same-origin (Vite preview proxy / production gateway). */
export const API_ORIGIN = env.apiOrigin;

/** Fully-qualified API prefix used by fetch/axios calls. */
export const API_BASE_URL = env.apiBaseUrl;

/** Socket.IO origin. */
export const SOCKET_URL = env.socketUrl;

export const API_TIMEOUT_MS = env.apiTimeoutMs;

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
