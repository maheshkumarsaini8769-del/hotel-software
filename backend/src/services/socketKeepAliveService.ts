/**
 * Socket KeepAlive Service
 *
 * Automatically sends a heartbeat ping to the Render Socket.IO server every 1 minute.
 * Prevents Render free/starter dynos from sleeping, and maintains health telemetry.
 */

interface KeepAliveStats {
  totalPingsSent: number;
  totalPingsSuccess: number;
  totalPingsFailed: number;
  lastPingAt: string | null;
  lastPingStatus: number | null;
  lastLatencyMs: number | null;
  lastError: string | null;
  targetUrl: string;
}

const stats: KeepAliveStats = {
  totalPingsSent: 0,
  totalPingsSuccess: 0,
  totalPingsFailed: 0,
  lastPingAt: null,
  lastPingStatus: null,
  lastLatencyMs: null,
  lastError: null,
  targetUrl: '',
};

let timer: NodeJS.Timeout | null = null;

export function getSocketServerUrl(): string {
  const url =
    process.env.RENDER_SOCKET_URL ||
    process.env.SOCKET_SERVER_URL ||
    process.env.VITE_SOCKET_URL ||
    'http://localhost:10000';
  return url.replace(/\/$/, '');
}

/**
 * Execute a single keepalive heartbeat ping to the Render Socket server
 */
export async function pingSocketServer(source = 'backend-1min-worker'): Promise<{
  success: boolean;
  status: number | null;
  latencyMs: number;
  data?: any;
  error?: string;
}> {
  const targetBase = getSocketServerUrl();
  const pingUrl = `${targetBase}/api/keepalive`;
  stats.targetUrl = pingUrl;
  stats.totalPingsSent++;
  stats.lastPingAt = new Date().toISOString();

  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const res = await fetch(pingUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-source': source,
        'x-socket-secret': process.env.SOCKET_SECRET || 'spicehub-super-secret-socket-token-2026',
      },
      body: JSON.stringify({
        source,
        timestamp: stats.lastPingAt,
        environment: process.env.NODE_ENV || 'production',
        sentFrom: 'spicehub-backend',
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const latencyMs = Date.now() - start;
    stats.lastLatencyMs = latencyMs;
    stats.lastPingStatus = res.status;

    if (res.ok) {
      stats.totalPingsSuccess++;
      stats.lastError = null;
      const data = await res.json().catch(() => null);
      console.log(
        `[Render Socket KeepAlive] 💓 1-Min Heartbeat OK -> ${pingUrl} (${res.status} in ${latencyMs}ms) [Pings: ${stats.totalPingsSuccess}/${stats.totalPingsSent}]`
      );
      return { success: true, status: res.status, latencyMs, data };
    } else {
      stats.totalPingsFailed++;
      stats.lastError = `HTTP ${res.status} ${res.statusText}`;
      console.warn(
        `[Render Socket KeepAlive] ⚠️ Heartbeat returned non-200 status -> ${res.status} ${res.statusText} (${latencyMs}ms)`
      );
      return { success: false, status: res.status, latencyMs, error: stats.lastError || undefined };
    }
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    stats.totalPingsFailed++;
    stats.lastLatencyMs = latencyMs;
    stats.lastPingStatus = null;
    stats.lastError = err.message || 'Network error';
    console.warn(
      `[Render Socket KeepAlive] ❌ Heartbeat ping failed to ${pingUrl} (${latencyMs}ms): ${stats.lastError}`
    );
    return { success: false, status: null, latencyMs, error: stats.lastError || undefined };
  }
}

/**
 * Start the recurring 1-minute auto ping timer
 */
export function startSocketKeepAliveWorker(intervalMs = 60000): void {
  if (timer) return; // Already running

  const targetUrl = getSocketServerUrl();
  console.log(`[Render Socket KeepAlive] 🕒 Starting 1-Minute Auto KeepAlive Worker targeting: ${targetUrl}`);

  // Trigger initial heartbeat immediately after short delay (5s)
  setTimeout(() => {
    pingSocketServer('initial-startup-heartbeat').catch(() => {});
  }, 5000);

  // Recurring 1-minute heartbeat
  timer = setInterval(() => {
    pingSocketServer('recurring-1min-timer').catch(() => {});
  }, intervalMs);

  if (typeof timer.unref === 'function') {
    timer.unref();
  }
}

export function stopSocketKeepAliveWorker(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
    console.log('[Render Socket KeepAlive] Worker stopped.');
  }
}

export function getKeepAliveStats(): KeepAliveStats {
  return { ...stats };
}
