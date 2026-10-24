import { Request, Response } from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { User } from '../models/User';
import { Tenant } from '../models/Tenant';
import { UserRole, ShiftStatus, TenantRequest } from '../types';
import { getJwtSecret, isDevAuthBypassEnabled } from '../config/security';
import { ITenant } from '../models/Tenant';

export const registerTenantAndAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      hotelName,
      slug,
      contactEmail,
      contactPhone,
      gstin,
      adminName,
      adminPassword,
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

    // 1. Create Tenant
    const tenant = await Tenant.create({
      name: hotelName,
      slug: slug.toLowerCase(),
      contactEmail,
      contactPhone: contactPhone || '9999999999',
      gstin,
      status: 'ACTIVE',
    });

    // 2. Hash Password using Argon2
    const passwordHash = await argon2.hash(adminPassword);

    // 3. Create Hotel Admin User
    const adminUser = await User.create({
      hotelId: tenant._id,
      name: adminName || 'Hotel Administrator',
      email: contactEmail.toLowerCase(),
      phone: contactPhone || '9999999999',
      passwordHash,
      role: UserRole.HOTEL_ADMIN,
      permissions: ['*'],
      shiftStatus: ShiftStatus.ON_DUTY,
    });

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

    let tenantFilter: any = {};
    const hotelIdHeader = req.headers['x-hotel-id'] as string;
    const targetHotelId = req.body.hotelId || hotelIdHeader;

    if (slug) {
      const tenant = await Tenant.findOne({ slug: slug.toLowerCase() });
      if (!tenant) {
        res.status(404).json({
          success: false,
          errorCode: 'TENANT_NOT_FOUND',
          message: 'Invalid hotel slug',
        });
        return;
      }
      tenantFilter = { hotelId: tenant._id };
    } else if (targetHotelId && Types.ObjectId.isValid(targetHotelId)) {
      tenantFilter = { hotelId: new Types.ObjectId(targetHotelId) };
    } else {
      // Check if this email is ambiguously registered across multiple active hotel tenants
      const matchingUsers = await User.find({ email: email.toLowerCase(), isActive: true }).limit(2);
      if (matchingUsers.length > 1) {
        res.status(409).json({
          success: false,
          errorCode: 'AMBIGUOUS_TENANT_LOGIN',
          message: 'Multiple hotel accounts found for this email. Please specify hotel slug or hotel ID to login.',
        });
        return;
      }
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
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

    const isMatch = await argon2.verify(user.passwordHash, password);
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
  UserRole.HOTEL_ADMIN,
  UserRole.MANAGER,
];

export const waiterLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pin, hotelSlug, demo } = req.body || {};
    const requesterIp = String(req.ip || req.socket?.remoteAddress || 'unknown');
    const throttleKey = `${requesterIp}:${String(hotelSlug || 'default')}`;

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
    if (hotelSlug) {
      tenant = await Tenant.findOne({ slug: String(hotelSlug).toLowerCase() });
    } else {
      tenant = await Tenant.findOne({ slug: 'taj-gateway' }) || (await Tenant.findOne());
    }
    if (!tenant) {
      res.status(404).json({ success: false, errorCode: 'TENANT_NOT_FOUND', message: 'Hotel not found' });
      return;
    }

    const staffCandidates = await User.find({
      hotelId: tenant._id,
      role: { $in: STAFF_PIN_ROLES },
      isActive: { $ne: false },
    });

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

    if (!pin || typeof pin !== 'string' || pin.length < 4) {
      res.status(400).json({
        success: false,
        errorCode: 'PIN_REQUIRED',
        message: 'A valid staff PIN is required',
      });
      return;
    }

    let matched: any = null;
    for (const candidate of staffCandidates) {
      if (!candidate.pinCodeHash) continue;
      try {
        if (await argon2.verify(candidate.pinCodeHash, pin)) {
          matched = candidate;
          break;
        }
      } catch {
        // Ignore malformed hashes and keep checking the remaining staff.
      }
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
