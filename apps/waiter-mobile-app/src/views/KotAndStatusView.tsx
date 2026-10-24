import React, { useState } from 'react';
import {
  Receipt,
  Printer,
  Clock,
  Radio,
  ChefHat,
  CheckCircle2,
  AlertTriangle,
  Flame
} from 'lucide-react';

interface KotTicket {
  kotId: string;
  table: string;
  station: string;
  timeAgo: string;
  status: 'FIRED' | 'PREPARING' | 'READY';
  items: { name: string; qty: number; notes?: string }[];
}

const SAMPLE_KOTS: KotTicket[] = [
  {
    kotId: 'KOT-401',
    table: 'Table 5',
    station: 'Curries & Tandoor',
    timeAgo: '12 min ago',
    status: 'PREPARING',
    items: [
      { name: 'Paneer Butter Masala', qty: 1, notes: 'Medium spice' },
      { name: 'Butter Naan', qty: 2, notes: 'Crisp' },
      { name: 'Dal Makhani', qty: 1 },
    ],
  },
  {
    kotId: 'KOT-402',
    table: 'Room 304',
    station: 'Main Kitchen',
    timeAgo: '5 min ago',
    status: 'FIRED',
    items: [
      { name: 'Chicken Biryani', qty: 1, notes: 'Raita on side' },
      { name: 'Cold Coffee', qty: 1 },
    ],
  },
  {
    kotId: 'KOT-403',
    table: 'Table 8',
    station: 'Bar & Desserts',
    timeAgo: '2 min ago',
    status: 'READY',
    items: [
      { name: 'Gulab Jamun with Ice Cream', qty: 2 },
      { name: 'Fresh Lime Soda', qty: 2, notes: 'Sweet & salted' },
    ],
  },
  {
    kotId: 'KOT-404',
    table: 'Table 12',
    station: 'Starters & Chinese',
    timeAgo: '8 min ago',
    status: 'PREPARING',
    items: [
      { name: 'Chicken Tikka', qty: 1, notes: 'Extra mint dip' },
      { name: 'Masala Papad', qty: 2 },
    ],
  },
];

interface KotAndStatusViewProps {
  isDark: boolean;
  triggerToast: (msg: string) => void;
}

export const KotAndStatusView: React.FC<KotAndStatusViewProps> = ({
  isDark,
  triggerToast,
}) => {
  const [stationFilter, setStationFilter] = useState('All');
  const [kots, setKots] = useState<KotTicket[]>(SAMPLE_KOTS);

  const stations = ['All', 'Curries & Tandoor', 'Main Kitchen', 'Bar & Desserts', 'Starters & Chinese'];

  const filteredKots = kots.filter((k) => {
    if (stationFilter !== 'All' && k.station !== stationFilter) return false;
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden p-5 gap-4">
      {/* Header */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
        isDark ? 'bg-[#121520] border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-500 flex items-center justify-center font-bold">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`font-black text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Kitchen Order Tickets (KOT) Monitor
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-orange-500 text-white">
                {kots.length} Live Tickets
              </span>
            </div>
            <p className="text-xs text-slate-400">
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
                  ? 'bg-orange-500 text-white shadow-sm'
                  : isDark
                  ? 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredKots.map((kot) => {
            const isReady = kot.status === 'READY';
            const isFired = kot.status === 'FIRED';

            return (
              <div
                key={kot.kotId}
                className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 transition-all hover:shadow-lg ${
                  isReady
                    ? isDark
                      ? 'bg-emerald-950/20 border-emerald-500/50'
                      : 'bg-emerald-50/60 border-emerald-300'
                    : isDark
                    ? 'bg-[#181c2b] border-slate-800'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-700/30">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-orange-500">
                        {kot.kotId}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                        isReady
                          ? 'bg-emerald-500 text-white'
                          : isFired
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {kot.status}
                      </span>
                    </div>
                    <span className="font-bold text-xs text-slate-300">
                      {kot.table}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 py-2">
                    <span className="flex items-center gap-1">
                      <ChefHat className="w-3.5 h-3.5 text-orange-400" />
                      <span>{kot.station}</span>
                    </span>
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <Clock className="w-3 h-3" /> {kot.timeAgo}
                    </span>
                  </div>

                  {/* Items breakdown */}
                  <div className={`p-3 rounded-xl border space-y-2 my-1 ${
                    isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    {kot.items.map((it, idx) => (
                      <div key={idx} className="text-xs">
                        <div className="flex items-center justify-between font-bold">
                          <span className={isDark ? 'text-slate-100' : 'text-slate-900'}>{it.name}</span>
                          <span className="text-orange-500">x{it.qty}</span>
                        </div>
                        {it.notes && (
                          <div className="text-[11px] text-amber-500 italic mt-0.5">
                            Note: "{it.notes}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700/20">
                  <button
                    onClick={() => triggerToast(`Thermal KOT reprinted for ${kot.kotId} (${kot.station})`)}
                    className={`py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 transition ${
                      isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Printer className="w-3.5 h-3.5 text-blue-500" />
                    <span>Reprint KOT</span>
                  </button>
                  <button
                    onClick={() => triggerToast(`Buzzer dispatched to ${kot.station} for ${kot.kotId}!`)}
                    className={`py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 transition ${
                      isDark ? 'bg-orange-950/30 border-orange-800 text-orange-400 hover:bg-orange-900/50' : 'bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100'
                    }`}
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>Buzz Station</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
