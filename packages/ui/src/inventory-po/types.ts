export type VendorCategoryUI =
  | 'FOOD_BEVERAGE'
  | 'DAIRY'
  | 'MEAT_POULTRY'
  | 'DRY_GROCERY'
  | 'HOUSEKEEPING_CHEMICALS'
  | 'PACKAGING'
  | 'BEVERAGES_LIQUOR'
  | 'GENERAL_SUPPLIES';

export type PaymentTermsUI = 'IMMEDIATE' | 'NET_15' | 'NET_30' | 'NET_60';

export interface IVendorUI {
  _id: string;
  hotelId?: string;
  vendorCode: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  gstin?: string;
  category: VendorCategoryUI;
  paymentTerms: PaymentTermsUI;
  address?: string;
  rating: number;
  isActive: boolean;
}

export type PurchaseOrderStatusUI =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'PARTIALLY_RECEIVED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface IPoItemUI {
  itemName: string;
  sku?: string;
  category?: string;
  orderQuantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
  totalAmount: number;
  receivedQuantity: number;
}

export interface IPurchaseOrderUI {
  _id: string;
  hotelId: string;
  poNumber: string;
  vendorId: any; // Populated or ID
  status: PurchaseOrderStatusUI;
  items: IPoItemUI[];
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
  expectedDeliveryDate?: string;
  deliveryLocation: string;
  notes?: string;
  approvedByUserId?: any;
  approvedAt?: string;
  createdByUserId?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface IPoMetricsUI {
  totalPoCount: number;
  pendingApprovalCount: number;
  totalOpenPoValue: number;
  completedPoCount: number;
}

export type GrnInspectionStatusUI = 'VERIFIED' | 'FLAGGED_DISCREPANCY' | 'REJECTED';

export interface IGrnReceivedItemUI {
  itemName: string;
  sku?: string;
  orderedQty: number;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  rejectionReason?: string;
  unit: string;
  unitPrice: number;
  taxRate: number;
  lineTotal: number;
}

export interface IGoodsReceivedNoteUI {
  _id: string;
  hotelId: string;
  grnNumber: string;
  poId: any;
  vendorId: any;
  invoiceNumber: string;
  invoiceDate: string;
  receivedItems: IGrnReceivedItemUI[];
  totalAcceptedAmount: number;
  totalTaxAmount: number;
  finalInvoiceAmount: number;
  inspectorUserId: any;
  status: GrnInspectionStatusUI;
  dockNotes?: string;
  createdAt?: string;
}

export interface INewPoPayload {
  vendorId: string;
  items: Array<{
    itemName: string;
    sku?: string;
    category?: string;
    orderQuantity: number;
    unit: string;
    unitPrice: number;
    taxRate?: number;
  }>;
  expectedDeliveryDate?: string;
  deliveryLocation?: string;
  notes?: string;
}

export interface INewGrnPayload {
  poId: string;
  invoiceNumber: string;
  invoiceDate?: string;
  receivedItems: Array<{
    itemName: string;
    sku?: string;
    orderedQty: number;
    receivedQty: number;
    acceptedQty: number;
    rejectedQty?: number;
    rejectionReason?: string;
    unit: string;
    unitPrice: number;
    taxRate?: number;
  }>;
  dockNotes?: string;
}
