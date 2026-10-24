import { Router, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import {
  getCashierSnapshot,
  lookupItemByShortcut,
  createFastCounterOrder,
  getTakeawayCallingQueue,
  markTakeawayPickedUp,
  generateThermalReceipt,
  triggerCashDrawerKick,
  settleFastSplitPayment,
  getPettyCashVouchers,
  createPettyCashVoucher,
  recordCashDrop,
  getCashierReceipts,
} from '../controllers/fastCashierController';
import { authenticateJWT, requireTenant } from '../middlewares/auth';
import { TenantRequest } from '../types';
import { isDevAuthBypassEnabled } from '../config/security';

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

  if (isDevAuthBypassEnabled()) {
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

router.get('/snapshot', getCashierSnapshot);
router.get('/lookup', lookupItemByShortcut);
router.post('/order', createFastCounterOrder);
router.get('/queue', getTakeawayCallingQueue);
router.patch('/order/:orderId/pickup', markTakeawayPickedUp);
router.post('/thermal-receipt/:billId', generateThermalReceipt);
router.post('/drawer-kick', triggerCashDrawerKick);
router.post('/settle-split', settleFastSplitPayment);
router.get('/expenses', getPettyCashVouchers);
router.post('/expenses', createPettyCashVoucher);
router.post('/cash-drop', recordCashDrop);
router.get('/receipts', getCashierReceipts);

export default router;
