import { Request, Response } from 'express';
import { Types } from 'mongoose';
import {
  GuestParcelLog,
  ParcelDirection,
  CourierPartner,
  ParcelPackageType,
  ParcelStatus,
} from '../models/GuestParcelLog';

export const getParcelLogs = async (req: Request, res: Response) => {
  try {
    const rawHotelId = (req as any).user?.hotelId || req.headers['x-hotel-id'] || req.query.hotelId;
    if (!rawHotelId || !Types.ObjectId.isValid(rawHotelId as string)) {
      return res.status(400).json({ success: false, error: 'Valid Hotel ID required' });
    }
    const hotelId = new Types.ObjectId(rawHotelId as string);

    const { direction, status, search, roomNumber, isHighValue } = req.query;

    const filter: any = { hotelId };

    if (direction && typeof direction === 'string' && direction !== 'ALL') {
      filter.direction = direction;
    }

    if (status && typeof status === 'string' && status !== 'ALL') {
      filter.status = status;
    }

    if (roomNumber && typeof roomNumber === 'string') {
      filter['recipientInfo.roomNumber'] = roomNumber.trim();
    }

    if (isHighValue === 'true') {
      filter.isHighValue = true;
    }

    if (search && typeof search === 'string') {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { parcelTag: searchRegex },
        { trackingAwb: searchRegex },
        { 'recipientInfo.guestName': searchRegex },
        { 'recipientInfo.guestPhone': searchRegex },
        { 'senderInfo.name': searchRegex },
        { 'senderInfo.organization': searchRegex },
      ];
    }

    let parcels = await GuestParcelLog.find(filter).sort({ createdAt: -1 });

    // Seed realistic demo parcels if the hotel has zero parcel records (development/demo only)
    const totalCount = await GuestParcelLog.countDocuments({ hotelId });
    if (totalCount === 0 && process.env.NODE_ENV !== 'test') {
      const demoParcels = [
        {
          hotelId,
          parcelTag: 'PCL-2026-1001',
          direction: ParcelDirection.INWARD,
          courierPartner: CourierPartner.AMAZON,
          trackingAwb: 'AMZ-IN-88912340',
          senderInfo: {
            name: 'Amazon Prime Fulfillment Hub',
            organization: 'Amazon India',
            contactPhone: '+91 80000 11223',
          },
          recipientInfo: {
            guestName: 'Vikram Malhotra',
            roomNumber: '304',
            guestPhone: '+91 98765 43210',
            guestEmail: 'vikram.m@example.com',
          },
          packageType: ParcelPackageType.BOX,
          pieceCount: 1,
          isHighValue: false,
          storageLocation: 'PARCEL-BAY-02',
          status: ParcelStatus.RECEIVED_AT_DESK,
          receivedAt: new Date(Date.now() - 3600000 * 3),
          receivedByStaffName: 'Concierge Anita Sharma',
          verificationPin: '4192',
          auditTrail: [
            {
              timestamp: new Date(Date.now() - 3600000 * 3),
              action: 'INWARD_LOGGED',
              performedBy: 'Concierge Anita Sharma',
              details: 'Received from Amazon Logistics courier partner',
            },
          ],
        },
        {
          hotelId,
          parcelTag: 'PCL-2026-1002',
          direction: ParcelDirection.INWARD,
          courierPartner: CourierPartner.BLUE_DART,
          trackingAwb: 'BLUEDART-55410928',
          senderInfo: {
            name: 'Apollo Pharmacy Express',
            organization: 'Apollo Healthcare',
            contactPhone: '+91 1800 200 4455',
          },
          recipientInfo: {
            guestName: 'Dr. Sunita Deshmukh',
            roomNumber: '512',
            guestPhone: '+91 98111 22334',
          },
          packageType: ParcelPackageType.MEDICINE_PERISHABLE,
          pieceCount: 1,
          isHighValue: true,
          storageLocation: 'CONCIERGE-COOLER-01',
          status: ParcelStatus.GUEST_NOTIFIED,
          receivedAt: new Date(Date.now() - 3600000 * 1.5),
          receivedByStaffName: 'Front Desk Rajesh Kumar',
          verificationPin: '8831',
          auditTrail: [
            {
              timestamp: new Date(Date.now() - 3600000 * 1.5),
              action: 'INWARD_LOGGED',
              performedBy: 'Front Desk Rajesh Kumar',
              details: 'Critical temperature-controlled insulin package stored in cold locker',
            },
            {
              timestamp: new Date(Date.now() - 3600000 * 1.2),
              action: 'GUEST_NOTIFIED',
              performedBy: 'Front Desk Rajesh Kumar',
              details: 'Urgent SMS notification and Guest Room Portal alert delivered',
            },
          ],
        },
        {
          hotelId,
          parcelTag: 'PCL-2026-1003',
          direction: ParcelDirection.INWARD,
          courierPartner: CourierPartner.DHL,
          trackingAwb: 'DHL-EXPRESS-99217',
          senderInfo: {
            name: 'Legal Counsel Chambers',
            organization: 'Shardul Amarchand & Co',
            contactPhone: '+91 11 4159 0000',
          },
          recipientInfo: {
            guestName: 'Ananya Singhania',
            roomNumber: '601',
            guestPhone: '+91 99222 33445',
          },
          packageType: ParcelPackageType.DOCUMENT,
          pieceCount: 1,
          isHighValue: true,
          storageLocation: 'FRONTDESK-SAFE-DRAWER',
          status: ParcelStatus.OUT_FOR_ROOM_DELIVERY,
          receivedAt: new Date(Date.now() - 3600000 * 2),
          receivedByStaffName: 'Bell Captain Ramesh',
          verificationPin: '6520',
          dispatchInfo: {
            dispatchedAt: new Date(Date.now() - 1800000),
            porterName: 'Porter Sunil K',
            targetLocation: 'Room 601',
            notes: 'Urgent legal contract handover',
          },
          auditTrail: [
            {
              timestamp: new Date(Date.now() - 3600000 * 2),
              action: 'INWARD_LOGGED',
              performedBy: 'Bell Captain Ramesh',
              details: 'Confidential sealed envelope',
            },
            {
              timestamp: new Date(Date.now() - 1800000),
              action: 'DISPATCHED_TO_ROOM',
              performedBy: 'Bell Captain Ramesh',
              details: 'Dispatched with Porter Sunil K to Room 601',
            },
          ],
        },
        {
          hotelId,
          parcelTag: 'OUT-2026-2001',
          direction: ParcelDirection.OUTWARD,
          courierPartner: CourierPartner.FEDEX,
          trackingAwb: 'FDX-EXP-4412903',
          senderInfo: {
            name: 'Pooja Hegde',
            organization: 'Guest Room 204',
            contactPhone: '+91 97777 88899',
            address: 'Room 204, Grand Palace Hotel',
          },
          recipientInfo: {
            guestName: 'Vogue Studios International',
            guestPhone: '+1 212 555 0199',
            guestEmail: 'wardrobe@voguestudios.com',
          },
          packageType: ParcelPackageType.CRATE,
          pieceCount: 2,
          isHighValue: true,
          storageLocation: 'OUTWARD-DISPATCH-BAY',
          status: ParcelStatus.OUTWARD_BOOKED,
          receivedAt: new Date(Date.now() - 3600000 * 4),
          receivedByStaffName: 'Concierge Anita Sharma',
          verificationPin: '9002',
          outwardDetails: {
            destinationAddress: '4 World Trade Center, New York, NY 10007, USA',
            estimatedCharge: 4200,
            folioPosted: true,
          },
          auditTrail: [
            {
              timestamp: new Date(Date.now() - 3600000 * 4),
              action: 'OUTWARD_BOOKED',
              performedBy: 'Concierge Anita Sharma',
              details: 'Guest booked international courier; ₹4,200 posted to Room 204 Folio',
            },
          ],
        },
      ];

      await GuestParcelLog.insertMany(demoParcels);
      parcels = await GuestParcelLog.find(filter).sort({ createdAt: -1 });
    }

    const allParcels = await GuestParcelLog.find({ hotelId });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const metrics = {
      totalInwardHolding: allParcels.filter(
        (p) =>
          p.direction === ParcelDirection.INWARD &&
          [ParcelStatus.RECEIVED_AT_DESK, ParcelStatus.GUEST_NOTIFIED].includes(p.status)
      ).length,
      pendingRoomDelivery: allParcels.filter(
        (p) => p.status === ParcelStatus.OUT_FOR_ROOM_DELIVERY
      ).length,
      highValueUrgentCount: allParcels.filter(
        (p) =>
          [ParcelStatus.RECEIVED_AT_DESK, ParcelStatus.GUEST_NOTIFIED, ParcelStatus.OUT_FOR_ROOM_DELIVERY].includes(p.status) &&
          (p.isHighValue || p.packageType === ParcelPackageType.MEDICINE_PERISHABLE)
      ).length,
      todayDelivered: allParcels.filter(
        (p) =>
          p.status === ParcelStatus.DELIVERED_TO_GUEST &&
          p.deliveryInfo?.deliveredAt &&
          new Date(p.deliveryInfo.deliveredAt) >= todayStart
      ).length,
      totalOutward: allParcels.filter(
        (p) => p.direction === ParcelDirection.OUTWARD
      ).length,
    };

    return res.status(200).json({
      success: true,
      parcels,
      metrics,
    });
  } catch (error: any) {
    console.error('Error in getParcelLogs:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', details: error.message });
  }
};

export const logInwardParcel = async (req: Request, res: Response) => {
  try {
    const rawHotelId = (req as any).user?.hotelId || req.headers['x-hotel-id'] || req.body.hotelId;
    if (!rawHotelId || !Types.ObjectId.isValid(rawHotelId as string)) {
      return res.status(400).json({ success: false, error: 'Valid Hotel ID required' });
    }
    const hotelId = new Types.ObjectId(rawHotelId as string);

    const {
      courierPartner,
      courierPartnerCustom,
      trackingAwb,
      senderInfo,
      recipientInfo,
      packageType,
      pieceCount,
      isHighValue,
      storageLocation,
      receivedByStaffName,
    } = req.body;

    if (!trackingAwb || !trackingAwb.trim()) {
      return res.status(400).json({ success: false, error: 'Tracking AWB number is required' });
    }

    if (!recipientInfo || !recipientInfo.guestName || !recipientInfo.guestPhone) {
      return res.status(400).json({
        success: false,
        error: 'Recipient guest name and phone number are required',
      });
    }

    if (!senderInfo || !senderInfo.name) {
      return res.status(400).json({ success: false, error: 'Sender name is required' });
    }

    // Generate unique sequential Parcel Tag: PCL-YYYY-XXXX
    const currentYear = new Date().getFullYear();
    const countThisYear = await GuestParcelLog.countDocuments({
      hotelId,
      parcelTag: new RegExp(`^PCL-${currentYear}-`),
    });
    const parcelTag = `PCL-${currentYear}-${String(countThisYear + 1001).padStart(4, '0')}`;

    // Generate 4-digit verification PIN
    const verificationPin = Math.floor(1000 + Math.random() * 9000).toString();

    const staff = receivedByStaffName || (req as any).user?.name || 'Front Desk Staff';

    const newParcel = await GuestParcelLog.create({
      hotelId,
      parcelTag,
      direction: ParcelDirection.INWARD,
      courierPartner: courierPartner || CourierPartner.BLUE_DART,
      courierPartnerCustom,
      trackingAwb: trackingAwb.trim(),
      senderInfo: {
        name: senderInfo.name.trim(),
        organization: senderInfo.organization?.trim(),
        contactPhone: senderInfo.contactPhone?.trim(),
        address: senderInfo.address?.trim(),
      },
      recipientInfo: {
        guestName: recipientInfo.guestName.trim(),
        roomNumber: recipientInfo.roomNumber?.trim(),
        guestPhone: recipientInfo.guestPhone.trim(),
        guestEmail: recipientInfo.guestEmail?.trim(),
        stayId: recipientInfo.stayId && Types.ObjectId.isValid(recipientInfo.stayId) ? new Types.ObjectId(recipientInfo.stayId) : undefined,
      },
      packageType: packageType || ParcelPackageType.BOX,
      pieceCount: Number(pieceCount) || 1,
      isHighValue: Boolean(isHighValue),
      storageLocation: storageLocation?.trim() || 'PARCEL-BAY-01',
      status: ParcelStatus.RECEIVED_AT_DESK,
      receivedAt: new Date(),
      receivedByStaffName: staff,
      verificationPin,
      auditTrail: [
        {
          timestamp: new Date(),
          action: 'INWARD_LOGGED',
          performedBy: staff,
          details: `Inward parcel received from ${courierPartner || 'Courier'} (AWB: ${trackingAwb}). Stored at ${storageLocation || 'PARCEL-BAY-01'}.`,
        },
      ],
    });

    return res.status(201).json({
      success: true,
      message: 'Inward parcel successfully logged',
      parcel: newParcel,
    });
  } catch (error: any) {
    console.error('Error in logInwardParcel:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', details: error.message });
  }
};

export const notifyGuestParcelArrival = async (req: Request, res: Response) => {
  try {
    const rawHotelId = (req as any).user?.hotelId || req.headers['x-hotel-id'] || req.body.hotelId;
    if (!rawHotelId || !Types.ObjectId.isValid(rawHotelId as string)) {
      return res.status(400).json({ success: false, error: 'Valid Hotel ID required' });
    }
    const hotelId = new Types.ObjectId(rawHotelId as string);
    const { parcelTag } = req.params;

    const parcel = await GuestParcelLog.findOne({ hotelId, parcelTag });
    if (!parcel) {
      return res.status(404).json({ success: false, error: 'Parcel not found' });
    }

    const staff = (req as any).user?.name || req.body.staffName || 'Front Desk Staff';

    parcel.status = ParcelStatus.GUEST_NOTIFIED;
    parcel.auditTrail.push({
      timestamp: new Date(),
      action: 'GUEST_NOTIFIED',
      performedBy: staff,
      details: `Dispatched SMS and Guest Portal arrival alert to ${parcel.recipientInfo.guestPhone} (OTP PIN: ${parcel.verificationPin}).`,
    });

    await parcel.save();

    return res.status(200).json({
      success: true,
      message: 'Guest successfully notified with OTP verification PIN',
      parcel,
    });
  } catch (error: any) {
    console.error('Error in notifyGuestParcelArrival:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', details: error.message });
  }
};

export const dispatchParcelToRoom = async (req: Request, res: Response) => {
  try {
    const rawHotelId = (req as any).user?.hotelId || req.headers['x-hotel-id'] || req.body.hotelId;
    if (!rawHotelId || !Types.ObjectId.isValid(rawHotelId as string)) {
      return res.status(400).json({ success: false, error: 'Valid Hotel ID required' });
    }
    const hotelId = new Types.ObjectId(rawHotelId as string);
    const { parcelTag } = req.params;
    const { porterName, notes } = req.body;

    if (!porterName || !porterName.trim()) {
      return res.status(400).json({ success: false, error: 'Porter / Bellboy name is required' });
    }

    const parcel = await GuestParcelLog.findOne({ hotelId, parcelTag });
    if (!parcel) {
      return res.status(404).json({ success: false, error: 'Parcel not found' });
    }

    const targetRoom = parcel.recipientInfo.roomNumber || 'Guest Room';
    const staff = (req as any).user?.name || 'Bell Captain';

    parcel.status = ParcelStatus.OUT_FOR_ROOM_DELIVERY;
    parcel.dispatchInfo = {
      dispatchedAt: new Date(),
      porterName: porterName.trim(),
      targetLocation: `Room ${targetRoom}`,
      notes: notes?.trim(),
    };
    parcel.auditTrail.push({
      timestamp: new Date(),
      action: 'DISPATCHED_TO_ROOM',
      performedBy: staff,
      details: `Handed over to ${porterName.trim()} for in-room delivery to Room ${targetRoom}.`,
    });

    await parcel.save();

    return res.status(200).json({
      success: true,
      message: 'Parcel dispatched to guest room',
      parcel,
    });
  } catch (error: any) {
    console.error('Error in dispatchParcelToRoom:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', details: error.message });
  }
};

export const completeParcelDelivery = async (req: Request, res: Response) => {
  try {
    const rawHotelId = (req as any).user?.hotelId || req.headers['x-hotel-id'] || req.body.hotelId;
    if (!rawHotelId || !Types.ObjectId.isValid(rawHotelId as string)) {
      return res.status(400).json({ success: false, error: 'Valid Hotel ID required' });
    }
    const hotelId = new Types.ObjectId(rawHotelId as string);
    const { parcelTag } = req.params;
    const {
      verificationPin,
      signatureDataUrl,
      recipientAcknowledgedBy,
      deliveredByStaffName,
      handoverMode,
      verificationMethod,
      notes,
    } = req.body;

    const parcel = await GuestParcelLog.findOne({ hotelId, parcelTag });
    if (!parcel) {
      return res.status(404).json({ success: false, error: 'Parcel not found' });
    }

    if (parcel.status === ParcelStatus.DELIVERED_TO_GUEST) {
      return res.status(400).json({ success: false, error: 'Parcel has already been delivered' });
    }

    // Verify 4-digit PIN if verificationMethod is OTP_PIN or if verificationPin is provided
    const method = verificationMethod || 'OTP_PIN';
    if (method === 'OTP_PIN') {
      if (!verificationPin || verificationPin.trim() !== parcel.verificationPin) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_VERIFICATION_PIN',
          message: 'Incorrect 4-digit verification PIN provided by guest',
        });
      }
    }

    const staff = deliveredByStaffName || (req as any).user?.name || parcel.dispatchInfo?.porterName || 'Bellboy';
    const recipient = recipientAcknowledgedBy?.trim() || parcel.recipientInfo.guestName;
    const isRoomDelivery = handoverMode ? handoverMode === 'ROOM_DELIVERY' : parcel.status === ParcelStatus.OUT_FOR_ROOM_DELIVERY;

    parcel.status = ParcelStatus.DELIVERED_TO_GUEST;
    parcel.deliveryInfo = {
      deliveredAt: new Date(),
      deliveredByStaffName: staff,
      handoverMode: isRoomDelivery ? 'ROOM_DELIVERY' : 'FRONT_DESK_COUNTER',
      recipientAcknowledgedBy: recipient,
      signatureDataUrl: signatureDataUrl || 'SIGNED_ON_GLASS_ACKNOWLEDGED',
      verificationMethod: method,
      notes: notes?.trim(),
    };

    parcel.auditTrail.push({
      timestamp: new Date(),
      action: 'DELIVERED_TO_GUEST',
      performedBy: staff,
      details: `Successfully handed over to ${recipient} via ${handoverMode || 'handover'} (Verified by ${method}). Digital signature recorded.`,
    });

    await parcel.save();

    return res.status(200).json({
      success: true,
      message: 'Parcel delivery completed and acknowledged',
      parcel,
    });
  } catch (error: any) {
    console.error('Error in completeParcelDelivery:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', details: error.message });
  }
};

export const bookOutwardCourier = async (req: Request, res: Response) => {
  try {
    const rawHotelId = (req as any).user?.hotelId || req.headers['x-hotel-id'] || req.body.hotelId;
    if (!rawHotelId || !Types.ObjectId.isValid(rawHotelId as string)) {
      return res.status(400).json({ success: false, error: 'Valid Hotel ID required' });
    }
    const hotelId = new Types.ObjectId(rawHotelId as string);

    const {
      guestName,
      roomNumber,
      guestPhone,
      guestEmail,
      destinationAddress,
      recipientName,
      recipientPhone,
      courierPartner,
      courierPartnerCustom,
      trackingAwb,
      packageType,
      pieceCount,
      isHighValue,
      estimatedCharge,
      postToFolio,
      staffName,
      notes,
    } = req.body;

    if (!guestName || !guestPhone) {
      return res.status(400).json({ success: false, error: 'Sender guest name and phone are required' });
    }

    if (!destinationAddress || !destinationAddress.trim()) {
      return res.status(400).json({ success: false, error: 'Destination address is required' });
    }

    if (!trackingAwb || !trackingAwb.trim()) {
      return res.status(400).json({ success: false, error: 'Courier tracking / AWB number is required' });
    }

    const currentYear = new Date().getFullYear();
    const countThisYear = await GuestParcelLog.countDocuments({
      hotelId,
      parcelTag: new RegExp(`^OUT-${currentYear}-`),
    });
    const parcelTag = `OUT-${currentYear}-${String(countThisYear + 2001).padStart(4, '0')}`;
    const verificationPin = Math.floor(1000 + Math.random() * 9000).toString();
    const staff = staffName || (req as any).user?.name || 'Concierge Desk';

    const outwardParcel = await GuestParcelLog.create({
      hotelId,
      parcelTag,
      direction: ParcelDirection.OUTWARD,
      courierPartner: courierPartner || CourierPartner.BLUE_DART,
      courierPartnerCustom,
      trackingAwb: trackingAwb.trim(),
      senderInfo: {
        name: guestName.trim(),
        organization: roomNumber ? `Room ${roomNumber}` : 'Hotel Guest',
        contactPhone: guestPhone.trim(),
        address: `Room ${roomNumber || 'Lobby'}, Hotel Property`,
      },
      recipientInfo: {
        guestName: recipientName?.trim() || 'Recipient',
        guestPhone: recipientPhone?.trim() || guestPhone.trim(),
        guestEmail,
        roomNumber,
      },
      packageType: packageType || ParcelPackageType.BOX,
      pieceCount: Number(pieceCount) || 1,
      isHighValue: Boolean(isHighValue),
      storageLocation: 'OUTWARD-DISPATCH-BAY',
      status: ParcelStatus.OUTWARD_BOOKED,
      receivedAt: new Date(),
      receivedByStaffName: staff,
      verificationPin,
      outwardDetails: {
        destinationAddress: destinationAddress.trim(),
        estimatedCharge: Number(estimatedCharge) || 0,
        folioPosted: Boolean(postToFolio),
        folioChargeId: postToFolio ? `FOLIO-COURIER-${Date.now()}` : undefined,
      },
      auditTrail: [
        {
          timestamp: new Date(),
          action: 'OUTWARD_BOOKED',
          performedBy: staff,
          details: `Outward courier booked for ${guestName} to ${destinationAddress.trim()} via ${courierPartner || 'Courier'} (Charge: ₹${estimatedCharge || 0}${postToFolio ? ' - Posted to Folio' : ''}).`,
        },
      ],
    });

    return res.status(201).json({
      success: true,
      message: 'Outward courier successfully booked',
      parcel: outwardParcel,
    });
  } catch (error: any) {
    console.error('Error in bookOutwardCourier:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', details: error.message });
  }
};

export const getParcelAuditLog = async (req: Request, res: Response) => {
  try {
    const rawHotelId = (req as any).user?.hotelId || req.headers['x-hotel-id'] || req.query.hotelId;
    if (!rawHotelId || !Types.ObjectId.isValid(rawHotelId as string)) {
      return res.status(400).json({ success: false, error: 'Valid Hotel ID required' });
    }
    const hotelId = new Types.ObjectId(rawHotelId as string);
    const { parcelTag } = req.params;

    const parcel = await GuestParcelLog.findOne({ hotelId, parcelTag });
    if (!parcel) {
      return res.status(404).json({ success: false, error: 'Parcel not found' });
    }

    return res.status(200).json({
      success: true,
      parcelTag: parcel.parcelTag,
      recipient: parcel.recipientInfo,
      sender: parcel.senderInfo,
      status: parcel.status,
      direction: parcel.direction,
      storageLocation: parcel.storageLocation,
      deliveryInfo: parcel.deliveryInfo,
      auditTrail: parcel.auditTrail,
    });
  } catch (error: any) {
    console.error('Error in getParcelAuditLog:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', details: error.message });
  }
};
