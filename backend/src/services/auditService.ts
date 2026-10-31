import { Types } from 'mongoose';
import { AuditLog } from '../models/AuditLog';

export interface AuditLogParams {
  hotelId: string | Types.ObjectId;
  userId?: string | Types.ObjectId;
  userEmail?: string;
  userName?: string;
  action: string;
  entity: string;
  entityId?: string;
  oldValue?: any;
  newValue?: any;
  details?: string;
  ipAddress?: string;
}

export class AuditService {
  public static async log(params: AuditLogParams): Promise<void> {
    try {
      await AuditLog.create({
        hotelId: new Types.ObjectId(params.hotelId),
        userId: params.userId ? new Types.ObjectId(params.userId) : undefined,
        userEmail: params.userEmail,
        userName: params.userName,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        oldValue: params.oldValue,
        newValue: params.newValue,
        details: params.details,
        ipAddress: params.ipAddress,
        timestamp: new Date(),
      });
    } catch (err) {
      console.error('[AuditService] Failed to record audit log:', err);
    }
  }

  public static async getLogs(hotelId: string | Types.ObjectId, limit = 50, page = 1) {
    const skip = (page - 1) * limit;
    const hId = new Types.ObjectId(hotelId);
    const [logs, total] = await Promise.all([
      AuditLog.find({ hotelId: hId }).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments({ hotelId: hId }),
    ]);
    return { logs, total, page, totalPages: Math.ceil(total / limit) };
  }
}
