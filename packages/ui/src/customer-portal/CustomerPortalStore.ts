import {
  CustomerServiceMode,
  CustomerSessionDTO,
  PortalCartItem,
  ServiceRequestDTO,
  ServiceRequestType,
  ServiceRequestStatus,
} from './types';
import { CustomerPortalHelper } from './CustomerPortalHelper';

type Listener = () => void;

export class CustomerPortalStore {
  private session: CustomerSessionDTO | null = null;
  private cartItems: PortalCartItem[] = [];
  private serviceRequests: ServiceRequestDTO[] = [];
  private activeOrders: any[] = [];
  private isLoading: boolean = false;
  private errorMessage: string | null = null;
  private listeners: Listener[] = [];

  constructor(initialSession?: CustomerSessionDTO) {
    if (initialSession) {
      this.setSession(initialSession);
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  // Getters
  public getSession(): CustomerSessionDTO | null {
    return this.session;
  }

  public getServiceMode(): CustomerServiceMode | undefined {
    return this.session?.serviceMode;
  }

  public getCartItems(): PortalCartItem[] {
    return this.cartItems;
  }

  public getCartTotals() {
    return CustomerPortalHelper.calculateCartTotals(this.cartItems, 5);
  }

  public getServiceRequests(): ServiceRequestDTO[] {
    return this.serviceRequests;
  }

  public getActiveOrders(): any[] {
    return this.activeOrders;
  }

  public getIsLoading(): boolean {
    return this.isLoading;
  }

  public getErrorMessage(): string | null {
    return this.errorMessage;
  }

  // Setters & Actions
  public setLoading(loading: boolean): void {
    this.isLoading = loading;
    this.notify();
  }

  public setError(error: string | null): void {
    this.errorMessage = error;
    this.notify();
  }

  public setSession(session: CustomerSessionDTO): void {
    this.session = session;
    this.cartItems = session.cartItems || [];
    this.serviceRequests = session.serviceRequests || [];
    this.activeOrders = session.activeOrders || [];
    this.errorMessage = null;
    this.notify();
  }

  public setServiceMode(mode: CustomerServiceMode): void {
    if (this.session) {
      this.session.serviceMode = mode;
      this.notify();
    }
  }

  public addToCart(item: Omit<PortalCartItem, 'subtotal'>): void {
    const existing = this.cartItems.find((c) => c.menuItemId === item.menuItemId);
    if (existing) {
      existing.quantity += item.quantity;
      existing.subtotal = existing.quantity * existing.unitPrice;
    } else {
      this.cartItems.push({
        ...item,
        subtotal: item.quantity * item.unitPrice,
      });
    }
    this.notify();
  }

  public updateCartQuantity(menuItemId: string, delta: number): void {
    const itemIndex = this.cartItems.findIndex((c) => c.menuItemId === menuItemId);
    if (itemIndex > -1) {
      const item = this.cartItems[itemIndex];
      item.quantity += delta;
      if (item.quantity <= 0) {
        this.cartItems.splice(itemIndex, 1);
      } else {
        item.subtotal = item.quantity * item.unitPrice;
      }
      this.notify();
    }
  }

  public clearCart(): void {
    this.cartItems = [];
    this.notify();
  }

  public addServiceRequest(request: ServiceRequestDTO): void {
    this.serviceRequests.unshift(request);
    this.notify();
  }

  public updateServiceRequestStatus(requestId: string, status: ServiceRequestStatus): void {
    const srv = this.serviceRequests.find((s) => s.requestId === requestId);
    if (srv) {
      srv.status = status;
      if (status === 'RESOLVED') {
        srv.resolvedAt = new Date().toISOString();
      }
      this.notify();
    }
  }

  public addActiveOrder(order: any): void {
    this.activeOrders.unshift(order);
    this.clearCart();
    if (this.session) {
      this.session.status = 'ORDER_PLACED';
    }
    this.notify();
  }
}
