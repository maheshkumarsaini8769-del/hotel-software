import {
  UserRole,
  ShiftStatus,
  TableStatus,
  RoomStatus,
  OrderStatus,
  FoodType,
  RequestType,
  RequestStatus,
  DiningTableDTO,
  MenuItemDTO,
  RestaurantOrderDTO,
  RoomDTO,
  ServiceRequestDTO,
  GuestProfileDTO,
  KotVoidAuditDTO,
} from '@spicehub/shared-types';

export class ApiClientError extends Error {
  public status: number;
  public errorCode?: string;
  public dueAmount?: number;
  public data?: any;

  constructor(message: string, status: number, errorCode?: string, data?: any) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.errorCode = errorCode;
    this.data = data;
    if (data?.dueAmount !== undefined) {
      this.dueAmount = data.dueAmount;
    }
  }
}

export interface ClientConfig {
  baseUrl: string;
  authToken?: string;
  hotelId?: string;
}

export class SpiceHubClient {
  private baseUrl: string;
  private authToken: string | null = null;
  private hotelId: string | null = null;

  constructor(config: ClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    if (config.authToken) this.authToken = config.authToken;
    if (config.hotelId) this.hotelId = config.hotelId;
  }

  public setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  public getAuthToken(): string | null {
    return this.authToken;
  }

  public clearAuthToken(): void {
    this.authToken = null;
  }

  public setHotelId(id: string | null): void {
    this.hotelId = id;
  }

  public getHotelId(): string | null {
    return this.hotelId;
  }

  public async request<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    data?: any,
    query?: Record<string, any>,
    customHeaders?: Record<string, string>
  ): Promise<T> {
    let url = `${this.baseUrl}${path.startsWith('/') ? path : '/' + path}`;

    if (query && Object.keys(query).length > 0) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      }
      url += `?${searchParams.toString()}`;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (customHeaders) {
      Object.assign(headers, customHeaders);
    }

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    if (this.hotelId) {
      headers['x-hotel-id'] = this.hotelId;
    }

    if (data && data.idempotencyKey) {
      headers['x-idempotency-key'] = data.idempotencyKey;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    let json: any = null;
    try {
      json = await response.json();
    } catch {
      // response might be empty or non-JSON
    }

    if (!response.ok) {
      const message = json?.message || `HTTP Request failed with status ${response.status}`;
      const errorCode = json?.errorCode;
      throw new ApiClientError(message, response.status, errorCode, json);
    }

    return json as T;
  }

  // --- Domain APIs ---

  public auth = {
    login: (credentials: { email?: string; phone?: string; password?: string; pinCode?: string; hotelId?: string; slug?: string }) =>
      this.request<{ success: boolean; message: string; data: { token: string; user: any } }>('POST', '/api/v1/auth/login', credentials),
    register: (data: { name: string; slug: string; contactEmail: string; contactPhone: string; adminName: string; adminEmail: string; adminPhone: string; adminPassword: string }) =>
      this.request<{ success: boolean; tenant: any; adminUser: any }>('POST', '/api/v1/auth/register', data),
    verifyIsolation: () =>
      this.request<{ success: boolean; hotelId: string; userRole: string; tenantVerified: boolean }>('GET', '/api/v1/tenant/verify-isolation'),
  };

  public pos = {
    getTableByQr: (hotelId: string, tableId: string) =>
      this.request<{ success: boolean; message: string; data: { tableNumber: string; section: string; sessionToken: string; sessionId?: string; status?: string } }>(
        'GET',
        '/api/v1/pos/table/qr-entry',
        undefined,
        { hotelId, tableId }
      ),
    placeOrder: (data: { hotelId: string; tableId?: string; tableSessionId?: string; sessionToken?: string; items: Array<{ menuItemId: string; quantity: number }>; idempotencyKey: string }) =>
      this.request<{ success: boolean; order: RestaurantOrderDTO }>('POST', '/api/v1/pos/orders/place', data),
    updateKdsStatus: (orderId: string, status: OrderStatus) =>
      this.request<{ success: boolean; orderId: string; newStatus: OrderStatus }>('PATCH', `/api/v1/pos/kds/order/${orderId}/status`, { status }),
    getTables: (query?: { section?: string; status?: string }) =>
      this.request<{ success: boolean; message: string; data: any[] }>('GET', '/api/v1/pos/tables', undefined, query),
    updateTableStatus: (tableId: string, status: TableStatus) =>
      this.request<{ success: boolean; message: string; data: { tableId: string; tableNumber: string; status: TableStatus } }>(
        'PATCH',
        `/api/v1/pos/tables/${tableId}/status`,
        { status }
      ),
    seatTable: (tableId: string, guestCount = 2) =>
      this.request<{ success: boolean; message: string; data: { tableId: string; tableNumber: string; sessionId: string; sessionToken: string; status: TableStatus } }>(
        'POST',
        `/api/v1/pos/tables/${tableId}/seat`,
        { guestCount }
      ),
    mergeTables: (data: { primaryTableId: string; secondaryTableIds: string[]; mergedBy?: string }) =>
      this.request<{
        success: boolean;
        message: string;
        data: {
          primaryTable: any;
          secondaryTables: any[];
          session: any;
          combinedCapacity: number;
        };
      }>('POST', '/api/v1/pos/tables/merge', data),
    splitTables: (data: { primaryTableId: string; unmergeTableIds?: string[]; splitBy?: string }) =>
      this.request<{
        success: boolean;
        message: string;
        data: {
          primaryTable: any;
          unmergedTables: any[];
          remainingMergedTableIds: string[];
        };
      }>('POST', '/api/v1/pos/tables/unmerge', data),
    getMenu: (query: { hotelId: string; categoryId?: string; foodType?: string; search?: string; inStockOnly?: boolean }) =>
      this.request<{ success: boolean; data: MenuItemDTO[] }>('GET', '/api/v1/pos/menu', undefined, query),
    toggleItem86: (itemId: string, isAvailable?: boolean, reason?: string, chefName?: string) =>
      this.request<{ success: boolean; message: string; data: { id: string; name: string; isAvailable: boolean; outOfStockReason?: string } }>(
        'PATCH',
        `/api/v1/pos/menu/${itemId}/toggle-86`,
        { isAvailable, reason, chefName }
      ),
    get86Items: (query?: { stationId?: string; categoryId?: string }) =>
      this.request<{ success: boolean; count: number; data: MenuItemDTO[] }>('GET', '/api/v1/pos/menu/86-items', undefined, query),
    batchToggle86: (data: { itemIds: string[]; isAvailable: boolean; reason?: string; chefName?: string }) =>
      this.request<{ success: boolean; message: string; updatedCount: number; data: MenuItemDTO[] }>(
        'POST',
        '/api/v1/pos/menu/batch-86',
        data
      ),
    getKitchenStations: () =>
      this.request<{ success: boolean; data: any[] }>('GET', '/api/v1/pos/kds/stations'),
    getKdsOrders: (query?: { stationId?: string; status?: string }) =>
      this.request<{ success: boolean; count: number; data: any[] }>('GET', '/api/v1/pos/kds/orders', undefined, query),
    updateKdsOrderStatus: (orderId: string, status: string, itemId?: string) =>
      this.request<{ success: boolean; message: string; data: any }>(
        'PATCH',
        `/api/v1/pos/kds/order/${orderId}/status`,
        { status, itemId }
      ),
    acknowledgeKdsItemAllergen: (orderId: string, itemIndex: number) =>
      this.request<{ success: boolean; message: string; data: any }>(
        'PATCH',
        `/api/v1/pos/kds/orders/${orderId}/items/${itemIndex}/acknowledge-allergen`
      ),
    acknowledgeAllKdsOrderAllergens: (orderId: string) =>
      this.request<{ success: boolean; message: string; data: any }>(
        'PATCH',
        `/api/v1/pos/kds/orders/${orderId}/acknowledge-all-allergens`
      ),
  };


  public requests = {
    create: (data: { hotelId: string; requestType: RequestType; tableId?: string; tableSessionId?: string; roomId?: string; sessionToken?: string; priority?: string; notes?: string }) =>
      this.request<{ success: boolean; message?: string; data?: any; serviceRequest?: ServiceRequestDTO }>('POST', '/api/v1/requests/create', data),
    accept: (requestId: string) =>
      this.request<{ success: boolean; message: string; data: any }>('PATCH', `/api/v1/requests/${requestId}/accept`),
    complete: (requestId: string) =>
      this.request<{ success: boolean; message: string; data: any }>('PATCH', `/api/v1/requests/${requestId}/complete`),
    getWaiterRequests: (query?: { status?: string }) =>
      this.request<{ success: boolean; data: any[] }>('GET', '/api/v1/requests/waiter/assigned', undefined, query),
    updateShiftStatus: (shiftStatus: ShiftStatus) =>
      this.request<{ success: boolean; message: string; data: { userId: string; shiftStatus: ShiftStatus } }>(
        'PATCH',
        '/api/v1/requests/waiter/shift-status',
        { shiftStatus }
      ),
  };

  public billing = {
    generateBill: (sessionId: string, discountPercentage = 0) =>
      this.request<{ success: boolean; bill: any }>('POST', '/api/v1/billing/bill/generate', { sessionId, discountPercentage }),
    calculateSplit: (billId: string, splitCount: number) =>
      this.request<{ success: boolean; splitDistribution: any }>('POST', '/api/v1/billing/bill/split-calc', { billId, splitCount }),
    payCash: (billId: string, cashTendered: number, idempotencyKey: string) =>
      this.request<{ success: boolean; payment: any; changeDue: number }>('POST', '/api/v1/billing/payment/process', {
        billId,
        paymentMethod: 'CASH',
        cashTendered,
        amount: cashTendered,
        idempotencyKey,
      }),
    blindShiftClose: (data: { shiftId: string; cashierUserId: string; countedCashInDrawer: number; currencyDenominations: any }) =>
      this.request<{ success: boolean; reconciliation: any }>('POST', '/api/v1/billing/shift/blind-close', data),
  };

  public pms = {
    searchRooms: (hotelId: string, checkInDate: string, checkOutDate: string, adults = 2) =>
      this.request<{ success: boolean; results: any[] }>('GET', '/api/v1/pms/rooms/search', undefined, { hotelId, checkInDate, checkOutDate, adults }),
    createBooking: (bookingData: any) =>
      this.request<{ success: boolean; booking: any }>('POST', '/api/v1/pms/bookings/create', bookingData),
    checkIn: (data: { bookingId: string; roomId?: string; physicalRoomId?: string; keyCardNumber?: string }) =>
      this.request<{ success: boolean; stay: any; folio: any; roomNumber: string }>('POST', '/api/v1/pms/reception/check-in', {
        ...data,
        physicalRoomId: data.physicalRoomId || data.roomId,
      }),
    getCalendarMatrix: (query?: { startDate?: string; days?: number; roomTypeId?: string }) =>
      this.request<{ success: boolean; data: any }>('GET', '/api/v1/pms/matrix/calendar', undefined, query),
    quickReserve: (data: {
      roomTypeId: string;
      roomId?: string;
      checkInDate: string;
      checkOutDate: string;
      guestName: string;
      guestPhone: string;
      guestEmail?: string;
      adults?: number;
      advancePaymentAmount?: number;
      specialRequests?: string;
    }) =>
      this.request<{ success: boolean; message: string; data: any }>('POST', '/api/v1/pms/matrix/quick-reserve', data),
    assignRoom: (bookingId: string, roomId?: string) =>
      this.request<{ success: boolean; message: string; data: any }>('PATCH', `/api/v1/pms/bookings/${bookingId}/assign-room`, { roomId }),
    updateBookingStatus: (bookingId: string, status: string) =>
      this.request<{ success: boolean; message: string; data: any }>('PATCH', `/api/v1/pms/bookings/${bookingId}/status`, { status }),
    getArrivalsBoard: (query?: { date?: string; filter?: string }) =>
      this.request<{
        success: boolean;
        summary: {
          totalArrivals: number;
          pendingArrivals: number;
          totalDepartures: number;
          inHouseCount: number;
          unassignedCount: number;
        };
        bookings: any[];
        availableCleanRooms: any[];
      }>('GET', '/api/v1/pms/bookings/arrivals-board', undefined, query),
    getCheckoutPreview: (stayIdOrQuery: string | { stayId?: string; roomId?: string }) => {
      const stayId = typeof stayIdOrQuery === 'string' ? stayIdOrQuery : stayIdOrQuery.stayId;
      const query = typeof stayIdOrQuery === 'object' ? stayIdOrQuery : undefined;
      const path = stayId ? `/api/v1/pms/reception/checkout-preview/${stayId}` : '/api/v1/pms/reception/checkout-preview';
      return this.request<{ success: boolean; data: any }>('GET', path, undefined, query);
    },
    settleAndCheckOut: (data: {
      stayId?: string;
      roomId?: string;
      payments?: Array<{
        paymentMode: string;
        amount: number;
        transactionRef?: string;
        cashReceived?: number;
        cashChangeReturned?: number;
        notes?: string;
      }>;
      paymentMode?: string;
      amount?: number;
      transactionRef?: string;
      cashReceived?: number;
      cashChangeReturned?: number;
      targetRoomStatus?: string;
      keyCardVoided?: boolean;
      housekeepingPriority?: string;
      notes?: string;
    }) =>
      this.request<{ success: boolean; message: string; data: any }>('POST', '/api/v1/pms/reception/settle-and-checkout', data),
    voidKeycard: (data: {
      roomId?: string;
      roomNumber?: string;
      keyCardNumber?: string;
      voidReason?: string;
      notes?: string;
    }) =>
      this.request<{ success: boolean; message: string; data: any }>('POST', '/api/v1/pms/keycards/void', data),
    getKeycardVoidAudits: (params?: { roomId?: string; limit?: number }) =>
      this.request<{ success: boolean; count: number; data: any[] }>('GET', '/api/v1/pms/keycards/void-audit', undefined, params),
    lockFolio: (data: { stayId?: string; roomId?: string; folioId?: string; reason?: string }) =>
      this.request<{ success: boolean; message: string; data: any }>('POST', '/api/v1/pms/folios/lock', data),
    unlockFolio: (data: { stayId?: string; roomId?: string; folioId?: string; reason?: string }) =>
      this.request<{ success: boolean; message: string; data: any }>('POST', '/api/v1/pms/folios/unlock', data),
    sweepRestaurantCharges: (data: { stayId?: string; roomId?: string; folioId?: string; finalizeCookingOrders?: boolean }) =>
      this.request<{ success: boolean; message: string; data: any }>('POST', '/api/v1/pms/folios/sweep-charges', data),
  };

  public guestPortal = {
    resolveQr: (hotelId: string, roomId: string) =>
      this.request<{
        success: boolean;
        message?: string;
        data: {
          sessionToken: string;
          roomNumber: string;
          guestName: string;
          checkInDate?: string;
          expectedCheckOutDate?: string;
          stayId: string;
          masterFolioId?: string;
          lastKnownRoute?: string;
        };
      }>('GET', '/api/v1/guest-portal/qr/resolve', undefined, { hotelId, roomId }),
    restoreSession: (sessionToken: string) =>
      this.request<{ success: boolean; session: any }>('POST', '/api/v1/guest-portal/session/restore', { sessionToken }),
    placeRoomServiceOrder: (data: { hotelId: string; stayId: string; roomId: string; items: any[]; idempotencyKey: string; chargeToRoom?: boolean; cookingInstructions?: string }) =>
      this.request<{ success: boolean; message: string; data: any }>('POST', '/api/v1/guest-portal/orders/place', data),
    getLiveOrders: (token: string) =>
      this.request<{ success: boolean; count: number; data: any[] }>('GET', '/api/v1/guest-portal/orders/live', undefined, { token }),
    createConciergeRequest: (token: string, data: { requestType: string; notes?: string; priority?: string }) =>
      this.request<{ success: boolean; message: string; data: any }>('POST', '/api/v1/guest-portal/requests/concierge', { token, ...data }),
    getFolioSummary: (token: string) =>
      this.request<{ success: boolean; data: any }>('GET', '/api/v1/guest-portal/folio/summary', undefined, { token }),
    requestExpressCheckout: (token: string, notes?: string) =>
      this.request<{ success: boolean; message: string; data?: any; dueAmount?: number }>('POST', '/api/v1/guest-portal/checkout/express-request', { token, notes }),
  };

  public housekeeping = {
    createTask: (data: { roomId: string; taskType?: string; priority?: string; assignedAttendantId?: string }) =>
      this.request<{ success: boolean; task: any }>('POST', '/api/v1/housekeeping/tasks', data),
    assignTask: (taskId: string, attendantId: string) =>
      this.request<{ success: boolean; task: any }>('PUT', `/api/v1/housekeeping/tasks/${taskId}/assign`, { attendantId }),
    startCleaning: (taskId: string) =>
      this.request<{ success: boolean; task: any; roomStatus: string }>('PUT', `/api/v1/housekeeping/tasks/${taskId}/start`),
    completeCleaning: (
      taskId: string,
      data?: {
        completedChecklist?: any[];
        minibarItems?: Array<{ name: string; quantity: number; rate: number }>;
        linenAction?: 'FULL_WASH' | 'TUCK_IN';
        notes?: string;
      }
    ) =>
      this.request<{
        success: boolean;
        task: any;
        roomStatus: string;
        minibarSummary?: { totalCharged: number; itemsCount: number };
        linenAction?: string;
      }>('PUT', `/api/v1/housekeeping/tasks/${taskId}/complete`, data || {}),
    escalateMaintenance: (
      taskId: string,
      data: { category: string; title: string; description: string; priority?: string; blocksRoom?: boolean }
    ) =>
      this.request<{
        success: boolean;
        message: string;
        maintenanceTicket: any;
        roomStatus: string;
        taskStatus: string;
      }>('POST', `/api/v1/housekeeping/tasks/${taskId}/escalate-maintenance`, data),
    inspectTask: (taskId: string, isApproved: boolean, notes?: string) =>
      this.request<{ success: boolean; taskStatus: string; roomStatus: string; inspectionNotes?: string }>(
        'PUT',
        `/api/v1/housekeeping/tasks/${taskId}/inspect`,
        { isApproved, notes }
      ),
    getBoard: (query?: { floor?: number }) =>
      this.request<{ success: boolean; count: number; board: any[]; summary: any }>(
        'GET',
        '/api/v1/housekeeping/board',
        undefined,
        query
      ),
  };

  public reservations = {
    create: (data: any) =>
      this.request<{ success: boolean; reservation: any }>('POST', '/api/v1/reservations', data),
    seat: (reservationId: string) =>
      this.request<{ success: boolean; reservation: any }>('PUT', `/api/v1/reservations/${reservationId}/seat`),
    cancel: (reservationId: string, isNoShow = false, reason?: string) =>
      this.request<{ success: boolean; reservation: any }>('PUT', `/api/v1/reservations/${reservationId}/cancel`, { isNoShow, reason }),
    list: (params?: { date?: string; status?: string }) =>
      this.request<{ success: boolean; count: number; summary?: any; reservations: any[] }>('GET', '/api/v1/reservations', undefined, params),
  };

  public groupBookings = {
    create: (data: any) =>
      this.request<{ success: boolean; groupBooking: any; masterFolio: any }>('POST', '/api/v1/group-bookings', data),
    bulkCheckIn: (groupBookingId: string, allocations: any[]) =>
      this.request<{ success: boolean; groupStatus: string; checkedInRoomsCount: number; checkInResults: any[] }>('POST', `/api/v1/group-bookings/${groupBookingId}/bulk-check-in`, { allocations }),
    postIncidental: (groupBookingId: string, data: any) =>
      this.request<{ success: boolean; chargedTo: string; targetFolioId: string; lineItem: any }>('POST', `/api/v1/group-bookings/${groupBookingId}/incidental`, data),
    getInvoices: (groupBookingId: string) =>
      this.request<{ success: boolean; corporateInvoice: any; individualInvoices: any[] }>('GET', `/api/v1/group-bookings/${groupBookingId}/invoices`),
  };

  public crm = {
    saveProfile: (profileData: any) =>
      this.request<{ success: boolean; profile: GuestProfileDTO }>('POST', '/api/v1/crm/profiles', profileData),
    getProfile360: (guestId: string) =>
      this.request<{ success: boolean; profile: GuestProfileDTO; loyaltyLedger: any[]; recentStays: any[] }>('GET', `/api/v1/crm/profiles/${guestId}`),
    search: (query: { query?: string; vipTier?: string; tag?: string }) =>
      this.request<{ success: boolean; count: number; guests: GuestProfileDTO[] }>('GET', '/api/v1/crm/search', undefined, query),
    earnPoints: (data: { phone: string; amountSpent: number; referenceType?: string; notes?: string }) =>
      this.request<{ success: boolean; pointsEarned: number; newBalance: number; vipTier: string }>('POST', '/api/v1/crm/loyalty/earn', data),
    redeemPoints: (data: { phone: string; pointsToRedeem: number; referenceType?: string; notes?: string }) =>
      this.request<{ success: boolean; pointsRedeemed: number; discountAmount: number; remainingBalance: number }>('POST', '/api/v1/crm/loyalty/redeem', data),
  };

  public superadmin = {
    listTenants: () =>
      this.request<{ success: boolean; count: number; tenants: any[] }>('GET', '/api/v1/superadmin/tenants'),
    toggleTenantStatus: (tenantId: string, status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL', reason?: string) =>
      this.request<{ success: boolean; message: string; tenantId: string; status: string }>('PUT', `/api/v1/superadmin/tenants/${tenantId}/status`, { status, reason }),
    updateFeatureFlags: (tenantId: string, featureFlags: any) =>
      this.request<{ success: boolean; tenantId: string; featureFlags: any }>('PUT', `/api/v1/superadmin/tenants/${tenantId}/flags`, { featureFlags }),
    getMetrics: () =>
      this.request<{ success: boolean; platformMetrics: any }>('GET', '/api/v1/superadmin/metrics'),
  };

  public kotVoid = {
    voidItem: (data: {
      orderId: string;
      itemId: string;
      managerPin: string;
      managerUserId?: string;
      voidReason: string;
      wasteDisposition: string;
      notes?: string;
    }) =>
      this.request<{
        success: boolean;
        message: string;
        voidAudit: KotVoidAuditDTO;
        order: any;
        bill?: any;
      }>('POST', '/api/v1/kot-void/item', data),

    getAuditLogs: (query?: {
      startDate?: string;
      endDate?: string;
      managerUserId?: string;
      voidReason?: string;
      wasteDisposition?: string;
      limit?: number;
      skip?: number;
    }) =>
      this.request<{ success: boolean; totalCount: number; logs: KotVoidAuditDTO[] }>(
        'GET',
        '/api/v1/kot-void/audit-logs',
        undefined,
        query
      ),

    getDailySummary: (query?: { date?: string }) =>
      this.request<{
        success: boolean;
        date: string;
        totalVoidEvents: number;
        totalVoidValue: number;
        totalScrappedWasteCost: number;
        reasonBreakdown: Record<string, number>;
        dispositionBreakdown: Record<string, number>;
        topVoidedItems: any[];
      }>('GET', '/api/v1/kot-void/daily-summary', undefined, query),
  };
}

export * from './SpiceHubSocket';
export { SpiceHubClient as ApiClient };
