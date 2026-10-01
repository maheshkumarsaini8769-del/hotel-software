import { Response } from 'express';
import { Types } from 'mongoose';
import { Vendor, VendorCategory, PaymentTerms } from '../models/Vendor';
import { PurchaseOrder, PurchaseOrderStatus } from '../models/PurchaseOrder';
import { GoodsReceivedNote, GrnInspectionStatus } from '../models/GoodsReceivedNote';
import { TenantRequest } from '../types';
import { escapeRegex } from '../utils/security';

// 1. Get All Vendors
export const getVendors = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { category } = req.query;
    const filter: any = { hotelId, isActive: true };
    if (category && typeof category === 'string' && category !== 'ALL') {
      filter.category = category;
    }

    const vendors = await Vendor.find(filter).sort({ name: 1 });
    res.status(200).json({ success: true, count: vendors.length, vendors });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 2. Create Vendor Profile
export const createVendor = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const {
      name,
      contactPerson,
      phone,
      email,
      gstin,
      category = VendorCategory.FOOD_BEVERAGE,
      paymentTerms = PaymentTerms.NET_30,
      address,
      rating = 5,
    } = req.body;

    if (!name || !contactPerson || !phone || !email) {
      res.status(400).json({ success: false, errorCode: 'MISSING_FIELDS', message: 'Name, contact, phone and email required' });
      return;
    }

    const vendorCode = `VND-${Date.now().toString().slice(-4)}`;
    const vendor = new Vendor({
      hotelId,
      vendorCode,
      name,
      contactPerson,
      phone,
      email,
      gstin,
      category,
      paymentTerms,
      address,
      rating,
      isActive: true,
    });
    await vendor.save();

    res.status(201).json({ success: true, message: 'Vendor registered successfully', vendor });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 3. Get Purchase Orders & Executive Procurement KPIs
export const getPurchaseOrders = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { status, search } = req.query;
    const filter: any = { hotelId };

    if (status && typeof status === 'string' && status !== 'ALL') {
      filter.status = status;
    }

    if (search && typeof search === 'string') {
      filter.poNumber = { $regex: escapeRegex(search.trim()), $options: 'i' };
    }

    const orders = await PurchaseOrder.find(filter)
      .populate('vendorId', 'name vendorCode contactPerson phone email category')
      .populate('createdByUserId', 'name role')
      .populate('approvedByUserId', 'name role')
      .sort({ createdAt: -1 });

    // Calculate Metrics
    let totalPoCount = orders.length;
    let pendingApprovalCount = 0;
    let totalOpenPoValue = 0;
    let completedPoCount = 0;

    orders.forEach((o) => {
      if (o.status === PurchaseOrderStatus.PENDING_APPROVAL) pendingApprovalCount++;
      if (o.status === PurchaseOrderStatus.APPROVED || o.status === PurchaseOrderStatus.PARTIALLY_RECEIVED) {
        totalOpenPoValue += o.grandTotal;
      }
      if (o.status === PurchaseOrderStatus.COMPLETED) completedPoCount++;
    });

    res.status(200).json({
      success: true,
      metrics: {
        totalPoCount,
        pendingApprovalCount,
        totalOpenPoValue: Math.round(totalOpenPoValue),
        completedPoCount,
      },
      orders,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 4. Create New Purchase Order
export const createPurchaseOrder = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const {
      vendorId,
      items,
      expectedDeliveryDate,
      deliveryLocation = 'Central Store Receiving Dock',
      notes,
    } = req.body;

    if (!vendorId || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, errorCode: 'INVALID_PAYLOAD', message: 'Vendor and at least one item required' });
      return;
    }

    const vendor = await Vendor.findOne({ _id: new Types.ObjectId(vendorId), hotelId });
    if (!vendor) {
      res.status(404).json({ success: false, errorCode: 'VENDOR_NOT_FOUND', message: 'Vendor not found' });
      return;
    }

    let subtotal = 0;
    let taxAmount = 0;

    const resolvedItems = items.map((it: any) => {
      const qty = Number(it.orderQuantity) || 1;
      const price = Number(it.unitPrice) || 0;
      const taxRate = Number(it.taxRate) || 5;
      const lineSubtotal = Math.round(qty * price * 100) / 100;
      const lineTax = Math.round(lineSubtotal * (taxRate / 100) * 100) / 100;
      const lineTotal = lineSubtotal + lineTax;

      subtotal += lineSubtotal;
      taxAmount += lineTax;

      return {
        itemName: it.itemName,
        sku: it.sku,
        category: it.category,
        orderQuantity: qty,
        unit: it.unit || 'kg',
        unitPrice: price,
        taxRate,
        totalAmount: lineTotal,
        receivedQuantity: 0,
      };
    });

    const grandTotal = Math.round((subtotal + taxAmount) * 100) / 100;
    const poNumber = `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;

    const po = new PurchaseOrder({
      hotelId,
      poNumber,
      vendorId: vendor._id,
      status: PurchaseOrderStatus.PENDING_APPROVAL,
      items: resolvedItems,
      subtotal,
      taxAmount,
      grandTotal,
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : undefined,
      deliveryLocation,
      notes,
      createdByUserId: req.user?.userId ? new Types.ObjectId(req.user.userId) : new Types.ObjectId(),
    });
    await po.save();

    res.status(201).json({
      success: true,
      message: `Purchase Order ${poNumber} created and awaiting approval`,
      purchaseOrder: po,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 5. Manager Approve Purchase Order
export const approvePurchaseOrder = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const poId = String(req.params.poId);

    const po = await PurchaseOrder.findOne({ _id: new Types.ObjectId(poId), hotelId });
    if (!po) {
      res.status(404).json({ success: false, errorCode: 'PO_NOT_FOUND', message: 'Purchase order not found' });
      return;
    }

    if (po.status !== PurchaseOrderStatus.PENDING_APPROVAL) {
      res.status(400).json({ success: false, errorCode: 'INVALID_STATUS', message: `Cannot approve PO with status ${po.status}` });
      return;
    }

    po.status = PurchaseOrderStatus.APPROVED;
    po.approvedByUserId = req.user?.userId ? new Types.ObjectId(req.user.userId) : undefined;
    po.approvedAt = new Date();
    await po.save();

    res.status(200).json({
      success: true,
      message: `Purchase order ${po.poNumber} approved for receiving dock`,
      purchaseOrder: po,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 6. Create Goods Received Note (GRN) at Receiving Dock
export const createGrn = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const {
      poId,
      invoiceNumber,
      invoiceDate,
      receivedItems,
      dockNotes,
    } = req.body;

    if (!poId || !invoiceNumber || !receivedItems || !Array.isArray(receivedItems) || receivedItems.length === 0) {
      res.status(400).json({ success: false, errorCode: 'INVALID_PAYLOAD', message: 'PO, invoice # and items required' });
      return;
    }

    const po = await PurchaseOrder.findOne({ _id: new Types.ObjectId(poId), hotelId });
    if (!po) {
      res.status(404).json({ success: false, errorCode: 'PO_NOT_FOUND', message: 'Purchase order not found' });
      return;
    }

    if (po.status !== PurchaseOrderStatus.APPROVED && po.status !== PurchaseOrderStatus.PARTIALLY_RECEIVED) {
      res.status(400).json({
        success: false,
        errorCode: 'PO_NOT_READY_FOR_RECEIVING',
        message: `PO must be in APPROVED or PARTIALLY_RECEIVED status to create GRN (Current: ${po.status})`,
      });
      return;
    }

    let totalAcceptedAmount = 0;
    let totalTaxAmount = 0;
    let hasDiscrepancy = false;

    // Process and match each received item against PO
    const processedReceivedItems = receivedItems.map((recItem: any) => {
      const orderedQty = Number(recItem.orderedQty) || 0;
      const receivedQty = Number(recItem.receivedQty) || 0;
      const acceptedQty = Number(recItem.acceptedQty) || 0;
      const rejectedQty = Math.max(0, receivedQty - acceptedQty);
      const unitPrice = Number(recItem.unitPrice) || 0;
      const taxRate = Number(recItem.taxRate) || 5;

      const lineAcceptedSubtotal = Math.round(acceptedQty * unitPrice * 100) / 100;
      const lineTax = Math.round(lineAcceptedSubtotal * (taxRate / 100) * 100) / 100;
      const lineTotal = lineAcceptedSubtotal + lineTax;

      totalAcceptedAmount += lineAcceptedSubtotal;
      totalTaxAmount += lineTax;

      if (rejectedQty > 0 || acceptedQty < orderedQty) {
        hasDiscrepancy = true;
      }

      // Update PO item receivedQuantity
      const poItemIndex = po.items.findIndex((pi) => pi.itemName.toLowerCase() === recItem.itemName.toLowerCase());
      if (poItemIndex > -1) {
        po.items[poItemIndex].receivedQuantity += acceptedQty;
      }

      return {
        itemName: recItem.itemName,
        sku: recItem.sku,
        orderedQty,
        receivedQty,
        acceptedQty,
        rejectedQty,
        rejectionReason: recItem.rejectionReason,
        unit: recItem.unit || 'kg',
        unitPrice,
        taxRate,
        lineTotal,
      };
    });

    const finalInvoiceAmount = Math.round((totalAcceptedAmount + totalTaxAmount) * 100) / 100;
    const grnNumber = `GRN-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;

    const grn = new GoodsReceivedNote({
      hotelId,
      grnNumber,
      poId: po._id,
      vendorId: po.vendorId,
      invoiceNumber,
      invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
      receivedItems: processedReceivedItems,
      totalAcceptedAmount,
      totalTaxAmount,
      finalInvoiceAmount,
      inspectorUserId: req.user?.userId ? new Types.ObjectId(req.user.userId) : new Types.ObjectId(),
      status: hasDiscrepancy ? GrnInspectionStatus.FLAGGED_DISCREPANCY : GrnInspectionStatus.VERIFIED,
      dockNotes,
    });
    await grn.save();

    // Determine new PO status
    const allItemsFulfilled = po.items.every((it) => it.receivedQuantity >= it.orderQuantity);
    po.status = allItemsFulfilled ? PurchaseOrderStatus.COMPLETED : PurchaseOrderStatus.PARTIALLY_RECEIVED;
    await po.save();

    res.status(201).json({
      success: true,
      message: `GRN ${grnNumber} generated. PO status updated to ${po.status}.`,
      grn,
      purchaseOrderStatus: po.status,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 7. Get GRN Audit History
export const getGrnHistory = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { poId } = req.query;
    const filter: any = { hotelId };
    if (poId && typeof poId === 'string') {
      filter.poId = new Types.ObjectId(poId);
    }

    const grns = await GoodsReceivedNote.find(filter)
      .populate('vendorId', 'name vendorCode')
      .populate('poId', 'poNumber status')
      .populate('inspectorUserId', 'name role')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: grns.length, grns });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};
