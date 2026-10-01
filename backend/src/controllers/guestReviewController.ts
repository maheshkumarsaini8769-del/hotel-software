import { Response } from 'express';
import { Types } from 'mongoose';
import {
  GuestReview,
  ReviewSource,
  ServiceRecoveryStatus,
} from '../models/GuestReview';
import {
  AdminAlertEvent,
  AlertSeverity,
  AlertEventStatus,
} from '../models/AdminAlertEvent';
import {
  NotificationPreference,
  AlertCategory,
  NotificationChannel,
} from '../models/NotificationPreference';
import { TenantRequest } from '../types';
import { io } from '../index';

// 1. Submit In-App Guest Review (with Automatic Negative Review Service Recovery Trigger)
export const submitGuestReview = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const {
      guestName,
      guestPhone,
      orderId,
      billId,
      stayId,
      source = ReviewSource.TABLE_QR,
      tableNumber,
      roomNumber,
      waiterId,
      waiterName,
      ratings,
      tags = [],
      comments,
    } = req.body;

    if (!guestName || !ratings || typeof ratings.overall !== 'number') {
      res.status(400).json({
        success: false,
        errorCode: 'MISSING_FIELDS',
        message: 'guestName and ratings.overall (1 to 5) are required',
      });
      return;
    }

    const overall = Math.min(5, Math.max(1, Math.round(ratings.overall)));
    const isNegative = overall <= 2;
    const isPositive = overall >= 4;

    const review = new GuestReview({
      hotelId,
      guestName,
      guestPhone: guestPhone || '',
      orderId: orderId ? new Types.ObjectId(orderId) : undefined,
      billId: billId ? new Types.ObjectId(billId) : undefined,
      stayId: stayId ? new Types.ObjectId(stayId) : undefined,
      source,
      tableNumber,
      roomNumber,
      waiterId: waiterId ? new Types.ObjectId(waiterId) : undefined,
      waiterName,
      ratings: {
        overall,
        foodQuality: ratings.foodQuality ? Number(ratings.foodQuality) : undefined,
        serviceSpeed: ratings.serviceSpeed ? Number(ratings.serviceSpeed) : undefined,
        ambienceCleanliness: ratings.ambienceCleanliness ? Number(ratings.ambienceCleanliness) : undefined,
        valueForMoney: ratings.valueForMoney ? Number(ratings.valueForMoney) : undefined,
      },
      tags: Array.isArray(tags) ? tags : [],
      comments: comments || '',
      isNegative,
      serviceRecovery: {
        status: isNegative ? ServiceRecoveryStatus.TRIGGERED : ServiceRecoveryStatus.NONE,
        triggeredAt: isNegative ? new Date() : undefined,
      },
      googleReviewPrompted: isPositive,
      googleReviewClicked: false,
    });

    await review.save();

    let alertEvent: any = null;

    // Trigger Instant Service Recovery Escalation if Negative Review (<= 2 stars)
    if (isNegative) {
      const locationLabel = tableNumber ? `Table ${tableNumber}` : roomNumber ? `Room ${roomNumber}` : 'Direct Guest';
      const speech = `Service Alert: Negative ${overall} star review on ${locationLabel} from ${guestName}. Immediate manager visit required.`;

      // Check Notification Preferences for SOUNDBOX subscription
      const prefs = await NotificationPreference.find({ hotelId, isActive: true });
      const hasSoundboxSub = prefs.some((p) =>
        p.subscriptions.some((s) => s.category === AlertCategory.NEGATIVE_REVIEW && s.enabled && s.channels.includes(NotificationChannel.SOUNDBOX))
      );

      alertEvent = new AdminAlertEvent({
        hotelId,
        category: AlertCategory.NEGATIVE_REVIEW,
        severity: AlertSeverity.CRITICAL,
        title: `🚨 Negative CSAT Alert - ${locationLabel}`,
        message: `Guest ${guestName} rated ${overall}★: "${comments || tags.join(', ') || 'Dissatisfied experience'}". Immediate recovery needed before guest departs.`,
        payload: {
          reviewId: review._id,
          ratings: review.ratings,
          tableNumber,
          roomNumber,
          guestName,
          guestPhone,
          tags,
          comments,
        },
        triggeredBy: 'CUSTOMER_PORTAL',
        deliveredChannels: hasSoundboxSub ? [NotificationChannel.IN_APP, NotificationChannel.SOUNDBOX] : [NotificationChannel.IN_APP],
        soundboxDispatched: hasSoundboxSub,
        soundboxSpeech: hasSoundboxSub ? speech : undefined,
        status: AlertEventStatus.ACTIVE,
      });
      await alertEvent.save();

      // Realtime Socket Broadcast to Hotel Admin & Floor Captains
      io.to(`${hotelId.toString()}_admin`).emit('negative_review_alert', {
        alertId: alertEvent._id,
        reviewId: review._id,
        location: locationLabel,
        guestName,
        rating: overall,
        comments,
        tags,
        soundboxSpoken: hasSoundboxSub,
      });

      // Emit to Soundbox if enabled
      if (hasSoundboxSub) {
        io.to(`${hotelId.toString()}_soundbox`).emit('soundbox_audio_broadcast', {
          alertId: alertEvent._id,
          speech,
          severity: 'CRITICAL',
          category: 'NEGATIVE_REVIEW',
          timestamp: new Date().toISOString(),
        });
      }
    }

    res.status(201).json({
      success: true,
      message: isNegative
        ? 'Feedback received. Duty manager has been alerted to assist you immediately.'
        : 'Thank you for your valuable feedback!',
      review,
      serviceRecoveryTriggered: isNegative,
      googleReviewPrompt: isPositive
        ? {
            prompted: true,
            targetUrl: 'https://g.page/r/spicehub-hotel-taj/review',
            callToAction: 'Loved your meal? Share your review on Google to help fellow food lovers!',
          }
        : null,
      alert: alertEvent,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 2. Get Guest Reviews Feed with CSAT Aggregation
export const getGuestReviews = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { isNegative, source, status, tableNumber, roomNumber, limit = 50, skip = 0 } = req.query;

    const query: any = { hotelId };
    if (isNegative !== undefined) query.isNegative = isNegative === 'true';
    if (source) query.source = source;
    if (status) query['serviceRecovery.status'] = status;
    if (tableNumber) query.tableNumber = tableNumber;
    if (roomNumber) query.roomNumber = roomNumber;

    const [reviews, totalCount, allReviewsForStats] = await Promise.all([
      GuestReview.find(query)
        .sort({ createdAt: -1 })
        .skip(Number(skip))
        .limit(Number(limit)),
      GuestReview.countDocuments(query),
      GuestReview.find({ hotelId }),
    ]);

    // Aggregate CSAT Metrics
    const totalAll = allReviewsForStats.length;
    let sumOverall = 0;
    let sumFood = 0;
    let foodCount = 0;
    let sumService = 0;
    let serviceCount = 0;
    let negativeCount = 0;

    allReviewsForStats.forEach((r) => {
      sumOverall += r.ratings.overall;
      if (r.ratings.foodQuality) {
        sumFood += r.ratings.foodQuality;
        foodCount++;
      }
      if (r.ratings.serviceSpeed) {
        sumService += r.ratings.serviceSpeed;
        serviceCount++;
      }
      if (r.isNegative) negativeCount++;
    });

    const averageOverall = totalAll > 0 ? Number((sumOverall / totalAll).toFixed(2)) : 5.0;
    const averageFood = foodCount > 0 ? Number((sumFood / foodCount).toFixed(2)) : 5.0;
    const averageService = serviceCount > 0 ? Number((sumService / serviceCount).toFixed(2)) : 5.0;

    res.status(200).json({
      success: true,
      totalCount,
      count: reviews.length,
      metrics: {
        totalReviews: totalAll,
        negativeReviewsCount: negativeCount,
        positiveReviewsCount: totalAll - negativeCount,
        averageOverall,
        averageFood,
        averageService,
        csatPercentage: totalAll > 0 ? Math.round(((totalAll - negativeCount) / totalAll) * 100) : 100,
      },
      reviews,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 3. Manager Service Recovery Action (Visiting Table, Offering Complimentary Dessert/Discount)
export const updateServiceRecovery = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const userId = req.user?.userId ? new Types.ObjectId(req.user.userId) : undefined;
    const reviewId = String(req.params.reviewId);

    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const {
      status,
      recoveryAction,
      discountPercentage = 0,
      recoveryNotes,
      managerName = req.user?.email || 'Duty Manager',
    } = req.body;

    if (!status || !Object.values(ServiceRecoveryStatus).includes(status)) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_STATUS',
        message: `Valid status required: ${Object.values(ServiceRecoveryStatus).join(', ')}`,
      });
      return;
    }

    const review = await GuestReview.findOne({ _id: new Types.ObjectId(reviewId), hotelId });
    if (!review) {
      res.status(404).json({ success: false, errorCode: 'REVIEW_NOT_FOUND', message: 'Review not found' });
      return;
    }

    // Update recovery fields
    review.serviceRecovery.status = status as ServiceRecoveryStatus;
    review.serviceRecovery.assignedManagerId = userId;
    review.serviceRecovery.assignedManagerName = managerName;
    if (recoveryAction) review.serviceRecovery.recoveryAction = recoveryAction;
    if (discountPercentage !== undefined) review.serviceRecovery.discountPercentage = Number(discountPercentage);
    if (recoveryNotes) review.serviceRecovery.recoveryNotes = recoveryNotes;
    if (status === ServiceRecoveryStatus.RESOLVED) {
      review.serviceRecovery.resolvedAt = new Date();
    }

    await review.save();

    // If resolved, also mark related AdminAlertEvent as RESOLVED
    if (status === ServiceRecoveryStatus.RESOLVED) {
      await AdminAlertEvent.updateMany(
        { hotelId, 'payload.reviewId': review._id, status: { $ne: AlertEventStatus.RESOLVED } },
        {
          $set: {
            status: AlertEventStatus.RESOLVED,
            resolutionNotes: `Service Recovery Completed: ${recoveryAction || recoveryNotes || 'Guest satisfied'}`,
          },
        }
      );
    }

    // Broadcast recovery update to Admin
    io.to(`${hotelId.toString()}_admin`).emit('service_recovery_updated', {
      reviewId: review._id,
      status,
      managerName,
      recoveryAction,
      resolvedAt: review.serviceRecovery.resolvedAt,
    });

    res.status(200).json({
      success: true,
      message: `Service recovery status updated to ${status}`,
      review,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 4. Track Google Review Click (Conversion Funnel Metric)
export const trackGoogleReviewClick = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const reviewId = String(req.params.reviewId);

    const review = await GuestReview.findOneAndUpdate(
      { _id: new Types.ObjectId(reviewId), hotelId },
      { $set: { googleReviewClicked: true } },
      { new: true }
    );

    if (!review) {
      res.status(404).json({ success: false, errorCode: 'REVIEW_NOT_FOUND', message: 'Review not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Google review click tracked',
      review,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 5. CSAT & Staff Performance Leaderboard Analytics
export const getCsatAnalytics = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const reviews = await GuestReview.find({ hotelId });

    // Waiter performance map
    const waiterStats: Record<string, { waiterName: string; totalReviews: number; totalRating: number }> = {};

    reviews.forEach((r) => {
      if (r.waiterId && r.waiterName) {
        const wid = r.waiterId.toString();
        if (!waiterStats[wid]) {
          waiterStats[wid] = { waiterName: r.waiterName, totalReviews: 0, totalRating: 0 };
        }
        waiterStats[wid].totalReviews++;
        waiterStats[wid].totalRating += r.ratings.overall;
      }
    });

    const staffLeaderboard = Object.keys(waiterStats).map((wid) => {
      const s = waiterStats[wid];
      return {
        waiterId: wid,
        waiterName: s.waiterName,
        totalReviews: s.totalReviews,
        averageRating: Number((s.totalRating / s.totalReviews).toFixed(2)),
      };
    }).sort((a, b) => b.averageRating - a.averageRating);

    // Negative review recovery rate
    const totalNegative = reviews.filter((r) => r.isNegative).length;
    const resolvedNegative = reviews.filter(
      (r) => r.isNegative && r.serviceRecovery.status === ServiceRecoveryStatus.RESOLVED
    ).length;
    const recoveryRate = totalNegative > 0 ? Math.round((resolvedNegative / totalNegative) * 100) : 100;

    res.status(200).json({
      success: true,
      totalFeedbackCount: reviews.length,
      negativeCount: totalNegative,
      resolvedNegativeCount: resolvedNegative,
      recoveryRatePercentage: recoveryRate,
      staffLeaderboard,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};
