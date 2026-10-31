import React, { useState } from 'react';
import {
  Package,
  BarChart3,
  User,
  Tag,
  Star,
  Headphones,
  Cpu,
  Database,
  Shield,
  Zap,
  Bell,
  Globe,
  Settings,
  Search,
  CheckCircle2,
  RefreshCw,
  Download,
  Plus,
  Clock,
  ExternalLink,
  ChevronRight,
  Send,
  AlertCircle,
  Copy,
  Sliders,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { SuperAdminNavKey, TenantHotelItem } from '../../SuperAdminDashboardApp';

interface SuperAdminExtendedWorkstationsProps {
  activeNav: SuperAdminNavKey;
  theme: 'dark' | 'light';
  exportJsonSnapshot: () => void;
  tenants: TenantHotelItem[];
}

export const SuperAdminExtendedWorkstations: React.FC<SuperAdminExtendedWorkstationsProps> = ({
  activeNav,
  theme,
  exportJsonSnapshot,
  tenants,
}) => {
  // 1. INVENTORY STATE
  const [invSearch, setInvSearch] = useState('');
  const [invToast, setInvToast] = useState<string | null>(null);

  // 2. ANALYTICS STATE
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<'7D' | '30D' | '90D' | 'YTD'>('30D');

  // 3. CRM CUSTOMERS STATE
  const [crmSearch, setCrmSearch] = useState('');
  const [crmTier, setCrmTier] = useState<'ALL' | 'PLATINUM' | 'GOLD' | 'SILVER'>('ALL');
  const [crmToast, setCrmToast] = useState<string | null>(null);

  // 4. MARKETING STATE
  const [promoCodeInput, setPromoCodeInput] = useState('DIWALI25');
  const [promoDiscount, setPromoDiscount] = useState(25);
  const [marketingToast, setMarketingToast] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState([
    { code: 'WELCOME10', discount: '10% OFF', type: 'First Stay', redemptions: 342, status: 'ACTIVE' },
    { code: 'FLAT100', discount: '₹100 OFF', type: 'Dine-In POS', redemptions: 819, status: 'ACTIVE' },
    { code: 'FESTIVE20', discount: '20% OFF', type: 'Diwali Festive', redemptions: 194, status: 'SCHEDULED' },
    { code: 'SUITEUPGRADE', discount: 'Free Upgrade', type: 'Executive Rooms', redemptions: 56, status: 'EXPIRED' },
  ]);

  // 5. FEEDBACK STATE
  const [reviewFilter, setReviewFilter] = useState<'ALL' | '5' | '4' | '3'>('ALL');
  const [replyInput, setReplyInput] = useState<{ [id: string]: string }>({});
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // 6. SUPPORT STATE
  const [supportFilter, setSupportFilter] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'>('ALL');
  const [supportToast, setSupportToast] = useState<string | null>(null);
  const [tickets, setTickets] = useState([
    { id: 'TKT-901', hotel: 'Mahesh Hotel', subject: 'KOT Printer offline at South Pantry', priority: 'HIGH', status: 'OPEN', time: '14 mins ago' },
    { id: 'TKT-902', hotel: 'Taj Gateway Jaipur', subject: 'Tax invoice GST mismatch on split billing', priority: 'MEDIUM', status: 'IN_PROGRESS', time: '1 hr ago' },
    { id: 'TKT-903', hotel: 'The Royal Palm Resort', subject: 'Soundbox voice accent configuration', priority: 'LOW', status: 'RESOLVED', time: '3 hrs ago' },
  ]);

  // 7. INTEGRATIONS STATE
  const [webhookStatus, setWebhookStatus] = useState<string | null>(null);
  const [testingWebhook, setTestingWebhook] = useState(false);

  // 8. BACKUP STATE
  const [isSnapshotting, setIsSnapshotting] = useState(false);
  const [lastSnapshotTime, setLastSnapshotTime] = useState('Today at 03:00 AM (Automated Cron)');
  const [backupToast, setBackupToast] = useState<string | null>(null);

  // 9. SECURITY STATE
  const [isScanningSec, setIsScanningSec] = useState(false);
  const [secScanPassed, setSecScanPassed] = useState(true);
  const [secToast, setSecToast] = useState<string | null>(null);

  // 10. AI & AUTOMATION STATE
  const [aiFeatures, setAiFeatures] = useState({
    smartTableAllocation: true,
    kitchenPredictivePrep: true,
    whatsappConcierge: true,
    dynamicYieldPricing: false,
    smartMenuUpsell: true,
  });
  const [aiToast, setAiToast] = useState<string | null>(null);

  // 11. BROADCAST NOTIFICATIONS STATE
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastAudience, setBroadcastAudience] = useState<'ALL' | 'ADMINS' | 'STAFF'>('ALL');
  const [broadcastToast, setBroadcastToast] = useState<string | null>(null);
  const [broadcastHistory, setBroadcastHistory] = useState([
    { id: 'BC-1', title: 'Scheduled Cloud Maintenance Notice', target: 'All Hotels', date: '25 Oct 2026', readCount: '48 / 50' },
    { id: 'BC-2', title: 'Diwali Festive Menu Templates Available', target: 'Hotel Admins', date: '20 Oct 2026', readCount: '50 / 50' },
  ]);

  // 12. LANGUAGES & FOREX STATE
  const [rates, setRates] = useState({ USD: 83.25, EUR: 90.40, AED: 22.65, GBP: 106.10 });
  const [languageToast, setLanguageToast] = useState<string | null>(null);

  // 13. SETTINGS STATE
  const [settingsForm, setSettingsForm] = useState({
    platformName: 'SpiceHub Hospitality Enterprise OS',
    supportEmail: 'corporate-ops@spicehub.com',
    cloudRegion: 'ap-south-1 (Mumbai, AWS Data Center)',
    maintenanceWindow: 'Sunday 02:00 AM - 04:00 AM IST',
  });
  const [settingsToast, setSettingsToast] = useState<string | null>(null);

  // Container styling helper
  const cardCls = `p-6 rounded-2xl border transition-all ${
    theme === 'dark' ? 'bg-slate-900 border-slate-800/80 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
  }`;
  const subTextCls = theme === 'dark' ? 'text-slate-400' : 'text-slate-500';
  const tableHeaderCls = `border-b text-[11px] uppercase tracking-wider py-2.5 px-3 ${
    theme === 'dark' ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'
  }`;
  const inputCls = `px-3 py-2 rounded-xl text-xs border outline-none transition ${
    theme === 'dark' ? 'bg-black/30 border-slate-800 text-white focus:border-slate-200 dark:border-slate-800' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-200 dark:border-slate-800'
  }`;

  return (
    <>
      {/* ======================================================== */}
      {/* 1. GLOBAL INVENTORY & PROCUREMENT                        */}
      {/* ======================================================== */}
      {activeNav === 'INVENTORY' && (
        <div className="space-y-6 max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                <Package className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                <span>Multi-Property Inventory & Central Procurement Hub</span>
              </h2>
              <p className={`text-xs ${subTextCls}`}>
                Central raw materials stock levels, automatic replenishment triggers, and cross-property stock transfers.
              </p>
            </div>
            <button
              onClick={() => {
                setInvToast('Central replenishment PO #PO-9021 sent to approved vendors.');
                setTimeout(() => setInvToast(null), 4000);
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Auto-Reorder Deficits</span>
            </button>
          </div>

          {invToast && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
              <span>✓ {invToast}</span>
              <button onClick={() => setInvToast(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className={cardCls}>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total SKUs Monitored</div>
              <div className="text-2xl font-black mt-1">1,480 SKUs</div>
              <div className="text-[10px] text-emerald-400 font-semibold mt-1">Across 12 Godowns</div>
            </div>
            <div className={cardCls}>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Stock Valuation</div>
              <div className="text-2xl font-black mt-1">₹34.82 Lakhs</div>
              <div className="text-[10px] text-slate-700 dark:text-slate-300 font-semibold mt-1">FIFO Costing Active</div>
            </div>
            <div className={cardCls}>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Low Stock Reorders</div>
              <div className="text-2xl font-black mt-1 text-amber-400">9 Deficits</div>
              <div className="text-[10px] text-amber-400 font-semibold mt-1">Below Safety Par Level</div>
            </div>
            <div className={cardCls}>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Inter-Branch Transfers</div>
              <div className="text-2xl font-black mt-1 text-slate-700 dark:text-slate-300">3 In-Transit</div>
              <div className="text-[10px] text-slate-700 dark:text-slate-300 font-semibold mt-1">Sikar ↔ Jaipur Hub</div>
            </div>
          </div>

          <div className={cardCls}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">Provisions & Ingredients Catalog</span>
                <span className="text-xs text-slate-400 font-normal">(Central Godown Store)</span>
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={invSearch}
                  onChange={(e) => setInvSearch(e.target.value)}
                  placeholder="Search SKU or item..."
                  className={`pl-8 pr-3 py-1.5 rounded-xl text-xs border outline-none ${
                    theme === 'dark' ? 'bg-black/30 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr>
                    <th className={tableHeaderCls}>Item / SKU</th>
                    <th className={tableHeaderCls}>Category</th>
                    <th className={tableHeaderCls}>Current Stock</th>
                    <th className={tableHeaderCls}>Par Level</th>
                    <th className={tableHeaderCls}>Unit Price</th>
                    <th className={tableHeaderCls}>Status</th>
                    <th className={`${tableHeaderCls} text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {[
                    { sku: 'SKU-FNB-001', name: 'Premium Aged Basmati Rice (Daawat)', cat: 'Dry Pantry', stock: '240 kg', par: '150 kg', price: '₹145/kg', status: 'SUFFICIENT' },
                    { sku: 'SKU-DRY-014', name: 'Cold-Pressed Mustard Oil (5L Cans)', cat: 'Edible Oils', stock: '18 cans', par: '30 cans', price: '₹820/can', status: 'LOW_STOCK' },
                    { sku: 'SKU-DAIRY-009', name: 'Fresh Malai Paneer (Vacuum Packed)', cat: 'Cold Storage', stock: '32 kg', par: '25 kg', price: '₹340/kg', status: 'SUFFICIENT' },
                    { sku: 'SKU-SPICE-032', name: 'Kashmiri Saffron (Grade A++ 10g)', cat: 'Premium Spices', stock: '4 tins', par: '10 tins', price: '₹2,400/tin', status: 'CRITICAL' },
                    { sku: 'SKU-BAR-088', name: 'Sparkling Mineral Water (750ml Glass)', cat: 'Beverage Bar', stock: '180 btls', par: '100 btls', price: '₹120/btl', status: 'SUFFICIENT' },
                  ]
                    .filter((item) => item.name.toLowerCase().includes(invSearch.toLowerCase()) || item.sku.toLowerCase().includes(invSearch.toLowerCase()))
                    .map((row, i) => (
                      <tr key={i} className={`hover:bg-slate-100 dark:bg-slate-800 transition ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        <td className="py-2.5 px-3 font-medium">
                          <div className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>{row.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{row.sku}</div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">{row.cat}</td>
                        <td className="py-2.5 px-3 font-bold">{row.stock}</td>
                        <td className="py-2.5 px-3 text-slate-400">{row.par}</td>
                        <td className="py-2.5 px-3 font-mono">{row.price}</td>
                        <td className="py-2.5 px-3">
                          <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                            row.status === 'SUFFICIENT'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : row.status === 'LOW_STOCK'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => {
                              setInvToast(`Reorder PO created for ${row.name}`);
                              setTimeout(() => setInvToast(null), 3000);
                            }}
                            className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800 transition"
                          >
                            Reorder
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. REPORTS & ANALYTICS                                   */}
      {/* ======================================================== */}
      {activeNav === 'ANALYTICS' && (
        <div className="space-y-6 max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                <BarChart3 className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                <span>Executive Platform Analytics & Cross-Property Yield</span>
              </h2>
              <p className={`text-xs ${subTextCls}`}>
                Gross Transaction Value (GTV), Average Daily Rate (ADR), RevPAR, and outlet sales performance.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {(['7D', '30D', '90D', 'YTD'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setAnalyticsTimeframe(t)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    analyticsTimeframe === t
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-white'
                      : theme === 'dark' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
              <button
                onClick={exportJsonSnapshot}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export P&L</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className={cardCls}>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Platform GTV</div>
              <div className="text-2xl font-black mt-1 text-emerald-400">₹1,42,85,000</div>
              <div className="text-[10px] text-emerald-400 font-semibold mt-1">↑ 18.4% vs last period</div>
            </div>
            <div className={cardCls}>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Network RevPAR</div>
              <div className="text-2xl font-black mt-1 text-slate-700 dark:text-slate-300">₹3,420</div>
              <div className="text-[10px] text-slate-400 mt-1">Per available room/day</div>
            </div>
            <div className={cardCls}>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Average Daily Rate (ADR)</div>
              <div className="text-2xl font-black mt-1 text-slate-700 dark:text-slate-300">₹4,850</div>
              <div className="text-[10px] text-slate-700 dark:text-slate-300 font-semibold mt-1">Luxury & Heritage tier</div>
            </div>
            <div className={cardCls}>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Avg Table Turnover</div>
              <div className="text-2xl font-black mt-1 text-slate-700 dark:text-slate-300">42 Mins</div>
              <div className="text-[10px] text-slate-700 dark:text-slate-300 font-semibold mt-1">F&B Outlets Combined</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={cardCls}>
              <h3 className="font-bold text-sm mb-4">Revenue Channel Distribution</h3>
              <div className="space-y-3">
                {[
                  { channel: 'Front Desk Walk-ins & Direct PMS', amount: '₹88.5 Lakhs', share: 62, color: 'bg-slate-800 dark:bg-slate-200' },
                  { channel: 'Restaurant Dine-In POS Orders', amount: '₹37.1 Lakhs', share: 26, color: 'bg-emerald-500' },
                  { channel: 'In-Room Dining (IRD) & Room Service', amount: '₹14.2 Lakhs', share: 10, color: 'bg-amber-500' },
                  { channel: 'Banquet Hall & Event Bookings', amount: '₹3.0 Lakhs', share: 2, color: 'bg-slate-800 dark:bg-slate-200' },
                ].map((c, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium">{c.channel}</span>
                      <span className="font-bold">{c.amount} ({c.share}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800/40 overflow-hidden">
                      <div className={`h-full ${c.color} rounded-full`} style={{ width: `${c.share}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={cardCls}>
              <h3 className="font-bold text-sm mb-4">Top Performing Properties</h3>
              <div className="space-y-3">
                {[
                  { name: 'Mahesh Hotel (Sikar, RJ)', revenue: '₹42,80,000', occupancy: '84%', rating: '4.9 ★' },
                  { name: 'The Royal Palm Resort & Suites (Jaipur)', revenue: '₹38,20,000', occupancy: '78%', rating: '4.8 ★' },
                  { name: 'Citrus Grand Executive Suites (Mumbai)', revenue: '₹34,10,000', occupancy: '74%', rating: '4.7 ★' },
                  { name: 'Udaipur Lakeside Heritage Haveli', revenue: '₹27,75,000', occupancy: '69%', rating: '4.8 ★' },
                ].map((prop, i) => (
                  <div key={i} className={`p-3 rounded-xl border flex items-center justify-between ${
                    theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div>
                      <div className="font-bold text-xs">{prop.name}</div>
                      <div className="text-[10px] text-slate-400">Occupancy: {prop.occupancy} • Guest Score: {prop.rating}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-xs text-emerald-400">{prop.revenue}</div>
                      <div className="text-[9px] text-slate-400">Total Yield</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. GUEST DIRECTORY CRM                                    */}
      {/* ======================================================== */}
      {activeNav === 'CUSTOMERS' && (
        <div className="space-y-6 max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                <User className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                <span>Global Guest Directory CRM & VIP Profiles</span>
              </h2>
              <p className={`text-xs ${subTextCls}`}>
                Consolidated guest history across all properties, lifetime value (LTV), and dietary preferences.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-3 py-1.5 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                18,420 Verified Guest Profiles
              </span>
            </div>
          </div>

          {crmToast && (
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs flex items-center justify-between">
              <span>{crmToast}</span>
              <button onClick={() => setCrmToast(null)}>✕</button>
            </div>
          )}

          <div className={cardCls}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                {(['ALL', 'PLATINUM', 'GOLD', 'SILVER'] as const).map((tier) => (
                  <button
                    key={tier}
                    onClick={() => setCrmTier(tier)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      crmTier === tier
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-white'
                        : theme === 'dark' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={crmSearch}
                  onChange={(e) => setCrmSearch(e.target.value)}
                  placeholder="Search guest name or mobile..."
                  className={`pl-8 pr-3 py-1.5 rounded-xl text-xs border outline-none ${
                    theme === 'dark' ? 'bg-black/30 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { name: 'Rajesh Singhania', mobile: '+91 98290 11223', email: 'rajesh.s@singhaniagroup.com', tier: 'PLATINUM', stays: 14, spend: '₹2,14,000', notes: 'Prefers 4th floor quiet suite. Jain food.' },
                { name: 'Dr. Priya Sharma', mobile: '+91 94140 88992', email: 'priya.sharma@aims.org', tier: 'GOLD', stays: 8, spend: '₹86,500', notes: 'Gluten-free breakfast. Early check-in requested.' },
                { name: 'Vikramaditya Rathore', mobile: '+91 98292 44331', email: 'vikram.rathore@rajasthan.in', tier: 'PLATINUM', stays: 19, spend: '₹3,40,000', notes: 'VIP Royal Suite loyalty member. Late checkout.' },
                { name: 'Ananya Deshmukh', mobile: '+91 97654 33221', email: 'ananya.d@fintech.io', tier: 'SILVER', stays: 4, spend: '₹34,000', notes: 'Business traveler. High-speed Wi-Fi required.' },
                { name: 'Suresh Kumar Gupta', mobile: '+91 99820 55441', email: 'skgupta@jaipurtextiles.com', tier: 'GOLD', stays: 11, spend: '₹1,28,000', notes: 'Prefers Table #4 for dinner meetings.' },
                { name: 'Meenakshi Iyer', mobile: '+91 94440 12890', email: 'meenakshi@chennaiholdings.com', tier: 'SILVER', stays: 5, spend: '₹42,500', notes: 'South Indian breakfast preference.' },
              ]
                .filter((g) => crmTier === 'ALL' || g.tier === crmTier)
                .filter((g) => g.name.toLowerCase().includes(crmSearch.toLowerCase()) || g.mobile.includes(crmSearch))
                .map((guest, idx) => (
                  <div key={idx} className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 ${
                    theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">{guest.name}</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded font-black ${
                          guest.tier === 'PLATINUM' ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800' :
                          guest.tier === 'GOLD' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                        }`}>
                          {guest.tier}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">{guest.mobile} • {guest.email}</div>
                      <div className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 mt-2">
                        {guest.stays} Completed Stays • Total LTV: <strong className="text-emerald-400">{guest.spend}</strong>
                      </div>
                      <div className="text-[10px] text-slate-400 italic mt-1 bg-black/20 p-2 rounded-lg">
                        "{guest.notes}"
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setCrmToast(`Consolidated folio opened for ${guest.name}`);
                        setTimeout(() => setCrmToast(null), 3000);
                      }}
                      className="w-full py-1.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                    >
                      View Consolidated Folio
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. MARKETING & PROMOTIONS                                */}
      {/* ======================================================== */}
      {activeNav === 'MARKETING' && (
        <div className="space-y-6 max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                <Tag className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                <span>Multi-Tenant Marketing & Discount Campaigns</span>
              </h2>
              <p className={`text-xs ${subTextCls}`}>
                Create promo codes, seasonal vouchers, and push banners across all properties.
              </p>
            </div>
          </div>

          {marketingToast && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
              <span>✓ {marketingToast}</span>
              <button onClick={() => setMarketingToast(null)}>✕</button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className={cardCls}>
              <h3 className="font-bold text-sm mb-3">Create Global Promo Campaign</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!promoCodeInput.trim()) return;
                  setCampaigns((prev) => [
                    { code: promoCodeInput.toUpperCase(), discount: `${promoDiscount}% OFF`, type: 'Custom Campaign', redemptions: 0, status: 'ACTIVE' },
                    ...prev,
                  ]);
                  setMarketingToast(`Campaign ${promoCodeInput.toUpperCase()} activated across all properties!`);
                  setPromoCodeInput('');
                  setTimeout(() => setMarketingToast(null), 4000);
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Coupon Code</label>
                  <input
                    type="text"
                    required
                    value={promoCodeInput}
                    onChange={(e) => setPromoCodeInput(e.target.value)}
                    placeholder="e.g. DIWALI25"
                    className={`${inputCls} w-full uppercase font-mono`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Discount Percentage (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={promoDiscount}
                    onChange={(e) => setPromoDiscount(Number(e.target.value))}
                    className={`${inputCls} w-full`}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition shadow-sm"
                >
                  Publish Campaign Across Chain
                </button>
              </form>
            </div>

            <div className={`lg:col-span-2 ${cardCls}`}>
              <h3 className="font-bold text-sm mb-3">Active Promotional Vouchers</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr>
                      <th className={tableHeaderCls}>Code</th>
                      <th className={tableHeaderCls}>Benefit</th>
                      <th className={tableHeaderCls}>Applies To</th>
                      <th className={tableHeaderCls}>Total Redemptions</th>
                      <th className={tableHeaderCls}>Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {campaigns.map((c, i) => (
                      <tr key={i} className="hover:bg-slate-100 dark:bg-slate-800 transition">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">{c.code}</td>
                        <td className="py-2.5 px-3 font-semibold">{c.discount}</td>
                        <td className="py-2.5 px-3 text-slate-400">{c.type}</td>
                        <td className="py-2.5 px-3 font-bold">{c.redemptions} used</td>
                        <td className="py-2.5 px-3">
                          <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                            c.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            c.status === 'SCHEDULED' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                            'bg-slate-500/10 text-slate-400'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. FEEDBACK & REVIEWS                                     */}
      {/* ======================================================== */}
      {activeNav === 'FEEDBACK' && (
        <div className="space-y-6 max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                <Star className="w-5 h-5 text-amber-500" />
                <span>Guest Sentiment & Cross-Property Reputation</span>
              </h2>
              <p className={`text-xs ${subTextCls}`}>
                Direct guest ratings from room QR portals, Google Reviews, and post-stay feedback.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-3 py-1.5 rounded-xl font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Network NPS: 78 (Excellent)
              </span>
            </div>
          </div>

          {feedbackToast && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
              <span>✓ {feedbackToast}</span>
              <button onClick={() => setFeedbackToast(null)}>✕</button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={cardCls}>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Average Guest Rating</div>
              <div className="text-3xl font-black mt-1 text-amber-400">4.84 / 5.0</div>
              <div className="text-[10px] text-slate-400 mt-1">Based on 1,842 verified checkouts</div>
            </div>
            <div className={cardCls}>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">F&B Quality Score</div>
              <div className="text-3xl font-black mt-1 text-emerald-400">96.2%</div>
              <div className="text-[10px] text-emerald-400 font-semibold mt-1">Authentic Taste & Speed</div>
            </div>
            <div className={cardCls}>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Housekeeping Cleanliness</div>
              <div className="text-3xl font-black mt-1 text-slate-700 dark:text-slate-300">98.1%</div>
              <div className="text-[10px] text-slate-700 dark:text-slate-300 font-semibold mt-1">Room Turnaround Standard</div>
            </div>
          </div>

          <div className={cardCls}>
            <h3 className="font-bold text-sm mb-4">Recent Verified Guest Reviews</h3>
            <div className="space-y-4">
              {[
                { id: 'REV-1', guest: 'Kavita Verma', hotel: 'Mahesh Hotel', rating: 5, comment: 'Phenomenal hospitality! The QR in-room dining arrived in 18 minutes, hot and delicious.', date: 'Today at 14:20' },
                { id: 'REV-2', guest: 'Col. Amit Bhargava', hotel: 'The Royal Palm Resort', rating: 5, comment: 'Seamless check-in with digital Aadhaar verification. Beautiful property.', date: 'Yesterday' },
                { id: 'REV-3', guest: 'Sneha Patel', hotel: 'Citrus Grand Executive', rating: 4, comment: 'Great executive room. Wi-Fi was very fast for my Zoom calls. Breakfast buffet was top notch.', date: '2 days ago' },
              ].map((rev) => (
                <div key={rev.id} className={`p-4 rounded-xl border space-y-2 ${
                  theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <strong className="text-xs">{rev.guest}</strong>
                      <span className="text-[10px] text-slate-400 ml-2">Stayed at {rev.hotel} • {rev.date}</span>
                    </div>
                    <div className="text-amber-400 font-bold text-xs">{'★'.repeat(rev.rating)}</div>
                  </div>
                  <p className="text-xs italic text-slate-300">"{rev.comment}"</p>
                  <div className="flex gap-2 pt-2 border-t border-slate-800/40">
                    <input
                      type="text"
                      placeholder="Write an official management response..."
                      value={replyInput[rev.id] || ''}
                      onChange={(e) => setReplyInput({ ...replyInput, [rev.id]: e.target.value })}
                      className={`${inputCls} flex-1 text-xs`}
                    />
                    <button
                      onClick={() => {
                        setFeedbackToast(`Official response published for ${rev.guest}'s review.`);
                        setReplyInput({ ...replyInput, [rev.id]: '' });
                        setTimeout(() => setFeedbackToast(null), 3000);
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>Reply</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. SUPPORT & HELPDESK                                     */}
      {/* ======================================================== */}
      {activeNav === 'SUPPORT' && (
        <div className="space-y-6 max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                <Headphones className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                <span>Super Admin Helpdesk & SLA Support Queue</span>
              </h2>
              <p className={`text-xs ${subTextCls}`}>
                Live escalation pipeline for hotel managers, hardware support, and billing queries.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-3 py-1.5 rounded-xl font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Avg Response: 12 Mins
              </span>
            </div>
          </div>

          {supportToast && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
              <span>✓ {supportToast}</span>
              <button onClick={() => setSupportToast(null)}>✕</button>
            </div>
          )}

          <div className={cardCls}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {(['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSupportFilter(s)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      supportFilter === s
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-white'
                        : theme === 'dark' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {tickets
                .filter((t) => supportFilter === 'ALL' || t.status === supportFilter)
                .map((ticket) => (
                  <div key={ticket.id} className={`p-4 rounded-xl border flex items-center justify-between ${
                    theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-700 dark:text-slate-300">{ticket.id}</span>
                        <span className="text-xs font-bold">{ticket.subject}</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                          ticket.priority === 'HIGH' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          ticket.priority === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                        }`}>
                          {ticket.priority}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Reported by <strong>{ticket.hotel}</strong> • {ticket.time}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                        ticket.status === 'RESOLVED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'
                      }`}>
                        {ticket.status}
                      </span>
                      {ticket.status !== 'RESOLVED' && (
                        <button
                          onClick={() => {
                            setTickets(tickets.map((t) => t.id === ticket.id ? { ...t, status: 'RESOLVED' } : t));
                            setSupportToast(`Ticket ${ticket.id} marked as RESOLVED.`);
                            setTimeout(() => setSupportToast(null), 3000);
                          }}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. INTEGRATIONS & WEBHOOKS                                */}
      {/* ======================================================== */}
      {activeNav === 'INTEGRATIONS' && (
        <div className="space-y-6 max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                <Cpu className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                <span>API Integrations & Payment Gateway Hub</span>
              </h2>
              <p className={`text-xs ${subTextCls}`}>
                Channel managers (SiteMinder, Staah), Payment Gateways (Razorpay, Stripe), and WhatsApp APIs.
              </p>
            </div>
            <button
              disabled={testingWebhook}
              onClick={() => {
                setTestingWebhook(true);
                setTimeout(() => {
                  setTestingWebhook(false);
                  setWebhookStatus('All 6 integration endpoints responding 200 OK (Latency: 142ms)');
                }, 1000);
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition flex items-center gap-1.5 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingWebhook ? 'animate-spin' : ''}`} />
              <span>Test All Webhooks</span>
            </button>
          </div>

          {webhookStatus && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
              <span>✓ {webhookStatus}</span>
              <button onClick={() => setWebhookStatus(null)}>✕</button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: 'Razorpay Route (Auto-Split Settlements)', type: 'Payment Gateway', status: 'CONNECTED', desc: 'Direct merchant settlements and guest UPI QR code generating engine.' },
              { name: 'Stripe Connect (International Cards)', type: 'Payment Gateway', status: 'ACTIVE', desc: 'Supports Visa, Mastercard, AMEX with multi-currency dynamic FX conversion.' },
              { name: 'Meta WhatsApp Business Cloud API', type: 'Messaging & Alerts', status: 'CONNECTED', desc: 'Sends booking vouchers, live kitchen order receipts & concierge bot replies.' },
              { name: 'SiteMinder Channel Manager', type: 'OTA Sync Engine', status: 'ACTIVE', desc: '2-way PMS room rate & inventory availability push across Booking.com & Agoda.' },
              { name: 'PineLabs EDC Terminal Protocol', type: 'Hardware EDC', status: 'CONNECTED', desc: 'Automatic card swipe and soundbox charge push over local Wi-Fi / IP.' },
              { name: 'Twilio Cloud SMS Gateway', type: 'SMS Gateway', status: 'CONNECTED', desc: 'Fallback SMS notifications for OTP and check-in confirmation.' },
            ].map((gate, i) => (
              <div key={i} className={cardCls}>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-xs">{gate.name}</div>
                  <span className="text-[9px] px-2 py-0.5 rounded font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {gate.status}
                  </span>
                </div>
                <div className="text-[10px] text-slate-700 dark:text-slate-300 font-semibold mb-2">{gate.type}</div>
                <p className="text-xs text-slate-400">{gate.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 8. BACKUP & DISASTER RECOVERY                            */}
      {/* ======================================================== */}
      {activeNav === 'BACKUP' && (
        <div className="space-y-6 max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                <Database className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                <span>Database Backup & Disaster Recovery Vault</span>
              </h2>
              <p className={`text-xs ${subTextCls}`}>
                Automated hourly WAL archiving, full MongoDB snapshots, and platform data exports.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={isSnapshotting}
                onClick={() => {
                  setIsSnapshotting(true);
                  setTimeout(() => {
                    setIsSnapshotting(false);
                    const now = new Date().toLocaleTimeString();
                    setLastSnapshotTime(`Just now (${now})`);
                    setBackupToast('Snapshot successfully created and synced to encrypted AWS S3 vault.');
                    setTimeout(() => setBackupToast(null), 4000);
                  }, 1500);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isSnapshotting ? 'Creating Snapshot...' : 'Create Instant Snapshot'}</span>
              </button>
              <button
                onClick={exportJsonSnapshot}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download JSON Dump</span>
              </button>
            </div>
          </div>

          {backupToast && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
              <span>✓ {backupToast}</span>
              <button onClick={() => setBackupToast(null)}>✕</button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={cardCls}>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Last Successful Snapshot</div>
              <div className="text-sm font-bold mt-1 text-emerald-400">{lastSnapshotTime}</div>
              <div className="text-[10px] text-slate-400 mt-1">Encrypted AES-256 GCM</div>
            </div>
            <div className={cardCls}>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Snapshot Retention</div>
              <div className="text-sm font-bold mt-1 text-slate-700 dark:text-slate-300">30 Days Rolling Window</div>
              <div className="text-[10px] text-slate-400 mt-1">Point-in-time recovery (PITR)</div>
            </div>
            <div className={cardCls}>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Cluster Replication</div>
              <div className="text-sm font-bold mt-1 text-slate-700 dark:text-slate-300">3 Nodes Synced (100%)</div>
              <div className="text-[10px] text-emerald-400 font-semibold mt-1">Primary + 2 Read Replicas</div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 9. SECURITY & ACCESS CONTROL                             */}
      {/* ======================================================== */}
      {activeNav === 'SECURITY' && (
        <div className="space-y-6 max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                <Shield className="w-5 h-5 text-emerald-500" />
                <span>Multi-Tenant Security & Boundary Isolation Matrix</span>
              </h2>
              <p className={`text-xs ${subTextCls}`}>
                Strict JWT auth checks, tenant x-hotel-id boundary enforcement, and CORS protections.
              </p>
            </div>
            <button
              disabled={isScanningSec}
              onClick={() => {
                setIsScanningSec(true);
                setTimeout(() => {
                  setIsScanningSec(false);
                  setSecScanPassed(true);
                  setSecToast('All 18 security diagnostic probes passed with 0 vulnerabilities detected.');
                  setTimeout(() => setSecToast(null), 4000);
                }, 1200);
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanningSec ? 'animate-spin' : ''}`} />
              <span>Run Security Audit Scan</span>
            </button>
          </div>

          {secToast && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
              <span>✓ {secToast}</span>
              <button onClick={() => setSecToast(null)}>✕</button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: 'Tenant Boundary Isolation Middleware', status: 'ENFORCED', desc: 'Every API request enforces valid JWT bearer token and matches x-hotel-id tenant header.' },
              { title: 'DDoS & Rate Limiting Threshold', status: 'ACTIVE (120 req/min)', desc: 'Prevents brute force attacks and abusive scraping across public booking endpoints.' },
              { title: 'Role-Based Access Control (RBAC)', status: 'ACTIVE', desc: 'Granular permissions restricting billing and sensitive audits to authorized operators only.' },
              { title: 'End-to-End TLS 1.3 Transport Encryption', status: 'VERIFIED', desc: 'A+ rated SSL certificate with automatic HTTPS redirect and HSTS preload.' },
            ].map((sec, i) => (
              <div key={i} className={cardCls}>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-xs">{sec.title}</div>
                  <span className="text-[9px] px-2 py-0.5 rounded font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {sec.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{sec.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 10. AI & AUTOMATION ENGINE                               */}
      {/* ======================================================== */}
      {activeNav === 'AI_AUTOMATION' && (
        <div className="space-y-6 max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                <Zap className="w-5 h-5 text-amber-500" />
                <span>SpiceAI Hospitality Intelligence & Bot Suite</span>
              </h2>
              <p className={`text-xs ${subTextCls}`}>
                Automated guest butler, predictive kitchen prep pacing, and smart room allocation.
              </p>
            </div>
            <span className="text-xs px-3 py-1.5 rounded-xl font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              SpiceAI v3.2 Engine Active
            </span>
          </div>

          {aiToast && (
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs flex items-center justify-between">
              <span>{aiToast}</span>
              <button onClick={() => setAiToast(null)}>✕</button>
            </div>
          )}

          <div className={cardCls}>
            <h3 className="font-bold text-sm mb-4">Autonomous AI Feature Governance</h3>
            <div className="space-y-4">
              {[
                { key: 'smartTableAllocation', label: 'Smart Table Allocation Engine', desc: 'Predicts guest party size and seating duration to optimize dining turnover.' },
                { key: 'kitchenPredictivePrep', label: 'Predictive Kitchen KDS Prep Pacing', desc: 'Alerts line chefs to start prep for complex items based on historical peak hours.' },
                { key: 'whatsappConcierge', label: 'WhatsApp 24/7 AI Guest Butler', desc: 'Answers guest queries about breakfast hours, Wi-Fi, and amenity bookings automatically.' },
                { key: 'dynamicYieldPricing', label: 'Dynamic Room Yield Pricing Optimizer', desc: 'Auto-adjusts room rates by ±15% during city events and surge occupancy.' },
                { key: 'smartMenuUpsell', label: 'Smart F&B Pairing & Cart Recommender', desc: 'Suggests high-margin mocktails and desserts during digital QR table ordering.' },
              ].map((f) => {
                const isEnabled = (aiFeatures as any)[f.key];
                return (
                  <div key={f.key} className={`p-4 rounded-xl border flex items-center justify-between ${
                    theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div>
                      <div className="font-bold text-xs">{f.label}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{f.desc}</div>
                    </div>
                    <button
                      onClick={() => {
                        const next = !isEnabled;
                        setAiFeatures({ ...aiFeatures, [f.key]: next });
                        setAiToast(`${f.label} is now ${next ? 'ENABLED' : 'DISABLED'}.`);
                        setTimeout(() => setAiToast(null), 3000);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        isEnabled
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {isEnabled ? 'Enabled ✓' : 'Disabled'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 11. BROADCAST NOTIFICATIONS                              */}
      {/* ======================================================== */}
      {activeNav === 'NOTIFICATIONS' && (
        <div className="space-y-6 max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                <Bell className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                <span>Global Cross-Tenant Broadcast Notifications</span>
              </h2>
              <p className={`text-xs ${subTextCls}`}>
                Dispatch instant operational alerts, maintenance banners, and policy bulletins to all hotels.
              </p>
            </div>
          </div>

          {broadcastToast && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
              <span>✓ {broadcastToast}</span>
              <button onClick={() => setBroadcastToast(null)}>✕</button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={cardCls}>
              <h3 className="font-bold text-sm mb-3">Compose New Network Broadcast</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!broadcastTitle.trim()) return;
                  setBroadcastHistory([
                    { id: `BC-${Date.now()}`, title: broadcastTitle, target: broadcastAudience === 'ALL' ? 'All Hotels' : 'Hotel Admins', date: 'Just now', readCount: '0 / 50' },
                    ...broadcastHistory,
                  ]);
                  setBroadcastToast(`Broadcast "${broadcastTitle}" dispatched to all selected properties!`);
                  setBroadcastTitle('');
                  setBroadcastMessage('');
                  setTimeout(() => setBroadcastToast(null), 4000);
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Broadcast Title</label>
                  <input
                    type="text"
                    required
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    placeholder="e.g. Scheduled System Upgrade Tonight"
                    className={`${inputCls} w-full`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Target Audience</label>
                  <select
                    value={broadcastAudience}
                    onChange={(e) => setBroadcastAudience(e.target.value as any)}
                    className={`${inputCls} w-full`}
                  >
                    <option value="ALL">All Active Hotels & Staff</option>
                    <option value="ADMINS">Hotel Administrators Only</option>
                    <option value="STAFF">Frontline Staff (Waiters, Cashiers)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Message Body</label>
                  <textarea
                    rows={3}
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="Details about the alert or update..."
                    className={`${inputCls} w-full`}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition shadow-sm flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Network Broadcast</span>
                </button>
              </form>
            </div>

            <div className={cardCls}>
              <h3 className="font-bold text-sm mb-3">Recent Broadcast History</h3>
              <div className="space-y-3">
                {broadcastHistory.map((bc) => (
                  <div key={bc.id} className={`p-3.5 rounded-xl border ${
                    theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{bc.title}</span>
                      <span className="text-[10px] text-slate-400">{bc.date}</span>
                    </div>
                    <div className="text-[10px] text-slate-700 dark:text-slate-300 mt-1">Audience: {bc.target} • Read: {bc.readCount}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 12. LOCALIZATION & CURRENCY                              */}
      {/* ======================================================== */}
      {activeNav === 'LANGUAGES' && (
        <div className="space-y-6 max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                <Globe className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                <span>Multi-Language & Multi-Currency Engine</span>
              </h2>
              <p className={`text-xs ${subTextCls}`}>
                Exchange rates, supported languages, and localized receipt formats.
              </p>
            </div>
            <button
              onClick={() => {
                setLanguageToast('Exchange rates synced from Reserve Bank of India (RBI) live API.');
                setTimeout(() => setLanguageToast(null), 3000);
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition flex items-center gap-1.5 shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Forex Rates</span>
            </button>
          </div>

          {languageToast && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
              <span>✓ {languageToast}</span>
              <button onClick={() => setLanguageToast(null)}>✕</button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={cardCls}>
              <h3 className="font-bold text-sm mb-3">Live Currency Exchange Rates (Base: INR ₹)</h3>
              <div className="space-y-3">
                {[
                  { code: 'USD', name: 'US Dollar', symbol: '$', rate: rates.USD },
                  { code: 'EUR', name: 'Euro', symbol: '€', rate: rates.EUR },
                  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', rate: rates.AED },
                  { code: 'GBP', name: 'British Pound', symbol: '£', rate: rates.GBP },
                ].map((c) => (
                  <div key={c.code} className={`p-3 rounded-xl border flex items-center justify-between ${
                    theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div>
                      <span className="font-bold text-xs">{c.code} ({c.name})</span>
                      <div className="text-[10px] text-slate-400">1 {c.code} = {c.rate} INR</div>
                    </div>
                    <span className="font-mono font-bold text-xs text-emerald-400">₹{c.rate.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={cardCls}>
              <h3 className="font-bold text-sm mb-3">Supported Languages</h3>
              <div className="space-y-2">
                {[
                  { lang: 'English (US & UK)', code: 'en', status: '100% Translated', badge: 'DEFAULT' },
                  { lang: 'Hindi (हिन्दी)', code: 'hi', status: '100% Translated', badge: 'VERIFIED' },
                  { lang: 'Arabic (العربية)', code: 'ar', status: '94% Translated', badge: 'RTL' },
                  { lang: 'French (Français)', code: 'fr', status: '88% Translated', badge: 'ACTIVE' },
                  { lang: 'German (Deutsch)', code: 'de', status: '85% Translated', badge: 'ACTIVE' },
                ].map((l) => (
                  <div key={l.code} className={`p-3 rounded-xl border flex items-center justify-between ${
                    theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div>
                      <div className="font-bold text-xs">{l.lang}</div>
                      <div className="text-[10px] text-slate-400">Locale code: {l.code}</div>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 rounded font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                      {l.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 13. GLOBAL PLATFORM SETTINGS                              */}
      {/* ======================================================== */}
      {activeNav === 'SETTINGS' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                <Settings className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                <span>Global Platform Control Plane Settings</span>
              </h2>
              <p className={`text-xs ${subTextCls}`}>
                Root enterprise SaaS configurations, operational contacts, and cloud regions.
              </p>
            </div>
          </div>

          {settingsToast && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
              <span>✓ {settingsToast}</span>
              <button onClick={() => setSettingsToast(null)}>✕</button>
            </div>
          )}

          <div className={cardCls}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSettingsToast('Platform settings saved successfully.');
                setTimeout(() => setSettingsToast(null), 3000);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Platform Brand Name</label>
                <input
                  type="text"
                  value={settingsForm.platformName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, platformName: e.target.value })}
                  className={`${inputCls} w-full`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Corporate Support Email</label>
                <input
                  type="email"
                  value={settingsForm.supportEmail}
                  onChange={(e) => setSettingsForm({ ...settingsForm, supportEmail: e.target.value })}
                  className={`${inputCls} w-full`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Primary Cloud Data Center</label>
                <input
                  type="text"
                  disabled
                  value={settingsForm.cloudRegion}
                  className={`${inputCls} w-full opacity-70 cursor-not-allowed`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Weekly Maintenance Window</label>
                <input
                  type="text"
                  value={settingsForm.maintenanceWindow}
                  onChange={(e) => setSettingsForm({ ...settingsForm, maintenanceWindow: e.target.value })}
                  className={`${inputCls} w-full`}
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition shadow-sm"
                >
                  Save Platform Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
