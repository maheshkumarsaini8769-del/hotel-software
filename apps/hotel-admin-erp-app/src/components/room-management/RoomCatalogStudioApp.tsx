import React, { useState, useEffect, useMemo, useRef } from 'react';
import { apiFetch, getStoredHotelId } from '../../config/api';
import { getPortalUrl } from '../../config/portalUrls';
import {
  BedDouble,
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
  Wind,
  Snowflake,
  Camera,
  Image as ImageIcon,
  DollarSign,
  Layers,
  X,
  SlidersHorizontal,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';

export interface RoomTypeDTO {
  id: string;
  _id?: string;
  name: string;
  code: string;
  maxCapacity: number;
  basePriceOvernight: number;
  weekendPrice?: number;
  extraBedPrice?: number;
  gstRate?: number;
  amenities?: string[];
  images?: string[];
  photos?: string[];
  description?: string;
  isAc?: boolean;
  totalRoomsCount?: number;
  roomsCount?: number;
  isActive?: boolean;
}

export interface PhysicalRoomDTO {
  id: string;
  _id?: string;
  roomNumber: string;
  roomTypeId: any;
  floorNumber: number;
  wing?: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'DIRTY' | 'CLEANING' | 'RESERVED' | 'INSPECTION' | 'OUT_OF_SERVICE';
  permanentQrCodeHash?: string;
  photos?: string[];
  isAc?: boolean;
  createdAt?: string;
}

const ROOM_PRESET_PHOTOS = [
  {
    name: 'Royal Maharaja Suite',
    url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Modern AC Deluxe',
    url: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Garden View Executive',
    url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Heritage Palace Room',
    url: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&auto=format&fit=crop&q=80',
  },
];

export interface RoomCatalogStudioAppProps {
  onOpenMatrix?: () => void;
  onOpenFrontDesk?: () => void;
}

export const RoomCatalogStudioApp: React.FC<RoomCatalogStudioAppProps> = ({
  onOpenMatrix,
  onOpenFrontDesk,
}) => {
  const [activeTab, setActiveTab] = useState<'ROOMS' | 'CATEGORIES'>('ROOMS');
  const [rooms, setRooms] = useState<PhysicalRoomDTO[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomTypeDTO[]>([]);
  const [maxRoomsAllowed, setMaxRoomsAllowed] = useState<number>(30);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterAcMode, setFilterAcMode] = useState<'ALL' | 'AC' | 'NON_AC'>('ALL');
  const [filterCapacity, setFilterCapacity] = useState<string>('ALL'); // 'ALL' | '1' | '2' | '3_PLUS'
  const [filterFloor, setFilterFloor] = useState<string>('ALL');

  // Policy: Hide Non-AC word completely if hotel has 100% AC rooms or user toggles this
  const [hideNonAcWording, setHideNonAcWording] = useState<boolean>(() => {
    return localStorage.getItem('spicehub_hide_non_ac_wording') === 'true';
  });

  // Modals
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);
  const [isEditRoomModalOpen, setIsEditRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<PhysicalRoomDTO | null>(null);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<RoomTypeDTO | null>(null);

  // Form states - Physical Room
  const [roomForm, setRoomForm] = useState({
    roomNumber: '',
    roomTypeId: '',
    floorNumber: 1,
    wing: 'East Wing',
    photo: '',
    isAc: true,
  });

  // Form states - Room Type (Category)
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    code: '',
    basePriceOvernight: 3500,
    weekendPrice: 4200,
    maxCapacity: 2,
    isAc: true,
    description: '',
    photos: [] as string[],
  });

  // Photo upload refs
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [compressingImage, setCompressingImage] = useState(false);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Canvas Image Compression Utility (<80KB lightweight base64 JPEG)
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 800;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.82));
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>, isCategory = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setCompressingImage(true);
      const compressedDataUrl = await compressImage(file);
      if (isCategory) {
        setCategoryForm((prev) => ({
          ...prev,
          photos: [compressedDataUrl, ...(prev.photos || [])],
        }));
      } else {
        setRoomForm((prev) => ({ ...prev, photo: compressedDataUrl }));
      }
      triggerToast('📸 Photo uploaded & canvas-optimized (~60KB)!');
    } catch (err: any) {
      alert('Could not compress photo: ' + err.message);
    } finally {
      setCompressingImage(false);
      e.target.value = '';
    }
  };

  // Fetch Rooms & Room Types
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const hotelId = getStoredHotelId();
      const [roomsRes, typesRes] = await Promise.all([
        apiFetch(`/pms/rooms?hotelId=${encodeURIComponent(hotelId)}`),
        apiFetch(`/pms/room-types?hotelId=${encodeURIComponent(hotelId)}`),
      ]);

      if (roomsRes.ok) {
        const rData = await roomsRes.json();
        if (rData.success && Array.isArray(rData.rooms)) {
          setRooms(rData.rooms);
          if (rData.maxRooms) setMaxRoomsAllowed(rData.maxRooms);
        }
      }

      if (typesRes.ok) {
        const tData = await typesRes.json();
        if (tData.success && Array.isArray(tData.roomTypes)) {
          setRoomTypes(tData.roomTypes);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Check if hotel has any Non-AC rooms
  const hasNonAcRooms = useMemo(() => {
    const typesHaveNonAc = roomTypes.some((rt) => rt.isAc === false);
    const roomsHaveNonAc = rooms.some((r) => r.isAc === false);
    return (typesHaveNonAc || roomsHaveNonAc) && !hideNonAcWording;
  }, [roomTypes, rooms, hideNonAcWording]);

  // Toggle Hide Non-AC Wording
  const handleToggleHideNonAc = (hide: boolean) => {
    setHideNonAcWording(hide);
    localStorage.setItem('spicehub_hide_non_ac_wording', hide ? 'true' : 'false');
    if (hide && filterAcMode === 'NON_AC') {
      setFilterAcMode('ALL');
    }
    triggerToast(
      hide
        ? '❄️ 100% AC Mode: "Non-AC" wording removed from all menus & guest portals.'
        : '💨 Non-AC filter & tags restored.'
    );
  };

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      // Search
      const q = search.trim().toLowerCase();
      const rNum = String(r.roomNumber).toLowerCase();
      const typeName = (r.roomTypeId?.name || '').toLowerCase();
      if (q && !rNum.includes(q) && !typeName.includes(q)) return false;

      // Status
      if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;

      // AC mode
      const isAc = r.isAc !== undefined ? r.isAc : (r.roomTypeId?.isAc !== false);
      if (filterAcMode === 'AC' && !isAc) return false;
      if (filterAcMode === 'NON_AC' && isAc) return false;

      // Capacity
      const cap = Number(r.roomTypeId?.maxCapacity || r.roomTypeId?.maxOccupancy || 2);
      if (filterCapacity === '1' && cap !== 1) return false;
      if (filterCapacity === '2' && cap !== 2) return false;
      if (filterCapacity === '3_PLUS' && cap < 3) return false;

      // Floor
      if (filterFloor !== 'ALL' && String(r.floorNumber) !== filterFloor) return false;

      return true;
    });
  }, [rooms, search, filterStatus, filterAcMode, filterCapacity, filterFloor]);

  // Available floors
  const availableFloors = useMemo(() => {
    const fSet = new Set(rooms.map((r) => r.floorNumber).filter(Boolean));
    return Array.from(fSet).sort((a, b) => a - b);
  }, [rooms]);

  // Quick 1-Click Status Update for a Physical Room
  const handleQuickStatusChange = async (roomId: string, newStatus: PhysicalRoomDTO['status']) => {
    try {
      setRooms((prev) =>
        prev.map((r) => (r.id === roomId || r._id === roomId ? { ...r, status: newStatus } : r))
      );
      const res = await apiFetch(`/pms/rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        triggerToast(`✅ Room status updated to ${newStatus}`);
      } else {
        const err = await res.json();
        alert(err.message || 'Status update failed');
        fetchData();
      }
    } catch (err: any) {
      alert(err.message);
      fetchData();
    }
  };

  // Delete Physical Room
  const handleDeleteRoom = async (roomId: string, roomNumber: string) => {
    if (!window.confirm(`Are you sure you want to delete Room ${roomNumber}?`)) return;
    try {
      const res = await apiFetch(`/pms/rooms/${roomId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setRooms((prev) => prev.filter((r) => r.id !== roomId && r._id !== roomId));
        triggerToast(`🗑️ Room ${roomNumber} deleted successfully.`);
      } else {
        const err = await res.json();
        alert(err.message || 'Could not delete room');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Save New Room
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomForm.roomNumber.trim()) {
      alert('Please enter a room number (e.g. 101, 204)');
      return;
    }
    if (rooms.length >= maxRoomsAllowed) {
      alert(`Room limit reached! SuperAdmin allocated max ${maxRoomsAllowed} rooms. Upgrade capacity in SuperAdmin.`);
      return;
    }

    try {
      const res = await apiFetch('/pms/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomNumber: roomForm.roomNumber.trim().toUpperCase(),
          roomTypeId: roomForm.roomTypeId || roomTypes[0]?.id || roomTypes[0]?._id,
          floorNumber: Number(roomForm.floorNumber) || 1,
          wing: roomForm.wing.trim(),
          photos: roomForm.photo ? [roomForm.photo] : [],
          isAc: Boolean(roomForm.isAc),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        triggerToast(`🎉 Room ${roomForm.roomNumber} created successfully!`);
        setIsAddRoomModalOpen(false);
        setRoomForm({ roomNumber: '', roomTypeId: '', floorNumber: 1, wing: 'East Wing', photo: '', isAc: true });
        fetchData();
      } else {
        const err = await res.json();
        alert(err.message || 'Room creation failed');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Save Room Type / Category
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      alert('Please enter a room category name');
      return;
    }
    try {
      const isEdit = !!editingCategory;
      const url = isEdit
        ? `/pms/room-types/${editingCategory.id || editingCategory._id}`
        : '/pms/room-types';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: categoryForm.name.trim(),
          code: categoryForm.code.trim().toUpperCase() || undefined,
          basePriceOvernight: Number(categoryForm.basePriceOvernight),
          weekendPrice: Number(categoryForm.weekendPrice),
          maxCapacity: Number(categoryForm.maxCapacity),
          isAc: Boolean(categoryForm.isAc),
          description: categoryForm.description.trim(),
          images: categoryForm.photos,
          photos: categoryForm.photos,
        }),
      });

      if (res.ok) {
        triggerToast(
          isEdit
            ? `✅ Room category "${categoryForm.name}" updated!`
            : `🎉 Room category "${categoryForm.name}" created!`
        );
        setIsCategoryModalOpen(false);
        setEditingCategory(null);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to save room category');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Open Edit Category
  const handleOpenEditCategory = (rt: RoomTypeDTO) => {
    setEditingCategory(rt);
    setCategoryForm({
      name: rt.name,
      code: rt.code,
      basePriceOvernight: rt.basePriceOvernight || 3500,
      weekendPrice: rt.weekendPrice || Math.round((rt.basePriceOvernight || 3500) * 1.2),
      maxCapacity: rt.maxCapacity || 2,
      isAc: rt.isAc !== false,
      description: rt.description || '',
      photos: (rt.images && rt.images.length ? rt.images : rt.photos) || [],
    });
    setIsCategoryModalOpen(true);
  };

  // Delete Category
  const handleDeleteCategory = async (catId: string, name: string) => {
    if (!window.confirm(`Delete room category "${name}"? This requires no rooms currently assigned to it.`)) return;
    try {
      const res = await apiFetch(`/pms/room-types/${catId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        triggerToast(`🗑️ Room category "${name}" deleted.`);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.message || 'Could not delete category');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* Hidden File Inputs for Gallery and Direct Camera */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleImageFileChange(e, isCategoryModalOpen)}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleImageFileChange(e, isCategoryModalOpen)}
      />

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-[100] px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md flex items-center gap-2 border border-emerald-500 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header Toolbar */}
      <div className="px-5 py-3.5 border-b border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
            <BedDouble className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base font-black tracking-tight text-slate-900 flex items-center gap-2">
                <span>Room & Tariff Management Studio</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {rooms.length} / {maxRoomsAllowed} Rooms Used
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-500">
              Compact layout, gallery/camera photo uploads, overnight tariffs, AC/Non-AC controls & live PMS sync.
            </p>
          </div>
        </div>

        {/* Action Buttons & Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center gap-1">
            <button
              onClick={() => setActiveTab('ROOMS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'ROOMS'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BedDouble className="w-3.5 h-3.5" />
              <span>Physical Rooms ({rooms.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('CATEGORIES')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'CATEGORIES'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Room Tariffs ({roomTypes.length})</span>
            </button>
          </div>

          {onOpenMatrix && (
            <button
              onClick={onOpenMatrix}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-xs font-bold text-slate-700 hover:text-slate-900 transition shadow-xs"
            >
              Timeline Matrix
            </button>
          )}

          {onOpenFrontDesk && (
            <button
              onClick={onOpenFrontDesk}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-xs font-bold text-slate-700 hover:text-slate-900 transition shadow-xs"
            >
              Front Desk Check-in
            </button>
          )}

          {activeTab === 'ROOMS' ? (
            <button
              onClick={() => {
                if (rooms.length >= maxRoomsAllowed) {
                  alert(`Room ceiling reached (${maxRoomsAllowed}). SuperAdmin upgrade required.`);
                  return;
                }
                setRoomForm({
                  roomNumber: '',
                  roomTypeId: roomTypes[0]?.id || roomTypes[0]?._id || '',
                  floorNumber: 1,
                  wing: 'East Wing',
                  photo: '',
                  isAc: roomTypes[0] ? roomTypes[0].isAc !== false : true,
                });
                setIsAddRoomModalOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Room</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setEditingCategory(null);
                setCategoryForm({
                  name: '',
                  code: '',
                  basePriceOvernight: 3500,
                  weekendPrice: 4200,
                  maxCapacity: 2,
                  isAc: true,
                  description: '',
                  photos: [],
                });
                setIsCategoryModalOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Category</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-Bar: Filters, Compact Search & 100% AC Property Policy Toggle */}
      <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Left: Search & Filters */}
        <div className="flex items-center gap-2.5 flex-wrap flex-1 min-w-[280px]">
          {/* Search */}
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search room (e.g. 101, Deluxe)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Status Filters */}
          {activeTab === 'ROOMS' && (
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
              {[
                { label: 'All', value: 'ALL' },
                { label: '🟢 Free', value: 'AVAILABLE' },
                { label: '🔴 Occupied', value: 'OCCUPIED' },
                { label: '🧹 Cleaning', value: 'CLEANING' },
                { label: '🟡 Reserved', value: 'RESERVED' },
              ].map((s) => (
                <button
                  key={s.value}
                  onClick={() => setFilterStatus(s.value)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                    filterStatus === s.value
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* AC vs Non-AC Filters (Dynamically hides 'Non-AC' if hotel has no Non-AC or user toggled hide) */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setFilterAcMode('ALL')}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition ${
                filterAcMode === 'ALL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setFilterAcMode('AC')}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                filterAcMode === 'AC'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Snowflake className="w-3 h-3" />
              <span>AC</span>
            </button>
            {/* ONLY RENDER NON-AC CHIP IF HOTEL ACTUALLY HAS NON-AC ROOMS AND HAS NOT HIDDEN THEM */}
            {hasNonAcRooms && (
              <button
                onClick={() => setFilterAcMode('NON_AC')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                  filterAcMode === 'NON_AC'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Wind className="w-3 h-3" />
                <span>Non-AC</span>
              </button>
            )}
          </div>

          {/* Capacity Filter */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
            {[
              { label: 'All Pax', value: 'ALL' },
              { label: '1 Pax', value: '1' },
              { label: '2 Pax', value: '2' },
              { label: '3+ Family', value: '3_PLUS' },
            ].map((c) => (
              <button
                key={c.value}
                onClick={() => setFilterCapacity(c.value)}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition ${
                  filterCapacity === c.value
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Floor Filter */}
          {availableFloors.length > 1 && (
            <select
              value={filterFloor}
              onChange={(e) => setFilterFloor(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-300 text-[11px] font-bold text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Floors</option>
              {availableFloors.map((fl) => (
                <option key={fl} value={String(fl)}>
                  Floor {fl}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Right: Policy Toggle - 100% AC Property (Remove 'Non-AC' Wording) */}
        <div className="flex items-center gap-2 shrink-0">
          <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 transition shadow-xs">
            <input
              type="checkbox"
              checked={hideNonAcWording}
              onChange={(e) => handleToggleHideNonAc(e.target.checked)}
              className="rounded accent-blue-600 w-3.5 h-3.5 cursor-pointer"
            />
            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <Snowflake className="w-3.5 h-3.5 text-blue-600" />
              <span>100% AC Property (Hide "Non-AC" across guest portal)</span>
            </span>
          </label>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar min-h-0">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-slate-700 dark:text-slate-300" />
            <span className="text-xs font-semibold">Loading hotel rooms & tariffs...</span>
          </div>
        ) : error ? (
          <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={fetchData}
              className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold"
            >
              Retry
            </button>
          </div>
        ) : activeTab === 'ROOMS' ? (
          /* ================================================================ */
          /* TAB 1: COMPACT PHYSICAL ROOM CARDS                               */
          /* ================================================================ */
          <div>
            {filteredRooms.length === 0 ? (
              <div className="p-8 rounded-2xl border border-slate-200 bg-white text-center space-y-3 shadow-xs">
                <BedDouble className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="text-sm font-bold text-slate-900">No Rooms Found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  No rooms match your active search or filter selection. Adjust filters or click "Add Room" to create a new physical room.
                </p>
                <button
                  onClick={() => setIsAddRoomModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs"
                >
                  Create First Room
                </button>
              </div>
            ) : (
              /* Ultra-Compact Responsive Grid (5-6 on Desktop, 3-4 on Tablet) */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {filteredRooms.map((room) => {
                  const rType = room.roomTypeId;
                  const isAc = room.isAc !== undefined ? room.isAc : (rType?.isAc !== false);
                  const price = rType?.basePriceOvernight || 3500;
                  const cap = rType?.maxCapacity || 2;
                  const photoUrl =
                    (room.photos && room.photos[0]) ||
                    (rType?.images && rType.images[0]) ||
                    (rType?.photos && rType.photos[0]);

                  const isOccupied = room.status === 'OCCUPIED';
                  const isAvailable = room.status === 'AVAILABLE';
                  const isCleaning = room.status === 'CLEANING' || room.status === 'DIRTY';

                  return (
                    <div
                      key={room.id || room._id}
                      className={`bg-white rounded-xl border border-slate-200 shadow-xs transition-all duration-200 flex flex-col justify-between overflow-hidden group hover:shadow-md ${
                        isAvailable
                          ? 'border-l-4 border-l-emerald-500'
                          : isOccupied
                          ? 'border-l-4 border-l-red-500'
                          : isCleaning
                          ? 'border-l-4 border-l-amber-500'
                          : 'border-l-4 border-l-blue-500'
                      }`}
                    >
                      {/* Top Photo Thumbnail or Compact Header */}
                      <div className="relative h-24 bg-slate-100 overflow-hidden">
                        {photoUrl ? (
                          <img
                            src={photoUrl}
                            alt={`Room ${room.roomNumber}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400">
                            <BedDouble className="w-6 h-6 text-slate-300 mb-1" />
                            <span className="text-[9px] font-semibold">No Photo</span>
                          </div>
                        )}

                        {/* Room Number Badge */}
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-xs text-slate-900 font-black text-xs border border-slate-200 shadow-xs">
                          Room {room.roomNumber}
                        </div>

                        {/* Status Pill */}
                        <div className="absolute top-2 right-2">
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tight shadow-xs ${
                              isAvailable
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : isOccupied
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : isCleaning
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {room.status === 'AVAILABLE'
                              ? 'Ready'
                              : room.status === 'OCCUPIED'
                              ? 'Stay'
                              : room.status === 'DIRTY'
                              ? 'Dirty'
                              : room.status === 'CLEANING'
                              ? 'Clean'
                              : room.status}
                          </span>
                        </div>

                        {/* Floor Tag */}
                        <div className="absolute bottom-1.5 left-2 px-1.5 py-0.5 rounded text-[8px] font-bold bg-white/80 text-slate-600 border border-slate-200">
                          Floor {room.floorNumber || 1}
                        </div>
                      </div>

                      {/* Room Card Body */}
                      <div className="p-2.5 flex-1 flex flex-col justify-between gap-2">
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <h4 className="text-xs font-bold text-slate-900 truncate" title={rType?.name || 'Standard Room'}>
                              {rType?.name || 'Standard Room'}
                            </h4>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span className="flex items-center gap-1 font-semibold">
                              <Users className="w-3 h-3 text-slate-400" />
                              <span>{cap} Pax</span>
                            </span>

                            {/* AC Tag: Only show Non-AC if not hidden by policy */}
                            {isAc ? (
                              <span className="flex items-center gap-0.5 text-blue-600 font-bold">
                                <Snowflake className="w-2.5 h-2.5" />
                                <span>AC</span>
                              </span>
                            ) : (
                              !hideNonAcWording && (
                                <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                                  <Wind className="w-2.5 h-2.5" />
                                  <span>Non-AC</span>
                                </span>
                              )
                            )}
                          </div>

                          {/* Price Tag */}
                          <div className="mt-1 flex items-baseline justify-between text-xs font-black text-slate-900">
                            <span>₹{price.toLocaleString()}</span>
                            <span className="text-[9px] text-slate-400 font-normal">/night</span>
                          </div>
                        </div>

                        {/* Quick 1-Click Status Bar & Actions */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                          <select
                            value={room.status}
                            onChange={(e) => handleQuickStatusChange(room.id || room._id, e.target.value as any)}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-1 text-[10px] font-bold text-slate-700 focus:outline-none"
                          >
                            <option value="AVAILABLE">🟢 Available</option>
                            <option value="CLEANING">🧹 Cleaning</option>
                            <option value="DIRTY">⚠️ Dirty</option>
                            <option value="OCCUPIED">🔴 Occupied</option>
                            <option value="RESERVED">🟡 Reserved</option>
                            <option value="OUT_OF_SERVICE">⛔ Out of Service</option>
                          </select>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingRoom(room);
                                setRoomForm({
                                  roomNumber: room.roomNumber,
                                  roomTypeId: room.roomTypeId?._id || room.roomTypeId?.id || '',
                                  floorNumber: room.floorNumber || 1,
                                  wing: room.wing || 'East Wing',
                                  photo: (room.photos && room.photos[0]) || '',
                                  isAc: room.isAc !== undefined ? room.isAc : (room.roomTypeId?.isAc !== false),
                                });
                                setIsEditRoomModalOpen(true);
                              }}
                              title="Edit Room & Photo"
                              className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteRoom(room.id || room._id, room.roomNumber)}
                              title="Delete Room"
                              className="p-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ================================================================ */
          /* TAB 2: ROOM CATEGORIES & OVERNIGHT TARIFFS                       */
          /* ================================================================ */
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roomTypes.map((rt) => {
                const isAc = rt.isAc !== false;
                const photo =
                  (rt.images && rt.images[0]) ||
                  (rt.photos && rt.photos[0]) ||
                  ROOM_PRESET_PHOTOS[0].url;

                return (
                  <div
                    key={rt.id || rt._id}
                    className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md transition"
                  >
                    {/* Category Photo Header */}
                    <div className="relative h-40 bg-slate-100">
                      <img
                        src={photo}
                        alt={rt.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-xs text-white font-black text-xs border border-white/20">
                        {rt.code}
                      </div>

                      {/* AC Badge */}
                      <div className="absolute top-3 right-3">
                        {isAc ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white/90 text-blue-700 border border-blue-200 flex items-center gap-1 backdrop-blur-xs shadow-xs">
                            <Snowflake className="w-3 h-3" />
                            <span>AC Room</span>
                          </span>
                        ) : (
                          !hideNonAcWording && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white/90 text-amber-700 border border-amber-200 flex items-center gap-1 backdrop-blur-xs shadow-xs">
                              <Wind className="w-3 h-3" />
                              <span>Non-AC</span>
                            </span>
                          )
                        )}
                      </div>

                      <div className="absolute bottom-2 left-3 right-3">
                        <h3 className="text-base font-black text-white">{rt.name}</h3>
                      </div>
                    </div>

                    {/* Category Details */}
                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <div>
                        {rt.description && (
                          <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                            {rt.description}
                          </p>
                        )}

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                            <span className="text-[10px] text-slate-500 block font-semibold">Overnight Tariff</span>
                            <span className="text-sm font-black text-slate-900">
                              ₹{(rt.basePriceOvernight || 3500).toLocaleString()}
                            </span>
                            <span className="text-[9px] text-slate-400"> + GST</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                            <span className="text-[10px] text-slate-500 block font-semibold">Weekend Tariff</span>
                            <span className="text-sm font-black text-slate-900">
                              ₹{(rt.weekendPrice || Math.round((rt.basePriceOvernight || 3500) * 1.2)).toLocaleString()}
                            </span>
                            <span className="text-[9px] text-slate-400"> Sat/Sun</span>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between text-xs text-slate-700">
                          <span className="flex items-center gap-1.5 font-bold">
                            <Users className="w-3.5 h-3.5 text-blue-600" />
                            <span>Max Capacity: {rt.maxCapacity || 2} Adults</span>
                          </span>
                          <span className="text-slate-500 text-[11px]">
                            {rt.roomsCount ?? '—'} Physical Rooms Assigned
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          onClick={() => handleOpenEditCategory(rt)}
                          className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit Tariff & Photos</span>
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(rt.id || rt._id, rt.name)}
                          className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
                          title="Delete Category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* MODAL: ADD / EDIT PHYSICAL ROOM WITH PHOTO */}
      {(isAddRoomModalOpen || isEditRoomModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-xl text-slate-900 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <BedDouble className="w-5 h-5 text-blue-600" />
                <span>{isEditRoomModalOpen ? `Edit Room ${editingRoom?.roomNumber}` : 'Add New Physical Room'}</span>
              </h3>
              <button
                onClick={() => {
                  setIsAddRoomModalOpen(false);
                  setIsEditRoomModalOpen(false);
                  setEditingRoom(null);
                }}
                className="w-7 h-7 rounded-lg bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (isEditRoomModalOpen && editingRoom) {
                  try {
                    const res = await apiFetch(`/pms/rooms/${editingRoom.id || editingRoom._id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        roomNumber: roomForm.roomNumber.trim().toUpperCase(),
                        roomTypeId: roomForm.roomTypeId,
                        floorNumber: Number(roomForm.floorNumber),
                        wing: roomForm.wing,
                        photos: roomForm.photo ? [roomForm.photo] : [],
                        isAc: Boolean(roomForm.isAc),
                      }),
                    });
                    if (res.ok) {
                      triggerToast(`✅ Room ${roomForm.roomNumber} updated!`);
                      setIsEditRoomModalOpen(false);
                      setEditingRoom(null);
                      fetchData();
                    } else {
                      const err = await res.json();
                      alert(err.message || 'Update failed');
                    }
                  } catch (err: any) {
                    alert(err.message);
                  }
                } else {
                  handleCreateRoom(e);
                }
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Room Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 101, 204"
                    value={roomForm.roomNumber}
                    onChange={(e) => setRoomForm((prev) => ({ ...prev, roomNumber: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Floor Number *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={50}
                    value={roomForm.floorNumber}
                    onChange={(e) => setRoomForm((prev) => ({ ...prev, floorNumber: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Room Category *</label>
                  <select
                    value={roomForm.roomTypeId}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const selectedType = roomTypes.find((rt) => (rt.id || rt._id) === selectedId);
                      setRoomForm((prev) => ({
                        ...prev,
                        roomTypeId: selectedId,
                        isAc: selectedType ? selectedType.isAc !== false : prev.isAc,
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    {roomTypes.map((rt) => (
                      <option key={rt.id || rt._id} value={rt.id || rt._id}>
                        {rt.name} (₹{rt.basePriceOvernight}/night) {rt.isAc ? '❄️ AC' : '💨 Non-AC'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Wing / Section</label>
                  <input
                    type="text"
                    placeholder="e.g. East Wing, Royal Block"
                    value={roomForm.wing}
                    onChange={(e) => setRoomForm((prev) => ({ ...prev, wing: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Climate Control 2-Option Selector (AC vs Non-AC) */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200">
                <label className="block text-[11px] font-bold text-slate-700 uppercase">
                  Room Climate Specification *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRoomForm((prev) => ({ ...prev, isAc: true }))}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      roomForm.isAc
                        ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs ring-1 ring-blue-500'
                        : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Snowflake className="w-3.5 h-3.5 text-blue-600" />
                    <span>❄️ AC Room</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoomForm((prev) => ({ ...prev, isAc: false }))}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      !roomForm.isAc
                        ? 'bg-amber-50 border-amber-500 text-amber-800 shadow-xs ring-1 ring-amber-500'
                        : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Wind className="w-3.5 h-3.5 text-amber-600" />
                    <span>🌀 Non-AC Room</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  {roomForm.isAc
                    ? '❄️ This room is equipped with dedicated Air Conditioning / Climate Control.'
                    : '🌀 This room is equipped with high-airflow Ceiling Fan & Natural Air Ventilation (Non-AC).'}
                </p>
              </div>

              {/* Photo Upload Section */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <label className="block text-[11px] font-bold text-slate-700 uppercase">
                  Room Photo (Gallery or Direct Camera)
                </label>

                {roomForm.photo ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 h-36">
                    <img src={roomForm.photo} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl bg-white text-slate-900 font-bold text-xs shadow-sm hover:bg-slate-100"
                      >
                        Change Photo
                      </button>
                      <button
                        type="button"
                        onClick={() => setRoomForm((prev) => ({ ...prev, photo: '' }))}
                        className="px-3 py-1.5 rounded-xl bg-red-600 text-white font-bold text-xs shadow-sm hover:bg-red-500"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="p-3 rounded-2xl border border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/50 text-slate-700 flex flex-col items-center justify-center gap-1.5 transition"
                    >
                      <ImageIcon className="w-5 h-5 text-blue-600" />
                      <span className="text-xs font-bold">Pick From Gallery</span>
                      <span className="text-[10px] text-slate-500">Auto-compressed ~60KB</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="p-3 rounded-2xl border border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/50 text-slate-700 flex flex-col items-center justify-center gap-1.5 transition"
                    >
                      <Camera className="w-5 h-5 text-emerald-600" />
                      <span className="text-xs font-bold">Take Live Photo</span>
                      <span className="text-[10px] text-slate-500">Direct Camera</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddRoomModalOpen(false);
                    setIsEditRoomModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition"
                >
                  {isEditRoomModalOpen ? 'Save Changes' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT ROOM TYPE & OVERNIGHT TARIFF */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl p-6 shadow-xl text-slate-900 space-y-4 max-h-[92vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                <span>{editingCategory ? `Edit "${editingCategory.name}"` : 'New Room Category & Tariff'}</span>
              </h3>
              <button
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setEditingCategory(null);
                }}
                className="w-7 h-7 rounded-lg bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Category Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Deluxe Heritage AC Room"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Short Code</label>
                  <input
                    type="text"
                    placeholder="e.g. DLX, STE"
                    value={categoryForm.code}
                    onChange={(e) => setCategoryForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 uppercase focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Pricing & Capacity */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Overnight Rate (₹) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={categoryForm.basePriceOvernight}
                    onChange={(e) => setCategoryForm((prev) => ({ ...prev, basePriceOvernight: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Weekend Rate (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={categoryForm.weekendPrice}
                    onChange={(e) => setCategoryForm((prev) => ({ ...prev, weekendPrice: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Max Capacity (Adults)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={categoryForm.maxCapacity}
                    onChange={(e) => setCategoryForm((prev) => ({ ...prev, maxCapacity: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-bold"
                  />
                </div>
              </div>

              {/* AC vs Non-AC Toggle */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    {categoryForm.isAc ? (
                      <>
                        <Snowflake className="w-4 h-4 text-blue-600" />
                        <span>Air Conditioned (AC Room)</span>
                      </>
                    ) : (
                      <>
                        <Wind className="w-4 h-4 text-amber-600" />
                        <span>Non-AC Room</span>
                      </>
                    )}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Controls AC filter classification in guest apps and reception matrix.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCategoryForm((prev) => ({ ...prev, isAc: !prev.isAc }))}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                    categoryForm.isAc
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {categoryForm.isAc ? 'Switch to Non-AC' : 'Switch to AC'}
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Spacious heritage room featuring king-sized bed, high-speed WiFi, hot shower and balcony."
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Photo Upload & Presets */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase">
                    Category Photos ({categoryForm.photos.length})
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center gap-1 border border-slate-200"
                    >
                      <ImageIcon className="w-3 h-3 text-blue-600" />
                      <span>Upload Gallery</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs"
                    >
                      <Camera className="w-3 h-3" />
                      <span>Camera</span>
                    </button>
                  </div>
                </div>

                {/* Previews */}
                {categoryForm.photos.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {categoryForm.photos.map((p, idx) => (
                      <div key={idx} className="relative h-20 rounded-xl overflow-hidden border border-slate-200 group">
                        <img src={p} alt={`Photo ${idx}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() =>
                            setCategoryForm((prev) => ({
                              ...prev,
                              photos: prev.photos.filter((_, i) => i !== idx),
                            }))
                          }
                          className="absolute top-1 right-1 p-1 rounded-md bg-red-600 text-white hover:bg-red-500"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick Presets */}
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block mb-1">
                    Or choose quick high-res preset:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {ROOM_PRESET_PHOTOS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() =>
                          setCategoryForm((prev) => ({
                            ...prev,
                            photos: [preset.url, ...(prev.photos || [])],
                          }))
                        }
                        className="p-1.5 rounded-xl border border-slate-200 hover:border-blue-500 bg-slate-50 hover:bg-white flex items-center gap-2 text-left transition"
                      >
                        <img src={preset.url} alt={preset.name} className="w-8 h-8 rounded-lg object-cover" />
                        <span className="text-[11px] font-semibold text-slate-700 truncate">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsCategoryModalOpen(false);
                    setEditingCategory(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
                >
                  {editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
