import { Response } from 'express';
import { Types } from 'mongoose';
import {
  TableReservation,
  ReservationStatus,
  DepositStatus,
} from '../models/TableReservation';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { GuestProfile, VIPTier } from '../models/GuestProfile';
import { TenantRequest } from '../types';

// Critical Allergen List
export const CRITICAL_ALLERGENS = [
  'GLUTEN',
  'DAIRY_LACTOSE',
  'PEANUTS_TREENUTS',
  'SHELLFISH_SEAFOOD',
  'SOY',
  'EGGS',
  'SESAME',
  'SULFITES',
];

// 1. Create Dining Reservation with CRM Dietary & Allergen Profile
export const createDiningReservation = async (
  req: TenantRequest,
  res: Response
): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const {
      customerName,
      customerPhone,
      customerEmail,
      partySize = 2,
      reservationDate = new Date(),
      timeSlot = '19:30',
      durationMinutes = 90,
      mealPeriod = 'DINNER',
      tableTypePreference = 'STANDARD_DINING',
      vipTier = 'REGULAR',
      dietaryPreferences = [],
      allergens = [],
      specialOccasion = 'NONE',
      chefNotes,
      preOrderedItems = [],
      specialRequests,
      depositAmount = 0,
      assignedTableIds = [],
    } = req.body;

    if (!customerName || !customerPhone) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_INPUT',
        message: 'customerName and customerPhone are required',
      });
      return;
    }

    const reservationNumber = `RES-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

    // Sync or Create GuestProfile for CRM
    let guestProfile = await GuestProfile.findOne({ hotelId, phone: customerPhone });
    if (!guestProfile) {
      guestProfile = new GuestProfile({
        hotelId,
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
        vipTier: vipTier as VIPTier,
        allergies: allergens,
        dietaryPreferences,
        totalVisits: 1,
      });
    } else {
      guestProfile.totalVisits += 1;
      guestProfile.lastVisitDate = new Date();
      // Union allergies
      const mergedAllergies = Array.from(new Set([...guestProfile.allergies, ...allergens]));
      guestProfile.allergies = mergedAllergies;
      if (vipTier !== 'REGULAR') {
        guestProfile.vipTier = vipTier as VIPTier;
      }
    }
    await guestProfile.save();

    let tableObjectIds: Types.ObjectId[] = [];
    if (assignedTableIds && Array.isArray(assignedTableIds) && assignedTableIds.length > 0) {
      tableObjectIds = assignedTableIds.map((id: string) => new Types.ObjectId(id));
      const validTables = await DiningTable.find({ _id: { $in: tableObjectIds }, hotelId });
      if (validTables.length !== tableObjectIds.length) {
        res.status(404).json({ success: false, errorCode: 'TABLES_NOT_FOUND', message: 'One or more tables not found for this hotel' });
        return;
      }

      const conflict = await TableReservation.findOne({
        hotelId,
        reservationDate: new Date(reservationDate),
        timeSlot,
        assignedTableIds: { $in: tableObjectIds },
        status: { $in: [ReservationStatus.CONFIRMED, ReservationStatus.SEATED] },
      });
      if (conflict) {
        res.status(409).json({ success: false, errorCode: 'TABLE_SLOT_CONFLICT', message: `Table is already reserved for ${timeSlot}` });
        return;
      }
    }

    const reservation = new TableReservation({
      hotelId,
      reservationNumber,
      customerName,
      customerPhone,
      customerEmail,
      partySize: Number(partySize) || 2,
      reservationDate: new Date(reservationDate),
      timeSlot,
      durationMinutes: Number(durationMinutes) || 90,
      mealPeriod,
      tableTypePreference,
      vipTier,
      dietaryPreferences,
      allergens,
      specialOccasion,
      chefNotes,
      preOrderedItems,
      guestProfileId: guestProfile._id,
      specialRequests,
      depositAmount: Number(depositAmount) || 0,
      depositStatus: Number(depositAmount) > 0 ? DepositStatus.PAID : DepositStatus.NONE,
      status: ReservationStatus.CONFIRMED,
      assignedTableIds: tableObjectIds,
    });

    await reservation.save();

    res.status(201).json({
      success: true,
      message: `Reservation ${reservationNumber} confirmed for ${customerName}`,
      reservation,
      guestProfile: {
        vipTier: guestProfile.vipTier,
        totalVisits: guestProfile.totalVisits,
        allergies: guestProfile.allergies,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 2. Get Dining Reservations with CRM KPIs
export const getDiningReservations = async (
  req: TenantRequest,
  res: Response
): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { date, mealPeriod, status, vipTier, allergen } = req.query;
    const filter: any = { hotelId };

    if (date && typeof date === 'string') {
      const d = new Date(date);
      const startOfDay = new Date(d.setHours(0, 0, 0, 0));
      const endOfDay = new Date(d.setHours(23, 59, 59, 999));
      filter.reservationDate = { $gte: startOfDay, $lte: endOfDay };
    }

    if (mealPeriod && typeof mealPeriod === 'string' && mealPeriod !== 'ALL') {
      filter.mealPeriod = mealPeriod;
    }

    if (status && typeof status === 'string' && status !== 'ALL') {
      filter.status = status;
    }

    if (vipTier && typeof vipTier === 'string' && vipTier !== 'ALL') {
      filter.vipTier = vipTier;
    }

    if (allergen && typeof allergen === 'string' && allergen !== 'ALL') {
      filter.allergens = allergen;
    }

    const reservations = await TableReservation.find(filter)
      .populate('assignedTableIds', 'tableNumber capacity section status')
      .populate('guestProfileId', 'vipTier totalVisits totalLifetimeSpend allergies')
      .sort({ timeSlot: 1, createdAt: -1 });

    let confirmedCount = 0;
    let seatedCount = 0;
    let vipCount = 0;
    let allergenAlertsCount = 0;

    reservations.forEach((r) => {
      if (r.status === ReservationStatus.CONFIRMED) confirmedCount++;
      if (r.status === ReservationStatus.SEATED) seatedCount++;
      if (r.vipTier && r.vipTier !== 'REGULAR') vipCount++;
      if (r.allergens && r.allergens.length > 0) allergenAlertsCount++;
    });

    res.status(200).json({
      success: true,
      metrics: {
        totalReservationsCount: reservations.length,
        confirmedCount,
        seatedCount,
        vipCount,
        allergenAlertsCount,
      },
      reservations,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 3. Seat Dining Reservation
export const seatDiningReservation = async (
  req: TenantRequest,
  res: Response
): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const reservationId = String(req.params.reservationId);
    const { tableId } = req.body;

    if (!Types.ObjectId.isValid(reservationId)) {
      res.status(404).json({ success: false, errorCode: 'RESERVATION_NOT_FOUND', message: 'Reservation not found' });
      return;
    }

    const reservation = await TableReservation.findOne({
      _id: new Types.ObjectId(reservationId),
      hotelId,
    });

    if (!reservation) {
      res.status(404).json({ success: false, errorCode: 'RESERVATION_NOT_FOUND', message: 'Reservation not found' });
      return;
    }

    reservation.status = ReservationStatus.SEATED;
    reservation.seatedAt = new Date();

    if (tableId && Types.ObjectId.isValid(tableId)) {
      const tableObjectId = new Types.ObjectId(tableId);
      reservation.assignedTableIds = [tableObjectId];
      // Update DiningTable status to OCCUPIED
      await DiningTable.findOneAndUpdate(
        { _id: tableObjectId, hotelId },
        { currentStatus: TableStatus.OCCUPIED }
      );
    }

    await reservation.save();

    res.status(200).json({
      success: true,
      message: `Party of ${reservation.partySize} (${reservation.customerName}) seated successfully`,
      reservation,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 4. Update Reservation Status (e.g. NO_SHOW, CANCELLED)
export const updateDiningReservationStatus = async (
  req: TenantRequest,
  res: Response
): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const reservationId = String(req.params.reservationId);
    const { status, cancellationReason } = req.body;

    if (!Types.ObjectId.isValid(reservationId)) {
      res.status(404).json({ success: false, errorCode: 'RESERVATION_NOT_FOUND', message: 'Reservation not found' });
      return;
    }

    const reservation = await TableReservation.findOne({
      _id: new Types.ObjectId(reservationId),
      hotelId,
    });

    if (!reservation) {
      res.status(404).json({ success: false, errorCode: 'RESERVATION_NOT_FOUND', message: 'Reservation not found' });
      return;
    }

    if (reservation.status === ReservationStatus.SEATED && status === ReservationStatus.CANCELLED) {
      res.status(400).json({
        success: false,
        errorCode: 'CANNOT_CANCEL_SEATED',
        message: 'Seated reservation cannot be cancelled directly; please complete dining session',
      });
      return;
    }

    reservation.status = status;
    if (status === ReservationStatus.CANCELLED) {
      reservation.cancelledAt = new Date();
      reservation.cancellationReason = cancellationReason;

      if (reservation.assignedTableIds && reservation.assignedTableIds.length > 0) {
        await DiningTable.updateMany(
          { _id: { $in: reservation.assignedTableIds }, hotelId, currentStatus: TableStatus.RESERVED },
          { currentStatus: TableStatus.AVAILABLE }
        );
      }
    } else if (status === ReservationStatus.COMPLETED) {
      reservation.completedAt = new Date();
    }

    await reservation.save();

    res.status(200).json({
      success: true,
      message: `Reservation ${reservation.reservationNumber} marked as ${status}`,
      reservation,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 5. Get Guest Dietary & CRM Profile
export const getGuestDietaryProfile = async (
  req: TenantRequest,
  res: Response
): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const { phone } = req.query;

    if (!phone || typeof phone !== 'string') {
      res.status(400).json({ success: false, errorCode: 'PHONE_REQUIRED', message: 'Guest phone required' });
      return;
    }

    const profile = await GuestProfile.findOne({ hotelId, phone });
    if (!profile) {
      res.status(404).json({ success: false, errorCode: 'PROFILE_NOT_FOUND', message: 'Guest profile not found' });
      return;
    }

    const pastReservations = await TableReservation.find({
      hotelId,
      customerPhone: phone,
    })
      .sort({ reservationDate: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      profile,
      pastReservations,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};
