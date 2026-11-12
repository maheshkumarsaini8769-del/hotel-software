import { ITenant } from '../models/Tenant';

export type TenantCapability =
  | 'roomBooking'
  | 'reception'
  | 'inRoomServices'
  | 'tableOrdering'
  | 'waiterDispatch';

export interface TenantServiceCapabilities {
  roomBooking: boolean;
  reception: boolean;
  inRoomServices: boolean;
  tableOrdering: boolean;
  waiterDispatch: boolean;
}

const LEGACY_PORTALS = ['admin', 'cashier', 'reception', 'kds', 'waiter', 'customer', 'guest'];

export const resolveTenantCapabilities = (tenant: {
  enabledPortals?: string[];
  featureFlags?: Partial<ITenant['featureFlags']>;
}): TenantServiceCapabilities => {
  const portals = Array.isArray(tenant.enabledPortals) ? tenant.enabledPortals : LEGACY_PORTALS;
  const flags = tenant.featureFlags;
  const hasPortal = (...keys: string[]) => keys.some((key) => portals.includes(key));

  return {
    roomBooking:
      (typeof flags?.roomBookingEnabled === 'boolean'
        ? flags.roomBookingEnabled
        : hasPortal('guest', 'reception')) && hasPortal('guest', 'reception'),
    reception:
      (typeof flags?.frontDeskEnabled === 'boolean'
        ? flags.frontDeskEnabled
        : typeof flags?.pmsEnabled === 'boolean'
          ? flags.pmsEnabled
          : hasPortal('reception', 'pms')) &&
      hasPortal('reception', 'pms'),
    inRoomServices:
      (typeof flags?.inRoomServicesEnabled === 'boolean'
        ? flags.inRoomServicesEnabled
        : typeof flags?.roomServiceEnabled === 'boolean'
          ? flags.roomServiceEnabled
        : hasPortal('guest')) && hasPortal('guest'),
    tableOrdering:
      (typeof flags?.tableOrderingEnabled === 'boolean'
        ? flags.tableOrderingEnabled
        : typeof flags?.qrDineInEnabled === 'boolean'
          ? flags.qrDineInEnabled
        : hasPortal('customer')) && hasPortal('customer'),
    waiterDispatch:
      (typeof flags?.waiterDispatchEnabled === 'boolean'
        ? flags.waiterDispatchEnabled
        : typeof flags?.waiterEnabled === 'boolean'
          ? flags.waiterEnabled
        : hasPortal('waiter')) && hasPortal('waiter'),
  };
};
