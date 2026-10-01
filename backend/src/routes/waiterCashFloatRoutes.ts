import { Router } from 'express';
import {
  openWaiterFloat,
  recordCashCollection,
  getActiveFloat,
  requestCashDrop,
  approveCashDrop,
  getFloatHistory,
} from '../controllers/waiterCashFloatController';
import { authenticateJWT, requireRole } from '../middlewares/auth';
import { UserRole } from '../types';

const router = Router();

// Waiter opens daily float
router.post(
  '/open',
  authenticateJWT,
  requireRole([UserRole.WAITER, UserRole.CASHIER, UserRole.HOTEL_ADMIN, UserRole.MANAGER]),
  openWaiterFloat
);

// Record table cash collection
router.post(
  '/record-cash',
  authenticateJWT,
  requireRole([UserRole.WAITER, UserRole.CASHIER, UserRole.HOTEL_ADMIN, UserRole.MANAGER]),
  recordCashCollection
);

// Get currently active waiter cash float
router.get(
  '/active',
  authenticateJWT,
  getActiveFloat
);

// Waiter requests shift-end cash drop handover
router.post(
  '/request-drop',
  authenticateJWT,
  requireRole([UserRole.WAITER, UserRole.CASHIER, UserRole.HOTEL_ADMIN, UserRole.MANAGER]),
  requestCashDrop
);

// Cashier / Manager confirms and approves cash drop
router.post(
  '/approve-drop/:floatId',
  authenticateJWT,
  requireRole([UserRole.CASHIER, UserRole.HOTEL_ADMIN, UserRole.MANAGER]),
  approveCashDrop
);

// Float history and audit summary
router.get(
  '/history',
  authenticateJWT,
  getFloatHistory
);

export default router;
