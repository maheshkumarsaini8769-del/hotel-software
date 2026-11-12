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
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/30',
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
    color: 'text-[#2E6B4C]',
    bgColor: 'bg-[#123C2B]/5 border-[#CFE0D2]',
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
    color: 'text-slate-700 dark:text-slate-300',
    bgColor: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800',
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
    color: 'text-red-400',
    bgColor: 'bg-red-500/10 border-red-500/30',
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
    color: 'text-slate-700 dark:text-slate-300',
    bgColor: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800',
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
    color: 'text-slate-700 dark:text-slate-300',
    bgColor: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800',
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
      <div className="bg-[#FFFDF8] border border-[#E7DFCE] rounded-3xl max-w-4xl w-full p-6 sm:p-7 shadow-md flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E7DFCE]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EDF4EC] border border-[#CFE0D2] text-[#123C2B] flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#123C2B] flex items-center gap-2">
                <span>SpiceHub Hospitality Suite</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EDF4EC] text-[#123C2B] border border-[#CFE0D2] font-bold">
                  ● 9 Portals Online
                </span>
              </h2>
              <p className="text-xs text-[#7C7566]">
                Click any portal to open in a new tab without interrupting your waiter shift session
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#7C7566] hover:text-[#123C2B] rounded-xl hover:bg-[#F6F1E6] transition"
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
 ? 'bg-[#F6F1E6] border-[#E9C98A]'
 : 'bg-white border-[#E7DFCE] hover:border-[#CFE0D2]'
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
                          <span className="font-bold text-sm text-[#123C2B] group-hover:text-[#8A5A12] transition">
                            {portal.name}
                          </span>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#F6F1E6] border border-[#E7DFCE] text-[#7C7566]">
                            :{portal.port}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#7C7566]">{portal.role}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-[#8A5A12] group-hover:text-[#123C2B] transition font-bold">
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
                    Online
                  </span>
                </div>
              </a>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Current Station: <strong className="text-orange-400">Waiter Terminal</strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#F6F1E6] hover:bg-[#EFE8D9] border border-[#E7DFCE] text-[#123C2B] font-bold text-xs transition"
          >
            Close Launcher
          </button>
        </div>
      </div>
    </div>
  );
};
