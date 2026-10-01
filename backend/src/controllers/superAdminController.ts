import { Response } from 'express';
import { Types } from 'mongoose';
import { Tenant, ITenant } from '../models/Tenant';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { Room } from '../models/Room';
import { Booking } from '../models/Booking';
import { RestaurantOrder } from '../models/RestaurantOrder';
import { TenantRequest, UserRole } from '../types';
import { io } from '../index';

// 1. List All Tenants with Aggregated Metrics
export const listAllTenants = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const tenants = await Tenant.find().sort({ createdAt: -1 });

    const tenantList = await Promise.all(
      tenants.map(async (t) => {
        const roomCount = await Room.countDocuments({ hotelId: t._id });
        const bookingCount = await Booking.countDocuments({ hotelId: t._id });

        return {
          id: t._id,
          name: t.name,
          slug: t.slug,
          contactEmail: t.contactEmail,
          contactPhone: t.contactPhone,
          status: t.status,
          currency: t.currency,
          featureFlags: t.featureFlags,
          roomCount,
          bookingCount,
          createdAt: t.createdAt,
        };
      })
    );

    res.status(200).json({ success: true, count: tenantList.length, tenants: tenantList });
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

    // Synchronize tenant's feature flags to match the assigned tier
    tenant.featureFlags = { ...plan.featureFlags };
    await tenant.save();

    res.status(200).json({
      success: true,
      message: `Tenant ${tenant.name} upgraded to plan ${plan.name}`,
      tenant: {
        id: tenant._id,
        name: tenant.name,
        planName: plan.name,
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
    const totalTenants = await Tenant.countDocuments();
    const activeTenants = await Tenant.countDocuments({ status: 'ACTIVE' });
    const suspendedTenants = await Tenant.countDocuments({ status: 'SUSPENDED' });
    const trialTenants = await Tenant.countDocuments({ status: 'TRIAL' });

    const totalRooms = await Room.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const totalOrders = await RestaurantOrder.countDocuments();

    // Approximate platform MRR from active plans or tenant counts
    const plans = await SubscriptionPlan.find();
    const avgPlanPrice = plans.length > 0 ? plans.reduce((s, p) => s + p.monthlyPriceINR, 0) / plans.length : 4999;
    const estimatedMRR = activeTenants * avgPlanPrice;

    res.status(200).json({
      success: true,
      platformMetrics: {
        tenants: {
          total: totalTenants,
          active: activeTenants,
          suspended: suspendedTenants,
          trial: trialTenants,
        },
        inventory: {
          totalRooms,
          totalBookings,
          totalOrders,
        },
        financials: {
          estimatedMonthlyRecurringRevenueINR: estimatedMRR,
          currency: 'INR',
        },
        infrastructure: {
          engineStatus: 'OPERATIONAL',
          multiTenancyIsolation: 'STRICT_JWT_AND_DB',
          activeShiftsCompleted: 10,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};
