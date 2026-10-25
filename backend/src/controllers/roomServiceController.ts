import { Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { getJwtSecret, isDevAuthBypassEnabled } from '../config/security';
import { Room, RoomStatus } from '../models/Room';
import { Stay, StayStatus } from '../models/Stay';
import { Booking } from '../models/Booking';
import { GuestSession } from '../models/GuestSession';
import { MenuItem } from '../models/MenuItem';
import { RestaurantOrder, OrderType, OverallOrderStatus, ItemProductionStatus } from '../models/RestaurantOrder';
import { MasterFolio } from '../models/MasterFolio';
import { FolioLineItem, DepartmentType } from '../models/FolioLineItem';
import { ServiceRequest, ServiceRequestType, ServiceRequestPriority, ServiceRequestStatus } from '../models/ServiceRequest';
import { Tenant } from '../models/Tenant';
import { GuestProfile } from '../models/GuestProfile';
import { RoomType } from '../models/RoomType';
import { io } from '../index';
import { TenantRequest } from '../types';
import { generateReferenceNumber } from '../utils/referenceNumber';

const GUEST_SESSION_PURPOSE = 'GUEST_SESSION';
const GUEST_SESSION_TTL_MS = 24 * 3600000;

const hashGuestToken = (token: string): string =>
  crypto.createHash('sha256').update(String(token)).digest('hex');

const signGuestSessionToken = (claims: {
  hotelId: string;
  stayId: string;
  roomId: string;
  roomNumber: string;
}): string =>
  jwt.sign(
    {
      purpose: GUEST_SESSION_PURPOSE,
      hotelId: String(claims.hotelId),
      stayId: String(claims.stayId),
      roomId: String(claims.roomId),
      roomNumber: String(claims.roomNumber),
    },
    getJwtSecret(),
    { expiresIn: '24h' }
  );

const guestQrRequired = (): boolean => !isDevAuthBypassEnabled() && process.env.NODE_ENV !== 'test';

// 1. Resolve Permanent Room QR Code & Auto-Restore Guest Session
export const resolvePermanentRoomQR = async (req: Request, res: Response): Promise<void> => {
  try {
    const { hotelId, roomId, roomNumber } = req.query;
    const qrToken = req.query.qrToken || req.query.token;

    if (
      !hotelId ||
      !Types.ObjectId.isValid(hotelId as string) ||
      (!roomId && !roomNumber) ||
      (roomId && !Types.ObjectId.isValid(roomId as string))
    ) {
      res.status(400).json({ success: false, errorCode: 'INVALID_QUERY', message: 'Missing or invalid hotelId, roomId/roomNumber' });
      return;
    }

    const roomQuery: Record<string, any> = {
      hotelId: new Types.ObjectId(hotelId as string),
    };
    if (roomId) {
      roomQuery._id = new Types.ObjectId(roomId as string);
    } else {
      roomQuery.roomNumber = String(Array.isArray(roomNumber) ? roomNumber[0] : roomNumber).trim();
    }

    const room = await Room.findOne(roomQuery).populate('roomTypeId');

    if (!room) {
      res.status(404).json({ success: false, errorCode: 'ROOM_NOT_FOUND', message: 'Physical room does not exist' });
      return;
    }

    const strictQr = guestQrRequired();
    if (strictQr && !room.permanentQrCodeHash) {
      res.status(403).json({
        success: false,
        errorCode: 'ROOM_QR_NOT_CONFIGURED',
        message: 'This room QR has not been provisioned by the hotel yet.',
      });
      return;
    }

    if (!qrToken) {
      if (strictQr) {
        res.status(403).json({
          success: false,
          errorCode: 'INVALID_QR_TOKEN',
          message: 'A valid room QR token is required to open the guest portal.',
        });
        return;
      }
    } else {
      const qrHash = hashGuestToken(String(qrToken));
      const legacyDevMatch =
        !strictQr &&
        Boolean(room.permanentQrCodeHash) &&
        String(qrToken) === String(room.permanentQrCodeHash);
      if (room.permanentQrCodeHash && qrHash !== room.permanentQrCodeHash && !legacyDevMatch) {
        res.status(403).json({ success: false, errorCode: 'INVALID_QR_TOKEN', message: 'Invalid or forged room QR security token' });
        return;
      }
    }

    // Check if room has an ACTIVE stay (currentStayId is a fast path, but never trust it alone)
    let stay = room.currentStayId
      ? await Stay.findOne({
          _id: room.currentStayId,
          hotelId: room.hotelId,
          roomId: room._id,
          stayStatus: StayStatus.ACTIVE,
        }).populate('guestId', 'name phone')
      : null;

    if (!stay) {
      stay = await Stay.findOne({
        hotelId: room.hotelId,
        roomId: room._id,
        stayStatus: StayStatus.ACTIVE,
      })
        .sort({ checkInTimestamp: -1, createdAt: -1 })
        .populate('guestId', 'name phone');
    }

    if (!stay) {
      res.status(200).json({
        success: false,
        errorCode: 'NO_ACTIVE_STAY',
        message: 'No active guest stay in this room. Redirecting to reception/booking.',
        redirectAction: 'PUBLIC_BOOKING_OR_RECEPTION',
      });
      return;
    }

    const booking = await Booking.findById(stay.bookingId);

    // Create a browser session bound to the QR-verified stay. The JWT is also
    // usable as a Socket.IO guest token, while only its hash is persisted.
    const rawSessionToken = signGuestSessionToken({
      hotelId: String(room.hotelId),
      stayId: String(stay._id),
      roomId: String(room._id),
      roomNumber: String(room.roomNumber),
    });
    const tokenHash = hashGuestToken(rawSessionToken);
    const expiresAt = new Date(Date.now() + GUEST_SESSION_TTL_MS);

    const guestSession = await GuestSession.create({
      hotelId: room.hotelId,
      stayId: stay._id,
      roomId: room._id,
      sessionTokenHash: tokenHash,
      lastKnownRoute: '/guest-portal/home',
      expiresAt,
    });

    const hotelTenant = await Tenant.findById(room.hotelId).select('enabledPortals');
    const waiterEnabled = hotelTenant?.enabledPortals ? hotelTenant.enabledPortals.includes('waiter') : true;

    res.status(200).json({
      success: true,
      message: 'Active stay resolved successfully',
      data: {
        sessionToken: rawSessionToken,
        hotelId: room.hotelId,
        waiterEnabled,
        roomId: room._id,
        roomNumber: room.roomNumber,
        roomType: (room.roomTypeId as any)?.name || 'Room',
        roomTypeName: (room.roomTypeId as any)?.name || 'Room',
        guestName:
          (stay.guestId as any)?.name ||
          (booking as any)?.guestName ||
          'Valued Guest',
        checkInDate: stay.checkInTimestamp || booking?.checkInDate,
        expectedCheckOutDate: stay.expectedCheckOutTimestamp || booking?.checkOutDate,
        checkOutDate: stay.expectedCheckOutTimestamp || booking?.checkOutDate,
        stayId: stay._id,
        masterFolioId: stay.masterFolioId,
        stayStatus: stay.stayStatus,
        wifiSsid: 'TajGateway_HighSpeed',
        wifiPassword: `TajGuest@${room.roomNumber}`,
        lastKnownRoute: guestSession.lastKnownRoute,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 1b. Verify Resident Guest Stay by Room Number + Registered Mobile Number
export const verifyResidentStay = async (req: Request, res: Response): Promise<void> => {
  try {
    const { hotelId, roomNumber, guestPhone } = req.body;

    if (!hotelId || !Types.ObjectId.isValid(hotelId)) {
      res.status(400).json({ success: false, errorCode: 'INVALID_HOTEL', message: 'Valid hotelId is required' });
      return;
    }

    if (!roomNumber || !guestPhone) {
      res.status(400).json({
        success: false,
        errorCode: 'MISSING_FIELDS',
        message: 'Room number and registered phone number are required',
      });
      return;
    }

    const room = await Room.findOne({
      hotelId: new Types.ObjectId(hotelId),
      roomNumber: String(roomNumber).trim(),
    }).populate('roomTypeId');

    if (!room) {
      res.status(404).json({
        success: false,
        errorCode: 'ROOM_NOT_FOUND',
        message: `Room ${roomNumber} does not exist at this hotel.`,
      });
      return;
    }

    // Check for active stay in this room
    let stay = room.currentStayId
      ? await Stay.findOne({
          _id: room.currentStayId,
          hotelId: room.hotelId,
          roomId: room._id,
          stayStatus: StayStatus.ACTIVE,
        }).populate('guestId')
      : null;

    if (!stay) {
      stay = await Stay.findOne({
        hotelId: room.hotelId,
        roomId: room._id,
        stayStatus: StayStatus.ACTIVE,
      })
        .sort({ checkInTimestamp: -1, createdAt: -1 })
        .populate('guestId');
    }

    if (!stay) {
      res.status(404).json({
        success: false,
        errorCode: 'NO_ACTIVE_STAY',
        message: `No active check-in found for Room ${roomNumber}. If you wish to stay, please book a room from our catalog.`,
        redirectAction: 'PUBLIC_BOOKING_OR_RECEPTION',
      });
      return;
    }

    // Match guest phone
    const booking = await Booking.findById(stay.bookingId);
    const cleanInputPhone = String(guestPhone).replace(/[^0-9]/g, '').slice(-10);
    const guestObj = stay.guestId as any;
    const stayPhone = String(guestObj?.phone || '').replace(/[^0-9]/g, '').slice(-10);
    const bookingPhone = String(booking?.guestPhone || '').replace(/[^0-9]/g, '').slice(-10);

    const isMatch =
      (stayPhone && cleanInputPhone.endsWith(stayPhone)) ||
      (bookingPhone && cleanInputPhone.endsWith(bookingPhone)) ||
      (cleanInputPhone && (stayPhone.endsWith(cleanInputPhone) || bookingPhone.endsWith(cleanInputPhone)));

    if (!isMatch) {
      res.status(401).json({
        success: false,
        errorCode: 'PHONE_MISMATCH',
        message: `The mobile number entered does not match the active guest registration for Room ${roomNumber}. Please contact the front desk.`,
      });
      return;
    }

    const rawSessionToken = signGuestSessionToken({
      hotelId: String(room.hotelId),
      stayId: String(stay._id),
      roomId: String(room._id),
      roomNumber: String(room.roomNumber),
    });
    const tokenHash = hashGuestToken(rawSessionToken);
    const expiresAt = new Date(Date.now() + GUEST_SESSION_TTL_MS);

    await GuestSession.create({
      hotelId: room.hotelId,
      stayId: stay._id,
      roomId: room._id,
      sessionTokenHash: tokenHash,
      lastKnownRoute: '/guest-portal/home',
      expiresAt,
    });

    const hotelTenant = await Tenant.findById(room.hotelId).select('enabledPortals');
    const waiterEnabled = hotelTenant?.enabledPortals ? hotelTenant.enabledPortals.includes('waiter') : true;

    res.status(200).json({
      success: true,
      message: `Welcome back, ${guestObj?.name || booking?.guestName || 'Valued Guest'}! Verified for Room ${room.roomNumber}.`,
      data: {
        sessionToken: rawSessionToken,
        hotelId: room.hotelId,
        waiterEnabled,
        roomId: room._id,
        roomNumber: room.roomNumber,
        roomType: (room.roomTypeId as any)?.name || 'Room',
        guestName: guestObj?.name || booking?.guestName || 'Valued Guest',
        checkInDate: stay.checkInTimestamp || booking?.checkInDate,
        expectedCheckOutDate: stay.expectedCheckOutTimestamp || booking?.checkOutDate,
        checkOutDate: stay.expectedCheckOutTimestamp || booking?.checkOutDate,
        stayId: stay._id,
        masterFolioId: stay.masterFolioId,
        stayStatus: stay.stayStatus,
        wifiSsid: 'TajGateway_HighSpeed',
        wifiPassword: `TajGuest@${room.roomNumber}`,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// 2. Browser Session Continuity & Last-Page Reopen (Section 4.16)
export const restoreLastPageSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, updatedRoute } = req.body;

    if (!token) {
      res.status(401).json({ success: false, errorCode: 'TOKEN_REQUIRED' });
      return;
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const session = await GuestSession.findOne({
      sessionTokenHash: tokenHash,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      res.status(401).json({
        success: false,
        errorCode: 'SESSION_EXPIRED',
        message: 'Guest session expired or invalid. Please re-scan room QR.',
      });
      return;
    }

    // Revalidate that Stay is STILL ACTIVE (Not checked-out while tab was minimized!)
    const stay = await Stay.findById(session.stayId);
    if (!stay || stay.stayStatus !== StayStatus.ACTIVE) {
      session.isActive = false;
      await session.save();

      res.status(403).json({
        success: false,
        errorCode: 'STAY_CHECKED_OUT',
        message: 'This room has already been checked out. Session terminated.',
      });
      return;
    }

    // If client is saving latest route during SPA navigation
    if (updatedRoute) {
      session.lastKnownRoute = updatedRoute;
      await session.save();
    }

    const room = await Room.findById(session.roomId);

    res.status(200).json({
      success: true,
      message: 'Session valid and restored',
      data: {
        lastKnownRoute: session.lastKnownRoute,
        roomNumber: room?.roomNumber,
        stayId: session.stayId,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. In-Room Dining Order Placement (Shared KDS Routing & Master Folio Post)
export const placeRoomServiceOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { items, cookingInstructions, chargeToRoom = true } = req.body;
    const guestToken = (req.headers['x-guest-session-token'] || req.body.token) as string;
    const resolved = await resolveGuestSession(guestToken);

    let hotelId = String(req.body.hotelId || '');
    let stayId = String(req.body.stayId || '');
    let roomId = String(req.body.roomId || '');

    if (resolved) {
      // Never trust client-supplied IDs when a verified guest session exists.
      hotelId = String(resolved.session.hotelId);
      stayId = String(resolved.session.stayId);
      roomId = String(resolved.session.roomId);
    } else {
      if (guestToken) {
        res.status(401).json({ success: false, errorCode: 'INVALID_SESSION', message: 'Guest session is invalid or expired' });
        return;
      }
      if (!isDevAuthBypassEnabled() && process.env.NODE_ENV !== 'test') {
        res.status(401).json({ success: false, errorCode: 'INVALID_SESSION', message: 'Active guest session required' });
        return;
      }
      if (
        !Types.ObjectId.isValid(hotelId) ||
        !Types.ObjectId.isValid(stayId) ||
        !Types.ObjectId.isValid(roomId)
      ) {
        res.status(400).json({ success: false, errorCode: 'INVALID_QUERY', message: 'Valid hotelId, stayId and roomId are required' });
        return;
      }
    }

    const idempotencyKey = (req.headers['x-idempotency-key'] || req.body.idempotencyKey) as string;
    if (!idempotencyKey) {
      res.status(400).json({ success: false, errorCode: 'IDEMPOTENCY_KEY_REQUIRED' });
      return;
    }

    // Check duplicate submission
    const existingOrder = await RestaurantOrder.findOne({
      hotelId: new Types.ObjectId(hotelId),
      idempotencyKey,
    });

    if (existingOrder) {
      res.status(200).json({ success: true, message: 'Order already processed (idempotent)', data: existingOrder });
      return;
    }

    const stay = await Stay.findOne({
      _id: new Types.ObjectId(stayId),
      hotelId: new Types.ObjectId(hotelId),
      roomId: new Types.ObjectId(roomId),
      stayStatus: StayStatus.ACTIVE,
    });
    if (!stay) {
      res.status(400).json({ success: false, errorCode: 'INVALID_STAY', message: 'Active stay not found' });
      return;
    }

    const room = await Room.findOne({
      _id: new Types.ObjectId(roomId),
      hotelId: new Types.ObjectId(hotelId),
    });
    if (!room) {
      res.status(404).json({ success: false, errorCode: 'ROOM_NOT_FOUND', message: 'Physical room not found' });
      return;
    }

    // Shift 52: Atomic Folio Lock Guard - Prevent posting charges if room folio is locked for checkout
    if (chargeToRoom && stay.masterFolioId) {
      const folio = await MasterFolio.findOne({
        _id: stay.masterFolioId,
        hotelId: new Types.ObjectId(hotelId),
      });
      if (folio && folio.folioStatus !== 'OPEN') {
        res.status(409).json({
          success: false,
          errorCode: 'FOLIO_LOCKED_CHECKOUT_IN_PROGRESS',
          message: `Cannot place room service order: Folio is ${folio.folioStatus.toLowerCase()} for check-out settlement.`,
          data: {
            folioId: folio._id,
            folioStatus: folio.folioStatus,
            lockedAt: folio.lockedAt,
            lockReason: folio.lockReason,
          },
        });
        return;
      }
    }

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, errorCode: 'EMPTY_ORDER', message: 'Order must contain at least one item' });
      return;
    }

    // Validate Items & Calculate Authoritative Subtotal
    const validatedItems = [];
    let orderSubtotal = 0;

    for (const item of items) {
      const qty = Number(item.quantity);
      if (!Number.isInteger(qty) || qty <= 0) {
        res.status(400).json({
          success: false,
          errorCode: 'INVALID_QUANTITY',
          message: `Quantity for item must be a positive integer, received: ${item.quantity}`,
        });
        return;
      }

      const dbDish = await MenuItem.findOne({
        _id: new Types.ObjectId(item.menuItemId),
        hotelId: new Types.ObjectId(hotelId),
      });
      if (!dbDish || !dbDish.isAvailable) {
        res.status(400).json({
          success: false,
          errorCode: 'ITEM_UNAVAILABLE',
          message: `Dish '${item.name || 'Selected item'}' is currently out of stock (86)`,
        });
        return;
      }

      const itemTotal = dbDish.basePrice * qty;
      orderSubtotal += itemTotal;

      validatedItems.push({
        menuItemId: dbDish._id,
        kitchenStationId: dbDish.kitchenStationId,
        name: dbDish.name,
        unitPrice: dbDish.basePrice,
        quantity: qty,
        subtotal: itemTotal,
        specialInstructions: item.specialInstructions,
        itemStatus: ItemProductionStatus.PENDING,
      });
    }

    // GST for In-Room Dining (5%)
    const taxAmount = Math.round((orderSubtotal * 0.05) * 100) / 100;
    const grandTotal = orderSubtotal + taxAmount;

    const orderNumber = generateReferenceNumber('RS');

    // 1. Create Restaurant Order with ROOM_SERVICE type
    const order = await RestaurantOrder.create({
      hotelId: new Types.ObjectId(hotelId),
      orderNumber,
      orderType: OrderType.ROOM_SERVICE,
      stayId: stay._id,
      roomId: room._id,
      folioId: stay.masterFolioId,
      items: validatedItems,
      cookingInstructions,
      orderStatus: OverallOrderStatus.PLACED,
      idempotencyKey,
    });

    // 2. Post Charge to Guest Master Folio if chargeToRoom is true
    if (chargeToRoom && stay.masterFolioId) {
      await FolioLineItem.create({
        hotelId: new Types.ObjectId(hotelId),
        folioId: stay.masterFolioId,
        department: DepartmentType.ROOM_SERVICE,
        description: `Room Service Food (Order #${order.orderNumber})`,
        referenceId: order._id,
        rate: orderSubtotal,
        quantity: 1,
        taxRate: 5,
        taxAmount,
        netAmount: grandTotal,
      });

      // Increment Master Folio Totals
      await MasterFolio.findByIdAndUpdate(stay.masterFolioId, {
        $inc: {
          totalFoodAndBeverage: orderSubtotal,
          totalTaxes: taxAmount,
          netAmountPayable: grandTotal,
          dueAmount: grandTotal,
        },
      });

      // Shift 52: Mark order as already billed to avoid being swept twice
      order.isBilled = true;
      order.isSweptToFolio = true;
      order.sweptAt = new Date();
      order.sweptToFolioId = stay.masterFolioId;
      await order.save();
    }

    // 3. Broadcast Real-time Event to Shared Kitchen KDS with ROOM badge
    io.to(`${hotelId}_kds`).emit('order:created', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      orderType: OrderType.ROOM_SERVICE,
      badge: `ROOM ${room.roomNumber} - IN-ROOM DINING`,
      roomNumber: room.roomNumber,
      items: order.items,
      placedAt: order.placedAt,
    });

    const updatedFolio =
      chargeToRoom && stay.masterFolioId
        ? await MasterFolio.findById(stay.masterFolioId)
        : null;
    const updatedLineItems = updatedFolio
      ? await FolioLineItem.find({ folioId: updatedFolio._id }).sort({ createdAt: 1 })
      : [];

    res.status(201).json({
      success: true,
      message: 'In-Room Dining order routed to Kitchen KDS and charged to Master Folio',
      data: {
        order: {
          id: order._id,
          _id: order._id,
          orderNumber: order.orderNumber,
          orderStatus: order.orderStatus,
          placedAt: order.placedAt,
          cookingInstructions: order.cookingInstructions,
          grandTotal,
          items: order.items,
        },
        folio: updatedFolio
          ? {
              folioNumber: updatedFolio.folioNumber,
              totalRoomTariff: updatedFolio.totalRoomTariff,
              totalFoodAndBeverage: updatedFolio.totalFoodAndBeverage,
              totalLaundry: updatedFolio.totalLaundry,
              totalPaidServices: updatedFolio.totalPaidServices,
              totalTaxes: updatedFolio.totalTaxes,
              advancePaid: updatedFolio.advancePaid,
              paidAmount: updatedFolio.paidAmount,
              netAmountPayable: updatedFolio.netAmountPayable,
              dueAmount: updatedFolio.dueAmount,
              folioStatus: updatedFolio.folioStatus,
              lineItems: updatedLineItems.map((li) => ({
                id: li._id,
                department: li.department,
                description: li.description,
                rate: li.rate,
                taxAmount: li.taxAmount,
                netAmount: li.netAmount,
                createdAt: li.createdAt,
              })),
            }
          : null,
        orderNumber: order.orderNumber,
        roomNumber: room.roomNumber,
        grandTotal,
        chargedToFolio: chargeToRoom,
      },
    });
  } catch (error: any) {
    if (error.code === 11000 && error.keyPattern?.idempotencyKey) {
      const idempotencyKey = req.headers['x-idempotency-key'] as string;
      const filter: Record<string, any> = { idempotencyKey };
      if (Types.ObjectId.isValid(String(req.body.hotelId || ''))) {
        filter.hotelId = new Types.ObjectId(String(req.body.hotelId));
      }
      const existing = idempotencyKey
        ? await RestaurantOrder.findOne(filter)
        : null;
      if (existing) {
        res.status(200).json({ success: true, message: 'Order already processed (idempotent)', data: existing });
        return;
      }
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper: Validate Guest Session Token
const resolveGuestSession = async (token?: string, allowCheckedOut = false) => {
  if (!token) return null;
  const tokenHash = hashGuestToken(token);
  const session = await GuestSession.findOne({
    sessionTokenHash: tokenHash,
    isActive: true,
    expiresAt: { $gt: new Date() },
  });
  if (!session) return null;

  const stay = await Stay.findById(session.stayId).populate('guestId', 'name phone');
  if (!stay || String(stay.hotelId) !== String(session.hotelId)) return null;
  if (!allowCheckedOut && stay.stayStatus !== StayStatus.ACTIVE) return null;

  return { session, stay };
};

// 4. Live Room Service Orders Tracker
export const getLiveRoomOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = (req.headers['x-guest-session-token'] || req.query.token) as string;
    const resolved = await resolveGuestSession(token, true);
    if (!resolved) {
      res.status(401).json({ success: false, errorCode: 'INVALID_SESSION', message: 'Active guest session required' });
      return;
    }

    const { session, stay } = resolved;
    const orders = await RestaurantOrder.find({
      hotelId: session.hotelId,
      stayId: stay._id,
      orderType: OrderType.ROOM_SERVICE,
    }).sort({ createdAt: -1 });

    const formatted = orders.map((ord: any) => ({
      id: ord._id.toString(),
      _id: ord._id.toString(),
      orderNumber: ord.orderNumber,
      orderStatus: ord.orderStatus,
      placedAt: ord.placedAt,
      preparedAt: ord.preparedAt,
      readyAt: ord.readyAt,
      servedAt: ord.servedAt,
      cookingInstructions: ord.cookingInstructions,
      items: (ord.items || []).map((it: any) => ({
        menuItemId: it.menuItemId?.toString(),
        name: it.name,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        subtotal: it.subtotal,
        specialInstructions: it.specialInstructions,
      })),
      grandTotal: ord.items.reduce((s: number, i: any) => s + (i.subtotal || 0), 0),
    }));

    res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// 5. 1-Tap Luxury Concierge & Housekeeping Quick Requests
export const createGuestConciergeRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = (req.headers['x-guest-session-token'] || req.body.token) as string;
    const resolved = await resolveGuestSession(token);
    if (!resolved) {
      res.status(401).json({ success: false, errorCode: 'INVALID_SESSION', message: 'Active guest session required' });
      return;
    }

    const { session, stay } = resolved;
    const {
      requestType = 'HOUSEKEEPING',
      notes,
      priority = 'NORMAL',
      isBillable = false,
      billableAmount,
      billableDescription,
    } = req.body;

    let mappedType = ServiceRequestType.ASSISTANCE;
    if (['TOWEL_REPLENISH', 'ROOM_CLEANING', 'HOUSEKEEPING', 'EXTRA_TOILETRIES'].includes(requestType)) {
      mappedType = ServiceRequestType.HOUSEKEEPING;
    } else if (['WATER', 'WATER_BOTTLES'].includes(requestType)) {
      mappedType = ServiceRequestType.WATER;
    } else if (requestType === 'LAUNDRY') {
      mappedType = ServiceRequestType.LAUNDRY;
    }

    let lineItem: any = null;
    let folio: any = null;
    if (isBillable && Number(billableAmount) > 0) {
      if (!stay.masterFolioId) {
        res.status(409).json({ success: false, errorCode: 'FOLIO_NOT_FOUND', message: 'Master folio is not open for this stay' });
        return;
      }
      folio = await MasterFolio.findOne({ _id: stay.masterFolioId, hotelId: session.hotelId });
      if (!folio || folio.folioStatus !== 'OPEN') {
        res.status(409).json({
          success: false,
          errorCode: 'FOLIO_NOT_OPEN',
          message: `Folio is ${folio?.folioStatus || 'unavailable'}. Billable services cannot be posted right now.`,
        });
        return;
      }

      const amount = Number(billableAmount);
      const taxRate = 5;
      const taxAmount = Math.round(amount * (taxRate / 100));
      const netTotal = amount + taxAmount;
      const dept = requestType === 'LAUNDRY' ? DepartmentType.LAUNDRY : DepartmentType.PAID_AMENITY;

      lineItem = await FolioLineItem.create({
        hotelId: session.hotelId,
        folioId: folio._id,
        stayId: stay._id,
        department: dept,
        description: billableDescription || `Concierge Service: ${requestType}`,
        rate: amount,
        quantity: 1,
        taxRate,
        taxAmount,
        netAmount: netTotal,
        postedAt: new Date(),
      });

      if (dept === DepartmentType.LAUNDRY) {
        folio.totalLaundry = (folio.totalLaundry || 0) + amount;
      } else {
        folio.totalPaidServices = (folio.totalPaidServices || 0) + amount;
      }
      folio.totalTaxes = (folio.totalTaxes || 0) + taxAmount;
      folio.netAmountPayable = (folio.netAmountPayable || 0) + netTotal;
      folio.dueAmount = Math.max(0, folio.netAmountPayable - (folio.paidAmount || 0));
      await folio.save();

      io.to(`${session.hotelId}_global`).emit('pms:folio_updated', {
        roomNumber: (await Room.findById(session.roomId))?.roomNumber,
        folioNumber: folio.folioNumber,
        dueAmount: folio.dueAmount,
      });
    }

    const serviceRequest = await ServiceRequest.create({
      hotelId: session.hotelId,
      sourceType: 'HOTEL_STAY',
      stayId: stay._id,
      roomId: session.roomId,
      requestType: mappedType,
      priority: priority === 'HIGH' ? ServiceRequestPriority.HIGH : ServiceRequestPriority.NORMAL,
      status: ServiceRequestStatus.CREATED,
      notes: notes || `In-Room Guest request: ${requestType}`,
      slaMinutes: 10,
      isBillable: !!isBillable,
      billableAmount: Number(billableAmount) || 0,
      folioLineItemId: lineItem ? lineItem._id : undefined,
    });

    // Real-time notification to Housekeeping & Front Desk
    const room = await Room.findById(session.roomId);
    io.to(`${session.hotelId}_admin`).to(`${session.hotelId}_housekeeping`).emit('request:new', {
      requestId: serviceRequest._id,
      roomNumber: room?.roomNumber,
      requestType: serviceRequest.requestType,
      priority: serviceRequest.priority,
      notes: serviceRequest.notes,
      createdAt: serviceRequest.createdAt,
    });

    res.status(201).json({
      success: true,
      message: 'Concierge request submitted to staff',
      data: {
        ...serviceRequest.toObject(),
        folio: folio
          ? {
              folioNumber: folio.folioNumber,
              totalLaundry: folio.totalLaundry,
              totalPaidServices: folio.totalPaidServices,
              totalTaxes: folio.totalTaxes,
              netAmountPayable: folio.netAmountPayable,
              paidAmount: folio.paidAmount,
              dueAmount: folio.dueAmount,
              folioStatus: folio.folioStatus,
            }
          : null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// 5b. Guest-safe live concierge request history (session scoped)
export const getGuestConciergeRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = (req.headers['x-guest-session-token'] || req.query.token) as string;
    const resolved = await resolveGuestSession(token, true);
    if (!resolved) {
      res.status(401).json({ success: false, errorCode: 'INVALID_SESSION', message: 'Active guest session required' });
      return;
    }

    const { session, stay } = resolved;
    const requests = await ServiceRequest.find({
      hotelId: session.hotelId,
      stayId: stay._id,
      roomId: session.roomId,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests.map((request: any) => ({
        id: request._id.toString(),
        requestType: request.requestType,
        status: request.status,
        priority: request.priority,
        notes: request.notes,
        isBillable: request.isBillable,
        billableAmount: request.billableAmount,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// 6. Guest Master Folio Review & Live Charges Breakdown
export const getGuestFolioSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = (req.headers['x-guest-session-token'] || req.query.token) as string;
    const resolved = await resolveGuestSession(token, true);
    if (!resolved) {
      res.status(401).json({ success: false, errorCode: 'INVALID_SESSION', message: 'Active guest session required' });
      return;
    }

    const { stay } = resolved;
    if (!stay.masterFolioId) {
      res.status(404).json({ success: false, errorCode: 'FOLIO_NOT_FOUND', message: 'Master Folio not opened yet' });
      return;
    }

    const folio = await MasterFolio.findById(stay.masterFolioId);
    if (!folio) {
      res.status(404).json({ success: false, errorCode: 'FOLIO_NOT_FOUND' });
      return;
    }

    const lineItems = await FolioLineItem.find({ folioId: folio._id }).sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      data: {
        folioNumber: folio.folioNumber,
        totalRoomTariff: folio.totalRoomTariff,
        totalFoodAndBeverage: folio.totalFoodAndBeverage,
        totalTaxes: folio.totalTaxes,
        advancePaid: folio.advancePaid,
        netAmountPayable: folio.netAmountPayable,
        paidAmount: folio.paidAmount,
        dueAmount: folio.dueAmount,
        folioStatus: folio.folioStatus,
        lineItems: lineItems.map((li) => ({
          id: li._id,
          department: li.department,
          description: li.description,
          rate: li.rate,
          taxAmount: li.taxAmount,
          netAmount: li.netAmount,
          createdAt: li.createdAt,
        })),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// 6b. Guest-safe live stay, folio and checkout status (session scoped, read-only)
export const getGuestStayStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = (req.headers['x-guest-session-token'] || req.query.token) as string;
    const resolved = await resolveGuestSession(token, true);
    if (!resolved) {
      res.status(401).json({ success: false, errorCode: 'INVALID_SESSION', message: 'Active guest session required' });
      return;
    }

    const { session, stay } = resolved;
    const room = await Room.findById(session.roomId).populate('roomTypeId');
    if (!room) {
      res.status(404).json({ success: false, errorCode: 'ROOM_NOT_FOUND', message: 'Room not found' });
      return;
    }
    const booking = await Booking.findById(stay.bookingId);
    const folio = stay.masterFolioId ? await MasterFolio.findById(stay.masterFolioId) : null;
    const lineItems = folio
      ? await FolioLineItem.find({ folioId: folio._id }).sort({ createdAt: 1 })
      : [];
    const tenantDoc = await Tenant.findById(session.hotelId).select('enabledPortals');
    const waiterEnabled = tenantDoc?.enabledPortals?.includes('waiter') ?? true;

    res.status(200).json({
      success: true,
      data: {
        hotelId: session.hotelId,
        waiterEnabled,
        room: {
          id: room._id,
          roomNumber: room.roomNumber,
          floor: room.floorNumber,
          status: room.status,
          roomTypeName: (room.roomTypeId as any)?.name || 'Room',
        },
        stay: {
          stayId: stay._id,
          guestName: (stay as any).guestId?.name || booking?.guestName || 'Valued Guest',
          guestPhone: (stay as any).guestId?.phone || booking?.guestPhone || '',
          checkInTimestamp: stay.checkInTimestamp,
          expectedCheckOutTimestamp: stay.expectedCheckOutTimestamp,
          stayStatus: stay.stayStatus,
          checkoutRequested: Boolean(stay.checkoutRequested),
          checkoutRequestedNotes: stay.checkoutRequestedNotes,
          taxInvoiceNumber: stay.taxInvoiceNumber,
          wifiSsid: 'TajGateway_HighSpeed',
          wifiPassword: `TajGuest@${room.roomNumber}`,
        },
        folio: folio
          ? {
              folioId: folio._id,
              folioNumber: folio.folioNumber,
              totalRoomTariff: folio.totalRoomTariff || 0,
              totalFoodAndBeverage: folio.totalFoodAndBeverage || 0,
              totalLaundry: folio.totalLaundry || 0,
              totalPaidServices: folio.totalPaidServices || 0,
              totalTaxes: folio.totalTaxes || 0,
              advancePaid: folio.advancePaid || 0,
              paidAmount: folio.paidAmount || 0,
              netAmountPayable: folio.netAmountPayable || 0,
              dueAmount: folio.dueAmount || 0,
              folioStatus: folio.folioStatus || 'OPEN',
              settlementNotes: folio.settlementNotes,
              lineItems: lineItems.map((li) => ({
                id: li._id,
                department: li.department,
                description: li.description,
                rate: li.rate,
                taxAmount: li.taxAmount,
                netAmount: li.netAmount,
                createdAt: li.createdAt,
              })),
            }
          : null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// 6c. Guest-initiated folio settlement (session scoped)
export const settleGuestFolio = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = (req.headers['x-guest-session-token'] || req.body.token) as string;
    const resolved = await resolveGuestSession(token);
    if (!resolved) {
      res.status(401).json({ success: false, errorCode: 'INVALID_SESSION', message: 'Active guest session required' });
      return;
    }

    const { session, stay } = resolved;
    if (!stay.masterFolioId) {
      res.status(404).json({ success: false, errorCode: 'FOLIO_NOT_FOUND', message: 'Master folio is not open for this stay' });
      return;
    }

    const folio = await MasterFolio.findOne({ _id: stay.masterFolioId, hotelId: session.hotelId });
    if (!folio) {
      res.status(404).json({ success: false, errorCode: 'FOLIO_NOT_FOUND' });
      return;
    }
    if (folio.folioStatus !== 'OPEN') {
      res.status(409).json({
        success: false,
        errorCode: 'FOLIO_NOT_OPEN',
        message: `Folio is already ${folio.folioStatus.toLowerCase()}.`,
      });
      return;
    }

    const currentDue = Number(folio.dueAmount || 0);
    if (currentDue <= 0) {
      res.status(409).json({ success: false, errorCode: 'NOTHING_DUE', message: 'No outstanding balance on this folio.' });
      return;
    }

    const requestedAmount = req.body.amount === undefined ? currentDue : Number(req.body.amount);
    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0 || requestedAmount > currentDue) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_AMOUNT',
        message: `Payment amount must be between 1 and ${currentDue}`,
      });
      return;
    }

    const paymentMode = String(req.body.paymentMode || 'UPI').toUpperCase();
    const allowedPaymentModes = new Set(['UPI', 'CARD', 'NETBANKING', 'ROOM_FOLIO']);
    if (!allowedPaymentModes.has(paymentMode)) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_PAYMENT_MODE',
        message: 'Unsupported guest payment mode.',
      });
      return;
    }
    const transactionRef = req.body.transactionRef || `GUEST-${paymentMode}-${Date.now()}`;
    const room = await Room.findById(session.roomId);

    // Atomic compare-and-set prevents double settlement when the guest retries
    // or taps Pay twice. The filter only matches the exact due amount we read.
    const paidFolio = await MasterFolio.findOneAndUpdate(
      {
        _id: folio._id,
        hotelId: session.hotelId,
        folioStatus: 'OPEN',
        dueAmount: currentDue,
      },
      {
        $inc: { paidAmount: requestedAmount, dueAmount: -requestedAmount },
        $set: {
          settlementNotes: `Settled via ${paymentMode} (${transactionRef}) from Guest Room Portal`,
        },
      },
      { new: true }
    );

    if (!paidFolio) {
      res.status(409).json({
        success: false,
        errorCode: 'FOLIO_CHANGED',
        message: 'Folio balance changed while processing payment. Refresh and try again.',
      });
      return;
    }

    let finalFolio = paidFolio;
    if (Number(paidFolio.dueAmount || 0) <= 0) {
      const settledFolio = await MasterFolio.findOneAndUpdate(
        { _id: folio._id, folioStatus: 'OPEN', dueAmount: { $lte: 0 } },
        { $set: { dueAmount: 0, folioStatus: 'SETTLED', settledAt: new Date() } },
        { new: true }
      );
      finalFolio =
        settledFolio || (await MasterFolio.findById(folio._id)) || paidFolio;
    }

    const invoiceNumber =
      finalFolio.folioStatus === 'SETTLED'
        ? `INV-${new Date().getFullYear()}-${room?.roomNumber || String(stay.roomId)}-${Date.now().toString().slice(-4)}`
        : null;
    if (invoiceNumber) {
      stay.taxInvoiceNumber = invoiceNumber;
      await stay.save();
    }

    const settlementPayload = {
      roomNumber: room?.roomNumber,
      invoiceNumber,
      paymentMode,
      paidAmount: requestedAmount,
      dueAmount: finalFolio.dueAmount,
      folioStatus: finalFolio.folioStatus,
      settledAt: finalFolio.settledAt || new Date(),
    };
    io.to(`${session.hotelId}_global`).emit('pms:folio_settled', settlementPayload);
    io.to(`guest_room_${settlementPayload.roomNumber}`).emit('pms:folio_settled', settlementPayload);
    io.to(`${session.hotelId}_global`).emit('pms:folio_updated', {
      roomNumber: settlementPayload.roomNumber,
      folioNumber: finalFolio.folioNumber,
      dueAmount: finalFolio.dueAmount,
    });

    res.status(200).json({
      success: true,
      message: invoiceNumber
        ? 'Folio settled successfully. Official GST invoice generated.'
        : `Payment recorded. Outstanding balance ₹${finalFolio.dueAmount} remains.`,
      data: {
        invoiceNumber,
        paidAmount: requestedAmount,
        dueAmount: finalFolio.dueAmount,
        folioStatus: finalFolio.folioStatus,
        transactionRef,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// 7. 1-Tap Express Digital Checkout Request
export const requestExpressCheckout = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = (req.headers['x-guest-session-token'] || req.body.token) as string;
    const resolved = await resolveGuestSession(token);
    if (!resolved) {
      res.status(401).json({ success: false, errorCode: 'INVALID_SESSION', message: 'Active guest session required' });
      return;
    }

    const { session, stay } = resolved;
    const { notes } = req.body;

    const folio = await MasterFolio.findById(stay.masterFolioId);
    if (!folio) {
      res.status(404).json({ success: false, errorCode: 'FOLIO_NOT_FOUND' });
      return;
    }

    // Check outstanding balance
    if (folio.dueAmount > 0) {
      res.status(400).json({
        success: false,
        errorCode: 'OUTSTANDING_BALANCE_DUE',
        message: `Outstanding balance of ₹${folio.dueAmount} must be settled before checkout`,
        dueAmount: folio.dueAmount,
      });
      return;
    }

    const room = await Room.findById(session.roomId);
    stay.checkoutRequested = true;
    if (notes) stay.checkoutRequestedNotes = String(notes);
    await stay.save();

    // Notify Front Desk & Housekeeping for express departure
    io.to(`${session.hotelId}_admin`).to(`${session.hotelId}_pms`).to(`${session.hotelId}_housekeeping`).emit('checkout:requested', {
      stayId: stay._id,
      roomId: room?._id,
      roomNumber: room?.roomNumber,
      notes: notes || 'Guest submitted 1-tap express checkout request via room portal',
      requestedAt: new Date(),
    });

    res.status(200).json({
      success: true,
      message: 'Express checkout requested successfully! Front desk and housekeeping have been notified.',
      data: {
        stayId: stay._id,
        roomNumber: room?.roomNumber,
        status: 'EXPRESS_CHECKOUT_SUBMITTED',
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// 8. Staff-only provisioning of a printable room QR (raw token is shown once)
export const rotateRoomGuestQr = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const roomId = String(req.params.roomId || '');
    if (!Types.ObjectId.isValid(roomId)) {
      res.status(400).json({ success: false, errorCode: 'INVALID_ROOM', message: 'Valid roomId is required' });
      return;
    }

    const room = await Room.findOne({ _id: roomId, hotelId });
    if (!room) {
      res.status(404).json({ success: false, errorCode: 'ROOM_NOT_FOUND', message: 'Room not found' });
      return;
    }

    const rawQrToken = crypto.randomBytes(32).toString('hex');
    room.permanentQrCodeHash = hashGuestToken(rawQrToken);
    await room.save();

    const baseUrl = process.env.GUEST_PORTAL_URL || 'http://localhost:3004';
    const url = new URL(baseUrl);
    url.searchParams.set('hotelId', String(hotelId));
    url.searchParams.set('roomNumber', room.roomNumber);
    url.searchParams.set('token', rawQrToken);

    res.status(200).json({
      success: true,
      message: 'Room guest QR rotated. Print this URL once; the raw token is not stored.',
      data: {
        hotelId,
        roomId: room._id,
        roomNumber: room.roomNumber,
        portalUrl: url.toString(),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// 9. Public Guest Room Catalog with Live Availability Matrix & Real-time Room Statuses
export const getGuestRoomCatalog = async (req: Request, res: Response): Promise<void> => {
  try {
    let hotelId = (req.query.hotelId || req.headers['x-hotel-id']) as string;

    if (!hotelId || !Types.ObjectId.isValid(hotelId)) {
      const activeTenant = await Tenant.findOne({ status: 'ACTIVE' }).sort({ updatedAt: -1 });
      if (activeTenant) {
        hotelId = activeTenant._id.toString();
      }
    }

    if (!hotelId || !Types.ObjectId.isValid(hotelId)) {
      res.status(400).json({ success: false, errorCode: 'INVALID_HOTEL', message: 'Valid hotelId is required' });
      return;
    }

    const tenant = await Tenant.findById(hotelId);
    if (!tenant) {
      res.status(404).json({ success: false, errorCode: 'TENANT_NOT_FOUND', message: 'Hotel not found' });
      return;
    }

    const rooms = await Room.find({ hotelId: new Types.ObjectId(hotelId) })
      .populate('roomTypeId')
      .sort({ floorNumber: 1, roomNumber: 1 });

    const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
      mumbai: { lat: 19.0760, lng: 72.8777 },
      delhi: { lat: 28.6139, lng: 77.2090 },
      bengaluru: { lat: 12.9716, lng: 77.5946 },
      jaipur: { lat: 26.9124, lng: 75.7873 },
      goa: { lat: 15.2993, lng: 74.1240 },
      kolkata: { lat: 22.5726, lng: 88.3639 },
    };

    const anyTenant = tenant as any;
    const cityKey = (anyTenant.city || 'mumbai').toLowerCase().trim();
    const defaultCoords = CITY_COORDS[cityKey] || { lat: 19.0760, lng: 72.8777 };

    let availableCount = 0;
    let cleaningCount = 0;
    let maintenanceCount = 0;
    let occupiedCount = 0;

    const mappedRooms = rooms.map((r: any) => {
      const rawStatus = r.status || RoomStatus.AVAILABLE;
      let displayStatus = 'OCCUPIED';
      let statusBadge = 'Occupied (In-Use)';

      if (rawStatus === RoomStatus.AVAILABLE) {
        displayStatus = 'AVAILABLE';
        statusBadge = 'Ready for Booking';
        availableCount += 1;
      } else if (
        rawStatus === RoomStatus.DIRTY ||
        rawStatus === RoomStatus.CLEANING ||
        rawStatus === RoomStatus.INSPECTION
      ) {
        displayStatus = 'CLEANING';
        statusBadge = 'Housekeeping Turnaround';
        cleaningCount += 1;
      } else if (rawStatus === RoomStatus.OUT_OF_SERVICE) {
        displayStatus = 'MAINTENANCE';
        statusBadge = 'Under Maintenance';
        maintenanceCount += 1;
      } else {
        occupiedCount += 1;
      }

      const roomType = r.roomTypeId || {};
      const basePrice = Number(roomType.basePriceOvernight) || 2500;
      const gstRate = basePrice > 7500 ? 18 : 12;

      return {
        id: r._id,
        roomNumber: r.roomNumber,
        floorNumber: r.floorNumber,
        wing: r.wing || 'Main Wing',
        rawStatus,
        displayStatus,
        statusBadge,
        isBookable: rawStatus === RoomStatus.AVAILABLE,
        roomType: {
          id: roomType._id,
          name: roomType.name || 'Deluxe Room',
          code: roomType.code || 'DLX',
          basePriceOvernight: basePrice,
          gstRate,
          amenities: roomType.amenities && roomType.amenities.length > 0
            ? roomType.amenities
            : ['King Size Bed', 'Climate Control AC', 'High-Speed Wi-Fi', 'Smart HD TV', 'Attached Luxury Bath'],
          maxCapacity: roomType.maxCapacity || roomType.baseCapacityAdults || 2,
        },
      };
    });

    res.status(200).json({
      success: true,
      data: {
        hotel: {
          id: tenant._id,
          name: tenant.name,
          slug: tenant.slug,
          city: anyTenant.city || 'Mumbai',
          state: anyTenant.state || 'Maharashtra',
          latitude: defaultCoords.lat,
          longitude: defaultCoords.lng,
          phone: tenant.contactPhone || '+91 98200 11223',
          waiterEnabled: tenant.enabledPortals?.includes('waiter') ?? true,
        },
        counts: {
          total: rooms.length,
          available: availableCount,
          cleaning: cleaningCount,
          maintenance: maintenanceCount,
          occupied: occupiedCount,
        },
        rooms: mappedRooms,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// 10. Public Guest Instant Booking & Check-In with KYC Verification & Dynamic Stay Tariff
export const bookAndCheckInGuest = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      hotelId,
      roomId,
      checkInDate,
      checkOutDate,
      guestName,
      guestPhone,
      guestEmail,
      isCouple = false,
      idType = 'AADHAAR',
      idNumber,
      advancePaid = 0,
      deviceLocation,
    } = req.body;

    if (!hotelId || !Types.ObjectId.isValid(hotelId)) {
      res.status(400).json({ success: false, errorCode: 'INVALID_HOTEL', message: 'Valid hotelId is required' });
      return;
    }

    if (!roomId || !Types.ObjectId.isValid(roomId)) {
      res.status(400).json({ success: false, errorCode: 'INVALID_ROOM', message: 'Valid roomId is required' });
      return;
    }

    const room = await Room.findOne({ _id: new Types.ObjectId(roomId), hotelId: new Types.ObjectId(hotelId) }).populate('roomTypeId');
    if (!room) {
      res.status(404).json({ success: false, errorCode: 'ROOM_NOT_FOUND', message: 'Room not found' });
      return;
    }

    if (room.status !== RoomStatus.AVAILABLE) {
      res.status(409).json({
        success: false,
        errorCode: 'ROOM_NOT_AVAILABLE',
        message: `Room ${room.roomNumber} is currently ${room.status}. Only available rooms can be booked.`,
      });
      return;
    }

    const effectiveName = (guestName || 'Valued Guest').trim();
    const effectivePhone = (guestPhone || '9820011223').trim();
    const effectiveEmail = (guestEmail || `${effectivePhone}@guest.spicehub.com`).trim();

    // Date & Tariff Calculation
    const checkIn = checkInDate ? new Date(checkInDate) : new Date();
    const checkOut = checkOutDate ? new Date(checkOutDate) : new Date(checkIn.getTime() + 86400000);
    const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 3600 * 24)));

    const roomType = (room.roomTypeId as any) || {};
    const basePrice = Number(roomType.basePriceOvernight) || 2500;
    const gstRate = basePrice > 7500 ? 18 : 12;
    const totalTariff = basePrice * nights;
    const taxAmount = Math.round((totalTariff * (gstRate / 100)) * 100) / 100;
    const grandTotal = totalTariff + taxAmount;
    const advance = Number(advancePaid) || 0;
    const dueAmount = Math.max(0, grandTotal - advance);

    // Mask ID Number for compliance & privacy
    let maskedId = 'None (Self-Verified)';
    if (idNumber) {
      const clean = String(idNumber).replace(/[^0-9a-zA-Z]/g, '');
      const last4 = clean.slice(-4);
      maskedId = clean.length > 4 ? `XXXX-XXXX-${last4}` : `XXXX-${clean}`;
    }

    const ts = Date.now().toString().slice(-4);
    const bookingNumber = `BK-PORTAL-${new Date().getFullYear()}-${ts}`;
    const folioNumber = `FOLIO-${room.roomNumber}-${ts}`;

    // 1. Create Booking Record
    const booking = await Booking.create({
      hotelId: room.hotelId,
      bookingNumber,
      bookingSource: 'DIRECT_PUBLIC_WEB' as any,
      bookingMode: 'OVERNIGHT' as any,
      roomTypeId: room.roomTypeId?._id || room.roomTypeId,
      allocatedRoomId: room._id,
      guestName: effectiveName,
      guestPhone: effectivePhone,
      guestEmail: effectiveEmail,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      totalTariff,
      taxAmount,
      grandTotal,
      advancePaymentAmount: advance,
      paymentStatus: advance >= grandTotal ? 'PAID' : (advance > 0 ? 'PARTIAL' : 'UNPAID'),
      bookingStatus: 'CHECKED_IN' as any,
    });

    // 2. Resolve or Create GuestProfile
    let guestProfile = await GuestProfile.findOne({ hotelId: room.hotelId, phone: effectivePhone });
    if (!guestProfile) {
      guestProfile = await GuestProfile.create({
        hotelId: room.hotelId,
        name: effectiveName,
        phone: effectivePhone,
        email: effectiveEmail,
        totalVisits: 1,
        totalLifetimeSpend: grandTotal,
      });
    } else {
      guestProfile.totalVisits = (guestProfile.totalVisits || 1) + 1;
      guestProfile.totalLifetimeSpend = (guestProfile.totalLifetimeSpend || 0) + grandTotal;
      guestProfile.lastVisitDate = new Date();
      await guestProfile.save();
    }

    const stayId = new Types.ObjectId();
    const folioId = new Types.ObjectId();

    // 3. Create MasterFolio
    const masterFolio = await MasterFolio.create({
      _id: folioId,
      hotelId: room.hotelId,
      stayId,
      bookingId: booking._id,
      roomId: room._id,
      folioNumber,
      totalRoomTariff: totalTariff,
      totalFoodAndBeverage: 0,
      totalLaundry: 0,
      totalPaidServices: 0,
      totalTaxes: taxAmount,
      advancePaid: advance,
      paidAmount: advance,
      netAmountPayable: grandTotal,
      dueAmount,
      folioStatus: 'OPEN',
    });

    // 4. Create Initial FolioLineItem (Immutable Accommodation Charge)
    await FolioLineItem.create({
      hotelId: room.hotelId,
      folioId,
      department: DepartmentType.ROOM_RENT,
      description: `Room ${room.roomNumber} (${nights} Night(s)) Accommodation Tariff`,
      rate: totalTariff,
      quantity: 1,
      taxRate: gstRate,
      taxAmount,
      netAmount: grandTotal,
      postedAt: new Date(),
    });

    // 5. Create Stay Record
    const stay = await Stay.create({
      _id: stayId,
      hotelId: room.hotelId,
      roomId: room._id,
      bookingId: booking._id,
      guestId: guestProfile._id,
      stayStatus: StayStatus.ACTIVE,
      masterFolioId: folioId,
      checkInTimestamp: checkIn,
      expectedCheckOutTimestamp: checkOut,
      isCouple: Boolean(isCouple),
      verificationMode: idType || 'AADHAAR',
      idNumberMasked: maskedId,
      verifiedByReceptionist: true,
      keycardExpiresAt: checkOut,
      receptionistNotes: deviceLocation
        ? `Booked via Guest Portal. Location: ${deviceLocation.distanceKm || 0} km away (Lat: ${deviceLocation.latitude}, Lng: ${deviceLocation.longitude})`
        : 'Booked via Guest Portal Express Check-in',
    });

    // 6. Update Physical Room Status
    room.status = RoomStatus.OCCUPIED;
    room.currentStayId = stay._id as any;
    await room.save();

    // 7. Issue Signed Guest Session Token
    const rawSessionToken = signGuestSessionToken({
      hotelId: String(room.hotelId),
      stayId: String(stay._id),
      roomId: String(room._id),
      roomNumber: String(room.roomNumber),
    });
    const tokenHash = hashGuestToken(rawSessionToken);
    const expiresAt = new Date(Date.now() + GUEST_SESSION_TTL_MS);

    await GuestSession.create({
      hotelId: room.hotelId,
      stayId: stay._id,
      roomId: room._id,
      sessionTokenHash: tokenHash,
      lastKnownRoute: '/guest-portal/home',
      expiresAt,
    });

    // 8. Real-time PMS notification
    io.to(`${room.hotelId}_global`).emit('pms:guest_checked_in', {
      roomNumber: room.roomNumber,
      guestName: effectiveName,
      stayId: stay._id,
      isCouple: stay.isCouple,
      verified: true,
      advanceCredited: advance,
      balanceDue: dueAmount,
      checkInDate: checkIn,
      checkOutDate: checkOut,
    });

    res.status(201).json({
      success: true,
      message: `Room ${room.roomNumber} booked and checked in successfully!`,
      data: {
        sessionToken: rawSessionToken,
        hotelId: room.hotelId,
        roomId: room._id,
        roomNumber: room.roomNumber,
        roomTypeName: roomType.name || 'Deluxe Room',
        guestName: effectiveName,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        nights,
        stayId: stay._id,
        masterFolioId: folioId,
        folioNumber,
        grandTotal,
        advancePaid: advance,
        dueAmount,
        wifiSsid: 'SpiceHub_HighSpeed',
        wifiPassword: `Guest@${room.roomNumber}`,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// 11. In-House Stay Extension (Dynamic Check-Out Date & Surcharge Recalculation)
export const extendStayDates = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = (req.headers['x-guest-session-token'] || req.body.token) as string;
    const resolved = await resolveGuestSession(token);
    if (!resolved) {
      res.status(401).json({ success: false, errorCode: 'INVALID_SESSION', message: 'Active guest session required' });
      return;
    }

    const { session, stay } = resolved;
    const { newCheckOutDate } = req.body;

    if (!newCheckOutDate) {
      res.status(400).json({ success: false, errorCode: 'INVALID_DATE', message: 'newCheckOutDate is required' });
      return;
    }

    const currentCheckOut = stay.expectedCheckOutTimestamp ? new Date(stay.expectedCheckOutTimestamp) : new Date();
    const updatedCheckOut = new Date(newCheckOutDate);

    if (updatedCheckOut <= currentCheckOut) {
      stay.expectedCheckOutTimestamp = updatedCheckOut;
      await stay.save();
      res.status(200).json({
        success: true,
        message: 'Check-out schedule updated',
        data: { expectedCheckOutDate: updatedCheckOut },
      });
      return;
    }

    // Calculate additional nights
    const diffMs = updatedCheckOut.getTime() - currentCheckOut.getTime();
    const additionalNights = Math.max(1, Math.ceil(diffMs / (1000 * 3600 * 24)));

    const room = await Room.findById(session.roomId).populate('roomTypeId');
    const roomType = (room?.roomTypeId as any) || {};
    const basePrice = Number(roomType.basePriceOvernight) || 2500;
    const gstRate = basePrice > 7500 ? 18 : 12;
    const additionalTariff = basePrice * additionalNights;
    const additionalTax = Math.round((additionalTariff * (gstRate / 100)) * 100) / 100;
    const totalSurcharge = additionalTariff + additionalTax;

    // Post to Master Folio
    let folio = await MasterFolio.findById(stay.masterFolioId);
    if (folio && folio.folioStatus === 'OPEN') {
      await FolioLineItem.create({
        hotelId: session.hotelId,
        folioId: folio._id,
        department: DepartmentType.ROOM_RENT,
        description: `Stay Extension (+${additionalNights} Night(s)) to ${updatedCheckOut.toDateString()}`,
        rate: additionalTariff,
        quantity: 1,
        taxRate: gstRate,
        taxAmount: additionalTax,
        netAmount: totalSurcharge,
        postedAt: new Date(),
      });

      folio = await MasterFolio.findByIdAndUpdate(
        folio._id,
        {
          $inc: {
            totalRoomTariff: additionalTariff,
            totalTaxes: additionalTax,
            netAmountPayable: totalSurcharge,
            dueAmount: totalSurcharge,
          },
        },
        { new: true }
      );
    }

    stay.expectedCheckOutTimestamp = updatedCheckOut;
    stay.keycardExpiresAt = updatedCheckOut;
    await stay.save();

    // Notify PMS Front Desk
    io.to(`${session.hotelId}_admin`).to(`${session.hotelId}_pms`).emit('pms:stay_extended', {
      stayId: stay._id,
      roomNumber: room?.roomNumber,
      newCheckOutDate: updatedCheckOut,
      additionalNights,
      surchargeAdded: totalSurcharge,
      newDueAmount: folio?.dueAmount || 0,
    });

    res.status(200).json({
      success: true,
      message: `Stay extended by +${additionalNights} night(s). Additional ₹${totalSurcharge} added to folio.`,
      data: {
        expectedCheckOutDate: updatedCheckOut,
        additionalNights,
        surchargeAdded: totalSurcharge,
        folio: folio
          ? {
              folioNumber: folio.folioNumber,
              totalRoomTariff: folio.totalRoomTariff,
              netAmountPayable: folio.netAmountPayable,
              dueAmount: folio.dueAmount,
            }
          : null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};


