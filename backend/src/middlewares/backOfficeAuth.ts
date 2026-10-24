import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { authenticateJWT, requireTenant } from './auth';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { TenantRequest, UserRole } from '../types';
import { isDevAuthBypassEnabled } from '../config/security';

/**
 * Back-office terminal guard for internal admin/staff APIs.
 *
 * - Production: a valid staff JWT + tenant is mandatory.
 * - Test: dev-style tenant resolution keeps the integration suite usable.
 * - Development: only when DEV_AUTH_BYPASS=true.
 */
export const authenticateBackOffice = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authenticateJWT(req, res, () => requireTenant(req, res, next));
  }

  if (!isDevAuthBypassEnabled() && process.env.NODE_ENV !== 'test') {
    return authenticateJWT(req, res, () => requireTenant(req, res, next));
  }

  try {
    const headerHotelId = req.headers['x-hotel-id'];
    const candidateHotelIds = [
      headerHotelId,
      req.query?.hotelId,
      req.body?.hotelId,
    ]
      .flat()
      .filter(Boolean)
      .map((value) => String(value))
      .filter((value) => Types.ObjectId.isValid(value));

    let tenant = candidateHotelIds.length > 0
      ? await Tenant.findById(candidateHotelIds[0])
      : null;

    if (!tenant) {
      tenant = (await Tenant.findOne({ slug: 'taj-gateway' })) || (await Tenant.findOne());
    }

    if (!tenant) {
      res.status(503).json({
        success: false,
        errorCode: 'TENANT_NOT_SEEDED',
        message: 'No tenant available for local terminal bypass. Seed the database first.',
      });
      return;
    }

    req.hotelId = tenant._id as Types.ObjectId;

    const staffUser =
      (await User.findOne({ hotelId: tenant._id, role: UserRole.HOTEL_ADMIN, isActive: true })) ||
      (await User.findOne({ hotelId: tenant._id, isActive: true }));

    req.user = staffUser
      ? {
          userId: staffUser._id.toString(),
          name: staffUser.name,
          email: staffUser.email,
          role: staffUser.role,
          hotelId: tenant._id.toString(),
          permissions: staffUser.permissions || [],
        }
      : {
          userId: 'local-dev-bypass',
          name: 'Local Dev Admin',
          email: 'dev@localhost',
          role: UserRole.HOTEL_ADMIN,
          hotelId: tenant._id.toString(),
          permissions: ['*'],
        };

    next();
  } catch (error: any) {
    res.status(500).json({
      success: false,
      errorCode: 'AUTH_CONTEXT_ERROR',
      message: error.message,
    });
  }
};
