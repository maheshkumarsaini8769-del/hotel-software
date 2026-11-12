import React, { useState, useEffect, useRef } from 'react';
import { Utensils, Bell, Camera, Key, BedDouble, Hotel, AlertCircle, MapPin, ExternalLink } from 'lucide-react';

export interface CustomerLocationSelectorModalProps {
  isOpen: boolean;
  currentApp: 'customer' | 'guest';
  apiBaseUrl?: string;
  tablePortalUrl?: string;
  roomPortalUrl?: string;
  hotelId?: string;
  hotelLocation?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
    googleMapUrl?: string;
  };
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
  hotelLocation,
  onSelectTable,
  onSelectRoom,
  onClose,
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
  const [activeLocation, setActiveLocation] = useState(hotelLocation);

  useEffect(() => {
    if (hotelLocation) {
      setActiveLocation(hotelLocation);
      return;
    }
    if (isOpen) {
      fetch(`${apiBaseUrl}/api/v1/auth/active-hotels`)
        .then((r) => r.json())
        .then((res) => {
          if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
            const h = hotelId ? res.data.find((item: any) => item.id === hotelId) || res.data[0] : res.data[0];
            if (h) {
              setActiveLocation({
                street: h.street || h.address?.street || '',
                city: h.city || h.address?.city || 'Jaipur',
                state: h.state || h.address?.state || 'Rajasthan',
                country: h.country || h.address?.country || 'India',
                pincode: h.pincode || h.address?.pincode || '',
                googleMapUrl: h.googleMapUrl,
              });
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen, hotelId, hotelLocation, apiBaseUrl]);

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

  useEffect(() => {
    let animId: number | null = null;
    let detector: any = null;
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      } catch {}
    }

    const checkFrame = async () => {
      if (!isScanning) return;
      const video = videoRef.current;
      if (video && video.readyState >= 2 && detector) {
        try {
          const codes = await detector.detect(video);
          if (codes && codes.length > 0 && codes[0].rawValue) {
            handleScannedResult(codes[0].rawValue);
            return;
          }
        } catch {}
      }
      if (isScanning) {
        animId = requestAnimationFrame(checkFrame);
      }
    };

    if (isScanning) {
      animId = requestAnimationFrame(checkFrame);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isScanning]);

  const stopCameraScanner = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
    setCameraError('');
  };

  const handleScannedResult = (val: string) => {
    setScanMessage(`Detected: ${val}`);
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
    const phoneOrName = phoneInput.trim();

    if (!rNum) {
      setResidentError('Please enter your room number.');
      return;
    }
    if (!phoneOrName) {
      setResidentError('Please enter your registered mobile number or guest last name.');
      return;
    }

    try {
      setIsVerifyingResident(true);
      setResidentError(null);

      const base = apiBaseUrl.replace(/\/api\/v1\/?$/, '');
      const isDigitsOnly = /^[0-9+\s()-]+$/.test(phoneOrName);
      const res = await fetch(`${base}/api/v1/guest-portal/stay/verify-resident`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId: hotelId || 'demo-hotel-id',
          roomNumber: rNum,
          guestPhone: isDigitsOnly ? phoneOrName : undefined,
          lastName: phoneOrName,
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
            `No active check-in found for Room ${rNum} with credentials ${phoneOrName}. If you wish to stay, please book a room from our catalog.`
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="w-full max-w-lg my-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-2xl text-slate-800 dark:text-slate-100 flex flex-col gap-5 relative transition-all">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close session selector"
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <AlertCircle className="w-5 h-5 hidden" />
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Header */}
        <div className="text-center flex flex-col items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold tracking-wider uppercase">
            <span>SpiceHub Hospitality Suite</span>
          </div>
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 shadow-xs">
            {selectedMode === 'table' ? (
              <Utensils className="w-6 h-6" />
            ) : (
              <Hotel className="w-6 h-6" />
            )}
          </div>
          <div>
            <h2 id="selector-heading" className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
              Select Your Guest Session
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Please choose whether you are dining at a restaurant table or staying in a guest room.
            </p>
            {activeLocation?.city && (
              <div data-testid="modal-verified-hotel-location" className="inline-flex items-center gap-1.5 px-3 py-1 mt-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{activeLocation.street ? `${activeLocation.street}, ` : ''}{activeLocation.city}, {activeLocation.state}{activeLocation.pincode ? ` - ${activeLocation.pincode}` : ''}</span>
                {activeLocation.googleMapUrl && (
                  <a href={activeLocation.googleMapUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold ml-1 flex items-center gap-0.5">
                    <span>Directions</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {validationError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60">
          <button
            type="button"
            data-testid="mode-tab-table"
            onClick={() => {
              setSelectedMode('table');
              setValidationError(null);
            }}
            className={`min-h-[46px] flex items-center justify-center gap-2 rounded-xl text-xs sm:text-sm font-bold transition-all px-3 cursor-pointer ${
              selectedMode === 'table'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-slate-700 font-extrabold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Utensils className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Dining at a Table</span>
          </button>
          <button
            type="button"
            data-testid="mode-tab-room"
            onClick={() => {
              setSelectedMode('room');
              setValidationError(null);
            }}
            className={`min-h-[46px] flex items-center justify-center gap-2 rounded-xl text-xs sm:text-sm font-bold transition-all px-3 cursor-pointer ${
              selectedMode === 'room'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-slate-700 font-extrabold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Bell className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Staying in a Room</span>
          </button>
        </div>

        {/* Camera QR Scanner Bar */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Scan {selectedMode === 'table' ? 'Table' : 'In-Room'} QR Code
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Instantly authenticates and opens your {selectedMode === 'table' ? 'menu' : 'room portal'}
                </div>
              </div>
            </div>
            {isScanning && (
              <button
                type="button"
                onClick={stopCameraScanner}
                className="text-[11px] font-bold text-rose-600 dark:text-rose-400 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 cursor-pointer"
              >
                Close Camera
              </button>
            )}
          </div>

          {isScanning ? (
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-emerald-500/50">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                <div className="w-36 h-36 border-2 border-emerald-400/90 rounded-2xl relative animate-pulse">
                  <div className="absolute left-0 right-0 h-0.5 bg-emerald-400 top-1/2 -translate-y-1/2" />
                </div>
                <span className="text-[10px] font-bold text-emerald-200 mt-2 bg-black/60 px-2.5 py-0.5 rounded-full">
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
              className="min-h-[46px] px-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Camera className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Open Camera Scanner</span>
            </button>
          )}

          {cameraError && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs">
              {cameraError}
            </div>
          )}
        </div>

        {/* Dynamic Form Content */}
        {selectedMode === 'table' ? (
          <form onSubmit={handleTableSubmit} className="flex flex-col gap-3">
            <div>
              <label htmlFor="table-number-input" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Enter your Table Number:
              </label>
              <div className="flex gap-2">
                <input
                  id="table-number-input"
                  type="text"
                  value={tableInput}
                  onChange={(e) => setTableInput(e.target.value)}
                  placeholder="e.g. T-04, 5, Rooftop 2"
                  className="flex-1 min-h-[46px] rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-950/40 shadow-xs"
                />
                <button
                  type="submit"
                  className="min-h-[46px] px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs uppercase tracking-wider transition shadow-sm shrink-0 flex items-center justify-center cursor-pointer"
                >
                  Open Menu
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-3.5">
            {/* Room Sub-Selector Tabs */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => {
                  setRoomFlow('resident');
                  setResidentError(null);
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  roomFlow === 'resident'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Key className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                <span>Resident Guest</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRoomFlow('booking');
                  setResidentError(null);
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  roomFlow === 'booking'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BedDouble className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                <span>Book a Room</span>
              </button>
            </div>

            {roomFlow === 'resident' ? (
              <form onSubmit={handleVerifyResidentStay} className="flex flex-col gap-2.5">
                {residentError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{residentError}</span>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Room Number:
                    </label>
                    <input
                      id="room-number-input"
                      data-testid="input-unlock-room"
                      type="text"
                      value={roomNumberInput}
                      onChange={(e) => setRoomNumberInput(e.target.value)}
                      placeholder="e.g. 101, 204"
                      className="w-full min-h-[44px] rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-950/40 shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Last Name / Mobile:
                    </label>
                    <input
                      data-testid="input-unlock-name"
                      type="text"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="e.g. Verma or 9820011223"
                      className="w-full min-h-[44px] rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-950/40 shadow-xs"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  data-testid="btn-unlock-room"
                  disabled={isVerifyingResident}
                  className="min-h-[46px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition shadow-sm shrink-0 flex items-center justify-center gap-2 mt-1 cursor-pointer"
                >
                  {isVerifyingResident ? 'Verifying Stay...' : 'Unlock Room & Enter'}
                </button>
              </form>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 flex flex-col gap-3">
                <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Explore real-time room availability, live multi-night tariffs, GPS check, and instant Aadhaar KYC booking.
                </div>
                <button
                  type="button"
                  onClick={handleOpenRoomCatalog}
                  className="min-h-[46px] rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs uppercase tracking-wider transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Hotel className="w-4 h-4 shrink-0" />
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
