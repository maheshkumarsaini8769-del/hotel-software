import { Router } from 'express';
import { CustomerPortalController } from '../controllers/customerPortalController';

const router = Router();

router.post('/detect-or-init', CustomerPortalController.detectOrInit);
router.post('/select-mode', CustomerPortalController.selectMode);
router.post('/switch-mode', CustomerPortalController.switchMode);
router.post('/place-order', CustomerPortalController.placeOrder);
router.post('/service-request', CustomerPortalController.requestService);
router.patch('/service-request/:requestId/status', CustomerPortalController.updateServiceRequestStatus);
router.get('/session/:sessionToken', CustomerPortalController.getSession);

export default router;
