import React, { useState } from 'react';
import { RoomArrivalBookingDTO, CleanRoomOption } from '@spicehub/ui';

interface AssignPhysicalRoomModalProps {
  booking: RoomArrivalBookingDTO | null;
  isOpen: boolean;
  cleanRooms: CleanRoomOption[];
  onAssign: (bookingId: string, roomId: string) => void;
  onClose: () => void;
  isLoading: boolean;
}

export const AssignPhysicalRoomModal: React.FC<AssignPhysicalRoomModalProps> = ({
  booking,
  isOpen,
  cleanRooms,
  onAssign,
  onClose,
  isLoading,
}) => {
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');

  if (!isOpen || !booking) return null;

  const handleConfirm = () => {
    if (!selectedRoomId) return;
    onAssign(booking._id, selectedRoomId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-950 border border-amber-500/30 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 px-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-lg text-amber-400">
              🔑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Assign Physical Room</h3>
                <span className="text-[10px] bg-amber-950/60 text-amber-300 border border-amber-800/60 px-2 py-0.5 rounded-full font-semibold">
                  Front Desk
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {booking.guestName} • {booking.roomTypeId?.name || 'Category'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-slate-200">
          <p className="text-xs text-slate-400">
            Select an inspected, clean physical room ready for check-in:
          </p>

          {cleanRooms.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400">
              ⚠️ No clean available rooms in inventory. Housekeeping turnaround in progress.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
              {cleanRooms.map((room) => {
                const isSelected = selectedRoomId === room._id;
                return (
                  <div
                    key={room._id}
                    onClick={() => setSelectedRoomId(room._id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500 text-amber-200 shadow-md shadow-amber-500/10'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-white">Room {room.roomNumber}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400" title="Ready & Clean"></span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Floor {room.floorNumber}</div>
                    <div className="text-[10px] text-amber-400/80 truncate mt-0.5">
                      {room.roomTypeId?.name || 'Standard'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 bg-slate-900/90 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || !selectedRoomId}
            className="px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 transition-all shadow-md shadow-amber-950/40 cursor-pointer disabled:opacity-50 active:scale-95"
          >
            {isLoading ? 'Allocating...' : 'Confirm Room Allocation'}
          </button>
        </div>
      </div>
    </div>
  );
};
