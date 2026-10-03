import { Router } from 'express';
import {
  accessTableByQR,
  getDemoContext,
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
  acknowledgeKdsItemAllergen,
  acknowledgeAllKdsOrderAllergens,
  mergeDiningTables,
  splitDiningTables,
} from '../controllers/posController';
import { authenticateJWT, requireTenant } from '../middlewares/auth';

const router = Router();

// Public Table Customer Routes (Zero-barrier)
router.get('/demo-context', getDemoContext);
router.get('/table/qr-entry', accessTableByQR);
router.post('/orders/place', placeRestaurantOrder);
router.get('/menu', getDiningMenu);

// Protected Staff, POS & KDS Routes
router.get('/kds/stations', authenticateJWT, requireTenant, getKitchenStations);
router.get('/kds/orders', authenticateJWT, requireTenant, getKdsOrders);
router.patch('/kds/order/:orderId/status', authenticateJWT, requireTenant, updateKDSOrderStatus);
router.patch('/kds/orders/:orderId/items/:itemIndex/acknowledge-allergen', authenticateJWT, requireTenant, acknowledgeKdsItemAllergen);
router.patch('/kds/orders/:orderId/acknowledge-all-allergens', authenticateJWT, requireTenant, acknowledgeAllKdsOrderAllergens);
router.get('/tables', authenticateJWT, requireTenant, getDiningTables);
router.patch('/tables/:tableId/status', authenticateJWT, requireTenant, updateTableStatus);
router.post('/tables/:tableId/seat', authenticateJWT, requireTenant, seatTableWalkIn);
router.post('/tables/merge', authenticateJWT, requireTenant, mergeDiningTables);
router.post('/tables/unmerge', authenticateJWT, requireTenant, splitDiningTables);
router.post('/tables/split', authenticateJWT, requireTenant, splitDiningTables);
router.get('/menu/86-items', authenticateJWT, requireTenant, get86MenuItems);
router.post('/menu/batch-86', authenticateJWT, requireTenant, batchToggleItem86);
router.patch('/menu/:itemId/toggle-86', authenticateJWT, requireTenant, toggleItem86);

export default router;


