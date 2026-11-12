import { NextFunction, Response } from 'express';
import { Types } from 'mongoose';
import { Tenant } from '../models/Tenant';
import { TenantRequest } from '../types';
import { resolveTenantCapabilities, TenantCapability } from '../utils/tenantCapabilities';

export const requireTenantCapability = (capability: TenantCapability) => {
  return async (req: TenantRequest, res: Response, next: NextFunction): Promise<void> => {
    const headerHotelId = req.headers['x-hotel-id'];
    const hotelId = req.hotelId?.toString()
      || (Array.isArray(headerHotelId) ? headerHotelId[0] : headerHotelId)
      || req.query.hotelId
      || req.body?.hotelId
      || req.params.hotelId
      || req.params.tenantId;

    if (typeof hotelId !== 'string' || !Types.ObjectId.isValid(hotelId)) {
      res.status(400).json({
        success: false,
        errorCode: 'HOTEL_CONTEXT_REQUIRED',
        message: 'A valid hotelId is required for this service.',
      });
      return;
    }

    try {
      const tenant = await Tenant.findById(hotelId).select('enabledPortals featureFlags status');
      if (!tenant) {
        res.status(404).json({
          success: false,
          errorCode: 'TENANT_NOT_FOUND',
          message: 'Hotel not found.',
        });
        return;
      }

      if (tenant.status === 'SUSPENDED') {
        res.status(403).json({
          success: false,
          errorCode: 'TENANT_SUSPENDED',
          message: 'This hotel is not accepting service requests.',
        });
        return;
      }

      if (!resolveTenantCapabilities(tenant)[capability]) {
        res.status(403).json({
          success: false,
          errorCode: 'HOTEL_SERVICE_DISABLED',
          message: `This hotel does not offer ${capability}.`,
          capability,
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
