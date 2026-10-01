import { TableStatus } from '@spicehub/shared-types';
import { LiveTableCardModel, FloorPlanFilterOptions } from './types';
export type FloorPlanListener = (tables: LiveTableCardModel[]) => void;
export declare class FloorPlanStore {
    private tables;
    private filters;
    private listeners;
    constructor(initialTables?: LiveTableCardModel[]);
    /**
     * Bulk set or replace table list
     */
    setTables(tables: LiveTableCardModel[]): void;
    /**
     * Get single table by ID
     */
    getTable(tableId: string): LiveTableCardModel | undefined;
    /**
     * Get all raw tables
     */
    getAllTables(): LiveTableCardModel[];
    /**
     * Get filtered tables based on current filter state
     */
    getFilteredTables(): LiveTableCardModel[];
    /**
     * Set filter options and re-notify listeners
     */
    setFilters(filters: Partial<FloorPlanFilterOptions>): void;
    getFilters(): FloorPlanFilterOptions;
    /**
     * Handle real-time Socket.IO event 'table:status_changed'
     */
    handleTableStatusChanged(payload: {
        tableId: string;
        status: TableStatus;
        sessionId?: string;
    }): void;
    /**
     * Handle real-time Socket.IO event 'order:created' to update table active order total
     */
    handleOrderCreated(payload: {
        tableId?: string;
        totalAmount: number;
        itemCount?: number;
    }): void;
    /**
     * Subscribe to floor plan state changes
     */
    subscribe(listener: FloorPlanListener): () => void;
    private notify;
    /**
     * Quick action: Seat a table directly
     */
    seatTable(tableId: string, sessionId: string, guestCount?: number): void;
    /**
     * Quick action: Request Bill for table
     */
    markBilling(tableId: string): void;
    /**
     * Quick action: Reset table to Dirty for busser / cleaning
     */
    markDirty(tableId: string): void;
    /**
     * Quick action: Mark cleaned and available
     */
    markAvailable(tableId: string): void;
}
