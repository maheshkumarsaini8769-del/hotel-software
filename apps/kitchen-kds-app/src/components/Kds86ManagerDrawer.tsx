import React, { useState } from 'react';
import { Item86Reason } from '@spicehub/shared-types';

export interface Kds86DishItem {
  id: string;
  name: string;
  stationName: string;
  category: string;
  isAvailable: boolean;
  outOfStockReason?: string;
  markedOutOfStockAt?: string;
  markedOutOfStockBy?: string;
}

export interface Kds86ManagerDrawerProps {
  isOpen: boolean;
  dishes: Kds86DishItem[];
  onClose: () => void;
  onToggleItem86: (itemId: string, isAvailable: boolean, reason?: string) => Promise<void> | void;
  onBatchToggle86?: (itemIds: string[], isAvailable: boolean, reason?: string) => Promise<void> | void;
}

export const Kds86ManagerDrawer: React.FC<Kds86ManagerDrawerProps> = ({
  isOpen,
  dishes,
  onClose,
  onToggleItem86,
  onBatchToggle86,
}) => {
  const [search, setSearch] = useState('');
  const [selectedReason, setSelectedReason] = useState<Item86Reason>(Item86Reason.INGREDIENT_EXHAUSTED);
  const [filterStation, setFilterStation] = useState<string>('ALL');

  if (!isOpen) return null;

  const stations = Array.from(new Set(dishes.map((d) => d.stationName)));

  const filtered = dishes.filter((d) => {
    if (filterStation !== 'ALL' && d.stationName !== filterStation) return false;
    if (search.trim() && !d.name.toLowerCase().includes(search.toLowerCase().trim())) return false;
    return true;
  });

  const outOfStockCount = dishes.filter((d) => !d.isAvailable).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-slate-900 border-l border-slate-800 text-slate-100 flex flex-col h-full shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🚫</span>
            <div>
              <h2 className="text-base font-black tracking-tight uppercase flex items-center gap-2">
                <span>Kitchen 1-Tap 86 Stock Manager</span>
                <span className="px-2 py-0.5 text-xs rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40">
                  {outOfStockCount} Out of Stock
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Instantly broadcast sold out dishes across customer QR & waiter tablets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>

        {/* Toolbar: Search, Reason Selector & Station Filter */}
        <div className="p-4 bg-slate-900/80 border-b border-slate-800/80 space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search dishes by name (e.g. Paneer, Biryani)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-500 text-white"
            />
            {onBatchToggle86 && filtered.length > 0 && (
              <button
                onClick={() => {
                  const availableIds = filtered.filter((d) => d.isAvailable).map((d) => d.id);
                  if (availableIds.length > 0) {
                    onBatchToggle86(availableIds, false, selectedReason);
                  }
                }}
                className="px-3 py-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 text-xs font-bold rounded-xl transition"
                title="Mark all currently visible items as 86"
              >
                86 Visible All
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold whitespace-nowrap">Default 86 Reason:</span>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value as Item86Reason)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-amber-400 font-semibold focus:outline-none"
            >
              <option value={Item86Reason.INGREDIENT_EXHAUSTED}>🥦 Ingredient Exhausted</option>
              <option value={Item86Reason.CHEF_SPECIAL_SOLD_OUT}>👨‍🍳 Chef Special Sold Out</option>
              <option value={Item86Reason.EQUIPMENT_BREAKDOWN}>🔥 Equipment Breakdown (Tandoor/Oven)</option>
              <option value={Item86Reason.QUALITY_HOLD}>⚠️ Quality Hold / Freshness</option>
              <option value={Item86Reason.SEASONAL_UNAVAILABLE}>❄️ Seasonal Unavailable</option>
              <option value={Item86Reason.OTHER}>📝 Other Operational Reason</option>
            </select>
          </div>

          {/* Station Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setFilterStation('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                filterStation === 'ALL'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              All Stations ({dishes.length})
            </button>
            {stations.map((st) => {
              const count = dishes.filter((d) => d.stationName === st).length;
              const outCount = dishes.filter((d) => d.stationName === st && !d.isAvailable).length;
              return (
                <button
                  key={st}
                  onClick={() => setFilterStation(st)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap flex items-center gap-1 ${
                    filterStation === st
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span>{st}</span>
                  <span className="opacity-75">({count})</span>
                  {outCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 inline-block ml-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dish List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="py-24 text-center text-slate-500 text-xs">
              No menu items match your search.
            </div>
          ) : (
            filtered.map((dish) => {
              const is86 = !dish.isAvailable;
              return (
                <div
                  key={dish.id}
                  className={`p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                    is86
                      ? 'bg-rose-950/20 border-rose-800/40 text-slate-300'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-white'
                  }`}
                >
                  <div className="flex-1 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{dish.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        {dish.stationName}
                      </span>
                    </div>

                    {is86 ? (
                      <div className="mt-1 flex items-center gap-2 text-xs text-rose-400">
                        <span className="font-bold">❌ 86 OUT OF STOCK</span>
                        {dish.outOfStockReason && (
                          <span className="text-slate-400">• {dish.outOfStockReason.replace(/_/g, ' ')}</span>
                        )}
                        {dish.markedOutOfStockBy && (
                          <span className="text-slate-500 text-[10px]">by {dish.markedOutOfStockBy}</span>
                        )}
                      </div>
                    ) : (
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                        <span>✅ Available (In Stock)</span>
                      </div>
                    )}
                  </div>

                  {/* 1-Tap Toggle Action Button */}
                  <div>
                    {is86 ? (
                      <button
                        onClick={() => onToggleItem86(dish.id, true)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 min-h-[36px]"
                      >
                        <span>🔄</span>
                        <span>Restock</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onToggleItem86(dish.id, false, selectedReason)}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 min-h-[36px]"
                      >
                        <span>🚫</span>
                        <span>86 Item</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 text-center text-xs text-slate-500">
          Tapping 86 instantly reflects on all Customer Digital Menus & Waiter POS within milliseconds.
        </div>
      </div>
    </div>
  );
};
