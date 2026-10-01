import { Response } from 'express';
import { Types } from 'mongoose';
import { NightAuditSession, NightAuditStatus } from '../models/NightAuditSession';
import { Stay, StayStatus } from '../models/Stay';
import { Room, RoomStatus } from '../models/Room';
import { RoomType } from '../models/RoomType';
import { MasterFolio } from '../models/MasterFolio';
import { FolioLineItem, DepartmentType } from '../models/FolioLineItem';
import { RestaurantOrder } from '../models/RestaurantOrder';
import { RestaurantBill } from '../models/RestaurantBill';
import { TenantRequest } from '../types';

// Helper to format date string YYYY-MM-DD
export const formatDateString = (d: Date): string => {
  return d.toISOString().split('T')[0];
};

// Helper to get next date string
export const getNextDateString = (dateStr: string): string => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

// 1. Run Comprehensive Daily Night Audit & Business Date Rollover
export const runDailyNightAudit = async (
  req: TenantRequest,
  res: Response
): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const todayStr = formatDateString(new Date());
    const {
      auditDate = todayStr,
      notes = 'Standard End-of-Day Night Audit & Revenue Rollup',
      performedByUserName = 'Night Auditor',
    } = req.body;

    // Check if audit has already been completed for this business date
    const existingAudit = await NightAuditSession.findOne({
      hotelId,
      auditDate,
      status: NightAuditStatus.COMPLETED,
    });

    if (existingAudit) {
      res.status(409).json({
        success: false,
        errorCode: 'AUDIT_ALREADY_COMPLETED',
        message: `Night Audit for date ${auditDate} has already been completed and locked.`,
        data: existingAudit,
      });
      return;
    }

    // A. Room Inventory & In-House Stays Query
    const totalRooms = await Room.countDocuments({
      hotelId,
      status: { $ne: RoomStatus.OUT_OF_SERVICE },
    });

    const activeStays = await Stay.find({
      hotelId,
      stayStatus: StayStatus.ACTIVE,
    });

    const occupiedRooms = activeStays.length;
    const vacantRooms = Math.max(0, totalRooms - occupiedRooms);
    const occupancyRate = totalRooms > 0 ? Number(((occupiedRooms / totalRooms) * 100).toFixed(2)) : 0;

    // B. Auto-Post Room Tariffs to Master Folios (Idempotent)
    let roomsAutoPostedCount = 0;
    let totalRoomRevenue = 0;
    let totalRoomTaxes = 0;

    for (const stay of activeStays) {
      if (!stay.masterFolioId) continue;

      const room = await Room.findById(stay.roomId);
      if (!room) continue;

      const roomType = await RoomType.findById(room.roomTypeId);
      const baseRoomTariff = roomType?.basePriceOvernight || 2500;
      const roomGstAmount = Number((baseRoomTariff * 0.12).toFixed(2)); // 12% GST
      const netRoomTotal = Number((baseRoomTariff + roomGstAmount).toFixed(2));

      const lineItemDesc = `Nightly Room Tariff - ${auditDate} (${room.roomNumber})`;

      // Check for duplicate line item on the same folio for this audit date
      const alreadyPosted = await FolioLineItem.findOne({
        folioId: stay.masterFolioId,
        department: DepartmentType.ROOM_RENT,
        description: lineItemDesc,
      });

      if (!alreadyPosted) {
        await FolioLineItem.create({
          hotelId,
          folioId: stay.masterFolioId,
          department: DepartmentType.ROOM_RENT,
          description: lineItemDesc,
          rate: baseRoomTariff,
          quantity: 1,
          taxRate: 12,
          taxAmount: roomGstAmount,
          netAmount: netRoomTotal,
          postedAt: new Date(),
        });

        // Update MasterFolio financial totals
        await MasterFolio.findByIdAndUpdate(stay.masterFolioId, {
          $inc: {
            totalRoomTariff: baseRoomTariff,
            totalTaxes: roomGstAmount,
            netAmountPayable: netRoomTotal,
            dueAmount: netRoomTotal,
          },
        });

        roomsAutoPostedCount++;
        totalRoomRevenue += baseRoomTariff;
        totalRoomTaxes += roomGstAmount;
      }
    }

    // C. Scan F&B Revenue & Active Diners Quarantine
    // Aggregate settled restaurant bills specifically for this business date
    const businessDayStart = new Date(`${auditDate}T00:00:00.000Z`);
    const businessDayEnd = new Date(`${auditDate}T23:59:59.999Z`);

    const settledBills = await RestaurantBill.find({
      hotelId,
      billStatus: 'PAID',
      $or: [
        { settledAt: { $gte: businessDayStart, $lte: businessDayEnd } },
        { settledAt: { $exists: false }, updatedAt: { $gte: businessDayStart, $lte: businessDayEnd } },
      ],
    });

    let totalFoodAndBeverageRevenue = 0;
    let totalFnBTaxes = 0;
    let totalPaymentsCollected = 0;

    settledBills.forEach((bill) => {
      totalFoodAndBeverageRevenue += bill.subTotal || 0;
      totalFnBTaxes += bill.totalTax || 0;
      totalPaymentsCollected += bill.grandTotal || 0;
    });

    // Quarantined Active Late Diners (Orders in PREPARING / PLACED / ACCEPTED / READY)
    const activeLateOrders = await RestaurantOrder.find({
      hotelId,
      orderStatus: { $in: ['PLACED', 'ACCEPTED', 'PREPARING', 'READY'] },
    });
    const activeLateDinersQuarantinedCount = activeLateOrders.length;

    // D. Calculate Key Performance Indicators (ADR & RevPAR)
    const averageDailyRate =
      occupiedRooms > 0 ? Number((totalRoomRevenue / occupiedRooms).toFixed(2)) : 0;
    const revPAR =
      totalRooms > 0 ? Number((totalRoomRevenue / totalRooms).toFixed(2)) : 0;

    const totalTaxesCollected = Number((totalRoomTaxes + totalFnBTaxes).toFixed(2));
    const totalGrossRevenue = Number(
      (totalRoomRevenue + totalFoodAndBeverageRevenue + totalTaxesCollected).toFixed(2)
    );

    const nextBusinessDate = getNextDateString(auditDate);

    // E. Save and Complete Night Audit Session Record
    const auditSession = await NightAuditSession.create({
      hotelId,
      auditDate,
      nextBusinessDate,
      status: NightAuditStatus.COMPLETED,
      totalRooms,
      occupiedRooms,
      vacantRooms,
      occupancyRate,
      totalRoomRevenue,
      totalFoodAndBeverageRevenue,
      totalLaundryRevenue: 0,
      totalPaidServicesRevenue: 0,
      totalTaxesCollected,
      totalGrossRevenue,
      totalPaymentsCollected,
      averageDailyRate,
      revPAR,
      roomsAutoPostedCount,
      unpostedChargesCleanedCount: 0,
      activeLateDinersQuarantinedCount,
      performedByUserId: req.user?.userId ? new Types.ObjectId(req.user.userId) : undefined,
      performedByUserName,
      notes,
      isDayClosed: true,
      completedAt: new Date(),
    });

    // Notify through socket
    const io = req.app?.get('io');
    if (io) {
      io.to(`${hotelId.toString()}_global`).emit('NIGHT_AUDIT_COMPLETED', {
        auditId: auditSession._id,
        auditDate,
        nextBusinessDate,
        occupancyRate,
        revPAR,
        totalGrossRevenue,
      });
    }

    res.status(201).json({
      success: true,
      message: `Night audit successfully completed for ${auditDate}. Business date rolled over to ${nextBusinessDate}.`,
      data: auditSession,
    });
  } catch (error: any) {
    console.error('[NightAudit] Error executing daily night audit:', error);
    res.status(500).json({
      success: false,
      errorCode: 'NIGHT_AUDIT_EXECUTION_FAILED',
      message: error.message || 'Internal server error during night audit',
    });
  }
};

// 2. Get Live Pre-Audit Day Readiness & Financial Preview
export const getLiveDayPreAuditStatus = async (
  req: TenantRequest,
  res: Response
): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const todayStr = formatDateString(new Date());
    const totalRooms = await Room.countDocuments({
      hotelId,
      status: { $ne: RoomStatus.OUT_OF_SERVICE },
    });

    const activeStays = await Stay.find({
      hotelId,
      stayStatus: StayStatus.ACTIVE,
    });

    const occupiedRooms = activeStays.length;
    const occupancyRate = totalRooms > 0 ? Number(((occupiedRooms / totalRooms) * 100).toFixed(2)) : 0;

    const unpostedOrders = await RestaurantOrder.countDocuments({
      hotelId,
      orderStatus: { $in: ['PLACED', 'ACCEPTED', 'PREPARING', 'READY'] },
    });

    const lastAudit = await NightAuditSession.findOne({
      hotelId,
      status: NightAuditStatus.COMPLETED,
    }).sort({ auditDate: -1 });

    const currentBusinessDate = lastAudit?.nextBusinessDate || todayStr;

    res.status(200).json({
      success: true,
      data: {
        currentBusinessDate,
        totalRooms,
        occupiedRooms,
        vacantRooms: Math.max(0, totalRooms - occupiedRooms),
        occupancyRate,
        unpostedOrdersCount: unpostedOrders,
        readyForAudit: unpostedOrders === 0,
        lastCompletedAuditDate: lastAudit?.auditDate || null,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      errorCode: 'PRE_AUDIT_STATUS_FAILED',
      message: error.message || 'Internal server error checking pre-audit status',
    });
  }
};

// 3. Get Night Audit Historical Reports
export const getNightAuditHistory = async (
  req: TenantRequest,
  res: Response
): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { limit = 30 } = req.query;
    const reports = await NightAuditSession.find({ hotelId })
      .sort({ auditDate: -1 })
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      data: reports,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      errorCode: 'NIGHT_AUDIT_HISTORY_FAILED',
      message: error.message || 'Internal server error fetching night audit history',
    });
  }
};

// 4. Get Night Audit Details by ID
export const getNightAuditReportById = async (
  req: TenantRequest,
  res: Response
): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const id = req.params.id as string;
    if (!id || !Types.ObjectId.isValid(id)) {
      res.status(404).json({ success: false, errorCode: 'NOT_FOUND', message: 'Invalid Audit Session ID' });
      return;
    }

    const report = await NightAuditSession.findOne({
      _id: new Types.ObjectId(id),
      hotelId,
    });

    if (!report) {
      res.status(404).json({
        success: false,
        errorCode: 'REPORT_NOT_FOUND',
        message: 'Night audit report not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      errorCode: 'REPORT_FETCH_FAILED',
      message: error.message || 'Internal server error fetching report',
    });
  }
};
