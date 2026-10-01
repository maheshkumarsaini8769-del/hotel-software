import { Request, Response } from 'express';
import { Types } from 'mongoose';
import crypto from 'crypto';
import { TableQrLocker } from '../models/TableQrLocker';
import { DiningTable, TableStatus } from '../models/DiningTable';
import {
  RestaurantOrder,
  OrderType,
  OverallOrderStatus,
  OrderApprovalStatus,
  ItemProductionStatus,
} from '../models/RestaurantOrder';
import { MenuItem } from '../models/MenuItem';

export class TableQrLockerController {
  /**
   * 1. Initialize or Get Permanent Table QR
   * POST /api/v1/qr-locker/init-table
   */
  static async initTableQr(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string || req.body.hotelId;
      const { tableId, domainUrl } = req.body;

      if (!tableId || !Types.ObjectId.isValid(tableId)) {
        res.status(400).json({ success: false, message: 'Valid tableId is required' });
        return;
      }

      const table = await DiningTable.findOne({
        _id: new Types.ObjectId(tableId),
        hotelId: new Types.ObjectId(hotelId),
      });

      if (!table) {
        res.status(404).json({ success: false, message: 'Table not found for tenant' });
        return;
      }

      let locker = await TableQrLocker.findOne({
        hotelId: new Types.ObjectId(hotelId),
        tableId: table._id,
      });

      if (!locker) {
        const permanentSalt = crypto.randomBytes(16).toString('hex');
        const baseUrl = domainUrl || 'https://menu.spicehub.in';
        const permanentQrUrl = `${baseUrl}/order?tenant=${hotelId}&table=${table.tableNumber}&salt=${permanentSalt}`;

        locker = await TableQrLocker.create({
          hotelId: new Types.ObjectId(hotelId),
          tableId: table._id,
          tableNumber: table.tableNumber,
          permanentSalt,
          permanentQrUrl,
          isLocked: false,
        });
      }

      res.status(200).json({
        success: true,
        locker,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * 2. Scan & Cryptographically Bind QR Session (Anti-Fraud)
   * POST /api/v1/qr-locker/scan
   */
  static async scanAndLockSession(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string || req.body.hotelId;
      const { tableNumber, salt, deviceFingerprint, clientIp } = req.body;

      if (!tableNumber || !salt) {
        res.status(400).json({ success: false, message: 'tableNumber and salt are required' });
        return;
      }

      const locker = await TableQrLocker.findOne({
        hotelId: new Types.ObjectId(hotelId),
        tableNumber: String(tableNumber).trim(),
      });

      if (!locker) {
        res.status(404).json({ success: false, message: 'Table QR Locker not registered for this table' });
        return;
      }

      // Cryptographic Salt Verification: Anti-Spoofing check
      if (locker.permanentSalt !== String(salt).trim()) {
        res.status(403).json({
          success: false,
          code: 'ANTI_FRAUD_SALT_MISMATCH',
          message: 'Security Alert: QR Code signature is invalid or tampered. Order rejected.',
        });
        return;
      }

      // Generate signed ephemeral token valid for 2 hours
      const rawToken = `${hotelId}:${locker.tableNumber}:${Date.now()}:${crypto.randomBytes(8).toString('hex')}`;
      const signature = crypto.createHmac('sha256', locker.permanentSalt).update(rawToken).digest('hex');
      const qrSessionToken = `QRT-${Buffer.from(rawToken).toString('base64url')}.${signature.slice(0, 16)}`;

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours

      locker.activeSessionToken = qrSessionToken;
      locker.sessionCreatedAt = now;
      locker.sessionExpiresAt = expiresAt;
      locker.deviceFingerprint = deviceFingerprint;
      locker.clientIp = clientIp || req.ip;
      locker.isLocked = true;
      await locker.save();

      res.status(200).json({
        success: true,
        message: 'QR session cryptographically verified and locked to table',
        qrSessionToken,
        tableNumber: locker.tableNumber,
        expiresAt,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * 3. Place QR Order with 10-Second Waiter SLA
   * POST /api/v1/qr-locker/order
   */
  static async placeQrOrderWithSla(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string || req.body.hotelId;
      const { qrSessionToken, tableNumber, items, cookingInstructions, customerName } = req.body;

      if (!qrSessionToken || !tableNumber) {
        res.status(400).json({ success: false, message: 'qrSessionToken and tableNumber are required' });
        return;
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({ success: false, message: 'Non-empty items array is required' });
        return;
      }

      // Validate session token in locker
      const locker = await TableQrLocker.findOne({
        hotelId: new Types.ObjectId(hotelId),
        tableNumber: String(tableNumber).trim(),
        activeSessionToken: qrSessionToken,
      });

      if (!locker) {
        res.status(403).json({
          success: false,
          code: 'INVALID_QR_TOKEN',
          message: 'Access Denied: Unrecognized or tampered QR session token.',
        });
        return;
      }

      if (locker.sessionExpiresAt && new Date() > locker.sessionExpiresAt) {
        res.status(403).json({
          success: false,
          code: 'EXPIRED_QR_TOKEN',
          message: 'Session Expired: Please re-scan table QR to refresh dining session.',
        });
        return;
      }

      const table = await DiningTable.findOne({
        hotelId: new Types.ObjectId(hotelId),
        tableNumber: locker.tableNumber,
      });

      // Prepare order items
      let subTotal = 0;
      const orderItems = items.map((it: any) => {
        const lineTotal = Number(it.unitPrice) * Number(it.quantity);
        subTotal += lineTotal;
        return {
          menuItemId: new Types.ObjectId(it.menuItemId),
          kitchenStationId: it.kitchenStationId ? new Types.ObjectId(it.kitchenStationId) : new Types.ObjectId(),
          name: it.name,
          unitPrice: Number(it.unitPrice),
          quantity: Number(it.quantity),
          subtotal: lineTotal,
          specialInstructions: it.specialInstructions,
          itemStatus: ItemProductionStatus.PENDING,
        };
      });

      const now = new Date();
      // 10-Second Waiter SLA Deadline (10,000 ms)
      const approvalDeadline = new Date(now.getTime() + 10000);
      const orderNumber = `KOT-${Date.now().toString().slice(-6)}`;

      const order = await RestaurantOrder.create({
        hotelId: new Types.ObjectId(hotelId),
        orderNumber,
        orderType: OrderType.DINE_IN,
        tableId: table?._id,
        items: orderItems,
        cookingInstructions,
        customerName: customerName || 'QR Guest',
        idempotencyKey: `IDEMP-QR-${crypto.randomBytes(8).toString('hex')}`,
        qrSessionToken,
        orderStatus: OverallOrderStatus.PLACED,
        approvalStatus: OrderApprovalStatus.PENDING_WAITER_APPROVAL,
        approvalDeadline,
        placedAt: now,
      });

      res.status(201).json({
        success: true,
        message: 'Order received. Dispatched to floor waiter for 10-second SLA review.',
        orderId: order._id,
        orderNumber: order.orderNumber,
        approvalStatus: order.approvalStatus,
        approvalDeadline: order.approvalDeadline,
        waiterSlaSeconds: 10,
        subTotal,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * 4. Waiter Manual Review (Approve or Reject within 10s)
   * POST /api/v1/qr-locker/order/:orderId/waiter-action
   */
  static async waiterReviewOrder(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string;
      const orderId = req.params.orderId as string;
      const { action, waiterId, rejectionReason } = req.body;

      if (!orderId || !Types.ObjectId.isValid(orderId)) {
        res.status(400).json({ success: false, message: 'Valid orderId is required' });
        return;
      }

      if (!action || !['APPROVE', 'REJECT'].includes(action)) {
        res.status(400).json({ success: false, message: 'Action must be APPROVE or REJECT' });
        return;
      }

      const order = await RestaurantOrder.findOne({
        _id: new Types.ObjectId(orderId),
        hotelId: new Types.ObjectId(hotelId),
      });

      if (!order) {
        res.status(404).json({ success: false, message: 'Order not found' });
        return;
      }

      if (order.approvalStatus !== OrderApprovalStatus.PENDING_WAITER_APPROVAL) {
        res.status(400).json({
          success: false,
          message: `Order is already resolved with status: ${order.approvalStatus}`,
        });
        return;
      }

      if (action === 'APPROVE') {
        order.approvalStatus = OrderApprovalStatus.APPROVED_BY_WAITER;
        order.orderStatus = OverallOrderStatus.ACCEPTED;
        order.approvedAt = new Date();
        if (waiterId && Types.ObjectId.isValid(waiterId)) {
          order.approvedByWaiterId = new Types.ObjectId(waiterId);
        }
      } else {
        order.approvalStatus = OrderApprovalStatus.REJECTED_BY_WAITER;
        order.orderStatus = OverallOrderStatus.CANCELLED;
        order.cancelledAt = new Date();
        order.cancellationReason = rejectionReason || 'Rejected by floor waiter';
      }

      await order.save();

      res.status(200).json({
        success: true,
        message: `Order ${action === 'APPROVE' ? 'approved and sent to Kitchen KDS' : 'rejected'} by waiter`,
        order,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * 5. 10-Second Auto-Approval SLA Sweep Job
   * POST /api/v1/qr-locker/sweep-auto-approvals
   */
  static async sweepAutoApprovals(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string;
      const now = new Date();

      // Find all orders that crossed their 10s deadline without waiter action
      const expiredOrders = await RestaurantOrder.find({
        hotelId: new Types.ObjectId(hotelId),
        approvalStatus: OrderApprovalStatus.PENDING_WAITER_APPROVAL,
        approvalDeadline: { $lte: now },
      });

      const autoApprovedIds: string[] = [];

      for (const ord of expiredOrders) {
        ord.approvalStatus = OrderApprovalStatus.AUTO_APPROVED_TIMEOUT;
        ord.orderStatus = OverallOrderStatus.ACCEPTED; // Routed directly to kitchen!
        ord.acceptedAt = now;
        ord.approvedAt = now;
        await ord.save();
        autoApprovedIds.push(ord.orderNumber);
      }

      res.status(200).json({
        success: true,
        message: `Swept ${expiredOrders.length} expired orders. Auto-approved and routed to KDS.`,
        sweptCount: expiredOrders.length,
        autoApprovedOrderNumbers: autoApprovedIds,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * 6. Release QR Session (Guest departures / table cleared)
   * POST /api/v1/qr-locker/release-session
   */
  static async releaseQrSession(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string;
      const { tableNumber } = req.body;

      if (!tableNumber) {
        res.status(400).json({ success: false, message: 'tableNumber is required' });
        return;
      }

      const locker = await TableQrLocker.findOne({
        hotelId: new Types.ObjectId(hotelId),
        tableNumber: String(tableNumber).trim(),
      });

      if (!locker) {
        res.status(404).json({ success: false, message: 'Table QR locker not found' });
        return;
      }

      locker.activeSessionToken = undefined;
      locker.sessionExpiresAt = undefined;
      locker.isLocked = false;
      await locker.save();

      res.status(200).json({
        success: true,
        message: `Table ${tableNumber} QR session cleared and unlocked`,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
