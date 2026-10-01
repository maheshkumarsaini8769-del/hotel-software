import { Router } from 'express';
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

const router = Router();

// Multi-tenant auth isolation
router.use(authenticateJWT, requireTenant);

router.get('/lookup', lookupItemByShortcut);
router.post('/order', createFastCounterOrder);
router.get('/queue', getTakeawayCallingQueue);
router.patch('/order/:orderId/pickup', markTakeawayPickedUp);
router.post('/thermal-receipt/:billId', generateThermalReceipt);
router.post('/drawer-kick', triggerCashDrawerKick);
router.post('/settle-split', settleFastSplitPayment);

export default router;
