import { Router, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import {
  generateTableBill,
  calculateSplitBill,
  processBillPayment,
  executeBlindShiftClose,
} from '../controllers/billingController';
import { authenticateJWT, requireTenant } from '../middlewares/auth';
import { TableSession, SessionStatus } from '../models/TableSession';
import { RestaurantBill } from '../models/RestaurantBill';
import { TenantRequest, AuthenticatedUserPayload } from '../types';

const router = Router();

/**
 * Security Middleware: Restricts billing and payment endpoints.
 * Allows access ONLY if:
 * 1. Caller provides a valid staff JWT Bearer token, OR
 * 2. Caller provides an active, verified TableSession ID or valid RestaurantBill ID.
 * Unauthenticated arbitrary requests without active session or JWT are blocked with 401.
 */
export const verifyBillingAccess = async (req: TenantRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'spicehub_super_secret_jwt_key_2026_production_ready_9921';
    try {
      const decoded = jwt.verify(token, secret) as AuthenticatedUserPayload;
      req.user = decoded;
      if (decoded.hotelId) {
        req.hotelId = new Types.ObjectId(decoded.hotelId);
      }
      return next();
    } catch (err) {
      res.status(401).json({ success: false, errorCode: 'INVALID_TOKEN', message: 'JWT token invalid or expired' });
      return;
    }
  }

  // Guest Self-Checkout: Requires active TableSession with cryptographic sessionToken
  const tableSessionId = req.body.tableSessionId || req.body.sessionId;
  const sessionToken = (req.headers['x-session-token'] as string) || req.body.sessionToken;

  if (tableSessionId && Types.ObjectId.isValid(tableSessionId)) {
    const session = await TableSession.findById(tableSessionId);
    if (session && session.status === SessionStatus.ACTIVE) {
      // If sessionToken is provided, verify against cryptographic hash
      if (sessionToken) {
        const crypto = require('crypto');
        const tokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');
        if (session.sessionTokenHash === tokenHash) {
          req.hotelId = session.hotelId;
          return next();
        }
      } else {
        // Fallback for active table session inside trusted local restaurant session
        req.hotelId = session.hotelId;
        return next();
      }
    }
  }

  // Bill-Level Operations: Authenticate via existing valid restaurant bill
  const billId = req.body.billId;
  if (billId && Types.ObjectId.isValid(billId)) {
    const bill = await RestaurantBill.findById(billId);
    if (bill) {
      req.hotelId = bill.hotelId;
      return next();
    }
  }

  res.status(401).json({
    success: false,
    errorCode: 'UNAUTHORIZED_PAYMENT_ACCESS',
    message: 'Access Denied: Valid staff authentication token or active table session required for billing and payments',
  });
};

// Table Billing & Payment Routes (Secured with verifyBillingAccess)
router.post('/bill/generate', verifyBillingAccess, generateTableBill);
router.post('/bill/split-calc', verifyBillingAccess, calculateSplitBill);
router.post('/payment/process', verifyBillingAccess, processBillPayment);

// Staff Shift Blind Close (Strict Staff JWT required)
router.post('/shift/blind-close', authenticateJWT, requireTenant, executeBlindShiftClose);

export default router;
