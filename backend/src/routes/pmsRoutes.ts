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
} from '../controllers/pmsController';
import { authenticateJWT, requireTenant } from '../middlewares/auth';

const router = Router();

// Public Booking Website Routes
router.get('/rooms/search', searchAvailableRooms);
router.post('/bookings/create', createRoomBooking);

// Protected Front Desk PMS Routes
router.post('/reception/check-in', authenticateJWT, requireTenant, receptionCheckIn);
router.get('/matrix/calendar', authenticateJWT, requireTenant, getCalendarMatrix);
router.post('/matrix/quick-reserve', authenticateJWT, requireTenant, quickReserve);
router.get('/bookings/arrivals-board', authenticateJWT, requireTenant, getArrivalsBoard);
router.patch('/bookings/:bookingId/assign-room', authenticateJWT, requireTenant, assignRoom);
router.patch('/bookings/:bookingId/status', authenticateJWT, requireTenant, updateBookingStatus);

export default router;
