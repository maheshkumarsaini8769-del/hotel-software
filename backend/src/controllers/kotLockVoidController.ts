import { Response } from 'express';
import { Types } from 'mongoose';
import argon2 from 'argon2';
import { TenantRequest, UserRole } from '../types';
import { KotVoidAudit, KotVoidReason, WasteDisposition } from '../models/KotVoidAudit';
import { RestaurantOrder, OverallOrderStatus, ItemProductionStatus } from '../models/RestaurantOrder';
import { RestaurantBill, BillStatus } from '../models/RestaurantBill';
import { User } from '../models/User';
import { DiningTable } from '../models/DiningTable';

/**
 * 1. Authorize & Void KOT Item using Manager Security PIN
 * POST /api/v1/kot-void/item
 */
export const voidKotItem = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const {
      orderId,
      itemId,
      managerPin,
      managerUserId,
      voidReason,
      wasteDisposition,
      notes,
    } = req.body;

    // 1. Mandatory Parameters Validation
    if (!orderId || !itemId) {
      res.status(400).json({
        success: false,
        errorCode: 'MISSING_ORDER_OR_ITEM_ID',
        message: 'Both orderId and itemId are required to void an item',
      });
      return;
    }

    if (!managerPin || typeof managerPin !== 'string' || managerPin.trim().length < 4) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_MANAGER_PIN_FORMAT',
        message: 'A valid manager security PIN (minimum 4 digits) is mandatory to void KOT items',
      });
      return;
    }

    if (!voidReason || !Object.values(KotVoidReason).includes(voidReason)) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_VOID_REASON',
        message: `Valid voidReason is required (${Object.values(KotVoidReason).join(', ')})`,
      });
      return;
    }

    if (!wasteDisposition || !Object.values(WasteDisposition).includes(wasteDisposition)) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_WASTE_DISPOSITION',
        message: `Valid wasteDisposition is required (${Object.values(WasteDisposition).join(', ')})`,
      });
      return;
    }

    // 2. Cryptographic Manager PIN Authentication
    let verifiedManager: any = null;
    if (managerUserId && Types.ObjectId.isValid(managerUserId)) {
      const specificManager = await User.findOne({
        _id: new Types.ObjectId(managerUserId),
        hotelId,
        role: { $in: [UserRole.MANAGER, UserRole.HOTEL_ADMIN, UserRole.SUPERADMIN] },
        isActive: true,
      });

      if (specificManager && specificManager.pinCodeHash) {
        const matches = await argon2.verify(specificManager.pinCodeHash, managerPin.trim());
        if (matches) {
          verifiedManager = specificManager;
        }
      }
    } else {
      // Find candidate managers/admins within this tenant
      const managers = await User.find({
        hotelId,
        role: { $in: [UserRole.MANAGER, UserRole.HOTEL_ADMIN, UserRole.SUPERADMIN] },
        isActive: true,
      });

      for (const m of managers) {
        if (m.pinCodeHash) {
          const matches = await argon2.verify(m.pinCodeHash, managerPin.trim());
          if (matches) {
            verifiedManager = m;
            break;
          }
        }
      }
    }

    if (!verifiedManager) {
      res.status(401).json({
        success: false,
        errorCode: 'INVALID_MANAGER_PIN',
        message: 'Security authorization failed: Invalid Manager PIN provided',
      });
      return;
    }

    // 3. Find and Validate Target Order
    const order = await RestaurantOrder.findOne({
      _id: new Types.ObjectId(orderId),
      hotelId,
    });

    if (!order) {
      res.status(404).json({
        success: false,
        errorCode: 'ORDER_NOT_FOUND',
        message: 'Restaurant order not found in current hotel context',
      });
      return;
    }

    if (
      order.orderStatus === OverallOrderStatus.SERVED ||
      order.orderStatus === OverallOrderStatus.CANCELLED
    ) {
      res.status(400).json({
        success: false,
        errorCode: 'ORDER_NOT_ACTIVE',
        message: `Cannot void items from an order with status ${order.orderStatus}`,
      });
      return;
    }

    // 4. Locate Item within Order
    const targetItemIndex = order.items.findIndex(
      (it: any) =>
        it._id?.toString() === itemId ||
        it.id?.toString() === itemId ||
        it.menuItemId?.toString() === itemId
    );

    if (targetItemIndex === -1) {
      res.status(404).json({
        success: false,
        errorCode: 'ITEM_NOT_FOUND_IN_ORDER',
        message: `Item ${itemId} not found in order ${order.orderNumber}`,
      });
      return;
    }

    const targetItem = order.items[targetItemIndex] as any;
    if (targetItem.itemStatus === ItemProductionStatus.CANCELLED) {
      res.status(400).json({
        success: false,
        errorCode: 'ITEM_ALREADY_VOIDED',
        message: 'This item has already been voided/cancelled previously',
      });
      return;
    }

    // 5. Calculate Financial Impact & Apply Void
    const itemUnitPrice = targetItem.price || targetItem.unitPrice || 0;
    const itemQuantity = targetItem.quantity || 1;
    const totalVoidAmount = Math.round(itemUnitPrice * itemQuantity);

    // Update item status to CANCELLED
    targetItem.itemStatus = ItemProductionStatus.CANCELLED;
    targetItem.specialInstructions = targetItem.specialInstructions
      ? `${targetItem.specialInstructions} [VOIDED: ${voidReason}]`
      : `[VOIDED: ${voidReason}]`;

    // Check if all remaining items are cancelled
    const activeItems = order.items.filter((it: any) => it.itemStatus !== ItemProductionStatus.CANCELLED);
    if (activeItems.length === 0) {
      order.orderStatus = OverallOrderStatus.CANCELLED;
    }

    await order.save();

    // 6. Recalculate Restaurant Bill if already generated
    let updatedBill: any = null;
    const existingBill = await RestaurantBill.findOne({
      hotelId,
      orderIds: order._id,
      billStatus: { $ne: BillStatus.PAID },
    });

    if (existingBill) {
      // Recalculate subtotal from active items
      let newSubTotal = 0;
      const allOrders = await RestaurantOrder.find({
        _id: { $in: existingBill.orderIds },
        hotelId,
      });

      for (const ord of allOrders) {
        for (const itm of ord.items) {
          if ((itm as any).itemStatus !== ItemProductionStatus.CANCELLED) {
            newSubTotal += ((itm as any).price || (itm as any).unitPrice || 0) * ((itm as any).quantity || 1);
          }
        }
      }

      const taxRate = existingBill.subTotal > 0 ? (existingBill.totalTax / existingBill.subTotal) : 0.05;
      const newTax = Math.round(newSubTotal * taxRate);
      const newGrandTotal = Math.max(0, newSubTotal + newTax - (existingBill.discountAmount || 0));

      existingBill.subTotal = newSubTotal;
      existingBill.totalTax = newTax;
      existingBill.grandTotal = newGrandTotal;
      existingBill.dueAmount = Math.max(0, newGrandTotal - (existingBill.paidAmount || 0));

      if (newGrandTotal === 0 && existingBill.paidAmount === 0) {
        existingBill.billStatus = BillStatus.VOID;
      }

      await existingBill.save();
      updatedBill = existingBill;
    }

    // 7. Create Permanent Immutable Void Audit Record
    const voidAudit = await KotVoidAudit.create({
      hotelId,
      orderId: order._id,
      orderNumber: order.orderNumber,
      tableNumber: (order as any).tableNumber || 'N/A',
      itemId: targetItem._id || targetItem.menuItemId,
      menuItemId: targetItem.menuItemId,
      itemName: targetItem.name,
      quantity: itemQuantity,
      unitPrice: itemUnitPrice,
      totalVoidAmount,
      voidReason,
      wasteDisposition,
      authorizedByManagerUserId: verifiedManager._id,
      managerName: verifiedManager.name || verifiedManager.email,
      waiterUserId: req.user?.userId ? new Types.ObjectId(req.user.userId) : undefined,
      waiterName: req.user?.name || 'Staff Handheld',
      kitchenNotified: true,
      notes: notes || undefined,
    });

    // 8. Emit Real-time Socket Alert to Kitchen KDS & Admin Screen
    const io = req.app?.get('io');
    if (io) {
      const socketPayload = {
        auditId: voidAudit._id,
        orderId: order._id,
        orderNumber: order.orderNumber,
        tableNumber: (order as any).tableNumber || 'N/A',
        itemId: targetItem._id || targetItem.menuItemId,
        itemName: targetItem.name,
        quantity: itemQuantity,
        voidReason,
        wasteDisposition,
        managerName: voidAudit.managerName,
        timestamp: voidAudit.createdAt,
      };

      io.to(`${hotelId.toString()}_kds`).emit('kot_item_voided', socketPayload);
      io.to(`${hotelId.toString()}_admin`).emit('kot_item_voided', socketPayload);
    }

    res.status(200).json({
      success: true,
      message: `Item '${targetItem.name}' successfully voided under authorization of Manager ${verifiedManager.name}`,
      voidAudit,
      order,
      bill: updatedBill,
    });
  } catch (error: any) {
    console.error('[KotVoidController] Error voiding KOT item:', error);
    res.status(500).json({
      success: false,
      errorCode: 'VOID_ITEM_FAILED',
      message: error.message || 'Internal server error while voiding KOT item',
    });
  }
};

/**
 * 2. Get Void Audit Logs with Filtering
 * GET /api/v1/kot-void/audit-logs
 */
export const getVoidAuditLogs = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const {
      startDate,
      endDate,
      managerUserId,
      voidReason,
      wasteDisposition,
      limit = '50',
      skip = '0',
    } = req.query;

    const filter: any = { hotelId };

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(`${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(`${endDate}T23:59:59.999Z`);
      }
    }

    if (managerUserId && Types.ObjectId.isValid(managerUserId as string)) {
      filter.authorizedByManagerUserId = new Types.ObjectId(managerUserId as string);
    }

    if (voidReason) {
      filter.voidReason = voidReason;
    }

    if (wasteDisposition) {
      filter.wasteDisposition = wasteDisposition;
    }

    const totalCount = await KotVoidAudit.countDocuments(filter);
    const logs = await KotVoidAudit.find(filter)
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      totalCount,
      logs,
    });
  } catch (error: any) {
    console.error('[KotVoidController] Error fetching void audit logs:', error);
    res.status(500).json({
      success: false,
      errorCode: 'FETCH_VOID_LOGS_FAILED',
      message: error.message || 'Internal server error fetching void logs',
    });
  }
};

/**
 * 3. Get Daily Void Summary & Food Waste Statistics
 * GET /api/v1/kot-void/daily-summary
 */
export const getDailyVoidSummary = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const dateStr = (req.query.date as string) || new Date().toISOString().slice(0, 10);
    const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
    const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);

    const dailyLogs = await KotVoidAudit.find({
      hotelId,
      createdAt: { $gte: dayStart, $lte: dayEnd },
    });

    let totalVoidValue = 0;
    let totalScrappedWasteCost = 0;
    const reasonBreakdown: Record<string, number> = {};
    const dispositionBreakdown: Record<string, number> = {};
    const itemVoidFrequency: Record<string, { itemName: string; count: number; totalAmount: number }> = {};

    dailyLogs.forEach((log) => {
      totalVoidValue += log.totalVoidAmount || 0;
      if (log.wasteDisposition === WasteDisposition.WASTED_SCRAPPED) {
        totalScrappedWasteCost += log.totalVoidAmount || 0;
      }

      reasonBreakdown[log.voidReason] = (reasonBreakdown[log.voidReason] || 0) + 1;
      dispositionBreakdown[log.wasteDisposition] = (dispositionBreakdown[log.wasteDisposition] || 0) + 1;

      const key = log.menuItemId.toString();
      if (!itemVoidFrequency[key]) {
        itemVoidFrequency[key] = { itemName: log.itemName, count: 0, totalAmount: 0 };
      }
      itemVoidFrequency[key].count += log.quantity;
      itemVoidFrequency[key].totalAmount += log.totalVoidAmount;
    });

    const topVoidedItems = Object.values(itemVoidFrequency)
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5);

    res.status(200).json({
      success: true,
      date: dateStr,
      totalVoidEvents: dailyLogs.length,
      totalVoidValue,
      totalScrappedWasteCost,
      reasonBreakdown,
      dispositionBreakdown,
      topVoidedItems,
    });
  } catch (error: any) {
    console.error('[KotVoidController] Error fetching daily void summary:', error);
    res.status(500).json({
      success: false,
      errorCode: 'FETCH_VOID_SUMMARY_FAILED',
      message: error.message || 'Internal server error fetching void summary',
    });
  }
};
