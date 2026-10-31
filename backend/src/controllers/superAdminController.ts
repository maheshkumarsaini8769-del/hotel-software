import { Response } from 'express';
import { Types } from 'mongoose';
import crypto from 'crypto';
import argon2 from 'argon2';
import { Tenant, ITenant } from '../models/Tenant';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { PortalPricing, ensureDefaultPortalPricing } from '../models/PortalPricing';
import { SubscriptionInvoice } from '../models/SubscriptionInvoice';
import { DEFAULT_PORTAL_CATALOG } from '../types/sharedTypes';
import { Room, RoomStatus } from '../models/Room';
import { RoomType } from '../models/RoomType';
import { Booking } from '../models/Booking';
import { RestaurantOrder } from '../models/RestaurantOrder';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { GuestProfile } from '../models/GuestProfile';
import { User } from '../models/User';
import { Payment, PaymentStatus } from '../models/Payment';
import { KitchenStation } from '../models/KitchenStation';
import { MenuCategory } from '../models/MenuCategory';
import { MenuItem, FoodType } from '../models/MenuItem';
import { TenantRequest, UserRole, ShiftStatus } from '../types';

function getSocketIO(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const serverModule = require('../index');
    return serverModule?.io;
  } catch {
    return null;
  }
}

function parseRange(req: TenantRequest): { start: Date; end: Date } {
  const rawStart = String(req.query.startDate || '');
  const rawEnd = String(req.query.endDate || '');
  const parsedStart = rawStart ? new Date(rawStart) : null;
  const parsedEnd = rawEnd ? new Date(rawEnd) : null;
  const end = parsedEnd && !Number.isNaN(parsedEnd.getTime()) ? parsedEnd : new Date();
  const fallbackStart = new Date(end);
  fallbackStart.setDate(fallbackStart.getDate() - 30);
  fallbackStart.setHours(0, 0, 0, 0);
  const start =
    parsedStart && !Number.isNaN(parsedStart.getTime()) ? parsedStart : fallbackStart;
  return { start, end };
}

// 1. List All Tenants with Aggregated Metrics
export const listAllTenants = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const tenants = await Tenant.find().sort({ createdAt: -1 });
    const { start, end } = parseRange(req);

    const tenantList = await Promise.all(
      tenants.map(async (t) => {
        const [
          roomCount,
          occupiedRoomCount,
          totalTables,
          occupiedTables,
          bookingCount,
          periodOrders,
          periodRevenue,
          adminUser,
        ] = await Promise.all([
          Room.countDocuments({ hotelId: t._id }),
          Room.countDocuments({ hotelId: t._id, status: RoomStatus.OCCUPIED }),
          DiningTable.countDocuments({ hotelId: t._id }),
          DiningTable.countDocuments({
            hotelId: t._id,
            currentStatus: {
              $in: [
                TableStatus.OCCUPIED,
                TableStatus.PARTIALLY_OCCUPIED,
                TableStatus.BILLING,
              ],
            },
          }),
          Booking.countDocuments({ hotelId: t._id }),
          RestaurantOrder.countDocuments({
            hotelId: t._id,
            placedAt: { $gte: start, $lte: end },
          }),
          Payment.aggregate([
            {
              $match: {
                hotelId: t._id,
                status: PaymentStatus.SUCCESS,
                createdAt: { $gte: start, $lte: end },
              },
            },
            { $group: { _id: null, total: { $sum: '$amount' } } },
          ]),
          User.findOne({ hotelId: t._id, role: UserRole.HOTEL_ADMIN, isActive: true })
            .select('name email phone')
            .lean(),
        ]);
        // Prefer the plan actually assigned to the tenant. Legacy tenants that
        // were never assigned a plan fall back to a feature-flag estimate.
        const storedPlanCode = String(t.subscriptionPlanCode || '').toUpperCase();
        const plan: 'TRIAL' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE' | 'CUSTOM' =
          t.status === 'TRIAL'
            ? 'TRIAL'
            : (storedPlanCode as
                | 'STARTER'
                | 'PROFESSIONAL'
                | 'ENTERPRISE'
                | 'CUSTOM') ||
              (t.featureFlags?.banquetEnabled || t.featureFlags?.aiInsightsEnabled
                ? 'ENTERPRISE'
                : t.featureFlags?.kdsEnabled
                  ? 'PROFESSIONAL'
                  : 'STARTER');

        const subStart = t.subscriptionStartDate || t.subscription?.cycleStartDate || t.createdAt;
        const subDurationMonths = t.subscriptionDurationMonths || t.subscription?.durationMonths || (t.billingCycle === 'ANNUAL' ? 12 : 1);
        const subEnd = t.subscriptionEndDate || t.subscription?.nextBillingDate || new Date(new Date(subStart).getTime() + subDurationMonths * 30 * 86400000);

        return {
          id: t._id,
          name: t.name,
          slug: t.slug,
          code: t.slug.toUpperCase(),
          contactEmail: t.contactEmail,
          contactPhone: t.contactPhone,
          adminEmail: (adminUser as any)?.email || t.contactEmail,
          adminName: (adminUser as any)?.name || `${t.name} Admin`,
          adminPhone: (adminUser as any)?.phone || t.contactPhone,
          subscriptionStartDate: subStart,
          subscriptionEndDate: subEnd,
          subscriptionDurationMonths: subDurationMonths,
          subscriptionStatus: t.status,
          city: t.address?.city || '',
          state: t.address?.state || '',
          street: t.address?.street || '',
          pincode: t.address?.pincode || '',
          country: t.address?.country || 'India',
          address: t.address,
          coordinates: t.coordinates || { latitude: 26.9124, longitude: 75.7873 },
          latitude: t.coordinates?.latitude ?? (t as any).latitude ?? 26.9124,
          longitude: t.coordinates?.longitude ?? (t as any).longitude ?? 75.7873,
          googleMapUrl: t.googleMapUrl || `https://www.google.com/maps/search/?api=1&query=${t.coordinates?.latitude || 26.9124},${t.coordinates?.longitude || 75.7873}`,
          locationNotes: t.locationNotes || '',
          logoUrl: t.logoUrl || '',
          coverImageUrl: t.coverImageUrl || '',
          photos: Array.isArray(t.photos) ? t.photos : [],
          tagline: t.tagline || '',
          status: t.status,
          currency: t.currency,
          enabledPortals:
            t.enabledPortals && t.enabledPortals.length > 0
              ? t.enabledPortals
              : ['admin', 'cashier', 'reception', 'kds', 'waiter', 'customer', 'guest'],
          billingCycle: t.billingCycle || 'MONTHLY',
          customPricingAdjustmentINR: Number(t.customPricingAdjustmentINR || 0),
          featureFlags: t.featureFlags,
          plan,
          planCode: storedPlanCode || plan,
          planName: t.subscriptionPlanName || '',
          monthlyPriceINR: Number(t.subscriptionMonthlyINR || 0),
          maxRooms: Number(t.maxRooms || 30),
          maxTables: Number(t.maxTables || 20),
          roomCount,
          occupiedRoomCount,
          totalTables,
          occupiedTables,
          bookingCount,
          periodOrders,
          periodRevenue: Number(periodRevenue[0]?.total || 0),
          createdAt: t.createdAt,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: tenantList.length,
      range: { start, end },
      tenants: tenantList,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 1b. Cross-tenant staff directory for platform governance.
export const listPlatformUsers = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const users = await User.find({ role: { $ne: UserRole.SUPERADMIN } })
      .select('name email phone role hotelId isActive shiftStatus createdAt')
      .sort({ createdAt: -1 })
      .limit(250)
      .populate('hotelId', 'name')
      .lean();

    res.status(200).json({
      success: true,
      count: users.length,
      users: users.map((user: any) => ({
        id: String(user._id),
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        hotelId: user.hotelId?._id ? String(user.hotelId._id) : '',
        hotelName: user.hotelId?.name || 'Global / unassigned',
        isActive: Boolean(user.isActive),
        shiftStatus: user.shiftStatus,
        createdAt: user.createdAt,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 2. Emergency Kill-Switch: Suspend or Re-activate Tenant
export const toggleTenantStatus = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const tenantId = String(req.params.tenantId);
    const { status, reason } = req.body;

    if (!['ACTIVE', 'SUSPENDED', 'TRIAL'].includes(status)) {
      res.status(400).json({ success: false, errorCode: 'INVALID_STATUS', message: 'Status must be ACTIVE, SUSPENDED, or TRIAL' });
      return;
    }

    const tenant = await Tenant.findById(new Types.ObjectId(tenantId));
    if (!tenant) {
      res.status(404).json({ success: false, errorCode: 'TENANT_NOT_FOUND', message: 'Tenant not found' });
      return;
    }

    tenant.status = status;
    await tenant.save();

    // Broadcast immediate emergency event to any active sockets under this tenant
    const socketIO = getSocketIO();
    if (socketIO) {
      socketIO.to(`${tenant._id.toString()}_global`).emit('tenant:status_changed', {
        tenantId: tenant._id,
        newStatus: status,
        reason,
      });
    }

    res.status(200).json({
      success: true,
      message: `Tenant status updated to ${status}`,
      tenantId: tenant._id,
      status: tenant.status,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 3. Update Tenant Module Feature Flags
export const updateTenantFeatureFlags = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const tenantId = String(req.params.tenantId);
    const { featureFlags } = req.body;

    if (!featureFlags || typeof featureFlags !== 'object') {
      res.status(400).json({ success: false, errorCode: 'INVALID_FLAGS', message: 'Valid featureFlags object required' });
      return;
    }

    const tenant = await Tenant.findById(new Types.ObjectId(tenantId));
    if (!tenant) {
      res.status(404).json({ success: false, errorCode: 'TENANT_NOT_FOUND', message: 'Tenant not found' });
      return;
    }

    // Bidirectional sync: if portal feature flags are passed, keep enabledPortals strictly consistent
    if (!Array.isArray(tenant.enabledPortals)) {
      tenant.enabledPortals = ['admin', 'cashier', 'reception', 'kds', 'waiter', 'customer', 'guest'];
    }
    const flagToPortalMap: Record<string, string> = {
      pmsEnabled: 'reception',
      posEnabled: 'cashier',
      kdsEnabled: 'kds',
      waiterEnabled: 'waiter',
      qrDineInEnabled: 'customer',
      roomServiceEnabled: 'guest',
    };
    for (const [flag, portalKey] of Object.entries(flagToPortalMap)) {
      if ((featureFlags as any)[flag] !== undefined) {
        if ((featureFlags as any)[flag] && !tenant.enabledPortals.includes(portalKey)) {
          tenant.enabledPortals.push(portalKey);
        } else if (!(featureFlags as any)[flag]) {
          tenant.enabledPortals = tenant.enabledPortals.filter((p) => p !== portalKey);
        }
      }
    }
    if (!tenant.enabledPortals.includes('admin')) {
      tenant.enabledPortals.unshift('admin');
    }
    tenant.enabledPortals = Array.from(new Set(tenant.enabledPortals));

    tenant.featureFlags = {
      ...tenant.featureFlags,
      ...featureFlags,
      pmsEnabled: tenant.enabledPortals.includes('reception'),
      posEnabled: tenant.enabledPortals.includes('cashier'),
      kdsEnabled: tenant.enabledPortals.includes('kds'),
      waiterEnabled: tenant.enabledPortals.includes('waiter'),
      qrDineInEnabled: tenant.enabledPortals.includes('customer'),
      roomServiceEnabled: tenant.enabledPortals.includes('guest'),
    };
    await tenant.save();

    const socketIO = getSocketIO();
    if (socketIO) {
      socketIO.to(`${tenant._id.toString()}_global`).emit('tenant:flags_updated', {
        tenantId: tenant._id,
        featureFlags: tenant.featureFlags,
      });
    }

    res.status(200).json({
      success: true,
      tenantId: tenant._id,
      featureFlags: tenant.featureFlags,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 3b. Update Tenant Enabled Portals & Modular Pricing
export const updateTenantPortalsAndPricing = async (
  req: TenantRequest,
  res: Response
): Promise<void> => {
  try {
    const tenantId = String(req.params.tenantId);
    const {
      enabledPortals,
      monthlyPriceINR,
      billingCycle,
      customPricingAdjustmentINR,
      planName,
      planCode,
      featureFlags,
    } = req.body;

    if (!Array.isArray(enabledPortals)) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_PORTALS',
        message: 'enabledPortals array required',
      });
      return;
    }

    const tenant = await Tenant.findById(new Types.ObjectId(tenantId));
    if (!tenant) {
      res.status(404).json({ success: false, errorCode: 'TENANT_NOT_FOUND', message: 'Tenant not found' });
      return;
    }

    // Always ensure 'admin' is included if omitted as core management base
    const portals = Array.from(new Set(enabledPortals));
    if (!portals.includes('admin')) {
      portals.unshift('admin');
    }

    tenant.enabledPortals = portals;

    if (monthlyPriceINR !== undefined) {
      tenant.subscriptionMonthlyINR = Math.max(0, Number(monthlyPriceINR));
    }
    if (billingCycle) {
      tenant.billingCycle = billingCycle === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY';
    }
    if (customPricingAdjustmentINR !== undefined) {
      tenant.customPricingAdjustmentINR = Number(customPricingAdjustmentINR);
    }
    if (planName) {
      tenant.subscriptionPlanName = String(planName);
    }
    if (planCode) {
      tenant.subscriptionPlanCode = String(planCode);
    }

    // Synchronize feature flags with enabled portals
    tenant.featureFlags = {
      ...tenant.featureFlags,
      pmsEnabled: portals.includes('reception'),
      posEnabled: portals.includes('cashier'),
      kdsEnabled: portals.includes('kds'),
      waiterEnabled: portals.includes('waiter'),
      qrDineInEnabled: portals.includes('customer'),
      roomServiceEnabled: portals.includes('guest'),
      ...(featureFlags || {}),
    };

    await tenant.save();

    // Broadcast real-time socket events across the tenant
    const socket = getSocketIO();
    if (socket) {
      socket.to(`${tenant._id.toString()}_global`).emit('tenant:flags_updated', {
        tenantId: tenant._id,
        featureFlags: tenant.featureFlags,
      });
      socket.to(`${tenant._id.toString()}_global`).emit('tenant:portals_updated', {
        tenantId: tenant._id,
        enabledPortals: tenant.enabledPortals,
        monthlyPriceINR: tenant.subscriptionMonthlyINR,
        featureFlags: tenant.featureFlags,
      });
    }

    res.status(200).json({
      success: true,
      message: `Updated portal allocations for ${tenant.name}`,
      tenant: {
        id: tenant._id,
        name: tenant.name,
        enabledPortals: tenant.enabledPortals,
        subscriptionMonthlyINR: tenant.subscriptionMonthlyINR,
        billingCycle: tenant.billingCycle,
        customPricingAdjustmentINR: tenant.customPricingAdjustmentINR,
        featureFlags: tenant.featureFlags,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 4. Create Subscription Tier Plan
export const createSubscriptionPlan = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { name, code, monthlyPriceINR, annualPriceINR, limits, featureFlags } = req.body;

    if (!name || !code || monthlyPriceINR === undefined) {
      res.status(400).json({ success: false, errorCode: 'MISSING_FIELDS', message: 'Name, code, and pricing required' });
      return;
    }

    const plan = new SubscriptionPlan({
      name,
      code,
      monthlyPriceINR: Number(monthlyPriceINR),
      annualPriceINR: Number(annualPriceINR || Number(monthlyPriceINR) * 10),
      limits: limits || { maxRooms: 25, maxTables: 15, maxStaffUsers: 10 },
      featureFlags: featureFlags || {
        pmsEnabled: true,
        kdsEnabled: true,
        qrDineInEnabled: true,
        roomServiceEnabled: true,
        waiterEnabled: true,
        posEnabled: true,
        banquetEnabled: true,
        loyaltyEnabled: true,
        aiInsightsEnabled: false,
        tallyExportEnabled: true,
      },
      isActive: true,
    });

    await plan.save();
    res.status(201).json({ success: true, plan });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({ success: false, errorCode: 'DUPLICATE_PLAN_CODE', message: 'Subscription plan code already exists' });
      return;
    }
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 5. Get Subscription Plans
export const getSubscriptionPlans = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true }).sort({ monthlyPriceINR: 1 });
    res.status(200).json({ success: true, count: plans.length, plans });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 5b. Update Subscription Plan (Pricing & Limits)
export const updateSubscriptionPlan = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const planId = String(req.params.planId);
    const { name, monthlyPriceINR, annualPriceINR, limits, featureFlags, isActive } = req.body;

    const plan = await SubscriptionPlan.findById(new Types.ObjectId(planId));
    if (!plan) {
      res.status(404).json({ success: false, errorCode: 'PLAN_NOT_FOUND', message: 'Subscription plan not found' });
      return;
    }

    if (name !== undefined) plan.name = String(name);
    if (monthlyPriceINR !== undefined) plan.monthlyPriceINR = Math.max(0, Number(monthlyPriceINR));
    if (annualPriceINR !== undefined) plan.annualPriceINR = Math.max(0, Number(annualPriceINR));
    if (limits && typeof limits === 'object') {
      plan.limits = {
        maxRooms: limits.maxRooms !== undefined ? Number(limits.maxRooms) : plan.limits.maxRooms,
        maxTables: limits.maxTables !== undefined ? Number(limits.maxTables) : plan.limits.maxTables,
        maxStaffUsers: limits.maxStaffUsers !== undefined ? Number(limits.maxStaffUsers) : plan.limits.maxStaffUsers,
      };
    }
    if (featureFlags && typeof featureFlags === 'object') {
      plan.featureFlags = { ...plan.featureFlags, ...featureFlags };
    }
    if (isActive !== undefined) plan.isActive = Boolean(isActive);

    await plan.save();

    // Also update any tenants using this plan code if monthly price changed
    if (monthlyPriceINR !== undefined) {
      await Tenant.updateMany(
        { subscriptionPlanCode: plan.code },
        { $set: { subscriptionMonthlyINR: plan.monthlyPriceINR, subscriptionPlanName: plan.name } }
      );
    }

    res.status(200).json({ success: true, message: 'Subscription plan updated successfully', plan });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 5b. Deactivate / Delete Subscription Plan
export const deleteSubscriptionPlan = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const planId = String(req.params.planId);
    await SubscriptionPlan.findByIdAndUpdate(new Types.ObjectId(planId), { isActive: false });
    res.status(200).json({ success: true, message: 'Plan deactivated successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 6. Assign Subscription Plan to Tenant
export const assignPlanToTenant = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const tenantId = String(req.params.tenantId);
    const { planId } = req.body;

    const tenant = await Tenant.findById(new Types.ObjectId(tenantId));
    if (!tenant) {
      res.status(404).json({ success: false, errorCode: 'TENANT_NOT_FOUND', message: 'Tenant not found' });
      return;
    }

    const plan = await SubscriptionPlan.findById(new Types.ObjectId(planId));
    if (!plan) {
      res.status(404).json({ success: false, errorCode: 'PLAN_NOT_FOUND', message: 'Subscription plan not found' });
      return;
    }

    // Synchronize tenant's feature flags to match the assigned tier and
    // persist the plan itself so billing/MRR reporting stays truthful.
    tenant.featureFlags = { ...plan.featureFlags };
    tenant.subscriptionPlanId = plan._id as Types.ObjectId;
    tenant.subscriptionPlanCode = plan.code;
    tenant.subscriptionPlanName = plan.name;
    tenant.subscriptionMonthlyINR = Number(plan.monthlyPriceINR || 0);
    await tenant.save();

    res.status(200).json({
      success: true,
      message: `Tenant ${tenant.name} upgraded to plan ${plan.name}`,
      tenant: {
        id: tenant._id,
        name: tenant.name,
        planName: plan.name,
        planCode: plan.code,
        monthlyPriceINR: Number(plan.monthlyPriceINR || 0),
        featureFlags: tenant.featureFlags,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 7. Global Multi-Tenant Cross-Property Overview Dashboard
export const getPlatformOverviewMetrics = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { start, end } = parseRange(req);

    const [
      totalTenants,
      activeTenants,
      suspendedTenants,
      trialTenants,
      totalRooms,
      occupiedRooms,
      totalTables,
      occupiedTables,
      totalBookings,
      totalOrders,
      totalGuests,
      totalStaff,
      periodOrders,
      periodBookings,
      periodGuests,
      periodRevenueAgg,
      recentOrders,
      recentBookings,
      plans,
      revenueTrend,
    ] = await Promise.all([
      Tenant.countDocuments(),
      Tenant.countDocuments({ status: 'ACTIVE' }),
      Tenant.countDocuments({ status: 'SUSPENDED' }),
      Tenant.countDocuments({ status: 'TRIAL' }),
      Room.countDocuments(),
      Room.countDocuments({ status: RoomStatus.OCCUPIED }),
      DiningTable.countDocuments(),
      DiningTable.countDocuments({
        currentStatus: {
          $in: [
            TableStatus.OCCUPIED,
            TableStatus.PARTIALLY_OCCUPIED,
            TableStatus.BILLING,
          ],
        },
      }),
      Booking.countDocuments(),
      RestaurantOrder.countDocuments(),
      GuestProfile.countDocuments(),
      User.countDocuments({ isActive: true }),
      RestaurantOrder.countDocuments({ placedAt: { $gte: start, $lte: end } }),
      Booking.countDocuments({ createdAt: { $gte: start, $lte: end } }),
      GuestProfile.countDocuments({ createdAt: { $gte: start, $lte: end } }),
      Payment.aggregate([
        {
          $match: {
            status: PaymentStatus.SUCCESS,
            createdAt: { $gte: start, $lte: end },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      RestaurantOrder.find({ placedAt: { $gte: start, $lte: end } })
        .sort({ placedAt: -1 })
        .limit(6)
        .populate('hotelId', 'name')
        .lean(),
      Booking.find({ createdAt: { $gte: start, $lte: end } })
        .sort({ createdAt: -1 })
        .limit(6)
        .populate('hotelId', 'name')
        .lean(),
      SubscriptionPlan.find(),
      Payment.aggregate([
        {
          $match: {
            status: PaymentStatus.SUCCESS,
            createdAt: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            revenue: { $sum: '$amount' },
            payments: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    // Estimated MRR is only meaningful once real plans exist in the catalog.
    // Tenants with an assigned plan contribute their own plan price; tenants
    // without one fall back to the average catalogue price.
    const avgPlanPrice =
      plans.length > 0
        ? plans.reduce((sum, plan) => sum + plan.monthlyPriceINR, 0) / plans.length
        : 0;

    const tenantBilling = await Tenant.find({ status: 'ACTIVE' })
      .select('subscriptionMonthlyINR')
      .lean();

    const assignedMrr = tenantBilling.reduce(
      (sum: number, tenant: any) => sum + Number(tenant.subscriptionMonthlyINR || 0),
      0
    );
    const unassignedCount = tenantBilling.filter(
      (tenant: any) => !Number(tenant.subscriptionMonthlyINR || 0)
    ).length;
    const estimatedMRR = Math.round(assignedMrr + unassignedCount * avgPlanPrice);
    const periodRevenue = Number(periodRevenueAgg[0]?.total || 0);

    const activity = [
      ...recentOrders.map((order: any) => ({
        id: String(order._id),
        kind: 'ORDER',
        title: `Order ${order.orderNumber}`,
        subtitle: String(order.hotelId?.name || 'Hotel'),
        amount: Array.isArray(order.items)
          ? order.items.reduce(
              (sum: number, item: any) =>
                sum + Number(item.subtotal || Number(item.unitPrice || 0) * Number(item.quantity || 0)),
              0
            )
          : 0,
        status: order.orderStatus,
        occurredAt: order.placedAt || order.createdAt,
      })),
      ...recentBookings.map((booking: any) => ({
        id: String(booking._id),
        kind: 'BOOKING',
        title: `Booking ${booking.bookingNumber}`,
        subtitle: `${String(booking.hotelId?.name || 'Hotel')} • ${booking.guestName}`,
        amount: Number(booking.grandTotal || 0),
        status: booking.bookingStatus,
        occurredAt: booking.createdAt,
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.occurredAt || 0).getTime() - new Date(a.occurredAt || 0).getTime()
      )
      .slice(0, 8);

    res.status(200).json({
      success: true,
      platformMetrics: {
        range: { start, end },
        tenants: {
          total: totalTenants,
          active: activeTenants,
          suspended: suspendedTenants,
          trial: trialTenants,
        },
        inventory: {
          totalRooms,
          occupiedRooms,
          totalTables,
          occupiedTables,
          totalBookings,
          totalOrders,
          totalGuests,
          totalStaff,
        },
        period: {
          revenue: periodRevenue,
          orders: periodOrders,
          bookings: periodBookings,
          newGuests: periodGuests,
        },
        trend: revenueTrend.map((point: any) => ({
          date: String(point._id),
          revenue: Number(point.revenue || 0),
          payments: Number(point.payments || 0),
        })),
        financials: {
          estimatedMonthlyRecurringRevenueINR: estimatedMRR,
          currency: 'INR',
        },
        infrastructure: {
          engineStatus: 'OPERATIONAL',
          multiTenancyIsolation: 'STRICT_JWT_AND_DB',
          activeShiftsCompleted: 10,
        },
        activity,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 8. Provision a tenant's physical inventory (rooms + dining tables).
// Used right after onboarding so a new property is immediately operable
// instead of showing an empty PMS.
export const provisionTenantCapacity = async (
  req: TenantRequest,
  res: Response
): Promise<void> => {
  try {
    const tenantId = String(req.params.tenantId);
    if (!Types.ObjectId.isValid(tenantId)) {
      res.status(400).json({ success: false, errorCode: 'INVALID_TENANT', message: 'Invalid tenant id' });
      return;
    }

    const tenant = await Tenant.findById(new Types.ObjectId(tenantId));
    if (!tenant) {
      res.status(404).json({ success: false, errorCode: 'TENANT_NOT_FOUND', message: 'Tenant not found' });
      return;
    }

    const roomCount = Math.max(0, Math.min(500, Number(req.body?.roomCount || 0)));
    const tableCount = Math.max(0, Math.min(200, Number(req.body?.tableCount || 0)));

    if (!roomCount && !tableCount) {
      res.status(200).json({
        success: true,
        message: 'No capacity requested — nothing provisioned',
        data: { roomsCreated: 0, tablesCreated: 0 },
      });
      return;
    }

    const hashToken = (seed: string) =>
      crypto.createHash('sha256').update(`${seed}:${crypto.randomUUID()}`).digest('hex');

    let roomsCreated = 0;
    let tablesCreated = 0;

    if (roomCount > 0) {
      let roomType = await RoomType.findOne({ hotelId: tenant._id });
      if (!roomType) {
        roomType = await RoomType.create({
          hotelId: tenant._id,
          name: 'Standard Room',
          code: 'STD',
          baseCapacityAdults: 2,
          baseCapacityChildren: 1,
          maxCapacity: 3,
          basePriceOvernight: 2500,
          weekendPrice: 3000,
          extraBedPrice: 500,
          gstRate: 12,
          basePriceDayUse: 1500,
          basePriceHourly: 400,
          amenities: ['King Bed', 'AC', 'High-speed WiFi'],
          totalRoomsCount: roomCount,
          isActive: true,
        });
      }

      const existingRooms = await Room.find({ hotelId: tenant._id }).select('roomNumber').lean();
      const existingNumbers = new Set(existingRooms.map((room: any) => String(room.roomNumber)));

      const roomDocs = [];
      let created = 0;
      for (let index = existingRooms.length; created < roomCount; index += 1) {
        const roomNumber = String(100 + index);
        if (existingNumbers.has(roomNumber)) continue;
        roomDocs.push({
          hotelId: tenant._id,
          roomNumber,
          roomTypeId: roomType._id,
          floorNumber: 1 + Math.floor(index / 10),
          status: 'AVAILABLE',
          permanentQrCodeHash: hashToken(`room:${tenant._id}:${roomNumber}`),
        });
        created += 1;
      }

      if (roomDocs.length > 0) {
        const inserted = await Room.insertMany(roomDocs, { ordered: false });
        roomsCreated = inserted.length;
        roomType.totalRoomsCount = Number(roomType.totalRoomsCount || 0) + roomsCreated;
        await roomType.save();
      }
    }

    if (tableCount > 0) {
      const existingTables = await DiningTable.find({ hotelId: tenant._id }).select('tableNumber').lean();
      const existingNumbers = new Set(existingTables.map((table: any) => String(table.tableNumber)));

      const tableDocs = [];
      let created = 0;
      for (let index = existingTables.length; created < tableCount; index += 1) {
        const tableNumber = `T-${String(index + 1).padStart(2, '0')}`;
        if (existingNumbers.has(tableNumber)) continue;
        tableDocs.push({
          hotelId: tenant._id,
          tableNumber,
          floorLevel: 'Ground Floor',
          section: 'AC_HALL',
          capacity: 4,
          currentStatus: 'AVAILABLE',
          isCommunityTable: false,
          allowCoDining: true,
          seats: Array.from({ length: 4 }, (_, seatIndex) => ({
            seatNumber: seatIndex + 1,
            seatLabel: `S${seatIndex + 1}`,
            status: 'AVAILABLE',
          })),
          availableSeatsCount: 4,
          occupiedSeatsCount: 0,
          qrTokenHash: hashToken(`table:${tenant._id}:${tableNumber}`),
        });
        created += 1;
      }

      if (tableDocs.length > 0) {
        const inserted = await DiningTable.insertMany(tableDocs, { ordered: false });
        tablesCreated = inserted.length;
      }
    }

    res.status(201).json({
      success: true,
      message: `Provisioned ${roomsCreated} rooms and ${tablesCreated} dining tables`,
      data: { roomsCreated, tablesCreated },
    });
  } catch (error: any) {
    console.error('[SuperAdmin] Provision capacity error:', error);
    res.status(500).json({ success: false, errorCode: 'PROVISION_FAILED', message: error.message });
  }
};

// 9. Get Portal Pricing Catalog (DB-backed with shared-types fallback)
export const getPortalPricingCatalog = async (_req: TenantRequest, res: Response): Promise<void> => {
  try {
    await ensureDefaultPortalPricing();
    let catalog = await PortalPricing.find({ isActive: true }).sort({ port: 1 }).lean();
    if (!catalog || catalog.length === 0) {
      catalog = DEFAULT_PORTAL_CATALOG as any;
    }
    res.status(200).json({ success: true, catalog });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 10. Update Portal Pricing in Database Catalog
export const updatePortalPricing = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { portalKey, defaultMonthlyPriceINR, isActive } = req.body;
    if (!portalKey) {
      res.status(400).json({ success: false, errorCode: 'INVALID_INPUT', message: 'portalKey is required' });
      return;
    }
    await ensureDefaultPortalPricing();
    const updated = await PortalPricing.findOneAndUpdate(
      { portalKey },
      {
        ...(defaultMonthlyPriceINR !== undefined
          ? { defaultMonthlyPriceINR: Math.max(0, Number(defaultMonthlyPriceINR)) }
          : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
      { new: true, upsert: true }
    );
    res.status(200).json({ success: true, message: `Updated pricing for ${portalKey}`, portal: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 11. List Subscription Invoices
export const getSubscriptionInvoices = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const filter: any = {};
    if (req.query.tenantId && Types.ObjectId.isValid(String(req.query.tenantId))) {
      filter.tenantId = new Types.ObjectId(String(req.query.tenantId));
    }
    if (req.query.status) {
      filter.status = String(req.query.status).toUpperCase();
    }
    const invoices = await SubscriptionInvoice.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    res.status(200).json({ success: true, invoices });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 12. Generate New Subscription Invoice for a Tenant
export const generateSubscriptionInvoice = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, customAdjustmentINR, notes } = req.body;
    if (!tenantId || !Types.ObjectId.isValid(tenantId)) {
      res.status(400).json({ success: false, errorCode: 'INVALID_TENANT', message: 'Valid tenantId is required' });
      return;
    }
    const tenant = await Tenant.findById(new Types.ObjectId(tenantId));
    if (!tenant) {
      res.status(404).json({ success: false, errorCode: 'TENANT_NOT_FOUND', message: 'Tenant not found' });
      return;
    }
    const cycle = tenant.billingCycle || 'MONTHLY';
    const baseMonthly = tenant.subscriptionMonthlyINR || 0;
    const baseAmount = cycle === 'ANNUAL' ? baseMonthly * 10 : baseMonthly;
    const adjustment = Number(customAdjustmentINR || tenant.customPricingAdjustmentINR || 0);
    const subtotal = Math.max(0, baseAmount + adjustment);
    const taxAmount = Math.round(subtotal * 0.18); // 18% GST standard in India SaaS
    const totalAmount = subtotal + taxAmount;

    const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV-${dateStr}-${tenant.slug.toUpperCase().slice(0, 4)}-${randomSuffix}`;

    const periodStart = new Date();
    const periodEnd = new Date(Date.now() + (cycle === 'ANNUAL' ? 365 : 30) * 86400000);

    const invoice = await SubscriptionInvoice.create({
      invoiceNumber,
      tenantId: tenant._id,
      hotelName: tenant.name,
      billingCycle: cycle,
      periodStart,
      periodEnd,
      allocatedPortals: tenant.enabledPortals || [],
      baseAmountINR: baseAmount,
      customAdjustmentINR: adjustment,
      taxAmountINR: taxAmount,
      totalAmountINR: totalAmount,
      status: 'PENDING',
      notes: notes || `Subscription invoice for ${tenant.name} (${cycle})`,
    });

    res.status(201).json({ success: true, message: `Generated invoice ${invoiceNumber}`, invoice });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 13. Settle / Record Payment for Subscription Invoice
export const settleSubscriptionInvoice = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const invoiceId = String(req.params.invoiceId);
    if (!Types.ObjectId.isValid(invoiceId)) {
      res.status(400).json({ success: false, errorCode: 'INVALID_ID', message: 'Invalid invoiceId' });
      return;
    }
    const { paymentMethod, paymentReference, notes } = req.body;
    const invoice = await SubscriptionInvoice.findById(new Types.ObjectId(invoiceId));
    if (!invoice) {
      res.status(404).json({ success: false, errorCode: 'NOT_FOUND', message: 'Invoice not found' });
      return;
    }
    invoice.status = 'PAID';
    invoice.paidAt = new Date();
    if (paymentMethod) invoice.paymentMethod = paymentMethod;
    if (paymentReference) invoice.paymentReference = paymentReference;
    if (notes) invoice.notes = notes;
    await invoice.save();

    // Update tenant's last payment date & status
    await Tenant.findByIdAndUpdate(invoice.tenantId, {
      'subscription.lastPaymentDate': new Date(),
      'subscription.paymentStatus': 'PAID',
    });

    res.status(200).json({ success: true, message: `Invoice ${invoice.invoiceNumber} marked as PAID`, invoice });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 14. Update Tenant Branding & Imagery (Super Admin)
export const updateTenantBranding = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const tenantId = String(req.params.tenantId);
    if (!Types.ObjectId.isValid(tenantId)) {
      res.status(400).json({ success: false, errorCode: 'INVALID_ID', message: 'Invalid tenantId' });
      return;
    }

    const { logoUrl, coverImageUrl, photos, tagline, primaryColor, secondaryColor, domain } = req.body;

    const updateFields: any = {};
    if (logoUrl !== undefined) updateFields.logoUrl = String(logoUrl).trim();
    if (coverImageUrl !== undefined) updateFields.coverImageUrl = String(coverImageUrl).trim();
    if (tagline !== undefined) updateFields.tagline = String(tagline).trim();
    if (primaryColor !== undefined) {
      updateFields.primaryColor = String(primaryColor).trim();
      updateFields['branding.primaryColor'] = String(primaryColor).trim();
    }
    if (secondaryColor !== undefined) updateFields.secondaryColor = String(secondaryColor).trim();
    if (domain !== undefined) updateFields.domain = String(domain).trim().toLowerCase();
    if (photos !== undefined) {
      updateFields.photos = Array.isArray(photos) ? photos.map((p: any) => String(p).trim()).filter(Boolean) : [];
    }

    const tenant = await Tenant.findByIdAndUpdate(
      new Types.ObjectId(tenantId),
      { $set: updateFields },
      { new: true }
    );

    if (!tenant) {
      res.status(404).json({ success: false, errorCode: 'TENANT_NOT_FOUND', message: 'Tenant not found' });
      return;
    }

    const socketIO = getSocketIO();
    if (socketIO) {
      socketIO.emit('tenant:updated', {
        id: tenant._id.toString(),
        slug: tenant.slug,
        name: tenant.name,
        logoUrl: tenant.logoUrl,
        coverImageUrl: tenant.coverImageUrl,
        tagline: tenant.tagline,
        photos: tenant.photos,
      });
      socketIO.emit('restaurant:info_updated', {
        name: tenant.name,
        tagline: tenant.tagline,
        logoUrl: tenant.logoUrl,
        coverImageUrl: tenant.coverImageUrl,
      });
    }

    res.status(200).json({
      success: true,
      message: `Branding updated successfully for ${tenant.name}`,
      tenant: {
        id: tenant._id,
        name: tenant.name,
        slug: tenant.slug,
        logoUrl: tenant.logoUrl,
        coverImageUrl: tenant.coverImageUrl,
        photos: tenant.photos,
        tagline: tenant.tagline,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 15. Create New Hotel Tenant & Provision Admin Account
export const createTenant = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const {
      name,
      slug: customSlug,
      email,
      contactEmail,
      contactPhone,
      adminPassword = 'SpiceHub@123',
      adminName,
      city = 'Sikar',
      state = 'Rajasthan',
      street,
      pincode,
      country = 'India',
      latitude,
      longitude,
      googleMapUrl,
      locationNotes,
      planCode = 'starter',
      initialRooms = 10,
      initialTables = 6,
    } = req.body;

    const tenantName = String(name || '').trim();
    const effectiveEmail = String(email || contactEmail || '').trim().toLowerCase();

    if (!tenantName || !effectiveEmail) {
      res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_FAILED',
        message: 'Hotel Name and Admin Contact Email are required',
      });
      return;
    }

    // Generate or sanitize unique slug
    let baseSlug = customSlug
      ? String(customSlug).trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')
      : tenantName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    baseSlug = baseSlug.replace(/^-|-$/g, '') || 'hotel';

    let uniqueSlug = baseSlug;
    let counter = 1;
    while (await Tenant.findOne({ slug: uniqueSlug })) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter += 1;
    }

    // Resolve subscription plan
    const plan = await SubscriptionPlan.findOne({
      $or: [{ code: planCode.toLowerCase() }, { isDefault: true }],
    }).sort({ monthlyPriceINR: 1 });

    const tenant = await Tenant.create({
      name: tenantName,
      slug: uniqueSlug,
      contactEmail: effectiveEmail,
      contactPhone: contactPhone || '9876543210',
      currency: 'INR',
      status: 'ACTIVE',
      subscriptionPlanId: plan?._id,
      subscriptionPlanCode: plan?.code || 'starter',
      subscriptionPlanName: plan?.name || 'Starter Tier',
      subscriptionMonthlyINR: plan?.monthlyPriceINR || 4999,
      billingCycle: 'MONTHLY',
      maxRooms: Math.max(1, Number(req.body?.maxRooms || initialRooms || 30)),
      maxTables: Math.max(1, Number(req.body?.maxTables || initialTables || 20)),
      enabledPortals: ['admin', 'cashier', 'waiter', 'kds', 'reception', 'customer', 'guest'],
      featureFlags: {
        pmsEnabled: true,
        posEnabled: true,
        kdsEnabled: true,
        waiterEnabled: true,
        qrDineInEnabled: true,
        roomServiceEnabled: true,
        banquetEnabled: false,
        loyaltyEnabled: false,
        aiInsightsEnabled: false,
        tallyExportEnabled: false,
      },
      coordinates: {
        latitude: typeof latitude === 'number' ? latitude : (typeof req.body?.coordinates?.latitude === 'number' ? req.body.coordinates.latitude : 26.9124),
        longitude: typeof longitude === 'number' ? longitude : (typeof req.body?.coordinates?.longitude === 'number' ? req.body.coordinates.longitude : 75.7873),
      },
      googleMapUrl: googleMapUrl || (typeof latitude === 'number' && typeof longitude === 'number' ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}` : undefined),
      locationNotes: locationNotes ? String(locationNotes).trim() : '',
      address: {
        street: street ? String(street).trim() : '',
        city: city || 'Sikar',
        state: state || 'Rajasthan',
        country: country || 'India',
        pincode: pincode ? String(pincode).trim() : '',
      },
    });

    // Create Hotel Admin User with argon2 hashes
    const passwordHash = await argon2.hash(String(adminPassword));
    const pinCodeHash = await argon2.hash('1111');

    await User.create({
      hotelId: tenant._id,
      name: adminName || `${tenantName} Admin`,
      email: effectiveEmail,
      phone: contactPhone || '9876543210',
      passwordHash,
      pinCodeHash,
      pinApprovedByAdmin: true,
      role: UserRole.HOTEL_ADMIN,
      permissions: ['*'],
      shiftStatus: ShiftStatus.OFFLINE,
      isMfaEnabled: false,
      isActive: true,
    });

    // Automatically provision initial rooms & tables so the hotel is immediately functional
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

    // Seed default kitchen station, menu categories, and dishes (e.g. Paneer Tikka, Club Sandwich)
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

    res.status(201).json({
      success: true,
      message: `Hotel tenant "${tenant.name}" created successfully!`,
      tenant: {
        id: tenant._id,
        name: tenant.name,
        slug: tenant.slug,
        contactEmail: tenant.contactEmail,
        contactPhone: tenant.contactPhone,
        status: tenant.status,
        planName: tenant.subscriptionPlanName,
        planCode: tenant.subscriptionPlanCode,
        monthlyPriceINR: tenant.subscriptionMonthlyINR,
        enabledPortals: tenant.enabledPortals,
      },
      credentials: {
        email: effectiveEmail,
        password: String(adminPassword),
        pin: '1111',
        portalUrl: 'http://localhost:3005',
      },
    });
  } catch (error: any) {
    console.error('[createTenant error]:', error);
    res.status(500).json({ success: false, errorCode: 'TENANT_CREATION_FAILED', message: error.message });
  }
};

// 16. Delete Tenant & Cascade Cleanup
export const deleteTenant = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const tenantId = String(req.params.tenantId);
    if (!Types.ObjectId.isValid(tenantId)) {
      res.status(400).json({ success: false, errorCode: 'INVALID_ID', message: 'Valid tenantId is required' });
      return;
    }

    const tenant = await Tenant.findById(new Types.ObjectId(tenantId));
    if (!tenant) {
      res.status(404).json({ success: false, errorCode: 'TENANT_NOT_FOUND', message: 'Tenant not found' });
      return;
    }

    // Cascade delete associated operational data
    await Promise.all([
      User.deleteMany({ hotelId: tenant._id }),
      Room.deleteMany({ hotelId: tenant._id }),
      RoomType.deleteMany({ hotelId: tenant._id }),
      DiningTable.deleteMany({ hotelId: tenant._id }),
      Booking.deleteMany({ hotelId: tenant._id }),
      RestaurantOrder.deleteMany({ hotelId: tenant._id }),
      Tenant.findByIdAndDelete(tenant._id),
    ]);

    res.status(200).json({
      success: true,
      message: `Tenant "${tenant.name}" and all associated records have been permanently deleted`,
      deletedId: tenantId,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 16b. Reset Hotel Admin Password
export const resetTenantAdminPassword = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const tenantId = String(req.params.tenantId);
    if (!Types.ObjectId.isValid(tenantId)) {
      res.status(400).json({ success: false, errorCode: 'INVALID_ID', message: 'Valid tenantId is required' });
      return;
    }

    const { newPassword } = req.body;
    const passwordToSet = newPassword && typeof newPassword === 'string' && newPassword.trim().length >= 6
      ? newPassword.trim()
      : `SpiceHub@${Math.floor(1000 + Math.random() * 9000)}`;

    const passwordHash = await argon2.hash(passwordToSet);

    let adminUser = await User.findOneAndUpdate(
      { hotelId: new Types.ObjectId(tenantId), role: UserRole.HOTEL_ADMIN },
      { passwordHash },
      { new: true }
    );

    const tenant = await Tenant.findById(new Types.ObjectId(tenantId));
    if (!tenant) {
      res.status(404).json({ success: false, errorCode: 'TENANT_NOT_FOUND', message: 'Tenant not found' });
      return;
    }

    if (!adminUser) {
      // If no admin user found by role HOTEL_ADMIN, check if any user exists in this hotel
      adminUser = await User.findOneAndUpdate(
        { hotelId: tenant._id },
        { passwordHash, role: UserRole.HOTEL_ADMIN },
        { new: true }
      );
      if (!adminUser) {
        // Create an admin user for this hotel
        const pinCodeHash = await argon2.hash('1111');
        adminUser = await User.create({
          hotelId: tenant._id,
          name: `${tenant.name} Admin`,
          email: tenant.contactEmail.toLowerCase(),
          phone: tenant.contactPhone || '9876543210',
          passwordHash,
          pinCodeHash,
          pinApprovedByAdmin: true,
          role: UserRole.HOTEL_ADMIN,
          permissions: ['*'],
          shiftStatus: ShiftStatus.ON_DUTY,
          isActive: true,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Admin credentials reset for ${tenant.name}`,
      credentials: {
        email: adminUser.email,
        password: passwordToSet,
        hotelSlug: tenant.slug,
        hotelName: tenant.name,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 16c. Update Tenant Subscription (Duration in Months/Years, Start/End Dates)
export const updateTenantSubscription = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const tenantId = String(req.params.tenantId);
    if (!Types.ObjectId.isValid(tenantId)) {
      res.status(400).json({ success: false, errorCode: 'INVALID_ID', message: 'Valid tenantId is required' });
      return;
    }

    const {
      durationMonths,
      durationYears,
      startDate,
      endDate,
      status,
      monthlyPriceINR,
      billingCycle,
      planCode,
      planName,
    } = req.body;

    const tenant = await Tenant.findById(new Types.ObjectId(tenantId));
    if (!tenant) {
      res.status(404).json({ success: false, errorCode: 'TENANT_NOT_FOUND', message: 'Tenant not found' });
      return;
    }

    let totalMonths = 1;
    if (durationYears && Number(durationYears) > 0) {
      totalMonths = Number(durationYears) * 12;
    } else if (durationMonths && Number(durationMonths) > 0) {
      totalMonths = Number(durationMonths);
    }

    const effectiveStart = startDate ? new Date(startDate) : (tenant.subscriptionStartDate || tenant.createdAt || new Date());
    
    let effectiveEnd: Date;
    if (endDate) {
      effectiveEnd = new Date(endDate);
    } else {
      effectiveEnd = new Date(effectiveStart);
      effectiveEnd.setMonth(effectiveEnd.getMonth() + totalMonths);
    }

    if (status && ['ACTIVE', 'TRIAL', 'SUSPENDED'].includes(status)) {
      tenant.status = status;
    }
    if (monthlyPriceINR !== undefined) {
      tenant.subscriptionMonthlyINR = Math.max(0, Number(monthlyPriceINR));
    }
    if (billingCycle) {
      tenant.billingCycle = billingCycle === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY';
    }
    if (planCode) tenant.subscriptionPlanCode = String(planCode);
    if (planName) tenant.subscriptionPlanName = String(planName);
    if (req.body?.maxRooms !== undefined) {
      tenant.maxRooms = Math.max(1, Number(req.body.maxRooms));
    }
    if (req.body?.maxTables !== undefined) {
      tenant.maxTables = Math.max(1, Number(req.body.maxTables));
    }

    tenant.subscriptionStartDate = effectiveStart;
    tenant.subscriptionEndDate = effectiveEnd;
    tenant.subscriptionDurationMonths = totalMonths;

    await tenant.save();

    const socketIO = getSocketIO();
    if (socketIO) {
      socketIO.to(`${tenant._id.toString()}_global`).emit('tenant:subscription_updated', {
        tenantId: tenant._id,
        status: tenant.status,
        subscriptionStartDate: tenant.subscriptionStartDate,
        subscriptionEndDate: tenant.subscriptionEndDate,
        subscriptionDurationMonths: tenant.subscriptionDurationMonths,
        monthlyPriceINR: tenant.subscriptionMonthlyINR,
      });
    }

    res.status(200).json({
      success: true,
      message: `Subscription for ${tenant.name} updated: valid from ${effectiveStart.toISOString().split('T')[0]} to ${effectiveEnd.toISOString().split('T')[0]} (${totalMonths} months)`,
      tenant: {
        id: tenant._id,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
        subscriptionStartDate: tenant.subscriptionStartDate,
        subscriptionEndDate: tenant.subscriptionEndDate,
        subscriptionDurationMonths: tenant.subscriptionDurationMonths,
        monthlyPriceINR: tenant.subscriptionMonthlyINR,
        billingCycle: tenant.billingCycle,
        maxRooms: tenant.maxRooms,
        maxTables: tenant.maxTables,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 16d. Update Tenant Capacity Ceiling (Max Rooms & Max Tables allocated by SuperAdmin)
export const updateTenantCapacity = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const tenantId = String(req.params.tenantId);
    if (!Types.ObjectId.isValid(tenantId)) {
      res.status(400).json({ success: false, errorCode: 'INVALID_ID', message: 'Valid tenantId is required' });
      return;
    }
    const tenant = await Tenant.findById(new Types.ObjectId(tenantId));
    if (!tenant) {
      res.status(404).json({ success: false, errorCode: 'TENANT_NOT_FOUND', message: 'Tenant not found' });
      return;
    }

    const { maxRooms, maxTables } = req.body;
    if (maxRooms !== undefined) {
      tenant.maxRooms = Math.max(1, Number(maxRooms));
    }
    if (maxTables !== undefined) {
      tenant.maxTables = Math.max(1, Number(maxTables));
    }

    await tenant.save();

    const [currentRooms, currentTables] = await Promise.all([
      Room.countDocuments({ hotelId: tenant._id }),
      DiningTable.countDocuments({ hotelId: tenant._id }),
    ]);

    const socketIO = getSocketIO();
    if (socketIO) {
      socketIO.to(`${tenant._id.toString()}_global`).emit('tenant:capacity_updated', {
        tenantId: tenant._id,
        maxRooms: tenant.maxRooms,
        maxTables: tenant.maxTables,
        currentRooms,
        currentTables,
      });
    }

    res.status(200).json({
      success: true,
      message: `Capacity ceiling for ${tenant.name} updated: Max ${tenant.maxRooms} rooms, Max ${tenant.maxTables} tables`,
      capacity: {
        maxRooms: tenant.maxRooms,
        maxTables: tenant.maxTables,
        currentRooms,
        currentTables,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 17. Consolidated System Activity & Audit Logs
export const getSystemLogs = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const limit = Math.min(100, Math.max(10, Number(req.query.limit || 30)));

    const [recentOrders, recentBookings, tenants, users] = await Promise.all([
      RestaurantOrder.find()
        .sort({ placedAt: -1 })
        .limit(limit)
        .populate('hotelId', 'name slug')
        .lean(),
      Booking.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('hotelId', 'name slug')
        .lean(),
      Tenant.find().select('name slug status createdAt').sort({ createdAt: -1 }).limit(10).lean(),
      User.find().select('name email role hotelId createdAt').sort({ createdAt: -1 }).limit(10).populate('hotelId', 'name').lean(),
    ]);

    const logs: any[] = [];

    // Map orders to logs
    for (const rawOrder of recentOrders) {
      const o = rawOrder as any;
      logs.push({
        id: `log-ord-${o._id}`,
        timestamp: o.placedAt || o.createdAt || new Date(),
        level: o.orderStatus === 'CANCELLED' ? 'WARN' : 'INFO',
        source: 'ORDER_ENGINE',
        action: `Order #${o.orderNumber || 'N/A'} (${o.orderStatus || 'CONFIRMED'})`,
        hotelName: o.hotelId?.name || 'Central Platform',
        details: `${(o.items || []).length} items • Table: ${o.tableNumber || 'Room Service'}`,
        ip: '127.0.0.1',
      });
    }

    // Map bookings to logs
    for (const rawBooking of recentBookings) {
      const b = rawBooking as any;
      logs.push({
        id: `log-bk-${b._id}`,
        timestamp: b.createdAt || new Date(),
        level: b.bookingStatus === 'CANCELLED' ? 'WARN' : 'INFO',
        source: 'PMS_FRONTDESK',
        action: `Booking #${b.bookingNumber || 'N/A'} (${b.bookingStatus || 'CONFIRMED'})`,
        hotelName: b.hotelId?.name || 'Central Platform',
        details: `Guest: ${b.guestName || 'Walk-in'} (${b.guestPhone || ''}) • ₹${b.grandTotal || 0}`,
        ip: '127.0.0.1',
      });
    }

    // Map recent tenant on-boardings
    for (const t of tenants) {
      logs.push({
        id: `log-tn-${t._id}`,
        timestamp: t.createdAt || new Date(),
        level: 'INFO',
        source: 'TENANT_PROVISIONER',
        action: `Tenant Registered: ${t.name}`,
        hotelName: t.name,
        details: `Status: ${t.status} • Slug: ${t.slug}`,
        ip: '127.0.0.1',
      });
    }

    // Map recent user provisions
    for (const u of users) {
      logs.push({
        id: `log-usr-${u._id}`,
        timestamp: u.createdAt || new Date(),
        level: 'INFO',
        source: 'RBAC_SECURITY',
        action: `User Provisioned: ${u.email}`,
        hotelName: (u.hotelId as any)?.name || 'Platform SuperAdmin',
        details: `Role: ${u.role} • Name: ${u.name}`,
        ip: '127.0.0.1',
      });
    }

    // Sort by timestamp descending
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.status(200).json({
      success: true,
      count: logs.length,
      logs: logs.slice(0, limit),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

export const updateTenantLocation = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const tenantIdStr = Array.isArray(req.params.tenantId) ? req.params.tenantId[0] : String(req.params.tenantId || '').trim();
    if (!tenantIdStr || !Types.ObjectId.isValid(tenantIdStr)) {
      res.status(400).json({ success: false, errorCode: 'INVALID_TENANT_ID', message: 'Valid tenantId is required' });
      return;
    }

    const {
      latitude,
      longitude,
      street,
      city,
      state,
      country = 'India',
      pincode,
      googleMapUrl,
      locationNotes,
    } = req.body;

    const tenant = await Tenant.findById(tenantIdStr);
    if (!tenant) {
      res.status(404).json({ success: false, errorCode: 'TENANT_NOT_FOUND', message: 'Hotel tenant not found' });
      return;
    }

    const currentLat = tenant.coordinates?.latitude ?? (tenant as any).latitude ?? 26.9124;
    const currentLng = tenant.coordinates?.longitude ?? (tenant as any).longitude ?? 75.7873;

    const newLat = typeof latitude === 'number' ? latitude : (typeof req.body?.coordinates?.latitude === 'number' ? req.body.coordinates.latitude : currentLat);
    const newLng = typeof longitude === 'number' ? longitude : (typeof req.body?.coordinates?.longitude === 'number' ? req.body.coordinates.longitude : currentLng);

    tenant.coordinates = {
      latitude: newLat,
      longitude: newLng,
    };
    (tenant as any).latitude = newLat;
    (tenant as any).longitude = newLng;

    tenant.address = {
      street: street !== undefined ? String(street).trim() : (tenant.address?.street || ''),
      city: city !== undefined ? String(city).trim() : (tenant.address?.city || 'Jaipur'),
      state: state !== undefined ? String(state).trim() : (tenant.address?.state || 'Rajasthan'),
      country: country !== undefined ? String(country).trim() : (tenant.address?.country || 'India'),
      pincode: pincode !== undefined ? String(pincode).trim() : (tenant.address?.pincode || ''),
    };

    if (googleMapUrl) {
      tenant.googleMapUrl = String(googleMapUrl).trim();
    } else {
      tenant.googleMapUrl = `https://www.google.com/maps/search/?api=1&query=${newLat},${newLng}`;
    }

    if (locationNotes !== undefined) {
      tenant.locationNotes = String(locationNotes).trim();
    }

    await tenant.save();

    res.status(200).json({
      success: true,
      message: `Real location and Google Maps coordinates updated successfully for ${tenant.name}`,
      tenant: {
        id: tenant._id,
        name: tenant.name,
        coordinates: tenant.coordinates,
        latitude: newLat,
        longitude: newLng,
        address: tenant.address,
        googleMapUrl: tenant.googleMapUrl,
        locationNotes: tenant.locationNotes,
      },
    });
  } catch (error: any) {
    console.error('❌ [updateTenantLocation] Error:', error);
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};



