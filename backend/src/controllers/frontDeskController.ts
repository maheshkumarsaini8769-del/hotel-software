import { Response } from 'express';
import { Types } from 'mongoose';
import { Room, RoomStatus } from '../models/Room';
import { Booking, BookingStatus } from '../models/Booking';
import { Stay, StayStatus } from '../models/Stay';
import { GuestProfile, VIPTier } from '../models/GuestProfile';
import { MasterFolio } from '../models/MasterFolio';
import { FolioLineItem, DepartmentType } from '../models/FolioLineItem';
import {
  RestaurantOrder,
  OrderType,
  OverallOrderStatus,
  OrderApprovalStatus,
  ItemProductionStatus,
} from '../models/RestaurantOrder';
import { KitchenStation } from '../models/KitchenStation';
import {
  ServiceRequest,
  ServiceRequestType,
  ServiceRequestPriority,
  ServiceRequestStatus,
} from '../models/ServiceRequest';
import { TenantRequest } from '../types';
import { io } from '../index';

/**
 * Helper to mask Aadhaar or other ID numbers for privacy and compliance
 * E.g., "1234 5678 9012" -> "XXXX-XXXX-9012" or "9012" -> "XXXX-XXXX-9012"
 */
function maskIdNumber(idStr?: string): string {
  if (!idStr) return '';
  const clean = idStr.replace(/[^0-9a-zA-Z]/g, '');
  if (clean.length <= 4) {
    return `XXXX-XXXX-${clean}`;
  }
  const last4 = clean.slice(-4);
  return `XXXX-XXXX-${last4}`;
}

// 1. Flexible Front Desk Reception Check-In (Walk-In or Online Pre-Booking Arrival)
export const quickFrontDeskCheckIn = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const {
      bookingId,
      bookingNumber,
      roomId,
      guestName,
      guestPhone,
      guestEmail,
      isCouple = false,
      skipDocuments = false,
      idType = 'AADHAAR',
      idNumber,
      verifiedByReceptionist = false,
      receptionistNotes,
      keyCardIssued = 'KEY-01',
      advancePaid = 0,
    } = req.body;

    const receptionistUserId = req.user?.userId ? new Types.ObjectId(req.user.userId) : undefined;

    // 1. Resolve Target Room
    if (!roomId || !Types.ObjectId.isValid(roomId)) {
      res.status(400).json({ success: false, errorCode: 'ROOM_REQUIRED', message: 'Valid physical roomId is required' });
      return;
    }

    const room = await Room.findOne({ _id: new Types.ObjectId(roomId), hotelId }).populate('roomTypeId');
    if (!room) {
      res.status(404).json({ success: false, errorCode: 'ROOM_NOT_FOUND', message: 'Room not found in this hotel property' });
      return;
    }

    if (room.status === RoomStatus.OCCUPIED) {
      res.status(409).json({ success: false, errorCode: 'ROOM_ALREADY_OCCUPIED', message: `Room ${room.roomNumber} is currently occupied` });
      return;
    }

    // 2. Resolve Booking (Walk-in or Existing Online Pre-Booking)
    let booking: any = null;
    if (bookingId && Types.ObjectId.isValid(bookingId)) {
      booking = await Booking.findOne({ _id: new Types.ObjectId(bookingId), hotelId });
    } else if (bookingNumber) {
      booking = await Booking.findOne({ bookingNumber, hotelId });
    }

    // Negative Conflict: Cannot check-in an already checked-in booking
    if (booking && booking.bookingStatus === BookingStatus.CHECKED_IN) {
      res.status(409).json({
        success: false,
        errorCode: 'BOOKING_ALREADY_CHECKED_IN',
        message: `Booking ${booking.bookingNumber} has already been checked in`,
      });
      return;
    }

    const effectiveGuestName = guestName || booking?.guestName || 'Valued Guest';
    const effectivePhone = guestPhone || booking?.guestPhone || '9999999999';
    const effectiveEmail = guestEmail || booking?.guestEmail || `${effectivePhone}@guest.spicehub.com`;

    let tariff = 3500;
    let taxes = 420;
    let totalAmount = 3920;
    let totalAdvance = Number(advancePaid) || 0;

    // If no existing booking, create an instant walk-in booking record
    if (!booking) {
      const bNumber = `BKG-WALK-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
      const checkInDate = new Date();
      const checkOutDate = new Date(Date.now() + 86400000); // 1 night default

      tariff = (room.roomTypeId as any)?.basePriceOvernight || 3500;
      taxes = Math.round((tariff * 0.12) * 100) / 100;
      totalAmount = tariff + taxes;
      totalAdvance = Number(advancePaid) || 0;

      booking = await Booking.create({
        hotelId,
        bookingNumber: bNumber,
        bookingSource: 'WALK_IN' as any,
        bookingMode: 'OVERNIGHT' as any,
        roomTypeId: room.roomTypeId?._id || room.roomTypeId,
        allocatedRoomId: room._id,
        guestName: effectiveGuestName,
        guestPhone: effectivePhone,
        guestEmail: effectiveEmail,
        checkInDate,
        checkOutDate,
        totalTariff: tariff,
        taxAmount: taxes,
        grandTotal: totalAmount,
        advancePaymentAmount: totalAdvance,
        paymentStatus: totalAdvance >= totalAmount ? 'PAID' : (totalAdvance > 0 ? 'PARTIAL' : 'UNPAID'),
        bookingStatus: BookingStatus.CHECKED_IN,
      });
    } else {
      // Connect existing online pre-booking
      tariff = booking.totalTariff || 3500;
      taxes = booking.taxAmount || Math.round((tariff * 0.12) * 100) / 100;
      totalAmount = booking.grandTotal || (tariff + taxes);
      totalAdvance = (booking.advancePaymentAmount || 0) + (Number(advancePaid) || 0);

      booking.allocatedRoomId = room._id;
      booking.bookingStatus = BookingStatus.CHECKED_IN;
      booking.advancePaymentAmount = totalAdvance;
      booking.paymentStatus = totalAdvance >= totalAmount ? 'PAID' : (totalAdvance > 0 ? 'PARTIAL' : 'UNPAID');
      await booking.save();
    }

    // 3. Resolve or Create Guest Profile & Track Stay History
    let guestProfile = await GuestProfile.findOne({ hotelId, phone: effectivePhone });
    const maskedId = skipDocuments ? undefined : maskIdNumber(idNumber);

    if (!guestProfile) {
      guestProfile = await GuestProfile.create({
        hotelId,
        name: effectiveGuestName,
        phone: effectivePhone,
        email: effectiveEmail,
        vipTier: VIPTier.REGULAR,
        totalVisits: 1,
        totalLifetimeSpend: totalAmount,
        lastVisitDate: new Date(),
        idNumberMasked: maskedId,
        idType: skipDocuments ? undefined : idType,
        isVerified: skipDocuments ? false : Boolean(verifiedByReceptionist),
        lastVerifiedDate: verifiedByReceptionist ? new Date() : undefined,
        specialNotes: receptionistNotes,
      });
    } else {
      guestProfile.totalVisits = (guestProfile.totalVisits || 0) + 1;
      guestProfile.totalLifetimeSpend = (guestProfile.totalLifetimeSpend || 0) + totalAmount;
      guestProfile.lastVisitDate = new Date();
      if (!skipDocuments && maskedId) {
        guestProfile.idNumberMasked = maskedId;
        guestProfile.idType = idType;
        guestProfile.isVerified = Boolean(verifiedByReceptionist);
        guestProfile.lastVerifiedDate = new Date();
      }
      if (receptionistNotes) {
        guestProfile.specialNotes = guestProfile.specialNotes
          ? `${guestProfile.specialNotes} | ${receptionistNotes}`
          : receptionistNotes;
      }
      await guestProfile.save();
    }

    // 4. Create Master Folio for Room Charges & Credit Advance Payment
    const folioNumber = `FOLIO-${room.roomNumber}-${Date.now().toString().slice(-4)}`;
    const due = Math.max(0, totalAmount - totalAdvance);

    // 5. Create Active Stay Record with Flexible Verification Details
    const stay = new Stay({
      hotelId,
      bookingId: booking._id,
      guestId: guestProfile._id,
      roomId: room._id,
      checkInTimestamp: new Date(),
      expectedCheckOutTimestamp: booking.checkOutDate || new Date(Date.now() + 86400000),
      stayStatus: StayStatus.ACTIVE,
      keyCardIssued: keyCardIssued || `KEY-${room.roomNumber}`,
      isCouple: Boolean(isCouple),
      verificationMode: skipDocuments ? 'NONE' : (isCouple ? 'AADHAAR' : (idType as any) || 'NONE'),
      idNumberMasked: maskedId,
      verifiedByReceptionist: skipDocuments ? false : Boolean(verifiedByReceptionist),
      receptionistNotes,
      checkedInByUserId: receptionistUserId,
    });
    await stay.save();

    let masterFolio = await MasterFolio.findOne({ hotelId, bookingId: booking._id, folioStatus: 'OPEN' });
    if (!masterFolio) {
      masterFolio = await MasterFolio.create({
        hotelId,
        stayId: stay._id,
        bookingId: booking._id,
        roomId: room._id,
        folioNumber,
        folioStatus: 'OPEN',
        totalRoomTariff: tariff,
        totalFoodAndBeverage: 0,
        totalLaundry: 0,
        totalPaidServices: 0,
        totalDamageCharges: 0,
        totalDiscounts: 0,
        totalTaxes: taxes,
        advancePaid: totalAdvance,
        netAmountPayable: totalAmount,
        paidAmount: totalAdvance,
        dueAmount: due,
      });

      // Post initial room accommodation line item to folio ledger
      await FolioLineItem.create({
        hotelId,
        folioId: masterFolio._id,
        department: DepartmentType.ROOM_RENT,
        description: `Room ${room.roomNumber} Accommodation Tariff`,
        rate: tariff,
        quantity: 1,
        taxRate: 12,
        taxAmount: taxes,
        netAmount: totalAmount,
        postedAt: new Date(),
      });
    } else {
      masterFolio.stayId = stay._id as any;
      masterFolio.roomId = room._id as any;
      masterFolio.advancePaid = totalAdvance;
      masterFolio.paidAmount = totalAdvance;
      masterFolio.dueAmount = Math.max(0, masterFolio.netAmountPayable - totalAdvance);
      await masterFolio.save();
    }

    stay.masterFolioId = masterFolio._id as any;
    await stay.save();

    // 6. Update Physical Room Status
    room.status = RoomStatus.OCCUPIED;
    room.currentStayId = stay._id as any;
    await room.save();

    // 7. Emit Real-time PMS Updates
    io.to(`${hotelId.toString()}_global`).emit('pms:guest_checked_in', {
      roomNumber: room.roomNumber,
      guestName: guestProfile.name,
      stayId: stay._id,
      isCouple: stay.isCouple,
      verified: stay.verifiedByReceptionist,
      advanceCredited: totalAdvance,
      balanceDue: due,
    });

    res.status(201).json({
      success: true,
      message: `Room ${room.roomNumber} checked in successfully for ${guestProfile.name} (Visits: ${guestProfile.totalVisits})`,
      data: {
        stay,
        guestProfile,
        room: {
          id: room._id,
          roomNumber: room.roomNumber,
          floor: room.floorNumber,
          status: room.status,
        },
        booking: {
          id: booking._id,
          bookingNumber: booking.bookingNumber,
          checkInDate: booking.checkInDate,
          checkOutDate: booking.checkOutDate,
          advancePaid: totalAdvance,
        },
        folio: {
          id: masterFolio._id,
          folioNumber: masterFolio.folioNumber,
          totalAmount,
          advanceCredited: totalAdvance,
          balanceDue: masterFolio.dueAmount,
        },
      },
    });
  } catch (error: any) {
    console.error('[quickFrontDeskCheckIn error]:', error);
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 2. Fetch Expected Arrivals Today / Online Pre-Bookings Queue
export const getExpectedArrivals = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const bookings = await Booking.find({
      hotelId,
      bookingStatus: BookingStatus.CONFIRMED,
    })
      .populate('roomTypeId', 'name code basePriceOvernight')
      .sort({ checkInDate: 1, createdAt: -1 });

    const formatted = bookings.map((b: any) => ({
      bookingId: b._id.toString(),
      bookingNumber: b.bookingNumber,
      guestName: b.guestName,
      guestPhone: b.guestPhone,
      guestEmail: b.guestEmail,
      roomTypeId: b.roomTypeId?._id?.toString() || '',
      roomTypeName: b.roomTypeId?.name || 'Deluxe Heritage Room',
      roomTypeCode: b.roomTypeId?.code || 'DLX',
      checkInDate: b.checkInDate,
      checkOutDate: b.checkOutDate,
      bookingSource: b.bookingSource || 'DIRECT_PUBLIC_WEB',
      bookingMode: b.bookingMode || 'OVERNIGHT',
      totalTariff: b.totalTariff,
      taxAmount: b.taxAmount,
      grandTotal: b.grandTotal,
      advancePaymentAmount: b.advancePaymentAmount || 0,
      paymentStatus: b.paymentStatus || 'UNPAID',
      guestCountAdults: b.guestCountAdults || 2,
    }));

    res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 3. Fetch In-House Guests Directory (Currently Staying)
export const getActiveInHouseGuests = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const activeStays = await Stay.find({ hotelId, stayStatus: StayStatus.ACTIVE })
      .populate('roomId', 'roomNumber floorNumber status')
      .populate('guestId', 'name phone email vipTier totalVisits isVerified idNumberMasked')
      .populate('bookingId', 'bookingNumber checkInDate checkOutDate grandTotal')
      .populate('masterFolioId', 'folioNumber dueAmount paidAmount advancePaid netAmountPayable')
      .sort({ checkInTimestamp: -1 });

    const guests = activeStays.map((s: any) => ({
      stayId: s._id,
      roomNumber: s.roomId?.roomNumber || 'N/A',
      floor: s.roomId?.floorNumber || 1,
      guestName: s.guestId?.name || 'In-House Guest',
      phone: s.guestId?.phone || '',
      vipTier: s.guestId?.vipTier || 'REGULAR',
      totalVisits: s.guestId?.totalVisits || 1,
      isCouple: s.isCouple || false,
      verificationMode: s.verificationMode || 'NONE',
      idNumberMasked: s.idNumberMasked || 'None (Direct Check-In)',
      verifiedByReceptionist: s.verifiedByReceptionist || false,
      checkInTime: s.checkInTimestamp,
      expectedCheckOutTime: s.expectedCheckOutTimestamp,
      bookingNumber: s.bookingId?.bookingNumber || 'N/A',
      folioNumber: s.masterFolioId?.folioNumber || 'N/A',
      advancePaid: s.masterFolioId?.advancePaid || 0,
      balanceDue: s.masterFolioId?.dueAmount || 0,
      receptionistNotes: s.receptionistNotes || '',
    }));

    res.status(200).json({
      success: true,
      count: guests.length,
      data: guests,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 4. Fetch In-Room Live Stay Details & Folio for In-Room Guest Portal (:3004)
export const getInRoomLiveStay = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { roomNumber } = req.params;
    if (!roomNumber) {
      res.status(400).json({ success: false, errorCode: 'ROOM_NUMBER_REQUIRED', message: 'Room number is required' });
      return;
    }

    const roomNumStr = String(Array.isArray(roomNumber) ? roomNumber[0] : roomNumber).trim();
    const room = await Room.findOne({
      hotelId,
      roomNumber: { $regex: new RegExp(`^${roomNumStr}$`, 'i') },
    }).populate('roomTypeId', 'name code basePriceOvernight');

    if (!room) {
      res.status(404).json({ success: false, errorCode: 'ROOM_NOT_FOUND', message: `Room ${roomNumber} not found` });
      return;
    }

    const activeStay = await Stay.findOne({
      hotelId,
      roomId: room._id,
      stayStatus: StayStatus.ACTIVE,
    })
      .populate('guestId', 'name phone email vipTier')
      .populate('bookingId', 'bookingNumber grandTotal guestName guestPhone checkInDate checkOutDate')
      .populate('masterFolioId');

    if (!activeStay) {
      res.status(200).json({
        success: true,
        message: `Room ${room.roomNumber} is currently vacant`,
        data: {
          room: {
            id: room._id,
            roomNumber: room.roomNumber,
            floor: room.floorNumber,
            status: room.status,
            roomTypeName: (room.roomTypeId as any)?.name || 'Deluxe Heritage Room',
          },
          stay: null,
          folio: null,
        },
      });
      return;
    }

    const masterFolio: any = activeStay.masterFolioId
      ? await MasterFolio.findById(activeStay.masterFolioId)
      : await MasterFolio.findOne({ hotelId, stayId: activeStay._id, folioStatus: 'OPEN' });

    let lineItems: any[] = [];
    if (masterFolio) {
      lineItems = await FolioLineItem.find({ hotelId, folioId: masterFolio._id }).sort({ postedAt: -1 });
    }

    const effectiveGuestName = (activeStay.guestId as any)?.name || (activeStay.bookingId as any)?.guestName || 'Valued Guest';

    res.status(200).json({
      success: true,
      data: {
        room: {
          id: room._id,
          roomNumber: room.roomNumber,
          floor: room.floorNumber,
          status: room.status,
          roomTypeName: (room.roomTypeId as any)?.name || 'Deluxe Heritage Room',
        },
        stay: {
          stayId: activeStay._id,
          guestName: effectiveGuestName,
          guestPhone: (activeStay.guestId as any)?.phone || (activeStay.bookingId as any)?.guestPhone || '',
          checkInTimestamp: activeStay.checkInTimestamp,
          expectedCheckOutTimestamp: activeStay.expectedCheckOutTimestamp,
          isCouple: activeStay.isCouple || false,
          verificationMode: activeStay.verificationMode || 'NONE',
          idNumberMasked: activeStay.idNumberMasked,
          verifiedByReceptionist: activeStay.verifiedByReceptionist || false,
          keyCardIssued: activeStay.keyCardIssued || `KEY-${room.roomNumber}`,
          wifiSsid: 'TajGateway_HighSpeed',
          wifiPassword: `TajGuest@${room.roomNumber}`,
        },
        folio: masterFolio
          ? {
              folioId: masterFolio._id,
              folioNumber: masterFolio.folioNumber,
              totalRoomTariff: masterFolio.totalRoomTariff || 0,
              totalFoodAndBeverage: masterFolio.totalFoodAndBeverage || 0,
              totalLaundry: masterFolio.totalLaundry || 0,
              totalTaxes: masterFolio.totalTaxes || 0,
              advancePaid: masterFolio.advancePaid || 0,
              paidAmount: masterFolio.paidAmount || 0,
              netAmountPayable: masterFolio.netAmountPayable || 0,
              dueAmount: masterFolio.dueAmount || 0,
              folioStatus: masterFolio.folioStatus || 'OPEN',
              lineItems: lineItems.map((li: any) => ({
                id: li._id,
                department: li.department,
                description: li.description,
                rate: li.rate,
                taxAmount: li.taxAmount,
                netAmount: li.netAmount,
                createdAt: li.postedAt,
              })),
            }
          : null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 5. Post In-Room Dining or Incidental Service Charge to Master Folio
export const postInRoomCharge = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { roomNumber, department = 'ROOM_SERVICE', description, amount = 0 } = req.body;
    if (!roomNumber || !amount || amount <= 0) {
      res.status(400).json({ success: false, errorCode: 'INVALID_PARAMS', message: 'roomNumber and positive amount are required' });
      return;
    }

    const room = await Room.findOne({
      hotelId,
      roomNumber: { $regex: new RegExp(`^${String(roomNumber).trim()}$`, 'i') },
    });
    if (!room) {
      res.status(404).json({ success: false, errorCode: 'ROOM_NOT_FOUND', message: `Room ${roomNumber} not found` });
      return;
    }

    const activeStay = await Stay.findOne({ hotelId, roomId: room._id, stayStatus: StayStatus.ACTIVE });
    if (!activeStay) {
      res.status(400).json({ success: false, errorCode: 'ROOM_NOT_OCCUPIED', message: `Room ${roomNumber} is not currently occupied` });
      return;
    }

    let masterFolio = activeStay.masterFolioId
      ? await MasterFolio.findById(activeStay.masterFolioId)
      : await MasterFolio.findOne({ hotelId, stayId: activeStay._id, folioStatus: 'OPEN' });

    if (!masterFolio) {
      res.status(404).json({ success: false, errorCode: 'FOLIO_NOT_FOUND', message: 'Active folio not found for room' });
      return;
    }

    const taxAmount = Math.round((amount * 0.05) * 100) / 100;
    const netTotal = amount + taxAmount;

    const lineItem = await FolioLineItem.create({
      hotelId,
      folioId: masterFolio._id,
      department: (department as any) || DepartmentType.ROOM_SERVICE,
      description: description || 'In-Room Service Charge',
      rate: amount,
      quantity: 1,
      taxRate: 5,
      taxAmount,
      netAmount: netTotal,
      postedAt: new Date(),
    });

    if (department === 'ROOM_SERVICE' || department === 'RESTAURANT_DINE') {
      masterFolio.totalFoodAndBeverage = (masterFolio.totalFoodAndBeverage || 0) + amount;
    } else if (department === 'LAUNDRY') {
      masterFolio.totalLaundry = (masterFolio.totalLaundry || 0) + amount;
    } else {
      masterFolio.totalPaidServices = (masterFolio.totalPaidServices || 0) + amount;
    }

    masterFolio.totalTaxes = (masterFolio.totalTaxes || 0) + taxAmount;
    masterFolio.netAmountPayable = (masterFolio.netAmountPayable || 0) + netTotal;
    masterFolio.dueAmount = Math.max(0, masterFolio.netAmountPayable - (masterFolio.paidAmount || 0));
    await masterFolio.save();

    const lineItems = await FolioLineItem.find({ hotelId, folioId: masterFolio._id }).sort({ postedAt: -1 });

    io.to(`${hotelId.toString()}_global`).emit('pms:folio_updated', {
      roomNumber: room.roomNumber,
      folioNumber: masterFolio.folioNumber,
      dueAmount: masterFolio.dueAmount,
    });

    res.status(201).json({
      success: true,
      message: `Charge of ₹${netTotal} successfully posted to Room ${room.roomNumber} folio`,
      data: {
        lineItem,
        folio: {
          folioId: masterFolio._id,
          folioNumber: masterFolio.folioNumber,
          totalRoomTariff: masterFolio.totalRoomTariff,
          totalFoodAndBeverage: masterFolio.totalFoodAndBeverage,
          totalLaundry: masterFolio.totalLaundry,
          totalTaxes: masterFolio.totalTaxes,
          advancePaid: masterFolio.advancePaid,
          paidAmount: masterFolio.paidAmount,
          netAmountPayable: masterFolio.netAmountPayable,
          dueAmount: masterFolio.dueAmount,
          folioStatus: masterFolio.folioStatus,
          lineItems: lineItems.map((li: any) => ({
            id: li._id,
            department: li.department,
            description: li.description,
            rate: li.rate,
            taxAmount: li.taxAmount,
            netAmount: li.netAmount,
            createdAt: li.postedAt,
          })),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 6. Register In-Room Concierge / Housekeeping Request (Shift 60 Enhanced)
export const postConciergeRequest = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const {
      roomNumber,
      requestType,
      notes,
      priority,
      isBillable,
      billableAmount,
      billableDescription,
    } = req.body;

    if (!roomNumber || !requestType) {
      res.status(400).json({ success: false, errorCode: 'INVALID_PARAMS', message: 'roomNumber and requestType are required' });
      return;
    }

    const room = await Room.findOne({
      hotelId,
      roomNumber: { $regex: new RegExp(`^${String(roomNumber).trim()}$`, 'i') },
    });

    if (!room) {
      res.status(404).json({ success: false, errorCode: 'ROOM_NOT_FOUND', message: `Room ${roomNumber} not found` });
      return;
    }

    const activeStay = await Stay.findOne({ hotelId, roomId: room._id, stayStatus: StayStatus.ACTIVE });

    let lineItem: any = null;
    let masterFolio: any = null;

    // Handle billable services (e.g. Express Laundry or Paid Amenities)
    if (isBillable && Number(billableAmount) > 0 && activeStay?.masterFolioId) {
      masterFolio = await MasterFolio.findOne({ _id: activeStay.masterFolioId, hotelId });
      if (masterFolio) {
        const amount = Number(billableAmount);
        const taxRate = 5;
        const taxAmount = Math.round(amount * (taxRate / 100));
        const netTotal = amount + taxAmount;

        const dept = requestType === 'LAUNDRY' ? DepartmentType.LAUNDRY : DepartmentType.PAID_AMENITY;
        lineItem = await FolioLineItem.create({
          hotelId,
          folioId: masterFolio._id,
          stayId: activeStay._id,
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
          masterFolio.totalLaundry = (masterFolio.totalLaundry || 0) + amount;
        } else {
          masterFolio.totalPaidServices = (masterFolio.totalPaidServices || 0) + amount;
        }

        masterFolio.totalTaxes = (masterFolio.totalTaxes || 0) + taxAmount;
        masterFolio.netAmountPayable = (masterFolio.netAmountPayable || 0) + netTotal;
        masterFolio.dueAmount = Math.max(0, masterFolio.netAmountPayable - (masterFolio.paidAmount || 0));
        await masterFolio.save();

        io.to(`${hotelId.toString()}_global`).emit('pms:folio_updated', {
          roomNumber: room.roomNumber,
          folioNumber: masterFolio.folioNumber,
          dueAmount: masterFolio.dueAmount,
        });
      }
    }

    // Map requestType to valid enum or fallback
    let normalizedType = ServiceRequestType.ASSISTANCE;
    if (Object.values(ServiceRequestType).includes(requestType as ServiceRequestType)) {
      normalizedType = requestType as ServiceRequestType;
    } else {
      const upper = String(requestType).toUpperCase();
      if (upper.includes('TOWEL')) normalizedType = ServiceRequestType.TOWEL_REPLENISH;
      else if (upper.includes('CLEAN')) normalizedType = ServiceRequestType.ROOM_CLEANING;
      else if (upper.includes('LAUNDRY')) normalizedType = ServiceRequestType.LAUNDRY;
      else if (upper.includes('TOILET')) normalizedType = ServiceRequestType.TOILETRIES;
      else if (upper.includes('LUGGAGE')) normalizedType = ServiceRequestType.LUGGAGE_ASSIST;
      else if (upper.includes('MAINT') || upper.includes('AC')) normalizedType = ServiceRequestType.MAINTENANCE;
      else if (upper.includes('WATER')) normalizedType = ServiceRequestType.WATER;
    }

    const priorityVal = priority === 'URGENT' ? ServiceRequestPriority.URGENT :
                        priority === 'HIGH' ? ServiceRequestPriority.HIGH :
                        ServiceRequestPriority.NORMAL;

    const serviceRequest = await ServiceRequest.create({
      hotelId,
      sourceType: 'HOTEL_STAY',
      roomId: room._id,
      stayId: activeStay ? activeStay._id : undefined,
      requestType: normalizedType,
      priority: priorityVal,
      status: ServiceRequestStatus.CREATED,
      notes: notes || undefined,
      slaMinutes: 15,
      isBillable: !!isBillable,
      billableAmount: Number(billableAmount) || 0,
      folioLineItemId: lineItem ? lineItem._id : undefined,
    });

    if (activeStay) {
      const appended = `[Concierge: ${normalizedType}] ${notes || ''}`.trim();
      activeStay.receptionistNotes = activeStay.receptionistNotes
        ? `${activeStay.receptionistNotes} | ${appended}`
        : appended;
      await activeStay.save();
    }

    const payload = {
      requestId: serviceRequest._id.toString(),
      roomNumber: room.roomNumber,
      requestType: serviceRequest.requestType,
      priority: serviceRequest.priority,
      status: serviceRequest.status,
      notes: serviceRequest.notes,
      isBillable: serviceRequest.isBillable,
      billableAmount: serviceRequest.billableAmount,
      createdAt: serviceRequest.createdAt,
    };

    io.to(`${hotelId.toString()}_global`).emit('pms:concierge_request_created', payload);
    io.to(`guest_room_${room.roomNumber}`).emit('pms:concierge_request_created', payload);

    res.status(201).json({
      success: true,
      message: `Concierge request for ${normalizedType} registered for Room ${room.roomNumber}`,
      data: {
        request: payload,
        folio: masterFolio ? {
          folioNumber: masterFolio.folioNumber,
          netAmountPayable: masterFolio.netAmountPayable,
          dueAmount: masterFolio.dueAmount,
        } : null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 7. Search Guest Profile & Detailed Stay History (By Phone, Name or Booking No)
export const getGuestStayHistory = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { query, phone, bookingNumber } = req.query;

    let filter: any = { hotelId };

    if (phone) {
      filter.phone = phone;
    } else if (query) {
      filter.$or = [
        { name: { $regex: String(query), $options: 'i' } },
        { phone: { $regex: String(query), $options: 'i' } },
      ];
    } else if (bookingNumber) {
      const b = await Booking.findOne({ hotelId, bookingNumber: String(bookingNumber) });
      if (b && b.guestPhone) {
        filter.phone = b.guestPhone;
      }
    }

    const profiles = await GuestProfile.find(filter).sort({ lastVisitDate: -1 });

    const results = await Promise.all(
      profiles.map(async (gp) => {
        const stays = await Stay.find({ hotelId, guestId: gp._id })
          .populate('roomId', 'roomNumber roomTypeId')
          .populate('bookingId', 'bookingNumber grandTotal')
          .sort({ checkInTimestamp: -1 });

        return {
          guestId: gp._id,
          name: gp.name,
          phone: gp.phone,
          email: gp.email,
          vipTier: gp.vipTier,
          totalVisits: gp.totalVisits,
          totalLifetimeSpend: gp.totalLifetimeSpend,
          lastVisitDate: gp.lastVisitDate,
          idType: gp.idType || 'AADHAAR',
          idNumberMasked: gp.idNumberMasked || 'Not Recorded',
          isVerified: gp.isVerified,
          specialNotes: gp.specialNotes,
          pastStays: stays.map((s: any) => ({
            stayId: s._id,
            roomNumber: s.roomId?.roomNumber || 'Room',
            checkIn: s.checkInTimestamp,
            checkOut: s.actualCheckOutTimestamp || s.expectedCheckOutTimestamp,
            stayStatus: s.stayStatus,
            isCouple: s.isCouple,
            verificationMode: s.verificationMode,
            idNumberMasked: s.idNumberMasked,
            verifiedByReceptionist: s.verifiedByReceptionist,
            notes: s.receptionistNotes,
          })),
        };
      })
    );

    res.status(200).json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 8. Get Available Rooms for Front Desk Check-in
export const getFrontDeskAvailableRooms = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const rooms = await Room.find({
      hotelId,
      status: RoomStatus.AVAILABLE,
    })
      .populate('roomTypeId', 'name code basePriceOvernight')
      .sort({ roomNumber: 1 });

    const formatted = rooms.map((r: any) => ({
      id: r._id.toString(),
      _id: r._id.toString(),
      roomNumber: r.roomNumber,
      floorNumber: r.floorNumber,
      wing: r.wing,
      status: r.status,
      roomTypeName: r.roomTypeId?.name || 'Deluxe Heritage Room',
      basePrice: r.roomTypeId?.basePriceOvernight || 4500,
    }));

    res.status(200).json({ success: true, count: formatted.length, data: formatted });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 9. Post Full In-Room Dining Culinary Order to Kitchen KDS & Master Folio
export const postInRoomOrder = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { roomNumber, items = [], cookingInstructions } = req.body;
    if (!roomNumber || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, errorCode: 'INVALID_ORDER', message: 'roomNumber and non-empty items array are required' });
      return;
    }

    const roomNumStr = String(Array.isArray(roomNumber) ? roomNumber[0] : roomNumber).trim();
    const room = await Room.findOne({
      hotelId,
      roomNumber: { $regex: new RegExp(`^${roomNumStr}$`, 'i') },
    });

    if (!room) {
      res.status(404).json({ success: false, errorCode: 'ROOM_NOT_FOUND', message: `Room ${roomNumber} not found` });
      return;
    }

    const activeStay = await Stay.findOne({ hotelId, roomId: room._id, stayStatus: StayStatus.ACTIVE })
      .populate('guestId', 'name phone')
      .populate('bookingId', 'guestName guestPhone');

    if (!activeStay) {
      res.status(400).json({ success: false, errorCode: 'ROOM_NOT_OCCUPIED', message: `Room ${roomNumber} is not currently occupied` });
      return;
    }

    let masterFolio = activeStay.masterFolioId
      ? await MasterFolio.findById(activeStay.masterFolioId)
      : await MasterFolio.findOne({ hotelId, stayId: activeStay._id, folioStatus: 'OPEN' });

    if (!masterFolio) {
      res.status(404).json({ success: false, errorCode: 'FOLIO_NOT_FOUND', message: 'Active folio not found for room' });
      return;
    }

    // Resolve or find kitchen station
    let kitchenStation = await KitchenStation.findOne({ hotelId });
    if (!kitchenStation) {
      kitchenStation = await KitchenStation.create({
        hotelId,
        stationName: 'Main Culinary Kitchen',
        screenToken: `station-token-${Date.now()}`,
        isOnline: true,
      });
    }

    const mappedItems = items.map((it: any) => {
      const qty = Number(it.quantity) || 1;
      const price = Number(it.price || it.unitPrice) || 0;
      return {
        menuItemId: Types.ObjectId.isValid(it.menuItemId || it.dishId)
          ? new Types.ObjectId(it.menuItemId || it.dishId)
          : new Types.ObjectId(),
        kitchenStationId: kitchenStation._id,
        name: it.name,
        quantity: qty,
        unitPrice: price,
        subtotal: qty * price,
        itemStatus: ItemProductionStatus.PENDING,
        specialInstructions: it.specialInstructions,
      };
    });

    const foodSubtotal = mappedItems.reduce((acc: number, it: any) => acc + it.subtotal, 0);
    const taxRate = 5; // 5% GST on Restaurant & In-Room Dining
    const taxAmount = Math.round((foodSubtotal * (taxRate / 100)) * 100) / 100;
    const orderGrandTotal = foodSubtotal + taxAmount;

    const orderNumber = `ORD-RM${room.roomNumber}-${Date.now().toString().slice(-4)}`;
    const guestName = (activeStay.guestId as any)?.name || (activeStay.bookingId as any)?.guestName || 'In-Room Guest';
    const guestPhone = (activeStay.guestId as any)?.phone || (activeStay.bookingId as any)?.guestPhone || '';

    // Create RestaurantOrder linked to room service
    const order = await RestaurantOrder.create({
      hotelId,
      orderNumber,
      orderType: OrderType.ROOM_SERVICE,
      stayId: activeStay._id,
      roomId: room._id,
      folioId: masterFolio._id,
      items: mappedItems,
      cookingInstructions,
      orderStatus: OverallOrderStatus.PLACED,
      approvalStatus: OrderApprovalStatus.APPROVED_BY_WAITER,
      placedAt: new Date(),
      customerName: guestName,
      customerPhone: guestPhone,
      idempotencyKey: `inroom_${room._id}_${Date.now()}`,
      isSweptToFolio: true,
      sweptAt: new Date(),
      sweptToFolioId: masterFolio._id,
    });

    // Create itemized FolioLineItem
    const lineItem = await FolioLineItem.create({
      hotelId,
      folioId: masterFolio._id,
      department: DepartmentType.ROOM_SERVICE,
      description: `In-Room Dining: ${mappedItems.map((i) => `${i.name} x${i.quantity}`).join(', ')}`,
      referenceId: order._id,
      rate: foodSubtotal,
      quantity: 1,
      taxRate,
      taxAmount,
      netAmount: orderGrandTotal,
      postedAt: new Date(),
    });

    // Update Master Folio totals
    masterFolio.totalFoodAndBeverage = (masterFolio.totalFoodAndBeverage || 0) + foodSubtotal;
    masterFolio.totalTaxes = (masterFolio.totalTaxes || 0) + taxAmount;
    masterFolio.netAmountPayable = (masterFolio.netAmountPayable || 0) + orderGrandTotal;
    masterFolio.dueAmount = Math.max(0, masterFolio.netAmountPayable - (masterFolio.paidAmount || 0));
    await masterFolio.save();

    const lineItems = await FolioLineItem.find({ hotelId, folioId: masterFolio._id }).sort({ postedAt: -1 });

    // Real-time broadcasts to KDS screens (:3003) & Front Desk (:3005)
    io.to(`${hotelId.toString()}_kds`).to(`${hotelId.toString()}_global`).emit('kitchen:new_order', {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      roomNumber: room.roomNumber,
      orderType: 'ROOM_SERVICE',
      customerName: guestName,
      items: order.items,
      cookingInstructions,
      orderStatus: 'PLACED',
      placedAt: order.placedAt,
    });

    io.to(`${hotelId.toString()}_global`).emit('pms:inroom_order_placed', {
      roomNumber: room.roomNumber,
      orderNumber: order.orderNumber,
      grandTotal: orderGrandTotal,
      dueAmount: masterFolio.dueAmount,
    });

    io.to(`${hotelId.toString()}_global`).emit('pms:folio_updated', {
      roomNumber: room.roomNumber,
      folioNumber: masterFolio.folioNumber,
      dueAmount: masterFolio.dueAmount,
    });

    res.status(201).json({
      success: true,
      message: `Order ${order.orderNumber} dispatched to kitchen and charged ₹${orderGrandTotal} to Room ${room.roomNumber} folio`,
      data: {
        order: {
          id: order._id.toString(),
          orderNumber: order.orderNumber,
          orderStatus: order.orderStatus,
          placedAt: order.placedAt,
          items: order.items,
          cookingInstructions: order.cookingInstructions,
          grandTotal: orderGrandTotal,
        },
        lineItem,
        folio: {
          folioId: masterFolio._id,
          folioNumber: masterFolio.folioNumber,
          totalRoomTariff: masterFolio.totalRoomTariff,
          totalFoodAndBeverage: masterFolio.totalFoodAndBeverage,
          totalLaundry: masterFolio.totalLaundry,
          totalTaxes: masterFolio.totalTaxes,
          advancePaid: masterFolio.advancePaid,
          paidAmount: masterFolio.paidAmount,
          netAmountPayable: masterFolio.netAmountPayable,
          dueAmount: masterFolio.dueAmount,
          folioStatus: masterFolio.folioStatus,
          lineItems: lineItems.map((li: any) => ({
            id: li._id,
            department: li.department,
            description: li.description,
            rate: li.rate,
            taxAmount: li.taxAmount,
            netAmount: li.netAmount,
            createdAt: li.postedAt,
          })),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 10. Fetch In-Room Dining Orders for Live Order Tracker (:3004)
export const getInRoomOrders = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { roomNumber } = req.params;
    const roomNumStr = String(Array.isArray(roomNumber) ? roomNumber[0] : roomNumber).trim();

    const room = await Room.findOne({
      hotelId,
      roomNumber: { $regex: new RegExp(`^${roomNumStr}$`, 'i') },
    });

    if (!room) {
      res.status(404).json({ success: false, errorCode: 'ROOM_NOT_FOUND', message: `Room ${roomNumber} not found` });
      return;
    }

    const activeStay = await Stay.findOne({ hotelId, roomId: room._id, stayStatus: StayStatus.ACTIVE });
    if (!activeStay) {
      res.status(200).json({ success: true, count: 0, data: [] });
      return;
    }

    const orders = await RestaurantOrder.find({
      hotelId,
      roomId: room._id,
      stayId: activeStay._id,
    }).sort({ placedAt: -1 });

    const formatted = orders.map((ord: any) => ({
      id: ord._id.toString(),
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

    res.status(200).json({ success: true, count: formatted.length, data: formatted });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 11. Kitchen KDS / Room Service Status Update (PLACED ➔ PREPARING ➔ READY ➔ SERVED)
export const updateInRoomOrderStatus = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { orderId } = req.params;
    const { status } = req.body;

    if (!orderId || !Types.ObjectId.isValid(String(orderId))) {
      res.status(400).json({ success: false, errorCode: 'INVALID_ORDER_ID', message: 'Valid orderId is required' });
      return;
    }

    const order = await RestaurantOrder.findOne({ _id: new Types.ObjectId(String(orderId)), hotelId });
    if (!order) {
      res.status(404).json({ success: false, errorCode: 'ORDER_NOT_FOUND', message: 'Order not found' });
      return;
    }

    order.orderStatus = status;
    if (status === OverallOrderStatus.PREPARING) order.preparedAt = new Date();
    if (status === OverallOrderStatus.READY) order.readyAt = new Date();
    if (status === OverallOrderStatus.SERVED) order.servedAt = new Date();
    await order.save();

    // Broadcast live event to KDS & guest portal
    io.to(`${hotelId.toString()}_global`).to(`${hotelId.toString()}_kds`).emit('order:status_updated', {
      orderId: order._id.toString(),
      orderStatus: order.orderStatus,
      readyAt: order.readyAt,
      servedAt: order.servedAt,
    });

    io.to(`${hotelId.toString()}_kds`).emit('kds:order_updated', {
      orderId: order._id.toString(),
      orderStatus: order.orderStatus,
    });

    res.status(200).json({
      success: true,
      message: `Order ${order.orderNumber} status updated to ${status}`,
      data: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        orderStatus: order.orderStatus,
        preparedAt: order.preparedAt,
        readyAt: order.readyAt,
        servedAt: order.servedAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 12. Fetch Front Desk Concierge & Housekeeping Queue (Shift 60)
export const getConciergeRequests = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const requests = await ServiceRequest.find({
      hotelId,
      sourceType: 'HOTEL_STAY',
    })
      .populate('roomId', 'roomNumber floor roomType')
      .populate('stayId')
      .sort({ createdAt: -1 });

    const formatted = await Promise.all(
      requests.map(async (reqDoc: any) => {
        let guestName = 'Hotel Guest';
        if (reqDoc.stayId) {
          const stay = await Stay.findById(reqDoc.stayId).populate('guestId', 'name phone');
          if (stay && (stay.guestId as any)?.name) {
            guestName = (stay.guestId as any).name;
          }
        }

        const roomNum = reqDoc.roomId?.roomNumber || 'Unknown';
        return {
          id: reqDoc._id.toString(),
          roomNumber: roomNum,
          floor: reqDoc.roomId?.floor || 1,
          guestName,
          requestType: reqDoc.requestType,
          priority: reqDoc.priority,
          status: reqDoc.status,
          notes: reqDoc.notes,
          assignedStaffName: reqDoc.assignedStaffName || 'Unassigned',
          slaMinutes: reqDoc.slaMinutes || 15,
          isBillable: reqDoc.isBillable || false,
          billableAmount: reqDoc.billableAmount || 0,
          createdAt: reqDoc.createdAt,
          acceptedAt: reqDoc.acceptedAt,
          completedAt: reqDoc.completedAt,
        };
      })
    );

    res.status(200).json({ success: true, count: formatted.length, data: formatted });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 13. Fetch Live In-Room Concierge Requests for Room Portal (:3004) (Shift 60)
export const getInRoomConciergeRequests = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { roomNumber } = req.params;
    const room = await Room.findOne({
      hotelId,
      roomNumber: { $regex: new RegExp(`^${String(roomNumber).trim()}$`, 'i') },
    });

    if (!room) {
      res.status(404).json({ success: false, errorCode: 'ROOM_NOT_FOUND', message: `Room ${roomNumber} not found` });
      return;
    }

    const requests = await ServiceRequest.find({
      hotelId,
      roomId: room._id,
      sourceType: 'HOTEL_STAY',
    }).sort({ createdAt: -1 });

    const formatted = requests.map((r: any) => ({
      id: r._id.toString(),
      requestType: r.requestType,
      priority: r.priority,
      status: r.status,
      notes: r.notes,
      assignedStaffName: r.assignedStaffName || 'Attendant',
      isBillable: r.isBillable,
      billableAmount: r.billableAmount,
      createdAt: r.createdAt,
      acceptedAt: r.acceptedAt,
      completedAt: r.completedAt,
    }));

    res.status(200).json({ success: true, count: formatted.length, data: formatted });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 14. Update Concierge Request Status & Assign Staff (Shift 60)
export const updateConciergeRequestStatus = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { requestId } = req.params;
    const { status, assignedStaffName, notes } = req.body;

    if (!requestId || !Types.ObjectId.isValid(String(requestId))) {
      res.status(400).json({ success: false, errorCode: 'INVALID_REQUEST_ID', message: 'Valid requestId required' });
      return;
    }

    const serviceReq = await ServiceRequest.findOne({ _id: new Types.ObjectId(String(requestId)), hotelId }).populate('roomId');
    if (!serviceReq) {
      res.status(404).json({ success: false, errorCode: 'REQUEST_NOT_FOUND', message: 'Service request not found' });
      return;
    }

    if (status) {
      serviceReq.status = status;
      if (status === ServiceRequestStatus.ASSIGNED || status === ServiceRequestStatus.IN_PROGRESS) {
        if (!serviceReq.acceptedAt) serviceReq.acceptedAt = new Date();
      }
      if (status === ServiceRequestStatus.COMPLETED) {
        serviceReq.completedAt = new Date();
      }
    }

    if (assignedStaffName) {
      serviceReq.assignedStaffName = assignedStaffName;
    }
    if (notes) {
      serviceReq.notes = notes;
    }

    await serviceReq.save();

    const roomNum = (serviceReq.roomId as any)?.roomNumber || 'Unknown';
    const payload = {
      requestId: serviceReq._id.toString(),
      roomNumber: roomNum,
      requestType: serviceReq.requestType,
      priority: serviceReq.priority,
      status: serviceReq.status,
      assignedStaffName: serviceReq.assignedStaffName,
      acceptedAt: serviceReq.acceptedAt,
      completedAt: serviceReq.completedAt,
      notes: serviceReq.notes,
    };

    io.to(`${hotelId.toString()}_global`).emit('pms:concierge_request_updated', payload);
    io.to(`guest_room_${roomNum}`).emit('pms:concierge_request_updated', payload);

    res.status(200).json({
      success: true,
      message: `Concierge request updated to ${serviceReq.status}`,
      data: payload,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};
