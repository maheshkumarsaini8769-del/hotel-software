import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Building2,
  BedDouble,
  Armchair,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Users,
  ChevronRight,
  ShieldCheck,
  Check,
  Calendar,
  UtensilsCrossed,
  Layers,
  ArrowUpRight,
  CheckCheck,
  Ban,
  Wrench,
  Sparkle,
} from 'lucide-react';
import { apiFetch, getStoredHotelId } from '../../config/api';

export interface LivePropertyAvailabilityAppProps {
  token?: string;
  hotelId?: string;
  onNavigateToFrontDesk?: (roomNumber?: string) => void;
  onNavigateToTables?: () => void;
  onNavigateToHousekeeping?: () => void;
}

interface RoomItem {
  id: string;
  _id?: string;
  roomNumber: string;
  roomTypeId?: {
    _id?: string;
    id?: string;
    name?: string;
    basePriceOvernight?: number;
    maxCapacity?: number;
  } | string;
  floorNumber: number;
  wing?: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'DIRTY' | 'CLEANING' | 'RESERVED' | 'INSPECTION' | 'OUT_OF_SERVICE';
  isAc?: boolean;
}

interface RoomTypeItem {
  id: string;
  _id?: string;
  name: string;
  basePriceOvernight: number;
  maxCapacity: number;
}

interface TableItem {
  id: string;
  _id?: string;
  tableNumber: string;
  floorNumber?: number;
  floorLevel?: string;
  section?: string;
  hallId?: string;
  capacity?: number;
  shape?: string;
  currentStatus: 'AVAILABLE' | 'OCCUPIED' | 'BILLING' | 'RESERVED' | 'CLEANING';
  assignedWaiter?: string;
  notes?: string;
}

const resolveTableFloor = (t: TableItem): number => {
  if (typeof t.floorNumber === 'number' && t.floorNumber > 0) return t.floorNumber;
  const lvl = (t.floorLevel || '').toLowerCase().trim();
  if (lvl.includes('ground') || lvl.includes('g') || lvl.includes('1st') || lvl.includes('first') || lvl.includes('1')) return 1;
  if (lvl.includes('2nd') || lvl.includes('second') || lvl.includes('2')) return 2;
  if (lvl.includes('3rd') || lvl.includes('third') || lvl.includes('rooftop') || lvl.includes('3')) return 3;
  if (lvl.includes('4th') || lvl.includes('fourth') || lvl.includes('4')) return 4;
  const m = lvl.match(/(\d+)/);
  return m ? Number(m[1]) : 1;
};

export const LivePropertyAvailabilityApp: React.FC<LivePropertyAvailabilityAppProps> = ({
  token,
  hotelId = getStoredHotelId(),
  onNavigateToFrontDesk,
  onNavigateToTables,
  onNavigateToHousekeeping,
}) => {
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomTypeItem[]>([]);
  const [tables, setTables] = useState<TableItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters
  const [viewFilter, setViewFilter] = useState<'COMBINED' | 'ROOMS_ONLY' | 'TABLES_ONLY'>('COMBINED');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'OCCUPIED' | 'ATTENTION'>('ALL');
  const [selectedFloor, setSelectedFloor] = useState<string>('ALL'); // 'ALL' or '1', '2', '3'
  const [searchQuery, setSearchQuery] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = useCallback(async (quiet = false) => {
    if (!quiet) setIsRefreshing(true);
    try {
      const activeHotelId = hotelId || getStoredHotelId();
      const [roomsRes, typesRes, tablesRes] = await Promise.allSettled([
        apiFetch(`/pms/rooms?hotelId=${encodeURIComponent(activeHotelId)}`),
        apiFetch(`/pms/room-types?hotelId=${encodeURIComponent(activeHotelId)}`),
        apiFetch('/table-management/tables'),
      ]);

      if (roomsRes.status === 'fulfilled' && roomsRes.value.ok) {
        const rData = await roomsRes.value.json().catch(() => null);
        if (rData?.success && Array.isArray(rData.rooms)) {
          setRooms(rData.rooms);
        }
      }

      if (typesRes.status === 'fulfilled' && typesRes.value.ok) {
        const tData = await typesRes.value.json().catch(() => null);
        if (tData?.success && Array.isArray(tData.roomTypes)) {
          setRoomTypes(tData.roomTypes);
        }
      }

      if (tablesRes.status === 'fulfilled' && tablesRes.value.ok) {
        const tbData = await tablesRes.value.json().catch(() => null);
        if (tbData?.success && Array.isArray(tbData.data)) {
          const normalized = tbData.data.map((t: any) => ({
            ...t,
            floorNumber: resolveTableFloor(t),
          }));
          setTables(normalized);
        }
      }

      setLastUpdated(new Date());
    } catch (err: any) {
      console.warn('Live availability fetch failed:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [hotelId]);

  useEffect(() => {
    loadData();
    const timer = setInterval(() => loadData(true), 10000);
    return () => clearInterval(timer);
  }, [loadData]);

  // Update room status
  const handleUpdateRoomStatus = async (roomId: string, newStatus: RoomItem['status'], roomNum: string) => {
    try {
      const res = await apiFetch(`/pms/rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setRooms((prev) =>
          prev.map((r) => (r.id === roomId || r._id === roomId ? { ...r, status: newStatus } : r))
        );
        showToast(`✓ Room ${roomNum} status updated to ${newStatus}`);
      } else {
        showToast(`❌ ${data?.message || 'Failed to update room'}`);
      }
    } catch (err: any) {
      showToast(`Error: ${err?.message}`);
    }
  };

  // Update table status
  const handleUpdateTableStatus = async (tableId: string, newStatus: TableItem['currentStatus'], tableNum: string) => {
    try {
      const res = await apiFetch(`/table-management/tables/${tableId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setTables((prev) =>
          prev.map((t) => (t.id === tableId || t._id === tableId ? { ...t, currentStatus: newStatus } : t))
        );
        showToast(`✓ Table ${tableNum} marked as ${newStatus}`);
      } else {
        showToast(`❌ ${data?.message || 'Failed to update table status'}`);
      }
    } catch (err: any) {
      showToast(`Error: ${err?.message}`);
    }
  };

  // Computations
  const roomTypeMap = useMemo(() => {
    const map = new Map<string, RoomTypeItem>();
    roomTypes.forEach((rt) => {
      if (rt.id) map.set(rt.id, rt);
      if (rt._id) map.set(rt._id, rt);
    });
    return map;
  }, [roomTypes]);

  // Executive KPI summary
  const totalRooms = rooms.length;
  const availableRooms = rooms.filter((r) => r.status === 'AVAILABLE').length;
  const occupiedRooms = rooms.filter((r) => r.status === 'OCCUPIED').length;
  const cleaningRooms = rooms.filter((r) => r.status === 'CLEANING' || r.status === 'DIRTY').length;
  const maintenanceRooms = rooms.filter((r) => r.status === 'OUT_OF_SERVICE' || r.status === 'INSPECTION').length;
  const roomOccupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  const totalTables = tables.length;
  const availableTables = tables.filter((t) => t.currentStatus === 'AVAILABLE').length;
  const occupiedTables = tables.filter((t) => t.currentStatus === 'OCCUPIED' || t.currentStatus === 'BILLING').length;
  const reservedTables = tables.filter((t) => t.currentStatus === 'RESERVED').length;
  const cleaningTables = tables.filter((t) => t.currentStatus === 'CLEANING').length;
  const tableOccupancyRate = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0;
  const totalTableCovers = tables.reduce((acc, t) => acc + (t.capacity || 4), 0);
  const totalRoomGuestBeds = rooms.reduce((acc, r) => {
    const typeObj = typeof r.roomTypeId === 'object' ? r.roomTypeId : roomTypeMap.get(r.roomTypeId || '');
    return acc + (typeObj?.maxCapacity || 2);
  }, 0);

  // Available floors dynamically detected from rooms & tables
  const detectedFloors = useMemo(() => {
    const floorSet = new Set<number>();
    rooms.forEach((r) => {
      if (typeof r.floorNumber === 'number' && r.floorNumber > 0) floorSet.add(r.floorNumber);
    });
    tables.forEach((t) => {
      const fl = resolveTableFloor(t);
      if (fl > 0) floorSet.add(fl);
    });
    const arr = Array.from(floorSet).sort((a, b) => a - b);
    return arr.length > 0 ? arr : [1, 2, 3];
  }, [rooms, tables]);

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      // Floor filter
      if (selectedFloor !== 'ALL' && String(r.floorNumber) !== selectedFloor) {
        return false;
      }
      // Status filter
      if (statusFilter === 'AVAILABLE' && r.status !== 'AVAILABLE') return false;
      if (statusFilter === 'OCCUPIED' && r.status !== 'OCCUPIED') return false;
      if (statusFilter === 'ATTENTION' && !['DIRTY', 'CLEANING', 'OUT_OF_SERVICE', 'INSPECTION'].includes(r.status)) {
        return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const typeObj = typeof r.roomTypeId === 'object' ? r.roomTypeId : roomTypeMap.get(r.roomTypeId || '');
        const matchNum = r.roomNumber.toLowerCase().includes(q);
        const matchType = (typeObj?.name || '').toLowerCase().includes(q);
        const matchWing = (r.wing || '').toLowerCase().includes(q);
        return matchNum || matchType || matchWing;
      }
      return true;
    });
  }, [rooms, selectedFloor, statusFilter, searchQuery, roomTypeMap]);

  // Filtered tables
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      const fl = resolveTableFloor(t);
      // Floor filter
      if (selectedFloor !== 'ALL' && String(fl) !== selectedFloor) {
        return false;
      }
      // Status filter
      if (statusFilter === 'AVAILABLE' && t.currentStatus !== 'AVAILABLE') return false;
      if (statusFilter === 'OCCUPIED' && t.currentStatus !== 'OCCUPIED' && t.currentStatus !== 'BILLING') return false;
      if (statusFilter === 'ATTENTION' && t.currentStatus !== 'CLEANING' && t.currentStatus !== 'RESERVED') {
        return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNum = t.tableNumber.toLowerCase().includes(q);
        const matchSec = (t.section || '').toLowerCase().includes(q);
        const matchWaiter = (t.assignedWaiter || '').toLowerCase().includes(q);
        return matchNum || matchSec || matchWaiter;
      }
      return true;
    });
  }, [tables, selectedFloor, statusFilter, searchQuery]);

  return (
    <div className="min-h-full p-4 md:p-6 lg:p-8 space-y-6 bg-slate-50 text-slate-900 font-sans">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2.5 animate-bounce border border-slate-700">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="font-semibold text-xs sm:text-sm">{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. STUDIO HEADER WITH LIVE PULSE & QUICK ACTION NAVIGATION                */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
                  Live Rooms & Tables Availability
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  LIVE SYNC (10s)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Executive real-time availability pulse: ready hotel guestrooms and active restaurant dining covers.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Shortcut Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => loadData(false)}
            disabled={isRefreshing}
            className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5 shadow-xs"
            title="Refresh availability data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Now'}</span>
          </button>

          {onNavigateToFrontDesk && (
            <button
              type="button"
              onClick={() => onNavigateToFrontDesk()}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 transition flex items-center gap-1.5 shadow-xs"
            >
              <BedDouble className="w-3.5 h-3.5 text-blue-600" />
              <span>Front Desk PMS</span>
              <ArrowUpRight className="w-3 h-3 text-slate-400" />
            </button>
          )}

          {onNavigateToTables && (
            <button
              type="button"
              onClick={onNavigateToTables}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 transition flex items-center gap-1.5 shadow-xs"
            >
              <Armchair className="w-3.5 h-3.5 text-indigo-600" />
              <span>Dining Tables Studio</span>
              <ArrowUpRight className="w-3 h-3 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. EXECUTIVE AVAILABILITY METRICS RIBBON (6 DEDICATED CARDS)               */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Available Rooms */}
        <div
          onClick={() => {
            setViewFilter('ROOMS_ONLY');
            setStatusFilter('AVAILABLE');
          }}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            viewFilter === 'ROOMS_ONLY' && statusFilter === 'AVAILABLE'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/40 shadow-xs'
              : 'border-slate-200 bg-white shadow-xs hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700 text-xs mb-1 font-semibold">
            <span>Rooms Ready</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <div className="text-2xl font-bold text-slate-900">{availableRooms}</div>
            <span className="text-xs text-slate-400 font-semibold">/ {totalRooms} total</span>
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-1">
            {totalRooms > 0 ? `${Math.round((availableRooms / totalRooms) * 100)}% Available` : 'No rooms configured'}
          </div>
        </div>

        {/* Occupied Rooms */}
        <div
          onClick={() => {
            setViewFilter('ROOMS_ONLY');
            setStatusFilter('OCCUPIED');
          }}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            viewFilter === 'ROOMS_ONLY' && statusFilter === 'OCCUPIED'
              ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/40 shadow-xs'
              : 'border-slate-200 bg-white shadow-xs hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between text-blue-700 text-xs mb-1 font-semibold">
            <span>Rooms Occupied</span>
            <BedDouble className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{occupiedRooms}</div>
          <div className="text-[11px] text-blue-700 font-medium mt-1">
            {roomOccupancyRate}% Room Occupancy
          </div>
        </div>

        {/* Rooms Turnaround / Attention */}
        <div
          onClick={() => {
            setViewFilter('ROOMS_ONLY');
            setStatusFilter('ATTENTION');
          }}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            viewFilter === 'ROOMS_ONLY' && statusFilter === 'ATTENTION'
              ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/40 shadow-xs'
              : 'border-slate-200 bg-white shadow-xs hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-amber-700 text-xs mb-1 font-semibold">
            <span>Room Cleaning</span>
            <Sparkles className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{cleaningRooms + maintenanceRooms}</div>
          <div className="text-[11px] text-amber-700 font-medium mt-1">
            {cleaningRooms} Dirty • {maintenanceRooms} Blocked
          </div>
        </div>

        {/* Available Dining Tables */}
        <div
          onClick={() => {
            setViewFilter('TABLES_ONLY');
            setStatusFilter('AVAILABLE');
          }}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            viewFilter === 'TABLES_ONLY' && statusFilter === 'AVAILABLE'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/40 shadow-xs'
              : 'border-slate-200 bg-white shadow-xs hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700 text-xs mb-1 font-semibold">
            <span>Tables Ready</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <div className="text-2xl font-bold text-slate-900">{availableTables}</div>
            <span className="text-xs text-slate-400 font-semibold">/ {totalTables} total</span>
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-1">
            Ready to seat walk-in guests
          </div>
        </div>

        {/* Occupied Dining Tables */}
        <div
          onClick={() => {
            setViewFilter('TABLES_ONLY');
            setStatusFilter('OCCUPIED');
          }}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            viewFilter === 'TABLES_ONLY' && statusFilter === 'OCCUPIED'
              ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/40 shadow-xs'
              : 'border-slate-200 bg-white shadow-xs hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between text-rose-700 text-xs mb-1 font-semibold">
            <span>Tables Seated</span>
            <UtensilsCrossed className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{occupiedTables}</div>
          <div className="text-[11px] text-rose-700 font-medium mt-1">
            {tableOccupancyRate}% Dining Occupancy
          </div>
        </div>

        {/* Property Capacity Covers */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1 font-semibold">
            <span>Total Property Capacity</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {totalRoomGuestBeds + totalTableCovers} Guests
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {totalRoomGuestBeds} Room Beds • {totalTableCovers} Dining Seats
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MULTI-LEVEL FILTER CONTROLS                                             */}
      {/* ========================================================================= */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* View Filter Mode Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-2 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Inventory View:</span>
            </span>

            <button
              type="button"
              onClick={() => setViewFilter('COMBINED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewFilter === 'COMBINED'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All (Rooms & Tables Combined)
            </button>

            <button
              type="button"
              onClick={() => setViewFilter('ROOMS_ONLY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                viewFilter === 'ROOMS_ONLY'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <BedDouble className="w-3.5 h-3.5" />
              <span>Rooms Only ({totalRooms})</span>
            </button>

            <button
              type="button"
              onClick={() => setViewFilter('TABLES_ONLY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                viewFilter === 'TABLES_ONLY'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Armchair className="w-3.5 h-3.5" />
              <span>Tables Only ({totalTables})</span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative min-w-[260px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search room (101), table (T-01), wing, hall..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Secondary Row: Status Filter & Floor Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          {/* Status Filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-2 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              <span>Status:</span>
            </span>

            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Statuses
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('AVAILABLE')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                statusFilter === 'AVAILABLE'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Available Only ({availableRooms + availableTables})</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('OCCUPIED')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                statusFilter === 'OCCUPIED'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Occupied ({occupiedRooms + occupiedTables})</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('ATTENTION')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                statusFilter === 'ATTENTION'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Turnaround & Cleaning ({cleaningRooms + maintenanceRooms + cleaningTables})</span>
            </button>
          </div>

          {/* Dynamic Floor Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-2 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Floor:</span>
            </span>

            <button
              type="button"
              onClick={() => setSelectedFloor('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                selectedFloor === 'ALL'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Floors
            </button>

            {detectedFloors.map((fl) => {
              const flRoomsAvail = rooms.filter((r) => r.floorNumber === fl && r.status === 'AVAILABLE').length;
              const flTablesAvail = tables.filter((t) => resolveTableFloor(t) === fl && t.currentStatus === 'AVAILABLE').length;
              const isSel = selectedFloor === String(fl);

              return (
                <button
                  key={fl}
                  type="button"
                  onClick={() => setSelectedFloor(isSel ? 'ALL' : String(fl))}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                    isSel
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>Floor {fl}</span>
                  <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${isSel ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {flRoomsAvail + flTablesAvail} ready
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. HOTEL ROOMS AVAILABILITY GRID (WHEN COMBINED OR ROOMS_ONLY)             */}
      {/* ========================================================================= */}
      {(viewFilter === 'COMBINED' || viewFilter === 'ROOMS_ONLY') && (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center text-blue-700">
                <BedDouble className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-base font-bold text-slate-900">
                Hotel Guest Rooms ({filteredRooms.length})
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                • {filteredRooms.filter((r) => r.status === 'AVAILABLE').length} currently available
              </span>
            </div>

            {onNavigateToFrontDesk && (
              <button
                type="button"
                onClick={() => onNavigateToFrontDesk()}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
              >
                <span>Open Front Desk</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {filteredRooms.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
              <BedDouble className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No rooms match the selected filters</p>
              <p className="text-xs text-slate-500 mt-1">Try resetting the status or floor filter</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {filteredRooms.map((room) => {
                const typeObj = typeof room.roomTypeId === 'object' ? room.roomTypeId : roomTypeMap.get(room.roomTypeId || '');
                const isAvail = room.status === 'AVAILABLE';
                const isOccupied = room.status === 'OCCUPIED';
                const isCleaning = room.status === 'CLEANING' || room.status === 'DIRTY';
                const isOutOfService = room.status === 'OUT_OF_SERVICE' || room.status === 'INSPECTION';

                return (
                  <div
                    key={room.id || room._id}
                    className={`p-4 rounded-xl border transition-all relative overflow-hidden bg-white shadow-2xs ${
                      isAvail
                        ? 'border-emerald-300/80 hover:border-emerald-400 hover:shadow-xs'
                        : isOccupied
                        ? 'border-blue-300/80 bg-blue-50/20'
                        : isCleaning
                        ? 'border-amber-300/80 bg-amber-50/20'
                        : 'border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    {/* Top Row: Room number & Status badge */}
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Floor {room.floorNumber} {room.wing ? `• ${room.wing}` : ''}
                        </span>
                        <div className="text-xl font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                          <BedDouble className={`w-4 h-4 ${isAvail ? 'text-emerald-600' : isOccupied ? 'text-blue-600' : 'text-slate-500'}`} />
                          <span>Room {room.roomNumber}</span>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          isAvail
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : isOccupied
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : isCleaning
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                      >
                        {isAvail ? 'Available' : isOccupied ? 'Occupied' : isCleaning ? 'Cleaning' : 'Blocked'}
                      </span>
                    </div>

                    {/* Room Category & Tariff */}
                    <div className="text-xs text-slate-600 space-y-1 my-2.5 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800 truncate">
                          {typeObj?.name || 'Deluxe Room'}
                        </span>
                        {room.isAc !== false && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-50 text-sky-700 border border-sky-200 font-bold">
                            AC
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-slate-500 text-[11px]">
                        <span>Tariff:</span>
                        <span className="font-bold text-slate-900">
                          ₹{(typeObj?.basePriceOvernight || 2800).toLocaleString('en-IN')}/night
                        </span>
                      </div>
                    </div>

                    {/* Quick Action Button Strip */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                      {isAvail && onNavigateToFrontDesk && (
                        <button
                          type="button"
                          onClick={() => onNavigateToFrontDesk(room.roomNumber)}
                          className="w-full py-1.5 px-2.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center justify-center gap-1 shadow-2xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Check-In</span>
                        </button>
                      )}

                      {isCleaning && (
                        <button
                          type="button"
                          onClick={() => handleUpdateRoomStatus(room.id || room._id || '', 'AVAILABLE', room.roomNumber)}
                          className="w-full py-1.5 px-2.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center justify-center gap-1 shadow-2xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Cleaned</span>
                        </button>
                      )}

                      {isOccupied && onNavigateToFrontDesk && (
                        <button
                          type="button"
                          onClick={() => onNavigateToFrontDesk(room.roomNumber)}
                          className="w-full py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition flex items-center justify-center gap-1"
                        >
                          <span>View Guest Folio</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {isOutOfService && (
                        <button
                          type="button"
                          onClick={() => handleUpdateRoomStatus(room.id || room._id || '', 'AVAILABLE', room.roomNumber)}
                          className="w-full py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Release to Available</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. DINING TABLES AVAILABILITY GRID (WHEN COMBINED OR TABLES_ONLY)           */}
      {/* ========================================================================= */}
      {(viewFilter === 'COMBINED' || viewFilter === 'TABLES_ONLY') && (
        <div className="space-y-3.5 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-indigo-100 flex items-center justify-center text-indigo-700">
                <Armchair className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-base font-bold text-slate-900">
                Restaurant Dining Tables ({filteredTables.length})
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                • {filteredTables.filter((t) => t.currentStatus === 'AVAILABLE').length} tables ready to seat
              </span>
            </div>

            {onNavigateToTables && (
              <button
                type="button"
                onClick={onNavigateToTables}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
              >
                <span>Manage Table Layout</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {filteredTables.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
              <Armchair className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No tables match the selected filters</p>
              <p className="text-xs text-slate-500 mt-1">Try resetting the status or floor filter</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {filteredTables.map((table) => {
                const isAvail = table.currentStatus === 'AVAILABLE';
                const isOccupied = table.currentStatus === 'OCCUPIED' || table.currentStatus === 'BILLING';
                const isReserved = table.currentStatus === 'RESERVED';
                const isCleaning = table.currentStatus === 'CLEANING';
                const flNumber = resolveTableFloor(table);

                return (
                  <div
                    key={table.id || table._id}
                    className={`p-4 rounded-xl border transition-all relative overflow-hidden bg-white shadow-2xs ${
                      isAvail
                        ? 'border-emerald-300/80 hover:border-emerald-400 hover:shadow-xs'
                        : isOccupied
                        ? 'border-rose-300/80 bg-rose-50/20'
                        : isReserved
                        ? 'border-purple-300/80 bg-purple-50/20'
                        : 'border-amber-300/80 bg-amber-50/20'
                    }`}
                  >
                    {/* Top Row: Table number & Status badge */}
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Floor {flNumber} • {table.section || 'Dining Area'}
                        </span>
                        <div className="text-xl font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                          <Armchair className={`w-4 h-4 ${isAvail ? 'text-emerald-600' : isOccupied ? 'text-rose-600' : 'text-slate-500'}`} />
                          <span>Table {table.tableNumber}</span>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          isAvail
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : isOccupied
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : isReserved
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {table.currentStatus}
                      </span>
                    </div>

                    {/* Table Specifications */}
                    <div className="text-xs text-slate-600 space-y-1 my-2.5 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Capacity:</span>
                        <span className="font-bold text-slate-900">
                          {table.capacity || 4} Guests ({table.shape || 'Square'})
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500 text-[11px]">
                        <span>Server:</span>
                        <span className="font-medium text-slate-700">
                          {table.assignedWaiter || 'Floor Staff'}
                        </span>
                      </div>
                    </div>

                    {/* Quick Status Action Buttons */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                      {isAvail && (
                        <div className="grid grid-cols-2 gap-1.5 w-full">
                          <button
                            type="button"
                            onClick={() => handleUpdateTableStatus(table.id || table._id || '', 'OCCUPIED', table.tableNumber)}
                            className="py-1 px-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition flex items-center justify-center gap-1 shadow-2xs"
                          >
                            <UtensilsCrossed className="w-3 h-3" />
                            <span>Seat</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateTableStatus(table.id || table._id || '', 'RESERVED', table.tableNumber)}
                            className="py-1 px-2 rounded-lg text-xs font-semibold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition flex items-center justify-center gap-1"
                          >
                            <Calendar className="w-3 h-3" />
                            <span>Reserve</span>
                          </button>
                        </div>
                      )}

                      {isOccupied && (
                        <button
                          type="button"
                          onClick={() => handleUpdateTableStatus(table.id || table._id || '', 'AVAILABLE', table.tableNumber)}
                          className="w-full py-1.5 px-2.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center justify-center gap-1 shadow-2xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Release (Mark Available)</span>
                        </button>
                      )}

                      {isReserved && (
                        <div className="grid grid-cols-2 gap-1.5 w-full">
                          <button
                            type="button"
                            onClick={() => handleUpdateTableStatus(table.id || table._id || '', 'OCCUPIED', table.tableNumber)}
                            className="py-1 px-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition flex items-center justify-center gap-1 shadow-2xs"
                          >
                            <Check className="w-3 h-3" />
                            <span>Seat</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateTableStatus(table.id || table._id || '', 'AVAILABLE', table.tableNumber)}
                            className="py-1 px-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center justify-center gap-1"
                          >
                            <span>Cancel</span>
                          </button>
                        </div>
                      )}

                      {isCleaning && (
                        <button
                          type="button"
                          onClick={() => handleUpdateTableStatus(table.id || table._id || '', 'AVAILABLE', table.tableNumber)}
                          className="w-full py-1.5 px-2.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center justify-center gap-1 shadow-2xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Clean & Ready</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LivePropertyAvailabilityApp;
