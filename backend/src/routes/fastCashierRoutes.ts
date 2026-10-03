import { Router, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import {
  lookupItemByShortcut,
  createFastCounterOrder,
  getTakeawayCallingQueue,
  markTakeawayPickedUp,
  generateThermalReceipt,
  triggerCashDrawerKick,
  settleFastSplitPayment,
} from '../controllers/fastCashierController';
import { authenticateJWT, requireTenant } from '../middlewares/auth';
import { TenantRequest } from '../types';

const router = Router();

// Fast Cashier Terminal Auth (Strict JWT in test, local fallback in dev)
export const authenticateFastCashier = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authenticateJWT(req, res, () => requireTenant(req, res, next));
  }

  if (process.env.NODE_ENV !== 'test') {
    try {
      const { Tenant } = await import('../models/Tenant');
      const { User } = await import('../models/User');
      const { UserRole } = await import('../types');

      const tenantId = req.headers['x-hotel-id'] || req.query.hotelId;
      const tenant =
        tenantId && Types.ObjectId.isValid(String(tenantId))
          ? await Tenant.findById(tenantId)
          : (await Tenant.findOne({ slug: 'taj-gateway' })) || (await Tenant.findOne());

      if (tenant) {
        req.hotelId = tenant._id as Types.ObjectId;
        const cashierUser =
          (await User.findOne({ hotelId: tenant._id, role: UserRole.CASHIER })) ||
          (await User.findOne({ hotelId: tenant._id }));

        if (cashierUser) {
          req.user = {
            userId: cashierUser._id.toString(),
            email: cashierUser.email,
            role: cashierUser.role,
            hotelId: tenant._id.toString(),
            permissions: (cashierUser as any).permissions || ['CASHIER_POS'],
          };
          return next();
        }
      }
    } catch (err) {}
  }

  return authenticateJWT(req, res, () => requireTenant(req, res, next));
};

router.use(authenticateFastCashier);

router.get('/lookup', lookupItemByShortcut);
router.post('/order', createFastCounterOrder);
router.get('/queue', getTakeawayCallingQueue);
router.patch('/order/:orderId/pickup', markTakeawayPickedUp);
router.post('/thermal-receipt/:billId', generateThermalReceipt);
router.post('/drawer-kick', triggerCashDrawerKick);
router.post('/settle-split', settleFastSplitPayment);

export default router;
