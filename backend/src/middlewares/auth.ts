import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { TenantRequest, AuthenticatedUserPayload, UserRole } from '../types';
import { Tenant, ITenant } from '../models/Tenant';

export const authenticateJWT = (
  req: TenantRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      errorCode: 'UNAUTHORIZED',
      message: 'Access token missing or invalid format',
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET || 'spicehub_super_secret_jwt_key_2026_production_ready_9921';

  try {
    const decoded = jwt.verify(token, secret) as AuthenticatedUserPayload;
    req.user = decoded;

    // Strict multi-tenancy enforcement: derive hotelId directly from authenticated context
    if (decoded.hotelId) {
      req.hotelId = new Types.ObjectId(decoded.hotelId);
    }
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      errorCode: 'INVALID_TOKEN',
      message: 'Token expired or signature invalid',
    });
  }
};

export const requireTenant = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // If user is SuperAdmin, tenant check can be skipped for platform-level queries
  if (req.user?.role === UserRole.SUPERADMIN) {
    return next();
  }

  if (!req.hotelId) {
    res.status(403).json({
      success: false,
      errorCode: 'TENANT_REQUIRED',
      message: 'Tenant context required for this operation',
    });
    return;
  }

  try {
    const tenant = await Tenant.findById(req.hotelId);
    if (!tenant) {
      res.status(404).json({
        success: false,
        errorCode: 'TENANT_NOT_FOUND',
        message: 'Tenant account not found',
      });
      return;
    }

    // Emergency Tenant Kill-Switch Check
    if (tenant.status === 'SUSPENDED') {
      res.status(403).json({
        success: false,
        errorCode: 'TENANT_SUSPENDED',
        message: 'This hotel tenant has been suspended by the platform administrator. Access blocked.',
      });
      return;
    }

    (req as any).tenant = tenant;
    next();
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

export const checkFeatureFlag = (flagName: keyof ITenant['featureFlags']) => {
  return async (req: TenantRequest, res: Response, next: NextFunction): Promise<void> => {
    if (req.user?.role === UserRole.SUPERADMIN) {
      return next();
    }

    try {
      let tenant = (req as any).tenant;
      if (!tenant && req.hotelId) {
        tenant = await Tenant.findById(req.hotelId);
      }

      if (tenant && tenant.featureFlags && tenant.featureFlags[flagName] === false) {
        res.status(403).json({
          success: false,
          errorCode: 'FEATURE_DISABLED',
          message: `Module feature '${String(flagName)}' is disabled on your tenant subscription plan. Contact SuperAdmin to upgrade.`,
        });
        return;
      }
      next();
    } catch (error: any) {
      res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
    }
  };
};

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: TenantRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        errorCode: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        errorCode: 'FORBIDDEN',
        message: `Forbidden: requires one of [${allowedRoles.join(', ')}]`,
      });
      return;
    }
    next();
  };
};
