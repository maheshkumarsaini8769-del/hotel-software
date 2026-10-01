export declare enum BanquetEventType {
    WEDDING_RECEPTION = "WEDDING_RECEPTION",
    CORPORATE_CONFERENCE = "CORPORATE_CONFERENCE",
    COCKTAIL_DINNER = "COCKTAIL_DINNER",
    BIRTHDAY_ANNIVERSARY = "BIRTHDAY_ANNIVERSARY",
    EXHIBITION_SEMINAR = "EXHIBITION_SEMINAR",
    SOCIAL_GATHERING = "SOCIAL_GATHERING"
}
export declare enum BanquetTimeSlot {
    MORNING = "MORNING",// 09:00 AM - 03:00 PM
    EVENING = "EVENING",// 06:00 PM - 12:00 AM
    FULL_DAY = "FULL_DAY"
}
export declare enum BanquetBookingStatus {
    ENQUIRY = "ENQUIRY",
    PROVISIONAL = "PROVISIONAL",
    CONFIRMED = "CONFIRMED",
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED"
}
export declare enum SeatingLayoutType {
    THEATER = "THEATER",
    ROUND_TABLE_CLUSTERS = "ROUND_TABLE_CLUSTERS",
    U_SHAPE = "U_SHAPE",
    CLASSROOM = "CLASSROOM",
    HOLLOW_SQUARE = "HOLLOW_SQUARE",
    COCKTAIL_STANDING = "COCKTAIL_STANDING"
}
export interface IFunctionProspectusUI {
    seatingLayout: SeatingLayoutType;
    stageDimensions?: string;
    hasAudioVisual: boolean;
    audioVisualNotes?: string;
    foodServiceStartTime: string;
    foodServiceEndTime: string;
    welcomeDrinksTiming?: string;
    starterCirculationTiming?: string;
    mainBuffetOpenTiming?: string;
    dessertStationTiming?: string;
    specialDietaryRequirements?: string;
    chefSignOff: boolean;
    banquetManagerSignOff: boolean;
    electricianAvSignOff: boolean;
    additionalInstructions?: string;
}
export interface IBanquetBookingUI {
    _id: string;
    hotelId: string;
    bookingCode: string;
    eventName: string;
    eventType: BanquetEventType;
    venueName: string;
    eventDate: string;
    timeSlot: BanquetTimeSlot;
    guaranteedPax: number;
    expectedPax: number;
    pricingType: 'PER_PLATE' | 'HALL_RENT_ONLY' | 'COMBO_PACKAGE';
    perPlateRate: number;
    hallRentAmount: number;
    decorAndAudioVisualAmount: number;
    cateringSubtotal: number;
    taxes: number;
    totalEstimatedAmount: number;
    advanceDepositPaid: number;
    paidAmount: number;
    dueAmount: number;
    status: BanquetBookingStatus;
    organizerName: string;
    organizerPhone: string;
    organizerEmail: string;
    companyName?: string;
    companyGst?: string;
    billingAddress?: string;
    functionProspectus: IFunctionProspectusUI;
    masterFolioId?: any;
    createdAt?: string;
    updatedAt?: string;
}
export interface IBanquetMetricsUI {
    totalEvents: number;
    upcomingEventsCount: number;
    totalPaxExpected: number;
    totalRevenueContracted: number;
    totalBalanceDue: number;
}
export interface INewBanquetBookingPayload {
    eventName: string;
    eventType: BanquetEventType;
    venueName: string;
    eventDate: string;
    timeSlot: BanquetTimeSlot;
    guaranteedPax: number;
    expectedPax: number;
    pricingType: 'PER_PLATE' | 'HALL_RENT_ONLY' | 'COMBO_PACKAGE';
    perPlateRate: number;
    hallRentAmount: number;
    decorAndAudioVisualAmount: number;
    advanceDepositPaid: number;
    organizerName: string;
    organizerPhone: string;
    organizerEmail?: string;
    companyName?: string;
    companyGst?: string;
    billingAddress?: string;
    functionProspectus?: Partial<IFunctionProspectusUI>;
}
export interface IUpdateProspectusPayload {
    seatingLayout?: SeatingLayoutType;
    stageDimensions?: string;
    hasAudioVisual?: boolean;
    audioVisualNotes?: string;
    foodServiceStartTime?: string;
    foodServiceEndTime?: string;
    welcomeDrinksTiming?: string;
    starterCirculationTiming?: string;
    mainBuffetOpenTiming?: string;
    dessertStationTiming?: string;
    specialDietaryRequirements?: string;
    chefSignOff?: boolean;
    banquetManagerSignOff?: boolean;
    electricianAvSignOff?: boolean;
    additionalInstructions?: string;
}
export interface IPostBanquetExtraChargePayload {
    department?: string;
    description: string;
    rate: number;
    quantity: number;
    taxRate?: number;
}
export interface ISettleBanquetFolioPayload {
    amount: number;
    paymentMethod?: 'BANK_TRANSFER' | 'UPI' | 'CARD' | 'CASH';
}
