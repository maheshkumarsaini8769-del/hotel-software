import React, { useState, useEffect } from 'react';

export interface KdsHeaderProps {
  activeStationName?: string;
  activeOrdersCount: number;
  isSoundEnabled?: boolean;
  onToggleSound?: () => void;
  onRefresh?: () => void;
  onOpen86Modal?: () => void;
  active86Count?: number;
  lowStockCount?: number;
  onOpenStockAlerts?: () => void;
}

export const KdsHeader: React.FC<KdsHeaderProps> = ({
  activeStationName = 'All Stations',
  activeOrdersCount,
  isSoundEnabled = true,
  onToggleSound,
  onRefresh,
  onOpen86Modal,
  active86Count = 0,
  lowStockCount = 0,
  onOpenStockAlerts,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between shadow-md text-white select-none">
      {/* Brand & Station Info */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">🔥</span>
          <span className="font-black text-xl tracking-tight text-white uppercase">SpiceHub KDS</span>
        </div>
        <div className="h-6 w-px bg-slate-700 hidden sm:block" />
        <div className="flex items-center space-x-2">
          <span className="text-xs uppercase font-semibold text-slate-400">Current Station:</span>
          <span className="text-xs font-bold px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
            {activeStationName}
          </span>
        </div>
      </div>

      {/* Metrics, Clock & Actions */}
      <div className="flex items-center space-x-5">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 font-medium">Pending Orders:</span>
          <span className="bg-rose-500 text-white font-bold text-xs px-2.5 py-0.5 rounded-full shadow-sm">
            {activeOrdersCount}
          </span>
        </div>

        {/* Live Clock */}
        <div className="font-mono text-sm text-slate-300 bg-slate-800/80 px-3 py-1 rounded border border-slate-700">
          {currentTime || '00:00:00'}
        </div>

        {/* BOM Low Stock Alerts Indicator */}
        {lowStockCount > 0 && (
          <button
            onClick={onOpenStockAlerts}
            data-testid="kds-low-stock-badge"
            className="px-3 py-1 text-xs font-bold rounded-lg border transition flex items-center space-x-1.5 min-h-[32px] bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30 animate-pulse"
            title="Raw materials below minimum par levels detected via BOM"
          >
            <span>⚠️ Low Stock</span>
            <span className="bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded-full text-[10px] font-black">
              {lowStockCount}
            </span>
          </button>
        )}

        {/* 1-Tap 86 Out of Stock Manager Button */}
        {onOpen86Modal && (
          <button
            onClick={onOpen86Modal}
            className={`px-3 py-1 text-xs font-bold rounded-lg border transition flex items-center space-x-1.5 min-h-[32px] ${
              active86Count > 0
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 hover:bg-rose-500/30 animate-pulse'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="Open 1-Tap 86 (Out of Stock) Manager"
          >
            <span>🚫 86 Manager</span>
            {active86Count > 0 && (
              <span className="bg-rose-600 text-white px-1.5 py-0.2 rounded-full text-[10px] font-black">
                {active86Count}
              </span>
            )}
          </button>
        )}

        {/* Chime Sound Indicator / Toggle */}
        <button
          onClick={onToggleSound}
          title={isSoundEnabled ? 'Audio alerts active' : 'Audio alerts muted'}
          className={`px-3 py-1 text-xs font-semibold rounded border transition flex items-center space-x-1.5 ${
            isSoundEnabled
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
              : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
          }`}
        >
          <span>{isSoundEnabled ? '🔔 Chime ON' : '🔕 Muted'}</span>
        </button>

        {/* Manual Refresh */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            title="Reload orders"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
          >
            🔄
          </button>
        )}
      </div>
    </header>
  );
};
