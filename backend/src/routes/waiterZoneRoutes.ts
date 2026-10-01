import { Router } from 'express';
import { WaiterZoneController } from '../controllers/waiterZoneController';

const router = Router();

router.post('/assign', WaiterZoneController.assignZone);
router.get('/active', WaiterZoneController.getActiveZones);
router.get('/waiter/:waiterId/tables', WaiterZoneController.getWaiterAssignedTables);
router.post('/dispatch-alert', WaiterZoneController.dispatchTargetedAlert);
router.get('/waiter/:waiterId/feed', WaiterZoneController.getWaiterAlertFeed);
router.post('/alert/:alertId/action', WaiterZoneController.waiterActionAlert);
router.post('/unassign', WaiterZoneController.unassignZone);

export default router;
