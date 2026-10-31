import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
  hotelId: Types.ObjectId;
  userId?: Types.ObjectId;
  userEmail?: string;
  userName?: string;
  action: string; // e.g. 'BILL_VOIDED', 'STAFF_DELETED', 'MENU_PRICE_CHANGED', 'STAFF_CREATED', 'ROOM_STATUS_CHANGED'
  entity: string; // e.g. 'RestaurantBill', 'User', 'MenuItem', 'Room'
  entityId?: string;
  oldValue?: any;
  newValue?: any;
  details?: string;
  ipAddress?: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    userEmail: { type: String, trim: true },
    userName: { type: String, trim: true },
    action: { type: String, required: true, index: true },
    entity: { type: String, required: true, index: true },
    entityId: { type: String },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
    details: { type: String },
    ipAddress: { type: String },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

AuditLogSchema.index({ hotelId: 1, timestamp: -1 });
AuditLogSchema.index({ hotelId: 1, action: 1 });
AuditLogSchema.index({ hotelId: 1, entity: 1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
