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
  getGuestPortalPreferences,
  updateGuestPortalPreferences,
  getGuestFolioSummary,
  settleGuestFolio,
  requestExpressCheckout,
  rotateRoomGuestQr,
  getGuestRoomCatalog,
  bookAndCheckInGuest,
  approveGuestCheckIn,
  rejectGuestCheckIn,
  cancelGuestBooking,
  sendGuestPhoneOtp,
  verifyGuestPhoneOtp,
  getBookingStatus,
  recalculateDynamicCheckoutBill,
  updateOrderWaiterEta,
  extendStayDates,
} from '../controllers/roomServiceController';
import { authenticateJWT, requireTenant } from '../middlewares/auth';
import { requireTenantCapability } from '../middlewares/requireTenantCapability';

const router = Router();

// In-Room Guest Portal Routes
router.get('/rooms/catalog', requireTenantCapability('roomBooking'), getGuestRoomCatalog);
router.post('/rooms/book-and-checkin', requireTenantCapability('roomBooking'), bookAndCheckInGuest);
// SECURITY: check-in approval mutates inventory + creates a folio, so it must be
// a staff-only operation. The reception front-desk app sends a staff JWT here.
router.post('/rooms/approve-checkin', authenticateJWT, requireTenant, requireTenantCapability('reception'), approveGuestCheckIn);
router.post('/rooms/reject-checkin', authenticateJWT, requireTenant, requireTenantCapability('reception'), rejectGuestCheckIn);
router.post('/rooms/cancel-booking', requireTenantCapability('roomBooking'), cancelGuestBooking);
router.post('/rooms/send-phone-otp', requireTenantCapability('roomBooking'), sendGuestPhoneOtp);
router.post('/rooms/verify-phone-otp', requireTenantCapability('roomBooking'), verifyGuestPhoneOtp);
router.get('/rooms/booking-status/:bookingNumber', requireTenantCapability('roomBooking'), getBookingStatus);
router.post('/stay/recalculate-checkout-bill', requireTenantCapability('inRoomServices'), recalculateDynamicCheckoutBill);
router.post('/orders/:orderId/waiter-eta', requireTenantCapability('waiterDispatch'), updateOrderWaiterEta);
router.post('/stay/extend-dates', requireTenantCapability('inRoomServices'), extendStayDates);
router.get('/qr/resolve', requireTenantCapability('inRoomServices'), resolvePermanentRoomQR);
router.post('/stay/verify-resident', requireTenantCapability('inRoomServices'), verifyResidentStay);
router.post('/session/restore', requireTenantCapability('inRoomServices'), restoreLastPageSession);
router.get('/stay/status', requireTenantCapability('inRoomServices'), getGuestStayStatus);
router.get('/preferences', requireTenantCapability('inRoomServices'), getGuestPortalPreferences);
router.put('/preferences', requireTenantCapability('inRoomServices'), updateGuestPortalPreferences);
router.post('/orders/place', requireTenantCapability('inRoomServices'), placeRoomServiceOrder);
router.get('/orders/live', requireTenantCapability('inRoomServices'), getLiveRoomOrders);
router.post('/requests/concierge', requireTenantCapability('inRoomServices'), createGuestConciergeRequest);
router.get('/requests/live', requireTenantCapability('inRoomServices'), getGuestConciergeRequests);
router.get('/folio/summary', requireTenantCapability('inRoomServices'), getGuestFolioSummary);
router.post('/folio/settle', requireTenantCapability('inRoomServices'), settleGuestFolio);
router.post('/checkout/express-request', requireTenantCapability('inRoomServices'), requestExpressCheckout);

// Staff-only QR provisioning for physical rooms.
router.post('/admin/rooms/:roomId/rotate-qr', authenticateJWT, requireTenant, rotateRoomGuestQr);

export default router;
