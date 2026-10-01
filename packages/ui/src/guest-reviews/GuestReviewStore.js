"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuestReviewStore = void 0;
class GuestReviewStore {
    reviews = [];
    metrics = null;
    listeners = [];
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter((l) => l !== listener);
        };
    }
    notify() {
        this.listeners.forEach((l) => l());
    }
    setReviews(reviews, metrics) {
        this.reviews = reviews;
        if (metrics)
            this.metrics = metrics;
        this.notify();
    }
    getReviews() {
        return [...this.reviews];
    }
    getMetrics() {
        return this.metrics;
    }
    addReview(review) {
        this.reviews = [review, ...this.reviews];
        this.notify();
    }
    updateRecoveryStatus(reviewId, status, recoveryAction, managerName) {
        this.reviews = this.reviews.map((r) => {
            if (r._id === reviewId) {
                return {
                    ...r,
                    serviceRecovery: {
                        ...r.serviceRecovery,
                        status,
                        recoveryAction: recoveryAction || r.serviceRecovery.recoveryAction,
                        assignedManagerName: managerName || r.serviceRecovery.assignedManagerName,
                        resolvedAt: status === 'RESOLVED' ? new Date().toISOString() : r.serviceRecovery.resolvedAt,
                    },
                };
            }
            return r;
        });
        this.notify();
    }
    getPendingRecoveryReviews() {
        return this.reviews.filter((r) => r.isNegative &&
            (r.serviceRecovery.status === 'TRIGGERED' || r.serviceRecovery.status === 'MANAGER_VISITING'));
    }
}
exports.GuestReviewStore = GuestReviewStore;
