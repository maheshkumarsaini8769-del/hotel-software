import { Response } from 'express';
import { Types } from 'mongoose';
import { DynamicUpiQr, UpiQrStatus } from '../models/DynamicUpiQr';
import { TenantRequest } from '../types';

/**
 * Generates an NPCI-compliant locked dynamic UPI URI.
 * Format: upi://pay?pa=<vpa>&pn=<payeeName>&am=<amount>&cu=INR&tn=<note>&tr=<ref>
 */
export const buildNpciUpiUri = (
  merchantVpa: string,
  merchantName: string,
  amount: number,
  transactionRef: string,
  note: string
): string => {
  const params = new URLSearchParams({
    pa: merchantVpa,
    pn: merchantName,
    am: amount.toFixed(2),
    cu: 'INR',
    tn: note,
    tr: transactionRef,
  });
  return `upi://pay?${params.toString()}`;
};

/**
 * 1. Generate Waiter Handheld Dynamic Locked UPI QR
 * POST /api/v1/dynamic-upi/generate
 */
export const generateDynamicQr = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const {
      billId,
      orderId,
      tableNumber,
      tableId,
      amount,
      expiryMinutes = 10,
    } = req.body;

    if (!billId || !tableNumber || amount === undefined || amount === null) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_PAYLOAD',
        message: 'billId, tableNumber, and amount are required',
      });
      return;
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_AMOUNT',
        message: 'Amount must be greater than zero',
      });
      return;
    }

    const waiterUserId = req.user?.userId ? new Types.ObjectId(req.user.userId) : new Types.ObjectId();
    const waiterName = (req.user as any)?.name || req.body.waiterName || 'Floor Waiter';

    // Auto-cancel any existing PENDING QR for this bill to avoid duplicate live QRs
    await DynamicUpiQr.updateMany(
      { hotelId, billId, status: UpiQrStatus.PENDING },
      { $set: { status: UpiQrStatus.CANCELLED } }
    );

    // Authoritative Hotel Merchant VPA locked to server/tenant config (Never client-dictated)
    const merchantVpa = process.env.MERCHANT_VPA || 'spicehub.hotel@upi';
    const merchantName = process.env.MERCHANT_NAME || 'SpiceHub Grand Hotel';

    const transactionRef = `UPI_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const note = `Table ${tableNumber} Bill ${billId}`.trim();

    const upiUri = buildNpciUpiUri(merchantVpa, merchantName, parsedAmount, transactionRef, note);

    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    const qrDoc = await DynamicUpiQr.create({
      hotelId,
      billId,
      orderId,
      tableNumber,
      tableId,
      waiterUserId,
      waiterName,
      amount: parsedAmount,
      currency: 'INR',
      merchantVpa,
      merchantName,
      transactionRef,
      upiUri,
      status: UpiQrStatus.PENDING,
      expiresAt,
      soundboxNotified: false,
    });

    res.status(201).json({
      success: true,
      message: `Dynamic locked UPI QR generated for Table ${tableNumber}`,
      qr: qrDoc,
      upiUri,
      transactionRef,
      amount: parsedAmount,
      expiresAt,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

/**
 * 2. Get Dynamic QR Live Status
 * GET /api/v1/dynamic-upi/status/:transactionRef
 */
export const getQrStatus = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const { transactionRef } = req.params;

    const filter: any = { transactionRef };
    if (hotelId) {
      filter.hotelId = hotelId;
    }

    const qrDoc = await DynamicUpiQr.findOne(filter);
    if (!qrDoc) {
      res.status(404).json({ success: false, errorCode: 'QR_NOT_FOUND', message: 'UPI QR transaction not found' });
      return;
    }

    // Auto-expire if past expiry deadline and still PENDING
    const now = new Date();
    if (qrDoc.status === UpiQrStatus.PENDING && now > qrDoc.expiresAt) {
      qrDoc.status = UpiQrStatus.EXPIRED;
      await qrDoc.save();
    }

    const timeRemainingSeconds = Math.max(0, Math.floor((qrDoc.expiresAt.getTime() - now.getTime()) / 1000));

    res.status(200).json({
      success: true,
      qr: qrDoc,
      status: qrDoc.status,
      amount: qrDoc.amount,
      tableNumber: qrDoc.tableNumber,
      timeRemainingSeconds,
      isPaid: qrDoc.status === UpiQrStatus.PAID,
      soundboxNotified: qrDoc.soundboxNotified,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

/**
 * 3. Soundbox & Payment Gateway Webhook
 * POST /api/v1/dynamic-upi/soundbox-webhook
 */
export const soundboxWebhook = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const soundboxSecret = req.headers['x-soundbox-secret'] || req.headers['x-webhook-secret'];
    const expectedSecret = process.env.SOUNDBOX_WEBHOOK_SECRET || 'dev_soundbox_secret_key';

    if (soundboxSecret !== expectedSecret) {
      res.status(401).json({
        success: false,
        errorCode: 'INVALID_WEBHOOK_SIGNATURE',
        message: 'Invalid soundbox webhook credentials',
      });
      return;
    }

    const {
      transactionRef,
      paymentGatewayRef = `PG_${Date.now()}`,
      payerVpa = 'customer@upi',
      amount,
      status = 'SUCCESS',
    } = req.body;

    if (!transactionRef) {
      res.status(400).json({
        success: false,
        errorCode: 'MISSING_TRANSACTION_REF',
        message: 'transactionRef is required',
      });
      return;
    }

    const existingQr = await DynamicUpiQr.findOne({ transactionRef });
    if (!existingQr) {
      res.status(404).json({
        success: false,
        errorCode: 'TRANSACTION_NOT_FOUND',
        message: 'Transaction reference not found',
      });
      return;
    }

    // Idempotency: if already paid, respond immediately
    if (existingQr.status === UpiQrStatus.PAID) {
      res.status(200).json({
        success: true,
        message: 'Transaction already paid and acknowledged (Idempotent)',
        qr: existingQr,
        alreadyProcessed: true,
      });
      return;
    }

    if (existingQr.status === UpiQrStatus.CANCELLED || existingQr.status === UpiQrStatus.EXPIRED) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_TRANSACTION_STATE',
        message: `Cannot credit transaction in ${existingQr.status} state`,
      });
      return;
    }

    if (status !== 'SUCCESS') {
      res.status(400).json({
        success: false,
        errorCode: 'PAYMENT_FAILED_STATUS',
        message: 'Gateway reported payment failure',
      });
      return;
    }

    if (amount !== undefined && amount !== null && Number(amount) !== existingQr.amount) {
      res.status(400).json({
        success: false,
        errorCode: 'AMOUNT_MISMATCH',
        message: `Webhook amount (₹${amount}) does not match billed QR amount (₹${existingQr.amount})`,
      });
      return;
    }

    const announcement = `Received Rupees ${existingQr.amount} on UPI for Table ${existingQr.tableNumber}`;

    // Concurrency safe atomic state update
    const updatedQr = await DynamicUpiQr.findOneAndUpdate(
      { transactionRef, status: UpiQrStatus.PENDING },
      {
        $set: {
          status: UpiQrStatus.PAID,
          paidAt: new Date(),
          paymentGatewayRef,
          payerVpa,
          soundboxAnnouncement: announcement,
          soundboxNotified: true,
          soundboxNotifiedAt: new Date(),
          webhookReceivedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!updatedQr) {
      // Race condition safety: caught by atomic condition
      const checkQr = await DynamicUpiQr.findOne({ transactionRef });
      res.status(200).json({
        success: true,
        message: 'Transaction resolved concurrently',
        qr: checkQr,
        alreadyProcessed: true,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Soundbox payment verified and broadcast successfully',
      qr: updatedQr,
      soundboxAnnouncement: announcement,
      broadcastAudioPayload: {
        voiceText: announcement,
        language: 'en-IN',
        volume: 100,
        speakerDevice: 'SOUNDBOX_PRIMARY',
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

/**
 * 4. Cancel Dynamic UPI QR
 * POST /api/v1/dynamic-upi/cancel/:transactionRef
 */
export const cancelDynamicQr = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { transactionRef } = req.params;

    const updatedQr = await DynamicUpiQr.findOneAndUpdate(
      { hotelId, transactionRef, status: UpiQrStatus.PENDING },
      { $set: { status: UpiQrStatus.CANCELLED } },
      { new: true }
    );

    if (!updatedQr) {
      const existing = await DynamicUpiQr.findOne({ hotelId, transactionRef });
      if (!existing) {
        res.status(404).json({ success: false, errorCode: 'QR_NOT_FOUND', message: 'UPI QR transaction not found' });
        return;
      }
      res.status(400).json({
        success: false,
        errorCode: 'CANNOT_CANCEL',
        message: `Cannot cancel QR in ${existing.status} status`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Dynamic UPI QR cancelled for Table ${updatedQr.tableNumber}`,
      qr: updatedQr,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

/**
 * 5. Get Active QR for a Table
 * GET /api/v1/dynamic-upi/active-table/:tableNumber
 */
export const getActiveTableQr = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { tableNumber } = req.params;
    const now = new Date();

    const activeQr = await DynamicUpiQr.findOne({
      hotelId,
      tableNumber,
      status: UpiQrStatus.PENDING,
      expiresAt: { $gt: now },
    });

    res.status(200).json({
      success: true,
      activeQr: activeQr || null,
      hasActiveQr: Boolean(activeQr),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};
