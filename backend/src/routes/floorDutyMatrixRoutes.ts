import { Router } from 'express';
import { authenticateBackOffice } from '../middlewares/backOfficeAuth';
import { FloorDutyMatrixController } from '../controllers/floorDutyMatrixController';

const router = Router();

router.use(authenticateBackOffice);

router.post('/init-sync', FloorDutyMatrixController.initOrSyncFloorMatrix);
router.post('/assign-range', FloorDutyMatrixController.assignDynamicRange);
router.get('/overview', FloorDutyMatrixController.getMultiFloorStatusOverview);
router.post('/dispatch-floor-alert', FloorDutyMatrixController.dispatchFloorTargetedAlert);

export default router;
