import { Response } from 'express';
import { Types } from 'mongoose';
import { User, IUser } from '../models/User';
import { UserRole, ShiftStatus, TenantRequest } from '../types';
import argon2 from 'argon2';

export interface HotelStaffDTO {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole | string;
  /** Never contains the real PIN after creation. */
  pin: string;
  hasPin?: boolean;
  pinApprovedByAdmin?: boolean;
  pinStatus?: 'NONE' | 'ACTIVE' | 'PENDING_APPROVAL';
  shift: string;
  shiftStatus: ShiftStatus | string;
  assignedSection?: string;
  assignedStation?: string;
  assignedTableStart?: number;
  assignedTableEnd?: number;
  assignedCounter?: string;
  isActive: boolean;
  avatar?: string;
  createdAt?: string;
}

const ASSIGNABLE_STAFF_ROLES: UserRole[] = [
  UserRole.HOTEL_ADMIN,
  UserRole.MANAGER,
  UserRole.CASHIER,
  UserRole.WAITER,
  UserRole.CHEF,
  UserRole.HOUSEKEEPING,
  UserRole.MAINTENANCE,
];

const normalizeStaffRole = (role: unknown): UserRole | null => {
  const upper = String(role || '').toUpperCase();
  if (upper.includes('RECEPTION') || upper.includes('FRONTDESK')) return UserRole.MANAGER;
  if (upper.includes('CASHIER')) return UserRole.CASHIER;
  if (upper.includes('CHEF') || upper.includes('KITCHEN')) return UserRole.CHEF;
  if (upper.includes('HOUSEKEEP')) return UserRole.HOUSEKEEPING;
  if (upper.includes('MAINTENANCE')) return UserRole.MAINTENANCE;
  if (upper.includes('MANAGER')) return UserRole.MANAGER;
  if (upper.includes('ADMIN')) return UserRole.HOTEL_ADMIN;
  if (upper.includes('WAITER')) return UserRole.WAITER;
  return ASSIGNABLE_STAFF_ROLES.includes(upper as UserRole) ? (upper as UserRole) : null;
};

const resolveHotelId = (req: TenantRequest): Types.ObjectId | undefined => {
  if (req.hotelId) return req.hotelId;
  const raw = req.body?.hotelId || req.query?.hotelId;
  return raw && Types.ObjectId.isValid(String(raw)) ? new Types.ObjectId(String(raw)) : undefined;
};

const toDTO = (u: IUser & Record<string, any>, includePin = false, plainPin?: string): HotelStaffDTO => ({
  id: u._id.toString(),
  name: u.name,
  email: u.email,
  phone: u.phone || '+91 98765 00000',
  role: u.role,
  pin: includePin && plainPin ? plainPin : '••••',
  hasPin: Boolean(u.pinCodeHash || u.pendingPinHash),
  pinApprovedByAdmin: u.pinApprovedByAdmin !== false,
  pinStatus: (u.pinStatus || (u.pinCodeHash ? 'ACTIVE' : 'NONE')) as 'NONE' | 'ACTIVE' | 'PENDING_APPROVAL',
  shift: u.shift || 'Morning Shift',
  shiftStatus: u.shiftStatus || ShiftStatus.ON_DUTY,
  assignedSection: u.assignedSection,
  assignedStation: u.assignedStation,
  assignedTableStart: u.assignedTableStart,
  assignedTableEnd: u.assignedTableEnd,
  assignedCounter: u.assignedCounter,
  isActive: u.isActive !== undefined ? u.isActive : true,
  avatar: u.avatar,
  createdAt: u.createdAt ? u.createdAt.toISOString() : new Date().toISOString(),
});

// 1. GET /api/v1/hotel-staff
export const getHotelStaff = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = resolveHotelId(req);
    if (!hotelId) {
      res.status(400).json({
        success: false,
        errorCode: 'HOTEL_ID_REQUIRED',
        message: 'Hotel context is required',
      });
      return;
    }

    const users = await User.find({ hotelId }).sort({ createdAt: -1 });
    const staff = users.map((user) => toDTO(user as IUser & Record<string, any>));

    res.status(200).json({
      success: true,
      data: staff,
      count: staff.length,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 2. POST /api/v1/hotel-staff (Create new staff member)
export const createHotelStaff = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = resolveHotelId(req);
    if (!hotelId) {
      res.status(400).json({
        success: false,
        errorCode: 'HOTEL_ID_REQUIRED',
        message: 'Hotel context is required',
      });
      return;
    }

    const {
      name,
      email,
      phone,
      role,
      pin,
      shift,
      shiftStatus,
      assignedSection,
      assignedStation,
      assignedTableStart,
      assignedTableEnd,
      assignedCounter,
      avatar,
    } = req.body;

    if (!name || !String(name).trim()) {
      res.status(400).json({ success: false, errorCode: 'VALIDATION_ERROR', message: 'Name is required' });
      return;
    }

    const normalizedRole = normalizeStaffRole(role);
    if (!normalizedRole) {
      res.status(400).json({ success: false, errorCode: 'VALIDATION_ERROR', message: 'A valid staff role is required' });
      return;
    }

    if (normalizedRole === UserRole.HOTEL_ADMIN && req.user?.role !== UserRole.HOTEL_ADMIN && req.user?.role !== UserRole.SUPERADMIN) {
      res.status(403).json({ success: false, errorCode: 'FORBIDDEN', message: 'Only a hotel admin can create another admin' });
      return;
    }

    if (!pin || !/^\d{4,6}$/.test(String(pin))) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_PIN',
        message: 'A 4-6 digit access PIN is required for new staff',
      });
      return;
    }

    const staffEmail = String(email || `${String(name).toLowerCase().replace(/[^a-z0-9]/g, '')}.${normalizedRole.toLowerCase()}@spicehub.hotel`).toLowerCase();
    const staffPhone = phone || '+91 98000 00000';
    const staffAvatar = avatar || `https://images.unsplash.com/photo-${1535713875002 + Math.floor(Math.random() * 50)}?w=150&auto=format&fit=crop&q=80`;

    const passwordHash = await argon2.hash(String(pin));
    const pinCodeHash = await argon2.hash(String(pin));

    const newUser = await User.create({
      hotelId,
      name: String(name).trim(),
      email: staffEmail,
      phone: staffPhone,
      passwordHash,
      pinCodeHash,
      role: normalizedRole,
      shiftStatus: shiftStatus || ShiftStatus.ON_DUTY,
      isActive: true,
      avatar: staffAvatar,
      permissions: ['KDS_SCREEN', 'POS_OPERATIONS', 'WAITER_KOT', 'TABLE_MANAGE', 'CHECK_IN_OUT'],
      shift: shift || 'Morning Shift',
      assignedSection,
      assignedStation,
      assignedTableStart: Number(assignedTableStart) || undefined,
      assignedTableEnd: Number(assignedTableEnd) || undefined,
      assignedCounter,
    } as any);

    const createdStaff = toDTO(newUser as IUser & Record<string, any>, true, String(pin));

    res.status(201).json({
      success: true,
      message: `Staff member "${name}" (${normalizedRole}) successfully created!`,
      data: createdStaff,
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      res.status(409).json({
        success: false,
        errorCode: 'STAFF_EMAIL_EXISTS',
        message: 'A staff member with this email already exists for this hotel',
      });
      return;
    }
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 3. PATCH /api/v1/hotel-staff/:id
export const updateHotelStaff = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const hotelId = resolveHotelId(req);

    if (!hotelId) {
      res.status(400).json({ success: false, errorCode: 'HOTEL_ID_REQUIRED', message: 'Hotel context is required' });
      return;
    }
    if (!Types.ObjectId.isValid(String(id))) {
      res.status(400).json({ success: false, errorCode: 'INVALID_STAFF_ID', message: 'Invalid staff id' });
      return;
    }

    const updates: Record<string, unknown> = {};
    const allowedStringFields = [
      'name',
      'email',
      'phone',
      'shift',
      'shiftStatus',
      'assignedSection',
      'assignedStation',
      'assignedCounter',
      'avatar',
    ] as const;

    for (const field of allowedStringFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field] === null ? undefined : String(req.body[field]);
      }
    }

    if (req.body.role !== undefined) {
      const role = normalizeStaffRole(req.body.role);
      if (!role) {
        res.status(400).json({ success: false, errorCode: 'VALIDATION_ERROR', message: 'Invalid staff role' });
        return;
      }
      if (role === UserRole.HOTEL_ADMIN && req.user?.role !== UserRole.HOTEL_ADMIN && req.user?.role !== UserRole.SUPERADMIN) {
        res.status(403).json({ success: false, errorCode: 'FORBIDDEN', message: 'Only a hotel admin can grant admin role' });
        return;
      }
      updates.role = role;
    }

    if (req.body.assignedTableStart !== undefined) {
      updates.assignedTableStart = Number(req.body.assignedTableStart) || undefined;
    }
    if (req.body.assignedTableEnd !== undefined) {
      updates.assignedTableEnd = Number(req.body.assignedTableEnd) || undefined;
    }
    if (req.body.isActive !== undefined) {
      updates.isActive = Boolean(req.body.isActive);
    }

    if (req.body.pin !== undefined) {
      if (!/^\d{4,6}$/.test(String(req.body.pin))) {
        res.status(400).json({ success: false, errorCode: 'INVALID_PIN', message: 'PIN must be 4-6 digits' });
        return;
      }
      updates.pinCodeHash = await argon2.hash(String(req.body.pin));
      updates.passwordHash = await argon2.hash(String(req.body.pin));
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ success: false, errorCode: 'NO_UPDATES', message: 'No updatable fields supplied' });
      return;
    }

    const updated = await User.findOneAndUpdate(
      { _id: new Types.ObjectId(String(id)), hotelId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updated) {
      res.status(404).json({ success: false, errorCode: 'STAFF_NOT_FOUND', message: 'Staff member not found for this hotel' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Staff member updated successfully',
      data: toDTO(updated as IUser & Record<string, any>),
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      res.status(409).json({ success: false, errorCode: 'STAFF_EMAIL_EXISTS', message: 'This email is already used by another staff member' });
      return;
    }
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 4. DELETE /api/v1/hotel-staff/:id (soft deactivate, tenant-scoped)
export const deleteHotelStaff = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const hotelId = resolveHotelId(req);

    if (!hotelId) {
      res.status(400).json({ success: false, errorCode: 'HOTEL_ID_REQUIRED', message: 'Hotel context is required' });
      return;
    }
    if (!Types.ObjectId.isValid(String(id))) {
      res.status(400).json({ success: false, errorCode: 'INVALID_STAFF_ID', message: 'Invalid staff id' });
      return;
    }

    const deleted = await User.findOneAndUpdate(
      { _id: new Types.ObjectId(String(id)), hotelId },
      { $set: { isActive: false } },
      { new: true }
    );

    if (!deleted) {
      res.status(404).json({ success: false, errorCode: 'STAFF_NOT_FOUND', message: 'Staff member not found for this hotel' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Staff member deactivated and removed',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 5. PATCH /api/v1/hotel-staff/:id/approve-pin (Hotel Admin approves or rejects staff PIN request)
export const approveStaffPin = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'APPROVE' | 'REJECT'
    const hotelId = resolveHotelId(req);

    if (!hotelId) {
      res.status(400).json({ success: false, errorCode: 'HOTEL_ID_REQUIRED', message: 'Hotel context is required' });
      return;
    }

    if (!Types.ObjectId.isValid(String(id))) {
      res.status(400).json({ success: false, errorCode: 'INVALID_STAFF_ID', message: 'Invalid staff id' });
      return;
    }

    const staff = await User.findOne({ _id: new Types.ObjectId(String(id)), hotelId }).select('+pendingPinHash');
    if (!staff) {
      res.status(404).json({ success: false, errorCode: 'STAFF_NOT_FOUND', message: 'Staff member not found' });
      return;
    }

    if (action === 'REJECT') {
      staff.pendingPinHash = undefined;
      staff.pinStatus = staff.pinCodeHash ? 'ACTIVE' : 'NONE';
      await staff.save();

      res.status(200).json({
        success: true,
        message: 'Staff PIN request rejected',
        data: toDTO(staff as IUser & Record<string, any>),
      });
      return;
    }

    // Default to APPROVE
    if (!staff.pendingPinHash) {
      res.status(400).json({
        success: false,
        errorCode: 'NO_PENDING_PIN',
        message: 'Staff member does not have a pending PIN request',
      });
      return;
    }

    staff.pinCodeHash = staff.pendingPinHash;
    staff.passwordHash = staff.pendingPinHash;
    staff.pendingPinHash = undefined;
    staff.pinApprovedByAdmin = true;
    staff.pinStatus = 'ACTIVE';
    await staff.save();

    res.status(200).json({
      success: true,
      message: 'Staff 4-digit PIN approved and activated successfully',
      data: toDTO(staff as IUser & Record<string, any>),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

