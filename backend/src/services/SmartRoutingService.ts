import { Types } from 'mongoose';
import { User } from '../models/User';
import { DiningTable } from '../models/DiningTable';
import { ServiceRequest, ServiceRequestStatus, RoutingLevel, IServiceRequest } from '../models/ServiceRequest';
import { UserRole, ShiftStatus } from '../types';
import { io } from '../index';

export class SmartRoutingService {
  /**
   * 4-Tier Automated Waiter Routing Engine (Blueprint Section 2.5.1)
   */
  public static async routeRequest(request: IServiceRequest): Promise<IServiceRequest> {
    const hotelId = request.hotelId;

    // --- TIER 1: Check Assigned Table Waiter ---
    if (request.tableId) {
      const table = await DiningTable.findById(request.tableId);
      if (table && table.assignedWaiterId) {
        const assignedWaiter = await User.findOne({
          _id: table.assignedWaiterId,
          hotelId,
          role: UserRole.WAITER,
          shiftStatus: ShiftStatus.ON_DUTY,
          isActive: true,
        });

        if (assignedWaiter) {
          request.assignedUserId = assignedWaiter._id as Types.ObjectId;
          request.routingLevel = RoutingLevel.ASSIGNED_STAFF;
          request.status = ServiceRequestStatus.ASSIGNED;
          await request.save();

          // Emit real-time event directly to assigned waiter's private channel
          io.to(`waiter_${assignedWaiter._id}`).emit('request:new', {
            requestId: request._id,
            requestType: request.requestType,
            priority: request.priority,
            tableId: request.tableId,
            routingLevel: request.routingLevel,
            slaMinutes: request.slaMinutes,
          });

          return request;
        }
      }
    }

    // --- TIER 2: Check Eligible On-Duty Waiters in the Same Section ---
    if (request.tableId) {
      const table = await DiningTable.findById(request.tableId);
      if (table && table.section) {
        // Find tables in the same section that have assigned on-duty waiters
        const sameSectionTables = await DiningTable.find({
          hotelId,
          section: table.section,
          assignedWaiterId: { $ne: null },
        });

        const sameSectionWaiterIds = sameSectionTables.map((t) => t.assignedWaiterId);

        const sectionWaiter = await User.findOne({
          _id: { $in: sameSectionWaiterIds },
          hotelId,
          role: UserRole.WAITER,
          shiftStatus: ShiftStatus.ON_DUTY,
          isActive: true,
        });

        if (sectionWaiter) {
          request.assignedUserId = sectionWaiter._id as Types.ObjectId;
          request.routingLevel = RoutingLevel.SECTION_FALLBACK;
          request.status = ServiceRequestStatus.ASSIGNED;
          await request.save();

          io.to(`waiter_${sectionWaiter._id}`).emit('request:new', {
            requestId: request._id,
            requestType: request.requestType,
            priority: request.priority,
            tableId: request.tableId,
            routingLevel: request.routingLevel,
            slaMinutes: request.slaMinutes,
          });

          return request;
        }
      }
    }

    // --- TIER 3: Check Any Free Global On-Duty Waiter in Entire Hotel ---
    const globalWaiter = await User.findOne({
      hotelId,
      role: UserRole.WAITER,
      shiftStatus: ShiftStatus.ON_DUTY,
      isActive: true,
    });

    if (globalWaiter) {
      request.assignedUserId = globalWaiter._id as Types.ObjectId;
      request.routingLevel = RoutingLevel.GLOBAL_FALLBACK;
      request.status = ServiceRequestStatus.ASSIGNED;
      await request.save();

      io.to(`waiter_${globalWaiter._id}`).emit('request:new', {
        requestId: request._id,
        requestType: request.requestType,
        priority: request.priority,
        tableId: request.tableId,
        routingLevel: request.routingLevel,
        slaMinutes: request.slaMinutes,
      });

      return request;
    }

    // --- TIER 4: Fallback Escalation to Hotel Admin Incident Center ---
    request.routingLevel = RoutingLevel.ADMIN_ESCALATION;
    request.status = ServiceRequestStatus.ESCALATED_FALLBACK;
    request.escalatedAt = new Date();
    await request.save();

    // Sound RED ALARM in Admin Attention/Incident Center
    io.to(`${hotelId}_admin`).emit('request:escalated', {
      requestId: request._id,
      requestType: request.requestType,
      priority: 'URGENT',
      tableId: request.tableId,
      message: 'NO WAITER AVAILABLE - IMMEDIATE SUPERVISOR ATTENTION REQUIRED',
      routingLevel: request.routingLevel,
    });

    return request;
  }
}
