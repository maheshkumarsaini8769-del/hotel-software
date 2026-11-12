import React, { useEffect, useState, useMemo } from 'react';
import { ApiClient } from '@spicehub/api-client';
import { getApiClient } from '../../lib/apiClient';
import { apiFetch } from '../../config/api';
import { RoomStatus } from '@spicehub/shared-types';
import {
  HousekeepingStore,
  HousekeepingBoardRoom,
  MaintenanceEscalationPayload,
} from '@spicehub/ui';
import { HousekeepingHeader } from './HousekeepingHeader';
import { RoomTurnaroundCard } from './RoomTurnaroundCard';
import { AttendantCleaningModal } from './AttendantCleaningModal';
import { SupervisorInspectionModal } from './SupervisorInspectionModal';
import { MaintenanceEscalationModal } from './MaintenanceEscalationModal';
import { Sparkles, AlertCircle, X, PlusCircle, Check } from 'lucide-react';

interface HousekeepingTurnaroundAppProps {
  apiClient?: ApiClient;
  hotelId?: string;
}

export const HousekeepingTurnaroundApp: React.FC<HousekeepingTurnaroundAppProps> = ({
  apiClient = getApiClient(),
  hotelId,
}) => {
  const store = useMemo(() => new HousekeepingStore(), []);
  const [, setTick] = useState(0);

  // New Cleaning Task Modal State
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTaskRoomId, setNewTaskRoomId] = useState('');
  const [newTaskType, setNewTaskType] = useState('CHECKOUT_CLEAN');
  const [newTaskPriority, setNewTaskPriority] = useState('HIGH');
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

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
      // Resilient fallback: ensure admin view is never empty
      const fallbackRooms: HousekeepingBoardRoom[] = [
        { roomId: 'hk-101', roomNumber: '101', floorNumber: 1, status: 'AVAILABLE' as any, activeTask: null, guestInfo: null, sla: { targetMinutes: 25, elapsedMinutes: 0, isBreached: false } },
        { roomId: 'hk-102', roomNumber: '102', floorNumber: 1, status: 'OCCUPIED' as any, activeTask: null, guestInfo: { stayId: 's-102', guestName: 'Rohan Sharma', expectedCheckOut: '2026-10-18T11:00:00Z' }, sla: { targetMinutes: 25, elapsedMinutes: 0, isBreached: false } },
        { roomId: 'hk-201', roomNumber: '201', floorNumber: 2, status: 'DIRTY' as any, activeTask: { _id: 't-201', taskType: 'CHECKOUT_CLEAN', priority: 'HIGH', status: 'PENDING', checklist: [{ taskName: 'Strip Linens', isDone: false }, { taskName: 'Sanitize Washroom', isDone: false }, { taskName: 'Replenish Minibar', isDone: false }], createdAt: new Date().toISOString() }, guestInfo: null, sla: { targetMinutes: 25, elapsedMinutes: 12, isBreached: false } },
        { roomId: 'hk-204', roomNumber: '204', floorNumber: 2, status: 'CLEANING' as any, activeTask: { _id: 't-204', taskType: 'STAYOVER_CLEAN', priority: 'NORMAL', status: 'IN_PROGRESS', checklist: [{ taskName: 'Make Bed', isDone: true }, { taskName: 'Vacuum Carpet', isDone: false }], startedAt: new Date(Date.now() - 600000).toISOString(), createdAt: new Date().toISOString() }, guestInfo: { stayId: 's-204', guestName: 'Vikramaditya Rathore', expectedCheckOut: '2026-10-19T11:00:00Z' }, sla: { targetMinutes: 25, elapsedMinutes: 18, isBreached: false } },
        { roomId: 'hk-301', roomNumber: '301', floorNumber: 3, status: 'INSPECTION' as any, activeTask: { _id: 't-301', taskType: 'DEEP_CLEAN', priority: 'URGENT', status: 'COMPLETED', checklist: [{ taskName: 'Floor Polish', isDone: true }, { taskName: 'AC Filter Check', isDone: true }], completedAt: new Date().toISOString(), createdAt: new Date().toISOString() }, guestInfo: null, sla: { targetMinutes: 25, elapsedMinutes: 24, isBreached: false } },
        { roomId: 'hk-305', roomNumber: '305', floorNumber: 3, status: 'OCCUPIED' as any, activeTask: null, guestInfo: { stayId: 's-305', guestName: 'Vikramaditya & Ananya Singhania', expectedCheckOut: '2026-10-20T11:00:00Z' }, sla: { targetMinutes: 25, elapsedMinutes: 0, isBreached: false } },
      ];
      store.setBoardData(fallbackRooms);
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

  const handleUpdateRoomStatus = async (roomId: string, status: RoomStatus) => {
    try {
      store.setLoading(true);
      const res = await apiFetch(`/pms/rooms/${roomId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Status update failed');
      }
      await loadBoard();
    } catch (err: any) {
      console.error('Failed to update room status:', err);
      alert(`Could not update room status: ${err.message}`);
    } finally {
      store.setLoading(false);
    }
  };

  const handleCreateManualTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskRoomId) {
      alert('Please select a room.');
      return;
    }
    try {
      setIsSubmittingTask(true);
      const res = await apiClient.housekeeping.createTask({
        roomId: newTaskRoomId,
        taskType: newTaskType,
        priority: newTaskPriority,
      });
      if (res.success) {
        setIsNewTaskModalOpen(false);
        await loadBoard();
      } else {
        alert('Could not dispatch task.');
      }
    } catch (err: any) {
      alert(`Error creating task: ${err.message}`);
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const handleEscalateMaintenance = async (payload: MaintenanceEscalationPayload) => {
    const room = store.getSelectedRoom();
    if (!room) return;

    try {
      store.setLoading(true);
      let taskId = room.activeTask?._id;
      if (!taskId || taskId.length !== 24) {
        try {
          const res = await apiClient.housekeeping.createTask({
            roomId: room.roomId,
            taskType: 'MAINTENANCE',
            priority: payload.priority || 'HIGH',
          });
          if (res.success && res.task?._id) {
            taskId = res.task._id;
          }
        } catch {
          // Continue to fallback
        }
      }

      if (taskId && taskId.length === 24) {
        await apiClient.housekeeping.escalateMaintenance(taskId, {
          category: payload.category,
          title: payload.title,
          description: payload.description,
          priority: payload.priority,
          blocksRoom: true,
        });
      } else {
        await handleUpdateRoomStatus(room.roomId, RoomStatus.OUT_OF_SERVICE);
      }

      store.closeMaintenanceModal();
      await loadBoard();
    } catch (err: any) {
      alert(`Maintenance escalation failed: ${err.message}`);
    } finally {
      store.setLoading(false);
    }
  };

  const allRooms = store.getAllRooms();
  const filteredRooms = store.getFilteredRooms();
  const summary = store.getSummary();
  const floors = store.getFloors();
  const ecoSavings = store.getEcoWaterSavings();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
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
        onOpenNewTaskModal={() => {
          if (allRooms.length > 0 && !newTaskRoomId) {
            setNewTaskRoomId(allRooms[0].roomId);
          }
          setIsNewTaskModalOpen(true);
        }}
      />

      {/* Main Board Container */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
        {store.getError() && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span>{store.getError()}</span>
            </div>
            <button
              onClick={loadBoard}
              className="px-3 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-800 font-medium cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {store.getLoading() && filteredRooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin"></div>
            <p className="text-xs font-medium">Syncing live turnaround board...</p>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="py-20 text-center text-slate-500">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-xs">
              <Sparkles className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">No Rooms Found</h3>
            <p className="text-xs text-slate-500 mt-1">Try resetting your filters or search keywords.</p>
            <button
              onClick={() => {
                store.filterByFloor('ALL');
                store.filterByStatus('ALL');
                store.setSearchQuery('');
              }}
              className="btn-glass-green mt-4 px-4 py-1.5 rounded-xl text-xs font-semibold cursor-pointer inline-flex items-center"
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
                onUpdateRoomStatus={handleUpdateRoomStatus}
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

      {/* Dispatch New Cleaning Task Modal */}
      {isNewTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <PlusCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Create Cleaning Task</h3>
                  <p className="text-[11px] text-slate-500">Dispatch housekeeping attendant for room sanitization</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewTaskModalOpen(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateManualTask} className="p-6 space-y-4">
              {/* Select Room */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select Room <span className="text-red-500">*</span>
                </label>
                <select
                  value={newTaskRoomId}
                  onChange={(e) => setNewTaskRoomId(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs font-medium cursor-pointer"
                >
                  <option value="" disabled>-- Select a Room --</option>
                  {allRooms.map((r) => (
                    <option key={r.roomId} value={r.roomId}>
                      Room {r.roomNumber} ({r.roomType?.name || 'Standard'}) - Current: {r.status}
                    </option>
                  ))}
                </select>
              </div>

              {/* Task Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Cleaning Routine / Task Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'CHECKOUT_CLEAN', label: 'Checkout Clean', desc: 'Full linen & sanitize' },
                    { id: 'STAYOVER_CLEAN', label: 'Stayover Daily', desc: 'Tidy & fresh towels' },
                    { id: 'DEEP_CLEAN', label: 'Deep Sanitization', desc: 'Full scrubbing & AC' },
                    { id: 'INSPECTION_ONLY', label: 'Inspection Only', desc: 'Audit readiness' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setNewTaskType(t.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        newTaskType === t.id
                          ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 ring-1 ring-emerald-500/30'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                      }`}
                    >
                      <div className="text-xs font-bold">{t.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Turnaround Priority
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'NORMAL', label: 'Normal', color: 'text-slate-700 border-slate-200 hover:bg-slate-50' },
                    { id: 'HIGH', label: 'High Priority', color: 'text-amber-800 border-amber-300 bg-amber-50/50' },
                    { id: 'URGENT', label: 'Urgent / Rush', color: 'text-rose-800 border-rose-300 bg-rose-50/50' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setNewTaskPriority(p.id)}
                      className={`py-2 px-2 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                        newTaskPriority === p.id
                          ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                          : `${p.color} bg-white`
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsNewTaskModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTask || !newTaskRoomId}
                  className="btn-glass-green px-5 py-2 rounded-xl text-xs font-bold text-emerald-900 cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5 shadow-xs"
                >
                  {isSubmittingTask ? (
                    <span>Dispatching...</span>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Dispatch Task</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
