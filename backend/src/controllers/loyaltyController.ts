import { Response } from 'express';
import { Types } from 'mongoose';
import { GuestProfile, VIPTier } from '../models/GuestProfile';
import { LoyaltyTransaction, LoyaltyTxType, LoyaltyReferenceType } from '../models/LoyaltyTransaction';
import { computeTierFromSpend } from './crmController';
import { TenantRequest } from '../types';

// 1. Earn Loyalty Points (From Restaurant Bill or Room Folio)
export const earnLoyaltyPoints = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { phone, amountSpent, referenceType = LoyaltyReferenceType.RESTAURANT_BILL, referenceId, notes } = req.body;
    const spend = Number(amountSpent);

    if (!phone || spend <= 0) {
      res.status(400).json({ success: false, errorCode: 'INVALID_PARAMS', message: 'Phone and positive amount spent required' });
      return;
    }

    let profile = await GuestProfile.findOne({ hotelId, phone: String(phone).trim() });
    if (!profile) {
      // Auto-create guest profile on first transaction
      profile = new GuestProfile({
        hotelId,
        name: `Guest ${String(phone).slice(-4)}`,
        phone: String(phone).trim(),
        vipTier: VIPTier.REGULAR,
        totalVisits: 0,
        totalLifetimeSpend: 0,
        loyaltyPointsBalance: 0,
        pointsEarnedLifetime: 0,
        pointsRedeemedLifetime: 0,
      });
    }

    // Standard rule: 1 point earned per $10 spent (minimum 1 point)
    const pointsEarned = Math.max(1, Math.floor(spend / 10));
    const conversionRate = 1; // 1 point = $1
    const monetaryEquivalent = pointsEarned * conversionRate;

    profile.loyaltyPointsBalance += pointsEarned;
    profile.pointsEarnedLifetime += pointsEarned;
    profile.totalLifetimeSpend += spend;
    profile.totalVisits += 1;
    profile.lastVisitDate = new Date();

    // Auto-promote VIP tier based on lifetime spend
    const newTier = computeTierFromSpend(profile.totalLifetimeSpend);
    profile.vipTier = newTier;

    await profile.save();

    const transaction = new LoyaltyTransaction({
      hotelId,
      guestProfileId: profile._id,
      transactionType: LoyaltyTxType.EARN,
      points: pointsEarned,
      conversionRate,
      monetaryEquivalent,
      referenceType,
      referenceId: referenceId ? new Types.ObjectId(referenceId) : undefined,
      balanceAfter: profile.loyaltyPointsBalance,
      notes: notes || `Earned on spend of $${spend}`,
      processedByUserId: req.user?.userId ? new Types.ObjectId(req.user.userId) : undefined,
    });
    await transaction.save();

    res.status(200).json({
      success: true,
      pointsEarned,
      newBalance: profile.loyaltyPointsBalance,
      vipTier: profile.vipTier,
      transaction,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 2. Burn / Redeem Loyalty Points for Discount
export const redeemLoyaltyPoints = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { phone, pointsToRedeem, referenceType = LoyaltyReferenceType.RESTAURANT_BILL, referenceId, notes } = req.body;
    const points = Number(pointsToRedeem);

    if (!phone || points <= 0) {
      res.status(400).json({ success: false, errorCode: 'INVALID_PARAMS', message: 'Phone and positive points to redeem required' });
      return;
    }

    const profile = await GuestProfile.findOne({ hotelId, phone: String(phone).trim() });
    if (!profile) {
      res.status(404).json({ success: false, errorCode: 'GUEST_NOT_FOUND', message: 'Guest profile not found' });
      return;
    }

    if (profile.loyaltyPointsBalance < points) {
      res.status(400).json({
        success: false,
        errorCode: 'INSUFFICIENT_LOYALTY_POINTS',
        message: `Only ${profile.loyaltyPointsBalance} points available for redemption`,
      });
      return;
    }

    const conversionRate = 1; // 1 point = $1 discount
    const discountAmount = points * conversionRate;

    profile.loyaltyPointsBalance -= points;
    profile.pointsRedeemedLifetime += points;
    await profile.save();

    const transaction = new LoyaltyTransaction({
      hotelId,
      guestProfileId: profile._id,
      transactionType: LoyaltyTxType.REDEEM,
      points,
      conversionRate,
      monetaryEquivalent: discountAmount,
      referenceType,
      referenceId: referenceId ? new Types.ObjectId(referenceId) : undefined,
      balanceAfter: profile.loyaltyPointsBalance,
      notes: notes || `Redeemed for $${discountAmount} discount`,
      processedByUserId: req.user?.userId ? new Types.ObjectId(req.user.userId) : undefined,
    });
    await transaction.save();

    res.status(200).json({
      success: true,
      pointsRedeemed: points,
      discountAmount,
      remainingBalance: profile.loyaltyPointsBalance,
      transaction,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 3. Get Loyalty Transaction Ledger
export const getLoyaltyLedger = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const { phone } = req.query;

    if (!phone) {
      res.status(400).json({ success: false, errorCode: 'MISSING_PHONE', message: 'Guest phone number required' });
      return;
    }

    const profile = await GuestProfile.findOne({ hotelId, phone: String(phone).trim() });
    if (!profile) {
      res.status(404).json({ success: false, errorCode: 'GUEST_NOT_FOUND', message: 'Guest not found' });
      return;
    }

    const transactions = await LoyaltyTransaction.find({ hotelId, guestProfileId: profile._id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      guestName: profile.name,
      phone: profile.phone,
      vipTier: profile.vipTier,
      currentPoints: profile.loyaltyPointsBalance,
      totalEarnedLifetime: profile.pointsEarnedLifetime,
      totalRedeemedLifetime: profile.pointsRedeemedLifetime,
      transactions,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};
