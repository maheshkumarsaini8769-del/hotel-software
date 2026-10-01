import { GuestReviewItem, CsatMetrics } from './types';

export class GuestReviewStore {
  private reviews: GuestReviewItem[] = [];
  private metrics: CsatMetrics | null = null;
  private listeners: Array<() => void> = [];

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  public setReviews(reviews: GuestReviewItem[], metrics?: CsatMetrics): void {
    this.reviews = reviews;
    if (metrics) this.metrics = metrics;
    this.notify();
  }

  public getReviews(): GuestReviewItem[] {
    return [...this.reviews];
  }

  public getMetrics(): CsatMetrics | null {
    return this.metrics;
  }

  public addReview(review: GuestReviewItem): void {
    this.reviews = [review, ...this.reviews];
    this.notify();
  }

  public updateRecoveryStatus(
    reviewId: string,
    status: any,
    recoveryAction?: string,
    managerName?: string
  ): void {
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

  public getPendingRecoveryReviews(): GuestReviewItem[] {
    return this.reviews.filter(
      (r) =>
        r.isNegative &&
        (r.serviceRecovery.status === 'TRIGGERED' || r.serviceRecovery.status === 'MANAGER_VISITING')
    );
  }
}
