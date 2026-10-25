import { Router } from 'express';
import {
  registerTenantAndAdmin,
  login,
  getProfile,
  waiterLogin,
  getActiveHotels,
  requestPin,
} from '../controllers/authController';
import { authenticateJWT, requireTenant } from '../middlewares/auth';

const router = Router();

// Public auth routes
router.get('/active-hotels', getActiveHotels);
router.post('/register', registerTenantAndAdmin);
router.post('/login', login);
router.post('/waiter-login', waiterLogin);
router.post('/request-pin', requestPin);

// Protected routes (Tenant context enforced)
router.get('/me', authenticateJWT, requireTenant, getProfile);

export default router;
