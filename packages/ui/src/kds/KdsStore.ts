import {
  KdsOrderCardModel,
  KitchenStationModel,
  KdsOverallOrderStatus,
  KdsItemProductionStatus,
} from './types';
import { KdsHelper } from './KdsHelper';
import { KitchenKdsChimePattern, ToneConfig } from '../index';

export type KdsStoreListener = () => void;
export type KdsAudioChimeTrigger = (tones: ToneConfig[]) => void;

export class KdsStore {
  private static instance: KdsStore | null = null;

  public static getInstance(initialOrders: KdsOrderCardModel[] = [], stations: KitchenStationModel[] = []): KdsStore {
    if (!KdsStore.instance) {
      KdsStore.instance = new KdsStore(initialOrders, stations);
    }
    return KdsStore.instance;
  }

  private orders: Map<string, KdsOrderCardModel> = new Map();
  private stations: KitchenStationModel[] = [];
  private selectedStationId: string | 'ALL' = 'ALL';
  private selectedStatus: KdsOverallOrderStatus | 'ALL' = 'ALL';
  private listeners: Set<KdsStoreListener> = new Set();
  private chimeHandler?: KdsAudioChimeTrigger;

  constructor(initialOrders: KdsOrderCardModel[] = [], stations: KitchenStationModel[] = []) {
    this.stations = [...stations];
    for (const o of initialOrders) {
      const elapsedMinutes = KdsHelper.calculateElapsedMinutes(o.placedAt);
      const urgencyLevel = KdsHelper.getUrgencyLevel(elapsedMinutes);
      this.orders.set(o.id, {
        ...o,
        elapsedMinutes,
        urgencyLevel,
      });
    }
  }

  public registerChimeHandler(handler: KdsAudioChimeTrigger): void {
    this.chimeHandler = handler;
  }

  public setStations(stations: KitchenStationModel[]): void {
    this.stations = [...stations];
    this.notify();
  }

  public markReady(orderId: string): void {
    this.markOrderReady(orderId);
  }

  public getStations(): KitchenStationModel[] {
    return [...this.stations];
  }

  public setOrders(orders: any[]): void {
    this.orders.clear();
    for (const o of orders) {
      const id = o.id || o.orderId;
      const elapsedMinutes = o.placedAt ? KdsHelper.calculateElapsedMinutes(o.placedAt) : 0;
      const urgencyLevel = KdsHelper.getUrgencyLevel(elapsedMinutes);
      this.orders.set(id, {
        ...o,
        id,
        elapsedMinutes,
        urgencyLevel,
      });
    }
    this.notify();
  }

  public getOrders(): KdsOrderCardModel[] {
    return Array.from(this.orders.values()).sort(
      (a, b) => new Date(a.placedAt).getTime() - new Date(b.placedAt).getTime()
    );
  }

  public getSelectedStationId(): string | 'ALL' {
    return this.selectedStationId;
  }

  public selectStation(stationId: string | 'ALL'): void {
    this.selectedStationId = stationId;
    this.notify();
  }

  public getSelectedStatus(): KdsOverallOrderStatus | 'ALL' {
    return this.selectedStatus;
  }

  public selectStatus(status: KdsOverallOrderStatus | 'ALL'): void {
    this.selectedStatus = status;
    this.notify();
  }

  public getFilteredOrders(): KdsOrderCardModel[] {
    let result = this.getOrders();
    result = KdsHelper.filterOrdersByStation(result, this.selectedStationId);
    result = KdsHelper.filterOrdersByStatus(result, this.selectedStatus);
    return result;
  }

  public getPendingCountForStation(stationId: string | 'ALL'): number {
    const stationOrders = KdsHelper.filterOrdersByStation(this.getOrders(), stationId);
    return stationOrders.filter(
      (o) => o.orderStatus === 'PLACED' || o.orderStatus === 'ACCEPTED' || o.orderStatus === 'PREPARING'
    ).length;
  }

  /**
   * Handle incoming Socket.IO event 'order:created'
   */
  public handleNewOrder(order: KdsOrderCardModel): void {
    const elapsedMinutes = KdsHelper.calculateElapsedMinutes(order.placedAt);
    const urgencyLevel = KdsHelper.getUrgencyLevel(elapsedMinutes);

    this.orders.set(order.id, {
      ...order,
      elapsedMinutes,
      urgencyLevel,
    });

    if (this.chimeHandler) {
      this.chimeHandler(KitchenKdsChimePattern);
    }

    this.notify();
  }

  /**
   * Handle incoming Socket.IO event 'order:status_updated'
   */
  public handleStatusUpdated(payload: {
    orderId: string;
    orderStatus: KdsOverallOrderStatus;
    readyAt?: string;
  }): void {
    const existing = this.orders.get(payload.orderId);
    if (!existing) return;

    existing.orderStatus = payload.orderStatus;
    if (payload.readyAt) {
      existing.readyAt = payload.readyAt;
    }

    // If marked SERVED or CANCELLED, remove from active board or update status
    this.notify();
  }

  // --- Optimistic Local Action Methods ---

  public markOrderPreparing(orderId: string): void {
    const existing = this.orders.get(orderId);
    if (!existing) return;
    if (existing.orderStatus === 'SERVED' || existing.orderStatus === 'CANCELLED') return;
    if (KdsHelper.isOrderBlockedByAllergen(existing)) {
      throw new Error(`Safety Lock Active: Order ${existing.orderNumber} has unacknowledged allergen/dietary warnings!`);
    }
    existing.orderStatus = 'PREPARING';
    existing.items.forEach((item) => {
      if (item.itemStatus === 'PENDING') item.itemStatus = 'PREPARING';
    });
    this.notify();
  }

  public markOrderReady(orderId: string): void {
    const existing = this.orders.get(orderId);
    if (!existing) return;
    if (existing.orderStatus === 'SERVED' || existing.orderStatus === 'CANCELLED') return;
    if (KdsHelper.isOrderBlockedByAllergen(existing)) {
      throw new Error(`Safety Lock Active: Order ${existing.orderNumber} has unacknowledged allergen/dietary warnings!`);
    }
    existing.orderStatus = 'READY';
    existing.readyAt = new Date().toISOString();
    existing.items.forEach((item) => {
      item.itemStatus = 'READY';
    });
    this.notify();
  }

  public markOrderServed(orderId: string): void {
    const existing = this.orders.get(orderId);
    if (!existing) return;
    if (existing.orderStatus === 'CANCELLED') return;
    existing.orderStatus = 'SERVED';
    existing.servedAt = new Date().toISOString();
    existing.items.forEach((item) => {
      item.itemStatus = 'SERVED';
    });
    this.notify();
  }

  public markItemStatus(orderId: string, itemId: string, status: KdsItemProductionStatus): void {
    const order = this.orders.get(orderId);
    if (!order) return;

    const item = order.items.find((i) => i.itemId === itemId || i.menuItemId === itemId);
    if (item) {
      if ((status === 'PREPARING' || status === 'READY') && KdsHelper.isItemBlockedByAllergen(item)) {
        throw new Error(`Safety Lock Active: Item '${item.name}' has unacknowledged allergen warnings!`);
      }
      item.itemStatus = status;
    }

    const hasItems = order.items.length > 0;
    const allReady = hasItems && order.items.every((i) => i.itemStatus === 'READY');
    if (order.orderStatus !== 'SERVED' && order.orderStatus !== 'CANCELLED') {
      if (allReady) {
        order.orderStatus = 'READY';
        order.readyAt = new Date().toISOString();
      } else {
        order.orderStatus = 'PREPARING';
      }
    }

    this.notify();
  }

  /**
   * Acknowledge allergen for a specific item (local optimistic update)
   */
  public acknowledgeItemAllergen(orderId: string, itemIndex: number, chefName: string): boolean {
    const order = this.orders.get(orderId);
    if (!order || !order.items[itemIndex]) return false;

    const item = order.items[itemIndex];
    item.chefAllergenAcknowledged = true;
    item.acknowledgedChefName = chefName;
    item.acknowledgedAt = new Date().toISOString();
    this.notify();
    return true;
  }

  /**
   * Acknowledge all pending allergens for an entire order
   */
  public acknowledgeAllOrderAllergens(orderId: string, chefName: string): number {
    const order = this.orders.get(orderId);
    if (!order) return 0;

    let count = 0;
    const now = new Date().toISOString();
    for (const item of order.items) {
      if (item.hasAllergenAlert && !item.chefAllergenAcknowledged) {
        item.chefAllergenAcknowledged = true;
        item.acknowledgedChefName = chefName;
        item.acknowledgedAt = now;
        count++;
      }
    }
    if (count > 0) {
      this.notify();
    }
    return count;
  }

  /**
   * Shift 47: Handle incoming real-time socket event 'kds:allergen_acknowledged'
   */
  public handleAllergenAcknowledged(payload: {
    orderId: string;
    itemIndex?: number;
    itemName?: string;
    acknowledgedBy: string;
    acknowledgedAt: string | Date;
  }): void {
    const order = this.orders.get(payload.orderId);
    if (!order) return;

    const dateStr = typeof payload.acknowledgedAt === 'string' ? payload.acknowledgedAt : payload.acknowledgedAt.toISOString();

    if (payload.itemIndex !== undefined && order.items[payload.itemIndex]) {
      const item = order.items[payload.itemIndex];
      item.chefAllergenAcknowledged = true;
      item.acknowledgedChefName = payload.acknowledgedBy;
      item.acknowledgedAt = dateStr;
    } else {
      // All items acknowledged
      for (const item of order.items) {
        if (item.hasAllergenAlert) {
          item.chefAllergenAcknowledged = true;
          item.acknowledgedChefName = payload.acknowledgedBy;
          item.acknowledgedAt = dateStr;
        }
      }
    }

    this.notify();
  }

  /**
   * Periodic live timer updater (e.g. called every 30s or 60s)
   */
  public tickTimers(now: Date = new Date()): void {
    for (const order of this.orders.values()) {
      order.elapsedMinutes = KdsHelper.calculateElapsedMinutes(order.placedAt, now);
      order.urgencyLevel = KdsHelper.getUrgencyLevel(order.elapsedMinutes);
    }
    this.notify();
  }

  // --- Pub/Sub ---

  public subscribe(listener: KdsStoreListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
