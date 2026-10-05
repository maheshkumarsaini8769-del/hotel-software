import { Response } from 'express';
import { Types } from 'mongoose';
import { HousekeepingTask, HousekeepingTaskStatus, HousekeepingTaskType } from '../models/HousekeepingTask';
import { Room, RoomStatus } from '../models/Room';
import { LinenInventory, LinenItemType } from '../models/LinenInventory';
import { LostAndFound, LostAndFoundStatus, LostAndFoundCategory } from '../models/LostAndFound';
import { Stay, StayStatus } from '../models/Stay';
import { MasterFolio } from '../models/MasterFolio';
import { FolioLineItem, DepartmentType } from '../models/FolioLineItem';
import { MaintenanceRequest, MaintenanceStatus, MaintenancePriority } from '../models/MaintenanceRequest';
import { TenantRequest } from '../types';
import { io } from '../index';

const DEFAULT_CHECKLISTS: Record<HousekeepingTaskType, string[]> = {
  [HousekeepingTaskType.CHECKOUT_CLEAN]: [
    'Strip bedding and replace linens',
    'Disinfect bathroom and replenish towels',
    'Dust surfaces and vacuum carpet',
    'Restock guest amenities and mini bar',
    'Sanitize high-touch surfaces',
  ],
  [HousekeepingTaskType.STAYOVER_CLEAN]: [
    'Make bed with fresh sheets',
    'Empty trash bins and replace liners',
    'Replenish used toiletries and towels',
    'Tidy bedroom and wipe table surfaces',
  ],
  [HousekeepingTaskType.DEEP_CLEAN]: [
    'Deep clean mattress and upholstery',
    'Descaling bathroom tiles and shower heads',
    'Chemical wash AC filters and vents',
    'Shampoo carpets and wash curtains',
  ],
  [HousekeepingTaskType.INSPECTION_ONLY]: [
    'Verify cleanliness of bedding and bathroom',
    'Check electrical appliances and lights',
    'Ensure all amenities are restocked',
  ],
};

// 1. Create Housekeeping Task
export const createHousekeepingTask = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { roomId, taskType = HousekeepingTaskType.CHECKOUT_CLEAN, priority = 'NORMAL', assignedAttendantId } = req.body;
    if (!roomId) {
      res.status(400).json({ success: false, errorCode: 'MISSING_ROOM', message: 'Room ID is required' });
      return;
    }

    const room = await Room.findOne({ _id: new Types.ObjectId(roomId), hotelId });
    if (!room) {
      res.status(404).json({ success: false, errorCode: 'ROOM_NOT_FOUND', message: 'Room not found' });
      return;
    }

    const checklistTemplate = DEFAULT_CHECKLISTS[taskType as HousekeepingTaskType] || DEFAULT_CHECKLISTS[HousekeepingTaskType.CHECKOUT_CLEAN];
    const checklist = checklistTemplate.map((taskName) => ({ taskName, isDone: false }));

    const task = new HousekeepingTask({
      hotelId,
      roomId: room._id,
      taskType,
      priority,
      assignedAttendantId: assignedAttendantId ? new Types.ObjectId(assignedAttendantId) : undefined,
      status: HousekeepingTaskStatus.PENDING,
      checklist,
    });
    await task.save();

    // Mark room as DIRTY if not already in maintenance or dirty
    if (room.status !== RoomStatus.OUT_OF_SERVICE) {
      room.status = RoomStatus.DIRTY;
      await room.save();
    }

    io.to(`${hotelId.toString()}_housekeeping`).emit('housekeeping:task_created', {
      taskId: task._id,
      roomNumber: room.roomNumber,
      taskType,
      priority,
    });

    if (assignedAttendantId) {
      io.to(`attendant_${assignedAttendantId}`).emit('housekeeping:task_assigned', {
        taskId: task._id,
        roomNumber: room.roomNumber,
        priority,
      });
    }

    res.status(201).json({ success: true, task });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 2. Assign Task to Attendant
export const assignHousekeepingTask = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const taskId = String(req.params.taskId);
    const { attendantId } = req.body;

    const task = await HousekeepingTask.findOne({ _id: new Types.ObjectId(taskId), hotelId });
    if (!task) {
      res.status(404).json({ success: false, errorCode: 'TASK_NOT_FOUND', message: 'Housekeeping task not found' });
      return;
    }

    task.assignedAttendantId = new Types.ObjectId(attendantId);
    await task.save();

    const room = await Room.findById(task.roomId);

    io.to(`attendant_${attendantId}`).emit('housekeeping:task_assigned', {
      taskId: task._id,
      roomNumber: room?.roomNumber,
      priority: task.priority,
    });

    res.status(200).json({ success: true, task });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 3. Start Cleaning
export const startCleaning = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const taskId = String(req.params.taskId);

    const task = await HousekeepingTask.findOne({ _id: new Types.ObjectId(taskId), hotelId });
    if (!task) {
      res.status(404).json({ success: false, errorCode: 'TASK_NOT_FOUND', message: 'Housekeeping task not found' });
      return;
    }

    task.status = HousekeepingTaskStatus.IN_PROGRESS;
    task.startedAt = new Date();
    await task.save();

    const room = await Room.findById(task.roomId);
    if (room && room.status !== RoomStatus.OUT_OF_SERVICE) {
      room.status = RoomStatus.CLEANING;
      await room.save();
    }

    io.to(`${hotelId?.toString()}_housekeeping`).emit('room:status_changed', {
      roomId: room?._id,
      roomNumber: room?.roomNumber,
      status: RoomStatus.CLEANING,
    });

    res.status(200).json({ success: true, task, roomStatus: room?.status });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 4. Complete Cleaning (Moves to INSPECTION + Audit Minibar & Linen)
export const completeCleaning = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const taskId = String(req.params.taskId);
    const { completedChecklist, minibarItems, linenAction, notes } = req.body;

    const task = await HousekeepingTask.findOne({ _id: new Types.ObjectId(taskId), hotelId });
    if (!task) {
      res.status(404).json({ success: false, errorCode: 'TASK_NOT_FOUND', message: 'Housekeeping task not found' });
      return;
    }

    if (completedChecklist && Array.isArray(completedChecklist)) {
      task.checklist = completedChecklist;
    } else {
      // Mark all checklist items true
      task.checklist.forEach((item) => (item.isDone = true));
    }

    task.status = HousekeepingTaskStatus.COMPLETED;
    task.completedAt = new Date();
    if (notes) {
      task.inspectionNotes = notes;
    }
    await task.save();

    const room = await Room.findById(task.roomId);
    if (room && room.status !== RoomStatus.OUT_OF_SERVICE) {
      room.status = RoomStatus.INSPECTION;
      await room.save();
    }

    // Minibar consumption audit: auto-debit to Master Folio if active stay
    let minibarTotal = 0;
    const billedMinibarItems: any[] = [];
    if (minibarItems && Array.isArray(minibarItems) && minibarItems.length > 0) {
      const activeStay = await Stay.findOne({ hotelId, roomId: task.roomId, stayStatus: StayStatus.ACTIVE });
      if (activeStay && activeStay.masterFolioId) {
        const masterFolio = await MasterFolio.findOne({ _id: activeStay.masterFolioId, hotelId });
        if (masterFolio && masterFolio.folioStatus === 'OPEN') {
          for (const item of minibarItems) {
            const qty = Number(item.quantity) || 0;
            const rate = Number(item.rate ?? item.price) || 0;
            if (qty > 0 && rate > 0) {
              const netAmount = qty * rate;
              const lineItem = new FolioLineItem({
                hotelId,
                folioId: masterFolio._id,
                department: DepartmentType.MINIBAR,
                description: `Minibar: ${item.name || 'Consumable'} (x${qty})`,
                rate,
                quantity: qty,
                taxRate: 0,
                taxAmount: 0,
                netAmount,
                postedAt: new Date(),
                postedByUserId: req.user?.userId ? new Types.ObjectId(req.user.userId) : undefined,
              });
              await lineItem.save();
              billedMinibarItems.push(lineItem);
              minibarTotal += netAmount;
            }
          }

          if (minibarTotal > 0) {
            masterFolio.totalPaidServices = (masterFolio.totalPaidServices || 0) + minibarTotal;
            masterFolio.netAmountPayable = (masterFolio.netAmountPayable || 0) + minibarTotal;
            masterFolio.dueAmount = (masterFolio.dueAmount || 0) + minibarTotal;
            await masterFolio.save();

            io.to(`${hotelId?.toString()}_pms`).emit('folio:updated', {
              folioId: masterFolio._id,
              addedAmount: minibarTotal,
              department: 'MINIBAR',
            });
          }
        }
      }
    }

    io.to(`${hotelId?.toString()}_housekeeping`).emit('housekeeping:inspection_ready', {
      taskId: task._id,
      roomNumber: room?.roomNumber,
      minibarTotal,
      linenAction: linenAction || 'FULL_WASH',
    });

    res.status(200).json({
      success: true,
      task,
      roomStatus: room?.status,
      minibarSummary: {
        totalCharged: minibarTotal,
        itemsCount: billedMinibarItems.length,
      },
      linenAction: linenAction || 'FULL_WASH',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 4b. Escalate Maintenance (Attendant reports room defect)
export const escalateMaintenance = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const taskId = String(req.params.taskId);
    const { category = 'GENERAL', title, description, priority = MaintenancePriority.HIGH, blocksRoom = true } = req.body;

    if (!title || !description) {
      res.status(400).json({ success: false, errorCode: 'MISSING_FIELDS', message: 'Title and description are required for maintenance escalation' });
      return;
    }

    const task = await HousekeepingTask.findOne({ _id: new Types.ObjectId(taskId), hotelId });
    if (!task) {
      res.status(404).json({ success: false, errorCode: 'TASK_NOT_FOUND', message: 'Housekeeping task not found' });
      return;
    }

    const room = await Room.findOne({ _id: task.roomId, hotelId });
    if (!room) {
      res.status(404).json({ success: false, errorCode: 'ROOM_NOT_FOUND', message: 'Room not found' });
      return;
    }

    const ticketNumber = `MNT-${Date.now().toString().slice(-6)}`;
    const reportedByUserId = req.user?.userId ? new Types.ObjectId(req.user.userId) : new Types.ObjectId();
    const slaDeadline = new Date(Date.now() + (priority === MaintenancePriority.EMERGENCY ? 2 : 12) * 3600 * 1000);

    const ticket = new MaintenanceRequest({
      hotelId,
      ticketNumber,
      title,
      description,
      category,
      priority,
      roomId: room._id,
      blocksRoom,
      reportedByUserId,
      status: MaintenanceStatus.REPORTED,
      slaHours: priority === MaintenancePriority.EMERGENCY ? 2 : 12,
      slaDeadline,
      partsUsed: [],
      totalCost: 0,
    });
    await ticket.save();

    if (blocksRoom) {
      room.status = RoomStatus.OUT_OF_SERVICE;
      await room.save();
    }

    task.status = HousekeepingTaskStatus.INSPECTED_FAILED;
    task.inspectionNotes = `Maintenance Escalated: ${ticketNumber} - ${title}`;
    await task.save();

    io.to(`${hotelId.toString()}_housekeeping`).emit('room:status_changed', {
      roomId: room._id,
      roomNumber: room.roomNumber,
      status: room.status,
    });

    io.to(`${hotelId.toString()}_maintenance`).emit('maintenance:ticket_created', {
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
      roomNumber: room.roomNumber,
      category,
      priority,
    });

    res.status(201).json({
      success: true,
      message: 'Maintenance ticket created and room marked Out of Service',
      maintenanceTicket: ticket,
      roomStatus: room.status,
      taskStatus: task.status,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 5. Supervisor Inspection (Pass or Fail)
export const inspectTask = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const taskId = String(req.params.taskId);
    const { isApproved, notes } = req.body;

    const task = await HousekeepingTask.findOne({ _id: new Types.ObjectId(taskId), hotelId });
    if (!task) {
      res.status(404).json({ success: false, errorCode: 'TASK_NOT_FOUND', message: 'Housekeeping task not found' });
      return;
    }

    const room = await Room.findById(task.roomId);
    if (!room) {
      res.status(404).json({ success: false, errorCode: 'ROOM_NOT_FOUND', message: 'Room not found' });
      return;
    }

    task.inspectedAt = new Date();
    task.inspectionNotes = notes;
    if (req.user?.userId) {
      task.inspectedByUserId = new Types.ObjectId(req.user.userId);
    }

    if (isApproved) {
      task.status = HousekeepingTaskStatus.INSPECTED_PASSED;
      room.status = room.currentStayId ? RoomStatus.OCCUPIED : RoomStatus.AVAILABLE;
    } else {
      task.status = HousekeepingTaskStatus.INSPECTED_FAILED;
      room.status = RoomStatus.DIRTY; // Revert to dirty for rework
    }

    await task.save();
    await room.save();

    io.to(`${hotelId?.toString()}_housekeeping`).emit('room:status_changed', {
      roomId: room._id,
      roomNumber: room.roomNumber,
      status: room.status,
      inspectionPassed: isApproved,
    });

    res.status(200).json({
      success: true,
      taskStatus: task.status,
      roomStatus: room.status,
      inspectionNotes: notes,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 6. Housekeeping Board / Matrix with SLA tracking & Guest occupancy
export const getHousekeepingBoard = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const floor = req.query.floor ? Number(req.query.floor) : undefined;

    const roomQuery: any = { hotelId };
    if (floor !== undefined && !isNaN(floor)) {
      roomQuery.floorNumber = floor;
    }

    const rooms = await Room.find(roomQuery).populate('roomTypeId', 'name code').sort({ floorNumber: 1, roomNumber: 1 });
    const activeTasks = await HousekeepingTask.find({
      hotelId,
      status: { $in: [HousekeepingTaskStatus.PENDING, HousekeepingTaskStatus.IN_PROGRESS, HousekeepingTaskStatus.COMPLETED] },
    }).populate('assignedAttendantId', 'name email');

    const activeStays = await Stay.find({
      hotelId,
      roomId: { $in: rooms.map((r) => r._id) },
      stayStatus: StayStatus.ACTIVE,
    }).populate('bookingId', 'guestName guestPhone');

    const taskMap = new Map();
    activeTasks.forEach((t) => taskMap.set(t.roomId.toString(), t));

    const stayMap = new Map();
    activeStays.forEach((s) => stayMap.set(s.roomId.toString(), s));

    const now = Date.now();
    let cleanCount = 0;
    let dirtyCount = 0;
    let cleaningCount = 0;
    let inspectionCount = 0;
    let outOfServiceCount = 0;
    let occupiedCount = 0;

    const board = rooms.map((room) => {
      const activeTask = taskMap.get(room._id.toString()) || null;
      const stay = stayMap.get(room._id.toString()) || null;

      if (room.status === RoomStatus.AVAILABLE) cleanCount++;
      else if (room.status === RoomStatus.DIRTY) dirtyCount++;
      else if (room.status === RoomStatus.CLEANING) cleaningCount++;
      else if (room.status === RoomStatus.INSPECTION) inspectionCount++;
      else if (room.status === RoomStatus.OUT_OF_SERVICE) outOfServiceCount++;
      else if (room.status === RoomStatus.OCCUPIED) occupiedCount++;

      let slaElapsedMinutes = 0;
      let targetSlaMinutes = 25;
      if (activeTask) {
        if (activeTask.taskType === HousekeepingTaskType.STAYOVER_CLEAN) targetSlaMinutes = 15;
        else if (activeTask.taskType === HousekeepingTaskType.DEEP_CLEAN) targetSlaMinutes = 45;
        const refTime = activeTask.startedAt || activeTask.createdAt || (room as any).updatedAt;
        slaElapsedMinutes = Math.max(0, Math.round((now - new Date(refTime).getTime()) / 60000));
      }

      return {
        roomId: room._id,
        roomNumber: room.roomNumber,
        floorNumber: room.floorNumber,
        roomType: room.roomTypeId,
        status: room.status,
        activeTask,
        guestInfo: stay
          ? {
              stayId: stay._id,
              guestName: (stay.bookingId as any)?.guestName || 'Registered Guest',
              expectedCheckOut: stay.expectedCheckOutTimestamp,
            }
          : null,
        sla: {
          targetMinutes: targetSlaMinutes,
          elapsedMinutes: slaElapsedMinutes,
          isBreached: (room.status === RoomStatus.DIRTY || room.status === RoomStatus.CLEANING) && slaElapsedMinutes > targetSlaMinutes,
        },
      };
    });

    res.status(200).json({
      success: true,
      count: board.length,
      board,
      summary: {
        total: rooms.length,
        clean: cleanCount,
        dirty: dirtyCount,
        cleaning: cleaningCount,
        inspection: inspectionCount,
        outOfService: outOfServiceCount,
        occupied: occupiedCount,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 7. Linen Inventory: Get stock & Record transactions
export const getLinenInventory = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const linens = await LinenInventory.find({ hotelId });
    res.status(200).json({ success: true, linens });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

export const updateLinenStock = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { itemType, action, quantity, notes } = req.body;
    const qty = Number(quantity);

    if (!itemType || !action || !qty || qty <= 0) {
      res.status(400).json({ success: false, errorCode: 'INVALID_PARAMS', message: 'Item type, valid action, and positive quantity required' });
      return;
    }

    let linen = await LinenInventory.findOne({ hotelId, itemType });
    if (!linen) {
      linen = new LinenInventory({
        hotelId,
        itemType,
        totalStock: 0,
        availableClean: 0,
        inRooms: 0,
        inLaundry: 0,
        damaged: 0,
        logs: [],
      });
    }

    const userId = req.user?.userId ? new Types.ObjectId(req.user.userId) : new Types.ObjectId();

    switch (action) {
      case 'RESTOCKED':
        linen.totalStock += qty;
        linen.availableClean += qty;
        break;
      case 'ISSUED_TO_ROOMS':
        if (linen.availableClean < qty) {
          res.status(400).json({ success: false, errorCode: 'INSUFFICIENT_CLEAN_STOCK', message: `Only ${linen.availableClean} clean items available` });
          return;
        }
        linen.availableClean -= qty;
        linen.inRooms += qty;
        break;
      case 'SENT_TO_LAUNDRY':
        if (linen.inRooms < qty) {
          res.status(400).json({ success: false, errorCode: 'INSUFFICIENT_ROOM_STOCK', message: `Only ${linen.inRooms} items in rooms to send` });
          return;
        }
        linen.inRooms -= qty;
        linen.inLaundry += qty;
        break;
      case 'RETURNED_FROM_LAUNDRY':
        if (linen.inLaundry < qty) {
          res.status(400).json({ success: false, errorCode: 'INSUFFICIENT_LAUNDRY_STOCK', message: `Only ${linen.inLaundry} items in laundry` });
          return;
        }
        linen.inLaundry -= qty;
        linen.availableClean += qty;
        break;
      case 'MARKED_DAMAGED':
        if (linen.availableClean < qty && linen.inLaundry < qty) {
          res.status(400).json({ success: false, errorCode: 'CANNOT_DAMAGE', message: 'Not enough clean or laundry stock to mark damaged' });
          return;
        }
        if (linen.availableClean >= qty) {
          linen.availableClean -= qty;
        } else {
          linen.inLaundry -= qty;
        }
        linen.damaged += qty;
        linen.totalStock -= qty;
        break;
      default:
        res.status(400).json({ success: false, errorCode: 'INVALID_ACTION', message: 'Unrecognized linen action' });
        return;
    }

    linen.logs.push({
      action,
      quantity: qty,
      performedByUserId: userId,
      notes,
      timestamp: new Date(),
    });

    await linen.save();

    res.status(200).json({ success: true, linen });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 8. Lost & Found Management & Digital Vault Pipeline
export const logLostItem = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const {
      description,
      category = LostAndFoundCategory.OTHER,
      foundLocation,
      guestName,
      roomId,
      stayId,
      storageLocation = 'Lost & Found Storage Room A',
      secureVaultLocker,
      estimatedValue = 0,
      isHighValue,
      retentionDays = 90,
      photoUrl,
    } = req.body;

    if (!description || !foundLocation) {
      res.status(400).json({ success: false, errorCode: 'MISSING_FIELDS', message: 'Description and found location are required' });
      return;
    }

    const trackingNumber = `LF-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const foundByUserId = req.user?.userId ? new Types.ObjectId(req.user.userId) : new Types.ObjectId();
    const performerName = req.user?.name || req.user?.email || 'Duty Housekeeper';

    const isHighValueItem =
      Boolean(isHighValue) ||
      Number(estimatedValue) >= 5000 ||
      category === LostAndFoundCategory.JEWELRY ||
      category === LostAndFoundCategory.ELECTRONICS;

    const assignedLocker = secureVaultLocker || (isHighValueItem ? 'VAULT-LOCKER-A1' : undefined);
    const resolvedStorageLocation = assignedLocker ? `Secure Vault Locker: ${assignedLocker}` : storageLocation;

    const retentionExpiryDate = new Date();
    retentionExpiryDate.setDate(retentionExpiryDate.getDate() + Number(retentionDays));

    const item = new LostAndFound({
      hotelId,
      trackingNumber,
      description,
      category,
      foundLocation,
      foundByUserId,
      guestName,
      roomId: roomId ? new Types.ObjectId(roomId) : undefined,
      stayId: stayId ? new Types.ObjectId(stayId) : undefined,
      storageLocation: resolvedStorageLocation,
      secureVaultLocker: assignedLocker,
      estimatedValue: Number(estimatedValue) || 0,
      isHighValue: isHighValueItem,
      retentionExpiryDate,
      photoUrl,
      status: LostAndFoundStatus.LOGGED,
      custodyChain: [
        {
          action: isHighValueItem ? 'MOVED_TO_VAULT' : 'LOGGED',
          performedByUserId: foundByUserId,
          performedByName: performerName,
          fromLocation: foundLocation,
          toLocation: resolvedStorageLocation,
          timestamp: new Date(),
          notes: isHighValueItem
            ? `High-value asset (Est. ₹${estimatedValue || 5000}) secured in digital vault ${assignedLocker}`
            : 'Cataloged into digital lost & found inventory',
        },
      ],
    });

    await item.save();

    io.to(`${hotelId.toString()}_housekeeping`).emit('lostfound:logged', { item });

    res.status(201).json({ success: true, item });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

export const verifyAndApproveClaim = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const itemId = String(req.params.itemId);
    const {
      claimantName,
      claimantPhone,
      claimantEmail,
      idProofType = 'AADHAAR',
      idProofNumber,
      verificationNotes,
      serialNumberMatched = true,
      matchConfidenceScore = 100,
    } = req.body;

    if (!claimantName || !claimantPhone || !idProofNumber) {
      res.status(400).json({
        success: false,
        errorCode: 'MISSING_CLAIMANT_INFO',
        message: 'Claimant name, phone, and ID proof number are required',
      });
      return;
    }

    const item = await LostAndFound.findOne({ _id: new Types.ObjectId(itemId), hotelId });
    if (!item) {
      res.status(404).json({ success: false, errorCode: 'ITEM_NOT_FOUND', message: 'Lost and found item not found' });
      return;
    }

    if (
      item.status === LostAndFoundStatus.CLAIMED ||
      item.status === LostAndFoundStatus.CLAIMED_IN_PERSON ||
      item.status === LostAndFoundStatus.COURIER_DISPATCHED ||
      item.status === LostAndFoundStatus.DISPOSED
    ) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_STATUS_FOR_CLAIM',
        message: `Cannot verify claim for item currently in status ${item.status}`,
      });
      return;
    }

    const verifiedByUserId = req.user?.userId ? new Types.ObjectId(req.user.userId) : new Types.ObjectId();
    const performerName = req.user?.name || req.user?.email || 'Duty Manager';

    item.status = LostAndFoundStatus.VERIFIED_PENDING_DISPATCH;
    item.claimVerification = {
      claimantName,
      claimantPhone,
      claimantEmail,
      idProofType,
      idProofNumber,
      verificationNotes,
      verifiedByUserId,
      verifiedAt: new Date(),
      serialNumberMatched: Boolean(serialNumberMatched),
      matchConfidenceScore: Number(matchConfidenceScore) || 100,
    };

    item.custodyChain.push({
      action: 'VERIFIED',
      performedByUserId: verifiedByUserId,
      performedByName: performerName,
      fromLocation: item.secureVaultLocker || item.storageLocation,
      toLocation: 'Front Office / Dispatch Staging',
      timestamp: new Date(),
      notes: `Duty Manager verified ownership claim for ${claimantName} (ID: ${idProofType} ${idProofNumber}, Confidence: ${matchConfidenceScore}%)`,
    });

    await item.save();

    io.to(`${hotelId?.toString()}_housekeeping`).emit('lostfound:claim_verified', { item });

    res.status(200).json({ success: true, message: 'Claim verified successfully. Item ready for dispatch or handover.', item });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

export const dispatchCourier = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const itemId = String(req.params.itemId);
    const {
      courierPartner = 'BLUE_DART',
      waybillNumber,
      recipientName,
      recipientPhone,
      shippingAddress,
      shippingFeePaidBy = 'GUEST',
      shippingFeeAmount = 0,
      notes,
    } = req.body;

    if (!waybillNumber || !recipientName || !recipientPhone || !shippingAddress?.street || !shippingAddress?.city) {
      res.status(400).json({
        success: false,
        errorCode: 'MISSING_DISPATCH_DETAILS',
        message: 'Waybill number, recipient name, phone, and complete shipping address required',
      });
      return;
    }

    const item = await LostAndFound.findOne({ _id: new Types.ObjectId(itemId), hotelId });
    if (!item) {
      res.status(404).json({ success: false, errorCode: 'ITEM_NOT_FOUND', message: 'Lost and found item not found' });
      return;
    }

    if (
      item.status === LostAndFoundStatus.CLAIMED ||
      item.status === LostAndFoundStatus.CLAIMED_IN_PERSON ||
      item.status === LostAndFoundStatus.COURIER_DISPATCHED ||
      item.status === LostAndFoundStatus.DISPOSED
    ) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_STATUS_FOR_DISPATCH',
        message: `Cannot dispatch item with status ${item.status}`,
      });
      return;
    }

    const dispatchedByUserId = req.user?.userId ? new Types.ObjectId(req.user.userId) : new Types.ObjectId();
    const performerName = req.user?.name || req.user?.email || 'Concierge / Dispatch Desk';

    item.status = LostAndFoundStatus.COURIER_DISPATCHED;
    item.courierDispatch = {
      courierPartner,
      waybillNumber,
      recipientName,
      recipientPhone,
      shippingAddress: {
        street: shippingAddress.street,
        city: shippingAddress.city,
        state: shippingAddress.state || '',
        pincode: shippingAddress.pincode || '',
        country: shippingAddress.country || 'India',
      },
      shippingFeePaidBy,
      shippingFeeAmount: Number(shippingFeeAmount) || 0,
      dispatchedAt: new Date(),
      dispatchedByUserId,
      courierStatus: 'PICKED_UP',
      notes,
    };

    item.custodyChain.push({
      action: 'DISPATCH_PREPARED',
      performedByUserId: dispatchedByUserId,
      performedByName: performerName,
      fromLocation: item.secureVaultLocker || item.storageLocation,
      toLocation: `${courierPartner} Logistics (Waybill: ${waybillNumber})`,
      timestamp: new Date(),
      notes: `Courier package dispatched via ${courierPartner} to ${recipientName}, ${shippingAddress.city}. Waybill: ${waybillNumber}`,
    });

    await item.save();

    io.to(`${hotelId?.toString()}_housekeeping`).emit('lostfound:courier_dispatched', { item });

    res.status(200).json({
      success: true,
      message: `Item dispatched via ${courierPartner} with Waybill ${waybillNumber}`,
      item,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

export const handoverInPerson = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const itemId = String(req.params.itemId);
    const { claimantName, contactNumber, idProof, notes } = req.body;

    if (!claimantName || !contactNumber || !idProof) {
      res.status(400).json({
        success: false,
        errorCode: 'MISSING_CLAIMANT_INFO',
        message: 'Claimant name, contact number, and ID proof required',
      });
      return;
    }

    const item = await LostAndFound.findOne({ _id: new Types.ObjectId(itemId), hotelId });
    if (!item) {
      res.status(404).json({ success: false, errorCode: 'ITEM_NOT_FOUND', message: 'Lost and found item not found' });
      return;
    }

    if (
      item.status === LostAndFoundStatus.CLAIMED ||
      item.status === LostAndFoundStatus.CLAIMED_IN_PERSON ||
      item.status === LostAndFoundStatus.COURIER_DISPATCHED ||
      item.status === LostAndFoundStatus.DISPOSED
    ) {
      res.status(400).json({
        success: false,
        errorCode: 'ALREADY_CLAIMED',
        message: `Item has already been finalized in status ${item.status}`,
      });
      return;
    }

    const verifiedByUserId = req.user?.userId ? new Types.ObjectId(req.user.userId) : new Types.ObjectId();
    const performerName = req.user?.name || req.user?.email || 'Front Desk Agent';

    item.status = LostAndFoundStatus.CLAIMED_IN_PERSON;
    item.claimedBy = {
      claimantName,
      contactNumber,
      idProof,
      verifiedByUserId,
      claimedAt: new Date(),
      notes,
    };

    item.custodyChain.push({
      action: 'HANDOVER',
      performedByUserId: verifiedByUserId,
      performedByName: performerName,
      fromLocation: item.secureVaultLocker || item.storageLocation,
      toLocation: 'Guest Possession (In-Person Handover)',
      timestamp: new Date(),
      notes: `In-person handover at Front Desk to ${claimantName} (Contact: ${contactNumber}, ID: ${idProof})`,
    });

    await item.save();

    io.to(`${hotelId?.toString()}_housekeeping`).emit('lostfound:claimed', { item });

    res.status(200).json({ success: true, message: 'Item successfully handed over to claimant', item });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// Backwards-compatible claimLostItem
export const claimLostItem = handoverInPerson;

export const inquireLostItem = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const { category, keyword, foundLocation } = req.body;

    const filter: any = {
      hotelId,
      status: { $in: [LostAndFoundStatus.LOGGED, LostAndFoundStatus.INQUIRY_RECEIVED] },
    };

    if (category && category !== 'ALL') {
      filter.category = category;
    }

    if (keyword) {
      filter.$or = [
        { description: { $regex: keyword, $options: 'i' } },
        { trackingNumber: { $regex: keyword, $options: 'i' } },
        { foundLocation: { $regex: keyword, $options: 'i' } },
        { guestName: { $regex: keyword, $options: 'i' } },
      ];
    }

    if (foundLocation) {
      filter.foundLocation = { $regex: foundLocation, $options: 'i' };
    }

    const matchedItems = await LostAndFound.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: matchedItems.length,
      matchedItems,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

export const getLostAndFoundVault = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const { status, category, isHighValue, search, locker } = req.query;

    const filter: any = { hotelId };

    if (status && status !== 'ALL') {
      filter.status = status;
    }

    if (category && category !== 'ALL') {
      filter.category = category;
    }

    if (isHighValue !== undefined && isHighValue !== '') {
      filter.isHighValue = String(isHighValue) === 'true';
    }

    if (locker) {
      filter.secureVaultLocker = { $regex: String(locker), $options: 'i' };
    }

    if (search) {
      const searchRegex = { $regex: String(search), $options: 'i' };
      filter.$or = [
        { description: searchRegex },
        { trackingNumber: searchRegex },
        { foundLocation: searchRegex },
        { guestName: searchRegex },
        { secureVaultLocker: searchRegex },
        { 'courierDispatch.waybillNumber': searchRegex },
      ];
    }

    const items = await LostAndFound.find(filter).sort({ createdAt: -1 });

    // Aggregate vault metrics
    const allItems = await LostAndFound.find({ hotelId });
    const now = new Date();

    const metrics = {
      totalLogged: allItems.length,
      activeInVault: allItems.filter(
        (i) => i.status === LostAndFoundStatus.LOGGED || i.status === LostAndFoundStatus.INQUIRY_RECEIVED
      ).length,
      highValueSecured: allItems.filter((i) => i.isHighValue && i.status !== LostAndFoundStatus.DISPOSED).length,
      pendingDispatch: allItems.filter((i) => i.status === LostAndFoundStatus.VERIFIED_PENDING_DISPATCH).length,
      courierDispatched: allItems.filter((i) => i.status === LostAndFoundStatus.COURIER_DISPATCHED).length,
      claimedInPerson: allItems.filter(
        (i) => i.status === LostAndFoundStatus.CLAIMED_IN_PERSON || i.status === LostAndFoundStatus.CLAIMED
      ).length,
      disposed: allItems.filter((i) => i.status === LostAndFoundStatus.DISPOSED || i.status === LostAndFoundStatus.AUCTIONED).length,
      retentionDueCount: allItems.filter(
        (i) =>
          (i.status === LostAndFoundStatus.LOGGED || i.status === LostAndFoundStatus.INQUIRY_RECEIVED) &&
          new Date(i.retentionExpiryDate) <= now
      ).length,
    };

    res.status(200).json({
      success: true,
      count: items.length,
      metrics,
      items,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

export const disposeLostItem = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const itemId = String(req.params.itemId);
    const { action = 'DISPOSED', disposalNotes = 'Item retention period elapsed without claim' } = req.body;

    const item = await LostAndFound.findOne({ _id: new Types.ObjectId(itemId), hotelId });
    if (!item) {
      res.status(404).json({ success: false, errorCode: 'ITEM_NOT_FOUND', message: 'Lost and found item not found' });
      return;
    }

    const disposedByUserId = req.user?.userId ? new Types.ObjectId(req.user.userId) : new Types.ObjectId();
    const performerName = req.user?.name || req.user?.email || 'Executive Housekeeper';

    item.status = action === 'AUCTIONED' ? LostAndFoundStatus.AUCTIONED : LostAndFoundStatus.DISPOSED;
    item.disposedAt = new Date();
    item.disposalNotes = disposalNotes;

    item.custodyChain.push({
      action: 'DISPOSED',
      performedByUserId: disposedByUserId,
      performedByName: performerName,
      fromLocation: item.secureVaultLocker || item.storageLocation,
      toLocation: action === 'AUCTIONED' ? 'Staff Charity Auction' : 'Authorized Waste / E-Waste Disposal',
      timestamp: new Date(),
      notes: disposalNotes,
    });

    await item.save();

    io.to(`${hotelId?.toString()}_housekeeping`).emit('lostfound:disposed', { item });

    res.status(200).json({ success: true, message: `Item marked as ${item.status}`, item });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// Backwards-compatible getLostAndFound
export const getLostAndFound = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const { status, category } = req.query;

    const filter: any = { hotelId };
    if (status) filter.status = status;
    if (category) filter.category = category;

    const items = await LostAndFound.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: items.length, items });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};
