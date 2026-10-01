import React, { useEffect, useState, useMemo } from 'react';
import { ApiClient } from '@spicehub/api-client';
import {
  HousekeepingStore,
  HousekeepingBoardRoom,
  MaintenanceEscalationPayload,
} from '@spicehub/ui';
import { RoomStatus } from '@spicehub/shared-types';
import { HousekeepingHeader } from './HousekeepingHeader';
import { RoomTurnaroundCard } from './RoomTurnaroundCard';
import { AttendantCleaningModal } from './AttendantCleaningModal';
import { SupervisorInspectionModal } from './SupervisorInspectionModal';
import { MaintenanceEscalationModal } from './MaintenanceEscalationModal';

interface HousekeepingTurnaroundAppProps {
  apiClient?: ApiClient;
  hotelId?: string;
}

export const HousekeepingTurnaroundApp: React.FC<HousekeepingTurnaroundAppProps> = ({
  apiClient = new ApiClient({ baseUrl: window.location.origin }),
  hotelId,
}) => {
  const store = useMemo(() => new HousekeepingStore(), []);
  const [, setTick] = useState(0);

  // Sync state with store
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setTick((t) => t + 1);
    });
    return () => unsubscribe();
  }, [store]);

  // Fetch Board Data
  const loadBoard = async () => {
    try {
      store.setLoading(true);
      store.setError(null);
      const res = await apiClient.housekeeping.getBoard();
      if (res.success && res.board) {
        store.setBoardData(res.board, res.summary);
      }
    } catch (err: any) {
      console.error('Failed to load housekeeping board:', err);
      store.setError(err.message || 'Error fetching housekeeping board');
    } finally {
      store.setLoading(false);
    }
  };

  useEffect(() => {
    loadBoard();
  }, []);

  // Handlers
  const handleStartCleaning = async (taskId: string, _room: HousekeepingBoardRoom) => {
    try {
      store.setLoading(true);
      await apiClient.housekeeping.startCleaning(taskId);
      await loadBoard();
    } catch (err: any) {
      alert(`Could not start cleaning: ${err.message}`);
    } finally {
      store.setLoading(false);
    }
  };

  const handleCreateTaskAndStart = async (roomId: string) => {
    try {
      store.setLoading(true);
      const res = await apiClient.housekeeping.createTask({ roomId });
      if (res.success && res.task?._id) {
        await apiClient.housekeeping.startCleaning(res.task._id);
        await loadBoard();
      }
    } catch (err: any) {
      alert(`Could not create cleaning task: ${err.message}`);
    } finally {
      store.setLoading(false);
    }
  };

  const handleCompleteCleaning = async () => {
    const room = store.getSelectedRoom();
    if (!room || !room.activeTask) return;

    try {
      store.setLoading(true);
      const checklist = store.getActiveChecklist();
      const minibarAudit = store.getActiveMinibarAudit().filter((it) => it.quantity > 0);
      const linenAction = store.getActiveLinenAction();
      const notes = room.activeTask.inspectionNotes || '';

      await apiClient.housekeeping.completeCleaning(room.activeTask._id, {
        completedChecklist: checklist,
        minibarItems: minibarAudit,
        linenAction,
        notes,
      });

      store.closeAttendantModal();
      await loadBoard();
    } catch (err: any) {
      alert(`Failed to complete cleaning: ${err.message}`);
    } finally {
      store.setLoading(false);
    }
  };

  const handleInspect = async (isApproved: boolean, notes: string) => {
    const room = store.getSelectedRoom();
    if (!room || !room.activeTask) return;

    try {
      store.setLoading(true);
      await apiClient.housekeeping.inspectTask(room.activeTask._id, isApproved, notes);
      store.closeInspectionModal();
      await loadBoard();
    } catch (err: any) {
      alert(`Inspection failed: ${err.message}`);
    } finally {
      store.setLoading(false);
    }
  };

  const handleEscalateMaintenance = async (payload: MaintenanceEscalationPayload) => {
    const room = store.getSelectedRoom();
    if (!room) return;

    try {
      store.setLoading(true);
      const taskId = room.activeTask?._id || 'manual';
      await apiClient.housekeeping.escalateMaintenance(taskId, {
        category: payload.category,
        title: payload.title,
        description: payload.description,
        priority: payload.priority,
        blocksRoom: true,
      });

      store.closeMaintenanceModal();
      await loadBoard();
    } catch (err: any) {
      alert(`Maintenance escalation failed: ${err.message}`);
    } finally {
      store.setLoading(false);
    }
  };

  const filteredRooms = store.getFilteredRooms();
  const summary = store.getSummary();
  const floors = store.getFloors();
  const ecoSavings = store.getEcoWaterSavings();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Luxury Navigation Header */}
      <HousekeepingHeader
        summary={summary}
        floors={floors}
        selectedFloor={store.getSelectedFloor()}
        selectedStatus={store.getStatusFilter()}
        searchQuery={store.getSearchQuery()}
        ecoWaterSavedLiters={ecoSavings.liters}
        onSelectFloor={(floor) => store.filterByFloor(floor)}
        onSelectStatus={(status) => store.filterByStatus(status)}
        onSearchChange={(q) => store.setSearchQuery(q)}
        onRefresh={loadBoard}
      />

      {/* Main Board Container */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
        {store.getError() && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between">
            <span>{store.getError()}</span>
            <button
              onClick={loadBoard}
              className="px-3 py-1 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-white font-medium cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {store.getLoading() && filteredRooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin"></div>
            <p className="text-xs font-medium">Syncing live turnaround board...</p>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="py-20 text-center text-slate-500">
            <div className="text-4xl mb-2">🧹</div>
            <h3 className="text-sm font-semibold text-slate-300">No Rooms Found</h3>
            <p className="text-xs text-slate-500 mt-1">Try resetting your filters or search keywords.</p>
            <button
              onClick={() => {
                store.filterByFloor('ALL');
                store.filterByStatus('ALL');
                store.setSearchQuery('');
              }}
              className="mt-4 px-4 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-amber-400 hover:text-amber-300 text-xs font-medium cursor-pointer"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredRooms.map((room) => (
              <RoomTurnaroundCard
                key={room.roomId}
                room={room}
                onStartCleaning={handleStartCleaning}
                onOpenCleaningModal={(r) => store.openAttendantModal(r)}
                onOpenInspectionModal={(r) => store.openInspectionModal(r)}
                onOpenMaintenanceModal={(r) => store.openMaintenanceModal(r)}
                onCreateTask={handleCreateTaskAndStart}
                isLoading={store.getLoading()}
              />
            ))}
          </div>
        )}
      </main>

      {/* Attendant Turnaround Modal Sheet */}
      <AttendantCleaningModal
        room={store.getSelectedRoom()}
        isOpen={store.isAttendantModalActive()}
        checklist={store.getActiveChecklist()}
        minibarItems={store.getActiveMinibarAudit()}
        linenAction={store.getActiveLinenAction()}
        notes={store.getSelectedRoom()?.activeTask?.inspectionNotes || ''}
        onToggleChecklist={(idx) => store.toggleChecklistItem(idx)}
        onUpdateMinibar={(id, delta) => store.updateMinibarQuantity(id, delta)}
        onSetLinenAction={(action) => store.setLinenAction(action)}
        onNotesChange={() => {}}
        onComplete={handleCompleteCleaning}
        onClose={() => store.closeAttendantModal()}
        isLoading={store.getLoading()}
      />

      {/* Supervisor Inspection Review Modal */}
      <SupervisorInspectionModal
        room={store.getSelectedRoom()}
        isOpen={store.isInspectionModalActive()}
        notes={store.getInspectionNotes()}
        onNotesChange={(notes) => store.setInspectionNotes(notes)}
        onInspect={handleInspect}
        onClose={() => store.closeInspectionModal()}
        isLoading={store.getLoading()}
      />

      {/* Maintenance Work Order Escalation Modal */}
      <MaintenanceEscalationModal
        room={store.getSelectedRoom()}
        isOpen={store.isMaintenanceModalActive()}
        draft={store.getMaintenanceDraft()}
        onUpdateDraft={(patch) => store.updateMaintenanceDraft(patch)}
        onEscalate={handleEscalateMaintenance}
        onClose={() => store.closeMaintenanceModal()}
        isLoading={store.getLoading()}
      />
    </div>
  );
};
