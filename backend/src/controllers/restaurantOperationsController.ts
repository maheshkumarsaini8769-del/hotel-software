import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { io } from '../index';
import { Tenant } from '../models/Tenant';

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

let operationalSettings = {
  cgstPercent: 2.5,
  sgstPercent: 2.5,
  serviceChargePercent: 5.0,
  autoPrintKot: true,
  kotSoundAlert: true,
  roundOffBills: true,
  smsReceipts: true,
  whatsappReceipts: true,
  autoCloseShiftTime: '02:00 AM',
  billFooterNote: 'Thank you for dining with us! Visit again. All prices subject to 5% GST.',
  currency: 'INR',
  currencySymbol: '₹',
};

let hotelPolicies = {
  // PMS Front Desk & Room Policies
  checkInTime: '14:00',
  checkOutTime: '11:00',
  gracePeriodMinutes: 60,
  earlyCheckInChargePercent: 50,
  lateCheckOutChargePercent: 50,
  cancellationFreeHours: 48,
  cancellationPenaltyPercent: 50,
  cancellationStrictHours: 24,
  securityDepositPerNight: 2000,
  maxKeycardsPerRoom: 2,

  // Taxation & Financial Slabs
  roomGstUnderThresholdPercent: 12,
  roomGstAboveThresholdPercent: 18,
  roomGstTariffThreshold: 7500,
  restaurantGstPercent: 5,
  serviceChargePercent: 5,

  // F&B & KDS Policies
  minInRoomDiningOrderAmount: 300,
  inRoomDiningDeliverySlaMinutes: 30,
  tableTurnoverLimitMinutes: 90,
  kotVoidManagerPinThreshold: 500,
  waiterMaxDiscountPercent: 0,
  managerMaxDiscountPercent: 10,

  // Cashier & Night Audit Policies
  openingCashFloatAmount: 5000,
  cashierVarianceToleranceAmount: 0,
  cashierVarianceAlertThreshold: 100,
  nightAuditExecutionWindow: '02:00 AM - 04:00 AM',

  // Housekeeping & Vault Policies
  housekeepingTurnaroundSlaMinutes: 25,
  lostAndFoundStandardRetentionDays: 90,
  lostAndFoundValuableRetentionDays: 180,
  nonSmokingFineAmount: 5000,
  petSanitationFeePerNight: 1500,
  maxTablesPerWaiter: 6,
  updatedAt: new Date().toISOString(),
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

let vouchers = [
  {
    id: 'vc-1',
    code: 'WELCOME10',
    description: '10% Welcome Discount for New Diners',
    discountType: 'PERCENT',
    discountValue: 10,
    minBillAmount: 500,
    maxDiscountCap: 250,
    usageLimit: 500,
    timesUsed: 42,
    validUntil: '2026-12-31',
    isActive: true,
  },
  {
    id: 'vc-2',
    code: 'FLAT100',
    description: 'Flat ₹100 Off on Family Dining Bills',
    discountType: 'FLAT',
    discountValue: 100,
    minBillAmount: 800,
    maxDiscountCap: 100,
    usageLimit: 1000,
    timesUsed: 68,
    validUntil: '2026-11-30',
    isActive: true,
  },
  {
    id: 'vc-3',
    code: 'FESTIVE20',
    description: 'Festive Season 20% Special Promotion',
    discountType: 'PERCENT',
    discountValue: 20,
    minBillAmount: 1200,
    maxDiscountCap: 500,
    usageLimit: 200,
    timesUsed: 19,
    validUntil: '2026-10-31',
    isActive: true,
  },
  {
    id: 'vc-4',
    code: 'ROYAL500',
    description: 'Banquet & VIP Suite Privilege Voucher',
    discountType: 'FLAT',
    discountValue: 500,
    minBillAmount: 3000,
    maxDiscountCap: 500,
    usageLimit: 50,
    timesUsed: 7,
    validUntil: '2026-12-31',
    isActive: true,
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
      const addressStr = typeof tenant.address === 'object' && tenant.address
        ? [tenant.address.street, tenant.address.city, tenant.address.state, tenant.address.pincode].filter(Boolean).join(', ')
        : (tenant.address || restaurantInfo.address);

      restaurantInfo = {
        ...restaurantInfo,
        name: tenant.name || restaurantInfo.name,
        tagline: tenant.tagline || restaurantInfo.tagline,
        logoUrl: tenant.logoUrl || restaurantInfo.logoUrl,
        coverImageUrl: tenant.coverImageUrl || restaurantInfo.coverImageUrl,
        stayImageUrl: (tenant as any).stayImageUrl || (restaurantInfo as any).stayImageUrl || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200&auto=format&fit=crop&q=80',
        diningImageUrl: (tenant as any).diningImageUrl || (restaurantInfo as any).diningImageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80',
        coordinates: (tenant as any).coordinates || { latitude: 26.9124, longitude: 75.7873 },
        photos: Array.isArray(tenant.photos) && tenant.photos.length > 0 ? tenant.photos : restaurantInfo.photos,
        contactPhone: tenant.contactPhone || restaurantInfo.contactPhone,
        contactEmail: tenant.contactEmail || restaurantInfo.contactEmail,
        gstin: tenant.gstin || restaurantInfo.gstin,
        fssaiNumber: tenant.fssai || restaurantInfo.fssaiNumber,
        wifiSsid: (tenant as any).wifiSsid || restaurantInfo.wifiSsid || 'TajGateway_HighSpeed',
        wifiPassword: (tenant as any).wifiPassword || restaurantInfo.wifiPassword || 'SpiceGuest@2026',
        address: addressStr || restaurantInfo.address,
      };
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
      if (req.body.coordinates !== undefined) updateData.coordinates = req.body.coordinates;
      if (req.body.photos !== undefined) {
        updateData.photos = Array.isArray(req.body.photos) ? req.body.photos : [];
      }
      if (req.body.contactPhone) updateData.contactPhone = String(req.body.contactPhone).trim();
      if (req.body.contactEmail) updateData.contactEmail = String(req.body.contactEmail).trim();
      if (req.body.gstin) updateData.gstin = String(req.body.gstin).trim();
      if (req.body.fssaiNumber) updateData.fssai = String(req.body.fssaiNumber).trim();
      if (req.body.wifiSsid !== undefined) updateData.wifiSsid = String(req.body.wifiSsid).trim();
      if (req.body.wifiPassword !== undefined) updateData.wifiPassword = String(req.body.wifiPassword).trim();

      const updatedTenant = await Tenant.findByIdAndUpdate(tenant._id, { $set: updateData }, { new: true });

      if (updatedTenant && io) {
        io.emit('tenant:updated', {
          id: updatedTenant._id.toString(),
          slug: updatedTenant.slug,
          name: updatedTenant.name,
          logoUrl: updatedTenant.logoUrl,
          coverImageUrl: updatedTenant.coverImageUrl,
          tagline: updatedTenant.tagline,
          wifiSsid: (updatedTenant as any).wifiSsid,
          wifiPassword: (updatedTenant as any).wifiPassword,
          photos: updatedTenant.photos,
        });
      }
    }

    io?.emit('restaurant:info_updated', restaurantInfo);
    res.json({ success: true, message: 'Restaurant information updated successfully', data: restaurantInfo });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 2. Operational Settings
export const getOperationalSettings = async (req: Request, res: Response) => {
  res.json({ success: true, data: operationalSettings });
};

export const updateOperationalSettings = async (req: Request, res: Response) => {
  try {
    operationalSettings = { ...operationalSettings, ...req.body };
    io?.emit('settings:updated', operationalSettings);
    res.json({ success: true, message: 'Settings updated successfully', data: operationalSettings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 2b. Authoritative Hotel Operational Policies & Compliance Rules
export const getHotelPolicies = async (req: Request, res: Response) => {
  res.json({ success: true, count: Object.keys(hotelPolicies).length, data: hotelPolicies });
};

export const updateHotelPolicies = async (req: Request, res: Response) => {
  try {
    hotelPolicies = { ...hotelPolicies, ...req.body, updatedAt: new Date().toISOString() };
    io?.emit('policies:updated', hotelPolicies);
    res.json({
      success: true,
      message: 'Hotel operational policies successfully updated and synchronized across all portals',
      data: hotelPolicies,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
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
    const newVoucher = {
      id: `vc-${Date.now()}`,
      code: req.body.code ? req.body.code.toUpperCase().trim() : `SAVE${Math.floor(Math.random() * 900 + 100)}`,
      description: req.body.description || 'Special Promotion Voucher',
      discountType: req.body.discountType || 'PERCENT',
      discountValue: Number(req.body.discountValue) || 10,
      minBillAmount: Number(req.body.minBillAmount) || 500,
      maxDiscountCap: Number(req.body.maxDiscountCap) || 200,
      usageLimit: Number(req.body.usageLimit) || 100,
      timesUsed: 0,
      validUntil: req.body.validUntil || '2026-12-31',
      isActive: true,
    };
    vouchers.push(newVoucher);
    res.status(201).json({ success: true, message: 'Voucher created successfully', data: newVoucher });
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
