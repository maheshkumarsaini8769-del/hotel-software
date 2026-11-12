import type { StaffRole } from './types';

const localPortalPorts: Record<StaffRole, number> = {
  waiter: 3002,
  cashier: 3007,
  kds: 3003,
  reception: 3008,
};

const apiBaseSetting = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '');

export const API_BASE_URL = apiBaseSetting
  ? (apiBaseSetting.endsWith('/api/v1') ? apiBaseSetting : `${apiBaseSetting}/api/v1`)
  : import.meta.env.DEV
    ? '/api/v1'
    : `${window.location.origin}/api/v1`;

export function getPortalUrl(role: StaffRole): string {
  const envKey = `VITE_PORTAL_${role.toUpperCase()}_URL` as keyof ImportMetaEnv;
  const configuredUrl = import.meta.env[envKey]?.trim().replace(/\/+$/, '');
  if (configuredUrl) return configuredUrl;

  const { hostname, protocol } = window.location;
  const isLoopback = ['localhost', '127.0.0.1', '::1'].includes(hostname);
  if (!isLoopback) {
    throw new Error(`Set ${envKey} to the deployed ${role} portal URL before using staff sign-in.`);
  }

  return `${protocol}//${hostname}:${localPortalPorts[role]}`;
}
