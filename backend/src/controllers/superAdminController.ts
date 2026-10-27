import { Response } from 'express';
import { Types } from 'mongoose';
import crypto from 'crypto';
import { Tenant, ITenant } from '../models/Tenant';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { PortalPricing, ensureDefaultPortalPricing } from '../models/PortalPricing';
import { SubscriptionInvoice } from '../models/SubscriptionInvoice';
import { DEFAULT_PORTAL_CATALOG } from '@spicehub/shared-types';
import { Room, RoomStatus } from '../models/Room';
import { RoomType } from '../models/RoomType';
import { Booking } from '../models/Booking';
import { RestaurantOrder } from '../models/RestaurantOrder';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { GuestProfile } from '../models/GuestProfile';
import { User } from '../models/User';
import { Payment, PaymentStatus } from '../models/Payment';
import { TenantRequest, UserRole } from '../types';

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

        return {
          id: t._id,
          name: t.name,
          slug: t.slug,
          contactEmail: t.contactEmail,
          contactPhone: t.contactPhone,
          city: t.address?.city || '',
          state: t.address?.state || '',
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

    const { logoUrl, coverImageUrl, photos, tagline } = req.body;

    const updateFields: any = {};
    if (logoUrl !== undefined) updateFields.logoUrl = String(logoUrl).trim();
    if (coverImageUrl !== undefined) updateFields.coverImageUrl = String(coverImageUrl).trim();
    if (tagline !== undefined) updateFields.tagline = String(tagline).trim();
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


