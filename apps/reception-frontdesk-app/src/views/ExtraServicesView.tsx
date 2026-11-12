import React, { useCallback, useEffect, useState } from 'react';
import {
  Sparkles,
  Plus,
  RefreshCw,
  AlertCircle,
  Car,
  UtensilsCrossed,
  BedDouble,
  Shirt,
  Landmark,
  X,
  CheckCircle2,
} from 'lucide-react';
import { getApiClient } from '../lib/apiClient';
import { NumericInput } from '@spicehub/ui';

interface ExtraServicesViewProps {
  isDark?: boolean;
  onToast?: (msg: string) => void;
}

interface ExtraService {
  id: string;
  name: string;
  category: 'Transport' | 'Wellness' | 'Dining' | 'Convenience';
  price: number;
  duration: string;
  description: string;
  iconType: 'car' | 'spa' | 'dining' | 'bed' | 'laundry' | 'tour';
}

interface ActiveStay {
  stayId?: string;
  roomNumber?: string;
  guestName?: string;
}

const SERVICES: ExtraService[] = [
  {
    id: 'srv-1',
    name: 'Airport Luxury Pickup (Sedan)',
    category: 'Transport',
    price: 1800,
    duration: 'On Demand',
    description: 'Chauffeur driven pickup from Airport to Hotel with meet & greet.',
    iconType: 'car',
  },
  {
    id: 'srv-2',
    name: 'Ayurvedic Full Body Rejuvenation Spa',
    category: 'Wellness',
    price: 2500,
    duration: '60 Mins',
    description: 'Traditional herbal oil massage by certified therapists at the hotel spa.',
    iconType: 'spa',
  },
  {
    id: 'srv-3',
    name: 'Rooftop Candlelight Dinner Setup',
    category: 'Dining',
    price: 3500,
    duration: 'Evening 08:00 PM',
    description: 'Private table setting with a four-course meal and celebration setup.',
    iconType: 'dining',
  },
  {
    id: 'srv-4',
    name: 'Extra Folding Bed & Premium Mattress',
    category: 'Convenience',
    price: 800,
    duration: 'Per Night',
    description: 'Extra spring mattress with fresh pillows, bedsheet and blanket.',
    iconType: 'bed',
  },
  {
    id: 'srv-5',
    name: 'Same-Day Express Laundry & Steam Press',
    category: 'Convenience',
    price: 600,
    duration: '4 Hours',
    description: 'Washing, ironing and hanger packing for up to five garments.',
    iconType: 'laundry',
  },
  {
    id: 'srv-6',
    name: 'Full-Day Heritage City Tour Guide',
    category: 'Transport',
    price: 3200,
    duration: '8 Hours',
    description: 'Private cab with a knowledgeable tourist guide across historical sites.',
    iconType: 'tour',
  },
];

export const ExtraServicesView: React.FC<ExtraServicesViewProps> = ({ isDark = false, onToast }) => {
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [activeStays, setActiveStays] = useState<ActiveStay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingServiceId, setBookingServiceId] = useState<string | null>(null);

  // Custom Service Modal State
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState<'Transport' | 'Wellness' | 'Dining' | 'Convenience'>('Convenience');
  const [customPrice, setCustomPrice] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [customSubmitting, setCustomSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCustomModalOpen) {
        setIsCustomModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCustomModalOpen]);

  const loadStays = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getApiClient().request<{
        success: boolean;
        data: ActiveStay[];
      }>('GET', '/api/v1/pms/frontdesk/active-stays');
      const stays = (response.data || []).filter(
        (stay) => stay.roomNumber && stay.roomNumber !== 'N/A'
      );
      setActiveStays(stays);
      setSelectedRoom((current) => current || stays[0]?.roomNumber || '');
    } catch (err: any) {
      setActiveStays([]);
      setError(err?.message || 'Active in-house stays could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStays();
  }, [loadStays]);

  const handleBookService = async (service: ExtraService) => {
    if (!selectedRoom) {
      if (onToast) onToast('Select an occupied room before booking a service.');
      return;
    }

    setBookingServiceId(service.id);
    try {
      await getApiClient().request('POST', '/api/v1/pms/frontdesk/concierge-request', {
        roomNumber: selectedRoom,
        requestType: service.category.toUpperCase(),
        notes: service.name,
        priority: 'NORMAL',
        isBillable: true,
        billableAmount: service.price,
        billableDescription: service.name,
      });
      if (onToast) {
        onToast(`Booked ${service.name} for Room ${selectedRoom}. Charge posted to the guest folio.`);
      }
      await loadStays();
    } catch (err: any) {
      if (onToast) onToast(err?.message || `${service.name} could not be booked.`);
    } finally {
      setBookingServiceId(null);
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) {
      onToast?.('Select an occupied room before posting a service charge.');
      return;
    }
    const numericPrice = Number(customPrice);
    if (!customName.trim() || !numericPrice || numericPrice <= 0) {
      onToast?.('Enter a valid service name and charge amount.');
      return;
    }

    setCustomSubmitting(true);
    try {
      await getApiClient().request('POST', '/api/v1/pms/frontdesk/concierge-request', {
        roomNumber: selectedRoom,
        requestType: customCategory.toUpperCase(),
        notes: customNotes.trim() || customName.trim(),
        priority: 'NORMAL',
        isBillable: true,
        billableAmount: numericPrice,
        billableDescription: customName.trim(),
      });
      onToast?.(`Posted ₹${numericPrice.toLocaleString('en-IN')} (${customName.trim()}) to Room ${selectedRoom} folio.`);
      setIsCustomModalOpen(false);
      setCustomName('');
      setCustomPrice('');
      setCustomNotes('');
      await loadStays();
    } catch (err: any) {
      onToast?.(err?.message || 'Could not post custom service charge.');
    } finally {
      setCustomSubmitting(false);
    }
  };

  const renderIcon = (type: ExtraService['iconType']) => {
    switch (type) {
      case 'car':
        return (
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-slate-900 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Car className="w-5 h-5" />
          </div>
        );
      case 'spa':
        return (
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
        );
      case 'dining':
        return (
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
        );
      case 'bed':
        return (
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <BedDouble className="w-5 h-5" />
          </div>
        );
      case 'laundry':
        return (
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
            <Shirt className="w-5 h-5" />
          </div>
        );
      case 'tour':
        return (
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <Landmark className="w-5 h-5" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
        );
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-8">
      <div
        className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
        }`}
      >
        <div className="shrink-0 min-w-[280px]">
          <h2 className={`text-base sm:text-lg font-black tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
            <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
            <span>Extra Guest Services & Concierge Amenities</span>
          </h2>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Book transfers, wellness, dining and convenience services directly to a live in-house folio.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <span className={`text-xs font-bold shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Charge to Room:</span>
          <select
            value={selectedRoom}
            onChange={(event) => setSelectedRoom(event.target.value)}
            disabled={loading || activeStays.length === 0}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold focus:outline-none disabled:opacity-50 transition max-w-[240px] truncate ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-white'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            {activeStays.length === 0 ? (
              <option value="">No occupied rooms</option>
            ) : (
              activeStays.map((stay) => (
                <option key={stay.stayId || stay.roomNumber} value={stay.roomNumber}>
                  Room {stay.roomNumber} — {stay.guestName || 'In-house guest'}
                </option>
              ))
            )}
          </select>

          <button
            type="button"
            onClick={() => setIsCustomModalOpen(true)}
            disabled={!selectedRoom}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs disabled:opacity-50"
            title="Post bespoke concierge charge"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Custom Charge</span>
          </button>

          <button
            type="button"
            onClick={() => void loadStays()}
            disabled={loading}
            className={`p-2 rounded-xl border transition disabled:opacity-50 ${
              isDark
                ? 'border-slate-700 bg-slate-900 text-slate-300 hover:text-white'
                : 'border-slate-200 bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
            title="Refresh occupied rooms"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-600 dark:text-red-300">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </span>
          <button onClick={() => void loadStays()} className="font-bold underline">
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {SERVICES.map((service) => (
          <div
            key={service.id}
            className={`p-4 rounded-xl border flex flex-col justify-between gap-4 transition ${
              isDark ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 shadow-2xs hover:border-slate-300'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                {renderIcon(service.iconType)}
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                  isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}>
                  {service.category}
                </span>
              </div>
              <div>
                <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>{service.name}</h3>
                <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{service.description}</p>
              </div>
            </div>

            <div className={`pt-3 border-t flex items-center justify-between gap-2 ${
              isDark ? 'border-slate-800/80' : 'border-slate-100'
            }`}>
              <div>
                <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{service.duration}</span>
                <span className={`text-base font-black tabular-nums ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                  ₹{service.price.toLocaleString('en-IN')}
                </span>
              </div>

              <button
                onClick={() => void handleBookService(service)}
                disabled={!selectedRoom || bookingServiceId !== null}
                className="bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 rounded-xl text-white font-black text-xs shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {bookingServiceId === service.id ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                <span>{bookingServiceId === service.id ? 'Booking…' : 'Book Service'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Custom Service Charge Modal */}
      {isCustomModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCustomModalOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-slate-900" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Post Custom Service Charge</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCustomSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Room
                </label>
                <div className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white">
                  Room {selectedRoom}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Service Name / Item *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Doctor On Call, Florist Bouquet, Late Departure Taxi"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Transport">Transport</option>
                    <option value="Wellness">Wellness</option>
                    <option value="Dining">Dining</option>
                    <option value="Convenience">Convenience</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Charge Amount (₹) *
                  </label>
                  <NumericInput
                    required
                    min="1"
                    placeholder="1500"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Guest Notes / Folio Remark (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Specific instructions or folio breakdown note"
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCustomModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={customSubmitting}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {customSubmitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>{customSubmitting ? 'Posting…' : 'Post to Master Folio'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
