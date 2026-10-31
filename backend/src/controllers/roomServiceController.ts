import { Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { getJwtSecret, isDevAuthBypassEnabled } from '../config/security';
import { Room, RoomStatus } from '../models/Room';
import { Stay, StayStatus } from '../models/Stay';
import { Booking, BookingStatus } from '../models/Booking';
import { GuestSession } from '../models/GuestSession';
import { MenuItem } from '../models/MenuItem';
import { KitchenStation } from '../models/KitchenStation';
import { RestaurantOrder, OrderType, OverallOrderStatus, ItemProductionStatus } from '../models/RestaurantOrder';
import { MasterFolio } from '../models/MasterFolio';
import { FolioLineItem, DepartmentType } from '../models/FolioLineItem';
import { ServiceRequest, ServiceRequestType, ServiceRequestPriority, ServiceRequestStatus } from '../models/ServiceRequest';
import { Tenant } from '../models/Tenant';
import { GuestProfile } from '../models/GuestProfile';
import { RoomType } from '../models/RoomType';
import { HousekeepingTask, HousekeepingTaskType, HousekeepingTaskStatus } from '../models/HousekeepingTask';
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
      let isVerifiedQr = false;
      const qrHash = hashGuestToken(String(qrToken));
      const legacyDevMatch =
        !strictQr &&
        Boolean(room.permanentQrCodeHash) &&
        String(qrToken) === String(room.permanentQrCodeHash);

      if (room.permanentQrCodeHash && (qrHash === room.permanentQrCodeHash || legacyDevMatch)) {
        isVerifiedQr = true;
      } else {
        // Resilient check: also verify if qrToken is a valid resident session JWT for this room
        try {
          const decoded: any = jwt.verify(String(qrToken), getJwtSecret());
          if (decoded && String(decoded.roomId) === String(room._id)) {
            isVerifiedQr = true;
          }
        } catch {}
      }

      if (room.permanentQrCodeHash && !isVerifiedQr) {
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

    const hotelTenant = await Tenant.findById(room.hotelId).select('enabledPortals wifiSsid wifiPassword');
    const waiterEnabled = hotelTenant?.enabledPortals ? hotelTenant.enabledPortals.includes('waiter') : true;
    const dynamicWifiSsid = hotelTenant?.wifiSsid || 'TajGateway_HighSpeed';
    const dynamicWifiPassword = hotelTenant?.wifiPassword || `TajGuest@${room.roomNumber}`;

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
        wifiSsid: dynamicWifiSsid,
        wifiPassword: dynamicWifiPassword,
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
    const { hotelId, roomNumber, guestPhone, lastName, guestName, name, otp, whatsappOtp } = req.body;

    if (!hotelId || !Types.ObjectId.isValid(hotelId)) {
      res.status(400).json({ success: false, errorCode: 'INVALID_HOTEL', message: 'Valid hotelId is required' });
      return;
    }

    const effectiveName = String(lastName || guestName || name || '').trim().toLowerCase();
    if (!roomNumber || (!guestPhone && !effectiveName)) {
      res.status(400).json({
        success: false,
        errorCode: 'MISSING_FIELDS',
        message: 'Room number and registered phone or guest last name are required',
      });
      return;
    }

    // WhatsApp OTP Verification (Fixed to '9999' for testing, ready for WhatsApp Business Webhook)
    const submittedOtp = String(otp || whatsappOtp || '').trim();
    if (submittedOtp && submittedOtp !== '9999') {
      res.status(401).json({
        success: false,
        errorCode: 'INVALID_OTP',
        message: 'Invalid WhatsApp OTP code. Please enter the 4-digit code sent to your registered WhatsApp (Test OTP: 9999).',
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
      // Check if a previous stay for this room is checked out (Strict Post-Checkout Lockout)
      const checkedOutStay = await Stay.findOne({
        hotelId: room.hotelId,
        roomId: room._id,
        stayStatus: StayStatus.CHECKED_OUT,
      })
        .sort({ checkOutTimestamp: -1, updatedAt: -1 })
        .populate('guestId');

      if (checkedOutStay) {
        res.status(403).json({
          success: false,
          errorCode: 'STAY_CHECKED_OUT',
          isLockedOut: true,
          message: `Access Denied: Room ${roomNumber} has already been checked out. Post-checkout re-entry is prohibited. For invoice copies or extensions, please contact the front desk.`,
          redirectAction: 'CHECKOUT_LOCKOUT',
        });
        return;
      }

      res.status(404).json({
        success: false,
        errorCode: 'NO_ACTIVE_STAY',
        message: `No active check-in found for Room ${roomNumber}. If you wish to stay, please book a room from our catalog.`,
        redirectAction: 'PUBLIC_BOOKING_OR_RECEPTION',
      });
      return;
    }

    // Revalidate stay is not checked out
    if (stay.stayStatus === StayStatus.CHECKED_OUT) {
      res.status(403).json({
        success: false,
        errorCode: 'STAY_CHECKED_OUT',
        isLockedOut: true,
        message: `Access Denied: Room ${roomNumber} has already been checked out. Post-checkout re-entry is prohibited.`,
      });
      return;
    }

    // Match guest phone or last name
    const booking = await Booking.findById(stay.bookingId);
    const cleanInputPhone = guestPhone ? String(guestPhone).replace(/[^0-9]/g, '').slice(-10) : '';
    const guestObj = stay.guestId as any;
    const stayPhone = String(guestObj?.phone || (stay as any)?.guestPhone || '').replace(/[^0-9]/g, '').slice(-10);
    const bookingPhone = String(booking?.guestPhone || '').replace(/[^0-9]/g, '').slice(-10);
    const registeredName = String(guestObj?.name || booking?.guestName || (stay as any)?.guestName || '').toLowerCase();

    const phoneMatch = cleanInputPhone && (
      (stayPhone && cleanInputPhone.endsWith(stayPhone)) ||
      (bookingPhone && cleanInputPhone.endsWith(bookingPhone)) ||
      (cleanInputPhone && (stayPhone.endsWith(cleanInputPhone) || bookingPhone.endsWith(cleanInputPhone)))
    );
    const nameMatch = effectiveName && (
      registeredName.includes(effectiveName) ||
      effectiveName.includes(registeredName)
    );

    const isMatch = Boolean(phoneMatch || nameMatch);

    if (!isMatch) {
      res.status(401).json({
        success: false,
        errorCode: 'CREDENTIAL_MISMATCH',
        message: `The credentials entered do not match the active guest registration for Room ${roomNumber}. Please contact the front desk.`,
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

    const hotelTenant = await Tenant.findById(room.hotelId).select('enabledPortals wifiSsid wifiPassword');
    const waiterEnabled = hotelTenant?.enabledPortals ? hotelTenant.enabledPortals.includes('waiter') : true;
    const dynamicWifiSsid = hotelTenant?.wifiSsid || 'TajGateway_HighSpeed';
    const dynamicWifiPassword = hotelTenant?.wifiPassword || `TajGuest@${room.roomNumber}`;

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
        wifiSsid: dynamicWifiSsid,
        wifiPassword: dynamicWifiPassword,
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
    const customerLocation = req.body.customerLocation;
    if (customerLocation && customerLocation.isRemote === true && !customerLocation.allowRemoteOverride) {
      res.status(403).json({
        success: false,
        errorCode: 'OUT_OF_BOUNDS_LOCATION',
        message: 'Location verification failed: Food orders are restricted to guests physically on-site within hotel premises.',
      });
      return;
    }

    const { items, cookingInstructions, chargeToRoom = true } = req.body;
    const guestToken = (req.headers['x-guest-session-token'] || req.body.token) as string;
    const resolved = await resolveGuestSession(guestToken);

    let hotelId = String(req.body.hotelId || req.headers['x-hotel-id'] || (req as any).hotelId || '');
    let stayId = String(req.body.stayId || '');
    let roomId = String(req.body.roomId || '');
    const roomNumber = req.body.roomNumber ? String(req.body.roomNumber).trim() : '';

    if (resolved) {
      // Never trust client-supplied IDs when a verified guest session exists.
      hotelId = String(resolved.session.hotelId);
      stayId = String(resolved.session.stayId);
      roomId = String(resolved.session.roomId);
    } else {
      // Graceful fallback for resident room guest ordering food to their room:
      if (!stayId && (roomId || roomNumber) && hotelId && Types.ObjectId.isValid(hotelId)) {
        const roomQuery: any = { hotelId: new Types.ObjectId(hotelId) };
        if (roomId && Types.ObjectId.isValid(roomId)) {
          roomQuery._id = new Types.ObjectId(roomId);
        } else if (roomNumber) {
          roomQuery.roomNumber = roomNumber;
        }
        const roomDoc = await Room.findOne(roomQuery);
        if (roomDoc) {
          roomId = String(roomDoc._id);
          const activeStay = await Stay.findOne({
            hotelId: new Types.ObjectId(hotelId),
            roomId: roomDoc._id,
            stayStatus: StayStatus.ACTIVE,
          }).sort({ checkInTimestamp: -1, createdAt: -1 });
          if (activeStay) {
            stayId = String(activeStay._id);
          }
        }
      }

      if (
        !Types.ObjectId.isValid(hotelId) ||
        !Types.ObjectId.isValid(stayId) ||
        !Types.ObjectId.isValid(roomId)
      ) {
        if (guestToken) {
          res.status(401).json({ success: false, errorCode: 'INVALID_SESSION', message: 'Guest session is invalid or expired' });
          return;
        }
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

      let stationId: Types.ObjectId = dbDish.kitchenStationId as Types.ObjectId;
      if (!stationId) {
        const defaultStation = await KitchenStation.findOne({ hotelId: new Types.ObjectId(hotelId) });
        stationId = (defaultStation ? defaultStation._id : new Types.ObjectId()) as Types.ObjectId;
      }

      validatedItems.push({
        menuItemId: dbDish._id,
        kitchenStationId: stationId,
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

    // 3b. Broadcast to Floor Waiters / Room Service Stewards
    io.to(`${hotelId}_waiters`).to(`${hotelId}_admin`).emit('waiter:room_order', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      roomNumber: room.roomNumber,
      destination: `Room ${room.roomNumber}`,
      itemsSummary: validatedItems.map((i) => `${i.quantity}x ${i.name}`).join(', '),
      type: 'ROOM_SERVICE_DELIVERY',
      placedAt: order.placedAt,
    });

    // Auto-create room service delivery task for steward
    await ServiceRequest.create({
      hotelId: new Types.ObjectId(hotelId),
      stayId: stay._id,
      roomId: room._id,
      requestType: ServiceRequestType.ASSISTANCE,
      priority: ServiceRequestPriority.HIGH,
      notes: `Deliver In-Room Dining Order #${order.orderNumber} to Room ${room.roomNumber}`,
      status: ServiceRequestStatus.CREATED,
    }).catch(() => {});

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
  let session = await GuestSession.findOne({
    sessionTokenHash: tokenHash,
    isActive: true,
    expiresAt: { $gt: new Date() },
  });

  // Resilient fallback: If session record not found by hash, verify cryptographically signed JWT
  if (!session) {
    try {
      const decoded: any = jwt.verify(token, getJwtSecret());
      if (decoded?.stayId && decoded?.hotelId) {
        const stay = await Stay.findById(decoded.stayId).populate('guestId', 'name phone');
        if (stay && (allowCheckedOut || stay.stayStatus === StayStatus.ACTIVE)) {
          session = await GuestSession.findOne({
            stayId: stay._id,
            isActive: true,
            expiresAt: { $gt: new Date() },
          });
          if (!session) {
            session = await GuestSession.create({
              hotelId: stay.hotelId,
              stayId: stay._id,
              roomId: stay.roomId,
              sessionTokenHash: tokenHash,
              lastKnownRoute: '/guest-portal/home',
              expiresAt: new Date(Date.now() + GUEST_SESSION_TTL_MS),
            });
          }
          return { session, stay };
        }
      }
    } catch {
      // Expired or forged token
    }
    return null;
  }

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
      waiterEtaMinutes: ord.waiterEtaMinutes,
      waiterMessage: ord.waiterMessage,
      waiterName: ord.waiterName,
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
    const norm = String(requestType || '').toUpperCase().replace(/[\s_-]+/g, '_');
    if (norm.includes('TOWEL') || norm.includes('CLEAN') || norm.includes('HOUSEKEEPING') || norm.includes('TOILETRIES') || norm.includes('PILLOW') || norm.includes('BLANKET')) {
      mappedType = ServiceRequestType.HOUSEKEEPING;
    } else if (norm.includes('WATER')) {
      mappedType = ServiceRequestType.WATER;
    } else if (norm.includes('LAUNDRY')) {
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

    // Real-time notification to Front Desk PMS & Housekeeping
    const room = await Room.findById(session.roomId);
    let guestName = 'In-House Guest';
    if (stay.guestId) {
      const gp = await GuestProfile.findById(stay.guestId);
      if (gp?.name) guestName = gp.name;
    }

    const conciergePayload = {
      requestId: serviceRequest._id.toString(),
      roomNumber: room?.roomNumber || 'Unknown',
      guestName,
      requestType: serviceRequest.requestType,
      priority: serviceRequest.priority,
      status: serviceRequest.status,
      notes: serviceRequest.notes,
      isBillable: serviceRequest.isBillable,
      billableAmount: serviceRequest.billableAmount,
      createdAt: serviceRequest.createdAt,
    };

    io.to(`${session.hotelId}_pms`)
      .to(`${session.hotelId}_frontdesk`)
      .to(`${session.hotelId}_admin`)
      .to(`${session.hotelId}_housekeeping`)
      .to(`${session.hotelId}_global`)
      .emit('pms:concierge_request_created', conciergePayload);

    io.to(`${session.hotelId}_admin`).to(`${session.hotelId}_housekeeping`).emit('request:new', conciergePayload);

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
    const tenantDoc = await Tenant.findById(session.hotelId).select('enabledPortals wifiSsid wifiPassword');
    const waiterEnabled = tenantDoc?.enabledPortals?.includes('waiter') ?? true;
    const dynamicWifiSsid = tenantDoc?.wifiSsid || 'TajGateway_HighSpeed';
    const dynamicWifiPassword = tenantDoc?.wifiPassword || `TajGuest@${room.roomNumber}`;

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
          wifiSsid: dynamicWifiSsid,
          wifiPassword: dynamicWifiPassword,
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
        ? `INV-${new Date().getFullYear()}-${room?.roomNumber || String(stay.roomId)}-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`
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
    io.to(`${session.hotelId}_guest_room_${settlementPayload.roomNumber}`).emit('pms:folio_settled', settlementPayload);
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
    stay.stayStatus = StayStatus.CHECKED_OUT;
    stay.actualCheckOutTimestamp = new Date();
    stay.keyCardVoided = true;
    if (!stay.taxInvoiceNumber) {
      stay.taxInvoiceNumber = `INV-${new Date().getFullYear()}-${room?.roomNumber || '101'}-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
    }
    await stay.save();

    if (stay.bookingId) {
      await Booking.findByIdAndUpdate(stay.bookingId, {
        bookingStatus: BookingStatus.CHECKED_OUT,
        checkOutDate: new Date(),
      });
    }

    if (room) {
      room.status = RoomStatus.DIRTY;
      await room.save();
      try {
        await HousekeepingTask.create({
          hotelId: session.hotelId,
          roomId: room._id,
          taskType: HousekeepingTaskType.CHECKOUT_CLEAN,
          status: HousekeepingTaskStatus.PENDING,
          notes: notes || 'Guest express checkout turnaround',
        });
      } catch {}
    }

    // Notify Front Desk & Housekeeping for express departure
    io.to(`${session.hotelId}_admin`).to(`${session.hotelId}_pms`).to(`${session.hotelId}_housekeeping`).emit('checkout:requested', {
      stayId: stay._id,
      roomId: room?._id,
      roomNumber: room?.roomNumber,
      notes: notes || 'Guest submitted 1-tap express checkout request via room portal',
      requestedAt: new Date(),
    });

    io.to(`${session.hotelId}_global`).to(`${session.hotelId}_pms`).emit('pms:stay_checked_out', {
      hotelId: session.hotelId.toString(),
      stayId: stay._id.toString(),
      roomNumber: room?.roomNumber,
      invoiceNumber: stay.taxInvoiceNumber,
      totalPaid: folio.paidAmount,
      stayStatus: 'CHECKED_OUT',
    });
    io.to(`${session.hotelId}_guest_room_${room?.roomNumber}`).emit('pms:stay_checked_out', {
      hotelId: session.hotelId.toString(),
      stayId: stay._id.toString(),
      roomNumber: room?.roomNumber,
      invoiceNumber: stay.taxInvoiceNumber,
      totalPaid: folio.paidAmount,
      stayStatus: 'CHECKED_OUT',
    });

    res.status(200).json({
      success: true,
      message: 'Express checkout requested successfully! Front desk and housekeeping have been notified.',
      data: {
        stayId: stay._id,
        roomNumber: room?.roomNumber,
        status: 'EXPRESS_CHECKOUT_SUBMITTED',
        invoiceNumber: stay.taxInvoiceNumber,
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

// Helper: Combine Date and Time into a single standardized Date object
export function combineDateTime(
  dateInput?: string | Date,
  timeInput?: string,
  defaultHour = 11,
  defaultMinute = 0
): Date {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return new Date();

  if (timeInput && typeof timeInput === 'string' && timeInput.trim()) {
    const raw = timeInput.trim();
    const match12 = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (match12) {
      let hours = parseInt(match12[1], 10);
      const minutes = parseInt(match12[2], 10);
      const mer = (match12[3] || '').toUpperCase();
      if (mer === 'PM' && hours < 12) hours += 12;
      if (mer === 'AM' && hours === 12) hours = 0;
      d.setHours(hours, minutes, 0, 0);
      return d;
    }
  }
  d.setHours(defaultHour, defaultMinute, 0, 0);
  return d;
}

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

    const reqCheckInDate = req.query.checkInDate as string;
    const reqCheckInTime = (req.query.checkInTime || req.query.estimatedArrivalTime) as string;
    const reqCheckOutDate = req.query.checkOutDate as string;
    const reqCheckOutTime = req.query.checkOutTime as string;

    let filterStart: Date | null = null;
    let filterEnd: Date | null = null;

    if (reqCheckInDate) {
      filterStart = combineDateTime(reqCheckInDate, reqCheckInTime, 12, 0);
      filterEnd = reqCheckOutDate
        ? combineDateTime(reqCheckOutDate, reqCheckOutTime, 11, 0)
        : new Date(filterStart.getTime() + 86400000);
      if (filterEnd <= filterStart) {
        filterEnd = new Date(filterStart.getTime() + 86400000);
      }
    }

    const conflictingRoomIds = new Map<string, string>();
    if (filterStart && filterEnd) {
      const activeBookings = await Booking.find({
        hotelId: new Types.ObjectId(hotelId),
        bookingStatus: {
          $in: [
            BookingStatus.CONFIRMED,
            BookingStatus.PENDING_APPROVAL,
            BookingStatus.CHECKED_IN,
          ],
        },
        checkInDate: { $lt: filterEnd },
        checkOutDate: { $gt: filterStart },
      }).select('allocatedRoomId checkInDate checkOutDate guestName');

      for (const b of activeBookings) {
        if (b.allocatedRoomId) {
          const sTime = new Date(b.checkInDate).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
          const eTime = new Date(b.checkOutDate).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
          conflictingRoomIds.set(String(b.allocatedRoomId), `${sTime} - ${eTime}`);
        }
      }

      const activeStays = await Stay.find({
        hotelId: new Types.ObjectId(hotelId),
        stayStatus: { $in: [StayStatus.ACTIVE, StayStatus.EXTENDED] },
        checkInTimestamp: { $lt: filterEnd },
        expectedCheckOutTimestamp: { $gt: filterStart },
      }).select('roomId checkInTimestamp expectedCheckOutTimestamp');

      for (const s of activeStays) {
        if (s.roomId) {
          const sTime = new Date(s.checkInTimestamp).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
          const eTime = new Date(s.expectedCheckOutTimestamp).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
          conflictingRoomIds.set(String(s.roomId), `${sTime} - ${eTime}`);
        }
      }
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

    const hasNonAcRooms = rooms.some((rm: any) => {
      const rt = rm.roomTypeId || {};
      return rm.isAc === false || rt.isAc === false || /non[-\s]?ac/i.test(rt.name || '');
    });

    const mappedRooms = rooms.map((r: any) => {
      const rawStatus = r.status || RoomStatus.AVAILABLE;
      const conflictSlot = conflictingRoomIds.get(String(r._id));
      let displayStatus = 'OCCUPIED';
      let statusBadge = 'Not available at this time (Occupied)';

      if (conflictSlot) {
        displayStatus = 'RESERVED';
        statusBadge = `Already booked for slot (${conflictSlot})`;
        occupiedCount += 1;
      } else if (rawStatus === RoomStatus.AVAILABLE) {
        displayStatus = 'AVAILABLE';
        statusBadge = 'Ready for Booking';
        availableCount += 1;
      } else if (
        rawStatus === RoomStatus.DIRTY ||
        rawStatus === RoomStatus.CLEANING ||
        rawStatus === RoomStatus.INSPECTION
      ) {
        displayStatus = 'CLEANING';
        statusBadge = 'Not available at this time (Cleaning)';
        cleaningCount += 1;
      } else if (rawStatus === RoomStatus.OUT_OF_SERVICE) {
        displayStatus = 'MAINTENANCE';
        statusBadge = 'Not available at this time (Maintenance)';
        maintenanceCount += 1;
      } else if (rawStatus === RoomStatus.RESERVED) {
        displayStatus = 'RESERVED';
        statusBadge = 'Not available at this time (Booked)';
        occupiedCount += 1;
      } else {
        occupiedCount += 1;
      }

      const roomType = r.roomTypeId || {};
      const basePrice = Number(roomType.basePriceOvernight) || 2500;
      const gstRate = basePrice > 7500 ? 18 : 12;
      const roomPhotos = Array.isArray(r.photos) && r.photos.length > 0
        ? r.photos
        : (Array.isArray(roomType.images) && roomType.images.length > 0
            ? roomType.images
            : (Array.isArray(roomType.photos) && roomType.photos.length > 0 ? roomType.photos : []));
      const isAc = r.isAc !== false && roomType.isAc !== false && !/non[-\s]?ac/i.test(roomType.name || '');

      return {
        id: r._id,
        roomNumber: r.roomNumber,
        floorNumber: r.floorNumber,
        wing: r.wing || 'Main Wing',
        rawStatus,
        displayStatus,
        statusBadge,
        isBookable: rawStatus === RoomStatus.AVAILABLE && !conflictSlot,
        photos: roomPhotos,
        isAc,
        roomType: {
          id: roomType._id,
          name: roomType.name || 'Deluxe Room',
          code: roomType.code || 'DLX',
          basePriceOvernight: basePrice,
          gstRate,
          amenities: roomType.amenities && roomType.amenities.length > 0
            ? roomType.amenities
            : [isAc ? 'Climate Control AC' : 'Ceiling Fan & Air Cooler', 'King Size Bed', 'High-Speed Wi-Fi', 'Smart HD TV', 'Attached Luxury Bath'],
          maxCapacity: roomType.maxCapacity || roomType.baseCapacityAdults || 2,
          isAc,
          photos: roomPhotos,
          images: roomPhotos,
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
          wifiSsid: tenant.wifiSsid || 'TajGateway_HighSpeed',
          wifiPassword: tenant.wifiPassword || 'SpiceGuest@2026',
          allRoomsAcOnly: !hasNonAcRooms,
          hasNonAcRooms,
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

// Store for customer phone OTP verification (in-hotel bookings)
const guestPhoneOtpStore = new Map<string, { otp: string; expiresAt: number; phone: string }>();

// 9b. Public Phone OTP Sender (In-Hotel Booking Verification)
export const sendGuestPhoneOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone } = req.body;
    if (!phone) {
      res.status(400).json({ success: false, errorCode: 'PHONE_REQUIRED', message: 'Valid mobile number is required' });
      return;
    }
    const cleanPhone = String(phone).replace(/[^0-9]/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      res.status(400).json({ success: false, errorCode: 'INVALID_PHONE', message: 'Please enter a valid 10-digit mobile number' });
      return;
    }
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    guestPhoneOtpStore.set(cleanPhone, {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000,
      phone: cleanPhone,
    });
    console.log(`[GuestPortal] 📱 Phone verification OTP generated for ${cleanPhone}: ${otp}`);

    res.status(200).json({
      success: true,
      message: `Verification OTP sent to +91 ${cleanPhone}. Please enter the 4-digit code.`,
      data: {
        phone: cleanPhone,
        expiresInSeconds: 600,
        devOtpHint: otp,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: err.message });
  }
};

// 9c. Public Phone OTP Verification
export const verifyGuestPhoneOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      res.status(400).json({ success: false, errorCode: 'MISSING_FIELDS', message: 'Phone and 4-digit OTP are required' });
      return;
    }
    const cleanPhone = String(phone).replace(/[^0-9]/g, '').slice(-10);
    const cleanOtp = String(otp).trim();
    const stored = guestPhoneOtpStore.get(cleanPhone);

    // SECURITY: master OTPs are a local-development convenience only and must never
    // be honored in production. Production guests must present the OTP we issued.
    const isMasterOtp =
      process.env.NODE_ENV !== 'production' &&
      (cleanOtp === '9999' || cleanOtp === '1234');
    if (!isMasterOtp) {
      if (!stored || Date.now() > stored.expiresAt) {
        guestPhoneOtpStore.delete(cleanPhone);
        res.status(400).json({ success: false, errorCode: 'OTP_EXPIRED', message: 'Verification OTP expired. Please request a new one.' });
        return;
      }
      if (stored.otp !== cleanOtp) {
        res.status(400).json({ success: false, errorCode: 'INVALID_OTP', message: 'Incorrect OTP. Please check and try again.' });
        return;
      }
    }
    guestPhoneOtpStore.delete(cleanPhone);
    res.status(200).json({
      success: true,
      message: `Phone number +91 ${cleanPhone} verified successfully!`,
      data: { phone: cleanPhone, verified: true },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: err.message });
  }
};

// 9d. Live Booking Status Poller (Approval Waiting Screen)
export const getBookingStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookingNumber } = req.params;
    if (!bookingNumber) {
      res.status(400).json({ success: false, errorCode: 'BOOKING_NUMBER_REQUIRED', message: 'Booking number is required' });
      return;
    }

    const booking = await Booking.findOne({ bookingNumber: String(bookingNumber).trim() })
      .populate('roomTypeId')
      .populate('allocatedRoomId');

    if (!booking) {
      res.status(404).json({ success: false, errorCode: 'BOOKING_NOT_FOUND', message: 'Booking reservation not found' });
      return;
    }

    const room = (booking.allocatedRoomId as any) || (await Room.findById(booking.allocatedRoomId));

    if (booking.bookingStatus === BookingStatus.CHECKED_IN) {
      const stay = await Stay.findOne({ bookingId: booking._id, stayStatus: StayStatus.ACTIVE });
      let rawSessionToken = '';
      if (stay && room) {
        rawSessionToken = signGuestSessionToken({
          hotelId: String(room.hotelId),
          stayId: String(stay._id),
          roomId: String(room._id),
          roomNumber: String(room.roomNumber),
        });
      }

      const tenantDoc = await Tenant.findById(booking.hotelId).select('wifiSsid wifiPassword name');
      res.status(200).json({
        success: true,
        data: {
          isApproved: true,
          bookingStatus: 'CHECKED_IN',
          approvalStatus: 'APPROVED',
          bookingNumber: booking.bookingNumber,
          roomNumber: room?.roomNumber,
          roomId: room?._id,
          stayId: stay?._id,
          sessionToken: rawSessionToken,
          guestName: booking.guestName,
          guestPhone: booking.guestPhone,
          nights: booking.nights || 1,
          checkInDate: booking.checkInDate,
          checkOutDate: booking.checkOutDate,
          grandTotal: booking.grandTotal,
          wifiSsid: tenantDoc?.wifiSsid || 'SpiceHub_HighSpeed',
          wifiPassword: tenantDoc?.wifiPassword || `Guest@${room?.roomNumber || '101'}`,
          hotelName: tenantDoc?.name || 'SpiceHub Hospitality',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        isApproved: false,
        bookingStatus: booking.bookingStatus,
        approvalStatus: 'PENDING_RECEPTION_APPROVAL',
        bookingNumber: booking.bookingNumber,
        roomNumber: room?.roomNumber,
        guestName: booking.guestName,
        guestPhone: booking.guestPhone,
        nights: booking.nights || 1,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        grandTotal: booking.grandTotal,
        aadhaarFrontUrl: booking.aadhaarFrontUrl,
        aadhaarBackUrl: booking.aadhaarBackUrl,
        secondaryGuestName: booking.secondaryGuestName,
        secondaryGuestRelationship: booking.secondaryGuestRelationship,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: err.message });
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
      nights: reqNights,
      estimatedArrivalTime,
      guestName,
      guestPhone,
      guestEmail,
      isCouple = false,
      idType = 'AADHAAR',
      idNumber,
      aadhaarFrontUrl,
      aadhaarBackUrl,
      aadhaarFrontImage,
      aadhaarBackImage,
      advancePaid = 0,
      deviceLocation,
      bookingLocation,
      guestPhoneVerified,
      loginPhone,
      loginGuestName,
      secondaryGuestName,
      secondaryGuestPhone,
      secondaryGuestRelationship,
      distanceFromHotelKm,
    } = req.body;

    if (!hotelId || !Types.ObjectId.isValid(hotelId)) {
      res.status(400).json({ success: false, errorCode: 'INVALID_HOTEL', message: 'Valid hotelId is required' });
      return;
    }

    let targetRoomId = roomId;
    if ((!targetRoomId || !Types.ObjectId.isValid(targetRoomId)) && req.body.roomNumber) {
      const foundByNumber = await Room.findOne({
        hotelId: new Types.ObjectId(hotelId),
        roomNumber: String(req.body.roomNumber).trim(),
      });
      if (foundByNumber) {
        targetRoomId = String(foundByNumber._id);
      }
    }

    if (!targetRoomId || !Types.ObjectId.isValid(targetRoomId)) {
      res.status(400).json({ success: false, errorCode: 'INVALID_ROOM', message: 'Valid roomId or roomNumber is required' });
      return;
    }

    const room = await Room.findOne({ _id: new Types.ObjectId(targetRoomId), hotelId: new Types.ObjectId(hotelId) }).populate('roomTypeId');
    if (!room) {
      res.status(404).json({ success: false, errorCode: 'ROOM_NOT_FOUND', message: 'Room not found' });
      return;
    }

    const effectiveArrivalTime = (req.body.checkInTime || estimatedArrivalTime || '').trim();
    const effectiveDepartureTime = (req.body.checkOutTime || '').trim();
    const targetCheckIn = combineDateTime(checkInDate, effectiveArrivalTime, 12, 0);
    const numNights = Math.max(1, Number(reqNights) || (checkOutDate ? Math.ceil((new Date(checkOutDate).getTime() - targetCheckIn.getTime()) / (1000 * 3600 * 24)) : 1));
    let targetCheckOut = checkOutDate
      ? combineDateTime(checkOutDate, effectiveDepartureTime, 11, 0)
      : new Date(targetCheckIn.getTime() + numNights * 86400000);

    if (targetCheckOut <= targetCheckIn) {
      if (checkOutDate && effectiveDepartureTime) {
        res.status(400).json({
          success: false,
          errorCode: 'INVALID_TIME_INTERVAL',
          message: 'Check-out date and time must be later than check-in date and time.',
        });
        return;
      }
      targetCheckOut = new Date(targetCheckIn.getTime() + numNights * 86400000);
      targetCheckOut.setHours(11, 0, 0, 0);
    }

    // Date & Time Collision Detection against Bookings
    const conflictingBooking = await Booking.findOne({
      hotelId: room.hotelId,
      allocatedRoomId: room._id,
      bookingStatus: {
        $in: [
          BookingStatus.CONFIRMED,
          BookingStatus.PENDING_APPROVAL,
          BookingStatus.CHECKED_IN,
        ],
      },
      checkInDate: { $lt: targetCheckOut },
      checkOutDate: { $gt: targetCheckIn },
    });

    if (conflictingBooking) {
      const confStart = new Date(conflictingBooking.checkInDate).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      const confEnd = new Date(conflictingBooking.checkOutDate).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      res.status(409).json({
        success: false,
        errorCode: 'ROOM_ALREADY_BOOKED',
        message: `Room ${room.roomNumber} is already booked for this time slot (${confStart} ➔ ${confEnd}). Please select a different time or choose another available room.`,
        conflictingBooking: {
          bookingNumber: conflictingBooking.bookingNumber,
          guestName: conflictingBooking.guestName,
          checkInDate: conflictingBooking.checkInDate,
          checkOutDate: conflictingBooking.checkOutDate,
        },
      });
      return;
    }

    // Date & Time Collision Detection against active Stays
    const conflictingStay = await Stay.findOne({
      hotelId: room.hotelId,
      roomId: room._id,
      stayStatus: { $in: [StayStatus.ACTIVE, StayStatus.EXTENDED] },
      checkInTimestamp: { $lt: targetCheckOut },
      expectedCheckOutTimestamp: { $gt: targetCheckIn },
    });

    if (conflictingStay) {
      const stayStart = new Date(conflictingStay.checkInTimestamp).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      const stayEnd = new Date(conflictingStay.expectedCheckOutTimestamp).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      res.status(409).json({
        success: false,
        errorCode: 'ROOM_ALREADY_OCCUPIED',
        message: `Room ${room.roomNumber} is currently occupied by an active guest stay (${stayStart} ➔ ${stayEnd}). Please select another time or room.`,
      });
      return;
    }

    if (room.status === RoomStatus.OUT_OF_SERVICE) {
      res.status(409).json({
        success: false,
        errorCode: 'ROOM_OUT_OF_SERVICE',
        message: `Room ${room.roomNumber} is currently under maintenance / out of service.`,
      });
      return;
    }

    const isImmediateCheckIn = targetCheckIn.getTime() <= Date.now() + 6 * 3600 * 1000;
    if (isImmediateCheckIn && room.status !== RoomStatus.AVAILABLE) {
      res.status(409).json({
        success: false,
        errorCode: 'ROOM_NOT_AVAILABLE',
        message: `Room ${room.roomNumber} is currently ${room.status}. Only available rooms can be booked for immediate check-in.`,
      });
      return;
    }

    const effectiveName = (guestName || 'Valued Guest').trim();
    const effectivePhone = (guestPhone || '9820011223').trim();
    const effectiveEmail = (guestEmail || `${effectivePhone}@guest.spicehub.com`).trim();

    // Check maximum 2 rooms limit per customer mobile number
    const activeCustomerBookings = await Booking.find({
      hotelId: room.hotelId,
      guestPhone: effectivePhone,
      bookingStatus: { $in: [BookingStatus.CONFIRMED, BookingStatus.PENDING_APPROVAL, BookingStatus.CHECKED_IN] },
    });

    if (activeCustomerBookings.length >= 2) {
      res.status(403).json({
        success: false,
        errorCode: 'BOOKING_LIMIT_EXCEEDED',
        message: `Booking ceiling reached: You can book a maximum of 2 rooms per mobile number (${effectivePhone}). You already have ${activeCustomerBookings.length} active or pending rooms. Please contact Reception for group bookings.`,
        currentCount: activeCustomerBookings.length,
        maxAllowed: 2,
      });
      return;
    }

    // If booking a 2nd room, secondary guest info is mandatory
    if (activeCustomerBookings.length === 1 && !secondaryGuestName) {
      res.status(400).json({
        success: false,
        errorCode: 'SECONDARY_GUEST_REQUIRED',
        message: 'This is your 2nd room booking. Please specify who this room is for (Secondary Guest Name and Relationship).',
      });
      return;
    }

    // Location & Geofence Verification (Hotel vs Remote Home)
    const isHotelClaimed = bookingLocation === 'IN_HOTEL' || bookingLocation === 'HOTEL_RADIUS';
    let computedDistanceKm: number | undefined = typeof distanceFromHotelKm === 'number' ? distanceFromHotelKm : undefined;

    const tenant = await Tenant.findById(hotelId).select('coordinates latitude longitude name');
    const hotelLat = tenant?.coordinates?.latitude ?? (tenant as any)?.latitude ?? 26.9124;
    const hotelLng = tenant?.coordinates?.longitude ?? (tenant as any)?.longitude ?? 75.7873;
    const uLat = typeof req.body.userLat === 'number' ? req.body.userLat : deviceLocation?.latitude;
    const uLng = typeof req.body.userLng === 'number' ? req.body.userLng : deviceLocation?.longitude;

    if (hotelLat && hotelLng && typeof uLat === 'number' && typeof uLng === 'number') {
      const R = 6371;
      const dLat = ((hotelLat - uLat) * Math.PI) / 180;
      const dLon = ((hotelLng - uLng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((uLat * Math.PI) / 180) *
          Math.cos((hotelLat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      computedDistanceKm = Math.round(R * c * 100) / 100;
    }

    if (isHotelClaimed && computedDistanceKm !== undefined && computedDistanceKm > 0.5) {
      res.status(400).json({
        success: false,
        errorCode: 'GEOFENCE_OUT_OF_BOUNDS',
        message: `You are approximately ${computedDistanceKm} km away from ${tenant?.name || 'the hotel'}. Please switch to 'Remote / Book from Home' to reserve your room in advance.`,
        distanceKm: computedDistanceKm,
      });
      return;
    }

    // On-site hotel bookings require phone OTP verification
    if (isHotelClaimed && !guestPhoneVerified) {
      res.status(400).json({
        success: false,
        errorCode: 'PHONE_OTP_REQUIRED',
        message: 'On-site hotel check-in requires a verified phone number via OTP.',
      });
      return;
    }

    // Date & Tariff Calculation (Nights & Check-out schedule)
    const checkIn = targetCheckIn;
    const checkOut = targetCheckOut;

    const roomType = (room.roomTypeId as any) || {};
    const basePrice = Number(roomType.basePriceOvernight) || 2500;
    const gstRate = basePrice > 7500 ? 18 : 12;
    const totalTariff = basePrice * numNights;
    const taxAmount = Math.round((totalTariff * (gstRate / 100)) * 100) / 100;
    const grandTotal = totalTariff + taxAmount;
    const advance = Number(advancePaid) || 0;
    const dueAmount = Math.max(0, grandTotal - advance);

    // Aadhaar Document Handling
    const effectiveAadhaarFront = (aadhaarFrontUrl || aadhaarFrontImage || '').trim();
    const effectiveAadhaarBack = (aadhaarBackUrl || aadhaarBackImage || '').trim();

    let maskedId = 'AADHAAR_PHOTO_VERIFIED';
    if (idNumber) {
      const clean = String(idNumber).replace(/[^0-9a-zA-Z]/g, '');
      const last4 = clean.slice(-4);
      maskedId = clean.length > 4 ? `XXXX-XXXX-${last4}` : `XXXX-${clean}`;
    } else if (effectiveAadhaarFront) {
      maskedId = 'AADHAAR_CARD_UPLOADED';
    }

    const ts = `${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
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
      loginPhone: (loginPhone || '').trim() || effectivePhone,
      loginGuestName: (loginGuestName || '').trim() || effectiveName,
      idProofType: 'AADHAAR',
      idProofNumber: maskedId,
      idProofDocumentUrl: effectiveAadhaarFront || undefined,
      aadhaarFrontUrl: effectiveAadhaarFront || undefined,
      aadhaarBackUrl: effectiveAadhaarBack || undefined,
      nights: numNights,
      estimatedArrivalTime: effectiveArrivalTime,
      guestPhoneVerified: Boolean(guestPhoneVerified),
      secondaryGuestName: (secondaryGuestName || '').trim(),
      secondaryGuestPhone: (secondaryGuestPhone || '').trim(),
      secondaryGuestRelationship: (secondaryGuestRelationship || '').trim(),
      distanceFromHotelKm: typeof computedDistanceKm === 'number' ? computedDistanceKm : (typeof distanceFromHotelKm === 'number' ? distanceFromHotelKm : undefined),
      bookingLocation: (bookingLocation || 'HOTEL_RADIUS') as any,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      totalTariff,
      taxAmount,
      grandTotal,
      advancePaymentAmount: advance,
      paymentStatus: advance >= grandTotal ? 'PAID' : (advance > 0 ? 'PARTIAL' : 'UNPAID'),
      bookingStatus: BookingStatus.PENDING_APPROVAL,
    });

    // Mark room as RESERVED in DB, return pending status and broadcast to reception
    room.status = RoomStatus.RESERVED;
    await room.save();

    const isFromHotel = bookingLocation === 'IN_HOTEL' || bookingLocation === 'HOTEL_RADIUS';
    const originLabel = isFromHotel ? 'HOTEL_PREMISES' : 'REMOTE_HOME';
    const originText = isFromHotel ? 'Booked from Hotel Premises (होटल से)' : 'Booked from Home / Remote (घर से)';

    io.to(`${room.hotelId}_admin`)
      .to(`${room.hotelId}_pms`)
      .to(`${room.hotelId}_frontdesk`)
      .to(`${room.hotelId}_global`)
      .emit('pms:room_status_changed', {
        roomId: room._id,
        roomNumber: room.roomNumber,
        status: RoomStatus.RESERVED,
        guestName: effectiveName,
        bookingNumber: booking.bookingNumber,
      });

    io.to(`${room.hotelId}_admin`).to(`${room.hotelId}_pms`).to(`${room.hotelId}_frontdesk`).emit('reception:new_checkin_request', {
      bookingId: booking._id,
      bookingNumber: booking.bookingNumber,
      roomNumber: room.roomNumber,
      guestName: effectiveName,
      guestPhone: effectivePhone,
      loginPhone: booking.loginPhone || effectivePhone,
      loginGuestName: booking.loginGuestName || effectiveName,
      nights: numNights,
      estimatedArrivalTime: effectiveArrivalTime,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      idType: 'AADHAAR',
      idNumber: maskedId,
      aadhaarFrontUrl: effectiveAadhaarFront,
      aadhaarBackUrl: effectiveAadhaarBack,
      secondaryGuestName: booking.secondaryGuestName,
      secondaryGuestPhone: booking.secondaryGuestPhone,
      secondaryGuestRelationship: booking.secondaryGuestRelationship,
      bookingLocation: booking.bookingLocation,
      bookingOrigin: originLabel,
      originText,
      distanceFromHotelKm: booking.distanceFromHotelKm,
      submittedAt: new Date(),
      grandTotal,
    });

    res.status(201).json({
      success: true,
      message: `Aadhaar documents for Room ${room.roomNumber} submitted to Reception Desk for approval!`,
      data: {
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        hotelId: room.hotelId,
        roomId: room._id,
        roomNumber: room.roomNumber,
        roomTypeName: roomType.name || 'Deluxe Room',
        guestName: effectiveName,
        guestPhone: effectivePhone,
        nights: numNights,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        estimatedArrivalTime: effectiveArrivalTime,
        grandTotal,
        advancePaid: advance,
        dueAmount,
        idType: 'AADHAAR',
        idNumber: maskedId,
        aadhaarFrontUrl: effectiveAadhaarFront,
        aadhaarBackUrl: effectiveAadhaarBack,
        secondaryGuestName: booking.secondaryGuestName,
        secondaryGuestRelationship: booking.secondaryGuestRelationship,
        bookingLocation: booking.bookingLocation,
        bookingOrigin: originLabel,
        originText,
        bookingStatus: 'PENDING_APPROVAL',
        approvalStatus: 'PENDING_RECEPTION_APPROVAL',
        requiresReceptionApproval: true,
      },
    });
    return;
  } catch (error: any) {
    console.error('❌ [bookAndCheckInGuest] Error:', error);
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// 10b. Reception Desk Approval for Pending Guest Bookings (Unlocks Room Portal & Keycard)
export const approveGuestCheckIn = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookingId, bookingNumber, hotelId } = req.body;

    let query: any = {};
    if (bookingId && Types.ObjectId.isValid(bookingId)) {
      query._id = new Types.ObjectId(bookingId);
    } else if (bookingNumber) {
      query.bookingNumber = String(bookingNumber).trim();
    } else {
      res.status(400).json({ success: false, errorCode: 'MISSING_FIELDS', message: 'bookingId or bookingNumber is required' });
      return;
    }

    if (hotelId && Types.ObjectId.isValid(hotelId)) {
      query.hotelId = new Types.ObjectId(hotelId);
    }

    const booking = await Booking.findOne(query).populate('roomTypeId');
    if (!booking) {
      res.status(404).json({ success: false, errorCode: 'BOOKING_NOT_FOUND', message: 'Booking reservation not found' });
      return;
    }

    let room = booking.allocatedRoomId
      ? await Room.findById(booking.allocatedRoomId).populate('roomTypeId')
      : null;

    if (!room) {
      room = await Room.findOne({
        hotelId: booking.hotelId,
        roomTypeId: booking.roomTypeId?._id || booking.roomTypeId,
        status: RoomStatus.AVAILABLE,
      }).populate('roomTypeId');

      if (!room) {
        room = await Room.findOne({
          hotelId: booking.hotelId,
          status: RoomStatus.AVAILABLE,
        }).populate('roomTypeId');
      }

      if (!room) {
        res.status(409).json({ success: false, errorCode: 'NO_ROOM_AVAILABLE', message: 'No available room found to allocate for check-in' });
        return;
      }
    }

    booking.allocatedRoomId = room._id;
    booking.bookingStatus = BookingStatus.CHECKED_IN;
    booking.receptionApprovedAt = new Date();
    booking.receptionApprovedBy = 'Front Desk Receptionist';
    await booking.save();

    let stay = await Stay.findOne({ bookingId: booking._id, hotelId: booking.hotelId });
    let folio = stay?.masterFolioId ? await MasterFolio.findById(stay.masterFolioId) : null;

    const folioNumber = `FOLIO-${room.roomNumber}-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const nights = Math.max(1, Math.ceil((new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / (1000 * 3600 * 24)));
    const roomType = (room.roomTypeId as any) || {};
    const basePrice = Number(roomType.basePriceOvernight) || 2500;
    const gstRate = basePrice > 7500 ? 18 : 12;
    const totalTariff = basePrice * nights;
    const taxAmount = Math.round((totalTariff * (gstRate / 100)) * 100) / 100;
    const grandTotal = totalTariff + taxAmount;
    const advance = Number(booking.advancePaymentAmount) || 0;
    const dueAmount = Math.max(0, grandTotal - advance);

    const targetStayId = stay?._id || new Types.ObjectId();
    const targetFolioId = folio?._id || new Types.ObjectId();

    if (!folio) {
      folio = await MasterFolio.create({
        _id: targetFolioId,
        stayId: targetStayId,
        hotelId: room.hotelId,
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

      await FolioLineItem.create({
        hotelId: room.hotelId,
        folioId: targetFolioId,
        department: DepartmentType.ROOM_RENT,
        description: `Room ${room.roomNumber} (${nights} Night(s)) Accommodation Tariff`,
        rate: totalTariff,
        quantity: 1,
        taxRate: gstRate,
        taxAmount,
        netAmount: grandTotal,
        postedAt: new Date(),
      });
    }

    if (!stay) {
      let guestProfile = await GuestProfile.findOne({ hotelId: room.hotelId, phone: booking.guestPhone });
      if (!guestProfile) {
        guestProfile = await GuestProfile.create({
          hotelId: room.hotelId,
          name: booking.guestName,
          phone: booking.guestPhone,
          email: booking.guestEmail,
          totalVisits: 1,
          totalLifetimeSpend: grandTotal,
        });
      }

      stay = await Stay.create({
        _id: targetStayId,
        hotelId: room.hotelId,
        roomId: room._id,
        bookingId: booking._id,
        guestId: guestProfile._id,
        stayStatus: StayStatus.ACTIVE,
        masterFolioId: folio._id,
        checkInTimestamp: booking.checkInDate || new Date(),
        expectedCheckOutTimestamp: booking.checkOutDate || new Date(Date.now() + 86400000),
        isCouple: false,
        verificationMode: booking.idProofType || 'AADHAAR',
        idNumberMasked: booking.idProofNumber || 'VERIFIED_AT_RECEPTION',
        aadhaarFrontUrl: booking.aadhaarFrontUrl,
        aadhaarBackUrl: booking.aadhaarBackUrl,
        nights: booking.nights || nights,
        secondaryGuestName: booking.secondaryGuestName,
        secondaryGuestPhone: booking.secondaryGuestPhone,
        secondaryGuestRelationship: booking.secondaryGuestRelationship,
        verifiedByReceptionist: true,
        keycardExpiresAt: booking.checkOutDate || new Date(Date.now() + 86400000),
        receptionistNotes: 'Checked in & verified at Front Desk Reception',
      });
    } else {
      stay.stayStatus = StayStatus.ACTIVE;
      stay.verifiedByReceptionist = true;
      stay.aadhaarFrontUrl = booking.aadhaarFrontUrl;
      stay.aadhaarBackUrl = booking.aadhaarBackUrl;
      stay.nights = booking.nights || nights;
      stay.secondaryGuestName = booking.secondaryGuestName;
      stay.secondaryGuestPhone = booking.secondaryGuestPhone;
      stay.secondaryGuestRelationship = booking.secondaryGuestRelationship;
      await stay.save();
    }

    room.status = RoomStatus.OCCUPIED;
    room.currentStayId = stay._id as any;
    await room.save();

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

    io.to(`${room.hotelId}_global`)
      .to(`${room.hotelId}_admin`)
      .to(`${room.hotelId}_pms`)
      .to(`${room.hotelId}_frontdesk`)
      .emit('pms:room_status_changed', {
        roomId: room._id,
        roomNumber: room.roomNumber,
        status: RoomStatus.OCCUPIED,
        guestName: booking.guestName,
        bookingNumber: booking.bookingNumber,
      });

    const tenantDoc = await Tenant.findById(booking.hotelId).select('wifiSsid wifiPassword name');
    const dynamicWifiSsid = tenantDoc?.wifiSsid || 'SpiceHub_HighSpeed';
    const dynamicWifiPassword = tenantDoc?.wifiPassword || `Guest@${room.roomNumber}`;

    io.to(`${room.hotelId}_global`)
      .to(`${room.hotelId}_admin`)
      .to(`${room.hotelId}_pms`)
      .to(`${room.hotelId}_frontdesk`)
      .emit('pms:booking_approved', {
        bookingNumber: booking.bookingNumber,
        roomNumber: room.roomNumber,
        roomId: room._id,
        guestName: booking.guestName,
        guestPhone: booking.guestPhone,
        stayId: stay._id,
        sessionToken: rawSessionToken,
        wifiSsid: dynamicWifiSsid,
        wifiPassword: dynamicWifiPassword,
        checkInDate: stay.checkInTimestamp,
        checkOutDate: stay.expectedCheckOutTimestamp,
        nights: booking.nights || nights,
        grandTotal,
        approvedAt: new Date(),
      });

    res.status(200).json({
      success: true,
      message: `Booking #${booking.bookingNumber} approved by Reception! Keycard activated for Room ${room.roomNumber}.`,
      data: {
        sessionToken: rawSessionToken,
        hotelId: room.hotelId,
        roomId: room._id,
        roomNumber: room.roomNumber,
        roomTypeName: roomType.name || 'Deluxe Room',
        guestName: booking.guestName,
        guestPhone: booking.guestPhone,
        checkInDate: stay.checkInTimestamp,
        checkOutDate: stay.expectedCheckOutTimestamp,
        stayId: stay._id,
        masterFolioId: folio._id,
        folioNumber: folio.folioNumber,
        grandTotal,
        dueAmount,
        bookingStatus: 'CHECKED_IN',
        approvalStatus: 'APPROVED',
        wifiSsid: dynamicWifiSsid,
        wifiPassword: dynamicWifiPassword,
      },
    });
  } catch (err: any) {
    console.error('❌ [approveGuestCheckIn] Error:', err);
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: err.message });
  }
};

// 10b. Reception Front Desk Reject Check-In / Remote Booking
export const rejectGuestCheckIn = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookingId, bookingNumber, hotelId, reason } = req.body;

    let query: any = {};
    if (bookingId && Types.ObjectId.isValid(bookingId)) {
      query._id = new Types.ObjectId(bookingId);
    } else if (bookingNumber) {
      query.bookingNumber = String(bookingNumber).trim();
    } else {
      res.status(400).json({ success: false, errorCode: 'MISSING_FIELDS', message: 'bookingId or bookingNumber is required' });
      return;
    }

    if (hotelId && Types.ObjectId.isValid(hotelId)) {
      query.hotelId = new Types.ObjectId(hotelId);
    }

    const booking = await Booking.findOne(query);
    if (!booking) {
      res.status(404).json({ success: false, errorCode: 'BOOKING_NOT_FOUND', message: 'Booking reservation not found' });
      return;
    }

    const rejectionReason = reason || 'ID document verification rejected by Reception Front Desk';
    booking.bookingStatus = BookingStatus.CANCELLED;
    (booking as any).receptionRejectionReason = rejectionReason;
    booking.receptionApprovedBy = 'Front Desk Receptionist (Rejected)';
    await booking.save();

    // Release allocated room if it was reserved
    if (booking.allocatedRoomId) {
      const room = await Room.findById(booking.allocatedRoomId);
      if (room && room.status === RoomStatus.RESERVED) {
        room.status = RoomStatus.AVAILABLE;
        await room.save();

        io.to(`${room.hotelId}_admin`)
          .to(`${room.hotelId}_pms`)
          .to(`${room.hotelId}_frontdesk`)
          .to(`${room.hotelId}_global`)
          .emit('pms:room_status_changed', {
            roomId: room._id,
            roomNumber: room.roomNumber,
            status: RoomStatus.AVAILABLE,
          });
      }
    }

    io.to(`${booking.hotelId}_global`)
      .to(`${booking.hotelId}_admin`)
      .to(`${booking.hotelId}_frontdesk`)
      .emit('pms:booking_rejected', {
        bookingNumber: booking.bookingNumber,
        guestName: booking.guestName,
        guestPhone: booking.guestPhone,
        reason: rejectionReason,
        rejectedAt: new Date(),
      });

    res.status(200).json({
      success: true,
      message: `Booking #${booking.bookingNumber} rejected by Reception.`,
      data: {
        bookingNumber: booking.bookingNumber,
        bookingStatus: 'CANCELLED',
        reason: rejectionReason,
      },
    });
  } catch (err: any) {
    console.error('❌ [rejectGuestCheckIn] Error:', err);
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: err.message });
  }
};

// 10b2. Guest Self-Cancellation (Allowed ONLY while pending Reception Approval)
export const cancelGuestBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookingId, bookingNumber, hotelId } = req.body;

    let query: any = {};
    if (bookingId && Types.ObjectId.isValid(bookingId)) {
      query._id = new Types.ObjectId(bookingId);
    } else if (bookingNumber) {
      query.bookingNumber = String(bookingNumber).trim();
    } else {
      res.status(400).json({ success: false, errorCode: 'MISSING_FIELDS', message: 'bookingId or bookingNumber is required' });
      return;
    }

    if (hotelId && Types.ObjectId.isValid(hotelId)) {
      query.hotelId = new Types.ObjectId(hotelId);
    }

    const booking = await Booking.findOne(query);
    if (!booking) {
      res.status(404).json({ success: false, errorCode: 'BOOKING_NOT_FOUND', message: 'Booking reservation not found' });
      return;
    }

    // STRICT CANCELLATION GATE: If already approved or checked in, self-cancellation is forbidden
    if (booking.bookingStatus === BookingStatus.CHECKED_IN || (booking as any).receptionApprovedAt) {
      const tenant = await Tenant.findById(booking.hotelId).select('name contactPhone');
      res.status(403).json({
        success: false,
        errorCode: 'CANCELLATION_LOCKED_APPROVED',
        receptionContactRequired: true,
        message: 'This reservation has already been verified and approved by Reception. Self-cancellation is not permitted. Please contact the Front Desk directly for stay modifications or departure assistance.',
        hotelName: tenant?.name || 'Hotel Front Desk',
        helplinePhone: tenant?.contactPhone || '+91 141 2345678',
      });
      return;
    }

    if (booking.bookingStatus === BookingStatus.CANCELLED) {
      res.status(200).json({
        success: true,
        message: 'Booking is already cancelled.',
        data: { bookingNumber: booking.bookingNumber, bookingStatus: 'CANCELLED' },
      });
      return;
    }

    // Only allow self-cancellation if booking is still pending approval
    booking.bookingStatus = BookingStatus.CANCELLED;
    (booking as any).receptionRejectionReason = 'Cancelled by Guest before Front Desk approval';
    await booking.save();

    // Release allocated or reserved physical room back to available inventory
    if (booking.allocatedRoomId) {
      const room = await Room.findById(booking.allocatedRoomId);
      if (room && (room.status === RoomStatus.RESERVED || room.status === RoomStatus.OCCUPIED)) {
        room.status = RoomStatus.AVAILABLE;
        await room.save();

        io.to(`${room.hotelId}_admin`)
          .to(`${room.hotelId}_pms`)
          .to(`${room.hotelId}_frontdesk`)
          .to(`${room.hotelId}_global`)
          .emit('pms:room_status_changed', {
            roomId: room._id,
            roomNumber: room.roomNumber,
            status: RoomStatus.AVAILABLE,
          });
      }
    }

    io.to(`${booking.hotelId}_global`)
      .to(`${booking.hotelId}_admin`)
      .to(`${booking.hotelId}_frontdesk`)
      .emit('pms:booking_cancelled', {
        bookingNumber: booking.bookingNumber,
        guestName: booking.guestName,
        guestPhone: booking.guestPhone,
        cancelledAt: new Date(),
      });

    res.status(200).json({
      success: true,
      message: `Reservation #${booking.bookingNumber} has been successfully cancelled.`,
      data: {
        bookingNumber: booking.bookingNumber,
        bookingStatus: 'CANCELLED',
      },
    });
  } catch (err: any) {
    console.error('❌ [cancelGuestBooking] Error:', err);
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: err.message });
  }
};

// 10c. Dynamic Pro-Rata / Early Checkout / Overstay Billing Engine
export const recalculateDynamicCheckoutBill = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, checkoutTimestamp } = req.body;
    const sessionToken = (req.headers['x-guest-session-token'] || token) as string;
    const resolved = await resolveGuestSession(sessionToken);
    if (!resolved) {
      res.status(401).json({ success: false, errorCode: 'INVALID_SESSION', message: 'Active guest session required' });
      return;
    }
    const { session, stay } = resolved;
    const folio = await MasterFolio.findById(stay.masterFolioId);
    if (!folio) {
      res.status(404).json({ success: false, errorCode: 'FOLIO_NOT_FOUND' });
      return;
    }

    const room = await Room.findById(session.roomId).populate('roomTypeId');
    const roomType = (room?.roomTypeId as any) || {};
    const baseDailyPrice = Number(roomType.basePriceOvernight) || 2500;
    const hourlyRate = Math.round(baseDailyPrice / 24);

    const checkInTime = new Date(stay.checkInTimestamp);
    const scheduledCheckOut = new Date(stay.expectedCheckOutTimestamp);
    const actualCheckOut = checkoutTimestamp ? new Date(checkoutTimestamp) : new Date();

    const scheduledDurationMs = Math.max(1, scheduledCheckOut.getTime() - checkInTime.getTime());
    const actualDurationMs = Math.max(1, actualCheckOut.getTime() - checkInTime.getTime());

    const scheduledHours = Math.round((scheduledDurationMs / (1000 * 3600)) * 10) / 10;
    const actualHours = Math.round((actualDurationMs / (1000 * 3600)) * 10) / 10;

    let adjustmentType: 'EARLY_CHECKOUT_SAVINGS' | 'OVERSTAY_SURCHARGE' | 'EXACT_CHECKOUT' = 'EXACT_CHECKOUT';
    let adjustmentAmount = 0;
    let adjustmentDescription = '';

    if (actualCheckOut.getTime() < scheduledCheckOut.getTime() - (3 * 3600 * 1000)) {
      adjustmentType = 'EARLY_CHECKOUT_SAVINGS';
      const unusedHours = Math.floor((scheduledCheckOut.getTime() - actualCheckOut.getTime()) / (1000 * 3600));
      adjustmentAmount = Math.round(unusedHours * hourlyRate);
      adjustmentDescription = `Early Checkout Credit (${unusedHours} unused hours refunded)`;
    } else if (actualCheckOut.getTime() > scheduledCheckOut.getTime() + (1 * 3600 * 1000)) {
      adjustmentType = 'OVERSTAY_SURCHARGE';
      const overstayHours = Math.ceil((actualCheckOut.getTime() - scheduledCheckOut.getTime()) / (1000 * 3600));
      adjustmentAmount = Math.round(overstayHours * (hourlyRate * 1.2));
      adjustmentDescription = `Late Checkout Overstay Surcharge (${overstayHours} additional hours)`;
    }

    const originalTariff = folio.totalRoomTariff;
    let adjustedTariff = originalTariff;
    if (adjustmentType === 'EARLY_CHECKOUT_SAVINGS') {
      adjustedTariff = Math.max(hourlyRate * 4, originalTariff - adjustmentAmount);
    } else if (adjustmentType === 'OVERSTAY_SURCHARGE') {
      adjustedTariff = originalTariff + adjustmentAmount;
    }

    const gstRate = adjustedTariff > 7500 ? 18 : 12;
    const adjustedTax = Math.round((adjustedTariff * (gstRate / 100)) * 100) / 100;
    const foodAndBeverage = folio.totalFoodAndBeverage || 0;
    const otherServices = (folio.totalLaundry || 0) + (folio.totalPaidServices || 0);
    const netAmountPayable = Math.round((adjustedTariff + adjustedTax + foodAndBeverage + otherServices) * 100) / 100;
    const advancePaid = folio.advancePaid || 0;
    const dueAmount = Math.max(0, netAmountPayable - advancePaid);

    res.status(200).json({
      success: true,
      data: {
        scheduledCheckOut: scheduledCheckOut.toISOString(),
        actualCheckOut: actualCheckOut.toISOString(),
        scheduledHours,
        actualHours,
        adjustmentType,
        adjustmentAmount,
        adjustmentDescription,
        originalTariff,
        adjustedTariff,
        taxAmount: adjustedTax,
        foodAndBeverage,
        otherServices,
        netAmountPayable,
        advancePaid,
        dueAmount,
        isRefundDue: advancePaid > netAmountPayable,
        refundAmount: advancePaid > netAmountPayable ? Math.round((advancePaid - netAmountPayable) * 100) / 100 : 0,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: err.message });
  }
};

// 10d. Waiter ETA & Messaging to Guest Room (Real-time updates)
export const updateOrderWaiterEta = async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = String(req.params.orderId || '');
    const { etaMinutes, message, waiterName } = req.body;

    if (!orderId || !Types.ObjectId.isValid(orderId)) {
      res.status(400).json({ success: false, errorCode: 'INVALID_ORDER', message: 'Valid orderId is required' });
      return;
    }

    const order = await RestaurantOrder.findById(orderId).populate('roomId');
    if (!order) {
      res.status(404).json({ success: false, errorCode: 'ORDER_NOT_FOUND', message: 'Order not found' });
      return;
    }

    if (etaMinutes !== undefined) order.waiterEtaMinutes = Number(etaMinutes);
    if (message) order.waiterMessage = String(message);
    if (waiterName) order.waiterName = String(waiterName);
    await order.save();

    const room = (order.roomId as any) || {};

    io.to(`${order.hotelId}_room_${room.roomNumber}`).to(`${order.hotelId}_global`).emit('order:eta_update', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      roomNumber: room.roomNumber,
      waiterEtaMinutes: order.waiterEtaMinutes,
      waiterMessage: order.waiterMessage,
      waiterName: order.waiterName || 'Room Service Steward',
      updatedAt: new Date(),
    });

    res.status(200).json({
      success: true,
      message: `ETA updated for Order #${order.orderNumber}`,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        waiterEtaMinutes: order.waiterEtaMinutes,
        waiterMessage: order.waiterMessage,
        waiterName: order.waiterName,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: err.message });
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
    let updatedCheckOut: Date;
    const currentCheckOut = stay.expectedCheckOutTimestamp ? new Date(stay.expectedCheckOutTimestamp) : new Date();

    if (req.body.daysToAdd && typeof req.body.daysToAdd === 'number') {
      updatedCheckOut = new Date(currentCheckOut.getTime() + req.body.daysToAdd * 24 * 60 * 60 * 1000);
    } else if (req.body.newCheckOutDate) {
      updatedCheckOut = new Date(req.body.newCheckOutDate);
    } else {
      res.status(400).json({ success: false, errorCode: 'INVALID_DATE', message: 'newCheckOutDate or daysToAdd is required' });
      return;
    }

    if (isNaN(updatedCheckOut.getTime())) {
      res.status(400).json({ success: false, errorCode: 'INVALID_DATE', message: 'Invalid check-out date format' });
      return;
    }

    if (updatedCheckOut <= currentCheckOut) {
      stay.expectedCheckOutTimestamp = updatedCheckOut;
      if (stay.stayStatus === StayStatus.CHECKED_OUT) {
        stay.stayStatus = StayStatus.ACTIVE;
      }
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


