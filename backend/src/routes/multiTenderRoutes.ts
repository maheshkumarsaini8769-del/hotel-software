import { Router } from 'express';
import { MultiTenderController } from '../controllers/multiTenderController';

const router = Router();

// Shift Float management
router.post('/shift/open', MultiTenderController.openShift);
router.post('/shift/close', MultiTenderController.closeShift);

// Multi-Tender Settlement
router.post('/settle', MultiTenderController.settleMultiTender);

// Tender Ledger Reconciliation Summary
router.get('/reconciliation/summary', MultiTenderController.getReconciliationSummary);

// Void Settlement (Manager Protected)
router.post('/settlement/:settlementId/void', MultiTenderController.voidSettlement);

export default router;
