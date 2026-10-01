import { Router } from 'express';
import {
  getVendors,
  createVendor,
  getPurchaseOrders,
  createPurchaseOrder,
  approvePurchaseOrder,
  createGrn,
  getGrnHistory,
} from '../controllers/inventoryPoController';
import { authenticateJWT, requireTenant } from '../middlewares/auth';

const router = Router();

// Multi-tenant auth isolation
router.use(authenticateJWT, requireTenant);

// Vendor Directory
router.get('/vendors', getVendors);
router.post('/vendors', createVendor);

// Purchase Orders (PO)
router.get('/orders', getPurchaseOrders);
router.post('/orders', createPurchaseOrder);
router.patch('/orders/:poId/approve', approvePurchaseOrder);

// Goods Received Notes (GRN)
router.post('/grn', createGrn);
router.get('/grn', getGrnHistory);

export default router;
