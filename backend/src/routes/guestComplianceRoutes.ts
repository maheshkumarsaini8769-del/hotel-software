import { Router, Response } from 'express';
import { Types } from 'mongoose';
import { GuestProfile } from '../models/GuestProfile';
import { Stay } from '../models/Stay';
import { Booking } from '../models/Booking';
import { Tenant } from '../models/Tenant';
import { TenantRequest, UserRole } from '../types';

const router = Router();

const resolveHotelId = (req: TenantRequest): string | null => {
  const hotelId = req.hotelId ? String(req.hotelId) : '';
  return hotelId && Types.ObjectId.isValid(hotelId) ? hotelId : null;
};

const ERASURE_STAFF_ROLES = new Set<UserRole>([
  UserRole.HOTEL_ADMIN,
  UserRole.MANAGER,
  UserRole.GROUP_ADMIN,
  UserRole.SUPERADMIN,
]);

/**
 * POST /api/v1/guest/consent
 * Captures explicit digital consent under India's Digital Personal Data Protection (DPDP) Act 2023.
 */
router.post('/consent', async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = resolveHotelId(req);
    const hasVerifiedIdentity = Boolean(req.user?.role) || Boolean((req as any).guestSession);
    if (!hotelId || !hasVerifiedIdentity) {
      res.status(401).json({
        success: false,
        errorCode: 'UNAUTHORIZED',
        message: 'A guest or staff session is required to record consent.',
      });
      return;
    }

    const {
      guestId,
      stayId,
      bookingId,
      phone,
      accepted = true,
      purpose = 'KYC, Identity Verification & Hotel Guest Registration under DPDP Act 2023',
    } = req.body;

    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const timestamp = new Date();

    const consentRecord = {
      accepted: Boolean(accepted),
      timestamp,
      ipAddress,
    };

    let updatedStay = null;
    let updatedBooking = null;
    let updatedProfile = null;

    if (stayId && Types.ObjectId.isValid(stayId)) {
      updatedStay = await Stay.findOneAndUpdate(
        { _id: new Types.ObjectId(String(stayId)), hotelId: new Types.ObjectId(hotelId) },
        { $set: { dpdpConsent: consentRecord } },
        { new: true }
      );
    }

    if (bookingId && Types.ObjectId.isValid(bookingId)) {
      updatedBooking = await Booking.findOneAndUpdate(
        { _id: new Types.ObjectId(String(bookingId)), hotelId: new Types.ObjectId(hotelId) },
        { $set: { dpdpConsent: consentRecord } },
        { new: true }
      );
    }

    if (phone) {
      updatedProfile = await GuestProfile.findOneAndUpdate(
        { hotelId: new Types.ObjectId(hotelId), phone: phone.trim() },
        { $set: { dpdpConsent: consentRecord } },
        { new: true }
      );
    } else if (guestId && Types.ObjectId.isValid(guestId)) {
      updatedProfile = await GuestProfile.findOneAndUpdate(
        { _id: new Types.ObjectId(String(guestId)), hotelId: new Types.ObjectId(hotelId) },
        { $set: { dpdpConsent: consentRecord } },
        { new: true }
      );
    }

    console.log(`[DPDP Consent] Stored digital consent for Phone: ${phone || 'N/A'}, Stay: ${stayId || 'N/A'}, Accepted: ${accepted}`);

    res.status(200).json({
      success: true,
      message: 'DPDP consent successfully recorded.',
      consent: {
        ...consentRecord,
        purpose,
        stayId: updatedStay?._id,
        bookingId: updatedBooking?._id,
        guestId: updatedProfile?._id,
      },
    });
  } catch (error: any) {
    console.error('[DPDP Consent] Error saving consent:', error);
    res.status(500).json({ success: false, error: 'CONSENT_SAVE_FAILED', message: error.message });
  }
});

/**
 * DELETE /api/v1/guest/erasure
 * Executes Right to Erasure / Right to be Forgotten under DPDP Act 2023.
 * Irreversibly anonymizes Personally Identifiable Information (PII) including Name, Phone, and Aadhaar documents.
 */
router.delete('/erasure', async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = resolveHotelId(req);
    if (!hotelId) {
      res.status(401).json({
        success: false,
        errorCode: 'UNAUTHORIZED',
        message: 'A valid staff session is required to execute a DPDP erasure request.',
      });
      return;
    }

    // Destructive PII erasure is an administrative action. It cannot be
    // triggered anonymously or by a guest session, even with a phone number.
    if (!req.user?.role) {
      res.status(401).json({
        success: false,
        errorCode: 'UNAUTHORIZED',
        message: 'A valid staff session is required to execute a DPDP erasure request.',
      });
      return;
    }

    if (!ERASURE_STAFF_ROLES.has(req.user.role)) {
      res.status(403).json({
        success: false,
        errorCode: 'FORBIDDEN',
        message: 'Only a hotel administrator or manager can execute a DPDP erasure request.',
      });
      return;
    }

    const { guestId, phone, stayId, bookingId } = req.body;

    if (!guestId && !phone && !stayId && !bookingId) {
      res.status(400).json({
        success: false,
        error: 'IDENTIFIER_REQUIRED',
        message: 'At least one identifier (guestId, phone, stayId, or bookingId) must be provided for erasure.',
      });
      return;
    }

    const timestamp = Date.now();
    const anonymizedName = 'Deleted User';
    const anonymizedEmail = `deleted_${timestamp}@anonymized.dpdp.local`;
    const anonymizedPhone = `deleted_${timestamp}`;

    let anonymizedProfilesCount = 0;
    let anonymizedStaysCount = 0;
    let anonymizedBookingsCount = 0;

    const scopedHotelId = new Types.ObjectId(hotelId);

    // 1. Anonymize Guest Profiles
    const profileFilter: any = { hotelId: scopedHotelId };
    if (guestId && Types.ObjectId.isValid(guestId)) profileFilter._id = new Types.ObjectId(String(guestId));
    if (phone) profileFilter.phone = phone.trim();

    if (Object.keys(profileFilter).length > 1) {
      const resProfile = await GuestProfile.updateMany(profileFilter, {
        $set: {
          name: anonymizedName,
          phone: anonymizedPhone,
          email: anonymizedEmail,
          idNumberMasked: null,
          idType: null,
          specialNotes: 'PII erased upon guest request under DPDP Act 2023',
          allergies: [],
          dietaryPreferences: [],
          tags: ['DPDP_ERASED'],
        },
      });
      anonymizedProfilesCount = resProfile.modifiedCount;
    }

    // 2. Anonymize Stays (Name, Phone, KYC front & back photos, document URLs)
    const stayFilter: any = { hotelId: scopedHotelId };
    if (stayId && Types.ObjectId.isValid(stayId)) stayFilter._id = new Types.ObjectId(String(stayId));
    if (phone) stayFilter.guestPhone = phone.trim();

    if (Object.keys(stayFilter).length > 1) {
      const resStay = await Stay.updateMany(stayFilter, {
        $set: {
          guestName: anonymizedName,
          guestPhone: null,
          idNumberMasked: null,
          aadhaarFrontUrl: null,
          aadhaarBackUrl: null,
          documentAttachmentUrl: null,
          secondaryGuestName: null,
          secondaryGuestPhone: null,
          secondaryGuestRelationship: null,
          receptionistNotes: 'Guest KYC documents wiped per DPDP Right to Erasure',
        },
      });
      anonymizedStaysCount = resStay.modifiedCount;
    }

    // 3. Anonymize Bookings
    const bookingFilter: any = { hotelId: scopedHotelId };
    if (bookingId && Types.ObjectId.isValid(bookingId)) bookingFilter._id = new Types.ObjectId(String(bookingId));
    if (phone) bookingFilter.guestPhone = phone.trim();

    if (Object.keys(bookingFilter).length > 1) {
      const resBooking = await Booking.updateMany(bookingFilter, {
        $set: {
          guestName: anonymizedName,
          guestPhone: null,
          guestEmail: anonymizedEmail,
          idProofNumber: null,
          idProofDocumentUrl: null,
          aadhaarFrontUrl: null,
          aadhaarBackUrl: null,
          secondaryGuestName: null,
          secondaryGuestPhone: null,
          secondaryGuestRelationship: null,
        },
      });
      anonymizedBookingsCount = resBooking.modifiedCount;
    }

    console.log(`\n🛡️ [DPDP Erasure] Right to Erasure executed:`);
    console.log(`   Guest Profiles Anonymized: ${anonymizedProfilesCount}`);
    console.log(`   Stays Anonymized         : ${anonymizedStaysCount}`);
    console.log(`   Bookings Anonymized      : ${anonymizedBookingsCount}`);

    res.status(200).json({
      success: true,
      message: 'Guest PII and KYC data successfully anonymized to comply with DPDP Act Right to Erasure.',
      details: {
        anonymizedName,
        phoneErased: true,
        kycDocsWiped: true,
        profilesUpdated: anonymizedProfilesCount,
        staysUpdated: anonymizedStaysCount,
        bookingsUpdated: anonymizedBookingsCount,
        timestamp: new Date(),
      },
    });
  } catch (error: any) {
    console.error('[DPDP Erasure] Error executing data erasure:', error);
    res.status(500).json({ success: false, error: 'ERASURE_EXECUTION_FAILED', message: error.message });
  }
});

export default router;
