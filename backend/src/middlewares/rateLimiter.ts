import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Strict Rate Limiter for Authentication & Sensitive Endpoints
 * Limits requests to max 10 requests per minute per IP to defend against brute-force attacks.
 */
export const authLoginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Max 10 requests per window per IP
  standardHeaders: true, // Return standard `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skipSuccessfulRequests: false,
  validate: { keyGeneratorIpFallback: false },
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many login attempts from this IP. Please wait 60 seconds before trying again.',
      retryAfterSeconds: 60,
    });
  },
  keyGenerator: (req: Request) => {
    // Extract real IP from headers or connection
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown-client';
  },
});
