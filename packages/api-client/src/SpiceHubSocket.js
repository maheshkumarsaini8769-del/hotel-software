"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpiceHubSocket = void 0;
const socket_io_client_1 = require("socket.io-client");
class SpiceHubSocket {
    static instance = null;
    socket = null;
    isConnected = false;
    currentOptions = null;
    listeners = new Map();
    constructor() { }
    static getInstance() {
        if (!SpiceHubSocket.instance) {
            SpiceHubSocket.instance = new SpiceHubSocket();
        }
        return SpiceHubSocket.instance;
    }
    connect(options) {
        if (this.socket && this.isConnected) {
            return;
        }
        this.currentOptions = options;
        const url = options.serverUrl || 'http://localhost:5000';
        this.socket = (0, socket_io_client_1.io)(url, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });
        this.socket.on('connect', () => {
            this.isConnected = true;
            console.log(`📡 [SpiceHubSocket] Connected to server: ${url}`);
            // Auto-join hotel channel
            if (options.hotelId) {
                this.socket?.emit('join_tenant_room', {
                    hotelId: options.hotelId,
                    station: options.station,
                });
            }
            // Auto-join private waiter channel
            if (options.userId) {
                this.socket?.emit('join_tenant_room', {
                    hotelId: `waiter_${options.userId}`,
                });
            }
            // Auto-join customer table session channel
            if (options.tableSessionId) {
                this.socket?.emit('join_tenant_room', {
                    hotelId: `session_${options.tableSessionId}`,
                });
            }
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
    on(event, handler) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(handler);
        if (this.socket) {
            this.socket.on(event, handler);
        }
        // Return unbind function
        return () => {
            this.off(event, handler);
        };
    }
    off(event, handler) {
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
    emit(event, data) {
        if (this.socket && this.isConnected) {
            this.socket.emit(event, data);
        }
        else {
            console.warn(`📡 [SpiceHubSocket] Cannot emit '${event}': Socket not connected`);
        }
    }
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
        }
    }
    getConnected() {
        return this.isConnected;
    }
}
exports.SpiceHubSocket = SpiceHubSocket;
