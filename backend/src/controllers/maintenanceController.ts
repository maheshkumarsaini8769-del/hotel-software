import { Response } from 'express';
import { Types } from 'mongoose';
import { HotelAsset, AssetStatus, AssetCategory } from '../models/HotelAsset';
import { MaintenanceRequest, MaintenanceStatus, MaintenancePriority } from '../models/MaintenanceRequest';
import { Room, RoomStatus } from '../models/Room';
import { HousekeepingTask, HousekeepingTaskType, HousekeepingTaskStatus } from '../models/HousekeepingTask';
import { TenantRequest } from '../types';
import { io } from '../index';

const SLA_HOURS_MAP: Record<MaintenancePriority, number> = {
  [MaintenancePriority.EMERGENCY]: 2,
  [MaintenancePriority.HIGH]: 6,
  [MaintenancePriority.MEDIUM]: 24,
  [MaintenancePriority.LOW]: 72,
};

// 1. Asset Management: Create & List
export const createAsset = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { assetCode, name, category, roomId, locationArea, serialNumber, purchaseDate, warrantyExpiry } = req.body;
    if (!assetCode || !name || !category || !locationArea) {
      res.status(400).json({ success: false, errorCode: 'MISSING_FIELDS', message: 'Asset code, name, category, and location are required' });
      return;
    }

    const asset = new HotelAsset({
      hotelId,
      assetCode,
      name,
      category,
      roomId: roomId ? new Types.ObjectId(roomId) : undefined,
      locationArea,
      serialNumber,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
      warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : undefined,
      status: AssetStatus.OPERATIONAL,
    });

    await asset.save();
    res.status(201).json({ success: true, asset });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({ success: false, errorCode: 'DUPLICATE_ASSET_CODE', message: 'Asset code already exists for this hotel' });
      return;
    }
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

export const getAssets = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const { category, status, roomId } = req.query;

    const filter: any = { hotelId };
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (roomId) filter.roomId = new Types.ObjectId(roomId as string);

    const assets = await HotelAsset.find(filter).populate('roomId', 'roomNumber');
    res.status(200).json({ success: true, count: assets.length, assets });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 2. Create Maintenance Ticket
export const createMaintenanceTicket = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const {
      title,
      description,
      category = 'GENERAL',
      priority = MaintenancePriority.MEDIUM,
      assetId,
      roomId,
      blocksRoom = false,
      assignedTechnicianId,
    } = req.body;

    if (!title || !description) {
      res.status(400).json({ success: false, errorCode: 'MISSING_FIELDS', message: 'Title and description required' });
      return;
    }

    const ticketNumber = `MNT-${Date.now().toString().slice(-6)}`;
    const reportedByUserId = req.user?.userId ? new Types.ObjectId(req.user.userId) : new Types.ObjectId();

    const slaHours = SLA_HOURS_MAP[priority as MaintenancePriority] || 24;
    const slaDeadline = new Date(Date.now() + slaHours * 3600 * 1000);

    const ticket = new MaintenanceRequest({
      hotelId,
      ticketNumber,
      title,
      description,
      category,
      priority,
      assetId: assetId ? new Types.ObjectId(assetId) : undefined,
      roomId: roomId ? new Types.ObjectId(roomId) : undefined,
      blocksRoom,
      reportedByUserId,
      assignedTechnicianId: assignedTechnicianId ? new Types.ObjectId(assignedTechnicianId) : undefined,
      status: assignedTechnicianId ? MaintenanceStatus.ASSIGNED : MaintenanceStatus.REPORTED,
      slaHours,
      slaDeadline,
      partsUsed: [],
      totalCost: 0,
    });

    await ticket.save();

    // If ticket blocks room, set Room status to OUT_OF_SERVICE immediately
    if (blocksRoom && roomId) {
      await Room.findOneAndUpdate(
        { _id: new Types.ObjectId(roomId), hotelId },
        { status: RoomStatus.OUT_OF_SERVICE }
      );
    }

    // If asset linked, set asset to NEEDS_REPAIR
    if (assetId) {
      await HotelAsset.findOneAndUpdate(
        { _id: new Types.ObjectId(assetId), hotelId },
        { status: AssetStatus.NEEDS_REPAIR }
      );
    }

    io.to(`${hotelId.toString()}_maintenance`).emit('maintenance:ticket_created', {
      ticketId: ticket._id,
      ticketNumber,
      priority,
      blocksRoom,
    });

    res.status(201).json({ success: true, ticket });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 3. Assign Technician
export const assignTechnician = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const ticketId = String(req.params.ticketId);
    const { technicianId } = req.body;

    const ticket = await MaintenanceRequest.findOne({ _id: new Types.ObjectId(ticketId), hotelId });
    if (!ticket) {
      res.status(404).json({ success: false, errorCode: 'TICKET_NOT_FOUND', message: 'Ticket not found' });
      return;
    }

    ticket.assignedTechnicianId = new Types.ObjectId(technicianId);
    ticket.status = MaintenanceStatus.ASSIGNED;
    await ticket.save();

    io.to(`technician_${technicianId}`).emit('maintenance:ticket_assigned', {
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
      priority: ticket.priority,
    });

    res.status(200).json({ success: true, ticket });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 4. Update Progress & Log Parts/Costs
export const updateTicketProgress = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const ticketId = String(req.params.ticketId);
    const { status, partsUsed } = req.body;

    const ticket = await MaintenanceRequest.findOne({ _id: new Types.ObjectId(ticketId), hotelId });
    if (!ticket) {
      res.status(404).json({ success: false, errorCode: 'TICKET_NOT_FOUND', message: 'Ticket not found' });
      return;
    }

    if (status && Object.values(MaintenanceStatus).includes(status)) {
      ticket.status = status;
    }

    if (partsUsed && Array.isArray(partsUsed)) {
      ticket.partsUsed = partsUsed;
      ticket.totalCost = partsUsed.reduce((sum, p) => sum + (Number(p.cost) * Number(p.quantity)), 0);
    }

    await ticket.save();
    res.status(200).json({ success: true, ticket });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 5. Resolve Ticket & Release Room
export const resolveMaintenanceTicket = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const ticketId = String(req.params.ticketId);
    const { resolutionNotes, partsUsed, finalCost } = req.body;

    const ticket = await MaintenanceRequest.findOne({ _id: new Types.ObjectId(ticketId), hotelId });
    if (!ticket) {
      res.status(404).json({ success: false, errorCode: 'TICKET_NOT_FOUND', message: 'Ticket not found' });
      return;
    }

    ticket.status = MaintenanceStatus.RESOLVED;
    ticket.resolvedAt = new Date();
    ticket.resolutionNotes = resolutionNotes || 'Repairs completed';

    if (partsUsed && Array.isArray(partsUsed)) {
      ticket.partsUsed = partsUsed;
      ticket.totalCost = partsUsed.reduce((sum, p) => sum + (Number(p.cost) * Number(p.quantity)), 0);
    } else if (finalCost !== undefined) {
      ticket.totalCost = Number(finalCost);
    }

    await ticket.save();

    // If asset was linked, restore to OPERATIONAL
    if (ticket.assetId) {
      await HotelAsset.findByIdAndUpdate(ticket.assetId, {
        status: AssetStatus.OPERATIONAL,
        lastMaintainedAt: new Date(),
      });
    }

    // If ticket blocked room, transition room out of OUT_OF_SERVICE to DIRTY for Housekeeping inspection
    if (ticket.blocksRoom && ticket.roomId) {
      const room = await Room.findById(ticket.roomId);
      if (room && room.status === RoomStatus.OUT_OF_SERVICE) {
        room.status = RoomStatus.DIRTY;
        await room.save();

        // Trigger automatic Housekeeping inspection task
        const hkTask = new HousekeepingTask({
          hotelId,
          roomId: room._id,
          taskType: HousekeepingTaskType.INSPECTION_ONLY,
          priority: 'HIGH',
          status: HousekeepingTaskStatus.PENDING,
          checklist: [
            { taskName: 'Inspect repaired area and test functionality', isDone: false },
            { taskName: 'Clean maintenance residue and dust', isDone: false },
            { taskName: 'Verify room is sanitized for guests', isDone: false },
          ],
        });
        await hkTask.save();

        io.to(`${hotelId?.toString()}_housekeeping`).emit('housekeeping:task_created', {
          taskId: hkTask._id,
          roomNumber: room.roomNumber,
          taskType: HousekeepingTaskType.INSPECTION_ONLY,
          priority: 'HIGH',
        });
      }
    }

    io.to(`${hotelId?.toString()}_maintenance`).emit('maintenance:ticket_resolved', {
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
      totalCost: ticket.totalCost,
    });

    res.status(200).json({ success: true, ticket });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 6. Maintenance Dashboard & SLA Analysis
export const getMaintenanceDashboard = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const now = new Date();

    const tickets = await MaintenanceRequest.find({ hotelId })
      .populate('roomId', 'roomNumber')
      .populate('assetId', 'name assetCode')
      .sort({ createdAt: -1 });

    const openTickets = tickets.filter((t) => [MaintenanceStatus.REPORTED, MaintenanceStatus.ASSIGNED, MaintenanceStatus.IN_PROGRESS].includes(t.status));
    const overdueTickets = openTickets.filter((t) => t.slaDeadline < now);
    const resolvedTickets = tickets.filter((t) => t.status === MaintenanceStatus.RESOLVED || t.status === MaintenanceStatus.CLOSED);

    const totalRepairExpenses = tickets.reduce((sum, t) => sum + (t.totalCost || 0), 0);
    const outOfOrderRoomsCount = await Room.countDocuments({ hotelId, status: RoomStatus.OUT_OF_SERVICE });

    res.status(200).json({
      success: true,
      summary: {
        totalTickets: tickets.length,
        openTicketsCount: openTickets.length,
        overdueCount: overdueTickets.length,
        resolvedCount: resolvedTickets.length,
        totalRepairExpenses,
        outOfOrderRoomsCount,
      },
      openTickets,
      overdueTickets,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};
