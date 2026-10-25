import { Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { TableSession, SessionStatus } from '../models/TableSession';
import { MenuItem, FoodType } from '../models/MenuItem';
import { MenuCategory } from '../models/MenuCategory';
import { KitchenStation } from '../models/KitchenStation';
import { User } from '../models/User';
import { RestaurantOrder, OverallOrderStatus, ItemProductionStatus, OrderType } from '../models/RestaurantOrder';
import { Tenant } from '../models/Tenant';
import { UserRole } from '../types';
import { TenantRequest } from '../types';
import { io } from '../index';
import { escapeRegex } from '../utils/security';
import { generateReferenceNumber } from '../utils/referenceNumber';
import { InventoryBomService } from '../services/InventoryBomService';
import {
  isDevAuthBypassEnabled,
  isDemoDataSeedingEnabled,
  isProduction,
  getJwtSecret,
} from '../config/security';
import {
  signTableSessionToken,
  matchesTableSessionToken,
} from '../utils/tableSessionToken';

// 1. Get or Validate Table Session via Ephemeral QR Token
export const accessTableByQR = async (req: Request, res: Response): Promise<void> => {
  try {
    const { hotelId, tableId, token } = req.query;

    if (!hotelId || !tableId || !Types.ObjectId.isValid(hotelId as string) || !Types.ObjectId.isValid(tableId as string)) {
      res.status(400).json({ success: false, errorCode: 'INVALID_QUERY', message: 'Missing or invalid hotelId or tableId' });
      return;
    }

    const table = await DiningTable.findOne({
      _id: new Types.ObjectId(tableId as string),
      hotelId: new Types.ObjectId(hotelId as string),
    });

    if (!table) {
      res.status(404).json({ success: false, errorCode: 'TABLE_NOT_FOUND', message: 'Dining table does not exist' });
      return;
    }

    const hotel = await Tenant.findById(hotelId).select('name enabledPortals');
    const waiterEnabled = hotel?.enabledPortals?.includes('waiter') ?? true;

    // Verify QR token if table has a registered qrTokenHash
    if (table.qrTokenHash) {
      if (!token) {
        res.status(403).json({ success: false, errorCode: 'INVALID_QR_TOKEN', message: 'Missing required QR security token' });
        return;
      }
      const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
      if (tokenHash !== table.qrTokenHash && String(token) !== table.qrTokenHash) {
        res.status(403).json({ success: false, errorCode: 'INVALID_QR_TOKEN', message: 'Invalid or forged QR token' });
        return;
      }
    }

    // If table is merged into a parent table, resolve to primary table
    let effectiveTable = table;
    if (table.currentStatus === TableStatus.MERGED && table.mergedIntoTableId) {
      const parentTable = await DiningTable.findOne({
        _id: table.mergedIntoTableId,
        hotelId: new Types.ObjectId(hotelId as string),
      });
      if (parentTable) {
        effectiveTable = parentTable;
      }
    }

    // Check if table currently has an active session
    let session = null;
    if (effectiveTable.activeSessionId) {
      session = await TableSession.findById(effectiveTable.activeSessionId);
    }

    // If no active session, create a fresh ephemeral session token
    if (!session || session.status === SessionStatus.CLOSED || session.status === SessionStatus.SETTLED) {
      const ephemeralRawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(ephemeralRawToken).digest('hex');

      session = await TableSession.create({
        hotelId: effectiveTable.hotelId,
        tableId: effectiveTable._id,
        sessionTokenHash: tokenHash,
        status: SessionStatus.ACTIVE,
      });

      // Update table to OCCUPIED and bind session
      effectiveTable.currentStatus = effectiveTable.currentStatus === TableStatus.MERGED ? TableStatus.MERGED : TableStatus.OCCUPIED;
      effectiveTable.activeSessionId = session._id as Types.ObjectId;
      await effectiveTable.save();

      res.status(200).json({
        success: true,
        message: effectiveTable.isMerged
          ? `Connected to unified group tab with ${effectiveTable.tableNumber}`
          : 'New table session initialized',
        data: {
          hotelId: String(effectiveTable.hotelId),
          hotelName: hotel?.name || 'SpiceHub Hotel',
          tableId: effectiveTable._id.toString(),
          tableNumber: effectiveTable.tableNumber,
          originalScannedTableNumber: table.tableNumber,
          section: effectiveTable.section,
          isMerged: Boolean(effectiveTable.isMerged || table.isMerged),
          mergedTableNumbers: effectiveTable.mergedTableNumbers || [],
          combinedCapacity: effectiveTable.combinedCapacity || effectiveTable.capacity,
          sessionToken: signTableSessionToken({
            hotelId: String(effectiveTable.hotelId),
            tableId: String(effectiveTable._id),
            tableSessionId: String(session._id),
          }),
          sessionId: session._id,
          status: session.status,
          waiterEnabled,
        },
      });
      return;
    }

    // Join existing active table session
    res.status(200).json({
      success: true,
      message: effectiveTable.isMerged
        ? `Joined active unified group tab with ${effectiveTable.tableNumber}`
        : 'Joined existing active table session',
      data: {
        hotelId: String(effectiveTable.hotelId),
        hotelName: hotel?.name || 'SpiceHub Hotel',
        tableId: effectiveTable._id.toString(),
        tableNumber: effectiveTable.tableNumber,
        originalScannedTableNumber: table.tableNumber,
        section: effectiveTable.section,
        isMerged: Boolean(effectiveTable.isMerged || table.isMerged),
        mergedTableNumbers: effectiveTable.mergedTableNumbers || [],
        combinedCapacity: effectiveTable.combinedCapacity || effectiveTable.capacity,
        sessionToken: signTableSessionToken({
          hotelId: String(effectiveTable.hotelId),
          tableId: String(effectiveTable._id),
          tableSessionId: String(session._id),
        }),
        sessionId: session._id,
        status: session.status,
        guestCount: session.guestCount,
        waiterEnabled,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// 1.1 Demo / Quick Bootstrap Context Endpoint
export const getDemoContext = async (req: Request, res: Response): Promise<void> => {
  try {
    if (isProduction()) {
      res.status(404).json({
        success: false,
        errorCode: 'DEMO_CONTEXT_DISABLED',
        message: 'Demo bootstrap context is not available in production',
      });
      return;
    }

    const tenant = (await Tenant.findOne({ slug: 'taj-gateway' })) || (await Tenant.findOne());
    if (!tenant) {
      res.status(404).json({ success: false, message: 'No tenant found' });
      return;
    }
    const hotelId = tenant._id;
    const tables = await DiningTable.find({ hotelId });
    const table4 = tables.find((t) => t.tableNumber === 'T-04') || tables[0];

    // Find or create active table session for demo table
    let session = table4
      ? await TableSession.findOne({ hotelId, tableId: table4._id, status: SessionStatus.ACTIVE })
      : null;
    if (!session && table4) {
      session = await TableSession.create({
        hotelId,
        tableId: table4._id,
        sessionTokenHash: 'active_session_table_4_token_hash',
        openedAt: new Date(),
        guestCount: 2,
        customerName: 'Demo Guest',
        status: SessionStatus.ACTIVE,
      });
      table4.currentStatus = TableStatus.OCCUPIED;
      table4.activeSessionId = session._id as any;
      await table4.save();
    }

    const waiter = await User.findOne({ hotelId, role: UserRole.WAITER, isActive: true });
    const chef = await User.findOne({ hotelId, role: UserRole.CHEF, isActive: true });
    const categories = await MenuCategory.find({ hotelId, isActive: true }).sort({ displayOrder: 1 });
    const categoryMap = new Map(categories.map((c) => [c._id.toString(), c.name]));
    const menuItems = await MenuItem.find({ hotelId, isAvailable: true });

    const activeOrders = session
      ? await RestaurantOrder.find({
          hotelId,
          tableSessionId: session._id,
          orderStatus: { $ne: OverallOrderStatus.CANCELLED },
        }).sort({ placedAt: 1 })
      : [];

    res.status(200).json({
      success: true,
      data: {
        hotel: {
          id: hotelId.toString(),
          name: tenant.name,
          slug: tenant.slug,
          currency: tenant.currency || 'INR',
          waiterEnabled: tenant.enabledPortals?.includes('waiter') ?? true,
        },
        table: table4
          ? {
              id: table4._id.toString(),
              tableNumber: table4.tableNumber,
              section: table4.section,
              capacity: table4.capacity,
            }
          : null,
        tables: tables.map((t) => ({
          id: t._id.toString(),
          tableNumber: t.tableNumber,
          section: t.section,
          capacity: t.capacity,
          currentStatus: t.currentStatus,
        })),
        session: session && table4
          ? {
              id: session._id.toString(),
              token: signTableSessionToken({
                hotelId: String(hotelId),
                tableId: String(table4._id),
                tableSessionId: String(session._id),
              }),
              guestCount: session.guestCount || 2,
              status: session.status,
            }
          : null,
        orders: activeOrders.map((o) => ({
          id: o._id.toString(),
          orderId: o._id.toString(),
          orderNumber: o.orderNumber,
          orderStatus: o.orderStatus,
          orderType: o.orderType,
          items: (o.items || []).map((it) => ({
            id: it._id?.toString(),
            menuItemId: it.menuItemId?.toString(),
            name: it.name,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            subtotal: it.subtotal || it.unitPrice * it.quantity,
            itemStatus: it.itemStatus,
            specialInstructions: it.specialInstructions,
          })),
          cookingInstructions: o.cookingInstructions,
          placedAt: o.placedAt,
          totalAmount: (o.items || []).reduce((acc, it) => acc + (it.subtotal || it.unitPrice * it.quantity), 0),
        })),
        waiter: waiter
          ? {
              id: waiter._id.toString(),
              name: waiter.name,
              email: waiter.email,
              role: waiter.role,
            }
          : null,
        chef: chef
          ? {
              id: chef._id.toString(),
              name: chef.name,
              email: chef.email,
            }
          : null,
        categories: categories.map((c) => ({
          id: c._id.toString(),
          name: c.name,
          slug: c.slug,
        })),
        menuItems: menuItems.map((m) => ({
          id: m._id.toString(),
          menuItemId: m._id.toString(),
          name: m.name,
          description: m.description,
          price: m.basePrice,
          basePrice: m.basePrice,
          foodType: m.foodType,
          isAvailable: m.isAvailable,
          prepTimeMinutes: m.prepTimeMinutes || 10,
          categoryId: m.categoryId?.toString(),
          category: categoryMap.get(m.categoryId?.toString() || '') || 'Specialties',
          images: m.images && m.images.length > 0 ? m.images : [
            'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80'
          ],
        })),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 1.2 Dedicated Active Table Session Orders Endpoint (Customer Portal / Refresh Resilient)
export const getTableSessionOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const tableSessionId = (req.params.tableSessionId || (typeof req.query.tableSessionId === 'string' ? req.query.tableSessionId : '')) as string;
    let querySessionId: string = tableSessionId;

    let tableDoc: any = null;
    if (!querySessionId || !Types.ObjectId.isValid(querySessionId)) {
      const rawTable = (typeof req.query.tableNumber === 'string' ? req.query.tableNumber : '') || (typeof req.query.table === 'string' ? req.query.table : '') || 'T-04';
      const numOnly = rawTable.replace(/[^0-9]/g, '');
      const normalizedT = numOnly ? `T-${numOnly.padStart(2, '0')}` : rawTable;

      tableDoc = await DiningTable.findOne({
        $or: [
          { tableNumber: rawTable },
          { tableNumber: normalizedT },
          { tableNumber: numOnly ? `T-${numOnly}` : rawTable },
          { tableNumber: `Table ${numOnly}` },
        ],
      });

      if (tableDoc && tableDoc.activeSessionId) {
        querySessionId = tableDoc.activeSessionId.toString();
      }
    }

    const queryFilters: any[] = [];
    if (querySessionId && Types.ObjectId.isValid(querySessionId)) {
      queryFilters.push({ tableSessionId: new Types.ObjectId(querySessionId) });
    }
    if (tableDoc && tableDoc._id) {
      queryFilters.push({ tableId: tableDoc._id });
    }

    let orders = queryFilters.length > 0
      ? await RestaurantOrder.find({
          $or: queryFilters,
          orderStatus: { $ne: OverallOrderStatus.CANCELLED },
        }).sort({ placedAt: 1 })
      : [];

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders.map((o) => ({
        id: o._id.toString(),
        orderId: o._id.toString(),
        orderNumber: o.orderNumber,
        orderStatus: o.orderStatus,
        orderType: o.orderType,
        items: (o.items || []).map((it) => ({
          id: it._id?.toString(),
          menuItemId: it.menuItemId?.toString(),
          name: it.name,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          subtotal: it.subtotal || it.unitPrice * it.quantity,
          itemStatus: it.itemStatus,
          specialInstructions: it.specialInstructions,
        })),
        cookingInstructions: o.cookingInstructions,
        placedAt: o.placedAt,
        totalAmount: (o.items || []).reduce((acc, it) => acc + (it.subtotal || it.unitPrice * it.quantity), 0),
      })),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 1.2 Resolve the active table session for cashier settlement (staff-authenticated)
export const getActiveTableSession = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const rawTableId = String(req.query.tableId || req.body?.tableId || '').trim();
    const rawTableNumber = String(req.query.tableNumber || req.body?.tableNumber || '').trim();

    if (!rawTableId && !rawTableNumber) {
      res.status(400).json({
        success: false,
        errorCode: 'TABLE_REQUIRED',
        message: 'tableId or tableNumber is required',
      });
      return;
    }

    let table: any = null;
    if (rawTableId && Types.ObjectId.isValid(rawTableId)) {
      table = await DiningTable.findOne({
        _id: new Types.ObjectId(rawTableId),
        hotelId: new Types.ObjectId(hotelId),
      });
    }

    if (!table && rawTableNumber) {
      const digits = rawTableNumber.replace(/[^0-9]/g, '');
      const variants = Array.from(
        new Set(
          [
            rawTableNumber,
            digits,
            digits ? `T-${digits}` : '',
            digits ? `T-${digits.padStart(2, '0')}` : '',
            digits ? `Table ${digits}` : '',
          ].filter(Boolean)
        )
      );
      table = await DiningTable.findOne({
        hotelId: new Types.ObjectId(hotelId),
        $or: variants.map((value) => ({ tableNumber: value })),
      });
    }

    if (!table) {
      res.status(404).json({
        success: false,
        errorCode: 'TABLE_NOT_FOUND',
        message: `No dining table found for '${rawTableNumber || rawTableId}'`,
      });
      return;
    }

    let session: any = null;
    if (table.activeSessionId) {
      session = await TableSession.findOne({
        _id: table.activeSessionId,
        hotelId: new Types.ObjectId(hotelId),
        status: { $in: [SessionStatus.ACTIVE, SessionStatus.BILLING] },
      });
    }
    if (!session) {
      session = await TableSession.findOne({
        hotelId: new Types.ObjectId(hotelId),
        tableId: table._id,
        status: { $in: [SessionStatus.ACTIVE, SessionStatus.BILLING] },
      }).sort({ openedAt: -1 });
    }

    // Local demo convenience only. Production requires an existing, guest-opened session.
    if (!session && isDevAuthBypassEnabled()) {
      session = await TableSession.create({
        hotelId: new Types.ObjectId(hotelId),
        tableId: table._id,
        sessionTokenHash: crypto.randomBytes(32).toString('hex'),
        openedAt: new Date(),
        guestCount: 2,
        customerName: 'Walk-in Guest',
        status: SessionStatus.ACTIVE,
      });
      table.currentStatus = TableStatus.OCCUPIED;
      table.activeSessionId = session._id;
      await table.save();
    }

    if (!session) {
      res.status(409).json({
        success: false,
        errorCode: 'NO_ACTIVE_SESSION',
        message: `Table ${table.tableNumber} has no active guest session to bill`,
      });
      return;
    }

    const orders = await RestaurantOrder.find({
      hotelId: new Types.ObjectId(hotelId),
      tableSessionId: session._id,
      orderStatus: { $ne: OverallOrderStatus.CANCELLED },
    }).select('totalAmount orderStatus orderNumber');

    const subtotal = orders.reduce(
      (sum, order: any) => sum + Number(order.totalAmount || 0),
      0
    );

    res.status(200).json({
      success: true,
      data: {
        hotelId: String(hotelId),
        tableId: String(table._id),
        tableNumber: table.tableNumber,
        section: table.section,
        guestCount: session.guestCount || 0,
        customerName: session.customerName || 'Walk-in Guest',
        tableSessionId: String(session._id),
        status: session.status,
        openedAt: session.openedAt,
        ordersCount: orders.length,
        orderSubtotal: subtotal,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 2. Authoritative Place Order with Idempotency Key & KDS Notification
export const placeRestaurantOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      hotelId,
      tableSessionId,
      tableId,
      items,
      cookingInstructions,
      orderType = OrderType.DINE_IN,
      sessionToken,
      qrSessionToken,
    } = req.body;

    if (!hotelId || !Types.ObjectId.isValid(String(hotelId))) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_HOTEL',
        message: 'A valid hotelId is required',
      });
      return;
    }

    const providedIdempotencyKey =
      (req.headers['x-idempotency-key'] as string) ||
      req.body?.idempotencyKey ||
      req.body?.idempotency_key;

    if (!providedIdempotencyKey && !isDevAuthBypassEnabled() && process.env.NODE_ENV !== 'test') {
      res.status(400).json({
        success: false,
        errorCode: 'IDEMPOTENCY_KEY_REQUIRED',
        message: 'x-idempotency-key header is required for order placement',
      });
      return;
    }

    const idempotencyKey =
      providedIdempotencyKey ||
      `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, errorCode: 'EMPTY_ORDER', message: 'Order must contain at least one item' });
      return;
    }

    for (const item of items) {
      if (!item.quantity || item.quantity <= 0) {
        res.status(400).json({ success: false, errorCode: 'INVALID_QUANTITY', message: 'Item quantity must be at least 1' });
        return;
      }
    }

    // Check if duplicate submission
    const existingOrder = await RestaurantOrder.findOne({
      hotelId: new Types.ObjectId(hotelId),
      idempotencyKey,
    });

    if (existingOrder) {
      res.status(200).json({
        success: true,
        message: 'Order already processed (idempotent response)',
        data: existingOrder,
      });
      return;
    }

    let session = null;
    if (tableSessionId && Types.ObjectId.isValid(tableSessionId)) {
      session = await TableSession.findOne({
        _id: new Types.ObjectId(tableSessionId),
        hotelId: new Types.ObjectId(hotelId),
      });
    }
    if (!session && tableId && Types.ObjectId.isValid(tableId)) {
      session = await TableSession.findOne({
        tableId: new Types.ObjectId(tableId),
        hotelId: new Types.ObjectId(hotelId),
        status: SessionStatus.ACTIVE,
      });
    }
    if (!session) {
      if (!isDemoDataSeedingEnabled()) {
        res.status(409).json({
          success: false,
          errorCode: 'ACTIVE_SESSION_REQUIRED',
          message: 'No active table session found. Please scan the table QR code again or ask a waiter to seat the table.',
        });
        return;
      }

      let targetTable = null;
      if (tableId && Types.ObjectId.isValid(tableId)) {
        targetTable = await DiningTable.findOne({
          _id: new Types.ObjectId(tableId),
          hotelId: new Types.ObjectId(hotelId),
        });
      }
      if (!targetTable && (tableId || req.body?.tableNumber)) {
        const rawNum = String(req.body?.tableNumber || tableId).trim();
        const numOnly = rawNum.replace(/[^0-9]/g, '');
        const paddedT = numOnly ? `T-${numOnly.padStart(2, '0')}` : rawNum;
        targetTable = await DiningTable.findOne({
          hotelId: new Types.ObjectId(hotelId),
          $or: [
            { tableNumber: rawNum },
            { tableNumber: paddedT },
            { tableNumber: `T-${numOnly}` },
            { tableNumber: `Table ${numOnly}` },
            { tableNumber: `Table ${rawNum}` },
          ],
        });
      }
      if (!targetTable) {
        targetTable = await DiningTable.findOne({ hotelId: new Types.ObjectId(hotelId) });
      }

      if (targetTable) {
        session = await TableSession.findOne({
          hotelId: new Types.ObjectId(hotelId),
          tableId: targetTable._id,
          status: SessionStatus.ACTIVE,
        });
        if (!session) {
          session = await TableSession.create({
            hotelId: new Types.ObjectId(hotelId),
            tableId: targetTable._id,
            sessionTokenHash: 'auto_created_session_token',
            status: SessionStatus.ACTIVE,
          });
          targetTable.currentStatus = TableStatus.OCCUPIED;
          targetTable.activeSessionId = session._id as any;
          await targetTable.save();
        }
      }
    }

    if (!session || session.status !== SessionStatus.ACTIVE) {
      res.status(400).json({ success: false, errorCode: 'INVALID_SESSION', message: 'Table session is not active or closed' });
      return;
    }

    // QR session validation: in production, a DINE_IN order must either come from
    // an authenticated staff JWT or present the raw QR session token issued at scan time.
    const authHeader = req.headers.authorization;
    let staffAuthenticated = false;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(authHeader.split(' ')[1], getJwtSecret()) as any;
        staffAuthenticated = Boolean(decoded?.hotelId && String(decoded.hotelId) === String(hotelId));
      } catch {
        staffAuthenticated = false;
      }
    }

    if (!staffAuthenticated) {
      const presentedToken = String(sessionToken || qrSessionToken || '');
      const legacyDemoTokenAccepted =
        isDevAuthBypassEnabled() &&
        Boolean(session.sessionTokenHash) &&
        String(sessionToken || '') === String(session.sessionTokenHash);

      const isInvalidToken = presentedToken && !legacyDemoTokenAccepted && !matchesTableSessionToken(presentedToken, session);

      if (isInvalidToken || (!isDevAuthBypassEnabled() && process.env.NODE_ENV !== 'test' && !legacyDemoTokenAccepted && !matchesTableSessionToken(presentedToken, session))) {
        res.status(403).json({
          success: false,
          errorCode: 'INVALID_QR_SESSION',
          message: 'A valid QR table session token or staff login is required to place this order',
        });
        return;
      }
    }

    const requestedGuestCount = Number(req.body?.guestCount);
    if (Number.isInteger(requestedGuestCount) && requestedGuestCount > 0 && requestedGuestCount <= 50) {
      session.guestCount = requestedGuestCount;
    }

    // Authoritative Price Revalidation directly from DB
    const validatedItems = [];
    let orderSubtotal = 0;
    const requireCatalogMatch = !isDevAuthBypassEnabled() && process.env.NODE_ENV !== 'test';

    for (const item of items) {
      const qty = Number(item.quantity);
      if (!Number.isInteger(qty) || qty <= 0) {
        res.status(400).json({
          success: false,
          errorCode: 'INVALID_QUANTITY',
          message: `Item quantity must be a positive integer, received: ${item.quantity}`,
        });
        return;
      }

      if (item.menuItemId && (typeof item.menuItemId !== 'string' || !Types.ObjectId.isValid(item.menuItemId))) {
        res.status(400).json({
          success: false,
          errorCode: 'INVALID_MENU_ITEM_ID',
          message: 'menuItemId must be a valid 24-character hex string',
        });
        return;
      }

      let dbMenuItem: any = null;
      if (item.menuItemId && Types.ObjectId.isValid(String(item.menuItemId))) {
        dbMenuItem = await MenuItem.findOne({
          _id: new Types.ObjectId(String(item.menuItemId)),
          hotelId: new Types.ObjectId(hotelId),
        });
      }
      if (!dbMenuItem && item.name) {
        dbMenuItem = await MenuItem.findOne({
          hotelId: new Types.ObjectId(hotelId),
          name: new RegExp('^' + escapeRegex(String(item.name).trim()) + '$', 'i'),
        });
      }

      if (!dbMenuItem && requireCatalogMatch) {
        res.status(400).json({
          success: false,
          errorCode: 'MENU_ITEM_NOT_FOUND',
          message: `Item '${item.name || item.menuItemId || 'unknown'}' is not on this hotel's menu. Please refresh the menu and try again.`,
        });
        return;
      }

      if (dbMenuItem && !dbMenuItem.isAvailable) {
        const dishName = dbMenuItem.name;
        const reasonText = dbMenuItem?.outOfStockReason ? ` Reason: ${dbMenuItem.outOfStockReason}.` : '';
        res.status(400).json({
          success: false,
          errorCode: 'ITEM_UNAVAILABLE',
          subErrorCode: 'ITEM_86_OUT_OF_STOCK',
          message: `Item '${dishName}' is currently out of stock (86).${reasonText} Please remove it from your cart.`,
          data: {
            menuItemId: dbMenuItem?._id?.toString() || item.menuItemId,
            name: dishName,
            isAvailable: false,
            outOfStockReason: dbMenuItem?.outOfStockReason,
          },
        });
        return;
      }

      const dishName = dbMenuItem ? dbMenuItem.name : (item.name || 'Selected dish');
      let price = dbMenuItem ? (dbMenuItem.basePrice || dbMenuItem.price || 200) : (item.unitPrice || item.price || 200);
      if (item.variantName && dbMenuItem?.hasVariants) {
        const variant = dbMenuItem.variants.find((v: any) => v.name === item.variantName);
        if (variant) price = variant.price;
      }

      const itemTotal = price * item.quantity;
      orderSubtotal += itemTotal;

      // Allergen & Dietary Metadata Extraction
      const allergens = item.allergens || dbMenuItem?.allergens || [];
      const dietaryType = item.dietaryType || dbMenuItem?.dietaryType || (dbMenuItem?.foodType === FoodType.VEG ? 'VEG' : 'NON_VEG');
      const allergenNotes = item.allergenNotes || undefined;
      const specialNote = item.specialInstructions || '';

      const isJainOrNoRoot = dietaryType === 'JAIN' || dietaryType === 'NO_ONION_GARLIC' || allergens.includes('JAIN_NO_ROOT') || /jain|no onion/i.test(specialNote);
      const hasCriticalAllergens = allergens && allergens.length > 0;
      const hasExplicitNotes = Boolean(allergenNotes) || /allergy|allergic|nut|peanut|dairy|lactose|gluten/i.test(specialNote);
      const hasAllergenAlert = isJainOrNoRoot || hasCriticalAllergens || hasExplicitNotes;

      validatedItems.push({
        menuItemId: dbMenuItem?._id || new Types.ObjectId(),
        kitchenStationId: dbMenuItem?.kitchenStationId || new Types.ObjectId(),
        name: dishName,
        variantName: item.variantName,
        selectedAddons: item.selectedAddons || [],
        unitPrice: price,
        quantity: item.quantity,
        subtotal: itemTotal,
        seatNumber: item.seatNumber,
        specialInstructions: item.specialInstructions,
        itemStatus: ItemProductionStatus.PENDING,
        allergens,
        dietaryType,
        allergenNotes: allergenNotes || (hasExplicitNotes && specialNote ? specialNote : undefined),
        hasAllergenAlert,
        chefAllergenAcknowledged: !hasAllergenAlert, // Auto-acknowledged only if safe / no allergen alert
      });
    }

    const orderNumber = generateReferenceNumber('ORD');

    // Create Order Record
    const order = await RestaurantOrder.create({
      hotelId: new Types.ObjectId(hotelId),
      orderNumber,
      orderType,
      tableSessionId: session._id,
      tableId: session.tableId,
      items: validatedItems,
      cookingInstructions,
      orderStatus: OverallOrderStatus.PLACED,
      idempotencyKey,
    });

    // Update Session Running Totals
    session.totalAmount += orderSubtotal;
    session.finalAmount += orderSubtotal; // Dynamic tax calculation applied in billing phase
    await session.save();

    const tableDoc = await DiningTable.findById(session.tableId);
    const tableNumberDisplay = tableDoc ? tableDoc.tableNumber : 'Table 4';

    const kdsPayload = {
      id: order._id.toString(),
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      tableId: session.tableId,
      tableNumber: tableNumberDisplay,
      table: tableNumberDisplay,
      items: order.items.map((it: any) => ({
        itemId: it._id ? it._id.toString() : (it.menuItemId ? it.menuItemId.toString() : `item-${Date.now()}`),
        menuItemId: it.menuItemId ? it.menuItemId.toString() : undefined,
        name: it.name,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        subtotal: it.subtotal,
        kitchenStationId: it.kitchenStationId ? it.kitchenStationId.toString() : undefined,
        itemStatus: it.itemStatus || 'PENDING',
        specialInstructions: it.specialInstructions,
        allergens: it.allergens,
        hasAllergenAlert: it.hasAllergenAlert,
      })),
      cookingInstructions: order.cookingInstructions,
      orderStatus: order.orderStatus,
      placedAt: order.placedAt,
      elapsedMinutes: 0,
      urgencyLevel: 'NORMAL',
    };

    // Broadcast Real-time Event via Socket.IO to KDS & Waiter
    io.to(`${hotelId}_kds`).emit('order:created', kdsPayload);
    io.to(`${hotelId}_kds`).emit('new_order', kdsPayload);
    io.to(`${hotelId}_waiters`).to(`${hotelId}_global`).emit('order:created', kdsPayload);
    // Shift 53: Deduct raw materials according to Recipe BOM and check low stock alerts
    let bomDeductions: any[] = [];
    try {
      bomDeductions = await InventoryBomService.deductStockForOrder(order, hotelId, io);
    } catch (bomErr) {
      console.warn('⚠️ [InventoryBomService] Non-blocking BOM deduction error:', bomErr);
    }

    res.status(201).json({
      success: true,
      message: 'Order placed successfully and routed to Kitchen KDS',
      data: order,
      order,
      bomDeductions,
    });
  } catch (error: any) {
    // If concurrent race condition triggered MongoDB duplicate key error on idempotencyKey
    if (error.code === 11000 && error.keyPattern && error.keyPattern.idempotencyKey) {
      try {
        const existing = await RestaurantOrder.findOne({
          hotelId: new Types.ObjectId(req.body.hotelId),
          idempotencyKey: req.headers['x-idempotency-key'] as string,
        });
        if (existing) {
          res.status(200).json({
            success: true,
            message: 'Order already processed (idempotent race response)',
            data: existing,
          });
          return;
        }
      } catch (findErr) {
        // fall through to 500
      }
    }

    console.error('[Order] Error placing order:', error);
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// 3. Chef KDS Status Update (Atomic Transition with Multi-Item Aggregation)
export const updateKDSOrderStatus = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { status, itemId } = req.body;
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    let filter: any = {};
    if (Types.ObjectId.isValid(String(orderId))) {
      filter._id = new Types.ObjectId(String(orderId));
    } else {
      filter = { orderNumber: orderId };
    }
    if (hotelId) filter.hotelId = hotelId;

    let order = await RestaurantOrder.findOne(filter);
    if (!order) {
      if (isDevAuthBypassEnabled() && typeof orderId === 'string' && (orderId.startsWith('ord-') || orderId.startsWith('#'))) {
        res.status(200).json({
          success: true,
          message: `Demo ticket ${orderId} status transitioned to ${status}`,
          data: {
            orderId,
            orderStatus: status,
            preparedAt: new Date(),
          },
        });
        return;
      }
      res.status(404).json({ success: false, errorCode: 'ORDER_NOT_FOUND', message: 'Order not found' });
      return;
    }

    if (order.orderStatus === OverallOrderStatus.CANCELLED) {
      res.status(400).json({ success: false, errorCode: 'ORDER_CANCELLED', message: 'Cannot update a cancelled order' });
      return;
    }

    // Chef Allergen Safety Check
    if (itemId) {
      // Item-level status update
      const item = order.items.find((i) => (i as any)._id?.toString() === itemId || i.menuItemId.toString() === itemId);
      if (item) {
        if (item.hasAllergenAlert && !item.chefAllergenAcknowledged && (status === ItemProductionStatus.PREPARING || status === ItemProductionStatus.READY)) {
          res.status(400).json({
            success: false,
            errorCode: 'ALLERGEN_NOT_ACKNOWLEDGED',
            message: `Safety Lock Active: Item '${item.name}' has unacknowledged allergen/dietary alert (${item.allergens?.join(', ') || item.dietaryType || 'Custom'}). Chef must tap and acknowledge before food preparation!`,
            dishName: item.name,
            allergens: item.allergens,
            dietaryType: item.dietaryType,
          });
          return;
        }
        item.itemStatus = status;
      }

      // Check if all items ready
      const allReady = order.items.every((i) => i.itemStatus === ItemProductionStatus.READY);
      if (allReady) {
        order.orderStatus = OverallOrderStatus.READY;
        order.readyAt = new Date();
      } else if (order.orderStatus !== OverallOrderStatus.SERVED) {
        order.orderStatus = OverallOrderStatus.PREPARING;
      }
    } else {
      if (order.orderStatus === OverallOrderStatus.SERVED && status !== OverallOrderStatus.SERVED) {
        res.status(400).json({ success: false, errorCode: 'INVALID_STATUS_TRANSITION', message: 'Served order cannot be reverted' });
        return;
      }

      // Overall order status update
      if (status === OverallOrderStatus.PREPARING || status === OverallOrderStatus.READY) {
        const unackItem = order.items.find((i) => i.hasAllergenAlert && !i.chefAllergenAcknowledged);
        if (unackItem) {
          res.status(400).json({
            success: false,
            errorCode: 'ALLERGEN_NOT_ACKNOWLEDGED',
            message: `Safety Lock Active: Order contains unacknowledged allergen/dietary alert for '${unackItem.name}' (${unackItem.allergens?.join(', ') || unackItem.dietaryType || 'Custom'}). Chef must tap and acknowledge before preparing!`,
            dishName: unackItem.name,
            allergens: unackItem.allergens,
            dietaryType: unackItem.dietaryType,
          });
          return;
        }
      }

      order.orderStatus = status;
      if (status === OverallOrderStatus.PREPARING) order.preparedAt = new Date();
      if (status === OverallOrderStatus.READY) order.readyAt = new Date();
      if (status === OverallOrderStatus.SERVED) order.servedAt = new Date();
    }

    await order.save();

    // Broadcast status change
    const updatePayload = {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      readyAt: order.readyAt,
      servedAt: order.servedAt,
      tableId: order.tableId,
      roomId: order.roomId,
    };

    io.to(`${order.hotelId}_kds`).emit('order:status_updated', updatePayload);
    io.to(`${order.hotelId}_waiters`).to(`${order.hotelId}_global`).emit('order:status_updated', updatePayload);
    if (order.roomId) {
      io.to(`${order.hotelId}_guest_room_${order.roomId}`).emit('order:status_updated', updatePayload);
      io.to(`${order.hotelId}_pms`).emit('pms:order_status_updated', updatePayload);
    }

    if (order.orderStatus === OverallOrderStatus.READY) {
      let tableNumberDisplay = 'Table 4';
      if (order.tableId) {
        const tableDoc = await DiningTable.findById(order.tableId);
        if (tableDoc) tableNumberDisplay = tableDoc.tableNumber;
      }
      io.to(`${order.hotelId}_waiters`).to(`${order.hotelId}_global`).emit('order:ready', {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        tableNumber: tableNumberDisplay,
        tableId: order.tableId,
        roomId: order.roomId,
        readyAt: order.readyAt,
      });
    }

    if (order.orderStatus === OverallOrderStatus.SERVED) {
      io.to(`${order.hotelId}_waiters`).to(`${order.hotelId}_global`).emit('order:served', {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        tableId: order.tableId,
        roomId: order.roomId,
        servedAt: order.servedAt,
      });
      io.to(`${order.hotelId}_kds`).emit('order:served', {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        servedAt: order.servedAt,
      });

      if (order.tableId) {
        try {
          const table = await DiningTable.findById(order.tableId);
          if (table && table.currentStatus !== TableStatus.BILLING && table.currentStatus !== TableStatus.PAYMENT_SETTLED) {
            table.currentStatus = TableStatus.OCCUPIED;
            await table.save();
            io.to(`${order.hotelId}_waiters`).to(`${order.hotelId}_cashier`).to(`${order.hotelId}_global`).emit('table:status_changed', {
              tableId: table._id.toString(),
              tableNumber: table.tableNumber,
              currentStatus: table.currentStatus,
            });
          }
        } catch (tblErr) {
          console.warn('Table status update on order serve non-blocking error:', tblErr);
        }
      }
    }

    res.status(200).json({ success: true, message: 'Order status updated', data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Acknowledge Allergen for Single Item
export const acknowledgeKdsItemAllergen = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { orderId, itemIndex } = req.params;
    const hotelId = req.hotelId;

    const order = await RestaurantOrder.findOne({ _id: orderId, hotelId });
    if (!order) {
      res.status(404).json({ success: false, errorCode: 'ORDER_NOT_FOUND', message: 'Order not found' });
      return;
    }

    const idx = parseInt(itemIndex as string, 10);
    if (isNaN(idx) || idx < 0 || idx >= order.items.length) {
      res.status(400).json({ success: false, errorCode: 'INVALID_ITEM_INDEX', message: 'Invalid item index' });
      return;
    }

    let chefName = 'Chef on Duty';
    let chefId: Types.ObjectId | undefined = undefined;
    if (req.user?.userId) {
      chefId = new Types.ObjectId(req.user.userId);
      const dbChef = await User.findById(req.user.userId);
      if (dbChef && dbChef.name) {
        chefName = dbChef.name;
      }
    }

    const item = order.items[idx];
    item.chefAllergenAcknowledged = true;
    item.acknowledgedChefId = chefId;
    item.acknowledgedChefName = chefName;
    item.acknowledgedAt = new Date();

    await order.save();

    // Broadcast acknowledgment to KDS room
    io.to(`${order.hotelId}_kds`).emit('kds:allergen_acknowledged', {
      orderId: order._id,
      itemIndex: idx,
      itemName: item.name,
      acknowledgedBy: item.acknowledgedChefName,
      acknowledgedAt: item.acknowledgedAt,
    });

    res.status(200).json({
      success: true,
      message: `Allergen warning for '${item.name}' acknowledged by chef`,
      data: {
        orderId: order._id,
        itemIndex: idx,
        itemName: item.name,
        chefAllergenAcknowledged: item.chefAllergenAcknowledged,
        acknowledgedChefName: item.acknowledgedChefName,
        acknowledgedAt: item.acknowledgedAt,
        order,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Acknowledge All Allergens in Order
export const acknowledgeAllKdsOrderAllergens = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const hotelId = req.hotelId;

    const order = await RestaurantOrder.findOne({ _id: orderId, hotelId });
    if (!order) {
      res.status(404).json({ success: false, errorCode: 'ORDER_NOT_FOUND', message: 'Order not found' });
      return;
    }

    let count = 0;
    const now = new Date();

    let chefName = 'Executive Chef';
    let chefId: Types.ObjectId | undefined = undefined;
    if (req.user?.userId) {
      chefId = new Types.ObjectId(req.user.userId);
      const dbChef = await User.findById(req.user.userId);
      if (dbChef && dbChef.name) {
        chefName = dbChef.name;
      }
    }

    order.items.forEach((item) => {
      if (item.hasAllergenAlert && !item.chefAllergenAcknowledged) {
        item.chefAllergenAcknowledged = true;
        item.acknowledgedChefId = chefId;
        item.acknowledgedChefName = chefName;
        item.acknowledgedAt = now;
        count++;
      }
    });

    await order.save();

    io.to(`${order.hotelId}_kds`).emit('kds:allergen_acknowledged_all', {
      orderId: order._id,
      acknowledgedCount: count,
      acknowledgedBy: chefName,
      acknowledgedAt: now,
    });

    res.status(200).json({
      success: true,
      message: `All allergen warnings (${count} items) acknowledged for order ${order.orderNumber}`,
      data: {
        orderId: order._id,
        acknowledgedCount: count,
        order,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Get All Dining Tables for Visual Floor Plan & Grid
export const getDiningTables = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId;
    if (!hotelId) {
      res.status(400).json({ success: false, errorCode: 'TENANT_REQUIRED', message: 'Tenant ID required' });
      return;
    }

    const { section, status } = req.query;
    const filter: any = { hotelId };
    if (section && section !== 'ALL') {
      filter.section = section;
    }
    if (status && status !== 'ALL') {
      filter.currentStatus = status;
    }

    const tables = await DiningTable.find(filter).sort({ tableNumber: 1 });

    // Populate active order totals for occupied tables
    const tableCards = await Promise.all(
      tables.map(async (t) => {
        let activeOrderTotal = 0;
        let activeItemsCount = 0;
        let sessionStartTime: string | undefined = undefined;

        if (t.activeSessionId) {
          const session = await TableSession.findById(t.activeSessionId);
          if (session) {
            sessionStartTime = (session as any).createdAt ? (session as any).createdAt.toISOString() : undefined;
            const orders = await RestaurantOrder.find({
              hotelId,
              tableSessionId: t.activeSessionId,
              orderStatus: { $ne: OverallOrderStatus.CANCELLED },
            });
            for (const order of orders) {
              const orderTotal = (order.items || []).reduce((acc, item) => acc + (item.subtotal || item.unitPrice * item.quantity), 0);
              activeOrderTotal += orderTotal;
              activeItemsCount += (order.items || []).reduce((acc, i) => acc + i.quantity, 0);
            }
          }
        }

        return {
          id: t._id.toString(),
          tableNumber: t.tableNumber,
          section: t.section,
          capacity: t.capacity,
          currentStatus: t.currentStatus,
          activeSessionId: t.activeSessionId ? t.activeSessionId.toString() : undefined,
          assignedWaiterId: t.assignedWaiterId ? t.assignedWaiterId.toString() : undefined,
          position: t.coordinates ? { x: t.coordinates.x, y: t.coordinates.y } : undefined,
          activeOrderTotal,
          activeItemsCount,
          sessionStartTime,
        };
      })
    );

    res.status(200).json({
      success: true,
      message: 'Dining tables retrieved successfully',
      data: tableCards,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// 5. Update Dining Table Status (Floor Plan Quick Actions: Mark Dirty, Cleaning, Available, etc.)
export const updateTableStatus = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId;
    const { tableId } = req.params;
    const { status } = req.body;

    if (!Object.values(TableStatus).includes(status)) {
      res.status(400).json({ success: false, errorCode: 'INVALID_STATUS', message: 'Invalid table status provided' });
      return;
    }

    const table = await DiningTable.findOne({ _id: tableId, hotelId });
    if (!table) {
      res.status(404).json({ success: false, errorCode: 'TABLE_NOT_FOUND', message: 'Table not found' });
      return;
    }

    table.currentStatus = status;
    if (status === TableStatus.AVAILABLE) {
      if (table.activeSessionId) {
        await TableSession.updateOne(
          { _id: table.activeSessionId, status: { $in: [SessionStatus.ACTIVE, SessionStatus.BILLING, SessionStatus.SETTLED] } },
          { status: SessionStatus.CLOSED, closedAt: new Date() }
        );
      }
      table.activeSessionId = undefined;
      table.qrTokenHash = undefined;
    }
    await table.save();

    // Broadcast real-time update to global and pos channels
    io.to(`${hotelId}_global`).to(`${hotelId}_pos`).emit('table:status_changed', {
      tableId: table._id.toString(),
      status: table.currentStatus,
      sessionId: table.activeSessionId ? table.activeSessionId.toString() : undefined,
    });

    res.status(200).json({
      success: true,
      message: `Table status updated to ${status}`,
      data: {
        tableId: table._id.toString(),
        tableNumber: table.tableNumber,
        status: table.currentStatus,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// 6. Walk-in Manual Seat Table (From POS Floor Plan)
export const seatTableWalkIn = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId;
    const { tableId } = req.params;
    const { guestCount = 2 } = req.body;

    const table = await DiningTable.findOne({ _id: tableId, hotelId });
    if (!table) {
      res.status(404).json({ success: false, errorCode: 'TABLE_NOT_FOUND', message: 'Table not found' });
      return;
    }

    if (table.currentStatus === TableStatus.OCCUPIED) {
      res.status(409).json({ success: false, errorCode: 'TABLE_ALREADY_OCCUPIED', message: 'Table is already occupied' });
      return;
    }

    const ephemeralRawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(ephemeralRawToken).digest('hex');

    const session = await TableSession.create({
      hotelId: table.hotelId,
      tableId: table._id,
      sessionTokenHash: tokenHash,
      guestCount,
      status: SessionStatus.ACTIVE,
    });

    table.currentStatus = TableStatus.OCCUPIED;
    table.activeSessionId = session._id as Types.ObjectId;
    table.qrTokenHash = tokenHash;
    await table.save();

    // Broadcast real-time update to global and pos channels
    io.to(`${hotelId}_global`).to(`${hotelId}_pos`).emit('table:status_changed', {
      tableId: table._id.toString(),
      status: table.currentStatus,
      sessionId: session._id.toString(),
    });

    res.status(200).json({
      success: true,
      message: 'Table seated successfully',
      data: {
        tableId: table._id.toString(),
        tableNumber: table.tableNumber,
        sessionId: session._id.toString(),
        sessionToken: ephemeralRawToken,
        status: table.currentStatus,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// 7. Get Dining Menu Items (Public / Protected)
export const getDiningMenu = async (req: Request, res: Response): Promise<void> => {
  try {
    let hotelId = (req as any).hotelId || req.query.hotelId || req.headers['x-hotel-id'];
    if (!hotelId && process.env.NODE_ENV !== 'test') {
      const tenant = (await Tenant.findOne({ slug: 'taj-gateway' })) || (await Tenant.findOne());
      if (tenant) hotelId = tenant._id.toString();
    }

    if (!hotelId) {
      res.status(400).json({ success: false, errorCode: 'HOTEL_ID_REQUIRED', message: 'Missing hotelId' });
      return;
    }

    const { categoryId, foodType, search, inStockOnly } = req.query;
    const filter: any = { hotelId: new Types.ObjectId(hotelId as string) };

    if (categoryId) {
      filter.categoryId = new Types.ObjectId(categoryId as string);
    }
    if (foodType && foodType !== 'ALL') {
      filter.foodType = foodType;
    }
    if (inStockOnly === 'true') {
      filter.isAvailable = true;
    }
    if (search && typeof search === 'string' && search.trim().length > 0) {
      filter.name = { $regex: escapeRegex(search.trim()), $options: 'i' };
    }

    const items = await MenuItem.find(filter)
      .populate('categoryId', 'name')
      .sort({ name: 1 });
    const formatted = items.map((i) => {
      const category = (i as any).categoryId;
      return {
        id: i._id.toString(),
        name: i.name,
        categoryId: category?._id ? category._id.toString() : String(category || ''),
        categoryName: category?.name || 'Main Course',
        foodType: i.foodType,
        basePrice: i.basePrice,
        price: i.basePrice,
        isAvailable: i.isAvailable,
        description: i.description,
        preparationTimeMinutes: i.prepTimeMinutes,
        prepTimeMinutes: i.prepTimeMinutes,
        images: i.images && i.images.length > 0 ? i.images : [
          'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80'
        ],
        hasVariants: i.hasVariants,
        variants: i.variants,
      };
    });

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// 8. Chef / Manager Toggle Item 86 (Out of Stock)
export const toggleItem86 = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId;
    const { itemId } = req.params;
    const { isAvailable, reason, chefName } = req.body;

    const item = await MenuItem.findOne({ _id: itemId, hotelId });
    if (!item) {
      res.status(404).json({ success: false, errorCode: 'ITEM_NOT_FOUND', message: 'Menu item not found' });
      return;
    }

    const newStatus = isAvailable !== undefined ? Boolean(isAvailable) : !item.isAvailable;
    item.isAvailable = newStatus;
    const actor = chefName || req.user?.name || 'Chef on Duty';

    if (!newStatus) {
      item.outOfStockReason = reason || 'INGREDIENT_EXHAUSTED';
      item.markedOutOfStockAt = new Date();
      item.markedOutOfStockBy = actor;
    } else {
      item.outOfStockReason = undefined;
      item.restockedAt = new Date();
      item.restockedBy = actor;
    }

    await item.save();

    const payload = {
      menuItemId: item._id.toString(),
      itemCode: item.itemCode,
      name: item.name,
      isAvailable: item.isAvailable,
      outOfStockReason: item.outOfStockReason,
      markedAt: item.markedOutOfStockAt ? item.markedOutOfStockAt.toISOString() : undefined,
      markedBy: item.markedOutOfStockBy,
      restockedAt: item.restockedAt ? item.restockedAt.toISOString() : undefined,
      restockedBy: item.restockedBy,
      timestamp: Date.now(),
    };

    // Broadcast real-time Item 86 toggle across all operational rooms
    io.to(`${hotelId}_global`)
      .to(`${hotelId}_pos`)
      .to(`${hotelId}_kds`)
      .to(`${hotelId}_waiters`)
      .to(`${hotelId}_customers`)
      .emit('menu:item_86_toggled', payload);

    io.to(`${hotelId}_global`)
      .to(`${hotelId}_pos`)
      .to(`${hotelId}_kds`)
      .to(`${hotelId}_waiters`)
      .to(`${hotelId}_customers`)
      .emit('menu:item:86', payload);

    res.status(200).json({
      success: true,
      message: `Item '${item.name}' is now ${item.isAvailable ? 'IN STOCK' : 'OUT OF STOCK (86)'}`,
      data: {
        id: item._id.toString(),
        name: item.name,
        isAvailable: item.isAvailable,
        outOfStockReason: item.outOfStockReason,
        markedOutOfStockAt: item.markedOutOfStockAt,
        markedOutOfStockBy: item.markedOutOfStockBy,
        restockedAt: item.restockedAt,
        restockedBy: item.restockedBy,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// 8b. Get All 86 (Out of Stock) Items for Kitchen/Floor
export const get86MenuItems = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId;
    if (!hotelId) {
      res.status(400).json({ success: false, errorCode: 'TENANT_REQUIRED', message: 'Tenant context required' });
      return;
    }

    const { stationId, categoryId } = req.query;
    const filter: any = { hotelId, isAvailable: false };

    if (stationId) filter.kitchenStationId = stationId;
    if (categoryId) filter.categoryId = categoryId;

    const items = await MenuItem.find(filter)
      .populate('kitchenStationId', 'stationName stationCode')
      .populate({ path: 'categoryId', select: 'name', model: MenuCategory })
      .sort({ markedOutOfStockAt: -1, updatedAt: -1 });

    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// 8c. Batch Toggle 86 (e.g. Station Gas Failure / Bulk Restock)
export const batchToggleItem86 = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId;
    if (!hotelId) {
      res.status(400).json({ success: false, errorCode: 'TENANT_REQUIRED', message: 'Tenant context required' });
      return;
    }

    const { itemIds, isAvailable, reason, chefName } = req.body;
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      res.status(400).json({ success: false, errorCode: 'INVALID_INPUT', message: 'itemIds array required' });
      return;
    }

    const targetStatus = Boolean(isAvailable);
    const actor = chefName || req.user?.name || 'Kitchen Executive';
    const now = new Date();

    const updateDoc: any = {
      isAvailable: targetStatus,
    };

    if (!targetStatus) {
      updateDoc.outOfStockReason = reason || 'INGREDIENT_EXHAUSTED';
      updateDoc.markedOutOfStockAt = now;
      updateDoc.markedOutOfStockBy = actor;
    } else {
      updateDoc.outOfStockReason = null;
      updateDoc.restockedAt = now;
      updateDoc.restockedBy = actor;
    }

    await MenuItem.updateMany(
      { _id: { $in: itemIds }, hotelId },
      { $set: updateDoc }
    );

    const updatedItems = await MenuItem.find({ _id: { $in: itemIds }, hotelId });

    for (const it of updatedItems) {
      const payload = {
        menuItemId: it._id.toString(),
        itemCode: it.itemCode,
        name: it.name,
        isAvailable: it.isAvailable,
        outOfStockReason: it.outOfStockReason,
        markedAt: it.markedOutOfStockAt ? it.markedOutOfStockAt.toISOString() : undefined,
        markedBy: it.markedOutOfStockBy,
        restockedAt: it.restockedAt ? it.restockedAt.toISOString() : undefined,
        restockedBy: it.restockedBy,
        timestamp: Date.now(),
      };

      io.to(`${hotelId}_global`)
        .to(`${hotelId}_pos`)
        .to(`${hotelId}_kds`)
        .to(`${hotelId}_waiters`)
        .to(`${hotelId}_customers`)
        .emit('menu:item_86_toggled', payload);

      io.to(`${hotelId}_global`)
        .to(`${hotelId}_pos`)
        .to(`${hotelId}_kds`)
        .to(`${hotelId}_waiters`)
        .to(`${hotelId}_customers`)
        .emit('menu:item:86', payload);
    }

    res.status(200).json({
      success: true,
      message: `Successfully updated ${updatedItems.length} items to ${targetStatus ? 'IN STOCK' : 'OUT OF STOCK (86)'}`,
      updatedCount: updatedItems.length,
      data: updatedItems,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// 9. Get Kitchen Stations for Tenant
export const getKitchenStations = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId;
    if (!hotelId) {
      res.status(400).json({ success: false, errorCode: 'TENANT_REQUIRED', message: 'Tenant ID required' });
      return;
    }

    const stations = await KitchenStation.find({ hotelId }).sort({ stationName: 1 });
    res.status(200).json({
      success: true,
      data: stations,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// 10. Get Active KDS Orders with Station and Status Filtering
export const getKdsOrders = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId;
    if (!hotelId) {
      res.status(400).json({ success: false, errorCode: 'TENANT_REQUIRED', message: 'Tenant ID required' });
      return;
    }

    const { stationId, status } = req.query;
    const filter: any = { hotelId };

    if (status && status !== 'ALL') {
      filter.orderStatus = status;
    } else {
      filter.orderStatus = {
        $in: [
          OverallOrderStatus.PLACED,
          OverallOrderStatus.ACCEPTED,
          OverallOrderStatus.PREPARING,
          OverallOrderStatus.READY,
        ],
      };
    }

    if (stationId && stationId !== 'ALL') {
      filter['items.kitchenStationId'] = new Types.ObjectId(stationId as string);
    }

    const orders = await RestaurantOrder.find(filter)
      .populate('tableId', 'tableNumber section floor')
      .populate('roomId', 'roomNumber')
      .sort({ placedAt: 1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// 10b. Recent completed orders for floor dashboards (waiter / cashier / KDS).
export const getRecentOrders = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId;
    if (!hotelId) {
      res.status(400).json({ success: false, errorCode: 'TENANT_REQUIRED', message: 'Tenant ID required' });
      return;
    }

    const limit = Math.max(1, Math.min(25, Number(req.query.limit || 8)));
    const requestedStatus = String(req.query.status || 'SERVED').toUpperCase();
    const filter: any = { hotelId };

    if (requestedStatus === 'ALL') {
      filter.orderStatus = { $ne: OverallOrderStatus.CANCELLED };
    } else {
      filter.orderStatus = requestedStatus;
    }

    const orders = await RestaurantOrder.find(filter)
      .populate('tableId', 'tableNumber section floorLevel')
      .populate('roomId', 'roomNumber')
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();

    const rows = orders.map((order: any) => {
      const total = (order.items || []).reduce(
        (sum: number, item: any) => sum + Number(item.subtotal || item.unitPrice * item.quantity || 0),
        0
      );
      const itemCount = (order.items || []).reduce(
        (sum: number, item: any) => sum + Number(item.quantity || 0),
        0
      );
      const tableNumber = order.tableId?.tableNumber || order.tableNumber || null;
      const roomNumber = order.roomId?.roomNumber || order.roomNumber || null;

      return {
        id: String(order._id),
        orderNumber: order.orderNumber,
        orderStatus: order.orderStatus,
        orderType: order.orderType,
        tableNumber,
        roomNumber,
        location: tableNumber ? `Table ${tableNumber}` : roomNumber ? `Room ${roomNumber}` : 'POS Counter',
        itemCount,
        total,
        placedAt: order.placedAt,
        servedAt: order.servedAt,
        updatedAt: order.updatedAt,
      };
    });

    res.status(200).json({ success: true, count: rows.length, data: rows });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// 11. Merge Dining Tables into Unified Parent Session (e.g. Table 3 + Table 4)
export const mergeDiningTables = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId;
    if (!hotelId) {
      res.status(400).json({ success: false, errorCode: 'TENANT_REQUIRED', message: 'Tenant ID required' });
      return;
    }

    const { primaryTableId, secondaryTableIds, mergedBy } = req.body;

    if (!primaryTableId || !Types.ObjectId.isValid(primaryTableId)) {
      res.status(400).json({ success: false, errorCode: 'INVALID_PRIMARY_TABLE', message: 'Valid primaryTableId is required' });
      return;
    }

    if (!Array.isArray(secondaryTableIds) || secondaryTableIds.length === 0) {
      res.status(400).json({ success: false, errorCode: 'INVALID_SECONDARY_TABLES', message: 'At least one secondaryTableId is required' });
      return;
    }

    for (const secId of secondaryTableIds) {
      if (!Types.ObjectId.isValid(secId)) {
        res.status(400).json({ success: false, errorCode: 'INVALID_SECONDARY_TABLE_ID', message: `Invalid secondary table ID: ${secId}` });
        return;
      }
    }

    if (secondaryTableIds.includes(primaryTableId)) {
      res.status(400).json({ success: false, errorCode: 'CANNOT_MERGE_SELF', message: 'Primary table cannot be in secondary tables list' });
      return;
    }

    // Find primary table
    const primaryTable = await DiningTable.findOne({ _id: new Types.ObjectId(primaryTableId), hotelId });
    if (!primaryTable) {
      res.status(404).json({ success: false, errorCode: 'PRIMARY_TABLE_NOT_FOUND', message: 'Primary dining table not found' });
      return;
    }

    if (primaryTable.currentStatus === TableStatus.MERGED) {
      res.status(400).json({ success: false, errorCode: 'CANNOT_MERGE_INTO_MERGED_TABLE', message: 'A table already merged into another table cannot be selected as primary' });
      return;
    }

    // Ensure primary table has an active session
    let primarySession: any = null;
    if (primaryTable.activeSessionId) {
      primarySession = await TableSession.findById(primaryTable.activeSessionId);
    }

    if (!primarySession || primarySession.status === SessionStatus.CLOSED || primarySession.status === SessionStatus.SETTLED) {
      const ephemeralRawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(ephemeralRawToken).digest('hex');

      primarySession = await TableSession.create({
        hotelId,
        tableId: primaryTable._id,
        sessionTokenHash: tokenHash,
        status: SessionStatus.ACTIVE,
        guestCount: primaryTable.capacity,
      });

      primaryTable.activeSessionId = primarySession._id as Types.ObjectId;
      primaryTable.currentStatus = TableStatus.OCCUPIED;
    }

    // Find all secondary tables
    const secObjectIds = secondaryTableIds.map((id: string) => new Types.ObjectId(id));
    const secondaryTables = await DiningTable.find({ _id: { $in: secObjectIds }, hotelId });

    if (secondaryTables.length !== secondaryTableIds.length) {
      res.status(404).json({ success: false, errorCode: 'SECONDARY_TABLES_NOT_FOUND', message: 'One or more secondary tables not found in this hotel' });
      return;
    }

    // Check if any secondary table is already merged
    for (const secTable of secondaryTables) {
      if (secTable.currentStatus === TableStatus.MERGED && secTable.mergedIntoTableId && secTable.mergedIntoTableId.toString() !== primaryTable._id.toString()) {
        res.status(400).json({
          success: false,
          errorCode: 'ALREADY_MERGED',
          message: `Table ${secTable.tableNumber} is already merged into another table`,
        });
        return;
      }
    }

    // Consolidate secondary table orders into primary session
    for (const secTable of secondaryTables) {
      if (secTable.activeSessionId && secTable.activeSessionId.toString() !== primarySession._id.toString()) {
        // Re-assign restaurant orders to primary table and primary session
        await RestaurantOrder.updateMany(
          { hotelId, tableSessionId: secTable.activeSessionId },
          { $set: { tableId: primaryTable._id, tableSessionId: primarySession._id } }
        );

        // Close old secondary session
        await TableSession.findByIdAndUpdate(secTable.activeSessionId, { status: SessionStatus.CLOSED });
      }

      // Mark secondary table as MERGED and attach to primary session
      secTable.currentStatus = TableStatus.MERGED;
      secTable.isMerged = true;
      secTable.mergedIntoTableId = primaryTable._id as Types.ObjectId;
      secTable.activeSessionId = primarySession._id as Types.ObjectId;
      await secTable.save();

      // Emit status change for secondary table
      io.to(`${hotelId}_global`).to(`${hotelId}_pos`).emit('table:status_changed', {
        tableId: secTable._id.toString(),
        status: TableStatus.MERGED,
        sessionId: primarySession._id.toString(),
      });
    }

    // Calculate consolidated capacity and table lists
    const existingMergedIds = (primaryTable.mergedTableIds || []).map((id) => id.toString());
    const mergedIdSet = new Set([...existingMergedIds, ...secondaryTableIds]);
    const finalMergedTableIds = Array.from(mergedIdSet).map((id) => new Types.ObjectId(id));

    // Capacity sum: compute authoritative capacity from distinct set of all merged tables
    const allMergedTables = await DiningTable.find({ _id: { $in: finalMergedTableIds }, hotelId });
    const finalMergedTableNumbers = allMergedTables.map((t) => t.tableNumber);
    const secTableNumbers = secondaryTables.map((t) => t.tableNumber);
    const combinedCapacity = primaryTable.capacity + allMergedTables.reduce((acc, t) => acc + (t.capacity || 0), 0);

    // Update primary table
    primaryTable.isMerged = true;
    primaryTable.mergedTableIds = finalMergedTableIds;
    primaryTable.mergedTableNumbers = finalMergedTableNumbers;
    primaryTable.combinedCapacity = combinedCapacity;
    primaryTable.currentStatus = TableStatus.OCCUPIED;
    await primaryTable.save();

    // Update primary session
    primarySession.isMergedSession = true;
    primarySession.mergedTableIds = finalMergedTableIds;
    primarySession.mergedTableNumbers = finalMergedTableNumbers;
    primarySession.mergedAt = new Date();
    primarySession.mergedBy = mergedBy || (req.user as any)?.username || 'Staff';

    // Recalculate session total amount
    const activeOrders = await RestaurantOrder.find({
      hotelId,
      tableSessionId: primarySession._id,
      orderStatus: { $ne: OverallOrderStatus.CANCELLED },
    });
    const totalAmount = activeOrders.reduce((acc, order) => {
      return acc + (order.items || []).reduce((itemAcc, i) => itemAcc + (i.subtotal || i.unitPrice * i.quantity), 0);
    }, 0);
    primarySession.totalAmount = totalAmount;
    await primarySession.save();

    const mergePayload = {
      primaryTableId: primaryTable._id.toString(),
      primaryTableNumber: primaryTable.tableNumber,
      secondaryTableIds,
      secondaryTableNumbers: secTableNumbers,
      allMergedTableNumbers: finalMergedTableNumbers,
      combinedCapacity,
      activeSessionId: primarySession._id.toString(),
      mergedBy: primarySession.mergedBy,
      timestamp: Date.now(),
    };

    // Broadcast table:merged across staff, floor plan & POS channels
    io.to(`${hotelId}_global`)
      .to(`${hotelId}_pos`)
      .to(`${hotelId}_waiters`)
      .emit('table:merged', mergePayload);

    io.to(`${hotelId}_global`).to(`${hotelId}_pos`).emit('table:status_changed', {
      tableId: primaryTable._id.toString(),
      status: primaryTable.currentStatus,
      sessionId: primarySession._id.toString(),
    });

    res.status(200).json({
      success: true,
      message: `Tables [${secTableNumbers.join(', ')}] successfully merged into Table ${primaryTable.tableNumber}`,
      data: {
        primaryTable: {
          id: primaryTable._id.toString(),
          tableNumber: primaryTable.tableNumber,
          isMerged: primaryTable.isMerged,
          mergedTableNumbers: primaryTable.mergedTableNumbers,
          combinedCapacity: primaryTable.combinedCapacity,
          activeSessionId: primaryTable.activeSessionId ? primaryTable.activeSessionId.toString() : undefined,
          status: primaryTable.currentStatus,
        },
        secondaryTables: secondaryTables.map((t) => ({
          id: t._id.toString(),
          tableNumber: t.tableNumber,
          isMerged: t.isMerged,
          mergedIntoTableId: t.mergedIntoTableId ? t.mergedIntoTableId.toString() : undefined,
          status: t.currentStatus,
        })),
        session: {
          sessionId: primarySession._id.toString(),
          isMergedSession: primarySession.isMergedSession,
          mergedTableNumbers: primarySession.mergedTableNumbers,
          totalAmount: primarySession.totalAmount,
        },
        combinedCapacity,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// 12. Split / Unmerge Dining Tables (Restore to Independent Capacity & Floor Plan State)
export const splitDiningTables = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId;
    if (!hotelId) {
      res.status(400).json({ success: false, errorCode: 'TENANT_REQUIRED', message: 'Tenant ID required' });
      return;
    }

    const { primaryTableId, unmergeTableIds, splitBy } = req.body;

    if (!primaryTableId || !Types.ObjectId.isValid(primaryTableId)) {
      res.status(400).json({ success: false, errorCode: 'INVALID_PRIMARY_TABLE', message: 'Valid primaryTableId is required' });
      return;
    }

    const primaryTable = await DiningTable.findOne({ _id: new Types.ObjectId(primaryTableId), hotelId });
    if (!primaryTable) {
      res.status(404).json({ success: false, errorCode: 'PRIMARY_TABLE_NOT_FOUND', message: 'Primary dining table not found' });
      return;
    }

    if (!primaryTable.isMerged || !primaryTable.mergedTableIds || primaryTable.mergedTableIds.length === 0) {
      res.status(400).json({ success: false, errorCode: 'TABLE_NOT_MERGED', message: 'Specified table has no merged secondary tables' });
      return;
    }

    // Determine which tables to unmerge (either specific list or all)
    let tablesToUnmergeObjectIds: Types.ObjectId[] = [];
    if (Array.isArray(unmergeTableIds) && unmergeTableIds.length > 0) {
      for (const id of unmergeTableIds) {
        if (!Types.ObjectId.isValid(id)) {
          res.status(400).json({ success: false, errorCode: 'INVALID_UNMERGE_ID', message: `Invalid unmerge ID: ${id}` });
          return;
        }
      }
      tablesToUnmergeObjectIds = unmergeTableIds.map((id: string) => new Types.ObjectId(id));
    } else {
      tablesToUnmergeObjectIds = primaryTable.mergedTableIds;
    }

    const tablesToUnmergeStringIds = tablesToUnmergeObjectIds.map((id) => id.toString());

    // Restore secondary tables to AVAILABLE
    const restoredTables = await DiningTable.find({ _id: { $in: tablesToUnmergeObjectIds }, hotelId });
    for (const secTable of restoredTables) {
      secTable.currentStatus = TableStatus.AVAILABLE;
      secTable.isMerged = false;
      secTable.mergedIntoTableId = undefined;
      secTable.activeSessionId = undefined;
      secTable.qrTokenHash = undefined;
      await secTable.save();

      io.to(`${hotelId}_global`).to(`${hotelId}_pos`).emit('table:status_changed', {
        tableId: secTable._id.toString(),
        status: TableStatus.AVAILABLE,
      });
    }

    // Update primary table merged lists
    const remainingMergedTableIds = (primaryTable.mergedTableIds || []).filter(
      (id) => !tablesToUnmergeStringIds.includes(id.toString())
    );

    const unmergedNumbers = restoredTables.map((t) => t.tableNumber);
    const remainingMergedTableNumbers = (primaryTable.mergedTableNumbers || []).filter(
      (num) => !unmergedNumbers.includes(num)
    );

    // Compute remaining capacity
    let remainingCapacity = primaryTable.capacity;
    if (remainingMergedTableIds.length > 0) {
      const remainingSecTables = await DiningTable.find({ _id: { $in: remainingMergedTableIds }, hotelId });
      remainingCapacity = primaryTable.capacity + remainingSecTables.reduce((acc, t) => acc + (t.capacity || 0), 0);
      primaryTable.isMerged = true;
      primaryTable.mergedTableIds = remainingMergedTableIds;
      primaryTable.mergedTableNumbers = remainingMergedTableNumbers;
      primaryTable.combinedCapacity = remainingCapacity;
    } else {
      primaryTable.isMerged = false;
      primaryTable.mergedTableIds = [];
      primaryTable.mergedTableNumbers = [];
      primaryTable.combinedCapacity = primaryTable.capacity;
    }
    await primaryTable.save();

    // Update primary session
    if (primaryTable.activeSessionId) {
      const primarySession = await TableSession.findById(primaryTable.activeSessionId);
      if (primarySession) {
        if (remainingMergedTableIds.length > 0) {
          primarySession.isMergedSession = true;
          primarySession.mergedTableIds = remainingMergedTableIds;
          primarySession.mergedTableNumbers = remainingMergedTableNumbers;
        } else {
          primarySession.isMergedSession = false;
          primarySession.mergedTableIds = [];
          primarySession.mergedTableNumbers = [];
        }
        await primarySession.save();
      }
    }

    const splitPayload = {
      primaryTableId: primaryTable._id.toString(),
      primaryTableNumber: primaryTable.tableNumber,
      unmergedTableIds: tablesToUnmergeStringIds,
      unmergedTableNumbers: unmergedNumbers,
      remainingMergedTableIds: remainingMergedTableIds.map((id) => id.toString()),
      remainingMergedTableNumbers,
      splitBy: splitBy || (req.user as any)?.username || 'Staff',
      timestamp: Date.now(),
    };

    io.to(`${hotelId}_global`)
      .to(`${hotelId}_pos`)
      .to(`${hotelId}_waiters`)
      .emit('table:unmerged', splitPayload);

    io.to(`${hotelId}_global`)
      .to(`${hotelId}_pos`)
      .to(`${hotelId}_waiters`)
      .emit('table:split', splitPayload);

    io.to(`${hotelId}_global`).to(`${hotelId}_pos`).emit('table:status_changed', {
      tableId: primaryTable._id.toString(),
      status: primaryTable.currentStatus,
      sessionId: primaryTable.activeSessionId ? primaryTable.activeSessionId.toString() : undefined,
    });

    res.status(200).json({
      success: true,
      message: `Tables [${unmergedNumbers.join(', ')}] successfully unmerged from Table ${primaryTable.tableNumber}`,
      data: {
        primaryTable: {
          id: primaryTable._id.toString(),
          tableNumber: primaryTable.tableNumber,
          isMerged: primaryTable.isMerged,
          mergedTableNumbers: primaryTable.mergedTableNumbers,
          combinedCapacity: primaryTable.combinedCapacity,
          status: primaryTable.currentStatus,
        },
        unmergedTables: restoredTables.map((t) => ({
          id: t._id.toString(),
          tableNumber: t.tableNumber,
          isMerged: t.isMerged,
          status: t.currentStatus,
        })),
        remainingMergedTableIds: remainingMergedTableIds.map((id) => id.toString()),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// ==========================================
// Kitchen Buzzer & Intercom Dispatcher
// ==========================================

export interface KitchenBuzzerRecord {
  id: string;
  hotelId: string;
  station: string;
  table: string;
  message: string;
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
  waiterName: string;
  waiterId: string;
  status: 'PENDING' | 'ACKNOWLEDGED';
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

export const inMemoryKitchenBuzzers: KitchenBuzzerRecord[] = [
  {
    id: 'buzz-1',
    hotelId: '6ac0c0012b6d940a98ae20c6',
    station: 'Executive Chef Pass',
    table: 'Table 8',
    message: 'Rush order alert! Guest has early flight',
    priority: 'URGENT',
    waiterName: 'Ramesh K.',
    waiterId: 'W-102',
    status: 'ACKNOWLEDGED',
    createdAt: new Date(Date.now() - 35 * 60000).toISOString(),
    acknowledgedAt: new Date(Date.now() - 32 * 60000).toISOString(),
    acknowledgedBy: 'Executive Chef',
  },
  {
    id: 'buzz-2',
    hotelId: '6ac0c0012b6d940a98ae20c6',
    station: 'Tandoor Station',
    table: 'Table 5',
    message: 'Make Naan extra crisp & well done',
    priority: 'HIGH',
    waiterName: 'Ravi Kumar',
    waiterId: 'W-101',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
  },
];

export const postKitchenBuzzer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { hotelId, station, table, message, priority, waiterName, waiterId } = req.body;
    const hId = hotelId || '6ac0c0012b6d940a98ae20c6';

    const newBuzzer: KitchenBuzzerRecord = {
      id: `buzz-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      hotelId: hId,
      station: station || 'Executive Chef Pass',
      table: table || 'Table 5',
      message: message || 'Attention Kitchen Hot Pass!',
      priority: priority || 'HIGH',
      waiterName: waiterName || 'Floor Waiter',
      waiterId: waiterId || 'W-101',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    inMemoryKitchenBuzzers.unshift(newBuzzer);
    if (inMemoryKitchenBuzzers.length > 50) inMemoryKitchenBuzzers.pop();

    console.log(`🚨 [Kitchen Buzzer Created] ${newBuzzer.station} from ${newBuzzer.waiterName} for ${newBuzzer.table}: ${newBuzzer.message}`);

    // Realtime broadcast to KDS, Kitchen terminals, Waiters, and Global room
    io.to(`${hId}_kds`).to(`${hId}_kitchen`).emit('kitchen:buzzer', newBuzzer);
    io.to(`${hId}_waiters`).to(`${hId}_waiter`).to(`${hId}_global`).emit('kitchen:buzzer', newBuzzer);

    res.status(201).json({
      success: true,
      message: 'Kitchen buzzer dispatched successfully',
      data: newBuzzer,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getKitchenBuzzers = async (req: Request, res: Response): Promise<void> => {
  try {
    const hotelId = req.query.hotelId as string;
    const filtered = hotelId
      ? inMemoryKitchenBuzzers.filter((b) => b.hotelId === hotelId || !b.hotelId)
      : inMemoryKitchenBuzzers;

    res.status(200).json({
      success: true,
      data: filtered,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const acknowledgeKitchenBuzzer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { chefName } = req.body;

    const buzzer = inMemoryKitchenBuzzers.find((b) => b.id === id);
    if (!buzzer) {
      res.status(404).json({ success: false, message: 'Buzzer not found' });
      return;
    }

    buzzer.status = 'ACKNOWLEDGED';
    buzzer.acknowledgedAt = new Date().toISOString();
    buzzer.acknowledgedBy = chefName || 'Executive Chef Suresh';

    const hId = buzzer.hotelId || '6ac0c0012b6d940a98ae20c6';
    console.log(`✅ [Kitchen Buzzer Acknowledged] Buzzer ${id} acknowledged by ${buzzer.acknowledgedBy}`);

    io.to(`${hId}_kds`).to(`${hId}_kitchen`).emit('kitchen:buzzer_ack', buzzer);
    io.to(`${hId}_waiters`).to(`${hId}_waiter`).to(`${hId}_global`).emit('kitchen:buzzer_ack', buzzer);

    res.status(200).json({
      success: true,
      message: 'Kitchen buzzer acknowledged',
      data: buzzer,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
