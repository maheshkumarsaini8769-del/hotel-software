import { Response } from 'express';
import { Types } from 'mongoose';
import {
  BanquetBooking,
  BanquetBookingStatus,
  BanquetTimeSlot,
  BanquetEventType,
  SeatingLayoutType,
} from '../models/BanquetBooking';
import { MasterFolio } from '../models/MasterFolio';
import { FolioLineItem, DepartmentType } from '../models/FolioLineItem';
import { TenantRequest } from '../types';
import { escapeRegex } from '../utils/security';

// 1. Get Banquet Dashboard KPIs & Upcoming Calendar
export const getBanquetDashboard = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allEvents = await BanquetBooking.find({ hotelId }).sort({ eventDate: 1 });

    const totalEvents = allEvents.length;
    let upcomingEventsCount = 0;
    let totalPaxExpected = 0;
    let totalRevenueContracted = 0;
    let totalBalanceDue = 0;

    const upcomingEvents: any[] = [];

    allEvents.forEach((ev) => {
      totalRevenueContracted += ev.totalEstimatedAmount || 0;
      totalBalanceDue += ev.dueAmount || 0;

      const evDate = new Date(ev.eventDate);
      if (evDate >= today && ev.status !== BanquetBookingStatus.CANCELLED) {
        upcomingEventsCount += 1;
        totalPaxExpected += ev.guaranteedPax || 0;
        if (upcomingEvents.length < 10) {
          upcomingEvents.push(ev);
        }
      }
    });

    res.status(200).json({
      success: true,
      metrics: {
        totalEvents,
        upcomingEventsCount,
        totalPaxExpected,
        totalRevenueContracted,
        totalBalanceDue,
      },
      upcomingEvents,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 2. Create Banquet & Event Booking
export const createBanquetBooking = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const {
      eventName,
      eventType = BanquetEventType.WEDDING_RECEPTION,
      venueName,
      eventDate,
      timeSlot = BanquetTimeSlot.EVENING,
      guaranteedPax,
      expectedPax,
      pricingType = 'PER_PLATE',
      perPlateRate = 0,
      hallRentAmount = 0,
      decorAndAudioVisualAmount = 0,
      advanceDepositPaid = 0,
      organizerName,
      organizerPhone,
      organizerEmail,
      companyName,
      companyGst,
      billingAddress,
      functionProspectus,
    } = req.body;

    if (!eventName || !venueName || !eventDate || !guaranteedPax || !organizerName || !organizerPhone) {
      res.status(400).json({
        success: false,
        errorCode: 'MISSING_FIELDS',
        message: 'Event name, venue, event date, pax count, and organizer contact are required',
      });
      return;
    }

    const dateStr = typeof eventDate === 'string' ? eventDate.split('T')[0] : new Date(eventDate).toISOString().split('T')[0];
    const eDateStart = new Date(`${dateStr}T00:00:00.000Z`);
    const eDateEnd = new Date(`${dateStr}T23:59:59.999Z`);

    // Guard: Prevent Venue Double-Booking for the same date & time slot!
    const existingConflict = await BanquetBooking.findOne({
      hotelId,
      venueName: venueName.trim(),
      eventDate: {
        $gte: eDateStart,
        $lte: eDateEnd,
      },
      timeSlot,
      status: { $in: [BanquetBookingStatus.CONFIRMED, BanquetBookingStatus.IN_PROGRESS, BanquetBookingStatus.PROVISIONAL] },
    });

    if (existingConflict) {
      res.status(409).json({
        success: false,
        errorCode: 'VENUE_SLOT_CONFLICT',
        message: `Venue "${venueName}" is already booked for ${timeSlot} on this date by "${existingConflict.eventName}"`,
      });
      return;
    }

    // Authoritative Financial Calculation
    const pax = Number(guaranteedPax);
    const plateRate = Number(perPlateRate);
    const cateringSubtotal = pricingType === 'HALL_RENT_ONLY' ? 0 : pax * plateRate;
    const hallRent = Number(hallRentAmount);
    const decorAV = Number(decorAndAudioVisualAmount);

    const subtotal = cateringSubtotal + hallRent + decorAV;

    // Standard Indian GST on Composite Banquet Supplies:
    // Food catering: 5% (if standalone) or 18% (luxury hotel banquet service)
    // Here we compute authoritative 18% GST (9% CGST + 9% SGST)
    const taxes = Math.round(subtotal * 0.18);
    const grandTotal = subtotal + taxes;
    const advancePaid = Number(advanceDepositPaid);
    const dueAmount = Math.max(0, grandTotal - advancePaid);

    const bookingCode = `BNQ-${Date.now().toString().slice(-6)}`;

    // Create Event Master Folio
    const masterFolio = new MasterFolio({
      hotelId,
      stayId: new Types.ObjectId(), // Placeholder for banquet folio
      bookingId: new Types.ObjectId(),
      roomId: new Types.ObjectId(),
      folioNumber: `MF-${bookingCode}`,
      totalRoomTariff: hallRent,
      totalFoodAndBeverage: cateringSubtotal,
      totalPaidServices: decorAV,
      totalTaxes: taxes,
      advancePaid,
      netAmountPayable: grandTotal,
      paidAmount: 0,
      dueAmount,
      folioStatus: dueAmount === 0 ? 'SETTLED' : 'OPEN',
    });
    await masterFolio.save();

    const booking = new BanquetBooking({
      hotelId,
      bookingCode,
      eventName,
      eventType,
      venueName: venueName.trim(),
      eventDate: eDateStart,
      timeSlot,
      guaranteedPax: pax,
      expectedPax: Number(expectedPax || pax),
      pricingType,
      perPlateRate: plateRate,
      hallRentAmount: hallRent,
      decorAndAudioVisualAmount: decorAV,
      cateringSubtotal,
      taxes,
      totalEstimatedAmount: grandTotal,
      advanceDepositPaid: advancePaid,
      paidAmount: 0,
      dueAmount,
      status: BanquetBookingStatus.CONFIRMED,
      organizerName,
      organizerPhone,
      organizerEmail: organizerEmail || `${organizerPhone}@example.com`,
      companyName,
      companyGst,
      billingAddress,
      functionProspectus: functionProspectus || {
        seatingLayout: SeatingLayoutType.ROUND_TABLE_CLUSTERS,
        stageDimensions: '24ft x 16ft x 2ft',
        hasAudioVisual: true,
        audioVisualNotes: 'Standard JBL sound with 2 cordless mics',
        foodServiceStartTime: '19:30',
        foodServiceEndTime: '23:30',
        chefSignOff: false,
        banquetManagerSignOff: false,
        electricianAvSignOff: false,
      },
      masterFolioId: masterFolio._id,
    });

    await booking.save();

    res.status(201).json({
      success: true,
      booking,
      masterFolio,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 3. Get All Banquet Bookings with Filter & Search
export const getBanquetBookings = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { status, timeSlot, venueName, search } = req.query;
    const filter: any = { hotelId };

    if (status && status !== 'ALL') {
      filter.status = status;
    }
    if (timeSlot && timeSlot !== 'ALL') {
      filter.timeSlot = timeSlot;
    }
    if (venueName && venueName !== 'ALL') {
      filter.venueName = venueName;
    }
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const safe = escapeRegex(search.trim());
      filter.$or = [
        { bookingCode: { $regex: safe, $options: 'i' } },
        { eventName: { $regex: safe, $options: 'i' } },
        { organizerName: { $regex: safe, $options: 'i' } },
        { companyName: { $regex: safe, $options: 'i' } },
      ];
    }

    const bookings = await BanquetBooking.find(filter)
      .populate('masterFolioId')
      .sort({ eventDate: 1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 4. Get Single Banquet Event Details
export const getBanquetBookingById = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const bookingId = String(req.params.bookingId);

    const booking = await BanquetBooking.findOne({ _id: new Types.ObjectId(bookingId), hotelId }).populate(
      'masterFolioId'
    );

    if (!booking) {
      res.status(404).json({ success: false, errorCode: 'EVENT_NOT_FOUND', message: 'Banquet event not found' });
      return;
    }

    // Get any extra line items posted to this event folio
    let lineItems: any[] = [];
    if (booking.masterFolioId) {
      lineItems = await FolioLineItem.find({ folioId: (booking.masterFolioId as any)._id || booking.masterFolioId });
    }

    res.status(200).json({
      success: true,
      booking,
      lineItems,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 5. Update Function Prospectus (FP - Banquet Event Order)
export const updateFunctionProspectus = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const bookingId = String(req.params.bookingId);
    const fpUpdates = req.body;

    const booking = await BanquetBooking.findOne({ _id: new Types.ObjectId(bookingId), hotelId });
    if (!booking) {
      res.status(404).json({ success: false, errorCode: 'EVENT_NOT_FOUND', message: 'Banquet event not found' });
      return;
    }

    booking.functionProspectus = {
      ...booking.functionProspectus,
      ...fpUpdates,
    };

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Function Prospectus updated successfully',
      functionProspectus: booking.functionProspectus,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 6. Post Extra Incidental / Extra Pax Charge
export const postBanquetExtraCharge = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const bookingId = String(req.params.bookingId);
    const { department = DepartmentType.PAID_AMENITY, description, rate, quantity = 1, taxRate = 0.18 } = req.body;

    const booking = await BanquetBooking.findOne({ _id: new Types.ObjectId(bookingId), hotelId });
    if (!booking) {
      res.status(404).json({ success: false, errorCode: 'EVENT_NOT_FOUND', message: 'Banquet event not found' });
      return;
    }

    const numRate = Number(rate);
    const numQty = Number(quantity);
    if (isNaN(numRate) || numRate <= 0 || isNaN(numQty) || numQty <= 0) {
      res.status(400).json({ success: false, errorCode: 'INVALID_AMOUNT', message: 'Rate and quantity must be positive numbers' });
      return;
    }

    const subtotal = numRate * numQty;
    const taxAmount = Math.round(subtotal * Number(taxRate));
    const netAmount = subtotal + taxAmount;

    // Create line item in event folio
    if (booking.masterFolioId) {
      const lineItem = new FolioLineItem({
        hotelId,
        folioId: booking.masterFolioId,
        department,
        description: `[Banquet: ${booking.bookingCode}] ${description}`,
        rate: numRate,
        quantity: numQty,
        taxRate: Number(taxRate),
        taxAmount,
        netAmount,
        postedAt: new Date(),
      });
      await lineItem.save();

      const folio = await MasterFolio.findById(booking.masterFolioId);
      if (folio) {
        folio.totalPaidServices += subtotal;
        folio.totalTaxes += taxAmount;
        folio.netAmountPayable += netAmount;
        folio.dueAmount += netAmount;
        await folio.save();
      }
    }

    // Update booking document totals
    booking.totalEstimatedAmount += netAmount;
    booking.dueAmount += netAmount;
    await booking.save();

    res.status(201).json({
      success: true,
      message: 'Extra charge posted to Banquet Master Folio',
      netAmount,
      totalDue: booking.dueAmount,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 7. Settle Banquet Folio Balance
export const settleBanquetFolio = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const bookingId = String(req.params.bookingId);
    const { amount, paymentMethod = 'BANK_TRANSFER' } = req.body;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      res.status(400).json({ success: false, errorCode: 'INVALID_AMOUNT', message: 'Settlement amount must be greater than zero' });
      return;
    }

    const booking = await BanquetBooking.findOne({ _id: new Types.ObjectId(bookingId), hotelId });
    if (!booking) {
      res.status(404).json({ success: false, errorCode: 'EVENT_NOT_FOUND', message: 'Banquet event not found' });
      return;
    }

    const settleAmount = Math.min(numAmount, booking.dueAmount);
    booking.paidAmount += settleAmount;
    booking.dueAmount = Math.max(0, booking.totalEstimatedAmount - booking.advanceDepositPaid - booking.paidAmount);

    if (booking.dueAmount === 0 && booking.status === BanquetBookingStatus.IN_PROGRESS) {
      booking.status = BanquetBookingStatus.COMPLETED;
    }

    await booking.save();

    if (booking.masterFolioId) {
      const folio = await MasterFolio.findById(booking.masterFolioId);
      if (folio) {
        folio.paidAmount += settleAmount;
        folio.dueAmount = Math.max(0, folio.netAmountPayable - folio.advancePaid - folio.paidAmount);
        if (folio.dueAmount === 0) {
          folio.folioStatus = 'SETTLED';
        }
        await folio.save();
      }
    }

    res.status(200).json({
      success: true,
      settledAmount: settleAmount,
      remainingDue: booking.dueAmount,
      bookingStatus: booking.status,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 8. Complete Banquet Event & Release Venue
export const completeBanquetEvent = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const bookingId = String(req.params.bookingId);

    const booking = await BanquetBooking.findOne({ _id: new Types.ObjectId(bookingId), hotelId });
    if (!booking) {
      res.status(404).json({ success: false, errorCode: 'EVENT_NOT_FOUND', message: 'Banquet event not found' });
      return;
    }

    booking.status = BanquetBookingStatus.COMPLETED;
    await booking.save();

    res.status(200).json({
      success: true,
      message: `Event "${booking.eventName}" marked completed and venue "${booking.venueName}" released`,
      bookingStatus: booking.status,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};
