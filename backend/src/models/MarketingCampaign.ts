import mongoose, { Schema, Document, Types } from 'mongoose';

export enum CampaignChannel {
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP'
}

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  SENT = 'SENT',
  CANCELLED = 'CANCELLED'
}

export interface IMarketingCampaign extends Document {
  hotelId: Types.ObjectId;
  campaignName: string;
  channel: CampaignChannel;
  targetVipTier: 'ALL' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'VIP';
  minimumSpendFilter?: number;
  messageTemplate: string;
  status: CampaignStatus;
  scheduledAt?: Date;
  sentAt?: Date;
  recipientCount: number;
  deliveredCount: number;
  dispatchedByUserId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MarketingCampaignSchema = new Schema<IMarketingCampaign>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    campaignName: { type: String, required: true, trim: true },
    channel: {
      type: String,
      enum: Object.values(CampaignChannel),
      default: CampaignChannel.SMS,
    },
    targetVipTier: {
      type: String,
      enum: ['ALL', 'SILVER', 'GOLD', 'PLATINUM', 'VIP'],
      default: 'ALL',
      index: true,
    },
    minimumSpendFilter: { type: Number, default: 0, min: 0 },
    messageTemplate: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(CampaignStatus),
      default: CampaignStatus.DRAFT,
      index: true,
    },
    scheduledAt: { type: Date },
    sentAt: { type: Date },
    recipientCount: { type: Number, default: 0, min: 0 },
    deliveredCount: { type: Number, default: 0, min: 0 },
    dispatchedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

MarketingCampaignSchema.index({ hotelId: 1, createdAt: -1 });

export const MarketingCampaign = mongoose.model<IMarketingCampaign>('MarketingCampaign', MarketingCampaignSchema);
