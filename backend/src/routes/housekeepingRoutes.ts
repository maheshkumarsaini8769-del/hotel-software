import { Router } from 'express';
import {
  createHousekeepingTask,
  assignHousekeepingTask,
  startCleaning,
  completeCleaning,
  escalateMaintenance,
  inspectTask,
  getHousekeepingBoard,
  getLinenInventory,
  updateLinenStock,
  logLostItem,
  claimLostItem,
  getLostAndFound,
} from '../controllers/housekeepingController';
import { authenticateJWT, requireTenant } from '../middlewares/auth';

const router = Router();

// Apply auth & tenant isolation to all housekeeping operations
router.use(authenticateJWT, requireTenant);

// Tasks & Room Workflow
router.post('/tasks', createHousekeepingTask);
router.put('/tasks/:taskId/assign', assignHousekeepingTask);
router.put('/tasks/:taskId/start', startCleaning);
router.put('/tasks/:taskId/complete', completeCleaning);
router.post('/tasks/:taskId/escalate-maintenance', escalateMaintenance);
router.put('/tasks/:taskId/inspect', inspectTask);
router.get('/board', getHousekeepingBoard);

// Linen Tracking
router.get('/linen', getLinenInventory);
router.post('/linen/transaction', updateLinenStock);

// Lost and Found
router.post('/lost-and-found', logLostItem);
router.put('/lost-and-found/:itemId/claim', claimLostItem);
router.get('/lost-and-found', getLostAndFound);

export default router;
