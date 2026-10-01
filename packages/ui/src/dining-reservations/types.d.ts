export type MealPeriodUI = 'BREAKFAST' | 'LUNCH' | 'HIGH_TEA' | 'DINNER' | 'LATE_NIGHT';
export type TableTypePreferenceUI = 'STANDARD_DINING' | 'VIP_BOOTH' | 'WINDOW_VIEW' | 'OUTDOOR_PATIO' | 'PRIVATE_DINING_ROOM_PDR' | 'CHEF_TABLE';
export type VIPTierUI = 'REGULAR' | 'SILVER' | 'GOLD' | 'PLATINUM_VIP';
export type DiningReservationStatusUI = 'CONFIRMED' | 'SEATED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export interface IDiningPreOrderItemUI {
    itemName: string;
    quantity: number;
    notes?: string;
}
export interface IDiningReservationUI {
    _id: string;
    hotelId: string;
    reservationNumber: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    partySize: number;
    reservationDate: string;
    timeSlot: string;
    durationMinutes: number;
    mealPeriod: MealPeriodUI;
    tableTypePreference: TableTypePreferenceUI;
    vipTier: VIPTierUI;
    dietaryPreferences: string[];
    allergens: string[];
    specialOccasion: string;
    chefNotes?: string;
    preOrderedItems: IDiningPreOrderItemUI[];
    assignedTableIds: any[];
    guestProfileId?: any;
    specialRequests?: string;
    depositAmount: number;
    depositStatus: string;
    status: DiningReservationStatusUI;
    seatedAt?: string;
    createdAt: string;
}
export interface IDiningReservationMetricsUI {
    totalReservationsCount: number;
    confirmedCount: number;
    seatedCount: number;
    vipCount: number;
    allergenAlertsCount: number;
}
export interface INewDiningReservationPayload {
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    partySize: number;
    reservationDate: string;
    timeSlot: string;
    mealPeriod?: MealPeriodUI;
    tableTypePreference?: TableTypePreferenceUI;
    vipTier?: VIPTierUI;
    dietaryPreferences?: string[];
    allergens?: string[];
    specialOccasion?: string;
    chefNotes?: string;
    depositAmount?: number;
    specialRequests?: string;
}
