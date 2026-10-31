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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeQty, setActiveQty] = useState(1);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Keep focus on input for physical barcode scanners
    inputRef.current?.focus();
  }, []);

  const handleClear = () => {
    setSearchQuery('');
    setActiveQty(1);
    setStatusMessage(null);
    inputRef.current?.focus();
  };

  const handleEnter = async () => {
    const query = searchQuery.trim();
    if (!query) return;
    setStatusMessage(null);
    const success = await onLookupAndAdd(query, activeQty);
    if (success) {
      setSearchQuery('');
      setActiveQty(1);
      setStatusMessage({ text: `Added x${activeQty}!`, isError: false });
    } else {
      setStatusMessage({ text: `Item "${query}" not found`, isError: true });
    }
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEnter();
    }
  };

  // Derive categories
  const categories = ['ALL', ...Array.from(new Set(popularItems.map((i) => i.category || 'General').filter(Boolean)))];

  const filteredItems = popularItems.filter((item) => {
    const matchesCategory = selectedCategory === 'ALL' || (item.category || 'General') === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = !q || item.name.toLowerCase().includes(q) || (item.itemCode && item.itemCode.toLowerCase().includes(q));
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="bg-slate-900 rounded-2xl border border-zinc-800 p-5 flex flex-col gap-5 shadow-sm dark:shadow-none">
      {/* Barcode & 10-Key Code Input Header */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-amber-400/90 flex items-center justify-between">
          <span>Search Menu Items or Scan Barcode</span>
          <span className="text-[11px] text-zinc-500 font-normal">Fast Visual Catalog ⚡</span>
        </label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-mono text-sm">
              🔍
            </span>
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search by dish name or item code (e.g. Paneer, Naan, Biryani)..."
              className="w-full pl-10 pr-4 py-3 bg-zinc-900 border-2 border-zinc-700 focus:border-amber-400 rounded-xl text-white font-mono text-base tracking-wide outline-none transition-all placeholder:text-zinc-600"
            />
          </div>
          <button
            type="button"
            onClick={handleEnter}
            disabled={!searchQuery.trim() || loading}
            className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 text-black disabled:text-zinc-600 font-bold text-sm tracking-wide transition-all shadow-sm dark:shadow-none disabled:shadow-none flex items-center gap-1.5"
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

      {/* Category Pills & Quantity Multipliers */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-zinc-800/80">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-black border-amber-400 shadow-sm dark:shadow-none'
                  : 'bg-zinc-900/90 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Quantity Multipliers */}
        <div className="flex items-center gap-1.5 shrink-0 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800">
          <span className="text-[11px] text-zinc-400 font-semibold px-1">Qty:</span>
          {[1, 2, 3, 5, 10].map((qty) => (
            <button
              key={qty}
              type="button"
              onClick={() => setActiveQty(qty)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                activeQty === qty
                  ? 'bg-amber-500 text-black border-amber-400 shadow-sm dark:shadow-none'
                  : 'bg-zinc-800/80 text-zinc-300 border-zinc-700/60 hover:text-white'
              }`}
            >
              x{qty}
            </button>
          ))}
        </div>
      </div>

      {/* Full Quick-Tap Catalog Grid */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            Fast Item Selection ({filteredItems.length} items)
          </span>
          <span className="text-[11px] text-amber-400/80 font-medium">1-Tap Punch to Bill</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[420px] overflow-y-auto pr-1">
          {filteredItems.length === 0 ? (
            <div className="col-span-full py-14 text-center text-zinc-500 text-xs bg-zinc-950/40 rounded-xl border border-zinc-900">
              No matching items found
            </div>
          ) : (
            filteredItems.map((item) => (
              <button
                key={item._id}
                type="button"
                onClick={() => onDirectAddItem(item, activeQty)}
                className="p-3.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-800/80 hover:border-amber-500/50 transition-all text-left flex flex-col justify-between group min-h-[96px] shadow-md active:scale-95 hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
              >
                <div className="flex items-start justify-between gap-1.5 w-full">
                  <span className="text-xs font-bold text-zinc-200 group-hover:text-amber-300 line-clamp-2 leading-tight">
                    {item.name}
                  </span>
                  {item.itemCode && (
                    <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-amber-400 border border-amber-500/20 shrink-0">
                      #{item.itemCode}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between w-full mt-3 pt-2 border-t border-zinc-800/80">
                  <span className="text-sm font-mono font-black text-amber-400">
                    ₹{item.basePrice}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-400 group-hover:translate-x-0.5 transition-transform bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                    + Add{activeQty > 1 ? ` x${activeQty}` : ''}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
