import { PendingQrOrderDTO, QrSessionDTO, OrderApprovalStatus } from './types';
import { QrLockerHelper } from './QrLockerHelper';

type Listener = () => void;

export class QrLockerStore {
  private pendingOrders: PendingQrOrderDTO[] = [];
  private activeQrSession: QrSessionDTO | null = null;
  private isLoading: boolean = false;
  private errorMessage: string | null = null;
  private listeners: Listener[] = [];

  constructor(initialOrders?: PendingQrOrderDTO[]) {
    if (initialOrders) {
      this.pendingOrders = initialOrders;
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  // Getters
  public getPendingOrders(): PendingQrOrderDTO[] {
    return this.pendingOrders;
  }

  public getActiveQrSession(): QrSessionDTO | null {
    return this.activeQrSession;
  }

  public getIsLoading(): boolean {
    return this.isLoading;
  }

  public getErrorMessage(): string | null {
    return this.errorMessage;
  }

  // Actions
  public setLoading(loading: boolean): void {
    this.isLoading = loading;
    this.notify();
  }

  public setError(error: string | null): void {
    this.errorMessage = error;
    this.notify();
  }

  public setActiveQrSession(session: QrSessionDTO | null): void {
    this.activeQrSession = session;
    this.notify();
  }

  public setPendingOrders(orders: PendingQrOrderDTO[]): void {
    this.pendingOrders = orders.map((o) => ({
      ...o,
      secondsRemaining: QrLockerHelper.calculateSlaSecondsRemaining(o.approvalDeadline),
    }));
    this.notify();
  }

  public addPendingOrder(order: PendingQrOrderDTO): void {
    this.pendingOrders.unshift({
      ...order,
      secondsRemaining: QrLockerHelper.calculateSlaSecondsRemaining(order.approvalDeadline),
    });
    this.notify();
  }

  public tickCountdown(): void {
    let changed = false;
    this.pendingOrders.forEach((o) => {
      if (o.approvalStatus === 'PENDING_WAITER_APPROVAL') {
        const remaining = QrLockerHelper.calculateSlaSecondsRemaining(o.approvalDeadline);
        if (remaining !== o.secondsRemaining) {
          o.secondsRemaining = remaining;
          changed = true;
        }
        if (remaining === 0) {
          o.approvalStatus = 'AUTO_APPROVED_TIMEOUT';
          changed = true;
        }
      }
    });
    if (changed) {
      this.notify();
    }
  }

  public resolveOrder(orderId: string, status: OrderApprovalStatus): void {
    const target = this.pendingOrders.find((o) => o.orderId === orderId);
    if (target) {
      target.approvalStatus = status;
      this.notify();
    }
  }
}
