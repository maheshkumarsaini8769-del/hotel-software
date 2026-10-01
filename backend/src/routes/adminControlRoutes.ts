import { Router } from 'express';
import {
  getHotelTelemetry,
  getNotificationPreferences,
  updateNotificationPreferences,
  dispatchAdminAlert,
  getAlertsFeed,
  acknowledgeAlert,
  resolveAlert,
  getSwitchboardSummary,
} from '../controllers/adminControlController';
import { authenticateJWT, requireTenant } from '../middlewares/auth';

const router = Router();

// Multi-tenant auth isolation
router.use(authenticateJWT, requireTenant);

// Omniscient Telemetry Pulse
router.get('/telemetry', getHotelTelemetry);

// Custom Notification Subscription Switchboard
router.get('/notification-preferences', getNotificationPreferences);
router.put('/notification-preferences', updateNotificationPreferences);
router.get('/switchboard-summary', getSwitchboardSummary);

// Event Dispatch & Alert Feed
router.post('/dispatch-alert', dispatchAdminAlert);
router.get('/alerts-feed', getAlertsFeed);
router.put('/alerts/:alertId/acknowledge', acknowledgeAlert);
router.put('/alerts/:alertId/resolve', resolveAlert);

export default router;
