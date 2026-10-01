import { Router } from 'express';
import { TableQrLockerController } from '../controllers/tableQrLockerController';

const router = Router();

router.post('/init-table', TableQrLockerController.initTableQr);
router.post('/scan', TableQrLockerController.scanAndLockSession);
router.post('/order', TableQrLockerController.placeQrOrderWithSla);
router.post('/order/:orderId/waiter-action', TableQrLockerController.waiterReviewOrder);
router.post('/sweep-auto-approvals', TableQrLockerController.sweepAutoApprovals);
router.post('/release-session', TableQrLockerController.releaseQrSession);

export default router;
