import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { WaiterZoneAssignment } from '../models/WaiterZoneAssignment';
import { DiningTable } from '../models/DiningTable';
import {
  TargetedPushAlert,
  AlertType,
  AlertRoutingType,
  AlertPriority,
  AlertStatus,
} from '../models/TargetedPushAlert';

export class WaiterZoneController {
  /**
   * 1. Assign Tables or Table Range to a Waiter
   * POST /api/v1/waiter-zones/assign
   */
  static async assignZone(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string || req.body.hotelId;
      const {
        zoneName,
        floorLevel,
        waiterId,
        waiterName,
        tableNumbers,
        tableRange,
        backupWaiterId,
        backupWaiterName,
        notes,
      } = req.body;

      if (!hotelId || !Types.ObjectId.isValid(hotelId)) {
        res.status(400).json({ success: false, message: 'Valid hotelId is required' });
        return;
      }

      if (!zoneName || !waiterId || !waiterName) {
        res.status(400).json({ success: false, message: 'zoneName, waiterId, and waiterName are required' });
        return;
      }

      let resolvedTableNumbers: string[] = [];

      if (Array.isArray(tableNumbers) && tableNumbers.length > 0) {
        resolvedTableNumbers = tableNumbers.map((t: string) => String(t).trim().toUpperCase());
      } else if (tableRange && typeof tableRange.start === 'number' && typeof tableRange.end === 'number') {
        const prefix = tableRange.prefix || 'T-';
        for (let i = tableRange.start; i <= tableRange.end; i++) {
          const numStr = i < 10 ? `0${i}` : `${i}`;
          resolvedTableNumbers.push(`${prefix}${numStr}`);
        }
      } else {
        res.status(400).json({
          success: false,
          message: 'Either tableNumbers array or tableRange { start, end, prefix } must be provided',
        });
        return;
      }

      // Query tables belonging to this tenant
      const tables = await DiningTable.find({
        hotelId: new Types.ObjectId(hotelId),
        tableNumber: { $in: resolvedTableNumbers },
      });

      const tableIds = tables.map((t) => t._id);

      // Deactivate any previous active assignments overlapping these tables for this tenant
      await WaiterZoneAssignment.updateMany(
        {
          hotelId: new Types.ObjectId(hotelId),
          isActive: true,
          tableNumbers: { $in: resolvedTableNumbers },
        },
        {
          $set: { isActive: false },
        }
      );

      // Update DiningTable records with assignedWaiterId
      await DiningTable.updateMany(
        {
          hotelId: new Types.ObjectId(hotelId),
          tableNumber: { $in: resolvedTableNumbers },
        },
        {
          $set: { assignedWaiterId: new Types.ObjectId(waiterId) },
        }
      );

      const assignment = await WaiterZoneAssignment.create({
        hotelId: new Types.ObjectId(hotelId),
        zoneName: zoneName.trim(),
        floorLevel: floorLevel || 'Ground Floor',
        waiterId: new Types.ObjectId(waiterId),
        waiterName: waiterName.trim(),
        tableIds,
        tableNumbers: resolvedTableNumbers,
        backupWaiterId: backupWaiterId && Types.ObjectId.isValid(backupWaiterId) ? new Types.ObjectId(backupWaiterId) : undefined,
        backupWaiterName,
        isActive: true,
        notes,
      });

      res.status(201).json({
        success: true,
        message: `Assigned ${resolvedTableNumbers.length} tables to waiter ${waiterName}`,
        assignment,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * 2. Get All Active Zone Assignments
   * GET /api/v1/waiter-zones/active
   */
  static async getActiveZones(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string;
      const { floorLevel } = req.query;

      const query: any = {
        hotelId: new Types.ObjectId(hotelId),
        isActive: true,
      };

      if (floorLevel) {
        query.floorLevel = String(floorLevel).trim();
      }

      const assignments = await WaiterZoneAssignment.find(query).sort({ zoneName: 1 });

      res.status(200).json({
        success: true,
        count: assignments.length,
        assignments,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * 3. Get Specific Waiter's Assigned Tables & Status
   * GET /api/v1/waiter-zones/waiter/:waiterId/tables
   */
  static async getWaiterAssignedTables(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string;
      const waiterId = req.params.waiterId as string;

      if (!waiterId || !Types.ObjectId.isValid(waiterId)) {
        res.status(400).json({ success: false, message: 'Valid waiterId is required' });
        return;
      }

      const assignment = await WaiterZoneAssignment.findOne({
        hotelId: new Types.ObjectId(hotelId),
        waiterId: new Types.ObjectId(waiterId),
        isActive: true,
      });

      if (!assignment) {
        res.status(200).json({
          success: true,
          assigned: false,
          tableNumbers: [],
          tables: [],
        });
        return;
      }

      const tables = await DiningTable.find({
        hotelId: new Types.ObjectId(hotelId),
        tableNumber: { $in: assignment.tableNumbers },
      }).select('tableNumber section capacity currentStatus availableSeatsCount occupiedSeatsCount');

      res.status(200).json({
        success: true,
        assigned: true,
        zoneName: assignment.zoneName,
        floorLevel: assignment.floorLevel,
        tableNumbers: assignment.tableNumbers,
        tables,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * 4. Dispatch Targeted Push Alert for a Table
   * POST /api/v1/waiter-zones/dispatch-alert
   */
  static async dispatchTargetedAlert(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string || req.body.hotelId;
      const {
        tableNumber,
        tableId,
        alertType,
        title,
        message,
        priority,
        orderId,
        metadata,
      } = req.body;

      if (!tableNumber && !tableId) {
        res.status(400).json({ success: false, message: 'Either tableNumber or tableId is required' });
        return;
      }

      const cleanTableNumber = String(tableNumber || '').trim().toUpperCase();

      const table = await DiningTable.findOne({
        hotelId: new Types.ObjectId(hotelId),
        ...(tableId ? { _id: new Types.ObjectId(tableId) } : { tableNumber: cleanTableNumber }),
      });

      if (!table) {
        res.status(404).json({ success: false, message: 'Dining table not found for tenant' });
        return;
      }

      // Check active zone assignment for this table
      const assignment = await WaiterZoneAssignment.findOne({
        hotelId: new Types.ObjectId(hotelId),
        tableNumbers: table.tableNumber,
        isActive: true,
      });

      let targetWaiterId: Types.ObjectId | undefined;
      let targetWaiterName: string | undefined;
      let routingType: AlertRoutingType = AlertRoutingType.PRIMARY_TARGETED;

      if (assignment) {
        targetWaiterId = assignment.waiterId;
        targetWaiterName = assignment.waiterName;
        routingType = AlertRoutingType.PRIMARY_TARGETED;
      } else {
        // Fallback: No assigned waiter -> Escalate to Floor Captain / Broadcast
        routingType = AlertRoutingType.CAPTAIN_ESCALATION;
        targetWaiterName = 'Floor Captain (Unassigned Table)';
      }

      const alert = await TargetedPushAlert.create({
        hotelId: new Types.ObjectId(hotelId),
        alertType: alertType || AlertType.CUSTOMER_CALL,
        tableId: table._id,
        tableNumber: table.tableNumber,
        targetWaiterId,
        targetWaiterName,
        routingType,
        title: title || `Table ${table.tableNumber} Request`,
        message: message || `Customer at Table ${table.tableNumber} requires assistance.`,
        priority: priority || AlertPriority.NORMAL,
        status: AlertStatus.SENT,
        orderId: orderId && Types.ObjectId.isValid(orderId) ? new Types.ObjectId(orderId) : undefined,
        metadata,
        sentAt: new Date(),
      });

      res.status(201).json({
        success: true,
        message: `Alert dispatched to ${targetWaiterName || 'Floor Captain'}`,
        alert,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * 5. Get Filtered Alert Feed for Waiter (Anti-Spam Isolation)
   * GET /api/v1/waiter-zones/waiter/:waiterId/feed
   */
  static async getWaiterAlertFeed(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string;
      const waiterId = req.params.waiterId as string;
      const { isCaptain } = req.query;

      if (!waiterId || !Types.ObjectId.isValid(waiterId)) {
        res.status(400).json({ success: false, message: 'Valid waiterId is required' });
        return;
      }

      const activeStatuses = [
        AlertStatus.SENT,
        AlertStatus.DELIVERED,
        AlertStatus.ACKNOWLEDGED,
        AlertStatus.ON_MY_WAY,
      ];

      let filter: any;

      if (isCaptain === 'true') {
        // Floor Captain sees all alerts for the tenant
        filter = {
          hotelId: new Types.ObjectId(hotelId),
          status: { $in: activeStatuses },
        };
      } else {
        // Dedicated Waiter sees ONLY their targeted alerts + global unassigned broadcasts
        filter = {
          hotelId: new Types.ObjectId(hotelId),
          status: { $in: activeStatuses },
          $or: [
            { targetWaiterId: new Types.ObjectId(waiterId) },
            { routingType: { $in: [AlertRoutingType.ZONE_BROADCAST, AlertRoutingType.CAPTAIN_ESCALATION] } },
          ],
        };
      }

      const alerts = await TargetedPushAlert.find(filter).sort({ sentAt: -1 });

      res.status(200).json({
        success: true,
        count: alerts.length,
        alerts,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * 6. Waiter Action / ACK on Targeted Alert
   * POST /api/v1/waiter-zones/alert/:alertId/action
   */
  static async waiterActionAlert(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string;
      const alertId = req.params.alertId as string;
      const { action, waiterId, waiterName } = req.body;

      if (!alertId || !Types.ObjectId.isValid(alertId)) {
        res.status(400).json({ success: false, message: 'Valid alertId is required' });
        return;
      }

      if (!action || !['ACKNOWLEDGE', 'ON_MY_WAY', 'RESOLVE'].includes(action)) {
        res.status(400).json({ success: false, message: 'Action must be ACKNOWLEDGE, ON_MY_WAY, or RESOLVE' });
        return;
      }

      const alert = await TargetedPushAlert.findOne({
        _id: new Types.ObjectId(alertId),
        hotelId: new Types.ObjectId(hotelId),
      });

      if (!alert) {
        res.status(404).json({ success: false, message: 'Alert not found for tenant' });
        return;
      }

      if (alert.status === AlertStatus.RESOLVED) {
        res.status(400).json({ success: false, message: 'Alert is already resolved' });
        return;
      }

      const now = new Date();

      if (action === 'ACKNOWLEDGE') {
        alert.status = AlertStatus.ACKNOWLEDGED;
        alert.acknowledgedAt = now;
      } else if (action === 'ON_MY_WAY') {
        alert.status = AlertStatus.ON_MY_WAY;
        if (!alert.acknowledgedAt) alert.acknowledgedAt = now;
      } else if (action === 'RESOLVE') {
        alert.status = AlertStatus.RESOLVED;
        alert.resolvedAt = now;
      }

      if (waiterId && Types.ObjectId.isValid(waiterId)) {
        alert.acknowledgedByUserId = new Types.ObjectId(waiterId);
      }
      if (waiterName) {
        alert.acknowledgedByName = String(waiterName).trim();
      }

      await alert.save();

      res.status(200).json({
        success: true,
        message: `Alert updated to status ${alert.status}`,
        alert,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * 7. Unassign / Deactivate Zone
   * POST /api/v1/waiter-zones/unassign
   */
  static async unassignZone(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string;
      const { assignmentId } = req.body;

      if (!assignmentId || !Types.ObjectId.isValid(assignmentId)) {
        res.status(400).json({ success: false, message: 'Valid assignmentId is required' });
        return;
      }

      const assignment = await WaiterZoneAssignment.findOne({
        _id: new Types.ObjectId(assignmentId),
        hotelId: new Types.ObjectId(hotelId),
      });

      if (!assignment) {
        res.status(404).json({ success: false, message: 'Zone assignment not found' });
        return;
      }

      assignment.isActive = false;
      await assignment.save();

      // Clear assignedWaiterId from DiningTable
      await DiningTable.updateMany(
        {
          hotelId: new Types.ObjectId(hotelId),
          tableNumber: { $in: assignment.tableNumbers },
        },
        {
          $unset: { assignedWaiterId: 1 },
        }
      );

      res.status(200).json({
        success: true,
        message: `Zone ${assignment.zoneName} deactivated and tables unassigned`,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
