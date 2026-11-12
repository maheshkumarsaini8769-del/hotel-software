import React, { useState, useEffect } from 'react';
import {
  Flame,
  Clock,
  CheckCircle2,
  Bell,
  Search,
  ChefHat,
  Printer,
  Sparkles,
  Zap,
  PhoneCall,
  Check,
  ShieldCheck,
  UtensilsCrossed,
  Plus
} from 'lucide-react';

export interface OrderTicketItem {
  id: string;
  orderNumber: string;
  destination: string;
  timeAgo: string;
  status: 'Ready' | 'Preparing' | 'Served';
  progress?: number;
  items: string[];
  station?: string;
}

interface LiveOrdersAndKotViewProps {
  isDark?: boolean;
  initialTab?: 'All' | 'Ready' | 'Preparing' | 'Served';
  readyPickups?: {
    id: string;
    orderNumber: string;
    destination: string;
    timeAgo?: string;
    items: string[];
    station?: string;
  }[];
  servedOrders?: {
    id: string;
    orderNumber: string;
    destination: string;
    timeAgo?: string;
    items: string[];
    station?: string;
  }[];
  cookingOrders?: {
    id: string;
    orderNumber: string;
    destination: string;
    timeAgo: string;
    progress?: number;
    items: string[];
    station?: string;
  }[];
  // Legacy props compatibility
  newOrders?: any[];
  activeOrders?: any[];
  onAcceptOrder?: (id: string, orderNumber: string) => void;
  onServeOrder: (id: string, orderNumber: string, destination: string) => void;
  onMarkOrderReady?: (id: string, orderNumber: string) => void;
  onNudgeKitchen?: (orderNumber: string) => void;
  onPunchKot: (destination: string) => void;
  triggerToast: (msg: string) => void;
}

export const LiveOrdersAndKotView: React.FC<LiveOrdersAndKotViewProps> = ({
  initialTab,
  readyPickups = [],
  servedOrders = [],
  cookingOrders = [],
  activeOrders = [],
  onServeOrder,
  onPunchKot,
  triggerToast,
}) => {
  const [activeTab, setActiveTab] = useState<'All' | 'Ready' | 'Preparing' | 'Served'>(initialTab || 'Ready');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [search, setSearch] = useState('');

  // Extract ready pickups (from prop or activeOrders with status Ready)
  const effectiveReady: OrderTicketItem[] = readyPickups.length > 0
    ? readyPickups.map((p) => ({
        id: p.id,
        orderNumber: p.orderNumber,
        destination: p.destination,
        timeAgo: p.timeAgo || 'Ready at Hot Pass',
        status: 'Ready' as const,
        items: p.items,
        station: p.station || 'Main Kitchen Pass',
      }))
    : activeOrders
        .filter((o) => o.status === 'Ready')
        .map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          destination: o.destination,
          timeAgo: o.timeAgo,
          status: 'Ready' as const,
          items: o.items,
          station: 'Kitchen Hot Pass',
        }));

  // Extract cooking orders (from prop or activeOrders with status Preparing)
  const effectiveCooking: OrderTicketItem[] = cookingOrders.length > 0
    ? cookingOrders.map((c) => ({
        id: c.id,
        orderNumber: c.orderNumber,
        destination: c.destination,
        timeAgo: c.timeAgo,
        status: 'Preparing' as const,
        progress: c.progress || 50,
        items: c.items,
        station: c.station || 'Chef Station',
      }))
    : activeOrders
        .filter((o) => o.status === 'Preparing')
        .map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          destination: o.destination,
          timeAgo: o.timeAgo,
          status: 'Preparing' as const,
          progress: o.progress || 50,
          items: o.items,
          station: 'Chef Station',
        }));

  // Served tickets come from the live order feed (never fabricated).
  const effectiveServed: OrderTicketItem[] = servedOrders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    destination: order.destination,
    timeAgo: order.timeAgo || 'Served',
    status: 'Served' as const,
    items: order.items,
    station: order.station || 'Dining Floor',
  }));

  const allTickets: OrderTicketItem[] = [
    ...effectiveReady,
    ...effectiveCooking,
    ...effectiveServed,
  ];

  const readyCount = effectiveReady.length;
  const prepCount = effectiveCooking.length;
  const servedCount = effectiveServed.length;

  const filteredTickets = allTickets.filter((t) => {
    if (activeTab === 'Ready' && t.status !== 'Ready') return false;
    if (activeTab === 'Preparing' && t.status !== 'Preparing') return false;
    if (activeTab === 'Served' && t.status !== 'Served') return false;
    if (search) {
      const q = search.toLowerCase();
      return t.orderNumber.toLowerCase().includes(q) || t.destination.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden p-3 sm:p-5 gap-3 sm:gap-4">
      {/* Header Banner */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
 'bg-white border-slate-200'
 }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className={`font-black text-base ${'text-slate-900'}`}>
              Kitchen Food Pickups & KOT Cooking Tracking
            </h2>
            <p className="text-xs text-slate-400">
              Dishes dispatched by Kitchen KDS for table serving & live Chef cooking progress
            </p>
          </div>
        </div>

        {/* Counter Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${
 'bg-slate-100 border-slate-200 text-slate-800'
 }`}>
            Total KOTs: <span className="font-black text-orange-500">{allTickets.length}</span>
          </span>
          <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${
 'bg-emerald-100 border-emerald-300 text-emerald-800 font-bold'
 }`}>
            Ready Pickups (Hot Pass): <span className="font-black">{readyCount}</span>
          </span>
          <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${
 'bg-amber-100 border-amber-300 text-amber-800 font-bold'
 }`}>
            Cooking in Kitchen: <span className="font-black">{prepCount}</span>
          </span>
          <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${
 'bg-[#EDF4EC] border-[#CFE0D2] text-[#123C2B] font-bold'
 }`}>
            Served: <span className="font-black">{servedCount}</span>
          </span>
        </div>
      </div>

      {/* Direct Flow Notice: No Customer Approval Required */}
      <div className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
 'bg-emerald-50 border-emerald-300 text-emerald-950'
 }`}>
        <div className="flex items-center gap-2">
          <Zap className={`w-4 h-4 shrink-0 ${'text-emerald-600'}`} />
          <span>
            <strong>Direct Kitchen KOT Routing:</strong> Customer QR orders go directly to Kitchen KDS. Waiters receive food alerts <strong>ONLY from Kitchen Hot Pass</strong> when dishes are cooked and ready to serve.
          </span>
        </div>
        <span className={`hidden sm:inline-flex items-center gap-1 text-[10px] uppercase font-mono font-black px-2 py-0.5 rounded border shrink-0 ${
 'bg-emerald-100 text-emerald-800 border-emerald-300'
 }`}>
          <ShieldCheck className="w-3 h-3 text-emerald-500" />
          Direct Chef Dispatch
        </span>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1">
          {[
            { id: 'Ready', label: `Ready (${readyCount})`, badgeColor: 'bg-emerald-500' },
            { id: 'Preparing', label: `Cooking (${prepCount})`, badgeColor: 'bg-amber-500' },
            { id: 'All', label: `All Orders (${allTickets.length})`, badgeColor: 'bg-slate-500' },
            { id: 'Served', label: `Served (${servedCount})`, badgeColor: 'bg-[#123C2B]' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => onPunchKot('Table 1')}
            className="py-1.5 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Take Order</span>
          </button>
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search order # or table..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 ${
 'bg-white border-slate-200 text-slate-800'
 }`}
            />
          </div>
        </div>
      </div>

      {/* Tickets Grid */}
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar pb-32 lg:pb-8">
        {filteredTickets.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs font-medium">
            No orders found under this filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredTickets.map((ticket) => {
              const isReady = ticket.status === 'Ready';
              const isPreparing = ticket.status === 'Preparing';
              const isServed = ticket.status === 'Served';

              return (
                <div
                  key={ticket.id}
                  data-testid={`card-live-ticket-${ticket.orderNumber}`}
                  className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 shadow-xs transition hover:shadow-md ${
 isReady
 ? 'bg-emerald-50/70 border-emerald-300 shadow-2xs'
 : isPreparing
 ? 'bg-amber-50/70 border-amber-300 shadow-2xs'
 : 'bg-white border-slate-200'
 }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`font-black text-sm font-mono ${'text-slate-900'}`}>
                          {ticket.orderNumber}
                        </span>
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
 'bg-slate-100 text-slate-800 border border-slate-200'
 }`}>
                          {ticket.destination}
                        </span>
                      </div>

                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
 isReady
 ? 'bg-emerald-600 text-white shadow-2xs'
 : isPreparing
 ? 'bg-amber-100 text-amber-800 border border-amber-300'
 : 'bg-[#EDF4EC] text-[#123C2B] border border-[#CFE0D2]'
 }`}>
                        {isReady ? 'READY AT PASS' : isPreparing ? 'COOKING' : 'SERVED'}
                      </span>
                    </div>

                    <div className={`text-[11px] flex items-center justify-between ${'text-slate-600 font-medium'}`}>
                      <div className="flex items-center gap-1.5">
                        <Clock className={`w-3.5 h-3.5 ${'text-slate-500'}`} />
                        <span>{ticket.timeAgo}</span>
                      </div>
                      {isReady && (
                        <span className={`font-bold flex items-center gap-1 text-[10px] ${'text-emerald-700'}`}>
                          <Zap className="w-3 h-3" />
                          <span>60s Pickup SLA</span>
                        </span>
                      )}
                      {ticket.station && (
                        <span className="font-mono text-[10px]">
                          {ticket.station}
                        </span>
                      )}
                    </div>

                    {/* Dispatched info for Ready orders */}
                    {isReady && (
                      <div className={`text-[10px] px-2 py-1 rounded-lg flex items-center gap-1.5 font-semibold ${
 'bg-emerald-100 text-emerald-900 border border-emerald-200'
 }`}>
                        <ChefHat className={`w-3 h-3 shrink-0 ${'text-emerald-600'}`} />
                        <span>Dispatched by Kitchen Chef KDS • Ready for table pickup</span>
                      </div>
                    )}

                    {/* Items List */}
                    <div className={`p-2.5 rounded-xl border space-y-1 text-xs ${
 'bg-white border-slate-200 text-slate-800'
 }`}>
                      {ticket.items.map((it, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[11px] font-medium">
                          <span>{it}</span>
                          <CheckCircle2 className={`w-3 h-3 ${isReady ? 'text-emerald-500' : 'text-slate-400'}`} />
                        </div>
                      ))}
                    </div>

                    {/* Preparing Progress Bar */}
                    {isPreparing && ticket.progress && (
                      <div className="space-y-1 pt-1">
                        <div className={`flex items-center justify-between text-[10px] font-semibold ${'text-slate-600'}`}>
                          <span className="flex items-center gap-1">
                            <Flame className="w-3 h-3 text-amber-500" />
                            <span>Chef Cooking Progress</span>
                          </span>
                          <span className={`font-bold ${'text-amber-700'}`}>{ticket.progress}%</span>
                        </div>
                        <div className={`w-full h-1.5 rounded-full overflow-hidden ${'bg-slate-200'}`}>
                          <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${ticket.progress}%` }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Row */}
                  <div className={`pt-2 border-t flex items-center gap-2 ${'border-slate-200'}`}>
                    {isReady ? (
                      <>
                        <button
                          data-testid="btn-serve-order"
                          onClick={() => onServeOrder(ticket.id, ticket.orderNumber, ticket.destination)}
                          className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Pick Up & Serve to Table</span>
                        </button>
                        <button
                          onClick={() => triggerToast(`KOT #${ticket.orderNumber} receipt reprinted.`)}
                          className={`p-2 rounded-xl border text-xs transition ${
 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
 }`}
                          title="Print Ticket"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </>
                    ) : isPreparing ? (
                      <>
                        <button
                          onClick={() => triggerToast(`Kitchen alerted: Inquiring about ${ticket.orderNumber}`)}
                          className={`flex-1 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition border ${
 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-200'
 }`}
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          <span>Check with Kitchen</span>
                        </button>
                        <button
                          onClick={() => triggerToast(`Viewing KOT slip for ${ticket.orderNumber}`)}
                          className={`px-3 py-2 rounded-xl border text-xs font-bold transition flex items-center gap-1 ${
 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
 }`}
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>KOT</span>
                        </button>
                      </>
                    ) : (
                      <div className={`w-full flex items-center justify-between text-xs px-1 py-1 ${'text-slate-600'}`}>
                        <span className={`flex items-center gap-1 font-bold ${'text-emerald-700'}`}>
                          <Check className="w-3.5 h-3.5" />
                          <span>Served to Guest</span>
                        </span>
                        <button
                          onClick={() => triggerToast(`Bill printed for ${ticket.destination}`)}
                          className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold ${
 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
 }`}
                        >
                          Print Bill
                        </button>
                      </div>
                    )}
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
