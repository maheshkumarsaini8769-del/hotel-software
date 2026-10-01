"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HousekeepingHelper = void 0;
const shared_types_1 = require("@spicehub/shared-types");
class HousekeepingHelper {
    static DEFAULT_MINIBAR_ITEMS = [
        { id: 'mb-1', name: 'Perrier Sparkling Water (330ml)', rate: 250, quantity: 0 },
        { id: 'mb-2', name: 'Red Bull Energy Drink (250ml)', rate: 290, quantity: 0 },
        { id: 'mb-3', name: 'Artisanal Belgian Dark Chocolate', rate: 350, quantity: 0 },
        { id: 'mb-4', name: 'Roasted Himalayan Salted Almonds', rate: 320, quantity: 0 },
        { id: 'mb-5', name: 'Nitro Cold Brew Coffee Can', rate: 280, quantity: 0 },
    ];
    static calculateSlaStatus(elapsedMinutes, targetMinutes) {
        const ratio = elapsedMinutes / (targetMinutes || 1);
        if (ratio >= 1.0) {
            return {
                severity: 'BREACHED',
                badgeClass: 'bg-rose-500/10 text-rose-400 border border-rose-500/30',
                dotColor: 'bg-rose-500 animate-pulse',
                label: `Breached (+${elapsedMinutes - targetMinutes}m)`,
            };
        }
        if (ratio >= 0.7) {
            return {
                severity: 'WARNING',
                badgeClass: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
                dotColor: 'bg-amber-400',
                label: `Near SLA (${elapsedMinutes}/${targetMinutes}m)`,
            };
        }
        return {
            severity: 'ON_TRACK',
            badgeClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
            dotColor: 'bg-emerald-400',
            label: `On Track (${elapsedMinutes}m)`,
        };
    }
    static calculateMinibarTotal(items) {
        return items.reduce((sum, item) => sum + (item.rate * (item.quantity || 0)), 0);
    }
    static calculateEcoWaterSaved(tuckInRoomsCount) {
        // 5-star hotel benchmark: ~35L water and 0.8 kWh energy saved per stayover tuck-in vs full wash
        return {
            liters: tuckInRoomsCount * 35,
            kwhSaved: Math.round(tuckInRoomsCount * 0.8 * 10) / 10,
        };
    }
    static formatElapsedTimer(minutes) {
        if (minutes < 60) {
            return `${minutes}m`;
        }
        const hrs = Math.floor(minutes / 60);
        const rem = minutes % 60;
        return `${hrs}h ${rem}m`;
    }
    static getTurnaroundProgress(status) {
        switch (status) {
            case shared_types_1.RoomStatus.DIRTY:
                return { step: 1, percentage: 25, label: 'Dirty - Pending Cleaning' };
            case shared_types_1.RoomStatus.CLEANING:
                return { step: 2, percentage: 50, label: 'Cleaning In Progress' };
            case shared_types_1.RoomStatus.INSPECTION:
                return { step: 3, percentage: 75, label: 'Awaiting Supervisor Inspection' };
            case shared_types_1.RoomStatus.AVAILABLE:
                return { step: 4, percentage: 100, label: 'Passed & Ready for Guest' };
            case shared_types_1.RoomStatus.OUT_OF_SERVICE:
                return { step: 0, percentage: 0, label: 'Out of Order / Maintenance' };
            default:
                return { step: 1, percentage: 20, label: status };
        }
    }
}
exports.HousekeepingHelper = HousekeepingHelper;
