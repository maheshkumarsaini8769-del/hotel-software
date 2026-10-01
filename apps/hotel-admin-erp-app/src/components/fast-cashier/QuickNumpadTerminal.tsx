import React, { useState, useRef, useEffect } from 'react';
import { IFastCashierItem } from '@spicehub/ui';

interface QuickNumpadTerminalProps {
  onLookupAndAdd: (codeOrBarcode: string, quantity: number) => Promise<boolean>;
  onDirectAddItem: (item: IFastCashierItem, quantity: number) => void;
  popularItems: IFastCashierItem[];
  loading: boolean;
}

export const QuickNumpadTerminal: React.FC<QuickNumpadTerminalProps> = ({
  onLookupAndAdd,
  onDirectAddItem,
  popularItems,
  loading,
}) => {
  const [codeBuffer, setCodeBuffer] = useState('');
  const [activeQty, setActiveQty] = useState(1);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Keep focus on input for physical barcode scanners
    inputRef.current?.focus();
  }, []);

  const handleNumpadPress = (digit: string) => {
    setCodeBuffer((prev) => prev + digit);
  };

  const handleClear = () => {
    setCodeBuffer('');
    setActiveQty(1);
    setStatusMessage(null);
    inputRef.current?.focus();
  };

  const handleEnter = async () => {
    if (!codeBuffer.trim()) return;
    setStatusMessage(null);
    const success = await onLookupAndAdd(codeBuffer.trim(), activeQty);
    if (success) {
      setCodeBuffer('');
      setActiveQty(1);
      setStatusMessage({ text: `Added x${activeQty}!`, isError: false });
    } else {
      setStatusMessage({ text: `Item "${codeBuffer}" not found`, isError: true });
    }
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEnter();
    }
  };

  const numpadKeys = [
    '7', '8', '9',
    '4', '5', '6',
    '1', '2', '3',
    '0', '00', 'CLEAR',
  ];

  return (
    <div className="bg-[#0f131a] rounded-2xl border border-zinc-800 p-5 flex flex-col gap-5 shadow-2xl">
      {/* Barcode & 10-Key Code Input Header */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-amber-400/90 flex items-center justify-between">
          <span>Barcode / 10-Key Item Code Scanner</span>
          <span className="text-[11px] text-zinc-500 font-normal">Physical Scanner Ready ⚡</span>
        </label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-mono text-sm">
              🔍
            </span>
            <input
              ref={inputRef}
              type="text"
              value={codeBuffer}
              onChange={(e) => setCodeBuffer(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Scan barcode or type 10-key shortcut (e.g. 101, 204)..."
              className="w-full pl-10 pr-4 py-3 bg-zinc-900 border-2 border-zinc-700 focus:border-amber-400 rounded-xl text-white font-mono text-base tracking-wide outline-none transition-all placeholder:text-zinc-600"
            />
          </div>
          <button
            type="button"
            onClick={handleEnter}
            disabled={!codeBuffer.trim() || loading}
            className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 text-black disabled:text-zinc-600 font-bold text-sm tracking-wide transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] disabled:shadow-none flex items-center gap-1.5"
          >
            <span>ENTER</span>
            <span>↵</span>
          </button>
        </div>

        {/* Status Feedback Toast */}
        {statusMessage && (
          <div
            className={`text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-2 ${
              statusMessage.isError
                ? 'bg-red-950/60 text-red-300 border border-red-500/40'
                : 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
            }`}
          >
            <span>{statusMessage.isError ? '⚠️' : '✓'}</span>
            <span>{statusMessage.text}</span>
          </div>
        )}
      </div>

      {/* Main Grid: Left = Numpad & Multiplier, Right = High-Frequency Quick Tap Items */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: 10-Key Touch Numpad & Multiplier (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          {/* Multiplier Pills */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-medium">Qty:</span>
            {[1, 2, 3, 5, 10].map((qty) => (
              <button
                key={qty}
                type="button"
                onClick={() => setActiveQty(qty)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  activeQty === qty
                    ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                    : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                x{qty}
              </button>
            ))}
          </div>

          {/* 10-Key Touch Pad Grid */}
          <div className="grid grid-cols-3 gap-2">
            {numpadKeys.map((key) => {
              if (key === 'CLEAR') {
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={handleClear}
                    className="h-13 py-3 rounded-xl bg-red-950/50 hover:bg-red-900/60 border border-red-500/30 text-red-300 font-bold text-sm transition-all"
                  >
                    CLR
                  </button>
                );
              }
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleNumpadPress(key)}
                  className="h-13 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-500/40 text-white font-mono text-lg font-bold transition-all active:scale-95 shadow-sm"
                >
                  {key}
                </button>
              );
            })}
          </div>

          {/* Punch Button */}
          <button
            type="button"
            onClick={handleEnter}
            disabled={!codeBuffer.trim() || loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:from-zinc-800 disabled:to-zinc-800 text-black disabled:text-zinc-600 font-black text-sm uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(245,158,11,0.25)] disabled:shadow-none flex items-center justify-center gap-2"
          >
            <span>PUNCH CODE (ENTER)</span>
            <span>↵</span>
          </button>
        </div>

        {/* Right Column: High-Frequency Quick-Tap Takeaway Tiles (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Popular Quick-Add Favorites
            </span>
            <span className="text-[11px] text-amber-400/80">1-Tap Fast Addition</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[310px] overflow-y-auto pr-1">
            {popularItems.length === 0 ? (
              <div className="col-span-full py-12 text-center text-zinc-500 text-xs">
                No items available in quick catalog
              </div>
            ) : (
              popularItems.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => onDirectAddItem(item, activeQty)}
                  className="p-3 rounded-xl bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-800 hover:border-amber-500/50 transition-all text-left flex flex-col justify-between group h-24 shadow-md active:scale-95"
                >
                  <div className="flex items-start justify-between gap-1 w-full">
                    <span className="text-xs font-semibold text-zinc-200 group-hover:text-amber-300 line-clamp-2 leading-tight">
                      {item.name}
                    </span>
                    {item.itemCode && (
                      <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-amber-400 border border-amber-500/20 shrink-0">
                        #{item.itemCode}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between w-full mt-2 pt-1 border-t border-zinc-800/60">
                    <span className="text-xs font-mono font-bold text-amber-400">
                      ₹{item.basePrice}
                    </span>
                    <span className="text-[10px] font-medium text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                      + Add
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
