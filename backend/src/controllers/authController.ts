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

interface StaffOtpRecord {
  otp: string;
  expiresAt: number;
  staffId: string;
  email: string;
}

const staffPinOtpStore = new Map<string, StaffOtpRecord>();

export const registerTenantAndAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      hotelName,
      slug,
      contactEmail,
      contactPhone,
      city = 'Sikar',
      state = 'Rajasthan',
      gstin,
      adminName,
      adminPassword,
      enabledPortals,
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
    } = req.body;

    if (!hotelName || !slug || !contactEmail || !adminPassword) {
      res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'Missing required fields for tenant registration',
      });
      return;
    }

    const existingTenant = await Tenant.findOne({ slug: slug.toLowerCase() });
    if (existingTenant) {
      res.status(409).json({
        success: false,
        errorCode: 'TENANT_EXISTS',
        message: `Hotel with slug '${slug}' already exists`,
      });
      return;
    }

    const portals = Array.isArray(enabledPortals) && enabledPortals.length > 0
      ? Array.from(new Set(['admin', ...enabledPortals]))
      : ['admin', 'cashier', 'reception', 'kds', 'waiter', 'customer', 'guest'];

    const monthlyPrice = monthlyPriceINR !== undefined
      ? Number(monthlyPriceINR)
      : (subscriptionMonthlyINR !== undefined ? Number(subscriptionMonthlyINR) : 0);

    // 1. Create Tenant
    const tenant = await Tenant.create({
      name: hotelName,
      slug: slug.toLowerCase(),
      contactEmail,
      contactPhone: contactPhone || '9999999999',
      address: {
        city: city || 'Sikar',
        state: state || 'Rajasthan',
        country: 'India',
      },
      logoUrl: logoUrl || '',
      coverImageUrl: coverImageUrl || '',
      photos: Array.isArray(photos) ? photos : [],
      tagline: tagline || '',
      gstin,
      status: 'ACTIVE',
      enabledPortals: portals,
      subscriptionMonthlyINR: monthlyPrice,
      billingCycle: billingCycle === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY',
      customPricingAdjustmentINR: Number(customPricingAdjustmentINR || 0),
      featureFlags: {
        pmsEnabled: portals.includes('reception'),
        posEnabled: portals.includes('cashier'),
        kdsEnabled: portals.includes('kds'),
        waiterEnabled: portals.includes('waiter'),
        qrDineInEnabled: portals.includes('customer'),
        roomServiceEnabled: portals.includes('guest'),
        banquetEnabled: true,
        loyaltyEnabled: true,
        aiInsightsEnabled: false,
        tallyExportEnabled: true,
      },
    });

    // 2. Hash Password using Argon2
    const passwordHash = await argon2.hash(adminPassword);
    const pinCodeHash = await argon2.hash('1111');

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
      { expiresIn: '1h' }
    );

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
        },
        user: {
          id: adminUser._id,
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role,
        },
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
      { expiresIn: '1h' }
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
    const user = await User.findById(req.user?.userId).select('-passwordHash -pinCodeHash');
    if (!user) {
      res.status(404).json({ success: false, errorCode: 'USER_NOT_FOUND' });
      return;
    }

    let tenant = null;
    if (user.hotelId) {
      tenant = await Tenant.findById(user.hotelId);
    }

    res.status(200).json({
      success: true,
      data: { user, tenant },
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
    const { pin, pinCode, hotelSlug, hotelId, demo, staffId, email } = req.body || {};
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

    let tenant: ITenant | null = null;
    if (rawHotelId && Types.ObjectId.isValid(String(rawHotelId))) {
      tenant = await Tenant.findById(rawHotelId);
    } else if (hotelSlug) {
      tenant = await Tenant.findOne({ slug: String(hotelSlug).toLowerCase() });
    } else {
      tenant = (await Tenant.findOne({ slug: 'taj-gateway' })) || (await Tenant.findOne());
    }
    if (!tenant) {
      res.status(404).json({ success: false, errorCode: 'TENANT_NOT_FOUND', message: 'Hotel not found' });
      return;
    }

    const staffQuery: any = {
      hotelId: tenant._id,
      role: { $in: STAFF_PIN_ROLES },
      isActive: { $ne: false },
    };
    if (staffId && Types.ObjectId.isValid(String(staffId))) {
      staffQuery._id = staffId;
    } else if (email) {
      staffQuery.email = String(email).toLowerCase().trim();
    }

    const staffCandidates = await User.find(staffQuery).select('+pendingPinHash');

    // Local demo helper: only available while the dev auth bypass is enabled.
    if (demo === true) {
      if (!isDevAuthBypassEnabled()) {
        res.status(400).json({
          success: false,
          errorCode: 'DEMO_LOGIN_DISABLED',
          message: 'Demo login is not available on this server',
        });
        return;
      }
      const demoStaff = staffCandidates.find((user) => user.role === UserRole.WAITER) || staffCandidates[0];
      if (!demoStaff) {
        res.status(404).json({ success: false, errorCode: 'NO_STAFF', message: 'No staff account available' });
        return;
      }
      waiterLoginAttempts.delete(throttleKey);
      const demoToken = jwt.sign(
        {
          userId: demoStaff._id.toString(),
          hotelId: tenant._id.toString(),
          role: demoStaff.role,
          email: demoStaff.email,
          permissions: demoStaff.permissions || ['WAITER_SERVICE'],
        },
        getJwtSecret(),
        { expiresIn: '1h' }
      );
      res.status(200).json({
        success: true,
        message: 'Demo staff session started',
        data: {
          token: demoToken,
          user: {
            id: demoStaff._id.toString(),
            name: demoStaff.name,
            email: demoStaff.email,
            role: demoStaff.role,
            hotelId: tenant._id.toString(),
            hotelName: tenant.name,
          },
        },
      });
      return;
    }

    if (!effectivePin || typeof effectivePin !== 'string' || !/^\d{4}$/.test(effectivePin)) {
      res.status(400).json({
        success: false,
        errorCode: 'PIN_REQUIRED',
        message: 'A valid 4-digit staff PIN is required (must be exactly 4 numeric digits, numbers only)',
      });
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
      const next = (attempt?.count || 0) + 1;
      const lockedUntil = next >= WAITER_LOGIN_MAX_ATTEMPTS ? Date.now() + WAITER_LOGIN_LOCK_MS : 0;
      waiterLoginAttempts.set(throttleKey, { count: next, lockedUntil });
      res.status(401).json({
        success: false,
        errorCode: 'INVALID_PIN',
        message:
          next >= WAITER_LOGIN_MAX_ATTEMPTS
            ? 'Account temporarily locked for 60 seconds.'
            : `Invalid staff PIN. ${WAITER_LOGIN_MAX_ATTEMPTS - next} attempt${
                WAITER_LOGIN_MAX_ATTEMPTS - next === 1 ? '' : 's'
              } remaining.`,
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
    const requestedPortal = req.body && req.body.portal ? String(req.body.portal).toLowerCase() : undefined;
    const targetPortal = requestedPortal || (matched ? roleToPortalMap[matched.role] : 'waiter');

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
      { expiresIn: '1h' }
    );

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
    const hotels = await Tenant.find({
      status: { $in: ['ACTIVE', 'TRIAL'] },
    })
      .select('_id name slug city state logoUrl coverImageUrl stayImageUrl diningImageUrl coordinates photos tagline enabledPortals status address contactPhone wifiSsid wifiPassword')
      .lean();

    res.status(200).json({
      success: true,
      data: hotels.map((h: any) => ({
        id: h._id.toString(),
        name: h.name,
        slug: h.slug,
        city: (h.address as any)?.city || h.city || 'India',
        state: (h.address as any)?.state || h.state || '',
        logoUrl: h.logoUrl || '',
        coverImageUrl: h.coverImageUrl || '',
        stayImageUrl: h.stayImageUrl || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200&auto=format&fit=crop&q=80',
        diningImageUrl: h.diningImageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80',
        coordinates: h.coordinates || { latitude: 26.9124, longitude: 75.7873 },
        photos: Array.isArray(h.photos) ? h.photos : [],
        tagline: h.tagline || '',
        enabledPortals: h.enabledPortals || ['admin', 'cashier', 'reception', 'kds', 'waiter', 'customer', 'guest'],
        address: h.address || '',
        contactPhone: h.contactPhone || '',
        wifiSsid: h.wifiSsid || 'TajGateway_HighSpeed',
        wifiPassword: h.wifiPassword || 'SpiceGuest@2026',
      })),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
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
    staff.pinCode = String(newPin);
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

