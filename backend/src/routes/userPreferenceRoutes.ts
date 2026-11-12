import { Router } from 'express';
import { getUserPreferences, updateUserPreferences } from '../controllers/userPreferenceController';
import { authenticateJWT, requireRole, requireTenant } from '../middlewares/auth';
import { UserRole } from '../types';

const router = Router();

router.use(
  authenticateJWT,
  requireTenant,
  requireRole([
    UserRole.SUPERADMIN,
    UserRole.HOTEL_ADMIN,
    UserRole.MANAGER,
    UserRole.CASHIER,
    UserRole.WAITER,
    UserRole.CHEF,
    UserRole.RECEPTIONIST,
    UserRole.HOUSEKEEPING,
    UserRole.MAINTENANCE,
  ])
);

router.get('/', getUserPreferences);
router.put('/', updateUserPreferences);

export default router;
