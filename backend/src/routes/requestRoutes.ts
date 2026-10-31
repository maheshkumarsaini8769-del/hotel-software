import { Router, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import {
  createServiceRequest,
  acceptServiceRequest,
  completeServiceRequest,
  getWaiterRequests,
  updateWaiterShiftStatus,
} from '../controllers/requestController';
import { authenticateJWT, requireTenant } from '../middlewares/auth';
import { requirePortal } from '../middlewares/portalGate';
import { TenantRequest } from '../types';
import { isDevAuthBypassEnabled } from '../config/security';

const router = Router();

// Public Customer Request Trigger
router.post('/create', createServiceRequest);
router.post('/', createServiceRequest);
router.post('/waiter', createServiceRequest);

// Waiter Action Middleware (JWT in tests, fallback in dev)
export const authenticateWaiterAction = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authenticateJWT(req, res, () => requireTenant(req, res, next));
  }

  if (isDevAuthBypassEnabled()) {
    try {
      const { Tenant } = await import('../models/Tenant');
      const { User } = await import('../models/User');
      const { UserRole } = await import('../types');

      const tenantId = req.body?.hotelId || req.query?.hotelId;
      const tenant = tenantId && Types.ObjectId.isValid(tenantId)
        ? await Tenant.findById(tenantId)
        : (await Tenant.findOne({ slug: 'taj-gateway' })) || (await Tenant.findOne());

      if (tenant) {
        req.hotelId = tenant._id as Types.ObjectId;
        const waiterUser =
          (await User.findOne({ hotelId: tenant._id, role: UserRole.WAITER })) ||
          (await User.findOne({ hotelId: tenant._id }));
        if (waiterUser) {
          req.user = {
            userId: waiterUser._id.toString(),
            email: waiterUser.email,
            role: waiterUser.role,
            hotelId: tenant._id.toString(),
            permissions: (waiterUser as any).permissions || ['WAITER_SERVICE'],
          };
          return next();
        }
      }
    } catch (err) {}
  }
  return authenticateJWT(req, res, () => requireTenant(req, res, next));
};

// Protected Waiter / Staff actions
router.get('/', requirePortal('waiter'), authenticateWaiterAction, getWaiterRequests);
router.get('/waiter', requirePortal('waiter'), authenticateWaiterAction, getWaiterRequests);
router.get('/waiter/assigned', requirePortal('waiter'), authenticateWaiterAction, getWaiterRequests);
router.patch('/waiter/shift-status', requirePortal('waiter'), authenticateWaiterAction, updateWaiterShiftStatus);

// Accept Request (supports POST and PATCH)
router.patch('/:requestId/accept', requirePortal('waiter'), authenticateWaiterAction, acceptServiceRequest);
router.post('/:requestId/accept', requirePortal('waiter'), authenticateWaiterAction, acceptServiceRequest);

// Complete / Resolve Request (supports POST and PATCH)
router.patch('/:requestId/complete', requirePortal('waiter'), authenticateWaiterAction, completeServiceRequest);
router.post('/:requestId/complete', requirePortal('waiter'), authenticateWaiterAction, completeServiceRequest);
router.patch('/:requestId/resolve', requirePortal('waiter'), authenticateWaiterAction, completeServiceRequest);
router.post('/:requestId/resolve', requirePortal('waiter'), authenticateWaiterAction, completeServiceRequest);
router.patch('/:requestId/status', requirePortal('waiter'), authenticateWaiterAction, (req: any, res: any) => {
  if (req.body.status === 'RESOLVED' || req.body.status === 'COMPLETED') return completeServiceRequest(req, res);
  return acceptServiceRequest(req, res);
});

export default router;
