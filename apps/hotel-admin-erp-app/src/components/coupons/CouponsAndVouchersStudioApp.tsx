import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Ticket,
  Plus,
  Trash2,
  Copy,
  Check,
  Search,
  Filter,
  Percent,
  Calendar,
  Sparkles,
  Tag,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  Clock,
  ShieldCheck,
  Flame,
  ArrowRight,
  ExternalLink,
  Edit2,
  UtensilsCrossed,
  CheckSquare,
  Square,
  Repeat,
  Sun,
  Play,
  Layers,
  HelpCircle,
  Info,
} from 'lucide-react';
import { API_BASE_URL, getStoredHotelId, getStoredToken } from '../../config/api';

export interface VoucherItem {
  id: string;
  code: string;
  description: string;
  discountType: 'PERCENT' | 'FLAT';
  discountValue: number;
  minBillAmount: number;
  maxDiscountCap: number;
  usageLimit: number;
  timesUsed: number;
  validUntil: string;
  isActive?: boolean;
  // Product Scope
  scope?: 'ALL_ITEMS' | 'SPECIFIC_ITEMS';
  applicableItemIds?: string[];
  applicableItemNames?: string[];
  // Weekly Recurring Schedule
  isScheduled?: boolean;
  scheduledDays?: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  dayNames?: string[];
  startTime?: string; // e.g. "08:00"
  endTime?: string; // e.g. "14:00"
  isRecurringWeekly?: boolean;
}

export interface MenuItemSimple {
  id: string;
  name: string;
  category: string;
  price: number;
}

interface CouponsAndVouchersStudioAppProps {
  isDark?: boolean;
  hotelId?: string;
}

const DAY_OPTIONS = [
  { dayIndex: 0, short: 'Sun', label: 'Sunday' },
  { dayIndex: 1, short: 'Mon', label: 'Monday' },
  { dayIndex: 2, short: 'Tue', label: 'Tuesday' },
  { dayIndex: 3, short: 'Wed', label: 'Wednesday' },
  { dayIndex: 4, short: 'Thu', label: 'Thursday' },
  { dayIndex: 5, short: 'Fri', label: 'Friday' },
  { dayIndex: 6, short: 'Sat', label: 'Saturday' },
];

export const CouponsAndVouchersStudioApp: React.FC<CouponsAndVouchersStudioAppProps> = ({
  isDark: _isDark = false,
  hotelId = getStoredHotelId(),
}) => {
  const [vouchers, setVouchers] = useState<VoucherItem[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemSimple[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<
    'ALL' | 'ACTIVE_NOW' | 'ALL_PRODUCTS' | 'SPECIFIC_ITEMS' | 'SCHEDULED'
  >('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discountType: 'PERCENT' as 'PERCENT' | 'FLAT',
    discountValue: 20,
    minBillAmount: 500,
    maxDiscountCap: 250,
    usageLimit: 100,
    validUntil: '2026-12-31',
    // Scope
    scope: 'ALL_ITEMS' as 'ALL_ITEMS' | 'SPECIFIC_ITEMS',
    applicableItemIds: [] as string[],
    applicableItemNames: [] as string[],
    // Weekly Schedule
    isScheduled: false,
    scheduledDays: [0] as number[], // Default Sunday
    startTime: '08:00',
    endTime: '14:00',
    isRecurringWeekly: true,
  });

  // Product Picker state inside Modal
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');

  // Interactive Live Simulator State
  const [simCode, setSimCode] = useState('');
  const [simDay, setSimDay] = useState(new Date().getDay());
  const [simTime, setSimTime] = useState('10:00');
  const [simCartTotal, setSimCartTotal] = useState(800);
  const [simSelectedItems, setSimSelectedItems] = useState<string[]>([]);
  const [simResult, setSimResult] = useState<any>(null);
  const [simulating, setSimulating] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const fetchVouchers = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getStoredToken();
      const res = await axios.get(`${API_BASE_URL}/restaurant-operations/vouchers`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.data?.success && Array.isArray(res.data.data)) {
        setVouchers(res.data.data);
      } else {
        setVouchers([]);
      }
    } catch (err: any) {
      console.error('[Coupons] Failed to load vouchers:', err);
      setError('Failed to fetch coupons. Using current property cache.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuItems = async () => {
    setLoadingMenu(true);
    try {
      const token = getStoredToken();
      const res = await axios.get(`${API_BASE_URL}/menu-catalog/items`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.data?.success && Array.isArray(res.data.data)) {
        setMenuItems(
          res.data.data.map((i: any) => ({
            id: String(i.id || i._id),
            name: i.name,
            category: i.category || 'General',
            price: Number(i.price || i.basePrice || 0),
          }))
        );
      }
    } catch (err) {
      console.error('[Coupons] Failed to load menu catalog:', err);
    } finally {
      setLoadingMenu(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
    fetchMenuItems();
  }, [hotelId]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast(`Coupon code ${code} copied to clipboard!`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setModalMode('CREATE');
    setEditingId(null);
    setFormData({
      code: '',
      description: '',
      discountType: 'PERCENT',
      discountValue: 20,
      minBillAmount: 400,
      maxDiscountCap: 200,
      usageLimit: 200,
      validUntil: '2026-12-31',
      scope: 'ALL_ITEMS',
      applicableItemIds: [],
      applicableItemNames: [],
      isScheduled: false,
      scheduledDays: [0], // Sunday
      startTime: '08:00',
      endTime: '14:00',
      isRecurringWeekly: true,
    });
    setProductSearch('');
    setSelectedCategoryFilter('ALL');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (vc: VoucherItem) => {
    setModalMode('EDIT');
    setEditingId(vc.id);
    setFormData({
      code: vc.code,
      description: vc.description,
      discountType: vc.discountType,
      discountValue: vc.discountValue,
      minBillAmount: vc.minBillAmount || 0,
      maxDiscountCap: vc.maxDiscountCap || 0,
      usageLimit: vc.usageLimit || 100,
      validUntil: vc.validUntil || '2026-12-31',
      scope: vc.scope || 'ALL_ITEMS',
      applicableItemIds: vc.applicableItemIds || [],
      applicableItemNames: vc.applicableItemNames || [],
      isScheduled: Boolean(vc.isScheduled),
      scheduledDays: vc.scheduledDays || [0],
      startTime: vc.startTime || '08:00',
      endTime: vc.endTime || '14:00',
      isRecurringWeekly: vc.isRecurringWeekly !== false,
    });
    setProductSearch('');
    setSelectedCategoryFilter('ALL');
    setIsModalOpen(true);
  };

  const handleToggleProduct = (item: MenuItemSimple) => {
    const isSelected = formData.applicableItemIds.includes(item.id);
    if (isSelected) {
      setFormData({
        ...formData,
        applicableItemIds: formData.applicableItemIds.filter((id) => id !== item.id),
        applicableItemNames: formData.applicableItemNames.filter((name) => name !== item.name),
      });
    } else {
      setFormData({
        ...formData,
        applicableItemIds: [...formData.applicableItemIds, item.id],
        applicableItemNames: [...formData.applicableItemNames, item.name],
      });
    }
  };

  const handleSelectAllFilteredProducts = (itemsToSelect: MenuItemSimple[]) => {
    const newIds = new Set(formData.applicableItemIds);
    const newNames = new Set(formData.applicableItemNames);
    itemsToSelect.forEach((i) => {
      newIds.add(i.id);
      newNames.add(i.name);
    });
    setFormData({
      ...formData,
      applicableItemIds: Array.from(newIds),
      applicableItemNames: Array.from(newNames),
    });
  };

  const handleClearSelectedProducts = () => {
    setFormData({
      ...formData,
      applicableItemIds: [],
      applicableItemNames: [],
    });
  };

  const handleToggleScheduledDay = (dayIndex: number) => {
    const exists = formData.scheduledDays.includes(dayIndex);
    let nextDays: number[];
    if (exists) {
      nextDays = formData.scheduledDays.filter((d) => d !== dayIndex);
    } else {
      nextDays = [...formData.scheduledDays, dayIndex].sort();
    }
    setFormData({
      ...formData,
      scheduledDays: nextDays,
    });
  };

  const handleSetDayPreset = (preset: 'SUNDAY' | 'WEEKEND' | 'WEEKDAYS' | 'ALL_DAYS') => {
    if (preset === 'SUNDAY') setFormData({ ...formData, scheduledDays: [0] });
    if (preset === 'WEEKEND') setFormData({ ...formData, scheduledDays: [0, 6] });
    if (preset === 'WEEKDAYS') setFormData({ ...formData, scheduledDays: [1, 2, 3, 4, 5] });
    if (preset === 'ALL_DAYS') setFormData({ ...formData, scheduledDays: [0, 1, 2, 3, 4, 5, 6] });
  };

  // Submit Handler
  const handleSubmitVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      showToast('Please enter a voucher coupon code');
      return;
    }
    if (formData.scope === 'SPECIFIC_ITEMS' && formData.applicableItemIds.length === 0) {
      showToast('Please select at least 1 menu item for particular products scope');
      return;
    }
    if (formData.isScheduled && formData.scheduledDays.length === 0) {
      showToast('Please select at least one day for weekly schedule');
      return;
    }

    setSubmitting(true);
    try {
      const token = getStoredToken();
      const payload = {
        ...formData,
        code: formData.code.toUpperCase().trim(),
        dayNames: formData.scheduledDays.map((d) => DAY_OPTIONS.find((opt) => opt.dayIndex === d)?.short || 'Sun'),
      };

      if (modalMode === 'CREATE') {
        const res = await axios.post(`${API_BASE_URL}/restaurant-operations/vouchers`, payload, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.data?.success && res.data.data) {
          setVouchers((prev) => [res.data.data, ...prev]);
          setIsModalOpen(false);
          showToast(`Promo coupon "${payload.code}" created successfully!`);
        }
      } else if (modalMode === 'EDIT' && editingId) {
        const res = await axios.put(`${API_BASE_URL}/restaurant-operations/vouchers/${editingId}`, payload, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.data?.success && res.data.data) {
          setVouchers((prev) => prev.map((v) => (v.id === editingId ? res.data.data : v)));
          setIsModalOpen(false);
          showToast(`Coupon "${payload.code}" updated successfully!`);
        }
      }
    } catch (err: any) {
      console.error('[Coupons] Error saving voucher:', err);
      showToast(err?.response?.data?.message || 'Failed to save voucher coupon.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVoucher = async (id: string, code: string) => {
    if (!window.confirm(`Are you sure you want to delete and deactivate coupon "${code}"?`)) return;
    try {
      const token = getStoredToken();
      await axios.delete(`${API_BASE_URL}/restaurant-operations/vouchers/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setVouchers((prev) => prev.filter((v) => v.id !== id));
      showToast(`Coupon "${code}" removed.`);
    } catch (err: any) {
      console.error('[Coupons] Error deleting voucher:', err);
      showToast('Failed to delete coupon.');
    }
  };

  // Live Simulator Test Action
  const handleRunSimulation = async () => {
    if (!simCode.trim()) {
      showToast('Please select or enter a coupon code to simulate.');
      return;
    }
    setSimulating(true);
    setSimResult(null);
    try {
      const token = getStoredToken();
      const selectedDishObjs = menuItems.filter((i) => simSelectedItems.includes(i.id));
      const res = await axios.post(
        `${API_BASE_URL}/restaurant-operations/vouchers/validate`,
        {
          code: simCode.toUpperCase().trim(),
          cartTotal: simCartTotal,
          checkDay: simDay,
          simulatedTime: simTime,
          items: selectedDishObjs.map((d) => ({
            id: d.id,
            name: d.name,
            price: d.price,
            quantity: 1,
          })),
        },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      setSimResult({
        success: true,
        data: res.data.data,
        message: res.data.message,
      });
    } catch (err: any) {
      setSimResult({
        success: false,
        message: err?.response?.data?.message || 'Coupon validation failed.',
        errorCode: err?.response?.data?.errorCode,
      });
    } finally {
      setSimulating(false);
    }
  };

  // Helper: check if a voucher is active right now
  const isVoucherActiveNow = (vc: VoucherItem) => {
    if (vc.isActive === false) return false;
    if (!vc.isScheduled) return true;
    const now = new Date();
    const currentDay = now.getDay();
    if (vc.scheduledDays && !vc.scheduledDays.includes(currentDay)) return false;
    if (vc.startTime && vc.endTime) {
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (currentTime < vc.startTime || currentTime > vc.endTime) return false;
    }
    return true;
  };

  // Filtered Menu Items in Modal
  const categoriesList = useMemo(() => {
    const cats = new Set(menuItems.map((m) => m.category));
    return ['ALL', ...Array.from(cats)];
  }, [menuItems]);

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((m) => {
      if (selectedCategoryFilter !== 'ALL' && m.category !== selectedCategoryFilter) return false;
      if (productSearch.trim()) {
        const q = productSearch.toLowerCase();
        return m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q);
      }
      return true;
    });
  }, [menuItems, selectedCategoryFilter, productSearch]);

  // KPIs
  const totalCampaigns = vouchers.length;
  const specificProductDeals = vouchers.filter((v) => v.scope === 'SPECIFIC_ITEMS').length;
  const scheduledDeals = vouchers.filter((v) => v.isScheduled).length;
  const totalRedemptions = vouchers.reduce((acc, v) => acc + (v.timesUsed || 0), 0);

  // Filtered Vouchers for Grid
  const filteredVouchers = vouchers.filter((v) => {
    if (filterType === 'ACTIVE_NOW' && !isVoucherActiveNow(v)) return false;
    if (filterType === 'ALL_PRODUCTS' && v.scope === 'SPECIFIC_ITEMS') return false;
    if (filterType === 'SPECIFIC_ITEMS' && v.scope !== 'SPECIFIC_ITEMS') return false;
    if (filterType === 'SCHEDULED' && !v.isScheduled) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        v.code.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q) ||
        v.applicableItemNames?.some((name) => name.toLowerCase().includes(q)) ||
        v.dayNames?.some((d) => d.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 text-slate-900">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-xl shadow-xl font-bold text-xs animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <Ticket className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                Coupons & Vouchers Studio
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                All Products & Happy Hours Engine
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Configure all-menu discounts or dish-specific promotions with automated weekly day/time scheduling (e.g. Sunday 8:00 AM - 2:00 PM).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchVouchers}
            disabled={loading}
            className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition shadow-xs"
            title="Refresh coupons"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Promo Coupon</span>
          </button>
        </div>
      </div>

      {/* Executive KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Promo Campaigns</span>
            <Tag className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{totalCampaigns}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">
            Active in POS & Dining billing
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Product-Specific Deals</span>
            <UtensilsCrossed className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-700 mt-2">{specificProductDeals}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            Targeted individual menu dishes
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Weekly Recurring Schedules</span>
            <Repeat className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600 mt-2">{scheduledDeals}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            Automated Day & Time windows
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Redemptions</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{totalRedemptions}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            Times guests saved with code
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by code, dish name, day..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {(
            [
              { key: 'ALL', label: 'All Coupons' },
              { key: 'ACTIVE_NOW', label: 'Active Right Now' },
              { key: 'ALL_PRODUCTS', label: 'All Products (Whole Menu)' },
              { key: 'SPECIFIC_ITEMS', label: 'Specific Dishes' },
              { key: 'SCHEDULED', label: 'Weekly Scheduled' },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilterType(item.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                filterType === item.key
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Vouchers Grid */}
      {loading ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl">
          <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Loading coupons and discount schedules...</p>
        </div>
      ) : filteredVouchers.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Ticket className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-sm text-slate-800">No promo coupons match your criteria</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? `No coupons match "${searchQuery}". Clear your search.`
              : 'Create a new discount coupon with all-menu or dish-specific targeting and weekly time schedules.'}
          </p>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            + Create First Coupon
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVouchers.map((vc) => {
            const usagePct =
              vc.usageLimit > 0
                ? Math.min(100, Math.round(((vc.timesUsed || 0) / vc.usageLimit) * 100))
                : 0;
            const activeNow = isVoucherActiveNow(vc);

            return (
              <div
                key={vc.id}
                className={`bg-white border rounded-2xl shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between relative group ${
                  activeNow ? 'border-blue-300 ring-1 ring-blue-500/20' : 'border-slate-200'
                }`}
              >
                {/* Top Notch Header */}
                <div className="p-5 pb-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/60 to-white">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-xl font-mono font-black text-sm tracking-widest bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1.5 shadow-xs">
                        <Tag className="w-3.5 h-3.5 text-blue-600" />
                        {vc.code}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(vc.code)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                        title="Copy coupon code"
                      >
                        {copiedCode === vc.code ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {vc.discountType === 'PERCENT'
                          ? `${vc.discountValue}% OFF`
                          : `₹${vc.discountValue} FLAT`}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(vc)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Edit voucher settings"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteVoucher(vc.id, vc.code)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete voucher"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 mt-3 line-clamp-1">
                    {vc.description || `${vc.code} Promotional Discount`}
                  </h3>

                  {/* Active Now vs Scheduled Tag */}
                  <div className="mt-2 flex items-center gap-2">
                    {activeNow ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        Active Right Now
                      </span>
                    ) : vc.isScheduled ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                        <Clock className="w-3 h-3 text-amber-600" />
                        Scheduled: {vc.dayNames?.join(', ')} ({vc.startTime} - {vc.endTime})
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-medium">Continuous 24/7</span>
                    )}
                  </div>
                </div>

                {/* Details Body */}
                <div className="p-5 py-4 space-y-3 text-xs">
                  {/* Scope: All products vs Specific items */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Product Scope:</span>
                      {vc.scope === 'SPECIFIC_ITEMS' ? (
                        <span className="font-bold text-purple-700 flex items-center gap-1">
                          <UtensilsCrossed className="w-3.5 h-3.5 text-purple-600" />
                          Particular Dishes ({vc.applicableItemNames?.length || 0})
                        </span>
                      ) : (
                        <span className="font-bold text-blue-700 flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-blue-600" />
                          All Menu Products
                        </span>
                      )}
                    </div>
                    {vc.scope === 'SPECIFIC_ITEMS' &&
                      vc.applicableItemNames &&
                      vc.applicableItemNames.length > 0 && (
                        <p className="text-[11px] text-slate-600 line-clamp-1 italic">
                          {vc.applicableItemNames.join(', ')}
                        </p>
                      )}
                  </div>

                  {/* Schedule: Weekly Recurring vs Continuous */}
                  {vc.isScheduled && (
                    <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-1 text-amber-900">
                      <div className="flex items-center justify-between font-bold text-[11px]">
                        <span className="flex items-center gap-1">
                          <Repeat className="w-3.5 h-3.5 text-amber-700" />
                          Recurring Weekly Automation:
                        </span>
                        <span>{vc.isRecurringWeekly ? 'Every Week' : 'One-time'}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span>Days Active:</span>
                        <span className="font-semibold">{vc.dayNames?.join(', ')}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span>Time Window:</span>
                        <span className="font-mono font-bold">
                          {vc.startTime} - {vc.endTime}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Pricing Thresholds */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400 font-medium">Minimum Spend:</span>
                      <span className="font-semibold text-slate-800">₹{vc.minBillAmount || 0}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400 font-medium">Max Discount Cap:</span>
                      <span className="font-semibold text-slate-800">
                        {vc.maxDiscountCap ? `₹${vc.maxDiscountCap}` : 'No Limit'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400 font-medium">Valid Until:</span>
                      <span className="font-medium text-slate-700 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {vc.validUntil || 'Ongoing'}
                      </span>
                    </div>
                  </div>

                  {/* Redemptions Progress Bar */}
                  <div className="pt-1">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-slate-500">Usage Limit</span>
                      <span className="font-semibold text-slate-700">
                        {vc.timesUsed || 0} / {vc.usageLimit} ({usagePct}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all"
                        style={{ width: `${usagePct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Ticket Footer Action */}
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setSimCode(vc.code);
                      if (vc.scheduledDays && vc.scheduledDays.length > 0) {
                        setSimDay(vc.scheduledDays[0]);
                      }
                      if (vc.startTime) {
                        setSimTime(vc.startTime);
                      }
                      if (vc.applicableItemIds && vc.applicableItemIds.length > 0) {
                        setSimSelectedItems(vc.applicableItemIds);
                      }
                      showToast(`Loaded ${vc.code} into simulator below`);
                    }}
                    className="text-slate-600 hover:text-blue-600 flex items-center gap-1 font-semibold transition"
                  >
                    <Play className="w-3 h-3 text-blue-600" />
                    Test In Simulator
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyCode(vc.code)}
                    className="font-bold text-blue-600 hover:text-blue-700 transition"
                  >
                    {copiedCode === vc.code ? 'Copied!' : 'Copy Code'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* INTERACTIVE COUPON SIMULATOR & TESTER                    */}
      {/* ======================================================== */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Play className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Interactive Coupon Simulator & Validation Calculator
              </h3>
              <p className="text-xs text-slate-500">
                Test how your Sunday 8am-2pm or item-specific discount rules evaluate in real-time.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
            Real-Time Backend Tester
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Coupon Code to Test</label>
            <input
              type="text"
              value={simCode}
              onChange={(e) => setSimCode(e.target.value.toUpperCase())}
              placeholder="e.g. SUNBRUNCH30, PANEER50"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold uppercase focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Test Day of Week</label>
            <select
              value={simDay}
              onChange={(e) => setSimDay(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {DAY_OPTIONS.map((d) => (
                <option key={d.dayIndex} value={d.dayIndex}>
                  {d.label} (day {d.dayIndex})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Test Time of Day</label>
            <input
              type="time"
              value={simTime}
              onChange={(e) => setSimTime(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Simulated Order Total (₹)</label>
            <input
              type="number"
              value={simCartTotal}
              onChange={(e) => setSimCartTotal(Number(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Simulator Dish Selector */}
        <div className="pt-2">
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Dishes In Simulated Cart ({simSelectedItems.length} selected):
          </label>
          <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl">
            {menuItems.map((item) => {
              const selected = simSelectedItems.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (selected) {
                      setSimSelectedItems(simSelectedItems.filter((id) => id !== item.id));
                    } else {
                      setSimSelectedItems([...simSelectedItems, item.id]);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    selected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{item.name}</span>
                  <span className={selected ? 'text-blue-100 text-[10px]' : 'text-slate-400 text-[10px]'}>
                    ₹{item.price}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleRunSimulation}
            disabled={simulating}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{simulating ? 'Evaluating...' : 'Simulate Discount Calculation'}</span>
          </button>
        </div>

        {/* Simulation Result Callout */}
        {simResult && (
          <div
            className={`p-4 rounded-xl border text-xs animate-in fade-in ${
              simResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {simResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1.5">
                <span className="font-bold text-sm block">
                  {simResult.success ? 'Coupon Applied Successfully!' : 'Coupon Cannot Be Applied'}
                </span>
                <p className="text-xs leading-relaxed">{simResult.message}</p>
                {simResult.success && simResult.data && (
                  <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-white/80 border border-emerald-200">
                      <span className="text-slate-500 block text-[10px]">Discount Value</span>
                      <strong className="text-emerald-700 font-black">
                        -₹{simResult.data.discountAmount}
                      </strong>
                    </div>
                    <div className="p-2 rounded-lg bg-white/80 border border-emerald-200">
                      <span className="text-slate-500 block text-[10px]">Net Payable</span>
                      <strong className="text-slate-900 font-black">
                        ₹{simResult.data.finalPayable}
                      </strong>
                    </div>
                    <div className="p-2 rounded-lg bg-white/80 border border-emerald-200">
                      <span className="text-slate-500 block text-[10px]">Scope</span>
                      <strong className="text-blue-700 font-semibold">{simResult.data.scope}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-white/80 border border-emerald-200">
                      <span className="text-slate-500 block text-[10px]">Schedule Check</span>
                      <strong className="text-amber-800 font-semibold">
                        {simResult.data.scheduleDisplay}
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL: CREATE / EDIT VOUCHER COUPON                      */}
      {/* ======================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 my-8">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {modalMode === 'CREATE' ? 'Create Promotional Coupon' : 'Edit Promotional Coupon'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Set product targeting (all or specific dishes) and weekly recurring schedules.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitVoucher} className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Coupon Promo Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        code: e.target.value.toUpperCase().replace(/\s+/g, ''),
                      })
                    }
                    placeholder="e.g. SUNBRUNCH30, PANEER50"
                    className="w-full px-3 py-2 text-sm font-mono font-bold uppercase rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Campaign Description
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g. Sunday Brunch 30% Off on all menu items"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Discount Rules */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Discount Type</label>
                  <select
                    value={formData.discountType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discountType: e.target.value as 'PERCENT' | 'FLAT',
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="PERCENT">Percentage (% OFF)</option>
                    <option value="FLAT">Flat Cash (₹ FLAT)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {formData.discountType === 'PERCENT' ? 'Discount Rate (%) *' : 'Flat Discount (₹) *'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={formData.discountType === 'PERCENT' ? 100 : 50000}
                    required
                    value={formData.discountValue}
                    onChange={(e) =>
                      setFormData({ ...formData, discountValue: Number(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Min. Order Spend (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minBillAmount}
                    onChange={(e) =>
                      setFormData({ ...formData, minBillAmount: Number(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Max Discount Cap (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.maxDiscountCap}
                    onChange={(e) =>
                      setFormData({ ...formData, maxDiscountCap: Number(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* SECTION 1: PRODUCT APPLICABILITY (ALL VS SPECIFIC PRODUCTS) */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                      <UtensilsCrossed className="w-4 h-4 text-blue-600" />
                      Product Applicability Scope
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Apply to entire menu or restrict to specific selected dishes
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <label
                    className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition ${
                      formData.scope === 'ALL_ITEMS'
                        ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20'
                        : 'bg-white border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="scope"
                      checked={formData.scope === 'ALL_ITEMS'}
                      onChange={() => setFormData({ ...formData, scope: 'ALL_ITEMS' })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">
                        🌐 All Menu Products
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Applies to every dish and beverage across the whole restaurant menu
                      </span>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition ${
                      formData.scope === 'SPECIFIC_ITEMS'
                        ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-500/20'
                        : 'bg-white border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="scope"
                      checked={formData.scope === 'SPECIFIC_ITEMS'}
                      onChange={() => setFormData({ ...formData, scope: 'SPECIFIC_ITEMS' })}
                      className="w-4 h-4 text-purple-600"
                    />
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">
                        🎯 Particular / Specific Dishes Only
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Discount applies only when customer orders chosen individual items
                      </span>
                    </div>
                  </label>
                </div>

                {/* Specific Dishes Picker when scope is SPECIFIC_ITEMS */}
                {formData.scope === 'SPECIFIC_ITEMS' && (
                  <div className="pt-2 border-t border-slate-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-purple-900">
                          Selected: {formData.applicableItemIds.length} Dishes
                        </span>
                        {formData.applicableItemIds.length > 0 && (
                          <button
                            type="button"
                            onClick={handleClearSelectedProducts}
                            className="text-[11px] text-red-600 hover:underline font-semibold"
                          >
                            Clear Selection
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectAllFilteredProducts(filteredMenuItems)}
                          className="text-[11px] text-blue-600 hover:underline font-semibold"
                        >
                          Select All Displayed ({filteredMenuItems.length})
                        </button>
                      </div>
                    </div>

                    {/* Search & Category Filter */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          placeholder="Search dish name (e.g. Paneer, Naan)..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                        />
                      </div>
                      <select
                        value={selectedCategoryFilter}
                        onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                        className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                      >
                        {categoriesList.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat === 'ALL' ? 'All Categories' : cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Menu Items Checkbox Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-white rounded-xl border border-slate-200">
                      {filteredMenuItems.map((item) => {
                        const checked = formData.applicableItemIds.includes(item.id);
                        return (
                          <div
                            key={item.id}
                            onClick={() => handleToggleProduct(item)}
                            className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer text-xs transition ${
                              checked
                                ? 'bg-purple-50/70 border-purple-300 text-purple-950 font-bold'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {checked ? (
                                <CheckSquare className="w-4 h-4 text-purple-600 shrink-0" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400 shrink-0" />
                              )}
                              <div>
                                <span className="block leading-tight">{item.name}</span>
                                <span className="text-[10px] text-slate-400 font-normal">
                                  {item.category}
                                </span>
                              </div>
                            </div>
                            <span className="font-mono text-[11px] text-slate-700 shrink-0">
                              ₹{item.price}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 2: WEEKLY RECURRING SCHEDULE & TIME WINDOW (HAPPY HOURS) */}
              <div className="p-4 rounded-xl border border-slate-200 bg-amber-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <div>
                      <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wide">
                        Weekly Day & Time Window Automation
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Restrict coupon to specific days and hours (e.g. Sunday 08:00 AM - 02:00 PM)
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isScheduled}
                      onChange={(e) => setFormData({ ...formData, isScheduled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>

                {formData.isScheduled && (
                  <div className="pt-2 border-t border-amber-200/80 space-y-3">
                    {/* Day Selection */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-700">
                          Active Days of the Week:
                        </label>
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <button
                            type="button"
                            onClick={() => handleSetDayPreset('SUNDAY')}
                            className="text-amber-800 font-bold hover:underline"
                          >
                            Sundays Only
                          </button>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() => handleSetDayPreset('WEEKEND')}
                            className="text-amber-800 font-bold hover:underline"
                          >
                            Weekends
                          </button>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() => handleSetDayPreset('WEEKDAYS')}
                            className="text-amber-800 font-bold hover:underline"
                          >
                            Weekdays
                          </button>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() => handleSetDayPreset('ALL_DAYS')}
                            className="text-amber-800 font-bold hover:underline"
                          >
                            All 7 Days
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-7 gap-1.5">
                        {DAY_OPTIONS.map((opt) => {
                          const active = formData.scheduledDays.includes(opt.dayIndex);
                          return (
                            <button
                              key={opt.dayIndex}
                              type="button"
                              onClick={() => handleToggleScheduledDay(opt.dayIndex)}
                              className={`py-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center ${
                                active
                                  ? 'bg-amber-600 text-white shadow-xs'
                                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <span>{opt.short}</span>
                              <span className="text-[9px] opacity-75 font-normal">
                                {opt.dayIndex === 0 ? 'Weekend' : opt.dayIndex === 6 ? 'Weekend' : 'Day'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Time Window */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Active From Time (e.g. 08:00 AM)
                        </label>
                        <input
                          type="time"
                          value={formData.startTime}
                          onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                          className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Active Until Time (e.g. 02:00 PM)
                        </label>
                        <input
                          type="time"
                          value={formData.endTime}
                          onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                          className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        />
                      </div>
                    </div>

                    {/* Weekly Auto-Repeat Checkbox */}
                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={formData.isRecurringWeekly}
                        onChange={(e) =>
                          setFormData({ ...formData, isRecurringWeekly: e.target.checked })
                        }
                        className="w-4 h-4 text-amber-600 rounded"
                      />
                      <span className="text-xs font-bold text-amber-950">
                        Auto-repeat every week on selected days (Recurring Automation)
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* Validity & Usage Limits */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Redemption Usage Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.usageLimit}
                    onChange={(e) =>
                      setFormData({ ...formData, usageLimit: Number(e.target.value) || 1 })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Valid Until Date
                  </label>
                  <input
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-60"
                >
                  {submitting
                    ? 'Saving...'
                    : modalMode === 'CREATE'
                    ? 'Save & Publish Coupon'
                    : 'Update Coupon Rules'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
