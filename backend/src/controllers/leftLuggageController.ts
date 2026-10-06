import { Request, Response } from 'express';
import {
  LeftLuggageClaim,
  LuggageStatus,
  LuggageStorageType,
  ILuggagePiece,
} from '../models/LeftLuggageClaim';

export const getLeftLuggageClaims = async (req: Request, res: Response) => {
  try {
    const hotelId = req.headers['x-hotel-id'] || req.query.hotelId || (req as any).user?.hotelId;
    if (!hotelId) {
      return res.status(400).json({ success: false, message: 'Hotel ID is required.' });
    }

    const { status, storageType, search } = req.query;

    const filter: any = { hotelId };
    if (status && status !== 'ALL') {
      filter.status = status;
    }
    if (storageType && storageType !== 'ALL') {
      filter.storageType = storageType;
    }
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { claimTag: { $regex: q, $options: 'i' } },
        { guestName: { $regex: q, $options: 'i' } },
        { roomNumber: { $regex: q, $options: 'i' } },
        { guestPhone: { $regex: q, $options: 'i' } },
      ];
    }

    let claims = await LeftLuggageClaim.find(filter).sort({ createdAt: -1 });

    // Auto-seed default demonstration luggage if zero claims exist for this property
    const totalCount = await LeftLuggageClaim.countDocuments({ hotelId });
    if (totalCount === 0) {
      const demoClaims = [
        {
          hotelId,
          claimTag: 'LLG-7001',
          guestName: 'Princess Gayatri Devi',
          guestPhone: '+91 9844005511',
          roomNumber: '102',
          storageType: LuggageStorageType.POST_CHECKOUT,
          status: LuggageStatus.STORED,
          rackLocation: 'CLOAKROOM-RACK-A01',
          totalPieces: 2,
          pieces: [
            {
              pieceId: 'P1',
              type: 'SUITCASE',
              colorDescription: 'Rose Gold Rimowa Trunk with Velvet Dust Cover',
              isFragile: true,
              hasPerishables: false,
            },
            {
              pieceId: 'P2',
              type: 'GARMENT_BAG',
              colorDescription: 'Black Louis Vuitton Monogram Hanging Suiter',
              isFragile: false,
              hasPerishables: false,
            },
          ],
          claimPin: '7721',
          expectedPickupTime: new Date(Date.now() + 5 * 60 * 60 * 1000),
          receivedByStaffName: 'Concierge Lead Arjun',
        },
        {
          hotelId,
          claimTag: 'LLG-7002',
          guestName: 'Lord Mountbatten',
          guestPhone: '+44 7911 123456',
          roomNumber: '204',
          storageType: LuggageStorageType.EARLY_ARRIVAL,
          status: LuggageStatus.STORED,
          rackLocation: 'CLOAKROOM-BAY-02',
          totalPieces: 1,
          pieces: [
            {
              pieceId: 'P1',
              type: 'SUITCASE',
              colorDescription: 'British Racing Green Globe-Trotter Leather Carry-On',
              isFragile: false,
              hasPerishables: false,
            },
          ],
          claimPin: '3349',
          expectedPickupTime: new Date(Date.now() + 3 * 60 * 60 * 1000),
          receivedByStaffName: 'Bell Captain Desk',
        },
        {
          hotelId,
          claimTag: 'LLG-7003',
          guestName: 'Corporate Delegate Vikram',
          guestPhone: '+91 9822001199',
          roomNumber: '310',
          storageType: LuggageStorageType.TRANSIT_HOLD,
          status: LuggageStatus.STORED,
          rackLocation: 'CLOAKROOM-RACK-C04',
          totalPieces: 3,
          pieces: [
            {
              pieceId: 'P1',
              type: 'SUITCASE',
              colorDescription: 'Silver Aluminum Tumi Spinner',
              isFragile: false,
              hasPerishables: false,
            },
            {
              pieceId: 'P2',
              type: 'BACKPACK',
              colorDescription: 'Black Leather Laptop Backpack',
              isFragile: true,
              hasPerishables: false,
            },
            {
              pieceId: 'P3',
              type: 'CARTON',
              colorDescription: 'Kashmir Saffron & Wine Presentation Box',
              isFragile: true,
              hasPerishables: true,
            },
          ],
          claimPin: '8812',
          expectedPickupTime: new Date(Date.now() + 8 * 60 * 60 * 1000),
          receivedByStaffName: 'Bell Captain Desk',
        },
      ];
      await LeftLuggageClaim.insertMany(demoClaims);
      claims = await LeftLuggageClaim.find(filter).sort({ createdAt: -1 });
    }

    // Calculate Cloakroom Metrics
    const allClaims = await LeftLuggageClaim.find({ hotelId });
    const totalStored = allClaims.filter((c) => c.status === LuggageStatus.STORED).length;
    const earlyArrivals = allClaims.filter(
      (c) =>
        c.storageType === LuggageStorageType.EARLY_ARRIVAL &&
        (c.status === LuggageStatus.STORED || c.status === LuggageStatus.DISPATCH_REQUESTED)
    ).length;
    const postCheckout = allClaims.filter(
      (c) =>
        c.storageType === LuggageStorageType.POST_CHECKOUT &&
        (c.status === LuggageStatus.STORED || c.status === LuggageStatus.DISPATCH_REQUESTED)
    ).length;
    const activeDispatches = allClaims.filter(
      (c) =>
        c.status === LuggageStatus.OUT_FOR_DELIVERY || c.status === LuggageStatus.DISPATCH_REQUESTED
    ).length;
    const totalPiecesInVault = allClaims
      .filter((c) => c.status === LuggageStatus.STORED || c.status === LuggageStatus.OUT_FOR_DELIVERY)
      .reduce((sum, c) => sum + (c.totalPieces || c.pieces.length || 1), 0);

    return res.status(200).json({
      success: true,
      data: {
        claims,
        metrics: {
          totalStored,
          earlyArrivals,
          postCheckout,
          activeDispatches,
          totalPiecesInVault,
        },
      },
    });
  } catch (error: any) {
    console.error('Error in getLeftLuggageClaims:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const tagNewLuggageClaim = async (req: Request, res: Response) => {
  try {
    const hotelId = req.headers['x-hotel-id'] || req.body.hotelId || (req as any).user?.hotelId;
    if (!hotelId) {
      return res.status(400).json({ success: false, message: 'Hotel ID is required.' });
    }

    const {
      guestName,
      guestPhone,
      guestEmail,
      roomNumber,
      storageType,
      rackLocation,
      pieces,
      expectedPickupHours,
      claimPin,
      notes,
    } = req.body;

    if (!guestName || !guestName.trim()) {
      return res.status(400).json({ success: false, message: 'Guest name is required.' });
    }
    if (!guestPhone || !guestPhone.trim()) {
      return res.status(400).json({ success: false, message: 'Guest contact phone is required.' });
    }

    const uniqueTag = `LLG-${Date.now().toString().slice(-4)}-${Math.floor(100 + Math.random() * 900)}`;
    const verifiedPin = claimPin ? String(claimPin).trim() : `${Math.floor(1000 + Math.random() * 9000)}`;

    const formattedPieces: ILuggagePiece[] =
      Array.isArray(pieces) && pieces.length > 0
        ? pieces.map((p: any, idx: number) => ({
            pieceId: p.pieceId || `P${idx + 1}`,
            type: p.type || 'SUITCASE',
            colorDescription: p.colorDescription || 'Luggage Piece',
            isFragile: Boolean(p.isFragile),
            hasPerishables: Boolean(p.hasPerishables),
          }))
        : [
            {
              pieceId: 'P1',
              type: 'SUITCASE',
              colorDescription: 'Standard Trolley Bag',
              isFragile: false,
              hasPerishables: false,
            },
          ];

    const pickupHours = Number(expectedPickupHours) || 6;
    const expectedPickupTime = new Date(Date.now() + pickupHours * 60 * 60 * 1000);

    const staffName = (req as any).user?.name || 'Front Desk Bell Captain';

    const newClaim = await LeftLuggageClaim.create({
      hotelId,
      claimTag: uniqueTag,
      guestName: guestName.trim(),
      guestPhone: guestPhone.trim(),
      guestEmail: guestEmail ? guestEmail.trim() : undefined,
      roomNumber: roomNumber ? roomNumber.trim() : undefined,
      storageType: storageType || LuggageStorageType.POST_CHECKOUT,
      status: LuggageStatus.STORED,
      rackLocation: rackLocation ? rackLocation.trim() : 'CLOAKROOM-RACK-A01',
      pieces: formattedPieces,
      totalPieces: formattedPieces.length,
      checkInTime: new Date(),
      expectedPickupTime,
      claimPin: verifiedPin,
      receivedByStaffName: staffName,
      releaseNotes: notes,
    });

    return res.status(201).json({
      success: true,
      message: `Luggage tagged successfully with claim ticket ${uniqueTag}.`,
      data: newClaim,
    });
  } catch (error: any) {
    console.error('Error in tagNewLuggageClaim:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const requestLuggageDispatch = async (req: Request, res: Response) => {
  try {
    const hotelId = req.headers['x-hotel-id'] || req.body.hotelId || (req as any).user?.hotelId;
    if (!hotelId) {
      return res.status(400).json({ success: false, message: 'Hotel ID is required.' });
    }

    const { claimTag, porterName, targetLocation, notes } = req.body;
    if (!claimTag) {
      return res.status(400).json({ success: false, message: 'Claim tag is required.' });
    }
    if (!porterName || !porterName.trim()) {
      return res.status(400).json({ success: false, message: 'Porter name is required for dispatch.' });
    }

    const claim = await LeftLuggageClaim.findOne({ hotelId, claimTag });
    if (!claim) {
      return res.status(404).json({ success: false, message: 'Luggage claim ticket not found.' });
    }

    if (claim.status === LuggageStatus.CLAIMED_AT_COUNTER) {
      return res.status(400).json({ success: false, message: 'Luggage has already been claimed and released.' });
    }

    const dispatchId = `DSP-${Date.now().toString().slice(-6)}`;
    const newDispatch = {
      dispatchId,
      dispatchedAt: new Date(),
      porterName: porterName.trim(),
      targetLocation: targetLocation ? targetLocation.trim() : (claim.roomNumber ? `Room ${claim.roomNumber}` : 'Main Porch Valet'),
      status: 'IN_TRANSIT' as const,
      notes: notes ? notes.trim() : undefined,
    };

    claim.dispatches.push(newDispatch);
    claim.status = LuggageStatus.OUT_FOR_DELIVERY;
    claim.currentPorterName = porterName.trim();
    await claim.save();

    return res.status(200).json({
      success: true,
      message: `Porter ${porterName} dispatched to ${newDispatch.targetLocation}.`,
      data: claim,
    });
  } catch (error: any) {
    console.error('Error in requestLuggageDispatch:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const completeLuggageDelivery = async (req: Request, res: Response) => {
  try {
    const hotelId = req.headers['x-hotel-id'] || req.body.hotelId || (req as any).user?.hotelId;
    if (!hotelId) {
      return res.status(400).json({ success: false, message: 'Hotel ID is required.' });
    }

    const { claimTag, deliveredToRoom, staffPin, recipientConfirmation } = req.body;
    if (!claimTag) {
      return res.status(400).json({ success: false, message: 'Claim tag is required.' });
    }

    const claim = await LeftLuggageClaim.findOne({ hotelId, claimTag });
    if (!claim) {
      return res.status(404).json({ success: false, message: 'Luggage claim ticket not found.' });
    }

    // Verify Supervisor / Staff PIN
    if (staffPin && staffPin !== '9921' && staffPin !== '1234') {
      return res.status(403).json({ success: false, message: 'Invalid Staff Verification PIN.' });
    }

    // Complete latest active dispatch if present
    if (claim.dispatches.length > 0) {
      const activeDisp = claim.dispatches[claim.dispatches.length - 1];
      activeDisp.status = 'COMPLETED';
      activeDisp.completedAt = new Date();
      if (recipientConfirmation) {
        activeDisp.notes = `${activeDisp.notes ? activeDisp.notes + ' | ' : ''}Confirmed by: ${recipientConfirmation}`;
      }
    }

    const isRoomDelivery = deliveredToRoom !== false;
    claim.status = isRoomDelivery ? LuggageStatus.DELIVERED_TO_ROOM : LuggageStatus.CLAIMED_AT_COUNTER;
    claim.actualReleaseTime = new Date();
    claim.releasedByStaffName = claim.currentPorterName || (req as any).user?.name || 'Porter Staff';
    claim.releaseNotes = recipientConfirmation ? `Handed over to ${recipientConfirmation}` : 'Delivered to room successfully.';
    await claim.save();

    return res.status(200).json({
      success: true,
      message: `Baggage delivery verified and completed (${claim.status}).`,
      data: claim,
    });
  } catch (error: any) {
    console.error('Error in completeLuggageDelivery:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const releaseLuggageAtCounter = async (req: Request, res: Response) => {
  try {
    const hotelId = req.headers['x-hotel-id'] || req.body.hotelId || (req as any).user?.hotelId;
    if (!hotelId) {
      return res.status(400).json({ success: false, message: 'Hotel ID is required.' });
    }

    const { claimTag, claimPin, staffPin, releaseNotes } = req.body;
    if (!claimTag) {
      return res.status(400).json({ success: false, message: 'Claim tag is required.' });
    }

    const claim = await LeftLuggageClaim.findOne({ hotelId, claimTag });
    if (!claim) {
      return res.status(404).json({ success: false, message: 'Luggage claim ticket not found.' });
    }

    if (claim.status === LuggageStatus.CLAIMED_AT_COUNTER) {
      return res.status(400).json({ success: false, message: 'Luggage has already been claimed and released.' });
    }

    // Verify Claim PIN or Supervisor Override PIN
    const isMasterOverride = staffPin === '9921' || staffPin === '1234';
    const isPinMatch = claimPin && String(claimPin).trim() === claim.claimPin;

    if (!isMasterOverride && !isPinMatch) {
      return res.status(403).json({
        success: false,
        message: 'Invalid Guest Claim PIN. Counter release rejected without valid PIN or Supervisor override.',
      });
    }

    claim.status = LuggageStatus.CLAIMED_AT_COUNTER;
    claim.actualReleaseTime = new Date();
    claim.releasedByStaffName = (req as any).user?.name || 'Front Desk Bell Captain';
    claim.releaseNotes = releaseNotes ? releaseNotes.trim() : 'Released at Bell Desk counter upon claim ticket verification.';
    await claim.save();

    return res.status(200).json({
      success: true,
      message: `Luggage ${claimTag} successfully released to guest at counter.`,
      data: claim,
    });
  } catch (error: any) {
    console.error('Error in releaseLuggageAtCounter:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const logLuggageDiscrepancy = async (req: Request, res: Response) => {
  try {
    const hotelId = req.headers['x-hotel-id'] || req.body.hotelId || (req as any).user?.hotelId;
    if (!hotelId) {
      return res.status(400).json({ success: false, message: 'Hotel ID is required.' });
    }

    const { claimTag, isDiscrepancy, discrepancyNote, isDisputedLost } = req.body;
    if (!claimTag) {
      return res.status(400).json({ success: false, message: 'Claim tag is required.' });
    }

    const claim = await LeftLuggageClaim.findOne({ hotelId, claimTag });
    if (!claim) {
      return res.status(404).json({ success: false, message: 'Luggage claim ticket not found.' });
    }

    claim.isDiscrepancy = isDiscrepancy !== false;
    claim.discrepancyNote = discrepancyNote ? discrepancyNote.trim() : 'Damage or discrepancy reported by guest.';
    if (isDisputedLost) {
      claim.status = LuggageStatus.DISPUTED_LOST;
    }
    await claim.save();

    return res.status(200).json({
      success: true,
      message: `Luggage discrepancy recorded for ${claimTag}.`,
      data: claim,
    });
  } catch (error: any) {
    console.error('Error in logLuggageDiscrepancy:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getLuggageAuditLog = async (req: Request, res: Response) => {
  try {
    const hotelId = req.headers['x-hotel-id'] || req.query.hotelId || (req as any).user?.hotelId;
    if (!hotelId) {
      return res.status(400).json({ success: false, message: 'Hotel ID is required.' });
    }

    const { claimTag } = req.params;
    const claim = await LeftLuggageClaim.findOne({ hotelId, claimTag });
    if (!claim) {
      return res.status(404).json({ success: false, message: 'Luggage claim not found.' });
    }

    return res.status(200).json({
      success: true,
      data: {
        claimTag: claim.claimTag,
        guestName: claim.guestName,
        roomNumber: claim.roomNumber,
        rackLocation: claim.rackLocation,
        status: claim.status,
        checkInTime: claim.checkInTime,
        actualReleaseTime: claim.actualReleaseTime,
        receivedByStaffName: claim.receivedByStaffName,
        releasedByStaffName: claim.releasedByStaffName,
        dispatches: claim.dispatches,
        pieces: claim.pieces,
      },
    });
  } catch (error: any) {
    console.error('Error in getLuggageAuditLog:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
