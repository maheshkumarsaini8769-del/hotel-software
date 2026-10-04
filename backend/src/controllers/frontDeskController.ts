import { Response } from 'express';
import { Types } from 'mongoose';
import { Room, RoomStatus } from '../models/Room';
import { Booking, BookingStatus } from '../models/Booking';
import { Stay, StayStatus } from '../models/Stay';
import { GuestProfile, VIPTier } from '../models/GuestProfile';
import { MasterFolio } from '../models/MasterFolio';
import { FolioLineItem, DepartmentType } from '../models/FolioLineItem';
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

// 6. Register In-Room Concierge / Housekeeping Request
export const postConciergeRequest = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { roomNumber, requestType, notes } = req.body;
    if (!roomNumber || !requestType) {
      res.status(400).json({ success: false, errorCode: 'INVALID_PARAMS', message: 'roomNumber and requestType are required' });
      return;
    }

    const room = await Room.findOne({
      hotelId,
      roomNumber: { $regex: new RegExp(`^${String(roomNumber).trim()}$`, 'i') },
    });

    if (room) {
      const activeStay = await Stay.findOne({ hotelId, roomId: room._id, stayStatus: StayStatus.ACTIVE });
      if (activeStay) {
        const appended = `[Concierge: ${requestType}] ${notes || ''}`.trim();
        activeStay.receptionistNotes = activeStay.receptionistNotes
          ? `${activeStay.receptionistNotes} | ${appended}`
          : appended;
        await activeStay.save();
      }
    }

    io.to(`${hotelId.toString()}_global`).emit('pms:concierge_request', {
      roomNumber,
      requestType,
      notes,
      timestamp: new Date(),
    });

    res.status(200).json({
      success: true,
      message: `Concierge request for ${requestType} registered for Room ${roomNumber}`,
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
