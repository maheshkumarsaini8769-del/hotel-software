"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoadBalancerStore = void 0;
class LoadBalancerStore {
    static workloads = [];
    static activeSpillovers = [];
    static setWorkloads(data) {
        this.workloads = data;
    }
    static getWorkloads() {
        return this.workloads;
    }
    static setActiveSpillovers(logs) {
        this.activeSpillovers = logs;
    }
    static getActiveSpillovers() {
        return this.activeSpillovers;
    }
    static addSpillover(log) {
        this.activeSpillovers.unshift(log);
    }
    static clear() {
        this.workloads = [];
        this.activeSpillovers = [];
    }
}
exports.LoadBalancerStore = LoadBalancerStore;
