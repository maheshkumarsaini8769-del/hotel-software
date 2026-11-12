import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { io } from '../index';
import { ITenant, Tenant } from '../models/Tenant';
import { TaxRule, TaxApplicability, TaxType } from '../models/TaxRule';
import { TenantRequest } from '../types';
import { serializePublicHotelSummary } from '../utils/tenantPublicSummary';

// In-Memory Realistic Master State with MongoDB Sync hooks
let restaurantInfo: any = {
  name: 'The Grand SpiceHub Palace & Resort',
  tagline: 'Luxury Heritage Hotel & Fine Dining Restaurant',
  fssaiNumber: '10020051000892',
  gstin: '08AABCS1429B1ZS',
  contactPhone: '+91 98765 43210',
  contactEmail: 'contact@spicehubresort.com',
  website: 'https://spicehubresort.com',
  address: 'Plot 42, Civil Lines, Near Heritage Circle, Jaipur, Rajasthan 302006',
  operatingHours: '07:00 AM - 11:30 PM (Daily)',
  currency: 'INR',
  currencySymbol: '₹',
  logoUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=200&auto=format&fit=crop&q=80',
  coverImageUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1600&auto=format&fit=crop&q=80',
  stayImageUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200&auto=format&fit=crop&q=80',
  diningImageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80',
  coordinates: { latitude: 26.9124, longitude: 75.7873 },
  photos: [
    'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&auto=format&fit=crop&q=80',
  ],
  wifiSsid: 'TajGateway_HighSpeed',
  wifiPassword: 'SpiceGuest@2026',
  totalRooms: 48,
  totalDiningCapacity: 230,
};

let kitchenSections = [
  {
    id: 'ks-1',
    name: 'Tandoor & Charcoal Kebabs',
    code: 'KDS-TANDOOR',
    screenToken: 'KDS_01',
    chefInCharge: 'Chef Vikram Rawat',
    printerIp: '192.168.1.101',
    printerPort: 9100,
    status: 'ACTIVE',
    categories: ['Tandoor & Starters', 'Breads & Naans'],
    avgPrepTimeMinutes: 14,
  },
  {
    id: 'ks-2',
    name: 'Main Curry & North Indian',
    code: 'KDS-CURRY',
    screenToken: 'KDS_02',
    chefInCharge: 'Chef Anand Sharma',
    printerIp: '192.168.1.102',
    printerPort: 9100,
    status: 'ACTIVE',
    categories: ['Main Course Veg', 'Main Course Non-Veg', 'Dal & Rice'],
    avgPrepTimeMinutes: 18,
  },
  {
    id: 'ks-3',
    name: 'Chinese & Asian Wok',
    code: 'KDS-WOK',
    screenToken: 'KDS_03',
    chefInCharge: 'Chef Ming Chen',
    printerIp: '192.168.1.103',
    printerPort: 9100,
    status: 'ACTIVE',
    categories: ['Chinese & Soups', 'Noodles & Fried Rice'],
    avgPrepTimeMinutes: 12,
  },
  {
    id: 'ks-4',
    name: 'Woodfired Pizza, Pasta & Bakery',
    code: 'KDS-BAKERY',
    screenToken: 'KDS_04',
    chefInCharge: 'Chef Priya Mehta',
    printerIp: '192.168.1.104',
    printerPort: 9100,
    status: 'ACTIVE',
    categories: ['Woodfired Pizzas', 'Pastas', 'Desserts & Sweets'],
    avgPrepTimeMinutes: 15,
  },
  {
    id: 'ks-5',
    name: 'Mocktails, Shakes & Bar',
    code: 'KDS-BAR',
    screenToken: 'KDS_05',
    chefInCharge: 'Mixologist Rohit Sen',
    printerIp: '192.168.1.105',
    printerPort: 9100,
    status: 'ACTIVE',
    categories: ['Beverages & Mocktails', 'Shakes'],
    avgPrepTimeMinutes: 6,
  },
  {
    id: 'ks-6',
    name: 'Cold Pantry, Salads & Raita',
    code: 'KDS-PANTRY',
    screenToken: 'KDS_06',
    chefInCharge: 'Chef Sunita Joshi',
    printerIp: '192.168.1.106',
    printerPort: 9100,
    status: 'ACTIVE',
    categories: ['Salads & Appetizers', 'Sides & Accompaniments'],
    avgPrepTimeMinutes: 5,
  },
];

let vouchers: any[] = [
  {
    id: 'vc-1',
    code: 'WELCOME10',
    description: '10% Welcome Discount on Entire Menu',
    discountType: 'PERCENT',
    discountValue: 10,
    minBillAmount: 500,
    maxDiscountCap: 250,
    usageLimit: 500,
    timesUsed: 42,
    validUntil: '2026-12-31',
    isActive: true,
    scope: 'ALL_ITEMS',
    applicableItemIds: [],
    applicableItemNames: [],
    isScheduled: false,
    scheduledDays: [],
    dayNames: [],
    startTime: '',
    endTime: '',
    isRecurringWeekly: false,
  },
  {
    id: 'vc-2',
    code: 'SUNBRUNCH30',
    description: 'Sunday Morning Brunch 30% Off (08:00 AM - 02:00 PM)',
    discountType: 'PERCENT',
    discountValue: 30,
    minBillAmount: 400,
    maxDiscountCap: 300,
    usageLimit: 300,
    timesUsed: 54,
    validUntil: '2026-12-31',
    isActive: true,
    scope: 'ALL_ITEMS',
    applicableItemIds: [],
    applicableItemNames: [],
    isScheduled: true,
    scheduledDays: [0], // 0 = Sunday
    dayNames: ['Sun'],
    startTime: '08:00',
    endTime: '14:00',
    isRecurringWeekly: true,
  },
  {
    id: 'vc-3',
    code: 'PANEER50',
    description: 'Special ₹50 Off on Paneer Butter Masala & Dal Makhani',
    discountType: 'FLAT',
    discountValue: 50,
    minBillAmount: 250,
    maxDiscountCap: 50,
    usageLimit: 500,
    timesUsed: 31,
    validUntil: '2026-12-31',
    isActive: true,
    scope: 'SPECIFIC_ITEMS',
    applicableItemIds: ['6ae0bd8930c000828a8bbd56', '6ae06d00ddbafddfbb0a8033'],
    applicableItemNames: ['Paneer Butter Masala', 'Dal Makhani'],
    isScheduled: false,
    scheduledDays: [],
    dayNames: [],
    startTime: '',
    endTime: '',
    isRecurringWeekly: false,
  },
  {
    id: 'vc-4',
    code: 'HAPPYHOUR20',
    description: 'Weekday Evening Happy Hours 20% Off (04:00 PM - 07:00 PM)',
    discountType: 'PERCENT',
    discountValue: 20,
    minBillAmount: 300,
    maxDiscountCap: 200,
    usageLimit: 1000,
    timesUsed: 88,
    validUntil: '2026-12-31',
    isActive: true,
    scope: 'ALL_ITEMS',
    applicableItemIds: [],
    applicableItemNames: [],
    isScheduled: true,
    scheduledDays: [1, 2, 3, 4, 5], // Mon to Fri
    dayNames: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    startTime: '16:00',
    endTime: '19:00',
    isRecurringWeekly: true,
  },
  {
    id: 'vc-5',
    code: 'ROYAL500',
    description: 'VIP Banquet & Suite Privilege Voucher Flat ₹500',
    discountType: 'FLAT',
    discountValue: 500,
    minBillAmount: 3000,
    maxDiscountCap: 500,
    usageLimit: 50,
    timesUsed: 7,
    validUntil: '2026-12-31',
    isActive: true,
    scope: 'ALL_ITEMS',
    applicableItemIds: [],
    applicableItemNames: [],
    isScheduled: false,
    scheduledDays: [],
    dayNames: [],
    startTime: '',
    endTime: '',
    isRecurringWeekly: false,
  },
];


let customerWallets = [
  {
    id: 'cw-1',
    name: 'Rahul Sharma',
    phone: '+91 98290 11223',
    balance: 4500,
    loyaltyPoints: 450,
    tier: 'GOLD',
    totalVisits: 14,
    lastUsed: '2026-10-09',
  },
  {
    id: 'cw-2',
    name: 'Priya Patel',
    phone: '+91 98765 88990',
    balance: 2200,
    loyaltyPoints: 220,
    tier: 'SILVER',
    totalVisits: 8,
    lastUsed: '2026-10-08',
  },
  {
    id: 'cw-3',
    name: 'Col. Sanjeev Bakshi',
    phone: '+91 99887 76655',
    balance: 12850,
    loyaltyPoints: 1280,
    tier: 'VIP PLATINUM',
    totalVisits: 31,
    lastUsed: '2026-10-10',
  },
  {
    id: 'cw-4',
    name: 'Amit Singhal',
    phone: '+91 94140 22334',
    balance: 850,
    loyaltyPoints: 85,
    tier: 'REGULAR',
    totalVisits: 4,
    lastUsed: '2026-10-05',
  },
];

let warehouses = [
  {
    id: 'wh-1',
    code: 'WH-MAIN',
    name: 'Central Main Godown & Store',
    type: 'Central Store',
    manager: 'Suresh Verma',
    itemCount: 148,
    capacityUtilized: '92%',
    location: 'Ground Floor, Service Block B',
    contact: '+91 98280 11990',
    status: 'ACTIVE',
  },
  {
    id: 'wh-2',
    code: 'WH-DRY',
    name: 'Kitchen Dry Goods Pantry',
    type: 'Kitchen Pantry',
    manager: 'Chef Vikram Rawat',
    itemCount: 64,
    capacityUtilized: '74%',
    location: '1st Floor, Behind Main Kitchen',
    contact: '+91 98280 11991',
    status: 'ACTIVE',
  },
  {
    id: 'wh-3',
    code: 'WH-COLD',
    name: 'Walk-in Cold Storage & Deep Freezer',
    type: 'Cold Storage (-18°C / 4°C)',
    manager: 'Chef Anand Sharma',
    itemCount: 38,
    capacityUtilized: '60%',
    location: 'Kitchen Basement Level -1',
    contact: '+91 98280 11992',
    status: 'ACTIVE',
  },
  {
    id: 'wh-4',
    code: 'WH-BAR',
    name: 'Bar, Wine & Beverage Cellar',
    type: 'Beverage Cellar',
    manager: 'Mixologist Rohit Sen',
    itemCount: 29,
    capacityUtilized: '55%',
    location: '2nd Floor, Cellar Room C',
    contact: '+91 98280 11993',
    status: 'ACTIVE',
  },
];

let systemLogs = [
  {
    id: 'log-1',
    timestamp: new Date().toISOString(),
    actor: 'Admin Manager',
    action: 'TABLE_STATUS_UPDATE',
    module: 'Dining Tables',
    details: 'Changed Table B-01 to OCCUPIED (Guests seated: 4)',
    severity: 'INFO',
  },
  {
    id: 'log-2',
    timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
    actor: 'Cashier Sunil',
    action: 'BILL_SETTLEMENT',
    module: 'POS & Billing',
    details: 'Settled Bill #BILL-20261010-044 for ₹2,450 via UPI QR',
    severity: 'SUCCESS',
  },
  {
    id: 'log-3',
    timestamp: new Date(Date.now() - 32 * 60000).toISOString(),
    actor: 'Chef Anand Sharma',
    action: 'STOCK_86_UPDATE',
    module: 'Menu Catalog',
    details: 'Marked Tandoori Pomfret Fish as 86 OUT OF STOCK',
    severity: 'WARNING',
  },
  {
    id: 'log-4',
    timestamp: new Date(Date.now() - 65 * 60000).toISOString(),
    actor: 'Manager Ramesh',
    action: 'KOT_VOID_AUTHORIZED',
    module: 'Kitchen KDS',
    details: 'Authorized void of 1x Paneer Tikka on Table T-03 (Guest changed order)',
    severity: 'CRITICAL',
  },
  {
    id: 'log-5',
    timestamp: new Date(Date.now() - 120 * 60000).toISOString(),
    actor: 'Cashier Sunil',
    action: 'SHIFT_FLOAT_OPENED',
    module: 'Work Period',
    details: 'Opened Morning Shift #SH-20261010-01 with ₹5,000 cash float',
    severity: 'INFO',
  },
];

// 1. Restaurant Info (Synced with MongoDB Tenant)
export const getRestaurantInfo = async (req: Request, res: Response) => {
  try {
    const hotelId = (req as any).hotelId || (req as any).user?.hotelId || req.headers?.['x-hotel-id'];
    let tenant = null;
    if (hotelId && Types.ObjectId.isValid(String(hotelId))) {
      tenant = await Tenant.findById(new Types.ObjectId(String(hotelId)));
    }
    if (!tenant) {
      tenant = await Tenant.findOne();
    }

    if (tenant) {
      const tenantAddr = typeof tenant.address === 'object' && tenant.address ? tenant.address : {};
      const street = tenantAddr.street || (tenant as any).street || '';
      const city = tenantAddr.city || (tenant as any).city || 'Jaipur';
      const state = tenantAddr.state || (tenant as any).state || 'Rajasthan';
      const country = tenantAddr.country || (tenant as any).country || 'India';
      const pincode = tenantAddr.pincode || (tenant as any).pincode || '';
      const coordinates = (tenant as any).coordinates || {
        latitude: typeof (tenant as any).latitude === 'number' ? (tenant as any).latitude : 26.9124,
        longitude: typeof (tenant as any).longitude === 'number' ? (tenant as any).longitude : 75.7873,
      };
      const googleMapUrl = (tenant as any).googleMapUrl || `https://www.google.com/maps/search/?api=1&query=${coordinates.latitude},${coordinates.longitude}`;
      const locationNotes = (tenant as any).locationNotes || '';

      const addressStr = [street, city, state, pincode].filter(Boolean).join(', ') ||
        (typeof tenant.address === 'string' ? tenant.address : restaurantInfo.address);

      const tenantLoginBranding = (tenant as any).adminLoginBranding || {};
      const resolvedInfo = {
        ...restaurantInfo,
        name: tenant.name || restaurantInfo.name,
        tagline: tenant.tagline || restaurantInfo.tagline,
        logoUrl: tenant.logoUrl || restaurantInfo.logoUrl,
        coverImageUrl: tenant.coverImageUrl || restaurantInfo.coverImageUrl,
        stayImageUrl: (tenant as any).stayImageUrl || (restaurantInfo as any).stayImageUrl || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200&auto=format&fit=crop&q=80',
        diningImageUrl: (tenant as any).diningImageUrl || (restaurantInfo as any).diningImageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80',
        coordinates,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        street,
        city,
        state,
        country,
        pincode,
        googleMapUrl,
        locationNotes,
        photos: Array.isArray(tenant.photos) && tenant.photos.length > 0 ? tenant.photos : restaurantInfo.photos,
        contactPhone: tenant.contactPhone || restaurantInfo.contactPhone,
        contactEmail: tenant.contactEmail || restaurantInfo.contactEmail,
        gstin: tenant.gstin || restaurantInfo.gstin,
        fssaiNumber: tenant.fssai || restaurantInfo.fssaiNumber,
        wifiSsid: (tenant as any).wifiSsid || restaurantInfo.wifiSsid || 'TajGateway_HighSpeed',
        wifiPassword: (tenant as any).wifiPassword || restaurantInfo.wifiPassword || 'SpiceGuest@2026',
        address: addressStr || restaurantInfo.address,
        adminLoginBranding: {
          heroTitle: tenantLoginBranding.heroTitle || '',
          heroSubtitle: tenantLoginBranding.heroSubtitle || '',
          heroImageUrl: tenantLoginBranding.heroImageUrl || '',
          formTitle: tenantLoginBranding.formTitle || '',
          formSubtitle: tenantLoginBranding.formSubtitle || '',
          updatedAt: tenantLoginBranding.updatedAt || null,
        },
      };
      restaurantInfo = resolvedInfo;
    }

    res.json({ success: true, data: restaurantInfo });
  } catch (err: any) {
    res.json({ success: true, data: restaurantInfo });
  }
};

export const updateRestaurantInfo = async (req: Request, res: Response) => {
  try {
    restaurantInfo = { ...restaurantInfo, ...req.body };

    const hotelId = (req as any).hotelId || (req as any).user?.hotelId || req.headers?.['x-hotel-id'];
    let tenant = null;
    if (hotelId && Types.ObjectId.isValid(String(hotelId))) {
      tenant = await Tenant.findById(new Types.ObjectId(String(hotelId)));
    }
    if (!tenant) {
      tenant = await Tenant.findOne();
    }

    if (tenant) {
      const updateData: any = {};
      if (req.body.name) updateData.name = String(req.body.name).trim();
      if (req.body.tagline !== undefined) updateData.tagline = String(req.body.tagline).trim();
      if (req.body.logoUrl !== undefined) updateData.logoUrl = String(req.body.logoUrl).trim();
      if (req.body.coverImageUrl !== undefined) updateData.coverImageUrl = String(req.body.coverImageUrl).trim();
      if (req.body.stayImageUrl !== undefined) updateData.stayImageUrl = String(req.body.stayImageUrl).trim();
      if (req.body.diningImageUrl !== undefined) updateData.diningImageUrl = String(req.body.diningImageUrl).trim();
      if (req.body.coordinates !== undefined) {
        updateData.coordinates = req.body.coordinates;
      } else if (req.body.latitude !== undefined || req.body.longitude !== undefined) {
        const curCoords = (tenant as any).coordinates || {};
        const lat = req.body.latitude !== undefined ? Number(req.body.latitude) : (curCoords.latitude ?? 26.9124);
        const lng = req.body.longitude !== undefined ? Number(req.body.longitude) : (curCoords.longitude ?? 75.7873);
        updateData.coordinates = { latitude: lat, longitude: lng };
      }
      if (req.body.photos !== undefined) {
        updateData.photos = Array.isArray(req.body.photos) ? req.body.photos : [];
      }
      if (req.body.contactPhone !== undefined) updateData.contactPhone = String(req.body.contactPhone).trim();
      if (req.body.contactEmail !== undefined) updateData.contactEmail = String(req.body.contactEmail).trim();
      if (req.body.city !== undefined) updateData['address.city'] = String(req.body.city).trim();
      if (req.body.state !== undefined) updateData['address.state'] = String(req.body.state).trim();
      if (req.body.street !== undefined) updateData['address.street'] = String(req.body.street).trim();
      if (req.body.pincode !== undefined) updateData['address.pincode'] = String(req.body.pincode).trim();
      if (req.body.country !== undefined) updateData['address.country'] = String(req.body.country).trim();
      if (req.body.googleMapUrl !== undefined) updateData.googleMapUrl = String(req.body.googleMapUrl).trim();
      if (req.body.locationNotes !== undefined) updateData.locationNotes = String(req.body.locationNotes).trim();
      if (req.body.address && typeof req.body.address === 'object') {
        if (req.body.address.street !== undefined) updateData['address.street'] = String(req.body.address.street).trim();
        if (req.body.address.city !== undefined) updateData['address.city'] = String(req.body.address.city).trim();
        if (req.body.address.state !== undefined) updateData['address.state'] = String(req.body.address.state).trim();
        if (req.body.address.pincode !== undefined) updateData['address.pincode'] = String(req.body.address.pincode).trim();
        if (req.body.address.country !== undefined) updateData['address.country'] = String(req.body.address.country).trim();
      }
      if (req.body.gstin) updateData.gstin = String(req.body.gstin).trim();
      if (req.body.fssaiNumber) updateData.fssai = String(req.body.fssaiNumber).trim();
      if (req.body.wifiSsid !== undefined) updateData.wifiSsid = String(req.body.wifiSsid).trim();
      if (req.body.wifiPassword !== undefined) updateData.wifiPassword = String(req.body.wifiPassword).trim();
      if (req.body.adminLoginBranding && typeof req.body.adminLoginBranding === 'object') {
        const currentBranding = (tenant as any).adminLoginBranding || {};
        const nextBranding = req.body.adminLoginBranding;
        updateData.adminLoginBranding = {
          heroTitle:
            nextBranding.heroTitle !== undefined
              ? String(nextBranding.heroTitle).trim().slice(0, 240)
              : currentBranding.heroTitle || '',
          heroSubtitle:
            nextBranding.heroSubtitle !== undefined
              ? String(nextBranding.heroSubtitle).trim().slice(0, 500)
              : currentBranding.heroSubtitle || '',
          heroImageUrl:
            nextBranding.heroImageUrl !== undefined
              ? String(nextBranding.heroImageUrl).trim()
              : currentBranding.heroImageUrl || '',
          formTitle:
            nextBranding.formTitle !== undefined
              ? String(nextBranding.formTitle).trim().slice(0, 140)
              : currentBranding.formTitle || '',
          formSubtitle:
            nextBranding.formSubtitle !== undefined
              ? String(nextBranding.formSubtitle).trim().slice(0, 320)
              : currentBranding.formSubtitle || '',
          updatedAt: new Date(),
        };
      }

      const updatedTenant = await Tenant.findByIdAndUpdate(tenant._id, { $set: updateData }, { new: true });

      if (updatedTenant) {
        restaurantInfo = {
          ...restaurantInfo,
          adminLoginBranding: (updatedTenant as any).adminLoginBranding || restaurantInfo.adminLoginBranding || {},
        };
        if (io) {
          io.emit('tenant:updated', serializePublicHotelSummary(updatedTenant));
          if (updateData.adminLoginBranding) {
            io.emit('tenant:admin_login_branding_updated', {
              hotelId: updatedTenant._id.toString(),
              hotelSlug: updatedTenant.slug,
              hotelName: updatedTenant.name,
              ...(updatedTenant as any).adminLoginBranding,
            });
          }
        }
      }
    }

    io?.emit('restaurant:info_updated', restaurantInfo);
    res.json({ success: true, message: 'Restaurant information updated successfully', data: restaurantInfo });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const operationalSettingsSchema = z.object({
  cgstPercent: z.number().min(0).max(14).optional(),
  sgstPercent: z.number().min(0).max(14).optional(),
  serviceChargePercent: z.number().min(0).max(20).optional(),
  roomGstUnderThresholdPercent: z.number().min(0).max(28).optional(),
  roomGstAboveThresholdPercent: z.number().min(0).max(28).optional(),
  roomGstTariffThreshold: z.number().min(0).optional(),
  autoPrintKot: z.boolean().optional(),
  thermalPrinterWidth: z.enum(['58mm', '80mm']).optional(),
  printHeaderWithLogo: z.boolean().optional(),
  kotSoundAlert: z.boolean().optional(),
  roundOffBills: z.boolean().optional(),
  smsReceipts: z.boolean().optional(),
  whatsappReceipts: z.boolean().optional(),
  autoCloseShiftTime: z.string().trim().min(1).max(40).optional(),
  billFooterNote: z.string().trim().max(500).optional(),
  currencySymbol: z.string().trim().min(1).max(8).optional(),
});

const hotelPolicySchema = z.object({
  checkInTime: z.string().trim().regex(/^\d{2}:\d{2}$/).optional(),
  checkOutTime: z.string().trim().regex(/^\d{2}:\d{2}$/).optional(),
  gracePeriodMinutes: z.number().int().min(0).max(1440).optional(),
  earlyCheckInChargePercent: z.number().min(0).max(100).optional(),
  lateCheckOutChargePercent: z.number().min(0).max(100).optional(),
  cancellationFreeHours: z.number().int().min(0).max(8760).optional(),
  cancellationPenaltyPercent: z.number().min(0).max(100).optional(),
  cancellationStrictHours: z.number().int().min(0).max(8760).optional(),
  securityDepositPerNight: z.number().min(0).optional(),
  maxKeycardsPerRoom: z.number().int().min(1).max(20).optional(),
  roomGstUnderThresholdPercent: z.number().min(0).max(28).optional(),
  roomGstAboveThresholdPercent: z.number().min(0).max(28).optional(),
  roomGstTariffThreshold: z.number().min(0).optional(),
  restaurantGstPercent: z.number().min(0).max(28).optional(),
  serviceChargePercent: z.number().min(0).max(20).optional(),
  minInRoomDiningOrderAmount: z.number().min(0).optional(),
  inRoomDiningDeliverySlaMinutes: z.number().int().min(1).max(1440).optional(),
  tableTurnoverLimitMinutes: z.number().int().min(1).max(1440).optional(),
  kotVoidManagerPinThreshold: z.number().min(0).optional(),
  waiterMaxDiscountPercent: z.number().min(0).max(100).optional(),
  managerMaxDiscountPercent: z.number().min(0).max(100).optional(),
  openingCashFloatAmount: z.number().min(0).optional(),
  cashierVarianceToleranceAmount: z.number().min(0).optional(),
  cashierVarianceAlertThreshold: z.number().min(0).optional(),
  nightAuditExecutionWindow: z.string().trim().min(1).max(80).optional(),
  housekeepingTurnaroundSlaMinutes: z.number().int().min(1).max(1440).optional(),
  lostAndFoundStandardRetentionDays: z.number().int().min(1).max(36500).optional(),
  lostAndFoundValuableRetentionDays: z.number().int().min(1).max(36500).optional(),
  nonSmokingFineAmount: z.number().min(0).optional(),
  petSanitationFeePerNight: z.number().min(0).optional(),
  maxTablesPerWaiter: z.number().int().min(1).max(100).optional(),
});

async function getSettingsTenant(req: TenantRequest, res: Response): Promise<ITenant | null> {
  if (!req.hotelId) {
    res.status(401).json({
      success: false,
      errorCode: 'TENANT_REQUIRED',
      message: 'Hotel context is required to access operational settings.',
    });
    return null;
  }
  const tenant = await Tenant.findById(req.hotelId);
  if (!tenant) {
    res.status(404).json({
      success: false,
      errorCode: 'TENANT_NOT_FOUND',
      message: 'Hotel settings were not found.',
    });
    return null;
  }
  return tenant;
}

function getOperationalSettingsData(tenant: ITenant | null) {
  if (!tenant) return null;
  const tax = tenant.taxConfig || {};
  return {
    cgstPercent: tax.cgstPercent ?? 2.5,
    sgstPercent: tax.sgstPercent ?? 2.5,
    serviceChargePercent: tax.serviceChargePercent ?? 5,
    roomGstUnderThresholdPercent: tax.roomGstUnderThresholdPercent ?? 12,
    roomGstAboveThresholdPercent: tax.roomGstAboveThresholdPercent ?? 18,
    roomGstTariffThreshold: tax.roomGstTariffThreshold ?? 7500,
    autoPrintKot: tax.autoPrintKot ?? true,
    thermalPrinterWidth: tax.thermalPrinterWidth ?? '80mm',
    printHeaderWithLogo: tax.printHeaderWithLogo ?? true,
    kotSoundAlert: tax.kotSoundAlert ?? true,
    roundOffBills: tax.roundOffBills ?? true,
    smsReceipts: tax.smsReceipts ?? true,
    whatsappReceipts: tax.whatsappReceipts ?? true,
    autoCloseShiftTime: tax.autoCloseShiftTime ?? '02:00 AM',
    billFooterNote: tax.billFooterNote ?? '',
    currency: tenant.currency,
    currencySymbol: tenant.currency === 'INR' ? '₹' : tenant.currency,
  };
}

function getHotelPolicyData(tenant: ITenant | null) {
  if (!tenant) return null;
  const policies = tenant.operationalPolicies || {};
  const tax = tenant.taxConfig || {};
  return {
    ...policies,
    roomGstUnderThresholdPercent: tax.roomGstUnderThresholdPercent ?? 12,
    roomGstAboveThresholdPercent: tax.roomGstAboveThresholdPercent ?? 18,
    roomGstTariffThreshold: tax.roomGstTariffThreshold ?? 7500,
    restaurantGstPercent: (tax.cgstPercent ?? 2.5) + (tax.sgstPercent ?? 2.5),
    serviceChargePercent: tax.serviceChargePercent ?? 5,
    updatedAt: policies.updatedAt?.toISOString() ?? tenant.updatedAt.toISOString(),
  };
}

// 2. Operational settings are tenant-owned and persisted; no process-global fallback.
export const getOperationalSettings = async (req: Request, res: Response) => {
  try {
    const tenant = await getSettingsTenant(req as TenantRequest, res);
    if (!tenant) return;
    res.json({ success: true, data: getOperationalSettingsData(tenant) });
  } catch {
    res.status(500).json({
      success: false,
      errorCode: 'OPERATIONAL_SETTINGS_UNAVAILABLE',
      message: 'Operational settings could not be loaded. Please retry.',
    });
  }
};

export const updateOperationalSettings = async (req: Request, res: Response) => {
  const parsed = operationalSettingsSchema.safeParse(req.body);
  if (!parsed.success || Object.keys(parsed.data || {}).length === 0) {
    res.status(400).json({
      success: false,
      errorCode: 'INVALID_OPERATIONAL_SETTINGS',
      message: 'Provide valid operational settings to update.',
      details: parsed.success ? undefined : parsed.error.flatten(),
    });
    return;
  }

  try {
    const tenant = await getSettingsTenant(req as TenantRequest, res);
    if (!tenant) return;
    const { currencySymbol: _currencySymbol, ...updates } = parsed.data;
    tenant.taxConfig = { ...(tenant.taxConfig || {}), ...updates };
    await tenant.save();

    const tax = tenant.taxConfig;
    const cgst = tax.cgstPercent ?? 2.5;
    const sgst = tax.sgstPercent ?? 2.5;
    const serviceCharge = tax.serviceChargePercent ?? 0;
    const total = cgst + sgst + serviceCharge;
    await Promise.all([
      TaxRule.findOneAndUpdate(
        { hotelId: tenant._id, applicableTo: TaxApplicability.RESTAURANT_DINE_IN },
        {
          hotelId: tenant._id, taxName: 'GST Dine-In', taxType: TaxType.GST,
          applicableTo: TaxApplicability.RESTAURANT_DINE_IN,
          cgstRate: cgst, sgstRate: sgst, serviceChargeRate: serviceCharge,
          totalEffectiveRate: total, isDefault: true, isActive: true,
        },
        { upsert: true, new: true }
      ),
      TaxRule.findOneAndUpdate(
        { hotelId: tenant._id, applicableTo: TaxApplicability.ROOM_SERVICE },
        {
          hotelId: tenant._id, taxName: 'GST In-Room Dining', taxType: TaxType.GST,
          applicableTo: TaxApplicability.ROOM_SERVICE,
          cgstRate: cgst, sgstRate: sgst, serviceChargeRate: serviceCharge,
          totalEffectiveRate: total, isDefault: true, isActive: true,
        },
        { upsert: true, new: true }
      ),
    ]);

    const data = getOperationalSettingsData(tenant);
    io?.to(`${tenant._id.toString()}_global`).emit('settings:updated', data);
    io?.to(`${tenant._id.toString()}_global`).emit('tenant:tax_updated', data);
    res.json({ success: true, message: 'Settings saved to this hotel.', data });
  } catch {
    res.status(500).json({
      success: false,
      errorCode: 'OPERATIONAL_SETTINGS_SAVE_FAILED',
      message: 'Operational settings could not be saved. Please retry.',
    });
  }
};

// 2b. Authoritative Hotel Operational Policies & Compliance Rules
export const getHotelPolicies = async (req: Request, res: Response) => {
  try {
    const tenant = await getSettingsTenant(req as TenantRequest, res);
    if (!tenant) return;
    const data = getHotelPolicyData(tenant);
    res.json({ success: true, count: Object.keys(data || {}).length, data });
  } catch {
    res.status(500).json({
      success: false,
      errorCode: 'HOTEL_POLICIES_UNAVAILABLE',
      message: 'Hotel policies could not be loaded. Please retry.',
    });
  }
};

export const updateHotelPolicies = async (req: Request, res: Response) => {
  const parsed = hotelPolicySchema.safeParse(req.body);
  if (!parsed.success || Object.keys(parsed.data || {}).length === 0) {
    res.status(400).json({
      success: false,
      errorCode: 'INVALID_HOTEL_POLICIES',
      message: 'Provide valid hotel policy values to update.',
      details: parsed.success ? undefined : parsed.error.flatten(),
    });
    return;
  }

  try {
    const tenant = await getSettingsTenant(req as TenantRequest, res);
    if (!tenant) return;
    const {
      roomGstUnderThresholdPercent,
      roomGstAboveThresholdPercent,
      roomGstTariffThreshold,
      restaurantGstPercent,
      serviceChargePercent,
      ...operationalPolicyUpdates
    } = parsed.data;
    tenant.operationalPolicies = {
      ...(tenant.operationalPolicies || {}),
      ...operationalPolicyUpdates,
      updatedAt: new Date(),
    };

    if (
      roomGstUnderThresholdPercent !== undefined ||
      roomGstAboveThresholdPercent !== undefined ||
      roomGstTariffThreshold !== undefined ||
      restaurantGstPercent !== undefined ||
      serviceChargePercent !== undefined
    ) {
      const currentTax = tenant.taxConfig || {};
      let cgst = currentTax.cgstPercent ?? 2.5;
      let sgst = currentTax.sgstPercent ?? 2.5;
      if (restaurantGstPercent !== undefined) {
        cgst = restaurantGstPercent / 2;
        sgst = restaurantGstPercent / 2;
      }
      tenant.taxConfig = {
        ...currentTax,
        cgstPercent: cgst,
        sgstPercent: sgst,
        serviceChargePercent: serviceChargePercent ?? currentTax.serviceChargePercent ?? 5,
        roomGstUnderThresholdPercent:
          roomGstUnderThresholdPercent ?? currentTax.roomGstUnderThresholdPercent ?? 12,
        roomGstAboveThresholdPercent:
          roomGstAboveThresholdPercent ?? currentTax.roomGstAboveThresholdPercent ?? 18,
        roomGstTariffThreshold:
          roomGstTariffThreshold ?? currentTax.roomGstTariffThreshold ?? 7500,
      };
    }

    await tenant.save();
    const underRate = tenant.taxConfig?.roomGstUnderThresholdPercent ?? 12;
    await TaxRule.findOneAndUpdate(
      { hotelId: tenant._id, applicableTo: TaxApplicability.ROOM_STAY },
      {
        hotelId: tenant._id,
        taxName: 'GST Room Stay Statutory Slab',
        taxType: TaxType.GST,
        applicableTo: TaxApplicability.ROOM_STAY,
        cgstRate: underRate / 2,
        sgstRate: underRate / 2,
        serviceChargeRate: 0,
        totalEffectiveRate: underRate,
        isDefault: true,
        isActive: true,
      },
      { upsert: true, new: true }
    );

    const data = getHotelPolicyData(tenant);
    io?.to(`${tenant._id.toString()}_global`).emit('policies:updated', data);
    io?.to(`${tenant._id.toString()}_global`).emit('tenant:policies_updated', data);
    res.json({
      success: true,
      message: 'Hotel policies saved to this hotel and synchronized.',
      data,
    });
  } catch {
    res.status(500).json({
      success: false,
      errorCode: 'HOTEL_POLICIES_SAVE_FAILED',
      message: 'Hotel policies could not be saved. Please retry.',
    });
  }
};

// 3. Kitchen Sections
export const getKitchenSections = async (req: Request, res: Response) => {
  res.json({ success: true, count: kitchenSections.length, data: kitchenSections });
};

export const createKitchenSection = async (req: Request, res: Response) => {
  try {
    const newSection = {
      id: `ks-${Date.now()}`,
      name: req.body.name || 'New Kitchen Section',
      code: req.body.code || `KDS-${Date.now().toString().slice(-4)}`,
      screenToken: req.body.screenToken || `KDS_${kitchenSections.length + 1}`,
      chefInCharge: req.body.chefInCharge || 'Unassigned',
      printerIp: req.body.printerIp || '192.168.1.100',
      printerPort: req.body.printerPort || 9100,
      status: req.body.status || 'ACTIVE',
      categories: req.body.categories || [],
      avgPrepTimeMinutes: req.body.avgPrepTimeMinutes || 15,
    };
    kitchenSections.push(newSection);
    io?.emit('kitchen:section_created', newSection);
    res.status(201).json({ success: true, message: 'Kitchen section created successfully', data: newSection });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const updateKitchenSection = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const index = kitchenSections.findIndex((s) => s.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Kitchen section not found' });
    }
    kitchenSections[index] = { ...kitchenSections[index], ...req.body };
    io?.emit('kitchen:section_updated', kitchenSections[index]);
    res.json({ success: true, message: 'Kitchen section updated', data: kitchenSections[index] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const deleteKitchenSection = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    kitchenSections = kitchenSections.filter((s) => s.id !== id);
    io?.emit('kitchen:section_deleted', { id });
    res.json({ success: true, message: 'Kitchen section deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 4. Vouchers & Coupons
export const getVouchers = async (req: Request, res: Response) => {
  res.json({ success: true, count: vouchers.length, data: vouchers });
};

export const createVoucher = async (req: Request, res: Response) => {
  try {
    const rawDays = Array.isArray(req.body.scheduledDays) ? req.body.scheduledDays.map(Number) : [0];
    const DAY_MAP = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const computedDayNames = Array.isArray(req.body.dayNames) && req.body.dayNames.length > 0
      ? req.body.dayNames
      : rawDays.map((d: number) => DAY_MAP[d] || 'Sun');

    const newVoucher = {
      id: `vc-${Date.now()}`,
      code: req.body.code ? req.body.code.toUpperCase().trim() : `SAVE${Math.floor(Math.random() * 900 + 100)}`,
      description: req.body.description || 'Special Promotion Voucher',
      discountType: req.body.discountType || 'PERCENT',
      discountValue: Number(req.body.discountValue) || 10,
      minBillAmount: Number(req.body.minBillAmount) || 0,
      maxDiscountCap: Number(req.body.maxDiscountCap) || 0,
      usageLimit: Number(req.body.usageLimit) || 100,
      timesUsed: 0,
      validUntil: req.body.validUntil || '2026-12-31',
      isActive: req.body.isActive !== false,
      scope: req.body.scope === 'SPECIFIC_ITEMS' ? 'SPECIFIC_ITEMS' : 'ALL_ITEMS',
      applicableItemIds: Array.isArray(req.body.applicableItemIds) ? req.body.applicableItemIds : [],
      applicableItemNames: Array.isArray(req.body.applicableItemNames) ? req.body.applicableItemNames : [],
      isScheduled: Boolean(req.body.isScheduled),
      scheduledDays: rawDays,
      dayNames: computedDayNames,
      startTime: req.body.startTime || '08:00',
      endTime: req.body.endTime || '14:00',
      isRecurringWeekly: req.body.isRecurringWeekly !== false,
    };
    vouchers.unshift(newVoucher);
    res.status(201).json({ success: true, message: 'Voucher created successfully', data: newVoucher });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const updateVoucher = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const index = vouchers.findIndex((v) => v.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Voucher not found' });
    }

    const DAY_MAP = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const updatedDays = req.body.scheduledDays !== undefined
      ? (Array.isArray(req.body.scheduledDays) ? req.body.scheduledDays.map(Number) : vouchers[index].scheduledDays)
      : vouchers[index].scheduledDays;

    const computedDayNames = req.body.dayNames !== undefined
      ? req.body.dayNames
      : (Array.isArray(updatedDays) ? updatedDays.map((d: number) => DAY_MAP[d] || 'Sun') : vouchers[index].dayNames);

    vouchers[index] = {
      ...vouchers[index],
      ...req.body,
      id: vouchers[index].id,
      code: req.body.code ? req.body.code.toUpperCase().trim() : vouchers[index].code,
      discountValue: req.body.discountValue !== undefined ? Number(req.body.discountValue) : vouchers[index].discountValue,
      minBillAmount: req.body.minBillAmount !== undefined ? Number(req.body.minBillAmount) : vouchers[index].minBillAmount,
      maxDiscountCap: req.body.maxDiscountCap !== undefined ? Number(req.body.maxDiscountCap) : vouchers[index].maxDiscountCap,
      usageLimit: req.body.usageLimit !== undefined ? Number(req.body.usageLimit) : vouchers[index].usageLimit,
      scope: req.body.scope !== undefined ? req.body.scope : vouchers[index].scope,
      applicableItemIds: req.body.applicableItemIds !== undefined ? req.body.applicableItemIds : vouchers[index].applicableItemIds,
      applicableItemNames: req.body.applicableItemNames !== undefined ? req.body.applicableItemNames : vouchers[index].applicableItemNames,
      isScheduled: req.body.isScheduled !== undefined ? Boolean(req.body.isScheduled) : vouchers[index].isScheduled,
      scheduledDays: updatedDays,
      dayNames: computedDayNames,
      startTime: req.body.startTime !== undefined ? req.body.startTime : vouchers[index].startTime,
      endTime: req.body.endTime !== undefined ? req.body.endTime : vouchers[index].endTime,
      isRecurringWeekly: req.body.isRecurringWeekly !== undefined ? Boolean(req.body.isRecurringWeekly) : vouchers[index].isRecurringWeekly,
    };
    res.json({ success: true, message: 'Voucher updated successfully', data: vouchers[index] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const deleteVoucher = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    vouchers = vouchers.filter((v) => v.id !== id);
    res.json({ success: true, message: 'Voucher removed successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const validateVoucher = async (req: Request, res: Response) => {
  try {
    const { code, items = [], cartTotal = 0, checkTime, checkDay } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Coupon code is required' });
    }
    const cleanCode = String(code).toUpperCase().trim();
    const voucher = vouchers.find((v) => v.code === cleanCode);
    if (!voucher || voucher.isActive === false) {
      return res.status(404).json({ success: false, message: `Coupon code "${cleanCode}" is invalid or inactive.` });
    }

    // 1. Expiry date check
    if (voucher.validUntil) {
      const expiryDate = new Date(voucher.validUntil);
      expiryDate.setHours(23, 59, 59, 999);
      if (new Date() > expiryDate) {
        return res.status(400).json({ success: false, message: `Coupon code "${cleanCode}" expired on ${voucher.validUntil}.` });
      }
    }

    // 2. Usage limit check
    if (voucher.usageLimit && voucher.timesUsed >= voucher.usageLimit) {
      return res.status(400).json({ success: false, message: `Coupon code "${cleanCode}" has reached maximum usage limit.` });
    }

    // 3. Weekly Day and Time Window Check
    const now = checkTime ? new Date(checkTime) : new Date();
    if (voucher.isScheduled) {
      const currentDay = checkDay !== undefined ? Number(checkDay) : now.getDay(); // 0 = Sunday, 1 = Monday, ...
      const dayMatches = !voucher.scheduledDays || voucher.scheduledDays.length === 0 || voucher.scheduledDays.includes(currentDay);
      const DAY_MAP = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      if (!dayMatches) {
        const allowedDays = voucher.dayNames?.join(', ') || 'selected days';
        return res.status(400).json({
          success: false,
          errorCode: 'SCHEDULE_DAY_MISMATCH',
          message: `Coupon "${cleanCode}" is only active on ${allowedDays}. Selected day is ${DAY_MAP[currentDay]}.`,
        });
      }

      if (voucher.startTime && voucher.endTime) {
        let currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        if (req.body.simulatedTime) {
          currentTimeStr = req.body.simulatedTime;
        }
        if (currentTimeStr < voucher.startTime || currentTimeStr > voucher.endTime) {
          return res.status(400).json({
            success: false,
            errorCode: 'SCHEDULE_TIME_MISMATCH',
            message: `Coupon "${cleanCode}" is active only between ${voucher.startTime} and ${voucher.endTime}. Time ${currentTimeStr} is outside active window.`,
          });
        }
      }
    }

    // 4. Product Scope (All Products vs Specific Products)
    let eligibleSubtotal = Number(cartTotal) || 0;
    let qualifyingItems: any[] = [];
    if (voucher.scope === 'SPECIFIC_ITEMS' && Array.isArray(voucher.applicableItemIds) && voucher.applicableItemIds.length > 0) {
      if (Array.isArray(items) && items.length > 0) {
        qualifyingItems = items.filter((it: any) =>
          voucher.applicableItemIds.includes(String(it.id)) ||
          voucher.applicableItemIds.includes(String(it.itemId)) ||
          voucher.applicableItemNames?.some((name: string) => name.toLowerCase() === String(it.name).toLowerCase())
        );
        if (qualifyingItems.length === 0) {
          return res.status(400).json({
            success: false,
            errorCode: 'NO_QUALIFYING_ITEMS',
            message: `Coupon "${cleanCode}" applies only to specific items: ${voucher.applicableItemNames?.join(', ') || 'selected menu items'}. None present in cart.`,
          });
        }
        eligibleSubtotal = qualifyingItems.reduce((sum: number, it: any) => sum + (Number(it.price || it.basePrice || 0) * Number(it.quantity || 1)), 0);
      }
    }

    // 5. Minimum Bill Amount
    if (voucher.minBillAmount && eligibleSubtotal < voucher.minBillAmount) {
      return res.status(400).json({
        success: false,
        errorCode: 'MIN_BILL_NOT_MET',
        message: `Minimum eligible spend of ₹${voucher.minBillAmount} required for coupon "${cleanCode}". Current eligible amount is ₹${eligibleSubtotal}.`,
      });
    }

    // 6. Calculate discount
    let discountAmount = 0;
    if (voucher.discountType === 'PERCENT') {
      discountAmount = Math.round((eligibleSubtotal * voucher.discountValue) / 100);
      if (voucher.maxDiscountCap && voucher.maxDiscountCap > 0) {
        discountAmount = Math.min(discountAmount, voucher.maxDiscountCap);
      }
    } else {
      discountAmount = Math.min(eligibleSubtotal, voucher.discountValue);
    }

    const finalPayable = Math.max(0, (Number(cartTotal) || eligibleSubtotal) - discountAmount);

    res.json({
      success: true,
      message: `Coupon "${cleanCode}" applied successfully! You save ₹${discountAmount}.`,
      data: {
        code: voucher.code,
        discountType: voucher.discountType,
        discountValue: voucher.discountValue,
        discountAmount,
        eligibleSubtotal,
        finalPayable,
        scope: voucher.scope,
        applicableItemNames: voucher.applicableItemNames,
        isScheduled: voucher.isScheduled,
        scheduleDisplay: voucher.isScheduled ? `${voucher.dayNames?.join(', ')} (${voucher.startTime} - ${voucher.endTime})` : 'All Times',
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};


// 5. Customer Wallets
export const getWallets = async (req: Request, res: Response) => {
  res.json({ success: true, count: customerWallets.length, data: customerWallets });
};

export const topUpWallet = async (req: Request, res: Response) => {
  try {
    const { id, amount, notes } = req.body;
    const wallet = customerWallets.find((w) => w.id === id);
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Customer wallet not found' });
    }
    const topupAmount = Number(amount) || 0;
    wallet.balance += topupAmount;
    wallet.loyaltyPoints += Math.floor(topupAmount / 10);
    wallet.lastUsed = new Date().toISOString().slice(0, 10);

    systemLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: 'Admin / Cashier',
      action: 'WALLET_TOPUP',
      module: 'Wallets & Loyalty',
      details: `Added ₹${topupAmount} to ${wallet.name} (${wallet.phone}). New balance: ₹${wallet.balance}`,
      severity: 'SUCCESS',
    });

    res.json({ success: true, message: `Successfully added ₹${topupAmount} to wallet`, data: wallet });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 6. Warehouses & Stores
export const getWarehouses = async (req: Request, res: Response) => {
  res.json({ success: true, count: warehouses.length, data: warehouses });
};

export const createWarehouse = async (req: Request, res: Response) => {
  try {
    const newWh = {
      id: `wh-${Date.now()}`,
      code: req.body.code ? req.body.code.toUpperCase().trim() : `WH-${Date.now().toString().slice(-3)}`,
      name: req.body.name || 'New Storage Location',
      type: req.body.type || 'Sub Store',
      manager: req.body.manager || 'Store In-Charge',
      itemCount: 0,
      capacityUtilized: '10%',
      location: req.body.location || 'Main Building',
      contact: req.body.contact || '+91 98000 00000',
      status: 'ACTIVE',
    };
    warehouses.push(newWh);
    res.status(201).json({ success: true, message: 'Warehouse created successfully', data: newWh });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 7. Work Period Report (Z-Report / Shift Register)
export const getWorkPeriodReport = async (req: Request, res: Response) => {
  const report = {
    shiftNumber: 'SH-20261010-01',
    shiftName: 'Morning & Lunch Session',
    cashierName: 'Sunil Verma (POS Terminal 1)',
    openedAt: '2026-10-10 08:00:00',
    status: 'OPEN',
    openingFloat: 5000,
    totalCashCollected: 18450,
    totalUpiCollected: 34800,
    totalCardCollected: 22150,
    totalRoomFolioCollected: 9600,
    totalNetSales: 85000,
    expectedCashInDrawer: 23450,
    actualCashCounted: 23450,
    cashVariance: 0,
    totalBillsSettled: 34,
    notes: 'Shift running smoothly. All morning tables cleared and reconciled.',
  };
  res.json({ success: true, data: report });
};

// 8. Accounting & GST Report
export const getAccountingReport = async (req: Request, res: Response) => {
  const report = {
    date: '2026-10-10',
    grossSales: 92850,
    discountsApplied: 4250,
    netTaxableSales: 84380,
    cgstAmount: 2109.5,
    sgstAmount: 2109.5,
    serviceChargeAmount: 4219.0,
    totalNetRevenue: 92818,
    cogsEstimated: 24470,
    grossOperatingMargin: 68348,
    paymentBreakdown: {
      cash: 18450,
      upi: 34800,
      card: 22150,
      roomCharge: 9600,
    },
    topSellingCategories: [
      { category: 'Woodfired Pizzas', revenue: 24500, orders: 48 },
      { category: 'Tandoor & Starters', revenue: 21200, orders: 42 },
      { category: 'Main Course Veg', revenue: 19800, orders: 39 },
      { category: 'Beverages & Mocktails', revenue: 11200, orders: 56 },
    ],
  };
  res.json({ success: true, data: report });
};

// 9. System Logs & Audit
export const getSystemLogs = async (req: Request, res: Response) => {
  res.json({ success: true, count: systemLogs.length, data: systemLogs });
};
