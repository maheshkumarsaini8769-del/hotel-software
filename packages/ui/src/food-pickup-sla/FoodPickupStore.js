"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FoodPickupStore = void 0;
class FoodPickupStore {
    static config = null;
    static tickets = [];
    static configListeners = [];
    static ticketListeners = [];
    static setConfig(newConfig) {
        this.config = newConfig;
        this.configListeners.forEach((fn) => fn(newConfig));
    }
    static getConfig() {
        return this.config;
    }
    static setTickets(tickets) {
        this.tickets = tickets;
        this.ticketListeners.forEach((fn) => fn(this.tickets));
    }
    static addOrUpdateTicket(ticket) {
        const idx = this.tickets.findIndex((t) => t._id === ticket._id);
        if (idx >= 0) {
            this.tickets[idx] = ticket;
        }
        else {
            this.tickets.unshift(ticket);
        }
        this.ticketListeners.forEach((fn) => fn(this.tickets));
    }
    static getActiveTickets() {
        return this.tickets.filter((t) => t.status === 'READY_FOR_PICKUP' || t.status === 'WAITER_EN_ROUTE');
    }
    static subscribeTickets(listener) {
        this.ticketListeners.push(listener);
        return () => {
            this.ticketListeners = this.ticketListeners.filter((fn) => fn !== listener);
        };
    }
    static subscribeConfig(listener) {
        this.configListeners.push(listener);
        return () => {
            this.configListeners = this.configListeners.filter((fn) => fn !== listener);
        };
    }
}
exports.FoodPickupStore = FoodPickupStore;
