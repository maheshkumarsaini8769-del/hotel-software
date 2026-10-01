import { Router } from 'express';
import { FoodPickupSlaController } from '../controllers/foodPickupSlaController';

const router = Router();

// 1. Get or update SLA configuration (slider 2-10 min)
router.get('/config', FoodPickupSlaController.getOrUpdateSlaConfig);
router.post('/config', FoodPickupSlaController.getOrUpdateSlaConfig);

// 2. Chef marks dish ready -> creates pickup ticket
router.post('/ready-ticket', FoodPickupSlaController.createReadyPickupTicket);

// 3. Waiter taps "On My Way" (snooze)
router.post('/ticket/:ticketId/snooze', FoodPickupSlaController.waiterSnoozeOnMyWay);

// 4. Waiter confirms food pickup
router.post('/ticket/:ticketId/pickup', FoodPickupSlaController.waiterConfirmPickup);

// 5. Sweep and escalate SLA breaches to captain
router.post('/sweep-breaches', FoodPickupSlaController.sweepBreachedTickets);

export default router;
