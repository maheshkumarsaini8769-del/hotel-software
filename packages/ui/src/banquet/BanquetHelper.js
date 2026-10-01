"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BanquetHelper = void 0;
const types_1 = require("./types");
class BanquetHelper {
    static getEventTypeInfo(type) {
        switch (type) {
            case types_1.BanquetEventType.WEDDING_RECEPTION:
                return { label: 'Wedding & Reception', icon: '💍' };
            case types_1.BanquetEventType.CORPORATE_CONFERENCE:
                return { label: 'Corporate Conference', icon: '💼' };
            case types_1.BanquetEventType.COCKTAIL_DINNER:
                return { label: 'Cocktail Dinner', icon: '🍸' };
            case types_1.BanquetEventType.BIRTHDAY_ANNIVERSARY:
                return { label: 'Birthday / Anniversary', icon: '🎂' };
            case types_1.BanquetEventType.EXHIBITION_SEMINAR:
                return { label: 'Exhibition & Seminar', icon: '🏛️' };
            case types_1.BanquetEventType.SOCIAL_GATHERING:
                return { label: 'Social Gathering', icon: '🎉' };
            default:
                return { label: type, icon: '📅' };
        }
    }
    static getTimeSlotInfo(slot) {
        switch (slot) {
            case types_1.BanquetTimeSlot.MORNING:
                return {
                    label: 'Morning Slot',
                    timing: '09:00 AM – 03:00 PM',
                    badgeClass: 'bg-amber-950/70 text-amber-300 border-amber-500/40',
                };
            case types_1.BanquetTimeSlot.EVENING:
                return {
                    label: 'Evening Slot',
                    timing: '06:00 PM – 12:00 AM',
                    badgeClass: 'bg-purple-950/70 text-purple-300 border-purple-500/40',
                };
            case types_1.BanquetTimeSlot.FULL_DAY:
                return {
                    label: 'Full Day Pass',
                    timing: '09:00 AM – 11:30 PM',
                    badgeClass: 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40',
                };
            default:
                return {
                    label: slot,
                    timing: '',
                    badgeClass: 'bg-zinc-800 text-zinc-300 border-zinc-700',
                };
        }
    }
    static getStatusInfo(status) {
        switch (status) {
            case types_1.BanquetBookingStatus.ENQUIRY:
                return {
                    label: 'Enquiry / Lead',
                    badgeClass: 'bg-zinc-900 text-zinc-400 border-zinc-700',
                    dotColor: 'bg-zinc-400',
                };
            case types_1.BanquetBookingStatus.PROVISIONAL:
                return {
                    label: 'Provisional Hold',
                    badgeClass: 'bg-amber-950/60 text-amber-400 border-amber-500/40',
                    dotColor: 'bg-amber-400',
                };
            case types_1.BanquetBookingStatus.CONFIRMED:
                return {
                    label: 'Confirmed Contract',
                    badgeClass: 'bg-sky-950/60 text-sky-400 border-sky-500/40',
                    dotColor: 'bg-sky-400',
                };
            case types_1.BanquetBookingStatus.IN_PROGRESS:
                return {
                    label: 'Live In-Progress',
                    badgeClass: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 animate-pulse',
                    dotColor: 'bg-emerald-400',
                };
            case types_1.BanquetBookingStatus.COMPLETED:
                return {
                    label: 'Event Completed',
                    badgeClass: 'bg-purple-950/60 text-purple-400 border-purple-500/40',
                    dotColor: 'bg-purple-400',
                };
            case types_1.BanquetBookingStatus.CANCELLED:
                return {
                    label: 'Cancelled',
                    badgeClass: 'bg-rose-950/60 text-rose-400 border-rose-500/40',
                    dotColor: 'bg-rose-400',
                };
            default:
                return {
                    label: status,
                    badgeClass: 'bg-zinc-900 text-zinc-400 border-zinc-700',
                    dotColor: 'bg-zinc-400',
                };
        }
    }
    static getSeatingLayoutLabel(layout) {
        switch (layout) {
            case types_1.SeatingLayoutType.THEATER:
                return 'Theater Style (Auditorium Rows)';
            case types_1.SeatingLayoutType.ROUND_TABLE_CLUSTERS:
                return 'Round Table Banquet Clusters';
            case types_1.SeatingLayoutType.U_SHAPE:
                return 'U-Shape Executive Board';
            case types_1.SeatingLayoutType.CLASSROOM:
                return 'Classroom Style with Desks';
            case types_1.SeatingLayoutType.HOLLOW_SQUARE:
                return 'Hollow Square Setup';
            case types_1.SeatingLayoutType.COCKTAIL_STANDING:
                return 'High Cocktail Standing Tables';
            default:
                return layout;
        }
    }
    static calculateEventTotals(pax, perPlateRate, hallRent, decorAV, pricingType) {
        const cateringSubtotal = pricingType === 'HALL_RENT_ONLY' ? 0 : pax * perPlateRate;
        const subtotal = cateringSubtotal + hallRent + decorAV;
        const taxes = Math.round(subtotal * 0.18); // 18% GST standard
        const grandTotal = subtotal + taxes;
        return { cateringSubtotal, subtotal, taxes, grandTotal };
    }
}
exports.BanquetHelper = BanquetHelper;
