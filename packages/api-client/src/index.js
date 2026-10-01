"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiClient = exports.SpiceHubClient = exports.ApiClientError = void 0;
class ApiClientError extends Error {
    status;
    errorCode;
    dueAmount;
    data;
    constructor(message, status, errorCode, data) {
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
exports.ApiClientError = ApiClientError;
class SpiceHubClient {
    baseUrl;
    authToken = null;
    hotelId = null;
    constructor(config) {
        this.baseUrl = config.baseUrl.replace(/\/$/, '');
        if (config.authToken)
            this.authToken = config.authToken;
        if (config.hotelId)
            this.hotelId = config.hotelId;
    }
    setAuthToken(token) {
        this.authToken = token;
    }
    getAuthToken() {
        return this.authToken;
    }
    clearAuthToken() {
        this.authToken = null;
    }
    setHotelId(id) {
        this.hotelId = id;
    }
    getHotelId() {
        return this.hotelId;
    }
    async request(method, path, data, query, customHeaders) {
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
        const headers = {
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
        let json = null;
        try {
            json = await response.json();
        }
        catch {
            // response might be empty or non-JSON
        }
        if (!response.ok) {
            const message = json?.message || `HTTP Request failed with status ${response.status}`;
            const errorCode = json?.errorCode;
            throw new ApiClientError(message, response.status, errorCode, json);
        }
        return json;
    }
    // --- Domain APIs ---
    auth = {
        login: (credentials) => this.request('POST', '/api/v1/auth/login', credentials),
        register: (data) => this.request('POST', '/api/v1/auth/register', data),
        verifyIsolation: () => this.request('GET', '/api/v1/tenant/verify-isolation'),
    };
    pos = {
        getTableByQr: (hotelId, tableId) => this.request('GET', '/api/v1/pos/table/qr-entry', undefined, { hotelId, tableId }),
        placeOrder: (data) => this.request('POST', '/api/v1/pos/orders/place', data),
        updateKdsStatus: (orderId, status) => this.request('PATCH', `/api/v1/pos/kds/order/${orderId}/status`, { status }),
        getTables: (query) => this.request('GET', '/api/v1/pos/tables', undefined, query),
        updateTableStatus: (tableId, status) => this.request('PATCH', `/api/v1/pos/tables/${tableId}/status`, { status }),
        seatTable: (tableId, guestCount = 2) => this.request('POST', `/api/v1/pos/tables/${tableId}/seat`, { guestCount }),
        mergeTables: (data) => this.request('POST', '/api/v1/pos/tables/merge', data),
        splitTables: (data) => this.request('POST', '/api/v1/pos/tables/unmerge', data),
        getMenu: (query) => this.request('GET', '/api/v1/pos/menu', undefined, query),
        toggleItem86: (itemId, isAvailable, reason, chefName) => this.request('PATCH', `/api/v1/pos/menu/${itemId}/toggle-86`, { isAvailable, reason, chefName }),
        get86Items: (query) => this.request('GET', '/api/v1/pos/menu/86-items', undefined, query),
        batchToggle86: (data) => this.request('POST', '/api/v1/pos/menu/batch-86', data),
        getKitchenStations: () => this.request('GET', '/api/v1/pos/kds/stations'),
        getKdsOrders: (query) => this.request('GET', '/api/v1/pos/kds/orders', undefined, query),
        updateKdsOrderStatus: (orderId, status, itemId) => this.request('PATCH', `/api/v1/pos/kds/order/${orderId}/status`, { status, itemId }),
        acknowledgeKdsItemAllergen: (orderId, itemIndex) => this.request('PATCH', `/api/v1/pos/kds/orders/${orderId}/items/${itemIndex}/acknowledge-allergen`),
        acknowledgeAllKdsOrderAllergens: (orderId) => this.request('PATCH', `/api/v1/pos/kds/orders/${orderId}/acknowledge-all-allergens`),
    };
    requests = {
        create: (data) => this.request('POST', '/api/v1/requests/create', data),
        accept: (requestId) => this.request('PATCH', `/api/v1/requests/${requestId}/accept`),
        complete: (requestId) => this.request('PATCH', `/api/v1/requests/${requestId}/complete`),
        getWaiterRequests: (query) => this.request('GET', '/api/v1/requests/waiter/assigned', undefined, query),
        updateShiftStatus: (shiftStatus) => this.request('PATCH', '/api/v1/requests/waiter/shift-status', { shiftStatus }),
    };
    billing = {
        generateBill: (sessionId, discountPercentage = 0) => this.request('POST', '/api/v1/billing/bill/generate', { sessionId, discountPercentage }),
        calculateSplit: (billId, splitCount) => this.request('POST', '/api/v1/billing/bill/split-calc', { billId, splitCount }),
        payCash: (billId, cashTendered, idempotencyKey) => this.request('POST', '/api/v1/billing/payment/process', {
            billId,
            paymentMethod: 'CASH',
            cashTendered,
            amount: cashTendered,
            idempotencyKey,
        }),
        blindShiftClose: (data) => this.request('POST', '/api/v1/billing/shift/blind-close', data),
    };
    pms = {
        searchRooms: (hotelId, checkInDate, checkOutDate, adults = 2) => this.request('GET', '/api/v1/pms/rooms/search', undefined, { hotelId, checkInDate, checkOutDate, adults }),
        createBooking: (bookingData) => this.request('POST', '/api/v1/pms/bookings/create', bookingData),
        checkIn: (data) => this.request('POST', '/api/v1/pms/reception/check-in', {
            ...data,
            physicalRoomId: data.physicalRoomId || data.roomId,
        }),
        getCalendarMatrix: (query) => this.request('GET', '/api/v1/pms/matrix/calendar', undefined, query),
        quickReserve: (data) => this.request('POST', '/api/v1/pms/matrix/quick-reserve', data),
        assignRoom: (bookingId, roomId) => this.request('PATCH', `/api/v1/pms/bookings/${bookingId}/assign-room`, { roomId }),
        updateBookingStatus: (bookingId, status) => this.request('PATCH', `/api/v1/pms/bookings/${bookingId}/status`, { status }),
        getArrivalsBoard: (query) => this.request('GET', '/api/v1/pms/bookings/arrivals-board', undefined, query),
    };
    guestPortal = {
        resolveQr: (hotelId, roomId) => this.request('GET', '/api/v1/guest-portal/qr/resolve', undefined, { hotelId, roomId }),
        restoreSession: (sessionToken) => this.request('POST', '/api/v1/guest-portal/session/restore', { sessionToken }),
        placeRoomServiceOrder: (data) => this.request('POST', '/api/v1/guest-portal/orders/place', data),
        getLiveOrders: (token) => this.request('GET', '/api/v1/guest-portal/orders/live', undefined, { token }),
        createConciergeRequest: (token, data) => this.request('POST', '/api/v1/guest-portal/requests/concierge', { token, ...data }),
        getFolioSummary: (token) => this.request('GET', '/api/v1/guest-portal/folio/summary', undefined, { token }),
        requestExpressCheckout: (token, notes) => this.request('POST', '/api/v1/guest-portal/checkout/express-request', { token, notes }),
    };
    housekeeping = {
        createTask: (data) => this.request('POST', '/api/v1/housekeeping/tasks', data),
        assignTask: (taskId, attendantId) => this.request('PUT', `/api/v1/housekeeping/tasks/${taskId}/assign`, { attendantId }),
        startCleaning: (taskId) => this.request('PUT', `/api/v1/housekeeping/tasks/${taskId}/start`),
        completeCleaning: (taskId, data) => this.request('PUT', `/api/v1/housekeeping/tasks/${taskId}/complete`, data || {}),
        escalateMaintenance: (taskId, data) => this.request('POST', `/api/v1/housekeeping/tasks/${taskId}/escalate-maintenance`, data),
        inspectTask: (taskId, isApproved, notes) => this.request('PUT', `/api/v1/housekeeping/tasks/${taskId}/inspect`, { isApproved, notes }),
        getBoard: (query) => this.request('GET', '/api/v1/housekeeping/board', undefined, query),
    };
    reservations = {
        create: (data) => this.request('POST', '/api/v1/reservations', data),
        seat: (reservationId) => this.request('PUT', `/api/v1/reservations/${reservationId}/seat`),
        cancel: (reservationId, isNoShow = false, reason) => this.request('PUT', `/api/v1/reservations/${reservationId}/cancel`, { isNoShow, reason }),
        list: (params) => this.request('GET', '/api/v1/reservations', undefined, params),
    };
    groupBookings = {
        create: (data) => this.request('POST', '/api/v1/group-bookings', data),
        bulkCheckIn: (groupBookingId, allocations) => this.request('POST', `/api/v1/group-bookings/${groupBookingId}/bulk-check-in`, { allocations }),
        postIncidental: (groupBookingId, data) => this.request('POST', `/api/v1/group-bookings/${groupBookingId}/incidental`, data),
        getInvoices: (groupBookingId) => this.request('GET', `/api/v1/group-bookings/${groupBookingId}/invoices`),
    };
    crm = {
        saveProfile: (profileData) => this.request('POST', '/api/v1/crm/profiles', profileData),
        getProfile360: (guestId) => this.request('GET', `/api/v1/crm/profiles/${guestId}`),
        search: (query) => this.request('GET', '/api/v1/crm/search', undefined, query),
        earnPoints: (data) => this.request('POST', '/api/v1/crm/loyalty/earn', data),
        redeemPoints: (data) => this.request('POST', '/api/v1/crm/loyalty/redeem', data),
    };
    superadmin = {
        listTenants: () => this.request('GET', '/api/v1/superadmin/tenants'),
        toggleTenantStatus: (tenantId, status, reason) => this.request('PUT', `/api/v1/superadmin/tenants/${tenantId}/status`, { status, reason }),
        updateFeatureFlags: (tenantId, featureFlags) => this.request('PUT', `/api/v1/superadmin/tenants/${tenantId}/flags`, { featureFlags }),
        getMetrics: () => this.request('GET', '/api/v1/superadmin/metrics'),
    };
    kotVoid = {
        voidItem: (data) => this.request('POST', '/api/v1/kot-void/item', data),
        getAuditLogs: (query) => this.request('GET', '/api/v1/kot-void/audit-logs', undefined, query),
        getDailySummary: (query) => this.request('GET', '/api/v1/kot-void/daily-summary', undefined, query),
    };
}
exports.SpiceHubClient = SpiceHubClient;
exports.ApiClient = SpiceHubClient;
__exportStar(require("./SpiceHubSocket"), exports);
