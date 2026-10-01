import { Router } from 'express';
import {
  voidKotItem,
  getVoidAuditLogs,
  getDailyVoidSummary,
} from '../controllers/kotLockVoidController';
import { authenticateJWT, requireRole } from '../middlewares/auth';
import { UserRole } from '../types';

const router = Router();

// 1. Authorize & Void KOT Item (Requires Staff Auth + Manager PIN in Body)
router.post(
  '/item',
  authenticateJWT,
  requireRole([
    UserRole.WAITER,
    UserRole.CASHIER,
    UserRole.MANAGER,
    UserRole.HOTEL_ADMIN,
    UserRole.SUPERADMIN,
  ]),
  voidKotItem
);

// 2. Get Audit Trail of all Voided Items (Managers / Admins only)
router.get(
  '/audit-logs',
  authenticateJWT,
  requireRole([UserRole.MANAGER, UserRole.HOTEL_ADMIN, UserRole.SUPERADMIN]),
  getVoidAuditLogs
);

// 3. Get Daily Void Analytics & Scrapped Food Waste Costs (Managers / Admins only)
router.get(
  '/daily-summary',
  authenticateJWT,
  requireRole([UserRole.MANAGER, UserRole.HOTEL_ADMIN, UserRole.SUPERADMIN]),
  getDailyVoidSummary
);

export default router;
