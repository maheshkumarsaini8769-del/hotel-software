import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { FloorDutyMatrix, IFloorWaiterDuty } from '../models/FloorDutyMatrix';
import { DiningTable, TableStatus } from '../models/DiningTable';
import {
  TargetedPushAlert,
  AlertType,
  AlertRoutingType,
  AlertPriority,
  AlertStatus,
} from '../models/TargetedPushAlert';
import { escapeRegex } from '../utils/security';

export class FloorDutyMatrixController {
  /**
   * 1. Initialize or Synchronize Floor Duty Matrix
   * POST /api/v1/floor-matrix/init-sync
   */
  static async initOrSyncFloorMatrix(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string || req.body.hotelId;
      const { floorName, floorCode, supervisorId, supervisorName, shift, maxPaxPerWaiterCap } = req.body;

      if (!hotelId || !Types.ObjectId.isValid(hotelId)) {
        res.status(400).json({ success: false, message: 'Valid hotelId is required' });
        return;
      }

      if (!floorName || !floorCode) {
        res.status(400).json({ success: false, message: 'floorName and floorCode are required' });
        return;
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const activeShift = shift || 'EVENING';

      // Find all tables for this floor
      const tables = await DiningTable.find({
        hotelId: new Types.ObjectId(hotelId),
        $or: [
          { floorLevel: floorName },
          { tableNumber: { $regex: new RegExp(`^${escapeRegex(String(floorCode))}`, 'i') } },
        ],
      });

      const totalTables = tables.length;
      const totalCapacity = tables.reduce((sum, t) => sum + (t.capacity || 4), 0);

      let matrix = await FloorDutyMatrix.findOne({
        hotelId: new Types.ObjectId(hotelId),
        floorCode: floorCode.toUpperCase(),
        date: todayStr,
        shift: activeShift,
        isActive: true,
      });

      if (!matrix) {
        matrix = new FloorDutyMatrix({
          hotelId: new Types.ObjectId(hotelId),
          floorName,
          floorCode: floorCode.toUpperCase(),
          supervisorId: supervisorId && Types.ObjectId.isValid(supervisorId) ? new Types.ObjectId(supervisorId) : undefined,
          supervisorName,
          totalTables,
          totalCapacity,
          dutyRoster: [],
          unassignedTables: tables.map((t) => t.tableNumber),
          maxPaxPerWaiterCap: maxPaxPerWaiterCap || 40,
          shift: activeShift,
          date: todayStr,
          isActive: true,
        });
      } else {
        matrix.totalTables = totalTables;
        matrix.totalCapacity = totalCapacity;
        if (supervisorId && Types.ObjectId.isValid(supervisorId)) {
          matrix.supervisorId = new Types.ObjectId(supervisorId);
          matrix.supervisorName = supervisorName;
        }

        // Recalculate unassigned tables
        const allAssigned = matrix.dutyRoster.flatMap((d) => d.assignedTables);
        matrix.unassignedTables = tables
          .map((t) => t.tableNumber)
          .filter((num) => !allAssigned.includes(num));
      }

      await matrix.save();

      res.status(200).json({
        success: true,
        message: `Floor Duty Matrix for ${floorName} (${floorCode}) synchronized`,
        matrix,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * 2. Admin Dynamic Range Assigner (Assign Table Batch to Waiter)
   * POST /api/v1/floor-matrix/assign-range
   */
  static async assignDynamicRange(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string || req.body.hotelId;
      const {
        floorCode,
        waiterId,
        waiterName,
        tableRange,
        tables,
        isRovingWaiter,
        shift,
      } = req.body;

      if (!hotelId || !floorCode || !waiterId || !waiterName) {
        res.status(400).json({
          success: false,
          message: 'hotelId, floorCode, waiterId, and waiterName are required',
        });
        return;
      }

      let targetTables: string[] = [];

      if (Array.isArray(tables) && tables.length > 0) {
        targetTables = tables.map((t: string) => String(t).trim().toUpperCase());
      } else if (tableRange && typeof tableRange.start === 'number' && typeof tableRange.end === 'number') {
        const prefix = tableRange.prefix || `${floorCode}-`;
        for (let i = tableRange.start; i <= tableRange.end; i++) {
          const numStr = i < 10 ? `0${i}` : `${i}`;
          targetTables.push(`${prefix}${numStr}`);
        }
      } else {
        res.status(400).json({
          success: false,
          message: 'Either tables array or tableRange { start, end, prefix } is required',
        });
        return;
      }

      // Query dining tables to calculate total capacity
      const dbTables = await DiningTable.find({
        hotelId: new Types.ObjectId(hotelId),
        tableNumber: { $in: targetTables },
      });

      const paxCapacity = dbTables.reduce((acc, t) => acc + (t.capacity || 4), 0);
      const tableCount = targetTables.length;

      const todayStr = new Date().toISOString().split('T')[0];
      const activeShift = shift || 'EVENING';

      const dutyEntry: IFloorWaiterDuty = {
        waiterId: new Types.ObjectId(waiterId),
        waiterName: waiterName.trim(),
        assignedTables: targetTables,
        tableCount,
        paxCapacity,
        isRovingWaiter: Boolean(isRovingWaiter),
        assignedAt: new Date(),
      };

      // Update DiningTable records with assignedWaiterId
      await DiningTable.updateMany(
        {
          hotelId: new Types.ObjectId(hotelId),
          tableNumber: { $in: targetTables },
        },
        {
          $set: { assignedWaiterId: new Types.ObjectId(waiterId) },
        }
      );

      // Optimistic concurrency retry loop (up to 5 attempts)
      let saved = false;
      let attempts = 0;
      let matrix: any;
      let isOverloaded = false;
      let overloadWarning: string | null = null;

      while (!saved && attempts < 5) {
        attempts++;
        try {
          matrix = await FloorDutyMatrix.findOne({
            hotelId: new Types.ObjectId(hotelId),
            floorCode: floorCode.toUpperCase(),
            date: todayStr,
            shift: activeShift,
            isActive: true,
          });

          if (!matrix) {
            res.status(404).json({
              success: false,
              message: `Active FloorDutyMatrix not found for floor ${floorCode}. Please init floor first.`,
            });
            return;
          }

          // Check workload overload threshold
          isOverloaded = paxCapacity > matrix.maxPaxPerWaiterCap;
          overloadWarning = isOverloaded
            ? `Warning: ${waiterName} assigned ${paxCapacity} pax capacity, exceeding safety cap of ${matrix.maxPaxPerWaiterCap} pax!`
            : null;

          // Clean existing assignment for these tables across other roster entries on this floor
          matrix.dutyRoster.forEach((entry: any) => {
            entry.assignedTables = entry.assignedTables.filter((t: string) => !targetTables.includes(t));
            entry.tableCount = entry.assignedTables.length;
          });

          // Filter out empty entries
          matrix.dutyRoster = matrix.dutyRoster.filter((entry: any) => entry.tableCount > 0);

          // Add or update this waiter's duty
          const existingWaiterDutyIndex = matrix.dutyRoster.findIndex(
            (d: any) => d.waiterId.toString() === waiterId
          );

          if (existingWaiterDutyIndex >= 0) {
            matrix.dutyRoster[existingWaiterDutyIndex] = dutyEntry;
          } else {
            matrix.dutyRoster.push(dutyEntry);
          }

          // Recalculate unassigned tables on floor
          const allAssigned = matrix.dutyRoster.flatMap((d: any) => d.assignedTables);
          const allFloorTables = await DiningTable.find({
            hotelId: new Types.ObjectId(hotelId),
            $or: [
              { floorLevel: matrix.floorName },
              { tableNumber: { $regex: new RegExp(`^${escapeRegex(String(matrix.floorCode))}`, 'i') } },
            ],
          }).select('tableNumber');

          matrix.unassignedTables = allFloorTables
            .map((t) => t.tableNumber)
            .filter((num) => !allAssigned.includes(num));

          await matrix.save();
          saved = true;
        } catch (err: any) {
          if (attempts >= 5) throw err;
          // Exponential backoff with jitter
          await new Promise((resolve) => setTimeout(resolve, 25 * attempts + Math.floor(Math.random() * 25)));
        }
      }

      res.status(200).json({
        success: true,
        message: `Assigned ${tableCount} tables (${paxCapacity} pax) to ${waiterName} on ${matrix.floorName}`,
        isOverloaded,
        overloadWarning,
        duty: dutyEntry,
        unassignedCount: matrix.unassignedTables.length,
        matrix,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * 3. Multi-Floor Overview Dashboard (Ground, 2nd Floor, Rooftop)
   * GET /api/v1/floor-matrix/overview
   */
  static async getMultiFloorStatusOverview(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string;
      const todayStr = new Date().toISOString().split('T')[0];

      const activeMatrices = await FloorDutyMatrix.find({
        hotelId: new Types.ObjectId(hotelId),
        date: todayStr,
        isActive: true,
      });

      const floorSummaries = activeMatrices.map((matrix) => {
        const totalWaitersOnDuty = matrix.dutyRoster.length;
        const totalAssignedTables = matrix.dutyRoster.reduce((sum, d) => sum + d.tableCount, 0);
        const totalAssignedPax = matrix.dutyRoster.reduce((sum, d) => sum + d.paxCapacity, 0);
        const overloadedWaiters = matrix.dutyRoster
          .filter((d) => d.paxCapacity > matrix.maxPaxPerWaiterCap)
          .map((d) => ({
            waiterName: d.waiterName,
            paxCapacity: d.paxCapacity,
            cap: matrix.maxPaxPerWaiterCap,
          }));

        return {
          floorName: matrix.floorName,
          floorCode: matrix.floorCode,
          supervisorName: matrix.supervisorName || 'Unassigned Captain',
          shift: matrix.shift,
          totalTables: matrix.totalTables,
          totalCapacity: matrix.totalCapacity,
          totalAssignedTables,
          totalAssignedPax,
          unassignedTablesCount: matrix.unassignedTables.length,
          unassignedTables: matrix.unassignedTables,
          activeWaitersCount: totalWaitersOnDuty,
          overloadedWaitersCount: overloadedWaiters.length,
          overloadedWaiters,
        };
      });

      res.status(200).json({
        success: true,
        date: todayStr,
        totalFloorsActive: floorSummaries.length,
        floors: floorSummaries,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * 4. Multi-Floor Smart Alert Dispatch (Floor Specific Escalation)
   * POST /api/v1/floor-matrix/dispatch-floor-alert
   */
  static async dispatchFloorTargetedAlert(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string || req.body.hotelId;
      const { tableNumber, alertType, title, message, priority } = req.body;

      if (!tableNumber) {
        res.status(400).json({ success: false, message: 'tableNumber is required' });
        return;
      }

      const cleanTableNumber = String(tableNumber).trim().toUpperCase();

      const table = await DiningTable.findOne({
        hotelId: new Types.ObjectId(hotelId),
        tableNumber: cleanTableNumber,
      });

      if (!table) {
        res.status(404).json({ success: false, message: 'Table not found for tenant' });
        return;
      }

      const todayStr = new Date().toISOString().split('T')[0];

      // Find active floor matrix containing this table
      const matrix = await FloorDutyMatrix.findOne({
        hotelId: new Types.ObjectId(hotelId),
        date: todayStr,
        isActive: true,
        $or: [
          { 'dutyRoster.assignedTables': cleanTableNumber },
          { unassignedTables: cleanTableNumber },
          { floorName: table.floorLevel },
        ],
      });

      let targetWaiterId: Types.ObjectId | undefined;
      let targetWaiterName: string | undefined;
      let routingType: AlertRoutingType = AlertRoutingType.PRIMARY_TARGETED;

      if (matrix) {
        const assignedDuty = matrix.dutyRoster.find((d) =>
          d.assignedTables.includes(cleanTableNumber)
        );

        if (assignedDuty) {
          targetWaiterId = assignedDuty.waiterId;
          targetWaiterName = assignedDuty.waiterName;
          routingType = AlertRoutingType.PRIMARY_TARGETED;
        } else {
          // Unassigned on this floor: Escalate specifically to THIS FLOOR'S CAPTAIN!
          routingType = AlertRoutingType.CAPTAIN_ESCALATION;
          targetWaiterId = matrix.supervisorId;
          targetWaiterName = matrix.supervisorName
            ? `${matrix.supervisorName} (${matrix.floorName} Captain)`
            : `${matrix.floorName} Captain`;
        }
      } else {
        routingType = AlertRoutingType.CAPTAIN_ESCALATION;
        targetWaiterName = 'General Floor Captain';
      }

      const alert = await TargetedPushAlert.create({
        hotelId: new Types.ObjectId(hotelId),
        alertType: alertType || AlertType.CUSTOMER_CALL,
        tableId: table._id,
        tableNumber: cleanTableNumber,
        targetWaiterId,
        targetWaiterName,
        routingType,
        title: title || `${cleanTableNumber} Service Alert`,
        message: message || `Service call from ${cleanTableNumber}`,
        priority: priority || AlertPriority.NORMAL,
        status: AlertStatus.SENT,
        sentAt: new Date(),
      });

      res.status(201).json({
        success: true,
        message: `Alert dispatched to ${targetWaiterName}`,
        floorCode: matrix?.floorCode,
        floorName: matrix?.floorName,
        alert,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
