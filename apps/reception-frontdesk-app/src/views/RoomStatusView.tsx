import React, { useCallback, useEffect, useState } from 'react';
import {
  Sparkles,
  Bed,
  Search,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { getApiClient } from '../lib/apiClient';

interface RoomStatusViewProps {
  isDark?: boolean;
  onToast?: (msg: string) => void;
}

type RoomState = 'Available' | 'Occupied' | 'Cleaning' | 'Maintenance' | 'Inspected';

interface RoomItem {
  roomId: string;
  number: string;
  floor: string;
  type: string;
  status: RoomState;
  guestName?: string;
  housekeeper?: string;
  activeTaskId?: string;
  activeTaskStatus?: string;
}

interface BoardRoom {
  roomId: string;
  roomNumber: string;
  floorNumber?: number;
  roomType?: { name?: string; code?: string };
  status: string;
  activeTask?: {
    _id?: string;
    status?: string;
    assignedAttendantId?: { name?: string };
  } | null;
  guestInfo?: { guestName?: string } | null;
}

function mapStatus(status: string): RoomState {
  if (status === 'AVAILABLE') return 'Available';
  if (status === 'OCCUPIED') return 'Occupied';
  if (status === 'DIRTY' || status === 'CLEANING') return 'Cleaning';
  if (status === 'INSPECTION') return 'Inspected';
  if (status === 'OUT_OF_SERVICE') return 'Maintenance';
  return 'Available';
}

export const RoomStatusView: React.FC<RoomStatusViewProps> = ({ isDark = true, onToast }) => {
  const [filter, setFilter] = useState<string>('All');
  const [search, setSearch] = useState<string>('');
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyRoom, setBusyRoom] = useState<string | null>(null);

  const loadRooms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getApiClient().request<{
        success: boolean;
        board: BoardRoom[];
      }>('GET', '/api/v1/housekeeping/board');
      setRooms(
        (response.board || []).map((room) => ({
          roomId: room.roomId,
          number: room.roomNumber,
          floor: room.floorNumber ? `Floor ${room.floorNumber}` : 'Unassigned floor',
          type: room.roomType?.name || room.roomType?.code || 'Room',
          status: mapStatus(room.status),
          guestName: room.guestInfo?.guestName,
          housekeeper: room.activeTask?.assignedAttendantId?.name,
          activeTaskId: room.activeTask?._id,
          activeTaskStatus: room.activeTask?.status,
        }))
      );
    } catch (err: any) {
      setRooms([]);
      setError(err?.message || 'Housekeeping board could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  const notify = (message: string) => {
    if (onToast) onToast(message);
  };

  const runAction = async (room: RoomItem, action: 'inspect' | 'clean' | 'available' | 'maintenance') => {
    setBusyRoom(room.number);
    try {
      const client = getApiClient();
      if (action === 'clean') {
        await client.request('POST', '/api/v1/housekeeping/tasks', {
          roomId: room.roomId,
          taskType: 'CHECKOUT_CLEAN',
          priority: 'NORMAL',
        });
        notify(`Cleaning task created for room ${room.number}.`);
      } else if (action === 'inspect') {
        if (!room.activeTaskId) {
          notify(`Room ${room.number} has no housekeeping task to inspect.`);
          return;
        }
        await client.request('PUT', `/api/v1/housekeeping/tasks/${room.activeTaskId}/inspect`, {
          isApproved: true,
          notes: 'Approved from room status matrix',
        });
        notify(`Room ${room.number} inspected and released.`);
      } else if (action === 'available') {
        if (room.status === 'Available') {
          notify(`Room ${room.number} is already available.`);
          return;
        }
        if (!room.activeTaskId) {
          notify(`Room ${room.number} needs a completed cleaning task before release.`);
          return;
        }
        await client.request('POST', '/api/v1/pms/frontdesk/turnaround/approve-ready', {
          taskId: room.activeTaskId,
          supervisorNotes: 'Approved from room status matrix',
        });
        notify(`Room ${room.number} released to available.`);
      } else {
        await client.request('POST', '/api/v1/pms/frontdesk/maintenance/create-ticket', {
          roomId: room.roomId,
          roomNumber: room.number,
          title: `Room ${room.number} maintenance`,
          description: 'Reported from the front-desk room status matrix.',
          category: 'GENERAL',
          priority: 'MEDIUM',
          blocksRoom: true,
        });
        notify(`Maintenance ticket created for room ${room.number}.`);
      }
      await loadRooms();
    } catch (err: any) {
      notify(err?.message || `Room ${room.number} action failed.`);
    } finally {
      setBusyRoom(null);
    }
  };

  const counts = {
    All: rooms.length,
    Available: rooms.filter((r) => r.status === 'Available').length,
    Occupied: rooms.filter((r) => r.status === 'Occupied').length,
    Cleaning: rooms.filter((r) => r.status === 'Cleaning').length,
    Inspected: rooms.filter((r) => r.status === 'Inspected').length,
    Maintenance: rooms.filter((r) => r.status === 'Maintenance').length,
  };

  const filtered = rooms.filter((r) => {
    if (filter !== 'All' && r.status !== filter) return false;
    if (
      search &&
      !r.number.includes(search) &&
      !r.type.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-8">
      <div
        className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
        }`}
      >
        <div>
          <h2
            className={`text-lg font-black tracking-tight flex items-center gap-2 ${
              isDark ? 'text-white' : 'text-slate-800'
            }`}
          >
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span>Room Status & Housekeeping Inspection Matrix</span>
          </h2>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Live housekeeping board for this hotel. Actions create real tasks, inspections and
            maintenance tickets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search room..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`pl-8 pr-3 py-1.5 rounded-xl border text-xs focus:outline-none transition ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-white placeholder:text-slate-500'
                  : 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400'
              }`}
            />
          </div>
          <button
            onClick={() => void loadRooms()}
            disabled={loading}
            className={`p-2 rounded-xl border transition disabled:opacity-50 ${
              isDark
                ? 'border-slate-700 bg-slate-900 text-slate-300 hover:text-white'
                : 'border-slate-200 bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
            title="Refresh housekeeping board"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold">
        {[
          { label: 'All', count: counts.All, color: 'bg-blue-600' },
          { label: 'Available', count: counts.Available, color: 'bg-emerald-600' },
          { label: 'Occupied', count: counts.Occupied, color: 'bg-red-600' },
          { label: 'Cleaning', count: counts.Cleaning, color: 'bg-amber-600' },
          { label: 'Inspected', count: counts.Inspected, color: 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' },
          { label: 'Maintenance', count: counts.Maintenance, color: 'bg-slate-600' },
        ].map((t) => (
          <button
            key={t.label}
            onClick={() => setFilter(t.label)}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
              filter === t.label
                ? `${t.color} text-white shadow-md`
                : isDark
                  ? 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>{t.label}</span>
            <span className="text-[10px] opacity-80 font-mono">({t.count})</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </span>
          <button onClick={() => void loadRooms()} className="font-bold underline">
            Retry
          </button>
        </div>
      )}

      {loading && rooms.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm font-semibold text-slate-400">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Loading live housekeeping board…
        </div>
      ) : filtered.length === 0 ? (
        <div
          className={`rounded-2xl border px-6 py-14 text-center ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <Bed className="w-9 h-9 text-slate-500 mx-auto mb-3" />
          <p className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            No rooms in this state.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filtered.map((r) => {
            const badgeClass =
              r.status === 'Available'
                ? isDark
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : r.status === 'Occupied'
                  ? isDark
                    ? 'bg-red-500/20 text-red-300 border-red-500/30'
                    : 'bg-red-50 text-red-800 border-red-200'
                  : r.status === 'Cleaning'
                    ? isDark
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                    : r.status === 'Inspected'
                      ? isDark
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                        : 'bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                      : isDark
                        ? 'bg-slate-500/20 text-slate-300 border-slate-500/30'
                        : 'bg-slate-100 text-slate-700 border-slate-200';

            return (
              <div
                key={r.roomId}
                className={`p-3.5 rounded-2xl border flex flex-col justify-between gap-2.5 transition ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`font-black text-base ${isDark ? 'text-white' : 'text-slate-800'}`}>Room {r.number}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${badgeClass}`}>
                      {r.status}
                    </span>
                  </div>
                  <div className={`text-[10px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {r.floor} • {r.type}
                  </div>
                  {r.guestName && (
                    <div className={`text-[10px] font-semibold mt-1 truncate ${
                      isDark ? 'text-red-300' : 'text-red-700'
                    }`}>
                      👤 {r.guestName}
                    </div>
                  )}
                  {r.housekeeper && (
                    <div className={`text-[10px] font-medium mt-0.5 truncate ${
                      isDark ? 'text-amber-300' : 'text-amber-700'
                    }`}>
                      🧹 {r.housekeeper}
                    </div>
                  )}
                </div>

                <div className={`grid grid-cols-2 gap-1 pt-1 border-t ${
                  isDark ? 'border-slate-800/80' : 'border-slate-100'
                }`}>
                  <button
                    onClick={() => void runAction(r, 'inspect')}
                    disabled={busyRoom === r.number}
                    className={`py-1 rounded-md text-[9px] font-bold border transition disabled:opacity-50 ${
                      isDark
                        ? 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-white'
                        : 'bg-slate-800 hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                    title="Approve housekeeping inspection"
                  >
                    Inspect
                  </button>
                  <button
                    onClick={() => void runAction(r, 'clean')}
                    disabled={busyRoom === r.number}
                    className={`py-1 rounded-md text-[9px] font-bold border transition disabled:opacity-50 ${
                      isDark
                        ? 'bg-amber-600/30 hover:bg-amber-600 border-amber-500/40 text-amber-200 hover:text-white'
                        : 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-800'
                    }`}
                    title="Create a checkout cleaning task"
                  >
                    Cleaning
                  </button>
                  <button
                    onClick={() => void runAction(r, 'available')}
                    disabled={busyRoom === r.number}
                    className={`py-1 rounded-md text-[9px] font-bold border transition disabled:opacity-50 ${
                      isDark
                        ? 'bg-emerald-600/30 hover:bg-emerald-600 border-emerald-500/40 text-emerald-200 hover:text-white'
                        : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800'
                    }`}
                    title="Approve and release room to available"
                  >
                    Available
                  </button>
                  <button
                    onClick={() => void runAction(r, 'maintenance')}
                    disabled={busyRoom === r.number}
                    className={`py-1 rounded-md text-[9px] font-bold border transition disabled:opacity-50 ${
                      isDark
                        ? 'bg-slate-700/60 hover:bg-slate-600 border-slate-600 text-slate-300 hover:text-white'
                        : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                    }`}
                    title="Create a maintenance ticket"
                  >
                    Maint.
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
