import winston from 'winston';
import { Request, Response, NextFunction } from 'express';

const isProduction = process.env.NODE_ENV === 'production';

// Custom Winston formatter ensuring tenantId, timestamp, level, message are top-level JSON fields
const jsonFormatter = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  winston.format.errors({ stack: true }),
  winston.format((info) => {
    // If tenantId is not set, default to 'system'
    if (!info.tenantId) {
      info.tenantId = 'system';
    }
    return info;
  })(),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  format: jsonFormatter,
  defaultMeta: {
    service: 'spicehub-backend-engine',
  },
  transports: [
    new winston.transports.Console(),
  ],
});

/**
 * Express middleware for structured HTTP access and latency logging
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const tenantId =
    (req.headers['x-hotel-id'] as string) ||
    (req as any).hotelId ||
    (req as any).user?.hotelId ||
    'public';

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    const isError = res.statusCode >= 400;
    const isMutation = req.method !== 'GET';
    const isSlow = durationMs > 200;

    // High-throughput non-blocking filter: Always log errors, mutations, and slow requests, sample high-frequency reads
    if (isError || isMutation || isSlow || Math.random() < 0.1) {
      logger.log(logLevel, `${req.method} ${req.originalUrl} ${res.statusCode} - ${durationMs}ms`, {
        tenantId,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        durationMs,
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
      });
    }
  });

  next();
};
