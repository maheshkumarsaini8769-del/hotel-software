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
import cronRoutes from './routes/cronRoutes';
import webhookRoutes from './routes/webhookRoutes';
import guestComplianceRoutes from './routes/guestComplianceRoutes';
import reportRoutes from './routes/reportRoutes';
import { startSocketKeepAliveWorker, pingSocketServer, getKeepAliveStats } from './services/socketKeepAliveService';
import { broadcastToRenderSocket } from './services/socketEmitter';
import { authenticateJWT, requireTenant } from './middlewares/auth';
import { requirePortal, requireAnyPortal } from './middlewares/portalGate';
import { TenantRequest } from './types';
import { assertProductionSecurityConfig, getJwtSecret, isDevAuthBypassEnabled } from './config/security';
import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './docs/swaggerSpec';
import { OtaChannelService } from './services/otaChannelService';
import { calculateDynamicPrice } from './services/dynamicPricingService';
import { LoyaltyCrmService } from './services/loyaltyCrmService';
import { TipPoolService } from './services/tipPoolService';
import { RazorpayService } from './services/razorpayService';
import { AuditService } from './services/auditService';
import { RevParAnalyticsService } from './services/revParAnalyticsService';
import { Tenant } from './models/Tenant';
import { PromoCode } from './models/PromoCode';
import * as Sentry from '@sentry/node';
import { logger, requestLogger } from './utils/logger';

import path from 'path';
import os from 'os';
import fs from 'fs';
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Initialize Sentry Error Tracking & Observability
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'production',
    tracesSampleRate: 1.0,
  });
  logger.info('[Observability] Sentry initialized with configured DSN');
} else {
  // Graceful fallback for local development & air-gapped deployments
  Sentry.init({
    dsn: 'https://00000000000000000000000000000000@o0.ingest.sentry.io/0',
    enabled: false,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 1.0,
  });
  logger.info('[Observability] Sentry initialized in standby mode (no SENTRY_DSN provided)');
}

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

// Security Hardening: Explicitly remove X-Powered-By
app.disable('x-powered-by');

// Global Middlewares & Security Headers via Helmet
app.use(
  helmet({
    hidePoweredBy: true,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://checkout.razorpay.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:', 'http:'],
        connectSrc: ["'self'", 'http:', 'https:', 'ws:', 'wss:'],
        frameSrc: ["'self'", 'https://api.razorpay.com', 'https://checkout.razorpay.com'],
        objectSrc: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
    frameguard: { action: 'sameorigin' },
  })
);

app.get('/favicon.ico', (_req, res) => res.status(204).end());

// Production CORS Domain Whitelisting
const ALLOWED_CORS_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : [
      'https://spicehub.in',
      'https://admin.spicehub.in',
      'https://pos.spicehub.in',
      'https://kds.spicehub.in',
      'https://guest.spicehub.in',
      'https://spicehub-backend.vercel.app',
      'https://spicehub-guest-portal.vercel.app',
      'https://spicehub-customer-table.vercel.app',
      'https://spicehub-socket-server.onrender.com',
    ];

/**
 * Detect primary LAN IP (WiFi / Ethernet) so mobile devices on the same local network
 * can connect to portals and backend APIs without being blocked by CORS.
 */
function getPrimaryLanIp(): string {
  const ifaces = os.networkInterfaces();
  const candidates: { name: string; ip: string; priority: number }[] = [];

  for (const name of Object.keys(ifaces)) {
    const list = ifaces[name];
    if (!list) continue;
    for (const info of list) {
      if (info.family === 'IPv4' && !info.internal) {
        let priority = 1;
        // Prioritize Wi-Fi and Ethernet interfaces
        if (name.startsWith('wl') || name.startsWith('wifi')) priority = 10;
        else if (name.startsWith('eth') || name.startsWith('en')) priority = 8;
        else if (name.startsWith('br-') || name.startsWith('docker') || name.startsWith('veth')) priority = 0;
        candidates.push({ name, ip: info.address, priority });
      }
    }
  }

  candidates.sort((a, b) => b.priority - a.priority);
  return candidates[0]?.ip || '127.0.0.1';
}

function isLanOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    const hostname = url.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
    // RFC 1918 Private IPv4 address spaces
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
    return false;
  } catch {
    return false;
  }
}

// Permissive CORS for Public Cloud & Mobile APK Access (Allow all origins)
const corsMiddleware = cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
});

app.use(corsMiddleware);
app.options('*', corsMiddleware);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}
app.use(requestLogger);

// Serverless DB Auto-Connect Middleware (For Vercel Function executions)
app.use(async (_req, _res, next) => {
  if (process.env.VERCEL || mongoose.connection.readyState === 0) {
    try {
      await connectDB();
    } catch (e) {
      console.error('[DB Middleware] Serverless DB connect error:', e);
    }
  }
  next();
});

// Deep Health Check Handler
const getSystemHealth = () => {
  const isDbConnected = mongoose.connection.readyState === 1;
  const isVercelStandby = Boolean(process.env.VERCEL) && !process.env.MONGO_URI;
  const mem = process.memoryUsage();
  const formatMb = (bytes: number) => `${Math.round(bytes / 1024 / 1024)}MB`;

  return {
    status: (isDbConnected || isVercelStandby) ? 'UP' : 'DOWN',
    uptime: `${Math.floor(process.uptime())}s`,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: {
      status: isDbConnected ? 'CONNECTED' : (isVercelStandby ? 'STANDBY_AWAITING_CLOUD_URI' : 'DISCONNECTED'),
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host || (process.env.VERCEL ? 'cloud-serverless' : 'localhost'),
      name: mongoose.connection.name || 'spicehub_dev',
    },
    memoryUsage: {
      rss: formatMb(mem.rss),
      heapTotal: formatMb(mem.heapTotal),
      heapUsed: formatMb(mem.heapUsed),
      external: formatMb(mem.external),
    },
    environment: process.env.NODE_ENV || 'production',
    service: 'SpiceHub Enterprise Core Engine',
    version: '1.0.0',
  };
};

// Deep Health Endpoints: /health & /api/v1/health
app.get('/health', (_req: Request, res: Response) => {
  const health = getSystemHealth();
  res.status(health.status === 'UP' ? 200 : 503).json(health);
});

app.get('/api/v1/health', (_req: Request, res: Response) => {
  const health = getSystemHealth();
  res.status(health.status === 'UP' ? 200 : 503).json(health);
});

// System Network & Local IP Diagnostic Endpoint (Used by Admin ERP for Real QR Generation & Phone Links)
app.get('/api/v1/system/network-info', (_req: Request, res: Response) => {
  const lanIp = getPrimaryLanIp();
  const ifaces = os.networkInterfaces();
  const allIps: { name: string; ip: string }[] = [];
  for (const name of Object.keys(ifaces)) {
    const list = ifaces[name];
    if (!list) continue;
    for (const info of list) {
      if (info.family === 'IPv4' && !info.internal) {
        allIps.push({ name, ip: info.address });
      }
    }
  }

  const customerApkPath = path.resolve(__dirname, '../public/apks/spicehub-customer.apk');
  const staffApkPath = path.resolve(__dirname, '../public/apks/spicehub-staff.apk');
  const customerApkExists = fs.existsSync(customerApkPath);
  const staffApkExists = fs.existsSync(staffApkPath);

  res.json({
    success: true,
    lanIp,
    allIps,
    ports: {
      customer: 3001,
      waiter: 3002,
      kds: 3003,
      guest: 3004,
      admin: 3005,
      superadmin: 3006,
      cashier: 3007,
      reception: 3008,
      backend: 5000,
    },
    urls: {
      customerPortal: `http://${lanIp}:3001`,
      guestPortal: `http://${lanIp}:3004`,
      customerApkDownload: `http://${lanIp}:5000/download/customer-apk`,
      staffApkDownload: `http://${lanIp}:5000/download/staff-apk`,
    },
    apks: {
      customer: {
        available: customerApkExists,
        filename: 'SpiceHub-Customer.apk',
        sizeBytes: customerApkExists ? fs.statSync(customerApkPath).size : 0,
        sizeMb: customerApkExists ? +(fs.statSync(customerApkPath).size / 1024 / 1024).toFixed(2) : 0,
        downloadUrl: '/download/customer-apk',
      },
      staff: {
        available: staffApkExists,
        filename: 'SpiceHub-Staff.apk',
        sizeBytes: staffApkExists ? fs.statSync(staffApkPath).size : 0,
        sizeMb: staffApkExists ? +(fs.statSync(staffApkPath).size / 1024 / 1024).toFixed(2) : 0,
        downloadUrl: '/download/staff-apk',
      },
    },
  });
});

// Render Socket Server 1-Minute Keepalive Endpoint (Callable via Vercel Cron or External Heartbeat)
app.all('/api/v1/system/socket-keepalive', async (_req: Request, res: Response) => {
  const result = await pingSocketServer('keepalive-api-trigger');
  res.json({
    success: result.success,
    status: result.status,
    latencyMs: result.latencyMs,
    error: result.error,
    stats: getKeepAliveStats(),
    timestamp: new Date().toISOString(),
  });
});

// Direct APK Download Handlers
const handleCustomerApkDownload = (_req: Request, res: Response): void => {
  const candidatePaths = [
    path.resolve(__dirname, '../public/apks/spicehub-customer.apk'),
    path.resolve(__dirname, '../../apps/spicehub-customer-android/android/app/build/outputs/apk/debug/app-debug.apk'),
  ];
  const apkPath = candidatePaths.find((p) => fs.existsSync(p));
  if (!apkPath) {
    res.status(404).json({
      success: false,
      errorCode: 'APK_NOT_FOUND',
      message: 'SpiceHub Customer Android APK not found on server.',
    });
    return;
  }
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.setHeader('Content-Disposition', 'attachment; filename="SpiceHub-Customer.apk"');
  res.sendFile(apkPath);
};

const handleStaffApkDownload = (_req: Request, res: Response): void => {
  const candidatePaths = [
    path.resolve(__dirname, '../public/apks/spicehub-staff.apk'),
    path.resolve(__dirname, '../../apps/spicehub-staff-android/android/app/build/outputs/apk/debug/app-debug.apk'),
  ];
  const apkPath = candidatePaths.find((p) => fs.existsSync(p));
  if (!apkPath) {
    res.status(404).json({
      success: false,
      errorCode: 'APK_NOT_FOUND',
      message: 'SpiceHub Staff Android APK not found on server.',
    });
    return;
  }
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.setHeader('Content-Disposition', 'attachment; filename="SpiceHub-Staff.apk"');
  res.sendFile(apkPath);
};

app.get('/download/customer-apk', handleCustomerApkDownload);
app.get('/api/v1/downloads/customer-apk', handleCustomerApkDownload);
app.get('/api/v1/downloads/customer.apk', handleCustomerApkDownload);

app.get('/download/staff-apk', handleStaffApkDownload);
app.get('/api/v1/downloads/staff-apk', handleStaffApkDownload);
app.get('/api/v1/downloads/staff.apk', handleStaffApkDownload);

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
app.use('/api/v1/night-audit', requireAnyPortal(['reception', 'admin']), nightAuditRoutes);
app.use('/api/v1/revenue-manager', requireAnyPortal(['reception', 'admin']), revenueManagerRoutes);
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
app.use('/api/v1/staff', hotelStaffRoutes);
app.use('/api/v1/menu-catalog', menuCatalogRoutes);
app.use('/api/v1/table-management', tableManagementRoutes);
app.use('/api/v1/restaurant-operations', restaurantOperationsRoutes);
app.use('/api/v1/cron', cronRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/guest', guestComplianceRoutes);
app.use('/api/v1/reports', reportRoutes);

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

// =========================================================================
// ENTERPRISE HARDENING & GOVERNANCE ROUTES
// =========================================================================

// 1. Swagger OpenAPI Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get('/api-docs.json', (_req: Request, res: Response) => {
  res.status(200).json(swaggerDocument);
});

// 2. OTA / Channel Manager Inbound Webhook (MakeMyTrip / Agoda / Booking.com)
app.post('/api/v1/webhooks/ota/mmt', async (req: Request, res: Response) => {
  try {
    const { hotelId, hotelSlug, ...bookingData } = req.body;
    let targetHotelId = hotelId;
    if (!targetHotelId && hotelSlug) {
      const t = await Tenant.findOne({ slug: String(hotelSlug).trim().toLowerCase() });
      if (t) targetHotelId = t._id;
    }
    if (!targetHotelId) {
      const defaultTenant = await Tenant.findOne({ status: 'ACTIVE' });
      targetHotelId = defaultTenant?._id;
    }
    const result = await OtaChannelService.handleMmtWebhook(targetHotelId, {
      ...bookingData,
      hotelId: targetHotelId,
    });
    res.status(200).json(result);
  } catch (err: any) {
    console.error('[OTA Webhook Error]', err);
    res.status(500).json({ success: false, message: err.message || 'OTA processing failed' });
  }
});

// 3. Outbound Rate & Inventory Push
app.post('/api/v1/ota/sync-inventory', authenticateJWT, requireTenant, async (req: TenantRequest, res: Response) => {
  try {
    const { roomTypeId, currentPrice, availableCount } = req.body;
    const result = OtaChannelService.syncInventoryToOTA(req.hotelId!, roomTypeId, currentPrice, availableCount);
    res.status(200).json({ success: true, payload: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. AI Dynamic Pricing Endpoint
const handleDynamicPricing = async (req: Request, res: Response) => {
  try {
    const basePrice = Number(req.query.basePrice) || 3000;
    const occupancy = Number(req.query.occupancy) || 85;
    const dayOfWeek = req.query.dayOfWeek !== undefined ? Number(req.query.dayOfWeek) : new Date().getDay();
    const result = calculateDynamicPrice(basePrice, occupancy, dayOfWeek);
    res.status(200).json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
app.get('/api/v1/dynamic-pricing', handleDynamicPricing);
app.get('/api/v1/revenue-manager/dynamic-pricing', handleDynamicPricing);

// 5. RevPAR & ADR Analytics
const handleRevParAnalytics = async (req: TenantRequest, res: Response) => {
  try {
    const metrics = await RevParAnalyticsService.calculateRevPar(req.hotelId!);
    res.status(200).json({ success: true, ...metrics });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
app.get('/api/v1/revpar-analytics', authenticateJWT, requireTenant, handleRevParAnalytics);
app.get('/api/v1/revenue-manager/revpar-analytics', authenticateJWT, requireTenant, handleRevParAnalytics);

// 6. Audit Logs Endpoint
app.get('/api/v1/admin-control/audit-logs', authenticateJWT, requireTenant, async (req: TenantRequest, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const page = Number(req.query.page) || 1;
    const logs = await AuditService.getLogs(req.hotelId!, limit, page);
    res.status(200).json({ success: true, ...logs });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 7. Promo Code Validation Endpoint (Supports both Staff JWT & Guest QR Customer sessions)
app.post('/api/v1/crm/promo/validate', async (req: Request, res: Response) => {
  try {
    const rawHotelId = (req.headers['x-hotel-id'] as string) || req.body.hotelId || (req as any).hotelId;
    if (!rawHotelId || !mongoose.Types.ObjectId.isValid(rawHotelId)) {
      res.status(400).json({ valid: false, message: 'Valid Hotel ID required' });
      return;
    }
    const hotelId = new mongoose.Types.ObjectId(rawHotelId);
    const { code, subtotal } = req.body;
    const result = await LoyaltyCrmService.validatePromoCode(hotelId, code, Number(subtotal) || 0);
    res.status(result.valid ? 200 : 400).json(result);
  } catch (err: any) {
    res.status(500).json({ valid: false, message: err.message });
  }
});

// 7b. Promo Code Management Endpoints (Hotel Admin)
app.get('/api/v1/crm/promos', async (req: Request, res: Response) => {
  try {
    const rawHotelId = (req.headers['x-hotel-id'] as string) || req.query.hotelId || (req as any).hotelId;
    if (!rawHotelId || !mongoose.Types.ObjectId.isValid(String(rawHotelId))) {
      res.status(400).json({ success: false, message: 'Valid Hotel ID required' });
      return;
    }
    const hotelId = new mongoose.Types.ObjectId(String(rawHotelId));
    const promos = await PromoCode.find({ hotelId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: promos });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/v1/crm/promos', async (req: Request, res: Response) => {
  try {
    const rawHotelId = (req.headers['x-hotel-id'] as string) || req.body.hotelId || (req as any).hotelId;
    if (!rawHotelId || !mongoose.Types.ObjectId.isValid(String(rawHotelId))) {
      res.status(400).json({ success: false, message: 'Valid Hotel ID required' });
      return;
    }
    const hotelId = new mongoose.Types.ObjectId(String(rawHotelId));
    const { code, discountType = 'PERCENTAGE', discountValue, minOrderAmount = 0, maxDiscountAmount, validDays = 365 } = req.body;
    if (!code || !discountValue) {
      res.status(400).json({ success: false, message: 'Code and discountValue are required' });
      return;
    }
    const cleanCode = String(code).trim().toUpperCase();
    const validTo = new Date(Date.now() + Number(validDays) * 86400000);

    const promo = await PromoCode.findOneAndUpdate(
      { hotelId, code: cleanCode },
      {
        hotelId,
        code: cleanCode,
        discountType: discountType === 'FLAT' ? 'FLAT' : 'PERCENTAGE',
        discountValue: Number(discountValue),
        minOrderAmount: Number(minOrderAmount) || 0,
        maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : undefined,
        isActive: true,
        validFrom: new Date(),
        validTo,
      },
      { upsert: true, new: true }
    );

    try {
      io.to(`${hotelId.toString()}_customers`).to(`${hotelId.toString()}_admin`).emit('promo:updated', promo);
    } catch (_) {}

    res.status(201).json({ success: true, data: promo, message: `Promo code ${cleanCode} saved successfully!` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/v1/crm/promos/:id', async (req: Request, res: Response) => {
  try {
    const rawHotelId = (req.headers['x-hotel-id'] as string) || req.query.hotelId || (req as any).hotelId;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id || !mongoose.Types.ObjectId.isValid(String(id))) {
      res.status(400).json({ success: false, message: 'Invalid promo id' });
      return;
    }
    const deleted = await PromoCode.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Promo code deleted successfully', deletedId: id });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 8. Tip Pool Distribution Endpoint
app.post('/api/v1/cashier-shift/tip-pool/distribute', authenticateJWT, requireTenant, async (req: TenantRequest, res: Response) => {
  try {
    const { totalTips, staffList, fohPercentage = 60, bohPercentage = 40 } = req.body;
    const result = await TipPoolService.distributeTipPool(req.hotelId!, totalTips, staffList || [], fohPercentage, bohPercentage);
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 9. Razorpay Payment Verification
const handleRazorpayVerify = async (req: Request, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const isValid = RazorpayService.verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!isValid) {
      res.status(400).json({ success: false, errorCode: 'SIGNATURE_VERIFICATION_FAILED', message: 'Razorpay HMAC signature is invalid' });
      return;
    }
    res.status(200).json({ success: true, message: 'Payment verified successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
app.post('/api/v1/payments/razorpay/verify', handleRazorpayVerify);
app.post('/api/v1/billing/razorpay/verify', handleRazorpayVerify);

// 10. Tenant Custom Branding
app.get('/api/v1/tenant/branding', async (req: Request, res: Response) => {
  try {
    const slug = (req.query.slug as string) || req.hostname.split('.')[0];
    const hotelId = req.query.hotelId as string;
    let tenant = null;
    if (hotelId && mongoose.Types.ObjectId.isValid(hotelId)) {
      tenant = await Tenant.findById(hotelId);
    } else if (slug) {
      tenant = await Tenant.findOne({ slug: slug.toLowerCase() });
    }
    if (!tenant) {
      tenant = await Tenant.findOne({ status: 'ACTIVE' });
    }
    res.status(200).json({
      success: true,
      data: {
        id: tenant?._id,
        name: tenant?.name || 'SpiceHub Luxury Hotel',
        slug: tenant?.slug || 'taj-gateway',
        logoUrl: tenant?.logoUrl || '',
        primaryColor: tenant?.primaryColor || '#f97316',
        tagline: tenant?.tagline || '',
        gstin: tenant?.gstin || '27AAAAA0000A1Z5',
        fssai: tenant?.fssai || '10019022009876',
        wifiSsid: tenant?.wifiSsid || 'TajGateway_HighSpeed',
        wifiPassword: tenant?.wifiPassword || 'SpiceGuest@2026',
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/v1/superadmin/tenants/:tenantId/branding', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { logoUrl, primaryColor, name, tagline, gstin, fssai, wifiSsid, wifiPassword } = req.body;
    const updated = await Tenant.findByIdAndUpdate(
      tenantId,
      { $set: { logoUrl, primaryColor, 'branding.primaryColor': primaryColor, name, tagline, gstin, fssai, wifiSsid, wifiPassword } },
      { new: true }
    );
    res.status(200).json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Sentry Error Handler & Global Unhandled Exception Catcher
Sentry.setupExpressErrorHandler(app);

// Centralized Structured Error Handling Middleware
app.use((err: any, req: Request, res: Response, _next: express.NextFunction) => {
  const tenantId =
    (req.headers['x-hotel-id'] as string) ||
    (req as any).hotelId ||
    (req as any).user?.hotelId ||
    'public';

  const statusCode = err.status || err.statusCode || 500;

  logger.error(`[Unhandled Exception] ${err.message || 'Internal Server Error'}`, {
    tenantId,
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    statusCode,
  });

  Sentry.captureException(err, {
    tags: { tenantId },
    extra: {
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      statusCode,
    },
  });

  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred. Please contact system support.'
      : (err.message || 'Internal Server Error'),
  });
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
const HOST = '0.0.0.0';

import { connectRedis } from './config/redis';

export const startServer = async () => {
  assertProductionSecurityConfig();
  await connectDB();
  await connectRedis();
  startSocketKeepAliveWorker(60000);
  server.listen(PORT, HOST, () => {
    console.log(`🚀 [SpiceHub Engine] Server listening on ${HOST}:${PORT}`);
    console.log(`📡 [Socket.IO] Realtime server active on port ${PORT}`);
  });
};

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  startServer();
}

export default app;
export { app, server };
