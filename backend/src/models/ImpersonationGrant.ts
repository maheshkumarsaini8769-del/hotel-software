import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IImpersonationGrant extends Document {
  tokenHash: string;
  tenantId: Types.ObjectId;
  adminUserId: Types.ObjectId;
  createdBy: Types.ObjectId;
  expiresAt: Date;
  createdAt: Date;
}

const ImpersonationGrantSchema = new Schema<IImpersonationGrant>(
  {
    tokenHash: { type: String, required: true, unique: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    adminUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const ImpersonationGrant = mongoose.model<IImpersonationGrant>(
  'ImpersonationGrant',
  ImpersonationGrantSchema
);
