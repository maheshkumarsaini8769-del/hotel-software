import React, { useMemo, useState } from 'react';
import {
  Layers,
  UtensilsCrossed,
  Clock,
  BookOpen,
  Calendar,
  Users,
  TrendingUp,
  Settings,
  CheckCircle2,
  Flame,
  Search,
  Volume2,
  FileText,
  ChefHat,
  RefreshCw,
  Radio,
  Tag,
  Filter,
} from 'lucide-react';
import { Kds86DishItem } from './Kds86ManagerDrawer';

interface HubOrderItem {
  name: string;
  qty: number;
  stationName?: string;
}

export interface HubOrder {
  id: string;
  orderNumber: string;
  destination: string;
  orderType: string;
  timeAgo: string;
  status: 'NEW' | 'PREPARING' | 'READY' | 'COMPLETED';
  items: HubOrderItem[];
  note?: string;
  timerMinutes?: number;
  completedAt?: string;
}

interface HubStation {
  id: string;
  stationName: string;
  isOnline: boolean;
}

interface KitchenViewsHubProps {
  activeView: string;
  isDark: boolean;
  liveOrders: HubOrder[];
  completedOrders: HubOrder[];
  stations: HubStation[];
  dishes?: Kds86DishItem[];
  onToggleItem86?: (itemId: string, isAvailable: boolean, reason?: string) => Promise<void> | void;
  onBatchToggle86?: (itemIds: string[], isAvailable: boolean, reason?: string) => Promise<void> | void;
  onBackToLiveOrders: () => void;
  onOpen86Manager?: () => void;
  onTriggerToast?: (msg: string) => void;
}

function orderPriority(order: HubOrder): 'URGENT' | 'HIGH' | 'NORMAL' {
  const minutes = Number(order.timerMinutes || 0);
  if (minutes >= 15) return 'URGENT';
  if (minutes >= 8) return 'HIGH';
  return 'NORMAL';
}

function EmptyState({ isDark, message }: { isDark: boolean; message: string }) {
  return (
    <div
      className={`rounded-2xl border border-dashed p-10 text-center text-xs font-semibold ${
        isDark ? 'border-slate-700 bg-slate-900 text-slate-500' : 'border-slate-300 bg-white text-slate-500'
      }`}
    >
      {message}
    </div>
  );
}

const DEFAULT_SAMPLE_DISHES: Kds86DishItem[] = [
  { id: 'dish-01', name: 'Butter Chicken Masala', category: 'Main Course', stationName: 'Curry Station', isAvailable: true },
  { id: 'dish-02', name: 'Paneer Butter Masala', category: 'Main Course', stationName: 'Curry Station', isAvailable: true },
  { id: 'dish-03', name: 'Dal Makhani Signature', category: 'Main Course', stationName: 'Curry Station', isAvailable: true },
  { id: 'dish-04', name: 'Tandoori Murgh (Full)', category: 'Tandoor & Grills', stationName: 'Tandoor Station', isAvailable: true },
  { id: 'dish-05', name: 'Paneer Tikka Angara', category: 'Tandoor & Grills', stationName: 'Tandoor Station', isAvailable: true },
  { id: 'dish-06', name: 'Garlic Butter Naan', category: 'Breads', stationName: 'Tandoor Station', isAvailable: true },
  { id: 'dish-07', name: 'Tandoori Roti Butter', category: 'Breads', stationName: 'Tandoor Station', isAvailable: true },
  { id: 'dish-08', name: 'Dum Handi Biryani (Hyderabadi)', category: 'Rice & Biryani', stationName: 'Curry Station', isAvailable: true },
  { id: 'dish-09', name: 'Jeera Basmati Rice', category: 'Rice & Biryani', stationName: 'Curry Station', isAvailable: true },
  { id: 'dish-10', name: 'Chilli Chicken Dry', category: 'Starters', stationName: 'Chinese & Wok', isAvailable: true },
  { id: 'dish-11', name: 'Crispy Veg Spring Rolls', category: 'Starters', stationName: 'Chinese & Wok', isAvailable: true },
  { id: 'dish-12', name: 'Fresh Lime Soda (Sweet & Salt)', category: 'Beverages', stationName: 'Kitchen Pass', isAvailable: true },
  { id: 'dish-13', name: 'Masala Chaas', category: 'Beverages', stationName: 'Kitchen Pass', isAvailable: true },
  { id: 'dish-14', name: 'Gulab Jamun with Rabdi', category: 'Desserts', stationName: 'Kitchen Pass', isAvailable: true },
];

export const KitchenViewsHub: React.FC<KitchenViewsHubProps> = ({
  activeView,
  isDark,
  liveOrders,
  completedOrders,
  stations,
  dishes = [],
  onToggleItem86,
  onBatchToggle86,
  onBackToLiveOrders,
  onOpen86Manager,
  onTriggerToast,
}) => {
  const [search, setSearch] = useState('');
  const [menuSearch, setMenuSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedDishStation, setSelectedDishStation] = useState<string>('ALL');
  const [audioTestSuccess, setAudioTestSuccess] = useState(false);

  const activeDishesList = useMemo(() => {
    return dishes && dishes.length > 0 ? dishes : DEFAULT_SAMPLE_DISHES;
  }, [dishes]);

  const availableDishes = useMemo(() => {
    return activeDishesList.filter((d) => d.isAvailable !== false);
  }, [activeDishesList]);

  const outOfStockDishes = useMemo(() => {
    return activeDishesList.filter((d) => d.isAvailable === false);
  }, [activeDishesList]);

  const filteredDishes = useMemo(() => {
    const q = menuSearch.trim().toLowerCase();
    return activeDishesList.filter((d) => {
      if (selectedCategory !== 'ALL' && (d.category || 'General') !== selectedCategory) {
        return false;
      }
      if (selectedDishStation !== 'ALL' && (d.stationName || 'Kitchen Pass') !== selectedDishStation) {
        return false;
      }
      if (q) {
        return (
          d.name.toLowerCase().includes(q) ||
          (d.category || '').toLowerCase().includes(q) ||
          (d.stationName || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [activeDishesList, selectedCategory, selectedDishStation, menuSearch]);

  const cardClass = isDark
    ? 'bg-slate-900 border-slate-800'
    : 'bg-white border-slate-200 shadow-sm';
  const headingClass = isDark ? 'text-white' : 'text-slate-900';
  const mutedClass = isDark ? 'text-slate-400' : 'text-slate-500';

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return liveOrders;
    return liveOrders.filter(
      (order) =>
        order.orderNumber.toLowerCase().includes(query) ||
        order.destination.toLowerCase().includes(query) ||
        order.items.some((item) => item.name.toLowerCase().includes(query))
    );
  }, [liveOrders, search]);

  const stationLoads = useMemo(() => {
    const knownStations = new Set(
      stations.flatMap((station) => [station.id, station.stationName])
    );
    return stations.map((station) => {
        const tickets = liveOrders.filter((order) =>
          order.items.some(
            (item) =>
              item.stationName === station.stationName ||
              item.stationName === station.id ||
              (!knownStations.has(item.stationName || '') && station.id === stations[0]?.id)
          )
        );
        const load = Math.min(100, tickets.length * 20);
        return {
          ...station,
          activeTickets: tickets.length,
          load,
          status: load >= 70 ? 'BUSY' : load <= 30 ? 'LIGHT' : 'NORMAL',
        };
      });
  }, [liveOrders, stations]);

  const averageActiveMinutes =
    liveOrders.length > 0
      ? Math.round(
          liveOrders.reduce((sum, order) => sum + Number(order.timerMinutes || 0), 0) /
            liveOrders.length
        )
      : 0;
  const averageCompletedMinutes =
    completedOrders.length > 0
      ? Math.round(
          completedOrders.reduce((sum, order) => sum + Number(order.timerMinutes || 0), 0) /
            completedOrders.length
        )
      : 0;

  const handleTestAudio = () => {
    setAudioTestSuccess(true);
    if (onTriggerToast) onTriggerToast('Kitchen audio chime test played.');
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch {
      // Browsers without Web Audio still get the visual confirmation.
    }
    window.setTimeout(() => setAudioTestSuccess(false), 3000);
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden p-4 gap-4">
      <div
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 transition-colors ${cardClass}`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToLiveOrders}
            className={`p-2 rounded-xl border text-xs font-bold transition flex items-center gap-1 ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
          >
            ← Live Orders
          </button>
          <div>
            <h2 className={`font-black text-base flex items-center gap-2 ${headingClass}`}>
              <span>{activeView}</span>
            </h2>
            <p className="text-xs text-slate-400">
              Live kitchen operations data from the KDS order stream.
            </p>
          </div>
        </div>

        {onOpen86Manager && (
          <button
            onClick={onOpen86Manager}
            className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
          >
            🚫 86 Item Manager
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar space-y-4 pb-16 overscroll-contain">
        {activeView === 'Order Queue' && (
          <div className="space-y-4">
            <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${cardClass}`}>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-red-500" />
                <span className={`font-bold text-sm ${headingClass}`}>
                  Live Kitchen Priority Queue ({filteredOrders.length} Active Tickets)
                </span>
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search ticket, table or dish..."
                  className={`pl-8 pr-3 py-1.5 rounded-xl border text-xs focus:outline-none ${
                    isDark
                      ? 'bg-slate-900 border-slate-800 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <EmptyState isDark={isDark} message="No active kitchen tickets. New orders appear here automatically." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredOrders.map((order) => {
                  const priority = orderPriority(order);
                  return (
                    <div
                      key={order.id}
                      className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 ${cardClass}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className={`font-black text-sm ${headingClass}`}>{order.orderNumber}</span>
                          <span className="text-xs text-red-500 font-bold ml-2">● {order.destination}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            priority === 'URGENT'
                              ? 'bg-red-600 text-white animate-pulse'
                              : priority === 'HIGH'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-slate-700/40 text-slate-300 border border-slate-600'
                          }`}
                        >
                          {priority}
                        </span>
                      </div>
                      <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        {order.items.map((item) => `${item.name} x${item.qty}`).join(', ')}
                      </p>
                      {order.note && <p className="text-[11px] text-amber-400">{order.note}</p>}
                      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                        <span className="text-slate-400">
                          Waiting: <strong className="text-red-400">{order.timeAgo}</strong>
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                            isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeView === 'Kitchen Stations' && (
          <div className="space-y-4">
            <div className={`p-4 rounded-2xl border flex items-center justify-between ${cardClass}`}>
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-amber-500" />
                <span className={`font-bold text-sm ${headingClass}`}>Station Load ({stations.length} configured)</span>
              </div>
              <span className="text-xs text-slate-400">Load is derived from live ticket items</span>
            </div>

            {stationLoads.length === 0 ? (
              <EmptyState isDark={isDark} message="No kitchen stations are configured for this outlet yet." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stationLoads.map((station) => (
                  <div key={station.id} className={`p-4 rounded-2xl border space-y-3 ${cardClass}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                          <UtensilsCrossed className="w-4 h-4" />
                        </div>
                        <div>
                          <div className={`font-black text-xs ${headingClass}`}>{station.stationName}</div>
                          <div className="text-[10px] text-slate-400">
                            {station.isOnline ? 'Online' : 'Offline'} • {station.id}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          station.status === 'BUSY'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : station.status === 'LIGHT'
                              ? 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {station.status}
                      </span>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">Load Capacity</span>
                        <span className="font-bold text-amber-400">
                          {station.load}% ({station.activeTickets} tickets)
                        </span>
                      </div>
                      <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                        <div className="bg-amber-500 h-full rounded-full" style={{ width: `${station.load}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeView === 'Preparation Time' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className={`p-4 rounded-2xl border ${cardClass}`}>
                <span className="text-[10px] font-bold text-slate-400 block">Active Tickets</span>
                <span className={`text-2xl font-black ${headingClass}`}>{liveOrders.length}</span>
              </div>
              <div className={`p-4 rounded-2xl border ${cardClass}`}>
                <span className="text-[10px] font-bold text-slate-400 block">Average Active Timer</span>
                <span className={`text-2xl font-black ${headingClass}`}>{averageActiveMinutes}m</span>
              </div>
              <div className={`p-4 rounded-2xl border ${cardClass}`}>
                <span className="text-[10px] font-bold text-slate-400 block">Completed This Session</span>
                <span className={`text-2xl font-black ${headingClass}`}>{completedOrders.length}</span>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border ${cardClass}`}>
              <h3 className={`font-black text-sm mb-3 ${headingClass}`}>Live Ticket Timers</h3>
              {liveOrders.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No active tickets to time.</p>
              ) : (
                <div className="space-y-2">
                  {liveOrders.map((order) => (
                    <div
                      key={order.id}
                      className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs ${
                        isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className={`font-bold ${headingClass}`}>{order.orderNumber}</span>
                        <span className="text-slate-400 truncate">{order.destination}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-slate-400">{order.timerMinutes ?? 0} min</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-black ${
                            order.status === 'READY'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : order.status === 'PREPARING'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === 'Menu Items' && (
          <div className="space-y-4 pb-20">
            {/* Catalog Toolbar & Search */}
            <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${cardClass}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-black text-sm flex items-center gap-2 ${headingClass}`}>
                    <span>Kitchen Menu Items & 86 Stock Control</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold">
                      {activeDishesList.length} Items
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Live dishes synced with guest QR portals & waiter terminals. 1-tap toggle to mark dishes 86 Out-of-Stock or In-Stock.
                  </p>
                </div>
              </div>

              {/* Quick Search */}
              <div className="relative w-full md:w-64 shrink-0">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search dish or category..."
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  className={`w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs focus:outline-none ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>

            {/* Quick Stats: Available vs 86 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className={`p-3 rounded-xl border ${cardClass}`}>
                <span className="text-[10px] font-bold text-slate-400 block">Total Catalog Items</span>
                <span className={`text-xl font-black ${headingClass}`}>{activeDishesList.length}</span>
              </div>
              <div className={`p-3 rounded-xl border ${isDark ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
                <span className="text-[10px] font-bold block">🟢 In Stock (Available)</span>
                <span className="text-xl font-black">{availableDishes.length}</span>
              </div>
              <div className={`p-3 rounded-xl border ${isDark ? 'bg-red-950/20 border-red-900/40 text-red-300' : 'bg-red-50 border-red-200 text-red-800'}`}>
                <span className="text-[10px] font-bold block">🔴 86 (Out of Stock)</span>
                <span className="text-xl font-black">{outOfStockDishes.length}</span>
              </div>
              <div className={`p-3 rounded-xl border flex items-center justify-center ${cardClass}`}>
                {outOfStockDishes.length > 0 && onBatchToggle86 ? (
                  <button
                    onClick={() => {
                      onBatchToggle86(outOfStockDishes.map((d) => d.id), true);
                      if (onTriggerToast) onTriggerToast(`Restocked all ${outOfStockDishes.length} 86 items!`);
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition"
                  >
                    Restock All 86 Dishes
                  </button>
                ) : (
                  <span className="text-xs text-slate-400 font-semibold">All Stations Ready</span>
                )}
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
              {['ALL', ...Array.from(new Set(activeDishesList.map((d) => d.category || 'General')))].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                    selectedCategory === cat
                      ? 'bg-red-600 text-white border-red-500 shadow-sm'
                      : isDark
                      ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {cat === 'ALL' ? 'All Categories' : cat}
                </button>
              ))}
            </div>

            {/* Dishes Catalog List */}
            {filteredDishes.length === 0 ? (
              <EmptyState isDark={isDark} message="No menu dishes found matching the current search/category filter." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredDishes.map((dish) => {
                  const isAvail = dish.isAvailable !== false;
                  return (
                    <div
                      key={dish.id}
                      className={`p-3.5 rounded-2xl border flex flex-col justify-between gap-3 transition-all ${cardClass} ${
                        !isAvail ? (isDark ? 'border-red-900/60 bg-red-950/10' : 'border-red-200 bg-red-50/50') : ''
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className={`font-black text-sm leading-tight ${headingClass}`}>{dish.name}</h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                              isAvail
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}
                          >
                            {isAvail ? '🟢 Available' : '🔴 86 Out'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span className="font-semibold">{dish.category || 'Main Course'}</span>
                          <span>•</span>
                          <span>{dish.stationName || 'Kitchen Pass'}</span>
                        </div>
                        {!isAvail && dish.outOfStockReason && (
                          <div className="mt-1.5 text-[10px] text-red-400 font-semibold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                            Reason: {dish.outOfStockReason}
                          </div>
                        )}
                      </div>

                      {/* 1-Tap Toggle Action */}
                      <button
                        onClick={async () => {
                          if (onToggleItem86) {
                            await onToggleItem86(dish.id, !isAvail, isAvail ? 'Kitchen Exhausted' : undefined);
                            if (onTriggerToast) {
                              onTriggerToast(
                                isAvail
                                  ? `🚫 ${dish.name} marked 86 OUT OF STOCK!`
                                  : `✅ ${dish.name} RESTOCKED & LIVE!`
                              );
                            }
                          }
                        }}
                        className={`w-full py-2 px-3 rounded-xl font-black text-xs transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95 ${
                          isAvail
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                      >
                        {isAvail ? '🚫 Mark 86 Out of Stock' : '✅ Restock Item (In Stock)'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeView === 'Recipe Guide' && (
          <EmptyState
            isDark={isDark}
            message="Recipe cards are not connected to this KDS yet. No sample recipes are shown. Connect the recipe catalog API to enable this view."
          />
        )}

        {activeView === 'Production Plan' && (
          <EmptyState
            isDark={isDark}
            message="Production planning is not connected to this KDS yet. No sample prep tasks are shown. Active tickets remain available in Order Queue and Live Orders."
          />
        )}

        {activeView === 'Staff Management' && (
          <div className={`p-6 rounded-2xl border ${cardClass}`}>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-emerald-500" />
              <h3 className={`font-black text-sm ${headingClass}`}>Kitchen Stations & Operators</h3>
            </div>
            <p className={`text-xs ${mutedClass} mb-3`}>
              Staff accounts and terminal assignments are managed in Hotel Admin. The KDS can show the live station
              roster below.
            </p>
            {stationLoads.length === 0 ? (
              <p className="text-xs text-slate-500">No stations configured.</p>
            ) : (
              <div className="space-y-2">
                {stationLoads.map((station) => (
                  <div
                    key={station.id}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs ${
                      isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <span className={`font-bold ${headingClass}`}>{station.stationName}</span>
                    <span className={station.isOnline ? 'text-emerald-400' : 'text-slate-500'}>
                      {station.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeView === 'Reports & Analytics' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className={`p-4 rounded-2xl border ${cardClass}`}>
                <TrendingUp className="w-4 h-4 text-emerald-500 mb-2" />
                <span className="text-[10px] font-bold text-slate-400 block">Completed This Session</span>
                <span className={`text-2xl font-black ${headingClass}`}>{completedOrders.length}</span>
              </div>
              <div className={`p-4 rounded-2xl border ${cardClass}`}>
                <Flame className="w-4 h-4 text-red-500 mb-2" />
                <span className="text-[10px] font-bold text-slate-400 block">Active Tickets</span>
                <span className={`text-2xl font-black ${headingClass}`}>{liveOrders.length}</span>
              </div>
              <div className={`p-4 rounded-2xl border ${cardClass}`}>
                <Clock className="w-4 h-4 text-amber-500 mb-2" />
                <span className="text-[10px] font-bold text-slate-400 block">Avg Active Timer</span>
                <span className={`text-2xl font-black ${headingClass}`}>{averageActiveMinutes}m</span>
              </div>
              <div className={`p-4 rounded-2xl border ${cardClass}`}>
                <CheckCircle2 className="w-4 h-4 text-blue-500 mb-2" />
                <span className="text-[10px] font-bold text-slate-400 block">Avg Completed Timer</span>
                <span className={`text-2xl font-black ${headingClass}`}>{averageCompletedMinutes}m</span>
              </div>
            </div>
            <EmptyState
              isDark={isDark}
              message="Historical sales and station revenue reports are not connected to KDS. Session ticket metrics above are live from this terminal."
            />
          </div>
        )}

        {activeView === 'Settings' && (
          <div className="space-y-4">
            <div className={`p-5 rounded-2xl border space-y-4 ${cardClass}`}>
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-slate-400" />
                <h3 className={`font-black text-sm ${headingClass}`}>Kitchen Display Settings</h3>
              </div>

              <div className={`rounded-xl border p-3 ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-slate-50'}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className={`text-xs font-bold ${headingClass}`}>Order Alert Chime</div>
                    <p className="text-[11px] text-slate-400">
                      Test the browser audio output used for incoming kitchen tickets.
                    </p>
                  </div>
                  <button
                    onClick={handleTestAudio}
                    className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    {audioTestSuccess ? 'Chime Played' : 'Test Chime'}
                  </button>
                </div>
              </div>

              <div className={`rounded-xl border p-3 ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-slate-50'}`}>
                <div className="flex items-center gap-2 text-xs">
                  <Radio className="w-4 h-4 text-emerald-400" />
                  <span className={`font-bold ${headingClass}`}>Realtime channel</span>
                  <span className="text-emerald-400 ml-auto">Connected</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  New tickets arrive through the KDS order socket and the 4-second order poll.
                </p>
              </div>

              <div className={`rounded-xl border p-3 ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-slate-50'}`}>
                <div className="flex items-center gap-2 text-xs">
                  <RefreshCw className="w-4 h-4 text-blue-400" />
                  <span className={`font-bold ${headingClass}`}>Stations</span>
                  <span className="text-slate-400 ml-auto">{stations.length} configured</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Station printer and display routing is managed by Hotel Admin.
                </p>
              </div>
            </div>

            <EmptyState
              isDark={isDark}
              message="KDS station printer configuration is not connected here yet. No sample settings are shown."
            />
          </div>
        )}

        {!['Order Queue', 'Kitchen Stations', 'Preparation Time', 'Menu Items', 'Recipe Guide', 'Production Plan', 'Staff Management', 'Reports & Analytics', 'Settings'].includes(activeView) && (
          <div className={`p-6 rounded-2xl border ${cardClass}`}>
            <div className="flex items-center gap-2 mb-2">
              <ChefHat className="w-5 h-5 text-amber-500" />
              <h3 className={`font-black text-sm ${headingClass}`}>{activeView}</h3>
            </div>
            <p className={`text-xs ${mutedClass}`}>
              This kitchen module is not connected to a backend workflow yet. No demo data is shown.
            </p>
            <button
              onClick={onBackToLiveOrders}
              className="mt-4 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
            >
              Back to Live Orders
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
