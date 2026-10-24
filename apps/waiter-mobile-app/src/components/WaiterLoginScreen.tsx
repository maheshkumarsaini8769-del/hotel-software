import React, { useState } from 'react';
import { API_BASE_URL } from '../config/api';
import {
  ChefHat,
  Lock,
  User,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Building2,
  Grid,
  Users,
  SlidersHorizontal,
  Save,
  X
} from 'lucide-react';

export interface WaiterStaffProfile {
  staffId: string;
  name: string;
  role: 'Captain' | 'Senior Waiter' | 'Floor Steward';
  /** Never shipped to the browser — the PIN is verified by the server. */
  pin?: string;
  avatar: string;
  assignedSection: string;
  assignedTableStart: number;
  assignedTableEnd: number;
  assignedTableCount: number;
  shift: string;
  permissions: string[];
}

export const PRECONFIGURED_WAITERS: WaiterStaffProfile[] = [
  {
    staffId: 'W-101',
    name: 'Ravi Kumar',
    role: 'Captain',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    assignedSection: 'Indoor AC Dining Hall',
    assignedTableStart: 1,
    assignedTableEnd: 6,
    assignedTableCount: 6,
    shift: 'Morning Shift (09:00 AM - 05:00 PM)',
    permissions: ['KOT Punching', 'Food Pickup & Serving', 'Table Transfer', 'Bill Settle Request', 'Guest Calls'],
  },
  {
    staffId: 'W-102',
    name: 'Ramesh Kumar',
    role: 'Senior Waiter',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    assignedSection: 'AC Hall & Lounge',
    assignedTableStart: 7,
    assignedTableEnd: 12,
    assignedTableCount: 6,
    shift: 'Evening Shift (04:00 PM - 12:00 AM)',
    permissions: ['KOT Punching', 'Food Pickup & Serving', 'Table Transfer', 'Bill Settle Request', 'Guest Calls'],
  },
  {
    staffId: 'W-103',
    name: 'Amit Singh',
    role: 'Floor Steward',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    assignedSection: 'Lounge & Rooftop Terrace',
    assignedTableStart: 13,
    assignedTableEnd: 18,
    assignedTableCount: 6,
    shift: 'Night Shift (08:00 PM - 04:00 AM)',
    permissions: ['KOT Punching', 'Food Pickup & Serving', 'Table Transfer', 'Bill Settle Request', 'Guest Calls'],
  },
];

export const getHotelAdminAllocatedWaiters = (): WaiterStaffProfile[] => {
  try {
    const raw = localStorage.getItem('spicehub_admin_waiter_allocations');
    const customAvatarsRaw = localStorage.getItem('spicehub_custom_waiter_avatars');
    const createdStaffRaw = localStorage.getItem('spicehub_admin_created_staff');

    const parsed = raw ? JSON.parse(raw) : {};
    const customAvatars = customAvatarsRaw ? JSON.parse(customAvatarsRaw) : {};
    const createdStaffList = createdStaffRaw ? JSON.parse(createdStaffRaw) : [];

    const baseWaiters = PRECONFIGURED_WAITERS.map((w) => {
      const alloc = parsed[w.staffId];
      const start = alloc ? Number(alloc.start) || w.assignedTableStart : w.assignedTableStart;
      const end = alloc ? Number(alloc.end) || w.assignedTableEnd : w.assignedTableEnd;
      const section = alloc?.section || w.assignedSection;
      const avatar = customAvatars[w.staffId] || alloc?.avatar || w.avatar;
      return {
        ...w,
        assignedTableStart: start,
        assignedTableEnd: end,
        assignedTableCount: end - start + 1,
        assignedSection: section,
        avatar,
      };
    });

    if (Array.isArray(createdStaffList) && createdStaffList.length > 0) {
      const extraWaiters: WaiterStaffProfile[] = createdStaffList
        .filter((s: any) => s && String(s.role).toUpperCase().includes('WAITER'))
        .filter((s: any) => !baseWaiters.some((bw) => bw.staffId === s.id || bw.name === s.name))
        .map((s: any) => {
          const start = Number(s.assignedTableStart) || 1;
          const end = Number(s.assignedTableEnd) || 6;
          return {
            staffId: s.id || `W-${Math.floor(100 + Math.random() * 800)}`,
            name: s.name,
            role: 'Senior Waiter',
            avatar: customAvatars[s.id] || s.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
            assignedSection: s.assignedSection || 'Indoor AC Hall',
            assignedTableStart: start,
            assignedTableEnd: end,
            assignedTableCount: end - start + 1,
            shift: s.shift || 'Morning Shift (09:00 AM - 05:00 PM)',
            permissions: ['KOT Punching', 'Food Pickup & Serving', 'Table Transfer', 'Bill Settle Request', 'Guest Calls'],
          };
        });
      return [...extraWaiters, ...baseWaiters];
    }

    return baseWaiters;
  } catch (_) {}
  return PRECONFIGURED_WAITERS;
};

export interface WaiterAuthSession {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    hotelId: string;
    hotelName?: string;
  };
}


/** Maps the server-verified staff identity onto the local roster profile. */
function resolveStaffProfile(
  localProfile: WaiterStaffProfile,
  user?: { name?: string; role?: string; id?: string }
): WaiterStaffProfile {
  if (!user) return localProfile;
  return {
    ...localProfile,
    staffId: user.id || localProfile.staffId,
    name: user.name || localProfile.name,
    role: localProfile.role,
  };
}

function isLoopbackHost(): boolean {
  if (typeof window === 'undefined') return false;
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
}

interface WaiterLoginScreenProps {
  hotelName?: string;
  onLoginSuccess: (staff: WaiterStaffProfile, session?: WaiterAuthSession) => void;
  onOpenPortalsSwitcher: () => void;
}

export const WaiterLoginScreen: React.FC<WaiterLoginScreenProps> = ({
  hotelName = 'Hotel Taj Gateway & Luxury Dining',
  onLoginSuccess,
  onOpenPortalsSwitcher,
}) => {
  const [waitersList, setWaitersList] = useState<WaiterStaffProfile[]>(getHotelAdminAllocatedWaiters);
  const [selectedStaff, setSelectedStaff] = useState<WaiterStaffProfile>(waitersList[0]);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [failedPinAttempts, setFailedPinAttempts] = useState(0);
  const [pinLockedUntil, setPinLockedUntil] = useState(0);

  // Admin Table Allocation Settings Modal
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [editAllocations, setEditAllocations] = useState<{ [key: string]: { start: number; end: number; section: string } }>(() => {
    const map: any = {};
    waitersList.forEach((w) => {
      map[w.staffId] = { start: w.assignedTableStart, end: w.assignedTableEnd, section: w.assignedSection };
    });
    return map;
  });

  const handleSaveAdminAllocations = () => {
    try {
      localStorage.setItem('spicehub_admin_waiter_allocations', JSON.stringify(editAllocations));
    } catch (_) {}
    const updated = getHotelAdminAllocatedWaiters();
    setWaitersList(updated);
    const curr = updated.find((w) => w.staffId === selectedStaff.staffId) || updated[0];
    setSelectedStaff(curr);
    setIsAdminModalOpen(false);
  };

  const handlePinDigit = (digit: string) => {
    if (enteredPin.length < 4) {
      const next = enteredPin + digit;
      setEnteredPin(next);
      setPinError(null);
      if (next.length === 4) {
        verifyPin(next, selectedStaff);
      }
    }
  };

  const handleBackspace = () => {
    setEnteredPin((prev) => prev.slice(0, -1));
    setPinError(null);
  };

  const [isVerifying, setIsVerifying] = useState(false);

  /**
   * The PIN is verified by the backend against the Argon2 hash stored for the
   * staff account. The browser never receives or stores a PIN list.
   */
  const verifyPin = async (pin: string, staff: WaiterStaffProfile) => {
    if (Date.now() < pinLockedUntil) {
      const seconds = Math.ceil((pinLockedUntil - Date.now()) / 1000);
      setPinError(`Too many attempts. Try again in ${seconds}s.`);
      setEnteredPin('');
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/waiter-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const body = await response.json().catch(() => null);

      if (!response.ok || !body?.success) {
        const next = failedPinAttempts + 1;
        setFailedPinAttempts(next);
        setEnteredPin('');
        setPinError(
          body?.message ||
            (next >= 5
              ? 'Account temporarily locked for 60 seconds.'
              : `Invalid staff PIN. ${5 - next} attempt${5 - next === 1 ? '' : 's'} remaining.`)
        );
        if (next >= 5) {
          setPinLockedUntil(Date.now() + 60_000);
        }
        return;
      }

      setFailedPinAttempts(0);
      setPinLockedUntil(0);
      setPinError(null);
      onLoginSuccess(resolveStaffProfile(staff, body.data?.user), body.data);
    } catch {
      setPinError('Cannot reach the SpiceHub server. Check your connection and retry.');
      setEnteredPin('');
    } finally {
      setIsVerifying(false);
    }
  };

  /** Local demo helper: the server issues a demo staff session (dev bypass only). */
  const handleQuickLogin = async (staff: WaiterStaffProfile) => {
    setIsVerifying(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/waiter-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demo: true }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success) {
        setPinError(body?.message || 'Demo login is not available on this server.');
        return;
      }
      setPinError(null);
      onLoginSuccess(resolveStaffProfile(staff, body.data?.user), body.data);
    } catch {
      setPinError('Cannot reach the SpiceHub server. Check your connection and retry.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#080a0f] text-slate-100 flex flex-col justify-between p-4 sm:p-8 font-sans select-none">
      {/* Top Bar with Brand & Cross-Portal Switcher */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 max-w-5xl mx-auto w-full pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-950/40">
            <ChefHat className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-black text-lg text-white tracking-tight flex items-center gap-2">
              <span>SpiceHub</span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-400 font-bold uppercase tracking-wider border border-orange-500/30">
                Staff Terminal
              </span>
            </h1>
            <p className="text-xs text-slate-400">{hotelName}</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Admin Table Allocation Config Button */}
          <button
            onClick={() => setIsAdminModalOpen(true)}
            className="px-3 py-1.5 rounded-xl border border-orange-500/40 bg-orange-500/10 hover:bg-orange-500/20 text-xs font-bold text-orange-300 flex items-center gap-1.5 transition shadow-xs"
            title="Configure table range for each waiter"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-orange-400" />
            <span>Admin Set Tables</span>
          </button>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="max-w-4xl mx-auto w-full my-auto py-6 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        {/* Left Side: Select Waiter / Assigned Tables Info */}
        <div className="md:col-span-6 space-y-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs font-bold mb-2">
              <ShieldCheck className="w-4 h-4 text-orange-500" />
              <span>Authorized Waiter Station</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Select Your Staff Profile
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Log in to view tables assigned to you by Hotel Admin ERP and receive live kitchen food pickup alerts.
            </p>
          </div>

          {/* Waiter Selection List */}
          <div className="space-y-3">
            {waitersList.map((staff) => {
              const isSelected = selectedStaff.staffId === staff.staffId;
              return (
                <div
                  key={staff.staffId}
                  onClick={() => {
                    setSelectedStaff(staff);
                    setEnteredPin('');
                    setPinError(null);
                    setFailedPinAttempts(0);
                    setPinLockedUntil(0);
                  }}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-orange-950/40 via-slate-900 to-[#181c2b] border-orange-500 shadow-lg shadow-orange-950/30'
                      : 'bg-[#10131d] border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={staff.avatar}
                        alt={staff.name}
                        className={`w-11 h-11 rounded-full object-cover border-2 ${
                          isSelected ? 'border-orange-500' : 'border-slate-700'
                        }`}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{staff.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-orange-400 font-bold">
                            {staff.staffId}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400">{staff.role} • {staff.shift}</div>
                      </div>
                    </div>
                  </div>

                  {/* Prominent Assigned Tables Range Display */}
                  <div className={`mt-3 p-2 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs font-semibold ${
                    isSelected
                      ? 'bg-orange-500/10 border-orange-500/30 text-orange-300'
                      : 'bg-slate-900/60 border-slate-800/80 text-slate-400'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      <Grid className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                      <span>Assigned Tables: <strong>T-{String(staff.assignedTableStart).padStart(2, '0')} to T-{String(staff.assignedTableEnd).padStart(2, '0')}</strong></span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-300">
                      {staff.assignedTableCount} Tables ({staff.assignedSection})
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Security PIN Pad */}
        <div className="md:col-span-6 bg-[#10131d] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-500 flex items-center justify-center mb-3">
            <KeyRound className="w-6 h-6" />
          </div>
          <h3 className="font-black text-lg text-white">Enter Station PIN</h3>
          <p className="text-xs text-slate-400 mt-0.5 mb-5 text-center">
            Logging in as <strong className="text-orange-400">{selectedStaff.name}</strong> ({selectedStaff.staffId})
          </p>

          {/* 4-Digit PIN Circles */}
          <div className="flex items-center gap-4 mb-4">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all ${
                  enteredPin.length > idx
                    ? 'bg-orange-500 scale-125 shadow-md shadow-orange-500/50'
                    : 'bg-slate-800 border border-slate-700'
                }`}
              />
            ))}
          </div>

          {pinError && (
            <div className="text-xs text-rose-400 font-bold mb-3 animate-shake">
              {pinError}
            </div>
          )}

          {/* PIN Pad Digits (1-9, Backspace, 0, Enter) */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-xs mb-4">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                onClick={() => handlePinDigit(digit)}
                className="h-14 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-lg font-black text-white hover:text-orange-400 transition flex items-center justify-center shadow-xs active:scale-95"
              >
                {digit}
              </button>
            ))}
            <button
              onClick={handleBackspace}
              className="h-14 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-400 hover:text-white transition flex items-center justify-center active:scale-95"
            >
              Clear
            </button>
            <button
              onClick={() => handlePinDigit('0')}
              className="h-14 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-lg font-black text-white hover:text-orange-400 transition flex items-center justify-center shadow-xs active:scale-95"
            >
              0
            </button>
            <button
              onClick={() => verifyPin(enteredPin, selectedStaff)}
              disabled={enteredPin.length !== 4}
              className="h-14 rounded-2xl bg-orange-600 hover:bg-orange-500 disabled:opacity-40 border border-orange-500/40 text-xs font-black text-white transition flex items-center justify-center shadow-md active:scale-95"
            >
              Enter
            </button>
          </div>

          {/* Permissions / Authority Summary */}
          <div className="w-full max-w-xs pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
            <div className="font-bold text-slate-300 mb-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Authority & Role Permissions:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedStaff.permissions.map((p, i) => (
                <span key={i} className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 text-[10px]">
                  • {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="max-w-5xl mx-auto w-full pt-4 border-t border-slate-800/80 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>SpiceHub Hospitality Suite • Multi-Tenant Restaurant POS & KDS</div>
        <div>Station PIN required • Contact your administrator for access</div>
      </footer>

      {/* Hotel Admin Table Allocation Configuration Modal */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#10131d] border border-orange-500/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center font-bold">
                  <SlidersHorizontal className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">Hotel Admin: Set Waiter Tables</h3>
                  <p className="text-[11px] text-slate-400">Configure which tables each waiter is assigned to handle</p>
                </div>
              </div>
              <button
                onClick={() => setIsAdminModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
              {waitersList.map((w) => {
                const alloc = editAllocations[w.staffId] || { start: w.assignedTableStart, end: w.assignedTableEnd, section: w.assignedSection };
                return (
                  <div
                    key={w.staffId}
                    className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img src={w.avatar} alt={w.name} className="w-7 h-7 rounded-full object-cover" />
                        <div>
                          <span className="font-bold text-xs text-white">{w.name}</span>
                          <span className="text-[10px] text-slate-400 ml-1.5">({w.role})</span>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 font-mono font-bold">
                        {w.staffId}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                          Start Table # (From)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={alloc.start}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            setEditAllocations((prev) => ({
                              ...prev,
                              [w.staffId]: { ...prev[w.staffId], start: val },
                            }));
                          }}
                          className="w-full p-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold text-xs focus:outline-none focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                          End Table # (To)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={alloc.end}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            setEditAllocations((prev) => ({
                              ...prev,
                              [w.staffId]: { ...prev[w.staffId], end: val },
                            }));
                          }}
                          className="w-full p-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold text-xs focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      <span>Dining Section: </span>
                      <input
                        type="text"
                        value={alloc.section}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditAllocations((prev) => ({
                            ...prev,
                            [w.staffId]: { ...prev[w.staffId], section: val },
                          }));
                        }}
                        className="w-full mt-1 p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div className="text-[11px] text-orange-400/90 font-bold bg-orange-500/10 px-2 py-1 rounded-lg">
                      Assigned: Tables T-{String(alloc.start).padStart(2, '0')} to T-{String(alloc.end).padStart(2, '0')} (Total {Math.max(1, alloc.end - alloc.start + 1)} Tables)
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsAdminModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAdminAllocations}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-1.5 transition shadow-md shadow-orange-950/40"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save & Apply Table Allocation</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
