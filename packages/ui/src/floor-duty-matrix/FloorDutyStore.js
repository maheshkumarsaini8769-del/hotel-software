"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FloorDutyStore = void 0;
class FloorDutyStore {
    static summaries = [];
    static setSummaries(data) {
        this.summaries = data;
    }
    static getSummaries() {
        return this.summaries;
    }
    static getFloorByCode(floorCode) {
        return this.summaries.find((f) => f.floorCode.toUpperCase() === floorCode.toUpperCase());
    }
    static clear() {
        this.summaries = [];
    }
}
exports.FloorDutyStore = FloorDutyStore;
