import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { FoodPickupSlaConfig } from '../models/FoodPickupSlaConfig';
import { FoodPickupTicket, PickupTicketStatus } from '../models/FoodPickupTicket';
import { DiningTable } from '../models/DiningTable';
import { RestaurantOrder } from '../models/RestaurantOrder';
import { TargetedPushAlert, AlertType, AlertRoutingType, AlertPriority } from '../models/TargetedPushAlert';

export class FoodPickupSlaController {
  /**
   * 1. Get or Update Pickup SLA Config (Slider: 2-10 mins)
   * GET & POST /api/v1/food-pickup-sla/config
   */
  static async getOrUpdateSlaConfig(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string || req.body.hotelId;
      if (!hotelId || !Types.ObjectId.isValid(hotelId)) {
        res.status(400).json({ success: false, message: 'Valid hotelId is required' });
        return;
      }

      let config = await FoodPickupSlaConfig.findOne({ hotelId: new Types.ObjectId(hotelId) });

      if (req.method === 'POST') {
        const { defaultPickupSlaMinutes, maxSnoozeSeconds, maxAllowedSnoozes, escalateToCaptainOnBreach } = req.body;

        if (defaultPickupSlaMinutes !== undefined) {
          const sla = Number(defaultPickupSlaMinutes);
          if (sla < 2 || sla > 10) {
            res.status(400).json({ success: false, message: 'defaultPickupSlaMinutes must be between 2 and 10 minutes' });
            return;
          }
        }

        if (!config) {
          config = new FoodPickupSlaConfig({
            hotelId: new Types.ObjectId(hotelId),
            defaultPickupSlaMinutes: defaultPickupSlaMinutes || 3,
            maxSnoozeSeconds: maxSnoozeSeconds || 60,
            maxAllowedSnoozes: maxAllowedSnoozes || 1,
            escalateToCaptainOnBreach: escalateToCaptainOnBreach !== false,
          });
        } else {
          if (defaultPickupSlaMinutes !== undefined) config.defaultPickupSlaMinutes = defaultPickupSlaMinutes;
          if (maxSnoozeSeconds !== undefined) config.maxSnoozeSeconds = maxSnoozeSeconds;
          if (maxAllowedSnoozes !== undefined) config.maxAllowedSnoozes = maxAllowedSnoozes;
          if (escalateToCaptainOnBreach !== undefined) config.escalateToCaptainOnBreach = escalateToCaptainOnBreach;
        }

        await config.save();
        res.status(200).json({ success: true, message: 'Pickup SLA configuration saved', config });
        return;
      }

      // GET request
      if (!config) {
        config = await FoodPickupSlaConfig.create({
          hotelId: new Types.ObjectId(hotelId),
          defaultPickupSlaMinutes: 3,
          maxSnoozeSeconds: 60,
          maxAllowedSnoozes: 1,
          escalateToCaptainOnBreach: true,
        });
      }

      res.status(200).json({ success: true, config });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * 2. Chef Marks Dish Ready -> Creates Pickup SLA Ticket
   * POST /api/v1/food-pickup-sla/ready-ticket
   */
  static async createReadyPickupTicket(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string || req.body.hotelId;
      const { orderId, itemsSummary } = req.body;

      if (!orderId || !Types.ObjectId.isValid(orderId)) {
        res.status(400).json({ success: false, message: 'Valid orderId is required' });
        return;
      }

      const order = await RestaurantOrder.findOne({
        _id: new Types.ObjectId(orderId),
        hotelId: new Types.ObjectId(hotelId),
      });

      if (!order) {
        res.status(404).json({ success: false, message: 'Restaurant order not found' });
        return;
      }

      // Query SLA Config
      let config = await FoodPickupSlaConfig.findOne({ hotelId: new Types.ObjectId(hotelId) });
      const slaMinutes = config ? config.defaultPickupSlaMinutes : 3;

      // Query Table for floor & assigned waiter
      let assignedWaiterId: Types.ObjectId | undefined;
      let assignedWaiterName: string = 'Floor Staff';
      let tableNumber = 'Takeaway';
      let floorLevel = 'Ground Floor';

      if (order.tableId) {
        const table = await DiningTable.findById(order.tableId);
        if (table) {
          tableNumber = table.tableNumber;
          floorLevel = table.floorLevel || 'Ground Floor';
          if (table.assignedWaiterId) {
            assignedWaiterId = table.assignedWaiterId;
            assignedWaiterName = 'Assigned Waiter';
          }
        }
      }

      const now = new Date();
      const slaDeadline = new Date(now.getTime() + slaMinutes * 60 * 1000);

      const ticket = await FoodPickupTicket.create({
        hotelId: new Types.ObjectId(hotelId),
        orderId: order._id,
        orderNumber: order.orderNumber,
        tableId: order.tableId || new Types.ObjectId(),
        tableNumber,
        floorLevel,
        assignedWaiterId,
        assignedWaiterName,
        itemsSummary: itemsSummary || 'Fresh Dishes Ready',
        readyAt: now,
        slaMinutes,
        slaDeadline,
        status: PickupTicketStatus.READY_FOR_PICKUP,
      });

      res.status(201).json({
        success: true,
        message: `Pickup ticket created with ${slaMinutes}m SLA deadline`,
        ticket,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * 3. Waiter Taps "On My Way" (Snooze 60 Seconds)
   * POST /api/v1/food-pickup-sla/ticket/:ticketId/snooze
   */
  static async waiterSnoozeOnMyWay(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string;
      const ticketId = req.params.ticketId as string;

      if (!ticketId || !Types.ObjectId.isValid(ticketId)) {
        res.status(400).json({ success: false, message: 'Valid ticketId is required' });
        return;
      }

      const ticket = await FoodPickupTicket.findOne({
        _id: new Types.ObjectId(ticketId),
        hotelId: new Types.ObjectId(hotelId),
      });

      if (!ticket) {
        res.status(404).json({ success: false, message: 'Pickup ticket not found' });
        return;
      }

      if (ticket.status === PickupTicketStatus.PICKED_UP || ticket.status === PickupTicketStatus.DELIVERED) {
        res.status(400).json({ success: false, message: 'Ticket is already picked up' });
        return;
      }

      // Check max snoozes
      const config = await FoodPickupSlaConfig.findOne({ hotelId: new Types.ObjectId(hotelId) });
      const maxAllowed = config ? config.maxAllowedSnoozes : 1;
      const snoozeSeconds = config ? config.maxSnoozeSeconds : 60;

      const now = new Date();
      const currentEffectiveDeadline = ticket.snoozeExtendedDeadline || ticket.slaDeadline;
      const extendedDeadline = new Date(currentEffectiveDeadline.getTime() + snoozeSeconds * 1000);

      const updatedTicket = await FoodPickupTicket.findOneAndUpdate(
        {
          _id: new Types.ObjectId(ticketId),
          hotelId: new Types.ObjectId(hotelId),
          snoozeCount: { $lt: maxAllowed },
          status: { $nin: [PickupTicketStatus.PICKED_UP, PickupTicketStatus.DELIVERED] },
        },
        {
          $inc: { snoozeCount: 1 },
          $set: {
            snoozedAt: now,
            snoozeExtendedDeadline: extendedDeadline,
            status: PickupTicketStatus.WAITER_EN_ROUTE,
          },
        },
        { new: true }
      );

      if (!updatedTicket) {
        res.status(400).json({
          success: false,
          code: 'MAX_SNOOZE_REACHED',
          message: `Maximum allowed snooze limit (${maxAllowed}) reached! Please pick up food immediately.`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: `Snoozed: Extended pickup deadline by ${snoozeSeconds}s. Status updated to En Route.`,
        extendedDeadline,
        ticket: updatedTicket,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * 4. Waiter Confirms Dish Pickup
   * POST /api/v1/food-pickup-sla/ticket/:ticketId/pickup
   */
  static async waiterConfirmPickup(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string;
      const ticketId = req.params.ticketId as string;

      if (!ticketId || !Types.ObjectId.isValid(ticketId)) {
        res.status(400).json({ success: false, message: 'Valid ticketId is required' });
        return;
      }

      const ticket = await FoodPickupTicket.findOne({
        _id: new Types.ObjectId(ticketId),
        hotelId: new Types.ObjectId(hotelId),
      });

      if (!ticket) {
        res.status(404).json({ success: false, message: 'Pickup ticket not found' });
        return;
      }

      const now = new Date();
      const latencySeconds = Math.round((now.getTime() - ticket.readyAt.getTime()) / 1000);
      const effectiveDeadline = ticket.snoozeExtendedDeadline || ticket.slaDeadline;
      const wasBreached = now > effectiveDeadline;

      ticket.status = PickupTicketStatus.PICKED_UP;
      ticket.pickedUpAt = now;
      ticket.pickupLatencySeconds = latencySeconds;
      ticket.isBreached = wasBreached;
      await ticket.save();

      res.status(200).json({
        success: true,
        message: `Food picked up in ${latencySeconds}s (${wasBreached ? 'SLA Breached' : 'Within SLA Target'})`,
        latencySeconds,
        wasBreached,
        ticket,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * 5. Background Sweeper: Check Breached Pickup SLAs
   * POST /api/v1/food-pickup-sla/sweep-breaches
   */
  static async sweepBreachedTickets(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string;
      const now = new Date();

      const activeTickets = await FoodPickupTicket.find({
        hotelId: new Types.ObjectId(hotelId),
        status: { $in: [PickupTicketStatus.READY_FOR_PICKUP, PickupTicketStatus.WAITER_EN_ROUTE] },
      });

      const breachedTicketNumbers: string[] = [];

      for (const ticket of activeTickets) {
        const effectiveDeadline = ticket.snoozeExtendedDeadline || ticket.slaDeadline;
        if (now > effectiveDeadline) {
          ticket.status = PickupTicketStatus.SLA_BREACHED;
          ticket.isBreached = true;
          ticket.escalatedToCaptain = true;
          await ticket.save();

          breachedTicketNumbers.push(ticket.orderNumber);

          // Create emergency buzzer alert for Floor Captain
          await TargetedPushAlert.create({
            hotelId: ticket.hotelId,
            alertType: AlertType.CUSTOMER_CALL,
            tableId: ticket.tableId,
            tableNumber: ticket.tableNumber,
            routingType: AlertRoutingType.CAPTAIN_ESCALATION,
            title: `🚨 FOOD PICKUP SLA BREACH: Table ${ticket.tableNumber}`,
            message: `Food is getting cold on pass counter! Order ${ticket.orderNumber} exceeded ${ticket.slaMinutes}m pickup SLA.`,
            priority: AlertPriority.CRITICAL,
          });
        }
      }

      res.status(200).json({
        success: true,
        sweptCount: breachedTicketNumbers.length,
        breachedTicketNumbers,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
