import { Router } from 'express';
import {
  getHotelStaff,
  createHotelStaff,
  updateHotelStaff,
  deleteHotelStaff,
} from '../controllers/hotelStaffController';
import { authenticateBackOffice } from '../middlewares/backOfficeAuth';

const router = Router();

router.use(authenticateBackOffice);

// Staff User Creation & Roster Management Endpoints
router.get('/', getHotelStaff);
router.post('/', createHotelStaff);
router.patch('/:id', updateHotelStaff);
router.put('/:id', updateHotelStaff);
router.delete('/:id', deleteHotelStaff);

export default router;
