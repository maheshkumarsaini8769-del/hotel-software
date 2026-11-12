import { UserRole } from '../types';
import { TenantServiceCapabilities } from './tenantCapabilities';

export type StaffPortalAccess =
  | { allowed: true }
  | {
      allowed: false;
      requiredPortal: string;
      errorCode: 'PORTAL_NOT_SUBSCRIBED' | 'HOTEL_SERVICE_DISABLED';
      message: string;
    };

export const resolveStaffPortalAccess = (
  role: UserRole,
  enabledPortals: string[],
  capabilities: TenantServiceCapabilities
): StaffPortalAccess => {
  const portalByRole: Partial<Record<UserRole, string>> = {
    [UserRole.WAITER]: 'waiter',
    [UserRole.CHEF]: 'kds',
    [UserRole.CASHIER]: 'cashier',
    [UserRole.RECEPTIONIST]: 'reception',
    [UserRole.MANAGER]: 'admin',
    [UserRole.GROUP_ADMIN]: 'admin',
    [UserRole.HOTEL_ADMIN]: 'admin',
    [UserRole.HOUSEKEEPING]: 'reception',
    [UserRole.MAINTENANCE]: 'reception',
  };
  const requiredPortal = portalByRole[role];

  if (requiredPortal && !enabledPortals.includes(requiredPortal)) {
    return {
      allowed: false,
      requiredPortal,
      errorCode: 'PORTAL_NOT_SUBSCRIBED',
      message: `The '${requiredPortal}' portal is not allocated to this hotel.`,
    };
  }

  const serviceEnabled =
    role === UserRole.WAITER
      ? capabilities.tableOrdering && capabilities.waiterDispatch
      : role === UserRole.CHEF
        ? capabilities.tableOrdering || capabilities.inRoomServices
        : role === UserRole.RECEPTIONIST || role === UserRole.HOUSEKEEPING || role === UserRole.MAINTENANCE
          ? capabilities.reception
          : true;

  if (!serviceEnabled && requiredPortal) {
    return {
      allowed: false,
      requiredPortal,
      errorCode: 'HOTEL_SERVICE_DISABLED',
      message: `The service required for staff role '${role}' is disabled for this hotel.`,
    };
  }

  return { allowed: true };
};
