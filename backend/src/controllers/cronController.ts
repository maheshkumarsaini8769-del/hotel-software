import { Request, Response } from 'express';
import { pingSocketServer, getKeepAliveStats, getSocketServerUrl } from '../services/socketKeepAliveService';

/**
 * GET /api/v1/cron/socket-keepalive
 * Endpoint triggered every 1 minute by Vercel Cron or uptime monitors
 */
export const handleSocketKeepAliveCron = async (req: Request, res: Response): Promise<void> => {
  const caller = req.headers['user-agent']?.includes('vercel-cron')
    ? 'vercel-cron-job'
    : req.query.source?.toString() || 'external-cron-trigger';

  const result = await pingSocketServer(caller);
  const currentStats = getKeepAliveStats();

  res.status(result.success ? 200 : 502).json({
    success: result.success,
    message: result.success
      ? 'Render Socket.IO keepalive ping succeeded'
      : `Failed to ping Render Socket.IO server: ${result.error}`,
    socketUrl: getSocketServerUrl(),
    pingResult: result,
    stats: currentStats,
    timestamp: new Date().toISOString(),
  });
};

/**
 * GET /api/v1/cron/status
 * Telemetry endpoint to view keepalive ping metrics
 */
export const getCronStatus = async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    service: 'spicehub-cron-manager',
    socketUrl: getSocketServerUrl(),
    stats: getKeepAliveStats(),
    timestamp: new Date().toISOString(),
  });
};
