import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { TenantRequest, UserRole } from '../types';
import { Tenant } from '../models/Tenant';
import { GuestSession } from '../models/GuestSession';
import { Booking } from '../models/Booking';
import { getJwtSecret } from '../config/security';
import { PortalKey } from '../types/sharedTypes';

/**
 * Extracts hotelId / tenant identity from any supported request context:
 * 1. Pre-populated (req as any).tenant or req.hotelId
 * 2. Authenticated user payload (req.user.hotelId)
 * 3. Bearer Authorization JWT header
 * 4. Custom x-hotel-id header
 * 5. Query parameters (?hotelId=...)
 * 6. Body payload (req.body.hotelId)
 */
function extractHotelId(req: any): string | null {
  if (req.tenant?._id) return String(req.tenant._id);
  if (req.hotelId) return String(req.hotelId);
  if (req.user?.hotelId) return String(req.user.hotelId);

  const authHeader = req.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded: any = jwt.verify(token, getJwtSecret());
      if (decoded?.hotelId) return String(decoded.hotelId);
    } catch {
      // Invalid or expired token; will be handled by authenticateJWT if required
    }
  }

  const headerHotelId = req.headers?.['x-hotel-id'];
  if (headerHotelId && typeof headerHotelId === 'string') return headerHotelId.trim();

  // 4b. Extract hotelId from guest resident session token JWT
  const guestSessionToken =
    req.headers?.['x-guest-session-token'] ||
    req.query?.guestToken ||
    req.query?.sessionToken ||
    req.query?.token ||
    req.body?.guestToken ||
    req.body?.sessionToken ||
    req.body?.token;
  if (guestSessionToken && typeof guestSessionToken === 'string') {
    try {
      const decoded: any = jwt.verify(guestSessionToken.trim(), getJwtSecret());
      if (decoded?.hotelId) return String(decoded.hotelId);
    } catch {
      try {
        const decoded: any = jwt.decode(guestSessionToken.trim());
        if (decoded?.hotelId) return String(decoded.hotelId);
      } catch {}
    }
  }

  const queryHotelId = req.query?.hotelId;
  if (queryHotelId && typeof queryHotelId === 'string') return queryHotelId.trim();

  const bodyHotelId = req.body?.hotelId;
  if (bodyHotelId && typeof bodyHotelId === 'string') return bodyHotelId.trim();

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

    // 2. Platform-wide SuperAdmin bypass for cross-tenant operations
    if (req.user?.role === UserRole.SUPERADMIN) {
      return next();
    }

    try {
      // 3. Check if full tenant document is already attached to request
      let tenant = (req as any).tenant;

      if (!tenant) {
        let hotelIdStr = extractHotelId(req);

        // Fallback for opaque guest session tokens stored in GuestSession
        if (!hotelIdStr) {
          const rawToken =
            req.headers?.['x-guest-session-token'] ||
            req.query?.guestToken ||
            req.query?.sessionToken ||
            req.query?.token ||
            req.body?.guestToken ||
            req.body?.sessionToken ||
            req.body?.token;
          if (rawToken && typeof rawToken === 'string') {
            try {
              const tokenHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
              const session = await GuestSession.findOne({ sessionTokenHash: tokenHash });
              if (session?.hotelId) {
                hotelIdStr = String(session.hotelId);
              }
            } catch {}
          }
        }

        // Fallback for public booking reservation queries (e.g. /rooms/booking-status/:bookingNumber)
        if (!hotelIdStr) {
          const bookingNum =
            req.params?.bookingNumber ||
            req.query?.bookingNumber ||
            req.body?.bookingNumber ||
            (typeof req.originalUrl === 'string'
              ? req.originalUrl.match(/\/booking-status\/([A-Za-z0-9_-]+)/)?.[1]
              : null);
          if (bookingNum && typeof bookingNum === 'string') {
            try {
              const bDoc = await Booking.findOne({ bookingNumber: String(bookingNum).trim() }).select('hotelId');
              if (bDoc?.hotelId) {
                hotelIdStr = String(bDoc.hotelId);
              }
            } catch {}
          }
        }

        if (!hotelIdStr || !Types.ObjectId.isValid(hotelIdStr)) {
          res.status(403).json({
            success: false,
            errorCode: 'TENANT_REQUIRED',
            message: `Tenant identification (hotelId or Bearer token) is required to access the '${portalKey}' portal.`,
          });
          return;
        }

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
    if (req.method === 'OPTIONS' || req.user?.role === UserRole.SUPERADMIN) {
      return next();
    }

    try {
      let tenant = (req as any).tenant;
      if (!tenant) {
        const hotelIdStr = extractHotelId(req);
        if (!hotelIdStr || !Types.ObjectId.isValid(hotelIdStr)) {
          res.status(403).json({
            success: false,
            errorCode: 'TENANT_REQUIRED',
            message: `Tenant identification is required to access this resource.`,
          });
          return;
        }

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
