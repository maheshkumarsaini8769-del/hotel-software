import { Router } from 'express';
import { StaffLoadBalancerController } from '../controllers/staffLoadBalancerController';

const router = Router();

router.post('/floor-workloads', StaffLoadBalancerController.getFloorLoadBalanceReport);
router.post('/trigger-spillover', StaffLoadBalancerController.triggerLateSpillover);
router.post('/reclaim-tables', StaffLoadBalancerController.reclaimTablesOnLateArrival);

export default router;
