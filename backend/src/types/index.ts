import { Request } from 'express';
import { Types } from 'mongoose';

export enum UserRole {
  SUPERADMIN = 'SUPERADMIN',
  HOTEL_ADMIN = 'HOTEL_ADMIN',
  MANAGER = 'MANAGER',
  CASHIER = 'CASHIER',
  WAITER = 'WAITER',
  CHEF = 'CHEF',
  HOUSEKEEPING = 'HOUSEKEEPING',
  MAINTENANCE = 'MAINTENANCE',
  GUEST = 'GUEST'
}

export enum ShiftStatus {
  ON_DUTY = 'ON_DUTY',
  BUSY = 'BUSY',
  DO_NOT_ASSIGN = 'DO_NOT_ASSIGN',
  LOCATION_RECHECKING = 'LOCATION_RECHECKING',
  OUT_OF_AREA = 'OUT_OF_AREA',
  OFFLINE = 'OFFLINE'
}

export interface AuthenticatedUserPayload {
  userId: string;
  name?: string;
  hotelId?: string;
  branchId?: string;
  role: UserRole;
  email: string;
  permissions: string[];
}

export interface TenantRequest extends Request {
  user?: AuthenticatedUserPayload;
  hotelId?: Types.ObjectId;
}
