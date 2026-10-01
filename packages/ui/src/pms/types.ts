export interface MatrixDateHeader {
  date: string; // 'YYYY-MM-DD'
  dayOfWeek: number; // 0 = Sun, 6 = Sat
  dayName: string; // 'Sun', 'Mon'
  dayNumber: number; // 1 to 31
  monthName: string; // 'Oct'
  isWeekend: boolean;
}

export interface MatrixPhysicalRoom {
  id: string;
  roomNumber: string;
  floorNumber: number;
  wing?: string;
  status: string; // 'AVAILABLE' | 'OCCUPIED' | 'DIRTY' | 'CLEANING' | 'RESERVED' | 'OUT_OF_SERVICE'
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
  checkInDate: string; // 'YYYY-MM-DD'
  checkOutDate: string; // 'YYYY-MM-DD'
  bookingStatus: string; // 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED' | 'NO_SHOW'
  allocatedRoomId: string | null;
  roomTypeId: string;
  roomTypeName: string;
  grandTotal: number;
  advancePaymentAmount: number;
  paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
  // Computed grid positioning
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
