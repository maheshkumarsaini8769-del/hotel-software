import { Router } from 'express';
import {
  searchAvailableRooms,
  createRoomBooking,
  receptionCheckIn,
  getCalendarMatrix,
  quickReserve,
  assignRoom,
  updateBookingStatus,
  getArrivalsBoard,
  getCheckoutPreview,
  settleAndCheckOut,
  voidKeycard,
  getKeycardVoidAudits,
  lockFolio,
  unlockFolio,
  sweepPendingRestaurantCharges,
} from '../controllers/pmsController';
import { authenticateJWT, requireTenant } from '../middlewares/auth';

const router = Router();

// Public Booking Website Routes
router.get('/rooms/search', searchAvailableRooms);
router.post('/bookings/create', createRoomBooking);

// Protected Front Desk PMS Routes
router.post('/reception/check-in', authenticateJWT, requireTenant, receptionCheckIn);
router.get('/reception/checkout-preview/:stayId', authenticateJWT, requireTenant, getCheckoutPreview);
router.get('/reception/checkout-preview', authenticateJWT, requireTenant, getCheckoutPreview);
router.post('/reception/settle-and-checkout', authenticateJWT, requireTenant, settleAndCheckOut);
router.post('/keycards/void', authenticateJWT, requireTenant, voidKeycard);
router.get('/keycards/void-audit', authenticateJWT, requireTenant, getKeycardVoidAudits);

// Shift 52: Room Check-Out Atomic Folio Lock & Restaurant Charge Sweep
router.post('/folios/lock', authenticateJWT, requireTenant, lockFolio);
router.post('/folios/unlock', authenticateJWT, requireTenant, unlockFolio);
router.post('/folios/sweep-charges', authenticateJWT, requireTenant, sweepPendingRestaurantCharges);

router.get('/matrix/calendar', authenticateJWT, requireTenant, getCalendarMatrix);
router.post('/matrix/quick-reserve', authenticateJWT, requireTenant, quickReserve);
router.get('/bookings/arrivals-board', authenticateJWT, requireTenant, getArrivalsBoard);
router.patch('/bookings/:bookingId/assign-room', authenticateJWT, requireTenant, assignRoom);
router.patch('/bookings/:bookingId/status', authenticateJWT, requireTenant, updateBookingStatus);

export default router;
