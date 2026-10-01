import { Router } from 'express';
import {
  generateDynamicQr,
  getQrStatus,
  soundboxWebhook,
  cancelDynamicQr,
  getActiveTableQr,
} from '../controllers/dynamicUpiController';
import { authenticateJWT, requireRole } from '../middlewares/auth';
import { UserRole } from '../types';

const router = Router();

// Waiter handheld generates locked dynamic UPI QR
router.post(
  '/generate',
  authenticateJWT,
  requireRole([UserRole.WAITER, UserRole.CASHIER, UserRole.HOTEL_ADMIN, UserRole.MANAGER]),
  generateDynamicQr
);

// Check live payment status (polled by waiter handheld / customer)
router.get(
  '/status/:transactionRef',
  getQrStatus
);

// Soundbox device / payment gateway notification webhook
router.post(
  '/soundbox-webhook',
  soundboxWebhook
);

// Cancel dynamic QR if guest pays via alternate tender
router.post(
  '/cancel/:transactionRef',
  authenticateJWT,
  requireRole([UserRole.WAITER, UserRole.CASHIER, UserRole.HOTEL_ADMIN, UserRole.MANAGER]),
  cancelDynamicQr
);

// Query active pending QR on table
router.get(
  '/active-table/:tableNumber',
  authenticateJWT,
  getActiveTableQr
);

export default router;
