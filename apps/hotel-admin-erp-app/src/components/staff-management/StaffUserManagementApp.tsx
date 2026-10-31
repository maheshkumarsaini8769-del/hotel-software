import React, { useState, useEffect } from 'react';
import { apiFetch, getStoredHotelId } from '../../config/api';
import { getPortalUrl } from '../../config/portalUrls';
import {
  Users,
  UserPlus,
  CreditCard,
  ChefHat,
  UtensilsCrossed,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Phone,
  Mail,
  Clock,
  Building2,
  Trash2,
  Edit2,
  ExternalLink,
  ShieldCheck,
  Check,
  X,
  Sparkles,
  Grid,
  Radio,
  Camera,
  Upload,
  LayoutList,
  LayoutGrid
} from 'lucide-react';

export type StaffRoleType = 'CASHIER' | 'WAITER' | 'CHEF' | 'RECEPTIONIST' | 'MANAGER';

export const DEFAULT_STAFF_AVATAR = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="%2394a3b8"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';

export interface HotelStaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: StaffRoleType | string;
  pin: string;
  shift: string;
  shiftStatus: 'ON_DUTY' | 'OFFLINE' | string;
  assignedSection?: string;
  assignedStation?: string;
  assignedTableStart?: number;
  assignedTableEnd?: number;
  assignedCounter?: string;
  isActive: boolean;
  avatar?: string;
  createdAt?: string;
  pinApprovedByAdmin?: boolean;
  pinStatus?: 'NONE' | 'ACTIVE' | 'PENDING_APPROVAL';
}

interface StaffUserManagementAppProps {
  isDark?: boolean;
  hotelId?: string;
}

const MAX_AVATAR_SOURCE_BYTES = 10 * 1024 * 1024;

/**
 * Staff avatars are stored as data URLs in localStorage for the waiter
 * hand-off. Compress them to a small square JPEG so a few profiles can never
 * exhaust the browser's ~5 MB origin quota.
 */
function compressAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_AVATAR_SOURCE_BYTES) {
      reject(new Error('Image exceeds 10 MB. Please choose a smaller photo.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('The selected image could not be read.'));
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Unsupported image format.'));
        return;
      }
      const image = new Image();
      image.onerror = () => reject(new Error('The selected image is not a valid image file.'));
      image.onload = () => {
        const maxDimension = 512;
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Image compression is unavailable in this browser.'));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export const StaffUserManagementApp: React.FC<StaffUserManagementAppProps> = ({
  isDark = false,
  hotelId = getStoredHotelId(),
}) => {
  const [staffList, setStaffList] = useState<HotelStaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeRoleFilter, setActiveRoleFilter] = useState<'ALL' | StaffRoleType>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [toast, setToast] = useState<string | null>(null);

  // Subscribed portals for this hotel property (enforced from Super Admin subscription)
  const [enabledPortals, setEnabledPortals] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('spicehub_enabled_portals');
      if (stored) return JSON.parse(stored);
    } catch {}
    return ['admin', 'cashier', 'reception', 'kds', 'waiter', 'customer', 'guest'];
  });

  useEffect(() => {
    let isMounted = true;
    try {
      const stored = localStorage.getItem('spicehub_enabled_portals');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setEnabledPortals(parsed);
        }
      }
    } catch {}

    async function loadHotelPortals() {
      try {
        const res = await apiFetch('/api/v1/auth/active-hotels');
        const json = await res.json().catch(() => null);
        if (json?.success && Array.isArray(json.data) && isMounted) {
          const current = json.data.find((h: any) => h.id === hotelId || h.slug === hotelId);
          if (current?.enabledPortals && Array.isArray(current.enabledPortals)) {
            setEnabledPortals(current.enabledPortals);
            localStorage.setItem('spicehub_enabled_portals', JSON.stringify(current.enabledPortals));
          }
        }
      } catch (err) {
        console.warn('Could not refresh hotel enabledPortals:', err);
      }
    }
    void loadHotelPortals();
    return () => {
      isMounted = false;
    };
  }, [hotelId]);

  // PIN visibility state map
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});

  // Create Staff Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<StaffRoleType>('WAITER');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('1234');
  const [shift, setShift] = useState('Morning Shift (08:00 AM - 04:30 PM)');

  // Role specific fields
  const [assignedSection, setAssignedSection] = useState('Indoor AC Hall');
  const [tableStart, setTableStart] = useState('1');
  const [tableEnd, setTableEnd] = useState('6');
  const [assignedStation, setAssignedStation] = useState('Executive Chef Hot Pass');
  const [assignedCounter, setAssignedCounter] = useState('Cash Counter #1 (Main Dining)');

  // Staff Profile Image State (Mandatory - Camera & Gallery Only)
  const [avatar, setAvatar] = useState<string>(DEFAULT_STAFF_AVATAR);

  // Edit Existing Staff Photo Modal
  const [editingStaffPhoto, setEditingStaffPhoto] = useState<HotelStaffMember | null>(null);
  const [editPhotoUrl, setEditPhotoUrl] = useState<string>('');

  // Edit Existing Staff PIN Modal
  const [editingStaffPin, setEditingStaffPin] = useState<HotelStaffMember | null>(null);
  const [newStaffPin, setNewStaffPin] = useState<string>('');

  const handleSaveStaffPin = async () => {
    if (!editingStaffPin) return;
    if (!/^\d{4}$/.test(newStaffPin.trim())) {
      showToast('PIN must be EXACTLY 4 numeric digits.');
      return;
    }
    try {
      const res = await apiFetch(`/hotel-staff/${editingStaffPin.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: newStaffPin.trim() }),
      });
      if (res.ok) {
        setStaffList((prev) =>
          prev.map((s) => (s.id === editingStaffPin.id ? { ...s, pin: newStaffPin.trim(), pinStatus: 'ACTIVE', pinApprovedByAdmin: true } : s))
        );
        try {
          const currentAllocRaw = localStorage.getItem('spicehub_admin_waiter_allocations') || '{}';
          const allocs = JSON.parse(currentAllocRaw);
          if (allocs[editingStaffPin.id]) {
            allocs[editingStaffPin.id].pin = newStaffPin.trim();
            localStorage.setItem('spicehub_admin_waiter_allocations', JSON.stringify(allocs));
          }
        } catch (_) {}
        showToast(`✓ PIN updated to "${newStaffPin.trim()}" for staff "${editingStaffPin.name}"! Previous PIN removed.`);
        setEditingStaffPin(null);
        setNewStaffPin('');
      } else {
        const body = await res.json().catch(() => null);
        showToast(body?.message || 'Failed to update PIN.');
      }
    } catch (err: any) {
      showToast(`Error updating PIN: ${err.message}`);
    }
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressAvatar(file);
      if (isEdit) {
        setEditPhotoUrl(compressed);
      } else {
        setAvatar(compressed);
      }
    } catch (error: any) {
      showToast(error?.message || 'Unable to process the selected image.');
    } finally {
      e.target.value = '';
    }
  };

  const handleSaveStaffPhoto = async () => {
    if (!editingStaffPhoto || !editPhotoUrl.trim()) return;
    try {
      const res = await apiFetch(`/hotel-staff/${editingStaffPhoto.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: editPhotoUrl.trim() }),
      });
      if (res.ok) {
        setStaffList((prev) =>
          prev.map((s) => (s.id === editingStaffPhoto.id ? { ...s, avatar: editPhotoUrl.trim() } : s))
        );
        try {
          const customAvatars = JSON.parse(localStorage.getItem('spicehub_custom_waiter_avatars') || '{}');
          customAvatars[editingStaffPhoto.id] = editPhotoUrl.trim();
          localStorage.setItem('spicehub_custom_waiter_avatars', JSON.stringify(customAvatars));
        } catch (_) {}
        showToast(`✓ Profile photo updated for "${editingStaffPhoto.name}"!`);
        setEditingStaffPhoto(null);
      }
    } catch (err: any) {
      showToast(`Error updating photo: ${err.message}`);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 5000);
  };

  // Fetch staff list from backend API
  const fetchStaff = async () => {
    try {
      setIsLoading(true);
      const res = await apiFetch(`/hotel-staff?hotelId=${hotelId}`);
      if (res.ok) {
        const body = await res.json();
        if (body.success && Array.isArray(body.data)) {
          setStaffList(body.data);
        }
      }
    } catch (err) {
      console.warn('Staff fetch failed, using resilient fallback:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [hotelId]);

  // Derived counts
  const countCashiers = staffList.filter((s) => s.role.includes('CASHIER')).length;
  const countWaiters = staffList.filter((s) => s.role.includes('WAITER')).length;
  const countChefs = staffList.filter((s) => s.role.includes('CHEF') || s.role.includes('KITCHEN')).length;
  const countReception = staffList.filter((s) => s.role.includes('RECEPTION') || s.role.includes('FRONTDESK') || s.role.includes('MANAGER')).length;

  const filteredStaff = staffList.filter((s) => {
    if (activeRoleFilter !== 'ALL') {
      if (activeRoleFilter === 'RECEPTIONIST') {
        if (!s.role.includes('RECEPTION') && !s.role.includes('FRONTDESK')) return false;
      } else if (!s.role.includes(activeRoleFilter)) {
        return false;
      }
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchRole = s.role.toLowerCase().includes(q);
      const matchPhone = s.phone.toLowerCase().includes(q);
      const matchSection = (s.assignedSection || '').toLowerCase().includes(q);
      const matchStation = (s.assignedStation || '').toLowerCase().includes(q);
      return matchName || matchRole || matchPhone || matchSection || matchStation;
    }
    return true;
  });

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please enter the staff member name.');
      return;
    }

    if (!pin || !/^\d{4}$/.test(pin.trim())) {
      showToast('A 4-digit numeric access PIN is required (numbers only, exactly 4 digits).');
      return;
    }

    if (!avatar || !avatar.trim() || avatar === DEFAULT_STAFF_AVATAR) {
      showToast('Staff profile photo is mandatory. Please capture with camera or choose from gallery.');
      return;
    }

    const payload = {
      name: name.trim(),
      role: selectedRole,
      phone: phone || '+91 98000 00000',
      email: email || `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.${selectedRole.toLowerCase()}@spicehub.hotel`,
      pin: pin.trim(),
      shift,
      avatar: avatar.trim(),
      assignedSection: selectedRole === 'WAITER' ? assignedSection : undefined,
      assignedTableStart: selectedRole === 'WAITER' ? Number(tableStart) || 1 : undefined,
      assignedTableEnd: selectedRole === 'WAITER' ? Number(tableEnd) || 6 : undefined,
      assignedStation: selectedRole === 'CHEF' ? assignedStation : undefined,
      assignedCounter: (selectedRole === 'CASHIER' || selectedRole === 'RECEPTIONIST') ? assignedCounter : undefined,
      hotelId,
    };

    try {
      const res = await apiFetch('/hotel-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => null);

      if (!res.ok || !body?.success) {
        showToast(body?.message || 'Failed to create staff member. Please check details.');
        return;
      }

      if (body.data) {
        setStaffList((prev) => [body.data, ...prev.filter((p) => p.id !== body.data.id)]);
        
        // Also sync to localStorage allocations for instant Waiter app login
        if (selectedRole === 'WAITER') {
          try {
            const currentAllocRaw = localStorage.getItem('spicehub_admin_waiter_allocations') || '{}';
            const allocs = JSON.parse(currentAllocRaw);
            allocs[body.data.id] = {
              start: Number(tableStart) || 1,
              end: Number(tableEnd) || 6,
              section: assignedSection,
              name: body.data.name,
              role: body.data.role,
              avatar: body.data.avatar,
              pin: body.data.pin,
            };
            localStorage.setItem('spicehub_admin_waiter_allocations', JSON.stringify(allocs));

            const customAvatars = JSON.parse(localStorage.getItem('spicehub_custom_waiter_avatars') || '{}');
            customAvatars[body.data.id] = body.data.avatar;
            localStorage.setItem('spicehub_custom_waiter_avatars', JSON.stringify(customAvatars));

            const createdStaffList = JSON.parse(localStorage.getItem('spicehub_admin_created_staff') || '[]');
            createdStaffList.unshift(body.data);
            localStorage.setItem('spicehub_admin_created_staff', JSON.stringify(createdStaffList));
          } catch (_) {}
        }

        showToast(`✓ Staff member "${name}" (${selectedRole}) created successfully! Access PIN: ${pin}`);
        setIsCreateModalOpen(false);
        // Reset form
        setName('');
        setPhone('');
        setEmail('');
        setPin('1234');
        setAvatar(DEFAULT_STAFF_AVATAR);
      }
    } catch (err: any) {
      showToast(`Error creating staff: ${err.message}`);
    }
  };

  const handleDeleteStaff = async (id: string, staffName: string) => {
    if (!window.confirm(`Are you sure you want to remove staff member "${staffName}"?`)) return;
    try {
      await apiFetch(`/hotel-staff/${id}`, { method: 'DELETE' });
      setStaffList((prev) => prev.filter((s) => s.id !== id));
      showToast(`Removed staff member "${staffName}"`);
    } catch (err) {
      showToast('Failed to delete staff member');
    }
  };

  const handleApprovePin = async (id: string, staffName: string) => {
    try {
      const res = await apiFetch(`/hotel-staff/${id}/approve-pin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'APPROVE' }),
      });
      const body = await res.json();
      if (res.ok && body.success) {
        showToast(`✓ PIN approved for ${staffName}! Status is now ACTIVE.`);
        setStaffList((prev) =>
          prev.map((s) => (s.id === id ? { ...s, pinStatus: 'ACTIVE', pinApprovedByAdmin: true } : s))
        );
      } else {
        showToast(body.message || 'Failed to approve PIN');
      }
    } catch (err: any) {
      showToast(`Error approving PIN: ${err.message}`);
    }
  };

  const togglePinReveal = (id: string) => {
    setRevealedPins((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 text-slate-900 bg-slate-50 min-h-screen">
      {/* Toast Banner */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-bounce max-w-lg w-11/12">
          <div className="p-3.5 bg-emerald-600 text-white rounded-xl shadow-lg border border-emerald-500 font-bold text-xs sm:text-sm flex items-center justify-between">
            <span>{toast}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-white/80 hover:text-white font-black">✕</button>
          </div>
        </div>
      )}

      {/* 1. Header & Actions Bar */}
      <div className="p-5 rounded-2xl border border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-black">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Hotel Staff & Terminal Access
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                Multi-Portal RBAC
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Create, allocate and manage logins for Cashier POS, Waiter Mobile, Kitchen KDS, and Reception Frontdesk.
            </p>
          </div>
        </div>

        <button
          data-testid="open-create-staff-modal-btn"
          onClick={() => {
            const allowed = [
              { role: 'WAITER' as const, portal: 'waiter' },
              { role: 'CHEF' as const, portal: 'kds' },
              { role: 'CASHIER' as const, portal: 'cashier' },
              { role: 'RECEPTIONIST' as const, portal: 'reception' },
            ].filter((r) => enabledPortals.includes(r.portal));
            if (allowed.length > 0 && !allowed.some((r) => r.role === selectedRole)) {
              setSelectedRole(allowed[0].role);
            }
            setIsCreateModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-98"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Add Staff</span>
        </button>
      </div>

      {/* 2. Role KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Waiters */}
        {enabledPortals.includes('waiter') && (
          <div
            onClick={() => setActiveRoleFilter('WAITER')}
            className={`p-4 rounded-xl border bg-white transition-all cursor-pointer hover:border-orange-300 shadow-xs ${
              activeRoleFilter === 'WAITER' ? 'ring-2 ring-orange-500 border-orange-300' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between text-orange-600 font-bold text-xs uppercase tracking-wider">
              <span>Waiters / Captains</span>
              <UtensilsCrossed className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black mt-2 text-slate-900">{countWaiters}</div>
            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center justify-between">
              <span>Floor & KOT Mobile</span>
              <span className="font-semibold text-emerald-600">Handheld App</span>
            </div>
          </div>
        )}

        {/* Kitchen Chefs */}
        {enabledPortals.includes('kds') && (
          <div
            onClick={() => setActiveRoleFilter('CHEF')}
            className={`p-4 rounded-xl border bg-white transition-all cursor-pointer hover:border-red-300 shadow-xs ${
              activeRoleFilter === 'CHEF' ? 'ring-2 ring-red-500 border-red-300' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between text-red-600 font-bold text-xs uppercase tracking-wider">
              <span>Kitchen Chefs</span>
              <ChefHat className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black mt-2 text-slate-900">{countChefs}</div>
            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center justify-between">
              <span>Pass Stations</span>
              <span className="font-semibold text-emerald-600">KDS Screen</span>
            </div>
          </div>
        )}

        {/* Cashiers */}
        {enabledPortals.includes('cashier') && (
          <div
            onClick={() => setActiveRoleFilter('CASHIER')}
            className={`p-4 rounded-xl border bg-white transition-all cursor-pointer hover:border-blue-300 shadow-xs ${
              activeRoleFilter === 'CASHIER' ? 'ring-2 ring-blue-500 border-blue-300' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between text-blue-600 font-bold text-xs uppercase tracking-wider">
              <span>Cashiers (Billing)</span>
              <CreditCard className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black mt-2 text-slate-900">{countCashiers}</div>
            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center justify-between">
              <span>Billing Counter</span>
              <span className="font-semibold text-emerald-600">Cashier POS</span>
            </div>
          </div>
        )}

        {/* Receptionists */}
        {enabledPortals.includes('reception') && (
          <div
            onClick={() => setActiveRoleFilter('RECEPTIONIST')}
            className={`p-4 rounded-xl border bg-white transition-all cursor-pointer hover:border-purple-300 shadow-xs ${
              activeRoleFilter === 'RECEPTIONIST' ? 'ring-2 ring-purple-500 border-purple-300' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between text-purple-600 font-bold text-xs uppercase tracking-wider">
              <span>Reception Frontdesk</span>
              <Building2 className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black mt-2 text-slate-900">{countReception}</div>
            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center justify-between">
              <span>PMS Check-in</span>
              <span className="font-semibold text-emerald-600">Front Desk PMS</span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Search, Role Filter Tabs & View Toggle */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 custom-scrollbar">
          {(['ALL', 'WAITER', 'CHEF', 'CASHIER', 'RECEPTIONIST'] as const)
            .filter((r) => {
              if (r === 'ALL') return true;
              if (r === 'WAITER') return enabledPortals.includes('waiter');
              if (r === 'CHEF') return enabledPortals.includes('kds');
              if (r === 'CASHIER') return enabledPortals.includes('cashier');
              if (r === 'RECEPTIONIST') return enabledPortals.includes('reception');
              return true;
            })
            .map((r) => (
            <button
              key={r}
              onClick={() => setActiveRoleFilter(r)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeRoleFilter === r
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-2xs'
              }`}
            >
              {r === 'ALL' ? 'All Staff' : r === 'WAITER' ? 'Waiters & Captains' : r === 'CHEF' ? 'Kitchen Chefs' : r === 'CASHIER' ? 'Cashiers' : 'Receptionists'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                viewMode === 'table' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Table View"
            >
              <LayoutList className="w-4 h-4" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                viewMode === 'grid' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Grid Cards View"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Cards</span>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search staff, role, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>

      {/* 4. Staff Members Data Table or Grid */}
      {filteredStaff.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border bg-white border-slate-200 text-slate-500 shadow-xs">
          <Users className="w-12 h-12 mx-auto mb-2 opacity-30 text-slate-400" />
          <div className="font-bold text-base text-slate-700">No staff members found</div>
          <p className="text-xs mt-1 text-slate-400">Click "+ Add Staff" to add Cashier, Waiter, Kitchen, or Reception staff.</p>
        </div>
      ) : viewMode === 'table' ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase px-4 py-3 border-b border-slate-200">
                <th className="px-4 py-3">Staff Name</th>
                <th className="px-4 py-3">Email / Phone</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Terminal Permissions</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredStaff.map((staff) => {
                const isWaiter = staff.role.includes('WAITER');
                const isChef = staff.role.includes('CHEF') || staff.role.includes('KITCHEN');
                const isCashier = staff.role.includes('CASHIER');
                const isRec = staff.role.includes('RECEPTION') || staff.role.includes('FRONTDESK') || staff.role.includes('MANAGER');
                const isRevealed = revealedPins[staff.id];

                const portalUrl = isWaiter
                  ? getPortalUrl('waiter')
                  : isChef
                  ? getPortalUrl('kds')
                  : isCashier
                  ? getPortalUrl('cashier')
                  : getPortalUrl('reception');

                const portalLabel = isWaiter
                  ? '📱 Waiter App'
                  : isChef
                  ? '🍳 Kitchen KDS'
                  : isCashier
                  ? '⚡ Cashier POS'
                  : '🛎️ Reception';

                return (
                  <tr key={staff.id} className="border-b border-slate-200 hover:bg-slate-50 px-4 py-3 text-sm text-slate-700 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="relative group cursor-pointer"
                          title="Click to update staff photo"
                          onClick={() => {
                            setEditingStaffPhoto(staff);
                            setEditPhotoUrl(staff.avatar || DEFAULT_STAFF_AVATAR);
                          }}
                        >
                          <img
                            src={staff.avatar || DEFAULT_STAFF_AVATAR}
                            alt={staff.name}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200 group-hover:border-blue-500 transition"
                          />
                          <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
                            <Camera className="w-3.5 h-3.5" />
                          </div>
                          <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                            staff.shiftStatus === 'ON_DUTY' ? 'bg-emerald-500' : 'bg-slate-300'
                          }`} />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{staff.name}</div>
                          <div className="text-[11px] text-slate-400">ID: {staff.id.slice(0, 8)}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-slate-800 font-medium text-xs">{staff.phone || '—'}</div>
                      <div className="text-slate-400 text-[11px]">{staff.shift}</div>
                    </td>

                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${
                        isWaiter
                          ? 'bg-orange-50 text-orange-700 border border-orange-200'
                          : isChef
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : isCashier
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}>
                        {staff.role}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-xs font-semibold text-slate-700">
                        {isWaiter && (staff.assignedSection || 'All Tables')}
                        {isChef && (staff.assignedStation || 'Hot Pass')}
                        {isCashier && (staff.assignedCounter || 'POS Counter #1')}
                        {isRec && (staff.assignedCounter || 'Frontdesk Terminal #1')}
                        {!isWaiter && !isChef && !isCashier && !isRec && 'General Access'}
                      </div>
                      <a
                        href={portalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 mt-0.5"
                      >
                        <span>{portalLabel}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold w-fit ${
                          staff.shiftStatus === 'ON_DUTY'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${staff.shiftStatus === 'ON_DUTY' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {staff.shiftStatus === 'ON_DUTY' ? 'On Duty' : 'Offline'}
                        </span>
                        {staff.pinStatus === 'PENDING_APPROVAL' ? (
                          <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                            <span>⏳ PIN Pending</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                            <span>✓ PIN Active</span>
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {staff.pinStatus === 'PENDING_APPROVAL' && (
                          <button
                            type="button"
                            data-testid={`approve-pin-btn-${staff.id}`}
                            onClick={() => handleApprovePin(staff.id, staff.name)}
                            className="px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs"
                            title="Approve PIN"
                          >
                            <Check className="w-3 h-3" />
                            <span>Approve</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => togglePinReveal(staff.id)}
                          className="px-2 py-1 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-xs font-mono font-bold flex items-center gap-1"
                          title={isRevealed ? `PIN: ${staff.pin}` : 'Reveal PIN'}
                        >
                          <KeyRound className="w-3 h-3 text-slate-400" />
                          <span>{isRevealed ? staff.pin : '••••'}</span>
                        </button>
                        <button
                          type="button"
                          data-testid={`edit-pin-btn-${staff.id}`}
                          onClick={() => {
                            setEditingStaffPin(staff);
                            setNewStaffPin(staff.pin || '');
                          }}
                          className="px-2 py-1 rounded-md border border-blue-200 hover:bg-blue-50 text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center gap-1"
                          title="Change Staff PIN"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Change</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStaff(staff.id, staff.name)}
                          className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700 transition"
                          title="Deactivate Staff"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map((staff) => {
            const isWaiter = staff.role.includes('WAITER');
            const isChef = staff.role.includes('CHEF') || staff.role.includes('KITCHEN');
            const isCashier = staff.role.includes('CASHIER');
            const isRec = staff.role.includes('RECEPTION') || staff.role.includes('FRONTDESK') || staff.role.includes('MANAGER');
            const isRevealed = revealedPins[staff.id];

            const portalUrl = isWaiter
              ? getPortalUrl('waiter')
              : isChef
              ? getPortalUrl('kds')
              : isCashier
              ? getPortalUrl('cashier')
              : getPortalUrl('reception');

            const portalLabel = isWaiter
              ? '📱 Waiter App'
              : isChef
              ? '🍳 Kitchen KDS'
              : isCashier
              ? '⚡ Cashier POS'
              : '🛎️ Reception';

            return (
              <div
                key={staff.id}
                className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col justify-between gap-4 transition-all hover:shadow-md shadow-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="relative group cursor-pointer"
                        title="Click to update staff photo"
                        onClick={() => {
                          setEditingStaffPhoto(staff);
                          setEditPhotoUrl(staff.avatar || DEFAULT_STAFF_AVATAR);
                        }}
                      >
                        <img
                          src={staff.avatar || DEFAULT_STAFF_AVATAR}
                          alt={staff.name}
                          className="w-11 h-11 rounded-full object-cover border-2 border-slate-200 group-hover:border-blue-500 transition"
                        />
                        <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
                          <Camera className="w-4 h-4 text-blue-400" />
                        </div>
                        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white ${
                          staff.shiftStatus === 'ON_DUTY' ? 'bg-emerald-500' : 'bg-slate-400'
                        }`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900">
                          {staff.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            isWaiter
                              ? 'bg-orange-50 text-orange-700 border border-orange-200'
                              : isChef
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : isCashier
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}>
                            {staff.role}
                          </span>
                          <span className="text-[10px] text-emerald-600 font-bold">
                            ● On Duty
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteStaff(staff.id, staff.name)}
                      className="text-slate-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition"
                      title="Deactivate staff"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-3 p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1.5">
                    {isWaiter && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-semibold">Assigned Tables:</span>
                          <span className="font-bold text-orange-600">
                            Tables T-{String(staff.assignedTableStart || 1).padStart(2, '0')} to T-{String(staff.assignedTableEnd || 6).padStart(2, '0')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-semibold">Dining Section:</span>
                          <span className="font-medium text-slate-700">{staff.assignedSection || 'Main Dining Hall'}</span>
                        </div>
                      </>
                    )}

                    {isChef && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-semibold">Kitchen Station:</span>
                        <span className="font-bold text-red-600 truncate max-w-[180px]">
                          {staff.assignedStation || 'Hot Pass / Tandoor'}
                        </span>
                      </div>
                    )}

                    {isCashier && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-semibold">POS Terminal:</span>
                        <span className="font-bold text-blue-600">
                          {staff.assignedCounter || 'Counter #1 (Main Dining)'}
                        </span>
                      </div>
                    )}

                    {isRec && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-semibold">Frontdesk Desk:</span>
                        <span className="font-bold text-purple-600">
                          {staff.assignedCounter || 'Frontdesk Terminal #1'}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                      <span className="text-slate-500 font-semibold">Shift Timing:</span>
                      <span className="text-[11px] font-medium text-slate-700">{staff.shift}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">Mobile / Phone:</span>
                      <span className="font-bold text-slate-700">{staff.phone}</span>
                    </div>
                  </div>

                  <div className="mt-2.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-3.5 h-3.5 text-slate-600" />
                        <span className="text-[11px] font-bold text-slate-700">Quick Access PIN:</span>
                        <span className="font-mono font-bold tracking-widest text-xs px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-800">
                          {isRevealed ? staff.pin : '••••'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => togglePinReveal(staff.id)}
                          className="text-slate-600 hover:text-slate-900 p-1 text-xs font-bold flex items-center gap-1"
                        >
                          {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          <span className="text-[10px]">{isRevealed ? 'Hide' : 'Reveal'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingStaffPin(staff);
                            setNewStaffPin(staff.pin || '');
                          }}
                          className="text-blue-600 hover:text-blue-800 p-1 text-xs font-bold flex items-center gap-1"
                          title="Change Staff PIN"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span className="text-[10px]">Change</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-200">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-500 font-semibold">PIN Status:</span>
                        {staff.pinStatus === 'PENDING_APPROVAL' ? (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                            ⏳ Pending Approval
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ✓ Active
                          </span>
                        )}
                      </div>
                      {staff.pinStatus === 'PENDING_APPROVAL' && (
                        <button
                          type="button"
                          data-testid={`approve-pin-btn-${staff.id}`}
                          onClick={() => handleApprovePin(staff.id, staff.name)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase tracking-wider shadow-xs flex items-center gap-1 transition active:scale-95"
                        >
                          <Check className="w-3 h-3" />
                          <span>Approve PIN</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <a
                  href={portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    isWaiter
                      ? 'bg-orange-500 hover:bg-orange-600 text-white'
                      : isChef
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : isCashier
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                >
                  <span>{portalLabel}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. CREATE STAFF MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="max-w-xl w-full rounded-2xl border border-slate-200 bg-white text-slate-900 p-6 space-y-5 shadow-xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900">Create New Hotel Staff</h3>
                  <p className="text-xs text-slate-500">Add credentials and allocate duty terminal</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4">
              {/* Step 1: Role Selector Cards */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-2">
                  Select Staff Role / Portal Type:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { role: 'WAITER' as const, label: 'Waiter / Captain', icon: UtensilsCrossed, color: 'text-orange-600', border: 'border-orange-500', portal: 'waiter' },
                    { role: 'CHEF' as const, label: 'Kitchen Chef', icon: ChefHat, color: 'text-red-600', border: 'border-red-500', portal: 'kds' },
                    { role: 'CASHIER' as const, label: 'Cashier (Billing)', icon: CreditCard, color: 'text-blue-600', border: 'border-blue-500', portal: 'cashier' },
                    { role: 'RECEPTIONIST' as const, label: 'Reception Frontdesk', icon: Building2, color: 'text-purple-600', border: 'border-purple-500', portal: 'reception' },
                  ]
                    .filter((r) => enabledPortals.includes(r.portal))
                    .map((r) => {
                    const Icon = r.icon;
                    const isSel = selectedRole === r.role;
                    return (
                      <button
                        key={r.role}
                        type="button"
                        data-testid={`create-staff-role-${r.role.toLowerCase()}`}
                        onClick={() => setSelectedRole(r.role as StaffRoleType)}
                        className={`p-3 rounded-xl border text-left flex flex-col justify-between transition ${
                          isSel
                            ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500 text-blue-900'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${r.color} mb-1`} />
                        <span className="font-bold text-xs">{r.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Full Staff Name *</label>
                  <input
                    data-testid="create-staff-name-input"
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Phone Number</label>
                  <input
                    data-testid="create-staff-phone-input"
                    type="text"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Step 3: Login PIN & Shift */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">4-Digit Access PIN *</label>
                    <button
                      type="button"
                      onClick={() => {
                        const randomPin = String(Math.floor(1000 + Math.random() * 9000));
                        setPin(randomPin);
                      }}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition flex items-center gap-1 cursor-pointer"
                    >
                      <span>🎲 Generate 4-Digit PIN</span>
                    </button>
                  </div>
                  <input
                    data-testid="create-staff-pin-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={8}
                    required
                    placeholder="1234"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    className={`w-full p-2.5 rounded-xl border bg-white text-slate-900 text-xs font-mono tracking-widest font-bold focus:outline-none focus:ring-1 ${
                      pin.length !== 4
                        ? 'border-red-400 focus:ring-red-500 focus:border-red-500 bg-red-50/20'
                        : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                  />
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-slate-500">Only numbers, strictly 4 digits</span>
                    <span className={`text-[10px] font-mono font-bold ${pin.length === 4 ? 'text-emerald-600' : 'text-red-500'}`}>{pin.length}/4</span>
                  </div>
                  {pin.length !== 4 ? (
                    <p data-testid="admin-pin-error" className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1">
                      <span>⚠️</span>
                      <span>PIN must be EXACTLY 4 digits (currently {pin.length} {pin.length === 1 ? 'digit' : 'digits'}). Save is blocked.</span>
                    </p>
                  ) : (
                    <p className="text-[11px] font-bold text-emerald-600 mt-1 flex items-center gap-1">
                      <span>✓</span>
                      <span>Valid 4-digit PIN ready</span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Shift Timing</label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Morning Shift (08:00 AM - 04:30 PM)">Morning (08:00 AM - 04:30 PM)</option>
                    <option value="Evening Shift (04:00 PM - 12:30 AM)">Evening (04:00 PM - 12:30 AM)</option>
                    <option value="Night Shift (12:00 AM - 08:30 AM)">Night (12:00 AM - 08:30 AM)</option>
                    <option value="Full Day Shift (10:00 AM - 10:00 PM)">Full Day (10:00 AM - 10:00 PM)</option>
                  </select>
                </div>
              </div>

              {/* Step 3.5: Staff Profile Photo */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-800">Staff Profile Photo (Camera & Gallery) *</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    avatar && avatar !== DEFAULT_STAFF_AVATAR
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {avatar && avatar !== DEFAULT_STAFF_AVATAR ? '✓ Photo Ready' : 'Photo Required'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Live Avatar Preview */}
                  <div className="relative shrink-0">
                    <img
                      src={avatar || DEFAULT_STAFF_AVATAR}
                      alt="Avatar Preview"
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-200 shadow-xs"
                    />
                    {avatar && avatar !== DEFAULT_STAFF_AVATAR && (
                      <div className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 rounded-full text-white shadow">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 w-full">
                    <div className="grid grid-cols-2 gap-2">
                      <label className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition shadow-xs text-center">
                        <Camera className="w-3.5 h-3.5" />
                        <span>Take Camera Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="user"
                          className="hidden"
                          onChange={(e) => handleImageFileUpload(e, false)}
                        />
                      </label>

                      <label className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition shadow-xs text-center">
                        <Upload className="w-3.5 h-3.5 text-slate-600" />
                        <span>Choose from Gallery</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageFileUpload(e, false)}
                        />
                      </label>
                    </div>

                    <div className="text-[10px] text-slate-500 flex items-center justify-between">
                      <span>📸 Auto-compressed square JPEG ~40 KB</span>
                      {avatar && avatar !== DEFAULT_STAFF_AVATAR && (
                        <span className="text-emerald-600 font-bold">✓ Attached</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 4: Role-Specific Allocations */}
              {selectedRole === 'WAITER' && (
                <div className="p-3.5 rounded-xl border border-orange-200 bg-orange-50/70 space-y-3">
                  <div className="text-xs font-bold text-orange-700 flex items-center gap-1.5">
                    <UtensilsCrossed className="w-4 h-4" />
                    <span>Waiter Table Allocation Zone</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-600 block mb-1">Assigned Section</label>
                      <select
                        value={assignedSection}
                        onChange={(e) => setAssignedSection(e.target.value)}
                        className="w-full p-2 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs"
                      >
                        <option value="Indoor AC Hall">Indoor AC Hall</option>
                        <option value="Community Lounge">Community Lounge</option>
                        <option value="Rooftop Terrace">Rooftop Terrace</option>
                        <option value="Family Garden">Family Garden</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-600 block mb-1">Start Table No.</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={tableStart}
                        onChange={(e) => setTableStart(e.target.value)}
                        className="w-full p-2 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-600 block mb-1">End Table No.</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={tableEnd}
                        onChange={(e) => setTableEnd(e.target.value)}
                        className="w-full p-2 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {selectedRole === 'CHEF' && (
                <div className="p-3.5 rounded-xl border border-red-200 bg-red-50/70 space-y-2">
                  <div className="text-xs font-bold text-red-700 flex items-center gap-1.5">
                    <ChefHat className="w-4 h-4" />
                    <span>Kitchen Station Assignment</span>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Kitchen Station Pass</label>
                    <select
                      value={assignedStation}
                      onChange={(e) => setAssignedStation(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs"
                    >
                      <option value="Executive Chef Hot Pass">Executive Chef Hot Pass (All Stations)</option>
                      <option value="Tandoor & Starters Station">Tandoor & Starters Station</option>
                      <option value="Main Curry & Gravy Station">Main Curry & Gravy Station</option>
                      <option value="Bakery & Desserts Station">Bakery & Desserts Station</option>
                      <option value="Bar & Beverages Station">Bar & Beverages Station</option>
                    </select>
                  </div>
                </div>
              )}

              {selectedRole === 'CASHIER' && (
                <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/70 space-y-2">
                  <div className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4" />
                    <span>POS Cashier Counter</span>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Cashier Counter / Terminal</label>
                    <select
                      value={assignedCounter}
                      onChange={(e) => setAssignedCounter(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs"
                    >
                      <option value="Cash Counter #1 (Main Dining)">Cash Counter #1 (Main Dining)</option>
                      <option value="Cash Counter #2 (Express / Takeaway)">Cash Counter #2 (Express / Takeaway)</option>
                      <option value="Bar POS Counter">Bar POS Counter</option>
                    </select>
                  </div>
                </div>
              )}

              {selectedRole === 'RECEPTIONIST' && (
                <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/70 space-y-2">
                  <div className="text-xs font-bold text-purple-700 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" />
                    <span>Frontdesk Reception Terminal</span>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Reception Counter Desk</label>
                    <select
                      value={assignedCounter}
                      onChange={(e) => setAssignedCounter(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs"
                    >
                      <option value="Frontdesk Terminal #1 (Guest Check-In)">Frontdesk Terminal #1 (Guest Check-In)</option>
                      <option value="Frontdesk Terminal #2 (VIP / Folios)">Frontdesk Terminal #2 (VIP / Folios)</option>
                      <option value="Concierge Desk">Concierge Desk</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  data-testid="create-staff-submit-btn"
                  type="submit"
                  disabled={pin.length !== 4}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition ${
                    pin.length !== 4
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                      : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-98 cursor-pointer'
                  }`}
                  title={pin.length !== 4 ? 'Save is blocked: PIN must be exactly 4 digits' : 'Create Staff Member'}
                >
                  Create & Issue Login Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Photo Modal */}
      {editingStaffPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white text-slate-900 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Update Staff Photo</h3>
                  <p className="text-[11px] text-slate-500">Staff: {editingStaffPhoto.name} ({editingStaffPhoto.role})</p>
                </div>
              </div>
              <button
                onClick={() => setEditingStaffPhoto(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Preview */}
            <div className="flex flex-col items-center justify-center py-2 space-y-3">
              <div className="relative">
                <img
                  src={editPhotoUrl || DEFAULT_STAFF_AVATAR}
                  alt={editingStaffPhoto.name}
                  className="w-24 h-24 rounded-2xl object-cover border-2 border-slate-200 shadow-md"
                />
                <div className="absolute -bottom-1 -right-1 px-2 py-0.5 bg-emerald-500 text-white rounded-md text-[9px] font-bold shadow flex items-center gap-1">
                  <Check className="w-2.5 h-2.5" />
                  <span>Real Photo</span>
                </div>
              </div>
              <div className="text-center">
                <span className="text-xs font-bold text-slate-900 block">{editingStaffPhoto.name}</span>
                <span className="text-[10px] text-slate-500 font-mono">ID: {editingStaffPhoto.id} • {editingStaffPhoto.role}</span>
                <span className="text-[9px] text-emerald-600 font-mono block mt-0.5">Optimized: 400 × 400 px, ~40 KB JPEG</span>
              </div>
            </div>

            {/* Direct Camera & Gallery Upload */}
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <label className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex flex-col items-center justify-center gap-1.5 cursor-pointer transition shadow-xs text-center">
                  <Camera className="w-4 h-4" />
                  <span>Take Live Photo (Camera)</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="hidden"
                    onChange={(e) => handleImageFileUpload(e, true)}
                  />
                </label>

                <label className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs flex flex-col items-center justify-center gap-1.5 cursor-pointer transition shadow-xs text-center">
                  <Upload className="w-4 h-4 text-slate-600" />
                  <span>Choose from Gallery</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageFileUpload(e, true)}
                  />
                </label>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingStaffPhoto(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveStaffPhoto}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition"
              >
                Save Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Staff PIN Modal */}
      {editingStaffPin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white text-slate-900 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Update Staff PIN</h3>
                  <p className="text-[11px] text-slate-500">Staff: {editingStaffPin.name} ({editingStaffPin.role})</p>
                </div>
              </div>
              <button
                onClick={() => setEditingStaffPin(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Current Active PIN:</span>
                <span className="font-mono font-bold text-slate-800 px-2 py-0.5 bg-white border border-slate-200 rounded">
                  {editingStaffPin.pin || '••••'}
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                If the staff forgot their PIN, tell them the current PIN or assign a new 4-digit PIN below.
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                New 4-Digit Security PIN *
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={newStaffPin}
                onChange={(e) => setNewStaffPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="1234"
                className={`w-full p-3 rounded-xl border bg-white text-slate-900 text-base font-mono tracking-widest font-bold text-center focus:outline-none focus:ring-2 ${
                  newStaffPin.length !== 4
                    ? 'border-red-400 focus:ring-red-500 bg-red-50/20'
                    : 'border-slate-300 focus:ring-blue-500'
                }`}
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500">Strictly 4 numeric digits</span>
                <span className={`text-[11px] font-mono font-bold ${newStaffPin.length === 4 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {newStaffPin.length}/4
                </span>
              </div>
              {newStaffPin.length !== 4 ? (
                <p className="text-[11px] font-bold text-red-600 flex items-center gap-1">
                  <span>⚠️</span>
                  <span>PIN must be EXACTLY 4 digits (currently {newStaffPin.length}). Save is blocked.</span>
                </p>
              ) : (
                <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                  <span>✓</span>
                  <span>Valid 4-digit PIN ready to replace previous PIN.</span>
                </p>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingStaffPin(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={newStaffPin.length !== 4}
                onClick={handleSaveStaffPin}
                className={`px-5 py-2 rounded-xl font-bold text-xs shadow-sm transition ${
                  newStaffPin.length !== 4
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                    : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-98 cursor-pointer'
                }`}
              >
                Update PIN & Replace Old
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
