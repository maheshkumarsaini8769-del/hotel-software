import {
  RoomStatus,
  KeycardVoidReason,
  KeycardVoidAuditDTO,
  CheckoutPaymentPayload,
  CheckoutRequestPayload,
  FolioSummaryDTO,
  FolioLockRequestPayload,
  FolioLockResponseDTO,
  FolioUnlockRequestPayload,
  FolioUnlockResponseDTO,
  ChargeSweepRequestPayload,
  ChargeSweepResponseDTO,
  SweptOrderSummary,
} from '@spicehub/shared-types';

export { RoomStatus, KeycardVoidReason };
export type {
  KeycardVoidAuditDTO,
  CheckoutPaymentPayload,
  CheckoutRequestPayload,
  FolioSummaryDTO,
  FolioLockRequestPayload,
  FolioLockResponseDTO,
  FolioUnlockRequestPayload,
  FolioUnlockResponseDTO,
  ChargeSweepRequestPayload,
  ChargeSweepResponseDTO,
  SweptOrderSummary,
};

export interface CheckoutFolioLineItem {
  id: string;
  department: string;
  description: string;
  rate: number;
  quantity: number;
  taxAmount: number;
  netAmount: number;
  postedAt: string | Date;
}

export interface CheckoutFolioData {
  id: string;
  folioNumber: string;
  folioStatus: 'OPEN' | 'LOCKED' | 'SETTLED';
  totalRoomTariff: number;
  totalFoodAndBeverage: number;
  totalLaundry: number;
  totalPaidServices: number;
  totalDamageCharges: number;
  totalDiscounts: number;
  totalTaxes: number;
  grossCharges: number;
  advancePaid: number;
  paidAmount: number;
  netAmountPayable: number;
  dueAmount: number;
  isZeroBalance: boolean;
  isLocked?: boolean;
  lockedAt?: string | Date;
  lockedByUserId?: string;
  lockReason?: string;
  lineItems: CheckoutFolioLineItem[];
}

export interface CheckoutRoomData {
  id: string;
  roomNumber: string;
  floorNumber: number;
  status: RoomStatus;
  keyCardNumber: string | null;
}

export interface CheckoutGuestData {
  name: string;
  phone: string;
  email: string;
}

export interface CheckoutPreviewData {
  stayId: string;
  stayStatus: string;
  checkInTimestamp: string | Date;
  expectedCheckOutTimestamp: string | Date;
  actualCheckOutTimestamp?: string | Date;
  guest: CheckoutGuestData;
  room: CheckoutRoomData;
  folio: CheckoutFolioData;
  pendingOrdersCount: number;
  hasPendingOrders: boolean;
  pendingOrdersTotal?: number;
  projectedDueWithPendingOrders?: number;
  pendingRestaurantOrders?: any[];
}

export interface PaymentTenderItem {
  paymentMode: 'CASH' | 'CARD' | 'UPI' | 'CITY_LEDGER' | 'COMPLIMENTARY';
  amount: number;
  transactionRef?: string;
  cashReceived?: number;
  cashChangeReturned?: number;
  notes?: string;
}
