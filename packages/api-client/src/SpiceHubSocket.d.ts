export interface SocketConnectionOptions {
    serverUrl?: string;
    hotelId: string;
    station?: string;
    userId?: string;
    tableSessionId?: string;
}
export type SocketEventHandler = (data: any) => void;
export declare class SpiceHubSocket {
    private static instance;
    private socket;
    private isConnected;
    private currentOptions;
    private listeners;
    private constructor();
    static getInstance(): SpiceHubSocket;
    connect(options: SocketConnectionOptions): void;
    on(event: string, handler: SocketEventHandler): () => void;
    off(event: string, handler: SocketEventHandler): void;
    emit(event: string, data: any): void;
    disconnect(): void;
    getConnected(): boolean;
}
