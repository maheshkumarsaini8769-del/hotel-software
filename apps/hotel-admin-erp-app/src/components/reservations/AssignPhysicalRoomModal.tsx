import React, { useState } from 'react';
import { RoomArrivalBookingDTO, CleanRoomOption } from '@spicehub/ui';
import { Key, AlertTriangle, X } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
        {/* Header */}
        <div className="p-4 px-6 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Assign Physical Room</h3>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                  Front Desk
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {booking.guestName} • {booking.roomTypeId?.name || 'Category'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-slate-700">
          <p className="text-xs text-slate-500">
            Select an inspected, clean physical room ready for check-in:
          </p>

          {cleanRooms.length === 0 ? (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center text-xs text-amber-800 flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>No clean available rooms in inventory. Housekeeping turnaround in progress.</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
              {cleanRooms.map((room) => {
                const isSelected = selectedRoomId === room._id;
                return (
                  <div
                    key={room._id}
                    onClick={() => setSelectedRoomId(room._id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between shadow-2xs ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-slate-900">Room {room.roomNumber}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500" title="Ready & Clean"></span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">Floor {room.floorNumber}</div>
                    <div className="text-[10px] text-emerald-700 font-semibold truncate mt-0.5">
                      {room.roomTypeId?.name || 'Standard'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || !selectedRoomId}
            className="btn-glass-green px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
          >
            {isLoading ? 'Allocating...' : 'Confirm Room Allocation'}
          </button>
        </div>
      </div>
    </div>
  );
};
