import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Printer,
  Clock,
  Radio,
  ChefHat,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Loader2
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { waiterFetch } from '../lib/waiterApi';

interface KotTicket {
  kotId: string;
  table: string;
  station: string;
  timeAgo: string;
  status: 'FIRED' | 'PREPARING' | 'READY';
  items: { name: string; qty: number; notes?: string }[];
}

interface KotAndStatusViewProps {
  isDark?: boolean;
  triggerToast: (msg: string) => void;
}

export const KotAndStatusView: React.FC<KotAndStatusViewProps> = ({
  triggerToast,
}) => {
  const [stationFilter, setStationFilter] = useState('All');
  const [stations, setStations] = useState<string[]>(['All', 'Main Kitchen']);
  const [kots, setKots] = useState<KotTicket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchKots = async () => {
    try {
      const hotelId = localStorage.getItem('spicehub_hotel_id') || '';
      const qs = hotelId ? `?hotelId=${encodeURIComponent(hotelId)}` : '';

      // Fetch stations
      try {
        const stRes = await waiterFetch(`${API_BASE_URL}/pos/kds/stations${qs}`);
        if (stRes.ok) {
          const stData = await stRes.json();
          if (stData.success && Array.isArray(stData.data) && stData.data.length > 0) {
            const names = stData.data.map((s: any) => s.stationName || s.name).filter(Boolean);
            if (names.length > 0) {
              setStations(['All', ...Array.from(new Set(names)) as string[]]);
            }
          }
        }
      } catch (err) {
        console.warn('Stations fetch error:', err);
      }

      // Fetch live KOT orders
      const ordersRes = await waiterFetch(`${API_BASE_URL}/pos/kds/orders${hotelId ? `?status=ALL&hotelId=${encodeURIComponent(hotelId)}` : '?status=ALL'}`);
      if (ordersRes.ok) {
        const body = await ordersRes.json();
        if (body.success && Array.isArray(body.data)) {
          // Filter to active orders (PLACED, CONFIRMED, PREPARING, COOKING, READY)
          const activeOrders = body.data.filter((o: any) => 
            ['PLACED', 'CONFIRMED', 'PREPARING', 'COOKING', 'IN_PROGRESS', 'READY'].includes(o.orderStatus)
          );

          const mapped: KotTicket[] = activeOrders.map((ord: any) => {
            const table = ord.tableId?.tableNumber || ord.tableNumber
              ? `Table ${ord.tableId?.tableNumber || ord.tableNumber}`
              : ord.roomId?.roomNumber
              ? `Room ${ord.roomId.roomNumber}`
              : 'Dine-In';

            const createdTime = ord.placedAt || ord.createdAt || ord.updatedAt;
            let timeAgo = 'Just now';
            if (createdTime) {
              const diffMs = Date.now() - new Date(createdTime).getTime();
              const mins = Math.max(0, Math.floor(diffMs / 60000));
              timeAgo = mins === 0 ? 'Just now' : mins < 60 ? `${mins} min ago` : `${Math.floor(mins / 60)}h ago`;
            }

            const rawStatus = ord.orderStatus || 'FIRED';
            const status: 'FIRED' | 'PREPARING' | 'READY' =
              rawStatus === 'READY' ? 'READY' :
              ['PREPARING', 'COOKING', 'IN_PROGRESS'].includes(rawStatus) ? 'PREPARING' :
              'FIRED';

            const items = Array.isArray(ord.items) && ord.items.length > 0
              ? ord.items.map((i: any) => ({
                  name: i.name || 'Dish',
                  qty: Number(i.quantity || 1),
                  notes: i.notes || i.specialInstructions || (i.hasAllergenAlert ? 'Allergen Alert' : undefined),
                }))
              : [{ name: 'Kitchen Order', qty: 1 }];

            return {
              kotId: ord.orderNumber || String(ord._id || '').slice(-6).toUpperCase() || 'KOT',
              table,
              station: ord.stationName || 'Main Kitchen',
              timeAgo,
              status,
              items,
            };
          });

          setKots(mapped);
        }
      }
    } catch (err) {
      console.warn('Failed to load KOTs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchKots();
    const interval = setInterval(fetchKots, 8000);
    return () => clearInterval(interval);
  }, []);

  const filteredKots = kots.filter((k) => {
    if (stationFilter !== 'All' && k.station !== stationFilter) return false;
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden p-5 gap-4">
      {/* Header */}
      <div className="p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors bg-white border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-black text-base text-slate-900">
                Kitchen Order Tickets (KOT) Monitor
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-orange-500 text-white">
                {kots.length} Live Tickets
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Station-wise ticket execution tracking, cooking modifiers, and reprint tokens
            </p>
          </div>
        </div>

        {/* Station Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {stations.map((s) => (
            <button
              key={s}
              onClick={() => setStationFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                stationFilter === s
                  ? 'bg-[#2E6B4C] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* KOT Cards Grid */}
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
        {loading ? (
          <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-[#2E6B4C]" />
            <p className="text-sm font-semibold">Loading live kitchen tickets...</p>
          </div>
        ) : filteredKots.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            <ChefHat className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
            <p className="text-sm font-semibold text-slate-700">No active kitchen orders</p>
            <p className="text-xs text-slate-400 mt-1">Orders sent from tables or room service will appear here in real time</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredKots.map((kot) => {
              const isReady = kot.status === 'READY';
              const isFired = kot.status === 'FIRED';

              return (
                <div
                  key={kot.kotId}
                  className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 transition-all hover:shadow-lg ${
                    isReady
                      ? 'bg-emerald-50/70 border-emerald-300'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-[#2E6B4C]">
                          {kot.kotId}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                          isReady
                            ? 'bg-emerald-600 text-white'
                            : isFired
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {kot.status}
                        </span>
                      </div>
                      <span className="font-bold text-xs text-slate-700">
                        {kot.table}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 py-2">
                      <span className="flex items-center gap-1 font-medium">
                        <ChefHat className="w-3.5 h-3.5 text-[#2E6B4C]" />
                        <span>{kot.station}</span>
                      </span>
                      <span className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
                        <Clock className="w-3 h-3" /> {kot.timeAgo}
                      </span>
                    </div>

                    {/* Items breakdown */}
                    <div className="p-3 rounded-xl border space-y-2 my-1 bg-slate-50 border-slate-100">
                      {kot.items.map((it, idx) => (
                        <div key={idx} className="text-xs">
                          <div className="flex items-center justify-between font-bold">
                            <span className="text-slate-800">{it.name}</span>
                            <span className="text-[#2E6B4C]">x{it.qty}</span>
                          </div>
                          {it.notes && (
                            <div className="text-[11px] text-amber-700 italic mt-0.5">
                              Note: "{it.notes}"
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => triggerToast(`Thermal KOT reprinted for ${kot.kotId} (${kot.station})`)}
                      className="py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 transition bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                    >
                      <Printer className="w-3.5 h-3.5 text-[#2E6B4C]" />
                      <span>Reprint KOT</span>
                    </button>
                    <button
                      onClick={() => triggerToast(`Buzzer dispatched to ${kot.station} for ${kot.kotId}!`)}
                      className="py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 transition bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>Buzz Station</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
