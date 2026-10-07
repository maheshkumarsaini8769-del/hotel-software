import mongoose, { Schema, Document, Types } from 'mongoose';

export enum ParcelDirection {
  INWARD = 'INWARD',
  OUTWARD = 'OUTWARD',
}

export enum CourierPartner {
  BLUE_DART = 'BLUE_DART',
  DHL = 'DHL',
  FEDEX = 'FEDEX',
  AMAZON = 'AMAZON',
  DELHIVERY = 'DELHIVERY',
  INDIA_POST = 'INDIA_POST',
  IN_PERSON_MESSENGER = 'IN_PERSON_MESSENGER',
  OTHER = 'OTHER',
}

export enum ParcelPackageType {
  BOX = 'BOX',
  DOCUMENT = 'DOCUMENT',
  ENVELOPE = 'ENVELOPE',
  MEDICINE_PERISHABLE = 'MEDICINE_PERISHABLE',
  FRAGILE = 'FRAGILE',
  CRATE = 'CRATE',
  OTHER = 'OTHER',
}

export enum ParcelStatus {
  RECEIVED_AT_DESK = 'RECEIVED_AT_DESK',
  GUEST_NOTIFIED = 'GUEST_NOTIFIED',
  OUT_FOR_ROOM_DELIVERY = 'OUT_FOR_ROOM_DELIVERY',
  DELIVERED_TO_GUEST = 'DELIVERED_TO_GUEST',
  RETURNED_TO_COURIER = 'RETURNED_TO_COURIER',
  FORWARDED = 'FORWARDED',
  OUTWARD_BOOKED = 'OUTWARD_BOOKED',
  OUTWARD_DISPATCHED = 'OUTWARD_DISPATCHED',
}

export interface IParcelAuditEntry {
  timestamp: Date;
  action: string;
  performedBy: string;
  details?: string;
}

export interface IGuestParcelLog extends Document {
  hotelId: Types.ObjectId;
  parcelTag: string; // e.g. "PCL-2026-1001"
  direction: ParcelDirection;
  courierPartner: CourierPartner;
  courierPartnerCustom?: string;
  trackingAwb: string; // Airway Bill or tracking identifier
  senderInfo: {
    name: string;
    organization?: string;
    contactPhone?: string;
    address?: string;
  };
  recipientInfo: {
    guestName: string;
    roomNumber?: string;
    guestPhone: string;
    guestEmail?: string;
    stayId?: Types.ObjectId;
  };
  packageType: ParcelPackageType;
  pieceCount: number;
  isHighValue: boolean;
  storageLocation: string; // e.g. "PARCEL-BAY-01", "CONCIERGE-COOLER"
  status: ParcelStatus;
  receivedAt: Date;
  receivedByStaffName: string;
  verificationPin: string; // 4-digit secure claim OTP
  dispatchInfo?: {
    dispatchedAt?: Date;
    porterName?: string;
    targetLocation?: string;
    notes?: string;
  };
  deliveryInfo?: {
    deliveredAt?: Date;
    deliveredByStaffName?: string;
    handoverMode?: 'ROOM_DELIVERY' | 'FRONT_DESK_COUNTER';
    recipientAcknowledgedBy?: string;
    signatureDataUrl?: string; // Digital signature image data
    verificationMethod?: 'OTP_PIN' | 'KEYCARD_MATCH' | 'ID_VERIFIED';
    notes?: string;
  };
  outwardDetails?: {
    destinationAddress?: string;
    estimatedCharge?: number;
    folioPosted?: boolean;
    folioChargeId?: string;
  };
  auditTrail: IParcelAuditEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const ParcelAuditEntrySchema = new Schema<IParcelAuditEntry>(
  {
    timestamp: { type: Date, default: Date.now },
    action: { type: String, required: true },
    performedBy: { type: String, required: true },
    details: { type: String },
  },
  { _id: false }
);

const GuestParcelLogSchema = new Schema<IGuestParcelLog>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    parcelTag: { type: String, required: true },
    direction: {
      type: String,
      enum: Object.values(ParcelDirection),
      default: ParcelDirection.INWARD,
      required: true,
    },
    courierPartner: {
      type: String,
      enum: Object.values(CourierPartner),
      default: CourierPartner.BLUE_DART,
      required: true,
    },
    courierPartnerCustom: { type: String },
    trackingAwb: { type: String, required: true },
    senderInfo: {
      name: { type: String, required: true },
      organization: { type: String },
      contactPhone: { type: String },
      address: { type: String },
    },
    recipientInfo: {
      guestName: { type: String, required: true },
      roomNumber: { type: String },
      guestPhone: { type: String, required: true },
      guestEmail: { type: String },
      stayId: { type: Schema.Types.ObjectId, ref: 'Stay' },
    },
    packageType: {
      type: String,
      enum: Object.values(ParcelPackageType),
      default: ParcelPackageType.BOX,
      required: true,
    },
    pieceCount: { type: Number, default: 1, min: 1 },
    isHighValue: { type: Boolean, default: false },
    storageLocation: { type: String, default: 'PARCEL-BAY-01' },
    status: {
      type: String,
      enum: Object.values(ParcelStatus),
      default: ParcelStatus.RECEIVED_AT_DESK,
      required: true,
    },
    receivedAt: { type: Date, default: Date.now },
    receivedByStaffName: { type: String, required: true },
    verificationPin: { type: String, required: true },
    dispatchInfo: {
      dispatchedAt: { type: Date },
      porterName: { type: String },
      targetLocation: { type: String },
      notes: { type: String },
    },
    deliveryInfo: {
      deliveredAt: { type: Date },
      deliveredByStaffName: { type: String },
      handoverMode: { type: String, enum: ['ROOM_DELIVERY', 'FRONT_DESK_COUNTER'] },
      recipientAcknowledgedBy: { type: String },
      signatureDataUrl: { type: String },
      verificationMethod: { type: String, enum: ['OTP_PIN', 'KEYCARD_MATCH', 'ID_VERIFIED'] },
      notes: { type: String },
    },
    outwardDetails: {
      destinationAddress: { type: String },
      estimatedCharge: { type: Number, default: 0 },
      folioPosted: { type: Boolean, default: false },
      folioChargeId: { type: String },
    },
    auditTrail: [ParcelAuditEntrySchema],
  },
  { timestamps: true }
);

GuestParcelLogSchema.index({ hotelId: 1, parcelTag: 1 }, { unique: true });
GuestParcelLogSchema.index({ hotelId: 1, status: 1 });
GuestParcelLogSchema.index({ hotelId: 1, direction: 1 });
GuestParcelLogSchema.index({ hotelId: 1, 'recipientInfo.roomNumber': 1 });

export const GuestParcelLog = mongoose.model<IGuestParcelLog>(
  'GuestParcelLog',
  GuestParcelLogSchema
);
