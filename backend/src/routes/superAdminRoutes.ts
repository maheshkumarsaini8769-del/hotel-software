import { Router, Response, NextFunction } from 'express';
import {
  listAllTenants,
  listPlatformUsers,
  toggleTenantStatus,
  updateTenantFeatureFlags,
  updateTenantPortalsAndPricing,
  createSubscriptionPlan,
  getSubscriptionPlans,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  assignPlanToTenant,
  getPlatformOverviewMetrics,
  provisionTenantCapacity,
  getPortalPricingCatalog,
  updatePortalPricing,
  getSubscriptionInvoices,
  generateSubscriptionInvoice,
  settleSubscriptionInvoice,
  updateTenantBranding,
  createTenant,
  deleteTenant,
  resetTenantAdminPassword,
  updateTenantSubscription,
  updateTenantCapacity,
  updateTenantLocation,
  updateTenantDetails,
  getSystemLogs,
  listFleetRooms,
} from '../controllers/superAdminController';
import { createTenantImpersonationGrant } from '../controllers/supportController';
import { getPlatformIntegrationReport } from '../controllers/superAdminIntegrationController';
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
router.post('/tenants', createTenant);
router.put('/tenants/:tenantId', updateTenantDetails);
router.patch('/tenants/:tenantId', updateTenantDetails);
router.delete('/tenants/:tenantId', deleteTenant);
router.post('/tenants/:tenantId/reset-admin-password', resetTenantAdminPassword);
router.post('/tenants/:tenantId/impersonation', createTenantImpersonationGrant);
router.put('/tenants/:tenantId/subscription', updateTenantSubscription);
router.put('/tenants/:tenantId/capacity', updateTenantCapacity);
router.get('/users', listPlatformUsers);
router.put('/tenants/:tenantId/status', toggleTenantStatus);
router.put('/tenants/:tenantId/flags', updateTenantFeatureFlags);
router.put('/tenants/:tenantId/portals', updateTenantPortalsAndPricing);
router.put('/tenants/:tenantId/branding', updateTenantBranding);
router.put('/tenants/:tenantId/location', updateTenantLocation);
router.patch('/tenants/:tenantId/location', updateTenantLocation);
router.post('/tenants/:tenantId/assign-plan', assignPlanToTenant);
router.post('/tenants/:tenantId/provision', provisionTenantCapacity);

// Subscription Plans
router.post('/plans', createSubscriptionPlan);
router.get('/plans', getSubscriptionPlans);
router.put('/plans/:planId', updateSubscriptionPlan);
router.delete('/plans/:planId', deleteSubscriptionPlan);
router.post('/plans/:planId/toggle', deleteSubscriptionPlan);

// Fleet Rooms Cross-Tenant
router.get('/fleet-rooms', listFleetRooms);

// Modular Portal Pricing Catalog
router.get('/portal-pricing', getPortalPricingCatalog);
router.put('/portal-pricing', updatePortalPricing);

// Subscription Invoices & Billing
router.get('/invoices', getSubscriptionInvoices);
router.post('/invoices/generate', generateSubscriptionInvoice);
router.patch('/invoices/:invoiceId/settle', settleSubscriptionInvoice);

// Cross-Tenant Consolidated Platform Metrics
router.get('/metrics', getPlatformOverviewMetrics);
router.get('/logs', getSystemLogs);
router.get('/integrations', getPlatformIntegrationReport);

export default router;
