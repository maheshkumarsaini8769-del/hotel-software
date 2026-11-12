import React, { useState } from 'react';
import { HousekeepingBoardRoom, HousekeepingHelper } from '@spicehub/ui';
import { RoomStatus } from '@spicehub/shared-types';
import {
  User,
  Wrench,
  CheckCircle2,
  Clock,
  Brush,
  AlertTriangle,
  AlertOctagon,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

interface RoomTurnaroundCardProps {
  room: HousekeepingBoardRoom;
  onStartCleaning: (taskId: string, room: HousekeepingBoardRoom) => void;
  onOpenCleaningModal: (room: HousekeepingBoardRoom) => void;
  onOpenInspectionModal: (room: HousekeepingBoardRoom) => void;
  onOpenMaintenanceModal: (room: HousekeepingBoardRoom) => void;
  onCreateTask: (roomId: string) => void;
  onUpdateRoomStatus?: (roomId: string, status: RoomStatus) => void;
  isLoading?: boolean;
}

export const RoomTurnaroundCard: React.FC<RoomTurnaroundCardProps> = ({
  room,
  onStartCleaning,
  onOpenCleaningModal,
  onOpenInspectionModal,
  onOpenMaintenanceModal,
  onCreateTask,
  onUpdateRoomStatus,
  isLoading = false,
}) => {
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const slaInfo = HousekeepingHelper.calculateSlaStatus(room.sla?.elapsedMinutes || 0, room.sla?.targetMinutes || 25);
  const turnaround = HousekeepingHelper.getTurnaroundProgress(room.status);

  // Status Styling helper
  const getStatusBadge = () => {
    switch (room.status) {
      case RoomStatus.AVAILABLE:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Ready Clean
            <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />
          </span>
        );
      case RoomStatus.DIRTY:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Dirty
            <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />
          </span>
        );
      case RoomStatus.CLEANING:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Brush className="w-3 h-3 text-blue-600" />
            Cleaning
            <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />
          </span>
        );
      case RoomStatus.INSPECTION:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
            <AlertTriangle className="w-3 h-3 text-sky-600" />
            Inspection
            <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />
          </span>
        );
      case RoomStatus.OCCUPIED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <User className="w-3 h-3 text-purple-600" />
            Occupied
            <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />
          </span>
        );
      case RoomStatus.OUT_OF_SERVICE:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertOctagon className="w-3 h-3 text-rose-600" />
            Out of Order
            <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {room.status}
            <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />
          </span>
        );
    }
  };

  const handleStatusChange = (newStatus: RoomStatus) => {
    setIsStatusMenuOpen(false);
    if (onUpdateRoomStatus) {
      onUpdateRoomStatus(room.roomId, newStatus);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 hover:shadow-md hover:border-slate-300 group shadow-xs relative">
      {/* Top Row: Room number, Room Type, Status */}
      <div>
        <div className="flex items-start justify-between relative">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">
                {room.roomNumber}
              </span>
              <span className="text-[11px] font-semibold text-slate-500">Floor {room.floorNumber}</span>
            </div>
            <div className="text-xs text-blue-600 font-bold mt-0.5">
              {room.roomType?.name || 'Deluxe Room'}
            </div>
          </div>

          {/* Interactive Status Dropdown Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
              className="cursor-pointer focus:outline-none transition active:scale-95"
              title="Click to quickly change room status"
            >
              {getStatusBadge()}
            </button>

            {isStatusMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsStatusMenuOpen(false)}
                ></div>
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1.5 text-xs animate-in fade-in zoom-in-95 space-y-0.5">
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Change Status To:
                  </div>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(RoomStatus.AVAILABLE)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 text-emerald-800 font-semibold flex items-center gap-2 cursor-pointer transition"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Ready / Clean</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(RoomStatus.DIRTY)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-amber-50 text-amber-800 font-semibold flex items-center gap-2 cursor-pointer transition"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Dirty (Needs Cleaning)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(RoomStatus.CLEANING)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-blue-50 text-blue-800 font-semibold flex items-center gap-2 cursor-pointer transition"
                  >
                    <Brush className="w-3.5 h-3.5 text-blue-600" />
                    <span>In Cleaning</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(RoomStatus.INSPECTION)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-sky-50 text-sky-800 font-semibold flex items-center gap-2 cursor-pointer transition"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-sky-600" />
                    <span>Awaiting Inspection</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(RoomStatus.OUT_OF_SERVICE)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-50 text-rose-800 font-semibold flex items-center gap-2 cursor-pointer transition"
                  >
                    <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                    <span>Out of Order (Maintenance)</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Guest Occupancy Note */}
        {room.guestInfo ? (
          <div className="mt-3 p-2 rounded-xl bg-purple-50/60 border border-purple-200/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 truncate">
              <User className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span className="text-purple-950 font-bold truncate">{room.guestInfo.guestName}</span>
            </div>
            <span className="text-[10px] text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-md font-bold shrink-0">
              In-House Guest
            </span>
          </div>
        ) : (
          <div className="mt-3 p-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center text-[11px] text-slate-500 font-medium">
            <span>Vacant / Turnaround</span>
          </div>
        )}

        {/* SLA & Attendant Tracker */}
        {(room.status === RoomStatus.DIRTY || room.status === RoomStatus.CLEANING) && (
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 ${slaInfo.badgeClass}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${slaInfo.dotColor}`}></span>
              <span>{slaInfo.label}</span>
            </div>

            {room.activeTask?.assignedAttendantId ? (
              <span className="text-[11px] text-slate-600 truncate flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-800">{room.activeTask.assignedAttendantId.name}</span>
              </span>
            ) : (
              <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 font-medium">
                Unassigned Attendant
              </span>
            )}
          </div>
        )}

        {/* Turnaround Progress Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
            <span>Turnaround Cycle</span>
            <span className="font-bold text-slate-700">{turnaround.percentage}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                room.status === RoomStatus.AVAILABLE
                  ? 'bg-emerald-500'
                  : room.status === RoomStatus.INSPECTION
                  ? 'bg-sky-500'
                  : room.status === RoomStatus.CLEANING
                  ? 'bg-blue-500'
                  : room.status === RoomStatus.OUT_OF_SERVICE
                  ? 'bg-rose-500'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${turnaround.percentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Action Buttons Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onOpenMaintenanceModal(room)}
          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition border border-slate-200/60 hover:border-rose-200 text-xs cursor-pointer active:scale-95 shrink-0"
          title="Escalate Maintenance / Work Order"
        >
          <Wrench className="w-3.5 h-3.5" />
        </button>

        {/* STATE-DEPENDENT ACTION BUTTONS */}

        {/* 1. If AVAILABLE: Allow marking dirty or requesting deep clean */}
        {room.status === RoomStatus.AVAILABLE && (
          <button
            type="button"
            onClick={() => {
              if (onUpdateRoomStatus) {
                onUpdateRoomStatus(room.roomId, RoomStatus.DIRTY);
              } else {
                onCreateTask(room.roomId);
              }
            }}
            disabled={isLoading}
            className="flex-1 py-1.5 px-3 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-800 border border-amber-200/80 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Brush className="w-3.5 h-3.5 text-amber-600" />
            <span>Mark Dirty / Clean</span>
          </button>
        )}

        {/* 2. If OCCUPIED: Allow requesting stayover clean */}
        {room.status === RoomStatus.OCCUPIED && (
          <button
            type="button"
            onClick={() => onCreateTask(room.roomId)}
            disabled={isLoading}
            className="flex-1 py-1.5 px-3 bg-purple-50 hover:bg-purple-100 active:bg-purple-200 text-purple-800 border border-purple-200/80 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Stayover Daily Clean</span>
          </button>
        )}

        {/* 3. If DIRTY: Start Cleaning */}
        {room.status === RoomStatus.DIRTY && (
          <button
            type="button"
            onClick={() => {
              if (room.activeTask) {
                onStartCleaning(room.activeTask._id, room);
              } else {
                onCreateTask(room.roomId);
              }
            }}
            disabled={isLoading}
            className="flex-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Brush className="w-3.5 h-3.5" />
            <span>{room.activeTask ? 'Start Cleaning' : 'Create Task & Start'}</span>
          </button>
        )}

        {/* 4. If CLEANING: Audit & Complete */}
        {room.status === RoomStatus.CLEANING && (
          <button
            type="button"
            onClick={() => onOpenCleaningModal(room)}
            disabled={isLoading}
            className="flex-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Audit & Complete</span>
          </button>
        )}

        {/* 5. If INSPECTION: Supervisor Inspection */}
        {room.status === RoomStatus.INSPECTION && (
          <button
            type="button"
            onClick={() => onOpenInspectionModal(room)}
            disabled={isLoading}
            className="flex-1 py-1.5 px-3 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Inspect Room</span>
          </button>
        )}

        {/* 6. If OUT_OF_SERVICE: Mark Resolved & Ready */}
        {room.status === RoomStatus.OUT_OF_SERVICE && (
          <button
            type="button"
            onClick={() => {
              if (onUpdateRoomStatus) {
                onUpdateRoomStatus(room.roomId, RoomStatus.AVAILABLE);
              }
            }}
            disabled={isLoading}
            className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Mark Ready / Clean</span>
          </button>
        )}
      </div>
    </div>
  );
};
