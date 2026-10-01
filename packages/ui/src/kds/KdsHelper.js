"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KdsHelper = void 0;
class KdsHelper {
    /**
     * Calculates elapsed minutes from order placement time
     */
    static calculateElapsedMinutes(placedAt, now = new Date()) {
        const placedTime = new Date(placedAt).getTime();
        const currentTime = now.getTime();
        if (isNaN(placedTime) || currentTime < placedTime) {
            return 0;
        }
        return Math.floor((currentTime - placedTime) / (1000 * 60));
    }
    /**
     * Urgency rules:
     * < 10 mins: NORMAL (Green)
     * 10 - 20 mins: WARNING (Amber)
     * > 20 mins: CRITICAL (Red alert)
     */
    static getUrgencyLevel(elapsedMinutes) {
        if (elapsedMinutes >= 20)
            return 'CRITICAL';
        if (elapsedMinutes >= 10)
            return 'WARNING';
        return 'NORMAL';
    }
    /**
     * Visual design tokens based on urgency level
     */
    static getUrgencyStyle(urgency) {
        switch (urgency) {
            case 'CRITICAL':
                return {
                    border: 'border-rose-500 shadow-rose-900/30',
                    bg: 'bg-rose-950/20',
                    badge: 'text-rose-400 border-rose-500/40 bg-rose-500/10 animate-pulse',
                    badgeBg: 'bg-rose-500',
                    text: 'text-rose-400',
                    timerText: 'text-rose-500 font-bold',
                };
            case 'WARNING':
                return {
                    border: 'border-amber-500 shadow-amber-900/20',
                    bg: 'bg-amber-950/20',
                    badge: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
                    badgeBg: 'bg-amber-500',
                    text: 'text-amber-400',
                    timerText: 'text-amber-400 font-semibold',
                };
            case 'NORMAL':
            default:
                return {
                    border: 'border-emerald-500/40 shadow-emerald-950/10',
                    bg: 'bg-emerald-950/10',
                    badge: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
                    badgeBg: 'bg-emerald-500',
                    text: 'text-emerald-400',
                    timerText: 'text-emerald-400 font-medium',
                };
        }
    }
    /**
     * Filter orders by kitchen station ID (or ALL)
     */
    static filterOrdersByStation(orders, stationId) {
        if (!stationId || stationId === 'ALL') {
            return orders;
        }
        return orders.filter((order) => order.items.some((item) => String(item.kitchenStationId) === String(stationId)));
    }
    /**
     * Filter orders by status (or ALL active)
     */
    static filterOrdersByStatus(orders, status) {
        if (!status || status === 'ALL') {
            return orders.filter((o) => o.orderStatus !== 'SERVED' && o.orderStatus !== 'CANCELLED');
        }
        return orders.filter((o) => o.orderStatus === status);
    }
    /**
     * Human-readable timer formatted string (e.g., '14m' or '25m (LATE)')
     */
    /**
     * Human-readable timer formatted string (e.g., '14m' or '25m (LATE)')
     */
    static formatElapsedTimer(elapsedMinutes) {
        if (elapsedMinutes >= 20) {
            return `${elapsedMinutes}m (LATE)`;
        }
        return `${elapsedMinutes}m`;
    }
    /**
     * Shift 47: Generates high-contrast luxury UI allergen and dietary warning badges
     */
    static getAllergenBadges(item) {
        const badges = [];
        // 1. Dietary Types (Jain, No Onion-Garlic, Vegan)
        const dietary = (item.dietaryType || '').toUpperCase();
        if (dietary === 'JAIN' || (item.allergens && item.allergens.includes('JAIN_NO_ROOT'))) {
            badges.push({
                label: 'JAIN (NO ROOT VEG)',
                badgeStyle: 'bg-amber-950/90 text-amber-300 border-2 border-amber-500 shadow-amber-900/40 font-bold tracking-wider',
                icon: '🪷',
                severity: 'DIETARY',
                category: 'JAIN',
            });
        }
        if (dietary === 'NO_ONION_GARLIC') {
            badges.push({
                label: 'NO ONION / NO GARLIC',
                badgeStyle: 'bg-indigo-950/90 text-indigo-300 border-2 border-indigo-500 shadow-indigo-900/40 font-semibold tracking-wide',
                icon: '🚫🧅',
                severity: 'DIETARY',
                category: 'NO_ONION_GARLIC',
            });
        }
        if (dietary === 'VEGAN') {
            badges.push({
                label: 'STRICT VEGAN',
                badgeStyle: 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/80 font-medium tracking-wide',
                icon: '🌱',
                severity: 'DIETARY',
                category: 'VEGAN',
            });
        }
        // 2. High-Risk Medical Allergens
        const allergens = item.allergens || [];
        for (const rawAllergen of allergens) {
            const a = rawAllergen.toUpperCase();
            if (a === 'NUTS' || a === 'PEANUT' || a === 'TREE_NUTS' || a === 'NUT_ALLERGY') {
                badges.push({
                    label: 'CRITICAL: NUT ALLERGY',
                    badgeStyle: 'bg-rose-950 text-rose-100 border-2 border-rose-500 shadow-lg shadow-rose-900/60 animate-pulse font-extrabold tracking-wider',
                    icon: '⚠️🥜',
                    severity: 'HIGH',
                    category: 'NUTS',
                });
            }
            else if (a === 'GLUTEN' || a === 'GLUTEN_FREE') {
                badges.push({
                    label: 'GLUTEN FREE',
                    badgeStyle: 'bg-cyan-950/90 text-cyan-300 border border-cyan-500/80 font-medium',
                    icon: '🌾',
                    severity: 'MEDIUM',
                    category: 'GLUTEN',
                });
            }
            else if (a === 'DAIRY' || a === 'LACTOSE' || a === 'DAIRY_FREE') {
                badges.push({
                    label: 'DAIRY FREE / LACTOSE',
                    badgeStyle: 'bg-sky-950/90 text-sky-300 border border-sky-500/80 font-medium',
                    icon: '🥛',
                    severity: 'MEDIUM',
                    category: 'DAIRY',
                });
            }
            else if (a === 'SHELLFISH' || a === 'SEAFOOD') {
                badges.push({
                    label: 'CRITICAL: SHELLFISH',
                    badgeStyle: 'bg-orange-950 text-orange-200 border-2 border-orange-500 shadow-orange-900/50 animate-pulse font-extrabold',
                    icon: '🦐',
                    severity: 'HIGH',
                    category: 'SHELLFISH',
                });
            }
            else if (a === 'EGGS' || a === 'EGG') {
                badges.push({
                    label: 'EGG ALLERGY',
                    badgeStyle: 'bg-yellow-950/90 text-yellow-300 border border-yellow-500/80 font-medium',
                    icon: '🥚',
                    severity: 'MEDIUM',
                    category: 'EGGS',
                });
            }
            else if (a === 'SOY') {
                badges.push({
                    label: 'SOY ALLERGY',
                    badgeStyle: 'bg-teal-950/90 text-teal-300 border border-teal-500/80 font-medium',
                    icon: '🫘',
                    severity: 'MEDIUM',
                    category: 'SOY',
                });
            }
        }
        // 3. Custom Guest Special Instructions / Notes
        if (item.allergenNotes) {
            badges.push({
                label: `NOTE: ${item.allergenNotes}`,
                badgeStyle: 'bg-purple-950/90 text-purple-200 border border-purple-400 font-semibold',
                icon: '📝',
                severity: 'MEDIUM',
                category: 'CUSTOM_NOTE',
            });
        }
        return badges;
    }
    /**
     * Checks if an individual item is safety-blocked awaiting mandatory chef acknowledgment
     */
    static isItemBlockedByAllergen(item) {
        return Boolean(item.hasAllergenAlert && !item.chefAllergenAcknowledged);
    }
    /**
     * Checks if an entire order is blocked from proceeding because at least one item requires chef acknowledgment
     */
    static isOrderBlockedByAllergen(order) {
        return order.items.some((item) => this.isItemBlockedByAllergen(item));
    }
    /**
     * Generates a concise summary banner for chef KDS screen
     */
    static getAllergenAlertSummary(order) {
        const unacknowledgedItems = order.items.filter((item) => this.isItemBlockedByAllergen(item));
        if (unacknowledgedItems.length === 0)
            return null;
        const names = unacknowledgedItems.map((i) => i.name).join(', ');
        return `⚠️ Mandatory Chef Tap Required: ${unacknowledgedItems.length} item(s) (${names}) have active allergen alerts. Tap to acknowledge before food prep!`;
    }
}
exports.KdsHelper = KdsHelper;
