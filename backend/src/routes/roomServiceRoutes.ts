import { Router } from 'express';
import {
  resolvePermanentRoomQR,
  restoreLastPageSession,
  placeRoomServiceOrder,
  getLiveRoomOrders,
  createGuestConciergeRequest,
  getGuestFolioSummary,
  requestExpressCheckout,
} from '../controllers/roomServiceController';

const router = Router();

// In-Room Guest Portal Routes
router.get('/qr/resolve', resolvePermanentRoomQR);
router.post('/session/restore', restoreLastPageSession);
router.post('/orders/place', placeRoomServiceOrder);
router.get('/orders/live', getLiveRoomOrders);
router.post('/requests/concierge', createGuestConciergeRequest);
router.get('/folio/summary', getGuestFolioSummary);
router.post('/checkout/express-request', requestExpressCheckout);

export default router;

