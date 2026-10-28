import express, { Request, Response } from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = Number(process.env.PORT || process.env.SOCKET_PORT || 10000);
const SOCKET_SECRET = process.env.SOCKET_SECRET || 'spicehub-super-secret-socket-token-2026';
const JWT_SECRET = process.env.JWT_SECRET || 'spicehub-enterprise-jwt-super-secret-token-key-2026';

app.use(cors({ origin: '*' }));
app.use(express.json());

// Track metrics
let totalPingsReceived = 0;
let lastPingAt: string | null = null;
let lastPingSource: string | null = null;

// ============================================================================
// 1. HTTP HEALTH & KEEPALIVE ENDPOINTS (Render 24/7 Sleep Prevention)
// ============================================================================

// Standard Healthcheck
app.get(['/', '/health'], (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'spicehub-render-socket-server',
    version: '1.0.0',
    uptimeSeconds: Math.floor(process.uptime()),
    activeConnections: io.engine.clientsCount,
    totalPingsReceived,
    lastPingAt,
    lastPingSource,
    timestamp: new Date().toISOString(),
  });
});

// Dedicated 1-Minute KeepAlive Ping Endpoint (Hit by Vercel Backend)
app.post(['/api/keepalive', '/keepalive', '/ping'], (req: Request, res: Response) => {
  totalPingsReceived++;
  lastPingAt = new Date().toISOString();
  lastPingSource = req.headers['x-forwarded-for']?.toString() || req.ip || 'backend';

  const source = req.body?.source || 'vercel-backend-heartbeat';
  console.log(`[KeepAlive] 💓 1-Minute Heartbeat received from [${source}] at ${lastPingAt} (Total: ${totalPingsReceived})`);

  // Broadcast keepalive heartbeat to internal monitor channel if any listeners
  io.to('spicehub_system_monitors').emit('socket:heartbeat', {
    pingId: totalPingsReceived,
    timestamp: lastPingAt,
    activeConnections: io.engine.clientsCount,
  });

  res.status(200).json({
    success: true,
    message: 'Render Socket.IO service is active and responsive',
    pingCount: totalPingsReceived,
    serverUptimeSeconds: Math.floor(process.uptime()),
    activeConnections: io.engine.clientsCount,
    timestamp: lastPingAt,
  });
});

// ============================================================================
// 2. SECURE REST BROADCAST ENDPOINT (Allows Vercel Backend to Emit Events)
// ============================================================================
app.post('/api/broadcast', (req: Request, res: Response): void => {
  const secretHeader = req.headers['x-socket-secret'];
  if (secretHeader !== SOCKET_SECRET && req.body?.secret !== SOCKET_SECRET) {
    res.status(401).json({ success: false, message: 'Unauthorized: Invalid socket secret' });
    return;
  }

  const { room, rooms, event, data } = req.body;
  if (!event) {
    res.status(400).json({ success: false, message: 'Missing event name' });
    return;
  }

  const targetRooms: string[] = [];
  if (Array.isArray(rooms)) {
    targetRooms.push(...rooms);
  } else if (typeof rooms === 'string') {
    targetRooms.push(rooms);
  }
  if (typeof room === 'string') {
    targetRooms.push(room);
  } else if (Array.isArray(room)) {
    targetRooms.push(...room);
  }

  if (targetRooms.length > 0) {
    let emitter: any = io;
    for (const r of targetRooms) {
      emitter = emitter.to(r);
    }
    emitter.emit(event, data);
    console.log(`[Broadcast] Event "${event}" broadcast to rooms: ${targetRooms.join(', ')}`);
  } else {
    io.emit(event, data);
    console.log(`[Broadcast] Global event "${event}" broadcast to all clients`);
  }

  res.status(200).json({
    success: true,
    message: `Event "${event}" broadcast successfully`,
    rooms: targetRooms,
    activeConnections: io.engine.clientsCount,
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// 3. SOCKET.IO REAL-TIME WEBSOCKET CONFIGURATION
// ============================================================================
export const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  },
  pingTimeout: 30000,
  pingInterval: 25000,
});

io.on('connection', (socket) => {
  console.log(`[Socket.IO] 🔌 Client connected: ${socket.id} (Transport: ${socket.conn.transport.name})`);

  // 1. Channel Room Joiner with Multi-Tenant Station Support
  socket.on('join_tenant_room', (payload: any) => {
    const { hotelId, station, token, userId } = payload || {};
    if (!hotelId) return;

    // Validate token if provided
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        if (decoded.hotelId && decoded.hotelId !== hotelId) {
          console.warn(`[Socket Security] Hotel ID mismatch for client ${socket.id}: ${decoded.hotelId} vs ${hotelId}`);
          socket.emit('security_error', { message: 'Unauthorized: Hotel ID mismatch' });
          return;
        }
      } catch (err) {
        console.warn(`[Socket Security] Invalid JWT token on join_tenant_room:`, err);
      }
    }

    // Default global room for tenant
    socket.join(`${hotelId}_global`);

    if (station) {
      socket.join(`${hotelId}_${station}`);
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
      console.log(`[Socket.IO] Client ${socket.id} joined station [${station}] for hotel [${hotelId}]`);
    } else {
      console.log(`[Socket.IO] Client ${socket.id} joined global room for hotel [${hotelId}]`);
    }

    if (userId) {
      socket.join(`waiter_${userId}`);
      socket.join(`staff_${userId}`);
    }

    socket.emit('room_joined', {
      success: true,
      hotelId,
      station: station || 'global',
      socketId: socket.id,
      timestamp: new Date().toISOString(),
    });
  });

  // Client Heartbeat ping/pong
  socket.on('ping', () => {
    socket.emit('pong', { serverTime: Date.now() });
  });

  // Relay client events to tenant rooms
  socket.on('relay_event', (payload: { hotelId: string; targetStation?: string; event: string; data: any }) => {
    const { hotelId, targetStation, event, data } = payload || {};
    if (!hotelId || !event) return;

    if (targetStation) {
      socket.to(`${hotelId}_${targetStation}`).emit(event, data);
    } else {
      socket.to(`${hotelId}_global`).emit(event, data);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`[Socket.IO] ❌ Client disconnected: ${socket.id} (Reason: ${reason})`);
  });
});

// Start Server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🚀 SPICEHUB RENDER SOCKET.IO SERVER RUNNING ON PORT ${PORT}`);
  console.log(`🔗 Health Check: http://0.0.0.0:${PORT}/health`);
  console.log(`💓 1-Min KeepAlive Endpoint: http://0.0.0.0:${PORT}/api/keepalive`);
  console.log(`📢 REST Broadcast Endpoint: http://0.0.0.0:${PORT}/api/broadcast`);
  console.log(`=======================================================`);
});

// Graceful termination
process.on('SIGTERM', () => {
  console.log('[Socket Server] SIGTERM received. Gracefully closing server...');
  server.close(() => {
    console.log('[Socket Server] Closed all connections.');
    process.exit(0);
  });
});
