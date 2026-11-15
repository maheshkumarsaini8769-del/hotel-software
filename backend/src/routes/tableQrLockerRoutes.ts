import { Router } from 'express';
import { TableQrLockerController } from '../controllers/tableQrLockerController';
import { authenticateJWT, requireRole } from '../middlewares/auth';
import { isDevAuthBypassEnabled } from '../config/security';
import { UserRole } from '../types';

const router = Router();

/**
 * Test/dev fixtures call these endpoints without minting staff tokens. In
 * production the tenant header alone is never accepted for staff actions.
 */
const requireStaffInProduction = (roles: UserRole[]) => {
  return (req: any, res: any, next: any) => {
    if (process.env.NODE_ENV === 'test' || isDevAuthBypassEnabled()) return next();
    return authenticateJWT(req, res, () => requireRole(roles)(req, res, next));
  };
};

router.post(
  '/init-table',
  requireStaffInProduction([UserRole.HOTEL_ADMIN, UserRole.MANAGER, UserRole.GROUP_ADMIN]),
  TableQrLockerController.initTableQr
);
router.post('/scan', TableQrLockerController.scanAndLockSession);
router.post('/order', TableQrLockerController.placeQrOrderWithSla);
router.post(
  '/order/:orderId/waiter-action',
  requireStaffInProduction([
    UserRole.WAITER,
    UserRole.CASHIER,
    UserRole.MANAGER,
    UserRole.HOTEL_ADMIN,
    UserRole.GROUP_ADMIN,
  ]),
  TableQrLockerController.waiterReviewOrder
);
router.post('/sweep-auto-approvals', TableQrLockerController.sweepAutoApprovals);
router.post('/release-session', TableQrLockerController.releaseQrSession);

export default router;
