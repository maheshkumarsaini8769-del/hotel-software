import { CustomerServiceMode, CustomerSessionDTO, PortalCartItem, ServiceRequestDTO, ServiceRequestStatus } from './types';
type Listener = () => void;
export declare class CustomerPortalStore {
    private session;
    private cartItems;
    private serviceRequests;
    private activeOrders;
    private isLoading;
    private errorMessage;
    private listeners;
    constructor(initialSession?: CustomerSessionDTO);
    subscribe(listener: Listener): () => void;
    private notify;
    getSession(): CustomerSessionDTO | null;
    getServiceMode(): CustomerServiceMode | undefined;
    getCartItems(): PortalCartItem[];
    getCartTotals(): {
        subTotal: number;
        taxAmount: number;
        grandTotal: number;
        totalItemCount: number;
    };
    getServiceRequests(): ServiceRequestDTO[];
    getActiveOrders(): any[];
    getIsLoading(): boolean;
    getErrorMessage(): string | null;
    setLoading(loading: boolean): void;
    setError(error: string | null): void;
    setSession(session: CustomerSessionDTO): void;
    setServiceMode(mode: CustomerServiceMode): void;
    addToCart(item: Omit<PortalCartItem, 'subtotal'>): void;
    updateCartQuantity(menuItemId: string, delta: number): void;
    clearCart(): void;
    addServiceRequest(request: ServiceRequestDTO): void;
    updateServiceRequestStatus(requestId: string, status: ServiceRequestStatus): void;
    addActiveOrder(order: any): void;
}
export {};
