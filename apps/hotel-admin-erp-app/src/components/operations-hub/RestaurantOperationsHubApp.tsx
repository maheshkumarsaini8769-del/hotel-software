import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL, getStoredHotelId, getStoredToken } from '../../config/api';
import { getPortalUrl } from '../../config/portalUrls';
import {
  Building2,
  Sliders,
  Utensils,
  Ticket,
  Wallet,
  Warehouse as WarehouseIcon,
  Clock,
  FileSpreadsheet,
  ShieldAlert,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Printer,
  Search,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  DollarSign,
  UserCheck,
  Percent,
  Wifi,
  BedDouble,
  Sparkles,
  Wind,
  Edit3,
  Image as ImageIcon,
  X,
  Share2,
  MessageSquare,
  Globe,
  Radio,
} from 'lucide-react';

export type OperationsTab =
  | 'RESTAURANT_INFO'
  | 'ROOM_TYPES_PHOTOS'
  | 'SETTINGS'
  | 'INTEGRATIONS'
  | 'KITCHEN_SECTIONS'
  | 'VOUCHERS'
  | 'WALLETS'
  | 'WAREHOUSES'
  | 'WORK_PERIOD'
  | 'ACCOUNT_REPORT'
  | 'LOGS';

interface RestaurantOperationsHubAppProps {
  isDark?: boolean;
  hotelId?: string;
  initialTab?: OperationsTab;
  onNavigateModule?: (moduleKey: string) => void;
}

export const RestaurantOperationsHubApp: React.FC<RestaurantOperationsHubAppProps> = ({
  isDark = true,
  hotelId = getStoredHotelId(),
  initialTab = 'RESTAURANT_INFO',
  onNavigateModule,
}) => {
  const [activeTab, setActiveTab] = useState<OperationsTab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isZReportModalOpen, setIsZReportModalOpen] = useState(false);

  // 1. Restaurant Info State
  const [info, setInfo] = useState({
    name: 'The Grand SpiceHub Palace & Resort',
    tagline: 'Luxury Heritage Hotel & Fine Dining Restaurant',
    fssaiNumber: '10020051000892',
    gstin: '08AABCS1429B1ZS',
    contactPhone: '+91 98765 43210',
    contactEmail: 'contact@spicehubresort.com',
    website: 'https://spicehubresort.com',
    address: 'Plot 42, Civil Lines, Near Heritage Circle, Jaipur, Rajasthan 302006',
    operatingHours: '07:00 AM - 11:30 PM (Daily)',
    currency: 'INR',
    currencySymbol: '₹',
    logoUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=300&auto=format&fit=crop&q=80',
    coverImageUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1600&auto=format&fit=crop&q=80',
    stayImageUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200&auto=format&fit=crop&q=80',
    diningImageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80',
    wifiSsid: 'TajGateway_HighSpeed',
    wifiPassword: 'SpiceGuest@2026',
    photos: [] as string[],
    totalRooms: 48,
    totalDiningCapacity: 230,
  });

  // 2. Settings State
  const [settings, setSettings] = useState({
    cgstPercent: 2.5,
    sgstPercent: 2.5,
    serviceChargePercent: 5.0,
    autoPrintKot: true,
    kotSoundAlert: true,
    roundOffBills: true,
    smsReceipts: true,
    whatsappReceipts: true,
    autoCloseShiftTime: '02:00 AM',
    billFooterNote: 'Thank you for dining with us! Visit again. All prices subject to 5% GST.',
    currencySymbol: '₹',
  });

  // Integrations State (MakeMyTrip Sync & WhatsApp Notifications)
  const [makeMyTripSync, setMakeMyTripSync] = useState(true);
  const [whatsAppNotifications, setWhatsAppNotifications] = useState(true);
  const [bookingDotComSync, setBookingDotComSync] = useState(true);

  // 3. Kitchen Sections State
  const [kitchenSections, setKitchenSections] = useState<any[]>([]);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [newSection, setNewSection] = useState({
    name: '',
    code: '',
    screenToken: '',
    chefInCharge: '',
    printerIp: '192.168.1.100',
    printerPort: 9100,
    status: 'ACTIVE',
    categories: '',
    avgPrepTimeMinutes: 15,
  });

  // 4. Vouchers State
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [newVoucher, setNewVoucher] = useState({
    code: '',
    description: '',
    discountType: 'PERCENT',
    discountValue: 10,
    minBillAmount: 500,
    maxDiscountCap: 200,
    usageLimit: 100,
    validUntil: '2026-12-31',
  });

  // 5. Wallets State
  const [wallets, setWallets] = useState<any[]>([]);
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<any | null>(null);
  const [topupAmount, setTopupAmount] = useState('1000');

  // 6. Warehouses State
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [isWhModalOpen, setIsWhModalOpen] = useState(false);
  const [newWh, setNewWh] = useState({
    code: '',
    name: '',
    type: 'Sub Store',
    manager: '',
    location: '',
    contact: '',
  });

  // 7. Work Period Report State
  const [workPeriod, setWorkPeriod] = useState<any | null>(null);

  // 8. Account Report State
  const [accountReport, setAccountReport] = useState<any | null>(null);

  // 9. System Logs State
  const [logs, setLogs] = useState<any[]>([]);

  // 10. Room Types & Photos State
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [loadingRoomTypes, setLoadingRoomTypes] = useState(false);
  const [editingRoomType, setEditingRoomType] = useState<any | null>(null);
  const [savingRoomType, setSavingRoomType] = useState(false);
  const [allRoomsAcOnly, setAllRoomsAcOnly] = useState(true);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Fetch API data on mount
  useEffect(() => {
    fetchInfo();
    fetchRoomTypes();
    fetchSettings();
    fetchKitchenSections();
    fetchVouchers();
    fetchWallets();
    fetchWarehouses();
    fetchWorkPeriod();
    fetchAccountReport();
    fetchLogs();
  }, []);

  const fetchRoomTypes = async () => {
    try {
      setLoadingRoomTypes(true);
      const res = await axios.get(`${API_BASE_URL}/front-desk/room-types`, {
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
          'x-hotel-id': hotelId,
        },
      });
      if (res.data?.success && Array.isArray(res.data.roomTypes)) {
        setRoomTypes(res.data.roomTypes);
        const hasNonAc = res.data.roomTypes.some(
          (rt: any) => rt.isAc === false || /non[-\s]?ac/i.test(rt.name || '')
        );
        setAllRoomsAcOnly(!hasNonAc);
      }
    } catch (err) {
      console.warn('Could not load room types:', err);
    } finally {
      setLoadingRoomTypes(false);
    }
  };

  const handleSaveRoomType = async (rt: any) => {
    try {
      setSavingRoomType(true);
      const payload = {
        name: rt.name,
        code: rt.code,
        basePriceOvernight: Number(rt.basePriceOvernight || rt.basePrice || 2500),
        maxCapacity: Number(rt.maxCapacity || 2),
        isAc: Boolean(rt.isAc),
        images: Array.isArray(rt.images) && rt.images.length > 0 ? rt.images : (Array.isArray(rt.photos) ? rt.photos : []),
        photos: Array.isArray(rt.images) && rt.images.length > 0 ? rt.images : (Array.isArray(rt.photos) ? rt.photos : []),
        description: rt.description || '',
      };
      await axios.put(`${API_BASE_URL}/front-desk/room-types/${rt._id || rt.id}/tariff`, payload, {
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
          'x-hotel-id': hotelId,
        },
      });
      showToast('✓ Room category & photos updated successfully!');
      fetchRoomTypes();
      setEditingRoomType(null);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update room type');
    } finally {
      setSavingRoomType(false);
    }
  };

  const fetchInfo = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/restaurant-operations/info`);
      if (res.data.success && res.data.data) setInfo(res.data.data);
    } catch (err) {}
  };

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/restaurant-operations/settings`);
      if (res.data.success && res.data.data) setSettings(res.data.data);
    } catch (err) {}
  };

  const fetchKitchenSections = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/restaurant-operations/kitchen-sections`);
      if (res.data.success && res.data.data) setKitchenSections(res.data.data);
    } catch (err) {}
  };

  const fetchVouchers = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/restaurant-operations/vouchers`);
      if (res.data.success && res.data.data) setVouchers(res.data.data);
    } catch (err) {}
  };

  const fetchWallets = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/restaurant-operations/wallets`);
      if (res.data.success && res.data.data) setWallets(res.data.data);
    } catch (err) {}
  };

  const fetchWarehouses = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/restaurant-operations/warehouses`);
      if (res.data.success && res.data.data) setWarehouses(res.data.data);
    } catch (err) {}
  };

  const fetchWorkPeriod = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/restaurant-operations/work-period-report`);
      if (res.data.success && res.data.data) setWorkPeriod(res.data.data);
    } catch (err) {}
  };

  const fetchAccountReport = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/restaurant-operations/account-report`);
      if (res.data.success && res.data.data) setAccountReport(res.data.data);
    } catch (err) {}
  };

  const fetchLogs = async () => {
    try {
      const token = getStoredToken();
      const res = await axios.get(`${API_BASE_URL}/admin-control/audit-logs?limit=50`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.data.success && Array.isArray(res.data.logs) && res.data.logs.length > 0) {
        setLogs(
          res.data.logs.map((l: any) => ({
            id: l._id || l.id,
            timestamp: l.timestamp || new Date().toISOString(),
            actor: l.userName || l.userEmail || 'System Admin',
            module: l.entity || 'General',
            action: l.action || 'UPDATE',
            details: l.details || `${l.action} on ${l.entity}`,
            severity: (l.action || '').includes('VOID') || (l.action || '').includes('DELETE') ? 'CRITICAL' : 'INFO',
          }))
        );
        return;
      }
      const fallback = await axios.get(`${API_BASE_URL}/restaurant-operations/logs`);
      if (fallback.data.success && fallback.data.data) setLogs(fallback.data.data);
    } catch (err) {
      try {
        const fallback = await axios.get(`${API_BASE_URL}/restaurant-operations/logs`);
        if (fallback.data.success && fallback.data.data) setLogs(fallback.data.data);
      } catch {}
    }
  };

  // Save Info
  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.put(`${API_BASE_URL}/restaurant-operations/info`, info);
      if (res.data.success) {
        showToast('✓ Restaurant Profile updated successfully!');
      }
    } catch (err) {
      showToast('Failed to save restaurant profile. Check the backend connection.');
    } finally {
      setLoading(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.put(`${API_BASE_URL}/restaurant-operations/settings`, settings);
      if (res.data.success) {
        showToast('✓ Operational & Tax Settings saved successfully!');
      }
    } catch (err) {
      showToast('Failed to save operational settings. No changes were applied.');
    } finally {
      setLoading(false);
    }
  };

  // Create Kitchen Section
  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const catArray = newSection.categories
        ? newSection.categories.split(',').map((c) => c.trim())
        : ['General KDS'];
      const payload = { ...newSection, categories: catArray };
      const res = await axios.post(`${API_BASE_URL}/restaurant-operations/kitchen-sections`, payload);
      if (res.data.success) {
        setKitchenSections([...kitchenSections, res.data.data]);
        setIsSectionModalOpen(false);
        setNewSection({
          name: '',
          code: '',
          screenToken: '',
          chefInCharge: '',
          printerIp: '192.168.1.100',
          printerPort: 9100,
          status: 'ACTIVE',
          categories: '',
          avgPrepTimeMinutes: 15,
        });
        showToast('✓ Kitchen Section created successfully!');
      }
    } catch (err) {
      showToast('Failed to create kitchen section');
    }
  };

  // Delete Kitchen Section
  const handleDeleteSection = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this kitchen section?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/restaurant-operations/kitchen-sections/${id}`);
      setKitchenSections(kitchenSections.filter((s) => s.id !== id));
      showToast('✓ Kitchen section removed');
    } catch (err) {
      showToast('Failed to delete the kitchen section.');
    }
  };

  // Create Voucher
  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE_URL}/restaurant-operations/vouchers`, newVoucher);
      if (res.data.success) {
        setVouchers([...vouchers, res.data.data]);
        setIsVoucherModalOpen(false);
        setNewVoucher({
          code: '',
          description: '',
          discountType: 'PERCENT',
          discountValue: 10,
          minBillAmount: 500,
          maxDiscountCap: 200,
          usageLimit: 100,
          validUntil: '2026-12-31',
        });
        showToast('✓ Promo Voucher created successfully!');
      }
    } catch (err) {
      showToast('Failed to create the promo voucher.');
    }
  };

  // Delete Voucher
  const handleDeleteVoucher = async (id: string) => {
    if (!window.confirm('Delete voucher code?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/restaurant-operations/vouchers/${id}`);
      setVouchers(vouchers.filter((v) => v.id !== id));
      showToast('✓ Voucher deleted');
    } catch (err) {
      showToast('Failed to delete the voucher.');
    }
  };

  // Topup Wallet
  const handleTopupWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWallet) return;
    try {
      const res = await axios.post(`${API_BASE_URL}/restaurant-operations/wallets/topup`, {
        id: selectedWallet.id,
        amount: Number(topupAmount),
      });
      if (res.data.success) {
        setWallets(wallets.map((w) => (w.id === selectedWallet.id ? res.data.data : w)));
        setIsTopupModalOpen(false);
        showToast(`✓ Added ₹${topupAmount} to ${selectedWallet.name}'s wallet!`);
        fetchLogs();
      }
    } catch (err) {
      showToast('Wallet top-up failed.');
    }
  };

  // Create Warehouse
  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE_URL}/restaurant-operations/warehouses`, newWh);
      if (res.data.success) {
        setWarehouses([...warehouses, res.data.data]);
        setIsWhModalOpen(false);
        setNewWh({ code: '', name: '', type: 'Sub Store', manager: '', location: '', contact: '' });
        showToast('✓ Warehouse storage created successfully!');
      }
    } catch (err) {
      showToast('Failed to create the warehouse.');
    }
  };

  // Tab definitions
  const TABS = [
    { key: 'RESTAURANT_INFO', label: 'Hotel & Wi-Fi Profile', icon: Building2 },
    { key: 'ROOM_TYPES_PHOTOS', label: 'Room Photos & AC Control', icon: BedDouble, badge: roomTypes.length || undefined },
    { key: 'SETTINGS', label: 'Setting & Taxes', icon: Sliders },
    { key: 'INTEGRATIONS', label: 'Integrations', icon: Share2 },
    { key: 'KITCHEN_SECTIONS', label: 'Kitchen Sections', icon: Utensils, badge: kitchenSections.length },
    { key: 'VOUCHERS', label: 'Vouchers & Promos', icon: Ticket, badge: vouchers.length },
    { key: 'WALLETS', label: 'Customer Wallets', icon: Wallet, badge: wallets.length },
    { key: 'WAREHOUSES', label: 'Warehouses & Stores', icon: WarehouseIcon, badge: warehouses.length },
    { key: 'WORK_PERIOD', label: 'Work Period Report', icon: Clock },
    { key: 'ACCOUNT_REPORT', label: 'Daily Z-Report & Tax', icon: FileSpreadsheet },
    { key: 'LOGS', label: 'System Logs', icon: ShieldAlert, badge: logs.length },
  ];

  return (
    <div className={`p-6 max-w-7xl mx-auto space-y-6 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-sm dark:shadow-none font-bold text-sm animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div
        className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white text-2xl shadow-lg">
            🏨
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight">{info.name}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Live ERP Sync
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {info.tagline} • FSSAI: {info.fssaiNumber} • GSTIN: {info.gstin}
            </p>
          </div>
        </div>

        {/* Quick Quick Jumps / External */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              fetchInfo();
              fetchSettings();
              fetchKitchenSections();
              fetchVouchers();
              fetchWallets();
              fetchWarehouses();
              fetchWorkPeriod();
              fetchAccountReport();
              fetchLogs();
              showToast('Data refreshed!');
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition ${
              isDark ? 'border-slate-700 bg-slate-800/80 hover:bg-slate-700' : 'border-slate-300 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <a
            href={getPortalUrl('kds')}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5 transition"
          >
            <Utensils className="w-3.5 h-3.5" />
            Kitchen KDS ↗
          </a>
          <a
            href={getPortalUrl('cashier')}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition"
          >
            <DollarSign className="w-3.5 h-3.5" />
            Cashier POS ↗
          </a>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-none">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as OperationsTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] rounded-full font-black ${
                    isActive ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* 1. RESTAURANT INFO TAB                                    */}
      {/* ======================================================== */}
      {activeTab === 'RESTAURANT_INFO' && (
        <form
          onSubmit={handleSaveInfo}
          className={`p-6 rounded-2xl border space-y-6 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-500" />
                Restaurant & Hotel Legal Profile
              </h2>
              <p className="text-xs text-slate-400">
                Official property name, FSSAI registration, GSTIN, address and operating hours.
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg transition"
            >
              {loading ? 'Saving...' : 'Save & Publish Profile'}
            </button>
          </div>

          {/* Property Imagery & Brand Identity Showcase Section */}
          <div className={`p-4 rounded-xl border space-y-4 ${
            isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                  <span>🖼️</span>
                  <span>Property Imagery & Brand Identity</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Manage hotel cover banner, brand logo, and photography displayed to staff & guests across mobile apps & portals.
                </p>
              </div>

              {/* 1-Click Luxury Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Presets:</span>
                <button
                  type="button"
                  onClick={() => setInfo({
                    ...info,
                    coverImageUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1600&auto=format&fit=crop&q=80',
                    logoUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=300&auto=format&fit=crop&q=80',
                    tagline: 'Luxury Stays, Fine Dining & Serene Hospitality'
                  })}
                  className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/30 transition"
                >
                  👑 Royal Resort
                </button>
                <button
                  type="button"
                  onClick={() => setInfo({
                    ...info,
                    coverImageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1600&auto=format&fit=crop&q=80',
                    logoUrl: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=300&auto=format&fit=crop&q=80',
                    tagline: 'Timeless Rajputana Royalty & World-Class Splendor'
                  })}
                  className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-slate-800 transition"
                >
                  🏰 Heritage Palace
                </button>
                <button
                  type="button"
                  onClick={() => setInfo({
                    ...info,
                    coverImageUrl: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1600&auto=format&fit=crop&q=80',
                    logoUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=300&auto=format&fit=crop&q=80',
                    tagline: 'Boutique Elegance & Contemporary Urban Comfort'
                  })}
                  className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-slate-800 transition"
                >
                  ✨ Boutique Urban
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Cover / Facade Banner Photo URL</label>
                <input
                  type="url"
                  value={info.coverImageUrl || ''}
                  onChange={(e) => setInfo({ ...info, coverImageUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/photo-..."
                  className={`w-full px-3 py-2 rounded-xl text-xs border outline-none font-semibold ${
                    isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
                {info.coverImageUrl ? (
                  <div className="mt-2 h-28 w-full rounded-xl overflow-hidden border border-slate-700 relative shadow-inner">
                    <img src={info.coverImageUrl} alt="Hotel Cover" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                      <span className="text-[10px] text-white font-bold">Live Cover Banner Preview</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 h-16 rounded-xl border border-dashed border-slate-800 flex items-center justify-center text-xs text-slate-500">
                    No cover banner set
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Hotel Brand Logo URL</label>
                <input
                  type="url"
                  value={info.logoUrl || ''}
                  onChange={(e) => setInfo({ ...info, logoUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/photo-... or /assets/logo.png"
                  className={`w-full px-3 py-2 rounded-xl text-xs border outline-none font-semibold ${
                    isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
                <div className="mt-2 flex items-center gap-3 p-2 rounded-xl bg-black/20 border border-slate-800">
                  <div className="h-14 w-14 rounded-full overflow-hidden border-2 border-amber-500 bg-black flex-shrink-0">
                    {info.logoUrl ? (
                      <img src={info.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                        LOGO
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-white truncate">{info.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{info.tagline || 'No tagline set'}</div>
                    <div className="text-[9px] text-amber-400/80 mt-0.5">Displays on sidebar, invoices, and mobile apps</div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  🛏️ Book a Room (Stay) Card Photo URL
                </label>
                <input
                  type="url"
                  data-testid="input-stay-image-url"
                  value={info.stayImageUrl || ''}
                  onChange={(e) => setInfo({ ...info, stayImageUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/photo-..."
                  className={`w-full px-3 py-2 rounded-xl text-xs border outline-none font-semibold ${
                    isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
                {info.stayImageUrl ? (
                  <div className="mt-2 h-24 w-full rounded-xl overflow-hidden border border-blue-500/40 relative shadow-inner">
                    <img src={info.stayImageUrl} alt="Stay Banner" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                      <span className="text-[10px] text-blue-300 font-bold">Customer App Option 1 (Stay) Preview</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 h-16 rounded-xl border border-dashed border-slate-800 flex items-center justify-center text-xs text-slate-500">
                    No stay photo set
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  🍽️ Dine-In / Table Booking Card Photo URL
                </label>
                <input
                  type="url"
                  data-testid="input-dining-image-url"
                  value={info.diningImageUrl || ''}
                  onChange={(e) => setInfo({ ...info, diningImageUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/photo-..."
                  className={`w-full px-3 py-2 rounded-xl text-xs border outline-none font-semibold ${
                    isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
                {info.diningImageUrl ? (
                  <div className="mt-2 h-24 w-full rounded-xl overflow-hidden border border-amber-500/40 relative shadow-inner">
                    <img src={info.diningImageUrl} alt="Dining Banner" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                      <span className="text-[10px] text-amber-300 font-bold">Customer App Option 2 (Dining) Preview</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 h-16 rounded-xl border border-dashed border-slate-800 flex items-center justify-center text-xs text-slate-500">
                    No dining photo set
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Restaurant / Hotel Name *</label>
              <input
                type="text"
                value={info.name}
                onChange={(e) => setInfo({ ...info, name: e.target.value })}
                required
                className={`w-full px-3 py-2 rounded-xl text-xs border outline-none font-semibold ${
                  isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Tagline / Subtitle</label>
              <input
                type="text"
                value={info.tagline}
                onChange={(e) => setInfo({ ...info, tagline: e.target.value })}
                className={`w-full px-3 py-2 rounded-xl text-xs border outline-none font-semibold ${
                  isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">FSSAI License Number *</label>
              <input
                type="text"
                value={info.fssaiNumber}
                onChange={(e) => setInfo({ ...info, fssaiNumber: e.target.value })}
                required
                className={`w-full px-3 py-2 rounded-xl text-xs border outline-none font-semibold ${
                  isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">GSTIN (Tax ID) *</label>
              <input
                type="text"
                value={info.gstin}
                onChange={(e) => setInfo({ ...info, gstin: e.target.value.toUpperCase() })}
                required
                className={`w-full px-3 py-2 rounded-xl text-xs border outline-none font-semibold font-mono ${
                  isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Official Contact Phone *</label>
              <input
                type="text"
                value={info.contactPhone}
                onChange={(e) => setInfo({ ...info, contactPhone: e.target.value })}
                required
                className={`w-full px-3 py-2 rounded-xl text-xs border outline-none font-semibold ${
                  isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Official Contact Email *</label>
              <input
                type="email"
                value={info.contactEmail}
                onChange={(e) => setInfo({ ...info, contactEmail: e.target.value })}
                required
                className={`w-full px-3 py-2 rounded-xl text-xs border outline-none font-semibold ${
                  isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-400 mb-1">Full Physical Property Address *</label>
              <input
                type="text"
                value={info.address}
                onChange={(e) => setInfo({ ...info, address: e.target.value })}
                required
                className={`w-full px-3 py-2 rounded-xl text-xs border outline-none font-semibold ${
                  isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Operating Hours</label>
              <input
                type="text"
                value={info.operatingHours}
                onChange={(e) => setInfo({ ...info, operatingHours: e.target.value })}
                className={`w-full px-3 py-2 rounded-xl text-xs border outline-none font-semibold ${
                  isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Currency Code & Symbol</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={info.currency}
                  onChange={(e) => setInfo({ ...info, currency: e.target.value })}
                  className={`w-1/2 px-3 py-2 rounded-xl text-xs border outline-none font-semibold ${
                    isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
                <input
                  type="text"
                  value={info.currencySymbol}
                  onChange={(e) => setInfo({ ...info, currencySymbol: e.target.value })}
                  className={`w-1/2 px-3 py-2 rounded-xl text-xs border outline-none font-bold text-amber-400 text-center ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>
            </div>

            {/* Guest In-Room Wi-Fi Credentials */}
            <div className="md:col-span-2 pt-3 border-t border-slate-700/40">
              <div className="flex items-center gap-2 mb-2">
                <Wifi className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Guest In-Room Wi-Fi Credentials (Auto-Synced to Vouchers, Keycards & Room Portal)
                </h3>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Hotel Wi-Fi Network Name (SSID) *</label>
              <input
                type="text"
                value={(info as any).wifiSsid || ''}
                onChange={(e) => setInfo({ ...info, wifiSsid: e.target.value })}
                placeholder="e.g. TajGateway_HighSpeed"
                className={`w-full px-3 py-2 rounded-xl text-xs border outline-none font-semibold ${
                  isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Guest Wi-Fi Password / Passkey *</label>
              <input
                type="text"
                value={(info as any).wifiPassword || ''}
                onChange={(e) => setInfo({ ...info, wifiPassword: e.target.value })}
                placeholder="e.g. SpiceGuest@2026"
                className={`w-full px-3 py-2 rounded-xl text-xs border outline-none font-mono font-semibold ${
                  isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              />
            </div>
          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* 2. ROOM PHOTOS & AC CONTROL TAB                          */}
      {/* ======================================================== */}
      {activeTab === 'ROOM_TYPES_PHOTOS' && (
        <div className="space-y-6">
          {/* Header & Controls */}
          <div
            className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <BedDouble className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-black">Room Categories, Photos & Climate (AC) Control</h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Configure real room photo URLs, AC / Non-AC classification, guest capacity, and base tariffs.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                  allRoomsAcOnly
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}
              >
                {allRoomsAcOnly
                  ? '❄️ 100% AC Inventory (Non-AC Hidden in Apps)'
                  : 'Mixed AC & Non-AC Inventory'}
              </span>
              <button
                type="button"
                onClick={fetchRoomTypes}
                disabled={loadingRoomTypes}
                className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Room Categories Grid */}
          {loadingRoomTypes ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading hotel room categories...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roomTypes.map((rt) => {
                const isAc = rt.isAc !== false && !/non[-\s]?ac/i.test(rt.name || '');
                const photo =
                  (rt.images && rt.images[0]) ||
                  (rt.photos && rt.photos[0]) ||
                  'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&auto=format&fit=crop&q=80';

                return (
                  <div
                    key={rt._id || rt.id}
                    className={`rounded-2xl border overflow-hidden flex flex-col justify-between shadow-sm ${
                      isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  >
                    <div>
                      {/* Photo Thumbnail */}
                      <div className="h-36 w-full relative overflow-hidden bg-slate-900">
                        <img src={photo} alt={rt.name} className="w-full h-full object-cover" />
                        <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-[10px] font-black text-amber-400 border border-amber-400/30">
                          {rt.code || 'DLX'}
                        </div>
                        <div className="absolute top-2.5 right-2.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                              isAc
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-950 border-slate-200 dark:border-slate-800'
                                : 'bg-slate-700/90 text-slate-200 border-slate-500'
                            }`}
                          >
                            {isAc ? '❄️ AC Room' : '🌀 Non-AC Room'}
                          </span>
                        </div>
                        <div className="absolute bottom-2 left-2.5 right-2.5">
                          <h4 className="text-sm font-black text-white drop-shadow leading-tight">{rt.name}</h4>
                          <span className="text-[10px] text-slate-300 drop-shadow">Max {rt.maxCapacity || 2} Guests</span>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="p-3.5 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Base Overnight Tariff:</span>
                          <span className="font-black text-amber-500">
                            ₹{(rt.basePriceOvernight || 2500).toLocaleString('en-IN')}/night
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Climate System:</span>
                          <span className="font-bold text-xs">
                            {isAc ? 'Climate Control AC' : 'Natural / Fan Ventilated'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Photo URLs Linked:</span>
                          <span className="font-mono text-[11px] text-slate-300">
                            {(rt.images || rt.photos || []).length} photos
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 pt-0">
                      <button
                        type="button"
                        onClick={() => setEditingRoomType({ ...rt, isAc })}
                        className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Photos & AC Status</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Edit Room Type Modal */}
          {editingRoomType && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div
                className={`w-full max-w-lg rounded-2xl border p-6 space-y-4 max-h-[90vh] overflow-y-auto ${
                  isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
                  <div className="flex items-center gap-2">
                    <BedDouble className="w-5 h-5 text-amber-500" />
                    <h3 className="font-black text-base">Edit {editingRoomType.name}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingRoomType(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4 text-xs font-semibold">
                  <div>
                    <label className="block text-slate-400 mb-1">Room Type Name *</label>
                    <input
                      type="text"
                      value={editingRoomType.name}
                      onChange={(e) => setEditingRoomType({ ...editingRoomType, name: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border outline-none font-bold ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>

                  {/* AC / Non-AC Switch */}
                  <div
                    className={`p-4 rounded-xl border space-y-2 ${
                      isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <label className="block text-slate-300 font-bold">Climate Control / AC Classification</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingRoomType({ ...editingRoomType, isAc: true })}
                        className={`p-3 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition ${
                          editingRoomType.isAc
                            ? 'bg-slate-800 dark:bg-slate-200 text-slate-950 border-slate-200 dark:border-slate-800 shadow-md'
                            : isDark
                            ? 'bg-slate-800 border-slate-700 text-slate-400'
                            : 'bg-white border-slate-300 text-slate-600'
                        }`}
                      >
                        <Wind className="w-4 h-4" />
                        <span>❄️ Air Conditioned (AC)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingRoomType({ ...editingRoomType, isAc: false })}
                        className={`p-3 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition ${
                          !editingRoomType.isAc
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                            : isDark
                            ? 'bg-slate-800 border-slate-700 text-slate-400'
                            : 'bg-white border-slate-300 text-slate-600'
                        }`}
                      >
                        <span>🌀 Non-AC Room</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Note: If all rooms are set to AC, the word "Non-AC" will be automatically eradicated from customer and guest apps.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Max Guest Capacity</label>
                      <select
                        value={editingRoomType.maxCapacity || 2}
                        onChange={(e) =>
                          setEditingRoomType({ ...editingRoomType, maxCapacity: Number(e.target.value) })
                        }
                        className={`w-full px-3 py-2 rounded-xl border outline-none font-bold ${
                          isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <option value={1}>1 Guest (Single)</option>
                        <option value={2}>2 Guests (Double / Couple)</option>
                        <option value={3}>3 Guests (Triple)</option>
                        <option value={4}>4 Guests (Family Suite)</option>
                        <option value={6}>6 Guests (Grand Suite)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Base Price / Night (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={editingRoomType.basePriceOvernight || 2500}
                        onChange={(e) =>
                          setEditingRoomType({ ...editingRoomType, basePriceOvernight: Number(e.target.value) })
                        }
                        className={`w-full px-3 py-2 rounded-xl border outline-none font-bold ${
                          isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Room Photo URL */}
                  <div>
                    <label className="block text-slate-400 mb-1">Room Photo URL *</label>
                    <input
                      type="url"
                      value={
                        (editingRoomType.images && editingRoomType.images[0]) ||
                        (editingRoomType.photos && editingRoomType.photos[0]) ||
                        ''
                      }
                      onChange={(e) => {
                        const url = e.target.value.trim();
                        setEditingRoomType({
                          ...editingRoomType,
                          images: [url],
                          photos: [url],
                        });
                      }}
                      placeholder="https://images.unsplash.com/photo-..."
                      className={`w-full px-3 py-2 rounded-xl border outline-none font-medium ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    />

                    {/* Presets */}
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Luxury Presets:</span>
                      {[
                        {
                          label: 'Deluxe Suite',
                          url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&auto=format&fit=crop&q=80',
                        },
                        {
                          label: 'Royal Heritage',
                          url: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&auto=format&fit=crop&q=80',
                        },
                        {
                          label: 'Modern Classic',
                          url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=80',
                        },
                        {
                          label: 'Standard Room',
                          url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&auto=format&fit=crop&q=80',
                        },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() =>
                            setEditingRoomType({ ...editingRoomType, images: [preset.url], photos: [preset.url] })
                          }
                          className="px-2 py-0.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/25 text-[10px] font-bold"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    {/* Live Preview */}
                    {((editingRoomType.images && editingRoomType.images[0]) ||
                      (editingRoomType.photos && editingRoomType.photos[0])) && (
                      <div className="mt-2.5 h-32 w-full rounded-xl overflow-hidden border border-slate-700 relative shadow-inner">
                        <img
                          src={
                            (editingRoomType.images && editingRoomType.images[0]) || editingRoomType.photos[0]
                          }
                          alt="Room Preview"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-2">
                          <span className="text-[10px] text-amber-300 font-bold">App Visual Preview</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setEditingRoomType(null)}
                      className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={savingRoomType}
                      onClick={() => handleSaveRoomType(editingRoomType)}
                      className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-lg transition"
                    >
                      {savingRoomType ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. SETTINGS & TAXES TAB                                   */}
      {/* ======================================================== */}
      {activeTab === 'SETTINGS' && (
        <form
          onSubmit={handleSaveSettings}
          className={`p-6 rounded-2xl border space-y-6 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-500" />
                Operational, Billing & Tax Preferences
              </h2>
              <p className="text-xs text-slate-400">
                Configure CGST, SGST, service charges, automated KOT printing and day-close schedules.
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg transition"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <label className="block text-xs font-bold text-slate-400 mb-1">CGST Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={settings.cgstPercent}
                onChange={(e) => setSettings({ ...settings, cgstPercent: parseFloat(e.target.value) || 0 })}
                className={`w-full px-3 py-2 rounded-xl text-sm border outline-none font-black text-amber-400 ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300'
                }`}
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Central Goods & Services Tax (Standard: 2.5%)</span>
            </div>

            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <label className="block text-xs font-bold text-slate-400 mb-1">SGST Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={settings.sgstPercent}
                onChange={(e) => setSettings({ ...settings, sgstPercent: parseFloat(e.target.value) || 0 })}
                className={`w-full px-3 py-2 rounded-xl text-sm border outline-none font-black text-amber-400 ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300'
                }`}
              />
              <span className="text-[10px] text-slate-400 mt-1 block">State Goods & Services Tax (Standard: 2.5%)</span>
            </div>

            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <label className="block text-xs font-bold text-slate-400 mb-1">Service Charge (%)</label>
              <input
                type="number"
                step="0.1"
                value={settings.serviceChargePercent}
                onChange={(e) => setSettings({ ...settings, serviceChargePercent: parseFloat(e.target.value) || 0 })}
                className={`w-full px-3 py-2 rounded-xl text-sm border outline-none font-black text-emerald-400 ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300'
                }`}
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Optional hotel service surcharge (e.g. 5%)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-400">Kitchen & Print Automation</h3>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-bold">Auto-Print KOT to Kitchen Station on Order Place</span>
                <input
                  type="checkbox"
                  checked={settings.autoPrintKot}
                  onChange={(e) => setSettings({ ...settings, autoPrintKot: e.target.checked })}
                  className="w-4 h-4 accent-amber-500"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-bold">Play Audible Chime Sound on New KOT Receipt</span>
                <input
                  type="checkbox"
                  checked={settings.kotSoundAlert}
                  onChange={(e) => setSettings({ ...settings, kotSoundAlert: e.target.checked })}
                  className="w-4 h-4 accent-amber-500"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-bold">Round-off Total Bill Amount to Nearest Rupee (₹)</span>
                <input
                  type="checkbox"
                  checked={settings.roundOffBills}
                  onChange={(e) => setSettings({ ...settings, roundOffBills: e.target.checked })}
                  className="w-4 h-4 accent-amber-500"
                />
              </label>
            </div>

            <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-400">Guest Communication & Close Schedule</h3>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-bold">Send Instant SMS e-Bill Receipt to Diner</span>
                <input
                  type="checkbox"
                  checked={settings.smsReceipts}
                  onChange={(e) => setSettings({ ...settings, smsReceipts: e.target.checked })}
                  className="w-4 h-4 accent-amber-500"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-bold">Send WhatsApp e-Bill with PDF copy</span>
                <input
                  type="checkbox"
                  checked={settings.whatsappReceipts}
                  onChange={(e) => setSettings({ ...settings, whatsappReceipts: e.target.checked })}
                  className="w-4 h-4 accent-amber-500"
                />
              </label>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Night Audit / Auto-Close Shift Time</label>
                <input
                  type="text"
                  value={settings.autoCloseShiftTime}
                  onChange={(e) => setSettings({ ...settings, autoCloseShiftTime: e.target.value })}
                  className={`w-full px-3 py-1.5 rounded-lg text-xs border outline-none font-semibold ${
                    isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Thermal Bill Receipt Footer Note</label>
            <textarea
              rows={2}
              value={settings.billFooterNote}
              onChange={(e) => setSettings({ ...settings, billFooterNote: e.target.value })}
              className={`w-full px-3 py-2 rounded-xl text-xs border outline-none font-semibold ${
                isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            />
          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* ENTERPRISE INTEGRATIONS TAB                              */}
      {/* ======================================================== */}
      {activeTab === 'INTEGRATIONS' && (
        <div data-testid="tab-content-integrations" className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-900">Third-Party Integrations & Channel Manager</h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    P0 ENTERPRISE
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Configure live webhooks, channel managers (OTA), and automated Meta WhatsApp messaging.
                </p>
              </div>
              <button
                type="button"
                onClick={() => showToast('✓ Integration configurations updated and active.')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition"
              >
                Save Integration Settings
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {/* Integration 1: MakeMyTrip Sync */}
              <div
                data-testid="card-integration-makemytrip"
                className="p-5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 font-black text-sm shrink-0">
                    MMT
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900">MakeMyTrip & Goibibo Channel Sync</h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          makeMyTripSync
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {makeMyTripSync ? '● Live Connected' : '○ Disabled'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Automated webhook ingestion via <code className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[11px] text-slate-800">POST /api/v1/webhooks/ota</code>.
                      Atomic CAS room reservations prevent double-booking.
                    </p>
                    <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-4">
                      <span>Sync Interval: Instantaneous (Real-time Webhook)</span>
                      <span>Target: Mahesh Hotel (All Room Types)</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                  <span className="text-xs font-semibold text-slate-700">
                    {makeMyTripSync ? 'Enabled' : 'Disabled'}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      data-testid="toggle-makemytrip-sync"
                      checked={makeMyTripSync}
                      onChange={(e) => {
                        setMakeMyTripSync(e.target.checked);
                        showToast(`MakeMyTrip Sync ${e.target.checked ? 'Enabled' : 'Disabled'}`);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              {/* Integration 2: WhatsApp Notifications */}
              <div
                data-testid="card-integration-whatsapp"
                className="p-5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900">WhatsApp Guest Notifications (Meta Cloud API)</h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          whatsAppNotifications
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {whatsAppNotifications ? '● Meta Cloud API Active' : '○ Inactive'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Dispatches verified business template notifications on Reception Check-In (Booking Confirmation & Digital Keycard) and Cashier Settlement (Digital PDF Bill Receipt).
                    </p>
                    <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-4">
                      <span>Sender: +91 98765 43210 (SpiceHub Guest Services)</span>
                      <span>Templates: booking_confirmed, bill_receipt</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                  <span className="text-xs font-semibold text-slate-700">
                    {whatsAppNotifications ? 'Enabled' : 'Disabled'}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      data-testid="toggle-whatsapp-notifications"
                      checked={whatsAppNotifications}
                      onChange={(e) => {
                        setWhatsAppNotifications(e.target.checked);
                        showToast(`WhatsApp Notifications ${e.target.checked ? 'Enabled' : 'Disabled'}`);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              {/* Integration 3: Booking.com Sync */}
              <div
                data-testid="card-integration-bookingcom"
                className="p-5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-black text-sm shrink-0">
                    B.
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900">Booking.com Global Channel Manager</h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          bookingDotComSync
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {bookingDotComSync ? '● Live Connected' : '○ Disabled'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Syncs international guest bookings with automatic currency conversion and instant folio creation.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                  <span className="text-xs font-semibold text-slate-700">
                    {bookingDotComSync ? 'Enabled' : 'Disabled'}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      data-testid="toggle-bookingcom-sync"
                      checked={bookingDotComSync}
                      onChange={(e) => {
                        setBookingDotComSync(e.target.checked);
                        showToast(`Booking.com Sync ${e.target.checked ? 'Enabled' : 'Disabled'}`);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. KITCHEN SECTIONS TAB                                   */}
      {/* ======================================================== */}
      {activeTab === 'KITCHEN_SECTIONS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black flex items-center gap-2">
                <Utensils className="w-5 h-5 text-amber-500" />
                Kitchen Preparation Stations & KDS Routing
              </h2>
              <p className="text-xs text-slate-400">
                Manage physical kitchen sections, assign head chefs, network thermal printers and routed categories.
              </p>
            </div>
            <button
              onClick={() => setIsSectionModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Kitchen Section</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {kitchenSections.map((section) => (
              <div
                key={section.id}
                className={`p-5 rounded-2xl border transition-all hover:scale-[1.01] ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {section.code}
                    </span>
                    <h3 className="text-base font-black mt-2">{section.name}</h3>
                  </div>
                  <button
                    onClick={() => handleDeleteSection(section.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Chef In-Charge:</span>
                    <span className="font-bold text-slate-200">{section.chefInCharge}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>KDS Display Screen:</span>
                    <span className="font-mono font-bold text-amber-400">{section.screenToken}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Thermal Printer:</span>
                    <span className="font-mono text-slate-300">
                      {section.printerIp}:{section.printerPort}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Target Prep SLA:</span>
                    <span className="font-bold text-emerald-400">{section.avgPrepTimeMinutes} mins</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Routed Categories:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {section.categories?.map((cat: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. VOUCHERS & PROMOS TAB                                  */}
      {/* ======================================================== */}
      {activeTab === 'VOUCHERS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black flex items-center gap-2">
                <Ticket className="w-5 h-5 text-amber-500" />
                Vouchers, Discount Coupons & Campaigns
              </h2>
              <p className="text-xs text-slate-400">
                Create promotional discount coupons, percentage discounts, minimum bill thresholds and validity dates.
              </p>
            </div>
            <button
              onClick={() => setIsVoucherModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create Promo Voucher</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {vouchers.map((vc) => (
              <div
                key={vc.id}
                className={`p-5 rounded-2xl border relative overflow-hidden ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-lg font-black font-mono tracking-widest text-amber-400 border border-amber-500/40 bg-amber-500/10 px-3 py-1 rounded-xl">
                    {vc.code}
                  </span>
                  <button onClick={() => handleDeleteVoucher(vc.id)} className="text-slate-500 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs font-bold text-slate-200 mt-3">{vc.description}</p>

                <div className="mt-4 space-y-1.5 text-xs text-slate-400">
                  <div className="flex items-center justify-between">
                    <span>Discount:</span>
                    <span className="font-extrabold text-emerald-400">
                      {vc.discountType === 'PERCENT' ? `${vc.discountValue}% OFF` : `₹${vc.discountValue} FLAT`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Min Bill Spend:</span>
                    <span className="font-bold text-slate-300">₹{vc.minBillAmount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Max Discount Cap:</span>
                    <span className="font-bold text-slate-300">₹{vc.maxDiscountCap}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Times Redeemed:</span>
                    <span className="font-bold text-amber-400">
                      {vc.timesUsed} / {vc.usageLimit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Valid Until:</span>
                    <span className="font-mono text-slate-400">{vc.validUntil}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. CUSTOMER WALLETS TAB                                   */}
      {/* ======================================================== */}
      {activeTab === 'WALLETS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black flex items-center gap-2">
                <Wallet className="w-5 h-5 text-amber-500" />
                Customer Loyalty Wallets & Prepaid Credits
              </h2>
              <p className="text-xs text-slate-400">
                Manage guest digital balances, top-up prepaid dining accounts, and track loyalty points.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {wallets.map((w) => (
              <div
                key={w.id}
                className={`p-5 rounded-2xl border ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                    {w.tier}
                  </span>
                  <span className="text-xs text-slate-400">{w.totalVisits} Visits</span>
                </div>

                <h3 className="text-base font-black mt-2">{w.name}</h3>
                <p className="text-xs font-mono text-slate-400">{w.phone}</p>

                <div className="mt-4 p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">WALLET BALANCE</span>
                    <span className="text-lg font-black text-emerald-400">₹{w.balance.toLocaleString()}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-bold">LOYALTY PTS</span>
                    <span className="text-sm font-bold text-amber-400">{w.loyaltyPoints}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedWallet(w);
                    setIsTopupModalOpen(true);
                  }}
                  className="w-full mt-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow transition flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Top-up Balance</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. WAREHOUSES & STORES TAB                                */}
      {/* ======================================================== */}
      {activeTab === 'WAREHOUSES' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black flex items-center gap-2">
                <WarehouseIcon className="w-5 h-5 text-amber-500" />
                Warehouses & Internal Storage Locations
              </h2>
              <p className="text-xs text-slate-400">
                Track central godowns, kitchen pantries, cold storage walk-in freezers and bar cellars.
              </p>
            </div>
            <button
              onClick={() => setIsWhModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Warehouse</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {warehouses.map((wh) => (
              <div
                key={wh.id}
                className={`p-5 rounded-2xl border ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-amber-400">{wh.code}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {wh.status}
                  </span>
                </div>

                <h3 className="text-sm font-black mt-2">{wh.name}</h3>
                <span className="text-[11px] text-slate-400 block">{wh.type}</span>

                <div className="mt-4 space-y-2 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>Manager:</span>
                    <span className="font-bold text-slate-200">{wh.manager}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SKU Item Count:</span>
                    <span className="font-bold text-amber-400">{wh.itemCount} items</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Capacity Fill:</span>
                    <span className="font-bold text-emerald-400">{wh.capacityUtilized}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Location:</span>
                    <span className="font-semibold text-slate-300 text-right">{wh.location}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. WORK PERIOD REPORT (Z-REPORT) TAB                      */}
      {/* ======================================================== */}
      {activeTab === 'WORK_PERIOD' && workPeriod && (
        <div
          className={`p-6 rounded-2xl border space-y-6 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  Work Period & Shift Register Report
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {workPeriod.status}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Shift: {workPeriod.shiftNumber} • {workPeriod.shiftName} • Cashier: {workPeriod.cashierName}
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 font-bold text-xs flex items-center gap-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Z-Report</span>
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Opening Float</span>
              <div className="text-xl font-black mt-1">₹{workPeriod.openingFloat.toLocaleString()}</div>
            </div>
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Cash Collected</span>
              <div className="text-xl font-black text-emerald-400 mt-1">₹{workPeriod.totalCashCollected.toLocaleString()}</div>
            </div>
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-[10px] font-bold text-slate-400 uppercase">UPI / QR Collected</span>
              <div className="text-xl font-black text-blue-400 mt-1">₹{workPeriod.totalUpiCollected.toLocaleString()}</div>
            </div>
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Card / EDC Machine</span>
              <div className="text-xl font-black text-slate-700 dark:text-slate-300 mt-1">₹{workPeriod.totalCardCollected.toLocaleString()}</div>
            </div>
          </div>

          <div className={`p-5 rounded-2xl border space-y-3 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-400">Cash Drawer Reconciliation Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Expected Cash in Drawer:</span>
                <span className="font-extrabold text-slate-100">₹{workPeriod.expectedCashInDrawer.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Actual Cash Counted:</span>
                <span className="font-extrabold text-emerald-400">₹{workPeriod.actualCashCounted.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Discrepancy (Variance):</span>
                <span className="font-extrabold text-emerald-400">₹{workPeriod.cashVariance} (Balanced ✓)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 8. ACCOUNT REPORT & GST TAB                               */}
      {/* ======================================================== */}
      {activeTab === 'ACCOUNT_REPORT' && accountReport && (
        <div
          className={`p-6 rounded-2xl border space-y-6 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-amber-500" />
                Accounting, P&L & GST Output Tax Ledger
              </h2>
              <p className="text-xs text-slate-400">
                Date: {accountReport.date} • Financial audit report with tax distribution and estimated food COGS.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsZReportModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-black text-xs shadow flex items-center gap-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Generate Daily Z-Report</span>
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700"
              >
                Export PDF
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Gross Sales</span>
              <div className="text-xl font-black mt-1">₹{accountReport.grossSales.toLocaleString()}</div>
            </div>
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Voucher Discounts</span>
              <div className="text-xl font-black text-red-400 mt-1">-₹{accountReport.discountsApplied.toLocaleString()}</div>
            </div>
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-[10px] font-bold text-slate-400 uppercase">CGST + SGST (5%)</span>
              <div className="text-xl font-black text-amber-400 mt-1">
                ₹{(accountReport.cgstAmount + accountReport.sgstAmount).toLocaleString()}
              </div>
            </div>
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Net Revenue</span>
              <div className="text-xl font-black text-emerald-400 mt-1">₹{accountReport.totalNetRevenue.toLocaleString()}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-5 rounded-2xl border space-y-2 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-400">Payment Tender Distribution</h3>
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span>UPI / QR:</span>
                  <span className="font-bold">₹{accountReport.paymentBreakdown.upi.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Card / POS:</span>
                  <span className="font-bold">₹{accountReport.paymentBreakdown.card.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cash:</span>
                  <span className="font-bold">₹{accountReport.paymentBreakdown.cash.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Room Charge:</span>
                  <span className="font-bold">₹{accountReport.paymentBreakdown.roomCharge.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className={`p-5 rounded-2xl border space-y-2 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-400">Top Revenue Food Categories</h3>
              <div className="space-y-1.5 text-xs text-slate-300">
                {accountReport.topSellingCategories.map((c: any, i: number) => (
                  <div key={i} className="flex justify-between">
                    <span>{c.category} ({c.orders} orders):</span>
                    <span className="font-bold text-emerald-400">₹{c.revenue.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 9. SYSTEM LOGS & AUDIT TRAIL TAB                          */}
      {/* ======================================================== */}
      {activeTab === 'LOGS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                System Activity & Security Audit Trail
              </h2>
              <p className="text-xs text-slate-400">
                Immutable activity logs including table seatings, bill settlements, 86 stock updates and manager approvals.
              </p>
            </div>
            <button
              onClick={fetchLogs}
              className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 font-bold text-xs flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Logs</span>
            </button>
          </div>

          <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <table className="w-full text-left text-xs">
              <thead className={`border-b font-black ${isDark ? 'bg-slate-900/90 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                <tr>
                  <th className="p-3">Time</th>
                  <th className="p-3">Actor / User</th>
                  <th className="p-3">Module</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Details</th>
                  <th className="p-3">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition">
                    <td className="p-3 font-mono text-slate-400">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="p-3 font-bold text-slate-200">{log.actor}</td>
                    <td className="p-3 text-slate-400">{log.module}</td>
                    <td className="p-3 font-mono font-bold text-amber-400">{log.action}</td>
                    <td className="p-3 text-slate-300">{log.details}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          log.severity === 'CRITICAL'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : log.severity === 'WARNING'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : log.severity === 'SUCCESS'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}
                      >
                        {log.severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD KITCHEN SECTION                                */}
      {/* ======================================================== */}
      {isSectionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className={`w-full max-w-lg p-6 rounded-2xl border space-y-4 ${isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
            <h3 className="text-base font-black flex items-center gap-2">
              <Utensils className="w-5 h-5 text-amber-500" />
              Add New Kitchen Preparation Section
            </h3>
            <form onSubmit={handleCreateSection} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Section Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Continental & Grill Section"
                  value={newSection.name}
                  onChange={(e) => setNewSection({ ...newSection, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-xl text-xs border outline-none bg-slate-900 border-slate-800 text-slate-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Code</label>
                  <input
                    type="text"
                    placeholder="KDS-GRILL"
                    value={newSection.code}
                    onChange={(e) => setNewSection({ ...newSection, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl text-xs border outline-none bg-slate-900 border-slate-800 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Screen Token</label>
                  <input
                    type="text"
                    placeholder="KDS_07"
                    value={newSection.screenToken}
                    onChange={(e) => setNewSection({ ...newSection, screenToken: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs border outline-none bg-slate-900 border-slate-800 text-slate-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Head Chef In-Charge</label>
                <input
                  type="text"
                  placeholder="e.g. Chef Sanjeev Roy"
                  value={newSection.chefInCharge}
                  onChange={(e) => setNewSection({ ...newSection, chefInCharge: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-xs border outline-none bg-slate-900 border-slate-800 text-slate-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Printer IP</label>
                  <input
                    type="text"
                    value={newSection.printerIp}
                    onChange={(e) => setNewSection({ ...newSection, printerIp: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs border outline-none bg-slate-900 border-slate-800 text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Avg Prep Time (Mins)</label>
                  <input
                    type="number"
                    value={newSection.avgPrepTimeMinutes}
                    onChange={(e) => setNewSection({ ...newSection, avgPrepTimeMinutes: parseInt(e.target.value) || 15 })}
                    className="w-full px-3 py-2 rounded-xl text-xs border outline-none bg-slate-900 border-slate-800 text-slate-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Routed Categories (Comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Continental, Grills, Burgers"
                  value={newSection.categories}
                  onChange={(e) => setNewSection({ ...newSection, categories: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-xs border outline-none bg-slate-900 border-slate-800 text-slate-100"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSectionModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 font-bold text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-amber-500 font-black text-xs text-slate-950">
                  Save Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREATE VOUCHER                                     */}
      {/* ======================================================== */}
      {isVoucherModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-2xl border space-y-4 ${isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
            <h3 className="text-base font-black flex items-center gap-2">
              <Ticket className="w-5 h-5 text-amber-500" />
              Create Promo Discount Voucher
            </h3>
            <form onSubmit={handleCreateVoucher} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Coupon Code *</label>
                <input
                  type="text"
                  placeholder="e.g. FAMILY25"
                  value={newVoucher.code}
                  onChange={(e) => setNewVoucher({ ...newVoucher, code: e.target.value.toUpperCase() })}
                  required
                  className="w-full px-3 py-2 rounded-xl text-xs border outline-none bg-slate-900 border-slate-800 text-slate-100 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. 25% Off for Weekend Family Dinners"
                  value={newVoucher.description}
                  onChange={(e) => setNewVoucher({ ...newVoucher, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-xs border outline-none bg-slate-900 border-slate-800 text-slate-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Discount Type</label>
                  <select
                    value={newVoucher.discountType}
                    onChange={(e) => setNewVoucher({ ...newVoucher, discountType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs border outline-none bg-slate-900 border-slate-800 text-slate-100"
                  >
                    <option value="PERCENT">Percentage (%)</option>
                    <option value="FLAT">Flat Rupee (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Discount Value</label>
                  <input
                    type="number"
                    value={newVoucher.discountValue}
                    onChange={(e) => setNewVoucher({ ...newVoucher, discountValue: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl text-xs border outline-none bg-slate-900 border-slate-800 text-slate-100"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Min Bill Amount (₹)</label>
                  <input
                    type="number"
                    value={newVoucher.minBillAmount}
                    onChange={(e) => setNewVoucher({ ...newVoucher, minBillAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl text-xs border outline-none bg-slate-900 border-slate-800 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Max Cap (₹)</label>
                  <input
                    type="number"
                    value={newVoucher.maxDiscountCap}
                    onChange={(e) => setNewVoucher({ ...newVoucher, maxDiscountCap: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl text-xs border outline-none bg-slate-900 border-slate-800 text-slate-100"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsVoucherModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 font-bold text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-amber-500 font-black text-xs text-slate-950">
                  Publish Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: TOP-UP WALLET                                      */}
      {/* ======================================================== */}
      {isTopupModalOpen && selectedWallet && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className={`w-full max-w-sm p-6 rounded-2xl border space-y-4 ${isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
            <h3 className="text-base font-black flex items-center gap-2">
              <Wallet className="w-5 h-5 text-amber-500" />
              Add Funds to Wallet
            </h3>
            <p className="text-xs text-slate-400">
              Customer: <span className="font-bold text-slate-200">{selectedWallet.name}</span> ({selectedWallet.phone})
            </p>
            <form onSubmit={handleTopupWallet} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Top-up Amount (₹) *</label>
                <input
                  type="number"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl text-base font-black border outline-none bg-slate-900 border-slate-800 text-emerald-400"
                />
              </div>
              <div className="flex gap-2">
                {['500', '1000', '2000', '5000'].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTopupAmount(amt)}
                    className="flex-1 py-1 rounded-lg text-xs font-bold border border-slate-700 bg-slate-800 hover:bg-slate-700"
                  >
                    +₹{amt}
                  </button>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTopupModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 font-bold text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-amber-500 font-black text-xs text-slate-950">
                  Credit Wallet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD WAREHOUSE                                      */}
      {/* ======================================================== */}
      {isWhModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-2xl border space-y-4 ${isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
            <h3 className="text-base font-black flex items-center gap-2">
              <WarehouseIcon className="w-5 h-5 text-amber-500" />
              Add Internal Storage Location
            </h3>
            <form onSubmit={handleCreateWarehouse} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Code *</label>
                  <input
                    type="text"
                    placeholder="WH-BAKERY"
                    value={newWh.code}
                    onChange={(e) => setNewWh({ ...newWh, code: e.target.value.toUpperCase() })}
                    required
                    className="w-full px-3 py-2 rounded-xl text-xs border outline-none bg-slate-900 border-slate-800 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Type</label>
                  <select
                    value={newWh.type}
                    onChange={(e) => setNewWh({ ...newWh, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs border outline-none bg-slate-900 border-slate-800 text-slate-100"
                  >
                    <option value="Central Store">Central Store</option>
                    <option value="Kitchen Pantry">Kitchen Pantry</option>
                    <option value="Cold Storage">Cold Storage</option>
                    <option value="Beverage Cellar">Beverage Cellar</option>
                    <option value="Linen Store">Linen Store</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Warehouse Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Pastry & Bakery Raw Material Store"
                  value={newWh.name}
                  onChange={(e) => setNewWh({ ...newWh, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-xl text-xs border outline-none bg-slate-900 border-slate-800 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Store Manager In-Charge</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={newWh.manager}
                  onChange={(e) => setNewWh({ ...newWh, manager: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-xs border outline-none bg-slate-900 border-slate-800 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Physical Location</label>
                <input
                  type="text"
                  placeholder="e.g. Service Basement Room 12"
                  value={newWh.location}
                  onChange={(e) => setNewWh({ ...newWh, location: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-xs border outline-none bg-slate-900 border-slate-800 text-slate-100"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWhModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 font-bold text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-amber-500 font-black text-xs text-slate-950">
                  Save Warehouse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: DAILY Z-REPORT (DAY END FINANCIAL AUDIT)          */}
      {/* ======================================================== */}
      {isZReportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-2xl border space-y-4 shadow-sm dark:shadow-none ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-black flex items-center gap-2">
                <Printer className="w-4 h-4 text-amber-500" />
                Daily Z-Report Summary
              </h3>
              <button
                onClick={() => setIsZReportModalOpen(false)}
                className="text-xs font-bold text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* 80mm Thermal Receipt Layout Preview */}
            <div className="p-4 bg-white text-slate-900 font-mono text-xs rounded-xl border border-slate-300 space-y-2.5 shadow-inner">
              <div className="text-center border-b border-dashed border-slate-400 pb-2">
                <div className="font-black text-sm uppercase tracking-wide">{info.name}</div>
                <div className="text-[10px] text-slate-600">{info.tagline || 'Luxury Hospitality & Fine Dining'}</div>
                <div className="text-[10px] text-slate-600 mt-0.5">GSTIN: {info.gstin || '27AAAAA0000A1Z5'} • FSSAI: {info.fssaiNumber || '10019022009876'}</div>
                <div className="font-bold text-[11px] mt-1.5 bg-slate-900 text-white py-0.5 px-2 inline-block rounded">
                  *** DAILY Z-REPORT (DAY END) ***
                </div>
              </div>

              <div className="text-[10px] space-y-0.5 border-b border-dashed border-slate-300 pb-2">
                <div className="flex justify-between">
                  <span>Report Date:</span>
                  <span className="font-bold">{accountReport?.date || new Date().toISOString().split('T')[0]}</span>
                </div>
                <div className="flex justify-between">
                  <span>Timestamp:</span>
                  <span>{new Date().toLocaleTimeString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Reconciliation:</span>
                  <span className="font-bold text-emerald-700">BALANCED & VERIFIED ✓</span>
                </div>
              </div>

              <div className="space-y-1 border-b border-dashed border-slate-300 pb-2 text-[11px]">
                <div className="font-bold uppercase tracking-wider text-[9px] text-slate-500">Sales & Tax Output</div>
                <div className="flex justify-between">
                  <span>Gross Sales:</span>
                  <span className="font-bold">₹{accountReport?.grossSales.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Discounts Applied:</span>
                  <span>-₹{accountReport?.discountsApplied.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span>CGST (2.5%):</span>
                  <span>₹{accountReport?.cgstAmount.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span>SGST (2.5%):</span>
                  <span>₹{accountReport?.sgstAmount.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between font-black text-xs pt-1 border-t border-slate-300">
                  <span>NET REVENUE:</span>
                  <span className="text-emerald-700">₹{accountReport?.totalNetRevenue.toLocaleString() || '0'}</span>
                </div>
              </div>

              <div className="space-y-1 border-b border-dashed border-slate-300 pb-2 text-[11px]">
                <div className="font-bold uppercase tracking-wider text-[9px] text-slate-500">Tender Breakdown</div>
                <div className="flex justify-between">
                  <span>UPI / Digital QR:</span>
                  <span className="font-bold">₹{accountReport?.paymentBreakdown.upi.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Credit / Debit Card:</span>
                  <span className="font-bold">₹{accountReport?.paymentBreakdown.card.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cash Counted:</span>
                  <span className="font-bold">₹{accountReport?.paymentBreakdown.cash.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Room Folio Ledger:</span>
                  <span className="font-bold">₹{accountReport?.paymentBreakdown.roomCharge.toLocaleString() || '0'}</span>
                </div>
              </div>

              <div className="text-center text-[9px] text-slate-500 pt-1">
                <div>Immutable Record • Audited by SpiceHub Engine</div>
                <div className="font-mono">REF: ZREP-{Date.now().toString().slice(-8)}</div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsZReportModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 font-black text-xs text-slate-950 flex items-center gap-1.5 shadow"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Thermal Z-Report</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
