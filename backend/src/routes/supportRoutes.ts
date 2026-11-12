import { Router } from 'express';
import {
  createSupportTicket,
  exchangeTenantImpersonationGrant,
  listSupportTickets,
  updateSupportTicketStatus,
} from '../controllers/supportController';
import { authenticateJWT, requireRole, requireTenant } from '../middlewares/auth';
import { authLoginLimiter } from '../middlewares/rateLimiter';
import { UserRole } from '../types';

const router = Router();

router.post(
  '/tickets',
  authenticateJWT,
  requireTenant,
  requireRole([UserRole.HOTEL_ADMIN, UserRole.MANAGER]),
  createSupportTicket
);
router.get('/tickets', authenticateJWT, requireRole([UserRole.SUPERADMIN]), listSupportTickets);
router.patch(
  '/tickets/:ticketId/status',
  authenticateJWT,
  requireRole([UserRole.SUPERADMIN]),
  updateSupportTicketStatus
);
router.post('/impersonation/exchange', authLoginLimiter, exchangeTenantImpersonationGrant);

export default router;
