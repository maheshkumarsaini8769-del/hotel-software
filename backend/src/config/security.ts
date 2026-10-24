/**
 * Central security configuration helpers.
 *
 * Rules:
 *  - Development convenience auth bypass is OPT-IN via DEV_AUTH_BYPASS=true.
 *  - The bypass is hard-disabled in production, regardless of env values.
 *  - Production boot fails fast when critical secrets are missing.
 */

const DEV_FALLBACK_JWT_SECRET = 'spicehub_local_dev_jwt_secret_do_not_use_in_production';
const DEV_FALLBACK_MANAGER_PIN = '9921';

export const isProduction = (): boolean => process.env.NODE_ENV === 'production';

export const isDevAuthBypassEnabled = (): boolean => {
  if (isProduction()) return false;
  if (process.env.NODE_ENV === 'test') return false;
  return process.env.DEV_AUTH_BYPASS === 'true';
};

/**
 * Demo data may only be auto-created in local development (explicit opt-in)
 * or in the isolated automated test environment. Never in production.
 */
export const isDemoDataSeedingEnabled = (): boolean =>
  isDevAuthBypassEnabled() || process.env.NODE_ENV === 'test';

export const getJwtSecret = (): string => {
  const configured = process.env.JWT_SECRET?.trim();
  if (configured) return configured;

  if (isProduction()) {
    throw new Error('[Security] JWT_SECRET is required in production');
  }

  return DEV_FALLBACK_JWT_SECRET;
};

/**
 * Master approval PIN used by manager override / safe-deposit flows.
 * Returns null in production when not configured so the caller can reject.
 */
export const getManagerSecurityPin = (): string | null => {
  const configured = process.env.MANAGER_SECURITY_PIN?.trim();
  if (configured) return configured;

  if (isProduction()) return null;
  return DEV_FALLBACK_MANAGER_PIN;
};

/**
 * Called once during server startup. Fails closed in production when
 * security-critical configuration is missing or unsafe.
 */
export const assertProductionSecurityConfig = (): void => {
  if (!isProduction()) return;

  const missing: string[] = [];
  if (!process.env.JWT_SECRET?.trim()) missing.push('JWT_SECRET');
  if (!process.env.MANAGER_SECURITY_PIN?.trim()) missing.push('MANAGER_SECURITY_PIN');

  if (missing.length > 0) {
    throw new Error(
      `[Security] Missing required production environment variables: ${missing.join(', ')}`
    );
  }

  if ((process.env.JWT_SECRET?.trim().length || 0) < 32) {
    throw new Error('[Security] JWT_SECRET must be at least 32 characters in production');
  }

  if (process.env.DEV_AUTH_BYPASS === 'true') {
    throw new Error('[Security] DEV_AUTH_BYPASS must not be enabled in production');
  }

  const managerPin = process.env.MANAGER_SECURITY_PIN?.trim() || '';
  const weakManagerPins = new Set(['9921', '9999', '1234', '0000', '1111', '2222', '2580']);
  if (weakManagerPins.has(managerPin) || !/^\d{4,8}$/.test(managerPin)) {
    throw new Error(
      '[Security] MANAGER_SECURITY_PIN must be a 4-8 digit non-default PIN in production'
    );
  }
};
