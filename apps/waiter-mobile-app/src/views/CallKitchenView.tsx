import { API_BASE_URL } from '../config/api';
import { waiterFetch } from '../lib/waiterApi';
import React, { useState } from 'react';
import {
  ChefHat,
  Radio,
  Send,
  AlertTriangle,
  Clock,
  Flame,
  Volume2,
  Pause,
  UtensilsCrossed
} from 'lucide-react';

export interface KitchenBuzzItem {
  id?: string;
  station: string;
  target: string;
  msg: string;
  time: string;
  priority?: string;
  status?: 'PENDING' | 'ACKNOWLEDGED';
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

interface CallKitchenViewProps {
  isDark: boolean;
  triggerToast: (msg: string) => void;
  onSendKitchenBuzzer?: (buzzData: {
    station: string;
    table: string;
    message: string;
    priority?: string;
  }) => Promise<void> | void;
  kitchenBuzzers?: any[];
  assignedTables?: { id: number; name: string }[];
}

export const CallKitchenView: React.FC<CallKitchenViewProps> = ({
  isDark,
  triggerToast,
  onSendKitchenBuzzer,
  kitchenBuzzers = [],
  assignedTables = [],
}) => {
  const [station, setStation] = useState('Executive Chef Pass');
  const [table, setTable] = useState(() =>
    assignedTables.length > 0 ? `Table ${assignedTables[0].name}` : 'Table 4'
  );
  const [customMsg, setCustomMsg] = useState('');
  const [isSending, setIsSending] = useState(false);

  const [localBuzzLogs, setLocalBuzzLogs] = useState<KitchenBuzzItem[]>([
    { station: 'Executive Chef Pass', target: 'Table 8', msg: 'Rush order alert! Guest has early flight', time: '01:52 PM', status: 'ACKNOWLEDGED', acknowledgedBy: 'Executive Chef' },
    { station: 'Tandoor Station', target: 'Table 5', msg: 'Make Naan extra crisp & well done', time: '01:30 PM', status: 'PENDING' },
  ]);

  // Combine props kitchenBuzzers with localBuzzLogs
  const allBuzzLogs: KitchenBuzzItem[] = [
    ...kitchenBuzzers.map((b: any) => ({
      id: b.id,
      station: b.station || 'Executive Chef Pass',
      target: b.table || 'Table 5',
      msg: b.message,
      time: b.createdAt ? new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
      priority: b.priority,
      status: b.status || 'PENDING',
      acknowledgedBy: b.acknowledgedBy,
      acknowledgedAt: b.acknowledgedAt,
    })),
    ...localBuzzLogs.filter(local => !kitchenBuzzers.some((k: any) => k.message === local.msg && k.table === local.target)),
  ];

  const urgentPresets = [
    { title: 'Rush Order!', desc: 'Guest in hurry / has appointment', color: 'from-rose-600 to-red-700', icon: Flame, priority: 'URGENT' },
    { title: 'Hold Starters', desc: 'Hold until guest signals ready', color: 'from-amber-600 to-orange-700', icon: Pause, priority: 'HIGH' },
    { title: 'Allergen Alert', desc: 'Strict NO PEANUT / DAIRY in dish', color: 'from-purple-600 to-indigo-700', icon: AlertTriangle, priority: 'URGENT' },
    { title: 'Overdue Alert', desc: 'Food prep time exceeded 20 mins', color: 'from-blue-600 to-cyan-700', icon: Clock, priority: 'HIGH' },
    { title: 'Extra Gravy / Dips', desc: 'Bring hot mint chutney to pass', color: 'from-emerald-600 to-teal-700', icon: UtensilsCrossed, priority: 'NORMAL' },
  ];

  const handleSendBuzzer = async (msgText: string, prio: string = 'HIGH') => {
    const message = msgText || customMsg || 'Attention Kitchen Hot Pass!';
    setIsSending(true);

    try {
      if (onSendKitchenBuzzer) {
        await onSendKitchenBuzzer({
          station,
          table,
          message,
          priority: prio,
        });
      } else {
        // Fallback direct HTTP
        await waiterFetch(`${API_BASE_URL}/pos/kitchen/buzzer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            station,
            table,
            message,
            priority: prio,
            waiterName: 'Ravi Kumar',
            waiterId: 'W-101',
          }),
        }).catch(() => {});
      }

      setLocalBuzzLogs((prev) => [
        {
          station,
          target: table,
          msg: message,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'PENDING',
          priority: prio,
        },
        ...prev,
      ]);

      triggerToast(`🚨 Buzzer sent directly to Kitchen KDS (${station} for ${table})!`);
      setCustomMsg('');
    } catch (err: any) {
      triggerToast(`Error sending buzzer: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden p-3 sm:p-5 gap-3 sm:gap-4">
      {/* Header */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
        isDark ? 'bg-[#121520] border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-500 flex items-center justify-center font-bold">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className={`font-black text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Kitchen Intercom & Pass Dispatcher
            </h2>
            <p className="text-xs text-slate-400">
              Instant two-way audio buzzer and hot pass communication to chef terminals
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${
            isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
          }`}>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Kitchen KDS Intercom Online
          </span>
        </div>
      </div>

      {/* Main 2-column interface */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 overflow-y-auto pr-1 custom-scrollbar pb-24 lg:pb-6">
        {/* Left Column: Presets & Composer (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Quick Presets */}
          <div className={`p-5 rounded-2xl border space-y-3 ${
            isDark ? 'bg-[#181c2b] border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
          }`}>
            <h3 className={`font-black text-sm flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <Flame className="w-4 h-4 text-orange-500" />
              <span>One-Click Priority Presets</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {urgentPresets.map((p, idx) => {
                const Icon = p.icon;
                return (
                  <button
                    key={idx}
                    disabled={isSending}
                    onClick={() => handleSendBuzzer(`${p.title} - ${p.desc}`, p.priority)}
                    className={`p-3 rounded-xl bg-gradient-to-br ${p.color} text-white text-left flex flex-col justify-between gap-1.5 shadow-md hover:scale-102 active:scale-98 disabled:opacity-50 transition`}
                  >
                    <span className="font-black text-xs flex items-center gap-1.5">
                      <Icon className="w-4 h-4 shrink-0 text-white/90" />
                      <span>{p.title}</span>
                    </span>
                    <span className="text-[10px] text-white/80">{p.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Composer */}
          <div className={`p-5 rounded-2xl border space-y-4 ${
            isDark ? 'bg-[#181c2b] border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
          }`}>
            <h3 className={`font-black text-sm flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <ChefHat className="w-4 h-4 text-orange-500" />
              <span>Compose Custom Station Buzzer</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Target Kitchen Station</label>
                <select
                  value={station}
                  onChange={(e) => setStation(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs font-bold focus:outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="Executive Chef Pass">Executive Chef Hot Pass</option>
                  <option value="Tandoor Station">Tandoor & Clay Oven</option>
                  <option value="Curries & Gravy">Main Curries & Gravy</option>
                  <option value="Chinese & Wok">Chinese & Wok Section</option>
                  <option value="Bar & Beverage">Bar & Beverage Station</option>
                  <option value="Desserts & Pastry">Desserts & Ice Cream</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>My Assigned Table</label>
                <select
                  value={table}
                  onChange={(e) => setTable(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs font-bold focus:outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  {(assignedTables.length > 0 ? assignedTables.map(t => t.id) : [1, 2, 3, 4, 5, 6]).map((n) => (
                    <option key={n} value={`Table ${n}`}>Table {n} (My Assigned Table)</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Message to Chef</label>
              <textarea
                rows={3}
                placeholder="Type urgent instructions, allergen details, spice adjustment..."
                value={customMsg}
                onChange={(e) => setCustomMsg(e.target.value)}
                className={`w-full p-3 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <button
              onClick={() => handleSendBuzzer(customMsg, 'HIGH')}
              disabled={isSending}
              className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-98 disabled:opacity-50 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition"
            >
              <Send className="w-4 h-4" />
              <span>{isSending ? 'Transmitting to KDS Pass...' : 'Send Audio Buzzer & Alert to KDS'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Dispatch Logs (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className={`p-5 rounded-2xl border space-y-3 ${
            isDark ? 'bg-[#181c2b] border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
          }`}>
            <div className="flex items-center justify-between">
              <h3 className={`font-black text-sm flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <Clock className="w-4 h-4 text-orange-500" />
                <span>Live Kitchen Intercom Buzzes</span>
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {allBuzzLogs.length} Logged
              </span>
            </div>

            <div className="space-y-2">
              {allBuzzLogs.map((log, i) => (
                <div
                  key={log.id || i}
                  className={`p-3 rounded-xl border text-xs space-y-1.5 transition-colors ${
                    log.status === 'ACKNOWLEDGED'
                      ? isDark ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-emerald-50/70 border-emerald-200'
                      : isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-orange-600">{log.station}</span>
                    <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{log.time}</span>
                  </div>
                  <div className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{log.msg}</div>
                  <div className="flex items-center justify-between pt-1">
                    <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Target: <strong>{log.target}</strong></span>
                    {log.status === 'ACKNOWLEDGED' ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        ✓ Chef Acknowledged
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1 animate-pulse">
                        <Radio className="w-2.5 h-2.5" /> Delivered to KDS Pass
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
