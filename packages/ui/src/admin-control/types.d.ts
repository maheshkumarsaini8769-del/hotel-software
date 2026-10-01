export interface TelemetryDiningStats {
    totalTables: number;
    availableTables: number;
    occupiedTables: number;
    billingTables: number;
    dirtyTables: number;
    occupancyRate: number;
}
export interface TelemetryRoomStats {
    totalRooms: number;
    availableRooms: number;
    occupiedRooms: number;
    dirtyRooms: number;
    occupancyRate: number;
}
export interface TelemetryKitchenStats {
    activeOrdersCount: number;
    placedOrdersCount: number;
    preparingOrdersCount: number;
    readyOrdersCount: number;
    delayedOrdersCount: number;
    kdsHealth: string;
}
export interface TelemetryFinancialStats {
    todayBillsCount: number;
    todayGrossSales: number;
    todayCollected: number;
    todayPendingDue: number;
    collectionByMode: {
        cash: number;
        upi: number;
        card: number;
    };
}
export interface TelemetryCashierStats {
    activeShiftsCount: number;
    totalCashInDrawers: number;
}
export interface TelemetryAlertsStats {
    activeAlertsCount: number;
    criticalAlertsCount: number;
}
export interface HotelTelemetryData {
    success: boolean;
    timestamp: string;
    dining: TelemetryDiningStats;
    rooms: TelemetryRoomStats;
    kitchen: TelemetryKitchenStats;
    financials: TelemetryFinancialStats;
    cashier: TelemetryCashierStats;
    alerts: TelemetryAlertsStats;
}
export interface SubscriptionItem {
    category: string;
    enabled: boolean;
    minThreshold: number;
    channels: string[];
    soundChime: boolean;
    urgentVibration: boolean;
}
export interface QuietHoursConfig {
    enabled: boolean;
    startTime: string;
    endTime: string;
    allowCriticalOnly: boolean;
}
export interface UserNotificationPreference {
    _id?: string;
    hotelId: string;
    userId: string;
    role: string;
    subscriptions: SubscriptionItem[];
    quietHours: QuietHoursConfig;
    isActive: boolean;
}
export interface AdminAlert {
    _id: string;
    hotelId: string;
    category: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'EMERGENCY';
    title: string;
    message: string;
    payload?: Record<string, any>;
    triggeredBy: string;
    deliveredChannels: string[];
    soundboxDispatched: boolean;
    soundboxSpeech?: string;
    status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';
    acknowledgedBy?: string;
    acknowledgedByName?: string;
    acknowledgedAt?: string;
    createdAt: string;
}
