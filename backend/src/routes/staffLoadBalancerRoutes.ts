import { Router } from 'express';
import { authenticateBackOffice } from '../middlewares/backOfficeAuth';
import { StaffLoadBalancerController } from '../controllers/staffLoadBalancerController';

const router = Router();

router.use(authenticateBackOffice);

router.post('/floor-workloads', StaffLoadBalancerController.getFloorLoadBalanceReport);
router.post('/trigger-spillover', StaffLoadBalancerController.triggerLateSpillover);
router.post('/reclaim-tables', StaffLoadBalancerController.reclaimTablesOnLateArrival);

export default router;
