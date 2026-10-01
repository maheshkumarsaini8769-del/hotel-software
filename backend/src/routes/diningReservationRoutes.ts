import { Router } from 'express';
import {
  createDiningReservation,
  getDiningReservations,
  seatDiningReservation,
  updateDiningReservationStatus,
  getGuestDietaryProfile,
} from '../controllers/diningReservationController';
import { authenticateJWT, requireTenant } from '../middlewares/auth';

const router = Router();

// Multi-tenant auth isolation
router.use(authenticateJWT, requireTenant);

// Dining Reservation CRM Endpoints
router.post('/', createDiningReservation);
router.get('/', getDiningReservations);
router.patch('/:reservationId/seat', seatDiningReservation);
router.patch('/:reservationId/status', updateDiningReservationStatus);
router.get('/guest-profile', getGuestDietaryProfile);

export default router;
