import { PendingQrOrderDTO, QrSessionDTO, OrderApprovalStatus } from './types';
type Listener = () => void;
export declare class QrLockerStore {
    private pendingOrders;
    private activeQrSession;
    private isLoading;
    private errorMessage;
    private listeners;
    constructor(initialOrders?: PendingQrOrderDTO[]);
    subscribe(listener: Listener): () => void;
    private notify;
    getPendingOrders(): PendingQrOrderDTO[];
    getActiveQrSession(): QrSessionDTO | null;
    getIsLoading(): boolean;
    getErrorMessage(): string | null;
    setLoading(loading: boolean): void;
    setError(error: string | null): void;
    setActiveQrSession(session: QrSessionDTO | null): void;
    setPendingOrders(orders: PendingQrOrderDTO[]): void;
    addPendingOrder(order: PendingQrOrderDTO): void;
    tickCountdown(): void;
    resolveOrder(orderId: string, status: OrderApprovalStatus): void;
}
export {};
