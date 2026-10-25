import React, { useState, useMemo } from 'react';

export interface PortalEntry {
  id: string;
  name: string;
  role: string;
  category: 'GUEST' | 'OPERATIONS' | 'BILLING' | 'MANAGEMENT';
  categoryLabel: string;
  port: number;
  url: string;
  emoji: string;
  badge: string;
  colorScheme?: 'orange' | 'emerald' | 'amber' | 'rose' | 'blue' | 'indigo' | 'purple' | 'cyan';
  description: string;
  actionText: string;
}

export interface SpiceHubPortalDirectoryModalProps {
  isOpen: boolean;
  onClose?: () => void;
  currentPortalId?: string;
  onNavigate?: (url: string) => void;
  portalUrls?: Partial<Record<string, string>>;
  enabledPortals?: string[];
}

const CATEGORY_HEADERS: Record<string, { title: string; subtitle: string; icon: string }> = {
  GUEST: {
    title: 'Guest & Customer Services',
    subtitle: 'Public & guest-facing self-service portals',
    icon: '🛎️',
  },
  OPERATIONS: {
    title: 'Floor & Kitchen Operations',
    subtitle: 'Real-time ordering, serving & culinary display terminals',
    icon: '👨‍🍳',
  },
  BILLING: {
    title: 'Front Office & Billing',
    subtitle: 'Guest arrivals, reservations, cashiering & payment settlement',
    icon: '💳',
  },
  MANAGEMENT: {
    title: 'Management & Governance',
    subtitle: 'Operational command center and SaaS platform governance',
    icon: '📊',
  },
};

export const SpiceHubPortalDirectoryModal: React.FC<SpiceHubPortalDirectoryModalProps> = ({
  isOpen,
  onClose,
  currentPortalId = 'admin',
  onNavigate,
  portalUrls = {},
  enabledPortals,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [blockedNotice, setBlockedNotice] = useState<string | null>(null);

  const activePortals = useMemo(() => {
    if (enabledPortals && Array.isArray(enabledPortals)) return enabledPortals;
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('spicehub_enabled_portals');
        if (stored) return JSON.parse(stored) as string[];
      } catch {}
    }
    return null;
  }, [enabledPortals]);

  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';

  const resolveUrl = (portalKey: string, port: number, query = ''): string => {
    if (portalUrls[portalKey]) return portalUrls[portalKey] + query;
    return `${protocol}//${host}:${port}${query}`;
  };

  const portals: PortalEntry[] = useMemo(() => [
    {
      id: 'customer',
      name: 'Customer Table QR Menu',
      role: 'Dine-In Guests',
      category: 'GUEST',
      categoryLabel: 'Guest Services',
      port: 3001,
      url: resolveUrl('customer', 3001, '/?table=T-01'),
      emoji: '🍽️',
      badge: 'Table Self-Order',
      colorScheme: 'orange',
      description: 'Interactive digital menu, table cart, buzzer calls for water/bill/waiter, and live order status.',
      actionText: 'Open Menu',
    },
    {
      id: 'guest',
      name: 'In-Room Guest Portal',
      role: 'Hotel Room Guests',
      category: 'GUEST',
      categoryLabel: 'Guest Services',
      port: 3004,
      url: resolveUrl('guest', 3004, '/?room=305'),
      emoji: '🛎️',
      badge: 'Room Services',
      description: 'In-room dining, housekeeping assistance, spa/laundry requests, room folio tracking & express checkout.',
      actionText: 'Open Portal',
    },
    {
      id: 'waiter',
      name: 'Waiter Mobile Handheld',
      role: 'Floor Captains & Servers',
      category: 'OPERATIONS',
      categoryLabel: 'Floor Operations',
      port: 3002,
      url: resolveUrl('waiter', 3002),
      emoji: '📱',
      badge: 'Floor Ordering',
      colorScheme: 'amber',
      description: 'Mobile touch terminal for table orders, instant KOT firing, live dish ready alerts, and bill requests.',
      actionText: 'Launch Terminal',
    },
    {
      id: 'kds',
      name: 'Kitchen Display System (KDS)',
      role: 'Chefs & Line Cooks',
      category: 'OPERATIONS',
      categoryLabel: 'Kitchen Display',
      port: 3003,
      url: resolveUrl('kds', 3003),
      emoji: '👨‍🍳',
      badge: 'Kitchen Production',
      colorScheme: 'rose',
      description: 'Live order station queues, course firing timers, item 86 out-of-stock toggles, and ready status.',
      actionText: 'Launch Screen',
    },
    {
      id: 'cashier',
      name: 'Express Cashier POS',
      role: 'Cashiers & Billing Staff',
      category: 'BILLING',
      categoryLabel: 'Settlement & POS',
      port: 3007,
      url: resolveUrl('cashier', 3007),
      emoji: '💳',
      badge: 'Billing & POS',
      colorScheme: 'emerald',
      description: 'High-speed billing terminal, cash drawer custody, split bills, KOT void approvals, and blind shift close.',
      actionText: 'Launch Workstation',
    },
    {
      id: 'reception',
      name: 'Reception & Front Desk PMS',
      role: 'Front Office Agents',
      category: 'BILLING',
      categoryLabel: 'Front Desk PMS',
      port: 3008,
      url: resolveUrl('reception', 3008),
      emoji: '🏨',
      badge: 'PMS & Arrivals',
      colorScheme: 'indigo',
      description: 'PMS reservation matrix, guest check-in/out, room keys, corporate master folios, and lost & found vault.',
      actionText: 'Launch Workstation',
    },
    {
      id: 'admin',
      name: 'Hotel Admin ERP Command Center',
      role: 'General Manager / Operations Head',
      category: 'MANAGEMENT',
      categoryLabel: 'Command Center',
      port: 3005,
      url: resolveUrl('admin', 3005),
      emoji: '📊',
      badge: 'Hotel ERP',
      colorScheme: 'cyan',
      description: 'Comprehensive operations: duty rosters, floor zoning, inventory BOM, rate overrides, and night audit.',
      actionText: 'Launch Command Center',
    },
    {
      id: 'superadmin',
      name: 'SaaS SuperAdmin Platform Hub',
      role: 'Platform Owner & SuperAdmins',
      category: 'MANAGEMENT',
      categoryLabel: 'Multi-Tenant SaaS',
      port: 3006,
      url: resolveUrl('superadmin', 3006),
      emoji: '🌐',
      badge: 'Platform Control',
      colorScheme: 'purple',
      description: 'Multi-property SaaS tenant management, subscription tiers, platform kill-switch, and global metrics.',
      actionText: 'Launch Platform Hub',
    },
  ], [host, protocol, portalUrls]);

  const filteredPortals = useMemo(() => {
    if (!searchQuery.trim()) return portals;
    const q = searchQuery.toLowerCase().trim();
    return portals.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.badge.toLowerCase().includes(q) ||
        p.port.toString().includes(q)
    );
  }, [portals, searchQuery]);

  const groupedPortals = useMemo(() => {
    const groups: Record<string, PortalEntry[]> = {
      GUEST: [],
      OPERATIONS: [],
      BILLING: [],
      MANAGEMENT: [],
    };
    filteredPortals.forEach((p) => {
      if (groups[p.category]) {
        groups[p.category].push(p);
      }
    });
    return groups;
  }, [filteredPortals]);

  if (!isOpen) return null;

  const handlePortalClick = (e: React.MouseEvent, p: PortalEntry) => {
    const isSubscribed = !activePortals || activePortals.includes(p.id) || p.id === 'admin';
    if (!isSubscribed) {
      e.preventDefault();
      setBlockedNotice(`Portal "${p.name}" is not included in this hotel's subscription plan. Contact Super Admin to enable it.`);
      setTimeout(() => setBlockedNotice(null), 5000);
      return;
    }
    if (onNavigate) {
      e.preventDefault();
      onNavigate(p.url);
    }
  };

  return (
    <div
      data-testid="spicehub-portal-directory"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      <div className="bg-[#0b0f19] border border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col my-auto max-h-[92vh] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-2xl shadow-lg shadow-orange-950/40 shrink-0">
              🚀
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  SpiceHub Unified Portal Directory
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  ● 8 Portals Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Centralized workstation launcher for guests, staff, kitchen, and executive leadership.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                placeholder="Search portals or roles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
              />
              <span className="absolute left-2.5 top-2.5 text-xs text-slate-500">🔍</span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close portal directory"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Subscription Notice Banner */}
        {blockedNotice && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs text-rose-300 animate-in fade-in">
            <span className="flex items-center gap-2">
              <span>🔒</span>
              <span>{blockedNotice}</span>
            </span>
            <button
              onClick={() => setBlockedNotice(null)}
              className="text-rose-400 hover:text-white font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Portals Grid by Category */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {(Object.keys(groupedPortals) as Array<keyof typeof groupedPortals>).map((catKey) => {
            const items = groupedPortals[catKey];
            if (!items || items.length === 0) return null;
            const headerInfo = CATEGORY_HEADERS[catKey];

            return (
              <section key={catKey} className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{headerInfo.icon}</span>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {headerInfo.title}
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-500">{headerInfo.subtitle}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {items.map((portal) => {
                    const isCurrent = portal.id === currentPortalId;
                    const isSubscribed = !activePortals || activePortals.includes(portal.id) || portal.id === 'admin';

                    return (
                      <div
                        key={portal.id}
                        data-testid={`portal-card-${portal.id}`}
                        className={`rounded-2xl border p-4 sm:p-5 flex flex-col justify-between transition group relative ${
                          !isSubscribed
                            ? 'bg-slate-950/40 border-slate-900 opacity-60'
                            : isCurrent
                              ? 'bg-amber-950/20 border-amber-500/40 shadow-lg shadow-amber-950/20'
                              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                        }`}
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition">
                                {portal.emoji}
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-white flex items-center gap-1.5 leading-snug">
                                  <span>{portal.name}</span>
                                  {isCurrent && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                      Current
                                    </span>
                                  )}
                                  {!isSubscribed && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                      Locked
                                    </span>
                                  )}
                                </h4>
                                <p className="text-[11px] text-slate-400">{portal.role}</p>
                              </div>
                            </div>

                            <span className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700/60 shrink-0">
                              :{portal.port}
                            </span>
                          </div>

                          <p className="text-xs text-slate-300 leading-relaxed">
                            {portal.description}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                          <span className="text-[11px] font-medium text-slate-500">
                            {!isSubscribed ? (
                              <span className="text-rose-400 font-bold flex items-center gap-1">
                                <span>🔒</span> Not Subscribed
                              </span>
                            ) : (
                              portal.badge
                            )}
                          </span>

                          <a
                            data-testid={`portal-link-${portal.id}`}
                            href={portal.url}
                            onClick={(e) => handlePortalClick(e, portal)}
                            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                              !isSubscribed
                                ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white cursor-pointer'
                                : 'bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-95'
                            }`}
                          >
                            <span>{!isSubscribed ? 'Not Subscribed' : portal.actionText}</span>
                            <span className="text-xs">{!isSubscribed ? '🔒' : '↗'}</span>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {filteredPortals.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <p className="text-sm">No portals match "{searchQuery}"</p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-xs font-bold text-amber-400 hover:underline"
              >
                Clear search
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span>SpiceHub Hospitality Suite · Micro-Frontend Architecture</span>
          <span>Single-Sign-On & Session Continuity across all stations</span>
        </div>
      </div>
    </div>
  );
};
