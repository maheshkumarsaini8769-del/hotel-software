/**
 * Socket Emitter Service
 *
 * Bridges backend events to the standalone Render Socket.IO server.
 * When running serverless on Vercel or when RENDER_SOCKET_URL is defined,
 * broadcasts events via HTTP POST to the Render Socket server's /api/broadcast endpoint.
 */

export interface BroadcastPayload {
  rooms?: string | string[];
  room?: string | string[];
  event: string;
  data: any;
}

export async function broadcastToRenderSocket(payload: BroadcastPayload): Promise<boolean> {
  const socketUrl =
    process.env.RENDER_SOCKET_URL ||
    process.env.SOCKET_SERVER_URL ||
    process.env.VITE_SOCKET_URL;

  if (!socketUrl) {
    return false; // Standalone socket server URL not defined, using local in-memory socket
  }

  const broadcastUrl = `${socketUrl.replace(/\/$/, '')}/api/broadcast`;
  const secret = process.env.SOCKET_SECRET || 'spicehub-super-secret-socket-token-2026';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(broadcastUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-socket-secret': secret,
      },
      body: JSON.stringify({
        ...payload,
        secret,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    return res.ok;
  } catch (err: any) {
    console.warn(`[Socket Forwarder] Warning: Failed to forward event "${payload.event}" to Render: ${err.message}`);
    return false;
  }
}
