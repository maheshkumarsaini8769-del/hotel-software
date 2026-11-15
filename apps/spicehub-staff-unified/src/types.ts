export type LoginStep = 'HOTEL_SELECT' | 'ROLE_SELECT' | 'STAFF_SELECT' | 'PIN_ENTRY';
export type StaffRole = 'waiter' | 'cashier' | 'kds' | 'reception';

export interface ActiveHotel {
  id: string;
  name: string;
  city: string;
  enabledPortals: string[];
  contactPhone?: string;
  supportPhone?: string;
}

export interface StaffProfile {
  id: string;
  name: string;
  role: string;
  shift: string;
  avatar: string;
  hasPin: boolean;
  pinApprovedByAdmin: boolean;
  pinStatus: 'NONE' | 'ACTIVE' | 'PENDING_APPROVAL';
}

export interface StaffSessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  hotelId: string;
  hotelName: string;
}

export interface StaffLoginResponse {
  token: string;
  user: StaffSessionUser;
}
