import { Router } from 'express';
import {
  createTableReservation,
  seatReservation,
  cancelReservation,
  getTableReservations,
} from '../controllers/reservationController';
import { authenticateJWT, requireTenant } from '../middlewares/auth';

const router = Router();

// Apply auth & tenant isolation to table reservations
router.use(authenticateJWT, requireTenant);

router.post('/', createTableReservation);
router.put('/:reservationId/seat', seatReservation);
router.put('/:reservationId/cancel', cancelReservation);
router.get('/', getTableReservations);

export default router;
