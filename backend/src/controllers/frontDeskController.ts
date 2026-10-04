import { Response } from 'express';
import { Types } from 'mongoose';
import { Room, RoomStatus } from '../models/Room';
import { Booking, BookingStatus } from '../models/Booking';
import { Stay, StayStatus } from '../models/Stay';
import { GuestProfile, VIPTier } from '../models/GuestProfile';
import { MasterFolio } from '../models/MasterFolio';
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

// 1. Flexible Front Desk Reception Check-In (1-Click or Couple Aadhaar Verification)
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

    const room = await Room.findOne({ _id: new Types.ObjectId(roomId), hotelId });
    if (!room) {
      res.status(404).json({ success: false, errorCode: 'ROOM_NOT_FOUND', message: 'Room not found in this hotel property' });
      return;
    }

    if (room.status === RoomStatus.OCCUPIED) {
      res.status(409).json({ success: false, errorCode: 'ROOM_ALREADY_OCCUPIED', message: `Room ${room.roomNumber} is currently occupied` });
      return;
    }

    // 2. Resolve Booking
    let booking: any = null;
    if (bookingId && Types.ObjectId.isValid(bookingId)) {
      booking = await Booking.findOne({ _id: new Types.ObjectId(bookingId), hotelId });
    } else if (bookingNumber) {
      booking = await Booking.findOne({ bookingNumber, hotelId });
    }

    const effectiveGuestName = guestName || booking?.guestName || 'Valued Guest';
    const effectivePhone = guestPhone || booking?.guestPhone || '9999999999';
    const effectiveEmail = guestEmail || booking?.guestEmail || `${effectivePhone}@guest.spicehub.com`;
    const tariff = 3500;
    const taxes = Math.round((tariff * 0.12) * 100) / 100;
    const totalAmount = tariff + taxes;

    // If no existing booking, create an instant walk-in booking record
    if (!booking) {
      const bNumber = `BKG-WALK-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
      const checkInDate = new Date();
      const checkOutDate = new Date(Date.now() + 86400000); // 1 night default

      booking = await Booking.create({
        hotelId,
        bookingNumber: bNumber,
        bookingSource: 'WALK_IN' as any,
        bookingMode: 'OVERNIGHT' as any,
        roomTypeId: room.roomTypeId,
        allocatedRoomId: room._id,
        guestName: effectiveGuestName,
        guestPhone: effectivePhone,
        guestEmail: effectiveEmail,
        checkInDate,
        checkOutDate,
        totalTariff: tariff,
        taxAmount: taxes,
        grandTotal: totalAmount,
        advancePaymentAmount: advancePaid || 0,
        paymentStatus: (advancePaid || 0) >= totalAmount ? 'PAID' : ((advancePaid || 0) > 0 ? 'PARTIAL' : 'UNPAID'),
        bookingStatus: BookingStatus.CHECKED_IN,
      });
    } else {
      booking.allocatedRoomId = room._id;
      booking.bookingStatus = BookingStatus.CHECKED_IN;
      if (advancePaid > 0) {
        booking.advancePaymentAmount = (booking.advancePaymentAmount || 0) + Number(advancePaid);
      }
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
        totalLifetimeSpend: booking.grandTotal || 0,
        lastVisitDate: new Date(),
        idNumberMasked: maskedId,
        idType: skipDocuments ? undefined : idType,
        isVerified: skipDocuments ? false : Boolean(verifiedByReceptionist),
        lastVerifiedDate: verifiedByReceptionist ? new Date() : undefined,
        specialNotes: receptionistNotes,
      });
    } else {
      guestProfile.totalVisits = (guestProfile.totalVisits || 0) + 1;
      guestProfile.totalLifetimeSpend = (guestProfile.totalLifetimeSpend || 0) + (booking.grandTotal || 0);
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

    // 4. Create Master Folio for Room Charges
    const folioNumber = `FOLIO-${room.roomNumber}-${Date.now().toString().slice(-4)}`;
    const roomTariff = booking.grandTotal || 3500;
    const folioTaxes = Math.round((roomTariff * 0.12) * 100) / 100;
    const netPayable = roomTariff + folioTaxes;
    const due = Math.max(0, netPayable - Number(advancePaid || 0));

    // 5. Create Active Stay Record with Flexible Verification Details
    const stay = new Stay({
      hotelId,
      bookingId: booking._id,
      guestId: guestProfile._id,
      roomId: room._id,
      checkInTimestamp: new Date(),
      expectedCheckOutTimestamp: booking.checkOutDate || new Date(Date.now() + 86400000),
      stayStatus: StayStatus.ACTIVE,
      keyCardIssued,
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
        totalRoomTariff: roomTariff,
        totalTaxes: folioTaxes,
        netAmountPayable: netPayable,
        advancePaid: advancePaid || 0,
        paidAmount: advancePaid || 0,
        dueAmount: due,
      });
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
        },
        folio: {
          id: masterFolio._id,
          folioNumber: masterFolio.folioNumber,
          balanceDue: masterFolio.dueAmount,
        },
      },
    });
  } catch (error: any) {
    console.error('[quickFrontDeskCheckIn error]:', error);
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 2. Fetch In-House Guests Directory (Currently Staying)
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
      .populate('masterFolioId', 'folioNumber dueAmount paidAmount netAmountPayable')
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

// 3. Search Guest Profile & Detailed Stay History (By Phone, Name or Booking No)
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

// 4. Get Available Rooms for Front Desk Check-in
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

