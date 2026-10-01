"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenuCartStore = exports.StatCardCalculator = exports.WaiterAlertChimePattern = exports.KitchenKdsChimePattern = exports.FoodTypeBadge = exports.RoomStatusColorMap = exports.TableStatusColorMap = exports.formatCurrency = exports.FoodType = exports.OrderStatus = exports.RoomStatus = exports.TableStatus = void 0;
const shared_types_1 = require("@spicehub/shared-types");
Object.defineProperty(exports, "TableStatus", { enumerable: true, get: function () { return shared_types_1.TableStatus; } });
Object.defineProperty(exports, "RoomStatus", { enumerable: true, get: function () { return shared_types_1.RoomStatus; } });
Object.defineProperty(exports, "OrderStatus", { enumerable: true, get: function () { return shared_types_1.OrderStatus; } });
Object.defineProperty(exports, "FoodType", { enumerable: true, get: function () { return shared_types_1.FoodType; } });
// Currency Formatter
const formatCurrency = (amount, currency = 'INR') => {
    if (currency === 'INR') {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
};
exports.formatCurrency = formatCurrency;
// Visual Status Colors
exports.TableStatusColorMap = {
    [shared_types_1.TableStatus.AVAILABLE]: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'Available' },
    [shared_types_1.TableStatus.OCCUPIED]: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30', label: 'Occupied' },
    [shared_types_1.TableStatus.BILLING]: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', label: 'Billing' },
    [shared_types_1.TableStatus.PAYMENT_SETTLED]: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', label: 'Payment Settled' },
    [shared_types_1.TableStatus.DIRTY]: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30', label: 'Dirty' },
    [shared_types_1.TableStatus.CLEANING]: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30', label: 'Cleaning' },
    [shared_types_1.TableStatus.RESERVED]: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30', label: 'Reserved' },
    [shared_types_1.TableStatus.PARTIALLY_OCCUPIED]: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/30', label: 'Partially Occupied' },
    [shared_types_1.TableStatus.MERGED]: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/30', label: 'Merged Tab' },
};
exports.RoomStatusColorMap = {
    [shared_types_1.RoomStatus.AVAILABLE]: { bg: 'bg-emerald-500', text: 'text-white', label: 'Available' },
    [shared_types_1.RoomStatus.RESERVED]: { bg: 'bg-purple-500', text: 'text-white', label: 'Reserved' },
    [shared_types_1.RoomStatus.OCCUPIED]: { bg: 'bg-rose-500', text: 'text-white', label: 'Occupied' },
    [shared_types_1.RoomStatus.DIRTY]: { bg: 'bg-orange-500', text: 'text-white', label: 'Dirty' },
    [shared_types_1.RoomStatus.CLEANING]: { bg: 'bg-cyan-500', text: 'text-white', label: 'Cleaning' },
    [shared_types_1.RoomStatus.INSPECTION]: { bg: 'bg-amber-500', text: 'text-white', label: 'Inspection' },
    [shared_types_1.RoomStatus.OUT_OF_SERVICE]: { bg: 'bg-zinc-700', text: 'text-zinc-300', label: 'Out of Order' },
};
exports.FoodTypeBadge = {
    [shared_types_1.FoodType.VEG]: { icon: '🟢', color: 'border-emerald-600 text-emerald-600', label: 'Veg' },
    [shared_types_1.FoodType.NON_VEG]: { icon: '🔴', color: 'border-rose-600 text-rose-600', label: 'Non-Veg' },
    [shared_types_1.FoodType.EGG]: { icon: '🟡', color: 'border-amber-600 text-amber-600', label: 'Egg' },
    [shared_types_1.FoodType.BEVERAGE]: { icon: '🔵', color: 'border-sky-600 text-sky-600', label: 'Beverage' },
};
exports.KitchenKdsChimePattern = [
    { frequency: 587.33, durationMs: 150 }, // D5
    { frequency: 880.00, durationMs: 250 }, // A5
];
exports.WaiterAlertChimePattern = [
    { frequency: 800, durationMs: 100 },
    { frequency: 1000, durationMs: 150 },
    { frequency: 1200, durationMs: 200 },
];
class StatCardCalculator {
    static calculateGrowth(current, previous) {
        if (previous === 0) {
            return { percentage: current > 0 ? 100 : 0, isPositive: current >= 0 };
        }
        const diff = current - previous;
        const percentage = Math.round((diff / previous) * 100);
        return {
            percentage: Math.abs(percentage),
            isPositive: percentage >= 0,
        };
    }
}
exports.StatCardCalculator = StatCardCalculator;
// Floor Plan Exports
__exportStar(require("./floor-plan/types"), exports);
__exportStar(require("./floor-plan/FloorLayoutHelper"), exports);
__exportStar(require("./floor-plan/FloorPlanStore"), exports);
// Waiter App Exports
__exportStar(require("./waiter/types"), exports);
__exportStar(require("./waiter/WaiterStore"), exports);
// Menu & Cart Exports
__exportStar(require("./menu-cart"), exports);
var MenuCartStore_1 = require("./menu-cart/MenuCartStore");
Object.defineProperty(exports, "MenuCartStore", { enumerable: true, get: function () { return MenuCartStore_1.MenuCartStore; } });
// Billing & Cashier Exports
__exportStar(require("./billing/types"), exports);
__exportStar(require("./billing/BillingCalculatorHelper"), exports);
// Kitchen KDS Exports
__exportStar(require("./kds/types"), exports);
__exportStar(require("./kds/KdsHelper"), exports);
__exportStar(require("./kds/KdsStore"), exports);
// PMS Reservation Matrix Exports
__exportStar(require("./pms/types"), exports);
__exportStar(require("./pms/MatrixHelper"), exports);
__exportStar(require("./pms/MatrixStore"), exports);
// In-Room Guest Portal Exports
__exportStar(require("./guest-portal/types"), exports);
__exportStar(require("./guest-portal/GuestPortalHelper"), exports);
__exportStar(require("./guest-portal/GuestPortalStore"), exports);
// Housekeeping Mobile & Board Exports
__exportStar(require("./housekeeping/types"), exports);
__exportStar(require("./housekeeping/HousekeepingHelper"), exports);
__exportStar(require("./housekeeping/HousekeepingStore"), exports);
// Table & Room Reservation Live Manager Exports
__exportStar(require("./reservations/types"), exports);
__exportStar(require("./reservations/ReservationHelper"), exports);
__exportStar(require("./reservations/ReservationStore"), exports);
// Corporate Group Bookings & Split Folio Engine Exports
__exportStar(require("./corporate"), exports);
// Banquet & Event Management Engine Exports
__exportStar(require("./banquet"), exports);
// Fast Cashier POS Express Engine Exports
__exportStar(require("./fast-cashier"), exports);
// Recipe Costing & Food Waste Audit Exports
__exportStar(require("./recipe-costing"), exports);
// Central Store Purchase Orders & GRN Procurement Exports
__exportStar(require("./inventory-po"), exports);
// Departmental Store Requisitions, Transfers & FEFO Exports
__exportStar(require("./store-requisition"), exports);
// Physical Inventory Stock Audit & Discrepancy Reconciliation Exports
__exportStar(require("./inventory-audit"), exports);
// F&B Menu Engineering Matrix & BCG Profitability Analyzer Exports
__exportStar(require("./menu-engineering"), exports);
// Staff Shift Rostering, Biometric/PIN Attendance & Gratuity Tip Pool Exports
__exportStar(require("./staff-roster"), exports);
// Restaurant Table Reservation CRM & Guest Dietary Allergens Exports
__exportStar(require("./dining-reservations"), exports);
// Daily Night Audit & Business Date Rollover Exports
__exportStar(require("./night-audit"), exports);
// Hotel Revenue Manager & Dynamic ADR/RevPAR Automation Exports
__exportStar(require("./revenue-manager"), exports);
// Universal Customer Self-Service Portal Exports
__exportStar(require("./customer-portal"), exports);
// Smart Table Availability & Co-Dining / Community Table Seat-Level Booking Exports
__exportStar(require("./co-dining"), exports);
// Independent Seat-Level Billing & Sub-Folio Settlement Engine Exports
__exportStar(require("./seat-billing"), exports);
// Permanent Table QR Locker & 10s Waiter Auto-Approval Engine Exports
__exportStar(require("./qr-locker"), exports);
// Waiter Zone Assignment & Targeted Push Alerts Exports
__exportStar(require("./waiter-zones"), exports);
// Multi-Floor Waiter Duty Matrix & Admin Dynamic Range Assigner Exports
__exportStar(require("./floor-duty-matrix"), exports);
// Dynamic Staff Load Balancing & Late Attendance Auto-Spillover Exports
__exportStar(require("./load-balancer"), exports);
// Configurable Food Pickup SLA Slider & Waiter On-My-Way Snooze Exports
__exportStar(require("./food-pickup-sla"), exports);
// Multi-Tender Split Payment & Cashier Shift Float Exports
__exportStar(require("./multi-tender"), exports);
// Waiter Handheld Dynamic Locked UPI QR Generator & Soundbox Exports
__exportStar(require("./dynamic-upi"), exports);
// Waiter Running Cash-in-Hand Float Ledger & Cash Drop Exports
__exportStar(require("./waiter-cash-float"), exports);
// Hotel Admin Omniscient Control & Alert Switchboard Exports
__exportStar(require("./admin-control"), exports);
// In-App 5-Star Rating & Negative Review Service Recovery Exports
__exportStar(require("./guest-reviews"), exports);
// KOT Lock & Manager Security PIN to Void Items (Anti-theft & Waste Tracking) Exports
__exportStar(require("./kot-void"), exports);
