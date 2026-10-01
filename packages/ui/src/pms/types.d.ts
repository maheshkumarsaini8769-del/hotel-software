export interface MatrixDateHeader {
    date: string;
    dayOfWeek: number;
    dayName: string;
    dayNumber: number;
    monthName: string;
    isWeekend: boolean;
}
export interface MatrixPhysicalRoom {
    id: string;
    roomNumber: string;
    floorNumber: number;
    wing?: string;
    status: string;
}
export interface MatrixRoomCategory {
    id: string;
    name: string;
    code: string;
    basePrice: number;
    rooms: MatrixPhysicalRoom[];
}
export interface MatrixReservationBlock {
    id: string;
    bookingNumber: string;
    guestName: string;
    guestPhone: string;
    guestEmail?: string;
    checkInDate: string;
    checkOutDate: string;
    bookingStatus: string;
    allocatedRoomId: string | null;
    roomTypeId: string;
    roomTypeName: string;
    grandTotal: number;
    advancePaymentAmount: number;
    paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
    startColIndex?: number;
    spanCols?: number;
    isContinuationLeft?: boolean;
    isContinuationRight?: boolean;
}
export interface MatrixKpis {
    totalRooms: number;
    arrivalsToday: number;
    departuresToday: number;
    occupancyRate: number;
    activeBookingsCount: number;
}
export interface MatrixCalendarData {
    window: {
        startDate: string;
        endDate: string;
        totalDays: number;
    };
    dates: MatrixDateHeader[];
    kpis: MatrixKpis;
    roomTypes: MatrixRoomCategory[];
    bookings: MatrixReservationBlock[];
}
export interface QuickReserveTarget {
    roomTypeId: string;
    roomId?: string;
    roomNumber?: string;
    categoryName?: string;
    checkInDate: string;
    checkOutDate: string;
}
