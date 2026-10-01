import { KdsOrderCardModel, KitchenStationModel, KdsOverallOrderStatus, KdsItemProductionStatus } from './types';
import { ToneConfig } from '../index';
export type KdsStoreListener = () => void;
export type KdsAudioChimeTrigger = (tones: ToneConfig[]) => void;
export declare class KdsStore {
    private static instance;
    static getInstance(initialOrders?: KdsOrderCardModel[], stations?: KitchenStationModel[]): KdsStore;
    private orders;
    private stations;
    private selectedStationId;
    private selectedStatus;
    private listeners;
    private chimeHandler?;
    constructor(initialOrders?: KdsOrderCardModel[], stations?: KitchenStationModel[]);
    registerChimeHandler(handler: KdsAudioChimeTrigger): void;
    setStations(stations: KitchenStationModel[]): void;
    markReady(orderId: string): void;
    getStations(): KitchenStationModel[];
    setOrders(orders: any[]): void;
    getOrders(): KdsOrderCardModel[];
    getSelectedStationId(): string | 'ALL';
    selectStation(stationId: string | 'ALL'): void;
    getSelectedStatus(): KdsOverallOrderStatus | 'ALL';
    selectStatus(status: KdsOverallOrderStatus | 'ALL'): void;
    getFilteredOrders(): KdsOrderCardModel[];
    getPendingCountForStation(stationId: string | 'ALL'): number;
    /**
     * Handle incoming Socket.IO event 'order:created'
     */
    handleNewOrder(order: KdsOrderCardModel): void;
    /**
     * Handle incoming Socket.IO event 'order:status_updated'
     */
    handleStatusUpdated(payload: {
        orderId: string;
        orderStatus: KdsOverallOrderStatus;
        readyAt?: string;
    }): void;
    markOrderPreparing(orderId: string): void;
    markOrderReady(orderId: string): void;
    markOrderServed(orderId: string): void;
    markItemStatus(orderId: string, itemId: string, status: KdsItemProductionStatus): void;
    /**
     * Shift 47: Acknowledge allergen for a specific item (local optimistic update)
     */
    acknowledgeItemAllergen(orderId: string, itemIndex: number, chefName: string): boolean;
    /**
     * Shift 47: Acknowledge all pending allergens for an entire order
     */
    acknowledgeAllOrderAllergens(orderId: string, chefName: string): number;
    /**
     * Shift 47: Handle incoming real-time socket event 'kds:allergen_acknowledged'
     */
    handleAllergenAcknowledged(payload: {
        orderId: string;
        itemIndex?: number;
        itemName?: string;
        acknowledgedBy: string;
        acknowledgedAt: string | Date;
    }): void;
    /**
     * Periodic live timer updater (e.g. called every 30s or 60s)
     */
    tickTimers(now?: Date): void;
    subscribe(listener: KdsStoreListener): () => void;
    private notify;
}
