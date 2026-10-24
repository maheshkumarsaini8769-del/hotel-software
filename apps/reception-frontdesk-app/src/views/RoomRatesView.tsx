import React, { useCallback, useEffect, useState } from 'react';
import {
  CreditCard,
  Sparkles,
  CheckCircle2,
  Users,
  Edit2,
  RefreshCw,
  AlertTriangle,
  Loader2,
  X,
  Save,
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';

interface RoomRatesViewProps {
  isDark?: boolean;
  onToast?: (msg: string) => void;
}

interface RoomTypeRate {
  id: string;
  name: string;
  code: string;
  roomsCount: number;
  basePrice: number;
  weekendPrice: number;
  maxPax: number;
  extraBedPrice: number;
  gstRate: number;
  amenities: string[];
}

interface TariffDraft {
  basePrice: number;
  weekendPrice: number;
  extraBedPrice: number;
  gstRate: number;
  maxPax: number;
}

function readHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window === 'undefined') return headers;
  const token =
    window.localStorage.getItem('spicehub_token') || window.localStorage.getItem('token') || '';
  const hotelId =
    window.localStorage.getItem('spicehub_hotel_id') || window.localStorage.getItem('hotelId') || '';
  if (token) headers.Authorization = `Bearer ${token}`;
  if (hotelId) headers['x-hotel-id'] = hotelId;
  return headers;
}

function mapRate(raw: any): RoomTypeRate {
  return {
    id: String(raw._id || raw.id || ''),
    name: raw.name || 'Unnamed Room Type',
    code: raw.code || '—',
    roomsCount: Number(raw.roomsCount ?? raw.totalRoomsCount ?? 0),
    basePrice: Number(raw.basePriceOvernight ?? raw.basePrice ?? 0),
    weekendPrice: Number(raw.weekendPrice ?? Math.round(Number(raw.basePriceOvernight || 0) * 1.2)),
    maxPax: Number(raw.maxCapacity ?? raw.maxPax ?? 2),
    extraBedPrice: Number(raw.extraBedPrice ?? 0),
    gstRate: Number(raw.gstRate ?? 12),
    amenities: Array.isArray(raw.amenities) ? raw.amenities : [],
  };
}

export const RoomRatesView: React.FC<RoomRatesViewProps> = ({ isDark = true, onToast }) => {
  const [rates, setRates] = useState<RoomTypeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TariffDraft>({
    basePrice: 0,
    weekendPrice: 0,
    extraBedPrice: 0,
    gstRate: 12,
    maxPax: 2,
  });

  const loadRates = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/pms/room-types`, {
        headers: readHeaders(),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || `Could not load room tariffs (HTTP ${response.status})`);
      }
      setRates((json.roomTypes || []).map(mapRate));
    } catch (err: any) {
      setError(err?.message || 'Could not load room tariffs from the PMS.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRates();
  }, [loadRates]);

  const handleStartEdit = (rate: RoomTypeRate) => {
    setEditingId(rate.id);
    setDraft({
      basePrice: rate.basePrice,
      weekendPrice: rate.weekendPrice,
      extraBedPrice: rate.extraBedPrice,
      gstRate: rate.gstRate,
      maxPax: rate.maxPax,
    });
  };

  const handleSaveEdit = async (id: string) => {
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/pms/room-types/${id}`, {
        method: 'PUT',
        headers: readHeaders(),
        body: JSON.stringify({
          basePriceOvernight: draft.basePrice,
          weekendPrice: draft.weekendPrice,
          extraBedPrice: draft.extraBedPrice,
          gstRate: draft.gstRate,
          maxCapacity: draft.maxPax,
        }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || `Could not save tariff (HTTP ${response.status})`);
      }
      const saved = mapRate({ ...json.roomType, roomsCount: rates.find((r) => r.id === id)?.roomsCount });
      setRates((prev) => prev.map((rate) => (rate.id === id ? saved : rate)));
      setEditingId(null);
      onToast?.('✓ Room tariff updated and synced to PMS');
    } catch (err: any) {
      setError(err?.message || 'Could not save the room tariff.');
    } finally {
      setSaving(false);
    }
  };

  const cardClass = isDark
    ? 'bg-[#141620] border-slate-800'
    : 'bg-white border-slate-200 shadow-sm';
  const headingClass = isDark ? 'text-white' : 'text-slate-900';
  const mutedClass = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputClass = `w-24 px-2 py-1 rounded-lg border text-xs font-mono ${
    isDark
      ? 'bg-slate-900 border-slate-700 text-white'
      : 'bg-white border-slate-300 text-slate-900'
  }`;

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-8">
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${cardClass}`}>
        <div>
          <h2 className={`text-lg font-black tracking-tight flex items-center gap-2 ${headingClass}`}>
            <CreditCard className="w-5 h-5 text-emerald-500" />
            <span>Room Categories & Tariff Matrix Management</span>
          </h2>
          <p className={`text-xs mt-0.5 ${mutedClass}`}>
            Live PMS room types. Base and weekend tariffs, extra-bed charges and GST slabs are saved to the backend.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{rates.length} live room types</span>
          </div>
          <button
            type="button"
            onClick={() => void loadRates()}
            disabled={loading}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50 ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-200 text-xs font-semibold flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </span>
          <button type="button" onClick={() => void loadRates()} className="underline font-bold">
            Retry
          </button>
        </div>
      )}

      <div className={`p-4 rounded-2xl border space-y-4 ${cardClass}`}>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-xs font-semibold text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading live room tariffs…
          </div>
        ) : rates.length === 0 ? (
          <div className="py-12 text-center">
            <CreditCard className={`w-8 h-8 mx-auto mb-2 ${mutedClass}`} />
            <div className={`text-sm font-bold ${headingClass}`}>No room types configured</div>
            <p className={`text-xs mt-1 ${mutedClass}`}>
              Add room types from the hotel admin / PMS setup before editing tariffs.
            </p>
          </div>
        ) : (
          <div className={`divide-y ${isDark ? 'divide-slate-800/80' : 'divide-slate-200'}`}>
            {rates.map((rate) => (
              <div key={rate.id} className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className={`font-black text-sm ${headingClass}`}>{rate.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-amber-300 border border-slate-700">
                      {rate.code}
                    </span>
                    <span className={`text-[10px] ${mutedClass}`}>({rate.roomsCount} physical rooms)</span>
                  </div>
                  <div className={`flex flex-wrap items-center gap-1.5 text-[11px] ${mutedClass}`}>
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3 h-3" /> Max Pax: <strong className={headingClass}>{rate.maxPax}</strong>
                    </span>
                    <span>•</span>
                    <span>Extra Bed: <strong className={headingClass}>₹{rate.extraBedPrice}</strong></span>
                    <span>•</span>
                    <span>GST: <strong className={headingClass}>{rate.gstRate}%</strong></span>
                    {rate.amenities.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-[280px]">{rate.amenities.slice(0, 3).join(', ')}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-end gap-4 shrink-0">
                  <div className="text-right">
                    <span className={`text-[10px] block font-medium ${mutedClass}`}>Weekday / Base</span>
                    {editingId === rate.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          value={draft.basePrice}
                          onChange={(event) =>
                            setDraft((prev) => ({ ...prev, basePrice: parseInt(event.target.value, 10) || 0 }))
                          }
                          className={inputClass}
                          aria-label="Base price"
                        />
                        <span className="text-[10px] text-slate-500">₹</span>
                      </div>
                    ) : (
                      <span className={`text-base font-black tabular-nums ${headingClass}`}>
                        ₹{rate.basePrice.toLocaleString('en-IN')}{' '}
                        <span className="text-[10px] text-slate-400 font-normal">/ night</span>
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    <span className={`text-[10px] block font-medium ${mutedClass}`}>Weekend</span>
                    {editingId === rate.id ? (
                      <input
                        type="number"
                        min={0}
                        value={draft.weekendPrice}
                        onChange={(event) =>
                          setDraft((prev) => ({ ...prev, weekendPrice: parseInt(event.target.value, 10) || 0 }))
                        }
                        className={inputClass}
                        aria-label="Weekend price"
                      />
                    ) : (
                      <span className="text-sm font-black text-amber-400 tabular-nums">
                        ₹{rate.weekendPrice.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>

                  {editingId === rate.id ? (
                    <>
                      <div className="text-right">
                        <span className={`text-[10px] block font-medium ${mutedClass}`}>Extra Bed</span>
                        <input
                          type="number"
                          min={0}
                          value={draft.extraBedPrice}
                          onChange={(event) =>
                            setDraft((prev) => ({ ...prev, extraBedPrice: parseInt(event.target.value, 10) || 0 }))
                          }
                          className={inputClass}
                          aria-label="Extra bed price"
                        />
                      </div>
                      <div className="text-right">
                        <span className={`text-[10px] block font-medium ${mutedClass}`}>GST %</span>
                        <input
                          type="number"
                          min={0}
                          max={28}
                          value={draft.gstRate}
                          onChange={(event) =>
                            setDraft((prev) => ({ ...prev, gstRate: parseInt(event.target.value, 10) || 0 }))
                          }
                          className={inputClass}
                          aria-label="GST rate"
                        />
                      </div>
                      <div className="text-right">
                        <span className={`text-[10px] block font-medium ${mutedClass}`}>Max Pax</span>
                        <input
                          type="number"
                          min={1}
                          value={draft.maxPax}
                          onChange={(event) =>
                            setDraft((prev) => ({ ...prev, maxPax: parseInt(event.target.value, 10) || 1 }))
                          }
                          className={inputClass}
                          aria-label="Maximum guests"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => void handleSaveEdit(rate.id)}
                          disabled={saving}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          disabled={saving}
                          className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStartEdit(rate)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                      title="Edit Rate"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={`p-3 rounded-xl border text-[11px] flex items-start gap-2 ${isDark ? 'bg-slate-900/50 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
        <span>
          Tariff changes are persisted in the hotel PMS and used by reservations, walk-in check-in and corporate
          group bookings. Weekend rates are quoted separately and are not auto-applied to weekday stays.
        </span>
      </div>
    </div>
  );
};
