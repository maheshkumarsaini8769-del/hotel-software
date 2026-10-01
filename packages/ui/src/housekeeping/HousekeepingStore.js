"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HousekeepingStore = void 0;
const HousekeepingHelper_1 = require("./HousekeepingHelper");
const shared_types_1 = require("@spicehub/shared-types");
class HousekeepingStore {
    rooms = [];
    summary = {
        total: 0,
        clean: 0,
        dirty: 0,
        cleaning: 0,
        inspection: 0,
        outOfService: 0,
        occupied: 0,
    };
    selectedFloor = 'ALL';
    statusFilter = 'ALL';
    searchQuery = '';
    selectedRoom = null;
    // Modal Visibility
    isAttendantModalOpen = false;
    isInspectionModalOpen = false;
    isMaintenanceModalOpen = false;
    // Working drafts
    activeChecklist = [];
    activeMinibarAudit = [];
    activeLinenAction = 'FULL_WASH';
    inspectionNotes = '';
    maintenanceDraft = {
        category: 'GENERAL',
        title: '',
        description: '',
        priority: 'HIGH',
        blocksRoom: true,
    };
    ecoTuckInCount = 0;
    isLoading = false;
    error = null;
    listeners = new Set();
    constructor(initialRooms = []) {
        this.rooms = [...initialRooms];
        this.recomputeSummary();
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }
    notify() {
        this.listeners.forEach((listener) => {
            try {
                listener();
            }
            catch (err) {
                console.error('Error in HousekeepingStore listener:', err);
            }
        });
    }
    setBoardData(rooms, summary) {
        this.rooms = [...rooms];
        if (summary) {
            this.summary = summary;
        }
        else {
            this.recomputeSummary();
        }
        this.notify();
    }
    recomputeSummary() {
        let clean = 0;
        let dirty = 0;
        let cleaning = 0;
        let inspection = 0;
        let outOfService = 0;
        let occupied = 0;
        this.rooms.forEach((r) => {
            if (r.status === shared_types_1.RoomStatus.AVAILABLE)
                clean++;
            else if (r.status === shared_types_1.RoomStatus.DIRTY)
                dirty++;
            else if (r.status === shared_types_1.RoomStatus.CLEANING)
                cleaning++;
            else if (r.status === shared_types_1.RoomStatus.INSPECTION)
                inspection++;
            else if (r.status === shared_types_1.RoomStatus.OUT_OF_SERVICE)
                outOfService++;
            else if (r.status === shared_types_1.RoomStatus.OCCUPIED)
                occupied++;
        });
        this.summary = {
            total: this.rooms.length,
            clean,
            dirty,
            cleaning,
            inspection,
            outOfService,
            occupied,
        };
    }
    getSummary() {
        return this.summary;
    }
    getFloors() {
        const floorSet = new Set();
        this.rooms.forEach((r) => floorSet.add(r.floorNumber));
        return Array.from(floorSet).sort((a, b) => a - b);
    }
    getSelectedFloor() {
        return this.selectedFloor;
    }
    filterByFloor(floor) {
        this.selectedFloor = floor;
        this.notify();
    }
    getStatusFilter() {
        return this.statusFilter;
    }
    filterByStatus(status) {
        this.statusFilter = status;
        this.notify();
    }
    getSearchQuery() {
        return this.searchQuery;
    }
    setSearchQuery(q) {
        this.searchQuery = q;
        this.notify();
    }
    getFilteredRooms() {
        return this.rooms.filter((room) => {
            if (this.selectedFloor !== 'ALL' && room.floorNumber !== this.selectedFloor) {
                return false;
            }
            if (this.statusFilter !== 'ALL' && room.status !== this.statusFilter) {
                return false;
            }
            if (this.searchQuery.trim()) {
                const q = this.searchQuery.toLowerCase();
                const matchesRoom = room.roomNumber.toLowerCase().includes(q);
                const matchesGuest = room.guestInfo?.guestName.toLowerCase().includes(q) || false;
                const matchesType = room.roomType?.name.toLowerCase().includes(q) || false;
                if (!matchesRoom && !matchesGuest && !matchesType) {
                    return false;
                }
            }
            return true;
        });
    }
    getSelectedRoom() {
        return this.selectedRoom;
    }
    openAttendantModal(room) {
        this.selectedRoom = room;
        this.isAttendantModalOpen = true;
        // Initialize checklist from active task or default
        if (room.activeTask && room.activeTask.checklist && room.activeTask.checklist.length > 0) {
            this.activeChecklist = room.activeTask.checklist.map((c) => ({ ...c }));
        }
        else {
            this.activeChecklist = [
                { taskName: 'Strip bedding and replace linens', isDone: false },
                { taskName: 'Disinfect bathroom and replenish towels', isDone: false },
                { taskName: 'Dust surfaces and vacuum carpet', isDone: false },
                { taskName: 'Restock guest amenities and mini bar', isDone: false },
                { taskName: 'Sanitize high-touch door handles & switches', isDone: false },
            ];
        }
        // Reset minibar items clone
        this.activeMinibarAudit = HousekeepingHelper_1.HousekeepingHelper.DEFAULT_MINIBAR_ITEMS.map((item) => ({ ...item }));
        this.activeLinenAction = 'FULL_WASH';
        this.notify();
    }
    closeAttendantModal() {
        this.isAttendantModalOpen = false;
        this.notify();
    }
    isAttendantModalActive() {
        return this.isAttendantModalOpen;
    }
    getActiveChecklist() {
        return this.activeChecklist;
    }
    toggleChecklistItem(index) {
        if (this.activeChecklist[index]) {
            this.activeChecklist[index].isDone = !this.activeChecklist[index].isDone;
            this.notify();
        }
    }
    getActiveMinibarAudit() {
        return this.activeMinibarAudit;
    }
    updateMinibarQuantity(id, delta) {
        const item = this.activeMinibarAudit.find((it) => it.id === id);
        if (item) {
            item.quantity = Math.max(0, (item.quantity || 0) + delta);
            this.notify();
        }
    }
    getActiveLinenAction() {
        return this.activeLinenAction;
    }
    setLinenAction(action) {
        this.activeLinenAction = action;
        if (action === 'TUCK_IN') {
            this.ecoTuckInCount++;
        }
        this.notify();
    }
    // Supervisor Inspection
    openInspectionModal(room) {
        this.selectedRoom = room;
        this.isInspectionModalOpen = true;
        this.inspectionNotes = '';
        this.notify();
    }
    closeInspectionModal() {
        this.isInspectionModalOpen = false;
        this.notify();
    }
    isInspectionModalActive() {
        return this.isInspectionModalOpen;
    }
    getInspectionNotes() {
        return this.inspectionNotes;
    }
    setInspectionNotes(notes) {
        this.inspectionNotes = notes;
        this.notify();
    }
    // Maintenance Escalation
    openMaintenanceModal(room) {
        this.selectedRoom = room;
        this.isMaintenanceModalOpen = true;
        this.maintenanceDraft = {
            category: 'GENERAL',
            title: '',
            description: '',
            priority: 'HIGH',
            blocksRoom: true,
        };
        this.notify();
    }
    closeMaintenanceModal() {
        this.isMaintenanceModalOpen = false;
        this.notify();
    }
    isMaintenanceModalActive() {
        return this.isMaintenanceModalOpen;
    }
    getMaintenanceDraft() {
        return this.maintenanceDraft;
    }
    updateMaintenanceDraft(patch) {
        this.maintenanceDraft = { ...this.maintenanceDraft, ...patch };
        this.notify();
    }
    // Eco Stats
    getEcoWaterSavings() {
        return HousekeepingHelper_1.HousekeepingHelper.calculateEcoWaterSaved(this.ecoTuckInCount);
    }
    getMinibarAuditTotal() {
        return HousekeepingHelper_1.HousekeepingHelper.calculateMinibarTotal(this.activeMinibarAudit);
    }
    setLoading(loading) {
        this.isLoading = loading;
        this.notify();
    }
    getLoading() {
        return this.isLoading;
    }
    setError(error) {
        this.error = error;
        this.notify();
    }
    getError() {
        return this.error;
    }
}
exports.HousekeepingStore = HousekeepingStore;
