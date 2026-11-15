import crypto from 'crypto';
import { Request } from 'express';

interface WebhookSecurityOptions {
  /** Environment variable that stores the shared secret. */
  envKey: string;
  /** Development/test fallback. Never used in production. */
  devFallback: string;
  /** Headers that may carry the raw shared secret. */
  secretHeaders?: string[];
  /** Headers that may carry an HMAC-SHA256 signature of the request body. */
  signatureHeaders?: string[];
  /** Optional test-only bypass header (ignored in production). */
  mockHeader?: string;
}

const safeEqual = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

export const getWebhookSecret = (envKey: string, devFallback: string): string | null => {
  const configured = process.env[envKey]?.trim();
  if (configured) return configured;

  // Fail closed in production: a missing webhook secret must never fall back
  // to a value that is committed to the repository.
  if (process.env.NODE_ENV === 'production') return null;
  return devFallback;
};

/**
 * Verifies an inbound webhook using either a shared secret header or an
 * HMAC-SHA256 signature of the JSON body.
 */
export const isWebhookAuthorized = (
  req: Request,
  {
    envKey,
    devFallback,
    secretHeaders = ['x-webhook-secret'],
    signatureHeaders = ['x-ota-signature', 'x-hub-signature-256'],
    mockHeader,
  }: WebhookSecurityOptions
): boolean => {
  const secret = getWebhookSecret(envKey, devFallback);
  if (!secret) return false;

  for (const header of secretHeaders) {
    const provided = String(req.headers[header] || '').trim();
    if (provided && safeEqual(provided, secret)) return true;
  }

  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
  const expectedSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  for (const header of signatureHeaders) {
    const rawSignature = String(req.headers[header] || '').trim();
    if (!rawSignature) continue;
    const providedSignature = rawSignature.replace(/^sha256=/, '');
    if (safeEqual(providedSignature, expectedSignature)) return true;
  }

  if (mockHeader && process.env.NODE_ENV !== 'production' && req.headers[mockHeader] === 'true') {
    return true;
  }

  return false;
};
