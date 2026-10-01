import { MinibarItemAudit } from './types';
import { RoomStatus } from '@spicehub/shared-types';
export interface SlaBadgeResult {
    severity: 'ON_TRACK' | 'WARNING' | 'BREACHED';
    badgeClass: string;
    dotColor: string;
    label: string;
}
export declare class HousekeepingHelper {
    static readonly DEFAULT_MINIBAR_ITEMS: MinibarItemAudit[];
    static calculateSlaStatus(elapsedMinutes: number, targetMinutes: number): SlaBadgeResult;
    static calculateMinibarTotal(items: MinibarItemAudit[]): number;
    static calculateEcoWaterSaved(tuckInRoomsCount: number): {
        liters: number;
        kwhSaved: number;
    };
    static formatElapsedTimer(minutes: number): string;
    static getTurnaroundProgress(status: RoomStatus): {
        step: number;
        percentage: number;
        label: string;
    };
}
