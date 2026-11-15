import { Router } from 'express';
import {
  registerTenantAndAdmin,
  login,
  getProfile,
  waiterLogin,
  getActiveHotels,
  getPublicStaffRoster,
  verifyStaffHotelCode,
  requestPin,
  sendPinOtp,
  verifyPinOtp,
  changeOwnStaffPin,
  getPortalLoginBranding,
  sendOnboardingOtp,
  verifyOnboardingOtp,
} from '../controllers/authController';
import { getStaffAppBranding } from '../controllers/superAdminController';
import { authenticateJWT, requireTenant } from '../middlewares/auth';
import { authLoginLimiter, publicStaffRosterLimiter, staffHotelCodeLimiter } from '../middlewares/rateLimiter';

const router = Router();

// Public auth routes
router.get('/active-hotels', getActiveHotels);
router.post('/active-hotels/select', staffHotelCodeLimiter, verifyStaffHotelCode);
router.get('/portal-login-branding', getPortalLoginBranding);
router.get('/staff-app-branding', getStaffAppBranding);
router.post('/staff-hotel-code/verify', staffHotelCodeLimiter, verifyStaffHotelCode);
router.get('/hotels/:hotelId/staff-roster', publicStaffRosterLimiter, getPublicStaffRoster);
router.post('/register', registerTenantAndAdmin);
router.post('/login', authLoginLimiter, login);
router.post('/waiter-login', authLoginLimiter, waiterLogin);
router.post('/staff-pin-login', authLoginLimiter, waiterLogin);
router.post('/request-pin', requestPin);
router.post('/send-pin-otp', sendPinOtp);
router.post('/verify-pin-otp', verifyPinOtp);
router.post('/onboarding/send-otp', sendOnboardingOtp);
router.post('/onboarding/verify-otp', verifyOnboardingOtp);
router.post('/change-pin', authenticateJWT, requireTenant, authLoginLimiter, changeOwnStaffPin);

// Protected routes (Tenant context enforced)
router.get('/me', authenticateJWT, requireTenant, getProfile);

export default router;
