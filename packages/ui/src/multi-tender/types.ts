export type TenderMethod =
  | 'CASH'
  | 'UPI'
  | 'CARD'
  | 'ROOM_FOLIO'
  | 'CITY_LEDGER'
  | 'COMPLIMENTARY';

export type SettlementStatus = 'COMPLETED' | 'PARTIAL' | 'VOIDED';

export interface TenderLineDTO {
  method: TenderMethod;
  amount: number;
  referenceNumber?: string;
  cashReceived?: number;
  cashChangeReturned?: number;
  notes?: string;
}

export interface MultiTenderSettlementDTO {
  _id: string;
  hotelId: string;
  settlementNumber: string;
  billId: string;
  billNumber: string;
  tableId?: string;
  tableNumber?: string;
  cashierId: string;
  cashierName: string;
  billGrandTotal: number;
  tenders: TenderLineDTO[];
  totalSettledAmount: number;
  totalCashChangeReturned: number;
  status: SettlementStatus;
  isReconciled: boolean;
  reconciledAt?: string | Date;
  idempotencyKey: string;
  voidReason?: string;
  createdAt: string | Date;
}

export interface CashierShiftFloatDTO {
  _id: string;
  hotelId: string;
  shiftNumber: string;
  cashierId: string;
  cashierName: string;
  terminalId: string;
  status: 'OPEN' | 'CLOSED';
  openingFloat: number;
  totalCashCollected: number;
  totalUpiCollected: number;
  totalCardCollected: number;
  totalRoomFolioCollected: number;
  totalCityLedgerCollected: number;
  totalChangeReturned: number;
  expectedCashInDrawer: number;
  actualCashCounted?: number;
  cashVariance?: number;
  settlementCount: number;
  notes?: string;
  openedAt: string | Date;
  closedAt?: string | Date;
}

export interface TenderReconciliationSummaryDTO {
  settlementCount: number;
  grandTotalRevenue: number;
  totalCash: number;
  totalUpi: number;
  totalCard: number;
  totalRoomFolio: number;
  totalCityLedger: number;
  totalComplimentary: number;
  totalChangeReturned: number;
  netCashInDrawer: number;
}
