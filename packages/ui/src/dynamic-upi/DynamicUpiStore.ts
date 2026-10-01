import { DynamicUpiQrDto, UpiQrStatus } from './types';

export type DynamicUpiListener = (state: DynamicUpiState) => void;

export interface DynamicUpiState {
  activeQr: DynamicUpiQrDto | null;
  timeRemaining: number;
  isPolling: boolean;
  soundboxNotificationReceived: boolean;
  lastAnnouncement: string | null;
}

export class DynamicUpiStore {
  private static instance: DynamicUpiStore;
  private state: DynamicUpiState = {
    activeQr: null,
    timeRemaining: 0,
    isPolling: false,
    soundboxNotificationReceived: false,
    lastAnnouncement: null,
  };
  private listeners: Set<DynamicUpiListener> = new Set();
  private timerInterval: any = null;

  private constructor() {}

  public static getInstance(): DynamicUpiStore {
    if (!DynamicUpiStore.instance) {
      DynamicUpiStore.instance = new DynamicUpiStore();
    }
    return DynamicUpiStore.instance;
  }

  public getState(): DynamicUpiState {
    return { ...this.state };
  }

  public subscribe(listener: DynamicUpiListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const currentState = this.getState();
    this.listeners.forEach((listener) => listener(currentState));
  }

  public setDynamicQr(qr: DynamicUpiQrDto): void {
    this.clearInterval();
    const expiry = new Date(qr.expiresAt).getTime();
    const now = Date.now();
    const seconds = Math.max(0, Math.floor((expiry - now) / 1000));

    this.state = {
      ...this.state,
      activeQr: qr,
      timeRemaining: seconds,
      isPolling: qr.status === UpiQrStatus.PENDING,
      soundboxNotificationReceived: qr.soundboxNotified || qr.status === UpiQrStatus.PAID,
      lastAnnouncement: qr.soundboxAnnouncement || null,
    };
    this.notify();

    if (qr.status === UpiQrStatus.PENDING && seconds > 0) {
      this.startCountdown();
    }
  }

  public updateStatus(status: UpiQrStatus, soundboxAnnouncement?: string): void {
    if (!this.state.activeQr) return;
    const isPaid = status === UpiQrStatus.PAID;
    this.state = {
      ...this.state,
      activeQr: {
        ...this.state.activeQr,
        status,
        soundboxNotified: isPaid ? true : this.state.activeQr.soundboxNotified,
        soundboxAnnouncement: soundboxAnnouncement || this.state.activeQr.soundboxAnnouncement,
      },
      isPolling: status === UpiQrStatus.PENDING,
      soundboxNotificationReceived: isPaid,
      lastAnnouncement: soundboxAnnouncement || this.state.lastAnnouncement,
    };
    if (status !== UpiQrStatus.PENDING) {
      this.clearInterval();
    }
    this.notify();
  }

  public clearQr(): void {
    this.clearInterval();
    this.state = {
      activeQr: null,
      timeRemaining: 0,
      isPolling: false,
      soundboxNotificationReceived: false,
      lastAnnouncement: null,
    };
    this.notify();
  }

  private startCountdown(): void {
    this.timerInterval = setInterval(() => {
      if (this.state.timeRemaining <= 1) {
        this.clearInterval();
        this.updateStatus(UpiQrStatus.EXPIRED);
      } else {
        this.state = {
          ...this.state,
          timeRemaining: this.state.timeRemaining - 1,
        };
        this.notify();
      }
    }, 1000);
  }

  private clearInterval(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
}
