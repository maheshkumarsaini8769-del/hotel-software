#!/usr/bin/env node
/**
 * SpiceHub Standalone 1-Minute Socket KeepAlive Daemon
 *
 * Hits the Render Socket.IO server (/api/keepalive) and Vercel Backend Cron (/api/v1/cron/socket-keepalive)
 * every 60 seconds to ensure dynos never sleep and maintain 24/7 uptime.
 */

const RENDER_SOCKET_URL = process.env.RENDER_SOCKET_URL || 'https://spicehub-socket-server.onrender.com';
const VERCEL_BACKEND_URL = process.env.VERCEL_BACKEND_URL || 'https://spicehub-backend.vercel.app';
const INTERVAL_MS = parseInt(process.env.KEEP_ALIVE_INTERVAL_MS || '60000', 10);
const SOCKET_SECRET = process.env.SOCKET_SECRET || 'spicehub-super-secret-socket-token-2026';

let pingCount = 0;

async function pingEndpoint(name, url, options = {}) {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(10000),
    });
    const latency = Date.now() - start;
    console.log(`[${new Date().toISOString()}] 💓 [${name}] HTTP ${res.status} in ${latency}ms -> ${url}`);
    return { success: res.ok, status: res.status, latency };
  } catch (err) {
    const latency = Date.now() - start;
    console.warn(`[${new Date().toISOString()}] ⚠️ [${name}] Failed in ${latency}ms -> ${url}: ${err.message}`);
    return { success: false, error: err.message, latency };
  }
}

async function executeHeartbeat() {
  pingCount++;
  console.log(`\n--- 🕒 1-Minute Heartbeat Cycle #${pingCount} [Interval: ${INTERVAL_MS / 1000}s] ---`);

  // 1. Direct Ping to Render Socket Server
  await pingEndpoint('Render Socket', `${RENDER_SOCKET_URL}/api/keepalive`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-source': 'standalone-keepalive-daemon',
      'x-socket-secret': SOCKET_SECRET,
    },
    body: JSON.stringify({
      source: 'standalone-keepalive-daemon',
      cycle: pingCount,
      timestamp: new Date().toISOString(),
    }),
  });

  // 2. Trigger Vercel Backend Keepalive Bridge
  await pingEndpoint('Vercel Backend Bridge', `${VERCEL_BACKEND_URL}/api/v1/cron/socket-keepalive`, {
    method: 'GET',
    headers: {
      'x-client-source': 'standalone-keepalive-daemon',
    },
  });
}

console.log('🚀 [SpiceHub KeepAlive Daemon] Initialized.');
console.log(`🎯 Target Render Socket: ${RENDER_SOCKET_URL}`);
console.log(`🎯 Target Vercel Backend: ${VERCEL_BACKEND_URL}`);
console.log(`⏱️ Schedule: Every 60 seconds (1 minute)\n`);

// Immediate initial execution
executeHeartbeat();

// Recurring 1-minute interval
setInterval(executeHeartbeat, INTERVAL_MS);
