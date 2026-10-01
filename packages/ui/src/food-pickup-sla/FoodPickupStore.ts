import { FoodPickupTicketDTO, FoodPickupSlaConfigDTO } from './types';

type Listener<T> = (data: T) => void;

export class FoodPickupStore {
  private static config: FoodPickupSlaConfigDTO | null = null;
  private static tickets: FoodPickupTicketDTO[] = [];
  private static configListeners: Listener<FoodPickupSlaConfigDTO>[] = [];
  private static ticketListeners: Listener<FoodPickupTicketDTO[]>[] = [];

  static setConfig(newConfig: FoodPickupSlaConfigDTO): void {
    this.config = newConfig;
    this.configListeners.forEach((fn) => fn(newConfig));
  }

  static getConfig(): FoodPickupSlaConfigDTO | null {
    return this.config;
  }

  static setTickets(tickets: FoodPickupTicketDTO[]): void {
    this.tickets = tickets;
    this.ticketListeners.forEach((fn) => fn(this.tickets));
  }

  static addOrUpdateTicket(ticket: FoodPickupTicketDTO): void {
    const idx = this.tickets.findIndex((t) => t._id === ticket._id);
    if (idx >= 0) {
      this.tickets[idx] = ticket;
    } else {
      this.tickets.unshift(ticket);
    }
    this.ticketListeners.forEach((fn) => fn(this.tickets));
  }

  static getActiveTickets(): FoodPickupTicketDTO[] {
    return this.tickets.filter(
      (t) => t.status === 'READY_FOR_PICKUP' || t.status === 'WAITER_EN_ROUTE'
    );
  }

  static subscribeTickets(listener: Listener<FoodPickupTicketDTO[]>): () => void {
    this.ticketListeners.push(listener);
    return () => {
      this.ticketListeners = this.ticketListeners.filter((fn) => fn !== listener);
    };
  }

  static subscribeConfig(listener: Listener<FoodPickupSlaConfigDTO>): () => void {
    this.configListeners.push(listener);
    return () => {
      this.configListeners = this.configListeners.filter((fn) => fn !== listener);
    };
  }
}
