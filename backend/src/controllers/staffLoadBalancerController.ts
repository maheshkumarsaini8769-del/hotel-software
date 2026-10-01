import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { RestaurantOrder, OverallOrderStatus } from '../models/RestaurantOrder';
import { TargetedPushAlert, AlertStatus } from '../models/TargetedPushAlert';
import {
  StaffSpilloverLog,
  SpilloverTier,
  SpilloverItemStatus,
  IReallocatedTable,
} from '../models/StaffSpilloverLog';

export interface StaffWorkloadScore {
  staffId: string;
  staffName: string;
  assignedTablesCount: number;
  occupiedTablesCount: number;
  pendingOrdersCount: number;
  unresolvedAlertsCount: number;
  workloadScore: number;
}

export class StaffLoadBalancerController {
  /**
   * Helper: Calculate real-time workload score for a list of floor staff
   */
  static async computeStaffWorkloads(
    hotelId: string,
    floorLevel: string,
    activeStaffList: Array<{ staffId: string; staffName: string }>
  ): Promise<StaffWorkloadScore[]> {
    const scores: StaffWorkloadScore[] = [];

    for (const staff of activeStaffList) {
      const staffObjectId = new Types.ObjectId(staff.staffId);

      // 1. Tables assigned to this staff member
      const tables = await DiningTable.find({
        hotelId: new Types.ObjectId(hotelId),
        assignedWaiterId: staffObjectId,
      });

      const assignedTablesCount = tables.length;
      const occupiedTablesCount = tables.filter((t) =>
        [TableStatus.OCCUPIED, TableStatus.BILLING].includes(t.currentStatus)
      ).length;

      const tableIds = tables.map((t) => t._id);

      // 2. Pending orders count
      const pendingOrdersCount = await RestaurantOrder.countDocuments({
        hotelId: new Types.ObjectId(hotelId),
        tableId: { $in: tableIds },
        orderStatus: { $in: [OverallOrderStatus.PLACED, OverallOrderStatus.ACCEPTED] },
      });

      // 3. Unresolved targeted alerts count
      const unresolvedAlertsCount = await TargetedPushAlert.countDocuments({
        hotelId: new Types.ObjectId(hotelId),
        targetWaiterId: staffObjectId,
        status: { $in: [AlertStatus.SENT, AlertStatus.DELIVERED, AlertStatus.ON_MY_WAY] },
      });

      // Weighted workload formula
      const workloadScore = Number(
        (
          occupiedTablesCount * 2.0 +
          pendingOrdersCount * 3.0 +
          unresolvedAlertsCount * 1.5 +
          assignedTablesCount * 0.5
        ).toFixed(1)
      );

      scores.push({
        staffId: staff.staffId,
        staffName: staff.staffName,
        assignedTablesCount,
        occupiedTablesCount,
        pendingOrdersCount,
        unresolvedAlertsCount,
        workloadScore,
      });
    }

    // Sort ascending by workloadScore (least busy first)
    return scores.sort((a, b) => a.workloadScore - b.workloadScore);
  }

  /**
   * 1. Get Live Floor Load Balance Report
   * POST /api/v1/load-balancer/floor-workloads
   */
  static async getFloorLoadBalanceReport(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string || req.body.hotelId;
      const { floorLevel, activeStaff } = req.body;

      if (!hotelId || !Array.isArray(activeStaff)) {
        res.status(400).json({ success: false, message: 'hotelId and activeStaff array are required' });
        return;
      }

      const workloads = await StaffLoadBalancerController.computeStaffWorkloads(
        hotelId,
        floorLevel || 'Ground Floor',
        activeStaff
      );

      res.status(200).json({
        success: true,
        floorLevel: floorLevel || 'Ground Floor',
        totalStaffActive: workloads.length,
        leastBusyStaff: workloads[0] || null,
        workloads,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * 2. Trigger Late Attendance Auto-Spillover (15m to 40m late)
   * POST /api/v1/load-balancer/trigger-spillover
   */
  static async triggerLateSpillover(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string || req.body.hotelId;
      const {
        staffId,
        staffName,
        floorLevel,
        delayMinutes,
        plannedStartTime,
        availablePeers,
        captainId,
        captainName,
      } = req.body;

      if (!hotelId || !staffId || !staffName || typeof delayMinutes !== 'number') {
        res.status(400).json({
          success: false,
          message: 'hotelId, staffId, staffName, and delayMinutes are required',
        });
        return;
      }

      // Query tables currently assigned to late staff member
      const tables = await DiningTable.find({
        hotelId: new Types.ObjectId(hotelId),
        assignedWaiterId: new Types.ObjectId(staffId),
      });

      if (tables.length === 0) {
        res.status(200).json({
          success: true,
          message: `${staffName} has 0 assigned tables. No spillover needed.`,
          reallocatedCount: 0,
        });
        return;
      }

      // Determine Spillover Tier:
      // Tier 1: 15 to 29 mins late (Temporary peer balancing)
      // Tier 2: 30+ mins late (Emergency Absentee Escalation to Captain)
      const spilloverTier =
        delayMinutes >= 30
          ? SpilloverTier.TIER_2_ABSENTEE_ESCALATION
          : SpilloverTier.TIER_1_TEMPORARY;

      const reallocatedTables: IReallocatedTable[] = [];

      if (spilloverTier === SpilloverTier.TIER_1_TEMPORARY && Array.isArray(availablePeers) && availablePeers.length > 0) {
        // Calculate workloads of available peers to find who is least busy
        const rankedPeers = await StaffLoadBalancerController.computeStaffWorkloads(
          hotelId,
          floorLevel || 'Ground Floor',
          availablePeers
        );

        // Distribute tables round-robin or to least busy peer
        let peerIndex = 0;
        for (const table of tables) {
          const helper = rankedPeers[peerIndex % rankedPeers.length];
          peerIndex++;

          // Update DiningTable assignedWaiterId to helper
          table.assignedWaiterId = new Types.ObjectId(helper.staffId);
          await table.save();

          reallocatedTables.push({
            tableNumber: table.tableNumber,
            tableId: table._id,
            originalWaiterId: new Types.ObjectId(staffId),
            assignedToWaiterId: new Types.ObjectId(helper.staffId),
            assignedToWaiterName: helper.staffName,
            paxCapacity: table.capacity || 4,
            reassignedAt: new Date(),
            status: SpilloverItemStatus.ACTIVE_SPILLOVER,
          });
        }
      } else {
        // Tier 2 or No peers: Reassign all to Floor Captain
        const defaultCaptainId = captainId && Types.ObjectId.isValid(captainId)
          ? new Types.ObjectId(captainId)
          : new Types.ObjectId();
        const defaultCaptainName = captainName || 'Floor Captain';

        for (const table of tables) {
          table.assignedWaiterId = defaultCaptainId;
          await table.save();

          reallocatedTables.push({
            tableNumber: table.tableNumber,
            tableId: table._id,
            originalWaiterId: new Types.ObjectId(staffId),
            assignedToWaiterId: defaultCaptainId,
            assignedToWaiterName: defaultCaptainName,
            paxCapacity: table.capacity || 4,
            reassignedAt: new Date(),
            status: SpilloverItemStatus.ACTIVE_SPILLOVER,
          });
        }
      }

      // Log spillover action
      const log = await StaffSpilloverLog.create({
        hotelId: new Types.ObjectId(hotelId),
        scheduledStaffId: new Types.ObjectId(staffId),
        scheduledStaffName: staffName.trim(),
        floorLevel: floorLevel || 'Ground Floor',
        plannedStartTime: plannedStartTime || '18:00',
        delayMinutes,
        spilloverTier,
        reallocatedTables,
        triggeredAt: new Date(),
        notes: `Auto-spillover triggered: ${staffName} is ${delayMinutes} mins late.`,
      });

      res.status(200).json({
        success: true,
        message: `Spillover executed for ${staffName} (${delayMinutes}m late). ${reallocatedTables.length} tables redistributed under ${spilloverTier}.`,
        spilloverTier,
        reallocatedCount: reallocatedTables.length,
        log,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * 3. Late Staff Clock-In & Table Handback / Reclaim
   * POST /api/v1/load-balancer/reclaim-tables
   */
  static async reclaimTablesOnLateArrival(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string || req.body.hotelId;
      const { staffId, staffName, reclaimStrategy } = req.body;

      if (!hotelId || !staffId) {
        res.status(400).json({ success: false, message: 'hotelId and staffId are required' });
        return;
      }

      // Find active or partially reclaimed spillover logs for this staff member
      const activeLog = await StaffSpilloverLog.findOne({
        hotelId: new Types.ObjectId(hotelId),
        scheduledStaffId: new Types.ObjectId(staffId),
        'reallocatedTables.status': {
          $in: [SpilloverItemStatus.ACTIVE_SPILLOVER, SpilloverItemStatus.SETTLED_BY_PEER],
        },
      }).sort({ createdAt: -1 });

      if (!activeLog) {
        res.status(404).json({
          success: false,
          message: 'No active spillover found for this staff member',
        });
        return;
      }

      const strategy = reclaimStrategy || 'OPEN_TABLES_ONLY';
      const reclaimedNumbers: string[] = [];
      const retainedByPeerNumbers: string[] = [];

      for (const item of activeLog.reallocatedTables) {
        if (item.status === SpilloverItemStatus.RECLAIMED) continue;

        const table = await DiningTable.findById(item.tableId);
        if (!table) continue;

        const isCurrentlyOccupied = [TableStatus.OCCUPIED, TableStatus.BILLING].includes(
          table.currentStatus
        );

        if (strategy === 'ALL_TABLES' || !isCurrentlyOccupied) {
          // Reclaim table back to original staff member
          table.assignedWaiterId = new Types.ObjectId(staffId);
          await table.save();
          item.status = SpilloverItemStatus.RECLAIMED;
          reclaimedNumbers.push(item.tableNumber);
        } else {
          // Table is occupied and guest is dining; leave with helper to avoid disruption
          item.status = SpilloverItemStatus.SETTLED_BY_PEER;
          retainedByPeerNumbers.push(item.tableNumber);
        }
      }

      activeLog.spilloverTier = SpilloverTier.RECLAIMED_ON_ARRIVAL;
      activeLog.staffArrivedAt = new Date();
      activeLog.resolvedAt = new Date();
      await activeLog.save();

      res.status(200).json({
        success: true,
        message: `${staffName || 'Staff'} clocked in. Reclaimed ${reclaimedNumbers.length} tables, ${retainedByPeerNumbers.length} retained by peer until meal end.`,
        reclaimedTables: reclaimedNumbers,
        retainedByPeerTables: retainedByPeerNumbers,
        log: activeLog,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
