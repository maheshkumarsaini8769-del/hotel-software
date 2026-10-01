import { ShiftStatus, RequestType } from '@spicehub/shared-types';
import {
  WaiterServiceRequestModel,
  WaiterRequestLifecycle,
  DraftKot,
  DraftOrderItem,
  WaiterProfileState,
} from './types';
import { WaiterAlertChimePattern, ToneConfig } from '../index';

export type WaiterStoreListener = () => void;
export type AudioChimeTrigger = (tones: ToneConfig[]) => void;

export class WaiterStore {
  private static instance: WaiterStore | null = null;

  public static getInstance(
    profile?: Partial<WaiterProfileState>,
    initialRequests: WaiterServiceRequestModel[] = []
  ): WaiterStore {
    if (!WaiterStore.instance) {
      const defaultProfile: WaiterProfileState = {
        userId: 'waiter-default',
        name: 'Waiter',
        hotelId: 'tenant-default',
        shiftStatus: ShiftStatus.ON_DUTY,
        activeRequestsCount: 0,
        ...profile,
      };
      WaiterStore.instance = new WaiterStore(defaultProfile, initialRequests);
    } else if (profile) {
      WaiterStore.instance.setProfile(profile);
    }
    return WaiterStore.instance;
  }

  private requests: Map<string, WaiterServiceRequestModel> = new Map();
  private profile: WaiterProfileState;
  private draftKot: DraftKot | null = null;
  private listeners: Set<WaiterStoreListener> = new Set();
  private chimeCallback?: AudioChimeTrigger;

  constructor(profile: WaiterProfileState, initialRequests: WaiterServiceRequestModel[] = []) {
    this.profile = { ...profile };
    for (const r of initialRequests) {
      this.requests.set(r.id, { ...r });
    }
    this.profile.activeRequestsCount = this.getActiveRequests().length;
  }

  public registerChimeHandler(handler: AudioChimeTrigger): void {
    this.chimeCallback = handler;
  }

  public getProfile(): WaiterProfileState {
    return { ...this.profile };
  }

  public setProfile(profileUpdate: Partial<WaiterProfileState>): void {
    this.profile = { ...this.profile, ...profileUpdate };
    this.notify();
  }

  public setRequests(reqs: any[]): void {
    this.requests.clear();
    for (const r of reqs) {
      this.requests.set(r.id, { ...r });
    }
    this.profile.activeRequestsCount = this.getActiveRequests().length;
    this.notify();
  }

  public addRequest(req: any): void {
    this.handleNewRequest(req);
  }

  public setShiftStatus(status: ShiftStatus): void {
    this.profile.shiftStatus = status;
    this.notify();
  }

  public getRequests(): WaiterServiceRequestModel[] {
    return Array.from(this.requests.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getActiveRequests(): WaiterServiceRequestModel[] {
    return this.getRequests().filter(
      (r) =>
        r.status !== WaiterRequestLifecycle.COMPLETED &&
        r.status !== WaiterRequestLifecycle.CANCELLED
    );
  }

  public getPendingRequests(): WaiterServiceRequestModel[] {
    return this.getRequests().filter(
      (r) =>
        r.status === WaiterRequestLifecycle.PENDING ||
        r.status === WaiterRequestLifecycle.ASSIGNED
    );
  }

  /**
   * Handle incoming Socket.IO event 'request:new'
   */
  public handleNewRequest(payload: WaiterServiceRequestModel): void {
    this.requests.set(payload.id, { ...payload });
    this.profile.activeRequestsCount = this.getActiveRequests().length;

    // Trigger audio chime cue if waiter is ON_DUTY
    if (this.profile.shiftStatus === ShiftStatus.ON_DUTY && this.chimeCallback) {
      this.chimeCallback(WaiterAlertChimePattern);
    }

    this.notify();
  }

  /**
   * Handle incoming Socket.IO event 'request:status_updated'
   */
  public handleStatusUpdated(payload: { requestId: string; status: string; assignedUserId?: string }): void {
    const existing = this.requests.get(payload.requestId);
    if (!existing) return;

    existing.status = payload.status;
    if (payload.assignedUserId) {
      existing.assignedUserId = payload.assignedUserId;
    }

    this.profile.activeRequestsCount = this.getActiveRequests().length;
    this.notify();
  }

  /**
   * 1-Tap Acknowledge Action (Local State Prediction)
   */
  public markAccepted(requestId: string): void {
    const req = this.requests.get(requestId);
    if (req) {
      req.status = WaiterRequestLifecycle.ACCEPTED;
      req.assignedUserId = this.profile.userId;
      this.profile.activeRequestsCount = this.getActiveRequests().length;
      this.notify();
    }
  }

  /**
   * 1-Tap Fulfill Action (Local State Prediction)
   */
  public markCompleted(requestId: string): void {
    const req = this.requests.get(requestId);
    if (req) {
      req.status = WaiterRequestLifecycle.COMPLETED;
      this.profile.activeRequestsCount = this.getActiveRequests().length;
      this.notify();
    }
  }

  // --- Quick KOT Punching Logic ---

  public initDraftKot(tableId: string, sessionId: string, tableNumber?: string): void {
    this.draftKot = {
      tableId,
      tableNumber,
      sessionId,
      items: [],
    };
    this.notify();
  }

  public getDraftKot(): DraftKot | null {
    return this.draftKot;
  }

  public addItemToKot(item: DraftOrderItem): void {
    if (!this.draftKot) return;
    const existing = this.draftKot.items.find((i) => i.menuItemId === item.menuItemId);
    if (existing) {
      existing.quantity += item.quantity;
      if (item.specialInstructions) {
        existing.specialInstructions = item.specialInstructions;
      }
    } else {
      this.draftKot.items.push({ ...item });
    }
    this.notify();
  }

  public updateKotItemQuantity(menuItemId: string, delta: number): void {
    if (!this.draftKot) return;
    const item = this.draftKot.items.find((i) => i.menuItemId === menuItemId);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
      this.draftKot.items = this.draftKot.items.filter((i) => i.menuItemId !== menuItemId);
    }
    this.notify();
  }

  public clearDraftKot(): void {
    this.draftKot = null;
    this.notify();
  }

  public calculateDraftKotSubtotal(): number {
    if (!this.draftKot) return 0;
    return this.draftKot.items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
  }

  // --- Subscription ---

  public subscribe(listener: WaiterStoreListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
