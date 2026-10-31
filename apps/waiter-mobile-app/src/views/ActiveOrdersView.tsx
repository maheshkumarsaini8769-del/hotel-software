import React, { useState } from 'react';
import {
  Clock,
  ChefHat,
  CheckCircle2,
  Printer,
  Bell,
  Search,
  Filter,
  Flame,
  Radio
} from 'lucide-react';

interface ActiveOrderTicket {
  id: string;
  orderNumber: string;
  destination: string;
  timeAgo: string;
  status: 'Preparing' | 'Ready' | 'Serving';
  progress?: number;
  items: string[];
}

interface ActiveOrdersViewProps {
  isDark: boolean;
  orders: ActiveOrderTicket[];
  onServeOrder: (id: string, orderNumber: string, destination: string) => void;
  onMarkOrderReady: (id: string, orderNumber: string) => void;
  triggerToast: (msg: string) => void;
}

export const ActiveOrdersView: React.FC<ActiveOrdersViewProps> = ({
  isDark,
  orders,
  onServeOrder,
  onMarkOrderReady,
  triggerToast,
}) => {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  const filteredOrders = orders.filter((o) => {
    if (filter === 'Ready' && o.status !== 'Ready') return false;
    if (filter === 'Preparing' && o.status !== 'Preparing') return false;
    if (filter === 'Dine-In' && !o.destination.startsWith('Table')) return false;
    if (filter === 'Room Service' && !o.destination.startsWith('Room')) return false;
    if (search && !o.orderNumber.toLowerCase().includes(search.toLowerCase()) && !o.destination.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden p-5 gap-4">
      {/* Header */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-500 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`font-black text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Active Orders & Kitchen Hot Pass
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-orange-500 text-white">
                {orders.length} In Progress
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Live preparation status across Tandoor, Curries, and Bar stations
            </p>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {['All', 'Ready', 'Preparing', 'Dine-In', 'Room Service'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                filter === f
                  ? 'bg-orange-500 text-white shadow-sm'
                  : isDark
                  ? 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Grid */}
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
        {filteredOrders.length === 0 ? (
          <div className={`h-64 flex flex-col items-center justify-center rounded-2xl border text-center p-6 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
          }`}>
            <Clock className="w-12 h-12 text-slate-600 mb-2 opacity-50" />
            <h3 className="font-bold text-sm">No Active Orders</h3>
            <p className="text-xs mt-1">There are currently no active kitchen tickets in this view.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map((order) => {
              const isReady = order.status === 'Ready';

              return (
                <div
                  key={order.id}
                  className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 transition-all hover:shadow-lg ${
                    isReady
                      ? isDark
                        ? 'bg-emerald-950/20 border-emerald-500/50 shadow-emerald-950/20'
                        : 'bg-emerald-50/60 border-emerald-300'
                      : isDark
                      ? 'bg-slate-900 border-slate-800'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div>
                    {/* Header line */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-700/30">
                      <div className="flex items-center gap-2">
                        <span className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {order.orderNumber}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                          isReady
                            ? 'bg-emerald-500 text-white animate-pulse'
                            : 'bg-amber-500/20 text-amber-500'
                        }`}>
                          {order.status.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-orange-500">
                        {order.destination}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 py-1.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Fired {order.timeAgo}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400">
                        Pass: Hot Station 1
                      </span>
                    </div>

                    {/* Progress Bar */}
                    {order.progress && !isReady && (
                      <div className="my-2 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Preparation Progress</span>
                          <span className="font-bold text-amber-500">{order.progress}%</span>
                        </div>
                        <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                          <div
                            className="bg-amber-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${order.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Items */}
                    <div className={`p-3 rounded-xl border space-y-1.5 my-1.5 ${
                      isDark ? 'bg-slate-900/60 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}>
                      {order.items.map((it, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs font-medium">
                          <span className="truncate">{it}</span>
                          <span className="text-emerald-500 text-xs">✓ Plated</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 pt-2 border-t border-slate-700/20">
                    {isReady ? (
                      <button
                        onClick={() => onServeOrder(order.id, order.orderNumber, order.destination)}
                        className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-900/30 transition"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Serve to Table (Clear 60s SLA)</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onMarkOrderReady(order.id, order.orderNumber)}
                        className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Mark Food Ready at Pass</span>
                      </button>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => triggerToast(`Thermal KOT printed for ${order.orderNumber}`)}
                        className={`py-1.5 rounded-xl font-bold text-xs border flex items-center justify-center gap-1 transition ${
                          isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <Printer className="w-3.5 h-3.5 text-blue-500" />
                        <span>View KOT</span>
                      </button>
                      <button
                        onClick={() => triggerToast(`Kitchen buzzer sent for ${order.orderNumber}`)}
                        className={`py-1.5 rounded-xl font-bold text-xs border flex items-center justify-center gap-1 transition ${
                          isDark ? 'bg-slate-800 border-slate-700 text-orange-400 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-orange-600 hover:bg-slate-200'
                        }`}
                      >
                        <Radio className="w-3.5 h-3.5" />
                        <span>Buzz Kitchen</span>
                      </button>
                    </div>
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
