import { Request, Response } from 'express';
import crypto from 'crypto';
import { Types } from 'mongoose';
import { Room } from '../models/Room';
import { Stay, StayStatus } from '../models/Stay';
import { Booking } from '../models/Booking';
import { GuestSession } from '../models/GuestSession';
import { MenuItem } from '../models/MenuItem';
import { RestaurantOrder, OrderType, OverallOrderStatus, ItemProductionStatus } from '../models/RestaurantOrder';
import { MasterFolio } from '../models/MasterFolio';
import { FolioLineItem, DepartmentType } from '../models/FolioLineItem';
import { ServiceRequest, ServiceRequestType, ServiceRequestPriority, ServiceRequestStatus } from '../models/ServiceRequest';
import { io } from '../index';

// 1. Resolve Permanent Room QR Code & Auto-Restore Guest Session
export const resolvePermanentRoomQR = async (req: Request, res: Response): Promise<void> => {
  try {
    const { hotelId, roomId, qrToken } = req.query;

    if (!hotelId || !roomId || !Types.ObjectId.isValid(roomId as string)) {
      res.status(400).json({ success: false, errorCode: 'INVALID_QUERY', message: 'Missing or invalid parameters' });
      return;
    }

    const room = await Room.findOne({
      _id: new Types.ObjectId(roomId as string),
      hotelId: new Types.ObjectId(hotelId as string),
    });

    if (!room) {
      res.status(404).json({ success: false, errorCode: 'ROOM_NOT_FOUND', message: 'Physical room does not exist' });
      return;
    }

    if (qrToken) {
      const qrHash = crypto.createHash('sha256').update(String(qrToken)).digest('hex');
      if (room.permanentQrCodeHash && qrHash !== room.permanentQrCodeHash && String(qrToken) !== room.permanentQrCodeHash) {
        res.status(403).json({ success: false, errorCode: 'INVALID_QR_TOKEN', message: 'Invalid or forged room QR security token' });
        return;
      }
    }

    // Check if room has an ACTIVE stay
    if (!room.currentStayId) {
      res.status(200).json({
        success: false,
        errorCode: 'NO_ACTIVE_STAY',
        message: 'No active guest stay in this room. Redirecting to reception/booking.',
        redirectAction: 'PUBLIC_BOOKING_OR_RECEPTION',
      });
      return;
    }

    const stay = await Stay.findOne({
      _id: room.currentStayId,
      stayStatus: StayStatus.ACTIVE,
    });

    if (!stay) {
      res.status(200).json({
        success: false,
        errorCode: 'NO_ACTIVE_STAY',
        message: 'Stay is checked out or inactive. Redirecting to booking flow.',
        redirectAction: 'PUBLIC_BOOKING_OR_RECEPTION',
      });
      return;
    }

    const booking = await Booking.findById(stay.bookingId);

    // Create or Restore Guest Browser Session Token
    const rawSessionToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawSessionToken).digest('hex');

    // 24 hours session expiry
    const expiresAt = new Date(Date.now() + 24 * 3600000);

    const guestSession = await GuestSession.create({
      hotelId: room.hotelId,
      stayId: stay._id,
      roomId: room._id,
      sessionTokenHash: tokenHash,
      lastKnownRoute: '/guest-portal/home',
      expiresAt,
    });

    res.status(200).json({
      success: true,
      message: 'Active stay resolved successfully',
      data: {
        sessionToken: rawSessionToken,
        roomNumber: room.roomNumber,
        guestName: booking?.guestName || 'Valued Guest',
        checkInDate: booking?.checkInDate,
        expectedCheckOutDate: stay.expectedCheckOutTimestamp,
        stayId: stay._id,
        masterFolioId: stay.masterFolioId,
        lastKnownRoute: guestSession.lastKnownRoute,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
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
    const {
      hotelId,
      stayId,
      roomId,
      items,
      cookingInstructions,
      chargeToRoom = true,
    } = req.body;

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

    const orderNumber = `RS-${Date.now().toString().slice(-6)}`;

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

    res.status(201).json({
      success: true,
      message: 'In-Room Dining order routed to Kitchen KDS and charged to Master Folio',
      data: {
        orderNumber: order.orderNumber,
        roomNumber: room.roomNumber,
        grandTotal,
        chargedToFolio: chargeToRoom,
      },
    });
  } catch (error: any) {
    if (error.code === 11000 && error.keyPattern?.idempotencyKey) {
      const existing = await RestaurantOrder.findOne({
        hotelId: new Types.ObjectId(req.body.hotelId),
        idempotencyKey: req.headers['x-idempotency-key'] as string,
      });
      if (existing) {
        res.status(200).json({ success: true, message: 'Order already processed (idempotent)', data: existing });
        return;
      }
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper: Validate Guest Session Token
const resolveGuestSession = async (token?: string) => {
  if (!token) return null;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const session = await GuestSession.findOne({
    sessionTokenHash: tokenHash,
    isActive: true,
    expiresAt: { $gt: new Date() },
  });
  if (!session) return null;

  const stay = await Stay.findOne({ _id: session.stayId, stayStatus: StayStatus.ACTIVE });
  if (!stay) return null;

  return { session, stay };
};

// 4. Live Room Service Orders Tracker
export const getLiveRoomOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = (req.headers['x-guest-session-token'] || req.query.token) as string;
    const resolved = await resolveGuestSession(token);
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

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
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
    const { requestType = 'HOUSEKEEPING', notes, priority = 'NORMAL' } = req.body;

    let mappedType = ServiceRequestType.ASSISTANCE;
    if (['TOWEL_REPLENISH', 'ROOM_CLEANING', 'HOUSEKEEPING', 'EXTRA_TOILETRIES'].includes(requestType)) {
      mappedType = ServiceRequestType.HOUSEKEEPING;
    } else if (['WATER', 'WATER_BOTTLES'].includes(requestType)) {
      mappedType = ServiceRequestType.WATER;
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
      data: serviceRequest,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// 6. Guest Master Folio Review & Live Charges Breakdown
export const getGuestFolioSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = (req.headers['x-guest-session-token'] || req.query.token) as string;
    const resolved = await resolveGuestSession(token);
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

