import { Response } from 'express';
import { Types } from 'mongoose';
import {
  StaffShiftRoster,
  ShiftType,
  StaffDepartment,
  RosterStatus,
} from '../models/StaffShiftRoster';
import {
  StaffAttendanceLog,
  AttendanceStatus,
  ClockMethod,
} from '../models/StaffAttendanceLog';
import {
  TipPoolSession,
  TipPoolStatus,
} from '../models/TipPoolSession';
import { User } from '../models/User';
import argon2 from 'argon2';
import { TenantRequest } from '../types';

// 1. Create Shift Roster Schedules (Single or Bulk)
export const createRosterSchedule = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { schedules } = req.body; // Array<{ userId, staffName, department, shiftDate, shiftType, plannedStartTime, plannedEndTime, plannedHours, notes }>

    if (!schedules || !Array.isArray(schedules) || schedules.length === 0) {
      res.status(400).json({ success: false, errorCode: 'EMPTY_ROSTER', message: 'At least one shift schedule is required' });
      return;
    }

    const assignedByUserId = req.user?.userId ? new Types.ObjectId(req.user.userId) : new Types.ObjectId();

    const createdDocs = await StaffShiftRoster.insertMany(
      schedules.map((s) => ({
        hotelId,
        userId: new Types.ObjectId(s.userId),
        staffName: s.staffName,
        department: s.department || StaffDepartment.FRONT_OF_HOUSE_SERVICE,
        shiftDate: new Date(s.shiftDate),
        shiftType: s.shiftType || ShiftType.MORNING_OPENING,
        plannedStartTime: s.plannedStartTime || '08:00',
        plannedEndTime: s.plannedEndTime || '16:30',
        plannedHours: Number(s.plannedHours) || 8.5,
        status: RosterStatus.SCHEDULED,
        notes: s.notes,
        assignedByUserId,
      }))
    );

    res.status(201).json({
      success: true,
      message: `${createdDocs.length} shift schedule(s) created successfully`,
      schedules: createdDocs,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 2. Get Roster Schedules
export const getRosterSchedules = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { date, department, status } = req.query;
    const filter: any = { hotelId };

    if (date && typeof date === 'string') {
      const d = new Date(date);
      const startOfDay = new Date(d.setHours(0, 0, 0, 0));
      const endOfDay = new Date(d.setHours(23, 59, 59, 999));
      filter.shiftDate = { $gte: startOfDay, $lte: endOfDay };
    }

    if (department && typeof department === 'string' && department !== 'ALL') {
      filter.department = department;
    }

    if (status && typeof status === 'string' && status !== 'ALL') {
      filter.status = status;
    }

    const schedules = await StaffShiftRoster.find(filter)
      .populate('userId', 'name role email phone')
      .sort({ shiftDate: 1, plannedStartTime: 1 });

    res.status(200).json({
      success: true,
      schedules,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 3. Clock In Staff
export const clockInStaff = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { userId, staffPin, clockMethod = ClockMethod.PIN } = req.body;

    let targetUser: any = null;
    if (userId) {
      targetUser = await User.findOne({ _id: new Types.ObjectId(userId), hotelId });
      if (targetUser && staffPin && targetUser.pinCodeHash) {
        let isMatch = false;
        if (targetUser.pinCodeHash.startsWith('$')) {
          try {
            isMatch = await argon2.verify(targetUser.pinCodeHash, String(staffPin));
          } catch {
            isMatch = false;
          }
        } else {
          isMatch = targetUser.pinCodeHash === String(staffPin);
        }
        if (!isMatch) {
          res.status(401).json({ success: false, errorCode: 'INVALID_PIN', message: 'Incorrect staff PIN' });
          return;
        }
      }
    } else if (staffPin) {
      // Find staff by verifying pin hash among active hotel users
      const hotelUsers = await User.find({ hotelId, pinCodeHash: { $exists: true, $ne: null }, isActive: true });
      for (const u of hotelUsers) {
        if (u.pinCodeHash) {
          let isMatch = false;
          if (u.pinCodeHash.startsWith('$')) {
            try {
              isMatch = await argon2.verify(u.pinCodeHash, String(staffPin));
            } catch {
              isMatch = false;
            }
          } else {
            isMatch = u.pinCodeHash === String(staffPin);
          }
          if (isMatch) {
            targetUser = u;
            break;
          }
        }
      }
    }

    if (!targetUser) {
      res.status(404).json({ success: false, errorCode: 'STAFF_NOT_FOUND', message: 'Staff member not recognized' });
      return;
    }

    const now = new Date();
    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date().setHours(23, 59, 59, 999));
    const timezoneBufferStart = new Date(startOfDay.getTime() - 24 * 60 * 60 * 1000);
    const timezoneBufferEnd = new Date(endOfDay.getTime() + 24 * 60 * 60 * 1000);

    // Check if already clocked in today without clock-out
    const existingActiveLog = await StaffAttendanceLog.findOne({
      hotelId,
      userId: targetUser._id,
      attendanceDate: { $gte: timezoneBufferStart, $lte: timezoneBufferEnd },
      clockOutTime: { $exists: false },
    });

    if (existingActiveLog) {
      res.status(400).json({
        success: false,
        errorCode: 'ALREADY_CLOCKED_IN',
        message: `${targetUser.name} is already clocked in for today's shift`,
        log: existingActiveLog,
      });
      return;
    }

    // Match with planned roster if available
    const scheduledRoster = await StaffShiftRoster.findOne({
      hotelId,
      userId: targetUser._id,
      shiftDate: { $gte: timezoneBufferStart, $lte: timezoneBufferEnd },
      status: { $in: [RosterStatus.SCHEDULED, RosterStatus.ACTIVE] },
    }).sort({ shiftDate: 1 });

    let lateMinutes = 0;
    let status = AttendanceStatus.ON_TIME;
    let dept = StaffDepartment.FRONT_OF_HOUSE_SERVICE;

    if (scheduledRoster) {
      dept = scheduledRoster.department;
      scheduledRoster.status = RosterStatus.ACTIVE;
      await scheduledRoster.save();

      // Check punctuality against plannedStartTime (e.g. "08:00")
      const [planH, planM] = scheduledRoster.plannedStartTime.split(':').map(Number);
      const plannedTime = new Date();
      plannedTime.setHours(planH, planM, 0, 0);

      const diffMs = now.getTime() - plannedTime.getTime();
      if (diffMs > 10 * 60 * 1000) {
        // >10 mins grace period is marked Late
        lateMinutes = Math.round(diffMs / (60 * 1000));
        status = AttendanceStatus.LATE;
      }
    }

    const log = new StaffAttendanceLog({
      hotelId,
      userId: targetUser._id,
      rosterId: scheduledRoster?._id,
      staffName: targetUser.name,
      department: dept,
      attendanceDate: startOfDay,
      clockInTime: now,
      lateMinutes,
      status,
      clockMethod,
    });

    await log.save();

    res.status(201).json({
      success: true,
      message: `${targetUser.name} clocked in successfully (${status})`,
      log,
    });
  } catch (error: any) {
    console.error('[clockInStaff error]:', error);
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 4. Clock Out Staff
export const clockOutStaff = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ success: false, errorCode: 'USER_ID_REQUIRED', message: 'userId is required to clock out' });
      return;
    }

    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date().setHours(23, 59, 59, 999));

    const log = await StaffAttendanceLog.findOne({
      hotelId,
      userId: new Types.ObjectId(userId),
      attendanceDate: { $gte: startOfDay, $lte: endOfDay },
      clockOutTime: { $exists: false },
    });

    if (!log) {
      res.status(404).json({ success: false, errorCode: 'NO_ACTIVE_CLOCK_IN', message: 'No active clock-in session found for this staff member today' });
      return;
    }

    const now = new Date();
    log.clockOutTime = now;

    // Calculate hours worked
    const diffHours = (now.getTime() - log.clockInTime.getTime()) / (1000 * 60 * 60);
    log.totalHoursWorked = Math.round(diffHours * 10) / 10;

    // Overtime calculation (>8 hours standard)
    if (log.totalHoursWorked > 8.0) {
      log.overtimeMinutes = Math.round((log.totalHoursWorked - 8.0) * 60);
      if (log.status !== AttendanceStatus.LATE) {
        log.status = AttendanceStatus.OVERTIME;
      }
    }

    await log.save();

    if (log.rosterId) {
      await StaffShiftRoster.findByIdAndUpdate(log.rosterId, { status: RosterStatus.COMPLETED });
    }

    res.status(200).json({
      success: true,
      message: `${log.staffName} clocked out. Total hours worked: ${log.totalHoursWorked}h`,
      log,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 5. Get Attendance Logs & KPIs
export const getAttendanceLogs = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { date, department } = req.query;
    const filter: any = { hotelId };

    if (date && typeof date === 'string') {
      const d = new Date(date);
      const startOfDay = new Date(d.setHours(0, 0, 0, 0));
      const endOfDay = new Date(d.setHours(23, 59, 59, 999));
      filter.attendanceDate = { $gte: startOfDay, $lte: endOfDay };
    }

    if (department && typeof department === 'string' && department !== 'ALL') {
      filter.department = department;
    }

    const logs = await StaffAttendanceLog.find(filter)
      .populate('userId', 'name role email phone')
      .sort({ clockInTime: -1 });

    let activeClockedInCount = 0;
    let completedShiftsCount = 0;
    let lateCount = 0;
    let totalHoursLogged = 0;

    logs.forEach((l) => {
      if (!l.clockOutTime) {
        activeClockedInCount++;
      } else {
        completedShiftsCount++;
      }
      if (l.lateMinutes > 0) {
        lateCount++;
      }
      totalHoursLogged += l.totalHoursWorked || 0;
    });

    res.status(200).json({
      success: true,
      metrics: {
        totalLogsCount: logs.length,
        activeClockedInCount,
        completedShiftsCount,
        lateCount,
        totalHoursLogged: Math.round(totalHoursLogged * 10) / 10,
      },
      logs,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 6. Create Daily Gratuity Tip Pool Session
export const createTipPoolSession = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const {
      poolDate = new Date(),
      totalTipsCollected,
      fohPercentage = 60,
      bohPercentage = 40,
      customStaffHours,
      notes,
    } = req.body;

    if (!totalTipsCollected || Number(totalTipsCollected) <= 0) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_TIP_AMOUNT',
        message: 'totalTipsCollected must be greater than zero',
      });
      return;
    }

    const totalTips = Number(totalTipsCollected);
    const fohPct = Number(fohPercentage);
    const bohPct = Number(bohPercentage);

    const fohPoolAmount = Math.round((totalTips * (fohPct / 100)) * 100) / 100;
    const bohPoolAmount = Math.round((totalTips * (bohPct / 100)) * 100) / 100;

    let staffList: Array<{
      userId: Types.ObjectId;
      staffName: string;
      department: StaffDepartment;
      hoursWorked: number;
    }> = [];

    if (customStaffHours && Array.isArray(customStaffHours) && customStaffHours.length > 0) {
      staffList = customStaffHours.map((sh: any) => ({
        userId: sh.userId ? new Types.ObjectId(sh.userId) : new Types.ObjectId(),
        staffName: sh.staffName,
        department: sh.department,
        hoursWorked: Number(sh.hoursWorked) || 0,
      }));
    } else {
      // Aggregate hours from attendance logs on poolDate
      const pDate = new Date(poolDate);
      const startOfDay = new Date(pDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(pDate.setHours(23, 59, 59, 999));

      const logs = await StaffAttendanceLog.find({
        hotelId,
        attendanceDate: { $gte: startOfDay, $lte: endOfDay },
      });

      staffList = logs.map((l) => ({
        userId: l.userId,
        staffName: l.staffName,
        department: l.department,
        hoursWorked: l.totalHoursWorked > 0 ? l.totalHoursWorked : 8.0, // default full shift if active
      }));
    }

    if (staffList.length === 0) {
      res.status(400).json({
        success: false,
        errorCode: 'NO_ELIGIBLE_STAFF',
        message: 'No staff hours logged for tip distribution on this date',
      });
      return;
    }

    // Separate into FOH & BOH
    const fohStaff = staffList.filter(
      (s) =>
        s.department === StaffDepartment.FRONT_OF_HOUSE_SERVICE ||
        s.department === StaffDepartment.BAR_BEVERAGE
    );
    const bohStaff = staffList.filter(
      (s) => s.department === StaffDepartment.KITCHEN_CULINARY
    );

    const fohTotalHours = fohStaff.reduce((sum, s) => sum + s.hoursWorked, 0);
    const bohTotalHours = bohStaff.reduce((sum, s) => sum + s.hoursWorked, 0);

    const payouts = staffList.map((s) => {
      const isFoh =
        s.department === StaffDepartment.FRONT_OF_HOUSE_SERVICE ||
        s.department === StaffDepartment.BAR_BEVERAGE;

      let tipShare = 0;
      if (isFoh && fohTotalHours > 0) {
        tipShare = Math.round((fohPoolAmount / fohTotalHours) * s.hoursWorked * 100) / 100;
      } else if (!isFoh && bohTotalHours > 0) {
        tipShare = Math.round((bohPoolAmount / bohTotalHours) * s.hoursWorked * 100) / 100;
      }

      return {
        userId: s.userId,
        staffName: s.staffName,
        department: s.department,
        hoursWorked: s.hoursWorked,
        tipShareAmount: tipShare,
        payoutStatus: 'PENDING_APPROVAL' as const,
      };
    });

    const sessionNumber = `TIP-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

    const tipSession = new TipPoolSession({
      hotelId,
      sessionNumber,
      poolDate: new Date(poolDate),
      totalTipsCollected: totalTips,
      fohPercentage: fohPct,
      bohPercentage: bohPct,
      fohPoolAmount,
      bohPoolAmount,
      payouts,
      totalEligibleHours: fohTotalHours + bohTotalHours,
      status: TipPoolStatus.DRAFT,
      notes,
    });

    await tipSession.save();

    res.status(201).json({
      success: true,
      message: `Tip pool session ${sessionNumber} generated successfully`,
      session: tipSession,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 7. Get Tip Pool Sessions
export const getTipPoolSessions = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const sessions = await TipPoolSession.find({ hotelId })
      .populate('approvedByUserId', 'name role')
      .sort({ poolDate: -1 });

    res.status(200).json({
      success: true,
      sessions,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 8. Approve Tip Pool Payout
export const approveTipPoolPayout = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const sessionId = String(req.params.sessionId);

    const session = await TipPoolSession.findOne({ _id: new Types.ObjectId(sessionId), hotelId });
    if (!session) {
      res.status(404).json({ success: false, errorCode: 'SESSION_NOT_FOUND', message: 'Tip pool session not found' });
      return;
    }

    session.status = TipPoolStatus.APPROVED;
    session.approvedByUserId = req.user?.userId ? new Types.ObjectId(req.user.userId) : undefined;
    session.payouts.forEach((p) => {
      p.payoutStatus = 'APPROVED';
    });

    await session.save();

    res.status(200).json({
      success: true,
      message: `Tip pool ${session.sessionNumber} approved for disbursement`,
      session,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};
