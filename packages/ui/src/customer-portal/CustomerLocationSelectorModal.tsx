import React, { useState, useEffect, useRef } from 'react';

export interface CustomerLocationSelectorModalProps {
  isOpen: boolean;
  currentApp: 'customer' | 'guest';
  apiBaseUrl?: string;
  tablePortalUrl?: string;
  roomPortalUrl?: string;
  hotelId?: string;
  onSelectTable?: (tableNumber: string) => void;
  onSelectRoom?: (roomNumber: string, sessionToken?: string) => void;
  onSelectDemoTable?: () => void;
  onSelectDemoRoom?: () => void;
  onClose?: () => void;
}

export const CustomerLocationSelectorModal: React.FC<CustomerLocationSelectorModalProps> = ({
  isOpen,
  currentApp,
  apiBaseUrl = 'http://localhost:5000',
  tablePortalUrl = 'http://localhost:3001',
  roomPortalUrl = 'http://localhost:3004',
  hotelId,
  onSelectTable,
  onSelectRoom,
}) => {
  const [selectedMode, setSelectedMode] = useState<'table' | 'room'>(
    currentApp === 'guest' ? 'room' : 'table'
  );
  const [tableInput, setTableInput] = useState('');
  const [roomFlow, setRoomFlow] = useState<'resident' | 'booking'>('resident');
  const [roomNumberInput, setRoomNumberInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isVerifyingResident, setIsVerifyingResident] = useState(false);
  const [residentError, setResidentError] = useState<string | null>(null);

  // In-app Camera QR Scanner
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanMessage, setScanMessage] = useState<string>('');
  const [cameraError, setCameraError] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Lock body scroll when modal is active
  useEffect(() => {
    if (isOpen && typeof document !== 'undefined') {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startCameraScanner = async () => {
    setIsScanning(true);
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
        setCameraError('Camera API not accessible on this device.');
      }
    } catch (err: any) {
      setCameraError(err.message || 'Camera permission denied or camera not found.');
    }
  };

  const stopCameraScanner = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
    setCameraError('');
  };

  const handleScannedResult = (val: string) => {
    setScanMessage(`✨ Detected: ${val}`);
    const target = val.trim();
    let tbl = '';
    let rm = '';
    let token = '';

    try {
      if (target.startsWith('http://') || target.startsWith('https://')) {
        const parsed = new URL(target);
        tbl =
          parsed.searchParams.get('table') ||
          parsed.searchParams.get('tableNumber') ||
          (parsed.searchParams.get('type') === 'table' ? parsed.searchParams.get('id') || '' : '');
        rm =
          parsed.searchParams.get('room') ||
          parsed.searchParams.get('roomNumber') ||
          (parsed.searchParams.get('type') === 'room' ? parsed.searchParams.get('id') || '' : '');
        token = parsed.searchParams.get('token') || parsed.searchParams.get('qrToken') || '';
      }
    } catch {}

    if (!tbl && !rm) {
      if (selectedMode === 'table') tbl = target;
      else rm = target;
    }

    setTimeout(() => {
      stopCameraScanner();
      if (tbl) {
        const numOnly = tbl.replace(/[^0-9]/g, '');
        const formatted = tbl.toUpperCase().startsWith('T-')
          ? tbl.toUpperCase()
          : numOnly
          ? `T-${numOnly.padStart(2, '0')}`
          : tbl;

        if (currentApp === 'customer' && onSelectTable) onSelectTable(formatted);
        else {
          const dest = new URL(tablePortalUrl, window.location.href);
          dest.searchParams.set('table', formatted);
          window.location.href = dest.toString();
        }
      } else if (rm) {
        if (token && typeof window !== 'undefined') {
          localStorage.setItem('spicehub_guest_session', token);
        }
        if (currentApp === 'guest' && onSelectRoom) onSelectRoom(rm, token || undefined);
        else {
          const dest = new URL(roomPortalUrl, window.location.href);
          dest.searchParams.set('room', rm);
          dest.searchParams.set('tab', 'HOME');
          if (token) dest.searchParams.set('token', token);
          window.location.href = dest.toString();
        }
      }
    }, 600);
  };

  if (!isOpen) return null;

  const handleTableSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = tableInput.trim();
    if (!raw) {
      setValidationError('Please enter a valid table number.');
      return;
    }
    setValidationError(null);

    const numOnly = raw.replace(/[^0-9]/g, '');
    const formatted = raw.toUpperCase().startsWith('T-')
      ? raw.toUpperCase()
      : numOnly
      ? `T-${numOnly.padStart(2, '0')}`
      : raw;

    if (currentApp === 'customer' && onSelectTable) {
      onSelectTable(formatted);
    } else {
      const target = new URL(tablePortalUrl, window.location.href);
      target.searchParams.set('table', formatted);
      window.location.href = target.toString();
    }
  };

  const handleVerifyResidentStay = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const rNum = roomNumberInput.trim();
    const phone = phoneInput.trim();

    if (!rNum) {
      setResidentError('Please enter your room number.');
      return;
    }
    if (!phone) {
      setResidentError('Please enter your registered mobile number.');
      return;
    }

    try {
      setIsVerifyingResident(true);
      setResidentError(null);

      const base = apiBaseUrl.replace(/\/api\/v1\/?$/, '');
      const res = await fetch(`${base}/api/v1/guest-portal/stay/verify-resident`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId: hotelId || 'demo-hotel-id',
          roomNumber: rNum,
          guestPhone: phone,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success && json.data) {
        const { sessionToken, roomNumber } = json.data;
        if (sessionToken && typeof window !== 'undefined') {
          localStorage.setItem('spicehub_guest_session', sessionToken);
        }
        if (currentApp === 'guest' && onSelectRoom) {
          onSelectRoom(roomNumber || rNum, sessionToken);
        } else {
          const dest = new URL(roomPortalUrl, window.location.href);
          dest.searchParams.set('room', roomNumber || rNum);
          dest.searchParams.set('tab', 'HOME');
          if (sessionToken) dest.searchParams.set('token', sessionToken);
          window.location.href = dest.toString();
        }
      } else {
        setResidentError(
          json.message ||
            `No active check-in found for Room ${rNum} with mobile ${phone}. If you wish to stay, please book a room from our catalog.`
        );
      }
    } catch (err: any) {
      setResidentError(err.message || 'Verification network error.');
    } finally {
      setIsVerifyingResident(false);
    }
  };

  const handleOpenRoomCatalog = () => {
    const dest = new URL(roomPortalUrl, window.location.href);
    dest.searchParams.set('tab', 'ROOMS');
    if (hotelId) dest.searchParams.set('hotelId', hotelId);
    window.location.href = dest.toString();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="selector-heading"
      data-testid="customer-location-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto"
    >
      <div className="w-full max-w-lg my-auto rounded-3xl border border-slate-800 bg-[#0c101a] p-5 sm:p-7 shadow-2xl text-slate-100 flex flex-col gap-5">
        {/* Header */}
        <div className="text-center flex flex-col items-center gap-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
              />
            </svg>
          </div>
          <div>
            <span className="text-[10px] font-bold tracking-widest uppercase text-amber-400">
              SpiceHub Hospitality Suite
            </span>
            <h2 id="selector-heading" className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
              Select Your Guest Session
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Please choose whether you are dining at a restaurant table or staying in a guest room.
            </p>
          </div>
        </div>

        {validationError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
            ⚠️ {validationError}
          </div>
        )}

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-900/90 border border-slate-800">
          <button
            type="button"
            data-testid="mode-tab-table"
            onClick={() => {
              setSelectedMode('table');
              setValidationError(null);
            }}
            className={`min-h-[44px] flex items-center justify-center gap-2 rounded-xl text-xs sm:text-sm font-bold transition-all px-3 ${
              selectedMode === 'table'
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <span>🍽️</span>
            <span>Dining at a Table</span>
          </button>
          <button
            type="button"
            data-testid="mode-tab-room"
            onClick={() => {
              setSelectedMode('room');
              setValidationError(null);
            }}
            className={`min-h-[44px] flex items-center justify-center gap-2 rounded-xl text-xs sm:text-sm font-bold transition-all px-3 ${
              selectedMode === 'room'
                ? 'bg-blue-600 text-white shadow-md font-extrabold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <span>🛎️</span>
            <span>Staying in a Room</span>
          </button>
        </div>

        {/* Camera QR Scanner Bar */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3.5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">📷</span>
              <div>
                <div className="text-xs font-black text-white">
                  Scan {selectedMode === 'table' ? 'Table' : 'In-Room'} QR Code
                </div>
                <div className="text-[10px] text-slate-400">
                  Instantly authenticates and opens your {selectedMode === 'table' ? 'menu' : 'room portal'}
                </div>
              </div>
            </div>
            {isScanning && (
              <button
                type="button"
                onClick={stopCameraScanner}
                className="text-[11px] font-bold text-rose-400 px-2 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/20"
              >
                Close Camera
              </button>
            )}
          </div>

          {isScanning ? (
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-amber-500/50">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                <div className="w-36 h-36 border-2 border-amber-400/90 rounded-xl relative animate-pulse">
                  <div className="absolute left-0 right-0 h-0.5 bg-amber-400 top-1/2 -translate-y-1/2" />
                </div>
                <span className="text-[10px] font-bold text-amber-200 mt-2 bg-black/60 px-2 py-0.5 rounded-full">
                  Align QR code inside box
                </span>
              </div>
              {scanMessage && (
                <div className="absolute inset-x-2 bottom-2 bg-emerald-950/90 border border-emerald-500/80 rounded-lg p-1.5 text-center text-xs font-bold text-emerald-200">
                  {scanMessage}
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              data-testid="camera-qr-scanner-btn"
              onClick={startCameraScanner}
              className="min-h-[44px] px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition"
            >
              <span>📷</span>
              <span>Open Camera Scanner</span>
            </button>
          )}

          {cameraError && (
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px]">
              {cameraError}
            </div>
          )}
        </div>

        {/* Dynamic Form Content */}
        {selectedMode === 'table' ? (
          <form onSubmit={handleTableSubmit} className="flex flex-col gap-3">
            <div>
              <label htmlFor="table-number-input" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Enter your Table Number:
              </label>
              <div className="flex gap-2">
                <input
                  id="table-number-input"
                  type="text"
                  value={tableInput}
                  onChange={(e) => setTableInput(e.target.value)}
                  placeholder="e.g. T-04, 5, Rooftop 2"
                  className="flex-1 min-h-[44px] rounded-xl bg-slate-900 border border-slate-700 px-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  className="min-h-[44px] px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-lg shrink-0 flex items-center justify-center"
                >
                  Open Menu
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-3.5">
            {/* Room Sub-Selector Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-900 border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setRoomFlow('resident');
                  setResidentError(null);
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                  roomFlow === 'resident' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🔑</span>
                <span>Resident Guest</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRoomFlow('booking');
                  setResidentError(null);
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                  roomFlow === 'booking' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🛏️</span>
                <span>Book a Room</span>
              </button>
            </div>

            {roomFlow === 'resident' ? (
              <form onSubmit={handleVerifyResidentStay} className="flex flex-col gap-2.5">
                {residentError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                    ⚠️ {residentError}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Room Number:
                    </label>
                    <input
                      id="room-number-input"
                      type="text"
                      value={roomNumberInput}
                      onChange={(e) => setRoomNumberInput(e.target.value)}
                      placeholder="e.g. 101, 204"
                      className="w-full min-h-[42px] rounded-xl bg-slate-900 border border-slate-700 px-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Registered Mobile:
                    </label>
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="e.g. 9820011223"
                      className="w-full min-h-[42px] rounded-xl bg-slate-900 border border-slate-700 px-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isVerifyingResident}
                  className="min-h-[44px] px-5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider transition shadow-lg shrink-0 flex items-center justify-center gap-2 mt-1"
                >
                  {isVerifyingResident ? 'Verifying Stay...' : 'Verify Stay & Enter Room'}
                </button>
              </form>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col gap-3">
                <div className="text-xs text-slate-300">
                  Explore real-time room availability, live multi-night tariffs, GPS check, and instant Aadhaar KYC booking.
                </div>
                <button
                  type="button"
                  onClick={handleOpenRoomCatalog}
                  className="min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-1.5"
                >
                  <span>🏨</span>
                  <span>Explore Available Rooms & Book Now</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
