import { RequestType, ShiftStatus } from '@spicehub/shared-types';

export enum WaiterRequestLifecycle {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  ACCEPTED = 'ACCEPTED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface WaiterServiceRequestModel {
  id: string;
  requestType: RequestType;
  status: WaiterRequestLifecycle | string;
  priority?: string;
  tableId?: string;
  tableNumber?: string;
  section?: string;
  assignedUserId?: string;
  notes?: string;
  createdAt: string;
  slaMinutes?: number;
}

export interface DraftOrderItem {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  specialInstructions?: string;
}

export interface DraftKot {
  tableId: string;
  tableNumber?: string;
  sessionId: string;
  items: DraftOrderItem[];
  cookingInstructions?: string;
}

export interface WaiterProfileState {
  userId: string;
  name: string;
  hotelId: string;
  shiftStatus: ShiftStatus;
  activeRequestsCount: number;
}
