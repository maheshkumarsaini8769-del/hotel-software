import React, { useState, useRef, useEffect } from 'react';
import { IFastCashierItem } from '@spicehub/ui';
import { Search, CheckCircle2, AlertCircle, CornerDownLeft } from 'lucide-react';

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
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-5 shadow-xs">
      {/* Barcode & 10-Key Code Input Header */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center justify-between">
          <span>Search Menu Items or Scan Barcode</span>
          <span className="text-[11px] text-slate-400 font-normal">Fast Visual Catalog</span>
        </label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search by dish name or item code (e.g. Paneer, Naan, Biryani)..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:bg-white rounded-xl text-slate-900 font-medium text-sm outline-none transition-all placeholder:text-slate-400"
            />
          </div>
          <button
            type="button"
            onClick={handleEnter}
            disabled={!searchQuery.trim() || loading}
            className="btn-glass-green px-5 py-2.5 text-xs font-bold"
          >
            <span>ENTER</span>
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Status Feedback Toast */}
        {statusMessage && (
          <div
            className={`text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-2 ${
              statusMessage.isError
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            {statusMessage.isError ? (
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}
      </div>

      {/* Category Pills & Quantity Multipliers */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border whitespace-nowrap ${
                selectedCategory === cat
                  ? 'btn-glass-green text-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Quantity Multipliers */}
        <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 p-1 rounded-xl border border-slate-200">
          <span className="text-[11px] text-slate-500 font-semibold px-1">Qty:</span>
          {[1, 2, 3, 5, 10].map((qty) => (
            <button
              key={qty}
              type="button"
              onClick={() => setActiveQty(qty)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                activeQty === qty
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
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
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Fast Item Selection ({filteredItems.length} items)
          </span>
          <span className="text-[11px] text-emerald-700 font-semibold">1-Tap Punch to Bill</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[420px] overflow-y-auto pr-1">
          {filteredItems.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-200">
              No matching items found
            </div>
          ) : (
            filteredItems.map((item) => (
              <button
                key={item._id}
                type="button"
                onClick={() => onDirectAddItem(item, activeQty)}
                className="p-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-emerald-400 transition-all text-left flex flex-col justify-between group min-h-[96px] shadow-xs active:scale-95"
              >
                <div className="flex items-start justify-between gap-1.5 w-full">
                  <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 line-clamp-2 leading-tight">
                    {item.name}
                  </span>
                  {item.itemCode && (
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-mono text-slate-600 border border-slate-200 shrink-0">
                      #{item.itemCode}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between w-full mt-3 pt-2 border-t border-slate-100">
                  <span className="text-sm font-mono font-bold text-slate-900">
                    ₹{item.basePrice}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
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
