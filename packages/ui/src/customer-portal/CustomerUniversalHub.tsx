import React, { useState, useEffect, useRef } from 'react';

export interface ActiveHotel {
  id: string;
  name: string;
  slug: string;
  city?: string;
  logoUrl?: string;
  enabledPortals?: string[];
}

export interface CustomerUniversalHubProps {
  apiBaseUrl?: string;
  tablePortalBaseUrl?: string;
  roomPortalBaseUrl?: string;
  onTableSelected?: (hotel: ActiveHotel, tableNumber: string) => void;
  onRoomSelected?: (hotel: ActiveHotel, roomNumber: string, sessionToken?: string) => void;
  onBookRoomRequested?: (hotel: ActiveHotel) => void;
  initialMode?: 'table' | 'room';
}

export const CustomerUniversalHub: React.FC<CustomerUniversalHubProps> = ({
  apiBaseUrl = 'http://localhost:5000',
  tablePortalBaseUrl = 'http://localhost:3001',
  roomPortalBaseUrl = 'http://localhost:3004',
  onTableSelected,
  onRoomSelected,
  onBookRoomRequested,
  initialMode = 'table',
}) => {
  const [hotels, setHotels] = useState<ActiveHotel[]>([]);
  const [selectedHotel, setSelectedHotel] = useState<ActiveHotel | null>(null);
  const [hotelSearchQuery, setHotelSearchQuery] = useState('');
  const [isHotelSelectorOpen, setIsHotelSelectorOpen] = useState(false);
  const [loadingHotels, setLoadingHotels] = useState(true);

  const [mode, setMode] = useState<'table' | 'room'>(initialMode);
  const [roomFlowType, setRoomFlowType] = useState<'resident' | 'booking'>('resident');

  // Dining Table Selection State
  const [tableInput, setTableInput] = useState('');
  const [hotelTables, setHotelTables] = useState<{ id: string; tableNumber: string; section?: string }[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);

  // Resident Room Verification State
  const [roomNumberInput, setRoomNumberInput] = useState('');
  const [guestPhoneInput, setGuestPhoneInput] = useState('');
  const [isVerifyingStay, setIsVerifyingStay] = useState(false);
  const [stayVerifyError, setStayVerifyError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // In-App Camera QR Scanner State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string>('');
  const [scanFeedback, setScanFeedback] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Fetch active hotels created by Superadmin
  useEffect(() => {
    let isMounted = true;
    async function fetchHotels() {
      try {
        setLoadingHotels(true);
        const res = await fetch(`${apiBaseUrl}/api/v1/auth/active-hotels`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            if (!isMounted) return;
            setHotels(json.data);

            const savedHotelId = localStorage.getItem('spicehub_customer_hotel_id');
            const matched = json.data.find((h: ActiveHotel) => h.id === savedHotelId);
            setSelectedHotel(matched || json.data[0]);
            return;
          }
        }
      } catch (err) {
        console.warn('⚠️ [CustomerHub] Could not fetch active hotels:', err);
      } finally {
        if (isMounted) setLoadingHotels(false);
      }

      if (isMounted) {
        const fallbackHotel: ActiveHotel = {
          id: 'demo-hotel-id',
          name: 'The Grand Palace Heritage',
          slug: 'grand-palace',
          city: 'Jaipur',
          enabledPortals: ['pos', 'table', 'guest', 'waiter', 'kds', 'cashier'],
        };
        setHotels([fallbackHotel]);
        setSelectedHotel(fallbackHotel);
        setLoadingHotels(false);
      }
    }

    fetchHotels();
    return () => {
      isMounted = false;
    };
  }, [apiBaseUrl]);

  // Fetch active tables for the selected hotel
  useEffect(() => {
    let isMounted = true;
    async function fetchTables() {
      if (!selectedHotel) return;
      try {
        setLoadingTables(true);
        const res = await fetch(`${apiBaseUrl}/api/v1/pos/demo-context?hotelId=${selectedHotel.id}`);
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
            return;
          }
        }
      } catch (err) {
        console.warn('⚠️ [CustomerHub] Table load note:', err);
      } finally {
        if (isMounted) setLoadingTables(false);
      }
    }

    fetchTables();
    return () => {
      isMounted = false;
    };
  }, [apiBaseUrl, selectedHotel]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleSelectHotel = (hotel: ActiveHotel) => {
    setSelectedHotel(hotel);
    localStorage.setItem('spicehub_customer_hotel_id', hotel.id);
    localStorage.setItem('spicehub_customer_hotel_name', hotel.name);
    setIsHotelSelectorOpen(false);
    setValidationError(null);
    setStayVerifyError(null);
  };

  const startCamera = async () => {
    setIsCameraActive(true);
    setCameraError('');
    setScanFeedback('');

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
        setCameraError('Camera access not supported on this browser/environment.');
      }
    } catch (err: any) {
      console.warn('Camera access denied or unavailable:', err);
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

  const processQrCodeValue = (rawCode: string) => {
    const trimmed = rawCode.trim();
    setScanFeedback(`✨ Scanned code detected: "${trimmed}". Resolving...`);

    let tableNum = '';
    let roomNum = '';
    let hotelIdParam = '';
    let tokenParam = '';

    try {
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        const parsedUrl = new URL(trimmed);
        tableNum =
          parsedUrl.searchParams.get('table') ||
          parsedUrl.searchParams.get('tableNumber') ||
          parsedUrl.searchParams.get('tableId') ||
          (parsedUrl.searchParams.get('type') === 'table' ? parsedUrl.searchParams.get('id') || '' : '');
        roomNum =
          parsedUrl.searchParams.get('room') ||
          parsedUrl.searchParams.get('roomNumber') ||
          parsedUrl.searchParams.get('roomId') ||
          (parsedUrl.searchParams.get('type') === 'room' ? parsedUrl.searchParams.get('id') || '' : '');
        hotelIdParam = parsedUrl.searchParams.get('hotelId') || '';
        tokenParam = parsedUrl.searchParams.get('token') || parsedUrl.searchParams.get('qrToken') || '';
      }
    } catch {}

    if (!tableNum && !roomNum && trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsedJson = JSON.parse(trimmed);
        if (parsedJson.table || parsedJson.tableNumber) {
          tableNum = String(parsedJson.table || parsedJson.tableNumber);
        }
        if (parsedJson.room || parsedJson.roomNumber) {
          roomNum = String(parsedJson.room || parsedJson.roomNumber);
        }
        if (parsedJson.hotelId) hotelIdParam = String(parsedJson.hotelId);
        if (parsedJson.token) tokenParam = String(parsedJson.token);
      } catch {}
    }

    if (!tableNum && !roomNum) {
      if (mode === 'table' || trimmed.toUpperCase().startsWith('T-') || trimmed.toLowerCase().includes('table')) {
        tableNum = trimmed;
      } else {
        roomNum = trimmed;
      }
    }

    const hotelToUse = (hotelIdParam && hotels.find((h) => h.id === hotelIdParam)) || selectedHotel || hotels[0];

    setTimeout(() => {
      stopCamera();
      if (tableNum) {
        const formatted = tableNum.toUpperCase().startsWith('T-')
          ? tableNum.toUpperCase()
          : `T-${tableNum.replace(/[^0-9]/g, '').padStart(2, '0')}`;
        handleLaunchTable(formatted, hotelToUse);
      } else if (roomNum) {
        handleLaunchRoom(roomNum, hotelToUse, tokenParam || undefined);
      }
    }, 700);
  };

  const handleLaunchTable = (table: string, hotel = selectedHotel) => {
    if (!hotel) return;
    const finalTable = table.trim();
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

    if (onTableSelected) {
      onTableSelected(hotel, formatted);
      return;
    }
    const targetUrl = new URL(tablePortalBaseUrl, window.location.href);
    targetUrl.searchParams.set('hotelId', hotel.id);
    targetUrl.searchParams.set('table', formatted);
    window.location.href = targetUrl.toString();
  };

  const handleLaunchRoom = (room: string, hotel = selectedHotel, sessionToken?: string) => {
    if (!hotel) return;
    const finalRoom = room.trim();
    if (!finalRoom) {
      setValidationError('Please specify your Room Number or book a room from our catalog.');
      return;
    }
    setValidationError(null);

    if (sessionToken && typeof window !== 'undefined') {
      localStorage.setItem('spicehub_guest_session', sessionToken);
    }

    if (onRoomSelected) {
      onRoomSelected(hotel, finalRoom, sessionToken);
      return;
    }
    const targetUrl = new URL(roomPortalBaseUrl, window.location.href);
    targetUrl.searchParams.set('hotelId', hotel.id);
    targetUrl.searchParams.set('room', finalRoom);
    targetUrl.searchParams.set('tab', 'HOME');
    if (sessionToken) targetUrl.searchParams.set('token', sessionToken);
    window.location.href = targetUrl.toString();
  };

  const handleLaunchRoomCatalog = (hotel = selectedHotel) => {
    if (!hotel) return;
    if (onBookRoomRequested) {
      onBookRoomRequested(hotel);
      return;
    }
    const targetUrl = new URL(roomPortalBaseUrl, window.location.href);
    targetUrl.searchParams.set('hotelId', hotel.id);
    targetUrl.searchParams.set('tab', 'ROOMS');
    window.location.href = targetUrl.toString();
  };

  // Verify Resident Stay via Room Number & Registered Mobile
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
      setStayVerifyError('Please enter your registered mobile number.');
      return;
    }

    try {
      setIsVerifyingStay(true);
      setStayVerifyError(null);

      const res = await fetch(`${apiBaseUrl}/api/v1/guest-portal/stay/verify-resident`, {
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
        const { sessionToken, roomNumber } = json.data;
        handleLaunchRoom(roomNumber || rNum, selectedHotel, sessionToken);
      } else {
        setStayVerifyError(
          json.message ||
            `No active check-in found for Room ${rNum} with mobile ${phone}. If you have not checked in yet, please book a room from our catalog.`
        );
      }
    } catch (err: any) {
      setStayVerifyError(err.message || 'Verification network error. Please try again.');
    } finally {
      setIsVerifyingStay(false);
    }
  };

  const filteredHotels = hotels.filter(
    (h) =>
      h.name.toLowerCase().includes(hotelSearchQuery.toLowerCase()) ||
      (h.city && h.city.toLowerCase().includes(hotelSearchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col font-sans select-none">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-[#0d1424]/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-amber-500/20">
            S
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-white flex items-center gap-2">
              SpiceHub Guest Experience
            </h1>
            <p className="text-[11px] text-slate-400">Digital Dining & Room Services</p>
          </div>
        </div>

        {/* Selected Hotel Chip */}
        <button
          type="button"
          onClick={() => setIsHotelSelectorOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-amber-500/50 hover:bg-slate-800 transition text-xs font-semibold"
          data-testid="customer-hotel-selector-btn"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="max-w-[120px] sm:max-w-[180px] truncate text-slate-200">
            {selectedHotel?.name || (loadingHotels ? 'Loading Hotels...' : 'Select Hotel')}
          </span>
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        {/* Welcome Banner */}
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-[#0f172a] to-[#1e1b4b]/40 border border-slate-800/90 p-5 shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/30 mb-2">
              {selectedHotel?.city ? `📍 ${selectedHotel.city}` : '🏨 5-Star Hospitality'}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Welcome to {selectedHotel?.name || 'SpiceHub Luxury'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Order gourmet dishes to your dining table or request verified in-room services.
            </p>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4 pointer-events-none text-9xl">
            🍽️
          </div>
        </div>

        {/* Validation Error Alert */}
        {validationError && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-between">
            <span>⚠️ {validationError}</span>
            <button onClick={() => setValidationError(null)} className="text-rose-400 font-bold ml-2">✕</button>
          </div>
        )}

        {/* Step 1: Mode Selection (Dine-In Table Menu vs Room Stay) */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
            Choose Your Experience
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              data-testid="mode-table-btn"
              onClick={() => {
                setMode('table');
                setValidationError(null);
                setStayVerifyError(null);
              }}
              className={`p-4 rounded-2xl border text-left transition-all flex flex-col gap-2 min-h-[96px] ${
                mode === 'table'
                  ? 'border-amber-500/80 bg-amber-500/10 shadow-lg shadow-amber-500/10'
                  : 'border-slate-800 bg-slate-900/60 hover:bg-slate-850 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">🍽️</span>
                {mode === 'table' && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400" />
                )}
              </div>
              <div>
                <h3
                  className={`text-sm font-extrabold ${mode === 'table' ? 'text-amber-400' : 'text-slate-200'}`}
                >
                  Dine-In Table Menu
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Seated at restaurant or cafe</p>
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
              className={`p-4 rounded-2xl border text-left transition-all flex flex-col gap-2 min-h-[96px] ${
                mode === 'room'
                  ? 'border-blue-500/80 bg-blue-500/10 shadow-lg shadow-blue-500/10'
                  : 'border-slate-800 bg-slate-900/60 hover:bg-slate-850 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">🛎️</span>
                {mode === 'room' && (
                  <span className="w-2 h-2 rounded-full bg-blue-400 shadow-sm shadow-blue-400" />
                )}
              </div>
              <div>
                <h3
                  className={`text-sm font-extrabold ${mode === 'room' ? 'text-blue-400' : 'text-slate-200'}`}
                >
                  Room Stay Services
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">In-room dining & stay catalog</p>
              </div>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* VIEW A: DINE-IN TABLE MENU WORKFLOW                      */}
        {/* ======================================================== */}
        {mode === 'table' && (
          <div className="flex flex-col gap-5">
            {/* Camera QR Scanner Card */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 flex flex-col gap-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-sm font-bold">
                    📷
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">
                      Scan Table QR Standee
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Instantly binds your table session and opens the food menu
                    </p>
                  </div>
                </div>
                {isCameraActive && (
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="text-xs font-semibold text-rose-400 hover:text-rose-300 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20"
                  >
                    Close Camera
                  </button>
                )}
              </div>

              {isCameraActive ? (
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-amber-500/50 shadow-inner">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    <div className="w-48 h-48 border-2 border-amber-400/90 rounded-2xl relative animate-pulse shadow-2xl">
                      <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent top-1/2 -translate-y-1/2 shadow-lg shadow-amber-400" />
                    </div>
                    <span className="text-[11px] font-bold text-amber-200 mt-3 bg-black/60 px-3 py-1 rounded-full backdrop-blur-md">
                      Align Table QR code inside box
                    </span>
                  </div>
                  {scanFeedback && (
                    <div className="absolute inset-x-4 bottom-4 bg-emerald-950/90 border border-emerald-500/80 rounded-xl p-2.5 text-center text-xs font-bold text-emerald-200 backdrop-blur-md animate-bounce">
                      {scanFeedback}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  data-testid="start-camera-scan-btn"
                  onClick={startCamera}
                  className="min-h-[50px] rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2.5 transition active:scale-[0.99]"
                >
                  <span>📷</span>
                  <span>Scan Table QR Code</span>
                </button>
              )}

              {cameraError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  <span className="font-bold">Camera Notice: </span>
                  {cameraError}
                </div>
              )}
            </div>

            {/* Manual Table Number Input Form */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm">✍️</span>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Or Enter Table Number
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Type your table number printed on your table tent
                  </p>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleLaunchTable(tableInput);
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  data-testid="customer-manual-input"
                  value={tableInput}
                  onChange={(e) => setTableInput(e.target.value)}
                  placeholder="e.g. T-04, 5, Rooftop 2"
                  className="flex-1 min-h-[48px] rounded-xl bg-slate-950 border border-slate-700 px-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  data-testid="customer-manual-submit-btn"
                  className="min-h-[48px] px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-amber-500/20 shrink-0 flex items-center justify-center"
                >
                  Open Menu
                </button>
              </form>

              {/* Dynamic Hotel Dining Tables */}
              {hotelTables.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center justify-between">
                    <span>Active Tables at {selectedHotel?.name}:</span>
                    {loadingTables && <span className="text-[10px] text-amber-400">Refreshing...</span>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {hotelTables.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setTableInput(t.tableNumber);
                          handleLaunchTable(t.tableNumber);
                        }}
                        className="min-h-[38px] px-3.5 rounded-xl border border-slate-800 bg-slate-900/90 hover:bg-amber-500/20 hover:border-amber-500/40 text-xs font-bold text-slate-300 hover:text-amber-400 transition"
                      >
                        {t.tableNumber} {t.section ? `(${t.section})` : ''}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW B: STRUCTURED ROOM STAY EXPERIENCE                  */}
        {/* ======================================================== */}
        {mode === 'room' && (
          <div className="flex flex-col gap-4">
            {/* Room Flow Sub-Selector Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-900 border border-slate-800">
              <button
                type="button"
                data-testid="room-subtab-resident"
                onClick={() => {
                  setRoomFlowType('resident');
                  setStayVerifyError(null);
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  roomFlowType === 'resident'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <span>🔑</span>
                <span>I Have a Room (In-Stay)</span>
              </button>
              <button
                type="button"
                data-testid="room-subtab-booking"
                onClick={() => {
                  setRoomFlowType('booking');
                  setStayVerifyError(null);
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  roomFlowType === 'booking'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <span>🛏️</span>
                <span>Book a Room (Catalog)</span>
              </button>
            </div>

            {/* FLOW 1: IN-ROOM RESIDENT GUEST VERIFICATION */}
            {roomFlowType === 'resident' && (
              <div className="flex flex-col gap-4">
                {/* Camera Scanner for In-Room QR Code */}
                <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 flex flex-col gap-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 text-sm font-bold">
                        📷
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-white">
                          Scan In-Room QR Standee
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Scan the QR placed on your bedside table or keycard holder
                        </p>
                      </div>
                    </div>
                    {isCameraActive && (
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="text-xs font-semibold text-rose-400 hover:text-rose-300 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20"
                      >
                        Close Camera
                      </button>
                    )}
                  </div>

                  {isCameraActive ? (
                    <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-blue-500/50 shadow-inner">
                      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                        <div className="w-48 h-48 border-2 border-blue-400/90 rounded-2xl relative animate-pulse shadow-2xl">
                          <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent top-1/2 -translate-y-1/2 shadow-lg shadow-blue-400" />
                        </div>
                        <span className="text-[11px] font-bold text-blue-200 mt-3 bg-black/60 px-3 py-1 rounded-full backdrop-blur-md">
                          Align In-Room QR Code inside box
                        </span>
                      </div>
                      {scanFeedback && (
                        <div className="absolute inset-x-4 bottom-4 bg-emerald-950/90 border border-emerald-500/80 rounded-xl p-2.5 text-center text-xs font-bold text-emerald-200 backdrop-blur-md animate-bounce">
                          {scanFeedback}
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      data-testid="start-room-camera-scan-btn"
                      onClick={startCamera}
                      className="min-h-[50px] rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm tracking-wide shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2.5 transition active:scale-[0.99]"
                    >
                      <span>📷</span>
                      <span>Scan In-Room QR Code</span>
                    </button>
                  )}
                </div>

                {/* Resident Verification: Room # + Phone Number */}
                <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col gap-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <span>🔑</span>
                      <span>Verify Checked-In Room Stay</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Enter your room number and the mobile number registered at check-in
                    </p>
                  </div>

                  {stayVerifyError && (
                    <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex flex-col gap-2">
                      <div className="flex items-start gap-2">
                        <span>⚠️</span>
                        <span>{stayVerifyError}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setRoomFlowType('booking');
                          setStayVerifyError(null);
                        }}
                        className="self-start text-[11px] font-bold text-amber-400 underline hover:text-amber-300"
                      >
                        👉 Explore available rooms from hotel catalog instead
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleVerifyResidentStay} className="flex flex-col gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">
                          Room Number
                        </label>
                        <input
                          type="text"
                          data-testid="resident-room-input"
                          value={roomNumberInput}
                          onChange={(e) => setRoomNumberInput(e.target.value)}
                          placeholder="e.g. 201, 305, 412"
                          className="w-full min-h-[44px] rounded-xl bg-slate-950 border border-slate-700 px-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">
                          Registered Phone Number
                        </label>
                        <input
                          type="tel"
                          data-testid="resident-phone-input"
                          value={guestPhoneInput}
                          onChange={(e) => setGuestPhoneInput(e.target.value)}
                          placeholder="e.g. 9820011223"
                          className="w-full min-h-[44px] rounded-xl bg-slate-950 border border-slate-700 px-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-400"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isVerifyingStay}
                      data-testid="resident-verify-stay-btn"
                      className="min-h-[48px] rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider transition shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                    >
                      {isVerifyingStay ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Verifying with Front Desk...</span>
                        </>
                      ) : (
                        <>
                          <span>🔓</span>
                          <span>Verify Stay & Enter Room Portal</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* FLOW 2: BOOK A ROOM VIA LIVE CATALOG & KYC */}
            {roomFlowType === 'booking' && (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col gap-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-lg font-bold">
                    🛏️
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">
                      Live Hotel Room Inventory & Booking
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Real room availability statuses with transparent tariffs & Aadhaar KYC
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>Live Operational Statuses (Available, Cleaning Turnaround, Occupied)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>Dynamic Check-in Dates & Multi-Night Tariff Calculation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>GPS Property Proximity Check (Walk-in vs Advance Online Booking)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>Aadhaar / Government ID KYC Verification & Couple Stay Friendly</span>
                  </div>
                </div>

                <button
                  type="button"
                  data-testid="open-room-catalog-btn"
                  onClick={() => handleLaunchRoomCatalog(selectedHotel)}
                  className="min-h-[50px] rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition active:scale-[0.99]"
                >
                  <span>🏨</span>
                  <span>Explore Available Rooms & Book Now</span>
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Hotel Selector Modal */}
      {isHotelSelectorOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
        >
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-[#0d1424] p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-black text-white">Select Hotel Property</h3>
                <p className="text-xs text-slate-400">Available active properties on SpiceHub</p>
              </div>
              <button
                type="button"
                onClick={() => setIsHotelSelectorOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            {/* Search Input */}
            <div>
              <input
                type="text"
                value={hotelSearchQuery}
                onChange={(e) => setHotelSearchQuery(e.target.value)}
                placeholder="Search hotel name or city..."
                className="w-full min-h-[44px] rounded-xl bg-slate-900 border border-slate-700 px-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Hotel Cards List */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
              {filteredHotels.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">No hotels match your search.</div>
              ) : (
                filteredHotels.map((h) => {
                  const isSelected = selectedHotel?.id === h.id;
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => handleSelectHotel(h)}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-amber-500/80 bg-amber-500/10'
                          : 'border-slate-800 bg-slate-900/60 hover:bg-slate-850 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400 text-sm">
                          🏨
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{h.name}</div>
                          <div className="text-[11px] text-slate-400">
                            {h.city ? `📍 ${h.city}` : 'SpiceHub Premier'}
                          </div>
                        </div>
                      </div>
                      {isSelected && <span className="text-amber-400 text-sm font-bold">✓</span>}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
