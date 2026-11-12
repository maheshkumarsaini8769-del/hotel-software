import { resolveTenantCapabilities } from './tenantCapabilities';

/**
 * Serializes a Tenant document into the canonical public hotel summary shape
 * consumed by Customer & Staff APKs and Socket.IO tenant lifecycle broadcasts.
 */
export function serializePublicHotelSummary(h: any) {
  const id = h?._id ? h._id.toString() : String(h?.id || '');
  const address = (h?.address && typeof h.address === 'object') ? h.address : {};
  const city = address.city || h?.city || 'India';
  const state = address.state || h?.state || '';
  const street = address.street || h?.street || '';
  const coordinates = h?.coordinates || {
    latitude: typeof h?.latitude === 'number' ? h.latitude : 26.9124,
    longitude: typeof h?.longitude === 'number' ? h.longitude : 75.7873,
  };

  return {
    id,
    name: h?.name || '',
    slug: h?.slug || '',
    city,
    state,
    street,
    pincode: address.pincode || '',
    country: address.country || 'India',
    address: {
      street,
      city,
      state,
      country: address.country || 'India',
      pincode: address.pincode || '',
    },
    googleMapUrl: h?.googleMapUrl || `https://www.google.com/maps/search/?api=1&query=${coordinates.latitude},${coordinates.longitude}`,
    locationNotes: h?.locationNotes || '',
    logoUrl: h?.logoUrl || '',
    coverImageUrl: h?.coverImageUrl || '',
    stayImageUrl: h?.stayImageUrl || '',
    diningImageUrl: h?.diningImageUrl || '',
    coordinates,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    photos: Array.isArray(h?.photos) ? h.photos : [],
    tagline: h?.tagline || '',
    status: h?.status || 'ACTIVE',
    contactPhone: h?.contactPhone || '',
    contactEmail: h?.contactEmail || '',
    wifiSsid: h?.wifiSsid || '',
    wifiPassword: h?.wifiPassword || '',
    enabledPortals:
      Array.isArray(h?.enabledPortals) && h.enabledPortals.length > 0
        ? h.enabledPortals
        : ['admin', 'cashier', 'reception', 'kds', 'waiter', 'customer', 'guest'],
    serviceCapabilities: resolveTenantCapabilities(h),
    updatedAt: h?.updatedAt ? new Date(h.updatedAt).toISOString() : undefined,
    createdAt: h?.createdAt ? new Date(h.createdAt).toISOString() : undefined,
  };
}

/**
 * Lazily retrieves the shared Socket.IO server instance without introducing
 * circular module initialization issues across controllers.
 */
export function getSocketIOInstance(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const serverModule = require('../index');
    return serverModule?.io;
  } catch {
    return null;
  }
}

/**
 * Broadcasts a global tenant lifecycle event so APKs and portals update
 * newly created or edited hotels in real time.
 */
export function emitGlobalTenantEvent(
  eventName: 'tenant:created' | 'tenant:updated',
  tenant: any
): void {
  const io = getSocketIOInstance();
  if (!io || !tenant) return;
  io.emit(eventName, serializePublicHotelSummary(tenant));
}
