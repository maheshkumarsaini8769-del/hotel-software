import { Request, Response } from 'express';
import { Types } from 'mongoose';
import crypto from 'crypto';
import {
  UniversalCustomerSession,
  CustomerServiceMode,
  CustomerSessionStatus,
  ServiceRequestType,
  ServiceRequestStatus,
} from '../models/UniversalCustomerSession';
import { Room, RoomStatus } from '../models/Room';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { TableSession, SessionStatus } from '../models/TableSession';
import { Stay } from '../models/Stay';
import { MasterFolio } from '../models/MasterFolio';
import { FolioLineItem, DepartmentType } from '../models/FolioLineItem';
import {
  RestaurantOrder,
  OrderType,
  OverallOrderStatus,
  ItemProductionStatus,
} from '../models/RestaurantOrder';
import { MenuItem } from '../models/MenuItem';

export class CustomerPortalController {
  /**
   * 1. Detect or Initialize Session from URL params or token
   * POST /api/v1/customer-portal/detect-or-init
   */
  static async detectOrInit(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string || req.body.hotelId;
      if (!hotelId || !Types.ObjectId.isValid(hotelId)) {
        res.status(400).json({ success: false, message: 'Valid Hotel/Tenant ID is required' });
        return;
      }

      const { sessionToken, roomNumber, tableNumber, mode } = req.body;

      // A. If existing token provided, resume session
      if (sessionToken) {
        const session = await UniversalCustomerSession.findOne({
          hotelId: new Types.ObjectId(hotelId),
          sessionToken,
        }).populate('activeOrders');

        if (session) {
          session.lastActivityAt = new Date();
          await session.save();
          res.status(200).json({
            success: true,
            action: 'SESSION_RESUMED',
            session,
          });
          return;
        }
      }

      // B. If specific Room provided in QR / URL
      if (roomNumber) {
        const room = await Room.findOne({
          hotelId: new Types.ObjectId(hotelId),
          roomNumber: String(roomNumber).trim(),
        });

        if (room) {
          res.status(200).json({
            success: true,
            action: 'CONTEXT_DETECTED',
            detectedMode: CustomerServiceMode.IN_ROOM_DINING,
            room: {
              roomId: room._id,
              roomNumber: room.roomNumber,
              isOccupied: room.status === RoomStatus.OCCUPIED,
            },
          });
          return;
        }
      }

      // C. If specific Table provided in QR / URL
      if (tableNumber) {
        const table = await DiningTable.findOne({
          hotelId: new Types.ObjectId(hotelId),
          tableNumber: String(tableNumber).trim(),
        });

        if (table) {
          res.status(200).json({
            success: true,
            action: 'CONTEXT_DETECTED',
            detectedMode: CustomerServiceMode.DINE_IN_RESTAURANT,
            table: {
              tableId: table._id,
              tableNumber: table.tableNumber,
              section: table.section,
              capacity: table.capacity,
              currentStatus: table.currentStatus,
            },
          });
          return;
        }
      }

      // D. Fallback: Return allowed modes selector
      res.status(200).json({
        success: true,
        action: 'SELECT_MODE_REQUIRED',
        allowedModes: [
          {
            mode: CustomerServiceMode.IN_ROOM_DINING,
            label: 'In-Room Dining',
            description: 'Room service delivered directly to your guest room suite',
            icon: 'bed',
          },
          {
            mode: CustomerServiceMode.DINE_IN_RESTAURANT,
            label: 'Dine-In Restaurant',
            description: 'Table-side digital ordering for dine-in guests',
            icon: 'utensils',
          },
          {
            mode: CustomerServiceMode.TAKEAWAY_PICKUP,
            label: 'Takeaway & Pickup',
            description: 'Pre-order freshly prepared dishes for express pickup',
            icon: 'shopping-bag',
          },
        ],
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * 2. Select / Initialize Mode Session
   * POST /api/v1/customer-portal/select-mode
   */
  static async selectMode(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string || req.body.hotelId;
      if (!hotelId || !Types.ObjectId.isValid(hotelId)) {
        res.status(400).json({ success: false, message: 'Valid Hotel/Tenant ID is required' });
        return;
      }

      const {
        serviceMode,
        guestName,
        phone,
        paxCount,
        roomNumber,
        tableNumber,
        seatingType,
        billingPreference,
      } = req.body;

      if (!serviceMode || !Object.values(CustomerServiceMode).includes(serviceMode)) {
        res.status(400).json({ success: false, message: 'Valid serviceMode is required' });
        return;
      }

      const hotelObjectId = new Types.ObjectId(hotelId);
      const sessionToken = `UCS-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

      let inRoomContext: any = undefined;
      let dineInContext: any = undefined;
      let takeawayContext: any = undefined;
      let verificationStatus: 'PENDING' | 'VERIFIED' | 'GUEST_SELF_DECLARED' = 'GUEST_SELF_DECLARED';

      // 1. IN_ROOM_DINING Handling
      if (serviceMode === CustomerServiceMode.IN_ROOM_DINING) {
        if (!roomNumber) {
          res.status(400).json({ success: false, message: 'roomNumber is required for In-Room dining' });
          return;
        }

        const room = await Room.findOne({
          hotelId: hotelObjectId,
          roomNumber: String(roomNumber).trim(),
        });

        if (!room) {
          res.status(404).json({ success: false, message: `Room ${roomNumber} not found in this hotel` });
          return;
        }

        if (room.status !== RoomStatus.OCCUPIED) {
          res.status(400).json({
            success: false,
            message: `Room ${roomNumber} is not currently checked-in / occupied. Please contact reception.`,
          });
          return;
        }

        // Look up active Stay and Open Folio
        let stayId = room.currentStayId;
        let folioId: Types.ObjectId | undefined = undefined;

        if (stayId) {
          const openFolio = await MasterFolio.findOne({
            hotelId: hotelObjectId,
            stayId,
            folioStatus: 'OPEN',
          });
          if (openFolio) {
            folioId = openFolio._id;
          }
          verificationStatus = 'VERIFIED';
        }

        inRoomContext = {
          roomId: room._id,
          roomNumber: room.roomNumber,
          stayId,
          folioId,
          billingPreference: billingPreference || 'POST_TO_ROOM',
        };
      }

      // 2. DINE_IN_RESTAURANT Handling
      else if (serviceMode === CustomerServiceMode.DINE_IN_RESTAURANT) {
        if (!tableNumber) {
          res.status(400).json({ success: false, message: 'tableNumber is required for Dine-In' });
          return;
        }

        const table = await DiningTable.findOne({
          hotelId: hotelObjectId,
          tableNumber: String(tableNumber).trim(),
        });

        if (!table) {
          res.status(404).json({ success: false, message: `Table ${tableNumber} not found` });
          return;
        }

        // Find or create TableSession
        let tableSession = await TableSession.findOne({
          hotelId: hotelObjectId,
          tableId: table._id,
          status: SessionStatus.ACTIVE,
        });

        if (!tableSession) {
          tableSession = await TableSession.create({
            hotelId: hotelObjectId,
            tableId: table._id,
            sessionTokenHash: crypto.randomBytes(16).toString('hex'),
            guestCount: paxCount || 2,
            customerName: guestName,
            customerPhone: phone,
            status: SessionStatus.ACTIVE,
          });
        }

        dineInContext = {
          tableId: table._id,
          tableNumber: table.tableNumber,
          tableSessionId: tableSession._id,
          section: table.section || 'MAIN_HALL',
          seatingType: seatingType || 'PRIVATE_TABLE',
        };
      }

      // 3. TAKEAWAY_PICKUP Handling
      else if (serviceMode === CustomerServiceMode.TAKEAWAY_PICKUP) {
        takeawayContext = {
          pickupToken: `TK-${Date.now().toString().slice(-4)}`,
          estimatedReadyMinutes: 20,
        };
      }

      const session = await UniversalCustomerSession.create({
        hotelId: hotelObjectId,
        sessionToken,
        serviceMode,
        verificationStatus,
        guestInfo: {
          guestName,
          phone,
          paxCount: paxCount || 1,
        },
        inRoomContext,
        dineInContext,
        takeawayContext,
        cartItems: [],
        activeOrders: [],
        serviceRequests: [],
        status: CustomerSessionStatus.ACTIVE,
        lastActivityAt: new Date(),
      });

      res.status(201).json({
        success: true,
        message: `Customer session initialized for ${serviceMode}`,
        sessionToken: session.sessionToken,
        session,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * 3. Switch Service Mode (Preserves Cart & Contact)
   * POST /api/v1/customer-portal/switch-mode
   */
  static async switchMode(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string || req.body.hotelId;
      const { sessionToken, newServiceMode, roomNumber, tableNumber } = req.body;

      if (!sessionToken || !newServiceMode) {
        res.status(400).json({ success: false, message: 'sessionToken and newServiceMode are required' });
        return;
      }

      const session = await UniversalCustomerSession.findOne({
        hotelId: new Types.ObjectId(hotelId),
        sessionToken,
      });

      if (!session) {
        res.status(404).json({ success: false, message: 'Customer session not found' });
        return;
      }

      session.serviceMode = newServiceMode;

      if (newServiceMode === CustomerServiceMode.IN_ROOM_DINING && roomNumber) {
        const room = await Room.findOne({
          hotelId: session.hotelId,
          roomNumber: String(roomNumber).trim(),
        });
        if (room && room.status === RoomStatus.OCCUPIED) {
          session.inRoomContext = {
            roomId: room._id,
            roomNumber: room.roomNumber,
            stayId: room.currentStayId,
            billingPreference: 'POST_TO_ROOM',
          };
          session.verificationStatus = 'VERIFIED';
        }
      } else if (newServiceMode === CustomerServiceMode.DINE_IN_RESTAURANT && tableNumber) {
        const table = await DiningTable.findOne({
          hotelId: session.hotelId,
          tableNumber: String(tableNumber).trim(),
        });
        if (table) {
          session.dineInContext = {
            tableId: table._id,
            tableNumber: table.tableNumber,
            section: table.section,
            seatingType: 'PRIVATE_TABLE',
          };
        }
      }

      session.lastActivityAt = new Date();
      await session.save();

      res.status(200).json({
        success: true,
        message: `Mode successfully switched to ${newServiceMode}`,
        session,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * 4. Place Customer Order
   * POST /api/v1/customer-portal/place-order
   */
  static async placeOrder(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string || req.body.hotelId;
      const { sessionToken, items, cookingInstructions, billingPreference } = req.body;

      if (!sessionToken || !items || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({ success: false, message: 'sessionToken and non-empty items array are required' });
        return;
      }

      const session = await UniversalCustomerSession.findOne({
        hotelId: new Types.ObjectId(hotelId),
        sessionToken,
      });

      if (!session) {
        res.status(404).json({ success: false, message: 'Session not found' });
        return;
      }

      // Compute Order Items & Subtotal
      let subTotal = 0;
      const orderItems = items.map((it: any) => {
        const lineTotal = Number(it.unitPrice) * Number(it.quantity);
        subTotal += lineTotal;
        return {
          menuItemId: new Types.ObjectId(it.menuItemId),
          kitchenStationId: it.kitchenStationId ? new Types.ObjectId(it.kitchenStationId) : new Types.ObjectId(),
          name: it.name,
          unitPrice: Number(it.unitPrice),
          quantity: Number(it.quantity),
          subtotal: lineTotal,
          specialInstructions: it.specialInstructions,
          itemStatus: ItemProductionStatus.PENDING,
        };
      });

      const tax5Percent = Math.round(subTotal * 0.05);
      const grandTotal = subTotal + tax5Percent;

      const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
      let orderType: OrderType = OrderType.DINE_IN;

      if (session.serviceMode === CustomerServiceMode.IN_ROOM_DINING) {
        orderType = OrderType.ROOM_SERVICE;
      } else if (session.serviceMode === CustomerServiceMode.TAKEAWAY_PICKUP) {
        orderType = OrderType.TAKEAWAY;
      }

      // Create Restaurant Order
      const newOrder = await RestaurantOrder.create({
        hotelId: session.hotelId,
        orderNumber,
        orderType,
        tableSessionId: session.dineInContext?.tableSessionId,
        tableId: session.dineInContext?.tableId,
        stayId: session.inRoomContext?.stayId,
        roomId: session.inRoomContext?.roomId,
        folioId: session.inRoomContext?.folioId,
        items: orderItems,
        cookingInstructions,
        orderStatus: OverallOrderStatus.PLACED,
        placedAt: new Date(),
        idempotencyKey: req.body.idempotencyKey || `IDEMP-${crypto.randomBytes(8).toString('hex')}`,
      });

      // Post to MasterFolio if In-Room dining with POST_TO_ROOM
      const preference = billingPreference || session.inRoomContext?.billingPreference || 'POST_TO_ROOM';
      if (session.serviceMode === CustomerServiceMode.IN_ROOM_DINING && preference === 'POST_TO_ROOM') {
        let targetFolioId = session.inRoomContext?.folioId;

        // If folioId not cached in context, look up active folio for this room/stay
        if (!targetFolioId && session.inRoomContext?.roomId) {
          const activeFolio = await MasterFolio.findOne({
            hotelId: session.hotelId,
            roomId: session.inRoomContext.roomId,
            folioStatus: 'OPEN',
          });
          if (activeFolio) {
            targetFolioId = activeFolio._id;
          }
        }

        if (targetFolioId) {
          await FolioLineItem.create({
            hotelId: session.hotelId,
            folioId: targetFolioId,
            department: DepartmentType.ROOM_SERVICE,
            description: `Room Service Food & Beverage (Order #${orderNumber})`,
            referenceId: newOrder._id,
            rate: subTotal,
            quantity: 1,
            taxRate: 5,
            taxAmount: tax5Percent,
            netAmount: grandTotal,
            postedAt: new Date(),
          });

          await MasterFolio.findByIdAndUpdate(targetFolioId, {
            $inc: {
              totalFoodAndBeverage: subTotal,
              totalTaxes: tax5Percent,
              netAmountPayable: grandTotal,
              dueAmount: grandTotal,
            },
          });
        }
      }

      // Update session
      session.activeOrders.push(newOrder._id);
      session.status = CustomerSessionStatus.ORDER_PLACED;
      session.cartItems = []; // cleared after ordering
      session.lastActivityAt = new Date();
      await session.save();

      res.status(201).json({
        success: true,
        message: `Order #${orderNumber} placed successfully`,
        order: newOrder,
        grandTotal,
        estimatedMinutes: session.serviceMode === CustomerServiceMode.IN_ROOM_DINING ? 30 : 20,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * 5. Dispatch Real-Time Service Request (Call Waiter, Water, Bill, etc.)
   * POST /api/v1/customer-portal/service-request
   */
  static async requestService(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string || req.body.hotelId;
      const { sessionToken, requestType, notes } = req.body;

      if (!sessionToken || !requestType) {
        res.status(400).json({ success: false, message: 'sessionToken and requestType are required' });
        return;
      }

      const session = await UniversalCustomerSession.findOne({
        hotelId: new Types.ObjectId(hotelId),
        sessionToken,
      });

      if (!session) {
        res.status(404).json({ success: false, message: 'Customer session not found' });
        return;
      }

      const newRequest = {
        requestId: `SRV-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        requestType,
        notes,
        status: ServiceRequestStatus.PENDING,
        requestedAt: new Date(),
      };

      session.serviceRequests.push(newRequest as any);
      session.lastActivityAt = new Date();
      await session.save();

      res.status(201).json({
        success: true,
        message: `Service request ${requestType} dispatched to staff`,
        request: newRequest,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * 6. Update Service Request Status (Staff / Admin endpoint)
   * PATCH /api/v1/customer-portal/service-request/:requestId/status
   */
  static async updateServiceRequestStatus(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string;
      const { requestId } = req.params;
      const { status, resolvedByStaffName } = req.body;

      if (!requestId || !status) {
        res.status(400).json({ success: false, message: 'requestId and status are required' });
        return;
      }

      const session = await UniversalCustomerSession.findOne({
        hotelId: new Types.ObjectId(hotelId),
        'serviceRequests.requestId': requestId,
      });

      if (!session) {
        res.status(404).json({ success: false, message: 'Service request not found in tenant' });
        return;
      }

      const srv = session.serviceRequests.find((r) => r.requestId === requestId);
      if (srv) {
        srv.status = status;
        if (status === ServiceRequestStatus.RESOLVED) {
          srv.resolvedAt = new Date();
        }
        if (resolvedByStaffName) {
          srv.resolvedByStaffName = resolvedByStaffName;
        }
      }

      await session.save();

      res.status(200).json({
        success: true,
        message: `Service request status updated to ${status}`,
        serviceRequest: srv,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * 7. Get Live Session Status and Active Order Tracking
   * GET /api/v1/customer-portal/session/:sessionToken
   */
  static async getSession(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string;
      const { sessionToken } = req.params;

      if (!sessionToken) {
        res.status(400).json({ success: false, message: 'sessionToken param is required' });
        return;
      }

      const session = await UniversalCustomerSession.findOne({
        hotelId: new Types.ObjectId(hotelId),
        sessionToken,
      }).populate('activeOrders');

      if (!session) {
        res.status(404).json({ success: false, message: 'Session not found for tenant' });
        return;
      }

      res.status(200).json({
        success: true,
        session,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
