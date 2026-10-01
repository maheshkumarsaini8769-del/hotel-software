import { TableStatus } from '@spicehub/shared-types';
import { LiveTableCardModel, FloorPlanFilterOptions } from './types';
import { FloorLayoutHelper } from './FloorLayoutHelper';

export type FloorPlanListener = (tables: LiveTableCardModel[]) => void;

export class FloorPlanStore {
  private tables: Map<string, LiveTableCardModel> = new Map();
  private filters: FloorPlanFilterOptions = { section: 'ALL', status: 'ALL' };
  private listeners: Set<FloorPlanListener> = new Set();

  constructor(initialTables: LiveTableCardModel[] = []) {
    this.setTables(initialTables);
  }

  /**
   * Bulk set or replace table list
   */
  public setTables(tables: LiveTableCardModel[]): void {
    this.tables.clear();
    for (const t of tables) {
      this.tables.set(t.id, { ...t });
    }
    this.notify();
  }

  /**
   * Get single table by ID
   */
  public getTable(tableId: string): LiveTableCardModel | undefined {
    return this.tables.get(tableId);
  }

  /**
   * Get all raw tables
   */
  public getAllTables(): LiveTableCardModel[] {
    return Array.from(this.tables.values());
  }

  /**
   * Get filtered tables based on current filter state
   */
  public getFilteredTables(): LiveTableCardModel[] {
    return FloorLayoutHelper.filterTables(this.getAllTables(), this.filters);
  }

  /**
   * Set filter options and re-notify listeners
   */
  public setFilters(filters: Partial<FloorPlanFilterOptions>): void {
    this.filters = { ...this.filters, ...filters };
    this.notify();
  }

  public getFilters(): FloorPlanFilterOptions {
    return { ...this.filters };
  }

  /**
   * Handle real-time Socket.IO event 'table:status_changed'
   */
  public handleTableStatusChanged(payload: { tableId: string; status: TableStatus; sessionId?: string }): void {
    const table = this.tables.get(payload.tableId);
    if (!table) return;

    table.currentStatus = payload.status;
    if (payload.sessionId !== undefined) {
      table.activeSessionId = payload.sessionId;
    }

    if (payload.status === TableStatus.OCCUPIED && !table.sessionStartTime) {
      table.sessionStartTime = new Date().toISOString();
    } else if (payload.status === TableStatus.AVAILABLE) {
      table.activeSessionId = undefined;
      table.sessionStartTime = undefined;
      table.activeOrderTotal = 0;
      table.activeItemsCount = 0;
    }

    this.notify();
  }

  /**
   * Handle real-time Socket.IO event 'order:created' to update table active order total
   */
  public handleOrderCreated(payload: { tableId?: string; totalAmount: number; itemCount?: number }): void {
    if (!payload.tableId) return;
    const table = this.tables.get(payload.tableId);
    if (!table) return;

    table.activeOrderTotal = (table.activeOrderTotal || 0) + payload.totalAmount;
    if (payload.itemCount) {
      table.activeItemsCount = (table.activeItemsCount || 0) + payload.itemCount;
    }
    this.notify();
  }

  /**
   * Subscribe to floor plan state changes
   */
  public subscribe(listener: FloorPlanListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const list = this.getFilteredTables();
    for (const listener of this.listeners) {
      listener(list);
    }
  }

  /**
   * Quick action: Seat a table directly
   */
  public seatTable(tableId: string, sessionId: string, guestCount?: number): void {
    const table = this.tables.get(tableId);
    if (!table) return;

    table.currentStatus = TableStatus.OCCUPIED;
    table.activeSessionId = sessionId;
    table.guestCount = guestCount;
    table.sessionStartTime = new Date().toISOString();
    table.activeOrderTotal = 0;
    table.activeItemsCount = 0;
    this.notify();
  }

  /**
   * Quick action: Request Bill for table
   */
  public markBilling(tableId: string): void {
    const table = this.tables.get(tableId);
    if (!table) return;

    table.currentStatus = TableStatus.BILLING;
    this.notify();
  }

  /**
   * Quick action: Reset table to Dirty for busser / cleaning
   */
  public markDirty(tableId: string): void {
    const table = this.tables.get(tableId);
    if (!table) return;

    table.currentStatus = TableStatus.DIRTY;
    table.activeSessionId = undefined;
    table.sessionStartTime = undefined;
    table.activeOrderTotal = 0;
    table.activeItemsCount = 0;
    this.notify();
  }

  /**
   * Quick action: Mark cleaned and available
   */
  public markAvailable(tableId: string): void {
    const table = this.tables.get(tableId);
    if (!table) return;

    table.currentStatus = TableStatus.AVAILABLE;
    table.activeSessionId = undefined;
    table.sessionStartTime = undefined;
    table.activeOrderTotal = 0;
    table.activeItemsCount = 0;
    this.notify();
  }
}
