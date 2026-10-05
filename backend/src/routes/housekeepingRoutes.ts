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
  getLostAndFoundVault,
  verifyAndApproveClaim,
  dispatchCourier,
  handoverInPerson,
  inquireLostItem,
  disposeLostItem,
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

// Lost and Found Digital Vault & Courier Pipeline
router.get('/lost-and-found/vault', getLostAndFoundVault);
router.post('/lost-and-found/inquire', inquireLostItem);
router.post('/lost-and-found', logLostItem);
router.put('/lost-and-found/:itemId/verify-claim', verifyAndApproveClaim);
router.post('/lost-and-found/:itemId/dispatch-courier', dispatchCourier);
router.put('/lost-and-found/:itemId/handover', handoverInPerson);
router.put('/lost-and-found/:itemId/claim', claimLostItem);
router.post('/lost-and-found/:itemId/dispose', disposeLostItem);
router.get('/lost-and-found', getLostAndFound);

export default router;
