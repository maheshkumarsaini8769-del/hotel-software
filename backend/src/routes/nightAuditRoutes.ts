import { Router } from 'express';
import {
  runDailyNightAudit,
  getLiveDayPreAuditStatus,
  getNightAuditHistory,
  getNightAuditReportById,
} from '../controllers/nightAuditController';
import { authenticateJWT, requireTenant } from '../middlewares/auth';

const router = Router();

// Multi-tenant auth isolation
router.use(authenticateJWT, requireTenant);

// Night Audit & Business Date Rollover Endpoints
router.post('/run', runDailyNightAudit);
router.get('/pre-audit-status', getLiveDayPreAuditStatus);
router.get('/history', getNightAuditHistory);
router.get('/reports/:id', getNightAuditReportById);

export default router;
