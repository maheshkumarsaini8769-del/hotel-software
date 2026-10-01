export interface RatingDimensions {
    overall: number;
    foodQuality?: number;
    serviceSpeed?: number;
    ambienceCleanliness?: number;
    valueForMoney?: number;
}
export interface ServiceRecoveryData {
    status: 'NONE' | 'TRIGGERED' | 'MANAGER_VISITING' | 'COMPLIMENTARY_OFFERED' | 'RESOLVED' | 'ESCALATED';
    assignedManagerId?: string;
    assignedManagerName?: string;
    recoveryAction?: string;
    discountPercentage?: number;
    recoveryNotes?: string;
    triggeredAt?: string;
    resolvedAt?: string;
}
export interface GuestReviewItem {
    _id: string;
    hotelId: string;
    guestName: string;
    guestPhone?: string;
    orderId?: string;
    billId?: string;
    stayId?: string;
    source: 'TABLE_QR' | 'ROOM_PORTAL' | 'FRONT_DESK' | 'FAST_TAKEAWAY';
    tableNumber?: string;
    roomNumber?: string;
    waiterId?: string;
    waiterName?: string;
    ratings: RatingDimensions;
    tags: string[];
    comments?: string;
    isNegative: boolean;
    serviceRecovery: ServiceRecoveryData;
    googleReviewPrompted: boolean;
    googleReviewClicked: boolean;
    createdAt: string;
}
export interface CsatMetrics {
    totalReviews: number;
    negativeReviewsCount: number;
    positiveReviewsCount: number;
    averageOverall: number;
    averageFood: number;
    averageService: number;
    csatPercentage: number;
}
export interface StaffLeaderboardEntry {
    waiterId: string;
    waiterName: string;
    totalReviews: number;
    averageRating: number;
}
