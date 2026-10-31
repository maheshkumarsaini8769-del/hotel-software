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
  isDark = false,
  hotelId = getStoredHotelId(),
  mode = 'TABLES',
}) => {
  const [floors, setFloors] = useState<FloorDTO[]>([]);
  const [tables, setTables] = useState<TableDTO[]>([]);
  const [maxTables, setMaxTables] = useState<number>(20);
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
  const [qrFilterType, setQrFilterType] = useState<'tables' | 'rooms' | 'reception' | 'app'>('tables');
  const [detectedLanIp, setDetectedLanIp] = useState<string>('10.65.226.216');
  const [qrNetworkHost, setQrNetworkHost] = useState<string>(
    typeof window !== 'undefined' ? (localStorage.getItem('spicehub_qr_host') || '10.65.226.216') : '10.65.226.216'
  );
  const [serverApkInfo, setServerApkInfo] = useState<any>(null);

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
        if (oData?.success) {
          if (oData.data?.summary?.maxTables) {
            setMaxTables(Number(oData.data.summary.maxTables));
          }
          if (Array.isArray(oData.data?.floors)) {
            const normalizedFloors: FloorDTO[] = oData.data.floors.map((fl: any) => ({
              id: fl.id || fl.floorId || `fl-${fl.floorNumber}`,
              floorNumber: fl.floorNumber,
              name: fl.name || fl.floorName || `Floor ${fl.floorNumber}`,
              shortName: fl.shortName || `Floor ${fl.floorNumber}`,
              halls: Array.isArray(fl.halls) ? fl.halls : [],
              tablesCount: fl.tablesCount ?? fl.totalTables ?? 0,
              totalCapacity: fl.totalCapacity || 0,
            }));
            setFloors(normalizedFloors);
            if (normalizedFloors.length > 0) {
              setNewHallFloorId((prev) => {
                const exists = normalizedFloors.some((f) => f.id === prev);
                return exists && prev ? prev : normalizedFloors[0].id;
              });
            } else {
              setNewHallFloorId('');
            }
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
    fetch('/api/v1/system/network-info')
      .then((res) => res.json())
      .then((data) => {
        if (data?.lanIp) {
          setDetectedLanIp(data.lanIp);
          localStorage.setItem('spicehub_lan_ip', data.lanIp);
          if (!localStorage.getItem('spicehub_qr_host')) {
            setQrNetworkHost(data.lanIp);
          }
        }
        if (data?.apks) {
          setServerApkInfo(data.apks);
        }
      })
      .catch(() => {});
    const interval = setInterval(fetchOverview, 12000);
    return () => clearInterval(interval);
  }, []);

  const handleSetQrHost = (host: string) => {
    setQrNetworkHost(host);
    localStorage.setItem('spicehub_qr_host', host);
    showToast(`✓ QR Target Host updated to: ${host}`);
  };

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
    const targetFloorNum = selectedFloor !== 'ALL' ? Number(selectedFloor) : (floors[0]?.floorNumber || 1);
    setFormFloorNumber(targetFloorNum);
    const initialHalls = floors.find((f) => f.floorNumber === targetFloorNum)?.halls || [];
    setFormHallId(initialHalls[0]?.id || '');
    setFormCapacity(4);
    setFormShape('SQUARE');
    setFormWaiter('Floor Staff');
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
        const resData = await res.json().catch(() => null);
        if (res.ok) {
          showToast(`✓ Table ${payload.tableNumber} updated successfully!`);
          setIsTableModalOpen(false);
          fetchOverview();
        } else {
          showToast(`❌ ${resData?.message || 'Failed to update table'}`);
        }
      } else {
        const res = await apiFetch('/table-management/tables', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const resData = await res.json().catch(() => null);
        if (res.ok) {
          showToast(`✓ New Table ${payload.tableNumber} added to Floor ${formFloorNumber}!`);
          setIsTableModalOpen(false);
          fetchOverview();
        } else {
          showToast(`❌ ${resData?.message || 'Failed to create table: limit reached'}`);
        }
      }
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
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        showToast(`✓ Floor ${newFloorNumber} created successfully!`);
        setIsFloorModalOpen(false);
        setNewFloorName('');
        setNewFloorShortName('');
        await fetchOverview();
      } else {
        showToast(`Floor creation failed: ${data?.message || res.statusText}`);
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  const handleCreateHall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHallName.trim()) return;
    if (!newHallFloorId) {
      showToast('Select a target floor before creating a hall.');
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
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        showToast(`✓ Hall "${newHallName}" created!`);
        setIsHallModalOpen(false);
        setNewHallName('');
        setNewHallDescription('');
        await fetchOverview();
      } else {
        showToast(`Hall creation failed: ${data?.message || res.statusText}`);
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  return (
    <div className="min-h-full p-4 md:p-6 lg:p-8 space-y-6 bg-slate-50 text-slate-900 font-sans">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2.5 animate-bounce border border-blue-500">
          <CheckCircle2 className="w-5 h-5 text-white" />
          <span className="font-bold text-xs sm:text-sm">{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. STUDIO HEADER WITH MULTI-FLOOR / HALL MANAGEMENT ACTIONS                */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
              {mode === 'OUTLETS' ? <Building className="w-5 h-5" /> : <Armchair className="w-5 h-5" />}
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>{mode === 'OUTLETS' ? 'Restaurant Outlets & Floor Layout' : 'Table & Multi-Floor Management Studio'}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  LIVE SYNC
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
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
            className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5 shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Printable QR Center</span>
          </button>

          <button
            onClick={() => {
              const nextNum = floors.length > 0 ? Math.max(...floors.map((f) => f.floorNumber)) + 1 : 1;
              setNewFloorNumber(nextNum);
              setNewFloorName('');
              setNewFloorShortName(`Floor ${nextNum}`);
              setIsFloorModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5 shadow-xs"
          >
            <Building className="w-3.5 h-3.5 text-slate-600" />
            <span>+ Add Floor</span>
          </button>

          <button
            onClick={() => {
              if (floors.length > 0 && !newHallFloorId) {
                setNewHallFloorId(floors[0].id || String(floors[0].floorNumber));
              }
              setIsHallModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5 shadow-xs"
          >
            <DoorOpen className="w-3.5 h-3.5 text-slate-600" />
            <span>+ Add Hall / Section</span>
          </button>

          <button
            onClick={() => {
              if (totalTables >= maxTables) {
                showToast(`⚠️ Table capacity ceiling reached (${totalTables}/${maxTables}). SuperAdmin has allocated a maximum of ${maxTables} tables.`);
                return;
              }
              handleOpenAddTable();
            }}
            disabled={totalTables >= maxTables}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition flex items-center gap-1.5 shadow-xs ${
              totalTables >= maxTables
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            title={totalTables >= maxTables ? `SuperAdmin limit reached (${totalTables}/${maxTables})` : '+ Add New Table'}
          >
            <Plus className={`w-4 h-4 ${totalTables >= maxTables ? 'text-slate-400' : 'text-white'}`} />
            <span>{totalTables >= maxTables ? `Limit Reached (${totalTables}/${maxTables})` : '+ Add New Table'}</span>
          </button>
        </div>
      </div>

      {/* SuperAdmin Capacity Quota Warning Banner */}
      {totalTables >= maxTables && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5 text-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>SuperAdmin Table Ceiling Reached:</strong> This hotel is allocated a maximum ceiling of{' '}
              <strong>{maxTables} dining tables</strong> ({totalTables}/{maxTables} in use). Additional tables cannot be created. Please contact SuperAdmin to request a capacity upgrade.
            </span>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 font-bold uppercase text-[10px] tracking-wider shrink-0 border border-amber-200">
            Quota Full
          </span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. STATS RIBBON: TOTAL TABLES, FLOORS, HALLS & OCCUPANCY METRICS          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Tables */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1 font-semibold">
            <span>Allocated Tables</span>
            <Armchair className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <div className="text-2xl font-bold text-slate-900">{totalTables}</div>
            <span className="text-xs text-slate-400 font-semibold">/ {maxTables} max</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {maxTables - totalTables > 0 ? `${maxTables - totalTables} slots available` : 'SuperAdmin quota full'}
          </div>
        </div>

        {/* Total Floors */}
        <div
          onClick={() => {
            setSelectedFloor('ALL');
            setSelectedHall('ALL');
          }}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            selectedFloor === 'ALL'
              ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/40'
              : 'border-slate-200 bg-white shadow-xs hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1 font-semibold">
            <span>Active Floors</span>
            <Building className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{floors.length} Levels</div>
          <div className="text-[11px] text-slate-500 mt-1">Click to view all</div>
        </div>

        {/* Total Halls */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1 font-semibold">
            <span>Halls & Sections</span>
            <DoorOpen className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {floors.reduce((acc, f) => acc + (f.halls?.length || 0), 0)} Areas
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Dining & Banquets</div>
        </div>

        {/* Total Capacity */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1 font-semibold">
            <span>Seating Capacity</span>
            <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-bold">
              MAX
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{totalCapacity} Guests</div>
          <div className="text-[11px] text-slate-500 mt-1">Total property seats</div>
        </div>

        {/* Available Tables */}
        <div
          onClick={() => setSelectedStatus('AVAILABLE')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            selectedStatus === 'AVAILABLE'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/40'
              : 'border-slate-200 bg-white shadow-xs hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700 text-xs mb-1 font-semibold">
            <span>Available</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{availableCount}</div>
          <div className="text-[11px] text-emerald-700 mt-1">Ready to seat guests</div>
        </div>

        {/* Occupied Tables */}
        <div
          onClick={() => setSelectedStatus('OCCUPIED')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            selectedStatus === 'OCCUPIED'
              ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/40'
              : 'border-slate-200 bg-white shadow-xs hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-red-700 text-xs mb-1 font-semibold">
            <span>Occupied</span>
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{occupiedCount}</div>
          <div className="text-[11px] text-red-700 mt-1">{occupancyRate}% Floor Occupancy</div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. FLOOR-WISE BREAKDOWN MATRIX CARDS (DYNAMIC FOR ALL FLOORS)              */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {floors.map((fl) => {
          const flTables = tables.filter((t) => t.floorNumber === fl.floorNumber || t.floorLevel.includes(`${fl.floorNumber}`));
          const flCapacity = flTables.reduce((sum, t) => sum + (t.capacity || 4), 0);
          const isSelected = selectedFloor === String(fl.floorNumber);

          return (
            <div
              key={fl.id || fl.floorNumber}
              onClick={() => {
                setSelectedFloor(isSelected ? 'ALL' : String(fl.floorNumber));
                setSelectedHall('ALL');
              }}
              className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                isSelected
                  ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/40 shadow-xs'
                  : 'bg-white border-slate-200 shadow-xs hover:border-blue-300'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                    {fl.shortName || `Floor ${fl.floorNumber}`}
                  </span>
                  <h3 className="text-base font-bold mt-1 text-slate-900">{fl.name}</h3>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-slate-900">{flTables.length}</span>
                  <span className="text-xs text-slate-500"> tables</span>
                </div>
              </div>

              <div className="space-y-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Active Halls / Sections:</span>
                  <span className="font-semibold text-slate-800">{fl.halls.length} Halls</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {fl.halls.map((h) => {
                    const hTablesCount = flTables.filter(
                      (t) => t.hallId === h.id || t.section.toLowerCase() === h.name.toLowerCase()
                    ).length;
                    return (
                      <span
                        key={h.id}
                        className="px-2 py-1 rounded-lg bg-slate-50 text-[11px] font-medium text-slate-700 border border-slate-200"
                      >
                        🏛️ {h.name} ({hTablesCount})
                      </span>
                    );
                  })}
                  {fl.halls.length === 0 && (
                    <span className="text-[11px] text-slate-400 italic">No halls added yet. Click "+ Add Hall / Section"</span>
                  )}
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-slate-500 font-medium">Seating Capacity:</span>
                  <span className="font-bold text-blue-600">{flCapacity} Guests</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 4. MULTI-LEVEL FILTER CONTROLS: FLOOR SELECTOR & DYNAMIC HALL SELECTOR     */}
      {/* ========================================================================= */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3.5">
        {/* Floor Level Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-2 flex items-center gap-1">
              <Building className="w-3.5 h-3.5 text-blue-600" />
              <span>Floor:</span>
            </span>

            <button
              onClick={() => {
                setSelectedFloor('ALL');
                setSelectedHall('ALL');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedFloor === 'ALL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Floors ({totalTables})
            </button>

            {floors.map((fl) => {
              const flCount = tables.filter((t) => t.floorNumber === fl.floorNumber || t.floorLevel.includes(`${fl.floorNumber}`)).length;
              const isSelected = selectedFloor === String(fl.floorNumber);
              return (
                <button
                  key={fl.id || fl.floorNumber}
                  onClick={() => {
                    setSelectedFloor(String(fl.floorNumber));
                    setSelectedHall('ALL');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {fl.shortName || `Floor ${fl.floorNumber}`} ({flCount})
                </button>
              );
            })}
          </div>

          {/* Quick Search Bar */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search table, waiter, section..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Dynamic Hall / Section Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-2 flex items-center gap-1">
            <DoorOpen className="w-3.5 h-3.5 text-blue-600" />
            <span>Hall / Area:</span>
          </span>

          <button
            onClick={() => setSelectedHall('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              selectedHall === 'ALL'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                  isSel
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{hall.name}</span>
                <span className="text-[10px] opacity-75">({hCount})</span>
              </button>
            );
          })}

          <div className="ml-auto flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-medium">Status:</span>
            {['ALL', 'AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING'].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                  selectedStatus === st
                    ? st === 'AVAILABLE'
                      ? 'bg-emerald-600 text-white'
                      : st === 'OCCUPIED'
                      ? 'bg-red-600 text-white'
                      : st === 'RESERVED'
                      ? 'bg-blue-600 text-white'
                      : 'bg-amber-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
        <div className="flex items-center justify-between mb-3 text-xs text-slate-500 font-semibold">
          <span>
            Showing {filteredTables.length} Tables matching layout criteria
          </span>
          <button
            onClick={fetchOverview}
            className="flex items-center gap-1 text-blue-600 hover:underline"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Layout</span>
          </button>
        </div>

        {filteredTables.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-xs">
            <Armchair className="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-40" />
            <h3 className="font-bold text-sm text-slate-800">No Tables Found</h3>
            <p className="text-xs mt-1 text-slate-500">Try resetting the floor or hall filters.</p>
            <button
              onClick={() => {
                setSelectedFloor('ALL');
                setSelectedHall('ALL');
                setSelectedStatus('ALL');
                setSearchQuery('');
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTables.map((table, idx) => {
              const isOccupied = table.currentStatus === 'OCCUPIED' || table.currentStatus === 'BILLING';
              const isAvailable = table.currentStatus === 'AVAILABLE';
              const isReserved = table.currentStatus === 'RESERVED';
              const isCleaning = table.currentStatus === 'CLEANING' || table.currentStatus === 'DIRTY';

              return (
                <div
                  key={table.id ? `${table.id}-${idx}` : `table-${idx}`}
                  className={`p-4 rounded-xl border transition-all hover:shadow-md relative flex flex-col justify-between group bg-white ${
                    isOccupied
                      ? 'border-l-4 border-l-red-500 border-slate-200 shadow-xs'
                      : isAvailable
                      ? 'border-l-4 border-l-emerald-500 border-slate-200 shadow-xs'
                      : isReserved
                      ? 'border-l-4 border-l-blue-500 border-slate-200 shadow-xs'
                      : 'border-l-4 border-l-amber-500 border-slate-200 shadow-xs'
                  }`}
                >
                  <div>
                    {/* Top Table Header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm border ${
                            isOccupied
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : isAvailable
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : isReserved
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {table.tableNumber}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-slate-900">Table {table.tableNumber}</span>
                          </div>
                          <span className="text-[11px] text-slate-500 font-medium line-clamp-1">
                            {table.floorLevel} • {table.section}
                          </span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide border flex items-center gap-1 shrink-0 ${
                          isOccupied
                            ? 'bg-red-50 border-red-200 text-red-700'
                            : isAvailable
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : isReserved
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : 'bg-amber-50 border-amber-200 text-amber-700'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isOccupied
                              ? 'bg-red-500'
                              : isAvailable
                              ? 'bg-emerald-500'
                              : isReserved
                              ? 'bg-blue-500'
                              : 'bg-amber-500'
                          }`}
                        />
                        <span>{table.currentStatus}</span>
                      </span>
                    </div>

                    {/* Capacity & Shape */}
                    <div className="flex items-center justify-between text-xs py-2 border-y border-slate-100 mt-3 text-slate-700">
                      <span className="flex items-center gap-1 font-semibold">
                        <Users className="w-3.5 h-3.5 text-blue-600" />
                        <span>{table.capacity} Guests</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 uppercase font-bold border border-slate-200">
                        {table.shape} TABLE
                      </span>
                    </div>

                    {/* Waiter & Notes */}
                    <div className="mt-2.5 space-y-1 text-xs">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Assigned Staff:</span>
                        <span className="font-semibold text-slate-800">{table.assignedWaiter || 'Floor Staff'}</span>
                      </div>
                      {table.notes && (
                        <p className="text-[10px] text-slate-600 italic line-clamp-1 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                          📌 {table.notes}
                        </p>
                      )}
                    </div>

                    {/* Live Order Billing info if occupied */}
                    {isOccupied && table.activeOrderTotal > 0 && (
                      <div className="mt-2 p-2 rounded-lg bg-red-50 border border-red-200 flex items-center justify-between text-xs font-bold text-red-700">
                        <span>Running Bill:</span>
                        <span className="text-sm font-bold text-red-800">₹{table.activeOrderTotal}</span>
                      </div>
                    )}
                  </div>

                  {/* Table Actions Toolbar */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                    {/* Status Changer Toggle */}
                    <div className="flex items-center gap-1">
                      {isAvailable && (
                        <button
                          onClick={() => handleUpdateStatus(table, 'OCCUPIED')}
                          className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold transition shadow-xs"
                          title="Seat Guests"
                        >
                          Seat Guests
                        </button>
                      )}
                      {isOccupied && (
                        <button
                          onClick={() => handleUpdateStatus(table, 'CLEANING')}
                          className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold transition shadow-xs"
                          title="Flag for Cleaning"
                        >
                          Clear & Clean
                        </button>
                      )}
                      {isCleaning && (
                        <button
                          onClick={() => handleUpdateStatus(table, 'AVAILABLE')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition shadow-xs"
                          title="Mark Sanitized"
                        >
                          Mark Ready
                        </button>
                      )}
                      {isReserved && (
                        <button
                          onClick={() => handleUpdateStatus(table, 'OCCUPIED')}
                          className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold transition shadow-xs"
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
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition"
                        title="View Table QR Code"
                      >
                        <QrCode className="w-3.5 h-3.5 text-blue-600" />
                      </button>

                      <button
                        onClick={() => handleOpenEditTable(table)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
                        title="Edit Table"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteTable(table)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
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
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="max-w-lg w-full rounded-2xl border border-slate-200 bg-white text-slate-900 p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-bold">
                  <Armchair className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {editingTable ? `Edit Table ${editingTable.tableNumber}` : 'Create New Dining Table'}
                  </h3>
                  <p className="text-xs text-slate-500">Configure floor location, capacity & shape</p>
                </div>
              </div>
              <button
                onClick={() => setIsTableModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTable} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Table Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. T-15, B-09, VIP-3"
                    value={formTableNumber}
                    onChange={(e) => setFormTableNumber(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Floor Level</label>
                  <select
                    value={formFloorNumber}
                    onChange={(e) => {
                      const fNum = Number(e.target.value);
                      setFormFloorNumber(fNum);
                      const fHalls = floors.find((f) => f.floorNumber === fNum)?.halls || [];
                      setFormHallId(fHalls[0]?.id || '');
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {floors.map((f) => (
                      <option key={f.id || f.floorNumber} value={f.floorNumber}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Hall / Section</label>
                <select
                  value={formHallId}
                  onChange={(e) => setFormHallId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  {(floors.find((f) => f.floorNumber === formFloorNumber)?.halls || []).map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} (Max Cap: {h.maxCapacity || 40})
                    </option>
                  ))}
                  {(!floors.find((f) => f.floorNumber === formFloorNumber)?.halls?.length) && (
                    <option value="">No halls in this floor yet</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Seating Capacity</label>
                  <select
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
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
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Table Shape</label>
                  <select
                    value={formShape}
                    onChange={(e) => setFormShape(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="SQUARE">Square</option>
                    <option value="ROUND">Round</option>
                    <option value="RECTANGLE">Rectangle</option>
                    <option value="BOOTH">Booth</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Assigned Waiter / Captain</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar, Sunita Sharma"
                  value={formWaiter}
                  onChange={(e) => setFormWaiter(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Notes / Landmarks</label>
                <input
                  type="text"
                  placeholder="e.g. Near Stage, Window View, AC Duct Facing"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {!editingTable && totalTables >= maxTables && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                  ⚠️ Table limit reached ({totalTables}/{maxTables}). SuperAdmin has restricted table capacity for this hotel. You cannot create new tables until SuperAdmin upgrades the quota.
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsTableModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!editingTable && totalTables >= maxTables}
                  className={`px-5 py-2 rounded-xl font-bold text-xs shadow-xs transition ${
                    !editingTable && totalTables >= maxTables
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {editingTable ? 'Update Table' : totalTables >= maxTables ? 'Limit Reached' : 'Save & Publish Table'}
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
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white text-slate-900 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Building className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-slate-900">Add New Floor</h3>
              </div>
              <button
                onClick={() => setIsFloorModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFloor} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Floor Number</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  required
                  value={newFloorNumber}
                  onChange={(e) => setNewFloorNumber(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Full Floor Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 4th Floor (Executive Penthouse Lounge)"
                  value={newFloorName}
                  onChange={(e) => setNewFloorName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Short Name</label>
                <input
                  type="text"
                  placeholder="e.g. Floor 4"
                  value={newFloorShortName}
                  onChange={(e) => setNewFloorShortName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsFloorModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
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
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white text-slate-900 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <DoorOpen className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-slate-900">Add New Hall / Section</h3>
              </div>
              <button
                onClick={() => setIsHallModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateHall} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Target Floor</label>
                <select
                  value={newHallFloorId}
                  onChange={(e) => setNewHallFloorId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{floors.length ? 'Select a floor…' : 'No floors loaded from backend'}</option>
                  {floors.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.shortName || `Floor ${f.floorNumber}`})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Hall / Section Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kohinoor Grand Banquet Hall"
                  value={newHallName}
                  onChange={(e) => setNewHallName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Crystal chandeliers, acoustic sound system"
                  value={newHallDescription}
                  onChange={(e) => setNewHallDescription(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Max Event Capacity</label>
                <input
                  type="number"
                  min="10"
                  max="500"
                  value={newHallMaxCapacity}
                  onChange={(e) => setNewHallMaxCapacity(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsHallModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newHallFloorId}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs disabled:cursor-not-allowed disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white text-slate-900 p-6 text-center space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Official Dining QR
              </span>
              <button
                onClick={() => setSelectedQrTable(null)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="pt-1">
              <h3 className="text-xl font-bold text-slate-900">Table {selectedQrTable.tableNumber}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedQrTable.floorLevel} • {selectedQrTable.section}
              </p>
            </div>

            {/* Network Host Switcher Bar */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <span>🌐</span>
                  <span>QR Target Network:</span>
                </span>
                <span className="text-[9px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-semibold">
                  {qrNetworkHost !== 'localhost' ? '✓ WiFi Scannable' : '⚠️ Localhost Only'}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSetQrHost(detectedLanIp)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ${
                    qrNetworkHost === detectedLanIp
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <span>📶 Hotel Wi-Fi IP ({detectedLanIp})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQrHost('localhost')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ${
                    qrNetworkHost === 'localhost'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <span>💻 Localhost</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                {qrNetworkHost !== 'localhost'
                  ? `✓ Mobile phones on Wi-Fi will open http://${qrNetworkHost}:3001/?table=${selectedQrTable.tableNumber}`
                  : '⚠️ Localhost works only in PC browser. Switch to Hotel Wi-Fi IP for real phone cameras.'}
              </p>
            </div>

            {/* Scannable Dynamic QR Box */}
            <div className="p-4 bg-white rounded-xl shadow-xs inline-block my-1 border border-slate-200">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                  getPortalUrl('customer', `/?hotelId=${hotelId}&table=${selectedQrTable.tableNumber}`, qrNetworkHost)
                )}`}
                alt={`QR for Table ${selectedQrTable.tableNumber}`}
                className="w-44 h-44 object-contain mx-auto"
              />
              <div className="mt-2 text-center">
                <span className="font-bold text-xs tracking-wider text-slate-900 block">
                  SCAN TO DINE IN
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  Table {selectedQrTable.tableNumber}
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-1">
              <span className="text-[10px] text-slate-500 block font-semibold">Direct Ordering URL:</span>
              <span className="text-xs font-mono text-blue-700 truncate block">
                {getPortalUrl('customer', `/?hotelId=${hotelId}&table=${selectedQrTable.tableNumber}`, qrNetworkHost)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={() => {
                  window.open(getPortalUrl('customer', `/?hotelId=${hotelId}&table=${selectedQrTable.tableNumber}`, qrNetworkHost), '_blank');
                }}
                className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Menu</span>
              </button>
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') window.print();
                }}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1 shadow-xs"
                title="Print Standee"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Standee</span>
              </button>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(
                    getPortalUrl('customer', `/?hotelId=${hotelId}&table=${selectedQrTable.tableNumber}`, qrNetworkHost)
                  );
                  showToast('✓ Scannable Link copied to clipboard!');
                }}
                className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold"
                title="Copy Link"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. MODAL: 🖨️ PRINTABLE QR CODE CENTER (RECEPTION, ROOMS & APP STANDEES)    */}
      {/* ========================================================================= */}
      {isPrintableQrCenterOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in">
          <div className="max-w-4xl w-full max-h-[92vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white text-slate-900 p-6 space-y-5 shadow-xl flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                    Reception, Dining & App Printable QR Center
                  </h2>
                  <p className="text-xs text-slate-500">
                    Preview, download, and print physical tent cards and standees for tables, rooms, reception desk & mobile APK
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') window.print();
                  }}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Sheet (A4)</span>
                </button>
                <button
                  onClick={() => setIsPrintableQrCenterOpen(false)}
                  className="text-slate-400 hover:text-slate-700 font-bold p-1 rounded-lg"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Network Target Host Switcher Bar */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <span>🌐</span>
                  <span>QR Target Host & Wi-Fi IP (Mobile Device Scan Network):</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-semibold">
                  Target: http://{qrNetworkHost}:3001
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSetQrHost(detectedLanIp)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                    qrNetworkHost === detectedLanIp
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <span>📶 Hotel Wi-Fi IP ({detectedLanIp})</span>
                  <span className="text-[10px] opacity-80 font-normal">Recommended for Phone Cameras</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQrHost('localhost')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                    qrNetworkHost === 'localhost'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <span>💻 Localhost (This PC Only)</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                {qrNetworkHost !== 'localhost'
                  ? `💡 QR codes encode http://${qrNetworkHost}:3001. Any guest smartphone connected to hotel Wi-Fi can scan and open the menu immediately without localhost errors!`
                  : '⚠️ Localhost is selected. Smartphones cannot connect to localhost. Switch to Hotel Wi-Fi IP before printing.'}
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'tables', label: '🍽️ Dining Tables (T-01 - T-24)' },
                { id: 'rooms', label: '🏨 Guest Rooms (101 - 310)' },
                { id: 'reception', label: '🛎️ Reception & Lobby Desk' },
                { id: 'app', label: '📱 Customer Android App (.apk) Standee' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setQrFilterType(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    qrFilterType === tab.id
                      ? 'bg-blue-600 text-white shadow-xs'
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
                    const targetUrl = getPortalUrl('customer', `/?hotelId=${hotelId}&table=${tableNum}`, qrNetworkHost);
                    return (
                      <div
                        key={idx}
                        className="bg-white text-slate-900 rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col items-center text-center relative"
                      >
                        <span className="text-[9px] font-bold tracking-widest text-blue-700 uppercase mb-1">
                          SPICEHUB LUXURY HOTEL & DINE
                        </span>
                        <div className="w-12 h-0.5 bg-blue-600 rounded-full mb-2" />
                        <h4 className="text-xl font-bold text-slate-900 tracking-tight">
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
                          <span className="text-[11px] font-bold text-slate-900 block">
                            📲 SCAN WITH PHONE CAMERA
                          </span>
                          <span className="text-[9px] text-slate-500">
                            View Menu • Custom Cooking • Instant KOT
                          </span>
                        </div>

                        <div className="mt-3 w-full pt-2 border-t border-dashed border-slate-200 flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              window.open(targetUrl, '_blank');
                            }}
                            className="flex-1 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[10px] font-semibold"
                          >
                            Open Link
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (typeof window !== 'undefined') window.print();
                            }}
                            className="px-2 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-semibold"
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
                  const targetUrl = getPortalUrl('guest', `/?hotelId=${hotelId}&roomNumber=${roomNum}`, qrNetworkHost);
                  return (
                    <div
                      key={idx}
                      className="bg-white text-slate-900 rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col items-center text-center relative"
                    >
                      <span className="text-[9px] font-bold tracking-widest text-slate-700 uppercase mb-1">
                        IN-ROOM DINING & CONCIERGE
                      </span>
                      <div className="w-12 h-0.5 bg-slate-800 rounded-full mb-2" />
                      <h4 className="text-xl font-bold text-slate-900 tracking-tight">
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
                        <span className="text-[11px] font-bold text-slate-800 block">
                          🛎️ SCAN FOR ROOM SERVICE
                        </span>
                        <span className="text-[9px] text-slate-500">
                          Food Delivery • Towels • Water • Housekeeping
                        </span>
                      </div>

                      <div className="mt-3 w-full pt-2 border-t border-dashed border-slate-200 flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            window.open(targetUrl, '_blank');
                          }}
                          className="flex-1 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[10px] font-semibold"
                        >
                          Open Link
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof window !== 'undefined') window.print();
                          }}
                          className="px-2 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-semibold"
                        >
                          Print
                        </button>
                      </div>
                    </div>
                  );
                })}

              {qrFilterType === 'reception' && (
                <div className="sm:col-span-2 md:col-span-3 bg-white text-slate-900 rounded-2xl p-6 border-2 border-blue-500 shadow-sm flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 shadow-inner">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
                        getPortalUrl('customer', `/?hotelId=${hotelId}`, qrNetworkHost)
                      )}`}
                      alt="Reception Standee QR"
                      className="w-52 h-52 object-contain"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <span className="text-xs font-bold tracking-widest text-blue-700 uppercase">
                      OFFICIAL FRONT DESK STANDEE
                    </span>
                    <h3 className="text-2xl font-bold text-slate-900">
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
                          window.open(getPortalUrl('customer', `/?hotelId=${hotelId}`, qrNetworkHost), '_blank');
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs"
                      >
                        Open Digital Catalog
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== 'undefined') window.print();
                        }}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs"
                      >
                        Print Reception Standee (A4)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {qrFilterType === 'app' && (
                <div className="sm:col-span-2 md:col-span-3 bg-white text-slate-900 rounded-2xl p-6 border-2 border-emerald-500 shadow-sm flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 shadow-inner">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
                        `http://${qrNetworkHost}:5000/download/customer-apk`
                      )}`}
                      alt="Customer App APK Download QR"
                      className="w-52 h-52 object-contain"
                    />
                    <div className="mt-2 text-center">
                      <span className="font-bold text-xs tracking-wider text-emerald-800 block">
                        SCAN TO GET APP (.APK)
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Direct 5.5 MB Download
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold tracking-widest text-emerald-700 uppercase bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        OFFICIAL ANDROID APP STANDEE
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500">v1.0.0 Ready</span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">
                      Download SpiceHub Android App (.apk)
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Place this standee at tables, reception counter, and room desks. Guests scan the QR code with their
                      Android phone camera to download the native app directly without Google Play Store delays.
                    </p>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs text-slate-700 font-medium">
                      <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                        <span>✓</span>
                        <span>Instant Direct Download: http://{qrNetworkHost}:5000/download/customer-apk</span>
                      </div>
                      <div className="text-slate-500">⚡ 3x Faster offline ordering, live push notifications & digital keycard</div>
                    </div>
                    <div className="pt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          window.open(`http://${qrNetworkHost}:5000/download/customer-apk`, '_blank');
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
                      >
                        <span>⬇️</span>
                        <span>Download APK Directly</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(`http://${qrNetworkHost}:5000/download/customer-apk`);
                          showToast('✓ Direct APK download URL copied!');
                        }}
                        className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl shadow-xs"
                      >
                        Copy Download URL
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== 'undefined') window.print();
                        }}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs"
                      >
                        Print App Standee (A4)
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
