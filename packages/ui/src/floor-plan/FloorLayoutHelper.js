"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FloorLayoutHelper = void 0;
const shared_types_1 = require("@spicehub/shared-types");
class FloorLayoutHelper {
    /**
     * Format elapsed minutes from session start time
     */
    static calculateElapsedMinutes(sessionStartTime) {
        if (!sessionStartTime)
            return 0;
        const start = new Date(sessionStartTime).getTime();
        const now = Date.now();
        const diffMs = Math.max(0, now - start);
        return Math.floor(diffMs / (1000 * 60));
    }
    /**
     * Format elapsed minutes to human readable string (e.g., '45m', '1h 20m')
     */
    static formatElapsedTime(minutes) {
        if (minutes <= 0)
            return 'Just seated';
        if (minutes < 60)
            return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const remMins = minutes % 60;
        return `${hours}h ${remMins}m`;
    }
    /**
     * Filter tables by section, status, min capacity and search query
     */
    static filterTables(tables, filters) {
        return tables.filter(t => {
            // Section filter
            if (filters.section && filters.section !== 'ALL' && t.section.toUpperCase() !== filters.section.toUpperCase()) {
                return false;
            }
            // Status filter
            if (filters.status && filters.status !== 'ALL' && t.currentStatus !== filters.status) {
                return false;
            }
            // Min capacity filter
            if (filters.minCapacity && t.capacity < filters.minCapacity) {
                return false;
            }
            // Search query filter (matches table number or section)
            if (filters.searchQuery && filters.searchQuery.trim().length > 0) {
                const q = filters.searchQuery.trim().toLowerCase();
                const matchesNumber = t.tableNumber.toLowerCase().includes(q);
                const matchesSection = t.section.toLowerCase().includes(q);
                if (!matchesNumber && !matchesSection)
                    return false;
            }
            return true;
        });
    }
    /**
     * Calculate section summary stats for quick dashboard cards
     */
    static calculateSectionStats(tables) {
        const total = tables.length;
        let available = 0;
        let occupied = 0;
        let billing = 0;
        let dirty = 0;
        let reserved = 0;
        let activeRevenue = 0;
        for (const t of tables) {
            if (t.currentStatus === shared_types_1.TableStatus.AVAILABLE)
                available++;
            else if (t.currentStatus === shared_types_1.TableStatus.OCCUPIED) {
                occupied++;
                activeRevenue += t.activeOrderTotal || 0;
            }
            else if (t.currentStatus === shared_types_1.TableStatus.BILLING || t.currentStatus === shared_types_1.TableStatus.PAYMENT_SETTLED) {
                billing++;
                activeRevenue += t.activeOrderTotal || 0;
            }
            else if (t.currentStatus === shared_types_1.TableStatus.DIRTY || t.currentStatus === shared_types_1.TableStatus.CLEANING) {
                dirty++;
            }
            else if (t.currentStatus === shared_types_1.TableStatus.RESERVED) {
                reserved++;
            }
        }
        const occupancyRate = total > 0 ? Math.round(((occupied + billing) / total) * 100) : 0;
        return {
            total,
            available,
            occupied,
            billing,
            dirty,
            reserved,
            occupancyRate,
            activeRevenue,
        };
    }
    /**
     * Group tables by section name
     */
    static groupBySection(tables) {
        const grouped = {};
        for (const t of tables) {
            const sec = t.section || 'General';
            if (!grouped[sec])
                grouped[sec] = [];
            grouped[sec].push(t);
        }
        return grouped;
    }
}
exports.FloorLayoutHelper = FloorLayoutHelper;
