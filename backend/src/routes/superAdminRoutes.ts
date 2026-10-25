import { Router, Response, NextFunction } from 'express';
import {
  listAllTenants,
  listPlatformUsers,
  toggleTenantStatus,
  updateTenantFeatureFlags,
  updateTenantPortalsAndPricing,
  createSubscriptionPlan,
  getSubscriptionPlans,
  assignPlanToTenant,
  getPlatformOverviewMetrics,
  provisionTenantCapacity,
  getPortalPricingCatalog,
  updatePortalPricing,
  getSubscriptionInvoices,
  generateSubscriptionInvoice,
  settleSubscriptionInvoice,
} from '../controllers/superAdminController';
import { authenticateJWT, requireRole } from '../middlewares/auth';
import { UserRole, TenantRequest } from '../types';
import { isDevAuthBypassEnabled } from '../config/security';

const router = Router();

// Platform level authorization strictly requiring SUPERADMIN JWT role
export const authenticateSuperAdmin = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  return authenticateJWT(req, res, () => requireRole([UserRole.SUPERADMIN])(req, res, next));
};

router.use(authenticateSuperAdmin);

// Tenant Lifecycle & Kill-Switch
router.get('/tenants', listAllTenants);
router.get('/users', listPlatformUsers);
router.put('/tenants/:tenantId/status', toggleTenantStatus);
router.put('/tenants/:tenantId/flags', updateTenantFeatureFlags);
router.put('/tenants/:tenantId/portals', updateTenantPortalsAndPricing);
router.post('/tenants/:tenantId/assign-plan', assignPlanToTenant);
router.post('/tenants/:tenantId/provision', provisionTenantCapacity);

// Subscription Plans
router.post('/plans', createSubscriptionPlan);
router.get('/plans', getSubscriptionPlans);

// Modular Portal Pricing Catalog
router.get('/portal-pricing', getPortalPricingCatalog);
router.put('/portal-pricing', updatePortalPricing);

// Subscription Invoices & Billing
router.get('/invoices', getSubscriptionInvoices);
router.post('/invoices/generate', generateSubscriptionInvoice);
router.patch('/invoices/:invoiceId/settle', settleSubscriptionInvoice);

// Cross-Tenant Consolidated Platform Metrics
router.get('/metrics', getPlatformOverviewMetrics);

export default router;
