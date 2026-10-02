import { Response } from 'express';
import { Types } from 'mongoose';
import { GuestProfile, VIPTier } from '../models/GuestProfile';
import { LoyaltyTransaction } from '../models/LoyaltyTransaction';
import { Stay } from '../models/Stay';
import { Booking } from '../models/Booking';
import { RestaurantOrder } from '../models/RestaurantOrder';
import { TenantRequest } from '../types';
import { escapeRegex } from '../utils/security';

export const computeTierFromSpend = (spend: number): VIPTier => {
  if (spend >= 100000) return VIPTier.VIP;
  if (spend >= 50000) return VIPTier.PLATINUM;
  if (spend >= 20000) return VIPTier.GOLD;
  if (spend >= 5000) return VIPTier.SILVER;
  return VIPTier.REGULAR;
};

// 1. Create or Update Guest Profile 360
export const createOrUpdateGuestProfile = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const {
      name,
      phone,
      email,
      vipTier,
      allergies = [],
      dietaryPreferences = [],
      specialNotes,
      tags = [],
      dateOfBirth,
      anniversaryDate,
    } = req.body;

    if (!name || !phone) {
      res.status(400).json({ success: false, errorCode: 'MISSING_FIELDS', message: 'Name and phone are required' });
      return;
    }

    let profile = await GuestProfile.findOne({ hotelId, phone: phone.trim() });

    if (!profile) {
      profile = new GuestProfile({
        hotelId,
        name: name.trim(),
        phone: phone.trim(),
        email: email ? email.trim() : undefined,
        vipTier: vipTier || VIPTier.REGULAR,
        allergies,
        dietaryPreferences,
        specialNotes,
        tags,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        anniversaryDate: anniversaryDate ? new Date(anniversaryDate) : undefined,
      });
    } else {
      profile.name = name.trim();
      if (email) profile.email = email.trim();
      if (vipTier) profile.vipTier = vipTier;
      if (allergies) profile.allergies = allergies;
      if (dietaryPreferences) profile.dietaryPreferences = dietaryPreferences;
      if (specialNotes !== undefined) profile.specialNotes = specialNotes;
      if (tags) profile.tags = tags;
      if (dateOfBirth) profile.dateOfBirth = new Date(dateOfBirth);
      if (anniversaryDate) profile.anniversaryDate = new Date(anniversaryDate);
    }

    await profile.save();
    res.status(200).json({ success: true, profile });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 2. Get Guest Profile 360 (Profile, Stays, Orders & Loyalty Balance)
export const getGuestProfile360 = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const guestId = String(req.params.guestId);

    const profile = await GuestProfile.findOne({ _id: new Types.ObjectId(guestId), hotelId });
    if (!profile) {
      res.status(404).json({ success: false, errorCode: 'GUEST_NOT_FOUND', message: 'Guest profile not found' });
      return;
    }

    // Recent loyalty ledger
    const loyaltyHistory = await LoyaltyTransaction.find({
      hotelId,
      guestProfileId: profile._id,
    }).sort({ createdAt: -1 }).limit(10);

    // Recent hotel stays (matching this specific guest's bookings only)
    const guestBookings = await Booking.find({ hotelId, guestPhone: profile.phone }).select('_id');
    const bookingIds = guestBookings.map((b) => b._id);
    const recentStays = await Stay.find({
      hotelId,
      bookingId: { $in: bookingIds },
    })
      .populate('roomId', 'roomNumber')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      profile,
      loyaltyLedger: loyaltyHistory,
      recentStays,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 3. Search Guest Directory
export const searchGuests = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const { query, vipTier, tag } = req.query;

    const filter: any = { hotelId };

    if (vipTier) {
      filter.vipTier = vipTier;
    }

    if (tag) {
      filter.tags = tag;
    }

    if (query) {
      const q = escapeRegex(String(query).trim());
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ];
    }

    const guests = await GuestProfile.find(filter).sort({ totalLifetimeSpend: -1 }).limit(50);
    res.status(200).json({ success: true, count: guests.length, guests });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};
