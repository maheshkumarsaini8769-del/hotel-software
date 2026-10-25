import React, { useState, useEffect, useRef } from 'react';

export interface CustomerLocationSelectorModalProps {
  isOpen: boolean;
  currentApp: 'customer' | 'guest';
  apiBaseUrl?: string;
  tablePortalUrl?: string;
  roomPortalUrl?: string;
  onSelectTable?: (tableNumber: string) => void;
  onSelectRoom?: (roomNumber: string) => void;
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
  onSelectTable,
  onSelectRoom,
  onSelectDemoTable,
  onSelectDemoRoom,
}) => {
  const [selectedMode, setSelectedMode] = useState<'table' | 'room'>(
    currentApp === 'guest' ? 'room' : 'table'
  );
  const [tableInput, setTableInput] = useState('');
  const [roomInput, setRoomInput] = useState('');
  const [demoAvailable, setDemoAvailable] = useState<boolean>(false);
  const [isCheckingDemo, setIsCheckingDemo] = useState<boolean>(true);

  // In-app Camera QR Scanner
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanMessage, setScanMessage] = useState<string>('');
  const [cameraError, setCameraError] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Lock body scroll when modal is active to prevent background horizontal/vertical overflow
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
    let target = val.trim();
    try {
      if (target.startsWith('http://') || target.startsWith('https://')) {
        const parsed = new URL(target);
        const tbl =
          parsed.searchParams.get('table') ||
          parsed.searchParams.get('tableNumber') ||
          (parsed.searchParams.get('type') === 'table' ? parsed.searchParams.get('id') : null);
        const rm =
          parsed.searchParams.get('room') ||
          parsed.searchParams.get('roomNumber') ||
          (parsed.searchParams.get('type') === 'room' ? parsed.searchParams.get('id') : null);
        if (tbl) {
          stopCameraScanner();
          if (currentApp === 'customer' && onSelectTable) onSelectTable(tbl);
          else {
            const dest = new URL(tablePortalUrl, window.location.href);
            dest.searchParams.set('table', tbl);
            window.location.href = dest.toString();
          }
          return;
        }
        if (rm) {
          stopCameraScanner();
          if (currentApp === 'guest' && onSelectRoom) onSelectRoom(rm);
          else {
            const dest = new URL(roomPortalUrl, window.location.href);
            dest.searchParams.set('room', rm);
            window.location.href = dest.toString();
          }
          return;
        }
      }
    } catch {}

    setTimeout(() => {
      stopCameraScanner();
      if (selectedMode === 'table') {
        const numOnly = target.replace(/[^0-9]/g, '');
        const formatted = target.toUpperCase().startsWith('T-')
          ? target.toUpperCase()
          : numOnly
          ? `T-${numOnly.padStart(2, '0')}`
          : target;
        if (currentApp === 'customer' && onSelectTable) onSelectTable(formatted);
        else {
          const dest = new URL(tablePortalUrl, window.location.href);
          dest.searchParams.set('table', formatted);
          window.location.href = dest.toString();
        }
      } else {
        const numOnly = target.replace(/[^0-9]/g, '');
        const formatted = numOnly || target;
        if (currentApp === 'guest' && onSelectRoom) onSelectRoom(formatted);
        else {
          const dest = new URL(roomPortalUrl, window.location.href);
          dest.searchParams.set('room', formatted);
          window.location.href = dest.toString();
        }
      }
    }, 500);
  };

  // Probe demo context availability on generic entry (Condition 1: fail gracefully if null/error)
  useEffect(() => {
    let active = true;
    async function checkDemoContext() {
      try {
        const base = apiBaseUrl.replace(/\/api\/v1\/?$/, '');
        const res = await fetch(`${base}/api/v1/pos/demo-context`);
        if (!active) return;
        if (res.ok) {
          const json = await res.json().catch(() => null);
          if (json?.success && json?.data?.table?.tableNumber) {
            setDemoAvailable(true);
            return;
          }
        }
        setDemoAvailable(false);
      } catch {
        if (active) setDemoAvailable(false);
      } finally {
        if (active) setIsCheckingDemo(false);
      }
    }

    checkDemoContext();
    return () => {
      active = false;
    };
  }, [apiBaseUrl]);

  if (!isOpen) return null;

  const handleTableSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = tableInput.trim() || 'T-04';
    const numOnly = raw.replace(/[^0-9]/g, '');
    const formatted = numOnly ? `T-${numOnly.padStart(2, '0')}` : raw;

    if (currentApp === 'customer' && onSelectTable) {
      onSelectTable(formatted);
    } else {
      const target = new URL(tablePortalUrl, window.location.href);
      target.searchParams.set('table', formatted);
      window.location.href = target.toString();
    }
  };

  const handleRoomSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = roomInput.trim() || '305';
    const numOnly = raw.replace(/[^0-9]/g, '');
    const formatted = numOnly || raw;

    if (currentApp === 'guest' && onSelectRoom) {
      onSelectRoom(formatted);
    } else {
      const target = new URL(roomPortalUrl, window.location.href);
      target.searchParams.set('room', formatted);
      window.location.href = target.toString();
    }
  };

  const handleDemoTableClick = () => {
    if (currentApp === 'customer' && onSelectDemoTable) {
      onSelectDemoTable();
    } else {
      const target = new URL(tablePortalUrl, window.location.href);
      target.searchParams.set('table', 'T-04');
      window.location.href = target.toString();
    }
  };

  const handleDemoRoomClick = () => {
    if (currentApp === 'guest' && onSelectDemoRoom) {
      onSelectDemoRoom();
    } else {
      const target = new URL(roomPortalUrl, window.location.href);
      target.searchParams.set('room', '305');
      window.location.href = target.toString();
    }
  };

  const quickTables = ['T-01', 'T-02', 'T-04', 'T-07', 'T-10'];
  const quickRooms = ['101', '204', '305', '402', '501'];

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
              Where are you ordering from?
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Please specify whether you are seated in our restaurant or relaxing in your guest room.
            </p>
          </div>
        </div>

        {/* Mode Selector Tabs (min 44px tap target) */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-900/90 border border-slate-800">
          <button
            type="button"
            data-testid="mode-tab-table"
            onClick={() => setSelectedMode('table')}
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
            onClick={() => setSelectedMode('room')}
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
                <div className="text-xs font-black text-white">Scan Table / Room QR Code</div>
                <div className="text-[10px] text-slate-400">Instantly binds and opens your menu</div>
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
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                data-testid="camera-qr-scanner-btn"
                onClick={startCameraScanner}
                className="flex-1 min-h-[40px] px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition"
              >
                <span>📷</span>
                <span>Open Camera Scanner</span>
              </button>
              <button
                type="button"
                data-testid="simulate-qr-scan-btn"
                onClick={() => handleScannedResult(selectedMode === 'table' ? 'T-04' : '305')}
                className="min-h-[40px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1 transition"
              >
                <span>⚡</span>
                <span>Quick Scan ({selectedMode === 'table' ? 'T-04' : '305'})</span>
              </button>
            </div>
          )}

          {cameraError && (
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px]">
              {cameraError}
            </div>
          )}
        </div>

        {/* Dynamic Form Content */}
        {selectedMode === 'table' ? (
          <form onSubmit={handleTableSubmit} className="flex flex-col gap-4">
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

            {/* Quick Chips (min 44px tap target) */}
            <div>
              <div className="text-[11px] font-semibold text-slate-400 mb-1.5">
                Popular Dining Tables:
              </div>
              <div className="flex flex-wrap gap-2">
                {quickTables.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTableInput(t);
                      if (currentApp === 'customer' && onSelectTable) {
                        onSelectTable(t);
                      } else {
                        const target = new URL(tablePortalUrl, window.location.href);
                        target.searchParams.set('table', t);
                        window.location.href = target.toString();
                      }
                    }}
                    className="min-h-[44px] px-3.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-amber-500/20 hover:border-amber-500/40 text-xs font-bold text-slate-300 hover:text-amber-400 transition flex items-center justify-center"
                  >
                    Table {t}
                  </button>
                ))}
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRoomSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="room-number-input" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Enter your Room Number:
              </label>
              <div className="flex gap-2">
                <input
                  id="room-number-input"
                  type="text"
                  value={roomInput}
                  onChange={(e) => setRoomInput(e.target.value)}
                  placeholder="e.g. 305, 402, 108"
                  className="flex-1 min-h-[44px] rounded-xl bg-slate-900 border border-slate-700 px-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="min-h-[44px] px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider transition shadow-lg shrink-0 flex items-center justify-center"
                >
                  Open Room
                </button>
              </div>
            </div>

            {/* Quick Room Chips (min 44px tap target) */}
            <div>
              <div className="text-[11px] font-semibold text-slate-400 mb-1.5">
                Quick Room Select:
              </div>
              <div className="flex flex-wrap gap-2">
                {quickRooms.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setRoomInput(r);
                      if (currentApp === 'guest' && onSelectRoom) {
                        onSelectRoom(r);
                      } else {
                        const target = new URL(roomPortalUrl, window.location.href);
                        target.searchParams.set('room', r);
                        window.location.href = target.toString();
                      }
                    }}
                    className="min-h-[44px] px-3.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-blue-500/20 hover:border-blue-500/40 text-xs font-bold text-slate-300 hover:text-blue-400 transition flex items-center justify-center"
                  >
                    Room {r}
                  </button>
                ))}
              </div>
            </div>
          </form>
        )}

        {/* CONDITION 1: Demo Mode Buttons (only visible if demo-context succeeds) */}
        {!isCheckingDemo && demoAvailable && (
          <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-2">
            <div className="text-[11px] font-semibold text-slate-400 text-center flex items-center justify-center gap-1.5">
              <span>⚡</span>
              <span>Testing or exploring the platform?</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                data-testid="demo-table-btn"
                onClick={handleDemoTableClick}
                className="min-h-[44px] px-3 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                <span>🎬</span>
                <span>Try Demo Table (T-04)</span>
              </button>
              <button
                type="button"
                data-testid="demo-room-btn"
                onClick={handleDemoRoomClick}
                className="min-h-[44px] px-3 py-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                <span>🎬</span>
                <span>Try Demo Room (305)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
