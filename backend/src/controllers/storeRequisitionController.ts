import { Response } from 'express';
import { Types } from 'mongoose';
import {
  StoreRequisition,
  RequisitionDepartment,
  RequisitionUrgency,
  RequisitionStatus,
} from '../models/StoreRequisition';
import { StockTransfer, TransferStatus } from '../models/StockTransfer';
import { StockBatch, BatchFreshnessStatus } from '../models/StockBatch';
import { TenantRequest } from '../types';
import { escapeRegex } from '../utils/security';

// 1. Get Store Requisitions & Kitchen Indent Pipeline
export const getRequisitions = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { status, department, urgency } = req.query;
    const filter: any = { hotelId };

    if (status && typeof status === 'string' && status !== 'ALL') {
      filter.status = status;
    }
    if (department && typeof department === 'string' && department !== 'ALL') {
      filter.requestingDepartment = department;
    }
    if (urgency && typeof urgency === 'string' && urgency !== 'ALL') {
      filter.urgency = urgency;
    }

    const requisitions = await StoreRequisition.find(filter)
      .populate('requestedByUserId', 'name role')
      .populate('issuedByUserId', 'name role')
      .populate('kitchenStationId', 'stationName')
      .sort({ urgency: -1, createdAt: -1 });

    // Calculate Requisition Metrics
    let totalPendingCount = 0;
    let criticalCount = 0;
    let fulfilledTodayCount = 0;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    requisitions.forEach((r) => {
      if (r.status === RequisitionStatus.PENDING) totalPendingCount++;
      if (r.urgency === RequisitionUrgency.CRITICAL_SERVICE_BLOCKER && r.status === RequisitionStatus.PENDING) {
        criticalCount++;
      }
      if (r.status === RequisitionStatus.APPROVED_ISSUED && r.issuedAt && r.issuedAt >= startOfToday) {
        fulfilledTodayCount++;
      }
    });

    res.status(200).json({
      success: true,
      metrics: {
        totalPendingCount,
        criticalCount,
        fulfilledTodayCount,
        totalCount: requisitions.length,
      },
      requisitions,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 2. Chef Submits Store Requisition (Indent)
export const createRequisition = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const {
      requestingDepartment = RequisitionDepartment.MAIN_KITCHEN,
      kitchenStationId,
      urgency = RequisitionUrgency.NORMAL,
      items,
      notes,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, errorCode: 'EMPTY_ITEMS', message: 'At least one item required in indent' });
      return;
    }

    const resolvedItems = items.map((it: any) => ({
      itemName: it.itemName,
      requestedQuantity: Number(it.requestedQuantity) || 1,
      issuedQuantity: 0,
      unit: it.unit || 'kg',
      unitCost: Number(it.unitCost) || 0,
      status: 'PENDING',
    }));

    const requisitionNumber = `REQ-${Date.now().toString().slice(-5)}`;

    const requisition = new StoreRequisition({
      hotelId,
      requisitionNumber,
      requestingDepartment,
      kitchenStationId: kitchenStationId ? new Types.ObjectId(kitchenStationId) : undefined,
      requestedByUserId: req.user?.userId ? new Types.ObjectId(req.user.userId) : new Types.ObjectId(),
      urgency,
      status: RequisitionStatus.PENDING,
      items: resolvedItems,
      notes,
    });
    await requisition.save();

    res.status(201).json({
      success: true,
      message: `Store requisition ${requisitionNumber} raised successfully`,
      requisition,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 3. Storekeeper Issues Stock Against Requisition
export const issueRequisition = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const reqId = String(req.params.reqId);

    const requisition = await StoreRequisition.findOne({ _id: new Types.ObjectId(reqId), hotelId });
    if (!requisition) {
      res.status(404).json({ success: false, errorCode: 'REQ_NOT_FOUND', message: 'Requisition not found' });
      return;
    }

    const { issuedItems } = req.body; // Array<{ itemName: string, issuedQuantity: number, status?: 'ISSUED' | 'OUT_OF_STOCK' }>

    let allFulfilled = true;

    if (issuedItems && Array.isArray(issuedItems)) {
      issuedItems.forEach((iss: any) => {
        const itemIndex = requisition.items.findIndex(
          (it) => it.itemName.toLowerCase() === iss.itemName.toLowerCase()
        );
        if (itemIndex > -1) {
          const issuedQty = Number(iss.issuedQuantity) || 0;
          requisition.items[itemIndex].issuedQuantity = issuedQty;
          requisition.items[itemIndex].status = iss.status || (issuedQty >= requisition.items[itemIndex].requestedQuantity ? 'ISSUED' : 'OUT_OF_STOCK');

          if (issuedQty < requisition.items[itemIndex].requestedQuantity) {
            allFulfilled = false;
          }
        }
      });
    } else {
      // Default: 100% fulfillment
      requisition.items.forEach((it) => {
        it.issuedQuantity = it.requestedQuantity;
        it.status = 'ISSUED';
      });
    }

    requisition.status = allFulfilled ? RequisitionStatus.APPROVED_ISSUED : RequisitionStatus.APPROVED_PARTIALLY;
    requisition.issuedByUserId = req.user?.userId ? new Types.ObjectId(req.user.userId) : undefined;
    requisition.issuedAt = new Date();
    await requisition.save();

    // Authoritative Physical Inventory Sync: Decrement StockBatch following FEFO
    for (const item of requisition.items) {
      let qtyToDeduct = item.issuedQuantity || 0;
      if (qtyToDeduct <= 0) continue;

      const batches = await StockBatch.find({
        hotelId,
        itemName: new RegExp(`^${escapeRegex(item.itemName)}$`, 'i'),
        currentQuantity: { $gt: 0 },
      }).sort({ expiryDate: 1 });

      for (const batch of batches) {
        if (qtyToDeduct <= 0) break;
        const deduct = Math.min(batch.currentQuantity, qtyToDeduct);
        batch.currentQuantity -= deduct;
        qtyToDeduct -= deduct;
        await batch.save();
      }
    }

    res.status(200).json({
      success: true,
      message: `Requisition ${requisition.requisitionNumber} fulfilled (${requisition.status})`,
      requisition,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 4. Create Inter-Kitchen / Inter-Outlet Stock Transfer
export const createStockTransfer = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { sourceLocation, destinationLocation, items, notes } = req.body;

    if (!sourceLocation || !destinationLocation || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, errorCode: 'INVALID_PAYLOAD', message: 'Source, destination, and items required' });
      return;
    }

    const transferNumber = `TRF-${Date.now().toString().slice(-5)}`;

    const transfer = new StockTransfer({
      hotelId,
      transferNumber,
      sourceLocation,
      destinationLocation,
      items: items.map((it: any) => ({
        itemName: it.itemName,
        quantity: Number(it.quantity) || 1,
        unit: it.unit || 'kg',
        unitCost: Number(it.unitCost) || 0,
      })),
      transferredByUserId: req.user?.userId ? new Types.ObjectId(req.user.userId) : new Types.ObjectId(),
      status: TransferStatus.DISPATCHED,
      notes,
      dispatchedAt: new Date(),
    });
    await transfer.save();

    res.status(201).json({
      success: true,
      message: `Inter-kitchen stock transfer ${transferNumber} dispatched`,
      transfer,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 5. Receive Inter-Kitchen Stock Transfer
export const receiveStockTransfer = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const transferId = String(req.params.transferId);

    const transfer = await StockTransfer.findOne({ _id: new Types.ObjectId(transferId), hotelId });
    if (!transfer) {
      res.status(404).json({ success: false, errorCode: 'TRANSFER_NOT_FOUND', message: 'Transfer not found' });
      return;
    }

    transfer.status = TransferStatus.RECEIVED;
    transfer.receivedByUserId = req.user?.userId ? new Types.ObjectId(req.user.userId) : undefined;
    transfer.receivedAt = new Date();
    await transfer.save();

    res.status(200).json({
      success: true,
      message: `Stock transfer ${transfer.transferNumber} received at ${transfer.destinationLocation}`,
      transfer,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 6. Get Stock Batches with FEFO (First-Expired, First-Out) Priority Sorting & Alerts
export const getStockBatches = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { status, search } = req.query;
    const filter: any = { hotelId };

    if (search && typeof search === 'string') {
      filter.itemName = { $regex: escapeRegex(search.trim()), $options: 'i' };
    }

    const batches = await StockBatch.find(filter).sort({ expiryDate: 1 }); // FEFO Sort!

    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);

    let expiringSoonCount = 0;
    let expiredCount = 0;
    let totalAtRiskValue = 0;

    const auditedBatches = batches.map((b) => {
      let freshness = BatchFreshnessStatus.FRESH;
      if (b.expiryDate < now) {
        freshness = BatchFreshnessStatus.EXPIRED;
        expiredCount++;
        totalAtRiskValue += b.currentQuantity * b.unitCost;
      } else if (b.expiryDate <= threeDaysFromNow) {
        freshness = BatchFreshnessStatus.EXPIRING_SOON;
        expiringSoonCount++;
        totalAtRiskValue += b.currentQuantity * b.unitCost;
      }

      return {
        _id: b._id,
        hotelId: b.hotelId,
        batchNumber: b.batchNumber,
        itemName: b.itemName,
        category: b.category,
        currentQuantity: b.currentQuantity,
        unit: b.unit,
        unitCost: b.unitCost,
        location: b.location,
        mfgDate: b.mfgDate,
        expiryDate: b.expiryDate,
        status: freshness,
        daysUntilExpiry: Math.ceil((b.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      };
    });

    const fefoMetrics = {
      totalBatchesCount: batches.length,
      expiringSoonCount,
      expiredCount,
      totalAtRiskValue: Math.round(totalAtRiskValue),
    };

    res.status(200).json({
      success: true,
      metrics: fefoMetrics,
      fefoMetrics,
      batches: auditedBatches,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 7. Create/Seed Stock Batch
export const createStockBatch = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const {
      itemName,
      category = 'General Supplies',
      currentQuantity,
      unit = 'kg',
      unitCost,
      location = 'Central Cold Room',
      mfgDate,
      expiryDate,
    } = req.body;

    if (!itemName || currentQuantity === undefined || unitCost === undefined || !expiryDate) {
      res.status(400).json({ success: false, errorCode: 'VALIDATION_FAILED', message: 'Item name, quantity, cost and expiry required' });
      return;
    }

    const batchNumber = `BAT-${Date.now().toString().slice(-6)}`;
    const batch = new StockBatch({
      hotelId,
      batchNumber,
      itemName,
      category,
      currentQuantity: Number(currentQuantity),
      unit,
      unitCost: Number(unitCost),
      location,
      mfgDate: mfgDate ? new Date(mfgDate) : new Date(),
      expiryDate: new Date(expiryDate),
    });
    await batch.save();

    res.status(201).json({ success: true, message: 'Stock batch registered with FEFO tracking', batch });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};
