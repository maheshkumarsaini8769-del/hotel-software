import { io, Socket } from 'socket.io-client';

export interface SocketConnectionOptions {
  serverUrl?: string;
  hotelId: string;
  station?: string;
  userId?: string;
  tableSessionId?: string;
}

export type SocketEventHandler = (data: any) => void;

export class SpiceHubSocket {
  private static instance: SpiceHubSocket | null = null;
  private socket: Socket | null = null;
  private isConnected = false;
  private currentOptions: SocketConnectionOptions | null = null;
  private listeners: Map<string, Set<SocketEventHandler>> = new Map();

  private constructor() {}

  public static getInstance(): SpiceHubSocket {
    if (!SpiceHubSocket.instance) {
      SpiceHubSocket.instance = new SpiceHubSocket();
    }
    return SpiceHubSocket.instance;
  }

  private joinRooms(options: SocketConnectionOptions): void {
    if (!this.socket) return;
    if (options.hotelId) {
      this.socket.emit('join_tenant_room', {
        hotelId: options.hotelId,
        station: options.station,
        userId: options.userId,
        tableSessionId: options.tableSessionId,
      });
    }
    if (options.userId) {
      this.socket.emit('join_tenant_room', {
        hotelId: `waiter_${options.userId}`,
      });
    }
    if (options.tableSessionId) {
      this.socket.emit('join_tenant_room', {
        hotelId: `session_${options.tableSessionId}`,
      });
    }
  }

  public connect(options: SocketConnectionOptions): void {
    if (this.socket && this.isConnected) {
      if (
        options.hotelId !== this.currentOptions?.hotelId ||
        options.station !== this.currentOptions?.station ||
        options.userId !== this.currentOptions?.userId ||
        options.tableSessionId !== this.currentOptions?.tableSessionId
      ) {
        this.currentOptions = options;
        this.joinRooms(options);
        console.log(`📡 [SpiceHubSocket] Updated room joins for hotel: ${options.hotelId} (Station: ${options.station || 'global'})`);
      }
      return;
    }

    this.currentOptions = options;
    const url = options.serverUrl || 'http://localhost:5000';

    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log(`📡 [SpiceHubSocket] Connected to server: ${url}`);
      this.joinRooms(options);
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      console.warn(`📡 [SpiceHubSocket] Disconnected: ${reason}`);
    });

    this.socket.on('connect_error', (err) => {
      console.error(`📡 [SpiceHubSocket] Connection error:`, err.message);
    });

    // Re-bind all active listeners on the new socket
    this.listeners.forEach((handlers, eventName) => {
      handlers.forEach((handler) => {
        this.socket?.on(eventName, handler);
      });
    });
  }

  public on(event: string, handler: SocketEventHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    if (this.socket) {
      this.socket.on(event, handler);
    }

    // Return unbind function
    return () => {
      this.off(event, handler);
    };
  }

  public off(event: string, handler: SocketEventHandler): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    }
    if (this.socket) {
      this.socket.off(event, handler);
    }
  }

  public emit(event: string, data: any): void {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`📡 [SpiceHubSocket] Cannot emit '${event}': Socket not connected`);
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  public getConnected(): boolean {
    return this.isConnected;
  }
}
