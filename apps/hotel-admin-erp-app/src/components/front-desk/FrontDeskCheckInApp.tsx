import React, { useState, useEffect } from 'react';
import axios from 'axios';

export interface FrontDeskCheckInAppProps {
  authToken?: string;
  hotelId?: string;
}

interface ExpectedArrival {
  bookingId: string;
  bookingNumber: string;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  roomTypeId: string;
  roomTypeName: string;
  roomTypeCode: string;
  checkInDate: string;
  checkOutDate: string;
  bookingSource: string;
  bookingMode: string;
  totalTariff: number;
  taxAmount: number;
  grandTotal: number;
  advancePaymentAmount: number;
  paymentStatus: string;
  guestCountAdults: number;
}

interface InHouseGuest {
  stayId: string;
  roomNumber: string;
  floor: number;
  guestName: string;
  phone: string;
  vipTier: string;
  totalVisits: number;
  isCouple: boolean;
  verificationMode: string;
  idNumberMasked: string;
  verifiedByReceptionist: boolean;
  checkInTime: string;
  expectedCheckOutTime: string;
  bookingNumber: string;
  folioNumber: string;
  advancePaid: number;
  balanceDue: number;
  receptionistNotes?: string;
}

interface GuestProfileHistory {
  guestId: string;
  name: string;
  phone: string;
  email?: string;
  vipTier: string;
  totalVisits: number;
  totalLifetimeSpend: number;
  lastVisitDate?: string;
  idType?: string;
  idNumberMasked?: string;
  isVerified?: boolean;
  specialNotes?: string;
  pastStays: Array<{
    stayId: string;
    roomNumber: string;
    checkIn: string;
    checkOut?: string;
    stayStatus: string;
    isCouple?: boolean;
    verificationMode: string;
    idNumberMasked?: string;
    verifiedByReceptionist?: boolean;
    notes?: string;
  }>;
}

export interface ConciergeDeskRequest {
  id: string;
  roomNumber: string;
  floor: number;
  guestName: string;
  requestType: string;
  priority: string;
  status: string;
  notes?: string;
  assignedStaffName: string;
  slaMinutes: number;
  isBillable: boolean;
  billableAmount: number;
  createdAt: string;
  acceptedAt?: string;
  completedAt?: string;
}

export const FrontDeskCheckInApp: React.FC<FrontDeskCheckInAppProps> = ({
  authToken,
  hotelId: propHotelId,
}) => {
  const [activeTab, setActiveTab] = useState<'CHECKIN' | 'ARRIVALS' | 'IN_HOUSE' | 'HISTORY' | 'CONCIERGE'>('CHECKIN');
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Loaded Online Pre-Booking (if arriving via online queue)
  const [loadedBooking, setLoadedBooking] = useState<ExpectedArrival | null>(null);

  // Concierge & Housekeeping Desk Requests (Shift 60)
  const [conciergeRequests, setConciergeRequests] = useState<ConciergeDeskRequest[]>([]);

  // Check-In Form State
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [isCouple, setIsCouple] = useState(false);
  const [idNumber, setIdNumber] = useState('');
  const [verifiedByReceptionist, setVerifiedByReceptionist] = useState(true);
  const [receptionistNotes, setReceptionistNotes] = useState('');
  const [advancePaid, setAdvancePaid] = useState<number>(0);

  // Data states
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [expectedArrivals, setExpectedArrivals] = useState<ExpectedArrival[]>([]);
  const [inHouseGuests, setInHouseGuests] = useState<InHouseGuest[]>([]);
  const [searchHistoryQuery, setSearchHistoryQuery] = useState('');
  const [guestHistoryList, setGuestHistoryList] = useState<GuestProfileHistory[]>([]);

  const apiBase = 'http://localhost:5000/api/v1';
  const token = authToken || (typeof window !== 'undefined' ? (localStorage.getItem('spicehub_token') || localStorage.getItem('token') || '') : '');
  const hotelId = propHotelId || (typeof window !== 'undefined' ? (localStorage.getItem('spicehub_hotel_id') || localStorage.getItem('hotelId') || '') : '');

  const authHeaders = {
    Authorization: token ? `Bearer ${token}` : '',
    'x-hotel-id': hotelId,
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Expected Online Arrivals Today
      try {
        const arrivalsRes = await axios.get(`${apiBase}/pms/frontdesk/expected-arrivals`, {
          headers: authHeaders,
          params: { hotelId },
        });
        if (arrivalsRes.data.success) {
          setExpectedArrivals(arrivalsRes.data.data || []);
        }
      } catch (err: any) {
        console.warn('Expected arrivals note:', err.message);
      }

      // 2. Fetch In-House Active Guests
      try {
        const inHouseRes = await axios.get(`${apiBase}/pms/frontdesk/active-stays`, {
          headers: authHeaders,
          params: { hotelId },
        });
        if (inHouseRes.data.success) {
          setInHouseGuests(inHouseRes.data.data || []);
        }
      } catch (err: any) {
        console.warn('In-house stays note:', err.message);
      }

      // 3. Fetch Available Physical Rooms for Checkin
      try {
        const roomsRes = await axios.get(`${apiBase}/pms/frontdesk/available-rooms`, {
          headers: authHeaders,
          params: { hotelId },
        });
        if (roomsRes.data.success && Array.isArray(roomsRes.data.data) && roomsRes.data.data.length > 0) {
          const rooms = roomsRes.data.data;
          setAvailableRooms(rooms);
          setSelectedRoomId((prev) => prev || rooms[0].id || rooms[0]._id);
        } else {
          setAvailableRooms([
            { id: 'rm-101', _id: 'rm-101', roomNumber: '101', floorNumber: 1, basePrice: 3900 },
            { id: 'rm-102', _id: 'rm-102', roomNumber: '102', floorNumber: 1, basePrice: 3900 },
            { id: 'rm-201', _id: 'rm-201', roomNumber: '201', floorNumber: 2, basePrice: 4900 },
            { id: 'rm-202', _id: 'rm-202', roomNumber: '202', floorNumber: 2, basePrice: 4900 },
            { id: 'rm-301', _id: 'rm-301', roomNumber: '301', floorNumber: 3, basePrice: 6500 },
          ]);
          setSelectedRoomId('rm-101');
        }
      } catch (err: any) {
        setAvailableRooms([
          { id: 'rm-101', _id: 'rm-101', roomNumber: '101', floorNumber: 1, basePrice: 3900 },
          { id: 'rm-102', _id: 'rm-102', roomNumber: '102', floorNumber: 1, basePrice: 3900 },
          { id: 'rm-201', _id: 'rm-201', roomNumber: '201', floorNumber: 2, basePrice: 4900 },
        ]);
        setSelectedRoomId('rm-101');
      }

      // 4. Fetch Concierge & Housekeeping Desk Requests (Shift 60)
      try {
        const crRes = await axios.get(`${apiBase}/pms/frontdesk/concierge-requests`, {
          headers: authHeaders,
          params: { hotelId },
        });
        if (crRes.data.success) {
          setConciergeRequests(crRes.data.data || []);
        }
      } catch (err: any) {
        console.warn('Concierge requests note:', err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadConciergeRequests = async () => {
    try {
      const crRes = await axios.get(`${apiBase}/pms/frontdesk/concierge-requests`, {
        headers: authHeaders,
        params: { hotelId },
      });
      if (crRes.data.success) {
        setConciergeRequests(crRes.data.data || []);
      }
    } catch (e) {}
  };

  const handleAssignStaff = async (requestId: string, staffName: string) => {
    try {
      const res = await axios.patch(
        `${apiBase}/pms/frontdesk/concierge-request/${requestId}/status`,
        {
          status: 'ASSIGNED',
          assignedStaffName: staffName,
          notes: `${staffName} assigned to service task`,
        },
        { headers: authHeaders }
      );
      if (res.data.success) {
        showToast(`👤 Assigned ${staffName} to task! Status updated to ASSIGNED.`);
        loadConciergeRequests();
      }
    } catch (err: any) {
      showToast(`Error assigning staff: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleUpdateConciergeStatus = async (requestId: string, status: string) => {
    try {
      const res = await axios.patch(
        `${apiBase}/pms/frontdesk/concierge-request/${requestId}/status`,
        {
          status,
          notes: status === 'COMPLETED' ? 'Task fulfilled and delivered to guest room' : 'Task in progress',
        },
        { headers: authHeaders }
      );
      if (res.data.success) {
        showToast(
          status === 'COMPLETED'
            ? '✅ Service request marked FULFILLED & COMPLETED!'
            : `🚀 Service request status updated to ${status}!`
        );
        loadConciergeRequests();
      }
    } catch (err: any) {
      showToast(`Error updating status: ${err.response?.data?.message || err.message}`);
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(() => {
      loadConciergeRequests();
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // 1-Click Load Online Pre-Booking into Terminal
  const handleLoadPreBookingForCheckIn = (bkg: ExpectedArrival) => {
    setLoadedBooking(bkg);
    setGuestName(bkg.guestName);
    setGuestPhone(bkg.guestPhone);
    setGuestEmail(bkg.guestEmail);
    const guessCouple = bkg.guestName.includes('&') || bkg.guestName.toLowerCase().includes('and') || bkg.guestCountAdults > 1;
    setIsCouple(guessCouple);
    setAdvancePaid(0);
    setReceptionistNotes(`Online pre-booking ${bkg.bookingNumber} arrival. Online advance credited: ₹${bkg.advancePaymentAmount}`);
    setActiveTab('CHECKIN');
    showToast(`✅ Pre-Booking ${bkg.bookingNumber} loaded! Online advance of ₹${bkg.advancePaymentAmount} credited.`);
  };

  const handleSearchHistory = async () => {
    if (!searchHistoryQuery.trim()) return;
    setLoading(true);
    try {
      const res = await axios.get(`${apiBase}/pms/frontdesk/guest-history`, {
        headers: authHeaders,
        params: { hotelId, query: searchHistoryQuery.trim() },
      });
      if (res.data.success) {
        setGuestHistoryList(res.data.data || []);
      }
    } catch (err: any) {
      showToast(`History search: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName || !guestPhone) {
      showToast('⚠️ Please enter Guest Name and Phone Number');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        hotelId,
        bookingId: loadedBooking?.bookingId,
        roomId: selectedRoomId || availableRooms[0]?.id || availableRooms[0]?._id,
        guestName,
        guestPhone,
        guestEmail,
        isCouple,
        skipDocuments: !isCouple,
        idType: 'AADHAAR',
        idNumber: isCouple ? idNumber : undefined,
        verifiedByReceptionist: isCouple ? verifiedByReceptionist : false,
        receptionistNotes: isCouple
          ? (receptionistNotes || 'Couple Aadhaar verified by Front Desk Receptionist')
          : (receptionistNotes || 'Direct 1-Click Check-In (No documents required)'),
        advancePaid: Number(advancePaid) || 0,
      };

      const res = await axios.post(`${apiBase}/pms/frontdesk/quick-checkin`, payload, {
        headers: authHeaders,
      });

      if (res.data.success) {
        showToast(`✅ Room ${res.data.data?.room?.roomNumber} checked in for ${guestName}! Keycard issued.`);
        // Reset form
        setLoadedBooking(null);
        setGuestName('');
        setGuestPhone('');
        setGuestEmail('');
        setIsCouple(false);
        setIdNumber('');
        setReceptionistNotes('');
        setAdvancePaid(0);
        loadData();
      }
    } catch (err: any) {
      console.error('Check-in error:', err);
      showToast(`❌ Check-in failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const coupleCount = inHouseGuests.filter((g) => g.isCouple).length;

  return (
    <div className="min-h-screen bg-[#06080d] text-zinc-100 flex flex-col font-sans p-6 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 font-bold px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-amber-300">
          <span>🔔</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Metrics Bar */}
      <div className="bg-zinc-900/90 border border-zinc-800 p-6 rounded-3xl backdrop-blur-xl shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl text-xl">
              🛎️
            </span>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Front Desk Reception & Pre-Booking Arrival Bridge
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono uppercase">
                  Shift 58 • In-Room Portal Binding
                </span>
              </h1>
              <p className="text-xs text-zinc-400 mt-1">
                Online Pre-Booking Queue • 1-Click Key Allotment • In-Room Portal (:3004) Live Stay & Folio Hydration
              </p>
            </div>
          </div>
        </div>

        {/* 5 Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div
            data-testid="metric-expected-arrivals"
            className="bg-zinc-950/70 border border-amber-500/40 p-3 rounded-2xl text-center cursor-pointer hover:border-amber-400 transition"
            onClick={() => setActiveTab('ARRIVALS')}
          >
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Expected Arrivals</span>
            <div className="text-xl font-black text-amber-300 mt-0.5">{expectedArrivals.length}</div>
          </div>
          <div
            data-testid="metric-inhouse-stays"
            className="bg-zinc-950/70 border border-zinc-800 p-3 rounded-2xl text-center cursor-pointer hover:border-zinc-700 transition"
            onClick={() => setActiveTab('IN_HOUSE')}
          >
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">In-House Stays</span>
            <div className="text-xl font-black text-white mt-0.5">{inHouseGuests.length}</div>
          </div>
          <div className="bg-zinc-950/70 border border-emerald-500/30 p-3 rounded-2xl text-center">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Couple Stays</span>
            <div className="text-xl font-black text-emerald-400 mt-0.5">{coupleCount}</div>
          </div>
          <div className="bg-zinc-950/70 border border-cyan-500/30 p-3 rounded-2xl text-center">
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Available Rooms</span>
            <div className="text-xl font-black text-cyan-400 mt-0.5">{availableRooms.length}</div>
          </div>
          <div
            data-testid="metric-concierge-tasks"
            className="bg-zinc-950/70 border border-purple-500/40 p-3 rounded-2xl text-center cursor-pointer hover:border-purple-400 transition"
            onClick={() => setActiveTab('CONCIERGE')}
          >
            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Concierge Tasks</span>
            <div className="text-xl font-black text-purple-300 mt-0.5">
              {conciergeRequests.filter((r) => r.status !== 'COMPLETED').length}
            </div>
          </div>
        </div>
      </div>

      {/* Modern Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-0 overflow-x-auto">
        <button
          type="button"
          data-testid="tab-checkin"
          onClick={() => setActiveTab('CHECKIN')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'CHECKIN'
              ? 'border-amber-400 text-amber-400 bg-amber-500/10'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span>🛎️</span> Quick Check-In Terminal
        </button>
        <button
          type="button"
          data-testid="tab-arrivals"
          onClick={() => setActiveTab('ARRIVALS')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'ARRIVALS'
              ? 'border-amber-400 text-amber-400 bg-amber-500/10'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span>🌐</span> Online Pre-Bookings & Expected Arrivals ({expectedArrivals.length})
        </button>
        <button
          type="button"
          data-testid="tab-in-house"
          onClick={() => setActiveTab('IN_HOUSE')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'IN_HOUSE'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-500/10'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span>👥</span> In-House Staying Guests ({inHouseGuests.length})
        </button>
        <button
          type="button"
          data-testid="tab-history"
          onClick={() => setActiveTab('HISTORY')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'HISTORY'
              ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span>📜</span> Guest Stay History & Ledger
        </button>
        <button
          type="button"
          data-testid="tab-concierge"
          onClick={() => setActiveTab('CONCIERGE')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'CONCIERGE'
              ? 'border-purple-400 text-purple-400 bg-purple-500/10'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span>🛎️</span> In-Room Concierge & Housekeeping Desk ({conciergeRequests.filter((r) => r.status !== 'COMPLETED').length})
        </button>
      </div>

      {/* Main Tab Workspace */}
      <main className="flex-1">
        {/* TAB 1: QUICK CHECK-IN TERMINAL */}
        {activeTab === 'CHECKIN' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Column */}
            <div className="lg:col-span-2 bg-zinc-900/90 border border-zinc-800 p-6 rounded-3xl space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
                <div>
                  <h2 className="text-lg font-black text-white">Guest Arrival & Room Key Allocation</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    1-Click fast check-in for solo/walk-in guests or online pre-booking arrival check-in with advance credit.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  RECEPTIONIST DESK
                </span>
              </div>

              {/* Banner when Online Pre-Booking is Loaded */}
              {loadedBooking && (
                <div
                  data-testid="prebooking-loaded-banner"
                  className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 to-amber-500/5 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 bg-amber-500/20 text-amber-300 rounded-xl font-mono font-black text-xs border border-amber-500/30">
                      {loadedBooking.bookingNumber}
                    </span>
                    <div>
                      <h4 className="text-xs font-black text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
                        <span>⚡ Online Pre-Booking Arrival Active</span>
                      </h4>
                      <p className="text-[11px] text-zinc-300 mt-0.5">
                        Reserved Type: <strong className="text-white">{loadedBooking.roomTypeName}</strong> • Grand Total: ₹{loadedBooking.grandTotal}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ₹{loadedBooking.advancePaymentAmount} Paid Online (Advance Credited)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setLoadedBooking(null);
                        setGuestName('');
                        setGuestPhone('');
                        setGuestEmail('');
                        setReceptionistNotes('');
                      }}
                      className="text-zinc-500 hover:text-zinc-300 text-xs font-bold"
                    >
                      Clear ✕
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleExecuteCheckIn} className="space-y-5">
                {/* Room Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                    Select Physical Room To Allot *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {availableRooms.slice(0, 8).map((rm) => (
                      <button
                        key={rm.id || rm._id || rm.roomNumber}
                        type="button"
                        data-testid={`room-select-${rm.roomNumber}`}
                        onClick={() => setSelectedRoomId(rm.id || rm._id)}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          (selectedRoomId === rm.id || selectedRoomId === rm._id)
                            ? 'bg-amber-500/20 border-amber-500 text-white shadow-lg shadow-amber-500/10'
                            : 'bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        <div className="text-sm font-black text-white">Room {rm.roomNumber}</div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">
                          Floor {rm.floorNumber || rm.floor || 1} • ₹{rm.basePrice || 3900}/night
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Guest Basic Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Guest Name *
                    </label>
                    <input
                      type="text"
                      required
                      data-testid="input-guest-name"
                      placeholder="e.g. Vikramaditya & Ananya Singhania"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Phone Number *
                    </label>
                    <input
                      type="text"
                      required
                      data-testid="input-guest-phone"
                      placeholder="e.g. 9821098765"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    data-testid="input-guest-email"
                    placeholder="e.g. guest@example.com"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* COUPLE VERIFICATION TOGGLE */}
                <div className="bg-zinc-950/80 border border-zinc-800/80 p-5 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="coupleToggle"
                        data-testid="toggle-couple"
                        checked={isCouple}
                        onChange={(e) => setIsCouple(e.target.checked)}
                        className="w-5 h-5 rounded border-zinc-700 text-amber-500 focus:ring-0 focus:ring-offset-0 bg-zinc-900 cursor-pointer"
                      />
                      <label htmlFor="coupleToggle" className="cursor-pointer">
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          Couple Check-In (Aadhaar Verification)
                          {isCouple && (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                              KYC REQUIRED
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400">
                          {isCouple
                            ? 'Aadhaar Card physically verified by reception for couple compliance.'
                            : 'Unchecked: 1-Click Fast Check-In (No documents required by hotel policy).'}
                        </p>
                      </label>
                    </div>

                    {!isCouple && (
                      <span className="px-3 py-1 rounded-xl text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        ⚡ 1-Click Direct Mode
                      </span>
                    )}
                  </div>

                  {/* Dynamic Couple KYC Fields (Only when isCouple is TRUE) */}
                  {isCouple && (
                    <div className="pt-4 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1.5">
                          Aadhaar Number (Last 4 Digits or Full) *
                        </label>
                        <input
                          type="text"
                          required
                          data-testid="input-aadhaar"
                          placeholder="e.g. 8842 or 9821 4412 8842"
                          value={idNumber}
                          onChange={(e) => setIdNumber(e.target.value)}
                          className="w-full bg-zinc-900 border border-emerald-500/40 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-400 font-mono"
                        />
                        <p className="text-[10px] text-zinc-500 mt-1">
                          Automatically saved as masked format: <strong className="text-zinc-300">XXXX-XXXX-8842</strong>
                        </p>
                      </div>

                      <div className="flex flex-col justify-end">
                        <label className="flex items-center gap-2.5 bg-zinc-900/90 border border-emerald-500/30 p-2.5 rounded-xl cursor-pointer">
                          <input
                            type="checkbox"
                            data-testid="checkbox-reception-verified"
                            checked={verifiedByReceptionist}
                            onChange={(e) => setVerifiedByReceptionist(e.target.checked)}
                            className="w-4 h-4 rounded text-emerald-500 bg-zinc-800 border-zinc-700"
                          />
                          <span className="text-xs font-bold text-emerald-300">
                            Physical Aadhaar Verified at Reception
                          </span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Advance Paid & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Additional Advance Paid at Reception (₹)
                    </label>
                    <input
                      type="number"
                      data-testid="input-advance-paid"
                      placeholder="0"
                      value={advancePaid}
                      onChange={(e) => setAdvancePaid(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                    {loadedBooking && (
                      <p className="text-[10px] text-emerald-400 font-mono mt-1">
                        + Online Advance ₹{loadedBooking.advancePaymentAmount} already credited to Master Folio
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Front Desk Notes / Requests
                    </label>
                    <input
                      type="text"
                      data-testid="input-reception-notes"
                      placeholder="e.g. VIP couple, extra bath sheets requested"
                      value={receptionistNotes}
                      onChange={(e) => setReceptionistNotes(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  data-testid="btn-submit-checkin"
                  disabled={loading}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black text-sm uppercase tracking-wider shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <span>🛎️</span>
                  <span>{loading ? 'Allocating Key...' : 'Complete Check-In & Issue Keycard'}</span>
                </button>
              </form>
            </div>

            {/* Side Information Panel */}
            <div className="space-y-6">
              <div className="bg-zinc-900/90 border border-zinc-800 p-6 rounded-3xl space-y-4">
                <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider">
                  Hotel Policy Guidelines
                </h3>
                <div className="space-y-3 text-xs text-zinc-300">
                  <div className="p-3 bg-zinc-950/70 border border-zinc-800/80 rounded-xl">
                    <strong className="text-white block mb-0.5">⚡ 1-Click Fast Mode</strong>
                    Single, corporate ya known guests ke liye document upload mandatory nahi hai. Receptionist direct check-in kar sakta hai.
                  </div>
                  <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl text-emerald-300">
                    <strong className="text-white block mb-0.5">👫 Couple Policy (Aadhaar Only)</strong>
                    Couple check-in ke waqt toggle ON karein aur Aadhaar number enter karein. System use securely mask karke store karega.
                  </div>
                  <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl text-amber-300">
                    <strong className="text-white block mb-0.5">📱 In-Room Portal Binding (:3004)</strong>
                    Check-in hote hi physical room live ho jata hai. Guest room ke QR ko scan karke ya `?room=102` par visit karke Wi-Fi aur Master Folio dekh sakta hai.
                  </div>
                </div>
              </div>

              {/* Quick Summary of in-house guests */}
              <div className="bg-zinc-900/90 border border-zinc-800 p-6 rounded-3xl space-y-3">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Live Rooms Overview
                </h3>
                <div className="space-y-2">
                  {inHouseGuests.slice(0, 3).map((g) => (
                    <div key={g.stayId} className="flex items-center justify-between p-2.5 bg-zinc-950/70 rounded-xl border border-zinc-800/60 text-xs">
                      <div>
                        <span className="font-bold text-white">Room {g.roomNumber}</span>
                        <span className="text-zinc-500 block text-[10px]">{g.guestName}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        g.isCouple ? 'bg-emerald-500/20 text-emerald-400' : 'bg-cyan-500/20 text-cyan-300'
                      }`}>
                        {g.isCouple ? 'Couple Verified' : 'Direct'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: EXPECTED ARRIVALS / ONLINE PRE-BOOKINGS */}
        {activeTab === 'ARRIVALS' && (
          <div className="space-y-4">
            <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-3xl flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-white">Expected Online Arrivals Today</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Guests who booked in advance via public website or OTA. Click Check-In to load details and allot room.
                </p>
              </div>
              <button
                type="button"
                data-testid="btn-refresh-arrivals"
                onClick={loadData}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 transition-all"
              >
                🔄 Refresh Arrivals
              </button>
            </div>

            {expectedArrivals.length === 0 ? (
              <div className="bg-zinc-900/60 border border-zinc-800 p-12 text-center rounded-3xl text-zinc-500 text-xs">
                No expected online pre-bookings waiting for arrival today.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {expectedArrivals.map((arr) => (
                  <div
                    key={arr.bookingId}
                    data-testid={`arrival-card-${arr.bookingNumber}`}
                    className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-3xl space-y-4 hover:border-amber-500/40 transition-all shadow-xl flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/30">
                              {arr.bookingNumber}
                            </span>
                            <span className="text-[10px] font-bold text-zinc-400">
                              {arr.bookingSource}
                            </span>
                          </div>
                          <h3 className="text-sm font-extrabold text-white mt-1.5">{arr.guestName}</h3>
                          <p className="text-xs text-zinc-400 font-mono">{arr.guestPhone}</p>
                        </div>

                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          ₹{arr.advancePaymentAmount} Paid (Adv)
                        </span>
                      </div>

                      <div className="bg-zinc-950/70 p-3 rounded-2xl border border-zinc-800/80 space-y-1.5 text-xs">
                        <div className="flex justify-between text-zinc-400">
                          <span>Reserved Type:</span>
                          <strong className="text-zinc-200 font-medium">{arr.roomTypeName}</strong>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span>Total Tariff:</span>
                          <strong className="text-zinc-200 font-mono">₹{arr.grandTotal}</strong>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span>Online Advance:</span>
                          <strong className="text-emerald-400 font-mono font-bold">₹{arr.advancePaymentAmount}</strong>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span>Balance Due at Check-In:</span>
                          <strong className="text-amber-400 font-mono font-bold">
                            ₹{Math.max(0, arr.grandTotal - arr.advancePaymentAmount)}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      data-testid={`btn-checkin-arrival-${arr.bookingNumber}`}
                      onClick={() => handleLoadPreBookingForCheckIn(arr)}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/10 transition flex items-center justify-center gap-1.5"
                    >
                      <span>⚡</span>
                      <span>Check-In This Guest</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: IN-HOUSE STAYING GUESTS DIRECTORY */}
        {activeTab === 'IN_HOUSE' && (
          <div className="space-y-4">
            <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-3xl flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-white">Currently In-House Staying Guests</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Live guest register with room numbers, verification tags, balance due, and stay timestamps.
                </p>
              </div>
              <button
                type="button"
                data-testid="btn-refresh-inhouse"
                onClick={loadData}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 transition-all"
              >
                🔄 Refresh Directory
              </button>
            </div>

            {inHouseGuests.length === 0 ? (
              <div className="bg-zinc-900/60 border border-zinc-800 p-12 text-center rounded-3xl text-zinc-500 text-xs">
                No active in-house guests currently. Use the Quick Check-In Terminal to check in guests.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inHouseGuests.map((guest) => (
                  <div
                    key={guest.stayId}
                    data-testid={`inhouse-guest-card-${guest.roomNumber}`}
                    className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-3xl space-y-4 hover:border-zinc-700 transition-all shadow-xl"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-white">Room {guest.roomNumber}</span>
                          <span className="text-[10px] font-mono font-bold bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">
                            Floor {guest.floor}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-amber-400 mt-1">{guest.guestName}</h3>
                        <p className="text-xs text-zinc-400 font-mono">{guest.phone}</p>
                      </div>

                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border ${
                        guest.isCouple
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      }`}>
                        {guest.isCouple ? '👫 Couple Verified' : '⚡ Direct Check-In'}
                      </span>
                    </div>

                    <div className="bg-zinc-950/70 p-3 rounded-2xl border border-zinc-800/80 space-y-1 text-xs">
                      <div className="flex justify-between text-zinc-400">
                        <span>ID Document:</span>
                        <strong className="text-zinc-200 font-mono">{guest.idNumberMasked}</strong>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>Folio Ref:</span>
                        <strong className="text-zinc-200 font-mono">{guest.folioNumber}</strong>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>Advance Paid:</span>
                        <strong className="text-emerald-400 font-mono">₹{guest.advancePaid}</strong>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>Balance Due:</span>
                        <strong className="text-amber-400 font-mono">₹{guest.balanceDue}</strong>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>Lifetime Visits:</span>
                        <strong className="text-emerald-400 font-bold">{guest.totalVisits} visit(s)</strong>
                      </div>
                    </div>

                    {guest.receptionistNotes && (
                      <div className="text-[11px] text-zinc-400 italic bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-900">
                        "{guest.receptionistNotes}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: GUEST STAY HISTORY & LIFETIME LEDGER */}
        {activeTab === 'HISTORY' && (
          <div className="space-y-6">
            <div className="bg-zinc-900/90 border border-zinc-800 p-6 rounded-3xl space-y-4">
              <div>
                <h2 className="text-base font-black text-white">Search Guest Lifetime Stay History</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Type phone number or guest name to inspect previous visits, rooms stayed, and lifetime spend.
                </p>
              </div>

              <div className="flex gap-3">
                <input
                  type="text"
                  data-testid="input-search-history"
                  placeholder="Enter phone number (e.g. 9821098765) or guest name..."
                  value={searchHistoryQuery}
                  onChange={(e) => setSearchHistoryQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchHistory()}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-mono"
                />
                <button
                  type="button"
                  data-testid="btn-search-history"
                  onClick={handleSearchHistory}
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all"
                >
                  {loading ? 'Searching...' : 'Search History 🔍'}
                </button>
              </div>
            </div>

            {guestHistoryList.length === 0 ? (
              <div className="bg-zinc-900/60 border border-zinc-800 p-12 text-center rounded-3xl text-zinc-500 text-xs">
                Search by phone number or name above to view historical guest records.
              </div>
            ) : (
              <div className="space-y-6">
                {guestHistoryList.map((gp) => (
                  <div key={gp.guestId} className="bg-zinc-900/90 border border-zinc-800 p-6 rounded-3xl space-y-6">
                    {/* Guest Summary Card */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-black text-white">{gp.name}</h3>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {gp.vipTier}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 font-mono mt-0.5">{gp.phone} • {gp.email || 'No email'}</p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Total Stays</span>
                          <span className="text-lg font-black text-emerald-400">{gp.totalVisits} Visits</span>
                        </div>
                        <div className="text-right border-l border-zinc-800 pl-4">
                          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Total Lifetime Spend</span>
                          <span className="text-lg font-black text-amber-400">₹{gp.totalLifetimeSpend}</span>
                        </div>
                      </div>
                    </div>

                    {/* Timeline of Past Stays */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                        Past Stays Timeline ({gp.pastStays.length})
                      </h4>
                      <div className="space-y-2">
                        {gp.pastStays.map((st, idx) => (
                          <div
                            key={st.stayId || idx}
                            className="bg-zinc-950/70 border border-zinc-800/80 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-4">
                              <span className="p-2 bg-zinc-900 text-zinc-300 rounded-xl text-xs font-mono font-bold">
                                #{idx + 1}
                              </span>
                              <div>
                                <span className="font-bold text-white text-sm">Room {st.roomNumber}</span>
                                <div className="text-[11px] text-zinc-400 mt-0.5">
                                  Checked in: {new Date(st.checkIn).toLocaleDateString('en-GB')}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase border ${
                                st.isCouple
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                              }`}>
                                {st.isCouple ? `Couple (${st.idNumberMasked})` : 'Direct Check-In'}
                              </span>

                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                st.stayStatus === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'
                              }`}>
                                {st.stayStatus}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: IN-ROOM CONCIERGE & HOUSEKEEPING DESK (Shift 60) */}
        {activeTab === 'CONCIERGE' && (
          <div className="space-y-6">
            <div className="bg-zinc-900/90 border border-zinc-800 p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🛎️</span>
                  <h2 className="text-lg font-black text-white">Digital Concierge & Housekeeping Dispatch Desk</h2>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Real-time room service and housekeeping requests dispatched from In-Room Guest Portal (:3004). Assign staff attendants and monitor resolution SLAs.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="refresh-concierge-btn"
                  onClick={loadConciergeRequests}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                >
                  <span>🔄</span> Refresh Desk
                </button>
              </div>
            </div>

            {/* Quick Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-zinc-900/80 border border-purple-500/30 p-4 rounded-2xl text-center">
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Active In-Flight</span>
                <div className="text-2xl font-black text-purple-300 mt-1">
                  {conciergeRequests.filter((r) => r.status !== 'COMPLETED').length}
                </div>
              </div>
              <div className="bg-zinc-900/80 border border-amber-500/30 p-4 rounded-2xl text-center">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Billable / Laundry</span>
                <div className="text-2xl font-black text-amber-300 mt-1">
                  {conciergeRequests.filter((r) => r.isBillable).length}
                </div>
              </div>
              <div className="bg-zinc-900/80 border border-blue-500/30 p-4 rounded-2xl text-center">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Assigned Staff</span>
                <div className="text-2xl font-black text-blue-300 mt-1">
                  {conciergeRequests.filter((r) => r.status === 'ASSIGNED' || r.status === 'IN_PROGRESS').length}
                </div>
              </div>
              <div className="bg-zinc-900/80 border border-emerald-500/30 p-4 rounded-2xl text-center">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Fulfilled Today</span>
                <div className="text-2xl font-black text-emerald-400 mt-1">
                  {conciergeRequests.filter((r) => r.status === 'COMPLETED').length}
                </div>
              </div>
            </div>

            {/* Requests Cards List */}
            {conciergeRequests.length === 0 ? (
              <div className="bg-zinc-900/50 border border-dashed border-zinc-800 p-12 rounded-3xl text-center">
                <span className="text-4xl block mb-3">🛎️</span>
                <h3 className="text-sm font-bold text-zinc-300">No Concierge or Housekeeping Requests Active</h3>
                <p className="text-xs text-zinc-500 mt-1">
                  When guests submit towel replenishment, room cleaning, or laundry requests via the room portal (:3004), they will appear here live.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {conciergeRequests.map((req) => (
                  <div
                    key={req.id}
                    data-testid={`concierge-card-${req.roomNumber}`}
                    className="bg-zinc-900/90 border border-zinc-800 hover:border-purple-500/40 p-5 rounded-3xl transition flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                  >
                    {/* Left: Room & Request Information */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="px-3 py-1 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-black font-mono">
                          ROOM {req.roomNumber}
                        </span>
                        <span className="text-sm font-black text-white">{req.guestName}</span>
                        <span className="text-xs text-zinc-500">• Fl {req.floor}</span>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                            req.priority === 'URGENT'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : req.priority === 'HIGH'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                          }`}
                        >
                          {req.priority} Priority
                        </span>

                        {req.isBillable && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            💰 ₹{req.billableAmount} + 5% GST (Posted to Master Folio)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-base">
                          {req.requestType === 'TOWEL_REPLENISH'
                            ? '🧴'
                            : req.requestType === 'LAUNDRY'
                            ? '🧺'
                            : req.requestType === 'ROOM_CLEANING'
                            ? '🧹'
                            : req.requestType === 'TOILETRIES'
                            ? '🪥'
                            : req.requestType === 'LUGGAGE_ASSIST'
                            ? '🧳'
                            : '🛎️'}
                        </span>
                        <span className="text-sm font-bold text-amber-300 uppercase tracking-wide">
                          {req.requestType.replace('_', ' ')}
                        </span>
                        {req.notes && (
                          <span className="text-xs text-zinc-300 italic font-medium ml-2">
                            "{req.notes}"
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-[11px] text-zinc-400">
                        <span>Requested: {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>• SLA Target: {req.slaMinutes}m</span>
                        {req.assignedStaffName && req.assignedStaffName !== 'Unassigned' && (
                          <span className="text-purple-300 font-bold">
                            • Assigned Attendant: {req.assignedStaffName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Status Pill & Interactive Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <span
                        className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase text-center border ${
                          req.status === 'COMPLETED'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : req.status === 'IN_PROGRESS'
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 animate-pulse'
                            : req.status === 'ASSIGNED'
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}
                      >
                        {req.status === 'COMPLETED'
                          ? '✅ Fulfilled'
                          : req.status === 'IN_PROGRESS'
                          ? '🚀 On The Way'
                          : req.status === 'ASSIGNED'
                          ? '👤 Staff Assigned'
                          : '⏳ Pending Dispatch'}
                      </span>

                      {req.status !== 'COMPLETED' && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {req.status === 'CREATED' && (
                            <>
                              <button
                                type="button"
                                data-testid={`assign-sunita-${req.roomNumber}`}
                                onClick={() => handleAssignStaff(req.id, 'Sunita Sharma (Housekeeping)')}
                                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition"
                              >
                                👤 Assign Sunita
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAssignStaff(req.id, 'Ramesh Kumar (Captain)')}
                                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition"
                              >
                                👤 Assign Ramesh
                              </button>
                            </>
                          )}

                          {req.status === 'ASSIGNED' && (
                            <button
                              type="button"
                              data-testid={`inprogress-btn-${req.roomNumber}`}
                              onClick={() => handleUpdateConciergeStatus(req.id, 'IN_PROGRESS')}
                              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition"
                            >
                              🚀 Mark In-Progress
                            </button>
                          )}

                          <button
                            type="button"
                            data-testid={`fulfill-btn-${req.roomNumber}`}
                            onClick={() => handleUpdateConciergeStatus(req.id, 'COMPLETED')}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/40 transition"
                          >
                            ✅ Fulfill & Deliver
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
