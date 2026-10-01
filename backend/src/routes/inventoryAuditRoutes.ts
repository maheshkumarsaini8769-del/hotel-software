import { Router } from 'express';
import {
  createAuditSession,
  getAuditSessions,
  submitPhysicalCounts,
  reconcileDiscrepancies,
} from '../controllers/inventoryAuditController';
import { authenticateJWT, requireTenant } from '../middlewares/auth';

const router = Router();

// Multi-tenant auth isolation
router.use(authenticateJWT, requireTenant);

// Inventory Audit Sessions & Stocktaking
router.get('/sessions', getAuditSessions);
router.post('/sessions', createAuditSession);
router.post('/sessions/:auditId/count', submitPhysicalCounts);
router.patch('/sessions/:auditId/reconcile', reconcileDiscrepancies);

export default router;
