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
} from 'lucide-react';

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
        isDark ? 'border-slate-700 bg-[#181c2b] text-slate-500' : 'border-slate-300 bg-white text-slate-500'
      }`}
    >
      {message}
    </div>
  );
}

export const KitchenViewsHub: React.FC<KitchenViewsHubProps> = ({
  activeView,
  isDark,
  liveOrders,
  completedOrders,
  stations,
  onBackToLiveOrders,
  onOpen86Manager,
  onTriggerToast,
}) => {
  const [search, setSearch] = useState('');
  const [audioTestSuccess, setAudioTestSuccess] = useState(false);

  const cardClass = isDark
    ? 'bg-[#181c2b] border-slate-800'
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
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
          >
            🚫 86 Item Manager
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar space-y-4 pb-8">
        {activeView === 'Order Queue' && (
          <div className="space-y-4">
            <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${cardClass}`}>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-rose-500" />
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
                          <span className="text-xs text-rose-500 font-bold ml-2">● {order.destination}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            priority === 'URGENT'
                              ? 'bg-rose-600 text-white animate-pulse'
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
                          Waiting: <strong className="text-rose-400">{order.timeAgo}</strong>
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
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
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
                                : 'bg-rose-500/20 text-rose-400'
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
          <div className={`p-6 rounded-2xl border ${cardClass}`}>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-blue-500" />
              <h3 className={`font-black text-sm ${headingClass}`}>Menu Item Availability</h3>
            </div>
            <p className={`text-xs ${mutedClass}`}>
              Menu catalog editing is handled by the Hotel Admin menu module. From the kitchen, use the 86 Item
              Manager to mark dishes unavailable or restock them across all ordering channels.
            </p>
            {onOpen86Manager && (
              <button
                onClick={onOpen86Manager}
                className="mt-4 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
              >
                Open 86 Item Manager
              </button>
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
                <Flame className="w-4 h-4 text-rose-500 mb-2" />
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
              className="mt-4 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
            >
              Back to Live Orders
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
