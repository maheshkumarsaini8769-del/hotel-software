import { TableStatus, RoomStatus, OrderStatus, FoodType } from '@spicehub/shared-types';
export { TableStatus, RoomStatus, OrderStatus, FoodType };
export declare const formatCurrency: (amount: number, currency?: string) => string;
export declare const TableStatusColorMap: Record<TableStatus, {
    bg: string;
    text: string;
    border: string;
    label: string;
}>;
export declare const RoomStatusColorMap: Record<RoomStatus, {
    bg: string;
    text: string;
    label: string;
}>;
export declare const FoodTypeBadge: Record<FoodType, {
    icon: string;
    color: string;
    label: string;
}>;
export type AudioOscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'custom';
export interface ToneConfig {
    frequency: number;
    type?: AudioOscillatorType;
    durationMs: number;
}
export declare const KitchenKdsChimePattern: ToneConfig[];
export declare const WaiterAlertChimePattern: ToneConfig[];
export declare class StatCardCalculator {
    static calculateGrowth(current: number, previous: number): {
        percentage: number;
        isPositive: boolean;
    };
}
export * from './floor-plan/types';
export * from './floor-plan/FloorLayoutHelper';
export * from './floor-plan/FloorPlanStore';
export * from './waiter/types';
export * from './waiter/WaiterStore';
export * from './menu-cart';
export { MenuCartStore } from './menu-cart/MenuCartStore';
export * from './billing/types';
export * from './billing/BillingCalculatorHelper';
export * from './kds/types';
export * from './kds/KdsHelper';
export * from './kds/KdsStore';
export * from './pms/types';
export * from './pms/MatrixHelper';
export * from './pms/MatrixStore';
export * from './guest-portal/types';
export * from './guest-portal/GuestPortalHelper';
export * from './guest-portal/GuestPortalStore';
export * from './housekeeping/types';
export * from './housekeeping/HousekeepingHelper';
export * from './housekeeping/HousekeepingStore';
export * from './reservations/types';
export * from './reservations/ReservationHelper';
export * from './reservations/ReservationStore';
export * from './corporate';
export * from './banquet';
export * from './fast-cashier';
export * from './recipe-costing';
export * from './inventory-po';
export * from './store-requisition';
export * from './inventory-audit';
export * from './menu-engineering';
export * from './staff-roster';
export * from './dining-reservations';
export * from './night-audit';
export * from './revenue-manager';
export * from './customer-portal';
export * from './co-dining';
export * from './seat-billing';
export * from './qr-locker';
export * from './waiter-zones';
export * from './floor-duty-matrix';
export * from './load-balancer';
export * from './food-pickup-sla';
export * from './multi-tender';
export * from './dynamic-upi';
export * from './waiter-cash-float';
export * from './admin-control';
export * from './guest-reviews';
export * from './kot-void';
