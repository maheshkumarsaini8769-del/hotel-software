export enum WaiterFloatStatus {
  OPEN = 'OPEN',
  DROPPED_PENDING_APPROVAL = 'DROPPED_PENDING_APPROVAL',
  SETTLED = 'SETTLED',
  CANCELLED = 'CANCELLED',
}

export interface WaiterCashTransactionDto {
  billId: string;
  tableNumber: string;
  billAmount: number;
  amountTendered: number;
  changeGiven: number;
  netCashReceived: number;
  recordedAt: string | Date;
}

export interface WaiterCashFloatDto {
  _id?: string;
  hotelId?: string;
  waiterUserId: string;
  waiterName: string;
  shiftDate: string | Date;
  status: WaiterFloatStatus;
  openingFloat: number;
  totalCashCollected: number;
  totalChangeGiven: number;
  expectedCashInHand: number;
  actualCashHandedOver?: number;
  variance?: number;
  varianceReason?: string;
  transactions?: WaiterCashTransactionDto[];
  dropRequestedAt?: string | Date;
  cashierUserId?: string;
  cashierName?: string;
  settledAt?: string | Date;
  receiptNumber?: string;
}

export interface HandoverReceiptSummary {
  receiptNumber: string;
  waiterName: string;
  cashierName: string;
  openingFloat: number;
  totalCollected: number;
  totalChangeGiven: number;
  expectedBalance: number;
  actualCashReceived: number;
  variance: number;
  timestamp: string | Date;
}
