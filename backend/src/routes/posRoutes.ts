import { Router, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import {
  accessTableByQR,
  getDemoContext,
  getActiveTableSession,
  placeRestaurantOrder,
  updateKDSOrderStatus,
  getDiningTables,
  updateTableStatus,
  seatTableWalkIn,
  getDiningMenu,
  toggleItem86,
  get86MenuItems,
  batchToggleItem86,
  getKitchenStations,
  getKdsOrders,
  getRecentOrders,
  acknowledgeKdsItemAllergen,
  acknowledgeAllKdsOrderAllergens,
  mergeDiningTables,
  splitDiningTables,
  getTableSessionOrders,
  postKitchenBuzzer,
  getKitchenBuzzers,
  acknowledgeKitchenBuzzer,
} from '../controllers/posController';
import { authenticateJWT, requireTenant } from '../middlewares/auth';
import { requirePortal, requireAnyPortal } from '../middlewares/portalGate';
import { TenantRequest } from '../types';
import { isDevAuthBypassEnabled } from '../config/security';

const router = Router();

// POS/KDS Terminal Authentication (Strict JWT in test, local fallback in dev)
export const authenticatePosTerminal = async (
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

      const tenantId = req.headers['x-hotel-id'] || req.query.hotelId || req.body?.hotelId;
      const tenant =
        tenantId && Types.ObjectId.isValid(String(tenantId))
          ? await Tenant.findById(tenantId)
          : (await Tenant.findOne({ slug: 'taj-gateway' })) || (await Tenant.findOne());

      if (tenant) {
        req.hotelId = tenant._id as Types.ObjectId;
        const staffUser =
          (await User.findOne({ hotelId: tenant._id, role: UserRole.CHEF })) ||
          (await User.findOne({ hotelId: tenant._id, role: UserRole.CASHIER })) ||
          (await User.findOne({ hotelId: tenant._id }));

        if (staffUser) {
          req.user = {
            userId: staffUser._id.toString(),
            email: staffUser.email,
            role: staffUser.role,
            hotelId: tenant._id.toString(),
            permissions: (staffUser as any).permissions || ['KDS_SCREEN', 'POS_OPERATIONS'],
          };
          return next();
        }
      }
    } catch (err) {}
  }

  return authenticateJWT(req, res, () => requireTenant(req, res, next));
};

// Public Table Customer Routes (Zero-barrier)
router.get('/demo-context', getDemoContext);
router.get('/table/qr-entry', accessTableByQR);
router.post('/orders/place', placeRestaurantOrder);
router.get('/table-session/:tableSessionId/orders', getTableSessionOrders);
router.get('/table-session/orders', getTableSessionOrders);
router.get('/table/orders', getTableSessionOrders);
router.get('/menu', getDiningMenu);

// Protected Staff, POS & KDS Routes
router.use('/kds', requirePortal('kds'));
router.use('/kitchen', requirePortal('kds'));
router.get('/kds/stations', authenticatePosTerminal, getKitchenStations);
router.get('/kds/orders', authenticatePosTerminal, getKdsOrders);
router.get('/kds-orders', requirePortal('kds'), authenticatePosTerminal, getKdsOrders);
router.get('/orders/recent', requirePortal('kds'), authenticatePosTerminal, getRecentOrders);
router.patch('/kds/order/:orderId/status', requirePortal('kds'), authenticatePosTerminal, updateKDSOrderStatus);
router.patch('/orders/:orderId/status', requirePortal('kds'), authenticatePosTerminal, updateKDSOrderStatus);
router.patch('/orders/:orderId/serve', requireAnyPortal(['kds', 'waiter']), authenticatePosTerminal, (req, res) => {
  req.body = { ...req.body, status: 'SERVED' };
  return updateKDSOrderStatus(req, res);
});
router.patch('/kds/orders/:orderId/items/:itemIndex/acknowledge-allergen', requirePortal('kds'), authenticatePosTerminal, acknowledgeKdsItemAllergen);
router.patch('/kds/orders/:orderId/acknowledge-all-allergens', requirePortal('kds'), authenticatePosTerminal, acknowledgeAllKdsOrderAllergens);
router.get('/table-session/active', requireAnyPortal(['waiter', 'cashier']), authenticatePosTerminal, getActiveTableSession);
router.get('/tables', requireAnyPortal(['waiter', 'cashier']), authenticatePosTerminal, getDiningTables);
router.patch('/tables/:tableId/status', requireAnyPortal(['waiter', 'cashier']), authenticatePosTerminal, updateTableStatus);
router.post('/tables/:tableId/seat', requireAnyPortal(['waiter', 'cashier']), authenticatePosTerminal, seatTableWalkIn);
router.post('/tables/merge', requireAnyPortal(['waiter', 'cashier']), authenticatePosTerminal, mergeDiningTables);
router.post('/tables/unmerge', requireAnyPortal(['waiter', 'cashier']), authenticatePosTerminal, splitDiningTables);
router.post('/tables/split', requireAnyPortal(['waiter', 'cashier']), authenticatePosTerminal, splitDiningTables);
router.get('/menu/86-items', requirePortal('kds'), authenticatePosTerminal, get86MenuItems);
router.post('/menu/batch-86', requirePortal('kds'), authenticatePosTerminal, batchToggleItem86);
router.patch('/menu/:itemId/toggle-86', requirePortal('kds'), authenticatePosTerminal, toggleItem86);

// Kitchen Intercom & Waiter Call Buzzer routes
router.post('/kds/buzzer', requirePortal('kds'), postKitchenBuzzer);
router.post('/kitchen/buzzer', requirePortal('kds'), postKitchenBuzzer);
router.get('/kds/buzzers', requirePortal('kds'), getKitchenBuzzers);
router.get('/kitchen/buzzers', requirePortal('kds'), getKitchenBuzzers);
router.patch('/kds/buzzer/:id/acknowledge', requirePortal('kds'), acknowledgeKitchenBuzzer);
router.patch('/kitchen/buzzer/:id/acknowledge', requirePortal('kds'), acknowledgeKitchenBuzzer);

export default router;


