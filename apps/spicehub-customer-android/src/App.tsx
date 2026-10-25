import React, { useState, useEffect, useRef } from 'react';

interface ActiveHotel {
  id: string;
  name: string;
  slug: string;
  city?: string;
  logoUrl?: string;
  enabledPortals?: string[];
}

const DEFAULT_API_BASE = 'http://localhost:5000';
const TABLE_PORTAL_BASE = 'http://localhost:3001';
const ROOM_PORTAL_BASE = 'http://localhost:3004';

export const App: React.FC = () => {
  const [hotels, setHotels] = useState<ActiveHotel[]>([]);
  const [selectedHotel, setSelectedHotel] = useState<ActiveHotel | null>(null);
  const [loadingHotels, setLoadingHotels] = useState(true);
  const [isHotelModalOpen, setIsHotelModalOpen] = useState(false);
  const [hotelSearch, setHotelSearch] = useState('');

  const [mode, setMode] = useState<'table' | 'room'>('table');
  const [roomFlowType, setRoomFlowType] = useState<'resident' | 'booking'>('resident');

  // Dining Table Selection
  const [tableInput, setTableInput] = useState('');
  const [hotelTables, setHotelTables] = useState<{ id: string; tableNumber: string; section?: string }[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Resident Room Verification
  const [roomNumberInput, setRoomNumberInput] = useState('');
  const [guestPhoneInput, setGuestPhoneInput] = useState('');
  const [isVerifyingStay, setIsVerifyingStay] = useState(false);
  const [stayVerifyError, setStayVerifyError] = useState<string | null>(null);

  // Scanner state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scanMessage, setScanMessage] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Active embedded portal iframe
  const [activePortalUrl, setActivePortalUrl] = useState<string | null>(null);
  const [activeSessionLabel, setActiveSessionLabel] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    async function fetchHotels() {
      try {
        setLoadingHotels(true);
        const res = await fetch(`${DEFAULT_API_BASE}/api/v1/auth/active-hotels`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            if (!isMounted) return;
            setHotels(json.data);
            setSelectedHotel(json.data[0]);
            return;
          }
        }
      } catch (err) {
        console.warn('⚠️ [CustomerAndroid] Could not fetch active hotels:', err);
      } finally {
        if (isMounted) setLoadingHotels(false);
      }

      if (isMounted) {
        const fallback: ActiveHotel = {
          id: 'demo-hotel-id',
          name: 'The Grand Palace Heritage',
          slug: 'grand-palace',
          city: 'Jaipur',
          enabledPortals: ['pos', 'table', 'guest', 'waiter', 'kds', 'cashier'],
        };
        setHotels([fallback]);
        setSelectedHotel(fallback);
        setLoadingHotels(false);
      }
    }

    fetchHotels();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch active tables for the selected hotel
  useEffect(() => {
    let isMounted = true;
    async function fetchTables() {
      if (!selectedHotel) return;
      try {
        const res = await fetch(`${DEFAULT_API_BASE}/api/v1/pos/demo-context?hotelId=${selectedHotel.id}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data?.tables)) {
            if (!isMounted) return;
            setHotelTables(
              json.data.tables.map((t: any) => ({
                id: String(t.id || t._id),
                tableNumber: String(t.tableNumber),
                section: t.section || 'Dining',
              }))
            );
          }
        }
      } catch (err) {
        console.warn('⚠️ [CustomerAndroid] Table load note:', err);
      }
    }

    fetchTables();
    return () => {
      isMounted = false;
    };
  }, [selectedHotel]);

  const startCamera = async () => {
    setIsCameraActive(true);
    setCameraError('');
    setScanMessage('');
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      } else {
        setCameraError('Camera API not accessible in this environment.');
      }
    } catch (err: any) {
      setCameraError(err.message || 'Camera permission denied or camera not found.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setCameraError('');
  };

  const processScannedValue = (val: string) => {
    const raw = val.trim();
    setScanMessage(`✨ Scanned code: "${raw}". Binding session...`);

    let parsedTable = '';
    let parsedRoom = '';
    let parsedHotelId = '';
    let parsedToken = '';

    try {
      if (raw.startsWith('http://') || raw.startsWith('https://')) {
        const url = new URL(raw);
        parsedTable =
          url.searchParams.get('table') ||
          url.searchParams.get('tableNumber') ||
          url.searchParams.get('tableId') ||
          (url.searchParams.get('type') === 'table' ? url.searchParams.get('id') || '' : '');
        parsedRoom =
          url.searchParams.get('room') ||
          url.searchParams.get('roomNumber') ||
          url.searchParams.get('roomId') ||
          (url.searchParams.get('type') === 'room' ? url.searchParams.get('id') || '' : '');
        parsedHotelId = url.searchParams.get('hotelId') || '';
        parsedToken = url.searchParams.get('token') || url.searchParams.get('qrToken') || '';
      }
    } catch {}

    if (!parsedTable && !parsedRoom) {
      if (mode === 'table' || raw.toUpperCase().startsWith('T-')) {
        parsedTable = raw;
      } else {
        parsedRoom = raw;
      }
    }

    const hotel = (parsedHotelId && hotels.find((h) => h.id === parsedHotelId)) || selectedHotel || hotels[0];

    setTimeout(() => {
      stopCamera();
      if (parsedTable) {
        launchTable(parsedTable, hotel);
      } else if (parsedRoom) {
        launchRoom(parsedRoom, hotel, parsedToken);
      }
    }, 600);
  };

  const launchTable = (tbl: string, hotel = selectedHotel) => {
    if (!hotel) return;
    const finalTable = tbl.trim();
    if (!finalTable) {
      setValidationError('Please enter or select a valid Table Number.');
      return;
    }
    setValidationError(null);

    const numOnly = finalTable.replace(/[^0-9]/g, '');
    const formatted = finalTable.toUpperCase().startsWith('T-')
      ? finalTable.toUpperCase()
      : numOnly
      ? `T-${numOnly.padStart(2, '0')}`
      : finalTable;

    const url = new URL(TABLE_PORTAL_BASE);
    url.searchParams.set('hotelId', hotel.id);
    url.searchParams.set('table', formatted);

    setActiveSessionLabel(`${hotel.name} • Table ${formatted}`);
    setActivePortalUrl(url.toString());
  };

  const launchRoom = (rm: string, hotel = selectedHotel, token?: string) => {
    if (!hotel) return;
    const formatted = rm.trim();
    if (!formatted) {
      setValidationError('Please enter your Room Number or explore available rooms.');
      return;
    }
    setValidationError(null);

    const url = new URL(ROOM_PORTAL_BASE);
    url.searchParams.set('hotelId', hotel.id);
    url.searchParams.set('room', formatted);
    url.searchParams.set('tab', 'HOME');
    if (token) url.searchParams.set('token', token);

    setActiveSessionLabel(`${hotel.name} • Room ${formatted}`);
    setActivePortalUrl(url.toString());
  };

  const launchRoomCatalog = (hotel = selectedHotel) => {
    if (!hotel) return;
    const url = new URL(ROOM_PORTAL_BASE);
    url.searchParams.set('hotelId', hotel.id);
    url.searchParams.set('tab', 'ROOMS');

    setActiveSessionLabel(`${hotel.name} • Available Rooms`);
    setActivePortalUrl(url.toString());
  };

  // Verify Resident Stay
  const handleVerifyResidentStay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHotel) return;

    const rNum = roomNumberInput.trim();
    const phone = guestPhoneInput.trim();

    if (!rNum) {
      setStayVerifyError('Please enter your Room Number.');
      return;
    }
    if (!phone) {
      setStayVerifyError('Please enter your registered phone number.');
      return;
    }

    try {
      setIsVerifyingStay(true);
      setStayVerifyError(null);

      const res = await fetch(`${DEFAULT_API_BASE}/api/v1/guest-portal/stay/verify-resident`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hotel-id': selectedHotel.id,
        },
        body: JSON.stringify({
          hotelId: selectedHotel.id,
          roomNumber: rNum,
          guestPhone: phone,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success && json.data) {
        launchRoom(json.data.roomNumber || rNum, selectedHotel, json.data.sessionToken);
      } else {
        setStayVerifyError(
          json.message ||
            `No active check-in found for Room ${rNum} with mobile ${phone}. If you need a room, please explore available rooms from our catalog.`
        );
      }
    } catch (err: any) {
      setStayVerifyError(err.message || 'Verification network error.');
    } finally {
      setIsVerifyingStay(false);
    }
  };

  const filteredHotels = hotels.filter(
    (h) =>
      h.name.toLowerCase().includes(hotelSearch.toLowerCase()) ||
      (h.city && h.city.toLowerCase().includes(hotelSearch.toLowerCase()))
  );

  // If a portal is active, display the embedded portal with station bar
  if (activePortalUrl) {
    return (
      <div className="w-full h-full flex flex-col bg-[#070b12] text-slate-100">
        <div className="bg-[#0c1322] border-b border-slate-800 px-3 py-2 flex items-center justify-between text-xs z-20 shadow-md">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-white truncate max-w-[200px] sm:max-w-md">
              {activeSessionLabel}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const ifr = document.getElementById('portal-frame') as HTMLIFrameElement;
                if (ifr) ifr.src = activePortalUrl;
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
            >
              🔄 Refresh
            </button>
            <button
              type="button"
              onClick={() => setActivePortalUrl(null)}
              className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 font-bold"
            >
              🏠 Switch Service / Hotel
            </button>
          </div>
        </div>
        <div className="flex-1 w-full relative">
          <iframe
            id="portal-frame"
            src={activePortalUrl}
            title="Customer Portal"
            className="w-full h-full border-none"
            allow="camera; microphone; payment; geolocation"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col bg-[#070b12] text-slate-100 overflow-y-auto">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-[#0d1424]/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center font-black text-slate-950 text-lg shadow-md shadow-amber-500/20">
            S
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-black tracking-tight text-white">
              SpiceHub Customer App
            </h1>
            <p className="text-[10px] text-slate-400">Play Store Guest Edition</p>
          </div>
        </div>

        {/* Selected Hotel Chip */}
        <button
          type="button"
          onClick={() => setIsHotelModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold hover:border-amber-500/50 transition"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="max-w-[130px] truncate text-slate-200">
            {selectedHotel?.name || (loadingHotels ? 'Loading...' : 'Select Hotel')}
          </span>
          <span className="text-slate-400 text-[10px]">▼</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4 flex flex-col gap-5">
        {/* Banner */}
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-[#0f172a] to-[#1e1b4b]/30 border border-slate-800 p-5 shadow-lg relative overflow-hidden">
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/30 mb-2">
            {selectedHotel?.city ? `📍 ${selectedHotel.city}` : '🏨 Welcome Guest'}
          </span>
          <h2 className="text-lg sm:text-xl font-black text-white">
            {selectedHotel?.name || 'Welcome to SpiceHub'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Order fresh meals directly to your table or request verified in-room hotel services.
          </p>
        </div>

        {validationError && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-between">
            <span>⚠️ {validationError}</span>
            <button onClick={() => setValidationError(null)} className="text-rose-400 font-bold ml-2">✕</button>
          </div>
        )}

        {/* Mode Selector */}
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Select Service Type
          </span>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              data-testid="mode-table-btn"
              onClick={() => {
                setMode('table');
                setValidationError(null);
                setStayVerifyError(null);
              }}
              className={`p-3.5 rounded-2xl border text-left flex flex-col gap-1.5 transition ${
                mode === 'table'
                  ? 'border-amber-500/80 bg-amber-500/10 shadow-md shadow-amber-500/10'
                  : 'border-slate-800 bg-slate-900/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">🍽️</span>
                {mode === 'table' && <span className="w-2 h-2 rounded-full bg-amber-400" />}
              </div>
              <div>
                <h3 className={`text-xs font-black ${mode === 'table' ? 'text-amber-400' : 'text-slate-200'}`}>
                  Dine-In Table Menu
                </h3>
                <p className="text-[10px] text-slate-400">Restaurant / Cafe Seating</p>
              </div>
            </button>

            <button
              type="button"
              data-testid="mode-room-btn"
              onClick={() => {
                setMode('room');
                setValidationError(null);
                setStayVerifyError(null);
              }}
              className={`p-3.5 rounded-2xl border text-left flex flex-col gap-1.5 transition ${
                mode === 'room'
                  ? 'border-blue-500/80 bg-blue-500/10 shadow-md shadow-blue-500/10'
                  : 'border-slate-800 bg-slate-900/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">🛎️</span>
                {mode === 'room' && <span className="w-2 h-2 rounded-full bg-blue-400" />}
              </div>
              <div>
                <h3 className={`text-xs font-black ${mode === 'room' ? 'text-blue-400' : 'text-slate-200'}`}>
                  Room Stay Services
                </h3>
                <p className="text-[10px] text-slate-400">In-Room Dining & Catalog</p>
              </div>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* DINE-IN TABLE WORKFLOW                                   */}
        {/* ======================================================== */}
        {mode === 'table' && (
          <div className="flex flex-col gap-4">
            {/* Camera QR Scanner */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5 flex flex-col gap-3.5 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📷</span>
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">
                      Scan Table QR Standee
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Instantly binds your dining table and opens the menu
                    </p>
                  </div>
                </div>
                {isCameraActive && (
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="text-xs font-bold text-rose-400 px-2 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/20"
                  >
                    Close Camera
                  </button>
                )}
              </div>

              {isCameraActive ? (
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-amber-500/50">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    <div className="w-40 h-40 border-2 border-amber-400/90 rounded-2xl relative animate-pulse">
                      <div className="absolute left-0 right-0 h-0.5 bg-amber-400 top-1/2 -translate-y-1/2" />
                    </div>
                    <span className="text-[10px] font-bold text-amber-200 mt-2 bg-black/60 px-2.5 py-0.5 rounded-full">
                      Align QR within frame
                    </span>
                  </div>
                  {scanMessage && (
                    <div className="absolute inset-x-3 bottom-3 bg-emerald-950/90 border border-emerald-500/80 rounded-xl p-2 text-center text-xs font-bold text-emerald-200">
                      {scanMessage}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  data-testid="start-camera-scan-btn"
                  onClick={startCamera}
                  className="min-h-[46px] rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition"
                >
                  <span>📷</span>
                  <span>Launch Camera Scanner</span>
                </button>
              )}

              {cameraError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                  {cameraError}
                </div>
              )}
            </div>

            {/* Manual Table Entry */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm">✍️</span>
                <div>
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Or Enter Table Number
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Type table number printed on your table tent
                  </p>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  launchTable(tableInput);
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  data-testid="customer-manual-input"
                  value={tableInput}
                  onChange={(e) => setTableInput(e.target.value)}
                  placeholder="e.g. T-04, 5, Rooftop 2"
                  className="flex-1 min-h-[44px] rounded-xl bg-slate-950 border border-slate-700 px-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  data-testid="customer-manual-submit-btn"
                  className="min-h-[44px] px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-md shrink-0 flex items-center justify-center"
                >
                  Open Menu
                </button>
              </form>

              {/* Active Hotel Tables */}
              {hotelTables.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Tables at {selectedHotel?.name}:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {hotelTables.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setTableInput(t.tableNumber);
                          launchTable(t.tableNumber);
                        }}
                        className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-semibold hover:bg-amber-500/20 hover:text-amber-400 border border-slate-700 hover:border-amber-500/40"
                      >
                        {t.tableNumber}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ROOM STAY WORKFLOW                                       */}
        {/* ======================================================== */}
        {mode === 'room' && (
          <div className="flex flex-col gap-4">
            {/* Room Subtabs */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-900 border border-slate-800">
              <button
                type="button"
                data-testid="room-subtab-resident"
                onClick={() => {
                  setRoomFlowType('resident');
                  setStayVerifyError(null);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  roomFlowType === 'resident'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🔑</span>
                <span>Resident Guest</span>
              </button>
              <button
                type="button"
                data-testid="room-subtab-booking"
                onClick={() => {
                  setRoomFlowType('booking');
                  setStayVerifyError(null);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  roomFlowType === 'booking'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🛏️</span>
                <span>Book a Room</span>
              </button>
            </div>

            {/* FLOW 1: RESIDENT GUEST VERIFICATION */}
            {roomFlowType === 'resident' && (
              <div className="flex flex-col gap-4">
                {/* Camera Scanner for In-Room QR Code */}
                <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5 flex flex-col gap-3.5 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📷</span>
                      <div>
                        <h3 className="text-xs font-black text-white uppercase tracking-wider">
                          Scan In-Room QR Code
                        </h3>
                        <p className="text-[10px] text-slate-400">
                          Scan the QR placed on your bedside table or keycard holder
                        </p>
                      </div>
                    </div>
                    {isCameraActive && (
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="text-xs font-bold text-rose-400 px-2 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/20"
                      >
                        Close Camera
                      </button>
                    )}
                  </div>

                  {isCameraActive ? (
                    <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-blue-500/50">
                      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                        <div className="w-40 h-40 border-2 border-blue-400/90 rounded-2xl relative animate-pulse">
                          <div className="absolute left-0 right-0 h-0.5 bg-blue-400 top-1/2 -translate-y-1/2" />
                        </div>
                        <span className="text-[10px] font-bold text-blue-200 mt-2 bg-black/60 px-2.5 py-0.5 rounded-full">
                          Align In-Room QR within frame
                        </span>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      data-testid="start-room-camera-scan-btn"
                      onClick={startCamera}
                      className="min-h-[46px] rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition"
                    >
                      <span>📷</span>
                      <span>Scan In-Room QR Code</span>
                    </button>
                  )}
                </div>

                {/* Room # & Mobile Verification Form */}
                <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 flex flex-col gap-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Verify Checked-In Stay
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Enter your room number and mobile number registered at check-in
                    </p>
                  </div>

                  {stayVerifyError && (
                    <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex flex-col gap-1.5">
                      <span>⚠️ {stayVerifyError}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setRoomFlowType('booking');
                          setStayVerifyError(null);
                        }}
                        className="self-start text-[11px] font-bold text-amber-400 underline hover:text-amber-300"
                      >
                        👉 Explore available rooms from catalog instead
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleVerifyResidentStay} className="flex flex-col gap-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">
                          Room Number
                        </label>
                        <input
                          type="text"
                          data-testid="resident-room-input"
                          value={roomNumberInput}
                          onChange={(e) => setRoomNumberInput(e.target.value)}
                          placeholder="e.g. 101, 204"
                          className="w-full min-h-[42px] rounded-xl bg-slate-950 border border-slate-700 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">
                          Registered Mobile Number
                        </label>
                        <input
                          type="tel"
                          data-testid="resident-phone-input"
                          value={guestPhoneInput}
                          onChange={(e) => setGuestPhoneInput(e.target.value)}
                          placeholder="e.g. 9820011223"
                          className="w-full min-h-[42px] rounded-xl bg-slate-950 border border-slate-700 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isVerifyingStay}
                      data-testid="resident-verify-stay-btn"
                      className="min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 mt-1"
                    >
                      {isVerifyingStay ? (
                        <span>Verifying with Front Desk...</span>
                      ) : (
                        <span>Verify Stay & Open Room Portal</span>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* FLOW 2: BOOK A ROOM VIA LIVE CATALOG */}
            {roomFlowType === 'booking' && (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col gap-4 shadow-xl">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">🛏️</span>
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">
                      Live Room Inventory & Booking
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Real room inventory with dynamic night tariffs & Aadhaar KYC
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>Live room statuses (Available, Cleaning, Occupied)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>Dynamic check-in dates & night duration calculation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>GPS property distance verification</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>Aadhaar / Government ID instant KYC verification</span>
                  </div>
                </div>

                <button
                  type="button"
                  data-testid="open-room-catalog-btn"
                  onClick={() => launchRoomCatalog(selectedHotel)}
                  className="min-h-[48px] rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition"
                >
                  <span>🏨</span>
                  <span>Explore Available Rooms & Book Now</span>
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Hotel Selection Modal */}
      {isHotelModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
        >
          <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-[#0d1424] p-5 shadow-2xl flex flex-col gap-3.5 max-h-[80vh]">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-black text-white">Select Hotel Property</h3>
              <button
                type="button"
                onClick={() => setIsHotelModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <input
              type="text"
              value={hotelSearch}
              onChange={(e) => setHotelSearch(e.target.value)}
              placeholder="Search hotel or city..."
              className="w-full min-h-[40px] rounded-xl bg-slate-900 border border-slate-700 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />

            <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-1">
              {filteredHotels.map((h) => {
                const isSelected = selectedHotel?.id === h.id;
                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => {
                      setSelectedHotel(h);
                      setIsHotelModalOpen(false);
                      setValidationError(null);
                      setStayVerifyError(null);
                    }}
                    className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                      isSelected
                        ? 'border-amber-500/80 bg-amber-500/10'
                        : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{h.name}</div>
                      <div className="text-[10px] text-slate-400">{h.city || 'SpiceHub Premier'}</div>
                    </div>
                    {isSelected && <span className="text-amber-400 text-xs font-bold">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
