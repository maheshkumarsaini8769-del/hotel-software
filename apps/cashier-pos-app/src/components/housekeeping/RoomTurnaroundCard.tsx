import React from 'react';
import { HousekeepingBoardRoom, HousekeepingHelper } from '@spicehub/ui';
import { RoomStatus } from '@spicehub/shared-types';

interface RoomTurnaroundCardProps {
  room: HousekeepingBoardRoom;
  onStartCleaning: (taskId: string, room: HousekeepingBoardRoom) => void;
  onOpenCleaningModal: (room: HousekeepingBoardRoom) => void;
  onOpenInspectionModal: (room: HousekeepingBoardRoom) => void;
  onOpenMaintenanceModal: (room: HousekeepingBoardRoom) => void;
  onCreateTask: (roomId: string) => void;
  isLoading?: boolean;
}

export const RoomTurnaroundCard: React.FC<RoomTurnaroundCardProps> = ({
  room,
  onStartCleaning,
  onOpenCleaningModal,
  onOpenInspectionModal,
  onOpenMaintenanceModal,
  onCreateTask,
  isLoading = false,
}) => {
  const slaInfo = HousekeepingHelper.calculateSlaStatus(room.sla.elapsedMinutes, room.sla.targetMinutes);
  const turnaround = HousekeepingHelper.getTurnaroundProgress(room.status);

  // Status Styling helper
  const getStatusBadge = () => {
    switch (room.status) {
      case RoomStatus.AVAILABLE:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Ready / Available
          </span>
        );
      case RoomStatus.DIRTY:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
            Dirty
          </span>
        );
      case RoomStatus.CLEANING:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
            Cleaning
          </span>
        );
      case RoomStatus.INSPECTION:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            Inspection
          </span>
        );
      case RoomStatus.OUT_OF_SERVICE:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            Out of Order
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            {room.status}
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800/90 hover:border-amber-500/40 rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:shadow-black/50 group backdrop-blur-sm">
      {/* Top Row: Room number, Room Type, Status */}
      <div>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-extrabold text-white tracking-tight group-hover:text-amber-400 transition-colors">
                {room.roomNumber}
              </span>
              <span className="text-[11px] font-medium text-slate-500">Floor {room.floorNumber}</span>
            </div>
            <div className="text-xs text-amber-500/90 font-medium mt-0.5">
              {room.roomType?.name || 'Standard Luxury Room'}
            </div>
          </div>
          <div>{getStatusBadge()}</div>
        </div>

        {/* Guest Occupancy Note */}
        {room.guestInfo ? (
          <div className="mt-3 p-2 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-slate-400">👤</span>
              <span className="text-slate-200 font-medium truncate">{room.guestInfo.guestName}</span>
            </div>
            <span className="text-[10px] text-amber-400/80 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-900/50 flex-shrink-0">
              In-House
            </span>
          </div>
        ) : (
          <div className="mt-3 p-2 rounded-xl bg-slate-950/30 border border-slate-900 flex items-center text-[11px] text-slate-500">
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
              <span className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                <span>🧹</span>
                <span className="text-slate-300 font-medium">{room.activeTask.assignedAttendantId.name}</span>
              </span>
            ) : (
              <span className="text-[10px] text-amber-400/80 bg-amber-950/30 px-1.5 py-0.5 rounded border border-amber-800/40">
                Unassigned
              </span>
            )}
          </div>
        )}

        {/* Turnaround Progress Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
            <span>Turnaround Cycle</span>
            <span className="font-semibold text-slate-300">{turnaround.percentage}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                room.status === RoomStatus.AVAILABLE
                  ? 'bg-emerald-400'
                  : room.status === RoomStatus.INSPECTION
                  ? 'bg-amber-400'
                  : room.status === RoomStatus.CLEANING
                  ? 'bg-cyan-400'
                  : room.status === RoomStatus.OUT_OF_SERVICE
                  ? 'bg-rose-500'
                  : 'bg-orange-500'
              }`}
              style={{ width: `${turnaround.percentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Action Buttons Footer */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
        <button
          onClick={() => onOpenMaintenanceModal(room)}
          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors border border-transparent hover:border-rose-900/40 text-xs cursor-pointer active:scale-95"
          title="Escalate Maintenance Work Order"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        {/* State-dependent Primary Action Button */}
        {room.status === RoomStatus.DIRTY && (
          <button
            onClick={() => {
              if (room.activeTask) {
                onStartCleaning(room.activeTask._id, room);
              } else {
                onCreateTask(room.roomId);
              }
            }}
            disabled={isLoading}
            className="flex-1 py-1.5 px-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-semibold text-xs transition-all shadow-md shadow-orange-950/50 active:scale-95 disabled:opacity-50 cursor-pointer text-center"
          >
            {room.activeTask ? 'Start Cleaning' : 'Create Task & Start'}
          </button>
        )}

        {room.status === RoomStatus.CLEANING && (
          <button
            onClick={() => onOpenCleaningModal(room)}
            disabled={isLoading}
            className="flex-1 py-1.5 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs transition-all shadow-md shadow-cyan-950/50 active:scale-95 disabled:opacity-50 cursor-pointer text-center"
          >
            Audit & Complete
          </button>
        )}

        {room.status === RoomStatus.INSPECTION && (
          <button
            onClick={() => onOpenInspectionModal(room)}
            disabled={isLoading}
            className="flex-1 py-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-950/50 hover:brightness-110 active:scale-95 disabled:opacity-50 cursor-pointer text-center"
          >
            Inspect Room
          </button>
        )}

        {room.status === RoomStatus.AVAILABLE && (
          <div className="flex-1 text-center py-1 text-xs text-emerald-400 font-medium">
            ✓ Ready for Guest
          </div>
        )}

        {room.status === RoomStatus.OUT_OF_SERVICE && (
          <div className="flex-1 text-center py-1 text-xs text-rose-400 font-medium">
            ⚠️ Maintenance Ticket Active
          </div>
        )}
      </div>
    </div>
  );
};
