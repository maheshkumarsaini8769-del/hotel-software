import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { ServiceRequest, ServiceRequestStatus } from '../models/ServiceRequest';
import { TableSession } from '../models/TableSession';
import { SmartRoutingService } from '../services/SmartRoutingService';
import { TenantRequest } from '../types';
import { io } from '../index';

// 1. Customer Triggers Service Request (Water, Call Waiter, Cutlery)
export const createServiceRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { hotelId, tableId, tableSessionId, requestType, priority, notes } = req.body;

    if (!hotelId || !requestType) {
      res.status(400).json({ success: false, errorCode: 'INVALID_REQUEST', message: 'Missing hotelId or requestType' });
      return;
    }

    if (tableSessionId) {
      const session = await TableSession.findOne({
        _id: new Types.ObjectId(tableSessionId),
        hotelId: new Types.ObjectId(hotelId),
      });
      if (!session) {
        res.status(404).json({ success: false, errorCode: 'INVALID_SESSION', message: 'Table session not found for this hotel' });
        return;
      }
    }

    // Create raw request
    const request = new ServiceRequest({
      hotelId: new Types.ObjectId(hotelId),
      sourceType: 'TABLE_SESSION',
      tableId: tableId ? new Types.ObjectId(tableId) : undefined,
      tableSessionId: tableSessionId ? new Types.ObjectId(tableSessionId) : undefined,
      requestType,
      priority: priority || 'NORMAL',
      notes,
    });

    // Run Smart 4-Tier Routing Engine
    const routedRequest = await SmartRoutingService.routeRequest(request);

    res.status(201).json({
      success: true,
      message: 'Service request created and routed to eligible staff',
      data: routedRequest,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Waiter Accepts Request
export const acceptServiceRequest = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { requestId } = req.params;
    const waiterId = req.user?.userId;
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const filter: any = { _id: new Types.ObjectId(String(requestId)) };
    if (hotelId) filter.hotelId = hotelId;

    const request = await ServiceRequest.findOne(filter);
    if (!request) {
      res.status(404).json({ success: false, errorCode: 'REQUEST_NOT_FOUND' });
      return;
    }

    request.status = ServiceRequestStatus.ACCEPTED;
    request.acceptedAt = new Date();
    if (waiterId) {
      request.assignedUserId = new Types.ObjectId(waiterId);
    }
    await request.save();

    const payload = {
      requestId: request._id.toString(),
      status: request.status,
      assignedUserId: request.assignedUserId?.toString(),
      message: 'Waiter is arriving at your table',
    };

    // Notify customer on phone
    if (request.tableSessionId) {
      io.to(`session_${request.tableSessionId}`).emit('request:status_updated', payload);
    }

    // Broadcast to waiter channel and global channel
    if (waiterId) {
      io.to(`waiter_${waiterId}`).emit('request:status_updated', payload);
    }
    io.to(`${request.hotelId}_global`).emit('request:status_updated', payload);

    res.status(200).json({ success: true, message: 'Request accepted', data: request });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Waiter Completes Request
export const completeServiceRequest = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { requestId } = req.params;
    const waiterId = req.user?.userId;
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const filter: any = { _id: new Types.ObjectId(String(requestId)) };
    if (hotelId) filter.hotelId = hotelId;

    const request = await ServiceRequest.findOne(filter);
    if (!request) {
      res.status(404).json({ success: false, errorCode: 'REQUEST_NOT_FOUND' });
      return;
    }

    request.status = ServiceRequestStatus.COMPLETED;
    request.completedAt = new Date();
    await request.save();

    const payload = {
      requestId: request._id.toString(),
      status: request.status,
      assignedUserId: request.assignedUserId?.toString(),
      message: 'Request fulfilled',
    };

    if (request.tableSessionId) {
      io.to(`session_${request.tableSessionId}`).emit('request:status_updated', payload);
    }

    if (waiterId) {
      io.to(`waiter_${waiterId}`).emit('request:status_updated', payload);
    }
    io.to(`${request.hotelId}_global`).emit('request:status_updated', payload);

    res.status(200).json({ success: true, message: 'Request marked as completed', data: request });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Get Requests for Waiter (Assigned to Waiter or Active Open in Hotel)
export const getWaiterRequests = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId;
    const waiterId = req.user?.userId;
    const { status } = req.query;

    const query: any = { hotelId };
    if (status) {
      query.status = status;
    } else {
      query.status = { $in: [ServiceRequestStatus.CREATED, ServiceRequestStatus.ASSIGNED, ServiceRequestStatus.ACCEPTED, ServiceRequestStatus.IN_PROGRESS] };
    }

    if (waiterId) {
      query.$or = [
        { assignedUserId: new Types.ObjectId(waiterId) },
        { assignedUserId: { $exists: false } },
        { assignedUserId: null },
      ];
    }

    const requests = await ServiceRequest.find(query).sort({ createdAt: -1 }).populate('tableId', 'tableNumber section');

    const formatted = requests.map((r: any) => ({
      id: r._id.toString(),
      requestType: r.requestType,
      status: r.status,
      priority: r.priority,
      tableId: r.tableId?._id?.toString() || r.tableId?.toString(),
      tableNumber: r.tableId?.tableNumber,
      section: r.tableId?.section,
      assignedUserId: r.assignedUserId?.toString(),
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
    }));

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Update Waiter Shift Status (ON_DUTY, BUSY, OFFLINE)
export const updateWaiterShiftStatus = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId;
    const userId = req.user?.userId;
    const { shiftStatus } = req.body;

    const user = await import('../models/User').then(m => m.User.findOne({ _id: userId, hotelId }));
    if (!user) {
      res.status(404).json({ success: false, errorCode: 'USER_NOT_FOUND', message: 'User not found' });
      return;
    }

    user.shiftStatus = shiftStatus;
    await user.save();

    if (hotelId) {
      io.to(`${hotelId}_global`).emit('staff:shift_updated', {
        userId: user._id.toString(),
        shiftStatus: user.shiftStatus,
      });
    }

    res.status(200).json({
      success: true,
      message: `Shift status updated to ${shiftStatus}`,
      data: {
        userId: user._id.toString(),
        shiftStatus: user.shiftStatus,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

