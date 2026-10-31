import React, { useCallback, useEffect, useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  RefreshCw,
  AlertCircle,
  X,
  Star,
} from 'lucide-react';
import { getApiClient } from '../lib/apiClient';

interface GuestManagementViewProps {
  isDark?: boolean;
  onToast?: (msg: string) => void;
}

interface GuestItem {
  id: string;
  name: string;
  phone: string;
  email: string;
  tier: string;
  totalStays: number;
  totalSpend: number;
  kycStatus: 'VERIFIED' | 'PENDING';
  idType: string;
  lastVisit: string;
  loyaltyPoints: number;
}

interface GuestProfileRow {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  vipTier?: string;
  totalVisits?: number;
  totalLifetimeSpend?: number;
  isVerified?: boolean;
  idType?: string;
  lastVisitDate?: string;
  loyaltyPointsBalance?: number;
}

interface HistoryStay {
  _id?: string;
  roomId?: { roomNumber?: string };
  checkInTimestamp?: string;
  expectedCheckOutTimestamp?: string;
  stayStatus?: string;
}

interface HistoryPayload {
  profile: GuestProfileRow;
  recentStays?: HistoryStay[];
  loyaltyLedger?: Array<{ _id?: string; points?: number; transactionType?: string; createdAt?: string }>;
}

function tierLabel(tier?: string): string {
  if (tier === 'PLATINUM_VIP' || tier === 'VIP') return 'Platinum VIP';
  if (tier === 'PLATINUM') return 'Platinum';
  if (tier === 'GOLD') return 'Gold VIP';
  if (tier === 'SILVER') return 'Silver';
  return 'Silver';
}

function formatDate(value?: string): string {
  if (!value) return 'No stay yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No stay yet';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const GuestManagementView: React.FC<GuestManagementViewProps> = ({ isDark = true, onToast }) => {
  const [search, setSearch] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [guests, setGuests] = useState<GuestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<HistoryPayload | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newTier, setNewTier] = useState('SILVER');

  const loadGuests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getApiClient().request<{
        success: boolean;
        guests: GuestProfileRow[];
      }>('GET', '/api/v1/crm/search');
      setGuests(
        (response.guests || []).map((guest) => ({
          id: guest._id,
          name: guest.name,
          phone: guest.phone,
          email: guest.email || '—',
          tier: tierLabel(guest.vipTier),
          totalStays: Number(guest.totalVisits || 0),
          totalSpend: Number(guest.totalLifetimeSpend || 0),
          kycStatus: guest.isVerified ? 'VERIFIED' : 'PENDING',
          idType: guest.idType || 'Not captured',
          lastVisit: formatDate(guest.lastVisitDate),
          loyaltyPoints: Number(guest.loyaltyPointsBalance || 0),
        }))
      );
    } catch (err: any) {
      setGuests([]);
      setError(err?.message || 'Guest directory could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGuests();
  }, [loadGuests]);

  const openHistory = async (guest: GuestItem) => {
    setHistoryLoading(true);
    try {
      const response = await getApiClient().request<HistoryPayload & { success: boolean }>(
        'GET',
        `/api/v1/crm/profiles/${guest.id}`
      );
      setHistory(response);
    } catch (err: any) {
      if (onToast) onToast(err?.message || `History for ${guest.name} could not be loaded.`);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleCreateGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) {
      if (onToast) onToast('Name and phone are required.');
      return;
    }

    setSaving(true);
    try {
      await getApiClient().request('POST', '/api/v1/crm/profiles', {
        name: newName.trim(),
        phone: newPhone.trim(),
        email: newEmail.trim() || undefined,
        vipTier: newTier,
      });
      setIsAddModalOpen(false);
      setNewName('');
      setNewPhone('');
      setNewEmail('');
      setNewTier('SILVER');
      if (onToast) onToast(`Guest profile saved for ${newName.trim()}.`);
      await loadGuests();
    } catch (err: any) {
      if (onToast) onToast(err?.message || 'Guest profile could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = guests.filter((g) => {
    if (selectedTier !== 'All' && !g.tier.includes(selectedTier)) return false;
    if (
      search &&
      !g.name.toLowerCase().includes(search.toLowerCase()) &&
      !g.phone.includes(search) &&
      !g.email.toLowerCase().includes(search.toLowerCase())
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
            <Users className="w-5 h-5 text-blue-500" />
            <span>Guest Profile & Master Directory</span>
          </h2>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Live CRM guest profiles with VIP tier, KYC status, lifetime spend and loyalty balance.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, phone or email..."
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
            onClick={() => void loadGuests()}
            disabled={loading}
            className={`p-2 rounded-xl border transition disabled:opacity-50 ${
              isDark
                ? 'border-slate-700 bg-slate-900 text-slate-300 hover:text-white'
                : 'border-slate-200 bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
            title="Refresh guest directory"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-md transition flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Add Guest</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold">
        {['All', 'Platinum', 'Gold', 'Silver'].map((t) => (
          <button
            key={t}
            onClick={() => setSelectedTier(t)}
            className={`px-3 py-1.5 rounded-xl transition ${
              selectedTier === t
                ? 'bg-blue-600 text-white shadow-md'
                : isDark
                  ? 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </span>
          <button onClick={() => void loadGuests()} className="font-bold underline">
            Retry
          </button>
        </div>
      )}

      {loading && guests.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm font-semibold text-slate-400">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Loading live guest directory…
        </div>
      ) : filtered.length === 0 ? (
        <div
          className={`rounded-2xl border px-6 py-14 text-center ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <Users className="w-9 h-9 text-slate-500 mx-auto mb-3" />
          <p className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            No guest profiles found.
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Profiles created at check-in or from Add Guest will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((g) => (
            <div
              key={g.id}
              className={`p-4 rounded-2xl border space-y-3 transition ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>{g.name}</h3>
                  <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'} font-mono`}>{g.id.slice(-8)}</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide border ${
                    g.tier.includes('Platinum')
                      ? isDark
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                      : g.tier.includes('Gold')
                        ? isDark
                          ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                          : 'bg-yellow-50 text-yellow-800 border-yellow-200'
                        : isDark
                          ? 'bg-slate-700/40 text-slate-300 border-slate-600'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  ★ {g.tier}
                </span>
              </div>

              <div className={`space-y-1 text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{g.phone}</span>
                </div>
                <div className="flex items-center gap-2 truncate">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{g.email}</span>
                </div>
              </div>

              <div className={`grid grid-cols-3 gap-1.5 p-2 rounded-xl border text-[10px] ${
                isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-slate-50 border-slate-200/80'
              }`}>
                <div>
                  <span className={`block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Stays</span>
                  <span className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-800'}`}>{g.totalStays}</span>
                </div>
                <div>
                  <span className={`block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Lifetime</span>
                  <span className={`font-bold text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                    ₹{g.totalSpend.toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className={`block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>KYC</span>
                  <span
                    className={`font-bold text-[9px] ${
                      g.kycStatus === 'VERIFIED'
                        ? isDark ? 'text-emerald-400' : 'text-emerald-700'
                        : isDark ? 'text-amber-400' : 'text-amber-700'
                    }`}
                  >
                    {g.kycStatus}
                  </span>
                </div>
              </div>

              <div className={`text-[11px] pt-1 border-t flex items-center justify-between gap-2 ${
                isDark ? 'border-slate-800/60 text-slate-400' : 'border-slate-100 text-slate-500'
              }`}>
                <span className="truncate">
                  Last stay: <strong className={isDark ? 'text-blue-300' : 'text-blue-700'}>{g.lastVisit}</strong>
                </span>
                <button
                  onClick={() => void openHistory(g)}
                  disabled={historyLoading}
                  className="text-blue-500 hover:text-blue-600 font-bold text-[10px] whitespace-nowrap disabled:opacity-50"
                >
                  View 360 →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`border rounded-2xl max-w-md w-full p-5 space-y-4 shadow-sm dark:shadow-none ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center justify-between">
              <h3 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>Register New Guest Profile</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className={`transition ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateGuest} className="space-y-3">
              <div>
                <label className={`text-xs block mb-1 font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Anjali Nair"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition ${
                    isDark
                      ? 'bg-slate-900 border-slate-800 text-white placeholder:text-slate-500'
                      : 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400'
                  }`}
                  required
                />
              </div>

              <div>
                <label className={`text-xs block mb-1 font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Mobile Number</label>
                <input
                  type="text"
                  placeholder="+91 98765 00000"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition ${
                    isDark
                      ? 'bg-slate-900 border-slate-800 text-white placeholder:text-slate-500'
                      : 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400'
                  }`}
                  required
                />
              </div>

              <div>
                <label className={`text-xs block mb-1 font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Email Address</label>
                <input
                  type="email"
                  placeholder="guest@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition ${
                    isDark
                      ? 'bg-slate-900 border-slate-800 text-white placeholder:text-slate-500'
                      : 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400'
                  }`}
                />
              </div>

              <div>
                <label className={`text-xs block mb-1 font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Guest Tier</label>
                <select
                  value={newTier}
                  onChange={(e) => setNewTier(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition ${
                    isDark
                      ? 'bg-slate-900 border-slate-800 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="SILVER">Silver Regular</option>
                  <option value="GOLD">Gold VIP</option>
                  <option value="PLATINUM">Platinum</option>
                  <option value="PLATINUM_VIP">Platinum VIP</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className={`flex-1 py-2 rounded-xl border font-bold text-xs transition ${
                    isDark
                      ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs shadow-md"
                >
                  {saving ? 'Saving…' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {history && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`border rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-sm dark:shadow-none max-h-[85vh] overflow-y-auto ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className={`text-base font-black flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  <Star className="w-4 h-4 text-amber-500" />
                  {history.profile.name}
                </h3>
                <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {history.profile.phone} • {history.profile.email || 'No email'}
                </p>
              </div>
              <button
                onClick={() => setHistory(null)}
                className={`transition ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className={`rounded-xl border p-2.5 ${
                isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Visits</span>
                <strong className={isDark ? 'text-white' : 'text-slate-800'}>{history.profile.totalVisits || 0}</strong>
              </div>
              <div className={`rounded-xl border p-2.5 ${
                isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Lifetime Spend</span>
                <strong className={isDark ? 'text-emerald-400' : 'text-emerald-700'}>
                  ₹{Number(history.profile.totalLifetimeSpend || 0).toLocaleString('en-IN')}
                </strong>
              </div>
              <div className={`rounded-xl border p-2.5 ${
                isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Loyalty Points</span>
                <strong className={isDark ? 'text-amber-400' : 'text-amber-700'}>
                  {history.profile.loyaltyPointsBalance || 0}
                </strong>
              </div>
            </div>

            <div>
              <h4 className={`text-xs font-black mb-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Recent Stays</h4>
              {history.recentStays && history.recentStays.length > 0 ? (
                <div className="space-y-1.5">
                  {history.recentStays.map((stay, index) => (
                    <div
                      key={stay._id || index}
                      className={`rounded-xl border p-2.5 text-[11px] flex items-center justify-between ${
                        isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                        Room {stay.roomId?.roomNumber || '—'}
                      </span>
                      <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                        {formatDate(stay.checkInTimestamp)} → {formatDate(stay.expectedCheckOutTimestamp)}
                      </span>
                      <span className={`font-semibold ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                        {stay.stayStatus || '—'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">No stay history recorded yet.</p>
              )}
            </div>

            <div>
              <h4 className="text-xs font-black text-slate-200 mb-2">Loyalty Ledger</h4>
              {history.loyaltyLedger && history.loyaltyLedger.length > 0 ? (
                <div className="space-y-1.5">
                  {history.loyaltyLedger.map((entry, index) => (
                    <div
                      key={entry._id || index}
                      className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 text-[11px] flex items-center justify-between"
                    >
                      <span>{entry.transactionType || 'Points'}</span>
                      <span className="text-slate-400">{formatDate(entry.createdAt)}</span>
                      <span className="font-bold text-amber-300">{entry.points || 0} pts</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">No loyalty transactions recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
