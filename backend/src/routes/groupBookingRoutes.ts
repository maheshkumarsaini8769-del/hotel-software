import { Router } from 'express';
import {
  createGroupBooking,
  bulkCheckInGroup,
  postIncidentalCharge,
  generateGroupInvoices,
  getGroupBookings,
  getGroupBookingById,
  settleCorporateFolio,
  settleIndividualFolio,
  bulkCheckOutGroup,
} from '../controllers/groupBookingController';
import { authenticateJWT, requireTenant } from '../middlewares/auth';

const router = Router();

// Apply auth & tenant isolation to group bookings and split folio invoicing
router.use(authenticateJWT, requireTenant);

router.get('/', getGroupBookings);
router.post('/', createGroupBooking);
router.get('/:groupBookingId', getGroupBookingById);
router.post('/:groupBookingId/bulk-check-in', bulkCheckInGroup);
router.post('/:groupBookingId/bulk-checkout', bulkCheckOutGroup);
router.post('/:groupBookingId/incidental', postIncidentalCharge);
router.get('/:groupBookingId/invoices', generateGroupInvoices);
router.post('/:groupBookingId/settle-master', settleCorporateFolio);
router.post('/:groupBookingId/settle-individual', settleIndividualFolio);

export default router;
