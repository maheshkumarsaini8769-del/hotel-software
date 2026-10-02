import { Response } from 'express';
import { Types } from 'mongoose';
import { GroupBooking, GroupBookingStatus, SplitBillingPolicy } from '../models/GroupBooking';
import { RoomType } from '../models/RoomType';
import { Room, RoomStatus } from '../models/Room';
import { Stay, StayStatus } from '../models/Stay';
import { MasterFolio } from '../models/MasterFolio';
import { FolioLineItem, DepartmentType } from '../models/FolioLineItem';
import { TenantRequest } from '../types';
import { io } from '../index';
import { escapeRegex } from '../utils/security';

// 1. Create Multi-Room Group Booking
export const createGroupBooking = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const {
      groupName,
      organizerName,
      organizerPhone,
      organizerEmail,
      companyName,
      companyGst,
      checkInDate,
      checkOutDate,
      rooms, // Array<{ roomTypeId: string, primaryGuestName: string, primaryGuestPhone: string }>
      splitBillingPolicy = SplitBillingPolicy.MASTER_PAYS_ROOM_ONLY,
      advanceDepositPaid = 0,
    } = req.body;

    if (!groupName || !organizerName || !organizerPhone || !checkInDate || !checkOutDate || !rooms || !Array.isArray(rooms) || rooms.length === 0) {
      res.status(400).json({ success: false, errorCode: 'MISSING_FIELDS', message: 'Group details, dates, and room list are required' });
      return;
    }

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 3600 * 24)));

    const groupBookingCode = `GRP-${Date.now().toString().slice(-5)}`;

    // Prepare room entries with authoritative tariff
    const roomEntries: any[] = [];
    let totalRoomTariff = 0;

    for (const r of rooms) {
      const roomType = await RoomType.findOne({ _id: new Types.ObjectId(r.roomTypeId), hotelId });
      if (!roomType) {
        res.status(404).json({ success: false, errorCode: 'ROOM_TYPE_NOT_FOUND', message: `Room type ${r.roomTypeId} not found` });
        return;
      }

      const tariff = roomType.basePriceOvernight;
      totalRoomTariff += tariff * nights;

      roomEntries.push({
        roomTypeId: roomType._id,
        primaryGuestName: r.primaryGuestName,
        primaryGuestPhone: r.primaryGuestPhone,
        tariffPerNight: tariff,
        status: 'CONFIRMED',
      });
    }

    // Authoritative GST: 12% if avg nightly rate <= 7500, else 18%
    const avgTariff = totalRoomTariff / (rooms.length * nights);
    const taxRate = avgTariff <= 7500 ? 0.12 : 0.18;
    const taxAmount = Math.round(totalRoomTariff * taxRate);
    const grandTotal = totalRoomTariff + taxAmount;

    // Create Corporate Master Folio
    const masterFolio = new MasterFolio({
      hotelId,
      stayId: new Types.ObjectId(), // Placeholder for group master
      bookingId: new Types.ObjectId(),
      roomId: new Types.ObjectId(),
      folioNumber: `MF-CORP-${groupBookingCode}`,
      totalRoomTariff,
      totalTaxes: taxAmount,
      netAmountPayable: grandTotal,
      advancePaid: Number(advanceDepositPaid),
      dueAmount: Math.max(0, grandTotal - Number(advanceDepositPaid)),
      folioStatus: 'OPEN',
    });
    await masterFolio.save();

    const groupBooking = new GroupBooking({
      hotelId,
      groupBookingCode,
      groupName,
      organizerName,
      organizerPhone,
      organizerEmail,
      companyName,
      companyGst,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      rooms: roomEntries,
      splitBillingPolicy,
      masterFolioId: masterFolio._id,
      advanceDepositPaid: Number(advanceDepositPaid),
      totalEstimatedAmount: grandTotal,
      status: GroupBookingStatus.CONFIRMED,
    });

    await groupBooking.save();

    res.status(201).json({ success: true, groupBooking, masterFolio });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 2. Bulk Check-In Group & Allocate Physical Rooms
export const bulkCheckInGroup = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const groupBookingId = String(req.params.groupBookingId);
    const { allocations } = req.body; // Array<{ roomEntryId: string, physicalRoomId: string }>

    if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
      res.status(400).json({ success: false, errorCode: 'MISSING_ALLOCATIONS', message: 'Room allocations array required' });
      return;
    }

    const groupBooking = await GroupBooking.findOne({ _id: new Types.ObjectId(groupBookingId), hotelId });
    if (!groupBooking) {
      res.status(404).json({ success: false, errorCode: 'GROUP_BOOKING_NOT_FOUND', message: 'Group booking not found' });
      return;
    }

    const checkInResults: any[] = [];

    for (const alloc of allocations) {
      const roomEntry = groupBooking.rooms.find((r) => r._id?.toString() === alloc.roomEntryId);
      if (!roomEntry) continue;

      const physicalRoom = await Room.findOne({ _id: new Types.ObjectId(alloc.physicalRoomId), hotelId });
      if (!physicalRoom) {
        res.status(404).json({ success: false, errorCode: 'ROOM_NOT_FOUND', message: `Physical room ${alloc.physicalRoomId} not found` });
        return;
      }

      if (physicalRoom.status !== RoomStatus.AVAILABLE) {
        res.status(400).json({ success: false, errorCode: 'ROOM_NOT_AVAILABLE', message: `Room ${physicalRoom.roomNumber} is currently ${physicalRoom.status}` });
        return;
      }

      // Create Stay for this guest
      const stay = new Stay({
        hotelId,
        bookingId: groupBooking._id,
        roomId: physicalRoom._id,
        checkInTimestamp: new Date(),
        expectedCheckOutTimestamp: groupBooking.checkOutDate,
        stayStatus: StayStatus.ACTIVE,
      });
      await stay.save();

      // Create Individual Room Folio (for personal/incidental items)
      const individualFolio = new MasterFolio({
        hotelId,
        stayId: stay._id,
        bookingId: groupBooking._id,
        roomId: physicalRoom._id,
        folioNumber: `MF-ROOM-${physicalRoom.roomNumber}-${Date.now().toString().slice(-4)}`,
        totalRoomTariff: groupBooking.splitBillingPolicy === SplitBillingPolicy.INDIVIDUAL_SETTLEMENT ? roomEntry.tariffPerNight : 0,
        folioStatus: 'OPEN',
      });
      await individualFolio.save();

      // Update Physical Room
      physicalRoom.status = RoomStatus.OCCUPIED;
      physicalRoom.currentStayId = stay._id;
      await physicalRoom.save();

      // Update room entry
      roomEntry.allocatedRoomId = physicalRoom._id;
      roomEntry.stayId = stay._id;
      roomEntry.folioId = individualFolio._id;
      roomEntry.status = 'CHECKED_IN';

      checkInResults.push({
        guestName: roomEntry.primaryGuestName,
        roomNumber: physicalRoom.roomNumber,
        stayId: stay._id,
        folioId: individualFolio._id,
      });
    }

    const allCheckedIn = groupBooking.rooms.every((r) => r.status === 'CHECKED_IN');
    groupBooking.status = allCheckedIn ? GroupBookingStatus.FULLY_CHECKED_IN : GroupBookingStatus.PARTIALLY_CHECKED_IN;
    await groupBooking.save();

    res.status(200).json({
      success: true,
      groupStatus: groupBooking.status,
      checkedInRoomsCount: checkInResults.length,
      checkInResults,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 3. Post Incidental Charge (Split Billing Routing)
export const postIncidentalCharge = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const groupBookingId = String(req.params.groupBookingId);
    const { roomNumber, department, description, rate, quantity = 1, taxRate = 0.05 } = req.body;

    const groupBooking = await GroupBooking.findOne({ _id: new Types.ObjectId(groupBookingId), hotelId });
    if (!groupBooking) {
      res.status(404).json({ success: false, errorCode: 'GROUP_BOOKING_NOT_FOUND', message: 'Group booking not found' });
      return;
    }

    const room = await Room.findOne({ hotelId, roomNumber });
    if (!room) {
      res.status(404).json({ success: false, errorCode: 'ROOM_NOT_FOUND', message: `Room ${roomNumber} not found` });
      return;
    }

    const roomEntry = groupBooking.rooms.find((r) => r.allocatedRoomId?.toString() === room._id.toString());
    if (!roomEntry) {
      res.status(404).json({ success: false, errorCode: 'ROOM_NOT_IN_GROUP', message: `Room ${roomNumber} is not part of this group` });
      return;
    }

    // Determine target folio according to Split Billing Policy:
    // If MASTER_PAYS_ALL -> target is Corporate Master Folio
    // If MASTER_PAYS_ROOM_ONLY or INDIVIDUAL_SETTLEMENT -> target is Guest's Individual Folio
    let targetFolioId = roomEntry.folioId;
    let chargedTo = 'INDIVIDUAL_GUEST';

    if (groupBooking.splitBillingPolicy === SplitBillingPolicy.MASTER_PAYS_ALL) {
      targetFolioId = groupBooking.masterFolioId;
      chargedTo = 'CORPORATE_MASTER';
    }

    if (!targetFolioId) {
      res.status(400).json({ success: false, errorCode: 'FOLIO_NOT_INITIALIZED', message: 'Target folio not initialized' });
      return;
    }

    const subtotal = Number(rate) * Number(quantity);
    const taxAmount = Math.round(subtotal * Number(taxRate));
    const netAmount = subtotal + taxAmount;

    const lineItem = new FolioLineItem({
      hotelId,
      folioId: targetFolioId,
      department: department || DepartmentType.ROOM_SERVICE,
      description: `[Room ${roomNumber}] ${description}`,
      rate: Number(rate),
      quantity: Number(quantity),
      taxRate: Number(taxRate),
      taxAmount,
      netAmount,
      postedAt: new Date(),
    });
    await lineItem.save();

    // Update target folio aggregates
    const folio = await MasterFolio.findById(targetFolioId);
    if (folio) {
      if (department === DepartmentType.ROOM_SERVICE || department === DepartmentType.RESTAURANT_DINE) {
        folio.totalFoodAndBeverage += subtotal;
      } else if (department === DepartmentType.LAUNDRY) {
        folio.totalLaundry += subtotal;
      } else {
        folio.totalPaidServices += subtotal;
      }
      folio.totalTaxes += taxAmount;
      folio.netAmountPayable += netAmount;
      folio.dueAmount += netAmount;
      await folio.save();
    }

    res.status(201).json({
      success: true,
      chargedTo,
      targetFolioId,
      lineItem,
      updatedFolioDue: folio?.dueAmount,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 4. Generate Group Split Invoices
export const generateGroupInvoices = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const groupBookingId = String(req.params.groupBookingId);

    const groupBooking = await GroupBooking.findOne({ _id: new Types.ObjectId(groupBookingId), hotelId });
    if (!groupBooking) {
      res.status(404).json({ success: false, errorCode: 'GROUP_BOOKING_NOT_FOUND', message: 'Group booking not found' });
      return;
    }

    // Corporate B2B Master Folio & Invoice
    const masterFolio = await MasterFolio.findById(groupBooking.masterFolioId);

    // Individual Guest Folios & Personal Invoices
    const individualInvoices: any[] = [];

    for (const r of groupBooking.rooms) {
      if (r.folioId) {
        const folio = await MasterFolio.findById(r.folioId);
        const lineItems = await FolioLineItem.find({ folioId: r.folioId });
        const roomDoc = await Room.findById(r.allocatedRoomId);

        individualInvoices.push({
          guestName: r.primaryGuestName,
          guestPhone: r.primaryGuestPhone,
          roomNumber: roomDoc?.roomNumber,
          folioNumber: folio?.folioNumber,
          dueAmount: folio?.dueAmount || 0,
          lineItems,
        });
      }
    }

    res.status(200).json({
      success: true,
      groupBookingCode: groupBooking.groupBookingCode,
      groupName: groupBooking.groupName,
      splitBillingPolicy: groupBooking.splitBillingPolicy,
      corporateInvoice: {
        companyName: groupBooking.companyName,
        companyGst: groupBooking.companyGst,
        folioNumber: masterFolio?.folioNumber,
        totalTariff: masterFolio?.totalRoomTariff,
        taxes: masterFolio?.totalTaxes,
        advancePaid: masterFolio?.advancePaid,
        netPayable: masterFolio?.netAmountPayable,
        dueAmount: masterFolio?.dueAmount,
      },
      individualInvoices,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 5. Get All Group Bookings with Filter & Summary
export const getGroupBookings = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { status, search } = req.query;
    const filter: any = { hotelId };
    if (status && status !== 'ALL') {
      filter.status = status;
    }
    if (search && typeof search === 'string') {
      const safeSearch = escapeRegex(search.trim());
      filter.$or = [
        { groupBookingCode: { $regex: safeSearch, $options: 'i' } },
        { groupName: { $regex: safeSearch, $options: 'i' } },
        { companyName: { $regex: safeSearch, $options: 'i' } },
        { organizerName: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    const groupBookings = await GroupBooking.find(filter)
      .populate('rooms.roomTypeId', 'name code basePriceOvernight')
      .populate('rooms.allocatedRoomId', 'roomNumber floor status')
      .populate('masterFolioId')
      .sort({ createdAt: -1 });

    const totalGroups = groupBookings.length;
    let totalRoomsBlocked = 0;
    let totalRoomsCheckedIn = 0;
    let totalCorporateDue = 0;

    groupBookings.forEach((g: any) => {
      totalRoomsBlocked += g.rooms?.length || 0;
      totalRoomsCheckedIn += g.rooms?.filter((r: any) => r.status === 'CHECKED_IN').length || 0;
      if (g.masterFolioId) {
        totalCorporateDue += (g.masterFolioId as any).dueAmount || 0;
      }
    });

    res.status(200).json({
      success: true,
      groupBookings,
      summary: {
        totalGroups,
        totalRoomsBlocked,
        totalRoomsCheckedIn,
        totalCorporateDue,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 6. Get Single Group Booking Details
export const getGroupBookingById = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const groupBookingId = String(req.params.groupBookingId);

    const groupBooking = await GroupBooking.findOne({ _id: new Types.ObjectId(groupBookingId), hotelId })
      .populate('rooms.roomTypeId')
      .populate('rooms.allocatedRoomId')
      .populate('rooms.stayId')
      .populate('rooms.folioId')
      .populate('masterFolioId');

    if (!groupBooking) {
      res.status(404).json({ success: false, errorCode: 'GROUP_BOOKING_NOT_FOUND', message: 'Group booking not found' });
      return;
    }

    res.status(200).json({ success: true, groupBooking });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 7. Settle Corporate Master Folio
export const settleCorporateFolio = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const groupBookingId = String(req.params.groupBookingId);
    const { amount, paymentMethod = 'BANK_TRANSFER' } = req.body;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      res.status(400).json({ success: false, errorCode: 'INVALID_AMOUNT', message: 'Settlement amount must be greater than zero' });
      return;
    }

    const groupBooking = await GroupBooking.findOne({ _id: new Types.ObjectId(groupBookingId), hotelId });
    if (!groupBooking) {
      res.status(404).json({ success: false, errorCode: 'GROUP_BOOKING_NOT_FOUND', message: 'Group booking not found' });
      return;
    }

    const masterFolio = await MasterFolio.findById(groupBooking.masterFolioId);
    if (!masterFolio) {
      res.status(404).json({ success: false, errorCode: 'MASTER_FOLIO_NOT_FOUND', message: 'Master folio not found' });
      return;
    }

    const settleAmount = Math.min(numAmount, masterFolio.dueAmount);
    masterFolio.paidAmount += settleAmount;
    masterFolio.dueAmount = Math.max(0, masterFolio.netAmountPayable - masterFolio.advancePaid - masterFolio.paidAmount);

    if (masterFolio.dueAmount === 0) {
      masterFolio.folioStatus = 'SETTLED';
    }
    await masterFolio.save();

    res.status(200).json({
      success: true,
      settledAmount: settleAmount,
      remainingDue: masterFolio.dueAmount,
      folioStatus: masterFolio.folioStatus,
      masterFolio,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 8. Settle Individual Guest Folio
export const settleIndividualFolio = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const groupBookingId = String(req.params.groupBookingId);
    const folioId = String(req.body.folioId);
    const { amount, paymentMethod = 'UPI' } = req.body;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      res.status(400).json({ success: false, errorCode: 'INVALID_AMOUNT', message: 'Settlement amount must be greater than zero' });
      return;
    }

    const groupBooking = await GroupBooking.findOne({ _id: new Types.ObjectId(groupBookingId), hotelId });
    if (!groupBooking) {
      res.status(404).json({ success: false, errorCode: 'GROUP_BOOKING_NOT_FOUND', message: 'Group booking not found' });
      return;
    }

    const folio = await MasterFolio.findOne({ _id: new Types.ObjectId(folioId), hotelId });
    if (!folio) {
      res.status(404).json({ success: false, errorCode: 'FOLIO_NOT_FOUND', message: 'Folio not found' });
      return;
    }

    const settleAmount = Math.min(numAmount, folio.dueAmount);
    folio.paidAmount += settleAmount;
    folio.dueAmount = Math.max(0, folio.netAmountPayable - folio.advancePaid - folio.paidAmount);

    if (folio.dueAmount === 0) {
      folio.folioStatus = 'SETTLED';
    }
    await folio.save();

    res.status(200).json({
      success: true,
      settledAmount: settleAmount,
      remainingDue: folio.dueAmount,
      folioStatus: folio.folioStatus,
      folio,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 9. Bulk Check-Out Entire Group
export const bulkCheckOutGroup = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const groupBookingId = String(req.params.groupBookingId);

    const groupBooking = await GroupBooking.findOne({ _id: new Types.ObjectId(groupBookingId), hotelId });
    if (!groupBooking) {
      res.status(404).json({ success: false, errorCode: 'GROUP_BOOKING_NOT_FOUND', message: 'Group booking not found' });
      return;
    }

    const checkOutResults: any[] = [];

    for (const roomEntry of groupBooking.rooms) {
      if (roomEntry.status === 'CHECKED_IN' && roomEntry.allocatedRoomId) {
        const room = await Room.findById(roomEntry.allocatedRoomId);
        if (room) {
          room.status = RoomStatus.DIRTY;
          room.currentStayId = undefined;
          await room.save();
        }

        if (roomEntry.stayId) {
          const stay = await Stay.findById(roomEntry.stayId);
          if (stay) {
            stay.stayStatus = StayStatus.CHECKED_OUT;
            stay.actualCheckOutTimestamp = new Date();
            await stay.save();
          }
        }

        roomEntry.status = 'CHECKED_OUT';
        checkOutResults.push({
          guestName: roomEntry.primaryGuestName,
          roomNumber: room?.roomNumber,
        });
      }
    }

    groupBooking.status = GroupBookingStatus.COMPLETED;
    await groupBooking.save();

    res.status(200).json({
      success: true,
      message: 'All group rooms successfully checked out',
      groupStatus: groupBooking.status,
      checkedOutCount: checkOutResults.length,
      checkOutResults,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};
