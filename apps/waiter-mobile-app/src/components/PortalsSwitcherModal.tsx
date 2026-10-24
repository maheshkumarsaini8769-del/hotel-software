import { API_BASE_URL } from '../config/api';
import { getPortalUrl } from '../config/env';
import React from 'react';
import {
  X,
  ExternalLink,
  Building2,
  CreditCard,
  ChefHat,
  Smartphone,
  BedDouble,
  ShieldAlert,
  Server,
  Layers,
  UtensilsCrossed,
  CheckCircle2
} from 'lucide-react';

interface PortalItem {
  id: string;
  name: string;
  role: string;
  port: number;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  badge: string;
  description: string;
}

export const SPICEHUB_PORTALS: PortalItem[] = [
  {
    id: 'admin',
    name: 'Hotel Admin ERP',
    role: 'General Manager / Ops Head',
    port: 3005,
    url: getPortalUrl('admin'),
    icon: Building2,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/30',
    badge: 'Operations & Management',
    description: 'Configure floors, assign waiter table zones, manage inventory BOM, staff rosters, and financial audit.',
  },
  {
    id: 'cashier',
    name: 'Cashier POS Station',
    role: 'Head Cashier / Billing Staff',
    port: 3007,
    url: getPortalUrl('cashier'),
    icon: CreditCard,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/30',
    badge: 'Settlement & Invoicing',
    description: 'Take cash/card payments, settle table bills requested by waiters, generate GST tax invoices, and print receipts.',
  },
  {
    id: 'reception',
    name: 'Reception Front Desk',
    role: 'Front Office / Concierge',
    port: 3008,
    url: getPortalUrl('reception'),
    icon: Layers,
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10 border-indigo-500/30',
    badge: 'PMS & Reservations',
    description: 'Check-in hotel guests, manage room keys, allocate room folios, view dining room charges, and checkout.',
  },
  {
    id: 'kds',
    name: 'Kitchen Display System (KDS)',
    role: 'Executive Chef / Line Cooks',
    port: 3003,
    url: getPortalUrl('kds'),
    icon: ChefHat,
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10 border-rose-500/30',
    badge: 'Live Kitchen Stations',
    description: 'Live order tickets from waiters and QR, cooking station queues, mark dishes ready for waiter pickup.',
  },
  {
    id: 'customer',
    name: 'Customer Table QR Menu',
    role: 'Dining Guests',
    port: 3001,
    url: getPortalUrl('customer'),
    icon: Smartphone,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10 border-orange-500/30',
    badge: 'Self QR Ordering',
    description: 'Digital interactive menu, table order cart, buzzer calls for water/bill/waiter, live order status tracker.',
  },
  {
    id: 'guest',
    name: 'Guest In-Room Dining',
    role: 'Hotel Room Guests',
    port: 3004,
    url: getPortalUrl('guest'),
    icon: BedDouble,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/30',
    badge: 'In-Room Service',
    description: 'Room guest dining orders, housekeeping assistance, spa/cab booking, laundry requests, and digital folio.',
  },
  {
    id: 'superadmin',
    name: 'SuperAdmin SaaS Hub',
    role: 'SaaS Platform Owner',
    port: 3006,
    url: getPortalUrl('superadmin'),
    icon: ShieldAlert,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10 border-purple-500/30',
    badge: 'Multi-Tenant SaaS',
    description: 'Tenant hotel subscriptions, global kill-switch, database diagnostics, multi-property health monitoring.',
  },
  {
    id: 'backend',
    name: 'Backend API & Engine',
    role: 'Core Server / WebSockets',
    port: 5000,
    url: `${API_BASE_URL}/pos/demo-context`,
    icon: Server,
    color: 'text-teal-400',
    bgColor: 'bg-teal-500/10 border-teal-500/30',
    badge: 'Port 5000 Engine',
    description: 'High-speed Express REST API, MongoDB Mongoose models, and real-time Socket.IO synchronization hub.',
  },
];

interface PortalsSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPortalId?: string;
}

export const PortalsSwitcherModal: React.FC<PortalsSwitcherModalProps> = ({
  isOpen,
  onClose,
  currentPortalId = 'waiter',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#10131d] border border-slate-800 rounded-3xl max-w-4xl w-full p-6 sm:p-7 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>SpiceHub Hospitality Suite</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                  ● 9 Portals Online
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Click any portal to open in a new tab without interrupting your waiter shift session
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Portals Grid */}
        <div className="flex-1 overflow-y-auto py-4 grid grid-cols-1 md:grid-cols-2 gap-3.5 custom-scrollbar pr-1">
          {SPICEHUB_PORTALS.map((portal) => {
            const Icon = portal.icon;
            const isCurrent = portal.id === currentPortalId;

            return (
              <a
                key={portal.id}
                href={portal.url}
                target="_blank"
                rel="noreferrer"
                className={`p-4 rounded-2xl border transition-all hover:scale-[1.01] hover:shadow-xl flex flex-col justify-between gap-3 group ${
                  isCurrent
                    ? 'bg-gradient-to-r from-orange-950/40 via-slate-900 to-[#181c2b] border-orange-500/80'
                    : 'bg-[#151926] border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${portal.bgColor}`}>
                        <Icon className={`w-5 h-5 ${portal.color}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white group-hover:text-orange-400 transition">
                            {portal.name}
                          </span>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                            :{portal.port}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">{portal.role}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-400 group-hover:text-orange-400 transition font-bold">
                      <span className="hidden sm:inline">Launch</span>
                      <ExternalLink className="w-4 h-4" />
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
                    {portal.description}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-800/80">
                  <span className={`font-semibold ${portal.color}`}>
                    {portal.badge}
                  </span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Running on localhost:{portal.port}
                  </span>
                </div>
              </a>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Current Station: <strong className="text-orange-400">Waiter Terminal (:3002)</strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
          >
            Close Launcher
          </button>
        </div>
      </div>
    </div>
  );
};
