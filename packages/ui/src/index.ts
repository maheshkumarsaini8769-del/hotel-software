import { TableStatus, RoomStatus, OrderStatus, FoodType } from '@spicehub/shared-types';
export { TableStatus, RoomStatus, OrderStatus, FoodType };

export { ErrorBoundary } from './ErrorBoundary';
export type { ErrorBoundaryProps } from './ErrorBoundary';

export { StaffLoginGate } from './StaffLoginGate';
export type { StaffLoginGateProps, StaffSessionUser } from './StaffLoginGate';

// Bilingual i18n
export { translations } from './i18n/translations';
export type { Locale } from './i18n/translations';
export { I18nProvider, useTranslation, LanguageToggle, I18N_STORAGE_KEY } from './i18n/I18nContext';
export type { I18nContextType, LanguageToggleProps } from './i18n/I18nContext';

// Currency Formatter
export const formatCurrency = (amount: number, currency = 'INR'): string => {
  if (currency === 'INR') {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
};

// Visual Status Colors
export const TableStatusColorMap: Record<TableStatus, { bg: string; text: string; border: string; label: string }> = {
  [TableStatus.AVAILABLE]: { bg: 'bg-emerald-500/10', text: 'text-emerald-500 dark:text-emerald-400', border: 'border-emerald-500/30', label: 'Available' },
  [TableStatus.OCCUPIED]: { bg: 'bg-red-500/10', text: 'text-red-500 dark:text-red-400', border: 'border-red-500/30', label: 'Occupied' },
  [TableStatus.BILLING]: { bg: 'bg-amber-500/10', text: 'text-amber-500 dark:text-amber-400', border: 'border-amber-500/30', label: 'Billing' },
  [TableStatus.PAYMENT_SETTLED]: { bg: 'bg-blue-500/10', text: 'text-blue-500 dark:text-blue-400', border: 'border-blue-500/30', label: 'Payment Settled' },
  [TableStatus.DIRTY]: { bg: 'bg-amber-500/10', text: 'text-amber-500 dark:text-amber-400', border: 'border-amber-500/30', label: 'Dirty' },
  [TableStatus.CLEANING]: { bg: 'bg-amber-500/10', text: 'text-amber-500 dark:text-amber-400', border: 'border-amber-500/30', label: 'Cleaning' },
  [TableStatus.RESERVED]: { bg: 'bg-blue-500/10', text: 'text-blue-500 dark:text-blue-400', border: 'border-blue-500/30', label: 'Reserved' },
  [TableStatus.PARTIALLY_OCCUPIED]: { bg: 'bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-500/30', label: 'Partially Occupied' },
  [TableStatus.MERGED]: { bg: 'bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-500/30', label: 'Merged Tab' },
};

export const RoomStatusColorMap: Record<RoomStatus, { bg: string; text: string; label: string }> = {
  [RoomStatus.AVAILABLE]: { bg: 'bg-emerald-600', text: 'text-white', label: 'Available' },
  [RoomStatus.RESERVED]: { bg: 'bg-blue-600', text: 'text-white', label: 'Reserved' },
  [RoomStatus.OCCUPIED]: { bg: 'bg-red-600', text: 'text-white', label: 'Occupied' },
  [RoomStatus.DIRTY]: { bg: 'bg-amber-600', text: 'text-white', label: 'Dirty' },
  [RoomStatus.CLEANING]: { bg: 'bg-amber-500', text: 'text-white', label: 'Cleaning' },
  [RoomStatus.INSPECTION]: { bg: 'bg-amber-600', text: 'text-white', label: 'Inspection' },
  [RoomStatus.OUT_OF_SERVICE]: { bg: 'bg-slate-600', text: 'text-slate-200', label: 'Out of Order' },
};

export const FoodTypeBadge: Record<FoodType, { icon: string; color: string; label: string }> = {
  [FoodType.VEG]: { icon: '🟢', color: 'border-emerald-600 text-emerald-600 dark:text-emerald-400', label: 'Veg' },
  [FoodType.NON_VEG]: { icon: '🔴', color: 'border-red-600 text-red-600 dark:text-red-400', label: 'Non-Veg' },
  [FoodType.EGG]: { icon: '🟡', color: 'border-amber-600 text-amber-600 dark:text-amber-400', label: 'Egg' },
  [FoodType.BEVERAGE]: { icon: '🔵', color: 'border-blue-600 text-blue-600 dark:text-blue-400', label: 'Beverage' },
};

export type AudioOscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'custom';

export interface ToneConfig {
  frequency: number;
  type?: AudioOscillatorType;
  durationMs: number;
}

export const KitchenKdsChimePattern: ToneConfig[] = [
  { frequency: 587.33, durationMs: 150 }, // D5
  { frequency: 880.00, durationMs: 250 }, // A5
];

export const WaiterAlertChimePattern: ToneConfig[] = [
  { frequency: 800, durationMs: 100 },
  { frequency: 1000, durationMs: 150 },
  { frequency: 1200, durationMs: 200 },
];

export class StatCardCalculator {
  public static calculateGrowth(current: number, previous: number): { percentage: number; isPositive: boolean } {
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

// Floor Plan Exports
export * from './floor-plan/types';
export * from './floor-plan/FloorLayoutHelper';
export * from './floor-plan/FloorPlanStore';

// Waiter App Exports
export * from './waiter/types';
export * from './waiter/WaiterStore';

// Menu & Cart Exports
export * from './menu-cart';
export { MenuCartStore } from './menu-cart/MenuCartStore';

// Billing & Cashier Exports
export * from './billing/types';
export * from './billing/BillingCalculatorHelper';

// Kitchen KDS Exports
export * from './kds/types';
export * from './kds/KdsHelper';
export * from './kds/KdsStore';

// PMS Reservation Matrix Exports
export * from './pms/types';
export * from './pms/MatrixHelper';
export * from './pms/MatrixStore';

// In-Room Guest Portal Exports
export * from './guest-portal/types';
export * from './guest-portal/GuestPortalHelper';
export * from './guest-portal/GuestPortalStore';

// Housekeeping Mobile & Board Exports
export * from './housekeeping/types';
export * from './housekeeping/HousekeepingHelper';
export * from './housekeeping/HousekeepingStore';

// Table & Room Reservation Live Manager Exports
export * from './reservations/types';
export * from './reservations/ReservationHelper';
export * from './reservations/ReservationStore';

// Corporate Group Bookings & Split Folio Engine Exports
export * from './corporate';

// Banquet & Event Management Engine Exports
export * from './banquet';

// Fast Cashier POS Express Engine Exports
export * from './fast-cashier';

// Recipe Costing & Food Waste Audit Exports
export * from './recipe-costing';

// Central Store Purchase Orders & GRN Procurement Exports
export * from './inventory-po';

// Departmental Store Requisitions, Transfers & FEFO Exports
export * from './store-requisition';

// Physical Inventory Stock Audit & Discrepancy Reconciliation Exports
export * from './inventory-audit';

// F&B Menu Engineering Matrix & BCG Profitability Analyzer Exports
export * from './menu-engineering';

// Staff Shift Rostering, Biometric/PIN Attendance & Gratuity Tip Pool Exports
export * from './staff-roster';

// Restaurant Table Reservation CRM & Guest Dietary Allergens Exports
export * from './dining-reservations';

// Daily Night Audit & Business Date Rollover Exports
export * from './night-audit';

// Hotel Revenue Manager & Dynamic ADR/RevPAR Automation Exports
export * from './revenue-manager';

// Universal Customer Self-Service Portal Exports
export * from './customer-portal';

// Smart Table Availability & Co-Dining / Community Table Seat-Level Booking Exports
export * from './co-dining';

// Independent Seat-Level Billing & Sub-Folio Settlement Engine Exports
export * from './seat-billing';

// Permanent Table QR Locker & 10s Waiter Auto-Approval Engine Exports
export * from './qr-locker';

// Waiter Zone Assignment & Targeted Push Alerts Exports
export * from './waiter-zones';

// Multi-Floor Waiter Duty Matrix & Admin Dynamic Range Assigner Exports
export * from './floor-duty-matrix';

// Dynamic Staff Load Balancing & Late Attendance Auto-Spillover Exports
export * from './load-balancer';

// Configurable Food Pickup SLA Slider & Waiter On-My-Way Snooze Exports
export * from './food-pickup-sla';

// Multi-Tender Split Payment & Cashier Shift Float Exports
export * from './multi-tender';

// Waiter Handheld Dynamic Locked UPI QR Generator & Soundbox Exports
export * from './dynamic-upi';

// Waiter Running Cash-in-Hand Float Ledger & Cash Drop Exports
export * from './waiter-cash-float';

// Hotel Admin Omniscient Control & Alert Switchboard Exports
export * from './admin-control';

// In-App 5-Star Rating & Negative Review Service Recovery Exports
export * from './guest-reviews';

// KOT Lock & Manager Security PIN to Void Items (Anti-theft & Waste Tracking) Exports
export * from './kot-void';

// PMS Express Check-Out, Atomic Folio Settlement & Keycard Void Engine Exports
export * from './pms-checkout';

// Quick Policy Reference & Front-Line SOP Modal
export * from './pms/QuickPolicyReferenceModal';

// Unified Portal Directory & Workstation Launcher
export * from './launcher';

// Internationalization (i18n) Universal Hindi / English Exports
export * from './i18n/I18nContext';
export * from './i18n/translations';











