import { ShiftStatus, TableStatus, OrderStatus, RequestType, MenuItemDTO, RestaurantOrderDTO, ServiceRequestDTO, GuestProfileDTO, KotVoidAuditDTO } from '@spicehub/shared-types';
export declare class ApiClientError extends Error {
    status: number;
    errorCode?: string;
    dueAmount?: number;
    data?: any;
    constructor(message: string, status: number, errorCode?: string, data?: any);
}
export interface ClientConfig {
    baseUrl: string;
    authToken?: string;
    hotelId?: string;
}
export declare class SpiceHubClient {
    private baseUrl;
    private authToken;
    private hotelId;
    constructor(config: ClientConfig);
    setAuthToken(token: string | null): void;
    getAuthToken(): string | null;
    clearAuthToken(): void;
    setHotelId(id: string | null): void;
    getHotelId(): string | null;
    request<T = any>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, data?: any, query?: Record<string, any>, customHeaders?: Record<string, string>): Promise<T>;
    auth: {
        login: (credentials: {
            email?: string;
            phone?: string;
            password?: string;
            pinCode?: string;
            hotelId?: string;
            slug?: string;
        }) => Promise<{
            success: boolean;
            message: string;
            data: {
                token: string;
                user: any;
            };
        }>;
        register: (data: {
            name: string;
            slug: string;
            contactEmail: string;
            contactPhone: string;
            adminName: string;
            adminEmail: string;
            adminPhone: string;
            adminPassword: string;
        }) => Promise<{
            success: boolean;
            tenant: any;
            adminUser: any;
        }>;
        verifyIsolation: () => Promise<{
            success: boolean;
            hotelId: string;
            userRole: string;
            tenantVerified: boolean;
        }>;
    };
    pos: {
        getTableByQr: (hotelId: string, tableId: string) => Promise<{
            success: boolean;
            message: string;
            data: {
                tableNumber: string;
                section: string;
                sessionToken: string;
                sessionId?: string;
                status?: string;
            };
        }>;
        placeOrder: (data: {
            hotelId: string;
            tableId?: string;
            tableSessionId?: string;
            sessionToken?: string;
            items: Array<{
                menuItemId: string;
                quantity: number;
            }>;
            idempotencyKey: string;
        }) => Promise<{
            success: boolean;
            order: RestaurantOrderDTO;
        }>;
        updateKdsStatus: (orderId: string, status: OrderStatus) => Promise<{
            success: boolean;
            orderId: string;
            newStatus: OrderStatus;
        }>;
        getTables: (query?: {
            section?: string;
            status?: string;
        }) => Promise<{
            success: boolean;
            message: string;
            data: any[];
        }>;
        updateTableStatus: (tableId: string, status: TableStatus) => Promise<{
            success: boolean;
            message: string;
            data: {
                tableId: string;
                tableNumber: string;
                status: TableStatus;
            };
        }>;
        seatTable: (tableId: string, guestCount?: number) => Promise<{
            success: boolean;
            message: string;
            data: {
                tableId: string;
                tableNumber: string;
                sessionId: string;
                sessionToken: string;
                status: TableStatus;
            };
        }>;
        mergeTables: (data: {
            primaryTableId: string;
            secondaryTableIds: string[];
            mergedBy?: string;
        }) => Promise<{
            success: boolean;
            message: string;
            data: {
                primaryTable: any;
                secondaryTables: any[];
                session: any;
                combinedCapacity: number;
            };
        }>;
        splitTables: (data: {
            primaryTableId: string;
            unmergeTableIds?: string[];
            splitBy?: string;
        }) => Promise<{
            success: boolean;
            message: string;
            data: {
                primaryTable: any;
                unmergedTables: any[];
                remainingMergedTableIds: string[];
            };
        }>;
        getMenu: (query: {
            hotelId: string;
            categoryId?: string;
            foodType?: string;
            search?: string;
            inStockOnly?: boolean;
        }) => Promise<{
            success: boolean;
            data: MenuItemDTO[];
        }>;
        toggleItem86: (itemId: string, isAvailable?: boolean, reason?: string, chefName?: string) => Promise<{
            success: boolean;
            message: string;
            data: {
                id: string;
                name: string;
                isAvailable: boolean;
                outOfStockReason?: string;
            };
        }>;
        get86Items: (query?: {
            stationId?: string;
            categoryId?: string;
        }) => Promise<{
            success: boolean;
            count: number;
            data: MenuItemDTO[];
        }>;
        batchToggle86: (data: {
            itemIds: string[];
            isAvailable: boolean;
            reason?: string;
            chefName?: string;
        }) => Promise<{
            success: boolean;
            message: string;
            updatedCount: number;
            data: MenuItemDTO[];
        }>;
        getKitchenStations: () => Promise<{
            success: boolean;
            data: any[];
        }>;
        getKdsOrders: (query?: {
            stationId?: string;
            status?: string;
        }) => Promise<{
            success: boolean;
            count: number;
            data: any[];
        }>;
        updateKdsOrderStatus: (orderId: string, status: string, itemId?: string) => Promise<{
            success: boolean;
            message: string;
            data: any;
        }>;
        acknowledgeKdsItemAllergen: (orderId: string, itemIndex: number) => Promise<{
            success: boolean;
            message: string;
            data: any;
        }>;
        acknowledgeAllKdsOrderAllergens: (orderId: string) => Promise<{
            success: boolean;
            message: string;
            data: any;
        }>;
    };
    requests: {
        create: (data: {
            hotelId: string;
            requestType: RequestType;
            tableId?: string;
            tableSessionId?: string;
            roomId?: string;
            sessionToken?: string;
            priority?: string;
            notes?: string;
        }) => Promise<{
            success: boolean;
            message?: string;
            data?: any;
            serviceRequest?: ServiceRequestDTO;
        }>;
        accept: (requestId: string) => Promise<{
            success: boolean;
            message: string;
            data: any;
        }>;
        complete: (requestId: string) => Promise<{
            success: boolean;
            message: string;
            data: any;
        }>;
        getWaiterRequests: (query?: {
            status?: string;
        }) => Promise<{
            success: boolean;
            data: any[];
        }>;
        updateShiftStatus: (shiftStatus: ShiftStatus) => Promise<{
            success: boolean;
            message: string;
            data: {
                userId: string;
                shiftStatus: ShiftStatus;
            };
        }>;
    };
    billing: {
        generateBill: (sessionId: string, discountPercentage?: number) => Promise<{
            success: boolean;
            bill: any;
        }>;
        calculateSplit: (billId: string, splitCount: number) => Promise<{
            success: boolean;
            splitDistribution: any;
        }>;
        payCash: (billId: string, cashTendered: number, idempotencyKey: string) => Promise<{
            success: boolean;
            payment: any;
            changeDue: number;
        }>;
        blindShiftClose: (data: {
            shiftId: string;
            cashierUserId: string;
            countedCashInDrawer: number;
            currencyDenominations: any;
        }) => Promise<{
            success: boolean;
            reconciliation: any;
        }>;
    };
    pms: {
        searchRooms: (hotelId: string, checkInDate: string, checkOutDate: string, adults?: number) => Promise<{
            success: boolean;
            results: any[];
        }>;
        createBooking: (bookingData: any) => Promise<{
            success: boolean;
            booking: any;
        }>;
        checkIn: (data: {
            bookingId: string;
            roomId?: string;
            physicalRoomId?: string;
            keyCardNumber?: string;
        }) => Promise<{
            success: boolean;
            stay: any;
            folio: any;
            roomNumber: string;
        }>;
        getCalendarMatrix: (query?: {
            startDate?: string;
            days?: number;
            roomTypeId?: string;
        }) => Promise<{
            success: boolean;
            data: any;
        }>;
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
        }) => Promise<{
            success: boolean;
            message: string;
            data: any;
        }>;
        assignRoom: (bookingId: string, roomId?: string) => Promise<{
            success: boolean;
            message: string;
            data: any;
        }>;
        updateBookingStatus: (bookingId: string, status: string) => Promise<{
            success: boolean;
            message: string;
            data: any;
        }>;
        getArrivalsBoard: (query?: {
            date?: string;
            filter?: string;
        }) => Promise<{
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
        }>;
    };
    guestPortal: {
        resolveQr: (hotelId: string, roomId: string) => Promise<{
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
        }>;
        restoreSession: (sessionToken: string) => Promise<{
            success: boolean;
            session: any;
        }>;
        placeRoomServiceOrder: (data: {
            hotelId: string;
            stayId: string;
            roomId: string;
            items: any[];
            idempotencyKey: string;
            chargeToRoom?: boolean;
            cookingInstructions?: string;
        }) => Promise<{
            success: boolean;
            message: string;
            data: any;
        }>;
        getLiveOrders: (token: string) => Promise<{
            success: boolean;
            count: number;
            data: any[];
        }>;
        createConciergeRequest: (token: string, data: {
            requestType: string;
            notes?: string;
            priority?: string;
        }) => Promise<{
            success: boolean;
            message: string;
            data: any;
        }>;
        getFolioSummary: (token: string) => Promise<{
            success: boolean;
            data: any;
        }>;
        requestExpressCheckout: (token: string, notes?: string) => Promise<{
            success: boolean;
            message: string;
            data?: any;
            dueAmount?: number;
        }>;
    };
    housekeeping: {
        createTask: (data: {
            roomId: string;
            taskType?: string;
            priority?: string;
            assignedAttendantId?: string;
        }) => Promise<{
            success: boolean;
            task: any;
        }>;
        assignTask: (taskId: string, attendantId: string) => Promise<{
            success: boolean;
            task: any;
        }>;
        startCleaning: (taskId: string) => Promise<{
            success: boolean;
            task: any;
            roomStatus: string;
        }>;
        completeCleaning: (taskId: string, data?: {
            completedChecklist?: any[];
            minibarItems?: Array<{
                name: string;
                quantity: number;
                rate: number;
            }>;
            linenAction?: "FULL_WASH" | "TUCK_IN";
            notes?: string;
        }) => Promise<{
            success: boolean;
            task: any;
            roomStatus: string;
            minibarSummary?: {
                totalCharged: number;
                itemsCount: number;
            };
            linenAction?: string;
        }>;
        escalateMaintenance: (taskId: string, data: {
            category: string;
            title: string;
            description: string;
            priority?: string;
            blocksRoom?: boolean;
        }) => Promise<{
            success: boolean;
            message: string;
            maintenanceTicket: any;
            roomStatus: string;
            taskStatus: string;
        }>;
        inspectTask: (taskId: string, isApproved: boolean, notes?: string) => Promise<{
            success: boolean;
            taskStatus: string;
            roomStatus: string;
            inspectionNotes?: string;
        }>;
        getBoard: (query?: {
            floor?: number;
        }) => Promise<{
            success: boolean;
            count: number;
            board: any[];
            summary: any;
        }>;
    };
    reservations: {
        create: (data: any) => Promise<{
            success: boolean;
            reservation: any;
        }>;
        seat: (reservationId: string) => Promise<{
            success: boolean;
            reservation: any;
        }>;
        cancel: (reservationId: string, isNoShow?: boolean, reason?: string) => Promise<{
            success: boolean;
            reservation: any;
        }>;
        list: (params?: {
            date?: string;
            status?: string;
        }) => Promise<{
            success: boolean;
            count: number;
            summary?: any;
            reservations: any[];
        }>;
    };
    groupBookings: {
        create: (data: any) => Promise<{
            success: boolean;
            groupBooking: any;
            masterFolio: any;
        }>;
        bulkCheckIn: (groupBookingId: string, allocations: any[]) => Promise<{
            success: boolean;
            groupStatus: string;
            checkedInRoomsCount: number;
            checkInResults: any[];
        }>;
        postIncidental: (groupBookingId: string, data: any) => Promise<{
            success: boolean;
            chargedTo: string;
            targetFolioId: string;
            lineItem: any;
        }>;
        getInvoices: (groupBookingId: string) => Promise<{
            success: boolean;
            corporateInvoice: any;
            individualInvoices: any[];
        }>;
    };
    crm: {
        saveProfile: (profileData: any) => Promise<{
            success: boolean;
            profile: GuestProfileDTO;
        }>;
        getProfile360: (guestId: string) => Promise<{
            success: boolean;
            profile: GuestProfileDTO;
            loyaltyLedger: any[];
            recentStays: any[];
        }>;
        search: (query: {
            query?: string;
            vipTier?: string;
            tag?: string;
        }) => Promise<{
            success: boolean;
            count: number;
            guests: GuestProfileDTO[];
        }>;
        earnPoints: (data: {
            phone: string;
            amountSpent: number;
            referenceType?: string;
            notes?: string;
        }) => Promise<{
            success: boolean;
            pointsEarned: number;
            newBalance: number;
            vipTier: string;
        }>;
        redeemPoints: (data: {
            phone: string;
            pointsToRedeem: number;
            referenceType?: string;
            notes?: string;
        }) => Promise<{
            success: boolean;
            pointsRedeemed: number;
            discountAmount: number;
            remainingBalance: number;
        }>;
    };
    superadmin: {
        listTenants: () => Promise<{
            success: boolean;
            count: number;
            tenants: any[];
        }>;
        toggleTenantStatus: (tenantId: string, status: "ACTIVE" | "SUSPENDED" | "TRIAL", reason?: string) => Promise<{
            success: boolean;
            message: string;
            tenantId: string;
            status: string;
        }>;
        updateFeatureFlags: (tenantId: string, featureFlags: any) => Promise<{
            success: boolean;
            tenantId: string;
            featureFlags: any;
        }>;
        getMetrics: () => Promise<{
            success: boolean;
            platformMetrics: any;
        }>;
    };
    kotVoid: {
        voidItem: (data: {
            orderId: string;
            itemId: string;
            managerPin: string;
            managerUserId?: string;
            voidReason: string;
            wasteDisposition: string;
            notes?: string;
        }) => Promise<{
            success: boolean;
            message: string;
            voidAudit: KotVoidAuditDTO;
            order: any;
            bill?: any;
        }>;
        getAuditLogs: (query?: {
            startDate?: string;
            endDate?: string;
            managerUserId?: string;
            voidReason?: string;
            wasteDisposition?: string;
            limit?: number;
            skip?: number;
        }) => Promise<{
            success: boolean;
            totalCount: number;
            logs: KotVoidAuditDTO[];
        }>;
        getDailySummary: (query?: {
            date?: string;
        }) => Promise<{
            success: boolean;
            date: string;
            totalVoidEvents: number;
            totalVoidValue: number;
            totalScrappedWasteCost: number;
            reasonBreakdown: Record<string, number>;
            dispositionBreakdown: Record<string, number>;
            topVoidedItems: any[];
        }>;
    };
}
export * from './SpiceHubSocket';
export { SpiceHubClient as ApiClient };
