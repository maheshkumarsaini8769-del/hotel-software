import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL, getStoredHotelId, getStoredToken } from '../../config/api';
import {
  Building2,
  Sliders,
  Printer,
  Share2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Wifi,
  Percent,
  Receipt,
  Clock,
  ExternalLink,
  ShieldCheck,
  UtensilsCrossed,
  Sparkles,
} from 'lucide-react';

export type OperationsTab =
  | 'RESTAURANT_INFO'
  | 'TAXES_BILLING'
  | 'KOT_PRINTING'
  | 'INTEGRATIONS'
  | 'SETTINGS'; // backward compatibility alias for TAXES_BILLING

interface RestaurantOperationsHubAppProps {
  isDark?: boolean;
  hotelId?: string;
  initialTab?: OperationsTab;
  onNavigateModule?: (moduleKey: string) => void;
}

export const RestaurantOperationsHubApp: React.FC<RestaurantOperationsHubAppProps> = ({
  hotelId = getStoredHotelId(),
  initialTab = 'RESTAURANT_INFO',
}) => {
  // Map 'SETTINGS' alias to 'TAXES_BILLING'
  const resolveTab = (t: OperationsTab): 'RESTAURANT_INFO' | 'TAXES_BILLING' | 'KOT_PRINTING' | 'INTEGRATIONS' => {
    if (t === 'SETTINGS') return 'TAXES_BILLING';
    return t;
  };

  const [activeTab, setActiveTab] = useState<'RESTAURANT_INFO' | 'TAXES_BILLING' | 'KOT_PRINTING' | 'INTEGRATIONS'>(
    resolveTab(initialTab)
  );

  useEffect(() => {
    setActiveTab(resolveTab(initialTab));
  }, [initialTab]);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [loading, setLoading] = useState(true);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // 1. Property Info State
  const [info, setInfo] = useState({
    name: '',
    slug: '',
    tagline: '',
    fssaiNumber: '',
    gstin: '',
    contactPhone: '',
    contactEmail: '',
    website: '',
    address: '',
    operatingHours: '07:00 AM - 11:30 PM (Daily)',
    currency: 'INR',
    currencySymbol: '₹',
    logoUrl: '',
    coverImageUrl: '',
    wifiSsid: '',
    wifiPassword: '',
    totalRooms: 0,
    totalDiningCapacity: 0,
  });

  // 2. Operational & Tax Settings State
  const [settings, setSettings] = useState({
    cgstPercent: 2.5,
    sgstPercent: 2.5,
    serviceChargePercent: 5.0,
    roomGstUnderThresholdPercent: 12.0,
    roomGstAboveThresholdPercent: 18.0,
    roomGstTariffThreshold: 7500,
    autoPrintKot: true,
    thermalPrinterWidth: '80mm',
    printHeaderWithLogo: true,
    kotSoundAlert: true,
    roundOffBills: true,
    smsReceipts: true,
    whatsappReceipts: true,
    autoCloseShiftTime: '02:00 AM',
    billFooterNote: 'Thank you for visiting! Please visit again.',
  });

  // 3. Integrations State (persisted in localStorage for active hotel)
  const [integrations, setIntegrations] = useState(() => {
    const saved = localStorage.getItem(`spicehub_integrations_${hotelId}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return {
      bookingComSync: true,
      agodaSync: false,
      whatsappCloudApi: true,
      webhooksEnabled: false,
      webhookUrl: '',
    };
  });

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    const token = getStoredToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      // 1. Fetch Property Info
      const resInfo = await axios.get(`${API_BASE_URL}/restaurant-operations/info`, { headers });
      if (resInfo.data?.success && resInfo.data.data) {
        setInfo((prev) => ({
          ...prev,
          ...resInfo.data.data,
        }));
      }

      // 2. Fetch Operational Settings
      const resSettings = await axios.get(`${API_BASE_URL}/restaurant-operations/settings`, { headers });
      if (resSettings.data?.success && resSettings.data.data) {
        setSettings((prev) => ({
          ...prev,
          ...resSettings.data.data,
        }));
      }
    } catch (err: any) {
      console.warn('[Settings] Failed to fetch settings:', err?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [hotelId]);

  // Save Property Info
  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingInfo(true);
    const token = getStoredToken();
    try {
      const res = await axios.put(
        `${API_BASE_URL}/restaurant-operations/info`,
        info,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (res.data?.success) {
        showToast('Property Profile saved and updated successfully!');
      } else {
        showToast('Failed to save property profile.', 'error');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Error updating property profile.', 'error');
    } finally {
      setSavingInfo(false);
    }
  };

  // Save Operational / Tax / Print Settings
  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingSettings(true);
    const token = getStoredToken();
    try {
      const res = await axios.put(
        `${API_BASE_URL}/restaurant-operations/settings`,
        settings,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (res.data?.success) {
        showToast('Settings saved successfully!');
      } else {
        showToast('Failed to save settings.', 'error');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Error updating operational settings.', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  // Save Integrations
  const handleSaveIntegrations = () => {
    localStorage.setItem(`spicehub_integrations_${hotelId}`, JSON.stringify(integrations));
    showToast('Integration settings updated and live!');
  };

  const TABS = [
    { key: 'RESTAURANT_INFO', label: 'Property Profile', icon: Building2 },
    { key: 'TAXES_BILLING', label: 'Taxes & Surcharges', icon: Percent },
    { key: 'KOT_PRINTING', label: 'KOT & Receipt Printing', icon: Printer },
    { key: 'INTEGRATIONS', label: 'Integrations & OTA', icon: Share2 },
  ] as const;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 text-slate-800">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg font-bold text-xs animate-in fade-in slide-in-from-top-3 ${
            toastType === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toastType === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900">Hotel & Operational Settings</h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live & Active
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure your official property profile, GST tax slabs, kitchen KOT printing, and channel integrations.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              fetchData();
              showToast('Settings refreshed from server!');
            }}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Clean Top-Level Tabs (No confusing nested sub-tabs) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: PROPERTY PROFILE (होटल प्रोफ़ाइल व संपर्क)           */}
      {/* ======================================================== */}
      {activeTab === 'RESTAURANT_INFO' && (
        <form onSubmit={handleSaveInfo} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                Hotel Identity & Legal Registration
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Official property name, FSSAI license, GSTIN, physical address, and in-room guest Wi-Fi.
              </p>
            </div>
            <button
              type="submit"
              disabled={savingInfo}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-60"
            >
              {savingInfo ? 'Saving...' : 'Save Property Profile'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
            {/* Hotel Name */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Hotel / Property Name *</label>
              <input
                type="text"
                required
                value={info.name}
                onChange={(e) => setInfo({ ...info, name: e.target.value })}
                placeholder="e.g. Shree shyam Luxury Heritage Hotel"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-bold"
              />
            </div>

            {/* Tagline */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Business Tagline / Subtitle</label>
              <input
                type="text"
                value={info.tagline}
                onChange={(e) => setInfo({ ...info, tagline: e.target.value })}
                placeholder="e.g. Luxury Stays & Fine Rajputana Hospitality"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
              />
            </div>

            {/* FSSAI */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">FSSAI License Number (14 digits) *</label>
              <input
                type="text"
                required
                value={info.fssaiNumber}
                onChange={(e) => setInfo({ ...info, fssaiNumber: e.target.value })}
                placeholder="e.g. 10020051000892"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-mono font-bold"
              />
            </div>

            {/* GSTIN */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">GSTIN (Goods & Services Tax ID) *</label>
              <input
                type="text"
                required
                value={info.gstin}
                onChange={(e) => setInfo({ ...info, gstin: e.target.value.toUpperCase() })}
                placeholder="e.g. 08AABCS1429B1ZS"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-mono font-bold uppercase"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Official Contact Phone *</label>
              <input
                type="text"
                required
                value={info.contactPhone}
                onChange={(e) => setInfo({ ...info, contactPhone: e.target.value })}
                placeholder="e.g. +91 98765 43210"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-mono"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Official Contact Email *</label>
              <input
                type="email"
                required
                value={info.contactEmail}
                onChange={(e) => setInfo({ ...info, contactEmail: e.target.value })}
                placeholder="e.g. reservations@hotelshreeshyam.com"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
              />
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Full Physical Property Address *</label>
              <input
                type="text"
                required
                value={info.address}
                onChange={(e) => setInfo({ ...info, address: e.target.value })}
                placeholder="e.g. Heritage Circle, Station Road, Sikar, Rajasthan 332001"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
              />
            </div>

            {/* Operating Hours */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Operating Hours</label>
              <input
                type="text"
                value={info.operatingHours}
                onChange={(e) => setInfo({ ...info, operatingHours: e.target.value })}
                placeholder="e.g. 06:00 AM - 11:30 PM (Daily)"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
              />
            </div>

            {/* Currency */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Currency Code & Symbol</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={info.currency}
                  onChange={(e) => setInfo({ ...info, currency: e.target.value })}
                  placeholder="INR"
                  className="w-1/2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold font-mono"
                />
                <input
                  type="text"
                  value={info.currencySymbol}
                  onChange={(e) => setInfo({ ...info, currencySymbol: e.target.value })}
                  placeholder="₹"
                  className="w-1/2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-center text-blue-600 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Guest In-Room Wi-Fi Credentials */}
          <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/40 space-y-3">
            <div className="flex items-center gap-2 text-blue-900 font-bold text-xs uppercase tracking-wide">
              <Wifi className="w-4 h-4 text-blue-600" />
              In-Room Guest Wi-Fi Credentials
            </div>
            <p className="text-[11px] text-slate-500">
              These details are automatically displayed to in-house guests on their mobile portal and digital keycard.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold pt-1">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Wi-Fi Network Name (SSID)</label>
                <input
                  type="text"
                  value={info.wifiSsid}
                  onChange={(e) => setInfo({ ...info, wifiSsid: e.target.value })}
                  placeholder="e.g. ShreeShyam_Guest_5G"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Wi-Fi Password</label>
                <input
                  type="text"
                  value={info.wifiPassword}
                  onChange={(e) => setInfo({ ...info, wifiPassword: e.target.value })}
                  placeholder="e.g. Welcome@2026"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono font-bold"
                />
              </div>
            </div>
          </div>

          {/* Logo & Cover Banner Imagery */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wide">
              Hotel Logo & Cover Banner
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Brand Logo Image URL</label>
                <input
                  type="url"
                  value={info.logoUrl}
                  onChange={(e) => setInfo({ ...info, logoUrl: e.target.value })}
                  placeholder="https://... logo image link"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                />
                {info.logoUrl && (
                  <div className="mt-2 flex items-center gap-3 p-2 rounded-xl bg-white border border-slate-200">
                    <img src={info.logoUrl} alt="Logo" className="w-10 h-10 object-contain rounded-lg border" />
                    <span className="text-[11px] text-slate-500">Logo Preview</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Cover Banner Photo URL</label>
                <input
                  type="url"
                  value={info.coverImageUrl}
                  onChange={(e) => setInfo({ ...info, coverImageUrl: e.target.value })}
                  placeholder="https://... facade or lobby photo link"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                />
                {info.coverImageUrl && (
                  <div className="mt-2 h-16 w-full rounded-xl overflow-hidden border border-slate-200 relative">
                    <img src={info.coverImageUrl} alt="Cover Banner" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* TAB 2: TAXES & SURCHARGES (टैक्स व बिलिंग सेटिंग्स)         */}
      {/* ======================================================== */}
      {activeTab === 'TAXES_BILLING' && (
        <form onSubmit={handleSaveSettings} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Percent className="w-4 h-4 text-emerald-600" />
                GST Tax Slabs & Billing Calculations
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Official Indian GST rates for Restaurant dining and Room tariffs with automatic invoice compliance.
              </p>
            </div>
            <button
              type="submit"
              disabled={savingSettings}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-60"
            >
              {savingSettings ? 'Saving...' : 'Save Tax Settings'}
            </button>
          </div>

          {/* Restaurant Dining GST */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wide">
                Restaurant Food & Beverage GST Slabs
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                Total Dining GST: {(settings.cgstPercent + settings.sgstPercent).toFixed(1)}%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold pt-1">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Central GST (CGST %)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="14"
                  value={settings.cgstPercent}
                  onChange={(e) => setSettings({ ...settings, cgstPercent: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono font-bold text-xs"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Govt. standard: 2.5% CGST</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">State GST (SGST %)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="14"
                  value={settings.sgstPercent}
                  onChange={(e) => setSettings({ ...settings, sgstPercent: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono font-bold text-xs"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Govt. standard: 2.5% SGST</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Service Charge (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="20"
                  value={settings.serviceChargePercent}
                  onChange={(e) =>
                    setSettings({ ...settings, serviceChargePercent: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono font-bold text-xs text-emerald-700"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Optional hotel service surcharge (0% - 10%)</span>
              </div>
            </div>
          </div>

          {/* Room Accommodation GST Slabs */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-3">
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wide">
              Hotel Room Accommodation GST (Govt. Slabs)
            </h3>
            <p className="text-[11px] text-slate-500">
              GST Council rules: 12% GST applies for room tariffs below ₹7,500/night; 18% GST applies for ₹7,500 and above.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold pt-1">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tariff Threshold (₹)</label>
                <input
                  type="number"
                  min="1000"
                  value={settings.roomGstTariffThreshold}
                  onChange={(e) =>
                    setSettings({ ...settings, roomGstTariffThreshold: Number(e.target.value) || 7500 })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono font-bold text-xs"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Standard threshold: ₹7,500</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">GST Below Threshold (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="28"
                  value={settings.roomGstUnderThresholdPercent}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      roomGstUnderThresholdPercent: parseFloat(e.target.value) || 12,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono font-bold text-xs"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Standard: 12% (6% CGST + 6% SGST)</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">GST At or Above Threshold (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="28"
                  value={settings.roomGstAboveThresholdPercent}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      roomGstAboveThresholdPercent: parseFloat(e.target.value) || 18,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono font-bold text-xs"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Standard: 18% (9% CGST + 9% SGST)</span>
              </div>
            </div>
          </div>

          {/* Bill Calculation Rules */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-3">
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wide">
              Bill Formatting & Calculation Preferences
            </h3>

            <div className="space-y-3 pt-1">
              <label className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 cursor-pointer text-xs font-semibold">
                <div>
                  <span className="block font-bold text-slate-900">Round-off Total Bill to Nearest Rupee (₹)</span>
                  <span className="text-[11px] text-slate-500">
                    Eliminates paise fractions (e.g. ₹542.40 becomes ₹542) on dining and room receipts
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.roundOffBills}
                  onChange={(e) => setSettings({ ...settings, roundOffBills: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </label>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Thermal Bill Receipt Footer Note
                </label>
                <textarea
                  rows={2}
                  value={settings.billFooterNote}
                  onChange={(e) => setSettings({ ...settings, billFooterNote: e.target.value })}
                  placeholder="e.g. Thank you for dining with us! All prices include GST. Visit again."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium"
                />
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* TAB 3: KOT & RECEIPT PRINTING (किचन व प्रिंटिंग)            */}
      {/* ======================================================== */}
      {activeTab === 'KOT_PRINTING' && (
        <form onSubmit={handleSaveSettings} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Printer className="w-4 h-4 text-blue-600" />
                Kitchen KOT & Receipt Printer Automation
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure thermal receipt printing, sound alerts, and digital SMS / WhatsApp e-Bill sending.
              </p>
            </div>
            <button
              type="submit"
              disabled={savingSettings}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-60"
            >
              {savingSettings ? 'Saving...' : 'Save Print & Kitchen Settings'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Kitchen KOT Automation Card */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-3">
              <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <UtensilsCrossed className="w-4 h-4 text-amber-600" />
                Kitchen Station KOT Automation
              </h3>

              <div className="space-y-2.5 pt-1 text-xs font-semibold">
                <label className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 cursor-pointer">
                  <div>
                    <span className="block font-bold text-slate-900">Auto-Print KOT on Order Punch</span>
                    <span className="text-[10px] text-slate-500">
                      Instantly sends print job to thermal kitchen printer when waiter places order
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoPrintKot}
                    onChange={(e) => setSettings({ ...settings, autoPrintKot: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 cursor-pointer">
                  <div>
                    <span className="block font-bold text-slate-900">Audible Chime Alert on New KOT</span>
                    <span className="text-[10px] text-slate-500">
                      Plays kitchen bell sound on KDS terminal when new food order arrives
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.kotSoundAlert}
                    onChange={(e) => setSettings({ ...settings, kotSoundAlert: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                </label>
              </div>
            </div>

            {/* Hardware Printer Settings Card */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-3">
              <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-blue-600" />
                Hardware Bill Printer Specifications
              </h3>

              <div className="space-y-2.5 pt-1 text-xs font-semibold">
                <div>
                  <label className="block text-slate-700 mb-1">Thermal Receipt Paper Width</label>
                  <select
                    value={settings.thermalPrinterWidth}
                    onChange={(e) => setSettings({ ...settings, thermalPrinterWidth: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold"
                  >
                    <option value="80mm">80mm (Standard POS Desk Printer - Recommended)</option>
                    <option value="58mm">58mm (Compact Mobile Bluetooth Printer)</option>
                  </select>
                </div>

                <label className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 cursor-pointer">
                  <div>
                    <span className="block font-bold text-slate-900">Print Hotel Logo in Header</span>
                    <span className="text-[10px] text-slate-500">
                      Prints hotel monochrome brand logo at the top of guest invoices
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.printHeaderWithLogo}
                    onChange={(e) => setSettings({ ...settings, printHeaderWithLogo: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Digital E-Receipts & Night Shift Schedule */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-3">
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-purple-600" />
              Digital Guest Receipts & Day-Close Schedule
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-semibold pt-1">
              <label className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 cursor-pointer">
                <div>
                  <span className="block font-bold text-slate-900">Instant SMS e-Bill</span>
                  <span className="text-[10px] text-slate-500">Send bill summary via SMS</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.smsReceipts}
                  onChange={(e) => setSettings({ ...settings, smsReceipts: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 cursor-pointer">
                <div>
                  <span className="block font-bold text-slate-900">WhatsApp PDF Receipt</span>
                  <span className="text-[10px] text-slate-500">Send detailed PDF on WhatsApp</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.whatsappReceipts}
                  onChange={(e) => setSettings({ ...settings, whatsappReceipts: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </label>

              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <label className="block font-bold text-slate-700 mb-1">Night Audit / Shift Close Time</label>
                <input
                  type="text"
                  value={settings.autoCloseShiftTime}
                  onChange={(e) => setSettings({ ...settings, autoCloseShiftTime: e.target.value })}
                  placeholder="e.g. 02:00 AM"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 font-mono font-bold text-xs"
                />
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* TAB 4: INTEGRATIONS & OTA (चैनल मैनेजर व थर्ड पार्टी)        */}
      {/* ======================================================== */}
      {activeTab === 'INTEGRATIONS' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Share2 className="w-4 h-4 text-blue-600" />
                Third-Party Integrations & Channel Manager
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Connect your hotel ERP to Online Travel Agents (OTAs), official WhatsApp Business API, and webhooks.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveIntegrations}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
            >
              Save Integration Settings
            </button>
          </div>

          <div className="space-y-4">
            {/* Booking.com Sync */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 font-black text-sm flex items-center justify-center shrink-0">
                  B.
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-xs text-slate-900">Booking.com Channel Manager</h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        integrations.bookingComSync
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {integrations.bookingComSync ? '● Connected' : '○ Inactive'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Syncs international guest room reservations, live rates, and auto-generates front-desk folios.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={integrations.bookingComSync}
                  onChange={(e) => setIntegrations({ ...integrations, bookingComSync: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Agoda OTA Sync */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 font-black text-sm flex items-center justify-center shrink-0">
                  ag
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-xs text-slate-900">Agoda Global Travel Network</h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        integrations.agodaSync
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {integrations.agodaSync ? '● Connected' : '○ Inactive'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Two-way inventory sync for Asian and European travel bookings with instant cancellation handling.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={integrations.agodaSync}
                  onChange={(e) => setIntegrations({ ...integrations, agodaSync: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Meta WhatsApp Cloud API */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 font-black text-sm flex items-center justify-center shrink-0">
                  WA
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-xs text-slate-900">Official Meta WhatsApp Cloud API</h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        integrations.whatsappCloudApi
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {integrations.whatsappCloudApi ? '● Live Verified' : '○ Disabled'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Sends automated booking confirmation templates, room check-in greetings, and invoice PDFs directly to guest WhatsApp.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={integrations.whatsappCloudApi}
                  onChange={(e) => setIntegrations({ ...integrations, whatsappCloudApi: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
