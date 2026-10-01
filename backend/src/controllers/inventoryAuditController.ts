import { Response } from 'express';
import { Types } from 'mongoose';
import {
  InventoryAuditSession,
  AuditType,
  AuditSessionStatus,
  VarianceReason,
} from '../models/InventoryAuditSession';
import { TenantRequest } from '../types';

// 1. Create Stocktake Audit Session
export const createAuditSession = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const {
      auditType = AuditType.WEEKLY_SPOT_CHECK,
      storeLocation = 'Central Dry Store',
      isBlindStocktake = false,
      items = [],
      notes,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, errorCode: 'EMPTY_AUDIT_ITEMS', message: 'At least one item required to audit' });
      return;
    }

    const auditNumber = `AUD-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

    const resolvedItems = items.map((it: any) => {
      const bookQty = Number(it.systemBookQuantity) || 0;
      const uCost = Number(it.unitCost) || 0;
      return {
        itemName: it.itemName,
        sku: it.sku,
        category: it.category || 'Food Supplies',
        unit: it.unit || 'kg',
        systemBookQuantity: bookQty,
        physicalCountQuantity: 0,
        varianceQuantity: -bookQty,
        unitCost: uCost,
        varianceValue: -Math.round(bookQty * uCost * 100) / 100,
        actionTaken: 'ADJUST_BOOK_STOCK',
      };
    });

    const session = new InventoryAuditSession({
      hotelId,
      auditNumber,
      auditType,
      storeLocation,
      isBlindStocktake: Boolean(isBlindStocktake),
      status: AuditSessionStatus.IN_PROGRESS,
      items: resolvedItems,
      totalShortageValue: 0,
      totalSurplusValue: 0,
      netDiscrepancyValue: 0,
      notes,
      auditedByUserId: req.user?.userId ? new Types.ObjectId(req.user.userId) : new Types.ObjectId(),
    });
    await session.save();

    res.status(201).json({
      success: true,
      message: `Audit session ${auditNumber} initiated (${isBlindStocktake ? 'Blind Stocktake' : 'Standard Audit'})`,
      session,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 2. Get Audit Sessions with Procurement & Variance KPIs
export const getAuditSessions = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { status, location } = req.query;
    const filter: any = { hotelId };

    if (status && typeof status === 'string' && status !== 'ALL') {
      filter.status = status;
    }
    if (location && typeof location === 'string' && location !== 'ALL') {
      filter.storeLocation = location;
    }

    const sessions = await InventoryAuditSession.find(filter)
      .populate('auditedByUserId', 'name role')
      .populate('approvedByUserId', 'name role')
      .sort({ createdAt: -1 });

    let totalAuditsCount = sessions.length;
    let openAuditsCount = 0;
    let totalNetShortageLoss = 0;
    let reconciledCount = 0;

    sessions.forEach((s) => {
      if (s.status === AuditSessionStatus.IN_PROGRESS || s.status === AuditSessionStatus.SUBMITTED || s.status === AuditSessionStatus.DISCREPANCY_FLAGGED) {
        openAuditsCount++;
      }
      if (s.status === AuditSessionStatus.RECONCILED) {
        reconciledCount++;
      }
      totalNetShortageLoss += s.totalShortageValue || 0;
    });

    res.status(200).json({
      success: true,
      metrics: {
        totalAuditsCount,
        openAuditsCount,
        totalNetShortageLoss: Math.round(totalNetShortageLoss),
        reconciledCount,
      },
      sessions,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 3. Submit Physical Stock Counts
export const submitPhysicalCounts = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const auditId = String(req.params.auditId);

    const session = await InventoryAuditSession.findOne({ _id: new Types.ObjectId(auditId), hotelId });
    if (!session) {
      res.status(404).json({ success: false, errorCode: 'AUDIT_NOT_FOUND', message: 'Audit session not found' });
      return;
    }

    const { countedItems } = req.body; // Array<{ itemName: string, physicalCountQuantity: number }>

    if (!countedItems || !Array.isArray(countedItems)) {
      res.status(400).json({ success: false, errorCode: 'INVALID_PAYLOAD', message: 'Counted items array required' });
      return;
    }

    let totalShortage = 0;
    let totalSurplus = 0;
    let hasVariance = false;

    countedItems.forEach((ci: any) => {
      const idx = session.items.findIndex(
        (it) => it.itemName.toLowerCase() === ci.itemName.toLowerCase()
      );
      if (idx > -1) {
        const physical = Number(ci.physicalCountQuantity) || 0;
        const system = session.items[idx].systemBookQuantity;
        const varianceQty = Math.round((physical - system) * 100) / 100;
        const varianceVal = Math.round(varianceQty * session.items[idx].unitCost * 100) / 100;

        session.items[idx].physicalCountQuantity = physical;
        session.items[idx].varianceQuantity = varianceQty;
        session.items[idx].varianceValue = varianceVal;

        if (varianceVal < 0) {
          totalShortage += Math.abs(varianceVal);
          hasVariance = true;
        } else if (varianceVal > 0) {
          totalSurplus += varianceVal;
          hasVariance = true;
        }
      }
    });

    session.totalShortageValue = Math.round(totalShortage * 100) / 100;
    session.totalSurplusValue = Math.round(totalSurplus * 100) / 100;
    session.netDiscrepancyValue = Math.round((totalSurplus - totalShortage) * 100) / 100;

    session.status = hasVariance
      ? AuditSessionStatus.DISCREPANCY_FLAGGED
      : AuditSessionStatus.SUBMITTED;

    await session.save();

    res.status(200).json({
      success: true,
      message: `Physical counts logged. Audit status: ${session.status}`,
      session,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 4. Financial Controller Reconciles Discrepancies
export const reconcileDiscrepancies = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const auditId = String(req.params.auditId);

    const session = await InventoryAuditSession.findOne({ _id: new Types.ObjectId(auditId), hotelId });
    if (!session) {
      res.status(404).json({ success: false, errorCode: 'AUDIT_NOT_FOUND', message: 'Audit session not found' });
      return;
    }

    const { itemResolutions, notes } = req.body;

    if (itemResolutions && Array.isArray(itemResolutions)) {
      itemResolutions.forEach((resItem: any) => {
        const idx = session.items.findIndex(
          (it) => it.itemName.toLowerCase() === resItem.itemName.toLowerCase()
        );
        if (idx > -1) {
          if (resItem.varianceReason) session.items[idx].varianceReason = resItem.varianceReason;
          if (resItem.actionTaken) session.items[idx].actionTaken = resItem.actionTaken;
        }
      });
    }

    if (notes) session.notes = notes;
    session.status = AuditSessionStatus.RECONCILED;
    session.approvedByUserId = req.user?.userId ? new Types.ObjectId(req.user.userId) : undefined;
    session.reconciledAt = new Date();
    await session.save();

    res.status(200).json({
      success: true,
      message: `Audit ${session.auditNumber} reconciled and book stock adjusted successfully`,
      session,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};
