import { GuestReviewItem, CsatMetrics } from './types';
export declare class GuestReviewStore {
    private reviews;
    private metrics;
    private listeners;
    subscribe(listener: () => void): () => void;
    private notify;
    setReviews(reviews: GuestReviewItem[], metrics?: CsatMetrics): void;
    getReviews(): GuestReviewItem[];
    getMetrics(): CsatMetrics | null;
    addReview(review: GuestReviewItem): void;
    updateRecoveryStatus(reviewId: string, status: any, recoveryAction?: string, managerName?: string): void;
    getPendingRecoveryReviews(): GuestReviewItem[];
}
