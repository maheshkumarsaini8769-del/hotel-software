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
  onRoomSelected?: (hotel: ActiveHotel, roomNumber: string) => void;
  initialMode?: 'table' | 'room';
}

export const CustomerUniversalHub: React.FC<CustomerUniversalHubProps> = ({
  apiBaseUrl = 'http://localhost:5000',
  tablePortalBaseUrl = 'http://localhost:3001',
  roomPortalBaseUrl = 'http://localhost:3004',
  onTableSelected,
  onRoomSelected,
  initialMode = 'table',
}) => {
  const [hotels, setHotels] = useState<ActiveHotel[]>([]);
  const [selectedHotel, setSelectedHotel] = useState<ActiveHotel | null>(null);
  const [hotelSearchQuery, setHotelSearchQuery] = useState('');
  const [isHotelSelectorOpen, setIsHotelSelectorOpen] = useState(false);
  const [loadingHotels, setLoadingHotels] = useState(true);

  const [mode, setMode] = useState<'table' | 'room'>(initialMode);
  const [manualInput, setManualInput] = useState('');

  // Scanner state
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

            // Restore previously selected hotel if saved
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

      // Fallback fallback hotel if offline or API unreachable
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

  // Clean up camera stream on unmount or when camera turns off
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
    setScanFeedback(`✨ Scanned code: "${trimmed}". Binding session...`);

    // Try parsing as URL first
    let tableNum = '';
    let roomNum = '';
    let hotelIdParam = '';

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
      }
    } catch {
      // Not a valid URL, treat as raw text
    }

    // JSON payload check: {"table":"T-04","hotelId":"..."}
    if (!tableNum && !roomNum && trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsedJson = JSON.parse(trimmed);
        if (parsedJson.table || parsedJson.tableNumber) {
          tableNum = String(parsedJson.table || parsedJson.tableNumber);
        }
        if (parsedJson.room || parsedJson.roomNumber) {
          roomNum = String(parsedJson.room || parsedJson.roomNumber);
        }
        if (parsedJson.hotelId) {
          hotelIdParam = String(parsedJson.hotelId);
        }
      } catch {}
    }

    // Direct string check: T-04 or 102
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
        handleLaunchRoom(roomNum, hotelToUse);
      }
    }, 700);
  };

  const handleLaunchTable = (table: string, hotel = selectedHotel) => {
    if (!hotel) return;
    const finalTable = table.trim() || 'T-04';
    if (onTableSelected) {
      onTableSelected(hotel, finalTable);
      return;
    }
    // Launch Table Portal with hotel and table params
    const targetUrl = new URL(tablePortalBaseUrl, window.location.href);
    targetUrl.searchParams.set('hotelId', hotel.id);
    targetUrl.searchParams.set('table', finalTable);
    window.location.href = targetUrl.toString();
  };

  const handleLaunchRoom = (room: string, hotel = selectedHotel) => {
    if (!hotel) return;
    const finalRoom = room.trim() || '305';
    if (onRoomSelected) {
      onRoomSelected(hotel, finalRoom);
      return;
    }
    // Launch Room Portal with hotel and room params
    const targetUrl = new URL(roomPortalBaseUrl, window.location.href);
    targetUrl.searchParams.set('hotelId', hotel.id);
    targetUrl.searchParams.set('room', finalRoom);
    window.location.href = targetUrl.toString();
  };

  const filteredHotels = hotels.filter(
    (h) =>
      h.name.toLowerCase().includes(hotelSearchQuery.toLowerCase()) ||
      (h.city && h.city.toLowerCase().includes(hotelSearchQuery.toLowerCase()))
  );

  const quickTables = ['T-01', 'T-02', 'T-04', 'T-07', 'T-10', 'T-12'];
  const quickRooms = ['101', '102', '204', '305', '402', '501'];

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col font-sans select-none">
      {/* Top Navbar */}
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
              Order gourmet dishes to your dining table or request room services right from your phone.
            </p>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4 pointer-events-none text-9xl">
            🍽️
          </div>
        </div>

        {/* Step 1: Mode Selection (Dine-In Table Menu vs Room Stay) */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
            Choose Your Experience
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              data-testid="mode-table-btn"
              onClick={() => setMode('table')}
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
              onClick={() => setMode('room')}
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
                  Room Stay Portal
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">In-room dining & amenities</p>
              </div>
            </button>
          </div>
        </div>

        {/* Primary Action: Built-In Camera QR Scanner */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-sm font-bold">
                📷
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  Scan Physical QR Code
                </h3>
                <p className="text-[11px] text-slate-400">
                  Point camera at the QR on your {mode === 'table' ? 'table stand' : 'room keycard'}
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

          {/* Camera Viewfinder */}
          {isCameraActive ? (
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-amber-500/50 shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Overlay QR Scanner Reticle */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                <div className="w-48 h-48 border-2 border-amber-400/90 rounded-2xl relative animate-pulse shadow-2xl">
                  {/* Scanning beam line */}
                  <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent top-1/2 -translate-y-1/2 shadow-lg shadow-amber-400" />
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-amber-300" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-amber-300" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-amber-300" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-amber-300" />
                </div>
                <span className="text-[11px] font-bold text-amber-200 mt-3 bg-black/60 px-3 py-1 rounded-full backdrop-blur-md">
                  Align QR Code inside box
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
              <span>Open Camera QR Scanner</span>
            </button>
          )}

          {cameraError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              <span className="font-bold">Camera Notice: </span>
              {cameraError}
            </div>
          )}

          {/* Quick Emulator / Direct Scan Simulator Buttons for Testing */}
          <div className="pt-2 border-t border-slate-800/80">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-2">
              ⚡ Instant Quick Scan Probes:
            </span>
            <div className="flex flex-wrap gap-2">
              {mode === 'table' ? (
                <>
                  <button
                    type="button"
                    data-testid="quick-scan-t04"
                    onClick={() => processQrCodeValue('T-04')}
                    className="text-xs px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-amber-500/20 border border-slate-700 hover:border-amber-500/40 text-slate-200 font-semibold transition"
                  >
                    Simulate Scan: Table T-04
                  </button>
                  <button
                    type="button"
                    onClick={() => processQrCodeValue('T-01')}
                    className="text-xs px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-amber-500/20 border border-slate-700 hover:border-amber-500/40 text-slate-200 font-semibold transition"
                  >
                    Simulate Scan: Table T-01
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    data-testid="quick-scan-r305"
                    onClick={() => processQrCodeValue('305')}
                    className="text-xs px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-blue-500/20 border border-slate-700 hover:border-blue-500/40 text-slate-200 font-semibold transition"
                  >
                    Simulate Scan: Room 305
                  </button>
                  <button
                    type="button"
                    onClick={() => processQrCodeValue('102')}
                    className="text-xs px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-blue-500/20 border border-slate-700 hover:border-blue-500/40 text-slate-200 font-semibold transition"
                  >
                    Simulate Scan: Room 102
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Fallback Option: Manual Number Entry */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm">✍️</span>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Or Enter {mode === 'table' ? 'Table Number' : 'Room Number'} Manually
              </h3>
              <p className="text-[11px] text-slate-400">
                {mode === 'table'
                  ? "Don't wish to scan? Type your table number printed on the table tent."
                  : 'Enter your assigned guest room number.'}
              </p>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (mode === 'table') {
                handleLaunchTable(manualInput || 'T-04');
              } else {
                handleLaunchRoom(manualInput || '305');
              }
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              data-testid="customer-manual-input"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder={mode === 'table' ? 'e.g. T-04 or 4' : 'e.g. 305 or 102'}
              className="flex-1 min-h-[48px] rounded-xl bg-slate-950 border border-slate-700 px-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              data-testid="customer-manual-submit-btn"
              className={`min-h-[48px] px-6 rounded-xl font-black text-xs uppercase tracking-wider transition shadow-lg shrink-0 flex items-center justify-center ${
                mode === 'table'
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
              }`}
            >
              {mode === 'table' ? 'Open Menu' : 'Open Room'}
            </button>
          </form>

          {/* Quick Selection Chips */}
          <div>
            <div className="text-[11px] font-semibold text-slate-400 mb-2">
              Popular {mode === 'table' ? 'Dining Tables' : 'Guest Rooms'}:
            </div>
            <div className="flex flex-wrap gap-2">
              {(mode === 'table' ? quickTables : quickRooms).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setManualInput(item);
                    if (mode === 'table') handleLaunchTable(item);
                    else handleLaunchRoom(item);
                  }}
                  className="min-h-[38px] px-3.5 rounded-xl border border-slate-800 bg-slate-900/90 hover:bg-slate-800 hover:border-slate-700 text-xs font-bold text-slate-300 hover:text-white transition"
                >
                  {mode === 'table' ? `Table ${item}` : `Room ${item}`}
                </button>
              ))}
            </div>
          </div>
        </div>
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
