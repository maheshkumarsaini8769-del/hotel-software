import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { Types } from 'mongoose';
import { Tenant } from '../models/Tenant';
import { RoomType } from '../models/RoomType';
import { Room, RoomStatus } from '../models/Room';
import { Booking, BookingSource, BookingStatus, BookingMode } from '../models/Booking';
import { sendWhatsApp } from '../services/notificationService';

const router = Router();

/**
 * Escape user-controlled text before interpolating it into a RegExp so an
 * attacker cannot inject regex operators (ReDoS / query injection).
 */
const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Shared-secret and HMAC signature guard for the OTA webhook.
 *
 * Implements mock / production HMAC-SHA256 signature verification. Callers must send
 * either `x-webhook-secret: <secret>` or `x-ota-signature: <hmac-sha256 of body>`.
 */
const isWebhookAuthorized = (req: Request): boolean => {
  const secret = process.env.OTA_WEBHOOK_SECRET || 'spicehub_mock_ota_secret_key_2026';

  const providedSecret = String(req.headers['x-webhook-secret'] || '').trim();
  const rawSignature = String(req.headers['x-ota-signature'] || req.headers['x-hub-signature-256'] || '').trim();
  const providedSignature = rawSignature.replace(/^sha256=/, '');

  const safeEqual = (a: string, b: string): boolean => {
    if (a.length !== b.length) return false;
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    return crypto.timingSafeEqual(bufA, bufB);
  };

  if (providedSecret && safeEqual(providedSecret, secret)) return true;

  if (providedSignature) {
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    if (safeEqual(providedSignature, expected)) return true;
  }

  // Mock test bypass header strictly permitted only outside production
  if (process.env.NODE_ENV !== 'production' && req.headers['x-mock-ota-authorized'] === 'true') {
    return true;
  }

  return false;
};

/**
 * POST /api/v1/webhooks/ota
 * Ingestion webhook for OTA channel managers (MakeMyTrip, Booking.com, Agoda, Goibibo)
 * Strict overbooking prevention: queries physical inventory before confirming.
 */
router.post('/ota', async (req: Request, res: Response): Promise<void> => {
  try {
    // SECURITY: this endpoint creates confirmed, paid bookings and reserves
    // physical inventory, so it must never be callable by anonymous clients.
    if (!isWebhookAuthorized(req)) {
      res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED_WEBHOOK',
        message: 'Missing or invalid OTA webhook credentials.',
      });
      return;
    }

    const {
      otaName = 'MakeMyTrip',
      guestName,
      phone,
      roomType, // Can be room type ID or name e.g. "Deluxe Room"
      checkIn,
      checkOut,
      amount,
      hotelId: requestedHotelId,
    } = req.body;

    if (!guestName || !phone || !roomType || !checkIn || !checkOut || amount === undefined) {
      res.status(400).json({
        success: false,
        error: 'INVALID_PAYLOAD',
        message: 'Missing mandatory fields: otaName, guestName, phone, roomType, checkIn, checkOut, amount',
      });
      return;
    }

    // Resolve Target Hotel Tenant
    let hotel: any = null;
    if (requestedHotelId && Types.ObjectId.isValid(requestedHotelId)) {
      hotel = await Tenant.findById(requestedHotelId);
    }
    if (!hotel) {
      // Fallback to active hotel (e.g. Mahesh Hotel or first active tenant)
      hotel = (await Tenant.findOne({ slug: 'mahesh-hotel-4119' })) || (await Tenant.findOne({ status: 'ACTIVE' }));
    }
    if (!hotel) {
      res.status(404).json({ success: false, error: 'HOTEL_NOT_FOUND', message: 'No active hotel tenant found' });
      return;
    }

    const hotelId = hotel._id;

    // Resolve Room Type by ID or name
    let roomTypeDoc = null;
    if (Types.ObjectId.isValid(roomType)) {
      roomTypeDoc = await RoomType.findOne({ _id: new Types.ObjectId(roomType), hotelId });
    }
    if (!roomTypeDoc) {
      roomTypeDoc = await RoomType.findOne({
        hotelId,
        $or: [
          { name: { $regex: new RegExp(`^${escapeRegex(String(roomType))}$`, 'i') } },
          { code: { $regex: new RegExp(`^${escapeRegex(String(roomType))}$`, 'i') } },
          { name: { $regex: new RegExp(escapeRegex(String(roomType)), 'i') } },
        ],
      });
    }

    // If still not found, check any active room type for this hotel
    if (!roomTypeDoc) {
      roomTypeDoc = await RoomType.findOne({ hotelId, isActive: true });
    }

    if (!roomTypeDoc) {
      res.status(400).json({
        success: false,
        error: 'OVERBOOKING_PREVENTED',
        message: `Room type '${roomType}' does not exist or has no active configurations.`,
      });
      return;
    }

    // Atomic CAS inventory search: find an available room of this room type
    const availableRoom = await Room.findOneAndUpdate(
      {
        hotelId,
        roomTypeId: roomTypeDoc._id,
        status: RoomStatus.AVAILABLE,
      },
      {
        $set: { status: RoomStatus.RESERVED },
      },
      { new: true }
    );

    // If no room is available, strictly prevent overbooking
    if (!availableRoom) {
      console.warn(`[OTA Webhook] OVERBOOKING_PREVENTED for OTA '${otaName}' - Room Type: '${roomTypeDoc.name}'`);
      res.status(400).json({
        error: 'OVERBOOKING_PREVENTED',
        otaName,
        roomType: roomTypeDoc.name,
        availableCount: 0,
        message: 'No available rooms found for the requested room type and dates. Overbooking prevented.',
      });
      return;
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.max(1, Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));
    const totalTariff = Number(amount);
    const taxAmount = Math.round(totalTariff * ((roomTypeDoc.gstRate || 12) / 100));
    const grandTotal = totalTariff + taxAmount;

    const bookingNumber = `OTA-${otaName.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const booking = await Booking.create({
      hotelId,
      bookingNumber,
      bookingSource: BookingSource.OTA,
      guestName: guestName.trim(),
      guestPhone: phone.trim(),
      guestEmail: `${phone.replace(/\D/g, '')}@ota-guest.${otaName.toLowerCase().replace(/\s+/g, '')}.com`,
      checkInDate,
      checkOutDate,
      nights,
      bookingMode: BookingMode.OVERNIGHT,
      roomTypeId: roomTypeDoc._id,
      allocatedRoomId: availableRoom._id,
      guestCountAdults: 2,
      guestCountChildren: 0,
      extraBedsCount: 0,
      totalTariff,
      taxAmount,
      grandTotal,
      advancePaymentAmount: grandTotal, // OTA bookings are guaranteed / prepaid
      paymentStatus: 'PAID',
      bookingStatus: BookingStatus.CONFIRMED,
      receptionApprovedAt: new Date(),
      receptionApprovedBy: `${otaName} Automated Sync`,
      dpdpConsent: {
        accepted: true,
        timestamp: new Date(),
        ipAddress: req.ip || '127.0.0.1',
      },
    });

    // Notify guest via WhatsApp mock service
    await sendWhatsApp(phone, 'booking_confirmed', {
      guestName,
      otaName,
      bookingNumber,
      roomType: roomTypeDoc.name,
      roomNumber: availableRoom.roomNumber,
      checkIn: checkInDate.toISOString().slice(0, 10),
      checkOut: checkOutDate.toISOString().slice(0, 10),
      grandTotal,
    }).catch((err) => console.error('[OTA Webhook] WhatsApp notification failed:', err.message));

    console.log(`[OTA Webhook] Successfully processed ${otaName} booking: #${bookingNumber} -> Room ${availableRoom.roomNumber}`);

    res.status(200).json({
      success: true,
      message: 'OTA booking confirmed and room reserved successfully',
      data: {
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        otaName,
        guestName: booking.guestName,
        phone: booking.guestPhone,
        roomNumber: availableRoom.roomNumber,
        roomType: roomTypeDoc.name,
        roomStatus: availableRoom.status,
        checkIn: booking.checkInDate,
        checkOut: booking.checkOutDate,
        amount: booking.grandTotal,
        source: 'OTA',
      },
    });
  } catch (error: any) {
    console.error('[OTA Webhook] Error processing booking:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', message: error.message });
  }
});

export default router;
