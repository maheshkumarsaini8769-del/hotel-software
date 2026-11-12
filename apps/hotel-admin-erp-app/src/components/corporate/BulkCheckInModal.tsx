import React, { useState } from 'react';
import {
  IGroupBookingUI,
  IBulkCheckInPayload,
} from '@spicehub/ui';
import { AlertTriangle, UserCheck } from 'lucide-react';

interface AvailableRoomOption {
  _id: string;
  roomNumber: string;
  floor: number;
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
  // Map of roomEntryId -> physicalRoomId
  const [allocations, setAllocations] = useState<Record<string, string>>({});

  const pendingRooms = group.rooms.filter((r) => r.status === 'CONFIRMED' || (r.status as string) === 'BLOCKED');

  const handleRoomSelect = (roomEntryId: string, physicalRoomId: string) => {
    setAllocations((prev) => ({
      ...prev,
      [roomEntryId]: physicalRoomId,
    }));
  };

  const isComplete =
    pendingRooms.length > 0 &&
    pendingRooms.every((r) => r._id && allocations[r._id] && allocations[r._id] !== '');

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden text-xs text-slate-700">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-emerald-700 font-bold">{group.groupBookingCode}</span>
              <span className="text-slate-300">|</span>
              <h2 className="text-base font-bold text-slate-900">Bulk Group Check-In</h2>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Assign clean physical rooms and generate individual stay records for all group members.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-900">{group.groupName}</div>
              <div className="text-slate-500 text-[11px]">
                {group.companyName ? `${group.companyName} • ` : ''}Organizer: {group.organizerName} ({group.organizerPhone})
              </div>
            </div>
            <div className="text-right">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
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
                  className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 text-sm">
                        {room.primaryGuestName}
                      </span>
                      <span className="text-slate-500 text-xs ml-2 font-mono">
                        ({room.primaryGuestPhone})
                      </span>
                    </div>
                    <span className="text-emerald-700 font-bold text-xs font-mono">
                      ₹{room.tariffPerNight.toLocaleString('en-IN')}/night
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-600 font-medium mb-1">
                      Assign Available Physical Room *
                    </label>
                    <select
                      required
                      value={assignedPhysical}
                      onChange={(e) => room._id && handleRoomSelect(room._id, e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 font-medium cursor-pointer"
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
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>No clean available rooms found in system. Please release or inspect rooms in Housekeeping before check-in.</span>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-medium text-xs transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !isComplete}
              className="btn-glass-green px-6 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <UserCheck className="w-4 h-4" />
              )}
              <span>Confirm 1-Click Check-In ({pendingRooms.length} Rooms)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
