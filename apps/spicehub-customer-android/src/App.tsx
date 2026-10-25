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
  const [manualInput, setManualInput] = useState('');

  // Scanner state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scanMessage, setScanMessage] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Active workstation iframe
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
        launchRoom(parsedRoom, hotel);
      }
    }, 600);
  };

  const launchTable = (tbl: string, hotel = selectedHotel) => {
    if (!hotel) return;
    const formatted = tbl.toUpperCase().startsWith('T-')
      ? tbl.toUpperCase()
      : `T-${tbl.replace(/[^0-9]/g, '').padStart(2, '0') || '04'}`;

    const url = new URL(TABLE_PORTAL_BASE);
    url.searchParams.set('hotelId', hotel.id);
    url.searchParams.set('table', formatted);

    setActiveSessionLabel(`${hotel.name} • Table ${formatted}`);
    setActivePortalUrl(url.toString());
  };

  const launchRoom = (rm: string, hotel = selectedHotel) => {
    if (!hotel) return;
    const formatted = rm.trim() || '305';

    const url = new URL(ROOM_PORTAL_BASE);
    url.searchParams.set('hotelId', hotel.id);
    url.searchParams.set('room', formatted);

    setActiveSessionLabel(`${hotel.name} • Room ${formatted}`);
    setActivePortalUrl(url.toString());
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
              🏠 Switch Table / Hotel
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
            Order fresh meals directly to your table or request in-room hotel services.
          </p>
        </div>

        {/* Mode Selector */}
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Select Service Type
          </span>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode('table')}
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
              onClick={() => setMode('room')}
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
                  Room Stay Portal
                </h3>
                <p className="text-[10px] text-slate-400">In-Room Dining & Needs</p>
              </div>
            </button>
          </div>
        </div>

        {/* Camera QR Scanner */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5 flex flex-col gap-3.5 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">📷</span>
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider">
                  Scan Table or Room QR
                </h3>
                <p className="text-[10px] text-slate-400">
                  Scan the physical code on your {mode === 'table' ? 'table tent' : 'room keycard'}
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

          {/* Instant QR Simulation shortcuts */}
          <div className="pt-2 border-t border-slate-800/80">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1.5">
              ⚡ Instant QR Probes:
            </span>
            <div className="flex flex-wrap gap-2">
              {mode === 'table' ? (
                <>
                  <button
                    type="button"
                    onClick={() => processScannedValue('T-04')}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700"
                  >
                    Scan T-04
                  </button>
                  <button
                    type="button"
                    onClick={() => processScannedValue('T-01')}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700"
                  >
                    Scan T-01
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => processScannedValue('305')}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700"
                  >
                    Scan Room 305
                  </button>
                  <button
                    type="button"
                    onClick={() => processScannedValue('102')}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700"
                  >
                    Scan Room 102
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Manual Fallback Entry */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">✍️</span>
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Manual {mode === 'table' ? 'Table Number' : 'Room Number'} Entry
              </h3>
              <p className="text-[10px] text-slate-400">
                Type number directly if you prefer not to scan
              </p>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (mode === 'table') launchTable(manualInput || 'T-04');
              else launchRoom(manualInput || '305');
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder={mode === 'table' ? 'e.g. T-04 or 4' : 'e.g. 305'}
              className="flex-1 min-h-[44px] rounded-xl bg-slate-950 border border-slate-700 px-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              className={`min-h-[44px] px-5 rounded-xl font-black text-xs uppercase tracking-wider transition ${
                mode === 'table'
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              {mode === 'table' ? 'Open Menu' : 'Open Room'}
            </button>
          </form>

          {/* Quick chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {(mode === 'table' ? ['T-01', 'T-02', 'T-04', 'T-07', 'T-10'] : ['101', '102', '204', '305', '402']).map(
              (chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    setManualInput(chip);
                    if (mode === 'table') launchTable(chip);
                    else launchRoom(chip);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  {mode === 'table' ? `Table ${chip}` : `Room ${chip}`}
                </button>
              )
            )}
          </div>
        </div>
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
            <div className="flex-1 overflow-y-auto flex flex-col gap-2">
              {filteredHotels.map((h) => {
                const isSelected = selectedHotel?.id === h.id;
                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => {
                      setSelectedHotel(h);
                      setIsHotelModalOpen(false);
                    }}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between text-xs ${
                      isSelected
                        ? 'border-amber-500/80 bg-amber-500/10 font-bold'
                        : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-white">{h.name}</div>
                      <div className="text-[10px] text-slate-400">{h.city ? `📍 ${h.city}` : 'SpiceHub'}</div>
                    </div>
                    {isSelected && <span className="text-amber-400">✓</span>}
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
