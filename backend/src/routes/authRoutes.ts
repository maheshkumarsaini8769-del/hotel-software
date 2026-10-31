import { Router } from 'express';
import {
  registerTenantAndAdmin,
  login,
  getProfile,
  waiterLogin,
  getActiveHotels,
  requestPin,
  sendPinOtp,
  verifyPinOtp,
} from '../controllers/authController';
import { authenticateJWT, requireTenant } from '../middlewares/auth';
import { authLoginLimiter } from '../middlewares/rateLimiter';

const router = Router();

// Public auth routes
router.get('/active-hotels', getActiveHotels);
router.post('/register', registerTenantAndAdmin);
router.post('/login', authLoginLimiter, login);
router.post('/waiter-login', waiterLogin);
router.post('/staff-pin-login', waiterLogin);
router.post('/request-pin', requestPin);
router.post('/send-pin-otp', sendPinOtp);
router.post('/verify-pin-otp', verifyPinOtp);

// Protected routes (Tenant context enforced)
router.get('/me', authenticateJWT, requireTenant, getProfile);

export default router;
