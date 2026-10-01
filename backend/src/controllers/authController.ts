import { Request, Response } from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { User } from '../models/User';
import { Tenant } from '../models/Tenant';
import { UserRole, ShiftStatus, TenantRequest } from '../types';

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
    const secret = process.env.JWT_SECRET || 'spicehub_super_secret_jwt_key_2026_production_ready_9921';
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

    const secret = process.env.JWT_SECRET || 'spicehub_super_secret_jwt_key_2026_production_ready_9921';
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
