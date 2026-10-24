import React, { useState } from 'react';
import {
  IGroupBookingUI,
  IBulkCheckInPayload,
} from '@spicehub/ui';

interface AvailableRoomOption {
  _id: string;
  roomNumber: string;
  floor: number;
  roomTypeId: string;
  status: string;
}

interface BulkCheckInModalProps {
  group: IGroupBookingUI;
  availableRooms: AvailableRoomOption[];
  onClose: () => void;
  onSubmit: (payload: IBulkCheckInPayload) => Promise<void>;
  loading: boolean;
}

export const BulkCheckInModal: React.FC<BulkCheckInModalProps> = ({
  group,
  availableRooms,
  onClose,
  onSubmit,
  loading,
}) => {
  // Filter pending rooms in the group
  const pendingRooms = group.rooms.filter((r) => r.status === 'CONFIRMED');

  // Allocation mapping: roomEntryId -> physicalRoomId
  const [allocations, setAllocations] = useState<{ [key: string]: string }>({});

  const handleRoomSelect = (roomEntryId: string, physicalRoomId: string) => {
    setAllocations({
      ...allocations,
      [roomEntryId]: physicalRoomId,
    });
  };

  const isComplete =
    pendingRooms.length > 0 &&
    pendingRooms.every((r) => r._id && allocations[r._id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isComplete) {
      alert('Please assign an available physical room for all pending guests.');
      return;
    }

    const payload: IBulkCheckInPayload = {
      allocations: pendingRooms.map((r) => ({
        roomEntryId: r._id as string,
        physicalRoomId: allocations[r._id as string],
      })),
    };

    await onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#121721] border border-amber-500/30 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-xs text-zinc-300">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-[#0b0e14]">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-amber-400 font-bold">{group.groupBookingCode}</span>
              <span className="text-zinc-500">|</span>
              <h2 className="text-lg font-bold text-white">Bulk Group Check-In</h2>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Assign clean physical rooms and generate individual stay records for all group members.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 text-lg"
          >
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div className="bg-[#0b0e14] p-3.5 rounded-xl border border-zinc-800 flex items-center justify-between">
            <div>
              <div className="font-bold text-zinc-200">{group.groupName}</div>
              <div className="text-zinc-400 text-[11px]">
                {group.companyName ? `${group.companyName} • ` : ''}Organizer: {group.organizerName} ({group.organizerPhone})
              </div>
            </div>
            <div className="text-right">
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold">
                {pendingRooms.length} Rooms to Check In
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {pendingRooms.map((room, idx) => {
              const assignedPhysical = room._id ? allocations[room._id] : '';
              return (
                <div
                  key={room._id || idx}
                  className="bg-[#0b0e14] p-4 rounded-xl border border-zinc-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white text-sm">
                        {room.primaryGuestName}
                      </span>
                      <span className="text-zinc-500 text-xs ml-2 font-mono">
                        ({room.primaryGuestPhone})
                      </span>
                    </div>
                    <span className="text-amber-400/90 font-bold text-xs">
                      ₹{room.tariffPerNight.toLocaleString('en-IN')}/night
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] text-zinc-400 font-medium mb-1">
                      Assign Available Physical Room *
                    </label>
                    <select
                      required
                      value={assignedPhysical}
                      onChange={(e) => room._id && handleRoomSelect(room._id, e.target.value)}
                      className="w-full bg-[#121721] border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500 font-medium"
                    >
                      <option value="">-- Select Clean Available Room --</option>
                      {availableRooms.map((ar) => (
                        <option key={ar._id} value={ar._id}>
                          Room {ar.roomNumber} (Floor {ar.floor}) - {ar.status}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>

          {availableRooms.length === 0 && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs">
              ⚠️ Warning: No clean available rooms found in system. Please release or inspect rooms in Housekeeping before check-in.
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-xs transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !isComplete}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <span className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />}
              <span>Confirm 1-Click Check-In ({pendingRooms.length} Rooms)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
