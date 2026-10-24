import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Layers,
  Bed,
  CheckCircle2,
  AlertCircle,
  Search,
  ArrowRight,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { getApiClient } from '../lib/apiClient';

interface RoomAllocationViewProps {
  isDark?: boolean;
  onToast?: (msg: string) => void;
}

interface UnassignedBooking {
  id: string;
  guestName: string;
  roomType: string;
  roomTypeId?: string;
  checkIn: string;
  checkOut: string;
  pax: number;
  phone: string;
}

interface RoomItem {
  roomId: string;
  roomTypeId?: string;
  number: string;
  floor: string;
  type: string;
  status: 'Available Clean' | 'Occupied' | 'Dirty' | 'Inspected' | 'Maintenance';
  allocatedTo: string | null;
}

interface BoardRoom {
  roomId: string;
  roomNumber: string;
  floorNumber?: number;
  roomType?: { _id?: string; name?: string; code?: string };
  status: string;
  guestInfo?: { guestName?: string } | null;
}

interface ArrivalBooking {
  _id: string;
  bookingNumber: string;
  guestName?: string;
  guestPhone?: string;
  roomTypeId?: string | { _id?: string; name?: string };
  checkInDate?: string;
  checkOutDate?: string;
  guestCountAdults?: number;
  guestCountChildren?: number;
  allocatedRoomId?: string | null;
  bookingStatus?: string;
}

function roomState(status: string): RoomItem['status'] {
  if (status === 'AVAILABLE') return 'Available Clean';
  if (status === 'OCCUPIED') return 'Occupied';
  if (status === 'INSPECTION') return 'Inspected';
  if (status === 'OUT_OF_SERVICE') return 'Maintenance';
  return 'Dirty';
}

function formatDate(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const RoomAllocationView: React.FC<RoomAllocationViewProps> = ({ isDark = true, onToast }) => {
  const [selectedFloor, setSelectedFloor] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);
  const [unassignedBookings, setUnassignedBookings] = useState<UnassignedBooking[]>([]);
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigningRoom, setAssigningRoom] = useState<string | null>(null);

  const loadAllocation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const client = getApiClient();
      const [arrivals, housekeeping] = await Promise.all([
        client.request<{ success: boolean; bookings: ArrivalBooking[] }>(
          'GET',
          '/api/v1/pms/bookings/arrivals-board'
        ),
        client.request<{ success: boolean; board: BoardRoom[] }>(
          'GET',
          '/api/v1/housekeeping/board'
        ),
      ]);

      const pending = (arrivals.bookings || []).filter(
        (booking) =>
          !booking.allocatedRoomId &&
          booking.bookingStatus === 'CONFIRMED'
      );
      setUnassignedBookings(
        pending.map((booking) => {
          const type =
            typeof booking.roomTypeId === 'string'
              ? undefined
              : booking.roomTypeId;
          return {
            id: booking._id,
            guestName: booking.guestName || 'Registered Guest',
            roomType: type?.name || 'Assigned category',
            roomTypeId:
              typeof booking.roomTypeId === 'string'
                ? booking.roomTypeId
                : booking.roomTypeId?._id,
            checkIn: formatDate(booking.checkInDate),
            checkOut: formatDate(booking.checkOutDate),
            pax: Number(booking.guestCountAdults || 0) + Number(booking.guestCountChildren || 0),
            phone: booking.guestPhone || '',
          };
        })
      );

      setRooms(
        (housekeeping.board || []).map((room) => ({
          roomId: room.roomId,
          roomTypeId: room.roomType?._id,
          number: room.roomNumber,
          floor: room.floorNumber ? `Floor ${room.floorNumber}` : 'Unassigned floor',
          type: room.roomType?.name || room.roomType?.code || 'Room',
          status: roomState(room.status),
          allocatedTo: room.guestInfo?.guestName || null,
        }))
      );
    } catch (err: any) {
      setUnassignedBookings([]);
      setRooms([]);
      setError(err?.message || 'Room allocation data could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAllocation();
  }, [loadAllocation]);

  const floors = useMemo(
    () => ['All', ...Array.from(new Set(rooms.map((room) => room.floor)))],
    [rooms]
  );

  const selectedBookingDetails = unassignedBookings.find((b) => b.id === selectedBooking);

  const handleAllocate = async (room: RoomItem) => {
    const booking = selectedBookingDetails;
    if (!booking) {
      if (onToast) onToast('Select a pending reservation before assigning a room.');
      return;
    }
    if (room.status !== 'Available Clean') {
      if (onToast) onToast(`Room ${room.number} is not clean and available.`);
      return;
    }
    if (booking.roomTypeId && room.roomTypeId && booking.roomTypeId !== room.roomTypeId) {
      if (onToast) onToast(`Room ${room.number} does not match the booked room category.`);
      return;
    }

    setAssigningRoom(room.number);
    try {
      await getApiClient().request(
        'PATCH',
        `/api/v1/pms/bookings/${booking.id}/assign-room`,
        { roomId: room.roomId }
      );
      if (onToast) onToast(`Room ${room.number} allocated to ${booking.guestName}.`);
      setSelectedBooking(null);
      await loadAllocation();
    } catch (err: any) {
      if (onToast) onToast(err?.message || `Room ${room.number} could not be allocated.`);
    } finally {
      setAssigningRoom(null);
    }
  };

  const filteredRooms = rooms.filter((r) => {
    if (selectedFloor !== 'All' && r.floor !== selectedFloor) return false;
    if (
      searchQuery &&
      !r.number.includes(searchQuery) &&
      !r.type.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-8">
      <div
        className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          isDark ? 'bg-[#141620] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div>
          <h2
            className={`text-lg font-black tracking-tight flex items-center gap-2 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            <Layers className="w-5 h-5 text-blue-500" />
            <span>Room Allocation & Assignment Studio</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Assign live confirmed reservations to clean, type-matched rooms.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex p-0.5 rounded-xl border text-xs font-bold border-slate-800 bg-slate-900 overflow-x-auto">
            {floors.map((floor) => (
              <button
                key={floor}
                onClick={() => setSelectedFloor(floor)}
                className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                  selectedFloor === floor ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {floor}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl border text-xs bg-slate-900 border-slate-800 text-white focus:outline-none"
            />
          </div>
          <button
            onClick={() => void loadAllocation()}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 hover:text-white disabled:opacity-50"
            title="Refresh allocation data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </span>
          <button onClick={() => void loadAllocation()} className="font-bold underline">
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-12 gap-4">
        <div
          className={`col-span-12 lg:col-span-5 p-4 rounded-2xl border space-y-3 ${
            isDark ? 'bg-[#141620] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <h3
              className={`font-black text-xs flex items-center gap-2 ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Pending Room Allocations ({unassignedBookings.length})</span>
            </h3>
            <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
              Needs Room
            </span>
          </div>

          <div className="space-y-2">
            {loading && unassignedBookings.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                Loading live reservations…
              </div>
            ) : unassignedBookings.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                No confirmed reservations are waiting for a room.
              </div>
            ) : (
              unassignedBookings.map((b) => {
                const isSelected = selectedBooking === b.id;
                return (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBooking(b.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      isSelected
                        ? 'border-blue-500 bg-blue-950/40 ring-1 ring-blue-500'
                        : isDark
                          ? 'border-slate-800 bg-[#191c2b] hover:border-slate-700'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">{b.guestName}</span>
                      <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/20">
                        {b.id.slice(-6)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 flex-wrap">
                      <span>
                        Category: <strong className="text-white">{b.roomType}</strong>
                      </span>
                      <span>•</span>
                      <span>Pax: {b.pax || '—'}</span>
                      <span>•</span>
                      <span>{b.checkIn}</span>
                    </div>
                    {isSelected && (
                      <div className="mt-2 text-[10px] text-blue-300 bg-blue-900/30 px-2 py-1 rounded flex items-center gap-1 font-semibold">
                        <span>👉 Click an available room on the right to assign</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div
          className={`col-span-12 lg:col-span-7 p-4 rounded-2xl border space-y-3 ${
            isDark ? 'bg-[#141620] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <h3
              className={`font-black text-xs flex items-center gap-2 ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              <Bed className="w-4 h-4 text-emerald-500" />
              <span>Available & In-Use Rooms</span>
            </h3>
            <span className="text-[10px] text-slate-400">
              {rooms.filter((r) => r.status === 'Available Clean').length} Clean & Ready
            </span>
          </div>

          {filteredRooms.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400">
              No rooms match this filter.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {filteredRooms.map((room) => {
                const isAvailable = room.status === 'Available Clean';
                const typeMismatch =
                  !!selectedBookingDetails?.roomTypeId &&
                  !!room.roomTypeId &&
                  selectedBookingDetails.roomTypeId !== room.roomTypeId;
                return (
                  <div
                    key={room.roomId}
                    className={`p-3 rounded-xl border flex flex-col justify-between ${
                      isAvailable
                        ? isDark
                          ? 'bg-[#191c2b] border-emerald-900/40 hover:border-emerald-500/60'
                          : 'bg-emerald-50/50 border-emerald-200'
                        : isDark
                          ? 'bg-[#111218] border-slate-800 opacity-70'
                          : 'bg-slate-100 border-slate-200 opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm text-white">Room {room.number}</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          isAvailable
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {room.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {room.floor} • {room.type}
                    </div>
                    {room.allocatedTo ? (
                      <div className="text-[10px] text-rose-300 font-semibold mt-1 truncate">
                        👤 {room.allocatedTo}
                      </div>
                    ) : (
                      <button
                        onClick={() => void handleAllocate(room)}
                        disabled={!selectedBooking || !isAvailable || typeMismatch || assigningRoom === room.number}
                        title={typeMismatch ? 'Room category does not match the booking' : 'Assign selected reservation'}
                        className="mt-2 w-full py-1 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-[10px] transition flex items-center justify-center gap-1"
                      >
                        {assigningRoom === room.number ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <ArrowRight className="w-3 h-3" />
                        )}
                        <span>Assign Room</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
