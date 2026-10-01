import { Router } from 'express';
import {
  getRequisitions,
  createRequisition,
  issueRequisition,
  createStockTransfer,
  receiveStockTransfer,
  getStockBatches,
  createStockBatch,
} from '../controllers/storeRequisitionController';
import { authenticateJWT, requireTenant } from '../middlewares/auth';

const router = Router();

// Multi-tenant auth isolation
router.use(authenticateJWT, requireTenant);

// Departmental Store Requisitions (Indents)
router.get('/requisitions', getRequisitions);
router.post('/requisitions', createRequisition);
router.patch('/requisitions/:reqId/issue', issueRequisition);

// Inter-Kitchen / Inter-Outlet Stock Transfers
router.post('/transfers', createStockTransfer);
router.patch('/transfers/:transferId/receive', receiveStockTransfer);

// Stock Batches & FEFO Expiration
router.get('/batches', getStockBatches);
router.post('/batches', createStockBatch);

export default router;
