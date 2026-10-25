import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { TenantRequest, UserRole } from '../types';
import { Tenant } from '../models/Tenant';
import { getJwtSecret } from '../config/security';
import { PortalKey } from '@spicehub/shared-types';

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
        const hotelIdStr = extractHotelId(req);

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

      let isAllowed = portals.includes(portalKey);

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
