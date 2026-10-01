import { GuestSessionModel, LiveRoomOrder, FolioSummaryModel } from './types';
export type GuestPortalStoreListener = () => void;
export declare class GuestPortalStore {
    private static instance;
    static getInstance(initialSession?: GuestSessionModel | null): GuestPortalStore;
    private session;
    private liveOrders;
    private recentRequests;
    private folioSummary;
    private activeTab;
    private selectedLiveOrder;
    private isLoading;
    private listeners;
    constructor(initialSession?: GuestSessionModel | null);
    setStayDetails(details: any): void;
    getSession(): GuestSessionModel | null;
    setSession(session: GuestSessionModel | null): void;
    getLiveOrders(): LiveRoomOrder[];
    setLiveOrders(orders: LiveRoomOrder[]): void;
    getActiveOrdersCount(): number;
    getRecentRequests(): Array<{
        id: string;
        requestType: string;
        status: string;
        createdAt: string;
    }>;
    addConciergeRequest(req: {
        id: string;
        requestType: string;
        status: string;
        createdAt: string;
    }): void;
    getFolioSummary(): FolioSummaryModel | null;
    setFolioSummary(summary: FolioSummaryModel | null): void;
    getActiveTab(): 'HOME' | 'DINING' | 'ORDERS' | 'FOLIO';
    setActiveTab(tab: 'HOME' | 'DINING' | 'ORDERS' | 'FOLIO'): void;
    getSelectedLiveOrder(): LiveRoomOrder | null;
    openOrderTracker(order: LiveRoomOrder): void;
    closeOrderTracker(): void;
    setIsLoading(loading: boolean): void;
    getIsLoading(): boolean;
    /**
     * Handle real-time Socket event 'order:status_updated'
     */
    handleOrderStatusUpdated(payload: {
        orderId: string;
        orderStatus: 'PLACED' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';
        readyAt?: string;
    }): void;
    /**
     * Handle real-time Socket event 'request:status_updated'
     */
    handleRequestStatusUpdated(payload: {
        requestId: string;
        status: string;
    }): void;
    subscribe(listener: GuestPortalStoreListener): () => void;
    private notify;
}
