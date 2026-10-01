import { Router } from 'express';
import { registerTenantAndAdmin, login, getProfile } from '../controllers/authController';
import { authenticateJWT, requireTenant } from '../middlewares/auth';

const router = Router();

// Public auth routes
router.post('/register', registerTenantAndAdmin);
router.post('/login', login);

// Protected routes (Tenant context enforced)
router.get('/me', authenticateJWT, requireTenant, getProfile);

export default router;
