import express, { Application, Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { Server as SocketIOServer } from 'socket.io';
import { connectDB } from './config/database';
import authRoutes from './routes/authRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import posRoutes from './routes/posRoutes';
import requestRoutes from './routes/requestRoutes';
import billingRoutes from './routes/billingRoutes';
import pmsRoutes from './routes/pmsRoutes';
import roomServiceRoutes from './routes/roomServiceRoutes';
import housekeepingRoutes from './routes/housekeepingRoutes';
import maintenanceRoutes from './routes/maintenanceRoutes';
import reservationRoutes from './routes/reservationRoutes';
import groupBookingRoutes from './routes/groupBookingRoutes';
import crmRoutes from './routes/crmRoutes';
import superAdminRoutes from './routes/superAdminRoutes';
import banquetRoutes from './routes/banquetRoutes';
import fastCashierRoutes from './routes/fastCashierRoutes';
import recipeCostingRoutes from './routes/recipeCostingRoutes';
import inventoryPoRoutes from './routes/inventoryPoRoutes';
import storeRequisitionRoutes from './routes/storeRequisitionRoutes';
import inventoryAuditRoutes from './routes/inventoryAuditRoutes';
import menuEngineeringRoutes from './routes/menuEngineeringRoutes';
import staffRosterRoutes from './routes/staffRosterRoutes';
import diningReservationRoutes from './routes/diningReservationRoutes';
import nightAuditRoutes from './routes/nightAuditRoutes';
import revenueManagerRoutes from './routes/revenueManagerRoutes';
import customerPortalRoutes from './routes/customerPortalRoutes';
import coDiningRoutes from './routes/coDiningRoutes';
import seatBillingRoutes from './routes/seatBillingRoutes';
import tableQrLockerRoutes from './routes/tableQrLockerRoutes';
import waiterZoneRoutes from './routes/waiterZoneRoutes';
import floorDutyMatrixRoutes from './routes/floorDutyMatrixRoutes';
import staffLoadBalancerRoutes from './routes/staffLoadBalancerRoutes';
import foodPickupSlaRoutes from './routes/foodPickupSlaRoutes';
import multiTenderRoutes from './routes/multiTenderRoutes';
import dynamicUpiRoutes from './routes/dynamicUpiRoutes';
import waiterCashFloatRoutes from './routes/waiterCashFloatRoutes';
import adminControlRoutes from './routes/adminControlRoutes';
import guestReviewRoutes from './routes/guestReviewRoutes';
import kotLockVoidRoutes from './routes/kotLockVoidRoutes';
import hotelStaffRoutes from './routes/hotelStaffRoutes';
import menuCatalogRoutes from './routes/menuCatalogRoutes';
import tableManagementRoutes from './routes/tableManagementRoutes';
import restaurantOperationsRoutes from './routes/restaurantOperationsRoutes';
import { authenticateJWT, requireTenant } from './middlewares/auth';
import { requirePortal } from './middlewares/portalGate';
import { TenantRequest } from './types';
import { assertProductionSecurityConfig, getJwtSecret, isDevAuthBypassEnabled } from './config/security';

import path from 'path';
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app: Application = express();
const server = http.createServer(app);

// Socket.IO configuration with tenant-scoped room isolation
export const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  },
});

io.on('connection', (socket) => {
  console.log(`[Socket.IO] New connection established: ${socket.id}`);

  // Channel room joiner: Enforces strict tenant isolation and authentication
  const handleJoinTenantRoom = (payload: { hotelId: string; station?: string; token?: string; tableSessionId?: string; userId?: string }) => {
    const { hotelId, station, token, userId } = payload || {};
    if (!hotelId) return;

    // Tenant room isolation is mandatory. An authentication token is required to join any tenant room.
    if (!token && process.env.NODE_ENV !== 'test') {
      console.warn(`[Socket Security] Unauthenticated room join rejected for hotel ${hotelId}`);
      socket.emit('security_error', { message: 'Authentication token required to join tenant room' });
      return;
    }

    // Strict Security Validation: If a token is provided, verify hotelId claims
    if (token) {
      try {
        const secret = getJwtSecret();
        const decoded = jwt.verify(token, secret) as any;
        const tenantRoom = mongoose.Types.ObjectId.isValid(hotelId);
        if (decoded.hotelId && tenantRoom && decoded.hotelId !== hotelId) {
          console.warn(`[Socket Security] Unauthorized room join rejected: token hotelId ${decoded.hotelId} mismatch with requested ${hotelId}`);
          socket.emit('security_error', { message: 'Unauthorized: Hotel ID mismatch' });
          return;
        }

        const isGuestStation = Boolean(station && station.startsWith('guest_room_'));
        if (decoded.purpose === 'GUEST_SESSION' || decoded.role === 'GUEST') {
          if (!isGuestStation) {
            socket.emit('security_error', { message: 'Guest sessions may only join their own room channel' });
            return;
          }
          const stationRoom = String(station).replace('guest_room_', '');
          if (decoded.roomNumber && String(decoded.roomNumber) !== stationRoom) {
            socket.emit('security_error', { message: 'Guest session room mismatch' });
            return;
          }
        }
      } catch (err) {
        console.warn(`[Socket Security] Invalid JWT token supplied on join_tenant_room:`, err);
        socket.emit('security_error', { message: 'Invalid token' });
        return;
      }
    }

    let roomName = `${hotelId}_global`;
    if (station) {
      roomName = `${hotelId}_${station}`;
      if (!station.startsWith('guest_room_')) {
        socket.join(`${hotelId}_global`); // Join global as well for broadcast events
      }
      if (station === 'waiter' || station === 'waiters') {
        socket.join(`${hotelId}_waiters`);
        socket.join(`${hotelId}_waiter`);
      }
      if (station === 'kds' || station === 'kitchen') {
        socket.join(`${hotelId}_kds`);
        socket.join(`${hotelId}_kitchen`);
      }
      if (station === 'cashier' || station === 'pos') {
        socket.join(`${hotelId}_cashier`);
        socket.join(`${hotelId}_pos`);
      }
      if (station === 'pms' || station === 'frontdesk') {
        socket.join(`${hotelId}_pms`);
        socket.join(`${hotelId}_frontdesk`);
        socket.join(`${hotelId}_admin`);
      }
      if (station.startsWith('guest_room_')) {
        socket.join(`${hotelId}_${station}`);
        socket.join(station);
      }
    } else if (
      hotelId.startsWith('waiter_') ||
      hotelId.startsWith('attendant_') ||
      hotelId.startsWith('technician_') ||
      hotelId.startsWith('user_')
    ) {
      roomName = hotelId; // direct private channel
    }

    if (userId) {
      socket.join(`waiter_${userId}`);
      socket.join(`${hotelId}_waiter_${userId}`);
    }

    socket.join(roomName);
    console.log(`[Socket.IO] Socket ${socket.id} joined room: ${roomName}`);
  };

  socket.on('join_tenant_room', handleJoinTenantRoom);
  socket.on('join:room', handleJoinTenantRoom);

  // Real-time Service Request broadcast from customer / staff
  socket.on('service:request', (data: any) => {
    console.log('🛎️ [Socket.IO] Relay service:request:', data);
    const hotelId = data.hotelId || '6ac0b4e71840625417d4c7a1';
    const payload = {
      id: data.id || `req-${Date.now()}`,
      requestId: data.requestId || data.id || `req-${Date.now()}`,
      table: data.table || data.tableNumber || 'Table 4',
      tableNumber: data.table || data.tableNumber || 'Table 4',
      type: data.type || data.requestType || 'CALL_WAITER',
      requestType: data.type || data.requestType || 'CALL_WAITER',
      priority: data.priority || 'HIGH',
      status: 'ASSIGNED',
      createdAt: new Date().toISOString(),
      slaMinutes: 1,
    };
    io.to(`${hotelId}_waiters`).to(`${hotelId}_global`).emit('service:request', payload);
    io.to(`${hotelId}_waiters`).to(`${hotelId}_global`).emit('request:new', payload);
  });

  // Real-time Order Placed broadcast to KDS & Waiters
  socket.on('order:placed', (data: any) => {
    console.log('🍽️ [Socket.IO] Relay order:placed to KDS:', data);
    const hotelId = data.hotelId || '6ac0b4e71840625417d4c7a1';
    const payload = {
      id: data.id || data.orderId || `ord-${Date.now()}`,
      orderId: data.id || data.orderId || `ord-${Date.now()}`,
      orderNumber: data.orderNumber || `KOT #${Date.now().toString().slice(-4)}`,
      orderType: data.orderType || (data.roomNumber ? 'ROOM_SERVICE' : 'DINE_IN'),
      tableNumber: data.table || data.tableNumber || (data.roomNumber ? `Room ${data.roomNumber}` : 'Table 4'),
      table: data.table || data.tableNumber || (data.roomNumber ? `Room ${data.roomNumber}` : 'Table 4'),
      roomNumber: data.roomNumber,
      orderStatus: 'PLACED',
      placedAt: new Date().toISOString(),
      elapsedMinutes: 0,
      urgencyLevel: 'NORMAL',
      items: data.items || [],
      cookingInstructions: data.instructions || data.cookingInstructions || '',
      grandTotal: data.grandTotal || data.totalAmount || 0,
    };
    io.to(`${hotelId}_kds`).emit('order:created', payload);
    io.to(`${hotelId}_kds`).emit('new_order', payload);
    io.to(`${hotelId}_waiters`).to(`${hotelId}_global`).emit('order:created', payload);
    if (data.roomNumber) {
      io.to(`${hotelId}_guest_room_${data.roomNumber}`).emit('order:status_updated', payload);
      io.to(`${hotelId}_pms`).emit('pms:inroom_order_created', payload);
    }
  });

  // Real-time KDS Cooking and Ready status updates
  socket.on('kds:order_preparing', (data: any) => {
    console.log('🍳 [Socket.IO] Relay kds:order_preparing:', data);
    const hotelId = data.hotelId || '6ac0b4e71840625417d4c7a1';
    const payload = {
      orderId: data.orderId,
      orderStatus: 'PREPARING',
      roomNumber: data.roomNumber,
      tableNumber: data.tableNumber,
    };
    io.to(`${hotelId}_kds`).emit('order:status_updated', payload);
    io.to(`${hotelId}_waiters`).to(`${hotelId}_global`).emit('order:status_updated', payload);
    if (data.roomNumber) {
      io.to(`${hotelId}_guest_room_${data.roomNumber}`).emit('order:status_updated', payload);
    }
  });

  socket.on('kds:order_ready', (data: any) => {
    console.log('🔔 [Socket.IO] Relay kds:order_ready:', data);
    const hotelId = data.hotelId || '6ac0b4e71840625417d4c7a1';
    const targetTable = data.tableNumber || (data.roomNumber ? `Room ${data.roomNumber}` : '');
    const statusPayload = {
      orderId: data.orderId,
      orderNumber: data.orderNumber,
      orderStatus: 'READY',
      readyAt: new Date().toISOString(),
      roomNumber: data.roomNumber,
      tableNumber: targetTable,
    };
    io.to(`${hotelId}_kds`).emit('order:status_updated', statusPayload);
    io.to(`${hotelId}_waiters`).to(`${hotelId}_global`).emit('order:ready', {
      orderId: data.orderId,
      orderNumber: data.orderNumber || (data.orderId ? `#${String(data.orderId).slice(-4)}` : '#D1026'),
      tableNumber: targetTable,
      roomNumber: data.roomNumber,
      items: data.items,
      itemsSummary: Array.isArray(data.items)
        ? data.items.map((i: any) => `${i.qty || i.quantity || 1}x ${i.name}`).join(', ')
        : undefined,
      readyAt: new Date().toISOString(),
    });
    if (data.roomNumber) {
      io.to(`${hotelId}_guest_room_${data.roomNumber}`).emit('order:status_updated', statusPayload);
    }
  });

  // Food Served Relay
  socket.on('order:served', (data: any) => {
    console.log('🍽️ [Socket.IO] Relay order:served:', data);
    const hotelId = data.hotelId || '6ac0b4e71840625417d4c7a1';
    const payload = {
      orderId: data.orderId,
      orderNumber: data.orderNumber || (data.orderId ? `#${String(data.orderId).slice(-4)}` : '#D1026'),
      orderStatus: 'SERVED',
      servedAt: new Date().toISOString(),
      tableNumber: data.tableNumber,
      roomNumber: data.roomNumber,
    };
    io.to(`${hotelId}_kds`).emit('order:status_updated', payload);
    io.to(`${hotelId}_kds`).emit('order:served', payload);
    io.to(`${hotelId}_waiters`).to(`${hotelId}_global`).emit('order:status_updated', payload);
    io.to(`${hotelId}_waiters`).to(`${hotelId}_global`).emit('order:served', payload);
    if (data.roomNumber) {
      io.to(`${hotelId}_guest_room_${data.roomNumber}`).emit('order:status_updated', payload);
    }
  });

  // Table Status Changed Relay
  socket.on('table:status_changed', (data: any) => {
    console.log('🪑 [Socket.IO] Relay table:status_changed:', data);
    const hotelId = data.hotelId || '6ac0b4e71840625417d4c7a1';
    io.to(`${hotelId}_waiters`).to(`${hotelId}_cashier`).to(`${hotelId}_global`).emit('table:status_changed', data);
  });

  // Table Served Relay (all dishes served to guest)
  socket.on('table:served', (data: any) => {
    console.log('🍽️ [Socket.IO] Relay table:served:', data);
    const hotelId = data.hotelId || '6ac0b4e71840625417d4c7a1';
    io.to(`${hotelId}_waiters`).to(`${hotelId}_kds`).to(`${hotelId}_cashier`).to(`${hotelId}_global`).emit('table:served', data);
  });

  // Waiter Shift Status Changed Relay (On Duty, Tea Break, Busy, Offline)
  socket.on('waiter:shift_changed', (data: any) => {
    console.log('☕ [Socket.IO] Relay waiter:shift_changed:', data);
    const hotelId = data.hotelId || '6ac0b4e71840625417d4c7a1';
    io.to(`${hotelId}_waiters`).to(`${hotelId}_kds`).to(`${hotelId}_cashier`).to(`${hotelId}_global`).emit('waiter:shift_changed', data);
  });

  // Waiter Shift Ended & Handover Relay
  socket.on('waiter:shift_ended', (data: any) => {
    console.log('🏁 [Socket.IO] Relay waiter:shift_ended:', data);
    const hotelId = data.hotelId || '6ac0b4e71840625417d4c7a1';
    io.to(`${hotelId}_waiters`).to(`${hotelId}_cashier`).to(`${hotelId}_global`).emit('waiter:shift_ended', data);
  });

  // Customer Claimed Guests (Pax) via Mobile QR Relay
  socket.on('customer:update_pax', (data: any) => {
    console.log('👥 [Socket.IO] Relay customer:update_pax:', data);
    const hotelId = data.hotelId || '6ac0b4e71840625417d4c7a1';
    io.to(`${hotelId}_waiters`).to(`${hotelId}_cashier`).to(`${hotelId}_global`).emit('customer:update_pax', data);
  });

  // Waiter Verified Table Pax Relay
  socket.on('table:pax_updated', (data: any) => {
    console.log('✅ [Socket.IO] Relay table:pax_updated:', data);
    const hotelId = data.hotelId || '6ac0b4e71840625417d4c7a1';
    io.to(`${hotelId}_waiters`).to(`${hotelId}_cashier`).to(`${hotelId}_kds`).to(`${hotelId}_global`).emit('table:pax_updated', data);
  });

  // Waiter Task Delegation / Handover Relay (when waiter is busy)
  socket.on('waiter:task_delegated', (data: any) => {
    console.log('🤝 [Socket.IO] Relay waiter:task_delegated:', data);
    const hotelId = data.hotelId || '6ac0b4e71840625417d4c7a1';
    io.to(`${hotelId}_waiters`).to(`${hotelId}_cashier`).to(`${hotelId}_global`).emit('waiter:task_delegated', data);
  });

  // In-Room Concierge Request Relay
  socket.on('pms:concierge_request_created', (data: any) => {
    console.log('🛎️ [Socket.IO] Relay pms:concierge_request_created:', data);
    const hotelId = data.hotelId || '6ac0b4e71840625417d4c7a1';
    io.to(`${hotelId}_pms`).to(`${hotelId}_housekeeping`).to(`${hotelId}_global`).emit('pms:concierge_request_created', data);
    if (data.roomNumber) {
      io.to(`${hotelId}_guest_room_${data.roomNumber}`).emit('pms:concierge_request_created', data);
    }
  });

  // Room Status Changed Relay
  socket.on('room:status_changed', (data: any) => {
    console.log('🏨 [Socket.IO] Relay room:status_changed:', data);
    const hotelId = data.hotelId || '6ac0b4e71840625417d4c7a1';
    io.to(`${hotelId}_pms`).to(`${hotelId}_housekeeping`).to(`${hotelId}_global`).emit('room:status_changed', data);
  });

  // Express Checkout Request Relay
  socket.on('pms:checkout_requested', (data: any) => {
    console.log('🚪 [Socket.IO] Relay pms:checkout_requested:', data);
    const hotelId = data.hotelId || '6ac0b4e71840625417d4c7a1';
    io.to(`${hotelId}_pms`).to(`${hotelId}_waiters`).to(`${hotelId}_global`).emit('pms:checkout_requested', data);
  });

  // Waiter Request Lifecycle events
  socket.on('request:accepted', (data: any) => {
    const hotelId = data.hotelId || '6ac0b4e71840625417d4c7a1';
    io.to(`${hotelId}_global`).emit('request:accepted', data);
  });

  socket.on('request:completed', (data: any) => {
    const hotelId = data.hotelId || '6ac0b4e71840625417d4c7a1';
    io.to(`${hotelId}_global`).emit('request:completed', data);
  });

  // Waiter Punch KOT directly
  socket.on('waiter:kot_fired', (data: any) => {
    console.log('🔥 [Socket.IO] Relay waiter:kot_fired to KDS:', data);
    const hotelId = data.hotelId || '6ac0b4e71840625417d4c7a1';
    const payload = {
      id: `ord-${Date.now()}`,
      orderId: `ord-${Date.now()}`,
      orderNumber: `KOT #${Date.now().toString().slice(-4)}`,
      orderType: 'DINE_IN',
      tableNumber: data.tableNumber || `Table ${data.tableId}`,
      table: data.tableNumber || `Table ${data.tableId}`,
      orderStatus: 'PLACED',
      placedAt: new Date().toISOString(),
      elapsedMinutes: 0,
      urgencyLevel: 'NORMAL',
      items: (data.items || []).map((it: any, idx: number) => ({
        itemId: `item-${Date.now()}-${idx}`,
        menuItemId: it.menuItemId,
        name: it.name || 'Dish',
        quantity: it.quantity,
        unitPrice: it.price || 200,
        subtotal: (it.price || 200) * it.quantity,
        itemStatus: 'PENDING',
        specialInstructions: it.specialInstructions,
      })),
      cookingInstructions: data.instructions,
    };
    io.to(`${hotelId}_kds`).emit('order:created', payload);
    io.to(`${hotelId}_kds`).emit('new_order', payload);
    io.to(`${hotelId}_waiters`).to(`${hotelId}_global`).emit('order:created', payload);
    io.to(`${hotelId}_waiters`).to(`${hotelId}_global`).emit('waiter:new_kot', {
      ...payload,
      firedBy: data.waiterName || 'Floor Waiter',
      isCourtesy: data.isCourtesy || false,
    });
  });

  // Kitchen Intercom & Waiter Call Buzzer
  socket.on('kitchen:buzzer', async (data: any) => {
    console.log('🚨 [Socket.IO] Relay kitchen:buzzer to KDS:', data);
    const hotelId = data.hotelId || '6ac0c0012b6d940a98ae20c6';
    const payload = {
      id: data.id || `buzz-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      hotelId,
      station: data.station || 'Executive Chef Pass',
      table: data.table || data.tableNumber || 'Table 5',
      message: data.message || 'Attention Kitchen Hot Pass!',
      priority: (['NORMAL', 'HIGH', 'URGENT'].includes(data.priority) ? data.priority : 'HIGH') as 'NORMAL' | 'HIGH' | 'URGENT',
      waiterName: data.waiterName || 'Floor Waiter',
      waiterId: data.waiterId || 'W-101',
      status: 'PENDING' as 'PENDING',
      createdAt: data.timestamp || data.createdAt || new Date().toISOString(),
    };

    try {
      const { inMemoryKitchenBuzzers } = await import('./controllers/posController');
      inMemoryKitchenBuzzers.unshift(payload);
      if (inMemoryKitchenBuzzers.length > 50) inMemoryKitchenBuzzers.pop();
    } catch (e) {}

    io.to(`${hotelId}_kds`).to(`${hotelId}_kitchen`).emit('kitchen:buzzer', payload);
    io.to(`${hotelId}_waiters`).to(`${hotelId}_waiter`).to(`${hotelId}_global`).emit('kitchen:buzzer', payload);
  });

  socket.on('kitchen:buzzer_ack', async (data: any) => {
    console.log('✅ [Socket.IO] Relay kitchen:buzzer_ack:', data);
    const hotelId = data.hotelId || '6ac0c0012b6d940a98ae20c6';
    let updatedPayload = data;
    try {
      const { inMemoryKitchenBuzzers } = await import('./controllers/posController');
      const b = inMemoryKitchenBuzzers.find((item) => item.id === data.id);
      if (b) {
        b.status = 'ACKNOWLEDGED';
        b.acknowledgedAt = new Date().toISOString();
        b.acknowledgedBy = data.chefName || 'Executive Chef';
        updatedPayload = b;
      }
    } catch (e) {}

    io.to(`${hotelId}_kds`).to(`${hotelId}_kitchen`).emit('kitchen:buzzer_ack', updatedPayload);
    io.to(`${hotelId}_waiters`).to(`${hotelId}_waiter`).to(`${hotelId}_global`).emit('kitchen:buzzer_ack', updatedPayload);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Disconnected: ${socket.id}`);
  });
});

// Global Middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
    frameguard: false,
  })
);
app.get('/favicon.ico', (_req, res) => res.status(204).end());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow any origin in dev/LAN network, echoing back the requesting origin for credentials: true compatibility
      callback(null, origin || true);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Central API Routes
app.get('/health', (req: Request, res: Response) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  res.status(databaseConnected ? 200 : 503).json({
    status: databaseConnected ? 'HEALTHY' : 'DEGRADED',
    service: 'SpiceHub Central Backend Engine',
    timestamp: new Date().toISOString(),
    database: databaseConnected ? 'CONNECTED' : 'DISCONNECTED',
    multiTenancy: 'ENFORCED',
  });
});

// Versioned APIs
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/pos', posRoutes);
app.use('/api/v1/requests', requestRoutes);
app.use('/api/v1/billing', requirePortal('cashier'), billingRoutes);
app.use('/api/v1/pms', requirePortal('reception'), pmsRoutes);
app.use('/api/v1/guest-portal', requirePortal('guest'), roomServiceRoutes);
app.use('/api/v1/housekeeping', housekeepingRoutes);
app.use('/api/v1/maintenance', maintenanceRoutes);
app.use('/api/v1/reservations', requirePortal('reception'), reservationRoutes);
app.use('/api/v1/group-bookings', requirePortal('reception'), groupBookingRoutes);
app.use('/api/v1/banquets', banquetRoutes);
app.use('/api/v1/fast-cashier', requirePortal('cashier'), fastCashierRoutes);
app.use('/api/v1/recipe-costing', recipeCostingRoutes);
app.use('/api/v1/inventory-po', inventoryPoRoutes);
app.use('/api/v1/store-requisitions', storeRequisitionRoutes);
app.use('/api/v1/inventory-audits', inventoryAuditRoutes);
app.use('/api/v1/menu-engineering', menuEngineeringRoutes);
app.use('/api/v1/staff-roster', staffRosterRoutes);
app.use('/api/v1/dining-reservations', diningReservationRoutes);
app.use('/api/v1/night-audit', requirePortal('reception'), nightAuditRoutes);
app.use('/api/v1/revenue-manager', requirePortal('reception'), revenueManagerRoutes);
app.use('/api/v1/crm', crmRoutes);
app.use('/api/v1/customer-portal', requirePortal('customer'), customerPortalRoutes);
app.use('/api/v1/co-dining', requirePortal('customer'), coDiningRoutes);
app.use('/api/v1/seat-billing', requirePortal('cashier'), seatBillingRoutes);
app.use('/api/v1/qr-locker', requirePortal('customer'), tableQrLockerRoutes);
app.use('/api/v1/waiter-zones', requirePortal('waiter'), waiterZoneRoutes);
app.use('/api/v1/floor-matrix', floorDutyMatrixRoutes);
app.use('/api/v1/load-balancer', staffLoadBalancerRoutes);
app.use('/api/v1/food-pickup-sla', requirePortal('kds'), foodPickupSlaRoutes);
app.use('/api/v1/multi-tender', requirePortal('cashier'), multiTenderRoutes);
app.use('/api/v1/dynamic-upi', requirePortal('cashier'), dynamicUpiRoutes);
app.use('/api/v1/waiter-cash-float', requirePortal('waiter'), waiterCashFloatRoutes);
app.use('/api/v1/admin-control', adminControlRoutes);
app.use('/api/v1/guest-reviews', guestReviewRoutes);
app.use('/api/v1/superadmin', superAdminRoutes);
app.use('/api/v1/kot-void', kotLockVoidRoutes);
app.use('/api/v1/hotel-staff', hotelStaffRoutes);
app.use('/api/v1/menu-catalog', menuCatalogRoutes);
app.use('/api/v1/table-management', tableManagementRoutes);
app.use('/api/v1/restaurant-operations', restaurantOperationsRoutes);

// Tenant-Isolation Verification Endpoint (Used in Gate #1 testing)
app.get('/api/v1/tenant/verify-isolation', authenticateJWT, requireTenant, (req: TenantRequest, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Tenant boundary verified',
    hotelId: req.hotelId,
    userRole: req.user?.role,
    tenantVerified: true,
  });
});

const PORT = process.env.PORT || 5000;

import { connectRedis } from './config/redis';

export const startServer = async () => {
  assertProductionSecurityConfig();
  await connectDB();
  await connectRedis();
  server.listen(PORT, () => {
    console.log(`🚀 [SpiceHub Engine] Server listening on port ${PORT}`);
    console.log(`📡 [Socket.IO] Realtime server active on port ${PORT}`);
  });
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app, server };
