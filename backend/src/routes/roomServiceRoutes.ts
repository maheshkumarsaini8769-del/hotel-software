import { Router } from 'express';
import {
  resolvePermanentRoomQR,
  verifyResidentStay,
  restoreLastPageSession,
  placeRoomServiceOrder,
  getLiveRoomOrders,
  createGuestConciergeRequest,
  getGuestConciergeRequests,
  getGuestStayStatus,
  getGuestFolioSummary,
  settleGuestFolio,
  requestExpressCheckout,
  rotateRoomGuestQr,
  getGuestRoomCatalog,
  bookAndCheckInGuest,
  extendStayDates,
} from '../controllers/roomServiceController';
import { authenticateJWT, requireTenant } from '../middlewares/auth';

const router = Router();

// In-Room Guest Portal Routes
router.get('/rooms/catalog', getGuestRoomCatalog);
router.post('/rooms/book-and-checkin', bookAndCheckInGuest);
router.post('/stay/extend-dates', extendStayDates);
router.get('/qr/resolve', resolvePermanentRoomQR);
router.post('/stay/verify-resident', verifyResidentStay);
router.post('/session/restore', restoreLastPageSession);
router.get('/stay/status', getGuestStayStatus);
router.post('/orders/place', placeRoomServiceOrder);
router.get('/orders/live', getLiveRoomOrders);
router.post('/requests/concierge', createGuestConciergeRequest);
router.get('/requests/live', getGuestConciergeRequests);
router.get('/folio/summary', getGuestFolioSummary);
router.post('/folio/settle', settleGuestFolio);
router.post('/checkout/express-request', requestExpressCheckout);

// Staff-only QR provisioning for physical rooms.
router.post('/admin/rooms/:roomId/rotate-qr', authenticateJWT, requireTenant, rotateRoomGuestQr);

export default router;

