import {
  GuestSessionModel,
  LiveRoomOrder,
  FolioSummaryModel,
} from './types';

export type GuestPortalStoreListener = () => void;

export class GuestPortalStore {
  private static instance: GuestPortalStore | null = null;

  public static getInstance(initialSession: GuestSessionModel | null = null): GuestPortalStore {
    if (!GuestPortalStore.instance) {
      GuestPortalStore.instance = new GuestPortalStore(initialSession);
    }
    return GuestPortalStore.instance;
  }

  private session: GuestSessionModel | null = null;
  private liveOrders: LiveRoomOrder[] = [];
  private recentRequests: Array<{ id: string; requestType: string; status: string; createdAt: string }> = [];
  private folioSummary: FolioSummaryModel | null = null;
  private activeTab: 'HOME' | 'DINING' | 'ORDERS' | 'FOLIO' = 'HOME';
  private selectedLiveOrder: LiveRoomOrder | null = null;
  private isLoading: boolean = false;
  private listeners: Set<GuestPortalStoreListener> = new Set();

  constructor(initialSession: GuestSessionModel | null = null) {
    this.session = initialSession;
  }

  public setStayDetails(details: any): void {
    this.session = {
      ...(this.session || {}),
      ...details,
      hotelId: details.hotelId || 'tenant-1',
      roomNumber: details.roomNumber,
      guestName: details.guestName,
      checkInDate: details.checkInDate,
      checkOutDate: details.checkOutDate,
      wifiPassword: details.wifiPassword,
      status: 'ACTIVE',
      totalFolioAmount: details.totalFolioAmount || 0,
      activeOrdersCount: details.activeOrdersCount || 0,
    } as any;
    this.notify();
  }

  public getSession(): GuestSessionModel | null {
    return this.session ? { ...this.session } : null;
  }

  public setSession(session: GuestSessionModel | null): void {
    this.session = session ? { ...session } : null;
    this.notify();
  }

  public getLiveOrders(): LiveRoomOrder[] {
    return [...this.liveOrders];
  }

  public setLiveOrders(orders: LiveRoomOrder[]): void {
    this.liveOrders = [...orders];
    this.notify();
  }

  public addLiveOrder(order: any): void {
    this.liveOrders.unshift(order);
    this.notify();
  }

  public getActiveOrdersCount(): number {
    return this.liveOrders.filter((o) => o.orderStatus !== 'SERVED' && o.orderStatus !== 'CANCELLED').length;
  }

  public getRecentRequests(): any[] {
    return [...this.recentRequests];
  }

  public setRecentRequests(requests: any[]): void {
    this.recentRequests = [...requests];
    this.notify();
  }

  public addConciergeRequest(req: any): void {
    this.recentRequests.unshift(req);
    this.notify();
  }

  public getFolioSummary(): FolioSummaryModel | null {
    return this.folioSummary ? { ...this.folioSummary } : null;
  }

  public setFolioSummary(summary: FolioSummaryModel | null): void {
    this.folioSummary = summary ? { ...summary } : null;
    this.notify();
  }

  public getActiveTab(): 'HOME' | 'DINING' | 'ORDERS' | 'FOLIO' {
    return this.activeTab;
  }

  public setActiveTab(tab: 'HOME' | 'DINING' | 'ORDERS' | 'FOLIO'): void {
    this.activeTab = tab;
    this.notify();
  }

  public getSelectedLiveOrder(): LiveRoomOrder | null {
    return this.selectedLiveOrder;
  }

  public openOrderTracker(order: LiveRoomOrder): void {
    this.selectedLiveOrder = { ...order };
    this.notify();
  }

  public closeOrderTracker(): void {
    this.selectedLiveOrder = null;
    this.notify();
  }

  public setIsLoading(loading: boolean): void {
    this.isLoading = loading;
    this.notify();
  }

  public getIsLoading(): boolean {
    return this.isLoading;
  }

  /**
   * Handle real-time Socket event 'order:status_updated'
   */
  public handleOrderStatusUpdated(payload: {
    orderId: string;
    orderStatus: 'PLACED' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';
    readyAt?: string;
  }): void {
    const order = this.liveOrders.find((o) => o.id === payload.orderId);
    if (order) {
      order.orderStatus = payload.orderStatus;
      if (payload.readyAt) order.readyAt = payload.readyAt;

      if (this.selectedLiveOrder && this.selectedLiveOrder.id === payload.orderId) {
        this.selectedLiveOrder.orderStatus = payload.orderStatus;
        if (payload.readyAt) this.selectedLiveOrder.readyAt = payload.readyAt;
      }

      this.notify();
    }
  }

  /**
   * Handle real-time Socket event 'request:status_updated'
   */
  public handleRequestStatusUpdated(payload: { requestId: string; status: string }): void {
    const req = this.recentRequests.find((r) => r.id === payload.requestId);
    if (req) {
      req.status = payload.status;
      this.notify();
    }
  }

  public subscribe(listener: GuestPortalStoreListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
