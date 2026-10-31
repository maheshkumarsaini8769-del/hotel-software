import { Types } from 'mongoose';
import { GuestProfile, VIPTier } from '../models/GuestProfile';
import { PromoCode } from '../models/PromoCode';

export class LoyaltyCrmService {
  /**
   * Links order/stay spend to a guest profile by phone.
   * Auto-upgrades to GOLD if lifetime spend > ₹50,000.
   */
  public static async linkGuestSpend(
    hotelId: Types.ObjectId | string,
    phone: string,
    name: string,
    spendAmount: number,
    email?: string
  ) {
    if (!phone) return null;
    const cleanPhone = phone.trim();
    const hId = new Types.ObjectId(hotelId);

    let profile = await GuestProfile.findOne({ hotelId: hId, phone: cleanPhone });

    if (!profile) {
      profile = new GuestProfile({
        hotelId: hId,
        name: name || 'Guest',
        phone: cleanPhone,
        email,
        vipTier: VIPTier.REGULAR,
        totalVisits: 1,
        totalLifetimeSpend: spendAmount,
        lastVisitDate: new Date(),
        loyaltyPointsBalance: Math.floor(spendAmount / 100),
        pointsEarnedLifetime: Math.floor(spendAmount / 100),
      });
    } else {
      profile.totalVisits += 1;
      profile.totalLifetimeSpend += spendAmount;
      profile.lastVisitDate = new Date();
      profile.loyaltyPointsBalance += Math.floor(spendAmount / 100);
      profile.pointsEarnedLifetime += Math.floor(spendAmount / 100);
      if (email && !profile.email) profile.email = email;
    }

    // Auto-tier upgrade rules
    if (profile.totalLifetimeSpend > 100000) {
      profile.vipTier = VIPTier.PLATINUM;
    } else if (profile.totalLifetimeSpend > 50000) {
      profile.vipTier = VIPTier.GOLD;
    } else if (profile.totalLifetimeSpend > 20000) {
      profile.vipTier = VIPTier.SILVER;
    }

    await profile.save();
    return profile;
  }

  /**
   * Applies loyalty tier discount (Gold = 10% auto-discount on F&B)
   */
  public static getTierDiscount(vipTier: VIPTier, subtotal: number): { discountPercentage: number; discountAmount: number } {
    let discountPercentage = 0;
    if (vipTier === VIPTier.PLATINUM || vipTier === VIPTier.PLATINUM_VIP) {
      discountPercentage = 15;
    } else if (vipTier === VIPTier.GOLD) {
      discountPercentage = 10;
    } else if (vipTier === VIPTier.SILVER) {
      discountPercentage = 5;
    }

    const discountAmount = Math.round((subtotal * discountPercentage) / 100);
    return { discountPercentage, discountAmount };
  }

  /**
   * Validates promo code (e.g. WELCOME10)
   */
  public static async validatePromoCode(
    hotelId: Types.ObjectId | string,
    code: string,
    orderSubtotal: number
  ) {
    if (!code) return { valid: false, message: 'Promo code required' };
    const hId = new Types.ObjectId(hotelId);
    let promo = await PromoCode.findOne({
      hotelId: hId,
      code: code.trim().toUpperCase(),
      isActive: true,
    });

    if (!promo && code.trim().toUpperCase() === 'WELCOME10') {
      promo = await PromoCode.create({
        hotelId: hId,
        code: 'WELCOME10',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        maxDiscountAmount: 500,
        minOrderAmount: 500,
        validFrom: new Date(Date.now() - 86400000),
        validTo: new Date(Date.now() + 365 * 86400000),
        isActive: true,
      });
    }

    if (!promo) {
      return { valid: false, message: 'Invalid or expired promo code' };
    }

    const now = new Date();
    if (now < promo.validFrom || now > promo.validTo) {
      return { valid: false, message: 'Promo code has expired' };
    }

    if (orderSubtotal < promo.minOrderAmount) {
      return { valid: false, message: `Minimum order amount of ₹${promo.minOrderAmount} required` };
    }

    let discount = 0;
    if (promo.discountType === 'PERCENTAGE') {
      discount = Math.round((orderSubtotal * promo.discountValue) / 100);
      if (promo.maxDiscountAmount && discount > promo.maxDiscountAmount) {
        discount = promo.maxDiscountAmount;
      }
    } else {
      discount = Math.min(orderSubtotal, promo.discountValue);
    }

    return {
      valid: true,
      promoCode: promo.code,
      discountAmount: discount,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      minOrderAmount: promo.minOrderAmount || 0,
      maxDiscountAmount: promo.maxDiscountAmount,
    };
  }
}
