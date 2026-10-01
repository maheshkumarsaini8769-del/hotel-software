import { FoodPickupTicketDTO, FoodPickupSlaConfigDTO } from './types';
type Listener<T> = (data: T) => void;
export declare class FoodPickupStore {
    private static config;
    private static tickets;
    private static configListeners;
    private static ticketListeners;
    static setConfig(newConfig: FoodPickupSlaConfigDTO): void;
    static getConfig(): FoodPickupSlaConfigDTO | null;
    static setTickets(tickets: FoodPickupTicketDTO[]): void;
    static addOrUpdateTicket(ticket: FoodPickupTicketDTO): void;
    static getActiveTickets(): FoodPickupTicketDTO[];
    static subscribeTickets(listener: Listener<FoodPickupTicketDTO[]>): () => void;
    static subscribeConfig(listener: Listener<FoodPickupSlaConfigDTO>): () => void;
}
export {};
