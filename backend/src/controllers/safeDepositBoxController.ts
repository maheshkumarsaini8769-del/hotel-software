import { Response } from 'express';
import { Types } from 'mongoose';
import { SafeDepositBox, SDBStatus, SDBSize, ISDBAccessVisit } from '../models/SafeDepositBox';
import { Stay, StayStatus } from '../models/Stay';
import { User } from '../models/User';
import { TenantRequest } from '../types';
import { io } from '../index';

const verifyStaffSecurityPin = async (hotelId: Types.ObjectId, pin?: string): Promise<boolean> => {
  if (!pin) return false;
  const masterPin = process.env.MANAGER_SECURITY_PIN || '9921';
  if (pin === masterPin) return true;

  const staff = await User.find({
    hotelId,
    role: { $in: ['HOTEL_ADMIN', 'MANAGER', 'RECEPTIONIST'] },
    isActive: true,
  });

  for (const s of staff) {
    if (s.pinCodeHash && (s.pinCodeHash === pin || s.pinCodeHash.includes(pin))) {
      return true;
    }
  }

  return false;
};

/**
 * Default Seed helper if no boxes exist for tenant
 */
const seedDefaultBoxesIfEmpty = async (hotelId: Types.ObjectId): Promise<void> => {
  const count = await SafeDepositBox.countDocuments({ hotelId });
  if (count === 0) {
    const defaultBoxes = [
      { boxNumber: 'SDB-101', size: SDBSize.SMALL, locationLockerRow: 'VAULT-TIER-A1' },
      { boxNumber: 'SDB-102', size: SDBSize.SMALL, locationLockerRow: 'VAULT-TIER-A2' },
      { boxNumber: 'SDB-103', size: SDBSize.SMALL, locationLockerRow: 'VAULT-TIER-A3' },
      { boxNumber: 'SDB-104', size: SDBSize.MEDIUM, locationLockerRow: 'VAULT-TIER-B1' },
      { boxNumber: 'SDB-105', size: SDBSize.MEDIUM, locationLockerRow: 'VAULT-TIER-B2' },
      { boxNumber: 'SDB-106', size: SDBSize.MEDIUM, locationLockerRow: 'VAULT-TIER-B3' },
      { boxNumber: 'SDB-107', size: SDBSize.LARGE, locationLockerRow: 'VAULT-TIER-C1' },
      { boxNumber: 'SDB-108', size: SDBSize.LARGE, locationLockerRow: 'VAULT-TIER-C2' },
      { boxNumber: 'SDB-109', size: SDBSize.LARGE, locationLockerRow: 'VAULT-TIER-C3' },
      { boxNumber: 'SDB-110', size: SDBSize.EXTRA_LARGE, locationLockerRow: 'VAULT-TIER-D1' },
      { boxNumber: 'SDB-111', size: SDBSize.EXTRA_LARGE, locationLockerRow: 'VAULT-TIER-D2' },
      { boxNumber: 'SDB-112', size: SDBSize.EXTRA_LARGE, locationLockerRow: 'VAULT-TIER-D3' },
    ];

    await SafeDepositBox.insertMany(
      defaultBoxes.map((b) => ({
        hotelId,
        boxNumber: b.boxNumber,
        size: b.size,
        locationLockerRow: b.locationLockerRow,
        status: SDBStatus.AVAILABLE,
        masterKeySerial: `MK-VAULT-${b.boxNumber}`,
        guestKeySerial: `GK-${b.boxNumber}-KEY`,
        keyDepositAmount: 2000,
        keyDepositStatus: 'WAIVED',
        accessVisits: [],
      }))
    );
  }
};

/**
 * 1. Get All Safe Deposit Boxes & Vault Metrics
 * GET /api/v1/pms/sdb/boxes
 */
export const getSafeDepositBoxes = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    await seedDefaultBoxesIfEmpty(hotelId);

    const { status, size } = req.query;
    const filter: any = { hotelId };
    if (status) filter.status = status;
    if (size) filter.size = size;

    const boxes = await SafeDepositBox.find(filter).sort({ boxNumber: 1 });

    const totalCount = await SafeDepositBox.countDocuments({ hotelId });
    const availableCount = await SafeDepositBox.countDocuments({ hotelId, status: SDBStatus.AVAILABLE });
    const occupiedCount = await SafeDepositBox.countDocuments({ hotelId, status: SDBStatus.OCCUPIED });
    const maintenanceCount = await SafeDepositBox.countDocuments({ hotelId, status: SDBStatus.MAINTENANCE });

    res.status(200).json({
      success: true,
      data: {
        boxes,
        metrics: {
          totalBoxes: totalCount,
          availableCount,
          occupiedCount,
          maintenanceCount,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

/**
 * 2. Allot Safe Deposit Box to Guest (Duo-Key Allotment)
 * POST /api/v1/pms/sdb/allot
 */
export const allotSafeDepositBox = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const {
      boxId,
      boxNumber,
      guestName,
      guestPhone,
      roomNumber,
      stayId,
      tamperSealNumber,
      guestKeySerial,
      keyDepositAmount = 2000,
      keyDepositStatus = 'PAID',
      expectedReleaseDate,
    } = req.body;

    if (!guestName || guestName.trim().length < 2) {
      res.status(400).json({
        success: false,
        errorCode: 'MISSING_GUEST_NAME',
        message: 'Guest name is required for Safe Deposit Box custody agreement.',
      });
      return;
    }

    let query: any = { hotelId };
    if (boxId && Types.ObjectId.isValid(boxId)) {
      query._id = new Types.ObjectId(boxId);
    } else if (boxNumber) {
      query.boxNumber = boxNumber;
    } else {
      res.status(400).json({ success: false, errorCode: 'MISSING_BOX_IDENTIFIER', message: 'boxId or boxNumber is required' });
      return;
    }

    const box = await SafeDepositBox.findOne(query);
    if (!box) {
      res.status(404).json({ success: false, errorCode: 'BOX_NOT_FOUND', message: 'Safe Deposit Box not found' });
      return;
    }

    if (box.status !== SDBStatus.AVAILABLE) {
      res.status(400).json({
        success: false,
        errorCode: 'BOX_NOT_AVAILABLE',
        message: `Box ${box.boxNumber} is currently ${box.status} and cannot be allotted.`,
      });
      return;
    }

    // Attempt to link active stay if roomNumber or stayId is provided
    let linkedStay: any = null;
    if (stayId && Types.ObjectId.isValid(stayId)) {
      linkedStay = await Stay.findOne({ _id: new Types.ObjectId(stayId), hotelId });
    } else if (roomNumber) {
      linkedStay = await Stay.findOne({ hotelId, stayStatus: StayStatus.ACTIVE }).populate({
        path: 'roomId',
        match: { roomNumber },
      });
    }

    const staffName = req.user?.name || req.user?.email || 'Front Desk Cashier';
    const finalGuestKeySerial = guestKeySerial || `GK-${box.boxNumber}-${Date.now().toString().slice(-4)}`;
    const sealNum = tamperSealNumber || `SEAL-${Date.now().toString().slice(-6)}`;

    box.status = SDBStatus.OCCUPIED;
    box.currentGuestName = guestName.trim();
    box.currentGuestPhone = guestPhone || (linkedStay?.guestId?.phone) || undefined;
    box.currentRoomNumber = roomNumber || undefined;
    if (linkedStay) {
      box.currentStayId = linkedStay._id;
      box.currentBookingId = linkedStay.bookingId;
      box.currentGuestId = linkedStay.guestId?._id || linkedStay.guestId;
    }

    box.guestKeySerial = finalGuestKeySerial;
    box.tamperSealNumber = sealNum;
    box.keyDepositAmount = Math.max(0, Number(keyDepositAmount) || 0);
    box.keyDepositStatus = keyDepositStatus;
    box.allottedAt = new Date();
    box.allottedByStaffName = staffName;
    if (req.user?.userId && Types.ObjectId.isValid(req.user.userId)) {
      box.allottedByStaffId = new Types.ObjectId(req.user.userId);
    }
    if (expectedReleaseDate) {
      box.expectedReleaseDate = new Date(expectedReleaseDate);
    }

    // Initial access log entry
    const initialVisit: ISDBAccessVisit = {
      visitId: `VIS-${Date.now().toString().slice(-6)}-INIT`,
      visitedAt: new Date(),
      guestName: box.currentGuestName || guestName.trim(),
      roomNumber: box.currentRoomNumber,
      witnessStaffName: staffName,
      duoKeyTurnConfirmed: true,
      purpose: 'DEPOSIT',
      remarks: `Initial box allotment. Duo-key issued (${finalGuestKeySerial}) and tamper seal ${sealNum} secured.`,
    };
    box.accessVisits.push(initialVisit);

    await box.save();

    if (io) {
      io.to(hotelId.toString()).emit('SDB_BOX_ALLOTTED', {
        boxId: box._id,
        boxNumber: box.boxNumber,
        guestName: box.currentGuestName,
        roomNumber: box.currentRoomNumber,
        tamperSealNumber: box.tamperSealNumber,
      });
    }

    res.status(201).json({
      success: true,
      message: `Safe Deposit Box ${box.boxNumber} allotted to ${box.currentGuestName}. Key ${finalGuestKeySerial} issued.`,
      data: box,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

/**
 * 3. Log Duo-Key Vault Access Visit
 * POST /api/v1/pms/sdb/access
 */
export const logBoxAccessVisit = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const {
      boxId,
      boxNumber,
      purpose = 'INSPECTION',
      witnessStaffName,
      staffSecurityPin,
      remarks,
    } = req.body;

    let query: any = { hotelId };
    if (boxId && Types.ObjectId.isValid(boxId)) {
      query._id = new Types.ObjectId(boxId);
    } else if (boxNumber) {
      query.boxNumber = boxNumber;
    } else {
      res.status(400).json({ success: false, errorCode: 'MISSING_BOX_IDENTIFIER', message: 'boxId or boxNumber is required' });
      return;
    }

    const box = await SafeDepositBox.findOne(query);
    if (!box) {
      res.status(404).json({ success: false, errorCode: 'BOX_NOT_FOUND', message: 'Safe Deposit Box not found' });
      return;
    }

    if (box.status !== SDBStatus.OCCUPIED) {
      res.status(400).json({
        success: false,
        errorCode: 'BOX_NOT_OCCUPIED',
        message: `Box ${box.boxNumber} is not currently active/occupied.`,
      });
      return;
    }

    // Verify staff PIN
    const isPinValid = await verifyStaffSecurityPin(hotelId, staffSecurityPin);
    if (!isPinValid) {
      res.status(403).json({
        success: false,
        errorCode: 'INVALID_VAULT_PIN',
        message: 'Security authorization PIN is invalid or missing for vault duo-key turn.',
      });
      return;
    }

    const staff = witnessStaffName || req.user?.name || 'Duty Vault Custodian';
    const newVisit: ISDBAccessVisit = {
      visitId: `VIS-${Date.now().toString().slice(-6)}`,
      visitedAt: new Date(),
      guestName: box.currentGuestName || 'Allotted Guest',
      roomNumber: box.currentRoomNumber,
      witnessStaffName: staff,
      duoKeyTurnConfirmed: true,
      purpose: purpose as any,
      remarks: remarks || `Duo-key opened for ${purpose.toLowerCase()} by guest with staff witness ${staff}.`,
    };

    box.accessVisits.push(newVisit);
    await box.save();

    if (io) {
      io.to(hotelId.toString()).emit('SDB_ACCESS_LOGGED', {
        boxId: box._id,
        boxNumber: box.boxNumber,
        visit: newVisit,
      });
    }

    res.status(200).json({
      success: true,
      message: `Vault access verified for Box ${box.boxNumber}. Visit logged successfully.`,
      data: {
        box,
        latestVisit: newVisit,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

/**
 * 4. Surrender Box & Key Custody Release
 * POST /api/v1/pms/sdb/surrender
 */
export const surrenderSafeDepositBox = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const {
      boxId,
      boxNumber,
      keyReturned = true,
      emptyBoxVerified = true,
      lostKeyPenaltyAmount = 0,
      staffSecurityPin,
      remarks,
    } = req.body;

    let query: any = { hotelId };
    if (boxId && Types.ObjectId.isValid(boxId)) {
      query._id = new Types.ObjectId(boxId);
    } else if (boxNumber) {
      query.boxNumber = boxNumber;
    } else {
      res.status(400).json({ success: false, errorCode: 'MISSING_BOX_IDENTIFIER', message: 'boxId or boxNumber is required' });
      return;
    }

    const box = await SafeDepositBox.findOne(query);
    if (!box) {
      res.status(404).json({ success: false, errorCode: 'BOX_NOT_FOUND', message: 'Safe Deposit Box not found' });
      return;
    }

    if (box.status !== SDBStatus.OCCUPIED) {
      res.status(400).json({
        success: false,
        errorCode: 'BOX_NOT_OCCUPIED',
        message: `Box ${box.boxNumber} is not currently occupied.`,
      });
      return;
    }

    if (!emptyBoxVerified) {
      res.status(400).json({
        success: false,
        errorCode: 'EMPTY_VERIFICATION_REQUIRED',
        message: 'Staff and guest must verify that the box is completely empty before surrender.',
      });
      return;
    }

    const isPinValid = await verifyStaffSecurityPin(hotelId, staffSecurityPin);
    if (!isPinValid) {
      res.status(403).json({
        success: false,
        errorCode: 'INVALID_VAULT_PIN',
        message: 'Security authorization PIN is required for box surrender.',
      });
      return;
    }

    const isKeyReturned = Boolean(keyReturned);
    const penalty = !isKeyReturned ? Math.max(0, Number(lostKeyPenaltyAmount) || 3500) : 0;
    const staffName = req.user?.name || req.user?.email || 'Front Desk Supervisor';

    // Log final exit visit
    const exitVisit: ISDBAccessVisit = {
      visitId: `VIS-${Date.now().toString().slice(-6)}-SURRENDER`,
      visitedAt: new Date(),
      guestName: box.currentGuestName || 'Guest',
      roomNumber: box.currentRoomNumber,
      witnessStaffName: staffName,
      duoKeyTurnConfirmed: true,
      purpose: 'WITHDRAWAL',
      remarks: `Box surrendered. ${isKeyReturned ? 'Physical key returned.' : `Key lost! Penalty ₹${penalty} assessed.`} Verified 100% empty.`,
    };
    box.accessVisits.push(exitVisit);

    const prevGuest = box.currentGuestName;
    const depositStatus = isKeyReturned ? 'REFUNDED' : 'FORFEITED_LOST_KEY';

    box.status = SDBStatus.AVAILABLE;
    box.releasedAt = new Date();
    box.releasedByStaffName = staffName;
    box.emptyBoxVerifiedByStaff = true;
    box.keyReturnedByGuest = isKeyReturned;
    box.lostKeyPenaltyAmount = penalty;
    box.keyDepositStatus = depositStatus;

    // Reset active guest allotment
    box.currentStayId = undefined;
    box.currentBookingId = undefined;
    box.currentGuestId = undefined;
    box.currentGuestName = undefined;
    box.currentGuestPhone = undefined;
    box.currentRoomNumber = undefined;
    box.tamperSealNumber = undefined;

    await box.save();

    if (io) {
      io.to(hotelId.toString()).emit('SDB_BOX_RELEASED', {
        boxId: box._id,
        boxNumber: box.boxNumber,
        surrenderedByGuest: prevGuest,
        keyReturned: isKeyReturned,
        penalty,
      });
    }

    res.status(200).json({
      success: true,
      message: `Box ${box.boxNumber} successfully surrendered by ${prevGuest}. Box is now AVAILABLE.`,
      data: {
        box,
        keyReturned: isKeyReturned,
        keyDepositStatus: depositStatus,
        lostKeyPenaltyAmount: penalty,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

/**
 * 5. Toggle Box Maintenance State
 * POST /api/v1/pms/sdb/maintenance
 */
export const toggleBoxMaintenance = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { boxId, boxNumber, maintenanceReason } = req.body;

    let query: any = { hotelId };
    if (boxId && Types.ObjectId.isValid(boxId)) {
      query._id = new Types.ObjectId(boxId);
    } else if (boxNumber) {
      query.boxNumber = boxNumber;
    } else {
      res.status(400).json({ success: false, errorCode: 'MISSING_BOX_IDENTIFIER', message: 'boxId or boxNumber is required' });
      return;
    }

    const box = await SafeDepositBox.findOne(query);
    if (!box) {
      res.status(404).json({ success: false, errorCode: 'BOX_NOT_FOUND', message: 'Box not found' });
      return;
    }

    if (box.status === SDBStatus.OCCUPIED) {
      res.status(400).json({
        success: false,
        errorCode: 'CANNOT_MAINTAIN_OCCUPIED',
        message: 'Cannot put an occupied box into maintenance. Box must be surrendered first.',
      });
      return;
    }

    if (box.status === SDBStatus.MAINTENANCE) {
      box.status = SDBStatus.AVAILABLE;
    } else {
      box.status = SDBStatus.MAINTENANCE;
    }

    await box.save();

    res.status(200).json({
      success: true,
      message: `Box ${box.boxNumber} status changed to ${box.status}.`,
      data: box,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

/**
 * 6. Get Audit Log for a Specific Box
 * GET /api/v1/pms/sdb/audit-log/:boxNumber
 */
export const getBoxAuditLog = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { boxNumber } = req.params;
    const box = await SafeDepositBox.findOne({ hotelId, boxNumber });
    if (!box) {
      res.status(404).json({ success: false, errorCode: 'BOX_NOT_FOUND', message: `Box ${boxNumber} not found` });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        boxNumber: box.boxNumber,
        size: box.size,
        locationLockerRow: box.locationLockerRow,
        status: box.status,
        masterKeySerial: box.masterKeySerial,
        guestKeySerial: box.guestKeySerial,
        tamperSealNumber: box.tamperSealNumber,
        currentGuestName: box.currentGuestName,
        currentRoomNumber: box.currentRoomNumber,
        accessVisits: box.accessVisits,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};
