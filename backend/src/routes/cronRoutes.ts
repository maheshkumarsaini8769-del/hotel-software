import { Router } from 'express';
import { handleSocketKeepAliveCron, getCronStatus } from '../controllers/cronController';

const router = Router();

// 1-minute keepalive endpoint for Vercel Cron
router.get('/socket-keepalive', handleSocketKeepAliveCron);
router.post('/socket-keepalive', handleSocketKeepAliveCron);

// Cron status & telemetry
router.get('/status', getCronStatus);

export default router;
