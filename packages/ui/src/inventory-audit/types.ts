export type AuditTypeUI =
  | 'FULL_MONTH_END'
  | 'WEEKLY_SPOT_CHECK'
  | 'HIGH_VALUE_CYCLIC';

export type AuditSessionStatusUI =
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'DISCREPANCY_FLAGGED'
  | 'RECONCILED';

export type VarianceReasonUI =
  | 'PILFERAGE_THEFT'
  | 'UNRECORDED_WASTE'
  | 'COUNTING_ERROR'
  | 'VENDOR_SHORTAGE'
  | 'NORMAL_SHRINKAGE'
  | 'RECIPE_OVER_PORTIONING'
  | 'OTHER';

export type AuditActionTakenUI =
  | 'ADJUST_BOOK_STOCK'
  | 'RECOUNT_REQUESTED'
  | 'WRITE_OFF_TO_P_AND_L';

export interface IAuditItemUI {
  itemName: string;
  sku?: string;
  category: string;
  unit: string;
  systemBookQuantity: number;
  physicalCountQuantity: number;
  varianceQuantity: number; // physical - system
  unitCost: number;
  varianceValue: number; // varianceQuantity * unitCost
  varianceReason?: VarianceReasonUI;
  actionTaken?: AuditActionTakenUI;
}

export interface IInventoryAuditSessionUI {
  _id: string;
  hotelId: string;
  auditNumber: string;
  auditType: AuditTypeUI;
  storeLocation: string;
  isBlindStocktake: boolean;
  status: AuditSessionStatusUI;
  items: IAuditItemUI[];
  totalShortageValue: number;
  totalSurplusValue: number;
  netDiscrepancyValue: number;
  notes?: string;
  auditedByUserId?: any;
  approvedByUserId?: any;
  reconciledAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface IAuditMetricsUI {
  totalAuditsCount: number;
  openAuditsCount: number;
  totalNetShortageLoss: number;
  reconciledCount: number;
}

export interface INewAuditSessionPayload {
  auditType: AuditTypeUI;
  storeLocation: string;
  isBlindStocktake: boolean;
  items: {
    itemName: string;
    sku?: string;
    category?: string;
    unit: string;
    systemBookQuantity: number;
    unitCost: number;
  }[];
  notes?: string;
}

export interface ISubmitCountsPayload {
  countedItems: {
    itemName: string;
    physicalCountQuantity: number;
  }[];
}

export interface IReconcilePayload {
  itemResolutions: {
    itemName: string;
    varianceReason: VarianceReasonUI;
    actionTaken: AuditActionTakenUI;
  }[];
  notes?: string;
}
