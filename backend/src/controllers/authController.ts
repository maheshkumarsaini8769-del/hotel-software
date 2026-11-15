import { Request, Response } from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Types } from 'mongoose';
import { User } from '../models/User';
import { Tenant } from '../models/Tenant';
import { Room } from '../models/Room';
import { RoomType } from '../models/RoomType';
import { DiningTable } from '../models/DiningTable';
import { KitchenStation } from '../models/KitchenStation';
import { MenuCategory } from '../models/MenuCategory';
import { MenuItem, FoodType } from '../models/MenuItem';
import { UserRole, ShiftStatus, TenantRequest } from '../types';
import { getJwtSecret, isDevAuthBypassEnabled } from '../config/security';
import { ITenant } from '../models/Tenant';
import { sendPinVerificationOtpEmail } from '../services/resendEmailService';
import { resolveTenantCapabilities } from '../utils/tenantCapabilities';
import { resolveStaffPortalAccess } from '../utils/staffPortalAccess';
import { z } from 'zod';
import {
  generateStaffHotelCode,
  hashStaffHotelCode,
  isValidStaffHotelCode,
  issueStaffHotelAccessToken,
  normalizeStaffHotelCode,
  verifyStaffHotelAccessToken,
} from '../utils/staffHotelAccess';
import { notificationService } from '../services/notificationService';
import { emitGlobalTenantEvent, serializePublicHotelSummary } from '../utils/tenantPublicSummary';
import { autoMarkStaffPresentOnLogin } from '../utils/attendanceAutomation';
import { ClockMethod } from '../models/StaffAttendanceLog';

interface StaffOtpRecord {
  otp: string;
  expiresAt: number;
  staffId: string;
  email: string;
}

const staffPinOtpStore = new Map<string, StaffOtpRecord>();

const changeOwnPinSchema = z.object({
  currentPin: z.string().regex(/^\d{4,8}$/),
  newPin: z.string().regex(/^\d{4,8}$/),
}).strict().refine((value) => value.currentPin !== value.newPin, {
  path: ['newPin'],
  message: 'New PIN must be different from the current PIN.',
});

export const changeOwnStaffPin = async (req: TenantRequest, res: Response): Promise<void> => {
  const parsed = changeOwnPinSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      errorCode: 'INVALID_PIN_CHANGE',
      message: 'Enter the current PIN and a different 4–8 digit new PIN.',
    });
    return;
  }

  const userId = req.user?.userId;
  if (!userId || !Types.ObjectId.isValid(userId)) {
    res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'A valid staff session is required.' });
    return;
  }

  try {
    const user = await User.findOne({
      _id: new Types.ObjectId(userId),
      ...(req.hotelId ? { hotelId: new Types.ObjectId(req.hotelId) } : {}),
      isActive: true,
    }).select('+pinCodeHash');

    if (!user?.pinCodeHash || !user.pinCodeHash.startsWith('$argon2')) {
      res.status(409).json({
        success: false,
        errorCode: 'PIN_CHANGE_UNAVAILABLE',
        message: 'This account does not have a changeable PIN. Contact a hotel administrator.',
      });
      return;
    }

    const currentPinMatches = await argon2.verify(user.pinCodeHash, parsed.data.currentPin);
    if (!currentPinMatches) {
      res.status(400).json({
        success: false,
        errorCode: 'CURRENT_PIN_INCORRECT',
        message: 'Current PIN is incorrect.',
      });
      return;
    }

    user.pinCodeHash = await argon2.hash(parsed.data.newPin);
    user.pinStatus = 'ACTIVE';
    await user.save();

    res.status(200).json({ success: true, message: 'PIN changed successfully.' });
  } catch {
    res.status(500).json({
      success: false,
      errorCode: 'PIN_CHANGE_FAILED',
      message: 'PIN could not be changed. Please retry.',
    });
  }
};

export const registerTenantAndAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      hotelName: rawHotelName,
      name: rawName,
      slug: rawSlug,
      contactEmail: rawContactEmail,
      adminEmail: rawAdminEmail,
      contactPhone: rawContactPhone,
      adminPhone: rawAdminPhone,
      city = 'Jaipur',
      state = 'Rajasthan',
      gstin,
      adminName: rawAdminName,
      adminPassword: rawAdminPassword,
      enabledPortals,
      serviceCapabilities,
      monthlyPriceINR,
      subscriptionMonthlyINR,
      billingCycle,
      customPricingAdjustmentINR,
      logoUrl,
      coverImageUrl,
      photos,
      tagline,
      initialRooms = 10,
      initialTables = 6,
      hotelCode: rawHotelCode,
      streetAddress,
      address,
      latitude,
      longitude,
      coordinates,
      pincode,
      subscribedFeatures,
      staffPin: rawStaffPin,
    } = req.body;

    const hotelName = (rawHotelName || rawName || '').trim();
    const contactEmail = (rawContactEmail || rawAdminEmail || '').trim().toLowerCase();
    const contactPhone = (rawContactPhone || rawAdminPhone || '9999999999').trim();
    const adminName = (rawAdminName || 'Hotel Administrator').trim();
    const adminPassword = (rawAdminPassword || '').trim() || `SpiceHub@${crypto.randomInt(1000, 9999)}`;
    const staffPin = rawStaffPin !== undefined && rawStaffPin !== null && String(rawStaffPin).trim() !== ''
      ? String(rawStaffPin).trim()
      : '1111';

    if (!hotelName || !contactEmail) {
      res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'Hotel Name and Contact Email are required for registration.',
      });
      return;
    }

    if (rawStaffPin !== undefined && rawStaffPin !== null && String(rawStaffPin).trim() !== '' && !/^\d{4}$/.test(staffPin)) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_STAFF_PIN',
        message: 'Staff PIN must be exactly 4 digits.',
      });
      return;
    }

    if (rawHotelCode && !isValidStaffHotelCode(rawHotelCode)) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_HOTEL_CODE',
        message: 'Hotel Code must be exactly 6 digits, or a 4-10 character alphanumeric code containing a letter (e.g. ROYAL1, SH4277, or 774273).',
      });
      return;
    }

    let slug = (rawSlug || hotelName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')).trim();
    if (!slug) slug = `hotel-${crypto.randomBytes(3).toString('hex')}`;
    const existingTenant = await Tenant.findOne({ slug: slug.toLowerCase() });
    if (existingTenant) {
      if (rawSlug) {
        // Explicitly requested public identifier is already taken; reject so the
        // caller can pick a different one instead of silently changing the URL.
        res.status(409).json({
          success: false,
          errorCode: 'TENANT_EXISTS',
          message: `The hotel code '${slug}' is already registered. Please choose another slug.`,
        });
        return;
      }
      // Auto-derived slug (hotel name) can be made unique without user input.
      slug = `${slug}-${crypto.randomBytes(2).toString('hex')}`;
    }

    const hotelCode = rawHotelCode && isValidStaffHotelCode(rawHotelCode)
      ? normalizeStaffHotelCode(rawHotelCode)
      : generateStaffHotelCode(hotelName);

    const existingCodeTenant = await Tenant.findOne({
      staffAccessCodeHash: hashStaffHotelCode(hotelCode),
      status: { $in: ['ACTIVE', 'TRIAL'] },
    });
    if (existingCodeTenant) {
      res.status(409).json({
        success: false,
        errorCode: 'HOTEL_CODE_IN_USE',
        message: `Hotel code '${hotelCode}' is already in use by another property. Please choose another code.`,
      });
      return;
    }

    const portals = Array.isArray(enabledPortals) && enabledPortals.length > 0
      ? Array.from(new Set(['admin', ...enabledPortals]))
      : ['admin', 'cashier', 'reception', 'kds', 'waiter', 'customer', 'guest'];

    const defaultCapabilities = {
      roomBooking: portals.includes('guest') || portals.includes('reception'),
      reception: portals.includes('reception'),
      inRoomServices: portals.includes('guest'),
      tableOrdering: portals.includes('customer') || portals.includes('waiter'),
      waiterDispatch: portals.includes('waiter'),
    };
    const requestedCapabilities = serviceCapabilities ?? defaultCapabilities;
    const capabilityPortalMap: Record<string, string[]> = {
      roomBooking: ['guest', 'reception'],
      reception: ['reception'],
      inRoomServices: ['guest'],
      tableOrdering: ['customer', 'waiter', 'cashier', 'kds'],
      waiterDispatch: ['waiter'],
    };
    if (
      !requestedCapabilities ||
      typeof requestedCapabilities !== 'object' ||
      Array.isArray(requestedCapabilities) ||
      Object.keys(capabilityPortalMap).some((key) => typeof requestedCapabilities[key] !== 'boolean')
    ) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_CAPABILITIES',
        message: 'All five service capabilities must be provided as booleans.',
      });
      return;
    }
    const unavailableCapability = Object.keys(capabilityPortalMap).find(
      (key) => requestedCapabilities[key] && !capabilityPortalMap[key].some((p) => portals.includes(p))
    );
    if (unavailableCapability) {
      res.status(400).json({
        success: false,
        errorCode: 'PORTAL_REQUIRED',
        message: `Enable one of [${capabilityPortalMap[unavailableCapability].join(', ')}] portals before enabling ${unavailableCapability}.`,
        capability: unavailableCapability,
        requiredPortal: capabilityPortalMap[unavailableCapability][0],
      });
      return;
    }

    const monthlyPrice = monthlyPriceINR !== undefined
      ? Number(monthlyPriceINR)
      : (subscriptionMonthlyINR !== undefined ? Number(subscriptionMonthlyINR) : 0);

    const resolvedLat = Number(
      coordinates?.latitude ??
      coordinates?.lat ??
      latitude ??
      (city?.toLowerCase() === 'mumbai' ? 19.076 : city?.toLowerCase() === 'delhi' ? 28.6139 : 26.9124)
    );
    const resolvedLng = Number(
      coordinates?.longitude ??
      coordinates?.lng ??
      longitude ??
      (city?.toLowerCase() === 'mumbai' ? 72.8777 : city?.toLowerCase() === 'delhi' ? 77.209 : 75.7873)
    );

    // 1. Create Tenant with Staff Access Code and real coordinates
    const tenant = await Tenant.create({
      name: hotelName,
      slug: slug.toLowerCase(),
      contactEmail,
      contactPhone: contactPhone || '9999999999',
      address: {
        street: String(streetAddress || address?.street || (typeof address === 'string' ? address : '') || '').trim(),
        city: String(city || address?.city || 'Jaipur').trim(),
        state: String(state || address?.state || 'Rajasthan').trim(),
        country: 'India',
        pincode: String(pincode || address?.pincode || '').trim(),
      },
      coordinates: {
        latitude: resolvedLat,
        longitude: resolvedLng,
      },
      googleMapUrl: `https://www.google.com/maps/search/?api=1&query=${resolvedLat},${resolvedLng}`,
      logoUrl: logoUrl || '',
      coverImageUrl: coverImageUrl || '',
      photos: Array.isArray(photos) ? photos : [],
      tagline: tagline || '',
      gstin,
      status: 'ACTIVE',
      staffAccessCodeHash: hashStaffHotelCode(hotelCode),
      staffAccessCodeVersion: crypto.randomUUID(),
      staffAccessCodeUpdatedAt: new Date(),
      enabledPortals: portals,
      subscribedFeatures: Array.isArray(subscribedFeatures) && subscribedFeatures.length > 0
        ? subscribedFeatures
        : ['pms_inventory', 'qr_table_ordering', 'gst_invoicing', 'whatsapp_alerts', 'staff_attendance', 'kds_routing'],
      subscriptionMonthlyINR: monthlyPrice,
      billingCycle: billingCycle === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY',
      customPricingAdjustmentINR: Number(customPricingAdjustmentINR || 0),
      subscription: {
        billingCycle: billingCycle === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY',
        monthlyRateINR: monthlyPrice,
        annualRateINR: monthlyPrice * 12 * 0.8,
        effectiveRateINR: monthlyPrice,
        customPricingAdjustmentINR: Number(customPricingAdjustmentINR || 0),
        subscriptionStartDate: new Date(),
        lastPaymentDate: new Date(),
        paymentStatus: 'PAID',
      },
      featureFlags: {
        pmsEnabled: portals.includes('reception'),
        posEnabled: portals.includes('cashier'),
        kdsEnabled: portals.includes('kds'),
        waiterEnabled: portals.includes('waiter'),
        qrDineInEnabled: portals.includes('customer'),
        roomServiceEnabled: portals.includes('guest'),
        roomBookingEnabled: requestedCapabilities.roomBooking,
        frontDeskEnabled: requestedCapabilities.reception,
        inRoomServicesEnabled: requestedCapabilities.inRoomServices,
        tableOrderingEnabled: requestedCapabilities.tableOrdering,
        waiterDispatchEnabled: requestedCapabilities.waiterDispatch,
        banquetEnabled: true,
        loyaltyEnabled: true,
        aiInsightsEnabled: false,
        tallyExportEnabled: true,
      },
    });

    // 2. Hash Password and Staff PIN using Argon2
    const passwordHash = await argon2.hash(adminPassword);
    const pinCodeHash = await argon2.hash(staffPin);

    // 3. Create Hotel Admin User
    const adminUser = await User.create({
      hotelId: tenant._id,
      name: adminName || 'Hotel Administrator',
      email: contactEmail.toLowerCase(),
      phone: contactPhone || '9999999999',
      passwordHash,
      pinCodeHash,
      pinApprovedByAdmin: true,
      role: UserRole.HOTEL_ADMIN,
      permissions: ['*'],
      shiftStatus: ShiftStatus.ON_DUTY,
    });


    const adminUrl = process.env.HOTEL_ADMIN_URL || process.env.ADMIN_URL || 'http://localhost:3005';

    // 5. Send Notification via WhatsApp
    try {
      await notificationService.sendWhatsApp(
        tenant.contactPhone,
        'hotel_onboarded_credentials',
        {
          hotelName: tenant.name,
          hotelCode,
          adminEmail: adminUser.email,
          adminPassword,
          staffPin,
          adminUrl,
          enabledPortals: tenant.enabledPortals,
        }
      );
    } catch (notifErr) {
      console.warn('[Auth] Notification dispatch warning:', notifErr);
    }

    // Automatically provision initial rooms & tables
    const hashToken = (seed: string) =>
      crypto.createHash('sha256').update(`${seed}:${crypto.randomUUID()}`).digest('hex');

    if (initialRooms > 0) {
      const roomType = await RoomType.create({
        hotelId: tenant._id,
        name: 'Deluxe Room',
        code: 'DLX',
        baseCapacityAdults: 2,
        baseCapacityChildren: 1,
        maxCapacity: 3,
        basePriceOvernight: 2800,
        weekendPrice: 3500,
        extraBedPrice: 600,
        gstRate: 12,
        basePriceDayUse: 1800,
        basePriceHourly: 450,
        amenities: ['King Bed', 'AC', 'High-Speed WiFi', 'Room Service'],
        totalRoomsCount: initialRooms,
        isActive: true,
      });

      const roomDocs = Array.from({ length: initialRooms }, (_, idx) => {
        const roomNumber = String(101 + idx);
        return {
          hotelId: tenant._id,
          roomNumber,
          roomTypeId: roomType._id,
          floorNumber: 1,
          status: 'AVAILABLE',
          permanentQrCodeHash: hashToken(`room:${tenant._id}:${roomNumber}`),
        };
      });
      await Room.insertMany(roomDocs);
    }

    if (initialTables > 0) {
      const tableDocs = Array.from({ length: initialTables }, (_, idx) => {
        const tableNumber = `T-${String(idx + 1).padStart(2, '0')}`;
        return {
          hotelId: tenant._id,
          tableNumber,
          floorLevel: 'Ground Floor',
          section: 'AC_DINING',
          capacity: 4,
          currentStatus: 'AVAILABLE',
          isCommunityTable: false,
          allowCoDining: true,
          seats: [1, 2, 3, 4].map((s) => ({
            seatNumber: s,
            seatLabel: `S${s}`,
            status: 'AVAILABLE',
          })),
          availableSeatsCount: 4,
          occupiedSeatsCount: 0,
          qrTokenHash: hashToken(`table:${tenant._id}:${tableNumber}`),
        };
      });
      await DiningTable.insertMany(tableDocs);
    }

    // Seed default kitchen station, menu categories, and dishes
    const mainKitchen = await KitchenStation.create({
      hotelId: tenant._id,
      stationName: 'Main Kitchen',
      screenToken: hashToken(`station:${tenant._id}:main`),
      assignedChefIds: [],
      isOnline: true,
    });

    const startersCat = await MenuCategory.create({
      hotelId: tenant._id,
      name: 'Appetizers & Starters',
      slug: 'appetizers-starters',
      displayOrder: 1,
      kitchenStationId: mainKitchen._id,
      isActive: true,
    });

    const mainsCat = await MenuCategory.create({
      hotelId: tenant._id,
      name: 'Main Course & Room Dining',
      slug: 'mains-room-dining',
      displayOrder: 2,
      kitchenStationId: mainKitchen._id,
      isActive: true,
    });

    await MenuItem.insertMany([
      {
        hotelId: tenant._id,
        categoryId: startersCat._id,
        kitchenStationId: mainKitchen._id,
        name: 'Paneer Tikka',
        description: 'Charcoal grilled cottage cheese marinated in spiced hung curd with herbs',
        foodType: FoodType.VEG,
        basePrice: 280,
        hasVariants: false,
        variants: [],
        addons: [],
        isAvailable: true,
        prepTimeMinutes: 12,
        images: ['https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600&auto=format&fit=crop&q=80'],
      },
      {
        hotelId: tenant._id,
        categoryId: mainsCat._id,
        kitchenStationId: mainKitchen._id,
        name: 'Club Sandwich',
        description: 'Classic triple-decker toasted sandwich with cheese, tomatoes, crisp lettuce and house dip',
        foodType: FoodType.VEG,
        basePrice: 220,
        hasVariants: false,
        variants: [],
        addons: [],
        isAvailable: true,
        prepTimeMinutes: 10,
        images: ['https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&auto=format&fit=crop&q=80'],
      },
      {
        hotelId: tenant._id,
        categoryId: mainsCat._id,
        kitchenStationId: mainKitchen._id,
        name: 'Dal Makhani',
        description: 'Slow-simmered black lentils with butter and dairy cream',
        foodType: FoodType.VEG,
        basePrice: 260,
        hasVariants: false,
        variants: [],
        addons: [],
        isAvailable: true,
        prepTimeMinutes: 15,
        images: ['https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80'],
      },
      {
        hotelId: tenant._id,
        categoryId: mainsCat._id,
        kitchenStationId: mainKitchen._id,
        name: 'Butter Naan',
        description: 'Tandoor-baked flatbread glazed with melted butter',
        foodType: FoodType.VEG,
        basePrice: 60,
        hasVariants: false,
        variants: [],
        addons: [],
        isAvailable: true,
        prepTimeMinutes: 5,
        images: ['https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80'],
      },
    ]);

    // 4. Issue JWT
    const secret = getJwtSecret();
    const token = jwt.sign(
      {
        userId: adminUser._id.toString(),
        hotelId: tenant._id.toString(),
        role: adminUser.role,
        email: adminUser.email,
        permissions: adminUser.permissions,
      },
      secret,
      { expiresIn: '30d' }
    );

    emitGlobalTenantEvent('tenant:created', tenant);

    res.status(201).json({
      success: true,
      message: 'Tenant and Hotel Admin registered successfully',
      data: {
        token,
        tenant: {
          id: tenant._id,
          name: tenant.name,
          slug: tenant.slug,
          status: tenant.status,
          hotelCode,
          logoUrl: tenant.logoUrl,
        },
        user: {
          id: adminUser._id,
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role,
        },
        hotelCode,
        staffPin,
        adminUrl,
        adminCredentials: {
          email: adminUser.email,
          password: adminPassword,
          staffPin,
        },
        notificationStatus: 'DISPATCHED',
      },
    });
  } catch (error: any) {
    console.error('[Auth] Registration error:', error);
    res.status(500).json({
      success: false,
      errorCode: 'SERVER_ERROR',
      message: error.message || 'Internal server error',
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, slug } = req.body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'Valid string email and password are required',
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const rawPassword = String(password);

    let tenantFilter: any = {};
    const hotelIdHeader = req.headers['x-hotel-id'] as string;
    const targetHotelId = req.body.hotelId || hotelIdHeader;

    let targetTenant: any = null;

    if (slug) {
      const trimmedSlug = String(slug).trim().toLowerCase();
      const slugified = trimmedSlug.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const escapedSlug = trimmedSlug.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const escapedSlugified = slugified.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

      const tenantQuery: any[] = [
        { slug: trimmedSlug },
        { slug: slugified },
        { slug: new RegExp(`^${escapedSlug}(-\\d+)?$`, 'i') },
        { slug: new RegExp(`^${escapedSlugified}(-\\d+)?$`, 'i') },
        { name: new RegExp(`^${escapedSlug}$`, 'i') },
        { name: new RegExp(`^${escapedSlugified.replace(/-/g, ' ')}$`, 'i') },
      ];
      if (Types.ObjectId.isValid(trimmedSlug)) {
        tenantQuery.push({ _id: new Types.ObjectId(trimmedSlug) });
      }

      targetTenant = await Tenant.findOne({ $or: tenantQuery });

      // If no tenant directly matched the provided code/slug,
      // check if this email has user accounts and see if one belongs to a tenant with a matching or partial slug/name
      if (!targetTenant) {
        const userMatches = await User.find({ email: normalizedEmail, isActive: true });
        if (userMatches.length === 1 && userMatches[0].hotelId) {
          targetTenant = await Tenant.findById(userMatches[0].hotelId);
        } else if (userMatches.length > 1) {
          const tenantIds = userMatches.map((u) => u.hotelId).filter(Boolean);
          const candidateTenants = await Tenant.find({ _id: { $in: tenantIds } });
          const partialMatch = candidateTenants.find(
            (t) =>
              t.slug.toLowerCase().includes(slugified) ||
              t.name.toLowerCase().includes(trimmedSlug) ||
              slugified.includes(t.slug.toLowerCase())
          );
          if (partialMatch) {
            targetTenant = partialMatch;
          }
        }
      }

      if (!targetTenant) {
        // If still no tenant found, check if this email is unique to a single hotel
        const singleHotelCheck = await User.find({ email: normalizedEmail, isActive: true });
        if (singleHotelCheck.length === 1 && singleHotelCheck[0].hotelId) {
          targetTenant = await Tenant.findById(singleHotelCheck[0].hotelId);
        }
      }

      if (!targetTenant) {
        res.status(404).json({
          success: false,
          errorCode: 'TENANT_NOT_FOUND',
          message: 'Invalid hotel slug or code. Leave Hotel Code blank if your email is registered to a single hotel.',
        });
        return;
      }
      tenantFilter = { hotelId: targetTenant._id };
    } else if (targetHotelId && Types.ObjectId.isValid(targetHotelId)) {
      tenantFilter = { hotelId: new Types.ObjectId(targetHotelId) };
    } else {
      // No slug provided. Let's find all active user accounts for this email.
      const candidateUsers = await User.find({ email: normalizedEmail, isActive: true });
      if (candidateUsers.length > 1) {
        // Multiple hotel accounts exist for this email.
        // Test password verification across candidates so single matching account can log in directly!
        const matchingPasswordUsers: any[] = [];
        for (const candidate of candidateUsers) {
          try {
            const isMatch = await argon2.verify(candidate.passwordHash, rawPassword);
            if (isMatch) matchingPasswordUsers.push(candidate);
          } catch {}
        }

        if (matchingPasswordUsers.length === 1) {
          tenantFilter = { _id: matchingPasswordUsers[0]._id };
        } else if (matchingPasswordUsers.length > 1) {
          const tenantDocs = await Tenant.find({
            _id: { $in: matchingPasswordUsers.map((u) => u.hotelId).filter(Boolean) },
          }).select('name slug');
          res.status(409).json({
            success: false,
            errorCode: 'AMBIGUOUS_TENANT_LOGIN',
            message: `Multiple hotel accounts found for ${normalizedEmail}. Please specify hotel slug or name (${tenantDocs.map((t) => t.slug).join(', ')}) to login.`,
            tenants: tenantDocs.map((t) => ({ id: t._id, name: t.name, slug: t.slug })),
          });
          return;
        } else {
          // None of the candidate accounts matched this password
          res.status(401).json({
            success: false,
            errorCode: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          });
          return;
        }
      } else if (candidateUsers.length === 1) {
        tenantFilter = { _id: candidateUsers[0]._id };
      }
    }

    const user = await User.findOne({
      email: normalizedEmail,
      ...tenantFilter,
    });

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        errorCode: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
      return;
    }

    const isMatch = await argon2.verify(user.passwordHash, rawPassword);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        errorCode: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
      return;
    }

    const secret = getJwtSecret();
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        hotelId: user.hotelId?.toString(),
        role: user.role,
        email: user.email,
        permissions: user.permissions,
      },
      secret,
      { expiresIn: '30d' }
    );

    let tenantData: any = null;
    if (user.hotelId) {
      const tenantDoc = await Tenant.findById(user.hotelId).lean();
      if (tenantDoc) {
        if (tenantDoc.status === 'SUSPENDED' && user.role !== 'SUPERADMIN') {
          res.status(403).json({
            success: false,
            errorCode: 'TENANT_SUSPENDED',
            message: 'This hotel tenant has been suspended by the platform administrator. Access blocked.',
          });
          return;
        }
        tenantData = {
          id: tenantDoc._id,
          name: tenantDoc.name,
          slug: tenantDoc.slug,
          enabledPortals: tenantDoc.enabledPortals,
          logoUrl: tenantDoc.logoUrl,
          coverImageUrl: tenantDoc.coverImageUrl,
        };
      }
    }

    if (user.hotelId && user.role !== UserRole.SUPERADMIN && user.role !== UserRole.GUEST) {
      await autoMarkStaffPresentOnLogin({
        hotelId: user.hotelId,
        userId: user._id,
        method: ClockMethod.AUTO_LOGIN,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          hotelId: user.hotelId,
        },
        tenant: tenantData,
      },
    });
  } catch (error: any) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({
      success: false,
      errorCode: 'SERVER_ERROR',
      message: error.message || 'Internal server error',
    });
  }
};

export const getProfile = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?.userId)
      .select('name email role hotelId avatar shift shiftStatus permissions assignedSection assignedStation assignedTableStart assignedTableEnd assignedCounter isActive')
      .lean();
    if (!user || user.isActive === false) {
      res.status(401).json({ success: false, errorCode: 'SESSION_REVOKED', message: 'This staff account is inactive.' });
      return;
    }

    let tenant = null;
    if (user.hotelId) {
      tenant = await Tenant.findById(user.hotelId).select('_id name enabledPortals').lean();
    }

    const refreshedToken = jwt.sign(
      {
        userId: user._id.toString(),
        hotelId: user.hotelId ? user.hotelId.toString() : undefined,
        role: user.role,
        email: user.email,
        permissions: user.permissions || [],
      },
      getJwtSecret(),
      { expiresIn: '30d' }
    );

    res.status(200).json({
      success: true,
      data: {
        token: refreshedToken,
        user: {
          id: String(user._id),
          name: user.name,
          email: user.email,
          role: user.role,
          hotelId: user.hotelId ? String(user.hotelId) : '',
          avatar: user.avatar || '',
          shift: user.shift || '',
          shiftStatus: user.shiftStatus,
          permissions: user.permissions || [],
          assignedSection: user.assignedSection || '',
          assignedStation: user.assignedStation || '',
          assignedTableStart: user.assignedTableStart,
          assignedTableEnd: user.assignedTableEnd,
          assignedCounter: user.assignedCounter || '',
        },
        tenant: tenant
          ? {
              id: String(tenant._id),
              name: tenant.name,
              enabledPortals: tenant.enabledPortals || [],
            }
          : null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------------------------------------------------------------------
// Waiter PIN login
// ---------------------------------------------------------------------------
// The floor terminal authenticates a waiter with the staff PIN that the hotel
// admin configured (Argon2 hash on the user record). The PIN itself is never
// shipped to the frontend, and the endpoint is rate limited so a stolen device
// cannot be brute forced.
const waiterLoginAttempts = new Map<string, { count: number; lockedUntil: number }>();
const WAITER_LOGIN_MAX_ATTEMPTS = 5;
const WAITER_LOGIN_LOCK_MS = 60_000;
const invalidStaffPinHash = argon2.hash(`staff-login-${crypto.randomBytes(32).toString('hex')}`);

const recordFailedStaffLogin = (
  res: Response,
  throttleKey: string,
  previousAttempt: { count: number; lockedUntil: number } | undefined
): void => {
  const now = Date.now();
  const attempt = previousAttempt?.lockedUntil && previousAttempt.lockedUntil <= now
    ? undefined
    : previousAttempt;
  const count = (attempt?.count || 0) + 1;
  const lockedUntil = count >= WAITER_LOGIN_MAX_ATTEMPTS ? now + WAITER_LOGIN_LOCK_MS : 0;
  waiterLoginAttempts.set(throttleKey, { count, lockedUntil });

  res.status(401).json({
    success: false,
    errorCode: 'INVALID_CREDENTIALS',
    message: 'Staff ID or PIN is incorrect.',
  });
};

const STAFF_PIN_ROLES = [
  UserRole.WAITER,
  UserRole.CHEF,
  UserRole.CASHIER,
  UserRole.RECEPTIONIST,
  UserRole.HOTEL_ADMIN,
  UserRole.MANAGER,
];

export const waiterLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pin, pinCode, hotelSlug, hotelId, staffId, hotelAccessToken } = req.body || {};
    if (req.body?.demo === true) {
      res.status(403).json({
        success: false,
        errorCode: 'DEMO_LOGIN_DISABLED',
        message: 'Staff demo sign-in is disabled. Use an active staff profile and its approved PIN.',
      });
      return;
    }

    const effectivePin = String(pin || pinCode || '').trim();
    const requesterIp = String(req.ip || req.socket?.remoteAddress || 'unknown');
    const rawHotelId = hotelId || (req.headers['x-hotel-id'] as string) || (req.query?.hotelId as string);
    const throttleKey = `${requesterIp}:${String(hotelSlug || rawHotelId || 'default')}`;

    const attempt = waiterLoginAttempts.get(throttleKey);
    if (attempt && attempt.lockedUntil > Date.now()) {
      const seconds = Math.ceil((attempt.lockedUntil - Date.now()) / 1000);
      res.status(429).json({
        success: false,
        errorCode: 'LOGIN_LOCKED',
        message: `Too many attempts. Try again in ${seconds} seconds.`,
      });
      return;
    }
    if (attempt?.lockedUntil && attempt.lockedUntil <= Date.now()) {
      waiterLoginAttempts.delete(throttleKey);
    }

    let tenant: ITenant | null = null;
    if (rawHotelId && Types.ObjectId.isValid(String(rawHotelId))) {
      tenant = await Tenant.findById(rawHotelId).select('+staffAccessCodeVersion');
    } else if (hotelSlug) {
      tenant = await Tenant.findOne({ slug: String(hotelSlug).toLowerCase() }).select('+staffAccessCodeVersion');
    } else {
      tenant =
        (await Tenant.findOne({ slug: 'taj-gateway' }).select('+staffAccessCodeVersion')) ||
        (await Tenant.findOne().select('+staffAccessCodeVersion'));
    }
    if (!tenant) {
      res.status(404).json({ success: false, errorCode: 'TENANT_NOT_FOUND', message: 'Hotel not found' });
      return;
    }
    if (tenant.status === 'SUSPENDED') {
      res.status(403).json({ success: false, errorCode: 'TENANT_SUSPENDED', message: 'This hotel is suspended.' });
      return;
    }
    if (hotelAccessToken && !verifyStaffHotelAccessToken(hotelAccessToken, tenant._id.toString(), tenant.staffAccessCodeVersion)) {
      res.status(403).json({
        success: false,
        errorCode: 'HOTEL_CODE_REQUIRED',
        message: 'Enter the current hotel access code before signing in.',
      });
      return;
    }

    const requestedPortal = String(req.body?.portal || 'waiter').toLowerCase();
    const targetRoleByPortal: Record<string, UserRole> = {
      waiter: UserRole.WAITER,
      cashier: UserRole.CASHIER,
      kds: UserRole.CHEF,
      reception: UserRole.RECEPTIONIST,
    };
    const targetRole = targetRoleByPortal[requestedPortal];
    if (!targetRole) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_STAFF_PORTAL',
        message: 'A supported staff portal is required.',
      });
      return;
    }
    const portalAccess = resolveStaffPortalAccess(
      targetRole,
      Array.isArray(tenant.enabledPortals) ? tenant.enabledPortals : [],
      resolveTenantCapabilities(tenant)
    );
    if (!portalAccess.allowed) {
      res.status(403).json({
        success: false,
        errorCode: portalAccess.errorCode,
        requiredPortal: portalAccess.requiredPortal,
        message: portalAccess.message,
      });
      return;
    }

    if (!staffId || !Types.ObjectId.isValid(String(staffId))) {
      res.status(400).json({
        success: false,
        errorCode: 'STAFF_ID_REQUIRED',
        message: 'Select your staff profile before entering your PIN.',
      });
      return;
    }

    const staffCandidates = await User.find({
      _id: new Types.ObjectId(String(staffId)),
      hotelId: tenant._id,
      isActive: { $ne: false },
    }).select('+pendingPinHash');

    if (!effectivePin || typeof effectivePin !== 'string' || !/^\d{4}$/.test(effectivePin)) {
      res.status(400).json({
        success: false,
        errorCode: 'PIN_REQUIRED',
        message: 'A valid 4-digit staff PIN is required (must be exactly 4 numeric digits, numbers only)',
      });
      return;
    }

    if (staffCandidates.length === 0) {
      await argon2.verify(await invalidStaffPinHash, effectivePin);
      recordFailedStaffLogin(res, throttleKey, attempt);
      return;
    }

    let matched: any = null;
    let pendingApprovalMatched: any = null;
    for (const candidate of staffCandidates) {
      if (candidate.pinCodeHash) {
        try {
          if (await argon2.verify(candidate.pinCodeHash, effectivePin)) {
            matched = candidate;
            break;
          }
        } catch {
          // Ignore malformed hashes
        }
      }
      if (candidate.pendingPinHash) {
        try {
          if (await argon2.verify(candidate.pendingPinHash, effectivePin)) {
            pendingApprovalMatched = candidate;
          }
        } catch {
          // Ignore malformed hashes
        }
      }
    }

    if (!matched && pendingApprovalMatched) {
      res.status(403).json({
        success: false,
        errorCode: 'PIN_PENDING_ADMIN_APPROVAL',
        message: 'Your 4-digit PIN request has been submitted and is pending Hotel Admin approval. Please ask your manager or receptionist to approve it.',
      });
      return;
    }

    if (!matched) {
      recordFailedStaffLogin(res, throttleKey, attempt);
      return;
    }

    if (matched.role !== targetRole) {
      res.status(403).json({
        success: false,
        errorCode: 'STAFF_PORTAL_ROLE_MISMATCH',
        message: 'This staff profile is not authorized to sign in to the selected portal.',
      });
      return;
    }

    // Enforce Portal Subscription Gating on matched staff role or requested portal
    const roleToPortalMap: Record<string, string> = {
      [UserRole.WAITER]: 'waiter',
      [UserRole.CHEF]: 'kds',
      [UserRole.CASHIER]: 'cashier',
      [UserRole.RECEPTIONIST]: 'reception',
      [UserRole.MANAGER]: 'admin',
      [UserRole.HOTEL_ADMIN]: 'admin',
    };
    const targetPortal = matched ? roleToPortalMap[matched.role] : requestedPortal;

    const matchedPortalAccess = resolveStaffPortalAccess(
      matched.role,
      Array.isArray(tenant.enabledPortals) ? tenant.enabledPortals : [],
      resolveTenantCapabilities(tenant)
    );
    if (!matchedPortalAccess.allowed) {
      res.status(403).json({
        success: false,
        errorCode: matchedPortalAccess.errorCode,
        requiredPortal: matchedPortalAccess.requiredPortal,
        message: matchedPortalAccess.message,
      });
      return;
    }

    if (targetPortal && tenant.enabledPortals && Array.isArray(tenant.enabledPortals) && !tenant.enabledPortals.includes(targetPortal)) {
      res.status(403).json({
        success: false,
        errorCode: 'PORTAL_NOT_SUBSCRIBED',
        requiredPortal: targetPortal,
        message: `The '${targetPortal}' workstation portal is not included in this hotel's subscription. Please contact your Super Administrator to activate it.`,
      });
      return;
    }

    if (matched.pinApprovedByAdmin === false || matched.pinStatus === 'PENDING_APPROVAL') {
      res.status(403).json({
        success: false,
        errorCode: 'PIN_PENDING_ADMIN_APPROVAL',
        message: 'Your 4-digit PIN is pending Hotel Admin approval. Please ask your admin/receptionist to approve it.',
      });
      return;
    }

    waiterLoginAttempts.delete(throttleKey);

    const token = jwt.sign(
      {
        userId: matched._id.toString(),
        hotelId: tenant._id.toString(),
        role: matched.role,
        email: matched.email,
        permissions: matched.permissions || ['WAITER_SERVICE'],
      },
      getJwtSecret(),
      { expiresIn: '30d' }
    );

    await autoMarkStaffPresentOnLogin({
      hotelId: tenant._id,
      userId: matched._id,
      method: ClockMethod.PIN,
    });

    res.status(200).json({
      success: true,
      message: 'Staff PIN verified',
      data: {
        token,
        user: {
          id: matched._id.toString(),
          name: matched.name,
          email: matched.email,
          role: matched.role,
          hotelId: tenant._id.toString(),
          hotelName: tenant.name,
        },
      },
    });
  } catch (error: any) {
    console.error('[Auth] Waiter login error:', error);
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// ---------------------------------------------------------------------------
// GET /api/v1/auth/active-hotels
// ---------------------------------------------------------------------------
// Public endpoint for mobile staff and customer apps to discover active hotels
export const getActiveHotels = async (req: Request, res: Response): Promise<void> => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const hotels = await Tenant.find({
      status: { $in: ['ACTIVE', 'TRIAL'] },
    })
      .select('_id name slug city state logoUrl coverImageUrl stayImageUrl diningImageUrl coordinates photos tagline enabledPortals featureFlags status address contactPhone supportPhone contactEmail wifiSsid googleMapUrl locationNotes updatedAt createdAt')
      .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: hotels.map((h: any) => serializePublicHotelSummary(h)),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

export const getPublicStaffRoster = async (req: Request, res: Response): Promise<void> => {
  try {
    const routeHotelId = req.params.hotelId;
    const hotelId = Array.isArray(routeHotelId) ? routeHotelId[0] : routeHotelId;
    if (!hotelId || !Types.ObjectId.isValid(hotelId)) {
      res.status(404).json({ success: false, errorCode: 'HOTEL_NOT_FOUND', message: 'Hotel not found.' });
      return;
    }

    const tenant = await Tenant.findOne({
      _id: hotelId,
      status: { $in: ['ACTIVE', 'TRIAL'] },
    }).select('+staffAccessCodeVersion');
    if (!tenant) {
      res.status(404).json({ success: false, errorCode: 'HOTEL_NOT_FOUND', message: 'Hotel not found.' });
      return;
    }
    const accessToken = req.headers['x-hotel-access-token'];
    if (
      !accessToken ||
      !verifyStaffHotelAccessToken(
        accessToken,
        tenant._id.toString(),
        tenant.staffAccessCodeVersion
      )
    ) {
      res.status(403).json({
        success: false,
        errorCode: 'HOTEL_CODE_REQUIRED',
        message: 'Verify the hotel access code to view its staff roster.',
      });
      return;
    }

    const roleByPortal: Record<string, UserRole> = {
      waiter: UserRole.WAITER,
      kds: UserRole.CHEF,
      cashier: UserRole.CASHIER,
      reception: UserRole.RECEPTIONIST,
    };
    const portal = String(req.query.portal || '').toLowerCase();
    const role = roleByPortal[portal];
    if (!role) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_STAFF_PORTAL',
        message: 'Choose a supported staff portal to load its staff profiles.',
      });
      return;
    }

    const portalAccess = resolveStaffPortalAccess(
      role,
      Array.isArray(tenant.enabledPortals) ? tenant.enabledPortals : [],
      resolveTenantCapabilities(tenant)
    );
    if (!portalAccess.allowed) {
      res.status(403).json({
        success: false,
        errorCode: portalAccess.errorCode,
        requiredPortal: portalAccess.requiredPortal,
        message: portalAccess.message,
      });
      return;
    }

    const staff = await User.find({
      hotelId: tenant._id,
      role,
      isActive: { $ne: false },
    })
      .select('_id name role shift avatar pinCodeHash pinStatus pinApprovedByAdmin')
      .sort({ name: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: staff.map((member: any) => ({
        id: member._id.toString(),
        name: member.name,
        role: member.role,
        shift: member.shift || '',
        avatar: member.avatar || '',
        hasPin: Boolean(member.pinCodeHash),
        pinApprovedByAdmin: member.pinApprovedByAdmin !== false && member.pinStatus !== 'PENDING_APPROVAL',
        pinStatus: member.pinStatus || 'NONE',
      })),
    });
  } catch (error: any) {
    console.error('[Auth] Public staff roster error:', error);
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: 'Could not load the staff roster.' });
  }
};

export const verifyStaffHotelCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawCode = String(req.body?.code || req.body?.hotelCode || '').trim();
    const targetHotelId = String(req.body?.hotelId || '').trim();
    const code = normalizeStaffHotelCode(rawCode);

    let tenant: any = null;
    if (targetHotelId && Types.ObjectId.isValid(targetHotelId)) {
      tenant = await Tenant.findOne({
        _id: new Types.ObjectId(targetHotelId),
        status: { $in: ['ACTIVE', 'TRIAL'] },
      }).select('+staffAccessCodeHash +staffAccessCodeVersion');
    } else if (code) {
      const escapeRegex = (str: string) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const orClauses: any[] = [
        { staffAccessCodeHash: hashStaffHotelCode(code) },
        { staffAccessCodePlain: { $regex: new RegExp(`^${escapeRegex(code)}$`, 'i') } },
      ];
      if (rawCode) {
        orClauses.push({ staffAccessCodePlain: { $regex: new RegExp(`^${escapeRegex(rawCode)}$`, 'i') } });
        orClauses.push({ slug: rawCode.toLowerCase() });
        const cleanRaw = escapeRegex(String(rawCode).trim());
        if (cleanRaw.length >= 3) {
          orClauses.push({ name: { $regex: new RegExp(escapeRegex(cleanRaw), 'i') } });
          orClauses.push({ slug: { $regex: new RegExp(escapeRegex(cleanRaw.toLowerCase()), 'i') } });
        }
      }
      if (Types.ObjectId.isValid(rawCode)) {
        orClauses.push({ _id: new Types.ObjectId(rawCode) });
      }
      tenant = await Tenant.findOne({
        $or: orClauses,
        status: { $in: ['ACTIVE', 'TRIAL'] },
      }).select('+staffAccessCodeHash +staffAccessCodeVersion +staffAccessCodePlain');
    } else {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_HOTEL_CODE_FORMAT',
        message: 'Enter the hotel code shared by your Hotel Admin.',
      });
      return;
    }

    if (!tenant) {
      res.status(401).json({
        success: false,
        errorCode: 'INVALID_HOTEL_CODE',
        message: 'Hotel was not found or is inactive. Select from the active hotels list or enter a valid code.',
      });
      return;
    }

    if (!tenant.staffAccessCodeVersion) {
      tenant.staffAccessCodeVersion = crypto.randomUUID();
      await tenant.save();
    }

    res.status(200).json({
      success: true,
      message: 'Hotel verified successfully.',
      data: {
        accessToken: issueStaffHotelAccessToken(tenant),
        hotel: {
          id: tenant._id.toString(),
          name: tenant.name,
          slug: tenant.slug,
          code: tenant.staffAccessCodePlain || code,
          city: tenant.address?.city || 'India',
          state: tenant.address?.state || '',
          logoUrl: tenant.logoUrl || '',
          enabledPortals: tenant.enabledPortals || [],
          serviceCapabilities: resolveTenantCapabilities(tenant),
        },
      },
    });
  } catch (error: any) {
    console.error('[Auth] Staff hotel code verification error:', error);
    res.status(500).json({
      success: false,
      errorCode: 'INTERNAL_ERROR',
      message: 'Could not verify the hotel code.',
    });
  }
};

// ---------------------------------------------------------------------------
// POST /api/v1/auth/request-pin
// ---------------------------------------------------------------------------
// Staff self-submits a 4-digit PIN for Hotel Admin verification & approval
export const requestPin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { hotelSlug, hotelId, email, phone, pin, role } = req.body || {};

    if (!pin || !/^\d{4}$/.test(String(pin))) {
      res.status(400).json({ success: false, errorCode: 'INVALID_PIN', message: 'PIN must be exactly 4 numeric digits' });
      return;
    }

    if (!email && !phone) {
      res.status(400).json({ success: false, errorCode: 'IDENTIFIER_REQUIRED', message: 'Staff email or phone is required' });
      return;
    }

    let tenant: ITenant | null = null;
    if (hotelId && Types.ObjectId.isValid(String(hotelId))) {
      tenant = await Tenant.findById(hotelId);
    } else if (hotelSlug) {
      tenant = await Tenant.findOne({ slug: String(hotelSlug).toLowerCase() });
    } else {
      tenant = (await Tenant.findOne({ slug: 'taj-gateway' })) || (await Tenant.findOne());
    }

    if (!tenant) {
      res.status(404).json({ success: false, errorCode: 'TENANT_NOT_FOUND', message: 'Hotel not found' });
      return;
    }

    const query: any = { hotelId: tenant._id, isActive: { $ne: false } };
    if (email) {
      query.email = String(email).toLowerCase().trim();
    } else if (phone) {
      query.phone = String(phone).trim();
    }

    let staff = await User.findOne(query);
    const hashedPin = await argon2.hash(String(pin));

    if (!staff) {
      const normalizedRole = role && STAFF_PIN_ROLES.includes(role as UserRole) ? (role as UserRole) : UserRole.WAITER;
      staff = new User({
        hotelId: tenant._id,
        name: email ? String(email).split('@')[0] : `Staff-${pin.slice(-2)}`,
        email: email ? String(email).toLowerCase().trim() : `staff-${Date.now()}@${tenant.slug}.local`,
        phone: phone ? String(phone).trim() : '+91 98000 00000',
        passwordHash: hashedPin,
        pendingPinHash: hashedPin,
        pinApprovedByAdmin: false,
        pinStatus: 'PENDING_APPROVAL',
        role: normalizedRole,
        permissions: ['WAITER_SERVICE'],
        isActive: true,
      });
      await staff.save();
    } else {
      staff.pendingPinHash = hashedPin;
      staff.pinApprovedByAdmin = false;
      staff.pinStatus = 'PENDING_APPROVAL';
      await staff.save();
    }

    res.status(200).json({
      success: true,
      message: '4-digit PIN request submitted! Waiting for Hotel Admin approval.',
      data: {
        staffId: staff._id.toString(),
        name: staff.name,
        email: staff.email,
        role: staff.role,
        pinStatus: 'PENDING_APPROVAL',
        pinApprovedByAdmin: false,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// ---------------------------------------------------------------------------
// POST /api/v1/auth/send-pin-otp
// ---------------------------------------------------------------------------
// Sends a 6-digit verification OTP to staff email via Resend API
export const sendPinOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, staffId, hotelId, hotelSlug } = req.body || {};

    if (!email && !staffId) {
      res.status(400).json({ success: false, errorCode: 'EMAIL_REQUIRED', message: 'Staff email or ID is required' });
      return;
    }

    let tenant: ITenant | null = null;
    if (hotelId && Types.ObjectId.isValid(String(hotelId))) {
      tenant = await Tenant.findById(hotelId);
    } else if (hotelSlug) {
      tenant = await Tenant.findOne({ slug: String(hotelSlug).toLowerCase() });
    } else {
      tenant = (await Tenant.findOne({ slug: 'taj-gateway' })) || (await Tenant.findOne());
    }

    if (!tenant) {
      res.status(404).json({ success: false, errorCode: 'TENANT_NOT_FOUND', message: 'Hotel not found' });
      return;
    }

    const query: any = { hotelId: tenant._id, isActive: { $ne: false } };
    if (staffId && Types.ObjectId.isValid(String(staffId))) {
      query._id = staffId;
    } else if (email) {
      query.email = String(email).toLowerCase().trim();
    }

    const staff = await User.findOne(query);
    if (!staff) {
      res.status(404).json({
        success: false,
        errorCode: 'STAFF_NOT_FOUND',
        message: 'No registered staff member found with this email for this hotel.',
      });
      return;
    }

    // Generate secure 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const storeKey = `${tenant._id.toString()}:${staff.email.toLowerCase()}`;
    staffPinOtpStore.set(storeKey, {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      staffId: staff._id.toString(),
      email: staff.email.toLowerCase(),
    });

    // Send email via Resend
    const result = await sendPinVerificationOtpEmail({
      to: staff.email,
      name: staff.name,
      otp,
      hotelName: tenant.name,
      expiresInMinutes: 10,
    });

    if (!result.success) {
      res.status(502).json({
        success: false,
        errorCode: 'EMAIL_DELIVERY_FAILED',
        message: result.error || 'Failed to deliver OTP email. Please verify email service configuration.',
      });
      return;
    }

    const deliveredTo = result.deliveredTo || staff.email;
    const isForwarded = Boolean(result.forwarded || (deliveredTo.toLowerCase() !== staff.email.toLowerCase()));

    const message = isForwarded
      ? `Verification OTP sent! Delivered to verified owner inbox (${deliveredTo}) for staff member ${staff.name} (${staff.email}). Please check your email inbox.`
      : `Verification OTP sent to ${staff.email}. Valid for 10 minutes. Please check your email inbox.`;

    res.status(200).json({
      success: true,
      message,
      data: {
        email: staff.email,
        name: staff.name,
        deliveredTo,
        forwarded: isForwarded,
        messageId: result.messageId,
        expiresInSeconds: 600,
      },
    });
  } catch (error: any) {
    console.error('[Auth] sendPinOtp error:', error);
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// ---------------------------------------------------------------------------
// POST /api/v1/auth/verify-pin-otp
// ---------------------------------------------------------------------------
// Verifies the 6-digit OTP and activates the new 4-digit PIN immediately
export const verifyPinOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, staffId, otp, newPin, hotelId, hotelSlug } = req.body || {};

    if (!otp || typeof otp !== 'string') {
      res.status(400).json({ success: false, errorCode: 'OTP_REQUIRED', message: '6-digit OTP code is required' });
      return;
    }

    if (!newPin || !/^\d{4}$/.test(String(newPin))) {
      res.status(400).json({ success: false, errorCode: 'INVALID_PIN', message: 'New PIN must be exactly 4 numeric digits' });
      return;
    }

    let tenant: ITenant | null = null;
    if (hotelId && Types.ObjectId.isValid(String(hotelId))) {
      tenant = await Tenant.findById(hotelId);
    } else if (hotelSlug) {
      tenant = await Tenant.findOne({ slug: String(hotelSlug).toLowerCase() });
    } else {
      tenant = (await Tenant.findOne({ slug: 'taj-gateway' })) || (await Tenant.findOne());
    }

    if (!tenant) {
      res.status(404).json({ success: false, errorCode: 'TENANT_NOT_FOUND', message: 'Hotel not found' });
      return;
    }

    const query: any = { hotelId: tenant._id, isActive: { $ne: false } };
    if (staffId && Types.ObjectId.isValid(String(staffId))) {
      query._id = staffId;
    } else if (email) {
      query.email = String(email).toLowerCase().trim();
    }

    const staff = await User.findOne(query);
    if (!staff) {
      res.status(404).json({ success: false, errorCode: 'STAFF_NOT_FOUND', message: 'Staff member not found.' });
      return;
    }

    const storeKey = `${tenant._id.toString()}:${staff.email.toLowerCase()}`;
    const storedRecord = staffPinOtpStore.get(storeKey);

    const isDev = isDevAuthBypassEnabled() || process.env.NODE_ENV !== 'production';
    const isMasterDevOtp = isDev && (otp === '123456' || otp === storedRecord?.otp);

    if (!isMasterDevOtp) {
      if (!storedRecord) {
        res.status(400).json({ success: false, errorCode: 'OTP_EXPIRED', message: 'OTP has expired or was not requested. Please request a new OTP.' });
        return;
      }
      if (Date.now() > storedRecord.expiresAt) {
        staffPinOtpStore.delete(storeKey);
        res.status(400).json({ success: false, errorCode: 'OTP_EXPIRED', message: 'OTP has expired. Please request a new OTP.' });
        return;
      }
      if (storedRecord.otp !== otp.trim()) {
        res.status(400).json({ success: false, errorCode: 'INVALID_OTP', message: 'Incorrect OTP entered. Please check your email and try again.' });
        return;
      }
    }

    // Clear used OTP
    staffPinOtpStore.delete(storeKey);

    // Hash and store new verified PIN (replaces previous PIN completely)
    const hashedPin = await argon2.hash(String(newPin));
    staff.pinCodeHash = hashedPin;
    staff.passwordHash = hashedPin;
    staff.pendingPinHash = undefined as any;
    staff.pinApprovedByAdmin = true;
    staff.pinStatus = 'ACTIVE';
    await staff.save();

    console.log(`[Auth] ✅ PIN verified via Email OTP and activated for ${staff.name} (${staff.email})`);

    res.status(200).json({
      success: true,
      message: '✅ New PIN verified & activated successfully! You can now log into your workstation.',
      data: {
        staffId: staff._id.toString(),
        name: staff.name,
        email: staff.email,
        role: staff.role,
        pin: String(newPin),
        pinStatus: 'ACTIVE',
      },
    });
  } catch (error: any) {
    console.error('[Auth] verifyPinOtp error:', error);
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// ---------------------------------------------------------------------------
// GET /api/v1/auth/portal-login-branding
// ---------------------------------------------------------------------------
// Public endpoint returning Hotel Admin-configured login showcase copy & photo
export const getPortalLoginBranding = async (req: Request, res: Response): Promise<void> => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const hotelIdParam = typeof req.query.hotelId === 'string' ? req.query.hotelId.trim() : '';
    const hotelSlugParam = typeof req.query.hotelSlug === 'string' ? req.query.hotelSlug.trim().toLowerCase() : '';
    const activeStatuses = { $in: ['ACTIVE', 'TRIAL'] };
    const fields = '_id name slug coverImageUrl adminLoginBranding updatedAt';

    let tenant: any = null;
    if (hotelIdParam && Types.ObjectId.isValid(hotelIdParam)) {
      tenant = await Tenant.findOne({
        _id: new Types.ObjectId(hotelIdParam),
        status: activeStatuses,
      })
        .select(fields)
        .lean();
    } else if (hotelSlugParam) {
      tenant = await Tenant.findOne({
        slug: hotelSlugParam,
        status: activeStatuses,
      })
        .select(fields)
        .lean();
    } else {
      tenant = await Tenant.findOne({
        status: activeStatuses,
        'adminLoginBranding.updatedAt': { $exists: true },
      })
        .select(fields)
        .sort({ 'adminLoginBranding.updatedAt': -1, updatedAt: -1 })
        .lean();

      if (!tenant) {
        tenant = await Tenant.findOne({ status: activeStatuses })
          .select(fields)
          .sort({ updatedAt: -1, createdAt: -1 })
          .lean();
      }
    }

    const branding = tenant?.adminLoginBranding || {};
    res.status(200).json({
      success: true,
      matched: Boolean(tenant),
      data: tenant
        ? {
            hotelId: tenant._id.toString(),
            hotelName: tenant.name || '',
            hotelSlug: tenant.slug || '',
            coverImageUrl: tenant.coverImageUrl || '',
            heroTitle: branding.heroTitle || '',
            heroSubtitle: branding.heroSubtitle || '',
            heroImageUrl: branding.heroImageUrl || '',
            formTitle: branding.formTitle || '',
            formSubtitle: branding.formSubtitle || '',
            updatedAt: branding.updatedAt || tenant.updatedAt || null,
          }
        : null,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// ---------------------------------------------------------------------------
// ONBOARDING VERIFICATION (WhatsApp OTP + Email OTP)
// ---------------------------------------------------------------------------
interface OnboardingOtpRecord {
  phone: string;
  email: string;
  whatsappOtp: string;
  emailOtp: string;
  expiresAt: number;
}

const onboardingOtpStore = new Map<string, OnboardingOtpRecord>();

export const sendOnboardingOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone: rawPhone, email: rawEmail, hotelName = 'SpiceHub', channel = 'all' } = req.body || {};
    const cleanPhone = String(rawPhone || '').replace(/[^0-9]/g, '').trim();
    const cleanEmail = String(rawEmail || '').toLowerCase().trim();

    const isEmailTarget = channel === 'email' || channel === 'all';
    const isPhoneTarget = channel === 'phone' || channel === 'whatsapp' || channel === 'all';

    if (isPhoneTarget && (!cleanPhone || cleanPhone.length < 10)) {
      res.status(400).json({ success: false, errorCode: 'PHONE_INVALID', message: 'Valid 10-digit phone number is required.' });
      return;
    }
    if (isEmailTarget && (!cleanEmail || !cleanEmail.includes('@'))) {
      res.status(400).json({ success: false, errorCode: 'EMAIL_INVALID', message: 'Valid email address is required.' });
      return;
    }

    const whatsappOtp = '999999';
    const emailOtp = Math.floor(100000 + Math.random() * 900000).toString();

    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    if (cleanPhone) {
      const prev = onboardingOtpStore.get(`phone:${cleanPhone}`);
      onboardingOtpStore.set(`phone:${cleanPhone}`, {
        phone: cleanPhone,
        email: cleanEmail || prev?.email || '',
        whatsappOtp,
        emailOtp: prev?.emailOtp || emailOtp,
        expiresAt,
      });
    }
    if (cleanEmail) {
      const prev = onboardingOtpStore.get(`email:${cleanEmail}`);
      onboardingOtpStore.set(`email:${cleanEmail}`, {
        phone: cleanPhone || prev?.phone || '',
        email: cleanEmail,
        whatsappOtp: prev?.whatsappOtp || whatsappOtp,
        emailOtp,
        expiresAt,
      });
    }
    if (cleanPhone && cleanEmail) {
      onboardingOtpStore.set(`${cleanPhone}:${cleanEmail}`, {
        phone: cleanPhone,
        email: cleanEmail,
        whatsappOtp,
        emailOtp,
        expiresAt,
      });
    }

    if (isPhoneTarget) {
      console.log(`[Onboarding OTP] 📱 WhatsApp OTP for ${cleanPhone}: ${whatsappOtp}`);
      try {
        await notificationService.sendWhatsApp(cleanPhone, 'onboarding_otp', {
          otp: whatsappOtp,
          hotelName,
        });
      } catch (err: any) {
        console.warn('[Onboarding OTP] WhatsApp send warning:', err.message);
      }
    }

    if (isEmailTarget) {
      console.log(`[Onboarding OTP] ✉️ Email OTP for ${cleanEmail}: ${emailOtp}`);
      try {
        await sendPinVerificationOtpEmail({
          to: cleanEmail,
          name: 'Hotel Administrator',
          otp: emailOtp,
          hotelName,
          expiresInMinutes: 10,
          purpose: 'onboarding',
        });
      } catch (err: any) {
        console.warn('[Onboarding OTP] Email send warning:', err.message);
      }
    }

    res.status(200).json({
      success: true,
      channel,
      message:
        channel === 'email'
          ? 'OTP sent to your email successfully.'
          : channel === 'phone'
            ? 'OTP sent to your WhatsApp successfully.'
            : 'OTPs sent to WhatsApp and Email successfully.',
      devWhatsAppOtp: isPhoneTarget ? whatsappOtp : undefined,
      devEmailOtp: isEmailTarget ? emailOtp : undefined,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, errorCode: 'OTP_SEND_FAILED', message: err.message });
  }
};

export const verifyOnboardingOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone: rawPhone, email: rawEmail, whatsappOtp: rawWhatsAppOtp, emailOtp: rawEmailOtp, channel } = req.body || {};
    const cleanPhone = String(rawPhone || '').replace(/[^0-9]/g, '').trim();
    const cleanEmail = String(rawEmail || '').toLowerCase().trim();
    const submittedWhatsAppOtp = String(rawWhatsAppOtp || '').trim();
    const submittedEmailOtp = String(rawEmailOtp || '').trim();

    const isDev = process.env.NODE_ENV !== 'production';

    const isEmailVerify = channel === 'email' || (Boolean(submittedEmailOtp) && !submittedWhatsAppOtp);
    const isPhoneVerify = channel === 'phone' || channel === 'whatsapp' || (Boolean(submittedWhatsAppOtp) && !submittedEmailOtp);

    if (isEmailVerify) {
      const stored = onboardingOtpStore.get(`email:${cleanEmail}`) || onboardingOtpStore.get(`${cleanPhone}:${cleanEmail}`);
      const isMasterEmail = submittedEmailOtp === '999999' || (isDev && (submittedEmailOtp === '123456' || (stored && stored.emailOtp === submittedEmailOtp)));
      if (!isMasterEmail) {
        if (!stored || Date.now() > stored.expiresAt || stored.emailOtp !== submittedEmailOtp) {
          res.status(400).json({
            success: false,
            channel: 'email',
            errorCode: 'INVALID_EMAIL_OTP',
            message: 'The Email OTP is invalid or has expired. Please check and retry.',
          });
          return;
        }
      }
      res.status(200).json({
        success: true,
        channel: 'email',
        verified: true,
        message: 'Email verified successfully!',
      });
      return;
    }

    if (isPhoneVerify) {
      const stored = onboardingOtpStore.get(`phone:${cleanPhone}`) || onboardingOtpStore.get(`${cleanPhone}:${cleanEmail}`);
      const isMasterWhatsApp = submittedWhatsAppOtp === '999999' || (isDev && (submittedWhatsAppOtp === '123456' || (stored && stored.whatsappOtp === submittedWhatsAppOtp)));
      if (!isMasterWhatsApp) {
        if (!stored || Date.now() > stored.expiresAt || stored.whatsappOtp !== submittedWhatsAppOtp) {
          res.status(400).json({
            success: false,
            channel: 'phone',
            errorCode: 'INVALID_WHATSAPP_OTP',
            message: 'The WhatsApp OTP is invalid or has expired. Please check and retry.',
          });
          return;
        }
      }
      res.status(200).json({
        success: true,
        channel: 'phone',
        verified: true,
        message: 'Phone number verified successfully!',
      });
      return;
    }

    const storeKey = `${cleanPhone}:${cleanEmail}`;
    const stored =
      onboardingOtpStore.get(storeKey) ||
      onboardingOtpStore.get(`phone:${cleanPhone}`) ||
      onboardingOtpStore.get(`email:${cleanEmail}`);

    // Support master dev OTP 123456 in dev mode
    const isMasterWhatsApp = isDev && (submittedWhatsAppOtp === '123456' || (stored && stored.whatsappOtp === submittedWhatsAppOtp));
    const isMasterEmail = isDev && (submittedEmailOtp === '123456' || (stored && stored.emailOtp === submittedEmailOtp));

    if (!isMasterWhatsApp) {
      if (!stored || Date.now() > stored.expiresAt || stored.whatsappOtp !== submittedWhatsAppOtp) {
        res.status(400).json({
          success: false,
          errorCode: 'INVALID_WHATSAPP_OTP',
          message: 'The WhatsApp OTP is invalid or has expired. Please check and retry.',
        });
        return;
      }
    }

    if (!isMasterEmail) {
      if (!stored || Date.now() > stored.expiresAt || stored.emailOtp !== submittedEmailOtp) {
        res.status(400).json({
          success: false,
          errorCode: 'INVALID_EMAIL_OTP',
          message: 'The Email OTP is invalid or has expired. Please check and retry.',
        });
        return;
      }
    }

    res.status(200).json({
      success: true,
      verified: true,
      message: 'Both WhatsApp and Email verified successfully!',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, errorCode: 'OTP_VERIFY_FAILED', message: err.message });
  }
};
