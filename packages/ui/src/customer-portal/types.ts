export type CustomerServiceMode =
  | 'IN_ROOM_DINING'
  | 'DINE_IN_RESTAURANT'
  | 'TAKEAWAY_PICKUP'
  | 'POOLSIDE_LOUNGE';

export type ServiceRequestType =
  | 'WATER_REFILL'
  | 'CALL_WAITER'
  | 'CALL_ROOM_SERVICE'
  | 'EXTRA_CUTLERY'
  | 'REQUEST_BILL'
  | 'ROOM_CLEANING'
  | 'CUSTOM';

export type ServiceRequestStatus = 'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface PortalCartItem {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  specialInstructions?: string;
}

export interface ServiceRequestDTO {
  requestId: string;
  requestType: ServiceRequestType;
  notes?: string;
  status: ServiceRequestStatus;
  requestedAt: string;
  resolvedAt?: string;
  resolvedByStaffName?: string;
}

export interface InRoomContextDTO {
  roomId?: string;
  roomNumber?: string;
  stayId?: string;
  folioId?: string;
  billingPreference?: 'POST_TO_ROOM' | 'PAY_ONLINE_NOW';
}

export interface DineInContextDTO {
  tableId?: string;
  tableNumber?: string;
  tableSessionId?: string;
  section?: string;
  seatingType?: 'PRIVATE_TABLE' | 'COMMUNITY_SHARED';
}

export interface CustomerSessionDTO {
  sessionToken: string;
  hotelId: string;
  serviceMode: CustomerServiceMode;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'GUEST_SELF_DECLARED';
  guestInfo: {
    guestName?: string;
    phone?: string;
    paxCount?: number;
  };
  inRoomContext?: InRoomContextDTO;
  dineInContext?: DineInContextDTO;
  cartItems: PortalCartItem[];
  activeOrders: any[];
  serviceRequests: ServiceRequestDTO[];
  status: 'ACTIVE' | 'ORDER_PLACED' | 'SERVED' | 'CLOSED';
  lastActivityAt: string;
}
