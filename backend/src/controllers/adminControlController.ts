import { Response } from 'express';
import { Types } from 'mongoose';
import {
  NotificationPreference,
  AlertCategory,
  NotificationChannel,
  ISubscriptionToggle,
} from '../models/NotificationPreference';
import {
  AdminAlertEvent,
  AlertSeverity,
  AlertEventStatus,
} from '../models/AdminAlertEvent';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { Room, RoomStatus } from '../models/Room';
import { RestaurantOrder, OverallOrderStatus } from '../models/RestaurantOrder';
import { RestaurantBill } from '../models/RestaurantBill';
import { Payment } from '../models/Payment';
import { CashierShiftFloat, CashierShiftStatus } from '../models/CashierShiftFloat';
import { User } from '../models/User';
import { TenantRequest } from '../types';
import { io } from '../index';

// Helper: Generate Default Subscriptions for a Role
export function getDefaultSubscriptions(role: string): ISubscriptionToggle[] {
  return [
    {
      category: AlertCategory.LARGE_TRANSACTION,
      enabled: true,
      minThreshold: 5000,
      channels: [NotificationChannel.IN_APP, NotificationChannel.SOUNDBOX, NotificationChannel.DESKTOP_POPUP],
      soundChime: true,
      urgentVibration: false,
    },
    {
      category: AlertCategory.KITCHEN_DELAY,
      enabled: true,
      minThreshold: 15,
      channels: [NotificationChannel.IN_APP, NotificationChannel.DESKTOP_POPUP],
      soundChime: true,
      urgentVibration: true,
    },
    {
      category: AlertCategory.NEGATIVE_REVIEW,
      enabled: true,
      minThreshold: 2,
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.SMS],
      soundChime: true,
      urgentVibration: false,
    },
    {
      category: AlertCategory.VOID_COMPLIMENTARY,
      enabled: true,
      minThreshold: 500,
      channels: [NotificationChannel.IN_APP, NotificationChannel.DESKTOP_POPUP],
      soundChime: true,
      urgentVibration: false,
    },
    {
      category: AlertCategory.CASH_DRAWER_SECURITY,
      enabled: true,
      minThreshold: 0,
      channels: [NotificationChannel.IN_APP, NotificationChannel.SOUNDBOX, NotificationChannel.DESKTOP_POPUP],
      soundChime: true,
      urgentVibration: true,
    },
    {
      category: AlertCategory.VIP_CHECKIN,
      enabled: true,
      minThreshold: 0,
      channels: [NotificationChannel.IN_APP, NotificationChannel.SMS],
      soundChime: false,
      urgentVibration: false,
    },
    {
      category: AlertCategory.HOUSEKEEPING_OVERDUE,
      enabled: true,
      minThreshold: 45,
      channels: [NotificationChannel.IN_APP],
      soundChime: false,
      urgentVibration: false,
    },
    {
      category: AlertCategory.RESERVATION_SURGE,
      enabled: true,
      minThreshold: 10,
      channels: [NotificationChannel.IN_APP],
      soundChime: false,
      urgentVibration: false,
    },
  ];
}

// Helper: Check if current time falls within Quiet Hours (e.g. "23:00" to "06:00")
export function isCurrentlyInQuietHours(startTime: string, endTime: string, now: Date = new Date()): boolean {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    // Normal day range (e.g. 13:00 to 15:00)
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } else {
    // Overnight range (e.g. 23:00 to 06:00)
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }
}

// 1. Hotel Omniscient Telemetry Pulse
export const getHotelTelemetry = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Parallel aggregation across hotel domains
    const [
      tables,
      rooms,
      orders,
      billsToday,
      paymentsToday,
      openCashierFloats,
      activeAlertsCount,
      criticalAlertsCount,
    ] = await Promise.all([
      DiningTable.find({ hotelId }),
      Room.find({ hotelId }),
      RestaurantOrder.find({
        hotelId,
        orderStatus: { $in: [OverallOrderStatus.PLACED, OverallOrderStatus.PREPARING, OverallOrderStatus.READY] },
      }),
      RestaurantBill.find({ hotelId, createdAt: { $gte: startOfDay } }),
      Payment.find({ hotelId, createdAt: { $gte: startOfDay } }),
      CashierShiftFloat.find({ hotelId, status: CashierShiftStatus.OPEN }),
      AdminAlertEvent.countDocuments({ hotelId, status: AlertEventStatus.ACTIVE }),
      AdminAlertEvent.countDocuments({
        hotelId,
        status: AlertEventStatus.ACTIVE,
        severity: { $in: [AlertSeverity.CRITICAL, AlertSeverity.EMERGENCY] },
      }),
    ]);

    // Table occupancy statistics
    const totalTables = tables.length;
    const availableTables = tables.filter((t) => t.currentStatus === TableStatus.AVAILABLE).length;
    const occupiedTables = tables.filter((t) => t.currentStatus === TableStatus.OCCUPIED).length;
    const billingTables = tables.filter((t) => t.currentStatus === TableStatus.BILLING).length;
    const dirtyTables = tables.filter(
      (t) => t.currentStatus === TableStatus.DIRTY || t.currentStatus === TableStatus.CLEANING
    ).length;
    const diningOccupancyRate = totalTables > 0 ? Math.round(((totalTables - availableTables) / totalTables) * 100) : 0;

    // Room occupancy statistics
    const totalRooms = rooms.length;
    const availableRooms = rooms.filter((r) => r.status === RoomStatus.AVAILABLE).length;
    const occupiedRooms = rooms.filter((r) => r.status === RoomStatus.OCCUPIED).length;
    const dirtyRooms = rooms.filter(
      (r) => r.status === RoomStatus.DIRTY || r.status === RoomStatus.CLEANING
    ).length;
    const roomOccupancyRate = totalRooms > 0 ? Math.round(((totalRooms - availableRooms) / totalRooms) * 100) : 0;

    // Kitchen KDS Order latency & bottlenecks
    const nowTime = Date.now();
    let delayedOrdersCount = 0;
    let placedOrdersCount = 0;
    let preparingOrdersCount = 0;
    let readyOrdersCount = 0;

    orders.forEach((ord) => {
      if (ord.orderStatus === OverallOrderStatus.PLACED) placedOrdersCount++;
      if (ord.orderStatus === OverallOrderStatus.PREPARING) preparingOrdersCount++;
      if (ord.orderStatus === OverallOrderStatus.READY) readyOrdersCount++;

      const elapsedMinutes = (nowTime - new Date(ord.placedAt).getTime()) / (1000 * 60);
      if (elapsedMinutes > 15) {
        delayedOrdersCount++;
      }
    });

    // Financial Today Totals
    const todayBillsCount = billsToday.length;
    const todayGrossSales = billsToday.reduce((sum, b) => sum + (b.grandTotal || 0), 0);
    const todayCollected = billsToday.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
    const todayPendingDue = billsToday.reduce((sum, b) => sum + (b.dueAmount || 0), 0);

    let cashCollectedToday = 0;
    let upiCollectedToday = 0;
    let cardCollectedToday = 0;

    paymentsToday.forEach((p) => {
      if (p.paymentMode === 'CASH') cashCollectedToday += p.amount || 0;
      else if (p.paymentMode === 'UPI') upiCollectedToday += p.amount || 0;
      else if (p.paymentMode === 'CARD') cardCollectedToday += p.amount || 0;
    });

    // Cashier Floats
    const activeShiftsCount = openCashierFloats.length;
    const totalCashInDrawers = openCashierFloats.reduce((sum, f) => sum + (f.expectedCashInDrawer || 0), 0);

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      dining: {
        totalTables,
        availableTables,
        occupiedTables,
        billingTables,
        dirtyTables,
        occupancyRate: diningOccupancyRate,
      },
      rooms: {
        totalRooms,
        availableRooms,
        occupiedRooms,
        dirtyRooms,
        occupancyRate: roomOccupancyRate,
      },
      kitchen: {
        activeOrdersCount: orders.length,
        placedOrdersCount,
        preparingOrdersCount,
        readyOrdersCount,
        delayedOrdersCount,
        kdsHealth: delayedOrdersCount > 3 ? 'CRITICAL_DELAY' : delayedOrdersCount > 0 ? 'WARNING' : 'HEALTHY',
      },
      financials: {
        todayBillsCount,
        todayGrossSales,
        todayCollected,
        todayPendingDue,
        collectionByMode: {
          cash: cashCollectedToday,
          upi: upiCollectedToday,
          card: cardCollectedToday,
        },
      },
      cashier: {
        activeShiftsCount,
        totalCashInDrawers,
      },
      alerts: {
        activeAlertsCount,
        criticalAlertsCount,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 2. Get User / Role Notification Preferences (Auto-initializes defaults if not configured)
export const getNotificationPreferences = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const userId = req.user?.userId ? new Types.ObjectId(req.user.userId) : undefined;
    const role = req.user?.role || 'HOTEL_ADMIN';

    if (!hotelId || !userId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'User or Hotel context missing' });
      return;
    }

    let pref = await NotificationPreference.findOne({ hotelId, userId });
    if (!pref) {
      // Auto-create default preferences
      const defaultSubs = getDefaultSubscriptions(role);
      pref = new NotificationPreference({
        hotelId,
        userId,
        role,
        subscriptions: defaultSubs,
        quietHours: {
          enabled: false,
          startTime: '23:00',
          endTime: '06:00',
          allowCriticalOnly: true,
        },
        isActive: true,
      });
      await pref.save();
    }

    res.status(200).json({
      success: true,
      preferences: pref,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 3. Update Notification Preferences (Switchboard Alert Toggles)
export const updateNotificationPreferences = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const userId = req.user?.userId ? new Types.ObjectId(req.user.userId) : undefined;
    const role = req.user?.role || 'HOTEL_ADMIN';

    if (!hotelId || !userId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'User or Hotel context missing' });
      return;
    }

    const { subscriptions, quietHours, isActive } = req.body;

    const updateFields: any = { role };
    if (subscriptions && Array.isArray(subscriptions)) {
      updateFields.subscriptions = subscriptions;
    }
    if (quietHours && typeof quietHours === 'object') {
      updateFields.quietHours = quietHours;
    }
    if (isActive !== undefined) {
      updateFields.isActive = Boolean(isActive);
    }

    const pref = await NotificationPreference.findOneAndUpdate(
      { hotelId, userId },
      { $set: updateFields },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      success: true,
      message: 'Notification switchboard preferences updated successfully',
      preferences: pref,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 4. Central Admin Alert Event Dispatcher Engine
export const dispatchAdminAlert = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const {
      category,
      severity = AlertSeverity.INFO,
      title,
      message,
      payload = {},
      triggerSoundbox = false,
      soundboxSpeech,
      triggeredBy = req.user?.email || 'SYSTEM',
    } = req.body;

    if (!category || !title || !message) {
      res.status(400).json({
        success: false,
        errorCode: 'MISSING_FIELDS',
        message: 'Alert category, title, and message are required',
      });
      return;
    }

    // Retrieve all active notification preferences for this hotel
    const userPrefs = await NotificationPreference.find({ hotelId, isActive: true });

    const notifiedUserIds: Types.ObjectId[] = [];
    const deliveredChannelsSet = new Set<NotificationChannel>();
    let quietHoursSuppressedCount = 0;
    let thresholdSuppressedCount = 0;

    const now = new Date();

    for (const pref of userPrefs) {
      // Find matching category subscription
      const sub = pref.subscriptions.find((s) => s.category === category);
      if (!sub || !sub.enabled) continue;

      // 1. Check Quiet Hours
      if (pref.quietHours && pref.quietHours.enabled) {
        const inQuietHours = isCurrentlyInQuietHours(pref.quietHours.startTime, pref.quietHours.endTime, now);
        if (inQuietHours) {
          const isCritical = severity === AlertSeverity.CRITICAL || severity === AlertSeverity.EMERGENCY;
          if (!pref.quietHours.allowCriticalOnly || !isCritical) {
            quietHoursSuppressedCount++;
            continue;
          }
        }
      }

      // 2. Check Numeric Thresholds
      if (category === AlertCategory.LARGE_TRANSACTION && payload.amount !== undefined) {
        if (Number(payload.amount) < sub.minThreshold) {
          thresholdSuppressedCount++;
          continue;
        }
      } else if (category === AlertCategory.KITCHEN_DELAY && payload.delayMinutes !== undefined) {
        if (Number(payload.delayMinutes) < sub.minThreshold) {
          thresholdSuppressedCount++;
          continue;
        }
      } else if (category === AlertCategory.NEGATIVE_REVIEW && payload.rating !== undefined) {
        if (Number(payload.rating) > sub.minThreshold) {
          thresholdSuppressedCount++;
          continue;
        }
      } else if (category === AlertCategory.VOID_COMPLIMENTARY && payload.amount !== undefined) {
        if (Number(payload.amount) < sub.minThreshold) {
          thresholdSuppressedCount++;
          continue;
        }
      }

      // User qualifies for notification!
      notifiedUserIds.push(pref.userId);
      (sub.channels || []).forEach((ch) => deliveredChannelsSet.add(ch));
    }

    const deliveredChannels = Array.from(deliveredChannelsSet);
    const shouldDispatchSoundbox =
      triggerSoundbox || deliveredChannels.includes(NotificationChannel.SOUNDBOX);

    const speechText = soundboxSpeech || message;

    // Persist Admin Alert Event Log
    const alertEvent = new AdminAlertEvent({
      hotelId,
      category,
      severity,
      title,
      message,
      payload,
      triggeredBy,
      notifiedUserIds,
      deliveredChannels,
      soundboxDispatched: shouldDispatchSoundbox,
      soundboxSpeech: shouldDispatchSoundbox ? speechText : undefined,
      status: AlertEventStatus.ACTIVE,
    });
    await alertEvent.save();

    // Real-Time Socket Broadcast to Hotel Admin Channel
    io.to(`${hotelId.toString()}_admin`).emit('admin_alert_dispatched', {
      alertId: alertEvent._id,
      category,
      severity,
      title,
      message,
      payload,
      deliveredChannels,
      soundboxDispatched: shouldDispatchSoundbox,
      createdAt: alertEvent.createdAt,
    });

    // If Soundbox Channel Dispatched, emit to Soundbox Channel
    if (shouldDispatchSoundbox) {
      io.to(`${hotelId.toString()}_soundbox`).emit('soundbox_audio_broadcast', {
        alertId: alertEvent._id,
        category,
        severity,
        speech: speechText,
        volume: severity === AlertSeverity.CRITICAL ? 100 : 80,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(201).json({
      success: true,
      alert: alertEvent,
      metrics: {
        totalEvaluatedUsers: userPrefs.length,
        notifiedUsersCount: notifiedUserIds.length,
        deliveredChannels,
        quietHoursSuppressedCount,
        thresholdSuppressedCount,
        soundboxDispatched: shouldDispatchSoundbox,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 5. Get Omniscient Alerts Feed with Filter and Pagination
export const getAlertsFeed = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { category, severity, status, limit = 50, skip = 0 } = req.query;

    const query: any = { hotelId };
    if (category) query.category = category;
    if (severity) query.severity = severity;
    if (status) query.status = status;

    const [alerts, total] = await Promise.all([
      AdminAlertEvent.find(query)
        .sort({ createdAt: -1 })
        .skip(Number(skip))
        .limit(Number(limit)),
      AdminAlertEvent.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      total,
      count: alerts.length,
      alerts,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 6. Acknowledge Alert (Atomic 1-tap resolution)
export const acknowledgeAlert = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const userId = req.user?.userId ? new Types.ObjectId(req.user.userId) : undefined;
    const userName = req.body?.acknowledgedByName || req.user?.email || 'Hotel Admin';
    const alertId = String(req.params.alertId);

    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    // Atomic CAS on ACTIVE status
    const alert = await AdminAlertEvent.findOneAndUpdate(
      { _id: new Types.ObjectId(alertId), hotelId, status: AlertEventStatus.ACTIVE },
      {
        $set: {
          status: AlertEventStatus.ACKNOWLEDGED,
          acknowledgedBy: userId,
          acknowledgedByName: userName,
          acknowledgedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!alert) {
      // Check if already acknowledged or non-existent
      const existing = await AdminAlertEvent.findOne({ _id: new Types.ObjectId(alertId), hotelId });
      if (existing && existing.status !== AlertEventStatus.ACTIVE) {
        res.status(400).json({
          success: false,
          errorCode: 'ALREADY_ACKNOWLEDGED',
          message: `Alert was already ${existing.status.toLowerCase()} by ${existing.acknowledgedByName || 'another user'}`,
          alert: existing,
        });
        return;
      }
      res.status(404).json({ success: false, errorCode: 'ALERT_NOT_FOUND', message: 'Alert not found' });
      return;
    }

    // Broadcast acknowledgement to Admin room
    io.to(`${hotelId.toString()}_admin`).emit('admin_alert_acknowledged', {
      alertId: alert._id,
      acknowledgedBy: userId,
      acknowledgedByName: userName,
      acknowledgedAt: alert.acknowledgedAt,
    });

    res.status(200).json({
      success: true,
      message: 'Alert acknowledged successfully',
      alert,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 7. Resolve Alert with Notes
export const resolveAlert = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const alertId = String(req.params.alertId);
    const { resolutionNotes } = req.body;

    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const alert = await AdminAlertEvent.findOneAndUpdate(
      { _id: new Types.ObjectId(alertId), hotelId },
      {
        $set: {
          status: AlertEventStatus.RESOLVED,
          resolutionNotes: resolutionNotes || 'Resolved by admin',
        },
      },
      { new: true }
    );

    if (!alert) {
      res.status(404).json({ success: false, errorCode: 'ALERT_NOT_FOUND', message: 'Alert not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Alert resolved successfully',
      alert,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 8. Omniscient Switchboard Coverage & Dispatch Audit Summary
export const getSwitchboardSummary = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const [totalStaff, activePreferences, last24HoursAlerts] = await Promise.all([
      User.countDocuments({ hotelId }),
      NotificationPreference.find({ hotelId, isActive: true }),
      AdminAlertEvent.find({
        hotelId,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),
    ]);

    // Channel coverage count
    const channelCoverage: Record<string, number> = {
      IN_APP: 0,
      SOUNDBOX: 0,
      DESKTOP_POPUP: 0,
      SMS: 0,
      EMAIL: 0,
      WEBHOOK: 0,
    };

    activePreferences.forEach((pref) => {
      const userChannels = new Set<string>();
      pref.subscriptions.forEach((s) => {
        if (s.enabled) {
          s.channels.forEach((ch) => userChannels.add(ch));
        }
      });
      userChannels.forEach((ch) => {
        if (channelCoverage[ch] !== undefined) channelCoverage[ch]++;
      });
    });

    res.status(200).json({
      success: true,
      totalStaff,
      configuredPreferencesCount: activePreferences.length,
      channelCoverage,
      last24HoursVolume: {
        totalAlerts: last24HoursAlerts.length,
        criticalAlerts: last24HoursAlerts.filter((a) => a.severity === AlertSeverity.CRITICAL).length,
        soundboxBroadcasts: last24HoursAlerts.filter((a) => a.soundboxDispatched).length,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};
