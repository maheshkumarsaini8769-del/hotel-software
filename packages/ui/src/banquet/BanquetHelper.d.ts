import { BanquetEventType, BanquetTimeSlot, BanquetBookingStatus, SeatingLayoutType } from './types';
export declare class BanquetHelper {
    static getEventTypeInfo(type: BanquetEventType): {
        label: string;
        icon: string;
    };
    static getTimeSlotInfo(slot: BanquetTimeSlot): {
        label: string;
        timing: string;
        badgeClass: string;
    };
    static getStatusInfo(status: BanquetBookingStatus): {
        label: string;
        badgeClass: string;
        dotColor: string;
    };
    static getSeatingLayoutLabel(layout: SeatingLayoutType): string;
    static calculateEventTotals(pax: number, perPlateRate: number, hallRent: number, decorAV: number, pricingType: string): {
        cateringSubtotal: number;
        subtotal: number;
        taxes: number;
        grandTotal: number;
    };
}
