import { Response } from 'express';
import { Types } from 'mongoose';
import crypto from 'crypto';
import { Tenant, ITenant } from '../models/Tenant';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { Room, RoomStatus } from '../models/Room';
import { RoomType } from '../models/RoomType';
import { Booking } from '../models/Booking';
import { RestaurantOrder } from '../models/RestaurantOrder';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { GuestProfile } from '../models/GuestProfile';
import { User } from '../models/User';
import { Payment, PaymentStatus } from '../models/Payment';
import { TenantRequest, UserRole } from '../types';
import { io } from '../index';

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
          status: t.status,
          currency: t.currency,
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
    io.to(`${tenant._id.toString()}_global`).emit('tenant:status_changed', {
      tenantId: tenant._id,
      newStatus: status,
      reason,
    });

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

    tenant.featureFlags = {
      ...tenant.featureFlags,
      ...featureFlags,
    };
    await tenant.save();

    io.to(`${tenant._id.toString()}_global`).emit('tenant:flags_updated', {
      tenantId: tenant._id,
      featureFlags: tenant.featureFlags,
    });

    res.status(200).json({
      success: true,
      tenantId: tenant._id,
      featureFlags: tenant.featureFlags,
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
