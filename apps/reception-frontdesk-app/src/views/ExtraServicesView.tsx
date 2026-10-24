import React, { useCallback, useEffect, useState } from 'react';
import {
  Sparkles,
  Plus,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { getApiClient } from '../lib/apiClient';

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
  icon: string;
}

interface ActiveStay {
  stayId?: string;
  roomNumber?: string;
  guestName?: string;
}

const SERVICES: ExtraService[] = [
  { id: 'srv-1', name: 'Airport Luxury Pickup (Sedan)', category: 'Transport', price: 1800, duration: 'On Demand', description: 'Chauffeur driven pickup from Airport to Hotel with meet & greet.', icon: '🚗' },
  { id: 'srv-2', name: 'Ayurvedic Full Body Rejuvenation Spa', category: 'Wellness', price: 2500, duration: '60 Mins', description: 'Traditional herbal oil massage by certified therapists at the hotel spa.', icon: '💆' },
  { id: 'srv-3', name: 'Rooftop Candlelight Dinner Setup', category: 'Dining', price: 3500, duration: 'Evening 08:00 PM', description: 'Private table setting with a four-course meal and celebration setup.', icon: '🕯️' },
  { id: 'srv-4', name: 'Extra Folding Bed & Premium Mattress', category: 'Convenience', price: 800, duration: 'Per Night', description: 'Extra spring mattress with fresh pillows, bedsheet and blanket.', icon: '🛏️' },
  { id: 'srv-5', name: 'Same-Day Express Laundry & Steam Press', category: 'Convenience', price: 600, duration: '4 Hours', description: 'Washing, ironing and hanger packing for up to five garments.', icon: '👔' },
  { id: 'srv-6', name: 'Full-Day Heritage City Tour Guide', category: 'Transport', price: 3200, duration: '8 Hours', description: 'Private cab with a knowledgeable tourist guide across historical sites.', icon: '🏛️' },
];

export const ExtraServicesView: React.FC<ExtraServicesViewProps> = ({ isDark = true, onToast }) => {
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [activeStays, setActiveStays] = useState<ActiveStay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingServiceId, setBookingServiceId] = useState<string | null>(null);

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

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-8">
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        isDark ? 'bg-[#141620] border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div>
          <h2 className={`text-lg font-black tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span>Extra Guest Services & Concierge Amenities</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Book transfers, wellness, dining and convenience services directly to a live in-house folio.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-bold">Charge to Room:</span>
          <select
            value={selectedRoom}
            onChange={(event) => setSelectedRoom(event.target.value)}
            disabled={loading || activeStays.length === 0}
            className="px-3 py-1.5 rounded-xl border text-xs bg-slate-900 border-slate-800 text-white font-bold focus:outline-none disabled:opacity-50"
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
            onClick={() => void loadStays()}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 hover:text-white disabled:opacity-50"
            title="Refresh occupied rooms"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
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
            className={`p-4 rounded-2xl border flex flex-col justify-between gap-4 transition ${
              isDark ? 'bg-[#141620] border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl">{service.icon}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  {service.category}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">{service.name}</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{service.description}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
              <div>
                <span className="text-[10px] text-slate-400 block">{service.duration}</span>
                <span className="text-base font-black text-emerald-400 tabular-nums">
                  ₹{service.price.toLocaleString('en-IN')}
                </span>
              </div>

              <button
                onClick={() => void handleBookService(service)}
                disabled={!selectedRoom || bookingServiceId !== null}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white font-black text-xs shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
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
    </div>
  );
};
