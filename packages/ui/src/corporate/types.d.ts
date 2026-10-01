export declare enum SplitBillingPolicy {
    MASTER_PAYS_ROOM_ONLY = "MASTER_PAYS_ROOM_ONLY",// Company pays room tariffs; guests pay incidental/food
    MASTER_PAYS_ALL = "MASTER_PAYS_ALL",// Company foots entire bill
    INDIVIDUAL_SETTLEMENT = "INDIVIDUAL_SETTLEMENT"
}
export declare enum GroupBookingStatus {
    CONFIRMED = "CONFIRMED",
    PARTIALLY_CHECKED_IN = "PARTIALLY_CHECKED_IN",
    FULLY_CHECKED_IN = "FULLY_CHECKED_IN",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED"
}
export interface IGroupRoomEntryUI {
    _id?: string;
    roomTypeId: string | {
        _id: string;
        name: string;
        code: string;
        basePriceOvernight: number;
    };
    allocatedRoomId?: string | {
        _id: string;
        roomNumber: string;
        floor: number;
        status: string;
    };
    primaryGuestName: string;
    primaryGuestPhone: string;
    tariffPerNight: number;
    stayId?: string;
    folioId?: string;
    status: 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED';
}
export interface ICorporateMasterFolioUI {
    _id: string;
    folioNumber: string;
    totalRoomTariff: number;
    totalFoodAndBeverage: number;
    totalLaundry: number;
    totalPaidServices: number;
    totalDamageCharges: number;
    totalDiscounts: number;
    totalTaxes: number;
    advancePaid: number;
    netAmountPayable: number;
    paidAmount: number;
    dueAmount: number;
    folioStatus: 'OPEN' | 'LOCKED' | 'SETTLED';
}
export interface IGroupBookingUI {
    _id: string;
    hotelId: string;
    groupBookingCode: string;
    groupName: string;
    organizerName: string;
    organizerPhone: string;
    organizerEmail: string;
    companyName?: string;
    companyGst?: string;
    checkInDate: string;
    checkOutDate: string;
    rooms: IGroupRoomEntryUI[];
    splitBillingPolicy: SplitBillingPolicy;
    masterFolioId?: string | ICorporateMasterFolioUI;
    advanceDepositPaid: number;
    totalEstimatedAmount: number;
    status: GroupBookingStatus;
    createdAt?: string;
    updatedAt?: string;
}
export interface ICorporateInvoiceUI {
    companyName?: string;
    companyGst?: string;
    folioNumber?: string;
    totalTariff?: number;
    taxes?: number;
    advancePaid?: number;
    netPayable?: number;
    dueAmount?: number;
}
export interface IIndividualInvoiceUI {
    guestName: string;
    guestPhone: string;
    roomNumber?: string;
    folioNumber?: string;
    dueAmount: number;
    lineItems: any[];
}
export interface IGroupSummaryUI {
    totalGroups: number;
    totalRoomsBlocked: number;
    totalRoomsCheckedIn: number;
    totalCorporateDue: number;
}
export interface INewGroupBookingPayload {
    groupName: string;
    organizerName: string;
    organizerPhone: string;
    organizerEmail: string;
    companyName?: string;
    companyGst?: string;
    checkInDate: string;
    checkOutDate: string;
    splitBillingPolicy: SplitBillingPolicy;
    advanceDepositPaid: number;
    rooms: Array<{
        roomTypeId: string;
        primaryGuestName: string;
        primaryGuestPhone: string;
    }>;
}
export interface IBulkCheckInPayload {
    allocations: Array<{
        roomEntryId: string;
        physicalRoomId: string;
    }>;
}
export interface IPostIncidentalPayload {
    roomNumber: string;
    department: string;
    description: string;
    rate: number;
    quantity: number;
    taxRate?: number;
}
export interface ISettleCorporateFolioPayload {
    amount: number;
    paymentMethod?: 'BANK_TRANSFER' | 'CORPORATE_CREDIT' | 'UPI' | 'CARD' | 'CASH';
}
export interface ISettleIndividualFolioPayload {
    folioId: string;
    amount: number;
    paymentMethod?: 'UPI' | 'CARD' | 'CASH';
}
