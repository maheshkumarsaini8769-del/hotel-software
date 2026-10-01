import { ConciergeServiceItem } from './types';
export declare class GuestPortalHelper {
    /**
     * Luxury Concierge Service Catalog for 5-Star Hospitality
     */
    static getStandardConciergeCatalog(): ConciergeServiceItem[];
    /**
     * Visual progress stepper calculation for in-room dining orders
     */
    static getOrderStatusProgress(status: string): {
        step: number;
        percentage: number;
        label: string;
        description: string;
        icon: string;
        color: string;
    };
}
