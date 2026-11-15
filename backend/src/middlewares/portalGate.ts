import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AuthenticatedUserPayload, TenantRequest, UserRole } from '../types';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { resolveTenantCapabilities } from '../utils/tenantCapabilities';
import { GuestSession } from '../models/GuestSession';
import { Booking } from '../models/Booking';
import { Stay, StayStatus } from '../models/Stay';
import { getJwtSecret, isDevAuthBypassEnabled } from '../config/security';
import { PortalKey } from '../types/sharedTypes';

const GUEST_SESSION_PURPOSE = 'GUEST_SESSION';

// Customer / guest portals intentionally support anonymous tenant context for
// public flows (menu browsing, table QR entry, booking status lookups). Staff
// workstations must never treat an x-hotel-id header as authentication.
const STAFF_PORTALS: PortalKey[] = ['admin', 'cashier', 'reception', 'kds', 'waiter'];
const isStaffOnlyPortalRequest = (portalKeys: PortalKey[]): boolean =>
  portalKeys.every((key) => STAFF_PORTALS.includes(key));
const headerTenantContextAllowed = (): boolean =>
  process.env.NODE_ENV === 'test' || isDevAuthBypassEnabled();

// Hotel owners/managers are cross-functional and must be able to operate every
// workstation of their own property (front desk, cashier, KDS, waiter, admin).
// Frontline roles stay restricted to their own portal so a waiter still cannot
// open the cashier or settle payments.
const PROPERTY_OVERSIGHT_ROLES = [UserRole.GROUP_ADMIN, UserRole.HOTEL_ADMIN, UserRole.MANAGER];

const STAFF_ROLES_BY_PORTAL: Record<PortalKey, UserRole[]> = {
  admin: [...PROPERTY_OVERSIGHT_ROLES],
  cashier: [UserRole.CASHIER, ...PROPERTY_OVERSIGHT_ROLES],
  reception: [UserRole.RECEPTIONIST, UserRole.HOUSEKEEPING, UserRole.MAINTENANCE, ...PROPERTY_OVERSIGHT_ROLES],
  kds: [UserRole.CHEF, ...PROPERTY_OVERSIGHT_ROLES],
  waiter: [UserRole.WAITER, ...PROPERTY_OVERSIGHT_ROLES],
  customer: [UserRole.GUEST],
  guest: [UserRole.GUEST, UserRole.RECEPTIONIST, ...PROPERTY_OVERSIGHT_ROLES],
};

async function enforceBearerPortalRole(
  req: TenantRequest,
  res: Response,
  portalKeys: PortalKey[]
): Promise<boolean> {
  const authorization = req.headers.authorization;
  const roleFromRequest = req.user?.role;
  if (!authorization && !roleFromRequest) return true;

  let role = roleFromRequest;
  if (authorization) {
    if (!authorization.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        errorCode: 'UNAUTHORIZED',
        message: 'A valid staff session is required.',
      });
      return false;
    }

    let decoded: AuthenticatedUserPayload;
    try {
      decoded = jwt.verify(
        authorization.slice('Bearer '.length),
        getJwtSecret()
      ) as AuthenticatedUserPayload;
    } catch {
      res.status(401).json({
        success: false,
        errorCode: 'INVALID_TOKEN',
        message: 'Token expired or signature invalid.',
      });
      return false;
    }

    role = decoded.role;
    if (role !== UserRole.GUEST && role !== UserRole.SUPERADMIN) {
      // Accept legacy tokens that used `id` as the subject claim.
      const subjectId = decoded.userId || (decoded as AuthenticatedUserPayload & { id?: string }).id;
      if (!subjectId || !Types.ObjectId.isValid(subjectId)) {
        res.status(401).json({
          success: false,
          errorCode: 'INVALID_TOKEN',
          message: 'The staff session is invalid. Please sign in again.',
        });
        return false;
      }
      decoded.userId = subjectId;

      let account: {
        hotelId?: Types.ObjectId | string;
        role?: UserRole;
        isActive?: boolean;
        name?: string;
        email?: string;
        permissions?: string[];
      } | null;
      try {
        account = await User.findById(decoded.userId)
          .select('hotelId role name email permissions isActive')
          .lean();
      } catch {
        res.status(503).json({
          success: false,
          errorCode: 'AUTH_UNAVAILABLE',
          message: 'Staff access could not be verified. Please retry.',
        });
        return false;
      }

      // Automated test fixtures often mint signed tokens for synthetic staff
      // IDs. Allow those only in the isolated test environment; a deactivated
      // real account is still rejected because the document exists.
      const syntheticTestIdentity = !account && process.env.NODE_ENV === 'test';
      if (
        !syntheticTestIdentity &&
        (!account ||
          account.isActive === false ||
          account.role !== role ||
          String(account.hotelId || '') !== String(decoded.hotelId || ''))
      ) {
        res.status(401).json({
          success: false,
          errorCode: 'SESSION_REVOKED',
          message: 'This staff account is inactive or its access has changed. Please sign in again.',
        });
        return false;
      }

      if (account) {
        decoded.name = account.name;
        decoded.email = account.email || '';
        decoded.permissions = account.permissions || [];
      }
    }

    req.user = decoded;
  }

  if (role === UserRole.SUPERADMIN) return true;

  if (role !== UserRole.GUEST && req.user?.hotelId) {
    const requestHotelIds = [
      req.headers['x-hotel-id'],
      req.query?.hotelId,
      req.body?.hotelId,
    ]
      .flat()
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim());
    if (requestHotelIds.some((hotelId) => hotelId !== String(req.user?.hotelId))) {
      res.status(403).json({
        success: false,
        errorCode: 'TENANT_MISMATCH',
        message: 'Your staff session cannot access another hotel.',
      });
      return false;
    }
  }

  const allowedRoles = portalKeys.flatMap((portal) => STAFF_ROLES_BY_PORTAL[portal]);
  if (!role || !allowedRoles.includes(role)) {
    res.status(403).json({
      success: false,
      errorCode: 'STAFF_ROLE_FORBIDDEN',
      message: `Your staff role cannot access the ${portalKeys.join(' or ')} portal.`,
    });
    return false;
  }

  return true;
}

/**
 * Reads a caller-supplied tenant hint. This is only ever used as a context
 * selector for public guest/customer flows, never as authentication for staff
 * workstations.
 */
function requestedHotelId(req: any): string | null {
  const candidates = [
    req.headers?.['x-hotel-id'],
    req.query?.hotelId,
    req.body?.hotelId,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  return null;
}

function guestSessionTokenFromRequest(req: any): string | null {
  const candidates = [
    req.headers?.['x-guest-session-token'],
    req.query?.guestToken,
    req.query?.sessionToken,
    req.query?.token,
    req.body?.guestToken,
    req.body?.sessionToken,
    req.body?.token,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  return null;
}

/**
 * Resolves a guest identity from either an opaque GuestSession token (stored as
 * a SHA-256 hash) or a cryptographically signed guest JWT. Unverified JWT
 * payloads are intentionally rejected.
 */
async function resolveGuestIdentity(req: any): Promise<{
  hotelId: string;
  session?: any;
  stay?: any;
} | null> {
  const rawToken = guestSessionTokenFromRequest(req);
  if (!rawToken) return null;

  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const session = await GuestSession.findOne({
    sessionTokenHash: tokenHash,
    isActive: true,
    expiresAt: { $gt: new Date() },
  });

  if (session?.hotelId && session?.stayId) {
    const stay = await Stay.findOne({
      _id: session.stayId,
      hotelId: session.hotelId,
      stayStatus: { $in: [StayStatus.ACTIVE, StayStatus.EXTENDED] },
    }).select('_id hotelId roomId guestId stayStatus');
    if (!stay) return null;
    return { hotelId: String(session.hotelId), session, stay };
  }

  try {
    const decoded: any = jwt.verify(rawToken, getJwtSecret());
    if (
      decoded?.purpose !== GUEST_SESSION_PURPOSE ||
      !decoded?.hotelId ||
      !decoded?.stayId ||
      !Types.ObjectId.isValid(String(decoded.hotelId)) ||
      !Types.ObjectId.isValid(String(decoded.stayId))
    ) {
      return null;
    }

    const stay = await Stay.findOne({
      _id: new Types.ObjectId(String(decoded.stayId)),
      hotelId: new Types.ObjectId(String(decoded.hotelId)),
      stayStatus: { $in: [StayStatus.ACTIVE, StayStatus.EXTENDED] },
    }).select('_id hotelId roomId guestId stayStatus');
    if (!stay) return null;

    return { hotelId: String(decoded.hotelId), stay };
  } catch {
    return null;
  }
}

/**
 * Resolves the tenant for a portal request. Staff portals require a verified
 * staff identity; guest/customer portals additionally accept guest sessions and
 * (for public flows) an explicit tenant hint.
 */
async function resolvePortalHotelId(
  req: TenantRequest,
  res: Response,
  portalKeys: PortalKey[]
): Promise<string | null> {
  const staffOnly = isStaffOnlyPortalRequest(portalKeys);

  if (req.user?.hotelId) {
    const authenticatedHotelId = String(req.user.hotelId);
    const hint = requestedHotelId(req);
    if (req.user.role !== UserRole.SUPERADMIN && hint && hint !== authenticatedHotelId) {
      res.status(403).json({
        success: false,
        errorCode: 'TENANT_MISMATCH',
        message: 'Your session cannot access another hotel.',
      });
      return null;
    }
    return authenticatedHotelId;
  }

  if ((req as any).tenant?._id) {
    return String((req as any).tenant._id);
  }

  const guestIdentity = await resolveGuestIdentity(req);
  if (guestIdentity) {
    if (staffOnly) {
      res.status(403).json({
        success: false,
        errorCode: 'STAFF_ROLE_FORBIDDEN',
        message: 'A guest session cannot access a staff workstation.',
      });
      return null;
    }

    const hint = requestedHotelId(req);
    if (hint && hint !== guestIdentity.hotelId) {
      res.status(403).json({
        success: false,
        errorCode: 'TENANT_MISMATCH',
        message: 'Your guest session cannot access another hotel.',
      });
      return null;
    }

    (req as any).guestSession = guestIdentity.session;
    (req as any).guestStay = guestIdentity.stay;
    return guestIdentity.hotelId;
  }

  const hint = requestedHotelId(req);
  const anonymousContextAllowed = !staffOnly || headerTenantContextAllowed();
  if (hint && Types.ObjectId.isValid(hint) && anonymousContextAllowed) {
    return hint;
  }

  // Public booking-status endpoints are keyed by the booking number. Resolve
  // the tenant from that booking, but never for a staff-only workstation.
  if (!staffOnly) {
    const bookingNum =
      req.params?.bookingNumber ||
      req.query?.bookingNumber ||
      req.body?.bookingNumber ||
      (typeof req.originalUrl === 'string'
        ? req.originalUrl.match(/\/booking-status\/([A-Za-z0-9_-]+)/)?.[1]
        : null);
    if (typeof bookingNum === 'string' && bookingNum.trim()) {
      const booking = await Booking.findOne({ bookingNumber: bookingNum.trim() }).select('hotelId');
      if (booking?.hotelId) return String(booking.hotelId);
    }
  }

  res.status(401).json({
    success: false,
    errorCode: 'UNAUTHORIZED',
    message: staffOnly
      ? 'A valid staff session is required to access this workstation.'
      : 'A valid staff or guest session is required to access this portal.',
  });
  return null;
}

/**
 * Express middleware to strictly enforce modular portal subscription.
 * Direct REST / curl bypass is rejected with HTTP 403 PORTAL_NOT_SUBSCRIBED.
 *
 * @param portalKey The operational workstation key to enforce:
 *   'admin' | 'cashier' | 'reception' | 'kds' | 'waiter' | 'customer' | 'guest'
 */
export const requirePortal = (portalKey: PortalKey) => {
  return async (req: TenantRequest, res: Response, next: NextFunction): Promise<void> => {
    // 1. Bypass for CORS pre-flight requests
    if (req.method === 'OPTIONS') {
      return next();
    }

    if (!(await enforceBearerPortalRole(req, res, [portalKey]))) return;

    // 2. Platform-wide SuperAdmin bypass for cross-tenant operations
    if (req.user?.role === UserRole.SUPERADMIN) {
      return next();
    }

    try {
      // 3. Resolve a verified tenant context (staff JWT, guest session, or a
      // public guest/customer tenant hint). Never trust x-hotel-id for staff.
      let tenant = (req as any).tenant;

      if (!tenant) {
        const hotelIdStr = await resolvePortalHotelId(req, res, [portalKey]);
        if (!hotelIdStr) return;

        tenant = await Tenant.findById(new Types.ObjectId(hotelIdStr));
        if (!tenant) {
          res.status(404).json({
            success: false,
            errorCode: 'TENANT_NOT_FOUND',
            message: 'Target hotel property tenant could not be found.',
          });
          return;
        }

        // Cache tenant & hotelId onto request
        (req as any).tenant = tenant;
        req.hotelId = tenant._id;
      }

      // 4. Emergency Tenant Suspension Check
      if (tenant.status === 'SUSPENDED') {
        res.status(403).json({
          success: false,
          errorCode: 'TENANT_SUSPENDED',
          message: 'This hotel tenant has been suspended by the platform administrator. Access blocked.',
        });
        return;
      }

      // 5. Check enabledPortals subscription allocation (Single Source of Truth)
      const portals: string[] = Array.isArray(tenant.enabledPortals) ? tenant.enabledPortals : [];

      let isAllowed =
        portals.includes(portalKey) ||
        (portalKey === 'guest' && portals.includes('customer')) ||
        (portalKey === 'customer' && portals.includes('guest'));

      // Backwards-compatibility fallback: if enabledPortals is not initialized, check featureFlags
      if (portals.length === 0 && tenant.featureFlags) {
        switch (portalKey) {
          case 'reception':
            isAllowed = tenant.featureFlags.pmsEnabled !== false;
            break;
          case 'cashier':
            isAllowed = tenant.featureFlags.posEnabled !== false;
            break;
          case 'kds':
            isAllowed = tenant.featureFlags.kdsEnabled !== false;
            break;
          case 'waiter':
            isAllowed = tenant.featureFlags.waiterEnabled !== false;
            break;
          case 'customer':
            isAllowed = tenant.featureFlags.qrDineInEnabled !== false;
            break;
          case 'guest':
            isAllowed = tenant.featureFlags.roomServiceEnabled !== false;
            break;
          case 'admin':
            isAllowed = true;
            break;
        }
      }

      if (!isAllowed) {
        res.status(403).json({
          success: false,
          errorCode: 'PORTAL_NOT_SUBSCRIBED',
          portal: portalKey,
          message: `The '${portalKey}' portal workstation is not included in this property's subscription. Please contact your Super Administrator to activate this module.`,
        });
        return;
      }

      const capabilities = resolveTenantCapabilities(tenant);
      const serviceEnabled =
        portalKey === 'reception'
          ? capabilities.reception
          : portalKey === 'guest'
            ? capabilities.roomBooking || capabilities.inRoomServices
            : portalKey === 'customer'
              ? capabilities.tableOrdering
              : portalKey === 'waiter'
                ? capabilities.waiterDispatch
                  : portalKey === 'kds'
                    ? capabilities.tableOrdering || capabilities.inRoomServices
                  : true;

      if (!serviceEnabled) {
        res.status(403).json({
          success: false,
          errorCode: 'HOTEL_SERVICE_DISABLED',
          portal: portalKey,
          message: `This hotel has disabled the service provided by the '${portalKey}' portal.`,
        });
        return;
      }

      next();
    } catch (error: any) {
      res.status(500).json({
        success: false,
        errorCode: 'INTERNAL_ERROR',
        message: error.message || 'Error verifying portal subscription permissions',
      });
    }
  };
};

/**
 * Gate middleware that requires at least one of the specified portals to be enabled.
 */
export const requireAnyPortal = (portalKeys: PortalKey[]) => {
  return async (req: TenantRequest, res: Response, next: NextFunction): Promise<void> => {
    if (req.method === 'OPTIONS') {
      return next();
    }

    if (!(await enforceBearerPortalRole(req, res, portalKeys))) return;
    if (req.user?.role === UserRole.SUPERADMIN) return next();

    try {
      let tenant = (req as any).tenant;
      if (!tenant) {
        const hotelIdStr = await resolvePortalHotelId(req, res, portalKeys);
        if (!hotelIdStr) return;

        tenant = await Tenant.findById(new Types.ObjectId(hotelIdStr));
        if (!tenant) {
          res.status(404).json({
            success: false,
            errorCode: 'TENANT_NOT_FOUND',
            message: 'Target hotel property tenant could not be found.',
          });
          return;
        }

        (req as any).tenant = tenant;
        req.hotelId = tenant._id;
      }

      if (tenant.status === 'SUSPENDED') {
        res.status(403).json({
          success: false,
          errorCode: 'TENANT_SUSPENDED',
          message: 'This hotel tenant has been suspended by the platform administrator. Access blocked.',
        });
        return;
      }

      const portals: string[] = Array.isArray(tenant.enabledPortals) ? tenant.enabledPortals : [];
      const isAllowed = portalKeys.some((k) => portals.includes(k));

      if (!isAllowed) {
        res.status(403).json({
          success: false,
          errorCode: 'PORTAL_NOT_SUBSCRIBED',
          message: `Access requires one of the following subscribed portals: [${portalKeys.join(', ')}].`,
        });
        return;
      }

      next();
    } catch (error: any) {
      res.status(500).json({
        success: false,
        errorCode: 'INTERNAL_ERROR',
        message: error.message || 'Error verifying portal subscription permissions',
      });
    }
  };
};
