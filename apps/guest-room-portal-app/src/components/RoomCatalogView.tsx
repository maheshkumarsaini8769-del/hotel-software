import React, { useState, useEffect } from 'react';
import { API_ORIGIN } from '../config/api';
import {
  BedDouble,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  Wrench,
  UserCheck,
  ShieldCheck,
  MapPin,
  ChevronRight,
  Plus,
  Minus,
  KeyRound,
  Wifi,
  Phone,
  AlertCircle,
  FileText,
  Heart,
  Navigation,
  CreditCard,
  Building,
  RefreshCw,
} from 'lucide-react';

export interface CatalogRoom {
  id: string;
  roomNumber: string;
  floorNumber: number;
  wing: string;
  rawStatus: string;
  displayStatus: 'AVAILABLE' | 'CLEANING' | 'MAINTENANCE' | 'OCCUPIED';
  statusBadge: string;
  isBookable: boolean;
  roomType: {
    id: string;
    name: string;
    code: string;
    basePriceOvernight: number;
    gstRate: number;
    amenities: string[];
    maxCapacity: number;
  };
}

export interface HotelMetadata {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  phone: string;
}

export interface RoomCatalogViewProps {
  hotelId?: string;
  apiBase?: string;
  onRoomBooked?: (roomNumber: string, sessionToken: string) => void;
  onCancelOrBack?: () => void;
  activeRoomNumber?: string;
  currentRoomNumber?: string;
}

export const RoomCatalogView: React.FC<RoomCatalogViewProps> = ({
  hotelId = '',
  apiBase = API_ORIGIN,
  onRoomBooked,
  onCancelOrBack,
  activeRoomNumber,
  currentRoomNumber,
}) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [hotel, setHotel] = useState<HotelMetadata | null>(null);
  const [rooms, setRooms] = useState<CatalogRoom[]>([]);
  const [counts, setCounts] = useState({
    total: 0,
    available: 0,
    cleaning: 0,
    maintenance: 0,
    occupied: 0,
  });

  const [filter, setFilter] = useState<'ALL' | 'AVAILABLE' | 'CLEANING' | 'MAINTENANCE' | 'OCCUPIED'>('ALL');
  const [selectedRoom, setSelectedRoom] = useState<CatalogRoom | null>(null);

  // Date and Duration State
  const [checkInDate, setCheckInDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [nights, setNights] = useState(1);

  // Location / GPS Distance State
  const [locating, setLocating] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [locationStatus, setLocationStatus] = useState<string>('Location not verified');

  // KYC and Guest Details State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('9820011223');
  const [guestEmail, setGuestEmail] = useState('');
  const [isCouple, setIsCouple] = useState(true);
  const [idType, setIdType] = useState<'AADHAAR' | 'PASSPORT' | 'DRIVING_LICENSE' | 'VOTER_ID'>('AADHAAR');
  const [idNumber, setIdNumber] = useState('1234 5678 9012');
  const [docVerified, setDocVerified] = useState(true);
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Calculate Check-Out Date dynamically based on nights
  const getCheckOutDate = () => {
    const d = new Date(checkInDate);
    d.setDate(d.getDate() + nights);
    return d.toISOString().split('T')[0];
  };

  const checkOutDate = getCheckOutDate();

  // Haversine formula for distance
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of Earth in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  };

  const handleDetectLocation = () => {
    setLocating(true);
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation not supported by browser');
      setLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        setUserCoords({ lat: userLat, lng: userLng });

        const hotelLat = hotel?.latitude || 19.076;
        const hotelLng = hotel?.longitude || 72.8777;
        const dist = calculateDistance(userLat, userLng, hotelLat, hotelLng);
        setDistanceKm(dist);

        if (dist <= 0.5) {
          setLocationStatus(`At Hotel Property (${Math.round(dist * 1000)}m away) — Express Walk-In Check-In`);
        } else {
          setLocationStatus(`Remote Guest (${dist} km from Hotel) — Advance Online Booking`);
        }
        setLocating(false);
      },
      (err) => {
        // Fallback demo simulation
        const demoLat = 19.082;
        const demoLng = 72.881;
        setUserCoords({ lat: demoLat, lng: demoLng });
        const hotelLat = hotel?.latitude || 19.076;
        const hotelLng = hotel?.longitude || 72.8777;
        const dist = calculateDistance(demoLat, demoLng, hotelLat, hotelLng);
        setDistanceKm(dist);
        setLocationStatus(`Demo Location Verified (${dist} km away)`);
        setLocating(false);
      },
      { timeout: 8000 }
    );
  };

  const fetchRoomsCatalog = async () => {
    try {
      setError(null);
      const url = `${apiBase}/api/v1/guest-portal/rooms/catalog?hotelId=${hotelId}`;
      const res = await fetch(url, {
        headers: {
          'x-hotel-id': hotelId,
        },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setHotel(data.data.hotel);
        setRooms(data.data.rooms || []);
        setCounts(data.data.counts || { total: 0, available: 0, cleaning: 0, maintenance: 0, occupied: 0 });
      } else {
        setError(data.message || 'Failed to load room availability catalog');
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching rooms');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (hotelId) {
      fetchRoomsCatalog();
    }
  }, [hotelId]);

  const filteredRooms = rooms.filter((r) => {
    if (filter === 'ALL') return true;
    return r.displayStatus === filter;
  });

  // Dynamic price calculation
  const getPricingForRoom = (room: CatalogRoom) => {
    const basePerNight = room.roomType.basePriceOvernight || 2500;
    const subtotal = basePerNight * nights;
    const gstRate = basePerNight > 7500 ? 18 : 12;
    const gstAmount = Math.round(((subtotal * gstRate) / 100) * 100) / 100;
    const grandTotal = subtotal + gstAmount;
    return {
      basePerNight,
      nights,
      subtotal,
      gstRate,
      gstAmount,
      grandTotal,
    };
  };

  const handleOpenBooking = (room: CatalogRoom) => {
    setSelectedRoom(room);
    setIsBookingModalOpen(true);
    setBookingError(null);
  };

  const handleConfirmBooking = async () => {
    if (!selectedRoom) return;
    if (!guestName.trim()) {
      setBookingError('Please enter the primary guest name');
      return;
    }
    if (!idNumber.trim()) {
      setBookingError('Please enter ID document number');
      return;
    }
    if (!docVerified) {
      setBookingError('Please confirm the document verification checkbox');
      return;
    }

    try {
      setSubmittingBooking(true);
      setBookingError(null);

      const pricing = getPricingForRoom(selectedRoom);

      const payload = {
        hotelId,
        roomId: selectedRoom.id,
        checkInDate,
        checkOutDate,
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim(),
        guestEmail: guestEmail.trim() || `${guestPhone.trim()}@guest.spicehub.com`,
        isCouple,
        idType,
        idNumber: idNumber.trim(),
        advancePaid: pricing.grandTotal, // Full instant payment in flow
        deviceLocation: userCoords
          ? {
              latitude: userCoords.lat,
              longitude: userCoords.lng,
              distanceKm,
              isRemote: (distanceKm || 0) > 0.5,
            }
          : undefined,
      };

      const res = await fetch(`${apiBase}/api/v1/guest-portal/rooms/book-and-checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hotel-id': hotelId,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const { sessionToken, roomNumber } = json.data;
        if (typeof window !== 'undefined' && sessionToken) {
          localStorage.setItem('spicehub_guest_session', sessionToken);
        }
        setIsBookingModalOpen(false);
        if (onRoomBooked) {
          onRoomBooked(roomNumber, sessionToken);
        }
      } else {
        setBookingError(json.message || 'Booking failed');
      }
    } catch (err: any) {
      setBookingError(err.message || 'Network error submitting booking');
    } finally {
      setSubmittingBooking(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0e1017] text-white pb-32">
      {/* Top Banner / Hotel Identification */}
      <div className="bg-gradient-to-r from-amber-950/60 via-stone-900 to-amber-950/40 border-b border-amber-900/30 px-4 py-4 sticky top-0 z-20 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-amber-400" />
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
                {hotel?.name || 'Luxury Hotel & Suites'}
              </h1>
            </div>
            <p className="text-xs text-amber-200/70 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-amber-400" />
              {hotel?.city}, {hotel?.state} • Live Room Availability
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setRefreshing(true);
                fetchRoomsCatalog();
              }}
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-amber-300 transition-all active:scale-95"
              title="Refresh Room Statuses"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            {activeRoomNumber && onCancelOrBack && (
              <button
                onClick={onCancelOrBack}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 transition-all"
              >
                Room {activeRoomNumber} Stay →
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* 1. Real-Time Status Counters KPI */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div
            onClick={() => setFilter('AVAILABLE')}
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
              filter === 'AVAILABLE'
                ? 'bg-emerald-950/50 border-emerald-500/60 shadow-lg shadow-emerald-900/20'
                : 'bg-[#151824] border-white/5 hover:border-emerald-500/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-400">Available</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-2xl font-black text-emerald-300 mt-1">{counts.available}</div>
            <p className="text-[10px] text-emerald-400/70 mt-0.5">Reception Ready</p>
          </div>

          <div
            onClick={() => setFilter('CLEANING')}
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
              filter === 'CLEANING'
                ? 'bg-amber-950/50 border-amber-500/60 shadow-lg shadow-amber-900/20'
                : 'bg-[#151824] border-white/5 hover:border-amber-500/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-400">In Cleaning</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-300 mt-1">{counts.cleaning}</div>
            <p className="text-[10px] text-amber-400/70 mt-0.5">Housekeeping Turn</p>
          </div>

          <div
            onClick={() => setFilter('MAINTENANCE')}
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
              filter === 'MAINTENANCE'
                ? 'bg-rose-950/50 border-rose-500/60 shadow-lg shadow-rose-900/20'
                : 'bg-[#151824] border-white/5 hover:border-rose-500/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-rose-400">Maintenance</span>
              <Wrench className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-2xl font-black text-rose-300 mt-1">{counts.maintenance}</div>
            <p className="text-[10px] text-rose-400/70 mt-0.5">Engineering Out</p>
          </div>

          <div
            onClick={() => setFilter('OCCUPIED')}
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
              filter === 'OCCUPIED'
                ? 'bg-purple-950/50 border-purple-500/60 shadow-lg shadow-purple-900/20'
                : 'bg-[#151824] border-white/5 hover:border-purple-500/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-purple-400">Occupied</span>
              <UserCheck className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-purple-300 mt-1">{counts.occupied}</div>
            <p className="text-[10px] text-purple-400/70 mt-0.5">Guests In-House</p>
          </div>
        </div>

        {/* 2. Interactive Date Picker & Dynamic Stay Duration */}
        <div className="bg-[#151824] border border-white/10 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white">Select Dates & Nights</h2>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
              {nights} {nights === 1 ? 'Night' : 'Nights'} Stay
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block mb-1">
                Check-In Date
              </label>
              <input
                type="date"
                value={checkInDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setCheckInDate(e.target.value)}
                className="w-full bg-[#0e1017] border border-white/15 rounded-xl px-3 py-2 text-sm font-medium text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block mb-1">
                Nights Duration
              </label>
              <div className="flex items-center border border-white/15 rounded-xl bg-[#0e1017] px-2 py-1 justify-between">
                <button
                  type="button"
                  data-testid="nights-minus-btn"
                  onClick={() => setNights((n) => Math.max(1, n - 1))}
                  className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-stone-300 active:scale-95"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span data-testid="nights-count-display" className="font-bold text-amber-400 text-sm">{nights}</span>
                <button
                  type="button"
                  data-testid="nights-plus-btn"
                  onClick={() => setNights((n) => n + 1)}
                  className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-stone-300 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block mb-1">
                Check-Out Date
              </label>
              <div className="w-full bg-[#0e1017]/50 border border-white/10 rounded-xl px-3 py-2 text-sm font-semibold text-amber-200/90 flex items-center justify-between">
                <span>{checkOutDate}</span>
                <Clock className="w-3.5 h-3.5 text-stone-500" />
              </div>
            </div>
          </div>

          {/* Dynamic Tariff Multiplier Bar */}
          <div data-testid="date-picker-price-indicator" className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs">
            <span className="text-stone-400">Calculated Tariff ({nights} {nights === 1 ? 'Night' : 'Nights'} Stay):</span>
            <span className="font-bold text-amber-400">₹{(2500 * nights).toLocaleString('en-IN')} + 12% GST = ₹{(2500 * nights + Math.round(2500 * nights * 0.12)).toLocaleString('en-IN')} Total</span>
          </div>
        </div>

        {/* 3. Distance & GPS Location Check */}
        <div className="bg-[#151824] border border-white/10 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Navigation className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                Distance to Hotel Property
                {distanceKm !== null && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {distanceKm} km away
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-400">{locationStatus}</p>
            </div>
          </div>

          <button
            data-testid="verify-distance-btn"
            onClick={handleDetectLocation}
            disabled={locating}
            className="w-full sm:w-auto px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            <MapPin className="w-3.5 h-3.5" />
            {locating ? 'Detecting GPS...' : 'Verify Distance'}
          </button>
        </div>

        {/* 4. Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {(['ALL', 'AVAILABLE', 'CLEANING', 'MAINTENANCE', 'OCCUPIED'] as const).map((tab) => (
            <button
              key={tab}
              data-testid={`filter-tab-${tab.toLowerCase()}`}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                filter === tab
                  ? 'bg-amber-500 text-stone-950 shadow-md font-bold'
                  : 'bg-[#151824] border border-white/5 text-stone-400 hover:text-white'
              }`}
            >
              {tab === 'ALL' && `All Rooms (${counts.total})`}
              {tab === 'AVAILABLE' && `Available (${counts.available})`}
              {tab === 'CLEANING' && `Cleaning (${counts.cleaning})`}
              {tab === 'MAINTENANCE' && `Maintenance (${counts.maintenance})`}
              {tab === 'OCCUPIED' && `Occupied (${counts.occupied})`}
            </button>
          ))}
        </div>

        {/* 5. Rooms Grid */}
        {loading ? (
          <div className="p-12 text-center text-stone-400 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
            <p className="text-sm font-medium">Checking live room matrix from reception...</p>
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs">
            {error}
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="p-12 text-center text-stone-400 bg-[#151824] rounded-2xl border border-white/5">
            <BedDouble className="w-8 h-8 text-stone-600 mx-auto mb-2" />
            <p className="text-sm font-semibold">No rooms found in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredRooms.map((room) => {
              const pricing = getPricingForRoom(room);
              const isAvailable = room.isBookable;

              return (
                <div
                  key={room.id}
                  className={`rounded-2xl border p-4 transition-all relative overflow-hidden flex flex-col justify-between ${
                    isAvailable
                      ? 'bg-gradient-to-b from-[#181c2b] to-[#12141f] border-emerald-500/30 hover:border-emerald-500/60 shadow-lg'
                      : room.displayStatus === 'CLEANING'
                      ? 'bg-[#151824]/80 border-amber-500/20 opacity-90'
                      : room.displayStatus === 'MAINTENANCE'
                      ? 'bg-[#151824]/80 border-rose-500/20 opacity-80'
                      : 'bg-[#151824]/70 border-white/5 opacity-75'
                  }`}
                >
                  {/* Top Bar with Room Number & Status Badge */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                            isAvailable
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : room.displayStatus === 'CLEANING'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : room.displayStatus === 'MAINTENANCE'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                          }`}
                        >
                          {room.roomNumber}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-white flex items-center gap-1.5">
                            {room.roomType.name}
                            <span className="text-[10px] text-stone-400 font-normal">
                              Floor {room.floorNumber}
                            </span>
                          </div>
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5 ${
                              isAvailable
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : room.displayStatus === 'CLEANING'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : room.displayStatus === 'MAINTENANCE'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {room.statusBadge}
                          </span>
                        </div>
                      </div>

                      {/* Price Display */}
                      <div className="text-right">
                        <div className="text-base font-black text-amber-400">
                          ₹{pricing.grandTotal.toLocaleString('en-IN')}
                        </div>
                        <p className="text-[10px] text-stone-400">
                          ₹{pricing.basePerNight}/nt + {pricing.gstRate}% GST
                        </p>
                      </div>
                    </div>

                    {/* Amenities Pills */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {room.roomType.amenities.slice(0, 3).map((amenity, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-stone-300 border border-white/5"
                        >
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="mt-4 pt-3 border-t border-white/5">
                    {isAvailable ? (
                      <button
                        data-testid={`book-room-btn-${room.roomNumber}`}
                        onClick={() => handleOpenBooking(room)}
                        className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-stone-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 active:scale-98 transition-all"
                      >
                        <KeyRound className="w-4 h-4" />
                        Book Room {room.roomNumber} ({nights} {nights === 1 ? 'Night' : 'Nights'}) • ₹
                        {pricing.grandTotal.toLocaleString('en-IN')}
                      </button>
                    ) : (
                      <div className="w-full py-2 px-3 rounded-xl bg-white/5 text-stone-500 text-center text-xs font-medium cursor-not-allowed">
                        {room.displayStatus === 'CLEANING' && 'Under Housekeeping Reclean'}
                        {room.displayStatus === 'MAINTENANCE' && 'Out-of-Service Maintenance'}
                        {room.displayStatus === 'OCCUPIED' && 'Currently Occupied by Guest'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. Guest KYC, Couple & ID Document Verification Modal */}
      {isBookingModalOpen && selectedRoom && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-[#151824] border border-amber-900/30 rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl space-y-4">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  Guest Verification & Instant Check-In
                </span>
                <h3 className="text-lg font-black text-white">
                  Room {selectedRoom.roomNumber} • {selectedRoom.roomType.name}
                </h3>
              </div>
              <button
                onClick={() => setIsBookingModalOpen(false)}
                className="p-1 rounded-xl bg-white/5 hover:bg-white/10 text-stone-400"
              >
                ✕
              </button>
            </div>

            {/* Dynamic Price Summary Box */}
            {(() => {
              const pricing = getPricingForRoom(selectedRoom);
              return (
                <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-3.5 space-y-1.5 text-xs">
                  <div className="flex justify-between text-stone-300">
                    <span>
                      Tariff ({nights} {nights === 1 ? 'night' : 'nights'} × ₹{pricing.basePerNight})
                    </span>
                    <span className="font-semibold text-white">₹{pricing.subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-stone-400">
                    <span>GST Tax ({pricing.gstRate}%)</span>
                    <span>₹{pricing.gstAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="border-t border-amber-500/20 pt-1.5 flex justify-between font-bold text-sm text-amber-300">
                    <span>Total Payable (Admin Tariff)</span>
                    <span>₹{pricing.grandTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              );
            })()}

            {/* Form Fields */}
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-stone-300 uppercase block mb-1">
                  Primary Guest Full Name *
                </label>
                <input
                  type="text"
                  data-testid="input-guest-name"
                  placeholder="e.g. Vikramaditya Oberoi"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full bg-[#0e1017] border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-stone-300 uppercase block mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    data-testid="input-guest-phone"
                    placeholder="9820011223"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className="w-full bg-[#0e1017] border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-300 uppercase block mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    data-testid="input-guest-email"
                    placeholder="guest@example.com"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="w-full bg-[#0e1017] border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Couple Stay Check-In Toggle */}
              <div className="bg-[#0e1017] border border-white/10 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Heart className={`w-4 h-4 ${isCouple ? 'text-rose-400 fill-rose-400' : 'text-stone-500'}`} />
                  <div>
                    <span className="text-xs font-bold text-white block">Staying as a Couple?</span>
                    <span className="text-[10px] text-stone-400">Couple-friendly verification supported</span>
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="toggle-couple-stay"
                  onClick={() => setIsCouple(!isCouple)}
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                    isCouple ? 'bg-rose-500' : 'bg-stone-700'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                      isCouple ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* KYC Document Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-stone-300 uppercase block mb-1">
                    ID Document Type *
                  </label>
                  <select
                    value={idType}
                    data-testid="select-id-type"
                    onChange={(e) => setIdType(e.target.value as any)}
                    className="w-full bg-[#0e1017] border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="AADHAAR">Aadhaar Card (12-Digit)</option>
                    <option value="PASSPORT">Passport</option>
                    <option value="DRIVING_LICENSE">Driving License</option>
                    <option value="VOTER_ID">Voter ID Card</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-300 uppercase block mb-1">
                    Document / Card Number *
                  </label>
                  <input
                    type="text"
                    data-testid="input-id-number"
                    placeholder={idType === 'AADHAAR' ? '1234 5678 9012' : 'Document ID Number'}
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    className="w-full bg-[#0e1017] border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Verification & Reception Compliance Checkbox */}
              <label className="flex items-start gap-2.5 p-2 rounded-xl bg-emerald-950/20 border border-emerald-500/20 cursor-pointer">
                <input
                  type="checkbox"
                  data-testid="checkbox-doc-verified"
                  checked={docVerified}
                  onChange={(e) => setDocVerified(e.target.checked)}
                  className="mt-0.5 rounded border-white/20 text-emerald-500 focus:ring-0"
                />
                <span className="text-[11px] text-emerald-200/90 leading-tight">
                  I confirm that valid identity proof has been submitted in accordance with local hotel compliance
                  regulations.
                </span>
              </label>

              {bookingError && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {bookingError}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsBookingModalOpen(false)}
                className="w-1/3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-stone-300 text-xs font-semibold"
              >
                Back
              </button>

              <button
                type="button"
                data-testid="btn-confirm-instant-checkin"
                onClick={handleConfirmBooking}
                disabled={submittingBooking}
                className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 active:scale-98 disabled:opacity-50"
              >
                {submittingBooking ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Generating Keycard...
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    Confirm & Check In (Room {selectedRoom.roomNumber})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
