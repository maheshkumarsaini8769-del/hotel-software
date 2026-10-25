import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch, getStoredHotelId } from '../../config/api';
import { getPortalUrl } from '../../config/portalUrls';
import {
  Layers,
  Building,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Users,
  Clock,
  QrCode,
  Edit2,
  Trash2,
  RefreshCw,
  Sparkles,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  Printer,
  Copy,
  DoorOpen,
  Armchair
} from 'lucide-react';

export interface HallDTO {
  id: string;
  name: string;
  code: string;
  floorLevel: string;
  floorNumber: number;
  description?: string;
  maxCapacity?: number;
  tablesCount: number;
  isActive: boolean;
}

export interface FloorDTO {
  id: string;
  floorNumber: number;
  name: string;
  shortName: string;
  halls: HallDTO[];
  tablesCount: number;
  totalCapacity: number;
}

export interface TableDTO {
  id: string;
  tableNumber: string;
  floorLevel: string;
  floorNumber: number;
  hallId: string;
  section: string;
  capacity: number;
  shape: 'SQUARE' | 'ROUND' | 'RECTANGLE' | 'BOOTH';
  currentStatus: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING' | 'DIRTY' | 'BILLING';
  assignedWaiter?: string;
  assignedWaiterId?: string;
  activeSessionId?: string;
  activeOrderTotal: number;
  activeItemsCount: number;
  sessionStartTime?: string;
  qrCodeUrl?: string;
  notes?: string;
  createdAt: string;
}

export interface TableManagementStudioAppProps {
  isDark?: boolean;
  hotelId?: string;
  mode?: 'TABLES' | 'OUTLETS';
}

export const TableManagementStudioApp: React.FC<TableManagementStudioAppProps> = ({
  isDark = true,
  hotelId = getStoredHotelId(),
  mode = 'TABLES',
}) => {
  const [floors, setFloors] = useState<FloorDTO[]>([]);
  const [tables, setTables] = useState<TableDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters
  const [selectedFloor, setSelectedFloor] = useState<string>('ALL'); // 'ALL' or '1', '2', '3'
  const [selectedHall, setSelectedHall] = useState<string>('ALL'); // 'ALL' or hallId
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<TableDTO | null>(null);
  const [isFloorModalOpen, setIsFloorModalOpen] = useState(false);
  const [isHallModalOpen, setIsHallModalOpen] = useState(false);
  const [selectedQrTable, setSelectedQrTable] = useState<TableDTO | null>(null);
  const [isPrintableQrCenterOpen, setIsPrintableQrCenterOpen] = useState(false);
  const [qrFilterType, setQrFilterType] = useState<'tables' | 'rooms' | 'reception'>('tables');

  // Form states for Table
  const [formTableNumber, setFormTableNumber] = useState('');
  const [formFloorNumber, setFormFloorNumber] = useState(1);
  const [formHallId, setFormHallId] = useState('');
  const [formCapacity, setFormCapacity] = useState(4);
  const [formShape, setFormShape] = useState<'SQUARE' | 'ROUND' | 'RECTANGLE' | 'BOOTH'>('SQUARE');
  const [formWaiter, setFormWaiter] = useState('Floor Staff');
  const [formNotes, setFormNotes] = useState('');

  // Form states for Floor
  const [newFloorNumber, setNewFloorNumber] = useState(4);
  const [newFloorName, setNewFloorName] = useState('');
  const [newFloorShortName, setNewFloorShortName] = useState('');

  // Form states for Hall
  const [newHallFloorId, setNewHallFloorId] = useState('');
  const [newHallName, setNewHallName] = useState('');
  const [newHallDescription, setNewHallDescription] = useState('');
  const [newHallMaxCapacity, setNewHallMaxCapacity] = useState(50);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchOverview = async () => {
    try {
      setIsLoading(true);
      const [overviewResult, tablesResult] = await Promise.allSettled([
        apiFetch('/table-management/overview'),
        apiFetch('/table-management/tables'),
      ]);

      if (overviewResult.status === 'fulfilled' && overviewResult.value.ok) {
        const oData = await overviewResult.value.json().catch(() => null);
        if (oData?.success && Array.isArray(oData.data?.floors)) {
          setFloors(oData.data.floors);
          if (oData.data.floors.length > 0 && !newHallFloorId) {
            setNewHallFloorId(oData.data.floors[0].id || String(oData.data.floors[0].floorNumber));
          }
          if (oData.data.floors.length === 0) {
            setNewHallFloorId('');
          }
        }
      } else {
        console.warn('Table overview unavailable; floor/hall creation remains disabled.');
      }

      if (tablesResult.status === 'fulfilled' && tablesResult.value.ok) {
        const tData = await tablesResult.value.json().catch(() => null);
        if (tData?.success && Array.isArray(tData.data)) {
          setTables(tData.data);
          try {
            localStorage.setItem('spicehub_tables_cache', JSON.stringify(tData.data));
          } catch {}
        }
      }
    } catch (err) {
      console.warn('Failed to fetch table overview:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, 12000);
    return () => clearInterval(interval);
  }, []);

  // Floor stats computations
  const totalTables = tables.length;
  const occupiedCount = tables.filter((t) => t.currentStatus === 'OCCUPIED' || t.currentStatus === 'BILLING').length;
  const availableCount = tables.filter((t) => t.currentStatus === 'AVAILABLE').length;
  const reservedCount = tables.filter((t) => t.currentStatus === 'RESERVED').length;
  const cleaningCount = tables.filter((t) => t.currentStatus === 'CLEANING' || t.currentStatus === 'DIRTY').length;
  const totalCapacity = tables.reduce((acc, t) => acc + (t.capacity || 4), 0);
  const occupancyRate = totalTables > 0 ? Math.round((occupiedCount / totalTables) * 100) : 0;

  // Floor-specific counts
  const floor1Tables = tables.filter((t) => t.floorNumber === 1 || t.floorLevel.includes('1st'));
  const floor2Tables = tables.filter((t) => t.floorNumber === 2 || t.floorLevel.includes('2nd'));
  const floor3Tables = tables.filter((t) => t.floorNumber === 3 || t.floorLevel.includes('3rd') || t.floorLevel.includes('Rooftop'));

  const floor1HallsCount = floors.find((f) => f.floorNumber === 1)?.halls?.length || 2;
  const floor2HallsCount = floors.find((f) => f.floorNumber === 2)?.halls?.length || 3;
  const floor3HallsCount = floors.find((f) => f.floorNumber === 3)?.halls?.length || 2;

  // Halls available for current selected floor filter
  const activeHallsForFilter = useMemo(() => {
    if (selectedFloor === 'ALL') {
      return floors.flatMap((f) => f.halls || []);
    }
    const target = floors.find((f) => String(f.floorNumber) === selectedFloor);
    return target?.halls || [];
  }, [floors, selectedFloor]);

  // Filtered tables
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      // Floor filter
      if (selectedFloor !== 'ALL') {
        if (String(t.floorNumber) !== selectedFloor && !t.floorLevel.includes(`${selectedFloor}`)) {
          return false;
        }
      }

      // Hall filter
      if (selectedHall !== 'ALL') {
        if (t.hallId !== selectedHall && t.section.toLowerCase() !== selectedHall.toLowerCase()) {
          return false;
        }
      }

      // Status filter
      if (selectedStatus !== 'ALL') {
        if (t.currentStatus !== selectedStatus) {
          return false;
        }
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNum = t.tableNumber.toLowerCase().includes(q);
        const matchSec = t.section.toLowerCase().includes(q);
        const matchWaiter = (t.assignedWaiter || '').toLowerCase().includes(q);
        const matchNotes = (t.notes || '').toLowerCase().includes(q);
        return matchNum || matchSec || matchWaiter || matchNotes;
      }

      return true;
    });
  }, [tables, selectedFloor, selectedHall, selectedStatus, searchQuery]);

  // Handlers for Add/Edit Table
  const handleOpenAddTable = () => {
    setEditingTable(null);
    setFormTableNumber(`T-${tables.length + 1 < 10 ? '0' : ''}${tables.length + 1}`);
    setFormFloorNumber(selectedFloor !== 'ALL' ? Number(selectedFloor) : 1);
    const initialHalls = floors.find((f) => f.floorNumber === (selectedFloor !== 'ALL' ? Number(selectedFloor) : 1))?.halls || [];
    setFormHallId(initialHalls[0]?.id || 'hall-1-1');
    setFormCapacity(4);
    setFormShape('SQUARE');
    setFormWaiter('Ramesh Kumar');
    setFormNotes('');
    setIsTableModalOpen(true);
  };

  const handleOpenEditTable = (table: TableDTO) => {
    setEditingTable(table);
    setFormTableNumber(table.tableNumber);
    setFormFloorNumber(table.floorNumber);
    setFormHallId(table.hallId);
    setFormCapacity(table.capacity);
    setFormShape(table.shape);
    setFormWaiter(table.assignedWaiter || 'Floor Staff');
    setFormNotes(table.notes || '');
    setIsTableModalOpen(true);
  };

  const handleSaveTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTableNumber.trim()) return;

    const floorObj = floors.find((f) => f.floorNumber === formFloorNumber);
    const hallObj = floorObj?.halls?.find((h) => h.id === formHallId) || floorObj?.halls?.[0];

    const payload = {
      tableNumber: formTableNumber.trim().toUpperCase(),
      floorNumber: formFloorNumber,
      floorLevel: `${formFloorNumber}${formFloorNumber === 1 ? 'st' : formFloorNumber === 2 ? 'nd' : formFloorNumber === 3 ? 'rd' : 'th'} Floor`,
      hallId: hallObj?.id || formHallId,
      section: hallObj?.name || 'Grand AC Dining Hall',
      capacity: formCapacity,
      shape: formShape,
      assignedWaiter: formWaiter,
      notes: formNotes,
    };

    try {
      if (editingTable) {
        const res = await apiFetch(`/table-management/tables/${editingTable.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          showToast(`✓ Table ${payload.tableNumber} updated successfully!`);
        }
      } else {
        const res = await apiFetch('/table-management/tables', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          showToast(`✓ New Table ${payload.tableNumber} added to Floor ${formFloorNumber}!`);
        }
      }
      setIsTableModalOpen(false);
      fetchOverview();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  const handleDeleteTable = async (table: TableDTO) => {
    if (!window.confirm(`Are you sure you want to remove Table ${table.tableNumber} from Floor Layout?`)) return;

    try {
      const res = await apiFetch(`/table-management/tables/${table.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast(`✓ Table ${table.tableNumber} removed!`);
        fetchOverview();
      }
    } catch (err: any) {
      showToast(`Failed to delete table: ${err.message}`);
    }
  };

  const handleUpdateStatus = async (table: TableDTO, nextStatus: string) => {
    try {
      const res = await apiFetch(`/table-management/tables/${table.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        showToast(`✓ Table ${table.tableNumber} marked as ${nextStatus}!`);
        fetchOverview();
      }
    } catch (err: any) {
      showToast(`Status update failed: ${err.message}`);
    }
  };

  const handleCreateFloor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFloorName.trim()) return;

    try {
      const res = await apiFetch('/table-management/floors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          floorNumber: newFloorNumber,
          name: newFloorName.trim(),
          shortName: newFloorShortName.trim() || `Floor ${newFloorNumber}`,
        }),
      });
      if (res.ok) {
        showToast(`✓ Floor ${newFloorNumber} created successfully!`);
        setIsFloorModalOpen(false);
        setNewFloorName('');
        fetchOverview();
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  const handleCreateHall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHallName.trim()) return;
    if (!newHallFloorId) {
      showToast('Load a floor from the backend before creating a hall.');
      return;
    }

    try {
      const res = await apiFetch('/table-management/halls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          floorId: newHallFloorId,
          name: newHallName.trim(),
          description: newHallDescription.trim(),
          maxCapacity: newHallMaxCapacity,
        }),
      });
      if (res.ok) {
        showToast(`✓ Hall "${newHallName}" created!`);
        setIsHallModalOpen(false);
        setNewHallName('');
        setNewHallDescription('');
        fetchOverview();
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  return (
    <div
      className={`min-h-full p-4 md:p-6 lg:p-8 space-y-6 transition-colors duration-200 font-sans ${
        isDark ? 'bg-[#0a0d14] text-slate-100' : 'bg-[#f8f9fc] text-slate-900'
      }`}
    >
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#ea580c] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-bounce border border-orange-400/40">
          <CheckCircle2 className="w-5 h-5 text-amber-200" />
          <span className="font-bold text-xs sm:text-sm">{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. STUDIO HEADER WITH MULTI-FLOOR / HALL MANAGEMENT ACTIONS                */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-950/30">
              {mode === 'OUTLETS' ? <Building className="w-5 h-5" /> : <Armchair className="w-5 h-5" />}
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
                <span>{mode === 'OUTLETS' ? 'Restaurant Outlets & Floor Layout' : 'Table & Multi-Floor Management Studio'}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  LIVE SYNC
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {mode === 'OUTLETS'
                  ? 'Configure multi-hall dining outlets, rooftop terraces, bar stations, and outlet seating capacity.'
                  : 'Manage Floor 1, Floor 2 Banquet Halls, seating capacity, table shapes & instant QR customer menus.'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsPrintableQrCenterOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold border border-indigo-500/40 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-400" />
            <span>🖨️ Printable QR Center</span>
          </button>

          <button
            onClick={() => setIsFloorModalOpen(true)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
              isDark
                ? 'bg-slate-900/90 border-slate-700 text-slate-300 hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'
            }`}
          >
            <Building className="w-3.5 h-3.5 text-amber-400" />
            <span>+ Add Floor</span>
          </button>

          <button
            onClick={() => setIsHallModalOpen(true)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
              isDark
                ? 'bg-slate-900/90 border-slate-700 text-slate-300 hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'
            }`}
          >
            <DoorOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>+ Add Hall / Section</span>
          </button>

          <button
            onClick={handleOpenAddTable}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs hover:brightness-110 transition shadow-md shadow-orange-950/40 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
            <span>+ Add New Table</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. STATS RIBBON: FLOOR 1, FLOOR 2 BANQUET, & OCCUPANCY METRICS            */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Tables */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            isDark ? 'bg-[#0f131d] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1 font-bold">
            <span>Total Tables</span>
            <Armchair className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white">{totalTables}</div>
          <div className="text-[10px] text-slate-400 mt-1">Across {floors.length} Floors & Halls</div>
        </div>

        {/* Floor 1 Count */}
        <div
          onClick={() => {
            setSelectedFloor('1');
            setSelectedHall('ALL');
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer hover:border-amber-500/50 ${
            selectedFloor === '1'
              ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5'
              : isDark
              ? 'bg-[#0f131d] border-slate-800/80'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-amber-400 text-xs mb-1 font-bold">
            <span>1st Floor</span>
            <span className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded">
              {floor1HallsCount} Halls
            </span>
          </div>
          <div className="text-2xl font-black text-white">{floor1Tables.length} Tables</div>
          <div className="text-[10px] text-slate-400 mt-1">AC Dining & Garden</div>
        </div>

        {/* Floor 2 Count (Banquets & Suites) */}
        <div
          onClick={() => {
            setSelectedFloor('2');
            setSelectedHall('ALL');
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer hover:border-amber-500/50 ${
            selectedFloor === '2'
              ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5'
              : isDark
              ? 'bg-[#0f131d] border-slate-800/80'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-amber-400 text-xs mb-1 font-bold">
            <span>2nd Floor</span>
            <span className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded">
              {floor2HallsCount} Halls
            </span>
          </div>
          <div className="text-2xl font-black text-white">{floor2Tables.length} Tables</div>
          <div className="text-[10px] text-slate-400 mt-1">Banquet, Suites & VIP</div>
        </div>

        {/* Floor 3 / Rooftop */}
        <div
          onClick={() => {
            setSelectedFloor('3');
            setSelectedHall('ALL');
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer hover:border-amber-500/50 ${
            selectedFloor === '3'
              ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5'
              : isDark
              ? 'bg-[#0f131d] border-slate-800/80'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-amber-400 text-xs mb-1 font-bold">
            <span>3rd Floor</span>
            <span className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded">
              {floor3HallsCount} Halls
            </span>
          </div>
          <div className="text-2xl font-black text-white">{floor3Tables.length} Tables</div>
          <div className="text-[10px] text-slate-400 mt-1">Rooftop Lounge & Pool</div>
        </div>

        {/* Available Tables */}
        <div
          onClick={() => setSelectedStatus('AVAILABLE')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            selectedStatus === 'AVAILABLE'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20'
              : isDark
              ? 'bg-[#0f131d] border-slate-800/80'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-400 text-xs mb-1 font-bold">
            <span>Available</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl font-black text-white">{availableCount}</div>
          <div className="text-[10px] text-emerald-400 mt-1">Ready to seat guests</div>
        </div>

        {/* Occupied Tables */}
        <div
          onClick={() => setSelectedStatus('OCCUPIED')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            selectedStatus === 'OCCUPIED'
              ? 'border-rose-500 ring-2 ring-rose-500/20'
              : isDark
              ? 'bg-[#0f131d] border-slate-800/80'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-rose-400 text-xs mb-1 font-bold">
            <span>Occupied</span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-white">{occupiedCount}</div>
          <div className="text-[10px] text-rose-400 mt-1">{occupancyRate}% Floor Occupancy</div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. FLOOR-WISE BREAKDOWN MATRIX CARDS (EXACT ANSWER TO USER'S QUESTION)     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Floor 1 Matrix Card */}
        <div
          className={`p-5 rounded-3xl border transition-all relative overflow-hidden ${
            selectedFloor === '1'
              ? 'border-amber-500 ring-2 ring-amber-500/20 bg-gradient-to-br from-amber-500/10 via-[#0f131d] to-[#0f131d]'
              : isDark
              ? 'bg-[#0f131d] border-slate-800/80'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300">
                Floor 1 (Ground)
              </span>
              <h3 className="text-base font-black mt-1 text-white">1st Floor • Main Dining</h3>
            </div>
            <div className="text-right">
              <span className="text-xl font-black text-white">{floor1Tables.length}</span>
              <span className="text-xs text-slate-400"> tables</span>
            </div>
          </div>

          <div className="space-y-2 mt-4 pt-3 border-t border-slate-800/60 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Active Halls:</span>
              <span className="font-bold text-white">2 Halls</span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="px-2 py-1 rounded-lg bg-slate-800/80 text-[11px] font-semibold text-slate-200 border border-slate-700">
                🏛️ Grand AC Dining Hall (10)
              </span>
              <span className="px-2 py-1 rounded-lg bg-slate-800/80 text-[11px] font-semibold text-slate-200 border border-slate-700">
                🌿 Open Garden Patio (5)
              </span>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-slate-400">Seating Capacity:</span>
              <span className="font-bold text-amber-400">56 Guests</span>
            </div>
          </div>
        </div>

        {/* Floor 2 Matrix Card (Banquets & Suites) */}
        <div
          className={`p-5 rounded-3xl border transition-all relative overflow-hidden ${
            selectedFloor === '2'
              ? 'border-amber-500 ring-2 ring-amber-500/20 bg-gradient-to-br from-amber-500/10 via-[#0f131d] to-[#0f131d]'
              : isDark
              ? 'bg-[#0f131d] border-slate-800/80'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300">
                Floor 2 (Second)
              </span>
              <h3 className="text-base font-black mt-1 text-white">2nd Floor • Banquet & Suites</h3>
            </div>
            <div className="text-right">
              <span className="text-xl font-black text-white">{floor2Tables.length}</span>
              <span className="text-xs text-slate-400"> tables</span>
            </div>
          </div>

          <div className="space-y-2 mt-4 pt-3 border-t border-slate-800/60 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Active Halls:</span>
              <span className="font-bold text-white">3 Halls</span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="px-2 py-1 rounded-lg bg-slate-800/80 text-[11px] font-semibold text-slate-200 border border-slate-700">
                👑 Royal Banquet Hall (8)
              </span>
              <span className="px-2 py-1 rounded-lg bg-slate-800/80 text-[11px] font-semibold text-slate-200 border border-slate-700">
                👨‍👩‍👧 Family AC Suite (6)
              </span>
              <span className="px-2 py-1 rounded-lg bg-slate-800/80 text-[11px] font-semibold text-slate-200 border border-slate-700">
                💎 Executive VIP PDR (2)
              </span>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-slate-400">Seating Capacity:</span>
              <span className="font-bold text-amber-400">130 Guests</span>
            </div>
          </div>
        </div>

        {/* Floor 3 Matrix Card (Rooftop & Poolside) */}
        <div
          className={`p-5 rounded-3xl border transition-all relative overflow-hidden ${
            selectedFloor === '3'
              ? 'border-amber-500 ring-2 ring-amber-500/20 bg-gradient-to-br from-amber-500/10 via-[#0f131d] to-[#0f131d]'
              : isDark
              ? 'bg-[#0f131d] border-slate-800/80'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300">
                Floor 3 (Third)
              </span>
              <h3 className="text-base font-black mt-1 text-white">3rd Floor • Rooftop Lounge</h3>
            </div>
            <div className="text-right">
              <span className="text-xl font-black text-white">{floor3Tables.length}</span>
              <span className="text-xs text-slate-400"> tables</span>
            </div>
          </div>

          <div className="space-y-2 mt-4 pt-3 border-t border-slate-800/60 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Active Halls:</span>
              <span className="font-bold text-white">2 Halls</span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="px-2 py-1 rounded-lg bg-slate-800/80 text-[11px] font-semibold text-slate-200 border border-slate-700">
                🌆 Skyview Rooftop Lounge (6)
              </span>
              <span className="px-2 py-1 rounded-lg bg-slate-800/80 text-[11px] font-semibold text-slate-200 border border-slate-700">
                🏊 Poolside Deck Bar (4)
              </span>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-slate-400">Seating Capacity:</span>
              <span className="font-bold text-amber-400">44 Guests</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MULTI-LEVEL FILTER CONTROLS: FLOOR SELECTOR & DYNAMIC HALL SELECTOR     */}
      {/* ========================================================================= */}
      <div
        className={`p-4 rounded-3xl border space-y-3.5 ${
          isDark ? 'bg-[#0e121b] border-slate-800/90' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        {/* Floor Level Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider mr-2 flex items-center gap-1">
              <Building className="w-3.5 h-3.5 text-amber-400" />
              <span>Floor:</span>
            </span>

            <button
              onClick={() => {
                setSelectedFloor('ALL');
                setSelectedHall('ALL');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedFloor === 'ALL'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              All Floors ({totalTables})
            </button>

            <button
              onClick={() => {
                setSelectedFloor('1');
                setSelectedHall('ALL');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedFloor === '1'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              1st Floor ({floor1Tables.length})
            </button>

            <button
              onClick={() => {
                setSelectedFloor('2');
                setSelectedHall('ALL');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedFloor === '2'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              2nd Floor ({floor2Tables.length})
            </button>

            <button
              onClick={() => {
                setSelectedFloor('3');
                setSelectedHall('ALL');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedFloor === '3'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              3rd Floor / Rooftop ({floor3Tables.length})
            </button>
          </div>

          {/* Quick Search Bar */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search table, waiter, section..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
          </div>
        </div>

        {/* Dynamic Hall / Section Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/50">
          <span className="text-xs font-black text-slate-400 uppercase tracking-wider mr-2 flex items-center gap-1">
            <DoorOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>Hall / Area:</span>
          </span>

          <button
            onClick={() => setSelectedHall('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
              selectedHall === 'ALL'
                ? 'bg-indigo-600 text-white font-black'
                : 'bg-slate-800/40 text-slate-400 hover:text-slate-200'
            }`}
          >
            All Halls
          </button>

          {activeHallsForFilter.map((hall) => {
            const isSel = selectedHall === hall.id || selectedHall === hall.name;
            const hCount = tables.filter(
              (t) => t.hallId === hall.id || t.section.toLowerCase() === hall.name.toLowerCase()
            ).length;
            return (
              <button
                key={hall.id}
                onClick={() => setSelectedHall(hall.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  isSel
                    ? 'bg-indigo-600 text-white font-black'
                    : 'bg-slate-800/40 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{hall.name}</span>
                <span className="text-[10px] opacity-75">({hCount})</span>
              </button>
            );
          })}

          <div className="ml-auto flex items-center gap-1.5 text-xs">
            <span className="text-slate-400">Status:</span>
            {['ALL', 'AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING'].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  selectedStatus === st
                    ? st === 'AVAILABLE'
                      ? 'bg-emerald-600 text-white'
                      : st === 'OCCUPIED'
                      ? 'bg-rose-600 text-white'
                      : st === 'RESERVED'
                      ? 'bg-blue-600 text-white'
                      : 'bg-amber-600 text-white'
                    : 'bg-slate-800/50 text-slate-400'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. VISUAL TABLE GRID CARDS                                                */}
      {/* ========================================================================= */}
      <div>
        <div className="flex items-center justify-between mb-3 text-xs text-slate-400 font-bold">
          <span>
            Showing {filteredTables.length} Tables matching layout criteria
          </span>
          <button
            onClick={fetchOverview}
            className="flex items-center gap-1 text-amber-400 hover:underline"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Layout</span>
          </button>
        </div>

        {filteredTables.length === 0 ? (
          <div
            className={`p-12 text-center rounded-3xl border ${
              isDark ? 'bg-[#0f131d] border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
            }`}
          >
            <Armchair className="w-12 h-12 mx-auto text-slate-500 mb-3 opacity-40" />
            <h3 className="font-bold text-sm text-white">No Tables Found</h3>
            <p className="text-xs mt-1">Try resetting the floor or hall filters.</p>
            <button
              onClick={() => {
                setSelectedFloor('ALL');
                setSelectedHall('ALL');
                setSelectedStatus('ALL');
                setSearchQuery('');
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTables.map((table) => {
              const isOccupied = table.currentStatus === 'OCCUPIED' || table.currentStatus === 'BILLING';
              const isAvailable = table.currentStatus === 'AVAILABLE';
              const isReserved = table.currentStatus === 'RESERVED';
              const isCleaning = table.currentStatus === 'CLEANING' || table.currentStatus === 'DIRTY';

              return (
                <div
                  key={table.id}
                  className={`p-4 rounded-3xl border transition-all hover:shadow-xl relative flex flex-col justify-between group ${
                    isOccupied
                      ? 'border-rose-500/50 bg-rose-950/10'
                      : isAvailable
                      ? 'border-emerald-500/30 bg-[#0f131d]'
                      : isReserved
                      ? 'border-blue-500/40 bg-blue-950/10'
                      : 'border-amber-500/40 bg-amber-950/10'
                  }`}
                >
                  <div>
                    {/* Top Table Header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm border ${
                            isOccupied
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : isAvailable
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : isReserved
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          }`}
                        >
                          {table.tableNumber}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-sm text-white">Table {table.tableNumber}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium line-clamp-1">
                            {table.floorLevel} • {table.section}
                          </span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide border flex items-center gap-1 shrink-0 ${
                          isOccupied
                            ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                            : isAvailable
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                            : isReserved
                            ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                            : 'bg-amber-500/20 border-amber-500 text-amber-300'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isOccupied
                              ? 'bg-rose-400 animate-pulse'
                              : isAvailable
                              ? 'bg-emerald-400'
                              : isReserved
                              ? 'bg-blue-400'
                              : 'bg-amber-400'
                          }`}
                        />
                        <span>{table.currentStatus}</span>
                      </span>
                    </div>

                    {/* Capacity & Shape */}
                    <div className="flex items-center justify-between text-xs py-2 border-y border-slate-800/60 mt-3 text-slate-300">
                      <span className="flex items-center gap-1 font-bold">
                        <Users className="w-3.5 h-3.5 text-amber-400" />
                        <span>{table.capacity} Guests</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 uppercase font-black">
                        {table.shape} TABLE
                      </span>
                    </div>

                    {/* Waiter & Notes */}
                    <div className="mt-2.5 space-y-1 text-xs">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Assigned Staff:</span>
                        <span className="font-bold text-slate-200">{table.assignedWaiter || 'Floor Staff'}</span>
                      </div>
                      {table.notes && (
                        <p className="text-[10px] text-amber-400/90 italic line-clamp-1 bg-amber-500/5 px-1.5 py-0.5 rounded">
                          📌 {table.notes}
                        </p>
                      )}
                    </div>

                    {/* Live Order Billing info if occupied */}
                    {isOccupied && table.activeOrderTotal > 0 && (
                      <div className="mt-2 p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between text-xs font-bold text-rose-300">
                        <span>Running Bill:</span>
                        <span className="text-sm font-black text-rose-200">₹{table.activeOrderTotal}</span>
                      </div>
                    )}
                  </div>

                  {/* Table Actions Toolbar */}
                  <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between gap-1.5">
                    {/* Status Changer Toggle */}
                    <div className="flex items-center gap-1">
                      {isAvailable && (
                        <button
                          onClick={() => handleUpdateStatus(table, 'OCCUPIED')}
                          className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-black transition"
                          title="Seat Guests"
                        >
                          Seat Guests
                        </button>
                      )}
                      {isOccupied && (
                        <button
                          onClick={() => handleUpdateStatus(table, 'CLEANING')}
                          className="px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-black transition"
                          title="Flag for Cleaning"
                        >
                          Clear & Clean
                        </button>
                      )}
                      {isCleaning && (
                        <button
                          onClick={() => handleUpdateStatus(table, 'AVAILABLE')}
                          className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black transition"
                          title="Mark Sanitized"
                        >
                          Mark Ready
                        </button>
                      )}
                      {isReserved && (
                        <button
                          onClick={() => handleUpdateStatus(table, 'OCCUPIED')}
                          className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-black transition"
                          title="Arrived & Seat"
                        >
                          Seat
                        </button>
                      )}
                    </div>

                    {/* QR, Edit, Delete Icons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedQrTable(table)}
                        className="p-1.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition"
                        title="View Table QR Code"
                      >
                        <QrCode className="w-3.5 h-3.5 text-amber-400" />
                      </button>

                      <button
                        onClick={() => handleOpenEditTable(table)}
                        className="p-1.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition"
                        title="Edit Table"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteTable(table)}
                        className="p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        title="Delete Table"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 6. MODAL: + ADD / EDIT TABLE                                              */}
      {/* ========================================================================= */}
      {isTableModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div
            className={`max-w-lg w-full rounded-3xl border p-6 space-y-5 shadow-2xl ${
              isDark ? 'bg-[#121622] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                  <Armchair className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base">
                    {editingTable ? `Edit Table ${editingTable.tableNumber}` : 'Create New Dining Table'}
                  </h3>
                  <p className="text-xs text-slate-400">Configure floor location, capacity & shape</p>
                </div>
              </div>
              <button
                onClick={() => setIsTableModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTable} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Table Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. T-15, B-09, VIP-3"
                    value={formTableNumber}
                    onChange={(e) => setFormTableNumber(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Floor Level</label>
                  <select
                    value={formFloorNumber}
                    onChange={(e) => {
                      const fNum = Number(e.target.value);
                      setFormFloorNumber(fNum);
                      const fHalls = floors.find((f) => f.floorNumber === fNum)?.halls || [];
                      if (fHalls.length > 0) setFormHallId(fHalls[0].id);
                    }}
                    className={`w-full p-2.5 rounded-xl border text-xs ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value={1}>1st Floor (Ground & Main Dining)</option>
                    <option value={2}>2nd Floor (Banquets & Luxury Suites)</option>
                    <option value={3}>3rd Floor (Rooftop & Sky Lounge)</option>
                    {floors
                      .filter((f) => f.floorNumber > 3)
                      .map((f) => (
                        <option key={f.id} value={f.floorNumber}>
                          {f.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Hall / Section</label>
                <select
                  value={formHallId}
                  onChange={(e) => setFormHallId(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  {(floors.find((f) => f.floorNumber === formFloorNumber)?.halls || []).map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} (Max Cap: {h.maxCapacity || 40})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Seating Capacity</label>
                  <select
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(Number(e.target.value))}
                    className={`w-full p-2.5 rounded-xl border text-xs ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value={2}>2 Guests (Couple Table)</option>
                    <option value={4}>4 Guests (Standard Table)</option>
                    <option value={6}>6 Guests (Family Table)</option>
                    <option value={8}>8 Guests (Large Group)</option>
                    <option value={10}>10 Guests (Banquet Round)</option>
                    <option value={12}>12 Guests (Grand Feast)</option>
                    <option value={16}>16 Guests (VIP Boardroom)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Table Shape</label>
                  <select
                    value={formShape}
                    onChange={(e) => setFormShape(e.target.value as any)}
                    className={`w-full p-2.5 rounded-xl border text-xs ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="SQUARE">Square</option>
                    <option value="ROUND">Round</option>
                    <option value="RECTANGLE">Rectangle</option>
                    <option value="BOOTH">Booth</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Assigned Waiter / Captain</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar, Sunita Sharma"
                  value={formWaiter}
                  onChange={(e) => setFormWaiter(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Notes / Landmarks</label>
                <input
                  type="text"
                  placeholder="e.g. Near Stage, Window View, AC Duct Facing"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={() => setIsTableModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition"
                >
                  {editingTable ? 'Update Table' : 'Save & Publish Table'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL: + ADD NEW FLOOR                                                 */}
      {/* ========================================================================= */}
      {isFloorModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div
            className={`max-w-md w-full rounded-3xl border p-6 space-y-4 shadow-2xl ${
              isDark ? 'bg-[#121622] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-base">Add New Floor</h3>
              </div>
              <button
                onClick={() => setIsFloorModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFloor} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Floor Number</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  required
                  value={newFloorNumber}
                  onChange={(e) => setNewFloorNumber(Number(e.target.value))}
                  className={`w-full p-2.5 rounded-xl border text-xs ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Full Floor Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 4th Floor (Executive Penthouse Lounge)"
                  value={newFloorName}
                  onChange={(e) => setNewFloorName(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Short Name</label>
                <input
                  type="text"
                  placeholder="e.g. Floor 4"
                  value={newFloorShortName}
                  onChange={(e) => setNewFloorShortName(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFloorModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs"
                >
                  Create Floor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. MODAL: + ADD NEW HALL / SECTION                                        */}
      {/* ========================================================================= */}
      {isHallModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div
            className={`max-w-md w-full rounded-3xl border p-6 space-y-4 shadow-2xl ${
              isDark ? 'bg-[#121622] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DoorOpen className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-base">Add New Hall / Section</h3>
              </div>
              <button
                onClick={() => setIsHallModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateHall} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Target Floor</label>
                <select
                  value={newHallFloorId}
                  onChange={(e) => setNewHallFloorId(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="">{floors.length ? 'Select a floor…' : 'No floors loaded from backend'}</option>
                  {floors.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Hall / Section Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kohinoor Grand Banquet Hall"
                  value={newHallName}
                  onChange={(e) => setNewHallName(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Crystal chandeliers, acoustic sound system"
                  value={newHallDescription}
                  onChange={(e) => setNewHallDescription(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Max Event Capacity</label>
                <input
                  type="number"
                  min="10"
                  max="500"
                  value={newHallMaxCapacity}
                  onChange={(e) => setNewHallMaxCapacity(Number(e.target.value))}
                  className={`w-full p-2.5 rounded-xl border text-xs ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsHallModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newHallFloorId}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save Hall
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. MODAL: 📱 TABLE QR CODE & DIRECT CUSTOMER ORDERING LINK                */}
      {/* ========================================================================= */}
      {selectedQrTable && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div
            className={`max-w-sm w-full rounded-3xl border p-6 text-center space-y-4 shadow-2xl ${
              isDark ? 'bg-[#121622] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                Official Dining QR
              </span>
              <button
                onClick={() => setSelectedQrTable(null)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="pt-2">
              <h3 className="text-xl font-black text-white">Table {selectedQrTable.tableNumber}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {selectedQrTable.floorLevel} • {selectedQrTable.section}
              </p>
            </div>

            {/* Scannable Dynamic QR Box */}
            <div className="p-4 bg-white rounded-2xl shadow-inner inline-block my-2 border border-slate-200">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                  getPortalUrl('customer', `/?hotelId=${hotelId}&table=${selectedQrTable.tableNumber}`)
                )}`}
                alt={`QR for Table ${selectedQrTable.tableNumber}`}
                className="w-44 h-44 object-contain mx-auto"
              />
              <div className="mt-2 text-center">
                <span className="font-black text-xs tracking-wider text-slate-900 block">
                  SCAN TO DINE IN
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  Table {selectedQrTable.tableNumber}
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-left">
              <span className="text-[10px] text-slate-400 block font-bold">Direct Ordering URL:</span>
              <span className="text-xs font-mono text-amber-300 truncate block">
                {getPortalUrl('customer', `/?hotelId=${hotelId}&table=${selectedQrTable.tableNumber}`)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                onClick={() => {
                  window.open(getPortalUrl('customer', `/?hotelId=${hotelId}&table=${selectedQrTable.tableNumber}`), '_blank');
                }}
                className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Menu</span>
              </button>
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') window.print();
                }}
                className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 shadow-xs"
                title="Print Standee"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Standee</span>
              </button>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(
                    getPortalUrl('customer', `/?hotelId=${hotelId}&table=${selectedQrTable.tableNumber}`)
                  );
                  showToast('✓ Link copied to clipboard!');
                }}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                title="Copy Link"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. MODAL: 🖨️ PRINTABLE QR CODE CENTER (RECEPTION & TABLE STANDEES)         */}
      {/* ========================================================================= */}
      {isPrintableQrCenterOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in">
          <div
            className={`max-w-4xl w-full max-h-[92vh] overflow-y-auto rounded-3xl border p-6 space-y-5 shadow-2xl flex flex-col ${
              isDark ? 'bg-[#101420] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight">
                    Reception & Dining Printable QR Center
                  </h2>
                  <p className="text-xs text-slate-400">
                    Preview, download, and print physical tent cards and standees for tables, rooms, and reception desk
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') window.print();
                  }}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Sheet (A4)</span>
                </button>
                <button
                  onClick={() => setIsPrintableQrCenterOpen(false)}
                  className="text-slate-400 hover:text-white font-bold p-1 rounded-lg"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2">
              {[
                { id: 'tables', label: '🍽️ Dining Tables (T-01 - T-24)' },
                { id: 'rooms', label: '🏨 Guest Rooms (101 - 310)' },
                { id: 'reception', label: '🛎️ Reception & Lobby Desk' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setQrFilterType(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    qrFilterType === tab.id
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : isDark
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Printable Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto pr-1">
              {qrFilterType === 'tables' &&
                (tables.length > 0 ? tables : [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ tableNumber: `T-${n}` }))).map(
                  (t: any, idx) => {
                    const tableNum = t.tableNumber || `T-${idx + 1}`;
                    const targetUrl = getPortalUrl('customer', `/?hotelId=${hotelId}&table=${tableNum}`);
                    return (
                      <div
                        key={idx}
                        className="bg-white text-slate-900 rounded-2xl p-4 border-2 border-amber-500/40 shadow-md flex flex-col items-center text-center relative"
                      >
                        <span className="text-[9px] font-black tracking-widest text-amber-700 uppercase mb-1">
                          SPICEHUB LUXURY HOTEL & DINE
                        </span>
                        <div className="w-12 h-0.5 bg-amber-500 rounded-full mb-2" />
                        <h4 className="text-xl font-black text-slate-900 tracking-tight">
                          Table {tableNum}
                        </h4>
                        <p className="text-[10px] text-slate-500 font-medium mb-3">
                          Dine-In Digital Self-Ordering
                        </p>

                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 shadow-inner my-1">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                              targetUrl
                            )}`}
                            alt={`Table ${tableNum} QR`}
                            className="w-36 h-36 object-contain"
                          />
                        </div>

                        <div className="mt-2 text-center">
                          <span className="text-[11px] font-black text-amber-900 block">
                            📲 SCAN WITH PHONE CAMERA
                          </span>
                          <span className="text-[9px] text-slate-500">
                            View Menu • Custom Cooking • Instant KOT
                          </span>
                        </div>

                        <div className="mt-3 w-full pt-2 border-t border-dashed border-slate-200 flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              window.open(targetUrl, '_blank');
                            }}
                            className="flex-1 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-[10px] font-bold"
                          >
                            Open Link
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (typeof window !== 'undefined') window.print();
                            }}
                            className="px-2 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-bold"
                          >
                            Print
                          </button>
                        </div>
                      </div>
                    );
                  }
                )}

              {qrFilterType === 'rooms' &&
                ['101', '102', '104', '201', '202', '204', '301', '302'].map((roomNum, idx) => {
                  const targetUrl = getPortalUrl('guest', `/?hotelId=${hotelId}&roomNumber=${roomNum}`);
                  return (
                    <div
                      key={idx}
                      className="bg-white text-slate-900 rounded-2xl p-4 border-2 border-indigo-500/40 shadow-md flex flex-col items-center text-center relative"
                    >
                      <span className="text-[9px] font-black tracking-widest text-indigo-700 uppercase mb-1">
                        IN-ROOM DINING & CONCIERGE
                      </span>
                      <div className="w-12 h-0.5 bg-indigo-500 rounded-full mb-2" />
                      <h4 className="text-xl font-black text-slate-900 tracking-tight">
                        Room {roomNum}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-medium mb-3">
                        24x7 Room Service & Housekeeping
                      </p>

                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 shadow-inner my-1">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                            targetUrl
                          )}`}
                          alt={`Room ${roomNum} QR`}
                          className="w-36 h-36 object-contain"
                        />
                      </div>

                      <div className="mt-2 text-center">
                        <span className="text-[11px] font-black text-indigo-900 block">
                          🛎️ SCAN FOR ROOM SERVICE
                        </span>
                        <span className="text-[9px] text-slate-500">
                          Food Delivery • Towels • Water • Housekeeping
                        </span>
                      </div>

                      <div className="mt-3 w-full pt-2 border-t border-dashed border-slate-200 flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            window.open(targetUrl, '_blank');
                          }}
                          className="flex-1 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-900 rounded-lg text-[10px] font-bold"
                        >
                          Open Link
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof window !== 'undefined') window.print();
                          }}
                          className="px-2 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-bold"
                        >
                          Print
                        </button>
                      </div>
                    </div>
                  );
                })}

              {qrFilterType === 'reception' && (
                <div className="sm:col-span-2 md:col-span-3 bg-white text-slate-900 rounded-3xl p-6 border-4 border-amber-500 shadow-xl flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 shadow-inner">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
                        getPortalUrl('customer', `/?hotelId=${hotelId}`)
                      )}`}
                      alt="Reception Standee QR"
                      className="w-52 h-52 object-contain"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <span className="text-xs font-black tracking-widest text-amber-700 uppercase">
                      OFFICIAL FRONT DESK STANDEE
                    </span>
                    <h3 className="text-2xl font-black text-slate-900">
                      Welcome to SpiceHub Luxury Hotel & Dine
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Place this high-visibility standee at your front desk and restaurant entrance. Guests can scan to
                      explore today&apos;s active menus, chef specials, beverage lists, or browse room amenities instantly.
                    </p>
                    <div className="pt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          window.open(getPortalUrl('customer', `/?hotelId=${hotelId}`), '_blank');
                        }}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-sm"
                      >
                        Open Digital Catalog
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== 'undefined') window.print();
                        }}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm"
                      >
                        Print Reception Standee (A4)
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
