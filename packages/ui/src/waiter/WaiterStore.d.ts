import { ShiftStatus } from '@spicehub/shared-types';
import { WaiterServiceRequestModel, DraftKot, DraftOrderItem, WaiterProfileState } from './types';
import { ToneConfig } from '../index';
export type WaiterStoreListener = () => void;
export type AudioChimeTrigger = (tones: ToneConfig[]) => void;
export declare class WaiterStore {
    private static instance;
    static getInstance(profile?: Partial<WaiterProfileState>, initialRequests?: WaiterServiceRequestModel[]): WaiterStore;
    private requests;
    private profile;
    private draftKot;
    private listeners;
    private chimeCallback?;
    constructor(profile: WaiterProfileState, initialRequests?: WaiterServiceRequestModel[]);
    registerChimeHandler(handler: AudioChimeTrigger): void;
    getProfile(): WaiterProfileState;
    setProfile(profileUpdate: Partial<WaiterProfileState>): void;
    setRequests(reqs: any[]): void;
    addRequest(req: any): void;
    setShiftStatus(status: ShiftStatus): void;
    getRequests(): WaiterServiceRequestModel[];
    getActiveRequests(): WaiterServiceRequestModel[];
    getPendingRequests(): WaiterServiceRequestModel[];
    /**
     * Handle incoming Socket.IO event 'request:new'
     */
    handleNewRequest(payload: WaiterServiceRequestModel): void;
    /**
     * Handle incoming Socket.IO event 'request:status_updated'
     */
    handleStatusUpdated(payload: {
        requestId: string;
        status: string;
        assignedUserId?: string;
    }): void;
    /**
     * 1-Tap Acknowledge Action (Local State Prediction)
     */
    markAccepted(requestId: string): void;
    /**
     * 1-Tap Fulfill Action (Local State Prediction)
     */
    markCompleted(requestId: string): void;
    initDraftKot(tableId: string, sessionId: string, tableNumber?: string): void;
    getDraftKot(): DraftKot | null;
    addItemToKot(item: DraftOrderItem): void;
    updateKotItemQuantity(menuItemId: string, delta: number): void;
    clearDraftKot(): void;
    calculateDraftKotSubtotal(): number;
    subscribe(listener: WaiterStoreListener): () => void;
    private notify;
}
