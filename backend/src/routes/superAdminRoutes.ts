import { Router } from 'express';
import {
  listAllTenants,
  toggleTenantStatus,
  updateTenantFeatureFlags,
  createSubscriptionPlan,
  getSubscriptionPlans,
  assignPlanToTenant,
  getPlatformOverviewMetrics,
} from '../controllers/superAdminController';
import { authenticateJWT, requireRole } from '../middlewares/auth';
import { UserRole } from '../types';

const router = Router();

// Strict platform level authorization: Only SUPERADMIN allowed!
router.use(authenticateJWT, requireRole([UserRole.SUPERADMIN]));

// Tenant Lifecycle & Kill-Switch
router.get('/tenants', listAllTenants);
router.put('/tenants/:tenantId/status', toggleTenantStatus);
router.put('/tenants/:tenantId/flags', updateTenantFeatureFlags);
router.post('/tenants/:tenantId/assign-plan', assignPlanToTenant);

// Subscription Plans
router.post('/plans', createSubscriptionPlan);
router.get('/plans', getSubscriptionPlans);

// Cross-Tenant Consolidated Platform Metrics
router.get('/metrics', getPlatformOverviewMetrics);

export default router;
