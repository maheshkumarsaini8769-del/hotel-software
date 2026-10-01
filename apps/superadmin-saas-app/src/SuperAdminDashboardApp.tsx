import React, { useState } from 'react';

export interface TenantHotelItem {
  id: string;
  name: string;
  code: string;
  city: string;
  contactEmail: string;
  contactPhone: string;
  plan: 'TRIAL' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  activeRooms: number;
  activeTables: number;
  status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED';
  monthlyBilling: number;
  features: {
    kdsEnabled: boolean;
    soundboxEnabled: boolean;
    aiPricingEnabled: boolean;
    banquetEnabled: boolean;
  };
}

export const SuperAdminDashboardApp: React.FC = () => {
  const [tenants, setTenants] = useState<TenantHotelItem[]>([
    {
      id: 'tenant-1',
      name: 'The Grand Heritage Palace',
      code: 'GHP-01',
      city: 'Udaipur, Rajasthan',
      contactEmail: 'admin@grandheritage.com',
      contactPhone: '+91 98765 43210',
      plan: 'ENTERPRISE',
      activeRooms: 45,
      activeTables: 24,
      status: 'ACTIVE',
      monthlyBilling: 14999,
      features: {
        kdsEnabled: true,
        soundboxEnabled: true,
        aiPricingEnabled: true,
        banquetEnabled: true,
      },
    },
    {
      id: 'tenant-2',
      name: 'Spice Valley Boutique Resort',
      code: 'SVR-02',
      city: 'Munnar, Kerala',
      contactEmail: 'gm@spicevalley.com',
      contactPhone: '+91 98123 45678',
      plan: 'PROFESSIONAL',
      activeRooms: 20,
      activeTables: 12,
      status: 'ACTIVE',
      monthlyBilling: 7999,
      features: {
        kdsEnabled: true,
        soundboxEnabled: true,
        aiPricingEnabled: false,
        banquetEnabled: false,
      },
    },
    {
      id: 'tenant-3',
      name: 'Urban Spice Bistro & Cafe',
      code: 'USB-03',
      city: 'Indiranagar, Bengaluru',
      contactEmail: 'owner@urbanspice.in',
      contactPhone: '+91 99001 12233',
      plan: 'STARTER',
      activeRooms: 0,
      activeTables: 16,
      status: 'ACTIVE',
      monthlyBilling: 3499,
      features: {
        kdsEnabled: true,
        soundboxEnabled: false,
        aiPricingEnabled: false,
        banquetEnabled: false,
      },
    },
  ]);

  const [activeTab, setActiveTab] = useState<'TENANTS' | 'PLANS' | 'TELEMETRY'>('TENANTS');
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // New Onboard Form State
  const [newName, setNewName] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newPlan, setNewPlan] = useState<'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'>('PROFESSIONAL');
  const [newEmail, setNewEmail] = useState('');

  const totalMrr = tenants.reduce((acc, t) => acc + (t.status === 'ACTIVE' ? t.monthlyBilling : 0), 0);
  const totalActiveProperties = tenants.filter((t) => t.status === 'ACTIVE').length;
  const totalRoomsManaged = tenants.reduce((acc, t) => acc + t.activeRooms, 0);
  const totalTablesManaged = tenants.reduce((acc, t) => acc + t.activeTables, 0);

  const filteredTenants = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOnboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newTenant: TenantHotelItem = {
      id: `tenant-${Date.now()}`,
      name: newName,
      code: `SPICE-${Math.floor(100 + Math.random() * 900)}`,
      city: newCity || 'New Delhi',
      contactEmail: newEmail || 'admin@hotel.com',
      contactPhone: '+91 98000 00000',
      plan: newPlan,
      activeRooms: 15,
      activeTables: 10,
      status: 'ACTIVE',
      monthlyBilling: newPlan === 'ENTERPRISE' ? 14999 : newPlan === 'PROFESSIONAL' ? 7999 : 3499,
      features: {
        kdsEnabled: true,
        soundboxEnabled: true,
        aiPricingEnabled: newPlan === 'ENTERPRISE',
        banquetEnabled: newPlan === 'ENTERPRISE',
      },
    };

    setTenants([newTenant, ...tenants]);
    setNewName('');
    setNewCity('');
    setNewEmail('');
    setIsOnboardModalOpen(false);
  };

  const handleToggleFeature = (tenantId: string, featureKey: keyof TenantHotelItem['features']) => {
    setTenants((prev) =>
      prev.map((t) => {
        if (t.id !== tenantId) return t;
        return {
          ...t,
          features: {
            ...t.features,
            [featureKey]: !t.features[featureKey],
          },
        };
      })
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-20">
      {/* Top Super Admin Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center text-xl font-black text-slate-950 shadow-md">
            🛡️
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              <span>SpiceHub SaaS Super Admin</span>
              <span className="px-2 py-0.5 text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-full font-bold">
                Platform Root
              </span>
            </h1>
            <p className="text-xs text-slate-400">Multi-Tenant Hotel & Restaurant Management Console</p>
          </div>
        </div>

        <button
          onClick={() => setIsOnboardModalOpen(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 active:scale-95 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg transition flex items-center gap-2 min-h-[48px]"
        >
          <span>➕</span>
          <span>Onboard New Hotel</span>
        </button>
      </header>

      {/* KPI Overview Metrics Bar */}
      <section className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
          <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Monthly Recurring (MRR)</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">₹{totalMrr.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-emerald-500/90 mt-0.5">Across {totalActiveProperties} active properties</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
          <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Active Tenant Properties</p>
          <p className="text-2xl font-black text-white mt-1">{totalActiveProperties}</p>
          <p className="text-[11px] text-indigo-400 mt-0.5">100% cloud tenant isolation</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
          <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Total Hotel Rooms</p>
          <p className="text-2xl font-black text-amber-400 mt-1">{totalRoomsManaged}</p>
          <p className="text-[11px] text-amber-400/80 mt-0.5">PMS Live Room Matrix</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
          <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Dining Tables Online</p>
          <p className="text-2xl font-black text-cyan-400 mt-1">{totalTablesManaged}</p>
          <p className="text-[11px] text-cyan-400/80 mt-0.5">Live QR ordering enabled</p>
        </div>
      </section>

      {/* Navigation Sub-Tabs */}
      <div className="max-w-7xl mx-auto px-6 border-b border-slate-800 mb-6 flex gap-4">
        <button
          onClick={() => setActiveTab('TENANTS')}
          className={`pb-3 text-sm font-bold border-b-2 transition ${
            activeTab === 'TENANTS'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          🏨 Tenant Properties ({tenants.length})
        </button>
        <button
          onClick={() => setActiveTab('PLANS')}
          className={`pb-3 text-sm font-bold border-b-2 transition ${
            activeTab === 'PLANS'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          💳 SaaS Subscription Plans
        </button>
        <button
          onClick={() => setActiveTab('TELEMETRY')}
          className={`pb-3 text-sm font-bold border-b-2 transition ${
            activeTab === 'TELEMETRY'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          ⚡ Platform Telemetry & Sockets
        </button>
      </div>

      {/* Main Section Content */}
      <main className="max-w-7xl mx-auto px-6 space-y-6">
        {/* TAB 1: TENANT LIST & FEATURE TOGGLES */}
        {activeTab === 'TENANTS' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search hotels by name, code or city..."
                className="w-full sm:w-80 bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none min-h-[48px]"
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredTenants.map((t) => (
                <div
                  key={t.id}
                  className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg transition"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-extrabold text-white">{t.name}</h3>
                        <span className="px-2 py-0.5 text-xs bg-slate-800 text-slate-300 font-mono rounded">
                          {t.code}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                            t.plan === 'ENTERPRISE'
                              ? 'bg-purple-950 text-purple-400 border border-purple-800'
                              : t.plan === 'PROFESSIONAL'
                              ? 'bg-blue-950 text-blue-400 border border-blue-800'
                              : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          }`}
                        >
                          {t.plan}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        📍 {t.city} • ✉️ {t.contactEmail} • 📞 {t.contactPhone}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Monthly Plan</p>
                        <p className="text-base font-extrabold text-emerald-400">
                          ₹{t.monthlyBilling.toLocaleString('en-IN')}/mo
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-emerald-950 text-emerald-400 border border-emerald-700 text-xs font-bold rounded-full">
                        ● {t.status}
                      </span>
                    </div>
                  </div>

                  {/* Feature Toggles & Inventory Status */}
                  <div className="mt-4 pt-1 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-4 text-slate-400">
                      <span>🛏️ {t.activeRooms} Rooms</span>
                      <span>🍽️ {t.activeTables} Tables</span>
                    </div>

                    {/* Modular Feature Toggles */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-slate-400 mr-1 font-semibold">Modular Toggles:</span>

                      <button
                        onClick={() => handleToggleFeature(t.id, 'kdsEnabled')}
                        className={`px-2.5 py-1 rounded-lg border font-semibold transition min-h-[36px] ${
                          t.features.kdsEnabled
                            ? 'bg-indigo-950/80 text-indigo-400 border-indigo-700'
                            : 'bg-slate-800/60 text-slate-500 border-slate-700'
                        }`}
                      >
                        🍳 KDS Screen: {t.features.kdsEnabled ? 'ON' : 'OFF'}
                      </button>

                      <button
                        onClick={() => handleToggleFeature(t.id, 'soundboxEnabled')}
                        className={`px-2.5 py-1 rounded-lg border font-semibold transition min-h-[36px] ${
                          t.features.soundboxEnabled
                            ? 'bg-emerald-950/80 text-emerald-400 border-emerald-700'
                            : 'bg-slate-800/60 text-slate-500 border-slate-700'
                        }`}
                      >
                        🔊 Soundbox: {t.features.soundboxEnabled ? 'ON' : 'OFF'}
                      </button>

                      <button
                        onClick={() => handleToggleFeature(t.id, 'aiPricingEnabled')}
                        className={`px-2.5 py-1 rounded-lg border font-semibold transition min-h-[36px] ${
                          t.features.aiPricingEnabled
                            ? 'bg-amber-950/80 text-amber-400 border-amber-700'
                            : 'bg-slate-800/60 text-slate-500 border-slate-700'
                        }`}
                      >
                        🤖 AI Dynamic Rates: {t.features.aiPricingEnabled ? 'ON' : 'OFF'}
                      </button>

                      <button
                        onClick={() => handleToggleFeature(t.id, 'banquetEnabled')}
                        className={`px-2.5 py-1 rounded-lg border font-semibold transition min-h-[36px] ${
                          t.features.banquetEnabled
                            ? 'bg-rose-950/80 text-rose-400 border-rose-700'
                            : 'bg-slate-800/60 text-slate-500 border-slate-700'
                        }`}
                      >
                        🎪 Banquets: {t.features.banquetEnabled ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: PLANS & PRICING TIERS */}
        {activeTab === 'PLANS' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <span className="px-3 py-1 bg-emerald-950 text-emerald-400 border border-emerald-700 text-xs font-bold rounded-full">
                  Starter / Cafe
                </span>
                <h3 className="text-xl font-black text-white mt-3">₹3,499 / mo</h3>
                <p className="text-xs text-slate-400 mt-1">Ideal for Cafes, Standalone Restaurants & Small Bistros</p>
                <ul className="mt-4 space-y-2 text-xs text-slate-300">
                  <li>✅ Up to 20 Dining Tables</li>
                  <li>✅ Digital Table QR Ordering</li>
                  <li>✅ Waiter Handheld Operations</li>
                  <li>✅ Fast Cashier Billing & UPI QR</li>
                  <li>❌ No Room PMS / In-Room Dining</li>
                </ul>
              </div>
            </div>

            <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between relative">
              <span className="absolute -top-3 right-6 px-3 py-0.5 bg-amber-500 text-slate-950 text-[10px] font-black rounded-full uppercase tracking-wider">
                Most Popular
              </span>
              <div>
                <span className="px-3 py-1 bg-blue-950 text-blue-400 border border-blue-700 text-xs font-bold rounded-full">
                  Professional Hotel + Dine
                </span>
                <h3 className="text-xl font-black text-white mt-3">₹7,999 / mo</h3>
                <p className="text-xs text-slate-400 mt-1">Full Hotel PMS + Restaurant Kitchen Operations</p>
                <ul className="mt-4 space-y-2 text-xs text-slate-300">
                  <li>✅ Up to 50 Rooms + 30 Tables</li>
                  <li>✅ Complete Front Desk PMS</li>
                  <li>✅ In-Room Dining & Guest Room Portal</li>
                  <li>✅ Multi-Station Kitchen KDS</li>
                  <li>✅ Housekeeping & Maintenance</li>
                </ul>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <span className="px-3 py-1 bg-purple-950 text-purple-400 border border-purple-700 text-xs font-bold rounded-full">
                  Enterprise Luxury Resort
                </span>
                <h3 className="text-xl font-black text-white mt-3">₹14,999 / mo</h3>
                <p className="text-xs text-slate-400 mt-1">For Luxury Resorts, Hotel Chains & Banquet Venues</p>
                <ul className="mt-4 space-y-2 text-xs text-slate-300">
                  <li>✅ Unlimited Rooms & Tables</li>
                  <li>✅ Banquet Hall Event Management</li>
                  <li>✅ AI Dynamic Demand Surge Rates</li>
                  <li>✅ Targeted Waiter Soundbox Audio</li>
                  <li>✅ 24/7 Dedicated SaaS SLA Support</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PLATFORM TELEMETRY & SOCKETS */}
        {activeTab === 'TELEMETRY' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white">Live Platform Health Status</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400">Socket.IO Live Connections</p>
                <p className="text-xl font-extrabold text-emerald-400 mt-1">142 connected</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Waiters, KDS & Cashiers online</p>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400">Database API Latency</p>
                <p className="text-xl font-extrabold text-cyan-400 mt-1">12 ms</p>
                <p className="text-[10px] text-slate-500 mt-0.5">MongoDB Replica Set cluster</p>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400">Soundbox Voice Gateways</p>
                <p className="text-xl font-extrabold text-amber-400 mt-1">100% Operational</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Paytm / PhonePe Soundbox bridges</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Onboard New Hotel Modal */}
      {isOnboardModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white">Onboard New Property</h3>
              <button
                onClick={() => setIsOnboardModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleOnboardSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Hotel / Restaurant Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Royal Orchid Resort"
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">City / Location</label>
                <input
                  type="text"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  placeholder="e.g. Jaipur, Rajasthan"
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Owner Contact Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. manager@royalorchid.com"
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Subscription Plan</label>
                <select
                  value={newPlan}
                  onChange={(e: any) => setNewPlan(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 min-h-[44px]"
                >
                  <option value="STARTER">Starter / Cafe (₹3,499/mo)</option>
                  <option value="PROFESSIONAL">Professional Hotel + Dine (₹7,999/mo)</option>
                  <option value="ENTERPRISE">Enterprise Luxury Resort (₹14,999/mo)</option>
                </select>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsOnboardModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-700 min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black rounded-xl text-xs hover:brightness-110 min-h-[44px]"
                >
                  Confirm & Provision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
