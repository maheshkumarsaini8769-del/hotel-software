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

          // Look up table display
          const tableDoc = request.tableId ? await DiningTable.findById(request.tableId) : null;
          const tableDisplay = tableDoc ? tableDoc.tableNumber : 'Table 4';

          const socketPayload = {
            id: request._id.toString(),
            requestId: request._id.toString(),
            requestType: request.requestType,
            type: request.requestType,
            priority: request.priority,
            tableId: request.tableId,
            table: tableDisplay,
            tableNumber: tableDisplay,
            routingLevel: request.routingLevel,
            slaMinutes: request.slaMinutes,
            status: request.status,
            createdAt: request.createdAt || new Date().toISOString(),
          };

          // Emit real-time event directly to assigned waiter's private channel AND hotel waiters room
          io.to(`waiter_${assignedWaiter._id}`).to(`${hotelId}_waiters`).to(`${hotelId}_global`).emit('request:new', socketPayload);
          io.to(`waiter_${assignedWaiter._id}`).to(`${hotelId}_waiters`).to(`${hotelId}_global`).emit('service:request', socketPayload);

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

          const tableDisplay = table ? table.tableNumber : 'Table 4';
          const socketPayload = {
            id: request._id.toString(),
            requestId: request._id.toString(),
            requestType: request.requestType,
            type: request.requestType,
            priority: request.priority,
            tableId: request.tableId,
            table: tableDisplay,
            tableNumber: tableDisplay,
            routingLevel: request.routingLevel,
            slaMinutes: request.slaMinutes,
            status: request.status,
            createdAt: request.createdAt || new Date().toISOString(),
          };

          io.to(`waiter_${sectionWaiter._id}`).to(`${hotelId}_waiters`).to(`${hotelId}_global`).emit('request:new', socketPayload);
          io.to(`waiter_${sectionWaiter._id}`).to(`${hotelId}_waiters`).to(`${hotelId}_global`).emit('service:request', socketPayload);

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

      const tableDoc = request.tableId ? await DiningTable.findById(request.tableId) : null;
      const tableDisplay = tableDoc ? tableDoc.tableNumber : 'Table 4';
      const socketPayload = {
        id: request._id.toString(),
        requestId: request._id.toString(),
        requestType: request.requestType,
        type: request.requestType,
        priority: request.priority,
        tableId: request.tableId,
        table: tableDisplay,
        tableNumber: tableDisplay,
        routingLevel: request.routingLevel,
        slaMinutes: request.slaMinutes,
        status: request.status,
        createdAt: request.createdAt || new Date().toISOString(),
      };

      io.to(`waiter_${globalWaiter._id}`).to(`${hotelId}_waiters`).to(`${hotelId}_global`).emit('request:new', socketPayload);
      io.to(`waiter_${globalWaiter._id}`).to(`${hotelId}_waiters`).to(`${hotelId}_global`).emit('service:request', socketPayload);

      return request;
    }

    // --- TIER 4: Fallback Escalation to Hotel Admin Incident Center ---
    request.routingLevel = RoutingLevel.ADMIN_ESCALATION;
    request.status = ServiceRequestStatus.ESCALATED_FALLBACK;
    request.escalatedAt = new Date();
    await request.save();

    const tableDoc = request.tableId ? await DiningTable.findById(request.tableId) : null;
    const tableDisplay = tableDoc ? tableDoc.tableNumber : 'Table 4';
    const socketPayload = {
      id: request._id.toString(),
      requestId: request._id.toString(),
      requestType: request.requestType,
      type: request.requestType,
      priority: 'URGENT',
      tableId: request.tableId,
      table: tableDisplay,
      tableNumber: tableDisplay,
      message: 'NO WAITER AVAILABLE - IMMEDIATE SUPERVISOR ATTENTION REQUIRED',
      routingLevel: request.routingLevel,
      status: request.status,
      createdAt: request.createdAt || new Date().toISOString(),
    };

    // Sound RED ALARM in Admin Attention/Incident Center & Waiters Room
    io.to(`${hotelId}_admin`).to(`${hotelId}_waiters`).to(`${hotelId}_global`).emit('request:escalated', socketPayload);
    io.to(`${hotelId}_waiters`).to(`${hotelId}_global`).emit('service:request', socketPayload);

    return request;
  }
}
