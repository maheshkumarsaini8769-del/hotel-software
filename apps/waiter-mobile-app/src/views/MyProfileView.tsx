import { API_BASE_URL } from '../config/api';
import React, { useState, useEffect } from 'react';
import {
  User,
  Award,
  TrendingUp,
  Clock,
  DollarSign,
  Banknote,
  LogOut,
  Coffee,
  CheckCircle2,
  ShieldCheck,
  Mail,
  Phone,
  Grid,
  Camera,
  Upload,
  Image as ImageIcon,
  X,
  Check
} from 'lucide-react';
import { WaiterStaffProfile } from '../components/WaiterLoginScreen';
import { waiterFetch } from '../lib/waiterApi';

export const DEFAULT_WAITER_AVATAR = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="%2394a3b8"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';

interface MyProfileViewProps {
  isDark: boolean;
  waiterSession?: WaiterStaffProfile;
  onLogout?: () => void;
  onOpenCashFloatModal: () => void;
  triggerToast: (msg: string) => void;
  onUpdateAvatar?: (newAvatarUrl: string) => void;
  /** Live shift metrics computed from the server data. */
  liveMetrics?: {
    runningBillValue: number;
    tablesServed: number;
    tablesAssigned: number;
    servedOrdersToday: number;
  };
  waiterFloat?: {
    openingFloat: number;
    totalCashCollected: number;
    totalChangeGiven: number;
    expectedCashInHand: number;
    status: string;
  } | null;
}

export const MyProfileView: React.FC<MyProfileViewProps> = ({
  isDark,
  waiterSession,
  onLogout,
  onOpenCashFloatModal,
  triggerToast,
  onUpdateAvatar,
  liveMetrics,
  waiterFloat,
}) => {
  const staffName = waiterSession?.name || 'Ravi Kumar';
  const staffRole = waiterSession?.role || 'Captain';
  const staffId = waiterSession?.staffId || 'W-101';
  const staffAvatar = waiterSession?.avatar || DEFAULT_WAITER_AVATAR;
  const shiftTime = waiterSession?.shift || '09:00 AM - 05:00 PM';
  const tableRange = `Tables T-${String(waiterSession?.assignedTableStart || 1).padStart(2, '0')} to T-${String(waiterSession?.assignedTableEnd || 6).padStart(2, '0')}`;
  const section = waiterSession?.assignedSection || 'Indoor AC Dining Hall';

  const [currentAvatar, setCurrentAvatar] = useState(staffAvatar);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(staffAvatar);

  useEffect(() => {
    if (waiterSession?.avatar) {
      setCurrentAvatar(waiterSession.avatar);
      setSelectedPhoto(waiterSession.avatar);
    }
  }, [waiterSession?.avatar]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        triggerToast('⚠️ Image size exceeds 10MB! Please pick a smaller photo.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const rawUrl = event.target?.result as string;
        if (!rawUrl) return;
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 400;
          canvas.height = 400;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const minSide = Math.min(img.width, img.height);
            const sx = (img.width - minSide) / 2;
            const sy = (img.height - minSide) / 2;
            ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, 400, 400);
            const compressed = canvas.toDataURL('image/jpeg', 0.82);
            setSelectedPhoto(compressed);
            triggerToast('✓ Real photo loaded and compressed to 400x400 JPEG (~40KB)!');
          } else {
            setSelectedPhoto(rawUrl);
          }
        };
        img.src = rawUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSavePhoto = () => {
    if (!selectedPhoto) return;
    setCurrentAvatar(selectedPhoto);
    if (onUpdateAvatar) {
      onUpdateAvatar(selectedPhoto);
    }
    try {
      const savedSession = localStorage.getItem('spicehub_waiter_session');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        parsed.avatar = selectedPhoto;
        delete parsed.pin;
        localStorage.setItem('spicehub_waiter_session', JSON.stringify(parsed));
      }
      const customMap = JSON.parse(localStorage.getItem('spicehub_custom_waiter_avatars') || '{}');
      customMap[staffId] = selectedPhoto;
      localStorage.setItem('spicehub_custom_waiter_avatars', JSON.stringify(customMap));
    } catch (_) {}

    waiterFetch(`${API_BASE_URL}/hotel-staff/${staffId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar: selectedPhoto }),
    }).catch(() => {});

    triggerToast('✓ Profile photo updated successfully!');
    setIsPhotoModalOpen(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden p-3 sm:p-5 gap-3 sm:gap-4">
      {/* Header */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-500 flex items-center justify-center font-bold">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`font-black text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Waiter Staff Profile & Register
            </h2>
            <p className="text-xs text-slate-400">
              Shift performance analytics, cash float drawer, and handover controls
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${
            isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
          }`}>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Shift: Active ({shiftTime})
          </span>
        </div>
      </div>

      {/* Main profile contents */}
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-4 pb-32 lg:pb-8">
        {/* User Card */}
        <div className={`p-4 sm:p-6 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          <div className="flex items-center gap-3 sm:gap-4">
            <div
              className="relative group cursor-pointer shrink-0"
              onClick={() => setIsPhotoModalOpen(true)}
              title="Click to update your profile photo"
            >
              <img
                src={currentAvatar}
                alt={staffName}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-orange-500/80 shadow-md group-hover:border-orange-400 group-hover:ring-4 group-hover:ring-orange-500/30 transition"
              />
              <div className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition text-[9px] font-bold">
                <Camera className="w-4 h-4 text-orange-400 mb-0.5" />
                <span>Change Photo</span>
              </div>
              <div className="absolute -bottom-1 -right-1 p-1 bg-orange-600 rounded-full text-white border-2 border-slate-900 shadow">
                <Camera className="w-3 h-3" />
              </div>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className={`font-black text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {staffName}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                  isDark ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-800 border border-orange-200'
                }`}>
                  {staffRole}
                </span>
                <span className={`text-xs font-mono font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  ({staffId})
                </span>
                <button
                  type="button"
                  onClick={() => setIsPhotoModalOpen(true)}
                  className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold border border-orange-500/40 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 flex items-center gap-1 transition shadow-xs"
                >
                  <Camera className="w-3 h-3" />
                  <span>Update Photo</span>
                </button>
              </div>
              <p className={`text-xs mt-1 flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                <Grid className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span>Assigned Zone: <strong className={isDark ? 'text-white' : 'text-slate-900'}>{tableRange}</strong> ({section})</span>
              </p>
              <div className={`flex flex-wrap items-center gap-2 sm:gap-3 text-xs mt-2 font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                <span className="flex items-center gap-1">
                  <Mail className={`w-3.5 h-3.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                  <span>{staffName.toLowerCase().replace(/\s+/g, '.')}@spicehub.internal</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Phone className={`w-3.5 h-3.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                  <span>+91 98765 43210</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto pt-2 md:pt-0">
            <button
              onClick={() => triggerToast('15-Minute meal break activated.')}
              className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
              }`}
            >
              <Coffee className="w-4 h-4 text-amber-500" />
              <span>Take Break</span>
            </button>
            <button
              onClick={() => triggerToast('Shift handed over to Evening Captain.')}
              className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-blue-500" />
              <span>Shift Handover</span>
            </button>
            <button
              onClick={() => {
                if (onLogout) {
                  onLogout();
                } else {
                  triggerToast('Waiter Shift concluded successfully.');
                }
              }}
              className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
            >
              <LogOut className="w-4 h-4" />
              <span>End Shift</span>
            </button>
          </div>
        </div>

        {/* 4 Performance Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`p-4 rounded-2xl border space-y-1 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
          }`}>
            <div className={`flex items-center justify-between text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              <span>Today's Sales</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div className={`text-2xl font-black ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
              ₹{Number(liveMetrics?.runningBillValue || 0).toLocaleString('en-IN')}
            </div>
            <div className={`text-[10px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Live running bills on your {liveMetrics?.tablesAssigned || 0} assigned tables
            </div>
          </div>

          <div className={`p-4 rounded-2xl border space-y-1 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
          }`}>
            <div className={`flex items-center justify-between text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              <span>Tables Served</span>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <div className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {liveMetrics?.tablesServed || 0} Tables
            </div>
            <div className={`text-[10px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {liveMetrics?.servedOrdersToday || 0} orders served today
            </div>
          </div>

          <div className={`p-4 rounded-2xl border space-y-1 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
          }`}>
            <div className={`flex items-center justify-between text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              <span>Avg Turnaround</span>
              <Clock className="w-4 h-4 text-orange-500" />
            </div>
            <div className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>—</div>
            <div className={`text-[10px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Turnaround timing is not captured by the API yet
            </div>
          </div>

          <div className={`p-4 rounded-2xl border space-y-1 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
          }`}>
            <div className={`flex items-center justify-between text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              <span>Guest Rating</span>
              <Award className="w-4 h-4 text-amber-500" />
            </div>
            <div className={`text-2xl font-black ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>—</div>
            <div className={`text-[10px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Guest review feed is not connected to this terminal
            </div>
          </div>
        </div>

        {/* Cash Float Register Widget */}
        <div className={`p-4 sm:p-6 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold shrink-0">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <div className={`text-xs font-bold uppercase ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Cash Float in Hand</div>
              <div className={`text-2xl font-black ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                ₹{Number(waiterFloat?.expectedCashInHand || 0).toLocaleString('en-IN')}
              </div>
              <div className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {waiterFloat
                  ? `Opening Float: ₹${Number(waiterFloat.openingFloat || 0).toLocaleString('en-IN')} • Cash Collected: ₹${Number(
                      waiterFloat.totalCashCollected || 0
                    ).toLocaleString('en-IN')}`
                  : 'No cash float is open for this staff account'}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              onClick={onOpenCashFloatModal}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
            >
              <Banknote className="w-4 h-4" />
              <span>Open Cash Float Register</span>
            </button>
            <button
              onClick={onOpenCashFloatModal}
              className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold border transition text-center ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
              }`}
            >
              {waiterFloat ? 'Request Cash Drop' : 'Open Cash Float'}
            </button>
          </div>
        </div>
      </div>

      {/* Waiter Profile Photo Upload & Preset Modal */}
      {isPhotoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-md rounded-2xl border p-5 space-y-4 shadow-sm dark:shadow-none ${
            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm">Update Profile Photo</h3>
                  <p className="text-[11px] text-slate-400">Change photo visible on KOTs, Login screen & Badges</p>
                </div>
              </div>
              <button
                onClick={() => setIsPhotoModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Preview */}
            <div className="flex flex-col items-center justify-center py-2 space-y-2">
              <div className="relative">
                <img
                  src={selectedPhoto || currentAvatar}
                  alt={staffName}
                  className="w-28 h-28 rounded-2xl object-cover border-2 border-orange-500 shadow-xl ring-4 ring-orange-500/20"
                />
                <div className="absolute -bottom-1 -right-1 px-2 py-0.5 bg-emerald-500 text-white rounded-md text-[9px] font-bold shadow flex items-center gap-1">
                  <Check className="w-2.5 h-2.5" />
                  <span>Real Staff Photo</span>
                </div>
              </div>
              <div className="text-center">
                <span className="text-xs font-bold block">{staffName}</span>
                <span className="text-[10px] text-slate-400 font-mono">ID: {staffId} • {staffRole}</span>
                <span className="text-[9px] text-emerald-400 font-mono block mt-0.5">Optimized: 400 × 400 px, ~40 KB JPEG</span>
              </div>
            </div>

              {/* Direct Camera & Gallery Upload (Exclusively Camera & Gallery as instructed) */}
              <div className="grid grid-cols-2 gap-2.5">
                <label className="py-3 px-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex flex-col items-center justify-center gap-1.5 cursor-pointer transition shadow-xs text-center">
                  <Camera className="w-5 h-5" />
                  <span>Take Live Photo</span>
                  <span className="text-[10px] text-orange-200 font-normal">Direct Camera</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </label>

                <label className="py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex flex-col items-center justify-center gap-1.5 cursor-pointer transition shadow-xs text-center">
                  <Upload className="w-5 h-5 text-orange-400" />
                  <span>Choose from Gallery</span>
                  <span className="text-[10px] text-slate-400 font-normal">Photo Library</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </label>
              </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-700/40">
              <button
                type="button"
                onClick={() => setIsPhotoModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePhoto}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Save Profile Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
