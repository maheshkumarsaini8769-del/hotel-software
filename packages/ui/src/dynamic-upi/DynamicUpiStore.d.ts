import { DynamicUpiQrDto, UpiQrStatus } from './types';
export type DynamicUpiListener = (state: DynamicUpiState) => void;
export interface DynamicUpiState {
    activeQr: DynamicUpiQrDto | null;
    timeRemaining: number;
    isPolling: boolean;
    soundboxNotificationReceived: boolean;
    lastAnnouncement: string | null;
}
export declare class DynamicUpiStore {
    private static instance;
    private state;
    private listeners;
    private timerInterval;
    private constructor();
    static getInstance(): DynamicUpiStore;
    getState(): DynamicUpiState;
    subscribe(listener: DynamicUpiListener): () => void;
    private notify;
    setDynamicQr(qr: DynamicUpiQrDto): void;
    updateStatus(status: UpiQrStatus, soundboxAnnouncement?: string): void;
    clearQr(): void;
    private startCountdown;
    private clearInterval;
}
