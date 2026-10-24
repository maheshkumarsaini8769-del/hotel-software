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
  Image as ImageIcon
} from 'lucide-react';

export type StaffRoleType = 'CASHIER' | 'WAITER' | 'CHEF' | 'RECEPTIONIST' | 'MANAGER';

export const PRESET_STAFF_AVATARS = [
  { id: 'av-w1', label: 'Ravi Kumar (Captain)', role: 'WAITER', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80' },
  { id: 'av-w2', label: 'Ramesh K. (Senior Waiter)', role: 'WAITER', url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&auto=format&fit=crop&q=80' },
  { id: 'av-w3', label: 'Priya Sharma (Waitress)', role: 'WAITER', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80' },
  { id: 'av-w4', label: 'Amit Singh (Steward)', role: 'WAITER', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80' },
  { id: 'av-c1', label: 'Suresh Chef (Head Chef)', role: 'CHEF', url: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=200&auto=format&fit=crop&q=80' },
  { id: 'av-c2', label: 'Vikram Singh (Tandoor)', role: 'CHEF', url: 'https://images.unsplash.com/photo-1583394293214-28ded15ee548?w=200&auto=format&fit=crop&q=80' },
  { id: 'av-pos1', label: 'Anil Gupta (Cashier)', role: 'CASHIER', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80' },
  { id: 'av-rec1', label: 'Sunita Mehra (Reception)', role: 'RECEPTIONIST', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80' },
];

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
  isDark = true,
  hotelId = getStoredHotelId(),
}) => {
  const [staffList, setStaffList] = useState<HotelStaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeRoleFilter, setActiveRoleFilter] = useState<'ALL' | StaffRoleType>('ALL');
  const [toast, setToast] = useState<string | null>(null);

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

  // Staff Profile Image State (Mandatory)
  const [avatar, setAvatar] = useState<string>(PRESET_STAFF_AVATARS[0].url);
  const [avatarInputUrl, setAvatarInputUrl] = useState<string>('');
  const [isCustomUrlActive, setIsCustomUrlActive] = useState<boolean>(false);

  // Edit Existing Staff Photo Modal
  const [editingStaffPhoto, setEditingStaffPhoto] = useState<HotelStaffMember | null>(null);
  const [editPhotoUrl, setEditPhotoUrl] = useState<string>('');

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

    if (!avatar || !avatar.trim()) {
      showToast('Staff profile photo is mandatory. Upload a photo or select an avatar.');
      return;
    }

    const payload = {
      name: name.trim(),
      role: selectedRole,
      phone: phone || '+91 98000 00000',
      email: email || `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.${selectedRole.toLowerCase()}@spicehub.hotel`,
      pin: pin || '1234',
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

      if (res.ok) {
        const body = await res.json();
        if (body.success && body.data) {
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
        }
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

  const togglePinReveal = (id: string) => {
    setRevealedPins((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className={`p-4 sm:p-6 space-y-6 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
      {/* Toast Banner */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-bounce max-w-lg w-11/12">
          <div className="p-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl shadow-2xl border border-emerald-400 font-bold text-xs sm:text-sm flex items-center justify-between">
            <span>{toast}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-white/80 hover:text-white font-black">✕</button>
          </div>
        </div>
      )}

      {/* 1. Header & Actions Bar */}
      <div className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
        isDark ? 'bg-[#0f131d] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-black shadow-lg shadow-indigo-600/25">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight">
                Hotel Staff & Terminal Access
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                Multi-Portal RBAC
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Create, allocate and manage logins for Cashier POS, Waiter Mobile, Kitchen KDS, and Reception Frontdesk.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition active:scale-98"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Create New Staff Member</span>
        </button>
      </div>

      {/* 2. Role KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Waiters */}
        <div
          onClick={() => setActiveRoleFilter('WAITER')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer hover:border-orange-500/50 ${
            activeRoleFilter === 'WAITER' ? 'ring-2 ring-orange-500' : ''
          } ${isDark ? 'bg-[#121622] border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}
        >
          <div className="flex items-center justify-between text-orange-500 font-bold text-xs uppercase tracking-wider">
            <span>Waiters / Captains</span>
            <UtensilsCrossed className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black mt-2 text-orange-500">{countWaiters}</div>
          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center justify-between">
            <span>Floor & KOT Mobile App</span>
            <span className="font-bold text-emerald-400">Port 3002</span>
          </div>
        </div>

        {/* Kitchen Chefs */}
        <div
          onClick={() => setActiveRoleFilter('CHEF')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer hover:border-rose-500/50 ${
            activeRoleFilter === 'CHEF' ? 'ring-2 ring-rose-500' : ''
          } ${isDark ? 'bg-[#121622] border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}
        >
          <div className="flex items-center justify-between text-rose-500 font-bold text-xs uppercase tracking-wider">
            <span>Kitchen Chefs</span>
            <ChefHat className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black mt-2 text-rose-500">{countChefs}</div>
          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center justify-between">
            <span>KDS Pass Terminals</span>
            <span className="font-bold text-emerald-400">Port 3003</span>
          </div>
        </div>

        {/* Cashiers */}
        <div
          onClick={() => setActiveRoleFilter('CASHIER')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer hover:border-blue-500/50 ${
            activeRoleFilter === 'CASHIER' ? 'ring-2 ring-blue-500' : ''
          } ${isDark ? 'bg-[#121622] border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}
        >
          <div className="flex items-center justify-between text-blue-500 font-bold text-xs uppercase tracking-wider">
            <span>Cashiers (Billing)</span>
            <CreditCard className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black mt-2 text-blue-500">{countCashiers}</div>
          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center justify-between">
            <span>POS Settlement Terminal</span>
            <span className="font-bold text-emerald-400">Port 3007</span>
          </div>
        </div>

        {/* Receptionists */}
        <div
          onClick={() => setActiveRoleFilter('RECEPTIONIST')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer hover:border-purple-500/50 ${
            activeRoleFilter === 'RECEPTIONIST' ? 'ring-2 ring-purple-500' : ''
          } ${isDark ? 'bg-[#121622] border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}
        >
          <div className="flex items-center justify-between text-purple-500 font-bold text-xs uppercase tracking-wider">
            <span>Reception Frontdesk</span>
            <Building2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black mt-2 text-purple-500">{countReception}</div>
          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center justify-between">
            <span>PMS Room Check-in</span>
            <span className="font-bold text-emerald-400">Port 3008</span>
          </div>
        </div>
      </div>

      {/* 3. Search and Role Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 custom-scrollbar">
          {(['ALL', 'WAITER', 'CHEF', 'CASHIER', 'RECEPTIONIST'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setActiveRoleFilter(r)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeRoleFilter === r
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : isDark
                  ? 'bg-[#121622] text-slate-400 hover:text-white border border-slate-800'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-2xs'
              }`}
            >
              {r === 'ALL' ? 'All Staff' : r === 'WAITER' ? 'Waiters & Captains' : r === 'CHEF' ? 'Kitchen Chefs' : r === 'CASHIER' ? 'Cashiers' : 'Receptionists'}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search staff, role, station, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-9 pr-3 py-1.5 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
              isDark ? 'bg-[#121622] border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
            }`}
          />
        </div>
      </div>

      {/* 4. Staff Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStaff.length === 0 ? (
          <div className={`col-span-full text-center py-16 rounded-2xl border ${
            isDark ? 'bg-[#0f131d] border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
          }`}>
            <Users className="w-12 h-12 mx-auto mb-2 opacity-30 text-indigo-500" />
            <div className="font-black text-base">No staff members found</div>
            <p className="text-xs mt-1">Click "+ Create New Staff Member" to add Cashier, Waiter, Kitchen, or Reception staff.</p>
          </div>
        ) : (
          filteredStaff.map((staff) => {
            const isWaiter = staff.role.includes('WAITER');
            const isChef = staff.role.includes('CHEF') || staff.role.includes('KITCHEN');
            const isCashier = staff.role.includes('CASHIER');
            const isRec = staff.role.includes('RECEPTION') || staff.role.includes('FRONTDESK') || staff.role.includes('MANAGER');
            const isRevealed = revealedPins[staff.id];

            // Target Portal URL
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
                className={`p-4 rounded-2xl border flex flex-col justify-between gap-4 transition-all hover:shadow-lg ${
                  isDark ? 'bg-[#121622] border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                }`}
              >
                <div>
                  {/* Top Bar: Avatar, Name, Role badge & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="relative group cursor-pointer"
                        title="Click to update staff photo"
                        onClick={() => {
                          setEditingStaffPhoto(staff);
                          setEditPhotoUrl(staff.avatar || PRESET_STAFF_AVATARS[0].url);
                        }}
                      >
                        <img
                          src={staff.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                          alt={staff.name}
                          className="w-11 h-11 rounded-full object-cover border-2 border-indigo-500/30 group-hover:border-orange-500 transition"
                        />
                        <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
                          <Camera className="w-4 h-4 text-orange-400" />
                        </div>
                        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ${
                          isDark ? 'ring-[#121622]' : 'ring-white'
                        } ${staff.shiftStatus === 'ON_DUTY' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      </div>
                      <div>
                        <h3 className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {staff.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                            isWaiter
                              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                              : isChef
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : isCashier
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          }`}>
                            {staff.role}
                          </span>
                          <span className="text-[10px] text-emerald-400 font-bold">
                            ● On Duty
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteStaff(staff.id, staff.name)}
                      className="text-slate-400 hover:text-rose-500 p-1 rounded-lg hover:bg-rose-500/10 transition"
                      title="Deactivate staff"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Operational Allocation Box */}
                  <div className={`mt-3 p-3 rounded-xl border text-xs space-y-1.5 ${
                    isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    {isWaiter && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-semibold">Assigned Tables:</span>
                          <span className="font-black text-orange-500">
                            Tables T-{String(staff.assignedTableStart || 1).padStart(2, '0')} to T-{String(staff.assignedTableEnd || 6).padStart(2, '0')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-semibold">Dining Section:</span>
                          <span className="font-bold text-slate-300">{staff.assignedSection || 'Main Dining Hall'}</span>
                        </div>
                      </>
                    )}

                    {isChef && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-semibold">Kitchen Station:</span>
                        <span className="font-black text-rose-400 truncate max-w-[180px]">
                          {staff.assignedStation || 'Hot Pass / Tandoor'}
                        </span>
                      </div>
                    )}

                    {isCashier && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-semibold">POS Terminal:</span>
                        <span className="font-black text-blue-400">
                          {staff.assignedCounter || 'Counter #1 (Main Dining)'}
                        </span>
                      </div>
                    )}

                    {isRec && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-semibold">Frontdesk Desk:</span>
                        <span className="font-black text-purple-400">
                          {staff.assignedCounter || 'Frontdesk Terminal #1'}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-slate-700/20">
                      <span className="text-slate-400 font-semibold">Shift Timing:</span>
                      <span className="text-[11px] font-medium text-slate-300">{staff.shift}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-semibold">Mobile / Phone:</span>
                      <span className="font-bold text-slate-300">{staff.phone}</span>
                    </div>
                  </div>

                  {/* 4-Digit Access PIN Box */}
                  <div className={`mt-2.5 p-2.5 rounded-xl border flex items-center justify-between ${
                    isDark ? 'bg-indigo-950/20 border-indigo-500/30' : 'bg-indigo-50/70 border-indigo-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-[11px] font-bold text-indigo-400">Quick Access PIN:</span>
                      <span className="font-black font-mono tracking-widest text-xs px-2 py-0.5 rounded bg-black/20">
                        {isRevealed ? staff.pin : '••••'}
                      </span>
                    </div>
                    <button
                      onClick={() => togglePinReveal(staff.id)}
                      className="text-indigo-400 hover:text-indigo-300 p-1 text-xs font-bold flex items-center gap-1"
                    >
                      {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span className="text-[10px]">{isRevealed ? 'Hide' : 'Reveal'}</span>
                    </button>
                  </div>
                </div>

                {/* Direct Action: Launch Staff Portal Link */}
                <a
                  href={portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition ${
                    isWaiter
                      ? 'bg-orange-500 hover:bg-orange-600 text-white'
                      : isChef
                      ? 'bg-rose-600 hover:bg-rose-500 text-white'
                      : isCashier
                      ? 'bg-blue-600 hover:bg-blue-500 text-white'
                      : 'bg-purple-600 hover:bg-purple-500 text-white'
                  }`}
                >
                  <span>{portalLabel}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            );
          })
        )}
      </div>

      {/* 5. CREATE STAFF MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className={`max-w-xl w-full rounded-2xl border p-5 sm:p-6 space-y-5 shadow-2xl my-8 ${
            isDark ? 'bg-[#121622] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg">Create New Hotel Staff</h3>
                  <p className="text-xs text-slate-400">Add credentials and allocate duty terminal</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4">
              {/* Step 1: Role Selector Cards */}
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-2">
                  Select Staff Role / Portal Type:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { role: 'WAITER', label: 'Waiter / Captain', icon: UtensilsCrossed, color: 'text-orange-400', border: 'border-orange-500' },
                    { role: 'CHEF', label: 'Kitchen Chef', icon: ChefHat, color: 'text-rose-400', border: 'border-rose-500' },
                    { role: 'CASHIER', label: 'Cashier (Billing)', icon: CreditCard, color: 'text-blue-400', border: 'border-blue-500' },
                    { role: 'RECEPTIONIST', label: 'Reception Frontdesk', icon: Building2, color: 'text-purple-400', border: 'border-purple-500' },
                  ].map((r) => {
                    const Icon = r.icon;
                    const isSel = selectedRole === r.role;
                    return (
                      <button
                        key={r.role}
                        type="button"
                        onClick={() => setSelectedRole(r.role as StaffRoleType)}
                        className={`p-3 rounded-xl border text-left flex flex-col justify-between transition ${
                          isSel
                            ? `bg-indigo-600/20 ${r.border} ring-2 ring-indigo-500 text-white`
                            : isDark
                            ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${r.color} mb-1`} />
                        <span className="font-black text-xs">{r.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Full Staff Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Step 3: Login PIN & Shift */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">4-Digit Access PIN *</label>
                  <input
                    type="text"
                    maxLength={4}
                    required
                    placeholder="1234"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    className={`w-full p-2.5 rounded-xl border text-xs font-mono tracking-widest font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                  <span className="text-[10px] text-slate-500">Used for fast login on mobile / terminal</span>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Shift Timing</label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="Morning Shift (08:00 AM - 04:30 PM)">Morning (08:00 AM - 04:30 PM)</option>
                    <option value="Evening Shift (04:00 PM - 12:30 AM)">Evening (04:00 PM - 12:30 AM)</option>
                    <option value="Night Shift (12:00 AM - 08:30 AM)">Night (12:00 AM - 08:30 AM)</option>
                    <option value="Full Day Shift (10:00 AM - 10:00 PM)">Full Day (10:00 AM - 10:00 PM)</option>
                  </select>
                </div>
              </div>

              {/* Step 3.5: Staff Profile Photo (Mandatory / अनिवार्य) */}
              <div className={`p-3.5 rounded-xl border space-y-3 ${
                isDark ? 'bg-slate-900/80 border-slate-700' : 'bg-slate-50 border-slate-300'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-orange-400" />
                    <span className="text-xs font-black text-white">Staff Profile Photo (फोटो लगाना अनिवार्य / Mandatory) *</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    Required for Waiter ID Badge
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Live Avatar Preview */}
                  <div className="relative shrink-0">
                    <img
                      src={avatar || PRESET_STAFF_AVATARS[0].url}
                      alt="Avatar Preview"
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-orange-500 shadow-md ring-4 ring-orange-500/20"
                    />
                    <div className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 rounded-full text-white shadow">
                      <Check className="w-2.5 h-2.5" />
                    </div>
                  </div>

                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition shadow-sm">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Photo from Device</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageFileUpload(e, false)}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => setIsCustomUrlActive(!isCustomUrlActive)}
                        className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Paste Photo URL</span>
                      </button>
                    </div>

                    {isCustomUrlActive && (
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="url"
                          placeholder="https://example.com/waiter-photo.jpg"
                          value={avatarInputUrl}
                          onChange={(e) => setAvatarInputUrl(e.target.value)}
                          className={`flex-1 p-2 rounded-lg border text-xs ${
                            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (avatarInputUrl.trim()) {
                              setAvatar(avatarInputUrl.trim());
                              showToast('✓ Photo URL applied to profile!');
                            }
                          }}
                          className="px-3 py-2 rounded-lg bg-orange-600 text-white text-xs font-bold"
                        >
                          Apply
                        </button>
                      </div>
                    )}

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">
                        Or select preset realistic staff portrait:
                      </span>
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                        {PRESET_STAFF_AVATARS.map((p) => {
                          const isSel = avatar === p.url;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setAvatar(p.url)}
                              className={`relative rounded-xl border-2 transition shrink-0 p-0.5 ${
                                isSel ? 'border-orange-500 ring-2 ring-orange-500/40' : 'border-slate-800 hover:border-slate-600'
                              }`}
                              title={p.label}
                            >
                              <img src={p.url} alt={p.label} className="w-9 h-9 rounded-lg object-cover" />
                              {isSel && (
                                <div className="absolute top-0 right-0 bg-orange-600 text-white rounded-full p-0.5">
                                  <Check className="w-2 h-2" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 4: Role-Specific Allocations */}
              {selectedRole === 'WAITER' && (
                <div className={`p-3.5 rounded-xl border space-y-3 ${
                  isDark ? 'bg-orange-950/15 border-orange-500/30' : 'bg-orange-50/70 border-orange-200'
                }`}>
                  <div className="text-xs font-black text-orange-500 flex items-center gap-1.5">
                    <UtensilsCrossed className="w-4 h-4" />
                    <span>Waiter Table Allocation Zone</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Assigned Section</label>
                      <select
                        value={assignedSection}
                        onChange={(e) => setAssignedSection(e.target.value)}
                        className={`w-full p-2 rounded-lg border text-xs ${
                          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      >
                        <option value="Indoor AC Hall">Indoor AC Hall</option>
                        <option value="Community Lounge">Community Lounge</option>
                        <option value="Rooftop Terrace">Rooftop Terrace</option>
                        <option value="Family Garden">Family Garden</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Start Table No.</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={tableStart}
                        onChange={(e) => setTableStart(e.target.value)}
                        className={`w-full p-2 rounded-lg border text-xs ${
                          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">End Table No.</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={tableEnd}
                        onChange={(e) => setTableEnd(e.target.value)}
                        className={`w-full p-2 rounded-lg border text-xs ${
                          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              )}

              {selectedRole === 'CHEF' && (
                <div className={`p-3.5 rounded-xl border space-y-2 ${
                  isDark ? 'bg-rose-950/15 border-rose-500/30' : 'bg-rose-50/70 border-rose-200'
                }`}>
                  <div className="text-xs font-black text-rose-500 flex items-center gap-1.5">
                    <ChefHat className="w-4 h-4" />
                    <span>Kitchen Station Assignment</span>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Kitchen Station Pass</label>
                    <select
                      value={assignedStation}
                      onChange={(e) => setAssignedStation(e.target.value)}
                      className={`w-full p-2 rounded-lg border text-xs ${
                        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300 text-slate-900'
                      }`}
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
                <div className={`p-3.5 rounded-xl border space-y-2 ${
                  isDark ? 'bg-blue-950/15 border-blue-500/30' : 'bg-blue-50/70 border-blue-200'
                }`}>
                  <div className="text-xs font-black text-blue-500 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4" />
                    <span>POS Cashier Counter</span>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Cashier Counter / Terminal</label>
                    <select
                      value={assignedCounter}
                      onChange={(e) => setAssignedCounter(e.target.value)}
                      className={`w-full p-2 rounded-lg border text-xs ${
                        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="Cash Counter #1 (Main Dining)">Cash Counter #1 (Main Dining)</option>
                      <option value="Cash Counter #2 (Express / Takeaway)">Cash Counter #2 (Express / Takeaway)</option>
                      <option value="Bar POS Counter">Bar POS Counter</option>
                    </select>
                  </div>
                </div>
              )}

              {selectedRole === 'RECEPTIONIST' && (
                <div className={`p-3.5 rounded-xl border space-y-2 ${
                  isDark ? 'bg-purple-950/15 border-purple-500/30' : 'bg-purple-50/70 border-purple-200'
                }`}>
                  <div className="text-xs font-black text-purple-500 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" />
                    <span>Frontdesk Reception Terminal</span>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Reception Counter Desk</label>
                    <select
                      value={assignedCounter}
                      onChange={(e) => setAssignedCounter(e.target.value)}
                      className={`w-full p-2 rounded-lg border text-xs ${
                        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="Frontdesk Terminal #1 (Guest Check-In)">Frontdesk Terminal #1 (Guest Check-In)</option>
                      <option value="Frontdesk Terminal #2 (VIP / Folios)">Frontdesk Terminal #2 (VIP / Folios)</option>
                      <option value="Concierge Desk">Concierge Desk</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-700/20">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold ${
                    isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-md transition active:scale-98"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-md rounded-2xl border p-5 space-y-4 shadow-2xl ${
            isDark ? 'bg-[#151926] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm">Update Staff Photo (फोटो बदलें)</h3>
                  <p className="text-[11px] text-slate-400">Staff: {editingStaffPhoto.name} ({editingStaffPhoto.role})</p>
                </div>
              </div>
              <button
                onClick={() => setEditingStaffPhoto(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Preview */}
            <div className="flex flex-col items-center justify-center py-2 space-y-3">
              <div className="relative">
                <img
                  src={editPhotoUrl || PRESET_STAFF_AVATARS[0].url}
                  alt={editingStaffPhoto.name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-orange-500 shadow-xl ring-4 ring-orange-500/20"
                />
                <div className="absolute bottom-0 right-0 p-1.5 bg-orange-600 rounded-full text-white shadow">
                  <Camera className="w-4 h-4" />
                </div>
              </div>
              <span className="text-xs font-bold text-slate-400">Live Photo Preview</span>
            </div>

            {/* Upload or Choose */}
            <div className="space-y-3">
              <label className="w-full py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition shadow-sm">
                <Upload className="w-4 h-4" />
                <span>Upload New Photo from Device</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageFileUpload(e, true)}
                />
              </label>

              <div>
                <span className="text-[11px] font-bold text-slate-400 block mb-1">
                  Or select from professional avatar presets:
                </span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                  {PRESET_STAFF_AVATARS.map((p) => {
                    const isSel = editPhotoUrl === p.url;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setEditPhotoUrl(p.url)}
                        className={`relative rounded-xl border-2 transition shrink-0 p-0.5 ${
                          isSel ? 'border-orange-500 ring-2 ring-orange-500/40' : 'border-slate-800 hover:border-slate-600'
                        }`}
                        title={p.label}
                      >
                        <img src={p.url} alt={p.label} className="w-10 h-10 rounded-lg object-cover" />
                        {isSel && (
                          <div className="absolute top-0 right-0 bg-orange-600 text-white rounded-full p-0.5">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-700/40">
              <button
                type="button"
                onClick={() => setEditingStaffPhoto(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveStaffPhoto}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition"
              >
                Save Photo (फोटो सेव करें)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
