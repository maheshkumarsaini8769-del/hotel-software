import { Router } from 'express';
import {
  getBanquetDashboard,
  createBanquetBooking,
  getBanquetBookings,
  getBanquetBookingById,
  updateFunctionProspectus,
  postBanquetExtraCharge,
  settleBanquetFolio,
  completeBanquetEvent,
} from '../controllers/banquetController';
import { authenticateJWT, requireTenant } from '../middlewares/auth';

const router = Router();

// Multi-tenant auth isolation
router.use(authenticateJWT, requireTenant);

router.get('/dashboard', getBanquetDashboard);
router.get('/', getBanquetBookings);
router.post('/', createBanquetBooking);
router.get('/:bookingId', getBanquetBookingById);
router.patch('/:bookingId/prospectus', updateFunctionProspectus);
router.post('/:bookingId/extra-charge', postBanquetExtraCharge);
router.post('/:bookingId/settle', settleBanquetFolio);
router.post('/:bookingId/complete', completeBanquetEvent);

export default router;
