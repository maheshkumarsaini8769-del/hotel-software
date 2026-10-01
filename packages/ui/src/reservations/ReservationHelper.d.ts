import { TableReservationStatus, TableDepositStatus, RoomArrivalBookingDTO } from './types';
export interface ReservationBadge {
    bg: string;
    text: string;
    border: string;
    label: string;
}
export declare class ReservationHelper {
    static getTableStatusBadge(status: TableReservationStatus): ReservationBadge;
    static getDepositBadge(depositStatus: TableDepositStatus, amount: number): ReservationBadge;
    static getRoomArrivalBadge(booking: RoomArrivalBookingDTO): ReservationBadge;
    static isSlotUpcoming(timeSlot: string, reservationDate: string): boolean;
    static formatTimeSlot(timeSlot: string): string;
}
